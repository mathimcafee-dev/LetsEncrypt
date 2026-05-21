// CertBind.jsx v2 — Complete redesign
// Clean, visual, easy to understand at a glance
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
}

const STATUS_CFG = {
  bound:          { label:'Bound',          color:C.green,  bg:C.greenBg,  bd:C.greenBd,  glyph:'✓' },
  key_mismatch:   { label:'Key Mismatch',   color:C.red,    bg:C.redBg,    bd:C.redBd,    glyph:'✗' },
  cert_mismatch:  { label:'Cert Mismatch',  color:C.red,    bg:C.redBg,    bd:C.redBd,    glyph:'✗' },
  chain_anomaly:  { label:'Chain Anomaly',  color:C.purple, bg:C.purpleBg, bd:C.purpleBd, glyph:'!' },
  partial_deploy: { label:'Partial Deploy', color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  glyph:'◑' },
  unreachable:    { label:'Unreachable',    color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  glyph:'−' },
  pending:        { label:'Pending',        color:C.teal,   bg:C.tealBg,   bd:C.tealBd,   glyph:'○' },
  no_agent:       { label:'No Agent',       color:C.muted,  bg:C.bg3,      bd:C.border,   glyph:'?' },
}

const LAYER_CFG = [
  {
    key:'keybind', n:'01', icon:'🔑', title:'Key-Cert Binding Proof',
    color:C.teal,
    what:'Does the private key on your server match your certificate?',
    how:'Agent signs a random nonce with the deployed private key. SSLVault verifies the signature against the cert\'s public key. Cryptographic proof — key never leaves your server.',
    requiresAgent: true,
  },
  {
    key:'tls', n:'02', icon:'🔒', title:'Live TLS Fingerprint',
    color:C.green,
    what:'Is your server actually serving the correct certificate?',
    how:'Agent runs openssl s_client on port 443 and computes the SHA-256 fingerprint of the certificate being served. Compared against the fingerprint SSLVault issued.',
    requiresAgent: true,
  },
  {
    key:'chain', n:'03', icon:'⛓', title:'Chain Integrity',
    color:C.purple,
    what:'Is anything intercepting your TLS traffic?',
    how:'Full certificate chain verified (leaf → intermediate → root). Any unexpected intermediate CA — like an SSL inspection proxy — is flagged immediately.',
    requiresAgent: true,
  },
  {
    key:'nodes', n:'04', icon:'🌐', title:'Multi-Node Consistency',
    color:C.amber,
    what:'Are all your servers serving the same certificate?',
    how:'Every IP address your domain resolves to is checked independently. Partial deployments — where only some load balancer nodes got updated — are caught within 5 minutes.',
    requiresAgent: true,
  },
]

function StatusBadge({ status, large }) {
  const s = STATUS_CFG[status] || STATUS_CFG.pending
  const sz = large ? 13 : 11
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontSize:sz, fontWeight:700, color:s.color,
      background:s.bg, border:`1px solid ${s.bd}`,
      borderRadius:100, padding:large?'5px 14px':'3px 10px',
      fontFamily:MONO, whiteSpace:'nowrap',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  )
}

