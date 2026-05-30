// AdminRenewalCalendar.jsx
// Phase 3 — Admin Renewal Calendar Overview
// Master view of all customers' renewal events, upcoming actions, failures.
// Restricted to master_admin role only.
// Follows Design v2 system.

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, RefreshCw, AlertTriangle, CheckCircle,
  Clock, RotateCcw, Shield, ChevronRight, Users,
  Bell, Zap, AlertCircle, Check, X, TrendingUp
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

const timeAgo = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const EVENT_LABELS = {
  cert_warning_30d: '30d warning', cert_warning_14d: '14d warning',
  cert_warning_7d: '7d warning',  cert_warning_1d: '1d warning',
  cert_reissue: 'Auto-reissue',
  sub_warning_30d: 'Sub 30d', sub_warning_14d: 'Sub 14d',
  sub_warning_7d: 'Sub 7d',   sub_warning_1d: 'Sub 1d',
  sub_end: 'Sub ends',
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, color, icon: Icon }) {
  return (
    <div className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `${color}18`, border: `0.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={1.8} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--v2-text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--v2-text-2)', marginTop: 2 }}>{label}</div>
        {subtext && <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 1 }}>{subtext}</div>}
      </div>
    </div>
  )
}

// ── Event row in master list ──────────────────────────────────────────
function AdminEventRow({ ev, cert, userEmail }) {
  const statusColor = ev.status === 'sent' ? '#10b981' : ev.status === 'failed' ? '#ef4444' : ev.status === 'executing' ? '#f59e0b' : '#3b82f6'
  const isReissue = ev.event_type === 'cert_reissue'
  const days = daysFromNow(ev.scheduled_date)
  const isPast = days !== null && days < 0
  const isToday = days === 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
      borderBottom: '0.5px solid var(--v2-border)',
      background: ev.status === 'failed' ? '#fef2f2' : ev.retry_count > 0 ? '#fffbeb' : 'transparent',
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: statusColor,
        boxShadow: ev.status === 'executing' ? `0 0 0 3px ${statusColor}33` : 'none',
      }} />

      {/* Domain */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--v2-text)', fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cert?.domain || ev.cert_id?.slice(0, 8)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--v2-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userEmail || '—'}
        </div>
      </div>

      {/* Event type */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: isReissue ? '#f0fdf4' : '#eff6ff',
          color: isReissue ? '#15803d' : '#1d4ed8',
          border: `0.5px solid ${isReissue ? '#bbf7d0' : '#bfdbfe'}`,
        }}>
          {EVENT_LABELS[ev.event_type] || ev.event_type}
        </span>
      </div>

      {/* Scheduled date */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: isToday ? '#2563eb' : isPast ? 'var(--v2-text-3)' : 'var(--v2-text-2)', fontWeight: isToday ? 700 : 400 }}>
          {fmtDateShort(ev.scheduled_date)}
          {isToday && <span style={{ fontSize: 9, color: '#2563eb', marginLeft: 3 }}>today</span>}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
          textTransform: 'uppercase', letterSpacing: '0.3px',
          background: ev.status === 'sent' ? '#f0fdf4' : ev.status === 'failed' ? '#fef2f2' : ev.status === 'executing' ? '#fffbeb' : '#eff6ff',
          color: statusColor,
          border: `0.5px solid ${ev.status === 'sent' ? '#bbf7d0' : ev.status === 'failed' ? '#fecaca' : ev.status === 'executing' ? '#fde68a' : '#bfdbfe'}`,
        }}>
          {ev.status}{ev.retry_count > 0 ? ` (retry ${ev.retry_count})` : ''}
        </span>
        {ev.error_message && (
          <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
            {ev.error_message.slice(0, 80)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin alert row ───────────────────────────────────────────────────
function AdminAlertRow({ alert, onResolve }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
      borderBottom: '0.5px solid #fecaca', background: alert.status === 'open' ? '#fef2f2' : 'transparent',
    }}>
      <AlertTriangle size={13} strokeWidth={2} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 2 }}>
          {alert.domain || 'Unknown domain'}
        </div>
        <div style={{ fontSize: 11, color: '#dc2626', lineHeight: 1.5 }}>
          {alert.message?.slice(0, 120)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 3 }}>
          {timeAgo(alert.created_at)}
        </div>
      </div>
      {alert.status === 'open' && onResolve && (
        <button className="v2-btn v2-btn-sm" onClick={() => onResolve(alert.id)}
          style={{ fontSize: 10, flexShrink: 0 }}>
          <Check size={10} strokeWidth={2.5} /> Resolve
        </button>
      )}
    </div>
  )
}

// ── Main admin page ───────────────────────────────────────────────────
export default function AdminRenewalCalendar({ user }) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents]   = useState([])
  const [certs, setCerts]     = useState([])
  const [alerts, setAlerts]   = useState([])
  const [userEmails, setUserEmails] = useState({})
  const [tab, setTab]         = useState('upcoming') // upcoming | today | failed | alerts
  const [resolving, setResolving] = useState(null)

  const userId = user?.id

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Check admin role
      const { data: account } = await supabase
        .from('accounts')
        .select('role')
        .eq('id', userId)
        .single()

      const admin = account?.role === 'master_admin'
      setIsAdmin(admin)
      if (!admin) { setLoading(false); return }

      const today = new Date().toISOString().split('T')[0]
      const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      // Load upcoming + recent events
      const { data: evData } = await supabase
        .from('renewal_events')
        .select('id,cert_id,user_id,event_type,scheduled_date,status,retry_count,error_message,updated_at')
        .or(`scheduled_date.lte.${in7Days},status.eq.failed`)
        .order('scheduled_date', { ascending: true })
        .limit(200)

      setEvents(evData || [])

      // Load certs for context
      const certIds = [...new Set((evData || []).map(e => e.cert_id))]
      if (certIds.length > 0) {
        const { data: certData } = await supabase
          .from('certificates')
          .select('id,domain,expires_at,subscription_end_date,action_required')
          .in('id', certIds)
        setCerts(certData || [])
      }

      // Load admin alerts
      const { data: alertData } = await supabase
        .from('admin_alerts')
        .select('id,alert_type,cert_id,user_id,domain,message,status,created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50)
      setAlerts(alertData || [])

      // Load user emails via auth admin
      const userIds = [...new Set((evData || []).map(e => e.user_id))]
      if (userIds.length > 0) {
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const eMap = {}
        for (const u of (authUsers || [])) if (u.email) eMap[u.id] = u.email
        setUserEmails(eMap)
      }

    } catch (e) { console.error('[AdminRenewalCalendar] load error:', e) }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const resolveAlert = async (alertId) => {
    setResolving(alertId)
    try {
      await supabase.from('admin_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', alertId)
      setAlerts(a => a.filter(x => x.id !== alertId))
    } catch (e) { console.error(e) }
    setResolving(null)
  }

  if (!isAdmin && !loading) {
    return (
      <div className="v2-page">
        <div className="v2-container" style={{ maxWidth: 500, textAlign: 'center', paddingTop: 60 }}>
          <div className="v2-empty-icon"><Shield size={28} strokeWidth={1.6} /></div>
          <div className="v2-empty-title">Admin access required</div>
          <div className="v2-empty-desc">This page is only accessible to master administrators.</div>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const certMap  = Object.fromEntries(certs.map(c => [c.id, c]))
  const todayEvs = events.filter(e => e.scheduled_date === today)
  const upcoming = events.filter(e => e.scheduled_date > today && e.status === 'pending')
  const failed   = events.filter(e => e.status === 'failed')
  const openAlerts = alerts.filter(a => a.status === 'open')

  // Summary stats
  const totalCerts    = new Set(events.map(e => e.cert_id)).size
  const reissuesToday = todayEvs.filter(e => e.event_type === 'cert_reissue').length
  const failedCount   = failed.length
  const alertCount    = openAlerts.length

  const tabEvents = tab === 'today' ? todayEvs
    : tab === 'failed' ? failed
    : tab === 'alerts' ? []
    : upcoming

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="v2-h1">Admin Renewal Calendar</h1>
            <p className="v2-subtitle">Platform-wide monitoring · All customers</p>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={11} strokeWidth={2} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Certs monitored" value={totalCerts} subtext="with scheduled events" color="#10b981" icon={Shield} />
          <StatCard label="Events today" value={todayEvs.length} subtext={`${reissuesToday} reissue${reissuesToday !== 1 ? 's' : ''}`} color="#3b82f6" icon={Calendar} />
          <StatCard label="Failed events" value={failedCount} subtext="need retry/manual fix" color={failedCount > 0 ? '#ef4444' : '#9ca3af'} icon={AlertTriangle} />
          <StatCard label="Open alerts" value={alertCount} subtext="admin action needed" color={alertCount > 0 ? '#dc2626' : '#9ca3af'} icon={Bell} />
        </div>

        {/* Open alerts banner */}
        {alertCount > 0 && (
          <div className="v2-alert v2-alert-error" style={{ marginBottom: 16 }}>
            <AlertTriangle size={13} />
            <span>
              <strong>{alertCount} open alert{alertCount > 1 ? 's' : ''}</strong> — certificates with exhausted auto-reissue retries.
            </span>
            <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none',
              color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setTab('alerts')}>
              View alerts →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="v2-segmented" style={{ margin: '0 0 16px' }}>
          {[
            { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { id: 'today',    label: 'Today',    count: todayEvs.length },
            { id: 'failed',   label: 'Failed',   count: failedCount },
            { id: 'alerts',   label: 'Alerts',   count: alertCount },
          ].map(t => (
            <button key={t.id}
              className={`v2-segmented-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.count > 0 && (
                <span className="v2-tab-count" style={{
                  background: t.id === 'failed' || t.id === 'alerts' ? (tab === t.id ? 'white' : '#ef4444') : undefined,
                  color: t.id === 'failed' || t.id === 'alerts' ? (tab === t.id ? '#ef4444' : 'white') : undefined,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: '#ffffff', border: '0.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>

          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: 'var(--v2-text-2)' }}>
              Loading…
            </div>
          ) : tab === 'alerts' ? (
            openAlerts.length === 0 ? (
              <div className="v2-empty">
                <div className="v2-empty-icon"><CheckCircle size={26} strokeWidth={1.6} /></div>
                <div className="v2-empty-title">No open alerts</div>
                <div className="v2-empty-desc">All certificates are healthy.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700,
                  color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px',
                  borderBottom: '0.5px solid #fecaca', background: '#fff5f5' }}>
                  Open alerts — {openAlerts.length}
                </div>
                {openAlerts.map(a => (
                  <AdminAlertRow key={a.id} alert={a} onResolve={resolveAlert} />
                ))}
              </>
            )
          ) : tabEvents.length === 0 ? (
            <div className="v2-empty">
              <div className="v2-empty-icon"><Calendar size={26} strokeWidth={1.6} /></div>
              <div className="v2-empty-title">
                {tab === 'today' ? 'No events scheduled for today' : tab === 'failed' ? 'No failed events' : 'No upcoming events'}
              </div>
              <div className="v2-empty-desc">
                {tab === 'failed' ? 'All automations are running cleanly.' : 'Events will appear here as certificates approach expiry.'}
              </div>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase',
                letterSpacing: '0.4px', borderBottom: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)' }}>
                <div style={{ width: 8, flexShrink: 0 }} />
                <div style={{ width: 140, flexShrink: 0 }}>Domain / User</div>
                <div style={{ width: 110, flexShrink: 0 }}>Event</div>
                <div style={{ width: 80, flexShrink: 0 }}>Date</div>
                <div style={{ flex: 1 }}>Status</div>
              </div>
              {tabEvents.map(ev => (
                <AdminEventRow
                  key={ev.id} ev={ev}
                  cert={certMap[ev.cert_id]}
                  userEmail={userEmails[ev.user_id]}
                />
              ))}
              <div style={{ padding: '8px 16px', fontSize: 10, color: 'var(--v2-text-3)', borderTop: '0.5px solid var(--v2-border)', textAlign: 'right' }}>
                {tabEvents.length} event{tabEvents.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: nm-spin 0.8s linear infinite; }
        @keyframes nm-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
