// SLADashboard.jsx
import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, FileText, Download, RefreshCw, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const fmtDate = (iso) => iso ? format(new Date(iso), 'dd MMM yyyy') : '—'

async function callSLA(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/sla-manage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
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

  const [status,    setStatus]    = useState(null)
  const [reports,   setReports]   = useState([])
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [genLoad,   setGenLoad]   = useState(false)
  const [msg,       setMsg]       = useState('')

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    try {
      const [s, r, a] = await Promise.all([
        callSLA('get_status'),
        callSLA('get_reports'),
        callSLA('get_alerts'),
      ])
      setStatus(s)
      setReports(r.reports || [])
      setAlerts(a.alerts   || [])
    } catch (e) {
      console.error('SLA load error:', e)
    }
    setLoading(false)
  }

  async function generateReport() {
    setGenLoad(true)
    setMsg('')
    try {
      const r = await callSLA('request_report')
      setMsg(r.ok ? '✅ Report generated — check your email' : `Error: ${r.error}`)
      if (r.ok) load()
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setGenLoad(false)
  }

  // ── styles ────────────────────────────────────────────────────────────
  const S = {
    page:   { maxWidth: 900, margin: '0 auto', padding: '28px 20px' },
    card:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 },
    label:  { fontSize: 10, fontWeight: 700, color: 'rgba(240,237,232,0.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 },
    title:  { fontSize: 13, fontWeight: 600, color: '#f0ede8', marginBottom: 3 },
    body:   { fontSize: 12, color: 'rgba(240,237,232,0.65)', lineHeight: 1.6 },
    row:    { display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 },
    dot:    { width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 5 },
  }

  // ── loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="v2-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 10 }}>
      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', color: '#c0392b' }} />
      <span style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13 }}>Loading SLA status…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── no SLA subscription ───────────────────────────────────────────────
  if (!status?.has_sla) return (
    <div className="v2-page" style={{ maxWidth: 580, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Star size={26} color="#c0392b" />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 10 }}>SLA Coverage not active</div>
      <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.6)', lineHeight: 1.75, marginBottom: 28 }}>
        Upgrade to SSLVault Premium to get the 47-Day CA/B Forum compliance guarantee, monthly audit reports, and escalation alerts.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28, textAlign: 'left' }}>
        {['Compliance score (0–100)', 'Monthly PDF audit report', 'Escalation alerts 30d + 10d', 'SOC2 / ISO 27001 evidence', '47-Day mandate guarantee', 'Priority PKI support'].map(f => (
          <div key={f} style={S.row}>
            <CheckCircle size={13} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={S.body}>{f}</span>
          </div>
        ))}
      </div>
      <button className="v2-btn v2-btn-primary" onClick={() => nav && nav('/pricing')}
        style={{ padding: '11px 28px', fontSize: 13 }}>
        View Premium plans
      </button>
      <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(240,237,232,0.3)' }}>Plans from $999/year · Contact us to activate</div>
    </div>
  )

  const { sub, compliance_score: score, sla_status, total_certs, expiring_30d, expiring_10d, certs } = status
  const col = scoreColor(score)

  // ── main dashboard ────────────────────────────────────────────────────
  return (
    <div className="v2-page" style={S.page}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Star size={18} color="#c0392b" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f0ede8' }}>SLA Coverage</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(192,57,43,0.15)', color: '#c0392b', letterSpacing: '.06em' }}>
              {sub.plan.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.4)' }}>
            {sub.domain_limit} domains · expires {fmtDate(sub.expires_at)}
          </div>
        </div>
        <button className="v2-btn" onClick={generateReport} disabled={genLoad}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 14px' }}>
          {genLoad
            ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            : <><FileText size={12} /> Generate report</>}
        </button>
      </div>

      {msg && (
        <div className={msg.includes('✅') ? 'v2-alert v2-alert-success' : 'v2-alert v2-alert-error'}
          style={{ marginBottom: 16, fontSize: 12 }}>{msg}</div>
      )}

      {/* score + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginBottom: 20 }}>
        {/* score ring */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 14px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke={col} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
              strokeLinecap="round" transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}/>
            <text x="50" y="46" textAnchor="middle" fill={col} fontSize="22" fontWeight="800" fontFamily="system-ui">{score}</text>
            <text x="50" y="60" textAnchor="middle" fill={col} fontSize="8" fontWeight="700" fontFamily="system-ui" letterSpacing="1">{scoreLabel(score)}</text>
          </svg>
          <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.4)', marginTop: 4, textAlign: 'center' }}>Compliance score</div>
        </div>

        {/* stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Total certs',     val: total_certs,   col: '#f0ede8' },
            { label: 'Expiring ≤30d',   val: expiring_30d,  col: expiring_30d  > 0 ? '#f59e0b' : '#4ade80' },
            { label: 'Critical <10d',   val: expiring_10d,  col: expiring_10d  > 0 ? '#c0392b' : '#4ade80' },
            { label: 'SLA status',      val: sla_status.replace('_',' '), col },
          ].map(({ label, val, col: c }) => (
            <div key={label} style={S.card}>
              <div style={S.label}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{val}</div>
            </div>
          ))}
          <div style={{ ...S.card, gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={S.body}>CA/B Forum 47-day mandate: </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: col }}>
              {score >= 80 ? 'compliance guaranteed ✓' : score >= 50 ? 'action needed' : 'breach — contact support'}
            </span>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* cert table */}
      <div style={S.label}>Certificate Coverage</div>
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(192,57,43,0.08)' }}>
              {['Domain', 'Expires', 'Days left', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(240,237,232,0.4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!(certs?.length) ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(240,237,232,0.3)' }}>No active certificates</td></tr>
            ) : certs.map((c) => {
              const dl = daysLeft(c.expires_at)
              const cc = certStatusColor(dl)
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

      {/* reports */}
      <div style={{ ...S.label, marginTop: 20 }}>Compliance Reports</div>
      {reports.length === 0 ? (
        <div style={S.card}>
          <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.3)', textAlign: 'center', padding: '8px 0' }}>
            No reports yet — click "Generate report" above
          </div>
        </div>
      ) : reports.map(r => (
        <div key={r.id} style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={15} color="#c0392b" />
            <div>
              <div style={S.title}>Compliance Report — {r.report_month}</div>
              <div style={S.body}>
                Score: <span style={{ color: scoreColor(r.compliance_score), fontWeight: 600 }}>{r.compliance_score}/100</span>
                {' · '}{r.certs_covered} certs{' · '}{fmtDate(r.generated_at)}
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
      ))}

      {/* alerts */}
      {alerts.length > 0 && (
        <>
          <div style={{ ...S.label, marginTop: 20 }}>Recent Alerts</div>
          {alerts.slice(0, 5).map(a => (
            <div key={a.id} style={{ ...S.card, display: 'flex', alignItems: 'flex-start', gap: 10, borderColor: a.alert_type === 'red_10d' ? 'rgba(192,57,43,0.4)' : 'rgba(245,158,11,0.3)' }}>
              <AlertTriangle size={14} color={a.alert_type === 'red_10d' ? '#c0392b' : '#f59e0b'} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={S.title}>{a.domain}</div>
                <div style={S.body}>{a.message} · {fmtDate(a.created_at)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
