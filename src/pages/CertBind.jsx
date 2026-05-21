// CertBind.jsx v3 — User-friendly redesign
// Plain English, visual icons, expand-to-learn layers
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const SB   = 'https://frthcwkntciaakqsppss.supabase.co'

const C = {
  bg:'#ffffff', bg2:'#f9fafb', bg3:'#f3f4f6',
  border:'#e5e7eb',
  heading:'#0a0a0a', body:'#4b5563', muted:'#9ca3af',
  teal:'#0ea5e9', tealBg:'#f0f9ff', tealBd:'#bae6fd',
  green:'#10b981', greenBg:'#f0fdf4', greenBd:'#bbf7d0',
  purple:'#7c3aed', purpleBg:'#faf5ff', purpleBd:'#ddd6fe',
  amber:'#d97706', amberBg:'#fffbeb', amberBd:'#fde68a',
  red:'#dc2626', redBg:'#fef2f2', redBd:'#fecaca',
  blue:'#2563eb', blueBg:'#eff6ff', blueBd:'#bfdbfe',
}

// Human-readable status config
const STATUS = {
  bound:          { label:'Verified',        dot:C.green,  badge:{ bg:'#f0fdf4', color:'#065f46', bd:'#bbf7d0' } },
  key_mismatch:   { label:'Key mismatch',    dot:C.red,    badge:{ bg:C.redBg,   color:'#991b1b', bd:C.redBd  } },
  cert_mismatch:  { label:'Wrong cert',      dot:C.red,    badge:{ bg:C.redBg,   color:'#991b1b', bd:C.redBd  } },
  chain_anomaly:  { label:'Chain issue',     dot:C.purple, badge:{ bg:C.purpleBg,color:'#5b21b6', bd:C.purpleBd} },
  partial_deploy: { label:'Partial deploy',  dot:C.amber,  badge:{ bg:C.amberBg, color:'#92400e', bd:C.amberBd} },
  unreachable:    { label:'Unreachable',     dot:C.amber,  badge:{ bg:C.amberBg, color:'#92400e', bd:C.amberBd} },
  pending:        { label:'Pending',         dot:C.teal,   badge:{ bg:C.tealBg,  color:'#0369a1', bd:C.tealBd } },
  no_agent:       { label:'No agent',        dot:C.muted,  badge:{ bg:C.bg3,     color:C.muted,   bd:C.border  } },
}

// Layer config — plain English titles
const LAYERS = [
  {
    key:'keybind',
    icon:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    title:'Private key matches certificate',
    okText:'Your server is using the right private key — cryptographically proven.',
    failText:'The key on your server does NOT match the certificate. Re-install immediately.',
    skipText:'Waiting for the agent on your server.',
    howTitle:'How we check this',
    how:'The agent on your server signs a random challenge with your deployed private key. SSLVault verifies the signature against the certificate\'s public key. This proves the key and cert are paired — the key never leaves your server.',
  },
  {
    key:'tls',
    icon:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    title:'Server is serving the correct certificate',
    okText:'The certificate your server sends to visitors matches what SSLVault issued.',
    failText:'Your server is serving a DIFFERENT certificate than what SSLVault issued.',
    skipText:'Agent will probe port 443 on the next check.',
    howTitle:'How we check this',
    how:'The agent connects to your domain on port 443 (just like a browser would) and reads the certificate fingerprint. We compare it to the fingerprint of the certificate SSLVault issued. Any difference — even a subtle one — is caught immediately.',
  },
  {
    key:'chain',
    icon:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    title:'No one is intercepting your traffic',
    okText:'Full certificate chain is clean — no unexpected intermediates or proxies detected.',
    failText:'An unexpected CA was found in the chain — possible SSL inspection proxy.',
    skipText:'Agent will verify the chain on the next check.',
    howTitle:'Why this matters',
    how:'Some corporate firewalls (Palo Alto, Zscaler) silently decrypt and re-encrypt TLS traffic using their own certificates. They insert themselves as an intermediate in your chain. SSLVault detects this and alerts you.',
  },
  {
    key:'nodes',
    icon:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="15" y="2" width="7" height="7" rx="1"/><rect x="2" y="15" width="7" height="7" rx="1"/><rect x="15" y="15" width="7" height="7" rx="1"/><path d="M5.5 9v4M18.5 9v4M9 5.5h4M9 18.5h4M5.5 13h13"/></svg>,
    title:'All your servers are in sync',
    okText:'Every server in your setup is serving the correct certificate.',
    failText:'Some servers are serving an outdated certificate — partial deployment.',
    skipText:'Single server detected — no load balancer to check.',
    howTitle:'Why this matters',
    how:'If your domain points to multiple servers (a load balancer), updating the certificate on only some of them is one of the most common causes of TLS outages. SSLVault checks every IP your domain resolves to.',
  },
]

