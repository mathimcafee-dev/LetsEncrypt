import { LogIn, ChevronDown, ArrowRight, BookOpen, Code, FileText, Menu, X, Shield, Activity, Globe } from 'lucide-react'
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

  const primary = []

  const resources = [
    { path:'/install',         label:'Install Guide',   icon:BookOpen },
    { path:'/knowledge-base',  label:'Knowledge Base',  icon:FileText },
    { path:'/cert-intelligence', label:'CA Intelligence',   icon:Activity },
    { path:'/caa-check',       label:'CAA Checker',     icon:Shield },
  ]

  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:'#FFFFFF',borderBottom:'0.5px solid rgba(15,23,42,0.08)',boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
      <div className='container' style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56,padding: isMobile ? '0 16px' : undefined}}>
        {/* Logo — consistent with landing page */}
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',userSelect:'none'}}>
          <div style={{width:30,height:30,background:'#3DBFB0',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:15,fontWeight:600,color:'#0a0a0a',letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>

        {/* Desktop center nav — hidden on mobile */}
        {!isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:1}}>
            {primary.map(({ label, onClick, path }) => {
              const active = path && page === path
              return (
                <div key={label} onClick={onClick}
                  style={{padding:'7px 13px',borderRadius:7,cursor:'pointer',
                    fontSize:13,fontWeight:600,color:active?'#1A7A72':'#525252',
                    background:active?'#E8F8F6':'transparent'}}
                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background='#f8fafc'}}
                  onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
                  {label}
                </div>
              )
            })}

          </div>
        )}

        {/* Desktop auth CTAs — hidden on mobile */}
        {!isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>nav('/auth')}
              style={{display:'inline-flex',alignItems:'center',gap:5,background:'#1A7A72',color:'white',border:'none',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
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
                    color:active?'#1A7A72':'#0a0a0a',
                    background:active?'#E8F8F6':'transparent'}}>
                  {label}
                </div>
              )
            })}

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
                background:'#1A7A72',color:'white',border:'none',
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
