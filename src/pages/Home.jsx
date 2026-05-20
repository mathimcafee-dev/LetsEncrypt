// Home.jsx — SSLVault landing page v3
// Security-first · Technical · Enterprise credibility
// Same palette, same fonts, same components — new content hierarchy
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024)
  useEffect(() => {
    const fn = () => { setIsMobile(window.innerWidth < 768); setIsTablet(window.innerWidth < 1024) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile, isTablet }
}

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const C = {
  ink:'#0a0e1a', inkMid:'#111827', inkLt:'#1e293b', navy:'#0f2545',
  teal:'#0ea5e9', tealDk:'#0284c7', tealXl:'#e0f2fe',
  green:'#10b981', amber:'#f59e0b', purple:'#8b5cf6', red:'#ef4444',
  border:'#e2e8f0', borderDk:'rgba(255,255,255,0.08)',
  text:'#0f172a', textMid:'#475569', textLt:'#94a3b8',
  bg:'#f8fafc', white:'#ffffff',
}

// ── Active nav section tracker ───────────────────────────────────────
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const observers = ids.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) setActive(id)
      }, { threshold: 0.3 })
      io.observe(el)
      return io
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])
  return active
}

// ── Hooks ─────────────────────────────────────────────────────────────
function useIn(threshold=0.1) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect() } }, { threshold })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return [ref, v]
}