function Badge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:500,
      color:s.badge.color, background:s.badge.bg, border:`1px solid ${s.badge.bd}`,
      borderRadius:100, padding:'3px 11px', whiteSpace:'nowrap', fontFamily:MONO }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.badge.color }}/>
      {s.label}
    </span>
  )
}

function LayerCard({ cfg, check, isNew }) {
  const [open, setOpen] = useState(false)

  const statusKey = cfg.key === 'keybind' ? check?.keybind_status
    : cfg.key === 'tls'    ? check?.tls_status
    : cfg.key === 'chain'  ? check?.chain_status
    : check?.nodes_status

  const pass = statusKey === 'pass'
  const fail = statusKey === 'fail'
  const pend = statusKey === 'pending'
  const skip = !statusKey || statusKey === 'skip'

  const iconColor = pass ? C.green : fail ? C.red : C.muted
  const iconBg    = pass ? '#f0fdf4' : fail ? C.redBg : C.bg3
  const borderL   = pass ? C.green   : fail ? C.red   : pend ? C.teal : C.border
  const label     = pass ? 'PASS' : fail ? 'FAIL' : pend ? 'RUNNING' : 'SKIP'
  const labelBg   = pass ? '#f0fdf4' : fail ? C.redBg : pend ? C.tealBg : C.bg3
  const labelColor= pass ? '#065f46' : fail ? '#991b1b' : pend ? '#0369a1' : C.muted

  const resultText = pass ? cfg.okText : fail ? cfg.failText : skip ? cfg.skipText : 'Running check…'
  const resultColor= pass ? '#065f46' : fail ? '#991b1b' : C.muted

  return (
    <div style={{ border:`1px solid ${C.border}`, borderLeft:`3px solid ${borderL}`,
      borderRadius:8, background:C.bg, overflow:'hidden', marginBottom:8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', background:'none', border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
        fontFamily:F, textAlign:'left',
      }}>
        {/* Icon */}
        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
          background:iconBg, display:'flex', alignItems:'center', justifyContent:'center',
          color:iconColor }}>
          {pend
            ? <span style={{ width:13, height:13, border:`2px solid ${C.teal}40`,
                borderTopColor:C.teal, borderRadius:'50%', display:'inline-block',
                animation:'spin .8s linear infinite' }}/>
            : <cfg.icon/>
          }
        </div>

        {/* Title + result */}
        <div style={{ flex:1, minWidth:0, textAlign:'left' }}>
          <div style={{ fontSize:13.5, fontWeight:500, color:C.heading, marginBottom:3 }}>
            {cfg.title}
          </div>
          <div style={{ fontSize:12, color:resultColor, lineHeight:1.5 }}>
            {resultText}
          </div>
        </div>

        {/* Badge + expand */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:600, color:labelColor, background:labelBg,
            padding:'2px 8px', borderRadius:4, fontFamily:MONO }}>{label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"
            style={{ transform:open?'rotate(90deg)':'none', transition:'transform .2s' }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ padding:'0 16px 16px 60px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
            <div style={{ background:C.bg2, borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase',
                letterSpacing:'0.05em', fontFamily:MONO, marginBottom:6 }}>{cfg.howTitle}</div>
              <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>{cfg.how}</div>
            </div>
            <div style={{ background:C.bg2, borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase',
                letterSpacing:'0.05em', fontFamily:MONO, marginBottom:6 }}>Technical details</div>
              {cfg.key === 'tls' && check?.tls_expected_fp && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {check.tls_expected_fp && (
                    <div>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>Expected fingerprint (what SSLVault issued)</div>
                      <code style={{ fontSize:10, color:C.green, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.7, display:'block' }}>{check.tls_expected_fp}</code>
                    </div>
                  )}
                  {check.tls_actual_fp && (
                    <div>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>Actual fingerprint (what server is serving)</div>
                      <code style={{ fontSize:10, color:pass?C.green:C.red, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.7, display:'block' }}>{check.tls_actual_fp}</code>
                    </div>
                  )}
                </div>
              )}
              {cfg.key === 'keybind' && (
                <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>
                  Method: HMAC-SHA256<br/>
                  Nonce: randomly generated per check<br/>
                  Binding key: derived from cert SHA-256<br/>
                  {check?.keybind_verified_at && `Verified: ${new Date(check.keybind_verified_at).toLocaleTimeString()}`}
                </div>
              )}
              {cfg.key === 'chain' && (
                <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>
                  {check?.chain_anomaly_detail || (pass ? 'No unexpected intermediates found.' : 'Chain details not available.')}
                </div>
              )}
              {cfg.key === 'nodes' && check?.nodes_checked?.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {check.nodes_checked.map((n, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                      padding:'5px 10px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%',
                        background:n.status==='bound'?C.green:C.amber }}/>
                      <code style={{ fontSize:11, fontFamily:MONO, flex:1, color:C.heading }}>{n.ip}</code>
                      <span style={{ fontSize:10, fontWeight:600, color:n.status==='bound'?C.green:C.amber, fontFamily:MONO }}>
                        {n.status==='bound'?'OK':'NOT UPDATED'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {cfg.key === 'nodes' && (!check?.nodes_checked?.length) && (
                <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>
                  {pass ? 'All nodes verified.' : 'Resolves to a single IP — no load balancer detected.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CertBind({ nav }) {
  const [user, setUser]       = useState(null)
  const [certs, setCerts]     = useState([])
  const [checks, setChecks]   = useState({})
  const [agents, setAgents]   = useState({})
  const [selected, setSelected] = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [scanning, setScanning] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); load(session.user) }
      else setLoading(false)
    })
  }, [])

  async function api(body) {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`${SB}/functions/v1/certbind`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    })
    return r.json()
  }

  async function load(u) {
    setLoading(true)
    const uid = u?.id || user?.id
    if (!uid) { setLoading(false); return }

    const { data: rows } = await supabase.from('certificates')
      .select('id,domain,status,expires_at,issuer,certbind_status,certbind_checked_at,certbind_fp_expected,install_server_id')
      .eq('user_id', uid).in('status', ['active','issued'])
      .order('expires_at', { ascending:true })
    setCerts(rows || [])

    const agMap = {}
    for (const c of (rows || [])) {
      if (c.install_server_id) {
        const { data: sc } = await supabase.from('server_credentials')
          .select('agent_id').eq('id', c.install_server_id).single()
        if (sc?.agent_id) agMap[c.id] = sc.agent_id
      }
    }
    setAgents(agMap)

    const res = await api({ action:'get_status', user_id: uid })
    if (res.checks) {
      const map = {}
      for (const chk of res.checks) {
        if (!map[chk.cert_id] || new Date(chk.checked_at) > new Date(map[chk.cert_id].checked_at))
          map[chk.cert_id] = chk
      }
      setChecks(map)
      // Auto-select first cert
      if (!selected && rows?.length > 0) setSelected(rows[0].id)
    }
    setLoading(false)
  }

  async function runCheck(certId, e) {
    e?.stopPropagation()
    if (!user || scanning[certId]) return
    setScanning(s => ({ ...s, [certId]: true }))
    try {
      await api({ action:'request_bind_check', user_id:user.id, cert_id:certId, agent_id:agents[certId]||null })
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const res = await api({ action:'get_status', user_id:user.id, cert_id:certId })
        if (res.checks?.length > 0) {
          const latest = res.checks[0]
          setChecks(p => ({ ...p, [certId]: latest }))
          setCerts(p => p.map(c => c.id===certId ? { ...c, certbind_status:latest.binding_status } : c))
          if (selected === certId) setHistory(res.checks)
        }
        if (attempts >= 4) { clearInterval(poll); setScanning(s => ({ ...s, [certId]: false })) }
      }, 4000)
    } catch { setScanning(s => ({ ...s, [certId]: false })) }
  }

  async function selectCert(certId) {
    if (selected === certId) return
    setSelected(certId)
    const res = await api({ action:'get_status', user_id:user.id, cert_id:certId })
    setHistory(res.checks || [])
  }

  const selCert  = certs.find(c => c.id === selected)
  const selCheck = checks[selected]
  const hasAgent = !!agents[selected]
  const bs       = selCheck?.binding_status || selCert?.certbind_status || 'pending'
  const isBound  = bs === 'bound'
  const isBad    = ['key_mismatch','cert_mismatch','chain_anomaly'].includes(bs)
  const noAgent  = !hasAgent

  const bound  = certs.filter(c => (checks[c.id]?.binding_status||c.certbind_status)==='bound').length
  const issues = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly'].includes(checks[c.id]?.binding_status||c.certbind_status)).length

  return (
    <div style={{ fontFamily:F, color:C.heading, minHeight:'100vh', background:C.bg }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes cbpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {loading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.9)',
          display:'flex', flexDirection:'column', gap:12, alignItems:'center',
          justifyContent:'center', zIndex:999 }}>
          <div style={{ width:24, height:24, border:`2.5px solid ${C.teal}30`,
            borderTopColor:C.teal, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
        </div>
      )}

      <div style={{ padding:'28px 32px 80px' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <h1 style={{ fontSize:20, fontWeight:600, color:C.heading, letterSpacing:'-0.3px' }}>
                CertBind
              </h1>
              <span style={{ fontSize:10, fontWeight:600, color:'#991b1b', background:C.redBg,
                border:`1px solid ${C.redBd}`, borderRadius:4, padding:'2px 8px',
                fontFamily:MONO, letterSpacing:'0.05em' }}>INDUSTRY FIRST</span>
            </div>
            <p style={{ fontSize:13.5, color:C.body, maxWidth:540, lineHeight:1.75 }}>
              Every 5 minutes, SSLVault proves that your server is using the exact certificate and private key it should be — not just that a certificate exists.
            </p>
          </div>
          <button onClick={() => load(user)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
              cursor:'pointer', fontFamily:F, fontSize:12.5, color:C.body, transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background=C.bg3}
            onMouseLeave={e => e.currentTarget.style.background=C.bg}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
          {[
            { n:certs.length, label:'Certificates monitored', color:C.teal   },
            { n:bound,        label:'Verified & bound',       color:C.green  },
            { n:issues,       label:'Need attention',         color:issues>0?C.red:C.muted },
            { n:certs.filter(c => !agents[c.id]).length, label:'No agent installed', color:C.muted },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderTop:`3px solid ${s.color}`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:26, fontWeight:600, color:s.color, fontFamily:MONO,
                letterSpacing:'-1px', marginBottom:4 }}>{s.n}</div>
              <div style={{ fontSize:12, color:C.body }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── EMPTY ── */}
        {!loading && certs.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
            <div style={{ fontSize:36, marginBottom:16 }}>🔒</div>
            <div style={{ fontSize:15, fontWeight:500, color:C.heading, marginBottom:8 }}>No certificates to monitor</div>
            <div style={{ fontSize:13 }}>Issue a certificate to get started.</div>
          </div>
        )}

        {/* ── MAIN ── */}
        {certs.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, alignItems:'start' }}>

            {/* Cert list */}
            <div>
              <div style={{ fontSize:10.5, fontWeight:600, color:C.muted, letterSpacing:'0.07em',
                textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>
                Your certificates
              </div>
              {certs.map(cert => {
                const chk   = checks[cert.id]
                const bs    = chk?.binding_status || cert.certbind_status || 'pending'
                const st    = STATUS[bs] || STATUS.pending
                const isSel = selected === cert.id
                const hasAg = !!agents[cert.id]
                const isScan= !!scanning[cert.id]
                const good  = bs === 'bound'
                const bad   = ['key_mismatch','cert_mismatch','chain_anomaly'].includes(bs)

                return (
                  <div key={cert.id} onClick={() => selectCert(cert.id)}
                    style={{ background:isSel?(good?'#f0fdf4':bad?C.redBg:C.tealBg):C.bg,
                      border:`2px solid ${isSel?(good?C.greenBd:bad?C.redBd:C.tealBd):C.border}`,
                      borderRadius:10, padding:'14px 16px', cursor:'pointer',
                      marginBottom:8, transition:'all .15s' }}
                    onMouseEnter={e => { if(!isSel){ e.currentTarget.style.borderColor=C.teal } }}
                    onMouseLeave={e => { if(!isSel){ e.currentTarget.style.borderColor=C.border } }}>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:st.dot,
                          animation:bs==='pending'?'cbpulse 2s ease infinite':'none' }}/>
                        <span style={{ fontSize:13, fontWeight:500, color:C.heading, fontFamily:MONO }}>
                          {cert.domain}
                        </span>
                      </div>
                      <Badge status={bs}/>
                    </div>

                    <div style={{ fontSize:11.5, color:hasAg?C.green:C.muted,
                      display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%',
                        background:hasAg?C.green:C.muted }}/>
                      {hasAg ? 'Agent running on server' : 'No agent — limited checks available'}
                    </div>

                    <button onClick={e => runCheck(cert.id, e)} disabled={isScan}
                      style={{ display:'inline-flex', alignItems:'center', gap:6,
                        padding:'6px 14px', borderRadius:100,
                        background:isScan?C.bg3:C.green,
                        border:`1px solid ${isScan?C.border:'transparent'}`,
                        cursor:isScan?'default':'pointer', fontFamily:F,
                        fontSize:12, fontWeight:500, color:isScan?C.muted:'white',
                        transition:'all .15s' }}>
                      {isScan ? (
                        <><span style={{ width:10, height:10, border:`2px solid ${C.muted}30`,
                          borderTopColor:C.muted, borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Checking…</>
                      ) : (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg> Run check now</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Detail panel */}
            {selCert && (
              <div style={{ animation:'fadeIn .2s ease' }}>

                {/* Domain + last checked */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:10.5, color:C.muted, fontFamily:MONO,
                      textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>
                      Certificate details
                    </div>
                    <div style={{ fontSize:16, fontWeight:600, color:C.heading, fontFamily:MONO }}>
                      {selCert.domain}
                    </div>
                  </div>
                  {selCheck?.checked_at && (
                    <span style={{ fontSize:11.5, color:C.muted }}>
                      Last checked: {new Date(selCheck.checked_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* ── RESULT BANNER ── */}
                {isBound && (
                  <div style={{ background:'#f0fdf4', border:`1px solid ${C.greenBd}`,
                    borderRadius:10, padding:'16px 18px', marginBottom:16,
                    display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:C.green,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize:14.5, fontWeight:600, color:'#065f46', marginBottom:4 }}>
                        Everything checks out ✓
                      </div>
                      <div style={{ fontSize:13, color:'#0f6e56', lineHeight:1.7 }}>
                        The private key on your server, the certificate SSLVault issued, and the certificate your server sends to visitors are all verified to match. This is cryptographic proof of correct deployment.
                      </div>
                    </div>
                  </div>
                )}

                {isBad && (
                  <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`,
                    borderRadius:10, padding:'16px 18px', marginBottom:16,
                    display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:C.red,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize:14.5, fontWeight:600, color:'#991b1b', marginBottom:4 }}>
                        Action needed — mismatch detected
                      </div>
                      <div style={{ fontSize:13, color:'#991b1b', lineHeight:1.7 }}>
                        {bs === 'key_mismatch' && 'The private key on your server does not match the certificate. Re-install the certificate via SSLVault immediately.'}
                        {bs === 'cert_mismatch' && 'Your server is serving a different certificate than what SSLVault issued. Check your web server configuration.'}
                        {bs === 'chain_anomaly' && 'An unexpected CA is in your certificate chain. This may be an SSL inspection proxy. Review your network configuration.'}
                      </div>
                    </div>
                  </div>
                )}

                {!isBound && !isBad && noAgent && (
                  <div style={{ background:C.blueBg, border:`1px solid ${C.blueBd}`,
                    borderRadius:10, padding:'16px 18px', marginBottom:16,
                    display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:C.blue,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, flexShrink:0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#1e3a8a', marginBottom:4 }}>
                        Install the agent for full verification
                      </div>
                      <div style={{ fontSize:12.5, color:'#1d4ed8', lineHeight:1.7, marginBottom:10 }}>
                        The agent runs on your server and enables all 4 verification checks. It takes 30 seconds to install.
                      </div>
                      <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:7, padding:'8px 12px',
                        fontFamily:MONO, fontSize:11.5, color:'#1d4ed8', wordBreak:'break-all', lineHeight:1.7 }}>
                        curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash
                      </div>
                    </div>
                  </div>
                )}

                {!isBound && !isBad && !noAgent && (
                  <div style={{ background:C.tealBg, border:`1px solid ${C.tealBd}`,
                    borderRadius:10, padding:'14px 18px', marginBottom:16,
                    fontSize:13, color:'#0369a1', lineHeight:1.7 }}>
                    {bs === 'unreachable'
                      ? '⚠ Server did not respond on port 443. Check that your web server is running.'
                      : '⏳ Verification is running. The agent checks every 5 minutes — results will appear shortly.'}
                  </div>
                )}

                {/* ── 4 LAYERS ── */}
                <div style={{ fontSize:11, fontWeight:600, color:C.muted,
                  textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:MONO,
                  marginBottom:10 }}>
                  4 verification checks — click any to learn more
                </div>

                {LAYERS.map(l => <LayerCard key={l.key} cfg={l} check={selCheck}/>)}

                {/* History */}
                {history.length > 1 && (
                  <div style={{ marginTop:16, background:C.bg, border:`1px solid ${C.border}`,
                    borderRadius:10, overflow:'hidden' }}>
                    <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`,
                      fontSize:11.5, fontWeight:500, color:C.heading }}>
                      Check history
                    </div>
                    <div style={{ maxHeight:180, overflowY:'auto' }}>
                      {history.map((h, i) => {
                        const good = h.binding_status === 'bound'
                        const bad  = ['key_mismatch','cert_mismatch','chain_anomaly'].includes(h.binding_status)
                        return (
                          <div key={h.id} style={{ display:'flex', alignItems:'center', gap:12,
                            padding:'9px 16px', borderBottom:i<history.length-1?`1px solid ${C.bg3}`:'none',
                            background:i===0?C.bg2:C.bg }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                              background:good?C.green:bad?C.red:C.muted }}/>
                            <Badge status={h.binding_status}/>
                            <span style={{ flex:1, fontSize:11, color:C.muted, fontFamily:MONO }}>
                              K:{h.keybind_status==='pass'?'✓':h.keybind_status==='fail'?'✗':'—'}{' '}
                              T:{h.tls_status==='pass'?'✓':h.tls_status==='fail'?'✗':'—'}{' '}
                              C:{h.chain_status==='pass'?'✓':h.chain_status==='fail'?'✗':'—'}{' '}
                              N:{h.nodes_status==='pass'?'✓':h.nodes_status==='fail'?'✗':'—'}
                            </span>
                            <span style={{ fontSize:11.5, color:C.muted, whiteSpace:'nowrap' }}>
                              {new Date(h.checked_at).toLocaleString()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
