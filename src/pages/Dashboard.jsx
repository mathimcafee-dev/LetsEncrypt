// BUILD_TIMESTAMP: 1778952426531
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Shield, Plus, RefreshCw, Download, X, Lock, AlertTriangle, CheckCircle,
  Globe, ChevronRight, Copy, Check, Activity, Zap, ArrowRight, Server,
  FileText, Eye, EyeOff, Trash2, ShieldOff, ShieldCheck, Clock, RotateCcw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, format } from 'date-fns'
import '../styles/design-v2.css'
import AgentInstall from '../components/AgentInstall'
import CpanelInstall from '../components/CpanelInstall'

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
  const color = days == null ? '#e2e8f0' : days < 0 ? '#ef4444' : days < 14 ? '#ef4444' : days < 30 ? '#f59e0b' : '#0e7fc0'
  return (
    <div style={{ height:4, borderRadius:999, background:'#f1f5f9', overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:999, background:color,
        width: animated ? pct+'%' : '0%',
        transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)' }}/>
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

  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Clock size={13} color="#f59e0b" style={{ flexShrink:0 }}/>
        <span style={{ fontSize:12, fontWeight:700, color:'#92400e' }}>DNS Validation Pending</span>
        <span style={{ fontFamily:'monospace', fontSize:11, color:'#92400e', marginLeft:'auto' }}>GGS #{order.ggs_order_id}</span>
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
          style={{ display:'flex', alignItems:'center', gap:6, background:'#0e7fc0', color:'white',
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
        {msg && <span style={{ fontSize:11, color: msg.startsWith('✅') ? '#15803d' : msg.startsWith('❌') ? '#dc2626' : '#92400e' }}>{msg}</span>}
      </div>
    </div>
  )
}

// ── Ring gauge that animates on mount ────────────────────────────────────────
function RingGauge({ days, total = 365 }) {
  const [animated, setAnimated] = useState(false)
  const [count, setCount] = useState(0)
  const d = Math.max(0, days ?? 0)
  const pct = Math.min(1, d / total)
  const r = 30, circ = 2 * Math.PI * r
  const offset = circ - pct * circ
  const isExpired = (days ?? 0) < 0
  const isWarn    = (days ?? 0) >= 0 && (days ?? 0) < 30
  const color     = isExpired ? '#ef4444' : isWarn ? '#f59e0b' : '#16a34a'

  useEffect(() => {
    const t1 = setTimeout(() => setAnimated(true), 80)
    if (!isExpired) {
      let n = 0
      const target = d
      const step = Math.max(1, Math.ceil(target / 40))
      const iv = setInterval(() => {
        n = Math.min(n + step, target)
        setCount(n)
        if (n >= target) clearInterval(iv)
      }, 18)
      return () => { clearTimeout(t1); clearInterval(iv) }
    }
    return () => clearTimeout(t1)
  }, [d])

  return (
    <div style={{ position:'relative', width:76, height:76, flexShrink:0 }}>
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--v2-border)" strokeWidth="7"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animated ? offset : circ}
          style={{ transition:'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:16, fontWeight:500, color:'var(--v2-text)', fontFamily:'monospace', lineHeight:1 }}>
          {isExpired ? '!' : count}
        </div>
        <div style={{ fontSize:9, color:'var(--v2-text-3)', marginTop:2, letterSpacing:'0.2px' }}>days left</div>
      </div>
    </div>
  )
}

// ── Slim progress bar for timeline ────────────────────────────────────────────
function ValidityTimeline({ issuedAt, expiresAt }) {
  const [animated, setAnimated] = useState(false)
  const now   = new Date()
  const start = new Date(issuedAt)
  const end   = new Date(expiresAt)
  const remaining = end - now
  const elapsed   = now - start
  const total     = end - start
  const dLeft     = Math.max(0, Math.ceil(remaining / 86400000))
  const pct       = Math.max(0, Math.min(100, (elapsed / total) * 100))
  const isExpired = remaining <= 0
  const isWarn    = dLeft > 0 && dLeft < 30
  const color     = isExpired ? '#ef4444' : isWarn ? '#f59e0b' : '#16a34a'
  const fmt = d => { try { return format(new Date(d), 'MMM d, yyyy') } catch { return '—' } }

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])

  return (
    <div style={{ padding:'14px 18px', borderBottom:'0.5px solid var(--v2-border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>Validity timeline</span>
        <span style={{ fontSize:11, fontWeight:500, color }}>
          {isExpired ? 'Expired' : `Next reissue in ${dLeft} days`}
        </span>
      </div>
      <div style={{ position:'relative', height:8, borderRadius:999, background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, borderRadius:999,
          background:color, width: animated ? pct+'%' : '0%',
          transition:'width 1.3s cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>
      <div style={{ position:'relative', height:0 }}>
        <div style={{ position:'absolute', top:-4, width:3, height:14, borderRadius:2,
          background:'var(--v2-text)', left: animated ? pct+'%' : '0%',
          transform:'translateX(-50%)',
          transition:'left 1.3s cubic-bezier(0.16,1,0.3,1)',
          boxShadow:'0 1px 4px rgba(0,0,0,0.15)', zIndex:3 }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', fontFamily:'monospace' }}>{fmt(issuedAt)}</div>
          <div style={{ fontSize:9, color:'var(--v2-text-3)', opacity:0.6, marginTop:1 }}>SSL valid from</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text)', fontFamily:'monospace' }}>{fmt(expiresAt)}</div>
          <div style={{ fontSize:9, color:'var(--v2-text-3)', opacity:0.6, marginTop:1 }}>SSL valid till</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)', fontFamily:'monospace' }}>{fmt(new Date(end.getTime() + 365*86400000))}</div>
          <div style={{ fontSize:9, color:'var(--v2-text-3)', opacity:0.6, marginTop:1 }}>Renewal by</div>
        </div>
      </div>
    </div>
  )
}

const CertHistory = forwardRef(function CertHistory({ cert, session }, ref) {
  const [history, setHistory] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('reissues')
  useEffect(() => { loadHistory() }, [cert.id])
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
  const callAction = async (action, extra, confirmMsg) => {
    if (!confirm(confirmMsg)) return
    setBusy(true); setMsg('')
    try {
      const r = await fetch(SB_URL+'/functions/v1/gogetssl-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+session.access_token },
        body: JSON.stringify({ action, cert_id: cert.id, triggered_by: 'manual', ...extra })
      })
      const d = await r.json()
      if (d.ok && d.status === 'active') { setMsg(action==='reissue'?' Reissued & installed!':('Renewed! New cert: '+d.new_cert_id)); loadHistory() }
      else if (d.ok) { setMsg('Order placed — DNS validation in progress...'); loadHistory() }
      else setMsg('Error: '+(d.error||'Unknown'))
    } catch(e) { setMsg('Error: '+e.message) }
    setBusy(false)
  }
  const reissues = history?.reissues || []
  const renewals = history?.renewals || []
  useImperativeHandle(ref, () => ({
    doAction: (action) => {
      const msgs = {
        reissue: 'Reissue this certificate? A fresh cert will be issued and auto-installed.',
        renew:   'Renew for another year? A new certificate record will be created.',
      }
      callAction(action, action==='renew'?{period:12}:{}, msgs[action]||'Confirm?')
    }
  }), [busy])
  const statusStyle = (s) => ({
    fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:4,
    background: (s==='issued'||s==='installed'||s==='active') ? '#dcfce7' : s==='failed' ? '#fee2e2' : '#f1f5f9',
    color: (s==='issued'||s==='installed'||s==='active') ? '#16a34a' : s==='failed' ? '#dc2626' : '#64748b'
  })
  return (
    <div style={{ marginTop:4 }}>

      {msg && <div style={{ fontSize:12, padding:'8px 10px', borderRadius:6, marginBottom:12, background:msg.includes('Error')?' #fef2f2':'#f0fdf4', color:msg.includes('Error')?' #dc2626':'#16a34a', border:'1px solid '+(msg.includes('Error')?' #fecaca':'#bbf7d0') }}>{msg}</div>}
      <div style={{ display:'flex', borderBottom:'1px solid var(--v2-border)', marginBottom:12 }}>
        {[['reissues','Reissue History'],['renewals','Renewals']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{ fontSize:11, fontWeight:500, padding:'5px 12px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', color:tab===k?'var(--v2-green)':'var(--v2-text-3)', borderBottom:tab===k?'2px solid var(--v2-green)':'2px solid transparent', marginBottom:-1 }}>
            {l}{k==='reissues'&&reissues.length>0?' ('+reissues.length+')':k==='renewals'&&renewals.length>0?' ('+renewals.length+')':''}</button>
        ))}
      </div>
      {tab==='reissues' && <div>
        {reissues.length===0 ? <div style={{ fontSize:12, color:'var(--v2-text-3)', padding:'8px 0' }}>No reissues yet.</div>
          : reissues.map((r,i) => (
          <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderRadius:6, marginBottom:4, background:'var(--v2-bg-2)', border:'1px solid var(--v2-border)' }}>
            <div style={{ fontSize:12 }}>
              <span style={{ fontWeight:600 }}>v{i+2}</span>
              <span style={{ color:'var(--v2-text-3)', marginLeft:8 }}>{fmtDate(r.created_at)}</span>
              <span style={{ color:'var(--v2-text-3)', marginLeft:8 }}>· {r.triggered_by||' manual'}</span>
            </div>
            <span style={statusStyle(r.install_status||r.status)}>{r.install_status||r.status}</span>
          </div>
        ))}
      </div>}
      {tab==='renewals' && <div>
        {renewals.length===0 ? <div style={{ fontSize:12, color:'var(--v2-text-3)', padding:'8px 0' }}>No renewals yet.</div>
          : renewals.map(r => (
          <div key={r.id} style={{ padding:'8px 10px', borderRadius:6, marginBottom:6, background:'var(--v2-bg-2)', border:'1px solid var(--v2-border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:12 }}><span style={{ fontWeight:600, color:'var(--v2-green)' }}>Renewed</span><span style={{ color:'var(--v2-text-3)', marginLeft:8 }}>{fmtDate(r.created_at)}</span></div>
              <span style={statusStyle(r.status)}>{r.status}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:3 }}>Valid until {fmtDate(r.expires_at)}</div>
          </div>
        ))}
      </div>}
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
        style={{ display:'flex', alignItems:'center', gap:5, background:'#7c3aed', color:'white',
          border:'none', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:600,
          cursor:scanning?'wait':'pointer', fontFamily:'inherit', opacity:scanning?0.8:1 }}>
        {scanning
          ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Scanning…</>
          : <><Shield size={11}/> Scan PQC</>}
      </button>
      {result && (
        <span style={{ fontSize:11, color: result.ok ? '#16a34a' : '#dc2626',
          background: result.ok ? '#f0fdf4' : '#fef2f2',
          border: `0.5px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
          borderRadius:5, padding:'3px 8px' }}>
          {result.ok ? `✓ ${result.scanned} cert${result.scanned!==1?'s':''} scanned` : `✗ ${result.error||'Failed'}`}
        </span>
      )}
    </div>
  )
}

// ── PQC Readiness row ─────────────────────────────────────────────────
const PQC_RISK_MAP = {
  ready:  { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'PQC Ready',     icon:'✓' },
  low:    { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Low risk',       icon:'~' },
  medium: { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Medium risk',    icon:'!' },
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
            <Shield size={16} color="#7c3aed"/>
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
                color:'#7c3aed', background:'#f5f3ff', border:'0.5px solid #ddd6fe',
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
                  <span style={{ color:'#7c3aed', cursor:'pointer' }}
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

  const gradeColor = { A:'#16a34a', B:'#65a30d', C:'#d97706', D:'#ea580c', F:'#dc2626' }
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
        onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
        onMouseLeave={e => e.currentTarget.style.background='var(--v2-bg)'}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'#f0f9ff',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Activity size={16} color="#0369a1"/>
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
              color:'#0369a1', background:'#eff6ff', border:'0.5px solid #bfdbfe',
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
                background: check.pass ? '#f0fdf4' : '#fef2f2',
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
  const [showKey,    setShowKey]   = useState(false)
  const [delConfirm, setDel]       = useState(false)
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
  const statusColor = isExpired ? '#ef4444' : isWarn ? '#f59e0b' : '#16a34a'
  const statusBg    = isExpired ? '#fef2f2' : isWarn ? '#fffbeb' : '#f0fdf4'
  const statusBorder= isExpired ? '#fecaca' : isWarn ? '#fde68a' : '#bbf7d0'
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

  // ── Inline copy button ────────────────────────────────────────────────────
  function InlineCopy({ text }) {
    const [ok, setOk] = useState(false)
    return (
      <button onClick={() => { try { navigator.clipboard.writeText(text) } catch(e) {} setOk(true); setTimeout(() => setOk(false), 1800) }}
        style={{ background:'none', border:'0.5px solid var(--v2-border)', borderRadius:4, cursor:'pointer',
          padding:'2px 6px', fontSize:10, color: ok ? '#16a34a' : 'var(--v2-text-3)',
          fontFamily:'inherit', transition:'all 0.12s', display:'inline-flex', alignItems:'center', gap:3,
          ...(ok ? { borderColor:'#bbf7d0', background:'#f0fdf4' } : {}) }}>
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
  const periodLabel = period ? (period === 12 ? '1 year' : period === 24 ? '2 years' : '3 years') : '1 year'

  return (
    <div style={{ background:'white', border:'0.5px solid #e2e8f0', borderRadius:14,
      overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.07)',
      position:'sticky', top:20, animation:'fadeSlideUp 0.3s ease both' }}>

      {/* ── Hero header ─── */}
      <div style={{ padding:'20px 20px 16px', background:'linear-gradient(135deg, #f8fafc 0%, white 100%)',
        borderBottom:'0.5px solid #f1f5f9' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
          <RingGauge days={days}/>
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
                background:'#eff6ff', color:'#185FA5', border:'0.5px solid #B5D4F4' }}>
                GoGetSSL
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
        {[
          { val: Math.max(0, days ?? 0), label:'Days left', color: statusColor },
          { val: 365,                    label:'Total days', color:'#0f172a' },
          { val: Math.max(0, (days ?? 0) - 166), label:'Reissue in', color:'#d97706' },
        ].map(({ val, label, color }, i) => (
          <div key={i} style={{ padding:'12px 16px',
            borderRight: i < 2 ? '0.5px solid #f1f5f9' : 'none' }}>
            <div style={{ fontSize:20, fontWeight:800, color, fontFamily:'monospace', letterSpacing:'-0.5px' }}>{val}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, textTransform:'uppercase', letterSpacing:'0.3px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      {cert.issued_at && cert.expires_at && (
        <ValidityTimeline issuedAt={cert.issued_at} expiresAt={cert.expires_at}/>
      )}

      {/* ── Tabs ─── */}
      <div style={{ display:'flex', padding:'0 16px', borderBottom:'0.5px solid #f1f5f9', gap:0 }}>
        {['details','actions','files','history'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ fontSize:11, fontWeight:700, padding:'11px 14px',
              background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
              color: activeTab===t ? '#0e7fc0' : '#94a3b8',
              borderBottom:'2px solid '+(activeTab===t ? '#0e7fc0' : 'transparent'),
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
              background: refreshMsg.includes('Error') ? '#fef2f2' : '#f0fdf4',
              color: refreshMsg.includes('Error') ? '#dc2626' : '#16a34a',
              border:'0.5px solid '+(refreshMsg.includes('Error') ? '#fecaca' : '#bbf7d0') }}>
              {refreshMsg}
            </div>
          )}
          <ActionRow icon={RotateCcw} iconColor="#16a34a" iconBg="#f0fdf4"
            hoverBorder="#bbf7d0" hoverBg="#f0fdf4"
            title="Reissue certificate" subtitle="New cert, same order period · auto DNS"
            onClick={() => certHistoryRef.current?.doAction('reissue')}
            disabled={!session}/>
          <ActionRow icon={RefreshCw} iconColor="#2563eb" iconBg="#eff6ff"
            hoverBorder="#bfdbfe" hoverBg="#eff6ff"
            title="Renew for another year" subtitle="New GGS order · new cert row"
            onClick={() => certHistoryRef.current?.doAction('renew')}
            disabled={!session}/>
          <ActionRow icon={Server} iconColor="#7c3aed" iconBg="#f5f3ff"
            hoverBorder="#ddd6fe" hoverBg="#f5f3ff"
            title="Install on server" subtitle="VPS agent or cPanel wizard"
            onClick={() => onInstall(cert)}/>
          <ActionRow icon={RefreshCw} iconColor="#d97706" iconBg="#fffbeb"
            hoverBorder="#fde68a" hoverBg="#fffbeb"
            title={refreshing ? 'Syncing...' : 'Sync from GoGetSSL'}
            subtitle={refreshing ? 'Checking status...' : 'Pull latest order status'}
            onClick={doRefresh} disabled={refreshing}/>
          <TlsPostureRow cert={cert} onRefresh={onRefresh}/>
          <PqcRow cert={cert} onRefresh={onRefresh}/>
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
                <div style={{ width:30, height:30, borderRadius:7, background:'#eff6ff',
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
            <span style={{ fontSize:9, fontWeight:700, color: cert.tls_grade==='A'?'#16a34a':cert.tls_grade==='B'?'#65a30d':cert.tls_grade==='C'?'#d97706':'#dc2626',
              background: cert.tls_grade==='A'?'#f0fdf4':cert.tls_grade==='B'?'#f7fee7':cert.tls_grade==='C'?'#fffbeb':'#fef2f2',
              border: '0.5px solid currentColor', borderRadius:3, padding:'1px 5px', opacity:0.8 }}>
              {cert.tls_grade}
            </span>
          )}
          {cert.pqc_risk && (
            <span title={cert.key_algorithm || 'PQC check'} style={{ fontSize:9, fontWeight:700,
              color: cert.pqc_risk==='ready'?'#16a34a':cert.pqc_risk==='low'?'#2563eb':cert.pqc_risk==='medium'?'#d97706':'#dc2626',
              background: cert.pqc_risk==='ready'?'#f0fdf4':cert.pqc_risk==='low'?'#eff6ff':cert.pqc_risk==='medium'?'#fffbeb':'#fef2f2',
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
                    <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>RSA 2048-bit</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="v2-btn v2-btn-sm" onClick={() => setShowKey(v => !v)}>
                    {showKey ? <><EyeOff size={10}/> Hide</> : <><Eye size={10}/> Reveal</>}
                  </button>
                  <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.private_key_pem, cert.domain+'-key.pem')}>
                    <Download size={10}/> Save
                  </button>
                </div>
              </div>
              {showKey && (
                <div style={{ margin:'0 12px 10px', background:'#0a0a0a', borderRadius:6,
                  padding:'8px 10px', fontSize:10, fontFamily:'monospace', color:'#a3e635',
                  whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflowY:'auto' }}>
                  {cert.private_key_pem}
                </div>
              )}
            </div>
          )}
          {/* Key warning / deleted state */}
          {cert.private_key_pem && !keyDeleted && !keyDelConfirm && (
            <div style={{ background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:8,
              padding:'10px 12px', marginBottom:10, display:'flex', gap:10, alignItems:'flex-start' }}>
              <ShieldOff size={13} color="#b45309" style={{ flexShrink:0, marginTop:1 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#92400e', marginBottom:2 }}>Private key stored server-side</div>
                <div style={{ fontSize:11, color:'#b45309' }}>Download and delete from SSLVault after installing.</div>
              </div>
              <button className="v2-btn v2-btn-sm" onClick={() => setKDC(true)}
                style={{ fontSize:10, borderColor:'#fcd34d', color:'#92400e', flexShrink:0 }}>
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
      {activeTab === 'history' && session && (
        <div style={{ padding:'14px 18px' }}>
          <CertHistory ref={certHistoryRef} cert={cert} session={session}/>
        </div>
      )}
      {activeTab === 'history' && !session && (
        <div style={{ padding:'14px 18px', fontSize:12, color:'var(--v2-text-3)' }}>Sign in to view history.</div>
      )}

      <style>{`
        @keyframes v3pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      `}</style>
    </div>
  )
}
function CertRow({ cert, selected, onClick }) {
  const days = daysLeft(cert.expires_at)
  const s    = statusOf(days, cert.status)
  const initials = cert.domain.replace(/^www\./, '').slice(0,2).toUpperCase()
  const dotColor = s.dot==='green'?'#16a34a':s.dot==='amber'?'#f59e0b':s.dot==='red'?'#dc2626':'#d4d4d4'
  const iconBg   = s.dot==='green'?'#0e7fc0':s.dot==='amber'?'#d97706':s.dot==='red'?'#dc2626':'#64748b'
  return (
    <div onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        cursor:'pointer', transition:'all .15s',
        background: selected ? '#f0f7ff' : 'white',
        borderLeft: selected ? '3px solid #0e7fc0' : '3px solid transparent',
        borderBottom:'0.5px solid #f1f5f9' }}
      onMouseEnter={e=>{if(!selected){e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderLeftColor='#bfdbfe'}}}
      onMouseLeave={e=>{if(!selected){e.currentTarget.style.background='white';e.currentTarget.style.borderLeftColor='transparent'}}}>
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
          {cert.tls_grade && (
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4,
              color: cert.tls_grade==='A'?'#16a34a':cert.tls_grade==='B'?'#65a30d':cert.tls_grade==='C'?'#d97706':'#dc2626',
              background: cert.tls_grade==='A'?'#f0fdf4':cert.tls_grade==='B'?'#f7fee7':cert.tls_grade==='C'?'#fffbeb':'#fef2f2',
              border:'0.5px solid currentColor' }}>
              TLS {cert.tls_grade}
            </span>
          )}
          {cert.pqc_risk && (
            <span title={cert.key_algorithm||'PQC'} style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4,
              color: cert.pqc_risk==='ready'?'#16a34a':cert.pqc_risk==='low'?'#2563eb':cert.pqc_risk==='medium'?'#d97706':'#dc2626',
              background: cert.pqc_risk==='ready'?'#f0fdf4':cert.pqc_risk==='low'?'#eff6ff':cert.pqc_risk==='medium'?'#fffbeb':'#fef2f2',
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
      </div>
      <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink:0 }}/>
    </div>
  )
}

function LoggedInDashboard({ user, nav }) {
  const [certs,   setCerts]  = useState([])
  const [orders,  setOrders] = useState([])
  const [loading, setLoading]= useState(true)
  const [selected,setSelected]= useState(null)
  const [filter,  setFilter] = useState('all')
  const [search,  setSearch] = useState('')
  const [agentCert,  setAgentCert]  = useState(null)   // VPS agent install modal
  const [cpanelCert, setCpanelCert] = useState(null)   // cPanel install modal
  const [session,    setSession]    = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    const [{ data: certsData }, { data: ordersData }] = await Promise.all([
      supabase.from('certificates').select('*').eq('user_id', user.id).eq('status', 'active').order('expires_at', { ascending:true }),
      supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'dv_pending').order('created_at', { ascending:false }),
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
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const fn = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [load])
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

  const total    = certs.length
  const healthy  = certs.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 }).length
  const expiring = certs.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 }).length
  const expired  = certs.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 }).length

  const visible = certs.filter(c => {
    const d = daysLeft(c.expires_at); const s = statusOf(d, c.status)
    if (filter === 'healthy'  && s.cls !== 'green') return false
    if (filter === 'expiring' && s.cls !== 'amber') return false
    if (filter === 'expired'  && s.cls !== 'red')   return false
    if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
                  background:'#f0fdf4', color:'#16a34a', border:'0.5px solid #bbf7d0',
                  animation:'fadeIn 0.5s ease' }}>
                  All healthy ✓
                </span>
              )}
            </h1>
            <p style={{ fontSize:12, color:'#94a3b8' }}>{user.email} · {total} certificate{total!==1?'s':''}</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Total',        value:total,    color:'#0e7fc0', bg:'#eff6ff', icon:'▦', sub:'certificates' },
            { label:'Healthy',      value:healthy,  color:'#16a34a', bg:'#f0fdf4', icon:'✓', sub:healthy>0?'All valid':'None' },
            { label:'Expiring',     value:expiring, color:expiring>0?'#d97706':'#94a3b8', bg:expiring>0?'#fffbeb':'#f8fafc', icon:'⏱', sub:expiring>0?'Renew soon':'None' },
            { label:'PQC risk',     value:certs.filter(c=>c.pqc_risk==='high').length, color:certs.filter(c=>c.pqc_risk==='high').length>0?'#7c3aed':'#94a3b8', bg:certs.filter(c=>c.pqc_risk==='high').length>0?'#f5f3ff':'#f8fafc', icon:'⚛', sub:certs.filter(c=>c.pqc_risk==='high').length>0?'Migrate by 2030':'None checked' },
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
                      background: filter===f.key ? '#0e7fc0' : '#e2e8f0',
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
                    onFocus={e=>e.target.style.borderColor='#0e7fc0'}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
                  <Globe size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                </div>
                <ScanPqcButton onDone={load}/>
                <button onClick={() => nav('/buy')}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'#0e7fc0', color:'white',
                    border:'none', borderRadius:8, padding:'7px 14px', fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 6px rgba(14,127,192,0.3)',
                    transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#0369a1';e.currentTarget.style.boxShadow='0 4px 12px rgba(14,127,192,0.4)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#0e7fc0';e.currentTarget.style.boxShadow='0 2px 6px rgba(14,127,192,0.3)'}}>
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
                  <button onClick={() => nav('/buy')}
                    style={{ background:'#0e7fc0', color:'white', border:'none', borderRadius:7,
                      padding:'9px 18px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    Issue your first certificate
                  </button>
                )}
              </div>
            ) : (
              visible.map(cert => (
                <CertRow key={cert.id} cert={cert} selected={selected===cert.id}
                  onClick={() => setSelected(selected===cert.id ? null : cert.id)}/>
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

        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Quick actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { icon:Shield,    color:'#0e7fc0', bg:'#eff6ff', label:'Issue Certificate', desc:'RapidSSL DV · GoGetSSL · ~5 min',    action:() => nav('/buy') },
              { icon:Download,  color:'#16a34a', bg:'#f0fdf4', label:'Install Guide',     desc:'Nginx, Apache, cPanel step-by-step', action:() => nav('/install') },
              { icon:Activity,  color:'#7c3aed', bg:'#f5f3ff', label:'DNS & Servers',     desc:'Cloudflare, Vercel, agent setup',    action:() => nav('/dns-providers') },
              { icon:Zap,       color:'#d97706', bg:'#fffbeb', label:'Knowledge Base',    desc:'Guides, FAQs, troubleshooting',      action:() => nav('/knowledge-base') },
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
            <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => nav('/buy')}>
              Issue SSL Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ nav }) {
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
  return <LoggedInDashboard user={user} nav={nav}/>
}
