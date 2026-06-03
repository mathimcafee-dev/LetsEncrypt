// CertChangelog.jsx — Timeline of all cert events: issued, renewed, revoked, installed, rotated
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  History, Shield, RefreshCw, ShieldCheck, ShieldOff,
  Zap, RotateCcw, Download, Search, Filter, ChevronDown, ChevronUp
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const EVENT_CONFIG = {
  issued:          { icon: ShieldCheck, color: '#1f5c4e', bg: 'rgba(31,92,78,0.09)', label: 'Certificate issued' },
  reissued:        { icon: RefreshCw,   color: '#1f5c4e', bg: 'rgba(31,92,78,0.09)', label: 'Certificate reissued' },
  renewed:         { icon: RotateCcw,   color: '#1f5c4e', bg: 'rgba(31,92,78,0.09)', label: 'Certificate renewed' },
  revoked:         { icon: ShieldOff,   color: '#1f5c4e', bg: 'rgba(248,113,113,0.12)', label: 'Certificate revoked' },
  agent_installed: { icon: Zap,         color: '#9a6400', bg: 'rgba(251,191,36,0.12)', label: 'Installed by agent' },
  key_rotated:     { icon: RotateCcw,   color: '#1f5c4e', bg: 'rgba(255,107,91,0.12)', label: 'Key rotated' },
  downloaded:      { icon: Download,    color: '#1f5c4e', bg: 'rgba(31,92,78,0.09)', label: 'Certificate downloaded' },
  private_key_copied: { icon: Shield,   color: '#1f5c4e', bg: 'rgba(255,107,91,0.12)', label: 'Private key copied' },
  default:         { icon: Shield,      color: '#b5aea8', bg: 'rgba(232,245,244,0.06)', label: 'Event' },
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function CertChangelog({ user }) {
  const isMobile = useIsMobile()
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      // Load cert_events table
      const { data: evts } = await supabase
        .from('cert_events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(500)

      // Also pull from audit_log for private key events
      const { data: auditRows } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', session.user.id)
        .in('action', ['private_key_copied', 'private_key_revealed'])
        .order('created_at', { ascending: false })
        .limit(200)

      const auditEvents = (auditRows || []).map(r => ({
        id: r.id,
        domain: r.metadata?.domain || '—',
        event_type: r.action,
        meta: r.metadata || {},
        created_at: r.created_at,
        source: 'audit',
      }))

      // Merge + sort
      const all = [...(evts || []), ...auditEvents].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
      setEvents(all)
      setLoading(false)
    }
    load()
  }, [])

  const eventTypes = ['all', ...new Set(events.map(e => e.event_type))]

  const filtered = events.filter(e => {
    const matchSearch = !search ||
      e.domain?.toLowerCase().includes(search.toLowerCase()) ||
      e.event_type?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || e.event_type === filter
    return matchSearch && matchFilter
  })

  // Group by date
  const grouped = filtered.reduce((acc, ev) => {
    const day = new Date(ev.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(ev)
    return acc
  }, {})

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 780 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 20, paddingTop: 8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>Certificate changelog</h1>
            <p style={{ fontSize:13, color: '#888888', marginTop: 4 }}>
              Complete history — every issue, renewal, revocation and install across all your certificates
            </p>
          </div>
          <div style={{ fontSize:12, color: '#888888', marginTop: 8 }}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Summary counts */}
        {events.length > 0 && (() => {
          const counts = events.reduce((a, e) => { a[e.event_type] = (a[e.event_type]||0)+1; return a }, {})
          const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4)
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
              {top.map(([type, count]) => {
                const cfg = EVENT_CONFIG[type] || EVENT_CONFIG.default
                const Icon = cfg.icon
                return (
                  <div key={type} className="v2-card" style={{ padding: '10px 12px', cursor: 'pointer',
                    borderColor: filter === type ? cfg.color + '66' : 'var(--v2-border)' }}
                    onClick={() => setFilter(filter === type ? 'all' : type)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={11} color={cfg.color} />
                      </div>
                      <span style={{ fontSize:18, fontWeight: 500, color: cfg.color, fontFamily: 'monospace' }}>{count}</span>
                    </div>
                    <div style={{ fontSize:10, color: '#888888', textTransform: 'capitalize' }}>
                      {type.replace(/_/g, ' ')}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#888888', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by domain or event type…"
              style={{ width: '100%', paddingLeft: 32, fontSize:13, boxSizing: 'border-box' }} />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ fontSize:12, padding: '0 10px', borderRadius: 8,
              border: '0.5px solid var(--v2-border)', background:'rgba(0,0,0,0.02)', color: '#111111' }}>
            {eventTypes.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All events' : t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Timeline */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#888888' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Loading changelog…
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <History size={32} style={{ color: '#888888', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize:14, fontWeight: 500, color: '#333333', marginBottom: 6 }}>
              No events yet
            </div>
            <div style={{ fontSize:12, color: '#888888' }}>
              Events are recorded when you issue, renew, revoke or install certificates.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize:13, color: '#888888' }}>
            No events match your filter.
          </div>
        ) : (
          Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day} style={{ marginBottom: 24 }}>
              {/* Day label */}
              <div style={{ fontSize:11, fontWeight: 600, color: '#888888',
                letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 10 }}>
                {day}
                <div style={{ flex: 1, height: '0.5px', background: 'var(--v2-border)' }} />
              </div>

              {/* Events for this day */}
              {dayEvents.map(ev => {
                const cfg = EVENT_CONFIG[ev.event_type] || EVENT_CONFIG.default
                const Icon = cfg.icon
                const isExp = expanded[ev.id]
                const hasMeta = ev.meta && Object.keys(ev.meta).length > 0

                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    {/* Icon + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `0.5px solid ${cfg.color}33` }}>
                        <Icon size={14} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, width: '0.5px', background: 'var(--v2-border)',
                        minHeight: 8, marginTop: 3 }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize:10, fontWeight: 500, padding: '1px 6px', borderRadius: 3,
                          background: cfg.bg, color: cfg.color }}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color: '#333333', marginBottom: 3 }}>
                        {ev.domain}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize:11, color: '#888888' }}>
                          {fmtDate(ev.created_at)}
                        </span>
                        {hasMeta && (
                          <button onClick={() => setExpanded(p => ({ ...p, [ev.id]: !p[ev.id] }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer',
                              color: '#888888', display: 'flex', alignItems: 'center', gap: 3,
                              fontSize:11, padding: 0 }}>
                            {isExp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            {isExp ? 'Hide details' : 'Show details'}
                          </button>
                        )}
                      </div>

                      {/* Meta details */}
                      {isExp && hasMeta && (
                        <div style={{ marginTop: 6, background: 'var(--v2-surface-3)',
                          border: '0.5px solid var(--v2-border)', borderRadius: 6,
                          padding: '8px 10px', fontSize:11, fontFamily: 'monospace',
                          color: '#333333' }}>
                          {Object.entries(ev.meta).map(([k, v]) => (
                            <div key={k} style={{ marginBottom: 2 }}>
                              <span style={{ color: '#888888' }}>{k}: </span>
                              <span>{String(v)}</span>
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
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