function FadeUp({ children, delay=0 }) {
  const [ref, v] = useIn()
  return (
    <div ref={ref} style={{ opacity:v?1:0, transform:v?'translateY(0)':'translateY(20px)', transition:`opacity .6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────
function NavLink({ label, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        background:'none', border:'none', cursor:'pointer', fontFamily:F,
        fontSize:13, fontWeight:h?500:400,
        color: h?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.5)',
        transition:'color .15s, font-weight .15s',
        letterSpacing:'-0.01em', padding:'4px 0',
      }}>
      {label}
    </button>
  )
}

function CTA({ label, onClick, variant='primary', size='md' }) {
  const [h, setH] = useState(false)
  const px = size==='sm'?'10px 18px':'12px 24px'
  const fs = size==='sm'?13:14
  if (variant==='primary') return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:7, fontFamily:F, fontWeight:600, fontSize:fs, padding:px, borderRadius:8, border:'none', cursor:'pointer', background:h?C.tealDk:C.teal, color:'white', boxShadow:h?`0 8px 24px ${C.teal}44`:`0 2px 8px ${C.teal}33`, transition:'all .17s' }}>
      {label}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  )
  if (variant==='ghost-dark') return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:7, fontFamily:F, fontWeight:500, fontSize:fs, padding:px, borderRadius:8, cursor:'pointer', border:'1px solid rgba(255,255,255,0.15)', background:h?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)', color:h?'white':'rgba(255,255,255,0.65)', transition:'all .17s' }}>
      {label}
    </button>
  )
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:7, fontFamily:F, fontWeight:500, fontSize:fs, padding:px, borderRadius:8, cursor:'pointer', border:`1px solid ${h?C.teal:C.border}`, background:h?C.tealXl:C.white, color:h?C.tealDk:C.text, transition:'all .17s' }}>
      {label}
    </button>
  )
}

// ── Terminal block — dark code window ──────────────────────────────────
function Terminal({ title='bash', accent='#10b981', children }) {
  return (
    <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', fontFamily:MONO }}>
      <div style={{ background:'#161b22', padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }}/>)}
        </div>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', flex:1, textAlign:'center' }}>{title}</span>
      </div>
      <div style={{ padding:'16px 20px', fontSize:12, lineHeight:1.9 }}>{children}</div>
    </div>
  )
}

function TLine({ prompt='$', cmd, out, color='rgba(255,255,255,0.75)', indent=false }) {
  return (
    <div style={{ marginBottom:2, paddingLeft:indent?16:0 }}>
      {prompt && <span style={{ color:'rgba(255,255,255,0.2)', marginRight:8 }}>{prompt}</span>}
      <span style={{ color }}>{cmd}</span>
      {out && <><br/><span style={{ color:'rgba(255,255,255,0.35)', paddingLeft:16 }}>{out}</span></>}
    </div>
  )
}

// ── UI screenshot mockup — cert inventory ─────────────────────────────
function CertInventoryMockup() {
  const certs = [
    { domain:'easysecurity.in',    days:196, grade:'A+', ca:'RapidSSL',    auto:true,  status:'active'  },
    { domain:'api.myshop.com',     days:18,  grade:'B',  ca:'Sectigo DV',  auto:true,  status:'warning' },
    { domain:'staging.portal.io',  days:3,   grade:'C',  ca:'RapidSSL',    auto:false, status:'critical'},
    { domain:'freecerts.site',     days:196, grade:'A',  ca:"Let's Enc.",  auto:false, status:'active'  },
  ]
  const statusColor = s => s==='active'?C.green:s==='warning'?C.amber:C.red
  const gradeColor  = g => g==='A+'?C.green:g==='A'?C.green:g==='B'?C.amber:C.red
  return (
    <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 20px 60px rgba(15,23,42,0.12)' }}>
      {/* Window bar */}
      <div style={{ background:C.bg, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
        <div style={{ flex:1, background:C.white, borderRadius:5, padding:'4px 10px', fontSize:10.5, color:C.textLt, fontFamily:MONO, border:`1px solid ${C.border}` }}>
          easysecurity.in · Inventory
        </div>
      </div>
      {/* Table header */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 60px 60px 80px 70px 60px', padding:'8px 14px', background:C.bg, borderBottom:`1px solid ${C.border}` }}>
        {['Domain','Days','Grade','CA','Auto','Status'].map(h=>(
          <div key={h} style={{ fontSize:9.5, fontWeight:700, color:C.textLt, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {certs.map((c,i)=>(
        <div key={c.domain} style={{ display:'grid', gridTemplateColumns:'2fr 60px 60px 80px 70px 60px', padding:'9px 14px', borderBottom:i<certs.length-1?`1px solid ${C.border}`:'none', alignItems:'center', background:c.status==='critical'?'#fef2f2':c.status==='warning'?'#fffbeb':C.white }}>
          <span style={{ fontSize:11.5, fontWeight:500, color:C.text, fontFamily:MONO }}>{c.domain}</span>
          <span style={{ fontSize:11, fontWeight:700, color:statusColor(c.status), fontFamily:MONO }}>{c.days}d</span>
          <span style={{ fontSize:11, fontWeight:800, color:gradeColor(c.grade) }}>{c.grade}</span>
          <span style={{ fontSize:10.5, color:C.textMid }}>{c.ca}</span>
          <span style={{ fontSize:10, fontWeight:600, color:c.auto?C.green:C.textLt }}>{c.auto?'✓ ON':'— OFF'}</span>
          <span style={{ fontSize:9.5, fontWeight:700, color:statusColor(c.status), background:statusColor(c.status)+'18', padding:'2px 6px', borderRadius:10 }}>{c.status}</span>
        </div>
      ))}
    </div>
  )
}

// ── KeyLocker UI mockup ───────────────────────────────────────────────
function KeyLockerMockup() {
  return (
    <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 20px 60px rgba(15,23,42,0.12)' }}>
      <div style={{ background:C.bg, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
        <div style={{ flex:1, background:C.white, borderRadius:5, padding:'4px 10px', fontSize:10.5, color:C.textLt, fontFamily:MONO, border:`1px solid ${C.border}` }}>
          easysecurity.in · KeyLocker Vault
        </div>
      </div>
      <div style={{ padding:'16px' }}>
        {/* Security badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'rgba(124,58,237,0.06)', border:'0.5px solid rgba(124,58,237,0.2)', borderRadius:8, marginBottom:14 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:11, color:'#6d28d9', fontWeight:600 }}>AES-256-GCM encrypted · Envelope key hierarchy · Immutable audit log</span>
        </div>
        {/* Key cards */}
        {[
          { domain:'easysecurity.in',  alg:'RSA-2048', rotations:2, accessed:'2h ago',  status:'active' },
          { domain:'api.myshop.com',   alg:'RSA-2048', rotations:0, accessed:'Never',   status:'active' },
        ].map(k=>(
          <div key={k.domain} style={{ border:`0.5px solid ${C.border}`, borderTop:`2px solid #7c3aed`, borderRadius:8, padding:'11px 13px', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:MONO, color:C.text }}>{k.domain}</span>
                <span style={{ fontSize:9, fontWeight:700, color:'#7c3aed', background:'rgba(124,58,237,0.08)', border:'0.5px solid rgba(124,58,237,0.2)', borderRadius:4, padding:'1px 6px', marginLeft:8 }}>🔒 VAULT SECURED</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
              {[['Algorithm',k.alg],['Rotations',k.rotations],['Last accessed',k.accessed]].map(([l,v])=>(
                <div key={l} style={{ background:C.bg, borderRadius:5, padding:'5px 8px' }}>
                  <div style={{ fontSize:8.5, color:C.textLt, textTransform:'uppercase', letterSpacing:'0.3px' }}>{l}</div>
                  <div style={{ fontSize:11, fontWeight:500, color:C.text, fontFamily:MONO }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:5, border:'0.5px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.07)', color:'#7c3aed', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Reveal key
              </button>
              <button style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:5, border:`0.5px solid ${C.border}`, background:C.white, color:C.textMid, cursor:'pointer', fontFamily:'inherit' }}>
                Rotate
              </button>
              <button style={{ fontSize:10, fontWeight:500, padding:'4px 10px', borderRadius:5, border:'none', background:'none', color:C.textLt, cursor:'pointer', fontFamily:'inherit' }}>
                View audit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 47-Day Readiness mockup ───────────────────────────────────────────
function ReadinessMockup() {
  const milestones = [
    { date:'Mar 2026', days:'200d max', status:'critical', label:'In effect now — check all certs' },
    { date:'Mar 2027', days:'100d max', status:'warning',  label:'299 days away' },
    { date:'Mar 2029', days:'47d max',  status:'ok',       label:'1,030 days away' },
  ]
  const certs = [
    { domain:'easysecurity.in',   score:85, label:'Ready',    color:C.green,  checks:'5/5' },
    { domain:'api.myshop.com',    score:55, label:'At Risk',  color:C.amber,  checks:'3/5' },
    { domain:'staging.portal.io', score:30, label:'Will Break',color:C.red,   checks:'1/5' },
  ]
  return (
    <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 20px 60px rgba(15,23,42,0.12)' }}>
      <div style={{ background:C.bg, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', gap:5 }}>{['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
        <div style={{ flex:1, background:C.white, borderRadius:5, padding:'4px 10px', fontSize:10.5, color:C.textLt, fontFamily:MONO, border:`1px solid ${C.border}` }}>
          47-Day Readiness · CA/B Forum Compliance
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        {/* Milestone timeline */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {milestones.map(m=>(
            <div key={m.date} style={{ padding:'9px 10px', borderRadius:8, background:m.status==='critical'?'#fef2f2':m.status==='warning'?'#fffbeb':'#f0fdf4', border:`0.5px solid ${m.status==='critical'?'#fecaca':m.status==='warning'?'#fde68a':'#bbf7d0'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={m.status==='critical'?C.red:m.status==='warning'?C.amber:C.green} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ fontSize:11, fontWeight:700, color:m.status==='critical'?C.red:m.status==='warning'?C.amber:C.green }}>{m.date}</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, fontFamily:MONO }}>{m.days}</div>
              <div style={{ fontSize:9.5, color:C.textLt, marginTop:2 }}>{m.label}</div>
            </div>
          ))}
        </div>
        {/* Cert scores */}
        {certs.map(c=>(
          <div key={c.domain} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, background:C.bg, marginBottom:6, border:`0.5px solid ${C.border}` }}>
            {/* Score ring */}
            <div style={{ position:'relative', width:34, height:34, flexShrink:0 }}>
              <svg width="34" height="34" viewBox="0 0 34 34">
                <circle cx="17" cy="17" r="14" fill="none" stroke={C.border} strokeWidth="3.5"/>
                <circle cx="17" cy="17" r="14" fill="none" stroke={c.color} strokeWidth="3.5" strokeDasharray={`${2*Math.PI*14}`} strokeDashoffset={`${2*Math.PI*14*(1-c.score/100)}`} strokeLinecap="round" transform="rotate(-90 17 17)"/>
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:c.color }}>{c.score}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11.5, fontWeight:600, color:C.text, fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.domain}</div>
              <div style={{ fontSize:10, color:C.textLt, marginTop:1 }}>{c.checks} checks passed</div>
            </div>
            <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 8px', borderRadius:10, background:c.color+'18', color:c.color }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Security spec card ─────────────────────────────────────────────────
function SecCard({ icon, title, spec, desc, color='#0ea5e9' }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:10, padding:'20px 20px' }}>
      <div style={{ width:36, height:36, borderRadius:9, background:color+'12', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
        {icon}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:color, fontFamily:MONO, marginBottom:4, letterSpacing:'0.02em' }}>{spec}</div>
      <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:C.textMid, lineHeight:1.65 }}>{desc}</div>
    </div>
  )
}

// ── Architecture diagram ──────────────────────────────────────────────
function ArchDiagram({ isMobile }) {
  const nodes = [
    { label:'Your domain', sub:'DNS records', icon:'🌐', color:C.teal },
    { label:'SSLVault CLM', sub:'Platform', icon:'🔐', color:C.purple, main:true },
    { label:'RapidSSL CA', sub:'DigiCert chain', icon:'🏛', color:C.green },
    { label:'Your server', sub:'Nginx / Apache', icon:'⚡', color:C.amber },
  ]
  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'24px 20px', textAlign:'center' }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:20 }}>Certificate lifecycle flow</div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:isMobile?8:16, flexWrap:'wrap' }}>
        {nodes.map((n, i) => (
          <div key={n.label} style={{ display:'flex', alignItems:'center', gap:isMobile?8:16 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:12, background:n.main?n.color:n.color+'15', border:`2px solid ${n.main?n.color:n.color+'44'}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', fontSize:22, boxShadow:n.main?`0 4px 20px ${n.color}44`:'none' }}>
                {n.icon}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:n.main?n.color:C.text }}>{n.label}</div>
              <div style={{ fontSize:10, color:C.textLt }}>{n.sub}</div>
            </div>
            {i < nodes.length-1 && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                  <line x1="0" y1="6" x2="22" y2="6" stroke={C.teal} strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M20 2l6 4-6 4" stroke={C.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize:9, color:C.teal, fontFamily:MONO }}>{['ACME v2','RFC 8555','TLS 1.3'][i]}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Protocol labels */}
      <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:20 }}>
        {['ACME RFC 8555','DNS-01 Challenge','AES-256-GCM','TLS 1.3 / 1.2','CT Log verified'].map(p=>(
          <span key={p} style={{ fontSize:10, fontWeight:600, color:C.teal, background:`${C.teal}0d`, border:`1px solid ${C.teal}22`, borderRadius:4, padding:'3px 8px', fontFamily:MONO }}>{p}</span>
        ))}
      </div>
    </div>
  )
}

// ── Live ticker ───────────────────────────────────────────────────────
const TRUST_ITEMS = [
  'RFC 8555 · ACME v2','DigiCert Trust Chain','RapidSSL CA Partner','AES-256-GCM',
  'TLS 1.3 / 1.2','DNS-01 Challenge','CT Log Monitoring','CAA Records',
  'HSTS Preloading','SHA-256','CA/B Forum Compliant','Zero-touch Renewal',
]

export default function Home({ nav }) {
  const { isMobile, isTablet } = useIsMobile()
  const activeSection = useActiveSection(['platform','arch','security'])
  const [certCount, setCertCount] = useState(null)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    supabase.from('certificates').select('id',{count:'exact',head:true})
      .then(({count}) => { if (count) setCertCount(count) })
  }, [])

  useEffect(() => {
    if (!certCount) return
    let i=0
    const iv = setInterval(() => {
      i += Math.ceil(certCount/60)
      if (i>=certCount) { setDisplayCount(certCount); clearInterval(iv) }
      else setDisplayCount(i)
    }, 16)
    return () => clearInterval(iv)
  }, [certCount])

  return (
    <div style={{ fontFamily:F, background:C.white, color:C.text, overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#0ea5e922; color:#0284c7 }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanline{ 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @media(max-width:767px){
          .home-nav-links { display:none !important; }
          .home-nav-signin { display:none !important; }
          .hero-pill { display:none !important; }
        }
      `}</style>

      {/* ── NAV — Owlish-style floating pill nav ──────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(10,14,26,0.72)',
        backdropFilter:'blur(28px)',
        WebkitBackdropFilter:'blur(28px)',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        padding:`0 clamp(16px,4vw,40px)`,
        height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        {/* Logo — clean, no badge */}
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', flexShrink:0 }} onClick={()=>nav('/')}>
          <div style={{ width:30, height:30, background:C.teal, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.3px', color:'rgba(255,255,255,0.92)' }}>SSLVault</span>
        </div>

        {/* Center pill — Owlish signature element */}
        <nav className="home-nav-links" style={{
          position:'absolute', left:'50%', transform:'translateX(-50%)',
          display:'flex', alignItems:'center', gap:0,
          background:'rgba(255,255,255,0.05)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:100, padding:'4px 6px',
        }}>
          {[['Platform','#platform'],['Architecture','#arch'],['Security','#security'],['Pricing','/pricing']].map(([label,href])=>(
            <button key={label}
              onClick={()=> href.startsWith('/')? nav(href) : document.querySelector(href)?.scrollIntoView({behavior:'smooth'})}
              style={{ background: href.replace('/','') === activeSection ? 'rgba(14,165,233,0.12)' : 'none',
                border:'none', cursor:'pointer', fontFamily:F,
                fontSize:13, fontWeight: href.replace('/','') === activeSection ? 500 : 400,
                color: href.replace('/','') === activeSection ? C.teal : 'rgba(255,255,255,0.52)',
                padding:'5px 16px', borderRadius:100, transition:'all .2s',
                letterSpacing:'-0.01em' }}
              onMouseEnter={e=>{ if(href.replace('/','') !== activeSection){ e.currentTarget.style.color='rgba(255,255,255,0.92)'; e.currentTarget.style.background='rgba(255,255,255,0.08)' }}}
              onMouseLeave={e=>{ if(href.replace('/','') !== activeSection){ e.currentTarget.style.color='rgba(255,255,255,0.52)'; e.currentTarget.style.background='none' }}}>
              {label}
            </button>
          ))}
        </nav>

        {/* Right CTAs */}
        <div style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
          <span className="home-nav-signin">
            <button onClick={()=>nav('/auth')}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F,
                fontSize:13, fontWeight:400, color:'rgba(255,255,255,0.48)',
                padding:'7px 16px', borderRadius:100, transition:'color .15s',
                letterSpacing:'-0.01em' }}
              onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.88)'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.48)'}>
              Sign in
            </button>
          </span>
          <button onClick={()=>nav('/auth')}
            style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F,
              fontSize:13, fontWeight:500, color:'white',
              padding:'7px 20px', borderRadius:100, transition:'all .15s',
              letterSpacing:'-0.01em', lineHeight:1 }}
            onMouseEnter={e=>{ e.currentTarget.style.background=C.tealDk; e.currentTarget.style.boxShadow=`0 4px 20px ${C.teal}40` }}
            onMouseLeave={e=>{ e.currentTarget.style.background=C.teal; e.currentTarget.style.boxShadow='none' }}>
            Get started
          </button>
        </div>
      </header>

      {/* ── HERO — Owlish DNA: refined, airy, authoritative ─────────── */}
      <section style={{ background:'#080c14', padding:`clamp(80px,10vw,130px) clamp(20px,5vw,48px) clamp(70px,9vw,110px)`, position:'relative', overflow:'hidden' }}>

        {/* Subtle noise texture via SVG filter */}
        <svg style={{ position:'absolute', width:0, height:0 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
            <feBlend in="SourceGraphic" mode="overlay"/>
          </filter>
        </svg>
        <div style={{ position:'absolute', inset:0, opacity:0.028, filter:'url(#noise)', pointerEvents:'none', background:'white' }}/>

        {/* Radial glow — top center */}
        <div style={{ position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)', width:900, height:500, background:`radial-gradient(ellipse 60% 55% at 50% 0%, ${C.teal}14 0%, transparent 100%)`, pointerEvents:'none' }}/>

        {/* Subtle grid — very faint */}
        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(14,165,233,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.025) 1px, transparent 1px)`, backgroundSize:'72px 72px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)', WebkitMaskImage:'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?48:80, alignItems:'center' }}>

            {/* ── Left — refined copy ── */}
            <div>
              {/* Status pill — Owlish style: minimal border, no fill */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'5px 14px', marginBottom:32, backdropFilter:'blur(8px)', background:'rgba(255,255,255,0.03)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, boxShadow:`0 0 6px ${C.green}`, animation:'blink 2.4s ease infinite', flexShrink:0 }}/>
                <span style={{ fontSize:11.5, fontWeight:500, color:'rgba(255,255,255,0.55)', fontFamily:MONO, letterSpacing:'0.02em' }}>
                  RFC 8555 · CA/B Forum · AES-256-GCM
                </span>
              </div>

              {/* Headline — Owlish: lighter weight, tighter but not crushed */}
              <h1 style={{ fontSize:`clamp(36px,5.5vw,68px)`, fontWeight:700, letterSpacing:'-1.5px', lineHeight:1.08, color:'rgba(255,255,255,0.96)', marginBottom:22 }}>
                Certificate<br/>
                <span style={{ color:C.teal, fontWeight:700 }}>lifecycle</span><br/>
                management.
              </h1>

              <p style={{ fontSize:16.5, color:'rgba(255,255,255,0.42)', lineHeight:1.82, marginBottom:36, maxWidth:420, fontWeight:400, letterSpacing:'-0.01em' }}>
                Issue, validate, deploy and auto-renew SSL/TLS certificates — persistent agent, DNS automation, and AES-256 key vault included.
              </p>

              {/* CTAs */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:44 }}>
                <CTA label="Start managing certs" variant="primary" onClick={()=>nav('/auth')}/>
                <CTA label="View pricing" variant="ghost-dark" onClick={()=>nav('/pricing')}/>
              </div>

              {/* Metrics — Owlish style: subtle dividers, no bold numbers */}
              <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:28 }}>
                {[
                  { val: certCount?`${displayCount.toLocaleString()}+`:'—', label:'Certs managed' },
                  { val:'99.9%', label:'Renewal success' },
                  { val:'< 5 min', label:'DV issuance' },
                ].map((m, i)=>(
                  <div key={m.label} style={{ flex:1, paddingLeft:i>0?24:0, borderLeft:i>0?'1px solid rgba(255,255,255,0.07)':'none', marginLeft:i>0?24:0 }}>
                    <div style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,0.88)', fontFamily:MONO, letterSpacing:'-0.5px', marginBottom:4 }}>{m.val}</div>
                    <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.3)', fontWeight:400, letterSpacing:'0.01em' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right — terminal, refined dark styling ── */}
            <div style={{ position:'relative' }}>
              {/* Glow behind terminal */}
              <div style={{ position:'absolute', inset:'-20px', background:`radial-gradient(ellipse 80% 60% at 50% 50%, ${C.teal}0a 0%, transparent 70%)`, pointerEvents:'none', borderRadius:20 }}/>

              {/* Terminal — softer, more Owlish */}
              <div style={{ position:'relative', background:'rgba(13,17,23,0.9)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', backdropFilter:'blur(4px)' }}>
                {/* Chrome bar */}
                <div style={{ background:'rgba(255,255,255,0.03)', padding:'11px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display:'flex', gap:5 }}>
                    {['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,opacity:0.8 }}/>)}
                  </div>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.22)', flex:1, textAlign:'center', fontFamily:MONO, letterSpacing:'0.02em' }}>sslvault-agent · prod-server-01</span>
                </div>

                {/* Lines */}
                <div style={{ padding:'18px 20px', fontSize:12, lineHeight:2.05, fontFamily:MONO }}>
                  <TLine prompt="›" cmd="[21:05:12] Checking for pending jobs..." color="rgba(255,255,255,0.22)"/>
                  <TLine prompt="›" cmd="[21:05:13] Job received: renew · easysecurity.in" color="rgba(14,165,233,0.9)"/>
                  <TLine prompt="" cmd="  ↳ DNS provider: Cloudflare" color="rgba(255,255,255,0.32)" indent/>
                  <TLine prompt="" cmd="  ↳ Adding TXT _acme-challenge..." color="rgba(255,255,255,0.28)" indent/>
                  <TLine prompt="›" cmd="[21:05:15] DNS propagated · DCV validated ✓" color="rgba(16,185,129,0.85)"/>
                  <TLine prompt="›" cmd="[21:05:16] Cert issued · RapidSSL TLS RSA CA 2022" color="rgba(16,185,129,0.85)"/>
                  <TLine prompt="" cmd="  ↳ CN=easysecurity.in  valid 180d" color="rgba(255,255,255,0.28)" indent/>
                  <TLine prompt="›" cmd="[21:05:17] nginx -t OK · reload ✓" color="rgba(16,185,129,0.85)"/>
                  <TLine prompt="›" cmd="[21:05:18] KeyLocker: AES-256-GCM encrypted ✓" color="rgba(139,92,246,0.85)"/>
                  <TLine prompt="›" cmd="[21:05:18] ✓ Complete · next run: 21:10:18" color="rgba(14,165,233,0.9)"/>
                  {/* Cursor */}
                  <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'rgba(14,165,233,0.5)', fontSize:11 }}>›</span>
                    <span style={{ display:'inline-block', width:7, height:14, background:C.teal, opacity:0.7, animation:'blink 1.2s step-end infinite', borderRadius:1 }}/>
                  </div>
                </div>
              </div>

              {/* Floating cert badge — bottom right of terminal */}
              {!isMobile && (
                <div style={{ position:'absolute', bottom:-16, right:-12, background:'rgba(13,17,23,0.95)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'10px 14px', backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:C.green, boxShadow:`0 0 6px ${C.green}` }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', fontFamily:MONO }}>easysecurity.in</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.green, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:4, padding:'1px 7px', fontFamily:MONO }}>A+</span>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', marginTop:3, fontFamily:MONO }}>cert valid · 196d · auto ✓</div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── TRUST TICKER ────────────────────────────────────────────── */}
      <div style={{ background:C.inkMid, borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', padding:'11px 0' }}>
        <div style={{ display:'flex', overflow:'hidden', maskImage:'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div style={{ display:'flex', gap:48, flexShrink:0, animation:'ticker 32s linear infinite', whiteSpace:'nowrap' }}>
            {[...TRUST_ITEMS,...TRUST_ITEMS].map((p,i)=>(
              <span key={i} style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.06em', fontFamily:MONO }}>
                <span style={{ color:C.teal, marginRight:8 }}>◆</span>{p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLATFORM FEATURES ────────────────────────────────────────── */}
      <section id="platform" style={{ background:C.white, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom:56, maxWidth:600 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>Platform capabilities</div>
              <h2 style={{ fontSize:`clamp(26px,4vw,42px)`, fontWeight:800, color:C.text, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
                Every layer of the certificate lifecycle — automated.
              </h2>
              <p style={{ fontSize:15, color:C.textMid, lineHeight:1.75 }}>
                From initial issuance through DCV, installation, monitoring, and renewal — SSLVault handles the full PKI chain with zero manual steps.
              </p>
            </div>
          </FadeUp>

          {/* Feature grid — 3 col */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:isTablet?2:3},1fr)`, gap:16, marginBottom:64 }}>
            {[
              { icon:'⚡', title:'Zero-touch issuance', color:C.teal, spec:'ACME v2 · RFC 8555',
                desc:'DV, OV, EV and Wildcard certificates via RapidSSL API. Automated DNS-01 validation via Cloudflare, Vercel, Route53, and 8 more providers. Issued in under 5 minutes.' },
              { icon:'🤖', title:'Persistent agent', color:C.green, spec:'systemd · Nginx / Apache',
                desc:'Lightweight daemon on your VPS polls every 5 minutes. Detects web server, writes cert files, updates config, tests syntax, reloads service. SSH once, never again.' },
              { icon:'🔐', title:'KeyLocker vault', color:C.purple, spec:'AES-256-GCM · Envelope encryption',
                desc:'Every private key encrypted with envelope key hierarchy (DEK + KEK). Password re-auth before reveal. 30-second copy-only window. Immutable audit log. Key rotation with 30-day archive.' },
              { icon:'📊', title:'47-day readiness', color:C.amber, spec:'CA/B Forum 2026–2029',
                desc:'Scores every certificate against the CA/B Forum mandate timeline — 200d (Mar 2026), 100d (Mar 2027), 47d (Mar 2029). Fleet-wide compliance checklist with per-cert action items.' },

              { icon:'📈', title:'Health scoring', color:'#06b6d4', spec:'A+ to F · TLS · HSTS · CAA',
                desc:'Grades every domain A+ to F against TLS reachability, HSTS presence and max-age, CAA record, expiry, and security headers. Live data from crt.sh CT logs.' },
            ].map(f=>(
              <FadeUp key={f.title}>
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderTop:`3px solid ${f.color}`, borderRadius:10, padding:'22px 20px', height:'100%' }}>
                  <div style={{ fontSize:22, marginBottom:12 }}>{f.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:f.color, fontFamily:MONO, letterSpacing:'0.04em', marginBottom:6 }}>{f.spec}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>{f.title}</div>
                  <div style={{ fontSize:12.5, color:C.textMid, lineHeight:1.7 }}>{f.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Cert inventory screenshot */}
          <FadeUp>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>
                📸 Certificate inventory — live expiry tracking with auto-renew status
              </div>
              <CertInventoryMockup/>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── ARCHITECTURE ─────────────────────────────────────────────── */}
      <section id="arch" style={{ background:C.bg, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:60, alignItems:'start' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>How it works</div>
                <h2 style={{ fontSize:`clamp(24px,3.5vw,38px)`, fontWeight:800, color:C.text, letterSpacing:'-1px', lineHeight:1.2, marginBottom:20 }}>
                  From CSR to live HTTPS — in one automated pipeline.
                </h2>
                <p style={{ fontSize:14, color:C.textMid, lineHeight:1.8, marginBottom:28 }}>
                  SSLVault orchestrates the full certificate lifecycle across ACME-compliant CAs, your DNS provider, and your web server — using open standards throughout.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {[
                    { step:'01', label:'Issue request', detail:'You select domain + cert type. SSLVault generates CSR, submits order to RapidSSL via ACME v2.' },
                    { step:'02', label:'Auto-DCV',      detail:'SSLVault calls your DNS provider API to add the TXT/CNAME challenge record and polls for propagation.' },
                    { step:'03', label:'Cert delivery', detail:'CA verifies domain control, signs certificate. SSLVault stores cert + private key (AES-256-GCM encrypted).' },
                    { step:'04', label:'Auto-install',  detail:'Agent on your server receives the cert, updates Nginx/Apache config, tests, and reloads. Zero SSH required.' },
                    { step:'05', label:'Lifecycle',     detail:'SSLVault monitors expiry, sends alerts, and automatically repeats steps 1–4 before expiry.' },
                  ].map(s=>(
                    <div key={s.step} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:`${C.teal}12`, border:`1px solid ${C.teal}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:C.teal, fontFamily:MONO, flexShrink:0 }}>{s.step}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{s.label}</div>
                        <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <ArchDiagram isMobile={isMobile}/>
                <div style={{ marginTop:20 }}>
                  <Terminal title="curl · DCV verification" accent={C.teal}>
                    <TLine prompt="$" cmd={`curl -X POST https://easysecurity.in/api/issue \\`} color="rgba(255,255,255,0.7)"/>
                    <TLine prompt="" cmd={`  -d '{"domain":"api.myshop.com","type":"DV","dns_provider":"cloudflare"}'`} color="rgba(255,255,255,0.45)"/>
                    <div style={{ marginTop:8, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:8 }}>
                      <TLine prompt="" cmd={`{ "status":"issued", "valid_until":"2026-11-20",`} color={C.green}/>
                      <TLine prompt="" cmd={`  "issuer":"RapidSSL TLS RSA CA 2022",`} color={C.green}/>
                      <TLine prompt="" cmd={`  "grade":"A+", "hsts":true, "caa":true,`} color={C.green}/>
                      <TLine prompt="" cmd={`  "keylocker":"encrypted" }`} color={C.green}/>
                    </div>
                  </Terminal>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── KEYLOCKER + READINESS SCREENSHOTS ────────────────────────── */}
      <section style={{ background:C.white, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>Security-grade tooling</div>
              <h2 style={{ fontSize:`clamp(24px,3.5vw,38px)`, fontWeight:800, color:C.text, letterSpacing:'-1px', lineHeight:1.2, marginBottom:16 }}>
                Enterprise PKI controls. Built in.
              </h2>
              <p style={{ fontSize:15, color:C.textMid, maxWidth:520, margin:'0 auto', lineHeight:1.75 }}>
                KeyLocker, 47-day readiness scoring, CT abuse monitoring, and policy engine — the controls your security team expects.
              </p>
            </div>
          </FadeUp>

          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:24 }}>
            <FadeUp>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>
                  🔐 KeyLocker — AES-256-GCM private key vault
                </div>
                <KeyLockerMockup/>
              </div>
            </FadeUp>
            <FadeUp delay={100}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:MONO, marginBottom:10 }}>
                  📋 47-Day Readiness — CA/B Forum compliance
                </div>
                <ReadinessMockup/>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── SECURITY SPECS ───────────────────────────────────────────── */}
      <section id="security" style={{ background:C.ink, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom:48 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>Security specifications</div>
              <h2 style={{ fontSize:`clamp(24px,3.5vw,42px)`, fontWeight:800, color:C.white, letterSpacing:'-1px', lineHeight:1.15, marginBottom:16 }}>
                Built on open standards.<br/>
                <span style={{ color:C.teal }}>No proprietary black boxes.</span>
              </h2>
            </div>
          </FadeUp>

          <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:isTablet?2:3},1fr)`, gap:12 }}>
            {[
              { title:'Envelope encryption', spec:'AES-256-GCM', color:C.purple,
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                desc:'Private keys encrypted with AES-256-GCM. DEK (data encryption key) wrapped with KEK (key encryption key). Keys never stored or transmitted in plaintext.' },
              { title:'ACME v2 protocol', spec:'RFC 8555', color:C.teal,
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                desc:'Full RFC 8555 ACME v2 implementation. DNS-01 and HTTP-01 challenge support. Automated challenge setup via integrated DNS provider APIs.' },
              { title:'Certificate transparency', spec:'CT Log monitoring', color:C.green,
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
                desc:'Queries crt.sh (CT aggregator) for real issuer and expiry data. CT Abuse Monitor watches for unauthorised certificate issuance for your domains.' },
              { title:'CAA records', spec:'DNS security', color:C.amber,
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                desc:'Checks CAA DNS records as part of the SSL Health Score. CAA records restrict which CAs can issue for your domain, preventing unauthorised certificate issuance.' },
              { title:'TLS configuration', spec:'TLS 1.2 / 1.3', color:'#06b6d4',
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                desc:'TLS reachability checked as part of health scoring. HSTS presence and max-age verified. Perfect Forward Secrecy via ECDHE key exchange.' },
              { title:'Immutable audit trail', spec:'Append-only log', color:C.red,
                icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                desc:'Every key access, rotation, cert issuance, and agent job logged with timestamp and user. Append-only. Export as CSV for SOC 2 or ISO 27001 audit evidence.' },
            ].map(s=>(
              <FadeUp key={s.title}>
                <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.07)`, borderTop:`2px solid ${s.color}`, borderRadius:10, padding:'20px 18px', height:'100%' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>{s.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, fontFamily:MONO, letterSpacing:'0.06em', marginBottom:6 }}>{s.spec}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.white, marginBottom:8 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>{s.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* CA/B Forum timeline */}
          <FadeUp>
            <div style={{ marginTop:48, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'28px 28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, animation:'blink 2s ease infinite' }}/>
                <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', fontFamily:MONO }}>CA/B Forum maximum validity mandate — action required</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile?1:3},1fr)`, gap:isMobile?20:0 }}>
                {[
                  { date:'March 15, 2026', limit:'200 days', status:'IMMINENT', color:C.red,     action:'Certificates with validity > 200 days will be rejected by browsers. Audit your fleet now.' },
                  { date:'March 15, 2027', limit:'100 days', status:'UPCOMING', color:C.amber,   action:'Automation becomes mandatory. Manual renewal every 100 days is operationally unsustainable.' },
                  { date:'March 15, 2029', limit:'47 days',  status:'PLANNED',  color:C.teal,    action:'Full automation required. SSLVault\'s agent + DNS automation handles this end-to-end.' },
                ].map((m, i)=>(
                  <div key={m.date} style={{ padding:isMobile?'16px 0':'0 24px', borderLeft:(!isMobile&&i>0)?'1px solid rgba(255,255,255,0.06)':'none' }}>
                    <div style={{ fontSize:9, fontWeight:800, color:m.color, fontFamily:MONO, letterSpacing:'1px', marginBottom:8 }}>{m.status}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontFamily:MONO, marginBottom:4 }}>{m.date}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:m.color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:8 }}>{m.limit}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.65 }}>{m.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── DNS PROVIDERS + INTEGRATIONS ─────────────────────────────── */}
      <section style={{ background:C.white, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'center' }}>
            <FadeUp>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>DNS integration</div>
                <h2 style={{ fontSize:`clamp(22px,3vw,36px)`, fontWeight:800, color:C.text, letterSpacing:'-1px', lineHeight:1.2, marginBottom:16 }}>
                  Automated DNS-01 challenge across every major provider.
                </h2>
                <p style={{ fontSize:14, color:C.textMid, lineHeight:1.8, marginBottom:24 }}>
                  SSLVault connects directly to your DNS provider via API. When issuing or renewing, it adds the ACME challenge record, polls for propagation, and cleans up automatically — no copy-pasting, no manual steps.
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { name:'Cloudflare',    note:'API Token' },
                    { name:'Vercel',        note:'Access Token' },
                    { name:'Route53',       note:'AWS IAM' },
                    { name:'Namecheap',     note:'API Key' },
                    { name:'GoDaddy',       note:'API Key + Secret' },
                    { name:'DigitalOcean',  note:'Personal Token' },
                    { name:'Plesk',         note:'XML API' },
                    { name:'+ more',        note:'Contact us' },
                  ].map(p=>(
                    <div key={p.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:7 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:C.teal, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{p.name}</div>
                        <div style={{ fontSize:10, color:C.textLt, fontFamily:MONO }}>{p.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={100}>
              <Terminal title="dns-provider · Cloudflare API" accent={C.teal}>
                <TLine prompt="#" cmd=" DCV for renewal · api.myshop.com" color="rgba(255,255,255,0.2)"/>
                <TLine prompt="›" cmd="Resolving zone: myshop.com → CF zone_id" color="rgba(255,255,255,0.45)"/>
                <TLine prompt="›" cmd="PUT /zones/zone_id/dns_records" color={C.teal}/>
                <TLine prompt="" cmd={'  { "type":"TXT", "name":"_acme-challenge.api.myshop.com",'} color="rgba(255,255,255,0.35)" indent/>
                <TLine prompt="" cmd={'    "content":"xK3-mP9_aQ2rZ...", "ttl":60 }'} color="rgba(255,255,255,0.35)" indent/>
                <TLine prompt="›" cmd="Record created · TTL 60s" color={C.green}/>
                <TLine prompt="›" cmd="Polling propagation..." color="rgba(255,255,255,0.3)"/>
                <TLine prompt="›" cmd="Propagated in 4.2s ✓" color={C.green}/>
                <TLine prompt="›" cmd="ACME challenge: verified ✓" color={C.green}/>
                <TLine prompt="›" cmd="DELETE /zones/zone_id/dns_records/record_id" color="rgba(255,255,255,0.3)"/>
                <TLine prompt="›" cmd="Challenge record removed ✓" color={C.teal}/>
              </Terminal>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── MISSION — dark ───────────────────────────────────────────── */}
      <section style={{ background:C.ink, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)`, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:isMobile?40:80, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>Mission</div>
                <h2 style={{ fontSize:`clamp(24px,3.5vw,42px)`, fontWeight:800, color:C.white, letterSpacing:'-1px', lineHeight:1.15, marginBottom:20 }}>
                  PKI expertise shouldn't require a $250k CLM contract.
                </h2>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.8, marginBottom:28 }}>
                  SSLVault is built by a PKI specialist and DigiCert partner account manager. The same automation that enterprise teams pay for — available to every developer and SMB.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { spec:'Venafi TLS Protect', price:'$250k+/yr',  note:'Enterprise only · No cert issuance · No free tier' },
                    { spec:'Keyfactor Command',  price:'$75–200k/yr', note:'Mid-market · No cPanel · Complex setup' },
                    { spec:'SSLVault CLM',       price:'Partner rates', note:'Full CLM · Agent + cPanel + DNS · All cert types', highlight:true },
                  ].map(c=>(
                    <div key={c.spec} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:c.highlight?`${C.teal}10`:'rgba(255,255,255,0.03)', border:`1px solid ${c.highlight?C.teal+'40':'rgba(255,255,255,0.06)'}`, borderRadius:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:c.highlight?C.teal:C.white, fontFamily:MONO }}>{c.spec}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{c.note}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:800, color:c.highlight?C.teal:'rgba(255,255,255,0.4)', fontFamily:MONO, whiteSpace:'nowrap' }}>{c.price}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { val:'DigiCert', label:'Trust chain', sub:'99.9% browser compatibility' },
                  { val:'RapidSSL', label:'CA partner', sub:'Wholesale certificate pricing' },
                  { val:'RFC 8555', label:'ACME v2', sub:'Open standard, no lock-in' },
                  { val:'AES-256', label:'Encryption', sub:'Military-grade key storage' },
                  { val:'No ads', label:'No advertising', sub:'No tracking, no data reselling' },
                  { val:'NL 🇳🇱', label:'Built in Netherlands', sub:'GDPR-first development' },
                ].map(m=>(
                  <div key={m.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.teal, fontFamily:MONO, width:80, flexShrink:0 }}>{m.val}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.white }}>{m.label}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{m.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background:C.white, padding:`clamp(60px,8vw,100px) clamp(20px,4vw,48px)`, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <FadeUp>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${C.teal}0d`, border:`1px solid ${C.teal}22`, borderRadius:100, padding:'5px 14px', marginBottom:24 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:C.teal, animation:'blink 2.4s ease infinite' }}/>
              <span style={{ fontSize:11.5, fontWeight:600, color:C.teal, fontFamily:MONO }}>Production-ready · RFC 8555 compliant</span>
            </div>
            <h2 style={{ fontSize:`clamp(28px,5vw,52px)`, fontWeight:900, color:C.text, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:20 }}>
              Ready to automate your<br/>certificate lifecycle?
            </h2>
            <p style={{ fontSize:15, color:C.textMid, lineHeight:1.75, marginBottom:36, maxWidth:480, margin:'0 auto 36px' }}>
              Issue, monitor, and auto-renew SSL certificates across every server and every CA — with enterprise-grade security tooling built in.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
              <CTA label="Start managing certs" variant="primary" onClick={()=>nav('/auth')}/>
              <CTA label="View pricing" onClick={()=>nav('/pricing')}/>
            </div>
            <div style={{ display:'flex', gap:24, justifyContent:'center', flexWrap:'wrap' }}>
              {['RapidSSL CA partner · DigiCert trust chain','RFC 8555 · AES-256-GCM','CA/B Forum 2026 compliant'].map(t=>(
                <span key={t} style={{ fontSize:11.5, color:C.textLt, display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background:C.ink, borderTop:'1px solid rgba(255,255,255,0.06)', padding:`clamp(40px,5vw,60px) clamp(20px,4vw,48px) clamp(24px,3vw,40px)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)', gap:32, marginBottom:40 }}>
            {[
              { title:'Product', links:[['Pricing',()=>nav('/pricing')],['Knowledge Base',()=>nav('/knowledge-base')],['Install Guide',()=>nav('/install')]] },
              { title:'Security', links:[['KeyLocker','#security'],['47-Day Readiness','#security'],['CT Monitoring','#platform'],['SSL Health Score','#security']] },
              { title:'Protocol', links:[['RFC 8555 ACME','#arch'],['DNS-01 Challenge','#arch'],['AES-256-GCM','#security'],['CA/B Forum','#security']] },
              { title:'Company', links:[['About',()=>nav('/about')],['Developer',()=>nav('/developer')]] },
            ].map(col=>(
              <div key={col.title}>
                <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:MONO, marginBottom:14 }}>{col.title}</div>
                {col.links.map(([l,h])=>(
                  <div key={l} style={{ marginBottom:9 }}>
                    <button onClick={()=> typeof h==='function'? h() : document.querySelector(h)?.scrollIntoView({behavior:'smooth'})}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.4)', fontFamily:F, padding:0, transition:'color .15s', textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.8)'}
                      onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
                      {l}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ width:22, height:22, background:C.teal, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:C.white }}>SSLVault</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', fontFamily:MONO }}>PKI-first CLM · Made with ♥ in the Netherlands</span>
            </div>
            <div style={{ display:'flex', gap:16 }}>
              {[['Pricing','/pricing']].map(([l,p])=>(
                <button key={l} onClick={()=>nav(p)}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'rgba(255,255,255,0.3)', fontFamily:F, transition:'color .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}
                  onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
