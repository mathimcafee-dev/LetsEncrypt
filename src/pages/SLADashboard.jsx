import { useEffect, useState, useRef } from 'react'
import React from 'react'
import { supabase } from '../lib/supabase'
import { Shield, CheckCircle, AlertTriangle, Clock, FileText, Download, RefreshCw, Lock, TrendingUp, Star } from 'lucide-react'

const F = "'Segoe UI',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"
const RED  = '#c0392b'
const REDB = 'rgba(192,57,43,0.15)'
const GRN  = '#1d9e75'
const AMB  = '#ba7517'
const BG   = '#0d0000'
const BG2  = '#1a0808'
const BG3  = '#120404'
const LN   = 'rgba(255,255,255,0.06)'
const T1   = '#ffffff'
const T2   = '#e8e0d8'
const T3   = '#b0a8a0'

function daysLeft(exp) {
  if (!exp) return 999
  return Math.floor((new Date(exp).getTime() - Date.now()) / 86400000)
}
function certStatusColor(d) { return d < 0 ? '#6a2a2a' : d < 10 ? RED : d < 30 ? AMB : GRN }
function certStatusLabel(d) { return d < 0 ? 'EXPIRED' : d < 10 ? 'CRITICAL' : d < 30 ? 'WARNING' : 'HEALTHY' }
function scoreColor(s) { return s >= 80 ? GRN : s >= 50 ? AMB : RED }
function scoreLabel(s) { return s >= 80 ? 'COMPLIANT' : s >= 50 ? 'AT RISK' : 'BREACH' }

function ScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const col = scoreColor(score)
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke={BG2} strokeWidth="10"/>
      <circle cx="65" cy="65" r={r} fill="none" stroke={col} strokeWidth="10"
        strokeDasharray={`${circ}`} strokeDashoffset={fill}
        strokeLinecap="round" transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x="65" y="60" textAnchor="middle" fill={col} fontSize="28" fontWeight="800" fontFamily={F}>{score}</text>
      <text x="65" y="76" textAnchor="middle" fill={col} fontSize="9" fontWeight="700" fontFamily={F} letterSpacing="2">{scoreLabel(score)}</text>
    </svg>
  )
}

