import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, ShieldCheck, Clock, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX = true

const PRODUCTS = [
  { code: 'rapidssl', name: 'RapidSSL DV', type: 'DV', price: 19, wildcard: false, available: true },
]

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.ec-root {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: #f4f6f9;
  min-height: calc(100vh - 60px);
  -webkit-font-smoothing: antialiased;
  padding: 0 0 80px;
}
.ec-topbar {
  background: #fff; border-bottom: 1px solid #e2e6ed;
  padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 56px;
}
.ec-topbar-left { display: flex; align-items: center; gap: 10px; }
.ec-topbar-icon { width: 28px; height: 28px; border-radius: 6px; background: #1a56db; display: flex; align-items: center; justify-content: center; }
.ec-topbar-title { font-size: 13px; font-weight: 600; color: #111827; letter-spacing: -0.1px; }
.ec-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ec-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e2e6ed; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 500; color: #6b7280; background: #fff; }
.ec-chip-blue  { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
.ec-chip-green { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
.ec-sandbox-tag { background: #7c3aed; color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 3px; padding: 3px 7px; }
.ec-progress { background: #fff; border-bottom: 1px solid #e2e6ed; padding: 0 32px; display: flex; align-items: center; height: 48px; }
.ec-step-item { display: flex; align-items: center; gap: 8px; padding: 0 16px 0 0; }
.ec-step-item:first-child { padding-left: 0; }
.ec-step-num { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; transition: all 0.2s; }
.ec-step-num.done   { background: #15803d; color: #fff; }
.ec-step-num.active { background: #1a56db; color: #fff; }
.ec-step-num.idle   { background: #e5e7eb; color: #9ca3af; }
.ec-step-label { font-size: 12px; font-weight: 500; transition: color 0.2s; }
.ec-step-label.done   { color: #15803d; }
.ec-step-label.active { color: #1a56db; }
.ec-step-label.idle   { color: #9ca3af; }
.ec-step-sep { height: 1px; width: 32px; background: #e5e7eb; flex-shrink: 0; margin: 0 4px; transition: background 0.3s; }
.ec-step-sep.done { background: #15803d; }
.ec-body { max-width: 1120px; margin: 0 auto; padding: 24px 32px 0; display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.ec-body-full { max-width: 760px; margin: 0 auto; padding: 24px 32px 0; }
.ec-section { background: #fff; border: 1px solid #e2e6ed; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
.ec-section-head { padding: 12px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; background: #fafbfc; }
.ec-section-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.7px; }
.ec-section-meta  { font-size: 10px; color: #9ca3af; font-weight: 500; }
.ec-section-body  { padding: 20px; }
.ec-product-card { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-radius: 6px; cursor: pointer; border: 1.5px solid transparent; background: #f9fafb; transition: all 0.15s; margin-bottom: 6px; }
.ec-product-card:last-child { margin-bottom: 0; }
.ec-product-card:hover { background: #f3f4f6; border-color: #d1d5db; }
.ec-product-card.selected { background: #eff6ff; border-color: #3b82f6; }
.ec-product-check { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #d1d5db; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.ec-product-card.selected .ec-product-check { background: #1a56db; border-color: #1a56db; }
.ec-product-info { flex: 1; min-width: 0; }
.ec-product-name { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }

.ec-product-price { flex-shrink: 0; text-align: right; }
.ec-price-big { font-size: 16px; font-weight: 700; color: #111827; }
.ec-price-yr  { font-size: 10px; color: #9ca3af; }
.ec-type-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
.ec-dv { background: #dcfce7; color: #15803d; }
.ec-ov { background: #dbeafe; color: #1d4ed8; }
.ec-ev { background: #fef3c7; color: #b45309; }
.ec-field { margin-bottom: 14px; }
.ec-field:last-child { margin-bottom: 0; }
.ec-label { display: block; font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 5px; }
.ec-label-req { color: #ef4444; margin-left: 2px; }
.ec-input { width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #111827; background: #fff; border: 1px solid #d1d5db; border-radius: 6px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
.ec-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
.ec-input::placeholder { color: #d1d5db; }
.ec-input-domain { font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 500; padding-left: 36px; height: 42px; }
.ec-domain-wrap { position: relative; }
.ec-domain-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
.ec-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width:520px) { .ec-row2 { grid-template-columns: 1fr; } }
.ec-validity { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ec-val-opt { padding: 10px 14px; border-radius: 6px; cursor: pointer; font-family: 'DM Sans', sans-serif; text-align: left; border: 1.5px solid #e5e7eb; background: #f9fafb; transition: all 0.15s; }
.ec-val-opt:hover { border-color: #9ca3af; background: #f3f4f6; }
.ec-val-opt.sel { border-color: #1a56db; background: #eff6ff; }
.ec-val-yr { font-size: 13px; font-weight: 600; color: #111827; }
.ec-val-opt.sel .ec-val-yr { color: #1a56db; }
.ec-val-pr { font-size: 11px; color: #9ca3af; margin-top: 1px; }
.ec-val-opt.sel .ec-val-pr { color: #3b82f6; }
.ec-error { display: flex; gap: 8px; align-items: flex-start; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 13px; font-size: 12px; color: #dc2626; margin-top: 12px; }
.ec-pending { display: flex; align-items: center; gap: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
.ec-pending-info { flex: 1; min-width: 0; }
.ec-pending-title { font-size: 12px; font-weight: 600; color: #92400e; }
.ec-pending-sub   { font-size: 11px; color: #b45309; margin-top: 1px; }
.ec-summary { background: #111827; border: 1px solid #1f2937; border-radius: 8px; overflow: hidden; position: sticky; top: 20px; }
.ec-summary-head { padding: 16px 20px; border-bottom: 1px solid #1f2937; }
.ec-summary-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 10px; }
.ec-sum-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 7px; gap: 8px; }
.ec-sum-row:last-child { margin-bottom: 0; }
.ec-sum-key { color: #6b7280; flex-shrink: 0; }
.ec-sum-val { color: #e5e7eb; font-weight: 500; text-align: right; }
.ec-sum-val.green { color: #34d399; }
.ec-sum-val.blue  { color: #60a5fa; }
.ec-summary-price { padding: 16px 20px; border-bottom: 1px solid #1f2937; }
.ec-price-label { font-size: 10px; color: #6b7280; font-weight: 500; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 4px; }
.ec-price-amount { font-size: 28px; font-weight: 700; color: #f9fafb; letter-spacing: -1px; line-height: 1; }
.ec-price-note   { font-size: 10px; color: #4b5563; margin-top: 4px; }
.ec-summary-cta { padding: 16px 20px; }
.ec-btn-issue { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; background: #1a56db; color: #fff; border: none; border-radius: 6px; padding: 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.ec-btn-issue:hover:not(:disabled) { background: #1d4ed8; }
.ec-btn-issue:disabled { background: #374151; color: #6b7280; cursor: not-allowed; }
.ec-trust-list { padding: 14px 20px; display: flex; flex-direction: column; gap: 8px; }
.ec-trust-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; }
.ec-trust-item svg { flex-shrink: 0; color: #34d399; }
.ec-dv-header { background: #fff; border: 1px solid #e2e6ed; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 14px; }
.ec-dv-icon-wrap { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; background: #fef3c7; border: 1px solid #fde68a; display: flex; align-items: center; justify-content: center; }
.ec-dv-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 3px; }
.ec-dv-sub   { font-size: 12px; color: #6b7280; line-height: 1.5; }
.ec-order-badge { flex-shrink: 0; margin-left: auto; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #374151; font-family: 'DM Mono', monospace; }
.ec-dns-panel { background: #fff; border: 1px solid #e2e6ed; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.ec-dns-panel-head { background: #111827; padding: 10px 16px; display: flex; align-items: center; gap: 6px; }
.ec-dns-dot { width: 10px; height: 10px; border-radius: 50%; }
.ec-dns-panel-name { font-size: 11px; color: #9ca3af; font-family: 'DM Mono', monospace; margin-left: 4px; }
.ec-dns-table { width: 100%; border-collapse: collapse; }
.ec-dns-tr { border-bottom: 1px solid #f3f4f6; }
.ec-dns-tr:last-child { border-bottom: none; }
.ec-dns-key { padding: 11px 16px; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; width: 80px; vertical-align: middle; }
.ec-dns-val { padding: 11px 16px 11px 0; font-size: 12px; color: #111827; font-family: 'DM Mono', monospace; vertical-align: middle; }
.ec-dns-val.green { color: #15803d; font-weight: 600; }
.ec-dns-val.dim   { color: #9ca3af; display: flex; align-items: center; gap: 6px; }
.ec-dns-copy { padding: 11px 16px 11px 0; text-align: right; vertical-align: middle; }
.ec-feedback { display: flex; gap: 8px; align-items: flex-start; border-radius: 0; padding: 10px 16px; font-size: 12px; margin: 0; border-top: 1px solid transparent; }
.ec-feedback.ok   { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.ec-feedback.err  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.ec-feedback.warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.ec-dv-actions { padding: 14px 20px; display: flex; align-items: center; gap: 8px; border-top: 1px solid #f3f4f6; flex-wrap: wrap; }
.ec-btn-primary   { display: inline-flex; align-items: center; gap: 6px; background: #15803d; color: #fff; border: none; border-radius: 6px; padding: 9px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.ec-btn-primary:hover:not(:disabled) { background: #166534; }
.ec-btn-primary:disabled { background: #d1d5db; color: #9ca3af; cursor: not-allowed; }
.ec-btn-secondary { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; padding: 9px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.ec-btn-secondary:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
.ec-btn-secondary:disabled { color: #d1d5db; cursor: not-allowed; }
.ec-btn-ghost { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: #9ca3af; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; padding: 9px 4px; transition: color 0.15s; }
.ec-btn-ghost:hover { color: #6b7280; }
.ec-auto-note { display: flex; gap: 10px; align-items: flex-start; background: #fff; border: 1px solid #e2e6ed; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #6b7280; line-height: 1.5; }
.ec-done { background: #fff; border: 1px solid #e2e6ed; border-radius: 8px; padding: 48px 32px; text-align: center; }
.ec-done-ring { width: 64px; height: 64px; border-radius: 50%; background: #f0fdf4; border: 2px solid #bbf7d0; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.ec-done-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 6px; letter-spacing: -0.3px; }
.ec-done-sub   { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
.ec-done-actions { display: flex; flex-direction: column; gap: 8px; max-width: 300px; margin: 0 auto; }
.ec-btn-done-primary { display: flex; align-items: center; justify-content: center; gap: 7px; background: #111827; color: #fff; border: none; border-radius: 6px; padding: 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.ec-btn-done-primary:hover { background: #1f2937; }
.ec-done-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ec-copy { display: inline-flex; align-items: center; gap: 4px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 500; color: #6b7280; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; white-space: nowrap; }
.ec-copy:hover { background: #e5e7eb; color: #374151; }
.ec-copy.copied { background: #dcfce7; border-color: #bbf7d0; color: #15803d; }
@keyframes ec-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
.ec-spin { animation: ec-spin 0.8s linear infinite; }
@keyframes ec-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ec-pulse { animation: ec-pulse 1.4s ease-in-out infinite; }
@keyframes ec-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.ec-enter { animation: ec-fadein 0.25s ease; }
`

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button className={`ec-copy${copied ? ' copied' : ''}`} onClick={copy}>
      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  )
}

function ProgressBar({ current }) {
  const steps = [{ id:'form', label:'Configure' }, { id:'dv', label:'Validate' }, { id:'done', label:'Done' }]
  const idx = steps.findIndex(s => s.id === current)
  return (
    <div className="ec-progress">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'idle'
        return (
          <div key={s.id} style={{ display:'flex', alignItems:'center' }}>
            <div className="ec-step-item">
              <div className={`ec-step-num ${state}`}>{state === 'done' ? <Check size={10}/> : i + 1}</div>
              <span className={`ec-step-label ${state}`}>{s.label}</span>
            </div>
            {i < 2 && <div className={`ec-step-sep ${i < idx ? 'done' : ''}`}/>}
          </div>
        )
      })}
    </div>
  )
}

const clean = v => v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

export default function BuyCertificate({ nav, onDashboard, onIssueAnother }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep]       = useState('form')
  const [product, setProduct] = useState('rapidssl')
  const [domain, setD]        = useState('')
  const [years, setYears]     = useState(1)
  const [fn, setFn]           = useState('')
  const [ln, setLn]           = useState('')
  const [ph, setPh]           = useState('')
  const [em, setEm]           = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [ord, setOrd]         = useState(null)
  const [chk, setChk]         = useState(false)
  const [dns, setDns]         = useState(false)
  const [res, setRes]         = useState(null)
  const [polling, setPoll]    = useState(false)
  const [pending, setPend]    = useState(null)

  useEffect(() => {
    const p = sessionStorage.getItem('prefill_domain')
    if (p) { setD(p); sessionStorage.removeItem('prefill_domain') }
  }, [])
  useEffect(() => { if (user) setEm(e => e || user.email || '') }, [user])
  useEffect(() => {
    if (!user) return
    supabase.from('tss_orders').select('id,domain,tss_order_id,dv_cname_host,dv_cname_value')
      .eq('user_id', user.id).eq('status', 'dv_pending')
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.length) setPend(data[0]) })
  }, [user])

  useEffect(() => {
    if (step !== 'dv' || !ord?.order_id || ord?.txt_value) return
    setPoll(true); let n = 0
    const iv = setInterval(async () => {
      n++
      try {
        const s = await call('check_status', { order_id: ord.order_id })
        if (s.txt_value) { setOrd(p => ({...p, txt_name: s.txt_name, txt_value: s.txt_value})); setPoll(false); clearInterval(iv) }
        if (s.status === 'active') { setStep('done'); setPoll(false); clearInterval(iv) }
      } catch(e) {}
      if (n >= 24) { setPoll(false); clearInterval(iv) }
    }, 5000)
    return () => { clearInterval(iv); setPoll(false) }
  }, [step, ord?.order_id])

  const call = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`${URL}/functions/v1/tss-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, ...extra }),
    })
    return r.json()
  }

  const place = async () => {
    const d = clean(domain)
    if (!d)         { setErr('Enter a domain name'); return }
    if (!fn.trim()) { setErr('First name required'); return }
    if (!ln.trim()) { setErr('Last name required'); return }
    if (!em.trim()) { setErr('Email required'); return }
    if (!ph.trim()) { setErr('Phone required'); return }
    setErr(''); setBusy(true)
    const r = await call('place_order', { domain: d, years, product_code: product, firstName: fn.trim(), lastName: ln.trim(), adminEmail: em.trim(), phone: ph.trim(), is_sandbox: IS_SANDBOX })
    if (r.error) { setErr(r.error); setBusy(false); return }
    let dv = r
    if (r.order_id) {
      for (let i = 0; i < 5; i++) {
        await new Promise(x => setTimeout(x, 3000))
        const s = await call('check_status', { order_id: r.order_id })
        const hasValue = s.txt_value || s.cname_value
        if (hasValue) { dv = {...r, ...s}; break }
      }
    }
    setBusy(false); setOrd(dv); setStep('dv')
  }

  const check = async () => {
    setChk(true); setRes(null)
    const r = await call('check_status', { order_id: ord.order_id })
    setChk(false); setRes(r)
    if (r.status === 'active') setStep('done')
  }

  const addDns = async () => {
    setDns(true); setRes(null)
    try { const r = await call('retry_dns', { order_id: ord.order_id }); setRes({ dns_auto: r }) }
    catch(e) { setRes({ dns_auto: { ok: false, message: String(e) } }) }
    setDns(false)
  }

  const reset = () => { setStep('form'); setD(''); setOrd(null); setRes(null); setPend(null); setErr(''); setProduct('rapidssl') }
  const resume = () => {
    const o = pending
    setD(o.domain)
    const isCname = o.dv_type === 'CNAME'
    setOrd({
      order_id: o.id, tss_order_id: o.tss_order_id,
      dv_type: o.dv_type || 'TXT',
      txt_name: isCname ? undefined : (o.dv_cname_host || o.domain),
      txt_value: isCname ? undefined : (o.dv_cname_value || ''),
      cname_name: isCname ? o.dv_cname_host : undefined,
      cname_value: isCname ? o.dv_cname_value : undefined,
    })
    setPend(null); setStep('dv')
  }

  if (authLoading) return null
  if (!user) return (
    <>
      <style>{STYLES}</style>
      <div className="ec-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
        <div className="ec-enter" style={{ textAlign:'center', padding:32, maxWidth:320 }}>
          <div style={{ width:52, height:52, background:'#1a56db', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Shield size={24} color="white"/>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#111827', letterSpacing:'-0.3px', marginBottom:8 }}>Sign in to continue</div>
          <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, marginBottom:24 }}>SSLVault manages your certificates, auto-renewal, and server deployment.</div>
          <button className="ec-btn-issue" style={{ borderRadius:6 }} onClick={() => nav('/auth')}>
            <Lock size={14}/> Sign in to SSLVault
          </button>
        </div>
      </div>
    </>
  )

  const prod = PRODUCTS.find(p => p.code === product) || PRODUCTS[0]
  const price = years === 1 ? 19 : 34

  return (
    <>
      <style>{STYLES}</style>
      <div className="ec-root">

        {/* TOP BAR */}
        <div className="ec-topbar">
          <div className="ec-topbar-left">
            <div className="ec-topbar-icon"><Shield size={14} color="white"/></div>
            <span className="ec-topbar-title">Issue SSL Certificate</span>
          </div>
          <div className="ec-topbar-right">
            <span className="ec-chip ec-chip-green"><CheckCircle size={10}/> DigiCert chain</span>
            <span className="ec-chip"><Clock size={10}/> ~5 min issuance</span>
            <span className="ec-chip"><RotateCcw size={10}/> Auto-renewal</span>
            <span className="ec-chip"><ShieldCheck size={10}/> 99.9% browser trust</span>
            {IS_SANDBOX && <span className="ec-sandbox-tag">Sandbox</span>}
          </div>
        </div>

        {/* PROGRESS */}
        <ProgressBar current={step}/>

        {/* FORM STEP */}
        {step === 'form' && (
          <div className="ec-body ec-enter">
            <div>
              {pending && (
                <div className="ec-pending">
                  <div className="ec-pending-info">
                    <div className="ec-pending-title">Pending order — <span style={{ fontFamily:'DM Mono,monospace' }}>{pending.domain}</span></div>
                    <div className="ec-pending-sub">DNS validation in progress · #{pending.tss_order_id}</div>
                  </div>
                  <button className="ec-btn-primary" style={{ padding:'7px 12px', fontSize:11 }} onClick={resume}>Resume <ArrowRight size={11}/></button>
                  <button onClick={() => setPend(null)} style={{ background:'none', border:'none', color:'#b45309', cursor:'pointer', fontSize:18, padding:'0 2px', lineHeight:1 }}>×</button>
                </div>
              )}

              <div className="ec-section">
                <div className="ec-section-head">
                  <span className="ec-section-title">Certificate Type</span>
                  {IS_SANDBOX && <span className="ec-section-meta">Sandbox · All products available</span>}
                </div>
                <div className="ec-section-body">
                  {PRODUCTS.map(p => (
                    <div key={p.code}
                      className={`ec-product-card${product === p.code ? ' selected' : ''}`}
                      onClick={() => p.available && setProduct(p.code)}
                      style={{ cursor: p.available ? 'pointer' : 'not-allowed', opacity: p.available ? 1 : 0.5 }}>
                      <div className="ec-product-check">
                        {product === p.code && <Check size={9} color="white"/>}
                      </div>
                      <div className="ec-product-info">
                        <div className="ec-product-name">
                          {p.name}
                          <span className={`ec-type-badge ec-${p.type.toLowerCase()}`}>{p.type}</span>
                          {!p.available && <span className="ec-type-badge" style={{ background:'#f3f4f6', color:'#9ca3af' }}>Soon</span>}
                        </div>

                      </div>
                      <div className="ec-product-price">
                        <div className="ec-price-big">€{p.price}</div>
                        <div className="ec-price-yr">/year</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ec-section">
                <div className="ec-section-head">
                  <span className="ec-section-title">Domain Name</span>
                </div>
                <div className="ec-section-body">
                  <div className="ec-field">
                    <label className="ec-label">Common Name (CN) <span className="ec-label-req">*</span></label>
                    <div className="ec-domain-wrap">
                      <Globe size={14} className="ec-domain-icon"/>
                      <input className="ec-input ec-input-domain" placeholder="yourdomain.com"
                        value={domain} onChange={e => setD(e.target.value)}/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ec-section">
                <div className="ec-section-head">
                  <span className="ec-section-title">Requester Details</span>
                  <span className="ec-section-meta">Required by TheSSLStore</span>
                </div>
                <div className="ec-section-body">
                  <div className="ec-row2">
                    <div className="ec-field">
                      <label className="ec-label">First Name <span className="ec-label-req">*</span></label>
                      <input className="ec-input" placeholder="John" value={fn} onChange={e => setFn(e.target.value)}/>
                    </div>
                    <div className="ec-field">
                      <label className="ec-label">Last Name <span className="ec-label-req">*</span></label>
                      <input className="ec-input" placeholder="Smith" value={ln} onChange={e => setLn(e.target.value)}/>
                    </div>
                  </div>
                  <div className="ec-field">
                    <label className="ec-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span>Email Address <span className="ec-label-req">*</span></span>
                      <span style={{ fontSize:10, color:'#9ca3af', fontWeight:400 }}>Certificate delivery</span>
                    </label>
                    <input className="ec-input" type="email" placeholder="you@example.com" value={em} onChange={e => setEm(e.target.value)}/>
                  </div>
                  <div className="ec-field">
                    <label className="ec-label">Phone <span className="ec-label-req">*</span></label>
                    <input className="ec-input" placeholder="+1 415 555 0100" value={ph} onChange={e => setPh(e.target.value)}/>
                  </div>
                  <div className="ec-field">
                    <label className="ec-label">Validity Period</label>
                    <div className="ec-validity">
                      {[{y:1,p:19},{y:2,p:34}].map(({y,p}) => (
                        <button key={y} className={`ec-val-opt${years===y?' sel':''}`} onClick={() => setYears(y)}>
                          <div className="ec-val-yr">{y} year{y>1?'s':''}</div>
                          <div className="ec-val-pr">€{p} / year</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {err && <div className="ec-error"><AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{err}</div>}
            </div>

            {/* SUMMARY */}
            <div>
              <div className="ec-summary">
                <div className="ec-summary-head">
                  <div className="ec-summary-title">Order Summary</div>
                  <div className="ec-sum-row"><span className="ec-sum-key">Certificate</span><span className="ec-sum-val">{prod.name}</span></div>
                  <div className="ec-sum-row"><span className="ec-sum-key">Type</span><span className="ec-sum-val">{prod.type}</span></div>
                  <div className="ec-sum-row"><span className="ec-sum-key">Validity</span><span className="ec-sum-val">{years} year{years>1?'s':''}</span></div>
                  <div className="ec-sum-row"><span className="ec-sum-key">Auto-renewal</span><span className="ec-sum-val green">Included</span></div>
                  <div className="ec-sum-row"><span className="ec-sum-key">{prod.name}</span><span className="ec-sum-val">€{prod.price}</span></div>
                  <div className="ec-sum-row"><span className="ec-sum-key">CLM management</span><span className="ec-sum-val blue">Free</span></div>
                </div>
                <div className="ec-summary-price">
                  <div className="ec-price-label">Total today</div>
                  <div className="ec-price-amount">€{price}</div>
                  <div className="ec-price-note">{IS_SANDBOX ? 'Demo mode · no payment required' : 'Billed immediately'}</div>
                </div>
                <div className="ec-summary-cta">
                  <button className="ec-btn-issue" onClick={place} disabled={busy}>
                    {busy
                      ? <><RefreshCw size={14} className="ec-spin"/> Placing order…</>
                      : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
                  </button>
                </div>
                <div className="ec-trust-list">
                  <div className="ec-trust-item"><Lock size={11}/> DigiCert trust chain</div>
                  <div className="ec-trust-item"><Zap size={11}/> Auto-renews before expiry</div>
                  <div className="ec-trust-item"><Globe size={11}/> 99.9% browser compatibility</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DV STEP */}
        {step === 'dv' && ord && (
          <div className="ec-body-full ec-enter">
            <div className="ec-dv-header">
              <div className="ec-dv-icon-wrap"><Globe size={17} color="#d97706"/></div>
              <div style={{ flex:1 }}>
                <div className="ec-dv-title">Verify Domain Ownership</div>
                <div className="ec-dv-sub">
                  Add this <strong>{ord.dv_type === 'CNAME' ? 'CNAME' : 'TXT'} record</strong> to prove you control{' '}
                  <strong style={{ fontFamily:'DM Mono,monospace', color:'#111827' }}>{domain || ord.txt_name}</strong>
                </div>
              </div>
              <div className="ec-order-badge">#{ord.tss_order_id || '—'}</div>
            </div>

            <div className="ec-dns-panel">
              <div className="ec-dns-panel-head">
                <span className="ec-dns-dot" style={{ background:'#ff5f56' }}/>
                <span className="ec-dns-dot" style={{ background:'#ffbd2e' }}/>
                <span className="ec-dns-dot" style={{ background:'#27c93f' }}/>
                <span className="ec-dns-panel-name">DNS {ord.dv_type === 'CNAME' ? 'CNAME' : 'TXT'} · {domain || ord.txt_name}</span>
              </div>
              <table className="ec-dns-table">
                {(ord.dv_type === 'CNAME' ? [
                  { k:'Name',  v: ord.cname_name || ord.txt_name || domain, copy:true },
                  { k:'Type',  v: 'CNAME', green:true },
                  { k:'Value', v: ord.cname_value || ord.txt_value || null, copy:true, loading:!(ord.cname_value||ord.txt_value) },
                  { k:'TTL',   v: '300' },
                ] : [
                  { k:'Name',  v: ord.txt_name || domain, copy:true },
                  { k:'Type',  v: 'TXT', green:true },
                  { k:'Value', v: ord.txt_value || null, copy:true, loading:!ord.txt_value },
                  { k:'TTL',   v: '300' },
                ]).map(({ k, v, copy, green, loading }) => (
                  <tr className="ec-dns-tr" key={k}>
                    <td className="ec-dns-key">{k}</td>
                    <td className={`ec-dns-val${green ? ' green' : loading ? ' dim' : ''}`}>
                      {loading
                        ? <><RefreshCw size={11} className="ec-pulse" style={{ flexShrink:0 }}/><span>{polling ? 'Fetching from TSS…' : 'Click Auto-Add DNS'}</span></>
                        : v}
                    </td>
                    <td className="ec-dns-copy">{copy && v && !loading && <CopyBtn text={v}/>}</td>
                  </tr>
                ))}
              </table>

              {res?.dns_auto && (
                <div className={`ec-feedback ${res.dns_auto.ok ? 'ok' : 'err'}`}>
                  {res.dns_auto.ok
                    ? <><Check size={13} style={{ flexShrink:0 }}/>{ord.dv_type === 'CNAME' ? 'CNAME' : 'TXT'} record added via {res.dns_auto.provider} — wait 1–2 min then click Check Status.</>
                    : <><AlertTriangle size={13} style={{ flexShrink:0 }}/>{res.dns_auto.message}</>}
                </div>
              )}
              {res && res.status !== 'active' && !res.dns_auto && (
                <div className="ec-feedback warn">
                  <AlertTriangle size={13} style={{ flexShrink:0 }}/>
                  Not validated yet ({res.major_status}) — wait a few minutes and retry.
                </div>
              )}

              <div className="ec-dv-actions">
                <button className="ec-btn-primary" onClick={addDns} disabled={dns || !ord.txt_value}>
                  {dns ? <><RefreshCw size={13} className="ec-spin"/> Adding…</> : <><Zap size={13}/> Auto-Add DNS</>}
                </button>
                <button className="ec-btn-secondary" onClick={check} disabled={chk}>
                  {chk ? <><RefreshCw size={13} className="ec-spin"/> Checking…</> : <><RefreshCw size={13}/> Check Status</>}
                </button>
                <button className="ec-btn-ghost" onClick={reset}>← New order</button>
              </div>
            </div>

            <div className="ec-auto-note">
              <Zap size={14} color="#10b981" style={{ flexShrink:0, marginTop:1 }}/>
              <span><strong style={{ color:'#111827' }}>Fully automatic:</strong> SSLVault polls TheSSLStore every 5 minutes. Once your DNS propagates, the certificate activates with no action needed.</span>
            </div>
          </div>
        )}

        {/* DONE STEP */}
        {step === 'done' && (
          <div className="ec-body-full ec-enter">
            <div className="ec-done">
              <div className="ec-done-ring"><CheckCircle size={32} color="#15803d" strokeWidth={2}/></div>
              <div className="ec-done-title">Certificate Issued</div>
              <div className="ec-done-sub">
                <strong style={{ fontFamily:'DM Mono,monospace', color:'#111827' }}>{clean(domain)}</strong>
                {' '}is now secured · Auto-renewal active
              </div>
              <div className="ec-done-actions">
                <button className="ec-btn-done-primary"
                  onClick={() => { sessionStorage.setItem('install_domain', clean(domain)); if (onDashboard) onDashboard(); else nav('/dashboard') }}>
                  <Server size={15}/> Install on Server
                </button>
                <div className="ec-done-row2">
                  <button className="ec-btn-secondary" onClick={() => { if (onDashboard) onDashboard(); else nav('/dashboard') }}>View Dashboard</button>
                  <button className="ec-btn-secondary" onClick={() => { if (onIssueAnother) { reset(); onIssueAnother() } else reset() }}>Issue Another</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
