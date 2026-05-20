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
        background:C.ink,
        padding:'120px 40px 100px',
        position:'relative', overflow:'hidden',
      }}>
        {/* Noise texture overlay */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', opacity:0.025,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize:'200px 200px',
        }}/>
        {/* Radial gradient halo */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-60%)',
          width:900, height:600, borderRadius:'50%',
          background:`radial-gradient(ellipse, ${C.teal}18 0%, transparent 65%)`,
          pointerEvents:'none',
        }}/>

        <div style={{ maxWidth:880, margin:'0 auto', position:'relative', textAlign:'center' }}>
          {/* Eyebrow */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            marginBottom:36, animation:'fadeIn .6s ease both',
          }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', background:'#34d399', flexShrink:0,
              boxShadow:'0 0 0 4px rgba(52,211,153,0.15)',
              animation:'pulse2 2.4s ease infinite',
            }}/>
            <span style={{ fontSize:12, fontFamily:MONO, color:'rgba(255,255,255,0.4)', letterSpacing:'0.06em' }}>
              Certificate Lifecycle Management · Free forever
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(44px,7vw,84px)', fontWeight:800,
            letterSpacing:'-3px', lineHeight:1.0,
            color:C.white, marginBottom:28,
            animation:'fadeIn .7s ease .1s both',
          }}>
            SSL certificates.<br/>
            <span style={{
              background:`linear-gradient(90deg, ${C.teal}, #38bdf8)`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
            }}>Fully automated.</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize:'clamp(16px,1.8vw,20px)', color:'rgba(255,255,255,0.45)',
            lineHeight:1.8, maxWidth:600, margin:'0 auto 48px',
            fontWeight:400, animation:'fadeIn .7s ease .2s both',
          }}>
            The complete CLM platform — issue, validate, deploy, monitor and renew
            certificates across every CA and every server.
            Built for developers, SMBs, and non-profits.
          </p>

          {/* CTAs */}
          <div style={{
            display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap',
            marginBottom:72, animation:'fadeIn .7s ease .3s both',
          }}>
            <CTA label="Get started free" variant="primary" onClick={()=>nav('/auth')}/>
            <CTA label="View pricing" variant="ghost-dark" onClick={()=>nav('/pricing')}/>
          </div>

          {/* Stats */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:40,
            maxWidth:600, margin:'0 auto',
            animation:'fadeIn .7s ease .4s both',
          }}>
            <Metric
              val={certCount ? `${displayCount.toLocaleString()}+` : '—'}
              label="Active certificates"
              sub="tracked across all CAs"
              accent={C.teal}
            />
            <Metric val="~5 min" label="DV issuance time" sub="GoGetSSL · DigiCert chain" accent="#34d399"/>
            <Metric val="$0" label="Platform cost" sub="certs from $8 / yr" accent={C.amber}/>
          </div>
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

      {/* ── CAPABILITY LIST ──────────────────────────────────────────── */}
      <section id="platform" style={{ background:C.white, padding:'100px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
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
      <section style={{ background:C.bg, padding:'100px 40px 20px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

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
        borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
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
      }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
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
        borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
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
