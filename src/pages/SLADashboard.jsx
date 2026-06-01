// SLADashboard.jsx v3
import { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, FileText, Download, RefreshCw, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const fmtDate = (iso) => {
  try { return iso ? format(new Date(iso), 'dd MMM yyyy') : 'N/A' } catch { return 'N/A' }
}

async function callSLA(action, extra) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(SB_URL + '/functions/v1/sla-manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify(Object.assign({ action }, extra || {})),
  })
  return res.json()
}

function daysLeft(iso) {
  if (!iso) return 999
  return differenceInDays(new Date(iso), new Date())
}

function certStatusColor(d) {
  if (d < 0)  return '#f87171'
  if (d < 10) return '#c0392b'
  if (d < 30) return '#f59e0b'
  return '#4ade80'
}

function certStatusLabel(d) {
  if (d < 0)  return 'EXPIRED'
  if (d < 10) return 'CRITICAL'
  if (d < 30) return 'WARNING'
  return 'HEALTHY'
}

function scoreColor(s) {
  if (s >= 80) return '#4ade80'
  if (s >= 50) return '#f59e0b'
  return '#c0392b'
}

function scoreLabel(s) {
  if (s >= 80) return 'COMPLIANT'
  if (s >= 50) return 'AT RISK'
  return 'BREACH'
}

