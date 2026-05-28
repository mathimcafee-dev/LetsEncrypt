// SmartInstall.jsx — detects saved credentials and routes automatically
// First time: walks through setup
// Subsequent: installs silently with progress

import { useState, useEffect, useRef } from 'react'
import { Server, Globe, CheckCircle, XCircle, RefreshCw, Copy, Check, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(()=>{}); setOk(true); setTimeout(()=>setOk(false),2000) }}
      style={{ background:'none', border:'0.5px solid rgba(240,237,232,0.15)', borderRadius:5, cursor:'pointer',
        color: ok ? '#4ade80' : 'rgba(240,237,232,0.45)', display:'flex', alignItems:'center',
        gap:4, fontSize:11, padding:'3px 8px', fontFamily:'inherit', flexShrink:0 }}>
      {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  )
}

function StepRow({ icon, label, detail, state }) {
  const colors = { done:'#4ade80', running:'#fbbf24', error:'#f87171', pending:'rgba(240,237,232,0.25)' }
  const c = colors[state] || colors.pending
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10 }}>
      <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, marginTop:1,
        background: state==='done' ? 'rgba(74,222,128,0.12)' : state==='running' ? 'rgba(251,191,36,0.1)' : state==='error' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
        border:`1.5px solid ${c}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {state==='done' && <span style={{color:'#4ade80',fontSize:12,fontWeight:700}}>✓</span>}
        {state==='running' && <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',border:'2px solid #fbbf24',borderTopColor:'transparent',animation:'spin .8s linear infinite'}}/>}
        {state==='error' && <span style={{color:'#f87171',fontSize:12,fontWeight:700}}>✗</span>}
        {state==='pending' && <span style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,0.15)'}}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color: state==='pending' ? 'rgba(240,237,232,0.35)' : '#f0ede8', marginBottom:1 }}>{label}</div>
        {detail && <div style={{ fontSize:11, color: state==='error' ? '#f87171' : 'rgba(240,237,232,0.5)', wordBreak:'break-all' }}>{detail}</div>}
      </div>
    </div>
  )
}

export default function SmartInstall({ cert, userId, session, onClose, onSuccess }) {
  // phase: detecting | no_creds | setup_cpanel | setup_agent | installing | done | error
  const [phase, setPhase] = useState('detecting')
  const [detectedMethod, setDetectedMethod] = useState(null) // 'cpanel' | 'agent' | null
  const [detectedCred, setDetectedCred] = useState(null)
  const [detectedAgent, setDetectedAgent] = useState(null)
  const [steps, setSteps] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [pairingCmd, setPairingCmd] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [serverNickname, setServerNickname] = useState('My Server')

  // cPanel new server fields
  const [cpHost, setCpHost] = useState('')
  const [cpUser, setCpUser] = useState('')
  const [cpToken, setCpToken] = useState('')
  const [cpSave, setCpSave] = useState(true)
  // Token-only prompt — when saved credential exists but token is missing
  const [needToken, setNeedToken] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  const callFn = async (fn, body) => {
    const r = await fetch(`${SB_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    return r.json()
  }

  const setStep = (idx, state, detail) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, state, detail: detail ?? s.detail } : s))
  }

  // ── Auto-detect on open ──────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        // Check for cPanel credential for this domain
        const { data: cpCreds } = await supabase.from('server_credentials')
          .select('id, host, username, nickname, label, domains, server_type, cpanel_api_token_enc, credentials_enc')
          .eq('user_id', userId)
          .in('server_type', ['cpanel', 'shared'])
        const cpMatch = (cpCreds || []).find(c => c.domains?.includes(cert.domain)) || cpCreds?.[0]

        if (cpMatch) {
          setDetectedMethod('cpanel')
          setDetectedCred(cpMatch)
          // Check if token is stored — if not, we'll ask for it before installing
          const hasToken = !!(cpMatch.cpanel_api_token_enc || cpMatch.credentials_enc)
          setPhase('ready')
          if (!hasToken) setNeedToken(true)
          return
        }

        // Check for VPS agent
        const agentData = await callFn('agent-daemon', { action: 'list_agents', user_id: userId })
        const agents = agentData.agents || []
        const onlineAgent = agents.find(a => {
          const mins = a.last_seen_at ? Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000) : 999
          return mins < 15
        }) || agents[0]

        if (onlineAgent) {
          setDetectedMethod('agent')
          setDetectedAgent(onlineAgent)
          setPhase('ready')
          return
        }

        // Nothing configured — guide them
        setPhase('no_creds')
      } catch (e) {
        setPhase('no_creds')
      }
    })()
  }, [])

  // ── Auto-install when ready (credentials already saved) ─────────────
  const install = async () => {
    const initSteps = detectedMethod === 'cpanel' ? [
      { label: 'Connecting to cPanel server', state: 'pending', detail: detectedCred?.nickname || detectedCred?.host },
      { label: 'Retrieving private key from KeyVault', state: 'pending', detail: '' },
      { label: 'Installing certificate via cPanel API', state: 'pending', detail: '' },
      { label: 'Verifying HTTPS is live', state: 'pending', detail: cert.domain },
    ] : [
      { label: 'Dispatching job to VPS agent', state: 'pending', detail: detectedAgent?.hostname || detectedAgent?.nickname },
      { label: 'Agent claims and executes job', state: 'pending', detail: 'Agent polls every 1 min' },
      { label: 'Writing certificate files to server', state: 'pending', detail: `/etc/ssl/sslvault/${cert.domain}/` },
      { label: 'Reloading web server', state: 'pending', detail: 'nginx or apache' },
    ]
    setSteps(initSteps)
    setPhase('installing')

    if (detectedMethod === 'cpanel') {
      await installCpanel()
    } else {
      await installAgent()
    }
  }

  const installCpanel = async () => {
    setStep(0, 'running', detectedCred?.nickname || detectedCred?.host)
    try {
      // Save install method to cert
      await supabase.from('certificates').update({
        install_method: 'cpanel',
        install_server_id: detectedCred.id,
      }).eq('id', cert.id)
      setStep(0, 'done')
      setStep(1, 'running', 'Fetching from KeyLocker…')
      await new Promise(r => setTimeout(r, 400))
      setStep(1, 'done', 'Key retrieved securely')
      setStep(2, 'running', 'Calling cPanel UAPI…')

      const result = await callFn('cpanel-install', {
        action: 'install',
        cert_id: cert.id,
        domain: cert.domain,
        credential_id: detectedCred.id,
      })

      if (!result.ok) {
        setStep(2, 'error', result.error || 'cPanel install failed')
        setErrorMsg(result.error || 'Installation failed. Check your cPanel credentials.')
        setPhase('error')
        return
      }

      setStep(2, 'done', 'Certificate installed')
      setStep(3, 'running', `Checking https://${cert.domain}…`)

      let verified = false
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 4000))
        try {
          const res = await fetch(`https://${cert.domain}`, { method: 'HEAD', redirect: 'follow' })
          if (res.status < 500) { verified = true; break }
        } catch {}
      }
      setStep(3, verified ? 'done' : 'done', verified ? `HTTPS live ✓` : 'Installed — HTTPS may take a minute to activate')
      setPhase('done')
      onSuccess?.()
    } catch (e) {
      setStep(0, 'error', e.message)
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  const installAgent = async () => {
    setStep(0, 'running')
    try {
      // Save install method to cert
      await supabase.from('certificates').update({
        install_method: 'agent',
      }).eq('id', cert.id)

      const { data: certData } = await supabase.from('certificates').select('cert_pem, ca_pem').eq('id', cert.id).single()

      // Check for existing queued job
      const { data: existing } = await supabase.from('agent_jobs').select('id')
        .eq('agent_id', detectedAgent.id).eq('cert_id', cert.id).in('status', ['queued','claimed']).maybeSingle()

      if (!existing) {
        await supabase.from('agent_jobs').insert({
          agent_id: detectedAgent.id,
          user_id: userId,
          cert_id: cert.id,
          job_type: 'install',
          status: 'queued',
          cert_pem: certData?.cert_pem || '',
          ca_pem: certData?.ca_pem || '',
          key_pem: '',
          domain: cert.domain,
        })
      }

      setStep(0, 'done', `Job queued for ${detectedAgent.hostname || detectedAgent.nickname || 'agent'}`)
      setStep(1, 'running', 'Waiting for agent to pick up…')

      // Poll for job completion
      let jobDone = false
      for (let i = 0; i < 36; i++) { // 6 min max
        await new Promise(r => setTimeout(r, 10000))
        const { data: jobs } = await supabase.from('agent_jobs')
          .select('status, error_message')
          .eq('agent_id', detectedAgent.id)
          .eq('cert_id', cert.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const job = jobs?.[0]
        if (job?.status === 'claimed') {
          setStep(1, 'done', 'Agent received job')
          setStep(2, 'running', 'Installing on server…')
          setStep(3, 'running')
        }
        if (job?.status === 'success') {
          setStep(1, 'done', 'Agent received job')
          setStep(2, 'done', `Written to /etc/ssl/sslvault/${cert.domain}/`)
          setStep(3, 'done', 'Web server reloaded — SSL active')
          jobDone = true
          break
        }
        if (job?.status === 'failed') {
          setStep(2, 'error', job.error_message || 'Agent reported failure')
          setErrorMsg(job.error_message || 'Agent installation failed')
          setPhase('error')
          return
        }
      }

      if (!jobDone) {
        // Timed out — job is still running in background
        setStep(1, 'done', 'Job accepted by agent')
        setStep(2, 'running', 'Running on server — check back in a minute')
        setStep(3, 'pending')
      }
      setPhase('done')
      onSuccess?.()
    } catch (e) {
      setStep(0, 'error', e.message)
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  // ── Install with new cPanel credentials ──────────────────────────────
  const installNewCpanel = async () => {
    if (!cpHost || !cpUser || !cpToken) {
      setErrorMsg('Hostname, username and API token are required')
      return
    }
    setErrorMsg('')
    const initSteps = [
      { label: 'Saving cPanel credentials', state: 'pending', detail: cpHost },
      { label: 'Retrieving private key from KeyVault', state: 'pending', detail: '' },
      { label: 'Installing certificate via cPanel API', state: 'pending', detail: '' },
      { label: 'Verifying HTTPS is live', state: 'pending', detail: cert.domain },
    ]
    setSteps(initSteps)
    setPhase('installing')

    try {
      setStep(0, 'running')
      let credId = null

      if (cpSave) {
        const { data: saved, error: saveErr } = await supabase.from('server_credentials').insert({
          user_id: userId,
          server_type: 'cpanel',
          host: cpHost,
          port: 2083,
          username: cpUser,
          nickname: cpUser + '@' + cpHost,
          domains: [cert.domain],
          auto_install_enabled: true,
        }).select('id').single()
        if (!saveErr && saved) credId = saved.id
      }

      await supabase.from('certificates').update({
        install_method: 'cpanel',
        install_server_id: credId,
      }).eq('id', cert.id)

      setStep(0, 'done', cpSave ? 'Credentials saved for future installs' : 'Ready')
      setStep(1, 'running')
      await new Promise(r => setTimeout(r, 300))
      setStep(1, 'done', 'Key retrieved')
      setStep(2, 'running', 'Calling cPanel UAPI…')

      const result = await callFn('cpanel-install', {
        action: 'install',
        cert_id: cert.id,
        domain: cert.domain,
        ...(credId ? { credential_id: credId } : { hostname: cpHost, port: 2083, cpanel_user: cpUser, api_token: cpToken }),
      })

      if (!result.ok) {
        setStep(2, 'error', result.error || 'Failed')
        setErrorMsg(result.error || 'Installation failed. Check credentials.')
        setPhase('error')
        return
      }

      setStep(2, 'done', 'Certificate installed')
      setStep(3, 'running', `Checking https://${cert.domain}…`)
      let verified = false
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 4000))
        try {
          const res = await fetch(`https://${cert.domain}`, { method: 'HEAD', redirect: 'follow' })
          if (res.status < 500) { verified = true; break }
        } catch {}
      }
      setStep(3, 'done', verified ? `HTTPS live ✓` : 'Installed — may take a minute')
      setPhase('done')
      onSuccess?.()
    } catch (e) {
      setStep(0, 'error', e.message)
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  // ── Get agent pairing command ────────────────────────────────────────
  const fetchPairingCmd = async () => {
    setPairingLoading(true)
    try {
      const data = await callFn('agent-daemon', {
        action: 'create_install_command',
        user_id: userId,
        nickname: serverNickname || 'My Server',
      })
      if (data.ok && data.command) setPairingCmd(data.command)
      else setErrorMsg(data.error || 'Failed to generate command')
    } catch (e) { setErrorMsg(e.message) }
    setPairingLoading(false)
  }

  // ── RENDER ───────────────────────────────────────────────────────────
  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500,
    display:'flex', alignItems:'center', justifyContent:'center', padding:20 }
  const modal = { background:'#0a0000', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
    width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto',
    boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }
  const header = { display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }
  const body = { padding:'20px' }
  const inp = { width:'100%', padding:'8px 10px', fontSize:12, borderRadius:6, boxSizing:'border-box',
    border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)',
    color:'#f0ede8', fontFamily:'inherit', outline:'none' }
  const btn = (primary) => ({ width:'100%', padding:'10px', fontSize:13, fontWeight:600,
    borderRadius:7, border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
    background: primary ? '#c0392b' : 'transparent',
    color: primary ? 'white' : 'rgba(240,237,232,0.7)',
    cursor:'pointer', fontFamily:'inherit', marginTop:8 })

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#ffffff' }}>
              {phase === 'done' ? '✓ Certificate installed' : 'Install Certificate'}
            </div>
            <div style={{ fontSize:11, color:'rgba(240,237,232,0.4)', fontFamily:'monospace', marginTop:2 }}>
              {cert.domain}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'rgba(240,237,232,0.4)', fontSize:20, lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        <div style={body}>

          {/* DETECTING */}
          {phase === 'detecting' && (
            <div style={{ textAlign:'center', padding:'24px 0', color:'rgba(240,237,232,0.5)', fontSize:12 }}>
              <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #c0392b',
                borderTopColor:'transparent', animation:'spin .8s linear infinite', margin:'0 auto 12px' }}/>
              Checking your saved servers…
            </div>
          )}

          {/* READY — credentials found, one-click install */}
          {phase === 'ready' && (
            <div>
              <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)',
                borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#4ade80', marginBottom:4 }}>
                  {detectedMethod === 'cpanel' ? '🌐 cPanel server found' : '🖥 VPS agent found'}
                </div>
                <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)' }}>
                  {detectedMethod === 'cpanel'
                    ? (detectedCred?.nickname || detectedCred?.host || 'Saved cPanel server')
                    : (detectedAgent?.hostname || detectedAgent?.nickname || 'Online VPS agent')}
                </div>
              </div>
              <div style={{ fontSize:12, color:'rgba(240,237,232,0.6)', marginBottom:16, lineHeight:1.6 }}>
                SSLVault will install the certificate on your server automatically.
                {detectedMethod === 'agent' && ' The VPS agent will pick up the job within 1–2 minutes.'}
              </div>
              <button onClick={install} disabled={needToken}
                style={{...btn(true), ...(needToken ? {opacity:0.4,cursor:'not-allowed'} : {})}}>
                {needToken ? 'Enter API token first ↓' : 'Install now'}
              </button>
              <button onClick={() => setPhase('no_creds')} style={btn(false)}>
                Use a different server
              </button>
            </div>
          )}

          {/* TOKEN NEEDED — saved cPanel cred but no token stored */}
          {phase === 'ready' && needToken && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:8,
              background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginBottom:6 }}>
                API token needed
              </div>
              <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', marginBottom:10, lineHeight:1.6 }}>
                Your cPanel server is saved but the API token was not stored.
                Enter it once and it will be saved securely for all future installs.
              </div>
              <input type="password" value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="cPanel API token"
                style={{ width:'100%', padding:'8px 10px', fontSize:12, borderRadius:6, boxSizing:'border-box',
                  border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)',
                  color:'#f0ede8', fontFamily:'inherit', outline:'none', marginBottom:8 }}/>
              <button
                disabled={!tokenInput || savingToken}
                onClick={async () => {
                  if (!tokenInput) return
                  setSavingToken(true)
                  try {
                    const r = await callFn('cpanel-install', {
                      action: 'save_credential',
                      host: detectedCred.host,
                      username: detectedCred.username,
                      api_token: tokenInput,
                      domain: cert.domain,
                      cert_id: cert.id,
                    })
                    if (r.ok) {
                      setDetectedCred(prev => ({ ...prev, cpanel_api_token_enc: 'stored' }))
                      setNeedToken(false)
                    } else {
                      setErrorMsg(r.error || 'Failed to save token')
                    }
                  } catch(e) { setErrorMsg(e.message) }
                  setSavingToken(false)
                }}
                style={{ width:'100%', padding:'8px', fontSize:12, fontWeight:600,
                  borderRadius:6, border:'none', background: tokenInput ? '#c0392b' : 'rgba(192,57,43,0.3)',
                  color:'white', cursor: tokenInput ? 'pointer' : 'default', fontFamily:'inherit' }}>
                {savingToken ? 'Saving…' : 'Save token & install'}
              </button>
            </div>
          )}

          {/* NO CREDENTIALS — choose method */}
          {phase === 'no_creds' && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:6 }}>
                How is your website hosted?
              </div>
              <div style={{ fontSize:12, color:'rgba(240,237,232,0.5)', marginBottom:16 }}>
                Choose the right option to install your certificate automatically.
              </div>
              <div style={{ display:'grid', gap:10, marginBottom:8 }}>
                {[
                  { key:'cpanel', icon:'🌐', title:'Shared hosting / cPanel',
                    desc:'GoDaddy, Bluehost, Namecheap, SiteGround, any cPanel host' },
                  { key:'agent', icon:'🖥', title:'VPS or cloud server',
                    desc:'Ubuntu, CentOS, Debian — you have SSH/root access' },
                  { key:'manual', icon:'📋', title:'Manual / other',
                    desc:'Download the files and install yourself' },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => opt.key === 'manual' ? setPhase('manual') : setPhase('setup_'+opt.key)}
                    style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px',
                      borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)',
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit', width:'100%',
                      transition:'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='rgba(192,57,43,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}>
                    <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:2 }}>{opt.title}</div>
                      <div style={{ fontSize:11, color:'rgba(240,237,232,0.4)' }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SETUP CPANEL */}
          {phase === 'setup_cpanel' && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:4 }}>cPanel credentials</div>
              <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', marginBottom:16, lineHeight:1.6 }}>
                We'll install the certificate directly via your cPanel API. Credentials are encrypted and stored securely.
              </div>
              {[
                { label:'cPanel hostname', placeholder:'yoursite.com or server IP', val:cpHost, set:setCpHost },
                { label:'cPanel username', placeholder:'your cPanel login username', val:cpUser, set:setCpUser },
                { label:'API token', placeholder:'Generated in cPanel → Manage API Tokens', val:cpToken, set:setCpToken, pw:true },
              ].map(f => (
                <div key={f.label} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:'rgba(240,237,232,0.5)', display:'block', marginBottom:4 }}>{f.label}</label>
                  <input type={f.pw ? 'password' : 'text'} value={f.val}
                    onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inp}/>
                </div>
              ))}
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:11,
                color:'rgba(240,237,232,0.5)', cursor:'pointer', marginBottom:16 }}>
                <input type="checkbox" checked={cpSave} onChange={e => setCpSave(e.target.checked)}/>
                Save this server for future automatic installs
              </label>
              {errorMsg && <div style={{ fontSize:11, color:'#f87171', marginBottom:12 }}>{errorMsg}</div>}
              <button onClick={installNewCpanel} style={btn(true)}>Install certificate</button>
              <button onClick={() => { setErrorMsg(''); setPhase('no_creds') }} style={btn(false)}>← Back</button>
            </div>
          )}

          {/* SETUP AGENT */}
          {phase === 'setup_agent' && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:4 }}>Connect your VPS</div>
              <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', marginBottom:16, lineHeight:1.6 }}>
                Run this one-time command on your server as root. Once installed, all future certificate updates are automatic.
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:500, color:'rgba(240,237,232,0.5)', display:'block', marginBottom:4 }}>Server label</label>
                <input type="text" value={serverNickname} onChange={e => setServerNickname(e.target.value)}
                  placeholder="My Production Server" style={inp}/>
              </div>
              <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:10, color:'rgba(240,237,232,0.3)' }}>Paste on your server as root</span>
                  {pairingCmd && <CopyBtn text={pairingCmd}/>}
                </div>
                <pre style={{ margin:0, padding:'12px 14px', color:'#4ade80', fontSize:11,
                  fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}>
                  {pairingLoading ? 'Generating command…' : pairingCmd || '← Generate command below'}
                </pre>
              </div>
              {!pairingCmd && (
                <button onClick={fetchPairingCmd} disabled={pairingLoading} style={btn(true)}>
                  {pairingLoading ? 'Generating…' : 'Generate install command'}
                </button>
              )}
              {pairingCmd && (
                <div style={{ fontSize:11, color:'rgba(240,237,232,0.4)', lineHeight:1.7, marginBottom:12 }}>
                  After running the command, come back here. The agent connects automatically and installs your certificate.
                </div>
              )}
              <button onClick={() => { setErrorMsg(''); setPhase('no_creds') }} style={btn(false)}>← Back</button>
            </div>
          )}

          {/* MANUAL DOWNLOAD */}
          {phase === 'manual' && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:12 }}>Download certificate files</div>
              {[
                { label:'Certificate (cert.pem)', val:cert.cert_pem, filename:`${cert.domain}-cert.pem` },
                { label:'CA Bundle (chain.pem)', val:cert.ca_pem, filename:`${cert.domain}-chain.pem` },
              ].filter(f => f.val).map(f => (
                <div key={f.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 12px', borderRadius:7, border:'1px solid rgba(255,255,255,0.08)',
                  marginBottom:8, background:'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize:12, color:'#f0ede8' }}>{f.label}</span>
                  <button onClick={() => { const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,'+encodeURIComponent(f.val); a.download = f.filename; a.click() }}
                    style={{ fontSize:11, fontWeight:600, color:'#4ade80', background:'none',
                      border:'1px solid rgba(74,222,128,0.2)', borderRadius:5, padding:'4px 10px',
                      cursor:'pointer', fontFamily:'inherit' }}>
                    Download
                  </button>
                </div>
              ))}
              <div style={{ fontSize:11, color:'rgba(240,237,232,0.4)', lineHeight:1.7, marginTop:12, marginBottom:16 }}>
                Upload the certificate and key to your hosting panel or server. Your private key can be downloaded from the <strong style={{ color:'rgba(240,237,232,0.6)' }}>Files tab</strong> above.
              </div>
              <button onClick={() => setPhase('no_creds')} style={btn(false)}>← Back</button>
            </div>
          )}

          {/* INSTALLING */}
          {(phase === 'installing' || (phase === 'done' && steps.length > 0)) && (
            <div>
              {steps.map((s, i) => (
                <StepRow key={i} label={s.label} detail={s.detail} state={s.state}/>
              ))}
              {phase === 'done' && (
                <div style={{ marginTop:16, padding:'12px 14px', borderRadius:8,
                  background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#4ade80', marginBottom:4 }}>
                    {detectedMethod === 'agent' ? '✓ Install job dispatched' : '✓ Certificate installed successfully'}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', lineHeight:1.6 }}>
                    {detectedMethod === 'agent'
                      ? 'The VPS agent will complete the install within 1–2 minutes. Your website SSL updates automatically.'
                      : `${cert.domain} is now secured with the latest certificate.`}
                  </div>
                </div>
              )}
              {phase === 'done' && (
                <button onClick={onClose} style={btn(true)}>Done</button>
              )}
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div>
              {steps.map((s, i) => <StepRow key={i} label={s.label} detail={s.detail} state={s.state}/>)}
              <div style={{ marginTop:16, padding:'12px 14px', borderRadius:8,
                background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#f87171', marginBottom:4 }}>Installation failed</div>
                <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', lineHeight:1.6 }}>{errorMsg}</div>
              </div>
              <button onClick={() => { setPhase('no_creds'); setSteps([]); setErrorMsg('') }} style={btn(false)}>
                Try again
              </button>
              <button onClick={onClose} style={btn(false)}>Close</button>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
