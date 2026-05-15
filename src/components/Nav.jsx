import { LogIn, ChevronDown, ArrowRight, BookOpen, Code, FileText, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

function useIsMobile(breakpoint = 760) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

export default function Nav({ nav, page }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useIsMobile()

  // Close the drawer when route changes
  useEffect(() => { setMobileOpen(false); setMoreOpen(false) }, [page])

  const goFeatures = () => {
    if (page !== '/') {
      nav('/')
      setTimeout(() => {
        document.getElementById('features')?.scrollIntoView({ behavior:'smooth', block:'start' })
      }, 60)
    } else {
      document.getElementById('features')?.scrollIntoView({ behavior:'smooth', block:'start' })
    }
    setMobileOpen(false)
  }

  const primary = [
    { label:'Features', onClick: goFeatures },
    { label:'Pricing',  onClick: () => { nav('/pricing'); setMobileOpen(false) },  path:'/pricing' },
    { label:'About',    onClick: () => { nav('/about'); setMobileOpen(false) },    path:'/about' },
  ]

  const resources = [
    { path:'/install',         label:'Install Guide',   icon:BookOpen },
    { path:'/knowledge-base',  label:'Knowledge Base',  icon:FileText },
    { path:'/developer',       label:'Developer',       icon:Code },
  ]

  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:'#ffffff',borderBottom:'0.5px solid rgba(15,23,42,0.08)',boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
      <div className='container' style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56,padding: isMobile ? '0 16px' : undefined}}>
        {/* Logo — identical on both */}
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
          <div style={{position:'relative',width:36,height:36,flexShrink:0}}>
            <div style={{width:36,height:36,background:'#0a0a0a',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",fontSize:22,fontWeight:800,color:'#0e7fc0',lineHeight:1,letterSpacing:'-1px',marginTop:1}}>S</span>
            </div>
            <div style={{position:'absolute',bottom:-3,right:-3,width:16,height:16,background:'#0e7fc0',borderRadius:4,border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="8" height="9" viewBox="0 0 8 9" fill="none">
                <rect x="1" y="4" width="6" height="5" rx="1" fill="white"/>
                <path d="M2 4V3a2 2 0 0 1 4 0v1" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#0a0a0a',letterSpacing:'-0.4px',lineHeight:1.15}}>SSL<span style={{color:'#0e7fc0'}}>Vault</span></div>
            <div style={{fontSize:9,color:'#a3a3a3',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.8px',lineHeight:1}}>CLM Platform</div>
          </div>
        </div>

        {/* Desktop center nav — hidden on mobile */}
        {!isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:1}}>
            {primary.map(({ label, onClick, path }) => {
              const active = path && page === path
              return (
                <div key={label} onClick={onClick}
                  style={{padding:'7px 13px',borderRadius:7,cursor:'pointer',
                    fontSize:13,fontWeight:600,color:active?'#0369a1':'#525252',
                    background:active?'#eff6ff':'transparent'}}
                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background='#f8fafc'}}
                  onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
                  {label}
                </div>
              )
            })}

            {/* Resources dropdown */}
            <div style={{position:'relative'}}>
              <div onClick={()=>setMoreOpen(o=>!o)}
                style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:7,cursor:'pointer',
                  fontSize:13,fontWeight:600,color:'#525252'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                Resources <ChevronDown size={12}/>
              </div>
              {moreOpen && (
                <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'white',
                  border:'1px solid #e2e8f0',borderRadius:9,padding:5,
                  boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:300,minWidth:200}}
                  onMouseLeave={()=>setMoreOpen(false)}>
                  {resources.map(({path,label,icon:Icon})=>(
                    <div key={path} onClick={()=>{nav(path);setMoreOpen(false)}}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <Icon size={13} color='#94a3b8'/>{label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop auth CTAs — hidden on mobile */}
        {!isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>nav('/auth')}
              style={{display:'inline-flex',alignItems:'center',gap:5,background:'#0e7fc0',color:'white',border:'none',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              <LogIn size={12}/> Sign In
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={()=>setMobileOpen(o=>!o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,
              width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',color:'#0a0a0a',padding:0,fontFamily:'inherit'}}>
            {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div style={{borderTop:'0.5px solid rgba(15,23,42,0.08)',background:'white',
          boxShadow:'0 8px 24px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'12px 16px 18px',display:'flex',flexDirection:'column',gap:2}}>
            {primary.map(({label,onClick,path}) => {
              const active = path && page === path
              return (
                <div key={label} onClick={onClick}
                  style={{padding:'12px 14px',borderRadius:8,cursor:'pointer',
                    fontSize:15,fontWeight:600,
                    color:active?'#0369a1':'#0a0a0a',
                    background:active?'#eff6ff':'transparent'}}>
                  {label}
                </div>
              )
            })}
            <div style={{height:1,background:'#f1f5f9',margin:'8px 0'}}/>
            <div style={{fontSize:10,fontWeight:700,color:'#a3a3a3',textTransform:'uppercase',
              letterSpacing:'0.8px',padding:'4px 14px 6px'}}>Resources</div>
            {resources.map(({path,label,icon:Icon})=>(
              <div key={path} onClick={()=>{nav(path);setMobileOpen(false)}}
                style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:8,
                  cursor:'pointer',fontSize:14,fontWeight:500,color:'#475569'}}>
                <Icon size={15} color='#94a3b8'/>{label}
              </div>
            ))}
            <div style={{height:1,background:'#f1f5f9',margin:'10px 0 12px'}}/>
            <button onClick={()=>{nav('/auth');setMobileOpen(false)}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                background:'white',color:'#525252',border:'1px solid #e2e8f0',
                padding:'11px 14px',borderRadius:8,fontSize:14,fontWeight:600,
                cursor:'pointer',fontFamily:'inherit',marginBottom:8}}>
              <LogIn size={14}/> Sign In
            </button>
            <button onClick={()=>{nav('/auth');setMobileOpen(false)}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                background:'#0e7fc0',color:'white',border:'none',
                padding:'12px 14px',borderRadius:8,fontSize:14,fontWeight:700,
                cursor:'pointer',fontFamily:'inherit'}}>
              Get Started <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
