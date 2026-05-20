// Home.jsx — SSLVault landing page
// Direction: Editorial precision. Linear/Vercel/Stripe DNA.
// Dark hero → light sections → dark mission → light CTA
// No illustrations. No emoji. No competition bashing.
// Typography does the heavy lifting.
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const F = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

// ── Palette ──────────────────────────────────────────────────────────
const C = {
  ink:     '#0a0e1a',   // near-black hero bg
  inkMid:  '#111827',
  inkLt:   '#1e293b',
  navy:    '#0f2545',
  teal:    '#0ea5e9',   // sky-500 — primary accent
  tealDk:  '#0284c7',
  tealXl:  '#e0f2fe',
  green:   '#10b981',
  amber:   '#f59e0b',
  purple:  '#8b5cf6',
  border:  '#e2e8f0',
  borderDk:'rgba(255,255,255,0.08)',
  text:    '#0f172a',
  textMid: '#475569',
  textLt:  '#94a3b8',
  bg:      '#f8fafc',
  white:   '#ffffff',
}

// ── Scroll reveal ─────────────────────────────────────────────────────
function useIn(threshold=0.12) {
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

function FadeUp({ children, delay=0, className='' }) {
  const [ref, v] = useIn()
  return (
    <div ref={ref} className={className} style={{
      opacity: v?1:0,
      transform: v?'translateY(0)':'translateY(18px)',
      transition: `opacity .6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms`
    }}>
      {children}
    </div>
  )
}

// ── Shared primitives ────────────────────────────────────────────────
function Tag({ children, dark }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      fontSize:11, fontWeight:600, letterSpacing:'0.06em',
      textTransform:'uppercase', fontFamily:MONO,
      color: dark?'rgba(255,255,255,0.45)':'#64748b',
      borderBottom: `1px solid ${dark?'rgba(255,255,255,0.12)':'#e2e8f0'}`,
      paddingBottom:2, marginBottom:20,
    }}>
      {children}
    </span>
  )
}

function NavLink({ label, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        background:'none', border:'none', cursor:'pointer',
        fontFamily:F, fontSize:13.5, fontWeight:450,
        color: h?C.text:'#64748b',
        transition:'color .15s',
      }}>{label}</button>
  )
}

function CTA({ label, onClick, variant='primary', size='md' }) {
  const [h, setH] = useState(false)
  const px = size==='sm' ? '14px 20px' : '12px 22px'
  const fs = size==='sm' ? 13 : 14

  if (variant==='primary') return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        fontFamily:F, fontWeight:600, fontSize:fs, padding:px,
        borderRadius:8, border:'none', cursor:'pointer',
        background: h?C.tealDk:C.teal, color:'white',
        boxShadow: h?`0 8px 24px ${C.teal}44`:`0 2px 8px ${C.teal}33`,
        transition:'all .17s cubic-bezier(.16,1,.3,1)',
      }}>
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  )

  if (variant==='ghost-dark') return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        fontFamily:F, fontWeight:500, fontSize:fs, padding:px,
        borderRadius:8, cursor:'pointer',
        border:'1px solid rgba(255,255,255,0.15)',
        background: h?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)',
        color: h?'white':'rgba(255,255,255,0.65)',
        transition:'all .17s',
      }}>
      {label}
    </button>
  )

  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        fontFamily:F, fontWeight:500, fontSize:fs, padding:px,
        borderRadius:8, cursor:'pointer',
        border:`1px solid ${h?C.teal:C.border}`,
        background: h?C.tealXl:C.white,
        color: h?C.tealDk:C.text,
        transition:'all .17s',
      }}>
      {label}
    </button>
  )
}

