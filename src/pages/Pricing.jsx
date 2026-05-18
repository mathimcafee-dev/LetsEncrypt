// Pricing.jsx — SSLVault
import { useState } from 'react'

const S  = { fontFamily: "'Inter var','Inter',system-ui,-apple-system,sans-serif" }
const Mo = { fontFamily: "'JetBrains Mono','Fira Mono','Menlo',monospace" }

function Tick({ color = '#10b981' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={color + '22'}/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Dash() {
  return <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 14, lineHeight: 1 }}>—</span>
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)}
         style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 0', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: open ? 'white' : 'rgba(255,255,255,0.7)' }}>{q}</div>
        <span style={{ color: '#10b981', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.8, marginTop: 12 }}>{a}</div>
      )}
    </div>
  )
}

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    per: 'forever free',
    color: '#10b981',
    border: 'rgba(16,185,129,0.22)',
    desc: 'Full CLM platform for managing your own domains. No credit card required.',
    highlight: false,
    cta: 'Get Started Free',
    certNote: 'Certs from $8/yr via GoGetSSL',
    features: [
      { t: 'Issue DV certificates via GoGetSSL', y: true },
      { t: 'Auto DNS validation (Cloudflare, GoDaddy, Vercel, DigitalOcean)', y: true },
      { t: 'Auto-reissue before cert expiry', y: true },
      { t: 'Auto-renewal before order expiry', y: true },
      { t: 'Persistent agent — Nginx/Apache auto-install & renewal', y: true },
      { t: 'cPanel auto-install (PHP agent)', y: true },
      { t: 'SSL inventory & expiry monitoring', y: true },
      { t: 'Email expiry alerts', y: true },
      { t: 'CT Log discovery (find all certs for your domains)', y: true },
      { t: 'DNS provider scanner', y: true },
      { t: 'KeyLocker (AES-256-GCM private key vault)', y: true },
      { t: 'Bulk import existing certificates', y: true },
      { t: 'GoGetSSL sandbox mode', y: true },
      { t: 'OV / EV certificates', y: false },
      { t: 'Wildcard & SAN certificates', y: false },
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    per: '/month · billed annually',
    color: '#6366f1',
    border: 'rgba(99,102,241,0.3)',
    desc: 'OV, EV, Wildcard and advanced automation for agencies and power users.',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Pro',
    certNote: 'All cert types at GoGetSSL partner rates',
    features: [
      { t: 'Everything in Starter', y: true },
      { t: 'OV & EV certificates', y: true },
      { t: 'Wildcard certificates (all subdomains)', y: true },
      { t: 'Multi-domain SAN certificates', y: true },
      { t: 'Portfolio CSV / Excel report export', y: true },
      { t: 'Full CT log history scan (shadow IT)', y: true },
      { t: 'CA Consolidation advisor', y: true },
      { t: 'API access (REST)', y: true },
      { t: 'Priority email support', y: true },
    ],
  },
  {
    name: 'Reseller',
    price: '$99',
    per: '/month · billed annually',
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.28)',
    desc: 'Full 3-tier reseller platform. Manage sub-resellers and end customers at scale.',
    highlight: false,
    cta: 'Start Reseller',
    certNote: 'Volume pricing on request',
    features: [
      { t: 'Everything in Pro', y: true },
      { t: '3-tier: Master Admin → Sub-reseller → End Customer', y: true },
      { t: 'Sub-reseller invite, approval & management', y: true },
      { t: 'Per-reseller portal with custom branding', y: true },
      { t: 'Excel export of all reseller orders', y: true },
      { t: 'Approval email notifications to sub-resellers', y: true },
      { t: 'Magic link invite → set-password auth flow', y: true },
      { t: 'Volume certificate pricing (GoGetSSL)', y: true },
      { t: 'Dedicated account manager', y: true },
      { t: 'SLA support', y: true },
    ],
  },
]

