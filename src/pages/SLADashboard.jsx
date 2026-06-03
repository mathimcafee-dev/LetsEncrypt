import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function daysLeft(iso) {
  if (!iso) return 999
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
}
function scoreCol(s) { return s >= 80 ? '#4ade80' : s >= 50 ? '#f59e0b' : '#1f5c4e' }
function certCol(d)  { return d < 10 ? '#1f5c4e' : d < 30 ? '#f59e0b' : '#4ade80' }
function certLbl(d)  { return d < 0 ? 'EXPIRED' : d < 10 ? 'CRITICAL' : d < 30 ? 'WARNING' : 'HEALTHY' }
function fmtDate(iso) {
  try { return iso ? new Date(iso).toLocaleDateString('en-GB') : 'N/A' } catch(e) { return 'N/A' }
}

export default function SLADashboard({ nav }) {
  const [status,  setStatus]  = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [genLoad, setGenLoad] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErr('Not logged in'); setLoading(false); return }
      const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token }
      const s = await fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'get_status' }) }).then(function(r) { return r.json() })
      setStatus(s)
      if (s && s.has_sla) {
        const r = await fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'get_reports' }) }).then(function(r) { return r.json() })
        setReports(r.reports || [])
      }
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  async function genReport() {
    setGenLoad(true); setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token }
      const r = await fetch(SB_URL + '/functions/v1/sla-manage', { method: 'POST', headers: h, body: JSON.stringify({ action: 'request_report' }) }).then(function(r) { return r.json() })
      setMsg(r.ok ? 'Report generated - check your email' : ('Error: ' + (r.error || 'unknown')))
      if (r.ok) load()
    } catch(e) { setMsg('Error: ' + e.message) }
    setGenLoad(false)
  }

  var S = {
    page: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#120000', overflowY: 'auto', padding: '28px 24px', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    card: { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 },
    lbl:  { fontSize: 10, fontWeight: 700, color: 'rgba(240,237,232,0.4)', textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: 6 },
    ttl:  { fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 3 },
    sub:  { fontSize: 12, color: 'rgba(240,237,232,0.6)', lineHeight: 1.6 },
    btn:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 8, color: '#f0ede8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    btnP: { background: '#1f5c4e', border: '1px solid #2a6b5c', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Segoe UI',system-ui,sans-serif" },
  }

  if (loading) return (
    <div style={S.page}>
      <div style={{ color: 'rgba(240,237,232,0.5)', fontSize: 14 }}>Loading SLA status...</div>
    </div>
  )

  if (err) return (
    <div style={S.page}>
      <div style={{ background: 'rgba(31,92,78,0.08)', border: '1px solid rgba(31,92,78,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>Error: {err}</div>
      <button style={S.btn} onClick={load}>Retry</button>
    </div>
  )

  if (!status || !status.has_sla) return (
    <div style={S.page}>
      <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 12 }}>SLA Coverage not active</div>
        <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.6)', lineHeight: 1.75, marginBottom: 28 }}>Upgrade to SSLVault Premium to get the 47-Day compliance guarantee, monthly audit reports, and escalation alerts.</div>
        <button style={S.btnP} onClick={function() { if (nav) nav('/pricing') }}>View Premium plans</button>
        <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(240,237,232,0.3)' }}>Plans from $999/year - Contact us to activate</div>
      </div>
    </div>
  )

  var score = status.compliance_score || 0
  var certs = status.certs || []
  var sub   = status.sub || {}
  var col   = scoreCol(score)

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>SLA Coverage</div>
            <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.4)' }}>
              Plan: <span style={{ color: '#1f5c4e', fontWeight: 600 }}>{(sub.plan || 'active').toUpperCase()}</span>
              {' - '}{sub.domain_limit || 0} domains covered
            </div>
          </div>
          <button style={S.btn} onClick={genReport} disabled={genLoad}>
            {genLoad ? 'Generating...' : 'Generate report'}
          </button>
        </div>

        {msg && (
          <div style={{ background: 'rgba(22,160,104,0.07)', border: '1px solid rgba(22,160,104,0.22)', borderRadius: 8, padding: '10px 14px', color: '#16a068', fontSize: 12, marginBottom: 16 }}>{msg}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          <div style={Object.assign({}, S.card, { textAlign: 'center' })}>
            <div style={{ fontSize: 40, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: col, letterSpacing: '.08em', marginTop: 4 }}>
              {score >= 80 ? 'COMPLIANT' : score >= 50 ? 'AT RISK' : 'BREACH'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.3)', marginTop: 3 }}>compliance score</div>
          </div>
          <div style={S.card}>
            <span style={S.lbl}>Total certs</span>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f0ede8' }}>{status.total_certs || 0}</div>
          </div>
          <div style={S.card}>
            <span style={S.lbl}>Expiring 30d</span>
            <div style={{ fontSize: 28, fontWeight: 800, color: (status.expiring_30d || 0) > 0 ? '#f59e0b' : '#4ade80' }}>{status.expiring_30d || 0}</div>
          </div>
          <div style={S.card}>
            <span style={S.lbl}>Critical 10d</span>
            <div style={{ fontSize: 28, fontWeight: 800, color: (status.expiring_10d || 0) > 0 ? '#1f5c4e' : '#4ade80' }}>{status.expiring_10d || 0}</div>
          </div>
        </div>

        <span style={S.lbl}>Certificate Coverage</span>
        <div style={Object.assign({}, S.card, { padding: 0, overflow: 'hidden' })}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(31,92,78,0.07)' }}>
                {['Domain', 'Expires', 'Days left', 'Status'].map(function(h) {
                  return <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(240,237,232,0.4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {certs.length === 0
                ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(240,237,232,0.3)' }}>No active certificates</td></tr>
                : certs.map(function(c) {
                  var dl = daysLeft(c.expires_at)
                  var cc = certCol(dl)
                  return (
                    <tr key={c.id || c.domain} style={{ borderTop: '1px solid rgba(31,92,78,0.08)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#f0ede8', fontFamily: 'monospace' }}>{c.domain}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(240,237,232,0.5)' }}>{fmtDate(c.expires_at)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: cc }}>{Math.max(0, dl)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: cc + '22', color: cc, letterSpacing: '.06em' }}>{certLbl(dl)}</span>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>

        <span style={Object.assign({}, S.lbl, { marginTop: 20, display: 'block' })}>Compliance Reports</span>
        {reports.length === 0
          ? <div style={S.card}><div style={{ fontSize: 13, color: 'rgba(240,237,232,0.3)', textAlign: 'center', padding: '8px 0' }}>No reports yet. Click Generate report above.</div></div>
          : reports.map(function(r) {
            return (
              <div key={r.id} style={Object.assign({}, S.card, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 })}>
                <div>
                  <div style={S.ttl}>Compliance Report - {r.report_month}</div>
                  <div style={S.sub}>Score: <span style={{ color: scoreCol(r.compliance_score), fontWeight: 600 }}>{r.compliance_score}/100</span> - {r.certs_covered} certs covered</div>
                </div>
                {r.report_url && (
                  <a href={r.report_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1f5c4e', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>View</a>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
