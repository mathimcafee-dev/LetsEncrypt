// Home.jsx v5 — Fresh palette: mint teal · warm cream · coral · deep teal
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Scroll reveal ─────────────────────────────────────────────
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
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? 'none' : 'translateY(28px)',
      transition: `opacity .65s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .65s cubic-bezier(.16,1,.3,1) ${delay}ms`
    }}>
      {children}
    </div>
  )
}

// ── Palette ────────────────────────────────────────────────────
const P = {
  cream:      '#FDFAF5',
  creamDeep:  '#F5EFE0',
  creamBd:    '#E8DFD0',
  mint:       '#6ECFBD',
  mintLight:  '#A8E6DE',
  mintDeep:   '#3DBFB0',
  teal:       '#1A7A72',
  tealDeep:   '#0F5750',
  coral:      '#E8897A',
  coralLight: '#F2B8B0',
  coralDeep:  '#C45A4A',
  text:       '#1A2E2C',
  text2:      '#3D5C59',
  text3:      '#7A9E9B',
  white:      '#FFFFFF',
}

const F = "'DM Sans','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"

// ── Layered card visual (hero section) ─────────────────────────
function LayeredCards() {
  const cards = [
    { label: 'Discover',  grad: `linear-gradient(135deg, ${P.mint} 0%, ${P.mintLight} 100%)`,   rotate: -8, x: 0   },
    { label: 'Deploy',    grad: `linear-gradient(135deg, #A8E6D8 0%, #D4F5EF 100%)`,             rotate: -4, x: 36  },
    { label: 'Renew',     grad: `linear-gradient(135deg, #F5EFE0 0%, #EDE8D8 100%)`,             rotate:  0, x: 72  },
    { label: 'Replace',   grad: `linear-gradient(135deg, ${P.coral} 0%, ${P.coralLight} 100%)`,  rotate:  4, x: 108 },
    { label: 'Integrate', grad: `linear-gradient(135deg, ${P.teal} 0%, ${P.tealDeep} 100%)`,     rotate:  8, x: 144 },
  ]
  return (
    <div style={{ position: 'relative', width: 340, height: 260, flexShrink: 0 }}>
      {cards.map((c, i) => (
        <div key={c.label} style={{
          position: 'absolute',
          left: i * 28,
          top: Math.abs(i - 2) * 12,
          width: 180,
          height: 220,
          borderRadius: 20,
          background: c.grad,
          boxShadow: '0 12px 40px rgba(26,122,114,0.18), 0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'flex-start',
          padding: '20px 18px',
          zIndex: i,
          transform: `perspective(600px) rotateY(${-i * 3}deg)`,
          transition: 'transform .3s ease',
        }}>
          <span style={{
            fontSize: 16, fontWeight: 600,
            color: i === 4 ? 'rgba(255,255,255,0.9)' : P.tealDeep,
            letterSpacing: '-0.3px',
          }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Stat pill ───────────────────────────────────────────────────
function Stat({ num, label }) {
  return (
    <div style={{
      textAlign: 'center', padding: '16px 24px',
      background: 'rgba(255,255,255,0.6)',
      border: `1px solid ${P.creamBd}`,
      borderRadius: 14, backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: P.teal, letterSpacing: '-1px', lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: 11, color: P.text3, marginTop: 5, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Feature card ────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent, delay }) {
  return (
    <FadeUp delay={delay}>
      <div style={{
        background: P.white,
        border: `1px solid ${P.creamBd}`,
        borderRadius: 16,
        padding: '24px',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'transform .2s, box-shadow .2s',
        cursor: 'default',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(26,122,114,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accent + '18',
          border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, marginBottom: 16,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 8, letterSpacing: '-0.2px' }}>{title}</div>
        <div style={{ fontSize: 13, color: P.text2, lineHeight: 1.7 }}>{desc}</div>
      </div>
    </FadeUp>
  )
}

// ── Step card ───────────────────────────────────────────────────
function StepCard({ num, title, desc, color, delay }) {
  return (
    <FadeUp delay={delay}>
      <div style={{
        background: color,
        borderRadius: 20,
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
        height: '100%', boxSizing: 'border-box',
      }}>
        <div style={{
          position: 'absolute', top: -16, right: -16,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
        }} />
        <div style={{
          fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)',
          letterSpacing: 1, marginBottom: 16,
        }}>0{num}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '-0.3px' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>{desc}</div>
      </div>
    </FadeUp>
  )
}

// ── Pricing card ────────────────────────────────────────────────
function PricingCard({ plan, price, desc, features, cta, highlight, nav }) {
  return (
    <div style={{
      background: highlight ? P.teal : P.white,
      border: `2px solid ${highlight ? P.teal : P.creamBd}`,
      borderRadius: 20,
      padding: '32px 28px',
      position: 'relative',
      transform: highlight ? 'scale(1.03)' : 'none',
      boxShadow: highlight ? '0 20px 60px rgba(26,122,114,0.25)' : '0 2px 8px rgba(26,122,114,0.06)',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: P.coral, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
          letterSpacing: 0.5,
        }}>MOST POPULAR</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? P.mintLight : P.text3, letterSpacing: 0.5, marginBottom: 8 }}>{plan}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: highlight ? '#fff' : P.text, letterSpacing: '-2px', marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 12, color: highlight ? 'rgba(255,255,255,0.6)' : P.text3, marginBottom: 24 }}>{desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {features.map(f => (
          <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: highlight ? P.mintLight : P.mintDeep, fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 13, color: highlight ? 'rgba(255,255,255,0.85)' : P.text2 }}>{f}</span>
          </div>
        ))}
      </div>
      <button onClick={() => nav('/auth')} style={{
        width: '100%', padding: '12px', borderRadius: 10,
        border: 'none',
        background: highlight ? P.coral : P.teal,
        color: '#fff', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: F,
        transition: 'opacity .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {cta}
      </button>
    </div>
  )
}

// ── Nav ─────────────────────────────────────────────────────────
function TopNav({ nav, scrolled }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(253,250,245,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? `1px solid ${P.creamBd}` : 'none',
      transition: 'all .3s',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)', display: 'flex', alignItems: 'center', height: 60, gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => nav('/')}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${P.mint} 0%, ${P.teal} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: P.teal, letterSpacing: '-0.5px' }}>SSLVault</span>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 28, justifyContent: 'center' }}>
          {[['Features', '#platform'], ['Security', '#security'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 13, fontWeight: 500, color: P.text2, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = P.teal}
              onMouseLeave={e => e.target.style.color = P.text2}
            >{label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => nav('/auth')} style={{
            padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${P.creamBd}`, background: 'transparent',
            color: P.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
          }}>Sign in</button>
          <button onClick={() => nav('/auth')} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: P.teal, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
            transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = P.tealDeep}
            onMouseLeave={e => e.currentTarget.style.background = P.teal}
          >Get started free</button>
        </div>
      </div>
    </nav>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function Home({ nav }) {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setUser(data.user) })
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  if (user) { nav('/dashboard'); return null }

  const features = [
    { icon: '🔍', title: 'Auto-Discovery',    accent: P.mint,  desc: 'Scan your entire domain portfolio via CT logs, DNS and server probes. Nothing slips through the cracks.' },
    { icon: '⚡', title: 'Instant Issuance',  accent: P.coral, desc: 'RapidSSL DV certificates issued in minutes. DNS validation happens automatically with your connected provider.' },
    { icon: '♻️', title: 'Zero-Touch Renewal', accent: P.teal, desc: 'Certs renew 30 days before expiry, redeploy to your servers, zero manual steps, zero downtime.' },
    { icon: '🔒', title: 'Key Vault',          accent: P.mint,  desc: 'Private keys encrypted with AES-256-GCM envelope encryption. Keys never leave your infrastructure unencrypted.' },
    { icon: '🖥️', title: 'VPS Agent',          accent: P.coral, desc: 'Lightweight daemon installs on your server in 30 seconds. Handles nginx/apache cert deployment automatically.' },
    { icon: '📊', title: 'TLS Intelligence',   accent: P.teal,  desc: 'Health scores, CT abuse monitoring, audit trails, and CA intelligence — all in one place.' },
  ]

  return (
    <div style={{ fontFamily: F, background: P.cream, color: P.text, minHeight: '100vh' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>

      <TopNav nav={nav} scrolled={scrolled} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${P.mintLight}40 0%, transparent 60%), ${P.cream}`,
        display: 'flex', alignItems: 'center',
        padding: 'clamp(100px,14vw,140px) clamp(20px,5vw,48px) clamp(80px,10vw,120px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:'15%', right:'8%', width:320, height:320, borderRadius:'50%', background:`radial-gradient(circle, ${P.coralLight}30 0%, transparent 70%)`, animation:'float 6s ease-in-out infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'20%', left:'5%', width:240, height:240, borderRadius:'50%', background:`radial-gradient(circle, ${P.mintLight}40 0%, transparent 70%)`, animation:'float 8s ease-in-out infinite reverse', pointerEvents:'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 60, alignItems: 'center' }}>

            {/* Left */}
            <div style={{ animation: 'fadeUp .7s cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 20,
                background: P.mintLight + '30', border: `1px solid ${P.mint}40`,
                fontSize: 12, fontWeight: 600, color: P.teal, marginBottom: 28,
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: P.mint, display:'block' }}/>
                Trusted by SSL-first teams worldwide
              </div>

              <h1 style={{
                fontSize: 'clamp(38px, 5.5vw, 72px)',
                fontWeight: 800, lineHeight: 1.08,
                letterSpacing: '-2px', color: P.teal,
                margin: '0 0 8px',
              }}>
                SSL that runs
              </h1>
              <h1 style={{
                fontSize: 'clamp(38px, 5.5vw, 72px)',
                fontWeight: 800, lineHeight: 1.08,
                letterSpacing: '-2px',
                margin: '0 0 24px',
                background: `linear-gradient(135deg, ${P.coral} 0%, ${P.mint} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                itself.
              </h1>

              <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: P.text2, lineHeight: 1.7, maxWidth: 520, margin: '0 0 40px' }}>
                Issue, deploy, and auto-renew SSL certificates across your VPS and shared hosting — zero manual steps, forever.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => nav('/auth')} style={{
                  padding: '14px 32px', borderRadius: 12, border: 'none',
                  background: P.teal, color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                  boxShadow: `0 8px 24px ${P.teal}40`,
                  transition: 'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.tealDeep; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = P.teal; e.currentTarget.style.transform = 'none' }}
                >
                  Start for free →
                </button>
                <button onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior:'smooth' })} style={{
                  padding: '14px 28px', borderRadius: 12,
                  border: `1px solid ${P.creamBd}`, background: 'rgba(255,255,255,0.6)',
                  color: P.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                  backdropFilter: 'blur(8px)',
                }}>
                  See how it works
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 48, maxWidth: 480 }}>
                <Stat num="199d" label="Max cert validity" />
                <Stat num="< 5m" label="Time to issue" />
                <Stat num="100%" label="Auto-renewal" />
              </div>
            </div>

            {/* Right: layered cards */}
            <div style={{ animation: 'fadeUp .8s cubic-bezier(.16,1,.3,1) .15s both' }}>
              <LayeredCards />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="platform" style={{ background: P.creamDeep, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: P.text3, textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: P.teal, letterSpacing: '-1.5px', margin: '0 0 14px' }}>
                Four steps. Then it runs itself.
              </h2>
              <p style={{ fontSize: 16, color: P.text2, maxWidth: 500, margin: '0 auto' }}>
                Set up once — SSLVault handles everything from issuance to renewal to deployment.
              </p>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { title: 'Connect DNS',       desc: 'Link Cloudflare, Vercel, or any major DNS provider. One-time setup takes 60 seconds.', color: `linear-gradient(135deg, ${P.mint} 0%, ${P.mintDeep} 100%)` },
              { title: 'Issue Certificate', desc: 'Enter your domain. DNS validation runs automatically. Cert issued in minutes.', color: `linear-gradient(135deg, #A8E6D8 0%, ${P.mint} 100%)` },
              { title: 'Deploy to Server',  desc: 'Connect your VPS via one-line agent install or enter cPanel credentials. Done.', color: `linear-gradient(135deg, ${P.coral}CC 0%, ${P.coral} 100%)` },
              { title: 'Auto-Renew',        desc: 'Certs renew 30 days early, reissue with fresh DCV, redeploy — all automatic.', color: `linear-gradient(135deg, ${P.teal} 0%, ${P.tealDeep} 100%)` },
            ].map((s, i) => <StepCard key={s.title} num={i+1} {...s} delay={i * 80} />)}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ background: P.cream, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: P.text3, textTransform: 'uppercase', marginBottom: 12 }}>Features</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: P.teal, letterSpacing: '-1.5px', margin: 0 }}>
                Everything SSL. One platform.
              </h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {features.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 60} />)}
          </div>
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────────── */}
      <section id="security" style={{ background: P.teal, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <FadeUp>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: P.mintLight, textTransform: 'uppercase', marginBottom: 16 }}>Security first</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 20px' }}>
                Your keys never leave your server.
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, margin: '0 0 32px' }}>
                Private keys are encrypted with AES-256-GCM envelope encryption — only your server's agent can decrypt them. We store the encrypted blob, never the key.
              </p>
              {[
                'AES-256-GCM envelope encryption',
                'Per-user key encryption keys (KEK)',
                'Keys rotate on every reissue',
                'Full audit trail on every access',
                'Private key never transmitted in plaintext',
              ].map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ color: P.mintLight, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{f}</span>
                </div>
              ))}
            </FadeUp>

            <FadeUp delay={120}>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '32px',
                fontFamily: MONO, fontSize: 12,
                color: P.mintLight, lineHeight: 2,
              }}>
                {[
                  '# Certificate issued',
                  '✓ GGS order #3548995 active',
                  '✓ DNS TXT auto-added (Cloudflare)',
                  '✓ Private key → KeyVault encrypted',
                  '',
                  '# Agent job dispatched',
                  '✓ Agent dbd1c08f online',
                  '✓ cert_pem + key_pem delivered',
                  '✓ nginx reloaded — cert live',
                  '',
                  '# Next renewal in 169 days',
                  '✓ Auto-reissue scheduled',
                ].map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('#') ? 'rgba(255,255,255,0.4)' : line.startsWith('✓') ? P.mintLight : 'rgba(255,255,255,0.3)' }}>
                    {line || <br />}
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" style={{ background: P.creamDeep, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: P.text3, textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: P.teal, letterSpacing: '-1.5px', margin: '0 0 14px' }}>Simple, honest pricing.</h2>
              <p style={{ fontSize: 16, color: P.text2 }}>No surprises. No hidden fees. Pay for what you use.</p>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'center' }}>
            <PricingCard
              plan="STARTER" price="Free" desc="For personal projects"
              features={['1 certificate', 'Auto-renewal', 'VPS agent', 'DNS auto-validation']}
              cta="Get started free" nav={nav}
            />
            <PricingCard
              plan="PRO" price="€9/mo" desc="Per domain, per year"
              features={['Unlimited certs', 'Auto-renewal & reissue', 'VPS + cPanel support', 'KeyVault encryption', 'CT Watch monitoring', 'Priority support']}
              cta="Start Pro" highlight nav={nav}
            />
            <PricingCard
              plan="ENTERPRISE" price="Custom" desc="For teams and agencies"
              features={['Volume pricing', 'Multi-user access', 'API access', 'SLA guarantee', 'Dedicated support', 'Custom integrations']}
              cta="Talk to us" nav={nav}
            />
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(135deg, ${P.coral} 0%, ${P.coralDeep} 100%)`,
        padding: 'clamp(60px,8vw,90px) clamp(20px,5vw,48px)',
        textAlign: 'center',
      }}>
        <FadeUp>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px' }}>
            Never worry about SSL expiry again.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', margin: '0 0 36px' }}>
            Set up in 5 minutes. Auto-runs forever.
          </p>
          <button onClick={() => nav('/auth')} style={{
            padding: '16px 40px', borderRadius: 12, border: 'none',
            background: '#fff', color: P.coralDeep,
            fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: F,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            transition: 'transform .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            Get started free →
          </button>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: P.tealDeep, padding: 'clamp(40px,6vw,60px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: `linear-gradient(135deg, ${P.mint} 0%, ${P.mintDeep} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: P.mintLight }}>SSLVault</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>© 2026</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Developer', '/developer'], ['Contact', '/contact']].map(([label, href]) => (
              <a key={label} href={href} onClick={e => { e.preventDefault(); nav(href) }}
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
              >{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
