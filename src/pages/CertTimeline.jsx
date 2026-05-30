// CertTimeline.jsx — Unified Certificate Timeline
// Replaces: Renewal Calendar + Activity Log + Admin Calendar (all 3 still exist, just removed from nav)
// Three tabs: Upcoming (renewal schedule) | History (cert events) | Admin view (admin only)
// Design: v2 dark red theme — uses design-v2.css tokens throughout

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  RefreshCw, Shield, ShieldCheck, ShieldOff, Calendar,
  History, RotateCcw, Bell, AlertTriangle, Check, ChevronRight,
  ChevronLeft, Zap, Download, Search, ChevronDown, ChevronUp, X
} from 'lucide-react'
import '../styles/design-v2.css'

// ── Helpers ───────────────────────────────────────────────────────────
const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'
const fmtFull  = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const fmtShort = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—'
const daysFromNow = (d) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null
const timeAgo = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  const d = Math.floor(s/86400)
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}

// ── Event metadata ────────────────────────────────────────────────────
const RENEWAL_EVENT_META = {
  cert_warning_30d: { label:'30d warning',    color:'#fbbf24', icon:Bell },
  cert_warning_14d: { label:'14d warning',    color:'#f97316', icon:Bell },
  cert_warning_7d:  { label:'7d warning',     color:'#ef4444', icon:Bell },
  cert_warning_1d:  { label:'Final warning',  color:'#dc2626', icon:AlertTriangle },
  cert_reissue:     { label:'Auto-reissue',   color:'#4ade80', icon:RotateCcw },
  sub_warning_30d:  { label:'Sub 30d',        color:'#fbbf24', icon:Calendar },
  sub_warning_14d:  { label:'Sub 14d',        color:'#f97316', icon:Calendar },
  sub_warning_7d:   { label:'Sub 7d',         color:'#ef4444', icon:Calendar },
  sub_warning_1d:   { label:'Sub 1d',         color:'#dc2626', icon:AlertTriangle },
  sub_end:          { label:'Sub ends',       color:'rgba(255,255,255,0.3)', icon:X },
}

const HISTORY_EVENT_META = {
  issued:             { icon:ShieldCheck, color:'#4ade80',  bg:'rgba(74,222,128,0.1)',   label:'Certificate issued' },
  reissued:           { icon:RotateCcw,   color:'#ff8c7a',  bg:'rgba(192,57,43,0.12)',   label:'Certificate reissued' },
  renewed:            { icon:RotateCcw,   color:'#ff8c7a',  bg:'rgba(192,57,43,0.12)',   label:'Certificate renewed' },
  revoked:            { icon:ShieldOff,   color:'#f87171',  bg:'rgba(248,113,113,0.12)', label:'Certificate revoked' },
  agent_installed:    { icon:Zap,         color:'#fbbf24',  bg:'rgba(251,191,36,0.12)',  label:'Installed by agent' },
  key_rotated:        { icon:RotateCcw,   color:'#ff8c7a',  bg:'rgba(255,107,91,0.12)',  label:'Key rotated' },
  downloaded:         { icon:Download,    color:'#ff8c7a',  bg:'rgba(192,57,43,0.12)',   label:'Certificate downloaded' },
  private_key_copied: { icon:Shield,      color:'#ff8c7a',  bg:'rgba(255,107,91,0.12)',  label:'Private key copied' },
  default:            { icon:Shield,      color:'#b5aea8',  bg:'rgba(232,245,244,0.06)', label:'Event' },
}

const STATUS_META = {
  pending:   { label:'Scheduled', color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.25)' },
  executing: { label:'Running',   color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.25)' },
  sent:      { label:'Done',      color:'#4ade80', bg:'rgba(74,222,128,0.12)',  border:'rgba(74,222,128,0.25)' },
  skipped:   { label:'Skipped',   color:'rgba(255,255,255,0.3)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)' },
  failed:    { label:'Failed',    color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.25)' },
}

