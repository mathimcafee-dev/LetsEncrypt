// BUILD_TIMESTAMP: 1778952426531
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Shield, Plus, RefreshCw, Download, X, Lock, AlertTriangle, CheckCircle,
  Globe, ChevronRight, Copy, Check, Activity, Zap, ArrowRight, Server,
  FileText, Trash2, ShieldOff, ShieldCheck, Clock, RotateCcw, Share2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, format } from 'date-fns'
import '../styles/design-v2.css'
import AgentInstall from '../components/AgentInstall'
import CpanelInstall from '../components/CpanelInstall'
import FleetWidget from '../components/FleetWidget'
import VulnScanner from '../components/VulnScanner'
import MissionControlModal from '../components/MissionControlModal'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}
function statusOf(days, status) {
  if (status === 'revoked') return { cls: 'red',   label: 'Revoked',       dot: 'red'   }
  if (days == null)         return { cls: 'grey',  label: 'Pending',       dot: 'grey'  }
  if (days < 0)             return { cls: 'red',   label: 'Expired',       dot: 'red'   }
  if (days < 14)            return { cls: 'red',   label: days+'d left',   dot: 'red'   }
  if (days < 30)            return { cls: 'amber', label: days+'d left',   dot: 'amber' }
  return                           { cls: 'green', label: days+'d left',   dot: 'green' }
}
function fmtDate(iso) {
  if (!iso) return '—'
  try { return format(new Date(iso), 'MMM d, yyyy') } catch { return '—' }
}
function dl(text, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = filename; a.click()
}

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="v2-btn v2-btn-sm" onClick={() => {
      navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800)
    }}>
      {copied ? <Check size={10}/> : <Copy size={10}/>}
      {copied ? 'Copied' : label}
    </button>
  )
}

function StatusPill({ days, status }) {
  const s = statusOf(days, status)
  const tone = s.cls === 'green' ? 'green' : s.cls === 'amber' ? 'amber' : 'grey'
  return (
    <span className={'v2-status v2-status-'+tone}>
      <span className={'v2-dot v2-dot-'+s.dot}/>
      {s.label}
    </span>
  )
}

function ProgressBar({ days, max = 365 }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(()=>setAnimated(true), 50); return ()=>clearTimeout(t) }, [])
  const pct = days == null ? 0 : Math.max(0, Math.min(100, (days / max) * 100))
  const color = days == null ? '#f0ede8' : days < 0 ? '#f87171' : days < 14 ? '#f87171' : days < 30 ? '#f0ede8' : '#f0ede8'
  return (
    <div style={{ height:4, borderRadius:999, background:'transparent', overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:999, background:color,
        width: animated ? pct+'%' : '0%',
        transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)' }}/>
    </div>
  )
}

