// Infrastructure.jsx — Combined server + agent health page
// Design: cert-first cards — each server shows the certs it protects
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Server, Plus, RefreshCw, CheckCircle, XCircle, Clock,
  Copy, Check, ChevronDown, ChevronUp, Terminal, Wifi, WifiOff,
  Shield, RotateCcw, Trash2, Info, Activity
} from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import '../styles/design-v2.css'

// ── Helpers ───────────────────────────────────────────────────────────
function agentStatus(last_seen_at, status) {
  if (!last_seen_at) return { label:'Never seen', color:'#888888', dot:'rgba(240,237,232,0.12)', pulse:false }
  const mins = differenceInMinutes(new Date(), new Date(last_seen_at))
  if (status === 'offline' || mins > 15) return { label:'Offline', color:'#1f5c4e', dot:'#1f5c4e', pulse:false }
  if (mins > 6) return { label:'Idle',    color:'#111111', dot:'#111111', pulse:false }
  return { label:'Online', color:'#16a068', dot:'#16a068', pulse:true }
}

function fmtRel(iso) {
  if (!iso) return '—'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '—' }
}

function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

// ── Status dot with optional pulse ring ──────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function StatusDot({ st, size = 8 }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {st.pulse && (
        <span style={{
          position:'absolute', width:size+8, height:size+8, borderRadius:'50%',
          background: st.dot + '30', animation:'dotpulse 2s ease infinite',
        }}/>
      )}
      <span style={{ width:size, height:size, borderRadius:'50%', background:st.dot, position:'relative' }}/>
    </span>
  )
}

