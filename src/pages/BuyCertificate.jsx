import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw,
         Copy, Check, ChevronRight, Lock, Star, Globe, Server, FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'

// ── Sandbox mode: set to false when going live ──
const IS_SANDBOX = true

const PRODUCTS = [
  {
    id: 'rapidssl',
    name: 'RapidSSL Standard DV',
    brand: 'RapidSSL · DigiCert',
    badge: 'Most popular',
    badgeColor: '#10b981',
    price1: 19, price2: 34,
    desc: 'Fast, trusted DV SSL. Browser trusted globally. Ideal for personal sites, blogs and small businesses.',
    features: [
      'Trusted by 99.9% of browsers — RapidSSL is a DigiCert brand',
      '1 or 2 year validity — no 90-day renewal hassle',
      'Issued in ~5 minutes — DV only, no paperwork',
      'Managed in SSLVault — monitor, install via agent, auto-renew',
      'Auto-DV via DNS TXT — automatic if Cloudflare/Vercel creds stored',
    ],
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="v2-btn v2-btn-sm" onClick={() => {
      navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function cleanDomain(val) {
  return val.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
}

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState('product')
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0])
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

  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill_domain')
    if (prefill) { setDomain(prefill); sessionStorage.removeItem('prefill_domain') }
  }, [])

  useEffect(() => { if (user) setAdminEmail(user.email || '') }, [user])

  // Auto-poll for TXT value when on DV step and value hasn't arrived yet
  useEffect(() => {
    if (step !== 'dv' || !orderData?.order_id || orderData?.txt_value) return
    setTxtPolling(true)
    let attempts = 0
    const maxAttempts = 24 // 24 × 5s = 2 minutes
    const interval = setInterval(async () => {
      attempts++
      try {
        const s = await callTSS('check_status', { order_id: orderData.order_id })
        if (s.txt_value) {
          setOrderData(prev => ({ ...prev, txt_name: s.txt_name, txt_value: s.txt_value }))
          setTxtPolling(false)
          clearInterval(interval)
        }
        if (s.status === 'active') {
          setStep('done')
          setTxtPolling(false)
          clearInterval(interval)
        }
      } catch(e) {}
      if (attempts >= maxAttempts) { setTxtPolling(false); clearInterval(interval) }
    }, 5000)
    return () => { clearInterval(interval); setTxtPolling(false) }
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
    if (!d)                { setError('Please enter a domain'); return }
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim())  { setError('Last name is required'); return }
    if (!adminEmail.trim()){ setError('Email address is required'); return }
    if (!phone.trim())     { setError('Phone number is required'); return }
    setError(''); setOrdering(true)
    const result = await callTSS('place_order', {
      domain: d, years,
      product_code: selectedProduct.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      adminEmail: adminEmail.trim(),
      phone: phone.trim(),
      is_sandbox: IS_SANDBOX,
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
    setOrdering(false)
    setOrderData(dvData)
    setStep('dv')
  }

  const checkStatus = async (orderId) => {
    setChecking(true); setCheckResult(null)
    const result = await callTSS('check_status', { order_id: orderId })
    setChecking(false); setCheckResult(result)
    if (result.txt_value && result.status !== 'active') {
      await callTSS('retry_dns', { order_id: orderId })
    }
    if (result.status === 'active') setStep('done')
  }

  if (authLoading) return null
  if (!user) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:18, fontWeight:600, marginBottom:16 }}>Sign in to order certificates</div>
        <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>Sign in</button>
      </div>
    </div>
  )

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 860 }}>

        <div className="v2-page-hero">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, background:'#0a0a0a', borderRadius:'var(--v2-r-md)',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <h1 className="v2-h1" style={{ marginBottom:0 }}>Buy SSL Certificate</h1>
              <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>via TheSSLStore · Powered by DigiCert</div>
            </div>
          </div>
          <p className="v2-subtitle">Choose a certificate, enter your domain, and get issued in minutes. Fully managed in SSLVault.</p>
          {IS_SANDBOX && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginTop:10,
                          background:'#f5f3ff', border:'0.5px solid #ddd6fe', borderRadius:'var(--v2-r-md)',
                          padding:'9px 12px', fontSize:12, color:'#6d28d9', lineHeight:1.5 }}>
              <RefreshCw size={12} style={{ flexShrink:0, marginTop:1 }} />
              <span><strong>Sandbox mode</strong> — TSS auto-revokes certs within 48 hours. SSLVault renews them automatically. Flip IS_SANDBOX to false before going live.</span>
            </div>
          )}
        </div>

        {/* PRODUCT step */}
        {step === 'product' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
            <div>
              <div className="v2-section-label" style={{ marginBottom:10 }}>Select certificate</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                {PRODUCTS.map(p => (
                  <div key={p.id} onClick={() => setSelectedProduct(p)}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                      border: `1.5px solid ${selectedProduct.id === p.id ? '#0a0a0a' : 'var(--v2-border)'}`,
                      borderRadius:'var(--v2-r-lg)', cursor:'pointer',
                      background: selectedProduct.id === p.id ? '#fafafa' : 'white',
                      transition:'all 0.12s'
                    }}>
                    <div style={{ width:18, height:18, borderRadius:'50%',
                                  border: `2px solid ${selectedProduct.id === p.id ? '#0a0a0a' : 'var(--v2-border)'}`,
                                  background: selectedProduct.id === p.id ? '#0a0a0a' : 'white',
                                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                      {selectedProduct.id === p.id && <div style={{ width:6, height:6, borderRadius:'50%', background:'white' }} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)' }}>{p.name}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:'white', background:p.badgeColor,
                                        borderRadius:3, padding:'2px 6px', letterSpacing:'0.3px' }}>{p.badge}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:4 }}>{p.brand}</div>
                      <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.5 }}>{p.desc}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:'var(--v2-text)' }}>€{p.price1}</div>
                      <div style={{ fontSize:10, color:'var(--v2-text-3)' }}>/year</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="v2-card">
                <div className="v2-section-label" style={{ marginBottom:12 }}>What you get with {selectedProduct.name}</div>
                {selectedProduct.features.map(f => (
                  <div key={f} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                    <CheckCircle size={13} color="#10b981" style={{ flexShrink:0, marginTop:1 }} />
                    <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.5 }}>{f}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order form */}
            <div className="v2-card" style={{ position:'sticky', top:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)' }}>{selectedProduct.name}</span>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>Domain</div>
                <input className="v2-input" placeholder="example.com"
                  value={domain} onChange={e => setDomain(e.target.value)}
                  style={{ width:'100%', fontSize:13 }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>First name</div>
                  <input className="v2-input" placeholder="John"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={{ width:'100%', fontSize:13 }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>Last name</div>
                  <input className="v2-input" placeholder="Smith"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    style={{ width:'100%', fontSize:13 }} />
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>Email <span style={{ color:'var(--v2-text-3)' }}>(cert delivery)</span></div>
                <input className="v2-input" placeholder="you@example.com" type="email"
                  value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  style={{ width:'100%', fontSize:13 }} />
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>Phone</div>
                <input className="v2-input" placeholder="+1 415 555 0100"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ width:'100%', fontSize:13 }} />
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:8 }}>Validity period</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[1, 2].map(y => (
                    <button key={y} onClick={() => setYears(y)}
                      style={{ flex:1, padding:'10px', border:`1.5px solid ${years === y ? '#0a0a0a' : 'var(--v2-border)'}`,
                               borderRadius:'var(--v2-r-md)', background: years === y ? '#0a0a0a' : 'transparent',
                               color: years === y ? 'white' : 'var(--v2-text)', cursor:'pointer', fontFamily:'inherit' }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{y} year{y > 1 ? 's' : ''}</div>
                      <div style={{ fontSize:11, marginTop:2, opacity:0.75 }}>€{y === 1 ? selectedProduct.price1 : selectedProduct.price2}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)', padding:'12px', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--v2-text-2)', marginBottom:6 }}>
                  <span>{selectedProduct.name} {years}yr</span>
                  <span>€{years === 1 ? selectedProduct.price1 : selectedProduct.price2}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--v2-text-2)', marginBottom:8 }}>
                  <span>SSLVault managed</span><span style={{ color:'#10b981' }}>included</span>
                </div>
                <div style={{ borderTop:'0.5px solid var(--v2-border)', paddingTop:8, display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:600, color:'var(--v2-text)' }}>
                  <span>Total</span><span>€{years === 1 ? selectedProduct.price1 : selectedProduct.price2}</span>
                </div>
                <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:4 }}>Demo mode — no payment required</div>
              </div>

              {error && (
                <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:'var(--v2-r-md)',
                               padding:'10px 12px', marginBottom:12, display:'flex', gap:8, alignItems:'flex-start' }}>
                  <AlertTriangle size={13} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} />
                  <div style={{ fontSize:12, color:'#dc2626' }}>{error}</div>
                </div>
              )}

              <button className="v2-btn v2-btn-primary" style={{ width:'100%', padding:'12px', fontSize:14, justifyContent:'center' }}
                onClick={() => setStep('order')} disabled={ordering}>
                <Lock size={14} /> Order — €{years === 1 ? selectedProduct.price1 : selectedProduct.price2}
              </button>
              <div style={{ fontSize:10, color:'var(--v2-text-3)', textAlign:'center', marginTop:8 }}>
                Demo mode · Sandbox · No real payment
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM step */}
        {step === 'order' && (
          <div style={{ maxWidth:520 }}>
            <div className="v2-card" style={{ marginBottom:16 }}>
              <div className="v2-section-label" style={{ marginBottom:12 }}>Confirm your order</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {[
                  { label:'Certificate', value: selectedProduct.name },
                  { label:'Domain',      value: cleanDomain(domain) || '—' },
                  { label:'Validity',    value: `${years} year${years > 1 ? 's' : ''}` },
                  { label:'Contact',     value: `${firstName} ${lastName}` },
                  { label:'Email',       value: adminEmail },
                  { label:'Phone',       value: phone },
                  { label:'Validation',  value: 'DNS TXT (auto if Cloudflare/Vercel creds stored)' },
                  { label:'Total',       value: `€${years === 1 ? selectedProduct.price1 : selectedProduct.price2} (demo mode)` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--v2-text-2)' }}>{label}</span>
                    <span style={{ color:'var(--v2-text)', fontWeight:500, textAlign:'right', maxWidth:280 }}>{value}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:'var(--v2-r-md)',
                               padding:'10px 12px', marginBottom:12, display:'flex', gap:8 }}>
                  <AlertTriangle size={13} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} />
                  <div style={{ fontSize:12, color:'#dc2626' }}>{error}</div>
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button className="v2-btn" onClick={() => { setStep('product'); setError('') }}>← Back</button>
                <button className="v2-btn v2-btn-primary" style={{ flex:1, justifyContent:'center' }}
                  onClick={placeOrder} disabled={ordering}>
                  {ordering
                    ? <><RefreshCw size={13} className="spin" /> Placing order &amp; fetching DNS record…</>
                    : <><Shield size={13} /> Confirm &amp; place order</>}
                </button>
              </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DV step */}
        {step === 'dv' && orderData && (
          <div style={{ maxWidth:600 }}>
            <div className="v2-card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ width:36, height:36, background:'#fef3c7', borderRadius:'var(--v2-r-md)',
                               display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Globe size={18} color="#b45309" />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--v2-text)', marginBottom:4 }}>Domain validation required</div>
                  <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6 }}>
                    Order placed with TheSSLStore. Add this DNS TXT record to prove you control
                    <strong style={{ fontFamily:'var(--mono, monospace)' }}> {domain}</strong>.
                    RapidSSL will validate automatically once the record propagates (1–10 min).
                  </div>
                </div>
              </div>

              <div style={{ background:'#0a0a0a', borderRadius:'var(--v2-r-md)', padding:'16px', marginBottom:16, fontFamily:'var(--mono, monospace)' }}>
                <div style={{ fontSize:10, color:'#6b7280', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Add DNS TXT record</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>Name / Host</div>
                    <div style={{ fontSize:12, color:'#e5e7eb', wordBreak:'break-all' }}>{orderData.txt_name || domain}</div>
                  </div>
                  <CopyBtn text={orderData.txt_name || domain} />
                </div>
                <div style={{ borderTop:'0.5px solid #374151', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TXT Value</div>
                    <div style={{ fontSize:12, color: orderData.txt_value ? '#e5e7eb' : '#6b7280', wordBreak:'break-all', display:'flex', alignItems:'center', gap:6 }}>
                      {orderData.txt_value
                        ? orderData.txt_value
                        : <><RefreshCw size={11} style={{ animation:'spin 1s linear infinite', flexShrink:0 }} color="#6b7280" /> Fetching from TSS{txtPolling ? '…' : ' — click Check Status'}</>
                      }
                    </div>
                  </div>
                  {orderData.txt_value && <CopyBtn text={orderData.txt_value} />}
                </div>
                <div style={{ borderTop:'0.5px solid #374151', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                  <div><div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>Type</div><div style={{ fontSize:12, color:'#10b981' }}>TXT</div></div>
                  <div><div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TTL</div><div style={{ fontSize:12, color:'#e5e7eb' }}>300</div></div>
                  <div><div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TSS Order ID</div><div style={{ fontSize:11, color:'#9ca3af' }}>{orderData.tss_order_id || '—'}</div></div>
                </div>
              </div>

              <div className="v2-callout tip" style={{ marginBottom:16 }}>
                <div className="v2-callout-title">Cloudflare / Vercel users</div>
                If you have DNS credentials stored in SSLVault, the TXT record may already be added automatically.
                Wait 1–5 min after adding before clicking Check Status.
              </div>

              {checkResult && checkResult.status !== 'active' && (
                <div style={{ background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:'var(--v2-r-md)',
                               padding:'10px 12px', marginBottom:12, fontSize:12, color:'#92400e' }}>
                  <AlertTriangle size={12} style={{ marginRight:6 }} />
                  DNS not yet validated — status: {checkResult.major_status}/{checkResult.minor_status}. Wait a few minutes and try again.
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button className="v2-btn" onClick={() => checkStatus(orderData.order_id)} disabled={checking}>
                  {checking ? <><RefreshCw size={12} className="spin" /> Checking…</> : <><RefreshCw size={12} /> Check status</>}
                </button>
                <button className="v2-btn" onClick={() => { setStep('product'); setOrderData(null); setCheckResult(null) }}>
                  Order another
                </button>
              </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DONE step */}
        {step === 'done' && (
          <div style={{ maxWidth:480 }}>
            <div className="v2-card" style={{ textAlign:'center', padding:'32px 24px' }}>
              <div style={{ width:56, height:56, background:'#d1fae5', borderRadius:'50%',
                             display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <CheckCircle size={28} color="#10b981" />
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--v2-text)', marginBottom:8 }}>Certificate issued!</div>
              <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6, marginBottom:8 }}>
                Your <strong>{selectedProduct.name}</strong> for <strong style={{ fontFamily:'var(--mono,monospace)' }}>{cleanDomain(domain)}</strong> is ready.
              </div>
              <div style={{ background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)', padding:'10px 14px', marginBottom:24, fontSize:12, color:'var(--v2-text-2)', lineHeight:1.6 }}>
                Next step: install it on your server — VPS agent, cPanel PHP agent, or manual. Your private key is securely stored in SSLVault until you delete it.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button className="v2-btn v2-btn-primary" onClick={() => {
                  sessionStorage.setItem('install_domain', cleanDomain(domain))
                  nav('/dashboard')
                }}>
                  <Server size={13} /> Install on server
                </button>
                <button className="v2-btn" onClick={() => nav('/dashboard')}>
                  View in dashboard
                </button>
                <button className="v2-btn" onClick={() => { setStep('product'); setDomain(''); setOrderData(null); setCheckResult(null) }}>
                  Order another
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
