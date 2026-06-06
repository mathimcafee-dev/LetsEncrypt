import React from 'react'

const BLUE = '#0077b6'
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const FONT = "'Inter',system-ui,sans-serif"
const DM   = "'DM Sans','Inter',system-ui,sans-serif"

/**
 * PageHero — shared hero matching the landing-page benchmark design
 * (blue gradient, DM Sans 900 headline, #a8e0ff accent, kicker pill eyebrow)
 *
 * Props (unchanged API):
 *   eyebrow   string   — small label above title (rendered as kicker pill)
 *   title     string   — main h1
 *   titleAccent string — optional accent-coloured second line
 *   subtitle  string   — body text below title
 *   stats     [{n, l}] — stat numbers (up to 5)
 *   tags      [string] — bottom ticker strip tags
 *   right     ReactNode — optional right-column content
 *   syncBar   ReactNode — optional top bar (sync status, buttons)
 *   alertBar  ReactNode — optional alert bar
 *   actions   ReactNode — optional CTA buttons below subtitle
 */
export default function PageHero({
  eyebrow, title, titleAccent, subtitle,
  stats=[], tags=[], right=null,
  syncBar=null, alertBar=null, actions=null,
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const P = isMobile ? '20px' : '36px'

  return (
    <>
      {syncBar}
      {alertBar}
      <div style={{background:`linear-gradient(160deg, ${BLUE} 0%, #006aa3 60%, #005d90 100%)`, padding:`${isMobile?36:48}px ${P} 0`, color:'#fff', fontFamily:FONT, position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', right:-180, top:-180, width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.10), transparent 65%)', pointerEvents:'none'}}/>
        <div style={{
          display:'grid',
          gridTemplateColumns: right && !isMobile ? '1fr 1fr' : '1fr',
          gap:24, alignItems:'start', maxWidth:1140, margin:'0 auto',
          position:'relative',
        }}>
          {/* Left */}
          <div>
            {eyebrow && (
              <div style={{display:'inline-block', fontSize:10, fontWeight:800, letterSpacing:'.12em', color:'rgba(255,255,255,0.85)', textTransform:'uppercase', marginBottom:14, fontFamily:MONO, background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:20, padding:'5px 14px'}}>
                {eyebrow}
              </div>
            )}
            <h1 style={{fontSize:isMobile?'27px':'38px', fontWeight:900, lineHeight:1.12, marginBottom:12, color:'#fff', fontFamily:DM, letterSpacing:'-0.01em', marginTop:0}}>
              {title}{titleAccent && <><br/><span style={{color:'#a8e0ff'}}>{titleAccent}</span></>}
            </h1>
            {subtitle && <p style={{fontSize:isMobile?13:14.5, color:'rgba(255,255,255,0.85)', lineHeight:1.7, marginBottom:stats.length?22:0, maxWidth:540, marginTop:0}}>{subtitle}</p>}
            {stats.length>0 && (
              <div style={{display:'flex', gap:isMobile?16:30, flexWrap:'wrap', marginBottom:actions?22:0}}>
                {stats.map(({n,l})=>(
                  <div key={l}>
                    <div style={{fontSize:isMobile?'19px':'24px', fontWeight:900, color:'#fff', lineHeight:1, fontFamily:DM}}>{n}</div>
                    <div style={{fontSize:10, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:5, fontFamily:MONO}}>{l}</div>
                  </div>
                ))}
              </div>
            )}
            {actions && <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>{actions}</div>}
          </div>
          {/* Right */}
          {right && !isMobile && <div style={{paddingTop:8}}>{right}</div>}
        </div>
        {/* Bottom ticker strip */}
        {tags.length>0 && (
          <div style={{
            margin:`${isMobile?22:30}px -${P} 0`,
            padding:`12px ${P}`,
            display:'flex', alignItems:'center', justifyContent:'center', gap:isMobile?14:24,
            borderTop:'1px solid rgba(255,255,255,0.14)', flexWrap:'wrap',
            position:'relative',
          }}>
            {tags.map(t=>(
              <span key={t} style={{fontSize:10.5, color:'rgba(255,255,255,0.75)', letterSpacing:'.04em', fontFamily:MONO, whiteSpace:'nowrap'}}>✓ {t}</span>
            ))}
          </div>
        )}
        {tags.length===0 && <div style={{height:isMobile?28:36}}/>}
      </div>
    </>
  )
}