function LayerResult({ cfg, check }) {
  const [open, setOpen] = useState(false)
  const statusKey = cfg.key === 'keybind' ? check?.keybind_status
    : cfg.key === 'tls' ? check?.tls_status
    : cfg.key === 'chain' ? check?.chain_status
    : check?.nodes_status

  const pass = statusKey === 'pass'
  const fail = statusKey === 'fail'
  const skip = !statusKey || statusKey === 'skip'
  const pend = statusKey === 'pending'

  const color = pass ? C.green : fail ? C.red : skip ? C.muted : C.teal
  const bgCol = pass ? C.greenBg : fail ? C.redBg : skip ? C.bg2 : C.tealBg
  const bdCol = pass ? C.greenBd : fail ? C.redBd : skip ? C.border : C.tealBd
  const label = pass ? 'PASS' : fail ? 'FAIL' : skip ? 'SKIP' : 'WAIT'

  let result = ''
  if (cfg.key === 'keybind')
    result = pass ? 'HMAC-SHA256 signature verified — private key on server matches issued certificate.'
      : fail ? 'SIGNATURE MISMATCH — private key does not match certificate. Re-install immediately.'
      : skip ? 'Requires persistent agent installed on this server.'
      : 'Awaiting agent response…'

  if (cfg.key === 'tls') {
    result = pass ? `Certificate fingerprint matches — correct cert serving on port 443.`
      : fail ? 'Fingerprint mismatch — server is serving a DIFFERENT certificate than what was issued.'
      : skip ? 'Requires persistent agent.'
      : 'Agent probing port 443…'
  }
  if (cfg.key === 'chain')
    result = pass ? 'Full chain verified. No unexpected intermediates. No SSL inspection proxy detected.'
      : fail ? `Chain anomaly: ${check?.chain_anomaly_detail || 'unexpected intermediate CA detected'}`
      : skip ? 'Requires persistent agent.'
      : 'Checking chain…'
  if (cfg.key === 'nodes')
    result = check?.nodes_total > 0
      ? `${check.nodes_bound}/${check.nodes_total} nodes serving correct certificate.`
      : skip ? 'Requires persistent agent.'
      : 'Resolving IPs…'

  return (
    <div style={{
      border:`1px solid ${bdCol}`, borderRadius:10,
      background:bgCol, overflow:'hidden', transition:'all .15s',
    }}>
      {/* Header row */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', cursor:'pointer' }}>
        {/* Status icon */}
        <div style={{
          width:36, height:36, borderRadius:9, flexShrink:0,
          background:`${color}18`, border:`1.5px solid ${color}35`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {pend
            ? <span style={{ width:14, height:14, border:`2px solid ${color}`, borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/>
            : pass
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : fail
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <span style={{ fontSize:14, color }}>{cfg.icon}</span>
          }
        </div>

        {/* Title + result */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:10, fontWeight:700, color, fontFamily:MONO }}>{cfg.n}</span>
            <span style={{ fontSize:13.5, fontWeight:600, color:C.heading }}>{cfg.title}</span>
          </div>
          <div style={{ fontSize:12.5, color:pass?C.green:fail?C.red:C.body, lineHeight:1.5 }}>{result}</div>
        </div>

        {/* Badge + chevron */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{
            fontSize:10, fontWeight:800, color, background:`${color}15`,
            border:`1px solid ${color}30`, borderRadius:5, padding:'3px 9px', fontFamily:MONO,
          }}>{label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"
            style={{ transform:open?'rotate(90deg)':'none', transition:'transform .2s', flexShrink:0 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${bdCol}` }}>
          {/* What + How */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14, marginBottom:12 }}>
            <div style={{ background:'rgba(255,255,255,0.7)', border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:MONO, marginBottom:6 }}>What we check</div>
              <div style={{ fontSize:12.5, color:C.body, lineHeight:1.65 }}>{cfg.what}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.7)', border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:MONO, marginBottom:6 }}>How it works</div>
              <div style={{ fontSize:12.5, color:C.body, lineHeight:1.65 }}>{cfg.how}</div>
            </div>
          </div>

          {/* Fingerprints for TLS layer */}
          {cfg.key === 'tls' && (check?.tls_expected_fp || check?.tls_actual_fp) && (
            <div style={{ background:'#0d1117', borderRadius:8, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {check.tls_expected_fp && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', fontFamily:MONO, width:68, flexShrink:0, marginTop:1, textTransform:'uppercase' }}>Expected</span>
                  <code style={{ fontSize:10.5, color:C.green, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.7 }}>{check.tls_expected_fp}</code>
                </div>
              )}
              {check.tls_actual_fp && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', fontFamily:MONO, width:68, flexShrink:0, marginTop:1, textTransform:'uppercase' }}>Actual</span>
                  <code style={{ fontSize:10.5, color:pass?C.green:C.red, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.7 }}>{check.tls_actual_fp}</code>
                </div>
              )}
            </div>
          )}

          {/* Node list */}
          {cfg.key === 'nodes' && check?.nodes_checked?.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {check.nodes_checked.map((n, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px',
                  background:'rgba(255,255,255,0.7)', border:`1px solid ${C.border}`, borderRadius:7 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%',
                    background:n.status==='bound'?C.green:C.amber, flexShrink:0 }}/>
                  <code style={{ fontSize:11.5, color:C.heading, fontFamily:MONO, flex:1 }}>{n.ip}</code>
                  <span style={{ fontSize:10.5, fontWeight:700,
                    color:n.status==='bound'?C.green:C.amber, fontFamily:MONO }}>
                    {n.status==='bound'?'BOUND':'UNBOUND'}
                  </span>
                </div>
              ))}
            </div>
          )}
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
      .select('id,domain,status,expires_at,issuer,certbind_status,certbind_checked_at,certbind_fp_expected,certbind_fp_actual,certbind_mismatch_at,install_server_id')
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
          setCerts(p => p.map(c => c.id===certId ? { ...c, certbind_status:latest.binding_status, certbind_checked_at:latest.checked_at } : c))
          if (selected === certId) setHistory(res.checks)
        }
        if (attempts >= 4) { clearInterval(poll); setScanning(s => ({ ...s, [certId]: false })) }
      }, 4000)
    } catch { setScanning(s => ({ ...s, [certId]: false })) }
  }

  async function selectCert(certId) {
    if (selected === certId) { setSelected(null); setHistory([]); return }
    setSelected(certId)
    const res = await api({ action:'get_status', user_id:user.id, cert_id:certId })
    setHistory(res.checks || [])
  }

  const selCert  = certs.find(c => c.id === selected)
  const selCheck = checks[selected]
  const bound    = certs.filter(c => (checks[c.id]?.binding_status||c.certbind_status) === 'bound').length
  const issues   = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly'].includes(checks[c.id]?.binding_status||c.certbind_status)).length

  return (
    <div style={{ fontFamily:F, color:C.heading, minHeight:'100vh', background:C.bg }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>

      {loading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.9)', display:'flex',
          flexDirection:'column', gap:12, alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ width:28, height:28, border:`3px solid ${C.teal}30`, borderTopColor:C.teal,
            borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <span style={{ fontSize:12, color:C.muted, fontFamily:MONO }}>Loading…</span>
        </div>
      )}

      <div style={{ padding:'28px 32px 80px' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <h1 style={{ fontSize:20, fontWeight:700, color:C.heading, letterSpacing:'-0.4px' }}>CertBind</h1>
              <span style={{ fontSize:10, fontWeight:800, color:C.red, background:C.redBg,
                border:`1px solid ${C.redBd}`, borderRadius:4, padding:'2px 8px', fontFamily:MONO, letterSpacing:'0.05em' }}>
                INDUSTRY FIRST
              </span>
            </div>
            <p style={{ fontSize:13.5, color:C.body, maxWidth:560, lineHeight:1.75 }}>
              Cryptographic proof that your private key, certificate, and live TLS all match — checked every 5 minutes via the persistent agent. No other CLM vendor does this.
            </p>
          </div>
          <button onClick={() => load(user)} style={{ display:'flex', alignItems:'center', gap:6,
            padding:'8px 16px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
            cursor:'pointer', fontFamily:F, fontSize:13, color:C.body, transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background=C.bg3}
            onMouseLeave={e => e.currentTarget.style.background=C.bg}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── STATUS BAR ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
          {[
            { icon:'🔒', label:'Total monitored', val:certs.length, color:C.teal,    sub:'active certificates' },
            { icon:'✓',  label:'Fully bound',     val:bound,        color:C.green,   sub:'cryptographically proven' },
            { icon:'✗',  label:'Issues found',    val:issues,       color:issues>0?C.red:C.muted, sub:'require attention' },
            { icon:'○',  label:'Pending checks',  val:certs.length-bound-issues, color:C.muted, sub:'awaiting agent' },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderTop:`3px solid ${s.color}`, borderRadius:10, padding:'16px 18px' }}>
              <div style={{ fontSize:28, fontWeight:700, color:s.color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:4 }}>{s.val}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:C.heading }}>{s.label}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── EMPTY STATE ── */}
        {!loading && certs.length === 0 && (
          <div style={{ textAlign:'center', padding:'64px 0' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🔗</div>
            <div style={{ fontSize:16, fontWeight:600, color:C.heading, marginBottom:8 }}>No certificates to monitor</div>
            <div style={{ fontSize:14, color:C.muted }}>Issue a certificate and install the agent to start binding verification.</div>
          </div>
        )}

        {/* ── MAIN: LIST + DETAIL ── */}
        {certs.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:selected?'360px 1fr':'1fr', gap:20, alignItems:'start' }}>

            {/* ── CERT LIST ── */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.07em',
                textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>
                {certs.length} Certificate{certs.length!==1?'s':''}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {certs.map(cert => {
                  const chk    = checks[cert.id]
                  const bs     = chk?.binding_status || cert.certbind_status || 'pending'
                  const cfg    = STATUS_CFG[bs] || STATUS_CFG.pending
                  const isSel  = selected === cert.id
                  const hasAg  = !!agents[cert.id]
                  const isScan = !!scanning[cert.id]
                  const isBad  = ['key_mismatch','cert_mismatch','chain_anomaly'].includes(bs)
                  const isGood = bs === 'bound'

                  // Mini layer dots
                  const layers = chk ? [
                    { v:chk.keybind_status }, { v:chk.tls_status },
                    { v:chk.chain_status }, { v:chk.nodes_status }
                  ] : []

                  return (
                    <div key={cert.id}
                      onClick={() => selectCert(cert.id)}
                      style={{
                        background:isSel?C.tealBg:isBad?C.redBg:C.bg,
                        border:`2px solid ${isSel?C.teal:isBad?C.redBd:isGood?C.greenBd:C.border}`,
                        borderRadius:12, padding:'16px', cursor:'pointer',
                        transition:'all .15s', animation:'fadeUp .2s ease',
                        boxShadow:isSel?`0 0 0 3px ${C.teal}18`:isBad?`0 0 0 3px ${C.red}10`:'none',
                      }}
                      onMouseEnter={e => { if(!isSel&&!isBad) { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.background=C.tealBg } }}
                      onMouseLeave={e => { if(!isSel&&!isBad) { e.currentTarget.style.borderColor=isGood?C.greenBd:C.border; e.currentTarget.style.background=C.bg } }}>

                      {/* Domain + badge */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:9, height:9, borderRadius:'50%', background:cfg.color, flexShrink:0,
                            boxShadow:isGood?`0 0 0 3px ${C.green}25`:isBad?`0 0 0 3px ${C.red}25`:'none',
                            animation:bs==='pending'?'pulse 2s ease infinite':'none' }}/>
                          <span style={{ fontSize:14, fontWeight:600, color:C.heading, fontFamily:MONO }}>{cert.domain}</span>
                        </div>
                        <StatusBadge status={bs}/>
                      </div>

                      {/* Agent + time */}
                      <div style={{ display:'flex', gap:14, marginBottom:12 }}>
                        <span style={{ fontSize:11.5, color:hasAg?C.green:C.muted, display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:hasAg?C.green:C.muted }}/>
                          {hasAg ? 'Agent connected' : 'No agent — install for full check'}
                        </span>
                        {chk?.checked_at && (
                          <span style={{ fontSize:11.5, color:C.muted }}>
                            {new Date(chk.checked_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      {/* Layer dots */}
                      {layers.length > 0 && (
                        <div style={{ display:'flex', gap:5, marginBottom:12 }}>
                          {['K','T','C','N'].map((k, i) => {
                            const v = layers[i]?.v
                            const c = v==='pass'?C.green:v==='fail'?C.red:C.muted
                            return (
                              <div key={k} title={['Key-Cert','TLS FP','Chain','Nodes'][i]}
                                style={{ display:'flex', alignItems:'center', gap:3,
                                  padding:'3px 8px', background:`${c}12`,
                                  border:`1px solid ${c}28`, borderRadius:5, cursor:'help' }}>
                                <span style={{ fontSize:9.5, fontWeight:700, color:c, fontFamily:MONO }}>{k}</span>
                                <span style={{ fontSize:10, color:c }}>
                                  {v==='pass'?'✓':v==='fail'?'✗':'—'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Run check button */}
                      <button onClick={e => runCheck(cert.id, e)} disabled={isScan}
                        style={{ display:'inline-flex', alignItems:'center', gap:7,
                          padding:'7px 16px', borderRadius:100,
                          background:isScan?C.bg3:C.teal,
                          border:`1px solid ${isScan?C.border:'transparent'}`,
                          cursor:isScan?'default':'pointer', fontFamily:F,
                          fontSize:12, fontWeight:600, color:isScan?C.muted:'white',
                          transition:'all .15s' }}>
                        {isScan
                          ? <><span style={{ width:11, height:11, border:`2px solid ${C.muted}30`, borderTopColor:C.muted,
                              borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Scanning…</>
                          : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg> Run check</>
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── DETAIL PANEL ── */}
            {selected && selCert && (
              <div style={{ animation:'slideIn .2s ease' }}>

                {/* Panel header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.muted, fontFamily:MONO, textTransform:'uppercase',
                      letterSpacing:'0.07em', marginBottom:3 }}>Verification detail</div>
                    <div style={{ fontSize:16, fontWeight:700, color:C.heading, fontFamily:MONO }}>
                      {selCert.domain}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setHistory([]) }}
                    style={{ width:30, height:30, borderRadius:7, background:C.bg2,
                      border:`1px solid ${C.border}`, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, color:C.muted, fontFamily:F }}>×</button>
                </div>

                {/* Overall result banner */}
                {selCheck ? (() => {
                  const bs  = selCheck.binding_status
                  const cfg = STATUS_CFG[bs] || STATUS_CFG.pending
                  const isGood = bs === 'bound'
                  const isBad  = ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy'].includes(bs)
                  return (
                    <div style={{ background:cfg.bg, border:`2px solid ${cfg.bd}`,
                      borderRadius:12, padding:'18px 20px', marginBottom:16 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <StatusBadge status={bs} large/>
                        <span style={{ fontSize:11.5, color:C.muted, fontFamily:MONO }}>
                          {new Date(selCheck.checked_at).toLocaleString()}
                        </span>
                      </div>
                      {isGood && (
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:C.greenBg,
                            border:`1px solid ${C.greenBd}`, display:'flex', alignItems:'center',
                            justifyContent:'center', flexShrink:0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.green, marginBottom:3 }}>
                              Cryptographically verified
                            </div>
                            <div style={{ fontSize:13, color:C.body, lineHeight:1.65 }}>
                              The private key on your server, the certificate in SSLVault, and the certificate being served over TLS are all the same. This is genuine proof of correct deployment.
                            </div>
                          </div>
                        </div>
                      )}
                      {isBad && (
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:C.redBg,
                            border:`1px solid ${C.redBd}`, display:'flex', alignItems:'center',
                            justifyContent:'center', flexShrink:0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.red, marginBottom:3 }}>
                              Action required
                            </div>
                            <div style={{ fontSize:13, color:C.body, lineHeight:1.65 }}>
                              {bs === 'key_mismatch' && 'The private key on your server does not match the certificate. Re-install the certificate via SSLVault immediately.'}
                              {bs === 'cert_mismatch' && 'Your server is serving a different certificate than what SSLVault issued. Check your web server configuration.'}
                              {bs === 'chain_anomaly' && `An unexpected intermediate CA was detected. This may indicate an SSL inspection proxy on your network.`}
                              {bs === 'partial_deploy' && `Some servers in your load balancer pool did not receive the updated certificate.`}
                            </div>
                          </div>
                        </div>
                      )}
                      {!isGood && !isBad && (
                        <div style={{ fontSize:13, color:C.body }}>
                          {bs === 'pending' && (selCheck.details?.note || 'Waiting for the persistent agent to run the verification. Agent polls every 5 minutes.')}
                          {bs === 'unreachable' && 'TLS endpoint did not respond. Check that your web server is running and port 443 is open.'}
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div style={{ background:C.bg2, border:`1px dashed ${C.border}`, borderRadius:12,
                    padding:'32px', textAlign:'center', marginBottom:16 }}>
                    <div style={{ fontSize:14, color:C.muted, marginBottom:12 }}>No checks run yet</div>
                    <button onClick={e => runCheck(selected, e)}
                      style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F,
                        fontSize:13, fontWeight:600, color:'white', padding:'8px 20px', borderRadius:100 }}>
                      Run first check
                    </button>
                  </div>
                )}

                {/* 4 layers */}
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.07em',
                  textTransform:'uppercase', fontFamily:MONO, marginBottom:8 }}>
                  4 verification layers — click any to expand
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {LAYER_CFG.map(l => (
                    <LayerResult key={l.key} cfg={l} check={selCheck}/>
                  ))}
                </div>

                {/* History */}
                {history.length > 1 && (
                  <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                    <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`,
                      fontSize:11, fontWeight:700, color:C.heading }}>
                      Check history
                    </div>
                    <div style={{ maxHeight:220, overflowY:'auto' }}>
                      {history.map((h, i) => {
                        const cfg = STATUS_CFG[h.binding_status] || STATUS_CFG.pending
                        return (
                          <div key={h.id} style={{ display:'grid',
                            gridTemplateColumns:'130px 1fr auto', gap:12,
                            padding:'10px 16px', alignItems:'center',
                            borderBottom:i<history.length-1?`1px solid ${C.bg3}`:'none',
                            background:i===0?C.bg2:C.bg }}>
                            <StatusBadge status={h.binding_status}/>
                            <div style={{ display:'flex', gap:6 }}>
                              {[['K',h.keybind_status],['T',h.tls_status],['C',h.chain_status],['N',h.nodes_status]].map(([k,v]) => (
                                <span key={k} style={{ fontSize:10.5, color:v==='pass'?C.green:v==='fail'?C.red:C.muted, fontFamily:MONO }}>
                                  {k}:{v==='pass'?'✓':v==='fail'?'✗':'—'}
                                </span>
                              ))}
                            </div>
                            <span style={{ fontSize:11, color:C.muted, fontFamily:MONO, whiteSpace:'nowrap' }}>
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
