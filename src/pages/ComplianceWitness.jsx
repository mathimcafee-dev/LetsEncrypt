// ComplianceWitness.jsx — SSLVault Compliance Witness
// Immutable event ledger + per-domain evidence dossier + auditor share links + gap analysis
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, ShieldCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle,
  Clock, Download, Share2, Eye, RefreshCw, ChevronDown, ChevronUp,
  Lock, Globe, Link, Copy, Check, FileText, Zap, Activity,
  Hash, Calendar, Server, Key, Wifi, ArrowRight, ExternalLink, X
} from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FN     = SB_URL + '/functions/v1/compliance-witness'
const F      = "'DM Sans','Inter',system-ui,sans-serif"
const MONO   = "'JetBrains Mono','Fira Mono',monospace"
const BLUE   = '#0077b6'
const BG     = 'rgba(0,119,182,0.06)'
const BORDER = 'rgba(0,119,182,0.12)'

// ── Design tokens ─────────────────────────────────────────────────────
function scoreColor(s) { return s >= 80 ? '#00a550' : s >= 50 ? '#9a6400' : '#c0392b' }
function scoreLbl(s)   { return s >= 80 ? 'STRONG' : s >= 50 ? 'PARTIAL' : 'WEAK' }
function severityColor(sev) {
  return sev === 'critical' ? '#c0392b' : sev === 'high' ? '#9a6400' : sev === 'medium' ? '#0077b6' : '#7a8694'
}
function fmtTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  } catch { return iso }
}
function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) } catch { return iso }
}

const EVENT_META = {
  issued:               { label:'Certificate Issued',       color:'#0077b6',  bg:'rgba(0,119,182,0.08)',   icon: ShieldCheck },
  renewed:              { label:'Certificate Renewed',      color:'#00a550',  bg:'rgba(0,165,80,0.08)',    icon: RefreshCw },
  installed:            { label:'Installed on Server',      color:'#00a550',  bg:'rgba(0,165,80,0.08)',    icon: Server },
  binding_verified:     { label:'Binding Verified',         color:'#0077b6',  bg:'rgba(0,119,182,0.08)',   icon: ShieldCheck },
  dcv_validated:        { label:'DCV Validated',            color:'#0077b6',  bg:'rgba(0,119,182,0.08)',   icon: CheckCircle },
  key_rotated:          { label:'Key Rotated',              color:'#9a6400',  bg:'rgba(154,100,0,0.08)',   icon: Key },
  auto_renew_triggered: { label:'Auto-Renewal Triggered',   color:'#00a550',  bg:'rgba(0,165,80,0.08)',    icon: Zap },
  revoked:              { label:'Certificate Revoked',      color:'#c0392b',  bg:'rgba(192,57,43,0.08)',   icon: XCircle },
  agent_heartbeat:      { label:'Agent Heartbeat',          color:'#7a8694',  bg:'rgba(122,134,148,0.08)', icon: Activity },
  gap_flagged:          { label:'Gap Detected',             color:'#c0392b',  bg:'rgba(192,57,43,0.08)',   icon: AlertTriangle },
  expiry_warning:       { label:'Expiry Warning',           color:'#9a6400',  bg:'rgba(154,100,0,0.08)',   icon: Clock },
}

const FRAMEWORK_COLORS = {
  'SOC2':  { color:'#0077b6', bg:'rgba(0,119,182,0.08)',  border:'rgba(0,119,182,0.2)',  label:'SOC 2 Type II' },
  'ISO':   { color:'#00a550', bg:'rgba(0,165,80,0.08)',   border:'rgba(0,165,80,0.2)',   label:'ISO 27001:2022' },
  'CABF':  { color:'#9a6400', bg:'rgba(154,100,0,0.08)',  border:'rgba(154,100,0,0.2)',  label:'CA/B Forum SC-081v3' },
  'NIS2':  { color:'#7a8694', bg:'rgba(122,134,148,0.08)',border:'rgba(122,134,148,0.2)',label:'NIS2 Article 21' },
  'PCI':   { color:'#c0392b', bg:'rgba(192,57,43,0.08)',  border:'rgba(192,57,43,0.2)',  label:'PCI DSS v4' },
}

