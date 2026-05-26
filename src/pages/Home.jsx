// Home.jsx — SSLVault v6 · Warm cream light theme · Syne + Space Grotesk
// 360° redesign — cream/ivory base, deep forest green, burnt sienna accent
// Every word of content preserved identically

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function useIsMobile() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 768, isTablet: w < 1024 }
}

function useIn(threshold = 0.08) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); io.disconnect() }
    }, { threshold })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return [ref, v]
}

function FadeUp({ children, delay = 0 }) {
  const [ref, v] = useIn()
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(28px)', transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

const F    = "'Space Grotesk','DM Sans',system-ui,sans-serif"
const MONO = "'Space Mono','JetBrains Mono','Menlo',monospace"

// Warm cream palette — light mode, rich & editorial
const C = {
  // Backgrounds
  page:    '#F5F0E8',   // warm cream
  surface: '#FFFDF8',   // warm white — cards
  alt:     '#EDE8DC',   // slightly deeper cream — section alt
  dark:    '#1C2B1F',   // deep forest hero/footer
  dark2:   '#243528',   // forest surface

  // Borders
  line:    '#D8D0C0',
  line2:   '#C4BAA8',

  // Text
  ink:     '#1C2B1F',   // deep forest — headings
  body:    '#4A5E4E',   // muted forest green body
  faint:   '#8A9E8E',   // very muted

  // Accents
  green:   '#2D6A4F',   // forest green — primary
  greenLt: '#52B788',   // lighter green
  greenBg: '#D8F3DC',
  greenBd: '#95D5B2',

  sienna:  '#C1440E',   // burnt sienna — CTA / accent
  siennaBg:'#FDECD8',
  siennaBd:'#F4A96A',

  amber:   '#B5652A',
  amberBg: '#FDF0DC',

  red:     '#C0392B',
  redBg:   '#FCE8E6',
}

function Tag({ children, color = C.green, bg = C.greenBg, border = C.greenBd }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:700, color, background:bg, border:`1px solid ${border}`, borderRadius:4, padding:'3px 9px', fontFamily:MONO, letterSpacing:'0.04em', textTransform:'uppercase' }}>
      {children}
    </span>
  )
}

function Eyebrow({ children, color = C.green }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>
      {children}
    </div>
  )
}

function H2({ children, style = {} }) {
  return (
    <h2 style={{ fontSize:'clamp(26px,3.5vw,42px)', fontWeight:700, color:C.ink, letterSpacing:'-0.8px', lineHeight:1.18, ...style }}>
      {children}
    </h2>
  )
}

function Body({ children, style = {} }) {
  return (
    <p style={{ fontSize:15.5, color:C.body, lineHeight:1.85, ...style }}>
      {children}
    </p>
  )
}

function Btn({ label, onClick, primary, outline }) {
  const [h, setH] = useState(false)
  if (primary) return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:700, fontSize:14, padding:'11px 26px', borderRadius:4, border:'none', cursor:'pointer', background:h?'#9E3709':C.sienna, color:'white', transition:'all .15s', letterSpacing:'-0.01em' }}>
      {label} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  )
  if (outline) return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:600, fontSize:14, padding:'11px 26px', borderRadius:4, cursor:'pointer', background:h?C.greenBg:'transparent', border:`1.5px solid ${C.green}`, color:C.green, transition:'all .15s', letterSpacing:'-0.01em' }}>
      {label}
    </button>
  )
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:600, fontSize:14, padding:'11px 26px', borderRadius:4, cursor:'pointer', background:h?C.alt:C.page, border:`1px solid ${h?C.line2:C.line}`, color:C.ink, transition:'all .15s', letterSpacing:'-0.01em' }}>
      {label}
    </button>
  )
}

function Panel({ children, style = {}, dark }) {
  return (
    <div style={{ background:dark?C.dark2:C.surface, border:`1px solid ${dark?'rgba(255,255,255,0.08)':C.line}`, borderRadius:8, padding:'24px', ...style }}>
      {children}
    </div>
  )
}

function Terminal({ title, lines }) {
  return (
    <div style={{ background:C.dark, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8, overflow:'hidden', fontFamily:MONO }}>
      <div style={{ background:'rgba(255,255,255,0.04)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c, opacity:.85 }}/>)}
        </div>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', flex:1, textAlign:'center' }}>{title}</span>
      </div>
      <div style={{ padding:'18px 22px', fontSize:12, lineHeight:2.1 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.c || 'rgba(255,255,255,0.45)', paddingLeft: l.indent ? 20 : 0 }}>
            {l.prompt && <span style={{ color:'rgba(255,255,255,0.2)', marginRight:10 }}>{l.prompt}</span>}
            {l.text}
          </div>
        ))}
        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'rgba(255,255,255,0.2)' }}>›</span>
          <span style={{ display:'inline-block', width:7, height:14, background:C.sienna, opacity:.8, animation:'blink 1.2s step-end infinite', borderRadius:1 }}/>
        </div>
      </div>
    </div>
  )
}

function InventoryMockup() {
  const rows = [
    { d:'easysecurity.in',   days:196, grade:'A+', ca:'RapidSSL', auto:true,  s:'active'   },
    { d:'api.shop.com',      days:18,  grade:'B',  ca:'Sectigo',  auto:true,  s:'warning'  },
    { d:'staging.portal.io', days:3,   grade:'C',  ca:'RapidSSL', auto:false, s:'critical' },
    { d:'mail.company.com',  days:84,  grade:'A',  ca:'RapidSSL', auto:true,  s:'active'   },
  ]
  const sc = s => s==='active'?C.green:s==='warning'?C.amber:C.red
  const gc = g => g.startsWith('A')?C.green:g==='B'?C.amber:C.red
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{ background:C.alt, padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:8,height:8,borderRadius:'50%',background:c }}/>)}</div>
        <span style={{ fontSize:11, color:C.faint, fontFamily:MONO, flex:1, textAlign:'center' }}>Inventory · 4 certificates</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 52px 52px 80px 60px 70px', padding:'8px 16px', borderBottom:`1px solid ${C.line}` }}>
        {['Domain','Days','Grade','CA','Auto','Status'].map(h => <div key={h} style={{ fontSize:9.5, fontWeight:700, color:C.faint, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>)}
      </div>
      {rows.map((r,i) => (
        <div key={r.d} style={{ display:'grid', gridTemplateColumns:'2fr 52px 52px 80px 60px 70px', padding:'10px 16px', borderBottom:i<rows.length-1?`1px solid ${C.line}`:'none', background:r.s==='critical'?C.redBg:r.s==='warning'?C.amberBg:C.surface, alignItems:'center' }}>
          <span style={{ fontSize:12, fontWeight:600, color:C.ink, fontFamily:MONO }}>{r.d}</span>
          <span style={{ fontSize:11, fontWeight:700, color:sc(r.s), fontFamily:MONO }}>{r.days}d</span>
          <span style={{ fontSize:11, fontWeight:800, color:gc(r.grade) }}>{r.grade}</span>
          <span style={{ fontSize:10.5, color:C.body }}>{r.ca}</span>
          <span style={{ fontSize:10, fontWeight:600, color:r.auto?C.green:C.faint }}>{r.auto?'✓ ON':'— OFF'}</span>
          <span style={{ fontSize:9.5, fontWeight:700, color:sc(r.s), background:sc(r.s)+'18', padding:'2px 8px', borderRadius:3, fontFamily:MONO }}>{r.s}</span>
        </div>
      ))}
    </div>
  )
}

