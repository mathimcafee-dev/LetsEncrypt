// BUILD_TIMESTAMP: 1778952426531
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Shield, Plus, RefreshCw, Download, X, Lock, AlertTriangle, CheckCircle,
  Globe, ChevronRight, Copy, Check, Activity, Zap, ArrowRight, Server,
  FileText, Trash2, ShieldOff, ShieldCheck, Clock, RotateCcw, Share2, Timer
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
import SmartInstall from '../components/SmartInstall'

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
  if (!iso) return '--'
  try { return format(new Date(iso), 'MMM d, yyyy') } catch { return '--' }
}
function dl(text, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = filename; a.click()
}

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => {
      navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800)
    }} style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'5px 11px', borderRadius:6,
      border: copied ? '1px solid rgba(22,160,104,0.4)' : '1px solid rgba(0,0,0,0.15)',
      background: copied ? 'rgba(22,160,104,0.08)' : '#ffffff',
      color: copied ? '#16a068' : '#444444',
      fontSize:11, fontWeight:600, cursor:'pointer',
      fontFamily:'inherit', transition:'all .15s',
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
  const color = days == null ? '#111111' : days < 0 ? '#1f5c4e' : days < 14 ? '#1f5c4e' : days < 30 ? '#111111' : '#111111'
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
    <div style={{ marginTop:20, border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, overflow:'hidden', background:'transparent', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', gap:10,
          background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#333333', textTransform:'uppercase', letterSpacing:'0.5px', flex:1 }}>
          CA Connector -- Imported Certificates ({certs.length})
        </span>
        <span style={{ fontSize:10, color:'#555555', marginRight:4 }}>Tracked only · not managed by SSLVault</span>
        <span style={{ fontSize:12, color:'#555555' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          {certs.map(c => {
            const d = daysLeft(c.expires_at)
            const isExpired = d == null || d < 0
            const isExpiring = d != null && d >= 0 && d < 30
            const dotColor = isExpired ? '#1f5c4e' : isExpiring ? '#111111' : '#16a068'
            return (
              <div key={c.id} style={{ padding:'12px 18px', borderTop:'1px solid rgba(0,0,0,0.07)',
                display:'flex', alignItems:'center', gap:12, background:'transparent' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1f5c4e', display:'flex', alignItems:'center', gap:8 }}>
                    {c.domain}
                    <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4,
                      background:'transparent', color:'#333333' }}>
                      {sourceLabel(c.source)}
                    </span>
                    {isExpired && <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:'rgba(248,113,113,0.12)', color:'#1f5c4e' }}>EXPIRED</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#555555', marginTop:2 }}>
                    {c.issuer || c.cert_type || 'Unknown issuer'} ·{' '}
                    {isExpired ? `Expired ${Math.abs(d)}d ago` : `${d}d left`} ·{' '}
                    Expires {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '--'}
                  </div>
                </div>
                <button onClick={() => onDelete(c.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#555555', padding:4,
                    borderRadius:4, transition:'color .15s', fontFamily:'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.color='#1f5c4e'}
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

  // Auto-poll every 30s -- no manual click needed
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
        setMsg(`Status: ${d.ggs_status || 'pending'} -- DNS propagating (${elStr} elapsed)`)
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
          domain:    liveOrder.domain,
          txt_name:  liveOrder.dcv_txt_name  || liveOrder.dcv_cname_name  || liveOrder.domain,
          txt_value: liveOrder.dcv_txt_value || liveOrder.dcv_cname_value,
        })
      })
      const d = await r.json()
      setMsg(d.ok ? '✅ DNS added via '+d.provider+'. Check status in ~1 min.' : '❌ '+d.message)
    } catch(e) { setMsg('Error: '+e.message) }
    setAddingDns(false)
  }

  // Live-refresh order data every 10s to pick up dcv_txt_value if it wasn't ready on initial load
  const [liveOrder, setLiveOrder] = useState(order)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.from('ssl_orders').select('*').eq('id', order.id).single()
        if (data) setLiveOrder(data)
      } catch {}
    }, 10000)
    return () => clearInterval(t)
  }, [order.id])

  const hasDcv = !!(liveOrder.dcv_txt_value || liveOrder.dcv_cname_value)
  const dcvName  = liveOrder.dcv_txt_name  || liveOrder.dcv_cname_name  || '--'
  const dcvValue = liveOrder.dcv_txt_value || liveOrder.dcv_cname_value || '--'

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

  // Elapsed time formatted
  const elMins = Math.floor(elapsed / 60)
  const elSecs = elapsed % 60
  const elStr = elMins > 0 ? `${elMins}m ${elSecs}s` : `${elSecs}s`

  // 4 pipeline steps -- labels and details always match the actual state
  const steps = [
    {
      label: 'Reissue submitted to GoGetSSL',
      done: true,
      detail: `GGS order #${liveOrder.ggs_order_id}`,
    },
    {
      label: 'New private key & CSR generated',
      done: true,
      detail: 'RSA-2048 key pair created securely',
    },
    {
      // Label changes to match actual state -- never says "added" when still waiting
      label: hasDcv ? 'TXT record added to DNS' : 'Waiting for DNS TXT record',
      done: hasDcv,
      active: !hasDcv,
      detail: hasDcv
        ? `${dcvName} → ${dcvValue.slice(0,22)}…`
        : 'GGS is generating the validation record -- will be added automatically',
    },
    {
      label: hasDcv ? 'GGS validating DNS ownership' : 'GGS DNS validation',
      done: false,
      active: hasDcv,
      detail: hasDcv
        ? `Checking… ${elStr} elapsed`
        : 'Starts once TXT record is in DNS',
    },
  ]

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'16px 18px', marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#9a6400', animation:'v3pulse 1s ease infinite', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#9a6400' }}>Reissue in Progress</div>
          <div style={{ fontSize:12, color:'#111111', fontWeight:600, fontFamily:'monospace', marginTop:1 }}>
            {liveOrder.domain}
            <span style={{ fontSize:11, color:'#555555', fontWeight:400, marginLeft:10 }}>GGS #{liveOrder.ggs_order_id}</span>
          </div>
        </div>
        <div style={{ fontSize:11, color:'#555555', textAlign:'right' }}>
          <div>{elStr} elapsed</div>
          <div style={{ fontSize:10, color:'#555555', marginTop:2 }}>Auto-checking every 30s</div>
        </div>
      </div>

      {/* Timeline steps */}
      <div style={{ marginBottom:14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display:'flex', gap:12, marginBottom: i < steps.length-1 ? 12 : 0 }}>
            {/* Step indicator + connector line */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                background: s.done ? 'rgba(22,160,104,0.11)' : s.active ? 'rgba(251,191,36,0.12)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${s.done ? 'rgba(74,222,128,0.4)' : s.active ? 'rgba(251,191,36,0.4)' : 'rgba(0,0,0,0.07)'}`,
                fontSize:11, fontWeight:700,
                color: s.done ? '#16a068' : s.active ? '#9a6400' : '#bbbbbb' }}>
                {s.done ? '✓' : s.active ? <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', border:'2px solid #fbbf24', borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/> : <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.09)' }}/>}
              </div>
              {i < steps.length-1 && (
                <div style={{ width:1.5, flex:1, minHeight:12, marginTop:3,
                  background: s.done ? 'rgba(74,222,128,0.3)' : 'rgba(0,0,0,0.06)' }}/>
              )}
            </div>
            {/* Step text */}
            <div style={{ paddingBottom: i < steps.length-1 ? 0 : 0, flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color: s.done ? '#16a068' : s.active ? '#9a6400' : '#888888', marginBottom:2 }}>
                {s.label}
              </div>
              <div style={{ fontSize:11, color: s.done ? '#666666' : s.active ? 'rgba(251,191,36,0.7)' : '#999999', wordBreak:'break-all' }}>
                {s.detail}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TXT record details -- only show when we have them */}
      {hasDcv && (
        <div style={{ background:'rgba(0,0,0,0.02)', borderRadius:8, padding:'10px 12px', marginBottom:12, border:'1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>DNS TXT Record (added automatically)</div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'4px 10px', alignItems:'center', fontFamily:'monospace' }}>
            <span style={{ fontSize:10, color:'#555555' }}>Name</span>
            <span style={{ fontSize:11, color:'#111111', wordBreak:'break-all' }}>{dcvName}</span>
            <CopyBtn text={dcvName}/>
            <span style={{ fontSize:10, color:'#555555' }}>Value</span>
            <span style={{ fontSize:11, color:'#9a6400', wordBreak:'break-all' }}>{dcvValue}</span>
            <CopyBtn text={dcvValue}/>
            <span style={{ fontSize:10, color:'#555555' }}>TTL</span>
            <span style={{ fontSize:11, color:'#111111' }}>300</span>
            <span/>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {hasDcv && (
          <button onClick={autoDns} disabled={addingDns}
            style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', color:'#9a6400',
              border:'1px solid rgba(184,120,0,0.2)', borderRadius:6, padding:'6px 12px',
              fontSize:11, fontWeight:600, cursor: addingDns ? 'not-allowed':'pointer', fontFamily:'inherit', opacity: addingDns ? 0.6:1 }}>
            <Zap size={11}/> {addingDns ? 'Adding...' : 'Re-add DNS Record'}
          </button>
        )}
        <button onClick={checkStatus} disabled={checking}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent',
            border:'1px solid rgba(240,237,232,0.12)', color:'#555555', borderRadius:6,
            padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          <RefreshCw size={11} style={{ animation: checking ? 'spin 0.8s linear infinite':'none' }}/>
          {checking ? 'Checking…' : 'Check Status Now'}
        </button>
        {!confirmDismiss ? (
          <button onClick={() => setConfirmDismiss(true)}
            style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, background:'transparent',
              border:'1px solid rgba(192,57,43,0.12)', color:'rgba(248,113,113,0.6)', borderRadius:6,
              padding:'6px 12px', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <X size={10}/> Dismiss
          </button>
        ) : (
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
            <span style={{ fontSize:11, color:'#1f5c4e' }}>Remove this card?</span>
            <button onClick={dismissOrder} disabled={dismissing}
              style={{ background:'rgba(31,92,78,0.09)', color:'#1f5c4e', border:'1px solid rgba(192,57,43,0.2)', borderRadius:6,
                padding:'5px 12px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {dismissing ? 'Removing…' : 'Yes, remove'}
            </button>
            <button onClick={() => setConfirmDismiss(false)}
              style={{ background:'transparent', color:'#555555', border:'1px solid rgba(0,0,0,0.07)', borderRadius:6,
                padding:'5px 12px', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        )}
        {msg && <span style={{ fontSize:11, color: msg.startsWith('✅') ? '#16a068' : msg.startsWith('❌') ? '#1f5c4e' : '#9a6400', marginLeft:4 }}>{msg}</span>}
      </div>
    </div>
  )
}

// -- Ring gauge that animates on mount ----------------------------------------
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
  const color     = isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068'

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
          <circle cx="41" cy="41" r={r} fill="none" stroke="rgba(31,92,78,0.07)" strokeWidth="8"/>
          <circle cx="41" cy="41" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={animated ? offset : circ}
            style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)',
              filter: !isExpired && !isWarn ? 'drop-shadow(0 0 4px rgba(22,163,74,0.35))' : 'none' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:18, fontWeight:800, color: isExpired?'#1f5c4e':color,
            fontFamily:'monospace', lineHeight:1, letterSpacing:'-0.5px',
            transition:'all 0.3s' }}>
            {isExpired ? '!' : timeLeft.d}
          </div>
          <div style={{ fontSize:8, color:'#555555', marginTop:2, letterSpacing:'0.4px', textTransform:'uppercase' }}>
            days
          </div>
        </div>
      </div>
      {/* Live H:M:S ticker below ring -- only shown after entry animation */}
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
                color: isWarn ? '#111111' : '#111111', lineHeight:1,
                transition:'all 0.3s' }}>{val}</span>
              <span style={{ fontSize:7, color:'#555555', letterSpacing:'0.3px' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Slim progress bar for timeline --------------------------------------------
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
  const certColor = isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068'

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' }) : '--'
  const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : '--'

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t) }, [])

  return (
    <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px' }}>
          Validity timeline
        </span>
        <span style={{ fontSize:11, fontWeight:600,
          color: isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068' }}>
          {isExpired
            ? '⚠ Certificate expired'
            : isWarn
            ? `⚠ Expires in ${dLeft} day${dLeft!==1?'s':''}`
            : `Next reissue in ${dLeft} days`}
        </span>
      </div>

      {/* Bar -- full subscription width */}
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
            <span style={{ fontSize:9, fontWeight:700, color:'#1f5c4e',
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
            <span style={{ fontSize:9, fontWeight:700, color:'#1f5c4e',
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
          <div style={{ fontSize:10, fontWeight:600, color:'#333333', fontFamily:'monospace' }}>
            {fmtShort(issuedAt)}
          </div>
          <div style={{ fontSize:9, color:'#555555', marginTop:2 }}>SSL valid from</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700,
            color: isWarn ? '#111111' : isExpired ? '#1f5c4e' : '#111111',
            fontFamily:'monospace' }}>
            {fmtShort(expiresAt)}
          </div>
          <div style={{ fontSize:9, color:'#555555', marginTop:2 }}>SSL valid till</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#1f5c4e', fontFamily:'monospace' }}>
            {fmtShort(subEnd)}
          </div>
          <div style={{ fontSize:9, color:'#555555', marginTop:2 }}>Subscription ends</div>
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
      // -- Step 0: Call GGS reissue/renew API --------------------------------
      // Edge function returns in ~4s (1x2s DCV check + GGS API calls).
      // We wait up to 60s, but if it times out the order was still submitted --
      // poll_pending cron handles DCV + activation in the background.
      let fetchDone = false, fetchOk = false, fetchErr = null, fetchData = null

      fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action, cert_id: cert.id, triggered_by: 'manual', ...extra })
      }).then(r => r.json()).then(d => {
        fetchDone = true; fetchData = d
        fetchOk = d.ok === true
        if (!fetchOk) fetchErr = d.error || d.message || 'Request failed'
      }).catch(e => { fetchDone = true; fetchOk = false; fetchErr = e.message })

      // Wait up to 60s for response
      await new Promise(resolve => {
        const t = setInterval(() => { if (fetchDone) { clearInterval(t); resolve() } }, 300)
        setTimeout(() => { clearInterval(t); resolve() }, 60000)
      })

      // -- Handle API failure ------------------------------------------------
      if (!fetchOk) {
        const isInProgress = fetchData?.code === 'REISSUE_IN_PROGRESS'
        if (isInProgress) {
          // Already running -- just switch to polling mode
          const pollGgsId = isReissue ? cert.ggs_order_id : null
          if (pollGgsId) {
            setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, {
              status: 'done', detail: 'Reissue already in progress -- monitoring…'
            })}))
            // fall through to polling below with fetchData = { ok: true, ggs_order_id: pollGgsId }
            fetchOk = true
            fetchData = { ok: true, ggs_order_id: pollGgsId, dcv_txt_value: null }
          } else {
            setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, {
              status: 'error', detail: 'A reissue is already in progress. Wait a few minutes then try again.'
            })}))
            setBusy(false); return
          }
        } else if (fetchData === null) {
          // Timed out -- order was submitted, background processing taking over
          setProgress(p => ({ ...p, backgroundProcessing: true, steps: updateStep(p.steps, 0, {
            status: 'done', detail: 'Order submitted -- processing in background (this is normal)'
          })}))
          fetchOk = true
          fetchData = { ok: true, ggs_order_id: isReissue ? cert.ggs_order_id : null, dcv_txt_value: null }
        } else {
          const errMsg = fetchErr || fetchData?.error || 'Request failed'
          setProgress(p => ({ ...p, steps: updateStep(p.steps, 0, { status: 'error', detail: errMsg }) }))
          setBusy(false); return
        }
      }

      const d = fetchData
      const newGgsOrderId = d.ggs_order_id || null
      const apiElapsed = stepStartTimes.current[0] ? Date.now() - stepStartTimes.current[0] : null

      // -- Steps 0, 1, 2: advance based on API response ---------------------
      // Step 0: submitted to GGS -- confirmed by API OK response
      // Step 1: new CSR was generated inside the edge function -- confirmed by API OK
      // Step 2: DCV TXT value -- we have it if GGS returned it; DNS add was attempted
      setProgress(p => {
        let steps = [...p.steps]
        steps = updateStep(steps, 0, {
          status: 'done',
          detail: isReissue ? `GGS order #${cert.ggs_order_id}` : `New GGS order #${newGgsOrderId || '--'}`,
          elapsed: apiElapsed,
        })
        steps = updateStep(steps, 1, {
          status: 'done',
          detail: 'RSA-2048 key pair generated',
        })
        // Step 2: DNS -- if we have the TXT value, it was submitted. Otherwise still waiting.
        // Step 3: only starts after DNS is in place.
        if (d.dcv_txt_value) {
          steps = updateStep(steps, 2, {
            status: 'active',
            detail: `TXT record submitted to DNS · ${d.dcv_txt_name || cert.domain}`,
          })
          steps = updateStep(steps, 3, { status: 'active', detail: 'GGS validating DNS ownership…' })
        } else {
          // GGS hasn't returned DCV values yet -- cron handles it automatically
          steps = updateStep(steps, 2, {
            status: 'active',
            detail: 'GGS is generating the DCV record -- cron will add it to DNS and complete validation automatically',
          })
          steps = updateStep(steps, 3, { status: 'pending', detail: '' })
        }
        // If no DCV values, mark as background so user knows they can close
        if (!d.dcv_txt_value) {
          return { ...p, steps, newGgsOrderId, backgroundProcessing: true }
        }
        stepStartTimes.current[3] = Date.now()
        return { ...p, steps, newGgsOrderId }
      })

      // -- Poll ssl_orders every 5s until status = active --------------------
      // Reissue: same ggs_order_id, updated in place
      // Renew: new ggs_order_id from API response
      const pollGgsOrderId = isReissue ? cert.ggs_order_id : (newGgsOrderId || null)
      const pollStart = Date.now()
      let lastForceCheck = 0
      let step2MarkedDone = false

      const timer = setInterval(async () => {
        try {
          const elapsed = Math.round((Date.now() - pollStart) / 1000)
          const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed/60)}m ${elapsed%60}s` : `${elapsed}s`

          // Every 30s: force a GGS→DB sync via check_status
          if (Date.now() - lastForceCheck >= 30000) {
            lastForceCheck = Date.now()
            try {
              const { data: chkOrder } = await supabase
                .from('ssl_orders').select('id')
                .eq('user_id', session.user.id)
                .eq('ggs_order_id', pollGgsOrderId)
                .order('updated_at', { ascending: false }).limit(1).single()
              if (chkOrder?.id) {
                fetch(SB_URL+'/functions/v1/gogetssl-issue', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
                  body: JSON.stringify({ action: 'check_status', order_id: chkOrder.id })
                }).catch(() => {})
              }
            } catch {}
          }

          // Read current order status from DB
          let latest = null
          if (pollGgsOrderId) {
            const { data: rows } = await supabase
              .from('ssl_orders')
              .select('id, status, ggs_status, valid_till')
              .eq('user_id', session.user.id)
              .eq('ggs_order_id', pollGgsOrderId)
              .order('updated_at', { ascending: false }).limit(1)
            latest = rows?.[0]
          }

          // Timeout: 10 minutes -- tell user it's running in background
          if (Date.now() - pollStart > 10 * 60 * 1000) {
            clearInterval(timer)
            setProgress(p => ({
              ...p, pollTimer: null, backgroundProcessing: true,
              steps: updateStep(p.steps, 3, {
                status: 'active',
                detail: `Still waiting after 10 min -- DNS validation is slow. The certificate will activate automatically in the background. Refresh the dashboard to see the final status.`
              })
            }))
            setBusy(false); return
          }

          if (latest?.status === 'active') {
            // -- Certificate is now active in our DB ----------------------
            clearInterval(timer)
            const dcvElapsed = stepStartTimes.current[3] ? Date.now() - stepStartTimes.current[3] : null
            setProgress(p => {
              let steps = [...p.steps]
              // Step 2: DNS was validated -- mark done
              steps = updateStep(steps, 2, {
                status: 'done',
                detail: d.dcv_txt_value
                  ? `TXT record added and validated by GGS`
                  : 'DNS validation passed',
              })
              // Step 3: DCV confirmed
              steps = updateStep(steps, 3, {
                status: 'done',
                detail: `Domain ownership confirmed by GGS`,
                elapsed: dcvElapsed,
              })
              // Step 4: Certificate active -- show real expiry from DB
              steps = updateStep(steps, 4, {
                status: 'done',
                detail: latest.valid_till
                  ? `Active · expires ${new Date(latest.valid_till).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}`
                  : 'Certificate is active',
              })
              // Step 5: install -- show as active; poll is_live_on_server separately below
              steps = updateStep(steps, 5, {
                status: 'active',
                detail: 'Auto-installing on server…',
              })
              return { ...p, pollTimer: null, steps }
            })
            loadHistory()

            // Poll is_live_on_server for up to 3 minutes
            const certId = cert.id
            const installPollStart = Date.now()
            // Poll every 8s for up to 10 minutes.
            // install-cron runs every 2 minutes and will auto-install.
            const installTimer = setInterval(async () => {
              try {
                const { data: certRow } = await supabase
                  .from('certificates').select('is_live_on_server, install_pending_since')
                  .eq('id', certId).single()

                const elapsed = Math.round((Date.now() - installPollStart) / 1000)
                const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed/60)}m ${elapsed%60}s` : `${elapsed}s`
                const nextCronIn = Math.max(0, 120 - (elapsed % 120))

                if (certRow?.is_live_on_server) {
                  clearInterval(installTimer)
                  setProgress(p => ({
                    ...p, steps: updateStep(p.steps, 5, {
                      status: 'done',
                      detail: 'Certificate installed on server ✓',
                    })
                  }))
                  setBusy(false)
                } else if (Date.now() - installPollStart > 10 * 60 * 1000) {
                  // 10 min timeout -- tell user cron will keep retrying
                  clearInterval(installTimer)
                  setProgress(p => ({
                    ...p, steps: updateStep(p.steps, 5, {
                      status: 'skipped',
                      detail: 'Auto-install cron is running every 2 min -- cert will install automatically. Check dashboard in a few minutes.',
                    })
                  }))
                  setBusy(false)
                } else {
                  // Update progress detail with countdown to next cron attempt
                  const hasPendingSince = certRow?.install_pending_since
                  setProgress(p => ({
                    ...p, steps: updateStep(p.steps, 5, {
                      status: 'active',
                      detail: hasPendingSince
                        ? `Install in progress… ${elapsedStr} elapsed`
                        : `Waiting for install cron · next attempt in ~${nextCronIn}s`,
                    })
                  }))
                }
              } catch { clearInterval(installTimer); setBusy(false) }
            }, 8000)
            // NOTE: do NOT setBusy(false) here.
            // busy must stay true until installTimer resolves (done/skipped/error).
            // Calling setBusy(false) here makes isDone=true prematurely,
            // which closes the modal before install step finishes.

          } else {
            // -- Still waiting: issued / dv_pending / processing ----------
            // 'issued'     = reissue accepted by GGS, waiting for DNS validation
            // 'dv_pending' = renewal, waiting for DNS validation
            // Both mean: GGS is checking DNS, not done yet

            // After 15s, mark step 2 as done (DNS add was attempted,
            // if it failed the cron will have fixed it by now)
            if (!step2MarkedDone && elapsed >= 15) {
              step2MarkedDone = true
              setProgress(p => ({
                ...p,
                steps: updateStep(p.steps, 2, {
                  status: 'done',
                  detail: d.dcv_txt_value
                    ? `TXT record in DNS · ${d.dcv_txt_value.slice(0,20)}…`
                    : 'TXT record added to DNS',
                })
              }))
            }

            // Update step 3 with real elapsed time
            setProgress(p => ({
              ...p,
              steps: updateStep(p.steps, 3, {
                status: 'active',
                detail: `GGS validating DNS ownership… ${elapsedStr} elapsed`,
              })
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
      completed:          { bg:'rgba(39,174,96,0.12)',   color:'#16a068', label:'✓ Completed',       dot:true },
      issued:             { bg:'rgba(39,174,96,0.12)',   color:'#16a068', label:'✓ Issued',           dot:true },
      active:             { bg:'rgba(39,174,96,0.12)',   color:'#16a068', label:'✓ Active',           dot:true },
      installed:          { bg:'rgba(39,174,96,0.12)',   color:'#16a068', label:'✓ Installed',        dot:true },
      dv_pending:         { bg:'rgba(230,126,34,0.12)',  color:'#9a6400', label:'⏳ Validating DNS',   dot:false },
      pending:            { bg:'rgba(230,126,34,0.12)',  color:'#9a6400', label:'⏳ Pending',          dot:false },
      pending_validation: { bg:'rgba(230,126,34,0.12)',  color:'#9a6400', label:'⏳ Validating DNS',   dot:false },
      superseded:         { bg:'rgba(31,92,78,0.08)',    color:'#555555', label:'↩ Superseded',       dot:false },
      failed:             { bg:'rgba(248,113,113,0.12)', color:'#1f5c4e', label:'✗ Failed',           dot:false },
    }
    const t = map[s] || { bg:'rgba(31,92,78,0.07)', color:'#555555', label: s||'--', dot:false }
    return <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:t.bg, color:t.color, whiteSpace:'nowrap' }}>{t.label}</span>
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
    if (status === 'done')    return <span style={{color:'#1f5c4e',fontWeight:700}}>✓</span>
    if (status === 'error')   return <span style={{color:'#1f5c4e',fontWeight:700}}>✗</span>
    if (status === 'active')  return <span style={{display:'inline-block',width:12,height:12,borderRadius:'50%',border:'2px solid #2a6b5c',borderTopColor:'transparent',animation:'spin .7s linear infinite',verticalAlign:'middle'}}/>
    return <span style={{color:'rgba(30,0,0,0.5)',fontWeight:700}}>○</span>
  }

  return (
    <div style={{ marginTop:4 }}>
      {/* Mission Control Modal -- renders as full overlay */}
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
      <div style={{ display:'flex', borderBottom:'1px solid rgba(0,0,0,0.07)', marginBottom:14 }}>
        {[['reissues','Reissue History'], ['renewals','Renewals']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontSize:11, fontWeight:500, padding:'5px 14px', border:'none', background:'none',
            cursor:'pointer', fontFamily:'inherit',
            color: tab===k ? '#111111' : 'var(--v2-text-3)',
            borderBottom: tab===k ? '2px solid #2a6b5c' : '2px solid transparent',
            marginBottom:-1
          }}>
            {l}
            {k==='reissues' && reissues.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? 'rgba(0,0,0,0.07)' : 'transparent', color: tab===k ? '#111111' : '#888888' }}>
                {reissues.length}
              </span>
            )}
            {k==='renewals' && renewals.length > 0 && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                background: tab===k ? 'rgba(0,0,0,0.07)' : 'transparent', color: tab===k ? '#111111' : '#888888' }}>
                {renewals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* -- REISSUE HISTORY -- */}
      {tab==='reissues' && (
        <div>
          {/* Summary line */}
          {reissues.length > 0 && (() => {
            // A dv_pending reissue is only truly in-progress if the CERT itself
            // is still not active. If cert.status === 'active', the order is done
            // and the dv_pending row is just stale DB state.
            const trulyPending = reissues.some(r =>
              r.status === 'dv_pending' && cert.status !== 'active'
            )
            return (
              <div style={{ fontSize:12, color:'#555555', marginBottom:12 }}>
                This certificate has been reissued <strong style={{ color:'#111111' }}>{reissues.length} time{reissues.length!==1?'s':''}</strong>.
                {trulyPending && (
                  <span style={{ marginLeft:8, color:'#9a6400' }}>⏳ One reissue is currently in progress.</span>
                )}
              </div>
            )
          })()}

          {reissues.length === 0 ? (
            <div style={{ fontSize:12, color:'#555555', padding:'12px 0' }}>
              No reissues yet. Use the Reissue SSL button above to regenerate this certificate with a fresh key pair.
            </div>
          ) : reissues.map((r, i) => {
            // Cross-check: if the cert itself is active, any dv_pending row is stale
            const isDone    = r.status==='completed' || r.status==='active' || r.status==='issued'
                           || (r.status==='dv_pending' && cert.status==='active')
            const isPending = r.status==='dv_pending' && cert.status !== 'active'
            const isFailed  = r.status==='failed'
            const dotColor  = isDone ? '#16a068' : isPending ? '#9a6400' : isFailed ? '#1f5c4e' : '#b0a8a0'
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
                borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                {/* Status dot */}
                <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:dotColor,
                  animation: isPending ? 'v3pulse 1.5s ease infinite' : 'none' }}/>
                {/* Main info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#111111' }}>
                      {isDone ? '✓ Reissued successfully' : isPending ? '⏳ Reissue in progress' : isFailed ? '✗ Reissue failed' : 'Reissue'}
                    </span>
                    {isPending && (
                      <span style={{ fontSize:10, color:'#9a6400' }}>DNS validation underway</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'#555555', marginTop:2 }}>
                    {fmtDate(r.created_at)}
                    {r.expires_at && <span style={{ color:'#16a068', marginLeft:10 }}>Valid until {fmtDate(r.expires_at)}</span>}
                    {isPending && <span style={{ color:'#9a6400', marginLeft:10 }}>Certificate will activate automatically -- no action needed</span>}
                  </div>
                </div>
                {/* Certificate PEM download -- only when done */}
                {isDone && r.cert_pem && (
                  <CopyBtn text={r.cert_pem} label="Copy cert"/>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* -- RENEWALS -- */}
      {tab==='renewals' && (
        <div>
          {renewals.length === 0 ? (
            <div style={{ fontSize:12, color:'#555555', padding:'12px 0', textAlign:'center' }}>
              No renewals yet. Use the Renew button to place a new 12-month order.
            </div>
          ) : renewals.map(r => (
            <div key={r.id} style={{ padding:'10px 14px', borderRadius:8, marginBottom:8,
              background:'var(--v2-surface)', border:'1px solid var(--v2-border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#111111' }}>
                  Renewal · GGS #{r.ggs_order_id||'--'}
                </div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4,
                  background: r.status==='active' ? 'rgba(74,222,128,0.12)' : 'transparent',
                  color: r.status==='active' ? '#16a068' : '#444444' }}>{r.status}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:'4px 12px' }}>
                {[
                  ['Created',    fmtDate(r.created_at)],
                  ['Valid from', r.issued_at  ? fmtDate(r.issued_at)  : '--'],
                  ['Expires',    r.expires_at ? fmtDate(r.expires_at) : '--'],
                  ['Version',    'v'+(r.cert_version||'--')],
                ].map(([l,v]) => (
                  <div key={l}>
                    <span style={{ fontSize:10, color:'#555555' }}>{l}: </span>
                    <span style={{ fontSize:11, fontWeight:500, color:'#111111' }}>{v}</span>
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




// -- Scan PQC button with loading + result toast -----------------------
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
        style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', color:'#1f5c4e',
          border:'none', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:600,
          cursor:scanning?'wait':'pointer', fontFamily:'inherit', opacity:scanning?0.8:1 }}>
        {scanning
          ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Scanning…</>
          : <><Shield size={11}/> Scan PQC</>}
      </button>
      {result && (
        <span style={{ fontSize:11, color: result.ok ? '#16a068' : '#1f5c4e',
          background: result.ok ? 'transparent' : 'rgba(31,92,78,0.09)',
          border: `0.5px solid ${result.ok ? 'rgba(31,92,78,0.2)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius:5, padding:'3px 8px' }}>
          {result.ok ? `✓ ${result.scanned} cert${result.scanned!==1?'s':''} scanned` : `✗ ${result.error||'Failed'}`}
        </span>
      )}
    </div>
  )
}

// -- PQC Readiness row -------------------------------------------------
const PQC_RISK_MAP = {
  ready:  { color:'#16a068', bg:'transparent', border:'rgba(31,92,78,0.2)', label:'PQC Ready',     icon:'✓' },
  low:    { color:'#1f5c4e', bg:'transparent', border:'rgba(31,92,78,0.2)', label:'Low risk',       icon:'~' },
  medium: { color:'#1f5c4e', bg:'rgba(248,113,113,0.12)', border:'rgba(0,0,0,0.1)', label:'Medium risk',    icon:'!' },
  high:   { color:'#1f5c4e', bg:'rgba(31,92,78,0.09)', border:'rgba(0,0,0,0.1)', label:'High risk',      icon:'✗' },
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
    <div style={{ border:'1px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
      <div onClick={()=>risk&&setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 14px', background:'rgba(0,0,0,0.02)',
          cursor: risk ? 'pointer' : 'default', transition:'background .15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.12)'}
        onMouseLeave={e=>e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(248,113,113,0.12)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={16} color="#1f5c4e"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#111111' }}>
              Post-quantum readiness
            </div>
            <div style={{ fontSize:11, color:'#555555', marginTop:1 }}>
              {cert.key_algorithm
                ? <span>Algorithm: <strong style={{color:'#111111'}}>{cert.key_algorithm}</strong>{risk && <span> · click to {open?'collapse':'expand'}</span>}</span>
                : noPem ? 'No cert PEM available -- import or sync from CA first'
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
                color:'#1f5c4e', background:'rgba(248,113,113,0.12)', border:'0.5px solid rgba(154,100,0,0.2)',
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
        <div style={{ borderTop:'1px solid var(--v2-border)', background:'var(--v2-surface-3)', padding:'14px' }}>
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
                    ['Algorithm',  d.algorithm || '--'],
                    ['Key size',   d.bits ? `${d.bits} bits` : '--'],
                    ['Risk level', d.label || '--'],
                    ['Deadline',   d.deadline || '--'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:'rgba(0,0,0,0.02)', borderRadius:7, padding:'9px 11px', border:'1px solid var(--v2-border)' }}>
                      <div style={{ fontSize:10, color:'#555555', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:500, color: k==='Risk level'?riskDef.color:'#111111',
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
                <div style={{ fontSize:11, color:'#555555', lineHeight:1.6, borderTop:'1px solid var(--v2-border)', paddingTop:10, marginTop:4 }}>
                  NIST finalized ML-DSA (CRYSTALS-Dilithium), SLH-DSA (SPHINCS+), and ML-KEM (CRYSTALS-Kyber) in August 2024.
                  RSA and ECDSA will be deprecated for sensitive data by 2030–2035.{' '}
                  <span style={{ color:'#1f5c4e', cursor:'pointer' }}
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

// -- TLS Posture inline row with expandable results ------------------------
function TlsPostureRow({ cert, onRefresh }) {
  const [open,     setOpen]     = useState(false)
  const [checking, setChecking] = useState(false)
  const [result,   setResult]   = useState(cert.tls_details || null)

  const gradeColor = { A:'#16a068', B:'#65a30d', C:'#111111', D:'#1f5c4e', F:'#1f5c4e' }
  const grade = cert.tls_grade
  const score = cert.tls_score || 0
  const color = gradeColor[grade] || '#444444'

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
    <div style={{ border:'1px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
      {/* Header row -- always visible */}
      <div onClick={() => grade && setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'11px 14px', background:'rgba(0,0,0,0.02)',
          cursor: grade ? 'pointer' : 'default',
          transition:'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background='transparent'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Activity size={16} color="#1f5c4e"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#111111' }}>Check TLS posture</div>
            <div style={{ fontSize:11, color:'#555555', marginTop:1 }}>
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
              color:'#1f5c4e', background:'transparent', border:'1px solid rgba(63,185,80,0.2)',
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
        <div style={{ borderTop:'1px solid var(--v2-border)', background:'var(--v2-surface-3)',
          padding:'12px 14px' }}>
          {/* Score bar */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:500, color:'#333333' }}>Overall score</span>
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
              padding:'7px 0', borderBottom:'1px solid rgba(0,0,0,0.06)' }}
              className="tls-check-row">
              <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:1,
                background: check.pass ? 'transparent' : 'rgba(31,92,78,0.09)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {check.pass
                  ? <Check size={10} color="#16a34a"/>
                  : <X size={10} color="#1f5c4e"/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500,
                  color: check.pass ? 'var(--v2-text)' : '#1f5c4e' }}>
                  {checkLabels[key] || key.replace(/_/g,' ')}
                  {check.points > 0 && (
                    <span style={{ fontSize:10, fontWeight:400, color:'#555555',
                      marginLeft:6 }}>+{check.points}pts</span>
                  )}
                </div>
                <div style={{ fontSize:11, color:'#555555', marginTop:1, lineHeight:1.5 }}>
                  {check.detail}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:8, fontSize:11, color:'#555555', lineHeight:1.6 }}>
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
  const statusColor = isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068'

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
        body: JSON.stringify({ action: 'cancel_order', cert_id: cert.id })
      })
      const d = await r.json()
      if (d.ok) {
        setCancelMsg('Certificate cancelled and revoked on GoGetSSL.')
        setCancelConfirm(false)
        setTimeout(() => onRefresh(), 2000)
      } else if (d.code === 'cancellation_not_eligible') {
        setCancelMsg('Not eligible: cancellation is only available within 30 days of issuance.')
        setCancelConfirm(false)
      } else if (d.code === 'ggs_cancel_failed') {
        setCancelMsg('GoGetSSL error: ' + (d.message || 'Could not cancel. Contact support.'))
        setCancelConfirm(false)
      } else {
        setCancelMsg('Error: ' + (d.error || d.message || 'Unknown error'))
        setCancelConfirm(false)
      }
    } catch(e) { setCancelMsg('Error: ' + e.message); setCancelConfirm(false) }
    setCancelling(false)
  }

  // -- Validity timeline ---------------------------------------------
  const certStart  = cert.issued_at  ? new Date(cert.issued_at)  : null
  const certEnd    = cert.expires_at ? new Date(cert.expires_at) : null
  const subEnd     = certStart ? (() => { const d = new Date(certStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })() : null
  const totalMs    = certStart && subEnd ? subEnd - certStart : 1
  const certPct    = certStart && certEnd ? Math.min(100, ((certEnd - certStart) / totalMs) * 100) : 0
  const todayPct   = certStart ? Math.max(0, Math.min(100, ((Date.now() - certStart) / totalMs) * 100)) : 0
  const fmtD       = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '--'

  // -- Action button style -------------------------------------------
  const ABtn = ({ icon: Icon, label, onClick, color='#1f5c4e', disabled }) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
        background:'transparent', border:'1px solid #cccccc',
        borderRadius:7, cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#999999' : color,
        fontFamily:'inherit', fontSize:12, fontWeight:600, transition:'all .15s',
        opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background='rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor='#999999' }}}
      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='#cccccc' }}>
      {Icon && <Icon size={12}/>} {label}
    </button>
  )

  // -- Field row -----------------------------------------------------
  const Field = ({ label, value, mono, copy }) => {
    const [ok, setOk] = useState(false)
    if (!value) return null
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:2, padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize:10, color:'#555555', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#111111', fontFamily: mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{value}</span>
          {copy && <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500) }}
            style={{ background:'none', border:'1px solid rgba(0,0,0,0.08)', borderRadius:3, cursor:'pointer',
              color: ok ? '#16a068' : '#b0a8a0', fontSize:10, padding:'1px 6px', fontFamily:'inherit' }}>
            {ok ? '✓' : 'Copy'}
          </button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)',
      borderRadius:12, overflow:'hidden', marginTop:4, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', animation:'fadeSlideUp 0.2s ease both' }}>

      {/* -- Status banner -- */}
      <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:10,
        background: isExpired ? 'rgba(0,0,0,0.08)' : isWarn ? 'rgba(230,100,0,0.15)' : 'rgba(22,163,74,0.12)',
        borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize:18 }}>{isExpired ? '⚠️' : '✅'}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color: statusColor }}>
            {isExpired ? 'Certificate expired' : isWarn ? `Expires in ${days} days` : 'SSL certificate is approved and issued'}
          </div>
          <div style={{ fontSize:11, color:'#555555', marginTop:1 }}>
            {isExpired ? 'Renew immediately to restore HTTPS' : isWarn ? 'Reissue soon to avoid expiry' : 'Certificate is ready to be installed. Download and follow installation guides.'}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#555555',
            fontSize:18, lineHeight:1, padding:'2px 6px' }}>×</button>
      </div>

      {/* -- Action buttons row -- matches GoGetSSL toolbar -- */}
      <div style={{ padding:'10px 18px', display:'flex', gap:8, flexWrap:'wrap',
        borderBottom:'1px solid rgba(0,0,0,0.07)', background:'#f4f1ec' }}>
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
          <ABtn icon={ShieldOff} label="Cancel order" color='#1f5c4e' onClick={() => setCancelConfirm(true)}/>
        )}
        {canCancel && cancelConfirm && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'#1f5c4e' }}>Cancel GGS #{cert.ggs_order_id}?</span>
            <button onClick={doCancel} disabled={cancelling}
              style={{ fontSize:11, fontWeight:600, color:'white', background:'#1f5c4e', border:'none',
                borderRadius:5, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              {cancelling ? 'Cancelling…' : 'Yes'}
            </button>
            <button onClick={() => setCancelConfirm(false)}
              style={{ fontSize:11, color:'#555555', background:'none', border:'1px solid rgba(0,0,0,0.09)',
                borderRadius:5, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              No
            </button>
          </div>
        )}
        {cancelMsg && <span style={{ fontSize:11, color: cancelMsg.includes('Error') ? '#1f5c4e' : '#16a068', alignSelf:'center' }}>{cancelMsg}</span>}
        {refreshMsg && <span style={{ fontSize:11, color: refreshMsg.includes('Error') || refreshMsg.includes('error') ? '#1f5c4e' : '#16a068', alignSelf:'center' }}>{refreshMsg}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {!delConfirm
            ? <ABtn icon={X} label="Delete" color='#b0a8a0' onClick={() => setDel(true)}/>
            : <ABtn icon={X} label="Confirm delete" color='#1f5c4e' onClick={() => onDelete(cert.id)}/>
          }
        </div>
      </div>

      {/* -- Validity timeline bar -- */}
      {certStart && certEnd && (
        <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#555555', marginBottom:6 }}>
            <span>{fmtD(cert.issued_at)} · SSL valid from</span>
            <span style={{ color: isWarn || isExpired ? '#1f5c4e' : '#16a068', fontWeight:600 }}>
              {isExpired ? 'Expired' : `Next reissue in ${days} days`}
            </span>
            {subEnd && <span>{fmtD(subEnd)} · Subscription ends</span>}
          </div>
          <div style={{ position:'relative', height:14, borderRadius:6, overflow:'hidden',
            background:'rgba(0,0,0,0.07)', border:'1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0,
              width: certPct+'%', borderRadius:'6px 0 0 6px',
              background: isExpired ? '#1f5c4e' : isWarn ? '#111111' : '#16a068' }}/>
            <div style={{ position:'absolute', top:0, bottom:0, left: certPct+'%', right:0,
              backgroundImage:'repeating-linear-gradient(45deg,rgba(0,0,0,0.03) 0px,rgba(0,0,0,0.03) 4px,transparent 4px,transparent 8px)' }}/>
            <div style={{ position:'absolute', top:0, bottom:0, left:'calc('+todayPct+'% - 1px)',
              width:2, background:'white', borderRadius:1, opacity:0.7 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#555555', marginTop:4 }}>
            <span>{fmtD(cert.issued_at)}</span>
            <span style={{ fontWeight:600, color: isWarn || isExpired ? '#1f5c4e' : '#111111' }}>{fmtD(cert.expires_at)}</span>
            {subEnd && <span>{fmtD(subEnd)}</span>}
          </div>
        </div>
      )}

      {/* -- Section tabs -- */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(0,0,0,0.07)', padding:'0 18px', background:'#fff' }}>
        {[['details','Details'], ['files','Files'], ['history','History'], ['security','Security'], ['posture','Posture']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveSection(k)}
            style={{ fontSize:12, fontWeight:600, padding:'10px 14px', border:'none', background:'none',
              cursor:'pointer', fontFamily:'inherit', marginBottom:-1,
              color: activeSection===k ? '#1f5c4e' : '#888888',
              borderBottom:'2px solid '+(activeSection===k ? '#1f5c4e' : 'transparent'),
              transition:'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* -- Details section -- GoGetSSL exact layout -- */}
      {activeSection === 'details' && (() => {
        // Subscription period = order placed date + period months (billing year)
        const subStart = cert.issued_at ? new Date(cert.issued_at) : null
        const subEnd   = cert.subscription_end_date
          ? new Date(cert.subscription_end_date)
          : subStart
            ? (() => { const d = new Date(subStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })()
            : null
        const fmt      = d => d ? new Date(d).toISOString().split('T')[0] : '--'
        const fmtLong  = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '--'

        // Subscription period string: "12 months (2026-05-28 – 2027-05-27)"
        const periodStr = subStart && subEnd
          ? `${cert._order?.period || 12} months (${fmt(subStart)} – ${fmt(subEnd)})`
          : `${cert._order?.period || 12} months`

        return (
          <div style={{ padding:'18px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 40px' }}>
            {/* Left -- Main Details */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#1f5c4e', textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:12, paddingBottom:8,
                borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:6 }}>
                📋 Main Details
              </div>

              {/* Each row: label left, value right -- exactly like GGS */}
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
                  padding:'9px 0', borderBottom:'1px solid rgba(0,0,0,0.04)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#555555', flexShrink:0, minWidth:140 }}>{label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6, textAlign:'right' }}>
                    <span style={{ fontSize:12, color: label==='Order Status' ? '#16a068' : '#111111',
                      fontFamily: mono ? 'monospace' : 'inherit' }}>
                      {value}
                    </span>
                    {copy && value && (
                      <button onClick={() => navigator.clipboard.writeText(value)}
                        style={{ fontSize:10, color:'#555555', background:'none',
                          border:'1px solid rgba(0,0,0,0.08)', borderRadius:3,
                          padding:'1px 6px', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* "Why shorter?" note below Files Valid Till */}
              <div style={{ padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:11, color:'#999999', lineHeight:1.5 }}>
                  ⓘ <strong style={{ color:'#555555' }}>Why is cert validity shorter than subscription?</strong>
                  {' '}Industry rules (effective March 2026) limit SSL certificates to 199 days max.
                  Your subscription period is still {cert._order?.period || 12} months -- reissue is free and auto-handled.
                </div>
              </div>
            </div>

            {/* Right -- Administrator Contact */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#1f5c4e', textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:12, paddingBottom:8,
                borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:6 }}>
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
                  padding:'9px 0', borderBottom:'1px solid rgba(0,0,0,0.04)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#555555', flexShrink:0, minWidth:100 }}>{label}</span>
                  <span style={{ fontSize:12, color:'#111111', textAlign:'right' }}>{value}</span>
                </div>
              ))}

              {/* Technical Contact -- same data for DV certs */}
              <div style={{ fontSize:11, fontWeight:700, color:'#1f5c4e', textTransform:'uppercase',
                letterSpacing:'0.8px', margin:'20px 0 12px', paddingBottom:8,
                borderBottom:'1px solid rgba(0,0,0,0.08)', display:'flex', alignItems:'center', gap:6 }}>
                🔧 Technical Contact
              </div>
              {[
                ['First Name', cert._order?.tech_first_name || cert._order?.admin_first_name],
                ['Last Name',  cert._order?.tech_last_name  || cert._order?.admin_last_name],
                ['Email',      cert._order?.tech_email      || cert._order?.admin_email],
                ['Phone',      cert._order?.tech_phone      || cert._order?.admin_phone],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={'t'+label} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                  padding:'9px 0', borderBottom:'1px solid rgba(0,0,0,0.04)', gap:16 }}>
                  <span style={{ fontSize:12, color:'#555555', flexShrink:0, minWidth:100 }}>{label}</span>
                  <span style={{ fontSize:12, color:'#111111', textAlign:'right' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* -- Files section -- */}
      {activeSection === 'files' && (
        <div style={{ padding:'18px', display:'flex', flexDirection:'column', gap:10 }}>
          {cert.cert_pem ? (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', borderRadius:8, border:'1px solid rgba(0,0,0,0.09)',
                background:'#fafaf9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <FileText size={16} color="#1f5c4e"/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#111111', fontFamily:'"JetBrains Mono",monospace' }}>Certificate (cert.pem)</div>
                    <div style={{ fontSize:11, color:'#555555' }}>Fullchain · end-entity + intermediate</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <CopyBtn text={cert.cert_pem} label="Copy"/>
                  <button onClick={() => dl(cert.cert_pem, cert.domain+'-cert.pem')} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    <Download size={10}/> Download
                  </button>
                </div>
              </div>
              {cert.ca_pem && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 14px', borderRadius:8, border:'1px solid rgba(0,0,0,0.07)',
                  background:'rgba(0,0,0,0.02)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <FileText size={16} color="#b0a8a0"/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#111111', fontFamily:'"JetBrains Mono",monospace' }}>Intermediate CA (ca.pem)</div>
                      <div style={{ fontSize:11, color:'#555555' }}>CA bundle for chain of trust</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <CopyBtn text={cert.ca_pem} label="Copy"/>
                    <button onClick={() => dl(cert.ca_pem, cert.domain+'-ca.pem')} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                      <Download size={10}/> Download
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize:13, color:'#555555', textAlign:'center', padding:'24px 0' }}>
              Certificate files not yet available -- order may still be processing.
            </div>
          )}
          {/* Private key via KeyLocker */}
          <div style={{ padding:'12px 14px', borderRadius:8, border:'1px solid rgba(31,92,78,0.2)',
            background:'rgba(192,57,43,0.05)', marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Lock size={14} color="#1f5c4e"/>
              <span style={{ fontSize:12, fontWeight:600, color:'#1f5c4e' }}>Private Key</span>
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:3,
                background:'rgba(248,113,113,0.12)', color:'#1f5c4e', fontWeight:700 }}>VAULT</span>
            </div>
            <div style={{ fontSize:11, color:'#555555' }}>
              Private key is encrypted in KeyLocker. Go to CertVault to access it securely.
            </div>
            <button onClick={() => nav('/certvault')}
              style={{ marginTop:8, fontSize:11, fontWeight:600, color:'#1f5c4e',
                background:'transparent', border:'1px solid rgba(31,92,78,0.2)',
                borderRadius:5, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit' }}>
              Open CertVault →
            </button>
          </div>
        </div>
      )}

      {/* -- History section -- */}
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

      {/* -- Security section -- */}
      {activeSection === 'security' && (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          <TlsPostureRow cert={cert} onRefresh={onRefresh}/>
          <PqcRow cert={cert} onRefresh={onRefresh}/>
          <VulnScanner domain={cert.domain} session={session}/>
        </div>
      )}

      {activeSection === 'posture' && (
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {/* -- Cert Posture Panel -- unified health view per cert -- */}
          {[
            {
              label: 'Install status',
              ok: cert.is_live_on_server,
              okText: cert.live_confirmed_by === 'certbind_probe' ? 'TLS verified live' : 'Live on server',
              failText: cert.install_method ? 'Install pending' : 'Not installed',
              failColor: cert.install_method ? '#9a6400' : '#1f5c4e',
            },
            {
              label: 'Auto-renew',
              ok: !!cert.auto_renew_enabled,
              okText: 'Enabled',
              failText: 'Disabled -- cert will expire without action',
              failColor: '#1f5c4e',
            },
            {
              label: 'SSL health grade',
              ok: ['A+','A','B'].includes(cert._healthGrade),
              okText: cert._healthGrade || 'Not scanned yet',
              failText: cert._healthGrade || 'Not scanned yet',
              failColor: cert._healthGrade === 'F' ? '#1f5c4e' : '#9a6400',
              neutral: !cert._healthGrade,
            },
            {
              label: 'Private key (CertVault)',
              ok: !!cert.keylocker_key_id,
              okText: 'Stored in CertVault',
              failText: 'Not in vault',
              failColor: '#9a6400',
            },
            {
              label: 'DNS provider (auto-DCV)',
              ok: !!cert.dns_provider_id,
              okText: 'Connected -- auto-renewal ready',
              failText: 'Not connected -- renewal requires manual DCV',
              failColor: '#9a6400',
            },
          ].map(({ label, ok, okText, failText, failColor, neutral }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 14px', borderRadius:8,
              background:'rgba(0,0,0,0.02)',
              border:'1px solid rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize:12, color:'#555555' }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:600,
                color: neutral ? '#b0a8a0' : ok ? '#16a068' : failColor }}>
                {neutral ? okText : ok ? okText : failText}
              </span>
            </div>
          ))}

          {/* Readiness score */}
          {(() => {
            const checks = {
              install:     cert.is_live_on_server,
              auto_renew:  !!cert.auto_renew_enabled,
              dns:         !!cert.dns_provider_id,
              key_vault:   !!cert.keylocker_key_id,
              health:      ['A+','A','B'].includes(cert._healthGrade),
            }
            const score = (checks.install?20:0)+(checks.auto_renew?25:0)+(checks.dns?25:0)+(checks.key_vault?15:0)+(checks.health?15:0)
            const color = score>=80?'#16a068':score>=50?'#9a6400':'#1f5c4e'
            const label = score>=80?'Ready':'At risk'
            return (
              <div style={{ marginTop:4, padding:'12px 14px', borderRadius:8,
                background:'rgba(0,0,0,0.02)', border:`0.5px solid ${color}22`,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#555555' }}>Posture score</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:80, height:4, borderRadius:4, background:'rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ width:`${score}%`, height:'100%', borderRadius:4, background:color, transition:'width .4s ease' }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color }}>{score}/100 · {label}</span>
                </div>
              </div>
            )
          })()}
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
        <div style={{ fontSize:11, fontWeight:600, color:'#111111', marginBottom:4 }}>
          Embeddable SSL badge
        </div>
        <div style={{ fontSize:11, color:'#555555', marginBottom:8, lineHeight:1.5 }}>
          Paste this on your website to show a live SSL status badge. Updates automatically.
        </div>
        <div style={{ background:'transparent', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'#1f5c4e', wordBreak:'break-all', marginBottom:8 }}>
          {widgetSnippet}
        </div>
        <button onClick={copyWidget}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'1px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'#333333', fontFamily:'inherit' }}>
          {copiedW ? <><Check size={10} color="#16a34a"/> Copied!</> : <><Copy size={10}/> Copy snippet</>}
        </button>
      </div>
      <div style={{ borderTop:'1px solid var(--v2-border)', paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#111111', marginBottom:4 }}>
          Public SSL status page
        </div>
        <div style={{ fontSize:11, color:'#555555', marginBottom:8, lineHeight:1.5 }}>
          Share this link with clients -- shows all your SSL grades publicly, no login needed.
        </div>
        <div style={{ background:'var(--v2-surface-3)', borderRadius:8, padding:'10px 12px',
          fontFamily:'monospace', fontSize:11, color:'#333333', wordBreak:'break-all', marginBottom:8 }}>
          {statusUrl}
        </div>
        <button onClick={copyStatus}
          style={{ display:'flex', alignItems:'center', gap:5, background:'none',
            border:'1px solid var(--v2-border)', borderRadius:6, padding:'6px 12px',
            fontSize:11, cursor:'pointer', color:'#333333', fontFamily:'inherit' }}>
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
  const dotColor = s.dot==='green'?'#111111':s.dot==='amber'?'#111111':s.dot==='red'?'#1f5c4e':'#cccccc'

  // Group versions by ggs_order_id -- each unique order = one subscription
  const subscriptionMap = {}
  for (const v of versions) {
    const key = v.ggs_order_id || v.id
    if (!subscriptionMap[key]) subscriptionMap[key] = []
    subscriptionMap[key].push(v)
  }
  // Sort subscriptions: OLDEST first (chronological) so numbering is correct
  // Subscription 1 = first ever placed, Subscription 2 = renewal, etc.
  // This matches customer expectations -- Sub 1 is what they first ordered
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

  // Find the ONE cert that is live right now -- 3-layer priority:
  // Layer 1: DB flag is_live_on_server=true (set by agent/cpanel/certbind)
  // Layer 2: precomputed map from agent_jobs latest install per domain
  // Layer 3: none found → no cert marked live (show unknown)
  const liveCertByDomain = versions[0]?._liveCertByDomain || {}
  const liveCertId = liveCertByDomain[primary.domain] || null

  // Confirmed-by source for the live cert
  const liveCert = versions.find(v => v.id === liveCertId)
  const liveConfirmedBy = liveCert?.live_confirmed_by || null

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '--'

  return (
    <div style={{ background:'var(--v2-surface)',
      border:`0.5px solid ${selected===primary.id ? '#111111' : 'var(--v2-border)'}`,
      borderRadius:12, overflow:'hidden', transition:'border-color 0.15s' }}>

      {/* -- LEVEL 1: Domain anchor row -- */}
      <div onClick={() => onSelect(primary.id)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
          cursor:'pointer', transition:'background 0.15s', background:'var(--v2-surface)' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}>

        <span style={{ fontSize:11, color:'#555555', fontWeight:600, minWidth:16, textAlign:'right', flexShrink:0 }}>{index}</span>

        {/* Avatar */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#ff6b5b,#ff9e8c)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#111111', letterSpacing:0.5 }}>{initials}</div>
          <span style={{ position:'absolute', bottom:-2, right:-2, width:9, height:9,
            borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-surface)' }}/>
        </div>

        {/* Domain info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace', color:'#1f5c4e' }}>
              {primary.domain}
            </span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
              background: s.dot==='green'?'transparent':s.dot==='amber'?'rgba(230,126,34,0.12)':'rgba(31,92,78,0.08)',
              color: s.dot==='green'?'#2e7a68':s.dot==='amber'?'#1f5c4e':'#2e7a68' }}>
              {days != null ? `${days}d left` : primary.status}
            </span>
            {primary.install_method && (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                background: primary.install_method==='cpanel'?'#1f5c4e':'#555555',
                color: primary.install_method==='cpanel'?'#8B6914':'#111111',
                border:`0.5px solid ${primary.install_method==='cpanel'?'rgba(30,0,0,0.5)':'#444444'}`,
                display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                {primary.install_method==='cpanel' ? '🌐 cPanel' : '🖥 VPS'}
              </span>
            )}
            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20,
              background:'rgba(0,0,0,0.02)', color:'#555555', border:'1px solid var(--v2-border)' }}>
              {primary.cert_type || primary.issuer || 'RapidSSL Standard'}
            </span>
          </div>
          <div style={{ fontSize:11, color:'#555555' }}>
            {subscriptions.length} subscription{subscriptions.length!==1?'s':''} · {versions.length} cert version{versions.length!==1?'s':''} · Expires {fmtDate(primary.expires_at)}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'#555555' }}>Expires</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1f5c4e' }}>{fmtDate(primary.expires_at)}</div>
          </div>
          {(hasVersions || hasMultipleSubs) && (
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
              style={{ background:'rgba(0,0,0,0.02)', border:'1px solid var(--v2-border)', borderRadius:6,
                padding:'4px 8px', fontSize:10, color:'#333333', cursor:'pointer',
                display:'flex', alignItems:'center', gap:3, fontFamily:'inherit', flexShrink:0 }}>
              {expanded ? '▲ Hide' : '▼ Expand'}
            </button>
          )}
          <ChevronRight size={14} style={{ color:'#555555', flexShrink:0 }}/>
        </div>
      </div>

      {/* Validity progress bar */}
      {days != null && (
        <div style={{ height:4, background:'rgba(31,92,78,0.09)', borderRadius:4 }}>
          <div style={{ height:'100%',
            width:`${Math.min(100, Math.max(0, (days/398)*100))}%`,
            background:`linear-gradient(90deg, #2a6b5c, #2a6b5c)` }}/>
        </div>
      )}

      {/* -- LEVELS 2 + 3: Subscription groups + version rows -- */}
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
            // Active original → dark teal #2a6b5c
            // Renewal         → mint teal #2a6b5c
            // Older           → muted cream
            const borderColor = isActiveSub && !isRenewal ? '#111111'
              : isRenewal ? '#111111'
              : '#cccccc'

            const headerBg    = isActiveSub && !isRenewal ? 'transparent'
              : isRenewal ? 'transparent'
              : '#000000'
            const headerBorder = isActiveSub && !isRenewal ? 'rgba(31,92,78,0.2)'
              : isRenewal ? 'rgba(31,92,78,0.2)'
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

                {/* -- LEVEL 2: Subscription header -- */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
                  background:headerBg, borderBottom:`0.5px solid ${headerBorder}` }}>
                  {/* Left accent bar */}
                  <div style={{ width:4, height:40, borderRadius:4, background:borderColor, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase',
                        letterSpacing:'0.4px', color: isRenewal?'#111111': isActiveSub?'#111111':'#6B5A3E' }}>
                        Subscription {subNumberMap[subNewest.ggs_order_id || subNewest.id] || (si + 1)} · {subLabel}
                      </span>
                      {isActiveSub && (
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                          background:isRenewal?'#111111':'#111111', color:'#1f5c4e' }}>
                          {isRenewal ? '↻ Active renewal' : 'Active'}
                        </span>
                      )}
                      {ggsOrder && (
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20,
                          background:'transparent', color:'#1f5c4e', border:`0.5px solid ${headerBorder}`,
                          fontFamily:'monospace' }}>
                          GGS #{ggsOrder}
                        </span>
                      )}
                      <span style={{ fontSize:10, color:'#555555', marginLeft:'auto' }}>
                        {subVersions.length} version{subVersions.length!==1?'s':''}
                      </span>
                    </div>

                    {/* Timeline bar */}
                    {subStart && (
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ fontSize:9, color:'#555555', width:54, flexShrink:0 }}>
                          {subStart.toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                        </span>
                        <div style={{ flex:1, height:6, background:'#555555', borderRadius:6,
                          position:'relative', overflow:'visible' }}>
                          {/* Filled progress */}
                          <div style={{ position:'absolute', left:0, top:0, bottom:0,
                            width:`${isActiveSub ? subPct : 100}%`,
                            background:isActiveSub ? borderColor : '#cccccc',
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
                        <span style={{ fontSize:9, color:'#555555', width:54, textAlign:'right', flexShrink:0 }}>
                          {subEnd ? subEnd.toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '--'}
                        </span>
                      </div>
                    )}
                    {isActiveSub && subStart && (
                      <div style={{ display:'flex', gap:14, marginTop:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'transparent' }}/>
                          <span style={{ fontSize:9, color:'#555555' }}>Today</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'transparent' }}/>
                          <span style={{ fontSize:9, color:'#555555' }}>Auto-reissue trigger point</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* -- LEVEL 3: Version rows inside subscription -- */}
                {subVersions.map((v, vi) => {
                  // -- DEFINITIVE LIVE STATE ------------------------------------------
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

                  // Status labels -- unambiguous, scannable
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
                        borderTop:`1px solid var(--v2-border)`,
                        background: isLive ? 'transparent' : selected===v.id ? 'transparent' : 'var(--v2-surface)',
                        cursor:'pointer',
                        opacity: isLive ? 1 : wasInstalled ? 0.5 : neverInstalled && vi > 0 ? 0.4 : 1,
                        borderLeft: isLive ? '3px solid #2a6b5c' : wasInstalled ? '3px solid #E5E7EB' : neverInstalled && vi===0 ? '3px solid #2a6b5c' : '3px solid transparent',
                        transition:'background .15s' }}
                      onMouseEnter={e => { if(selected!==v.id) e.currentTarget.style.background='var(--v2-bg)' }}
                      onMouseLeave={e => { if(selected!==v.id) e.currentTarget.style.background='transparent' }}>

                      {/* Status icon -- each state has a distinct visual */}
                      <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background: isLive ? '#111111' : wasInstalled ? '#111111' : neverInstalled && vi===0 ? 'transparent' : '#111111',
                        border: isLive ? 'none' : wasInstalled ? '1.5px solid #E5E7EB' : vi===0 ? '1.5px dashed #2a6b5c' : '1.5px solid #E5E7EB',
                        position:'relative', overflow: wasInstalled ? 'hidden' : 'visible' }}>
                        {isLive && <Globe size={14} color="white"/>}
                        {wasInstalled && (
                          <>
                            <Server size={12} color="#777777"/>
                            <div style={{ position:'absolute', top:'50%', left:3, right:3, height:1.5, background:'#666666', transform:'rotate(-25deg)', transformOrigin:'center' }}/>
                          </>
                        )}
                        {!isLive && !wasInstalled && vi===0 && <Clock size={11} color="#1f5c4e"/>}
                        {!isLive && !wasInstalled && vi>0 && <span style={{fontSize:11,color:'rgba(0,0,0,0.08)',lineHeight:1}}>--</span>}
                      </div>

                      {/* Version info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20,
                            background: isLive ? '#111111' : wasInstalled ? '#111111' : vi===0 ? 'transparent' : '#111111',
                            color: isLive ? '#000000' : wasInstalled ? '#666666' : vi===0 ? '#111111' : '#666666',
                            border: isLive ? 'none' : `0.5px solid ${wasInstalled?'rgba(0,0,0,0.07)':vi===0?'rgba(31,92,78,0.2)':'rgba(0,0,0,0.07)'}`,
                            fontWeight: isLive ? 600 : 500,
                            flexShrink:0 }}>
                            {statusLabel}
                          </span>
                          <span style={{ fontSize:10, fontFamily:'monospace', color:'#555555' }}>
                            {vLabel} · {v.issued_at ? new Date(v.issued_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '--'}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:'#555555' }}>
                          SHA-256 · RSA 2048 ·
                          {v.cert_type || v.issuer || ' RapidSSL'} · Expires {fmtDate(v.expires_at)}
                        </div>
                      </div>

                      {/* Days left */}
                      {(() => {
                        const d = daysLeft(v.expires_at)
                        return (
                          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                            background: d==null?'var(--v2-bg)':d>30?'transparent':d>=0?'rgba(230,126,34,0.12)':'rgba(31,92,78,0.08)',
                            color: d==null?'var(--v2-text-3)':d>30?'#2e7a68':d>=0?'#1f5c4e':'#2e7a68',
                            flexShrink:0 }}>
                            {d==null?'--':d<=0?'Expired':`${d}d left`}
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


function CertRow({ cert, selected, onClick, index, hasPendingReissue }) {
  const days      = daysLeft(cert.expires_at)
  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const isActive  = cert.status === 'active'
  const statusColor = isExpired ? '#1f5c4e' : isWarn ? '#9a6400' : '#16a068'

  // Subscription period -- order placed date + period months
  const subStart = cert.issued_at ? new Date(cert.issued_at) : null
  const subEnd   = cert.subscription_end_date ? new Date(cert.subscription_end_date)
    : subStart ? (() => { const d = new Date(subStart); d.setMonth(d.getMonth() + (cert._order?.period || 12)); return d })()
    : null
  const fmtShort = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '--'

  return (
    <div onClick={onClick}
      style={{ display:'grid', gridTemplateColumns:'40px 1fr 180px 140px',
        alignItems:'center', gap:'0 0', padding:'14px 20px',
        cursor:'pointer', transition:'background .12s',
        background: selected ? 'rgba(192,57,43,0.07)' : 'transparent',
        borderLeft: selected ? '3px solid #2a6b5c' : '3px solid transparent',
        borderBottom:'1px solid rgba(0,0,0,0.04)' }}
      onMouseEnter={e=>{ if(!selected) e.currentTarget.style.background='rgba(255,255,255,0.025)' }}
      onMouseLeave={e=>{ if(!selected) e.currentTarget.style.background='transparent' }}>

      {/* # */}
      <span style={{ fontSize:12, color:'#555555', fontVariantNumeric:'tabular-nums' }}>{index}</span>

      {/* Description -- matches GGS: domain bold, product orange, order ID + period below */}
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#111111', marginBottom:4,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {cert.domain}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'#1f5c4e' }}>
            {cert.cert_type || 'RapidSSL Standard'}
          </span>
          {cert.ggs_order_id && (
            <span style={{ fontSize:11, color:'#555555', fontFamily:'monospace' }}>
              S{cert.ggs_order_id}
            </span>
          )}
          <span style={{ fontSize:11, color:'#555555' }}>
            {cert._order?.period || 1} year
          </span>
          {cert.install_method && (
            <span style={{ fontSize:10, color: cert.install_method==='agent' ? '#93c5fd' : '#9a6400' }}>
              {cert.install_method==='agent' ? '🖥' : '🌐'}
            </span>
          )}
          {hasPendingReissue && (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4,
              background:'rgba(184,120,0,0.07)', color:'#9a6400', display:'inline-flex',
              alignItems:'center', gap:4, animation:'v3pulse 1.5s ease infinite' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#9a6400',
                animation:'v3pulse 1s ease infinite' }}/>
              Reissue in progress
            </span>
          )}
        </div>
      </div>

      {/* Expires -- cert validity end (the shorter date, ~6 months) */}
      <div style={{ textAlign:'right', paddingRight:24 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#111111' }}>
          {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit' }).split('/').reverse().join('-') : '--'}
        </div>
        <div style={{ fontSize:12, color: isExpired ? '#1f5c4e' : isWarn ? '#9a6400' : '#16a068', marginTop:2, fontWeight:500 }}>
          {isExpired ? `expired ${Math.abs(days)}d ago` : `+ ${days} days`}
        </div>
      </div>

      {/* Status + chevron */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6,
          fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:20,
          background: isExpired ? 'rgba(248,113,113,0.12)' : isWarn ? 'rgba(184,120,0,0.07)' : 'rgba(22,163,74,0.1)',
          color: statusColor }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:statusColor,
            animation: isActive ? 'v3pulse 2s ease infinite' : 'none' }}/>
          {isExpired ? 'Expired' : isWarn ? 'Expiring' : isActive ? 'Active' : (cert.status || 'Pending')}
        </span>
        <ChevronRight size={14} color={selected ? '#1f5c4e' : '#bbbbbb'}
          style={{ transform: selected ? 'rotate(90deg)' : 'none', transition:'transform .2s', flexShrink:0 }}/>
      </div>
    </div>
  )
}

function LoggedInDashboard({ user, nav, onIssue, onOpenAI }) {
  const isMobile = useIsMobile()
  const [certs,   setCerts]  = useState([])
  const [orders,  setOrders] = useState([])
  const [loading, setLoading]= useState(true)
  const [selected,setSelected]= useState(null)
  const [filter,  setFilter] = useState('all')
  const [search,  setSearch] = useState('')
  const [agentCert,  setAgentCert]  = useState(null)
  const [cpanelCert, setCpanelCert] = useState(null)
  const [smartInstallCert, setSmartInstallCert] = useState(null)
  const [session,    setSession]    = useState(null)
  const [healthScores, setHealthScores] = useState({})  // domain → {grade, score}
  const [recentEvents, setRecentEvents] = useState([])   // activity feed
  const [shareMsg,   setShareMsg]   = useState('')        // share button feedback
  const [aiPanelOpen, setAiPanelOpen] = useState(false)  // kept for thin bar click → bubble up via nav

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    const [{ data: certsData }, { data: agentInstalls }, { data: ordersData }] = await Promise.all([
      supabase.from('certificates')
        .select('*, order_type, is_live_on_server, live_confirmed_by, live_confirmed_at, is_current')
        .eq('user_id', user.id).neq('status', 'cancelled')
        .order('issued_at', { ascending:false }),
      supabase.from('agent_jobs')
        .select('cert_id, created_at')
        .eq('user_id', user.id).eq('job_type', 'install').eq('status', 'success')
        .order('created_at', { ascending:false }).limit(100),
      supabase.from('ssl_orders').select('*').eq('user_id', user.id).in('status', ['dv_pending','issued']).order('created_at', { ascending:false }),
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

  // domainGroups: show ALL certs (all GGS orders visible to customer)
  // is_current flag controls which one has Install enabled -- not visibility
  const domainGroups = (() => {
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
    <div style={{ background:'transparent', minHeight:'100vh', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>

        <div style={{ marginBottom:18, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:'#111111', letterSpacing:'-0.3px', margin:0 }}>
                Certificate Dashboard
              </h1>
              {healthy === total && total > 0 && (
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 9px', borderRadius:20,
                  background:'rgba(22,160,104,0.09)', color:'#16a068', border:'0.5px solid rgba(74,222,128,0.3)',
                  animation:'fadeIn 0.5s ease' }}>
                  All healthy ✓
                </span>
              )}
            </div>
            <p style={{ fontSize:11, color:'#555555', margin:0, letterSpacing:'0.01em' }}>{user.email} · {domainGroups.length} certificate{domainGroups.length!==1?'s':''}</p>
          </div>
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
            style={{ display:'flex', alignItems:'center', gap:6,
              background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)',
              borderRadius:8, padding:'7px 14px',
              fontSize:11, fontWeight:500, color:'#555555', cursor:'pointer', fontFamily:'inherit',
              transition:'border-color .15s, color .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(0,0,0,0.1)'; e.currentTarget.style.color='#111111' }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(0,0,0,0.06)'; e.currentTarget.style.color='#666666' }}>
            <Share2 size={11} color="currentColor"/>
            {shareMsg || 'Share SSL status'}
          </button>
        </div>

        {/* ── FRESH STAT ROW ── */}
        {(() => {
          const pendingDcv = orders.filter(o=>o.status==='dv_pending').length
          const postureScore = (() => {
            if (!issuedCerts.length) return 0
            const installPct  = issuedCerts.filter(c=>c.is_live_on_server).length / issuedCerts.length
            const healthPct   = healthy / issuedCerts.length
            const renewPct    = issuedCerts.filter(c=>c.auto_renew_enabled!==false).length / issuedCerts.length
            return Math.round((installPct*30 + healthPct*40 + renewPct*30))
          })()
          const scoreColor = postureScore>=80?'#16a068':postureScore>=50?'#9a6400':'#1f5c4e'
          const scoreLabel = postureScore>=80?'Excellent':postureScore>=50?'At risk':'Critical'
          const bars = [
            { label:'Issuance', pct: total>0?100:0, color:'#16a068' },
            { label:'Install',  pct: total>0?Math.round((issuedCerts.filter(c=>c.is_live_on_server).length/total)*100):0, color: issuedCerts.filter(c=>c.is_live_on_server).length===total?'#16a068':'#1f5c4e' },
            { label:'Auto-renew', pct: total>0?Math.round((issuedCerts.filter(c=>c.auto_renew_enabled!==false).length/total)*100):0, color:'#16a068' },
            { label:'Key vault', pct: total>0?Math.round((issuedCerts.filter(c=>c.keylocker_key_id).length/total)*100):0, color:'#16a068' },
            { label:'DCV ready', pct: total>0?Math.round((issuedCerts.filter(c=>c.dns_provider_id).length/total)*100):0, color:'#16a068' },
          ]
          return (
            <>
            {/* ── MODERN HERO BANNER ── */}
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 14, padding: '20px 24px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position:'absolute', top:-60, left:-60, width:200, height:200, borderRadius:'50%', background:`radial-gradient(circle, ${scoreColor}20 0%, transparent 70%)`, pointerEvents:'none' }}/>
              {/* Score ring */}
              <div style={{ flexShrink:0, position:'relative', width:80, height:80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform:'rotate(-90deg)', position:'absolute', top:0, left:0 }}>
                  <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(31,92,78,0.1)" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="33" fill="none" stroke={scoreColor} strokeWidth="6"
                    strokeDasharray={`${2*Math.PI*33}`}
                    strokeDashoffset={`${2*Math.PI*33*(1-postureScore/100)}`}
                    strokeLinecap="round"
                    style={{ transition:'stroke-dashoffset 1.2s ease' }}/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:scoreColor, lineHeight:1, letterSpacing:'-1px' }}>{postureScore}</div>
                  <div style={{ fontSize:7, color:'#aaaaaa', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:1 }}>score</div>
                </div>
              </div>
              {/* Score details + bars */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#111111', letterSpacing:'-0.2px' }}>{scoreLabel}</span>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:`${scoreColor}18`, color:scoreColor, border:`1px solid ${scoreColor}44` }}>{total} cert{total!==1?'s':''}</span>
                  <span style={{ fontSize:10, color:'rgba(0,0,0,0.25)' }}>·</span>
                  <span style={{ fontSize:10, color:'#888888' }}>{issuedCerts.filter(c=>c.is_live_on_server).length} live on server</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', rowGap:3, columnGap:20 }}>
                  {bars.map(b => (
                    <div key={b.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:9, color:'#888888', width:52, flexShrink:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>{b.label}</span>
                      <div style={{ flex:1, height:2, background:'rgba(0,0,0,0.09)', borderRadius:1, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${b.pct}%`, background:b.pct===100?b.color:'#1f5c4e', borderRadius:1, transition:'width 1s ease' }}/>
                      </div>
                      <span style={{ fontSize:9, color:b.pct===100?b.color:'#1f5c4e', width:22, textAlign:'right', flexShrink:0, fontWeight:600 }}>{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div style={{ width:1, height:52, background:'rgba(0,0,0,0.09)', flexShrink:0 }}/>
              {/* Stat pills */}
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                {[
                  { val:healthy, label:'Healthy', color:'#16a068', bg:'rgba(22,160,104,0.07)', border:'rgba(22,160,104,0.2)', onClick:()=>setFilter('healthy') },
                  { val:expiring+pendingDcv, label:'Attention', color:expiring>0?'#9a6400':pendingDcv>0?'#1f5c4e':'#bbbbbb', bg:'rgba(0,0,0,0.03)', border:'rgba(0,0,0,0.08)', onClick:()=>setFilter(expiring>0?'expiring':'all') },
                ].map(s => (
                  <div key={s.label} onClick={s.onClick} style={{
                    background:s.bg, border:`1px solid ${s.border}`,
                    borderRadius:12, padding:'10px 14px', cursor:'pointer', textAlign:'center', minWidth:60,
                    transition:'transform .15s, border-color .15s',
                  }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=s.color }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=s.border }}>
                    <div style={{ fontSize:24, fontWeight:800, color:s.val>0?s.color:'#cccccc', lineHeight:1, letterSpacing:'-1px' }}>{s.val}</div>
                    <div style={{ fontSize:9, color:'#888888', marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Divider */}
              <div style={{ width:1, height:52, background:'rgba(0,0,0,0.09)', flexShrink:0 }}/>
              {/* AI button */}
              <div onClick={()=>onOpenAI?.()} title="Ask VaultBrain AI" style={{
                flexShrink:0, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                padding:'8px 10px', borderRadius:10,
                border:'1px solid rgba(0,0,0,0.09)', background:'rgba(31,92,78,0.05)',
                transition:'background .15s, border-color .15s, transform .15s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(31,92,78,0.1)'; e.currentTarget.style.borderColor='rgba(31,92,78,0.3)'; e.currentTarget.style.transform='scale(1.05)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(31,92,78,0.05)'; e.currentTarget.style.borderColor='rgba(0,0,0,0.09)'; e.currentTarget.style.transform='scale(1)' }}>
                <span style={{ fontSize:18 }}>🧠</span>
                <span style={{ fontSize:8, color:'#888888', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700 }}>AI</span>
              </div>
            </div>
            </>
          )
        })()}

        {/* ── LEGACY STAT CARDS (hidden — data still drives filters) ── */}
        <div style={{ display:'none', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total certificates', value:total,    color:'#1f5c4e', border:'rgba(0,0,0,0.1)',   sub:'managed by SSLVault',  filterKey:'all' },
            { label:'Healthy',            value:healthy,  color:'#16a068', border:'rgba(63,185,80,0.25)',    sub:healthy>0?'All valid':'No active certs', filterKey:'healthy' },
            { label:'Expiring ≤30d',      value:expiring, color:expiring>0?'#9a6400':'#888888', border:expiring>0?'rgba(210,153,34,0.25)':'rgba(0,0,0,0.07)', sub:expiring>0?'Needs attention':'None expiring', filterKey:'expiring' },
            { label:'Pending DCV',        value:orders.filter(o=>o.status==='dv_pending').length, color:orders.filter(o=>o.status==='dv_pending').length>0?'#1f5c4e':'#888888', border:orders.filter(o=>o.status==='dv_pending').length>0?'rgba(248,81,73,0.25)':'rgba(0,0,0,0.07)', sub:orders.filter(o=>o.status==='dv_pending').length>0?'Awaiting DNS':'None pending', filterKey:'all' },
            { label:'Expired',            value:expired,  color:expired>0?'#1f5c4e':'#888888', border:expired>0?'rgba(248,81,73,0.3)':'rgba(0,0,0,0.07)', sub:expired>0?'Renew immediately':'None expired', filterKey:'expired' },
          ].map((s,i) => (
            <div key={s.label} onClick={() => setFilter(s.filterKey)} style={{
              background:'transparent',
              border:`1px solid ${filter===s.filterKey && s.filterKey!=='all' ? s.color : s.border}`,
              borderRadius:8,
              padding:'18px 20px',
              position:'relative',
              cursor:'pointer',
              transition:'all .15s',
              animation:`fadeSlideUp 0.35s ease both`,
              animationDelay:`${i*50}ms`,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = filter===s.filterKey && s.filterKey!=='all' ? s.color : s.border}>
              <div style={{ fontSize:11, fontWeight:500, color:'#333333', marginBottom:10, letterSpacing:'0.01em' }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:700, color:s.value>0?s.color:'#555555', letterSpacing:'-0.5px', lineHeight:1, marginBottom:6 }}>{s.value}</div>
              <div style={{ fontSize:11, color:'#555555' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {expired > 0 && (
          <div style={{ background:'rgba(248,113,113,0.12)', border:'0.5px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#f87171" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#1f5c4e' }}><strong>{expired} expired certificate{expired!==1?'s':''}</strong> -- renew immediately.</span>
          </div>
        )}
        {expiring > 0 && expired === 0 && (
          <div style={{ background:'rgba(251,191,36,0.12)', border:'0.5px solid rgba(245,158,11,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#9a6400' }}><strong>{expiring} expiring within 30 days</strong></span>
          </div>
        )}

        {orders.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#333333', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
              DNS Validation Pending ({orders.length})
            </div>
            {orders.length <= 2 ? (
              // Full card for 1-2 orders
              orders.map(o => <DvPendingCard key={o.id} order={o} onRefresh={load}/>)
            ) : (
              // Compact list for 3+ orders -- one row per order, no clutter
              <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(0,0,0,0.05)',
                  display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#9a6400', animation:'v3pulse 1s ease infinite' }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'#9a6400' }}>
                    {orders.length} reissues in progress -- DNS validation running automatically
                  </span>
                </div>
                {orders.map(o => {
                  const hasDcv = !!(o.dcv_txt_value || o.dcv_cname_value)
                  return (
                    <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px',
                      borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                        background: hasDcv ? '#16a068' : '#9a6400',
                        animation: !hasDcv ? 'v3pulse 1.2s ease infinite' : 'none' }}/>
                      <span style={{ fontSize:12, fontWeight:600, color:'#111111', flex:1, minWidth:0,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {o.domain}
                      </span>
                      <span style={{ fontSize:11, color:'#555555', fontFamily:'monospace', flexShrink:0 }}>
                        #{o.ggs_order_id}
                      </span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, flexShrink:0,
                        background: hasDcv ? 'rgba(22,160,104,0.09)' : 'rgba(184,120,0,0.07)',
                        color: hasDcv ? '#16a068' : '#9a6400' }}>
                        {hasDcv ? 'DNS ✓ -- GGS validating' : 'Adding DNS record…'}
                      </span>
                    </div>
                  )
                })}
                <div style={{ padding:'8px 14px', fontSize:11, color:'#555555' }}>
                  Certificates will activate automatically -- no action needed.
                </div>
              </div>
            )}
          </div>
        )}




        {/* === FRESH DASHBOARD ========================================= */}
        {!loading && certs.length > 0 && (() => {
          const activeCerts = certs.filter(c => c.status === 'active')
          const now = new Date()
          const yearStart = new Date(now.getFullYear(), 0, 1)
          const yearEnd   = new Date(now.getFullYear(), 11, 31)
          const yearSpan  = yearEnd - yearStart
          const todayPct  = (now - yearStart) / yearSpan
          const tlPct     = iso => iso ? Math.min(Math.max((new Date(iso) - yearStart) / yearSpan, 0), 1) : 0
          const months    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const selCert   = selected ? certs.find(c => c.id === selected) : null
          const mandateReady = (maxDays) => activeCerts.filter(c => {
            const d = daysLeft(c.expires_at); return d != null && d <= maxDays
          }).length
          return (
            <>
              {/* ── CERT CARDS ── */}
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(activeCerts.length+1,4)},1fr)`, gap:10, marginBottom:14 }}>
                {activeCerts.map(cert => {
                  const d = daysLeft(cert.expires_at)
                  const notLive = !cert.is_live_on_server
                  const isWarn  = d !== null && d < 30 && d >= 0
                  const isExp   = d !== null && d < 0
                  const accentColor = notLive ? '#1f5c4e' : isExp ? '#1f5c4e' : isWarn ? '#9a6400' : '#16a068'
                  const isSel = cert.id === selected
                  return (
                    <div key={cert.id} onClick={() => setSelected(isSel ? null : cert.id)}
                      style={{ background:'#ffffff', border:`1px solid ${isSel?accentColor:'rgba(0,0,0,0.08)'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', position:'relative', overflow:'hidden', transition:'all .15s', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=accentColor}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=isSel?accentColor:'rgba(192,57,43,0.22)'}>
                      <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:accentColor, borderRadius:'3px 0 0 3px' }}/>
                      <div style={{ paddingLeft:8 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#111111', fontFamily:'"JetBrains Mono",monospace', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert.domain}</div>
                        <div style={{ fontSize:10, color:'#999999', marginBottom:8 }}>{cert.cert_type||'RapidSSL Standard'} · {cert.install_method==='cpanel'?'cPanel':cert.install_method==='agent'?'Agent':'Direct'}</div>
                        <div style={{ fontSize:28, fontWeight:700, color:accentColor, lineHeight:1, marginBottom:2 }}>{d==null?'--':Math.max(0,d)}</div>
                        <div style={{ fontSize:10, color:'#555555', marginBottom:8 }}>days · {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '--'}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {cert.auto_renew_enabled!==false && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:'rgba(22,160,104,0.09)', color:'#16a068' }}>Auto-renew</span>}
                          <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background: notLive?'rgba(255,140,122,0.12)':isExp?'rgba(248,113,113,0.12)':isWarn?'rgba(184,120,0,0.07)':'rgba(74,222,128,0.07)', color:accentColor }}>
                            {notLive?'Install pending':isExp?'Expired':isWarn?'Expiring':'Live'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Issue new slot */}
                <div onClick={()=>nav&&nav('/issue-cert')}
                  style={{ background:'#f4f1ec', border:'1px dashed rgba(31,92,78,0.25)', borderRadius:12, padding:'14px 16px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, minHeight:130, transition:'all .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,140,122,0.5)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(31,92,78,0.2)'}>
                  <Plus size={22} color="rgba(255,140,122,0.4)"/>
                  <span style={{ fontSize:11, color:'#555555' }}>Issue new certificate</span>
                </div>
              </div>

              {/* ── SELECTED CERT QUICK STATS ── */}
              {selCert && (() => {
                const d = daysLeft(selCert.expires_at)
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1, marginBottom:14, borderRadius:10, overflow:'hidden', border:'1px solid rgba(0,0,0,0.08)', background:'rgba(15,5,5,0.5)' }}>
                    {[
                      { lbl:'Domain',     val:selCert.domain,                                                                          col:'#1f5c4e', mono:true },
                      { lbl:'Expires',    val:selCert.expires_at?new Date(selCert.expires_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'N/A', col:d!=null&&d<=30?'#9a6400':'#16a068' },
                      { lbl:'Server',     val:selCert.is_live_on_server?'Live on server':'Not installed',                              col:selCert.is_live_on_server?'#16a068':'#1f5c4e' },
                      { lbl:'Auto-renew', val:selCert.auto_renew_enabled!==false?'Enabled':'Disabled',                                col:selCert.auto_renew_enabled!==false?'#16a068':'#1f5c4e' },
                      { lbl:'Key vault',  val:selCert.keylocker_key_id?'Secured':'Not stored',                                        col:selCert.keylocker_key_id?'#16a068':'#9a6400' },
                    ].map(({lbl,val,col,mono},i)=>(
                      <div key={lbl} style={{ padding:'11px 14px', borderRight:i<4?'1px solid rgba(31,92,78,0.08)':'none' }}>
                        <div style={{ fontSize:9, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(240,237,232,0.28)', marginBottom:4 }}>{lbl}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:col, fontFamily:mono?'monospace':'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* ── MANDATE + TIMELINE ROW ── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                {/* CA/B Mandate readiness */}
                <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>CA/B Forum mandate readiness</div>
                  {[
                    { year:'Mar 2026', max:200, label:'200d max', ready:activeCerts.filter(c=>{const d=daysLeft(c.expires_at);return d!=null&&d<=200}).length },
                    { year:'Mar 2027', max:100, label:'100d max', ready:activeCerts.filter(c=>{const d=daysLeft(c.expires_at);return d!=null&&d<=100}).length },
                    { year:'Mar 2029', max:47,  label:'47d max',  ready:activeCerts.filter(c=>{const d=daysLeft(c.expires_at);return d!=null&&d<=47}).length  },
                  ].map(m=>{
                    const pct = activeCerts.length>0?(m.ready/activeCerts.length)*100:0
                    const col = m.ready===activeCerts.length?'#16a068':'#1f5c4e'
                    return (
                      <div key={m.year} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                        <span style={{ fontSize:11, fontWeight:500, color:'#555555', width:64, flexShrink:0 }}>{m.year}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:col, width:68, flexShrink:0 }}>{m.label}</span>
                        <div style={{ flex:1, height:3, background:'rgba(0,0,0,0.08)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:2, transition:'width 0.8s ease' }}/>
                        </div>
                        <span style={{ fontSize:10, color:col, width:36, textAlign:'right', flexShrink:0 }}>{m.ready}/{activeCerts.length}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Validity timeline */}
                <div style={{ background:'#ffffff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'#999999', letterSpacing:'0.06em', textTransform:'uppercase' }}>Validity timeline {now.getFullYear()}</div>
                    <span style={{ fontSize:9, color:'#888888' }}>Jun — Dec</span>
                  </div>
                  <div style={{ display:'flex', gap:0, marginBottom:8 }}>
                    {months.map((m,i)=>(
                      <div key={m} style={{ flex:1, fontSize:8, color:i===now.getMonth()?'#1f5c4e':'rgba(0,0,0,0.25)', textAlign:'center', fontWeight:i===now.getMonth()?600:400 }}>{m.slice(0,1)}</div>
                    ))}
                  </div>
                  {activeCerts.map((cert,i)=>{
                    const d = daysLeft(cert.expires_at)
                    const notLive = !cert.is_live_on_server
                    const col = notLive?'#1f5c4e':d!=null&&d<=0?'#1f5c4e':d!=null&&d<=30?'#9a6400':'#16a068'
                    const issuedP = tlPct(cert.issued_at)
                    const expiryP = tlPct(cert.expires_at)
                    const activeW = Math.max(Math.min(todayPct,expiryP)-issuedP,0)
                    const futureW = Math.max(expiryP-todayPct,0)
                    const shortName = cert.domain.replace(/^www\./,'').split('.')[0]
                    return (
                      <div key={cert.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<activeCerts.length-1?8:0 }}>
                        <div style={{ width:70, flexShrink:0, fontSize:11, fontWeight:600, color:'#333333', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName.length>8?shortName.slice(0,7)+'..':shortName}</div>
                        <div style={{ flex:1, height:6, background:'rgba(0,0,0,0.07)', borderRadius:3, position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${issuedP*100}%`, background:'rgba(0,0,0,0.04)' }}/>
                          <div style={{ position:'absolute', left:`${issuedP*100}%`, top:0, bottom:0, width:`${activeW*100}%`, background:`${col}CC` }}/>
                          <div style={{ position:'absolute', left:`${Math.min(todayPct,expiryP)*100}%`, top:0, bottom:0, width:`${futureW*100}%`, background:`${col}33` }}/>
                          <div style={{ position:'absolute', top:0, bottom:0, left:`${todayPct*100}%`, width:2, background:'rgba(31,92,78,0.35)' }}/>
                        </div>
                        <div style={{ width:36, textAlign:'right', fontSize:11, fontWeight:700, fontFamily:'monospace', color:col, flexShrink:0 }}>{d==null?'--':d<=0?'EXP':`${d}d`}</div>
                        <span style={{ fontSize:9, fontWeight:600, padding:'2px 6px', borderRadius:99, width:50, textAlign:'center', flexShrink:0, background:notLive?'rgba(192,57,43,0.08)':'rgba(22,160,104,0.09)', color:notLive?'#c0392b':'#16a068', border:`1px solid ${notLive?'rgba(192,57,43,0.2)':'rgba(22,160,104,0.2)'}` }}>
                          {notLive?'INSTALL':'LIVE'}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ marginTop:10, display:'flex', gap:12 }}>
                    {[['rgba(22,160,104,0.7)','valid'],['rgba(192,57,43,0.55)','today']].map(([bg,lbl])=>(
                      <span key={lbl} style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#888888' }}>
                        <span style={{ width:lbl==='today'?1.5:14, height:lbl==='today'?10:4, background:bg, display:'inline-block', borderRadius:lbl==='today'?1:2 }}/>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ACTIVITY ROW ── */}
              {recentEvents.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(recentEvents.length,4)},1fr)`, gap:8, marginBottom:14 }}>
                  {recentEvents.slice(0,4).map(ev=>{
                    const secs = Math.floor((Date.now()-new Date(ev.created_at))/1000)
                    const ago  = secs<60?`${secs}s`:secs<3600?`${Math.floor(secs/60)}m`:secs<86400?`${Math.floor(secs/3600)}h`:`${Math.floor(secs/86400)}d`
                    const col  = ev.event_type==='issued'?'#16a068':ev.event_type==='revoked'?'#1f5c4e':'#1f5c4e'
                    return (
                      <div key={ev.id} style={{ background:'#f4f1ec', border:'1px solid rgba(0,0,0,0.06)', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:col, flexShrink:0 }}/>
                          <span style={{ fontSize:11, fontWeight:600, color:'#1f5c4e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.event_type.replace(/_/g,' ')}</span>
                        </div>
                        <div style={{ fontSize:10, color:'#999999', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.domain}</div>
                        <div style={{ fontSize:9, color:'rgba(0,0,0,0.25)', marginTop:4 }}>{ago} ago</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}
        {/* === END FRESH DASHBOARD ===================================== */}

        {/* === OLD WORLD CLASS DASHBOARD (removed) ========================================= */}
        {false && !loading && certs.length > 0 && (() => {
          const activeCerts = certs.filter(c => c.status === 'active')
          const allHealthy  = activeCerts.every(c => {
            const d = daysLeft(c.expires_at)
            return d !== null && d > 30 && c.is_live_on_server
          })

          // Arc maths
          const fleetPct = activeCerts.length > 0
            ? activeCerts.reduce((s, c) => {
                const d = daysLeft(c.expires_at)
                return s + Math.min(Math.max((d || 0) / 200, 0), 1)
              }, 0) / activeCerts.length
            : 0
          const installPct = activeCerts.length > 0
            ? activeCerts.filter(c => c.is_live_on_server).length / activeCerts.length
            : 0
          const outerCirc = 2 * Math.PI * 52
          const innerCirc = 2 * Math.PI * 40
          const outerOff  = outerCirc * (1 - Math.min(fleetPct, 1))
          const innerOff  = innerCirc * (1 - Math.min(installPct, 1))
          const arcColor  = fleetPct > 0.5 ? '#16a068' : fleetPct > 0.2 ? '#9a6400' : '#1f5c4e'

          // Timeline maths
          const now       = new Date()
          const yearStart = new Date(now.getFullYear(), 0, 1)
          const yearEnd   = new Date(now.getFullYear(), 11, 31)
          const yearSpan  = yearEnd - yearStart
          const todayPct  = (now - yearStart) / yearSpan
          const tlPct     = iso => iso ? Math.min(Math.max((new Date(iso) - yearStart) / yearSpan, 0), 1) : 0
          const months    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

          const selCert = selected ? certs.find(c => c.id === selected) : null

          return (
            <>
              {/*    ROW 1: ARC  +  DOMAIN ROWS                              */}
              <div style={{
                display:'grid', gridTemplateColumns:'180px 1fr',
                border:'1px solid rgba(0,0,0,0.05)',
                borderRadius:12, overflow:'hidden', marginBottom:14,
                background:'rgba(0,0,0,0.12)'
              }}>

                {/* Arc panel */}
                <div style={{
                  display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  padding:'20px 12px',
                  borderRight:'1px solid rgba(0,0,0,0.05)'
                }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke="rgba(0,0,0,0.05)" strokeWidth="7"/>
                    <circle cx="60" cy="60" r="52" fill="none"
                      stroke={arcColor} strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={outerCirc} strokeDashoffset={outerOff}
                      transform="rotate(-90 60 60)"
                      style={{ filter:`drop-shadow(0 0 4px ${arcColor}66)` }}/>
                    <circle cx="60" cy="60" r="40" fill="none"
                      stroke="rgba(0,0,0,0.04)" strokeWidth="5"/>
                    <circle cx="60" cy="60" r="40" fill="none"
                      stroke="#1f5c4e" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={innerCirc} strokeDashoffset={innerOff}
                      transform="rotate(-90 60 60)" style={{ opacity:0.7 }}/>
                    <text x="60" y="55" textAnchor="middle"
                      fill="#fff" fontSize="24" fontWeight="900"
                      fontFamily="monospace" letterSpacing="-1">
                      {activeCerts.length}
                    </text>
                    <text x="60" y="67" textAnchor="middle"
                      fill="rgba(255,255,255,0.35)" fontSize="8" fontWeight="700"
                      letterSpacing="1.2">CERTS</text>
                    <text x="60" y="79" textAnchor="middle"
                      fill={allHealthy ? '#16a068' : '#9a6400'} fontSize="8"
                      fontWeight="700" letterSpacing="0.3">
                      {allHealthy ? 'ALL HEALTHY' : 'ACTION NEEDED'}
                    </text>
                  </svg>
                  <div style={{ display:'flex', gap:10, marginTop:8 }}>
                    {[['#16a068','Validity'],['#1f5c4e','Install']].map(([col,lbl]) => (
                      <div key={lbl} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ width:6, height:6, borderRadius:2, background:col }}/>
                        <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>{lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domain rows */}
                <div>
                  <div style={{ padding:'10px 16px',
                    borderBottom:'1px solid rgba(0,0,0,0.04)',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.8px',
                      textTransform:'uppercase', color:'rgba(255,255,255,0.28)' }}>
                      Fleet status
                    </span>
                    {allHealthy && (
                      <div style={{ display:'flex', alignItems:'center', gap:5,
                        background:'rgba(74,222,128,0.07)',
                        border:'1px solid rgba(74,222,128,0.18)',
                        borderRadius:99, padding:'2px 9px' }}>
                        <div style={{ width:5, height:5, borderRadius:'50%',
                          background:'#16a068',
                          animation:'v2-pulse-anim 2s ease infinite' }}/>
                        <span style={{ fontSize:9, fontWeight:700, color:'#16a068' }}>
                          Auto-pilot active
                        </span>
                      </div>
                    )}
                  </div>
                  {activeCerts.map((cert, i) => {
                    const d        = daysLeft(cert.expires_at)
                    const notLive  = !cert.is_live_on_server
                    const col      = notLive              ? '#818cf8'
                                   : d !== null && d <= 0 ? '#1f5c4e'
                                   : d !== null && d <= 30? '#9a6400'
                                   :                        '#16a068'
                    const vpct     = Math.min(Math.max((d || 0) / 200, 0), 1)
                    const mc       = 2 * Math.PI * 11
                    const mo       = mc * (1 - vpct)
                    const isSel    = cert.id === selected
                    return (
                      <div key={cert.id}
                        onClick={() => setSelected(isSel ? null : cert.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:10,
                          padding:'10px 16px',
                          borderLeft: isSel ? '2px solid #2a6b5c' : '2px solid transparent',
                          borderBottom: i < activeCerts.length - 1
                            ? '1px solid rgba(0,0,0,0.04)' : 'none',
                          background: isSel ? 'rgba(31,92,78,0.08)' : 'transparent',
                          cursor:'pointer', transition:'background .1s'
                        }}
                        onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='rgba(0,0,0,0.02)' }}
                        onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}>
                        {/* Mini arc */}
                        <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink:0 }}>
                          <circle cx="14" cy="14" r="11" fill="none"
                            stroke="rgba(0,0,0,0.05)" strokeWidth="3"/>
                          <circle cx="14" cy="14" r="11" fill="none"
                            stroke={col} strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={mc} strokeDashoffset={mo}
                            transform="rotate(-90 14 14)"/>
                        </svg>
                        {/* Text */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#fff',
                            fontFamily:'monospace', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {cert.domain}
                          </div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.32)', marginTop:1 }}>
                            {cert.cert_type || 'RapidSSL DV'}
                            {cert.install_method === 'cpanel' ? ' \u00b7 cPanel'
                             : cert.install_method === 'agent' ? ' \u00b7 Agent' : ''}
                            {cert.is_live_on_server ? ' \u00b7 Live' : ''}
                          </div>
                        </div>
                        {/* Days */}
                        <span style={{ fontSize:13, fontWeight:800,
                          fontFamily:'monospace', color:col, flexShrink:0 }}>
                          {d === null ? '--' : d <= 0 ? 'EXP' : `${d}d`}
                        </span>
                        {/* Badge */}
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px',
                          borderRadius:99, flexShrink:0,
                          background: notLive ? 'rgba(129,140,248,0.1)' : d !== null && d <= 30 ? 'rgba(184,120,0,0.07)' : 'rgba(74,222,128,0.07)',
                          color: notLive ? '#818cf8' : d !== null && d <= 30 ? '#9a6400' : '#16a068',
                          border: `1px solid ${notLive ? 'rgba(129,140,248,0.25)' : d !== null && d <= 30 ? 'rgba(251,191,36,0.2)' : 'rgba(74,222,128,0.18)'}` }}>
                          {notLive ? 'INSTALL' : d !== null && d <= 0 ? 'EXPIRED' : d !== null && d <= 30 ? 'EXPIRING' : 'LIVE'}
                        </span>
                      </div>
                    )
                  })}
                  {/* Issue new */}
                  <div onClick={() => nav && nav('/issue-cert')}
                    style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'8px 16px', cursor:'pointer',
                      borderTop:'1px solid rgba(0,0,0,0.04)',
                      opacity:0.35, transition:'opacity .12s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.65'}
                    onMouseLeave={e => e.currentTarget.style.opacity='0.35'}>
                    <div style={{ width:28, height:28, flexShrink:0,
                      border:'1px dashed rgba(0,0,0,0.1)',
                      borderRadius:'50%', display:'flex',
                      alignItems:'center', justifyContent:'center',
                      fontSize:16, color:'rgba(255,255,255,0.35)', fontWeight:300 }}>
                      +
                    </div>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
                      Issue new certificate
                    </span>
                  </div>
                </div>
              </div>

              {/*    ROW 2: SELECTED DETAIL (only when cert clicked)          */}
              {selCert && (() => {
                const d = daysLeft(selCert.expires_at)
                return (
                  <div style={{
                    display:'grid', gridTemplateColumns:'repeat(5,1fr)',
                    gap:1, marginBottom:14, borderRadius:10, overflow:'hidden',
                    border:'1px solid rgba(31,92,78,0.12)',
                    background:'rgba(192,57,43,0.05)'
                  }}>
                    {[
                      { lbl:'Domain',     val: selCert.domain,
                        col:'#ffffff', mono:true },
                      { lbl:'Expires',    val: selCert.expires_at
                          ? new Date(selCert.expires_at).toLocaleDateString('en-GB',
                              {day:'2-digit',month:'short',year:'numeric'})
                          : 'N/A',
                        col: d !== null && d <= 30 ? '#9a6400' : '#16a068' },
                      { lbl:'Server',     val: selCert.is_live_on_server ? 'Live on server' : 'Not installed',
                        col: selCert.is_live_on_server ? '#16a068' : '#1f5c4e' },
                      { lbl:'Auto-renew', val: selCert.auto_renew_enabled !== false ? 'Enabled' : 'Disabled',
                        col: selCert.auto_renew_enabled !== false ? '#16a068' : '#1f5c4e' },
                      { lbl:'Key vault',  val: selCert.keylocker_key_id ? 'Secured' : 'Not stored',
                        col: selCert.keylocker_key_id ? '#16a068' : '#9a6400' },
                    ].map(({ lbl, val, col, mono }, i) => (
                      <div key={lbl} style={{ padding:'11px 14px',
                        borderRight: i < 4 ? '1px solid rgba(31,92,78,0.08)' : 'none' }}>
                        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.6px',
                          textTransform:'uppercase', color:'rgba(255,255,255,0.28)',
                          marginBottom:4 }}>{lbl}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:col,
                          fontFamily: mono ? 'monospace' : 'inherit',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/*    ROW 3: TIMELINE (clean, minimal)                        */}
              <div style={{
                border:'1px solid rgba(0,0,0,0.05)',
                borderRadius:10, overflow:'hidden',
                marginBottom: recentEvents.length > 0 ? 14 : 16,
                background:'rgba(0,0,0,0.1)'
              }}>
                {/* Header */}
                <div style={{ padding:'9px 16px',
                  borderBottom:'1px solid rgba(0,0,0,0.04)',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.8px',
                    textTransform:'uppercase', color:'rgba(255,255,255,0.28)' }}>
                    Lifecycle {now.getFullYear()}
                  </span>
                  <div style={{ display:'flex', gap:12 }}>
                    {[['rgba(74,222,128,0.75)','Valid'],['rgba(74,222,128,0.2)','Remaining'],['rgba(0,0,0,0.05)','Past']].map(([bg,lbl]) => (
                      <span key={lbl} style={{ display:'flex', alignItems:'center', gap:4,
                        fontSize:9, color:'rgba(255,255,255,0.25)' }}>
                        <span style={{ width:14, height:4, borderRadius:2,
                          background:bg, display:'inline-block' }}/>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Month axis */}
                <div style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'4px 16px 0' }}>
                  <div style={{ width:96, flexShrink:0 }}/>
                  <div style={{ flex:1, display:'flex', justifyContent:'space-between',
                    paddingRight:104 }}>
                    {months.map((m, i) => (
                      <span key={m} style={{ fontSize:8,
                        color: i === now.getMonth()
                          ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.09)',
                        fontWeight: i === now.getMonth() ? 700 : 400 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline rows */}
                <div style={{ padding:'8px 16px 12px' }}>
                  {activeCerts.map((cert, i) => {
                    const d        = daysLeft(cert.expires_at)
                    const notLive  = !cert.is_live_on_server
                    const col      = notLive              ? '#818cf8'
                                   : d !== null && d <= 0 ? '#1f5c4e'
                                   : d !== null && d <= 30? '#9a6400'
                                   :                        '#16a068'
                    const issuedP  = tlPct(cert.issued_at)
                    const expiryP  = tlPct(cert.expires_at)
                    const pastW    = issuedP
                    const activeW  = Math.max(Math.min(todayPct, expiryP) - issuedP, 0)
                    const futureW  = Math.max(expiryP - todayPct, 0)
                    const shortName = cert.domain.replace(/^www\./,'').split('.').slice(0,-1).join('.') || cert.domain
                    return (
                      <div key={cert.id}
                        style={{ display:'flex', alignItems:'center', gap:10,
                          marginBottom: i < activeCerts.length-1 ? 8 : 0 }}>
                        <div style={{ width:96, flexShrink:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#fff',
                            fontFamily:'monospace', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {shortName.length > 10 ? shortName.slice(0,9)+'..' : shortName}
                          </div>
                        </div>
                        {/* Track */}
                        <div style={{ flex:1, height:7, background:'rgba(0,0,0,0.03)',
                          borderRadius:99, position:'relative', overflow:'hidden' }}>
                          {pastW > 0 && (
                            <div style={{ position:'absolute', left:0, top:0, bottom:0,
                              width:`${pastW*100}%`, background:'rgba(0,0,0,0.05)' }}/>
                          )}
                          <div style={{ position:'absolute',
                            left:`${issuedP*100}%`, top:0, bottom:0,
                            width:`${activeW*100}%`,
                            background:`${col}CC` }}/>
                          <div style={{ position:'absolute',
                            left:`${Math.min(todayPct,expiryP)*100}%`, top:0, bottom:0,
                            width:`${futureW*100}%`,
                            background:`${col}33` }}/>
                          {/* Today line */}
                          <div style={{ position:'absolute', top:0, bottom:0,
                            left:`${todayPct*100}%`, width:1.5,
                            background:'rgba(255,255,255,0.35)' }}/>
                        </div>
                        {/* Days */}
                        <div style={{ width:40, textAlign:'right', flexShrink:0,
                          fontSize:11, fontWeight:800, fontFamily:'monospace', color:col }}>
                          {d === null ? '--' : d <= 0 ? 'EXP' : `${d}d`}
                        </div>
                        {/* Badge */}
                        <div style={{ width:52, flexShrink:0, textAlign:'right' }}>
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px',
                            borderRadius:99,
                            background: notLive ? 'rgba(129,140,248,0.1)' : 'rgba(74,222,128,0.07)',
                            color: notLive ? '#818cf8' : '#16a068',
                            border: `1px solid ${notLive ? 'rgba(129,140,248,0.2)' : 'rgba(74,222,128,0.18)'}` }}>
                            {notLive ? 'INSTALL' : 'LIVE'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/*    ROW 4: ACTIVITY (only if events exist)                  */}
              {recentEvents.length > 0 && (
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.8px',
                    textTransform:'uppercase', color:'rgba(255,255,255,0.22)',
                    writingMode:'vertical-rl', transform:'rotate(180deg)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0 }}>
                    Recent
                  </div>
                  <div style={{ flex:1, display:'grid',
                    gridTemplateColumns:`repeat(${Math.min(recentEvents.length,4)},1fr)`,
                    gap:7 }}>
                    {recentEvents.slice(0,4).map(ev => {
                      const secs = Math.floor((Date.now() - new Date(ev.created_at)) / 1000)
                      const ago  = secs < 60 ? `${secs}s`
                                 : secs < 3600 ? `${Math.floor(secs/60)}m`
                                 : secs < 86400 ? `${Math.floor(secs/3600)}h`
                                 : `${Math.floor(secs/86400)}d`
                      const col  = ev.event_type === 'issued'  ? '#16a068'
                                 : ev.event_type === 'revoked' ? '#1f5c4e' : '#1f5c4e'
                      return (
                        <div key={ev.id} style={{
                          background:'rgba(0,0,0,0.02)',
                          border:'1px solid rgba(0,0,0,0.05)',
                          borderRadius:8, padding:'9px 11px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5,
                            marginBottom:4 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%',
                              background:col, flexShrink:0 }}/>
                            <span style={{ fontSize:11, fontWeight:600, color:'#1f5c4e',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {ev.event_type.replace(/_/g,' ')}
                            </span>
                          </div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)',
                            fontFamily:'monospace', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {ev.domain}
                          </div>
                          <div style={{ fontSize:9, color:'rgba(0,0,0,0.09)',
                            marginTop:4 }}>{ago} ago</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </>
          )
        })()}
        {/* === END OLD WORLD CLASS DASHBOARD ===================================== */}

        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, alignItems:'start' }}>
          <div style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.08)', borderRadius:8,
            overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(0,0,0,0.07)',
              display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
              background:'transparent' }}>
              {/* Filter tabs */}
              <div style={{ display:'flex', gap:2, background:'transparent', borderRadius:0, padding:0, borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
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
                      color: filter===f.key ? 'rgba(31,92,78,0.09)' : '#666666',
                      paddingBottom: '10px', marginBottom: '-1px',
                      boxShadow: filter===f.key ? '0 1px 3px rgba(0,0,0,0.07)' : 'none' }}>
                    {f.label}
                    <span style={{ marginLeft:5, fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10,
                      background: 'rgba(0,0,0,0.05)',
                      color: '#555555',
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
                    style={{ background:'transparent', border:'1px solid rgba(63,185,80,0.2)', borderRadius:8, color:'#1f5c4e',
                      fontSize:12, padding:'6px 10px 6px 30px', width:190, outline:'none', fontFamily:'inherit',
                      transition:'border-color .15s' }}
                    onFocus={e=>e.target.style.borderColor='#1f5c4e'}
                    onBlur={e=>e.target.style.borderColor='rgba(0,0,0,0.07)'}/>
                  <Globe size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#555555', pointerEvents:'none' }}/>
                </div>
                <ScanPqcButton onDone={load}/>
                <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', color:'#1f5c4e',
                    border:'none', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 6px rgba(14,127,192,0.3)',
                    transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#111111';e.currentTarget.style.boxShadow='0 4px 12px rgba(14,127,192,0.4)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#111111';e.currentTarget.style.boxShadow='0 2px 6px rgba(14,127,192,0.3)'}}>
                  <Plus size={11}/> New SSL
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:'clamp(16px,16vw,48px) 16px', textAlign:'center' }}>
                <RefreshCw size={20} style={{ color:'#555555', animation:'spin 1s linear infinite' }}/>
                <div style={{ fontSize:12, color:'#555555', marginTop:10 }}>Loading...</div>
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding:'clamp(16px,16vw,48px) 16px', textAlign:'center' }}>
                <Shield size={24} style={{ color:'#1f5c4e', marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:600, color:'#555555', marginBottom:6 }}>{total===0?'No certificates yet':'No results'}</div>
                <div style={{ fontSize:12, color:'#555555', marginBottom:16 }}>{total===0?'Issue your first SSL certificate to get started.':'Try a different filter.'}</div>
                {total===0 && (
                  <button onClick={() => onIssue ? onIssue() : nav('/buy')}
                    style={{ background:'transparent', color:'#1f5c4e', border:'none', borderRadius:7,
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
                  background:'rgba(0,0,0,0.02)', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                  <span/>
                  <span style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px' }}>Description</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px', textAlign:'right', paddingRight:24 }}>Expires</span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px', textAlign:'right', paddingRight:10 }}>Status</span>
                </div>
                {domainGroups.map((cert, idx) => {
                  // Check if this cert has an active pending/issued reissue order
                  const hasPendingReissue = orders.some(o =>
                    o.ggs_order_id === cert.ggs_order_id &&
                    (o.status === 'dv_pending' || o.status === 'issued')
                  )
                  return (
                <div key={cert.id}>
                  <CertRow
                    cert={cert}
                    index={idx + 1}
                    selected={selected === cert.id}
                    onClick={() => setSelected(selected === cert.id ? null : cert.id)}
                    hasPendingReissue={hasPendingReissue}
                  />
                  {selected === cert.id && (
                    <div style={{ padding:'0 8px 8px' }}>
                      <CertDetail cert={cert} onClose={() => setSelected(null)}
                        onDelete={handleDelete}
                        onInstall={c => { setSmartInstallCert(c) }}
                        onCpanel={c => { setCpanelCert(c) }}
                        nav={nav} onRefresh={load} session={session}/>
                    </div>
                  )}
                </div>
              )
                })}
              </>
            )}
          </div>
        </div>

        {/* Imported certs from CA Connector -- shown separately */}
        {importedCerts.length > 0 && (
          <ImportedCertsSection certs={importedCerts} onDelete={handleDelete} />
        )}

        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Quick actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
            {[
              { icon:Shield,    color:'#111111', bg:'transparent', label:'Issue Certificate', desc:'RapidSSL DV · RapidSSL · ~5 min',    action:() => onIssue ? onIssue() : nav('/buy') },
              { icon:Download,  color:'#16a068', bg:'transparent', label:'Install Guide',     desc:'Nginx, Apache, cPanel step-by-step', action:() => nav('/install') },
              { icon:Activity,  color:'#111111', bg:'rgba(248,113,113,0.12)', label:'Integrations',     desc:'Cloudflare, Vercel, agent setup',    action:() => nav('/integrations') },
              { icon:Zap,       color:'#111111', bg:'rgba(248,113,113,0.12)', label:'Knowledge Base',    desc:'Guides, FAQs, troubleshooting',      action:() => nav('/knowledge-base') },
            ].map(({ icon:Icon, color, bg, label, desc, action }, i) => (
              <button key={label} onClick={action}
                style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.07)', borderRadius:12, padding:'16px',
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  animation:`fadeSlideUp 0.4s ease both`, animationDelay:`${i*60}ms` }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${color}20`;e.currentTarget.style.borderColor=color+'44'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';e.currentTarget.style.borderColor='rgba(0,0,0,0.07)'}}>
                <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#ff6b5b,#ff9e8c)',
                  display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={16} color={color} strokeWidth={1.8}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#111111', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:11, color:'#555555', lineHeight:1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* -- Recent activity feed -- */}
        {recentEvents.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#555555', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Recent activity</div>
            <div style={{ background:'transparent', border:'1px solid rgba(0,0,0,0.07)', borderRadius:12,
              overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              {recentEvents.map((ev, i) => {
                const evColors = {
                  issued:          { color:'#16a068', bg:'transparent', dot:'#16a068' },
                  renewed:         { color:'#1f5c4e', bg:'transparent', dot:'#111111' },
                  revoked:         { color:'#1f5c4e', bg:'rgba(31,92,78,0.09)', dot:'#1f5c4e' },
                  agent_installed: { color:'#1f5c4e', bg:'rgba(248,113,113,0.12)', dot:'#111111' },
                  private_key_copied: { color:'#1f5c4e', bg:'rgba(248,113,113,0.12)', dot:'#111111' },
                }
                const cfg = evColors[ev.event_type] || { color:'#333333', bg:'#000000', dot:'rgba(240,237,232,0.38)' }
                const secs = Math.floor((Date.now() - new Date(ev.created_at)) / 1000)
                const ago = secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.floor(secs/60)}m ago`
                          : secs < 86400 ? `${Math.floor(secs/3600)}h ago` : `${Math.floor(secs/86400)}d ago`
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12,
                    padding:'10px 16px', borderBottom: i < recentEvents.length-1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, color:'#1f5c4e', fontWeight:500 }}>
                        {ev.event_type.replace(/_/g,' ')}
                      </span>
                      <span style={{ fontSize:12, color:'#555555' }}> -- {ev.domain}</span>
                    </div>
                    <span style={{ fontSize:11, color:'#555555', flexShrink:0 }}>{ago}</span>
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

      {/* Smart Install modal -- detects cPanel/agent and routes automatically */}
      {smartInstallCert && (
        <SmartInstall
          cert={smartInstallCert}
          userId={user.id}
          session={session}
          onClose={() => setSmartInstallCert(null)}
          onSuccess={() => { setSmartInstallCert(null); load() }}
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
          <h1 style={{ fontSize:Math.min(38,window.innerWidth>768?38:30), fontWeight:700, color:'#111111', letterSpacing:'-0.8px',
            lineHeight:1.15, margin:'0 0 14px', maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            Your SSL certificates,<br/>
            <span style={{ color:'var(--v2-green)' }}>always under control</span>
          </h1>
          <p style={{ fontSize:16, color:'#333333', maxWidth:480, margin:'0 auto 32px', lineHeight:1.65 }}>
            Issue free SSL certificates, monitor expiry, automate renewal -- all from one clean dashboard.
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

export default function Dashboard({ nav, onIssue, onOpenAI }) {
  const isMobile = useIsMobile()
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={20} style={{ color:'#555555', animation:'spin 1s linear infinite' }}/>
      <style>{`
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes fadeSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
`}</style>
    </div>
  )
  if (!user) return <MarketingDashboard nav={nav}/>
  return <LoggedInDashboard user={user} nav={nav} onIssue={onIssue} onOpenAI={onOpenAI}/>
}
