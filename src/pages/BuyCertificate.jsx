import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, ChevronRight, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX = true

const STYLES = `
.ic-root {
  font-family: system-ui,-apple-system,'Segoe UI',sans-serif;
  background: #fafafa;
  min-height: calc(100vh - 100px);
  -webkit-font-smoothing: antialiased;
  padding: 20px 24px 60px;
}
.ic-header {
  background: white; border: 0.5px solid #e8edf2; border-radius: 8px;
  padding: 16px 20px; margin-bottom: 10px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}
.ic-header-left { display: flex; align-items: center; gap: 14px; }
.ic-logo {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  background: #f0fdf4; border: 0.5px solid #bbf7d0;
  display: flex; align-items: center; justify-content: center;
}
.ic-hero-title { font-size: 15px; font-weight: 500; color: #0a0a0a; letter-spacing: -0.2px; }
.ic-hero-sub { font-size: 11px; color: #a3a3a3; margin-top: 3px; }
.ic-hero-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.ic-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: #fafafa; border: 0.5px solid #e8edf2;
  border-radius: 100px; padding: 3px 9px;
  font-size: 10px; font-weight: 500; color: #525252;
}
.ic-badge-green { color: #047857; background: #f0fdf4; border-color: #bbf7d0; }
.ic-sandbox-pill {
  flex-shrink: 0; background: #f5f3ff; border: 0.5px solid #ddd6fe;
  color: #6d28d9; font-size: 9px; font-weight: 500; letter-spacing: 0.4px;
  text-transform: uppercase; border-radius: 4px; padding: 3px 8px;
}
.ic-steps {
  display: flex; align-items: center;
  background: white; border: 0.5px solid #e8edf2; border-radius: 8px;
  padding: 12px 20px; margin-bottom: 12px;
}
.ic-step { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ic-step-circle {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 500; transition: all 0.3s;
}
.ic-step-circle.done   { background: #10b981; color: white; }
.ic-step-circle.active { background: #0a0a0a; color: white; }
.ic-step-circle.future { background: #f1f5f9; color: #94a3b8; border: 0.5px solid #e2e8f0; }
.ic-step-text { font-size: 12px; font-weight: 500; transition: color 0.3s; }
.ic-step-text.done   { color: #10b981; }
.ic-step-text.active { color: #0a0a0a; }
.ic-step-text.future { color: #d4d4d4; }
.ic-step-line { flex: 1; height: 0.5px; margin: 0 14px; min-width: 20px; transition: background 0.4s; }
.ic-step-line.done   { background: #10b981; }
.ic-step-line.future { background: #e8edf2; }
.ic-body { display: grid; grid-template-columns: 1fr 300px; gap: 12px; align-items: start; }
.ic-body-full { max-width: 680px; }

/* ─── PENDING BANNER ───────────────────────────────────── */
.ic-pending {
  display: flex; align-items: center; gap: 10;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;
  padding: 12px 14px; margin-bottom: 18px;
  animation: ic-slidein 0.3s ease;
}
.ic-pending-text { flex: 1; min-width: 0; }
.ic-pending-title { font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 2px; }
.ic-pending-sub   { font-size: 11px; color: #b45309; }

/* ─── STAT TILES ───────────────────────────────────────── */
.ic-stats {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 18px;
}
.ic-stat {
  background: white; border: 1px solid #e8edf2; border-radius: 10px;
  padding: 14px 12px; text-align: center; cursor: default;
  transition: transform 0.2s, box-shadow 0.2s;
}
.ic-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
.ic-stat-v { font-size: 17px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.5px; }
.ic-stat-l { font-size: 10px; color: #94a3b8; margin-top: 3px; font-weight: 500; letter-spacing: 0.1px; }

/* ─── DOMAIN FIELD ─────────────────────────────────────── */
.ic-domain { margin-bottom: 16px; }
.ic-domain-label {
  display: block; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.6px;
  color: #64748b; margin-bottom: 7px;
}
.ic-domain-wrap { position: relative; }
.ic-domain-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
.ic-domain-input {
  width: 100%; height: 52px; box-sizing: border-box;
  padding: 0 14px 0 38px;
  font-size: 16px; font-weight: 700;
  font-family: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: -0.3px; color: #0a0a0a;
  background: white; border: 2px solid #e2e8f0;
  border-radius: 12px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ic-domain-input:focus {
  border-color: #0a0a0a;
  box-shadow: 0 0 0 4px rgba(10,10,10,0.06);
}
.ic-domain-input::placeholder { color: #c8d3e0; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 400; }

/* ─── CARD ─────────────────────────────────────────────── */
.ic-card {
  background: white; border: 1px solid #e8edf2; border-radius: 14px;
  overflow: hidden; margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
}
.ic-card-head {
  padding: 12px 16px; background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; justify-content: space-between;
}
.ic-section-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.6px;
}
.ic-card-body { padding: 16px; }

/* ─── FORM INPUTS ──────────────────────────────────────── */
.ic-field { margin-bottom: 12px; }
.ic-field:last-child { margin-bottom: 0; }
.ic-label {
  display: block; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.4px;
  color: #64748b; margin-bottom: 5px;
}
.ic-input {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px; font-size: 13px; font-weight: 500;
  font-family: 'Inter', sans-serif; color: #0a0a0a;
  background: white; border: 1.5px solid #e2e8f0;
  border-radius: 9px; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ic-input:focus { border-color: #0a0a0a; box-shadow: 0 0 0 3px rgba(10,10,10,0.06); }
.ic-input::placeholder { color: #c8d3e0; font-weight: 400; }
.ic-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 440px) { .ic-row2 { grid-template-columns: 1fr; } }

/* ─── VALIDITY TOGGLE ──────────────────────────────────── */
.ic-validity { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ic-val-btn {
  padding: 12px 14px; border-radius: 10px; cursor: pointer;
  font-family: 'Inter', sans-serif; text-align: left;
  border: 2px solid #e2e8f0; background: white;
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
}
.ic-val-btn:hover { border-color: #94a3b8; }
.ic-val-btn.sel {
  border-color: #0a0a0a; background: #0a0a0a;
  box-shadow: 0 4px 14px rgba(0,0,0,0.22);
  transform: translateY(-1px);
}
.ic-val-yr { font-size: 14px; font-weight: 700; }
.ic-val-btn:not(.sel) .ic-val-yr { color: #0a0a0a; }
.ic-val-btn.sel .ic-val-yr { color: white; }
.ic-val-pr { font-size: 11px; margin-top: 2px; }
.ic-val-btn:not(.sel) .ic-val-pr { color: #94a3b8; }
.ic-val-btn.sel .ic-val-pr { color: rgba(255,255,255,0.5); }

/* ─── ORDER SUMMARY ────────────────────────────────────── */
.ic-summary {
  background: white; border: 1px solid #e8edf2; border-radius: 14px;
  overflow: hidden; margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.ic-summary-rows { padding: 14px 16px; }
.ic-sum-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: #64748b; margin-bottom: 6px;
}
.ic-sum-row:last-child { margin-bottom: 0; }
.ic-sum-row.em { color: #10b981; font-weight: 600; }
.ic-sum-foot {
  border-top: 1px solid #f1f5f9; padding: 14px 16px;
  background: #fafbfc;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.ic-price-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; }
.ic-price-val { font-size: 26px; font-weight: 900; color: #0a0a0a; letter-spacing: -0.8px; line-height: 1; }
.ic-price-note { font-size: 9px; color: #c8d3e0; margin-top: 3px; }

/* ─── BUTTONS ──────────────────────────────────────────── */
.ic-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: 'Inter', sans-serif; font-weight: 700; cursor: pointer;
  border: none; border-radius: 10px; white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
}
.ic-btn-primary {
  background: #0a0a0a; color: white; font-size: 14px;
  padding: 14px 22px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15);
}
.ic-btn-primary:hover { background: #1a1a1a; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.18); }
.ic-btn-primary:active { transform: translateY(0); }
.ic-btn-primary:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
.ic-btn-green {
  background: #10b981; color: white; font-size: 13px; padding: 11px 18px;
  box-shadow: 0 2px 8px rgba(16,185,129,0.4);
}
.ic-btn-green:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,185,129,0.45); }
.ic-btn-green:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
.ic-btn-outline {
  background: white; color: #374151; font-size: 13px; padding: 11px 18px;
  border: 1.5px solid #e2e8f0;
}
.ic-btn-outline:hover { background: #f8fafc; border-color: #c8d3e0; }
.ic-btn-ghost {
  background: transparent; color: #94a3b8; font-size: 12px; padding: 10px;
  border: none;
}
.ic-btn-ghost:hover { color: #64748b; }

/* ─── TRUST STRIP ──────────────────────────────────────── */
.ic-trust {
  display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin-top: 18px;
}
.ic-trust-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #94a3b8; }

/* ─── ERROR ────────────────────────────────────────────── */
.ic-error {
  display: flex; gap: 8px; align-items: flex-start;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 10px; padding: 11px 13px;
  font-size: 12px; color: #dc2626; margin-top: 12px;
  animation: ic-fadein 0.2s ease;
}

/* ─── DV SCREEN ────────────────────────────────────────── */
.ic-dv-head {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, #fffbeb, #fefce8);
  border-bottom: 1px solid #fde68a; padding: 16px;
}
.ic-dv-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #fef3c7; border: 1px solid #fde68a;
  display: flex; align-items: center; justify-content: center;
}
.ic-dv-title { font-size: 14px; font-weight: 700; color: #92400e; }
.ic-dv-sub   { font-size: 11px; color: #b45309; margin-top: 2px; line-height: 1.5; }
.ic-order-no {
  margin-left: auto; flex-shrink: 0;
  font-size: 10px; color: #b45309; background: #fef3c7;
  border: 1px solid #fde68a; border-radius: 5px; padding: 3px 8px; font-weight: 600;
}

/* ─── TERMINAL ─────────────────────────────────────────── */
.ic-terminal {
  background: #0d1117; margin: 14px 16px; border-radius: 10px;
  overflow: hidden; border: 1px solid #21262d;
}
.ic-term-head {
  background: #161b22; border-bottom: 1px solid #21262d;
  padding: 9px 13px; display: flex; align-items: center; gap: 5px;
}
.ic-dot { width: 10px; height: 10px; border-radius: 50%; }
.ic-term-name { font-size: 10px; color: #484f58; font-family: monospace; margin-left: 5px; }
.ic-dns-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 13px; border-bottom: 1px solid #161b22;
}
.ic-dns-key { font-size: 9px; color: #484f58; width: 38px; flex-shrink: 0; font-family: monospace; text-transform: uppercase; letter-spacing: 0.5px; }
.ic-dns-val { flex: 1; font-size: 11px; font-family: 'SF Mono', monospace; color: #c9d1d9; word-break: break-all; display: flex; align-items: center; gap: 7px; line-height: 1.6; }
.ic-dns-val.green { color: #3fb950; }
.ic-dns-val.dim   { color: #484f58; }
.ic-copy {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #6b7280; border-radius: 5px; padding: 3px 8px;
  font-size: 10px; cursor: pointer; font-family: 'Inter',sans-serif;
  transition: all 0.15s;
}
.ic-copy.ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }

/* ─── FEEDBACK ─────────────────────────────────────────── */
.ic-feedback {
  margin: 0 16px 12px; border-radius: 9px;
  padding: 10px 13px; font-size: 12px;
  display: flex; gap: 8px; align-items: flex-start;
  animation: ic-fadein 0.2s ease;
}
.ic-feedback.ok   { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.ic-feedback.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.ic-feedback.err  { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }

/* ─── DV ACTIONS ───────────────────────────────────────── */
.ic-dv-actions { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 16px 16px; align-items: center; }
.ic-auto-note {
  background: white; border: 1px solid #e8edf2; border-radius: 10px;
  padding: 12px 14px; font-size: 12px; color: #64748b; line-height: 1.7;
  display: flex; gap: 9px; align-items: flex-start;
}

/* ─── DONE ─────────────────────────────────────────────── */
.ic-done-head {
  background: linear-gradient(160deg, #ecfdf5, #f0fdf4);
  border-bottom: 1px solid #bbf7d0; padding: 40px 24px;
  text-align: center;
}
.ic-done-ring {
  width: 76px; height: 76px; border-radius: 50%; margin: 0 auto 20px;
  background: linear-gradient(135deg, #d1fae5, #bbf7d0);
  border: 3px solid #6ee7b7; position: relative;
  display: flex; align-items: center; justify-content: center;
  animation: ic-popin 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ic-done-ring::after {
  content: ''; position: absolute; inset: -12px; border-radius: 50%;
  background: radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%);
  animation: ic-breathe 2.5s ease-in-out infinite;
}
.ic-done-title { font-size: 22px; font-weight: 900; color: #0a0a0a; letter-spacing: -0.6px; margin-bottom: 6px; }
.ic-done-sub   { font-size: 13px; color: #64748b; line-height: 1.6; }
.ic-done-body  { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ic-btn-full   { width: 100%; }
.ic-row2-btn   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* ─── ANIMATIONS ───────────────────────────────────────── */
@keyframes ic-slidein  { from { opacity:0; transform: translateY(-10px); } to { opacity:1; transform: translateY(0); } }
@keyframes ic-fadein   { from { opacity:0; } to { opacity:1; } }
@keyframes ic-popin    { 0% { transform: scale(0.5); opacity:0; } 100% { transform: scale(1); opacity:1; } }
@keyframes ic-breathe  { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
@keyframes ic-spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ic-pulse    { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
.ic-spin    { animation: ic-spin 0.8s linear infinite; }
.ic-pulse   { animation: ic-pulse 1.4s ease-in-out infinite; }
.ic-enter   { animation: ic-slidein 0.32s cubic-bezier(0.4,0,0.2,1); }
.ic-fade    { animation: ic-fadein 0.35s ease; }

/* ─── MOBILE ───────────────────────────────────────────── */
@media (max-width: 460px) {
  .ic-row2 { grid-template-columns: 1fr; }
  .ic-row2-btn { grid-template-columns: 1fr; }
  .ic-sum-foot { flex-direction: column; align-items: stretch; }
  .ic-btn-primary { width: 100%; font-size: 15px; padding: 14px; }
  .ic-hero-badges { display: none; }
  .ic-stats { gap: 6px; }
  .ic-stat-v { font-size: 15px; }
  .ic-steps { padding: 0 12px; }
  .ic-step-text { font-size: 11px; }
}
`

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button className={`ic-copy${ok ? ' ok' : ''}`}
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}>
      {ok ? <><Check size={9}/> Copied</> : <><Copy size={9}/> Copy</>}
    </button>
  )
}

