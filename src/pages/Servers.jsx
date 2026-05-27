import { useState, useEffect, useCallback } from 'react'
import { Server, Plus, RefreshCw, Wifi, WifiOff, Clock, Terminal,
  CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import '../styles/design-v2.css'

function agentStatus(last_seen_at, status) {
  if (!last_seen_at) return { label: 'Never seen', color: 'var(--v2-text-3)', dot: '#d4d4d4', bg: '#ffffff' }
  const mins = differenceInMinutes(new Date(), new Date(last_seen_at))
  if (status === 'offline' || mins > 15) return { label: 'Offline', color: '#f87171', dot: '#f87171', bg: '#fef2f2' }
  if (mins > 6) return { label: 'Idle', color: '#C45A4A', dot: '#ffffff', bg: 'rgba(239,68,68,0.08)' }
  return { label: 'Online', color: '#ffffff', dot: '#ffffff', bg: '#111111' }
}

function fmtRelative(iso) {
  if (!iso) return '—'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '—' }
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function JobRow({ job }) {
  const icon = job.status === 'completed'
    ? <CheckCircle size={12} color="#0d9488"/>
    : job.status === 'failed'
    ? <XCircle size={12} color="#dc2626"/>
    : <Clock size={12} color="#f07059"/>
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'0.5px solid var(--v2-border)', fontSize:11 }}>
      {icon}
      <span style={{ color:'var(--v2-text)', fontFamily:'var(--font-mono, monospace)', fontSize:11 }}>{job.domain || '—'}</span>
      <span style={{ color:'var(--v2-text-3)', fontSize:10, marginLeft:'auto' }}>{fmtRelative(job.completed_at || job.created_at)}</span>
    </div>
  )
}

