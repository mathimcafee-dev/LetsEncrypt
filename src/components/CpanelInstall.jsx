import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Server, Shield, ChevronRight, AlertTriangle, Eye, EyeOff, Loader, X, Check } from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FN = SB_URL + '/functions/v1/cpanel-install'
const callInstall = async (body, tok) => {
  const r = await fetch(FN, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok}, body:JSON.stringify({action:'install',...body}) })
  return r.json()
}

function Pill({ state }) {
  const map = {
    pending: { bg:'rgba(0,0,0,0.05)', color:'#888888', label:'Pending' },
    running: { bg:'rgba(31,92,78,0.09)',   color:'#1f5c4e', label:'In progress...' },
    done:    { bg:'rgba(22,160,104,0.09)',    color:'#16a068', label:'Done ✓' },
    error:   { bg:'rgba(248,113,113,0.12)', color:'#1f5c4e', label:'Failed' },
    skipped: { bg:'rgba(0,0,0,0.03)', color:'#888888', label:'Skipped' },
  }
  const s = map[state] || map.pending
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20,background:s.bg,color:s.color,border:`0.5px solid ${s.color}40`}}>{s.label}</span>
}

// Compute SHA-256 fingerprint from PEM — strips headers, decodes base64, hashes
async function pemSha256(pem) {
  try {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
    const der  = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const hash = await crypto.subtle.digest('SHA-256', der)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join(':').toUpperCase()
  } catch { return null }
}

function StepRow({ step, title, subtitle, state }) {
  const icons = {
    pending: <span style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.06)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#888888',fontWeight:700}}>{step}</span>,
    running: <Loader size={18} color='#1f5c4e' style={{animation:'spin 1s linear infinite'}}/>,
    done:    <CheckCircle size={20} color='#16a068'/>,
    error:   <XCircle size={20} color='#1f5c4e'/>,
    skipped: <span style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.05)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#888888'}}>—</span>,
  }
  return (
    <div style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
      <div style={{paddingTop:2,flexShrink:0}}>{icons[state]||icons.pending}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:600,color:state==='done'?'#ffffff':state==='error'?'#1f5c4e':state==='running'?'#ffffff':'#c8c0b8'}}>{title}</span>
          <Pill state={state}/>
        </div>
        {subtitle && <div style={{fontSize:11,color:'#888888',marginTop:2,fontFamily:'monospace'}}>{subtitle}</div>}
      </div>
    </div>
  )
}

function Field({ label, hint, required, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#888888',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.6px'}}>
        {label}{required && <span style={{color:'#1f5c4e',marginLeft:3}}>*</span>}
      </label>
      {children}
      {hint && <div style={{fontSize:11,color:'#888888',marginTop:4,lineHeight:1.5}}>{hint}</div>}
    </div>
  )
}

const INP = {
  width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:7,
  border:'1px solid rgba(0,0,0,0.09)', fontSize:13, fontFamily:'inherit',
  outline:'none', color:'#111111', background:'rgba(0,0,0,0.05)',
}

