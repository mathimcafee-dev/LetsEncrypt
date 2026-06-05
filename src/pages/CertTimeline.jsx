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
  if (days === null) return { color: '#555555', bg: 'transparent', border: 'transparent' }
  if (days <= 7)  return { color: '#0077b6', bg: 'rgba(248,113,113,0.12)', border: 'rgba(192,57,43,0.2)' }
  if (days <= 30) return { color: '#9a6400', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.3)' }
  return { color: '#00a550', bg: 'transparent', border: 'transparent' }
}

function eventTypeLabel(type) {
  const map = {
    // DB event_type values
    'cert_warning_30d': { label: 'Cert warning 30d', color: '#9a6400' },
    'cert_warning_14d': { label: 'Cert warning 14d', color: '#f97316' },
    'cert_warning_7d':  { label: 'Cert warning 7d',  color: '#0077b6' },
    'cert_warning_1d':  { label: 'Cert warning 1d',  color: '#ef4444' },
    'cert_reissue':     { label: 'Auto-reissue',     color: '#0077b6' },
    'sub_warning_30d':  { label: 'Sub warning 30d',  color: '#9a6400' },
    'sub_warning_14d':  { label: 'Sub warning 14d',  color: '#f97316' },
    'sub_warning_7d':   { label: 'Sub warning 7d',   color: '#0077b6' },
    'sub_warning_1d':   { label: 'Sub warning 1d',   color: '#ef4444' },
    'sub_end':          { label: 'Subscription end', color: '#0077b6' },
    // Legacy keys kept for backward compat
    '30d_warning':    { label: 'Cert warning 30d', color: '#9a6400' },
    '14d_warning':    { label: 'Cert warning 14d', color: '#f97316' },
    '7d_warning':     { label: 'Cert warning 7d',  color: '#0077b6' },
    'final_warning':  { label: 'Cert warning 1d',  color: '#ef4444' },
    'auto_reissue':   { label: 'Auto-reissue',     color: '#0077b6' },
    'sub_30d':        { label: 'Sub warning 30d',  color: '#9a6400' },
    'sub_14d':        { label: 'Sub warning 14d',  color: '#0077b6' },
    'renewal':        { label: 'Renewal',          color: '#00a550' },
  }
  return map[type] || { label: type ? type.replace(/_/g,' ') : '—', color: '#555555' }
}

