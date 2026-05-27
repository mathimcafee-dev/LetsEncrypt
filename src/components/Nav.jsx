import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'

const F = "'Montserrat',system-ui,sans-serif"
const W = '#f0ede8', BK = 'transparent'
const T1 = 'rgba(192,57,43,0.12)', T2 = 'rgba(240,237,232,0.55)', T3 = 'rgba(240,237,232,0.35)'
const LN = 'rgba(192,57,43,0.15)', LN2 = 'rgba(192,57,43,0.25)'

function useW(bp=760){const[m,setM]=useState(window.innerWidth<=bp);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function Nav({ nav, page }) {
  const [mob, setMob] = useState(false)
  const [drop, setDrop] = useState(false)
  const sm = useW()
  const ref = useRef(null)
  useEffect(()=>{setMob(false);setDrop(false)},[page])
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setDrop(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])

  const links=[['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']]
  const intel=[
    {label:'CA Trust Store',path:'/ca-trust-explorer',desc:'6,200+ root & intermediate CAs'},
    {label:'CAB Forum',path:'/cab-forum',desc:'Ballots, timelines & compliance'},
    {label:'PKI Hub',path:'/pki-hub',desc:'Standards bodies & PQC tracker'},
    {label:'Trust Passport',path:'/trust-passport',desc:'Is this site safe? Time-based trust'},
  ]
  const go=h=>h.startsWith('/')?nav(h):document.querySelector(h)?.scrollIntoView({behavior:'smooth'})

  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:W,borderBottom:`1px solid ${LN}`,fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:52,padding:'0 clamp(16px,4vw,40px)'}}>

        {/* Logo */}
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',userSelect:'none',flexShrink:0}}>
          <div style={{width:22,height:22,background:'#e07060',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f0ede8" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:T1,letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>

        {/* Desktop links */}
        {!sm && <div style={{display:'flex',alignItems:'center',gap:1}}>
          {links.map(([l,h])=>(
            <button key={l} onClick={()=>go(h)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:400,color:T2,padding:'5px 11px',borderRadius:3,transition:'color .12s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
          ))}
          <div ref={ref} style={{position:'relative'}}>
            <button onClick={()=>setDrop(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:400,color:drop?T1:T2,padding:'5px 11px',borderRadius:3,transition:'color .12s',display:'flex',alignItems:'center',gap:3}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>{if(!drop)e.currentTarget.style.color=T2}}>
              Industry Intelligence
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform:drop?'rotate(180deg)':'none',transition:'transform .18s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {drop && (
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:W,border:`1px solid ${LN2}`,borderRadius:4,padding:'5px',minWidth:200,boxShadow:'0 4px 16px rgba(240,237,232,0.1)',zIndex:300}}>
                {intel.map(it=>(
                  <button key={it.path} onClick={()=>{nav(it.path);setDrop(false)}} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:'7px 10px',borderRadius:3,transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='transparent'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <div style={{fontSize:12,fontWeight:500,color:T1,marginBottom:1}}>{it.label}</div>
                    <div style={{fontSize:11,color:T3}}>{it.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}

        {/* Desktop CTA */}
        {!sm && <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <button onClick={()=>nav('/auth')} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:T2,padding:'5px 10px',borderRadius:3,transition:'color .12s'}}
            onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>Sign in</button>
          <button onClick={()=>nav('/auth')} style={{background:BK,border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:600,color:W,padding:'6px 14px',borderRadius:3,transition:'background .12s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#222'} onMouseLeave={e=>e.currentTarget.style.background=BK}>Get started</button>
        </div>}

        {/* Mobile burger */}
        {sm && <button onClick={()=>setMob(o=>!o)} style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${LN}`,borderRadius:3,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T2,padding:0}}>
          {mob?<X size={15}/>:<Menu size={15}/>}
        </button>}
      </div>

      {/* Mobile drawer */}
      {sm && mob && (
        <div style={{borderTop:`1px solid ${LN}`,background:W}}>
          <div style={{padding:'10px 14px 16px',display:'flex',flexDirection:'column',gap:1}}>
            {links.map(([l,h])=>(
              <button key={l} onClick={()=>{go(h);setMob(false)}} style={{padding:'10px 12px',borderRadius:3,cursor:'pointer',fontSize:13,color:T2,background:'none',border:'none',textAlign:'left',fontFamily:F,transition:'color .12s'}}
                onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
            ))}
            <div style={{height:1,background:LN,margin:'7px 0 9px'}}/>
            <button onClick={()=>{nav('/auth');setMob(false)}} style={{display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.05)',color:T1,border:`1px solid ${LN}`,padding:'10px 12px',borderRadius:3,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:F,marginBottom:6}}>Sign in</button>
            <button onClick={()=>{nav('/auth');setMob(false)}} style={{display:'flex',alignItems:'center',justifyContent:'center',background:'#f0ede8',color:'#f5f0eb',border:'none',padding:'10px 12px',borderRadius:3,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Get started</button>
          </div>
        </div>
      )}
    </nav>
  )
}
