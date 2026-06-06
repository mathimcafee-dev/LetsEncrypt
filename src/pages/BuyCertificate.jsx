import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Copy, Check,
         Lock, Zap, Globe, Server, ArrowRight, RotateCcw, Clock,
         ShieldCheck, Wifi, FileText, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const F    = "'Sora','DM Sans',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"

const PRODUCTS = [
  { code:'rapidssl',          name:'RapidSSL DV',      type:'DV',          badge:'DV',       sub:'DigiCert chain · 99.9% browser trust · ~5 min', wildcard:false },
  { code:'rapidssl_wildcard', name:'RapidSSL Wildcard', type:'DV Wildcard', badge:'WILDCARD', sub:'*.yourdomain.com · all subdomains · ~5 min',     wildcard:true  },
]

function useIsMobile(bp=900){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}
const clean = v=>v.trim().replace(/^https?:\/\//,'').replace(/\/.*/,'').toLowerCase()

// ── Inline input ───────────────────────────────────────────────────────
function Field({ label, required, note, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
        {label}
        {required && <span style={{ color:'#f87171', fontSize:10 }}>*</span>}
        {note && <span style={{ color:'#64748b', fontWeight:400, textTransform:'none', letterSpacing:0, fontSize:11 }}>· {note}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width:'100%', boxSizing:'border-box',
  background:'#0f172a', border:'1px solid rgba(148,163,184,0.15)',
  borderRadius:10, color:'#f1f5f9', fontSize:14, fontFamily:F,
  padding:'13px 16px', outline:'none', transition:'all .18s',
}

function Inp({ value, onChange, placeholder, type='text', mono, icon, onFocus, onBlur }) {
  return (
    <div style={{ position:'relative' }}>
      {icon && <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#475569' }}>{icon}</div>}
      <input value={value} onChange={onChange} placeholder={placeholder} type={type}
        style={{ ...inputStyle, paddingLeft:icon?42:16, fontFamily:mono?MONO:F }}
        onFocus={e=>{e.target.style.borderColor='rgba(99,179,237,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(99,179,237,0.1)';onFocus&&onFocus(e)}}
        onBlur={e=>{e.target.style.borderColor='rgba(148,163,184,0.15)';e.target.style.boxShadow='none';onBlur&&onBlur(e)}}/>
    </div>
  )
}

function CopyBtn({ text }) {
  const [ok,setOk]=useState(false)
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),1800)}}
      style={{ background:ok?'rgba(52,211,153,0.12)':'rgba(148,163,184,0.1)', border:`1px solid ${ok?'rgba(52,211,153,0.3)':'rgba(148,163,184,0.15)'}`, borderRadius:6, cursor:'pointer', color:ok?'#34d399':'#94a3b8', display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'4px 9px', fontFamily:F, transition:'all .15s' }}>
      {ok?<><Check size={10}/> Copied</>:<><Copy size={10}/> Copy</>}
    </button>
  )
}

