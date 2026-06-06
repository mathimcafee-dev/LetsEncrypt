import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, RotateCcw, Clock,
         ShieldCheck, Wifi, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const F    = "'DM Sans','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"

const PRODUCTS = [
  { code:'rapidssl',          name:'RapidSSL DV',       type:'DV',          badge:'DV',       sub:'DigiCert chain · 99.9% browser trust · ~5 min', wildcard:false },
  { code:'rapidssl_wildcard', name:'RapidSSL Wildcard',  type:'DV Wildcard', badge:'WILDCARD', sub:'*.yourdomain.com · all subdomains · ~5 min',     wildcard:true  },
]

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

// ── Shared input style ─────────────────────────────────────────────────────
const inp = {
  width:'100%', boxSizing:'border-box', background:'#f8fafd',
  border:'1.5px solid rgba(0,119,182,0.15)', borderRadius:9,
  color:'#0d1117', fontSize:13, fontFamily:F, padding:'11px 14px',
  outline:'none', transition:'border-color .15s',
}

function focusIn(e) { e.target.style.borderColor='#0077b6'; e.target.style.boxShadow='0 0 0 3px rgba(0,119,182,0.1)' }
function focusOut(e){ e.target.style.borderColor='rgba(0,119,182,0.15)'; e.target.style.boxShadow='none' }

function Label({ children, required, note }) {
  return (
    <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
      letterSpacing:'0.6px', color:'#7a8694', marginBottom:6 }}>
      {children}
      {required && <span style={{ color:'#c0392b', marginLeft:3 }}>*</span>}
      {note && <span style={{ color:'#7a8694', fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6 }}>· {note}</span>}
    </label>
  )
}

function SectionCard({ title, right, children }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:14,
      overflow:'hidden', boxShadow:'0 2px 10px rgba(0,119,182,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 22px', borderBottom:'1px solid rgba(0,119,182,0.08)',
        background:'rgba(0,119,182,0.02)' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#0077b6', textTransform:'uppercase', letterSpacing:'0.6px' }}>{title}</span>
        {right && <span style={{ fontSize:11, color:'#7a8694' }}>{right}</span>}
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </div>
  )
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),1800) }}
      style={{ background:ok?'rgba(0,165,80,0.08)':'rgba(0,119,182,0.07)', border:`1px solid ${ok?'rgba(0,165,80,0.2)':'rgba(0,119,182,0.2)'}`,
        borderRadius:5, cursor:'pointer', color:ok?'#00a550':'#0077b6', display:'flex', alignItems:'center',
        gap:3, fontSize:10, fontWeight:600, padding:'3px 8px', fontFamily:F }}>
      {ok ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  )
}

