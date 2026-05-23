import { useState, useEffect } from 'react'
import { Server, Globe, Copy, Check, RefreshCw, CheckCircle, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DAEMON_FN = 'agent-daemon'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(text) } catch(e) {}
    setOk(true); setTimeout(() => setOk(false), 2000)
  }
  return (
    <button onClick={copy} style={{ background:'none', border:'0.5px solid #e8edf2', borderRadius:5,
      cursor:'pointer', color: ok ? '#0e7fc0' : '#64748b', display:'flex', alignItems:'center',
      gap:4, fontSize:11, padding:'3px 8px', fontFamily:'inherit' }}>
      {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  )
}

export default function AgentInstall({ cert, userId, onClose, onOpenCpanel }) {
  const [hostType, setHostType] = useState('server')
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [dispatching, setDispatching] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [dispatchedJobId, setDispatchedJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null) // null | 'queued' | 'claimed' | 'success' | 'failed'
  const [jobError, setJobError] = useState('')
  const [error, setError] = useState('')

  // Pairing command (fetched from server when modal opens with no agents)
  const [pairingCmd, setPairingCmd] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingError, setPairingError] = useState('')
  const [serverNickname, setServerNickname] = useState('My Server')

  // Helper: call agent-daemon with explicit JWT
  const callDaemon = async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const SB_URL = import.meta.env.VITE_SUPABASE_URL
    const r = await fetch(`${SB_URL}/functions/v1/agent-daemon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    return data
  }

  // Initial load: list agents
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const data = await callDaemon({ action: 'list_agents', user_id: userId })
        const list = data.agents || []
        setAgents(list)
        const online = list.find(a => {
          const mins = a.last_seen_at
            ? Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)
            : 999
          return mins < 15
        })
        if (online) setSelectedAgent(online.id)
      } catch(e) { console.error(e) }
    })()
  }, [userId])

  // Auto-fetch pairing command when no agents exist
  const fetchPairingCmd = async () => {
    if (!userId) return
    setPairingLoading(true); setPairingError('')
    try {
      const data = await callDaemon({
        action: 'create_install_command',
        user_id: userId,
        nickname: serverNickname || 'My Server',
      })
      if (data.ok && data.command) {
        setPairingCmd(data.command)
      } else {
        setPairingError(data.error || 'Failed to generate install command')
      }
    } catch(e) {
      setPairingError(String(e?.message || e))
    }
    setPairingLoading(false)
  }

  // Auto-fetch pairing command first time we enter "no agents" state
  useEffect(() => {
    if (hostType === 'server' && agents.length === 0 && !pairingCmd && !pairingLoading && userId) {
      fetchPairingCmd()
    }
    // eslint-disable-next-line
  }, [hostType, agents.length, userId])

  // Poll job status after dispatch
  useEffect(() => {
    if (!dispatchedJobId || !userId) return
    if (jobStatus === 'success' || jobStatus === 'failed') return
    const iv = setInterval(async () => {
      try {
        const d = await callDaemon({ action: 'status', user_id: userId, job_id: dispatchedJobId })
        if (d.ok) {
          setJobStatus(d.status)
          if (d.status === 'failed') setJobError(d.error_message || 'Install failed')
        }
      } catch(e) {}
    }, 5000)
    return () => clearInterval(iv)
    // eslint-disable-next-line
  }, [dispatchedJobId, jobStatus, userId])

  // Elapsed time counter
  useEffect(() => {
    if (!dispatchedJobId || jobStatus === 'success' || jobStatus === 'failed') return
    setElapsed(0)
    const iv = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(iv)
  }, [dispatchedJobId, jobStatus])

  // Also poll for new agents when in "no agents" state (so once user runs the install
  // command, this modal auto-detects the new server)
  useEffect(() => {
    if (hostType !== 'server' || agents.length > 0 || !userId || dispatchedJobId) return
    const iv = setInterval(async () => {
      try {
        const data = await callDaemon({ action: 'list_agents', user_id: userId })
        const list = data.agents || []
        if (list.length > 0) {
          setAgents(list)
          const online = list.find(a => {
            const mins = a.last_seen_at
              ? Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)
              : 999
            return mins < 15
          })
          if (online) setSelectedAgent(online.id)
        }
      } catch(e) {}
    }, 8000)
    return () => clearInterval(iv)
    // eslint-disable-next-line
  }, [hostType, agents.length, userId, dispatchedJobId])

  const dispatchToAgent = async () => {
    if (!selectedAgent) { setError('Select an agent first'); return }
    setDispatching(true); setError('')
    try {
      const data = await callDaemon({
        action: 'dispatch_job',
        user_id: userId,
        agent_id: selectedAgent,
        cert_id: cert.id,
        domain: cert.domain,
        job_type: 'install'
      })
      if (data.ok) {
        setDispatchedJobId(data.job_id)
        setJobStatus('queued')
      } else {
        setError(data.error || 'Dispatch failed')
      }
    } catch(e) { setError(String(e?.message || e)) }
    setDispatching(false)
  }

  const isDispatched = !!dispatchedJobId

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:12, width:'100%', maxWidth:560,
        maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'18px 22px', borderBottom:'0.5px solid #e8edf2' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, background:'#0d3c6e', borderRadius:8,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Server size={16} color="white"/>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#0a0a0a' }}>Install Certificate</div>
              <div style={{ fontSize:11, color:'#a3a3a3', fontFamily:'monospace' }}>{cert.domain}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'#a3a3a3', fontSize:20, lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        {/* Host type tabs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'18px 22px 0' }}>
          {[
            { key:'server', icon:<Server size={18}/>, label:'VPS / Cloud Server', sub:'Ubuntu, CentOS, Amazon Linux' },
            { key:'shared', icon:<Globe size={18}/>, label:'Shared Hosting', sub:'cPanel, GoDaddy, Bluehost' },
          ].map(t => (
            <button key={t.key} onClick={() => setHostType(t.key)} style={{
              padding:'14px 16px', borderRadius:8,
              border: hostType===t.key ? '2px solid #0e7fc0' : '0.5px solid #e8edf2',
              background: hostType===t.key ? '#f0f9ff' : 'white',
              cursor:'pointer', textAlign:'left', fontFamily:'inherit'
            }}>
              <div style={{ color: hostType===t.key ? '#0e7fc0' : '#94a3b8', marginBottom:6 }}>{t.icon}</div>
              <div style={{ fontSize:13, fontWeight:600, color: hostType===t.key ? '#0e7fc0' : '#0a0a0a' }}>{t.label}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding:'18px 22px' }}>

          {hostType === 'server' && (
            <div>
              {isDispatched ? (
                <div style={{ padding:'8px 0' }}>
                  {/* Step-by-step install progress */}
                  <div style={{ marginBottom:16 }}>
                    {[
                      {
                        label: 'Job dispatched to agent',
                        sub: 'Cert + private key queued securely',
                        done: true, active: false
                      },
                      {
                        label: 'Agent polling for job',
                        sub: jobStatus === 'claimed' || jobStatus === 'success' ? 'Job received' : ('Checking every 5 min — ' + (elapsed < 60 ? elapsed + 's elapsed' : Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's elapsed')),
                        done: jobStatus === 'claimed' || jobStatus === 'success',
                        active: jobStatus === 'queued'
                      },
                      {
                        label: 'Writing cert files to server',
                        sub: jobStatus === 'success'
                          ? 'Written to /etc/ssl/sslvault/' + cert.domain
                          : jobStatus === 'claimed' ? 'Running on server…'
                          : '/etc/ssl/sslvault/' + cert.domain + '/{fullchain,privkey}.pem',
                        done: jobStatus === 'success',
                        active: jobStatus === 'claimed'
                      },
                      {
                        label: 'Reloading web server',
                        sub: jobStatus === 'success' ? 'nginx/apache reloaded — SSL active' : 'nginx -t && systemctl reload nginx',
                        done: jobStatus === 'success',
                        active: jobStatus === 'claimed'
                      },
                    ].map((step, i) => (
                      <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                        <div style={{ flexShrink:0, marginTop:2 }}>
                          {step.done ? (
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'#0e7fc0',
                              display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <CheckCircle size={12} color="white" strokeWidth={3}/>
                            </div>
                          ) : step.active ? (
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'#eff6ff',
                              border:'2px solid #3b82f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <RefreshCw size={10} color="#3b82f6" style={{ animation:'spin 1s linear infinite' }}/>
                            </div>
                          ) : (
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'#f1f5f9',
                              border:'1.5px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8' }}>{i+1}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight: step.done || step.active ? 600 : 400,
                            color: step.done ? '#0a0a0a' : step.active ? '#1d4ed8' : '#94a3b8' }}>
                            {step.label}
                          </div>
                          <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace', marginTop:2 }}>
                            {step.sub}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {jobStatus === 'success' && (
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8,
                      padding:'14px', marginBottom:16 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                        <CheckCircle size={16} color="#16a34a"/>
                        <span style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>Certificate installed successfully</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'3px 12px', fontSize:11, color:'#166534', lineHeight:1.8 }}>
                        <span style={{ fontWeight:600 }}>Domain</span><span style={{ fontFamily:'monospace' }}>{cert.domain}</span>
                        {cert.expires_at && <><span style={{ fontWeight:600 }}>Expires</span><span>{new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span></>}
                        <span style={{ fontWeight:600 }}>Installed by</span><span>SSLVault persistent agent</span>
                        <span style={{ fontWeight:600 }}>Auto-renew</span><span>✓ Enabled — next renewal is fully automatic</span>
                      </div>
                    </div>
                  )}

                  {jobStatus === 'failed' && (
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
                      padding:'12px 14px', marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#dc2626', marginBottom:4 }}>Installation failed</div>
                      <div style={{ fontSize:12, color:'#7f1d1d', marginBottom:8 }}>
                        {jobError || 'Unknown error'}
                      </div>
                      <div style={{ fontSize:11, fontFamily:'monospace', color:'#94a3b8' }}>
                        Check logs: journalctl -u sslvault-agent -n 30
                      </div>
                    </div>
                  )}

                  <button onClick={onClose}
                    style={{ width:'100%', padding:'10px', fontSize:13, fontWeight:500, borderRadius:7,
                      border:'none', cursor:'pointer', fontFamily:'inherit',
                      background: jobStatus === 'success' ? '#0e7fc0' : '#f1f5f9',
                      color: jobStatus === 'success' ? 'white' : '#374151' }}>
                    {jobStatus === 'success' ? 'Done' : jobStatus === 'failed' ? 'Close' : 'Close (job continues in background)'}
                  </button>
                </div>
              ) : agents.length > 0 ? (
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#525252', marginBottom:10 }}>
                    Select agent to install on:
                  </div>
                  {agents.map(a => {
                    const mins = a.last_seen_at
                      ? Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)
                      : 999
                    const isActive = mins < 15
                    return (
                      <div key={a.id} onClick={() => setSelectedAgent(a.id)}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                          border: selectedAgent===a.id ? '1.5px solid #0e7fc0' : '0.5px solid #e8edf2',
                          borderRadius:7, marginBottom:8, cursor:'pointer',
                          background: selectedAgent===a.id ? '#f0f9ff' : 'white' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                          background: isActive ? '#0e7fc0' : '#e5e7eb' }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#0a0a0a',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {a.hostname || a.nickname || 'Agent ' + a.id.slice(0,8)}
                          </div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>
                            {a.web_server || 'unknown'} · {isActive ? `active · ${mins}m ago` : `offline · ${mins}m ago`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {error && <div style={{ fontSize:12, color:'#dc2626', marginBottom:10 }}>{error}</div>}
                  <button onClick={dispatchToAgent} disabled={!selectedAgent || dispatching}
                    style={{ width:'100%', background: selectedAgent ? '#0e7fc0' : '#e5e7eb',
                      color: selectedAgent ? 'white' : '#94a3b8', border:'none', borderRadius:7,
                      padding:'10px', fontSize:13, fontWeight:500, cursor: selectedAgent ? 'pointer' : 'default',
                      fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {dispatching
                      ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> Dispatching…</>
                      : 'Install on this server'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background:'#f0f9ff', border:'0.5px solid #bae6fd', borderRadius:8,
                    padding:'12px 14px', marginBottom:14, fontSize:12, color:'#0c4a6e', lineHeight:1.7 }}>
                    No agent connected yet. Run this on your server to install the SSLVault agent.
                    Once connected, cert installs and renewals are fully automatic.
                  </div>

                  {/* Nickname field — lets user label the server */}
                  <div style={{ marginBottom:10 }}>
                    <label style={{ fontSize:11, fontWeight:500, color:'#525252', display:'block', marginBottom:4 }}>
                      Server label (shows in your dashboard)
                    </label>
                    <input
                      type="text"
                      value={serverNickname}
                      onChange={e => setServerNickname(e.target.value)}
                      onBlur={() => { if (serverNickname) fetchPairingCmd() }}
                      placeholder="My Production Server"
                      style={{ width:'100%', padding:'8px 10px', fontSize:13, borderRadius:6,
                        border:'0.5px solid #e2e8f0', fontFamily:'inherit', boxSizing:'border-box' }}
                    />
                  </div>

                  <div style={{ background:'#0f172a', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ fontSize:10, color:'#475569' }}>bash · paste on your server as root</span>
                      {pairingCmd && <CopyBtn text={pairingCmd}/>}
                    </div>
                    <pre style={{ margin:0, padding:'12px 14px', color:'#e2e8f0', fontSize:11,
                      fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all',
                      maxHeight:160, overflow:'auto' }}>
                      {pairingLoading
                        ? 'Generating one-time install command…'
                        : pairingError
                          ? `Error: ${pairingError}`
                          : pairingCmd || 'Click below to generate a command'}
                    </pre>
                  </div>

                  {!pairingCmd && !pairingLoading && (
                    <button onClick={fetchPairingCmd} style={{ width:'100%', background:'#0e7fc0',
                      color:'white', border:'none', borderRadius:7, padding:'10px',
                      fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
                      Generate install command
                    </button>
                  )}

                  <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.7, marginTop:12 }}>
                    After install, this dialog will auto-detect your server. Then click <strong style={{ color:'#525252' }}>Install on this server</strong> to deploy the certificate.
                    The token in the command is single-use and tied to your account.
                  </div>
                </div>
              )}
            </div>
          )}

          {hostType === 'shared' && (
            <div>
              <div style={{ background:'#f0f9ff', border:'0.5px solid #bae6fd', borderRadius:8,
                padding:'12px 14px', marginBottom:16, fontSize:12, color:'#0c4a6e', lineHeight:1.7 }}>
                SSLVault installs directly via cPanel's API — no PHP file, no upload, nothing in public_html.
                Your credentials are encrypted in Supabase Vault and never exposed.
              </div>
              <button onClick={() => { onClose(); onOpenCpanel && onOpenCpanel() }}
                style={{ width:'100%', background:'#0e7fc0', color:'white', border:'none',
                  borderRadius:7, padding:'11px', fontSize:13, fontWeight:500,
                  cursor:'pointer', fontFamily:'inherit', display:'flex',
                  alignItems:'center', justifyContent:'center', gap:7 }}>
                <Shield size={14}/> Open cPanel Install Wizard
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
