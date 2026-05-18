import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, RotateCcw, Clock,
         ShieldCheck, Wifi, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const PRODUCTS = [
  {
    code: 'rapidssl',
    name: 'RapidSSL DV',
    type: 'DV',
    badge: 'DV',
    sub: 'DigiCert chain · 99.9% browser trust · ~5 min',
    wildcard: false,
  },
  {
    code: 'rapidssl_wildcard',
    name: 'RapidSSL Wildcard',
    type: 'DV Wildcard',
    badge: 'WILDCARD',
    sub: '*.yourdomain.com · all subdomains · ~5 min',
    wildcard: true,
  },
]

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}
      style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 4, cursor: 'pointer', color: ok ? '#34d399' : '#9ca3af',
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 8px', fontFamily: 'inherit' }}>
      {ok ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  )
}

function CertPreview({ domain, fn, ln, em, product, years }) {
  const d   = domain || 'yourdomain.com'
  const p   = PRODUCTS.find(p => p.code === product) || PRODUCTS[0]
  const cn  = p.wildcard ? (d.startsWith('*.') ? d : `*.${d}`) : d
  const issued = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  const exp    = new Date(Date.now() + years * 365 * 86400000).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  const name   = [fn, ln].filter(Boolean).join(' ') || 'Your Name'
  return (
    <div style={{ background: '#0a0f1a', border: '1px solid rgba(14,127,192,0.3)',
      borderRadius: 10, overflow: 'hidden', fontFamily: 'var(--v2-font-mono)' }}>
      <div style={{ background: 'linear-gradient(135deg, #0e7fc0 0%, #1a56db 100%)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={20} color="white" strokeWidth={2}/>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '-0.2px' }}>
            SSL Certificate — {p.name}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>DigiCert / RapidSSL trust chain</div>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 3,
          padding: '2px 7px', fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>
          LIVE
        </div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Subject',     value: `CN=${cn}` },
          { label: 'Issued to',   value: name },
          { label: 'Issuer',      value: 'RapidSSL Global TLS RSA4096 SHA256 2022 CA1' },
          { label: 'Valid from',  value: issued },
          { label: 'Valid until', value: exp, highlight: true },
          { label: 'Validity',    value: `${years} year${years > 1 ? 's' : ''}` },
          { label: 'Key',         value: 'RSA 2048-bit / SHA-256' },
          { label: 'Contact',     value: em || 'your@email.com' },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#4b5563',
              textTransform: 'uppercase', letterSpacing: '0.4px', paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize: 11, color: highlight ? '#34d399' : '#9ca3af',
              wordBreak: 'break-all', fontWeight: highlight ? 600 : 400 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399',
          boxShadow: '0 0 0 3px rgba(52,211,153,0.2)' }}/>
        <span style={{ fontSize: 10, color: '#4b5563' }}>
          {domain ? 'Ready to issue' : 'Enter domain to preview'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#374151', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.3px' }}>{p.name}</span>
      </div>
    </div>
  )
}

const clean = v => v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

export default function BuyCertificate({ nav, onDashboard, onIssueAnother, embedded = false }) {
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

  useEffect(() => {
    const p = sessionStorage.getItem('prefill_domain')
    if (p) { setD(p); sessionStorage.removeItem('prefill_domain') }
  }, [])
  useEffect(() => { if (user) setEm(e => e || user.email || '') }, [user])

  // Auto-populate contact details from saved domain profile
  const [profileLoading, setProfileLoading] = useState(false)
  useEffect(() => {
    const d = clean(domain)
    if (!d || !user) return
    // Debounce — wait until user stops typing
    const t = setTimeout(async () => {
      setProfileLoading(true)
      try {
        const r = await call('get_profile', { domain: d })
        if (r.profile) {
          if (r.profile.first_name) setFn(r.profile.first_name)
          if (r.profile.last_name)  setLn(r.profile.last_name)
          if (r.profile.email)      setEm(r.profile.email)
          if (r.profile.phone)      setPh(r.profile.phone)
        }
      } catch (_) {}
      setProfileLoading(false)
    }, 600)
    return () => clearTimeout(t)
  }, [domain, user])

  // Auto-poll for DCV value when not yet received
  useEffect(() => {
    if (step !== 'dv' || !ord?.order_id || ord?.dcv_txt_value) return
    setPoll(true)
    let n = 0
    const iv = setInterval(async () => {
      n++
      try {
        const s = await call('check_status', { order_id: ord.order_id })
        if (s.dcv_txt_value || s.dcv_cname_value) {
          setOrd(p => ({ ...p,
            dcv_txt_name:    s.dcv_txt_name    || s.dcv_cname_name,
            dcv_txt_value:   s.dcv_txt_value   || s.dcv_cname_value,
            dcv_cname_name:  s.dcv_cname_name,
            dcv_cname_value: s.dcv_cname_value,
          }))
          setPoll(false); clearInterval(iv)
        }
        if (s.status === 'active') { setStep('done'); setPoll(false); clearInterval(iv) }
      } catch {}
      if (n >= 12) { setPoll(false); clearInterval(iv) }
    }, 5000)
    return () => { clearInterval(iv); setPoll(false) }
  }, [step, ord?.order_id])

  // Auto-poll for active status when DNS was auto-added — no manual click needed
  useEffect(() => {
    if (step !== 'dv' || !ord?.order_id || !ord?.dns_auto_added) return
    let n = 0
    const iv = setInterval(async () => {
      n++
      try {
        const s = await call('check_status', { order_id: ord.order_id })
        if (s.status === 'active') { setStep('done'); clearInterval(iv) }
      } catch {}
      if (n >= 24) clearInterval(iv) // stop after 2 min
    }, 5000)
    return () => clearInterval(iv)
  }, [step, ord?.order_id, ord?.dns_auto_added])

  const call = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`${SUPABASE_URL}/functions/v1/gogetssl-issue`, {
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
    const r = await call('place_order', {
      domain: d, years, product_code: product,
      firstName: fn.trim(), lastName: ln.trim(),
      adminEmail: em.trim(), phone: ph.trim(),
      period: years * 12,
    })
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    setOrd({ ...r,
      dcv_txt_name:  r.dcv_txt_name  || r.dcv_cname_name,
      dcv_txt_value: r.dcv_txt_value || r.dcv_cname_value,
    })
    // If DNS provider auto-issued the cert, skip DCV step and show success
    if (r.auto_issued || r.status === 'active') {
      setStep('done')
    } else {
      setStep('dv')
    }
  }

  const check = async () => {
    setChk(true); setRes(null)
    const r = await call('check_status', { order_id: ord.order_id })
    setChk(false); setRes(r)
    if (r.status === 'active') setStep('done')
    if (r.dcv_txt_value || r.dcv_cname_value) setOrd(p => ({ ...p,
      dcv_txt_name:    r.dcv_txt_name    || r.dcv_cname_name,
      dcv_txt_value:   r.dcv_txt_value   || r.dcv_cname_value,
      dcv_cname_name:  r.dcv_cname_name,
      dcv_cname_value: r.dcv_cname_value,
    }))
  }

  const addDns = async () => {
    setDns(true); setRes(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action:    'auto_add',
          user_id:   session.user.id,
          domain:    ord.domain || clean(domain),
          txt_name:  ord.dcv_txt_name  || ord.dcv_cname_name  || (ord.domain || clean(domain)),
          txt_value: ord.dcv_txt_value || ord.dcv_cname_value,
        }),
      })
      setRes({ dns_auto: await r.json() })
    } catch (e) { setRes({ dns_auto: { ok: false, message: String(e) } }) }
    setDns(false)
  }

  const reset = () => { setStep('form'); setD(''); setOrd(null); setRes(null); setErr('') }

  if (authLoading) return null
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ width: 56, height: 56, background: 'rgba(14,127,192,0.15)',
          border: '1px solid rgba(14,127,192,0.3)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Shield size={24} color="#0e7fc0"/>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.4px' }}>
          Sign in to continue
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
          Issue, manage and auto-renew SSL certificates from SSLVault.
        </p>
        <button onClick={() => nav('/auth')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0e7fc0',
            color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Lock size={14}/> Sign in to SSLVault
        </button>
      </div>
    </div>
  )

  // ── FORM ────────────────────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: '#050a14' }}>

      {/* Top bar — hidden when embedded inside CLM */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        padding: '0 32px', display: embedded ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#0e7fc0,#1a56db)',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={14} color="white"/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Issue SSL Certificate</span>
          <span style={{ background: '#15803d', color: 'white', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: 3, padding: '3px 7px' }}>
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ icon:<Clock size={11}/>, t:'~5 min' }, { icon:<RotateCcw size={11}/>, t:'Auto-renewal' }, { icon:<ShieldCheck size={11}/>, t:'DigiCert chain' }].map(({icon,t}) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4b5563' }}>
              {icon} {t}
            </span>
          ))}
        </div>
      </div>

      {/* Progress — hidden when embedded */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        padding: '0 32px', display: embedded ? 'none' : 'flex', alignItems: 'center', gap: 4, height: 40 }}>
        {['Configure', 'Validate DNS', 'Done'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%',
              background: i === 0 ? '#0e7fc0' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: i === 0 ? 'white' : '#374151' }}>
              {i + 1}
            </div>
            <span style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? '#e5e7eb' : '#374151' }}>{s}</span>
            {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }}/>}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ maxWidth: embedded ? '100%' : 1100, margin: '0 auto', padding: embedded ? '20px 20px 40px' : '40px 32px 80px',
        display: 'grid', gridTemplateColumns: '1fr 360px', gap: embedded ? 20 : 32, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Certificate selection */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificate type</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {PRODUCTS.map(p => (
                  <div key={p.code} onClick={() => setProduct(p.code)}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      border: product === p.code ? '1.5px solid #0e7fc0' : '0.5px solid rgba(255,255,255,0.08)',
                      background: product === p.code ? 'rgba(14,127,192,0.1)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%',
                        border: product === p.code ? '4px solid #0e7fc0' : '1.5px solid rgba(255,255,255,0.15)',
                        transition: 'all 0.12s' }}/>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{p.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(14,127,192,0.2)',
                        color: '#60a5fa', borderRadius: 3, padding: '2px 6px', letterSpacing: '0.3px' }}>{p.badge}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#4b5563', marginLeft: 22 }}>{p.sub}</div>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 7 }}>
                  Domain name <span style={{ color: '#ef4444' }}>*</span>
                  {PRODUCTS.find(p => p.code === product)?.wildcard && (
                    <span style={{ color: '#60a5fa', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                      · enter root domain, wildcard applied automatically
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe size={14} style={{ position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' }}/>
                  {profileLoading && (
                    <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center',
                      gap: 4, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        border: '1.5px solid #4b5563', borderTopColor: 'transparent',
                        animation: 'spin .7s linear infinite' }} />
                      Looking up saved profile…
                    </div>
                  )}
                  <input value={domain} onChange={e => setD(e.target.value)}
                    placeholder={PRODUCTS.find(p => p.code === product)?.wildcard ? 'yourdomain.com' : 'yourdomain.com'}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'white',
                      fontSize: 15, fontFamily: 'var(--v2-font-mono)', fontWeight: 500,
                      padding: '11px 12px 11px 36px', outline: 'none' }}/>
                </div>
              </div>

              {/* Validity */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 7 }}>
                  Validity period
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{y:1,label:'1 year',sub:'Standard'},{y:2,label:'2 years',sub:'Best value'},{y:3,label:'3 years',sub:'Max coverage'}].map(({y,label,sub}) => (
                    <div key={y} onClick={() => setYears(y)}
                      style={{ padding: '10px 14px', borderRadius: 7, cursor: 'pointer',
                        border: years === y ? '1.5px solid #0e7fc0' : '0.5px solid rgba(255,255,255,0.08)',
                        background: years === y ? 'rgba(14,127,192,0.1)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.12s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{label}</span>
                        {years === y && <span style={{ fontSize: 11, color: '#0e7fc0' }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact details</span>
              <span style={{ fontSize: 10, color: '#374151' }}>Required by certificate authority</span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{label:'First name',val:fn,set:setFn,ph:'John'},{label:'Last name',val:ln,set:setLn,ph:'Smith'}].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                      textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 6 }}>
                      {f.label} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'white',
                        fontSize: 13, fontFamily: 'inherit', padding: '9px 12px', outline: 'none' }}/>
                  </div>
                ))}
              </div>
              {[
                {label:'Email address', val:em, set:setEm, ph:'you@example.com', type:'email', note:'Certificate delivery'},
                {label:'Phone number',  val:ph, set:setPh, ph:'+31 6 00 000000', type:'tel'},
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                    textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 6 }}>
                    {f.label} <span style={{ color: '#ef4444' }}>*</span>
                    {f.note && <span style={{ color: '#374151', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>· {f.note}</span>}
                  </label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type||'text'}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'white',
                      fontSize: 13, fontFamily: 'inherit', padding: '9px 12px', outline: 'none' }}/>
                </div>
              ))}
            </div>
          </div>

          {err && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '0.5px solid rgba(220,38,38,0.3)',
              borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#fca5a5',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }}/> {err}
            </div>
          )}
        </div>

        {/* Right: preview + summary */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CertPreview domain={clean(domain)} fn={fn} ln={ln} em={em} product={product} years={years}/>

          <div style={{ background: '#111827', border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Order summary</div>
              {[
                { k: 'Certificate', v: PRODUCTS.find(p => p.code === product)?.name || 'RapidSSL DV' },
                { k: 'Validity',    v: `${years} year${years>1?'s':''}` },
                { k: 'Auto-renewal', v: 'Included', blue: true },
                { k: 'DNS validation', v: 'Automatic (CNAME)', blue: true },
                { k: 'Powered by', v: 'GoGetSSL · DigiCert' },
              ].map(({ k, v, blue }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7 }}>
                  <span style={{ color: '#4b5563' }}>{k}</span>
                  <span style={{ color: blue ? '#60a5fa' : '#9ca3af', fontWeight: blue ? 500 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px 16px' }}>
              <button onClick={place} disabled={busy}
                style={{ width: '100%', background: busy ? '#1f2937' : 'linear-gradient(135deg,#0e7fc0,#1a56db)',
                  color: busy ? '#4b5563' : 'white', border: 'none', borderRadius: 8,
                  padding: '13px', fontSize: 14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {busy
                  ? <><RefreshCw size={14} className="spin"/> Placing order…</>
                  : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
              </button>
              <div style={{ marginTop: 10, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['GoGetSSL partner', '99.9% browser trust', 'DigiCert chain'].map(t => (
                  <span key={t} style={{ fontSize: 10, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={9} style={{ color: '#0e7fc0' }}/> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── DV ──────────────────────────────────────────────────────────────────────
  if (step === 'dv' && ord) return (
    <div style={{ minHeight: '100vh', background: '#050a14' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={16} color="#0e7fc0"/>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Validate Domain Ownership</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b',
            boxShadow: '0 0 0 3px rgba(245,158,11,0.2)', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>Awaiting DNS validation</span>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        padding: '0 32px', display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
        {['Configure', 'Validate DNS', 'Done'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%',
              background: i === 0 ? '#15803d' : i === 1 ? '#0e7fc0' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: 'white' }}>
              {i === 0 ? <Check size={10}/> : i + 1}
            </div>
            <span style={{ fontSize: 11, fontWeight: i === 1 ? 600 : 400,
              color: i === 0 ? '#15803d' : i === 1 ? '#e5e7eb' : '#374151' }}>{s}</span>
            {i < 2 && <div style={{ width: 24, height: 1, background: i === 0 ? '#15803d' : 'rgba(255,255,255,0.06)', margin: '0 4px' }}/>}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.4px', marginBottom: 8 }}>
            Add this TXT record to prove ownership
          </div>
          <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
            Add a <strong style={{ color: '#9ca3af' }}>TXT record</strong> to your DNS for{' '}
            <strong style={{ color: '#0e7fc0', fontFamily: 'monospace' }}>{ord.domain || clean(domain)}</strong>
          </div>
        </div>

        {/* DNS record card */}
        <div style={{ background: '#0a0f1a', border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: '#111827', padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'block' }}/>
            ))}
            <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace', marginLeft: 8 }}>DNS record · TXT</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10, color: '#374151' }}>
              GGS #{ord.ggs_order_id || '—'}
            </span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {[
              { k: 'Name',  v: ord.dcv_txt_name  || ord.dcv_cname_name,  copy: true, loading: !(ord.dcv_txt_name  || ord.dcv_cname_name) },
              { k: 'Type',  v: 'TXT', accent: true },
              { k: 'Value', v: ord.dcv_txt_value || ord.dcv_cname_value, copy: true, loading: !(ord.dcv_txt_value || ord.dcv_cname_value) },
              { k: 'TTL',   v: '300 seconds' },
            ].map(({ k, v, copy, accent, loading }) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto',
                alignItems: 'center', padding: '10px 18px',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace',
                  color: loading ? '#374151' : accent ? '#34d399' : '#9ca3af',
                  wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {loading
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={11} className="spin"/> {polling ? 'Fetching from GoGetSSL…' : 'Waiting…'}
                      </span>
                    : v}
                </span>
                {copy && v && !loading && <CopyBtn text={v}/>}
              </div>
            ))}
          </div>

          {res?.dns_auto && (
            <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(255,255,255,0.06)',
              background: res.dns_auto.ok ? 'rgba(52,211,153,0.06)' : 'rgba(220,38,38,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {res.dns_auto.ok
                ? <Check size={12} style={{ color: '#34d399', flexShrink: 0, marginTop: 1 }}/>
                : <AlertTriangle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }}/>}
              <span style={{ fontSize: 11, color: res.dns_auto.ok ? '#34d399' : '#f87171', lineHeight: 1.5 }}>
                {res.dns_auto.ok
                  ? `Record added via ${res.dns_auto.provider}. Wait 1–2 minutes, then click Check Status.`
                  : res.dns_auto.message}
              </span>
            </div>
          )}
          {res && res.ggs_status && res.ggs_status !== 'active' && !res.dns_auto && (
            <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(255,255,255,0.06)',
              background: 'rgba(245,158,11,0.06)', display: 'flex', gap: 8 }}>
              <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}/>
              <span style={{ fontSize: 11, color: '#fbbf24' }}>
                Not validated yet ({res.ggs_status}) — DNS may still be propagating. Try again in a minute.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {ord?.dns_auto_added
            ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.1)',
                border: '0.5px solid rgba(52,211,153,0.3)', borderRadius: 7, padding: '10px 18px',
                fontSize: 13, color: '#34d399', fontWeight: 500 }}>
                <RefreshCw size={13} className="spin"/> DNS auto-added via {ord.dns_provider || 'provider'} — checking every 5s…
              </div>
            ) : (
              <button onClick={addDns} disabled={dns || !(ord.dcv_txt_value || ord.dcv_cname_value)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0e7fc0',
                  color: 'white', border: 'none', borderRadius: 7, padding: '10px 18px',
                  fontSize: 13, fontWeight: 600, cursor: dns || !(ord.dcv_txt_value || ord.dcv_cname_value) ? 'not-allowed' : 'pointer',
                  opacity: !(ord.dcv_txt_value || ord.dcv_cname_value) ? 0.4 : 1, fontFamily: 'inherit' }}>
                {dns ? <><RefreshCw size={13} className="spin"/> Adding…</> : <><Zap size={13}/> Auto-Add DNS Record</>}
              </button>
            )
          }
          <button onClick={check} disabled={chk}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7,
              padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {chk ? <><RefreshCw size={13} className="spin"/> Checking…</> : <><RefreshCw size={13}/> Check Status</>}
          </button>
          <button onClick={reset}
            style={{ background: 'none', border: 'none', color: '#374151', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
            ← Start over
          </button>
        </div>

        <div style={{ background: 'rgba(14,127,192,0.08)', border: '0.5px solid rgba(14,127,192,0.2)',
          borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10 }}>
          <Zap size={14} style={{ color: '#0e7fc0', flexShrink: 0, marginTop: 1 }}/>
          <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>
            <strong style={{ color: '#9ca3af' }}>Fully automatic:</strong> If your DNS provider is connected under{' '}
            <strong style={{ color: '#9ca3af' }}>More → DNS Providers</strong>, click{' '}
            <strong style={{ color: '#9ca3af' }}>Auto-Add DNS Record</strong> and SSLVault handles validation end-to-end.
          </div>
        </div>
      </div>
      <style>{`
        .spin{animation:spin .8s linear infinite}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>
    </div>
  )

  // ── DONE ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#050a14', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <ShieldCheck size={32} color="#34d399" strokeWidth={2}/>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.6px', marginBottom: 8 }}>
          Certificate Issued
        </h2>
        <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#0e7fc0', marginBottom: 8, fontWeight: 600 }}>
          {clean(domain)}
        </div>
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 32, lineHeight: 1.6 }}>
          {PRODUCTS.find(p => p.code === product)?.name} issued via GoGetSSL. Auto-renewal is active.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => { sessionStorage.setItem('install_domain', clean(domain)); if (onDashboard) onDashboard(); else nav('/dashboard') }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg,#0e7fc0,#1a56db)', color: 'white',
              border: 'none', borderRadius: 8, padding: '13px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Server size={15}/> Go to Dashboard
          </button>
          <button onClick={reset}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
              border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '11px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Issue Another Certificate
          </button>
        </div>
      </div>
    </div>
  )
}