export default function SLADashboard({ user, nav }) {
  const [status, setStatus]   = useState(null)
  const [reports, setReports] = useState([])
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [genLoading, setGenLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    const SB = 'https://frthcwkntciaakqsppss.supabase.co'

    const [s, r, a] = await Promise.all([
      fetch(`${SB}/functions/v1/sla-manage`, { method: 'POST', headers, body: JSON.stringify({ action: 'get_status' }) }).then(x => x.json()),
      fetch(`${SB}/functions/v1/sla-manage`, { method: 'POST', headers, body: JSON.stringify({ action: 'get_reports' }) }).then(x => x.json()),
      fetch(`${SB}/functions/v1/sla-manage`, { method: 'POST', headers, body: JSON.stringify({ action: 'get_alerts' }) }).then(x => x.json()),
    ])
    setStatus(s)
    setReports(r.reports || [])
    setAlerts(a.alerts || [])
    setLoading(false)
  }

  async function generateReport() {
    setGenLoading(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    const SB = 'https://frthcwkntciaakqsppss.supabase.co'
    const r = await fetch(`${SB}/functions/v1/sla-manage`, { method: 'POST', headers, body: JSON.stringify({ action: 'request_report' }) }).then(x => x.json())
    setMsg(r.ok ? '✅ Report generated — check your email' : `Error: ${r.error}`)
    setGenLoading(false)
    if (r.ok) load()
  }

  const Card = ({ children, style }) => (
    <div style={{ background: BG2, border: `1px solid ${LN}`, borderRadius: 10, padding: '14px 16px', ...style }}>{children}</div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: T3, fontFamily: F, gap: 10 }}>
      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
      Loading SLA status...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!status?.has_sla) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px', textAlign: 'center', fontFamily: F }}>
      <div style={{ width: 60, height: 60, background: REDB, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Shield size={28} color={RED} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T1, marginBottom: 10 }}>SLA Coverage not active</h2>
      <p style={{ fontSize: 14, color: T3, lineHeight: 1.7, marginBottom: 28 }}>
        Upgrade to SSLVault Premium to get the 47-Day CA/B Forum compliance guarantee, monthly audit reports, and escalation alerts.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, textAlign: 'left' }}>
        {[
          ['Compliance score dashboard', GRN],
          ['Monthly PDF audit report', GRN],
          ['Escalation alerts at 30d + 10d', GRN],
          ['SOC2 / ISO 27001 evidence pack', GRN],
          ['47-Day mandate auto-compliance', GRN],
          ['Dedicated support + SLA guarantee', GRN],
        ].map(([f, c]) => (
          <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <CheckCircle size={14} color={c} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: T2 }}>{f}</span>
          </div>
        ))}
      </div>
      <button onClick={() => nav && nav('/pricing')} style={{ background: RED, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
        Upgrade to Premium
      </button>
      <div style={{ marginTop: 16, fontSize: 11, color: T3 }}>Contact us at easysecurity.in · Plans from $999/year</div>
    </div>
  )

  const { sub, compliance_score: score, sla_status, total_certs, expiring_30d, expiring_10d, certs } = status

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T1, marginBottom: 4 }}>SLA Coverage</h1>
          <div style={{ fontSize: 12, color: T3 }}>
            <span style={{ background: REDB, color: RED, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '.06em', marginRight: 8 }}>
              {sub.plan.toUpperCase()}
            </span>
            {sub.domain_limit} domains · expires {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generateReport} disabled={genLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: BG2, border: `1px solid ${LN}`, color: T2, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: F }}>
            {genLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
            {genLoading ? 'Generating...' : 'Generate report'}
          </button>
        </div>
      </div>

      {msg && <div style={{ background: msg.includes('✅') ? 'rgba(29,158,117,.12)' : REDB, border: `1px solid ${msg.includes('✅') ? GRN : RED}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T2, marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 20, alignItems: 'center' }}>
        <ScoreRing score={score} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Total certs', val: total_certs, col: T1 },
            { label: 'Expiring ≤30d', val: expiring_30d, col: expiring_30d > 0 ? AMB : GRN },
            { label: 'Critical <10d', val: expiring_10d, col: expiring_10d > 0 ? RED : GRN },
          ].map(({ label, val, col }) => (
            <Card key={label}>
              <div style={{ fontSize: 24, fontWeight: 800, color: col, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>{label}</div>
            </Card>
          ))}
          <Card style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: scoreColor(score), animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: T2 }}>CA/B Forum status: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score) }}>47-Day mandate compliance {sla_status === 'COMPLIANT' ? 'guaranteed ✓' : sla_status === 'AT_RISK' ? '— action needed' : '— breach detected'}</span>
            </div>
          </Card>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Cert table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Certificate Coverage</div>
        <div style={{ background: BG2, border: `1px solid ${LN}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#2a0808' }}>
              {['Domain', 'Expires', 'Days left', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(certs || []).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: T3 }}>No active certificates found</td></tr>
              ) : (certs || []).map((c) => {
                const dl = daysLeft(c.expires_at)
                const col = certStatusColor(dl)
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${LN}` }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: T1, fontFamily: MONO }}>{c.domain}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: T3 }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: col, fontWeight: 600 }}>{Math.max(0, dl)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${col}22`, color: col, letterSpacing: '.06em' }}>{certStatusLabel(dl)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report history */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Compliance Reports</div>
        {reports.length === 0 ? (
          <Card><div style={{ fontSize: 13, color: T3, textAlign: 'center', padding: '12px 0' }}>No reports yet — generate your first report above</div></Card>
        ) : reports.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG2, border: `1px solid ${LN}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} color={RED} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T1 }}>Compliance Report — {r.report_month}</div>
                <div style={{ fontSize: 11, color: T3 }}>Score: <span style={{ color: scoreColor(r.compliance_score), fontWeight: 600 }}>{r.compliance_score}/100</span> · {r.certs_covered} certs · Generated {new Date(r.generated_at).toLocaleDateString('en-GB')}</div>
              </div>
            </div>
            {r.report_url && (
              <a href={r.report_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: RED, textDecoration: 'none', fontWeight: 500 }}>
                <Download size={13} /> View
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Recent Alerts</div>
          {alerts.slice(0, 5).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: BG2, border: `1px solid ${a.alert_type === 'red_10d' ? `${RED}44` : `${AMB}44`}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
              <AlertTriangle size={14} color={a.alert_type === 'red_10d' ? RED : AMB} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: T1 }}>{a.domain}</div>
                <div style={{ fontSize: 11, color: T3 }}>{a.message} · {new Date(a.created_at).toLocaleDateString('en-GB')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

