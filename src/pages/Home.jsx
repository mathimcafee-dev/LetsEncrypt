// Home.jsx — SSLVault landing page
// Aesthetic: refined dark-industrial / authoritative PKI
// Font: DM Sans (headlines) + JetBrains Mono (code/technical)
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Animated counter ──────────────────────────────────────────────────
function useCounter(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0; const step = target / (duration / 16)
    const iv = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(Math.floor(start))
      if (start >= target) clearInterval(iv)
    }, 16)
    return () => clearInterval(iv)
  }, [target])
  return val
}

// ── Intersection observer hook ────────────────────────────────────────
function useVisible(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Section({ children, style = {} }) {
  const [ref, visible] = useVisible()
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease', ...style }}>
      {children}
    </div>
  )
}

// ── Feature pill ──────────────────────────────────────────────────────
function FeaturePill({ text, color = '#00a3e0' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
      fontWeight: 600, padding: '4px 11px', borderRadius: 4,
      background: color + '14', color, border: `1px solid ${color}28`,
      fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.2px' }}>
      {text}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ value, label, sub, color = '#00a3e0', animate = false }) {
  const num = animate ? useCounter(parseInt(value) || 0) : null
  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: 18 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-1.5px', lineHeight: 1,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
        {animate && num !== null ? num + '+' : value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Feature row ───────────────────────────────────────────────────────
const FEATURES = [
  {
    cat: 'ISSUANCE',
    color: '#00a3e0',
    items: [
      { title: 'GoGetSSL API', desc: 'DV, OV, EV, Wildcard, SAN. DigiCert trust chain. ~5 min issuance.' },
      { title: 'Auto DNS Validation', desc: 'Connect Cloudflare, Vercel, GoDaddy or DigitalOcean. DCV records created automatically.' },
      { title: 'CA Connectors', desc: 'Import from DigiCert, Sectigo, SSL.com. Paste any PEM. Unified inventory.' },
    ]
  },
  {
    cat: 'AUTOMATION',
    color: '#22c55e',
    items: [
      { title: 'Zero-touch Renewal', desc: '1 day before cert expiry — fresh cert issued, validated, pushed to agents.' },
      { title: 'VPS Agent', desc: 'Bash daemon polls every 5 min. Nginx/Apache restart. Atomic rollback on failure.' },
      { title: 'cPanel Auto-install', desc: '4-step: install cert, update vhosts, enable HSTS, rebuild mail SNI.' },
    ]
  },
  {
    cat: 'INTELLIGENCE',
    color: '#a78bfa',
    items: [
      { title: 'Cross-CA Expiry Timeline', desc: 'Every cert from every CA, unified by urgency. No-renewal-path flags.' },
      { title: 'Shadow IT Scanner', desc: 'DigiCert API vs SSLVault DB diff. Finds certs outside your CLM inventory.' },
      { title: 'Consolidation Advisor', desc: 'DigiCert DV at $218/yr → GoGetSSL at $14/yr. Savings shown per cert.' },
    ]
  },
  {
    cat: 'SECURITY',
    color: '#f59e0b',
    items: [
      { title: 'PQC Readiness Scanner', desc: 'RSA-2048 flagged High risk. NIST 2030 deadline. Portfolio migration plan.' },
      { title: 'TLS Posture Grading', desc: 'A–F grade per domain. HSTS, redirect, cert chain, security headers.' },
      { title: 'Private Key Vault', desc: 'AES-256-GCM at rest. Immutable audit log. 30-second timed reveal.' },
    ]
  },
  {
    cat: 'PLATFORM',
    color: '#f87171',
    items: [
      { title: '3-tier Reseller', desc: 'Master admin → Sub-reseller → End customer. Invite flows, Excel exports.' },
      { title: 'DigiCert Lab', desc: 'Revoke & replace, zero-touch OV/EV reissue, portfolio CSV export. API sandbox.' },
      { title: 'Agent Health Monitor', desc: 'CPU, RAM, disk, uptime per VPS. Offline alert at 2 missed polls.' },
    ]
  },
]

// ── Comparison table ──────────────────────────────────────────────────
const COMPARE = [
  { feature: 'Certificate issuance',        sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: 'Auto DNS validation',          sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: 'VPS agent install',            sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: 'cPanel auto-install',          sslvault: true,  venafi: false, keyfactor: false },
  { feature: 'Cross-CA expiry timeline',     sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: 'Shadow IT scanner',            sslvault: true,  venafi: true,  keyfactor: false },
  { feature: 'CA consolidation advisor',     sslvault: true,  venafi: false, keyfactor: false },
  { feature: 'PQC readiness scanner',        sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: 'DigiCert OV/EV automation',   sslvault: true,  venafi: true,  keyfactor: true  },
  { feature: '3-tier reseller platform',     sslvault: true,  venafi: false, keyfactor: false },
  { feature: 'Starting price (USD/yr)',      sslvault: '$0',  venafi: '$250k', keyfactor: '$75k' },
]

export default function Home({ nav }) {
  const [certCount, setCertCount] = useState(null)
  const liveCount = useCounter(certCount || 0)
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    supabase.from('certificates').select('id', { count: 'exact', head: true })
      .eq('status', 'active').then(({ count }) => { if (count) setCertCount(count) })
    setTimeout(() => setHeroVisible(true), 80)
  }, [])

  const S = { fontFamily: "'DM Sans', sans-serif" }
  const mono = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" }

  return (
    <div style={{ background: '#04090f', minHeight: '100vh', color: 'white', ...S }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:#00a3e022;color:#00a3e0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        .hero-word{display:inline-block;animation:fadeUp .6s ease both}
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(4,9,15,0.92)', backdropFilter: 'blur(12px)', padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#00a3e0',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>SSLVault</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px',
            textTransform: 'uppercase', marginLeft: 4 }}>CLM Platform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {['Features','Pricing','About'].map(l => (
            <button key={l} onClick={() => nav(l === 'Pricing' ? '/pricing' : l === 'About' ? '/about' : '/#features')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 500, ...S, transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}>
              {l}
            </button>
          ))}
          <button onClick={() => nav('/auth')}
            style={{ background: '#00a3e0', border: 'none', borderRadius: 6, color: 'white',
              fontSize: 12, fontWeight: 700, padding: '7px 16px', cursor: 'pointer', ...S,
              boxShadow: '0 0 20px rgba(0,163,224,0.25)' }}>
            Sign in →
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '100px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `linear-gradient(rgba(0,163,224,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,163,224,0.04) 1px, transparent 1px)`,
          backgroundSize: '60px 60px' }}/>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,163,224,0.12) 0%, transparent 70%)',
          pointerEvents: 'none' }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(0,163,224,0.25)', borderRadius: 4, padding: '5px 12px',
            marginBottom: 32, background: 'rgba(0,163,224,0.06)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00a3e0',
              animation: 'pulse 2s ease infinite' }}/>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#00a3e0', letterSpacing: '1.5px',
              textTransform: 'uppercase', ...mono }}>
              CA-Agnostic Certificate Lifecycle Management
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.02,
            letterSpacing: '-2.5px', marginBottom: 6, maxWidth: 800 }}>
            {'SSL certificates.'.split(' ').map((w, i) => (
              <span key={w} className="hero-word" style={{ animationDelay: `${i * 80}ms`, marginRight: '0.28em' }}>{w}</span>
            ))}
          </h1>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.02,
            letterSpacing: '-2.5px', marginBottom: 6, color: '#00a3e0' }}>
            {'Fully automated.'.split(' ').map((w, i) => (
              <span key={w} className="hero-word" style={{ animationDelay: `${(i + 2) * 80}ms`, marginRight: '0.28em' }}>{w}</span>
            ))}
          </h1>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-1.8px', marginBottom: 28, color: 'rgba(255,255,255,0.35)' }}>
            {'At a fraction of the cost.'.split(' ').map((w, i) => (
              <span key={w} className="hero-word" style={{ animationDelay: `${(i + 4) * 80}ms`, marginRight: '0.28em' }}>{w}</span>
            ))}
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75,
            maxWidth: 520, marginBottom: 40, fontWeight: 400,
            animation: 'fadeUp .7s ease .6s both' }}>
            Built by a <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Certified PKI Specialist</strong> to
            replace Venafi ($250k/yr) and Keyfactor ($75k/yr) for indie devs, SMBs, MSPs, and resellers.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 60,
            animation: 'fadeUp .7s ease .75s both' }}>
            <button onClick={() => nav('/auth')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a3e0',
                border: 'none', borderRadius: 6, color: 'white', fontSize: 14, fontWeight: 700,
                padding: '13px 26px', cursor: 'pointer', ...S,
                boxShadow: '0 0 30px rgba(0,163,224,0.3)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,163,224,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,163,224,0.3)' }}>
              Get Started Free →
            </button>
            <button onClick={() => nav('/pricing')}
              style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600,
                padding: '13px 22px', cursor: 'pointer', ...S, transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}>
              View Pricing
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', animation: 'fadeUp .7s ease .9s both' }}>
            <StatCard value={certCount || 0} label="Active certificates" sub="Across all connected CAs" color="#00a3e0" animate={!!certCount}/>
            <StatCard value="~5 min" label="DV issuance time" sub="GoGetSSL · DigiCert chain" color="#22c55e"/>
            <StatCard value="$0" label="Free to start" sub="No credit card required" color="#a78bfa"/>
            <StatCard value="94%" label="vs Venafi cost" sub="Same core CLM features" color="#f59e0b"/>
          </div>
        </div>
      </div>

      {/* ── TICKER STRIP ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)', overflow: 'hidden', padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap',
          justifyContent: 'center', padding: '0 32px' }}>
          {['Nginx', 'Apache', 'cPanel', 'Plesk', 'Cloudflare', 'Vercel', 'GoDaddy', 'DigitalOcean',
            'DigiCert', 'Sectigo', 'SSL.com', 'GoGetSSL', 'Ubuntu', 'Debian'].map(p => (
            <span key={p} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', ...mono }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID ────────────────────────────────────────────── */}
      <div id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#00a3e0', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 14, ...mono }}>
              Platform capabilities
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 14 }}>
              Everything a PKI team needs.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              15 features that make SSLVault a complete CLM platform — not just a cert issuance tool.
            </p>
          </div>
        </Section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FEATURES.map((group, gi) => (
            <Section key={group.cat} style={{ transitionDelay: `${gi * 80}ms` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0,
                borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Category label */}
                <div style={{ padding: '28px 24px 28px 0', display: 'flex', alignItems: 'flex-start', paddingTop: 32 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '2px',
                    textTransform: 'uppercase', color: group.color, ...mono }}>
                    {group.cat}
                  </span>
                </div>
                {/* Feature cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '20px 0' }}>
                  {group.items.map((item, ii) => (
                    <div key={item.title}
                      style={{ padding: '20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)', transition: 'all .2s', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${group.color}0a`; e.currentTarget.style.borderColor = `${group.color}30` }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color, marginBottom: 12 }}/>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          ))}
        </div>
      </div>

      {/* ── COMPARISON TABLE ──────────────────────────────────────────── */}
      <Section>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '80px 32px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#00a3e0', letterSpacing: '2px',
                textTransform: 'uppercase', marginBottom: 14, ...mono }}>vs Enterprise CLM</div>
              <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, letterSpacing: '-1.2px' }}>
                Enterprise power. Startup price.
              </h2>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '14px 20px', fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', ...mono }}>Feature</div>
                {[['SSLVault', '#00a3e0'], ['Venafi', 'rgba(255,255,255,0.3)'], ['Keyfactor', 'rgba(255,255,255,0.3)']].map(([name, color]) => (
                  <div key={name} style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color, ...mono }}>{name}</span>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {COMPARE.map((row, i) => (
                <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  borderBottom: i < COMPARE.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,163,224,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                  <div style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{row.feature}</div>
                  {[row.sslvault, row.venafi, row.keyfactor].map((val, ci) => (
                    <div key={ci} style={{ padding: '12px 20px', textAlign: 'center', display: 'flex',
                      alignItems: 'center', justifyContent: 'center' }}>
                      {typeof val === 'boolean' ? (
                        val
                          ? <span style={{ color: ci === 0 ? '#22c55e' : 'rgba(255,255,255,0.3)', fontSize: 14 }}>✓</span>
                          : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>—</span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 800, ...mono,
                          color: ci === 0 ? '#00a3e0' : '#ef4444' }}>{val}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#00a3e0', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 14, ...mono }}>Four steps</div>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, letterSpacing: '-1.2px' }}>
              Issue. Monitor. Renew. Deploy.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2 }}>
            {[
              { n: '01', label: 'Issue', color: '#00a3e0', desc: 'Order DV, OV, EV or Wildcard. Auto DNS challenge via Cloudflare, Vercel, GoDaddy.' },
              { n: '02', label: 'Monitor', color: '#22c55e', desc: 'Track expiry across every CA, domain, customer. TLS grading. PQC risk scoring.' },
              { n: '03', label: 'Renew', color: '#a78bfa', desc: '1 day before expiry. New cert issued, validated, installed. Zero touch.' },
              { n: '04', label: 'Deploy', color: '#f59e0b', desc: 'VPS agent or cPanel push. Nginx/Apache restart. Job queued, installed, reported.' },
            ].map(({ n, label, color, desc }, i) => (
              <div key={n}
                style={{ padding: '32px 24px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 11, color: color, fontWeight: 700, ...mono, marginBottom: 12 }}>{n}</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px 100px' }}>
          <div style={{ border: '1px solid rgba(0,163,224,0.2)', borderRadius: 12, padding: '64px 48px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0,163,224,0.08) 0%, transparent 60%)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#00a3e0', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 20, ...mono }}>
              Start today
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px',
              marginBottom: 14, lineHeight: 1.05 }}>
              Beat Venafi at a fraction<br/>of the price.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
              Full CLM platform — issuance, monitoring, zero-touch renewal, VPS agent, cPanel push,
              PQC scanner, CA connectors, consolidation advisor. Start free.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => nav('/auth')}
                style={{ background: '#00a3e0', border: 'none', borderRadius: 6, color: 'white',
                  fontSize: 14, fontWeight: 700, padding: '13px 28px', cursor: 'pointer', ...S,
                  boxShadow: '0 0 40px rgba(0,163,224,0.4)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,163,224,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,163,224,0.4)' }}>
                Get Started Free →
              </button>
              <button onClick={() => nav('/pricing')}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600,
                  padding: '13px 22px', cursor: 'pointer', ...S, transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: '#00a3e0',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700 }}>SSLVault</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', ...mono }}>
            · PKI-first CLM · Made with ♥ in the Netherlands
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['About', '/about'], ['Pricing', '/pricing']].map(([l, p]) => (
            <button key={l} onClick={() => nav(p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'rgba(255,255,255,0.3)', ...S, transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
              {l}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
