import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Resend.com design tokens — pure black/white ────────────────────────
const F    = "'Montserrat',system-ui,sans-serif"
const MONO = "'SF Mono','Menlo','Consolas',monospace"
const BG   = '#1a0000'   // page background
const BG2  = '#150000'   // alt section background
const BG3  = '#220808'   // card surface
const BG4  = '#2d0f0f'   // deep card / input
const T1   = '#f0ede8'   // heading text
const T2   = 'rgba(240,237,232,0.7)'   // body text
const T3   = 'rgba(240,237,232,0.4)'  // muted text
const LN   = 'rgba(192,57,43,0.2)'  // default border
const LN2  = 'rgba(192,57,43,0.35)'  // strong border
const LN3  = 'rgba(192,57,43,0.5)'  // hover border
const GRN  = '#4ade80'   // success green
const AMB  = '#fbbf24'   // warning amber
const RED  = '#f87171'   // error red

function useIsMobile() {
  const [w,setW] = useState(window.innerWidth)
  useEffect(()=>{const f=()=>setW(window.innerWidth);window.addEventListener('resize',f);return()=>window.removeEventListener('resize',f)},[])
  return {isMobile:w<768, isTablet:w<1024}
}
function useIn(t=0.08) {
  const ref=useRef(null);const[v,setV]=useState(false)
  useEffect(()=>{const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);io.disconnect()}},{threshold:t});if(ref.current)io.observe(ref.current);return()=>io.disconnect()},[])
  return [ref,v]
}
function FadeUp({children,delay=0}) {
  const[ref,v]=useIn()
  return <div ref={ref} style={{opacity:v?1:0,transform:v?'none':'translateY(20px)',transition:`opacity .6s ease ${delay}ms,transform .6s ease ${delay}ms`}}>{children}</div>
}

// ── Primitives ─────────────────────────────────────────────────────────
function Eyebrow({children}) {
  return <div style={{fontSize:11,fontWeight:500,color:T3,letterSpacing:'0.08em',textTransform:'uppercase',fontFamily:MONO,marginBottom:14}}>{children}</div>
}
function H2({children,style={}}) {
  return <h2 style={{fontSize:'clamp(22px,3vw,36px)',fontWeight:700,color:T1,letterSpacing:'-0.6px',lineHeight:1.15,...style}}>{children}</h2>
}
function Body({children,style={}}) {
  return <p style={{fontSize:14,color:T2,lineHeight:1.75,...style}}>{children}</p>
}
function Tag({children}) {
  return <span style={{display:'inline-flex',alignItems:'center',fontSize:10,fontWeight:500,color:T3,background:'rgba(255,255,255,0.06)',border:`1px solid ${LN2}`,borderRadius:3,padding:'2px 7px',fontFamily:MONO,letterSpacing:'0.04em'}}>{children}</span>
}
function Pill({status}) {
  const m={active:[GRN,'rgba(74,222,128,0.1)'],warning:[AMB,'rgba(251,191,36,0.1)'],critical:[RED,'rgba(248,113,113,0.1)']}
  const[c,bg]=m[status]||[T3,'rgba(255,255,255,0.06)']
  return <span style={{fontSize:10,fontWeight:500,color:c,background:bg,padding:'2px 7px',borderRadius:3,fontFamily:MONO}}>{status}</span>
}
function BtnPrimary({label,onClick}) {
  const[h,setH]=useState(false)
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'inline-flex',alignItems:'center',gap:7,fontFamily:F,fontWeight:600,fontSize:13,padding:'9px 20px',borderRadius:6,border:'none',cursor:'pointer',background:h?'#a93226':'#c0392b',color:'#ffffff',transition:'background .14s'}}>
    {label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  </button>
}
function BtnGhost({label,onClick}) {
  const[h,setH]=useState(false)
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'inline-flex',alignItems:'center',gap:7,fontFamily:F,fontWeight:400,fontSize:13,padding:'9px 20px',borderRadius:6,cursor:'pointer',background:h?'rgba(255,255,255,0.06)':'transparent',border:`1px solid ${h?LN3:LN2}`,color:h?T1:T2,transition:'all .14s'}}>
    {label}
  </button>
}
function Card({children,style={}}) {
  return <div style={{background:BG3,border:`1px solid ${LN}`,borderRadius:6,padding:'20px',...style}}>{children}</div>
}
function Term({title,lines}) {
  return (
    <div style={{background:'#080000',border:`1px solid ${LN}`,borderRadius:8,overflow:'hidden',fontFamily:MONO}}>
      <div style={{background:'#0d0000',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:`1px solid ${LN}`}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c,opacity:.85}}/>)}</div>
        <span style={{fontSize:10,color:T3,flex:1,textAlign:'center'}}>{title}</span>
      </div>
      <div style={{padding:'16px 18px',fontSize:11.5,lineHeight:2}}>
        {lines.map((l,i)=><div key={i} style={{color:l.c||T2,paddingLeft:l.indent?18:0}}>
          {l.prompt&&<span style={{color:T3,marginRight:8}}>{l.prompt}</span>}{l.text}
        </div>)}
        <div style={{marginTop:8,display:'flex',alignItems:'center',gap:5}}>
          <span style={{color:T3}}>›</span>
          <span style={{display:'inline-block',width:6,height:13,background:'rgba(255,255,255,0.4)',animation:'blink 1.2s step-end infinite',borderRadius:1}}/>
        </div>
      </div>
    </div>
  )
}

