// CertBind.jsx — Active Certificate Binding Verification
// Industry-first: cryptographic proof that deployed key === issued cert, checked every 5 min
import { useState, useEffect, useCallback } from 'react'
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

// Status config
const STATUS = {
  bound:          { label:'Bound',          color:C.green,  bg:C.greenBg,  bd:C.greenBd,  icon:'✓', desc:'Cryptographic proof confirmed. Key ↔ cert ↔ TLS all match.' },
  key_mismatch:   { label:'Key Mismatch',   color:C.red,    bg:C.redBg,    bd:C.redBd,    icon:'⚠', desc:'Private key on server does not match issued certificate. Critical.' },
  cert_mismatch:  { label:'Cert Mismatch',  color:C.red,    bg:C.redBg,    bd:C.redBd,    icon:'⚠', desc:'Certificate served over TLS differs from certificate in inventory.' },
  chain_anomaly:  { label:'Chain Anomaly',  color:C.purple, bg:C.purpleBg, bd:C.purpleBd, icon:'⚠', desc:'Certificate chain contains unexpected intermediates. Possible SSL inspection proxy.' },
  partial_deploy: { label:'Partial Deploy', color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  icon:'◑', desc:'Some servers in load balancer pool have not received the new certificate.' },
  unreachable:    { label:'Unreachable',    color:C.amber,  bg:C.amberBg,  bd:C.amberBd,  icon:'−', desc:'TLS endpoint not reachable. Server may be down or port 443 closed.' },
  pending:        { label:'Pending',        color:C.teal,   bg:C.tealBg,   bd:C.tealBd,   icon:'○', desc:'Verification in progress.' },
}

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
      color:s.color, background:s.bg, border:`1px solid ${s.bd}`, borderRadius:100,
      padding:'3px 10px', fontFamily:MONO }}>
      {s.icon} {s.label}
    </span>
  )
}