function StepBar({ current }) {
  const i = { form: 0, dv: 1, done: 2 }[current] ?? 0
  const steps = ['Configure', 'Validate', 'Done']
  return (
    <div className="ic-steps">
      {steps.map((s, n) => {
        const done = n < i, active = n === i
        const state = done ? 'done' : active ? 'active' : 'future'
        return (
          <div key={s} style={{ display:'flex', alignItems:'center', flex: n < 2 ? 1 : 'none' }}>
            <div className="ic-step">
              <div className={`ic-step-circle ${state}`}>
                {done ? <Check size={11} strokeWidth={3}/> : n + 1}
              </div>
              <span className={`ic-step-text ${state}`}>{s}</span>
            </div>
            {n < 2 && <div className={`ic-step-line ${n < i ? 'done' : 'future'}`}/>}
          </div>
        )
      })}
    </div>
  )
}

const clean = v => v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep]   = useState('form')
  const [domain, setD]    = useState('')
  const [years, setYears] = useState(1)
  const [fn, setFn]       = useState('')
  const [ln, setLn]       = useState('')
  const [ph, setPh]       = useState('')
  const [em, setEm]       = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')
  const [ord, setOrd]     = useState(null)
  const [chk, setChk]     = useState(false)
  const [dns, setDns]     = useState(false)
  const [res, setRes]     = useState(null)
  const [polling, setPoll]= useState(false)
  const [pending, setPend]= useState(null)

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
    if (!d)     { setErr('Enter a domain name'); return }
    if (!fn.trim()) { setErr('First name required'); return }
    if (!ln.trim()) { setErr('Last name required'); return }
    if (!em.trim()) { setErr('Email required'); return }
    if (!ph.trim()) { setErr('Phone required'); return }
    setErr(''); setBusy(true)
    const r = await call('place_order', { domain: d, years, product_code: 'rapidssl', firstName: fn.trim(), lastName: ln.trim(), adminEmail: em.trim(), phone: ph.trim(), is_sandbox: IS_SANDBOX })
    if (r.error) { setErr(r.error); setBusy(false); return }
    let dv = r
    if (r.order_id) {
      for (let i = 0; i < 5; i++) {
        await new Promise(x => setTimeout(x, 3000))
        const s = await call('check_status', { order_id: r.order_id })
        if (s.txt_value) { dv = {...r, txt_name: s.txt_name, txt_value: s.txt_value}; break }
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

  const reset = () => { setStep('form'); setD(''); setOrd(null); setRes(null); setPend(null); setErr('') }
  const resume = () => {
    const o = pending
    setD(o.domain)
    setOrd({ order_id: o.id, tss_order_id: o.tss_order_id, txt_name: o.dv_cname_host || o.domain, txt_value: o.dv_cname_value || '' })
    setPend(null); setStep('dv')
  }

  if (authLoading) return null
  if (!user) return (
    <>
      <style>{STYLES}</style>
      <div className="ic-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
        <div className="ic-fade" style={{ textAlign:'center', padding:24, maxWidth:300 }}>
          <div style={{ width:56, height:56, background:'#0a0a0a', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 28px rgba(0,0,0,0.18)' }}>
            <Shield size={26} color="white"/>
          </div>
          <div style={{ fontSize:19, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.4px', marginBottom:8 }}>Sign in to continue</div>
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7, marginBottom:24 }}>SSLVault manages all your certificates, auto-renewal, and server deployment.</div>
          <button className="ic-btn ic-btn-primary" onClick={() => nav('/auth')}><Lock size={14}/> Sign in to SSLVault</button>
        </div>
      </div>
    </>
  )

  const price = years === 1 ? 19 : 34

  return (
    <>
      <style>{STYLES}</style>
      <div className="ic-root">

        {/* HEADER */}
        <div className="ic-header">
          <div className="ic-header-left">
            <div className="ic-logo"><Shield size={18} color="#10b981"/></div>
            <div>
              <div className="ic-hero-title">Issue SSL Certificate</div>
              <div className="ic-hero-sub">RapidSSL DV · TheSSLStore · DigiCert Trust Network</div>
            </div>
          </div>
          <div className="ic-hero-badges">
            <span className="ic-badge ic-badge-green"><CheckCircle size={10}/> DigiCert chain</span>
            <span className="ic-badge">~5 min issuance</span>
            <span className="ic-badge">Auto-renewal</span>
            <span className="ic-badge">99.9% browser trust</span>
            {IS_SANDBOX && <span className="ic-sandbox-pill">Sandbox</span>}
          </div>
        </div>

        {/* STEP BAR */}
        <StepBar current={step}/>

        {/* BODY */}
        {step === 'form' ? (
          <div className="ic-body">
            {/* LEFT — form */}
            <div className="ic-enter">
              {pending && (
                <div className="ic-pending">
                  <div className="ic-pending-text">
                    <div className="ic-pending-title">Pending order — <span style={{ fontFamily:'monospace' }}>{pending.domain}</span></div>
                    <div className="ic-pending-sub">DNS validation in progress · #{pending.tss_order_id}</div>
                  </div>
                  <button className="ic-btn ic-btn-green" style={{ padding:'8px 14px', fontSize:11, flexShrink:0 }} onClick={resume}>Resume →</button>
                  <button onClick={() => setPend(null)} style={{ background:'none', border:'none', color:'#b45309', cursor:'pointer', fontSize:20, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
                </div>
              )}

              {/* Domain */}
              <div className="ic-domain">
                <label className="ic-domain-label">Domain name</label>
                <div className="ic-domain-wrap">
                  <Globe size={15} className="ic-domain-icon"/>
                  <input className="ic-domain-input" placeholder="yourdomain.com"
                    value={domain} onChange={e => setD(e.target.value)}/>
                </div>
              </div>

              {/* Contact */}
              <div className="ic-card">
                <div className="ic-card-head">
                  <span className="ic-section-label">Contact details</span>
                  <span style={{ fontSize:10, color:'#cbd5e1' }}>Required by TSS</span>
                </div>
                <div className="ic-card-body">
                  <div className="ic-row2">
                    <div className="ic-field">
                      <label className="ic-label">First name</label>
                      <input className="ic-input" placeholder="John" value={fn} onChange={e => setFn(e.target.value)}/>
                    </div>
                    <div className="ic-field">
                      <label className="ic-label">Last name</label>
                      <input className="ic-input" placeholder="Smith" value={ln} onChange={e => setLn(e.target.value)}/>
                    </div>
                  </div>
                  <div className="ic-field">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <label className="ic-label" style={{ margin:0 }}>Email</label>
                      <span style={{ fontSize:10, color:'#94a3b8' }}>cert delivery</span>
                    </div>
                    <input className="ic-input" type="email" placeholder="you@example.com" value={em} onChange={e => setEm(e.target.value)}/>
                  </div>
                  <div className="ic-field">
                    <label className="ic-label">Phone</label>
                    <input className="ic-input" placeholder="+1 415 555 0100" value={ph} onChange={e => setPh(e.target.value)}/>
                  </div>
                  <div className="ic-field">
                    <label className="ic-label">Validity period</label>
                    <div className="ic-validity">
                      {[{y:1,p:19},{y:2,p:34}].map(({y,p}) => (
                        <button key={y} className={`ic-val-btn${years===y?' sel':''}`} onClick={() => setYears(y)}>
                          <div className="ic-val-yr">{y} year{y>1?'s':''}</div>
                          <div className="ic-val-pr">€{p} / year</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {err && <div className="ic-error"><AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{err}</div>}
            </div>

            {/* RIGHT — order summary */}
            <div>
              <div className="ic-summary">
                <div className="ic-summary-rows">
                  <div className="ic-sum-row"><span>Certificate</span><span>RapidSSL DV</span></div>
                  <div className="ic-sum-row"><span>Validity</span><span>{years} year{years>1?'s':''}</span></div>
                  <div className="ic-sum-row"><span>Issuance</span><span>~5 minutes</span></div>
                  <div className="ic-sum-row em"><span>Auto-renewal</span><span>Included</span></div>
                  <div className="ic-sum-row"><span>RapidSSL Standard DV</span><span>€{price}</span></div>
                  <div className="ic-sum-row em"><span>CLM management</span><span>Free</span></div>
                </div>
                <div className="ic-sum-foot">
                  <div>
                    <div className="ic-price-label">Total today</div>
                    <div className="ic-price-val">€{price}</div>
                    <div className="ic-price-note">Demo mode · no payment required</div>
                  </div>
                  <button className="ic-btn ic-btn-primary ic-btn-full" style={{ marginTop:12 }} onClick={place} disabled={busy}>
                    {busy
                      ? <><RefreshCw size={14} className="ic-spin"/> Placing order…</>
                      : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
                  </button>
                </div>
                <div className="ic-trust" style={{ justifyContent:'flex-start', flexDirection:'column', gap:8, padding:'12px 16px' }}>
                  {[<><Lock size={11}/> DigiCert trust chain</>, <><Zap size={11}/> Auto-renews before expiry</>, <><Globe size={11}/> 99.9% browser compatibility</>].map((t, i) => (
                    <span key={i} className="ic-trust-item" style={{ color:'#10b981' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ic-body-full ic-enter">

          {/* ── DNS VALIDATION ────────────────────────────── */}
          {step === 'dv' && ord && (
            <div className="ic-enter">
              <div className="ic-card">
                <div className="ic-dv-head">
                  <div className="ic-dv-icon"><Globe size={17} color="#d97706"/></div>
                  <div style={{ flex:1 }}>
                    <div className="ic-dv-title">Verify domain ownership</div>
                    <div className="ic-dv-sub">Add this TXT record to prove you control <strong style={{ fontFamily:'monospace' }}>{domain}</strong></div>
                  </div>
                  <div className="ic-order-no">#{ord.tss_order_id || '—'}</div>
                </div>

                <div className="ic-terminal">
                  <div className="ic-term-head">
                    <span className="ic-dot" style={{ background:'#ff5f56' }}/>
                    <span className="ic-dot" style={{ background:'#ffbd2e' }}/>
                    <span className="ic-dot" style={{ background:'#27c93f' }}/>
                    <span className="ic-term-name">DNS TXT · {domain}</span>
                  </div>
                  {[
                    { k:'Name',  v: ord.txt_name || domain, copy: true },
                    { k:'Type',  v: 'TXT', green: true },
                    { k:'Value', v: ord.txt_value || null, copy: true, loading: !ord.txt_value },
                    { k:'TTL',   v: '300' },
                  ].map(({ k, v, copy, green, loading }) => (
                    <div className="ic-dns-row" key={k}>
                      <span className="ic-dns-key">{k}</span>
                      <span className={`ic-dns-val${green ? ' green' : loading ? ' dim' : ''}`}>
                        {loading
                          ? <><RefreshCw size={11} className="ic-pulse" style={{ color:'#484f58', flexShrink:0 }}/><span>{polling ? 'Fetching from TSS…' : 'Click Auto-Add DNS'}</span></>
                          : v}
                      </span>
                      {copy && v && !loading && <CopyBtn text={v}/>}
                    </div>
                  ))}
                </div>

                {res?.dns_auto && (
                  <div className={`ic-feedback ${res.dns_auto.ok ? 'ok' : 'err'}`}>
                    {res.dns_auto.ok
                      ? <><Check size={13} style={{ flexShrink:0, marginTop:1 }}/>TXT record added via {res.dns_auto.provider} — wait 1–2 min then click Check Status.</>
                      : <><AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{res.dns_auto.message}</>}
                  </div>
                )}
                {res && res.status !== 'active' && !res.dns_auto && (
                  <div className="ic-feedback warn">
                    <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>
                    Not validated yet ({res.major_status}) — wait a few minutes and retry.
                  </div>
                )}

                <div className="ic-dv-actions">
                  <button className="ic-btn ic-btn-green" onClick={addDns} disabled={dns || !ord.txt_value}>
                    {dns ? <><RefreshCw size={13} className="ic-spin"/> Adding…</> : <><Zap size={13}/> Auto-Add DNS</>}
                  </button>
                  <button className="ic-btn ic-btn-outline" onClick={check} disabled={chk}>
                    {chk ? <><RefreshCw size={13} className="ic-spin"/> Checking…</> : <><RefreshCw size={13}/> Check Status</>}
                  </button>
                  <button className="ic-btn ic-btn-ghost" onClick={reset}>← New order</button>
                </div>
              </div>

              <div className="ic-auto-note">
                <Zap size={14} color="#10b981" style={{ flexShrink:0, marginTop:1 }}/>
                <span><strong style={{ color:'#0a0a0a' }}>Fully automatic:</strong> SSLVault polls TheSSLStore every 5 minutes. Once your DNS propagates, the certificate activates with no action needed.</span>
              </div>
            </div>
          )}

          {/* ── DONE ──────────────────────────────────────── */}
          {step === 'done' && (
            <div className="ic-fade">
              <div className="ic-card">
                <div className="ic-done-head">
                  <div className="ic-done-ring">
                    <CheckCircle size={34} color="#10b981" strokeWidth={2}/>
                  </div>
                  <div className="ic-done-title">Certificate issued!</div>
                  <div className="ic-done-sub">
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0a0a0a' }}>{clean(domain)}</span>
                    {' '}is now secured · Auto-renewal active
                  </div>
                </div>
                <div className="ic-done-body">
                  <button className="ic-btn ic-btn-primary ic-btn-full"
                    onClick={() => { sessionStorage.setItem('install_domain', clean(domain)); nav('/dashboard') }}>
                    <Server size={15}/> Install on server
                  </button>
                  <div className="ic-row2-btn">
                    <button className="ic-btn ic-btn-outline" onClick={() => nav('/dashboard')}>View dashboard</button>
                    <button className="ic-btn ic-btn-outline" onClick={reset} style={{ color:'#64748b' }}>Issue another</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        )}
      </div>
    </>
  )
}
