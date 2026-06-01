// ComplianceCentre.jsx - Unified: SLA Coverage + 47-Day Readiness
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, RefreshCw, FileText, Shield, AlertTriangle, Download } from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const MANDATES = [
  { year: 'Mar 2026', days: 200, col: '#f59e0b' },
  { year: 'Mar 2027', days: 100, col: '#f87171' },
  { year: 'Mar 2029', days: 47,  col: '#c0392b' },
]

function daysLeft(iso) {
  if (!iso) return 999
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
}
function validityDays(cert) {
  if (!cert.issued_at || !cert.expires_at) return null
  return Math.ceil((new Date(cert.expires_at) - new Date(cert.issued_at)) / 86400000)
}
function fmtDate(iso) {
  try { return iso ? new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A' } catch(e) { return 'N/A' }
}
function slaScoreCol(s) { return s >= 80 ? '#4ade80' : s >= 50 ? '#f59e0b' : '#c0392b' }
function slaScoreLbl(s) { return s >= 80 ? 'COMPLIANT' : s >= 50 ? 'AT RISK' : 'BREACH' }
function readinessScore(cert, hasDns) {
  var v = validityDays(cert)
  var checks = {
    auto_renew:   !!cert.auto_renew_enabled,
    dns_provider: hasDns || !!cert.dns_provider_id,
    install:      cert.install_method === 'agent' || cert.install_method === 'cpanel',
    validity_200: v !== null && v <= 200,
    key_secured:  !!cert.keylocker_key_id,
  }
  var score = (checks.auto_renew?30:0)+(checks.dns_provider?25:0)+(checks.install?20:0)+(checks.validity_200?15:0)+(checks.key_secured?10:0)
  var status = score >= 90 ? 'Ready' : score >= 60 ? 'At risk' : 'Will break'
  return { checks, score, status, validity: v }
}

function Tick({ ok }) {
  return ok
    ? <CheckCircle size={14} color="#4ade80" strokeWidth={2.5} style={{ flexShrink:0 }}/>
    : <XCircle size={14} color="rgba(255,255,255,0.18)" strokeWidth={2} style={{ flexShrink:0 }}/>
}

export default function ComplianceCentre({ nav }) {
  const [certs,    setCerts]    = useState([])
  const [slaStatus,setSlaStatus]= useState(null)
  const [reports,  setReports]  = useState([])
  const [hasDns,   setHasDns]   = useState(false)
  const [hasAgent, setHasAgent] = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [genLoad,  setGenLoad]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [tab,      setTab]      = useState('overview')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      var { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      var h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token }

      var [certsRes, dnsRes, agentRes, slaRes, rptRes] = await Promise.all([
        supabase.from('certificates').select('*').eq('status', 'active'),
        supabase.from('dns_credentials').select('id').limit(1),
        supabase.from('persistent_agents').select('id').eq('status', 'active').limit(1),
        fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'get_status' }) }).then(function(r) { return r.json() }),
        fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'get_reports' }) }).then(function(r) { return r.json() }),
      ])

      setCerts(certsRes.data || [])
      setHasDns(!!(dnsRes.data && dnsRes.data.length > 0))
      setHasAgent(!!(agentRes.data && agentRes.data.length > 0))
      setSlaStatus(slaRes)
      setReports(rptRes.reports || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function generateReport() {
    setGenLoad(true); setMsg('')
    try {
      var { data: { session } } = await supabase.auth.getSession()
      var h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token }
      var r = await fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'request_report' }) }).then(function(r) { return r.json() })
      setMsg(r.ok ? 'Report generated - check your email' : 'Error: ' + (r.error || 'unknown'))
      if (r.ok) load()
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenLoad(false)
  }

  // Styles
  var S = {
    page:  { position:'absolute', top:0, left:0, right:0, bottom:0, background:'#120000', overflowY:'auto', fontFamily:"'Segoe UI',system-ui,sans-serif" },
    inner: { maxWidth:980, margin:'0 auto', padding:'28px 24px' },
    card:  { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:10, padding:'14px 16px', marginBottom:12 },
    lbl:   { fontSize:10, fontWeight:700, color:'rgba(240,237,232,0.4)', textTransform:'uppercase', letterSpacing:'.1em', display:'block', marginBottom:8 },
    ttl:   { fontSize:13, fontWeight:600, color:'#f0ede8', marginBottom:3 },
    body:  { fontSize:12, color:'rgba(240,237,232,0.6)', lineHeight:1.6 },
    btn:   { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.35)', borderRadius:8, color:'#f0ede8', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Segoe UI',system-ui,sans-serif" },
    btnP:  { background:'#c0392b', border:'1px solid #c0392b', borderRadius:8, padding:'10px 24px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Segoe UI',system-ui,sans-serif" },
    tab:   function(active) { return { padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:'none', borderBottom: active ? '2px solid #c0392b' : '2px solid transparent', color: active ? '#fff' : 'rgba(240,237,232,0.45)', fontFamily:"'Segoe UI',system-ui,sans-serif" } },
    th:    { padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'rgba(240,237,232,0.4)', letterSpacing:'.08em', textTransform:'uppercase' },
  }

  if (loading) return (
    <div style={S.page}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, gap:10 }}>
        <RefreshCw size={16} color="#c0392b" />
        <span style={{ color:'rgba(240,237,232,0.5)', fontSize:13 }}>Loading compliance data...</span>
      </div>
    </div>
  )

  var hasSla = slaStatus && slaStatus.has_sla
  var slaScore = hasSla ? (slaStatus.compliance_score || 0) : null
  var sub = hasSla ? (slaStatus.sub || {}) : {}

  // Compute overall readiness
  var totalCerts = certs.length
  var readyCount = certs.filter(function(c) { return readinessScore(c, hasDns).score >= 90 }).length
  var overallPct = totalCerts > 0 ? Math.round((readyCount / totalCerts) * 100) : 0

  return (
    <div style={S.page}>
      <div style={S.inner}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <Shield size={20} color="#c0392b" />
              <span style={{ fontSize:20, fontWeight:700, color:'#f0ede8' }}>Compliance Centre</span>
              {hasSla && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(192,57,43,0.15)', color:'#c0392b', letterSpacing:'.06em' }}>
                  {(sub.plan||'').toUpperCase()} SLA
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:'rgba(240,237,232,0.4)' }}>47-Day CA/B Forum readiness + SLA compliance in one view</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {hasSla && (
              <button style={S.btn} onClick={generateReport} disabled={genLoad}>
                <FileText size={13} />
                {genLoad ? 'Generating...' : 'Generate report'}
              </button>
            )}
            {!hasSla && (
              <button style={S.btnP} onClick={function() { if (nav) nav('/pricing') }}>Upgrade to Premium SLA</button>
            )}
          </div>
        </div>

        {msg && (
          <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:8, padding:'10px 14px', color:'#4ade80', fontSize:12, marginBottom:16 }}>{msg}</div>
        )}

        {/* Top stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          <div style={Object.assign({}, S.card, { textAlign:'center' })}>
            <div style={{ fontSize:38, fontWeight:900, color: overallPct >= 80 ? '#4ade80' : overallPct >= 50 ? '#f59e0b' : '#c0392b', lineHeight:1 }}>{overallPct}%</div>
            <div style={{ fontSize:10, color:'rgba(240,237,232,0.4)', marginTop:4 }}>Mandate ready</div>
          </div>
          {hasSla ? (
            <div style={Object.assign({}, S.card, { textAlign:'center' })}>
              <div style={{ fontSize:38, fontWeight:900, color: slaScoreCol(slaScore), lineHeight:1 }}>{slaScore}</div>
              <div style={{ fontSize:10, fontWeight:700, color: slaScoreCol(slaScore), letterSpacing:'.06em', marginTop:4 }}>{slaScoreLbl(slaScore)}</div>
              <div style={{ fontSize:10, color:'rgba(240,237,232,0.3)', marginTop:2 }}>SLA score</div>
            </div>
          ) : (
            <div style={Object.assign({}, S.card, { textAlign:'center', opacity:.5 })}>
              <div style={{ fontSize:24, fontWeight:700, color:'rgba(240,237,232,0.3)', lineHeight:1 }}>--</div>
              <div style={{ fontSize:10, color:'rgba(240,237,232,0.3)', marginTop:4 }}>SLA not active</div>
            </div>
          )}
          <div style={S.card}>
            <span style={S.lbl}>Total certs</span>
            <div style={{ fontSize:32, fontWeight:800, color:'#f0ede8' }}>{totalCerts}</div>
          </div>
          <div style={S.card}>
            <span style={S.lbl}>Ready for 47d</span>
            <div style={{ fontSize:32, fontWeight:800, color: readyCount === totalCerts ? '#4ade80' : '#f59e0b' }}>{readyCount}/{totalCerts}</div>
          </div>
        </div>

        {/* Mandate timeline */}
        <div style={Object.assign({}, S.card, { marginBottom:20 })}>
          <span style={S.lbl}>CA/B Forum mandate timeline</span>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {MANDATES.map(function(m) {
              var daysUntil = Math.ceil((new Date(m.year).getTime() - Date.now()) / 86400000)
              var compliantCount = certs.filter(function(c) { var v = validityDays(c); return v !== null && v <= m.days }).length
              var allCompliant = totalCerts > 0 && compliantCount === totalCerts
              return (
                <div key={m.year} style={{ background: allCompliant ? 'rgba(74,222,128,0.06)' : 'rgba(192,57,43,0.06)', border:'1px solid ' + (allCompliant ? 'rgba(74,222,128,0.2)' : 'rgba(192,57,43,0.2)'), borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(240,237,232,0.4)', marginBottom:6 }}>{m.year} mandate</div>
                  <div style={{ fontSize:20, fontWeight:800, color:m.col, marginBottom:2 }}>{m.days} days max</div>
                  <div style={{ fontSize:11, color: allCompliant ? '#4ade80' : '#f87171', fontWeight:600 }}>
                    {allCompliant ? 'All certs compliant' : compliantCount + '/' + totalCerts + ' compliant'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(192,57,43,0.15)', marginBottom:16 }}>
          {['overview', 'readiness', 'reports'].map(function(t) {
            return <button key={t} style={S.tab(tab===t)} onClick={function() { setTab(t) }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          })}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div>
            <span style={S.lbl}>Certificate compliance overview</span>
            <div style={Object.assign({}, S.card, { padding:0, overflow:'hidden' })}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(192,57,43,0.08)' }}>
                    <th style={S.th}>Domain</th>
                    <th style={S.th}>Expires</th>
                    <th style={S.th}>Days left</th>
                    <th style={S.th}>Validity</th>
                    <th style={S.th}>47d ready</th>
                    <th style={S.th}>SLA status</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding:24, textAlign:'center', fontSize:13, color:'rgba(240,237,232,0.3)' }}>No active certificates</td></tr>
                  ) : certs.map(function(c) {
                    var dl = daysLeft(c.expires_at)
                    var dlCol = dl < 10 ? '#c0392b' : dl < 30 ? '#f59e0b' : '#4ade80'
                    var rs = readinessScore(c, hasDns)
                    var v = rs.validity
                    var nextMandateDays = MANDATES.slice().sort(function(a,b){return b.days-a.days}).find(function(m){return v===null||v>m.days})
                    var readyForAll = rs.score >= 90 && (v !== null && v <= 47)
                    return (
                      <tr key={c.id} style={{ borderTop:'1px solid rgba(192,57,43,0.1)' }}>
                        <td style={{ padding:'10px 14px', fontSize:13, color:'#f0ede8', fontFamily:'monospace' }}>{c.domain}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'rgba(240,237,232,0.5)' }}>{fmtDate(c.expires_at)}</td>
                        <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:dlCol }}>{Math.max(0,dl)}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'rgba(240,237,232,0.5)' }}>{v !== null ? v+'d' : 'N/A'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:(rs.score>=90?'rgba(74,222,128,0.12)':rs.score>=60?'rgba(251,191,36,0.12)':'rgba(248,113,113,0.12)'), color:(rs.score>=90?'#4ade80':rs.score>=60?'#fbbf24':'#f87171') }}>
                            {rs.status}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {hasSla
                            ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:'rgba(74,222,128,0.12)', color:'#4ade80' }}>COVERED</span>
                            : <span style={{ fontSize:10, color:'rgba(240,237,232,0.3)' }}>No SLA</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Readiness */}
        {tab === 'readiness' && (
          <div>
            {certs.length === 0 ? (
              <div style={S.card}><div style={{ textAlign:'center', padding:20, color:'rgba(240,237,232,0.3)', fontSize:13 }}>No active certificates to assess</div></div>
            ) : certs.map(function(c) {
              var rs = readinessScore(c, hasDns)
              var scoreCol = rs.score >= 90 ? '#4ade80' : rs.score >= 60 ? '#f59e0b' : '#f87171'
              var checks = [
                { key:'auto_renew',   label:'Auto-renewal enabled',         ok: rs.checks.auto_renew,   pts:30 },
                { key:'dns_provider', label:'DNS provider connected',        ok: rs.checks.dns_provider, pts:25 },
                { key:'install',      label:'Auto-install configured',       ok: rs.checks.install,      pts:20 },
                { key:'validity_200', label:'Validity <= 200d (2026 ready)', ok: rs.checks.validity_200, pts:15 },
                { key:'key_secured',  label:'Key secured in KeyLocker',      ok: rs.checks.key_secured,  pts:10 },
              ]
              return (
                <div key={c.id} style={Object.assign({}, S.card, { marginBottom:12 })}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#f0ede8', fontFamily:'monospace' }}>{c.domain}</div>
                      <div style={{ fontSize:11, color:'rgba(240,237,232,0.4)', marginTop:2 }}>Validity: {rs.validity !== null ? rs.validity+'d' : 'unknown'} - Expires: {fmtDate(c.expires_at)}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:28, fontWeight:800, color:scoreCol, lineHeight:1 }}>{rs.score}</div>
                      <div style={{ fontSize:10, color:scoreCol, fontWeight:700 }}>{rs.status}</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {checks.map(function(ch) {
                      return (
                        <div key={ch.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Tick ok={ch.ok} />
                          <span style={{ fontSize:12, color: ch.ok ? 'rgba(240,237,232,0.7)' : 'rgba(240,237,232,0.3)' }}>{ch.label}</span>
                          <span style={{ fontSize:10, color:'rgba(240,237,232,0.25)', marginLeft:'auto' }}>+{ch.pts}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                    {MANDATES.map(function(m) {
                      var compliant = rs.validity !== null && rs.validity <= m.days
                      return (
                        <span key={m.year} style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background: compliant ? 'rgba(74,222,128,0.1)' : 'rgba(192,57,43,0.1)', color: compliant ? '#4ade80' : '#c0392b', border:'1px solid ' + (compliant ? 'rgba(74,222,128,0.2)' : 'rgba(192,57,43,0.2)') }}>
                          {m.year}: {compliant ? 'Ready' : 'Not ready'}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab: Reports */}
        {tab === 'reports' && (
          <div>
            {!hasSla ? (
              <div style={Object.assign({}, S.card, { textAlign:'center', padding:'32px 20px' })}>
                <div style={{ fontSize:14, color:'rgba(240,237,232,0.5)', marginBottom:16 }}>Monthly compliance reports require SSLVault Premium SLA</div>
                <button style={S.btnP} onClick={function() { if (nav) nav('/pricing') }}>Upgrade to Premium</button>
              </div>
            ) : reports.length === 0 ? (
              <div style={S.card}>
                <div style={{ textAlign:'center', padding:16, color:'rgba(240,237,232,0.3)', fontSize:13 }}>No reports yet. Click Generate report above.</div>
              </div>
            ) : reports.map(function(r) {
              return (
                <div key={r.id} style={Object.assign({}, S.card, { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 })}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <FileText size={15} color="#c0392b" />
                    <div>
                      <div style={S.ttl}>Compliance Report - {r.report_month}</div>
                      <div style={S.body}>Score: <span style={{ color:slaScoreCol(r.compliance_score), fontWeight:600 }}>{r.compliance_score}/100</span> - {r.certs_covered} certs - {fmtDate(r.generated_at)}</div>
                    </div>
                  </div>
                  {r.report_url && (
                    <a href={r.report_url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#c0392b', textDecoration:'none', fontWeight:600, flexShrink:0 }}>
                      <Download size={13} /> View
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