// ── Tab bar ───────────────────────────────────────────────────────────
function TabBar({ tab, setTab, isAdmin, upcomingCount, historyCount, failedCount, alertCount }) {
  const tabs = [
    { id:'upcoming', label:'Upcoming', icon:Calendar, count: upcomingCount },
    { id:'history',  label:'History',  icon:History,  count: historyCount },
    ...(isAdmin ? [{ id:'admin', label:'Admin view', icon:Shield, count: failedCount + alertCount, warn: true }] : []),
  ]
  return (
    <div style={{ display:'flex', gap:3, marginBottom:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:3 }}>
      {tabs.map(t => {
        const Icon = t.icon
        const active = tab === t.id
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer',
            fontFamily:'inherit', fontSize:12, fontWeight: active ? 600 : 500,
            background: active ? 'rgba(192,57,43,0.3)' : 'transparent',
            color: active ? '#ffffff' : '#b0a8a0',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.15s',
          }}>
            <Icon size={13} strokeWidth={active ? 2 : 1.8} aria-hidden="true" />
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:8,
                background: t.warn && !active ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.12)',
                color: t.warn && !active ? '#f87171' : 'rgba(255,255,255,0.7)',
                border: t.warn && !active ? '0.5px solid rgba(248,113,113,0.3)' : 'none',
              }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1: UPCOMING — renewal event schedule per cert
// ══════════════════════════════════════════════════════════════════════
function UpcomingTab({ user }) {
  const [certs, setCerts]       = useState([])
  const [eventsMap, setEvMap]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [selectedId, setSelId]  = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: certData } = await supabase
        .from('certificates')
        .select('id,domain,expires_at,subscription_end_date,status,action_required,action_required_reason,reissue_count')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('is_current', true)
        .order('expires_at', { ascending: true })
      const list = certData || []
      setCerts(list)
      if (list.length > 0) {
        const certIds = list.map(c => c.id)
        const { data: evData } = await supabase
          .from('renewal_events')
          .select('id,cert_id,event_type,scheduled_date,status,retry_count,error_message')
          .in('cert_id', certIds)
          .order('scheduled_date', { ascending: true })
        const map = {}
        for (const ev of (evData || [])) {
          if (!map[ev.cert_id]) map[ev.cert_id] = []
          map[ev.cert_id].push(ev)
        }
        setEvMap(map)
        if (!selectedId && list.length > 0) setSelId(list[0].id)
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const selCert   = certs.find(c => c.id === selectedId) || null
  const selEvents = selectedId ? (eventsMap[selectedId] || []) : []
  const today     = new Date().toISOString().split('T')[0]
  const actionCount = certs.filter(c => c.action_required).length

  return (
    <div>
      {actionCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderRadius:8, marginBottom:14,
          background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', fontSize:12, color:'#f87171' }}>
          <AlertTriangle size={13} strokeWidth={2} />
          <span><strong>{actionCount} certificate{actionCount>1?'s':''}</strong> require manual reissue — auto-reissue failed.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:12 }}>
        {/* Left: cert list */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'7px 12px', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)',
            textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'0.5px solid rgba(255,255,255,0.07)',
            background:'rgba(255,255,255,0.02)' }}>Active certificates</div>
          {loading ? (
            <div style={{ padding:'32px', textAlign:'center', fontSize:12, color:'#b0a8a0' }}>Loading…</div>
          ) : certs.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center' }}>
              <Shield size={24} strokeWidth={1.4} color="rgba(255,255,255,0.15)" style={{ marginBottom:8 }} />
              <div style={{ fontSize:12, color:'#b0a8a0' }}>No active certificates</div>
            </div>
          ) : certs.map(cert => {
            const days = daysFromNow(cert.expires_at)
            const urgColor = cert.action_required ? '#f87171' : days !== null && days <= 14 ? '#ef4444' : days !== null && days <= 30 ? '#fbbf24' : '#4ade80'
            const evCount = (eventsMap[cert.id] || []).filter(e => e.status === 'pending').length
            const selected = selectedId === cert.id
            return (
              <div key={cert.id} onClick={() => setSelId(cert.id)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderBottom:'0.5px solid rgba(255,255,255,0.06)', cursor:'pointer',
                background: selected ? 'rgba(192,57,43,0.1)' : 'transparent',
                borderLeft: selected ? '2px solid #c0392b' : '2px solid transparent',
                transition:'background 0.12s',
              }}>
                <div style={{ width:28, height:28, borderRadius:6, flexShrink:0,
                  background: cert.action_required ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.12)',
                  border:`0.5px solid ${cert.action_required ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.25)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ShieldCheck size={13} color={cert.action_required ? '#f87171' : '#4ade80'} strokeWidth={2} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#ffffff', fontFamily:'monospace',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert.domain}</div>
                  <div style={{ fontSize:10, color:'#b0a8a0', marginTop:1, display:'flex', gap:6 }}>
                    <span style={{ color: urgColor, fontWeight:600 }}>
                      {days !== null ? (days <= 0 ? 'Expired' : `${days}d`) : '—'}
                    </span>
                    {cert.subscription_end_date && <span>· Sub: {daysFromNow(cert.subscription_end_date)}d</span>}
                    {evCount > 0 && <span>· {evCount} pending</span>}
                  </div>
                </div>
                <ChevronRight size={12} color="rgba(255,255,255,0.25)" />
              </div>
            )
          })}
        </div>

        {/* Right: event timeline */}
        {selCert ? (
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, overflow:'hidden' }}>
            {/* Cert header */}
            <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:6, background:'rgba(74,222,128,0.12)',
                border:'0.5px solid rgba(74,222,128,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ShieldCheck size={13} color="#4ade80" strokeWidth={2} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', fontFamily:'monospace',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selCert.domain}</div>
                <div style={{ fontSize:10, color:'#b0a8a0' }}>
                  {selEvents.filter(e=>e.status==='pending').length} events scheduled
                </div>
              </div>
            </div>

            {/* Action required */}
            {selCert.action_required && (
              <div style={{ padding:'9px 12px', background:'rgba(248,113,113,0.08)',
                borderBottom:'0.5px solid rgba(248,113,113,0.2)', display:'flex', gap:8 }}>
                <AlertTriangle size={13} color="#f87171" strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:11, color:'#f87171', lineHeight:1.5 }}>
                  <strong>Manual action required</strong><br/>
                  {selCert.action_required_reason || 'Auto-reissue failed. Please reissue manually.'}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.07)' }}>
              {[
                { label:'Cert expires', value: daysFromNow(selCert.expires_at) !== null ? `${daysFromNow(selCert.expires_at)}d` : '—', sub: fmtDate(selCert.expires_at), urgent: daysFromNow(selCert.expires_at) !== null && daysFromNow(selCert.expires_at) <= 30 },
                { label:'Subscription', value: daysFromNow(selCert.subscription_end_date) !== null ? `${daysFromNow(selCert.subscription_end_date)}d` : '—', sub: fmtDate(selCert.subscription_end_date), urgent: false },
              ].map((s, i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.04)', borderRadius:6, padding:'8px 10px' }}>
                  <div style={{ fontSize:14, fontWeight:700, color: s.urgent ? '#fbbf24' : '#ffffff' }}>{s.value}</div>
                  <div style={{ fontSize:9, color:'#b0a8a0', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginTop:1 }}>{s.label}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:1 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ padding:'10px 12px', maxHeight:280, overflowY:'auto' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Schedule</div>
              {selEvents.length === 0 ? (
                <div style={{ fontSize:11, color:'#b0a8a0', padding:'12px 0' }}>No events scheduled.</div>
              ) : (
                <div style={{ borderLeft:'1.5px solid rgba(255,255,255,0.08)', paddingLeft:12, marginLeft:6 }}>
                  {selEvents.map(ev => {
                    const meta = RENEWAL_EVENT_META[ev.event_type] || { label: ev.event_type, color:'#b0a8a0', icon:Calendar }
                    const Icon = meta.icon
                    const sMeta = STATUS_META[ev.status] || STATUS_META.pending
                    const isToday = ev.scheduled_date === today
                    const days = daysFromNow(ev.scheduled_date)
                    return (
                      <div key={ev.id} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, marginLeft:-19,
                          background: ev.status === 'sent' ? `${meta.color}25` : 'rgba(255,255,255,0.05)',
                          border:`1.5px solid ${ev.status === 'sent' ? meta.color : ev.status === 'failed' ? '#f87171' : isToday ? meta.color : 'rgba(255,255,255,0.15)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          boxShadow: isToday && ev.status === 'pending' ? `0 0 0 3px ${meta.color}22` : 'none' }}>
                          {ev.status === 'sent' ? <Check size={7} strokeWidth={3} color={meta.color} />
                           : ev.status === 'failed' ? <X size={7} strokeWidth={2.5} color="#f87171" />
                           : <Icon size={7} strokeWidth={2} color={isToday ? meta.color : 'rgba(255,255,255,0.3)'} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', marginBottom:1 }}>
                            <span style={{ fontSize:11, fontWeight:600, color:'#e8e0d8' }}>{meta.label}</span>
                            <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:3,
                              background: sMeta.bg, color: sMeta.color, border:`0.5px solid ${sMeta.border}`,
                              textTransform:'uppercase', letterSpacing:'0.3px' }}>{sMeta.label}</span>
                            {isToday && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:3,
                              background:'rgba(192,57,43,0.2)', color:'#ff8c7a', border:'0.5px solid rgba(192,57,43,0.3)',
                              textTransform:'uppercase' }}>today</span>}
                          </div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>
                            {fmtDate(ev.scheduled_date)}
                            {days !== null && <span style={{ marginLeft:4 }}>· {days > 0 ? `in ${days}d` : days === 0 ? 'today' : `${Math.abs(days)}d ago`}</span>}
                          </div>
                          {ev.error_message && <div style={{ fontSize:9, color:'#f87171', marginTop:2, fontFamily:'monospace' }}>{ev.error_message.slice(0,80)}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
            <div style={{ textAlign:'center', color:'#b0a8a0', fontSize:12 }}>Select a certificate</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2: HISTORY — cert lifecycle events
// ══════════════════════════════════════════════════════════════════════
function HistoryTab({ user }) {
  const [events,  setEvents]   = useState([])
  const [loading, setLoading]  = useState(true)
  const [search,  setSearch]   = useState('')
  const [filter,  setFilter]   = useState('all')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      const { data: evts } = await supabase
        .from('cert_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500)
      const { data: auditRows } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', user.id)
        .in('action', ['private_key_copied', 'private_key_revealed'])
        .order('created_at', { ascending: false })
        .limit(200)
      const auditEvents = (auditRows || []).map(r => ({
        id: r.id, domain: r.metadata?.domain || '—',
        event_type: r.action, meta: r.metadata || {},
        created_at: r.created_at, source: 'audit',
      }))
      const all = [...(evts || []), ...auditEvents].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      setEvents(all)
      setLoading(false)
    }
    load()
  }, [user?.id])

  const eventTypes = ['all', ...new Set(events.map(e => e.event_type))]
  const filtered = events.filter(e => {
    const ms = !search || e.domain?.toLowerCase().includes(search.toLowerCase()) || e.event_type?.toLowerCase().includes(search.toLowerCase())
    const mf = filter === 'all' || e.event_type === filter
    return ms && mf
  })
  const grouped = filtered.reduce((acc, ev) => {
    const day = new Date(ev.created_at).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(ev)
    return acc
  }, {})

  return (
    <div>
      {/* Search + filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <div style={{ flex:1, position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#b0a8a0', pointerEvents:'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by domain or event type…"
            style={{ width:'100%', paddingLeft:30, fontSize:12, boxSizing:'border-box' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ fontSize:11, padding:'0 10px', borderRadius:8, minWidth:120 }}>
          {eventTypes.map(t => <option key={t} value={t}>{t === 'all' ? 'All events' : t.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#b0a8a0' }}>
          <RefreshCw size={22} style={{ animation:'spin .8s linear infinite', margin:'0 auto 10px', display:'block', color:'#ff8c7a' }} />
          Loading history…
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 0' }}>
          <History size={30} style={{ color:'rgba(255,255,255,0.15)', margin:'0 auto 10px', display:'block' }} />
          <div style={{ fontSize:14, fontWeight:600, color:'#ffffff', marginBottom:6 }}>No events yet</div>
          <div style={{ fontSize:12, color:'#b0a8a0' }}>Events are recorded when you issue, renew, revoke or install certificates.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', fontSize:13, color:'#b0a8a0' }}>No events match your filter.</div>
      ) : (
        Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day} style={{ marginBottom:22 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:'0.4px',
              textTransform:'uppercase', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
              {day}
              <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.08)' }} />
            </div>
            {dayEvents.map(ev => {
              const cfg = HISTORY_EVENT_META[ev.event_type] || HISTORY_EVENT_META.default
              const Icon = cfg.icon
              const isExp = expanded[ev.id]
              const hasMeta = ev.meta && Object.keys(ev.meta).length > 0
              return (
                <div key={ev.id} style={{ display:'flex', gap:12, marginBottom:8 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:cfg.bg,
                      display:'flex', alignItems:'center', justifyContent:'center', border:`0.5px solid ${cfg.color}33` }}>
                      <Icon size={13} color={cfg.color} strokeWidth={2} />
                    </div>
                    <div style={{ flex:1, width:'0.5px', background:'rgba(255,255,255,0.07)', minHeight:8, marginTop:3 }} />
                  </div>
                  <div style={{ flex:1, minWidth:0, paddingBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#ffffff' }}>{cfg.label}</span>
                      <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:3,
                        background:cfg.bg, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.3px' }}>
                        {ev.event_type.replace(/_/g,' ')}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'#e8e0d8', marginBottom:3, fontFamily:'monospace' }}>{ev.domain}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, color:'#b0a8a0' }}>{fmtFull(ev.created_at)}</span>
                      {hasMeta && (
                        <button onClick={() => setExpanded(p => ({ ...p, [ev.id]: !p[ev.id] }))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#b0a8a0',
                            display:'flex', alignItems:'center', gap:3, fontSize:10, padding:0, fontFamily:'inherit' }}>
                          {isExp ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                          {isExp ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </div>
                    {isExp && hasMeta && (
                      <div style={{ marginTop:6, background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.1)',
                        borderRadius:6, padding:'8px 10px', fontSize:10, fontFamily:'monospace', color:'#e8e0d8' }}>
                        {Object.entries(ev.meta).map(([k,v]) => (
                          <div key={k} style={{ marginBottom:2 }}>
                            <span style={{ color:'#b0a8a0' }}>{k}: </span><span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3: ADMIN VIEW — platform-wide monitoring
// ══════════════════════════════════════════════════════════════════════
function AdminTab({ user }) {
  const [loading, setLoading]     = useState(true)
  const [events, setEvents]       = useState([])
  const [certs, setCerts]         = useState([])
  const [alerts, setAlerts]       = useState([])
  const [subtab, setSubtab]       = useState('upcoming')
  const [resolving, setResolving] = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const in7 = new Date(Date.now() + 7*86400000).toISOString().split('T')[0]
      const { data: evData } = await supabase
        .from('renewal_events')
        .select('id,cert_id,user_id,event_type,scheduled_date,status,retry_count,error_message')
        .or(`scheduled_date.lte.${in7},status.eq.failed`)
        .order('scheduled_date', { ascending: true })
        .limit(200)
      setEvents(evData || [])
      const certIds = [...new Set((evData||[]).map(e=>e.cert_id).filter(Boolean))]
      if (certIds.length > 0) {
        const { data: certData } = await supabase.from('certificates').select('id,domain,expires_at').in('id', certIds)
        setCerts(certData || [])
      }
      const { data: alertData } = await supabase
        .from('admin_alerts')
        .select('id,domain,message,status,created_at')
        .eq('status','open')
        .order('created_at', { ascending: false })
        .limit(50)
      setAlerts(alertData || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const resolveAlert = async (id) => {
    setResolving(id)
    await supabase.from('admin_alerts').update({ status:'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    setAlerts(a => a.filter(x => x.id !== id))
    setResolving(null)
  }

  const today    = new Date().toISOString().split('T')[0]
  const certMap  = Object.fromEntries(certs.map(c => [c.id, c]))
  const todayEvs = events.filter(e => e.scheduled_date === today)
  const upcoming = events.filter(e => e.scheduled_date > today && e.status === 'pending')
  const failed   = events.filter(e => e.status === 'failed')

  const tabEvents = subtab === 'today' ? todayEvs : subtab === 'failed' ? failed : upcoming

  const SUBTABS = [
    { id:'upcoming', label:'Upcoming', count: upcoming.length },
    { id:'today',    label:'Today',    count: todayEvs.length },
    { id:'failed',   label:'Failed',   count: failed.length, warn: true },
    { id:'alerts',   label:'Alerts',   count: alerts.length, warn: true },
  ]

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Certs monitored', value: new Set(events.map(e=>e.cert_id)).size, color:'#4ade80', icon:Shield },
          { label:'Events today',    value: todayEvs.length, color:'#60a5fa', icon:Calendar },
          { label:'Failed events',   value: failed.length,   color: failed.length>0?'#f87171':'rgba(255,255,255,0.2)', icon:AlertTriangle },
          { label:'Open alerts',     value: alerts.length,   color: alerts.length>0?'#f87171':'rgba(255,255,255,0.2)', icon:Bell },
        ].map((s,i) => {
          const Icon = s.icon
          return (
            <div key={i} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:7, flexShrink:0, background:`${s.color}18`, border:`1px solid ${s.color}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={15} strokeWidth={1.8} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:'#ffffff', lineHeight:1.1 }}>{loading ? '…' : s.value}</div>
                <div style={{ fontSize:10, color:'#b0a8a0', marginTop:2 }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Subtab bar */}
      <div style={{ display:'flex', gap:3, marginBottom:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:7, padding:3 }}>
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id)} style={{
            flex:1, padding:'6px 8px', borderRadius:5, border:'none', cursor:'pointer',
            fontFamily:'inherit', fontSize:11, fontWeight: subtab===t.id ? 600 : 400,
            background: subtab===t.id ? 'rgba(192,57,43,0.25)' : 'transparent',
            color: subtab===t.id ? '#ffffff' : '#b0a8a0',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:8,
                background: t.warn && subtab!==t.id ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.1)',
                color: t.warn && subtab!==t.id ? '#f87171' : 'rgba(255,255,255,0.6)' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', fontSize:12, color:'#b0a8a0' }}>Loading…</div>
        ) : subtab === 'alerts' ? (
          alerts.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center' }}>
              <ShieldCheck size={26} strokeWidth={1.4} color="rgba(74,222,128,0.4)" style={{ marginBottom:8 }} />
              <div style={{ fontSize:13, fontWeight:600, color:'#ffffff', marginBottom:4 }}>No open alerts</div>
              <div style={{ fontSize:11, color:'#b0a8a0' }}>All certificates healthy.</div>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 14px',
              borderBottom:'0.5px solid rgba(248,113,113,0.15)', background:'rgba(248,113,113,0.05)' }}>
              <AlertTriangle size={13} color="#f87171" strokeWidth={2} style={{ flexShrink:0, marginTop:2 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', marginBottom:2 }}>{a.domain || '—'}</div>
                <div style={{ fontSize:11, color:'#f87171', lineHeight:1.5 }}>{(a.message||'').slice(0,120)}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{timeAgo(a.created_at)}</div>
              </div>
              <button onClick={() => resolveAlert(a.id)} disabled={resolving===a.id}
                style={{ padding:'4px 10px', borderRadius:5, fontSize:10, fontWeight:600, flexShrink:0,
                  border:'1px solid rgba(74,222,128,0.3)', background:'rgba(74,222,128,0.1)', color:'#4ade80',
                  cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}>
                <Check size={9} strokeWidth={2.5} />{resolving===a.id ? 'Saving…' : 'Resolve'}
              </button>
            </div>
          ))
        ) : tabEvents.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center' }}>
            <Calendar size={26} strokeWidth={1.4} color="rgba(255,255,255,0.12)" style={{ marginBottom:8 }} />
            <div style={{ fontSize:13, fontWeight:600, color:'#ffffff', marginBottom:4 }}>
              {subtab==='today' ? 'No events today' : subtab==='failed' ? 'No failed events' : 'No upcoming events this week'}
            </div>
            <div style={{ fontSize:11, color:'#b0a8a0' }}>
              {subtab==='failed' ? 'All automations running cleanly.' : 'Events appear as certs approach expiry.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
              fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.5px',
              borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
              <div style={{ width:8, flexShrink:0 }} />
              <div style={{ width:150, flexShrink:0 }}>Domain</div>
              <div style={{ width:110, flexShrink:0 }}>Event</div>
              <div style={{ width:90, flexShrink:0 }}>Date</div>
              <div style={{ flex:1 }}>Status</div>
            </div>
            {tabEvents.map(ev => {
              const cert = certMap[ev.cert_id]
              const isReissue = ev.event_type === 'cert_reissue'
              const days = daysFromNow(ev.scheduled_date)
              const isToday = days === 0
              const statusColor = ev.status==='sent'?'#4ade80':ev.status==='failed'?'#f87171':ev.status==='executing'?'#fbbf24':'#60a5fa'
              return (
                <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
                  borderBottom:'0.5px solid rgba(255,255,255,0.06)',
                  background: ev.status==='failed' ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:statusColor }} />
                  <div style={{ width:150, flexShrink:0, fontSize:11, fontWeight:600, color:'#ffffff',
                    fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {cert?.domain || '—'}
                  </div>
                  <div style={{ width:110, flexShrink:0 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4,
                      background: isReissue ? 'rgba(74,222,128,0.12)' : 'rgba(192,57,43,0.12)',
                      color: isReissue ? '#4ade80' : '#ff8c7a',
                      border:`0.5px solid ${isReissue ? 'rgba(74,222,128,0.25)' : 'rgba(255,140,122,0.25)'}` }}>
                      {(RENEWAL_EVENT_META[ev.event_type]?.label || ev.event_type)}
                    </span>
                  </div>
                  <div style={{ width:90, flexShrink:0, fontSize:11, color: isToday ? '#ff8c7a' : '#e8e0d8', fontWeight: isToday ? 700 : 400 }}>
                    {fmtShort(ev.scheduled_date)}
                    {isToday && <span style={{ marginLeft:4, fontSize:8, background:'rgba(192,57,43,0.2)', color:'#ff8c7a', padding:'1px 4px', borderRadius:3 }}>today</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:3, textTransform:'uppercase', letterSpacing:'0.3px',
                      background:`${statusColor}15`, color:statusColor, border:`0.5px solid ${statusColor}30` }}>
                      {ev.status}{ev.retry_count>0 ? ` · ${ev.retry_count}` : ''}
                    </span>
                    {ev.error_message && <span style={{ fontSize:9, color:'#f87171', marginLeft:6 }}>{ev.error_message.slice(0,60)}</span>}
                  </div>
                </div>
              )
            })}
            <div style={{ padding:'7px 14px', fontSize:9, color:'rgba(255,255,255,0.2)', borderTop:'0.5px solid rgba(255,255,255,0.06)', textAlign:'right' }}>
              {tabEvents.length} event{tabEvents.length!==1?'s':''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════
export default function CertTimeline({ user }) {
  const [tab, setTab]       = useState('upcoming')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [historyCount, setHistoryCount]   = useState(0)
  const [failedCount, setFailedCount]     = useState(0)
  const [alertCount, setAlertCount]       = useState(0)

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return
      // Check admin role
      const { data: account } = await supabase.from('accounts').select('role').eq('id', user.id).single()
      setIsAdmin(account?.role === 'master_admin')
      setAdminChecked(true)

      // Get counts for tab badges
      const in7 = new Date(Date.now() + 7*86400000).toISOString().split('T')[0]
      const { count: uc } = await supabase.from('renewal_events').select('*', { count:'exact', head:true }).eq('status','pending').gt('scheduled_date', new Date().toISOString().split('T')[0])
      const { count: hc } = await supabase.from('cert_events').select('*', { count:'exact', head:true }).eq('user_id', user.id)
      const { count: fc } = await supabase.from('renewal_events').select('*', { count:'exact', head:true }).eq('status','failed')
      const { count: ac } = await supabase.from('admin_alerts').select('*', { count:'exact', head:true }).eq('status','open')
      setUpcomingCount(uc || 0)
      setHistoryCount(hc || 0)
      setFailedCount(fc || 0)
      setAlertCount(ac || 0)
    }
    init()
  }, [user?.id])

  return (
    <div className="v2-page" style={{ padding:'24px 24px 80px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="v2-h1" style={{ marginBottom:4 }}>Certificate Timeline</h1>
          <p style={{ margin:0, fontSize:12, color:'#b0a8a0' }}>
            Renewal schedule · Lifecycle history{isAdmin ? ' · Admin monitoring' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {adminChecked && (
        <TabBar
          tab={tab} setTab={setTab} isAdmin={isAdmin}
          upcomingCount={upcomingCount} historyCount={historyCount}
          failedCount={failedCount} alertCount={alertCount}
        />
      )}

      {/* Tab content */}
      {tab === 'upcoming' && <UpcomingTab user={user} />}
      {tab === 'history'  && <HistoryTab  user={user} />}
      {tab === 'admin'    && isAdmin && <AdminTab user={user} />}
    </div>
  )
}
