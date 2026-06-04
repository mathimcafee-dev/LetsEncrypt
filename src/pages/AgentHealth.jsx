// AgentHealth.jsx — Option A: Ops command centre
// Table view · Job drawer · Inline actions · Filter/Search · Auto-refresh
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, Server, RefreshCw, Clock, Zap, ChevronDown,
  AlertTriangle, Shield, Search, X, Filter, Trash2,
  CheckCircle, XCircle, AlertCircle, Terminal,
  ChevronRight, Copy, Check, Pause, Play, WifiOff
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL  = 'https://frthcwkntciaakqsppss.supabase.co'
const REFRESH = 30000

// ── Helpers ───────────────────────────────────────────────────────────
async function callDaemon(tok, body) {
  const r = await fetch(`${SB_URL}/functions/v1/agent-daemon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function fmtUptime(secs) {
  if (!secs) return '—'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

// ── Mini metric bar (inline, horizontal) ─────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function MiniBar({ value, warn = 80, danger = 90 }) {
  if (value == null) return <span style={{ color: '#888888', fontSize:11 }}>—</span>
  const pct   = Math.min(100, Math.max(0, value))
  const color = pct >= danger ? '#1f5c4e' : pct >= warn ? '#111111' : '#16a068'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--v2-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2,
          transition: 'width .6s cubic-bezier(.16,1,.3,1)' }}/>
      </div>
      <span style={{ fontSize:11, fontWeight: 500, color, fontFamily: 'monospace', minWidth: 30, textAlign: 'right' }}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    online:  { bg: 'transparent', color: '#111111', label: 'Online',   dot: '#16a068' },
    offline: { bg: 'rgba(31,92,78,0.09)', color: '#1f5c4e', label: 'Offline',  dot: '#1f5c4e' },
    never:   { bg: '#000000', color: '#333333', label: 'Never',    dot: '#aaaaaa' },
    unknown: { bg: 'rgba(239,68,68,0.08)', color: '#1f5c4e', label: 'Unknown',  dot: '#111111' },
  }
  const s = map[status] || map.unknown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize:10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
      background: s.bg, color: s.color, letterSpacing: '0.2px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot,
        animation: status === 'online' ? 'v3pulse 2s ease infinite' : 'none' }}/>
      {s.label}
    </span>
  )
}

// ── Job result badge ──────────────────────────────────────────────────
function JobBadge({ status }) {
  if (!status) return <span style={{ color: '#888888', fontSize:11 }}>—</span>
  const map = {
    success: { bg: 'transparent', color: '#111111' },
    failed:  { bg: 'rgba(31,92,78,0.09)', color: '#1f5c4e' },
    queued:  { bg: 'rgba(239,68,68,0.08)', color: '#1f5c4e' },
    claimed: { bg: 'transparent', color: '#333333' },
  }
  const s = map[status] || { bg: '#000000', color: '#333333' }
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

// ── Renewal badge (days until soonest cert expiry on this agent) ──────
function RenewalBadge({ days }) {
  if (days == null) return <span style={{ color: '#888888', fontSize:11 }}>—</span>
  const color = days <= 7 ? '#1f5c4e' : days <= 30 ? '#111111' : '#16a068'
  const bg    = days <= 7 ? 'rgba(31,92,78,0.09)' : days <= 30 ? 'rgba(239,68,68,0.08)' : 'transparent'
  return (
    <span style={{ fontSize:11, fontWeight: 500, color, background: bg,
      padding: '2px 7px', borderRadius: 4 }}>
      {days <= 0 ? 'Expired' : `${days}d`}
      {days <= 7 && ' ⚠'}
    </span>
  )
}

// ── Slide-out drawer (job history + health events + actions) ──────────
function Drawer({ agent, tok, onClose, onDelete }) {
  const [jobs,      setJobs]      = useState(null)
  const [events,    setEvents]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('jobs')
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    const load = async () => {
      const [jr, er] = await Promise.all([
        callDaemon(tok, { action: 'list_jobs',           user_id: agent.user_id, agent_id: agent.id }),
        callDaemon(tok, { action: 'agent_health_events', user_id: agent.user_id, agent_id: agent.id, limit: 20 }),
      ])
      setJobs(jr.jobs   || [])
      setEvents(er.events || [])
      setLoading(false)
    }
    load()
  }, [agent.id])

  const statusColor = { success: '#16a068', failed: '#1f5c4e', queued: '#111111', claimed: '#111111' }
  const eventIcon   = { online: '🟢', offline: '🔴', recovered: '✅', degraded: '🟡' }

  const copyCmd = () => {
    navigator.clipboard?.writeText(`systemctl restart sslvault-agent`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(240,237,232,0.28)', zIndex: 40 }}/>
      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 50,
        background:'rgba(0,0,0,0.02)', borderLeft: '1px solid var(--v2-border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--v2-border)',
          display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0,
          background:'rgba(0,0,0,0.02)', zIndex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={16} color="#16a34a"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize:14, fontWeight: 500, color: '#111111',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.nickname}
            </div>
            <div style={{ fontSize:11, color: '#888888' }}>
              {agent.hostname || agent.ip_address || '—'} · v{agent.agent_version || '?'}
            </div>
          </div>
          <StatusPill status={agent.computed_status || 'unknown'}/>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: '#888888', padding: 4, display: 'flex' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 1,
          borderBottom: '1px solid var(--v2-border)', background: 'var(--v2-border)' }}>
          {[
            { label: 'Uptime',        val: fmtUptime(agent.uptime_seconds) },
            { label: 'Certs managed', val: agent.certs_managed ?? '—' },
            { label: 'Last seen',     val: timeAgo(agent.last_seen_at) },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--v2-surface-3)', padding: '10px 14px' }}>
              <div style={{ fontSize:10, color: '#888888', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Metrics */}
        {(agent.cpu_pct != null || agent.mem_pct != null || agent.disk_pct != null) && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--v2-border)' }}>
            <div className="v2-section-label" style={{ marginBottom: 10 }}>Resources</div>
            {[
              { label: 'CPU',  value: agent.cpu_pct },
              { label: 'RAM',  value: agent.mem_pct },
              { label: 'Disk', value: agent.disk_pct, warn: 85, danger: 95 },
            ].map(({ label, value, warn = 80, danger = 90 }) => value != null && (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize:12, color: '#888888' }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight: 500,
                    color: value >= danger ? '#1f5c4e' : value >= warn ? '#111111' : '#16a068',
                    fontFamily: 'monospace' }}>{Math.round(value)}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--v2-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, transition: 'width .6s',
                    width: `${Math.min(100, value)}%`,
                    background: value >= danger ? '#1f5c4e' : value >= warn ? '#111111' : '#16a068' }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--v2-border)' }}>
          <div className="v2-section-label" style={{ marginBottom: 10 }}>Actions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-sm" onClick={copyCmd}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {copied ? <Check size={11}/> : <Copy size={11}/>}
              {copied ? 'Copied!' : 'Copy restart cmd'}
            </button>
            <button className="v2-btn v2-btn-sm" onClick={() => onDelete(agent)}
              style={{ display: 'flex', alignItems: 'center', gap: 5,
                borderColor: 'rgba(0,0,0,0.1)', color: '#1f5c4e' }}>
              <Trash2 size={11}/>
              Delete agent
            </button>
          </div>
          <p style={{ fontSize:11, color: '#888888', marginTop: 8 }}>
            SSH into your server and run the copied command to restart the agent.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--v2-border)' }}>
          {[
            { id: 'jobs',   label: 'Job history' },
            { id: 'events', label: 'Health events' },
            { id: 'info',   label: 'Server info' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '10px 0', fontSize:12, fontWeight: tab === t.id ? 500 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--v2-accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--v2-text)' : 'var(--v2-text-3)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: '14px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#888888', fontSize:12 }}>
              <RefreshCw size={14} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 8px', display: 'block' }}/>
              Loading…
            </div>
          ) : tab === 'jobs' ? (
            !jobs?.length ? (
              <div style={{ fontSize:12, color: '#888888', textAlign: 'center', padding: '24px 0' }}>
                No jobs yet for this agent.
              </div>
            ) : jobs.map(job => (
              <div key={job.id} style={{ display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid var(--v2-border)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                  marginTop: 2, flexShrink: 0,
                  background: (statusColor[job.status]||'#444444')+'18',
                  color: statusColor[job.status]||'#444444' }}>
                  {job.status}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize:12, color: '#111111',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.job_type} {job.domain ? `— ${job.domain}` : ''}
                  </div>
                  <div style={{ fontSize:10, color: '#888888', marginTop: 2 }}>
                    {timeAgo(job.created_at)}
                    {job.error_message && (
                      <span style={{ color: '#1f5c4e' }}> · {job.error_message.slice(0, 60)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : tab === 'events' ? (
            !events?.length ? (
              <div style={{ fontSize:12, color: '#888888', textAlign: 'center', padding: '24px 0' }}>
                No health events recorded.
              </div>
            ) : events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid var(--v2-border)', alignItems: 'flex-start' }}>
                <span style={{ fontSize:16, flexShrink: 0 }}>{eventIcon[ev.event_type] || '⚪'}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight: 500, color: '#111111',
                    textTransform: 'capitalize' }}>{ev.event_type}</div>
                  <div style={{ fontSize:10, color: '#888888', marginTop: 1 }}>
                    {timeAgo(ev.created_at)}
                    {ev.meta?.reason && <span> · {ev.meta.reason}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Server info tab
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Nickname',      val: agent.nickname },
                { label: 'Hostname',      val: agent.hostname || '—' },
                { label: 'IP address',    val: agent.ip_address || '—' },
                { label: 'OS',            val: agent.os || 'Linux' },
                { label: 'Agent version', val: `v${agent.agent_version || '?'}` },
                { label: 'Web server',    val: agent.web_server || '—' },
                { label: 'Installed',     val: agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—' },
                { label: 'Agent ID',      val: agent.id?.slice(0, 16) + '…' },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--v2-border)' }}>
                  <span style={{ fontSize:12, color: '#888888' }}>{label}</span>
                  <span style={{ fontSize:12, color: '#111111', fontWeight: 500,
                    fontFamily: label === 'Agent ID' ? 'monospace' : 'inherit' }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────
function DeleteModal({ agent, tok, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  const confirm = async () => {
    setBusy(true)
    try {
      await callDaemon(tok, { action: 'deregister', user_id: agent.user_id, agent_id: agent.id })
      onDone()
    } catch (e) {
      setErr('Failed to delete. Try again.')
      setBusy(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(240,237,232,0.32)', zIndex: 60 }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 70, background:'rgba(0,0,0,0.02)', border: '1px solid var(--v2-border)',
        borderRadius: 12, padding: '24px', width: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(31,92,78,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={16} color="#1f5c4e"/>
          </div>
          <div style={{ fontSize:15, fontWeight: 500, color: '#111111' }}>Delete agent</div>
        </div>
        <p style={{ fontSize:13, color: '#333333', marginBottom: 8 }}>
          Remove <strong>{agent.nickname}</strong> from SSLVault? The server card will go offline.
          Run <code style={{ fontSize:11, background: 'var(--v2-surface-3)', padding: '1px 5px', borderRadius: 3 }}>sslvault-agent uninstall</code> on the server to remove the daemon.
        </p>
        {err && <div style={{ fontSize:12, color: '#1f5c4e', marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="v2-btn v2-btn-sm" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-sm" onClick={confirm} disabled={busy}
            style={{ background: '#1f5c4e', borderColor: '#1f5c4e', color: '#111111' }}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function AgentHealth({ user }) {
  const isMobile = useIsMobile()
  const [tok,         setTok]         = useState('')
  const [agents,      setAgents]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [paused,      setPaused]      = useState(false)
  const [countdown,   setCountdown]   = useState(30)
  const [search,      setSearch]      = useState('')
  const [filterStatus,setFilterStatus]= useState('all')
  const [drawer,      setDrawer]      = useState(null)   // agent to show in drawer
  const [delTarget,   setDelTarget]   = useState(null)   // agent to delete
  const timerRef  = useRef(null)
  const cntRef    = useRef(null)

  const load = useCallback(async (t) => {
    const token = t || tok
    if (!token) return
    const d = await callDaemon(token, { action: 'list_agents', user_id: user?.id })
    if (d.ok || d.agents) setAgents(d.agents || [])
    setLastRefresh(new Date())
    setLoading(false)
    setCountdown(30)
  }, [tok, user?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setTok(session.access_token); load(session.access_token) }
      else setLoading(false)
    })
  }, [])

  // Auto-refresh + countdown
  useEffect(() => {
    if (!tok || paused) { clearInterval(timerRef.current); clearInterval(cntRef.current); return }
    timerRef.current = setInterval(() => load(), REFRESH)
    cntRef.current   = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000)
    return () => { clearInterval(timerRef.current); clearInterval(cntRef.current) }
  }, [tok, paused, load])

  const handleDeleteDone = () => {
    setDelTarget(null)
    if (drawer?.id === delTarget?.id) setDrawer(null)
    load()
  }

  // Filtered agents
  const filtered = agents.filter(a => {
    const matchSearch = !search ||
      (a.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.hostname  || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.ip_address|| '').toLowerCase().includes(search.toLowerCase()) ||
      (a.os        || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || (a.computed_status || 'unknown') === filterStatus
    return matchSearch && matchStatus
  })

  const online    = agents.filter(a => a.computed_status === 'online')
  const offline   = agents.filter(a => a.computed_status === 'offline')
  const highLoad  = agents.filter(a => (a.cpu_pct >= 90 || a.mem_pct >= 90 || a.disk_pct >= 90))
  const jobsToday = agents.reduce((acc, a) => acc + (a.jobs_today || 0), 0)

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 1100 }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 20, paddingTop: 8, gap: 12 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>Agent management</h1>
            <p style={{ fontSize:13, color: '#888888', marginTop: 4 }}>
              Live ops view · all SSLVault agents across your servers
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize:11, color: '#888888' }}>
              {paused ? 'Paused' : `Refresh in ${countdown}s`}
              {lastRefresh && !paused && ` · Last: ${timeAgo(lastRefresh.toISOString())}`}
            </span>
            <button className="v2-btn v2-btn-sm" onClick={() => setPaused(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {paused ? <Play size={11}/> : <Pause size={11}/>}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="v2-btn v2-btn-sm" onClick={() => load()} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={11} style={loading ? { animation: 'spin .8s linear infinite' } : {}}/>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { val: agents.length, label: 'Total agents', color: '#111111', filter: 'all' },
            { val: online.length,  label: 'Online',       color: '#16a068', filter: 'online' },
            { val: offline.length, label: 'Offline',      color: '#1f5c4e', filter: 'offline' },
            { val: highLoad.length,label: 'High load',    color: '#111111', filter: 'all' },
          ].map(({ val, label, color, filter }) => (
            <div key={label} className="v2-card"
              onClick={() => setFilterStatus(filter)}
              style={{ padding: '12px 14px', cursor: 'pointer',
                borderColor: filterStatus === filter && filter !== 'all' ? color + '66' : 'var(--v2-border)' }}>
              <div style={{ fontSize:24, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color: '#888888', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Offline alert banner ── */}
        {offline.length > 0 && (
          <div style={{ background: 'rgba(31,92,78,0.09)', border: '0.5px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <WifiOff size={14} color="#1f5c4e" style={{ flexShrink: 0 }}/>
            <div style={{ fontSize:12, color: '#2e7a68', flex: 1 }}>
              <strong>{offline.length} agent{offline.length > 1 ? 's' : ''} offline:</strong>{' '}
              {offline.map(a => a.nickname).join(', ')} — last heartbeat missed by more than 12 minutes.
            </div>
          </div>
        )}

        {/* ── Search + filter bar ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#888888', pointerEvents: 'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, hostname, IP, OS…"
              style={{ width: '100%', paddingLeft: 32, fontSize:13, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ display: 'flex', gap: 1, border: '1px solid var(--v2-border)', borderRadius: 8, overflow: 'hidden' }}>
            {['all', 'online', 'offline', 'unknown'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: '7px 12px', fontSize:11, fontWeight: filterStatus === s ? 500 : 400,
                  background: filterStatus === s ? 'var(--v2-surface-3)' : 'none',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  color: filterStatus === s ? 'var(--v2-text)' : 'var(--v2-text-3)' }}>
                {s}
              </button>
            ))}
          </div>
          {(search || filterStatus !== 'all') && (
            <button className="v2-btn v2-btn-sm" onClick={() => { setSearch(''); setFilterStatus('all') }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={11}/> Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: '#888888' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite',
              margin: '0 auto 12px', display: 'block' }}/>
            Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <Server size={32} style={{ color: '#888888', margin: '0 auto 12px', display: 'block' }}/>
            <div style={{ fontSize:14, fontWeight: 500, color: '#333333', marginBottom: 6 }}>
              No agents installed
            </div>
            <div style={{ fontSize:12, color: '#888888' }}>
              Install the SSLVault agent on your VPS from the Servers page.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888', fontSize:13 }}>
            No agents match your filter.
          </div>
        ) : (
          <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table head */}
            <div style={{ display: 'grid',
              gridTemplateColumns: '1.8fr 100px 90px 90px 90px 90px 70px 60px 80px',
              gap: 0, padding: '8px 16px',
              background: 'var(--v2-surface-3)',
              borderBottom: '1px solid var(--v2-border)' }}>
              {['Server', 'Status', 'CPU', 'RAM', 'Disk', 'Last job', 'Result', 'Certs', 'Next renew'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight: 600, color: '#888888',
                  letterSpacing: '0.3px', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((agent, i) => {
              const status    = agent.computed_status || 'unknown'
              const hasDeg    = agent.cpu_pct >= 90 || agent.mem_pct >= 90 || agent.disk_pct >= 90
              const renewDays = agent.next_renewal_at ? daysUntil(agent.next_renewal_at) : null
              const isLast    = i === filtered.length - 1

              return (
                <div key={agent.id}
                  onClick={() => setDrawer(agent)}
                  style={{ display: 'grid',
                    gridTemplateColumns: '1.8fr 100px 90px 90px 90px 90px 70px 60px 80px',
                    gap: 0, padding: '12px 16px', cursor: 'pointer', alignItems: 'center',
                    borderBottom: isLast ? 'none' : '1px solid var(--v2-border)',
                    background: drawer?.id === agent.id ? 'var(--v2-surface-3)' : 'transparent',
                    transition: 'background 0.15s' }}>

                  {/* Server name + meta */}
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: status === 'online' ? 'transparent' : status === 'offline' ? 'rgba(31,92,78,0.09)' : '#000000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <Server size={14} color={status === 'online' ? '#16a068' : status === 'offline' ? '#1f5c4e' : '#aaaaaa'}/>
                      {status === 'online' && (
                        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
                          borderRadius: '50%', background: '#16a068', border: '1.5px solid var(--v2-bg)',
                          animation: 'v3pulse 2s ease infinite' }}/>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize:13, fontWeight: 500, color: '#111111',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 6 }}>
                        {agent.nickname}
                        {hasDeg && status === 'online' && (
                          <AlertTriangle size={11} color="#1f5c4e"/>
                        )}
                      </div>
                      <div style={{ fontSize:11, color: '#888888',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.hostname || agent.ip_address || '—'} · {agent.os || 'Linux'} · v{agent.agent_version || '?'}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div><StatusPill status={status}/></div>

                  {/* CPU */}
                  <div><MiniBar value={agent.cpu_pct}/></div>

                  {/* RAM */}
                  <div><MiniBar value={agent.mem_pct}/></div>

                  {/* Disk */}
                  <div><MiniBar value={agent.disk_pct} warn={85} danger={95}/></div>

                  {/* Last job */}
                  <div style={{ fontSize:11, color: '#888888' }}>
                    {agent.last_job_at ? timeAgo(agent.last_job_at) : '—'}
                  </div>

                  {/* Job result */}
                  <div><JobBadge status={agent.last_job_status}/></div>

                  {/* Certs */}
                  <div style={{ fontSize:12, color: '#333333', fontWeight: 500 }}>
                    {agent.certs_managed ?? '—'}
                  </div>

                  {/* Next renewal */}
                  <div><RenewalBadge days={renewDays}/></div>
                </div>
              )
            })}

            {/* Footer summary */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--v2-border)',
              background: 'var(--v2-surface-3)', display: 'flex', gap: 20 }}>
              <span style={{ fontSize:11, color: '#888888' }}>
                {filtered.length} of {agents.length} agent{agents.length !== 1 ? 's' : ''} shown
              </span>
              <span style={{ fontSize:11, color: '#888888' }}>
                Uptime avg: {agents.filter(a => a.uptime_seconds).length
                  ? fmtUptime(Math.round(agents.reduce((s,a) => s + (a.uptime_seconds||0), 0) / agents.filter(a=>a.uptime_seconds).length))
                  : '—'}
              </span>
              <span style={{ fontSize:11, color: '#888888' }}>
                Click any row to open job history &amp; actions
              </span>
            </div>
          </div>
        )}

      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <Drawer
          agent={{ ...drawer, user_id: user?.id }}
          tok={tok}
          onClose={() => setDrawer(null)}
          onDelete={(a) => { setDelTarget(a); setDrawer(null) }}
        />
      )}

      {/* ── Delete modal ── */}
      {delTarget && (
        <DeleteModal
          agent={{ ...delTarget, user_id: user?.id }}
          tok={tok}
          onClose={() => setDelTarget(null)}
          onDone={handleDeleteDone}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes v3pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5) } 50% { box-shadow: 0 0 0 4px rgba(22,163,74,0) } }
      `}</style>
    </div>
  )
}