function CertVaultMockup() {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{ background:C.alt, padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:8,height:8,borderRadius:'50%',background:c }}/>)}</div>
        <span style={{ fontSize:11, color:C.faint, fontFamily:MONO, flex:1, textAlign:'center' }}>CertVault · Private key vault</span>
      </div>
      <div style={{ padding:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:C.siennaBg, border:`1px solid ${C.siennaBd}`, borderRadius:6, marginBottom:14 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sienna} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:11, color:C.sienna, fontWeight:700 }}>AES-256-GCM · Envelope encryption · Immutable audit</span>
        </div>
        {[{d:'easysecurity.in',alg:'RSA-2048',last:'2h ago'},{d:'api.shop.com',alg:'EC-384',last:'Never'}].map((k,i) => (
          <div key={k.d} style={{ border:`1px solid ${C.line}`, borderTop:`3px solid ${C.sienna}`, borderRadius:6, padding:'12px', marginBottom:i===0?8:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:MONO }}>{k.d}</span>
              <span style={{ fontSize:9.5, fontWeight:700, color:C.sienna, background:C.siennaBg, padding:'2px 8px', borderRadius:3 }}>🔒 VAULT SECURED</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
              {[['Algorithm',k.alg],['Rotations','2'],['Last access',k.last]].map(([l,v]) => (
                <div key={l} style={{ background:C.alt, borderRadius:4, padding:'6px 8px' }}>
                  <div style={{ fontSize:9, color:C.faint, textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:C.ink, fontFamily:MONO }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['Reveal key','Rotate','Audit log'].map(t => (
                <button key={t} style={{ fontSize:10, fontWeight:600, padding:'5px 10px', borderRadius:4, border:`1px solid ${t==='Reveal key'?C.siennaBd:C.line}`, background:t==='Reveal key'?C.siennaBg:C.surface, color:t==='Reveal key'?C.sienna:C.body, cursor:'pointer', fontFamily:'inherit' }}>{t}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadinessMockup() {
  const certs = [
    { d:'easysecurity.in',   s:92, label:'Ready',     color:C.green },
    { d:'api.shop.com',      s:58, label:'At Risk',    color:C.amber },
    { d:'staging.portal.io', s:24, label:'Will Break', color:C.red   },
  ]
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{ background:C.alt, padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:8,height:8,borderRadius:'50%',background:c }}/>)}</div>
        <span style={{ fontSize:11, color:C.faint, fontFamily:MONO, flex:1, textAlign:'center' }}>47-Day Readiness · CA/B Forum</span>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[{d:'Mar 2026',v:'200d',s:C.red,bg:C.redBg},{d:'Mar 2027',v:'100d',s:C.amber,bg:C.amberBg},{d:'Mar 2029',v:'47d',s:C.green,bg:C.greenBg}].map(m => (
            <div key={m.d} style={{ padding:'10px', borderRadius:6, background:m.bg, border:`1px solid ${m.s}33` }}>
              <div style={{ fontSize:10, fontWeight:700, color:m.s, marginBottom:2 }}>{m.d}</div>
              <div style={{ fontSize:20, fontWeight:800, color:m.s, fontFamily:MONO }}>{m.v}</div>
              <div style={{ fontSize:9, color:C.faint }}>max validity</div>
            </div>
          ))}
        </div>
        {certs.map(c => (
          <div key={c.d} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:6, background:C.alt, marginBottom:6, border:`1px solid ${C.line}` }}>
            <div style={{ position:'relative', width:36, height:36, flexShrink:0 }}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke={C.line} strokeWidth="3.5"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke={c.color} strokeWidth="3.5" strokeDasharray={`${2*Math.PI*14}`} strokeDashoffset={`${2*Math.PI*14*(1-c.s/100)}`} strokeLinecap="round" transform="rotate(-90 18 18)"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:c.color }}>{c.s}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11.5, fontWeight:600, color:C.ink, fontFamily:MONO }}>{c.d}</div>
              <div style={{ fontSize:10, color:C.faint }}>Automation checklist</div>
            </div>
            <span style={{ fontSize:9.5, fontWeight:700, color:c.color, background:c.color+'18', padding:'2px 8px', borderRadius:3, fontFamily:MONO }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TICKER = ['RFC 8555 · ACME v2','RapidSSL Partner','AES-256-GCM','TLS 1.3','DNS-01 Challenge','CT Log Monitor','CAA Records','HSTS Verified','SHA-256','CA/B Forum 2026','Zero-touch Renewal','CertVault','47-Day Ready','ML-KEM · PQC Ready','6,200+ Root CAs','CCADB Indexed','PKI Hub Live','eIDAS 2.0 Tracked','NIST FIPS 203/204/205']

export default function Home({ nav }) {
  const { isMobile, isTablet } = useIsMobile()
  const [certCount, setCertCount] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    supabase.from('certificates').select('id', { count:'exact', head:true })
      .then(({ count }) => count && setCertCount(count))
  }, [])

  useEffect(() => {
    if (!certCount) return
    let i = 0
    const iv = setInterval(() => {
      i += Math.ceil(certCount / 60)
      if (i >= certCount) { setCount(certCount); clearInterval(iv) } else setCount(i)
    }, 16)
    return () => clearInterval(iv)
  }, [certCount])

  const cols = isMobile ? 1 : isTablet ? 2 : 3

  return (
    <div style={{ fontFamily:F, background:C.page, color:C.ink, overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#D8F3DC; color:#2D6A4F }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* ── NAV ── */}
      <header style={{ position:'sticky', top:0, zIndex:200, background:C.surface, borderBottom:`1px solid ${C.line}`, height:58, display:'flex', alignItems:'center', padding:`0 clamp(16px,4vw,40px)`, justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', flexShrink:0 }} onClick={() => nav('/')}>
          <div style={{ width:28, height:28, background:C.green, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.3px' }}>SSLVault</span>
        </div>

        {!isMobile && <nav style={{ display:'flex', alignItems:'center', gap:2 }}>
          {[['Platform','#platform'],['Features','#features'],['Security','#security'],['Pricing','/pricing']].map(([l,h]) => (
            <button key={l} onClick={() => h.startsWith('/') ? nav(h) : document.querySelector(h)?.scrollIntoView({ behavior:'smooth' })}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:C.body, padding:'6px 14px', borderRadius:4, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color=C.ink; e.currentTarget.style.background=C.alt }}
              onMouseLeave={e => { e.currentTarget.style.color=C.body; e.currentTarget.style.background='none' }}>
              {l}
            </button>
          ))}
          <div style={{ position:'relative' }}
            onMouseEnter={e => { const d = e.currentTarget.querySelector('.intel-drop'); if(d) { d.style.opacity='1'; d.style.transform='translateX(-50%) translateY(0)'; d.style.pointerEvents='auto' } }}
            onMouseLeave={e => { const d = e.currentTarget.querySelector('.intel-drop'); if(d) { d.style.opacity='0'; d.style.transform='translateX(-50%) translateY(-6px)'; d.style.pointerEvents='none' } }}>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:C.body, padding:'6px 14px', borderRadius:4, transition:'all .15s', display:'flex', alignItems:'center', gap:4 }}
              onMouseEnter={e => { e.currentTarget.style.color=C.ink; e.currentTarget.style.background=C.alt }}
              onMouseLeave={e => { e.currentTarget.style.color=C.body; e.currentTarget.style.background='none' }}>
              Industry Intelligence
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div className="intel-drop" style={{ position:'absolute', top:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%) translateY(-6px)', background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, padding:'6px', minWidth:210, zIndex:300, boxShadow:'0 8px 32px rgba(28,43,31,0.12)', opacity:0, pointerEvents:'none', transition:'opacity .2s, transform .2s' }}>
              {[
                { label:'CA Trust Store', path:'/ca-trust-explorer', desc:'6,200+ root & intermediate CAs' },
                { label:'CAB Forum',       path:'/cab-forum',         desc:'Ballots, timelines & compliance' },
                { label:'PKI Hub',         path:'/pki-hub',           desc:'Standards bodies & PQC tracker' },
                { label:'Trust Passport',  path:'/trust-passport',    desc:'Is this site safe? Time-based trust' },
              ].map(item => (
                <button key={item.path} onClick={() => nav(item.path)}
                  style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:F, padding:'8px 12px', borderRadius:6, transition:'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background=C.alt}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:11, color:C.faint }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </nav>}

        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          {!isMobile && <button onClick={() => nav('/auth')}
            style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, color:C.body, padding:'7px 14px', borderRadius:4, transition:'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color=C.ink}
            onMouseLeave={e => e.currentTarget.style.color=C.body}>
            Sign in
          </button>}
          <button onClick={() => nav('/auth')}
            style={{ background:C.sienna, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:700, color:'white', padding:'8px 20px', borderRadius:4, transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#9E3709'}
            onMouseLeave={e => e.currentTarget.style.background=C.sienna}>
            Get started
          </button>
        </div>
      </header>

      {/* ── HERO — dark forest ── */}
      <section style={{ background:C.dark, padding:`clamp(80px,10vw,130px) clamp(20px,5vw,48px) clamp(70px,9vw,110px)`, position:'relative', overflow:'hidden' }}>
        {/* Subtle dot grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(82,183,136,0.15) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, right:0, width:480, height:480, background:'radial-gradient(ellipse 60% 60% at 100% 0%, rgba(82,183,136,0.1) 0%, transparent 70%)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?48:72, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, border:'1px solid rgba(82,183,136,0.3)', borderRadius:4, padding:'5px 12px', marginBottom:32, background:'rgba(82,183,136,0.06)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.greenLt, animation:'blink 2.4s ease infinite' }}/>
                <span style={{ fontSize:11, fontWeight:600, color:C.greenLt, fontFamily:MONO }}>RFC 8555 · CA/B Forum Compliant · PQC Intelligence</span>
              </div>

              <h1 style={{ fontSize:`clamp(40px,5.5vw,72px)`, fontWeight:700, letterSpacing:'-2px', lineHeight:1.06, color:'rgba(245,240,232,0.96)', marginBottom:22 }}>
                Certificate<br/>
                <span style={{ color:C.sienna }}>lifecycle</span><br/>
                management.
              </h1>

              <p style={{ fontSize:16.5, color:'rgba(245,240,232,0.45)', lineHeight:1.85, marginBottom:36, maxWidth:420 }}>
                Issue, validate, deploy and auto-renew SSL/TLS certificates — with a persistent agent, DNS automation, AES-256 key vault, CA/B Forum compliance, and the industry's deepest PKI intelligence built in.
              </p>

              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:44 }}>
                <Btn label="Start managing certs" onClick={() => nav('/auth')} primary/>
                <button onClick={() => nav('/pricing')}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:600, fontSize:14, padding:'11px 26px', borderRadius:4, cursor:'pointer', background:'transparent', border:'1.5px solid rgba(245,240,232,0.2)', color:'rgba(245,240,232,0.6)', transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.4)'; e.currentTarget.style.color='rgba(245,240,232,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.2)'; e.currentTarget.style.color='rgba(245,240,232,0.6)' }}>
                  View pricing
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, borderTop:'1px solid rgba(245,240,232,0.08)', paddingTop:28 }}>
                {[
                  { val: certCount ? `${count.toLocaleString()}+` : '—', label:'Certs managed' },
                  { val:'99.9%', label:'Renewal success' },
                  { val:'12', label:'PKI bodies tracked' },
                ].map((m, i) => (
                  <div key={m.label} style={{ paddingLeft:i>0?24:0, borderLeft:i>0?'1px solid rgba(245,240,232,0.08)':'none', marginLeft:i>0?24:0 }}>
                    <div style={{ fontSize:22, fontWeight:700, color:C.sienna, fontFamily:MONO, letterSpacing:'-0.5px', marginBottom:4 }}>{m.val}</div>
                    <div style={{ fontSize:11.5, color:'rgba(245,240,232,0.3)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position:'relative' }}>
              <Terminal title="sslvault-agent · prod-server-01" lines={[
                { prompt:'›', text:'[21:05:12] Checking for pending jobs...', c:'rgba(255,255,255,0.2)' },
                { prompt:'›', text:'[21:05:13] Job received: renew · easysecurity.in', c:'rgba(82,183,136,0.9)' },
                { text:'↳ DNS provider: Cloudflare', c:'rgba(255,255,255,0.32)', indent:true },
                { text:'↳ Adding TXT _acme-challenge...', c:'rgba(255,255,255,0.28)', indent:true },
                { prompt:'›', text:'[21:05:15] DNS propagated · DCV validated ✓', c:'rgba(82,183,136,0.85)' },
                { prompt:'›', text:'[21:05:16] Cert issued · RapidSSL TLS RSA CA 2022', c:'rgba(82,183,136,0.85)' },
                { text:'↳ CN=easysecurity.in  valid 180d  grade A+', c:'rgba(255,255,255,0.28)', indent:true },
                { prompt:'›', text:'[21:05:17] nginx -t OK · systemctl reload nginx ✓', c:'rgba(82,183,136,0.85)' },
                { prompt:'›', text:'[21:05:18] CertVault: AES-256-GCM encrypted ✓', c:'rgba(193,68,14,0.85)' },
                { prompt:'›', text:'[21:05:18] ✓ Complete · next run: 21:10:18', c:'rgba(82,183,136,0.9)' },
              ]}/>
              {!isMobile && (
                <div style={{ position:'absolute', bottom:-18, right:-14, background:C.dark2, border:`1px solid rgba(82,183,136,0.25)`, borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:C.greenLt }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'rgba(245,240,232,0.75)', fontFamily:MONO }}>easysecurity.in</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.greenLt, background:'rgba(82,183,136,0.1)', border:'1px solid rgba(82,183,136,0.2)', borderRadius:3, padding:'1px 7px', fontFamily:MONO }}>A+</span>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(245,240,232,0.28)', marginTop:3, fontFamily:MONO }}>cert valid · 196d · auto-renew ✓</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:C.dark2, borderTop:`1px solid rgba(255,255,255,0.06)`, borderBottom:`3px solid ${C.sienna}`, overflow:'hidden', padding:'9px 0' }}>
        <div style={{ display:'flex', overflow:'hidden', maskImage:'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div style={{ display:'flex', gap:48, flexShrink:0, animation:'ticker 36s linear infinite', whiteSpace:'nowrap' }}>
            {[...TICKER,...TICKER].map((p,i) => (
              <span key={i} style={{ fontSize:11, fontWeight:600, color:'rgba(245,240,232,0.4)', letterSpacing:'0.05em', fontFamily:MONO }}>
                <span style={{ color:C.sienna, marginRight:8 }}>◆</span>{p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLATFORM OVERVIEW ── */}
      <section id="platform" style={{ background:C.page, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'flex-start', marginBottom:56 }}>
              <div>
                <Eyebrow>What SSLVault does</Eyebrow>
                <H2 style={{ marginBottom:16 }}>The complete certificate lifecycle — fully automated.</H2>
                <Body>From initial CSR generation through DNS validation, installation, monitoring, and renewal — SSLVault handles every step. Connect once, manage forever.</Body>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { n:'01', t:'Issue',   d:'Submit to RapidSSL via ACME v2. DNS-01 auto-validated via your provider API.',        color:C.sienna },
                  { n:'02', t:'Install', d:'Agent deploys to Nginx/Apache. cPanel UAPI install. Zero SSH after setup.',            color:C.green  },
                  { n:'03', t:'Monitor', d:'Expiry tracking, health scoring A–F, CT log abuse detection, CA/B Forum compliance.', color:C.green  },
                  { n:'04', t:'Renew',   d:'Auto-renews 30 days before expiry. New cert deployed before old one expires.',        color:C.sienna },
                ].map((s,idx) => (
                  <div key={s.n} style={{ display:'flex', gap:16, paddingBottom:20, borderLeft:`2px solid ${idx<3?C.line:'transparent'}`, paddingLeft:20, marginLeft:12, position:'relative' }}>
                    <div style={{ position:'absolute', left:-9, top:0, width:18, height:18, borderRadius:'50%', background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'white', fontFamily:MONO, flexShrink:0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.t}</div>
                      <div style={{ fontSize:12.5, color:C.body, lineHeight:1.65 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
          <FadeUp>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:C.faint, letterSpacing:'0.04em', fontFamily:MONO, marginBottom:12 }}>Certificate inventory — live expiry, health grade, auto-renew status</div>
              <InventoryMockup/>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section id="features" style={{ background:C.alt, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <Eyebrow>All capabilities</Eyebrow>
              <H2 style={{ maxWidth:540, margin:'8px auto 14px' }}>Every feature a PKI team needs.</H2>
              <Body style={{ maxWidth:480, margin:'0 auto' }}>Eight core capability areas — built, not bolted on.</Body>
            </div>
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>
            {[
              { icon:'⚡', color:C.sienna, title:'Certificate issuance', specs:['DV, OV, EV, Wildcard, SAN','RapidSSL · DigiCert trust chain','ACME v2 · RFC 8555','Issued in < 5 minutes'], badge:'ACME v2' },
              { icon:'🤖', color:C.green, title:'Persistent agent', specs:['systemd daemon · polls every 5 min','Nginx + Apache auto-detect','Config test before reload','Outbound HTTPS only — no firewall changes'], badge:'systemd' },
              { icon:'🌐', color:C.green, title:'DNS automation', specs:['Cloudflare · Vercel · Route53','Namecheap · GoDaddy · DigitalOcean','Auto TXT/CNAME challenge','Cleanup after DCV completes'], badge:'DNS-01' },
              { icon:'🏛', color:C.green, title:'cPanel install', specs:['UAPI-based installation','No SSH or agent required','API token auth','Auto-renew via cPanel'], badge:'UAPI' },
              { icon:'🔐', color:C.sienna, title:'CertVault', specs:['AES-256-GCM · envelope encryption','Password re-auth before reveal','30-day rotation archive','Immutable audit log → CSV'], badge:'AES-256' },
              { icon:'📋', color:C.sienna, title:'47-day readiness', specs:['Scores every cert 0–100','200d → 100d → 47d mandate timeline','Per-cert automation checklist','Fleet-wide compliance report'], badge:'CA/B 2026' },
              { icon:'🔍', color:C.green, title:'Discovery & monitoring', specs:['CT log scan via crt.sh','CT abuse monitor — unknown CAs','SSL health score A+ to F','HSTS · CAA · TLS 1.3 checks'], badge:'CT Logs' },
              { icon:'📈', color:C.green, title:'CA intelligence', specs:['DigiCert CertCentral sync','Sectigo SCM portfolio sync','Shadow IT detection','Policy engine · fleet compliance'], badge:'Multi-CA' },
              { icon:'🏛', color:C.green, title:'Industry Intelligence', specs:['6,200+ CAs from CCADB live','CAB Forum ballot tracker','12 PKI bodies deep-dive','PQC migration tracker (ML-KEM, ML-DSA)'], badge:'PKI Hub' },
              { icon:'🔬', color:C.sienna, title:'CA Trust Store', specs:['Every root & intermediate CA indexed','PKI Trust Score per certificate','Filter by trust store · algorithm · region','CSV export · PEM download'], badge:'CCADB' },
            ].map(f => (
              <FadeUp key={f.title}>
                <Panel style={{ borderTop:`3px solid ${f.color}`, height:'100%' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ fontSize:22 }}>{f.icon}</div>
                    <Tag color={f.color} bg={f.color+'12'} border={f.color+'30'}>{f.badge}</Tag>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>{f.title}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {f.specs.map(s => (
                      <div key={s} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2.5" style={{ flexShrink:0, marginTop:2 }}><path d="M20 6L9 17l-5-5"/></svg>
                        <span style={{ fontSize:12.5, color:C.body, lineHeight:1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTVAULT + READINESS ── */}
      <section style={{ background:C.page, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <Eyebrow color={C.sienna}>Security controls</Eyebrow>
              <H2 style={{ maxWidth:560, margin:'8px auto 14px' }}>Enterprise PKI controls. Not an afterthought.</H2>
              <Body style={{ maxWidth:500, margin:'0 auto' }}>CertVault and 47-Day Readiness are built into every account — not a paid add-on.</Body>
            </div>
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:24 }}>
            <FadeUp>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.faint, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>🔐 AES-256-GCM private key vault</div>
                <CertVaultMockup/>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.faint, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>📋 CA/B Forum compliance scoring</div>
                <ReadinessMockup/>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── SECURITY SPECS ── */}
      <section id="security" style={{ background:C.alt, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'flex-start', marginBottom:52 }}>
              <div>
                <Eyebrow>Security specifications</Eyebrow>
                <H2 style={{ marginBottom:16 }}>Open standards throughout. No black boxes.</H2>
                <Body style={{ marginBottom:24 }}>Every layer of SSLVault is built on auditable open standards. RFC 8555 for issuance, AES-256-GCM for storage, CT logs for transparency.</Body>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['RFC 8555','AES-256-GCM','TLS 1.3','CT Logs','CAA Records','HSTS','SHA-256'].map(t => (
                    <Tag key={t} color={C.green} bg={C.greenBg} border={C.greenBd}>{t}</Tag>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:10 }}>
                {[
                  { spec:'AES-256-GCM',   title:'Key encryption',    color:C.sienna, desc:'DEK wrapped with KEK. Keys never in plaintext.' },
                  { spec:'RFC 8555',       title:'ACME v2',           color:C.green,  desc:'DNS-01 challenge. Auto-validated via provider API.' },
                  { spec:'CT monitoring',  title:'Cert transparency', color:C.green,  desc:'crt.sh queries for every cert ever issued.' },
                  { spec:'CAA + HSTS',     title:'DNS security',      color:C.amber,  desc:'CAA prevents unauthorised CA issuance.' },
                  { spec:'TLS 1.2 / 1.3', title:'TLS posture',       color:C.green,  desc:'ECDHE + PFS. HSTS max-age verified.' },
                  { spec:'Append-only',    title:'Audit trail',       color:C.red,    desc:'Every access logged. CSV export for SOC 2.' },
                ].map(s => (
                  <div key={s.spec} style={{ background:C.surface, border:`1px solid ${C.line}`, borderLeft:`3px solid ${s.color}`, borderRadius:6, padding:'14px' }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:s.color, fontFamily:MONO, letterSpacing:'0.05em', marginBottom:5 }}>{s.spec}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:4 }}>{s.title}</div>
                    <div style={{ fontSize:11.5, color:C.body, lineHeight:1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div style={{ background:C.surface, border:`1px solid ${C.line}`, borderRadius:8, padding:'28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.sienna, animation:'blink 2s ease infinite' }}/>
                <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>CA/B Forum maximum validity mandate — action required now</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:isMobile?20:0 }}>
                {[
                  { date:'March 15, 2026', limit:'200 days', status:'IMMINENT', color:C.sienna, action:'Certificates issued with validity > 200 days will be rejected by all major browsers. Audit your fleet immediately.' },
                  { date:'March 15, 2027', limit:'100 days', status:'UPCOMING', color:C.amber,  action:'Manual renewal every 100 days is operationally unsustainable. Automation becomes a hard requirement.' },
                  { date:'March 15, 2029', limit:'47 days',  status:'PLANNED',  color:C.green,  action:"Full zero-touch automation required. SSLVault's agent + DNS automation handles this end-to-end today." },
                ].map((m, i) => (
                  <div key={m.date} style={{ padding:isMobile?'16px 0':'0 28px', borderLeft:!isMobile&&i>0?`1px solid ${C.line}`:'none' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:m.color, fontFamily:MONO, letterSpacing:'1px', marginBottom:8 }}>{m.status}</div>
                    <div style={{ fontSize:11, color:C.faint, fontFamily:MONO, marginBottom:4 }}>{m.date}</div>
                    <div style={{ fontSize:34, fontWeight:700, color:m.color, fontFamily:MONO, letterSpacing:'-1.5px', marginBottom:10 }}>{m.limit}</div>
                    <div style={{ fontSize:13, color:C.body, lineHeight:1.7 }}>{m.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── DNS PROVIDERS ── */}
      <section style={{ background:C.page, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'center' }}>
            <FadeUp>
              <div>
                <Eyebrow>DNS automation</Eyebrow>
                <H2 style={{ marginBottom:16 }}>Automated DNS-01 challenge across every major provider.</H2>
                <Body style={{ marginBottom:28 }}>When issuing or renewing, SSLVault calls your DNS provider API to add the ACME challenge record, polls for propagation, validates, then cleans up — fully automatic, zero copy-paste.</Body>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:6 }}>
                  {[
                    ['Cloudflare','API Token · Zone:DNS:Edit'],
                    ['Vercel','Access Token · Settings → Tokens'],
                    ['Route53','AWS IAM · Route53 write access'],
                    ['Namecheap','API Key · IP whitelist required'],
                    ['GoDaddy','API Key + Secret'],
                    ['DigitalOcean','Personal Access Token'],
                    ['Plesk','XML API'],
                    ['+ more','Contact us'],
                  ].map(([name, note]) => (
                    <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:C.surface, border:`1px solid ${C.line}`, borderRadius:6 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:C.green, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:C.ink }}>{name}</div>
                        <div style={{ fontSize:10.5, color:C.faint, fontFamily:MONO }}>{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <Terminal title="dns-provider · Cloudflare API" lines={[
                { prompt:'#', text:' DCV for renewal · api.myshop.com', c:'rgba(255,255,255,0.18)' },
                { prompt:'›', text:'Resolving zone: myshop.com', c:'rgba(255,255,255,0.4)' },
                { prompt:'›', text:'PUT /zones/{id}/dns_records', c:'rgba(82,183,136,0.9)' },
                { text:'↳ type:TXT  name:_acme-challenge', c:'rgba(255,255,255,0.32)', indent:true },
                { text:'↳ content:xK3-mP9_aQ2rZ...  ttl:60', c:'rgba(255,255,255,0.28)', indent:true },
                { prompt:'›', text:'Record created · TTL 60s', c:'rgba(82,183,136,0.85)' },
                { prompt:'›', text:'Polling propagation...', c:'rgba(255,255,255,0.25)' },
                { prompt:'›', text:'Propagated in 4.2s ✓', c:'rgba(82,183,136,0.85)' },
                { prompt:'›', text:'ACME challenge: verified ✓', c:'rgba(82,183,136,0.85)' },
                { prompt:'›', text:'DELETE /zones/{id}/dns_records/{rid}', c:'rgba(255,255,255,0.3)' },
                { prompt:'›', text:'Challenge record removed ✓', c:'rgba(82,183,136,0.9)' },
              ]}/>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section style={{ background:C.alt, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <Eyebrow>How it works</Eyebrow>
              <H2 style={{ maxWidth:520, margin:'8px auto 14px' }}>From CSR to live HTTPS in one automated pipeline.</H2>
              <Body style={{ maxWidth:460, margin:'0 auto' }}>SSLVault orchestrates every step across ACME, your DNS provider, and your web server.</Body>
            </div>
          </FadeUp>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:5},1fr)`, gap:isMobile?12:0, marginBottom:52, alignItems:'center' }}>
              {[
                { n:'01', icon:'🖥', title:'Issue request', desc:'Select domain + cert type. SSLVault generates CSR.' },
                null,
                { n:'02', icon:'🌐', title:'Auto DCV', desc:'DNS provider API adds ACME challenge. Auto-validated.' },
                null,
                { n:'03', icon:'🏛', title:'CA issues cert', desc:'RapidSSL signs cert. Stored encrypted in CertVault.' },
              ].map((s, i) => {
                if (!s) return (
                  <div key={i} style={{ display:'flex', justifyContent:'center', alignItems:'center' }}>
                    <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
                      <line x1="0" y1="6" x2="26" y2="6" stroke={C.green} strokeWidth="1.5" strokeDasharray="3 2"/>
                      <path d="M24 2l6 4-6 4" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )
                return (
                  <Panel key={s.n} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.green, fontFamily:MONO, marginBottom:6 }}>{s.n}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:6 }}>{s.title}</div>
                    <div style={{ fontSize:11.5, color:C.body, lineHeight:1.6 }}>{s.desc}</div>
                  </Panel>
                )
              })}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:5},1fr)`, gap:isMobile?12:0, alignItems:'center' }}>
              {[
                null,
                { n:'05', icon:'🔄', title:'Lifecycle loop', desc:'Monitors expiry. Auto-renews 30 days before. Zero manual steps.' },
                null,
                { n:'04', icon:'⚡', title:'Auto-install', desc:'Agent deploys to Nginx/Apache. Config tested. Service reloaded.' },
                null,
              ].map((s, i) => {
                if (!s) return <div key={i}/>
                return (
                  <Panel key={s.n} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:24, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.green, fontFamily:MONO, marginBottom:6 }}>{s.n}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:6 }}>{s.title}</div>
                    <div style={{ fontSize:11.5, color:C.body, lineHeight:1.6 }}>{s.desc}</div>
                  </Panel>
                )
              })}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── INDUSTRY INTELLIGENCE — dark forest ── */}
      <section style={{ background:C.dark, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`3px solid ${C.greenLt}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.greenLt, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Industry Intelligence</div>
              <h2 style={{ fontSize:`clamp(26px,3.5vw,40px)`, fontWeight:700, letterSpacing:'-0.8px', lineHeight:1.15, color:'rgba(245,240,232,0.95)', marginBottom:14, maxWidth:620, margin:'8px auto 14px' }}>
                The deepest PKI intelligence platform on the web.
              </h2>
              <p style={{ fontSize:15, color:'rgba(245,240,232,0.38)', lineHeight:1.7, maxWidth:520, margin:'0 auto' }}>
                Not just a certificate manager — a living knowledge base covering every CA, standard, governance body, and cryptographic transition shaping the industry.
              </p>
            </div>
          </FadeUp>

          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:16, marginBottom:20 }}>
            {[
              { icon:'🏛', color:C.greenLt, title:'CA Trust Store', sub:'6,200+ root & intermediate CAs', desc:'Every CA in Chrome, Firefox, Apple, and Microsoft trust stores — live from CCADB. Search by operator, algorithm, region. PKI Trust Score per cert. PEM download.', badge:'CCADB Live', path:'/ca-trust-explorer', stats:[['6,200+','CAs indexed'],['4','Trust stores'],['Daily','CCADB sync']] },
              { icon:'⚖️', color:C.sienna, title:'CAB Forum Intelligence', sub:'Ballots, timelines & compliance', desc:'Every CAB Forum ballot tracked with plain-English summaries. 47-day countdown, SC081v3 compliance deadlines, 5 working groups, full PKI history timeline from 2005.', badge:'Live sync', path:'/cab-forum', stats:[['47-day','2029 mandate'],['5','Working groups'],['Real-time','Ballot feed']] },
              { icon:'🌍', color:C.greenLt, title:'Global PKI Hub', sub:'12 bodies · 22 standards · PQC tracker', desc:'CAB Forum, ETSI ESI, NIST, IETF, APKIC, eIDAS 2.0, PKI Consortium, CSC, FIDO, WebTrust, CCADB, ITU-T — each with deep-dive pages, standards library, and PQC migration status.', badge:'PQC Ready', path:'/pki-hub', stats:[['12','PKI bodies'],['3','NIST PQC finals'],['2026','Amsterdam conf.']] },
            ].map(item => (
              <FadeUp key={item.title}>
                <div onClick={() => nav(item.path)} style={{ background:'rgba(245,240,232,0.04)', border:'1px solid rgba(245,240,232,0.1)', borderRadius:8, padding:'24px', cursor:'pointer', transition:'border-color .15s, background .15s', height:'100%', display:'flex', flexDirection:'column', gap:16 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.18)'; e.currentTarget.style.background='rgba(245,240,232,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.1)'; e.currentTarget.style.background='rgba(245,240,232,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div style={{ fontSize:28 }}>{item.icon}</div>
                    <span style={{ fontSize:9, fontWeight:700, color:item.color, background:item.color+'18', border:`1px solid ${item.color}30`, borderRadius:3, padding:'3px 9px', fontFamily:MONO, letterSpacing:'0.04em' }}>{item.badge}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'rgba(245,240,232,0.88)', marginBottom:4 }}>{item.title}</div>
                    <div style={{ fontSize:11, color:item.color, fontWeight:600, fontFamily:MONO, marginBottom:10 }}>{item.sub}</div>
                    <div style={{ fontSize:12.5, color:'rgba(245,240,232,0.38)', lineHeight:1.7 }}>{item.desc}</div>
                  </div>
                  <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(245,240,232,0.06)', paddingTop:14, marginTop:'auto' }}>
                    {item.stats.map(([val, label], i) => (
                      <div key={label} style={{ flex:1, paddingLeft:i>0?12:0, borderLeft:i>0?'1px solid rgba(245,240,232,0.06)':'none', marginLeft:i>0?12:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'rgba(245,240,232,0.75)', fontFamily:MONO, marginBottom:2 }}>{val}</div>
                        <div style={{ fontSize:10, color:'rgba(245,240,232,0.28)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:item.color }}>
                    Explore <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <div style={{ background:'rgba(82,183,136,0.05)', border:'1px solid rgba(82,183,136,0.15)', borderRadius:8, padding:'20px 24px', display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div style={{ fontSize:28, flexShrink:0 }}>⚛️</div>
              <div style={{ flex:1, minWidth:260 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'rgba(245,240,232,0.85)', marginBottom:5 }}>Post-Quantum Cryptography migration tracker — live</div>
                <div style={{ fontSize:12, color:'rgba(245,240,232,0.38)', lineHeight:1.7 }}>NIST finalised ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) in August 2024. The PKI Hub tracks every body's PQC readiness — from IETF LAMPS WG certificate profiles to ETSI EN 319 updates — so you know exactly where the industry stands.</div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
                {[['ML-KEM','FIPS 203'],['ML-DSA','FIPS 204'],['SLH-DSA','FIPS 205']].map(([alg, fips]) => (
                  <div key={alg} style={{ background:'rgba(82,183,136,0.1)', border:'1px solid rgba(82,183,136,0.2)', borderRadius:6, padding:'7px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.greenLt, fontFamily:MONO }}>{alg}</div>
                    <div style={{ fontSize:10, color:'rgba(245,240,232,0.35)', marginTop:2 }}>{fips}</div>
                  </div>
                ))}
                <button onClick={() => nav('/pki-hub')} style={{ background:C.greenLt, border:'none', borderRadius:6, padding:'9px 16px', fontSize:12, fontWeight:700, color:C.dark, cursor:'pointer', fontFamily:F }}>
                  View PQC tracker →
                </button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CERTBIND — dark ── */}
      <section style={{ background:C.dark2, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`3px solid ${C.sienna}`, position:'relative', overflow:'hidden' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <FadeUp>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(220,38,38,0.9)', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:3, padding:'3px 10px' }}>Industry first</span>
              <span style={{ fontSize:11, color:'rgba(245,240,232,0.25)', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO }}>No other CLM vendor has built this</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'center', marginBottom:56 }}>
              <div>
                <h2 style={{ fontSize:`clamp(28px,4.5vw,52px)`, fontWeight:700, letterSpacing:'-1.5px', lineHeight:1.08, color:'rgba(245,240,232,0.95)', marginBottom:20 }}>
                  Every other CLM tells you what cert you issued.<br/>
                  <span style={{ color:C.sienna }}>SSLVault proves what's actually running.</span>
                </h2>
                <p style={{ fontSize:16, color:'rgba(245,240,232,0.42)', lineHeight:1.85, marginBottom:28, maxWidth:480 }}>
                  A certificate can be valid. HTTPS can be green. Your CLM can show everything healthy. And your server can be serving a mismatched key, a rogue cert, or half a load balancer pool — and nobody knows.
                </p>
                <p style={{ fontSize:16, color:'rgba(245,240,232,0.42)', lineHeight:1.85, marginBottom:32, maxWidth:480 }}>
                  CertBind closes that gap with continuous, cryptographic proof — every 5 minutes.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <Btn label="See CertBind" onClick={()=>nav('/auth')} primary/>
                  <button onClick={()=>nav('/knowledge-base')}
                    style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:600, fontSize:14, padding:'11px 26px', borderRadius:4, cursor:'pointer', background:'transparent', border:'1.5px solid rgba(245,240,232,0.2)', color:'rgba(245,240,232,0.6)', transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.4)'; e.currentTarget.style.color='rgba(245,240,232,0.9)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.2)'; e.currentTarget.style.color='rgba(245,240,232,0.6)' }}>
                    Read how it works
                  </button>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ background:'rgba(245,240,232,0.04)', border:'1px solid rgba(245,240,232,0.1)', borderRadius:8, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16 }}>🔗</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'rgba(245,240,232,0.85)', fontFamily:MONO }}>CertBind</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.greenLt, background:'rgba(82,183,136,0.1)', border:'1px solid rgba(82,183,136,0.2)', borderRadius:3, padding:'2px 8px', fontFamily:MONO }}>ACTIVE</span>
                  </div>
                  <span style={{ fontSize:11, color:'rgba(245,240,232,0.28)', fontFamily:MONO }}>4/4 domains bound</span>
                </div>
                {[
                  { n:'01', label:'Key-Cert Binding Proof',  status:'VERIFIED',  color:C.greenLt, desc:'Agent signs nonce · key ↔ cert proven cryptographically' },
                  { n:'02', label:'Live TLS Fingerprint',     status:'MATCH',     color:C.greenLt, desc:'SHA-256 of served cert matches issued cert on every poll' },
                  { n:'03', label:'Chain Integrity',          status:'CLEAN',     color:C.greenLt, desc:'No unexpected intermediates · no SSL inspection proxy' },
                  { n:'04', label:'Multi-Node Consistency',   status:'7/7 NODES', color:C.greenLt, desc:'All load balancer nodes serving correct certificate' },
                ].map(l => (
                  <div key={l.n} style={{ background:'rgba(245,240,232,0.03)', border:'1px solid rgba(245,240,232,0.08)', borderRadius:6, padding:'12px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:24, height:24, borderRadius:4, background:'rgba(82,183,136,0.1)', border:'1px solid rgba(82,183,136,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:C.greenLt, fontFamily:MONO, flexShrink:0 }}>{l.n}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'rgba(245,240,232,0.8)' }}>{l.label}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:l.color, fontFamily:MONO }}>{l.status}</span>
                      </div>
                      <div style={{ fontSize:11, color:'rgba(245,240,232,0.28)', fontFamily:MONO }}>{l.desc}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.18)', borderRadius:6, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>🚨</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(220,38,38,0.9)', marginBottom:3 }}>What CertBind catches that others miss</div>
                    <div style={{ fontSize:11, color:'rgba(245,240,232,0.35)', fontFamily:MONO, lineHeight:1.7 }}>key_mismatch · cert_mismatch · chain_anomaly · partial_deploy</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={80}>
            <div style={{ borderTop:'1px solid rgba(245,240,232,0.08)', paddingTop:40 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(245,240,232,0.3)', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:24, textAlign:'center' }}>Real-world failures CertBind prevents</div>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:3},1fr)`, gap:12 }}>
                {[
                  { status:'key_mismatch', color:'rgba(220,38,38,0.9)', bg:'rgba(220,38,38,0.05)', bd:'rgba(220,38,38,0.15)', title:'The Zombie Certificate', scenario:'Nginx renewed cert automatically. But a config change six months ago redirected nginx to a backup key from a previous issuance. CLM shows green. Browser shows valid. The cert and key are from different issuances.', impact:'$11M average PKI outage cost · undetected for months in typical orgs' },
                  { status:'partial_deploy', color:'rgba(217,119,6,0.9)', bg:'rgba(217,119,6,0.05)', bd:'rgba(217,119,6,0.15)', title:'The Phantom Install', scenario:'New cert deployed to 4 of 7 load balancer nodes. The other 3 are still running the cert that expires in 4 days. CLM shows the cert was issued and installed. It has no idea about the other 3 nodes.', impact:'#1 cause of PKI-related outages in enterprises · usually found by customers first' },
                  { status:'chain_anomaly', color:'rgba(124,58,237,0.9)', bg:'rgba(124,58,237,0.05)', bd:'rgba(124,58,237,0.15)', title:'The Silent Swap', scenario:"Enterprise Palo Alto proxy is SSL-inspecting traffic to your API server. Every TLS connection is being decrypted, inspected, and re-encrypted with the proxy's internal CA. Your CLM doesn't know. Your monitoring doesn't know.", impact:'Affects every enterprise with SSL inspection · invisible to all other CLM tools' },
                ].map(s => (
                  <div key={s.title} style={{ background:s.bg, border:`1px solid ${s.bd}`, borderRadius:8, padding:'20px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:s.color, fontFamily:MONO, letterSpacing:'0.5px', marginBottom:10 }}>{s.status.toUpperCase()}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'rgba(245,240,232,0.9)', marginBottom:10 }}>{s.title}</div>
                    <div style={{ fontSize:12.5, color:'rgba(245,240,232,0.45)', lineHeight:1.75, marginBottom:12 }}>{s.scenario}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:s.color, lineHeight:1.5 }}>{s.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── MISSION — cream ── */}
      <section style={{ background:C.page, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.line}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'flex-start' }}>
            <FadeUp>
              <div>
                <Eyebrow>Why we built this</Eyebrow>
                <H2 style={{ marginBottom:16 }}>PKI expertise shouldn't require a $250k contract.</H2>
                <Body style={{ marginBottom:24 }}>SSLVault is built by a Certified PKI Specialist with deep CA industry experience. The same automation enterprise teams pay hundreds of thousands for — available without the procurement cycle.</Body>
                <Body style={{ marginBottom:32 }}>As CA/B Forum mandates tighten (200d → 100d → 47d between 2026–2029), full automation becomes non-negotiable. SSLVault is built for what's coming.</Body>
                <div style={{ display:'flex', gap:10 }}>
                  <Btn label="Get started" onClick={() => nav('/auth')} primary/>
                  <Btn label="View pricing" onClick={() => nav('/pricing')} outline/>
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={80}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { name:'Venafi TLS Protect', price:'$250k+/yr', notes:'Enterprise only · No cert issuance · No cPanel', highlight:false },
                  { name:'Keyfactor Command',  price:'$75–200k/yr', notes:'Mid-market · Complex setup · No free tier', highlight:false },
                  { name:'SSLVault CLM',       price:'Partner rates', notes:'Full CLM · Agent + cPanel + DNS · All cert types', highlight:true },
                ].map(c => (
                  <div key={c.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:c.highlight?C.siennaBg:C.surface, border:`1px solid ${c.highlight?C.siennaBd:C.line}`, borderRadius:6 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:c.highlight?C.sienna:C.ink }}>{c.name}</div>
                      <div style={{ fontSize:11.5, color:C.faint, marginTop:3 }}>{c.notes}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:c.highlight?C.sienna:C.faint, fontFamily:MONO, whiteSpace:'nowrap' }}>{c.price}</div>
                  </div>
                ))}
                <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:6 }}>
                  {[
                    ['DigiCert','Trust chain · 99.9% browser'],
                    ['RapidSSL','CA partner · wholesale pricing'],
                    ['RFC 8555','ACME v2 · no lock-in'],
                    ['AES-256','Military-grade key storage'],
                    ['GDPR','Netherlands-based PKI engineer 🇳🇱'],
                    ['No ads','No tracking · no reselling'],
                  ].map(([val, sub]) => (
                    <div key={val} style={{ display:'flex', gap:10, padding:'10px 12px', background:C.surface, border:`1px solid ${C.line}`, borderRadius:6, alignItems:'center' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.green, fontFamily:MONO, minWidth:70 }}>{val}</div>
                      <div style={{ fontSize:11, color:C.faint, lineHeight:1.4 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA — forest ── */}
      <section style={{ background:C.dark, padding:`clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid rgba(245,240,232,0.06)` }}>
        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center' }}>
          <FadeUp>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, border:`1px solid ${C.siennaBd}40`, borderRadius:4, padding:'6px 14px', marginBottom:28, background:`${C.sienna}10` }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:C.sienna, animation:'blink 2.4s ease infinite' }}/>
              <span style={{ fontSize:11.5, fontWeight:600, color:C.sienna, fontFamily:MONO }}>Production-ready · RFC 8555 · CA/B Forum 2026 compliant</span>
            </div>
            <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:700, letterSpacing:'-1.2px', lineHeight:1.12, color:'rgba(245,240,232,0.95)', marginBottom:18 }}>
              Ready to automate your<br/><span style={{ color:C.sienna }}>certificate lifecycle?</span>
            </h2>
            <p style={{ fontSize:15, color:'rgba(245,240,232,0.42)', lineHeight:1.85, maxWidth:460, margin:'0 auto 36px' }}>
              Issue, monitor, and auto-renew SSL certificates across every server with enterprise-grade PKI controls — CertVault, 47-day readiness, and CA intelligence included.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:28 }}>
              <Btn label="Start managing certs" onClick={() => nav('/auth')} primary/>
              <button onClick={() => nav('/pricing')}
                style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:F, fontWeight:600, fontSize:14, padding:'11px 26px', borderRadius:4, cursor:'pointer', background:'transparent', border:'1.5px solid rgba(245,240,232,0.2)', color:'rgba(245,240,232,0.6)', transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.4)'; e.currentTarget.style.color='rgba(245,240,232,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,240,232,0.2)'; e.currentTarget.style.color='rgba(245,240,232,0.6)' }}>
                View pricing
              </button>
            </div>
            <div style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
              {['RapidSSL · DigiCert trust chain','RFC 8555 · AES-256-GCM','CA/B Forum 2026 ready'].map(t => (
                <span key={t} style={{ fontSize:12, color:'rgba(245,240,232,0.3)', display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.greenLt} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  {t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:C.dark2, borderTop:`1px solid rgba(245,240,232,0.06)`, padding:`clamp(48px,6vw,64px) clamp(20px,4vw,48px) clamp(28px,3vw,40px)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:40, paddingBottom:32, borderBottom:'1px solid rgba(245,240,232,0.06)' }}>
            <div style={{ width:28, height:28, background:C.greenLt, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize:15, fontWeight:700, color:'rgba(245,240,232,0.85)' }}>SSLVault</span>
            <span style={{ fontSize:11, color:'rgba(245,240,232,0.25)', fontFamily:MONO, marginLeft:4 }}>PKI-first CLM · Built by a real PKI engineer</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(auto-fill,minmax(150px,1fr))', gap:32, marginBottom:40 }}>
            {[
              { title:'Product', links:[['Pricing',()=>nav('/pricing')],['Get started',()=>nav('/auth')],['Dashboard',()=>nav('/dashboard')]] },
              { title:'Support Resources', links:[['Install Guide',()=>nav('/install')],['Knowledge Base',()=>nav('/knowledge-base')],['CA Intelligence',()=>nav('/ca-intelligence')],['CAA Checker',()=>nav('/caa-check')]] },
              { title:'Industry Intelligence', links:[['CA Trust Store',()=>nav('/ca-trust-explorer')],['CAB Forum',()=>nav('/cab-forum')],['PKI Hub',()=>nav('/pki-hub')],['Trust Passport',()=>nav('/trust-passport')]] },
              { title:'Security', links:[['CertVault','#security'],['47-Day Readiness','#security'],['CT Monitoring','#security'],['Health Scoring','#security']] },
              { title:'Protocol', links:[['RFC 8555 ACME','#security'],['DNS-01 Challenge','#security'],['AES-256-GCM','#security']] },
              { title:'Company', links:[['About',()=>nav('/about')],['Developer',()=>nav('/developer')]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize:11, fontWeight:700, color:C.greenLt, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:MONO, marginBottom:16 }}>{col.title}</div>
                {col.links.map(([l, h]) => (
                  <div key={l} style={{ marginBottom:10 }}>
                    <button onClick={() => typeof h === 'function' ? h() : document.querySelector(h)?.scrollIntoView({ behavior:'smooth' })}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'rgba(245,240,232,0.3)', fontFamily:F, padding:0, transition:'color .15s', textAlign:'left' }}
                      onMouseEnter={e => e.currentTarget.style.color='rgba(245,240,232,0.75)'}
                      onMouseLeave={e => e.currentTarget.style.color='rgba(245,240,232,0.3)'}>
                      {l}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid rgba(245,240,232,0.06)', paddingTop:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <span style={{ fontSize:11, color:'rgba(245,240,232,0.2)', fontFamily:MONO }}>PKI-first CLM · Made with ♥ towards PKI · Built by a real PKI engineer</span>
            <span style={{ fontSize:12, color:'rgba(245,240,232,0.2)' }}>© 2026 SSLVault. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
