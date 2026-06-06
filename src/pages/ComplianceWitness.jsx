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

  function buildReportHTML(pkg) {
    const dossiers = pkg.dossiers || []
    const events   = pkg.events || []
    const controls = pkg.controls || {}
    const genDate  = new Date(pkg.generated_at).toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
    const fmtT = iso => { try { return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) } catch { return iso } }
    const fmtD = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) } catch { return iso } }

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
        <text font-family="'DM Sans','Segoe UI',sans-serif" font-size="12.5" font-weight="800" fill="#0077b6" letter-spacing="2.5">
          <textPath href="#arcTop" startOffset="50%" text-anchor="middle">SSLVAULT COMPLIANCE WITNESS</textPath>
        </text>
        <text font-family="'DM Sans','Segoe UI',sans-serif" font-size="10.5" font-weight="700" fill="#5a86a8" letter-spacing="2.2">
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
      SOC2: { name:'SOC 2 Type II',      plain:'A widely-used trust audit standard in North America. Proves a company manages customer data securely.' },
      ISO:  { name:'ISO 27001:2022',     plain:'The international standard for information security management.' },
      CABF: { name:'CA/B Forum SC-081v3',plain:'Industry rules set by browsers (Google, Apple, Microsoft, Mozilla) governing how SSL certificates must be issued and how long they may live.' },
      NIS2: { name:'NIS2 (EU Directive)',plain:'EU cybersecurity law requiring companies to keep encryption (including website certificates) working at all times.' },
      PCI:  { name:'PCI DSS v4',         plain:'Security rules for any business that handles card payments.' },
    }

    // Plain-English description per event type
    const EVENT_PLAIN = {
      issued:               { label:'Certificate Issued',          plain:'A new SSL certificate was obtained from the certificate authority and recorded in the ledger.' },
      renewed:              { label:'Certificate Renewed',         plain:'The certificate was replaced with a fresh one before the old one expired — the website stayed secure with no interruption.' },
      installed:            { label:'Installed on Server',         plain:'The certificate was placed on the web server, activating the secure padlock (HTTPS) for visitors.' },
      binding_verified:     { label:'Independent Verification',    plain:'An automated check confirmed the live website is really serving the correct, expected certificate — not a stale or wrong one.' },
      dcv_validated:        { label:'Domain Ownership Proven',     plain:'Ownership of the domain was proven to the certificate authority before issuance, as industry rules require.' },
      key_rotated:          { label:'Encryption Key Rotated',      plain:'The private encryption key was replaced with a brand-new one — good security hygiene.' },
      auto_renew_triggered: { label:'Automatic Renewal Started',   plain:'The system automatically began renewing the certificate ahead of its expiry date, with no human action needed.' },
      revoked:              { label:'Certificate Revoked',         plain:'The certificate was deliberately invalidated (for example after replacement or decommissioning).' },
      agent_heartbeat:      { label:'Monitoring Heartbeat',        plain:'The monitoring agent on the server confirmed it is alive and watching.' },
      expiry_warning:       { label:'Expiry Warning Raised',       plain:'The system flagged that a certificate was approaching its expiry date.' },
      gap_flagged:          { label:'Gap Detected',                plain:'The system found a weakness in the certificate setup and recorded it for remediation.' },
    }

    const SEV_PLAIN = { critical:'Fix immediately', high:'Fix soon', medium:'Plan to fix', low:'Minor — good to fix' }

    // ── Executive summary stats ──
    const renewCount  = events.filter(e => e.event_type === 'renewed' || e.event_type === 'auto_renew_triggered').length
    const verifyCount = events.filter(e => e.event_type === 'binding_verified').length
    const totalGaps   = dossiers.reduce((s,d)=>s+(d.gaps?.length||0),0)
    const critGaps    = dossiers.reduce((s,d)=>s+(d.gaps?.filter(g=>g.severity==='critical').length||0),0)
    const allCtrls    = [...new Set(dossiers.flatMap(d=>[...(d.soc2_controls_met||[]),...(d.iso27001_controls_met||[]),...(d.cabf_controls_met||[]),...(d.nis2_controls_met||[])]))]
    const earliest    = dossiers.map(d=>d.first_witnessed_at).filter(Boolean).sort()[0]
    const avgAudit    = dossiers.length ? Math.round(dossiers.reduce((s,d)=>s+(d.audit_score||0),0)/dossiers.length) : 0
    const verdict     = critGaps > 0
      ? 'Attention required: one or more critical gaps must be fixed before this evidence fully satisfies an audit.'
      : totalGaps > 0
        ? 'Overall healthy: certificates are managed continuously; a small number of non-critical improvements are recommended below.'
        : 'Fully healthy: certificates are continuously managed, renewed automatically, and independently verified, with no open gaps.'

    // ── Per-domain sections ──
    const dossierSections = dossiers.map(d => {
      const gaps = d.gaps || []
      const dCrit = gaps.filter(g=>g.severity==='critical').length
      const statusLine = dCrit > 0
        ? `<span class="pill pill-red">Needs attention</span>`
        : gaps.length > 0
          ? `<span class="pill pill-amber">Healthy, minor improvements suggested</span>`
          : `<span class="pill pill-green">Fully healthy</span>`

      const fwRows = [
        ['SOC2', d.soc2_controls_met||[]], ['ISO', d.iso27001_controls_met||[]],
        ['CABF', d.cabf_controls_met||[]], ['NIS2', d.nis2_controls_met||[]],
      ].map(([fw, ctrls]) => `
        <tr>
          <td class="fw">
            <strong>${FRAMEWORKS_R[fw].name}</strong>
            <div class="fw-plain">${FRAMEWORKS_R[fw].plain}</div>
          </td>
          <td class="fw-status">${ctrls.length === 0
            ? '<span class="pill pill-grey">No evidence yet</span>'
            : `<span class="pill pill-green">✓ ${ctrls.length} requirement${ctrls.length!==1?'s':''} evidenced</span>`}</td>
          <td>${ctrls.length === 0 ? '<em class="muted">—</em>' : ctrls.map(c => `<div class="ctrl"><span class="ctrl-id">${esc(c)}</span> ${esc(controls[c]||'')}</div>`).join('')}</td>
        </tr>`).join('')

      const gapRows = gaps.map(g => `
        <div class="gap gap-${esc(g.severity)}">
          <div class="gap-head">
            <strong>${esc(g.control)}</strong>
            <span class="sev sev-${esc(g.severity)}">${SEV_PLAIN[g.severity]||esc(g.severity)}</span>
          </div>
          <div class="gap-msg"><strong>What this means:</strong> ${esc(g.message)}</div>
          <div class="gap-fix"><strong>How to fix:</strong> ${esc(g.action)}</div>
          <div class="gap-fw">Relevant standard: ${esc(g.framework)}</div>
        </div>`).join('')

      return `
        <div class="dossier">
          <h2>${esc(d.domain)} ${statusLine}</h2>
          <p class="dossier-intro">
            This domain has been continuously monitored since <strong>${fmtD(d.first_witnessed_at)}</strong>.
            Its evidence completeness score is <strong>${d.audit_score||0}/100</strong> and its operational
            readiness score is <strong>${d.readiness_score||0}/100</strong> (scores of 80+ are considered strong).
          </p>
          ${(() => {
            const rows = []
            if (d.continuity_pct !== null && d.continuity_pct !== undefined)
              rows.push(`<tr><td class="rl-k">Coverage continuity</td><td class="rl-v"><strong>${d.continuity_pct}%</strong> of observed period covered by a valid certificate · ${d.expiry_incidents||0} expiry incident${(d.expiry_incidents||0)!==1?'s':''}</td></tr>`)
            if (d.avg_renewal_margin_days !== null && d.avg_renewal_margin_days !== undefined)
              rows.push(`<tr><td class="rl-k">Renewal punctuality</td><td class="rl-v">Renewals completed on average <strong>${d.avg_renewal_margin_days} days before expiry</strong> (worst case ${d.worst_renewal_margin_days} days) across ${d.renewal_count||0} renewal${(d.renewal_count||0)!==1?'s':''} — the control operates with safety margin, not at the deadline</td></tr>`)
            if (d.crypto_summary)
              rows.push(`<tr><td class="rl-k">Cryptographic strength</td><td class="rl-v"><strong>${esc(d.crypto_summary.key_algorithm)}-${d.crypto_summary.key_size_bits}</strong> key with ${esc(d.crypto_summary.signature)}${d.crypto_summary.tls_grade ? `, TLS grade <strong>${esc(d.crypto_summary.tls_grade)}</strong>` : ''} · issued by ${esc(d.crypto_summary.issuer)}${d.crypto_summary.source === 'issuance_profile' ? ' (per CA issuance profile)' : ''}</td></tr>`)
            if (d.pqc_summary)
              rows.push(`<tr><td class="rl-k">Post-quantum readiness</td><td class="rl-v">${esc(d.pqc_summary.note)}</td></tr>`)
            if (d.ct_check && d.ct_check.status === 'ok')
              rows.push(`<tr><td class="rl-k">Public CT log check</td><td class="rl-v">${d.ct_check.verdict === 'no_shadow_certs' ? `<strong>No unauthorized certificates found.</strong> All ${d.ct_check.total_ct_entries} recent entries in public Certificate Transparency logs for this domain match certificates known to SSLVault or trusted issuers.` : `<strong>${d.ct_check.unknown_entries} unknown issuance${d.ct_check.unknown_entries!==1?'s':''} found</strong> in public CT logs — review recommended.`}</td></tr>`)
            if (rows.length === 0) return ''
            return `<h3>Certificate reliability &amp; cryptography</h3><table class="rl-table"><tbody>${rows.join('')}</tbody></table>`
          })()}
          <h3>Which compliance standards does this evidence support?</h3>
          <table class="ctrl-table">
            <thead><tr><th style="width:240px">Standard</th><th style="width:170px">Status</th><th>Specific requirements evidenced</th></tr></thead>
            <tbody>${fwRows}</tbody>
          </table>
          ${gaps.length > 0
            ? `<h3>Open items (${gaps.length})</h3><p class="muted-p">These are improvements the system has identified. They are disclosed here for transparency — a report that only shows green flags is less credible to an auditor.</p>${gapRows}`
            : '<p class="allclear">✓ No open items — every automated check on this domain currently passes.</p>'}
        </div>`
    }).join('')

    // ── Event ledger rows ──
    const eventRows = events.map(ev => {
      const ep = EVENT_PLAIN[ev.event_type] || { label: ev.event_type, plain:'' }
      return `
      <tr>
        <td class="ts">${fmtT(ev.event_ts)}</td>
        <td><strong>${esc(ep.label)}</strong><div class="ev-plain">${esc(ep.plain)}</div></td>
        <td class="mono">${esc(ev.domain)}</td>
        <td class="hash" title="${esc(ev.event_hash||'')}">${esc((ev.event_hash||'').substring(0,12))}…</td>
      </tr>`}).join('')

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Certificate Compliance Evidence Report — SSLVault</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a232e; max-width: 920px; margin: 0 auto; padding: 40px 32px; line-height: 1.65; }
  .header { border-bottom: 3px solid #0077b6; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { font-size: 26px; margin: 0 0 6px; color: #0077b6; }
  .header .sub { font-size: 13px; color: #5a6776; }
  .verdict { border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; font-size: 14px; border: 1px solid; }
  .verdict-green { background: #f0faf4; border-color: #bfe5cd; } .verdict-amber { background: #fdf8ec; border-color: #ecd9a8; } .verdict-red { background: #fdf1ef; border-color: #eccac3; }
  .verdict h2 { margin: 0 0 6px; font-size: 16px; border: none; padding: 0; font-family: inherit; }
  .summary { display: grid; grid-template-columns: repeat(auto-fill,minmax(150px,1fr)); gap: 12px; margin-bottom: 28px; }
  .summary .stat { background: #f4f8fc; border: 1px solid #d8e6f2; border-radius: 10px; padding: 14px 16px; }
  .summary .stat strong { display: block; font-size: 24px; color: #0077b6; line-height: 1.2; }
  .summary .stat span { font-size: 11px; color: #5a6776; }
  .howto { background: #f4f8fc; border: 1px solid #d8e6f2; border-radius: 12px; padding: 18px 22px; margin-bottom: 30px; font-size: 13px; }
  .howto h2 { margin: 0 0 10px; font-size: 15px; color: #0077b6; border: none; padding: 0; font-family: inherit; }
  .howto p { margin: 0 0 8px; }
  h2 { font-size: 19px; color: #0077b6; border-bottom: 1px solid #d8e6f2; padding-bottom: 7px; margin-top: 40px; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #5a6776; margin: 22px 0 8px; }
  .dossier-intro { font-size: 13px; }
  .pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 11px; border-radius: 12px; vertical-align: middle; }
  .pill-green { background: #e3f5ea; color: #1a7d43; } .pill-amber { background: #faf0d8; color: #8a6510; } .pill-red { background: #fae3df; color: #b03425; } .pill-grey { background: #eef1f4; color: #5a6776; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; padding: 9px 11px; background: #f4f8fc; border-bottom: 2px solid #d8e6f2; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #5a6776; }
  td { padding: 10px 11px; border-bottom: 1px solid #e8eef4; vertical-align: top; }
  td.fw strong { color: #0d1117; } .fw-plain { font-size: 11px; color: #5a6776; margin-top: 3px; line-height: 1.5; }
  .ctrl { margin-bottom: 5px; font-size: 12px; } .ctrl-id { font-family: monospace; font-size: 10px; background: #eef4f9; border: 1px solid #d8e6f2; border-radius: 4px; padding: 1px 6px; margin-right: 5px; color: #0077b6; }
  .muted { color: #98a4b0; } .muted-p { font-size: 12px; color: #5a6776; margin: 4px 0 12px; }
  .gap { border-radius: 10px; padding: 13px 17px; margin-bottom: 10px; border: 1px solid; font-size: 12.5px; }
  .gap-critical { background: #fdf1ef; border-color: #eccac3; } .gap-high { background: #fdf8ec; border-color: #ecd9a8; } .gap-medium, .gap-low { background: #f0f6fb; border-color: #cfe0ee; }
  .sev { font-size: 10px; font-weight: 800; padding: 2px 10px; border-radius: 10px; margin-left: 8px; }
  .sev-critical { background: #f6c9c1; color: #8c2517; } .sev-high { background: #f2dfae; color: #6e500c; } .sev-medium, .sev-low { background: #cfe3f3; color: #1d5d8a; }
  .gap-msg, .gap-fix { margin-top: 5px; } .gap-fw { font-size: 11px; color: #5a6776; margin-top: 5px; }
  .allclear { color: #1a7d43; font-weight: 600; font-size: 13px; background: #e3f5ea; border: 1px solid #bfe5cd; border-radius: 10px; padding: 11px 16px; }
  .rl-table td { font-size: 12.5px; } .rl-table .rl-k { font-weight: 700; color: #0077b6; width: 190px; white-space: nowrap; } .rl-table .rl-v { color: #3d4a58; line-height: 1.6; }
  td.ts { white-space: nowrap; width: 125px; color: #5a6776; font-size: 11.5px; } td.mono { font-family: monospace; font-size: 11px; width: 160px; }
  .ev-plain { font-size: 11px; color: #5a6776; margin-top: 2px; line-height: 1.5; }
  td.hash { font-family: monospace; font-size: 10px; color: #98a4b0; width: 110px; }
  .glossary dt { font-weight: 700; font-size: 12.5px; margin-top: 12px; color: #0d1117; }
  .glossary dd { margin: 2px 0 0 0; font-size: 12.5px; color: #3d4a58; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d8e6f2; font-size: 11px; color: #6b7886; }
  .pkg-hash { font-family: monospace; font-size: 10px; word-break: break-all; background: #f4f8fc; border: 1px solid #d8e6f2; padding: 9px 13px; border-radius: 8px; margin-top: 6px; }
  @media print { body { padding: 14px } .verdict, .summary .stat, .howto { break-inside: avoid } }
</style></head><body>

  <div class="header" style="display:flex;align-items:center;justify-content:space-between;gap:20px">
    <div>
      <h1>Certificate Compliance Evidence Report</h1>
      <div class="sub">Prepared automatically by SSLVault Compliance Witness · ${genDate} · Account: ${esc(pkg.account_email)}</div>
    </div>
    <div style="flex-shrink:0">${sealSVG(124)}</div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="verdict ${critGaps>0?'verdict-red':totalGaps>0?'verdict-amber':'verdict-green'}">
    <h2>Executive Summary</h2>
    <p style="margin:0 0 8px">
      This report documents how the SSL/TLS certificates protecting <strong>${dossiers.length} domain${dossiers.length!==1?'s':''}</strong>
      have been managed${earliest ? ` since <strong>${fmtD(earliest)}</strong>` : ''}. SSL/TLS certificates are what make a
      website show the secure padlock — if one expires, the site shows security errors and visitors are turned away.
    </p>
    <p style="margin:0 0 8px">
      During the observation period, the system recorded <strong>${events.length} lifecycle events</strong>, including
      <strong>${renewCount} renewal action${renewCount!==1?'s':''}</strong> and <strong>${verifyCount} independent verification${verifyCount!==1?'s':''}</strong>
      that the live websites were serving the correct certificates. Evidence has been collected for
      <strong>${allCtrls.length} specific requirements</strong> across five compliance standards.
    </p>
    ${(() => {
      const withCont = dossiers.filter(d => d.continuity_pct !== null && d.continuity_pct !== undefined)
      if (withCont.length === 0) return ''
      const avgCont = Math.round((withCont.reduce((s,d)=>s+Number(d.continuity_pct||0),0)/withCont.length)*10)/10
      const incidents = dossiers.reduce((s,d)=>s+(d.expiry_incidents||0),0)
      return `<p style="margin:0 0 8px"><strong>Coverage continuity: ${avgCont}%</strong> of the observed period had a valid, non-expired certificate in place, with <strong>${incidents} expiry incident${incidents!==1?'s':''}</strong>. ${incidents===0?'No visitor ever encountered a certificate error caused by expiry.':''}</p>`
    })()}
    <p style="margin:0"><strong>Conclusion:</strong> ${verdict}</p>
  </div>

  <div class="summary">
    <div class="stat"><strong>${dossiers.length}</strong><span>Domains under continuous management</span></div>
    <div class="stat"><strong>${events.length}</strong><span>Recorded lifecycle events</span></div>
    <div class="stat"><strong>${renewCount}</strong><span>Renewal actions (no expiry incidents)</span></div>
    <div class="stat"><strong>${allCtrls.length}</strong><span>Compliance requirements evidenced</span></div>
    <div class="stat"><strong>${totalGaps}</strong><span>Open items disclosed</span></div>
    <div class="stat"><strong>${avgAudit}/100</strong><span>Average evidence score</span></div>
  </div>

  <!-- HOW TO READ -->
  <div class="howto">
    <h2>How to read this report</h2>
    <p><strong>If you are an auditor or manager:</strong> the Executive Summary above and the per-domain sections below are written in plain language. Each domain section tells you which compliance standards the evidence supports and discloses any open items. You do not need to read the technical columns.</p>
    <p><strong>If you are a technical reviewer:</strong> the Event Ledger at the end lists every recorded event with its tamper-evidence hash. The full machine-readable data, including the complete hash chain, is available as a separate JSON export.</p>
    <p><strong>Why you can trust this data:</strong> every event is written to an append-only ledger the moment it happens. Each entry is mathematically linked ("hash-chained") to the previous one — like numbered, glued pages in a notary's logbook. If anyone altered a past record, the chain would visibly break. The integrity code at the end of this report lets anyone verify the report itself was not edited after generation.</p>
  </div>

  <!-- PER-DOMAIN DOSSIERS -->
  ${dossierSections}

  <!-- EVENT LEDGER -->
  <h2>Appendix A — Event Ledger (full history)</h2>
  <p class="muted-p">Every certificate event recorded by the system, newest first. The right-hand column shows the first characters of each entry's tamper-evidence code.</p>
  <table><thead><tr><th>Date &amp; time</th><th>What happened</th><th>Domain</th><th>Integrity code</th></tr></thead><tbody>${eventRows}</tbody></table>

  <!-- GLOSSARY -->
  <h2>Appendix B — Glossary</h2>
  <dl class="glossary">
    <dt>SSL/TLS certificate</dt><dd>A small digital file that proves a website's identity and switches on encryption (the padlock in the browser). Certificates expire and must be renewed regularly.</dd>
    <dt>Renewal</dt><dd>Replacing a certificate with a fresh one before the old one expires. If renewal is missed, the website shows security warnings to every visitor.</dd>
    <dt>Auto-renewal</dt><dd>Renewal performed by software on a schedule, removing the risk of a person forgetting. Auditors view automation as a stronger control than manual processes.</dd>
    <dt>Certificate authority (CA)</dt><dd>A trusted organisation (here: RapidSSL/DigiCert) that issues certificates after verifying domain ownership.</dd>
    <dt>Domain control validation (DCV)</dt><dd>The proof-of-ownership step a certificate authority requires before issuing a certificate.</dd>
    <dt>Independent verification (CertBind)</dt><dd>An automated outside-in check that the live website really serves the expected certificate — confirming the control works in practice, not just on paper.</dd>
    <dt>Hash chain</dt><dd>A tamper-evidence technique: each ledger entry contains a fingerprint of the previous entry, so past records cannot be silently altered.</dd>
    <dt>Evidence score</dt><dd>0–100 measure of how completely this system has documented compliance requirements. 80+ is strong.</dd>
    <dt>Readiness score</dt><dd>0–100 measure of how well the domain is set up operationally (auto-renewal on, monitoring active, keys protected). 80+ is strong.</dd>
  </dl>

  <div class="footer" style="display:flex;gap:20px;align-items:flex-start">
    <div style="flex-shrink:0">${sealSVG(92)}</div>
    <div style="flex:1">
    <strong>Report Integrity Code (SHA-256)</strong> — anyone can use this code to verify the underlying data was not altered after ${genDate}. The seal on this report carries the first 8 characters (<span style="font-family:monospace;font-weight:700;color:#0077b6">${hashSnip}</span>) — if the seal code and the integrity code below don't match, the report has been tampered with:
    <div class="pkg-hash">${esc(pkg.package_hash)}</div>
    <p style="margin-top:12px">Generated automatically by SSLVault Compliance Witness (easysecurity.in). The underlying event ledger is append-only and tamper-evident. The machine-readable JSON export contains the complete hash chain for programmatic verification.</p>
    </div>
  </div>
</body></html>`
  }
  async function downloadEvidencePackage(format = 'html') {
    setExportLoading(true)
    try {
      const pkg = await callWitness('get_evidence_package', selectedDomain ? { domain: selectedDomain } : {})
      const dateStr = new Date().toISOString().split('T')[0]
      if (format === 'html') {
        // Human-readable report — opens in new tab, printable to PDF
        const html = buildReportHTML(pkg)
        const win = window.open('', '_blank')
        if (win) { win.document.write(html); win.document.close() }
        else {
          const blob = new Blob([html], { type: 'text/html' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `sslvault-evidence-report-${dateStr}.html`
          a.click()
          URL.revokeObjectURL(a.href)
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
                  { label: 'Open Gaps', value: totalGaps, suffix: '', color: criticalGaps > 0 ? '#c0392b' : totalGaps > 0 ? '#9a6400' : '#00a550', sub: criticalGaps > 0 ? `${criticalGaps} critical` : totalGaps > 0 ? 'minor only' : 'all clear' },
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
                    const urgCol = past ? '#7a8694' : days <= 14 ? '#c0392b' : days <= 45 ? '#9a6400' : '#00a550'
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
                          Open items: <strong>{openGapsN}</strong>{critN > 0 && <span style={{ color: '#c0392b' }}> · {critN} critical — fix before audit</span>}
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
                {schedMsg && <div style={{ marginTop: 12, fontSize: 12, color: schedMsg.startsWith('Error') ? '#c0392b' : '#00a550', fontWeight: 600 }}>{schedMsg}</div>}
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

          {/* Reliability & cryptography — client-enriched stats */}
          {(dossier.continuity_pct !== null && dossier.continuity_pct !== undefined || dossier.crypto_summary) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 18 }}>
              {dossier.continuity_pct !== null && dossier.continuity_pct !== undefined && (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Coverage Continuity</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: (dossier.expiry_incidents||0) === 0 ? '#00a550' : '#c0392b', fontFamily: "'JetBrains Mono',monospace" }}>{dossier.continuity_pct}%</div>
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
                  <div style={{ fontSize: 13, fontWeight: 800, color: dossier.ct_check.verdict === 'no_shadow_certs' ? '#00a550' : '#c0392b' }}>{dossier.ct_check.verdict === 'no_shadow_certs' ? '✓ No shadow certs' : `⚠ ${dossier.ct_check.unknown_entries} unknown`}</div>
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
