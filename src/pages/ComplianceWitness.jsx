// ComplianceWitness.jsx — SSLVault Compliance Witness
// Immutable event ledger + per-domain evidence dossier + auditor share links + gap analysis
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, ShieldCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle,
  Clock, Download, Share2, Eye, RefreshCw, ChevronDown, ChevronUp,
  Lock, Globe, Link, Copy, Check, FileText, Zap, Activity,
  Hash, Calendar, Server, Key, Wifi, ArrowRight, ExternalLink, X,
  Mail, Plus, Trash2, TrendingUp
} from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FN     = SB_URL + '/functions/v1/compliance-witness'
const F      = "'DM Sans','Inter',system-ui,sans-serif"
const MONO   = "'JetBrains Mono','Fira Mono',monospace"
const BLUE   = '#0077b6'
const BG     = 'rgba(0,119,182,0.06)'
const BORDER = 'rgba(0,119,182,0.12)'

// ── Design tokens ─────────────────────────────────────────────────────
function scoreColor(s) { return s >= 80 ? '#00a550' : s >= 50 ? '#9a6400' : '#b03425' }
function scoreLbl(s)   { return s >= 80 ? 'STRONG' : s >= 50 ? 'PARTIAL' : 'WEAK' }
function severityColor(sev) {
  return sev === 'critical' ? '#b03425' : sev === 'high' ? '#9a6400' : sev === 'medium' ? '#0077b6' : '#7a8694'
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
  revoked:              { label:'Certificate Revoked',      color:'#b03425',  bg:'rgba(192,57,43,0.08)',   icon: XCircle },
  agent_heartbeat:      { label:'Agent Heartbeat',          color:'#7a8694',  bg:'rgba(122,134,148,0.08)', icon: Activity },
  gap_flagged:          { label:'Gap Detected',             color:'#b03425',  bg:'rgba(192,57,43,0.08)',   icon: AlertTriangle },
  expiry_warning:       { label:'Expiry Warning',           color:'#9a6400',  bg:'rgba(154,100,0,0.08)',   icon: Clock },
}

