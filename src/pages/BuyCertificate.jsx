import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, RotateCcw, Clock,
         ShieldCheck, Wifi, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const F    = "'DM Sans','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"
const BLUE = '#0077b6'
const BLUE_BG = 'rgba(0,119,182,0.06)'
const BORDER = 'rgba(0,119,182,0.12)'

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
  const [ok,setOk]=useState(false)
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),1800)}}
      style={{ background:ok?'rgba(0,165,80,0.08)':'rgba(0,119,182,0.07)', border:`1px solid ${ok?'rgba(0,165,80,0.2)':'rgba(0,119,182,0.2)'}`, borderRadius:6, cursor:'pointer', color:ok?'#00a550':'#0077b6', display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'4px 9px', fontFamily:F, transition:'all .15s' }}>
      {ok?<><Check size={10}/> Copied</>:<><Copy size={10}/> Copy</>}
    </button>
  )
}

function CertPreview({ domain, fn, ln, em, product, years }) {
  const d  = domain||'yourdomain.com'
  const p  = PRODUCTS.find(x=>x.code===product)||PRODUCTS[0]
  const cn = p.wildcard?(d.startsWith('*.')?d:`*.${d}`):d
  const issued = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const exp    = new Date(Date.now()+years*365*86400000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const name   = [fn,ln].filter(Boolean).join(' ')||'Your Name'
  return (
    <div style={{ background:'#ffffff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,119,182,0.08)', fontFamily:F }}>
      <div style={{ background:'linear-gradient(135deg,#0077b6,#0091d6)', padding:'16px 18px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <ShieldCheck size={18} color="#fff" strokeWidth={2}/>
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:13,fontWeight:700,color:'#fff',letterSpacing:'-0.2px' }}>SSL Certificate — {p.name}</div>
          <div style={{ fontSize:10,color:'rgba(255,255,255,0.75)',marginTop:1 }}>DigiCert / RapidSSL trust chain</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:5,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff',letterSpacing:'0.6px' }}>LIVE</div>
      </div>
      <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:9 }}>
        {[
          {label:'Subject',    value:`CN=${cn}`},
          {label:'Issued to',  value:name},
          {label:'Issuer',     value:'RapidSSL Global TLS RSA4096 SHA256 2022 CA1'},
          {label:'Valid from', value:issued},
          {label:'Valid until',value:exp, highlight:true},
          {label:'Validity',   value:`${years} year${years>1?'s':''}`},
          {label:'Key',        value:'RSA 2048-bit / SHA-256'},
          {label:'Contact',    value:em||'your@email.com'},
        ].map(({label,value,highlight})=>(
          <div key={label} style={{ display:'grid', gridTemplateColumns:'76px 1fr', gap:8 }}>
            <span style={{ fontSize:9,fontWeight:700,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.05em',paddingTop:1 }}>{label}</span>
            <span style={{ fontSize:11,color:highlight?BLUE:'#3d4a58',wordBreak:'break-all',fontFamily:MONO,fontWeight:highlight?700:400,lineHeight:1.4 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 18px', borderTop:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:6, background:BLUE_BG }}>
        <div style={{ width:7,height:7,borderRadius:'50%',background:domain?'#00a550':'#7a8694',boxShadow:domain?'0 0 0 3px rgba(0,165,80,0.2)':undefined }}/>
        <span style={{ fontSize:10,color:'#7a8694',fontFamily:F }}>{domain?'Ready to issue':'Enter domain to preview'}</span>
        <span style={{ marginLeft:'auto',fontSize:9,fontWeight:800,color:BLUE,textTransform:'uppercase',letterSpacing:'0.05em' }}>{p.badge}</span>
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
  const StepBar = ({current}) => (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24, fontFamily:F }}>
      {[{n:1,label:'Configure'},{n:2,label:'Validate DNS'},{n:3,label:'Done'}].map(({n,label},i)=>{
        const done=current>n,active=current===n
        return (
          <div key={n} style={{ display:'flex', alignItems:'center', flex:i<2?1:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
              <div style={{ width:27,height:27,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,transition:'all .2s',background:done?'#00a550':active?BLUE:'rgba(0,119,182,0.08)',color:done||active?'#fff':'#7a8694',boxShadow:active?`0 0 0 4px rgba(0,119,182,0.14)`:done?'0 0 0 3px rgba(0,165,80,0.12)':undefined }}>
                {done?<Check size={12}/>:n}
              </div>
              <span style={{ fontSize:11,fontWeight:active?700:500,color:active?BLUE:done?'#00a550':'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap' }}>{label}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:2,borderRadius:1,margin:'0 10px',background:done?'rgba(0,165,80,0.25)':'rgba(0,119,182,0.1)',transition:'background .3s' }}/>}
          </div>
        )
      })}
    </div>
  )

  if (step === 'form') return (
    <div style={{ minHeight:embedded?'auto':'100vh', background:embedded?'transparent':'#f0f4fa', fontFamily:F }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      {!embedded&&(
        <div style={{ background:'#fff', borderBottom:`1px solid ${BORDER}`, padding:'0 32px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 6px rgba(0,119,182,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32,height:32,background:'linear-gradient(135deg,#0077b6,#0091d6)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,119,182,0.25)' }}>
              <Shield size={14} color="#fff"/>
            </div>
            <span style={{ fontSize:14,fontWeight:700,color:'#0d1117',letterSpacing:'-0.1px' }}>Issue SSL Certificate</span>
            <span style={{ background:'rgba(0,165,80,0.1)',color:'#00a550',border:'1px solid rgba(0,165,80,0.22)',fontSize:9,fontWeight:800,letterSpacing:'0.7px',textTransform:'uppercase',borderRadius:20,padding:'2px 8px' }}>LIVE</span>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {[{icon:<Clock size={11}/>,t:'~5 min'},{icon:<RotateCcw size={11}/>,t:'Auto-renewal'},{icon:<ShieldCheck size={11}/>,t:'DigiCert chain'}].map(({icon,t})=>(
              <span key={t} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#7a8694',fontWeight:500 }}>{icon}{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth:embedded?'100%':1100, margin:'0 auto', padding:embedded?'16px 20px 40px':'32px 32px 72px', display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr clamp(280px,30vw,340px)', gap:24, alignItems:'start', fontFamily:F }}>

        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          <StepBar current={1}/>

          {/* Cert type card */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:18, boxShadow:'0 2px 10px rgba(0,119,182,0.06)' }}>
            <div style={{ padding:'13px 20px', borderBottom:`1px solid ${BORDER}`, background:BLUE_BG }}>
              <span style={{ fontSize:11,fontWeight:700,color:BLUE,textTransform:'uppercase',letterSpacing:'0.06em' }}>Certificate Type</span>
            </div>
            <div style={{ padding:'18px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {PRODUCTS.map(p=>(
                  <div key={p.code} onClick={()=>setProduct(p.code)}
                    style={{ padding:'16px 14px', borderRadius:12, cursor:'pointer', transition:'all .18s',
                      background:product===p.code?BLUE_BG:'#f8fafd',
                      border:product===p.code?`2px solid ${BLUE}`:`1.5px solid rgba(0,119,182,0.12)`,
                      boxShadow:product===p.code?`0 0 0 3px rgba(0,119,182,0.08), 0 2px 8px rgba(0,119,182,0.1)`:undefined,
                      position:'relative' }}>
                    {product===p.code&&<div style={{ position:'absolute',top:10,right:10,width:18,height:18,borderRadius:'50%',background:BLUE,display:'flex',alignItems:'center',justifyContent:'center' }}><Check size={10} color="#fff"/></div>}
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                      <ShieldCheck size={16} color={product===p.code?BLUE:'#94a3b8'} strokeWidth={2}/>
                      <span style={{ fontSize:13,fontWeight:700,color:'#0d1117' }}>{p.name}</span>
                    </div>
                    <div style={{ display:'inline-flex',alignItems:'center',gap:4,background:product===p.code?'rgba(0,119,182,0.12)':'rgba(0,119,182,0.06)',border:`1px solid ${product===p.code?'rgba(0,119,182,0.25)':'rgba(0,119,182,0.12)'}`,borderRadius:5,padding:'1px 7px',marginBottom:6 }}>
                      <span style={{ fontSize:9,fontWeight:800,color:BLUE,letterSpacing:'0.05em' }}>{p.badge}</span>
                    </div>
                    <div style={{ fontSize:11,color:'#7a8694',lineHeight:1.5 }}>{p.sub}</div>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11,fontWeight:700,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:7 }}>
                  Domain Name <span style={{ color:'#c0392b' }}>*</span>
                  {PRODUCTS.find(p=>p.code===product)?.wildcard&&<span style={{ color:'#7a8694',fontWeight:400,textTransform:'none',letterSpacing:0,marginLeft:6 }}>· enter root domain</span>}
                </label>
                {profileLoading&&<div style={{ fontSize:10,color:'#7a8694',display:'flex',alignItems:'center',gap:5,marginBottom:6 }}><div style={{ width:8,height:8,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.25)',borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/> Loading profile…</div>}
                <div style={{ position:'relative' }}>
                  <Globe size={15} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#7a8694',pointerEvents:'none' }}/>
                  <input value={domain} onChange={e=>setD(e.target.value)} placeholder="yourdomain.com"
                    style={{ width:'100%',boxSizing:'border-box',background:'#f8fafd',border:`1.5px solid rgba(0,119,182,0.15)`,borderRadius:10,color:'#0d1117',fontSize:16,fontFamily:MONO,fontWeight:700,padding:'14px 16px 14px 40px',outline:'none',transition:'all .15s',letterSpacing:'-0.2px' }}
                    onFocus={e=>{e.target.style.borderColor=BLUE;e.target.style.boxShadow='0 0 0 3px rgba(0,119,182,0.1)';e.target.style.background='#fff'}}
                    onBlur={e=>{e.target.style.borderColor='rgba(0,119,182,0.15)';e.target.style.boxShadow='none';e.target.style.background='#f8fafd'}}/>
                </div>
              </div>

              {/* Validity */}
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:7 }}>Validity Period</label>
                <div style={{ padding:'14px 16px',borderRadius:10,border:`1.5px solid ${BLUE}`,background:BLUE_BG,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <span style={{ fontSize:14,fontWeight:700,color:'#0d1117' }}>1 year</span>
                    <div style={{ fontSize:11,color:'#7a8694',marginTop:2 }}>12 months · auto-renews before expiry</div>
                  </div>
                  <span style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:BLUE }}><Check size={13}/> Selected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:18, boxShadow:'0 2px 10px rgba(0,119,182,0.06)' }}>
            <div style={{ padding:'13px 20px', borderBottom:`1px solid ${BORDER}`, background:BLUE_BG, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11,fontWeight:700,color:BLUE,textTransform:'uppercase',letterSpacing:'0.06em' }}>Contact Details</span>
              <span style={{ fontSize:11,color:'#7a8694' }}>Required by certificate authority</span>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[{label:'First name',val:fn,set:setFn,ph:'John'},{label:'Last name',val:ln,set:setLn,ph:'Smith'}].map(f=>(
                  <div key={f.label}>
                    <label style={{ fontSize:11,fontWeight:700,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6 }}>{f.label} <span style={{ color:'#c0392b' }}>*</span></label>
                    <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                      style={{ width:'100%',boxSizing:'border-box',background:'#f8fafd',border:'1.5px solid rgba(0,119,182,0.15)',borderRadius:9,color:'#0d1117',fontSize:13,fontFamily:F,padding:'11px 14px',outline:'none',transition:'all .15s' }}
                      onFocus={e=>{e.target.style.borderColor=BLUE;e.target.style.boxShadow='0 0 0 3px rgba(0,119,182,0.1)'}}
                      onBlur={e=>{e.target.style.borderColor='rgba(0,119,182,0.15)';e.target.style.boxShadow='none'}}/>
                  </div>
                ))}
              </div>
              {[{label:'Email address',val:em,set:setEm,ph:'you@example.com',type:'email',note:'Certificate delivery'},{label:'Phone number',val:ph,set:setPh,ph:'+31 6 00 000000',type:'tel'}].map(f=>(
                <div key={f.label}>
                  <label style={{ fontSize:11,fontWeight:700,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6 }}>
                    {f.label} <span style={{ color:'#c0392b' }}>*</span>
                    {f.note&&<span style={{ color:'#7a8694',fontWeight:400,textTransform:'none',letterSpacing:0,marginLeft:6 }}>· {f.note}</span>}
                  </label>
                  <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} type={f.type||'text'}
                    style={{ width:'100%',boxSizing:'border-box',background:'#f8fafd',border:'1.5px solid rgba(0,119,182,0.15)',borderRadius:9,color:'#0d1117',fontSize:13,fontFamily:F,padding:'11px 14px',outline:'none',transition:'all .15s' }}
                    onFocus={e=>{e.target.style.borderColor=BLUE;e.target.style.boxShadow='0 0 0 3px rgba(0,119,182,0.1)'}}
                    onBlur={e=>{e.target.style.borderColor='rgba(0,119,182,0.15)';e.target.style.boxShadow='none'}}/>
                </div>
              ))}
            </div>
          </div>

          {err&&(
            <div style={{ background:'rgba(192,57,43,0.06)',border:'1px solid rgba(192,57,43,0.22)',borderRadius:10,padding:'12px 16px',fontSize:12,color:'#c0392b',display:'flex',alignItems:'center',gap:8,marginBottom:8,fontWeight:500 }}>
              <AlertTriangle size={13} style={{ flexShrink:0 }}/> {err}
            </div>
          )}
        </div>

        {/* Right: preview + order summary */}
        <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:16 }}>
          <CertPreview domain={clean(domain)} fn={fn} ln={ln} em={em} product={product} years={years}/>

          <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,119,182,0.06)' }}>
            <div style={{ padding:'13px 20px', borderBottom:`1px solid ${BORDER}`, background:BLUE_BG }}>
              <span style={{ fontSize:11,fontWeight:700,color:BLUE,textTransform:'uppercase',letterSpacing:'0.06em' }}>Order Summary</span>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {[{k:'Certificate',v:PRODUCTS.find(p=>p.code===product)?.name||'RapidSSL DV'},{k:'Validity',v:`${years} year${years>1?'s':''}`},{k:'Auto-renewal',v:'Included',acc:true},{k:'DNS validation',v:'Automatic (CNAME)',acc:true},{k:'Powered by',v:'RapidSSL · DigiCert'}].map(({k,v,acc})=>(
                <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:9 }}>
                  <span style={{ color:'#7a8694',fontWeight:500 }}>{k}</span>
                  <span style={{ color:acc?'#0d1117':'#3d4a58',fontWeight:acc?700:500 }}>{v}</span>
                </div>
              ))}
              <button onClick={place} disabled={busy}
                style={{ width:'100%',background:busy?'rgba(0,119,182,0.35)':'#0077b6',color:'#fff',border:'none',borderRadius:10,padding:'14px',fontSize:14,fontWeight:800,cursor:busy?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:F,transition:'all .18s',marginTop:6,boxShadow:busy?undefined:'0 4px 16px rgba(0,119,182,0.32)',letterSpacing:'-0.1px' }}
                onMouseEnter={e=>{if(!busy){e.currentTarget.style.background='#0068a0';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 22px rgba(0,119,182,0.42)'}}}
                onMouseLeave={e=>{if(!busy){e.currentTarget.style.background='#0077b6';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,119,182,0.32)'}}}>
                {busy?<><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Placing order…</>:<><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
              </button>
              <div style={{ marginTop:12,display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap' }}>
                {['RapidSSL CA partner','99.9% browser trust','DigiCert chain'].map(t=>(
                  <span key={t} style={{ fontSize:10,color:'#7a8694',display:'flex',alignItems:'center',gap:4,fontWeight:500 }}>
                    <Check size={9} style={{ color:'#00a550' }}/> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── DV ──────────────────────────────────────────────────────────────────────
  if (step === 'dv' && ord) return (
    <div style={{ minHeight:'100vh', background:embedded?'transparent':'#f0f4fa', fontFamily:F }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'28px 24px 60px' }}>
        <StepBar current={2}/>

        {/* Status badge + title */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:7,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.22)',borderRadius:20,padding:'5px 14px',marginBottom:16 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#f59e0b',animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:11,fontWeight:700,color:'#9a6400',letterSpacing:'0.04em' }}>AWAITING DNS VALIDATION</span>
          </div>
          <h2 style={{ fontSize:24,fontWeight:800,color:'#0d1117',letterSpacing:'-0.4px',margin:'0 0 8px',fontFamily:F }}>Add a TXT record to prove ownership</h2>
          <p style={{ fontSize:13,color:'#7a8694',margin:0,lineHeight:1.6 }}>
            Add a <strong style={{ color:'#0d1117' }}>TXT record</strong> to your DNS for{' '}
            <strong style={{ color:BLUE,fontFamily:MONO }}>{ord.domain||clean(domain)}</strong>
          </p>
        </div>

        {/* DNS record card */}
        <div style={{ background:'#ffffff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:20, boxShadow:'0 2px 12px rgba(0,119,182,0.08)' }}>
          <div style={{ background:BLUE_BG, padding:'11px 18px', display:'flex', alignItems:'center', gap:7, borderBottom:`1px solid ${BORDER}` }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#c0392b','#f59e0b','#00a550'].map(c=><span key={c} style={{ width:9,height:9,borderRadius:'50%',background:c,display:'block' }}/>)}
            </div>
            <span style={{ fontSize:11,fontWeight:600,color:'#3d4a58',fontFamily:MONO,marginLeft:5 }}>DNS record · TXT</span>
            <span style={{ marginLeft:'auto',fontFamily:MONO,fontSize:10,fontWeight:700,color:BLUE }}>GGS #{ord.ggs_order_id||'—'}</span>
          </div>
          <div>
            {[
              {k:'Name',  v:ord.dcv_txt_name||ord.dcv_cname_name,   copy:true, loading:!(ord.dcv_txt_name||ord.dcv_cname_name)},
              {k:'Type',  v:'TXT', accent:true},
              {k:'Value', v:ord.dcv_txt_value||ord.dcv_cname_value, copy:true, loading:!(ord.dcv_txt_value||ord.dcv_cname_value)},
              {k:'TTL',   v:'300 seconds'},
            ].map(({k,v,copy,accent,loading})=>(
              <div key={k} style={{ display:'grid', gridTemplateColumns:'68px 1fr auto', alignItems:'center', padding:'12px 18px', borderBottom:`1px solid ${BORDER}` }}>
                <span style={{ fontSize:10,fontWeight:800,color:'#7a8694',textTransform:'uppercase',letterSpacing:'0.06em' }}>{k}</span>
                <span style={{ fontSize:12,fontFamily:MONO,color:loading?'#7a8694':accent?BLUE:'#0d1117',wordBreak:'break-all',lineHeight:1.5,fontWeight:accent?700:400 }}>
                  {loading
                    ? <span style={{ display:'inline-flex',alignItems:'center',gap:6,color:'#7a8694' }}>
                        <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
                        {ggsStatus==='processing'?'GGS processing…':polling?'Fetching from RapidSSL…':'Waiting…'}
                      </span>
                    : v}
                </span>
                {copy&&v&&!loading&&<CopyBtn text={v}/>}
              </div>
            ))}
          </div>

          {!(ord?.dcv_txt_value||ord?.dcv_cname_value)&&(
            <div style={{ padding:'12px 18px',background:BLUE_BG,display:'flex',alignItems:'center',gap:8 }}>
              <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:BLUE,animation:'spin .7s linear infinite',flexShrink:0 }}/>
              <span style={{ fontSize:11,color:'#3d4a58',lineHeight:1.6 }}>RapidSSL is provisioning your DNS record. Checking automatically every 5 seconds — no action needed.</span>
            </div>
          )}
          {res?.dns_auto&&(
            <div style={{ padding:'12px 18px',background:res.dns_auto.ok?'rgba(0,165,80,0.05)':'rgba(192,57,43,0.05)',display:'flex',alignItems:'flex-start',gap:8 }}>
              {res.dns_auto.ok?<Check size={13} style={{ color:'#00a550',flexShrink:0,marginTop:1 }}/>:<AlertTriangle size={13} style={{ color:'#c0392b',flexShrink:0,marginTop:1 }}/>}
              <span style={{ fontSize:11,color:res.dns_auto.ok?'#00a550':'#c0392b',lineHeight:1.6 }}>
                {res.dns_auto.ok?`Record added via ${res.dns_auto.provider}. Checking every 5 seconds…`:res.dns_auto.message}
              </span>
            </div>
          )}
          {res&&res.ggs_status&&res.ggs_status!=='active'&&!res.dns_auto&&(
            <div style={{ padding:'12px 18px',background:'rgba(154,100,0,0.05)',display:'flex',gap:8 }}>
              <AlertTriangle size={13} style={{ color:'#9a6400',flexShrink:0,marginTop:1 }}/>
              <span style={{ fontSize:11,color:'#9a6400' }}>Not validated yet ({res.ggs_status}) — DNS still propagating. Try again in a minute.</span>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          {ord?.dns_auto_added
            ? <div style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(0,165,80,0.08)',border:'1px solid rgba(0,165,80,0.2)',borderRadius:9,padding:'11px 18px',fontSize:13,color:'#00a550',fontWeight:600 }}>
                <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,165,80,0.3)',borderTopColor:'#00a550',animation:'spin .7s linear infinite' }}/>
                Record added via {ord.dns_provider||'provider'} · checking every 5s…
              </div>
            : <button onClick={addDns} disabled={dns||!(ord.dcv_txt_value||ord.dcv_cname_value)}
                style={{ display:'flex',alignItems:'center',gap:7,background:BLUE,color:'#fff',border:'none',borderRadius:9,padding:'12px 20px',fontSize:13,fontWeight:700,cursor:dns||!(ord.dcv_txt_value||ord.dcv_cname_value)?'not-allowed':'pointer',opacity:!(ord.dcv_txt_value||ord.dcv_cname_value)?0.4:1,fontFamily:F,boxShadow:'0 4px 14px rgba(0,119,182,0.3)' }}>
                {dns?<><div style={{ width:12,height:12,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Adding…</>:<><Zap size={13}/> Auto-Add DNS Record</>}
              </button>
          }
          <button onClick={check} disabled={chk}
            style={{ display:'flex',alignItems:'center',gap:7,background:'#fff',color:'#3d4a58',border:`1.5px solid ${BORDER}`,borderRadius:9,padding:'12px 18px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F,boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
            {chk?<><div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/> Checking…</>:<><RefreshCw size={13}/> Check Status</>}
          </button>
          <button onClick={reset} style={{ background:'none',border:'none',color:'#7a8694',fontSize:12,cursor:'pointer',fontFamily:F,marginLeft:'auto',fontWeight:500 }}>← Start over</button>
        </div>

        <div style={{ background:BLUE_BG,border:`1px solid ${BORDER}`,borderRadius:12,padding:'14px 18px',display:'flex',gap:10 }}>
          <Zap size={15} style={{ color:BLUE,flexShrink:0,marginTop:1 }}/>
          <div style={{ fontSize:12,color:'#3d4a58',lineHeight:1.7 }}>
            <strong style={{ color:'#0d1117' }}>Fully automatic:</strong> If your DNS provider is connected under{' '}
            <strong style={{ color:BLUE }}>More → DNS Providers</strong>, click{' '}
            <strong style={{ color:BLUE }}>Auto-Add DNS Record</strong> and SSLVault handles everything.
          </div>
        </div>
      </div>
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
