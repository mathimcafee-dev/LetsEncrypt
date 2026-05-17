// Home.jsx — SSLVault landing page
// Aesthetic: Professional PKI SaaS — light, authoritative, trustworthy
// Reference: DigiCert / Keyfactor / Entrust visual language
// Palette: white bg · deep navy #0f2545 · teal accent #0891b2 · soft greys
// Font: Plus Jakarta Sans (clean, modern, professional)
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const FONT = "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif"
const MONO = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"

// Colours
const C = {
  navy:    '#0f2545',
  navyMid: '#1a3a6b',
  teal:    '#0891b2',
  tealDk:  '#0e7490',
  tealLt:  '#e0f7fa',
  green:   '#059669',
  amber:   '#d97706',
  slate:   '#475569',
  slateL:  '#64748b',
  border:  '#e2e8f0',
  bg:      '#f8fafc',
  white:   '#ffffff',
}

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

function Reveal({ children, delay = 0 }) {
  const [ref, v] = useVisible()
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(20px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

function Label({ children, color = C.teal }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
      fontSize: 11, fontWeight: 700, color, letterSpacing: '1px',
      textTransform: 'uppercase', fontFamily: MONO }}>
      <span style={{ width: 16, height: 2, background: color, borderRadius: 1 }}/>
      {children}
    </div>
  )
}

function Btn({ children, onClick, primary, small }) {
  const [hov, setHov] = useState(false)
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    fontFamily: FONT, fontWeight: 700, borderRadius: 8, border: 'none',
    transition: 'all .18s', fontSize: small ? 13 : 15,
    padding: small ? '9px 18px' : '13px 26px',
  }
  if (primary) return (
    <button onClick={onClick}
      style={{ ...base, background: hov ? C.tealDk : C.teal, color: 'white',
        boxShadow: hov ? `0 8px 24px ${C.teal}44` : `0 4px 14px ${C.teal}33` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  )
  return (
    <button onClick={onClick}
      style={{ ...base, background: hov ? '#f1f5f9' : 'white',
        color: C.navy, border: `1.5px solid ${hov ? C.teal : '#cbd5e1'}` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  )
}

// ── Feature definitions ───────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⚡', color: C.teal, bg: C.tealLt,
    title: 'Zero-touch Certificate Lifecycle',
    desc: 'Issue, validate, renew and deploy DV, OV and EV certificates automatically. Agents poll every 5 min. Cert installed before expiry — no human in the loop.'
  },
  {
    icon: '🔗', color: C.navyMid, bg: '#e8eef8',
    title: 'CA-Agnostic Connectors',
    desc: 'Connect DigiCert CertCentral, Sectigo SCM, SSL.com and GoGetSSL in one place. Unified inventory, unified expiry timeline, unified PQC risk scoring.'
  },
  {
    icon: '🔍', color: C.green, bg: '#d1fae5',
    title: 'Shadow IT Discovery',
    desc: 'Scan your DigiCert portfolio against SSLVault\'s database. Find certificates issued outside your CLM — before they expire silently and cause an outage.'
  },
  {
    icon: '🛡', color: '#7c3aed', bg: '#ede9fe',
    title: 'PQC Readiness Scanner',
    desc: 'Every RSA-2048 cert in your portfolio flagged High risk. NIST 2030 deadline. Generate a migration plan and estimated timeline per domain.'
  },
  {
    icon: '💡', color: C.amber, bg: '#fef3c7',
    title: 'Consolidation Advisor',
    desc: 'Identifies DigiCert DV certs at $218/yr that can move to GoGetSSL RapidSSL at $14/yr — same DigiCert trust chain. Estimated annual savings shown per cert.'
  },
  {
    icon: '🏗', color: '#0f766e', bg: '#ccfbf1',
    title: '3-tier Reseller Platform',
    desc: 'Master admin → Sub-reseller → End customer. Invite flows, magic link auth, per-customer portals, Excel exports and approval email notifications.'
  },
]

// ── Workflow steps ────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Connect', color: C.teal,
    desc: 'Link your DNS provider (Cloudflare, Vercel, GoDaddy) and server credentials once. SSLVault handles everything from here.' },
  { n: '02', title: 'Issue', color: C.green,
    desc: 'Order DV, OV or EV certificates via GoGetSSL. Auto DNS challenge resolved in seconds. Certificate issued in ~5 minutes.' },
  { n: '03', title: 'Monitor', color: '#7c3aed',
    desc: 'Unified expiry timeline across all CAs. TLS grading. PQC risk scores. No-renewal-path alerts. Shadow IT findings.' },
  { n: '04', title: 'Deploy', color: C.amber,
    desc: 'VPS agent or cPanel push. Nginx/Apache auto-restart. Atomic rollback on failure. Reported back to dashboard instantly.' },
]