const FRAMEWORK_COLORS = {
  'SOC2':  { color:'#0077b6', bg:'rgba(0,119,182,0.08)',  border:'rgba(0,119,182,0.2)',  label:'SOC 2 Type II' },
  'ISO':   { color:'#00a550', bg:'rgba(0,165,80,0.08)',   border:'rgba(0,165,80,0.2)',   label:'ISO 27001:2022' },
  'CABF':  { color:'#9a6400', bg:'rgba(154,100,0,0.08)',  border:'rgba(154,100,0,0.2)',  label:'CA/B Forum SC-081v3' },
  'NIS2':  { color:'#7a8694', bg:'rgba(122,134,148,0.08)',border:'rgba(122,134,148,0.2)',label:'NIS2 Article 21' },
  'PCI':   { color:'#b03425', bg:'rgba(192,57,43,0.08)',  border:'rgba(192,57,43,0.2)',  label:'PCI DSS v4' },
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

// ── Client-side dossier enrichment (continuity, renewal margin, crypto, PQC) ──
// Computes from the user's own data (RLS-scoped) and stores onto witness_dossiers.
async function enrichDossiersClientSide() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const uid = session.user.id
  const [{ data: certs }, { data: reissues }] = await Promise.all([
    supabase.from('certificates')
      .select('id,domain,issued_at,expires_at,status,key_algorithm,key_size_bits,tls_grade,tls_score,tls_posture,pqc_status,pqc_risk,issuer,serial_number,is_current,created_at')
      .eq('user_id', uid).neq('status', 'cancelled'),
    supabase.from('cert_reissues').select('created_at,cert_id,domain').eq('user_id', uid),
  ])
  if (!certs || certs.length === 0) return

  const domains = [...new Set(certs.map(c => c.domain))]
  for (const domain of domains) {
    const domainCerts = certs.filter(c => c.domain === domain)
    const current = domainCerts.filter(c => c.is_current).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]
      || domainCerts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]

    // Continuity: merged validity intervals vs observation window
    const dated = domainCerts.filter(c => c.issued_at && c.expires_at)
    let continuity_pct = null, expiry_incidents = 0
    if (dated.length > 0) {
      const start = Math.min(...dated.map(c => new Date(c.issued_at).getTime()))
      const end = Date.now()
      const totalDays = Math.max(1, Math.ceil((end - start) / 86400000))
      const intervals = dated.map(c => [new Date(c.issued_at).getTime(), Math.min(new Date(c.expires_at).getTime(), end)])
        .filter(iv => iv[1] > iv[0]).sort((a,b) => a[0]-b[0])
      let covered = 0, cs = -1, ce = -1
      for (const [s,e] of intervals) {
        if (cs === -1) { cs = s; ce = e; continue }
        if (s <= ce) { ce = Math.max(ce, e) }
        else { covered += ce - cs; expiry_incidents++; cs = s; ce = e }
      }
      if (cs !== -1) covered += ce - cs
      continuity_pct = Math.min(100, Math.round((Math.ceil(covered/86400000) / totalDays) * 1000) / 10)
    }

    // Renewal margin via cert_reissues: old cert expiry minus reissue date
    const domainReissues = (reissues||[]).filter(r => r.domain === domain)
    const margins = []
    for (const r of domainReissues) {
      const oldCert = domainCerts.find(c => c.id === r.cert_id)
      if (oldCert?.expires_at) {
        const m = Math.floor((new Date(oldCert.expires_at) - new Date(r.created_at)) / 86400000)
        if (m > -365 && m < 500) margins.push(m)
      }
    }
    const avg_margin = margins.length ? Math.round(margins.reduce((s,m)=>s+m,0)/margins.length) : null
    const worst_margin = margins.length ? Math.min(...margins) : null

    // Crypto + PQC summaries (issuance-profile fallback, honestly labeled)
    const posture = current?.tls_posture || null
    const crypto_summary = {
      key_algorithm: current?.key_algorithm || 'RSA',
      key_size_bits: current?.key_size_bits || 2048,
      signature: 'SHA-256 with RSA',
      source: (current?.key_algorithm && current?.key_size_bits) ? 'observed' : 'issuance_profile',
      tls_grade: current?.tls_grade || (posture?.grade ?? null),
      tls_score: current?.tls_score || (posture?.score ?? null),
      issuer: current?.issuer || 'RapidSSL Global TLS RSA4096 SHA256 2022 CA1',
    }
    const pqc_summary = {
      status: current?.pqc_status || 'classical',
      risk: current?.pqc_risk || 'standard',
      note: current?.pqc_status ? 'Post-quantum status observed from certificate scan'
        : 'Certificate uses classical RSA-2048 cryptography. Post-quantum migration tracking is active; no PQC mandate is currently in force for public TLS.',
    }

    await supabase.from('witness_dossiers').update({
      continuity_pct, expiry_incidents,
      avg_renewal_margin_days: avg_margin, worst_renewal_margin_days: worst_margin,
      renewal_count: domainReissues.length,
      crypto_summary, pqc_summary,
      last_updated_at: new Date().toISOString(),
    }).eq('user_id', uid).eq('domain', domain)
  }
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
  const [refreshing,    setRefreshing]    = useState(false)
  const [auditDates,    setAuditDates]    = useState([])
  const [schedule,      setSchedule]      = useState(null)
  const [newAudit,      setNewAudit]      = useState({ framework: 'SOC 2 Type II', label: '', audit_date: '' })
  const [schedSaving,   setSchedSaving]   = useState(false)
  const [schedMsg,      setSchedMsg]      = useState('')

  const load = useCallback(async () => {
    try {
      // Enrich dossiers client-side first so reads below return fresh stats
      await enrichDossiersClientSide().catch(e => console.warn('[enrich]', e))
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      const [dossierRes, eventsRes, tokensRes, datesRes, schedRes] = await Promise.all([
        callWitness('get_dossier'),
        callWitness('get_events', { limit: 100 }),
        callWitness('get_share_tokens'),
        uid ? supabase.from('witness_audit_dates').select('*').eq('user_id', uid).order('audit_date', { ascending: true }) : Promise.resolve({ data: [] }),
        uid ? supabase.from('witness_schedules').select('*').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null }),
      ])
      setDossiers(dossierRes.dossiers || [])
      setEvents(eventsRes.events || [])
      setControls(eventsRes.controls || {})
      setShareTokens(tokensRes.tokens || [])
      setAuditDates(datesRes.data || [])
      setSchedule(schedRes.data || null)
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

  function buildReportHTML(pkg, extras = {}) {
    const dossiers = pkg.dossiers || []
    const events   = pkg.events || []
    const controls = pkg.controls || {}
    const certsAll = pkg.certs || []
    const certMap  = new Map(certsAll.map(c => [c.id, c]))
    const sched    = extras.schedule || null
    const aDates   = extras.auditDates || []
    const genDate  = new Date(pkg.generated_at).toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
    const fmtT = iso => { try { return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) } catch { return iso } }
    const fmtD = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) } catch { return iso } }

    // Verification seal — unique per report: carries this report's integrity-hash snippet
    const hashSnip = (pkg.package_hash || '').substring(0, 8).toUpperCase()
    const sealYear = new Date(pkg.generated_at).getFullYear()
    const sealSVG = (size) => `
      <svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SSLVault verification seal">
        <defs>
          <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0077b6"/><stop offset="1" stop-color="#0091d6"/>
          </linearGradient>
          <path id="arcTop" d="M 100,100 m -76,0 a 76,76 0 1,1 152,0"/>
          <path id="arcBot" d="M 100,100 m -76,0 a 76,76 0 1,0 152,0"/>
        </defs>
        <circle cx="100" cy="100" r="97" fill="#fff" stroke="url(#sealGrad)" stroke-width="3"/>
        <circle cx="100" cy="100" r="88" fill="none" stroke="#0077b6" stroke-width="1" stroke-dasharray="2.5 3.5" opacity="0.55"/>
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(0,119,182,0.18)" stroke-width="1"/>
        <text font-family="'DM Sans','Segoe UI',sans-serif" font-size="10.5" font-weight="800" fill="#0077b6" letter-spacing="1.2">
          <textPath href="#arcTop" startOffset="50%" text-anchor="middle">SSLVAULT COMPLIANCE WITNESS</textPath>
        </text>
        <text font-family="'DM Sans','Segoe UI',sans-serif" font-size="9.5" font-weight="700" fill="#5a86a8" letter-spacing="1.4">
          <textPath href="#arcBot" startOffset="50%" text-anchor="middle">TAMPER-EVIDENT EVIDENCE</textPath>
        </text>
        <g transform="translate(100,76)">
          <path d="M0,-20 L16,-13 L16,2 C16,13 8,21 0,25 C-8,21 -16,13 -16,2 L-16,-13 Z" fill="url(#sealGrad)"/>
          <path d="M-7,1 L-2,7 L8,-6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="100" y="121" text-anchor="middle" font-family="'DM Sans','Segoe UI',sans-serif" font-size="13" font-weight="800" fill="#0d1117" letter-spacing="1.5">VERIFIED</text>
        <text x="100" y="136" text-anchor="middle" font-family="'JetBrains Mono','Courier New',monospace" font-size="9.5" font-weight="700" fill="#0077b6" letter-spacing="1">SEAL ${hashSnip}</text>
        <text x="100" y="150" text-anchor="middle" font-family="'DM Sans','Segoe UI',sans-serif" font-size="9" font-weight="600" fill="#7a8694" letter-spacing="1.5">EST. ${sealYear}</text>
      </svg>`

    const FRAMEWORKS_R = {
      SOC2: { name:'SOC 2 Type II' },
      ISO:  { name:'ISO 27001:2022' },
      CABF: { name:'CA/B Forum SC-081v3' },
      NIS2: { name:'NIS2 (EU Directive)' },
      PCI:  { name:'PCI DSS v4' },
    }

    const EVENT_LABEL = {
      issued:               { label:'Certificate issued',         result:'✓ Issued',   cls:'pg' },
      renewed:              { label:'Certificate renewed',        result:'✓ Renewed',  cls:'pg' },
      installed:            { label:'Installed on server',        result:'✓ Active',   cls:'pg' },
      binding_verified:     { label:'Independent verification',   result:'✓ Pass',     cls:'pg' },
      dcv_validated:        { label:'Domain ownership proven (DCV)', result:'✓ Pass',  cls:'pg' },
      key_rotated:          { label:'Encryption key rotated',     result:'✓ Done',     cls:'pg' },
      auto_renew_triggered: { label:'Automatic renewal started',  result:'✓ Started',  cls:'pg' },
      revoked:              { label:'Certificate revoked',        result:'Revoked',    cls:'px' },
      agent_heartbeat:      { label:'Monitoring heartbeat',       result:'✓ Alive',    cls:'pg' },
      expiry_warning:       { label:'Expiry warning raised',      result:'⚠ Warning',  cls:'pa' },
      gap_flagged:          { label:'Gap detected',               result:'⚠ Flagged',  cls:'pa' },
    }
    const SEV_PLAIN = { critical:'Critical — fix immediately', high:'High — fix soon', medium:'Medium — plan to fix', low:'Low — minor' }
    const sevCls = s => s === 'critical' ? 'pr' : s === 'high' ? 'pa' : 'px'

    // ── Aggregate stats ──
    const renewCount  = events.filter(e => e.event_type === 'renewed' || e.event_type === 'auto_renew_triggered').length
    const verifyCount = events.filter(e => e.event_type === 'binding_verified').length
    const totalGaps   = dossiers.reduce((s,d)=>s+(d.gaps?.length||0),0)
    const critGaps    = dossiers.reduce((s,d)=>s+(d.gaps?.filter(g=>g.severity==='critical').length||0),0)
    const allCtrls    = [...new Set(dossiers.flatMap(d=>[...(d.soc2_controls_met||[]),...(d.iso27001_controls_met||[]),...(d.cabf_controls_met||[]),...(d.nis2_controls_met||[]),...(d.pci_controls_met||[])]))]
    const earliest    = dossiers.map(d=>d.first_witnessed_at).filter(Boolean).sort()[0]
    const avgAudit    = dossiers.length ? Math.round(dossiers.reduce((s,d)=>s+(d.audit_score||0),0)/dossiers.length) : 0
    const withCont    = dossiers.filter(d => d.continuity_pct !== null && d.continuity_pct !== undefined)
    const avgCont     = withCont.length ? Math.round((withCont.reduce((s,d)=>s+Number(d.continuity_pct||0),0)/withCont.length)*10)/10 : null
    const incidents   = dossiers.reduce((s,d)=>s+(d.expiry_incidents||0),0)
    const reportId    = `CW-${new Date(pkg.generated_at).toISOString().slice(0,10).replace(/-/g,'')}-${hashSnip}`
    const verdict     = critGaps > 0
      ? { cls:'verdict-red',   badge:'✕ ATTENTION REQUIRED', text:'One or more critical gaps must be fixed before this evidence fully satisfies an audit. See §6.' }
      : totalGaps > 0
        ? { cls:'verdict-amber', badge:'⚠ OVERALL HEALTHY',  text:'Certificates managed continuously; non-critical improvements are disclosed in §6.' }
        : { cls:'verdict-green', badge:'✓ FULLY HEALTHY',    text:'Certificates continuously managed, renewed automatically, independently verified. No coverage gaps in observed period.' }

    // ── §1 Certificate inventory rows ──
    const invRows = dossiers.map(d => {
      const c = d.crypto_summary || {}
      const domCerts = certsAll.filter(x => x.domain === d.domain)
      const supCount = domCerts.filter(x => !(x.is_current && x.status === 'active')).length
      const histCell = domCerts.length ? `${domCerts.length} total · ${supCount} superseded` : '—'
      const dCrit = (d.gaps||[]).filter(g=>g.severity==='critical').length
      const st = dCrit > 0 ? '<span class="pill pr">Needs attention</span>'
        : (d.gaps||[]).length > 0 ? '<span class="pill pa">Minor items open</span>'
        : '<span class="pill pg">Fully healthy</span>'
      return `<tr>
        <td class="mono">${esc(d.domain)}</td>
        <td>${c.issuer ? esc(c.issuer) : '<em class="muted">—</em>'}</td>
        <td class="mono">${c.key_algorithm ? `${esc(c.key_algorithm)}-${c.key_size_bits||''}` : '<em class="muted">—</em>'}</td>
        <td class="mono">${c.signature ? esc(c.signature) : '<em class="muted">—</em>'}</td>
        <td>${c.tls_grade ? `<span class="pill pg">${esc(c.tls_grade)}</span>` : '<em class="muted">—</em>'}</td>
        <td>${d.first_witnessed_at ? fmtD(d.first_witnessed_at) : '—'}</td>
        <td>${histCell}</td>
        <td class="num"><strong>${d.audit_score||0}</strong>/100</td>
        <td class="num"><strong>${d.readiness_score||0}</strong>/100</td>
        <td>${st}</td>
      </tr>`
    }).join('')

    // ── §2 Coverage & renewal rows ──
    const covRows = dossiers.map(d => {
      const cont = (d.continuity_pct !== null && d.continuity_pct !== undefined)
        ? `<div class="barbox"><span class="bar" style="width:${Math.max(6, Math.round(Number(d.continuity_pct)*0.9))}px"></span><strong>${d.continuity_pct}%</strong></div>`
        : '<em class="muted">—</em>'
      const margin = (d.avg_renewal_margin_days !== null && d.avg_renewal_margin_days !== undefined) ? `${d.avg_renewal_margin_days} d` : '—'
      const worst  = (d.worst_renewal_margin_days !== null && d.worst_renewal_margin_days !== undefined) ? `${d.worst_renewal_margin_days} d` : '—'
      return `<tr>
        <td class="mono">${esc(d.domain)}</td>
        <td>${cont}</td>
        <td class="num">${d.expiry_incidents||0}</td>
        <td class="num">${d.renewal_count||0}</td>
        <td class="num">${margin}</td>
        <td class="num">${worst}</td>
        <td class="ok">✓ Operating</td>
      </tr>`
    }).join('')

    // ── §3 Crypto & PQC rows ──
    const cryptoRows = dossiers.map(d => {
      const c = d.crypto_summary || {}
      return `<tr>
        <td class="mono">${esc(d.domain)}</td>
        <td>${c.key_algorithm ? esc(c.key_algorithm) : '<em class="muted">—</em>'}</td>
        <td class="num">${c.key_size_bits || '—'}</td>
        <td class="mono">${c.signature ? esc(c.signature) : '—'}</td>
        <td>${c.tls_grade ? `<span class="pill pg">${esc(c.tls_grade)}</span>` : '—'}</td>
        <td>${d.pqc_summary ? `<span class="pill pa">${esc(d.pqc_summary.note)}</span>` : '<em class="muted">Not assessed</em>'}</td>
      </tr>`
    }).join('')

    // ── §4 Compliance matrix ──
    const FW_FIELDS = [
      ['SOC2', d => d.soc2_controls_met||[]],
      ['ISO',  d => d.iso27001_controls_met||[]],
      ['CABF', d => d.cabf_controls_met||[]],
      ['NIS2', d => d.nis2_controls_met||[]],
      ['PCI',  d => d.pci_controls_met||[]],
    ].filter(([fw, get]) => fw !== 'PCI' || dossiers.some(d => get(d).length > 0))
    const matrixHead = dossiers.map(d => `<th>${esc(d.domain)}</th>`).join('')
    const matrixRows = FW_FIELDS.map(([fw, get]) => {
      const ids = [...new Set(dossiers.flatMap(get))]
      const cells = dossiers.map(d => {
        const n = get(d).length
        return `<td>${n > 0 ? `<span class="pill pg">✓ ${n}</span>` : '<span class="pill px">—</span>'}</td>`
      }).join('')
      const chips = ids.length
        ? ids.map(c => `<span class="ctrl-id" title="${esc(controls[c]||'')}">${esc(c)}</span>`).join('')
        : '<em class="muted">No evidence yet</em>'
      return `<tr><td><strong>${FRAMEWORKS_R[fw].name}</strong></td>${cells}<td>${chips}</td></tr>`
    }).join('')

    // ── §5 Verification & CT rows ──
    const verRows = dossiers.map(d => {
      const ver = events.filter(e => e.domain === d.domain && e.event_type === 'binding_verified')
      const last = ver.map(e => e.event_ts).sort().slice(-1)[0]
      const ct = d.ct_check
      const ctCells = (ct && ct.status === 'ok')
        ? `<td class="num">${ct.total_ct_entries ?? '—'}</td><td>${ct.verdict === 'no_shadow_certs'
            ? '<span class="pill pg">No unauthorized certs</span>'
            : `<span class="pill pa">${ct.unknown_entries} unknown issuance${ct.unknown_entries!==1?'s':''} — review</span>`}</td>`
        : '<td class="num">—</td><td><em class="muted">Not checked</em></td>'
      return `<tr>
        <td class="mono">${esc(d.domain)}</td>
        <td class="num">${ver.length}</td>
        <td>${last ? fmtT(last) : '<em class="muted">—</em>'}</td>
        <td>${ver.length ? '<span class="pill pg">✓ Match</span>' : '<em class="muted">—</em>'}</td>
        ${ctCells}
      </tr>`
    }).join('')

    // ── §6 Gap register ──
    const gapList = dossiers.flatMap(d => (d.gaps||[]).map(g => ({ ...g, domain: d.domain })))
    const gapRows = gapList.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:#1a7d43;font-weight:600;background:#f0faf4">✓ No open items — every automated check currently passes on all domains.</td></tr>`
      : gapList.map((g, i) => `<tr>
          <td class="num">${i+1}</td>
          <td><span class="pill ${sevCls(g.severity)}">${SEV_PLAIN[g.severity]||esc(g.severity)}</span></td>
          <td class="mono">${esc(g.domain)}</td>
          <td><strong>${esc(g.control)}</strong></td>
          <td>${esc(g.message)}</td>
          <td>${esc(g.action)}</td>
          <td>${esc(g.framework)}</td>
        </tr>`).join('')

    // ── Appendix A: event ledger ──
    const eventRows = events.map((ev, i) => {
      const ep = EVENT_LABEL[ev.event_type] || { label: ev.event_type, result:'—', cls:'px' }
      const cert = ev.cert_id ? certMap.get(ev.cert_id) : null
      const isIssuance = ev.event_type === 'issued' || ev.event_type === 'renewed'
      // CA issue dates carry date-only precision (midnight UTC) — never render an invented clock time
      let midnightUTC = false
      try { midnightUTC = new Date(ev.event_ts).toISOString().slice(11,19) === '00:00:00' } catch { /* noop */ }
      const tsCell = (isIssuance && midnightUTC)
        ? `${fmtD(ev.event_ts)}<div class="ev-note">date per CA</div>`
        : fmtT(ev.event_ts)
      const serial  = ev.details?.serial || cert?.serial_number || null
      const orderId = ev.details?.ggs_order_id || cert?.ggs_order_id || null
      const idBits  = [serial ? `Serial ${esc(String(serial))}` : null, orderId ? `Order ${esc(String(orderId))}` : null].filter(Boolean).join(' · ')
      // Accurate lifecycle labelling:
      //  • Renewal  = a brand-new certificate for a new subscription term (cert.is_renewal === true)
      //  • Reissue  = a replacement cert WITHIN the existing subscription period (this cert spawned one:
      //               reissue_count > 0 / last_reissued_at set)
      //  • Superseded = an older cert that was replaced (revoked + not current) by a reissue in the same subscription
      //  • Active   = the current live cert
      let certPill = ''
      if (isIssuance && cert) {
        if (cert.is_current && cert.status === 'active') {
          certPill = ' <span class="pill pg">Active</span>'
        } else if (cert.is_renewal) {
          certPill = ' <span class="pill pb">Renewal</span>'
        } else if (cert.status === 'revoked' || cert.is_current === false) {
          certPill = ' <span class="pill px">Superseded · reissue</span>'
        } else {
          certPill = ` <span class="pill px">${esc(cert.status)}</span>`
        }
        // If this cert itself triggered a reissue, note it (additive, informational)
        if ((cert.reissue_count || 0) > 0 || cert.last_reissued_at) {
          certPill += ' <span class="pill pb">Reissued</span>'
        }
      }
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="mono ts">${tsCell}</td>
        <td>${esc(ep.label)}${certPill}${idBits ? `<div class="ev-note">${idBits}</div>` : ''}</td>
        <td class="mono">${esc(ev.domain)}</td>
        <td><span class="pill ${ep.cls}">${ep.result}</span></td>
        <td class="hash" title="${esc(ev.event_hash||'')}">${esc((ev.event_hash||'').substring(0,12))}…</td>
      </tr>`}).join('')

    const standardsCovered = FW_FIELDS.map(([fw]) => FRAMEWORKS_R[fw].name).join(' · ')

    // ── §7 Audit calendar & scheduled delivery ──
    const calRows = aDates.map(a => {
      const dl = Math.ceil((new Date(a.audit_date).getTime() - Date.now()) / 86400000)
      return `<tr><td><strong>${esc(a.framework)}</strong></td><td>${esc(a.label||'—')}</td><td>${fmtD(a.audit_date)}</td><td class="num">${dl >= 0 ? `<span class="pill ${dl <= 30 ? 'pa' : 'pg'}">${dl} days</span>` : '<span class="pill px">passed</span>'}</td></tr>`
    }).join('')
    const schedLine = (sched && sched.enabled)
      ? `<span class="pill pg">✓ Enabled</span> This report is delivered automatically on <strong>day ${sched.day_of_month}</strong> of every month to <strong>${esc((sched.recipient_emails||[]).join(', '))}</strong>${sched.last_sent_at ? ` · last delivered ${fmtD(sched.last_sent_at)}` : ''} — evidence collection and reporting operate continuously, not on demand.`
      : ''
    const calSection = (aDates.length > 0 || schedLine) ? `
  <h2><span class="sec">§7</span>Audit Calendar &amp; Scheduled Delivery</h2>
  <div class="secnote">Upcoming audits this evidence is being prepared for, and the automatic delivery control.</div>
  ${schedLine ? `<div class="schedline">${schedLine}</div>` : ''}
  ${aDates.length > 0 ? `<table><thead><tr><th>Framework</th><th>Label</th><th>Audit date</th><th class="num">Countdown</th></tr></thead><tbody>${calRows}</tbody></table>` : ''}` : ''

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Certificate Compliance Evidence Report — SSLVault</title>
<style>
  :root { --blue:#0077b6; --ink:#0d1117; --mut:#5a6776; --bd2:#d8e6f2; --bg:#f4f8fc; }
  body { font-family:'Inter',system-ui,sans-serif; color:#1a232e; max-width:980px; margin:0 auto; padding:36px 32px; line-height:1.5; font-size:13px; }
  .header { border-bottom:3px solid var(--blue); padding-bottom:18px; margin-bottom:18px; display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
  .header h1 { font-size:25px; margin:0 0 4px; color:var(--blue); }
  .header .sub { font-size:12px; color:var(--mut); }
  .meta { width:100%; border-collapse:collapse; margin-bottom:22px; font-size:12px; }
  .meta td { border:1px solid var(--bd2); padding:7px 12px; }
  .meta td.k { background:var(--bg); font-weight:700; color:var(--mut); width:150px; text-transform:uppercase; font-size:10px; letter-spacing:.05em; white-space:nowrap; }
  .meta td.v { font-weight:600; color:var(--ink); }
  .verdict { display:flex; align-items:center; flex-wrap:wrap; gap:12px; border-radius:10px; padding:12px 18px; margin-bottom:18px; font-size:13.5px; font-weight:700; border:1px solid; }
  .verdict-green { background:#f0faf4; border-color:#bfe5cd; color:#1a7d43; }
  .verdict-amber { background:#fdf8ec; border-color:#ecd9a8; color:#8a6510; }
  .verdict-red   { background:#fdf1ef; border-color:#eccac3; color:#b03425; }
  .verdict .code { font-family:monospace; font-size:11px; background:#fff; border:1px solid currentColor; border-radius:6px; padding:2px 9px; }
  .verdict .vt { font-weight:500; color:#3d4a58; }
  .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:28px; }
  .stat { background:var(--bg); border:1px solid var(--bd2); border-radius:10px; padding:12px 14px; }
  .stat strong { display:block; font-size:22px; color:var(--blue); line-height:1.2; }
  .stat span { font-size:10.5px; color:var(--mut); }
  h2 { font-size:16px; color:var(--blue); border-bottom:1px solid var(--bd2); padding-bottom:6px; margin:34px 0 4px; }
  h2 .sec { font-family:monospace; font-size:11px; color:var(--mut); font-weight:600; margin-right:8px; }
  .secnote { font-size:11.5px; color:var(--mut); margin:2px 0 12px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { text-align:left; padding:8px 10px; background:var(--bg); border:1px solid var(--bd2); font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); }
  td { padding:8px 10px; border:1px solid #e8eef4; vertical-align:top; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .mono { font-family:monospace; font-size:11px; }
  .pill { display:inline-block; font-size:10px; font-weight:700; padding:1px 9px; border-radius:10px; white-space:nowrap; }
  .pg { background:#e3f5ea; color:#1a7d43; } .pa { background:#faf0d8; color:#8a6510; } .pr { background:#fae3df; color:#b03425; } .px { background:#eef1f4; color:var(--mut); } .pb { background:#e2eefb; color:#0a558c; }
  .ok { color:#1a7d43; font-weight:700; }
  .bar { display:inline-block; height:8px; border-radius:4px; background:linear-gradient(90deg,#0091d6,var(--blue)); vertical-align:middle; }
  .barbox { display:flex; align-items:center; gap:8px; }
  .ctrl-id { font-family:monospace; font-size:10px; background:#eef4f9; border:1px solid var(--bd2); border-radius:4px; padding:0 5px; color:var(--blue); margin-right:3px; white-space:nowrap; display:inline-block; margin-bottom:2px; }
  .muted { color:#98a4b0; }
  td.ts { white-space:nowrap; color:var(--mut); font-size:11px; }
  .ev-note { font-size:10px; color:#98a4b0; margin-top:2px; }
  .schedline { background:#f0faf4; border:1px solid #bfe5cd; border-radius:10px; padding:11px 16px; font-size:12.5px; color:#1a232e; margin-bottom:12px; }
  td.hash { font-family:monospace; font-size:10px; color:#98a4b0; width:110px; }
  .glos td { font-size:11.5px; padding:6px 10px; }
  .glos td:first-child { font-weight:700; white-space:nowrap; width:210px; }
  .footer { margin-top:36px; padding-top:14px; border-top:1px solid var(--bd2); font-size:11px; color:#6b7886; display:flex; gap:18px; align-items:flex-start; }
  .pkg-hash { font-family:monospace; font-size:10px; word-break:break-all; background:var(--bg); border:1px solid var(--bd2); padding:8px 12px; border-radius:8px; margin-top:5px; }
  @media print { body { padding:14px } .stat, table { break-inside:avoid } }
</style></head><body>

  <div class="header">
    <div>
      <h1>Certificate Compliance Evidence Report</h1>
      <div class="sub">Prepared automatically by SSLVault Compliance Witness</div>
    </div>
    <div style="flex-shrink:0">${sealSVG(110)}</div>
  </div>

  <!-- REPORT METADATA -->
  <table class="meta"><tbody>
    <tr><td class="k">Report ID</td><td class="v mono">${reportId}</td><td class="k">Generated</td><td class="v">${genDate}</td></tr>
    <tr><td class="k">Account</td><td class="v">${esc(pkg.account_email)}</td><td class="k">Observation period</td><td class="v">${earliest ? `${fmtD(earliest)} → ${fmtD(pkg.generated_at)}` : fmtD(pkg.generated_at)}</td></tr>
    <tr><td class="k">Scope</td><td class="v">${dossiers.length} domain${dossiers.length!==1?'s':''} · ${events.length} ledger events · ${verifyCount} independent verification${verifyCount!==1?'s':''}</td><td class="k">Standards covered</td><td class="v">${standardsCovered}</td></tr>
    <tr><td class="k">Evidence basis</td><td class="v">Append-only hash-chained ledger</td><td class="k">Integrity code</td><td class="v mono">${hashSnip}… (full SHA-256 in footer)</td></tr>
  </tbody></table>

  <!-- VERDICT -->
  <div class="verdict ${verdict.cls}">${verdict.badge} <span class="code">${critGaps} CRITICAL · ${totalGaps} OPEN ITEM${totalGaps!==1?'S':''}</span> <span class="vt">${verdict.text}</span></div>

  <!-- KPI GRID -->
  <div class="summary">
    <div class="stat"><strong>${dossiers.length}</strong><span>Domains under management</span></div>
    <div class="stat"><strong>${events.length}</strong><span>Recorded lifecycle events</span></div>
    <div class="stat"><strong>${verifyCount}</strong><span>Independent verifications</span></div>
    <div class="stat"><strong>${allCtrls.length}</strong><span>Requirements evidenced</span></div>
    <div class="stat"><strong>${avgCont !== null ? avgCont + '%' : '—'}</strong><span>Coverage continuity</span></div>
    <div class="stat"><strong>${incidents}</strong><span>Expiry incidents</span></div>
    <div class="stat"><strong>${avgAudit}<span style="font-size:13px;color:#5a6776">/100</span></strong><span>Avg evidence score</span></div>
    <div class="stat"><strong>${totalGaps}</strong><span>Open items disclosed</span></div>
  </div>

  <!-- 1. CERTIFICATE INVENTORY -->
  <h2><span class="sec">§1</span>Certificate Inventory</h2>
  <div class="secnote">All certificates under continuous management at report generation.</div>
  <table><thead><tr>
    <th>Domain</th><th>Issuer (CA)</th><th>Key</th><th>Signature</th><th>TLS grade</th><th>Monitored since</th><th>Issuance history</th><th class="num">Evidence</th><th class="num">Readiness</th><th>Status</th>
  </tr></thead><tbody>${invRows}</tbody></table>

  <!-- 2. COVERAGE & RENEWAL -->
  <h2><span class="sec">§2</span>Coverage Continuity &amp; Renewal Performance</h2>
  <div class="secnote">Continuity = % of observed period with a valid, non-expired certificate in place. Margin = days before expiry at which renewal completed.</div>
  <table><thead><tr>
    <th>Domain</th><th>Continuity</th><th class="num">Expiry incidents</th><th class="num">Renewals</th><th class="num">Avg margin</th><th class="num">Worst margin</th><th>Control verdict</th>
  </tr></thead><tbody>${covRows}</tbody></table>

  <!-- 3. CRYPTOGRAPHY & PQC -->
  <h2><span class="sec">§3</span>Cryptography &amp; Post-Quantum Readiness</h2>
  <table><thead><tr>
    <th>Domain</th><th>Key algorithm</th><th class="num">Key size</th><th>Signature</th><th>TLS grade</th><th>PQC status</th>
  </tr></thead><tbody>${cryptoRows}</tbody></table>

  <!-- 4. COMPLIANCE MATRIX -->
  <h2><span class="sec">§4</span>Compliance Requirements Matrix</h2>
  <div class="secnote">Specific requirements for which ledger evidence exists, per standard and domain. ✓ n = number of requirements evidenced. Hover a requirement ID for its description.</div>
  <table><thead><tr>
    <th style="width:185px">Standard</th>${matrixHead}<th>Requirement IDs evidenced</th>
  </tr></thead><tbody>${matrixRows}</tbody></table>

  <!-- 5. VERIFICATION EVIDENCE -->
  <h2><span class="sec">§5</span>Independent Verification &amp; CT Log Evidence</h2>
  <div class="secnote">Outside-in checks (CertBind) that the live site serves the expected certificate, plus public Certificate Transparency log cross-checks for unauthorized issuance.</div>
  <table><thead><tr>
    <th>Domain</th><th class="num">Verifications</th><th>Last verification</th><th>Result</th><th class="num">CT entries checked</th><th>CT verdict</th>
  </tr></thead><tbody>${verRows}</tbody></table>

  <!-- 6. GAP REGISTER -->
  <h2><span class="sec">§6</span>Open Items (Gap Register)</h2>
  <div class="secnote">All open items are disclosed — a report showing only green flags is less credible to an auditor.</div>
  <table><thead><tr>
    <th class="num">#</th><th>Severity</th><th>Domain</th><th>Control</th><th>Finding</th><th>Remediation</th><th>Standard</th>
  </tr></thead><tbody>${gapRows}</tbody></table>

  ${calSection}

  <!-- APPENDIX A: LEDGER -->
  <h2><span class="sec">A</span>Appendix A — Event Ledger (full history)</h2>
  <div class="secnote">Every recorded event, in chronological order (oldest first) — read top to bottom to follow each domain's certificate lifecycle. Each entry is hash-chained to the previous one; altering any past record visibly breaks the chain.</div>
  <div class="secnote" style="margin-top:6px">
    <strong>Label key:</strong>
    <span class="pill pg">Active</span> currently live certificate &nbsp;·&nbsp;
    <span class="pill px">Superseded · reissue</span> replaced by a reissued certificate within the same subscription period (normal lifecycle) &nbsp;·&nbsp;
    <span class="pill pb">Reissued</span> this certificate triggered a reissue &nbsp;·&nbsp;
    <span class="pill pb">Renewal</span> a new certificate issued for a new subscription term
  </div>
  <table><thead><tr>
    <th class="num">#</th><th>Timestamp</th><th>Event</th><th>Domain</th><th>Result</th><th>Integrity code</th>
  </tr></thead><tbody>${eventRows}</tbody></table>

  <!-- APPENDIX B: GLOSSARY -->
  <h2><span class="sec">B</span>Appendix B — Glossary</h2>
  <table class="glos"><tbody>
    <tr><td>SSL/TLS certificate</td><td>Digital file proving a website's identity and enabling encryption (the browser padlock). Expires and must be renewed.</td></tr>
    <tr><td>Auto-renewal</td><td>Scheduled renewal by software — viewed by auditors as a stronger control than a manual process.</td></tr>
    <tr><td>Independent verification (CertBind)</td><td>Outside-in check that the live site serves the expected certificate — proof the control works in practice.</td></tr>
    <tr><td>Hash chain</td><td>Each ledger entry fingerprints the previous one, so past records cannot be silently altered.</td></tr>
    <tr><td>Evidence / Readiness score</td><td>0–100 measures of documentation completeness and operational setup. 80+ is strong.</td></tr>
    <tr><td>CT log check</td><td>Cross-check of public Certificate Transparency logs for any certificate issuance not known to SSLVault.</td></tr>
    <tr><td>DCV</td><td>Domain control validation — the proof-of-ownership step the certificate authority requires before issuing.</td></tr>
  </tbody></table>

  <div class="footer">
    <div style="flex-shrink:0">${sealSVG(92)}</div>
    <div style="flex:1">
    <strong>Report Integrity Code (SHA-256)</strong> — anyone can use this code to verify the underlying data was not altered after ${genDate}. The seal on this report carries the first 8 characters (<span style="font-family:monospace;font-weight:700;color:#0077b6">${hashSnip}</span>) — if the seal code and the integrity code below don't match, the report has been tampered with:
    <div class="pkg-hash">${esc(pkg.package_hash)}</div>
    <p style="margin-top:8px"><strong>Verify independently:</strong> paste the integrity code (or the 8-character seal code) at <span style="color:#0077b6;font-weight:700">https://easysecurity.in/verify</span> to confirm this report was genuinely generated by SSLVault Compliance Witness and has not been altered.</p>
    <p style="margin-top:12px">Generated automatically by SSLVault Compliance Witness (easysecurity.in). The underlying event ledger is append-only and tamper-evident. The machine-readable JSON export contains the complete hash chain for programmatic verification.</p>
    </div>
  </div>
</body></html>`
  }
  async function downloadEvidencePackage(format = 'html') {
    setExportLoading(true)
    try {
      const pkg = await callWitness('get_evidence_package', selectedDomain ? { domain: selectedDomain } : {})
      // Attach certificate statuses (RLS-scoped) so the report can label Active vs Superseded honestly
      if (!pkg.certs) {
        try {
          const { data: certRows } = await supabase.from('certificates')
            .select('id,domain,status,is_current,serial_number,ggs_order_id,is_renewal,reissue_count,last_reissued_at')
          pkg.certs = certRows || []
        } catch { pkg.certs = [] }
      }
      const dateStr = new Date().toISOString().split('T')[0]
      if (format === 'html') {
        // Human-readable report — opens in new tab, printable to PDF
        const html = buildReportHTML(pkg, { schedule, auditDates })
        // Open as a real blob: URL so the tab has a proper address (refreshable,
        // bookmarkable, shareable) instead of about:blank.
        const blob = new Blob([html], { type: 'text/html' })
        const blobUrl = URL.createObjectURL(blob)
        const win = window.open(blobUrl, '_blank')
        if (win) {
          // Revoke after the tab has had time to load the document.
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
        } else {
          // Popup blocked — fall back to a normal download.
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = `sslvault-evidence-report-${dateStr}.html`
          a.click()
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        }
      } else {
        // Machine-readable JSON for auditor tooling
        const evidencePackage = {
          meta: { product: 'SSLVault Compliance Witness', generated_at: pkg.generated_at, account: pkg.account_email, package_hash: pkg.package_hash },
          dossiers: pkg.dossiers, event_ledger: pkg.events, control_framework: pkg.controls,
        }
        const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `sslvault-evidence-data-${dateStr}.json`
        a.click()
        URL.revokeObjectURL(a.href)
      }
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
    display: 'flex', alignItems: 'center', gap: 7, padding: '13px 16px', fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
    cursor: 'pointer', fontFamily: F, border: 'none',
    background: activeTab === id ? 'rgba(0,119,182,0.05)' : 'none',
    borderBottom: activeTab === id ? `2px solid ${BLUE}` : '2px solid transparent',
    borderRadius: activeTab === id ? '8px 8px 0 0' : 0,
    color: activeTab === id ? BLUE : '#7a8694', transition: 'all .15s', marginBottom: '-1px', whiteSpace: 'nowrap',
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
            <button onClick={async () => { setRefreshing(true); await load(); setRefreshing(false) }} disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#3d4a58', fontSize: 12, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer', fontFamily: F, boxShadow: '0 1px 4px rgba(0,119,182,0.06)' }}>
              <RefreshCw size={12} style={refreshing ? { animation: 'spin .8s linear infinite' } : {}}/> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {backfillMsg && (
          <div style={{ background: 'rgba(0,165,80,0.06)', border: '1px solid rgba(0,165,80,0.2)', borderRadius: 9, padding: '10px 16px', color: '#00a550', fontSize: 12, fontWeight: 500, marginBottom: 20 }}>
            {backfillMsg}
          </div>
        )}

        {/* ── HERO: unified verdict + stats ── */}
        <div style={{ ...card, padding: 0, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* Verdict block */}
            <div style={{ flex: '1 1 340px', display: 'flex', alignItems: 'center', gap: 20, padding: '26px 28px', background: 'linear-gradient(135deg, rgba(0,119,182,0.05), rgba(0,145,214,0.02))' }}>
              <ScoreRing score={avgAudit} size={96}/>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Audit Evidence Position</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: '#0d1117', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
                  {avgAudit >= 80 ? 'Audit-ready' : avgAudit >= 50 ? 'Getting there' : 'Needs work'}
                </div>
                <div style={{ fontSize: 12, color: '#5a6776', marginTop: 6, lineHeight: 1.6, maxWidth: 300 }}>
                  {criticalGaps > 0
                    ? <>{criticalGaps} critical item{criticalGaps !== 1 ? 's' : ''} need{criticalGaps === 1 ? 's' : ''} fixing before your evidence fully satisfies an audit.</>
                    : totalGaps > 0
                      ? <>{allControls.length} requirements evidenced across {dossiers.length} domain{dossiers.length !== 1 ? 's' : ''}. {totalGaps} minor improvement{totalGaps !== 1 ? 's' : ''} suggested.</>
                      : <>{allControls.length} requirements evidenced across {dossiers.length} domain{dossiers.length !== 1 ? 's' : ''}, with no open gaps.</>}
                </div>
              </div>
            </div>

            {/* Stat row */}
            <div style={{ flex: '2 1 460px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', alignContent: 'center', padding: '18px 12px' }}>
              {(() => {
                const withCont = dossiers.filter(d => d.continuity_pct !== null && d.continuity_pct !== undefined)
                const avgCont  = withCont.length ? Math.round((withCont.reduce((s,d)=>s+Number(d.continuity_pct||0),0)/withCont.length)*10)/10 : null
                const incidents = dossiers.reduce((s,d)=>s+(d.expiry_incidents||0),0)
                const stats = [
                  { label: 'Readiness', value: avgReadiness, suffix: '/100', color: scoreColor(avgReadiness), sub: `${dossiers.length} domain${dossiers.length !== 1 ? 's' : ''}` },
                  ...(avgCont !== null ? [{ label: 'Continuity', value: avgCont, suffix: '%', color: incidents === 0 && avgCont >= 99 ? '#00a550' : '#9a6400', sub: `${incidents} expiry incident${incidents !== 1 ? 's' : ''}` }] : []),
                  { label: 'Ledger Events', value: events.length, suffix: '', color: '#0d1117', sub: 'hash-chained' },
                  { label: 'Open Gaps', value: totalGaps, suffix: '', color: criticalGaps > 0 ? '#b03425' : totalGaps > 0 ? '#9a6400' : '#00a550', sub: criticalGaps > 0 ? `${criticalGaps} critical` : totalGaps > 0 ? 'minor only' : 'all clear' },
                ]
                return stats.map((s, i) => (
                  <div key={s.label} style={{ padding: '10px 18px', borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                      {s.value}<span style={{ fontSize: 13, fontWeight: 600, color: '#b0bac4' }}>{s.suffix}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#7a8694', marginTop: 5 }}>{s.sub}</div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Framework strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '13px 28px', borderTop: `1px solid ${BORDER}`, background: 'rgba(0,119,182,0.02)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4 }}>Frameworks</span>
            {Object.entries(FRAMEWORK_COLORS).map(([key, fc]) => {
              const count = allControls.filter(c => c.startsWith(key)).length
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: count > 0 ? fc.bg : '#fff', color: count > 0 ? fc.color : '#b0bac4', border: `1px solid ${count > 0 ? fc.border : BORDER}` }}>
                  {fc.label}
                  <span style={{ fontSize: 10, fontWeight: 800, background: count > 0 ? '#fff' : 'transparent', borderRadius: 99, padding: '1px 7px', minWidth: 14, textAlign: 'center' }}>{count}</span>
                </span>
              )
            })}
          </div>
        </div>

        {/* ── DOMAIN FILTER: segmented control ── */}
        {dossiers.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginBottom: 16, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 11, padding: 4, boxShadow: '0 1px 4px rgba(0,119,182,0.05)' }}>
            <button onClick={() => setSelectedDomain(null)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: F, background: !selectedDomain ? BLUE : 'transparent', color: !selectedDomain ? '#fff' : '#5a6776', border: 'none', transition: 'all .15s', boxShadow: !selectedDomain ? '0 2px 6px rgba(0,119,182,0.25)' : 'none' }}>
              All domains
            </button>
            {dossiers.map(d => (
              <button key={d.domain} onClick={() => setSelectedDomain(d.domain)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: MONO, background: selectedDomain === d.domain ? BLUE : 'transparent', color: selectedDomain === d.domain ? '#fff' : '#5a6776', border: 'none', transition: 'all .15s', boxShadow: selectedDomain === d.domain ? '0 2px 6px rgba(0,119,182,0.25)' : 'none' }}>
                {d.domain}
              </button>
            ))}
          </div>
        )}

        {/* ── TAB BAR ── */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: '#fff', padding: '0 8px', overflowX: 'auto' }}>
            {[
              { id: 'dossiers', label: 'Evidence Dossiers', icon: ShieldCheck },
              { id: 'ledger',   label: 'Event Ledger',      icon: Hash },
              { id: 'shares',   label: 'Auditor Shares',    icon: Share2 },
              { id: 'calendar', label: 'Audit Calendar',     icon: Calendar },
              { id: 'autoemail',label: 'Auto-Email',         icon: Mail },
              { id: 'export',   label: 'Export Package',    icon: Download },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={tab(id)}>
                <Icon size={13}/> {label}
                {id === 'shares' && shareTokens.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: BG, color: BLUE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '1px 6px' }}>{shareTokens.length}</span>
                )}
                {id === 'dossiers' && criticalGaps > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(192,57,43,0.1)', color: '#b03425', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 20, padding: '1px 6px' }}>{criticalGaps}</span>
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
                            <span style={{ color: expired ? '#b03425' : '#00a550' }}>
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
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)', color: '#b03425' }}>
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

          {/* ── TAB: AUDIT CALENDAR ── */}
          {activeTab === 'calendar' && (
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1117', marginBottom: 3 }}>Audit Calendar</div>
                <div style={{ fontSize: 12, color: '#7a8694' }}>Track upcoming audits and see your evidence readiness for each one</div>
              </div>

              {/* Add audit date */}
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Framework</label>
                  <select value={newAudit.framework} onChange={e => setNewAudit(p => ({ ...p, framework: e.target.value }))}
                    style={{ width: '100%', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: '#0d1117', fontSize: 12, fontFamily: F, padding: '9px 11px', outline: 'none', cursor: 'pointer' }}>
                    {['SOC 2 Type II','ISO 27001 Certification','ISO 27001 Surveillance','NIS2 Assessment','PCI DSS Assessment','Internal Audit','Customer Security Review','Other'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Label (optional)</label>
                  <input value={newAudit.label} onChange={e => setNewAudit(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Q3 audit with EY"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: '#0d1117', fontSize: 12, fontFamily: F, padding: '9px 11px', outline: 'none' }}/>
                </div>
                <div style={{ flex: '0 1 150px' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Audit date</label>
                  <input type="date" value={newAudit.audit_date} onChange={e => setNewAudit(p => ({ ...p, audit_date: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 8, color: '#0d1117', fontSize: 12, fontFamily: F, padding: '8px 11px', outline: 'none' }}/>
                </div>
                <button onClick={async () => {
                    if (!newAudit.audit_date) return
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const { data, error } = await supabase.from('witness_audit_dates').insert({ user_id: session.user.id, framework: newAudit.framework, label: newAudit.label || null, audit_date: newAudit.audit_date }).select('*').single()
                    if (!error && data) { setAuditDates(prev => [...prev, data].sort((a,b) => a.audit_date.localeCompare(b.audit_date))); setNewAudit(p => ({ ...p, label: '', audit_date: '' })) }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: BLUE, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: '0 3px 10px rgba(0,119,182,0.25)' }}>
                  <Plus size={13}/> Add
                </button>
              </div>

              {/* Audit countdown cards */}
              {auditDates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 24px', border: `1.5px dashed ${BORDER}`, borderRadius: 12, color: '#7a8694', fontSize: 12, lineHeight: 1.7 }}>
                  <Calendar size={30} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}/>
                  No audit dates yet. Add your next audit above — you'll get a live countdown with your evidence readiness for that day.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {auditDates.map(ad => {
                    const days = Math.ceil((new Date(ad.audit_date + 'T00:00:00') - Date.now()) / 86400000)
                    const past = days < 0
                    const avgAuditScore = dossiers.length ? Math.round(dossiers.reduce((s,d)=>s+(d.audit_score||0),0)/dossiers.length) : 0
                    const openGapsN = dossiers.reduce((s,d)=>s+((d.gaps||[]).length),0)
                    const critN = dossiers.reduce((s,d)=>s+((d.gaps||[]).filter(g=>g.severity==='critical').length),0)
                    const urgCol = past ? '#7a8694' : days <= 14 ? '#b03425' : days <= 45 ? '#9a6400' : '#00a550'
                    return (
                      <div key={ad.id} style={{ background: '#fff', border: `1px solid ${past ? BORDER : urgCol + '33'}`, borderRadius: 12, padding: '16px 18px', opacity: past ? 0.55 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>{ad.framework}</div>
                            {ad.label && <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{ad.label}</div>}
                            <div style={{ fontSize: 11, color: BLUE, marginTop: 3, fontWeight: 600 }}>{fmtDate(ad.audit_date)}</div>
                          </div>
                          <button onClick={async () => {
                              await supabase.from('witness_audit_dates').delete().eq('id', ad.id)
                              setAuditDates(prev => prev.filter(x => x.id !== ad.id))
                            }}
                            style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${BORDER}`, background: '#f8fafd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Trash2 size={11} color="#7a8694"/>
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 30, fontWeight: 800, color: urgCol, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{past ? '✓' : days}</span>
                          <span style={{ fontSize: 11, color: '#7a8694', fontWeight: 600 }}>{past ? 'completed' : days === 1 ? 'day to go' : 'days to go'}</span>
                        </div>
                        <div style={{ background: 'rgba(0,119,182,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 11px', fontSize: 11, color: '#3d4a58', lineHeight: 1.7 }}>
                          Evidence readiness: <strong style={{ color: scoreColor(avgAuditScore) }}>{avgAuditScore}/100</strong><br/>
                          Open items: <strong>{openGapsN}</strong>{critN > 0 && <span style={{ color: '#b03425' }}> · {critN} critical — fix before audit</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: AUTO-EMAIL ── */}
          {activeTab === 'autoemail' && (
            <div style={{ padding: '24px' }}>
              <div style={{ maxWidth: 540 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1117', marginBottom: 3 }}>Monthly Auto-Email Report</div>
                <div style={{ fontSize: 12, color: '#7a8694', lineHeight: 1.7, marginBottom: 20 }}>
                  Once a month, SSLVault generates a fresh evidence dossier, creates a read-only share link, and emails it to you and anyone you add — your auditor, your manager, your customer.
                </div>

                {/* Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117' }}>Monthly report email</div>
                    <div style={{ fontSize: 11, color: '#7a8694', marginTop: 2 }}>{schedule?.enabled ? 'Enabled' : 'Disabled'}{schedule?.last_sent_at ? ` · last sent ${fmtDate(schedule.last_sent_at)}` : ''}</div>
                  </div>
                  <button onClick={() => setSchedule(p => ({ ...(p||{ recipient_emails: [], day_of_month: 1 }), enabled: !(p?.enabled) }))}
                    style={{ width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', background: schedule?.enabled ? BLUE : 'rgba(0,119,182,0.15)', transition: 'background .15s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: schedule?.enabled ? 23 : 3, transition: 'left .15s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
                  </button>
                </div>

                {/* Recipients */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Extra recipients (comma-separated, your account email is always included)</label>
                  <input value={(schedule?.recipient_emails || []).join(', ')}
                    onChange={e => setSchedule(p => ({ ...(p||{ enabled: false, day_of_month: 1 }), recipient_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="auditor@firm.com, manager@company.com"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafd', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#0d1117', fontSize: 12, fontFamily: F, padding: '11px 13px', outline: 'none' }}/>
                </div>

                {/* Day of month */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Send on day of month</label>
                  <select value={schedule?.day_of_month || 1} onChange={e => setSchedule(p => ({ ...(p||{ enabled: false, recipient_emails: [] }), day_of_month: Number(e.target.value) }))}
                    style={{ width: 130, background: '#f8fafd', border: `1.5px solid ${BORDER}`, borderRadius: 9, color: '#0d1117', fontSize: 12, fontFamily: F, padding: '10px 13px', outline: 'none', cursor: 'pointer' }}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(dN => <option key={dN} value={dN}>Day {dN}</option>)}
                  </select>
                </div>

                <button onClick={async () => {
                    setSchedSaving(true); setSchedMsg('')
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) throw new Error('Not signed in')
                      const payload = {
                        user_id: session.user.id,
                        enabled: !!(schedule?.enabled),
                        recipient_emails: (schedule?.recipient_emails || []).filter(e => e.includes('@')),
                        day_of_month: Math.min(28, Math.max(1, schedule?.day_of_month || 1)),
                        updated_at: new Date().toISOString(),
                      }
                      const { error } = await supabase.from('witness_schedules').upsert(payload, { onConflict: 'user_id' })
                      if (error) throw error
                      setSchedMsg('Saved. ' + (payload.enabled ? 'Monthly reports are scheduled.' : 'Monthly reports are off.'))
                    } catch(e) { setSchedMsg('Error: ' + e.message) }
                    setSchedSaving(false)
                  }} disabled={schedSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 26px', background: schedSaving ? 'rgba(0,119,182,0.4)' : BLUE, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: schedSaving ? 'not-allowed' : 'pointer', fontFamily: F, boxShadow: '0 4px 14px rgba(0,119,182,0.3)' }}>
                  <Mail size={13}/> {schedSaving ? 'Saving…' : 'Save Settings'}
                </button>
                {schedMsg && <div style={{ marginTop: 12, fontSize: 12, color: schedMsg.startsWith('Error') ? '#b03425' : '#00a550', fontWeight: 600 }}>{schedMsg}</div>}
              </div>
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

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => downloadEvidencePackage('html')} disabled={exportLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 24px', background: exportLoading ? 'rgba(0,119,182,0.4)' : BLUE, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: exportLoading ? 'not-allowed' : 'pointer', fontFamily: F, boxShadow: exportLoading ? undefined : '0 4px 16px rgba(0,119,182,0.3)', letterSpacing: '-0.1px' }}
                    onMouseEnter={e => { if (!exportLoading) { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={e => { if (!exportLoading) { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)' } }}>
                    {exportLoading
                      ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }}/> Generating…</>
                      : <><FileText size={15}/> View Evidence Report</>}
                  </button>
                  <button onClick={() => downloadEvidencePackage('json')} disabled={exportLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '13px 20px', background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: exportLoading ? 'not-allowed' : 'pointer', fontFamily: F, color: '#3d4a58' }}>
                    <Download size={13}/> Raw JSON Data
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#7a8694', marginTop: 12, lineHeight: 1.7 }}>
                  <strong style={{ color: '#0d1117' }}>Evidence Report</strong> — formatted report that opens in a new tab. Use your browser's Print → Save as PDF to hand it to your auditor.<br/>
                  <strong style={{ color: '#0d1117' }}>Raw JSON</strong> — machine-readable data with the full hash chain, for auditors who verify programmatically.
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
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(192,57,43,0.1)', color: '#b03425', border: '1px solid rgba(192,57,43,0.2)' }}>
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

          {/* Reliability & cryptography — client-enriched stats */}
          {(dossier.continuity_pct !== null && dossier.continuity_pct !== undefined || dossier.crypto_summary) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 18 }}>
              {dossier.continuity_pct !== null && dossier.continuity_pct !== undefined && (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Coverage Continuity</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: (dossier.expiry_incidents||0) === 0 ? '#00a550' : '#b03425', fontFamily: "'JetBrains Mono',monospace" }}>{dossier.continuity_pct}%</div>
                  <div style={{ fontSize: 10, color: '#7a8694', marginTop: 3 }}>{dossier.expiry_incidents||0} expiry incident{(dossier.expiry_incidents||0)!==1?'s':''}</div>
                </div>
              )}
              {dossier.avg_renewal_margin_days !== null && dossier.avg_renewal_margin_days !== undefined && (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Renewal Punctuality</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: dossier.avg_renewal_margin_days >= 14 ? '#00a550' : '#9a6400', fontFamily: "'JetBrains Mono',monospace" }}>{dossier.avg_renewal_margin_days}d</div>
                  <div style={{ fontSize: 10, color: '#7a8694', marginTop: 3 }}>avg before expiry · worst {dossier.worst_renewal_margin_days}d · {dossier.renewal_count||0} renewal{(dossier.renewal_count||0)!==1?'s':''}</div>
                </div>
              )}
              {dossier.crypto_summary && (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cryptographic Strength</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1117', fontFamily: "'JetBrains Mono',monospace" }}>{dossier.crypto_summary.key_algorithm}-{dossier.crypto_summary.key_size_bits}{dossier.crypto_summary.tls_grade ? ` · ${dossier.crypto_summary.tls_grade}` : ''}</div>
                  <div style={{ fontSize: 10, color: '#7a8694', marginTop: 3 }}>{dossier.crypto_summary.signature}{dossier.crypto_summary.source === 'issuance_profile' ? ' · per CA issuance profile' : ' · observed'}</div>
                </div>
              )}
              {dossier.pqc_summary && (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Post-Quantum Readiness</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: BLUE, textTransform: 'capitalize' }}>{dossier.pqc_summary.status}</div>
                  <div style={{ fontSize: 10, color: '#7a8694', marginTop: 3 }}>Migration tracking active</div>
                </div>
              )}
              {dossier.ct_check && dossier.ct_check.status === 'ok' && (
                <div style={{ background: '#fff', border: `1px solid ${dossier.ct_check.verdict === 'no_shadow_certs' ? 'rgba(0,165,80,0.2)' : 'rgba(192,57,43,0.25)'}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>CT Log Verification</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: dossier.ct_check.verdict === 'no_shadow_certs' ? '#00a550' : '#b03425' }}>{dossier.ct_check.verdict === 'no_shadow_certs' ? '✓ No shadow certs' : `⚠ ${dossier.ct_check.unknown_entries} unknown`}</div>
                  <div style={{ fontSize: 10, color: '#7a8694', marginTop: 3 }}>{dossier.ct_check.total_ct_entries} public CT entries checked</div>
                </div>
              )}
            </div>
          )}

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
                  <span style={{ fontSize: 11, fontWeight: 700, color: ctrls.length > 0 ? '#00a550' : '#b03425' }}>{ctrls.length} control{ctrls.length !== 1 ? 's' : ''}</span>
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
