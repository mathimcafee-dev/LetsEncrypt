import { LogIn, ChevronDown, ArrowRight, BookOpen, Code, FileText, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

function useIsMobile(breakpoint = 760) {
  const get = () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  const [isMobile, setIsMobile] = useState(get)
  useEffect(() => {
    const onResize = () => setIsMobile(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function Nav({ nav, page }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const m = useIsMobile()

  // Close drawer when route changes
  useEffect(() => { setDrawerOpen(false); setMoreOpen(false) }, [page])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [drawerOpen])

  const goFeatures = () => {
    if (page !== '/') {
      nav('/')
      setTimeout(() => {
        document.getElementById('features')?.scrollIntoView({ behavior:'smooth', block:'start' })
      }, 60)
    } else {
      document.getElementById('features')?.scrollIntoView({ behavior:'smooth', block:'start' })
    }
    setDrawerOpen(false)
  }

  const primary = [
    { label:'Features', onClick: goFeatures },
    { label:'Pricing',  onClick: () => nav('/pricing'),  path:'/pricing' },
    { label:'About',    onClick: () => nav('/about'),    path:'/about' },
  ]

  const resources = [
    { path:'/install',         label:'Install Guide',   icon:BookOpen },
    { path:'/knowledge-base',  label:'Knowledge Base',  icon:FileText },
    { path:'/developer',       label:'Developer',       icon:Code },
  ]

  const Logo = (
    <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
      <div style={{position:'relative',width:m?32:36,height:m?32:36,flexShrink:0}}>
        <div style={{width:m?32:36,height:m?32:36,background:'#0a0a0a',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",fontSize:m?20:22,fontWeight:800,color:'#0e7fc0',lineHeight:1,letterSpacing:'-1px',marginTop:1}}>S</span>
        </div>
        <div style={{position:'absolute',bottom:-3,right:-3,width:14,height:14,background:'#0e7fc0',borderRadius:4,border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="7" height="8" viewBox="0 0 8 9" fill="none">
            <rect x="1" y="4" width="6" height="5" rx="1" fill="white"/>
            <path d="M2 4V3a2 2 0 0 1 4 0v1" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div>
        <div style={{fontWeight:700,fontSize:m?14:15,color:'#0a0a0a',letterSpacing:'-0.4px',lineHeight:1.15}}>SSL<span style={{color:'#0e7fc0'}}>Vault</span></div>
        <div style={{fontSize:9,color:'#a3a3a3',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.8px',lineHeight:1}}>CLM Platform</div>
      </div>
    </div>
  )

  return (
    <>
      <nav style={{position:'sticky',top:0,zIndex:200,background:'#ffffff',borderBottom:'0.5px solid rgba(15,23,42,0.08)',boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
        <div className='container' style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56,padding: m ? '0 16px' : undefined}}>
          {Logo}

          {/* Desktop: center nav + auth CTAs */}
          {!m && (
            <>
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

              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>nav('/auth')}
                  style={{display:'inline-flex',alignItems:'center',gap:5,background:'white',color:'#525252',border:'1px solid #e2e8f0',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  <LogIn size={12}/> Sign In
                </button>
                <button onClick={()=>nav('/auth')}
                  style={{display:'inline-flex',alignItems:'center',gap:5,background:'#0e7fc0',color:'white',border:'none',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Get Started <ArrowRight size={12}/>
                </button>
              </div>
            </>
          )}

          {/* Mobile: hamburger only */}
          {m && (
            <button
              onClick={() => setDrawerOpen(o => !o)}
              aria-label='Toggle menu'
              style={{
                width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center',
                background:'transparent', border:'none', cursor:'pointer', padding:0, color:'#0a0a0a',
              }}>
              {drawerOpen ? <X size={22}/> : <Menu size={22}/>}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {m && drawerOpen && (
        <div style={{
          position:'fixed', inset:0, top:56, zIndex:199, background:'white',
          overflowY:'auto', WebkitOverflowScrolling:'touch',
          animation:'svFadeIn 0.15s ease-out',
        }}>
          <style>{`@keyframes svFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ padding:'18px 18px 24px', display:'flex', flexDirection:'column', gap:4 }}>
            {primary.map(({ label, onClick, path }) => {
              const active = path && page === path
              return (
                <button key={label} onClick={onClick}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'14px 14px', borderRadius:10, border:'none',
                    fontSize:16, fontWeight:600,
                    color: active ? '#0369a1' : '#0a0a0a',
                    background: active ? '#eff6ff' : 'transparent',
                    textAlign:'left', cursor:'pointer', fontFamily:'inherit', width:'100%',
                  }}>
                  <span>{label}</span>
                  <ArrowRight size={15} color='#a3a3a3'/>
                </button>
              )
            })}

            <div style={{ fontSize:11, fontWeight:700, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'0.8px', padding:'18px 14px 8px' }}>Resources</div>
            {resources.map(({ path, label, icon:Icon }) => (
              <button key={path} onClick={() => nav(path)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'13px 14px', borderRadius:10, border:'none',
                  fontSize:15, fontWeight:600, color:'#475569',
                  background:'transparent', textAlign:'left', cursor:'pointer', fontFamily:'inherit', width:'100%',
                }}>
                <Icon size={17} color='#94a3b8'/>
                {label}
              </button>
            ))}

            <div style={{ height:1, background:'#f0f0f0', margin:'18px 0 6px' }}/>

            <button onClick={() => nav('/auth')}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                background:'white', color:'#0a0a0a', border:'1px solid #e2e8f0',
                padding:'14px 18px', borderRadius:10,
                fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                minHeight:48, marginTop:6,
              }}>
              <LogIn size={15}/> Sign In
            </button>
            <button onClick={() => nav('/auth')}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                background:'#0a0a0a', color:'white', border:'none',
                padding:'14px 18px', borderRadius:10,
                fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                minHeight:48,
              }}>
              Get Started <ArrowRight size={15}/>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
