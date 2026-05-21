// CertBind.jsx — Active Certificate Binding Verification
// Industry-first: cryptographic proof that deployed key === issued cert
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const C = {
  bg:'#ffffff', bg2:'#f9fafb', bg3:'#f3f4f6',
  border:'#e5e7eb', border2:'#d1d5db',
  heading:'#0a0a0a', body:'#4b5563', muted:'#9ca3af',
  teal:'#0ea5e9', tealBg:'#f0f9ff', tealBd:'#bae6fd',
  green:'#10b981', greenBg:'#f0fdf4', greenBd:'#bbf7d0',
  purple:'#7c3aed', purpleBg:'#faf5ff', purpleBd:'#ddd6fe',
  amber:'#d97706', amberBg:'#fffbeb', amberBd:'#fde68a',
  red:'#dc2626', redBg:'#fef2f2', redBd:'#fecaca',
  ink:'#080c14',
}

const STATUS = {
  bound:          { label:'Bound',           color:C.green,  bg:C.greenBg,  bd:C.greenBd,  dot:'#10b981', icon:'✓', desc:'Cryptographic binding proof confirmed. Private key ↔ certificate ↔ live TLS all verified.' },
  key_mismatch:   { label:'Key Mismatch',    color:C.red,    bg:C.redBg,    bd:C.redBd,    dot:C.red,     icon:'✗', desc:'Private key on server does NOT match the issued certificate. Critical — re-install immediately.' },
  cert_mismatch:  { label:'Cert Mismatch',   color:C.red,    bg:C.redBg,    bd:C.redBd,    dot:C.red,     icon:'✗', desc:'Certificate served over TLS differs from the certificate in inventory. Possible silent swap.' },
  chain_anomaly:  { label:'Chain Anomaly',   color:C.purple, bg:C.purpleBg, bd:C.purpleBd, dot:C.purple,  icon:'⚠', desc:'Unexpected intermediate CA detected. Possible SSL inspection proxy (Palo Alto, Zscaler).' },
  partial_deploy: { label:'Partial Deploy',  color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  dot:C.amber,   icon:'◑', desc:'Some load balancer nodes have not received the updated certificate.' },
  unreachable:    { label:'Unreachable',     color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  dot:C.amber,   icon:'−', desc:'TLS endpoint not responding. Server may be down or port 443 closed.' },
  pending:        { label:'Pending',         color:C.teal,   bg:C.tealBg,   bd:C.tealBd,   dot:C.teal,    icon:'○', desc:'Awaiting verification from persistent agent.' },
}

const LAYERS = [
  { key:'keybind', n:'01', label:'Key-Cert Binding Proof',  color:C.teal,
    desc:'Agent signs SSLVault nonce with deployed private key via HMAC-SHA256. Edge verifies against cert public key. Cryptographic proof without transmitting the key.',
    requiresAgent: true },
  { key:'tls',     n:'02', label:'Live TLS Fingerprint',    color:C.green,
    desc:'Agent runs openssl s_client against port 443. SHA-256 of served certificate compared against fingerprint of issued cert. Detects silent swaps.',
    requiresAgent: true },
  { key:'chain',   n:'03', label:'Chain Integrity',         color:C.purple,
    desc:'Full certificate chain verified leaf → intermediate → root. Unexpected intermediates flagged — detects SSL inspection proxies inserting their own CA.',
    requiresAgent: true },
  { key:'nodes',   n:'04', label:'Multi-Node Consistency',  color:C.amber,
    desc:'All IPs in the load balancer pool checked independently. Partial deployments — the #1 cause of PKI outages — detected within 5 minutes.',
    requiresAgent: true },
]

function Pill({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
      color:s.color, background:s.bg, border:`1px solid ${s.bd}`,
      borderRadius:100, padding:'3px 11px', fontFamily:MONO, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  )
}

function LayerBadge({ status }) {
  const pass = status === 'pass'
  const fail = status === 'fail'
  const skip = !status || status === 'skip' || status === 'pending'
  const color = pass ? C.green : fail ? C.red : C.muted
  const bg = pass ? C.greenBg : fail ? C.redBg : C.bg3
  const label = pass ? 'PASS' : fail ? 'FAIL' : status === 'pending' ? 'PENDING' : 'SKIP'
  return (
    <span style={{ fontSize:9.5, fontWeight:800, color, background:bg,
      border:`1px solid ${color}30`, borderRadius:4, padding:'2px 7px',
      fontFamily:MONO, letterSpacing:'0.04em' }}>{label}</span>
  )
}

