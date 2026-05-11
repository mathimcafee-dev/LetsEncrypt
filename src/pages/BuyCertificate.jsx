import { useState, useEffect, useRef } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw,
         Copy, Check, Lock, Zap, Globe, Server, ArrowRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX   = true

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .sv-page { font-family:'Inter',system-ui,sans-serif; background:#f8fafc; min-height:calc(100vh - 56px); }

  /* ── Hero strip ── */
  .sv-hero {
    background: linear-gradient(135deg, #0a0a0a 0%, #111827 100%);
    padding: 28px 24px 24px;
    position: relative;
    overflow: hidden;
  }
  .sv-hero::before {
    content:'';
    position:absolute; inset:0;
    background: radial-gradient(ellipse 600px 300px at 50% -50%, rgba(16,185,129,0.15), transparent);
    pointer-events:none;
  }
  .sv-hero-inner { max-width:640px; margin:0 auto; position:relative; }

  /* ── Step bar ── */
  .sv-steps { display:flex; align-items:center; gap:0; padding:20px 24px 0; max-width:640px; margin:0 auto; }
  .sv-step-dot {
    width:24px; height:24px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:10px; font-weight:700; flex-shrink:0;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  }
  .sv-step-dot.done { background:#10b981; border:2px solid #10b981; color:white; transform:scale(1.05); }
  .sv-step-dot.active { background:#0a0a0a; border:2px solid #0a0a0a; color:white; box-shadow:0 0 0 4px rgba(10,10,10,0.08); }
  .sv-step-dot.future { background:white; border:2px solid #e2e8f0; color:#cbd5e1; }
  .sv-step-label { font-size:11px; font-weight:500; transition:color 0.3s; }
  .sv-step-label.active { color:#0a0a0a; font-weight:600; }
  .sv-step-label.done { color:#10b981; }
  .sv-step-label.future { color:#cbd5e1; }
  .sv-step-line { flex:1; height:1px; margin:0 8px; transition:background 0.4s; }
  .sv-step-line.done { background:#10b981; }
  .sv-step-line.future { background:#e2e8f0; }

  /* ── Main body ── */
  .sv-body { max-width:640px; margin:0 auto; padding:20px 16px 80px; }
  @media(min-width:640px) { .sv-body { padding:24px 24px 80px; } }

  /* ── Pending banner ── */
  .sv-pending-banner {
    background:#fffbeb; border:1px solid #fde68a; border-radius:12px;
    padding:12px 14px; margin-bottom:20px;
    display:flex; align-items:center; gap:10;
    animation: slideDown 0.3s ease;
  }

  /* ── Stats row ── */
  .sv-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:20px; }
  .sv-stat {
    background:white; border:1px solid #e8edf2; border-radius:10px;
    padding:12px 10px; text-align:center;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .sv-stat:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.06); }
  .sv-stat-val { font-size:16px; font-weight:800; color:#0a0a0a; letter-spacing:-0.4px; }
  .sv-stat-lbl { font-size:10px; color:#94a3b8; margin-top:2px; font-weight:500; }

  /* ── Domain field ── */
  .sv-domain-wrap { margin-bottom:16px; }
  .sv-domain-label { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; display:block; margin-bottom:6px; }
  .sv-domain-input-wrap { position:relative; }
  .sv-domain-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); pointer-events:none; color:#94a3b8; }
  .sv-domain-input {
    width:100%; height:52px; padding:0 14px 0 38px;
    font-size:15px; font-weight:700; font-family:'SF Mono','JetBrains Mono',monospace;
    color:#0a0a0a; background:white;
    border:2px solid #e2e8f0; border-radius:10px;
    outline:none; transition:border-color 0.2s, box-shadow 0.2s;
    box-sizing:border-box; letter-spacing:-0.2px;
  }
  .sv-domain-input:focus { border-color:#0a0a0a; box-shadow:0 0 0 4px rgba(10,10,10,0.06); }
  .sv-domain-input::placeholder { color:#cbd5e1; font-family:'Inter',system-ui,sans-serif; font-weight:400; font-size:14px; }

  /* ── Card ── */
  .sv-card { background:white; border:1px solid #e8edf2; border-radius:12px; overflow:hidden; margin-bottom:12px; }
  .sv-card-head { padding:14px 16px; border-bottom:1px solid #f1f5f9; background:#fafbfc; }
  .sv-card-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; }
  .sv-card-body { padding:16px; }

  /* ── Inputs inside card ── */
  .sv-input {
    width:100%; padding:9px 11px; font-size:13px;
    border:1px solid #e2e8f0; border-radius:7px;
    font-family:'Inter',system-ui,sans-serif; color:#0a0a0a; background:white;
    outline:none; transition:border-color 0.15s, box-shadow 0.15s;
    box-sizing:border-box;
  }
  .sv-input:focus { border-color:#0a0a0a; box-shadow:0 0 0 3px rgba(10,10,10,0.06); }
  .sv-input::placeholder { color:#cbd5e1; }
  .sv-2col { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .sv-field-label { font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.3px; display:block; margin-bottom:5px; }

  /* ── Validity toggle ── */
  .sv-validity { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .sv-validity-btn {
    padding:11px 12px; border-radius:9px; cursor:pointer; font-family:'Inter',system-ui,sans-serif;
    text-align:left; transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
    border:2px solid #e2e8f0; background:white;
  }
  .sv-validity-btn.selected { border-color:#0a0a0a; background:#0a0a0a; box-shadow:0 4px 12px rgba(0,0,0,0.2); transform:translateY(-1px); }
  .sv-validity-val { font-size:13px; font-weight:700; }
  .sv-validity-btn.selected .sv-validity-val { color:white; }
  .sv-validity-btn:not(.selected) .sv-validity-val { color:#0a0a0a; }
  .sv-validity-price { font-size:11px; margin-top:1px; }
  .sv-validity-btn.selected .sv-validity-price { color:rgba(255,255,255,0.55); }
  .sv-validity-btn:not(.selected) .sv-validity-price { color:#94a3b8; }

  /* ── Summary + CTA ── */
  .sv-summary { background:white; border:1px solid #e8edf2; border-radius:12px; overflow:hidden; }
  .sv-summary-rows { padding:12px 16px; border-bottom:1px solid #f1f5f9; }
  .sv-summary-row { display:flex; justify-content:space-between; font-size:12px; color:#64748b; margin-bottom:4px; }
  .sv-summary-row:last-child { margin-bottom:0; }
  .sv-summary-row.green { color:#10b981; }
  .sv-summary-footer { padding:14px 16px; background:#f8fafc; display:flex; justify-content:space-between; align-items:center; gap:12; }
  .sv-total-label { font-size:10px; color:#94a3b8; margin-bottom:2px; }
  .sv-total-val { font-size:24px; font-weight:800; color:#0a0a0a; letter-spacing:-0.6px; line-height:1; }
  .sv-total-note { font-size:9px; color:#cbd5e1; margin-top:2px; }

  /* ── CTA Button ── */
  .sv-cta {
    background:#0a0a0a; color:white; border:none; border-radius:10px;
    padding:13px 20px; font-size:13px; font-weight:700; cursor:pointer;
    display:inline-flex; align-items:center; gap:7; font-family:'Inter',system-ui,sans-serif;
    white-space:nowrap; flex-shrink:0;
    box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1);
    transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .sv-cta:hover { background:#1a1a1a; box-shadow:0 4px 16px rgba(0,0,0,0.3); transform:translateY(-1px); }
  .sv-cta:active { transform:translateY(0); box-shadow:0 1px 4px rgba(0,0,0,0.2); }
  .sv-cta:disabled { background:#94a3b8; cursor:not-allowed; transform:none; box-shadow:none; }
  .sv-cta-green { background:#10b981; box-shadow:0 2px 8px rgba(16,185,129,0.35); }
  .sv-cta-green:hover { background:#059669; box-shadow:0 4px 16px rgba(16,185,129,0.4); }
  .sv-cta-outline { background:white; color:#0a0a0a; border:1.5px solid #e2e8f0; box-shadow:none; }
  .sv-cta-outline:hover { background:#f8fafc; border-color:#cbd5e1; box-shadow:none; transform:none; }
  .sv-cta-ghost { background:transparent; color:#94a3b8; border:none; box-shadow:none; padding:9px 10px; }
  .sv-cta-ghost:hover { background:transparent; color:#64748b; box-shadow:none; transform:none; }

  /* ── Error alert ── */
  .sv-error { display:flex; gap:8px; align-items:flex-start; background:#fef2f2; border:1px solid #fecaca; border-radius:9px; padding:10px 12px; font-size:12px; color:#dc2626; margin-top:12px; animation:fadeIn 0.2s ease; }

  /* ── Trust chips ── */
  .sv-trust { display:flex; justify-content:center; gap:14px; flex-wrap:wrap; margin-top:20px; }
  .sv-trust-item { font-size:11px; color:#94a3b8; display:flex; align-items:center; gap:5; }

  /* ── DV Card ── */
  .sv-dv-header { background:linear-gradient(135deg,#fffbeb,#fefce8); border-bottom:1px solid #fde68a; padding:14px 16px; display:flex; align-items:center; gap:10; }
  .sv-dv-icon { width:36px; height:36px; background:#fef3c7; border:1px solid #fde68a; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sv-dv-title { font-size:13px; font-weight:700; color:#92400e; }
  .sv-dv-sub { font-size:11px; color:#b45309; margin-top:1px; }
  .sv-order-badge { font-size:10px; color:#b45309; background:#fef3c7; border:0.5px solid #fde68a; border-radius:4px; padding:3px 8px; flex-shrink:0; }

  /* ── DNS terminal ── */
  .sv-terminal { background:#0d1117; margin:14px 16px; border-radius:9px; overflow:hidden; border:1px solid #21262d; }
  .sv-terminal-head { padding:8px 12px; background:#161b22; border-bottom:1px solid #21262d; display:flex; align-items:center; gap:5; }
  .sv-terminal-dot { width:9px; height:9px; border-radius:50%; }
  .sv-terminal-title { font-size:9px; color:#484f58; font-family:monospace; margin-left:4px; }
  .sv-dns-row { padding:9px 12px; border-bottom:1px solid #1a1a1a; display:flex; align-items:center; gap:10; }
  .sv-dns-key { font-size:9px; color:#484f58; width:38px; flex-shrink:0; font-family:monospace; text-transform:uppercase; letter-spacing:0.4px; }
  .sv-dns-val { flex:1; font-size:11px; font-family:monospace; color:#c9d1d9; word-break:break-all; display:flex; align-items:center; gap:7; line-height:1.5; }
  .sv-dns-val.green { color:#10b981; }
  .sv-dns-val.muted { color:#484f58; }
  .sv-copy-btn { display:inline-flex; align-items:center; gap:4; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#6b7280; border-radius:4px; padding:3px 8px; font-size:10px; cursor:pointer; font-family:'Inter',system-ui,sans-serif; transition:all 0.15s; flex-shrink:0; }
  .sv-copy-btn.copied { background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3); color:#34d399; }

  /* ── DV Action row ── */
  .sv-dv-actions { padding:0 16px 16px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .sv-auto-note { padding:11px 14px; background:white; border:1px solid #e8edf2; border-radius:9px; font-size:12px; color:#64748b; line-height:1.7; display:flex; gap:8px; }

  /* ── Feedback ── */
  .sv-feedback-ok { margin:0 16px 12px; border-radius:8px; padding:9px 12px; font-size:12px; display:flex; gap:7; align-items:flex-start; background:#f0fdf4; border:1px solid #86efac; color:#166534; animation:fadeIn 0.2s ease; }
  .sv-feedback-err { margin:0 16px 12px; border-radius:8px; padding:9px 12px; font-size:12px; display:flex; gap:7; align-items:flex-start; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; animation:fadeIn 0.2s ease; }
  .sv-feedback-warn { margin:0 16px 12px; border-radius:8px; padding:9px 12px; font-size:12px; background:#fffbeb; border:1px solid #fde68a; color:#92400e; display:flex; gap:7; }

  /* ── Done screen ── */
  .sv-done-header { background:linear-gradient(135deg,#f0fdf4,#fafff9); border-bottom:1px solid #dcfce7; padding:40px 24px; text-align:center; }
  .sv-done-ring {
    width:72px; height:72px; border-radius:50%;
    background:#dcfce7; border:2.5px solid #86efac;
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 20px; position:relative;
    animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  .sv-done-ring::before {
    content:''; position:absolute; inset:-10px; border-radius:50%;
    background:radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%);
    animation:pulse 2s ease-in-out infinite;
  }
  .sv-done-title { font-size:22px; font-weight:800; color:#0a0a0a; letter-spacing:-0.5px; margin-bottom:6px; }
  .sv-done-sub { font-size:13px; color:#64748b; line-height:1.6; }
  .sv-done-actions { padding:16px; display:flex; flex-direction:column; gap:8px; }

  /* ── Animations ── */
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes popIn { 0% { transform:scale(0.6); opacity:0; } 100% { transform:scale(1); opacity:1; } }
  @keyframes pulse { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.15); opacity:1; } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes shimmer { 0% { opacity:0.5; } 50% { opacity:1; } 100% { opacity:0.5; } }
  .spin { animation:spin 0.8s linear infinite; }
  .shimmer { animation:shimmer 1.5s ease-in-out infinite; }

  /* ── Mobile ── */
  @media(max-width:480px) {
    .sv-hero { padding:20px 16px 18px; }
    .sv-2col { grid-template-columns:1fr; }
    .sv-stats { gap:6px; }
    .sv-stat-val { font-size:14px; }
    .sv-summary-footer { flex-direction:column; align-items:flex-start; gap:10px; }
    .sv-cta { width:100%; justify-content:center; }
    .sv-steps { padding:16px 16px 0; }
    .sv-domain-input { font-size:14px; height:48px; }
    .sv-done-title { font-size:19px; }
    .sv-hero-stats { display:none; }
  }
`

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button className={`sv-copy-btn${ok?' copied':''}`}
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}>
      {ok ? <><Check size={9}/> Copied</> : <><Copy size={9}/> Copy</>}
    </button>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span className="sv-field-label">{label}</span>
        {hint && <span style={{ fontSize:10, color:'#94a3b8' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Steps({ step }) {
  const idx = { form:0, dv:1, done:2 }[step] ?? 0
  return (
    <div className="sv-steps">
      {['Configure','Validate','Done'].map((s, i) => {
        const done = i < idx, active = i === idx
        return (
          <div key={s} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 1 : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <div className={`sv-step-dot ${done?'done':active?'active':'future'}`}>
                {done ? <Check size={11} strokeWidth={3}/> : i+1}
              </div>
              <span className={`sv-step-label ${done?'done':active?'active':'future'}`}>{s}</span>
            </div>
            {i < 2 && <div className={`sv-step-line ${i < idx?'done':'future'}`}/>}
          </div>
        )
      })}
    </div>
  )
}

function cleanDomain(v) {
  return v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
}

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep]           = useState('form')
  const [domain, setDomain]       = useState('')
  const [years, setYears]         = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [ordering, setOrdering]   = useState(false)
  const [error, setError]         = useState('')
  const [orderData, setOrderData] = useState(null)
  const [checking, setChecking]   = useState(false)
  const [dnsAdding, setDnsAdding] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [txtPolling, setTxtPolling]   = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)

  useEffect(() => {
    const p = sessionStorage.getItem('prefill_domain')
    if (p) { setDomain(p); sessionStorage.removeItem('prefill_domain') }
  }, [])
  useEffect(() => { if (user) setAdminEmail(prev => prev || user.email || '') }, [user])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase.from('tss_orders')
        .select('id,domain,tss_order_id,dv_cname_host,dv_cname_value')
        .eq('user_id', user.id).eq('status','dv_pending')
        .order('created_at', { ascending:false }).limit(1)
      if (data?.length) setPendingOrder(data[0])
    })()
  }, [user])

  useEffect(() => {
    if (step !== 'dv' || !orderData?.order_id || orderData?.txt_value) return
    setTxtPolling(true)
    let n = 0
    const iv = setInterval(async () => {
      n++
      try {
        const s = await callTSS('check_status', { order_id: orderData.order_id })
        if (s.txt_value) { setOrderData(p => ({ ...p, txt_name:s.txt_name, txt_value:s.txt_value })); setTxtPolling(false); clearInterval(iv) }
        if (s.status === 'active') { setStep('done'); setTxtPolling(false); clearInterval(iv) }
      } catch(e) {}
      if (n >= 24) { setTxtPolling(false); clearInterval(iv) }
    }, 5000)
    return () => { clearInterval(iv); setTxtPolling(false) }
  }, [step, orderData?.order_id])

  const callTSS = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tss-issue`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session.access_token}` },
      body: JSON.stringify({ action, ...extra }),
    })
    return res.json()
  }

  const placeOrder = async () => {
    const d = cleanDomain(domain)
    if (!d)                { setError('Enter a domain name'); return }
    if (!firstName.trim()) { setError('First name required'); return }
    if (!lastName.trim())  { setError('Last name required'); return }
    if (!adminEmail.trim()){ setError('Email required'); return }
    if (!phone.trim())     { setError('Phone number required'); return }
    setError(''); setOrdering(true)
    const result = await callTSS('place_order', {
      domain:d, years, product_code:'rapidssl',
      firstName:firstName.trim(), lastName:lastName.trim(),
      adminEmail:adminEmail.trim(), phone:phone.trim(), is_sandbox:IS_SANDBOX,
    })
    if (result.error) { setError(result.error); setOrdering(false); return }
    let dvData = result
    if (result.order_id) {
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const s = await callTSS('check_status', { order_id:result.order_id })
        if (s.txt_value) { dvData = { ...result, txt_name:s.txt_name, txt_value:s.txt_value }; break }
      }
    }
    setOrdering(false); setOrderData(dvData); setStep('dv')
  }

  const checkStatus = async () => {
    setChecking(true); setCheckResult(null)
    const r = await callTSS('check_status', { order_id:orderData.order_id })
    setChecking(false); setCheckResult(r)
    if (r.status === 'active') setStep('done')
  }

  const retryDns = async () => {
    setDnsAdding(true); setCheckResult(null)
    try {
      const r = await callTSS('retry_dns', { order_id:orderData.order_id })
      setCheckResult({ dns_auto:r })
    } catch(e) { setCheckResult({ dns_auto:{ ok:false, message:String(e) } }) }
    setDnsAdding(false)
  }

  const reset = () => { setStep('form'); setDomain(''); setOrderData(null); setCheckResult(null); setPendingOrder(null); setError('') }
  const resumePending = () => {
    const o = pendingOrder
    setDomain(o.domain)
    setOrderData({ order_id:o.id, tss_order_id:o.tss_order_id, txt_name:o.dv_cname_host||o.domain, txt_value:o.dv_cname_value||'' })
    setPendingOrder(null); setStep('dv')
  }

  if (authLoading) return null
  if (!user) return (
    <>
      <style>{CSS}</style>
      <div className="sv-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
        <div style={{ textAlign:'center', maxWidth:320, padding:24, animation:'fadeIn 0.4s ease' }}>
          <div style={{ width:52, height:52, background:'#0a0a0a', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
            <Shield size={24} color="white"/>
          </div>
          <div style={{ fontSize:18, fontWeight:800, color:'#0a0a0a', marginBottom:8, letterSpacing:'-0.4px' }}>Sign in to continue</div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:24, lineHeight:1.7 }}>Your SSLVault account manages all certificates, auto-renewal, and server delivery.</div>
          <button className="sv-cta" onClick={() => nav('/auth')} style={{ margin:'0 auto' }}><Lock size={14}/> Sign in to SSLVault</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="sv-page">

        {/* ── HERO HEADER ──────────────────────────────────────── */}
        <div className="sv-hero">
          <div className="sv-hero-inner">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Shield size={16} color='#10b981'/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'white', letterSpacing:'-0.2px' }}>Issue Certificate</div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:1 }}>RapidSSL DV · TheSSLStore · DigiCert Trust Network</div>
              </div>
              <div className="sv-hero-stats" style={{ display:'flex', gap:20 }}>
                {[['~5 min','Issuance'],['1 yr','Validity'],['99.9%','Trust']].map(([v,l]) => (
                  <div key={l} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'#10b981', letterSpacing:'-0.3px' }}>{v}</div>
                    <div style={{ fontSize:9, color:'#6b7280', marginTop:1 }}>{l}</div>
                  </div>
                ))}
              </div>
              {IS_SANDBOX && <span style={{ fontSize:9, fontWeight:700, color:'#a78bfa', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:3, padding:'3px 7px', letterSpacing:'0.5px', textTransform:'uppercase', flexShrink:0 }}>Sandbox</span>}
            </div>
          </div>
        </div>

        {/* ── STEP INDICATOR ───────────────────────────────────── */}
        <Steps step={step}/>

        {/* ── BODY ─────────────────────────────────────────────── */}
        <div className="sv-body">

          {/* ── FORM STEP ────────────────────────────────────── */}
          {step === 'form' && (
            <div style={{ animation:'slideDown 0.3s ease' }}>

              {/* Pending order banner */}
              {pendingOrder && (
                <div className="sv-pending-banner">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:2 }}>
                      Pending order — <span style={{ fontFamily:'monospace' }}>{pendingOrder.domain}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#b45309' }}>DNS validation in progress · Order #{pendingOrder.tss_order_id}</div>
                  </div>
                  <button className="sv-cta" style={{ background:'#d97706', padding:'7px 12px', fontSize:11, flexShrink:0 }} onClick={resumePending}>Resume →</button>
                  <button onClick={() => setPendingOrder(null)} style={{ background:'none', border:'none', color:'#b45309', cursor:'pointer', fontSize:18, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
                </div>
              )}

              {/* Stats */}
              <div className="sv-stats">
                {[['1 Year','Validity'],['~5 min','Issuance'],['€19/yr','From']].map(([v,l]) => (
                  <div className="sv-stat" key={l}>
                    <div className="sv-stat-val">{v}</div>
                    <div className="sv-stat-lbl">{l}</div>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div className="sv-domain-wrap">
                <span className="sv-domain-label">Domain name</span>
                <div className="sv-domain-input-wrap">
                  <Globe size={15} className="sv-domain-icon"/>
                  <input className="sv-domain-input" placeholder="yourdomain.com"
                    value={domain} onChange={e => setDomain(e.target.value)}/>
                </div>
              </div>

              {/* Contact card */}
              <div className="sv-card">
                <div className="sv-card-head"><span className="sv-card-label">Contact details</span></div>
                <div className="sv-card-body">
                  <div className="sv-2col">
                    <Field label="First name">
                      <input className="sv-input" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)}/>
                    </Field>
                    <Field label="Last name">
                      <input className="sv-input" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)}/>
                    </Field>
                  </div>
                  <Field label="Email" hint="cert delivery">
                    <input className="sv-input" type="email" placeholder="you@example.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}/>
                  </Field>
                  <Field label="Phone" hint="required by TSS">
                    <input className="sv-input" placeholder="+1 415 555 0100" value={phone} onChange={e => setPhone(e.target.value)}/>
                  </Field>
                  <Field label="Validity">
                    <div className="sv-validity">
                      {[{y:1,p:19},{y:2,p:34}].map(({y,p}) => (
                        <button key={y} className={`sv-validity-btn${years===y?' selected':''}`} onClick={() => setYears(y)}>
                          <div className="sv-validity-val">{y} year{y>1?'s':''}</div>
                          <div className="sv-validity-price">€{p} / year</div>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>

              {/* Summary + CTA */}
              <div className="sv-summary">
                <div className="sv-summary-rows">
                  <div className="sv-summary-row"><span>RapidSSL Standard DV · {years}yr</span><span>€{years===1?19:34}</span></div>
                  <div className="sv-summary-row green"><span>SSLVault lifecycle management</span><span>Free</span></div>
                </div>
                <div className="sv-summary-footer">
                  <div>
                    <div className="sv-total-label">Total today</div>
                    <div className="sv-total-val">€{years===1?19:34}</div>
                    <div className="sv-total-note">Demo mode · no payment</div>
                  </div>
                  <button className="sv-cta" onClick={placeOrder} disabled={ordering}>
                    {ordering ? <><RefreshCw size={14} className="spin"/> Placing order…</> : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
                  </button>
                </div>
              </div>

              {error && <div className="sv-error"><AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{error}</div>}

              <div className="sv-trust">
                {['🔒 256-bit TLS','🏆 DigiCert chain','⚡ Auto-renewal','🌐 All browsers'].map(t => (
                  <span className="sv-trust-item" key={t}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── DV VALIDATION STEP ──────────────────────────── */}
          {step === 'dv' && orderData && (
            <div style={{ animation:'slideDown 0.3s ease' }}>
              <div className="sv-card">
                <div className="sv-dv-header">
                  <div className="sv-dv-icon"><Globe size={16} color='#d97706'/></div>
                  <div style={{ flex:1 }}>
                    <div className="sv-dv-title">Verify domain ownership</div>
                    <div className="sv-dv-sub">Add the TXT record below to <strong style={{ fontFamily:'monospace' }}>{domain}</strong></div>
                  </div>
                  <div className="sv-order-badge">#{orderData.tss_order_id||'—'}</div>
                </div>

                <div className="sv-terminal">
                  <div className="sv-terminal-head">
                    {['#ff5f56','#ffbd2e','#27c93f'].map(c => <span key={c} className="sv-terminal-dot" style={{ background:c }}/>)}
                    <span className="sv-terminal-title">DNS TXT record · {domain}</span>
                  </div>
                  {[
                    { k:'Name',  v:orderData.txt_name||domain, copy:true },
                    { k:'Type',  v:'TXT', green:true },
                    { k:'Value', v:orderData.txt_value||null, copy:true, loading:!orderData.txt_value },
                    { k:'TTL',   v:'300' },
                  ].map(({ k, v, copy, green, loading }) => (
                    <div key={k} className="sv-dns-row">
                      <span className="sv-dns-key">{k}</span>
                      <span className={`sv-dns-val${green?' green':loading?' muted':''}`}>
                        {loading
                          ? <><RefreshCw size={10} className="shimmer" style={{ color:'#484f58', flexShrink:0 }}/><span>Fetching from TSS{txtPolling?'…':' — click Auto-Add DNS'}</span></>
                          : v}
                      </span>
                      {copy && v && !loading && <CopyBtn text={v}/>}
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                {checkResult?.dns_auto && (
                  checkResult.dns_auto.ok
                    ? <div className="sv-feedback-ok"><Check size={12} style={{ flexShrink:0, marginTop:1 }}/>TXT added via {checkResult.dns_auto.provider} — wait 1–2 min then Check Status</div>
                    : <div className="sv-feedback-err"><AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>{checkResult.dns_auto.message}</div>
                )}
                {checkResult && checkResult.status !== 'active' && !checkResult.dns_auto && (
                  <div className="sv-feedback-warn"><AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>Not validated yet ({checkResult.major_status}) — wait a few minutes.</div>
                )}

                <div className="sv-dv-actions">
                  <button className="sv-cta sv-cta-green" onClick={retryDns} disabled={dnsAdding||!orderData.txt_value}>
                    {dnsAdding ? <><RefreshCw size={13} className="spin"/> Adding…</> : <><Zap size={13}/> Auto-Add DNS</>}
                  </button>
                  <button className="sv-cta sv-cta-outline" onClick={checkStatus} disabled={checking}>
                    {checking ? <><RefreshCw size={13} className="spin"/> Checking…</> : <><RefreshCw size={13}/> Check Status</>}
                  </button>
                  <button className="sv-cta sv-cta-ghost" onClick={reset}>← New order</button>
                </div>
              </div>

              <div className="sv-auto-note">
                <Zap size={13} color='#10b981' style={{ flexShrink:0, marginTop:1 }}/>
                <span><strong style={{ color:'#0a0a0a' }}>Fully automatic:</strong> SSLVault polls TSS every 5 min. Once your TXT record propagates, the cert activates automatically — no action needed.</span>
              </div>
            </div>
          )}

          {/* ── DONE STEP ───────────────────────────────────── */}
          {step === 'done' && (
            <div style={{ animation:'fadeIn 0.4s ease' }}>
              <div className="sv-card">
                <div className="sv-done-header">
                  <div className="sv-done-ring"><CheckCircle size={32} color='#10b981'/></div>
                  <div className="sv-done-title">Certificate issued!</div>
                  <div className="sv-done-sub">
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0a0a0a' }}>{cleanDomain(domain)}</span>
                    {' '}is now secured · Auto-renewal active
                  </div>
                </div>
                <div className="sv-done-actions">
                  <button className="sv-cta" style={{ width:'100%', justifyContent:'center' }}
                    onClick={() => { sessionStorage.setItem('install_domain', cleanDomain(domain)); nav('/dashboard') }}>
                    <Server size={14}/> Install on server
                  </button>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <button className="sv-cta sv-cta-outline" onClick={() => nav('/dashboard')} style={{ justifyContent:'center' }}>View dashboard</button>
                    <button className="sv-cta sv-cta-outline" onClick={reset} style={{ justifyContent:'center', color:'#64748b' }}>Issue another</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