const CERT_PRICES = [
  { type: 'Sectigo PositiveSSL DV',   term: '1yr', price: '$8',    ca: 'Sectigo',        badge: 'Cheapest' },
  { type: 'RapidSSL Standard DV',     term: '1yr', price: '$14',   ca: 'DigiCert chain', badge: null },
  { type: 'RapidSSL Wildcard DV',     term: '1yr', price: '$72',   ca: 'DigiCert chain', badge: 'Popular' },
  { type: 'Sectigo OV',               term: '1yr', price: '$49',   ca: 'Sectigo',        badge: null },
  { type: 'Sectigo EV',               term: '1yr', price: '$99',   ca: 'Sectigo',        badge: null },
  { type: 'Multi-domain SAN DV',      term: '1yr', price: 'from $28', ca: 'Various',     badge: null },
  { type: 'DigiCert Standard DV',     term: '1yr', price: '$218',  ca: 'DigiCert',       badge: null },
  { type: 'DigiCert OV',              term: '1yr', price: '$348',  ca: 'DigiCert',       badge: null },
  { type: 'DigiCert EV',              term: '1yr', price: '$695',  ca: 'DigiCert',       badge: null },
]

const FAQS = [
  { q: 'Is the platform really free?', a: 'Yes. The SSLVault CLM platform is free — issuance workflow, persistent agent, cPanel installer, DNS connectors, CT log discovery, monitoring, auto-renewal, KeyLocker, CA intelligence. You pay only for certificates at GoGetSSL partner rates (from $8/yr). No platform fee, no per-domain fee, no per-seat fee.' },
  { q: 'What is the difference between cert expiry and order expiry?', a: 'Certificate expiry: when the TLS cert itself expires (e.g. ~6 months for RapidSSL DV). Order expiry: when your 12-month subscription to that cert ends. SSLVault tracks both separately. Auto-reissue fires before cert expiry; auto-renewal fires before order expiry.' },
  { q: 'How does the persistent agent work?', a: 'The agent is a bash daemon running as a systemd service on your Linux VPS. It polls SSLVault every 5 minutes for pending jobs. It makes outbound-only HTTPS connections — no inbound ports needed. It detects your OS and web server (Nginx/Apache), writes cert files, updates config, tests, and reloads automatically.' },
  { q: 'Does SSLVault store my private keys?', a: 'Only if you opt into KeyLocker. Keys are AES-256-GCM encrypted at rest. Every access is logged. The reveal UI is copy-only with a 30-second timed display to prevent screen-share leaks. You can also generate keys on your own server via the agent — SSLVault never sees them.' },
  { q: 'Can I import certificates I already have?', a: 'Yes. Dashboard → Import. Paste existing PEM files and SSLVault parses the chain, extracts expiry and issuer details, and adds them to your inventory for monitoring and renewal tracking.' },
  { q: 'Is there a sandbox / test mode?', a: 'Yes. GoGetSSL sandbox mode is available for testing the full issuance flow without real cost. Sandbox certs are clearly marked in the dashboard.' },
]

