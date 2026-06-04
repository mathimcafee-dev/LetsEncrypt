import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Resend.com design tokens — pure black/white ────────────────────────
const F    = "'Inter',system-ui,sans-serif"
const MONO = "'SF Mono','Menlo','Consolas',monospace"
const BG   = '#f0f4fa'   // page background
const BG2  = '#f0f4fa'   // alt section background
const BG3  = '#ffffff'   // card surface
const BG4  = '#e8f0f8'   // deep card / input
const T1   = '#ffffff'                  // white on blue
const T2   = 'rgba(255,255,255,0.72)'   // soft white
const T3   = 'rgba(255,255,255,0.48)'   // muted white
const LN   = 'rgba(255,255,255,0.14)'   // border on blue
const LN2  = 'rgba(255,255,255,0.25)'   // strong border
const LN3  = 'rgba(255,255,255,0.35)'   // hover border
const GRN  = '#00a550'                  // success green
const AMB  = '#fbbf24'                  // amber — bright on blue
const RED  = '#ff8080'                  // soft red on blue

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
  return <div style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.48)',letterSpacing:'0.08em',textTransform:'uppercase',fontFamily:MONO,marginBottom:14}}>{children}</div>
}
function H2({children,style={}}) {
  return <h2 style={{fontSize:'clamp(22px,3vw,36px)',fontWeight:700,color:'#ffffff',letterSpacing:'-0.6px',lineHeight:1.15,...style}}>{children}</h2>
}
function Body({children,style={}}) {
  return <p style={{fontSize:14,color:'rgba(255,255,255,0.72)',lineHeight:1.75,...style}}>{children}</p>
}
function Tag({children}) {
  return <span style={{display:'inline-flex',alignItems:'center',fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.48)',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:3,padding:'2px 7px',fontFamily:MONO,letterSpacing:'0.04em'}}>{children}</span>
}
function Pill({status}) {
  const m={active:[GRN,'rgba(0,165,80,0.09)'],warning:[AMB,'rgba(184,120,0,0.07)'],critical:[RED,'rgba(192,57,43,0.07)']}
  const[c,bg]=m[status]||[T3,'rgba(0,0,0,0.05)']
  return <span style={{fontSize:10,fontWeight:500,color:c,background:bg,padding:'2px 7px',borderRadius:3,fontFamily:MONO}}>{status}</span>
}
function BtnPrimary({label,onClick}) {
  const[h,setH]=useState(false)
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'inline-flex',alignItems:'center',gap:7,fontFamily:F,fontWeight:600,fontSize:13,padding:'9px 20px',borderRadius:6,border:'none',cursor:'pointer',background:h?'#0091d6':'#0077b6',color:'#ffffff',transition:'background .14s'}}>
    {label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
  </button>
}
function BtnGhost({label,onClick}) {
  const[h,setH]=useState(false)
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'inline-flex',alignItems:'center',gap:7,fontFamily:F,fontWeight:400,fontSize:13,padding:'9px 20px',borderRadius:6,cursor:'pointer',background:h?'rgba(0,0,0,0.05)':'transparent',border:`1px solid ${h?LN3:LN2}`,color:h?T1:T2,transition:'all .14s'}}>
    {label}
  </button>
}
function Card({children,style={}}) {
  return <div style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,padding:'20px',...style}}>{children}</div>
}
function Term({title,lines}) {
  return (
    <div style={{background:'#111111',border:'none',borderRadius:12,overflow:'hidden',fontFamily:MONO,boxShadow:'0 4px 24px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.08)'}}>
      <div style={{background:'#f0f4fa',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c,opacity:.85}}/>)}</div>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.45)',flex:1,textAlign:'center'}}>{title}</span>
      </div>
      <div style={{padding:'16px 18px',fontSize:11.5,lineHeight:2}}>
        {lines.map((l,i)=><div key={i} style={{color:l.c||T2,paddingLeft:l.indent?18:0}}>
          {l.prompt&&<span style={{color:'rgba(255,255,255,0.35)',marginRight:8}}>{l.prompt}</span>}{l.text}
        </div>)}
        <div style={{marginTop:8,display:'flex',alignItems:'center',gap:5}}>
          <span style={{color:'rgba(255,255,255,0.48)'}}>›</span>
          <span style={{display:'inline-block',width:6,height:13,background:'#00a550',animation:'blink 1.2s step-end infinite',borderRadius:1}}/>
        </div>
      </div>
    </div>
  )
}

function InventoryMockup() {
  const [pulse,setPulse]=React.useState(true)
  useEffect(()=>{const iv=setInterval(()=>setPulse(p=>!p),1200);return()=>clearInterval(iv)},[])
  const rows=[
    {d:'easysecurity.in',  days:196,grade:'A+',ca:'RapidSSL',auto:true, s:'active'  },
    {d:'api.shop.com',     days:18, grade:'B', ca:'Sectigo', auto:true, s:'warning' },
    {d:'staging.portal.io',days:3,  grade:'C', ca:'RapidSSL',auto:false,s:'critical'},
    {d:'mail.company.com', days:84, grade:'A', ca:'RapidSSL',auto:true, s:'active'  },
  ]
  const sc=s=>s==='active'?GRN:s==='warning'?AMB:RED
  const gc=g=>g.startsWith('A')?GRN:g==='B'?AMB:RED
  const sp=s=>s==='active'?{bg:'rgba(0,165,80,0.15)',c:GRN}:s==='warning'?{bg:'rgba(243,156,18,0.15)',c:AMB}:{bg:'rgba(231,76,60,0.15)',c:RED}
  return (
    <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
      {/* Titlebar */}
      <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>Certificate inventory · 4 domains</span>
        <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'#3dbfb0',fontFamily:MONO}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0',opacity:pulse?1:0.25,transition:'opacity 0.4s'}}/>
          Live
        </div>
      </div>
      {/* Sub-label */}
      <div style={{padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(255,255,255,0.02)'}}>
        <span style={{fontSize:9,color:'rgba(255,255,255,0.22)',fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.08em'}}>
          Expiry · Health grade · Auto-renew status
        </span>
      </div>
      {/* Column headers */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 52px 54px 80px 58px 74px',padding:'7px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        {['Domain','Days','Grade','CA','Auto','Status'].map(h=>(
          <div key={h} style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'0.07em',fontFamily:MONO}}>{h}</div>
        ))}
      </div>
      {/* Data rows */}
      {rows.map((r,i)=>{
        const pill=sp(r.s)
        return (
          <div key={r.d} style={{
            display:'grid',gridTemplateColumns:'2fr 52px 54px 80px 58px 74px',
            padding:'10px 14px',
            borderBottom:i<rows.length-1?'1px solid rgba(255,255,255,0.04)':'none',
            background:r.s==='critical'?'rgba(231,76,60,0.04)':r.s==='warning'?'rgba(243,156,18,0.03)':'transparent',
            alignItems:'center',
          }}>
            <span style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.85)',fontFamily:MONO}}>{r.d}</span>
            <span style={{fontSize:12,fontWeight:700,color:sc(r.s),fontFamily:MONO}}>{r.days}d</span>
            <span style={{fontSize:12,fontWeight:700,color:gc(r.grade),fontFamily:MONO}}>{r.grade}</span>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontFamily:MONO}}>{r.ca}</span>
            <span style={{fontSize:10,fontWeight:600,color:r.auto?GRN:'rgba(255,255,255,0.22)',fontFamily:MONO}}>{r.auto?'✓ ON':'— OFF'}</span>
            <span style={{fontSize:10,fontWeight:600,padding:'3px 9px',borderRadius:20,background:pill.bg,color:pill.c,fontFamily:MONO,display:'inline-block'}}>{r.s}</span>
          </div>
        )
      })}
    </div>
  )
}

