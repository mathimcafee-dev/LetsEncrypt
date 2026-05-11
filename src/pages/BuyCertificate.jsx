import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw,
         Copy, Check, Lock, Zap, Globe, Server, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX   = true

function cleanDomain(v) {
  return v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}
      style={{ display:'inline-flex', alignItems:'center', gap:4, background: ok ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
        border:`1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
        color: ok ? '#34d399' : '#6b7280', borderRadius:4, padding:'3px 8px',
        fontSize:10, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
      {ok ? <><Check size={9}/> Copied</> : <><Copy size={9}/> Copy</>}
    </button>
  )
}

// Single field component
function F({ label, hint, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#525252', textTransform:'uppercase', letterSpacing:'0.3px' }}>{label}</span>
        {hint && <span style={{ fontSize:10, color:'#a3a3a3' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inp = {
  width:'100%', fontSize:13, padding:'9px 11px',
  border:'1px solid #e5e5e5', borderRadius:7, fontFamily:'inherit',
  background:'white', color:'#0a0a0a', outline:'none',
  transition:'border-color 0.15s', boxSizing:'border-box',
}

export default function BuyCertificate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep]       = useState('form')
  const [domain, setDomain]   = useState('')
  const [years, setYears]     = useState(1)
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
        if (s.txt_value) { setOrderData(p => ({ ...p, txt_name: s.txt_name, txt_value: s.txt_value })); setTxtPolling(false); clearInterval(iv) }
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
    if (!phone.trim())     { setError('Phone required'); return }
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

  const resetForm = () => { setStep('form'); setDomain(''); setOrderData(null); setCheckResult(null); setPendingOrder(null) }
  const resumePending = () => {
    const o = pendingOrder
    setDomain(o.domain)
    setOrderData({ order_id:o.id, tss_order_id:o.tss_order_id, txt_name:o.dv_cname_host||o.domain, txt_value:o.dv_cname_value||'' })
    setPendingOrder(null); setStep('dv')
  }

  const S = { fontFamily:"'Segoe UI',-apple-system,system-ui,sans-serif", background:'#fafaf9', minHeight:'calc(100vh - 56px)' }

  if (authLoading) return null
  if (!user) return (
    <div style={{ ...S, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:320, padding:24 }}>
        <div style={{ width:48, height:48, background:'#0a0a0a', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}><Shield size={22} color="white"/></div>
        <div style={{ fontSize:17, fontWeight:700, color:'#0a0a0a', marginBottom:8 }}>Sign in to continue</div>
        <div style={{ fontSize:13, color:'#737373', marginBottom:24, lineHeight:1.6 }}>Your SSLVault account manages all certificates, auto-renewal, and server delivery.</div>
        <button onClick={() => nav('/auth')} style={{ background:'#0a0a0a', color:'white', border:'none', borderRadius:8, padding:'11px 24px', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit' }}><Lock size={13}/> Sign in</button>
      </div>
    </div>
  )

  return (
    <div style={S}>
      {/* Page header — dark strip */}
      <div style={{ background:'#0a0a0a', padding:'20px 24px', borderBottom:'1px solid #1a1a1a' }}>
        <div style={{ maxWidth:640, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={15} color='#10b981'/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'white', letterSpacing:'-0.2px' }}>Issue Certificate</div>
            <div style={{ fontSize:11, color:'#6b7280' }}>RapidSSL DV · TheSSLStore · DigiCert Trust Network</div>
          </div>
          {IS_SANDBOX && <span style={{ fontSize:9, fontWeight:700, color:'#a78bfa', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:3, padding:'3px 7px', letterSpacing:'0.5px', textTransform:'uppercase' }}>Sandbox</span>}
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:28 }}>
          {['Configure','Validate DNS','Done'].map((s, i) => {
            const idx = { form:0, dv:1, done:2 }[step] ?? 0
            const done = i < idx, active = i === idx
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, transition:'all 0.2s',
                    background: done ? '#10b981' : active ? '#0a0a0a' : 'white',
                    border:`2px solid ${done ? '#10b981' : active ? '#0a0a0a' : '#d4d4d4'}`,
                    color: done||active ? 'white' : '#d4d4d4' }}>
                    {done ? <Check size={10} strokeWidth={3}/> : i+1}
                  </div>
                  <span style={{ fontSize:11, fontWeight: active ? 600 : 400, color: active ? '#0a0a0a' : done ? '#10b981' : '#c4c4c4' }}>{s}</span>
                </div>
                {i < 2 && <div style={{ flex:1, height:1, margin:'0 10px', background: i < idx ? '#10b981' : '#e5e5e5', transition:'background 0.3s' }}/>}
              </div>
            )
          })}
        </div>

        {/* ── FORM STEP ──────────────────────────────────────────── */}
        {step === 'form' && (
          <>
            {/* Pending order banner */}
            {pendingOrder && (
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'12px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:2 }}>Pending order for <span style={{ fontFamily:'monospace' }}>{pendingOrder.domain}</span></div>
                  <div style={{ fontSize:11, color:'#b45309' }}>DNS validation in progress · Order #{pendingOrder.tss_order_id}</div>
                </div>
                <button onClick={resumePending} style={{ background:'#d97706', color:'white', border:'none', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>Resume →</button>
                <button onClick={() => setPendingOrder(null)} style={{ background:'none', border:'none', color:'#b45309', cursor:'pointer', fontSize:18, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
              </div>
            )}

            {/* Cert stats strip */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:24 }}>
              {[['1 Year','Validity'],['~5 min','Issuance'],['€19 / yr','Starting at']].map(([v,l]) => (
                <div key={l} style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:8, padding:'11px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.3px' }}>{v}</div>
                  <div style={{ fontSize:10, color:'#a3a3a3', marginTop:2, fontWeight:500 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Domain field — the star */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#525252', textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:6 }}>Domain name</div>
              <div style={{ position:'relative' }}>
                <Globe size={14} color='#c4c4c4' style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input style={{ ...inp, paddingLeft:32, fontSize:14, fontWeight:600, fontFamily:'monospace', letterSpacing:'-0.2px', height:46 }}
                  placeholder="yourdomain.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  onFocus={e => e.target.style.borderColor='#0a0a0a'}
                  onBlur={e => e.target.style.borderColor='#e5e5e5'}
                />
              </div>
            </div>

            {/* Contact + validity in one card */}
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:10, padding:'18px 16px', marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>Contact &amp; validity</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:0 }}>
                <F label="First name">
                  <input style={inp} placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} onFocus={e => e.target.style.borderColor='#0a0a0a'} onBlur={e => e.target.style.borderColor='#e5e5e5'}/>
                </F>
                <F label="Last name">
                  <input style={inp} placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} onFocus={e => e.target.style.borderColor='#0a0a0a'} onBlur={e => e.target.style.borderColor='#e5e5e5'}/>
                </F>
              </div>

              <F label="Email" hint="cert delivery">
                <input style={inp} type="email" placeholder="you@example.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} onFocus={e => e.target.style.borderColor='#0a0a0a'} onBlur={e => e.target.style.borderColor='#e5e5e5'}/>
              </F>

              <F label="Phone">
                <input style={inp} placeholder="+1 415 555 0100" value={phone} onChange={e => setPhone(e.target.value)} onFocus={e => e.target.style.borderColor='#0a0a0a'} onBlur={e => e.target.style.borderColor='#e5e5e5'}/>
              </F>

              <F label="Validity">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[{y:1,p:19},{y:2,p:34}].map(({y,p}) => (
                    <button key={y} onClick={() => setYears(y)}
                      style={{ padding:'10px', border:`1.5px solid ${years===y?'#0a0a0a':'#e5e5e5'}`, borderRadius:8, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                        background:years===y?'#0a0a0a':'white', color:years===y?'white':'#0a0a0a', textAlign:'left' }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{y} year{y>1?'s':''}</div>
                      <div style={{ fontSize:11, opacity:0.6, marginTop:1 }}>€{p}/yr</div>
                    </button>
                  ))}
                </div>
              </F>
            </div>

            {/* Order summary + CTA */}
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #f5f5f5' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#737373', marginBottom:4 }}>
                  <span>RapidSSL Standard DV · {years}yr</span><span>€{years===1?19:34}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#10b981' }}>
                  <span>SSLVault lifecycle management</span><span>Free</span>
                </div>
              </div>
              <div style={{ padding:'14px 16px', background:'#fafafa', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:'#a3a3a3', marginBottom:2 }}>Total today</div>
                  <div style={{ fontSize:22, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.5px' }}>€{years===1?19:34}</div>
                  <div style={{ fontSize:9, color:'#c4c4c4', marginTop:1 }}>Demo mode · no payment</div>
                </div>
                <button onClick={placeOrder} disabled={ordering}
                  style={{ background:ordering?'#525252':'#0a0a0a', color:'white', border:'none', borderRadius:9, padding:'12px 22px', fontSize:13, fontWeight:700, cursor:ordering?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit', transition:'background 0.15s', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}
                  onMouseEnter={e => { if (!ordering) e.currentTarget.style.background='#1a1a1a' }}
                  onMouseLeave={e => { if (!ordering) e.currentTarget.style.background=ordering?'#525252':'#0a0a0a' }}>
                  {ordering ? <><RefreshCw size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Placing order…</> : <><Lock size={13}/> Issue Certificate <ArrowRight size={13}/></>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'flex-start', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#dc2626' }}>
                <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/> {error}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:20, flexWrap:'wrap' }}>
              {['🔒 256-bit TLS','🏆 DigiCert chain','⚡ Auto-renewal','🌐 All browsers'].map(t => (
                <span key={t} style={{ fontSize:11, color:'#a3a3a3' }}>{t}</span>
              ))}
            </div>
          </>
        )}

        {/* ── DV VALIDATION STEP ──────────────────────────────────── */}
        {step === 'dv' && orderData && (
          <>
            <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              {/* Header */}
              <div style={{ background:'#fffbeb', borderBottom:'1px solid #fde68a', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Globe size={15} color='#d97706'/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>DNS validation required</div>
                  <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>
                    Add the TXT record below to <span style={{ fontFamily:'monospace', fontWeight:700 }}>{domain}</span>
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#b45309', background:'#fef3c7', border:'0.5px solid #fde68a', borderRadius:4, padding:'3px 8px', flexShrink:0 }}>#{orderData.tss_order_id||'—'}</div>
              </div>

              {/* DNS record dark box */}
              <div style={{ background:'#0d1117', margin:'14px 16px', borderRadius:8, overflow:'hidden', border:'1px solid #21262d' }}>
                <div style={{ padding:'7px 12px', background:'#161b22', borderBottom:'1px solid #21262d', display:'flex', alignItems:'center', gap:5 }}>
                  {['#ff5f56','#ffbd2e','#27c93f'].map(c => <span key={c} style={{ width:8, height:8, borderRadius:'50%', background:c, display:'block' }}/>)}
                  <span style={{ fontSize:9, color:'#484f58', fontFamily:'monospace', marginLeft:4 }}>DNS TXT record</span>
                </div>
                {[
                  { k:'Name',  v:orderData.txt_name||domain, mono:true, copy:true },
                  { k:'Type',  v:'TXT', color:'#10b981' },
                  { k:'Value', v:orderData.txt_value||null, mono:true, copy:true, loading:!orderData.txt_value },
                  { k:'TTL',   v:'300' },
                ].map(({ k, v, mono, color, copy, loading }) => (
                  <div key={k} style={{ padding:'9px 12px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:9, color:'#484f58', width:38, flexShrink:0, fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.4px' }}>{k}</div>
                    <div style={{ flex:1, fontSize:11, fontFamily:mono?'monospace':'inherit', color:color||(loading?'#484f58':'#c9d1d9'), wordBreak:'break-all', display:'flex', alignItems:'center', gap:7, lineHeight:1.5 }}>
                      {loading ? <><RefreshCw size={10} color='#484f58' style={{ animation:'spin 1s linear infinite', flexShrink:0 }}/><span style={{ color:'#484f58' }}>{txtPolling?'Fetching…':'Click Auto-Add DNS'}</span></> : v}
                    </div>
                    {copy && v && !loading && <CopyBtn text={v}/>}
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {checkResult?.dns_auto && (
                <div style={{ margin:'0 16px 12px', borderRadius:7, padding:'9px 12px', fontSize:12, display:'flex', gap:7, alignItems:'flex-start',
                  background:checkResult.dns_auto.ok?'#f0fdf4':'#fef2f2', border:`0.5px solid ${checkResult.dns_auto.ok?'#86efac':'#fecaca'}`,
                  color:checkResult.dns_auto.ok?'#166534':'#dc2626' }}>
                  {checkResult.dns_auto.ok
                    ? <><Check size={12} style={{ flexShrink:0, marginTop:1 }}/>TXT added via {checkResult.dns_auto.provider} — wait 1–2 min then Check Status</>
                    : <><AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/>{checkResult.dns_auto.message}</>}
                </div>
              )}
              {checkResult && checkResult.status !== 'active' && !checkResult.dns_auto && (
                <div style={{ margin:'0 16px 12px', borderRadius:7, padding:'9px 12px', background:'#fffbeb', border:'0.5px solid #fde68a', fontSize:12, color:'#92400e', display:'flex', gap:7 }}>
                  <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/> Not validated yet ({checkResult.major_status}) — wait a few minutes.
                </div>
              )}

              {/* Action buttons */}
              <div style={{ padding:'0 16px 16px', display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={retryDns} disabled={dnsAdding||!orderData.txt_value}
                  style={{ background:dnsAdding?'#525252':'#10b981', color:'white', border:'none', borderRadius:7, padding:'9px 14px', fontSize:12, fontWeight:700, cursor:dnsAdding?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'inherit', transition:'all 0.15s', boxShadow:dnsAdding?'none':'0 2px 8px rgba(16,185,129,0.3)' }}
                  onMouseEnter={e => { if(!dnsAdding) e.currentTarget.style.background='#059669' }}
                  onMouseLeave={e => { if(!dnsAdding) e.currentTarget.style.background='#10b981' }}>
                  {dnsAdding ? <><RefreshCw size={12} style={{ animation:'spin 0.8s linear infinite' }}/> Adding…</> : <><Zap size={12}/> Auto-Add DNS</>}
                </button>
                <button onClick={checkStatus} disabled={checking}
                  style={{ background:'white', color:'#0a0a0a', border:'1px solid #e5e5e5', borderRadius:7, padding:'9px 14px', fontSize:12, fontWeight:600, cursor:checking?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}
                  onMouseEnter={e => { if(!checking) e.currentTarget.style.background='#f9f9f9' }}
                  onMouseLeave={e => { if(!checking) e.currentTarget.style.background='white' }}>
                  {checking ? <><RefreshCw size={12} style={{ animation:'spin 0.8s linear infinite' }}/> Checking…</> : <><RefreshCw size={12}/> Check Status</>}
                </button>
                <button onClick={resetForm} style={{ background:'transparent', color:'#a3a3a3', border:'none', borderRadius:7, padding:'9px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>← New order</button>
              </div>
            </div>

            <div style={{ padding:'11px 14px', background:'white', border:'0.5px solid #e5e5e5', borderRadius:8, fontSize:12, color:'#737373', lineHeight:1.7, display:'flex', gap:8 }}>
              <Zap size={12} color='#10b981' style={{ flexShrink:0, marginTop:2 }}/>
              <span><strong style={{ color:'#0a0a0a' }}>Fully automatic:</strong> SSLVault polls every 5 min. Once DNS propagates, your cert activates with no action needed.</span>
            </div>
          </>
        )}

        {/* ── DONE STEP ────────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#f0fdf4,#fafff9)', borderBottom:'0.5px solid #dcfce7', padding:'36px 24px', textAlign:'center' }}>
              <div style={{ position:'relative', display:'inline-flex', marginBottom:16 }}>
                <div style={{ position:'absolute', inset:-14, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)', animation:'certPulse 2s ease-in-out infinite' }}/>
                <div style={{ width:60, height:60, borderRadius:'50%', background:'#dcfce7', border:'2px solid #86efac', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  <CheckCircle size={28} color='#10b981'/>
                </div>
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.4px', marginBottom:6 }}>Certificate issued</div>
              <div style={{ fontSize:13, color:'#525252', lineHeight:1.6 }}>
                <span style={{ fontFamily:'monospace', fontWeight:700, color:'#0a0a0a' }}>{cleanDomain(domain)}</span> is secured · Auto-renewal active
              </div>
            </div>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={() => { sessionStorage.setItem('install_domain', cleanDomain(domain)); nav('/dashboard') }}
                style={{ width:'100%', background:'#0a0a0a', color:'white', border:'none', borderRadius:8, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                <Server size={14}/> Install on server
              </button>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={() => nav('/dashboard')} style={{ background:'white', color:'#0a0a0a', border:'1px solid #e5e5e5', borderRadius:8, padding:'10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  View dashboard
                </button>
                <button onClick={resetForm} style={{ background:'white', color:'#737373', border:'1px solid #e5e5e5', borderRadius:8, padding:'10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Issue another
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes certPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.12);opacity:1}}`}</style>
    </div>
  )
}
