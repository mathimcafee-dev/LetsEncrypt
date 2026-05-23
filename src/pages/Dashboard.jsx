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

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

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
  const color = days == null ? '#e2e8f0' : days < 0 ? '#ef4444' : days < 14 ? '#ef4444' : days < 30 ? '#E8897A' : '#1A7A72'
  return (
    <div style={{ height:4, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
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
    <div style={{ marginTop:20, border:'0.5px solid #e2e8f0', borderRadius:14, overflow:'hidden', background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', gap:10,
          background:'#f8fafc', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', flex:1 }}>
          CA Connector — Imported Certificates ({certs.length})
        </span>
        <span style={{ fontSize:10, color:'#94a3b8', marginRight:4 }}>Tracked only · not managed by SSLVault</span>
        <span style={{ fontSize:12, color:'#94a3b8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          {certs.map(c => {
            const d = daysLeft(c.expires_at)
            const isExpired = d == null || d < 0
            const isExpiring = d != null && d >= 0 && d < 30
            const dotColor = isExpired ? '#ef4444' : isExpiring ? '#E8897A' : '#22c55e'
            return (
              <div key={c.id} style={{ padding:'12px 18px', borderTop:'0.5px solid #f1f5f9',
                display:'flex', alignItems:'center', gap:12, background:'white' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', display:'flex', alignItems:'center', gap:8 }}>
                    {c.domain}
                    <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4,
                      background:'#f1f5f9', color:'#64748b' }}>
                      {sourceLabel(c.source)}
                    </span>
                    {isExpired && <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:'#fef2f2', color:'#dc2626' }}>EXPIRED</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    {c.issuer || c.cert_type || 'Unknown issuer'} ·{' '}
                    {isExpired ? `Expired ${Math.abs(d)}d ago` : `${d}d left`} ·{' '}
                    Expires {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </div>
                </div>
                <button onClick={() => onDelete(c.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4,
                    borderRadius:4, transition:'color .15s', fontFamily:'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#94a3b8'}
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
        // Log cert event
        try {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (s) await supabase.from('cert_events').insert({
            user_id: s.user.id, cert_id: order.id, domain: order.domain,
            event_type: 'issued', meta: { product: order.cert_type || 'DV', source: 'rapidssl' }
          })
        } catch (_) {}
        setTimeout(() => onRefresh(), 1500)
      } else {
        setMsg('Status: '+(d.ggs_status||'pending')+' — DNS may still be propagating')
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
    <div style={{ background:'#FDF0EE', border:'1px solid #F2C4BC', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Clock size={13} color="#E8897A" style={{ flexShrink:0 }}/>
        <span style={{ fontSize:12, fontWeight:700, color:'#C45A4A' }}>DNS Validation Pending</span>
        <span style={{ fontFamily:'monospace', fontSize:11, color:'#C45A4A', marginLeft:'auto' }}>GGS #{order.ggs_order_id}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', marginBottom:10, fontFamily:'monospace' }}>{order.domain}</div>
      <div style={{ background:'#0f172a', borderRadius:8, padding:'10px 14px', marginBottom:10, fontSize:11, fontFamily:'monospace' }}>
        <div style={{ display:'grid', gridTemplateColumns:'60px 1fr auto', gap:'6px 10px', alignItems:'center' }}>
          <span style={{ color:'#64748b', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Name</span>
          <span style={{ color:'#94a3b8', wordBreak:'break-all' }}>
            {hasDcv ? dcvName : <span style={{ color:'#475569' }}>⟳ Fetching...</span>}
          </span>
          {hasDcv && <CopyBtn text={dcvName}/>}
          <span style={{ color:'#64748b', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Type</span>
          <span style={{ color:'#34d399' }}>TXT</span><span/>
          <span style={{ color:'#64748b', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>Value</span>
          <span style={{ color:'#fbbf24', wordBreak:'break-all' }}>
            {hasDcv ? dcvValue : <span style={{ color:'#475569' }}>⟳ Fetching...</span>}
          </span>
          {hasDcv && <CopyBtn text={dcvValue}/>}
          <span style={{ color:'#64748b', fontWeight:700, textTransform:'uppercase', fontSize:9 }}>TTL</span>
          <span style={{ color:'#e2e8f0' }}>300</span><span/>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={autoDns} disabled={addingDns || !hasDcv}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#1A7A72', color:'white',
            border:'none', borderRadius:6, padding:'7px 14px', fontSize:11, fontWeight:600,
            cursor: !hasDcv||addingDns ? 'not-allowed':'pointer', opacity: !hasDcv ? 0.4:1, fontFamily:'inherit' }}>
          <Zap size={11}/> {addingDns ? 'Adding...' : 'Auto-Add DNS Record'}
        </button>
        <button onClick={checkStatus} disabled={checking}
          style={{ display:'flex', alignItems:'center', gap:6, background:'white',
            border:'1px solid #d1d9e0', color:'#374151', borderRadius:6,
            padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          <RefreshCw size={11} style={{ animation: checking ? 'spin 0.8s linear infinite':'none' }}/>
          {checking ? 'Checking...' : 'Check Status'}
        </button>
        {!confirmDismiss ? (
          <button onClick={() => setConfirmDismiss(true)}
            style={{ display:'flex', alignItems:'center', gap:5, background:'white',
              border:'1px solid #fca5a5', color:'#dc2626', borderRadius:6,
              padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
            <X size={11}/> Dismiss
          </button>
        ) : (
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
            <span style={{ fontSize:11, color:'#C45A4A' }}>Remove from dashboard?</span>
            <button onClick={dismissOrder} disabled={dismissing}
              style={{ background:'#dc2626', color:'white', border:'none', borderRadius:6,
                padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {dismissing ? 'Removing...' : 'Yes, remove'}
            </button>
            <button onClick={() => setConfirmDismiss(false)}
              style={{ background:'white', color:'#374151', border:'1px solid #d1d9e0', borderRadius:6,
                padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        )}
        {msg && <span style={{ fontSize:11, color: msg.startsWith('✅') ? '#15803d' : msg.startsWith('❌') ? '#dc2626' : '#C45A4A' }}>{msg}</span>}
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
  const color     = isExpired ? '#ef4444' : isWarn ? '#E8897A' : '#16a34a'

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
          <circle cx="41" cy="41" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
          <circle cx="41" cy="41" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={animated ? offset : circ}
            style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)',
              filter: !isExpired && !isWarn ? 'drop-shadow(0 0 4px rgba(22,163,74,0.35))' : 'none' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:18, fontWeight:800, color: isExpired?'#ef4444':color,
            fontFamily:'monospace', lineHeight:1, letterSpacing:'-0.5px',
            transition:'all 0.3s' }}>
            {isExpired ? '!' : timeLeft.d}
          </div>
          <div style={{ fontSize:8, color:'#94a3b8', marginTop:2, letterSpacing:'0.4px', textTransform:'uppercase' }}>
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
              background:'#f8fafc', borderRadius:5, padding:'2px 5px', minWidth:28 }}>
              <span style={{ fontSize:11, fontWeight:800, fontFamily:'monospace',
                color: isWarn ? '#E8897A' : '#1A7A72', lineHeight:1,
                transition:'all 0.3s' }}>{val}</span>
              <span style={{ fontSize:7, color:'#cbd5e1', letterSpacing:'0.3px' }}>{label}</span>
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
  const certColor = isExpired ? '#ef4444' : isWarn ? '#E8897A' : '#16a34a'

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }) : '—'
  const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : '—'

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t) }, [])

  return (
    <div style={{ padding:'16px 18px', borderBottom:'0.5px solid #f1f5f9' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px' }}>
          Validity timeline
        </span>
        <span style={{ fontSize:11, fontWeight:600,
          color: isExpired ? '#dc2626' : isWarn ? '#E8897A' : '#16a34a' }}>
          {isExpired
            ? '⚠ Certificate expired'
            : isWarn
            ? `⚠ Expires in ${dLeft} day${dLeft!==1?'s':''}`
            : `Next reissue in ${dLeft} days`}
        </span>
      </div>

      {/* Bar — full subscription width */}
      <div style={{ position:'relative', height:20, borderRadius:6, overflow:'hidden',
        background:'#f1f5f9', border:'0.5px solid #e2e8f0' }}>

        {/* Green "Current" cert segment */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0,
          width: animated ? certPct+'%' : '0%',
          background: certColor,
          borderRadius:'6px 0 0 6px',
          transition:'width 1.4s cubic-bezier(0.16,1,0.3,1)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {certPct > 20 && (
            <span style={{ fontSize:9, fontWeight:700, color:'white',
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
            <span style={{ fontSize:9, fontWeight:700, color:'#1A7A72',
              letterSpacing:'0.5px' }}>
              AVAILABLE
            </span>
          )}
        </div>

        {/* Today marker */}
        <div style={{ position:'absolute', top:0, bottom:0, width:3,
          left: animated ? `calc(${todayPct}% - 1.5px)` : '0%',
          background:'#0f172a', borderRadius:2, zIndex:5,
          boxShadow:'0 0 0 1.5px white, 0 1px 4px rgba(0,0,0,0.3)',
          transition:'left 1.4s cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>

      {/* Three date labels below bar */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', marginTop:8 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:600, color:'#64748b', fontFamily:'monospace' }}>
            {fmtShort(issuedAt)}
          </div>
          <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>SSL valid from</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700,
            color: isWarn ? '#E8897A' : isExpired ? '#ef4444' : '#0f172a',
            fontFamily:'monospace' }}>
            {fmtShort(expiresAt)}
          </div>
          <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>SSL valid till</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#1A7A72', fontFamily:'monospace' }}>
            {fmtShort(subEnd)}
          </div>
          <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>Subscription ends</div>
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
  // { action, steps: [{label, status:'pending'|'done'|'active'|'error', detail}], pollTimer }

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

    try {
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action, cert_id: cert.id, triggered_by: 'manual', ...extra })
      })
      const d = await r.json()

      if (!d.ok) {
        setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, { status: 'error', detail: d.error || 'Request failed' }) }))
        setMsg(''); setBusy(false); return
      }

      // Steps 0→1→2 done from API response
      setProgress(p => {
        let steps = [...p.steps]
        steps = updateStep(steps, 0, { status: 'done', detail: isReissue ? `GGS order #${cert.ggs_order_id}` : `New GGS order placed` })
        steps = updateStep(steps, 1, { status: 'done', detail: 'RSA-2048 key pair generated' })
        if (d.dcv_txt_value) {
          steps = updateStep(steps, 2, { status: 'done', detail: `${d.dcv_txt_name || '_pki-validation'} → ${d.dcv_txt_value.slice(0,24)}…` })
        } else {
          steps = updateStep(steps, 2, { status: 'done', detail: 'TXT record updated in DNS' })
        }
        steps = updateStep(steps, 3, { status: 'active', detail: 'Waiting for GGS to confirm DCV…' })
        return { ...p, steps }
      })

      // If instantly active (unlikely but possible)
      if (d.status === 'active') {
        setProgress(p => {
          let steps = [...p.steps]
          steps = updateStep(steps, 3, { status: 'done', detail: 'DCV passed' })
          steps = updateStep(steps, 4, { status: 'done', detail: `Expires ${d.new_expiry || '199 days'}` })
          steps = updateStep(steps, 5, { status: 'done', detail: d.dispatch?.method ? `Sent to ${d.dispatch.method}` : 'Install job queued' })
          return { ...p, steps }
        })
        loadHistory(); setBusy(false); return
      }

      // Poll ssl_orders for this cert every 5 seconds until active
      const pollStart = Date.now()
      const timer = setInterval(async () => {
        try {
          // Check if the new pending order for this cert/domain has become active
          const { data: orders } = await supabase
            .from('ssl_orders')
            .select('id, status, ggs_order_id, valid_till, install_method')
            .eq('user_id', session.user.id)
            .eq('domain', cert.domain)
            .order('created_at', { ascending: false })
            .limit(1)
          const latest = orders?.[0]

          // Timeout after 4 minutes
          if (Date.now() - pollStart > 4 * 60 * 1000) {
            clearInterval(timer)
            setProgress(p => ({
              ...p, pollTimer: null,
              steps: updateStep(p.steps, 3, { status: 'active', detail: 'Still validating — GGS may take a few more minutes' })
            }))
            setBusy(false)
            return
          }

          if (latest?.status === 'active') {
            clearInterval(timer)
            setProgress(p => {
              let steps = [...p.steps]
              steps = updateStep(steps, 3, { status: 'done', detail: 'DCV passed ✓' })
              steps = updateStep(steps, 4, { status: 'done', detail: latest.valid_till ? `Expires ${new Date(latest.valid_till).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}` : 'Certificate active' })
              steps = updateStep(steps, 5, { status: 'active', detail: 'Dispatching to your server…' })
              return { ...p, pollTimer: null, steps }
            })
            // Check agent/cpanel dispatch after short delay
            setTimeout(async () => {
              const { data: certRow } = await supabase.from('certificates').select('install_method, certbind_status').eq('id', cert.id).single()
              setProgress(p => {
                const method = certRow?.install_method
                let steps = updateStep(p.steps, 5, {
                  status: 'done',
                  detail: method === 'agent' ? '🖥 Sent to VPS agent' : method === 'cpanel' ? '🌐 Sent to cPanel' : 'No server connected — install manually'
                })
                return { ...p, steps }
              })
              loadHistory()
              setBusy(false)
            }, 3000)
          } else if (latest?.status === 'dv_pending') {
            // Still waiting — update detail with time elapsed
            const elapsed = Math.round((Date.now() - pollStart) / 1000)
            setProgress(p => ({
              ...p,
              steps: updateStep(p.steps, 3, { status: 'active', detail: `GGS checking DNS… ${elapsed}s elapsed` })
            }))
          }
        } catch {}
      }, 5000)

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
      issued:   { bg:'#dcfce7', color:'#16a34a', label:'Issued' },
      active:   { bg:'#dcfce7', color:'#16a34a', label:'Active' },
      installed:{ bg:'#dcfce7', color:'#16a34a', label:'Installed' },
      pending:  { bg:'#fef9c3', color:'#854d0e', label:'Pending DV' },
      pending_validation: { bg:'#fef9c3', color:'#854d0e', label:'Pending DV' },
      failed:   { bg:'#fee2e2', color:'#dc2626', label:'Failed' },
    }
    const t = map[s] || { bg:'#f1f5f9', color:'#64748b', label: s||'—' }
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
    if (status === 'done')    return <span style={{color:'#1A7A72',fontWeight:700}}>✓</span>
    if (status === 'error')   return <span style={{color:'#dc2626',fontWeight:700}}>✗</span>
    if (status === 'active')  return <span style={{display:'inline-block',width:12,height:12,borderRadius:'50%',border:'2px solid #3DBFB0',borderTopColor:'transparent',animation:'spin .7s linear infinite',verticalAlign:'middle'}}/>
    return <span style={{color:'#D8D0C0',fontWeight:700}}>○</span>
  }

  return (
    <div style={{ marginTop:4 }}>
      {/* Progress tracker — shown while action is running */}
      {progress && (
        <div style={{
          marginBottom:16, borderRadius:10,
          border:'1px solid #A8E6DE',
          background:'#E8F8F6', overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:'10px 14px',
            borderBottom:'1px solid #A8E6DE',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span style={{fontSize:12,fontWeight:700,color:'#1A7A72'}}>
              {progress.action === 'reissue' ? '🔄 Reissue in progress' : '♻️ Renewal in progress'}
            </span>
            {!busy && (
              <button onClick={() => setProgress(null)} style={{
                background:'none',border:'none',cursor:'pointer',
                fontSize:11,color:'#7A9E9B',fontFamily:'inherit',
              }}>Dismiss</button>
            )}
          </div>
          {/* Steps */}
          <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
            {progress.steps.map((step, i) => (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:16,flexShrink:0,paddingTop:1,textAlign:'center',fontSize:12}}>
                  {stepIcon(step.status)}
                </div>
                <div>
                  <div style={{
                    fontSize:12,fontWeight:600,
                    color: step.status==='done' ? '#1A7A72' : step.status==='error' ? '#dc2626' : step.status==='active' ? '#0F5750' : '#7A9E9B',
                  }}>
                    {step.label}
                  </div>
                  {step.detail && (
                    <div style={{fontSize:10,color:'#7A9E9B',marginTop:2,fontFamily:'monospace'}}>
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Footer note */}
          {busy && (
            <div style={{
              padding:'8px 14px',
              borderTop:'1px solid #A8E6DE',
              fontSize:11,color:'#3D5C59',
            }}>
              ⏱ GGS DNS validation typically takes 1–3 minutes. This page will update automatically.
            </div>
          )}
          {!busy && progress.steps.every(s => s.status === 'done') && (
            <div style={{
              padding:'8px 14px',
              borderTop:'1px solid #A8E6DE',
              fontSize:11,color:'#1A7A72',fontWeight:600,
            }}>
              ✓ All steps complete — your certificate has been reissued and dispatched to your server.
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--v2-border)', marginBottom:14 }}>
        {[['reissues','Reissue History'], ['renewals','Renewals']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontSize:11, fontWeight:500, padding:'5px 14px', border:'none', background:'none',
            cursor:'pointer', fontFamily:'inherit',
            color: tab===k ? '#1A7A72' : 'var(--v2-text-3)',
            borderBottom: tab===k ? '2px solid #1A7A72' : '2px solid transparent',
            marginBottom:-1
          }}>
            {l}
            {k==='reissues' && reissues.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? '#1A7A72' : '#e2e8f0', color: tab===k ? 'white' : '#64748b' }}>
                {reissues.length}
              </span>
            )}
            {k==='renewals' && renewals.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? '#1A7A72' : '#e2e8f0', color: tab===k ? 'white' : '#64748b' }}>
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
            <div style={{ fontSize:12, color:'var(--v2-text-3)', padding:'12px 0', textAlign:'center' }}>
              No reissues yet. Use the Reissue button above to regenerate this certificate.
            </div>
          ) : reissues.map((r, i) => (
            <div key={r.id} style={{ border:'1px solid var(--v2-border)', borderRadius:8, marginBottom:8, overflow:'hidden' }}>
              {/* Row header — always visible */}
              <div onClick={() => toggleExpand(r.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                  background: expanded[r.id] ? 'var(--v2-surface-2)' : 'white',
                  cursor:'pointer', userSelect:'none' }}>
                {/* Reissue number badge */}
                <div style={{ width:26, height:26, borderRadius:6, background:'#E8F8F6',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#1A7A72' }}>R{i+1}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)', display:'flex', alignItems:'center', gap:8 }}>
                    Reissue #{r.reissue_number||i+1}
                    {statusBadge(r.status)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>
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
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', marginBottom:12 }}>
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
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:12, color:'var(--v2-text)', fontFamily: label==='GGS Order' ? 'monospace' : 'inherit' }}>{String(val)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Cert PEM preview */}
                  {r.cert_pem && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>Reissued Certificate PEM</div>
                      <div style={{ background:'#0f172a', borderRadius:6, padding:'10px 12px', position:'relative' }}>
                        <pre style={{ fontSize:10, color:'#94a3b8', margin:0, overflow:'hidden', maxHeight:80, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                          {r.cert_pem.slice(0,300)}...
                        </pre>
                        <CopyBtn text={r.cert_pem} label="Copy PEM"/>
                      </div>
                    </div>
                  )}

                  {/* Auto-install details */}
                  {(r.auto_install_status || r.auto_install_error) && (
                    <div style={{ marginTop:10, padding:'8px 10px', borderRadius:6,
                      background: r.auto_install_status==='success' ? '#E8F8F6' : '#fef2f2',
                      border: '1px solid '+(r.auto_install_status==='success' ? '#A8E6DE' : '#fecaca') }}>
                      <div style={{ fontSize:11, fontWeight:600, color: r.auto_install_status==='success' ? '#16a34a' : '#dc2626' }}>
                        Auto-install: {r.auto_install_status}
                      </div>
                      {r.auto_install_error && <div style={{ fontSize:11, color:'#dc2626', marginTop:2 }}>{r.auto_install_error}</div>}
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
            <div style={{ fontSize:12, color:'var(--v2-text-3)', padding:'12px 0', textAlign:'center' }}>
              No renewals yet. Use the Renew button to place a new 12-month order.
            </div>
          ) : renewals.map(r => (
            <div key={r.id} style={{ padding:'10px 14px', borderRadius:8, marginBottom:8,
              background:'var(--v2-surface)', border:'1px solid var(--v2-border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)' }}>
                  Renewal · GGS #{r.ggs_order_id||'—'}
                </div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4,
                  background: r.status==='active' ? '#dcfce7' : '#f1f5f9',
                  color: r.status==='active' ? '#16a34a' : '#64748b' }}>{r.status}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
                {[
                  ['Created',    fmtDate(r.created_at)],
                  ['Valid from', r.issued_at  ? fmtDate(r.issued_at)  : '—'],
                  ['Expires',    r.expires_at ? fmtDate(r.expires_at) : '—'],
                  ['Version',    'v'+(r.cert_version||'—')],
                ].map(([l,v]) => (
                  <div key={l}>
                    <span style={{ fontSize:10, color:'var(--v2-text-3)' }}>{l}: </span>
                    <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-text)' }}>{v}</span>
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
        style={{ display:'flex', alignItems:'center', gap:5, background:'#E8897A', color:'white',
          border:'none', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:600,
          cursor:scanning?'wait':'pointer', fontFamily:'inherit', opacity:scanning?0.8:1 }}>
        {scanning
          ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Scanning…</>
          : <><Shield size={11}/> Scan PQC</>}
      </button>
      {result && (
        <span style={{ fontSize:11, color: result.ok ? '#16a34a' : '#dc2626',
          background: result.ok ? '#E8F8F6' : '#fef2f2',
          border: `0.5px solid ${result.ok ? '#A8E6DE' : '#fecaca'}`,
          borderRadius:5, padding:'3px 8px' }}>
          {result.ok ? `✓ ${result.scanned} cert${result.scanned!==1?'s':''} scanned` : `✗ ${result.error||'Failed'}`}
        </span>
      )}
    </div>
  )
}

// ── PQC Readiness row ─────────────────────────────────────────────────
const PQC_RISK_MAP = {
  ready:  { color:'#16a34a', bg:'#E8F8F6', border:'#A8E6DE', label:'PQC Ready',     icon:'✓' },
  low:    { color:'#2563eb', bg:'#E8F8F6', border:'#A8E6DE', label:'Low risk',       icon:'~' },
  medium: { color:'#E8897A', bg:'#FDF0EE', border:'#F2C4BC', label:'Medium risk',    icon:'!' },
  high:   { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'High risk',      icon:'✗' },
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
        onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
        onMouseLeave={e=>e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'#f5f3ff',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={16} color="#E8897A"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>
              Post-quantum readiness
            </div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1 }}>
              {cert.key_algorithm
                ? <span>Algorithm: <strong style={{color:'var(--v2-text)'}}>{cert.key_algorithm}</strong>{risk && <span> · click to {open?'collapse':'expand'}</span>}</span>
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
                color:'#E8897A', background:'#f5f3ff', border:'0.5px solid #ddd6fe',
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
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  {[
                    ['Algorithm',  d.algorithm || '—'],
                    ['Key size',   d.bits ? `${d.bits} bits` : '—'],
                    ['Risk level', d.label || '—'],
                    ['Deadline',   d.deadline || '—'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:'var(--v2-bg)', borderRadius:7, padding:'9px 11px', border:'0.5px solid var(--v2-border)' }}>
                      <div style={{ fontSize:10, color:'var(--v2-text-3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:500, color: k==='Risk level'?riskDef.color:'var(--v2-text)',
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
                <div style={{ fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6, borderTop:'0.5px solid var(--v2-border)', paddingTop:10, marginTop:4 }}>
                  NIST finalized ML-DSA (CRYSTALS-Dilithium), SLH-DSA (SPHINCS+), and ML-KEM (CRYSTALS-Kyber) in August 2024.
                  RSA and ECDSA will be deprecated for sensitive data by 2030–2035.{' '}
                  <span style={{ color:'#E8897A', cursor:'pointer' }}
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

  const gradeColor = { A:'#16a34a', B:'#65a30d', C:'#E8897A', D:'#ea580c', F:'#dc2626' }
  const grade = cert.tls_grade
  const score = cert.tls_score || 0
  const color = gradeColor[grade] || '#64748b'

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
        onMouseEnter={e => e.currentTarget.style.background='#E8F8F6'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'#E8F8F6',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Activity size={16} color="#1A7A72"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>Check TLS posture</div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1 }}>
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
              color:'#1A7A72', background:'#E8F8F6', border:'0.5px solid #A8E6DE',
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
              <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)' }}>Overall score</span>
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
              padding:'7px 0', borderBottom:'0.5px solid var(--v2-border)' }}
              className="tls-check-row">
              <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1,
                background: check.pass ? '#E8F8F6' : '#fef2f2',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {check.pass
                  ? <Check size={10} color="#16a34a"/>
                  : <X size={10} color="#dc2626"/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500,
                  color: check.pass ? 'var(--v2-text)' : '#dc2626' }}>
                  {checkLabels[key] || key.replace(/_/g,' ')}
                  {check.points > 0 && (
                    <span style={{ fontSize:10, fontWeight:400, color:'var(--v2-text-3)',
                      marginLeft:6 }}>+{check.points}pts</span>
                  )}
                </div>
                <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1, lineHeight:1.5 }}>
                  {check.detail}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6 }}>
            Checks: HTTPS accessibility, HSTS header strength, security headers, certificate validity, and trusted CA verification.
          </div>
        </div>
      )}
    </div>
  )
}

function CertDetail({ cert, onClose, onDelete, onInstall, onCpanel, nav, onRefresh, session }) {
  const days = daysLeft(cert.expires_at)
  const [activeTab, setActiveTab] = useState('details')

  const [keyTimer,   setKeyTimer]  = useState(0)     // countdown seconds remaining
  const [keyCopied,  setKeyCopied] = useState(false)
  const [keyTimerRef, setKeyTimerRef] = useState(null)
  const [delConfirm, setDel]       = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling]       = useState(false)
  const [cancelMsg, setCancelMsg]         = useState('')
  const [keyDelConfirm, setKDC]    = useState(false)
  const [keyDeleting, setKDing]    = useState(false)
  const [keyChecks, setKC]         = useState({ downloaded:false, installed:false, understand:false })
  const [keyDeleted, setKD]        = useState(!cert.private_key_pem)
  const [refreshing, setRefreshing]= useState(false)
  const [refreshMsg, setRefreshMsg]= useState('')
  const allChecked = keyChecks.downloaded && keyChecks.installed && keyChecks.understand
  const certHistoryRef = useRef(null)

  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const statusColor = isExpired ? '#ef4444' : isWarn ? '#E8897A' : '#16a34a'
  const statusBg    = isExpired ? '#fef2f2' : isWarn ? '#FDF0EE' : '#E8F8F6'
  const statusBorder= isExpired ? '#fecaca' : isWarn ? '#F2C4BC' : '#A8E6DE'
  const statusLabel = isExpired ? 'Expired' : isWarn ? days+'d left' : 'Active'

  const doDeleteKey = async () => {
    setKDing(true)
    await supabase.from('certificates').update({ private_key_pem: null }).eq('id', cert.id)
    setKDing(false); setKD(true); setKDC(false)
  }
  const doRefresh = async () => {
    setRefreshing(true); setRefreshMsg('')
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const { data: order } = await supabase.from('ssl_orders')
        .select('id').eq('domain', cert.domain).eq('user_id', cert.user_id)
        .order('updated_at', { ascending: false }).limit(1).single()
      if (!order) { setRefreshMsg('No linked order found'); setRefreshing(false); return }
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+sess.access_token },
        body: JSON.stringify({ action: 'check_status', order_id: order.id })
      })
      const d = await r.json()
      setRefreshMsg(d.ok ? 'Synced — '+(d.ggs_status||'active') : d.error||'Error')
      if (d.ok) setTimeout(() => onRefresh(), 1000)
    } catch(e) { setRefreshMsg(e.message) }
    setRefreshing(false)
  }

  // ── Cancel order (within 30 days) ─────────────────────────────────────────
  const daysSinceIssue = cert.issued_at
    ? Math.floor((Date.now() - new Date(cert.issued_at).getTime()) / (1000*60*60*24))
    : 999
  const canCancel = daysSinceIssue <= 30 && cert.status === 'active' && !!cert.ggs_order_id

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
      if (d.ok) {
        setCancelMsg('Cancelled. Refund requested with GoGetSSL.')
        setCancelConfirm(false)
        setTimeout(() => onRefresh && onRefresh(), 2000)
      } else {
        setCancelMsg('Error: ' + (d.error || 'Unknown error'))
        setCancelConfirm(false)
      }
    } catch(e) { setCancelMsg('Error: ' + e.message); setCancelConfirm(false) }
    setCancelling(false)
  }

  // ── Inline copy button ────────────────────────────────────────────────────
  function InlineCopy({ text }) {
    const [ok, setOk] = useState(false)
    return (
      <button onClick={() => { try { navigator.clipboard.writeText(text) } catch(e) {} setOk(true); setTimeout(() => setOk(false), 1800) }}
        style={{ background:'none', border:'0.5px solid var(--v2-border)', borderRadius:4, cursor:'pointer',
          padding:'2px 6px', fontSize:10, color: ok ? '#16a34a' : 'var(--v2-text-3)',
          fontFamily:'inherit', transition:'all 0.12s', display:'inline-flex', alignItems:'center', gap:3,
          ...(ok ? { borderColor:'#A8E6DE', background:'#E8F8F6' } : {}) }}>
        {ok ? <><Check size={9}/></> : <><Copy size={9}/></>}
      </button>
    )
  }

  // ── Field row ─────────────────────────────────────────────────────────────
  function FieldRow({ label, value, copyable, accent }) {
    if (!value) return null
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0',
        borderBottom:'0.5px solid var(--v2-border)' }}>
        <span style={{ fontSize:12, color:'var(--v2-text-2)' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:12, fontFamily:'monospace', color: accent ? statusColor : 'var(--v2-text)',
            textAlign:'right', wordBreak:'break-all', maxWidth:200 }}>{value}</span>
          {copyable && <InlineCopy text={value}/>}
        </div>
      </div>
    )
  }

  // ── Field group ───────────────────────────────────────────────────────────
  function FieldGroup({ title, children }) {
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase',
          letterSpacing:'0.5px', marginBottom:8, paddingBottom:6, borderBottom:'0.5px solid var(--v2-border)' }}>
          {title}
        </div>
        {children}
      </div>
    )
  }

  // ── Action row ────────────────────────────────────────────────────────────
  function ActionRow({ icon: Icon, iconColor, iconBg, hoverBorder, hoverBg, title, subtitle, onClick, disabled }) {
    const [hov, setHov] = useState(false)
    return (
      <div onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 14px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
          border:'0.5px solid '+(hov && !disabled ? hoverBorder : 'var(--v2-border)'),
          background: hov && !disabled ? hoverBg : 'var(--v2-bg)',
          transition:'all 0.15s', opacity: disabled ? 0.5 : 1, marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:iconBg,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={16} color={iconColor}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>{title}</div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1, lineHeight:1.4 }}>{subtitle}</div>
          </div>
        </div>
        <ChevronRight size={15} color="var(--v2-text-3)"
          style={{ transition:'transform 0.15s', transform: hov && !disabled ? 'translateX(3px)' : 'none' }}/>
      </div>
    )
  }

  const period = cert._order?.period
  const periodLabel = '1 year'

  return (
    <div style={{ background:'white', border:'0.5px solid #e2e8f0', borderRadius:14,
      overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.07)',
      position:'sticky', top:20, animation:'fadeSlideUp 0.3s ease both' }}>

      {/* ── Hero header ─── */}
      <div style={{ padding:'20px 20px 16px', background:'linear-gradient(135deg, #f8fafc 0%, white 100%)',
        borderBottom:'0.5px solid #f1f5f9' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
          <RingGauge days={days} expiresAt={cert.expires_at} issuedAt={cert.issued_at}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:14, fontWeight:700, wordBreak:'break-all',
                color:'#0f172a', fontFamily:'monospace', lineHeight:1.3 }}>{cert.domain}</span>
              <button onClick={onClose}
                style={{ background:'#f8fafc', border:'0.5px solid #e2e8f0', cursor:'pointer',
                  color:'#94a3b8', padding:'5px', borderRadius:7, display:'flex', flexShrink:0,
                  marginLeft:8, transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='#dc2626';e.currentTarget.style.borderColor='#fecaca'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#94a3b8';e.currentTarget.style.borderColor='#e2e8f0'}}>
                <X size={13} strokeWidth={2}/>
              </button>
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>
              Issued {fmtDate(cert.issued_at || cert.created_at)}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700,
                padding:'3px 10px', borderRadius:20, background:statusBg,
                border:'0.5px solid '+statusBorder, color:statusColor }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:statusColor,
                  animation: !isExpired && !isWarn ? 'v3pulse 2s ease infinite' : 'none',
                  boxShadow: !isExpired && !isWarn ? '0 0 0 2px rgba(22,163,74,0.25)' : 'none' }}/>
                {statusLabel}
              </span>
              <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:20,
                background:'#E8F8F6', color:'#185FA5', border:'0.5px solid #B5D4F4' }}>
                RapidSSL
              </span>
              <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:20,
                background:'#f8fafc', color:'#475569', border:'0.5px solid #e2e8f0' }}>
                {cert._order?.product_name || cert.cert_type || 'RapidSSL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric strip ─── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        borderBottom:'0.5px solid #f1f5f9', background:'#fafbfc' }}>
        {(() => {
          // ── Date logic ─────────────────────────────────────────────────
          //
          // CERTIFICATE (DV cert, ~6 months):
          //   issued_at  → expires_at (e.g. May 16 → Nov 30 2026)
          //   Auto-REISSUE = 1 day before cert.expires_at = Nov 29 2026
          //   Fresh DV cert issued, agents install it before old one dies.
          //
          // ORDER/SUBSCRIPTION (12 months):
          //   Order placed on issued_at, runs for `period` months.
          //   Order expires = issued_at + period months = May 16 2027
          //   Auto-RENEWAL = 1 day before that = May 15 2027
          //   Brand new order placed, completely new cert record.
          //
          // cert._order.valid_till is NOT order expiry — RapidSSL sets it
          // to cert expiry. Real order expiry = issued_at + period months.

          const daysLeftVal = Math.max(0, days ?? 0)
          const certExpires = cert.expires_at ? new Date(cert.expires_at) : null

          // Order expires = issued_at + period (months). Never use valid_till.
          const orderPeriodMonths = cert._order?.period || 12
          const orderExpires = cert.issued_at
            ? (() => {
                const d = new Date(cert.issued_at)
                d.setMonth(d.getMonth() + orderPeriodMonths)
                return d
              })()
            : null

          const fmt = d => d
            ? d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
            : '—'

          // Reissue = 1 day before cert.expires_at
          const reissueDate    = certExpires  ? new Date(certExpires.getTime()  - 86400000) : null
          const daysToReissue  = reissueDate  ? Math.ceil((reissueDate.getTime()  - Date.now()) / 86400000) : null
          const reissueOverdue = daysToReissue !== null && daysToReissue <= 0

          // Renewal = 1 day before order expires (issued_at + period months)
          const renewalDate    = orderExpires ? new Date(orderExpires.getTime() - 86400000) : null
          const daysToRenewal  = renewalDate  ? Math.ceil((renewalDate.getTime()  - Date.now()) / 86400000) : null
          const renewalOverdue = daysToRenewal !== null && daysToRenewal <= 0

          return [
            {
              top:    String(daysLeftVal),
              bottom: 'Days left',
              color:  statusColor,
              mono:   true,
              tip:    null,
            },
            {
              top:    reissueOverdue ? 'Overdue' : fmt(reissueDate),
              bottom: 'Auto-reissue',
              color:  reissueOverdue ? '#dc2626' : '#E8897A',
              mono:   false,
              tip:    reissueDate
                ? `Fires ${fmt(reissueDate)} — 1 day before cert expires (${fmt(certExpires)}). Fresh DV cert issued automatically, pushed to all agents.`
                : '',
            },
            {
              top:    renewalOverdue ? 'Overdue' : fmt(renewalDate),
              bottom: 'Auto-renewal',
              color:  renewalOverdue ? '#dc2626' : '#1A7A72',
              mono:   false,
              tip:    renewalDate
                ? `Fires ${fmt(renewalDate)} — 1 day before your ${orderPeriodMonths}-month order expires (${fmt(orderExpires)}). New annual order placed automatically.`
                : '',
            },
          ].map(({ top, bottom, color, mono, tip }, i) => (
            <div key={i} title={tip||''} style={{ padding:'12px 16px',
              borderRight: i < 2 ? '0.5px solid #f1f5f9' : 'none',
              cursor: tip ? 'help' : 'default' }}>
              <div style={{ fontSize: i===0 ? 20 : 13, fontWeight:800, color,
                fontFamily: mono ? 'monospace' : 'inherit',
                letterSpacing: i===0 ? '-0.5px' : '-0.2px', lineHeight:1.2 }}>
                {top}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:4 }}>
                <span style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.4px' }}>{bottom}</span>
                {tip && <span style={{ fontSize:11, color:'#cbd5e1', lineHeight:1 }}>ⓘ</span>}
              </div>
            </div>
          ))
        })()}
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {cert.issued_at && cert.expires_at && (
        <ValidityTimeline
          issuedAt={cert.issued_at}
          expiresAt={cert.expires_at}
          orderPeriodMonths={cert._order?.period || 12}
        />
      )}

      {/* ── Tabs ─── */}
      <div style={{ display:'flex', padding:'0 16px', borderBottom:'0.5px solid #f1f5f9', gap:0 }}>
        {['details','actions','files','history','embed'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ fontSize:11, fontWeight:700, padding:'11px 14px',
              background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
              color: activeTab===t ? '#1A7A72' : '#94a3b8',
              borderBottom:'2px solid '+(activeTab===t ? '#1A7A72' : 'transparent'),
              marginBottom:-1, transition:'all 0.15s', textTransform:'capitalize',
              letterSpacing:'0.3px' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Details ─────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div style={{ padding:'14px 18px' }}>
          <FieldGroup title="Certificate">
            <FieldRow label="Domain"  value={cert.common_name || cert.domain} copyable/>
            <FieldRow label="Status"  value={statusLabel} accent/>
            <FieldRow label="Product" value={cert._order?.product_name || cert.cert_type || 'RapidSSL Standard'}/>
            <FieldRow label="Validity" value={periodLabel}/>
            <FieldRow label="DCV method" value={(cert.dcv_method || 'dns').toUpperCase()}/>
          </FieldGroup>
          <FieldGroup title="Dates">
            <FieldRow label="Issued"  value={fmtDate(cert.issued_at || cert.created_at)}/>
            <FieldRow label="Expires" value={fmtDate(cert.expires_at)}/>
          </FieldGroup>
          <FieldGroup title="Order">
            <FieldRow label="API order ID" value={cert.ggs_order_id ? String(cert.ggs_order_id) : null} copyable/>
            {cert._order?.ggs_invoice_id && <FieldRow label="Invoice ID" value={String(cert._order.ggs_invoice_id)}/>}
            <FieldRow label="Admin name"  value={cert._order ? [cert._order.admin_first_name, cert._order.admin_last_name].filter(Boolean).join(' ') : null}/>
            <FieldRow label="Admin email" value={cert._order?.admin_email} copyable/>
            <FieldRow label="Admin phone" value={cert._order?.admin_phone}/>
          </FieldGroup>
        </div>
      )}

      {/* ── Tab: Actions ─────────────────────────────────────────────────── */}
      {activeTab === 'actions' && (
        <div style={{ padding:'14px 18px' }}>
          {refreshMsg && (
            <div style={{ fontSize:12, padding:'8px 10px', borderRadius:6, marginBottom:12,
              background: refreshMsg.includes('Error') ? '#fef2f2' : '#E8F8F6',
              color: refreshMsg.includes('Error') ? '#dc2626' : '#16a34a',
              border:'0.5px solid '+(refreshMsg.includes('Error') ? '#fecaca' : '#A8E6DE') }}>
              {refreshMsg}
            </div>
          )}
          <ActionRow icon={RotateCcw} iconColor="#16a34a" iconBg="#E8F8F6"
            hoverBorder="#A8E6DE" hoverBg="#E8F8F6"
            title="Reissue certificate" subtitle="New cert, same order period · auto DNS"
            onClick={() => certHistoryRef.current?.doAction('reissue')}
            disabled={!session}/>
          <ActionRow icon={RefreshCw} iconColor="#2563eb" iconBg="#E8F8F6"
            hoverBorder="#A8E6DE" hoverBg="#E8F8F6"
            title="Renew for another year" subtitle="New GGS order · new cert row"
            onClick={() => certHistoryRef.current?.doAction('renew')}
            disabled={!session}/>
          <ActionRow icon={Server} iconColor="#E8897A" iconBg="#f5f3ff"
            hoverBorder="#ddd6fe" hoverBg="#f5f3ff"
            title="Install on server" subtitle="VPS agent or cPanel wizard"
            onClick={() => onInstall(cert)}/>
          <ActionRow icon={RefreshCw} iconColor="#E8897A" iconBg="#FDF0EE"
            hoverBorder="#F2C4BC" hoverBg="#FDF0EE"
            title={refreshing ? 'Syncing...' : 'Sync from RapidSSL'}
            subtitle={refreshing ? 'Checking status...' : 'Pull latest order status'}
            onClick={doRefresh} disabled={refreshing}/>
          <TlsPostureRow cert={cert} onRefresh={onRefresh}/>
          <PqcRow cert={cert} onRefresh={onRefresh}/>
          {/* Cancel order — only within 30 days of issue */}
          {canCancel && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:8,
              border:'0.5px solid #FECACA', background:'#FFF5F5' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#B91C1C' }}>Cancel & refund this order</div>
                  <div style={{ fontSize:11, color:'#EF4444', marginTop:1 }}>
                    Within 30-day window · {30 - daysSinceIssue} day{30 - daysSinceIssue !== 1 ? 's' : ''} remaining · GGS #{cert.ggs_order_id}
                  </div>
                </div>
                {!cancelConfirm && !cancelMsg && (
                  <button onClick={() => setCancelConfirm(true)}
                    style={{ fontSize:11, fontWeight:600, color:'#B91C1C', background:'#FEE2E2',
                      border:'0.5px solid #FECACA', borderRadius:6, padding:'5px 12px',
                      cursor:'pointer', fontFamily:'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FECACA'}
                    onMouseLeave={e => e.currentTarget.style.background='#FEE2E2'}>
                    Cancel order
                  </button>
                )}
              </div>
              {cancelMsg && (
                <div style={{ fontSize:11, padding:'6px 10px', borderRadius:5, marginTop:4,
                  background: cancelMsg.includes('Error') ? '#FEE2E2' : '#D1FAE5',
                  color: cancelMsg.includes('Error') ? '#B91C1C' : '#065F46' }}>
                  {cancelMsg}
                </div>
              )}
              {cancelConfirm && !cancelMsg && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                  <div style={{ fontSize:11, color:'#B91C1C', flex:1 }}>
                    This will cancel GGS order #{cert.ggs_order_id} and request a refund. Are you sure?
                  </div>
                  <button onClick={doCancel} disabled={cancelling}
                    style={{ fontSize:11, fontWeight:600, color:'white', background:'#DC2626',
                      border:'none', borderRadius:6, padding:'5px 12px',
                      cursor: cancelling ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: cancelling ? 0.7 : 1 }}>
                    {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                  </button>
                  <button onClick={() => setCancelConfirm(false)} disabled={cancelling}
                    style={{ fontSize:11, color:'#6B7280', background:'none', border:'0.5px solid #D1D5DB',
                      borderRadius:6, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                    Keep it
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
            {!delConfirm
              ? <button onClick={() => setDel(true)}
                  style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--v2-text-3)',
                    background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:'2px 4px' }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--v2-text-3)'}>
                  <X size={11}/> Delete certificate
                </button>
              : <button onClick={() => onDelete(cert.id)}
                  style={{ fontSize:11, color:'white', background:'#ef4444', border:'none',
                    borderRadius:6, padding:'4px 12px', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                  Confirm delete
                </button>
            }
          </div>
          {/* SSL Vulnerability Scanner */}
          <VulnScanner domain={cert.domain} session={session} />
        </div>
      )}

      {/* ── Tab: Files ───────────────────────────────────────────────────── */}
      {activeTab === 'files' && (
        <div style={{ padding:'14px 18px' }}>
          {/* cert.pem */}
          {cert.cert_pem && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 12px', borderRadius:8, border:'0.5px solid var(--v2-border)',
              background:'var(--v2-surface-3)', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:7, background:'#E8F8F6',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <FileText size={14} color="#2563eb"/>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, fontFamily:'monospace', color:'var(--v2-text)' }}>cert.pem</div>
                  <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>Fullchain · 3 blocks</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <CopyBtn text={cert.cert_pem}/>
                <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.cert_pem, cert.domain+'-cert.pem')}>
                  <Download size={10}/> Save
                </button>
              </div>
            </div>
          )}
          {/* private key */}
          {cert.tls_grade && (
            <span style={{ fontSize:9, fontWeight:700, color: cert.tls_grade==='A'?'#16a34a':cert.tls_grade==='B'?'#65a30d':cert.tls_grade==='C'?'#E8897A':'#dc2626',
              background: cert.tls_grade==='A'?'#E8F8F6':cert.tls_grade==='B'?'#f7fee7':cert.tls_grade==='C'?'#FDF0EE':'#fef2f2',
              border: '0.5px solid currentColor', borderRadius:3, padding:'1px 5px', opacity:0.8 }}>
              {cert.tls_grade}
            </span>
          )}
          {cert.pqc_risk && (
            <span title={cert.key_algorithm || 'PQC check'} style={{ fontSize:9, fontWeight:700,
              color: cert.pqc_risk==='ready'?'#16a34a':cert.pqc_risk==='low'?'#2563eb':cert.pqc_risk==='medium'?'#E8897A':'#dc2626',
              background: cert.pqc_risk==='ready'?'#E8F8F6':cert.pqc_risk==='low'?'#E8F8F6':cert.pqc_risk==='medium'?'#FDF0EE':'#fef2f2',
              border: '0.5px solid currentColor', borderRadius:3, padding:'1px 5px', opacity:0.85 }}>
              {cert.pqc_risk==='ready'?'PQC✓':cert.pqc_risk==='low'?'PQC~':cert.pqc_risk==='medium'?'PQC!':'PQC✗'}
            </span>
          )}
          {cert.private_key_pem && (
            <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:8,
              background:'var(--v2-surface-3)', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:30, height:30, borderRadius:7, background:'#fef2f2',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Lock size={14} color="#dc2626"/>
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:500, fontFamily:'monospace', color:'var(--v2-text)' }}>private key</span>
                      <span style={{ fontSize:9, fontWeight:600, padding:'2px 6px', borderRadius:3,
                        background:'#fee2e2', color:'#b91c1c', letterSpacing:'0.3px' }}>SENSITIVE</span>
                    </div>
                    <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
                      {keyCopied && keyTimer > 0
                        ? <span style={{ color:'#dc2626' }}>Copied — clears in {keyTimer}s</span>
                        : 'Copy only · never displayed'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {keyCopied && keyTimer > 0 && (
                    <div style={{ height:3, width:80, background:'#fee2e2', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'#dc2626', borderRadius:3,
                        width: `${(keyTimer/30)*100}%`, transition:'width 1s linear' }}/>
                    </div>
                  )}
                  <button className="v2-btn v2-btn-sm" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(cert.private_key_pem)
                    } catch(e) {
                      // fallback for older browsers
                      const ta = document.createElement('textarea')
                      ta.value = cert.private_key_pem
                      ta.style.position = 'fixed'; ta.style.opacity = '0'
                      document.body.appendChild(ta); ta.select()
                      document.execCommand('copy'); document.body.removeChild(ta)
                    }
                    setKeyCopied(true)
                    // Audit log
                    try {
                      const { data: { session: s } } = await supabase.auth.getSession()
                      await supabase.from('audit_log').insert({
                        user_id: cert.user_id, cert_id: cert.id,
                        action: 'private_key_copied',
                        actor_email: s?.user?.email || '',
                        metadata: { domain: cert.domain, ip: 'browser' }
                      })
                    } catch(e) { console.error('audit log failed', e) }
                    // 30s countdown then reset copied state
                    if (keyTimerRef) { clearInterval(keyTimerRef); setKeyTimerRef(null) }
                    setKeyTimer(30)
                    let secs = 30
                    const iv = setInterval(() => {
                      secs -= 1
                      setKeyTimer(secs)
                      if (secs <= 0) {
                        clearInterval(iv)
                        setKeyCopied(false); setKeyTimer(0); setKeyTimerRef(null)
                      }
                    }, 1000)
                    setKeyTimerRef(iv)
                  }}>
                    {keyCopied ? <><Check size={10}/> Copied!</> : <><Copy size={10}/> Copy Key</>}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Key warning / deleted state */}
          {cert.private_key_pem && !keyDeleted && !keyDelConfirm && (
            <div style={{ background:'#FDF0EE', border:'0.5px solid #F2C4BC', borderRadius:8,
              padding:'10px 12px', marginBottom:10, display:'flex', gap:10, alignItems:'flex-start' }}>
              <ShieldOff size={13} color="#C45A4A" style={{ flexShrink:0, marginTop:1 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#C45A4A', marginBottom:2 }}>Private key stored server-side</div>
                <div style={{ fontSize:11, color:'#C45A4A' }}>Download and delete from SSLVault after installing.</div>
              </div>
              <button className="v2-btn v2-btn-sm" onClick={() => setKDC(true)}
                style={{ fontSize:10, borderColor:'#fcd34d', color:'#C45A4A', flexShrink:0 }}>
                <Trash2 size={9}/> Delete
              </button>
            </div>
          )}
          {keyDeleted && (
            <div style={{ background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
              borderRadius:8, padding:'10px 12px', marginBottom:10, display:'flex', gap:8, alignItems:'center' }}>
              <ShieldCheck size={13} color="var(--v2-green)"/>
              <span style={{ fontSize:12, color:'var(--v2-green-text)', fontWeight:500 }}>Private key deleted from SSLVault servers.</span>
            </div>
          )}
          {keyDelConfirm && (
            <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-amber-border)',
              borderRadius:8, padding:14, marginBottom:10 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                <AlertTriangle size={14} color="var(--v2-amber)"/>
                <span style={{ fontSize:13, fontWeight:500 }}>Delete private key</span>
              </div>
              {[
                { key:'downloaded', label:'I have downloaded key.pem to a safe local location' },
                { key:'installed',  label:'My server has the certificate installed and working' },
                { key:'understand', label:'I understand this is irreversible' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8,
                  cursor:'pointer', fontSize:12, color:'var(--v2-text-2)', lineHeight:1.5 }}>
                  <input type="checkbox" checked={keyChecks[key]}
                    onChange={e => setKC(p => ({ ...p, [key]: e.target.checked }))}
                    style={{ marginTop:2, flexShrink:0 }}/>
                  {label}
                </label>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button className="v2-btn v2-btn-sm" onClick={() => { setKDC(false); setKC({downloaded:false,installed:false,understand:false}) }}>Cancel</button>
                <button onClick={doDeleteKey} disabled={!allChecked || keyDeleting}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11,
                    background: allChecked ? 'var(--v2-red)' : 'var(--v2-surface-3)',
                    color: allChecked ? 'white' : 'var(--v2-text-3)',
                    border:'none', borderRadius:'var(--v2-r-md)', padding:'5px 12px',
                    cursor: allChecked ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:500 }}>
                  <Trash2 size={10}/> {keyDeleting ? 'Deleting...' : 'Permanently delete key'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: History ─────────────────────────────────────────────────── */}
      {/* Always mounted so certHistoryRef is available for action buttons on other tabs */}
      {session && (
        <div style={{ display: activeTab === 'history' ? 'block' : 'none', padding:'14px 18px' }}>
          <CertHistory ref={certHistoryRef} cert={cert} session={session}/>
        </div>
      )}
      {activeTab === 'history' && !session && (
        <div style={{ padding:'14px 18px', fontSize:12, color:'var(--v2-text-3)' }}>Sign in to view history.</div>
      )}

      {/* ── Tab: Embed ─────────────────────────────────────────────────── */}
      {activeTab === 'embed' && (
        <EmbedTab cert={cert} />
      )}

      <style>{`
        @keyframes v3pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      `}</style>
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
        <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text)', marginBottom:4 }}>
          Embeddable SSL badge
        </div>
        <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:8, lineHeight:1.5 }}>
          Paste this on your website to show a live SSL status badge. Updates automatically.
        </div>
        <div style={{ background:'#0a0a0a', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'#a3e635', wordBreak:'break-all', marginBottom:8 }}>
          {widgetSnippet}
        </div>
        <button onClick={copyWidget}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'var(--v2-text-2)', fontFamily:'inherit' }}>
          {copiedW ? <><Check size={10} color="#16a34a"/> Copied!</> : <><Copy size={10}/> Copy snippet</>}
        </button>
      </div>
      <div style={{ borderTop:'0.5px solid var(--v2-border)', paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text)', marginBottom:4 }}>
          Public SSL status page
        </div>
        <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:8, lineHeight:1.5 }}>
          Share this link with clients — shows all your SSL grades publicly, no login needed.
        </div>
        <div style={{ background:'var(--v2-surface-3)', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'var(--v2-text-2)', wordBreak:'break-all', marginBottom:8 }}>
          {statusUrl}
        </div>
        <button onClick={copyStatus}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'var(--v2-text-2)', fontFamily:'inherit' }}>
          {copiedS ? <><Check size={10} color="#16a34a"/> Copied!</> : <><Share2 size={10}/> Copy status link</>}
        </button>
      </div>
    </div>
  )
}
function DomainGroup({ primary, versions, index, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const hasVersions = versions.length > 1
  const days = daysLeft(primary.expires_at)
  const s    = statusOf(days, primary.status)
  const initials = primary.domain.replace(/^www\./, '').slice(0,2).toUpperCase()
  const dotColor = s.dot==='green'?'#16a34a':s.dot==='amber'?'#E8897A':s.dot==='red'?'#dc2626':'#d4d4d4'
  const iconBg   = s.dot==='green'?'#1A7A72':s.dot==='amber'?'#E8897A':s.dot==='red'?'#dc2626':'#64748b'
  const isSelected = selected === primary.id

  return (
    <div style={{ background:'var(--v2-surface)', border:`0.5px solid ${isSelected?'#3DBFB0':'var(--v2-border)'}`,
      borderRadius:12, overflow:'hidden', transition:'border-color 0.15s' }}>

      {/* Primary row */}
      <div onClick={() => onSelect(primary.id)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
          cursor:'pointer', transition:'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background='var(--v2-bg)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
        <span style={{ fontSize:11, color:'var(--v2-text-3)', fontWeight:600, minWidth:16, textAlign:'right' }}>{index}</span>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:iconBg,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:10, fontWeight:700, color:'white', letterSpacing:0.5 }}>{initials}</div>
          <span style={{ position:'absolute', bottom:-1, right:-1, width:8, height:8,
            borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-surface)' }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace', color:'var(--v2-text-1)' }}>{primary.domain}</span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20,
              background: s.dot==='green'?'#E1F5EE':s.dot==='amber'?'#FAEEDA':'#FCEBEB',
              color: s.dot==='green'?'#0F6E56':s.dot==='amber'?'#854F0B':'#A32D2D' }}>
              {days != null ? `${days}d left` : primary.status}
            </span>
            {primary._healthGrade && (
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4,
                background:primary._healthGrade==='A'||primary._healthGrade==='A+'?'#E1F5EE':primary._healthGrade==='B'?'#FAEEDA':'#FCEBEB',
                color:primary._healthGrade==='A'||primary._healthGrade==='A+'?'#0F6E56':primary._healthGrade==='B'?'#854F0B':'#A32D2D' }}>
                {primary._healthGrade}
              </span>
            )}
            {hasVersions && (
              <span style={{ fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20,
                background:'#FAEEDA', color:'#854F0B' }}>
                + {versions.length - 1} older cert{versions.length - 1 !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--v2-text-3)', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <span>Expires {primary.expires_at ? new Date(primary.expires_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</span>
            <span>·</span>
            <span style={{ background:'var(--v2-bg)', padding:'1px 7px', borderRadius:20, fontSize:10,
              color:'var(--v2-text-2)', border:'0.5px solid var(--v2-border)', fontWeight:500 }}>
              {primary.cert_type || primary.issuer || 'RapidSSL Standard'}
            </span>
            <span>·</span>
            <span>Issued {primary.issued_at ? new Date(primary.issued_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</span>
          </div>
          {primary.install_method && (
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                background: primary.install_method==='cpanel'?'#F5EFE0':'#E8F8F6',
                color: primary.install_method==='cpanel'?'#8B6914':'#0F6E56',
                border:`0.5px solid ${primary.install_method==='cpanel'?'#E8D88E':'#A8E6DE'}`,
                display:'flex', alignItems:'center', gap:3 }}>
                {primary.install_method==='cpanel' ? '🌐 cPanel' : '🖥 VPS'}
              </span>
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {hasVersions && (
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
              style={{ background:'var(--v2-bg)', border:'0.5px solid var(--v2-border)', borderRadius:6,
                padding:'4px 8px', fontSize:10, color:'var(--v2-text-2)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:3, fontFamily:'inherit' }}>
              {expanded ? '▲ Hide' : `▼ ${versions.length - 1} older cert${versions.length - 1 !== 1 ? 's' : ''}`}
            </button>
          )}
          <ChevronRight size={14} style={{ color:'var(--v2-text-3)', flexShrink:0 }}/>
        </div>
      </div>

      {/* Validity bar */}
      {days != null && (
        <div style={{ height:2, background:'var(--v2-bg)' }}>
          <div style={{ width:`${Math.min(100, Math.max(0, (days/398)*100))}%`, height:'100%',
            background: s.dot==='green'?'#3DBFB0':s.dot==='amber'?'#E8897A':'#dc2626' }}/>
        </div>
      )}

      {/* Versions panel — expands when multiple certs exist for domain */}
      {hasVersions && expanded && (
        <div style={{ borderTop:'0.5px solid var(--v2-border)', background:'var(--v2-bg)', padding:'10px 14px 12px' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)', textTransform:'uppercase',
            letterSpacing:'0.5px', marginBottom:8 }}>All certificates for this domain · {versions.length} total</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {versions.map((v, i) => {
              const isCurrent = i === 0
              const isDeployed = !!v.install_method
              // Label logic:
              // Newest + deployed  → "Running on server"
              // Newest + not deployed → "Not deployed yet"
              // Older  + deployed  → "Previously deployed"
              // Older  + not deployed → "Never deployed"
              const statusLabel = isCurrent
                ? (isDeployed ? 'Running on server' : 'Not deployed yet')
                : (isDeployed ? 'Previously deployed' : 'Never deployed')
              const statusBg = isCurrent
                ? (isDeployed ? '#E1F5EE' : '#FAEEDA')
                : 'var(--v2-bg)'
              const statusColor = isCurrent
                ? (isDeployed ? '#0F6E56' : '#854F0B')
                : 'var(--v2-text-3)'
              const statusBorder = isCurrent ? 'none' : '0.5px solid var(--v2-border)'
              return (
                <div key={v.id} onClick={() => onSelect(v.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    background: selected===v.id ? '#E8F8F6' : 'var(--v2-surface)',
                    border:`0.5px solid ${selected===v.id?'#3DBFB0':'var(--v2-border)'}`,
                    borderRadius:8, cursor:'pointer', opacity: isCurrent ? 1 : 0.75 }}
                  onMouseEnter={e => { if(selected!==v.id) e.currentTarget.style.background='var(--v2-bg)' }}
                  onMouseLeave={e => { if(selected!==v.id) e.currentTarget.style.background='var(--v2-surface)' }}>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                    flexShrink:0, background: statusBg, color: statusColor, border: statusBorder,
                    whiteSpace:'nowrap' }}>
                    {statusLabel}
                  </span>
                  <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--v2-text-2)', flex:1, minWidth:0 }}>
                    GGS #{v.ggs_order_id || '—'}
                  </span>
                  <span style={{ fontSize:11, color:'var(--v2-text-3)', flexShrink:0 }}>
                    Issued {v.issued_at ? new Date(v.issued_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                  </span>
                  <span style={{ fontSize:11, color:'var(--v2-text-3)', flexShrink:0 }}>
                    Expires {v.expires_at ? new Date(v.expires_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:8, fontSize:10, color:'var(--v2-text-3)' }}>
            {versions.length} certificate{versions.length!==1?'s':''} under this domain · Each valid until its own expiry date
          </div>
        </div>
      )}
    </div>
  )
}

function CertRow({ cert, selected, onClick, index }) {
  const days = daysLeft(cert.expires_at)
  const s    = statusOf(days, cert.status)
  const initials = cert.domain.replace(/^www\./, '').slice(0,2).toUpperCase()
  const dotColor = s.dot==='green'?'#16a34a':s.dot==='amber'?'#E8897A':s.dot==='red'?'#dc2626':'#d4d4d4'
  const iconBg   = s.dot==='green'?'#1A7A72':s.dot==='amber'?'#E8897A':s.dot==='red'?'#dc2626':'#64748b'
  return (
    <div onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        cursor:'pointer', transition:'all .15s',
        background: selected ? '#f0f7ff' : 'white',
        borderLeft: selected ? '3px solid #1A7A72' : '3px solid transparent',
        borderBottom:'0.5px solid #f1f5f9' }}
      onMouseEnter={e=>{if(!selected){e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderLeftColor='#A8E6DE'}}}
      onMouseLeave={e=>{if(!selected){e.currentTarget.style.background='white';e.currentTarget.style.borderLeftColor='transparent'}}}>
      {/* Row index */}
      <div style={{ width:22, textAlign:'right', fontSize:11, fontWeight:600, color:'#7A9E9B', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
        {index}
      </div>
      {/* Avatar with status dot */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:iconBg,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.5px' }}>
          {initials}
        </div>
        <span style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10,
          borderRadius:'50%', background:dotColor, border:'2px solid white',
          boxShadow: s.dot==='green'?'0 0 0 2px rgba(22,163,74,0.2)':
                     s.dot==='amber'?'0 0 0 2px rgba(245,158,11,0.2)':'none' }}/>
      </div>
      {/* Body */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace',
            color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {cert.domain}
          </span>
          <StatusPill days={days} status={cert.status}/>
          {cert._healthGrade && (() => {
            const g = cert._healthGrade
            const gc = g==='A+'||g==='A' ? '#16a34a' : g==='B' ? '#2563eb' : g==='C' ? '#ca8a04' : g==='D' ? '#E8897A' : '#dc2626'
            const gb = g==='A+'||g==='A' ? '#E8F8F6' : g==='B' ? '#E8F8F6' : g==='C' ? '#fefce8' : g==='D' ? '#FDF0EE' : '#fef2f2'
            return (
              <span title="SSL Health Score" style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4,
                color:gc, background:gb, border:'0.5px solid currentColor', fontFamily:'monospace', letterSpacing:'0.2px' }}>
                {g}
              </span>
            )
          })()}
          {cert.tls_grade && (
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4,
              color: cert.tls_grade==='A'?'#16a34a':cert.tls_grade==='B'?'#65a30d':cert.tls_grade==='C'?'#E8897A':'#dc2626',
              background: cert.tls_grade==='A'?'#E8F8F6':cert.tls_grade==='B'?'#f7fee7':cert.tls_grade==='C'?'#FDF0EE':'#fef2f2',
              border:'0.5px solid currentColor' }}>
              TLS {cert.tls_grade}
            </span>
          )}
          {cert.pqc_risk && (
            <span title={cert.key_algorithm||'PQC'} style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4,
              color: cert.pqc_risk==='ready'?'#16a34a':cert.pqc_risk==='low'?'#2563eb':cert.pqc_risk==='medium'?'#E8897A':'#dc2626',
              background: cert.pqc_risk==='ready'?'#E8F8F6':cert.pqc_risk==='low'?'#E8F8F6':cert.pqc_risk==='medium'?'#FDF0EE':'#fef2f2',
              border:'0.5px solid currentColor' }}>
              {cert.pqc_risk==='ready'?'PQC✓':cert.pqc_risk==='low'?'PQC~':cert.pqc_risk==='medium'?'PQC!':'PQC✗'}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11, color:'#94a3b8' }}>
          <span>Expires {fmtDate(cert.expires_at)}</span>
          <span>·</span>
          <span style={{ fontWeight:600, color:'#185FA5', background:'#E6F1FB',
            fontSize:9, padding:'2px 6px', borderRadius:4, border:'0.5px solid #B5D4F4' }}>
            {cert.cert_type||'RapidSSL DV'}
          </span>
          {cert.issued_at && <><span>·</span><span>Issued {fmtDate(cert.issued_at)}</span></>}
        </div>
        {days != null && days <= 365 && (
          <div style={{ marginTop:6 }}>
            <ProgressBar days={days}/>
          </div>
        )}
        {/* Install status strip */}
        {(() => {
          const method = cert.install_method
          const bindStatus = cert.certbind_status
          const checkedAt = cert.certbind_checked_at
          if (!method) return null
          const isVerified = bindStatus === 'bound'
          const isAlert = ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy','unreachable'].includes(bindStatus)
          const timeAgo = checkedAt ? (() => {
            const m = Math.round((Date.now() - new Date(checkedAt).getTime()) / 60000)
            if (m < 1) return 'just now'
            if (m < 60) return `${m}m ago`
            if (m < 1440) return `${Math.round(m/60)}h ago`
            return `${Math.round(m/1440)}d ago`
          })() : null
          return (
            <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
              {/* Server type pill */}
              <span style={{
                display:'inline-flex', alignItems:'center', gap:3,
                fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20,
                background: method==='agent' ? '#E8F8F6' : '#F5EFE0',
                color: method==='agent' ? '#1A7A72' : '#8B5E3C',
                border: `1px solid ${method==='agent' ? '#A8E6DE' : '#D8C8A8'}`,
              }}>
                {method==='agent' ? '🖥 VPS' : '🌐 cPanel'}
              </span>
              {/* Verification status */}
              <span style={{
                display:'inline-flex', alignItems:'center', gap:3,
                fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20,
                background: isVerified ? '#E8F8F6' : isAlert ? '#FDF0EE' : '#F5EFE0',
                color: isVerified ? '#1A7A72' : isAlert ? '#C45A4A' : '#7A9E9B',
                border: `1px solid ${isVerified ? '#A8E6DE' : isAlert ? '#F2C4BC' : '#D8D0C0'}`,
              }}>
                {isVerified ? '✓ Live & verified' : isAlert ? '⚠ Check needed' : '○ Not verified'}
                {timeAgo && !isAlert && <span style={{opacity:0.6}}> · {timeAgo}</span>}
              </span>
            </div>
          )
        })()}
      </div>
      <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink:0 }}/>
    </div>
  )
}

