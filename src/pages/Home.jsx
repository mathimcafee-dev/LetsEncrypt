// Home.jsx — SSLVault landing page v5
// Design: Bold 4-colour system — Deep Teal / Mint / Cream / Coral
// Layout: Asymmetric editorial, diagonal splits, colour-block sections
// Fresh: Each section has its own dominant colour from the palette

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

// ── SSLVault 4-colour system ───────────────────────────────────────────
const C = {
  // Deep teal — authority, dark surfaces, avatars
  deep:    '#1A2E2C',
  deep2:   '#0F5750',
  deep3:   '#1A7A72',
  // Mint teal — primary action, active states, links
  mint:    '#3DBFB0',
  mintDk:  '#1A7A72',
  mintBg:  '#E8F8F6',
  mintBd:  '#A8E6DE',
  // Warm cream — backgrounds, warmth, softness
  cream:   '#FDFAF5',
  cream2:  '#F5EFE0',
  cream3:  '#EDE8D8',
  creamBd: '#D4C9B0',
  // Coral — warnings, attention, energy, accent
  coral:   '#E8897A',
  coralDk: '#C0624F',
  coralBg: '#FDF0EE',
  coralBd: '#F2C4BC',
  // Text
  ink:     '#1A2E2C',
  body:    '#3D5C59',
  muted:   '#7A9E9B',
}

const F    = "system-ui,-apple-system,'Segoe UI',sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

