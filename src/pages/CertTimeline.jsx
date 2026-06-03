// CertTimeline.jsx v2 — Clean table design, inspired by 47-Day Readiness
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  CalendarDays, RefreshCw, CheckCircle, XCircle,
  Clock, AlertTriangle, ChevronUp, ChevronDown,
  Shield, Bell, RotateCcw, Activity, Search
} from 'lucide-react'
import '../styles/design-v2.css'

const F    = "'Inter', system-ui, sans-serif"
const MONO = "'JetBrains Mono', monospace"

function daysFromNow(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function expiryStyle(days) {
  if (days === null) return { color: '#6b6b6b', bg: 'transparent', border: 'transparent' }
  if (days <= 7)  return { color: '#2a6b5c', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' }
  if (days <= 30) return { color: '#b87800', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.3)' }
  return { color: '#1e8a5e', bg: 'transparent', border: 'transparent' }
}

function eventTypeLabel(type) {
  const map = {
    // DB event_type values
    'cert_warning_30d': { label: 'Cert warning 30d', color: '#b87800' },
    'cert_warning_14d': { label: 'Cert warning 14d', color: '#f97316' },
    'cert_warning_7d':  { label: 'Cert warning 7d',  color: '#2a6b5c' },
    'cert_warning_1d':  { label: 'Cert warning 1d',  color: '#ef4444' },
    'cert_reissue':     { label: 'Auto-reissue',     color: '#818cf8' },
    'sub_warning_30d':  { label: 'Sub warning 30d',  color: '#b87800' },
    'sub_warning_14d':  { label: 'Sub warning 14d',  color: '#f97316' },
    'sub_warning_7d':   { label: 'Sub warning 7d',   color: '#2a6b5c' },
    'sub_warning_1d':   { label: 'Sub warning 1d',   color: '#ef4444' },
    'sub_end':          { label: 'Subscription end', color: '#2a6b5c' },
    // Legacy keys kept for backward compat
    '30d_warning':    { label: 'Cert warning 30d', color: '#b87800' },
    '14d_warning':    { label: 'Cert warning 14d', color: '#f97316' },
    '7d_warning':     { label: 'Cert warning 7d',  color: '#2a6b5c' },
    'final_warning':  { label: 'Cert warning 1d',  color: '#ef4444' },
    'auto_reissue':   { label: 'Auto-reissue',     color: '#818cf8' },
    'sub_30d':        { label: 'Sub warning 30d',  color: '#b87800' },
    'sub_14d':        { label: 'Sub warning 14d',  color: '#2a6b5c' },
    'renewal':        { label: 'Renewal',          color: '#1e8a5e' },
  }
  return map[type] || { label: type ? type.replace(/_/g,' ') : '—', color: '#6b6b6b' }
}

function StatusDot({ days }) {
  if (days === null) return <span style={{ color: '#6b6b6b', fontSize: 11 }}>—</span>
  if (days <= 7)  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block', boxShadow: '0 0 0 3px rgba(248,113,113,0.2)' }}/>
  if (days <= 30) return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}/>
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
}

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => { const h = () => setM(window.innerWidth <= bp); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [bp])
  return m
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CertTimeline({ user }) {
  const isMobile = useIsMobile()
  const [certs,     setCerts]    = useState([])
  const [eventsMap, setEvMap]    = useState({})
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [filter,    setFilter]   = useState('all')  // all | expiring | action
  const [sortKey,   setSortKey]  = useState('expires_at')
  const [sortAsc,   setSortAsc]  = useState(true)
  const [expanded,  setExpanded] = useState(null)   // cert id

  const load = useCallback(async () => {
    setLoading(true)
    const { data: certData } = await supabase
      .from('certificates')
      .select('id,domain,expires_at,subscription_end_date,status,auto_renew_enabled,install_method,is_live_on_server,action_required,action_required_reason,reissue_count,last_reissued_at,issuer,is_current')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_current', true)
      .order('expires_at', { ascending: true })

    const ids = (certData || []).map(c => c.id)
    let evMap = {}
    if (ids.length) {
      const { data: evData } = await supabase
        .from('renewal_events')
        .select('id,cert_id,event_type,scheduled_date,status')
        .in('cert_id', ids)
        .order('scheduled_date', { ascending: true })

      for (const ev of (evData || [])) {
        if (!evMap[ev.cert_id]) evMap[ev.cert_id] = []
        evMap[ev.cert_id].push(ev)
      }
    }

    setCerts(certData || [])
    setEvMap(evMap)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const rows = useMemo(() => {
    let list = certs.map(c => ({
      ...c,
      days: daysFromNow(c.expires_at),
      subDays: daysFromNow(c.subscription_end_date),
      events: eventsMap[c.id] || [],
    }))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.domain?.toLowerCase().includes(q))
    }
    if (filter === 'expiring') list = list.filter(r => r.days !== null && r.days <= 30)
    if (filter === 'action')   list = list.filter(r => r.action_required)

    list.sort((a, b) => {
      let av, bv
      if (sortKey === 'domain')    { av = a.domain; bv = b.domain }
      else if (sortKey === 'expires_at') { av = new Date(a.expires_at || 0); bv = new Date(b.expires_at || 0) }
      else if (sortKey === 'events') { av = a.events.filter(e => e.status === 'pending').length; bv = b.events.filter(e => e.status === 'pending').length }
      else { av = 0; bv = 0 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [certs, eventsMap, search, filter, sortKey, sortAsc])

  // Stats
  const expiring7  = certs.filter(c => { const d = daysFromNow(c.expires_at); return d !== null && d <= 7 }).length
  const expiring30 = certs.filter(c => { const d = daysFromNow(c.expires_at); return d !== null && d <= 30 }).length
  const actionReqd = certs.filter(c => c.action_required).length
  const autoRenew  = certs.filter(c => c.auto_renew_enabled).length

  const COLS = isMobile ? [
    { key: 'domain',     label: 'Domain',    sortable: true,  width: '40%' },
    { key: 'expires_at', label: 'Expires',   sortable: true,  width: '30%' },
    { key: 'events',     label: 'Events',    sortable: false, width: '30%' },
  ] : [
    { key: 'domain',     label: 'Domain',    sortable: true,  width: '25%' },
    { key: 'expires_at', label: 'Cert expires', sortable: true, width: '14%' },
    { key: '_sub',       label: 'Sub ends',  sortable: false, width: '12%' },
    { key: '_install',   label: 'Install',   sortable: false, width: '10%' },
    { key: '_renew',     label: 'Auto-renew',sortable: false, width: '10%' },
    { key: 'events',     label: 'Next event',sortable: false, width: '17%' },
    { key: '_actions',   label: 'Pending',   sortable: false, width: '12%' },
  ]

  return (
    <div className="v2-page" style={{ fontFamily: F }}>
      <div className="v2-container" style={{ maxWidth: 1100, paddingTop: 8, paddingBottom: 40 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.08)',
              border: '1px solid rgba(192,57,43,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={18} color="#ff8c7a"/>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0, letterSpacing: '-0.5px' }}>
                Certificate Timeline
              </h1>
              <p style={{ fontSize: 13, color: '#6b6b6b', margin: '2px 0 0' }}>
                Expiry schedule · Renewal events · Install status
              </p>
            </div>
          </div>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)',
            color: '#3d3d3d', cursor: 'pointer', fontFamily: F,
          }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Active certs',  value: certs.length,  color: '#3d3d3d', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.06)', icon: <Shield size={14}/> },
            { label: 'Expiring ≤30d', value: expiring30,    color: expiring30 > 0 ? '#fbbf24' : '#4ade80', bg: expiring30 > 0 ? 'rgba(184,120,0,0.06)' : 'rgba(74,222,128,0.06)', border: expiring30 > 0 ? 'rgba(184,120,0,0.2)' : 'rgba(74,222,128,0.2)', icon: <Clock size={14}/> },
            { label: 'Critical ≤7d',  value: expiring7,     color: expiring7  > 0 ? '#f87171' : '#4ade80', bg: expiring7  > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.06)', border: expiring7  > 0 ? 'rgba(0,0,0,0.08)' : 'rgba(74,222,128,0.2)', icon: <AlertTriangle size={14}/> },
            { label: 'Auto-renew on', value: autoRenew,     color: '#1e8a5e',  bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)', icon: <RotateCcw size={14}/> },
          ].map(s => (
            <div key={s.label} style={{ padding: '14px 16px', borderRadius: 10,
              background: s.bg, border: `1px solid ${s.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {s.icon}{s.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, fontFamily: MONO, lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + filter bar ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b6b6b' }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search domain…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, fontSize: 13,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)',
                color: '#3d3d3d', fontFamily: F, boxSizing: 'border-box' }}
            />
          </div>
          {[
            { id: 'all',      label: 'All certs' },
            { id: 'expiring', label: '≤30 days'  },
            { id: 'action',   label: 'Action required' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: F,
              background: filter === f.id ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${filter === f.id ? 'rgba(192,57,43,0.4)' : 'rgba(0,0,0,0.06)'}`,
              color: filter === f.id ? '#ff8c7a' : '#b0a8a0', cursor: 'pointer',
            }}>
              {f.label}
              {f.id === 'expiring' && expiring30 > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 8, background: 'rgba(251,191,36,0.2)', color: '#b87800' }}>{expiring30}</span>
              )}
              {f.id === 'action' && actionReqd > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 8, background: 'rgba(248,113,113,0.2)', color: '#2a6b5c' }}>{actionReqd}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b6b6b', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin .8s linear infinite', marginRight: 8 }}/>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays size={32} color="rgba(0,0,0,0.08)" style={{ marginBottom: 12 }}/>
            <div style={{ fontSize: 14, color: '#3d3d3d', marginBottom: 6 }}>No certificates found</div>
            <div style={{ fontSize: 12, color: '#6b6b6b' }}>Issue your first certificate to see the timeline here</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12, overflow: 'hidden' }}>

            {/* Table header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} onClick={() => col.sortable && toggleSort(col.key)}
                      style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#6b6b6b',
                        textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left',
                        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)',
                        cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none',
                        width: col.width, whiteSpace: 'nowrap', fontFamily: F }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortAsc ? <ChevronUp size={10} color="#ff8c7a"/> : <ChevronDown size={10} color="#ff8c7a"/>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const es = expiryStyle(row.days)
                  const pendingEvents = row.events.filter(e => e.status === 'pending')
                  const nextEvent = pendingEvents[0]
                  const isOpen = expanded === row.id
                  const borderStyle = ri < rows.length - 1 || isOpen
                    ? '1px solid rgba(0,0,0,0.04)'
                    : 'none'

                  return (
                    <>
                      <tr key={row.id}
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                        style={{
                          cursor: 'pointer',
                          background: isOpen ? 'rgba(42,107,92,0.07)' : 'transparent',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>

                        {/* Domain */}
                        <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StatusDot days={row.days}/>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxWidth: isMobile ? 140 : 200 }}>
                                {row.domain}
                              </div>
                              {row.action_required && (
                                <div style={{ fontSize: 10, color: '#2a6b5c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <AlertTriangle size={9}/> Action required
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cert expires */}
                        <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: es.color, fontFamily: MONO }}>
                            {row.days !== null ? `${row.days}d` : '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#6b6b6b', marginTop: 1 }}>
                            {fmtDateShort(row.expires_at)}
                          </div>
                        </td>

                        {!isMobile && (<>
                          {/* Sub ends */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            <div style={{ fontSize: 12, color: row.subDays !== null && row.subDays <= 30 ? '#fbbf24' : '#e8e0d8', fontFamily: MONO }}>
                              {row.subDays !== null ? `${row.subDays}d` : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: '#6b6b6b', marginTop: 1 }}>
                              {fmtDateShort(row.subscription_end_date)}
                            </div>
                          </td>

                          {/* Install method */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {row.install_method ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                background: row.install_method === 'agent' ? 'rgba(99,102,241,0.15)' : 'rgba(42,107,92,0.09)',
                                color: row.install_method === 'agent' ? '#818cf8' : '#ff8c7a',
                                border: `1px solid ${row.install_method === 'agent' ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.1)'}`,
                                textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {row.install_method}
                              </span>
                            ) : <span style={{ fontSize: 11, color: '#6b6b6b' }}>—</span>}
                          </td>

                          {/* Auto-renew */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {row.auto_renew_enabled
                              ? <CheckCircle size={15} color="#4ade80" strokeWidth={2.5}/>
                              : <XCircle    size={15} color="rgba(0,0,0,0.09)" strokeWidth={2}/>
                            }
                          </td>

                          {/* Next event */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {nextEvent ? (() => {
                              const { label, color } = eventTypeLabel(nextEvent.event_type)
                              const d = daysFromNow(nextEvent.scheduled_date)
                              return (
                                <div>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                    background: 'rgba(0,0,0,0.05)', color, border: '1px solid rgba(0,0,0,0.06)',
                                    whiteSpace: 'nowrap' }}>{label}</span>
                                  <div style={{ fontSize: 10, color: '#6b6b6b', marginTop: 3 }}>
                                    {fmtDateShort(nextEvent.scheduled_date)}{d !== null ? ` · in ${d}d` : ''}
                                  </div>
                                </div>
                              )
                            })() : <span style={{ fontSize: 11, color: '#6b6b6b' }}>—</span>}
                          </td>

                          {/* Pending events count */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {pendingEvents.length > 0 ? (
                              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 8,
                                background: 'rgba(42,107,92,0.08)', color: '#ff8c7a',
                                border: '1px solid rgba(0,0,0,0.08)', fontFamily: MONO }}>
                                {pendingEvents.length}
                              </span>
                            ) : <span style={{ fontSize: 11, color: '#6b6b6b' }}>0</span>}
                          </td>
                        </>)}
                      </tr>

                      {/* ── Expanded events panel — staggered lifecycle rail ── */}
                      {isOpen && (
                        <tr key={`${row.id}-expanded`}>
                          <td colSpan={COLS.length} style={{ padding: '0 14px 16px', background: 'rgba(192,57,43,0.04)' }}>
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 14 }}>

                              {/* Meta strip */}
                              <div style={{ display: 'flex', gap: 0, marginBottom: 16, flexWrap: 'wrap' }}>
                                {[
                                  { label: 'Issuer',         value: row.issuer || 'RapidSSL' },
                                  { label: 'Reissued',       value: row.reissue_count ? `${row.reissue_count}×` : '0×' },
                                  { label: 'Last reissued',  value: fmtDate(row.last_reissued_at) },
                                  { label: 'Live on server', value: row.is_live_on_server ? '✓ Yes' : '✗ Not confirmed',
                                    color: row.is_live_on_server ? '#4ade80' : '#fbbf24' },
                                ].map((m, mi) => (
                                  <div key={m.label} style={{ paddingRight: 20, marginRight: 20, borderRight: mi < 3 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 3 }}>{m.label}</div>
                                    <div style={{ fontSize: 12, color: m.color || '#e8e0d8', fontWeight: 600 }}>{m.value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Lifecycle rail */}
                              {row.events.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#6b6b6b' }}>No scheduled events.</div>
                              ) : (() => {
                                const issued   = row.issued_at   ? new Date(row.issued_at)             : new Date(Date.now() - 30*86400000)
                                const subEnd   = row.subscription_end_date ? new Date(row.subscription_end_date) : new Date(row.expires_at)
                                const todayD   = new Date()
                                const totalMs  = subEnd - issued
                                const pct      = (d) => Math.min(98, Math.max(2, ((new Date(d) - issued) / totalMs) * 100))
                                const todayPct = Math.min(98, Math.max(2, ((todayD - issued) / totalMs) * 100))
                                const RAIL_MID = 58
                                const upcoming = row.events.filter(ev => { const d = daysFromNow(ev.scheduled_date); return d !== null && d > 0 }).slice(0, 3)

                                return (
                                  <div>
                                    {/* Rail SVG */}
                                    <div style={{ position: 'relative', height: 130, margin: '0 4px 6px', userSelect: 'none' }}>

                                      {/* Phase labels */}
                                      {[
                                        { label: 'Issued',    cx: 3 },
                                        { label: 'Cert zone', cx: pct(row.expires_at) - 8 },
                                        { label: 'Sub zone',  cx: Math.max(pct(row.expires_at) + 4, 60) },
                                        { label: 'Sub end',   cx: 95 },
                                      ].map(ph => (
                                        <div key={ph.label} style={{ position: 'absolute', top: 30, left: ph.cx + '%', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', transform: 'translateX(-50%)' }}>
                                          {ph.label}
                                        </div>
                                      ))}

                                      {/* Rail track */}
                                      <div style={{ position: 'absolute', top: RAIL_MID, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />

                                      {/* Progress fill */}
                                      <div style={{ position: 'absolute', top: RAIL_MID, left: 0, width: todayPct + '%', height: 3, background: 'rgba(192,57,43,0.5)', borderRadius: 2 }} />

                                      {/* Today pin */}
                                      <div style={{ position: 'absolute', top: RAIL_MID - 8, left: todayPct + '%', transform: 'translateX(-50%)', width: 2, height: 19, background: '#fff', borderRadius: 1 }} />
                                      <div style={{ position: 'absolute', top: RAIL_MID + 13, left: todayPct + '%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 800, letterSpacing: '0.7px', color: '#fff', whiteSpace: 'nowrap' }}>TODAY</div>

                                      {/* Event nodes — staggered above/below */}
                                      {row.events.map((ev, idx) => {
                                        const { label, color } = eventTypeLabel(ev.event_type)
                                        const d      = daysFromNow(ev.scheduled_date)
                                        const isPast = d !== null && d < 0
                                        const isDone = ev.status === 'completed' || ev.status === 'sent'
                                        const p      = pct(ev.scheduled_date)
                                        const above  = idx % 2 === 0
                                        const nodeTop  = above ? RAIL_MID - 34 : RAIL_MID + 18
                                        const stemTop  = above ? nodeTop + 16 : RAIL_MID + 3
                                        const stemH    = above ? RAIL_MID - nodeTop - 16 : nodeTop - RAIL_MID - 3
                                        const dateLblT = above ? nodeTop - 15 : nodeTop + 19
                                        const nodeColor = isDone ? '#4ade80' : color
                                        const nodeBg    = isDone ? 'rgba(30,138,94,0.1)' : color + '18'

                                        return (
                                          <div key={ev.id}>
                                            {/* Stem */}
                                            <div style={{ position: 'absolute', left: p + '%', top: stemTop, width: 1.5, height: Math.abs(stemH), background: 'rgba(0,0,0,0.07)', transform: 'translateX(-50%)' }} />
                                            {/* Date label */}
                                            <div style={{ position: 'absolute', left: p + '%', top: dateLblT, fontSize: 8, color: '#6b6b6b', whiteSpace: 'nowrap', transform: 'translateX(-50%)', fontWeight: 600 }}>
                                              {fmtDateShort(ev.scheduled_date)}
                                            </div>
                                            {/* Node */}
                                            <div style={{ position: 'absolute', left: p + '%', top: nodeTop, width: 16, height: 16, borderRadius: '50%', border: `2px solid ${nodeColor}`, background: nodeBg, transform: 'translateX(-50%)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                              {(isDone || isPast) && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>

                                    {/* Legend */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, marginTop: 4 }}>
                                      {[
                                        { label: 'Completed',      color: '#1e8a5e' },
                                        { label: 'Warning',        color: '#b87800' },
                                        { label: 'Critical',       color: '#2a6b5c' },
                                        { label: 'Auto-reissue',   color: '#818cf8' },
                                        { label: 'Subscription',   color: '#2a6b5c' },
                                      ].map(l => (
                                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6b6b6b' }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${l.color}`, background: l.color + '20', flexShrink: 0 }} />
                                          {l.label}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Next 3 upcoming cards */}
                                    {upcoming.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>Next upcoming</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                          {upcoming.map(ev => {
                                            const { label, color } = eventTypeLabel(ev.event_type)
                                            const d = daysFromNow(ev.scheduled_date)
                                            const urg = d !== null && d <= 7 ? '#f87171' : d !== null && d <= 30 ? '#fbbf24' : color
                                            return (
                                              <div key={ev.id} style={{ background: 'rgba(0,0,0,0.03)', border: `0.5px solid ${urg}40`, borderRadius: 8, padding: '9px 12px' }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#3d3d3d', marginBottom: 2 }}>{label}</div>
                                                <div style={{ fontSize: 10, color: '#6b6b6b' }}>{fmtDate(ev.scheduled_date)}</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: urg, marginTop: 4 }}>in {d}d</div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  )
}
