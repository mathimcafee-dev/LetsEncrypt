import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'

const F = "'Space Grotesk','DM Sans',system-ui,sans-serif"
const C = { surface:'#FFFDF8', alt:'#EDE8DC', line:'#D8D0C0', ink:'#1C2B1F', body:'#4A5E4E', faint:'#8A9E8E', green:'#2D6A4F', sienna:'#C1440E' }

function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => { const h = () => setM(window.innerWidth <= bp); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [bp])
  return m
}

export default function Nav({ nav, page }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [intelOpen, setIntelOpen]   = useState(false)
  const isMobile = useIsMobile()
  const intelRef = useRef(null)

  useEffect(() => { setMobileOpen(false); setIntelOpen(false) }, [page])
  useEffect(() => {
    const h = (e) => { if (intelRef.current && !intelRef.current.contains(e.target)) setIntelOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const links = [['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']]
  const intel = [
    { label:'CA Trust Store', path:'/ca-trust-explorer', desc:'6,200+ root & intermediate CAs' },
    { label:'CAB Forum',       path:'/cab-forum',         desc:'Ballots, timelines & compliance' },
    { label:'PKI Hub',         path:'/pki-hub',           desc:'Standards bodies & PQC tracker' },
    { label:'Trust Passport',  path:'/trust-passport',    desc:'Is this site safe? Time-based trust' },
  ]

  const btn = (label, h, close=true) => (
    <button key={label}
      onClick={() => { h.startsWith('/') ? nav(h) : document.querySelector(h)?.scrollIntoView({behavior:'smooth'}); if(close) setMobileOpen(false) }}
      style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500,
        color:C.body, padding:'6px 13px', borderRadius:5, transition:'all .15s' }}
      onMouseEnter={e => { e.currentTarget.style.color=C.ink; e.currentTarget.style.background=C.alt }}
      onMouseLeave={e => { e.currentTarget.style.color=C.body; e.currentTarget.style.background='none' }}>
      {label}
    </button>
  )

  return (
    <nav style={{ position:'sticky', top:0, zIndex:200, background:C.surface, borderBottom:`1px solid ${C.line}`, fontFamily:F }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:58, padding:`0 clamp(16px,4vw,40px)` }}>

        {/* Logo */}
        <div onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0, userSelect:'none' }}>
          <div style={{ width:28, height:28, background:C.green, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.3px' }}>SSLVault</span>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap:1 }}>
            {links.map(([l, h]) => btn(l, h, false))}
            <div ref={intelRef} style={{ position:'relative' }}>
              <button onClick={() => setIntelOpen(o => !o)}
                style={{ background: intelOpen?C.alt:'none', border:'none', cursor:'pointer', fontFamily:F,
                  fontSize:13, fontWeight:500, color:intelOpen?C.ink:C.body, padding:'6px 13px',
                  borderRadius:5, transition:'all .15s', display:'flex', alignItems:'center', gap:4 }}
                onMouseEnter={e => { e.currentTarget.style.color=C.ink; if(!intelOpen) e.currentTarget.style.background=C.alt }}
                onMouseLeave={e => { e.currentTarget.style.color=intelOpen?C.ink:C.body; if(!intelOpen) e.currentTarget.style.background='none' }}>
                Industry Intelligence
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: intelOpen?'rotate(180deg)':'none', transition:'transform .2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {intelOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
                  background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, padding:'6px',
                  minWidth:220, boxShadow:'0 8px 32px rgba(28,43,31,0.12)', zIndex:300 }}>
                  {intel.map(item => (
                    <button key={item.path} onClick={() => { nav(item.path); setIntelOpen(false) }}
                      style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none',
                        cursor:'pointer', fontFamily:F, padding:'8px 12px', borderRadius:6, transition:'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background=C.alt}
                      onMouseLeave={e => e.currentTarget.style.background='none'}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:2 }}>{item.label}</div>
                      <div style={{ fontSize:11, color:C.faint }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop CTA */}
        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button onClick={() => nav('/auth')}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, color:C.body, padding:'7px 14px', borderRadius:5, transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color=C.ink}
              onMouseLeave={e => e.currentTarget.style.color=C.body}>
              Sign in
            </button>
            <button onClick={() => nav('/auth')}
              style={{ background:C.sienna, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:700, color:'white', padding:'8px 18px', borderRadius:5, transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#9E3709'}
              onMouseLeave={e => e.currentTarget.style.background=C.sienna}>
              Get started
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMobileOpen(o => !o)}
            style={{ background:C.alt, border:`1px solid ${C.line}`, borderRadius:6, width:36, height:36,
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:C.ink, padding:0 }}>
            {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div style={{ borderTop:`1px solid ${C.line}`, background:C.surface, boxShadow:'0 8px 24px rgba(28,43,31,0.08)' }}>
          <div style={{ padding:'12px 16px 18px', display:'flex', flexDirection:'column', gap:2 }}>
            {links.map(([l, h]) => (
              <button key={l} onClick={() => { h.startsWith('/') ? nav(h) : document.querySelector(h)?.scrollIntoView({behavior:'smooth'}); setMobileOpen(false) }}
                style={{ padding:'11px 14px', borderRadius:6, cursor:'pointer', fontSize:14, fontWeight:500,
                  color:C.ink, background:'none', border:'none', textAlign:'left', fontFamily:F }}>
                {l}
              </button>
            ))}
            <div style={{ height:1, background:C.line, margin:'8px 0 10px' }}/>
            <button onClick={() => { nav('/auth'); setMobileOpen(false) }}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', background:C.alt, color:C.ink,
                border:`1px solid ${C.line}`, padding:'11px 14px', borderRadius:6, fontSize:14, fontWeight:600,
                cursor:'pointer', fontFamily:F, marginBottom:8 }}>
              Sign in
            </button>
            <button onClick={() => { nav('/auth'); setMobileOpen(false) }}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', background:C.sienna, color:'white',
                border:'none', padding:'12px 14px', borderRadius:6, fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:F }}>
              Get started
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