// ── Social proof logos (text-based) ──────────────────────────────────
const INTEGRATIONS = [
  'DigiCert', 'Sectigo', 'GoGetSSL', 'SSL.com', 'Cloudflare',
  'Vercel', 'GoDaddy', 'DigitalOcean', 'Nginx', 'Apache', 'cPanel', 'Plesk'
]

// ── Comparison ────────────────────────────────────────────────────────
const COMPARE = [
  { feat: 'DV / OV / EV issuance',       sv: true,  v: true,  k: true  },
  { feat: 'Auto DNS validation',          sv: true,  v: true,  k: true  },
  { feat: 'VPS agent deployment',         sv: true,  v: true,  k: true  },
  { feat: 'cPanel auto-install',          sv: true,  v: false, k: false },
  { feat: 'Shadow IT scanner',            sv: true,  v: true,  k: false },
  { feat: 'CA consolidation advisor',     sv: true,  v: false, k: false },
  { feat: 'PQC readiness scanner',        sv: true,  v: true,  k: true  },
  { feat: '3-tier reseller platform',     sv: true,  v: false, k: false },
  { feat: 'DigiCert OV/EV automation',   sv: true,  v: true,  k: true  },
  { feat: 'Starting price',                sv: '$0',  v: 'Enterprise', k: 'Enterprise' },
]