function LayerRow({ label, status, detail, expected, actual }) {
  const pass = status === 'pass'
  const skip = status === 'skip' || status === 'pending' || !status
  const color = skip ? C.muted : pass ? C.green : C.red
  const icon = skip ? '○' : pass ? '✓' : '✗'
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:20, height:20, borderRadius:'50%', background:`${color}15`,
        border:`1.5px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:700, color, flexShrink:0, marginTop:1 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:3 }}>{label}</div>
        {detail && <div style={{ fontSize:12, color:C.body, marginBottom:4 }}>{detail}</div>}
        {(expected || actual) && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
            {expected && (
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.muted, width:60, flexShrink:0, marginTop:1 }}>EXPECTED</span>
                <code style={{ fontSize:10.5, color:C.green, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.6 }}>{expected}</code>
              </div>
            )}
            {actual && (
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.muted, width:60, flexShrink:0, marginTop:1 }}>ACTUAL</span>
                <code style={{ fontSize:10.5, color:pass?C.green:C.red, fontFamily:MONO, wordBreak:'break-all', lineHeight:1.6 }}>{actual}</code>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize:11, fontWeight:600, color, fontFamily:MONO, flexShrink:0 }}>{skip?'—':status?.toUpperCase()}</div>
    </div>
  )
}

export default function CertBind({ nav }) {
  const [user, setUser] = useState(null)
  const [certs, setCerts] = useState([])
  const [checks, setChecks] = useState({}) // cert_id -> latest check
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState({})
  const [agents, setAgents] = useState({}) // cert_id -> agent_id

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadData(session.user) }
      else setLoading(false)
    })
  }, [])

  async function callCertbind(body) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SB_URL}/functions/v1/certbind`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function loadData(u) {
    setLoading(true)
    const uid = u?.id || user?.id
    if (!uid) return

    // Load active certificates with PEM
    const { data: certRows } = await supabase
      .from('certificates')
      .select('id,domain,status,expires_at,issuer,certbind_status,certbind_checked_at,certbind_fp_expected,certbind_fp_actual,certbind_mismatch_at,install_server_id')
      .eq('user_id', uid)
      .in('status', ['active','issued'])
      .order('expires_at', { ascending:true })

    setCerts(certRows || [])

    // Load agents for each cert
    const agentMap = {}
    for (const c of (certRows || [])) {
      if (c.install_server_id) {
        const { data: srv } = await supabase
          .from('server_credentials')
          .select('agent_id')
          .eq('id', c.install_server_id)
          .single()
        if (srv?.agent_id) agentMap[c.id] = srv.agent_id
      }
    }
    setAgents(agentMap)

    // Load latest certbind checks
    const res = await callCertbind({ action:'get_status', user_id: uid })
    if (res.checks) {
      // Dedupe: latest check per cert
      const latestMap = {}
      for (const chk of res.checks) {
        if (!latestMap[chk.cert_id] ||
          new Date(chk.checked_at) > new Date(latestMap[chk.cert_id].checked_at)) {
          latestMap[chk.cert_id] = chk
        }
      }
      setChecks(latestMap)
    }
    setLoading(false)
  }

  async function triggerScan(certId) {
    if (!user) return
    setScanning(s => ({ ...s, [certId]: true }))
    try {
      await callCertbind({
        action: 'request_bind_check',
        user_id: user.id,
        cert_id: certId,
        agent_id: agents[certId] || null,
      })
      // Poll for result after 3s
      setTimeout(async () => {
        const res = await callCertbind({ action:'get_status', user_id:user.id, cert_id:certId })
        if (res.checks?.length > 0) {
          setChecks(prev => ({ ...prev, [certId]: res.checks[0] }))
          // Update cert status
          setCerts(prev => prev.map(c => c.id === certId
            ? { ...c, certbind_status: res.checks[0].binding_status, certbind_checked_at: res.checks[0].checked_at }
            : c
          ))
        }
        setScanning(s => ({ ...s, [certId]: false }))
      }, 4000)
    } catch {
      setScanning(s => ({ ...s, [certId]: false }))
    }
  }

  async function loadHistory(certId) {
    const res = await callCertbind({ action:'get_status', user_id:user.id, cert_id:certId })
    setHistory(res.checks || [])
    setSelected(certId)
  }

  const selectedCert = certs.find(c => c.id === selected)
  const selectedCheck = checks[selected]

  const bound = certs.filter(c => (checks[c.id]?.binding_status || c.certbind_status) === 'bound').length
  const mismatch = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly'].includes(checks[c.id]?.binding_status || c.certbind_status)).length
  const partial = certs.filter(c => (checks[c.id]?.binding_status || c.certbind_status) === 'partial_deploy').length
  const pending = certs.filter(c => !checks[c.id] || (checks[c.id]?.binding_status || c.certbind_status) === 'pending').length

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F, color:C.heading }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {loading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ width:28, height:28, border:`3px solid ${C.teal}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
        </div>
      )}

      {/* The CertBind page renders inside CLMHome sidebar nav, no separate nav needed */}
      <div style={{ padding:'clamp(24px,4vw,40px)' }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:C.tealBg, border:`1px solid ${C.tealBd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🔗</div>
            <div>
              <h1 style={{ fontSize:18, fontWeight:700, color:C.heading, letterSpacing:'-0.3px' }}>CertBind</h1>
              <div style={{ fontSize:11, color:C.muted, fontFamily:MONO }}>Active Certificate Binding Verification</div>
            </div>
          </div>
          <p style={{ fontSize:13.5, color:C.body, maxWidth:620, lineHeight:1.75, marginTop:10 }}>
            Continuously verifies that the private key deployed on each server cryptographically matches the certificate in inventory — and that the certificate being served over TLS matches what was issued. Runs every 5 minutes via the persistent agent.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:28 }}>
          {[
            { val:certs.length, label:'Certs tracked',   color:C.teal   },
            { val:bound,        label:'Fully bound',      color:C.green  },
            { val:mismatch,     label:'Mismatches',       color:mismatch>0?C.red:C.muted  },
            { val:partial,      label:'Partial deploy',   color:partial>0?C.amber:C.muted },
            { val:pending,      label:'Not yet checked',  color:C.muted  },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg, border:`1px solid ${C.border}`, borderTop:`2px solid ${s.color}`, borderRadius:9, padding:'14px 16px' }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:MONO, letterSpacing:'-0.5px' }}>{s.val}</div>
              <div style={{ fontSize:11.5, color:C.muted, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* How it works banner */}
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px', marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>4-Layer Verification Protocol</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
            {[
              { n:'01', label:'Key-Cert Binding Proof', color:C.teal,   desc:'Agent signs SSLVault nonce using deployed private key. We verify against cert public key. Proves the key on disk is paired with the issued cert — without transmitting the key.' },
              { n:'02', label:'Live TLS Fingerprint',   color:C.green,  desc:'SSLVault probes port 443 and computes SHA-256 of served certificate. Compared against fingerprint of issued cert. Detects silent cert swaps.' },
              { n:'03', label:'Chain Integrity',        color:C.purple, desc:'Full chain verified: leaf → intermediate → root. Unexpected intermediates (e.g. SSL inspection proxies like Palo Alto, Zscaler) flagged immediately.' },
              { n:'04', label:'Multi-Node Consistency', color:C.amber,  desc:'All IPs in the load balancer pool checked independently. Partial deployments — the #1 cause of PKI outages — detected within 5 minutes.' },
            ].map(l => (
              <div key={l.n} style={{ display:'flex', gap:10 }}>
                <div style={{ fontSize:10, fontWeight:800, color:l.color, fontFamily:MONO, width:20, flexShrink:0, marginTop:1 }}>{l.n}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.heading, marginBottom:3 }}>{l.label}</div>
                  <div style={{ fontSize:11.5, color:C.body, lineHeight:1.6 }}>{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {certs.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'48px', color:C.muted }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔗</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No active certificates</div>
            <div style={{ fontSize:13 }}>Issue your first certificate to start binding verification.</div>
          </div>
        )}

        {/* Two-panel layout */}
        {certs.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:16 }}>

            {/* Certificate list */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>
                Certificates — {certs.length} monitored
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {certs.map(cert => {
                  const chk = checks[cert.id]
                  const bs = chk?.binding_status || cert.certbind_status || 'pending'
                  const st = STATUS[bs] || STATUS.pending
                  const isSelected = selected === cert.id
                  const hasAgent = !!agents[cert.id]

                  return (
                    <div key={cert.id}
                      onClick={() => loadHistory(cert.id)}
                      style={{ background:isSelected?C.tealBg:C.bg, border:`1.5px solid ${isSelected?C.teal:C.border}`,
                        borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => { if(!isSelected){ e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.background=C.tealBg+'55' }}}
                      onMouseLeave={e => { if(!isSelected){ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.bg }}}>

                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:st.color, flexShrink:0,
                            boxShadow:['key_mismatch','cert_mismatch','chain_anomaly'].includes(bs)?`0 0 6px ${st.color}`:'none',
                            animation:bs==='pending'?'pulse 2s ease infinite':'none' }}/>
                          <span style={{ fontSize:13, fontWeight:600, color:C.heading, fontFamily:MONO }}>{cert.domain}</span>
                        </div>
                        <StatusPill status={bs}/>
                      </div>

                      <div style={{ display:'flex', gap:16, fontSize:11, color:C.muted, flexWrap:'wrap' }}>
                        {chk?.checked_at && (
                          <span>Last checked: {new Date(chk.checked_at).toLocaleTimeString()}</span>
                        )}
                        <span style={{ color:hasAgent?C.green:C.muted }}>
                          {hasAgent ? '● Agent connected' : '○ TLS probe only'}
                        </span>
                        {cert.certbind_fp_expected && (
                          <span>FP: {cert.certbind_fp_expected.slice(0,17)}…</span>
                        )}
                      </div>

                      <div style={{ marginTop:10, display:'flex', gap:8 }}>
                        <button
                          onClick={e => { e.stopPropagation(); triggerScan(cert.id) }}
                          disabled={!!scanning[cert.id]}
                          style={{ background:scanning[cert.id]?C.bg2:C.teal, border:'none', cursor:scanning[cert.id]?'not-allowed':'pointer',
                            fontFamily:F, fontSize:11, fontWeight:600, color:scanning[cert.id]?C.muted:'white',
                            padding:'5px 12px', borderRadius:100, transition:'all .15s',
                            display:'flex', alignItems:'center', gap:5 }}>
                          {scanning[cert.id]
                            ? <><span style={{ display:'inline-block', width:10, height:10, border:`1.5px solid ${C.muted}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> Scanning…</>
                            : '⟳ Run check'
                          }
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selected && selectedCert && (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO }}>
                    Verification detail — {selectedCert.domain}
                  </div>
                  <button onClick={() => { setSelected(null); setHistory([]) }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:C.muted, padding:'2px 6px' }}>×</button>
                </div>

                {/* Overall status card */}
                {selectedCheck && (
                  <div style={{ background:STATUS[selectedCheck.binding_status]?.bg || C.bg2,
                    border:`1px solid ${STATUS[selectedCheck.binding_status]?.bd || C.border}`,
                    borderRadius:10, padding:'16px', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <StatusPill status={selectedCheck.binding_status}/>
                      <span style={{ fontSize:11, color:C.muted, fontFamily:MONO }}>
                        {new Date(selectedCheck.checked_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>
                      {STATUS[selectedCheck.binding_status]?.desc}
                    </div>
                    {selectedCheck.binding_status === 'bound' && (
                      <div style={{ marginTop:8, fontSize:12, color:C.green, fontWeight:600 }}>
                        ✓ Cryptographic binding proof verified. This certificate is genuinely deployed and serving TLS.
                      </div>
                    )}
                  </div>
                )}

                {/* 4 verification layers */}
                <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px', marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.heading, marginBottom:12 }}>Verification layers</div>
                  {selectedCheck ? (
                    <>
                      <LayerRow
                        label="Layer 1 — Key-Cert Binding Proof"
                        status={selectedCheck.keybind_status}
                        detail="Agent signs nonce with deployed private key. Verified against cert public key."
                      />
                      <LayerRow
                        label="Layer 2 — Live TLS Fingerprint"
                        status={selectedCheck.tls_status}
                        detail={`Issuer on wire: ${selectedCheck.tls_served_issuer || '—'}`}
                        expected={selectedCheck.tls_expected_fp}
                        actual={selectedCheck.tls_actual_fp}
                      />
                      <LayerRow
                        label="Layer 3 — Chain Integrity"
                        status={selectedCheck.chain_status}
                        detail={selectedCheck.chain_anomaly_detail || (
                          selectedCheck.chain_status === 'pass' ? 'Full chain verified. No unexpected intermediates.' :
                          selectedCheck.chain_status === 'skip' ? 'Chain check requires agent.' : null
                        )}
                      />
                      <LayerRow
                        label="Layer 4 — Multi-Node Consistency"
                        status={selectedCheck.nodes_status}
                        detail={
                          selectedCheck.nodes_total > 0
                            ? `${selectedCheck.nodes_bound}/${selectedCheck.nodes_total} nodes serving correct certificate`
                            : 'Single server — no load balancer detected'
                        }
                      />
                    </>
                  ) : (
                    <div style={{ fontSize:13, color:C.muted, padding:'12px 0' }}>
                      No checks run yet. Click "Run check" to verify binding.
                    </div>
                  )}
                </div>

                {/* Check history */}
                {history.length > 0 && (
                  <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.heading, marginBottom:12 }}>Check history</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {history.slice(0,10).map((h, i) => (
                        <div key={h.id} style={{ display:'flex', alignItems:'center', gap:10,
                          padding:'8px 10px', background:i===0?C.bg2:C.bg,
                          border:`1px solid ${C.border}`, borderRadius:7 }}>
                          <span style={{ fontSize:11, color:STATUS[h.binding_status]?.color || C.muted, fontWeight:700, fontFamily:MONO, width:90 }}>
                            {STATUS[h.binding_status]?.icon} {STATUS[h.binding_status]?.label}
                          </span>
                          <span style={{ fontSize:10.5, color:C.body, fontFamily:MONO, flex:1 }}>
                            K:{h.keybind_status||'—'} T:{h.tls_status||'—'} C:{h.chain_status||'—'} N:{h.nodes_status||'—'}
                          </span>
                          <span style={{ fontSize:10.5, color:C.muted, fontFamily:MONO }}>
                            {new Date(h.checked_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* What makes this unique */}
        <div style={{ marginTop:32, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:'24px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Why CertBind is unique</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
            {[
              { label:'No other CLM does this', body:'Venafi, Keyfactor, and CertCentral trust their own database. None continuously verify that what they issued is what your server is actually serving — cryptographically, every 5 minutes.' },
              { label:'Partial deployments caught', body:'The #1 cause of PKI outages. When cert is updated on 3 of 7 load balancer nodes, CertBind flags partial_deploy within 5 minutes. No more silent failures.' },
              { label:'SSL inspection detection', body:'Enterprise proxy appliances (Palo Alto, Zscaler, Forcepoint) silently replace your cert chain. CertBind detects unexpected intermediates and alerts your security team.' },
              { label:'PCI-DSS 4.0 & NIST SP 800-57', body:'PCI-DSS 4.0 requires continuous cert monitoring in CDE environments. NIST SP 800-57 requires key-cert binding verification. CertBind is the only tool that does both automatically.' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:5 }}>{item.label}</div>
                <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