export default function Pricing({ nav }) {
  return (
    <div style={{ background: '#04090f', minHeight: '100vh', color: 'white', ...S }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box} ::selection{background:#10b98122;color:#10b981} .spin{animation:spin .8s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 100px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: '#10b981',
            letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 12px',
            border: '1px solid rgba(16,185,129,0.22)', borderRadius: 4, marginBottom: 20, ...Mo }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-2px',
            lineHeight: 1.05, marginBottom: 16 }}>
            Platform free.<br/>
            <span style={{ color: '#10b981' }}>Pay only for certs.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
            The entire CLM platform — agents, monitoring, auto-renewal, DNS connectors, CT discovery, CA intelligence — is always free.
            You pay only for certificates at GoGetSSL partner rates.
          </p>
        </div>

        {/* PLAN CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 72 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              borderRadius: 10, border: `1px solid ${plan.border}`,
              background: plan.highlight
                ? `linear-gradient(160deg, ${plan.color}0a 0%, rgba(4,9,15,0) 60%)`
                : 'rgba(255,255,255,0.01)',
              padding: '28px 22px', position: 'relative', display: 'flex', flexDirection: 'column'
            }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, borderRadius: 20, padding: '2px 12px',
                  fontSize: 10, fontWeight: 800, color: 'white', whiteSpace: 'nowrap',
                  letterSpacing: '0.5px', ...Mo }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, color: plan.color, letterSpacing: '1.5px',
                textTransform: 'uppercase', marginBottom: 14, ...Mo }}>{plan.name}</div>

              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-2px' }}>{plan.price}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4, ...Mo }}>{plan.per}</span>
              </div>

              <div style={{ fontSize: 10, color: plan.color, marginBottom: 16, ...Mo, opacity: 0.75 }}>
                + {plan.certNote}
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, marginBottom: 22 }}>
                {plan.desc}
              </div>

              <button onClick={() => nav('/auth')}
                style={{ width: '100%', padding: '11px', borderRadius: 6, border: `1px solid ${plan.color}`,
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? 'white' : plan.color,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', ...S, marginBottom: 22, transition: 'all .18s' }}
                onMouseEnter={e => { e.currentTarget.style.background = plan.color; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? plan.color : 'transparent'; e.currentTarget.style.color = plan.highlight ? 'white' : plan.color }}>
                {plan.cta}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {plan.features.map(f => (
                  <div key={f.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: f.y ? 1 : 0.25 }}>
                    {f.y ? <Tick color={plan.color}/> : <Dash/>}
                    <span style={{ fontSize: 12, color: f.y ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CERT PRICING TABLE */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 12, ...Mo }}>Certificate pricing</div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 10 }}>
              GoGetSSL partner rates
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
              These are your actual cert costs. The platform is always free on top.
              Compare: DigiCert DV retail $218/yr vs. SSLVault $14/yr — same trust chain.
            </p>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '12px 20px' }}>
              {['Certificate type', 'Term', 'CA', 'Price/yr'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)',
                  textTransform: 'uppercase', letterSpacing: '0.8px', ...Mo }}>{h}</div>
              ))}
            </div>
            {CERT_PRICES.map((row, i) => (
              <div key={row.type} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '13px 20px', alignItems: 'center',
                borderBottom: i < CERT_PRICES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>{row.type}</span>
                  {row.badge && (
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                      background: '#10b98118', color: '#10b981', letterSpacing: '0.5px', ...Mo }}>
                      {row.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', ...Mo }}>{row.term}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', ...Mo }}>{row.ca}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', ...Mo }}>{row.price}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 12, textAlign: 'center', ...Mo }}>
            All prices in USD. GoGetSSL partner rates — subject to change. Platform features always free.
          </div>
        </div>

        {/* COMPARISON */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '32px',
          background: 'rgba(255,255,255,0.01)', marginBottom: 72, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { name: 'SSLVault', price: '$0–$99', sub: '/month platform + cert costs', color: '#10b981', note: 'Full CLM. CA-agnostic. Free to start.' },
            { name: 'Venafi TLS Protect', price: '$250k+', sub: '/year', color: 'rgba(255,255,255,0.28)', note: 'Enterprise only. SMB & developer focused.' },
            { name: 'Keyfactor Command', price: '$75–200k', sub: '/year', color: 'rgba(255,255,255,0.28)', note: 'Mid-market. No cPanel. No free tier.' },
          ].map((item, i) => (
            <div key={item.name} style={{ padding: '24px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: '0.5px', marginBottom: 10, ...Mo }}>{item.name}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: item.color, letterSpacing: '-1px', marginBottom: 4, lineHeight: 1 }}>{item.price}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 12, ...Mo }}>{item.sub}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{item.note}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 'clamp(20px,2.5vw,32px)', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 32 }}>
            Frequently asked questions
          </h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* CTA */}
        <div style={{ border: '1px solid rgba(16,185,129,0.18)', borderRadius: 10, padding: '48px 40px', textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 60%)' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>
            Start for free today.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.7 }}>
            No credit card. No time limit. Full CLM platform from day one.
          </p>
          <button onClick={() => nav('/auth')}
            style={{ background: '#10b981', border: 'none', borderRadius: 6, color: 'white',
              fontSize: 14, fontWeight: 700, padding: '13px 28px', cursor: 'pointer', ...S,
              boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
            Get Started Free →
          </button>
        </div>

      </div>
    </div>
  )
}
