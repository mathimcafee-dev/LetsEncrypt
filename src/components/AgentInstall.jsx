import { useState, useEffect, useRef } from 'react'
import { X, Terminal, Copy, Check, CheckCircle, Clock, AlertTriangle, Loader, Server, Shield, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DAEMON_FN  = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'
const AGENT_API  = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent'
const SERVER_FN  = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials'
const SSH_FN     = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ssh-deploy'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color:ok?'#34d399':'#64748b', display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 6px', borderRadius:4 }}>
      {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  )
}

function StatusStep({ done, active, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg2)', transition:'all 0.3s' }}>
        {done ? <Check size={13} color="white"/> : active ? <Loader size={13} color="white" style={{ animation:'spin 1s linear infinite' }}/> : <span style={{ fontSize:11, color:'var(--text3)' }}>○</span>}
      </div>
      <span style={{ fontSize:13, fontWeight: done||active ? 600 : 400, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>{label}</span>
    </div>
  )
}

export default function AgentInstall({ cert, userId, onClose }) {
  const [step, setStep]               = useState('intro')
  const [hostType, setHostType]       = useState('server')
  const [installMode, setInstallMode] = useState(null) // null = not chosen yet, 'agent' | 'ssh_push'
  const [agentUrl, setAgentUrl]       = useState('')
  const [token, setToken]             = useState('')
  const [installId, setInstallId]     = useState('')
  const [status, setStatus]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [timeLeft, setTimeLeft]       = useState(3600)
  const [cpanelUser, setCpanelUser]   = useState('')
  const [cpanelToken, setCpanelToken] = useState('')
  const [showCpanelHelp, setShowCpanelHelp] = useState(false)
  const [savedServers, setSavedServers]     = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [serversLoading, setServersLoading] = useState(false)
  const pollRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }, [])

  // Load saved servers on mount
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setServersLoading(true)
      try {
        const res = await fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'list', user_id: userId }) })
        const data = await res.json()
        const servers = data.servers || []
        setSavedServers(servers)
        // Auto-select server matching this cert's domain
        const match = servers.find(s => s.domains?.includes(cert.domain))
        const auto = match || (servers.length === 1 ? servers[0] : null)
        if (auto) {
          setSelectedServer(auto)
          // Pre-select install mode from saved server preference
          if (auto.install_mode) setInstallMode(auto.install_mode)
        }
      } catch(e) {}
      setServersLoading(false)
      // Load legacy cPanel creds
      try {
        const { data: cpData } = await supabase.from('dns_credentials').select('credentials_enc')
          .eq('user_id', userId).eq('provider', 'cpanel').maybeSingle()
        if (cpData?.credentials_enc) {
          const saved = JSON.parse(atob(cpData.credentials_enc))
          if (saved.cpanel_user) setCpanelUser(saved.cpanel_user)
          if (saved.cpanel_token) setCpanelToken(saved.cpanel_token)
        }
      } catch(e) {}
    })()
  }, [userId])

  // ── SSH Push install ─────────────────────────────────────────────────
  const doSshPush = async () => {
    if (!selectedServer) { setError('Select a server first'); return }
    setLoading(true); setError('')
    setStep('ssh_pushing')
    try {
      const res = await fetch(SSH_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          user_id: userId,
          server_id: selectedServer.id,
          cert_id: cert.id,
        })
      })
      const data = await res.json()
      setLoading(false)
      if (data.ok) {
        setStatus({ web_server: data.web_server, server_hostname: data.host })
        setStep('success')
      } else {
        setStatus({ error_message: data.error })
        setStep('failed')
      }
    } catch(e) { setError(e.message); setLoading(false); setStep('intro') }
  }

  // ── Agent dispatch (persistent agent already installed) ──────────────
  const dispatchToAgent = async (agentId) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'dispatch', user_id:userId, agent_id:agentId, cert_id:cert.id, domain:cert.domain, job_type:'install' }) })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setInstallId(data.job_id)
      setStep('agent_waiting')
      setLoading(false)
      pollRef.current = setInterval(async () => {
        try {
          const res2 = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'status', user_id:userId, job_id:data.job_id }) })
          const s = await res2.json()
          if (s.status === 'done')   { clearInterval(pollRef.current); setStatus({ web_server: 'agent' }); setStep('success') }
          if (s.status === 'failed') { clearInterval(pollRef.current); setStatus({ error_message: s.error_message }); setStep('failed') }
          if (s.status === 'claimed' || s.status === 'running') setStatus({ status: s.status })
        } catch(e) {}
      }, 3000)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const getActiveAgent = async (serverId) => {
    try {
      const res = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'list_agents', user_id: userId }) })
      const data = await res.json()
      const agents = data.agents || []
      const agent = agents.find(a => a.server_id === serverId)
      if (!agent) return null
      const minsAgo = agent.last_seen_at ? Math.floor((Date.now() - new Date(agent.last_seen_at)) / 60000) : 9999
      return minsAgo < 15 ? agent : null
    } catch(e) { return null }
  }

  // ── Token-based one-time install ─────────────────────────────────────
  const generateToken = async () => {
    setLoading(true); setError('')
    try {
      // Check if active persistent agent exists for this server
      if (selectedServer?.server_type === 'ssh' && installMode === 'agent') {
        const agent = await getActiveAgent(selectedServer.id)
        if (agent) { await dispatchToAgent(agent.id); return }
      }
      const res = await fetch(AGENT_API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_token', user_id:userId, cert_id:cert.id, session_id:cert.session_id, domain:cert.domain })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setToken(data.token)
      setInstallId(data.install_id)
      setStep('token')
      setLoading(false)
      timerRef.current = setInterval(() => setTimeLeft(t => { if(t<=1){clearInterval(timerRef.current);return 0}; return t-1 }), 1000)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const generatePhpToken = async () => {
    let resolvedUser = cpanelUser.trim()
    let resolvedToken = cpanelToken.trim()
    if (selectedServer) {
      try {
        const res = await fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'get_credentials', user_id:userId, id:selectedServer.id }) })
        const data = await res.json()
        if (data.server?.credentials_enc) {
          const creds = JSON.parse(atob(data.server.credentials_enc))
          resolvedUser = data.server.username
          resolvedToken = creds.api_token || ''
        }
      } catch(e) {}
    }
    if (!resolvedUser) { setError('Please enter your cPanel username.'); return }
    if (!resolvedToken) { setError('Please enter your cPanel API token.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(AGENT_API, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_token', user_id:userId, cert_id:cert.id, session_id:cert.session_id, domain:cert.domain }) })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      const phpUrl = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-script-php?token=' + data.token
        + '&cpanel_user=' + encodeURIComponent(resolvedUser)
        + '&cpanel_token=' + encodeURIComponent(resolvedToken)
      const a = document.createElement('a'); a.href = phpUrl; a.download = 'sslvault-agent.php'; a.click()
      setAgentUrl('https://' + cert.domain + '/sslvault-agent.php')
      setToken(data.token); setInstallId(data.install_id)
      setStep('php_instructions')
      setLoading(false)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const startWaiting = async () => {
    if (agentUrl && installId) {
      try {
        await fetch(AGENT_API, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'save_url', install_id:installId, user_id:userId, agent_url:agentUrl }) })
      } catch(e) {}
    }
    setStep('waiting')
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(AGENT_API, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'status', install_id:installId, user_id:userId }) })
        const data = await res.json()
        if (data.status === 'installed') { clearInterval(pollRef.current); setStatus(data); setStep('success') }
        if (data.status === 'failed')    { clearInterval(pollRef.current); setStatus(data); setStep('failed') }
        if (data.status === 'installing') setStatus(data)
      } catch(e) {}
    }, 3000)
  }

  const installCmd = `curl -fsSL https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=${token}`
  const mins = Math.floor(timeLeft/60).toString().padStart(2,'0')
  const secs = (timeLeft%60).toString().padStart(2,'0')

  // ── Determine which primary action to take ───────────────────────────
  const handlePrimaryAction = () => {
    if (hostType === 'shared') return generatePhpToken()
    if (installMode === 'ssh_push') return doSshPush()
    return generateToken()
  }

  const vpsServers = savedServers.filter(s => s.server_type === 'ssh')
  const cpanelServers = savedServers.filter(s => s.server_type === 'cpanel')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Server size={18} color="white"/>
            </div>
            <div>
              <h3 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>Install Certificate</h3>
              <p style={{ fontSize:12, color:'var(--text3)' }}>{cert.domain}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ padding:'24px' }}>

          {/* INTRO STEP */}
          {step === 'intro' && (
            <>
              {/* Hosting type */}
              <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                {[
                  ['server', '🖥️', 'VPS / Cloud Server', 'Ubuntu, CentOS, Amazon Linux'],
                  ['shared', '🌐', 'Shared Hosting',     'cPanel, GoDaddy, Bluehost'],
                ].map(([type, icon, title, desc]) => (
                  <div key={type} onClick={() => { setHostType(type); setInstallMode(null) }}
                    style={{ flex:1, padding:'14px 16px', borderRadius:10, border:`2px solid ${hostType===type?'var(--accent)':'var(--border)'}`, background:hostType===type?'var(--accent-light)':'white', cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
                    <div style={{ fontWeight:700, fontSize:13, color:hostType===type?'var(--accent)':'var(--text)', marginBottom:3 }}>{title}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* VPS: saved server picker + install mode */}
              {hostType === 'server' && (
                <>
                  {serversLoading ? (
                    <div style={{ textAlign:'center', padding:16, color:'var(--text3)', fontSize:13 }}>Loading servers...</div>
                  ) : vpsServers.length > 0 ? (
                    <div style={{ marginBottom:16 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:8 }}>Your VPS Servers</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {vpsServers.map(s => (
                          <div key={s.id} onClick={() => { setSelectedServer(selectedServer?.id===s.id ? null : s); setInstallMode(s.install_mode || null) }}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:10,
                              border:`2px solid ${selectedServer?.id===s.id?'var(--accent)':'var(--border)'}`,
                              background:selectedServer?.id===s.id?'var(--accent-light)':'white', cursor:'pointer', transition:'all 0.15s' }}>
                            <span style={{ fontSize:18 }}>🖥️</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13, color:selectedServer?.id===s.id?'var(--accent)':'var(--text)' }}>{s.nickname}</div>
                              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{s.username}@{s.host}</div>
                            </div>
                            {/* Show install mode badge */}
                            <span style={{ fontSize:10, fontWeight:700, padding:'3px 7px', borderRadius:4,
                              background: s.install_mode === 'ssh_push' ? '#f0fdf4' : '#eff6ff',
                              color: s.install_mode === 'ssh_push' ? '#16a34a' : '#2563eb',
                              border: `1px solid ${s.install_mode === 'ssh_push' ? '#86efac' : '#bfdbfe'}` }}>
                              {s.install_mode === 'ssh_push' ? '⚡ SSH Push' : '🤖 Agent'}
                            </span>
                            <div style={{ width:18, height:18, borderRadius:'50%',
                              background:selectedServer?.id===s.id?'var(--accent)':'#f1f5f9',
                              border:`2px solid ${selectedServer?.id===s.id?'var(--accent)':'#e2e8f0'}`,
                              display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {selectedServer?.id===s.id && <span style={{ color:'white', fontSize:9, fontWeight:900 }}>✓</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:14, marginBottom:16, fontSize:13, color:'#92400e' }}>
                      No VPS servers saved yet. <a href="/dns-providers" style={{ color:'var(--accent)', fontWeight:600 }}>Add a server</a> to get started.
                    </div>
                  )}

                  {/* Install mode selector — shown when a server is selected */}
                  {selectedServer && (
                    <div style={{ marginBottom:18 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:8 }}>
                        How should SSLVault install this certificate?
                      </label>
                      <div style={{ display:'flex', gap:10 }}>
                        {/* SSH Push */}
                        <div onClick={() => setInstallMode('ssh_push')}
                          style={{ flex:1, padding:'14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
                            border:`2px solid ${installMode==='ssh_push'?'#16a34a':'var(--border)'}`,
                            background:installMode==='ssh_push'?'#f0fdf4':'white' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <Zap size={16} color={installMode==='ssh_push'?'#16a34a':'#64748b'}/>
                            <span style={{ fontWeight:700, fontSize:13, color:installMode==='ssh_push'?'#16a34a':'var(--text)' }}>
                              SSH Push
                            </span>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                              background:'#dcfce7', color:'#16a34a', border:'1px solid #86efac' }}>
                              FULLY AUTO
                            </span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
                            SSLVault SSHes into your server and installs directly. Zero steps for you — now and every renewal.
                          </div>
                        </div>
                        {/* Agent */}
                        <div onClick={() => setInstallMode('agent')}
                          style={{ flex:1, padding:'14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s',
                            border:`2px solid ${installMode==='agent'?'var(--accent)':'var(--border)'}`,
                            background:installMode==='agent'?'var(--accent-light)':'white' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <Shield size={16} color={installMode==='agent'?'var(--accent)':'#64748b'}/>
                            <span style={{ fontWeight:700, fontSize:13, color:installMode==='agent'?'var(--accent)':'var(--text)' }}>
                              Agent
                            </span>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                              background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe' }}>
                              MORE SECURE
                            </span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
                            Run one-time install on your server. No credentials stored — server calls SSLVault, never the other way.
                          </div>
                        </div>
                      </div>
                      {installMode === 'ssh_push' && !selectedServer.credentials_enc && (
                        <div style={{ marginTop:10, background:'#fff7ed', border:'1px solid #fdba74', borderRadius:8, padding:12, fontSize:12, color:'#9a3412' }}>
                          ⚠ This server has no SSH credentials saved. <a href="/dns-providers" style={{ color:'var(--accent)', fontWeight:600 }}>Edit server</a> to add them.
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedServer && vpsServers.length > 0 && (
                    <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:12, marginBottom:16, fontSize:12, color:'var(--text2)' }}>
                      Select a server above to continue.
                    </div>
                  )}

                  {!selectedServer && vpsServers.length === 0 && (
                    <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:16, marginBottom:16 }}>
                      <p style={{ fontWeight:700, fontSize:13, marginBottom:8, color:'var(--text)' }}>Manual install via one-time token:</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        {['Auto-detects OS and web server (Nginx/Apache)','Writes cert and key to correct paths','Reloads web server — zero downtime'].map((t,i) => (
                          <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--text2)' }}>
                            <span style={{ color:'var(--green)', fontWeight:700, flexShrink:0 }}>✓</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Shared hosting cPanel fields */}
              {hostType === 'shared' && (
                <>
                  {cpanelServers.length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:8 }}>Saved cPanel Servers</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {cpanelServers.map(s => (
                          <div key={s.id} onClick={() => setSelectedServer(selectedServer?.id===s.id ? null : s)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:10,
                              border:`2px solid ${selectedServer?.id===s.id?'#d97706':'var(--border)'}`,
                              background:selectedServer?.id===s.id?'#fffbeb':'white', cursor:'pointer' }}>
                            <span style={{ fontSize:18 }}>🖥️</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13 }}>{s.nickname}</div>
                              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{s.username}@{s.host}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!selectedServer && (
                    <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                        <p style={{ fontWeight:700, fontSize:13, color:'var(--text)', margin:0 }}>cPanel Credentials</p>
                        <button onClick={() => setShowCpanelHelp(h => !h)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--accent)', fontWeight:600 }}>
                          {showCpanelHelp ? 'Hide ▲' : 'Where to find? ▼'}
                        </button>
                      </div>
                      {showCpanelHelp && (
                        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:12, marginBottom:10, fontSize:12, color:'#92400e', lineHeight:1.7 }}>
                          <strong>Username:</strong> Your cPanel login name.<br/>
                          <strong>API Token:</strong> cPanel → Manage API Tokens → Create with SSL permissions.
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:4 }}>Username</label>
                          <input value={cpanelUser} onChange={e => setCpanelUser(e.target.value)} placeholder="e.g. johndoe"
                            style={{ width:'100%', fontSize:13, padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, fontFamily:'monospace' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:4 }}>API Token</label>
                          <input type="password" value={cpanelToken} onChange={e => setCpanelToken(e.target.value)} placeholder="Paste your token"
                            style={{ width:'100%', fontSize:13, padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, fontFamily:'monospace' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}

              {/* Primary CTA */}
              {hostType === 'server' && (
                installMode === 'ssh_push' ? (
                  <button onClick={handlePrimaryAction}
                    disabled={loading || !selectedServer || !selectedServer.credentials_enc}
                    className="btn btn-primary"
                    style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px', background:'#16a34a' }}>
                    {loading ? <><span className="spinner"/> Connecting...</> : '⚡ Install via SSH — Fully Automatic'}
                  </button>
                ) : installMode === 'agent' ? (
                  <button onClick={handlePrimaryAction} disabled={loading} className="btn btn-primary"
                    style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
                    {loading ? <><span className="spinner"/> Generating token...</> : '🔑 Generate Install Token'}
                  </button>
                ) : (
                  <button onClick={handlePrimaryAction} disabled={loading || (vpsServers.length > 0 && !selectedServer)} className="btn btn-primary"
                    style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
                    {loading ? <><span className="spinner"/> Please wait...</> : '🚀 Continue'}
                  </button>
                )
              )}
              {hostType === 'shared' && (
                <button onClick={handlePrimaryAction} disabled={loading} className="btn btn-primary"
                  style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px', background:'#059669' }}>
                  {loading ? <><span className="spinner"/> Preparing...</> : '📥 Download PHP Agent File'}
                </button>
              )}
            </>
          )}

          {/* SSH PUSH IN PROGRESS */}
          {step === 'ssh_pushing' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#f0fdf4', border:'2px solid #86efac', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <Loader size={28} color="#16a34a" style={{ animation:'spin 1s linear infinite' }}/>
                </div>
                <p style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:4 }}>Installing via SSH...</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>SSLVault is connecting to your server and installing the certificate.</p>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20 }}>
                <StatusStep done={true}  active={false} label="SSH connection established" />
                <StatusStep done={false} active={true}  label="Writing cert files to server" />
                <StatusStep done={false} active={false} label="Configuring and reloading web server" />
                <StatusStep done={false} active={false} label="Complete" />
              </div>
              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:12, fontSize:12, color:'#166534' }}>
                ⚡ SSH push usually completes in 5–15 seconds. No action needed from you.
              </div>
            </>
          )}

          {/* AGENT WAITING */}
          {step === 'agent_waiting' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'2px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>🤖</div>
                <p style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:4 }}>Agent installing...</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Your server agent picked up the job.</p>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16 }}>
                <StatusStep done={true} active={false} label="Job dispatched to agent" />
                <StatusStep done={status?.status==='claimed'||status?.status==='running'} active={!status} label="Agent received the job" />
                <StatusStep done={false} active={status?.status==='running'} label="Writing cert + reloading web server" />
                <StatusStep done={false} active={false} label="Complete" />
              </div>
            </>
          )}

          {/* TOKEN STEP */}
          {step === 'token' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Your install token is ready</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Expires in <strong style={{ color:timeLeft<300?'var(--red)':'var(--text)', fontFamily:'monospace' }}>{mins}:{secs}</strong></p>
              </div>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:8 }}>SSH into your server and run:</p>
              <div style={{ background:'#0f172a', borderRadius:10, marginBottom:20, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:11, color:'#475569' }}>bash</span>
                  <CopyBtn text={installCmd}/>
                </div>
                <pre style={{ margin:0, padding:'14px', color:'#e2e8f0', fontSize:11, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7 }}>{installCmd}</pre>
              </div>
              <div className="alert alert-info" style={{ marginBottom:20, fontSize:12 }}>
                💡 After running the command, click below to monitor in real-time.
              </div>
              <button onClick={startWaiting} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                ⏳ I've Run It — Monitor Progress
              </button>
            </>
          )}

          {/* PHP INSTRUCTIONS */}
          {step === 'php_instructions' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📥</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>PHP Agent Downloaded!</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>2 steps — upload and visit.</p>
              </div>
              {[
                ['1','📁','Upload the file','cPanel → File Manager → public_html → Upload → sslvault-agent.php'],
                ['2','🌐','Visit the URL','Open https://' + cert.domain + '/sslvault-agent.php — SSL activates instantly.'],
                ['3','🗑️','Delete the file','After ✅ success, delete sslvault-agent.php — it contains your API token.'],
              ].map(([n,icon,title,desc]) => (
                <div key={n} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{n}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{icon} {title}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={startWaiting} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  ⏳ Monitor Installation
                </button>
              </div>
            </>
          )}

          {/* WAITING */}
          {step === 'waiting' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-light)', border:'2px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <Loader size={28} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }}/>
                </div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Waiting for agent...</p>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16 }}>
                <StatusStep done={true} active={false} label="Token generated" />
                <StatusStep done={!!status} active={!status} label="Agent connecting" />
                <StatusStep done={false} active={status?.status==='installing'} label="Installing certificate" />
                <StatusStep done={false} active={false} label="Web server reloaded" />
              </div>
            </>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--green-light)', border:'2px solid #86efac', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <CheckCircle size={32} color="var(--green)"/>
                </div>
                <p style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:4 }}>✅ Installed Successfully!</p>
                <p style={{ fontSize:14, color:'var(--text3)' }}>Certificate is live on your server</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[['Domain', cert.domain], ['Server', status?.server_hostname || selectedServer?.host || '—'], ['Web Server', status?.web_server || '—'], ['Mode', installMode === 'ssh_push' ? '⚡ SSH Push' : '🤖 Agent']].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <a href={'https://www.ssllabs.com/ssltest/analyze.html?d='+cert.domain} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                  🔍 Test SSL Grade
                </a>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>Done</button>
              </div>
            </>
          )}

          {/* FAILED */}
          {step === 'failed' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--red-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <AlertTriangle size={32} color="var(--red)"/>
                </div>
                <p style={{ fontWeight:700, fontSize:18, color:'var(--text)', marginBottom:4 }}>Installation Failed</p>
              </div>
              {status?.error_message && (
                <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{status.error_message}</div>
              )}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
                Cert files are at:<br/>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/fullchain.pem</code><br/>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/privkey.pem</code>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep('intro'); setStatus(null); setError('') }} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Try Again</button>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>Close</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
