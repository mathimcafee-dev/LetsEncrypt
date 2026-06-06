// DomainManager.jsx — Unified domain-first management page
// Replaces: Infrastructure.jsx, MyServers.jsx, AgentHealth.jsx, Servers.jsx
// Each domain is the primary unit — showing its cert, server, agent, DNS, jobs in one card
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Globe, Plus, RefreshCw, CheckCircle, XCircle, Clock,
  Copy, Check, ChevronDown, ChevronUp, Terminal, Shield,
  RotateCcw, Trash2, Activity, Server, Wifi, WifiOff,
  AlertTriangle, Key, Database, Zap, ExternalLink, Search, X
} from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'
// DM Sans loaded via index.html or inline style tag in component
import AddDomainWizard from '../components/AddDomainWizard'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://frthcwkntciaakqsppss.supabase.co'

// ── Helpers ────────────────────────────────────────────────────────────
function fmtRel(iso) {
  if (!iso) return '—'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '—' }
}
function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

function agentStatus(last_seen_at, status) {
  if (!last_seen_at) return { label: 'Never seen', color: '#555555', dot: 'rgba(0,0,0,0.15)', pulse: false }
  const mins = differenceInMinutes(new Date(), new Date(last_seen_at))
  if (status === 'offline' || mins > 15) return { label: 'Offline', color: '#0077b6', dot: '#0077b6', pulse: false }
  if (mins > 6) return { label: 'Idle', color: '#111111', dot: '#111111', pulse: false }
  return { label: 'Online', color: '#00a550', dot: '#00a550', pulse: true }
}

function certHealth(cert) {
  if (!cert) return { label: 'No cert', color: '#555555', bg: 'transparent', border: 'var(--v2-border)' }
  if (cert.status === 'revoked') return { label: 'Revoked', color: '#0077b6', bg: 'rgba(0,119,182,0.09)', border: 'rgba(0,0,0,0.1)' }
  const d = daysLeft(cert.expires_at)
  if (d === null) return { label: 'Active', color: '#00a550', bg: 'transparent', border: 'var(--v2-border)' }
  if (d < 0)  return { label: 'Expired', color: '#0077b6', bg: 'rgba(0,119,182,0.09)', border: 'rgba(0,0,0,0.1)' }
  if (d <= 7) return { label: `${d}d`, color: '#0077b6', bg: 'rgba(0,119,182,0.07)', border: 'rgba(0,0,0,0.08)' }
  if (d <= 30) return { label: `${d}d`, color: '#111111', bg: 'rgba(239,68,68,0.06)', border: 'rgba(0,0,0,0.07)' }
  return { label: `${d}d`, color: '#00a550', bg: 'transparent', border: 'var(--v2-border)' }
}

// ── Status dot ─────────────────────────────────────────────────────────
function StatusDot({ st, size = 8 }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {st.pulse && (
        <span style={{ position:'absolute', width:size+10, height:size+10, borderRadius:'50%', background:st.dot+'28', animation:'dotpulse 2.4s ease infinite' }}/>
      )}
      <span style={{ width:size, height:size, borderRadius:'50%', background:st.dot, position:'relative', boxShadow: st.pulse ? `0 0 0 2px ${st.dot}30` : 'none' }}/>
    </span>
  )
}