export default function SLADashboard({ nav }) {
  const { user } = useAuth()

  const [status,  setStatus]  = useState(null)
  const [reports, setReports] = useState([])
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [genLoad, setGenLoad] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (user) { load() }
  }, [user])

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const s = await callSLA('get_status')
      setStatus(s)
      if (s && s.has_sla) {
        const r = await callSLA('get_reports')
        const a = await callSLA('get_alerts')
        setReports(r.reports || [])
        setAlerts(a.alerts   || [])
      }
    } catch (e) {
      setErr('Failed to load SLA status: ' + e.message)
    }
    setLoading(false)
  }

  async function generateReport() {
    setGenLoad(true)
    setMsg('')
    try {
      const r = await callSLA('request_report')
      setMsg(r.ok ? 'Report generated - check your email' : ('Error: ' + (r.error || 'unknown')))
      if (r.ok) { load() }
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setGenLoad(false)
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(192,57,43,0.2)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 12,
  }
  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(240,237,232,0.4)',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    marginBottom: 8,
    display: 'block',
  }
  const titleStyle  = { fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 3 }
  const bodyStyle   = { fontSize: 12, color: 'rgba(240,237,232,0.65)', lineHeight: 1.6 }

  if (!user || loading) {
    return (
      <div className="v2-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 10 }}>
        <RefreshCw size={16} style={{ color: '#c0392b' }} />
        <span style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13 }}>Loading...</span>
      </div>
    )
  }

  if (err) {
    return (
      <div className="v2-page" style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
        <div className="v2-alert v2-alert-error">{err}</div>
        <button className="v2-btn" onClick={load} style={{ marginTop: 12 }}>Retry</button>
      </div>
    )
  }

  if (!status || !status.has_sla) {
    return (
      <div className="v2-page" style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Star size={26} color="#c0392b" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 10 }}>SLA Coverage not active</div>
        <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.6)', lineHeight: 1.75, marginBottom: 28 }}>
          Upgrade to SSLVault Premium to get the 47-Day CA/B Forum compliance guarantee, monthly audit reports, and escalation alerts.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28, textAlign: 'left' }}>
          {[
            'Compliance score (0-100)',
            'Monthly PDF audit report',
            'Escalation alerts 30d + 10d',
            'SOC2 / ISO 27001 evidence',
            '47-Day mandate guarantee',
            'Priority PKI support',
          ].map(function(f) {
            return (
              <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <CheckCircle size={13} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={bodyStyle}>{f}</span>
              </div>
            )
          })}
        </div>
        <button className="v2-btn v2-btn-primary" onClick={function() { if (nav) nav('/pricing') }}
          style={{ padding: '11px 28px', fontSize: 13 }}>
          View Premium plans
        </button>
        <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(240,237,232,0.3)' }}>Plans from $999/year</div>
      </div>
    )
  }

  var sub   = status.sub
  var score = status.compliance_score
  var certs = status.certs || []
  var col   = scoreColor(score)

  return (
    <div className="v2-page" style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Star size={18} color="#c0392b" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f0ede8' }}>SLA Coverage</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(192,57,43,0.15)', color: '#c0392b', letterSpacing: '.06em' }}>
              {(sub.plan || 'active').toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.4)' }}>
            {sub.domain_limit} domains covered
          </div>
        </div>
        <button className="v2-btn" onClick={generateReport} disabled={genLoad}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px' }}>
          <FileText size={12} />
          {genLoad ? 'Generating...' : 'Generate report'}
        </button>
      </div>

      {msg && (
        <div className="v2-alert v2-alert-success" style={{ marginBottom: 16, fontSize: 12 }}>{msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={Object.assign({}, cardStyle, { textAlign: 'center' })}>
          <div style={{ fontSize: 36, fontWeight: 900, color: col, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: col, letterSpacing: '.08em', marginTop: 4 }}>{scoreLabel(score)}</div>
          <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.3)', marginTop: 3 }}>compliance score</div>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Total certs</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f0ede8' }}>{status.total_certs || 0}</div>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Expiring 30d</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: (status.expiring_30d || 0) > 0 ? '#f59e0b' : '#4ade80' }}>{status.expiring_30d || 0}</div>
        </div>
        <div style={cardStyle}>
          <span style={labelStyle}>Critical 10d</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: (status.expiring_10d || 0) > 0 ? '#c0392b' : '#4ade80' }}>{status.expiring_10d || 0}</div>
        </div>
      </div>

      <span style={labelStyle}>Certificate Coverage</span>
      <div style={Object.assign({}, cardStyle, { padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(192,57,43,0.08)' }}>
              {['Domain', 'Expires', 'Days left', 'Status'].map(function(h) {
                return <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(240,237,232,0.4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
              })}
            </tr>
          </thead>
          <tbody>
            {certs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(240,237,232,0.3)' }}>No active certificates</td>
              </tr>
            ) : certs.map(function(c) {
              var dl = daysLeft(c.expires_at)
              var cc = certStatusColor(dl)
              return (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(192,57,43,0.1)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#f0ede8', fontFamily: 'monospace' }}>{c.domain}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(240,237,232,0.5)' }}>{fmtDate(c.expires_at)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: cc }}>{Math.max(0, dl)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: cc + '22', color: cc, letterSpacing: '.06em' }}>
                      {certStatusLabel(dl)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <span style={Object.assign({}, labelStyle, { marginTop: 20, display: 'block' })}>Compliance Reports</span>
      {reports.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.3)', textAlign: 'center', padding: '8px 0' }}>
            No reports yet. Click Generate report above.
          </div>
        </div>
      ) : reports.map(function(r) {
        return (
          <div key={r.id} style={Object.assign({}, cardStyle, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={15} color="#c0392b" />
              <div>
                <div style={titleStyle}>Compliance Report - {r.report_month}</div>
                <div style={bodyStyle}>
                  Score: <span style={{ color: scoreColor(r.compliance_score), fontWeight: 600 }}>{r.compliance_score}/100</span>
                  {' - '}{r.certs_covered} certs
                </div>
              </div>
            </div>
            {r.report_url && (
              <a href={r.report_url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#c0392b', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
                <Download size={13} /> View
              </a>
            )}
          </div>
        )
      })}

      {alerts.length > 0 && (
        <div>
          <span style={Object.assign({}, labelStyle, { marginTop: 20, display: 'block' })}>Recent Alerts</span>
          {alerts.slice(0, 5).map(function(a) {
            return (
              <div key={a.id} style={Object.assign({}, cardStyle, { display: 'flex', alignItems: 'flex-start', gap: 10, borderColor: a.alert_type === 'red_10d' ? 'rgba(192,57,43,0.4)' : 'rgba(245,158,11,0.3)' })}>
                <AlertTriangle size={14} color={a.alert_type === 'red_10d' ? '#c0392b' : '#f59e0b'} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={titleStyle}>{a.domain}</div>
                  <div style={bodyStyle}>{a.message}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
