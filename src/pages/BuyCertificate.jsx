import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, Clock, RotateCcw, Terminal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const IS_SANDBOX = true

const PRODUCTS = [
  { code: 'rapidssl', name: 'RapidSSL DV', type: 'DV', price: 19, wildcard: false, available: true },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button className="v2-btn v2-btn-sm" onClick={copy}
      style={{ minWidth: 60, fontSize: 10 }}>
      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  )
}

function StepBar({ current }) {
  const steps = [{ id:'form', label:'Configure' }, { id:'dv', label:'Validate' }, { id:'done', label:'Done' }]
  const idx = steps.findIndex(s => s.id === current)
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid var(--v2-border)',
      padding: '0 32px', display: 'flex', alignItems: 'center', height: 44 }}>
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'idle'
        const numBg = state === 'done' ? 'var(--v2-green)' : state === 'active' ? 'var(--v2-text)' : 'var(--v2-surface-3)'
        const numColor = state === 'idle' ? 'var(--v2-text-3)' : '#fff'
        const labelColor = state === 'done' ? 'var(--v2-green-text)' : state === 'active' ? 'var(--v2-text)' : 'var(--v2-text-3)'
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: numBg,
                color: numColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s' }}>
                {state === 'done' ? <Check size={10}/> : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: labelColor, transition: 'color 0.2s' }}>
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ width: 32, height: 1, margin: '0 8px', flexShrink: 0,
                background: i < idx ? 'var(--v2-green)' : 'var(--v2-border)',
                transition: 'background 0.3s' }}/>
            )}
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
    const r = await fetch(`${SUPABASE_URL}/functions/v1/tss-issue`, {
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
    const r = await call('place_order', { domain: d, years, product_code: product,
      firstName: fn.trim(), lastName: ln.trim(), adminEmail: em.trim(), phone: ph.trim(), is_sandbox: IS_SANDBOX })
    if (r.error) { setErr(r.error); setBusy(false); return }
    let dv = r
    if (r.order_id) {
      for (let i = 0; i < 5; i++) {
        await new Promise(x => setTimeout(x, 3000))
        const s = await call('check_status', { order_id: r.order_id })
        if (s.txt_value || s.cname_value) { dv = {...r, ...s}; break }
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
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
      <div style={{ textAlign:'center', padding:32, maxWidth:320 }}>
        <div style={{ width:52, height:52, background:'var(--v2-text)', borderRadius:12,
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Shield size={22} color="white"/>
        </div>
        <h2 className="v2-h1" style={{ marginBottom:8 }}>Sign in to continue</h2>
        <p style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.7, marginBottom:24 }}>
          SSLVault manages your certificates, auto-renewal, and server deployment.
        </p>
        <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>
          <Lock size={14}/> Sign in to SSLVault
        </button>
      </div>
    </div>
  )

  const prod = PRODUCTS.find(p => p.code === product) || PRODUCTS[0]
  const price = years === 1 ? 19 : 34

  return (
    <div className="v2-page">

      {/* Top bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--v2-border)', padding:'0 32px',
        display:'flex', alignItems:'center', justifyContent:'space-between', height:52, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:'var(--v2-text)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={14} color="white"/>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>Issue SSL Certificate</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span className="v2-chip" style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <CheckCircle size={10} style={{ color:'var(--v2-green)' }}/> DigiCert chain
          </span>
          <span className="v2-chip"><Clock size={10}/> ~5 min</span>
          <span className="v2-chip"><RotateCcw size={10}/> Auto-renewal</span>
          {IS_SANDBOX && (
            <span style={{ background:'#7c3aed', color:'white', fontSize:9, fontWeight:700,
              letterSpacing:'0.8px', textTransform:'uppercase', borderRadius:3, padding:'3px 7px' }}>
              Sandbox
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <StepBar current={step}/>

      {/* FORM STEP */}
      {step === 'form' && (
        <div className="v2-container" style={{ paddingTop:24 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start' }}>

            {/* LEFT */}
            <div>
              {pending && (
                <div className="v2-callout tip" style={{ marginBottom:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:12, marginBottom:2 }}>
                      Pending order — <span style={{ fontFamily:'var(--v2-font-mono)' }}>{pending.domain}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>DNS validation in progress · #{pending.tss_order_id}</div>
                  </div>
                  <button className="v2-btn v2-btn-sm v2-btn-primary" onClick={resume}>Resume →</button>
                  <button onClick={() => setPend(null)}
                    style={{ background:'none', border:'none', color:'var(--v2-amber-text)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
                </div>
              )}

              {/* Certificate Type */}
              <div className="v2-card" style={{ marginBottom:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--v2-border)',
                  background:'var(--v2-surface-2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--v2-text-2)',
                    textTransform:'uppercase', letterSpacing:'0.6px' }}>Certificate Type</span>
                  {IS_SANDBOX && <span style={{ fontSize:10, color:'var(--v2-green-text)', fontWeight:500 }}>Sandbox · All available</span>}
                </div>
                <div style={{ padding:'14px 16px' }}>
                  {PRODUCTS.map(p => (
                    <div key={p.code}
                      onClick={() => p.available && setProduct(p.code)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                        borderRadius:6, cursor:p.available?'pointer':'not-allowed',
                        border: product===p.code ? '1.5px solid var(--v2-text)' : '1px solid var(--v2-border)',
                        background: product===p.code ? 'var(--v2-surface-3)' : '#fff',
                        opacity: p.available ? 1 : 0.5, transition:'all 0.12s' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
                        border: product===p.code ? '5px solid var(--v2-text)' : '2px solid var(--v2-border)',
                        transition:'all 0.12s' }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{p.name}</span>
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3,
                            textTransform:'uppercase', letterSpacing:'0.4px',
                            background:'#dcfce7', color:'#15803d' }}>{p.type}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:'var(--v2-text)' }}>€{p.price}</div>
                        <div style={{ fontSize:10, color:'var(--v2-text-3)' }}>/year</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain */}
              <div className="v2-card" style={{ marginBottom:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--v2-border)', background:'var(--v2-surface-2)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--v2-text-2)',
                    textTransform:'uppercase', letterSpacing:'0.6px' }}>Domain Name</span>
                </div>
                <div style={{ padding:'16px' }}>
                  <label className="v2-label">Common Name (CN) <span style={{ color:'var(--v2-red)' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <Globe size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
                      color:'var(--v2-text-3)', pointerEvents:'none' }}/>
                    <input className="v2-input"
                      style={{ paddingLeft:34, fontFamily:'var(--v2-font-mono)', fontSize:14, height:42 }}
                      placeholder="yourdomain.com"
                      value={domain} onChange={e => setD(e.target.value)}/>
                  </div>
                </div>
              </div>

              {/* Requester Details */}
              <div className="v2-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--v2-border)',
                  background:'var(--v2-surface-2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--v2-text-2)',
                    textTransform:'uppercase', letterSpacing:'0.6px' }}>Requester Details</span>
                  <span style={{ fontSize:10, color:'var(--v2-text-3)', fontWeight:500 }}>Required by TheSSLStore</span>
                </div>
                <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div className="v2-field">
                      <label className="v2-label">First Name <span style={{ color:'var(--v2-red)' }}>*</span></label>
                      <input className="v2-input" placeholder="John" value={fn} onChange={e => setFn(e.target.value)}/>
                    </div>
                    <div className="v2-field">
                      <label className="v2-label">Last Name <span style={{ color:'var(--v2-red)' }}>*</span></label>
                      <input className="v2-input" placeholder="Smith" value={ln} onChange={e => setLn(e.target.value)}/>
                    </div>
                  </div>
                  <div className="v2-field">
                    <label className="v2-label" style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Email <span style={{ color:'var(--v2-red)' }}>*</span></span>
                      <span style={{ fontSize:10, color:'var(--v2-text-3)', fontWeight:400 }}>Certificate delivery</span>
                    </label>
                    <input className="v2-input" type="email" placeholder="you@example.com" value={em} onChange={e => setEm(e.target.value)}/>
                  </div>
                  <div className="v2-field">
                    <label className="v2-label">Phone <span style={{ color:'var(--v2-red)' }}>*</span></label>
                    <input className="v2-input" placeholder="+1 415 555 0100" value={ph} onChange={e => setPh(e.target.value)}/>
                  </div>
                  <div className="v2-field" style={{ marginBottom:0 }}>
                    <label className="v2-label">Validity Period</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[{y:1,p:19},{y:2,p:34}].map(({y,p}) => (
                        <button key={y} onClick={() => setYears(y)}
                          style={{ padding:'10px 14px', borderRadius:6, cursor:'pointer', textAlign:'left',
                            fontFamily:'inherit', transition:'all 0.12s',
                            border: years===y ? '1.5px solid var(--v2-text)' : '1px solid var(--v2-border)',
                            background: years===y ? 'var(--v2-surface-3)' : '#fff' }}>
                          <div style={{ fontSize:13, fontWeight:600, color: years===y ? 'var(--v2-text)' : 'var(--v2-text)' }}>
                            {y} year{y>1?'s':''}
                          </div>
                          <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1 }}>€{p} / year</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {err && (
                <div className="v2-callout error" style={{ marginTop:12 }}>
                  <AlertTriangle size={13} style={{ flexShrink:0 }}/> {err}
                </div>
              )}
            </div>

            {/* RIGHT — summary */}
            <div style={{ position:'sticky', top:20 }}>
              <div style={{ background:'#111827', border:'1px solid #1f2937', borderRadius:8, overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #1f2937' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#6b7280',
                    textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10 }}>Order Summary</div>
                  {[
                    { k:'Certificate', v: prod.name },
                    { k:'Type', v: prod.type },
                    { k:'Validity', v: `${years} year${years>1?'s':''}` },
                    { k:'Auto-renewal', v: 'Included', green: true },
                    { k:prod.name, v: `€${prod.price}` },
                    { k:'CLM management', v: 'Free', blue: true },
                  ].map(({ k, v, green, blue }) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
                      fontSize:12, marginBottom:7, gap:8 }}>
                      <span style={{ color:'#6b7280', flexShrink:0 }}>{k}</span>
                      <span style={{ fontWeight:500, color: green?'#3b82f6' : blue?'#60a5fa' : '#e5e7eb',
                        textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #1f2937' }}>
                  <div style={{ fontSize:10, color:'#6b7280', fontWeight:500, letterSpacing:'0.3px',
                    textTransform:'uppercase', marginBottom:4 }}>Total today</div>
                  <div style={{ fontSize:28, fontWeight:700, color:'#f9fafb', letterSpacing:'-1px', lineHeight:1 }}>€{price}</div>
                  <div style={{ fontSize:10, color:'#4b5563', marginTop:4 }}>
                    {IS_SANDBOX ? 'Demo mode · no payment required' : 'Billed immediately'}
                  </div>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  <button onClick={place} disabled={busy}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                      background: busy ? '#374151' : '#0a0a0a', color: busy ? '#6b7280' : '#fff',
                      border:'none', borderRadius:6, padding:12, fontFamily:'inherit',
                      fontSize:13, fontWeight:600, cursor: busy ? 'not-allowed' : 'pointer', transition:'background 0.15s' }}>
                    {busy
                      ? <><RefreshCw size={14} className="spin"/> Placing order…</>
                      : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
                  </button>
                </div>
                <div style={{ padding:'0 20px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { icon:<Lock size={11}/>,      text:'DigiCert trust chain' },
                    { icon:<Zap size={11}/>,        text:'Auto-renews before expiry' },
                    { icon:<Globe size={11}/>,      text:'99.9% browser compatibility' },
                  ].map((t, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                      fontSize:11, color:'#6b7280' }}>
                      <span style={{ color:'#3b82f6' }}>{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DV STEP */}
      {step === 'dv' && ord && (
        <div className="v2-container" style={{ maxWidth:760, paddingTop:24 }}>

          {/* Header card */}
          <div className="v2-card v2-card-pad" style={{ marginBottom:14, display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
              background:'var(--v2-amber-bg)', border:'1px solid var(--v2-amber-border)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Globe size={17} color="var(--v2-amber)"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--v2-text)', marginBottom:3 }}>Verify Domain Ownership</div>
              <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.5 }}>
                Add this <strong>{ord.dv_type === 'CNAME' ? 'CNAME' : 'TXT'} record</strong> to prove you control{' '}
                <strong style={{ fontFamily:'var(--v2-font-mono)', color:'var(--v2-text)' }}>{domain || ord.txt_name}</strong>
              </div>
            </div>
            <div style={{ flexShrink:0, background:'var(--v2-surface-3)', border:'1px solid var(--v2-border)',
              borderRadius:4, padding:'4px 10px', fontSize:11, fontWeight:600,
              color:'var(--v2-text-2)', fontFamily:'var(--v2-font-mono)' }}>
              #{ord.tss_order_id || '—'}
            </div>
          </div>

          {/* DNS record panel */}
          <div className="v2-card" style={{ marginBottom:14, overflow:'hidden' }}>
            {/* Terminal header */}
            <div style={{ background:'#111827', padding:'10px 16px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f56', display:'inline-block' }}/>
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#ffbd2e', display:'inline-block' }}/>
              <span style={{ width:10, height:10, borderRadius:'50%', background:'#1a56db', display:'inline-block' }}/>
              <span style={{ fontSize:11, color:'#9ca3af', fontFamily:'var(--v2-font-mono)', marginLeft:6 }}>
                DNS {ord.dv_type === 'CNAME' ? 'CNAME' : 'TXT'} · {domain || ord.txt_name}
              </span>
            </div>

            {/* DNS record rows */}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
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
                <tr key={k} style={{ borderBottom:'1px solid var(--v2-border)' }}>
                  <td style={{ padding:'10px 16px', fontSize:11, fontWeight:600,
                    color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.5px', width:72 }}>
                    {k}
                  </td>
                  <td style={{ padding:'10px 0', fontSize:12, fontFamily:'var(--v2-font-mono)',
                    color: green ? 'var(--v2-green-text)' : loading ? 'var(--v2-text-3)' : 'var(--v2-text)' }}>
                    {loading
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          <RefreshCw size={11} className="spin"/>
                          {polling ? 'Fetching from TSS…' : 'Click Auto-Add DNS'}
                        </span>
                      : v}
                  </td>
                  <td style={{ padding:'10px 16px 10px 0', textAlign:'right' }}>
                    {copy && v && !loading && <CopyBtn text={v}/>}
                  </td>
                </tr>
              ))}
            </table>

            {/* Feedback */}
            {res?.dns_auto && (
              <div className={`v2-callout ${res.dns_auto.ok ? 'tip' : 'error'}`}
                style={{ margin:0, borderRadius:0, borderLeft:'none', borderRight:'none', borderBottom:'none' }}>
                {res.dns_auto.ok
                  ? <><Check size={13} style={{ flexShrink:0 }}/>{ord.dv_type==='CNAME'?'CNAME':'TXT'} record added via {res.dns_auto.provider} — wait 1–2 min then click Check Status.</>
                  : <><AlertTriangle size={13} style={{ flexShrink:0 }}/>{res.dns_auto.message}</>}
              </div>
            )}
            {res && res.status !== 'active' && !res.dns_auto && (
              <div className="v2-callout" style={{ margin:0, borderRadius:0, borderLeft:'none', borderRight:'none', borderBottom:'none' }}>
                <AlertTriangle size={13} style={{ flexShrink:0 }}/>
                Not validated yet ({res.major_status}) — wait a few minutes and retry.
              </div>
            )}

            {/* Actions */}
            <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:8,
              borderTop:'1px solid var(--v2-border)', flexWrap:'wrap' }}>
              <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={addDns} disabled={dns || !ord.txt_value}>
                {dns ? <><RefreshCw size={12} className="spin"/> Adding…</> : <><Zap size={12}/> Auto-Add DNS</>}
              </button>
              <button className="v2-btn v2-btn-sm" onClick={check} disabled={chk}>
                {chk ? <><RefreshCw size={12} className="spin"/> Checking…</> : <><RefreshCw size={12}/> Check Status</>}
              </button>
              <button className="v2-btn v2-btn-sm" onClick={reset}
                style={{ color:'var(--v2-text-3)', border:'none', background:'none' }}>← New order</button>
            </div>
          </div>

          {/* Auto note */}
          <div className="v2-callout tip">
            <Zap size={13} style={{ flexShrink:0, color:'var(--v2-green)' }}/>
            <span>
              <strong>Fully automatic:</strong> SSLVault polls TheSSLStore every 5 minutes. Once your DNS propagates, the certificate activates with no action needed.
            </span>
          </div>
        </div>
      )}

      {/* DONE STEP */}
      {step === 'done' && (
        <div className="v2-container" style={{ maxWidth:560, paddingTop:24 }}>
          <div className="v2-card v2-card-pad" style={{ textAlign:'center', padding:'48px 32px' }}>
            <div style={{ width:64, height:64, borderRadius:'50%',
              background:'var(--v2-green-bg)', border:'1.5px solid var(--v2-green-border)',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <CheckCircle size={30} color="var(--v2-green)" strokeWidth={2}/>
            </div>
            <h2 className="v2-h1" style={{ marginBottom:6 }}>Certificate Issued</h2>
            <p style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:28 }}>
              <strong style={{ fontFamily:'var(--v2-font-mono)', color:'var(--v2-text)' }}>{clean(domain)}</strong>
              {' '}is now secured · Auto-renewal active
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:300, margin:'0 auto' }}>
              <button className="v2-btn v2-btn-primary" style={{ justifyContent:'center' }}
                onClick={() => { sessionStorage.setItem('install_domain', clean(domain)); if (onDashboard) onDashboard(); else nav('/dashboard') }}>
                <Server size={14}/> Install on Server
              </button>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button className="v2-btn" style={{ justifyContent:'center' }}
                  onClick={() => { if (onDashboard) onDashboard(); else nav('/dashboard') }}>
                  View Dashboard
                </button>
                <button className="v2-btn" style={{ justifyContent:'center' }}
                  onClick={() => { if (onIssueAnother) { reset(); onIssueAnother() } else reset() }}>
                  Issue Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.spin{animation:v2-spin .8s linear infinite}@keyframes v2-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