function InventoryMockup() {
  const rows=[
    {d:'easysecurity.in',  days:196,grade:'A+',ca:'RapidSSL',auto:true, s:'active'  },
    {d:'api.shop.com',     days:18, grade:'B', ca:'Sectigo', auto:true, s:'warning' },
    {d:'staging.portal.io',days:3,  grade:'C', ca:'RapidSSL',auto:false,s:'critical'},
    {d:'mail.company.com', days:84, grade:'A', ca:'RapidSSL',auto:true, s:'active'  },
  ]
  const sc=s=>s==='active'?GRN:s==='warning'?AMB:RED
  const gc=g=>g.startsWith('A')?GRN:g==='B'?AMB:RED
  return (
    <div style={{background:'#160a08',border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden'}}>
      <div style={{background:'#0d0000',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:`1px solid ${LN}`}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:T3,fontFamily:MONO,flex:1,textAlign:'center'}}>Inventory · 4 certificates</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 50px 52px 80px 55px 68px',padding:'6px 14px',borderBottom:`1px solid ${LN}`}}>
        {['Domain','Days','Grade','CA','Auto','Status'].map(h=><div key={h} style={{fontSize:9.5,fontWeight:500,color:T3,textTransform:'uppercase',letterSpacing:'0.05em',fontFamily:MONO}}>{h}</div>)}
      </div>
      {rows.map((r,i)=>(
        <div key={r.d} style={{display:'grid',gridTemplateColumns:'2fr 50px 52px 80px 55px 68px',padding:'9px 14px',borderBottom:i<rows.length-1?`1px solid ${LN}`:'none',background:r.s==='critical'?'rgba(248,113,113,0.04)':r.s==='warning'?'rgba(251,191,36,0.04)':'transparent',alignItems:'center'}}>
          <span style={{fontSize:11.5,fontWeight:500,color:T1,fontFamily:MONO}}>{r.d}</span>
          <span style={{fontSize:11,fontWeight:600,color:sc(r.s),fontFamily:MONO}}>{r.days}d</span>
          <span style={{fontSize:11,fontWeight:700,color:gc(r.grade)}}>{r.grade}</span>
          <span style={{fontSize:11,color:T2}}>{r.ca}</span>
          <span style={{fontSize:10,fontWeight:500,color:r.auto?GRN:T3}}>{r.auto?'✓ ON':'— OFF'}</span>
          <Pill status={r.s}/>
        </div>
      ))}
    </div>
  )
}

function CertVaultMockup() {
  return (
    <div style={{background:'#160a08',border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden'}}>
      <div style={{background:'#0d0000',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:`1px solid ${LN}`}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:T3,fontFamily:MONO,flex:1,textAlign:'center'}}>CertVault · Private key vault</span>
      </div>
      <div style={{padding:'14px'}}>
        <div style={{padding:'8px 10px',background:BG4,border:`1px solid ${LN}`,borderRadius:4,marginBottom:10,fontSize:11,color:T2,fontFamily:MONO}}>
          AES-256-GCM · Envelope encryption · Immutable audit
        </div>
        {[{d:'easysecurity.in',alg:'RSA-2048',last:'2h ago'},{d:'api.shop.com',alg:'EC-384',last:'Never'}].map((k,i)=>(
          <div key={k.d} style={{border:`1px solid ${LN}`,borderTop:`2px solid ${T1}`,borderRadius:4,padding:'11px',marginBottom:i===0?6:0,background:BG3}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:500,color:T1,fontFamily:MONO}}>{k.d}</span>
              <span style={{fontSize:9,fontWeight:600,color:T3,background:BG4,padding:'2px 7px',borderRadius:3,fontFamily:MONO}}>🔒 VAULT SECURED</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,marginBottom:9}}>
              {[['Algorithm',k.alg],['Rotations','2'],['Last access',k.last]].map(([l,v])=>(
                <div key={l} style={{background:BG4,borderRadius:3,padding:'5px 7px'}}>
                  <div style={{fontSize:9,color:T3,textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:11,fontWeight:500,color:T1,fontFamily:MONO}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:5}}>
              {['Reveal key','Rotate','Audit log'].map(t=>(
                <button key={t} style={{fontSize:10,padding:'4px 9px',borderRadius:3,border:`1px solid ${t==='Reveal key'?LN2:LN}`,background:t==='Reveal key'?BG4:BG3,color:t==='Reveal key'?T1:T2,cursor:'pointer',fontFamily:F}}>{t}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadinessMockup() {
  const certs=[{d:'easysecurity.in',s:92,label:'Ready',c:GRN},{d:'api.shop.com',s:58,label:'At Risk',c:AMB},{d:'staging.portal.io',s:24,label:'Will Break',c:RED}]
  return (
    <div style={{background:'#160a08',border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden'}}>
      <div style={{background:'#0d0000',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:`1px solid ${LN}`}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:T3,fontFamily:MONO,flex:1,textAlign:'center'}}>47-Day Readiness · CA/B Forum</span>
      </div>
      <div style={{padding:'12px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,marginBottom:10}}>
          {[{d:'Mar 2026',v:'200d',c:RED},{d:'Mar 2027',v:'100d',c:AMB},{d:'Mar 2029',v:'47d',c:GRN}].map(m=>(
            <div key={m.d} style={{padding:'8px',borderRadius:4,background:BG4,border:`1px solid ${LN}`}}>
              <div style={{fontSize:9.5,fontWeight:600,color:m.c,marginBottom:2,fontFamily:MONO}}>{m.d}</div>
              <div style={{fontSize:18,fontWeight:700,color:m.c,fontFamily:MONO}}>{m.v}</div>
              <div style={{fontSize:9,color:T3}}>max validity</div>
            </div>
          ))}
        </div>
        {certs.map(c=>(
          <div key={c.d} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:4,background:BG3,marginBottom:5,border:`1px solid ${LN}`}}>
            <div style={{position:'relative',width:32,height:32,flexShrink:0}}>
              <svg width="32" height="32" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke={LN2} strokeWidth="3"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke={c.c} strokeWidth="3" strokeDasharray={`${2*Math.PI*14}`} strokeDashoffset={`${2*Math.PI*14*(1-c.s/100)}`} strokeLinecap="round" transform="rotate(-90 18 18)"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:c.c}}>{c.s}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:500,color:T1,fontFamily:MONO}}>{c.d}</div>
              <div style={{fontSize:10,color:T3}}>Automation checklist</div>
            </div>
            <span style={{fontSize:10,fontWeight:500,color:c.c,background:c.c+'18',padding:'2px 7px',borderRadius:3,fontFamily:MONO}}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TICKER=['RFC 8555 · ACME v2','RapidSSL Partner','AES-256-GCM','TLS 1.3','DNS-01 Challenge','CT Log Monitor','CAA Records','HSTS Verified','SHA-256','CA/B Forum 2026','Zero-touch Renewal','CertVault','47-Day Ready','ML-KEM · PQC Ready','6,200+ Root CAs','CCADB Indexed','PKI Hub Live','eIDAS 2.0 Tracked','NIST FIPS 203/204/205','cPanel Auto-Install','VPS Agent · 60s Poll','Install Cron · 2 min','GoGetSSL CA Partner','200-Day · IN EFFECT']

export default function Home({ nav }) {
  const {isMobile,isTablet}=useIsMobile()
  const [certCount,setCertCount]=useState(null)
  const [count,setCount]=useState(0)

  useEffect(()=>{supabase.from('certificates').select('id',{count:'exact',head:true}).then(({count})=>count&&setCertCount(count))},[])
  useEffect(()=>{if(!certCount)return;let i=0;const iv=setInterval(()=>{i+=Math.ceil(certCount/60);if(i>=certCount){setCount(certCount);clearInterval(iv)}else setCount(i)},16);return()=>clearInterval(iv)},[certCount])

  const cols=isMobile?1:isTablet?2:3
  const P = 'clamp(20px,5vw,48px)'

  return (
    <div style={{fontFamily:F,position:'relative',background:`radial-gradient(ellipse at 65% 40%, #7a0000 0%, #4a0000 30%, #200000 60%, #120000 100%)`,color:T1,overflowX:'hidden'}}>
      {/* Comodo-style concentric ring overlay */}
      <div style={{position:'fixed',top:0,right:'-10%',width:'80vw',height:'100vh',pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
        {[600,500,400,320,240,160,90].map((s,i)=>(
          <div key={i} style={{
            position:'absolute',top:'50%',right:'5%',
            width:s+'px',height:s+'px',
            borderRadius:'50%',
            transform:'translateY(-50%)',
            border:`1.5px solid rgba(180,20,20,${0.12+i*0.04})`,
            background:'transparent'
          }}/>
        ))}
        {/* Radial glow spots */}
        <div style={{position:'absolute',top:'30%',right:'20%',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle, rgba(150,0,0,0.25) 0%, transparent 70%)'}}/>
        <div style={{position:'absolute',top:'55%',right:'5%',width:'200px',height:'200px',borderRadius:'50%',background:'radial-gradient(circle, rgba(180,0,0,0.2) 0%, transparent 70%)'}}/>
      </div>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}::selection{background:rgba(255,255,255,0.15);color:#fff}@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* ── NAV ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(13,17,23,0.95)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderBottom:`1px solid ${LN}`,height:52,display:'flex',alignItems:'center',padding:`0 ${P}`,justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0}} onClick={()=>nav('/')}>
          <div style={{width:22,height:22,background:'#c0392b',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:T1,letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>
        {!isMobile&&<nav style={{display:'flex',alignItems:'center',gap:1,background:'transparent'}}>
          {[['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']].map(([l,h])=>(
            <button key={l} onClick={()=>h.startsWith('/')?nav(h):document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
              style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:T2,padding:'5px 12px',borderRadius:4,transition:'color .12s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
          ))}
          <div style={{position:'relative'}}
            onMouseEnter={e=>{const d=e.currentTarget.querySelector('.id');if(d){d.style.opacity='1';d.style.transform='translateX(-50%) translateY(0)';d.style.pointerEvents='auto'}}}
            onMouseLeave={e=>{const d=e.currentTarget.querySelector('.id');if(d){d.style.opacity='0';d.style.transform='translateX(-50%) translateY(-4px)';d.style.pointerEvents='none'}}}>
            <button style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:T2,padding:'5px 12px',borderRadius:4,transition:'color .12s',display:'flex',alignItems:'center',gap:3}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>
              Industry Intelligence <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="id" style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%) translateY(-4px)',background:'#1f1210',border:'1px solid rgba(192,57,43,0.25)',borderRadius:6,padding:'5px',minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',zIndex:300,opacity:0,pointerEvents:'none',transition:'opacity .16s,transform .16s'}}>
              {[{label:'CA Trust Store',path:'/ca-trust-explorer',desc:'6,200+ root & intermediate CAs'},{label:'CAB Forum',path:'/cab-forum',desc:'Ballots, timelines & compliance'},{label:'PKI Hub',path:'/pki-hub',desc:'Standards bodies & PQC tracker'}].map(it=>(
                <button key={it.path} onClick={()=>nav(it.path)} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:'7px 10px',borderRadius:4,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{fontSize:12,fontWeight:500,color:T1,marginBottom:1}}>{it.label}</div>
                  <div style={{fontSize:11,color:T3}}>{it.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </nav>}
        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          {!isMobile&&<button onClick={()=>nav('/auth')} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:T2,padding:'5px 10px',borderRadius:4,transition:'color .12s'}} onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>Sign in</button>}
          <button onClick={()=>nav('/auth')} style={{background:'#c0392b',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:600,color:'#fff',padding:'7px 16px',borderRadius:5,transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#a93226'} onMouseLeave={e=>e.currentTarget.style.background='#c0392b'}>Get started</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(72px,10vw,120px) ${P} clamp(64px,8vw,100px)`,borderBottom:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?48:72,alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,border:`1px solid ${LN}`,borderRadius:100,padding:'4px 12px',marginBottom:28,background:'rgba(255,255,255,0.03)'}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,0.4)',animation:'blink 2.4s ease infinite'}}/>
                <span style={{fontSize:11,color:T3,fontFamily:MONO}}>RFC 8555 · CA/B Forum Compliant · PQC Intelligence</span>
              </div>
              <h1 style={{fontSize:`clamp(40px,5.5vw,72px)`,fontWeight:700,letterSpacing:'-2.5px',lineHeight:1.06,color:T1,marginBottom:20}}>
                Certificate<br/><span style={{color:'rgba(255,255,255,0.3)'}}>lifecycle</span><br/>management.
              </h1>
              <p style={{fontSize:15,color:T2,lineHeight:1.8,marginBottom:32,maxWidth:420}}>
                Issue, validate, deploy and auto-renew SSL/TLS certificates — with a persistent agent, DNS automation, AES-256 key vault, CA/B Forum compliance, and the industry's deepest PKI intelligence built in.
              </p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:40}}>
                <BtnPrimary label="Start managing certs" onClick={()=>nav('/auth')}/>
                <BtnGhost label="View pricing" onClick={()=>nav('/pricing')}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:`1px solid ${LN}`,paddingTop:24}}>
                {[{val:certCount?`${count.toLocaleString()}+`:'—',label:'Certs managed'},{val:'99.9%',label:'Renewal success'},{val:'12',label:'PKI bodies tracked'}].map((m,i)=>(
                  <div key={m.label} style={{paddingLeft:i>0?20:0,borderLeft:i>0?`1px solid ${LN}`:'none',marginLeft:i>0?20:0}}>
                    <div style={{fontSize:22,fontWeight:700,color:T1,fontFamily:MONO,letterSpacing:'-0.5px',marginBottom:3}}>{m.val}</div>
                    <div style={{fontSize:11,color:T3}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Term title="sslvault-agent · prod-server-01" lines={[
                {prompt:'›',text:'[21:05:12] Checking for pending jobs...',c:'rgba(255,255,255,0.2)'},
                {prompt:'›',text:'[21:05:13] Job received: renew · easysecurity.in',c:'rgba(255,255,255,0.75)'},
                {text:'↳ DNS provider: Cloudflare',c:T3,indent:true},
                {text:'↳ Adding TXT _acme-challenge...',c:T3,indent:true},
                {prompt:'›',text:'[21:05:15] DNS propagated · DCV validated ✓',c:GRN},
                {prompt:'›',text:'[21:05:16] Cert issued · RapidSSL TLS RSA CA 2022',c:GRN},
                {text:'↳ CN=easysecurity.in  valid 47d  grade A+',c:T3,indent:true},
                {prompt:'›',text:'[21:05:17] nginx -t OK · systemctl reload nginx ✓',c:GRN},
                {prompt:'›',text:'[21:05:18] CertVault: AES-256-GCM encrypted ✓',c:T2},
                {prompt:'›',text:'[21:05:18] ✓ Complete · next run: 21:07:18',c:GRN},
              ]}/>
              {!isMobile&&<div style={{marginTop:6,display:'inline-flex',alignItems:'center',gap:8,border:`1px solid ${LN}`,borderRadius:4,padding:'8px 12px',background:BG3,fontFamily:MONO}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:GRN}}/>
                <span style={{fontSize:11,color:T1}}>easysecurity.in</span>
                <span style={{fontSize:10,background:'rgba(255,255,255,0.08)',color:T2,padding:'1px 6px',borderRadius:3}}>A+</span>
                <span style={{fontSize:10,color:T3}}>196d · auto-renew ✓</span>
              </div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{background:'#160a08',borderBottom:`1px solid ${LN}`,overflow:'hidden',padding:'8px 0'}}>
        <div style={{display:'flex',overflow:'hidden',maskImage:'linear-gradient(to right,transparent,black 8%,black 92%,transparent)'}}>
          <div style={{display:'flex',gap:48,flexShrink:0,animation:'ticker 36s linear infinite',whiteSpace:'nowrap'}}>
            {[...TICKER,...TICKER].map((p,i)=><span key={i} style={{fontSize:10.5,fontWeight:400,color:T3,letterSpacing:'0.05em',fontFamily:MONO}}><span style={{color:LN2,marginRight:8}}>◆</span>{p}</span>)}
          </div>
        </div>
      </div>

      {/* ── PLATFORM ── */}
      <section id="platform" style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'flex-start',marginBottom:48}}>
              <div>
                <Eyebrow>What SSLVault does</Eyebrow>
                <H2 style={{marginBottom:14}}>The complete certificate lifecycle — fully automated.</H2>
                <Body>From initial CSR generation through DNS validation, installation, monitoring, and renewal — SSLVault handles every step. Connect once, manage forever.</Body>
              </div>
              <div>
                {[{n:'/ 01',t:'Issue',d:'Submit to RapidSSL via ACME v2. DNS-01 auto-validated via your provider API.'},{n:'/ 02',t:'Install',d:'VPS agent deploys to Nginx/Apache. cPanel auto-install via UAPI. Both paths are zero-touch — cron runs every 2 minutes.'},{n:'/ 03',t:'Monitor',d:'Expiry tracking, health scoring A–F, CT log abuse detection, CA/B Forum compliance.'},{n:'/ 04',t:'Renew',d:'Auto-renews 30 days before expiry. New cert deployed before old one expires.'}].map((s,i)=>(
                  <div key={s.n} style={{display:'flex',gap:16,padding:'16px 0',borderBottom:i<3?`1px solid ${LN}`:'none'}}>
                    <span style={{fontSize:11,color:T3,width:32,flexShrink:0,marginTop:1,fontFamily:MONO}}>{s.n}</span>
                    <div><div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:4}}>{s.t}</div><div style={{fontSize:12.5,color:T2,lineHeight:1.65}}>{s.d}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{fontSize:10,color:T3,fontFamily:MONO,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:500}}>Certificate inventory — live expiry · health grade · auto-renew status</div>
            <InventoryMockup/>
          </FadeUp>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{background:'#080000',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp><div style={{marginBottom:44,maxWidth:480}}>
              <Eyebrow>All capabilities</Eyebrow>
              <H2 style={{marginBottom:12}}>Every feature a PKI team needs.</H2>
              <Body>Eight core capability areas — built, not bolted on.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:1,background:LN,border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden'}}>
            {[{icon:'⚡',title:'Certificate issuance',specs:['DV, OV, EV, Wildcard, SAN','RapidSSL · DigiCert trust chain','ACME v2 · RFC 8555','Issued in < 5 minutes'],badge:'ACME v2'},
              {icon:'🤖',title:'VPS persistent agent',specs:['systemd daemon · polls every 60s','Nginx + Apache auto-detect','Config test before reload','Cron dispatches jobs every 2 min'],badge:'systemd'},
              {icon:'🌐',title:'DNS automation',specs:['Cloudflare · Vercel · Route53','Namecheap · GoDaddy · DigitalOcean','Auto TXT/CNAME challenge','Cleanup after DCV completes'],badge:'DNS-01'},
              {icon:'🏛',title:'cPanel auto-install',specs:['UAPI-based installation','No SSH or agent required','API token auth','Cron auto-installs within 2 min'],badge:'UAPI'},
              {icon:'🔐',title:'CertVault',specs:['AES-256-GCM · envelope encryption','Password re-auth before reveal','30-day rotation archive','Immutable audit log → CSV'],badge:'AES-256'},
              {icon:'📋',title:'47-day readiness',specs:['Scores every cert 0–100','200d → 100d → 47d timeline','Per-cert automation checklist','Fleet-wide compliance report'],badge:'CA/B 2026'},
              {icon:'🔍',title:'Discovery & monitoring',specs:['CT log scan via crt.sh','CT abuse monitor — unknown CAs','SSL health score A+ to F','HSTS · CAA · TLS 1.3 checks'],badge:'CT Logs'},
              {icon:'📈',title:'CA intelligence',specs:['GoGetSSL · RapidSSL · DigiCert chain','cPanel + VPS agent auto-install','Zero-touch renewal pipeline','Fleet expiry & compliance view'],badge:'Multi-CA'},
              {icon:'🏛',title:'Industry Intelligence',specs:['6,200+ CAs from CCADB live','CAB Forum ballot tracker','12 PKI bodies deep-dive','PQC migration tracker'],badge:'PKI Hub'},
              {icon:'🔬',title:'CA Trust Store',specs:['Every root & intermediate CA indexed','PKI Trust Score per certificate','Filter by trust store · algorithm','CSV export · PEM download'],badge:'CCADB'},
            ].map(f=>(
              <div key={f.title} style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:'20px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontSize:20}}>{f.icon}</span>
                    <Tag>{f.badge}</Tag>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:10}}>{f.title}</div>
                  {f.specs.map(s=><div key={s} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:5}}>
                    <span style={{color:T3,fontSize:11,marginTop:1,flexShrink:0}}>—</span>
                    <span style={{fontSize:12,color:T2,lineHeight:1.5}}>{s}</span>
                  </div>)}
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY CONTROLS ── */}
      <section style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{marginBottom:44}}>
              <Eyebrow>Security controls</Eyebrow>
              <H2 style={{marginBottom:12}}>Enterprise PKI controls. Not an afterthought.</H2>
              <Body>CertVault and 47-Day Readiness are built into every account — not a paid add-on.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16}}>
            <FadeUp>
              <div>
                <div style={{fontSize:10,color:T3,fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,fontWeight:500}}>🔐 AES-256-GCM private key vault</div>
                <CertVaultMockup/>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div>
                <div style={{fontSize:10,color:T3,fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,fontWeight:500}}>📋 CA/B Forum compliance scoring</div>
                <ReadinessMockup/>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── SECURITY SPECS ── */}
      <section id="security" style={{background:'#080000',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'flex-start',marginBottom:44}}>
              <div>
                <Eyebrow>Security specifications</Eyebrow>
                <H2 style={{marginBottom:14}}>Open standards throughout. No black boxes.</H2>
                <Body style={{marginBottom:20}}>Every layer of SSLVault is built on auditable open standards. RFC 8555 for issuance, AES-256-GCM for storage, CT logs for transparency.</Body>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{['RFC 8555','AES-256-GCM','TLS 1.3','CT Logs','CAA Records','HSTS','SHA-256'].map(t=><Tag key={t}>{t}</Tag>)}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))',gap:1,background:LN,border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden'}}>
                {[{spec:'AES-256-GCM',title:'Key encryption',desc:'DEK wrapped with KEK. Keys never in plaintext.'},{spec:'RFC 8555',title:'ACME v2',desc:'DNS-01 challenge. Auto-validated via provider API.'},{spec:'CT monitoring',title:'Cert transparency',desc:'crt.sh queries for every cert ever issued.'},{spec:'CAA + HSTS',title:'DNS security',desc:'CAA prevents unauthorised CA issuance.'},{spec:'TLS 1.2 / 1.3',title:'TLS posture',desc:'ECDHE + PFS. HSTS max-age verified.'},{spec:'Append-only',title:'Audit trail',desc:'Every access logged. CSV export for SOC 2.'}].map(s=>(
                  <div key={s.spec} style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:'14px'}}>
                    <div style={{fontSize:9.5,fontWeight:600,color:T3,fontFamily:MONO,letterSpacing:'0.05em',marginBottom:5}}>{s.spec}</div>
                    <div style={{fontSize:12,fontWeight:600,color:T1,marginBottom:4}}>{s.title}</div>
                    <div style={{fontSize:11.5,color:T2,lineHeight:1.6}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
          <FadeUp>
            <Card>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:24}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,0.4)',animation:'blink 2s ease infinite'}}/>
                <span style={{fontSize:12,fontWeight:600,color:T1}}>CA/B Forum maximum validity mandate — action required now</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:isMobile?20:0}}>
                {[{date:'March 15, 2026',limit:'200 days',status:'IN EFFECT',color:RED,action:'200-day maximum is now enforced. Certificates issued with longer validity are rejected by all major browsers.'},{date:'March 15, 2027',limit:'100 days',status:'UPCOMING',color:AMB,action:'Manual renewal every 100 days is operationally unsustainable. Automation becomes a hard requirement.'},{date:'March 15, 2029',limit:'47 days',status:'PLANNED',color:GRN,action:"Full zero-touch automation required. SSLVault's agent + DNS automation handles this end-to-end today."}].map((m,i)=>(
                  <div key={m.date} style={{padding:isMobile?'14px 0':'0 24px',borderLeft:!isMobile&&i>0?`1px solid ${LN}`:'none'}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:m.color,fontFamily:MONO,letterSpacing:'0.08em',marginBottom:6}}>{m.status}</div>
                    <div style={{fontSize:10,color:T3,fontFamily:MONO,marginBottom:4}}>{m.date}</div>
                    <div style={{fontSize:30,fontWeight:700,color:m.color,fontFamily:MONO,letterSpacing:'-1px',marginBottom:9}}>{m.limit}</div>
                    <div style={{fontSize:12.5,color:T2,lineHeight:1.7}}>{m.action}</div>
                  </div>
                ))}
              </div>
            </Card>
          </FadeUp>
        </div>
      </section>

      {/* ── DNS ── */}
      <section style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'center'}}>
            <FadeUp>
              <div>
                <Eyebrow>DNS automation</Eyebrow>
                <H2 style={{marginBottom:14}}>Automated DNS-01 challenge across every major provider.</H2>
                <Body style={{marginBottom:20}}>When issuing or renewing, SSLVault calls your DNS provider API to add the ACME challenge record, polls for propagation, validates, then cleans up — fully automatic.</Body>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))',gap:4}}>
                  {[['Cloudflare','API Token · Zone:DNS:Edit'],['Vercel','Access Token · Settings → Tokens'],['Route53','AWS IAM · Route53 write access'],['Namecheap','API Key · IP whitelist required'],['GoDaddy','API Key + Secret'],['DigitalOcean','Personal Access Token'],['Plesk','XML API'],['+ more','Contact us']].map(([name,note])=>(
                    <div key={name} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',background:BG3,border:`1px solid ${LN}`,borderRadius:4}}>
                      <div style={{width:4,height:4,borderRadius:'50%',background:T3,flexShrink:0}}/>
                      <div><div style={{fontSize:12,fontWeight:500,color:T1}}>{name}</div><div style={{fontSize:10.5,color:T3,fontFamily:MONO}}>{note}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <Term title="dns-provider · Cloudflare API" lines={[
                {prompt:'#',text:' DCV for renewal · api.myshop.com',c:'rgba(255,255,255,0.18)'},
                {prompt:'›',text:'Resolving zone: myshop.com',c:T2},
                {prompt:'›',text:'PUT /zones/{id}/dns_records',c:'rgba(255,255,255,0.75)'},
                {text:'↳ type:TXT  name:_acme-challenge',c:T3,indent:true},
                {text:'↳ content:xK3-mP9_aQ2rZ...  ttl:60',c:T3,indent:true},
                {prompt:'›',text:'Record created · TTL 60s',c:GRN},
                {prompt:'›',text:'Propagated in 4.2s ✓',c:GRN},
                {prompt:'›',text:'ACME challenge: verified ✓',c:GRN},
                {prompt:'›',text:'Challenge record removed ✓',c:T2},
              ]}/>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section style={{background:'#080000',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{textAlign:'center',marginBottom:44}}>
              <Eyebrow>How it works</Eyebrow>
              <H2 style={{maxWidth:480,margin:'8px auto 12px'}}>From CSR to live HTTPS in one automated pipeline.</H2>
              <Body style={{maxWidth:420,margin:'0 auto'}}>SSLVault orchestrates every step across ACME, your DNS provider, and your web server.</Body>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?1:5},1fr)`,gap:isMobile?8:0,marginBottom:40,alignItems:'center'}}>
              {[{n:'/ 01',icon:'🖥',title:'Issue request',desc:'Select domain + cert type. SSLVault generates CSR.'},null,{n:'/ 02',icon:'🌐',title:'Auto DCV',desc:'DNS provider API adds ACME challenge. Auto-validated.'},null,{n:'/ 03',icon:'🏛',title:'CA issues cert',desc:'RapidSSL signs cert. Stored encrypted in CertVault.'}].map((s,i)=>{
                if(!s)return <div key={i} style={{display:'flex',justifyContent:'center',alignItems:'center'}}><svg width="24" height="8" viewBox="0 0 24 8" fill="none"><line x1="0" y1="4" x2="19" y2="4" stroke={LN2} strokeWidth="1" strokeDasharray="2 2"/><path d="M17 1l4 3-4 3" stroke={LN2} strokeWidth="1" strokeLinecap="round"/></svg></div>
                return <Card key={s.n} style={{textAlign:'center',padding:'18px'}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:10,color:T3,fontFamily:MONO,marginBottom:5}}>{s.n}</div>
                  <div style={{fontSize:12,fontWeight:600,color:T1,marginBottom:5}}>{s.title}</div>
                  <div style={{fontSize:11,color:T2,lineHeight:1.6}}>{s.desc}</div>
                </Card>
              })}
            </div>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?1:5},1fr)`,gap:isMobile?8:0,alignItems:'center'}}>
              {[null,{n:'/ 05',icon:'🔄',title:'Lifecycle loop',desc:'Monitors expiry. Auto-renews 30 days before. Zero manual steps.'},null,{n:'/ 04',icon:'⚡',title:'Auto-install',desc:'VPS agent deploys to Nginx/Apache, or cPanel UAPI — both fully automatic within 2 minutes.'},null].map((s,i)=>{
                if(!s)return <div key={i}/>
                return <Card key={s.n} style={{textAlign:'center',padding:'18px'}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:10,color:T3,fontFamily:MONO,marginBottom:5}}>{s.n}</div>
                  <div style={{fontSize:12,fontWeight:600,color:T1,marginBottom:5}}>{s.title}</div>
                  <div style={{fontSize:11,color:T2,lineHeight:1.6}}>{s.desc}</div>
                </Card>
              })}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── INDUSTRY INTELLIGENCE ── */}
      <section style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{marginBottom:44}}>
              <Eyebrow>Industry Intelligence</Eyebrow>
              <H2 style={{marginBottom:12,maxWidth:520}}>The deepest PKI intelligence platform on the web.</H2>
              <Body style={{maxWidth:500}}>Not just a certificate manager — a living knowledge base covering every CA, standard, governance body, and cryptographic transition shaping the industry.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:1,background:LN,border:`1px solid ${LN}`,borderRadius:6,overflow:'hidden',marginBottom:12}}>
            {[{icon:'🏛',title:'CA Trust Store',sub:'6,200+ root & intermediate CAs',desc:'Every CA in Chrome, Firefox, Apple, and Microsoft trust stores — live from CCADB. Search by operator, algorithm, region. PKI Trust Score per cert.',badge:'CCADB Live',path:'/ca-trust-explorer',stats:[['6,200+','CAs indexed'],['4','Trust stores'],['Daily','CCADB sync']]},{icon:'⚖️',title:'CAB Forum Intelligence',sub:'Ballots, timelines & compliance',desc:'Every CAB Forum ballot tracked with plain-English summaries. 47-day countdown, SC081v3 compliance deadlines, 5 working groups, full PKI history timeline from 2005.',badge:'Live sync',path:'/cab-forum',stats:[['47-day','2029 mandate'],['5','Working groups'],['Real-time','Ballot feed']]},{icon:'🌍',title:'Global PKI Hub',sub:'12 bodies · 22 standards · PQC tracker',desc:'CAB Forum, ETSI ESI, NIST, IETF, APKIC, eIDAS 2.0, PKI Consortium, CSC, FIDO, WebTrust, CCADB, ITU-T — each with deep-dive pages, standards library, and PQC migration status.',badge:'PQC Ready',path:'/pki-hub',stats:[['12','PKI bodies'],['3','NIST PQC finals'],['2026','Amsterdam conf.']]}].map(item=>(
              <div key={item.title} onClick={()=>nav(item.path)} style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:'22px',cursor:'pointer',transition:'background .12s',height:'100%',display:'flex',flexDirection:'column',gap:14}}
                  onMouseEnter={e=>e.currentTarget.style.background=BG3} onMouseLeave={e=>e.currentTarget.style.background=BG}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                    <span style={{fontSize:26}}>{item.icon}</span>
                    <Tag>{item.badge}</Tag>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:3}}>{item.title}</div>
                    <div style={{fontSize:10.5,color:T3,fontFamily:MONO,marginBottom:9}}>{item.sub}</div>
                    <div style={{fontSize:12,color:T2,lineHeight:1.7}}>{item.desc}</div>
                  </div>
                  <div style={{display:'flex',borderTop:`1px solid ${LN}`,paddingTop:12,marginTop:'auto'}}>
                    {item.stats.map(([val,label],i)=>(
                      <div key={label} style={{flex:1,paddingLeft:i>0?12:0,borderLeft:i>0?`1px solid ${LN}`:'none',marginLeft:i>0?12:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:T1,fontFamily:MONO,marginBottom:1}}>{val}</div>
                        <div style={{fontSize:10,color:T3}}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:T3}}>Explore →</div>
              </div>
            ))}
          </div>
          <FadeUp>
            <Card style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
              <span style={{fontSize:22,flexShrink:0}}>⚛️</span>
              <div style={{flex:1,minWidth:240}}>
                <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:4}}>Post-Quantum Cryptography migration tracker — live</div>
                <div style={{fontSize:12,color:T2,lineHeight:1.7}}>NIST finalised ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) in August 2024. The PKI Hub tracks every body's PQC readiness — from IETF LAMPS WG certificate profiles to ETSI EN 319 updates.</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
                {[['ML-KEM','FIPS 203'],['ML-DSA','FIPS 204'],['SLH-DSA','FIPS 205']].map(([alg,fips])=>(
                  <div key={alg} style={{background:BG4,border:`1px solid ${LN}`,borderRadius:4,padding:'6px 10px',textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:T1,fontFamily:MONO}}>{alg}</div>
                    <div style={{fontSize:9.5,color:T3,marginTop:1}}>{fips}</div>
                  </div>
                ))}
                <button onClick={()=>nav('/pki-hub')} style={{background:'#c0392b',border:'none',borderRadius:4,padding:'7px 14px',fontSize:12,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:F,transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#a93226'} onMouseLeave={e=>e.currentTarget.style.background='#c0392b'}>View PQC tracker →</button>
              </div>
            </Card>
          </FadeUp>
        </div>
      </section>

      {/* ── CERTBIND ── */}
      <section style={{background:'#080000',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:18}}>
              <span style={{fontSize:10,fontWeight:600,color:RED,letterSpacing:'0.07em',textTransform:'uppercase',fontFamily:MONO,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:3,padding:'2px 9px'}}>Industry first</span>
              <span style={{fontSize:10,color:T3,letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:MONO}}>No other CLM vendor has built this</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:72,alignItems:'center',marginBottom:40}}>
              <div>
                <h2 style={{fontSize:`clamp(22px,3.5vw,40px)`,fontWeight:700,letterSpacing:'-1px',lineHeight:1.12,color:T1,marginBottom:16}}>
                  Every other CLM tells you what cert you issued.<br/><span style={{color:T3}}>SSLVault proves what's actually running.</span>
                </h2>
                <p style={{fontSize:14,color:T2,lineHeight:1.8,marginBottom:20,maxWidth:440}}>A certificate can be valid. HTTPS can be green. Your CLM can show everything healthy. And your server can be serving a mismatched key, a rogue cert, or half a load balancer pool — and nobody knows.</p>
                <p style={{fontSize:14,color:T2,lineHeight:1.8,marginBottom:28,maxWidth:440}}>CertBind closes that gap with continuous, cryptographic proof — every 5 minutes.</p>
                <div style={{display:'flex',gap:10}}><BtnPrimary label="See CertBind" onClick={()=>nav('/auth')}/><BtnGhost label="Read how it works" onClick={()=>nav('/knowledge-base')}/></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <Card style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <span style={{fontSize:13}}>🔗</span>
                    <span style={{fontSize:12,fontWeight:500,color:T1,fontFamily:MONO}}>CertBind</span>
                    <span style={{fontSize:9.5,fontWeight:600,color:GRN,background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:3,padding:'1px 7px',fontFamily:MONO}}>ACTIVE</span>
                  </div>
                  <span style={{fontSize:10.5,color:T3,fontFamily:MONO}}>4/4 domains bound</span>
                </Card>
                {[{n:'01',label:'Key-Cert Binding Proof',status:'VERIFIED',desc:'Agent signs nonce · key ↔ cert proven cryptographically'},{n:'02',label:'Live TLS Fingerprint',status:'MATCH',desc:'SHA-256 of served cert matches issued cert on every poll'},{n:'03',label:'Chain Integrity',status:'CLEAN',desc:'No unexpected intermediates · no SSL inspection proxy'},{n:'04',label:'Multi-Node Consistency',status:'7/7 NODES',desc:'All load balancer nodes serving correct certificate'}].map(l=>(
                  <Card key={l.n} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 12px'}}>
                    <div style={{width:20,height:20,borderRadius:3,background:BG4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:T3,fontFamily:MONO,flexShrink:0}}>{l.n}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
                        <span style={{fontSize:12,fontWeight:500,color:T1}}>{l.label}</span>
                        <span style={{fontSize:9.5,fontWeight:600,color:GRN,fontFamily:MONO}}>{l.status}</span>
                      </div>
                      <div style={{fontSize:10.5,color:T3,fontFamily:MONO}}>{l.desc}</div>
                    </div>
                  </Card>
                ))}
                <Card style={{display:'flex',gap:9,alignItems:'flex-start',padding:'10px 12px',background:'rgba(248,113,113,0.05)',border:'1px solid rgba(248,113,113,0.12)'}}>
                  <span style={{fontSize:13,flexShrink:0}}>🚨</span>
                  <div>
                    <div style={{fontSize:11.5,fontWeight:600,color:RED,marginBottom:2}}>What CertBind catches that others miss</div>
                    <div style={{fontSize:10.5,color:T3,fontFamily:MONO,lineHeight:1.7}}>key_mismatch · cert_mismatch · chain_anomaly · partial_deploy</div>
                  </div>
                </Card>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={80}>
            <div style={{borderTop:`1px solid ${LN}`,paddingTop:32}}>
              <div style={{fontSize:10,color:T3,fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:16,textAlign:'center',fontWeight:500}}>Real-world failures CertBind prevents</div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?1:3},1fr)`,gap:8}}>
                {[{status:'key_mismatch',color:RED,bg:'rgba(248,113,113,0.05)',bd:'rgba(248,113,113,0.12)',title:'The Zombie Certificate',scenario:'Nginx renewed cert automatically. But a config change six months ago redirected nginx to a backup key from a previous issuance. CLM shows green. Browser shows valid. The cert and key are from different issuances.',impact:'$11M average PKI outage cost · undetected for months in typical orgs'},{status:'partial_deploy',color:AMB,bg:'rgba(251,191,36,0.05)',bd:'rgba(251,191,36,0.12)',title:'The Phantom Install',scenario:'New cert deployed to 4 of 7 load balancer nodes. The other 3 are still running the cert that expires in 4 days. CLM shows the cert was issued and installed. It has no idea about the other 3 nodes.',impact:'#1 cause of PKI-related outages in enterprises · usually found by customers first'},{status:'chain_anomaly',color:'#a78bfa',bg:'rgba(167,139,250,0.05)',bd:'rgba(167,139,250,0.12)',title:'The Silent Swap',scenario:"Enterprise Palo Alto proxy is SSL-inspecting traffic to your API server. Every TLS connection is being decrypted, inspected, and re-encrypted with the proxy's internal CA. Your CLM doesn't know.",impact:'Affects every enterprise with SSL inspection · invisible to all other CLM tools'}].map(s=>(
                  <div key={s.title} style={{background:s.bg,border:`1px solid ${s.bd}`,borderRadius:6,padding:'16px'}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:s.color,fontFamily:MONO,letterSpacing:'0.05em',marginBottom:8}}>{s.status.toUpperCase()}</div>
                    <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:8}}>{s.title}</div>
                    <div style={{fontSize:12,color:T2,lineHeight:1.75,marginBottom:9}}>{s.scenario}</div>
                    <div style={{fontSize:11,fontWeight:500,color:s.color,lineHeight:1.5}}>{s.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'flex-start'}}>
            <FadeUp>
              <div>
                <Eyebrow>Why we built this</Eyebrow>
                <H2 style={{marginBottom:14}}>PKI expertise shouldn't require a $250k contract.</H2>
                <Body style={{marginBottom:16}}>SSLVault is built by a Certified PKI Specialist with deep CA industry experience. The same automation enterprise teams pay hundreds of thousands for — available without the procurement cycle.</Body>
                <Body style={{marginBottom:28}}>As CA/B Forum mandates tighten (200d → 100d → 47d between 2026–2029), full automation becomes non-negotiable. SSLVault is built for what's coming.</Body>
                <div style={{display:'flex',gap:10}}><BtnPrimary label="Get started" onClick={()=>nav('/auth')}/><BtnGhost label="View pricing" onClick={()=>nav('/pricing')}/></div>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {[{name:'Venafi TLS Protect',price:'$250k+/yr',notes:'Enterprise only · No cert issuance · No cPanel',hi:false},{name:'Keyfactor Command',price:'$75–200k/yr',notes:'Mid-market · Complex setup · No free tier',hi:false},{name:'SSLVault CLM',price:'Partner rates',notes:'Full CLM · Agent + cPanel + DNS · All cert types',hi:true}].map(c=>(
                  <div key={c.name} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:c.hi?'rgba(255,255,255,0.04)':BG3,border:`1px solid ${c.hi?LN3:LN}`,borderRadius:5}}>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:c.hi?600:500,color:T1}}>{c.name}</div><div style={{fontSize:11,color:T3,marginTop:2}}>{c.notes}</div></div>
                    <div style={{fontSize:13,fontWeight:c.hi?600:400,color:c.hi?T1:T3,fontFamily:MONO,whiteSpace:'nowrap'}}>{c.price}</div>
                  </div>
                ))}
                <div style={{marginTop:5,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))',gap:4}}>
                  {[['DigiCert','Trust chain · 99.9% browser'],['RapidSSL','CA partner · wholesale pricing'],['RFC 8555','ACME v2 · no lock-in'],['AES-256','Military-grade key storage'],['GDPR','Netherlands-based PKI engineer 🇳🇱'],['No ads','No tracking · no reselling']].map(([val,sub])=>(
                    <div key={val} style={{display:'flex',gap:9,padding:'8px 10px',background:BG3,border:`1px solid ${LN}`,borderRadius:3,alignItems:'center'}}>
                      <div style={{fontSize:11,fontWeight:500,color:T1,fontFamily:MONO,minWidth:65}}>{val}</div>
                      <div style={{fontSize:10.5,color:T3,lineHeight:1.4}}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{background:'#080000',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:`1px solid ${LN}`}}>
        <div style={{maxWidth:560,margin:'0 auto',textAlign:'center'}}>
          <FadeUp>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,border:`1px solid ${LN}`,borderRadius:100,padding:'4px 12px',marginBottom:22,background:'rgba(255,255,255,0.03)'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,0.35)',animation:'blink 2.4s ease infinite'}}/>
              <span style={{fontSize:11,color:T3,fontFamily:MONO}}>Production-ready · RFC 8555 · CA/B Forum 2026 compliant</span>
            </div>
            <h2 style={{fontSize:'clamp(22px,4vw,38px)',fontWeight:700,letterSpacing:'-0.8px',lineHeight:1.14,color:T1,marginBottom:14}}>
              Ready to automate your<br/><span style={{color:T3}}>certificate lifecycle?</span>
            </h2>
            <p style={{fontSize:14,color:T2,lineHeight:1.75,maxWidth:420,margin:'0 auto 28px'}}>
              Issue, monitor, and auto-renew SSL certificates with enterprise-grade PKI controls — CertVault, 47-day readiness, and CA intelligence included.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:22}}>
              <BtnPrimary label="Start managing certs" onClick={()=>nav('/auth')}/>
              <BtnGhost label="View pricing" onClick={()=>nav('/pricing')}/>
            </div>
            <div style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap'}}>
              {['RapidSSL · DigiCert trust chain','RFC 8555 · AES-256-GCM','CA/B Forum 2026 ready'].map(t=>(
                <span key={t} style={{fontSize:11,color:T3,display:'flex',alignItems:'center',gap:5}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T3} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>{t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:`radial-gradient(ellipse at 70% 50%, #8b0000 0%, #5c0000 25%, #2d0000 50%, #1a0000 70%, #0d0000 100%)`,backgroundSize:'cover',borderTop:`1px solid ${LN}`,padding:`clamp(36px,5vw,52px) ${P} clamp(22px,3vw,32px)`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:32,paddingBottom:24,borderBottom:`1px solid ${LN}`}}>
            <div style={{width:20,height:20,background:'rgba(255,255,255,0.1)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T1} strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:T1}}>SSLVault</span>
            <span style={{fontSize:11,color:T3,fontFamily:MONO,marginLeft:4}}>PKI-first CLM · Built by a real PKI engineer</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fill,minmax(140px,1fr))',gap:24,marginBottom:32}}>
            {[{title:'Product',links:[['Pricing',()=>nav('/pricing')],['Get started',()=>nav('/auth')],['Dashboard',()=>nav('/dashboard')]]},{title:'Support',links:[['Install Guide',()=>nav('/install')],['Knowledge Base',()=>nav('/knowledge-base')],['CAA Checker',()=>nav('/caa-check')]]},{title:'Intelligence',links:[['CA Trust Store',()=>nav('/ca-trust-explorer')],['CAB Forum',()=>nav('/cab-forum')],['PKI Hub',()=>nav('/pki-hub')],['Trust Passport',()=>nav('/trust-passport')]]},{title:'Security',links:[['CertVault','#security'],['47-Day Readiness','#security'],['CT Monitoring','#security'],['Health Scoring','#security']]},{title:'Protocol',links:[['RFC 8555','#security'],['DNS-01','#security'],['AES-256-GCM','#security']]},{title:'Company',links:[['About',()=>nav('/about')],['Contact',()=>nav('/contact')]]}].map(col=>(
              <div key={col.title}>
                <div style={{fontSize:10,fontWeight:600,color:T3,textTransform:'uppercase',letterSpacing:'0.07em',fontFamily:MONO,marginBottom:12}}>{col.title}</div>
                {col.links.map(([l,h])=>(
                  <div key={l} style={{marginBottom:8}}>
                    <button onClick={()=>typeof h==='function'?h():document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:T3,fontFamily:F,padding:0,transition:'color .12s',textAlign:'left'}}
                      onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T3}>{l}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${LN}`,paddingTop:18,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:11,color:T3,fontFamily:MONO}}>Made with ♥ towards PKI · Built by a real PKI engineer</span>
            <span style={{fontSize:11,color:T3}}>© 2026 SSLVault. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
