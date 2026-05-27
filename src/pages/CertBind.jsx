// CertBind.jsx v5 — Professional security monitoring design
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Server, Globe, Wifi, Shield, ChevronRight } from 'lucide-react'
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
  bound:          { label: 'Live',          color: '#ffffff', dot: '#f0ede8', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: CheckCircle2,    priority: 0 },
  key_mismatch:   { label: 'Key Mismatch',  color: '#f87171', dot: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: XCircle,         priority: 3 },
  cert_mismatch:  { label: 'Wrong Cert',    color: '#f87171', dot: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   icon: XCircle,         priority: 3 },
  chain_anomaly:  { label: 'Chain Issue',   color: '#ff8c7a', dot: '#e07060', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: AlertTriangle,   priority: 2 },
  partial_deploy: { label: 'Partial',       color: '#ffffff', dot: '#f0ede8', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: AlertTriangle,   priority: 2 },
  unreachable:    { label: 'Unreachable',   color: '#ffffff', dot: '#f0ede8', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: AlertTriangle,   priority: 2 },
  pending:        { label: 'Checking',      color: 'var(--v2-text-3)', dot: 'var(--v2-text-3)', bg: 'rgba(240,237,232,0.06)', border: 'rgba(240,237,232,0.15)', icon: Clock,           priority: 1 },
  null:           { label: 'Not checked',   color: 'var(--v2-text-3)', dot: 'var(--v2-text-2)', bg: 'rgba(240,237,232,0.04)', border: 'rgba(240,237,232,0.1)',  icon: Clock,           priority: 1 },
}

function getStatus(s) { return STATUS_MAP[s] || STATUS_MAP['null'] }

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function PulseDot({ color, animate }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
      {animate && (
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: color, opacity: 0.4,
          animation: 'pulse-ring 1.5s cubic-bezier(0.4,0,0.6,1) infinite'
        }} />
      )}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  )
}

function CertRow({ cert, onCheck, checking }) {
  const s = getStatus(cert.certbind_status)
  const Icon = s.icon
  const isChecking = checking === cert.id
  const canCheck = true // all active certs can be checked via TLS probe
  const isLive = cert.certbind_status === 'bound'
  const isAlert = ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy','unreachable'].includes(cert.certbind_status)

  const checkedAt = cert.certbind_checked_at
    ? (() => {
        const d = new Date(cert.certbind_checked_at)
        const mins = Math.round((Date.now() - d.getTime()) / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        if (mins < 1440) return `${Math.round(mins/60)}h ago`
        return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
      })()
    : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '16px 1fr auto auto auto',
      alignItems: 'center',
      gap: 16,
      padding: '14px 20px',
      borderRadius: 10,
      background: isAlert ? 'rgba(239,68,68,0.03)' : 'var(--v2-surface)',
      border: `1px solid ${isAlert ? 'rgba(239,68,68,0.15)' : 'rgba(240,237,232,0.06)'}`,
      transition: 'border-color .15s, box-shadow .15s',
      cursor: 'default',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,255,255,0.07)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Status dot */}
      <PulseDot color={s.dot} animate={isLive} />

      {/* Domain + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize:14, color: 'var(--v2-text)', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cert.domain}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {cert.install_method === 'agent' && (
            <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--v2-text-3)' }}>
              <Server size={10} /> VPS Agent
            </span>
          )}
          {cert.install_method === 'cpanel' && (
            <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--v2-text-3)' }}>
              <Globe size={10} /> cPanel
            </span>
          )}
          {!cert.install_method && (
            <span style={{ fontSize:11, color:'#b0a8a0' }}>No agent — TLS only</span>
          )}
          {checkedAt && (
            <span style={{ fontSize:11, color:'#b0a8a0' }}>· {checkedAt}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20,
        background: s.bg, border: `1px solid ${s.border}`,
        fontSize:11, fontWeight: 600, color: s.color,
        whiteSpace: 'nowrap',
      }}>
        {isChecking ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={10} />}
        {isChecking ? 'Checking…' : s.label}
      </div>

      {/* Check button */}
      <button
        onClick={() => canCheck && !isChecking && onCheck(cert)}
        disabled={!canCheck || isChecking}
        title='Run TLS verification check'
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 7,
          background: canCheck && !isChecking ? 'var(--v2-text)' : '#000000',
          color: canCheck && !isChecking ? 'var(--v2-surface)' : 'rgba(240,237,232,0.35)',
          border: 'none', fontWeight: 600, fontSize:11,
          cursor: canCheck && !isChecking ? 'pointer' : 'not-allowed',
          transition: 'all .15s', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if(canCheck && !isChecking) e.currentTarget.style.background = '#222' }}
        onMouseLeave={e => { if(canCheck && !isChecking) e.currentTarget.style.background = 'var(--v2-text)' }}
      >
        <RefreshCw size={10} />
        Run check
      </button>
    </div>
  )
}