function Spinner({ size = 16, color = C.teal }) {
  return (
    <span style={{ display:'inline-block', width:size, height:size,
      border:`2px solid ${color}30`, borderTopColor:color,
      borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}/>
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
  const pollRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadData(session.user) }
      else setLoading(false)
    })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function callCertbind(body) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SB_URL}/functions/v1/certbind`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function loadData(u) {
    setLoading(true)
    const uid = u?.id || user?.id
    if (!uid) { setLoading(false); return }

    const { data: certRows } = await supabase
      .from('certificates')
      .select('id,domain,status,expires_at,issuer,certbind_status,certbind_checked_at,certbind_fp_expected,certbind_fp_actual,certbind_mismatch_at,install_server_id')
      .eq('user_id', uid)
      .in('status', ['active','issued'])
      .order('expires_at', { ascending:true })

    setCerts(certRows || [])

    const agentMap = {}
    for (const c of (certRows || [])) {
      if (c.install_server_id) {
        const { data: srv } = await supabase
          .from('server_credentials').select('agent_id')
          .eq('id', c.install_server_id).single()
        if (srv?.agent_id) agentMap[c.id] = srv.agent_id
      }
    }
    setAgents(agentMap)

    await refreshChecks(uid)
    setLoading(false)
  }

  async function refreshChecks(uid) {
    const res = await callCertbind({ action:'get_status', user_id: uid || user?.id })
    if (res.checks) {
      const map = {}
      for (const chk of res.checks) {
        if (!map[chk.cert_id] || new Date(chk.checked_at) > new Date(map[chk.cert_id].checked_at))
          map[chk.cert_id] = chk
      }
      setChecks(map)
    }
  }

  async function triggerScan(certId, e) {
    e?.stopPropagation()
    if (!user || scanning[certId]) return
    setScanning(s => ({ ...s, [certId]: true }))
    try {
      await callCertbind({
        action:'request_bind_check',
        user_id: user.id,
        cert_id: certId,
        agent_id: agents[certId] || null,
      })
      // Poll 3 times at 3s, 6s, 12s for agent result
      let attempt = 0
      const poll = setInterval(async () => {
        attempt++
        const res = await callCertbind({ action:'get_status', user_id:user.id, cert_id:certId })
        if (res.checks?.length > 0) {
          const latest = res.checks[0]
          setChecks(prev => ({ ...prev, [certId]: latest }))
          setCerts(prev => prev.map(c => c.id === certId
            ? { ...c, certbind_status: latest.binding_status, certbind_checked_at: latest.checked_at } : c))
          if (selected === certId) setHistory(res.checks)
        }
        if (attempt >= 3) {
          clearInterval(poll)
          setScanning(s => ({ ...s, [certId]: false }))
        }
      }, 4000)
    } catch {
      setScanning(s => ({ ...s, [certId]: false }))
    }
  }

  async function selectCert(certId) {
    if (selected === certId) { setSelected(null); setHistory([]); return }
    setSelected(certId)
    const res = await callCertbind({ action:'get_status', user_id:user.id, cert_id:certId })
    setHistory(res.checks || [])
  }

  const selCert  = certs.find(c => c.id === selected)
  const selCheck = checks[selected]

  const stats = {
    total:   certs.length,
    bound:   certs.filter(c => (checks[c.id]?.binding_status||c.certbind_status) === 'bound').length,
    issues:  certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly'].includes(checks[c.id]?.binding_status||c.certbind_status)).length,
    partial: certs.filter(c => (checks[c.id]?.binding_status||c.certbind_status) === 'partial_deploy').length,
    pending: certs.filter(c => !checks[c.id] || ['pending','unreachable'].includes(checks[c.id]?.binding_status||c.certbind_status||'pending')).length,
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F, color:C.heading }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .cb-cert-row:hover { border-color: ${C.teal} !important; background: ${C.tealBg} !important; }
        .cb-run-btn:hover { background: ${C.tealDk||'#0284c7'} !important; }
        .cb-refresh:hover { background: ${C.bg3} !important; }
      `}</style>

      {loading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.85)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, flexDirection:'column', gap:12 }}>
          <Spinner size={28}/>
          <span style={{ fontSize:12, color:C.muted, fontFamily:MONO }}>Loading CertBind…</span>
        </div>
      )}

      <div style={{ padding:'32px 32px 60px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg, #0ea5e920, #0ea5e908)', border:`1px solid ${C.tealBd}`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <h1 style={{ fontSize:17, fontWeight:700, color:C.heading, letterSpacing:'-0.3px' }}>CertBind</h1>
                  <span style={{ fontSize:9.5, fontWeight:800, color:C.red, background:C.redBg,
                    border:`1px solid ${C.redBd}`, borderRadius:4, padding:'2px 7px', fontFamily:MONO, letterSpacing:'0.05em' }}>
                    INDUSTRY FIRST
                  </span>
                </div>
                <div style={{ fontSize:11, color:C.muted, fontFamily:MONO, marginTop:1 }}>Active Certificate Binding Verification</div>
              </div>
            </div>
            <p style={{ fontSize:13, color:C.body, maxWidth:580, lineHeight:1.75 }}>
              Cryptographic proof that the private key deployed on your server matches the certificate in inventory — and that the certificate served over TLS matches what was issued. Runs every 5 minutes via the persistent agent.
            </p>
          </div>
          <button onClick={() => loadData(user)} className="cb-refresh"
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
              background:C.bg, border:`1px solid ${C.border}`, borderRadius:8,
              cursor:'pointer', fontFamily:F, fontSize:12, color:C.body, transition:'background .15s' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:24 }}>
          {[
            { val:stats.total,   label:'Monitored',    color:C.teal,                         sub:'certificates' },
            { val:stats.bound,   label:'Fully bound',  color:C.green,                         sub:'cryptographically proven' },
            { val:stats.issues,  label:'Critical',     color:stats.issues>0?C.red:C.muted,   sub:'key or cert mismatch' },
            { val:stats.partial, label:'Partial',      color:stats.partial>0?C.amber:C.muted, sub:'incomplete deployment' },
            { val:stats.pending, label:'Pending',      color:C.muted,                         sub:'awaiting check' },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg, border:`1px solid ${C.border}`,
              borderTop:`2.5px solid ${s.color}`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:MONO, letterSpacing:'-1px', lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:12, fontWeight:600, color:C.heading, marginTop:5 }}>{s.label}</div>
              <div style={{ fontSize:10.5, color:C.muted, marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── 4-LAYER PROTOCOL STRIP ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0,
          border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', marginBottom:24 }}>
          {LAYERS.map((l, i) => (
            <div key={l.key} style={{ padding:'14px 16px',
              borderRight:i<3?`1px solid ${C.border}`:'none',
              background:C.bg2 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <div style={{ width:20, height:20, borderRadius:5, background:`${l.color}15`,
                  border:`1px solid ${l.color}30`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:9, fontWeight:800, color:l.color, fontFamily:MONO }}>
                  {l.n}
                </div>
                <span style={{ fontSize:11.5, fontWeight:600, color:C.heading }}>{l.label}</span>
              </div>
              <div style={{ fontSize:11, color:C.body, lineHeight:1.6 }}>{l.desc}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN PANEL ── */}
        {certs.length === 0 && !loading ? (
          <div style={{ textAlign:'center', padding:'64px 0', color:C.muted }}>
            <div style={{ width:48, height:48, borderRadius:12, background:C.tealBg, border:`1px solid ${C.tealBd}`,
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, marginBottom:6 }}>No active certificates</div>
            <div style={{ fontSize:13 }}>Issue a certificate to start binding verification.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:selected?'380px 1fr':'1fr', gap:16, alignItems:'start' }}>

            {/* ── CERT LIST ── */}
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.08em',
                textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>
                {certs.length} certificate{certs.length!==1?'s':''} monitored
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {certs.map(cert => {
                  const chk   = checks[cert.id]
                  const bs    = chk?.binding_status || cert.certbind_status || 'pending'
                  const st    = STATUS[bs] || STATUS.pending
                  const isSel = selected === cert.id
                  const hasAg = !!agents[cert.id]
                  const isScan = !!scanning[cert.id]
                  const isCritical = ['key_mismatch','cert_mismatch','chain_anomaly'].includes(bs)

                  return (
                    <div key={cert.id} className={isSel?'':'cb-cert-row'}
                      onClick={() => selectCert(cert.id)}
                      style={{ background:isSel?C.tealBg:C.bg,
                        border:`1.5px solid ${isSel?C.teal:isCritical?C.redBd:C.border}`,
                        borderRadius:10, padding:'14px 16px', cursor:'pointer',
                        transition:'all .15s', animation:'slideIn .2s ease' }}>

                      {/* Top row */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:st.dot,
                            flexShrink:0, boxShadow:isCritical?`0 0 0 3px ${st.dot}22`:'none',
                            animation:bs==='pending'?'pulse 2s ease infinite':
                              isCritical?'pulse .8s ease infinite':'none' }}/>
                          <span style={{ fontSize:13, fontWeight:600, color:C.heading,
                            fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {cert.domain}
                          </span>
                        </div>
                        <Pill status={bs}/>
                      </div>

                      {/* Meta row */}
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:10 }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11,
                          color:hasAg?C.green:C.muted, fontFamily:MONO }}>
                          <span style={{ width:5, height:5, borderRadius:'50%',
                            background:hasAg?C.green:C.muted }}/>
                          {hasAg ? 'Agent connected' : 'No agent'}
                        </span>
                        {chk?.checked_at && (
                          <span style={{ fontSize:11, color:C.muted, fontFamily:MONO }}>
                            Checked {new Date(chk.checked_at).toLocaleTimeString()}
                          </span>
                        )}
                        {cert.certbind_fp_expected && (
                          <span style={{ fontSize:10.5, color:C.muted, fontFamily:MONO }}>
                            FP: {cert.certbind_fp_expected.slice(0,14)}…
                          </span>
                        )}
                      </div>

                      {/* Layer status mini row */}
                      {chk && (
                        <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                          {[
                            { k:'K', v:chk.keybind_status },
                            { k:'T', v:chk.tls_status },
                            { k:'C', v:chk.chain_status },
                            { k:'N', v:chk.nodes_status },
                          ].map(l => {
                            const pass = l.v === 'pass'
                            const fail = l.v === 'fail'
                            const color = pass?C.green:fail?C.red:C.muted
                            return (
                              <div key={l.k} style={{ display:'flex', alignItems:'center', gap:3,
                                padding:'3px 8px', background:`${color}10`,
                                border:`1px solid ${color}25`, borderRadius:5 }}>
                                <span style={{ fontSize:9, fontWeight:700, color, fontFamily:MONO }}>{l.k}</span>
                                <span style={{ fontSize:9, color, fontFamily:MONO }}>
                                  {pass?'✓':fail?'✗':'—'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Action */}
                      <button className="cb-run-btn"
                        onClick={e => triggerScan(cert.id, e)}
                        disabled={isScan}
                        style={{ display:'inline-flex', alignItems:'center', gap:6,
                          background:isScan?C.bg3:C.teal, border:`1px solid ${isScan?C.border:'transparent'}`,
                          cursor:isScan?'not-allowed':'pointer', fontFamily:F,
                          fontSize:11.5, fontWeight:600, color:isScan?C.muted:'white',
                          padding:'6px 14px', borderRadius:100, transition:'all .15s' }}>
                        {isScan ? <><Spinner size={11} color={C.muted}/> Scanning…</> : '⟳ Run check'}
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
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.08em',
                      textTransform:'uppercase', fontFamily:MONO, marginBottom:2 }}>
                      Verification detail
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:C.heading, fontFamily:MONO }}>
                      {selCert.domain}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setHistory([]) }}
                    style={{ width:28, height:28, borderRadius:6, background:C.bg2,
                      border:`1px solid ${C.border}`, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, color:C.muted, fontFamily:F }}>×</button>
                </div>

                {/* Overall status */}
                {selCheck ? (
                  <>
                    <div style={{ background:STATUS[selCheck.binding_status]?.bg||C.bg2,
                      border:`1px solid ${STATUS[selCheck.binding_status]?.bd||C.border}`,
                      borderRadius:10, padding:'16px 18px', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <Pill status={selCheck.binding_status}/>
                        <span style={{ fontSize:11, color:C.muted, fontFamily:MONO }}>
                          {new Date(selCheck.checked_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize:13, color:C.body, lineHeight:1.7 }}>
                        {STATUS[selCheck.binding_status]?.desc}
                      </div>
                      {selCheck.binding_status === 'bound' && (
                        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:7,
                          padding:'8px 12px', background:C.greenBg, border:`1px solid ${C.greenBd}`,
                          borderRadius:7 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke={C.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>
                            Full cryptographic binding proof verified — this certificate is genuinely deployed.
                          </span>
                        </div>
                      )}
                      {selCheck.details?.note && (
                        <div style={{ marginTop:10, padding:'8px 12px', background:C.amberBg,
                          border:`1px solid ${C.amberBd}`, borderRadius:7,
                          fontSize:12, color:C.amber, lineHeight:1.6 }}>
                          ⚠ {selCheck.details.note}
                        </div>
                      )}
                    </div>

                    {/* 4 layers */}
                    <div style={{ background:C.bg, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`,
                        display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.heading }}>Verification layers</div>
                        <div style={{ height:1, flex:1, background:C.border }}/>
                        <span style={{ fontSize:10, color:C.muted, fontFamily:MONO }}>
                          {selCheck.check_source === 'agent' ? '● Agent check' : '○ Edge probe'}
                        </span>
                      </div>
                      {LAYERS.map((l, i) => {
                        const statusKey = l.key === 'keybind' ? selCheck.keybind_status
                          : l.key === 'tls' ? selCheck.tls_status
                          : l.key === 'chain' ? selCheck.chain_status
                          : selCheck.nodes_status
                        const pass = statusKey === 'pass'
                        const fail = statusKey === 'fail'
                        const skip = !statusKey || statusKey === 'skip'
                        const pend = statusKey === 'pending'
                        const iconColor = pass?C.green:fail?C.red:C.muted

                        // Detail text per layer
                        let detail = ''
                        let extra = null
                        if (l.key === 'keybind') {
                          detail = pass ? 'HMAC-SHA256 signature verified. Private key on server is cryptographically paired with issued cert.'
                            : fail ? 'Signature mismatch — private key on server does NOT match issued certificate.'
                            : skip ? 'Requires persistent agent installed on server.'
                            : 'Awaiting agent response…'
                        }
                        if (l.key === 'tls') {
                          detail = selCheck.tls_served_issuer ? `Issuer on wire: ${selCheck.tls_served_issuer}` : l.desc
                          if (selCheck.tls_expected_fp || selCheck.tls_actual_fp) {
                            extra = (
                              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
                                {selCheck.tls_expected_fp && (
                                  <div style={{ display:'flex', gap:8 }}>
                                    <span style={{ fontSize:9.5, fontWeight:700, color:C.muted,
                                      width:58, flexShrink:0, fontFamily:MONO, marginTop:1 }}>EXPECTED</span>
                                    <code style={{ fontSize:10, color:C.green, fontFamily:MONO,
                                      wordBreak:'break-all', lineHeight:1.7 }}>{selCheck.tls_expected_fp}</code>
                                  </div>
                                )}
                                {selCheck.tls_actual_fp && (
                                  <div style={{ display:'flex', gap:8 }}>
                                    <span style={{ fontSize:9.5, fontWeight:700, color:C.muted,
                                      width:58, flexShrink:0, fontFamily:MONO, marginTop:1 }}>ACTUAL</span>
                                    <code style={{ fontSize:10, color:pass?C.green:C.red, fontFamily:MONO,
                                      wordBreak:'break-all', lineHeight:1.7 }}>{selCheck.tls_actual_fp}</code>
                                  </div>
                                )}
                              </div>
                            )
                          }
                        }
                        if (l.key === 'chain') {
                          detail = selCheck.chain_anomaly_detail || (
                            pass ? 'Full chain verified. No unexpected intermediates detected.' :
                            skip ? 'Requires persistent agent.' : 'Chain check pending.'
                          )
                        }
                        if (l.key === 'nodes') {
                          detail = selCheck.nodes_total > 0
                            ? `${selCheck.nodes_bound}/${selCheck.nodes_total} nodes serving correct certificate`
                            : skip ? 'Requires persistent agent.' : 'Single server — no load balancer.'
                        }

                        return (
                          <div key={l.key} style={{ padding:'14px 16px',
                            borderBottom:i<3?`1px solid ${C.border}`:'none',
                            background:fail?`${C.red}04`:pass?`${C.green}02`:C.bg }}>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                              {/* Layer icon */}
                              <div style={{ width:26, height:26, borderRadius:6, flexShrink:0, marginTop:1,
                                background:`${l.color}12`, border:`1.5px solid ${iconColor}30`,
                                display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {pend ? <Spinner size={12} color={l.color}/> : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke={iconColor} strokeWidth="2.5" strokeLinecap="round">
                                    {pass ? <path d="M20 6L9 17l-5-5"/> :
                                     fail ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> :
                                     <circle cx="12" cy="12" r="4"/>}
                                  </svg>
                                )}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                    <span style={{ fontSize:9.5, fontWeight:700, color:l.color,
                                      fontFamily:MONO }}>{l.n}</span>
                                    <span style={{ fontSize:12.5, fontWeight:600, color:C.heading }}>{l.label}</span>
                                  </div>
                                  <LayerBadge status={statusKey}/>
                                </div>
                                <div style={{ fontSize:12, color:C.body, lineHeight:1.65 }}>{detail}</div>
                                {extra}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Check history */}
                    {history.length > 1 && (
                      <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                        <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`,
                          fontSize:11, fontWeight:700, color:C.heading }}>
                          Check history
                        </div>
                        <div style={{ maxHeight:200, overflowY:'auto' }}>
                          {history.map((h, i) => {
                            const hs = STATUS[h.binding_status] || STATUS.pending
                            return (
                              <div key={h.id} style={{ display:'grid',
                                gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center',
                                padding:'9px 16px', borderBottom:i<history.length-1?`1px solid ${C.bg3}`:'none',
                                background:i===0?`${C.bg2}`:C.bg }}>
                                <Pill status={h.binding_status}/>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  {[
                                    ['K', h.keybind_status],
                                    ['T', h.tls_status],
                                    ['C', h.chain_status],
                                    ['N', h.nodes_status],
                                  ].map(([k, v]) => (
                                    <span key={k} style={{ fontSize:10, color:v==='pass'?C.green:v==='fail'?C.red:C.muted, fontFamily:MONO }}>
                                      {k}:{v==='pass'?'✓':v==='fail'?'✗':'—'}
                                    </span>
                                  ))}
                                </div>
                                <span style={{ fontSize:10.5, color:C.muted, fontFamily:MONO, whiteSpace:'nowrap' }}>
                                  {new Date(h.checked_at).toLocaleString()}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ background:C.bg2, border:`1px dashed ${C.border}`, borderRadius:10,
                    padding:'32px', textAlign:'center' }}>
                    <div style={{ fontSize:13, color:C.muted, marginBottom:12 }}>No checks run yet</div>
                    <button onClick={e => triggerScan(selected, e)}
                      style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F,
                        fontSize:12, fontWeight:600, color:'white', padding:'7px 18px', borderRadius:100 }}>
                      Run first check
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BOTTOM EXPLAINER ── */}
        <div style={{ marginTop:32, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
          gap:12, padding:'24px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.07em',
            textTransform:'uppercase', fontFamily:MONO, gridColumn:'1/-1', marginBottom:4 }}>
            Why CertBind is unique
          </div>
          {[
            { title:'No other CLM does this',
              body:'Venafi, Keyfactor, CertCentral — all trust their own database. None cryptographically verify that what they issued is what your server is actually serving, every 5 minutes.' },
            { title:'Catches what monitoring misses',
              body:'A cert can be valid, HTTPS green, CLM showing healthy — and your server still serving a mismatched key or a cert from a previous issuance. CertBind catches it.' },
            { title:'SSL inspection proxy detection',
              body:'Palo Alto, Zscaler, Forcepoint silently replace your cert chain. CertBind detects unexpected intermediate CAs and alerts your security team immediately.' },
            { title:'PCI-DSS 4.0 & NIST SP 800-57',
              body:'PCI-DSS 4.0 requires continuous cert monitoring in CDE. NIST SP 800-57 requires key-cert binding verification. CertBind is the only CLM tool that does both automatically.' },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize:12.5, fontWeight:600, color:C.heading, marginBottom:5 }}>{item.title}</div>
              <div style={{ fontSize:12, color:C.body, lineHeight:1.7 }}>{item.body}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