export default function Home({ nav }) {
  const { isMobile, isTablet } = useIsMobile()
  const [user, setUser] = useState(null)
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null)) }, [])

  // nav prop comes from App.jsx router — handles SPA navigation correctly
  const go = nav  // alias for internal use

  return (
    <div style={{ fontFamily: F, background: C.cream, color: C.ink, overflowX: 'hidden' }}>

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: C.deep, borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => nav('/')}>
            <div style={{ width: 30, height: 30, background: C.mint, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>SSLVault</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.mint, background: 'rgba(61,191,176,0.15)', padding: '2px 7px', borderRadius: 4, fontFamily: MONO, letterSpacing: '0.04em' }}>CLM</span>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[['Platform','#platform'],['Security','#security'],['Intelligence','#intelligence'],['Pricing','/pricing'],['About','/about']].map(([l, h]) => (
                <button key={l} onClick={() => h.startsWith('#') ? document.querySelector(h)?.scrollIntoView({behavior:'smooth'}) : go(h)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: F, padding: '6px 12px', borderRadius: 8, transition: 'color .15s, background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.55)'; e.currentTarget.style.background='none' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user
              ? <button onClick={() => nav('/dashboard')} style={{ background: C.mint, border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: F }}>Dashboard →</button>
              : <>
                  {!isMobile && <button onClick={() => nav('/auth')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: F, padding: '6px 12px' }}>Sign in</button>}
                  <button onClick={() => nav('/auth')} style={{ background: C.mint, border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: F }}>Get started</button>
                </>
            }
          </div>
        </div>
      </nav>

      {/* ── HERO — Deep teal + Mint ─────────────────────────────────── */}
      <section style={{ background: C.deep, padding: `clamp(72px,10vw,120px) clamp(20px,5vw,48px) 0`, position: 'relative', overflow: 'hidden' }}>
        {/* Mint glow blob */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: `radial-gradient(circle, ${C.mint}18 0%, transparent 70%)`, pointerEvents: 'none' }}/>
        {/* Coral accent spot */}
        <div style={{ position: 'absolute', bottom: 0, left: '10%', width: 300, height: 300, background: `radial-gradient(circle, ${C.coral}12 0%, transparent 70%)`, pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
          <FadeUp>
            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(61,191,176,0.1)', border: `1px solid ${C.mint}30`, borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mint }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.mint, fontFamily: MONO, letterSpacing: '0.04em' }}>CA/B Forum 2026 compliant · RFC 8555 ACME v2</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 60, alignItems: 'center', marginBottom: 56 }}>
              <div>
                <h1 style={{ fontSize: `clamp(36px,5.5vw,68px)`, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.04, color: 'white', marginBottom: 20 }}>
                  Certificate<br/>
                  lifecycle.<br/>
                  <span style={{ color: C.mint }}>Finally automated.</span>
                </h1>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: 420, marginBottom: 32 }}>
                  Issue, monitor, auto-renew, and cryptographically verify SSL certificates across every server. Built by a Certified PKI Specialist — not a SaaS startup.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => nav('/auth')} style={{ background: C.mint, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 7 }}>
                    Start for free <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                  <button onClick={() => nav('/pricing')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: F }}>
                    View pricing
                  </button>
                </div>
              </div>

              {/* Hero visual — cert lifecycle dashboard mini */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', gap: 5 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, flex: 1, textAlign: 'center' }}>SSLVault · Certificate Fleet</span>
                </div>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[['4','Active certs',C.mint],['0','Expiring',C.coral],['197d','Avg. validity',C.mint]].map(([val,lab,col]) => (
                    <div key={lab} style={{ padding: '16px', borderRight: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: col, fontFamily: MONO, marginBottom: 3 }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{lab}</div>
                    </div>
                  ))}
                </div>
                {/* Cert rows */}
                {[
                  { d:'easysecurrity.cfd', t:'Renewal', days:197, live:true },
                  { d:'freecerts.site',    t:'Original', days:197, live:true },
                  { d:'easysecurity.in',   t:'Original', days:197, live:true },
                ].map((r,i) => (
                  <div key={r.d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i<2?'1px solid rgba(255,255,255,0.04)':'none' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.mint, flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontFamily: MONO, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.d}</span>
                    <span style={{ fontSize: 9, color: r.t==='Renewal'?C.mint:C.muted, background: r.t==='Renewal'?`${C.mint}18`:'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 4, fontFamily: MONO }}>{r.t}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.mint, fontFamily: MONO, flexShrink: 0 }}>{r.days}d</span>
                  </div>
                ))}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.mint }}/>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>All certs healthy · Auto-renew active · Agent online</span>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Stat ticker — mint on deep */}
          <FadeUp delay={100}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 28, paddingBottom: 48, display: 'flex', gap: isMobile?20:48, flexWrap: 'wrap', justifyContent: isMobile?'center':'flex-start' }}>
              {[
                ['RapidSSL', 'CA partner · DigiCert trust chain'],
                ['RFC 8555', 'ACME v2 · no lock-in'],
                ['AES-256', 'Military-grade key storage'],
                ['47-day', '2029 CA/B Forum mandate ready'],
                ['CertBind', 'Industry-first cryptographic proof'],
              ].map(([val, label]) => (
                <div key={val} style={{ textAlign: isMobile?'center':'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.mint, fontFamily: MONO, marginBottom: 3 }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{label}</div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── WHAT SSLVAULT DOES — Cream + Mint accents ───────────────── */}
      <section id="platform" style={{ background: C.cream, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `4px solid ${C.mint}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 52, flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mintDk, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 12 }}>The platform</div>
                <h2 style={{ fontSize: `clamp(26px,3.5vw,42px)`, fontWeight: 800, color: C.ink, letterSpacing: '-1px', lineHeight: 1.15, maxWidth: 520 }}>
                  The complete certificate lifecycle — fully automated.
                </h2>
              </div>
              <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, maxWidth: 340 }}>
                From CSR generation to live HTTPS — every step handled. No CLI, no cron jobs, no manual renewal reminders.
              </p>
            </div>
          </FadeUp>

          {/* 3 pillar cards — cream bg with coloured left borders */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':isTablet?'1fr 1fr':'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            {[
              {
                border: C.mint, bg: C.mintBg,
                icon: '🔐', label: 'Issue & manage',
                title: 'New SSL in 90 seconds',
                desc: 'Generate CSR, complete DNS-01 DCV automatically, get cert from RapidSSL, store encrypted in CertVault — all in one click.',
                points: ['Auto CSR generation · RSA 2048', 'DNS-01 via 20+ providers', 'CertVault AES-256-GCM storage'],
              },
              {
                border: C.coral, bg: C.coralBg,
                icon: '📡', label: 'Monitor & alert',
                title: 'Never miss an expiry again',
                desc: 'Continuous monitoring across your entire fleet. Expiry alerts, TLS grade scoring, CT log abuse detection, 47-day readiness reports.',
                points: ['A–F TLS grade scoring · HSTS · CAA', 'CT Watch · unauthorized cert alerts', '47-day readiness for 2029 mandate'],
              },
              {
                border: C.deep3, bg: C.cream2,
                icon: '⚡', label: 'Auto-renew & install',
                title: 'Zero-touch renewal pipeline',
                desc: 'VPS agent or cPanel installer automatically pushes renewed certs to your servers. Nginx/Apache config tested, service reloaded.',
                points: ['VPS agent · polls every 5 min', 'cPanel auto-installer', 'Auto-reissue 30 days before expiry'],
              },
            ].map(c => (
              <FadeUp key={c.label}>
                <div style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderTop: `3px solid ${c.border}`, borderRadius: 12, padding: '24px', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.border, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 10, letterSpacing: '-0.3px' }}>{c.title}</div>
                  <p style={{ fontSize: 13, color: C.body, lineHeight: 1.7, marginBottom: 16 }}>{c.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: C.body }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2.5" style={{ flexShrink:0, marginTop:1 }}><path d="M20 6L9 17l-5-5"/></svg>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Pipeline flow */}
          <FadeUp delay={80}>
            <div style={{ background: C.cream2, border: `1px solid ${C.creamBd}`, borderRadius: 12, padding: '28px 24px', marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 20, textAlign: 'center' }}>Automated pipeline</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: isMobile?'wrap':'nowrap' }}>
                {['Issue request','Auto DCV','CA issues cert','Auto-install','Lifecycle loop'].map((step, i) => (
                  <>
                    <div key={step} style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderRadius: 9, padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, fontFamily: MONO, marginBottom: 4 }}>0{i+1}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{step}</div>
                    </div>
                    {i < 4 && <div style={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <svg width="16" height="8" viewBox="0 0 16 8"><path d="M0 4h12M10 1l4 3-4 3" stroke={C.mint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>}
                  </>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── ALL FEATURES — Cream2 bg with coral accent headings ─────── */}
      <section id="features" style={{ background: C.cream2, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `1px solid ${C.creamBd}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 12 }}>All capabilities</div>
              <h2 style={{ fontSize: `clamp(26px,3.5vw,40px)`, fontWeight: 800, color: C.ink, letterSpacing: '-1px', maxWidth: 540, margin: '0 auto 14px' }}>Every feature a PKI team needs.</h2>
              <p style={{ fontSize: 14, color: C.body, maxWidth: 420, margin: '0 auto' }}>No feature-gating. No upgrade walls. Every capability built for the 47-day mandate era.</p>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':isTablet?'1fr 1fr':'repeat(4,1fr)', gap: 12 }}>
            {[
              { icon:'🔐', color:C.mint,   title:'SSL Issuance',       desc:'RapidSSL DV + Wildcard. Auto CSR, auto DCV, auto-store.' },
              { icon:'🏦', color:C.mint,   title:'CertVault',          desc:'AES-256-GCM envelope encryption. Private key vault.' },
              { icon:'📊', color:C.mint,   title:'Certificate Fleet',  desc:'Multi-domain inventory. Subscription + version hierarchy.' },
              { icon:'🔗', color:C.coral,  title:'CertBind',           desc:'Cryptographic proof the right cert is live in browser.' },
              { icon:'🌐', color:C.mint,   title:'DNS Automation',     desc:'Auto-add TXT records via 20+ DNS provider APIs.' },
              { icon:'📡', color:C.coral,  title:'CT Watch',           desc:'Monitor CT logs for unauthorized certs on your domains.' },
              { icon:'⚡', color:C.deep3,  title:'VPS Agent',          desc:'Persistent daemon. Auto-install on Nginx, Apache, Caddy.' },
              { icon:'🌍', color:C.deep3,  title:'cPanel Installer',   desc:'One-click cert install on any cPanel-managed server.' },
              { icon:'🔄', color:C.mint,   title:'Auto-Reissue',       desc:'Automatic reissue 30 days before expiry. Zero effort.' },
              { icon:'🛡', color:C.coral,  title:'TLS Grade Scoring',  desc:'A–F grades: TLS reachability, HSTS, CAA, expiry.' },
              { icon:'📅', color:C.deep3,  title:'47-Day Readiness',   desc:'Fleet readiness table for the 2029 CA/B Forum mandate.' },
              { icon:'📋', color:C.deep3,  title:'Audit Trail',        desc:'Complete cert event log: issued, renewed, installed, revoked.' },
              { icon:'🔑', color:C.coral,  title:'KeyLocker',          desc:'Per-cert key storage. Rotate, archive, copy-only reveal.' },
              { icon:'🏛', color:C.mint,   title:'CA Intelligence',    desc:'RapidSSL + Sectigo analytics, cert breakdown, trends.' },
              { icon:'📰', color:C.deep3,  title:'Renewal Calendar',   desc:'Visual calendar of upcoming expirations across fleet.' },
              { icon:'🌍', color:C.coral,  title:'Mass Scanner',       desc:'Paste 100 domains. Instant TLS grade scan + CSV export.' },
            ].map(f => (
              <FadeUp key={f.title}>
                <div style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderRadius: 10, padding: '16px', height: '100%', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.boxShadow = `0 4px 16px ${f.color}18` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.creamBd; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: f.color, marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: 11.5, color: C.body, lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY — Deep teal background ──────────────────────────── */}
      <section id="security" style={{ background: C.deep, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: isMobile?40:80, alignItems: 'center', marginBottom: 64 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 14 }}>Security controls</div>
                <h2 style={{ fontSize: `clamp(26px,3.5vw,42px)`, fontWeight: 800, color: 'white', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16 }}>
                  Enterprise PKI controls.<br/>Not an afterthought.
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 28 }}>
                  Every layer of the certificate lifecycle is secured — from key generation to live verification. Open standards, no black boxes.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['AES-256-GCM','Envelope encryption'],['RSA-2048','All CSR generation'],
                    ['RFC 8555','ACME v2 standard'],['DNS-01','No HTTP challenge exposure'],
                    ['SHA-256','Cert fingerprint binding'],['Audit log','Immutable event trail'],
                  ].map(([val, label]) => (
                    <div key={val} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.mint, fontFamily: MONO, marginBottom: 2 }}>{val}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CertVault mockup */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', gap: 5 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{ width:8,height:8,borderRadius:'50%',background:c }}/>)}</div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, flex: 1, textAlign: 'center' }}>CertVault · Private key vault</span>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: `${C.coral}12`, border: `1px solid ${C.coral}22`, borderRadius: 8, marginBottom: 14 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span style={{ fontSize: 11, color: C.coral, fontWeight: 600 }}>AES-256-GCM · Envelope encryption · Immutable audit</span>
                  </div>
                  {[{d:'easysecurrity.cfd',alg:'RSA-2048',last:'11:44 today'},{d:'freecerts.site',alg:'RSA-2048',last:'04:28 today'}].map((k,i) => (
                    <div key={k.d} style={{ border: `1px solid rgba(255,255,255,0.08)`, borderTop: `2px solid ${C.coral}`, borderRadius: 8, padding: '12px', marginBottom: i===0?8:0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: MONO }}>{k.d}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.coral, background: `${C.coral}18`, padding: '2px 8px', borderRadius: 4 }}>🔒 SECURED</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
                        {[['Algorithm',k.alg],['Rotations','2'],['Last access',k.last]].map(([l,v]) => (
                          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '5px 8px' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', fontFamily: MONO }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['Reveal key','Rotate','Audit log'].map(t => (
                          <button key={t} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 5, border: `1px solid ${t==='Reveal key'?C.coral+'44':'rgba(255,255,255,0.1)'}`, background: t==='Reveal key'?`${C.coral}18`:'transparent', color: t==='Reveal key'?C.coral:'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Security specs grid */}
          <FadeUp delay={80}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 24, textAlign: 'center' }}>Security specifications</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':isTablet?'1fr 1fr':'repeat(4,1fr)', gap: 12 }}>
                {[
                  { icon:'🏦', color:C.coral, title:'CertVault Storage', items:['AES-256-GCM','HKDF key derivation','Envelope encryption','Per-user DEK isolation'] },
                  { icon:'🌐', color:C.mint,  title:'DNS-01 Challenge', items:['Never exposes port 80','Auto-add TXT record','20+ DNS providers','Auto-cleanup post-DCV'] },
                  { icon:'🔗', color:C.mint,  title:'CertBind Proof', items:['Key-cert binding cryptographic','Live TLS fingerprint match','Chain anomaly detection','Multi-node consistency'] },
                  { icon:'📋', color:C.coral, title:'Audit & Compliance', items:['Immutable event log','Key access audit trail','CA/B Forum 2026 ready','47-day mandate tracking'] },
                ].map(s => (
                  <div key={s.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '18px' }}>
                    <div style={{ fontSize: 20, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 12 }}>{s.title}</div>
                    {s.items.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CERTBIND — Coral accent on deep ──────────────────────────── */}
      <section style={{ background: C.deep2, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `3px solid ${C.coral}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', right: '-5%', width: 500, height: 500, background: `radial-gradient(circle, ${C.coral}0A 0%, transparent 70%)`, pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative' }}>
          <FadeUp>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, background: `${C.coral}18`, border: `1px solid ${C.coral}30`, borderRadius: 4, padding: '3px 10px' }}>Industry first</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO }}>No other CLM vendor has built this</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: isMobile?40:72, alignItems: 'flex-start', marginBottom: 48 }}>
              <div>
                <h2 style={{ fontSize: `clamp(26px,4vw,48px)`, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.08, color: 'white', marginBottom: 20 }}>
                  Every other CLM tells you what cert you issued.<br/>
                  <span style={{ color: C.coral }}>SSLVault proves what's actually running.</span>
                </h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.85, marginBottom: 24, maxWidth: 460 }}>
                  A certificate can be valid. HTTPS can be green. Your CLM can show everything healthy. And your server can be serving a mismatched key, a rogue cert, or half a load balancer pool — and nobody knows.
                </p>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.85, marginBottom: 32, maxWidth: 460 }}>
                  CertBind closes that gap with continuous, cryptographic proof — every 5 minutes.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => nav('/auth')} style={{ background: C.coral, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: F }}>See CertBind →</button>
                  <button onClick={() => nav('/knowledge-base')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: F }}>How it works</button>
                </div>
              </div>

              {/* CertBind 4-layer visual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🔗</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: MONO }}>CertBind</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.mint, background: `${C.mint}18`, border: `1px solid ${C.mint}30`, borderRadius: 4, padding: '2px 7px', fontFamily: MONO }}>ACTIVE</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: MONO }}>4/4 verified</span>
                </div>

                {[
                  { n:'01', label:'Key-Cert Binding Proof',  status:'VERIFIED', desc:'Agent signs nonce · key ↔ cert proven cryptographically' },
                  { n:'02', label:'Live TLS Fingerprint',     status:'MATCH',    desc:'SHA-256 of served cert matches issued cert on every poll' },
                  { n:'03', label:'Chain Integrity',          status:'CLEAN',    desc:'No unexpected intermediates · no SSL inspection proxy' },
                  { n:'04', label:'Multi-Node Consistency',   status:'7/7 NODES',desc:'All load balancer nodes serving correct certificate' },
                ].map(l => (
                  <div key={l.n} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: `${C.mint}18`, border: `1px solid ${C.mint}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: C.mint, fontFamily: MONO, flexShrink: 0 }}>{l.n}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{l.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.mint, fontFamily: MONO }}>{l.status}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', fontFamily: MONO }}>{l.desc}</div>
                    </div>
                  </div>
                ))}

                <div style={{ background: `${C.coral}0A`, border: `1px solid ${C.coral}25`, borderRadius: 9, padding: '11px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>🚨</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: `${C.coral}E0`, marginBottom: 3 }}>What CertBind catches that others miss</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, lineHeight: 1.7 }}>
                      key_mismatch · cert_mismatch · chain_anomaly · partial_deploy
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* 3 failure scenarios */}
          <FadeUp delay={80}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 20, textAlign: 'center' }}>Real-world failures CertBind prevents</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap: 14 }}>
                {[
                  { status:'key_mismatch', color:C.coral, bg:`${C.coral}0A`, bd:`${C.coral}25`, title:'The Zombie Certificate', scenario:'Nginx renewed cert automatically. But a config change six months ago redirected nginx to a backup key from a previous issuance. CLM shows green. Browser shows valid. The cert and key are from different issuances.' },
                  { status:'partial_deploy', color:'rgba(217,119,6,0.9)', bg:'rgba(217,119,6,0.06)', bd:'rgba(217,119,6,0.2)', title:'The Phantom Install', scenario:'New cert deployed to 4 of 7 load balancer nodes. The other 3 are still running the cert that expires in 4 days. CLM shows installed. It has no idea about the other 3 nodes.' },
                  { status:'chain_anomaly', color:C.mint, bg:`${C.mint}0A`, bd:`${C.mint}25`, title:'The Silent Swap', scenario:'Enterprise Palo Alto proxy is SSL-inspecting traffic to your API server. Every TLS connection is being decrypted, re-encrypted with the proxy\'s internal CA. Your CLM doesn\'t know. Your monitoring doesn\'t know.' },
                ].map(s => (
                  <div key={s.title} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 11, padding: '18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: s.color, fontFamily: MONO, letterSpacing: '0.5px', marginBottom: 8 }}>{s.status.toUpperCase()}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 8 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{s.scenario}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── INDUSTRY INTELLIGENCE — Mint accent on cream ─────────────── */}
      <section id="intelligence" style={{ background: C.cream, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `4px solid ${C.mint}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mintDk, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 14 }}>Industry intelligence</div>
              <h2 style={{ fontSize: `clamp(26px,3.5vw,40px)`, fontWeight: 800, color: C.ink, letterSpacing: '-1px', maxWidth: 560, margin: '0 auto 14px' }}>The deepest PKI intelligence platform on the web.</h2>
              <p style={{ fontSize: 14, color: C.body, maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>Not just a certificate manager — a living knowledge base covering every CA, standard, and governance body.</p>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { icon:'🏛', border:C.deep3,  title:'CA Trust Store', sub:'6,200+ root & intermediate CAs', desc:'Every CA in Chrome, Firefox, Apple, and Microsoft trust stores — live from CCADB. PKI Trust Score per cert.', badge:'CCADB Live', stats:[['6,200+','CAs indexed'],['4','Trust stores'],['Daily','CCADB sync']] },
              { icon:'⚖️', border:C.coral,  title:'CAB Forum Intelligence', sub:'Ballots, timelines & compliance', desc:'Every CAB Forum ballot tracked with plain-English summaries. 47-day countdown, SC081v3 compliance, 5 working groups.', badge:'Live sync', stats:[['47-day','2029 mandate'],['5','Working groups'],['Real-time','Ballot feed']] },
              { icon:'🌍', border:C.mint,   title:'Global PKI Hub', sub:'12 bodies · 22 standards · PQC tracker', desc:'CAB Forum, ETSI ESI, NIST, IETF, APKIC, eIDAS 2.0, PKI Consortium — each with deep-dive pages and PQC migration status.', badge:'PQC Ready', stats:[['12','PKI bodies'],['3','NIST PQC finals'],['2026','Amsterdam conf.']] },
            ].map(item => (
              <FadeUp key={item.title}>
                <div style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderTop: `3px solid ${item.border}`, borderRadius: 12, padding: '24px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 28 }}>{item.icon}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: item.border, background: `${item.border}15`, border: `1px solid ${item.border}30`, borderRadius: 20, padding: '3px 9px', fontFamily: MONO }}>{item.badge}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: item.border, fontWeight: 600, fontFamily: MONO, marginBottom: 10 }}>{item.sub}</div>
                    <div style={{ fontSize: 12.5, color: C.body, lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${C.creamBd}`, paddingTop: 14, marginTop: 'auto' }}>
                    {item.stats.map(([val, label], i) => (
                      <div key={label} style={{ flex: 1, paddingLeft: i>0?12:0, borderLeft: i>0?`1px solid ${C.creamBd}`:'none', marginLeft: i>0?12:0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: MONO, marginBottom: 2 }}>{val}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* PQC callout — cream2 with mint accent */}
          <FadeUp>
            <div style={{ background: C.mintBg, border: `1px solid ${C.mintBd}`, borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>⚛️</div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 5 }}>Post-Quantum Cryptography migration tracker — live</div>
                <div style={{ fontSize: 12, color: C.body, lineHeight: 1.7 }}>NIST finalised ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) in August 2024. The PKI Hub tracks every body's PQC readiness so you know exactly where the industry stands.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                {[['ML-KEM','FIPS 203'],['ML-DSA','FIPS 204'],['SLH-DSA','FIPS 205']].map(([alg, fips]) => (
                  <div key={alg} style={{ background: 'white', border: `1px solid ${C.mintBd}`, borderRadius: 8, padding: '7px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.mintDk, fontFamily: MONO }}>{alg}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{fips}</div>
                  </div>
                ))}
                <button onClick={() => nav('/pki-hub')} style={{ background: C.mintDk, border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: F }}>View PQC tracker →</button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── MISSION — Cream2 bg, coral accent ────────────────────────── */}
      <section style={{ background: C.cream2, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `1px solid ${C.creamBd}` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: isMobile?40:80, alignItems: 'flex-start' }}>
            <FadeUp>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: MONO, marginBottom: 14 }}>Why we built this</div>
                <h2 style={{ fontSize: `clamp(24px,3vw,38px)`, fontWeight: 800, color: C.ink, letterSpacing: '-0.8px', marginBottom: 16, lineHeight: 1.2 }}>PKI expertise shouldn't require a $250k contract.</h2>
                <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, marginBottom: 16 }}>SSLVault is built by a Certified PKI Specialist with deep CA industry experience. The same automation enterprise teams pay hundreds of thousands for — available without the procurement cycle.</p>
                <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, marginBottom: 28 }}>As CA/B Forum mandates tighten (200d → 100d → 47d between 2026–2029), full automation becomes non-negotiable. SSLVault is built for what's coming.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => nav('/auth')} style={{ background: C.deep, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: F }}>Get started →</button>
                  <button onClick={() => nav('/pricing')} style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600, color: C.ink, cursor: 'pointer', fontFamily: F }}>View pricing</button>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={80}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name:'Venafi TLS Protect', price:'$250k+/yr', notes:'Enterprise only · No cert issuance · No cPanel', highlight:false },
                  { name:'Keyfactor Command',  price:'$75–200k/yr', notes:'Mid-market · Complex setup · No free tier', highlight:false },
                  { name:'SSLVault CLM',       price:'Partner rates', notes:'Full CLM · Agent + cPanel + DNS · All cert types', highlight:true },
                ].map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: c.highlight?C.mintBg:'white', border: `1px solid ${c.highlight?C.mintBd:C.creamBd}`, borderRadius: 10 }}>
                    {c.highlight && <div style={{ width: 3, height: 36, background: C.mint, borderRadius: 2, flexShrink: 0 }}/>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.highlight?C.mintDk:C.ink }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{c.notes}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.highlight?C.mintDk:C.muted, fontFamily: MONO, whiteSpace: 'nowrap' }}>{c.price}</div>
                  </div>
                ))}

                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['DigiCert','Trust chain · 99.9% browser'],
                    ['RapidSSL','CA partner · wholesale pricing'],
                    ['RFC 8555','ACME v2 · no lock-in'],
                    ['AES-256','Military-grade key storage'],
                    ['GDPR','Netherlands-based PKI engineer 🇳🇱'],
                    ['No ads','No tracking · no reselling'],
                  ].map(([val, sub]) => (
                    <div key={val} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'white', border: `1px solid ${C.creamBd}`, borderRadius: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.mintDk, fontFamily: MONO, minWidth: 60 }}>{val}</div>
                      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA — Coral on cream ──────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: `clamp(72px,9vw,100px) clamp(20px,4vw,48px)`, borderTop: `4px solid ${C.coral}` }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${C.mintBd}`, borderRadius: 100, padding: '5px 14px', marginBottom: 28, background: C.mintBg }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mint }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.mintDk, fontFamily: MONO }}>Production-ready · RFC 8555 · CA/B Forum 2026 compliant</span>
            </div>
            <h2 style={{ fontSize: `clamp(28px,5vw,48px)`, fontWeight: 800, color: C.ink, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 18 }}>
              Ready to automate your<br/>certificate lifecycle?
            </h2>
            <p style={{ fontSize: 15, color: C.body, maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.8 }}>
              Issue, monitor, and auto-renew SSL certificates across every server with enterprise-grade PKI controls — CertVault, 47-day readiness, and CA intelligence included.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <button onClick={() => nav('/auth')} style={{ background: C.deep, border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8 }}>
                Start managing certs <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button onClick={() => nav('/pricing')} style={{ background: 'white', border: `1px solid ${C.creamBd}`, borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: C.ink, cursor: 'pointer', fontFamily: F }}>View pricing</button>
            </div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['RapidSSL · DigiCert trust chain','RFC 8555 · AES-256-GCM','CA/B Forum 2026 ready'].map(t => (
                <span key={t} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  {t}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER — Deep teal ───────────────────────────────────────── */}
      <footer style={{ background: C.deep, borderTop: '1px solid rgba(255,255,255,0.06)', padding: `clamp(48px,6vw,64px) clamp(20px,4vw,48px) clamp(28px,3vw,40px)` }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr 1fr':'repeat(6,1fr)', gap: 32, marginBottom: 48 }}>
            {[
              { title:'Product',             links:[['Pricing',()=>nav('/pricing')],['Get started',()=>nav('/auth')],['Dashboard',()=>nav('/dashboard')]] },
              { title:'Support',             links:[['Install Guide',()=>nav('/install')],['Knowledge Base',()=>nav('/knowledge-base')],['CA Intelligence',()=>nav('/ca-intelligence')],['CAA Checker',()=>nav('/caa-check')]] },
              { title:'Intelligence',        links:[['CA Trust Store',()=>nav('/ca-trust-explorer')],['CAB Forum',()=>nav('/cab-forum')],['PKI Hub',()=>nav('/pki-hub')],['Trust Passport',()=>nav('/trust-passport')]] },
              { title:'Security',            links:[['CertVault','#security'],['47-Day Readiness','#security'],['CT Monitoring','#security'],['Health Scoring','#security']] },
              { title:'Protocol',            links:[['RFC 8555 ACME','#security'],['DNS-01 Challenge','#security'],['AES-256-GCM','#security']] },
              { title:'Company',             links:[['About',()=>nav('/about')],['Developer',()=>nav('/developer')]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.mint, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: MONO, marginBottom: 14 }}>{col.title}</div>
                {col.links.map(([l, h]) => (
                  <div key={l} style={{ marginBottom: 9 }}>
                    <button onClick={() => typeof h === 'function' ? h() : document.querySelector(h)?.scrollIntoView({ behavior:'smooth' })}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'rgba(255,255,255,0.35)', fontFamily:F, padding:0, transition:'color .15s', textAlign:'left' }}
                      onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.75)'}
                      onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
                      {l}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 22, height: 22, background: C.mint, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>SSLVault</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>PKI-first CLM · Built by a real PKI engineer</span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 SSLVault. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:focus-visible { outline: 2px solid ${C.mint}; outline-offset: 2px; }
      `}</style>
    </div>
  )
}
