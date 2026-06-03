// CertBind.jsx v6 — Concept A: SOC-style table layout
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Server, Globe, Shield, Play } from 'lucide-react'
import '../styles/design-v2.css'

const SB = 'https://frthcwkntciaakqsppss.supabase.co'

async function callCertBind(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB}/functions/v1/certbind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

const STATUS_MAP = {
  bound:          { label: 'Live',          color: '#16a068', bg: 'rgba(22,160,104,0.09)',   border: 'rgba(22,160,104,0.22)',  icon: CheckCircle2,  dot: '#16a068',  priority: 0 },
  key_mismatch:   { label: 'Key mismatch',  color: '#1f5c4e', bg: 'rgba(192,57,43,0.07)',  border: 'rgba(248,113,113,0.3)', icon: XCircle,       dot: '#1f5c4e',  priority: 3 },
  cert_mismatch:  { label: 'Wrong cert',    color: '#1f5c4e', bg: 'rgba(192,57,43,0.07)',  border: 'rgba(248,113,113,0.3)', icon: XCircle,       dot: '#1f5c4e',  priority: 3 },
  chain_anomaly:  { label: 'Chain issue',   color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle, dot: '#9a6400',  priority: 2 },
  partial_deploy: { label: 'Partial',       color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle, dot: '#9a6400',  priority: 2 },
  unreachable:    { label: 'Unreachable',   color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle, dot: '#9a6400',  priority: 2 },
  pending:        { label: 'Checking',      color: '#888888', bg: 'rgba(240,237,232,0.06)', border: '#cccccc', icon: Clock,        dot: '#b0a8a0',  priority: 1 },
  null:           { label: 'Not checked',   color: '#888888', bg: 'rgba(240,237,232,0.04)', border: 'rgba(240,237,232,0.1)', icon: Clock,         dot: 'rgba(240,237,232,0.3)', priority: 1 },
}

function getStatus(s) { return STATUS_MAP[s] || STATUS_MAP['null'] }

function PulseDot({ color, animate }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:8, height:8, flexShrink:0 }}>
      {animate && <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:0.4, animation:'pulse-ring 1.5s ease-in-out infinite' }} />}
      <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'block' }} />
    </span>
  )
}

function fmtChecked(iso) {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins/60)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}

function fmtExpiry(iso) {
  if (!iso) return null
  const days = Math.ceil((new Date(iso) - Date.now()) / 86400000)
  const date = new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  return { date, days, urgent: days < 30 }
}

function CertRow({ cert, onCheck, checking }) {
  const s = getStatus(cert.certbind_status)
  const Icon = s.icon
  const isChecking = checking === cert.id
  const isLive = cert.certbind_status === 'bound'
  const expiry = fmtExpiry(cert.expires_at)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr 130px 110px 100px 100px',
      alignItems: 'center',
      gap: 0,
      padding: '0 20px',
      height: 58,
      borderBottom: '1px solid rgba(31,92,78,0.09)',
      transition: 'background .12s',
      background: cert.certbind_status && cert.certbind_status !== 'bound' ? 'rgba(248,113,113,0.03)' : 'transparent',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = cert.certbind_status && cert.certbind_status !== 'bound' ? 'rgba(248,113,113,0.03)' : 'transparent'}
    >
      {/* Pulse dot */}
      <div style={{ display:'flex', alignItems:'center' }}>
        <PulseDot color={s.dot} animate={isLive} />
      </div>

      {/* Domain */}
      <div style={{ paddingRight:16, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#111111', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {cert.domain}
        </div>
        <div style={{ fontSize:11, color:'#888888', marginTop:2, fontFamily:'inherit' }}>
          {cert.issuer || 'RapidSSL'}
          {expiry && <span style={{ marginLeft:8, color: expiry.urgent ? '#9a6400' : '#888888' }}>
            · expires {expiry.date}
          </span>}
        </div>
      </div>

      {/* Install path */}
      <div style={{ fontSize:12, color:'#777777', display:'flex', alignItems:'center', gap:5 }}>
        {cert.install_method === 'agent'  && <><Server size={11} style={{ flexShrink:0 }} /> VPS agent</>}
        {cert.install_method === 'cpanel' && <><Globe  size={11} style={{ flexShrink:0 }} /> cPanel</>}
        {!cert.install_method             && <span style={{ color:'#bbbbbb' }}>—</span>}
      </div>

      {/* Last checked */}
      <div style={{ fontSize:12, color:'#888888', paddingRight:8 }}>
        {fmtChecked(cert.certbind_checked_at)}
      </div>

      {/* Status badge */}
      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:s.bg, border:`1px solid ${s.border}`, fontSize:11, fontWeight:600, color:s.color, whiteSpace:'nowrap', width:'fit-content' }}>
        {isChecking ? <RefreshCw size={9} style={{ animation:'spin 1s linear infinite' }} /> : <Icon size={9} />}
        {isChecking ? 'Checking…' : s.label}
      </div>

      {/* Action button */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button
          onClick={() => !isChecking && onCheck(cert)}
          disabled={isChecking}
          style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'5px 11px', borderRadius:6,
            background: isChecking ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.07)',
            color: isChecking ? 'rgba(240,237,232,0.3)' : '#111111',
            border: `1px solid ${isChecking ? 'rgba(0,0,0,0.05)' : 'rgba(31,92,78,0.2)'}`,
            fontSize:11, fontWeight:600, cursor: isChecking ? 'not-allowed' : 'pointer',
            fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .12s',
          }}
          onMouseEnter={e => { if(!isChecking) e.currentTarget.style.background='rgba(0,0,0,0.1)' }}
          onMouseLeave={e => { if(!isChecking) e.currentTarget.style.background='rgba(0,0,0,0.07)' }}
        >
          <RefreshCw size={9} />
          Run check
        </button>
      </div>
    </div>
  )
}

