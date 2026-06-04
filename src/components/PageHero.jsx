import React from 'react'

const BLUE = '#0077b6'
const DARK = '#005a8a'
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const FONT = "'Inter',system-ui,sans-serif"

/**
 * PageHero — shared hero component matching the CertVault dark-terminal aesthetic
 *
 * Props:
 *   eyebrow   string   — small ALL CAPS label above title
 *   title     string   — main h1 (can contain <span> for teal accent)
 *   titleAccent string — optional teal-coloured word appended to title
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
  const P = isMobile ? '16px' : '24px'

  return (
    <>
      {syncBar}
      {alertBar}
      <div style={{background:BLUE, padding:`36px ${P} 0`, color:'#fff', fontFamily:FONT}}>
        <div style={{
          display:'grid',
          gridTemplateColumns: right && !isMobile ? '1fr 1fr' : '1fr',
          gap:24, alignItems:'start', maxWidth:1200, margin:'0 auto',
        }}>
          {/* Left */}
          <div>
            {eyebrow && (
              <div style={{fontSize:10,letterSpacing:'.14em',color:'rgba(255,255,255,.4)',textTransform:'uppercase',marginBottom:8,fontFamily:MONO}}>
                {eyebrow}
              </div>
            )}
            <h1 style={{fontSize:isMobile?'22px':'28px',fontWeight:600,lineHeight:1.2,marginBottom:10,color:'#fff'}}>
              {title}{titleAccent && <><br/><span style={{color:'#3dbfb0'}}>{titleAccent}</span></>}
            </h1>
            {subtitle && <p style={{fontSize:13,color:'rgba(255,255,255,.55)',lineHeight:1.7,marginBottom:stats.length?20:0,maxWidth:500}}>{subtitle}</p>}
            {stats.length>0 && (
              <div style={{display:'flex',gap:isMobile?14:28,flexWrap:'wrap',marginBottom:actions?20:0}}>
                {stats.map(({n,l})=>(
                  <div key={l}>
                    <div style={{fontSize:isMobile?'18px':'22px',fontWeight:600,color:'#fff',lineHeight:1}}>{n}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.06em',marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
            )}
            {actions && <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{actions}</div>}
          </div>
          {/* Right */}
          {right && !isMobile && <div style={{paddingTop:8}}>{right}</div>}
        </div>
        {/* Bottom ticker strip */}
        {tags.length>0 && (
          <div style={{
            background:'rgba(0,0,0,.15)',
            margin:`24px -${P} 0`,
            padding:`10px ${P}`,
            display:'flex',alignItems:'center',gap:16,
            borderTop:'0.5px solid rgba(255,255,255,.1)',flexWrap:'wrap',
          }}>
            {tags.map(t=>(
              <span key={t} style={{fontSize:10,color:'rgba(255,255,255,.4)',letterSpacing:'.06em',fontFamily:MONO,whiteSpace:'nowrap'}}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