// ── LEFT PANEL — dark cert credential view ──────────────────────────────
function LeftPanel({ domain, fn, ln, em, product, years, step, ord }) {
  const p  = PRODUCTS.find(x=>x.code===product)||PRODUCTS[0]
  const cn = p.wildcard ? (domain&&domain.startsWith('*.')?domain:`*.${domain||'yourdomain.com'}`) : (domain||'yourdomain.com')
  const issued = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const exp    = new Date(Date.now()+years*365*86400000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
  const name   = [fn,ln].filter(Boolean).join(' ')||'Your Name'
  const isActive = step==='done'

  return (
    <div style={{ width:340, flexShrink:0, background:'#0b1220', minHeight:'100vh', padding:'36px 28px', display:'flex', flexDirection:'column', gap:0, position:'sticky', top:0, maxHeight:'100vh', overflowY:'auto' }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:40 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(59,130,246,0.4)' }}>
          <Shield size={17} color="#fff" strokeWidth={2}/>
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px' }}>SSLVault</div>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>Certificate Issuance</div>
        </div>
      </div>

      {/* Live cert card */}
      <div style={{ background:'linear-gradient(145deg,#1e293b,#0f172a)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:16, overflow:'hidden', marginBottom:28, boxShadow:'0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {/* Card header */}
        <div style={{ background:'linear-gradient(135deg,#1d4ed8,#0369a1)', padding:'16px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ShieldCheck size={16} color="#fff" strokeWidth={2}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff', letterSpacing:'-0.1px' }}>SSL Certificate — {p.name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', marginTop:1 }}>DigiCert / RapidSSL trust chain</div>
          </div>
          <div style={{ background:isActive?'rgba(52,211,153,0.2)':'rgba(255,255,255,0.15)', border:`1px solid ${isActive?'rgba(52,211,153,0.4)':'rgba(255,255,255,0.2)'}`, borderRadius:5, padding:'2px 7px', fontSize:9, fontWeight:800, color:isActive?'#34d399':'#fff', letterSpacing:'0.8px' }}>
            {isActive?'ISSUED':'LIVE'}
          </div>
        </div>
        {/* Fields */}
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {[
            {k:'Subject',    v:`CN=${cn}`},
            {k:'Issued to',  v:name},
            {k:'Issuer',     v:'RapidSSL Global TLS RSA4096 SHA256 2022 CA1'},
            {k:'Valid from', v:issued},
            {k:'Valid until',v:exp, hl:true},
            {k:'Validity',   v:`${years} year${years>1?'s':''}`},
            {k:'Key',        v:'RSA 2048-bit / SHA-256'},
            {k:'Contact',    v:em||'your@email.com'},
          ].map(({k,v,hl})=>(
            <div key={k} style={{ display:'grid', gridTemplateColumns:'76px 1fr', gap:8 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em', paddingTop:1 }}>{k}</span>
              <span style={{ fontSize:11, color:hl?'#60a5fa':'#94a3b8', wordBreak:'break-all', fontFamily:MONO, fontWeight:hl?600:400, lineHeight:1.4 }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding:'10px 18px', borderTop:'1px solid rgba(148,163,184,0.08)', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:domain?'#34d399':'#475569', boxShadow:domain?'0 0 0 3px rgba(52,211,153,0.2)':undefined }}/>
          <span style={{ fontSize:10, color:'#475569', fontFamily:F }}>{domain?'Ready to issue':'Enter domain to preview'}</span>
          <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.05em' }}>{p.badge}</span>
        </div>
      </div>

      {/* Order summary */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Order Summary</div>
        {[
          {k:'Certificate',   v:p.name},
          {k:'Validity',      v:`${years} year${years>1?'s':''}`},
          {k:'Auto-renewal',  v:'Included',           accent:true},
          {k:'DNS validation',v:'Automatic (CNAME)',   accent:true},
          {k:'Powered by',    v:'RapidSSL · DigiCert'},
        ].map(({k,v,accent})=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8, alignItems:'center' }}>
            <span style={{ color:'#475569', fontWeight:500 }}>{k}</span>
            <span style={{ color:accent?'#34d399':'#94a3b8', fontWeight:accent?700:400 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          {icon:<ShieldCheck size={12}/>, t:'DigiCert root of trust'},
          {icon:<RefreshCw size={12}/>,   t:'Auto-renews before expiry'},
          {icon:<Clock size={12}/>,       t:'Issued in ~5 minutes'},
        ].map(({icon,t})=>(
          <div key={t} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#475569', fontWeight:500 }}>
            <span style={{ color:'#3b82f6' }}>{icon}</span>{t}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══ MAIN EXPORT ══════════════════════════════════════════════════════════
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
  const [profileLoading,setProfileLoading] = useState(false)

  useEffect(()=>{ const p=sessionStorage.getItem('prefill_domain');if(p){setD(p);sessionStorage.removeItem('prefill_domain')} },[])
  useEffect(()=>{ if(user) setEm(e=>e||user.email||'') },[user])

  useEffect(()=>{
    const d=clean(domain);if(!d||!user) return
    const t=setTimeout(async()=>{
      setProfileLoading(true)
      try{const r=await call('get_profile',{domain:d});if(r.profile){if(r.profile.first_name)setFn(r.profile.first_name);if(r.profile.last_name)setLn(r.profile.last_name);if(r.profile.email)setEm(r.profile.email);if(r.profile.phone)setPh(r.profile.phone)}}catch(_){}
      setProfileLoading(false)
    },600);return()=>clearTimeout(t)
  },[domain,user])

  useEffect(()=>{
    if(step!=='dv'||!ord?.order_id) return
    let n=0,dnsAttempted=false;setPoll(true)
    ;(async()=>{try{const s=await call('check_status',{order_id:ord.order_id});setGgsStatus(s.ggs_status||'');if(s.status==='active'||s.status==='issued'||s.ggs_status==='active'){setStep('done');setPoll(false);return}if(s.dcv_txt_value||s.dcv_cname_value){setOrd(p=>({...p,dcv_txt_name:s.dcv_txt_name||s.dcv_cname_name||p.dcv_txt_name,dcv_txt_value:s.dcv_txt_value||s.dcv_cname_value||p.dcv_txt_value,dcv_cname_name:s.dcv_cname_name||p.dcv_cname_name,dcv_cname_value:s.dcv_cname_value||p.dcv_cname_value}))}}catch{}})()
    const iv=setInterval(async()=>{
      n++;try{
        const s=await call('check_status',{order_id:ord.order_id});setGgsStatus(s.ggs_status||'')
        if(s.status==='active'||s.status==='issued'||s.ggs_status==='active'){setStep('done');clearInterval(iv);setPoll(false);return}
        if(s.dcv_txt_value||s.dcv_cname_value){
          setOrd(p=>({...p,dcv_txt_name:s.dcv_txt_name||s.dcv_cname_name||p.dcv_txt_name,dcv_txt_value:s.dcv_txt_value||s.dcv_cname_value||p.dcv_txt_value,dcv_cname_name:s.dcv_cname_name||p.dcv_cname_name,dcv_cname_value:s.dcv_cname_value||p.dcv_cname_value}))
          if(!dnsAttempted){
            dnsAttempted=true
            try{const {data:{session}}=await supabase.auth.getSession();setDns(true);const dnsR=await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'auto_add',user_id:session.user.id,domain:ord.domain,txt_name:s.dcv_txt_name||s.dcv_cname_name||ord.domain,txt_value:s.dcv_txt_value||s.dcv_cname_value})});const dnsRes=await dnsR.json();setDns(false);setRes({dns_auto:dnsRes});if(dnsRes.ok){setOrd(p=>({...p,dns_auto_added:true,dns_provider:dnsRes.provider||''}));try{const s2=await call('check_status',{order_id:ord.order_id});if(s2.status==='active'||s2.status==='issued'||s2.ggs_status==='active'){setStep('done');clearInterval(iv)}}catch{}}}catch{setDns(false)}
          }
        }
      }catch{}
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
    const d=clean(domain);if(!d){setErr('Enter a domain name');return}if(!fn.trim()){setErr('First name required');return}if(!ln.trim()){setErr('Last name required');return}if(!em.trim()){setErr('Email required');return}if(!ph.trim()){setErr('Phone required');return}
    setErr('');setBusy(true)
    const r=await call('place_order',{domain:d,years,product_code:product,firstName:fn.trim(),lastName:ln.trim(),adminEmail:em.trim(),phone:ph.trim(),period:years*12})
    setBusy(false);if(r.error){setErr(r.error);return}
    const ordData={...r,dcv_txt_name:r.dcv_txt_name||r.dcv_cname_name,dcv_txt_value:r.dcv_txt_value||r.dcv_cname_value}
    setOrd(ordData)
    if(r.auto_issued||r.status==='active'||r.status==='issued'){setStep('done')}else{setStep('dv')}
  }
  const check=async()=>{setChk(true);setRes(null);const r=await call('check_status',{order_id:ord.order_id});setChk(false);setRes(r);if(r.status==='active'||r.status==='issued'||r.ggs_status==='active')setStep('done');if(r.dcv_txt_value||r.dcv_cname_value)setOrd(p=>({...p,dcv_txt_name:r.dcv_txt_name||r.dcv_cname_name,dcv_txt_value:r.dcv_txt_value||r.dcv_cname_value,dcv_cname_name:r.dcv_cname_name,dcv_cname_value:r.dcv_cname_value}))}
  const addDns=async()=>{setDns(true);setRes(null);try{const {data:{session}}=await supabase.auth.getSession();const r=await fetch(`${SUPABASE_URL}/functions/v1/dns-provider`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'auto_add',user_id:session.user.id,domain:ord.domain||clean(domain),txt_name:ord.dcv_txt_name||ord.dcv_cname_name||(ord.domain||clean(domain)),txt_value:ord.dcv_txt_value||ord.dcv_cname_value})});setRes({dns_auto:await r.json()})}catch(e){setRes({dns_auto:{ok:false,message:String(e)}})}setDns(false)}
  const reset=()=>{setStep('form');setD('');setOrd(null);setRes(null);setErr('')}

  if(authLoading) return null
  if(!user) return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:F }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#1d4ed8,#0369a1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'0 0 40px rgba(29,78,216,0.4)' }}>
          <Shield size={32} color="#fff"/>
        </div>
        <h2 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:'0 0 10px' }}>Sign in to continue</h2>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, marginBottom:28 }}>Issue, manage and auto-renew SSL certificates from SSLVault.</p>
        <button onClick={()=>nav('/auth')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#1d4ed8,#0369a1)', color:'#fff', border:'none', borderRadius:12, padding:'13px 28px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:F, boxShadow:'0 4px 20px rgba(29,78,216,0.4)' }}>
          <Lock size={14}/> Sign in to SSLVault
        </button>
      </div>
    </div>
  )

  const Wrap = ({children}) => (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', fontFamily:F }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(59,130,246,0.3)}50%{box-shadow:0 0 40px rgba(59,130,246,0.6)}}
        .bc-field:focus-within .bc-label{color:#93c5fd!important}
      `}</style>
      {!isMobile && !embedded && (
        <LeftPanel domain={clean(domain)} fn={fn} ln={ln} em={em} product={product} years={years} step={step} ord={ord}/>
      )}
      <div style={{ flex:1, overflowY:'auto' }}>{children}</div>
    </div>
  )

  // Step progress bar
  const StepProgress = ({current}) => (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:36 }}>
      {['Configure','Validate DNS','Done'].map((label,i)=>{
        const n=i+1,done=current>n,active=current===n
        return (
          <div key={label} style={{ display:'flex', alignItems:'center', flex:i<2?1:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,fontFamily:F,transition:'all .25s',background:done?'#22c55e':active?'#3b82f6':'rgba(148,163,184,0.1)',color:done||active?'#fff':'#475569',boxShadow:active?'0 0 0 4px rgba(59,130,246,0.2)':done?'0 0 0 3px rgba(34,197,94,0.15)':undefined }}>
                {done?<Check size={12}/>:n}
              </div>
              <span style={{ fontSize:11,fontWeight:active?700:500,color:active?'#93c5fd':done?'#4ade80':'#475569',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap' }}>{label}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:1,background:done?'rgba(34,197,94,0.3)':'rgba(148,163,184,0.1)',margin:'0 12px',transition:'background .3s' }}/>}
          </div>
        )
      })}
    </div>
  )

  // ── FORM ─────────────────────────────────────────────────────────────
  if(step==='form') return (
    <Wrap>
      <div style={{ padding: isMobile?'28px 20px 60px':embedded?'20px 32px 60px':'48px 52px 80px', animation:'fadeSlide .3s ease both' }}>
        <StepProgress current={1}/>

        <div style={{ marginBottom:36 }}>
          <h1 style={{ fontSize:isMobile?26:32, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.6px', margin:'0 0 8px', lineHeight:1.15 }}>
            Issue an SSL Certificate
          </h1>
          <p style={{ fontSize:14, color:'#64748b', margin:0, fontWeight:500 }}>
            RapidSSL DV — issued in minutes, auto-renews forever.
          </p>
        </div>

        {/* Product tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32 }}>
          {PRODUCTS.map(p=>(
            <div key={p.code} onClick={()=>setProduct(p.code)}
              style={{ padding:'20px', borderRadius:14, cursor:'pointer', transition:'all .2s',
                background:product===p.code?'rgba(59,130,246,0.1)':'rgba(15,23,42,0.8)',
                border:product===p.code?'1.5px solid rgba(99,179,237,0.5)':'1.5px solid rgba(148,163,184,0.1)',
                boxShadow:product===p.code?'0 0 0 3px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.05)':'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:18,height:18,borderRadius:'50%',border:product===p.code?'5px solid #3b82f6':'2px solid rgba(148,163,184,0.3)',transition:'all .2s',flexShrink:0 }}/>
                <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>{p.name}</span>
                <span style={{ fontSize:9, fontWeight:800, background:'rgba(59,130,246,0.2)', color:'#93c5fd', borderRadius:5, padding:'2px 7px', letterSpacing:'0.05em', border:'1px solid rgba(59,130,246,0.3)' }}>{p.badge}</span>
              </div>
              <div style={{ fontSize:12, color:'#64748b', paddingLeft:28, lineHeight:1.5 }}>{p.sub}</div>
            </div>
          ))}
        </div>

        {/* Domain */}
        <Field label="Domain name" required note={PRODUCTS.find(p=>p.code===product)?.wildcard?'enter root domain':'undefined'}>
          {profileLoading&&<div style={{ fontSize:11,color:'#475569',display:'flex',alignItems:'center',gap:6,marginBottom:8 }}><div style={{ width:9,height:9,borderRadius:'50%',border:'1.5px solid rgba(59,130,246,0.3)',borderTopColor:'#3b82f6',animation:'spin .7s linear infinite' }}/> Loading saved profile…</div>}
          <Inp value={domain} onChange={e=>setD(e.target.value)} placeholder="yourdomain.com" mono icon={<Globe size={14}/>}/>
        </Field>

        {/* Validity */}
        <Field label="Validity period">
          <div style={{ padding:'16px 18px', borderRadius:12, border:'1.5px solid rgba(99,179,237,0.4)', background:'rgba(59,130,246,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <span style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>1 year</span>
              <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>12 months · auto-renews before expiry</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#34d399' }}>
              <Check size={13}/> Selected
            </div>
          </div>
        </Field>

        {/* Divider */}
        <div style={{ height:1, background:'rgba(148,163,184,0.08)', margin:'8px 0 28px' }}/>
        <div style={{ fontSize:13, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:20 }}>Contact details · required by CA</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:0 }}>
          <Field label="First name" required>
            <Inp value={fn} onChange={e=>setFn(e.target.value)} placeholder="John"/>
          </Field>
          <Field label="Last name" required>
            <Inp value={ln} onChange={e=>setLn(e.target.value)} placeholder="Smith"/>
          </Field>
        </div>
        <Field label="Email address" required note="Certificate delivery">
          <Inp value={em} onChange={e=>setEm(e.target.value)} placeholder="you@example.com" type="email"/>
        </Field>
        <Field label="Phone number" required>
          <Inp value={ph} onChange={e=>setPh(e.target.value)} placeholder="+31 6 00 000000" type="tel"/>
        </Field>

        {err&&(
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#f87171', display:'flex', alignItems:'center', gap:8, marginBottom:24, fontWeight:500 }}>
            <AlertTriangle size={14} style={{ flexShrink:0 }}/> {err}
          </div>
        )}

        <button onClick={place} disabled={busy}
          style={{ width:'100%', background:busy?'rgba(59,130,246,0.3)':'linear-gradient(135deg,#1d4ed8,#0369a1)', color:'#fff', border:'none', borderRadius:12, padding:'16px', fontSize:15, fontWeight:800, cursor:busy?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:F, transition:'all .2s', boxShadow:busy?undefined:'0 4px 24px rgba(29,78,216,0.4)', letterSpacing:'-0.1px' }}
          onMouseEnter={e=>{if(!busy){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(29,78,216,0.5)'}}}
          onMouseLeave={e=>{if(!busy){e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 24px rgba(29,78,216,0.4)'}}}>
          {busy
            ? <><div style={{ width:15,height:15,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Placing order…</>
            : <><Lock size={15}/> Issue Certificate <ChevronRight size={16}/></>}
        </button>
      </div>
    </Wrap>
  )

  // ── DV STEP ──────────────────────────────────────────────────────────
  if(step==='dv'&&ord) return (
    <Wrap>
      <div style={{ padding:isMobile?'28px 20px 60px':'48px 52px 80px', animation:'fadeSlide .3s ease both' }}>
        <StepProgress current={2}/>

        <div style={{ marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:20, padding:'5px 14px', marginBottom:16 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#fbbf24',animation:'glow 2s infinite' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:'#fbbf24', letterSpacing:'0.05em' }}>AWAITING DNS VALIDATION</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:'0 0 8px' }}>Prove domain ownership</h1>
          <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
            Add a TXT record for <strong style={{ color:'#93c5fd', fontFamily:MONO }}>{ord.domain||clean(domain)}</strong>
          </p>
        </div>

        {/* DNS record */}
        <div style={{ background:'#0f172a', border:'1px solid rgba(148,163,184,0.12)', borderRadius:16, overflow:'hidden', marginBottom:24, boxShadow:'0 4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ background:'rgba(148,163,184,0.05)', padding:'12px 20px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(148,163,184,0.08)' }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#ef4444','#f59e0b','#22c55e'].map(c=><span key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,display:'block' }}/>)}
            </div>
            <span style={{ fontSize:11,color:'#475569',fontFamily:MONO,marginLeft:6 }}>DNS record · TXT</span>
            <span style={{ marginLeft:'auto',fontFamily:MONO,fontSize:10,color:'#3b82f6',fontWeight:700 }}>#{ord.ggs_order_id||'—'}</span>
          </div>
          {[
            {k:'Name',  v:ord.dcv_txt_name||ord.dcv_cname_name,  copy:true,  loading:!(ord.dcv_txt_name||ord.dcv_cname_name)},
            {k:'Type',  v:'TXT', accent:true},
            {k:'Value', v:ord.dcv_txt_value||ord.dcv_cname_value, copy:true,  loading:!(ord.dcv_txt_value||ord.dcv_cname_value)},
            {k:'TTL',   v:'300 seconds'},
          ].map(({k,v,copy,accent,loading})=>(
            <div key={k} style={{ display:'grid', gridTemplateColumns:'70px 1fr auto', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid rgba(148,163,184,0.06)' }}>
              <span style={{ fontSize:10,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:'0.07em' }}>{k}</span>
              <span style={{ fontSize:12,fontFamily:MONO,color:loading?'#334155':accent?'#60a5fa':'#94a3b8',wordBreak:'break-all',lineHeight:1.5 }}>
                {loading
                  ? <span style={{ display:'inline-flex',alignItems:'center',gap:7,color:'#475569' }}>
                      <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(59,130,246,0.2)',borderTopColor:'#3b82f6',animation:'spin .7s linear infinite' }}/>
                      {ggsStatus==='processing'?'GGS processing…':polling?'Fetching from RapidSSL…':'Waiting…'}
                    </span>
                  : v}
              </span>
              {copy&&v&&!loading&&<CopyBtn text={v}/>}
            </div>
          ))}
          {!(ord?.dcv_txt_value||ord?.dcv_cname_value)&&(
            <div style={{ padding:'12px 20px', background:'rgba(59,130,246,0.05)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(59,130,246,0.25)',borderTopColor:'#3b82f6',animation:'spin .7s linear infinite',flexShrink:0 }}/>
              <span style={{ fontSize:11,color:'#475569',lineHeight:1.6 }}>RapidSSL is provisioning your DNS record. Checking every 5 seconds automatically.</span>
            </div>
          )}
          {res?.dns_auto&&(
            <div style={{ padding:'12px 20px', background:res.dns_auto.ok?'rgba(34,197,94,0.05)':'rgba(239,68,68,0.05)', display:'flex', gap:8 }}>
              {res.dns_auto.ok?<Check size={13} style={{ color:'#4ade80',flexShrink:0,marginTop:1 }}/>:<AlertTriangle size={13} style={{ color:'#f87171',flexShrink:0,marginTop:1 }}/>}
              <span style={{ fontSize:11,color:res.dns_auto.ok?'#4ade80':'#f87171',lineHeight:1.6 }}>
                {res.dns_auto.ok?`Record added via ${res.dns_auto.provider}. Checking every 5s…`:res.dns_auto.message}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:28, alignItems:'center' }}>
          {ord?.dns_auto_added
            ? <div style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:10,padding:'11px 18px',fontSize:13,color:'#4ade80',fontWeight:600 }}>
                <div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(52,211,153,0.3)',borderTopColor:'#34d399',animation:'spin .7s linear infinite' }}/>
                Record added via {ord.dns_provider||'provider'} · checking…
              </div>
            : <button onClick={addDns} disabled={dns||!(ord.dcv_txt_value||ord.dcv_cname_value)}
                style={{ display:'flex',alignItems:'center',gap:7,background:'linear-gradient(135deg,#1d4ed8,#0369a1)',color:'#fff',border:'none',borderRadius:10,padding:'12px 20px',fontSize:13,fontWeight:700,cursor:dns||!(ord.dcv_txt_value||ord.dcv_cname_value)?'not-allowed':'pointer',opacity:!(ord.dcv_txt_value||ord.dcv_cname_value)?0.4:1,fontFamily:F,boxShadow:'0 4px 16px rgba(29,78,216,0.3)' }}>
                {dns?<><div style={{ width:12,height:12,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/> Adding…</>:<><Zap size={13}/> Auto-Add DNS Record</>}
              </button>
          }
          <button onClick={check} disabled={chk}
            style={{ display:'flex',alignItems:'center',gap:7,background:'rgba(15,23,42,0.8)',color:'#94a3b8',border:'1px solid rgba(148,163,184,0.15)',borderRadius:10,padding:'12px 18px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F }}>
            {chk?<><div style={{ width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(148,163,184,0.2)',borderTopColor:'#94a3b8',animation:'spin .7s linear infinite' }}/> Checking…</>:<><RefreshCw size={13}/> Check Status</>}
          </button>
          <button onClick={reset} style={{ background:'none',border:'none',color:'#475569',fontSize:12,cursor:'pointer',fontFamily:F,marginLeft:'auto',fontWeight:500 }}>← Start over</button>
        </div>

        <div style={{ background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:12, padding:'14px 18px', display:'flex', gap:10 }}>
          <Zap size={14} style={{ color:'#3b82f6',flexShrink:0,marginTop:1 }}/>
          <div style={{ fontSize:12,color:'#64748b',lineHeight:1.7 }}>
            <strong style={{ color:'#94a3b8' }}>Fully automatic:</strong> Connect your DNS provider under <strong style={{ color:'#93c5fd' }}>More → DNS Providers</strong>, then click <strong style={{ color:'#93c5fd' }}>Auto-Add</strong> and SSLVault handles everything.
          </div>
        </div>
      </div>
    </Wrap>
  )

  // ── DONE ─────────────────────────────────────────────────────────────
  return <CertIssuedScreen domain={clean(domain)} product={product} ord={ord} user={user} onDashboard={onDashboard} onIssueAnother={reset} nav={nav}/>
}

function CertIssuedScreen({ domain, product, ord, user, onDashboard, onIssueAnother, nav }) {
  const F2   = "'Sora','DM Sans',system-ui,sans-serif"
  const MONO2= "'JetBrains Mono','Fira Mono',monospace"
  const productName = PRODUCTS.find(p=>p.code===product)?.name||'RapidSSL DV'
  const [installMethod,setInstallMethod] = useState(null)
  const [agentName,    setAgentName]     = useState('')
  const [cpanelHost,   setCpanelHost]    = useState('')
  const [certCopied,   setCertCopied]    = useState(false)
  const certPem    = ord?.cert_pem||null
  const expiryDate = ord?.valid_till?new Date(ord.valid_till).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):(()=>{const d=new Date();d.setDate(d.getDate()+199);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})})()
  const issuedDate = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
  const ggsOrder   = ord?.ggs_order_id||ord?.order_id||null

  useEffect(()=>{
    if(!user){setInstallMethod('none');return}
    ;(async()=>{
      try{
        const {data:agents}=await supabase.from('servers').select('id,nickname,hostname').eq('user_id',user.id).eq('status','active').limit(1)
        if(agents&&agents.length>0){setInstallMethod('agent');setAgentName(agents[0].nickname||agents[0].hostname||'your server');return}
        const {data:cpanel}=await supabase.from('cpanel_credentials').select('id,hostname').eq('user_id',user.id).limit(1)
        if(cpanel&&cpanel.length>0){setInstallMethod('cpanel');setCpanelHost(cpanel[0].hostname||'your cPanel server');return}
        setInstallMethod('none')
      }catch{setInstallMethod('none')}
    })()
  },[user])

  const goToDashboard=()=>{sessionStorage.setItem('install_domain',domain);if(onDashboard)onDashboard();else nav('/dashboard')}
  const goToInstall=(method)=>{sessionStorage.setItem('install_domain',domain);if(method==='agent')sessionStorage.setItem('install_method_hint','agent');if(method==='cpanel')sessionStorage.setItem('install_method_hint','cpanel');if(onDashboard)onDashboard();else nav('/dashboard')}
  const copyCert=()=>{if(!certPem)return;try{navigator.clipboard.writeText(certPem)}catch{};setCertCopied(true);setTimeout(()=>setCertCopied(false),2000)}
  const dl=()=>{if(!certPem)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([certPem],{type:'text/plain'}));a.download=domain+'-cert.pem';a.click()}

  return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px', fontFamily:F2 }}>
      <div style={{ maxWidth:520, width:'100%', animation:'fadeSlide .35s ease both' }}>

        {/* Animated success badge */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ position:'relative', width:80, height:80, margin:'0 auto 20px' }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(34,197,94,0.08)', animation:'glow 2s infinite' }}/>
            <div style={{ position:'absolute', inset:4, borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'1.5px solid rgba(34,197,94,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldCheck size={34} color="#4ade80" strokeWidth={1.8}/>
            </div>
          </div>
          <h2 style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:'0 0 8px' }}>Certificate issued</h2>
          <p style={{ fontSize:13, color:'#475569', margin:0 }}>{productName} · GoGetSSL / RapidSSL · auto-renewal active</p>
        </div>

        {/* Cert card */}
        <div style={{ background:'#0f172a', border:'1px solid rgba(148,163,184,0.12)', borderRadius:18, overflow:'hidden', marginBottom:16, boxShadow:'0 8px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ background:'linear-gradient(135deg,#1d4ed8,#0369a1)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <ShieldCheck size={17} color="#fff" strokeWidth={2}/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:14,fontWeight:700,color:'#fff',fontFamily:MONO2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{domain}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,0.6)',marginTop:1 }}>SHA-256 · RSA 2048 · DV</div>
            </div>
            <span style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:800,padding:'4px 10px',borderRadius:20,background:'rgba(34,197,94,0.2)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.3)' }}>
              <span style={{ width:5,height:5,borderRadius:'50%',background:'#4ade80',animation:'glow 1.8s infinite' }}/>Active
            </span>
          </div>
          {[{label:'Issued by',value:'GoGetSSL · RapidSSL Global TLS RSA4096',mono:true},{label:'Valid from',value:issuedDate},{label:'Expires',value:expiryDate+' · 199 days',green:true},ggsOrder?{label:'GGS order',value:'#'+ggsOrder,mono:true}:null].filter(Boolean).map(({label,value,mono,green})=>(
            <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 20px',borderBottom:'1px solid rgba(148,163,184,0.06)',gap:12 }}>
              <span style={{ fontSize:11,color:'#475569',flexShrink:0,fontWeight:500 }}>{label}</span>
              <span style={{ fontSize:12,fontWeight:700,color:green?'#4ade80':'#e2e8f0',fontFamily:mono?MONO2:F2,textAlign:'right',wordBreak:'break-all' }}>{value}</span>
            </div>
          ))}
          <div style={{ padding:'12px 20px', display:'flex', gap:8 }}>
            <button onClick={copyCert} disabled={!certPem}
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:9,fontSize:11,fontWeight:700,cursor:certPem?'pointer':'not-allowed',fontFamily:F2,background:certCopied?'rgba(34,197,94,0.1)':'rgba(148,163,184,0.07)',border:`1px solid ${certCopied?'rgba(34,197,94,0.3)':'rgba(148,163,184,0.12)'}`,color:certCopied?'#4ade80':certPem?'#94a3b8':'#334155',opacity:certPem?1:0.4 }}>
              {certCopied?<><CheckCircle size={12}/> Copied</>:<><Copy size={12}/> Copy PEM</>}
            </button>
            <button onClick={dl} disabled={!certPem}
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:9,fontSize:11,fontWeight:700,cursor:certPem?'pointer':'not-allowed',fontFamily:F2,background:'rgba(148,163,184,0.07)',border:'1px solid rgba(148,163,184,0.12)',color:certPem?'#94a3b8':'#334155',opacity:certPem?1:0.4 }}>
              <ArrowRight size={12}/> Download .pem
            </button>
          </div>
        </div>

        {/* Install detection */}
        {installMethod===null&&(
          <div style={{ background:'#0f172a',border:'1px solid rgba(148,163,184,0.1)',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:12,height:12,borderRadius:'50%',border:'1.5px solid rgba(59,130,246,0.2)',borderTopColor:'#3b82f6',animation:'spin .8s linear infinite',flexShrink:0 }}/>
            <span style={{ fontSize:12,color:'#475569' }}>Checking your install setup…</span>
          </div>
        )}
        {installMethod==='agent'&&(
          <div style={{ background:'rgba(34,197,94,0.04)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:12,padding:'16px 20px',marginBottom:16 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#4ade80',animation:'glow 1.8s infinite',flexShrink:0 }}/>
              <span style={{ fontSize:13,fontWeight:700,color:'#4ade80' }}>Auto-installing on your server</span>
            </div>
            <p style={{ fontSize:12,color:'#64748b',margin:'0 0 12px',lineHeight:1.65,paddingLeft:15 }}>Agent on <strong style={{ color:'#94a3b8' }}>{agentName}</strong> will install this cert within 5 minutes.</p>
            <button onClick={goToDashboard} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F2,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)',color:'#4ade80' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}
        {installMethod==='cpanel'&&(
          <div style={{ background:'rgba(59,130,246,0.04)',border:'1px solid rgba(59,130,246,0.18)',borderRadius:12,padding:'16px 20px',marginBottom:16 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#60a5fa',animation:'glow 1.8s infinite',flexShrink:0 }}/>
              <span style={{ fontSize:13,fontWeight:700,color:'#60a5fa' }}>Auto-installing via cPanel</span>
            </div>
            <p style={{ fontSize:12,color:'#64748b',margin:'0 0 12px',lineHeight:1.65,paddingLeft:15 }}>cPanel cron will install via UAPI on <strong style={{ color:'#94a3b8' }}>{cpanelHost}</strong>.</p>
            <button onClick={goToDashboard} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F2,background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',color:'#60a5fa' }}>
              <Server size={11}/> View in dashboard
            </button>
          </div>
        )}
        {installMethod==='none'&&(
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>How would you like to install?</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
              {[{icon:Server,label:'VPS agent',sub:'Zero-touch',method:'agent',accent:false},{icon:Globe,label:'cPanel',sub:'No SSH needed',method:'cpanel',accent:true},{icon:ArrowRight,label:'Download',sub:'Manual install',method:'manual',accent:false}].map(({icon:Icon,label,sub,method,accent})=>(
                <button key={method} onClick={()=>method==='manual'?goToDashboard():goToInstall(method)}
                  style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'18px 10px',borderRadius:12,cursor:'pointer',fontFamily:F2,textAlign:'center',transition:'all .18s',background:accent?'rgba(59,130,246,0.08)':'rgba(15,23,42,0.8)',border:accent?'1px solid rgba(59,130,246,0.25)':'1px solid rgba(148,163,184,0.1)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,130,246,0.1)';e.currentTarget.style.borderColor='rgba(99,179,237,0.3)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background=accent?'rgba(59,130,246,0.08)':'rgba(15,23,42,0.8)';e.currentTarget.style.borderColor=accent?'rgba(59,130,246,0.25)':'rgba(148,163,184,0.1)'}}>
                  <div style={{ width:40,height:40,borderRadius:10,background:'rgba(59,130,246,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Icon size={18} color="#3b82f6" strokeWidth={1.8}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:'#e2e8f0',marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:10,color:'#475569' }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={goToDashboard}
            style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:F2,background:'linear-gradient(135deg,#1d4ed8,#0369a1)',border:'none',color:'#fff',boxShadow:'0 4px 20px rgba(29,78,216,0.4)',letterSpacing:'-0.1px' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
            <Server size={14}/> Go to dashboard
          </button>
          <button onClick={onIssueAnother}
            style={{ padding:'14px 18px',borderRadius:12,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F2,background:'rgba(15,23,42,0.8)',color:'#64748b',border:'1px solid rgba(148,163,184,0.1)' }}
            onMouseEnter={e=>e.currentTarget.style.color='#94a3b8'}
            onMouseLeave={e=>e.currentTarget.style.color='#64748b'}>
            Issue another
          </button>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes fadeSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{opacity:1;box-shadow:0 0 6px currentColor}50%{opacity:.7;box-shadow:0 0 14px currentColor}}
      `}</style>
    </div>
  )
}
