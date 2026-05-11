import { useState, useEffect, useRef } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX = true

const PRODUCTS = [{
  id: 'rapidssl',
  name: 'RapidSSL Standard DV',
  brand: 'RapidSSL · DigiCert Trust Network',
  price1: 19, price2: 34,
  features: [
    'Trusted by 99.9% of browsers worldwide',
    '1 or 2 year validity — no 90-day churn',
    'Issued in ~5 minutes — DNS DV only',
    'Zero-touch renewal via SSLVault',
    'Auto DNS validation if Vercel/Cloudflare saved',
  ],
}]

function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}
      style={{ display:'inline-flex', alignItems:'center', gap:5, background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${ok ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
        color: ok ? '#34d399' : '#9ca3af', borderRadius:5, padding:'4px 9px', fontSize:11,
        cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', whiteSpace:'nowrap' }}>
      {ok ? <Check size={10}/> : <Copy size={10}/>} {ok ? 'Copied!' : label}
    </button>
  )
}

function cleanDomain(val) {
  return val.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
}

// ── Animated shield lock icon
function CertBadge({ domain, size = 'lg' }) {
  const isLg = size === 'lg'
  return (
    <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
      {/* Glow rings */}
      <div style={{ position:'absolute', width: isLg ? 120 : 72, height: isLg ? 120 : 72, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', animation:'certPulse 3s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', width: isLg ? 80 : 48, height: isLg ? 80 : 48, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', animation:'certPulse 3s ease-in-out infinite 0.5s' }}/>
      {/* Shield */}
      <div style={{ position:'relative', width: isLg ? 56 : 36, height: isLg ? 56 : 36,
        background:'linear-gradient(135deg, #10b981, #059669)',
        borderRadius: isLg ? 14 : 9, display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 0 1px rgba(16,185,129,0.4), 0 8px 32px rgba(16,185,129,0.3)' }}>
        <Shield size={isLg ? 26 : 18} color="white" fill="rgba(255,255,255,0.2)"/>
      </div>
    </div>
  )
}

// ── Step indicator bar at the top
function StepBar({ current }) {
  const steps = ['Configure', 'Confirm', 'Validate', 'Done']
  const idx = { product:0, order:1, dv:2, done:3 }[current] ?? 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:36 }}>
      {steps.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s} style={{ display:'flex', alignItems:'center', flex: i < steps.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, transition:'all 0.3s',
                background: done ? '#10b981' : active ? '#0a0a0a' : 'transparent',
                border: `1.5px solid ${done ? '#10b981' : active ? '#0a0a0a' : '#e5e5e5'}`,
                color: done||active ? 'white' : '#a3a3a3',
              }}>
                {done ? <Check size={11}/> : i+1}
              </div>
              <span style={{ fontSize:12, fontWeight: active ? 600 : 400,
                color: active ? '#0a0a0a' : done ? '#10b981' : '#a3a3a3', transition:'all 0.3s' }}>
                {s}
              </span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:1, margin:'0 12px',
                background: i < idx ? 'linear-gradient(90deg, #10b981, #6ee7b7)' : '#e5e5e5',
                transition:'background 0.4s' }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Input field component
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
        <label style={{ fontSize:11, fontWeight:600, color:'#525252', letterSpacing:'0.1px' }}>{label}</label>
        {hint && <span style={{ fontSize:10, color:'#a3a3a3' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState('product')
  const [domain, setDomain]         = useState('')
  const [years, setYears]           = useState(1)
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [phone, setPhone]           = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [ordering, setOrdering]     = useState(false)
  const [error, setError]           = useState('')
  const [orderData, setOrderData]   = useState(null)
  const [checking, setChecking]     = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [txtPolling, setTxtPolling] = useState(false)
  const [dnsAdding, setDnsAdding]   = useState(false)
  const product = PRODUCTS[0]

  useEffect(() => {
    const p = sessionStorage.getItem('prefill_domain')
    if (p) { setDomain(p); sessionStorage.removeItem('prefill_domain') }
  }, [])
  useEffect(() => { if (user) setAdminEmail(user.email || '') }, [user])

  // Resume pending orders
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: pending } = await supabase.from('tss_orders')
        .select('id, domain, tss_order_id, dv_cname_host, dv_cname_value, is_sandbox')
        .eq('user_id', user.id).eq('status', 'dv_pending')
        .order('created_at', { ascending: false }).limit(1)
      if (pending?.length) {
        const o = pending[0]
        setDomain(o.domain)
        setOrderData({ order_id: o.id, tss_order_id: o.tss_order_id,
          txt_name: o.dv_cname_host || o.domain, txt_value: o.dv_cname_value || '', is_sandbox: o.is_sandbox })
        setStep('dv')
      }
    })()
  }, [user])

  // Auto-poll for TXT value
  useEffect(() => {
    if (step !== 'dv' || !orderData?.order_id || orderData?.txt_value) return
    setTxtPolling(true)
    let attempts = 0
    const iv = setInterval(async () => {
      attempts++
      try {
        const s = await callTSS('check_status', { order_id: orderData.order_id })
        if (s.txt_value) { setOrderData(p => ({ ...p, txt_name: s.txt_name, txt_value: s.txt_value })); setTxtPolling(false); clearInterval(iv) }
        if (s.status === 'active') { setStep('done'); setTxtPolling(false); clearInterval(iv) }
      } catch(e) {}
      if (attempts >= 24) { setTxtPolling(false); clearInterval(iv) }
    }, 5000)
    return () => { clearInterval(iv); setTxtPolling(false) }
  }, [step, orderData?.order_id])

  const callTSS = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tss-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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
      domain: d, years, product_code: product.id,
      firstName: firstName.trim(), lastName: lastName.trim(),
      adminEmail: adminEmail.trim(), phone: phone.trim(), is_sandbox: IS_SANDBOX,
    })
    if (result.error) { setError(result.error); setOrdering(false); return }
    let dvData = result
    if (result.order_id) {
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const s = await callTSS('check_status', { order_id: result.order_id })
        if (s.txt_value) { dvData = { ...result, txt_name: s.txt_name, txt_value: s.txt_value }; break }
      }
    }
    setOrdering(false); setOrderData(dvData); setStep('dv')
  }

  const checkStatus = async (orderId) => {
    setChecking(true); setCheckResult(null)
    const result = await callTSS('check_status', { order_id: orderId })
    setChecking(false); setCheckResult(result)
    if (result.status === 'active') setStep('done')
  }

  const retryDns = async () => {
    setDnsAdding(true); setCheckResult(null)
    try {
      const r = await callTSS('retry_dns', { order_id: orderData.order_id })
      setCheckResult({ dns_auto: r })
    } catch(e) { setCheckResult({ dns_auto: { ok: false, message: String(e) } }) }
    setDnsAdding(false)
  }

  if (authLoading) return null
  if (!user) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafaf9' }}>
      <div style={{ textAlign:'center' }}>
        <CertBadge size="lg"/>
        <div style={{ marginTop:20, fontSize:17, fontWeight:700, color:'#0a0a0a' }}>Sign in to issue a certificate</div>
        <div style={{ fontSize:13, color:'#737373', marginTop:6, marginBottom:20 }}>Your account keeps all certs in one place</div>
        <button onClick={() => nav('/auth')} style={{ background:'#0a0a0a', color:'white', border:'none',
          padding:'10px 24px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer',
          display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit' }}>
          <Lock size={13}/> Sign in
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#fafaf9', minHeight:'calc(100vh - 56px)', fontFamily:"'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* ── HERO HEADER ─────────────────────────────────────────────── */}
      <div style={{ background:'#0a0a0a', borderBottom:'1px solid #1a1a1a', padding:'32px 24px 28px', position:'relative', overflow:'hidden' }}>
        {/* Background grid texture */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none' }}/>
        {/* Glow */}
        <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:500, height:200,
          background:'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:860, margin:'0 auto', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <CertBadge size="lg"/>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <h1 style={{ fontSize:20, fontWeight:700, color:'white', margin:0, letterSpacing:'-0.3px' }}>
                  Issue Certificate
                </h1>
                {IS_SANDBOX && (
                  <span style={{ fontSize:9, fontWeight:700, color:'#a78bfa', background:'rgba(167,139,250,0.12)',
                    border:'1px solid rgba(167,139,250,0.25)', borderRadius:4, padding:'2px 7px',
                    letterSpacing:'0.5px', textTransform:'uppercase' }}>Sandbox</span>
                )}
              </div>
              <div style={{ fontSize:12, color:'#737373' }}>
                RapidSSL DV via TheSSLStore · DigiCert Trust Network · Issued in ~5 min
              </div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:16, flexShrink:0 }}>
              {[['99.9%', 'Browser Trust'], ['~5min', 'Issuance'], ['1yr', 'Validity']].map(([v, l]) => (
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#10b981', letterSpacing:'-0.3px' }}>{v}</div>
                  <div style={{ fontSize:10, color:'#525252', marginTop:1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* Step bar */}
        <StepBar current={step} />

        {/* ── STEP: PRODUCT (configure) ──────────────────────────────── */}
        {step === 'product' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

            {/* Left: product info */}
            <div>
              {/* Product card */}
              <div style={{ background:'white', border:'1.5px solid #0a0a0a', borderRadius:12, padding:'20px 22px', marginBottom:20,
                boxShadow:'0 1px 3px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.02)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'#0a0a0a' }}>{product.name}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:'white', background:'#10b981',
                        borderRadius:3, padding:'2px 7px', letterSpacing:'0.4px', textTransform:'uppercase' }}>Selected</span>
                    </div>
                    <div style={{ fontSize:11, color:'#737373' }}>{product.brand}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:22, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.5px' }}>
                      €{years === 1 ? product.price1 : product.price2}
                    </div>
                    <div style={{ fontSize:10, color:'#a3a3a3' }}>per year</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {product.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 0',
                      borderBottom:'0.5px solid #f5f5f5' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:'#f0fdf4',
                        border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <Check size={9} color="#10b981" strokeWidth={3}/>
                      </div>
                      <span style={{ fontSize:12, color:'#525252', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust strip */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['🔒 256-bit encryption', '🌐 Global CDN validation', '🏆 DigiCert trust chain', '⚡ Auto-renewal via SSLVault'].map(t => (
                  <div key={t} style={{ fontSize:11, color:'#525252', background:'white',
                    border:'0.5px solid #e5e5e5', borderRadius:6, padding:'5px 10px' }}>{t}</div>
                ))}
              </div>
            </div>

            {/* Right: order form */}
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12,
              boxShadow:'0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)', overflow:'hidden' }}>

              {/* Form header */}
              <div style={{ padding:'16px 18px', borderBottom:'0.5px solid #f0f0f0', background:'#fafafa' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#0a0a0a', letterSpacing:'-0.1px' }}>
                  Certificate details
                </div>
                <div style={{ fontSize:11, color:'#a3a3a3', marginTop:2 }}>Required for DV issuance</div>
              </div>

              <div style={{ padding:'16px 18px' }}>

                <Field label="Domain" hint="e.g. yourdomain.com">
                  <div style={{ position:'relative' }}>
                    <Globe size={13} color="#a3a3a3" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    <input className="v2-input" placeholder="yourdomain.com"
                      value={domain} onChange={e => setDomain(e.target.value)}
                      style={{ width:'100%', paddingLeft:30, fontSize:13, fontFamily:'monospace', fontWeight:500 }} />
                  </div>
                </Field>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <Field label="First name">
                    <input className="v2-input" placeholder="John"
                      value={firstName} onChange={e => setFirstName(e.target.value)}
                      style={{ width:'100%', fontSize:13 }} />
                  </Field>
                  <Field label="Last name">
                    <input className="v2-input" placeholder="Smith"
                      value={lastName} onChange={e => setLastName(e.target.value)}
                      style={{ width:'100%', fontSize:13 }} />
                  </Field>
                </div>

                <Field label="Email" hint="cert delivery">
                  <input className="v2-input" placeholder="you@example.com" type="email"
                    value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                    style={{ width:'100%', fontSize:13 }} />
                </Field>

                <Field label="Phone">
                  <input className="v2-input" placeholder="+1 415 555 0100"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    style={{ width:'100%', fontSize:13 }} />
                </Field>

                {/* Validity toggle */}
                <Field label="Validity">
                  <div style={{ display:'flex', gap:6 }}>
                    {[1, 2].map(y => (
                      <button key={y} onClick={() => setYears(y)}
                        style={{ flex:1, padding:'9px 8px', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                          border: `1.5px solid ${years === y ? '#0a0a0a' : '#e5e5e5'}`,
                          borderRadius:7, background: years === y ? '#0a0a0a' : 'white',
                          color: years === y ? 'white' : '#525252' }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{y}yr</div>
                        <div style={{ fontSize:10, opacity:0.7, marginTop:1 }}>€{y === 1 ? product.price1 : product.price2}</div>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Order summary */}
                <div style={{ background:'#fafafa', border:'0.5px solid #f0f0f0', borderRadius:8,
                  padding:'11px 13px', marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#737373', marginBottom:5 }}>
                    <span>{product.name} · {years}yr</span>
                    <span>€{years === 1 ? product.price1 : product.price2}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#10b981', marginBottom:7 }}>
                    <span>SSLVault lifecycle management</span><span>Free</span>
                  </div>
                  <div style={{ borderTop:'0.5px solid #e5e5e5', paddingTop:7,
                    display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:'#0a0a0a' }}>
                    <span>Total</span>
                    <span>€{years === 1 ? product.price1 : product.price2}</span>
                  </div>
                  <div style={{ fontSize:9, color:'#a3a3a3', marginTop:4, textAlign:'right' }}>Demo mode — no payment</div>
                </div>

                {error && (
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start', background:'#fef2f2',
                    border:'0.5px solid #fecaca', borderRadius:7, padding:'9px 11px', marginBottom:12, fontSize:12, color:'#dc2626' }}>
                    <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>
                    {error}
                  </div>
                )}

                <button onClick={() => { setError(''); setStep('order') }}
                  style={{ width:'100%', background:'#0a0a0a', color:'white', border:'none',
                    borderRadius:8, padding:'12px', fontSize:13, fontWeight:600, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    fontFamily:'inherit', transition:'background 0.15s',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.background='#1a1a1a'}
                  onMouseLeave={e => e.currentTarget.style.background='#0a0a0a'}>
                  <Lock size={13}/>
                  Continue to order — €{years === 1 ? product.price1 : product.price2}
                  <ArrowRight size={13}/>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ──────────────────────────────────────────── */}
        {step === 'order' && (
          <div style={{ maxWidth:520 }}>
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12,
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'16px 20px', borderBottom:'0.5px solid #f0f0f0', background:'#fafafa' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0a0a0a' }}>Review your order</div>
                <div style={{ fontSize:11, color:'#a3a3a3', marginTop:1 }}>Check everything before placing</div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                {[
                  ['Certificate', product.name],
                  ['Domain',      cleanDomain(domain) || '—'],
                  ['Validity',    `${years} year${years > 1 ? 's' : ''}`],
                  ['Contact',     `${firstName} ${lastName}`.trim() || '—'],
                  ['Email',       adminEmail],
                  ['Phone',       phone],
                  ['Validation',  'DNS TXT (auto if Vercel/Cloudflare saved)'],
                  ['Total',       `€${years === 1 ? product.price1 : product.price2} (demo)`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
                    padding:'9px 0', borderBottom:'0.5px solid #f9f9f9', fontSize:13 }}>
                    <span style={{ color:'#737373', flexShrink:0 }}>{l}</span>
                    <span style={{ color:'#0a0a0a', fontWeight:500, textAlign:'right', fontFamily: l==='Domain'?'monospace':'inherit' }}>{v}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ margin:'0 20px 16px', display:'flex', gap:8, alignItems:'flex-start', background:'#fef2f2',
                  border:'0.5px solid #fecaca', borderRadius:7, padding:'9px 11px', fontSize:12, color:'#dc2626' }}>
                  <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>{error}
                </div>
              )}

              <div style={{ padding:'0 20px 20px', display:'flex', gap:8 }}>
                <button onClick={() => { setStep('product'); setError('') }}
                  style={{ background:'white', border:'0.5px solid #e5e5e5', color:'#525252', borderRadius:7,
                    padding:'10px 16px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                  ← Back
                </button>
                <button onClick={placeOrder} disabled={ordering}
                  style={{ flex:1, background: ordering ? '#525252' : '#0a0a0a', color:'white', border:'none',
                    borderRadius:8, padding:'10px', fontSize:13, fontWeight:600, cursor: ordering ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', transition:'background 0.15s' }}>
                  {ordering
                    ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }}/> Placing order &amp; fetching DNS…</>
                    : <><Shield size={13}/> Confirm &amp; place order</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: DV VALIDATION ────────────────────────────────────── */}
        {step === 'dv' && orderData && (
          <div style={{ maxWidth:620 }}>

            {/* Status card */}
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12, overflow:'hidden',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:12 }}>
              <div style={{ padding:'16px 20px', borderBottom:'0.5px solid #f5f5f5',
                background:'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
                display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, background:'#fef3c7', borderRadius:8,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  border:'1px solid #fde68a' }}>
                  <Globe size={17} color="#d97706"/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>DNS validation required</div>
                  <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>
                    Add the TXT record below to prove ownership of <strong style={{ fontFamily:'monospace' }}>{domain}</strong>
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#b45309', background:'#fef3c7',
                  border:'1px solid #fde68a', borderRadius:4, padding:'3px 8px', fontWeight:600, flexShrink:0 }}>
                  Order #{orderData.tss_order_id || '—'}
                </div>
              </div>

              {/* DNS record dark box */}
              <div style={{ background:'#0d1117', margin:'16px 20px', borderRadius:8, overflow:'hidden',
                border:'1px solid #21262d' }}>
                {/* Header row */}
                <div style={{ padding:'8px 14px', borderBottom:'1px solid #21262d', background:'#161b22',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ display:'flex', gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff5f56', display:'block' }}/>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ffbd2e', display:'block' }}/>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#27c93f', display:'block' }}/>
                  </div>
                  <span style={{ fontSize:10, color:'#8b949e', marginLeft:4 }}>DNS TXT record</span>
                </div>

                {/* Record fields */}
                {[
                  { key:'Name / Host', val: orderData.txt_name || domain, mono:true },
                  { key:'Type',        val: 'TXT', color:'#10b981' },
                  { key:'Value',       val: orderData.txt_value || null, mono:true, loading: !orderData.txt_value },
                  { key:'TTL',         val: '300' },
                ].map(({ key, val, mono, color, loading }) => (
                  <div key={key} style={{ padding:'10px 14px', borderBottom:'1px solid #21262d',
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ fontSize:10, color:'#8b949e', flexShrink:0, width:90 }}>{key}</div>
                    <div style={{ flex:1, fontSize:12, color: color || (loading ? '#6b7280' : '#e6edf3'),
                      fontFamily: mono ? "'SF Mono','JetBrains Mono',monospace" : 'inherit',
                      wordBreak:'break-all', display:'flex', alignItems:'center', gap:6 }}>
                      {loading
                        ? <><RefreshCw size={11} color="#6b7280" style={{ animation:'spin 1s linear infinite', flexShrink:0 }}/>
                            <span>{txtPolling ? 'Fetching from TSS…' : 'Click Retry DNS Auto-Add'}</span></>
                        : val}
                    </div>
                    {val && !loading && key !== 'Type' && key !== 'TTL' && <CopyBtn text={val} label="Copy"/>}
                  </div>
                ))}
              </div>

              {/* Auto-add tip */}
              <div style={{ margin:'0 20px', marginBottom:16, padding:'10px 12px',
                background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:7,
                display:'flex', gap:8, alignItems:'flex-start' }}>
                <Zap size={12} color="#16a34a" style={{ flexShrink:0, marginTop:1 }}/>
                <div style={{ fontSize:12, color:'#166534', lineHeight:1.6 }}>
                  <strong>Vercel / Cloudflare saved?</strong> Click <strong>⚡ Auto-Add DNS</strong> — SSLVault will write the TXT record directly. Then wait 1–2 min for propagation.
                </div>
              </div>

              {/* Feedback messages */}
              {checkResult?.dns_auto && (
                <div style={{ margin:'0 20px', marginBottom:12,
                  background: checkResult.dns_auto.ok ? '#f0fdf4' : '#fef2f2',
                  border: `0.5px solid ${checkResult.dns_auto.ok ? '#86efac' : '#fecaca'}`,
                  borderRadius:7, padding:'9px 12px', fontSize:12,
                  color: checkResult.dns_auto.ok ? '#166534' : '#dc2626',
                  display:'flex', alignItems:'flex-start', gap:7 }}>
                  {checkResult.dns_auto.ok
                    ? <><Check size={12} style={{ flexShrink:0, marginTop:1 }}/>
                        TXT record added via {checkResult.dns_auto.provider} — wait 1–2 min then click Check Status</>
                    : <><AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>
                        DNS error: {checkResult.dns_auto.message}</>}
                </div>
              )}
              {checkResult && checkResult.status !== 'active' && !checkResult.dns_auto && (
                <div style={{ margin:'0 20px', marginBottom:12, background:'#fffbeb',
                  border:'0.5px solid #fde68a', borderRadius:7, padding:'9px 12px',
                  fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:7 }}>
                  <AlertTriangle size={12} style={{ flexShrink:0 }}/>
                  Not validated yet ({checkResult.major_status}/{checkResult.minor_status}) — wait a few minutes and retry.
                </div>
              )}

              {/* Action buttons */}
              <div style={{ padding:'0 20px 20px', display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={retryDns} disabled={dnsAdding || !orderData.txt_value}
                  style={{ background: dnsAdding ? '#525252' : '#0a0a0a', color:'white', border:'none',
                    borderRadius:7, padding:'9px 14px', fontSize:12, fontWeight:600, cursor: dnsAdding ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:6, fontFamily:'inherit', transition:'background 0.15s' }}
                  onMouseEnter={e => { if (!dnsAdding) e.currentTarget.style.background='#1a1a1a' }}
                  onMouseLeave={e => { if (!dnsAdding) e.currentTarget.style.background='#0a0a0a' }}>
                  {dnsAdding
                    ? <><RefreshCw size={12} style={{ animation:'spin 1s linear infinite' }}/> Adding…</>
                    : <><Zap size={12}/> ⚡ Auto-Add DNS</>}
                </button>

                <button onClick={() => checkStatus(orderData.order_id)} disabled={checking}
                  style={{ background:'white', color:'#0a0a0a', border:'1px solid #d4d4d4',
                    borderRadius:7, padding:'9px 14px', fontSize:12, fontWeight:600, cursor: checking ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:6, fontFamily:'inherit', transition:'all 0.15s' }}
                  onMouseEnter={e => { if (!checking) e.currentTarget.style.background='#f9f9f9' }}
                  onMouseLeave={e => { if (!checking) e.currentTarget.style.background='white' }}>
                  {checking
                    ? <><RefreshCw size={12} style={{ animation:'spin 1s linear infinite' }}/> Checking…</>
                    : <><RefreshCw size={12}/> Check Status</>}
                </button>

                <button onClick={() => { setStep('product'); setOrderData(null); setCheckResult(null) }}
                  style={{ background:'transparent', color:'#737373', border:'0.5px solid #e5e5e5',
                    borderRadius:7, padding:'9px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Order another
                </button>
              </div>
            </div>

            {/* How it works note */}
            <div style={{ padding:'12px 14px', background:'white', border:'0.5px solid #e5e5e5',
              borderRadius:8, fontSize:12, color:'#737373', lineHeight:1.7 }}>
              🤖 <strong style={{ color:'#0a0a0a' }}>Auto-pilot:</strong> Once the TXT record propagates, TheSSLStore validates automatically.
              SSLVault's poller checks every 5 minutes and activates your cert — no action needed from you.
            </div>
          </div>
        )}

        {/* ── STEP: DONE ─────────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12, overflow:'hidden',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)', textAlign:'center', padding:'40px 32px' }}>

              {/* Animated success */}
              <div style={{ marginBottom:20, position:'relative', display:'inline-flex' }}>
                <div style={{ position:'absolute', inset:-16, borderRadius:'50%',
                  background:'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', animation:'certPulse 2s ease-in-out infinite' }}/>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#f0fdf4',
                  border:'2px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  <CheckCircle size={30} color="#10b981"/>
                </div>
              </div>

              <div style={{ fontSize:20, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.4px', marginBottom:6 }}>
                Certificate issued!
              </div>
              <div style={{ fontSize:13, color:'#737373', lineHeight:1.6, marginBottom:20 }}>
                Your <strong style={{ color:'#0a0a0a' }}>{product.name}</strong> for{' '}
                <strong style={{ fontFamily:'monospace', color:'#0a0a0a' }}>{cleanDomain(domain)}</strong> is ready.
                Zero-touch auto-renewal is active.
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:24 }}>
                {[['Valid for', `${years} year${years>1?'s':''}`, '#0a0a0a'],
                  ['Auto-renew', 'Active', '#10b981'],
                  ['Issuer', 'RapidSSL', '#0a0a0a']].map(([l, v, c]) => (
                  <div key={l} style={{ background:'#fafafa', border:'0.5px solid #f0f0f0', borderRadius:8, padding:'10px 8px' }}>
                    <div style={{ fontSize:10, color:'#a3a3a3', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => { sessionStorage.setItem('install_domain', cleanDomain(domain)); nav('/dashboard') }}
                  style={{ background:'#0a0a0a', color:'white', border:'none', borderRadius:8,
                    padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    display:'inline-flex', alignItems:'center', gap:7 }}>
                  <Server size={13}/> Install on server
                </button>
                <button onClick={() => nav('/dashboard')}
                  style={{ background:'white', color:'#0a0a0a', border:'1px solid #d4d4d4', borderRadius:8,
                    padding:'10px 16px', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                  View dashboard
                </button>
                <button onClick={() => { setStep('product'); setDomain(''); setOrderData(null); setCheckResult(null) }}
                  style={{ background:'transparent', color:'#737373', border:'0.5px solid #e5e5e5', borderRadius:8,
                    padding:'10px 14px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Order another
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Global styles */}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes certPulse {
          0%,100% { transform:scale(1); opacity:0.6; }
          50%      { transform:scale(1.12); opacity:1; }
        }
        .v2-input:focus { outline:none; border-color:#0a0a0a; box-shadow:0 0 0 3px rgba(10,10,10,0.06); }
      `}</style>
    </div>
  )
}
