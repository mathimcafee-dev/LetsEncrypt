import { useState, useEffect } from 'react'
import { Server, Globe, Copy, Check, RefreshCw, CheckCircle, Shield } from 'lucide-react'

const DAEMON_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(text) } catch(e) {}
    setOk(true); setTimeout(() => setOk(false), 2000)
  }
  return (
    <button onClick={copy} style={{ background:'none', border:'0.5px solid #e8edf2', borderRadius:5,
      cursor:'pointer', color: ok ? '#1a56db' : '#64748b', display:'flex', alignItems:'center',
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
  const [dispatchedJobId, setDispatchedJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null) // null | 'queued' | 'claimed' | 'done' | 'failed'
  const [jobError, setJobError] = useState('')
  const [error, setError] = useState('')

  // Install command shown when no agents connected
  const installCmd = userId
    ? `curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash`
    : `curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash`

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(DAEMON_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list_agents', user_id: userId })
        })
        const data = await res.json()
        const list = data.agents || []
        setAgents(list)
        // FIX: DB stores 'active', not 'online'
        const online = list.find(a => {
          const mins = a.last_seen_at
            ? Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)
            : 999
          return mins < 15
        })
        if (online) setSelectedAgent(online.id)
      } catch(e) {}
    })()
  }, [userId])

  // Poll job status after dispatch
  useEffect(() => {
    if (!dispatchedJobId || !userId) return
    if (jobStatus === 'done' || jobStatus === 'failed') return
    const iv = setInterval(async () => {
      try {
        const res = await fetch(DAEMON_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', user_id: userId, job_id: dispatchedJobId })
        })
        const d = await res.json()
        if (d.ok) {
          setJobStatus(d.status)
          if (d.status === 'failed') setJobError(d.error_message || 'Install failed')
        }
      } catch(e) {}
    }, 5000)
    return () => clearInterval(iv)
  }, [dispatchedJobId, jobStatus, userId])

  const dispatchToAgent = async () => {
    if (!selectedAgent) { setError('Select an agent first'); return }
    setDispatching(true); setError('')
    try {
      const res = await fetch(DAEMON_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          user_id: userId,
          agent_id: selectedAgent,
          cert_id: cert.id,
          domain: cert.domain,
          job_type: 'install'
        })
      })
      const data = await res.json()
      if (data.ok) {
        setDispatchedJobId(data.job_id)
        setJobStatus('queued')
      } else {
        setError(data.error || 'Dispatch failed')
      }
    } catch(e) { setError(String(e)) }
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
              {/* Job status feedback after dispatch */}
              {isDispatched ? (
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  {jobStatus === 'done' ? (
                    <>
                      <CheckCircle size={40} color="#1a56db" style={{ marginBottom:12 }}/>
                      <div style={{ fontSize:15, fontWeight:600, color:'#0a0a0a', marginBottom:6 }}>Certificate installed</div>
                      <div style={{ fontSize:12, color:'#525252', marginBottom:20 }}>
                        Agent has installed the certificate and reloaded the web server.
                      </div>
                      <button onClick={onClose} style={{ background:'#1a56db', color:'white', border:'none',
                        borderRadius:7, padding:'9px 24px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                        Done
                      </button>
                    </>
                  ) : jobStatus === 'failed' ? (
                    <>
                      <div style={{ fontSize:15, fontWeight:600, color:'#dc2626', marginBottom:6 }}>Install failed</div>
                      <div style={{ fontSize:12, color:'#525252', background:'#fef2f2', border:'1px solid #fecaca',
                        borderRadius:6, padding:'10px 14px', marginBottom:20, textAlign:'left' }}>
                        {jobError || 'Unknown error — check server logs: journalctl -u sslvault-agent -n 20'}
                      </div>
                      <button onClick={onClose} style={{ background:'#e5e7eb', color:'#374151', border:'none',
                        borderRadius:7, padding:'9px 24px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={32} color="#3b82f6" style={{ marginBottom:12, animation:'spin 1s linear infinite' }}/>
                      <div style={{ fontSize:15, fontWeight:600, color:'#0a0a0a', marginBottom:6 }}>
                        {jobStatus === 'claimed' ? 'Installing…' : 'Job queued'}
                      </div>
                      <div style={{ fontSize:12, color:'#525252', marginBottom:20 }}>
                        {jobStatus === 'claimed'
                          ? 'Agent is writing cert files and reloading the web server.'
                          : 'Agent will pick up the job within 5 minutes.'}
                      </div>
                      <button onClick={onClose} style={{ background:'#f1f5f9', color:'#374151', border:'none',
                        borderRadius:7, padding:'9px 24px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                        Close (job continues in background)
                      </button>
                    </>
                  )}
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
                          background: isActive ? '#1a56db' : '#e5e7eb' }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#0a0a0a' }}>
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
                    style={{ width:'100%', background: selectedAgent ? '#1a56db' : '#e5e7eb',
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
                  <div style={{ background:'#0f172a', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ fontSize:10, color:'#475569' }}>bash</span>
                      <CopyBtn text={installCmd}/>
                    </div>
                    <pre style={{ margin:0, padding:'12px 14px', color:'#e2e8f0', fontSize:12,
                      fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                      {installCmd}
                    </pre>
                  </div>
                  <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.7 }}>
                    After install, this modal will auto-detect your server. Then click <strong style={{ color:'#525252' }}>Install</strong> again to deploy the certificate.
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
                style={{ width:'100%', background:'#1a56db', color:'white', border:'none',
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