export default function CertBind() {
  const [certs, setCerts] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(null)
  const [userId, setUserId] = useState(null)
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
        .select('id,domain,status,install_method,certbind_status,certbind_checked_at,ggs_order_id,issued_at')
        .eq('user_id', uid)
        .eq('status', 'active')
        .neq('status', 'cancelled')
        .order('issued_at', { ascending: false }),
      supabase.from('persistent_agents').select('id,nickname,hostname,status,last_seen_at').eq('user_id', uid),
    ])
    // One row per domain — pick the newest issued_at (same logic as Fleet)
    const domainMap = {}
    for (const c of (certsData || [])) {
      if (!domainMap[c.domain] || new Date(c.issued_at) > new Date(domainMap[c.domain].issued_at)) {
        domainMap[c.domain] = c
      }
    }
    setCerts(Object.values(domainMap))
    setAgents(agentsData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  async function runCheck(cert) {
    setChecking(cert.id)
    try {
      // v10: edge function does TLS probe and returns result immediately
      const d = await callCertBind('request_bind_check', { user_id: userId, cert_id: cert.id })
      // Update cert in local state immediately from response — no need to re-fetch
      if (d.ok && d.binding_status) {
        setCerts(prev => prev.map(c =>
          c.id === cert.id
            ? { ...c, certbind_status: d.binding_status, certbind_checked_at: new Date().toISOString() }
            : c
        ))
      } else {
        // Fallback: reload from DB
        await load(userId)
      }
    } catch { await load(userId) }
    setChecking(null)
  }

  const live    = certs.filter(c => c.certbind_status === 'bound').length
  const alerts  = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy','unreachable'].includes(c.certbind_status)).length
  const unchecked = certs.filter(c => !c.certbind_status).length
  const onlineAgents = agents.filter(a => a.last_seen_at && (Date.now() - new Date(a.last_seen_at).getTime()) < 12 * 60 * 1000).length

  // Sort: alerts first, then unchecked, then live
  const sorted = [...certs].sort((a, b) => {
    const pa = getStatus(a.certbind_status).priority
    const pb = getStatus(b.certbind_status).priority
    return pb - pa
  })

  return (
    <div className="v2-page">
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.2);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 28, animation: 'fadeUp .35s ease both' }}>
          <div>
            <div style={{ fontSize:22, fontWeight: 700, color: 'var(--v2-text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
              Live Certificate Status
            </div>
            <div style={{ fontSize:13, color: 'var(--v2-text-3)' }}>
              Verify your certificates are active on your servers in real-time
            </div>
          </div>
          <button
            onClick={() => userId && load(userId)}
            disabled={loading}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:8,
              background:'var(--v2-surface)', border:'1px solid #e5e7eb',
              color:'var(--v2-text-2)', fontWeight:600, fontSize:12,
              cursor:'pointer', transition:'all .15s', fontFamily:'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background='#000000'}
            onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:24, animation:'fadeUp .35s ease .05s both' }}>
          {[
            { num: certs.length, label: 'Total domains',   color: 'var(--v2-text-2)', bg: 'var(--v2-surface)',           border: 'rgba(240,237,232,0.12)' },
            { num: live,         label: 'Verified live',   color: '#ffffff', bg: 'transparent',        border: 'transparent' },
            { num: alerts,       label: 'Need attention',  color: '#f87171', bg: 'rgba(192,57,43,0.12)',        border: 'rgba(239,68,68,0.08)' },
            { num: unchecked,    label: 'Not checked',     color: 'var(--v2-text-3)', bg: '#000000',        border: 'rgba(240,237,232,0.06)' },
          ].map(({ num, label, color, bg, border }) => (
            <div key={label} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize:26, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-1px' }}>{num}</div>
              <div style={{ fontSize:11, color, opacity: .7, marginTop: 5, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Agent bar */}
        {agents.length > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 14px', borderRadius:8,
            background:'var(--v2-surface)', border:'1px solid #f0f0f0',
            marginBottom:20, animation:'fadeUp .35s ease .1s both',
          }}>
            <PulseDot color={onlineAgents > 0 ? '#f0ede8' : 'rgba(240,237,232,0.35)'} animate={onlineAgents > 0} />
            <span style={{ fontSize:12, color:'var(--v2-text-2)', fontWeight:500 }}>
              {onlineAgents} of {agents.length} agent{agents.length !== 1 ? 's' : ''} online
            </span>
            {agents.slice(0,3).map(a => (
              <span key={a.id} style={{
                fontSize:10, padding:'2px 8px', borderRadius:20,
                background: (Date.now() - new Date(a.last_seen_at).getTime()) < 12*60*1000 ? 'rgba(16,185,129,0.08)' : '#000000',
                color: (Date.now() - new Date(a.last_seen_at).getTime()) < 12*60*1000 ? '#f0ede8' : 'rgba(240,237,232,0.35)',
                border: '1px solid transparent',
                fontWeight: 500,
              }}>
                {a.nickname || a.hostname}
              </span>
            ))}
          </div>
        )}

        {/* Alert banner */}
        {alerts > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'12px 16px', borderRadius:10,
            background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)',
            marginBottom:16, animation:'fadeUp .35s ease .12s both',
          }}>
            <AlertTriangle size={14} color="#c0392b" />
            <span style={{ fontSize:13, color:'#f87171', fontWeight:600 }}>
              {alerts} certificate{alerts !== 1 ? 's' : ''} {alerts === 1 ? 'needs' : 'need'} attention — check the highlighted rows below
            </span>
          </div>
        )}

        {/* Cert table */}
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:8, color:'#b0a8a0', fontSize:13 }}>
            <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Loading certificates…
          </div>
        ) : certs.length === 0 ? (
          <div style={{
            textAlign:'center', padding:'clamp(16px,20vw,60px) 24px',
            background:'var(--v2-surface)', borderRadius:12, border:'1px solid #f0f0f0',
          }}>
            <Shield size={32} color="rgba(192,57,43,0.15)" style={{ marginBottom:12 }} />
            <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text-2)', marginBottom:6 }}>No active certificates</div>
            <div style={{ fontSize:12, color:'#b0a8a0' }}>Issue your first certificate to start monitoring</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {sorted.map((cert, i) => (
              <div key={cert.id} style={{ animation: `fadeUp .3s ease ${.15 + i * .04}s both` }}>
                <CertRow cert={cert} onCheck={runCheck} checking={checking} />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {lastRefresh && !loading && (
          <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#b0a8a0' }}>
            Last refreshed {lastRefresh.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}
