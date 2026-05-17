// AgentHealth.jsx — Live monitoring of all VPS agents
// Shows: online/offline status, CPU/mem/disk, last seen, job history, health event log
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, Server, RefreshCw, CheckCircle, XCircle,
  Clock, Cpu, HardDrive, Zap, ChevronDown, ChevronUp,
  AlertTriangle, Shield, MemoryStick
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

async function callDaemon(tok, body) {
  const r = await fetch(`${SB_URL}/functions/v1/agent-daemon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`
  return `${Math.floor(secs/86400)}d ago`
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

function MetricBar({ label, value, warn = 80, danger = 90, unit = '%' }) {
  if (value == null) return null
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= danger ? '#dc2626' : pct >= warn ? '#d97706' : '#16a34a'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color, fontFamily: 'monospace' }}>
          {Math.round(pct)}{unit}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--v2-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color,
          transition: 'width .6s cubic-bezier(.16,1,.3,1)' }}/>
      </div>
    </div>
  )
}

function AgentCard({ agent, tok }) {
  const [expanded,  setExpanded]  = useState(false)
  const [jobs,      setJobs]      = useState(null)
  const [events,    setEvents]    = useState(null)
  const [loadingEx, setLoadingEx] = useState(false)

  const status = agent.computed_status || (agent.last_seen_at ? 'unknown' : 'never')
  const statusMap = {
    online:  { color: '#16a34a', bg: '#f0fdf4', label: 'Online',  dot: true  },
    offline: { color: '#dc2626', bg: '#fef2f2', label: 'Offline', dot: false },
    never:   { color: 'var(--v2-text-3)', bg: '#f8fafc', label: 'Never seen', dot: false },
    unknown: { color: '#d97706', bg: '#fffbeb', label: 'Unknown', dot: false },
  }
  const s = statusMap[status] || statusMap.unknown

  const hasDegraded = agent.cpu_pct >= 90 || agent.mem_pct >= 90 || agent.disk_pct >= 90

  const loadExpanded = async () => {
    setLoadingEx(true)
    const [jobsRes, eventsRes] = await Promise.all([
      callDaemon(tok, { action: 'list_jobs',            user_id: agent.user_id, agent_id: agent.id }),
      callDaemon(tok, { action: 'agent_health_events',  user_id: agent.user_id, agent_id: agent.id, limit: 10 }),
    ])
    setJobs(jobsRes.jobs || [])
    setEvents(eventsRes.events || [])
    setLoadingEx(false)
  }

  const toggle = () => {
    if (!expanded) loadExpanded()
    setExpanded(v => !v)
  }

  const eventIcon = { online: '🟢', offline: '🔴', recovered: '✅', degraded: '🟡' }
  const jobStatusColor = { success: '#16a34a', failed: '#dc2626', queued: '#d97706', claimed: '#2563eb' }

  return (
    <div className="v2-card" style={{ overflow: 'hidden', padding: 0,
      borderColor: status === 'offline' ? '#fecaca' : status === 'online' ? 'rgba(22,163,74,0.2)' : 'var(--v2-border)' }}>

      {/* Agent header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Server size={18} color={s.color}/>
          {s.dot && (
            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
              borderRadius: '50%', background: '#16a34a', border: '2px solid var(--v2-bg)',
              animation: 'v3pulse 2s ease infinite' }}/>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.nickname}
            </span>
            <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
              background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
            {hasDegraded && status === 'online' && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
                background: '#fffbeb', color: '#d97706', flexShrink: 0 }}>
                ⚠ High load
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 2, display: 'flex', gap: 10 }}>
            <span>{agent.hostname || agent.ip_address || '—'}</span>
            <span>·</span>
            <span>{agent.os || 'Linux'}</span>
            <span>·</span>
            <span>v{agent.agent_version || '1.0'}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: status === 'online' ? '#16a34a' : '#dc2626' }}>
            {timeAgo(agent.last_seen_at)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 1 }}>last seen</div>
        </div>
        <button onClick={toggle} style={{ background: 'none', border: '0.5px solid var(--v2-border)',
          borderRadius: 6, cursor: 'pointer', color: 'var(--v2-text-3)', padding: '5px 7px',
          flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      {/* Metrics strip — always visible if data exists */}
      {(agent.cpu_pct != null || agent.mem_pct != null || agent.disk_pct != null) && (
        <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-3)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'CPU',  value: agent.cpu_pct  },
            { label: 'RAM',  value: agent.mem_pct  },
            { label: 'Disk', value: agent.disk_pct, warn: 85, danger: 95 },
          ].map(({ label, value, warn = 80, danger = 90 }) => (
            value != null ? (
              <div key={label}>
                <MetricBar label={label} value={value} warn={warn} danger={danger}/>
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Quick stats row */}
      <div style={{ padding: '8px 16px', borderTop: '0.5px solid var(--v2-border)',
        display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { icon: Clock,     label: 'Uptime',       val: fmtUptime(agent.uptime_seconds) },
          { icon: Shield,    label: 'Certs managed', val: agent.certs_managed ?? '—' },
          { icon: Zap,       label: 'Last job',      val: agent.last_job_at ? timeAgo(agent.last_job_at) : '—' },
          { icon: Activity,  label: 'Job result',    val: agent.last_job_status || '—' },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon size={11} style={{ color: 'var(--v2-text-3)', flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{label}:</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--v2-text-2)',
              fontFamily: typeof val === 'number' ? 'monospace' : 'inherit' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Expanded panel — job history + health events */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--v2-border)', padding: '14px 16px' }}>
          {loadingEx ? (
            <div style={{ textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 12, padding: '8px 0' }}>
              <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite', marginRight: 5 }}/>
              Loading…
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Recent jobs */}
              <div>
                <div className="v2-section-label" style={{ marginBottom: 8 }}>Recent jobs</div>
                {!jobs?.length ? (
                  <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>No jobs yet.</div>
                ) : jobs.slice(0,5).map(job => (
                  <div key={job.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '6px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                      background: (jobStatusColor[job.status]||'#64748b')+'18',
                      color: jobStatusColor[job.status]||'#64748b', marginTop: 2 }}>
                      {job.status}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--v2-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.job_type} — {job.domain}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 1 }}>
                        {timeAgo(job.created_at)}
                        {job.error_message && ` · ${job.error_message.slice(0,40)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Health events */}
              <div>
                <div className="v2-section-label" style={{ marginBottom: 8 }}>Health events</div>
                {!events?.length ? (
                  <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>No events recorded.</div>
                ) : events.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '6px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{eventIcon[ev.event_type] || '⚪'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v2-text)',
                        textTransform: 'capitalize' }}>{ev.event_type}</div>
                      <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 1 }}>
                        {timeAgo(ev.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentHealth({ user }) {
  const [tok,     setTok]     = useState('')
  const [agents,  setAgents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const timerRef = useRef(null)

  const load = async (t) => {
    const token = t || tok
    if (!token) return
    const d = await callDaemon(token, { action: 'list_agents', user_id: user?.id })
    if (d.ok) setAgents(d.agents || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setTok(session.access_token); load(session.access_token) }
      else setLoading(false)
    })
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!tok) return
    timerRef.current = setInterval(() => load(), 30000)
    return () => clearInterval(timerRef.current)
  }, [tok])

  const online  = agents.filter(a => a.computed_status === 'online')
  const offline = agents.filter(a => a.computed_status === 'offline')
  const never   = agents.filter(a => a.computed_status === 'never')

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 880 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 24, paddingTop: 8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize: 22 }}>Agent health</h1>
            <p style={{ fontSize: 13, color: 'var(--v2-text-3)', marginTop: 4 }}>
              Live status of all SSLVault agents running on your servers.
              {lastRefresh && <span> Auto-refreshes every 30s · Last: {timeAgo(lastRefresh.toISOString())}</span>}
            </p>
          </div>
          <button className="v2-btn" onClick={() => load()} disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: 'spin .8s linear infinite' } : {}}/> Refresh
          </button>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { val: agents.length, label: 'Total agents',    color: 'var(--v2-text)' },
            { val: online.length, label: 'Online',          color: '#16a34a' },
            { val: offline.length,label: 'Offline',         color: '#dc2626' },
            { val: agents.filter(a=>a.cpu_pct>=90||a.mem_pct>=90||a.disk_pct>=90).length,
              label: 'High load', color: '#d97706' },
          ].map(({ val, label, color }) => (
            <div key={label} className="v2-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Offline alert */}
        {offline.length > 0 && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }}/>
            <div style={{ fontSize: 12, color: '#991b1b' }}>
              <strong>{offline.length} agent{offline.length > 1 ? 's' : ''} offline:</strong>{' '}
              {offline.map(a => a.nickname).join(', ')} — last heartbeat missed by more than 12 minutes.
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--v2-text-3)', padding: '48px 0' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 12px', display: 'block' }}/>
            Loading agents…
          </div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Server size={32} style={{ color: 'var(--v2-text-3)', margin: '0 auto 12px', display: 'block' }}/>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text-2)', marginBottom: 6 }}>
              No agents installed
            </div>
            <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
              Install the SSLVault agent on your VPS from the Servers page.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={{ ...agent, user_id: user?.id }} tok={tok}/>
            ))}
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes v3pulse{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.5)}50%{box-shadow:0 0 0 4px rgba(22,163,74,0)}}
      `}</style>
    </div>
  )
}