function StatusDot({ days }) {
  if (days === null) return <span style={{ color: '#555555', fontSize: 11 }}>—</span>
  if (days <= 7)  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0077b6', display: 'inline-block', boxShadow: '0 0 0 3px rgba(192,57,43,0.12)' }}/>
  if (days <= 30) return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a6400', display: 'inline-block' }}/>
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00a550', display: 'inline-block' }}/>
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
              border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={18} color="#0077b6"/>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111111', margin: 0, letterSpacing: '-0.5px' }}>
                Certificate Timeline
              </h1>
              <p style={{ fontSize: 13, color: '#555555', margin: '2px 0 0' }}>
                Expiry schedule · Renewal events · Install status
              </p>
            </div>
          </div>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)',
            color: '#333333', cursor: 'pointer', fontFamily: F,
          }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Active certs',  value: certs.length,  color: '#333333', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.06)', icon: <Shield size={14}/> },
            { label: 'Expiring ≤30d', value: expiring30,    color: expiring30 > 0 ? '#9a6400' : '#00a550', bg: expiring30 > 0 ? 'rgba(184,120,0,0.06)' : 'rgba(74,222,128,0.06)', border: expiring30 > 0 ? 'rgba(184,120,0,0.2)' : 'rgba(0,165,80,0.14)', icon: <Clock size={14}/> },
            { label: 'Critical ≤7d',  value: expiring7,     color: expiring7  > 0 ? '#0077b6' : '#00a550', bg: expiring7  > 0 ? 'rgba(192,57,43,0.07)' : 'rgba(74,222,128,0.06)', border: expiring7  > 0 ? 'rgba(0,0,0,0.08)' : 'rgba(0,165,80,0.14)', icon: <AlertTriangle size={14}/> },
            { label: 'Auto-renew on', value: autoRenew,     color: '#00a550',  bg: 'rgba(74,222,128,0.06)', border: 'rgba(0,165,80,0.14)', icon: <RotateCcw size={14}/> },
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
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555555' }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search domain…"
              style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, fontSize: 13,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)',
                color: '#333333', fontFamily: F, boxSizing: 'border-box' }}
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
              border: `1px solid ${filter === f.id ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)'}`,
              color: filter === f.id ? '#0077b6' : '#b0a8a0', cursor: 'pointer',
            }}>
              {f.label}
              {f.id === 'expiring' && expiring30 > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 8, background: 'rgba(251,191,36,0.2)', color: '#9a6400' }}>{expiring30}</span>
              )}
              {f.id === 'action' && actionReqd > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 8, background: 'rgba(192,57,43,0.12)', color: '#0077b6' }}>{actionReqd}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#555555', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin .8s linear infinite', marginRight: 8 }}/>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays size={32} color="rgba(0,0,0,0.08)" style={{ marginBottom: 12 }}/>
            <div style={{ fontSize: 14, color: '#333333', marginBottom: 6 }}>No certificates found</div>
            <div style={{ fontSize: 12, color: '#555555' }}>Issue your first certificate to see the timeline here</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12, overflow: 'hidden' }}>

            {/* Table header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} onClick={() => col.sortable && toggleSort(col.key)}
                      style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#555555',
                        textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left',
                        background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)',
                        cursor: col.sortable ? 'pointer' : 'default', userSelect: 'none',
                        width: col.width, whiteSpace: 'nowrap', fontFamily: F }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortAsc ? <ChevronUp size={10} color="#0077b6"/> : <ChevronDown size={10} color="#0077b6"/>
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
                          background: isOpen ? 'rgba(0,119,182,0.07)' : 'transparent',
                          transition: 'background .1s',
                        }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>

                        {/* Domain */}
                        <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StatusDot days={row.days}/>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#111111',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                maxWidth: isMobile ? 140 : 200 }}>
                                {row.domain}
                              </div>
                              {row.action_required && (
                                <div style={{ fontSize: 10, color: '#0077b6', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
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
                          <div style={{ fontSize: 10, color: '#555555', marginTop: 1 }}>
                            {fmtDateShort(row.expires_at)}
                          </div>
                        </td>

                        {!isMobile && (<>
                          {/* Sub ends */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            <div style={{ fontSize: 12, color: row.subDays !== null && row.subDays <= 30 ? '#9a6400' : '#333333', fontFamily: MONO }}>
                              {row.subDays !== null ? `${row.subDays}d` : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: '#555555', marginTop: 1 }}>
                              {fmtDateShort(row.subscription_end_date)}
                            </div>
                          </td>

                          {/* Install method */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {row.install_method ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                background: row.install_method === 'agent' ? 'rgba(99,102,241,0.15)' : 'rgba(0,119,182,0.09)',
                                color: row.install_method === 'agent' ? '#818cf8' : '#0077b6',
                                border: `1px solid ${row.install_method === 'agent' ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.1)'}`,
                                textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {row.install_method}
                              </span>
                            ) : <span style={{ fontSize: 11, color: '#555555' }}>—</span>}
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
                                  <div style={{ fontSize: 10, color: '#555555', marginTop: 3 }}>
                                    {fmtDateShort(nextEvent.scheduled_date)}{d !== null ? ` · in ${d}d` : ''}
                                  </div>
                                </div>
                              )
                            })() : <span style={{ fontSize: 11, color: '#555555' }}>—</span>}
                          </td>

                          {/* Pending events count */}
                          <td style={{ padding: '13px 14px', borderBottom: borderStyle }}>
                            {pendingEvents.length > 0 ? (
                              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 8,
                                background: 'rgba(0,119,182,0.08)', color: '#0077b6',
                                border: '1px solid rgba(0,0,0,0.08)', fontFamily: MONO }}>
                                {pendingEvents.length}
                              </span>
                            ) : <span style={{ fontSize: 11, color: '#555555' }}>0</span>}
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
                                    color: row.is_live_on_server ? '#00a550' : '#9a6400' },
                                ].map((m, mi) => (
                                  <div key={m.label} style={{ paddingRight: 20, marginRight: 20, borderRight: mi < 3 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 3 }}>{m.label}</div>
                                    <div style={{ fontSize: 12, color: m.color || '#333333', fontWeight: 600 }}>{m.value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Lifecycle rail */}
                              {row.events.length === 0 ? (
                                <div style={{ fontSize: 12, color: '#555555' }}>No scheduled events.</div>
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
                                    {/* Dynamic Two-Column Event Timeline */}
                                    {(() => {
                                      const certEvents = row.events.filter(e =>
                                        ['cert_warning_30d','cert_warning_14d','cert_warning_7d','cert_warning_1d','cert_reissue','30d_warning','14d_warning','7d_warning','final_warning','auto_reissue'].includes(e.event_type)
                                      ).sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))

                                      const subEvents = row.events.filter(e =>
                                        ['sub_warning_30d','sub_warning_14d','sub_warning_7d','sub_warning_1d','sub_end','sub_30d','sub_14d','renewal'].includes(e.event_type)
                                      ).sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))

                                      const isKeyEvent = (type) => ['cert_reissue','auto_reissue','sub_end','renewal'].includes(type)
                                      const isRenewal  = (type) => ['sub_end','renewal'].includes(type)

                                      const EventRow = ({ ev, isLast }) => {
                                        const { label, color } = eventTypeLabel(ev.event_type)
                                        const d      = daysFromNow(ev.scheduled_date)
                                        const isPast = d !== null && d < 0
                                        const isDone = ev.status === 'completed' || ev.status === 'sent'
                                        const key_ev = isKeyEvent(ev.event_type)
                                        const renew  = isRenewal(ev.event_type)

                                        const dotColor  = isDone ? '#00a550' : key_ev ? (renew ? '#00a550' : '#0077b6') : color
                                        const cardBg    = key_ev ? (renew ? 'rgba(0,165,80,0.06)' : 'rgba(0,119,182,0.06)') : 'transparent'
                                        const cardBorder= key_ev ? (renew ? '1px solid rgba(0,165,80,0.2)' : '1px solid rgba(0,119,182,0.2)') : '1px solid transparent'
                                        const labelColor= isDone ? '#00a550' : key_ev ? dotColor : '#555555'
                                        const labelWeight = key_ev ? 700 : 500

                                        const pillBg    = d === null ? 'transparent'
                                          : isPast ? 'rgba(0,0,0,0.04)'
                                          : d <= 7  ? 'rgba(192,57,43,0.08)'
                                          : d <= 30 ? 'rgba(251,191,36,0.12)'
                                          : 'rgba(0,165,80,0.08)'
                                        const pillColor = d === null ? '#555555'
                                          : isPast ? '#888888'
                                          : d <= 7  ? '#c0392b'
                                          : d <= 30 ? '#9a6400'
                                          : '#00a550'

                                        return (
                                          <div style={{ display:'flex', gap:10, position:'relative' }}>
                                            {/* Vertical connector line */}
                                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                                              <div style={{
                                                width: key_ev ? 12 : 8,
                                                height: key_ev ? 12 : 8,
                                                borderRadius:'50%',
                                                background: isDone ? '#00a550' : cardBg,
                                                border: `2px solid ${dotColor}`,
                                                flexShrink:0, marginTop:3, zIndex:1,
                                                boxShadow: key_ev ? `0 0 0 3px ${dotColor}18` : 'none'
                                              }}/>
                                              {!isLast && <div style={{ width:1.5, flex:1, background:'rgba(0,0,0,0.06)', marginTop:3 }}/>}
                                            </div>
                                            {/* Card */}
                                            <div style={{
                                              flex:1, marginBottom: isLast ? 0 : 8,
                                              padding: key_ev ? '8px 10px' : '4px 8px',
                                              borderRadius:8, background:cardBg, border:cardBorder,
                                            }}>
                                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                                                <span style={{ fontSize: key_ev ? 11 : 10, fontWeight:labelWeight, color:labelColor, letterSpacing: key_ev ? '0.02em' : 0 }}>
                                                  {key_ev && (ev.event_type === 'cert_reissue' || ev.event_type === 'auto_reissue') ? '⟳ ' : ''}
                                                  {key_ev && isRenewal(ev.event_type) ? '↻ ' : ''}
                                                  {label}
                                                </span>
                                                <span style={{ fontSize:9, fontWeight:600, padding:'1px 6px', borderRadius:10, background:pillBg, color:pillColor, whiteSpace:'nowrap', flexShrink:0 }}>
                                                  {isPast ? 'done' : d !== null ? `in ${d}d` : '—'}
                                                </span>
                                              </div>
                                              <div style={{ fontSize:10, color:'#888888', marginTop:2 }}>
                                                {fmtDate(ev.scheduled_date)}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      }

                                      const Column = ({ title, events, accentColor, emptyText }) => (
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:accentColor, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${accentColor}30` }}>
                                            {title}
                                          </div>
                                          {events.length === 0
                                            ? <div style={{ fontSize:11, color:'#888888', fontStyle:'italic' }}>{emptyText}</div>
                                            : events.map((ev, i) => <EventRow key={ev.id} ev={ev} isLast={i === events.length - 1} />)
                                          }
                                        </div>
                                      )

                                      return (
                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:14, paddingTop:4 }}>
                                          <Column
                                            title="Cert lifecycle"
                                            events={certEvents}
                                            accentColor="#0077b6"
                                            emptyText="No cert events scheduled"
                                          />
                                          <Column
                                            title="Subscription"
                                            events={subEvents}
                                            accentColor="#00a550"
                                            emptyText="No subscription events scheduled"
                                          />
                                        </div>
                                      )
                                    })()} 
{/* Reissue vs Renewal explainer */}
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, marginTop:4 }}>
                                      <div style={{ background:'rgba(0,119,182,0.06)', border:'1px solid rgba(0,119,182,0.18)', borderRadius:8, padding:'8px 12px', display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#0077b6', flexShrink:0, marginTop:3 }}/>
                                        <div>
                                          <div style={{ fontSize:10, fontWeight:700, color:'#0077b6', marginBottom:2 }}>AUTO-REISSUE</div>
                                          <div style={{ fontSize:10, color:'#555555', lineHeight:1.5 }}>Triggers <strong>1 day before cert expiry</strong>. Same subscription — fresh cert file. Free &amp; automatic.</div>
                                        </div>
                                      </div>
                                      <div style={{ background:'rgba(0,165,80,0.06)', border:'1px solid rgba(0,165,80,0.18)', borderRadius:8, padding:'8px 12px', display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#00a550', flexShrink:0, marginTop:3 }}/>
                                        <div>
                                          <div style={{ fontSize:10, fontWeight:700, color:'#00a550', marginBottom:2 }}>AUTO-RENEWAL</div>
                                          <div style={{ fontSize:10, color:'#555555', lineHeight:1.5 }}>Triggers <strong>30 days before subscription ends</strong>. New order — new 12-month subscription.</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Legend */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, marginTop: 4 }}>
                                      {[
                                        { label: 'Completed',      color: '#00a550' },
                                        { label: 'Warning',        color: '#9a6400' },
                                        { label: 'Critical',       color: '#0077b6' },
                                        { label: 'Auto-reissue',   color: '#0077b6' },
                                        { label: 'Subscription',   color: '#0077b6' },
                                      ].map(l => (
                                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#555555' }}>
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
                                            const urg = d !== null && d <= 7 ? '#0077b6' : d !== null && d <= 30 ? '#9a6400' : color
                                            return (
                                              <div key={ev.id} style={{ background: 'rgba(0,0,0,0.03)', border: `0.5px solid ${urg}40`, borderRadius: 8, padding: '9px 12px' }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#333333', marginBottom: 2 }}>{label}</div>
                                                <div style={{ fontSize: 10, color: '#555555' }}>{fmtDate(ev.scheduled_date)}</div>
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
