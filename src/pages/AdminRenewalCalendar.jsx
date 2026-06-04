// AdminRenewalCalendar.jsx — Design v2 Dark Red Theme
import { useState, useEffect, useCallback } from 'react'
import { Calendar, RefreshCw, AlertTriangle, CheckCircle, Shield, Bell, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'

const fmtShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

const timeAgo = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const daysFromNow = (d) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null

const EVENT_LABELS = {
  cert_warning_30d: '30d warning', cert_warning_14d: '14d warning',
  cert_warning_7d:  '7d warning',  cert_warning_1d:  '1d warning',
  cert_reissue:     'Auto-reissue',
  sub_warning_30d:  'Sub 30d',     sub_warning_14d:  'Sub 14d',
  sub_warning_7d:   'Sub 7d',      sub_warning_1d:   'Sub 1d',
  sub_end:          'Sub ends',
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, accentColor, icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 12, padding: '16px 18px',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: `${accentColor}20`,
        border: `1px solid ${accentColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={1.8} color={accentColor} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111111', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#888888', marginTop: 3, fontWeight: 500 }}>{label}</div>
        {subtext && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────
function TabBar({ tab, setTab, counts }) {
  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'today',    label: 'Today',    count: counts.today },
    { id: 'failed',   label: 'Failed',   count: counts.failed, warn: true },
    { id: 'alerts',   label: 'Alerts',   count: counts.alerts, warn: true },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 16,
      background: 'rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 8, padding: 4,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: '7px 12px', borderRadius: 6,
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
          background: tab === t.id ? 'rgba(31,92,78,0.2)' : 'transparent',
          color: tab === t.id ? '#ffffff' : '#b0a8a0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s',
        }}>
          {t.label}
          {t.count > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
              background: t.warn && tab !== t.id ? 'rgba(192,57,43,0.2)' : 'rgba(0,0,0,0.08)',
              color: t.warn && tab !== t.id ? '#1f5c4e' : 'rgba(255,255,255,0.7)',
              border: t.warn && tab !== t.id ? '1px solid rgba(192,57,43,0.2)' : 'none',
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Event row ─────────────────────────────────────────────────────────
function EventRow({ ev, cert }) {
  const isReissue = ev.event_type === 'cert_reissue'
  const days = daysFromNow(ev.scheduled_date)
  const isToday = days === 0
  const isPast = days !== null && days < 0

  const statusColor = ev.status === 'sent' ? '#16a068'
    : ev.status === 'failed' ? '#1f5c4e'
    : ev.status === 'executing' ? '#9a6400'
    : '#60a5fa'

  const statusBg = ev.status === 'sent' ? 'rgba(22,160,104,0.09)'
    : ev.status === 'failed' ? 'rgba(192,57,43,0.07)'
    : ev.status === 'executing' ? 'rgba(184,120,0,0.07)'
    : 'rgba(96,165,250,0.1)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      background: ev.status === 'failed' ? 'rgba(248,113,113,0.05)' : 'transparent',
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: statusColor,
        boxShadow: `0 0 6px ${statusColor}60`,
      }} />

      {/* Domain */}
      <div style={{ width: 155, flexShrink: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#111111',
          fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cert?.domain || '—'}
        </div>
      </div>

      {/* Event type chip */}
      <div style={{ width: 115, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
          background: isReissue ? 'rgba(22,160,104,0.09)' : 'rgba(31,92,78,0.09)',
          color: isReissue ? '#16a068' : '#1f5c4e',
          border: `0.5px solid ${isReissue ? 'rgba(22,160,104,0.22)' : 'rgba(255,140,122,0.25)'}`,
        }}>
          {EVENT_LABELS[ev.event_type] || ev.event_type}
        </span>
      </div>

      {/* Date */}
      <div style={{ width: 90, flexShrink: 0 }}>
        <span style={{
          fontSize: 11,
          color: isToday ? '#1f5c4e' : isPast ? 'rgba(255,255,255,0.3)' : '#333333',
          fontWeight: isToday ? 700 : 400,
        }}>
          {fmtShort(ev.scheduled_date)}
        </span>
        {isToday && (
          <span style={{
            marginLeft: 5, fontSize: 9, fontWeight: 700,
            background: 'rgba(0,0,0,0.1)', color: '#1f5c4e',
            padding: '1px 5px', borderRadius: 3,
          }}>today</span>
        )}
      </div>

      {/* Status badge */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.4px',
          background: statusBg, color: statusColor,
          border: `0.5px solid ${statusColor}30`,
        }}>
          {ev.status}{ev.retry_count > 0 ? ` · retry ${ev.retry_count}` : ''}
        </span>
        {ev.error_message && (
          <span style={{
            fontSize: 10, color: '#1f5c4e',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
          }}>
            {ev.error_message.slice(0, 70)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────────
function AlertRow({ alert, onResolve, resolving }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(192,57,43,0.1)',
      background: 'rgba(248,113,113,0.05)',
    }}>
      <AlertTriangle size={13} strokeWidth={2} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111111', marginBottom: 3 }}>
          {alert.domain || 'Unknown domain'}
        </div>
        <div style={{ fontSize: 11, color: '#1f5c4e', lineHeight: 1.5 }}>
          {(alert.message || '').slice(0, 120)}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          {timeAgo(alert.created_at)}
        </div>
      </div>
      <button onClick={() => onResolve(alert.id)} disabled={resolving === alert.id}
        style={{
          padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
          border: '1px solid rgba(22,160,104,0.22)',
          background: 'rgba(22,160,104,0.09)', color: '#16a068',
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
        <Check size={10} strokeWidth={2.5} />
        {resolving === alert.id ? 'Saving…' : 'Resolve'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AdminRenewalCalendar({ user }) {
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [events, setEvents]       = useState([])
  const [certs, setCerts]         = useState([])
  const [alerts, setAlerts]       = useState([])
  const [tab, setTab]             = useState('upcoming')
  const [resolving, setResolving] = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: account } = await supabase
        .from('accounts').select('role').eq('id', user.id).single()
      const admin = account?.role === 'master_admin'
      setIsAdmin(admin)
      if (!admin) { setLoading(false); return }

      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      const { data: evData } = await supabase
        .from('renewal_events')
        .select('id,cert_id,user_id,event_type,scheduled_date,status,retry_count,error_message')
        .or(`scheduled_date.lte.${in7},status.eq.failed`)
        .order('scheduled_date', { ascending: true })
        .limit(200)
      setEvents(evData || [])

      const certIds = [...new Set((evData || []).map(e => e.cert_id).filter(Boolean))]
      if (certIds.length > 0) {
        const { data: certData } = await supabase
          .from('certificates')
          .select('id,domain,expires_at,subscription_end_date,action_required')
          .in('id', certIds)
        setCerts(certData || [])
      }

      const { data: alertData } = await supabase
        .from('admin_alerts')
        .select('id,domain,message,status,created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50)
      setAlerts(alertData || [])
    } catch (e) { console.error('[AdminRenewalCalendar]', e) }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const resolveAlert = async (alertId) => {
    setResolving(alertId)
    await supabase.from('admin_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', alertId)
    setAlerts(a => a.filter(x => x.id !== alertId))
    setResolving(null)
  }

  if (!isAdmin && !loading) {
    return (
      <div className="v2-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={36} strokeWidth={1.2} color="rgba(0,0,0,0.1)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111111', marginBottom: 6 }}>Admin access required</div>
          <div style={{ fontSize: 12, color: '#888888' }}>Only master administrators can view this page.</div>
        </div>
      </div>
    )
  }

  const today    = new Date().toISOString().split('T')[0]
  const certMap  = Object.fromEntries(certs.map(c => [c.id, c]))
  const todayEvs = events.filter(e => e.scheduled_date === today)
  const upcoming = events.filter(e => e.scheduled_date > today && e.status === 'pending')
  const failed   = events.filter(e => e.status === 'failed')

  const tabEvents = tab === 'today' ? todayEvs
    : tab === 'failed' ? failed
    : tab === 'alerts' ? []
    : upcoming

  const counts = {
    upcoming: upcoming.length, today: todayEvs.length,
    failed: failed.length, alerts: alerts.length,
  }

  return (
    <div className="v2-page" style={{ padding: '28px 28px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="v2-h1" style={{ marginBottom: 4 }}>Admin Renewal Calendar</h1>
          <p style={{ margin: 0, fontSize: 12, color: '#888888' }}>
            Platform-wide monitoring · All customers
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(0,0,0,0.05)',
          color: '#333333', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <RefreshCw size={12} strokeWidth={2} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Certs monitored"  value={loading ? '…' : new Set(events.map(e=>e.cert_id)).size}
          subtext="with scheduled events" accentColor="#4ade80" icon={Shield} />
        <StatCard label="Events today"     value={loading ? '…' : todayEvs.length}
          subtext={`${todayEvs.filter(e=>e.event_type==='cert_reissue').length} reissue(s)`}
          accentColor="#60a5fa" icon={Calendar} />
        <StatCard label="Failed events"    value={loading ? '…' : failed.length}
          subtext="need retry or manual fix"
          accentColor={failed.length > 0 ? '#1f5c4e' : 'rgba(0,0,0,0.09)'} icon={AlertTriangle} />
        <StatCard label="Open alerts"      value={loading ? '…' : alerts.length}
          subtext="admin action needed"
          accentColor={alerts.length > 0 ? '#1f5c4e' : 'rgba(0,0,0,0.09)'} icon={Bell} />
      </div>

      {/* Open alert banner */}
      {alerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(31,92,78,0.06)', border: '1px solid rgba(31,92,78,0.15)',
          fontSize: 12, color: '#1f5c4e',
        }}>
          <AlertTriangle size={14} strokeWidth={2} />
          <span>
            <strong>{alerts.length} open alert{alerts.length > 1 ? 's' : ''}</strong> — certificates
            with exhausted auto-reissue retries require manual action.
          </span>
          <button onClick={() => setTab('alerts')} style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            color: '#1f5c4e', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>View →</button>
        </div>
      )}

      {/* Tabs */}
      <TabBar tab={tab} setTab={setTab} counts={counts} />

      {/* Table */}
      <div style={{
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#888888', fontSize: 12 }}>
            Loading…
          </div>
        ) : tab === 'alerts' ? (
          alerts.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <CheckCircle size={28} strokeWidth={1.4} color="rgba(74,222,128,0.4)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: '#111111', fontWeight: 600, marginBottom: 4 }}>No open alerts</div>
              <div style={{ fontSize: 11, color: '#888888' }}>All certificates are healthy.</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, color: '#1f5c4e',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(192,57,43,0.1)',
                background: 'rgba(248,113,113,0.06)' }}>
                Open alerts — {alerts.length}
              </div>
              {alerts.map(a => (
                <AlertRow key={a.id} alert={a} onResolve={resolveAlert} resolving={resolving} />
              ))}
            </>
          )
        ) : tabEvents.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <Calendar size={28} strokeWidth={1.4} color="rgba(0,0,0,0.09)" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: '#111111', fontWeight: 600, marginBottom: 4 }}>
              {tab === 'today' ? 'No events today'
                : tab === 'failed' ? 'No failed events'
                : 'No upcoming events in the next 7 days'}
            </div>
            <div style={{ fontSize: 11, color: '#888888' }}>
              {tab === 'failed' ? 'All automations running cleanly.' : 'Events appear as certificates approach expiry.'}
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              background: 'rgba(0,0,0,0.02)',
            }}>
              <div style={{ width: 8, flexShrink: 0 }} />
              <div style={{ width: 155, flexShrink: 0 }}>Domain</div>
              <div style={{ width: 115, flexShrink: 0 }}>Event</div>
              <div style={{ width: 90, flexShrink: 0 }}>Date</div>
              <div style={{ flex: 1 }}>Status</div>
            </div>
            {tabEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} cert={certMap[ev.cert_id]} />
            ))}
            <div style={{
              padding: '8px 16px', fontSize: 10, color: 'rgba(255,255,255,0.25)',
              borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'right',
            }}>
              {tabEvents.length} event{tabEvents.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
