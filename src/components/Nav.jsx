// Nav.jsx — Owlish design · all content preserved
import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'

const F = "'Inter',system-ui,sans-serif"
const BG='#0a0a0a', BG3='#111111', LINE='rgba(255,255,255,0.07)', LINE2='rgba(255,255,255,0.12)'
const T1='#ffffff', T2='rgba(255,255,255,0.55)', T3='rgba(255,255,255,0.28)'

function useIsMobile(bp=760) {
  const [m,setM] = useState(typeof window!=='undefined'?window.innerWidth<=bp:false)
  useEffect(()=>{ const h=()=>setM(window.innerWidth<=bp); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) },[bp])
  return m
}

export default function Nav({ nav, page }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [intelOpen, setIntelOpen] = useState(false)
  const isMobile = useIsMobile()
  const intelRef = useRef(null)

  useEffect(()=>{ setMobileOpen(false); setIntelOpen(false) },[page])
  useEffect(()=>{ const h=(e)=>{ if(intelRef.current&&!intelRef.current.contains(e.target))setIntelOpen(false) }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) },[])

  const links = [['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']]
  const intel = [
    {label:'CA Trust Store',path:'/ca-trust-explorer',desc:'6,200+ root & intermediate CAs'},
    {label:'CAB Forum',path:'/cab-forum',desc:'Ballots, timelines & compliance'},
    {label:'PKI Hub',path:'/pki-hub',desc:'Standards bodies & PQC tracker'},
    {label:'Trust Passport',path:'/trust-passport',desc:'Is this site safe? Time-based trust'},
  ]

  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:'rgba(10,10,10,0.95)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',borderBottom:`1px solid ${LINE}`,fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:52,padding:`0 clamp(16px,4vw,40px)`}}>
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flexShrink:0,userSelect:'none'}}>
          <div style={{width:22,height:22,background:T1,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:T1,letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>

        {!isMobile&&<div style={{display:'flex',alignItems:'center',gap:1}}>
          {links.map(([l,h])=>(
            <button key={l} onClick={()=>h.startsWith('/')?nav(h):document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
              style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:400,color:T2,padding:'5px 11px',borderRadius:3,transition:'color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
          ))}
          <div ref={intelRef} style={{position:'relative'}}>
            <button onClick={()=>setIntelOpen(o=>!o)}
              style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:400,color:intelOpen?T1:T2,padding:'5px 11px',borderRadius:3,transition:'color .15s',display:'flex',alignItems:'center',gap:3}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>{ if(!intelOpen)e.currentTarget.style.color=T2 }}>
              Industry Intelligence
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform:intelOpen?'rotate(180deg)':'none',transition:'transform .18s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {intelOpen&&(
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:BG3,border:`1px solid ${LINE2}`,borderRadius:4,padding:'5px',minWidth:195,zIndex:300,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
                {intel.map(item=>(
                  <button key={item.path} onClick={()=>{nav(item.path);setIntelOpen(false)}}
                    style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:'7px 10px',borderRadius:3,transition:'background .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <div style={{fontSize:12,fontWeight:500,color:T1,marginBottom:1}}>{item.label}</div>
                    <div style={{fontSize:10.5,color:T3}}>{item.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}

        {!isMobile&&<div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button onClick={()=>nav('/auth')} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:T2,padding:'5px 10px',borderRadius:3,transition:'color .15s'}} onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>Sign in</button>
          <button onClick={()=>nav('/auth')} style={{background:T1,border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:600,color:BG,padding:'6px 14px',borderRadius:3,transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.88)'} onMouseLeave={e=>e.currentTarget.style.background=T1}>Get started</button>
        </div>}

        {isMobile&&<button onClick={()=>setMobileOpen(o=>!o)} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${LINE}`,borderRadius:3,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T2,padding:0}}>
          {mobileOpen?<X size={15}/>:<Menu size={15}/>}
        </button>}
      </div>

      {isMobile&&mobileOpen&&(
        <div style={{borderTop:`1px solid ${LINE}`,background:BG}}>
          <div style={{padding:'10px 14px 16px',display:'flex',flexDirection:'column',gap:1}}>
            {links.map(([l,h])=>(
              <button key={l} onClick={()=>{h.startsWith('/')?nav(h):document.querySelector(h)?.scrollIntoView({behavior:'smooth'});setMobileOpen(false)}}
                style={{padding:'10px 12px',borderRadius:3,cursor:'pointer',fontSize:13,fontWeight:400,color:T2,background:'none',border:'none',textAlign:'left',fontFamily:F,transition:'color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
            ))}
            <div style={{height:1,background:LINE,margin:'7px 0 9px'}}/>
            <button onClick={()=>{nav('/auth');setMobileOpen(false)}} style={{display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.06)',color:T2,border:`1px solid ${LINE}`,padding:'10px 12px',borderRadius:3,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:F,marginBottom:6}}>Sign in</button>
            <button onClick={()=>{nav('/auth');setMobileOpen(false)}} style={{display:'flex',alignItems:'center',justifyContent:'center',background:T1,color:BG,border:'none',padding:'10px 12px',borderRadius:3,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Get started</button>
          </div>
        </div>
      )}
    </nav>
  )
}
