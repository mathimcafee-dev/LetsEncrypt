import { useState, useEffect, useCallback } from 'react'
import { Shield, FileText, RefreshCw, Filter, ChevronLeft, ChevronRight, Clock, User, Globe, Settings, Key, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const EVENT_META = {
  tls_check:       { label: 'TLS check',        icon: Shield,       color: '#10b981' },
  posture_scan:    { label: 'Posture scan',      icon: Shield,       color: '#10b981' },
  pqc_check:       { label: 'PQC check',         icon: Shield,       color: '#6366f1' },
  renewal_queued:  { label: 'Renewal queued',    icon: RotateCcw,    color: '#f59e0b' },
  renewal_approve: { label: 'Renewal approved',  icon: CheckCircle,  color: '#10b981' },
  renewal_skip:    { label: 'Renewal skipped',   icon: AlertTriangle,color: '#6b7280' },
  cert_issued:     { label: 'Cert issued',        icon: Key,          color: '#10b981' },
  cert_revoked:    { label: 'Cert revoked',       icon: AlertTriangle,color: '#ef4444' },
  cert_imported:   { label: 'Cert imported',      icon: FileText,     color: '#3b82f6' },
  key_accessed:    { label: 'Key accessed',       icon: Key,          color: '#f59e0b' },
  sandbox_renew:   { label: 'Auto-renew',         icon: RotateCcw,    color: '#10b981' },
  ca_sync:         { label: 'CA sync',            icon: RefreshCw,    color: '#3b82f6' },
}

function getEventMeta(type) {
  return EVENT_META[type] || { label: type, icon: Settings, color: '#6b7280' }
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AuditLog() {
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filterType, setFilterType] = useState('')
  const [expanded, setExpanded] = useState(null)
  const LIMIT = 30

  const callFn = useCallback(async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    })
    return res.json()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, stRes] = await Promise.all([
        callFn({ action: 'list', page, limit: LIMIT, event_type: filterType || undefined }),
        callFn({ action: 'stats' })
      ])
      setEvents(evRes.events || [])
      setTotal(evRes.total || 0)
      setStats(stRes.stats || {})
    } finally {
      setLoading(false)
    }
  }, [page, filterType, callFn])

  useEffect(() => { load() }, [load])

  const eventTypes = Object.keys(EVENT_META)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={22} color="#10b981" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Audit log</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Immutable record of all certificate events</p>
          </div>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Events (30d)', value: Object.values(stats).reduce((a, b) => a + b, 0) },
          { label: 'TLS checks', value: (stats.tls_check || 0) + (stats.posture_scan || 0) },
          { label: 'Renewals queued', value: stats.renewal_queued || 0 },
          { label: 'Certs issued', value: stats.cert_issued || 0 },
        ].map(s => (
          <div key={s.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Filter size={14} color="#6b7280" />
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <option value="">All events</option>
          {eventTypes.map(t => <option key={t} value={t}>{EVENT_META[t].label}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{total} total events</span>
      </div>

      {/* Events list */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 8, fontSize: 14 }}>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <FileText size={32} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14 }}>No audit events yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Events are recorded automatically as you use SSLVault</p>
          </div>
        ) : events.map((ev, i) => {
          const meta = getEventMeta(ev.event_type)
          const Icon = meta.icon
          const isExp = expanded === ev.id
          const details = ev.metadata || ev.details || {}
          return (
            <div key={ev.id} style={{ borderBottom: i < events.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div onClick={() => setExpanded(isExp ? null : ev.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{meta.label}</span>
                    {ev.domain && <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '1px 7px', borderRadius: 20 }}>{ev.domain}</span>}
                    {details.grade && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: details.grade === 'A' ? '#d1fae5' : details.grade === 'B' ? '#dbeafe' : details.grade === 'C' ? '#fef9c3' : '#fee2e2', color: details.grade === 'A' ? '#065f46' : details.grade === 'B' ? '#1e40af' : details.grade === 'C' ? '#854d0e' : '#991b1b' }}>Grade {details.grade}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Clock size={11} color="#9ca3af" />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(ev.created_at)}</span>
                    {ev.actor_email && <><span style={{ fontSize: 11, color: '#d1d5db' }}>·</span><User size={11} color="#9ca3af" /><span style={{ fontSize: 11, color: '#9ca3af' }}>{ev.actor_email}</span></>}
                    <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '0px 5px', borderRadius: 4 }}>{ev.source || 'portal'}</span>
                  </div>
                </div>
                <ChevronRight size={14} color="#9ca3af" style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {isExp && Object.keys(details).length > 0 && (
                <div style={{ padding: '0 16px 12px 60px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                    <pre style={{ fontSize: 11, color: '#475569', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(details, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: 13 }}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, fontSize: 13 }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