function LoggedInDashboard({ user, nav, onIssue }) {
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
    const [{ data: certsData }, { data: ordersData }] = await Promise.all([
      supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending:false }),
      supabase.from('ssl_orders').select('*').eq('user_id', user.id).neq('status', 'active').order('created_at', { ascending:false }),
    ])
    const enriched = await Promise.all((certsData||[]).map(async cert => {
      if (!cert.ggs_order_id) return cert
      const { data: ord } = await supabase.from('ssl_orders')
        .select('product_name,product_code,period,ggs_invoice_id,ggs_order_id,partner_order_id,vendor_order_id,order_type,subscription_start,subscription_end,admin_email,admin_first_name,admin_last_name,admin_phone,admin_title,admin_city,admin_country,tech_first_name,tech_last_name,tech_email,tech_phone,serial_number,cert_md5')
        .eq('ggs_order_id', cert.ggs_order_id).eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single()
      return ord ? { ...cert, _order: ord } : cert
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
  const issuedCerts   = certs.filter(c => c.source === 'gogetssl' || c.source === 'rapidssl' || !c.source)
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
    const groups = {}
    for (const c of visible) {
      if (!groups[c.domain]) groups[c.domain] = []
      groups[c.domain].push({ ...c, _healthGrade: healthScores[c.domain]?.grade || null })
    }
    // Sort each group: newest first
    for (const d in groups) {
      groups[d].sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at))
    }
    // Return as array of { primary, versions } sorted by primary issued_at desc
    return Object.values(groups)
      .map(versions => ({ primary: versions[0], versions }))
      .sort((a, b) => new Date(b.primary.issued_at) - new Date(a.primary.issued_at))
  })()

  const visibleWithHealth = visible.map(c => ({
    ...c,
    _healthGrade: healthScores[c.domain]?.grade || null,
  }))

  const selectedCert = selected ? certs.find(c => c.id === selected) : null

  return (
    <div style={{ background:'linear-gradient(160deg, #f0f4f8 0%, #f8fafc 100%)', minHeight:'100vh' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 28px 80px' }}>

        <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px', marginBottom:3, display:'flex', alignItems:'center', gap:10 }}>
              Certificate Dashboard
              {healthy === total && total > 0 && (
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                  background:'#E8F8F6', color:'#16a34a', border:'0.5px solid #A8E6DE',
                  animation:'fadeIn 0.5s ease' }}>
                  All healthy ✓
                </span>
              )}
            </h1>
            <p style={{ fontSize:12, color:'#94a3b8' }}>{user.email} · {domainGroups.length} domain{domainGroups.length!==1?'s':''} · {total} certificate{total!==1?'s':''}</p>
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
            style={{ display:'flex', alignItems:'center', gap:6, background:'white',
              border:'0.5px solid #e2e8f0', borderRadius:8, padding:'7px 14px',
              fontSize:11, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
            <Share2 size={12} color="#3DBFB0"/>
            {shareMsg || 'Share SSL status'}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Total',        value:total,    color:'#1A7A72', bg:'#E8F8F6', icon:'▦', sub:'certificates' },
            { label:'Healthy',      value:healthy,  color:'#16a34a', bg:'#E8F8F6', icon:'✓', sub:healthy>0?'All valid':'None' },
            { label:'Expiring',     value:expiring, color:expiring>0?'#E8897A':'#94a3b8', bg:expiring>0?'#FDF0EE':'#f8fafc', icon:'⏱', sub:expiring>0?'Renew soon':'None' },
            { label:'Pending',      value:orders.filter(o=>o.status==='dv_pending').length, color:orders.filter(o=>o.status==='dv_pending').length>0?'#E8897A':'#94a3b8', bg:orders.filter(o=>o.status==='dv_pending').length>0?'#FDF0EE':'#f8fafc', icon:'⏳', sub:orders.filter(o=>o.status==='dv_pending').length>0?'Awaiting DNS':'None' },
            { label:'Expired',      value:expired,  color:expired>0?'#dc2626':'#94a3b8', bg:expired>0?'#fef2f2':'#f8fafc', icon:'✗', sub:expired>0?'Action needed':'None' },
          ].map((s,i) => (
            <div key={s.label}
              style={{ background:'white', border:'0.5px solid #f1f5f9', borderRadius:12,
                padding:'16px 18px', position:'relative', overflow:'hidden',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                animation:`fadeSlideUp 0.4s ease both`, animationDelay:`${i*60}ms` }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, borderRadius:'12px 12px 0 0', opacity: s.value > 0 ? 1 : 0.2 }}/>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
                <div style={{ width:28, height:28, borderRadius:7, background:s.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, color:s.color, fontWeight:700 }}>{s.icon}</div>
              </div>
              <div style={{ fontSize:32, fontWeight:800, color: s.value>0 ? s.color : '#0f172a',
                letterSpacing:'-1px', lineHeight:1, marginBottom:4,
                transition:'color 0.3s' }}>{s.value}</div>
              <div style={{ fontSize:11, color:'#94a3b8' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {expired > 0 && (
          <div style={{ background:'rgba(220,38,38,0.1)', border:'0.5px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#f87171" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#f87171' }}><strong>{expired} expired certificate{expired!==1?'s':''}</strong> — renew immediately.</span>
          </div>
        )}
        {expiring > 0 && expired === 0 && (
          <div style={{ background:'rgba(245,158,11,0.08)', border:'0.5px solid rgba(245,158,11,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#fbbf24' }}><strong>{expiring} expiring within 30 days</strong></span>
          </div>
        )}

        {orders.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>DNS Validation Pending ({orders.length})</div>
            {orders.map(o => <DvPendingCard key={o.id} order={o} onRefresh={load}/>)}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: selectedCert ? '1fr 400px':'1fr', gap:16, alignItems:'start' }}>
          <div style={{ background:'white', border:'0.5px solid #e2e8f0', borderRadius:14,
            overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding:'14px 16px', borderBottom:'0.5px solid #f1f5f9',
              display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
              background:'linear-gradient(to bottom, white, #fafbfc)' }}>
              {/* Filter tabs */}
              <div style={{ display:'flex', gap:2, background:'#f1f5f9', borderRadius:8, padding:3 }}>
                {[
                  { key:'all',      label:'All',      count:total },
                  { key:'healthy',  label:'Healthy',  count:healthy },
                  { key:'expiring', label:'Expiring', count:expiring },
                  { key:'expired',  label:'Expired',  count:expired },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit', border:'none', transition:'all .15s',
                      background: filter===f.key ? 'white' : 'transparent',
                      color: filter===f.key ? '#0f172a' : '#64748b',
                      boxShadow: filter===f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {f.label}
                    <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                      background: filter===f.key ? '#1A7A72' : '#e2e8f0',
                      color: filter===f.key ? 'white' : '#64748b', transition:'all .15s' }}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domains..."
                    style={{ background:'#f8fafc', border:'0.5px solid #e2e8f0', borderRadius:8, color:'#1e293b',
                      fontSize:12, padding:'6px 10px 6px 30px', width:190, outline:'none', fontFamily:'inherit',
                      transition:'border-color .15s' }}
                    onFocus={e=>e.target.style.borderColor='#1A7A72'}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  <Globe size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                </div>
                <ScanPqcButton onDone={load}/>
                <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'#1A7A72', color:'white',
                    border:'none', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 6px rgba(14,127,192,0.3)',
                    transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#1A7A72';e.currentTarget.style.boxShadow='0 4px 12px rgba(14,127,192,0.4)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#1A7A72';e.currentTarget.style.boxShadow='0 2px 6px rgba(14,127,192,0.3)'}}>
                  <Plus size={11}/> Issue certificate
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:'48px 16px', textAlign:'center' }}>
                <RefreshCw size={20} style={{ color:'#94a3b8', animation:'spin 1s linear infinite' }}/>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:10 }}>Loading...</div>
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding:'48px 16px', textAlign:'center' }}>
                <Shield size={24} style={{ color:'#e2e8f0', marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>{total===0?'No certificates yet':'No results'}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:16 }}>{total===0?'Issue your first SSL certificate to get started.':'Try a different filter.'}</div>
                {total===0 && (
                  <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                    style={{ background:'#1A7A72', color:'white', border:'none', borderRadius:7,
                      padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Issue your first certificate
                  </button>
                )}
              </div>
            ) : (
              domainGroups.map(({ primary, versions }, idx) => (
                <DomainGroup
                  key={primary.domain}
                  index={idx + 1}
                  primary={primary}
                  versions={versions}
                  selected={selected}
                  onSelect={id => setSelected(selected === id ? null : id)}
                />
              ))
            )}
          </div>

          {selectedCert && (
            <CertDetail cert={selectedCert} onClose={() => setSelected(null)}
              onDelete={handleDelete}
              onInstall={cert => { setAgentCert(cert) }}
              onCpanel={cert => { setCpanelCert(cert) }}
              nav={nav} onRefresh={load} session={session}/>
          )}
        </div>

        {/* Imported certs from CA Connector — shown separately */}
        {importedCerts.length > 0 && (
          <ImportedCertsSection certs={importedCerts} onDelete={handleDelete} />
        )}

        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Quick actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { icon:Shield,    color:'#1A7A72', bg:'#E8F8F6', label:'Issue Certificate', desc:'RapidSSL DV · RapidSSL · ~5 min',    action:() => onIssue ? onIssue() : nav('/buy') },
              { icon:Download,  color:'#16a34a', bg:'#E8F8F6', label:'Install Guide',     desc:'Nginx, Apache, cPanel step-by-step', action:() => nav('/install') },
              { icon:Activity,  color:'#E8897A', bg:'#f5f3ff', label:'Integrations',     desc:'Cloudflare, Vercel, agent setup',    action:() => nav('/integrations') },
              { icon:Zap,       color:'#E8897A', bg:'#FDF0EE', label:'Knowledge Base',    desc:'Guides, FAQs, troubleshooting',      action:() => nav('/knowledge-base') },
            ].map(({ icon:Icon, color, bg, label, desc, action }, i) => (
              <button key={label} onClick={action}
                style={{ background:'white', border:'0.5px solid #f1f5f9', borderRadius:12, padding:'16px',
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  animation:`fadeSlideUp 0.4s ease both`, animationDelay:`${i*60}ms` }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${color}20`;e.currentTarget.style.borderColor=color+'44'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor='#f1f5f9'}}>
                <div style={{ width:36, height:36, borderRadius:9, background:bg,
                  display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={16} color={color} strokeWidth={1.8}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent activity feed ── */}
        {recentEvents.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Recent activity</div>
            <div style={{ background:'white', border:'0.5px solid #f1f5f9', borderRadius:12,
              overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              {recentEvents.map((ev, i) => {
                const evColors = {
                  issued:          { color:'#16a34a', bg:'#E8F8F6', dot:'#16a34a' },
                  renewed:         { color:'#2563eb', bg:'#E8F8F6', dot:'#2563eb' },
                  revoked:         { color:'#dc2626', bg:'#fef2f2', dot:'#dc2626' },
                  agent_installed: { color:'#E8897A', bg:'#f5f3ff', dot:'#E8897A' },
                  private_key_copied: { color:'#E8897A', bg:'#FDF0EE', dot:'#E8897A' },
                }
                const cfg = evColors[ev.event_type] || { color:'#64748b', bg:'#f8fafc', dot:'#94a3b8' }
                const secs = Math.floor((Date.now() - new Date(ev.created_at)) / 1000)
                const ago = secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.floor(secs/60)}m ago`
                          : secs < 86400 ? `${Math.floor(secs/3600)}h ago` : `${Math.floor(secs/86400)}d ago`
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12,
                    padding:'10px 16px', borderBottom: i < recentEvents.length-1 ? '0.5px solid #f8fafc' : 'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>
                        {ev.event_type.replace(/_/g,' ')}
                      </span>
                      <span style={{ fontSize:12, color:'#94a3b8' }}> — {ev.domain}</span>
                    </div>
                    <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0 }}>{ago}</span>
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
          <h1 style={{ fontSize:38, fontWeight:700, color:'var(--v2-text)', letterSpacing:'-0.8px',
            lineHeight:1.15, margin:'0 0 14px', maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            Your SSL certificates,<br/>
            <span style={{ color:'var(--v2-green)' }}>always under control</span>
          </h1>
          <p style={{ fontSize:16, color:'var(--v2-text-2)', maxWidth:480, margin:'0 auto 32px', lineHeight:1.65 }}>
            Issue free SSL certificates, monitor expiry, automate renewal — all from one clean dashboard.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="v2-btn v2-btn-primary" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => nav('/auth')}>
              <Shield size={14}/> Get started free
            </button>
            <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => onIssue ? onIssue() : nav('/buy')}>
              Issue SSL Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ nav, onIssue }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={20} style={{ color:'var(--v2-text-3)', animation:'spin 1s linear infinite' }}/>
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