function CertVaultMockup() {
  const [shown, setShown] = React.useState({})
  const [animating, setAnimating] = React.useState({})
  const [litBlocks, setLitBlocks] = React.useState({})
  const [pulse, setPulse] = React.useState(true)

  useEffect(()=>{
    const iv = setInterval(()=>setPulse(p=>!p), 1200)
    return ()=>clearInterval(iv)
  },[])

  const toggleKey = (id) => {
    if(shown[id]){ setShown(s=>({...s,[id]:false})); setLitBlocks(l=>({...l,[id]:0})); return }
    setAnimating(a=>({...a,[id]:true}))
    let i=0
    const iv = setInterval(()=>{
      i++; setLitBlocks(l=>({...l,[id]:i}))
      if(i>=12){ clearInterval(iv); setShown(s=>({...s,[id]:true})); setAnimating(a=>({...a,[id]:false})) }
    }, 45)
  }

  const keys=[{d:'easysecurity.in',alg:'RSA-2048',rot:'2',last:'2h ago',id:'k1'},{d:'api.shop.com',alg:'EC-384',rot:'2',last:'Never',id:'k2'}]

  return (
    <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
      {/* titlebar */}
      <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>CertVault · Private key vault</span>
        <span style={{fontSize:9,color:'rgba(255,255,255,0.2)',fontFamily:MONO}}>v2.1</span>
      </div>
      {/* enc header */}
      <div style={{padding:'9px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:7,fontSize:10,color:'#3dbfb0',fontFamily:MONO}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#3dbfb0',opacity:pulse?1:0.3,transition:'opacity 0.4s'}}/>
          AES-256-GCM · Envelope encryption · Immutable audit
        </div>
        <span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:MONO}}>2 keys protected</span>
      </div>
      {/* key rows */}
      <div style={{padding:'12px',display:'flex',flexDirection:'column',gap:8}}>
        {keys.map(k=>{
          const isShown = shown[k.id]
          const isAnim = animating[k.id]
          const lit = litBlocks[k.id]||0
          return (
            <div key={k.id} style={{background:isShown?'rgba(61,191,176,0.06)':'rgba(255,255,255,0.04)',border:`1px solid ${isShown?'rgba(61,191,176,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:8,padding:'12px',transition:'all 0.2s'}}>
              {/* domain + badge */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontSize:12,fontWeight:500,color:'#ffffff',fontFamily:MONO}}>{k.d}</span>
                <span style={{fontSize:9,color:'#3dbfb0',background:'rgba(61,191,176,0.15)',border:'1px solid rgba(61,191,176,0.25)',padding:'2px 8px',borderRadius:20,fontFamily:MONO,display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0'}}/> VAULT SECURED
                </span>
              </div>
              {/* stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                {[['Algorithm',k.alg],['Rotations',k.rot],['Last access',k.last]].map(([l,v])=>(
                  <div key={l} style={{background:'rgba(255,255,255,0.04)',borderRadius:5,padding:'6px 8px'}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:11,fontWeight:500,color:'#ffffff',fontFamily:MONO}}>{v}</div>
                  </div>
                ))}
              </div>
              {/* key preview */}
              <div style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${isShown?'rgba(61,191,176,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:5,padding:'7px 10px',marginBottom:8,fontFamily:MONO,fontSize:10,color:isShown?'#3dbfb0':'rgba(255,255,255,0.2)',letterSpacing:isShown?0:'0.12em',lineHeight:1.5,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.3s'}}>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {isShown?'-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQ...+xK3mP9aQ2rZ':'•••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <span style={{fontSize:9,marginLeft:8,flexShrink:0}}>{isShown?'REVEALED':'MASKED'}</span>
              </div>
              {/* encryption blocks animation */}
              <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:8}}>
                {Array(12).fill(0).map((_,i)=>(
                  <div key={i} style={{width:8,height:8,borderRadius:2,background:i<lit?'#3dbfb0':'rgba(255,255,255,0.12)',transition:'background 0.1s'}}/>
                ))}
                <span style={{marginLeft:6,fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:MONO}}>
                  {isAnim?'decrypting…':isShown?'decrypted · in memory only':'encrypted at rest'}
                </span>
              </div>
              {/* action buttons */}
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>toggleKey(k.id)} style={{fontSize:10,padding:'5px 10px',borderRadius:5,border:'1px solid rgba(61,191,176,0.4)',background:'rgba(61,191,176,0.15)',color:'#3dbfb0',cursor:'pointer',fontFamily:F,fontWeight:600}}>
                  {isShown?'Hide key':'Reveal key'}
                </button>
                <button style={{fontSize:10,padding:'5px 10px',borderRadius:5,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.75)',cursor:'pointer',fontFamily:F}}>Rotate</button>
                <button style={{fontSize:10,padding:'5px 10px',borderRadius:5,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.75)',cursor:'pointer',fontFamily:F}}>Audit log</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReadinessMockup() {
  const [pulse,setPulse]=React.useState(true)
  useEffect(()=>{const iv=setInterval(()=>setPulse(p=>!p),1200);return()=>clearInterval(iv)},[])
  const certs=[{d:'easysecurity.in',s:92,label:'Ready',c:GRN},{d:'api.shop.com',s:58,label:'At Risk',c:AMB},{d:'staging.portal.io',s:24,label:'Will Break',c:RED}]
  const milestones=[{d:'Mar 2026',v:'200d',c:RED,status:'IN EFFECT'},{d:'Mar 2027',v:'100d',c:AMB,status:'UPCOMING'},{d:'Mar 2029',v:'47d',c:GRN,status:'PLANNED'}]
  return (
    <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
      {/* Titlebar */}
      <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>47-Day Readiness · CA/B Forum SC-081v3</span>
        <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:'#3dbfb0',fontFamily:MONO}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0',opacity:pulse?1:0.25,transition:'opacity 0.4s'}}/>
          Live
        </div>
      </div>
      <div style={{padding:'12px'}}>
        {/* Milestone cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
          {milestones.map(m=>(
            <div key={m.d} style={{padding:'9px 10px',borderRadius:7,background:'rgba(255,255,255,0.04)',border:`1px solid rgba(255,255,255,0.07)`}}>
              <div style={{fontSize:9,fontWeight:700,color:m.c,fontFamily:MONO,letterSpacing:'0.06em',marginBottom:3}}>{m.d}</div>
              <div style={{fontSize:20,fontWeight:700,color:m.c,fontFamily:MONO,lineHeight:1,marginBottom:3}}>{m.v}</div>
              <div style={{fontSize:8,color:'rgba(255,255,255,0.3)',fontFamily:MONO,letterSpacing:'0.05em'}}>{m.status}</div>
            </div>
          ))}
        </div>
        {/* Cert score rows */}
        {certs.map((c,i)=>(
          <div key={c.d} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:7,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:i<certs.length-1?6:0}}>
            {/* Score ring */}
            <div style={{position:'relative',width:34,height:34,flexShrink:0}}>
              <svg width="34" height="34" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke={c.c} strokeWidth="3"
                  strokeDasharray={`${2*Math.PI*14}`}
                  strokeDashoffset={`${2*Math.PI*14*(1-c.s/100)}`}
                  strokeLinecap="round" transform="rotate(-90 18 18)"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:c.c,fontFamily:MONO}}>{c.s}</div>
            </div>
            {/* Domain + sub */}
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.85)',fontFamily:MONO,marginBottom:2}}>{c.d}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:MONO}}>Automation checklist</div>
            </div>
            {/* Status pill */}
            <span style={{fontSize:10,fontWeight:600,color:c.c,background:`${c.c}20`,border:`1px solid ${c.c}40`,padding:'3px 9px',borderRadius:20,fontFamily:MONO,whiteSpace:'nowrap'}}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TICKER=['RFC 8555 · ACME v2','RapidSSL Partner','AES-256-GCM','TLS 1.3','DNS-01 Challenge','CT Log Monitor','CAA Records','HSTS Verified','SHA-256','CA/B Forum 2026','Zero-touch Renewal','CertVault','47-Day Ready','ML-KEM · PQC Ready','6,200+ Root CAs','CCADB Indexed','PKI Hub Live','eIDAS 2.0 Tracked','NIST FIPS 203/204/205','cPanel Auto-Install','VPS Agent · 60s Poll','Install Cron · 2 min','GoGetSSL CA Partner','200-Day · IN EFFECT']


function SSLVaultTrustBadge({ compact = false }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:12,
      padding: compact ? '7px 14px' : '12px 18px',
      background:'#ffffff', border:'1px solid rgba(0,119,182,0.2)',
      borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
      minWidth: compact ? 0 : 260,
    }}>
      <div style={{width:compact?28:36,height:compact?28:36,background:'#0077b6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg width={compact?12:16} height={compact?12:16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:compact?7:8,fontWeight:700,color:'#0077b6',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:2}}>{compact?'Secured':'Cryptographically Secured'}</div>
        <div style={{fontSize:compact?12:14,fontWeight:800,color:'#0a1628',lineHeight:1,letterSpacing:'-.3px'}}>SSLVault <span style={{fontWeight:400,color:'rgba(0,0,0,0.4)',fontSize:compact?9:10}}>easysecurity.in</span></div>
        {!compact&&<div style={{fontSize:9,color:'rgba(0,0,0,0.4)',marginTop:3,letterSpacing:'.02em'}}>Certified PKI · RapidSSL · AES-256-GCM</div>}
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
        <div style={{fontSize:compact?13:16,fontWeight:900,color:'#0077b6',lineHeight:1,fontFamily:MONO}}>256</div>
        <div style={{fontSize:7,color:'rgba(0,0,0,0.4)',letterSpacing:'.08em',textTransform:'uppercase'}}>bit TLS</div>
        <div style={{display:'flex',alignItems:'center',gap:3,marginTop:2}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#00a550'}}/>
          <span style={{fontSize:7,color:'#00a550',fontWeight:700,letterSpacing:'.06em'}}>LIVE</span>
        </div>
      </div>
    </div>
  )
}

const DNS_PROVIDERS = [
  {name:'Cloudflare',sub:'API Token · Zone:DNS:Edit',api:'PUT /zones/{id}/dns_records',zone:'myshop.com',ttl:'60s',time:'4.2s'},
  {name:'Vercel',sub:'Access Token · Settings → Tokens',api:'POST /v2/domains/{domain}/records',zone:'vercel-dns',ttl:'60s',time:'3.8s'},
  {name:'Route53',sub:'AWS IAM · Route53 write access',api:'ChangeResourceRecordSets',zone:'Z2FDTNDATAQYW2',ttl:'60s',time:'6.1s'},
  {name:'Namecheap',sub:'API Key · IP whitelist required',api:'namecheap.domains.dns.setHosts',zone:'namecheap-api',ttl:'60s',time:'5.4s'},
  {name:'GoDaddy',sub:'API Key + Secret',api:'PATCH /v1/domains/{domain}/records',zone:'godaddy-api',ttl:'600s',time:'7.2s'},
  {name:'DigitalOcean',sub:'Personal Access Token',api:'POST /v2/domains/{domain}/records',zone:'do-api',ttl:'60s',time:'3.1s'},
  {name:'Plesk',sub:'XML API',api:'POST /api/v2/cli/dns/call',zone:'plesk-api',ttl:'60s',time:'5.8s'},
]

const DNSContext = React.createContext({selected:null,setSelected:()=>{}})

function DNSProviderSelector() {
  const {selected,setSelected} = React.useContext(DNSContext)
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(220px,100%),1fr))',gap:6}}>
      {DNS_PROVIDERS.map(p=>{
        const isSel = selected?.name===p.name
        return (
          <div key={p.name} onClick={()=>setSelected(p)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:isSel?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)',border:`1px solid ${isSel?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:8,cursor:'pointer',transition:'all 0.15s'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:isSel?'#3dbfb0':'rgba(255,255,255,0.3)',flexShrink:0,transition:'background 0.15s'}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'#ffffff'}}>{p.name}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',fontFamily:MONO,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.sub}</div>
            </div>
            {isSel&&<div style={{width:6,height:6,borderRadius:'50%',background:'#3dbfb0',flexShrink:0}}/>}
          </div>
        )
      })}
    </div>
  )
}