// ── Feature row — terminal card ──────────────────────────────────────
function TerminalCard({ title, lines, accent='#10b981' }) {
  return (
    <div style={{
      background:'#0f1117', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:12, overflow:'hidden',
      boxShadow:'0 24px 48px rgba(0,0,0,0.35)',
    }}>
      {/* window chrome */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', gap:7 }}>
        {['#ff5f57','#ffbd2e','#28ca41'].map(c=>(
          <span key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:.8 }}/>
        ))}
        <span style={{ marginLeft:8, fontSize:11, fontFamily:MONO, color:'rgba(255,255,255,0.25)' }}>{title}</span>
      </div>
      <div style={{ padding:'18px 20px', fontFamily:MONO, fontSize:12, lineHeight:2 }}>
        {lines.map((l,i)=>(
          <div key={i} style={{ color: l.c || 'rgba(255,255,255,0.55)' }}>
            {l.prefix && <span style={{ color:'rgba(255,255,255,0.2)', userSelect:'none' }}>{l.prefix}</span>}
            {l.t}
            {l.val && <span style={{ color:accent, fontWeight:600 }}>{l.val}</span>}
            {l.tail}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────
function Metric({ val, label, sub, accent=C.teal }) {
  return (
    <div style={{ borderTop:`2px solid ${accent}22`, paddingTop:20 }}>
      <div style={{ fontSize:36, fontWeight:700, color:C.white,
        letterSpacing:'-1.5px', lineHeight:1, marginBottom:6, fontFamily:MONO }}>{val}</div>
      <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.5)', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:MONO }}>{sub}</div>
    </div>
  )
}

// ── Feature section ───────────────────────────────────────────────────
function FeatureBlock({ tag, headline, body, items, card, reverse, accentColor=C.teal }) {
  return (
    <FadeUp>
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:'80px', alignItems:'center', marginBottom:120,
        ...(reverse ? { direction:'rtl' } : {}),
      }}>
        <div style={{ direction:'ltr' }}>
          <Tag>{tag}</Tag>
          <h3 style={{ fontSize:'clamp(22px,2.4vw,32px)', fontWeight:700,
            letterSpacing:'-0.8px', lineHeight:1.2, color:C.text, marginBottom:20 }}>
            {headline}
          </h3>
          <p style={{ fontSize:16, color:C.textMid, lineHeight:1.85, marginBottom:28 }}>
            {body}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {items.map(it=>(
              <div key={it} style={{ display:'flex', alignItems:'flex-start', gap:11 }}>
                <span style={{
                  width:18, height:18, borderRadius:'50%',
                  background:accentColor+'18', border:`1px solid ${accentColor}30`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, marginTop:2,
                }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l2.8 3L10 3" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span style={{ fontSize:14, color:C.text, lineHeight:1.6 }}>{it}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ direction:'ltr' }}>
          {card}
        </div>
      </div>
    </FadeUp>
  )
}

// ── Data ──────────────────────────────────────────────────────────────
const CAPABILITIES = [
  'Certificate issuance — DV, OV, EV, Wildcard, SAN',
  'Auto DNS validation via Cloudflare, Vercel, GoDaddy',
  'VPS agent deployment — zero-touch renewal',
  'cPanel and Plesk auto-install',
  'CA connectors — DigiCert CertCentral, Sectigo, GoGetSSL',
  'CertCentral-style portfolio — search, filter, expiry timeline',
  'Order details panel — SANs, serial, PQC risk, revoke',
  'Multi-tenant reseller platform — master admin · sub-reseller · end customer',
  'Shadow IT discovery — certs issued outside your CLM',
  'PQC readiness scanner — NIST 2030 risk scoring',
  'Private key vault — copy-only reveal, 30s timer, AES-256-GCM',
  'Immutable audit log — every key access and cert action',
  'TLS posture grading — A to F per domain',
  'Email and Slack alerts — configurable thresholds',
  'CA consolidation advisor — identify cost savings',
  'Admin signup approval — every new account reviewed before access',
]

const PLATFORMS = ['Cloudflare','Vercel','GoDaddy','DigitalOcean','Nginx','Apache','cPanel','Plesk','DigiCert','Sectigo','SSL.com','GoGetSSL']

const ETHICS_ITEMS = [
  {
    n:'01',
    title:'The platform is free. Not "freemium". Not "free trial". Free.',
    body:'Certificate issuance, monitoring, agents, auto-renewal, CA connectors, PQC scanning — all free. You pay for certificates at wholesale rates. Nothing else. No upgrade prompts. No feature walls. No per-seat fees that appear six months later.',
  },
  {
    n:'02',
    title:'Your private keys stay on your servers unless you choose otherwise.',
    body:'SSLVault never requires access to your private keys. If you opt in to KeyLocker, keys are encrypted with AES-256-GCM before leaving your browser. Reveal is copy-only with a 30-second auto-hide timer. Every access generates an immutable audit log entry with user, domain, and timestamp. You can export and delete at any time.',
  },
  {
    n:'03',
    title:'No ads. No tracking beyond what the product requires. No selling data.',
    body:"The product is the platform. You're not the product. We don't run ads, don't share your data with third parties, and don't build profiles for resale. The only data we store is what's required to issue, monitor and renew your certificates.",
  },
  {
    n:'04',
    title:'Built for the people the enterprise tools ignore.',
    body:"Venafi and Keyfactor are excellent products. They're built for teams with $250k security budgets. SSLVault is built for the developer running 12 side projects, the SMB that can't afford enterprise procurement, the non-profit that just needs the padlock to stay green — and the reseller who wants to offer CLM to their customers without building it from scratch.",
  },
]

// ── WatermarkGrid — tiled PKI symbols filling white sections ────────
// symbols: shield, lock, certificate, key, refresh(renew), checkmark, globe
const WM_SYMBOLS = [
  // Shield
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  // Lock
  <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  // Certificate / ribbon
  <><circle cx="12" cy="8" r="5"/><path d="M9 13.5L12 22l3-8.5"/></>,
  // Key
  <><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/></>,
  // Refresh / renew
  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>,
  // Check circle
  <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  // Globe / domain
  <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  // Server
  <><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>,
]

function WatermarkGrid({ color = '#0ea5e9', opacity = 0.045, spacing = 80, size = 22 }) {
  const cols = Math.ceil(1400 / spacing) + 2
  const rows = Math.ceil(600  / spacing) + 2
  const total = cols * rows

  return (
    <div style={{
      position:'absolute', inset:0, overflow:'hidden',
      pointerEvents:'none', userSelect:'none',
    }}>
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(${cols}, ${spacing}px)`,
        gridTemplateRows:`repeat(${rows}, ${spacing}px)`,
        width: cols * spacing,
        height: rows * spacing,
        opacity,
        marginLeft:`-${Math.floor(spacing/2)}px`,
        marginTop:`-${Math.floor(spacing/2)}px`,
      }}>
        {Array.from({ length: total }).map((_, i) => {
          const sym = WM_SYMBOLS[i % WM_SYMBOLS.length]
          const rotate = (i * 17) % 360
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              transform:`rotate(${rotate}deg)`,
            }}>
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
                stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {sym}
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ShowcaseTabs — Owlish-style: 3D tilt entrance, sliding indicator, crossfade panels ──
const TABS = [
  { id:'inventory',  label:'Inventory'        },
  { id:'readiness',  label:'47-day readiness' },
  { id:'calendar',   label:'Renewal calendar' },
  { id:'security',   label:'CT monitor'       },
]

function ShowcaseTabs({ nav }) {
  const [active, setActive]     = useState('inventory')
  const [prev,   setPrev]       = useState(null)
  const [mounted, setMounted]   = useState(false)
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabRefs  = useRef({})
  const pillRef  = useRef(null)

  // Entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Slide indicator to active tab
  useEffect(() => {
    const el  = tabRefs.current[active]
    const bar = pillRef.current
    if (!el || !bar) return
    const barRect = bar.getBoundingClientRect()
    const elRect  = el.getBoundingClientRect()
    setIndicatorStyle({
      width:  elRect.width,
      transform: `translateX(${elRect.left - barRect.left - 4}px)`,
    })
  }, [active])

  const switchTab = (id) => {
    if (id === active) return
    setPrev(active)
    setActive(id)
  }

  const panels = {
    inventory: (
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {[
            { n:'12', l:'Active certs',    c:C.teal   },
            { n:'10', l:'Auto-renewing',   c:'#34d399' },
            { n:'2',  l:'Expiring ≤30d',   c:C.amber  },
            { n:'A+', l:'Avg TLS grade',   c:C.purple },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background:C.bg, borderRadius:8, padding:'12px 14px',
              border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:22, fontWeight:800, color:c, fontFamily:MONO }}>{n}</div>
              <div style={{ fontSize:10, color:C.textLt, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
        {[
          { d:'easysecurity.in',   s:'Active · 196d',  sc:'#16a34a', sb:'#f0fdf4', i:'RapidSSL · Auto ✓'      },
          { d:'freecerts.site',    s:'Active · 196d',  sc:'#16a34a', sb:'#f0fdf4', i:'RapidSSL · Auto ✓'      },
          { d:'api.myshop.com',    s:'Expiring · 18d', sc:'#d97706', sb:'#fffbeb', i:"Let's Encrypt · Manual"  },
          { d:'portal.client.com', s:'Issued today',   sc:'#2563eb', sb:'#eff6ff', i:'DigiCert · Agent ✓'     },
        ].map(({ d, s, sc, sb, i }) => (
          <div key={d} style={{ display:'flex', alignItems:'center', gap:14,
            padding:'10px 12px', borderRadius:8, marginBottom:6,
            background:C.bg, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.ink, flex:1 }}>{d}</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px',
              borderRadius:10, background:sb, color:sc }}>{s}</span>
            <span style={{ fontSize:11, color:C.textLt }}>{i}</span>
          </div>
        ))}
      </div>
    ),

    readiness: (
      <div>
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
          padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize:12, color:'#b91c1c' }}>
            <strong>25 days</strong> until March 2026 — max cert validity drops to 200 days. 3 certs at risk.
          </span>
        </div>
        {[
          { score:95, d:'easysecurity.in',   st:'Ready',      sc:'#16a34a', sb:'#f0fdf4', sb2:'#dcfce7', checks:'✓ Auto-renew · ✓ DNS · ✓ Agent · ✓ 200d compliant' },
          { score:65, d:'api.myshop.com',    st:'At risk',    sc:'#d97706', sb:'#fffbeb', sb2:'#fef9c3', checks:'✗ No agent · ✗ No DNS provider connected'           },
          { score:30, d:'legacy.oldsite.com',st:'Will break', sc:'#dc2626', sb:'#fef2f2', sb2:'#fee2e2', checks:'✗ Manual renewal · ✗ 365d cert · ✗ No automation'    },
        ].map(({ score, d, st, sc, sb, sb2, checks }) => (
          <div key={d} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 12px',
            borderRadius:8, marginBottom:6, background:sb,
            border:`0.5px solid ${sc}44` }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:sb2, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:sc }}>{score}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{d}</div>
              <div style={{ fontSize:10, color:sc, marginTop:2 }}>{checks}</div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px',
              borderRadius:10, background:'white', color:sc, border:`1px solid ${sc}44`,
              flexShrink:0 }}>{st}</span>
          </div>
        ))}
      </div>
    ),

    calendar: (
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', gap:6 }}>
            {['Month','Week','Year'].map((v,i) => (
              <span key={v} style={{ fontSize:11, padding:'5px 14px', borderRadius:20,
                background:i===0?C.ink:'transparent', color:i===0?'white':'#64748b',
                border:i===0?'none':'1px solid #e2e8f0', fontWeight:i===0?600:400,
                cursor:'pointer' }}>{v}</span>
            ))}
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>December 2026</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:2 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
            <div key={d} style={{ fontSize:9, fontWeight:600, textAlign:'center',
              color:'#94a3b8', padding:'3px 0', textTransform:'uppercase' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {[null,null].map((_,i)=>(
            <div key={`e${i}`} style={{ height:52, borderRadius:5, background:'#f8fafc', opacity:0.4 }}/>
          ))}
          {Array.from({length:31},(_,i)=>{
            const d=i+1
            const certs={2:'#16a34a',3:'#16a34a',11:'#d97706',19:'#d97706',22:'#16a34a',28:'#16a34a'}
            const c=certs[d], isT=d===20
            return (
              <div key={d} style={{ height:52, borderRadius:5, padding:'4px 3px',
                background:c?`${c}14`:isT?'#eff6ff':'#f8fafc',
                border:`0.5px solid ${c?`${c}44`:isT?'#93c5fd':'#f1f5f9'}` }}>
                <div style={{ fontSize:9, fontWeight:600,
                  color:c||isT?c||'#2563eb':'#94a3b8' }}>{d}</div>
                {c && <div style={{ height:3, borderRadius:2, background:c, marginTop:3 }}/>}
              </div>
            )
          })}
        </div>
      </div>
    ),

    security: (
      <div>
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
          padding:'11px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:12, color:'#b91c1c' }}>
            <strong>3 unauthorised certificates</strong> detected for your domains via CT logs
          </span>
        </div>
        {[
          { d:'freecerts.site',    ca:"Let's Encrypt — not issued by SSLVault", sc:'#dc2626', sb:'#fef2f2', st:'Unknown'    },
          { d:'api.myshop.com',    ca:'Sectigo — CA not in your approved list',  sc:'#d97706', sb:'#fffbeb', st:'Suspicious' },
          { d:'easysecurity.in',   ca:'RapidSSL — issued via SSLVault #10041',   sc:'#16a34a', sb:'#f0fdf4', st:'Known'      },
          { d:'portal.client.com', ca:'DigiCert — verified CA connector',        sc:'#16a34a', sb:'#f0fdf4', st:'Known'      },
        ].map(({ d, ca, sc, sb, st }) => (
          <div key={d} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
            borderRadius:8, marginBottom:6, background:sb,
            borderLeft:`3px solid ${sc}` }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{d}</div>
              <div style={{ fontSize:10, color:sc, marginTop:2 }}>{ca}</div>
            </div>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px',
              borderRadius:10, background:'white', color:sc,
              border:`1px solid ${sc}44`, flexShrink:0 }}>{st.toUpperCase()}</span>
          </div>
        ))}
      </div>
    ),
  }

  return (
    <div style={{
      transform: mounted ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
      opacity:   mounted ? 1 : 0,
      transition:'transform .7s cubic-bezier(.16,1,.3,1), opacity .6s ease',
    }}>

      {/* ── Floating pill tab nav ── */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
        <div ref={pillRef} style={{
          display:'flex', background:'white',
          border:`1px solid ${C.border}`, borderRadius:40,
          padding:4, gap:0,
          boxShadow:'0 2px 20px rgba(15,23,42,0.09)',
          position:'relative',
        }}>
          {/* Sliding background pill */}
          <div style={{
            position:'absolute', top:4, left:4, height:'calc(100% - 8px)',
            background:C.ink, borderRadius:36,
            transition:'transform .28s cubic-bezier(.16,1,.3,1), width .28s cubic-bezier(.16,1,.3,1)',
            ...indicatorStyle,
            pointerEvents:'none',
          }}/>
          {TABS.map(t => (
            <button key={t.id}
              ref={el => tabRefs.current[t.id] = el}
              onClick={() => switchTab(t.id)}
              style={{
                fontSize:13, fontWeight:500,
                padding:'8px 22px', borderRadius:36, cursor:'pointer',
                fontFamily:F, position:'relative', zIndex:1,
                background:'transparent', border:'none',
                color: active===t.id ? 'white' : C.textMid,
                transition:'color .2s ease',
                whiteSpace:'nowrap',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── App window — 3D perspective tilt ── */}
      <div style={{
        perspective:'1200px',
        maxWidth:900, margin:'0 auto',
        position:'relative', zIndex:2,
      }}>
        <div style={{
          background:'white', borderRadius:14,
          border:`1px solid ${C.border}`,
          boxShadow:'0 40px 100px rgba(15,23,42,0.13), 0 8px 32px rgba(15,23,42,0.07)',
          overflow:'hidden',
          transform: mounted ? 'rotateX(1.5deg)' : 'rotateX(6deg)',
          transformOrigin:'top center',
          transition:'transform .8s cubic-bezier(.16,1,.3,1)',
        }}>
          {/* Browser chrome bar */}
          <div style={{
            background:'#f1f5f9', borderBottom:`1px solid ${C.border}`,
            padding:'9px 14px', display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{ display:'flex', gap:5 }}>
              {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>
              ))}
            </div>
            {/* URL bar */}
            <div style={{
              flex:1, background:'white', border:`1px solid ${C.border}`,
              borderRadius:6, padding:'4px 10px',
              fontSize:11, color:'#94a3b8', fontFamily:MONO,
              marginLeft:6, marginRight:6, display:'flex', alignItems:'center', gap:7,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              easysecurity.in
              <span style={{ color:'#cbd5e1', margin:'0 2px' }}>·</span>
              <span style={{ transition:'opacity .2s' }}>
                {TABS.find(t=>t.id===active)?.label}
              </span>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {/* Fake avatar + badge */}
              <div style={{ width:22, height:22, borderRadius:'50%', background:'#0d3c6e',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:9, fontWeight:700, color:'white' }}>M</div>
            </div>
          </div>

          {/* App chrome — sidebar + content */}
          <div style={{ display:'flex', minHeight:380 }}>
            {/* SSLVault sidebar — matches real app */}
            <div style={{ width:48, background:'#0d3c6e', display:'flex',
              flexDirection:'column', alignItems:'center', paddingTop:14, gap:14, flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:5, background:'#0e7fc0',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              {[
                { active: active==='inventory'||active==='readiness', color:C.teal },
                { active: false,                                       color:'#64748b' },
                { active: active==='security',                         color:C.teal },
                { active: active==='calendar',                         color:'#64748b' },
              ].map((s,i)=>(
                <div key={i} style={{ width:28, height:28, borderRadius:6,
                  background: s.active ? 'rgba(14,127,192,0.25)' : 'transparent',
                  borderLeft: s.active ? '2px solid #00a3e0' : '2px solid transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .2s' }}>
                  <div style={{ width:10, height:10, borderRadius:2,
                    background: s.active ? s.color : '#475569', opacity: s.active?1:0.4 }}/>
                </div>
              ))}
            </div>

            {/* Content panel with crossfade */}
            <div style={{ flex:1, padding:'18px 22px', overflowX:'hidden',
              position:'relative', background:'white' }}>
              <div
                key={active}
                style={{ animation:'owlishFade .28s cubic-bezier(.16,1,.3,1)' }}
              >
                {panels[active]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA below ── */}
      <div style={{ textAlign:'center', paddingTop:40, paddingBottom:80, position:'relative', zIndex:2 }}>
        <button onClick={()=>nav('/auth')} style={{
          fontSize:14, fontWeight:600, padding:'13px 30px', borderRadius:9,
          background:C.ink, color:'white', border:'none', cursor:'pointer',
          fontFamily:F, transition:'all .17s',
          boxShadow:'0 4px 16px rgba(10,14,26,0.2)',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(10,14,26,0.28)' }}
          onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)';   e.currentTarget.style.boxShadow='0 4px 16px rgba(10,14,26,0.2)'  }}>
          Get started free →
        </button>
        <div style={{ fontSize:12, color:C.textLt, marginTop:10 }}>
          Free forever for indie, SMB &amp; non-profit · No credit card required
        </div>
      </div>
    </div>
  )
}

export default function Home({ nav }) {
  const [certCount, setCertCount] = useState(null)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    supabase.from('certificates')
      .select('id', { count:'exact', head:true })
      .eq('status','active')
      .then(({ count:c }) => { if (c) setCertCount(c) })
  }, [])

  useEffect(() => {
    if (!certCount) return
    let n = 0
    const step = Math.ceil(certCount / 50)
    const iv = setInterval(() => {
      n = Math.min(n + step, certCount)
      setDisplayCount(n)
      if (n >= certCount) clearInterval(iv)
    }, 25)
    return () => clearInterval(iv)
  }, [certCount])

  return (
    <div style={{ fontFamily:F, background:C.white, color:C.text, overflowX:'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#0ea5e922; color:#0284c7 }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes owlishFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(255,255,255,0.88)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(15,23,42,0.06)',
        padding:'0 40px', height:56,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}
          onClick={()=>nav('/')}>
          <div style={{
            width:28, height:28, background:C.ink, borderRadius:7,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.3px', color:C.ink }}>SSLVault</span>
          <span style={{ fontSize:10, fontFamily:MONO, color:'#94a3b8',
            background:'#f1f5f9', border:'1px solid #e2e8f0',
            borderRadius:4, padding:'2px 6px', letterSpacing:'0.04em' }}>CLM</span>
        </div>

        <nav style={{ display:'flex', alignItems:'center', gap:28 }}>
          {[
            ['Platform','#platform'],
            ['How it works','#workflow'],
            ['Mission','#mission'],
            ['Pricing','/pricing'],
          ].map(([l,h])=>(
            <NavLink key={l} label={l} onClick={()=>{
              if (h.startsWith('/')) nav(h)
              else document.querySelector(h)?.scrollIntoView({ behavior:'smooth' })
            }}/>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <CTA label="Sign in" variant="ghost" onClick={()=>nav('/auth')} size="sm"/>
          <CTA label="Get started free" variant="primary" onClick={()=>nav('/auth')} size="sm"/>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        background: C.white,
        padding:'110px 40px 90px',
        position:'relative', overflow:'hidden',
        borderBottom:`1px solid ${C.border}`,
      }}>
        {/* Subtle dot grid — same vibe as the Platform section's clean white */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:`radial-gradient(circle, ${C.teal}22 1px, transparent 1px)`,
          backgroundSize:'32px 32px',
          maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage:'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
          opacity:0.5,
        }}/>

        {/* Floating cert status pills — scattered, very low opacity */}
        {[
          { t:'✓  easysecurity.in renewed', c:'#10b981', x:'8%',  y:'18%', r:'-6deg'  },
          { t:'✓  Agent installed · Nginx',  c:'#0ea5e9', x:'72%', y:'12%', r:'5deg'   },
          { t:'⚠  api.shop.com · 18d left',  c:'#f59e0b', x:'82%', y:'72%', r:'-4deg'  },
          { t:'✓  TLS grade A+ · HSTS on',   c:'#8b5cf6', x:'4%',  y:'74%', r:'4deg'   },
        ].map(({ t, c, x, y, r }) => (
          <div key={t} style={{
            position:'absolute', left:x, top:y,
            transform:`rotate(${r})`,
            display:'flex', alignItems:'center', gap:7,
            background:'white',
            border:`1px solid ${c}33`,
            borderRadius:8, padding:'7px 12px',
            fontSize:11, fontFamily:MONO, color:c,
            fontWeight:600, whiteSpace:'nowrap',
            opacity:0.22,
            boxShadow:`0 2px 12px ${c}18`,
            pointerEvents:'none',
          }}>{t}</div>
        ))}

        <div style={{ maxWidth:860, margin:'0 auto', position:'relative', textAlign:'center' }}>
          {/* Eyebrow */}
          <FadeUp>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              marginBottom:28,
              background:`${C.teal}0d`,
              border:`1px solid ${C.teal}28`,
              borderRadius:20, padding:'6px 14px',
            }}>
              <span style={{
                width:6, height:6, borderRadius:'50%', background:'#34d399', flexShrink:0,
                boxShadow:'0 0 0 3px rgba(52,211,153,0.18)',
                animation:'pulse2 2.4s ease infinite',
              }}/>
              <span style={{ fontSize:12, fontFamily:MONO, color:C.teal, letterSpacing:'0.05em', fontWeight:500 }}>
                Certificate Lifecycle Management · Free forever
              </span>
            </div>
          </FadeUp>

          {/* Headline */}
          <FadeUp delay={60}>
            <h1 style={{
              fontSize:'clamp(44px,7vw,84px)', fontWeight:800,
              letterSpacing:'-3px', lineHeight:1.0,
              color:C.ink, marginBottom:24,
            }}>
              SSL certificates.<br/>
              <span style={{ color:C.teal }}>Fully automated.</span>
            </h1>
          </FadeUp>

          {/* Sub */}
          <FadeUp delay={120}>
            <p style={{
              fontSize:'clamp(16px,1.8vw,19px)', color:C.textMid,
              lineHeight:1.8, maxWidth:580, margin:'0 auto 44px',
              fontWeight:400,
            }}>
              The complete CLM platform — issue, validate, deploy, monitor and renew
              certificates across every CA and every server.
              Built for developers, SMBs, and non-profits.
            </p>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={160}>
            <div style={{
              display:'flex', gap:12, justifyContent:'center',
              flexWrap:'wrap', marginBottom:72,
            }}>
              <CTA label="Get started free" variant="primary" onClick={()=>nav('/auth')}/>
              <CTA label="View pricing" onClick={()=>nav('/pricing')}/>
            </div>
          </FadeUp>

          {/* Stats — light version */}
          <FadeUp delay={200}>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(3,1fr)',
              maxWidth:560, margin:'0 auto',
              borderTop:`1px solid ${C.border}`,
            }}>
              {[
                { val: certCount ? `${displayCount.toLocaleString()}+` : '—', label:'Active certificates', sub:'tracked across all CAs', accent:C.teal },
                { val:'~5 min', label:'DV issuance time', sub:'GoGetSSL · DigiCert chain', accent:'#10b981' },
                { val:'$0',     label:'Platform cost',    sub:'certs from $8 / yr',        accent:C.amber  },
              ].map(({ val, label, sub, accent }, i) => (
                <div key={label} style={{
                  padding:'24px 0 0',
                  borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
                  paddingLeft: i > 0 ? 28 : 0,
                  textAlign: 'left',
                }}>
                  <div style={{ fontSize:32, fontWeight:800, color:accent,
                    letterSpacing:'-1px', lineHeight:1, marginBottom:6, fontFamily:MONO }}>{val}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:11, color:C.textLt, fontFamily:MONO }}>{sub}</div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PARTNERS TICKER ─────────────────────────────────────────── */}
      <div style={{
        borderTop:'1px solid rgba(15,23,42,0.06)',
        borderBottom:'1px solid rgba(15,23,42,0.06)',
        background:C.bg, overflow:'hidden', padding:'14px 0',
      }}>
        <div style={{ display:'flex', overflow:'hidden', maskImage:'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div style={{ display:'flex', gap:56, flexShrink:0, animation:'ticker 28s linear infinite', whiteSpace:'nowrap' }}>
            {[...PLATFORMS,...PLATFORMS].map((p,i)=>(
              <span key={i} style={{ fontSize:12, fontWeight:600, color:'#94a3b8', letterSpacing:'0.02em' }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRODUCT SHOWCASE — Owlish-inspired ──────────────────────── */}
      <section style={{
        background: '#f0f4f8',
        padding: '100px 40px 0',
        borderTop: `1px solid ${C.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Misty mountain SVG background */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '55%', pointerEvents: 'none', overflow: 'hidden',
        }}>
          <svg viewBox="0 0 1440 300" preserveAspectRatio="none"
            style={{ width:'100%', height:'100%', display:'block' }}>
            <defs>
              <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dde6f0" stopOpacity="0"/>
                <stop offset="100%" stopColor="#c8d8e8" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            {/* Far mountains */}
            <path d="M0,220 L80,160 L160,195 L260,130 L360,170 L460,110 L560,150 L660,95 L760,140 L860,105 L960,145 L1060,90 L1160,135 L1260,100 L1360,140 L1440,115 L1440,300 L0,300 Z"
              fill="#c5d5e5" opacity="0.5"/>
            {/* Mid mountains */}
            <path d="M0,250 L100,195 L200,220 L320,165 L440,200 L560,155 L680,190 L800,148 L920,182 L1040,150 L1160,180 L1280,158 L1380,185 L1440,170 L1440,300 L0,300 Z"
              fill="#b0c4d8" opacity="0.55"/>
            {/* Near mountains */}
            <path d="M0,280 L120,235 L240,258 L380,210 L500,242 L640,205 L760,235 L900,210 L1020,240 L1160,215 L1300,245 L1440,225 L1440,300 L0,300 Z"
              fill="#9ab4cc" opacity="0.6"/>
            {/* Ground */}
            <path d="M0,290 L1440,285 L1440,300 L0,300 Z"
              fill="#8aaabf" opacity="0.4"/>
          </svg>
        </div>

        <div style={{ maxWidth:1000, margin:'0 auto', position:'relative', zIndex:2 }}>
          {/* Label */}
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <span style={{
                fontSize:11, fontFamily:MONO, fontWeight:600,
                letterSpacing:'0.07em', textTransform:'uppercase',
                color:'#64748b',
              }}>Platform</span>
            </div>
            <h2 style={{
              textAlign:'center', fontSize:'clamp(28px,3.5vw,46px)',
              fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.08,
              color:C.ink, marginBottom:10,
            }}>
              Everything PKI.<br/>Nothing unnecessary.
            </h2>
            <p style={{
              textAlign:'center', fontSize:16, color:C.textMid,
              maxWidth:480, margin:'0 auto 40px', lineHeight:1.7,
            }}>
              One platform for the full certificate lifecycle —
              issue, install, monitor, comply.
            </p>
          </FadeUp>

          {/* ── Floating pill tab nav (the Owlish element) ── */}
          <ShowcaseTabs nav={nav}/>
        </div>
      </section>

      {/* ── CAPABILITY LIST ──────────────────────────────────────────── */}
      <section id="platform" style={{ background:C.white, padding:'100px 40px', position:'relative', overflow:'hidden' }}>
        <WatermarkGrid color={C.teal} opacity={0.042} spacing={76} size={20}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <FadeUp>
            <div style={{ marginBottom:60 }}>
              <Tag>Platform</Tag>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,48px)', fontWeight:800,
                letterSpacing:'-1.5px', lineHeight:1.08, color:C.text, maxWidth:640 }}>
                Every tool a PKI team needs.<br/>
                Without the enterprise procurement.
              </h2>
            </div>
          </FadeUp>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 80px' }}>
            {CAPABILITIES.map((c,i)=>(
              <FadeUp key={c} delay={i*30}>
                <div style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'16px 0',
                  borderBottom:`1px solid ${C.border}`,
                }}>
                  <span style={{
                    width:20, height:20, borderRadius:'50%',
                    background:C.teal+'15', border:`1px solid ${C.teal}25`,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l2.8 3L10 3" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span style={{ fontSize:14, color:C.text, fontWeight:450 }}>{c}</span>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE DEEP-DIVES ───────────────────────────────────────── */}
      <section style={{ background:C.bg, padding:'100px 40px 20px', borderTop:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
        <WatermarkGrid color="#0ea5e9" opacity={0.028} spacing={96} size={22}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>

          {/* Feature 1 — Zero-touch lifecycle */}
          <FeatureBlock
            tag="Zero-touch lifecycle"
            headline="Issue, validate, deploy and renew — without a single manual step."
            body="Agents run on your servers as lightweight daemons, polling every 5 minutes for pending jobs. DNS challenges are resolved automatically via your connected provider. Certificates are installed before expiry. If anything fails, atomic rollback fires and you're notified immediately."
            items={[
              'DV, OV, EV, Wildcard and multi-domain SAN certificates',
              'Automatic DNS-01 challenge via Cloudflare, Vercel, GoDaddy, DigitalOcean',
              'VPS agent installs to Nginx and Apache — auto-restarts service after install',
              'cPanel and Plesk one-click install for shared hosting',
              'Renewal triggered 1 day before expiry — no human required',
            ]}
            accentColor={C.teal}
            card={
              <TerminalCard
                title="agent · easysecurity.in"
                accent="#34d399"
                lines={[
                  { t:'Polling for jobs...', c:'rgba(255,255,255,0.25)' },
                  { prefix:'→ ', t:'Job received: ', val:'renew', tail:' cert for easysecurity.in', c:'rgba(255,255,255,0.6)' },
                  { prefix:'→ ', t:'DNS provider: ', val:'Cloudflare', c:'rgba(255,255,255,0.6)' },
                  { prefix:'→ ', t:'TXT record added in ', val:'1.2s', c:'rgba(255,255,255,0.6)' },
                  { prefix:'→ ', t:'DCV validated. Cert issued.', c:'#34d399' },
                  { prefix:'→ ', t:'Installing to nginx...', c:'rgba(255,255,255,0.4)' },
                  { prefix:'→ ', t:'Service reloaded. ', val:'✓ Live', c:'#34d399' },
                  { t:' ', c:'transparent' },
                  { t:'Next check in 5 minutes.', c:'rgba(255,255,255,0.18)' },
                ]}
              />
            }
          />

          {/* Feature 2 — CA intelligence */}
          <FeatureBlock
            reverse
            tag="CA-agnostic intelligence"
            headline="One view of your entire certificate estate — regardless of who issued them."
            body="Full CertCentral-style portfolio inside SSLVault — connect DigiCert, Sectigo and GoGetSSL via API. Search, filter, and click any certificate for a full details panel: SANs, serial number, key algorithm, PQC risk score. Renew via SSLVault or directly at the CA. Shadow IT scanner surfaces certs issued outside your CLM before they expire silently. Daily auto-sync keeps your portfolio current."
            items={[
              'DigiCert CertCentral portfolio — search, filter, expiry timeline, order details',
              'Click any cert → slide-over panel with SANs, serial, PQC risk, revoke',
              'Renew via SSLVault (GoGetSSL) or open DigiCert directly — one click',
              'Unified expiry timeline: Expired · Critical · Warning · Upcoming · Healthy',
              'Shadow IT scan compares your CA portfolio against your CLM inventory',
              'Daily auto-sync cron — portfolio always current without manual refresh',
              'CA consolidation advisor identifies cost-saving certificate migrations',
            ]}
            accentColor={C.purple}
            card={
              <TerminalCard
                title="ca-intelligence · expiry-timeline"
                accent={C.purple}
                lines={[
                  { t:'Scanning connected CAs...', c:'rgba(255,255,255,0.25)' },
                  { t:' ', c:'transparent' },
                  { prefix:'✗ ', t:'2 certificates ', val:'EXPIRED', c:'#f87171' },
                  { prefix:'! ', t:'5 certificates ', val:'expiring < 7 days', c:'#fbbf24' },
                  { prefix:'~ ', t:'11 certificates ', val:'expiring < 30 days', c:'rgba(255,255,255,0.5)' },
                  { prefix:'✓ ', t:'38 certificates ', val:'healthy', c:'#34d399' },
                  { t:' ', c:'transparent' },
                  { prefix:'⊕ ', t:'Shadow IT scan: ', val:'3 unmanaged certs', tail:' found', c:'#a78bfa' },
                  { prefix:'⊕ ', t:'PQC risk: ', val:'14 RSA-2048 certs', tail:' flagged', c:'#a78bfa' },
                ]}
              />
            }
          />

          {/* Feature 4 — Multi-tenant reseller */}
          <FeatureBlock
            reverse
            tag="Multi-tenant reseller platform"
            headline="White-label CLM for resellers. Issue, monitor and manage certs for all your customers from one place."
            body="Three-tier architecture: master admin controls the platform, sub-resellers onboard their own customers, end customers manage their own certs through a branded portal. Every signup requires admin approval — no unauthorized access ever. Excel exports, custom portals, and invite-based onboarding included."
            items={[
              'Master admin → sub-reseller → end customer — full 3-tier hierarchy',
              'Invite-only onboarding — every new account reviewed and approved by you',
              'Reseller portal with customer list, cert inventory, and order history',
              'Admin approval emails — Approve or Reject directly from your inbox',
              'Excel export of full certificate portfolio and order data',
              'End customer portal — clean, scoped view of their own certs only',
            ]}
            accentColor={C.green}
            card={
              <TerminalCard
                title="account-manage · reseller-portal"
                accent={C.green}
                lines={[
                  { t:'New signup request:', c:'rgba(255,255,255,0.25)' },
                  { t:' ', c:'transparent' },
                  { prefix:'→ ', t:'user@customer.com ', val:'pending review', c:'#fbbf24' },
                  { t:' ', c:'transparent' },
                  { prefix:'✓ ', t:'Approved by admin ', val:'2 min ago', c:'#34d399' },
                  { prefix:'✓ ', t:'Welcome email ', val:'sent', c:'#34d399' },
                  { t:' ', c:'transparent' },
                  { prefix:'⊕ ', t:'Sub-resellers: ', val:'3 active', c:'rgba(255,255,255,0.5)' },
                  { prefix:'⊕ ', t:'End customers: ', val:'12 active', c:'rgba(255,255,255,0.5)' },
                ]}
              />
            }
          />

          {/* Feature 3 — Security posture */}
          <FeatureBlock
            tag="Security posture"
            headline="Know the cryptographic health of every domain you own."
            body="TLS grading across the full stack — cipher suites, protocol versions, HSTS headers, certificate chain correctness. PQC risk scanning flags every RSA-2048 cert against the NIST 2030 migration deadline. Private keys are protected with a 30-second timed reveal window — copy-only, no download, every access logged to an immutable audit trail."
            items={[
              'TLS grade A–F per domain — cipher, protocol, HSTS, OCSP stapling',
              'PQC readiness scanner — RSA-2048 and ECDSA-256 risk assessed',
              'Private key reveal — 30s countdown, copy-only, auto-hides, no screenshots',
              'Every key access logged: user, domain, timestamp — tamper-proof audit trail',
              'Admin signup approval — zero unauthorized access, every account reviewed',
              'Email and Slack alerts at configurable expiry thresholds',
            ]}
            accentColor={C.amber}
            card={
              <TerminalCard
                title="tls-grade · api.easysecurity.in"
                accent={C.amber}
                lines={[
                  { t:'TLS 1.3            ', val:'PASS', c:'rgba(255,255,255,0.55)' },
                  { t:'TLS 1.2            ', val:'PASS', c:'rgba(255,255,255,0.55)' },
                  { t:'TLS 1.0/1.1        ', val:'DISABLED', c:'#34d399' },
                  { t:'HSTS               ', val:'ENABLED', c:'#34d399' },
                  { t:'OCSP stapling      ', val:'ENABLED', c:'#34d399' },
                  { t:'Chain validity     ', val:'VALID', c:'#34d399' },
                  { t:'PQC risk           ', val:'LOW (ECDSA-384)', c:'#34d399' },
                  { t:' ', c:'transparent' },
                  { t:'Overall grade: ', val:'A', c:'rgba(255,255,255,0.6)' },
                ]}
              />
            }
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="workflow" style={{ background:C.white, padding:'100px 40px',
        borderTop:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
        <WatermarkGrid color="#10b981" opacity={0.038} spacing={88} size={18}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <FadeUp>
            <div style={{ marginBottom:64 }}>
              <Tag>Workflow</Tag>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,48px)', fontWeight:800,
                letterSpacing:'-1.5px', lineHeight:1.08, color:C.text }}>
                From zero to automated<br/>in under ten minutes.
              </h2>
            </div>
          </FadeUp>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
            {[
              { n:'01', title:'Connect', color:C.teal,
                desc:'Link DNS provider and server credentials once. Encrypted at rest. Never re-entered.' },
              { n:'02', title:'Issue', color:'#34d399',
                desc:'Order DV, OV or EV via GoGetSSL. DNS challenge resolved automatically. ~5 minutes to a live certificate.' },
              { n:'03', title:'Monitor', color:C.purple,
                desc:'Unified expiry timeline across all CAs. TLS grading. PQC scoring. Shadow IT detection.' },
              { n:'04', title:'Deploy', color:C.amber,
                desc:'Agent installs, restarts services, reports back. Atomic rollback on failure. Zero manual steps.' },
            ].map(({n,title,color,desc},i)=>(
              <FadeUp key={n} delay={i*60}>
                <div style={{
                  padding:'36px 28px',
                  borderLeft: i>0 ? `1px solid ${C.border}` : 'none',
                  height:'100%',
                }}>
                  <div style={{ fontSize:11, fontFamily:MONO, fontWeight:600,
                    color, letterSpacing:'0.08em', marginBottom:16 }}>{n}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:C.text,
                    letterSpacing:'-0.5px', marginBottom:14 }}>{title}</div>
                  <div style={{ fontSize:14, color:C.textMid, lineHeight:1.75 }}>{desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── 47-DAY CONTEXT ──────────────────────────────────────────── */}
      <section style={{
        background:C.ink, padding:'80px 40px',
        borderTop:'1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth:1100, margin:'0 auto',
          display:'grid', gridTemplateColumns:'1fr 320px', gap:80, alignItems:'center' }}>
          <FadeUp>
            <div>
              <span style={{
                display:'inline-block', fontSize:10, fontFamily:MONO,
                fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase',
                color:C.amber, background:`${C.amber}18`, border:`1px solid ${C.amber}33`,
                borderRadius:4, padding:'4px 10px', marginBottom:24,
              }}>
                CA/B Forum · SC-081v3 · In effect March 2026
              </span>
              <h2 style={{ fontSize:'clamp(24px,3vw,38px)', fontWeight:700,
                letterSpacing:'-1px', lineHeight:1.15, color:C.white, marginBottom:18 }}>
                Certificate validity is shrinking to 100 days.<br/>
                Manual renewal is no longer viable.
              </h2>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.42)', lineHeight:1.82, maxWidth:520 }}>
                CA/Browser Forum Ballot SC-081v3 mandates a phased reduction in maximum TLS
                certificate validity. By March 2027 you'll need to renew every certificate
                at least four times per year. At any meaningful scale, automation is the
                only answer. SSLVault was built for this.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={80}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { date:'Mar 2026', days:'200 days', live:true  },
                { date:'Mar 2027', days:'100 days', live:false },
                { date:'Mar 2029', days:' 47 days', live:false },
              ].map(({date,days,live})=>(
                <div key={date} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 18px', borderRadius:10, fontFamily:MONO,
                  border:`1px solid ${live ? C.amber+'44' : 'rgba(255,255,255,0.07)'}`,
                  background: live ? `${C.amber}0c` : 'rgba(255,255,255,0.03)',
                }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{date}</span>
                  <span style={{ fontSize:18, fontWeight:700,
                    color: live ? C.amber : 'rgba(255,255,255,0.35)' }}>{days}</span>
                  {live && <span style={{
                    fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                    background:C.amber, color:C.ink, borderRadius:3, padding:'2px 6px',
                  }}>LIVE</span>}
                  {!live && <span style={{ width:40 }}/>}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── MISSION & ETHICS ────────────────────────────────────────── */}
      <section id="mission" style={{
        background:C.bg, padding:'100px 40px',
        borderTop:`1px solid ${C.border}`,
        position:'relative', overflow:'hidden',
      }}>
        <WatermarkGrid color="#0f172a" opacity={0.032} spacing={70} size={16}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <FadeUp>
            <div style={{ marginBottom:72 }}>
              <Tag>Mission</Tag>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,52px)', fontWeight:800,
                letterSpacing:'-1.8px', lineHeight:1.06, color:C.text, maxWidth:660 }}>
                PKI for the 99%.<br/>
                No compromises on trust.
              </h2>
            </div>
          </FadeUp>

          {/* Pull quote */}
          <FadeUp delay={40}>
            <div style={{
              borderLeft:`3px solid ${C.teal}`,
              paddingLeft:28, marginBottom:80, maxWidth:660,
            }}>
              <p style={{ fontSize:'clamp(18px,2.2vw,26px)', fontWeight:500,
                color:C.text, lineHeight:1.5, letterSpacing:'-0.4px', marginBottom:14 }}>
                "Let's Encrypt made certificates free. SSLVault makes the lifecycle free too."
              </p>
              <span style={{ fontSize:12, fontFamily:MONO, color:C.textLt }}>
                — SSLVault · built in the Netherlands · made with ♥
              </span>
            </div>
          </FadeUp>

          {/* Ethics items */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 80px' }}>
            {ETHICS_ITEMS.map((e,i)=>(
              <FadeUp key={e.n} delay={i*50}>
                <div style={{
                  padding:'32px 0',
                  borderTop:`1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize:11, fontFamily:MONO, fontWeight:600,
                    color:C.textLt, letterSpacing:'0.06em', marginBottom:14 }}>{e.n}</div>
                  <h3 style={{ fontSize:17, fontWeight:700, color:C.text,
                    letterSpacing:'-0.3px', lineHeight:1.35, marginBottom:14 }}>
                    {e.title}
                  </h3>
                  <p style={{ fontSize:14, color:C.textMid, lineHeight:1.8 }}>
                    {e.body}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY TRUST STRIP ────────────────────────────────────── */}
      <section style={{ background:C.white, padding:'72px 40px',
        borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`,
        position:'relative', overflow:'hidden' }}>
        <WatermarkGrid color={C.teal} opacity={0.05} spacing={64} size={16}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <FadeUp>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
              {[
                { val:'AES-256-GCM', label:'Key encryption at rest',  sub:'Private keys never leave your control', c:C.teal   },
                { val:'99.9%',       label:'Browser trust coverage',  sub:'DigiCert and Sectigo trust chains',    c:'#34d399' },
                { val:'< 5 min',     label:'Agent polling interval',  sub:'Zero-touch renewal cadence',           c:C.purple  },
                { val:'No ads',      label:'Ad-free forever',         sub:'No tracking. No reselling. No upsells.',c:C.amber  },
              ].map(({val,label,sub,c},i)=>(
                <div key={label} style={{
                  padding:'28px 0 28px',
                  borderLeft: i>0 ? `1px solid ${C.border}` : 'none',
                  paddingLeft: i>0 ? 32 : 0,
                }}>
                  <div style={{ fontSize:28, fontWeight:800, color:c,
                    fontFamily:MONO, letterSpacing:'-0.5px', marginBottom:8 }}>{val}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:5 }}>{label}</div>
                  <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{sub}</div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section style={{ background:C.ink, padding:'100px 40px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <FadeUp>
            <h2 style={{ fontSize:'clamp(32px,4.5vw,56px)', fontWeight:800,
              letterSpacing:'-2px', lineHeight:1.0, color:C.white, marginBottom:22 }}>
              Start in five minutes.<br/>
              <span style={{
                background:`linear-gradient(90deg, ${C.teal}, #38bdf8)`,
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
              }}>Stay free forever.</span>
            </h2>
            <p style={{ fontSize:17, color:'rgba(255,255,255,0.38)',
              lineHeight:1.75, marginBottom:40, maxWidth:480, margin:'0 auto 40px' }}>
              No credit card. No sales call. No enterprise procurement cycle.
              Issue your first certificate in under five minutes.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <CTA label="Get started free" variant="primary" onClick={()=>nav('/auth')}/>
              <CTA label="View pricing" variant="ghost-dark" onClick={()=>nav('/pricing')}/>
              <CTA label="Read our mission" variant="ghost-dark" onClick={()=>nav('/about')}/>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        borderTop:`1px solid ${C.border}`, background:C.bg, padding:'28px 40px',
      }}>
        <div style={{ maxWidth:1100, margin:'0 auto',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:22, height:22, background:C.ink, borderRadius:6,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>SSLVault</span>
            <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4 }}>
              · PKI-first CLM · Made with ♥ in the Netherlands · Ad-free
            </span>
          </div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['About','/about'],
              ['Developer','/developer'],['Pricing','/pricing'],['Contact','/contact']].map(([l,p])=>(
              <button key={l} onClick={()=>nav(p)}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:12, color:'#94a3b8', fontFamily:F, transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color=C.ink}
                onMouseLeave={e=>e.target.style.color='#94a3b8'}>{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
