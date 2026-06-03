import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

const F = "'Inter',system-ui,sans-serif"
const T1 = '#111111'
const T2 = '#555555'
const T3 = '#888888'
const LN = 'rgba(0,0,0,0.08)'
const LN2 = 'rgba(0,0,0,0.12)'

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
  ]
  const go=h=>{
    if(h.startsWith('/')) { nav(h); return }
    if(window.location.pathname==='/') {
      document.querySelector(h)?.scrollIntoView({behavior:'smooth'})
    } else {
      nav('/')
      setTimeout(()=>document.querySelector(h)?.scrollIntoView({behavior:'smooth'}),300)
    }
  }

  return (
    <nav style={{
      position:'sticky',top:0,zIndex:200,
      background:'#ffffff',
      borderBottom:`1px solid ${LN}`,
      fontFamily:F,
      boxShadow:'0 1px 0 rgba(0,0,0,0.05)',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:54,padding:'0 clamp(16px,4vw,40px)'}}>

        {/* Logo */}
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none',flexShrink:0}}>
          <div style={{width:26,height:26,background:'#1f5c4e',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:14,fontWeight:700,color:'#111111',letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>

        {/* Desktop nav links */}
        {!sm && (
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            {links.map(([l,h])=>(
              <button key={l} onClick={()=>go(h)}
                style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:400,color:T2,padding:'6px 13px',borderRadius:6,transition:'all .12s'}}
                onMouseEnter={e=>{e.currentTarget.style.color=T1;e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
                onMouseLeave={e=>{e.currentTarget.style.color=T2;e.currentTarget.style.background='none'}}>
                {l}
              </button>
            ))}
            <div ref={ref} style={{position:'relative'}}>
              <button onClick={()=>setDrop(o=>!o)}
                style={{background:drop?'rgba(0,0,0,0.04)':'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:400,color:drop?T1:T2,padding:'6px 13px',borderRadius:6,transition:'all .12s',display:'flex',alignItems:'center',gap:4}}
                onMouseEnter={e=>{e.currentTarget.style.color=T1;e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
                onMouseLeave={e=>{if(!drop){e.currentTarget.style.color=T2;e.currentTarget.style.background='none'}}}>
                Industry Intelligence
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform:drop?'rotate(180deg)':'none',transition:'transform .18s'}}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {drop && (
                <div style={{position:'absolute',top:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',background:'#ffffff',border:`1px solid ${LN2}`,borderRadius:10,padding:'6px',minWidth:220,boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:300}}>
                  {intel.map(it=>(
                    <button key={it.path} onClick={()=>{nav(it.path);setDrop(false)}}
                      style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:'8px 12px',borderRadius:7,transition:'background .1s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <div style={{fontSize:13,fontWeight:600,color:T1,marginBottom:2}}>{it.label}</div>
                      <div style={{fontSize:11,color:T3,lineHeight:1.4}}>{it.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop CTA */}
        {!sm && (
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <button onClick={()=>nav('/dashboard')}
              style={{background:'rgba(31,92,78,0.08)',border:'1px solid rgba(31,92,78,0.18)',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:600,color:'#1f5c4e',padding:'6px 13px',borderRadius:7,display:'flex',alignItems:'center',gap:5,transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(31,92,78,0.14)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(31,92,78,0.08)'}}>
              Ask AI
            </button>
            <button onClick={()=>nav('/auth')}
              style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:500,color:T2,padding:'6px 12px',borderRadius:7,transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.color=T1;e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
              onMouseLeave={e=>{e.currentTarget.style.color=T2;e.currentTarget.style.background='none'}}>
              Sign in
            </button>
            <button onClick={()=>nav('/auth')}
              style={{background:'#1f5c4e',border:'none',cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:600,color:'#ffffff',padding:'7px 16px',borderRadius:7,transition:'background .12s',letterSpacing:'-0.1px'}}
              onMouseEnter={e=>e.currentTarget.style.background='#2e7a68'}
              onMouseLeave={e=>e.currentTarget.style.background='#1f5c4e'}>
              Get started
            </button>
          </div>
        )}

        {/* Mobile burger */}
        {sm && (
          <button onClick={()=>setMob(o=>!o)}
            style={{background:mob?'rgba(0,0,0,0.05)':'transparent',border:`1px solid ${LN}`,borderRadius:7,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T2,padding:0,transition:'all .12s'}}>
            {mob?<X size={15}/>:<Menu size={15}/>}
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {sm && mob && (
        <div style={{borderTop:`1px solid ${LN}`,background:'#ffffff',padding:'10px 16px 18px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {links.map(([l,h])=>(
              <button key={l} onClick={()=>{go(h);setMob(false)}}
                style={{padding:'10px 12px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:500,color:T2,background:'none',border:'none',textAlign:'left',fontFamily:F,transition:'all .12s'}}
                onMouseEnter={e=>{e.currentTarget.style.color=T1;e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
                onMouseLeave={e=>{e.currentTarget.style.color=T2;e.currentTarget.style.background='none'}}>
                {l}
              </button>
            ))}
            {intel.map(it=>(
              <button key={it.path} onClick={()=>{nav(it.path);setMob(false)}}
                style={{padding:'10px 12px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:500,color:T2,background:'none',border:'none',textAlign:'left',fontFamily:F,transition:'all .12s'}}
                onMouseEnter={e=>{e.currentTarget.style.color=T1;e.currentTarget.style.background='rgba(0,0,0,0.04)'}}
                onMouseLeave={e=>{e.currentTarget.style.color=T2;e.currentTarget.style.background='none'}}>
                {it.label}
              </button>
            ))}
            <div style={{height:1,background:LN,margin:'8px 0'}}/>
            <button onClick={()=>{nav('/auth');setMob(false)}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.04)',color:T1,border:`1px solid ${LN}`,padding:'11px',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:F,marginBottom:6,transition:'all .12s'}}>
              Sign in
            </button>
            <button onClick={()=>{nav('/auth');setMob(false)}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',background:'#1f5c4e',color:'#ffffff',border:'none',padding:'11px',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F,transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#2e7a68'}
              onMouseLeave={e=>e.currentTarget.style.background='#1f5c4e'}>
              Get started
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
