// RenewalCalendar.jsx
// Phase 3 — Customer Renewal Calendar
// Shows per-cert renewal event schedule with live status.
// Follows Design v2 system (v2-* CSS classes + --v2-* tokens).
// Uses supabase client directly — no new edge functions needed.

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, RefreshCw, CheckCircle, Clock, AlertTriangle,
  RotateCcw, Shield, ChevronRight, Bell, BellOff, X,
  AlertCircle, Check, Info, Zap, Globe
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtDateShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

const daysFromNow = (dateStr) => {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

const daysUntil = (dateStr) => {
  const d = daysFromNow(dateStr)
  if (d === null) return '—'
  if (d < 0) return `${Math.abs(d)}d ago`
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `in ${d}d`
}

// ── Event type metadata ───────────────────────────────────────────────
const EVENT_META = {
  cert_warning_30d: { label: 'Cert warning',    color: '#f59e0b', dot: '#f59e0b', icon: Bell,          urgency: 0 },
  cert_warning_14d: { label: 'Cert warning',    color: '#f97316', dot: '#f97316', icon: Bell,          urgency: 1 },
  cert_warning_7d:  { label: 'Cert warning',    color: '#ef4444', dot: '#ef4444', icon: Bell,          urgency: 2 },
  cert_warning_1d:  { label: 'Final warning',   color: '#dc2626', dot: '#dc2626', icon: AlertTriangle, urgency: 3 },
  cert_reissue:     { label: 'Auto-reissue',    color: '#10b981', dot: '#10b981', icon: RotateCcw,     urgency: 0 },
  sub_warning_30d:  { label: 'Sub warning',     color: '#f59e0b', dot: '#f59e0b', icon: Calendar,      urgency: 0 },
  sub_warning_14d:  { label: 'Sub warning',     color: '#f97316', dot: '#f97316', icon: Calendar,      urgency: 1 },
  sub_warning_7d:   { label: 'Sub warning',     color: '#ef4444', dot: '#ef4444', icon: Calendar,      urgency: 2 },
  sub_warning_1d:   { label: 'Sub ends tomorrow', color: '#dc2626', dot: '#dc2626', icon: AlertTriangle, urgency: 3 },
  sub_end:          { label: 'Subscription ends', color: '#6b7280', dot: '#6b7280', icon: X,            urgency: 0 },
}

const STATUS_META = {
  pending:   { label: 'Scheduled', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  executing: { label: 'Running',   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  sent:      { label: 'Done',      color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  skipped:   { label: 'Skipped',   color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
  failed:    { label: 'Failed',    color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
}

// ── Timeline event row ────────────────────────────────────────────────
function EventRow({ ev, isToday, isPast }) {
  const meta  = EVENT_META[ev.event_type] || { label: ev.event_type, color: '#6b7280', dot: '#6b7280', icon: Clock, urgency: 0 }
  const sMeta = STATUS_META[ev.status] || STATUS_META.pending
  const Icon  = meta.icon
  const days  = daysFromNow(ev.scheduled_date)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
      opacity: isPast && ev.status === 'skipped' ? 0.45 : 1,
    }}>
      {/* Timeline line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: ev.status === 'sent' ? meta.dot : ev.status === 'failed' ? '#ef4444' : ev.status === 'executing' ? '#f59e0b' : isToday ? meta.dot : isPast ? '#d1d5db' : 'var(--v2-surface-2)',
          border: `2px solid ${ev.status === 'sent' ? meta.dot : ev.status === 'failed' ? '#ef4444' : ev.status === 'executing' ? '#f59e0b' : isToday ? meta.dot : '#d1d5db'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isToday && ev.status === 'pending' ? `0 0 0 4px ${meta.dot}22` : 'none',
        }}>
          {ev.status === 'sent'
            ? <Check size={10} strokeWidth={3} color="white" />
            : ev.status === 'failed'
            ? <X size={9} strokeWidth={2.5} color="white" />
            : ev.status === 'executing'
            ? <RefreshCw size={9} strokeWidth={2} color="white" style={{ animation: 'nm-spin 0.8s linear infinite' }} />
            : <Icon size={9} strokeWidth={2} color={isToday || ev.status === 'pending' ? 'white' : '#9ca3af'} />
          }
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)' }}>{meta.label}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            textTransform: 'uppercase', letterSpacing: '0.4px',
            background: sMeta.bg, color: sMeta.color, border: `0.5px solid ${sMeta.border}`,
          }}>{sMeta.label}</span>
          {isToday && ev.status === 'pending' && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              background: '#eff6ff', color: '#2563eb', border: '0.5px solid #bfdbfe',
              textTransform: 'uppercase', letterSpacing: '0.3px' }}>Today</span>
          )}
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
            {fmtDate(ev.scheduled_date)}
            {days !== null && <span style={{ color: 'var(--v2-text-3)', marginLeft: 4 }}>· {daysUntil(ev.scheduled_date)}</span>}
          </span>
          {ev.retry_count > 0 && (
            <span style={{ fontSize: 10, color: '#ef4444' }}>· retry {ev.retry_count}/3</span>
          )}
        </div>
        {ev.error_message && (
          <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3, fontFamily: 'JetBrains Mono, monospace',
            background: '#fef2f2', padding: '3px 6px', borderRadius: 4, border: '0.5px solid #fecaca' }}>
            {ev.error_message.slice(0, 100)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cert header card ──────────────────────────────────────────────────
function CertCard({ cert, events, selected, onSelect }) {
  const nextEvent = events.find(e => e.status === 'pending')
  const hasFailure = events.some(e => e.status === 'failed')
  const hasActionRequired = cert.action_required

  const daysExpiry = daysFromNow(cert.expires_at)
  const daysSubEnd = daysFromNow(cert.subscription_end_date)

  const urgencyColor = hasActionRequired || (daysExpiry !== null && daysExpiry <= 7)
    ? '#ef4444'
    : daysExpiry !== null && daysExpiry <= 14
    ? '#f59e0b'
    : 'var(--v2-green)'

  const rowStatus = hasActionRequired ? 'amber' : hasFailure ? 'amber' : daysExpiry !== null && daysExpiry <= 7 ? 'amber' : 'green'

  return (
    <div
      className={`v2-list-row status-${rowStatus} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="v2-row-icon" style={{ background: hasActionRequired ? '#ef4444' : '#10b981' }}>
        {hasActionRequired ? <AlertTriangle size={13} color="white" /> : <Shield size={13} color="white" />}
      </div>
      <div className="v2-row-body">
        <div className="v2-row-title-line">
          <span className="v2-row-title v2-mono">{cert.domain}</span>
          {hasActionRequired && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              background: '#fef2f2', color: '#ef4444', border: '0.5px solid #fecaca',
              textTransform: 'uppercase', letterSpacing: '0.3px' }}>Action required</span>
          )}
        </div>
        <div className="v2-row-meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: urgencyColor, fontWeight: 600 }}>
            {daysExpiry !== null
              ? daysExpiry <= 0 ? 'Expired' : `Cert: ${daysExpiry}d left`
              : 'No expiry'}
          </span>
          {daysSubEnd !== null && (
            <>
              <span className="v2-row-meta-sep">·</span>
              <span style={{ fontSize: 10, color: 'var(--v2-text-3)' }}>Sub: {daysSubEnd}d</span>
            </>
          )}
          {nextEvent && (
            <>
              <span className="v2-row-meta-sep">·</span>
              <span style={{ fontSize: 10, color: 'var(--v2-text-3)' }}>
                Next: {fmtDateShort(nextEvent.scheduled_date)}
              </span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--v2-text-3)', flexShrink: 0 }} />
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────
function CertDetail({ cert, events, prefs, onRefresh, onTogglePref }) {
  if (!cert) return (
    <div className="v2-detail" style={{ textAlign: 'center', padding: '40px 16px' }}>
      <Calendar size={28} strokeWidth={1.4} style={{ color: 'var(--v2-text-3)', marginBottom: 8 }} />
      <div style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>Select a certificate to see its renewal schedule</div>
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const daysExpiry = daysFromNow(cert.expires_at)
  const daysSubEnd = daysFromNow(cert.subscription_end_date)
  const pendingCount = events.filter(e => e.status === 'pending').length
  const sentCount    = events.filter(e => e.status === 'sent').length

  // Group events: past (sent/skipped) | today | upcoming (pending/executing)
  const todayEvents   = events.filter(e => e.scheduled_date === today)
  const pastEvents    = events.filter(e => e.scheduled_date < today && e.status !== 'pending')
  const upcomingEvents = events.filter(e => e.scheduled_date > today || (e.scheduled_date === today && e.status === 'pending'))

  return (
    <div className="v2-detail mobile-collapse open">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: cert.action_required ? '#fef2f2' : '#f0fdf4',
          border: `0.5px solid ${cert.action_required ? '#fecaca' : '#bbf7d0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={18} strokeWidth={1.8} color={cert.action_required ? '#ef4444' : '#10b981'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)', fontFamily: 'JetBrains Mono, monospace' }}>{cert.domain}</div>
          <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
            {pendingCount} event{pendingCount !== 1 ? 's' : ''} scheduled · {sentCount} completed
          </div>
        </div>
        <button className="v2-btn v2-btn-sm" onClick={onRefresh}>
          <RefreshCw size={11} strokeWidth={2} /> Refresh
        </button>
      </div>

      {/* Action required banner */}
      {cert.action_required && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start'
        }}>
          <AlertTriangle size={14} strokeWidth={2} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 2 }}>Manual action required</div>
            <div style={{ fontSize: 11, color: '#ef4444', lineHeight: 1.5 }}>
              {cert.action_required_reason || 'Auto-reissue failed after 3 attempts. Please manually reissue this certificate.'}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'var(--v2-surface-2)', borderRadius: 8, padding: '10px 12px', border: '0.5px solid var(--v2-border)' }}>
          <div style={{ fontSize: 10, color: 'var(--v2-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Cert expires</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: daysExpiry !== null && daysExpiry <= 7 ? '#ef4444' : daysExpiry !== null && daysExpiry <= 30 ? '#f59e0b' : 'var(--v2-text)' }}>
            {daysExpiry !== null ? (daysExpiry <= 0 ? 'Expired' : `${daysExpiry}d`) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 2 }}>{fmtDate(cert.expires_at)}</div>
        </div>
        <div style={{ background: 'var(--v2-surface-2)', borderRadius: 8, padding: '10px 12px', border: '0.5px solid var(--v2-border)' }}>
          <div style={{ fontSize: 10, color: 'var(--v2-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Subscription</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: daysSubEnd !== null && daysSubEnd <= 30 ? '#f59e0b' : 'var(--v2-text)' }}>
            {daysSubEnd !== null ? (daysSubEnd <= 0 ? 'Ended' : `${daysSubEnd}d`) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 2 }}>{fmtDate(cert.subscription_end_date)}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="v2-section-label" style={{ marginBottom: 8 }}>Renewal schedule</div>

      <div style={{ borderLeft: '1.5px solid var(--v2-border)', paddingLeft: 12, marginLeft: 10 }}>
        {events.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--v2-text-3)', padding: '12px 0' }}>No events scheduled.</div>
        )}

        {/* Today */}
        {todayEvents.map(ev => (
          <EventRow key={ev.id} ev={ev} isToday={true} isPast={false} />
        ))}

        {/* Upcoming */}
        {upcomingEvents.filter(e => e.scheduled_date !== today).map(ev => (
          <EventRow key={ev.id} ev={ev} isToday={false} isPast={false} />
        ))}

        {/* Past separator */}
        {pastEvents.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 4px', opacity: 0.5 }}>
              <div style={{ flex: 1, height: '0.5px', background: 'var(--v2-border)' }} />
              <span style={{ fontSize: 9, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700, flexShrink: 0 }}>Completed</span>
              <div style={{ flex: 1, height: '0.5px', background: 'var(--v2-border)' }} />
            </div>
            {pastEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} isToday={false} isPast={true} />
            ))}
          </>
        )}
      </div>

      {/* Notification preferences */}
      {prefs && (
        <>
          <div className="v2-section-label" style={{ marginTop: 16, marginBottom: 8 }}>Email notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'notify_cert_expiry',    label: 'Certificate expiry warnings' },
              { key: 'notify_cert_reissued',  label: 'Reissue confirmation' },
              { key: 'notify_sub_expiry',     label: 'Subscription expiry warnings' },
              { key: 'notify_reissue_failed', label: 'Failure alerts' },
            ].map(({ key, label }) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: 6, background: 'var(--v2-surface-2)',
                border: '0.5px solid var(--v2-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {prefs[key] !== false
                    ? <Bell size={11} strokeWidth={2} color="var(--v2-accent)" />
                    : <BellOff size={11} strokeWidth={2} color="var(--v2-text-3)" />}
                  <span style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>{label}</span>
                </div>
                <button
                  onClick={() => onTogglePref(key, prefs[key] !== false)}
                  style={{
                    padding: '2px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                    background: prefs[key] !== false ? 'var(--v2-accent-bg)' : 'var(--v2-surface)',
                    color: prefs[key] !== false ? 'var(--v2-accent)' : 'var(--v2-text-3)',
                  }}
                >
                  {prefs[key] !== false ? 'On' : 'Off'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="v2-empty">
      <div className="v2-empty-icon"><Calendar size={26} strokeWidth={1.6} /></div>
      <div className="v2-empty-title">No active certificates</div>
      <div className="v2-empty-desc">Issue a certificate to see its renewal calendar here.</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function RenewalCalendar({ user }) {
  const [certs, setCerts]         = useState([])
  const [eventsMap, setEventsMap] = useState({}) // cert_id → events[]
  const [prefs, setPrefs]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')

  const userId = user?.id

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Load active certs (is_current = true)
      const { data: certsData } = await supabase
        .from('certificates')
        .select('id,domain,expires_at,subscription_end_date,status,action_required,action_required_reason,reissue_count')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_current', true)
        .order('expires_at', { ascending: true })

      const certList = certsData || []
      setCerts(certList)

      if (certList.length > 0) {
        // Load renewal events for all certs
        const certIds = certList.map(c => c.id)
        const { data: evData } = await supabase
          .from('renewal_events')
          .select('id,cert_id,event_type,scheduled_date,status,retry_count,error_message,triggered_by')
          .in('cert_id', certIds)
          .order('scheduled_date', { ascending: true })

        const map = {}
        for (const ev of (evData || [])) {
          if (!map[ev.cert_id]) map[ev.cert_id] = []
          map[ev.cert_id].push(ev)
        }
        setEventsMap(map)

        if (!selectedId && certList.length > 0) setSelectedId(certList[0].id)
      }

      // Load notification prefs
      const { data: prefData } = await supabase
        .from('user_settings')
        .select('notify_cert_expiry,notify_cert_reissued,notify_sub_expiry,notify_reissue_failed,email_alerts')
        .eq('user_id', userId)
        .single()

      setPrefs(prefData || {
        notify_cert_expiry: true, notify_cert_reissued: true,
        notify_sub_expiry: true, notify_reissue_failed: true, email_alerts: true
      })
    } catch (e) {
      console.error('[RenewalCalendar] load error:', e)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const togglePref = async (key, currentlyOn) => {
    const newVal = !currentlyOn
    setSaving(true)
    setPrefs(p => ({ ...p, [key]: newVal }))
    try {
      const { error } = await supabase.from('user_settings').upsert({
        user_id: userId, [key]: newVal, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      if (error) throw error
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 1500)
    } catch (e) {
      setPrefs(p => ({ ...p, [key]: currentlyOn }))
      setSaveMsg('Error saving')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  const selCert   = certs.find(c => c.id === selectedId) || null
  const selEvents = selectedId ? (eventsMap[selectedId] || []) : []

  const actionRequiredCount = certs.filter(c => c.action_required).length
  const nearExpiryCount = certs.filter(c => {
    const d = daysFromNow(c.expires_at)
    return d !== null && d <= 14 && d > 0
  }).length

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="v2-h1">Renewal Calendar</h1>
            <p className="v2-subtitle">
              {certs.length} certificate{certs.length !== 1 ? 's' : ''} monitored
              {actionRequiredCount > 0 && ` · ${actionRequiredCount} action required`}
              {nearExpiryCount > 0 && ` · ${nearExpiryCount} expiring soon`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 11, color: saveMsg.includes('Error') ? '#ef4444' : '#10b981', fontWeight: 500 }}>
                {saveMsg}
              </span>
            )}
            <button className="v2-btn v2-btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={11} strokeWidth={2} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Alert banners */}
        {actionRequiredCount > 0 && (
          <div className="v2-alert v2-alert-error" style={{ marginBottom: 16 }}>
            <AlertTriangle size={13} strokeWidth={2} />
            <span>
              <strong>{actionRequiredCount} certificate{actionRequiredCount > 1 ? 's' : ''}</strong> require manual reissue — auto-reissue failed after 3 attempts.
            </span>
          </div>
        )}

        {/* Main split */}
        <div className="v2-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

          {/* Left: cert list */}
          <div style={{ background: '#ffffff', border: '0.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: 'var(--v2-text-2)' }}>
                Loading certificates…
              </div>
            ) : certs.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {/* Action required group */}
                {certs.filter(c => c.action_required).length > 0 && (
                  <>
                    <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700,
                      color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '0.5px solid #fecaca', background: '#fef2f2' }}>
                      Action required
                    </div>
                    {certs.filter(c => c.action_required).map(cert => (
                      <CertCard key={cert.id} cert={cert} events={eventsMap[cert.id] || []}
                        selected={selectedId === cert.id} onSelect={() => setSelectedId(cert.id)} />
                    ))}
                  </>
                )}

                {/* Normal certs */}
                {certs.filter(c => !c.action_required).length > 0 && (
                  <>
                    {certs.filter(c => c.action_required).length > 0 && (
                      <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700,
                        color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: '0.5px solid var(--v2-border)', marginTop: 4 }}>
                        Active
                      </div>
                    )}
                    {certs.filter(c => !c.action_required).map(cert => (
                      <CertCard key={cert.id} cert={cert} events={eventsMap[cert.id] || []}
                        selected={selectedId === cert.id} onSelect={() => setSelectedId(cert.id)} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Right: detail */}
          <div>
            <CertDetail
              cert={selCert}
              events={selEvents}
              prefs={prefs}
              onRefresh={load}
              onTogglePref={togglePref}
            />
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: nm-spin 0.8s linear infinite; }
        @keyframes nm-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