function DNSTerminal() {
  const {selected} = React.useContext(DNSContext)
  const [lines, setLines] = React.useState([])
  const [progress, setProgress] = React.useState(0)
  const [statusLabel, setStatusLabel] = React.useState('idle')
  const [done, setDone] = React.useState(false)
  const timerRef = React.useRef([])

  useEffect(()=>{
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []
    if(!selected){ setLines([]); setProgress(0); setStatusLabel('idle'); setDone(false); return }
    setLines([]); setProgress(0); setDone(false); setStatusLabel('running…')
    const p = selected
    const LOG = [
      {prompt:'#', text:` DCV for renewal · ${p.zone}`, c:'rgba(255,255,255,0.25)', delay:0},
      {prompt:'›', text:`Resolving zone: ${p.zone}`, c:'rgba(255,255,255,0.6)', delay:320},
      {prompt:'›', text:p.api, c:'rgba(255,255,255,0.8)', delay:720},
      {prompt:'', text:`↳ type:TXT  name:_acme-challenge`, c:'#3dbfb0', indent:true, delay:1020},
      {prompt:'', text:`↳ content:xK3-mP9_aQ2rZ...  ttl:${p.ttl}`, c:'#3dbfb0', indent:true, delay:1220},
      {prompt:'›', text:`Record created · TTL ${p.ttl}`, c:GRN, delay:1700},
      {prompt:'›', text:`Propagated in ${p.time} ✓`, c:GRN, delay:2300},
      {prompt:'›', text:`ACME challenge: verified ✓`, c:GRN, delay:2900},
      {prompt:'›', text:`Challenge record removed ✓`, c:'rgba(255,255,255,0.5)', delay:3500},
    ]
    const steps = ['authenticating…','resolving zone…','calling API…','creating record…','polling…','validating…','cleaning up…','verified ✓']
    LOG.forEach((l,i)=>{
      const t = setTimeout(()=>{
        setLines(prev=>[...prev,l])
        setProgress(Math.round((i+1)/LOG.length*100))
        setStatusLabel(steps[Math.min(i,steps.length-1)])
        if(i===LOG.length-1) setDone(true)
      }, l.delay)
      timerRef.current.push(t)
    })
    return ()=>timerRef.current.forEach(clearTimeout)
  },[selected])

  return (
    <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
      <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1}}>{selected?`dns-provider · ${selected.name.toLowerCase()} API`:'dns-provider · select a provider'}</span>
        <span style={{fontSize:9,fontFamily:MONO,padding:'2px 8px',borderRadius:20,background:done?'rgba(0,165,80,0.2)':selected?'rgba(61,191,176,0.12)':'rgba(255,255,255,0.06)',color:done?GRN:selected?'#3dbfb0':'rgba(255,255,255,0.3)',transition:'all 0.3s'}}>{done?'done ✓':statusLabel}</span>
      </div>
      <div style={{padding:'14px',minHeight:200,display:'flex',flexDirection:'column',justifyContent:lines.length?'flex-start':'center',alignItems:lines.length?'stretch':'center'}}>
        {lines.length===0?(
          <div style={{textAlign:'center',opacity:0.4}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:MONO}}>← select a DNS provider</div>
          </div>
        ):lines.map((l,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'2px 0',fontSize:11,fontFamily:MONO,lineHeight:1.6}}>
            <span style={{color:'rgba(255,255,255,0.25)',flexShrink:0,width:10}}>{l.prompt}</span>
            <span style={{color:l.c,paddingLeft:l.indent?16:0}}>{l.text}</span>
          </div>
        ))}
      </div>
      <div style={{background:'#1a2533',padding:'8px 14px',display:'flex',alignItems:'center',gap:10,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{flex:1,height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',background:done?GRN:'#3dbfb0',borderRadius:2,width:progress+'%',transition:'width 0.4s'}}/>
        </div>
        <span style={{fontSize:9,color:done?GRN:'#3dbfb0',fontFamily:MONO,minWidth:90,textAlign:'right',transition:'color 0.3s'}}>{statusLabel}</span>
      </div>
    </div>
  )
}

export default function Home({ nav }) {
  const {isMobile,isTablet}=useIsMobile()
  const [certCount,setCertCount]=useState(null)
  const [count,setCount]=useState(0)
  const [dnsProvider,setDnsProvider]=useState(null)

  useEffect(()=>{supabase.from('certificates').select('id',{count:'exact',head:true}).then(({count})=>count&&setCertCount(count))},[])
  useEffect(()=>{if(!certCount)return;let i=0;const iv=setInterval(()=>{i+=Math.ceil(certCount/60);if(i>=certCount){setCount(certCount);clearInterval(iv)}else setCount(i)},16);return()=>clearInterval(iv)},[certCount])

  const cols=isMobile?1:isTablet?2:3
  const P = 'clamp(20px,5vw,48px)'

  return (
    <div style={{fontFamily:F,position:'relative',background:'#0077b6',color:'#ffffff',overflowX:'hidden'}}>

      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}::selection{background:rgba(0,119,182,0.15);color:#111}@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* ── NAV ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'#005a8a',borderBottom:'1px solid rgba(0,0,0,0.15)',boxShadow:'0 1px 0 rgba(0,0,0,0.1)',height:54,display:'flex',alignItems:'center',padding:`0 ${P}`,justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0}} onClick={()=>nav('/')}>
          <div style={{width:22,height:22,background:'#0077b6',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:'#ffffff',letterSpacing:'-0.3px'}}>SSLVault</span>
        </div>
        {!isMobile&&<nav style={{display:'flex',alignItems:'center',gap:1,background:'transparent'}}>
          {[['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']].map(([l,h])=>(
            <button key={l} onClick={()=>h.startsWith('/')?nav(h):document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
              style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:'rgba(255,255,255,0.72)',padding:'5px 12px',borderRadius:4,transition:'color .12s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>{l}</button>
          ))}
          <div style={{position:'relative'}}
            onMouseEnter={e=>{const d=e.currentTarget.querySelector('.id');if(d){d.style.opacity='1';d.style.transform='translateX(-50%) translateY(0)';d.style.pointerEvents='auto'}}}
            onMouseLeave={e=>{const d=e.currentTarget.querySelector('.id');if(d){d.style.opacity='0';d.style.transform='translateX(-50%) translateY(-4px)';d.style.pointerEvents='none'}}}>
            <button style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:'rgba(255,255,255,0.72)',padding:'5px 12px',borderRadius:4,transition:'color .12s',display:'flex',alignItems:'center',gap:3}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>
              Industry Intelligence <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="id" style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%) translateY(-4px)',background:'#ffffff',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'5px',minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:300,opacity:0,pointerEvents:'none',transition:'opacity .16s,transform .16s'}}>
              {[{label:'CA Trust Store',path:'/ca-trust-explorer',desc:'6,200+ root & intermediate CAs'},{label:'CAB Forum',path:'/cab-forum',desc:'Ballots, timelines & compliance'},{label:'PKI Hub',path:'/pki-hub',desc:'Standards bodies & PQC tracker'}].map(it=>(
                <button key={it.path} onClick={()=>nav(it.path)} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:'7px 10px',borderRadius:4,transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{fontSize:12,fontWeight:500,color:'#111111',marginBottom:1}}>{it.label}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.48)'}}>{it.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </nav>}
        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          {!isMobile&&<button onClick={()=>nav('/auth')} style={{background:'none',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,color:'rgba(255,255,255,0.72)',padding:'5px 10px',borderRadius:4,transition:'color .12s'}} onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>Sign in</button>}
          <button onClick={()=>nav('/auth')} style={{background:'#0077b6',border:'none',cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:600,color:'#fff',padding:'7px 16px',borderRadius:5,transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#0091d6'} onMouseLeave={e=>e.currentTarget.style.background='#0077b6'}>Get started</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{background:'#003d6b',overflow:'hidden',position:'relative'}}>

        {/* Subtle grid pattern */}
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',backgroundSize:'32px 32px',pointerEvents:'none'}}/>

        <div style={{maxWidth:1200,margin:'0 auto',padding:isMobile?'56px 24px 48px':`clamp(80px,10vw,120px) ${P}`,position:'relative',zIndex:1}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?48:80,alignItems:'center'}}>

            {/* ── Left: headline ── */}
            <div>
              {/* Eyebrow pill */}
              <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:99,padding:'6px 14px',marginBottom:28}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#00a550',flexShrink:0,animation:'blink 2.4s ease infinite'}}/>
                <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'.1em',fontFamily:MONO}}>CERTIFIED PKI SPECIALIST · NETHERLANDS</span>
              </div>

              {/* Headline */}
              <h1 style={{fontSize:`clamp(42px,6vw,78px)`,fontWeight:900,letterSpacing:'-3px',lineHeight:1.0,color:'#ffffff',marginBottom:20}}>
                Every cert.<br/>
                <span style={{color:'rgba(255,255,255,0.35)'}}>Automated.</span>
              </h1>

              {/* Subheadline */}
              <p style={{fontSize:16,color:'rgba(255,255,255,0.65)',lineHeight:1.8,maxWidth:400,marginBottom:36,fontWeight:400}}>
                Issue · Install · Monitor · Renew. One PKI platform — zero manual steps. No VC funding, no price gouging.
              </p>

              {/* CTAs */}
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:48}}>
                <button onClick={()=>nav('/auth')} style={{background:'#00a550',border:'none',borderRadius:8,padding:'13px 26px',fontSize:14,fontWeight:700,color:'#ffffff',cursor:'pointer',fontFamily:F,transition:'background .12s',letterSpacing:'-.1px'}} onMouseEnter={e=>e.currentTarget.style.background='#00bf5e'} onMouseLeave={e=>e.currentTarget.style.background='#00a550'}>
                  Get started free →
                </button>
                <button onClick={()=>nav('/pricing')} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,padding:'13px 22px',fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.85)',cursor:'pointer',fontFamily:F,transition:'all .12s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.13)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                  View pricing
                </button>
              </div>

              {/* Stats */}
              <div style={{display:'flex',gap:0,borderTop:'1px solid rgba(255,255,255,0.1)',paddingTop:24}}>
                {[{val:certCount?`${count.toLocaleString()}+`:'—',label:'Certs managed'},{val:'99.9%',label:'Renewal rate'},{val:'12',label:'PKI bodies tracked'}].map((m,i)=>(
                  <div key={m.label} style={{flex:1,paddingLeft:i>0?24:0,borderLeft:i>0?'1px solid rgba(255,255,255,0.1)':'none',marginLeft:i>0?24:0}}>
                    <div style={{fontSize:24,fontWeight:900,color:'#ffffff',fontFamily:MONO,letterSpacing:'-1px',lineHeight:1}}>{m.val}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:5,letterSpacing:'.01em'}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: live fleet terminal ── */}
            <div>
              <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
                {/* Titlebar */}
                <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>Live fleet · real data</span>
                  <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:GRN,fontFamily:MONO}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:GRN,animation:'blink 2.4s ease infinite'}}/>
                    Live
                  </div>
                </div>

                {/* Cert rows */}
                <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:7}}>
                  {[
                    {domain:'easysecurity.in', days:196, grade:'A+', method:'cPanel'},
                    {domain:'freecerts.site',  days:196, grade:'A+', method:'Agent'},
                  ].map(c=>(
                    <div key={c.domain} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:'11px 13px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:GRN,flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',fontFamily:MONO}}>{c.domain}</span>
                        </div>
                        <span style={{fontSize:9,fontWeight:700,color:GRN,background:'rgba(0,165,80,0.15)',border:'1px solid rgba(0,165,80,0.25)',borderRadius:20,padding:'2px 8px',letterSpacing:'.06em',fontFamily:MONO}}>LIVE</span>
                      </div>
                      <div style={{display:'flex',gap:14,alignItems:'center'}}>
                        <div><span style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:MONO}}>{c.days}d</span><span style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginLeft:4}}>left</span></div>
                        <span style={{fontSize:13,fontWeight:700,color:GRN,fontFamily:MONO}}>{c.grade}</span>
                        <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontFamily:MONO}}>{c.method}</span>
                        <div style={{marginLeft:'auto',fontSize:11,fontWeight:600,color:GRN,fontFamily:MONO}}>✓ auto-renew</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'rgba(255,255,255,0.04)',margin:'0 12px 12px',borderRadius:8,overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
                  {[{val:'100',label:'SLA SCORE',color:'rgba(255,255,255,0.85)'},{val:'2/2',label:'LIVE CERTS',color:GRN},{val:'0',label:'EXPIRING',color:'rgba(255,255,255,0.35)'}].map((s,i)=>(
                    <div key={s.label} style={{padding:'12px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,0.06)':'none'}}>
                      <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:MONO,lineHeight:1}}>{s.val}</div>
                      <div style={{fontSize:8,color:'rgba(255,255,255,0.28)',marginTop:5,letterSpacing:'.06em',fontFamily:MONO}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Trust tags */}
                <div style={{display:'flex',gap:5,flexWrap:'wrap',padding:'0 12px 12px',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:10}}>
                  {['RFC 8555','AES-256-GCM','RapidSSL','CA/B 2026','DNS-01'].map(t=>(
                    <span key={t} style={{fontSize:9,fontWeight:600,color:'rgba(61,191,176,0.6)',background:'rgba(61,191,176,0.06)',border:'1px solid rgba(61,191,176,0.15)',borderRadius:20,padding:'2px 8px',fontFamily:MONO,letterSpacing:'.05em'}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{background:'#0077b6',overflow:'hidden',padding:'0'}}>
        <div style={{display:'flex',overflow:'hidden',WebkitMaskImage:'linear-gradient(to right,transparent,black 5%,black 95%,transparent)',maskImage:'linear-gradient(to right,transparent,black 5%,black 95%,transparent)'}}>
          <div style={{display:'flex',gap:0,flexShrink:0,animation:'ticker 28s linear infinite',whiteSpace:'nowrap'}}>
            {[...TICKER,...TICKER].map((p,i)=>(
              <span key={i} style={{display:'inline-flex',alignItems:'center',gap:0,padding:'8px 0',fontFamily:MONO}}>
                <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.9)',letterSpacing:'0.04em',padding:'0 20px'}}>{p}</span>
                <span style={{width:1,height:10,background:'rgba(255,255,255,0.25)',flexShrink:0}}/>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLATFORM ── */}
      <section id="platform" style={{background:'#0077b6',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
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
                  <div key={s.n} style={{display:'flex',gap:16,padding:'16px 0',borderBottom:i<3?'1px solid rgba(255,255,255,0.1)':'none'}}>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',width:32,flexShrink:0,marginTop:1,fontFamily:MONO}}>{s.n}</span>
                    <div><div style={{fontSize:13,fontWeight:700,color:'#ffffff',marginBottom:4}}>{s.t}</div><div style={{fontSize:12.5,color:'rgba(255,255,255,0.65)',lineHeight:1.65}}>{s.d}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:MONO,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0',display:'inline-block'}}/>
              Certificate inventory — live expiry · health grade · auto-renew status
            </div>
            <InventoryMockup/>
          </FadeUp>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp><div style={{marginBottom:44,maxWidth:480}}>
              <Eyebrow>All capabilities</Eyebrow>
              <H2 style={{marginBottom:12}}>Every feature a PKI team needs.</H2>
              <Body>Eight core capability areas — built, not bolted on.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:10}}>
            {[{icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',title:'Certificate issuance',specs:['DV, OV, EV, Wildcard, SAN','RapidSSL · DigiCert trust chain','ACME v2 · RFC 8555','Issued in < 5 minutes'],badge:'ACME v2'},
              {icon:'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0H5a2 2 0 00-2 2v4a2 2 0 002 2h4m0-8h10a2 2 0 012 2v4a2 2 0 01-2 2H9m0-8v6',title:'VPS persistent agent',specs:['systemd daemon · polls every 60s','Nginx + Apache auto-detect','Config test before reload','Cron dispatches jobs every 2 min'],badge:'systemd'},
              {icon:'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',title:'DNS automation',specs:['Cloudflare · Vercel · Route53','Namecheap · GoDaddy · DigitalOcean','Auto TXT/CNAME challenge','Cleanup after DCV completes'],badge:'DNS-01'},
              {icon:'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2',title:'cPanel auto-install',specs:['UAPI-based installation','No SSH or agent required','API token auth','Cron auto-installs within 2 min'],badge:'UAPI'},
              {icon:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',title:'CertVault',specs:['AES-256-GCM · envelope encryption','Password re-auth before reveal','30-day rotation archive','Immutable audit log → CSV'],badge:'AES-256'},
              {icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',title:'47-day readiness',specs:['Scores every cert 0–100','200d → 100d → 47d timeline','Per-cert automation checklist','Fleet-wide compliance report'],badge:'CA/B 2026'},
              {icon:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',title:'Discovery & monitoring',specs:['CT log scan via crt.sh','CT abuse monitor — unknown CAs','SSL health score A+ to F','HSTS · CAA · TLS 1.3 checks'],badge:'CT Logs'},
              {icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',title:'CA intelligence',specs:['GoGetSSL · RapidSSL · DigiCert chain','cPanel + VPS agent auto-install','Zero-touch renewal pipeline','Fleet expiry & compliance view'],badge:'Multi-CA'},
              {icon:'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',title:'Industry Intelligence',specs:['6,200+ CAs from CCADB live','CAB Forum ballot tracker','12 PKI bodies deep-dive','PQC migration tracker'],badge:'PKI Hub'},
              {icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',title:'CA Trust Store',specs:['Every root & intermediate CA indexed','PKI Trust Score per certificate','Filter by trust store · algorithm','CSV export · PEM download'],badge:'CCADB'},
            ].map(f=>(
              <div key={f.title} style={{background:'#0f1923',padding:'16px',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,display:'flex',flexDirection:'column',gap:0,transition:'border-color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(61,191,176,0.3)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{width:30,height:30,borderRadius:7,background:'rgba(61,191,176,0.1)',border:'1px solid rgba(61,191,176,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3dbfb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:'#3dbfb0',background:'rgba(61,191,176,0.1)',border:'1px solid rgba(61,191,176,0.2)',borderRadius:20,padding:'2px 8px',letterSpacing:'.06em',fontFamily:MONO}}>{f.badge}</span>
                </div>
                <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:10}}>{f.title}</div>
                {f.specs.map(s=><div key={s} style={{display:'flex',alignItems:'flex-start',gap:7,marginBottom:4}}>
                  <span style={{color:'rgba(61,191,176,0.5)',fontSize:10,marginTop:3,flexShrink:0}}>›</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.55}}>{s}</span>
                </div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY CONTROLS ── */}
      <section style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{marginBottom:44}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{fontSize:10,fontWeight:700,color:'#ffffff',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:5,padding:'3px 10px',letterSpacing:'.07em',fontFamily:MONO}}>SECURITY CONTROLS</span>
              </div>
              <H2 style={{marginBottom:12,color:'#ffffff'}}>Enterprise PKI controls. Not an afterthought.</H2>
              <Body>CertVault and 47-Day Readiness are built into every account — not a paid add-on.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,alignItems:'start'}}>
            <FadeUp>
              <div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.48)',fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,fontWeight:500}}>🔐 AES-256-GCM private key vault</div>
                <CertVaultMockup/>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10,fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0',display:'inline-block'}}/>
                  CA/B Forum compliance scoring
                </div>
                <ReadinessMockup/>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── SECURITY SPECS ── */}
      <section id="security" style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'flex-start',marginBottom:44}}>
              <div>
                <Eyebrow>Security specifications</Eyebrow>
                <H2 style={{marginBottom:14}}>Open standards throughout. No black boxes.</H2>
                <Body style={{marginBottom:20}}>Every layer of SSLVault is built on auditable open standards. RFC 8555 for issuance, AES-256-GCM for storage, CT logs for transparency.</Body>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{['RFC 8555','AES-256-GCM','TLS 1.3','CT Logs','CAA Records','HSTS','SHA-256'].map(t=><Tag key={t}>{t}</Tag>)}</div>
              </div>
              <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
                <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>Security specifications · open standards</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(260px,100%),1fr))',gap:1,background:'rgba(255,255,255,0.04)'}}>
                  {[{spec:'AES-256-GCM',title:'Key encryption',desc:'DEK wrapped with KEK. Keys never in plaintext.'},{spec:'RFC 8555',title:'ACME v2',desc:'DNS-01 challenge. Auto-validated via provider API.'},{spec:'CT monitoring',title:'Cert transparency',desc:'crt.sh queries for every cert ever issued.'},{spec:'CAA + HSTS',title:'DNS security',desc:'CAA prevents unauthorised CA issuance.'},{spec:'TLS 1.2 / 1.3',title:'TLS posture',desc:'ECDHE + PFS. HSTS max-age verified.'},{spec:'Append-only',title:'Audit trail',desc:'Every access logged. CSV export for SOC 2.'}].map(s=>(
                    <div key={s.spec} style={{background:'rgba(255,255,255,0.03)',padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{fontSize:9,fontWeight:600,color:'#3dbfb0',fontFamily:MONO,letterSpacing:'0.07em',marginBottom:5,textTransform:'uppercase'}}>{s.spec}</div>
                      <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:4}}>{s.title}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.65}}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
              {/* Titlebar */}
              <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>CA/B Forum · SC-081v3 · maximum validity mandate</span>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:RED,fontFamily:MONO}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:RED,animation:'blink 2s ease infinite'}}/>
                  Action required
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:0}}>
                {[{date:'March 15, 2026',limit:'200d',status:'IN EFFECT',color:RED,action:'200-day maximum is now enforced. Certificates issued with longer validity are rejected by all major browsers.'},{date:'March 15, 2027',limit:'100d',status:'UPCOMING',color:AMB,action:'Manual renewal every 100 days is operationally unsustainable. Automation becomes a hard requirement.'},{date:'March 15, 2029',limit:'47d',status:'PLANNED',color:GRN,action:"Full zero-touch automation required. SSLVault's agent + DNS automation handles this end-to-end today."}].map((m,i)=>(
                  <div key={m.date} style={{padding:'20px 22px',borderLeft:!isMobile&&i>0?'1px solid rgba(255,255,255,0.06)':'none',borderTop:isMobile&&i>0?'1px solid rgba(255,255,255,0.06)':'none'}}>
                    <div style={{fontSize:9,fontWeight:700,color:m.color,fontFamily:MONO,letterSpacing:'.08em',marginBottom:5}}>{m.status}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,marginBottom:8}}>{m.date}</div>
                    <div style={{fontSize:36,fontWeight:700,color:m.color,fontFamily:MONO,letterSpacing:'-1px',lineHeight:1,marginBottom:10}}>{m.limit}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>{m.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── DNS ── */}
      <DNSContext.Provider value={{selected:dnsProvider,setSelected:setDnsProvider}}>
      <section style={{background:'#0077b6',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'center'}}>
            <FadeUp>
              <div>
                <Eyebrow>DNS automation</Eyebrow>
                <H2 style={{marginBottom:14}}>Automated DNS-01 challenge across every major provider.</H2>
                <Body style={{marginBottom:20}}>When issuing or renewing, SSLVault calls your DNS provider API to add the ACME challenge record, polls for propagation, validates, then cleans up — fully automatic.</Body>
                <DNSProviderSelector/>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <DNSTerminal/>
            </FadeUp>
          </div>
        </div>
      </section>
      </DNSContext.Provider>

      {/* ── ARCHITECTURE ── */}
      <section style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:40,flexWrap:'wrap',gap:16}}>
              <div>
                <Eyebrow>How it works</Eyebrow>
                <H2 style={{marginBottom:8,maxWidth:360}}>CSR to live HTTPS in one pipeline.</H2>
                <Body style={{maxWidth:380}}>Five automated steps. Zero manual work. Runs forever.</Body>
              </div>
              <button onClick={()=>nav('/auth')} style={{background:'#0077b6',border:'none',borderRadius:8,padding:'10px 22px',fontSize:12,fontWeight:700,color:'#ffffff',cursor:'pointer',fontFamily:F,alignSelf:'flex-start',transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#0091d6'} onMouseLeave={e=>e.currentTarget.style.background='#0077b6'}>Get started →</button>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:isMobile?10:0,alignItems:'stretch'}}>
              {[
                {n:'01',icon:'🖥',title:'Issue request',desc:'Select domain and cert type. SSLVault generates the CSR automatically.',accent:'#0077b6'},
                {n:'02',icon:'🌐',title:'DNS validation',desc:'DNS provider API adds the ACME TXT challenge. Auto-validated in seconds.',accent:'#00a550'},
                {n:'03',icon:'🏛',title:'CA issues cert',desc:'RapidSSL signs the cert. Stored AES-256 encrypted in CertVault.',accent:'#0077b6'},
                {n:'04',icon:'⚡',title:'Auto-install',desc:'VPS agent or cPanel UAPI deploys to Nginx / Apache within 2 minutes.',accent:'#00a550'},
                {n:'05',icon:'🔄',title:'Lifecycle loop',desc:'Monitors expiry. Auto-renews 30 days before. Runs forever, zero manual steps.',accent:'#ffffff',bg:'#0077b6'},
              ].map((s,i,arr)=>(
                <div key={s.n} style={{flex:1,display:'flex',flexDirection:'row',alignItems:'stretch'}}>
                  <div style={{flex:1,background:s.bg||'#ffffff',border:`1px solid ${s.bg?'rgba(0,119,182,0.4)':'rgba(0,0,0,0.08)'}`,borderRadius:12,padding:'20px 16px',position:'relative',display:'flex',flexDirection:'column',gap:10,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,fontWeight:800,color:s.accent,letterSpacing:'.06em',fontFamily:MONO}}>{s.n}</span>
                      <span style={{fontSize:22}}>{s.icon}</span>
                    </div>
                    <div style={{height:2,width:28,background:s.accent,borderRadius:99,opacity:.7}}/>
                    <div style={{fontSize:13,fontWeight:700,color:s.bg?'#ffffff':'#0a1628',letterSpacing:'-.01em',lineHeight:1.3}}>{s.title}</div>
                    <div style={{fontSize:11.5,color:s.bg?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.6)',lineHeight:1.65,flex:1}}>{s.desc}</div>
                  </div>
                  {i<arr.length-1&&!isMobile&&(
                    <div style={{width:28,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,paddingBottom:20}}>
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                        <path d="M0 6h13M9 1l5 5-5 5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── INDUSTRY INTELLIGENCE ── */}
      <section style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{marginBottom:44}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{fontSize:10,fontWeight:700,color:'#ffffff',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:5,padding:'3px 10px',letterSpacing:'.07em',fontFamily:MONO}}>INDUSTRY INTELLIGENCE</span>
              </div>
              <H2 style={{marginBottom:12,maxWidth:520}}>The deepest PKI intelligence platform on the web.</H2>
              <Body style={{maxWidth:500}}>Not just a certificate manager — a living knowledge base covering every CA, standard, governance body, and cryptographic transition shaping the industry.</Body>
            </div>
          </FadeUp>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:12,marginBottom:12}}>
            {[{icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',title:'CA Trust Store',sub:'6,200+ root & intermediate CAs',desc:'Every CA in Chrome, Firefox, Apple, and Microsoft trust stores — live from CCADB. Search by operator, algorithm, region. PKI Trust Score per cert.',badge:'CCADB Live',path:'/ca-trust-explorer',stats:[['6,200+','CAs indexed'],['4','Trust stores'],['Daily','CCADB sync']]},
              {icon:'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',title:'CAB Forum Intelligence',sub:'Ballots, timelines & compliance',desc:'Every CAB Forum ballot tracked with plain-English summaries. 47-day countdown, SC081v3 compliance deadlines, 5 working groups, full PKI history timeline from 2005.',badge:'Live sync',path:'/cab-forum',stats:[['47-day','2029 mandate'],['5','Working groups'],['Real-time','Ballot feed']]},
              {icon:'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',title:'Global PKI Hub',sub:'12 bodies · 22 standards · PQC tracker',desc:'CAB Forum, ETSI ESI, NIST, IETF, APKIC, eIDAS 2.0, PKI Consortium, CSC, FIDO, WebTrust, CCADB, ITU-T — each with deep-dive pages, standards library, and PQC migration status.',badge:'PQC Ready',path:'/pki-hub',stats:[['12','PKI bodies'],['3','NIST PQC finals'],['2026','Amsterdam conf.']]}
            ].map(item=>(
              <div key={item.title} onClick={()=>nav(item.path)} style={{background:'#0f1923',cursor:'pointer',transition:'all .15s',display:'flex',flexDirection:'column',gap:14,border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,overflow:'hidden'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(61,191,176,0.35)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.transform='none'}}>
                {/* Card header */}
                <div style={{background:'#1a2533',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{width:28,height:28,borderRadius:7,background:'rgba(61,191,176,0.1)',border:'1px solid rgba(61,191,176,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3dbfb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:'#3dbfb0',background:'rgba(61,191,176,0.1)',border:'1px solid rgba(61,191,176,0.2)',borderRadius:20,padding:'2px 8px',letterSpacing:'.06em',fontFamily:MONO}}>{item.badge}</span>
                </div>
                {/* Content */}
                <div style={{padding:'0 14px',flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:3}}>{item.title}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,marginBottom:9}}>{item.sub}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>{item.desc}</div>
                </div>
                {/* Stats + explore */}
                <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',gap:16}}>
                    {item.stats.map(([val,label],i)=>(
                      <div key={label}>
                        <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.85)',fontFamily:MONO}}>{val}</div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <span style={{fontSize:11,color:'rgba(61,191,176,0.7)',fontFamily:MONO}}>Explore →</span>
                </div>
              </div>
            ))}
          </div>
          <FadeUp>
            <div style={{background:'#0f1923',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,overflow:'hidden'}}>
              <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:7,height:7,borderRadius:'50%',background:c}}/>)}</div>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>Post-Quantum Cryptography · migration tracker</span>
                <span style={{fontSize:9,color:'#3dbfb0',fontFamily:MONO,display:'flex',alignItems:'center',gap:4}}><div style={{width:5,height:5,borderRadius:'50%',background:'#3dbfb0'}}/>Live</span>
              </div>
              <div style={{padding:'16px 18px',display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:240}}>
                  <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:6}}>Post-Quantum Cryptography migration tracker — live</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7}}>NIST finalised ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) in August 2024. The PKI Hub tracks every body's PQC readiness — from IETF LAMPS WG certificate profiles to ETSI EN 319 updates.</div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
                  {[['ML-KEM','FIPS 203'],['ML-DSA','FIPS 204'],['SLH-DSA','FIPS 205']].map(([alg,fips])=>(
                    <div key={alg} style={{background:'rgba(61,191,176,0.08)',border:'1px solid rgba(61,191,176,0.2)',borderRadius:7,padding:'7px 10px',textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#3dbfb0',fontFamily:MONO}}>{alg}</div>
                      <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:2}}>{fips}</div>
                    </div>
                  ))}
                  <button onClick={()=>nav('/pki-hub')} style={{background:'#0077b6',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:F,transition:'background .12s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#0091d6'}
                    onMouseLeave={e=>e.currentTarget.style.background='#0077b6'}>
                    View PQC tracker →
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CERTBIND ── */}
      <section style={{background:'#005a8a',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <FadeUp>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:18}}>
              <span style={{fontSize:10,fontWeight:600,color:'#0077b6',letterSpacing:'0.07em',textTransform:'uppercase',fontFamily:MONO,background:'rgba(0,119,182,0.08)',border:'1px solid rgba(0,119,182,0.18)',borderRadius:5,padding:'3px 10px'}}>Industry first</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.48)',letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:MONO}}>No other CLM vendor has built this</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:72,alignItems:'center',marginBottom:40}}>
              <div>
                <h2 style={{fontSize:`clamp(22px,3.5vw,40px)`,fontWeight:700,letterSpacing:'-1px',lineHeight:1.12,color:'#ffffff',marginBottom:16}}>
                  Every other CLM tells you what cert you issued.<br/><span style={{color:'rgba(255,255,255,0.45)'}}>SSLVault proves what's actually running.</span>
                </h2>
                <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',lineHeight:1.8,marginBottom:20,maxWidth:440}}>A certificate can be valid. HTTPS can be green. Your CLM can show everything healthy. And your server can be serving a mismatched key, a rogue cert, or half a load balancer pool — and nobody knows.</p>
                <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',lineHeight:1.8,marginBottom:28,maxWidth:440}}>CertBind closes that gap with continuous, cryptographic proof — every 5 minutes.</p>
                <div style={{display:'flex',gap:10}}><BtnPrimary label="See CertBind" onClick={()=>nav('/auth')}/><BtnGhost label="Read how it works" onClick={()=>nav('/knowledge-base')}/></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:0,background:'#0f1923',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.25)'}}>
                {/* Titlebar */}
                <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>CertBind · cryptographic binding</span>
                  <span style={{fontSize:9,fontWeight:600,color:GRN,background:'rgba(0,165,80,0.15)',border:'1px solid rgba(0,165,80,0.25)',borderRadius:20,padding:'1px 8px',fontFamily:MONO}}>ACTIVE</span>
                </div>
                {/* Header row */}
                <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GRN} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    <span style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.85)',fontFamily:MONO}}>CertBind</span>
                  </div>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO}}>4/4 domains bound</span>
                </div>
                {/* Check rows */}
                {[
                  {n:'01',label:'Key-Cert Binding Proof',status:'VERIFIED',c:GRN,desc:'Agent signs nonce · key ↔ cert proven cryptographically'},
                  {n:'02',label:'Live TLS Fingerprint',status:'MATCH',c:GRN,desc:'SHA-256 of served cert matches issued cert on every poll'},
                  {n:'03',label:'Chain Integrity',status:'CLEAN',c:GRN,desc:'No unexpected intermediates · no SSL inspection proxy'},
                  {n:'04',label:'Multi-Node Consistency',status:'7/7 NODES',c:GRN,desc:'All load balancer nodes serving correct certificate'},
                ].map((l,i,arr)=>(
                  <div key={l.n} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 14px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none',background:'rgba(255,255,255,0.02)'}}>
                    <div style={{width:22,height:22,borderRadius:5,background:'rgba(0,165,80,0.12)',border:'1px solid rgba(0,165,80,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:GRN,fontFamily:MONO,flexShrink:0}}>{l.n}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{l.label}</span>
                        <span style={{fontSize:9.5,fontWeight:700,color:l.c,fontFamily:MONO,letterSpacing:'0.04em'}}>{l.status}</span>
                      </div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO}}>{l.desc}</div>
                    </div>
                  </div>
                ))}
                {/* Footer alert */}
                <div style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 14px',background:'rgba(231,76,60,0.06)',borderTop:'1px solid rgba(231,76,60,0.12)'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'#e74c3c',marginBottom:3}}>What CertBind catches that others miss</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,lineHeight:1.7}}>key_mismatch · cert_mismatch · chain_anomaly · partial_deploy</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={80}>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.12)',paddingTop:32}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.48)',fontFamily:MONO,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:16,textAlign:'center',fontWeight:500}}>Real-world failures CertBind prevents</div>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${isMobile?1:3},1fr)`,gap:8}}>
                {[{status:'key_mismatch',color:'#e74c3c',title:'The Zombie Certificate',scenario:'Nginx renewed cert automatically. But a config change six months ago redirected nginx to a backup key from a previous issuance. CLM shows green. Browser shows valid. The cert and key are from different issuances.',impact:'$11M average PKI outage cost · undetected for months in typical orgs'},{status:'partial_deploy',color:'#f39c12',title:'The Phantom Install',scenario:'New cert deployed to 4 of 7 load balancer nodes. The other 3 are still running the cert that expires in 4 days. CLM shows the cert was issued and installed. It has no idea about the other 3 nodes.',impact:'#1 cause of PKI-related outages in enterprises · usually found by customers first'},{status:'chain_anomaly',color:'#a78bfa',title:'The Silent Swap',scenario:"Enterprise Palo Alto proxy is SSL-inspecting traffic to your API server. Every TLS connection is being decrypted, inspected, and re-encrypted with the proxy's internal CA. Your CLM doesn't know.",impact:'Affects every enterprise with SSL inspection · invisible to all other CLM tools'}].map(s=>(
                  <div key={s.title} style={{background:'#0f1923',border:`1px solid ${s.color}22`,borderRadius:10,padding:'16px',borderTop:`2px solid ${s.color}`}}>
                    <div style={{fontSize:9,fontWeight:700,color:s.color,fontFamily:MONO,letterSpacing:'.07em',marginBottom:10,textTransform:'uppercase'}}>{s.status}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:8}}>{s.title}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.75,marginBottom:10}}>{s.scenario}</div>
                    <div style={{fontSize:11,fontWeight:500,color:s.color,lineHeight:1.5}}>{s.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>




      {/* ── MISSION ── */}
      <section style={{background:'#0077b6',padding:`clamp(64px,8vw,96px) ${P}`,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?40:80,alignItems:'flex-start'}}>
            <FadeUp>
              <div>
                <div style={{display:'inline-flex',alignItems:'center',gap:7,border:'1px solid rgba(255,255,255,0.3)',borderRadius:99,padding:'5px 14px',marginBottom:20,background:'rgba(255,255,255,0.1)'}}>
                  <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.9)',letterSpacing:'.06em'}}>Why we built this</span>
                </div>
                <H2 style={{marginBottom:14}}>PKI expertise shouldn't require a $250k contract.</H2>
                <Body style={{marginBottom:16}}>SSLVault is built by a Certified PKI Specialist with deep CA industry experience. The same automation enterprise teams pay hundreds of thousands for — available without the procurement cycle.</Body>
                <Body style={{marginBottom:28}}>As CA/B Forum mandates tighten (200d → 100d → 47d between 2026–2029), full automation becomes non-negotiable. SSLVault is built for what's coming.</Body>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <BtnPrimary label="Get started" onClick={()=>nav('/auth')}/>
                  <BtnGhost label="View pricing" onClick={()=>nav('/pricing')}/>
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div style={{background:'#0f1923',borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
                {/* Titlebar */}
                <div style={{background:'#1a2533',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',gap:5}}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontFamily:MONO,flex:1,textAlign:'center'}}>CLM market · pricing comparison</span>
                </div>
                <div style={{padding:'12px',display:'flex',flexDirection:'column',gap:6}}>
                  {/* Competitor rows */}
                  {[{name:'Venafi TLS Protect',price:'$250k+/yr',notes:'Enterprise only · No cert issuance · No cPanel',hi:false},{name:'Keyfactor Command',price:'$75–200k/yr',notes:'Mid-market · Complex setup · No free tier',hi:false},{name:'SSLVault CLM',price:'Partner rates',notes:'Full CLM · Agent + cPanel + DNS · All cert types',hi:true}].map(c=>(
                    <div key={c.name} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:c.hi?'rgba(61,191,176,0.06)':'rgba(255,255,255,0.02)',border:`1px solid ${c.hi?'rgba(61,191,176,0.25)':'rgba(255,255,255,0.05)'}`,borderRadius:8,borderLeft:c.hi?'3px solid #3dbfb0':'3px solid transparent'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:c.hi?600:400,color:c.hi?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.45)'}}>{c.name}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:2,fontFamily:MONO}}>{c.notes}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:c.hi?700:400,color:c.hi?'#3dbfb0':'rgba(255,255,255,0.3)',fontFamily:MONO,whiteSpace:'nowrap'}}>{c.price}</div>
                    </div>
                  ))}
                  {/* Divider */}
                  <div style={{height:'1px',background:'rgba(255,255,255,0.05)',margin:'2px 0'}}/>
                  {/* Trust badge rows */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(240px,100%),1fr))',gap:4}}>
                    {[['DigiCert','Trust chain · 99.9% browser'],['RapidSSL','CA partner · wholesale pricing'],['RFC 8555','ACME v2 · no lock-in'],['AES-256','Military-grade key storage'],['GDPR','Netherlands-based PKI engineer'],['No ads','No tracking · no reselling']].map(([val,sub])=>(
                      <div key={val} style={{display:'flex',gap:9,padding:'8px 10px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:7,alignItems:'center'}}>
                        <div style={{fontSize:10,fontWeight:600,color:'#3dbfb0',fontFamily:MONO,minWidth:55}}>{val}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',lineHeight:1.4}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{background:'#0077b6',padding:`clamp(64px,8vw,80px) ${P}`,borderTop:'none'}}>
        <div style={{maxWidth:560,margin:'0 auto',textAlign:'center'}}>
          <FadeUp>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,border:'1px solid rgba(255,255,255,0.2)',borderRadius:100,padding:'5px 14px',marginBottom:24,background:'rgba(255,255,255,0.08)'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#00a550',animation:'blink 2.4s ease infinite'}}/>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.7)',fontFamily:MONO,letterSpacing:'.05em'}}>Production-ready · RFC 8555 · CA/B Forum 2026</span>
            </div>
            <h2 style={{fontSize:'clamp(22px,4vw,38px)',fontWeight:700,letterSpacing:'-0.8px',lineHeight:1.14,color:'#ffffff',marginBottom:14}}>
              Ready to automate your<br/><span style={{color:'rgba(255,255,255,0.45)'}}>certificate lifecycle?</span>
            </h2>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.6)',lineHeight:1.75,maxWidth:420,margin:'0 auto 28px'}}>
              Issue, monitor, and auto-renew SSL certificates with enterprise-grade PKI controls — CertVault, 47-day readiness, and CA intelligence included.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:28}}>
              <button onClick={()=>nav('/auth')} style={{background:'#ffffff',border:'none',borderRadius:8,padding:'12px 26px',fontSize:13,fontWeight:700,color:'#0077b6',cursor:'pointer',fontFamily:F,transition:'all .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#e8f0f8'} onMouseLeave={e=>e.currentTarget.style.background='#ffffff'}>Start managing certs →</button>
              <button onClick={()=>nav('/pricing')} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,padding:'12px 20px',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.85)',cursor:'pointer',fontFamily:F,transition:'all .12s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>View pricing</button>
            </div>
            <div style={{display:'flex',gap:18,justifyContent:'center',flexWrap:'wrap'}}>
              {['RapidSSL · DigiCert trust chain','RFC 8555 · AES-256-GCM','CA/B Forum 2026 ready'].map(t=>(
                <span key={t} style={{fontSize:11,color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',gap:5}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke='rgba(255,255,255,0.5)' strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>{t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:'#111111',borderTop:`1px solid rgba(255,255,255,0.08)`,padding:`clamp(36px,5vw,52px) ${P} clamp(22px,3vw,32px)`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:32,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
            <div style={{width:20,height:20,background:'rgba(255,255,255,0.12)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke='#ffffff' strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:'#ffffff'}}>SSLVault</span>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:MONO,marginLeft:4}}>PKI-first CLM · Built by a real PKI engineer</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fill,minmax(140px,1fr))',gap:24,marginBottom:32}}>
            {[{title:'Product',links:[['Pricing',()=>nav('/pricing')],['Get started',()=>nav('/auth')],['Dashboard',()=>nav('/dashboard')]]},{title:'Support',links:[['Install Guide',()=>nav('/install')],['Knowledge Base',()=>nav('/knowledge-base')],['CAA Checker',()=>nav('/caa-check')]]},{title:'Intelligence',links:[['CA Trust Store',()=>nav('/ca-trust-explorer')],['CAB Forum',()=>nav('/cab-forum')],['PKI Hub',()=>nav('/pki-hub')]]},{title:'Security',links:[['CertVault','#security'],['47-Day Readiness','#security'],['CT Monitoring','#security'],['Health Scoring','#security']]},{title:'Protocol',links:[['RFC 8555','#security'],['DNS-01','#security'],['AES-256-GCM','#security']]},{title:'Company',links:[['About',()=>nav('/about')],['Contact',()=>nav('/contact')]]}].map(col=>(
              <div key={col.title}>
                <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.07em',fontFamily:MONO,marginBottom:12}}>{col.title}</div>
                {col.links.map(([l,h])=>(
                  <div key={l} style={{marginBottom:8}}>
                    <button onClick={()=>typeof h==='function'?h():document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'rgba(255,255,255,0.55)',fontFamily:F,padding:0,transition:'color .12s',textAlign:'left'}}
                      onMouseEnter={e=>e.currentTarget.style.color='#ffffff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>{l}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginBottom:20,display:'flex',justifyContent:'center'}}>
            <div style={{background:'#0f1923',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 20px',display:'inline-flex',alignItems:'center',gap:16,flexWrap:'wrap',justifyContent:'center'}}>
              <div style={{width:28,height:28,borderRadius:7,background:'rgba(61,191,176,0.12)',border:'1px solid rgba(61,191,176,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3dbfb0" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              {[['AES-256-GCM','Key vault'],['RFC 8555','ACME v2'],['RapidSSL','CA partner'],['GDPR','NL-based'],['No ads','No tracking']].map(([val,sub])=>(
                <div key={val} style={{textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#3dbfb0',fontFamily:MONO,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:2}}>{sub}</div>
                </div>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:GRN,fontFamily:MONO}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:GRN}}/>
                LIVE
              </div>
            </div>
          </div>
          <div style={{borderTop:`1px solid rgba(0,0,0,0.06)`,paddingTop:18,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:MONO}}>Made with ♥ towards PKI · Built by a real PKI engineer</span>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>© 2026 SSLVault. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}


