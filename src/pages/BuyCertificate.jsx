import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, ExternalLink,
         Copy, Check, ChevronRight, Lock, Star, Zap, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'

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

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState('product') // product | order | dv | done
  const [domain, setDomain] = useState('')
  const [years, setYears] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [error, setError] = useState('')
  const [orderData, setOrderData] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  const callTSS = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tss-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, ...extra }),
    })
    return res.json()
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    const result = await callTSS('list')
    setOrders(result.orders || [])
    setLoadingOrders(false)
  }

  useEffect(() => { if (user) { loadOrders(); setAdminEmail(user.email || '') } }, [user])

  const placeOrder = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!d) { setError('Please enter a domain'); return }
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim())  { setError('Last name is required'); return }
    if (!adminEmail.trim()) { setError('Email address is required'); return }
    if (!phone.trim()) { setError('Phone number is required'); return }
    setError(''); setOrdering(true)
    const result = await callTSS('place_order', {
      domain: d, years,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      adminEmail: adminEmail.trim(),
      phone: phone.trim(),
    })
    setOrdering(false)
    if (result.error) { setError(result.error); return }
    setOrderData(result)
    setStep('dv')
    loadOrders()
  }

  const checkStatus = async (orderId) => {
    setChecking(true); setCheckResult(null)
    const result = await callTSS('check_status', { order_id: orderId })
    setChecking(false); setCheckResult(result)
    if (result.status === 'active') {
      setStep('done')
      loadOrders()
    }
  }

  const statusColor = (s) => {
    if (s === 'active') return '#10b981'
    if (s === 'dv_pending') return '#f59e0b'
    if (s === 'error') return '#dc2626'
    return '#94a3b8'
  }
  const statusLabel = (s) => {
    if (s === 'active') return 'Active'
    if (s === 'dv_pending') return 'Pending DV'
    if (s === 'error') return 'Error'
    return 'Pending'
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
      <div className="v2-container" style={{ maxWidth: 820 }}>

        {/* Hero */}
        <div className="v2-page-hero">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, background:'#0a0a0a', borderRadius:'var(--v2-r-md)',
                           display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <h1 className="v2-h1" style={{ marginBottom:0 }}>RapidSSL Certificate</h1>
              <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>via TheSSLStore · Powered by DigiCert</div>
            </div>
          </div>
          <p className="v2-subtitle">
            1-year or 2-year DV SSL — managed entirely in SSLVault. Auto-installs with your agent.
          </p>
        </div>

        {/* Product card */}
        {step === 'product' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
            <div>
              {/* Features */}
              <div className="v2-card" style={{ marginBottom:16 }}>
                <div className="v2-section-label" style={{ marginBottom:12 }}>What you get</div>
                {[
                  { icon:<CheckCircle size={14} color="#10b981" />, title:'Trusted by all browsers', desc:'RapidSSL is a DigiCert brand — recognized by 99.9% of browsers and devices' },
                  { icon:<CheckCircle size={14} color="#10b981" />, title:'1 or 2 year validity', desc:'No 90-day renewal hassle. Set it and forget it for a full year' },
                  { icon:<CheckCircle size={14} color="#10b981" />, title:'Managed in SSLVault', desc:'Appears in your dashboard — monitor expiry, install via agent, store in KeyLocker' },
                  { icon:<CheckCircle size={14} color="#10b981" />, title:'Auto-DV via CNAME', desc:'If you have Cloudflare or Vercel DNS credentials stored, validation is automatic' },
                  { icon:<Zap size={14} color="#f59e0b" />, title:'Issued in ~5 minutes', desc:'DV certs are the fastest — no paperwork, no phone calls' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'flex-start' }}>
                    <div style={{ flexShrink:0, marginTop:1 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:2 }}>{title}</div>
                      <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* vs LE */}
              <div className="v2-card">
                <div className="v2-section-label" style={{ marginBottom:12 }}>RapidSSL vs Let's Encrypt</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { label:'Validity', le:'90 days', rs:'1 or 2 years' },
                    { label:'Issued by', le:"Let's Encrypt", rs:'RapidSSL (DigiCert)' },
                    { label:'Auto-renewal', le:'Required', rs:'Manual (or agent)' },
                    { label:'Browser trust', le:'Universal', rs:'Universal' },
                    { label:'OV/EV upgrade', le:'Not available', rs:'Available (upgrade path)' },
                    { label:'Cost', le:'Free', rs:'€19/yr' },
                  ].map(({ label, le, rs }) => (
                    <div key={label} style={{ background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)', padding:'8px 12px' }}>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{label}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                        <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>LE: {le}</div>
                        <div style={{ fontSize:11, color:'var(--v2-text)', fontWeight:500 }}>RS: {rs}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order form */}
            <div className="v2-card" style={{ position:'sticky', top:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)' }}>RapidSSL Standard DV</span>
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
                <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:6 }}>Email <span style={{ color:'var(--v2-text-3)' }}>(cert delivery + DV)</span></div>
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
                      <div style={{ fontSize:11, marginTop:2, opacity:0.75 }}>€{y === 1 ? '19' : '34'}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              <div style={{ background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)', padding:'12px', marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--v2-text-2)', marginBottom:6 }}>
                  <span>RapidSSL DV {years}yr</span><span>€{years === 1 ? '19' : '34'}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--v2-text-2)', marginBottom:8 }}>
                  <span>SSLVault managed</span><span style={{ color:'#10b981' }}>included</span>
                </div>
                <div style={{ borderTop:'0.5px solid var(--v2-border)', paddingTop:8, display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:600, color:'var(--v2-text)' }}>
                  <span>Total</span><span>€{years === 1 ? '19' : '34'}</span>
                </div>
                <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:4 }}>
                  Demo mode — no payment required
                </div>
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
                <Lock size={14} /> Order RapidSSL — €{years === 1 ? '19' : '34'}
              </button>
              <div style={{ fontSize:10, color:'var(--v2-text-3)', textAlign:'center', marginTop:8 }}>
                Demo mode · Sandbox environment · No real payment
              </div>
            </div>
          </div>
        )}

        {/* Confirm order step */}
        {step === 'order' && (
          <div style={{ maxWidth:520 }}>
            <div className="v2-card" style={{ marginBottom:16 }}>
              <div className="v2-section-label" style={{ marginBottom:12 }}>Confirm your order</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {[
                  { label:'Certificate', value:'RapidSSL Standard DV' },
                  { label:'Domain', value: domain.trim().replace(/^https?:\/\//,'').replace(/\/.*/,'') || '—' },
                  { label:'Validity', value:`${years} year${years > 1 ? 's' : ''}` },
                  { label:'Contact', value: `${firstName} ${lastName}` },
                  { label:'Email', value: adminEmail },
                  { label:'Phone', value: phone },
                  { label:'Validation', value:'CNAME DNS (automatic if DNS creds stored)' },
                  { label:'CSR', value:'Generated by TheSSLStore' },
                  { label:'Total', value:`€${years === 1 ? '19' : '34'} (demo mode)` },
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
                    ? <><RefreshCw size={13} className="spin" /> Placing order with TheSSLStore…</>
                    : <><Shield size={13} /> Confirm & place order</>}
                </button>
              </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DV challenge step */}
        {step === 'dv' && orderData && (
          <div style={{ maxWidth:600 }}>
            <div className="v2-card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ width:36, height:36, background:'#fef3c7', borderRadius:'var(--v2-r-md)',
                               display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Globe size={18} color="#b45309" />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--v2-text)', marginBottom:4 }}>
                    Domain validation required
                  </div>
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
                    <div style={{ fontSize:12, color:'#e5e7eb', wordBreak:'break-all' }}>
                      {orderData.dv_txt_name || orderData.dv_cname_host || `_rapidssl-challenge.${domain}`}
                    </div>
                  </div>
                  <CopyBtn text={orderData.dv_txt_name || orderData.dv_cname_host || `_rapidssl-challenge.${domain}`} />
                </div>
                <div style={{ borderTop:'0.5px solid #374151', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TXT Value</div>
                    <div style={{ fontSize:12, color:'#e5e7eb', wordBreak:'break-all' }}>
                      {orderData.dv_txt_value || orderData.dv_cname_value || '—'}
                    </div>
                  </div>
                  <CopyBtn text={orderData.dv_txt_value || orderData.dv_cname_value || ''} />
                </div>
                <div style={{ borderTop:'0.5px solid #374151', paddingTop:8, marginTop:8, display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>Type</div>
                    <div style={{ fontSize:12, color:'#10b981' }}>TXT</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TTL</div>
                    <div style={{ fontSize:12, color:'#e5e7eb' }}>300</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', marginBottom:2 }}>TSS Order ID</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>{orderData.tss_order_id || '—'}</div>
                  </div>
                </div>
                {/* Raw DV debug — shows full TSS DNSAuthDetails */}
                {orderData.raw_dv && (
                  <div style={{ borderTop:'0.5px solid #374151', paddingTop:8, marginTop:8, fontSize:10, color:'#6b7280', wordBreak:'break-all' }}>
                    TSS raw DV: {JSON.stringify(orderData.raw_dv)}
                  </div>
                )}
              </div>

              <div className="v2-callout tip" style={{ marginBottom:16 }}>
                <div className="v2-callout-title">Cloudflare / Vercel users</div>
                If you have DNS credentials stored in SSLVault, you can auto-add this TXT record from the DNS Providers page.
                Wait 1–5 min after adding before clicking Check Status.
              </div>

              {checkResult && checkResult.status !== 'active' && (
                <div style={{ background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:'var(--v2-r-md)',
                               padding:'10px 12px', marginBottom:12, fontSize:12, color:'#92400e' }}>
                  <AlertTriangle size={12} style={{ marginRight:6 }} />
                  DNS not yet validated — status: {checkResult.major_status}/{checkResult.minor_status}.
                  Wait a few minutes and try again.
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button className="v2-btn" onClick={() => checkStatus(orderData.order_id)} disabled={checking}>
                  {checking ? <><RefreshCw size={12} className="spin" /> Checking…</> : <><RefreshCw size={12} /> Check status</>}
                </button>
                <button className="v2-btn" style={{ fontSize:12 }} onClick={() => { setStep('product'); setOrderData(null) }}>
                  Order another
                </button>
              </div>
            </div>
            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div style={{ maxWidth:480 }}>
            <div className="v2-card" style={{ textAlign:'center', padding:'32px 24px' }}>
              <div style={{ width:56, height:56, background:'#d1fae5', borderRadius:'50%',
                             display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <CheckCircle size={28} color="#10b981" />
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'var(--v2-text)', marginBottom:8 }}>
                Certificate issued
              </div>
              <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6, marginBottom:24 }}>
                Your RapidSSL certificate for <strong>{domain}</strong> has been issued and is now in your dashboard.
                You can download it, install it via agent, or store the key in KeyLocker.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button className="v2-btn v2-btn-primary" onClick={() => nav('/dashboard')}>
                  <ChevronRight size={13} /> View in dashboard
                </button>
                <button className="v2-btn" onClick={() => { setStep('product'); setDomain(''); setOrderData(null); setCheckResult(null) }}>
                  Order another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order history */}
        {orders.length > 0 && step === 'product' && (
          <div style={{ marginTop:32 }}>
            <div className="v2-section-label" style={{ marginBottom:12 }}>Your RapidSSL orders</div>
            <div className="v2-card">
              {orders.map((o, i) => (
                <div key={o.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                  borderBottom: i < orders.length - 1 ? '0.5px solid var(--v2-border)' : 'none'
                }}>
                  <div style={{ width:32, height:32, background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)',
                                 display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Shield size={15} color="var(--v2-text-3)" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', fontFamily:'var(--mono, monospace)' }}>{o.domain}</span>
                      <span style={{ fontSize:9, fontWeight:600, padding:'2px 6px', borderRadius:3,
                                      background: o.status === 'active' ? '#d1fae5' : o.status === 'error' ? '#fee2e2' : '#fef3c7',
                                      color: statusColor(o.status) }}>
                        {statusLabel(o.status)}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                      RapidSSL · {o.years}yr · ordered {new Date(o.created_at).toLocaleDateString()}
                      {o.tss_order_id && ` · TSS: ${o.tss_order_id}`}
                    </div>
                  </div>
                  {o.status === 'dv_pending' && (
                    <button className="v2-btn v2-btn-sm" onClick={() => {
                      setOrderData({ order_id: o.id, tss_order_id: o.tss_order_id, dv_cname_host: o.dv_cname_host, dv_cname_value: o.dv_cname_value })
                      setDomain(o.domain)
                      setStep('dv')
                    }}>
                      Complete DV
                    </button>
                  )}
                  {o.status === 'active' && (
                    <button className="v2-btn v2-btn-sm" onClick={() => nav('/dashboard')}>
                      View cert
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