export default function CertBind() {
  const [certs, setCerts]       = useState([])
  const [agents, setAgents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [checking, setChecking] = useState(null)
  const [running, setRunning]   = useState(false)
  const [userId, setUserId]     = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); load(user.id) }
    })
  }, [])

  async function load(uid) {
    setLoading(true)
    const [{ data: certsData }, { data: agentsData }] = await Promise.all([
      supabase.from('certificates')
        .select('id,domain,status,install_method,certbind_status,certbind_checked_at,issued_at,expires_at,issuer')
        .eq('user_id', uid).eq('status', 'active')
        .order('issued_at', { ascending: false }),
      supabase.from('persistent_agents')
        .select('id,nickname,hostname,status,last_seen_at').eq('user_id', uid),
    ])
    const domainMap = {}
    for (const c of (certsData || [])) {
      if (!domainMap[c.domain] || new Date(c.issued_at) > new Date(domainMap[c.domain].issued_at)) domainMap[c.domain] = c
    }
    setCerts(Object.values(domainMap))
    setAgents(agentsData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  async function runCheck(cert) {
    setChecking(cert.id)
    try {
      const d = await callCertBind('request_bind_check', { user_id: userId, cert_id: cert.id })
      if (d.ok && d.binding_status) {
        setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, certbind_status: d.binding_status, certbind_checked_at: new Date().toISOString() } : c))
      } else { await load(userId) }
    } catch { await load(userId) }
    setChecking(null)
  }

  async function runAllChecks() {
    setRunning(true)
    for (const cert of certs) {
      setChecking(cert.id)
      try {
        const d = await callCertBind('request_bind_check', { user_id: userId, cert_id: cert.id })
        if (d.ok && d.binding_status) {
          setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, certbind_status: d.binding_status, certbind_checked_at: new Date().toISOString() } : c))
        }
      } catch {}
      setChecking(null)
    }
    setRunning(false)
    setLastRefresh(new Date())
  }

  const live      = certs.filter(c => c.certbind_status === 'bound').length
  const alerts    = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy','unreachable'].includes(c.certbind_status)).length
  const unchecked = certs.filter(c => !c.certbind_status).length
  const onlineAgents = agents.filter(a => a.last_seen_at && (Date.now() - new Date(a.last_seen_at).getTime()) < 12 * 60 * 1000).length

  const sorted = [...certs].sort((a, b) => getStatus(b.certbind_status).priority - getStatus(a.certbind_status).priority)

  const allClear = alerts === 0 && unchecked === 0 && certs.length > 0

  return (
    <div className="v2-page">
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.4);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', animation: 'fadeUp .3s ease both' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'rgba(31,92,78,0.09)', border:'1px solid rgba(0,0,0,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="#1f5c4e" />
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:'#111111', letterSpacing:'-0.4px' }}>Live certificate status</div>
              <div style={{ fontSize:12, color:'#888888', marginTop:1 }}>TLS binding verification · confirm the right cert is serving on each domain</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {allClear && (
              <span style={{ fontSize:12, fontWeight:600, color:'#16a068', background:'rgba(22,160,104,0.07)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:20, padding:'4px 12px', display:'flex', alignItems:'center', gap:5 }}>
                <CheckCircle2 size={11} /> All clear
              </span>
            )}
            <button onClick={() => userId && load(userId)} disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:7, background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.1)', color:'#333333', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, marginBottom:20, border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden' }}>
          {[
            { num: certs.length, label: 'Total domains',  color: '#111111' },
            { num: live,         label: 'Verified live',  color: '#16a068' },
            { num: alerts,       label: 'Need attention', color: alerts > 0 ? '#1f5c4e' : 'rgba(240,237,232,0.3)' },
            { num: unchecked,    label: 'Not checked',    color: unchecked > 0 ? '#9a6400' : 'rgba(240,237,232,0.3)' },
          ].map(({ num, label, color }, i) => (
            <div key={label} style={{ padding:'14px 18px', background:'rgba(0,0,0,0.02)', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
              <div style={{ fontSize:24, fontWeight:700, color, letterSpacing:'-1px', lineHeight:1 }}>{num}</div>
              <div style={{ fontSize:11, color:'#888888', marginTop:5, fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Alert banner ── */}
        {alerts > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderRadius:8, background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', marginBottom:16 }}>
            <AlertTriangle size={13} color="#f87171" />
            <span style={{ fontSize:13, color:'#1f5c4e', fontWeight:600 }}>
              {alerts} certificate{alerts !== 1 ? 's' : ''} {alerts === 1 ? 'needs' : 'need'} attention — check the highlighted rows below
            </span>
          </div>
        )}

        {/* ── Main table ── */}
        <div style={{ border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden' }}>

          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'24px 1fr 130px 110px 100px 100px', padding:'0 20px', height:38, alignItems:'center', background:'rgba(31,92,78,0.07)', borderBottom:'1px solid rgba(0,0,0,0.08)' }}>
            <div />
            <div style={{ fontSize:10, fontWeight:700, color:'#111111', textTransform:'uppercase', letterSpacing:'0.8px' }}>Domain</div>
            <div style={{ fontSize:10, fontWeight:700, color:'#111111', textTransform:'uppercase', letterSpacing:'0.8px' }}>Install path</div>
            <div style={{ fontSize:10, fontWeight:700, color:'#111111', textTransform:'uppercase', letterSpacing:'0.8px' }}>Checked</div>
            <div style={{ fontSize:10, fontWeight:700, color:'#111111', textTransform:'uppercase', letterSpacing:'0.8px' }}>Status</div>
            <div />
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:8, color:'#888888', fontSize:13 }}>
              <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> Loading certificates…
            </div>
          ) : certs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <Shield size={28} color="rgba(0,0,0,0.08)" style={{ marginBottom:10 }} />
              <div style={{ fontSize:14, fontWeight:600, color:'#333333', marginBottom:5 }}>No active certificates</div>
              <div style={{ fontSize:12, color:'#888888' }}>Issue your first certificate to start monitoring</div>
            </div>
          ) : (
            sorted.map((cert, i) => (
              <div key={cert.id} style={{ animation:`fadeUp .25s ease ${.05 + i*.04}s both` }}>
                <CertRow cert={cert} onCheck={runCheck} checking={checking} />
              </div>
            ))
          )}

          {/* Table footer */}
          {!loading && certs.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', background:'rgba(0,0,0,0.02)', borderTop:'1px solid rgba(31,92,78,0.09)' }}>
              <div style={{ fontSize:11, color:'#999999' }}>
                {lastRefresh ? `Last checked ${lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })} UTC` : 'Not yet checked'}
                {agents.length > 0 && (
                  <span style={{ marginLeft:12 }}>
                    <PulseDot color={onlineAgents > 0 ? '#16a068' : 'rgba(240,237,232,0.2)'} animate={onlineAgents > 0} />
                    <span style={{ marginLeft:5 }}>{onlineAgents}/{agents.length} agent{agents.length !== 1 ? 's' : ''} online</span>
                  </span>
                )}
              </div>
              <button
                onClick={runAllChecks}
                disabled={running || !!checking}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:6, background: running ? 'rgba(31,92,78,0.08)' : '#1f5c4e', color:'#111111', border:'none', fontSize:12, fontWeight:600, cursor: running ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .12s' }}>
                {running
                  ? <><RefreshCw size={11} style={{ animation:'spin 1s linear infinite' }} /> Running…</>
                  : <><Play size={11} /> Run all checks</>}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