function AgentCard({ agent, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [copied, setCopied] = useState(false)
  const s = agentStatus(agent.last_seen_at, agent.status)

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    const { data } = await supabase.from('agent_jobs')
      .select('id,job_type,status,domain,completed_at,created_at,error_message')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setJobs(data || [])
    setLoadingJobs(false)
  }, [agent.id])

  useEffect(() => { if (expanded) loadJobs() }, [expanded, loadJobs])

  const copyToken = () => {
    navigator.clipboard.writeText(agent.agent_token || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', overflow:'hidden' }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 120px 140px 140px 36px', alignItems:'center', padding:'14px 18px', cursor:'pointer', gap:12 }}
        onMouseEnter={e => e.currentTarget.style.background='#000000'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}
      >
        {/* Server name + meta */}
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {agent.nickname || agent.hostname || 'Unnamed server'}
            </span>
            {agent.is_sandbox && <span style={{ fontSize:9, color:'#C45A4A', background:'rgba(239,68,68,0.08)', border:'0.5px solid #F2C4BC', borderRadius:3, padding:'1px 5px', fontWeight:500, flexShrink:0 }}>SANDBOX</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--v2-text-3)', fontFamily:'var(--font-mono, monospace)' }}>
            {agent.ip_address || agent.hostname || '—'}
            {agent.os && <span style={{ marginLeft:8, color:'#d4d4d4' }}>·</span>}
            {agent.os && <span style={{ marginLeft:8 }}>{agent.os}</span>}
            {agent.web_server && <span style={{ marginLeft:8, color:'#d4d4d4' }}>·</span>}
            {agent.web_server && <span style={{ marginLeft:8 }}>{agent.web_server}</span>}
          </div>
        </div>

        {/* Status */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:s.dot, flexShrink:0,
            boxShadow: s.label==='Online' ? `0 0 0 3px ${s.dot}30` : 'none' }}/>
          <span style={{ fontSize:12, fontWeight:500, color:s.color }}>{s.label}</span>
        </div>

        {/* Last seen */}
        <div style={{ fontSize:11, color:'#737373' }}>
          {agent.last_seen_at ? fmtRelative(agent.last_seen_at) : '—'}
        </div>

        {/* Version */}
        <div style={{ fontSize:11, color:'#737373', fontFamily:'var(--font-mono, monospace)' }}>
          {agent.agent_version ? `v${agent.agent_version}` : '—'}
        </div>

        {/* Chevron */}
        <div style={{ color:'var(--v2-text-3)', display:'flex', justifyContent:'flex-end' }}>
          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop:'0.5px solid var(--v2-border)', background:'var(--v2-bg)', padding:'16px 18px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:24 }}>
          {/* Server info */}
          <div>
            <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Server Info</div>
            {[
              ['Hostname', agent.hostname],
              ['IP Address', agent.ip_address],
              ['OS', agent.os],
              ['Architecture', agent.arch],
              ['Web Server', agent.web_server],
              ['Agent Version', agent.agent_version ? `v${agent.agent_version}` : null],
              ['Connected', fmtRelative(agent.created_at)],
            ].map(([k, v]) => v ? (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12, borderBottom:'0.5px solid var(--v2-border)' }}>
                <span style={{ color:'#737373' }}>{k}</span>
                <span style={{ color:'var(--v2-text)', fontFamily:'var(--font-mono, monospace)', fontSize:11 }}>{v}</span>
              </div>
            ) : null)}

            {/* Agent token */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Agent Token</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'8px 10px' }}>
                <code style={{ fontSize:10, color:'rgba(255,255,255,0.6)', fontFamily:'var(--font-mono, monospace)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {agent.agent_token ? `${agent.agent_token.substring(0,24)}…` : '—'}
                </code>
                <button onClick={copyToken} style={{ flexShrink:0, fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.6)', padding:'4px 8px', border:'0.5px solid var(--v2-border)', borderRadius:4, background:'var(--v2-surface)', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                  {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
                </button>
              </div>
            </div>
          </div>

          {/* Recent jobs */}
          <div>
            <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>
              Recent Activity
            </div>
            {loadingJobs ? (
              <div style={{ fontSize:11, color:'var(--v2-text-3)', padding:'12px 0' }}>Loading…</div>
            ) : jobs.length === 0 ? (
              <div style={{ fontSize:11, color:'var(--v2-text-3)', padding:'12px 0' }}>No jobs yet — agent is connected and waiting</div>
            ) : (
              jobs.map(j => <JobRow key={j.id} job={j}/>)
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Install instructions modal ────────────────────────────────────────
function InstallModal({ onClose }) {
  const [copied, setCopied] = useState(null)
  const cmd1 = 'curl -fsSL https://easysecurity.in/agent-install.sh | bash'
  const cmd2 = 'sudo systemctl status sslvault-agent'

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const CmdBlock = ({ cmd, id }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--v2-text)', borderRadius:6, padding:'10px 14px', marginBottom:8 }}>
      <code style={{ fontSize:12, color:'#ffffff', fontFamily:'var(--font-mono, monospace)', flex:1, overflow:'auto' }}>{cmd}</code>
      <button onClick={() => copy(cmd, id)} style={{ flexShrink:0, marginLeft:12, fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.6)', padding:'4px 8px', border:'0.5px solid rgba(255,255,255,0.14)', borderRadius:4, background:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
        {copied===id ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
      </button>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--v2-surface)', borderRadius:10, width:'100%', maxWidth:540, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'0.5px solid var(--v2-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--v2-text)' }}>Install SSLVault Agent</div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>Run on your VPS or cPanel server (Linux)</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, border:'0.5px solid var(--v2-border)', borderRadius:6, background:'var(--v2-surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:16 }}>×</button>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ fontSize:11, fontWeight:500, color:'rgba(255,255,255,0.6)', marginBottom:8 }}>1. Install the agent</div>
          <CmdBlock cmd={cmd1} id="install"/>
          <div style={{ fontSize:11, fontWeight:500, color:'rgba(255,255,255,0.6)', margin:'14px 0 8px' }}>2. Verify it's running</div>
          <CmdBlock cmd={cmd2} id="verify"/>
          <div style={{ background:'transparent', border:'0.5px solid #A8E6DE', borderRadius:6, padding:'10px 12px', marginTop:14 }}>
            <div style={{ fontSize:11, color:'#ffffff', lineHeight:1.6 }}>
              The agent polls SSLVault every 5 minutes, auto-renews certificates, and reports its status here. It will appear in this list within 1–2 minutes of installation.
            </div>
          </div>
        </div>
        <div style={{ padding:'12px 22px', borderTop:'0.5px solid var(--v2-border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ fontSize:12, fontWeight:500, padding:'8px 16px', borderRadius:6, border:'0.5px solid var(--v2-border)', background:'var(--v2-surface)', cursor:'pointer', fontFamily:'inherit', color:'var(--v2-text)' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ServersPage({ user }) {
  const isMobile = useIsMobile()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInstall, setShowInstall] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('persistent_agents')
      .select('*').eq('user_id', user.id)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
    setAgents(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const online = agents.filter(a => {
    if (!a.last_seen_at) return false
    return differenceInMinutes(new Date(), new Date(a.last_seen_at)) <= 6
  }).length

  return (
    <div style={{ padding:'24px 28px 60px' }}>
      {showInstall && <InstallModal onClose={() => setShowInstall(false)}/>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16 }}>
        <div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:2 }}>
            {loading ? '—' : `${agents.length} server${agents.length !== 1 ? 's' : ''} connected`}
            {!loading && online > 0 && <span style={{ marginLeft:8, fontSize:11, color:'#ffffff', fontWeight:500 }}>· {online} online</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>Persistent agents auto-renew certificates every 5 minutes</div>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={refresh} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--v2-surface)', color:'rgba(255,255,255,0.6)', border:'0.5px solid var(--v2-border)', padding:'7px 12px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/> Refresh
          </button>
          <button onClick={() => setShowInstall(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#ffffff', color:'var(--v2-surface)', border:'none', padding:'7px 14px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={12}/> Add server
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {!loading && agents.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { label:'Total servers', val:agents.length, color:'var(--v2-text)' },
            { label:'Online now', val:online, color: online > 0 ? '#ffffff' : 'var(--v2-text)' },
            { label:'Offline / idle', val:agents.length - online, color: agents.length - online > 0 ? '#C45A4A' : 'var(--v2-text)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', padding:'14px 18px' }}>
              <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:500, color, letterSpacing:'-.6px' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table header */}
      {!loading && agents.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 120px 140px 140px 36px', padding:'8px 18px', fontSize:10, fontWeight:500, color:'var(--v2-text-3)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:6 }}>
          <div>Server</div>
          <div>Status</div>
          <div>Last seen</div>
          <div>Version</div>
          <div/>
        </div>
      )}

      {/* Agent list */}
      {loading ? (
        <div style={{ padding:'clamp(16px,20vw,60px) 20px', textAlign:'center', color:'var(--v2-text-3)', fontSize:12 }}>Loading…</div>
      ) : agents.length === 0 ? (
        <div style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', padding:'clamp(16px,20vw,60px) 20px', textAlign:'center' }}>
          <Server size={36} color="#d4d4d4" strokeWidth={1.5} style={{ marginBottom:12 }}/>
          <div style={{ fontSize:14, fontWeight:500, color:'var(--v2-text)', marginBottom:6 }}>No servers connected</div>
          <div style={{ fontSize:12, color:'var(--v2-text-3)', marginBottom:20, maxWidth:340, margin:'0 auto 20px' }}>
            Install the SSLVault agent on any Linux VPS or cPanel server. It will auto-renew your certificates and report status here.
          </div>
          <button onClick={() => setShowInstall(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#ffffff', color:'var(--v2-surface)', border:'none', borderRadius:6, padding:'9px 18px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <Terminal size={13}/> Install agent
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {agents.map(agent => <AgentCard key={agent.id} agent={agent} onRefresh={load}/>)}
        </div>
      )}

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