// ── API call helper ────────────────────────────────────────────────────
async function callWitness(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const r = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  const data = await r.json()
  if (!data.ok && data.error) throw new Error(data.error)
  return data
}

// ── Score Ring ─────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80, label, sub }) {
  const col   = scoreColor(score)
  const r     = size * 0.42
  const circ  = 2 * Math.PI * r
  const fill  = circ * (1 - score / 100)
  const cx = size / 2, cy = size / 2
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,119,182,0.08)" strokeWidth={size*0.09}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={size*0.09}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition:'stroke-dashoffset 1s ease' }}/>
        <text x={cx} y={cy - 3} textAnchor="middle" fill={col} fontSize={size * 0.22} fontWeight="800" fontFamily={F}>{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={col} fontSize={size * 0.1} fontWeight="600" fontFamily={F}>/100</text>
      </svg>
      {label && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: col, letterSpacing: '0.04em' }}>{scoreLbl(score)}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0d1117', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{sub}</div>}
        </div>
      )}
    </div>
  )
}

// ── Event row ──────────────────────────────────────────────────────────
function EventRow({ event, controls }) {
  const [open, setOpen] = useState(false)
  const meta = EVENT_META[event.event_type] || { label: event.event_type, color: '#7a8694', bg: 'rgba(122,134,148,0.08)', icon: Activity }
  const Icon = meta.icon
  const ctrls = event.controls_met || []

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', cursor: 'pointer', transition: 'background .12s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,119,182,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {/* Icon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={meta.color} strokeWidth={2}/>
        </div>
        {/* Event type + domain */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1117' }}>{meta.label}</div>
          <div style={{ fontSize: 11, color: '#7a8694', fontFamily: MONO, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.domain}
          </div>
        </div>
        {/* Controls met count */}
        {ctrls.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 220 }}>
            {[...new Set(ctrls.map(c => c.split(':')[0]))].map(fw => {
              const fc = FRAMEWORK_COLORS[fw]
              if (!fc) return null
              return (
                <span key={fw} style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                  {fc.label.split(' ')[0]} {fc.label.split(' ')[1]}
                </span>
              )
            })}
          </div>
        )}
        {/* Timestamp */}
        <div style={{ fontSize: 10, color: '#7a8694', flexShrink: 0, textAlign: 'right', minWidth: 110 }}>
          {fmtTs(event.event_ts)}
        </div>
        {/* Hash icon */}
        <div style={{ flexShrink: 0, opacity: 0.4 }}>
          <Hash size={11} color="#0077b6"/>
        </div>
        {open ? <ChevronUp size={13} color="#7a8694"/> : <ChevronDown size={13} color="#7a8694"/>}
      </div>

      {open && (
        <div style={{ padding: '12px 18px 16px 62px', background: 'rgba(0,119,182,0.02)', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
            {/* Chain hash */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Event Hash (SHA-256)</div>
              <div style={{ fontSize: 10, fontFamily: MONO, color: '#0d1117', background: '#f8fafd', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '8px 10px', wordBreak: 'break-all', lineHeight: 1.6 }}>
                {event.event_hash || '—'}
              </div>
            </div>
            {/* Controls */}
            {ctrls.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Controls Satisfied</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ctrls.map(c => {
                    const fw = c.split(':')[0]
                    const fc = FRAMEWORK_COLORS[fw]
                    const desc = controls?.[c] || c
                    return (
                      <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: fc?.bg || BG, color: fc?.color || BLUE, border: `1px solid ${fc?.border || BORDER}`, flexShrink: 0, marginTop: 1 }}>{c}</span>
                        <span style={{ fontSize: 11, color: '#3d4a58', lineHeight: 1.5 }}>{desc}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Details */}
            {event.details && Object.keys(event.details).length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {Object.entries(event.details).filter(([,v]) => v !== null && v !== undefined).map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ color: '#7a8694', fontWeight: 600, minWidth: 80 }}>{k}</span>
                      <span style={{ color: '#0d1117', fontFamily: MONO, fontSize: 10 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Gap card ───────────────────────────────────────────────────────────
function GapCard({ gap }) {
  const col = severityColor(gap.severity)
  const SevIcon = gap.severity === 'critical' ? XCircle : gap.severity === 'high' ? AlertTriangle : Shield
  return (
    <div style={{ background: '#fff', border: `1px solid ${col}33`, borderRadius: 12, padding: '14px 16px', boxShadow: `0 2px 8px ${col}11` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <SevIcon size={15} color={col} style={{ flexShrink: 0, marginTop: 1 }}/>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1117' }}>{gap.control}</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: `${col}15`, color: col, border: `1px solid ${col}33`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{gap.severity}</span>
          </div>
          <div style={{ fontSize: 10, color: BLUE, fontWeight: 600, marginBottom: 4 }}>{gap.framework}</div>
          <div style={{ fontSize: 12, color: '#3d4a58', lineHeight: 1.6 }}>{gap.message}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,119,182,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 10px' }}>
        <ArrowRight size={11} color={BLUE}/>
        <span style={{ fontSize: 11, color: BLUE, fontWeight: 600 }}>{gap.action}</span>
      </div>
    </div>
  )
}

// ── Share token modal ──────────────────────────────────────────────────
function ShareTokenModal({ domain, onClose, onCreated }) {
  const [label,    setLabel]    = useState(`${domain || 'Account'} Audit Evidence`)
  const [days,     setDays]     = useState(90)
  const [creating, setCreating] = useState(false)
  const [result,   setResult]   = useState(null)
  const [copied,   setCopied]   = useState(false)

  async function create() {
    setCreating(true)
    try {
      const r = await callWitness('create_share_token', { domain: domain || null, label, days })
      setResult(r)
      onCreated?.(r)
    } catch(e) { alert('Error: ' + e.message) }
    setCreating(false)
  }

  function copy() {
    navigator.clipboard.writeText(result.share_url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,17,23,0.6)', backdropFilter: 'blur(4px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,119,182,0.15)', fontFamily: F, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, background: BG }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Share2 size={16} color={BLUE}/>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0d1117' }}>Share Audit Evidence</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${BORDER}`, background: '#f8fafd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="#7a8694"/>
          </button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {!result ? (
            <>
              <div style={{ fontSize: 13, color: '#3d4a58', lineHeight: 1.7, marginBottom: 20 }}>
                Generate a read-only share link for your auditor. They can view the full compliance dossier and event ledger without needing an SSLVault account.
              </div>
              {domain && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                  <Globe size={12} color={BLUE}/>
                  <span style={{ fontSize: 12, fontFamily: MONO, color: BLUE, fontWeight: 600 }}>{domain}</span>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Label (for your reference)</label>
                <input value={label} onChange={e => setLabel(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafd', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#0d1117', fontSize: 13, fontFamily: F, padding: '11px 14px', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
                  onBlur={e  => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }}/>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Link expires after</label>
                <select value={days} onChange={e => setDays(Number(e.target.value))}
                  style={{ width: '100%', background: '#f8fafd', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#0d1117', fontSize: 13, fontFamily: F, padding: '11px 14px', outline: 'none', cursor: 'pointer' }}>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days (recommended)</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
              <button onClick={create} disabled={creating}
                style={{ width: '100%', background: creating ? 'rgba(0,119,182,0.4)' : BLUE, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: creating ? undefined : '0 4px 14px rgba(0,119,182,0.3)' }}>
                {creating
                  ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }}/> Generating…</>
                  : <><Link size={14}/> Generate Share Link</>}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,165,80,0.08)', border: '1px solid rgba(0,165,80,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckCircle size={24} color="#00a550"/>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0d1117' }}>Share link created</div>
                <div style={{ fontSize: 12, color: '#7a8694', marginTop: 4 }}>Expires {fmtDate(result.expires_at)}</div>
              </div>
              <div style={{ background: '#f8fafd', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Share URL</div>
                <div style={{ fontSize: 12, fontFamily: MONO, color: BLUE, wordBreak: 'break-all', lineHeight: 1.6 }}>{result.share_url}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={copy}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, background: copied ? 'rgba(0,165,80,0.08)' : BG, border: `1px solid ${copied ? 'rgba(0,165,80,0.2)' : BORDER}`, color: copied ? '#00a550' : BLUE, transition: 'all .15s' }}>
                  {copied ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> Copy URL</>}
                </button>
                <button onClick={onClose}
                  style={{ padding: '11px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: '#fff', border: `1.5px solid ${BORDER}`, color: '#3d4a58' }}>
                  Done
                </button>
              </div>
              <div style={{ marginTop: 12, background: BG, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '10px 14px', fontSize: 11, color: '#3d4a58', lineHeight: 1.7 }}>
                <strong style={{ color: '#0d1117' }}>Auditor access is logged.</strong> Every time the link is opened, the timestamp and IP are recorded in your audit trail.
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────
export default function ComplianceWitness({ user }) {
  const [loading,       setLoading]       = useState(true)
  const [backfilling,   setBackfilling]   = useState(false)
  const [dossiers,      setDossiers]      = useState([])
  const [events,        setEvents]        = useState([])
  const [controls,      setControls]      = useState({})
  const [shareTokens,   setShareTokens]   = useState([])
  const [selectedDomain,setSelectedDomain] = useState(null) // null = all
  const [activeTab,     setActiveTab]     = useState('dossiers') // dossiers | ledger | shares | export
  const [showShare,     setShowShare]     = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [backfillMsg,   setBackfillMsg]   = useState('')

  const load = useCallback(async () => {
    try {
      const [dossierRes, eventsRes, tokensRes] = await Promise.all([
        callWitness('get_dossier'),
        callWitness('get_events', { limit: 100 }),
        callWitness('get_share_tokens'),
      ])
      setDossiers(dossierRes.dossiers || [])
      setEvents(eventsRes.events || [])
      setControls(eventsRes.controls || {})
      setShareTokens(tokensRes.tokens || [])
    } catch(e) { console.error('[ComplianceWitness]', e) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function backfill() {
    setBackfilling(true); setBackfillMsg('')
    try {
      const r = await callWitness('backfill')
      setBackfillMsg(`Ledger built: ${r.written} events written across ${r.domains} domains.`)
      await load()
    } catch(e) { setBackfillMsg('Error: ' + e.message) }
    setBackfilling(false)
  }

  async function downloadEvidencePackage() {
    setExportLoading(true)
    try {
      const pkg = await callWitness('get_evidence_package', selectedDomain ? { domain: selectedDomain } : {})
      // Build evidence JSON
      const evidencePackage = {
        meta: {
          product: 'SSLVault Compliance Witness',
          generated_at: pkg.generated_at,
          account: pkg.account_email,
          package_hash: pkg.package_hash,
          note: 'This package was generated automatically by SSLVault. The package_hash (SHA-256) can be used to verify package integrity.',
        },
        dossiers: pkg.dossiers,
        event_ledger: pkg.events,
        control_framework: pkg.controls,
      }
      const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sslvault-compliance-witness-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch(e) { alert('Export failed: ' + e.message) }
    setExportLoading(false)
  }

  async function revokeToken(tokenId) {
    await callWitness('revoke_share_token', { token_id: tokenId })
    setShareTokens(prev => prev.filter(t => t.id !== tokenId))
  }

  // Filtered events
  const filteredEvents = selectedDomain
    ? events.filter(e => e.domain === selectedDomain)
    : events

  // Account-level scores
  const avgAudit     = dossiers.length ? Math.round(dossiers.reduce((s, d) => s + (d.audit_score || 0), 0) / dossiers.length) : 0
  const avgReadiness = dossiers.length ? Math.round(dossiers.reduce((s, d) => s + (d.readiness_score || 0), 0) / dossiers.length) : 0
  const allControls  = [...new Set(dossiers.flatMap(d => [...(d.soc2_controls_met||[]),...(d.iso27001_controls_met||[]),...(d.cabf_controls_met||[]),...(d.nis2_controls_met||[])]))]
  const totalGaps    = dossiers.reduce((s, d) => s + (d.gaps?.length || 0), 0)
  const criticalGaps = dossiers.reduce((s, d) => s + (d.gaps?.filter(g => g.severity === 'critical').length || 0), 0)

  const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 2px 10px rgba(0,119,182,0.06)' }
  const tab  = (id) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
    cursor: 'pointer', fontFamily: F, background: 'none', border: 'none',
    borderBottom: activeTab === id ? `2px solid ${BLUE}` : '2px solid transparent',
    color: activeTab === id ? BLUE : '#7a8694', transition: 'all .15s', marginBottom: '-1px',
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60, fontFamily: F }}>
      <RefreshCw size={16} color={BLUE} style={{ animation: 'spin 1s linear infinite' }}/>
      <span style={{ color: '#7a8694', fontSize: 13 }}>Loading Compliance Witness…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100%', fontFamily: F }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg,${BLUE},#0091d6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,119,182,0.3)' }}>
                <ShieldCheck size={20} color="#fff" strokeWidth={2}/>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0d1117', margin: 0, letterSpacing: '-0.3px' }}>Compliance Witness</h1>
                <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>Immutable certificate lifecycle ledger · SOC 2 · ISO 27001 · NIS2 · CA/B Forum</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={backfill} disabled={backfilling}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#3d4a58', fontSize: 12, fontWeight: 600, cursor: backfilling ? 'not-allowed' : 'pointer', fontFamily: F, boxShadow: '0 1px 4px rgba(0,119,182,0.06)' }}>
              <RefreshCw size={12} style={backfilling ? { animation: 'spin .8s linear infinite' } : {}}/> {backfilling ? 'Building…' : 'Rebuild Ledger'}
            </button>
            <button onClick={() => setShowShare(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#3d4a58', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F, boxShadow: '0 1px 4px rgba(0,119,182,0.06)' }}>
              <Share2 size={12}/> Share with Auditor
            </button>
            <button onClick={() => load()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#3d4a58', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F, boxShadow: '0 1px 4px rgba(0,119,182,0.06)' }}>
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
        </div>

        {backfillMsg && (
          <div style={{ background: 'rgba(0,165,80,0.06)', border: '1px solid rgba(0,165,80,0.2)', borderRadius: 9, padding: '10px 16px', color: '#00a550', fontSize: 12, fontWeight: 500, marginBottom: 20 }}>
            {backfillMsg}
          </div>
        )}

        {/* ── ACCOUNT OVERVIEW SCORES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
          {/* Audit evidence score */}
          <div style={{ ...card, padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <ScoreRing score={avgAudit} size={72}/>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Audit Evidence</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>{scoreLbl(avgAudit)}</div>
              <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{allControls.length} controls documented</div>
            </div>
          </div>
          {/* Readiness score */}
          <div style={{ ...card, padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <ScoreRing score={avgReadiness} size={72}/>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Operational Readiness</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>{scoreLbl(avgReadiness)}</div>
              <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{dossiers.length} domain{dossiers.length !== 1 ? 's' : ''} monitored</div>
            </div>
          </div>
          {/* Event count */}
          <div style={{ ...card, padding: '20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Ledger Events</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0d1117', lineHeight: 1, fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>{events.length}</div>
            <div style={{ fontSize: 11, color: '#7a8694' }}>Timestamped + hash-chained</div>
          </div>
          {/* Gaps */}
          <div style={{ ...card, padding: '20px', borderColor: criticalGaps > 0 ? 'rgba(192,57,43,0.25)' : BORDER }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: criticalGaps > 0 ? '#c0392b' : BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Control Gaps</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: criticalGaps > 0 ? '#c0392b' : '#0d1117', lineHeight: 1, fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>{totalGaps}</div>
            <div style={{ fontSize: 11, color: '#7a8694' }}>{criticalGaps} critical · needs action</div>
          </div>
          {/* Framework coverage pills */}
          <div style={{ ...card, padding: '20px', gridColumn: 'span 1' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Framework Coverage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.entries(FRAMEWORK_COLORS).map(([key, fc]) => {
                const count = allControls.filter(c => c.startsWith(key)).length
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, minWidth: 60, textAlign: 'center' }}>{fc.label.split(' ').slice(0,2).join(' ')}</span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(0,119,182,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, count * 15)}%`, background: fc.color, borderRadius: 99, transition: 'width 1s ease' }}/>
                    </div>
                    <span style={{ fontSize: 10, color: fc.color, fontWeight: 700, minWidth: 20 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── DOMAIN FILTER ── */}
        {dossiers.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8694' }}>Domain:</span>
            <button onClick={() => setSelectedDomain(null)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: !selectedDomain ? BLUE : '#fff', color: !selectedDomain ? '#fff' : '#3d4a58', border: `1.5px solid ${!selectedDomain ? BLUE : BORDER}`, transition: 'all .15s' }}>
              All domains
            </button>
            {dossiers.map(d => (
              <button key={d.domain} onClick={() => setSelectedDomain(d.domain)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: selectedDomain === d.domain ? BLUE : '#fff', color: selectedDomain === d.domain ? '#fff' : '#3d4a58', border: `1.5px solid ${selectedDomain === d.domain ? BLUE : BORDER}`, fontFamily: MONO, transition: 'all .15s' }}>
                {d.domain}
              </button>
            ))}
          </div>
        )}

        {/* ── TAB BAR ── */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: '#fff', padding: '0 4px' }}>
            {[
              { id: 'dossiers', label: 'Evidence Dossiers', icon: ShieldCheck },
              { id: 'ledger',   label: 'Event Ledger',      icon: Hash },
              { id: 'shares',   label: 'Auditor Shares',    icon: Share2 },
              { id: 'export',   label: 'Export Package',    icon: Download },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={tab(id)}>
                <Icon size={13}/> {label}
                {id === 'shares' && shareTokens.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: BG, color: BLUE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1px 6px' }}>{shareTokens.length}</span>
                )}
                {id === 'dossiers' && criticalGaps > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(192,57,43,0.1)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 20, padding: '1px 6px' }}>{criticalGaps}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB: DOSSIERS ── */}
          {activeTab === 'dossiers' && (
            <div style={{ padding: '24px' }}>
              {dossiers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <ShieldAlert size={40} color="rgba(0,119,182,0.3)" style={{ margin: '0 auto 16px', display: 'block' }}/>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0d1117', marginBottom: 8 }}>No evidence dossiers yet</div>
                  <div style={{ fontSize: 13, color: '#7a8694', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.7 }}>
                    Click <strong>"Rebuild Ledger"</strong> to scan your existing certificates, renewals, and CertBind checks and build the evidence trail automatically.
                  </div>
                  <button onClick={backfill} disabled={backfilling}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 14px rgba(0,119,182,0.3)' }}>
                    <Zap size={14}/> {backfilling ? 'Building Ledger…' : 'Build Evidence Ledger Now'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(selectedDomain ? dossiers.filter(d => d.domain === selectedDomain) : dossiers).map(dossier => (
                    <DossierCard key={dossier.domain} dossier={dossier} onShare={() => setShowShare(dossier.domain)} controls={controls}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: LEDGER ── */}
          {activeTab === 'ledger' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, background: BG }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Hash size={13} color={BLUE}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1117' }}>
                    {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                    {selectedDomain ? ` · ${selectedDomain}` : ' · all domains'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7a8694' }}>
                  <Lock size={11} color={BLUE}/>
                  SHA-256 hash-chained · tamper-evident
                </div>
              </div>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7a8694', fontSize: 13 }}>
                  No events yet. Click "Rebuild Ledger" to populate from existing data.
                </div>
              ) : (
                filteredEvents.map(event => (
                  <EventRow key={event.id} event={event} controls={controls}/>
                ))
              )}
            </div>
          )}

          {/* ── TAB: AUDITOR SHARES ── */}
          {activeTab === 'shares' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1117', marginBottom: 3 }}>Auditor Share Links</div>
                  <div style={{ fontSize: 12, color: '#7a8694' }}>Share read-only evidence dossiers with auditors — no SSLVault account required</div>
                </div>
                <button onClick={() => setShowShare(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: BLUE, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 12px rgba(0,119,182,0.3)' }}>
                  <Share2 size={12}/> New Share Link
                </button>
              </div>

              {shareTokens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', border: `1.5px dashed ${BORDER}`, borderRadius: 12, color: '#7a8694' }}>
                  <Share2 size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}/>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>No share links yet</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                    Generate a link to share your evidence dossier with an auditor. Auditor access is logged automatically.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shareTokens.map(tok => {
                    const expired = new Date(tok.expires_at) < new Date()
                    const views   = (tok.access_log || []).length
                    return (
                      <div key={tok.id} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, opacity: expired ? 0.5 : 1 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Link size={16} color={BLUE}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117', marginBottom: 3 }}>{tok.label}</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#7a8694' }}>
                            {tok.domain && <span style={{ fontFamily: MONO, color: BLUE }}>{tok.domain}</span>}
                            <span>Created {fmtDate(tok.created_at)}</span>
                            <span style={{ color: expired ? '#c0392b' : '#00a550' }}>
                              {expired ? 'Expired' : `Expires ${fmtDate(tok.expires_at)}`}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Eye size={10}/> {views} view{views !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#7a8694', fontFamily: MONO, marginTop: 6, wordBreak: 'break-all' }}>
                            https://easysecurity.in/witness?token={tok.token}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                          <button onClick={() => { navigator.clipboard.writeText(`https://easysecurity.in/witness?token=${tok.token}`) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: BG, border: `1px solid ${BORDER}`, color: BLUE }}>
                            <Copy size={10}/> Copy
                          </button>
                          <button onClick={() => revokeToken(tok.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)', color: '#c0392b' }}>
                            <X size={10}/> Revoke
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: EXPORT ── */}
          {activeTab === 'export' && (
            <div style={{ padding: '24px' }}>
              <div style={{ maxWidth: 560 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1117', marginBottom: 6 }}>Evidence Package Export</div>
                <div style={{ fontSize: 13, color: '#7a8694', lineHeight: 1.7, marginBottom: 24 }}>
                  Download a complete, cryptographically-signed evidence package suitable for SOC 2, ISO 27001, NIS2, and CA/B Forum compliance audits.
                </div>

                {/* What's included */}
                <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Package Contents</div>
                  {[
                    { icon: ShieldCheck, label: 'Per-domain compliance dossiers',  sub: 'Readiness score, audit score, control coverage' },
                    { icon: Hash,        label: 'Full event ledger (JSON)',         sub: 'SHA-256 hash-chained, tamper-evident, timestamped' },
                    { icon: FileText,    label: 'Control framework mapping',        sub: 'SOC 2, ISO 27001, CA/B Forum, NIS2, PCI DSS' },
                    { icon: Lock,        label: 'Package integrity hash',           sub: 'SHA-256 of entire package — verifiable by auditors' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} color={BLUE}/>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0d1117' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Framework badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  {Object.entries(FRAMEWORK_COLORS).map(([key, fc]) => (
                    <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}` }}>
                      <CheckCircle size={10}/> {fc.label}
                    </span>
                  ))}
                </div>

                <button onClick={downloadEvidencePackage} disabled={exportLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: exportLoading ? 'rgba(0,119,182,0.4)' : BLUE, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: exportLoading ? 'not-allowed' : 'pointer', fontFamily: F, boxShadow: exportLoading ? undefined : '0 4px 16px rgba(0,119,182,0.3)', letterSpacing: '-0.1px' }}
                  onMouseEnter={e => { if (!exportLoading) { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { if (!exportLoading) { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)' } }}>
                  {exportLoading
                    ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }}/> Generating…</>
                    : <><Download size={15}/> Download Evidence Package</>}
                </button>
                <div style={{ fontSize: 11, color: '#7a8694', marginTop: 10, lineHeight: 1.6 }}>
                  JSON format · includes package integrity hash · suitable for auditor submission
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareTokenModal
          domain={typeof showShare === 'string' ? showShare : selectedDomain}
          onClose={() => setShowShare(false)}
          onCreated={() => { setShowShare(false); callWitness('get_share_tokens').then(r => setShareTokens(r.tokens || [])) }}
        />
      )}
    </div>
  )
}

// ── Dossier card: per-domain ───────────────────────────────────────────
function DossierCard({ dossier, onShare, controls }) {
  const [open, setOpen] = useState(false)
  const F2   = "'DM Sans','Inter',system-ui,sans-serif"
  const gaps = dossier.gaps || []
  const critGaps = gaps.filter(g => g.severity === 'critical')
  const highGaps = gaps.filter(g => g.severity === 'high')
  const allControls = [...(dossier.soc2_controls_met||[]),...(dossier.iso27001_controls_met||[]),...(dossier.cabf_controls_met||[]),...(dossier.nis2_controls_met||[])]

  return (
    <div style={{ background: '#fff', border: `1px solid ${critGaps.length > 0 ? 'rgba(192,57,43,0.25)' : BORDER}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,119,182,0.05)' }}>
      {/* Card header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
        {/* Domain */}
        <div style={{ width: 40, height: 40, borderRadius: 10, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Globe size={17} color={BLUE} strokeWidth={1.8}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1117', fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dossier.domain}</div>
          <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>
            {allControls.length} controls documented · Last event {fmtDate(dossier.last_event_at)}
          </div>
        </div>
        {/* Scores */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(dossier.audit_score||0), lineHeight: 1 }}>{dossier.audit_score||0}</div>
            <div style={{ fontSize: 9, color: '#7a8694', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Audit</div>
          </div>
          <div style={{ width: 1, background: BORDER }}/>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(dossier.readiness_score||0), lineHeight: 1 }}>{dossier.readiness_score||0}</div>
            <div style={{ fontSize: 9, color: '#7a8694', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>Ready</div>
          </div>
        </div>
        {/* Gap badges */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {critGaps.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.2)' }}>
              {critGaps.length} critical
            </span>
          )}
          {highGaps.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(154,100,0,0.08)', color: '#9a6400', border: '1px solid rgba(154,100,0,0.2)' }}>
              {highGaps.length} high
            </span>
          )}
          {gaps.length === 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(0,165,80,0.08)', color: '#00a550', border: '1px solid rgba(0,165,80,0.2)' }}>
              ✓ No gaps
            </span>
          )}
        </div>
        {/* Share + expand */}
        <button onClick={e => { e.stopPropagation(); onShare(dossier.domain) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F2, background: BG, border: `1px solid ${BORDER}`, color: BLUE, flexShrink: 0 }}>
          <Share2 size={11}/> Share
        </button>
        {open ? <ChevronUp size={14} color="#7a8694"/> : <ChevronDown size={14} color="#7a8694"/>}
      </div>

      {/* Expanded: control coverage + gaps */}
      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '20px', background: 'rgba(0,119,182,0.01)', animation: 'fadein .2s ease' }}>

          {/* Framework control strips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'soc2',    label: 'SOC 2 Type II',      controls: dossier.soc2_controls_met||[],    fc: FRAMEWORK_COLORS.SOC2 },
              { key: 'iso',     label: 'ISO 27001:2022',      controls: dossier.iso27001_controls_met||[], fc: FRAMEWORK_COLORS.ISO },
              { key: 'cabf',    label: 'CA/B Forum SC-081v3', controls: dossier.cabf_controls_met||[],    fc: FRAMEWORK_COLORS.CABF },
              { key: 'nis2',    label: 'NIS2 Article 21',     controls: dossier.nis2_controls_met||[],    fc: FRAMEWORK_COLORS.NIS2 },
            ].map(({ key, label, controls: ctrls, fc }) => (
              <div key={key} style={{ background: '#fff', border: `1px solid ${fc.border}`, borderRadius: 11, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}` }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ctrls.length > 0 ? '#00a550' : '#c0392b' }}>{ctrls.length} control{ctrls.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ctrls.length === 0
                    ? <span style={{ fontSize: 11, color: '#7a8694', fontStyle: 'italic' }}>No evidence yet</span>
                    : ctrls.map(c => (
                        <span key={c} title={controls?.[c] || c} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, cursor: 'help' }}>{c}</span>
                      ))
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Gaps */}
          {gaps.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0d1117', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Control Gaps — {gaps.length} item{gaps.length !== 1 ? 's' : ''} require attention
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
                {gaps.map(gap => <GapCard key={gap.id} gap={gap}/>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