// ── Copy button ────────────────────────────────────────────────────────
function CopyBtn({ text, size = 10 }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      style={{ fontSize: size, fontWeight: 500, color: '#555555', padding: '3px 7px', border: '1px solid var(--v2-border)', borderRadius: 4, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', flexShrink: 0 }}>
      {done ? <><Check size={size} /> Copied</> : <><Copy size={size} /> Copy</>}
    </button>
  )
}

// ── Install modal ──────────────────────────────────────────────────────
function InstallModal({ onClose }) {
  const [installCmd, setInstallCmd] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const r = await fetch(`${SB_URL}/functions/v1/agent-daemon`, {
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--v2-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#111111' }}>Install SSLVault agent</div>
            <div style={{ fontSize: 11, color: '#555555', marginTop: 2 }}>Run on your Linux VPS — installs in 60 seconds</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--v2-border)', background: 'var(--v2-surface)', cursor: 'pointer', fontSize: 16, color: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {[
            { id: 'install', label: '1. Install the agent', cmd: loading ? 'Generating secure install command…' : (error || installCmd) },
            { id: 'verify', label: "2. Verify it's running", cmd: 'sudo systemctl status sslvault-agent' },
          ].map(({ id, label, cmd }) => (
            <div key={id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#333333', marginBottom: 6 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f4fa', borderRadius: 8, padding: '11px 14px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <code style={{ fontSize: 12.5, color: id === 'install' && error ? '#b03425' : '#111111', fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace', flex: 1, overflow: 'auto', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{cmd}</code>
                {!loading && !error && <CopyBtn text={cmd} size={10} />}
              </div>
            </div>
          ))}
          <div style={{ background: 'transparent', border: '1px solid rgba(0,119,182,0.2)', borderRadius: 7, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#111111', lineHeight: 1.6 }}>
              The agent polls SSLVault every 5 minutes, auto-installs and auto-renews certificates, and appears in Domain Manager within 1–2 minutes.
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v2-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Domain card ────────────────────────────────────────────────────────
// Each card = one domain. Shows: cert health, server/agent, DNS, install method, recent jobs
function DomainCard({ domain, cert, agent, dnsCredentials, cpanelCredentials, onRefresh, onRemoveAgent }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('overview') // overview | cert | server | jobs
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [removing, setRemoving] = useState(false)

  const health = certHealth(cert)
  const st = agent ? agentStatus(agent.last_seen_at, agent.status) : null

  const loadJobs = useCallback(async () => {
    if (!agent) return
    setLoadingJobs(true)
    const { data } = await supabase.from('agent_jobs')
      .select('id,job_type,status,domain,completed_at,created_at,error_message')
      .eq('agent_id', agent.id)
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .limit(15)
    setJobs(data || [])
    setLoadingJobs(false)
  }, [agent, domain])

  useEffect(() => {
    if (open && tab === 'jobs') loadJobs()
  }, [open, tab, loadJobs])

  const daysLeft_ = cert ? daysLeft(cert.expires_at) : null
  const isExpiring = daysLeft_ !== null && daysLeft_ >= 0 && daysLeft_ <= 30
  const isExpired  = daysLeft_ !== null && daysLeft_ < 0

  // Border color based on worst condition
  const borderColor = isExpired ? 'rgba(192,57,43,0.35)'
    : isExpiring ? 'rgba(0,0,0,0.08)'
    : (st?.label === 'Online') ? 'rgba(0,0,0,0.08)'
    : 'var(--v2-border)'

  const F2 = "'DM Sans','Inter',system-ui,sans-serif"
  const MONO2 = "'JetBrains Mono','Fira Mono',monospace"

  return (
    <div style={{ background:'#ffffff', border:`1px solid ${borderColor}`, borderRadius:14, overflow:'hidden', marginBottom:10, transition:'all .2s', boxShadow:'0 2px 8px rgba(0,119,182,0.06)', fontFamily:F2 }}
      onMouseEnter={e=>{if(!open)e.currentTarget.style.boxShadow='0 4px 16px rgba(0,119,182,0.12)'}}
      onMouseLeave={e=>{if(!open)e.currentTarget.style.boxShadow='0 2px 8px rgba(0,119,182,0.06)'}}>

      {/* ── Card header ── */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', cursor:'pointer', background: open ? 'rgba(0,119,182,0.02)' : '#ffffff', transition:'background .15s' }}>

        {/* Domain icon */}
        <div style={{ width:40, height:40, borderRadius:10, background:isExpired?'rgba(192,57,43,0.08)':isExpiring?'rgba(154,100,0,0.08)':'rgba(0,119,182,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Globe size={17} color={isExpired?'#b03425':isExpiring?'#9a6400':'#0077b6'} strokeWidth={1.8}/>
        </div>

        {/* Domain name + meta */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0d1117', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.2px', fontFamily:MONO2 }}>
            {domain}
          </div>
          <div style={{ fontSize:11, color:'#7a8694', marginTop:3, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {cert && <span style={{ background:'rgba(0,119,182,0.07)', padding:'1px 7px', borderRadius:4, color:'#3d4a58', fontWeight:500 }}>{cert.issuer || 'RapidSSL'}</span>}
            {cert?.install_method && <span style={{ background:'rgba(0,0,0,0.05)', padding:'1px 7px', borderRadius:4, color:'#3d4a58', fontFamily:MONO2, fontSize:10 }}>{cert.install_method}</span>}
            {cert?.auto_renew_enabled && <span style={{ color:'#00a550', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><span style={{ width:5, height:5, borderRadius:'50%', background:'#00a550', display:'inline-block' }}></span>auto-renew</span>}
          </div>
        </div>

        {/* Agent status */}
        {st && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20, background:st.pulse?'rgba(0,165,80,0.08)':'rgba(0,0,0,0.05)', border:`1px solid ${st.pulse?'rgba(0,165,80,0.2)':'rgba(0,0,0,0.08)'}`, flexShrink:0 }}>
            <StatusDot st={st} size={6}/>
            <span style={{ fontSize:10, color:st.color, fontWeight:600, letterSpacing:'0.02em' }}>{st.label}</span>
          </div>
        )}

        {/* Cert health badge */}
        <div style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, color:health.color, background:health.bg, border:`1px solid ${health.border}`, flexShrink:0, letterSpacing:'0.02em' }}>
          {health.label}
        </div>

        <div style={{ width:28, height:28, borderRadius:7, background:'rgba(0,119,182,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .15s' }}>
          {open ? <ChevronUp size={13} color="#0077b6"/> : <ChevronDown size={13} color="#7a8694"/>}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ borderTop:`1px solid rgba(0,119,182,0.08)`, background:'#fafcff', animation:'slideDown .18s ease' }}>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:0, padding:'0 20px', borderBottom:'1px solid rgba(0,119,182,0.08)', background:'#ffffff' }}>
            {[
              { id:'overview', label:'Overview',    icon:Globe },
              { id:'cert',     label:'Certificate', icon:Shield },
              { id:'server',   label:'Server',      icon:Server },
              { id:'jobs',     label:'Jobs',        icon:Activity },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'11px 14px', fontSize:12, fontWeight:tab===id?700:500, cursor:'pointer', fontFamily:F2, background:'none', border:'none', borderBottom:tab===id?'2px solid #0077b6':'2px solid transparent', color:tab===id?'#0077b6':'#7a8694', transition:'all .15s', marginBottom:'-1px', letterSpacing:'0.01em' }}>
                <Icon size={12}/>{label}
              </button>
            ))}
          </div>

          <div style={{ padding:'20px' }}>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:12 }}>

                {/* Cert summary */}
                <div style={{ padding:'16px', background:'#ffffff', borderRadius:10, border:`1px solid ${health.border || 'rgba(0,119,182,0.12)'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                    <Shield size={12} color="#0077b6"/>
                    <span style={{ fontSize:10, fontWeight:700, color:'#0077b6', textTransform:'uppercase', letterSpacing:'0.5px' }}>Certificate</span>
                  </div>
                  {cert ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0d1117', marginBottom:4, fontFamily:MONO2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert.domain}</div>
                      <div style={{ fontSize:11, color:'#7a8694', marginBottom:5 }}>Issued by {cert.issuer || 'RapidSSL'}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:health.color, background:health.bg, padding:'3px 8px', borderRadius:6, display:'inline-block' }}>
                        {isExpired ? 'Expired' : daysLeft_ !== null ? `${daysLeft_}d remaining` : 'Active'}
                      </div>
                      {cert.auto_renew_enabled && (
                        <div style={{ fontSize:10, color:'#00a550', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'#00a550', display:'inline-block' }}></span>Auto-renew on
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize:12, color:'#7a8694' }}>No certificate issued yet</div>
                  )}
                </div>

                {/* Server */}
                <div style={{ padding:'16px', background:'#ffffff', borderRadius:10, border:'1px solid rgba(0,119,182,0.12)', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                    <Server size={12} color="#0077b6"/>
                    <span style={{ fontSize:10, fontWeight:700, color:'#0077b6', textTransform:'uppercase', letterSpacing:'0.5px' }}>Server</span>
                  </div>
                  {agent ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <StatusDot st={st} size={7}/>
                        <span style={{ fontSize:13, fontWeight:600, color:'#0d1117', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{agent.nickname || agent.hostname}</span>
                      </div>
                      <div style={{ fontSize:11, color:'#7a8694', fontFamily:MONO2 }}>{agent.ip_address}</div>
                      <div style={{ fontSize:11, color:'#7a8694', marginTop:2 }}>{agent.os} · {agent.web_server}</div>
                      <div style={{ fontSize:10, color:'#7a8694', marginTop:4 }}>Last seen {fmtRel(agent.last_seen_at)}</div>
                    </>
                  ) : cert?.install_method === 'cpanel' ? (
                    <>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0d1117', marginBottom:5 }}>cPanel</div>
                      <div style={{ fontSize:11, color:'#00a550', display:'flex', alignItems:'center', gap:4 }}>
                        <CheckCircle size={11} color="#00a550"/>Auto-installed via cPanel API
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize:12, color:'#7a8694' }}>No server linked yet</div>
                  )}
                </div>

                {/* DNS */}
                <div style={{ padding:'16px', background:'#ffffff', borderRadius:10, border:'1px solid rgba(0,119,182,0.12)', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                    <Wifi size={12} color="#0077b6"/>
                    <span style={{ fontSize:10, fontWeight:700, color:'#0077b6', textTransform:'uppercase', letterSpacing:'0.5px' }}>DNS</span>
                  </div>
                  {dnsCredentials.length > 0 ? (
                    dnsCredentials.map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <CheckCircle size={11} color="#00a550"/>
                        <span style={{ fontSize:12, color:'#0d1117', fontWeight:500 }}>{d.provider || d.label}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize:12, color:'#7a8694' }}>No DNS provider connected</div>
                  )}
                </div>

                {/* GGS order quick info */}
                {cert?.ggs_order_id && (
                  <div style={{ padding: '12px 14px', background: 'var(--v2-surface-3)', borderRadius: 8, border: '1px solid var(--v2-border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Order</div>
                    <div style={{ fontSize: 11, color: '#555555', marginBottom: 3 }}>GGS #{cert.ggs_order_id}</div>
                    <div style={{ fontSize: 11, color: '#555555' }}>
                      Issued {fmtRel(cert.issued_at || cert.created_at)}
                    </div>
                    {cert.is_live_on_server && (
                      <div style={{ fontSize: 10, color: '#00a550', marginTop: 3 }}>Live on server ✓</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CERT TAB ── */}
            {tab === 'cert' && (
              <div>
                {!cert ? (
                  <div style={{ fontSize: 12, color: '#555555', padding: '8px 0' }}>No certificate for this domain yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                    <div>
                      {[
                        ['Domain',       cert.domain],
                        ['Status',       cert.status],
                        ['Issuer',       cert.issuer || 'RapidSSL'],
                        ['Type',         cert.cert_type || cert.cert_type_detail || 'DV'],
                        ['Expires',      cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : '—'],
                        ['Issued',       cert.issued_at  ? new Date(cert.issued_at).toLocaleDateString()  : '—'],
                        ['Serial',       cert.serial_number],
                        ['GGS order',    cert.ggs_order_id ? `#${cert.ggs_order_id}` : null],
                        ['Install',      cert.install_method || 'Manual'],
                        ['Live on server', cert.is_live_on_server ? 'Yes' : 'No'],
                        ['Auto-renew',   cert.auto_renew_enabled ? 'Enabled' : 'Disabled'],
                        ['Key algorithm', cert.key_algorithm],
                        ['Key size',     cert.key_size_bits ? `${cert.key_size_bits} bit` : null],
                        ['DCV method',   cert.dcv_method],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span style={{ color: '#555555' }}>{k}</span>
                          <span style={{ color: '#111111', fontFamily: 'monospace', fontSize: 11, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fingerprint + PEM snippet */}
                    {cert.fingerprint_sha1 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>SHA-1 fingerprint</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f4fa', borderRadius: 7, padding: '8px 12px', marginBottom: 12 }}>
                          <code style={{ fontSize: 10, color: '#111111', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>{cert.fingerprint_sha1}</code>
                          <CopyBtn text={cert.fingerprint_sha1} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── SERVER TAB ── */}
            {tab === 'server' && (
              <div>
                {!agent ? (
                  <div style={{ fontSize: 12, color: '#555555', padding: '8px 0', lineHeight: 1.6 }}>
                    No VPS agent linked to this domain.
                    {cert?.install_method === 'cpanel' && ' Certificate is installed via cPanel.'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                    <div>
                      {[
                        ['Hostname',       agent.hostname],
                        ['IP address',     agent.ip_address],
                        ['OS',             agent.os],
                        ['Architecture',   agent.arch],
                        ['Web server',     agent.web_server],
                        ['Agent version',  agent.agent_version ? `v${agent.agent_version}` : null],
                        ['Uptime',         agent.uptime_seconds ? `${Math.floor(agent.uptime_seconds / 3600)}h` : null],
                        ['CPU',            agent.cpu_pct ? `${agent.cpu_pct}%` : null],
                        ['RAM',            agent.mem_pct ? `${agent.mem_pct}%` : null],
                        ['Disk',           agent.disk_pct ? `${agent.disk_pct}%` : null],
                        ['Last seen',      fmtRel(agent.last_seen_at)],
                        ['Connected',      fmtRel(agent.created_at)],
                        ['Certs managed',  agent.certs_managed != null ? String(agent.certs_managed) : null],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span style={{ color: '#555555' }}>{k}</span>
                          <span style={{ color: '#111111', fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Agent token + actions */}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Agent token</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f4fa', borderRadius: 7, padding: '8px 12px', marginBottom: 16 }}>
                        <code style={{ fontSize: 10, color: '#333333', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {agent.agent_token ? `${agent.agent_token.substring(0, 24)}…` : '—'}
                        </code>
                        <CopyBtn text={agent.agent_token || ''} />
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Restart command</div>
                      <div style={{ background: '#f0f4fa', borderRadius: 7, padding: '8px 12px', marginBottom: 16 }}>
                        <code style={{ fontSize: 10, color: '#111111', fontFamily: 'monospace' }}>
                          sudo systemctl restart sslvault-agent
                        </code>
                      </div>

                      {/* Remove agent button */}
                      <button
                        disabled={removing}
                        onClick={async () => {
                          if (!window.confirm(`Remove agent "${agent.nickname || agent.hostname}" from SSLVault? Auto-renewal for this server will stop.`)) return
                          setRemoving(true)
                          await supabase.from('agent_jobs').delete().eq('agent_id', agent.id)
                          await supabase.from('persistent_agents').delete().eq('id', agent.id)
                          onRemoveAgent?.(agent.id)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#0077b6', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Trash2 size={11} />{removing ? 'Removing…' : 'Remove agent'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── JOBS TAB ── */}
            {tab === 'jobs' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#555555' }}>Recent agent jobs for {domain}</span>
                  <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={loadJobs} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={10} />Refresh
                  </button>
                </div>
                {loadingJobs ? (
                  <div style={{ fontSize: 12, color: '#555555', padding: '8px 0' }}>
                    <RefreshCw size={12} style={{ animation: 'spin .8s linear infinite', verticalAlign: '-2px', marginRight: 6 }} />Loading…
                  </div>
                ) : !agent ? (
                  <div style={{ fontSize: 12, color: '#555555', padding: '8px 0' }}>No agent linked — jobs are only available for VPS agent installs.</div>
                ) : jobs.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#555555', padding: '8px 0' }}>No jobs yet for this domain.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {jobs.map(j => {
                      const ok   = j.status === 'completed' || j.status === 'success'
                      const fail = j.status === 'failed' || j.status === 'error'
                      const pend = j.status === 'queued' || j.status === 'claimed'
                      return (
                        <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: 'var(--v2-surface-3)' }}>
                          {ok   ? <CheckCircle size={12} color="#16a34a" />
                          : fail ? <XCircle size={12} color="#0077b6" />
                          : pend ? <Clock size={12} color="#0077b6" style={{ animation: 'spin 2s linear infinite' }} />
                          :        <Clock size={12} color="#b0a8a0" />}
                          <span style={{ fontSize: 11, color: '#333333', fontFamily: 'monospace', flex: 1 }}>
                            {j.job_type}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8, background: ok ? 'rgba(16,185,129,0.1)' : fail ? 'rgba(0,119,182,0.08)' : 'rgba(239,68,68,0.08)', color: ok ? '#00a550' : fail ? '#0077b6' : '#0077b6' }}>
                            {j.status}
                          </span>
                          {j.error_message && (
                            <span style={{ fontSize: 10, color: '#0077b6', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.error_message}>
                              {j.error_message}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#555555', flexShrink: 0 }}>
                            {fmtRel(j.completed_at || j.created_at)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ── Unlinked agents section ────────────────────────────────────────────
// Agents that don't map to any active cert domain
function UnlinkedAgents({ agents, onRefresh, onRemove }) {
  if (agents.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#555555', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Server size={12} />
        Servers with no active certificates ({agents.length})
      </div>
      {agents.map(agent => {
        const st = agentStatus(agent.last_seen_at, agent.status)
        return (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--v2-border)', borderRadius: 9, marginBottom: 6, background: 'var(--v2-surface)' }}>
            <StatusDot st={st} size={8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#111111' }}>{agent.nickname || agent.hostname || 'Unnamed'}</div>
              <div style={{ fontSize: 11, color: '#555555', fontFamily: 'monospace', marginTop: 1 }}>{agent.ip_address} · {agent.os}</div>
            </div>
            <span style={{ fontSize: 10, color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 10, color: '#555555' }}>Seen {fmtRel(agent.last_seen_at)}</span>
            <button onClick={async () => {
              if (!window.confirm(`Remove "${agent.nickname || agent.hostname}"?`)) return
              await supabase.from('agent_jobs').delete().eq('agent_id', agent.id)
              await supabase.from('persistent_agents').delete().eq('id', agent.id)
              onRemove?.(agent.id)
            }} style={{ fontSize: 10, color: '#0077b6', background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              <Trash2 size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ══ MAIN ═══════════════════════════════════════════════════════════════
export default function DomainManager({ user, nav }) {
  const isMobile = useIsMobile()
  const [certs,           setCerts]           = useState([])
  const [agents,          setAgents]          = useState([])
  const [dnsCredentials,  setDnsCredentials]  = useState([])
  const [cpanelCreds,     setCpanelCreds]     = useState([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)
  const [showInstall,     setShowInstall]     = useState(false)
  const [showWizard,      setShowWizard]      = useState(false)
  const [search,          setSearch]          = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [
      { data: certData },
      { data: agentData },
      { data: dnsData },
      { data: cpanelData },
    ] = await Promise.all([
      supabase.from('certificates')
        .select('id,domain,status,issuer,cert_type,cert_type_detail,expires_at,issued_at,created_at,install_method,install_server_id,agent_id,auto_renew_enabled,ggs_order_id,is_live_on_server,live_confirmed_at,fingerprint_sha1,serial_number,key_algorithm,key_size_bits,dcv_method,is_current')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .not('status', 'in', '("revoked","expired")')
        .order('created_at', { ascending: false }),
      supabase.from('persistent_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false, nullsFirst: false }),
      supabase.from('dns_credentials')
        .select('id,provider,label,domain_pattern')
        .eq('user_id', user.id).limit(10),
      supabase.from('server_credentials')
        .select('id,nickname,host,port,username,server_type,domains')
        .eq('user_id', user.id).in('server_type', ['cpanel', 'shared']),
    ])
    setCerts(certData || [])
    setAgents(agentData || [])
    setDnsCredentials(dnsData || [])
    setCpanelCreds(cpanelData || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  // Build domain list: one entry per unique domain, with its cert + agent
  const domains = (() => {
    const seen = new Set()
    const result = []
    for (const cert of (certs || [])) {
      if (seen.has(cert.domain)) continue
      seen.add(cert.domain)
      // Find agent linked to this cert
      const agent = agents.find(a =>
        a.id === cert.agent_id ||
        cert.install_server_id === a.id ||
        (a.ip_address && cert.agent_url?.includes(a.ip_address)) ||
        (a.hostname === cert.domain)
      )
      result.push({ domain: cert.domain, cert, agent })
    }
    // Also include agents that have no cert domain in our list
    return result
  })()

  // Agents with no domain match in certs
  const linkedAgentIds = new Set(domains.filter(d => d.agent).map(d => d.agent.id))
  const unlinkedAgents = agents.filter(a => !linkedAgentIds.has(a.id))

  // Filter by search
  const filtered = search
    ? domains.filter(d => d.domain.toLowerCase().includes(search.toLowerCase()))
    : domains

  // Stats
  const online      = agents.filter(a => a.last_seen_at && differenceInMinutes(new Date(), new Date(a.last_seen_at)) <= 6).length
  const expiringSoon = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d >= 0 && d <= 30 }).length
  const liveOnServer = certs.filter(c => c.is_live_on_server).length

  const F = "'DM Sans','Inter',system-ui,sans-serif"
  const MONO = "'JetBrains Mono','Fira Mono',monospace"

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', fontFamily:F }}>
      <div style={{ maxWidth:980, margin:'0 auto', padding:'32px 24px 80px' }}>

        {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
        {showWizard && <AddDomainWizard user={user} onClose={() => { setShowWizard(false); load() }} nav={nav} />}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#0077b6,#0091d6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,119,182,0.3)' }}>
                <Globe size={18} color="#ffffff" strokeWidth={1.8}/>
              </div>
              <h1 style={{ fontSize:24, fontWeight:700, color:'#0d1117', letterSpacing:'-0.4px', margin:0 }}>Domain Manager</h1>
            </div>
            <p style={{ fontSize:13, color:'#7a8694', marginTop:0, marginLeft:48 }}>
              Every domain — its certificate, server, agent and jobs in one place
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={refresh}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, border:'1px solid rgba(0,119,182,0.2)', background:'#ffffff', color:'#3d4a58', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, transition:'all .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,119,182,0.4)';e.currentTarget.style.background='rgba(0,119,182,0.04)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,119,182,0.2)';e.currentTarget.style.background='#ffffff'}}>
              <RefreshCw size={12} style={refreshing ? { animation:'spin .8s linear infinite' } : {}} />
              Refresh
            </button>
            <button onClick={() => setShowWizard(true)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'#0077b6', color:'#ffffff', border:'none', padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, transition:'all .15s', boxShadow:'0 4px 12px rgba(0,119,182,0.3)' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#0068a0';e.currentTarget.style.transform='translateY(-1px)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#0077b6';e.currentTarget.style.transform='translateY(0)'}}>
              <Plus size={13}/> Add domain
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {!loading && (certs.length > 0 || agents.length > 0) && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Active domains', val:domains.length,   color:'#0077b6',  bg:'rgba(0,119,182,0.06)',  border:'rgba(0,119,182,0.15)' },
              { label:'Agents online',  val:online,           color:online>0?'#00a550':'#7a8694', bg:online>0?'rgba(0,165,80,0.06)':'rgba(0,0,0,0.03)', border:online>0?'rgba(0,165,80,0.15)':'rgba(0,0,0,0.08)' },
              { label:'Live on server', val:liveOnServer,     color:liveOnServer>0?'#00a550':'#7a8694', bg:liveOnServer>0?'rgba(0,165,80,0.06)':'rgba(0,0,0,0.03)', border:liveOnServer>0?'rgba(0,165,80,0.15)':'rgba(0,0,0,0.08)' },
              { label:'Expiring ≤30d',  val:expiringSoon,     color:expiringSoon>0?'#b03425':'#00a550', bg:expiringSoon>0?'rgba(192,57,43,0.06)':'rgba(0,165,80,0.06)', border:expiringSoon>0?'rgba(192,57,43,0.15)':'rgba(0,165,80,0.15)' },
            ].map(({ label, val, color, bg, border }) => (
              <div key={label} style={{ padding:'16px 20px', borderRadius:12, background:bg, border:`1px solid ${border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:32, fontWeight:800, color, fontFamily:MONO, lineHeight:1, letterSpacing:'-1px', marginBottom:5 }}>{val}</div>
                <div style={{ fontSize:11, color:'#7a8694', fontWeight:500, letterSpacing:'0.02em' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!loading && domains.length > 3 && (
          <div style={{ position:'relative', marginBottom:16 }}>
            <Search size={14} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#7a8694' }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search domains…"
              style={{ width:'100%', background:'#ffffff', border:'1px solid rgba(0,119,182,0.15)', borderRadius:10, padding:'11px 14px 11px 38px', fontSize:13, color:'#0d1117', fontFamily:F, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', transition:'border-color .15s' }}
              onFocus={e=>e.currentTarget.style.borderColor='rgba(0,119,182,0.4)'}
              onBlur={e=>e.currentTarget.style.borderColor='rgba(0,119,182,0.15)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#7a8694', display:'flex', alignItems:'center' }}>
                <X size={13}/>
              </button>
            )}
          </div>
        )}

        {/* Domain list */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'64px 0', color:'#7a8694', fontFamily:F }}>
            <RefreshCw size={24} style={{ animation:'spin .8s linear infinite', margin:'0 auto 12px', display:'block', color:'#0077b6' }}/>
            <div style={{ fontSize:13, fontWeight:500 }}>Loading domains…</div>
          </div>
        ) : domains.length === 0 ? (
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:16, padding:'56px 24px', textAlign:'center', boxShadow:'0 2px 12px rgba(0,119,182,0.06)' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'rgba(0,119,182,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
              <Globe size={28} color="#0077b6" strokeWidth={1.5}/>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'#0d1117', marginBottom:8, letterSpacing:'-0.2px' }}>No domains yet</div>
            <div style={{ fontSize:13, color:'#7a8694', maxWidth:340, margin:'0 auto 24px', lineHeight:1.75 }}>
              Issue your first certificate from the Dashboard. Once issued, your domain appears here with full control.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#7a8694', fontSize:13, fontFamily:F }}>
            No domains match &quot;{search}&quot;
          </div>
        ) : (
          <>
            {filtered.map(({ domain, cert, agent }) => (
              <DomainCard
                key={domain}
                domain={domain}
                cert={cert}
                agent={agent}
                dnsCredentials={dnsCredentials}
                cpanelCredentials={cpanelCreds}
                onRefresh={load}
                onRemoveAgent={id => setAgents(prev => prev.filter(a => a.id !== id))}
              />
            ))}

            {/* Add another server nudge */}
            <div onClick={() => setShowInstall(true)}
              style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', border:'1.5px dashed rgba(0,119,182,0.2)', borderRadius:12, background:'rgba(0,119,182,0.02)', cursor:'pointer', marginTop:8, transition:'all .18s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,119,182,0.45)';e.currentTarget.style.background='rgba(0,119,182,0.05)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,119,182,0.2)';e.currentTarget.style.background='rgba(0,119,182,0.02)'}}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(0,119,182,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Server size={18} color="#0077b6"/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#0d1117', letterSpacing:'-0.1px' }}>Got another server?</div>
                <div style={{ fontSize:12, color:'#7a8694', marginTop:2 }}>Install the SSLVault agent in 60 seconds — auto-renewal works immediately.</div>
              </div>
              <span style={{ fontSize:12, color:'#0077b6', fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>Install agent <span style={{fontSize:14}}>→</span></span>
            </div>
          </>
        )}

        {/* Unlinked agents */}
        <UnlinkedAgents
          agents={unlinkedAgents}
          onRefresh={load}
          onRemove={id => setAgents(prev => prev.filter(a => a.id !== id))}
        />

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin      { from{transform:rotate(0)}   to{transform:rotate(360deg)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotpulse  { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0;transform:scale(2.2)} }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