export default function Home({ nav }) {
  const [certCount, setCertCount] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    supabase.from('certificates').select('id', { count: 'exact', head: true })
      .eq('status', 'active').then(({ count: c }) => { if (c) setCertCount(c) })
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
    <div style={{ fontFamily: FONT, background: C.white, color: C.navy, overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:#0891b222;color:#0891b2}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`, padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.navy, letterSpacing: '-0.3px' }}>SSLVault</span>
          <span style={{ fontSize: 10, color: C.slateL, letterSpacing: '1px', textTransform: 'uppercase',
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
            padding: '2px 7px', fontFamily: MONO }}>CLM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {[['Features', '#features'], ['Pricing', '/pricing'], ['About', '/about']].map(([l, p]) => (
            <button key={l} onClick={() => p.startsWith('/') ? nav(p) : document.querySelector(p)?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                fontWeight: 500, color: C.slate, fontFamily: FONT, transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = C.navy}
              onMouseLeave={e => e.target.style.color = C.slate}>{l}</button>
          ))}
          <Btn onClick={() => nav('/auth')} primary small>Get Started Free</Btn>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(160deg, ${C.navy} 0%, #1e3a5f 100%)`,
        padding: '90px 40px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle dot grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '36px 36px' }}/>
        {/* Right-side decorative shape */}
        <div style={{ position: 'absolute', right: -80, top: -60, width: 480, height: 480,
          borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(8,145,178,0.18) 0%, transparent 65%)',
          pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 420px', gap: 60, alignItems: 'center' }}>

          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 24,
              background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)',
              borderRadius: 20, padding: '5px 14px 5px 8px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399',
                boxShadow: '0 0 0 3px rgba(52,211,153,0.2)', animation: 'pulse 2s ease infinite' }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#7dd3fc', letterSpacing: '0.3px' }}>
                CA-Agnostic Certificate Lifecycle Management
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px,4.5vw,58px)', fontWeight: 900, color: 'white',
              lineHeight: 1.06, letterSpacing: '-1.5px', marginBottom: 10,
              animation: 'fadeUp .6s ease .1s both' }}>
              SSL certificates.
            </h1>
            <h1 style={{ fontSize: 'clamp(36px,4.5vw,58px)', fontWeight: 900,
              color: '#38bdf8', lineHeight: 1.06, letterSpacing: '-1.5px', marginBottom: 10,
              animation: 'fadeUp .6s ease .2s both' }}>
              Fully automated.
            </h1>
            <h1 style={{ fontSize: 'clamp(26px,3vw,42px)', fontWeight: 800,
              color: 'rgba(255,255,255,0.45)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 28,
              animation: 'fadeUp .6s ease .3s both' }}>
              At a fraction of the cost.
            </h1>

            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8,
              maxWidth: 500, marginBottom: 36, fontWeight: 400,
              animation: 'fadeUp .6s ease .4s both' }}>
              Built by a <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 700 }}>Certified PKI Specialist</strong> to
              give developers, MSPs, and resellers a complete CLM platform — without the enterprise price tag.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48,
              animation: 'fadeUp .6s ease .5s both' }}>
              <Btn onClick={() => nav('/auth')} primary>Get Started Free →</Btn>
              <Btn onClick={() => nav('/pricing')}>View Pricing</Btn>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24,
              animation: 'fadeUp .6s ease .6s both' }}>
              {[
                { val: certCount ? `${count}+` : '—', label: 'Active certs', sub: 'across all CAs' },
                { val: '~5 min', label: 'DV issuance', sub: 'GoGetSSL · DigiCert chain' },
                { val: '$0', label: 'Free to start', sub: 'No credit card · no per-seat fee' },
              ].map(({ val, label, sub }) => (
                <div key={label} style={{ borderTop: `2px solid rgba(56,189,248,0.4)`, paddingTop: 14 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.8px',
                    lineHeight: 1, marginBottom: 4, fontFamily: MONO }}>{val}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — feature card panel */}
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '24px 22px', backdropFilter: 'blur(8px)',
            animation: 'fadeUp .7s ease .3s both' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 18, fontFamily: MONO }}>
              Full CLM stack
            </div>
            {[
              { dot: '#38bdf8', label: 'Certificate issuance',    sub: 'DV · OV · EV · Wildcard · SAN' },
              { dot: '#34d399', label: 'Auto DNS validation',     sub: 'Cloudflare · Vercel · GoDaddy · DO' },
              { dot: '#a78bfa', label: 'Zero-touch renewal',      sub: '1 day before expiry · agents + cPanel' },
              { dot: '#fbbf24', label: 'CA connectors',           sub: 'DigiCert · Sectigo · SSL.com · GoGetSSL' },
              { dot: '#f87171', label: 'CA Intelligence Suite',   sub: 'Expiry timeline · Shadow IT · Advisor' },
              { dot: '#34d399', label: 'PQC readiness scanner',   sub: 'NIST 2030 deadline · RSA-2048 flagged' },
              { dot: '#a78bfa', label: 'TLS posture grading',     sub: 'A–F per domain · HSTS · headers' },
              { dot: '#38bdf8', label: '3-tier reseller platform',sub: 'Master → reseller → customer' },
              { dot: '#fbbf24', label: 'DigiCert Lab',            sub: 'OV/EV automation · revoke & replace' },
            ].map(({ dot, label, sub }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>{sub}</div>
                </div>
                <span style={{ fontSize: 14, color: '#34d399', flexShrink: 0 }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── INTEGRATIONS STRIP ──────────────────────────────────────── */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '16px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32,
          flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.slateL, textTransform: 'uppercase',
            letterSpacing: '1px', flexShrink: 0 }}>Works with</span>
          {INTEGRATIONS.map(p => (
            <span key={p} style={{ fontSize: 12, fontWeight: 600, color: C.slateL, whiteSpace: 'nowrap' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <div id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 40px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Label>Platform capabilities</Label>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, letterSpacing: '-1.2px',
              color: C.navy, marginBottom: 16 }}>Everything a PKI team needs</h2>
            <p style={{ fontSize: 16, color: C.slateL, maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
              15 features that cover the full certificate lifecycle — built for developers, MSPs, and resellers.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 24px',
                background: C.white, transition: 'all .2s', cursor: 'default', height: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.boxShadow = `0 8px 28px ${f.color}18`; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 18 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 10,
                  letterSpacing: '-0.2px' }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: C.slateL, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Label>Workflow</Label>
              <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900,
                letterSpacing: '-1px', color: C.navy }}>
                Issue. Monitor. Renew. Deploy.
              </h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {STEPS.map(({ n, title, color, desc }, i) => (
              <Reveal key={n} delay={i * 80}>
                <div style={{ padding: '32px 28px', borderLeft: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: MONO,
                    marginBottom: 10, letterSpacing: '1px' }}>{n}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.navy,
                    marginBottom: 12, letterSpacing: '-0.3px' }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: C.slateL, lineHeight: 1.7 }}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPARISON ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '96px 40px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Label>How SSLVault compares</Label>
            <h2 style={{ fontSize: 'clamp(26px,3vw,40px)', fontWeight: 900,
              letterSpacing: '-1px', color: C.navy, marginBottom: 12 }}>
              Complete CLM. Accessible pricing.
            </h2>
            <p style={{ fontSize: 15, color: C.slateL, maxWidth: 420, margin: '0 auto' }}>
              Everything you need to manage, automate and secure certificates across every CA and every server — at a price that works for everyone.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: C.navy, padding: '14px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: MONO }}>Feature</div>
              {[['SSLVault', '#38bdf8'], ['Venafi', 'rgba(255,255,255,0.4)'], ['Keyfactor', 'rgba(255,255,255,0.4)']].map(([name, col]) => (
                <div key={name} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700,
                  color: col, fontFamily: MONO }}>{name}</div>
              ))}
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.feat} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '12px 20px', alignItems: 'center',
                borderBottom: i < COMPARE.length - 1 ? `1px solid ${C.border}` : 'none',
                background: i % 2 === 0 ? C.white : C.bg, transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.tealLt}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : C.bg}>
                <div style={{ fontSize: 13, color: C.navy, fontWeight: 500 }}>{row.feat}</div>
                {[row.sv, row.v, row.k].map((val, ci) => (
                  <div key={ci} style={{ textAlign: 'center' }}>
                    {typeof val === 'boolean'
                      ? val
                        ? <span style={{ color: ci === 0 ? C.green : C.slateL, fontSize: 16, fontWeight: 700 }}>✓</span>
                        : <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>
                      : <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MONO,
                          color: ci === 0 ? C.teal : '#ef4444' }}>{val}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ── TRUST STRIP ───────────────────────────────────────────────── */}
      <div style={{ background: C.navy, padding: '56px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
          {[
            { n: '99.9%', label: 'Browser compatibility', sub: 'DigiCert/Sectigo trusted chain' },
            { n: 'AES-256', label: 'Key encryption at rest', sub: 'Immutable audit log on every access' },
            { n: 'ISO', label: 'PKI Specialist built', sub: 'DigiCert Certified Partner — APAC' },
          ].map(({ n, label, sub }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.8px',
                marginBottom: 8, fontFamily: MONO }}>{n}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
          <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1e4d8c 100%)`,
            borderRadius: 20, padding: '72px 60px', textAlign: 'center',
            position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300,
              borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(8,145,178,0.2) 0%, transparent 60%)',
              pointerEvents: 'none' }}/>
            <div style={{ position: 'relative' }}>
              <Label color="#38bdf8">Start today</Label>
              <h2 style={{ fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, color: 'white',
                letterSpacing: '-1.5px', marginBottom: 16, lineHeight: 1.1 }}>
                The complete CLM platform. Built for everyone.
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 500,
                margin: '0 auto 36px', lineHeight: 1.75 }}>
                Issue, monitor, renew and deploy SSL certificates automatically — across every CA, every server,
                every customer. Start free. No credit card required. No credit card.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Btn onClick={() => nav('/auth')} primary>Get Started Free →</Btn>
                <button onClick={() => nav('/pricing')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 600,
                    padding: '13px 22px', cursor: 'pointer', fontFamily: FONT, transition: 'all .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}>
                  View Pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>SSLVault</span>
          <span style={{ fontSize: 11, color: C.slateL }}>· PKI-first CLM · Made with ♥ in the Netherlands</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['About', '/about'], ['Pricing', '/pricing']].map(([l, p]) => (
            <button key={l} onClick={() => nav(p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                color: C.slateL, fontFamily: FONT, transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = C.navy}
              onMouseLeave={e => e.target.style.color = C.slateL}>{l}</button>
          ))}
        </div>
      </footer>
    </div>
  )
}