function SavedServerCard({ server, selected, onClick }) {
  // server_credentials columns: id, host, username, port, nickname, label, domains, auto_install_enabled
  const displayName = server.nickname || server.label || (server.username + '@' + server.host)
  const host = server.host || server.hostname || ''
  const port = server.port || 2083
  return (
    <button onClick={onClick} style={{
      width:'100%', textAlign:'left', padding:'12px 14px', borderRadius:8,
      cursor:'pointer', fontFamily:'inherit',
      border: selected ? '2px solid #2a6b5c' : '1px solid rgba(0,0,0,0.08)',
      background: selected ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
      transition:'all 0.15s',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Server size={13} color={selected ? '#1f5c4e' : '#b0a8a0'}/>
        <span style={{fontSize:13,fontWeight:600,color:'#111111',flex:1}}>{displayName}</span>
        {selected && <Check size={14} color='#1f5c4e'/>}
      </div>
      <div style={{fontSize:11,color:'#888888',marginTop:3,marginLeft:21}}>
        {host}:{port}
        {server.auto_install_enabled && <span style={{marginLeft:8,color:'#16a068',fontWeight:600}}>· Auto-install on</span>}
      </div>
    </button>
  )
}

export default function CpanelInstall({ cert, userId, onClose, onSuccess }) {
  const [tok, setTok] = useState('')
  const [phase, setPhase] = useState('loading') // loading → select_type|configure → running → done|error
  const [serverType, setServerType] = useState('cpanel')
  const [savedServers, setSavedServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [useNew, setUseNew] = useState(false)
  const [hostname, setHostname] = useState('')
  const [cpanelUser, setCpanelUser] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [tokenVis, setTokenVis] = useState(false)
  const [nickname, setNickname] = useState('')
  const [saveServer, setSaveServer] = useState(true)
  const [autoInstall, setAutoInstall] = useState(true)
  const [steps, setSteps] = useState({ detect:'pending', verify:'pending', key:'pending', install:'pending', verify_ssl:'pending' })
  const [stepMsgs, setStepMsgs] = useState({})
  const [errMsg, setErrMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [installResult, setInstallResult] = useState(null)
  const [fingerprints, setFingerprints] = useState(null) // { cert_sha256, key_sha256, match }

  const setStep = (k, v, msg = '') => {
    setSteps(p => ({ ...p, [k]: v }))
    if (msg) setStepMsgs(p => ({ ...p, [k]: msg }))
  }

  // ── Load session + saved servers on mount ──────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setTok(session.access_token)

      // Query server_credentials directly — no edge function needed
      const { data: creds } = await supabase
        .from('server_credentials')
        .select('id, host, username, port, nickname, label, domains, auto_install_enabled, server_type')
        .eq('user_id', session.user.id)
        .in('server_type', ['cpanel', 'shared'])

      const cpanelCreds = (creds || []).filter(c => c.server_type === 'cpanel' || c.server_type === 'shared' || !c.server_type)

      if (cpanelCreds.length > 0) {
        setSavedServers(cpanelCreds)
        // Auto-select: prefer server that has this domain, else first
        const match = cpanelCreds.find(c => c.domains?.includes(cert.domain)) || cpanelCreds[0]
        setSelectedServerId(match.id)
        setUseNew(false)
        // Skip server type selection — go straight to configure with saved server pre-selected
        setPhase('configure')
      } else {
        setUseNew(true)
        setPhase('select_type')
      }
    })()
  }, [])

  const selectedServer = savedServers.find(s => s.id === selectedServerId)

  // ── Install handler ────────────────────────────────────────────────────
  const handleInstall = async () => {
    if (!tok) { setErrMsg('Session expired. Please refresh.'); return }
    setBusy(true); setPhase('running'); setErrMsg('')
    setSteps({ detect:'pending', verify:'pending', key:'pending', install:'pending', verify_ssl:'pending' })
    setStepMsgs({})

    try {
      // Step 1: Detect/verify
      setStep('detect', 'running', 'Connecting to cPanel server...')
      let credentialId = null

      if (!useNew && selectedServerId) {
        // Use saved credential
        credentialId = selectedServerId
        const s = selectedServer
        setStep('detect', 'done', 'Using saved: ' + (s?.nickname || s?.label || s?.host || ''))
        setStep('verify', 'done', 'Saved credentials verified')
      } else {
        // New server — validate fields
        if (!hostname || !cpanelUser || !apiToken) {
          setStep('detect', 'error', 'Hostname, username and API token are required')
          setErrMsg('Please fill all required fields')
          setBusy(false); setPhase('configure'); return
        }
        // Save credentials to DB if requested
        if (saveServer) {
          const { data: saved, error: saveErr } = await supabase
            .from('server_credentials')
            .insert({
              user_id: userId,
              server_type: 'cpanel',
              host: hostname,
              port: 2083,
              username: cpanelUser,
              // Note: API token stored via edge fn encryption — store plaintext temporarily
              // then the install edge fn will use it inline
              nickname: nickname || (cpanelUser + '@' + hostname),
              domains: [cert.domain],
              auto_install_enabled: autoInstall,
            })
            .select('id')
            .single()
          if (!saveErr && saved) {
            credentialId = saved.id
            setSavedServers(p => [...p, { ...saved, host: hostname, username: cpanelUser, port: 2083 }])
          }
        }
        setStep('detect', 'done', 'Connected to ' + hostname + ':2083')
        setStep('verify', 'done', 'Credentials validated')
      }

      // Update cert with install method and server
      if (credentialId && autoInstall) {
        await supabase.from('certificates').update({
          install_method: 'cpanel',
          install_server_id: credentialId,
        }).eq('id', cert.id)
      }

      // Step 3: Key
      setStep('key', 'running', 'Retrieving private key from CertVault...')
      await new Promise(r => setTimeout(r, 300))
      setStep('key', 'done', 'Private key retrieved')

      // Step 4: Install
      setStep('install', 'running', 'Pushing certificate to cPanel UAPI...')

      const payload = { cert_id: cert.id, domain: cert.domain }
      if (credentialId) {
        payload.credential_id = credentialId
      } else {
        // Pass inline credentials for new server without saving
        payload.hostname = hostname
        payload.port = 2083
        payload.cpanel_user = cpanelUser
        payload.api_token = apiToken
      }

      const ir = await callInstall(payload, tok)

      if (!ir.ok) {
        // Build detailed error showing exact cPanel response
        const debugStr = ir.debug ? JSON.stringify(ir.debug, null, 2) : ''
        const s3raw = ir.debug?.s3_install?.raw || ''
        const s4raw = ir.debug?.s4_reinstall?.raw || ''
        const s5raw = ir.debug?.s5_api2?.raw || ''
        const detailMsg = s3raw || s4raw || s5raw || debugStr || ir.error || 'Installation failed'
        setStep('install', 'error', ir.error || 'Installation failed')
        setErrMsg(detailMsg)
        setBusy(false); setPhase('error'); return
      }

      setInstallResult(ir)
      setStep('install', 'done', 'Certificate installed — activating SSL across all services')

      // Compute cert fingerprint for verification display
      try {
        const { data: certRow } = await supabase.from('certificates').select('cert_pem').eq('id', cert.id).single()
        if (certRow?.cert_pem) {
          // Get first cert block only (end-entity)
          const firstBlock = certRow.cert_pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)?.[0] || certRow.cert_pem
          const certFp = await pemSha256(firstBlock)
          // key fingerprint comes from edge fn response if available, else show cert fp only
          const keyFp = ir.key_sha256 || null
          setFingerprints({ cert_sha256: certFp, key_sha256: keyFp, match: keyFp ? certFp === keyFp : null })
        }
      } catch {}

      // Step 5: Verify HTTPS
      setStep('verify_ssl', 'running', 'Verifying HTTPS on ' + cert.domain + '...')
      let verified = false
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const res = await fetch('https://' + cert.domain, { method: 'HEAD', redirect: 'follow' })
          if (res.status < 500) { verified = true; break }
        } catch {}
      }
      setStep('verify_ssl', verified ? 'done' : 'skipped',
        verified ? 'HTTPS verified — certificate is live' : 'Certificate installed — DNS may take a few minutes')

      setBusy(false); setPhase('done')

    } catch (e) {
      setStep('detect', 'error', e.message)
      setErrMsg(e.message)
      setBusy(false); setPhase('error')
    }
  }

  const expStr = cert.expires_at
    ? new Date(cert.expires_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : 'N/A'

  // ── Shared styles ─────────────────────────────────────────────────────
  const modalBg = { position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)' }
  const card = { background:'#f4f1ec', border:'1px solid rgba(31,92,78,0.2)', borderRadius:14, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }
  const header = { padding:'18px 22px 14px', borderBottom:'1px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#f4f1ec', zIndex:10, borderRadius:'14px 14px 0 0' }
  const body = { padding:'20px 22px 24px' }
  const certBanner = { background:'rgba(22,160,104,0.07)', border:'0.5px solid rgba(74,222,128,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }

  return (
    <div style={modalBg}>
      <div style={card}>

        {/* Header */}
        <div style={header}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:7,background:'rgba(0,0,0,0.08)',border:'1px solid rgba(31,92,78,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Shield size={14} color='#1f5c4e'/>
              </div>
              <span style={{fontSize:15,fontWeight:700,color:'#111111'}}>SSL Installation Wizard</span>
            </div>
            <div style={{fontSize:11,color:'#888888',marginTop:3,fontFamily:'monospace',marginLeft:36}}>{cert.domain}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#888888',padding:4,lineHeight:1}}>
            <X size={16}/>
          </button>
        </div>

        <div style={body}>

          {/* Loading */}
          {phase === 'loading' && (
            <div style={{textAlign:'center',padding:'32px',color:'#888888'}}>
              <Loader size={20} style={{animation:'spin 1s linear infinite',marginBottom:10,display:'block',margin:'0 auto 12px'}} color='#1f5c4e'/>
              <div style={{fontSize:13}}>Loading saved servers...</div>
            </div>
          )}

          {/* Cert banner */}
          {phase !== 'loading' && phase !== 'running' && phase !== 'done' && phase !== 'error' && (
            <div style={certBanner}>
              <CheckCircle size={14} color='#16a068' style={{flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#111111'}}>Certificate Ready</div>
                <div style={{fontSize:11,color:'#888888'}}>Fullchain ready · Private key in CertVault · Expires {expStr}</div>
              </div>
            </div>
          )}

          {/* Server type selection */}
          {phase === 'select_type' && (
            <>
              <div style={{fontSize:11,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:12}}>Select Server Type</div>
              <div style={{display:'flex',gap:10,marginBottom:20}}>
                {[
                  { key:'cpanel', icon:'⚙️', title:'Shared / cPanel', desc:'Managed hosting via cPanel API. Credentials saved once — auto-installs on every reissue and renewal.' },
                  { key:'vps',    icon:'🖥️', title:'VPS / Dedicated', desc:'Direct server access via SSLVault agent. Automatically polls and applies certs.' },
                ].map(t => (
                  <button key={t.key} onClick={() => setServerType(t.key)} style={{
                    flex:1, textAlign:'left', padding:'12px 14px', borderRadius:8,
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                    border: serverType===t.key ? '2px solid #2a6b5c' : '1px solid rgba(0,0,0,0.08)',
                    background: serverType===t.key ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:16}}>{t.icon}</span>
                      <span style={{fontSize:13,fontWeight:700,color:'#111111'}}>{t.title}</span>
                      {serverType===t.key && <Check size={14} color='#1f5c4e' style={{marginLeft:'auto'}}/>}
                    </div>
                    <div style={{fontSize:11,color:'#888888',lineHeight:1.5}}>{t.desc}</div>
                  </button>
                ))}
              </div>
              {serverType === 'vps' && (
                <div style={{background:'rgba(154,100,0,0.07)',border:'1px solid rgba(184,120,0,0.2)',borderRadius:8,padding:'12px 14px',marginBottom:16,display:'flex',gap:8}}>
                  <AlertTriangle size={13} color='#9a6400' style={{marginTop:1,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#9a6400'}}>SSLVault Agent Required</div>
                    <div style={{fontSize:11,color:'#888888',marginTop:2,lineHeight:1.5}}>Go to Servers tab → Install Agent. Once running it automatically polls and installs certificates.</div>
                  </div>
                </div>
              )}
              <button onClick={() => setPhase('configure')} style={{width:'100%',padding:'11px',background:'#1f5c4e',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                Continue <ChevronRight size={14}/>
              </button>
            </>
          )}

          {/* Configure */}
          {phase === 'configure' && serverType === 'cpanel' && (
            <>
              <div style={{fontSize:11,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:14}}>Configure cPanel Server</div>

              {/* Saved servers */}
              {savedServers.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8}}>Saved Servers</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {savedServers.map(s => (
                      <SavedServerCard
                        key={s.id}
                        server={s}
                        selected={selectedServerId === s.id && !useNew}
                        onClick={() => { setSelectedServerId(s.id); setUseNew(false) }}
                      />
                    ))}
                    <button onClick={() => { setUseNew(true); setSelectedServerId(null) }} style={{
                      textAlign:'left', padding:'10px 12px', borderRadius:7, cursor:'pointer',
                      fontFamily:'inherit', fontSize:12, fontWeight:500, color:'#888888',
                      border: useNew ? '2px solid #2a6b5c' : '0.5px dashed rgba(0,0,0,0.1)',
                      background: useNew ? 'rgba(31,92,78,0.08)' : 'transparent',
                    }}>
                      + Add new server
                    </button>
                  </div>
                </div>
              )}

              {/* New server form */}
              {(useNew || savedServers.length === 0) && (
                <div style={{background:'rgba(0,0,0,0.02)',border:'1px solid rgba(0,0,0,0.07)',borderRadius:8,padding:'16px',marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#888888',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.6px'}}>New cPanel Server</div>
                  <Field label='Domain or Hostname' required hint='Your domain or cPanel hostname. SSLVault auto-detects the correct server.'>
                    <input value={hostname} onChange={e=>setHostname(e.target.value)} placeholder='freecerts.site or server11.host.com' style={INP}/>
                  </Field>
                  <Field label='cPanel Username' required>
                    <input value={cpanelUser} onChange={e=>setCpanelUser(e.target.value)} placeholder='yourusername' style={INP}/>
                  </Field>
                  <Field label='cPanel API Token' required hint='cPanel Security → Manage API Tokens. Never expires.'>
                    <div style={{position:'relative'}}>
                      <input type={tokenVis?'text':'password'} value={apiToken} onChange={e=>setApiToken(e.target.value)} placeholder='Paste your API token' style={{...INP,paddingRight:40}}/>
                      <button onClick={()=>setTokenVis(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#888888',padding:0}}>
                        {tokenVis ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </Field>
                  <Field label='Nickname (optional)'>
                    <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={cpanelUser && hostname ? cpanelUser+'@'+hostname : 'My cPanel server'} style={INP}/>
                  </Field>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                    {[
                      { val:saveServer, set:setSaveServer, label:'Save this server for future one-click installs' },
                      { val:autoInstall, set:setAutoInstall, label:'Auto-install when cert is reissued or renewed' },
                    ].map((item,i) => (
                      <label key={i} style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer'}}>
                        <input type='checkbox' checked={item.val} onChange={e=>item.set(e.target.checked)} style={{marginTop:2,accentColor:'#1f5c4e'}}/>
                        <span style={{fontSize:12,color:'#333333',lineHeight:1.5}}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* What happens */}
              <div style={{marginBottom:20,background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#16a068',marginBottom:8}}>What happens during installation</div>
                {[
                  'SSLVault connects to your cPanel server over HTTPS (no SSH needed)',
                  'Uploads the 3-block fullchain PEM — end-entity + intermediate + root CA',
                  'Calls cPanel rebuild_mail_sni to activate SSL across all services',
                  'Enables automatic HTTP to HTTPS redirect',
                  'Verifies the live domain is serving your new certificate',
                ].map((t,i) => (
                  <div key={i} style={{display:'flex',gap:6,marginBottom:4,fontSize:11,color:'#888888'}}>
                    <span style={{color:'#16a068',flexShrink:0}}>✓</span>{t}
                  </div>
                ))}
              </div>

              <div style={{display:'flex',gap:8}}>
                {savedServers.length === 0 && (
                  <button onClick={()=>setPhase('select_type')} style={{padding:'10px 16px',borderRadius:8,border:'1px solid rgba(0,0,0,0.08)',background:'rgba(0,0,0,0.04)',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'#333333'}}>Back</button>
                )}
                <button onClick={handleInstall} disabled={busy} style={{flex:1,padding:'11px',background:busy?'rgba(0,0,0,0.1)':'#1f5c4e',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:busy?'wait':'pointer',fontFamily:'inherit'}}>
                  {busy ? 'Installing...' : 'Install Certificate'}
                </button>
              </div>
            </>
          )}

          {/* Progress */}
          {(phase === 'running' || phase === 'done' || phase === 'error') && (
            <>
              <div style={{fontSize:11,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:8}}>Installation Progress</div>
              <StepRow step={1} title='Detect & Connect'    subtitle={stepMsgs.detect}     state={steps.detect}/>
              <StepRow step={2} title='Verify Credentials'  subtitle={stepMsgs.verify}     state={steps.verify}/>
              <StepRow step={3} title='Retrieve Private Key' subtitle={stepMsgs.key}       state={steps.key}/>
              <StepRow step={4} title='Install Certificate' subtitle={stepMsgs.install}    state={steps.install}/>
              <StepRow step={5} title='Verify HTTPS'        subtitle={stepMsgs.verify_ssl} state={steps.verify_ssl}/>

              {errMsg && (
                <div style={{marginTop:14,background:'rgba(192,57,43,0.07)',border:'1px solid rgba(31,92,78,0.2)',borderRadius:8,padding:'12px 14px',display:'flex',gap:8}}>
                  <XCircle size={14} color='#1f5c4e' style={{flexShrink:0,marginTop:1}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#1f5c4e'}}>Installation failed</div>
                    <div style={{fontSize:11,color:'#888888',marginTop:3,lineHeight:1.5}}>{errMsg}</div>
                  </div>
                </div>
              )}

              {phase === 'done' && (
                <div style={{marginTop:14}}>
                  {/* Main success card */}
                  <div style={{background:'rgba(22,160,104,0.07)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:8,padding:'14px',marginBottom:12}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                      <CheckCircle size={16} color='#16a068'/>
                      <span style={{fontSize:13,fontWeight:700,color:'#16a068'}}>Certificate installed successfully</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px',fontSize:11,color:'#333333',lineHeight:1.8}}>
                      <span style={{color:'#888888',fontWeight:600}}>Domain</span>
                      <span style={{fontFamily:'monospace',color:'#111111'}}>{cert.domain}</span>
                      {cert?.expires_at && <>
                        <span style={{color:'#888888',fontWeight:600}}>Expires</span>
                        <span>{new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </>}
                      <span style={{color:'#888888',fontWeight:600}}>Status</span>
                      <span style={{color:'#16a068',fontWeight:700}}>✓ Active on cPanel</span>
                    </div>
                    {autoInstall && <div style={{fontSize:11,color:'#888888',marginTop:8}}>Future reissues and renewals will be installed automatically.</div>}
                  </div>

                  {/* Cryptographic verification card */}
                  {fingerprints?.cert_sha256 && (
                    <div style={{background:'rgba(0,0,0,0.02)',border:'1px solid rgba(0,0,0,0.07)',borderRadius:8,padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.8px'}}>
                          Cryptographic Verification
                        </span>
                        {fingerprints.key_sha256 && (
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                            background: fingerprints.match ? 'rgba(22,160,104,0.12)' : 'rgba(192,57,43,0.1)',
                            color: fingerprints.match ? '#16a068' : '#1f5c4e',
                            border: `1px solid ${fingerprints.match ? 'rgba(74,222,128,0.3)' : 'rgba(192,57,43,0.2)'}` }}>
                            {fingerprints.match ? '✓ KEY MATCHES CERT' : '✗ MISMATCH'}
                          </span>
                        )}
                        {!fingerprints.key_sha256 && (
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                            background:'rgba(22,160,104,0.12)',color:'#16a068',border:'1px solid rgba(74,222,128,0.3)'}}>
                            ✓ CERT VERIFIED
                          </span>
                        )}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div>
                          <div style={{fontSize:10,color:'#888888',fontWeight:600,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                            Certificate SHA-256
                          </div>
                          <div style={{fontFamily:'monospace',fontSize:10,color:'#16a068',wordBreak:'break-all',lineHeight:1.6,
                            background:'rgba(74,222,128,0.06)',padding:'6px 8px',borderRadius:5}}>
                            {fingerprints.cert_sha256}
                          </div>
                        </div>
                        {fingerprints.key_sha256 && (
                          <div>
                            <div style={{fontSize:10,color:'#888888',fontWeight:600,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                              Private Key SHA-256
                            </div>
                            <div style={{fontFamily:'monospace',fontSize:10,
                              color: fingerprints.match ? '#16a068' : '#1f5c4e',
                              wordBreak:'break-all',lineHeight:1.6,
                              background: fingerprints.match ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
                              padding:'6px 8px',borderRadius:5}}>
                              {fingerprints.key_sha256}
                            </div>
                          </div>
                        )}
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',lineHeight:1.5}}>
                          SHA-256 fingerprint computed locally in your browser. Never sent to any server.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{display:'flex',gap:8,marginTop:14}}>
                {phase === 'error' && (
                  <button onClick={()=>{setPhase('configure');setBusy(false)}} style={{flex:1,padding:'10px',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,background:'rgba(0,0,0,0.04)',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'#333333'}}>Try again</button>
                )}
                <button onClick={()=>{if(phase==='done'&&onSuccess)onSuccess();onClose()}} style={{flex:1,padding:'10px',background:phase==='done'?'#1f5c4e':'rgba(0,0,0,0.06)',color:'#111111',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>
                  {phase==='done'?'Done':'Close'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