function CertPreview({ domain, fn, ln, em, product, years }) {
  const d  = domain || 'yourdomain.com'
  const p  = PRODUCTS.find(p=>p.code===product) || PRODUCTS[0]
  const cn = p.wildcard ? (d.startsWith('*.')?d:`*.${d}`) : d
  const issued = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const exp    = new Date(Date.now()+years*365*86400000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const name   = [fn,ln].filter(Boolean).join(' ') || 'Your Name'
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.15)', borderRadius:14,
      overflow:'hidden', boxShadow:'0 4px 20px rgba(0,119,182,0.1)' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0077b6 0%,#0091d6 100%)', padding:'16px 18px',
        display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <ShieldCheck size={18} color="#ffffff" strokeWidth={2}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#ffffff', letterSpacing:'-0.2px' }}>SSL Certificate — {p.name}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:1 }}>DigiCert / RapidSSL trust chain</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:5, padding:'3px 8px',
          fontSize:9, fontWeight:800, color:'#ffffff', letterSpacing:'0.8px' }}>LIVE</div>
      </div>
      {/* Fields */}
      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:9 }}>
        {[
          { label:'Subject',    value:`CN=${cn}` },
          { label:'Issued to',  value:name },
          { label:'Issuer',     value:'RapidSSL Global TLS RSA4096 SHA256 2022 CA1' },
          { label:'Valid from', value:issued },
          { label:'Valid until',value:exp, highlight:true },
          { label:'Validity',   value:`${years} year${years>1?'s':''}` },
          { label:'Key',        value:'RSA 2048-bit / SHA-256' },
          { label:'Contact',    value:em||'your@email.com' },
        ].map(({label,value,highlight})=>(
          <div key={label} style={{ display:'grid', gridTemplateColumns:'78px 1fr', gap:8 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.5px', paddingTop:1 }}>{label}</span>
            <span style={{ fontSize:11, color:highlight?'#0077b6':'#3d4a58', wordBreak:'break-all', fontWeight:highlight?700:400, fontFamily:highlight?F:MONO }}>{value}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding:'10px 18px', borderTop:'1px solid rgba(0,119,182,0.08)',
        display:'flex', alignItems:'center', gap:6, background:'rgba(0,119,182,0.02)' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:domain?'#00a550':'#7a8694',
          boxShadow:domain?'0 0 0 3px rgba(0,165,80,0.2)':undefined }}/>
        <span style={{ fontSize:10, color:'#7a8694', fontFamily:F }}>{domain?'Ready to issue':'Enter domain to preview'}</span>
        <span style={{ marginLeft:'auto', fontSize:9, fontWeight:700, color:'#0077b6',
          textTransform:'uppercase', letterSpacing:'0.4px', fontFamily:F }}>{p.name}</span>
      </div>
    </div>
  )
}

const clean = v => v.trim().replace(/^https?:\/\//,'').replace(/\/.*/,'').toLowerCase()

export default function BuyCertificate({ nav, onDashboard, onIssueAnother, embedded=false }) {
  const isMobile = useIsMobile()
  const { user, loading:authLoading } = useAuth()
  const [step,    setStep]    = useState('form')
  const [product, setProduct] = useState('rapidssl')
  const [domain,  setD]       = useState('')
  const [years,   setYears]   = useState(1)
  const [fn,      setFn]      = useState('')
  const [ln,      setLn]      = useState('')
  const [ph,      setPh]      = useState('')
  const [em,      setEm]      = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [ord,     setOrd]     = useState(null)
  const [chk,     setChk]     = useState(false)
  const [dns,     setDns]     = useState(false)
  const [res,     setRes]     = useState(null)
  const [polling, setPoll]    = useState(false)
  const [ggsStatus,setGgsStatus] = useState('')

  useEffect(()=>{ const p=sessionStorage.getItem('prefill_domain'); if(p){setD(p);sessionStorage.removeItem('prefill_domain')} },[])
  useEffect(()=>{ if(user) setEm(e=>e||user.email||'') },[user])

  const [profileLoading, setProfileLoading] = useState(false)
  useEffect(()=>{
    const d=clean(domain); if(!d||!user) return
    const t=setTimeout(async()=>{
      setProfileLoading(true)
      try { const r=await call('get_profile',{domain:d}); if(r.profile){if(r.profile.first_name)setFn(r.profile.first_name);if(r.profile.last_name)setLn(r.profile.last_name);if(r.profile.email)setEm(r.profile.email);if(r.profile.phone)setPh(r.profile.phone)} } catch(_){}
      setProfileLoading(false)
    },600); return()=>clearTimeout(t)
  },[domain,user])

  useEffect(()=>{
    if(step!=='dv'||!ord?.order_id) return
    let n=0, dnsAttempted=false; setPoll(true)
    ;(async()=>{ try { const s=await call('check_status',{order_id:ord.order_id}); setGgsStatus(s.ggs_status||''); if(s.status==='active'||s.status==='issued'||s.ggs_status==='active'){setStep('done');setPoll(false);return} if(s.dcv_txt_value||s.dcv_cname_value){setOrd(p=>({...p,dcv_txt_name:s.dcv_txt_name||s.dcv_cname_name||p.dcv_txt_name,dcv_txt_value:s.dcv_txt_value||s.dcv_cname_value||p.dcv_txt_value,dcv_cname_name:s.dcv_cname_name||p.dcv_cname_name,dcv_cname_value:s.dcv_cname_value||p.dcv_cname_value}))} } catch{} })()
    const iv=setInterval(async()=>{
      n++; try {
        const s=await call('check_status',{order_id:ord.order_id}); setGgsStatus(s.ggs_status||'')
        if(s.status==='active'||s.status==='issued'||s.ggs_status==='active'){setStep('done');clearInterval(iv);setPoll(false);return}
        if(s.dcv_txt_value||s.dcv_cname_value){
          setOrd(p=>({...p,dcv_txt_name:s.dcv_txt_name||s.dcv_cname_name||p.dcv_txt_name,dcv_txt_value:s.dcv_txt_value||s.dcv_cname_value||p.dcv_txt_value,dcv_cname_name:s.dcv_cname_name||p.dcv_cname_name,dcv_cname_value:s.dcv_cname_value||p.dcv_cname_value}))
          if(!dnsAttempted){
            dnsAttempted=true
            try {
              const {data:{session}}=await supabase.auth.getSession(); setDns(true)
              const dnsR=await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'auto_add',user_id:session.user.id,domain:ord.domain,txt_name:s.dcv_txt_name||s.dcv_cname_name||ord.domain,txt_value:s.dcv_txt_value||s.dcv_cname_value})})
              const dnsRes=await dnsR.json(); setDns(false); setRes({dns_auto:dnsRes})
              if(dnsRes.ok){setOrd(p=>({...p,dns_auto_added:true,dns_provider:dnsRes.provider||''}));try{const s2=await call('check_status',{order_id:ord.order_id});if(s2.status==='active'||s2.status==='issued'||s2.ggs_status==='active'){setStep('done');clearInterval(iv)}}catch{}}
            } catch{setDns(false)}
          }
        }
      } catch{}
      if(n>=120){clearInterval(iv);setPoll(false)}
    },5000)
    return()=>{clearInterval(iv);setPoll(false)}
  },[step,ord?.order_id])

  const call=async(action,extra={})=>{
    const {data:{session}}=await supabase.auth.getSession()
    const r=await fetch(`${SUPABASE_URL}/functions/v1/gogetssl-issue`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,...extra})})
    return r.json()
  }

  const place=async()=>{
    const d=clean(domain); if(!d){setErr('Enter a domain name');return} if(!fn.trim()){setErr('First name required');return} if(!ln.trim()){setErr('Last name required');return} if(!em.trim()){setErr('Email required');return} if(!ph.trim()){setErr('Phone required');return}
    setErr('');setBusy(true)
    const r=await call('place_order',{domain:d,years,product_code:product,firstName:fn.trim(),lastName:ln.trim(),adminEmail:em.trim(),phone:ph.trim(),period:years*12})
    setBusy(false); if(r.error){setErr(r.error);return}
    const ordData={...r,dcv_txt_name:r.dcv_txt_name||r.dcv_cname_name,dcv_txt_value:r.dcv_txt_value||r.dcv_cname_value}
    setOrd(ordData)
    if(r.auto_issued||r.status==='active'||r.status==='issued'){setStep('done')} else{setStep('dv')}
  }

  const check=async()=>{
    setChk(true);setRes(null); const r=await call('check_status',{order_id:ord.order_id}); setChk(false);setRes(r)
    if(r.status==='active'||r.status==='issued'||r.ggs_status==='active')setStep('done')
    if(r.dcv_txt_value||r.dcv_cname_value)setOrd(p=>({...p,dcv_txt_name:r.dcv_txt_name||r.dcv_cname_name,dcv_txt_value:r.dcv_txt_value||r.dcv_cname_value,dcv_cname_name:r.dcv_cname_name,dcv_cname_value:r.dcv_cname_value}))
  }

  const addDns=async()=>{
    setDns(true);setRes(null)
    try {
      const {data:{session}}=await supabase.auth.getSession()
      const r=await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'auto_add',user_id:session.user.id,domain:ord.domain||clean(domain),txt_name:ord.dcv_txt_name||ord.dcv_cname_name||(ord.domain||clean(domain)),txt_value:ord.dcv_txt_value||ord.dcv_cname_value})})
      setRes({dns_auto:await r.json()})
    } catch(e){setRes({dns_auto:{ok:false,message:String(e)}})}
    setDns(false)
  }

  const reset=()=>{setStep('form');setD('');setOrd(null);setRes(null);setErr('')}

  if(authLoading) return null
  if(!user) return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:F }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ width:64, height:64, background:'rgba(0,119,182,0.08)', border:'1px solid rgba(0,119,182,0.2)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 4px 20px rgba(0,119,182,0.1)' }}>
          <Shield size={28} color="#0077b6"/>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#0d1117', letterSpacing:'-0.4px', margin:'0 0 8px' }}>Sign in to continue</h2>
        <p style={{ fontSize:13, color:'#7a8694', lineHeight:1.7, marginBottom:24 }}>Issue, manage and auto-renew SSL certificates from SSLVault.</p>
        <button onClick={()=>nav('/auth')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#0077b6', color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, boxShadow:'0 4px 14px rgba(0,119,182,0.3)' }}>
          <Lock size={14}/> Sign in to SSLVault
        </button>
      </div>
    </div>
  )

  // ── STEP INDICATOR ───────────────────────────────────────────────────────────
  const currentStep = step==='form'?1:step==='dv'?2:3
  function StepPip({ n, label, active, done }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:800, fontFamily:F, transition:'all .2s',
          background:done?'#00a550':active?'#0077b6':'rgba(0,119,182,0.08)',
          color:done||active?'#fff':'#7a8694',
          boxShadow:active?'0 0 0 4px rgba(0,119,182,0.15)':done?'0 0 0 3px rgba(0,165,80,0.12)':undefined }}>
          {done?<Check size={11}/>:n}
        </div>
        <span style={{ fontSize:11, fontWeight:active?700:500, letterSpacing:'0.03em', textTransform:'uppercase', color:active?'#0077b6':done?'#00a550':'#7a8694' }}>{label}</span>
      </div>
    )
  }

  const StepBar = () => (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
      {[{n:1,label:'Configure'},{n:2,label:'Validate DNS'},{n:3,label:'Done'}].map(({n,label},i)=>(
        <div key={n} style={{ display:'flex', alignItems:'center', flex:i<2?1:'none' }}>
          <StepPip n={n} label={label} active={currentStep===n} done={currentStep>n}/>
          {i<2&&<div style={{ flex:1, height:2, borderRadius:1, margin:'0 10px', background:currentStep>n?'rgba(0,165,80,0.25)':'rgba(0,119,182,0.1)', transition:'background .3s' }}/>}
        </div>
      ))}
    </div>
  )

  // ── FORM ──────────────────────────────────────────────────────────────────────
  if(step==='form') return (
    <div style={{ minHeight:embedded?'auto':'100vh', background:embedded?'transparent':'#f0f4fa', fontFamily:F }}>

      {/* Page header — hidden when embedded */}
      {!embedded && (
        <div style={{ background:'#ffffff', borderBottom:'1px solid rgba(0,119,182,0.1)', padding:'0 32px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 8px rgba(0,119,182,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#0077b6,#0091d6)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,119,182,0.3)' }}>
              <Shield size={15} color="#fff"/>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:'#0d1117', letterSpacing:'-0.1px' }}>Issue SSL Certificate</span>
            <span style={{ background:'rgba(0,165,80,0.1)', color:'#00a550', border:'1px solid rgba(0,165,80,0.25)', fontSize:9, fontWeight:800, letterSpacing:'0.8px', textTransform:'uppercase', borderRadius:20, padding:'2px 8px' }}>LIVE</span>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {[{icon:<Clock size={11}/>,t:'~5 min'},{icon:<RotateCcw size={11}/>,t:'Auto-renewal'},{icon:<ShieldCheck size={11}/>,t:'DigiCert chain'}].map(({icon,t})=>(
              <span key={t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#7a8694', fontWeight:500 }}>{icon}{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth:embedded?'100%':1080, margin:'0 auto', padding:embedded?'20px 20px 40px':'32px 32px 80px',
        display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr clamp(280px,30vw,360px)', gap:28, alignItems:'start' }}>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {!embedded && <StepBar/>}

          {/* Certificate type */}
          <SectionCard title="Certificate Type">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              {PRODUCTS.map(p=>(
                <div key={p.code} onClick={()=>setProduct(p.code)}
                  style={{ padding:'16px', borderRadius:11, cursor:'pointer', transition:'all .15s',
                    background:product===p.code?'rgba(0,119,182,0.06)':'#f8fafd',
                    border:product===p.code?'1.5px solid #0077b6':'1.5px solid rgba(0,119,182,0.12)',
                    boxShadow:product===p.code?'0 0 0 3px rgba(0,119,182,0.1)':undefined }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', border:product===p.code?'5px solid #0077b6':'2px solid rgba(0,119,182,0.25)', transition:'all .15s', flexShrink:0 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0d1117' }}>{p.name}</span>
                    <span style={{ fontSize:9, fontWeight:800, background:product===p.code?'rgba(0,119,182,0.12)':'rgba(0,119,182,0.06)', color:'#0077b6', borderRadius:4, padding:'2px 6px', letterSpacing:'0.3px' }}>{p.badge}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#7a8694', paddingLeft:24 }}>{p.sub}</div>
                </div>
              ))}
            </div>

            {/* Domain */}
            <div style={{ marginBottom:16 }}>
              <Label required note={PRODUCTS.find(p=>p.code===product)?.wildcard?'enter root domain, wildcard applied automatically':undefined}>Domain name</Label>
              {profileLoading && <div style={{ fontSize:10, color:'#7a8694', display:'flex', alignItems:'center', gap:5, marginBottom:5 }}><div style={{ width:8,height:8,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.3)',borderTopColor:'#0077b6',animation:'spin .7s linear infinite' }}/> Looking up saved profile…</div>}
              <div style={{ position:'relative' }}>
                <Globe size={14} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#7a8694', pointerEvents:'none' }}/>
                <input value={domain} onChange={e=>setD(e.target.value)} placeholder="yourdomain.com"
                  style={{ ...inp, paddingLeft:38, fontSize:15, fontFamily:MONO, fontWeight:600 }}
                  onFocus={focusIn} onBlur={focusOut}/>
              </div>
            </div>

            {/* Validity */}
            <div>
              <Label>Validity period</Label>
              <div style={{ padding:'13px 16px', borderRadius:10, border:'1.5px solid #0077b6', background:'rgba(0,119,182,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0d1117' }}>1 year</span>
                  <div style={{ fontSize:11, color:'#7a8694', marginTop:2 }}>12 months · auto-renews before expiry</div>
                </div>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#0077b6' }}><Check size={12}/> Selected</span>
              </div>
            </div>
          </SectionCard>

          {/* Contact details */}
          <SectionCard title="Contact Details" right="Required by certificate authority">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {[{label:'First name',val:fn,set:setFn,ph:'John'},{label:'Last name',val:ln,set:setLn,ph:'Smith'}].map(f=>(
                <div key={f.label}>
                  <Label required>{f.label}</Label>
                  <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                    style={inp} onFocus={focusIn} onBlur={focusOut}/>
                </div>
              ))}
            </div>
            {[{label:'Email address',val:em,set:setEm,ph:'you@example.com',type:'email',note:'Certificate delivery'},{label:'Phone number',val:ph,set:setPh,ph:'+31 6 00 000000',type:'tel'}].map(f=>(
              <div key={f.label} style={{ marginBottom:14 }}>
                <Label required note={f.note}>{f.label}</Label>
                <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} type={f.type||'text'}
                  style={inp} onFocus={focusIn} onBlur={focusOut}/>
              </div>
            ))}
          </SectionCard>

          {err && (
            <div style={{ background:'rgba(192,57,43,0.06)', border:'1px solid rgba(192,57,43,0.25)', borderRadius:10, padding:'12px 16px', fontSize:12, color:'#c0392b', display:'flex', alignItems:'center', gap:8, fontWeight:500 }}>
              <AlertTriangle size={14} style={{ flexShrink:0 }}/> {err}
            </div>
          )}
        </div>

        {/* Right column: cert preview + order summary */}
        <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:16 }}>
          <CertPreview domain={clean(domain)} fn={fn} ln={ln} em={em} product={product} years={years}/>

          {/* Order summary */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,119,182,0.06)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,119,182,0.08)', background:'rgba(0,119,182,0.02)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#0077b6', textTransform:'uppercase', letterSpacing:'0.6px' }}>Order Summary</span>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {[
                {k:'Certificate',   v:PRODUCTS.find(p=>p.code===product)?.name||'RapidSSL DV'},
                {k:'Validity',      v:`${years} year${years>1?'s':''}`},
                {k:'Auto-renewal',  v:'Included',           accent:true},
                {k:'DNS validation',v:'Automatic (CNAME)',  accent:true},
                {k:'Powered by',    v:'RapidSSL · DigiCert'},
              ].map(({k,v,accent})=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:9 }}>
                  <span style={{ color:'#7a8694', fontWeight:500 }}>{k}</span>
                  <span style={{ color:accent?'#0d1117':'#3d4a58', fontWeight:accent?700:500 }}>{v}</span>
                </div>
              ))}

              <button onClick={place} disabled={busy}
                style={{ width:'100%', background:busy?'rgba(0,119,182,0.4)':'#0077b6', color:'#ffffff', border:'none', borderRadius:10,
                  padding:'14px', fontSize:14, fontWeight:800, cursor:busy?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  fontFamily:F, transition:'all .15s', marginTop:8,
                  boxShadow:busy?undefined:'0 4px 16px rgba(0,119,182,0.35)', letterSpacing:'-0.1px' }}
                onMouseEnter={e=>{if(!busy){e.currentTarget.style.background='#0068a0';e.currentTarget.style.transform='translateY(-1px)'}}}
                onMouseLeave={e=>{if(!busy){e.currentTarget.style.background='#0077b6';e.currentTarget.style.transform='translateY(0)'}}}>
                {busy
                  ? <><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Placing order…</>
                  : <><Lock size={14}/> Issue Certificate <ArrowRight size={13}/></>}
              </button>

              <div style={{ marginTop:12, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                {['RapidSSL CA partner','99.9% browser trust','DigiCert chain'].map(t=>(
                  <span key={t} style={{ fontSize:10, color:'#7a8694', display:'flex', alignItems:'center', gap:4, fontWeight:500 }}>
                    <Check size={9} style={{ color:'#00a550' }}/> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .spin{animation:spin .8s linear infinite}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )

  // ── DV STEP ───────────────────────────────────────────────────────────────────
  if(step==='dv'&&ord) return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', fontFamily:F }}>
      {/* Header */}
      <div style={{ background:'#ffffff', borderBottom:'1px solid rgba(0,119,182,0.1)', padding:'0 32px', height:56, display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 8px rgba(0,119,182,0.06)' }}>
        <div style={{ width:32,height:32,background:'linear-gradient(135deg,#0077b6,#0091d6)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Shield size={15} color="#fff"/>
        </div>
        <span style={{ fontSize:14, fontWeight:700, color:'#0d1117' }}>Validate Domain Ownership</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:'#f59e0b',boxShadow:'0 0 0 3px rgba(245,158,11,0.2)',animation:'pulse 2s infinite' }}/>
          <span style={{ fontSize:11, color:'#9a6400', fontWeight:600 }}>Awaiting DNS validation</span>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'32px 24px 60px' }}>
        <StepBar/>

        {/* Title */}
        <div style={{ marginBottom:28, textAlign:'center' }}>
          <div style={{ width:56,height:56,borderRadius:14,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
            <Wifi size={24} color="#f59e0b" strokeWidth={1.8}/>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#0d1117', letterSpacing:'-0.4px', marginBottom:8 }}>Add this TXT record to prove ownership</h2>
          <p style={{ fontSize:13, color:'#7a8694', lineHeight:1.65, margin:0 }}>
            Add a <strong style={{ color:'#0d1117' }}>TXT record</strong> to your DNS for{' '}
            <strong style={{ color:'#0077b6', fontFamily:MONO }}>{ord.domain||clean(domain)}</strong>
          </p>
        </div>

        {/* DNS record card */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:14, overflow:'hidden', marginBottom:20, boxShadow:'0 2px 12px rgba(0,119,182,0.08)' }}>
          <div style={{ background:'rgba(0,119,182,0.03)', padding:'12px 18px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#c0392b','#f59e0b','#00a550'].map(c=>(
                <span key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,display:'block' }}/>
              ))}
            </div>
            <span style={{ fontSize:11, color:'#7a8694', fontFamily:MONO, marginLeft:6 }}>DNS record · TXT</span>
            <span style={{ marginLeft:'auto', fontFamily:MONO, fontSize:10, color:'#3d4a58', fontWeight:600 }}>GGS #{ord.ggs_order_id||'—'}</span>
          </div>
          {[
            {k:'Name',  v:ord.dcv_txt_name||ord.dcv_cname_name,  copy:true,  loading:!(ord.dcv_txt_name||ord.dcv_cname_name)},
            {k:'Type',  v:'TXT', accent:true},
            {k:'Value', v:ord.dcv_txt_value||ord.dcv_cname_value, copy:true,  loading:!(ord.dcv_txt_value||ord.dcv_cname_value)},
            {k:'TTL',   v:'300 seconds'},
          ].map(({k,v,copy,accent,loading})=>(
            <div key={k} style={{ display:'grid', gridTemplateColumns:'70px 1fr auto', alignItems:'center', padding:'12px 18px', borderBottom:'1px solid rgba(0,119,182,0.06)' }}>
              <span style={{ fontSize:10, fontWeight:800, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.5px' }}>{k}</span>
              <span style={{ fontSize:12, fontFamily:MONO, color:loading?'#7a8694':accent?'#0077b6':'#0d1117', wordBreak:'break-all', lineHeight:1.5 }}>
                {loading
                  ? <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#7a8694' }}>
                      <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:'#0077b6',animation:'spin .7s linear infinite' }}/>
                      {ggsStatus==='processing'?'GGS processing order…':polling?'Fetching from RapidSSL…':'Waiting…'}
                    </span>
                  : v}
              </span>
              {copy&&v&&!loading&&<CopyBtn text={v}/>}
            </div>
          ))}

          {!(ord?.dcv_txt_value||ord?.dcv_cname_value)&&(
            <div style={{ padding:'12px 18px', background:'rgba(0,119,182,0.04)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:12,height:12,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:'#0077b6',animation:'spin .7s linear infinite',flexShrink:0 }}/>
              <span style={{ fontSize:11, color:'#0077b6', lineHeight:1.5 }}>RapidSSL is provisioning your DNS validation record. Checking automatically every 5 seconds — no action needed.</span>
            </div>
          )}
          {res?.dns_auto&&(
            <div style={{ padding:'12px 18px', background:res.dns_auto.ok?'rgba(0,165,80,0.05)':'rgba(192,57,43,0.05)', display:'flex', alignItems:'flex-start', gap:8 }}>
              {res.dns_auto.ok
                ? <Check size={13} style={{ color:'#00a550', flexShrink:0, marginTop:1 }}/>
                : <AlertTriangle size={13} style={{ color:'#c0392b', flexShrink:0, marginTop:1 }}/>}
              <span style={{ fontSize:11, color:res.dns_auto.ok?'#00a550':'#c0392b', lineHeight:1.5 }}>
                {res.dns_auto.ok?`Record added via ${res.dns_auto.provider}. Checking automatically every 5 seconds…`:res.dns_auto.message}
              </span>
            </div>
          )}
          {res&&res.ggs_status&&res.ggs_status!=='active'&&!res.dns_auto&&(
            <div style={{ padding:'12px 18px', background:'rgba(154,100,0,0.05)', display:'flex', gap:8 }}>
              <AlertTriangle size={13} style={{ color:'#9a6400', flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:11, color:'#9a6400' }}>Not validated yet ({res.ggs_status}) — DNS may still be propagating. Try again in a minute.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          {ord?.dns_auto_added
            ? <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,165,80,0.08)', border:'1px solid rgba(0,165,80,0.2)', borderRadius:9, padding:'10px 18px', fontSize:13, color:'#00a550', fontWeight:600 }}>
                <div style={{ width:12,height:12,borderRadius:'50%',border:'1.5px solid rgba(0,165,80,0.3)',borderTopColor:'#00a550',animation:'spin .7s linear infinite' }}/>
                DNS record added via {ord.dns_provider||'provider'} · checking every 5s…
              </div>
            : <button onClick={addDns} disabled={dns||!(ord.dcv_txt_value||ord.dcv_cname_value)}
                style={{ display:'flex', alignItems:'center', gap:7, background:'#0077b6', color:'#fff', border:'none', borderRadius:9, padding:'11px 20px', fontSize:13, fontWeight:700, cursor:dns||!(ord.dcv_txt_value||ord.dcv_cname_value)?'not-allowed':'pointer', opacity:!(ord.dcv_txt_value||ord.dcv_cname_value)?0.4:1, fontFamily:F, boxShadow:'0 4px 14px rgba(0,119,182,0.3)' }}>
                {dns?<><div style={{ width:12,height:12,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Adding…</>:<><Zap size={13}/> Auto-Add DNS Record</>}
              </button>
          }
          <button onClick={check} disabled={chk}
            style={{ display:'flex', alignItems:'center', gap:7, background:'#ffffff', color:'#3d4a58', border:'1.5px solid rgba(0,119,182,0.2)', borderRadius:9, padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>
            {chk?<><div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:'#0077b6',animation:'spin .7s linear infinite' }}/> Checking…</>:<><RefreshCw size={13}/> Check Status</>}
          </button>
          <button onClick={reset} style={{ background:'none', border:'none', color:'#7a8694', fontSize:12, cursor:'pointer', fontFamily:F, marginLeft:'auto', fontWeight:500 }}>← Start over</button>
        </div>

        <div style={{ background:'rgba(0,119,182,0.04)', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, padding:'14px 18px', display:'flex', gap:10 }}>
          <Zap size={15} style={{ color:'#0077b6', flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:12, color:'#3d4a58', lineHeight:1.7 }}>
            <strong style={{ color:'#0d1117' }}>Fully automatic:</strong> If your DNS provider is connected under{' '}
            <strong style={{ color:'#0077b6' }}>More → DNS Providers</strong>, click{' '}
            <strong style={{ color:'#0077b6' }}>Auto-Add DNS Record</strong> and SSLVault handles validation end-to-end.
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>
    </div>
  )

  // ── DONE ──────────────────────────────────────────────────────────────────────
  return <CertIssuedScreen domain={clean(domain)} product={product} ord={ord} user={user} onDashboard={onDashboard} onIssueAnother={reset} nav={nav}/>
}

function CertIssuedScreen({ domain, product, ord, user, onDashboard, onIssueAnother, nav }) {
  const productName = PRODUCTS.find(p=>p.code===product)?.name||'RapidSSL DV'
  const [installMethod, setInstallMethod] = useState(null)
  const [agentName,     setAgentName]     = useState('')
  const [cpanelHost,    setCpanelHost]    = useState('')
  const [certCopied,    setCertCopied]    = useState(false)
  const certPem    = ord?.cert_pem||null
  const expiryDate = ord?.valid_till ? new Date(ord.valid_till).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : (()=>{const d=new Date();d.setDate(d.getDate()+199);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})})()
  const issuedDate = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
  const ggsOrder   = ord?.ggs_order_id||ord?.order_id||null

  useEffect(()=>{
    if(!user){setInstallMethod('none');return}
    const detect=async()=>{
      try {
        const {data:agents}=await supabase.from('servers').select('id,nickname,hostname').eq('user_id',user.id).eq('status','active').limit(1)
        if(agents&&agents.length>0){setInstallMethod('agent');setAgentName(agents[0].nickname||agents[0].hostname||'your server');return}
        const {data:cpanel}=await supabase.from('cpanel_credentials').select('id,hostname').eq('user_id',user.id).limit(1)
        if(cpanel&&cpanel.length>0){setInstallMethod('cpanel');setCpanelHost(cpanel[0].hostname||'your cPanel server');return}
        setInstallMethod('none')
      } catch{setInstallMethod('none')}
    }; detect()
  },[user])

  const goToDashboard=()=>{sessionStorage.setItem('install_domain',domain);if(onDashboard)onDashboard();else nav('/dashboard')}
  const goToInstall=(method)=>{sessionStorage.setItem('install_domain',domain);if(method==='agent')sessionStorage.setItem('install_method_hint','agent');if(method==='cpanel')sessionStorage.setItem('install_method_hint','cpanel');if(onDashboard)onDashboard();else nav('/dashboard')}
  const copyCert=()=>{if(!certPem)return;try{navigator.clipboard.writeText(certPem)}catch{};setCertCopied(true);setTimeout(()=>setCertCopied(false),2000)}
  const dl=()=>{if(!certPem)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([certPem],{type:'text/plain'}));a.download=domain+'-cert.pem';a.click()}

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 16px', fontFamily:F }}>
      <div style={{ maxWidth:500, width:'100%', animation:'fadeUp 0.35s ease both' }}>

        {/* Success header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'rgba(0,165,80,0.08)',border:'2px solid rgba(0,165,80,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 0 8px rgba(0,165,80,0.05)' }}>
            <ShieldCheck size={32} color="#00a550" strokeWidth={2}/>
          </div>
          <h2 style={{ fontSize:24, fontWeight:800, color:'#0d1117', letterSpacing:'-0.5px', margin:'0 0 8px' }}>Certificate issued</h2>
          <p style={{ fontSize:13, color:'#7a8694', margin:0, fontWeight:500 }}>{productName} · GoGetSSL / RapidSSL · auto-renewal active</p>
        </div>

        {/* Cert card */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.15)', borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 4px 20px rgba(0,119,182,0.1)' }}>
          <div style={{ background:'linear-gradient(135deg,#0077b6,#0091d6)', padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <ShieldCheck size={16} color="#ffffff" strokeWidth={2}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#ffffff', fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{domain}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:1 }}>SHA-256 · RSA 2048 · DV</div>
            </div>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:800, padding:'4px 10px', borderRadius:20, background:'rgba(0,165,80,0.2)', color:'#ffffff', border:'1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ width:5,height:5,borderRadius:'50%',background:'#fff',animation:'certpulse 1.8s infinite' }}/>Active
            </span>
          </div>

          {[
            {label:'Issued by',  value:'GoGetSSL · RapidSSL Global TLS RSA4096', mono:true},
            {label:'Valid from', value:issuedDate},
            {label:'Expires',    value:expiryDate+' · 199 days', green:true},
            ggsOrder?{label:'GGS order',value:'#'+ggsOrder,mono:true}:null,
          ].filter(Boolean).map(({label,value,mono,green})=>(
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:'1px solid rgba(0,119,182,0.06)', gap:12 }}>
              <span style={{ fontSize:11, color:'#7a8694', flexShrink:0, fontWeight:500 }}>{label}</span>
              <span style={{ fontSize:11, fontWeight:700, color:green?'#00a550':'#0d1117', fontFamily:mono?MONO:F, textAlign:'right', wordBreak:'break-all' }}>{value}</span>
            </div>
          ))}

          <div style={{ padding:'12px 18px', display:'flex', gap:8 }}>
            <button onClick={copyCert} disabled={!certPem}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', borderRadius:8, fontSize:11, fontWeight:700, cursor:certPem?'pointer':'not-allowed', fontFamily:F, background:certCopied?'rgba(0,165,80,0.08)':'rgba(0,119,182,0.06)', border:`1px solid ${certCopied?'rgba(0,165,80,0.2)':'rgba(0,119,182,0.15)'}`, color:certCopied?'#00a550':certPem?'#0077b6':'#7a8694', opacity:certPem?1:0.4, transition:'all .15s' }}>
              {certCopied?<><CheckCircle size={12}/> Copied</>:<><Copy size={12}/> Copy PEM</>}
            </button>
            <button onClick={dl} disabled={!certPem}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', borderRadius:8, fontSize:11, fontWeight:700, cursor:certPem?'pointer':'not-allowed', fontFamily:F, background:'rgba(0,119,182,0.06)', border:'1px solid rgba(0,119,182,0.15)', color:certPem?'#0077b6':'#7a8694', opacity:certPem?1:0.4 }}>
              <ArrowRight size={12}/> Download
            </button>
          </div>
        </div>

        {/* Install method */}
        {installMethod===null&&(
          <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:12, padding:'16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:12,height:12,borderRadius:'50%',border:'1.5px solid rgba(0,119,182,0.2)',borderTopColor:'#0077b6',animation:'spin .8s linear infinite',flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#7a8694' }}>Checking your install setup…</span>
          </div>
        )}
        {installMethod==='agent'&&(
          <div style={{ background:'rgba(0,165,80,0.05)', border:'1px solid rgba(0,165,80,0.2)', borderRadius:12, padding:'16px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#00a550',animation:'certpulse 1.8s infinite',flexShrink:0 }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#00a550' }}>Auto-installing on your server</span>
            </div>
            <p style={{ fontSize:12, color:'#3d4a58', margin:'0 0 12px', lineHeight:1.65, paddingLeft:15 }}>
              Agent on <strong style={{ color:'#0d1117' }}>{agentName}</strong> will install this cert within 5 minutes. No action needed.
            </p>
            <button onClick={goToDashboard} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F, background:'rgba(0,165,80,0.1)', border:'1px solid rgba(0,165,80,0.25)', color:'#00a550' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}
        {installMethod==='cpanel'&&(
          <div style={{ background:'rgba(0,119,182,0.05)', border:'1px solid rgba(0,119,182,0.18)', borderRadius:12, padding:'16px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#0077b6',animation:'certpulse 1.8s infinite',flexShrink:0 }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#0077b6' }}>Auto-installing via cPanel</span>
            </div>
            <p style={{ fontSize:12, color:'#3d4a58', margin:'0 0 12px', lineHeight:1.65, paddingLeft:15 }}>
              cPanel cron will install via UAPI on <strong style={{ color:'#0d1117' }}>{cpanelHost}</strong>. No action needed.
            </p>
            <button onClick={goToDashboard} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F, background:'rgba(0,119,182,0.08)', border:'1px solid rgba(0,119,182,0.2)', color:'#0077b6' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}
        {installMethod==='none'&&(
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>How would you like to install?</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                {icon:Server,    label:'VPS agent', sub:'Zero-touch · auto-renews', method:'agent',  accent:false},
                {icon:Globe,     label:'cPanel',    sub:'No SSH needed',            method:'cpanel', accent:true},
                {icon:ArrowRight,label:'Download',  sub:'Manual install',           method:'manual', accent:false},
              ].map(({icon:Icon,label,sub,method,accent})=>(
                <button key={method} onClick={()=>method==='manual'?goToDashboard():goToInstall(method)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 10px', borderRadius:12, cursor:'pointer', fontFamily:F, textAlign:'center', transition:'all .15s', background:accent?'rgba(0,119,182,0.06)':'#ffffff', border:accent?'1.5px solid rgba(0,119,182,0.25)':'1.5px solid rgba(0,119,182,0.12)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,119,182,0.06)';e.currentTarget.style.borderColor='rgba(0,119,182,0.3)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background=accent?'rgba(0,119,182,0.06)':'#ffffff';e.currentTarget.style.borderColor=accent?'rgba(0,119,182,0.25)':'rgba(0,119,182,0.12)'}}>
                  <div style={{ width:40,height:40,borderRadius:10,background:'rgba(0,119,182,0.07)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Icon size={18} color="#0077b6" strokeWidth={1.8}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0d1117', marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:10, color:'#7a8694', lineHeight:1.4 }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={goToDashboard}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'13px', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:F, background:'#0077b6', border:'none', color:'#fff', boxShadow:'0 4px 16px rgba(0,119,182,0.35)', letterSpacing:'-0.1px' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#0068a0'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#0077b6'}}>
            <Server size={14}/> Go to dashboard
          </button>
          <button onClick={onIssueAnother}
            style={{ padding:'13px 18px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F, background:'#ffffff', color:'#3d4a58', border:'1.5px solid rgba(0,119,182,0.2)' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.04)'}
            onMouseLeave={e=>e.currentTarget.style.background='#ffffff'}>
            Issue another
          </button>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes certpulse{0%,100%{box-shadow:0 0 0 0 rgba(0,165,80,0.4)}50%{box-shadow:0 0 0 5px rgba(0,165,80,0)}}
      `}</style>
    </div>
  )
}