// ── Cert pill on server card ──────────────────────────────────────────
function CertPill({ cert }) {
  const d = daysLeft(cert.expires_at)
  const isExpired = d !== null && d <= 0
  const isWarn    = d !== null && d > 0 && d <= 30
  const color = isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068'
  const bg    = isExpired ? 'rgba(31,92,78,0.09)' : isWarn ? 'rgba(239,68,68,0.08)' : 'transparent'

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
      background:'var(--v2-surface-3)', borderRadius:7,
      border:`0.5px solid ${isExpired?'rgba(0,0,0,0.1)':isWarn?'rgba(0,0,0,0.1)':'var(--v2-border)'}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
      <span style={{ fontSize:12, fontWeight:500, color:'#111111', flex:1,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {cert.domain}
      </span>
      {d !== null && (
        <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:8, background:bg, color, flexShrink:0 }}>
          {isExpired ? 'Expired' : `${d}d`}
        </span>
      )}
      {cert.auto_renew_enabled && (
        <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:4,
          background:'transparent', color:'#111111', flexShrink:0 }}>AUTO</span>
      )}
    </div>
  )
}


// ── VPS Setup Checklist ──────────────────────────────────────────────
function SetupChecklist({ hasDns, hasAgent, hasAgentOnline, onAddDns, onAddAgent }) {
  const steps = [
    {
      num: 1,
      title: 'Connect your DNS provider',
      desc: 'So SSLVault can auto-add TXT records during certificate validation — required for every cert issuance.',
      done: hasDns,
      doneLabel: 'DNS provider connected',
      pendingLabel: 'No DNS provider yet',
      action: onAddDns,
      actionLabel: 'Connect DNS →',
    },
    {
      num: 2,
      title: 'Issue a certificate',
      desc: 'Go to your Dashboard, click "+ Issue certificate", enter your domain. DNS auto-validates and cert is issued.',
      done: true, // always available
      doneLabel: 'Available any time',
      pendingLabel: '',
      action: null,
      actionLabel: null,
      always: true,
    },
    {
      num: 3,
      title: 'Install the agent on your VPS',
      desc: 'A lightweight daemon that installs certs on nginx/apache and handles auto-renewals — runs 24/7 on your server.',
      done: hasAgent,
      doneLabel: hasAgentOnline ? 'Agent online and polling' : 'Agent installed (offline)',
      pendingLabel: 'No agent installed yet',
      action: onAddAgent,
      actionLabel: 'Install agent →',
    },
    {
      num: 4,
      title: 'Click "Install on this server"',
      desc: 'In the Dashboard cert detail panel → Actions → Install on server → select your agent. Done — auto-installs and auto-renews forever.',
      done: hasAgent,
      doneLabel: 'Agent ready to receive jobs',
      pendingLabel: 'Complete step 3 first',
      action: null,
      actionLabel: null,
    },
  ]

  const allDone = hasDns && hasAgent
  if (allDone) return null // hide when fully set up

  return (
    <div style={{
      background:'#f4f1ec', border: '1px solid #e8edf2', borderRadius: 12,
      marginBottom: 24, overflow: 'hidden',
    }}>
      {/* Banner */}
      <div style={{
        padding: '12px 20px', background: 'transparent',
        borderBottom: '1px solid #e8edf2',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background:'#f4f1ec', flexShrink: 0 }} />
        <span style={{ fontSize:12, fontWeight: 600, color: '#111111' }}>
          Complete VPS setup — {[hasDns, hasAgent].filter(Boolean).length} of 2 prerequisites done
        </span>
        <span style={{ fontSize:11, color: '#888888', marginLeft: 4 }}>
          DNS credentials + agent install are both needed for full auto-SSL
        </span>
      </div>

      {/* Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 0 }}>
        {steps.map((step, i) => {
          const isDone = step.always || step.done
          return (
            <div key={step.num} style={{
              padding: '16px 18px',
              borderRight: i < steps.length - 1 ? '1px solid #f0f0f0' : 'none',
              background: isDone ? '#111111' : '#000000',
            }}>
              {/* Step number + status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#111111' : '#000000',
                  fontSize:11, fontWeight: 700,
                  color: isDone ? '#111111' : '#888888',
                }}>
                  {isDone ? '✓' : step.num}
                </div>
                <span style={{ fontSize:11, fontWeight: 600, color: isDone ? '#111111' : '#888888' }}>
                  {isDone ? step.doneLabel : step.pendingLabel}
                </span>
              </div>

              {/* Title */}
              <div style={{ fontSize:12, fontWeight: 600, color: 'transparent', marginBottom: 6, lineHeight: 1.4 }}>
                {step.title}
              </div>

              {/* Desc */}
              <div style={{ fontSize:11, color: '#888888', lineHeight: 1.6, marginBottom: step.action ? 12 : 0 }}>
                {step.desc}
              </div>

              {/* Action */}
              {step.action && !step.done && (
                <button onClick={step.action} style={{
                  marginTop: 8,
                  fontSize:11, fontWeight: 600, color: '#111111',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, fontFamily: 'inherit',
                }}>
                  {step.actionLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Install modal ─────────────────────────────────────────────────────
function InstallModal({ onClose }) {
  const [copied, setCopied] = useState(null)
  const [installCmd, setInstallCmd] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-daemon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'create_install_command', nickname: 'My Server' })
        })
        const d = await r.json()
        if (d.ok && d.command) setInstallCmd(d.command)
        else setError(d.error || 'Failed to generate command')
      } catch (e) { setError(String(e?.message || e)) }
      setLoading(false)
    })()
  }, [])

  const verifyCmd = 'sudo systemctl status sslvault-agent'
  const copy = (cmd, id) => {
    navigator.clipboard.writeText(cmd)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'#666666', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--v2-surface)', borderRadius:12, width:'100%', maxWidth:520,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'#111111' }}>Install SSLVault agent</div>
            <div style={{ fontSize:11, color:'#888888', marginTop:2 }}>Run on your VPS or cPanel server (Linux)</div>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--v2-border)',
            background:'var(--v2-surface)', cursor:'pointer', fontSize:16, color:'#333333',
            display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'18px 20px' }}>
          {[
            { id:'install', label:'1. Install the agent', cmd: loading ? 'Generating secure install command…' : (error || installCmd) },
            { id:'verify',  label:"2. Verify it's running", cmd: verifyCmd },
          ].map(({ id, label, cmd }) => (
            <div key={id} style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#333333', marginBottom:6 }}>{label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f4f1ec',
                borderRadius:7, padding:'10px 14px' }}>
                <code style={{ fontSize:12, color: id==='install' && error ? '#1f5c4e' : '#111111', fontFamily:'monospace', flex:1,
                  overflow:'auto', whiteSpace:'nowrap' }}>{cmd}</code>
                {!loading && !error && (
                  <button onClick={() => copy(cmd, id)} style={{ flexShrink:0, fontSize:10, fontWeight:500,
                    color:'#555555', padding:'4px 8px', border:'0.5px solid rgba(240,237,232,0.14)',
                    borderRadius:4, background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4,
                    fontFamily:'inherit' }}>
                    {copied===id ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
                  </button>
                )}
              </div>

            </div>
          ))}
          <div style={{ background:'transparent', border:'1px solid rgba(31,92,78,0.2)', borderRadius:7, padding:'10px 12px' }}>
            <div style={{ fontSize:11, color:'#111111', lineHeight:1.6 }}>
              The agent polls SSLVault every 5 minutes, auto-renews certificates, and appears in this list within 1–2 minutes.
            </div>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--v2-border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} className="v2-btn v2-btn-sm">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Server card ───────────────────────────────────────────────────────
function ServerCard({ agent, certs, onRefresh, onRemove }) {
  const [open, setOpen]     = useState(false)
  const [jobs, setJobs]     = useState([])
  const [removing, setRemoving] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab]       = useState('certs') // certs | jobs | info

  const st = agentStatus(agent.last_seen_at, agent.status)

  // Certs linked to this agent (by install_server_id or agent_url match)
  // Match certs to this agent by server ID, agent_url, or install_method='agent'
  // (install_server_id is often null when agent installs but doesn't link back)
  const myCerts = certs.filter(c =>
    c.install_server_id === agent.id ||
    (agent.ip_address && c.agent_url?.includes(agent.ip_address)) ||
    (agent.hostname && c.agent_url?.includes(agent.hostname)) ||
    c.install_method === 'agent'
  )

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    const { data } = await supabase.from('agent_jobs')
      .select('id,job_type,status,domain,completed_at,created_at,error_message')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending:false })
      .limit(10)
    setJobs(data || [])
    setLoadingJobs(false)
  }, [agent.id])

  useEffect(() => {
    if (open && tab === 'jobs' && jobs.length === 0) loadJobs()
  }, [open, tab, jobs.length, loadJobs])

  const copyToken = () => {
    navigator.clipboard.writeText(agent.agent_token || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const borderColor = st.label === 'Online' ? 'rgba(31,92,78,0.2)'
    : st.label === 'Offline' ? 'rgba(0,0,0,0.1)'
    : 'var(--v2-border)'
  const headerBg = st.label === 'Online' ? 'transparent'
    : st.label === 'Offline' ? 'rgba(31,92,78,0.09)'
    : 'var(--v2-surface-3)'

  const cpu  = agent.cpu_pct  || 0
  const ram  = agent.mem_pct  || 0
  const disk = agent.disk_pct || 0

  const barColor = (v) => v >= 90 ? '#1f5c4e' : v >= 75 ? '#111111' : '#16a068'

  return (
    <div style={{ border:`0.5px solid ${borderColor}`, borderRadius:10, overflow:'hidden',
      marginBottom:10, transition:'border-color .15s' }}>

      {/* ── Card header ── */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
          background:headerBg, cursor:'pointer' }}>

        {/* Status dot */}
        <StatusDot st={st} size={9}/>

        {/* Name + meta */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#111111',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {agent.nickname || agent.hostname || 'Unnamed server'}
          </div>
          <div style={{ fontSize:11, color:'#888888', marginTop:1, fontFamily:'monospace' }}>
            {[agent.ip_address, agent.os, agent.web_server].filter(Boolean).join(' · ')}
            {agent.agent_version && ` · Agent v${agent.agent_version}`}
          </div>
        </div>

        {/* Health bars — compact, only when online */}
        {st.label === 'Online' && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, width:180, flexShrink:0 }}>
            {[['CPU',cpu],['RAM',ram],['Disk',disk]].map(([lbl,val]) => (
              <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:9, color:'#888888', width:22 }}>{lbl}</span>
                <div style={{ flex:1, height:3, background:'var(--v2-border)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${val}%`, background:barColor(val),
                    borderRadius:2, transition:'width .5s' }}/>
                </div>
                <span style={{ fontSize:9, fontWeight:500, color:barColor(val), width:26, textAlign:'right' }}>
                  {Math.round(val)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cert count badge */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          {st.label === 'Offline' ? (
            <span style={{ fontSize:11, color:'#1f5c4e', fontWeight:500 }}>
              {myCerts.length > 0 ? `${myCerts.length} cert${myCerts.length>1?'s':''} at risk` : 'Offline'}
            </span>
          ) : (
            <span style={{ fontSize:11, color:'#888888' }}>
              {myCerts.length} cert{myCerts.length!==1?'s':''} · seen {fmtRel(agent.last_seen_at)}
            </span>
          )}
        </div>

        {/* Status pill */}
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:10, flexShrink:0,
          background: st.label==='Online'?'transparent':st.label==='Offline'?'rgba(31,92,78,0.09)':'rgba(239,68,68,0.08)',
          color: st.color }}>
          {st.label}
        </span>

        {open ? <ChevronUp size={14} color="var(--v2-text-3)"/> : <ChevronDown size={14} color="var(--v2-text-3)"/>}
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ borderTop:`0.5px solid ${borderColor}`, background:'var(--v2-surface)',
          animation:'slideDown .18s ease' }}>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:1, padding:'10px 16px 0',
            borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
            {[
              { id:'certs', label:'Certificates', icon:Shield },
              { id:'jobs',  label:'Recent jobs',  icon:Activity },
              { id:'info',  label:'Server info',  icon:Info },
            ].map(({ id, label, icon:Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px',
                  fontSize:11, fontWeight:tab===id?500:400, cursor:'pointer', fontFamily:'inherit',
                  background:'none', border:'none', borderBottom:tab===id?'2px solid #2a6b5c':'2px solid transparent',
                  color:tab===id?'#111111':'var(--v2-text-3)', transition:'all .15s',
                  marginBottom:'-0.5px' }}>
                <Icon size={12}/>{label}
              </button>
            ))}
          </div>

          <div style={{ padding:'14px 16px' }}>

            {/* CERTS TAB */}
            {tab === 'certs' && (
              <div>
                {myCerts.length === 0 ? (
                  <div style={{ fontSize:12, color:'#888888', padding:'8px 0', lineHeight:1.6 }}>
                    No certificates are linked to this server yet.
                    Certificates installed via this agent will appear here automatically.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {myCerts.map(c => <CertPill key={c.id} cert={c}/>)}
                  </div>
                )}
              </div>
            )}

            {/* JOBS TAB */}
            {tab === 'jobs' && (
              <div>
                {loadingJobs ? (
                  <div style={{ fontSize:12, color:'#888888', padding:'8px 0' }}>
                    <RefreshCw size={12} style={{ animation:'spin .8s linear infinite', verticalAlign:'-2px', marginRight:6 }}/>
                    Loading jobs…
                  </div>
                ) : jobs.length === 0 ? (
                  <div style={{ fontSize:12, color:'#888888', padding:'8px 0' }}>
                    No jobs yet — agent is connected and waiting.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {jobs.map(j => {
                      const ok = j.status === 'completed' || j.status === 'success'
                      const fail = j.status === 'failed' || j.status === 'error'
                      return (
                        <div key={j.id} style={{ display:'flex', alignItems:'center', gap:10,
                          padding:'7px 10px', borderRadius:7, background:'var(--v2-surface-3)' }}>
                          {ok   ? <CheckCircle size={12} color="#16a34a"/>
                          :fail ? <XCircle size={12} color="#1f5c4e"/>
                          :       <Clock size={12} color="#1f5c4e"/>}
                          <span style={{ fontSize:11, color:'#333333', fontFamily:'monospace', flex:1 }}>
                            {j.job_type}{j.domain ? ` · ${j.domain}` : ''}
                          </span>
                          {j.error_message && (
                            <span style={{ fontSize:10, color:'#1f5c4e', maxWidth:200,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {j.error_message}
                            </span>
                          )}
                          <span style={{ fontSize:10, color:'#888888', flexShrink:0 }}>
                            {fmtRel(j.completed_at || j.created_at)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* INFO TAB */}
            {tab === 'info' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
                <div>
                  {[
                    ['Hostname',      agent.hostname],
                    ['IP address',    agent.ip_address],
                    ['OS',            agent.os],
                    ['Architecture',  agent.arch],
                    ['Web server',    agent.web_server],
                    ['Agent version', agent.agent_version ? `v${agent.agent_version}` : null],
                    ['Uptime',        agent.uptime_seconds ? `${Math.floor(agent.uptime_seconds/3600)}h` : null],
                    ['Connected',     fmtRel(agent.created_at)],
                  ].filter(([,v]) => v).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between',
                      padding:'5px 0', fontSize:12, borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ color:'#888888' }}>{k}</span>
                      <span style={{ color:'#111111', fontFamily:'"JetBrains Mono",monospace', fontSize:11 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {/* Agent token */}
                <div>
                  <div style={{ fontSize:10, fontWeight:600, color:'#888888',
                    textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:8 }}>
                    Agent token
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8,
                    background:'var(--v2-surface-3)', border:'1px solid var(--v2-border)',
                    borderRadius:7, padding:'8px 10px', marginBottom:12 }}>
                    <code style={{ fontSize:10, color:'#333333', fontFamily:'monospace',
                      flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {agent.agent_token ? `${agent.agent_token.substring(0,24)}…` : '—'}
                    </code>
                    <button onClick={copyToken}
                      style={{ fontSize:10, fontWeight:500, color:'#333333', padding:'3px 8px',
                        border:'1px solid var(--v2-border)', borderRadius:4,
                        background:'var(--v2-surface)', cursor:'pointer', display:'flex', alignItems:'center', gap:4,
                        fontFamily:'inherit', flexShrink:0 }}>
                      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
                    </button>
                  </div>
                  <div style={{ fontSize:10, fontWeight:600, color:'#888888',
                    textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:8 }}>
                    Restart command
                  </div>
                  <div style={{ background:'#f4f1ec', borderRadius:7, padding:'8px 12px' }}>
                    <code style={{ fontSize:10, color:'#111111', fontFamily:'"JetBrains Mono",monospace' }}>
                      sudo systemctl restart sslvault-agent
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--v2-border)',
            display:'flex', gap:8, background:'var(--v2-surface-3)' }}>
            <button className="v2-btn v2-btn-sm"
              style={{ display:'flex', alignItems:'center', gap:5 }}
              onClick={() => { setTab('jobs'); loadJobs() }}>
              <RotateCcw size={11}/> Refresh jobs
            </button>
            <button className="v2-btn v2-btn-sm" onClick={onRefresh}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={11}/> Refresh agent
            </button>
            <div style={{ flex:1 }}/>
            <button className="v2-btn v2-btn-sm"
              style={{ display:'flex', alignItems:'center', gap:5,
                borderColor:'rgba(0,0,0,0.1)', color:'#1f5c4e' }}
              disabled={removing}
              onClick={async () => {
                if (!window.confirm(`Remove "${agent.nickname || agent.hostname}" from SSLVault? This stops auto-renewal for this server.`)) return
                setRemoving(true)
                await supabase.from('agent_jobs').delete().eq('agent_id', agent.id)
                await supabase.from('persistent_agents').delete().eq('id', agent.id)
                onRemove?.(agent.id)
              }}>
              <Trash2 size={11}/> {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ MAIN ══════════════════════════════════════════════════════════════
export default function Infrastructure({ user }) {
  const isMobile = useIsMobile()
  const [agents,  setAgents]  = useState([])
  const [certs,   setCerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showInstall, setShowInstall] = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const [dnsCredentials, setDnsCredentials] = useState([])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: agentData }, { data: certData }, { data: dnsData }] = await Promise.all([
      supabase.from('persistent_agents')
        .select('*').eq('user_id', user.id)
        .order('last_seen_at', { ascending:false, nullsFirst:false }),
      supabase.from('certificates')
        .select('id,domain,expires_at,auto_renew_enabled,install_server_id,agent_url,status')
        .eq('user_id', user.id).neq('status','revoked'),
      supabase.from('dns_credentials')
        .select('id,provider,label').eq('user_id', user.id).limit(5),
    ])
    setAgents(agentData || [])
    setCerts(certData  || [])
    setDnsCredentials(dnsData || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const online  = agents.filter(a => a.last_seen_at &&
    differenceInMinutes(new Date(), new Date(a.last_seen_at)) <= 6).length
  const offline = agents.length - online
  const renewalsDue = certs.filter(c => {
    const d = daysLeft(c.expires_at); return d !== null && d >= 0 && d <= 30
  }).length
  const jobsToday = 0 // could query if needed

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:920 }}>

        {showInstall && <InstallModal onClose={() => setShowInstall(false)}/>}

        {/* VPS Setup Checklist — shown until DNS + agent are both set up */}
        {!loading && (
          <SetupChecklist
            hasDns={dnsCredentials.length > 0}
            hasAgent={agents.length > 0}
            hasAgentOnline={agents.some(a => a.last_seen_at && differenceInMinutes(new Date(), new Date(a.last_seen_at)) <= 6)}
            onAddDns={() => window.location.href = '/dns-providers'}
            onAddAgent={() => setShowInstall(true)}
          />
        )}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:20, paddingTop:8, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>Infrastructure</h1>
            <p style={{ fontSize:13, color:'#888888', marginTop:4 }}>
              Servers, agents and the certificates they protect
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button className="v2-btn v2-btn-sm" onClick={refresh}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={11} style={refreshing?{animation:'spin .8s linear infinite'}:{}}/>
              Refresh
            </button>
            <button onClick={() => setShowInstall(true)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'#f4f1ec',
                color:'#111111', border:'none', padding:'7px 14px', borderRadius:7,
                fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                transition:'opacity .15s' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.88'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <Plus size={12}/> Add server
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {!loading && agents.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:20 }}>
            {[
              { label:'Servers online',  val:online,       color:'#16a068' },
              { label:'Offline / idle',  val:offline,      color:offline>0?'#1f5c4e':'var(--v2-text)' },
              { label:'Certs protected', val:certs.length, color:'#111111' },
              { label:'Renewals ≤30d',   val:renewalsDue,  color:renewalsDue>0?'#111111':'#16a068' },
            ].map(({ label, val, color }) => (
              <div key={label} className="v2-card" style={{ padding:'11px 14px' }}>
                <div style={{ fontSize:22, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
                <div style={{ fontSize:11, color:'#888888', marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Server list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:isMobile?'14px 0':'48px 0', color:'#888888' }}>
            <RefreshCw size={22} style={{ animation:'spin .8s linear infinite', margin:'0 auto 10px', display:'block' }}/>
            Loading servers…
          </div>
        ) : agents.length === 0 ? (
          /* Empty state */
          <div className="v2-card" style={{ padding:'clamp(16px,16vw,48px) 24px', textAlign:'center' }}>
            <Server size={36} color="var(--v2-text-3)" strokeWidth={1.5}
              style={{ margin:'0 auto 14px', display:'block' }}/>
            <div style={{ fontSize:15, fontWeight:500, color:'#111111', marginBottom:6 }}>
              No servers connected yet
            </div>
            <div style={{ fontSize:12, color:'#888888', maxWidth:360, margin:'0 auto 22px', lineHeight:1.7 }}>
              Install the SSLVault agent on any Linux VPS or cPanel server.
              It will auto-renew your certificates and report status here.
            </div>
            <button onClick={() => setShowInstall(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f4f1ec',
                color:'#111111', border:'none', borderRadius:7, padding:'9px 20px',
                fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
              <Terminal size={13}/> Install agent
            </button>
          </div>
        ) : (
          <>
            {agents.map(agent => (
              <ServerCard key={agent.id} agent={agent} certs={certs} onRefresh={load}
                onRemove={id => setAgents(prev => prev.filter(a => a.id !== id))}/>
            ))}

            {/* "Add another server" nudge */}
            <div onClick={() => setShowInstall(true)}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px',
                border:'0.5px dashed var(--v2-border)', borderRadius:10,
                background:'var(--v2-surface-3)', cursor:'pointer', marginTop:4,
                transition:'border-color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#111111'}
              onMouseLeave={e=>e.currentTarget.style.borderColor=''}>
              <div style={{ width:36, height:36, borderRadius:8,
                background:'var(--v2-surface)', border:'1px solid var(--v2-border)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Server size={16} color="var(--v2-text-3)"/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#333333' }}>
                  Got another server?
                </div>
                <div style={{ fontSize:11, color:'#888888', marginTop:1 }}>
                  Install the SSLVault agent in 60 seconds — auto-renewal works immediately after.
                </div>
              </div>
              <span style={{ fontSize:12, color:'#111111', fontWeight:500, flexShrink:0 }}>
                Install agent →
              </span>
            </div>
          </>
        )}

      </div>
      <style>{`
        @keyframes spin     { from{transform:rotate(0)}to{transform:rotate(360deg)} }
        @keyframes slideDown{ from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes dotpulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:0;transform:scale(2)} }
      `}</style>
    </div>
  )
}
