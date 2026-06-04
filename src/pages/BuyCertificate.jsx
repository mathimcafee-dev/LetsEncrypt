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

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}
      style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 4, cursor: 'pointer', color: ok ? '#0077b6' : '#888888',
        display: 'flex', alignItems: 'center', gap: 4, fontSize:10, padding: '3px 8px', fontFamily: 'inherit' }}>
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
    <div style={{ background: 'transparent', border: '1px solid rgba(14,127,192,0.3)',
      borderRadius: 10, overflow: 'hidden', fontFamily: 'var(--v2-font-mono)' }}>
      <div style={{ background: 'linear-gradient(135deg, #2a6b5c 0%, #1a56db 100%)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={20} color="white" strokeWidth={2}/>
        <div>
          <div style={{ fontSize:12, fontWeight: 700, color: '#111111', letterSpacing: '-0.2px' }}>
            SSL Certificate — {p.name}
          </div>
          <div style={{ fontSize:10, color: '#333333' }}>DigiCert / RapidSSL trust chain</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#cccccc', borderRadius: 3,
          padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#111111', letterSpacing: '0.5px' }}>
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
            <span style={{ fontSize: 9, fontWeight: 600, color: '#b5aea8',
              textTransform: 'uppercase', letterSpacing: '0.4px', paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize:11, color: highlight ? '#0077b6' : '#888888',
              wordBreak: 'break-all', fontWeight: highlight ? 600 : 400 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0077b6',
          boxShadow: '0 0 0 3px rgba(52,211,153,0.2)' }}/>
        <span style={{ fontSize:10, color: '#b5aea8' }}>
          {domain ? 'Ready to issue' : 'Enter domain to preview'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#111111', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.3px' }}>{p.name}</span>
      </div>
    </div>
  )
}

const clean = v => v.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

export default function BuyCertificate({ nav, onDashboard, onIssueAnother, embedded = false }) {
  const isMobile = useIsMobile()
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
  const [ggsStatus, setGgsStatus] = useState('') // 'processing' | 'dv_pending' | ''

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

  // Single polling loop: handles DCV fetch, DNS auto-add, and cert activation
  useEffect(() => {
    if (step !== 'dv' || !ord?.order_id) return
    let n = 0
    let dnsAttempted = false
    setPoll(true)
    // Immediate check on mount — don't wait 5s if cert already issued
    ;(async () => {
      try {
        const s = await call('check_status', { order_id: ord.order_id })
        setGgsStatus(s.ggs_status || '')
        if (s.status === 'active' || s.status === 'issued' || s.ggs_status === 'active') { setStep('done'); setPoll(false); return }
        if (s.dcv_txt_value || s.dcv_cname_value) {
          setOrd(p => ({ ...p,
            dcv_txt_name:   s.dcv_txt_name   || s.dcv_cname_name  || p.dcv_txt_name,
            dcv_txt_value:  s.dcv_txt_value  || s.dcv_cname_value || p.dcv_txt_value,
            dcv_cname_name: s.dcv_cname_name || p.dcv_cname_name,
            dcv_cname_value:s.dcv_cname_value|| p.dcv_cname_value,
          }))
        }
      } catch {}
    })()
    const iv = setInterval(async () => {
      n++
      try {
        const s = await call('check_status', { order_id: ord.order_id })
        setGgsStatus(s.ggs_status || '')

        // Cert issued — go to done
        if (s.status === 'active' || s.status === 'issued' || s.ggs_status === 'active') { setStep('done'); clearInterval(iv); setPoll(false); return }

        // Got DCV values — update UI
        if (s.dcv_txt_value || s.dcv_cname_value) {
          setOrd(p => ({ ...p,
            dcv_txt_name:    s.dcv_txt_name    || s.dcv_cname_name  || p.dcv_txt_name,
            dcv_txt_value:   s.dcv_txt_value   || s.dcv_cname_value || p.dcv_txt_value,
            dcv_cname_name:  s.dcv_cname_name  || p.dcv_cname_name,
            dcv_cname_value: s.dcv_cname_value || p.dcv_cname_value,
          }))

          // Auto-add DNS once DCV values are confirmed — only try once
          if (!dnsAttempted) {
            dnsAttempted = true
            try {
              const { data: { session } } = await supabase.auth.getSession()
              setDns(true)
              const dnsR = await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                  action:    'auto_add',
                  user_id:   session.user.id,
                  domain:    ord.domain,
                  txt_name:  s.dcv_txt_name  || s.dcv_cname_name  || ord.domain,
                  txt_value: s.dcv_txt_value || s.dcv_cname_value,
                }),
              })
              const dnsRes = await dnsR.json()
              setDns(false)
              setRes({ dns_auto: dnsRes })
              if (dnsRes.ok) {
                setOrd(p => ({ ...p, dns_auto_added: true, dns_provider: dnsRes.provider || '' }))
                // Immediately check if cert already issued after DNS add
                try {
                  const s2 = await call('check_status', { order_id: ord.order_id })
                  if (s2.status === 'active' || s2.status === 'issued' || s2.ggs_status === 'active') {
                    setStep('done'); clearInterval(iv)
                  }
                } catch {}
              }
            } catch { setDns(false) }
          }
        }
      } catch {}
      if (n >= 120) { clearInterval(iv); setPoll(false) } // stop after 10 min
    }, 5000)
    return () => { clearInterval(iv); setPoll(false) }
  }, [step, ord?.order_id])

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
    const ordData = { ...r,
      dcv_txt_name:  r.dcv_txt_name  || r.dcv_cname_name,
      dcv_txt_value: r.dcv_txt_value || r.dcv_cname_value,
    }
    setOrd(ordData)
    if (r.auto_issued || r.status === 'active' || r.status === 'issued') {
      setStep('done')
    } else {
      setStep('dv')
      // Polling loop (useEffect) handles DNS auto-add and cert activation automatically
    }
  }

  const check = async () => {
    setChk(true); setRes(null)
    const r = await call('check_status', { order_id: ord.order_id })
    setChk(false); setRes(r)
    if (r.status === 'active' || r.status === 'issued' || r.ggs_status === 'active') setStep('done')
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
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ width: 56, height: 56, background: 'rgba(14,127,192,0.15)',
          border: '1px solid rgba(14,127,192,0.3)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Shield size={24} color="#0077b6"/>
        </div>
        <h2 style={{ fontSize:22, fontWeight: 800, color: '#111111', marginBottom: 8, letterSpacing: '-0.4px' }}>
          Sign in to continue
        </h2>
        <p style={{ fontSize:13, color: '#555555', lineHeight: 1.7, marginBottom: 24 }}>
          Issue, manage and auto-renew SSL certificates from SSLVault.
        </p>
        <button onClick={() => nav('/auth')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background:'#f0f4fa',
            color: '#111111', border: 'none', borderRadius: 8, padding: '12px 24px',
            fontSize:13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Lock size={14}/> Sign in to SSLVault
        </button>
      </div>
    </div>
  )

  // ── FORM ────────────────────────────────────────────────────────────────────
  if (step === 'form') return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: 'transparent' }}>

      {/* Top bar — hidden when embedded inside CLM */}
      <div style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)',
        padding: '0 32px', display: embedded ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#0077b6',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={14} color="white"/>
          </div>
          <span style={{ fontSize:13, fontWeight: 600, color: '#111111' }}>Issue SSL Certificate</span>
          <span style={{ background:'#f0f4fa', color: '#111111', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: 3, padding: '3px 7px' }}>
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ icon:<Clock size={11}/>, t:'~5 min' }, { icon:<RotateCcw size={11}/>, t:'Auto-renewal' }, { icon:<ShieldCheck size={11}/>, t:'DigiCert chain' }].map(({icon,t}) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize:11, color: '#b5aea8' }}>
              {icon} {t}
            </span>
          ))}
        </div>
      </div>

      {/* Progress — hidden when embedded */}
      <div style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.04)',
        padding: '0 32px', display: embedded ? 'none' : 'flex', alignItems: 'center', gap: 4, height: 40 }}>
        {['Configure', 'Validate DNS', 'Done'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%',
              background: i === 0 ? '#111111' : 'rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: i === 0 ? '#000000' : '#111111' }}>
              {i + 1}
            </div>
            <span style={{ fontSize:11, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? 'rgba(240,237,232,0.12)' : '#111111' }}>{s}</span>
            {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(0,0,0,0.05)', margin: '0 4px' }}/>}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ maxWidth: embedded ? '100%' : 1100, margin: '0 auto', padding: embedded ? '20px 20px 40px' : '40px 32px 80px',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr clamp(260px,32vw,360px)', gap: embedded ? 20 : 32, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Certificate selection */}
          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize:11, fontWeight: 700, color: '#b5aea8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificate type</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {PRODUCTS.map(p => (
                  <div key={p.code} onClick={() => setProduct(p.code)}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      border: product === p.code ? '1.5px solid #2a6b5c' : '1px solid rgba(0,0,0,0.06)',
                      background: product === p.code ? 'rgba(14,127,192,0.1)' : 'rgba(0,0,0,0.02)',
                      transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%',
                        border: product === p.code ? '4px solid #2a6b5c' : '1.5px solid rgba(240,237,232,0.14)',
                        transition: 'all 0.12s' }}/>
                      <span style={{ fontSize:13, fontWeight: 600, color: '#555555' }}>{p.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(14,127,192,0.2)',
                        color: '#111111', borderRadius: 3, padding: '2px 6px', letterSpacing: '0.3px' }}>{p.badge}</span>
                    </div>
                    <div style={{ fontSize:10, color: '#b5aea8', marginLeft: 22 }}>{p.sub}</div>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize:11, fontWeight: 600, color: '#555555',
                  textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 7 }}>
                  Domain name <span style={{ color: '#0077b6' }}>*</span>
                  {PRODUCTS.find(p => p.code === product)?.wildcard && (
                    <span style={{ color: '#111111', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                      · enter root domain, wildcard applied automatically
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe size={14} style={{ position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#b5aea8', pointerEvents: 'none' }}/>
                  {profileLoading && (
                    <div style={{ fontSize:10, color: '#b5aea8', display: 'flex', alignItems: 'center',
                      gap: 4, marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        border: '1.5px solid #4b5563', borderTopColor: 'transparent',
                        animation: 'spin .7s linear infinite' }} />
                      Looking up saved profile…
                    </div>
                  )}
                  <input value={domain} onChange={e => setD(e.target.value)}
                    placeholder={PRODUCTS.find(p => p.code === product)?.wildcard ? 'yourdomain.com' : 'yourdomain.com'}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(0,0,0,0.06)', borderRadius: 7, color: '#111111',
                      fontSize:15, fontFamily: 'var(--v2-font-mono)', fontWeight: 500,
                      padding: '11px 12px 11px 36px', outline: 'none' }}/>
                </div>
              </div>

              {/* Validity */}
              <div>
                <label style={{ fontSize:11, fontWeight: 600, color: '#555555',
                  textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 7 }}>
                  Validity period
                </label>
                <div style={{ padding: '10px 14px', borderRadius: 7,
                  border: '1.5px solid #2a6b5c', background: 'rgba(14,127,192,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize:13, fontWeight: 600, color: '#555555' }}>1 year</span>
                    <span style={{ fontSize:11, color: '#111111' }}>✓ Selected</span>
                  </div>
                  <div style={{ fontSize:10, color: '#b5aea8', marginTop: 2 }}>12 months · auto-renews before expiry</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize:11, fontWeight: 700, color: '#b5aea8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact details</span>
              <span style={{ fontSize:10, color: '#111111' }}>Required by certificate authority</span>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 12 }}>
                {[{label:'First name',val:fn,set:setFn,ph:'John'},{label:'Last name',val:ln,set:setLn,ph:'Smith'}].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize:11, fontWeight: 600, color: '#b5aea8',
                      textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 6 }}>
                      {f.label} <span style={{ color: '#0077b6' }}>*</span>
                    </label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.03)',
                        border: '1px solid rgba(0,0,0,0.06)', borderRadius: 7, color: '#111111',
                        fontSize:13, fontFamily: 'inherit', padding: '9px 12px', outline: 'none' }}/>
                  </div>
                ))}
              </div>
              {[
                {label:'Email address', val:em, set:setEm, ph:'you@example.com', type:'email', note:'Certificate delivery'},
                {label:'Phone number',  val:ph, set:setPh, ph:'+31 6 00 000000', type:'tel'},
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize:11, fontWeight: 600, color: '#b5aea8',
                    textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 6 }}>
                    {f.label} <span style={{ color: '#0077b6' }}>*</span>
                    {f.note && <span style={{ color: '#111111', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>· {f.note}</span>}
                  </label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type||'text'}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.03)',
                      border: '1px solid rgba(0,0,0,0.06)', borderRadius: 7, color: '#111111',
                      fontSize:13, fontFamily: 'inherit', padding: '9px 12px', outline: 'none' }}/>
                </div>
              ))}
            </div>
          </div>

          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 7, padding: '10px 14px', fontSize:12, color: 'rgba(239,83,80,0.3)',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }}/> {err}
            </div>
          )}
        </div>

        {/* Right: preview + summary */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CertPreview domain={clean(domain)} fn={fn} ln={ln} em={em} product={product} years={years}/>

          <div style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:11, fontWeight: 700, color: '#b5aea8',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Order summary</div>
              {[
                { k: 'Certificate', v: PRODUCTS.find(p => p.code === product)?.name || 'RapidSSL DV' },
                { k: 'Validity',    v: `${years} year${years>1?'s':''}` },
                { k: 'Auto-renewal', v: 'Included', blue: true },
                { k: 'DNS validation', v: 'Automatic (CNAME)', blue: true },
                { k: 'Powered by', v: 'RapidSSL · DigiCert' },
              ].map(({ k, v, blue }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize:12, marginBottom: 7 }}>
                  <span style={{ color: '#b5aea8' }}>{k}</span>
                  <span style={{ color: blue ? '#111111' : '#888888', fontWeight: blue ? 500 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px 16px' }}>
              <button onClick={place} disabled={busy}
                style={{ width: '100%', background: busy ? '#1f2937' : 'linear-gradient(135deg,#2a6b5c,#1a56db)',
                  color: busy ? '#666666' : '#000000', border: 'none', borderRadius: 8,
                  padding: '13px', fontSize:14, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {busy
                  ? <><RefreshCw size={14} className="spin"/> Placing order…</>
                  : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
              </button>
              <div style={{ marginTop: 10, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['RapidSSL CA partner', '99.9% browser trust', 'DigiCert chain'].map(t => (
                  <span key={t} style={{ fontSize:10, color: '#111111', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={9} style={{ color: '#111111' }}/> {t}
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
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)',
        padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={16} color="#0077b6"/>
        <span style={{ fontSize:13, fontWeight: 600, color: '#111111' }}>Validate Domain Ownership</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background:'#f0f4fa',
            boxShadow: '0 0 0 3px rgba(245,158,11,0.2)', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize:11, color: '#111111', fontWeight: 500 }}>Awaiting DNS validation</span>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.04)',
        padding: '0 32px', display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
        {['Configure', 'Validate DNS', 'Done'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%',
              background: i === 0 ? '#111111' : i === 1 ? '#111111' : 'rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#111111' }}>
              {i === 0 ? <Check size={10}/> : i + 1}
            </div>
            <span style={{ fontSize:11, fontWeight: i === 1 ? 600 : 400,
              color: i === 0 ? '#111111' : i === 1 ? 'rgba(240,237,232,0.12)' : '#111111' }}>{s}</span>
            {i < 2 && <div style={{ width: 24, height: 1, background: i === 0 ? '#111111' : 'rgba(0,0,0,0.05)', margin: '0 4px' }}/>}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding:'min(40px,5vw) min(32px,4vw)' }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize:22, fontWeight: 800, color: '#111111', letterSpacing: '-0.4px', marginBottom: 8 }}>
            Add this TXT record to prove ownership
          </div>
          <div style={{ fontSize:13, color: '#b5aea8', lineHeight: 1.6 }}>
            Add a <strong style={{ color: '#555555' }}>TXT record</strong> to your DNS for{' '}
            <strong style={{ color: '#111111', fontFamily: 'monospace' }}>{ord.domain || clean(domain)}</strong>
          </div>
        </div>

        {/* DNS record card */}
        <div style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: 'transparent', padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            {['#0077b6','#ffbd2e','#27c93f'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'block' }}/>
            ))}
            <span style={{ fontSize:11, color: '#b5aea8', fontFamily: 'monospace', marginLeft: 8 }}>DNS record · TXT</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize:10, color: '#111111' }}>
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
                borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize:10, fontWeight: 700, color: '#111111',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</span>
                <span style={{ fontSize:12, fontFamily: 'monospace',
                  color: loading ? '#111111' : accent ? '#0077b6' : '#888888',
                  wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {loading
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={11} className="spin"/>
                        {ggsStatus === 'processing' ? 'GGS processing order…' : polling ? 'Fetching from RapidSSL…' : 'Waiting…'}
                      </span>
                    : v}
                </span>
                {copy && v && !loading && <CopyBtn text={v}/>}
              </div>
            ))}
          </div>

          {!(ord?.dcv_txt_value || ord?.dcv_cname_value) && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)',
              background: 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={11} className="spin" style={{ color: '#93c5fd', flexShrink: 0 }}/>
              <span style={{ fontSize:11, color: '#93c5fd', lineHeight: 1.5 }}>
                RapidSSL is provisioning your DNS validation record. This typically takes 1–5 minutes. Checking automatically every 5 seconds — no action needed.
              </span>
            </div>
          )}
          {res?.dns_auto && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)',
              background: res.dns_auto.ok ? 'rgba(52,211,153,0.06)' : 'rgba(220,38,38,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {res.dns_auto.ok
                ? <Check size={12} style={{ color: '#0077b6', flexShrink: 0, marginTop: 1 }}/>
                : <AlertTriangle size={12} style={{ color: '#0077b6', flexShrink: 0, marginTop: 1 }}/>}
              <span style={{ fontSize:11, color: res.dns_auto.ok ? '#0077b6' : '#0077b6', lineHeight: 1.5 }}>
                {res.dns_auto.ok
                  ? `Record added via ${res.dns_auto.provider}. Checking automatically every 5 seconds…`
                  : res.dns_auto.message}
              </span>
            </div>
          )}
          {res && res.ggs_status && res.ggs_status !== 'active' && !res.dns_auto && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)',
              background: 'rgba(245,158,11,0.06)', display: 'flex', gap: 8 }}>
              <AlertTriangle size={12} style={{ color: '#111111', flexShrink: 0, marginTop: 1 }}/>
              <span style={{ fontSize:11, color: '#9a6400' }}>
                Not validated yet ({res.ggs_status}) — DNS may still be propagating. Try again in a minute.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {ord?.dns_auto_added
            ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.3)', borderRadius: 7, padding: '10px 18px',
                fontSize:13, color: '#00a550', fontWeight: 500 }}>
                <RefreshCw size={13} className="spin" style={{color:'#00a550'}}/> DNS record added via {ord.dns_provider || 'provider'} · checking every 5s…
              </div>
            ) : (
              <button onClick={addDns} disabled={dns || !(ord.dcv_txt_value || ord.dcv_cname_value)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0077b6',
                  color: '#111111', border: 'none', borderRadius: 7, padding: '10px 18px',
                  fontSize:13, fontWeight: 600, cursor: dns || !(ord.dcv_txt_value || ord.dcv_cname_value) ? 'not-allowed' : 'pointer',
                  opacity: !(ord.dcv_txt_value || ord.dcv_cname_value) ? 0.4 : 1, fontFamily: 'inherit' }}>
                {dns ? <><RefreshCw size={13} className="spin"/> Adding…</> : <><Zap size={13}/> Auto-Add DNS Record</>}
              </button>
            )
          }
          <button onClick={check} disabled={chk}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.05)',
              color: '#555555', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 7,
              padding: '10px 18px', fontSize:13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            {chk ? <><RefreshCw size={13} className="spin"/> Checking…</> : <><RefreshCw size={13}/> Check Status</>}
          </button>
          <button onClick={reset}
            style={{ background: 'none', border: 'none', color: '#111111', fontSize:12,
              cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
            ← Start over
          </button>
        </div>

        <div style={{ background: 'rgba(0,119,182,0.07)', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10 }}>
          <Zap size={14} style={{ color: '#0077b6', flexShrink: 0, marginTop: 1 }}/>
          <div style={{ fontSize:12, color: '#b5aea8', lineHeight: 1.6 }}>
            <strong style={{ color: '#555555' }}>Fully automatic:</strong> If your DNS provider is connected under{' '}
            <strong style={{ color: '#555555' }}>More → DNS Providers</strong>, click{' '}
            <strong style={{ color: '#555555' }}>Auto-Add DNS Record</strong> and SSLVault handles validation end-to-end.
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
  return <CertIssuedScreen
    domain={clean(domain)}
    product={product}
    ord={ord}
    user={user}
    onDashboard={onDashboard}
    onIssueAnother={reset}
    nav={nav}
  />
}

function CertIssuedScreen({ domain, product, ord, user, onDashboard, onIssueAnother, nav }) {
  const F = "'Inter',system-ui,sans-serif"
  const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
  const productName = PRODUCTS.find(p => p.code === product)?.name || 'RapidSSL DV'

  // Detect install method — read agents and cPanel creds saved for this user
  const [installMethod, setInstallMethod] = useState(null) // null=detecting, 'agent', 'cpanel', 'none'
  const [agentName,     setAgentName]     = useState('')
  const [cpanelHost,    setCpanelHost]    = useState('')
  const [certCopied,    setCertCopied]    = useState(false)
  const [keyVisible,    setKeyVisible]    = useState(false)

  // Cert PEM from ord if available
  const certPem = ord?.cert_pem || null
  const expiryDate = ord?.valid_till
    ? new Date(ord.valid_till).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : (() => { const d = new Date(); d.setDate(d.getDate() + 199); return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) })()
  const issuedDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  const ggsOrder = ord?.ggs_order_id || ord?.order_id || null

  useEffect(() => {
    if (!user) { setInstallMethod('none'); return }
    const detect = async () => {
      try {
        // Check for registered agents
        const { data: agents } = await supabase
          .from('servers')
          .select('id, nickname, hostname')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
        if (agents && agents.length > 0) {
          setInstallMethod('agent')
          setAgentName(agents[0].nickname || agents[0].hostname || 'your server')
          return
        }
        // Check for saved cPanel credentials
        const { data: cpanel } = await supabase
          .from('cpanel_credentials')
          .select('id, hostname')
          .eq('user_id', user.id)
          .limit(1)
        if (cpanel && cpanel.length > 0) {
          setInstallMethod('cpanel')
          setCpanelHost(cpanel[0].hostname || 'your cPanel server')
          return
        }
        setInstallMethod('none')
      } catch {
        setInstallMethod('none')
      }
    }
    detect()
  }, [user])

  const goToDashboard = () => {
    sessionStorage.setItem('install_domain', domain)
    if (onDashboard) onDashboard(); else nav('/dashboard')
  }

  const goToInstall = (method) => {
    sessionStorage.setItem('install_domain', domain)
    if (method === 'agent') sessionStorage.setItem('install_method_hint', 'agent')
    if (method === 'cpanel') sessionStorage.setItem('install_method_hint', 'cpanel')
    if (onDashboard) onDashboard(); else nav('/dashboard')
  }

  const copyCert = () => {
    if (!certPem) return
    try { navigator.clipboard.writeText(certPem) } catch {}
    setCertCopied(true); setTimeout(() => setCertCopied(false), 2000)
  }

  const dl = () => {
    if (!certPem) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([certPem], { type: 'text/plain' }))
    a.download = domain + '-cert.pem'; a.click()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
      fontFamily: F }}>
      <div style={{ maxWidth: 480, width: '100%', animation: 'fadeUp 0.3s ease both' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(0,0,0,0.07)',
            border: '1px solid rgba(0,119,182,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldCheck size={26} color="#0077b6" strokeWidth={2}/>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111111', letterSpacing: '-0.4px',
            margin: '0 0 6px' }}>
            Certificate issued
          </h2>
          <p style={{ fontSize: 13, color: '#555555', margin: 0 }}>
            {productName} · GoGetSSL / RapidSSL · auto-renewal active
          </p>
        </div>

        {/* ── Cert card ── */}
        <div style={{ border: '1px solid rgba(0,119,182,0.2)', borderRadius: 12,
          overflow: 'hidden', marginBottom: 16, background: 'rgba(0,0,0,0.02)' }}>

          {/* Card header bar */}
          <div style={{ background: 'rgba(0,119,182,0.12)', borderBottom: '1px solid rgba(0,0,0,0.1)',
            padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7,
              background: 'rgba(0,165,80,0.09)', border: '1px solid rgba(0,165,80,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={14} color="#4ade80" strokeWidth={2}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111111',
                fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {domain}
              </div>
              <div style={{ fontSize: 11, color: '#555555', marginTop: 1 }}>
                SHA-256 · RSA 2048 · DV
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(0,165,80,0.09)', color: '#00a550',
              border: '1px solid rgba(0,165,80,0.22)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00a550',
                animation: 'v2-pulse-anim 1.8s infinite' }}/>
              Active
            </span>
          </div>

          {/* Cert fields */}
          {[
            { label: 'Issued by',   value: 'GoGetSSL · RapidSSL Global TLS RSA4096', mono: true },
            { label: 'Valid from',  value: issuedDate },
            { label: 'Expires',     value: expiryDate + ' · 199 days', green: true },
            ggsOrder ? { label: 'GGS order', value: '#' + ggsOrder, mono: true } : null,
          ].filter(Boolean).map(({ label, value, mono, green }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 16px',
              borderBottom: '1px solid rgba(0,0,0,0.05)', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#555555', flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600,
                color: green ? '#00a550' : '#ffffff',
                fontFamily: mono ? MONO : F,
                textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}

          {/* PEM actions */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
            <button onClick={copyCert} disabled={!certPem}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                cursor: certPem ? 'pointer' : 'not-allowed', fontFamily: F,
                background: certCopied ? 'rgba(0,165,80,0.09)' : 'rgba(0,0,0,0.05)',
                border: certCopied ? '0.5px solid rgba(0,165,80,0.22)' : '1px solid rgba(0,0,0,0.07)',
                color: certCopied ? '#00a550' : certPem ? '#333333' : '#b0a8a0',
                opacity: certPem ? 1 : 0.4, transition: 'all .15s' }}>
              {certCopied
                ? <><CheckCircle size={11}/> Copied</>
                : <><Copy size={11}/> Copy PEM</>}
            </button>
            <button onClick={dl} disabled={!certPem}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '7px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                cursor: certPem ? 'pointer' : 'not-allowed', fontFamily: F,
                background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)',
                color: certPem ? '#333333' : '#b0a8a0',
                opacity: certPem ? 1 : 0.4 }}>
              <ArrowRight size={11}/> Download
            </button>
          </div>
        </div>

        {/* ── Smart install panel ── */}
        {installMethod === null && (
          <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10,
            padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center',
            gap: 10, background: 'rgba(0,0,0,0.02)' }}>
            <RefreshCw size={14} color="#b0a8a0"
              style={{ animation: 'spin .8s linear infinite', flexShrink: 0 }}/>
            <span style={{ fontSize: 12, color: '#555555' }}>Checking your install setup…</span>
          </div>
        )}

        {installMethod === 'agent' && (
          <div style={{ border: '1px solid rgba(0,165,80,0.22)', borderRadius: 10,
            padding: '14px 16px', marginBottom: 16,
            background: 'rgba(74,222,128,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00a550',
                animation: 'v2-pulse-anim 1.8s infinite', flexShrink: 0 }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#00a550' }}>
                Auto-installing on your server
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#00a550', opacity: 0.75, margin: '0 0 10px', lineHeight: 1.6, paddingLeft: 15 }}>
              Agent on <strong style={{ color: '#00a550' }}>{agentName}</strong> will
              install this cert within 5 minutes. No action needed.
            </p>
            <button onClick={goToDashboard}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: 'rgba(0,165,80,0.09)', border: '1px solid rgba(0,165,80,0.22)',
                color: '#00a550' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}

        {installMethod === 'cpanel' && (
          <div style={{ border: '1px solid rgba(0,119,182,0.2)', borderRadius: 10,
            padding: '14px 16px', marginBottom: 16,
            background: 'rgba(0,119,182,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0077b6',
                animation: 'v2-pulse-anim 1.8s infinite', flexShrink: 0 }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0077b6' }}>
                Auto-installing via cPanel
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#555555', margin: '0 0 10px', lineHeight: 1.6, paddingLeft: 15 }}>
              cPanel cron will install via UAPI on <strong style={{ color: '#333333' }}>{cpanelHost}</strong>. No action needed.
            </p>
            <button onClick={goToDashboard}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                background: 'rgba(0,119,182,0.09)', border: '1px solid rgba(0,119,182,0.2)',
                color: '#0077b6' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}

        {installMethod === 'none' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555555',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
              How would you like to install?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: Server,    label: 'VPS agent',  sub: 'Zero-touch · auto-renews', method: 'agent',  accent: false },
                { icon: Globe,     label: 'cPanel',     sub: 'No SSH needed',            method: 'cpanel', accent: true  },
                { icon: ArrowRight,label: 'Download',   sub: 'Manual install',           method: 'manual', accent: false },
              ].map(({ icon: Icon, label, sub, method, accent }) => (
                <button key={method}
                  onClick={() => method === 'manual' ? goToDashboard() : goToInstall(method)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
                    fontFamily: F, textAlign: 'center', transition: 'all .15s',
                    background: accent ? 'rgba(0,119,182,0.07)' : 'rgba(0,0,0,0.02)',
                    border: accent ? '1px solid rgba(0,119,182,0.25)' : '1px solid rgba(0,0,0,0.07)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,119,182,0.09)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = accent ? 'rgba(0,119,182,0.07)' : 'rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = accent ? 'rgba(0,119,182,0.25)' : 'rgba(0,0,0,0.07)' }}>
                  <Icon size={20} color={accent ? '#0077b6' : '#b0a8a0'} strokeWidth={1.8}/>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111111', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#555555', lineHeight: 1.4 }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom actions ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={goToDashboard}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 7, padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: F,
              background: '#0077b6', border: 'none', color: '#111111' }}>
            <Server size={14}/> Go to dashboard
          </button>
          <button onClick={onIssueAnother}
            style={{ padding: '11px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: F,
              background: 'rgba(0,0,0,0.05)', color: '#555555',
              border: '1px solid rgba(0,0,0,0.07)' }}>
            Issue another
          </button>
        </div>

      </div>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes v2-pulse-anim { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }
      `}</style>
    </div>
  )
}
