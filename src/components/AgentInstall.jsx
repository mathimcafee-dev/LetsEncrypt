import { useState, useEffect, useRef } from 'react'
import { X, Terminal, Copy, Check, CheckCircle, Clock, AlertTriangle, Loader, Server, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AGENT_API = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent'

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
  const [step, setStep] = useState('intro')
  const [hostType, setHostType] = useState('server')
  const [agentUrl, setAgentUrl] = useState('') // intro | token | waiting | success | failed
  const [token, setToken] = useState('')
  const [installId, setInstallId] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(3600)
  // cPanel credentials for shared hosting
  const [cpanelUser, setCpanelUser] = useState('')
  const [cpanelToken, setCpanelToken] = useState('')
  const [showCpanelHelp, setShowCpanelHelp] = useState(false)
  const [savedServers, setSavedServers] = useState([])
  const [selectedServer, setSelectedServer] = useState(null)
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [serversLoading, setServersLoading] = useState(false)
  const pollRef = useRef(null)
  const timerRef = useRef(null)

  const SERVER_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials'
  const SERVER_META = {
    cpanel: { icon:'🖥️', color:'#d97706', bg:'#fffbeb', border:'#fde68a', short:'cPanel' },
    ssh:    { icon:'🔒', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', short:'SSH' },
    plesk:  { icon:'🎛️', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', short:'Plesk' },
  }

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }, [])

  // Load saved servers + legacy cPanel credentials on mount
  useEffect(() => {
    if (!userId) return
    setServersLoading(true)
    fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'list', user_id: userId }) })
      .then(r => r.json())
      .then(data => {
        const servers = data.servers || []
        setSavedServers(servers)
        // Auto-select domain-matched server or first server
        const match = servers.find(s => s.domains?.includes(cert.domain))
        const auto = match || (servers.length === 1 ? servers[0] : null)
        if (auto) { setSelectedServerId(auto.id); setSelectedServer(auto) }
      })
      .catch(() => {})
      .finally(() => setServersLoading(false))
    // Also load legacy cPanel creds (fallback for manual entry)
    supabase.from('dns_credentials').select('credentials_enc').eq('user_id', userId).eq('provider', 'cpanel').maybeSingle()
      .then(({ data }) => {
        if (data?.credentials_enc) {
          try {
            const saved = JSON.parse(atob(data.credentials_enc))
            if (saved.cpanel_user) setCpanelUser(saved.cpanel_user)
            if (saved.cpanel_token) setCpanelToken(saved.cpanel_token)
          } catch(e) {}
        }
      })
  }, [userId])

  const DAEMON_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

  const saveCpanelCredentials = async (user, token) => {
    if (!userId || !user || !token) return
    const enc = btoa(JSON.stringify({ cpanel_user: user, cpanel_token: token }))
    await supabase.from('dns_credentials').upsert({
      user_id: userId,
      provider: 'cpanel',
      label: 'cPanel API Token',
      domain_pattern: '*',
      credentials_enc: enc,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider,domain_pattern' }).catch(() => {})
  }

  // Find active agent for selected server
  const getActiveAgent = async (serverId) => {
    try {
      const res = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'list_agents', user_id: userId }) })
      const data = await res.json()
      const agents = data.agents || []
      const agent = agents.find(a => a.server_id === serverId)
      if (!agent) return null
      const lastSeen = agent.last_seen_at ? Math.floor((Date.now() - new Date(agent.last_seen_at)) / 60000) : 9999
      return lastSeen < 15 ? agent : null // active = seen in last 15 min
    } catch(e) { return null }
  }

  // Dispatch job to persistent agent
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
      // Poll job status
      pollRef.current = setInterval(async () => {
        try {
          const res2 = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'status', user_id:userId, job_id:data.job_id }) })
          const s = await res2.json()
          if (s.status === 'done')   { clearInterval(pollRef.current); setStatus({ server_hostname: cert.domain, web_server: 'agent' }); setStep('success') }
          if (s.status === 'failed') { clearInterval(pollRef.current); setStatus({ error_message: s.error_message }); setStep('failed') }
          if (s.status === 'claimed' || s.status === 'running') setStatus({ status: s.status })
        } catch(e) {}
      }, 3000)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const generateToken = async () => {
    setLoading(true); setError('')
    try {
      // Check for active persistent agent first (VPS server flow)
      if (selectedServer && selectedServer.server_type === 'ssh') {
        const agent = await getActiveAgent(selectedServer.id)
        if (agent) {
          await dispatchToAgent(agent.id)
          return
        }
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
      // Start countdown
      timerRef.current = setInterval(() => setTimeLeft(t => { if(t<=1){clearInterval(timerRef.current);return 0}; return t-1 }), 1000)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const generatePhpToken = async () => {
    // Resolve credentials — from saved server or manual input
    let resolvedUser = cpanelUser.trim()
    let resolvedToken = cpanelToken.trim()

    if (selectedServer) {
      try {
        const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'get_credentials', user_id:userId, id:selectedServer.id })
        })
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
      await saveCpanelCredentials(resolvedUser, resolvedToken)
      const res = await fetch(AGENT_API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_token', user_id:userId, cert_id:cert.id, session_id:cert.session_id, domain:cert.domain })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      // Download PHP file with token + cPanel credentials embedded
      const phpUrl = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-script-php?token=' + data.token
        + '&cpanel_user=' + encodeURIComponent(resolvedUser)
        + '&cpanel_token=' + encodeURIComponent(resolvedToken)
      const a = document.createElement('a')
      a.href = phpUrl
      a.download = 'sslvault-agent.php'
      a.click()
      const defaultUrl = 'https://' + cert.domain + '/sslvault-agent.php'
      setAgentUrl(defaultUrl)
      setToken(data.token)
      setInstallId(data.install_id)
      setStep('php_instructions')
      setLoading(false)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const startWaiting = async () => {
    // Save agent URL to database if provided
    if (agentUrl && installId) {
      try {
        await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'save_url', install_id:installId, user_id:userId, agent_url:agentUrl })
        })
      } catch(e) {}
    }
    setStep('waiting')
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(AGENT_API, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'status', install_id:installId, user_id:userId })
        })
        const data = await res.json()
        if (data.status === 'installed') { clearInterval(pollRef.current); setStatus(data); setStep('success') }
        if (data.status === 'failed') { clearInterval(pollRef.current); setStatus(data); setStep('failed') }
        if (data.status === 'installing') setStatus(data)
      } catch(e) {}
    }, 3000)
  }

  const installCmd = `curl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=${token}`
  const mins = Math.floor(timeLeft/60).toString().padStart(2,'0')
  const secs = (timeLeft%60).toString().padStart(2,'0')

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
              <h3 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>Auto-Install Certificate</h3>
              <p style={{ fontSize:12, color:'var(--text3)' }}>{cert.domain}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ padding:'24px' }}>

          {/* HOSTING TYPE SELECTOR */}
        {step === 'intro' && (
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            {[
              ['server', '🖥️', 'VPS / Cloud Server', 'SSH access, Ubuntu/CentOS/Amazon Linux'],
              ['shared', '🌐', 'Shared Hosting', 'cPanel, GoDaddy, Bluehost, Hostinger'],
            ].map(([type, icon, title, desc]) => (
              <div key={type} onClick={() => setHostType(type)}
                style={{ flex:1, padding:'14px 16px', borderRadius:10, border:`2px solid ${hostType===type?'var(--accent)':'var(--border)'}`, background:hostType===type?'var(--accent-light)':'white', cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color:hostType===type?'var(--accent)':'var(--text)', marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* INTRO STEP */}
          {step === 'intro' && (
            <>
              {hostType === 'server' ? (
                <>
                  <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:16, marginBottom:16 }}>
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:8, color:'var(--text)' }}>What this does:</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {['Connects to your server via a one-time secure token','Auto-detects your OS and web server (Nginx/Apache)','Writes certificate and private key to correct paths','Updates your web server config automatically','Reloads Nginx/Apache — zero downtime'].map((t,i) => (
                        <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text2)' }}>
                          <span style={{ color:'var(--green)', fontWeight:700, flexShrink:0 }}>✓</span> {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:'var(--yellow-light)', border:'1px solid var(--yellow-border)', borderRadius:10, padding:14, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
                    ⚠ <strong>Before running:</strong> Make sure you have SSH access to your server with sudo/root privileges. The script will backup any existing web server config before modifying it.
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'var(--text)' }}>Supported:</p>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {['Ubuntu 20/22/24','Debian 10/11/12','CentOS 7/8/9','Amazon Linux 2/2023','Alpine Linux','+ Nginx or Apache'].map(s => (
                        <span key={s} className="badge badge-blue" style={{ fontSize:11 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background:'var(--green-light)', border:'1px solid #86efac', borderRadius:10, padding:16, marginBottom:16 }}>
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:8, color:'var(--text)' }}>What this does:</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {['Downloads a PHP file with your credentials pre-loaded','Upload it to public_html via cPanel File Manager','Visit the URL — it calls cPanel API and activates SSL instantly','Updates .htaccess for HTTPS redirect automatically','Dashboard updates to ✅ Installed in real-time'].map((t,i) => (
                        <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text2)' }}>
                          <span style={{ color:'var(--green)', fontWeight:700, flexShrink:0 }}>✓</span> {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Saved server picker — shown when user has saved servers */}
                  {savedServers.filter(s => s.server_type === 'cpanel').length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:8 }}>🖥️ Saved cPanel Servers</label>
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {savedServers.filter(s => s.server_type === 'cpanel').map(s => (
                          <div key={s.id} onClick={() => setSelectedServer(selectedServer?.id === s.id ? null : s)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:10, border:`2px solid ${selectedServer?.id===s.id?'#d97706':'var(--border)'}`, background:selectedServer?.id===s.id?'#fffbeb':'white', cursor:'pointer', transition:'all 0.15s' }}>
                            <span style={{ fontSize:18 }}>🖥️</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13, color:selectedServer?.id===s.id?'#d97706':'var(--text)' }}>{s.nickname}</div>
                              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{s.username}@{s.host}</div>
                            </div>
                            <div style={{ width:18, height:18, borderRadius:'50%', background:selectedServer?.id===s.id?'#d97706':'#f1f5f9', border:`2px solid ${selectedServer?.id===s.id?'#d97706':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {selectedServer?.id===s.id && <span style={{ color:'white', fontSize:9, fontWeight:900 }}>✓</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!selectedServer && (
                        <p style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Select a saved server, or enter credentials manually below.</p>
                      )}
                    </div>
                  )}

                  {/* Manual credential entry — hidden when a saved server is selected */}
                  {!selectedServer && (
                    <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:14 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <p style={{ fontWeight:700, fontSize:13, color:'var(--text)', margin:0 }}>🔑 Your cPanel Credentials</p>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {cpanelUser && cpanelToken && <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:4, padding:'2px 7px' }}>✓ Saved</span>}
                          <button onClick={() => setShowCpanelHelp(h => !h)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--accent)', fontWeight:600, padding:0 }}>
                            {showCpanelHelp ? 'Hide help ▲' : 'Where do I find these? ▼'}
                          </button>
                        </div>
                      </div>
                      {showCpanelHelp && (
                        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:12, marginBottom:12, fontSize:12, color:'#92400e', lineHeight:1.7 }}>
                          <strong>Username:</strong> Your short cPanel login name (not your email).<br/><br/>
                          <strong>API Token:</strong> cPanel → search <em>"Manage API Tokens"</em> → Create token → give it SSL permissions.
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:4 }}>cPanel Username</label>
                          <input value={cpanelUser} onChange={e => setCpanelUser(e.target.value)} placeholder="e.g. johndoe"
                            style={{ width:'100%', fontSize:13, padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, fontFamily:'monospace' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:4 }}>cPanel API Token</label>
                          <input type="password" value={cpanelToken} onChange={e => setCpanelToken(e.target.value)} placeholder="Paste your API token here"
                            style={{ width:'100%', fontSize:13, padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, fontFamily:'monospace' }} />
                        </div>
                      </div>
                      <p style={{ fontSize:11, color:'var(--text3)', marginTop:8, lineHeight:1.5 }}>
                        🔒 Credentials embedded in the PHP file. <a href="/dns-providers" style={{ color:'var(--accent)', fontWeight:600 }}>Save a server</a> to skip this step next time.
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {['GoDaddy','Bluehost','Hostinger','Hostgator','SiteGround','Namecheap','Any cPanel host'].map(s => (
                        <span key={s} className="badge badge-green" style={{ fontSize:11 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}

              {hostType === 'server' ? (
                <button onClick={generateToken} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
                  {loading ? <><span className="spinner"/> Generating secure token...</> : '🚀 Generate Install Token'}
                </button>
              ) : (
                <button onClick={generatePhpToken} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px', background:'#059669' }}>
                  {loading ? <><span className="spinner"/> Preparing...</> : '📥 Download PHP Agent File'}
                </button>
              )}
            </>
          )}

          {/* PHP INSTRUCTIONS STEP */}
          {step === 'php_instructions' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📥</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>PHP Agent Downloaded!</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>2 steps — upload & visit URL. SSL activates automatically.</p>
              </div>

              {[
                ['1', '📁', 'Upload the file', 'Open cPanel → File Manager → navigate to public_html → Upload → select sslvault-agent.php. Takes 5 seconds.'],
                ['2', '🌐', 'Visit the URL to install', 'Open a new browser tab and go to: https://' + cert.domain + '/sslvault-agent.php — The script calls your cPanel API and activates SSL instantly. No manual steps.'],
                ['3', '🗑️', 'Delete the file', 'After seeing the green ✅ success screen, delete sslvault-agent.php immediately. It contains your cPanel API token.'],
              ].map(([n, icon, title, desc]) => (
                <div key={n} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{n}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{icon} {title}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}

              <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:12, margin:'16px 0', fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
                💡 After visiting the URL, click <strong>Monitor Installation</strong> below — this dashboard will update to ✅ automatically when cPanel confirms SSL is active.
              </div>

              {/* Agent URL field */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text)', display:'block', marginBottom:6 }}>Agent URL (for monitoring)</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={agentUrl}
                    onChange={e => setAgentUrl(e.target.value)}
                    placeholder={'https://' + cert.domain + '/sslvault-agent.php'}
                    style={{ flex:1, fontSize:13 }}
                  />
                  {agentUrl && (
                    <a href={agentUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--green)', color:'white', border:'none', borderRadius:7, padding:'8px 14px', fontSize:13, fontWeight:700, textDecoration:'none', flexShrink:0 }}>
                      ▶ Open
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <a href={'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-script-php?token=' + token + '&cpanel_user=' + encodeURIComponent(cpanelUser||selectedServer?.username||'') + '&cpanel_token=' + encodeURIComponent(cpanelToken)}
                  download="sslvault-agent.php" className="btn btn-secondary btn-sm">
                  Re-download
                </a>
                <button onClick={startWaiting} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  ⏳ I've Uploaded It — Monitor Installation
                </button>
              </div>
            </>
          )}

          {/* TOKEN STEP */}
          {step === 'token' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Your install token is ready</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Token expires in <strong style={{ color:timeLeft<300?'var(--red)':'var(--text)', fontFamily:'monospace' }}>{mins}:{secs}</strong></p>
              </div>

              <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:8 }}>
                Step 1 — SSH into your server, then run this command:
              </p>
              <div style={{ background:'#0f172a', borderRadius:10, marginBottom:20, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:11, color:'#475569' }}>bash</span>
                  <CopyBtn text={installCmd}/>
                </div>
                <pre style={{ margin:0, padding:'14px', color:'#e2e8f0', fontSize:11, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7 }}>{installCmd}</pre>
              </div>

              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Step 2 — What you'll see in your terminal:</p>
                <pre style={{ fontSize:11, color:'#059669', fontFamily:'monospace', lineHeight:1.8, margin:0 }}>
{`[SSLVault] Detecting operating system...
[✓] Detected: Ubuntu 22.04 LTS
[SSLVault] Detecting web server...
[✓] Found: Nginx
[SSLVault] Connecting to SSLVault...
[✓] Got certificate for: ${cert.domain}
[SSLVault] Writing certificate files...
[✓] Certificate files saved
[SSLVault] Configuring Nginx...
[✓] Nginx configured and reloaded
✅  Installation Complete!`}
                </pre>
              </div>

              <div className="alert alert-info" style={{ marginBottom:20, fontSize:12 }}>
                💡 After running the command, click below to monitor the installation in real-time.
              </div>

              <button onClick={startWaiting} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                ⏳ I've Run the Command — Monitor Progress
              </button>
            </>
          )}

          {/* AGENT DISPATCH WAITING STEP */}
          {step === 'agent_waiting' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'2px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>
                  🤖
                </div>
                <p style={{ fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:4 }}>Agent is installing...</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Your server agent picked up the job. Installing certificate now.</p>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20 }}>
                <StatusStep done={true}  active={false} label="Job dispatched to agent" />
                <StatusStep done={status?.status==='claimed'||status?.status==='running'} active={!status} label="Agent received the job" />
                <StatusStep done={false} active={status?.status==='running'} label="Writing cert files + reloading web server" />
                <StatusStep done={false} active={false} label="Complete" />
              </div>
              <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:12, fontSize:12, color:'var(--text2)' }}>
                🤖 Agent polling every 5 minutes — this will complete on the next poll cycle.
              </div>
            </>
          )}

          {/* WAITING STEP */}
          {step === 'waiting' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-light)', border:'2px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <Loader size={28} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }}/>
                </div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Waiting for agent...</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Polling every 3 seconds for installation status</p>
              </div>

              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20 }}>
                <StatusStep done={true} active={false} label="Token generated and ready" />
                <StatusStep done={status?.status==='installing'||status?.status==='installed'} active={!status} label="Waiting for agent to connect" />
                <StatusStep done={false} active={status?.status==='installing'} label="Agent installing certificate" />
                <StatusStep done={false} active={false} label="Web server reloaded" />
              </div>

              {status && (
                <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:12, fontSize:12, color:'var(--text2)' }}>
                  🔌 Agent connected from <strong>{status.server_hostname || 'unknown'}</strong> running <strong>{status.server_os || 'unknown'}</strong>
                </div>
              )}
            </>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--green-light)', border:'2px solid var(--green-border,#86efac)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <CheckCircle size={32} color="var(--green)"/>
                </div>
                <p style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:4 }}>✅ Installed Successfully!</p>
                <p style={{ fontSize:14, color:'var(--text3)' }}>Certificate is live on your server</p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  ['Domain', cert.domain],
                  ['Server', status?.server_hostname || '—'],
                  ['OS', status?.server_os || '—'],
                  ['Web Server', status?.web_server || '—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:l==='Domain'?'monospace':'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {agentUrl && (
                  <a href={agentUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--green)', color:'white', borderRadius:7, padding:'9px 16px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
                    ▶ Run Agent Again
                  </a>
                )}
                <a href={'https://www.ssllabs.com/ssltest/analyze.html?d='+cert.domain} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                  🔍 Test SSL Grade
                </a>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  Done
                </button>
              </div>
            </>
          )}

          {/* FAILED STEP */}
          {step === 'failed' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--red-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <AlertTriangle size={32} color="var(--red)"/>
                </div>
                <p style={{ fontWeight:700, fontSize:18, color:'var(--text)', marginBottom:4 }}>Installation Failed</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Certificate files were saved but web server config failed</p>
              </div>
              {status?.error_message && (
                <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>
                  {status.error_message}
                </div>
              )}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
                <p style={{ fontWeight:600, marginBottom:6 }}>Certificate files are saved at:</p>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/fullchain.pem</code><br/>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/privkey.pem</code>
                <p style={{ marginTop:8 }}>Configure your web server manually using these paths. See <strong>Install Guide</strong> in the nav for help.</p>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep('intro'); setToken(''); setStatus(null) }} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Try Again</button>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>Close</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
