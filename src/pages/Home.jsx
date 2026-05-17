// Home.jsx — SSLVault landing page redesign
// Colour model: same navy/teal/white system, richer layout
// Sections: Nav · Hero · Trust bar · Mission · Features (visual) · How it works
//           · CA-Agnostic visual · Competition comparison · Ethics · Pricing CTA · Footer
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const FONT = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Code','Courier New',monospace"

const C = {
  navy:   '#0f2545', navyMid:'#1a3a6b', navyLt:'#1e4d8c',
  teal:   '#0891b2', tealDk:'#0e7490',  tealLt:'#e0f7fa', tealPale:'#f0f9ff',
  green:  '#059669', greenLt:'#d1fae5',
  amber:  '#d97706', amberLt:'#fef3c7',
  purple: '#7c3aed', purpleLt:'#ede9fe',
  slate:  '#475569', slateL:'#64748b', slateXL:'#94a3b8',
  border: '#e2e8f0', borderLt:'#f1f5f9',
  bg:     '#f8fafc', bgAlt:'#f1f5f9',
  white:  '#ffffff',
  red:    '#dc2626',
}

// ── Scroll-reveal ────────────────────────────────────────────────────
function useVisible(threshold = 0.1) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect() } }, { threshold })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [])
  return [ref, v]
}
function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useVisible()
  return (
    <div ref={ref} style={{ opacity: v?1:0, transform: v?'none':'translateY(22px)',
      transition:`opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

// ── Shared components ────────────────────────────────────────────────
function Eyebrow({ children, color = C.teal }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:14,
      fontSize:11, fontWeight:700, color, letterSpacing:'1.2px',
      textTransform:'uppercase', fontFamily:MONO }}>
      <span style={{ width:18, height:2, background:color, borderRadius:1, flexShrink:0 }}/>
      {children}
    </div>
  )
}

function PrimaryBtn({ children, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT,
        fontWeight:700, fontSize:15, padding:'13px 26px', borderRadius:9, border:'none',
        cursor:'pointer', transition:'all .18s',
        background: h ? C.tealDk : C.teal, color:'white',
        boxShadow: h ? `0 10px 30px ${C.teal}44` : `0 4px 16px ${C.teal}33` }}>
      {children}
    </button>
  )
}
function SecondaryBtn({ children, onClick, light }) {
  const [h, setH] = useState(false)
  if (light) return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT,
        fontWeight:600, fontSize:15, padding:'12px 22px', borderRadius:9,
        border:'1px solid rgba(255,255,255,0.22)', cursor:'pointer', transition:'all .18s',
        background: h?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)',
        color: h?'white':'rgba(255,255,255,0.82)' }}>
      {children}
    </button>
  )
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT,
        fontWeight:600, fontSize:15, padding:'12px 22px', borderRadius:9,
        border:`1.5px solid ${h?C.teal:'#cbd5e1'}`, cursor:'pointer', transition:'all .18s',
        background: h?C.tealPale:C.white, color:C.navy }}>
      {children}
    </button>
  )
}

// ── Tick / Cross icons ───────────────────────────────────────────────
const Tick = ({ size=15, color=C.green }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill={color} fillOpacity=".12"/>
    <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const Cross = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#e2e8f0"/>
    <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

// ── Inline SVG illustrations ─────────────────────────────────────────
function ShieldIllustration() {
  return (
    <svg viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', maxWidth:240 }}>
      <defs>
        <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f2545"/>
          <stop offset="100%" stopColor="#1a3a6b"/>
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path d="M120 18 L200 52 L200 120 C200 168 120 240 120 240 C120 240 40 168 40 120 L40 52 Z"
        fill="url(#sg1)" opacity=".95"/>
      {/* Inner shield highlight */}
      <path d="M120 38 L185 66 L185 120 C185 158 120 218 120 218 C120 218 55 158 55 120 L55 66 Z"
        fill="none" stroke="rgba(8,145,178,0.4)" strokeWidth="1.5"/>
      {/* Lock body */}
      <rect x="102" y="118" width="36" height="28" rx="5" fill={C.teal} opacity=".9"/>
      {/* Lock shackle */}
      <path d="M109 118 L109 108 Q109 96 120 96 Q131 96 131 108 L131 118"
        fill="none" stroke={C.teal} strokeWidth="5" strokeLinecap="round" opacity=".9"/>
      {/* Keyhole */}
      <circle cx="120" cy="130" r="4" fill="rgba(255,255,255,0.9)"/>
      <rect x="118" y="130" width="4" height="8" rx="1" fill="rgba(255,255,255,0.9)"/>
      {/* Orbiting dots */}
      {[0,60,120,180,240,300].map((deg,i) => {
        const r=88, rad=deg*Math.PI/180
        const x=120+r*Math.cos(rad), y=130+r*Math.sin(rad)
        const colors=[C.teal,'#34d399','#a78bfa','#fbbf24','#f87171',C.teal]
        return <circle key={i} cx={x} cy={y} r="5" fill={colors[i]} opacity=".7"/>
      })}
      {/* Orbit ring */}
      <ellipse cx="120" cy="130" rx="88" ry="88" fill="none"
        stroke="rgba(8,145,178,0.15)" strokeWidth="1" strokeDasharray="4 6"/>
    </svg>
  )
}

function PipelineIllustration() {
  const steps = [
    { label:'DNS\nvalidation', color:C.teal,   icon:'🔗' },
    { label:'Certificate\nissued',    color:C.green,  icon:'📜' },
    { label:'Agent\ndeploy',          color:'#7c3aed',icon:'🚀' },
    { label:'Live &\nmonitored',      color:C.amber,  icon:'✅' },
  ]
  return (
    <svg viewBox="0 0 520 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
      {steps.map((s, i) => {
        const x = 50 + i*130
        return (
          <g key={i}>
            {i > 0 && (
              <>
                <line x1={x-80} y1="50" x2={x-10} y2="50" stroke={C.border} strokeWidth="2" strokeDasharray="4 3"/>
                <polygon points={`${x-12},45 ${x-2},50 ${x-12},55`} fill={steps[i-1].color} opacity=".5"/>
              </>
            )}
            <rect x={x-36} y={20} width={72} height={60} rx="10"
              fill={s.color} fillOpacity=".1" stroke={s.color} strokeWidth="1.5" strokeOpacity=".4"/>
            <text x={x} y="48" textAnchor="middle" fontSize="18">{s.icon}</text>
            <text x={x} y="67" textAnchor="middle" fontSize="9" fill={C.slate}
              fontFamily={FONT} fontWeight="600">
              {s.label.split('\n').map((t,j) => (
                <tspan key={j} x={x} dy={j===0?0:10}>{t}</tspan>
              ))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function CANetworkDiagram() {
  const cas = [
    { label:'DigiCert', x:80,  y:30,  color:'#dc2626' },
    { label:'Sectigo',  x:200, y:20,  color:'#7c3aed' },
    { label:'SSL.com',  x:320, y:30,  color:'#0369a1' },
    { label:'GoGetSSL', x:200, y:120, color:C.green },
    { label:"Let's\nEncrypt", x:80, y:120, color:'#0891b2' },
  ]
  return (
    <svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
      {/* Centre hub — SSLVault */}
      <circle cx="200" cy="90" r="38" fill={C.navy} opacity=".95"/>
      <text x="200" y="86" textAnchor="middle" fill="white" fontSize="10"
        fontFamily={FONT} fontWeight="700">SSL</text>
      <text x="200" y="99" textAnchor="middle" fill={C.teal} fontSize="10"
        fontFamily={FONT} fontWeight="700">Vault</text>
      {/* Spokes */}
      {cas.map((ca,i) => (
        <g key={i}>
          <line x1="200" y1="90" x2={ca.x} y2={ca.y}
            stroke={ca.color} strokeWidth="1.5" strokeOpacity=".4" strokeDasharray="4 3"/>
          <circle cx={ca.x} cy={ca.y} r="24" fill={ca.color} fillOpacity=".1"
            stroke={ca.color} strokeWidth="1.5"/>
          {ca.label.split('\n').map((t,j) => (
            <text key={j} x={ca.x} y={ca.y + (ca.label.includes('\n') ? -3+j*11 : 4)}
              textAnchor="middle" fontSize="8.5" fill={ca.color}
              fontFamily={FONT} fontWeight="700">{t}</text>
          ))}
        </g>
      ))}
      {/* Right side — outputs */}
      {[{label:'Nginx',y:40},{label:'Apache',y:70},{label:'cPanel',y:100},{label:'Plesk',y:130}].map((s,i)=>(
        <g key={i}>
          <line x1="238" y1="90" x2="345" y2={s.y} stroke={C.teal}
            strokeWidth="1.5" strokeOpacity=".3" strokeDasharray="3 3"/>
          <rect x="345" y={s.y-12} width="54" height="24" rx="6"
            fill={C.tealPale} stroke={C.teal} strokeWidth="1" strokeOpacity=".5"/>
          <text x="372" y={s.y+4.5} textAnchor="middle" fontSize="8.5"
            fill={C.tealDk} fontFamily={FONT} fontWeight="600">{s.label}</text>
        </g>
      ))}
      {/* Label */}
      <text x="200" y="185" textAnchor="middle" fontSize="9" fill={C.slateXL}
        fontFamily={FONT}>One platform · every CA · every server</text>
    </svg>
  )
}

function CertLifecycleArc() {
  const pts = [
    { label:'Issue',   angle:-140, color:C.teal,   icon:'📝' },
    { label:'Validate',angle:-80,  color:C.green,  icon:'✔' },
    { label:'Deploy',  angle:-20,  color:'#7c3aed',icon:'🚀' },
    { label:'Monitor', angle:40,   color:C.amber,  icon:'👁' },
    { label:'Renew',   angle:100,  color:C.teal,   icon:'🔄' },
  ]
  const cx=200, cy=200, r=140
  return (
    <svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
      {/* Outer arc */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="1.5" strokeDasharray="6 4"/>
      {/* Centre label */}
      <circle cx={cx} cy={cy} r="44" fill={C.navy} opacity=".96"/>
      <text x={cx} y={cy-5} textAnchor="middle" fill="white" fontSize="11"
        fontFamily={FONT} fontWeight="800">AUTO</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill={C.teal} fontSize="9"
        fontFamily={FONT} fontWeight="700">LIFECYCLE</text>
      {pts.map((p,i) => {
        const rad = p.angle*Math.PI/180
        const x=cx+r*Math.cos(rad), y=cy+r*Math.sin(rad)
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y}
              stroke={p.color} strokeWidth="1.5" strokeOpacity=".25" strokeDasharray="4 3"/>
            <circle cx={x} cy={y} r="26" fill={p.color} fillOpacity=".12"
              stroke={p.color} strokeWidth="1.5"/>
            <text x={x} y={y+1} textAnchor="middle" fontSize="14" dominantBaseline="middle">{p.icon}</text>
            <text x={x} y={y+19} textAnchor="middle" fontSize="8.5" fill={p.color}
              fontFamily={FONT} fontWeight="700">{p.label}</text>
          </g>
        )
      })}
      {/* "Always on" indicator */}
      <text x={cx} y={cy+25} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.4)"
        fontFamily={MONO}>always-on</text>
    </svg>
  )
}

// ── Competition comparison data ──────────────────────────────────────
const COMPARE_FEATURES = [
  { feat:'Platform cost',          sv:'$0 free forever', v:'$250k+/yr', k:'$75k–200k/yr', dc:'Bundled w/ certs' },
  { feat:'DV / OV / EV issuance',  sv:true, v:true, k:true, dc:true },
  { feat:'CA-agnostic management', sv:true, v:true, k:true, dc:false },
  { feat:'Auto DNS validation',    sv:true, v:true, k:true, dc:true  },
  { feat:'VPS agent auto-deploy',  sv:true, v:true, k:true, dc:false },
  { feat:'cPanel / Plesk install', sv:true, v:false,k:false,dc:false },
  { feat:'Shadow IT scanner',      sv:true, v:true, k:false,dc:false },
  { feat:'CA consolidation advisor',sv:true,v:false,k:false,dc:false },
  { feat:'PQC readiness scanner',  sv:true, v:true, k:true, dc:true  },
  { feat:'Private key vault',      sv:true, v:true, k:true, dc:false },
  { feat:'Self-serve onboarding',  sv:true, v:false,k:false,dc:false },
  { feat:'Implementation time',    sv:'5 min', v:'3–6 mo', k:'8–12 wk', dc:'2–4 mo' },
]

// ── Feature detail cards ─────────────────────────────────────────────
const FEATURES_DETAIL = [
  {
    tag:'Zero-touch lifecycle', color:C.teal, bg:C.tealPale, borderColor:`${C.teal}33`,
    headline:'Issue, validate, deploy and renew — without lifting a finger.',
    body:'Agents poll every 5 minutes. DNS challenges resolved automatically. Certificates installed on every server before expiry. Atomic rollback on failure. Confirmation sent to your inbox.',
    pills:['DV · OV · EV · Wildcard · SAN','Auto DNS via Cloudflare / Vercel / GoDaddy','cPanel · Plesk · Nginx · Apache'],
    illustration:<PipelineIllustration/>,
  },
  {
    tag:'CA-agnostic intelligence', color:'#7c3aed', bg:'#faf5ff', borderColor:'#ddd6fe',
    headline:'One dashboard for every certificate, every CA, every server.',
    body:'Connect DigiCert CertCentral, Sectigo SCM, SSL.com, and GoGetSSL in minutes. Unified expiry timeline, unified PQC risk scoring, unified Shadow IT findings. No silos.',
    pills:['DigiCert · Sectigo · SSL.com · GoGetSSL','Unified expiry timeline','Cross-CA Shadow IT detection'],
    illustration:<CANetworkDiagram/>,
  },
  {
    tag:'Post-quantum readiness', color:C.amber, bg:'#fffbeb', borderColor:'#fde68a',
    headline:'NIST 2030 deadline is real. SSLVault flags every RSA-2048 cert today.',
    body:'Every certificate in your portfolio is scored against the NIST PQC migration timeline. RSA-2048 is flagged High risk. A per-domain migration plan with estimated timeline is generated automatically.',
    pills:['RSA-2048 → flagged High risk','NIST FIPS 203 / 204 / 205 aware','Per-domain migration timeline'],
    illustration:<CertLifecycleArc/>,
  },
]

// ── Ethics / mission items ───────────────────────────────────────────
const ETHICS = [
  {
    icon:'🔓', color:C.teal, title:'Radically open pricing',
    body:'The platform is free. Always. No paywall on agents, monitoring, CA connectors, or PQC scanning. You pay for certificates at GoGetSSL reseller rates — from $8/yr. That\'s it. No enterprise sales call, no procurement cycle.',
  },
  {
    icon:'🔐', color:'#7c3aed', title:'Your keys stay yours',
    body:'Private keys are never transmitted to SSLVault servers unless you explicitly opt in to KeyLocker. Even then, AES-256-GCM encrypted at rest, with a full immutable audit trail. Every access is logged. You can export and delete at any time.',
  },
  {
    icon:'🌍', color:C.green, title:'Built for the long tail',
    body:'The enterprise world already has Venafi and Keyfactor. SSLVault exists for the developer running 12 side projects, the non-profit on shared hosting, the small agency that can\'t justify $75k/yr. Everyone deserves the padlock to stay green.',
  },
  {
    icon:'📖', color:C.amber, title:'No dark patterns',
    body:'No upgrade prompts. No "trial expired" banners. No per-seat fees that silently appear. No ads. No selling your data. SSLVault is ad-free by design — the product is the platform, not the user.',
  },
  {
    icon:'🛡', color:C.navyMid, title:'PKI-first security posture',
    body:'Built by someone who works in PKI. Supabase RLS on every table. JWT-verified edge functions. Encrypted credential storage for all CA API keys. Audit logs on key access, cert issuance, and agent actions.',
  },
  {
    icon:'⚡', color:'#0f766e', title:'47-day world, automated',
    body:'CA/Browser Forum Ballot SC-081v3 is reducing max cert validity to 200 days in March 2026 and 100 days by March 2027. Manual renewal is mathematically impossible at that cadence. SSLVault was built for this world — full automation is the only answer.',
  },
]

const INTEGRATIONS = [
  'DigiCert','Sectigo','GoGetSSL','SSL.com',
  'Cloudflare','Vercel','GoDaddy','DigitalOcean',
  'Nginx','Apache','cPanel','Plesk','Let\'s Encrypt',
]

export default function Home({ nav }) {
  const [certCount, setCertCount] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    supabase.from('certificates').select('id', { count:'exact', head:true })
      .eq('status','active').then(({ count:c }) => { if (c) setCertCount(c) })
  }, [])

  useEffect(() => {
    if (!certCount) return
    let n = 0
    const step = Math.ceil(certCount / 40)
    const iv = setInterval(() => {
      n = Math.min(n + step, certCount)
      setCount(n)
      if (n >= certCount) clearInterval(iv)
    }, 30)
    return () => clearInterval(iv)
  }, [certCount])

  return (
    <div style={{ fontFamily:FONT, background:C.white, color:C.navy, overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:#0891b222;color:#0891b2}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spinSlow{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes flowRight{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:100,
        background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${C.border}`, padding:'0 40px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:C.navy,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize:16, fontWeight:800, color:C.navy, letterSpacing:'-0.3px' }}>SSLVault</span>
          <span style={{ fontSize:9, color:C.slateL, letterSpacing:'1.2px', textTransform:'uppercase',
            background:C.bg, border:`1px solid ${C.border}`, borderRadius:4,
            padding:'2px 7px', fontFamily:MONO }}>CLM</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          {[['Features','#features'],['Mission','#mission'],['Pricing','/pricing'],['About','/about']].map(([l,p])=>(
            <button key={l} onClick={()=>p.startsWith('/')? nav(p) : document.querySelector(p)?.scrollIntoView({behavior:'smooth'})}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:14,
                fontWeight:500, color:C.slate, fontFamily:FONT, transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color=C.navy}
              onMouseLeave={e=>e.target.style.color=C.slate}>{l}</button>
          ))}
          <PrimaryBtn onClick={()=>nav('/auth')}>Get Started Free</PrimaryBtn>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(150deg, ${C.navy} 0%, ${C.navyLt} 55%, #0e3d6e 100%)`,
        padding:'100px 40px 90px', position:'relative', overflow:'hidden' }}>
        {/* Grid texture */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)`,
          backgroundSize:'38px 38px' }}/>
        {/* Radial glow */}
        <div style={{ position:'absolute', right:-120, top:-100, width:560, height:560,
          borderRadius:'50%', background:`radial-gradient(ellipse, rgba(8,145,178,0.22) 0%, transparent 65%)`,
          pointerEvents:'none' }}/>
        <div style={{ position:'absolute', left:-80, bottom:-80, width:400, height:400,
          borderRadius:'50%', background:`radial-gradient(ellipse, rgba(5,150,105,0.12) 0%, transparent 65%)`,
          pointerEvents:'none' }}/>

        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative',
          display:'grid', gridTemplateColumns:'1fr 380px', gap:72, alignItems:'center' }}>

          {/* Left text */}
          <div>
            {/* Live badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:28,
              background:'rgba(8,145,178,0.15)', border:'1px solid rgba(8,145,178,0.3)',
              borderRadius:20, padding:'5px 14px 5px 8px' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#34d399',
                boxShadow:'0 0 0 3px rgba(52,211,153,0.25)', animation:'pulse 2s ease infinite' }}/>
              <span style={{ fontSize:11, fontWeight:600, color:'#7dd3fc', letterSpacing:'0.3px' }}>
                CA-Agnostic Certificate Lifecycle Management
              </span>
            </div>

            <h1 style={{ fontSize:'clamp(38px,4.8vw,62px)', fontWeight:900, color:'white',
              lineHeight:1.04, letterSpacing:'-1.8px', marginBottom:8, animation:'fadeUp .55s ease .1s both' }}>
              SSL certificates.
            </h1>
            <h1 style={{ fontSize:'clamp(38px,4.8vw,62px)', fontWeight:900,
              color:'#38bdf8', lineHeight:1.04, letterSpacing:'-1.8px', marginBottom:8, animation:'fadeUp .55s ease .2s both' }}>
              Fully automated.
            </h1>
            <h1 style={{ fontSize:'clamp(28px,3.2vw,44px)', fontWeight:800,
              color:'rgba(255,255,255,0.38)', lineHeight:1.1, letterSpacing:'-1.2px', marginBottom:32, animation:'fadeUp .55s ease .3s both' }}>
              Zero enterprise price tag.
            </h1>

            <p style={{ fontSize:17, color:'rgba(255,255,255,0.62)', lineHeight:1.82,
              maxWidth:520, marginBottom:38, fontWeight:400, animation:'fadeUp .55s ease .4s both' }}>
              The complete CLM platform — issue, validate, deploy, monitor, and renew certificates
              across <strong style={{ color:'rgba(255,255,255,0.9)', fontWeight:700 }}>every CA and every server</strong> — built for
              developers, SMBs, and non-profits who can't justify Venafi's $250k/yr price tag.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:52, animation:'fadeUp .55s ease .5s both' }}>
              <PrimaryBtn onClick={()=>nav('/auth')}>Get Started Free →</PrimaryBtn>
              <SecondaryBtn onClick={()=>nav('/pricing')} light>View Pricing</SecondaryBtn>
            </div>

            {/* Live stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:28, animation:'fadeUp .55s ease .6s both' }}>
              {[
                { val: certCount ? `${count.toLocaleString()}+` : '—', label:'Active certs', sub:'tracked across all CAs' },
                { val:'~5 min', label:'DV issuance', sub:'GoGetSSL · DigiCert trust chain' },
                { val:'$0', label:'Platform cost', sub:'Free forever · certs from $8/yr' },
              ].map(({val,label,sub})=>(
                <div key={label} style={{ borderTop:'2px solid rgba(56,189,248,0.35)', paddingTop:16 }}>
                  <div style={{ fontSize:28, fontWeight:800, color:'white', letterSpacing:'-0.8px',
                    lineHeight:1, marginBottom:5, fontFamily:MONO }}>{val}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)', marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', fontFamily:MONO }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — shield + feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Shield */}
            <div style={{ display:'flex', justifyContent:'center', animation:'fadeUp .7s ease .3s both' }}>
              <ShieldIllustration/>
            </div>
            {/* CLM stack */}
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:14, padding:'18px 20px', backdropFilter:'blur(8px)',
              animation:'fadeUp .7s ease .45s both' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14, fontFamily:MONO }}>
                Full CLM stack
              </div>
              {[
                { dot:'#38bdf8', label:'Certificate issuance',  sub:'DV · OV · EV · Wildcard · SAN' },
                { dot:'#34d399', label:'Auto DNS validation',   sub:'Cloudflare · Vercel · GoDaddy · DO' },
                { dot:'#a78bfa', label:'Zero-touch renewal',    sub:'1 day before expiry · agent + cPanel' },
                { dot:'#fbbf24', label:'CA connectors',         sub:'DigiCert · Sectigo · SSL.com · GoGetSSL' },
                { dot:'#f87171', label:'Shadow IT scanner',     sub:'Finds unmanaged certs before they expire' },
                { dot:'#34d399', label:'PQC readiness',         sub:'NIST 2030 · RSA-2048 risk scoring' },
                { dot:'#a78bfa', label:'Private key vault',     sub:'AES-256-GCM · audit log · 30s reveal' },
              ].map(({dot,label,sub})=>(
                <div key={label} style={{ display:'flex', alignItems:'center', gap:11,
                  padding:'8px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'white', marginBottom:1 }}>{label}</div>
                    <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.32)', fontFamily:MONO }}>{sub}</div>
                  </div>
                  <Tick size={13} color={dot}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── INTEGRATIONS STRIP ──────────────────────────────────────── */}
      <div style={{ background:C.bg, borderBottom:`1px solid ${C.border}`, padding:'14px 40px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center',
          gap:28, flexWrap:'wrap', justifyContent:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, color:C.slateL, textTransform:'uppercase',
            letterSpacing:'1px', flexShrink:0 }}>Works with</span>
          {INTEGRATIONS.map(p=>(
            <span key={p} style={{ fontSize:12, fontWeight:600, color:C.slateL, whiteSpace:'nowrap' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURE DEEP-DIVES ───────────────────────────────────────── */}
      <div id="features" style={{ maxWidth:1200, margin:'0 auto', padding:'100px 40px 60px' }}>
        <Reveal>
          <div style={{ textAlign:'center', marginBottom:72 }}>
            <Eyebrow>Platform capabilities</Eyebrow>
            <h2 style={{ fontSize:'clamp(28px,3.5vw,46px)', fontWeight:900, letterSpacing:'-1.3px',
              color:C.navy, marginBottom:16, lineHeight:1.1 }}>
              Everything a PKI team needs.<br/>
              <span style={{ color:C.teal }}>At a price that isn't a team.</span>
            </h2>
            <p style={{ fontSize:16, color:C.slateL, maxWidth:500, margin:'0 auto', lineHeight:1.8 }}>
              15 features spanning the full certificate lifecycle — built for people who deserve
              enterprise-grade CLM without the enterprise sales cycle.
            </p>
          </div>
        </Reveal>

        {FEATURES_DETAIL.map((f, i) => (
          <Reveal key={f.tag} delay={60}>
            <div style={{ display:'grid', gridTemplateColumns: i%2===0 ? '1fr 1fr' : '1fr 1fr',
              gap:60, alignItems:'center', marginBottom:96,
              ...(i%2===1 ? { direction:'rtl' } : {}) }}>
              <div style={{ ...(i%2===1 ? { direction:'ltr' } : {}) }}>
                <div style={{ display:'inline-block', background:f.bg,
                  border:`1px solid ${f.borderColor}`, borderRadius:20,
                  padding:'4px 14px', marginBottom:16,
                  fontSize:11, fontWeight:700, color:f.color, letterSpacing:'0.8px', textTransform:'uppercase' }}>
                  {f.tag}
                </div>
                <h3 style={{ fontSize:'clamp(20px,2.4vw,30px)', fontWeight:800, color:C.navy,
                  letterSpacing:'-0.6px', lineHeight:1.25, marginBottom:18 }}>
                  {f.headline}
                </h3>
                <p style={{ fontSize:15, color:C.slateL, lineHeight:1.85, marginBottom:22 }}>
                  {f.body}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {f.pills.map(p=>(
                    <div key={p} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Tick color={f.color}/>
                      <span style={{ fontSize:13, color:C.slate, fontWeight:500 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...(i%2===1 ? { direction:'ltr' } : {}),
                background:f.bg, borderRadius:20, padding:'32px',
                border:`1px solid ${f.borderColor}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {f.illustration}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <div style={{ background:C.bg, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`,
        padding:'88px 40px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:60 }}>
              <Eyebrow>Workflow</Eyebrow>
              <h2 style={{ fontSize:'clamp(26px,3vw,42px)', fontWeight:900, letterSpacing:'-1.1px', color:C.navy }}>
                From zero to fully automated in under 10 minutes.
              </h2>
            </div>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
            {[
              { n:'01', title:'Connect', color:C.teal,  icon:'🔌',
                desc:'Link your DNS provider (Cloudflare, Vercel, GoDaddy) and server credentials once. SSLVault stores them encrypted — you never re-enter them.' },
              { n:'02', title:'Issue', color:C.green,   icon:'📜',
                desc:'Order DV, OV or EV via GoGetSSL. DNS challenge auto-resolved in seconds. Certificate issued in ~5 minutes. No manual steps.' },
              { n:'03', title:'Monitor', color:'#7c3aed',icon:'📡',
                desc:'Unified expiry timeline across all CAs. TLS grading. PQC risk scores. No-renewal-path alerts. Shadow IT findings. All in one view.' },
              { n:'04', title:'Deploy', color:C.amber,  icon:'🚀',
                desc:'VPS agent or cPanel push. Nginx/Apache auto-restart. Atomic rollback on failure. Reported back to dashboard within 5 minutes.' },
            ].map(({n,title,color,icon,desc},i)=>(
              <Reveal key={n} delay={i*70}>
                <div style={{ padding:'36px 28px', borderLeft: i>0 ? `1px solid ${C.border}` : 'none',
                  height:'100%' }}>
                  <div style={{ fontSize:32, marginBottom:16 }}>{icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color, fontFamily:MONO,
                    marginBottom:8, letterSpacing:'1px' }}>{n}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:C.navy, marginBottom:14,
                    letterSpacing:'-0.3px' }}>{title}</div>
                  <div style={{ fontSize:13.5, color:C.slateL, lineHeight:1.75 }}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPETITION COMPARISON ──────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'100px 40px' }}>
        <Reveal>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <Eyebrow>How SSLVault compares</Eyebrow>
            <h2 style={{ fontSize:'clamp(26px,3vw,42px)', fontWeight:900, letterSpacing:'-1.1px',
              color:C.navy, marginBottom:16, lineHeight:1.1 }}>
              Complete CLM.<br/>
              <span style={{ color:C.teal }}>Accessible to everyone.</span>
            </h2>
            <p style={{ fontSize:15, color:C.slateL, maxWidth:480, margin:'0 auto', lineHeight:1.75 }}>
              Venafi starts at $250k/yr. Keyfactor at $75k. SSLVault is $0. Same core features — without the enterprise sales process.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div style={{ border:`1px solid ${C.border}`, borderRadius:16,
            overflow:'hidden', boxShadow:'0 4px 32px rgba(0,0,0,0.07)' }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',
              background:C.navy, padding:'16px 22px', gap:4 }}>
              <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', fontFamily:MONO }}>Feature</div>
              {[
                { name:'SSLVault', highlight:true },
                { name:'Venafi',    highlight:false },
                { name:'Keyfactor', highlight:false },
                { name:'DigiCert TLM', highlight:false },
              ].map(({name,highlight})=>(
                <div key={name} style={{ textAlign:'center', fontSize:12, fontWeight:700,
                  fontFamily:MONO, color: highlight ? '#38bdf8' : 'rgba(255,255,255,0.38)' }}>
                  {name}
                  {highlight && <div style={{ fontSize:8, color:'#34d399', marginTop:2,
                    letterSpacing:'0.5px' }}>★ THIS IS US</div>}
                </div>
              ))}
            </div>

            {COMPARE_FEATURES.map((row, i) => (
              <div key={row.feat} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',
                padding:'13px 22px', alignItems:'center', gap:4,
                borderBottom: i < COMPARE_FEATURES.length-1 ? `1px solid ${C.borderLt}` : 'none',
                background: i%2===0 ? C.white : C.bg, transition:'background .12s' }}
                onMouseEnter={e=>e.currentTarget.style.background=C.tealPale}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:C.bg}>
                <div style={{ fontSize:13, color:C.navy, fontWeight:500 }}>{row.feat}</div>
                {[row.sv, row.v, row.k, row.dc].map((val, ci)=>(
                  <div key={ci} style={{ textAlign:'center', display:'flex', justifyContent:'center' }}>
                    {typeof val === 'boolean'
                      ? val ? <Tick size={16} color={ci===0?C.green:C.slateXL}/>
                            : <Cross/>
                      : <span style={{ fontSize:12, fontWeight:700, fontFamily:MONO,
                          color: ci===0 ? C.teal : C.red, whiteSpace:'nowrap' }}>{val}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Pricing callout under table */}
        <Reveal delay={120}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:20 }}>
            {[
              { name:'SSLVault',   price:'$0',        sub:'Platform free · certs from $8/yr', highlight:true },
              { name:'Venafi',     price:'$250k+/yr',  sub:'Enterprise only · 3–6 mo onboarding', highlight:false },
              { name:'Keyfactor',  price:'$75k–200k/yr',sub:'Mid-market · 8–12 wk onboarding', highlight:false },
              { name:'DigiCert TLM',price:'Bundled',   sub:'DigiCert certs only', highlight:false },
            ].map(({name,price,sub,highlight})=>(
              <div key={name} style={{ padding:'16px 18px', borderRadius:12,
                border: highlight ? `2px solid ${C.teal}` : `1px solid ${C.border}`,
                background: highlight ? C.tealPale : C.bg, textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color: highlight?C.teal:C.slateL,
                  marginBottom:6 }}>{name}</div>
                <div style={{ fontSize:20, fontWeight:900, fontFamily:MONO,
                  color: highlight?C.navy:C.red, letterSpacing:'-0.5px', marginBottom:4 }}>{price}</div>
                <div style={{ fontSize:10.5, color:C.slateL, lineHeight:1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── MISSION & ETHICS ────────────────────────────────────────── */}
      <div id="mission" style={{ background:C.navy, padding:'100px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize:'40px 40px' }}/>
        <div style={{ position:'absolute', right:-80, top:-80, width:500, height:500,
          borderRadius:'50%', background:`radial-gradient(ellipse, rgba(8,145,178,0.15) 0%, transparent 60%)`,
          pointerEvents:'none' }}/>

        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative' }}>
          <Reveal>
            <div style={{ textAlign:'center', marginBottom:72 }}>
              <Eyebrow color="#38bdf8">Mission &amp; ethics</Eyebrow>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,46px)', fontWeight:900, letterSpacing:'-1.3px',
                color:'white', lineHeight:1.1, marginBottom:20 }}>
                PKI for the 99%.<br/>
                <span style={{ color:'#38bdf8' }}>No compromise on trust.</span>
              </h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.52)', maxWidth:560,
                margin:'0 auto', lineHeight:1.82 }}>
                The certificate lifecycle management category was built for enterprises with six-figure budgets.
                SSLVault exists to close the gap — giving every developer, SMB, and non-profit the same
                automated, secure, reliable CLM that the enterprise world takes for granted.
              </p>
            </div>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:60 }}>
            {ETHICS.map((e,i)=>(
              <Reveal key={e.title} delay={i*60}>
                <div style={{ background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:16, padding:'28px 24px', height:'100%',
                  transition:'all .2s' }}
                  onMouseEnter={ev=>{ev.currentTarget.style.background='rgba(255,255,255,0.09)'; ev.currentTarget.style.transform='translateY(-3px)'}}
                  onMouseLeave={ev=>{ev.currentTarget.style.background='rgba(255,255,255,0.05)'; ev.currentTarget.style.transform='none'}}>
                  <div style={{ fontSize:32, marginBottom:18 }}>{e.icon}</div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:'white', marginBottom:12,
                    letterSpacing:'-0.2px' }}>{e.title}</h3>
                  <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.5)', lineHeight:1.78 }}>{e.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Mission statement callout */}
          <Reveal delay={100}>
            <div style={{ background:'rgba(8,145,178,0.12)', border:'1px solid rgba(8,145,178,0.28)',
              borderRadius:16, padding:'40px 48px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'white', letterSpacing:'-0.5px',
                lineHeight:1.5, maxWidth:700, margin:'0 auto 20px' }}>
                "Let's Encrypt made certificates free.<br/>
                <span style={{ color:'#38bdf8' }}>SSLVault makes the lifecycle around them free too.</span>"
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.38)', fontFamily:MONO }}>
                — SSLVault mission statement
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── 47-DAY WORLD BANNER ──────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg, ${C.amber}15 0%, ${C.tealPale} 100%)`,
        borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`,
        padding:'56px 40px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid',
          gridTemplateColumns:'1fr auto', gap:40, alignItems:'center' }}>
          <Reveal>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:14,
                background:C.amberLt, border:`1px solid #fcd34d`, borderRadius:20, padding:'4px 14px' }}>
                <span style={{ fontSize:14 }}>⚡</span>
                <span style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.5px' }}>
                  CA/B Forum Ballot SC-081v3 — In effect now
                </span>
              </div>
              <h3 style={{ fontSize:'clamp(20px,2.4vw,28px)', fontWeight:800, color:C.navy,
                letterSpacing:'-0.5px', lineHeight:1.3, marginBottom:14 }}>
                Max cert validity is dropping to 200 days in 2026.<br/>
                100 days by March 2027. Automation isn't optional anymore.
              </h3>
              <p style={{ fontSize:14, color:C.slateL, lineHeight:1.75, maxWidth:560 }}>
                At 100-day validity, every certificate needs renewing at least 4 times per year. Manual renewal
                is mathematically impossible at scale. SSLVault was built for this world — zero-touch renewal
                is the only viable answer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
              {[
                { date:'March 2026', val:'200 days', status:'active' },
                { date:'March 2027', val:'100 days', status:'upcoming' },
                { date:'March 2029', val:'47 days',  status:'future' },
              ].map(({date,val,status})=>(
                <div key={date} style={{ display:'flex', alignItems:'center', gap:14,
                  background: status==='active' ? C.amberLt : C.white,
                  border: `1px solid ${status==='active'?'#fcd34d':C.border}`,
                  borderRadius:10, padding:'12px 18px', minWidth:220 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:C.slateL,
                    fontFamily:MONO, minWidth:90 }}>{date}</span>
                  <span style={{ fontSize:16, fontWeight:800, fontFamily:MONO,
                    color: status==='active'?C.amber:C.navy }}>{val}</span>
                  {status==='active' && <span style={{ fontSize:9, fontWeight:700,
                    background:C.amber, color:'white', borderRadius:4, padding:'2px 7px' }}>LIVE</span>}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── TRUST / SECURITY STATS ──────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'80px 40px' }}>
        <Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {[
              { val:'AES-256-GCM', label:'Key encryption',     sub:'Private keys encrypted at rest', color:C.teal    },
              { val:'99.9%',       label:'Browser trust',      sub:'DigiCert / Sectigo trust chain', color:C.green   },
              { val:'5 min',       label:'Agent polling',      sub:'Zero-touch renewal cadence',     color:'#7c3aed' },
              { val:'0 ads',       label:'Ad-free forever',    sub:'No tracking, no upsells',        color:C.amber   },
            ].map(({val,label,sub,color})=>(
              <div key={label} style={{ background:C.white, border:`1px solid ${C.border}`,
                borderRadius:14, padding:'24px 22px', borderTop:`3px solid ${color}` }}>
                <div style={{ fontSize:24, fontWeight:800, color, letterSpacing:'-0.5px',
                  fontFamily:MONO, marginBottom:8 }}>{val}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:5 }}>{label}</div>
                <div style={{ fontSize:12, color:C.slateL, lineHeight:1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 40px 80px' }}>
          <div style={{ background:`linear-gradient(140deg, ${C.navy} 0%, ${C.navyLt} 60%, ${C.tealDk} 100%)`,
            borderRadius:24, padding:'80px 60px', textAlign:'center',
            position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, right:-80, width:360, height:360,
              borderRadius:'50%', background:`radial-gradient(ellipse, rgba(8,145,178,0.22) 0%, transparent 60%)`,
              pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-60, left:-60, width:280, height:280,
              borderRadius:'50%', background:`radial-gradient(ellipse, rgba(52,211,153,0.12) 0%, transparent 60%)`,
              pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>
              <Eyebrow color="#38bdf8">Start today</Eyebrow>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,50px)', fontWeight:900, color:'white',
                letterSpacing:'-1.6px', marginBottom:18, lineHeight:1.07 }}>
                The complete CLM platform.<br/>Built for everyone.
              </h2>
              <p style={{ fontSize:16, color:'rgba(255,255,255,0.52)', maxWidth:520,
                margin:'0 auto 40px', lineHeight:1.8 }}>
                Issue, monitor, renew and deploy SSL certificates automatically across every CA,
                every server. Start free in under 5 minutes. No credit card, no sales call.
              </p>
              <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                <PrimaryBtn onClick={()=>nav('/auth')}>Get Started Free →</PrimaryBtn>
                <SecondaryBtn onClick={()=>nav('/pricing')} light>View Pricing</SecondaryBtn>
                <SecondaryBtn onClick={()=>nav('/about')} light>Our Mission</SecondaryBtn>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${C.border}`, background:C.bg,
        padding:'32px 40px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:C.navy,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>SSLVault</span>
            <span style={{ fontSize:11, color:C.slateL }}>· PKI-first CLM · Made with ♥ in the Netherlands · Ad-free forever</span>
          </div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['About','/about'],
              ['Developer','/developer'],['Pricing','/pricing'],['Contact','/contact']].map(([l,p])=>(
              <button key={l} onClick={()=>nav(p)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12,
                  color:C.slateL, fontFamily:FONT, transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color=C.navy}
                onMouseLeave={e=>e.target.style.color=C.slateL}>{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