function ImportedCertsSection({ certs, onDelete }) {
  const [open, setOpen] = useState(false)
  const sourceLabel = s => ({ digicert:'DigiCert', sectigo:'Sectigo', entrust:'Entrust', globalsign:'GlobalSign' }[s] || s || 'CA Connector')
  const daysLeft = exp => { if (!exp) return null; return Math.floor((new Date(exp) - Date.now()) / 86400000) }
  return (
    <div style={{ marginTop:20, border:'1px solid rgba(192,57,43,0.2)', borderRadius:14, overflow:'hidden', background:'transparent', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', gap:10,
          background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#e8e0d8', textTransform:'uppercase', letterSpacing:'0.5px', flex:1 }}>
          CA Connector — Imported Certificates ({certs.length})
        </span>
        <span style={{ fontSize:10, color:'#b0a8a0', marginRight:4 }}>Tracked only · not managed by SSLVault</span>
        <span style={{ fontSize:12, color:'#b0a8a0' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          {certs.map(c => {
            const d = daysLeft(c.expires_at)
            const isExpired = d == null || d < 0
            const isExpiring = d != null && d >= 0 && d < 30
            const dotColor = isExpired ? '#f87171' : isExpiring ? '#f0ede8' : '#4ade80'
            return (
              <div key={c.id} style={{ padding:'12px 18px', borderTop:'1px solid rgba(192,57,43,0.15)',
                display:'flex', alignItems:'center', gap:12, background:'transparent' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#ff8c7a', display:'flex', alignItems:'center', gap:8 }}>
                    {c.domain}
                    <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4,
                      background:'transparent', color:'#e8e0d8' }}>
                      {sourceLabel(c.source)}
                    </span>
                    {isExpired && <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:'rgba(248,113,113,0.12)', color:'#f87171' }}>EXPIRED</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#b0a8a0', marginTop:2 }}>
                    {c.issuer || c.cert_type || 'Unknown issuer'} ·{' '}
                    {isExpired ? `Expired ${Math.abs(d)}d ago` : `${d}d left`} ·{' '}
                    Expires {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </div>
                </div>
                <button onClick={() => onDelete(c.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#b0a8a0', padding:4,
                    borderRadius:4, transition:'color .15s', fontFamily:'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(240,237,232,0.38)'}
                  title="Remove imported cert">✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DvPendingCard({ order, onRefresh }) {
  const [checking, setChecking] = useState(false)
  const [addingDns, setAddingDns] = useState(false)
  const [msg, setMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef(null)

  // Auto-poll every 30s — no manual click needed
  useEffect(() => {
    let secs = 0
    const tick = setInterval(() => { secs++; setElapsed(secs) }, 1000)

    const doPoll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
          body: JSON.stringify({ action: 'check_status', order_id: order.id })
        })
        const d = await r.json()
        if (d.status === 'active' || d.ggs_status === 'active') {
          clearInterval(tick)
          clearInterval(pollRef.current)
          setMsg('✅ Certificate issued!')
          setTimeout(() => onRefresh(), 1000)
        }
      } catch {}
    }

    // First poll after 15s (DNS TTL), then every 30s
    const firstPoll = setTimeout(() => {
      doPoll()
      pollRef.current = setInterval(doPoll, 30000)
    }, 15000)

    return () => { clearInterval(tick); clearTimeout(firstPoll); clearInterval(pollRef.current) }
  }, [order.id])

  const checkStatus = async () => {
    setChecking(true); setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action: 'check_status', order_id: order.id })
      })
      const d = await r.json()
      if (d.status === 'active' || d.ggs_status === 'active') {
        setMsg('✅ Certificate issued! Refreshing...')
        setTimeout(() => onRefresh(), 1000)
      } else {
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        const elStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
        setMsg(`Status: ${d.ggs_status || 'pending'} — DNS propagating (${elStr} elapsed)`)
      }
    } catch(e) { setMsg('Error: '+e.message) }
    setChecking(false)
  }

  const autoDns = async () => {
    setAddingDns(true); setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(SB_URL+'/functions/v1/dns-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({
          action:    'auto_add',
          user_id:   session.user.id,
          domain:    order.domain,
          txt_name:  order.dcv_txt_name  || order.dcv_cname_name  || order.domain,
          txt_value: order.dcv_txt_value || order.dcv_cname_value,
        })
      })
      const d = await r.json()
      setMsg(d.ok ? '✅ DNS added via '+d.provider+'. Check status in ~1 min.' : '❌ '+d.message)
    } catch(e) { setMsg('Error: '+e.message) }
    setAddingDns(false)
  }

  const hasDcv = !!(order.dcv_txt_value || order.dcv_cname_value)
  const dcvName  = order.dcv_txt_name  || order.dcv_cname_name  || '—'
  const dcvValue = order.dcv_txt_value || order.dcv_cname_value || '—'

  const [dismissing, setDismissing] = useState(false)
  const [confirmDismiss, setConfirmDismiss] = useState(false)

  const dismissOrder = async () => {
    setDismissing(true)
    try {
      // Delete cert_reissues rows linked to this order
      await supabase.from('cert_reissues').delete().eq('user_id', (await supabase.auth.getUser()).data.user.id).or(`ggs_order_id.eq.${order.ggs_order_id},new_ggs_order_id.eq.${order.ggs_order_id}`)
      // Delete the ssl_order itself
      await supabase.from('ssl_orders').delete().eq('id', order.id)
      onRefresh()
    } catch(e) { setMsg('❌ '+e.message) }
    setDismissing(false)
    setConfirmDismiss(false)
  }

  return (
    <div style={{ background:'rgba(248,113,113,0.12)', border:'1px solid #F2C4BC', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Clock size={13} color="#e07060" style={{ flexShrink:0 }}/>
        <span style={{ fontSize:12, fontWeight:700, color:'#ff8c7a' }}>DNS Validation Pending</span>
        <span style={{ fontFamily:'monospace', fontSize:11, color:'#ff8c7a', marginLeft:'auto' }}>GGS #{order.ggs_order_id}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'#ffffff', marginBottom:10, fontFamily:'monospace' }}>{order.domain}</div>
      <div style={{ background:'transparent', borderRadius:8, padding:'10px 14px', marginBottom:10, fontSize:11, fontFamily:'monospace' }}>
        <div style={{ display:'grid', gridTemplateColumns:'60px 1fr auto', gap:'6px 10px', alignItems:'center' }}>
          <span style={{ color:'#e8e0d8', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Name</span>
          <span style={{ color:'#b0a8a0', wordBreak:'break-all' }}>
            {hasDcv ? dcvName : <span style={{ color:'#e8e0d8' }}>⟳ Fetching...</span>}
          </span>
          {hasDcv && <CopyBtn text={dcvName}/>}
          <span style={{ color:'#e8e0d8', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Type</span>
          <span style={{ color:'#ff8c7a' }}>TXT</span><span/>
          <span style={{ color:'#e8e0d8', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Value</span>
          <span style={{ color:'#fbbf24', wordBreak:'break-all' }}>
            {hasDcv ? dcvValue : <span style={{ color:'#e8e0d8' }}>⟳ Fetching...</span>}
          </span>
          {hasDcv && <CopyBtn text={dcvValue}/>}
          <span style={{ color:'#e8e0d8', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>TTL</span>
          <span style={{ color:'#ff8c7a' }}>300</span><span/>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={autoDns} disabled={addingDns || !hasDcv}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', color:'#ff8c7a',
            border:'none', borderRadius:6, padding:'7px 14px', fontSize:11, fontWeight:600,
            cursor: !hasDcv||addingDns ? 'not-allowed':'pointer', opacity: !hasDcv ? 0.4:1, fontFamily:'inherit' }}>
          <Zap size={11}/> {addingDns ? 'Adding...' : 'Auto-Add DNS Record'}
        </button>
        <button onClick={checkStatus} disabled={checking}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent',
            border:'1px solid rgba(240,237,232,0.12)', color:'#ff8c7a', borderRadius:6,
            padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          <RefreshCw size={11} style={{ animation: (checking || elapsed > 0) ? 'spin 0.8s linear infinite':'none' }}/>
          {checking ? 'Checking...' : 'Check Status'}
        </button>
        {!confirmDismiss ? (
          <button onClick={() => setConfirmDismiss(true)}
            style={{ display:'flex', alignItems:'center', gap:5, background:'transparent',
              border:'1px solid #fca5a5', color:'#f87171', borderRadius:6,
              padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
            <X size={11}/> Dismiss
          </button>
        ) : (
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
            <span style={{ fontSize:11, color:'#ff8c7a' }}>Remove from dashboard?</span>
            <button onClick={dismissOrder} disabled={dismissing}
              style={{ background:'#f87171', color:'#ff8c7a', border:'none', borderRadius:6,
                padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {dismissing ? 'Removing...' : 'Yes, remove'}
            </button>
            <button onClick={() => setConfirmDismiss(false)}
              style={{ background:'transparent', color:'#ff8c7a', border:'1px solid rgba(240,237,232,0.12)', borderRadius:6,
                padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        )}
        {msg && <span style={{ fontSize:11, color: msg.startsWith('✅') ? '#f0ede8' : msg.startsWith('❌') ? '#f87171' : '#e07060' }}>{msg}</span>}
      </div>
    </div>
  )
}

// ── Ring gauge that animates on mount ────────────────────────────────────────
// Live countdown: days + hours + minutes + seconds ticking every second
function RingGauge({ days, total, expiresAt, issuedAt }) {
  const [animated, setAnimated] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ d:0, h:0, m:0, s:0 })
  const [entryDone, setEntryDone] = useState(false)  // entry count-up complete

  const d = Math.max(0, days ?? 0)
  // Real total = cert duration in days (issued → expires), fallback 365
  const realTotal = (issuedAt && expiresAt)
    ? Math.ceil((new Date(expiresAt).getTime() - new Date(issuedAt).getTime()) / 86400000)
    : (total ?? 365)
  const pct = Math.min(1, d / (realTotal || 365))
  const r = 30, circ = 2 * Math.PI * r
  const offset = circ - pct * circ
  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const color     = isExpired ? '#f87171' : isWarn ? '#f0ede8' : '#4ade80'

  // Compute live time remaining from expiresAt
  const getRemaining = () => {
    if (!expiresAt) return { d, h:0, m:0, s:0 }
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return { d:0, h:0, m:0, s:0 }
    const totalSecs = Math.floor(ms / 1000)
    const dd = Math.floor(totalSecs / 86400)
    const hh = Math.floor((totalSecs % 86400) / 3600)
    const mm = Math.floor((totalSecs % 3600) / 60)
    const ss = totalSecs % 60
    return { d:dd, h:hh, m:mm, s:ss }
  }

  useEffect(() => {
    // Animate ring draw
    const t1 = setTimeout(() => setAnimated(true), 80)

    // Entry animation: count days up from 0 then start live tick
    let n = 0
    const target = d
    const step = Math.max(1, Math.ceil(target / 35))
    const entry = setInterval(() => {
      n = Math.min(n + step, target)
      setTimeLeft({ d:n, h:0, m:0, s:0 })
      if (n >= target) {
        clearInterval(entry)
        setEntryDone(true)
        // Start live countdown after entry animation
        setTimeLeft(getRemaining())
        const tick = setInterval(() => setTimeLeft(getRemaining()), 1000)
        return () => clearInterval(tick)
      }
    }, 20)

    return () => { clearTimeout(t1); clearInterval(entry) }
  }, [d, expiresAt])

  // Once entry done, keep ticking
  useEffect(() => {
    if (!entryDone || !expiresAt) return
    const tick = setInterval(() => setTimeLeft(getRemaining()), 1000)
    return () => clearInterval(tick)
  }, [entryDone, expiresAt])

  const pad = n => String(n).padStart(2, '0')

  return (
    <div style={{ flexShrink:0 }}>
      {/* Ring */}
      <div style={{ position:'relative', width:82, height:82 }}>
        <svg width="82" height="82" viewBox="0 0 82 82" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="41" cy="41" r={r} fill="none" stroke="rgba(192,57,43,0.08)" strokeWidth="8"/>
          <circle cx="41" cy="41" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={animated ? offset : circ}
            style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)',
              filter: !isExpired && !isWarn ? 'drop-shadow(0 0 4px rgba(22,163,74,0.35))' : 'none' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:18, fontWeight:800, color: isExpired?'#f87171':color,
            fontFamily:'monospace', lineHeight:1, letterSpacing:'-0.5px',
            transition:'all 0.3s' }}>
            {isExpired ? '!' : timeLeft.d}
          </div>
          <div style={{ fontSize:8, color:'#b0a8a0', marginTop:2, letterSpacing:'0.4px', textTransform:'uppercase' }}>
            days
          </div>
        </div>
      </div>
      {/* Live H:M:S ticker below ring — only shown after entry animation */}
      {!isExpired && entryDone && (
        <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:5 }}>
          {[
            { val: pad(timeLeft.h), label:'h' },
            { val: pad(timeLeft.m), label:'m' },
            { val: pad(timeLeft.s), label:'s' },
          ].map(({ val, label }) => (
            <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center',
              background:'transparent', borderRadius:5, padding:'2px 5px', minWidth:28 }}>
              <span style={{ fontSize:11, fontWeight:800, fontFamily:'monospace',
                color: isWarn ? '#f0ede8' : '#f0ede8', lineHeight:1,
                transition:'all 0.3s' }}>{val}</span>
              <span style={{ fontSize:7, color:'#b0a8a0', letterSpacing:'0.3px' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Slim progress bar for timeline ────────────────────────────────────────────
function ValidityTimeline({ issuedAt, expiresAt, orderPeriodMonths = 12 }) {
  // Mirrors RapidSSL's own timeline:
  //   |====== Current cert ======|==== Available (reissue window) ====|
  //   SSL Valid from        SSL Valid till                  Subscription ends
  //   (issuedAt)            (expiresAt / cert end)         (issuedAt + period)
  //
  // The bar spans the full subscription period.
  // Green segment = cert validity (issued → expires).
  // Striped/muted segment = reissue window (cert end → subscription end).
  // "Today" marker moves along the full bar.

  const [animated, setAnimated] = useState(false)
  const now          = new Date()
  const certStart    = new Date(issuedAt)
  const certEnd      = new Date(expiresAt)
  const subEnd       = (() => { const d = new Date(issuedAt); d.setMonth(d.getMonth() + orderPeriodMonths); return d })()

  const totalMs      = subEnd - certStart
  const certPct      = Math.min(100, ((certEnd - certStart) / totalMs) * 100)   // where cert ends on bar
  const todayPct     = Math.max(0, Math.min(100, ((now - certStart) / totalMs) * 100)) // today marker
  const certElapsedPct = Math.max(0, Math.min(certPct, ((now - certStart) / totalMs) * 100)) // green fill

  const dLeft     = Math.max(0, Math.ceil((certEnd - now) / 86400000))
  const isExpired = certEnd <= now
  const isWarn    = dLeft > 0 && dLeft < 30
  const certColor = isExpired ? '#f87171' : isWarn ? '#f0ede8' : '#4ade80'

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }) : '—'
  const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : '—'

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t) }, [])

  return (
    <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(192,57,43,0.15)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px' }}>
          Validity timeline
        </span>
        <span style={{ fontSize:11, fontWeight:600,
          color: isExpired ? '#f87171' : isWarn ? '#f0ede8' : '#4ade80' }}>
          {isExpired
            ? '⚠ Certificate expired'
            : isWarn
            ? `⚠ Expires in ${dLeft} day${dLeft!==1?'s':''}`
            : `Next reissue in ${dLeft} days`}
        </span>
      </div>

      {/* Bar — full subscription width */}
      <div style={{ position:'relative', height:20, borderRadius:6, overflow:'hidden',
        background:'transparent', border:'1px solid rgba(63,185,80,0.2)' }}>

        {/* Green "Current" cert segment */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0,
          width: animated ? certPct+'%' : '0%',
          background: certColor,
          borderRadius:'6px 0 0 6px',
          transition:'width 1.4s cubic-bezier(0.16,1,0.3,1)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {certPct > 20 && (
            <span style={{ fontSize:9, fontWeight:700, color:'#ff8c7a',
              letterSpacing:'0.5px', textShadow:'0 1px 2px rgba(0,0,0,0.2)' }}>
              CURRENT
            </span>
          )}
        </div>

        {/* Striped "Available" reissue window segment */}
        <div style={{ position:'absolute', top:0, bottom:0,
          left: animated ? certPct+'%' : certPct+'%',
          right:0,
          backgroundImage:`repeating-linear-gradient(
            45deg,
            rgba(14,127,192,0.12) 0px,
            rgba(14,127,192,0.12) 6px,
            transparent 6px,
            transparent 12px
          )`,
          borderLeft: '2px solid '+certColor,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {(100 - certPct) > 15 && (
            <span style={{ fontSize:9, fontWeight:700, color:'#ff8c7a',
              letterSpacing:'0.5px' }}>
              AVAILABLE
            </span>
          )}
        </div>

        {/* Today marker */}
        <div style={{ position:'absolute', top:0, bottom:0, width:3,
          left: animated ? `calc(${todayPct}% - 1.5px)` : '0%',
          background:'transparent', borderRadius:2, zIndex:5,
          boxShadow:'0 0 0 1.5px white, 0 1px 4px rgba(0,0,0,0.3)',
          transition:'left 1.4s cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>

      {/* Three date labels below bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(220px,100%),1fr))', marginTop:8 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:'#e8e0d8', fontFamily:'monospace' }}>
            {fmtShort(issuedAt)}
          </div>
          <div style={{ fontSize:9, color:'#b0a8a0', marginTop:2 }}>SSL valid from</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700,
            color: isWarn ? '#f0ede8' : isExpired ? '#f87171' : '#f0ede8',
            fontFamily:'monospace' }}>
            {fmtShort(expiresAt)}
          </div>
          <div style={{ fontSize:9, color:'#b0a8a0', marginTop:2 }}>SSL valid till</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#ff8c7a', fontFamily:'monospace' }}>
            {fmtShort(subEnd)}
          </div>
          <div style={{ fontSize:9, color:'#b0a8a0', marginTop:2 }}>Subscription ends</div>
        </div>
      </div>
    </div>
  )
}

const CertHistory = forwardRef(function CertHistory({ cert, session }, ref) {
  const [history, setHistory] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState('')
  const [tab, setTab]   = useState('reissues')
  const [expanded, setExpanded] = useState({})
  // Step-by-step progress tracker
  const [progress, setProgress] = useState(null)
  // { action, steps: [{label, status, detail, elapsed}], pollTimer, backgroundProcessing }
  // Mission Control modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [modalSerial, setModalSerial] = useState(null)
  const [modalLiveConfirmed, setModalLiveConfirmed] = useState(false)
  // Per-step start timestamps for elapsed time tracking
  const stepStartTimes = useRef({})
  // Probe result: null | 'probing' | { match, live_serial, db_serial, issuer, expires, reachable, note }
  const [modalProbeStatus, setModalProbeStatus] = useState(null)

  useEffect(() => { loadHistory() }, [cert.id])
  // Cleanup poll timer on unmount
  useEffect(() => () => { if (progress?.pollTimer) clearInterval(progress.pollTimer) }, [progress])

  const loadHistory = async () => {
    try {
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action: 'get_history', cert_id: cert.id })
      })
      const d = await r.json()
      if (d.ok) setHistory(d)
    } catch {}
  }

  const updateStep = (steps, idx, patch) => steps.map((s, i) => i === idx ? { ...s, ...patch } : s)

  const callAction = async (action, extra, confirmMsg) => {
    if (!confirm(confirmMsg)) return
    setBusy(true); setMsg('')

    // Build initial steps based on action
    const isReissue = action === 'reissue'
    const initialSteps = isReissue ? [
      { label: 'Submitting reissue to GGS',     status: 'active',  detail: '' },
      { label: 'New CSR generated',              status: 'pending', detail: '' },
      { label: 'DNS TXT record auto-added',      status: 'pending', detail: '' },
      { label: 'GGS validating domain (DCV)',    status: 'pending', detail: '' },
      { label: 'New certificate issued',         status: 'pending', detail: '' },
      { label: 'Dispatching to server',          status: 'pending', detail: '' },
    ] : [
      { label: 'Placing new renewal order',      status: 'active',  detail: '' },
      { label: 'New CSR generated',              status: 'pending', detail: '' },
      { label: 'DNS TXT record auto-added',      status: 'pending', detail: '' },
      { label: 'GGS validating domain (DCV)',    status: 'pending', detail: '' },
      { label: 'New certificate issued',         status: 'pending', detail: '' },
      { label: 'Dispatching to server',          status: 'pending', detail: '' },
    ]
    setProgress({ action, steps: initialSteps, pollTimer: null })
    setModalSerial(null)
    setModalLiveConfirmed(false)
    setModalProbeStatus(null)
    setModalVisible(true)
    stepStartTimes.current = { 0: Date.now() }

    try {
      // Fire the reissue/renew — don't await; GGS can take 60-90s and we don't want to block the UI
      // Instead, start polling ssl_orders immediately so the UI advances in real time
      let fetchDone = false
      let fetchOk = false
      let fetchErr = null
      let fetchData = null

      fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action, cert_id: cert.id, triggered_by: 'manual', ...extra })
      }).then(r => r.json()).then(d => {
        fetchDone = true; fetchData = d
        if (!d.ok) { fetchOk = false; fetchErr = d.error || 'Request failed' }
        else { fetchOk = true }
      }).catch(e => { fetchDone = true; fetchOk = false; fetchErr = e.message })

      // Wait up to 10s for the fetch to return before we start polling
      // (need order_id or ggs_order_id from the response to poll correctly)
      // During this time keep step 0 spinning — that's expected
      await new Promise(resolve => {
        const t = setInterval(() => { if (fetchDone) { clearInterval(t); resolve() } }, 500)
        setTimeout(() => { clearInterval(t); resolve() }, 120000)
      })

      if (!fetchOk) {
        // Special case: reissue blocked because one is already in progress
        const isInProgress = fetchData?.code === 'REISSUE_IN_PROGRESS'
        const errMsg = isInProgress
          ? 'A reissue is already in progress for this certificate. Please wait a few minutes for it to complete, then try again.'
          : fetchErr || (fetchData === null ? 'GGS request timed out — the certificate may still be issuing. Refresh in 2 minutes.' : fetchData?.error || 'Request failed')
        setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, { status: 'error', detail: errMsg }) }))
        setMsg(''); setBusy(false); return
      }
      const d = fetchData

      // Steps 0→1→2 done from API response
      // For renew, store the new GGS order ID so we poll the right order
      const newGgsOrderId = d.ggs_order_id || null
      setProgress(p => {
        let steps = [...p.steps]
        const now = Date.now()
        steps = updateStep(steps, 0, {
          status: 'done',
          detail: isReissue
            ? `GGS order #${cert.ggs_order_id}`
            : `New GGS order #${newGgsOrderId || '—'} placed`,
          elapsed: stepStartTimes.current[0] ? now - stepStartTimes.current[0] : null,
        })
        stepStartTimes.current[1] = now
        steps = updateStep(steps, 1, { status: 'done', detail: 'RSA-2048 key pair generated', elapsed: 80 })
        stepStartTimes.current[2] = now
        if (d.dcv_txt_value) {
          steps = updateStep(steps, 2, { status: 'done', detail: `${d.dcv_txt_name || '_pki-validation'} → ${d.dcv_txt_value.slice(0,24)}…`, elapsed: 120 })
        } else {
          steps = updateStep(steps, 2, { status: 'done', detail: 'TXT record updated in DNS', elapsed: 120 })
        }
        stepStartTimes.current[3] = now
        steps = updateStep(steps, 3, { status: 'active', detail: 'Waiting for GGS to confirm DCV…' })
        return { ...p, steps, newGgsOrderId }
      })

      // If instantly active (unlikely but possible)
      if (d.status === 'active') {
        setProgress(p => {
          let steps = [...p.steps]
          steps = updateStep(steps, 3, { status: 'done', detail: 'DCV passed' })
          steps = updateStep(steps, 4, { status: 'done', detail: `Expires ${d.new_expiry || '199 days'}` })
          steps = updateStep(steps, 5, { status: cert.install_method === 'agent' ? 'done' : cert.install_method === 'cpanel' ? 'done' : 'skipped', detail: cert.install_method === 'agent' ? 'Install job queued for VPS agent' : cert.install_method === 'cpanel' ? 'Install job queued for cPanel' : 'No server connected — update manually (Vercel/other)' })
          return { ...p, steps }
        })
        loadHistory(); setBusy(false); return
      }

      // Poll ssl_orders for this cert every 5 seconds until active
      // Reissue: same ggs_order_id (updated in place) — poll by cert.ggs_order_id
      // Renew: new ggs_order_id returned in d.ggs_order_id — poll by that
      const pollGgsOrderId = isReissue ? cert.ggs_order_id : (newGgsOrderId || null)
      const pollStart = Date.now()
      let lastGgsCheck = 0
      const timer = setInterval(async () => {
        try {
          // Every 30s: actively call check_status to force GGS→DB sync
          if (Date.now() - lastGgsCheck >= 30000) {
            lastGgsCheck = Date.now()
            try {
              // Get the ssl_orders row ID to pass to check_status
              const { data: chkOrder } = await supabase
                .from('ssl_orders')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('ggs_order_id', pollGgsOrderId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()
              if (chkOrder?.id) {
                await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
                  body: JSON.stringify({ action: 'check_status', order_id: chkOrder.id })
                })
              }
            } catch {}
          }

          // Poll ssl_orders by ggs_order_id — works for both reissue and renewal
          let latest = null
          if (pollGgsOrderId) {
            const { data: orders } = await supabase
              .from('ssl_orders')
              .select('id, status, ggs_order_id, valid_till')
              .eq('user_id', session.user.id)
              .eq('ggs_order_id', pollGgsOrderId)
              .order('updated_at', { ascending: false })
              .limit(1)
            latest = orders?.[0]
          } else {
            // Fallback: poll by domain latest
            const { data: orders } = await supabase
              .from('ssl_orders')
              .select('id, status, ggs_order_id, valid_till')
              .eq('user_id', session.user.id)
              .eq('domain', cert.domain)
              .order('created_at', { ascending: false })
              .limit(1)
            latest = orders?.[0]
          }

          // Timeout after 8 minutes — GGS DNS validation can take up to 5 mins
          if (Date.now() - pollStart > 8 * 60 * 1000) {
            clearInterval(timer)
            setProgress(p => ({
              ...p, pollTimer: null,
              steps: updateStep(p.steps, 3, {
                status: 'active',
                detail: 'GGS DNS validation is taking longer than usual. The certificate will issue automatically in the background — check back in a few minutes.'
              })
            }))
            // Show a background processing note at the bottom
            setProgress(p => ({ ...p, backgroundProcessing: true }))
            setBusy(false)
            return
          }

          if (latest?.status === 'active' || latest?.status === 'issued') {
            clearInterval(timer)
            const dcvElapsed = stepStartTimes.current[3] ? Date.now() - stepStartTimes.current[3] : null
            const certIssueStart = Date.now()
            setProgress(p => {
              let steps = [...p.steps]
              steps = updateStep(steps, 3, { status: 'done', detail: 'DCV passed ✓', elapsed: dcvElapsed })
              steps = updateStep(steps, 4, { status: 'done', detail: latest.valid_till ? `Expires ${new Date(latest.valid_till).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}` : 'Certificate active', elapsed: 200 })
              steps = updateStep(steps, 5, { status: 'active', detail: 'Dispatching to your server…' })
              return { ...p, pollTimer: null, steps }
            })
            // ── Failproof install dispatch ──────────────────────────────────
            setTimeout(async () => {
              let method = null
              let dispatchCertId = cert.id
              let installOk = false
              let installDetail = ''
              let serialNumber = null

              // Resolve cert id, method, serial
              try {
                if (!isReissue && newGgsOrderId) {
                  const { data: newCert } = await supabase
                    .from('certificates')
                    .select('id, install_method, serial_number')
                    .eq('user_id', session.user.id)
                    .eq('ggs_order_id', newGgsOrderId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                  method = newCert?.[0]?.install_method
                  serialNumber = newCert?.[0]?.serial_number || null
                  if (newCert?.[0]?.id) dispatchCertId = newCert[0].id
                } else {
                  // Reissue: same cert.id, updated in place by poll_pending
                  // Poll until updated_at changes (poll_pending writes new cert_pem + serial)
                  const oldUpdatedAt = cert.updated_at || null
                  let certRow = null
                  for (let attempt = 0; attempt < 12; attempt++) {
                    const { data: row } = await supabase
                      .from('certificates')
                      .select('id, install_method, serial_number, updated_at')
                      .eq('id', cert.id)
                      .single()
                    certRow = row
                    if (row?.updated_at && row.updated_at !== oldUpdatedAt) break
                    if (attempt < 11) await new Promise(r => setTimeout(r, 5000))
                  }
                  method = certRow?.install_method
                  serialNumber = certRow?.serial_number || null
                  dispatchCertId = certRow?.id || cert.id
                }
              } catch(e) { console.warn('Failed to resolve cert/method:', e) }

              // ── cPanel: direct edge function call (credentials already saved) ──
              if (method === 'cpanel') {
                try {
                  const { data: creds } = await supabase
                    .from('server_credentials')
                    .select('id')
                    .eq('server_type', 'cpanel')
                    .contains('domains', [cert.domain])
                    .limit(1)
                  const credId = creds?.[0]?.id
                  if (!credId) {
                    installDetail = '⚠️ No cPanel credential found — go to Install tab to add one'
                  } else {
                    const cpRes = await fetch(SB_URL + '/functions/v1/cpanel-install', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
                      body: JSON.stringify({ action: 'install', cert_id: dispatchCertId, domain: cert.domain, credential_id: credId }),
                    })
                    const cpData = await cpRes.json().catch(() => ({}))
                    if (cpData.ok) {
                      installOk = true
                      installDetail = '🌐 Installed on cPanel — confirmed'
                      if (cpData.serial) setModalSerial(cpData.serial)
                      setModalLiveConfirmed(true)
                    } else {
                      installDetail = `⚠️ ${cpData.error || 'cPanel install failed'} — cert issued, install manually`
                    }
                  }
                } catch(cpErr) {
                  installDetail = `⚠️ cPanel dispatch error — cert issued, install manually`
                }
              // ── VPS agent: queue job, agent picks up within 5 min ────────────
              } else if (method === 'agent') {
                try {
                  const { data: serverRows } = await supabase
                    .from('server_credentials')
                    .select('id, agent_id')
                    .contains('domains', [cert.domain])
                    .not('agent_id', 'is', null)
                  for (const row of (serverRows || [])) {
                    const { data: existing } = await supabase
                      .from('agent_jobs').select('id')
                      .eq('agent_id', row.agent_id).eq('cert_id', dispatchCertId)
                      .in('status', ['queued', 'claimed']).maybeSingle()
                    if (!existing) {
                      const { data: certData } = await supabase.from('certificates').select('cert_pem, ca_pem, keylocker_key_id').eq('id', dispatchCertId).single()
                      // Note: keylocker_keys stores AES-encrypted key material, never plain text.
                      // The agent daemon fetches the key itself via keylocker edge fn at execution time.
                      // We pass cert_pem and keylocker_key_id so the agent has everything it needs.
                      await supabase.from('agent_jobs').insert({
                        agent_id: row.agent_id, user_id: session.user.id, cert_id: dispatchCertId,
                        job_type: isReissue ? 'reissue' : 'renew', status: 'queued',
                        cert_pem: certData?.cert_pem || '', key_pem: '',
                        domain: cert.domain,
                      })
                    }
                  }
                  installOk = true
                  installDetail = '🖥 Install job queued — VPS agent will apply within 5 min'
                } catch(agentErr) {
                  installDetail = `⚠️ Failed to queue agent job: ${agentErr.message}`
                }
              } else {
                installDetail = 'No server connected — go to Install tab to set one up'
              }

              const dispatchElapsed = Date.now() - certIssueStart
              setProgress(p => {
                let steps = updateStep(p.steps, 5, {
                  status: 'done',
                  detail: installDetail,
                  elapsed: dispatchElapsed,
                })
                return { ...p, steps }
              })
              loadHistory()
              setBusy(false)

              // ── Re-fetch serial from DB after install ─────────────────────
              // The serial shown in the success modal must be the LATEST cert
              // from DB — poll_pending may have just updated it.
              // We query by domain + user + most recent, not by cert.id,
              // because for reissues the cert row's serial_number gets updated
              // by poll_pending after the new cert is issued by GGS.
              try {
                const { data: freshCert } = await supabase
                  .from('certificates')
                  .select('serial_number, cert_pem')
                  .eq('user_id', session.user.id)
                  .eq('domain', cert.domain)
                  .eq('status', 'active')
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .single()
                if (freshCert?.serial_number) {
                  setModalSerial(freshCert.serial_number)
                }
              } catch(e) { console.warn('Serial re-fetch failed:', e) }

              // ── Live TLS probe — real serial + HTTPS verification ──────────
              // For cPanel: small delay for install to apply
              // For agent: longer wait
              // For no server / always: still probe to verify cert was issued
              const probeDelay = method === 'agent' ? 30000 : method === 'cpanel' ? 6000 : 2000
              setModalProbeStatus('probing')
              setTimeout(async () => {
                try {
                  const probeRes = await fetch(SB_URL + '/functions/v1/cert-probe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
                    body: JSON.stringify({ domain: cert.domain, cert_id: dispatchCertId }),
                  })
                  const probeData = await probeRes.json().catch(() => ({ ok: false, error: 'Parse failed' }))
                  setModalProbeStatus(probeData)
                  if (probeData.ok && probeData.live_confirmed) {
                    setModalLiveConfirmed(true)
                  }
                  if (probeData.cert?.serial || probeData.serial) {
                    setModalSerial(probeData.cert?.serial || probeData.serial)
                  }
                } catch(pe) {
                  setModalProbeStatus({ ok: false, error: pe.message })
                }
              }, probeDelay)
            }, 2000)
          } else if (latest?.status === 'dv_pending') {
            const elapsed = Math.round((Date.now() - pollStart) / 1000)
            const mins = Math.floor(elapsed / 60)
            const secs = elapsed % 60
            const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
            setProgress(p => ({
              ...p,
              steps: updateStep(p.steps, 3, {
                status: 'active',
                detail: `Waiting for GGS DNS check… ${elapsedStr} elapsed`
              })
            }))
          }
        } catch {}
      }, 2000)

      setProgress(p => ({ ...p, pollTimer: timer }))

    } catch(e) {
      setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, { status: 'error', detail: e.message }) }))
      setBusy(false)
    }
  }

  const reissues = history?.reissues || []
  const renewals = history?.renewals || []

  useImperativeHandle(ref, () => ({
    doAction: (action) => {
      const msgs = {
        reissue: 'Reissue this certificate? A new cert will be issued on the existing GGS order and auto-installed.',
        renew:   'Renew for another year? A brand new GGS order will be placed for a new 12-month period.',
      }
      callAction(action, action==='renew'?{period:12}:{}, msgs[action]||'Confirm?')
    }
  }), [busy])

  const statusBadge = (s) => {
    const map = {
      issued:   { bg:'rgba(39,174,96,0.12)', color:'#4ade80', label:'Issued' },
      active:   { bg:'rgba(39,174,96,0.12)', color:'#4ade80', label:'Active' },
      installed:{ bg:'rgba(39,174,96,0.12)', color:'#4ade80', label:'Installed' },
      pending:  { bg:'rgba(230,126,34,0.1)', color:'#c0392b', label:'Pending DV' },
      pending_validation: { bg:'rgba(230,126,34,0.1)', color:'#c0392b', label:'Pending DV' },
      failed:   { bg:'rgba(248,113,113,0.12)', color:'#f87171', label:'Failed' },
    }
    const t = map[s] || { bg:'#f0ede8', color:'#e8e0d8', label: s||'—' }
    return <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:t.bg, color:t.color }}>{t.label}</span>
  }

  const triggeredLabel = (t) => {
    if (!t) return 'Manual'
    if (t.includes('cron')) return '🤖 Auto (cron)'
    if (t.includes('auto')) return '🤖 Auto'
    return '👤 Manual'
  }

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  // Step status icon
  const stepIcon = (status) => {
    if (status === 'done')    return <span style={{color:'#ff8c7a',fontWeight:700}}>✓</span>
    if (status === 'error')   return <span style={{color:'#f87171',fontWeight:700}}>✗</span>
    if (status === 'active')  return <span style={{display:'inline-block',width:12,height:12,borderRadius:'50%',border:'2px solid #c0392b',borderTopColor:'transparent',animation:'spin .7s linear infinite',verticalAlign:'middle'}}/>
    return <span style={{color:'rgba(30,0,0,0.5)',fontWeight:700}}>○</span>
  }

  return (
    <div style={{ marginTop:4 }}>
      {/* Mission Control Modal — renders as full overlay */}
      <MissionControlModal
        visible={modalVisible}
        action={progress?.action || 'reissue'}
        domain={cert.domain}
        steps={progress?.steps || []}
        busy={busy}
        backgroundProcessing={progress?.backgroundProcessing || false}
        serial={modalSerial}
        liveConfirmed={modalLiveConfirmed}
        probeStatus={modalProbeStatus}
        onDismiss={() => { setModalVisible(false); setProgress(null) }}
        onViewCert={() => { setModalVisible(false); setProgress(null); setTab('reissues') }}
      />

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.1)', marginBottom:14 }}>
        {[['reissues','Reissue History'], ['renewals','Renewals']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontSize:11, fontWeight:500, padding:'5px 14px', border:'none', background:'none',
            cursor:'pointer', fontFamily:'inherit',
            color: tab===k ? '#f0ede8' : 'var(--v2-text-3)',
            borderBottom: tab===k ? '2px solid #c0392b' : '2px solid transparent',
            marginBottom:-1
          }}>
            {l}
            {k==='reissues' && reissues.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? 'rgba(192,57,43,0.15)' : 'transparent', color: tab===k ? '#f0ede8' : 'rgba(240,237,232,0.5)' }}>
                {reissues.length}
              </span>
            )}
            {k==='renewals' && renewals.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? 'rgba(192,57,43,0.15)' : 'transparent', color: tab===k ? '#f0ede8' : 'rgba(240,237,232,0.5)' }}>
                {renewals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── REISSUE HISTORY ── */}
      {tab==='reissues' && (
        <div>
          {reissues.length === 0 ? (
            <div style={{ fontSize:12, color:'#b0a8a0', padding:'12px 0', textAlign:'center' }}>
              No reissues yet. Use the Reissue button above to regenerate this certificate.
            </div>
          ) : reissues.map((r, i) => (
            <div key={r.id} style={{ border:'1px solid var(--v2-border)', borderRadius:8, marginBottom:8, overflow:'hidden' }}>
              {/* Row header — always visible */}
              <div onClick={() => toggleExpand(r.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                  background: expanded[r.id] ? 'var(--v2-surface-2)' : '#000000',
                  cursor:'pointer', userSelect:'none' }}>
                {/* Reissue number badge */}
                <div style={{ width:26, height:26, borderRadius:6, background:'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#ff8c7a' }}>R{i+1}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', display:'flex', alignItems:'center', gap:8 }}>
                    Reissue #{r.reissue_number||i+1}
                    {statusBadge(r.status)}
                  </div>
                  <div style={{ fontSize:11, color:'#b0a8a0', marginTop:2 }}>
                    {fmtDate(r.created_at)} · {triggeredLabel(r.triggered_by)}
                    {r.expires_at && <span> · Expires {fmtDate(r.expires_at)}</span>}
                  </div>
                </div>
                <ChevronRight size={14} color="var(--v2-text-3)"
                  style={{ transform: expanded[r.id] ? 'rotate(90deg)' : 'none', transition:'transform .15s', flexShrink:0 }}/>
              </div>

              {/* Expanded details */}
              {expanded[r.id] && (
                <div style={{ borderTop:'1px solid var(--v2-border)', padding:'12px 14px', background:'var(--v2-surface)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:'8px 16px', marginBottom:12 }}>
                    {[
                      ['Reissue #',     r.reissue_number||i+1],
                      ['Triggered by',  triggeredLabel(r.triggered_by)],
                      ['Status',        r.status||'—'],
                      ['Date',          fmtDate(r.created_at)],
                      ['GGS Order',     r.ggs_order_id ? '#'+r.ggs_order_id : '—'],
                      ['Install status', r.install_status||'—'],
                      ['Install method', r.install_method||'—'],
                      ['Installed at',   r.installed_at ? fmtDate(r.installed_at) : '—'],
                      ['Valid from',     r.issued_at  ? fmtDate(r.issued_at)  : '—'],
                      ['Valid until',    r.expires_at ? fmtDate(r.expires_at) : '—'],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize:10, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:12, color:'#ffffff', fontFamily: label==='GGS Order' ? 'monospace' : 'inherit' }}>{String(val)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Cert PEM preview */}
                  {r.cert_pem && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>Reissued Certificate PEM</div>
                      <div style={{ background:'transparent', borderRadius:6, padding:'10px 12px', position:'relative' }}>
                        <pre style={{ fontSize:10, color:'#b0a8a0', margin:0, overflow:'hidden', maxHeight:80, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                          {r.cert_pem.slice(0,300)}...
                        </pre>
                        <CopyBtn text={r.cert_pem} label="Copy PEM"/>
                      </div>
                    </div>
                  )}

                  {/* Auto-install details */}
                  {(r.auto_install_status || r.auto_install_error) && (
                    <div style={{ marginTop:10, padding:'8px 10px', borderRadius:6,
                      background: r.auto_install_status==='success' ? 'transparent' : 'rgba(248,113,113,0.12)',
                      border: '1px solid '+(r.auto_install_status==='success' ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)') }}>
                      <div style={{ fontSize:11, fontWeight:600, color: r.auto_install_status==='success' ? '#4ade80' : '#f87171' }}>
                        Auto-install: {r.auto_install_status}
                      </div>
                      {r.auto_install_error && <div style={{ fontSize:11, color:'#f87171', marginTop:2 }}>{r.auto_install_error}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── RENEWALS ── */}
      {tab==='renewals' && (
        <div>
          {renewals.length === 0 ? (
            <div style={{ fontSize:12, color:'#b0a8a0', padding:'12px 0', textAlign:'center' }}>
              No renewals yet. Use the Renew button to place a new 12-month order.
            </div>
          ) : renewals.map(r => (
            <div key={r.id} style={{ padding:'10px 14px', borderRadius:8, marginBottom:8,
              background:'var(--v2-surface)', border:'1px solid var(--v2-border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#ffffff' }}>
                  Renewal · GGS #{r.ggs_order_id||'—'}
                </div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4,
                  background: r.status==='active' ? 'rgba(74,222,128,0.12)' : 'transparent',
                  color: r.status==='active' ? '#4ade80' : 'rgba(240,237,232,0.7)' }}>{r.status}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:'4px 12px' }}>
                {[
                  ['Created',    fmtDate(r.created_at)],
                  ['Valid from', r.issued_at  ? fmtDate(r.issued_at)  : '—'],
                  ['Expires',    r.expires_at ? fmtDate(r.expires_at) : '—'],
                  ['Version',    'v'+(r.cert_version||'—')],
                ].map(([l,v]) => (
                  <div key={l}>
                    <span style={{ fontSize:10, color:'#b0a8a0' }}>{l}: </span>
                    <span style={{ fontSize:11, fontWeight:500, color:'#ffffff' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})




// ── Scan PQC button with loading + result toast ───────────────────────
function ScanPqcButton({ onDone }) {
  const [scanning, setScanning] = useState(false)
  const [result,   setResult]   = useState(null)  // {ok, scanned, results}

  const run = async () => {
    setScanning(true); setResult(null)
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { setScanning(false); return }
    try {
      const r = await fetch(SB_URL+'/functions/v1/tls-posture', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
        body: JSON.stringify({ action:'pqc_check_all' })
      })
      const d = await r.json()
      setResult(d)
      if (d.ok) onDone()
    } catch(e) {
      setResult({ ok:false, error: e.message })
    }
    setScanning(false)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button onClick={run} disabled={scanning}
        style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', color:'#ff8c7a',
          border:'none', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:600,
          cursor:scanning?'wait':'pointer', fontFamily:'inherit', opacity:scanning?0.8:1 }}>
        {scanning
          ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Scanning…</>
          : <><Shield size={11}/> Scan PQC</>}
      </button>
      {result && (
        <span style={{ fontSize:11, color: result.ok ? '#4ade80' : '#f87171',
          background: result.ok ? 'transparent' : 'rgba(192,57,43,0.12)',
          border: `0.5px solid ${result.ok ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}`,
          borderRadius:5, padding:'3px 8px' }}>
          {result.ok ? `✓ ${result.scanned} cert${result.scanned!==1?'s':''} scanned` : `✗ ${result.error||'Failed'}`}
        </span>
      )}
    </div>
  )
}

// ── PQC Readiness row ─────────────────────────────────────────────────
const PQC_RISK_MAP = {
  ready:  { color:'#4ade80', bg:'transparent', border:'rgba(192,57,43,0.3)', label:'PQC Ready',     icon:'✓' },
  low:    { color:'#ff8c7a', bg:'transparent', border:'rgba(192,57,43,0.3)', label:'Low risk',       icon:'~' },
  medium: { color:'#ff8c7a', bg:'rgba(248,113,113,0.12)', border:'rgba(192,57,43,0.25)', label:'Medium risk',    icon:'!' },
  high:   { color:'#f87171', bg:'rgba(192,57,43,0.12)', border:'rgba(192,57,43,0.25)', label:'High risk',      icon:'✗' },
}

function PqcRow({ cert, onRefresh }) {
  const [open,     setOpen]     = useState(false)
  const [checking, setChecking] = useState(false)
  const [result,   setResult]   = useState(null)

  const risk = cert.pqc_risk
  const rm = PQC_RISK_MAP[risk] || null

  const runCheck = async (e) => {
    e.stopPropagation()
    if (!cert.cert_pem) return
    setChecking(true)
    const { data:{ session } } = await supabase.auth.getSession()
    const r = await fetch(SB_URL+'/functions/v1/tls-posture', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
      body: JSON.stringify({ action:'pqc_check', cert_id:cert.id })
    })
    const d = await r.json()
    if (d.ok) {
      setResult(d)
      setOpen(true)
      setTimeout(()=>onRefresh(), 800)
    }
    setChecking(false)
  }

  const noPem = !cert.cert_pem

  return (
    <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
      <div onClick={()=>risk&&setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 14px', background:'var(--v2-bg)',
          cursor: risk ? 'pointer' : 'default', transition:'background .15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.12)'}
        onMouseLeave={e=>e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(248,113,113,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={16} color="#e07060"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'#ffffff' }}>
              Post-quantum readiness
            </div>
            <div style={{ fontSize:11, color:'#b0a8a0', marginTop:1 }}>
              {cert.key_algorithm
                ? <span>Algorithm: <strong style={{color:'#ffffff'}}>{cert.key_algorithm}</strong>{risk && <span> · click to {open?'collapse':'expand'}</span>}</span>
                : noPem ? 'No cert PEM available — import or sync from CA first'
                : 'Check what quantum threat this certificate faces'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {rm && (
            <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:5,
              background:rm.bg, color:rm.color, border:`0.5px solid ${rm.border}` }}>
              {rm.label}
            </span>
          )}
          {!noPem && (
            <button onClick={runCheck} disabled={checking}
              style={{ display:'flex', alignItems:'center', gap:4, fontSize:11,
                color:'#ff8c7a', background:'rgba(248,113,113,0.12)', border:'0.5px solid #F2C4BC',
                borderRadius:6, padding:'4px 10px', cursor:checking?'wait':'pointer',
                fontFamily:'inherit', fontWeight:500, flexShrink:0 }}>
              {checking
                ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Checking…</>
                : <><Shield size={11}/> {risk ? 'Re-check' : 'Check'}</>}
            </button>
          )}
        </div>
      </div>

      {open && (result || risk) && (
        <div style={{ borderTop:'0.5px solid var(--v2-border)', background:'var(--v2-surface-3)', padding:'14px' }}>
          {(() => {
            const d = result || {
              algorithm:cert.key_algorithm, bits:cert.key_size_bits,
              risk:cert.pqc_risk, label:rm?.label,
              reason:'', deadline:'', action:''
            }
            const riskDef = PQC_RISK_MAP[d.risk] || PQC_RISK_MAP.medium
            return (
              <div>
                {/* Risk meter */}
                <div style={{ display:'flex', gap:4, marginBottom:14 }}>
                  {['ready','low','medium','high'].map(r=>{
                    const def = PQC_RISK_MAP[r]
                    const active = d.risk === r
                    return (
                      <div key={r} style={{ flex:1, height:6, borderRadius:3,
                        background: active ? def.color : 'var(--v2-border)',
                        transition:'background .3s' }}/>
                    )
                  })}
                </div>

                {/* Algorithm info */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:8, marginBottom:12 }}>
                  {[
                    ['Algorithm',  d.algorithm || '—'],
                    ['Key size',   d.bits ? `${d.bits} bits` : '—'],
                    ['Risk level', d.label || '—'],
                    ['Deadline',   d.deadline || '—'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:'var(--v2-bg)', borderRadius:7, padding:'9px 11px', border:'0.5px solid var(--v2-border)' }}>
                      <div style={{ fontSize:10, color:'#b0a8a0', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:500, color: k==='Risk level'?riskDef.color:'#ffffff',
                        fontFamily: k==='Algorithm'||k==='Key size' ? 'monospace' : 'inherit' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Reason + action */}
                {d.reason && (
                  <div style={{ background: riskDef.bg, border:`0.5px solid ${riskDef.border}`,
                    borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:riskDef.color, marginBottom:4 }}>{d.reason}</div>
                    {d.action && <div style={{ fontSize:11, color:riskDef.color, opacity:0.85, lineHeight:1.6 }}>{d.action}</div>}
                  </div>
                )}

                {/* NIST context */}
                <div style={{ fontSize:11, color:'#b0a8a0', lineHeight:1.6, borderTop:'0.5px solid var(--v2-border)', paddingTop:10, marginTop:4 }}>
                  NIST finalized ML-DSA (CRYSTALS-Dilithium), SLH-DSA (SPHINCS+), and ML-KEM (CRYSTALS-Kyber) in August 2024.
                  RSA and ECDSA will be deprecated for sensitive data by 2030–2035.{' '}
                  <span style={{ color:'#ff8c7a', cursor:'pointer' }}
                    onClick={()=>window.open('https://csrc.nist.gov/projects/post-quantum-cryptography','_blank')}>
                    NIST PQC standards ↗
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── TLS Posture inline row with expandable results ────────────────────────
function TlsPostureRow({ cert, onRefresh }) {
  const [open,     setOpen]     = useState(false)
  const [checking, setChecking] = useState(false)
  const [result,   setResult]   = useState(cert.tls_details || null)

  const gradeColor = { A:'#4ade80', B:'#65a30d', C:'#f0ede8', D:'#c0392b', F:'#f87171' }
  const grade = cert.tls_grade
  const score = cert.tls_score || 0
  const color = gradeColor[grade] || 'rgba(240,237,232,0.7)'

  const runCheck = async (e) => {
    e.stopPropagation()
    setChecking(true)
    const { data:{ session } } = await supabase.auth.getSession()
    const r = await fetch(SB_URL+'/functions/v1/tls-posture', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
      body: JSON.stringify({ action:'check', domain:cert.domain, cert_id:cert.id })
    })
    const d = await r.json()
    if (d.ok) {
      setResult(d.checks)
      setOpen(true)
      setTimeout(() => onRefresh(), 800)
    }
    setChecking(false)
  }

  const checkLabels = {
    https_accessible: 'HTTPS accessible',
    hsts:             'HSTS header',
    security_headers: 'Security headers',
    https_redirect:   'HTTPS served',
    cert_validity:    'Certificate validity',
    trusted_ca:       'Trusted CA',
  }

  return (
    <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
      {/* Header row — always visible */}
      <div onClick={() => grade && setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 14px', background:'var(--v2-bg)',
          cursor: grade ? 'pointer' : 'default',
          transition:'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background='transparent'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Activity size={16} color="#c0392b"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'#ffffff' }}>Check TLS posture</div>
            <div style={{ fontSize:11, color:'#b0a8a0', marginTop:1 }}>
              {grade
                ? <span>Last grade: <span style={{ color, fontWeight:600 }}>{grade}</span> · {score}% · click to {open?'collapse':'expand'}</span>
                : 'Grade this domain A–F on HTTPS, HSTS, chain & more'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {grade && (
            <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700,
              color, background:color+'18', padding:'3px 8px', borderRadius:5,
              border:`0.5px solid ${color}40` }}>{grade}</span>
          )}
          <button onClick={runCheck} disabled={checking}
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11,
              color:'#ff8c7a', background:'transparent', border:'1px solid rgba(63,185,80,0.2)',
              borderRadius:6, padding:'4px 10px', cursor:checking?'wait':'pointer',
              fontFamily:'inherit', fontWeight:500, flexShrink:0 }}>
            {checking
              ? <><RefreshCw size={11} style={{ animation:'spin .8s linear infinite' }}/> Checking…</>
              : <><Activity size={11}/> {grade ? 'Re-check' : 'Run check'}</>}
          </button>
        </div>
      </div>

      {/* Expandable results */}
      {open && result && (
        <div style={{ borderTop:'0.5px solid var(--v2-border)', background:'var(--v2-surface-3)',
          padding:'12px 14px' }}>
          {/* Score bar */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:500, color:'#e8e0d8' }}>Overall score</span>
              <span style={{ fontSize:11, fontWeight:700, color }}>{score}%</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:'var(--v2-border)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:color,
                width:`${score}%`, transition:'width .6s cubic-bezier(.16,1,.3,1)' }}/>
            </div>
          </div>
          {/* Individual checks */}
          {Object.entries(result).map(([key, check]) => (
            <div key={key} style={{ display:'flex', alignItems:'flex-start', gap:10,
              padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}
              className="tls-check-row">
              <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1,
                background: check.pass ? 'transparent' : 'rgba(192,57,43,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {check.pass
                  ? <Check size={10} color="#16a34a"/>
                  : <X size={10} color="#c0392b"/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500,
                  color: check.pass ? 'var(--v2-text)' : '#f87171' }}>
                  {checkLabels[key] || key.replace(/_/g,' ')}
                  {check.points > 0 && (
                    <span style={{ fontSize:10, fontWeight:400, color:'#b0a8a0',
                      marginLeft:6 }}>+{check.points}pts</span>
                  )}
                </div>
                <div style={{ fontSize:11, color:'#b0a8a0', marginTop:1, lineHeight:1.5 }}>
                  {check.detail}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:11, color:'#b0a8a0', lineHeight:1.6 }}>
            Checks: HTTPS accessibility, HSTS header strength, security headers, certificate validity, and trusted CA verification.
          </div>
        </div>
      )}
    </div>
  )
}

function CertDetail({ cert, onClose, onDelete, onInstall, onCpanel, nav, onRefresh, session }) {
  const days = daysLeft(cert.expires_at)
  const certHistoryRef = useRef(null)

  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [delConfirm, setDel]        = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling]       = useState(false)
  const [cancelMsg, setCancelMsg]         = useState('')
  const [activeSection, setActiveSection] = useState('details') // details | files | history | security

  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const statusColor = isExpired ? '#f87171' : isWarn ? '#f0ede8' : '#4ade80'

  const daysSinceIssue = cert.issued_at
    ? Math.floor((Date.now() - new Date(cert.issued_at).getTime()) / 86400000)
    : 999
  const canCancel = daysSinceIssue <= 30 && cert.status === 'active' && !!cert.ggs_order_id

  const doRefresh = async () => {
    setRefreshing(true); setRefreshMsg('')
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const { data: order } = await supabase.from('ssl_orders')
        .select('id').eq('ggs_order_id', cert.ggs_order_id).eq('user_id', cert.user_id)
        .order('updated_at', { ascending: false }).limit(1).single()
      if (!order) { setRefreshMsg('No linked order found'); setRefreshing(false); return }
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+sess.access_token },
        body: JSON.stringify({ action: 'check_status', order_id: order.id })
      })
      const d = await r.json()
      setRefreshMsg(d.ok ? '✓ Synced from RapidSSL' : d.error || 'Error')
      if (d.ok) setTimeout(() => onRefresh(), 800)
    } catch(e) { setRefreshMsg(e.message) }
    setRefreshing(false)
  }

  const doCancel = async () => {
    setCancelling(true); setCancelMsg('')
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+sess.access_token },
        body: JSON.stringify({ action: 'cancel', cert_id: cert.id, reason: 'Requested by customer via SSLVault' })
      })
      const d = await r.json()
      if (d.ok) { setCancelMsg('Cancelled. Refund requested.'); setCancelConfirm(false); setTimeout(() => onRefresh(), 2000) }
      else { setCancelMsg('Error: ' + (d.error || 'Unknown')); setCancelConfirm(false) }
    } catch(e) { setCancelMsg('Error: ' + e.message); setCancelConfirm(false) }
    setCancelling(false)
  }

  // ── Validity timeline ─────────────────────────────────────────────
  const certStart  = cert.issued_at  ? new Date(cert.issued_at)  : null
  const certEnd    = cert.expires_at ? new Date(cert.expires_at) : null
  const subEnd     = certStart ? (() => { const d = new Date(certStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })() : null
  const totalMs    = certStart && subEnd ? subEnd - certStart : 1
  const certPct    = certStart && certEnd ? Math.min(100, ((certEnd - certStart) / totalMs) * 100) : 0
  const todayPct   = certStart ? Math.max(0, Math.min(100, ((Date.now() - certStart) / totalMs) * 100)) : 0
  const fmtD       = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'

  // ── Action button style ───────────────────────────────────────────
  const ABtn = ({ icon: Icon, label, onClick, color='#ff8c7a', disabled }) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
        background:'transparent', border:'1px solid rgba(240,237,232,0.15)',
        borderRadius:7, cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'rgba(240,237,232,0.25)' : color,
        fontFamily:'inherit', fontSize:12, fontWeight:600, transition:'all .15s',
        opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(240,237,232,0.3)' }}}
      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(240,237,232,0.15)' }}>
      {Icon && <Icon size={12}/>} {label}
    </button>
  )

  // ── Field row ─────────────────────────────────────────────────────
  const Field = ({ label, value, mono, copy }) => {
    const [ok, setOk] = useState(false)
    if (!value) return null
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:2, padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize:10, color:'#b0a8a0', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#ffffff', fontFamily: mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{value}</span>
          {copy && <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500) }}
            style={{ background:'none', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:3, cursor:'pointer',
              color: ok ? '#4ade80' : '#b0a8a0', fontSize:10, padding:'1px 6px', fontFamily:'inherit' }}>
            {ok ? '✓' : 'Copy'}
          </button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:'rgba(10,0,0,0.95)', border:'1px solid rgba(192,57,43,0.3)',
      borderRadius:12, overflow:'hidden', marginTop:4, animation:'fadeSlideUp 0.2s ease both' }}>

      {/* ── Status banner ── */}
      <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:10,
        background: isExpired ? 'rgba(192,57,43,0.2)' : isWarn ? 'rgba(230,100,0,0.15)' : 'rgba(22,163,74,0.12)',
        borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize:18 }}>{isExpired ? '⚠️' : '✅'}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color: statusColor }}>
            {isExpired ? 'Certificate expired' : isWarn ? `Expires in ${days} days` : 'SSL certificate is approved and issued'}
          </div>
          <div style={{ fontSize:11, color:'#b0a8a0', marginTop:1 }}>
            {isExpired ? 'Renew immediately to restore HTTPS' : isWarn ? 'Reissue soon to avoid expiry' : 'Certificate is ready to be installed. Download and follow installation guides.'}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#b0a8a0',
            fontSize:18, lineHeight:1, padding:'2px 6px' }}>×</button>
      </div>

      {/* ── Action buttons row — matches GoGetSSL toolbar ── */}
      <div style={{ padding:'10px 18px', display:'flex', gap:8, flexWrap:'wrap',
        borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
        <ABtn icon={RotateCcw} label="Reissue SSL"
          onClick={() => certHistoryRef.current?.doAction('reissue')} disabled={!session}/>
        {cert._daysToRenewal != null && cert._daysToRenewal <= 30 && (
          <ABtn icon={RefreshCw} label="Renew order"
            onClick={() => certHistoryRef.current?.doAction('renew')} disabled={!session}/>
        )}
        <ABtn icon={Server} label="Install" onClick={() => onInstall(cert)}/>
        <ABtn icon={RefreshCw} label={refreshing ? 'Syncing…' : 'Sync status'} onClick={doRefresh} disabled={refreshing}/>
        <ABtn icon={Download} label="Certificate" onClick={() => cert.cert_pem && dl(cert.cert_pem, cert.domain+'-cert.pem')} disabled={!cert.cert_pem}/>
        {canCancel && !cancelConfirm && !cancelMsg && (
          <ABtn icon={ShieldOff} label="Cancel order" color='#f87171' onClick={() => setCancelConfirm(true)}/>
        )}
        {canCancel && cancelConfirm && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'#f87171' }}>Cancel GGS #{cert.ggs_order_id}?</span>
            <button onClick={doCancel} disabled={cancelling}
              style={{ fontSize:11, fontWeight:600, color:'white', background:'#c0392b', border:'none',
                borderRadius:5, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              {cancelling ? 'Cancelling…' : 'Yes'}
            </button>
            <button onClick={() => setCancelConfirm(false)}
              style={{ fontSize:11, color:'#b0a8a0', background:'none', border:'0.5px solid rgba(255,255,255,0.15)',
                borderRadius:5, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              No
            </button>
          </div>
        )}
        {cancelMsg && <span style={{ fontSize:11, color: cancelMsg.includes('Error') ? '#f87171' : '#4ade80', alignSelf:'center' }}>{cancelMsg}</span>}
        {refreshMsg && <span style={{ fontSize:11, color: refreshMsg.includes('Error') || refreshMsg.includes('error') ? '#f87171' : '#4ade80', alignSelf:'center' }}>{refreshMsg}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {!delConfirm
            ? <ABtn icon={X} label="Delete" color='#b0a8a0' onClick={() => setDel(true)}/>
            : <ABtn icon={X} label="Confirm delete" color='#f87171' onClick={() => onDelete(cert.id)}/>
          }
        </div>
      </div>

      {/* ── Validity timeline bar ── */}
      {certStart && certEnd && (
        <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#b0a8a0', marginBottom:6 }}>
            <span>{fmtD(cert.issued_at)} · SSL valid from</span>
            <span style={{ color: isWarn || isExpired ? '#f87171' : '#4ade80', fontWeight:600 }}>
              {isExpired ? 'Expired' : `Next reissue in ${days} days`}
            </span>
            {subEnd && <span>{fmtD(subEnd)} · Subscription ends</span>}
          </div>
          <div style={{ position:'relative', height:14, borderRadius:6, overflow:'hidden',
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0,
              width: certPct+'%', borderRadius:'6px 0 0 6px',
              background: isExpired ? '#f87171' : isWarn ? '#f0ede8' : '#4ade80' }}/>
            <div style={{ position:'absolute', top:0, bottom:0, left: certPct+'%', right:0,
              backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 4px,transparent 4px,transparent 8px)' }}/>
            <div style={{ position:'absolute', top:0, bottom:0, left:'calc('+todayPct+'% - 1px)',
              width:2, background:'white', borderRadius:1, opacity:0.7 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#b0a8a0', marginTop:4 }}>
            <span>{fmtD(cert.issued_at)}</span>
            <span style={{ fontWeight:600, color: isWarn || isExpired ? '#f87171' : '#f0ede8' }}>{fmtD(cert.expires_at)}</span>
            {subEnd && <span>{fmtD(subEnd)}</span>}
          </div>
        </div>
      )}

      {/* ── Section tabs ── */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 18px' }}>
        {[['details','Details'], ['files','Files'], ['history','History'], ['security','Security']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveSection(k)}
            style={{ fontSize:12, fontWeight:600, padding:'10px 14px', border:'none', background:'none',
              cursor:'pointer', fontFamily:'inherit', marginBottom:-1,
              color: activeSection===k ? '#ffffff' : '#b0a8a0',
              borderBottom:'2px solid '+(activeSection===k ? '#c0392b' : 'transparent'),
              transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Details section — GoGetSSL exact layout ── */}
      {activeSection === 'details' && (() => {
        // Subscription period = order placed date + period months (billing year)
        const subStart = cert.issued_at ? new Date(cert.issued_at) : null
        const subEnd   = cert.subscription_end_date
          ? new Date(cert.subscription_end_date)
          : subStart
            ? (() => { const d = new Date(subStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })()
            : null
        const fmt      = d => d ? new Date(d).toISOString().split('T')[0] : '—'
        const fmtLong  = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

        // Subscription period string: "12 months (2026-05-28 – 2027-05-27)"
        const periodStr = subStart && subEnd
          ? `${cert._order?.period || 12} months (${fmt(subStart)} – ${fmt(subEnd)})`
          : `${cert._order?.period || 12} months`

        return (
          <div style={{ padding:'18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 40px' }}>
            {/* Left — Main Details */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#ff8c7a', textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:12, paddingBottom:8,
                borderBottom:'1px solid rgba(255,107,91,0.2)', display:'flex', alignItems:'center', gap:6 }}>
                📋 Main Details
              </div>

              {/* Each row: label left, value right — exactly like GGS */}
              {[
                ['Product Name',       cert._order?.product_name || cert.cert_type || 'RapidSSL Standard', false, false],
                ['Order Status',       cert.status === 'active' ? '✓ Issued' : cert.status, false, false],
                ['Order ID',           cert._order?.ggs_invoice_id ? `S${cert._order.ggs_invoice_id}` : null, true, false],
                ['API Order ID',       cert.ggs_order_id ? String(cert.ggs_order_id) : null, true, true],
                ['Vendor Order ID',    cert._order?.vendor_order_id || cert._order?.partner_order_id || null, true, false],
                ['Subscription Period', periodStr, false, false],
                ['Files Valid From',   fmt(cert.issued_at), false, false],
                ['Files Valid Till',   fmt(cert.expires_at), false, false],
                ['Domain',             cert.common_name || cert.domain, false, true],
                ['Order Type',         cert.order_type === 'renewal' ? 'Renewal' : 'New', false, false],
              ].filter(([,v]) => v).map(([label, value, mono, copy]) => (
                <div key={label} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                  padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#b0a8a0', flexShrink:0, minWidth:140 }}>{label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6, textAlign:'right' }}>
                    <span style={{ fontSize:12, color: label==='Order Status' ? '#4ade80' : '#ffffff',
                      fontFamily: mono ? 'monospace' : 'inherit' }}>
                      {value}
                    </span>
                    {copy && value && (
                      <button onClick={() => navigator.clipboard.writeText(value)}
                        style={{ fontSize:10, color:'#b0a8a0', background:'none',
                          border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:3,
                          padding:'1px 6px', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* "Why shorter?" note below Files Valid Till */}
              <div style={{ padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:11, color:'rgba(240,237,232,0.35)', lineHeight:1.5 }}>
                  ⓘ <strong style={{ color:'rgba(240,237,232,0.5)' }}>Why is cert validity shorter than subscription?</strong>
                  {' '}Industry rules (effective March 2026) limit SSL certificates to 199 days max.
                  Your subscription period is still {cert._order?.period || 12} months — reissue is free and auto-handled.
                </div>
              </div>
            </div>

            {/* Right — Administrator Contact */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#ff8c7a', textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:12, paddingBottom:8,
                borderBottom:'1px solid rgba(255,107,91,0.2)', display:'flex', alignItems:'center', gap:6 }}>
                👤 Administrator Contact
              </div>
              {[
                ['First Name', cert._order?.admin_first_name],
                ['Last Name',  cert._order?.admin_last_name],
                ['Email',      cert._order?.admin_email],
                ['Phone',      cert._order?.admin_phone],
                ['Title',      cert._order?.admin_title || 'Mr'],
                ['City',       cert._order?.admin_city],
                ['Country',    cert._order?.admin_country],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                  padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#b0a8a0', flexShrink:0, minWidth:100 }}>{label}</span>
                  <span style={{ fontSize:12, color:'#ffffff', textAlign:'right' }}>{value}</span>
                </div>
              ))}

              {/* Technical Contact — same data for DV certs */}
              <div style={{ fontSize:11, fontWeight:700, color:'#ff8c7a', textTransform:'uppercase',
                letterSpacing:'0.8px', margin:'20px 0 12px', paddingBottom:8,
                borderBottom:'1px solid rgba(255,107,91,0.2)', display:'flex', alignItems:'center', gap:6 }}>
                🔧 Technical Contact
              </div>
              {[
                ['First Name', cert._order?.tech_first_name || cert._order?.admin_first_name],
                ['Last Name',  cert._order?.tech_last_name  || cert._order?.admin_last_name],
                ['Email',      cert._order?.tech_email      || cert._order?.admin_email],
                ['Phone',      cert._order?.tech_phone      || cert._order?.admin_phone],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={'t'+label} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                  padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#b0a8a0', flexShrink:0, minWidth:100 }}>{label}</span>
                  <span style={{ fontSize:12, color:'#ffffff', textAlign:'right' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Files section ── */}
      {activeSection === 'files' && (
        <div style={{ padding:'18px', display:'flex', flexDirection:'column', gap:10 }}>
          {cert.cert_pem ? (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:8, border:'0.5px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <FileText size={16} color="#ff8c7a"/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#ffffff', fontFamily:'monospace' }}>Certificate (cert.pem)</div>
                    <div style={{ fontSize:11, color:'#b0a8a0' }}>Fullchain · end-entity + intermediate</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <CopyBtn text={cert.cert_pem} label="Copy"/>
                  <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.cert_pem, cert.domain+'-cert.pem')}>
                    <Download size={10}/> Download
                  </button>
                </div>
              </div>
              {cert.ca_pem && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 14px', borderRadius:8, border:'0.5px solid rgba(255,255,255,0.1)',
                  background:'rgba(255,255,255,0.03)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <FileText size={16} color="#b0a8a0"/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#ffffff', fontFamily:'monospace' }}>Intermediate CA (ca.pem)</div>
                      <div style={{ fontSize:11, color:'#b0a8a0' }}>CA bundle for chain of trust</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <CopyBtn text={cert.ca_pem} label="Copy"/>
                    <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.ca_pem, cert.domain+'-ca.pem')}>
                      <Download size={10}/> Download
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize:13, color:'#b0a8a0', textAlign:'center', padding:'24px 0' }}>
              Certificate files not yet available — order may still be processing.
            </div>
          )}
          {/* Private key via KeyLocker */}
          <div style={{ padding:'12px 14px', borderRadius:8, border:'0.5px solid rgba(192,57,43,0.3)',
            background:'rgba(192,57,43,0.05)', marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Lock size={14} color="#ff8c7a"/>
              <span style={{ fontSize:12, fontWeight:600, color:'#ff8c7a' }}>Private Key</span>
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:3,
                background:'rgba(248,113,113,0.12)', color:'#f87171', fontWeight:700 }}>VAULT</span>
            </div>
            <div style={{ fontSize:11, color:'#b0a8a0' }}>
              Private key is encrypted in KeyLocker. Go to CertVault to access it securely.
            </div>
            <button onClick={() => nav('/certvault')}
              style={{ marginTop:8, fontSize:11, fontWeight:600, color:'#ff8c7a',
                background:'transparent', border:'0.5px solid rgba(192,57,43,0.3)',
                borderRadius:5, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit' }}>
              Open CertVault →
            </button>
          </div>
        </div>
      )}

      {/* ── History section ── */}
      {activeSection === 'history' && session && (
        <div style={{ padding:'14px 18px', display:'none' }}>
          <CertHistory ref={certHistoryRef} cert={cert} session={session}/>
        </div>
      )}
      {/* Always mount CertHistory so certHistoryRef works for reissue/renew buttons */}
      {session && (
        <div style={{ display: activeSection === 'history' ? 'block' : 'none', padding:'14px 18px' }}>
          <CertHistory ref={certHistoryRef} cert={cert} session={session}/>
        </div>
      )}

      {/* ── Security section ── */}
      {activeSection === 'security' && (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          <TlsPostureRow cert={cert} onRefresh={onRefresh}/>
          <PqcRow cert={cert} onRefresh={onRefresh}/>
          <VulnScanner domain={cert.domain} session={session}/>
        </div>
      )}

      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}


function EmbedTab({ cert }) {
  const domain = cert.domain
  const widgetSnippet = `<script src="https://easysecurity.in/widget.js" data-domain="${domain}" async></script>`
  const statusUrl = `${window.location.origin}/status/${(cert.admin_email||'').split('@')[0].replace(/[^a-z0-9]/gi,'') || 'user'}`
  const [copiedW, setCopiedW] = useState(false)
  const [copiedS, setCopiedS] = useState(false)
  const copyWidget = () => { navigator.clipboard?.writeText(widgetSnippet); setCopiedW(true); setTimeout(()=>setCopiedW(false),2000) }
  const copyStatus = () => { navigator.clipboard?.writeText(statusUrl); setCopiedS(true); setTimeout(()=>setCopiedS(false),2000) }
  return (
    <div style={{ padding:'16px' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#ffffff', marginBottom:4 }}>
          Embeddable SSL badge
        </div>
        <div style={{ fontSize:11, color:'#b0a8a0', marginBottom:8, lineHeight:1.5 }}>
          Paste this on your website to show a live SSL status badge. Updates automatically.
        </div>
        <div style={{ background:'transparent', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'#ff8c7a', wordBreak:'break-all', marginBottom:8 }}>
          {widgetSnippet}
        </div>
        <button onClick={copyWidget}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'#e8e0d8', fontFamily:'inherit' }}>
          {copiedW ? <><Check size={10} color="#16a34a"/> Copied!</> : <><Copy size={10}/> Copy snippet</>}
        </button>
      </div>
      <div style={{ borderTop:'0.5px solid var(--v2-border)', paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#ffffff', marginBottom:4 }}>
          Public SSL status page
        </div>
        <div style={{ fontSize:11, color:'#b0a8a0', marginBottom:8, lineHeight:1.5 }}>
          Share this link with clients — shows all your SSL grades publicly, no login needed.
        </div>
        <div style={{ background:'var(--v2-surface-3)', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'#e8e0d8', wordBreak:'break-all', marginBottom:8 }}>
          {statusUrl}
        </div>
        <button onClick={copyStatus}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'#e8e0d8', fontFamily:'inherit' }}>
          {copiedS ? <><Check size={10} color="#16a34a"/> Copied!</> : <><Share2 size={10}/> Copy status link</>}
        </button>
      </div>
    </div>
  )
}
function DomainGroup({ primary, versions, index, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const days  = daysLeft(primary.expires_at)
  const s     = statusOf(days, primary.status)
  const initials = primary.domain.replace(/^www\./, '').slice(0,2).toUpperCase()
  const dotColor = s.dot==='green'?'#f0ede8':s.dot==='amber'?'#f0ede8':s.dot==='red'?'#f87171':'rgba(240,237,232,0.15)'

  // Group versions by ggs_order_id — each unique order = one subscription
  const subscriptionMap = {}
  for (const v of versions) {
    const key = v.ggs_order_id || v.id
    if (!subscriptionMap[key]) subscriptionMap[key] = []
    subscriptionMap[key].push(v)
  }
  // Sort subscriptions: OLDEST first (chronological) so numbering is correct
  // Subscription 1 = first ever placed, Subscription 2 = renewal, etc.
  // This matches customer expectations — Sub 1 is what they first ordered
  const subscriptionsChron = Object.values(subscriptionMap).sort((a, b) => {
    const aMin = Math.min(...a.map(v => new Date(v.issued_at||0).getTime()))
    const bMin = Math.min(...b.map(v => new Date(v.issued_at||0).getTime()))
    return aMin - bMin  // oldest first
  })
  // For display: show most recent (active) subscription at top, but keep numbering chronological
  // We number by chronological position, display newest first
  const subscriptions = [...subscriptionsChron].reverse()  // newest displayed first
  const subNumberMap = {}  // certGroupKey → chronological number
  subscriptionsChron.forEach((sub, i) => {
    const key = sub[0]?.ggs_order_id || sub[0]?.id
    subNumberMap[key] = i + 1  // 1-indexed, chronological
  })
  const hasMultipleSubs = subscriptions.length > 1
  const hasVersions     = versions.length > 1

  // Find the ONE cert that is live right now — 3-layer priority:
  // Layer 1: DB flag is_live_on_server=true (set by agent/cpanel/certbind)
  // Layer 2: precomputed map from agent_jobs latest install per domain
  // Layer 3: none found → no cert marked live (show unknown)
  const liveCertByDomain = versions[0]?._liveCertByDomain || {}
  const liveCertId = liveCertByDomain[primary.domain] || null

  // Confirmed-by source for the live cert
  const liveCert = versions.find(v => v.id === liveCertId)
  const liveConfirmedBy = liveCert?.live_confirmed_by || null

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'

  return (
    <div style={{ background:'var(--v2-surface)',
      border:`0.5px solid ${selected===primary.id ? '#f0ede8' : 'var(--v2-border)'}`,
      borderRadius:12, overflow:'hidden', transition:'border-color 0.15s' }}>

      {/* ── LEVEL 1: Domain anchor row ── */}
      <div onClick={() => onSelect(primary.id)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
          cursor:'pointer', transition:'background 0.15s', background:'var(--v2-surface)' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,107,91,0.07)'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}>

        <span style={{ fontSize:11, color:'#b0a8a0', fontWeight:600, minWidth:16, textAlign:'right', flexShrink:0 }}>{index}</span>

        {/* Avatar */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#ff6b5b,#ff9e8c)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#ffffff', letterSpacing:0.5 }}>{initials}</div>
          <span style={{ position:'absolute', bottom:-2, right:-2, width:9, height:9,
            borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-surface)' }}/>
        </div>

        {/* Domain info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace', color:'#ff8c7a' }}>
              {primary.domain}
            </span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
              background: s.dot==='green'?'transparent':s.dot==='amber'?'rgba(230,126,34,0.12)':'rgba(192,57,43,0.1)',
              color: s.dot==='green'?'#a93226':s.dot==='amber'?'#c0392b':'#a93226' }}>
              {days != null ? `${days}d left` : primary.status}
            </span>
            {primary.install_method && (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                background: primary.install_method==='cpanel'?'#000000':'rgba(240,237,232,0.7)',
                color: primary.install_method==='cpanel'?'#8B6914':'#f0ede8',
                border:`0.5px solid ${primary.install_method==='cpanel'?'rgba(30,0,0,0.5)':'rgba(240,237,232,0.7)'}`,
                display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                {primary.install_method==='cpanel' ? '🌐 cPanel' : '🖥 VPS'}
              </span>
            )}
            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20,
              background:'var(--v2-bg)', color:'#b0a8a0', border:'0.5px solid var(--v2-border)' }}>
              {primary.cert_type || primary.issuer || 'RapidSSL Standard'}
            </span>
          </div>
          <div style={{ fontSize:11, color:'#b0a8a0' }}>
            {subscriptions.length} subscription{subscriptions.length!==1?'s':''} · {versions.length} cert version{versions.length!==1?'s':''} · Expires {fmtDate(primary.expires_at)}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'#b0a8a0' }}>Expires</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#ff8c7a' }}>{fmtDate(primary.expires_at)}</div>
          </div>
          {(hasVersions || hasMultipleSubs) && (
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
              style={{ background:'var(--v2-bg)', border:'0.5px solid var(--v2-border)', borderRadius:6,
                padding:'4px 8px', fontSize:10, color:'#e8e0d8', cursor:'pointer',
                display:'flex', alignItems:'center', gap:3, fontFamily:'inherit', flexShrink:0 }}>
              {expanded ? '▲ Hide' : '▼ Expand'}
            </button>
          )}
          <ChevronRight size={14} style={{ color:'#b0a8a0', flexShrink:0 }}/>
        </div>
      </div>

      {/* Validity progress bar */}
      {days != null && (
        <div style={{ height:4, background:'rgba(192,57,43,0.12)', borderRadius:4 }}>
          <div style={{ height:'100%',
            width:`${Math.min(100, Math.max(0, (days/398)*100))}%`,
            background:`linear-gradient(90deg, #c0392b, #c0392b)` }}/>
        </div>
      )}

      {/* ── LEVELS 2 + 3: Subscription groups + version rows ── */}
      {expanded && (
        <div style={{ background:'transparent', padding:'10px 14px 14px' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'#6B5A3E', textTransform:'uppercase',
            letterSpacing:'0.5px', marginBottom:10 }}>Subscription history</div>

          {subscriptions.map((subVersions, si) => {
            const subNewest   = subVersions[0]
            const isActiveSub = si === 0
            const isRenewal   = subNewest.order_type === 'renewal'
            const isReissued  = subNewest.order_type === 'reissue'
            const ggsOrder    = subNewest.ggs_order_id

            // Subscription left-border colour:
            // Active original → dark teal #c0392b
            // Renewal         → mint teal #c0392b
            // Older           → muted cream
            const borderColor = isActiveSub && !isRenewal ? '#f0ede8'
              : isRenewal ? '#f0ede8'
              : 'rgba(240,237,232,0.15)'

            const headerBg    = isActiveSub && !isRenewal ? 'transparent'
              : isRenewal ? 'transparent'
              : '#000000'
            const headerBorder = isActiveSub && !isRenewal ? 'rgba(192,57,43,0.3)'
              : isRenewal ? 'rgba(192,57,43,0.3)'
              : 'rgba(30,0,0,0.5)'

            // Sub type label
            const subLabel = isRenewal ? 'Renewal' : si === 0 ? 'Original' : `Earlier subscription`

            // Compute subscription period for timeline bar
            const oldest = subVersions[subVersions.length - 1]
            const subStart = oldest.issued_at ? new Date(oldest.issued_at) : null
            // Estimate sub end = start + 365 days
            const subEnd = subStart ? new Date(subStart.getTime() + 365*86400000) : null
            const subTotal = subStart && subEnd ? subEnd - subStart : 1
            const subElapsed = subStart ? Math.min(Date.now() - subStart, subTotal) : 0
            const subPct = subStart ? Math.round((subElapsed / subTotal) * 100) : 0

            return (
              <div key={ggsOrder || si}
                style={{ border:`0.5px solid ${headerBorder}`, borderRadius:10, overflow:'hidden',
                  marginBottom: si < subscriptions.length - 1 ? 8 : 0, background:'var(--v2-surface)' }}>

                {/* ── LEVEL 2: Subscription header ── */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
                  background:headerBg, borderBottom:`0.5px solid ${headerBorder}` }}>
                  {/* Left accent bar */}
                  <div style={{ width:4, height:40, borderRadius:4, background:borderColor, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                        letterSpacing:'0.4px', color: isRenewal?'#f0ede8': isActiveSub?'#f0ede8':'#6B5A3E' }}>
                        Subscription {subNumberMap[subNewest.ggs_order_id || subNewest.id] || (si + 1)} · {subLabel}
                      </span>
                      {isActiveSub && (
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                          background:isRenewal?'#f0ede8':'#f0ede8', color:'#ff8c7a' }}>
                          {isRenewal ? '↻ Active renewal' : 'Active'}
                        </span>
                      )}
                      {ggsOrder && (
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20,
                          background:'transparent', color:'#ff8c7a', border:`0.5px solid ${headerBorder}`,
                          fontFamily:'monospace' }}>
                          GGS #{ggsOrder}
                        </span>
                      )}
                      <span style={{ fontSize:10, color:'#b0a8a0', marginLeft:'auto' }}>
                        {subVersions.length} version{subVersions.length!==1?'s':''}
                      </span>
                    </div>

                    {/* Timeline bar */}
                    {subStart && (
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ fontSize:9, color:'#b0a8a0', width:54, flexShrink:0 }}>
                          {subStart.toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                        </span>
                        <div style={{ flex:1, height:6, background:'rgba(240,237,232,0.6)', borderRadius:6,
                          position:'relative', overflow:'visible' }}>
                          {/* Filled progress */}
                          <div style={{ position:'absolute', left:0, top:0, bottom:0,
                            width:`${isActiveSub ? subPct : 100}%`,
                            background:isActiveSub ? borderColor : 'rgba(240,237,232,0.15)',
                            borderRadius:6, transition:'width .6s' }}/>
                          {/* Today marker for active sub */}
                          {isActiveSub && subPct > 0 && subPct < 100 && (
                            <div style={{ position:'absolute', left:`${subPct}%`, top:-3,
                              width:2, height:12, background:'transparent', borderRadius:1 }}/>
                          )}
                          {/* Auto-reissue dot marker */}
                          {isActiveSub && (
                            <div style={{ position:'absolute', right:'8%', top:-2,
                              width:7, height:7, borderRadius:'50%', background:'transparent',
                              border:'1.5px solid white' }}/>
                          )}
                        </div>
                        <span style={{ fontSize:9, color:'#b0a8a0', width:54, textAlign:'right', flexShrink:0 }}>
                          {subEnd ? subEnd.toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—'}
                        </span>
                      </div>
                    )}
                    {isActiveSub && subStart && (
                      <div style={{ display:'flex', gap:14, marginTop:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'transparent' }}/>
                          <span style={{ fontSize:9, color:'#b0a8a0' }}>Today</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'transparent' }}/>
                          <span style={{ fontSize:9, color:'#b0a8a0' }}>Auto-reissue trigger point</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── LEVEL 3: Version rows inside subscription ── */}
                {subVersions.map((v, vi) => {
                  // ── DEFINITIVE LIVE STATE ──────────────────────────────────────────
                  // isLive: DB flag (layer 1) or agent_jobs map (layer 2)
                  const isLive        = liveCertId !== null && v.id === liveCertId
                  const wasInstalled  = !!v._installTime && !isLive
                  const neverInstalled = !v._installTime && !isLive

                  // Live cert source label for tooltip
                  const confirmSource = isLive
                    ? (v.live_confirmed_by === 'certbind_probe' ? 'TLS verified'
                      : v.live_confirmed_by === 'cpanel_install' ? 'cPanel confirmed'
                      : v.live_confirmed_by === 'agent_job' ? 'Agent confirmed'
                      : 'Confirmed')
                    : null

                  // Status labels — unambiguous, scannable
                  const statusLabel = isLive
                    ? `Live · ${confirmSource}`
                    : wasInstalled
                    ? 'Replaced on server'
                    : vi === 0
                    ? 'Issued · not installed'
                    : 'Superseded'

                  const vLabel = `v${subVersions.length - vi}`

                  return (
                    <div key={v.id}
                      onClick={() => onSelect(v.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
                        borderTop:`0.5px solid var(--v2-border)`,
                        background: isLive ? 'transparent' : selected===v.id ? 'transparent' : 'var(--v2-surface)',
                        cursor:'pointer',
                        opacity: isLive ? 1 : wasInstalled ? 0.5 : neverInstalled && vi > 0 ? 0.4 : 1,
                        borderLeft: isLive ? '3px solid #c0392b' : wasInstalled ? '3px solid #E5E7EB' : neverInstalled && vi===0 ? '3px solid #c0392b' : '3px solid transparent',
                        transition:'background .15s' }}
                      onMouseEnter={e => { if(selected!==v.id) e.currentTarget.style.background='var(--v2-bg)' }}
                      onMouseLeave={e => { if(selected!==v.id) e.currentTarget.style.background='transparent' }}>

                      {/* Status icon — each state has a distinct visual */}
                      <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background: isLive ? '#f0ede8' : wasInstalled ? '#f0ede8' : neverInstalled && vi===0 ? 'transparent' : '#f0ede8',
                        border: isLive ? 'none' : wasInstalled ? '1.5px solid #E5E7EB' : vi===0 ? '1.5px dashed #c0392b' : '1.5px solid #E5E7EB',
                        position:'relative', overflow: wasInstalled ? 'hidden' : 'visible' }}>
                        {isLive && <Globe size={14} color="white"/>}
                        {wasInstalled && (
                          <>
                            <Server size={12} color="rgba(240,237,232,0.45)"/>
                            <div style={{ position:'absolute', top:'50%', left:3, right:3, height:1.5, background:'rgba(240,237,232,0.45)', transform:'rotate(-25deg)', transformOrigin:'center' }}/>
                          </>
                        )}
                        {!isLive && !wasInstalled && vi===0 && <Clock size={11} color="#c0392b"/>}
                        {!isLive && !wasInstalled && vi>0 && <span style={{fontSize:11,color:'rgba(192,57,43,0.2)',lineHeight:1}}>—</span>}
                      </div>

                      {/* Version info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20,
                            background: isLive ? '#f0ede8' : wasInstalled ? '#f0ede8' : vi===0 ? 'transparent' : '#f0ede8',
                            color: isLive ? '#000000' : wasInstalled ? 'rgba(240,237,232,0.45)' : vi===0 ? '#f0ede8' : 'rgba(240,237,232,0.45)',
                            border: isLive ? 'none' : `0.5px solid ${wasInstalled?'rgba(192,57,43,0.15)':vi===0?'rgba(192,57,43,0.3)':'rgba(192,57,43,0.15)'}`,
                            fontWeight: isLive ? 600 : 500,
                            flexShrink:0 }}>
                            {statusLabel}
                          </span>
                          <span style={{ fontSize:10, fontFamily:'monospace', color:'#b0a8a0' }}>
                            {vLabel} · {v.issued_at ? new Date(v.issued_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:'#b0a8a0' }}>
                          SHA-256 · RSA 2048 ·
                          {v.cert_type || v.issuer || ' RapidSSL'} · Expires {fmtDate(v.expires_at)}
                        </div>
                      </div>

                      {/* Days left */}
                      {(() => {
                        const d = daysLeft(v.expires_at)
                        return (
                          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                            background: d==null?'var(--v2-bg)':d>30?'transparent':d>=0?'rgba(230,126,34,0.12)':'rgba(192,57,43,0.1)',
                            color: d==null?'var(--v2-text-3)':d>30?'#a93226':d>=0?'#c0392b':'#a93226',
                            flexShrink:0 }}>
                            {d==null?'—':d<=0?'Expired':`${d}d left`}
                          </span>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function CertRow({ cert, selected, onClick, index }) {
  const days      = daysLeft(cert.expires_at)
  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const isActive  = cert.status === 'active'
  const statusColor = isExpired ? '#f87171' : isWarn ? '#fbbf24' : '#4ade80'

  // Subscription period — order placed date + period months
  const subStart = cert.issued_at ? new Date(cert.issued_at) : null
  const subEnd   = cert.subscription_end_date ? new Date(cert.subscription_end_date)
    : subStart ? (() => { const d = new Date(subStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })()
    : null
  const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <div onClick={onClick}
      style={{ display:'grid', gridTemplateColumns:'40px 1fr 180px 140px',
        alignItems:'center', gap:'0 0', padding:'14px 20px',
        cursor:'pointer', transition:'background .12s',
        background: selected ? 'rgba(192,57,43,0.07)' : 'transparent',
        borderLeft: selected ? '3px solid #c0392b' : '3px solid transparent',
        borderBottom:'1px solid rgba(255,255,255,0.05)' }}
      onMouseEnter={e=>{ if(!selected) e.currentTarget.style.background='rgba(255,255,255,0.025)' }}
      onMouseLeave={e=>{ if(!selected) e.currentTarget.style.background='transparent' }}>

      {/* # */}
      <span style={{ fontSize:12, color:'rgba(240,237,232,0.3)', fontVariantNumeric:'tabular-nums' }}>{index}</span>

      {/* Description — matches GGS: domain bold, product orange, order ID + period below */}
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#ffffff', marginBottom:4,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {cert.domain}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'#e07060' }}>
            {cert.cert_type || 'RapidSSL Standard'}
          </span>
          {cert.ggs_order_id && (
            <span style={{ fontSize:11, color:'rgba(240,237,232,0.3)', fontFamily:'monospace' }}>
              S{cert.ggs_order_id}
            </span>
          )}
          <span style={{ fontSize:11, color:'rgba(240,237,232,0.3)' }}>
            {cert._order?.period || 1} year
          </span>
          {cert.install_method && (
            <span style={{ fontSize:10, color: cert.install_method==='agent' ? '#93c5fd' : '#fbbf24' }}>
              {cert.install_method==='agent' ? '🖥' : '🌐'}
            </span>
          )}
        </div>
      </div>

      {/* Expires — cert validity end (the shorter date, ~6 months) */}
      <div style={{ textAlign:'right', paddingRight:24 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#ffffff' }}>
          {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit' }).split('/').reverse().join('-') : '—'}
        </div>
        <div style={{ fontSize:12, color: isExpired ? '#f87171' : isWarn ? '#fbbf24' : '#4ade80', marginTop:2, fontWeight:500 }}>
          {isExpired ? `expired ${Math.abs(days)}d ago` : `+ ${days} days`}
        </div>
      </div>

      {/* Status + chevron */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6,
          fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:20,
          background: isExpired ? 'rgba(248,113,113,0.12)' : isWarn ? 'rgba(251,191,36,0.1)' : 'rgba(22,163,74,0.1)',
          color: statusColor }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:statusColor,
            animation: isActive ? 'v3pulse 2s ease infinite' : 'none' }}/>
          {isExpired ? 'Expired' : isWarn ? 'Expiring' : isActive ? 'Active' : (cert.status || 'Pending')}
        </span>
        <ChevronRight size={14} color={selected ? '#c0392b' : 'rgba(240,237,232,0.2)'}
          style={{ transform: selected ? 'rotate(90deg)' : 'none', transition:'transform .2s', flexShrink:0 }}/>
      </div>
    </div>
  )
}

function LoggedInDashboard({ user, nav, onIssue }) {
  const isMobile = useIsMobile()
  const [certs,   setCerts]  = useState([])
  const [orders,  setOrders] = useState([])
  const [loading, setLoading]= useState(true)
  const [selected,setSelected]= useState(null)
  const [filter,  setFilter] = useState('all')
  const [search,  setSearch] = useState('')
  const [agentCert,  setAgentCert]  = useState(null)
  const [cpanelCert, setCpanelCert] = useState(null)
  const [session,    setSession]    = useState(null)
  const [healthScores, setHealthScores] = useState({})  // domain → {grade, score}
  const [recentEvents, setRecentEvents] = useState([])   // activity feed
  const [shareMsg,   setShareMsg]   = useState('')        // share button feedback

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    const [{ data: certsData }, { data: agentInstalls }, { data: ordersData }] = await Promise.all([
      supabase.from('certificates')
        .select('*, order_type, is_live_on_server, live_confirmed_by, live_confirmed_at')
        .eq('user_id', user.id).neq('status', 'cancelled')
        .order('issued_at', { ascending:false }),
      supabase.from('agent_jobs')
        .select('cert_id, created_at')
        .eq('user_id', user.id).eq('job_type', 'install').eq('status', 'success')
        .order('created_at', { ascending:false }).limit(100),
      supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'dv_pending').order('created_at', { ascending:false }),
    ])

    // Build cert_id → latest agent install time (Layer 2 fallback)
    const certInstallTime = {}
    for (const job of (agentInstalls || [])) {
      if (!certInstallTime[job.cert_id]) certInstallTime[job.cert_id] = job.created_at
    }

    // For each domain: if NO cert has is_live_on_server=true in DB,
    // fall back to agent_jobs to find the latest installed cert and mark it
    const domainLiveMap = {}
    for (const cert of (certsData || [])) {
      if (cert.is_live_on_server) domainLiveMap[cert.domain] = cert.id
    }
    // Layer 2 fallback: use latest agent_job if DB flag not set
    const domainLatestInstall = {}
    for (const [certId, installTime] of Object.entries(certInstallTime)) {
      const cert = (certsData||[]).find(c => c.id === certId)
      if (!cert) continue
      if (!domainLatestInstall[cert.domain] ||
          new Date(installTime) > new Date(domainLatestInstall[cert.domain].time)) {
        domainLatestInstall[cert.domain] = { certId, time: installTime }
      }
    }
    // Merge: DB flag wins, fallback to agent_jobs
    const liveCertByDomain = { ...Object.fromEntries(
      Object.entries(domainLatestInstall).map(([domain, { certId }]) => [domain, certId])
    ), ...domainLiveMap }

    const enriched = await Promise.all((certsData||[]).map(async cert => {
      if (!cert.ggs_order_id) return { ...cert, _installTime: certInstallTime[cert.id]||null, _liveCertByDomain: liveCertByDomain }
      const { data: ord } = await supabase.from('ssl_orders')
        .select('product_name,product_code,period,ggs_invoice_id,ggs_order_id,partner_order_id,vendor_order_id,order_type,subscription_start,subscription_end,admin_email,admin_first_name,admin_last_name,admin_phone,admin_title,admin_city,admin_country,tech_first_name,tech_last_name,tech_email,tech_phone,serial_number,cert_md5')
        .eq('ggs_order_id', cert.ggs_order_id).eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single()
      const _orderPeriodMonths = ord?.period || 12
      const _orderExpires = cert.issued_at
        ? (() => { const d = new Date(cert.issued_at); d.setMonth(d.getMonth() + _orderPeriodMonths); return d })()
        : null
      const _daysToRenewal = _orderExpires
        ? Math.ceil((_orderExpires.getTime() - Date.now()) / 86400000)
        : null
      return { ...(ord ? { ...cert, _order: ord } : cert), _installTime: certInstallTime[cert.id]||null, _liveCertByDomain: liveCertByDomain, _daysToRenewal }
    }))
    setCerts(enriched); setOrders(ordersData||[]); setLoading(false)

    // Load health scores for all domains (non-blocking)
    supabase.from('ssl_health_scores')
      .select('domain, grade, score, hsts, caa, expiry_days, scanned_at')
      .eq('user_id', user.id)
      .then(({ data: hs }) => {
        if (hs) {
          const map = {}
          hs.forEach(h => { map[h.domain] = h })
          setHealthScores(map)
        }
      })

    // Load recent cert events (non-blocking)
    supabase.from('cert_events')
      .select('id, domain, event_type, meta, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data: evts }) => { if (evts) setRecentEvents(evts) })
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const fn = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [load])

  // Realtime: auto-reload when any cert or order changes for this user
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certificates', filter: `user_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ssl_orders',   filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, load])
  useEffect(() => {
    const d = sessionStorage.getItem('install_domain')
    if (!d || !certs.length) return
    sessionStorage.removeItem('install_domain')
    const c = certs.find(c => c.domain === d && c.private_key_pem)
    if (c) { setSelected(c.id); setAgentCert(c) }
  }, [certs])

  const handleDelete = async (id) => {
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(p => p.filter(c => c.id !== id)); setSelected(null)
  }

  // Split: issued certs (GGS) vs imported from CA connector
  const issuedCerts   = certs.filter(c => (c.source === 'gogetssl' || c.source === 'rapidssl' || !c.source) && c.status !== 'cancelled' && c.status !== 'revoked' && c.status !== 'sandbox_revoked')
  const importedCerts = certs.filter(c => c.source && c.source !== 'gogetssl' && c.source !== 'rapidssl')

  // Total cert count (all rows from GGS)
  const total    = issuedCerts.length
  const healthy  = issuedCerts.filter(c => { const d = daysLeft(c.expires_at); return c.status === 'active' && d != null && d >= 30 }).length
  const expiring = issuedCerts.filter(c => { const d = daysLeft(c.expires_at); return c.status === 'active' && d != null && d >= 0 && d < 30 }).length
  const expired  = issuedCerts.filter(c => { const d = daysLeft(c.expires_at); return c.status === 'revoked' || c.status === 'cancelled' || (d != null && d < 0) }).length

  // All matching certs after filter+search
  const visible = issuedCerts.filter(c => {
    const d = daysLeft(c.expires_at); const s = statusOf(d, c.status)
    if (filter === 'healthy'  && s.cls !== 'green') return false
    if (filter === 'expiring' && s.cls !== 'amber') return false
    if (filter === 'expired'  && s.cls !== 'red')   return false
    if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by domain — each domain has one primary (latest issued_at) + older versions
  const domainGroups = (() => {
    // Flat list — one row per certificate (per GGS order), sorted newest first
    return visible
      .map(c => ({ ...c, _healthGrade: healthScores[c.domain]?.grade || null }))
      .sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at))
  })()

  const visibleWithHealth = visible.map(c => ({
    ...c,
    _healthGrade: healthScores[c.domain]?.grade || null,
  }))

  const selectedCert = selected ? certs.find(c => c.id === selected) : null

  return (
    <div style={{ background:'transparent', minHeight:'100vh', fontFamily:"'Montserrat',system-ui,sans-serif" }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>

        <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:'#ffffff', letterSpacing:'-0.3px', marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
              Certificate Dashboard
              {healthy === total && total > 0 && (
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                  background:'rgba(74,222,128,0.12)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.3)',
                  animation:'fadeIn 0.5s ease' }}>
                  All healthy ✓
                </span>
              )}
            </h1>
            <p style={{ fontSize:12, color:'#b0a8a0' }}>{user.email} · {domainGroups.length} certificate{domainGroups.length!==1?'s':''}</p>
          </div>
          {/* Share SSL status button */}
          <button
            onClick={async () => {
              const { data: { session: s } } = await supabase.auth.getSession()
              if (!s) return
              const username = s.user.email.split('@')[0].replace(/[^a-z0-9]/gi, '')
              const url = `${window.location.origin}/status/${username}`
              try { await navigator.clipboard.writeText(url) } catch(_) {}
              setShareMsg('Link copied!')
              setTimeout(() => setShareMsg(''), 2500)
            }}
            style={{ display:'flex', alignItems:'center', gap:6, background:'transparent',
              border:'1px solid rgba(63,185,80,0.2)', borderRadius:8, padding:'7px 14px',
              fontSize:11, fontWeight:600, color:'#ff8c7a', cursor:'pointer', fontFamily:'inherit' }}>
            <Share2 size={12} color="rgba(240,237,232,0.45)"/>
            {shareMsg || 'Share SSL status'}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total certificates', value:total,    color:'#ff8c7a', border:'rgba(192,57,43,0.25)',   sub:'managed by SSLVault' },
            { label:'Healthy',            value:healthy,  color:'#4ade80', border:'rgba(63,185,80,0.25)',    sub:healthy>0?'All valid':'No active certs' },
            { label:'Expiring ≤30d',      value:expiring, color:expiring>0?'#fbbf24':'rgba(240,237,232,0.4)', border:expiring>0?'rgba(210,153,34,0.25)':'rgba(192,57,43,0.15)', sub:expiring>0?'Needs attention':'None expiring' },
            { label:'Pending DCV',        value:orders.filter(o=>o.status==='dv_pending').length, color:orders.filter(o=>o.status==='dv_pending').length>0?'#f87171':'rgba(240,237,232,0.4)', border:orders.filter(o=>o.status==='dv_pending').length>0?'rgba(248,81,73,0.25)':'rgba(192,57,43,0.15)', sub:orders.filter(o=>o.status==='dv_pending').length>0?'Awaiting DNS':'None pending' },
            { label:'Expired',            value:expired,  color:expired>0?'#f87171':'rgba(240,237,232,0.4)', border:expired>0?'rgba(248,81,73,0.3)':'rgba(192,57,43,0.15)', sub:expired>0?'Renew immediately':'None expired' },
          ].map((s,i) => (
            <div key={s.label} style={{
              background:'transparent',
              border:`1px solid ${s.border}`,
              borderRadius:8,
              padding:'18px 20px',
              position:'relative',
              animation:`fadeSlideUp 0.35s ease both`,
              animationDelay:`${i*50}ms`,
            }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#e8e0d8', marginBottom:10, letterSpacing:'0.01em' }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:700, color:s.value>0?s.color:'#b0a8a0', letterSpacing:'-0.5px', lineHeight:1, marginBottom:6 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'#b0a8a0' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {expired > 0 && (
          <div style={{ background:'rgba(248,113,113,0.12)', border:'0.5px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#f87171" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#f87171' }}><strong>{expired} expired certificate{expired!==1?'s':''}</strong> — renew immediately.</span>
          </div>
        )}
        {expiring > 0 && expired === 0 && (
          <div style={{ background:'rgba(251,191,36,0.12)', border:'0.5px solid rgba(245,158,11,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#fbbf24' }}><strong>{expiring} expiring within 30 days</strong></span>
          </div>
        )}

        {orders.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#e8e0d8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>DNS Validation Pending ({orders.length})</div>
            {orders.map(o => <DvPendingCard key={o.id} order={o} onRefresh={load}/>)}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, alignItems:'start' }}>
          <div style={{ background:'transparent', border:'1px solid rgba(192,57,43,0.2)', borderRadius:8,
            overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(192,57,43,0.15)',
              display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
              background:'transparent' }}>
              {/* Filter tabs */}
              <div style={{ display:'flex', gap:2, background:'transparent', borderRadius:0, padding:0, borderBottom:'1px solid rgba(192,57,43,0.15)' }}>
                {[
                  { key:'all',      label:'All',      count:total },
                  { key:'healthy',  label:'Healthy',  count:healthy },
                  { key:'expiring', label:'Expiring', count:expiring },
                  { key:'expired',  label:'Expired',  count:expired },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit', border:'none', transition:'all .15s',
                      background: 'transparent',
                      borderBottom: filter===f.key ? '2px solid #388bfd' : '2px solid transparent',
                      borderRadius: 0,
                      color: filter===f.key ? 'rgba(192,57,43,0.12)' : 'rgba(240,237,232,0.45)',
                      paddingBottom: '10px', marginBottom: '-1px',
                      boxShadow: filter===f.key ? '0 1px 3px rgba(192,57,43,0.15)' : 'none' }}>
                    {f.label}
                    <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                      background: 'rgba(255,255,255,0.07)',
                      color: '#b0a8a0',
                      borderRadius: 10,
                      marginLeft: 4, transition:'all .15s' }}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domains..."
                    style={{ background:'transparent', border:'1px solid rgba(63,185,80,0.2)', borderRadius:8, color:'#ff8c7a',
                      fontSize:12, padding:'6px 10px 6px 30px', width:190, outline:'none', fontFamily:'inherit',
                      transition:'border-color .15s' }}
                    onFocus={e=>e.target.style.borderColor='#e07060'}
                    onBlur={e=>e.target.style.borderColor='rgba(192,57,43,0.15)'}/>
                  <Globe size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#b0a8a0', pointerEvents:'none' }}/>
                </div>
                <ScanPqcButton onDone={load}/>
                <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', color:'#ff8c7a',
                    border:'none', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 6px rgba(14,127,192,0.3)',
                    transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#f0ede8';e.currentTarget.style.boxShadow='0 4px 12px rgba(14,127,192,0.4)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#f0ede8';e.currentTarget.style.boxShadow='0 2px 6px rgba(14,127,192,0.3)'}}>
                  <Plus size={11}/> New SSL
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:'clamp(16px,16vw,48px) 16px', textAlign:'center' }}>
                <RefreshCw size={20} style={{ color:'#b0a8a0', animation:'spin 1s linear infinite' }}/>
                <div style={{ fontSize:12, color:'#b0a8a0', marginTop:10 }}>Loading...</div>
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding:'clamp(16px,16vw,48px) 16px', textAlign:'center' }}>
                <Shield size={24} style={{ color:'#ff8c7a', marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:600, color:'#b0a8a0', marginBottom:6 }}>{total===0?'No certificates yet':'No results'}</div>
                <div style={{ fontSize:12, color:'#b0a8a0', marginBottom:16 }}>{total===0?'Issue your first SSL certificate to get started.':'Try a different filter.'}</div>
                {total===0 && (
                  <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                    style={{ background:'transparent', color:'#ff8c7a', border:'none', borderRadius:7,
                      padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Issue your first certificate
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 180px 140px',
                  gap:'0 0', padding:'8px 20px',
                  background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <span/>
                  <span style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px' }}>Description</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px', textAlign:'right', paddingRight:24 }}>Expires</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px', textAlign:'right', paddingRight:10 }}>Status</span>
                </div>
                {domainGroups.map((cert, idx) => (
                <div key={cert.id}>
                  <CertRow
                    cert={cert}
                    index={idx + 1}
                    selected={selected === cert.id}
                    onClick={() => setSelected(selected === cert.id ? null : cert.id)}
                  />
                  {selected === cert.id && (
                    <div style={{ padding:'0 8px 8px' }}>
                      <CertDetail cert={cert} onClose={() => setSelected(null)}
                        onDelete={handleDelete}
                        onInstall={c => { setAgentCert(c) }}
                        onCpanel={c => { setCpanelCert(c) }}
                        nav={nav} onRefresh={load} session={session}/>
                    </div>
                  )}
                </div>
              ))}
              </>
            )}
          </div>
        </div>

        {/* Imported certs from CA Connector — shown separately */}
        {importedCerts.length > 0 && (
          <ImportedCertsSection certs={importedCerts} onDelete={handleDelete} />
        )}

        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Quick actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
            {[
              { icon:Shield,    color:'#ffffff', bg:'transparent', label:'Issue Certificate', desc:'RapidSSL DV · RapidSSL · ~5 min',    action:() => onIssue ? onIssue() : nav('/buy') },
              { icon:Download,  color:'#4ade80', bg:'transparent', label:'Install Guide',     desc:'Nginx, Apache, cPanel step-by-step', action:() => nav('/install') },
              { icon:Activity,  color:'#ffffff', bg:'rgba(248,113,113,0.12)', label:'Integrations',     desc:'Cloudflare, Vercel, agent setup',    action:() => nav('/integrations') },
              { icon:Zap,       color:'#ffffff', bg:'rgba(248,113,113,0.12)', label:'Knowledge Base',    desc:'Guides, FAQs, troubleshooting',      action:() => nav('/knowledge-base') },
            ].map(({ icon:Icon, color, bg, label, desc, action }, i) => (
              <button key={label} onClick={action}
                style={{ background:'transparent', border:'1px solid rgba(192,57,43,0.15)', borderRadius:12, padding:'16px',
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  animation:`fadeSlideUp 0.4s ease both`, animationDelay:`${i*60}ms` }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${color}20`;e.currentTarget.style.borderColor=color+'44'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor='rgba(192,57,43,0.15)'}}>
                <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#ff6b5b,#ff9e8c)',
                  display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={16} color={color} strokeWidth={1.8}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#ffffff', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:11, color:'#b0a8a0', lineHeight:1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent activity feed ── */}
        {recentEvents.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Recent activity</div>
            <div style={{ background:'transparent', border:'1px solid rgba(192,57,43,0.15)', borderRadius:12,
              overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              {recentEvents.map((ev, i) => {
                const evColors = {
                  issued:          { color:'#4ade80', bg:'transparent', dot:'#4ade80' },
                  renewed:         { color:'#ff8c7a', bg:'transparent', dot:'#f0ede8' },
                  revoked:         { color:'#f87171', bg:'rgba(192,57,43,0.12)', dot:'#f87171' },
                  agent_installed: { color:'#ff8c7a', bg:'rgba(248,113,113,0.12)', dot:'#f0ede8' },
                  private_key_copied: { color:'#ff8c7a', bg:'rgba(248,113,113,0.12)', dot:'#f0ede8' },
                }
                const cfg = evColors[ev.event_type] || { color:'#e8e0d8', bg:'#000000', dot:'rgba(240,237,232,0.38)' }
                const secs = Math.floor((Date.now() - new Date(ev.created_at)) / 1000)
                const ago = secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.floor(secs/60)}m ago`
                          : secs < 86400 ? `${Math.floor(secs/3600)}h ago` : `${Math.floor(secs/86400)}d ago`
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12,
                    padding:'10px 16px', borderBottom: i < recentEvents.length-1 ? '1px solid rgba(192,57,43,0.15)' : 'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, color:'#ff8c7a', fontWeight:500 }}>
                        {ev.event_type.replace(/_/g,' ')}
                      </span>
                      <span style={{ fontSize:12, color:'#b0a8a0' }}> — {ev.domain}</span>
                    </div>
                    <span style={{ fontSize:11, color:'#b0a8a0', flexShrink:0 }}>{ago}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* VPS agent install modal */}
      {agentCert && (
        <AgentInstall
          cert={agentCert}
          userId={user.id}
          onClose={() => setAgentCert(null)}
          onOpenCpanel={() => {
            // Switch from VPS modal to cPanel modal for the same cert
            const cert = agentCert
            setAgentCert(null)
            setCpanelCert(cert)
          }}
        />
      )}

      {/* cPanel install modal */}
      {cpanelCert && (
        <CpanelInstall
          cert={cpanelCert}
          userId={user.id}
          onClose={() => setCpanelCert(null)}
          onSuccess={() => { setCpanelCert(null); load() }}
        />
      )}

      <style>{`
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
`}</style>
    </div>
  )
}

function MarketingDashboard({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container">
        <div style={{ textAlign:'center', padding:'56px 0 48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--v2-green-bg)',
            border:'0.5px solid var(--v2-green-border)', borderRadius:100, padding:'4px 14px', marginBottom:20 }}>
            <span className="v2-pulse"/>
            <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-green-text)' }}>Free · Open · Trusted</span>
          </div>
          <h1 style={{ fontSize:Math.min(38,window.innerWidth>768?38:30), fontWeight:700, color:'#ffffff', letterSpacing:'-0.8px',
            lineHeight:1.15, margin:'0 0 14px', maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            Your SSL certificates,<br/>
            <span style={{ color:'var(--v2-green)' }}>always under control</span>
          </h1>
          <p style={{ fontSize:16, color:'#e8e0d8', maxWidth:480, margin:'0 auto 32px', lineHeight:1.65 }}>
            Issue free SSL certificates, monitor expiry, automate renewal — all from one clean dashboard.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="v2-btn v2-btn-primary" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => nav('/auth')}>
              <Shield size={14}/> Get started free
            </button>
            <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => onIssue ? onIssue() : nav('/buy')}>
              New SSL
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ nav, onIssue }) {
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={20} style={{ color:'#b0a8a0', animation:'spin 1s linear infinite' }}/>
      <style>{`
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
`}</style>
    </div>
  )
  if (!user) return <MarketingDashboard nav={nav}/>
  return <LoggedInDashboard user={user} nav={nav} onIssue={onIssue}/>
}
