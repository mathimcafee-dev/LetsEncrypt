// Pricing.jsx — SSLVault
// Real pricing based on GoGetSSL reseller rates + platform tiers
import { useState } from 'react'

const S = { fontFamily: "'DM Sans', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" }

function Check({ color = '#00a3e0' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={color + '18'}/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Cross() {
  return <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>—</span>
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '20px 0', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: open ? 'white' : 'rgba(255,255,255,0.75)' }}>{q}</div>
        <span style={{ color: '#00a3e0', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </div>
      {open && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginTop: 12 }}>{a}</div>}
    </div>
  )
}

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    per: 'forever free',
    color: '#00a3e0',
    border: 'rgba(0,163,224,0.25)',
    bg: 'rgba(0,163,224,0.04)',
    desc: 'Everything you need to manage SSL certificates for your own domains. No credit card.',
    highlight: false,
    cta: 'Get Started Free',
    certNote: 'RapidSSL DV from $14/yr per cert',
    features: [
      { text: 'Unlimited DV certificates (GoGetSSL pricing)', yes: true },
      { text: 'Auto DNS validation (Cloudflare, Vercel, GoDaddy, DO)', yes: true },
      { text: 'Auto-reissue (1 day before cert expiry)', yes: true },
      { text: 'Auto-renewal (1 day before order expiry)', yes: true },
      { text: 'VPS agent — Nginx / Apache auto-install', yes: true },
      { text: 'cPanel auto-install (4-step activation)', yes: true },
      { text: 'Private key vault (AES-256-GCM)', yes: true },
      { text: 'Expiry monitoring & email alerts', yes: true },
      { text: 'TLS posture grading (A–F)', yes: true },
      { text: 'PQC readiness scanner', yes: true },
      { text: 'CA Connectors (DigiCert, Sectigo, SSL.com)', yes: true },
      { text: 'CA Intelligence Suite', yes: true },
      { text: 'OV / EV certificates', yes: false },
      { text: 'Wildcard & SAN certificates', yes: false },
      { text: 'DigiCert Lab (OV/EV automation)', yes: false },
      { text: '3-tier reseller platform', yes: false },
      { text: 'Sub-reseller management', yes: false },
      { text: 'White-label ready', yes: false },
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    per: '/month · billed annually',
    color: '#22c55e',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.05)',
    desc: 'OV, EV, Wildcard and DigiCert automation for power users and agencies.',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Pro →',
    certNote: 'All cert types at GoGetSSL reseller rates',
    features: [
      { text: 'Everything in Starter', yes: true },
      { text: 'OV & EV certificates', yes: true },
      { text: 'Wildcard certificates (all subdomains)', yes: true },
      { text: 'Multi-domain SAN certificates', yes: true },
      { text: 'DigiCert Lab (OV/EV reissue automation)', yes: true },
      { text: 'DigiCert revoke & replace workflow', yes: true },
      { text: 'Portfolio CSV report export', yes: true },
      { text: 'Shadow IT scanner (full history scan)', yes: true },
      { text: 'CA Consolidation advisor', yes: true },
      { text: 'Priority email support', yes: true },
      { text: 'API access (REST)', yes: true },
      { text: '3-tier reseller platform', yes: false },
      { text: 'Sub-reseller management', yes: false },
      { text: 'White-label ready', yes: false },
    ],
  },
  {
    name: 'Reseller',
    price: '$99',
    per: '/month · billed annually',
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.35)',
    bg: 'rgba(167,139,250,0.05)',
    desc: 'Full 3-tier reseller platform. Manage sub-resellers and end customers at scale.',
    highlight: false,
    cta: 'Start Reseller →',
    certNote: 'Volume discounts available on request',
    features: [
      { text: 'Everything in Pro', yes: true },
      { text: '3-tier: Master → Sub-reseller → Customer', yes: true },
      { text: 'Sub-reseller invite & approval flows', yes: true },
      { text: 'Per-reseller portal with branding', yes: true },
      { text: 'Excel export of all orders', yes: true },
      { text: 'Reseller approval email notifications', yes: true },
      { text: 'White-label DNS under your domain', yes: true },
      { text: 'Volume cert pricing (GoGetSSL)', yes: true },
      { text: 'Dedicated account manager', yes: true },
      { text: 'SLA support', yes: true },
    ],
  },
]

const CERT_PRICES = [
  { type: 'RapidSSL Standard DV',   term: '1yr',  price: '$14',  ca: 'DigiCert chain',  badge: null },
  { type: 'RapidSSL Wildcard DV',   term: '1yr',  price: '$72',  ca: 'DigiCert chain',  badge: 'Popular' },
  { type: 'Sectigo PositiveSSL DV', term: '1yr',  price: '$8',   ca: 'Sectigo',         badge: 'Cheapest' },
  { type: 'Sectigo OV',             term: '1yr',  price: '$49',  ca: 'Sectigo',         badge: null },
  { type: 'Sectigo EV',             term: '1yr',  price: '$99',  ca: 'Sectigo',         badge: null },
  { type: 'DigiCert Standard DV',   term: '1yr',  price: '$218', ca: 'DigiCert',        badge: null },
  { type: 'DigiCert OV',            term: '1yr',  price: '$348', ca: 'DigiCert',        badge: null },
  { type: 'DigiCert EV',            term: '1yr',  price: '$695', ca: 'DigiCert',        badge: null },
  { type: 'Multi-domain SAN DV',    term: '1yr',  price: 'from $28', ca: 'Various',     badge: null },
]

const FAQS = [
  { q: 'Is the platform really free?', a: 'Yes. The SSLVault platform is free — issuance, monitoring, agents, auto-renewal, CA connectors, CA intelligence. You pay only for certificates at GoGetSSL rates (from $8/yr). No platform subscription, no per-seat fee, no hidden charges.' },
  { q: 'How does certificate pricing work?', a: 'You pay per certificate per year at GoGetSSL rates, which are significantly below retail. The platform — agents, monitoring, DNS connectors, CA connectors, PQC scanner — is always free.' },
  { q: 'What\'s the difference between cert expiry and order expiry?', a: 'Certificate expiry = when the DV cert itself expires (~6 months for RapidSSL DV). Order expiry = when your 12-month subscription ends (issued_at + 12 months). SSLVault tracks both. Auto-reissue fires 1 day before cert expiry. Auto-renewal fires 1 day before order expiry. These can be different dates.' },
  { q: 'Does SSLVault store my private keys?', a: 'Only if you opt in to KeyLocker. Keys are AES-256-GCM encrypted at rest. Every access is logged with a full audit trail. A 30-second timed reveal prevents screen-share leaks. You can also generate keys on your own server — SSLVault never sees them.' },
  { q: 'What DigiCert features are in DigiCert Lab?', a: 'DigiCert Lab is a sandboxed workspace for CertCentral automation. You connect your own CertCentral API key (never stored in our DB). Features: view your full portfolio, PQC risk scoring, expiry risk map, zero-touch OV/EV reissue (API call preview before executing), revoke & replace workflow, and full portfolio CSV export.' },
  { q: 'Can I manage multiple domains and servers?', a: 'Yes — the platform supports unlimited domains and servers. Add as many DNS connectors, VPS agents, and CA connections as you need. All managed from one dashboard with no per-domain or per-server fees.' },
  { q: 'Is there sandbox / test mode?', a: 'Yes. GoGetSSL sandbox mode is available for testing the full issuance flow without real cost. DigiCert Lab has a sandbox mode for reissue (shows the API call without executing it). Sandbox certs are clearly marked in the dashboard.' },
]

export default function Pricing({ nav }) {
  const [annual] = useState(true)

  return (
    <div style={{ background: '#04090f', minHeight: '100vh', color: 'white', ...S }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box} ::selection{background:#00a3e022;color:#00a3e0}`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 100px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: '#00a3e0',
            letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 12px',
            border: '1px solid rgba(0,163,224,0.25)', borderRadius: 4, marginBottom: 20, ...mono }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, letterSpacing: '-2px',
            lineHeight: 1.05, marginBottom: 16 }}>
            Platform free.<br/>
            <span style={{ color: '#00a3e0' }}>Pay only for certs.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto',
            lineHeight: 1.75 }}>
            SSLVault charges for SSL certificates at GoGetSSL reseller rates.
            The entire CLM platform — agents, monitoring, automation, CA connectors — is free.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 72 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ borderRadius: 10, border: `1px solid ${plan.border}`,
              background: plan.highlight
                ? 'linear-gradient(160deg, rgba(34,197,94,0.07) 0%, rgba(4,9,15,0) 60%)'
                : plan.bg,
              padding: '28px 24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

              {plan.badge && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, borderRadius: 20, padding: '2px 12px',
                  fontSize: 10, fontWeight: 800, color: 'white', whiteSpace: 'nowrap',
                  letterSpacing: '0.5px', ...mono }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: '1.5px',
                textTransform: 'uppercase', marginBottom: 14, ...mono }}>{plan.name}</div>

              {/* Price */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', color: 'white' }}>{plan.price}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 4, ...mono }}>{plan.per}</span>
              </div>

              {/* Cert note */}
              <div style={{ fontSize: 10, color: plan.color, marginBottom: 16, ...mono, opacity: 0.8 }}>
                + {plan.certNote}
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, marginBottom: 24 }}>
                {plan.desc}
              </div>

              <button onClick={() => nav('/auth')}
                style={{ width: '100%', padding: '11px', borderRadius: 6, border: `1px solid ${plan.color}`,
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? 'white' : plan.color,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', ...S,
                  marginBottom: 24, transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = plan.color; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? plan.color : 'transparent'; e.currentTarget.style.color = plan.highlight ? 'white' : plan.color }}>
                {plan.cta}
              </button>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {plan.features.map(f => (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                    opacity: f.yes ? 1 : 0.3 }}>
                    {f.yes ? <Check color={plan.color}/> : <Cross/>}
                    <span style={{ fontSize: 12, color: f.yes ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
                      lineHeight: 1.5 }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Certificate pricing table */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#00a3e0', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 12, ...mono }}>Certificate pricing</div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 10 }}>
              GoGetSSL reseller rates
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
              These are your actual cert costs. The platform is free on top of this.
              Compare: DigiCert DV retail = $218/yr. SSLVault = $14/yr. Same trust chain.
            </p>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 20px' }}>
              {['Certificate type', 'Term', 'CA', 'Price/yr'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase', letterSpacing: '0.8px', ...mono }}>{h}</div>
              ))}
            </div>
            {CERT_PRICES.map((row, i) => (
              <div key={row.type} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '13px 20px', alignItems: 'center',
                borderBottom: i < CERT_PRICES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,163,224,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{row.type}</span>
                  {row.badge && (
                    <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                      background: '#00a3e022', color: '#00a3e0', letterSpacing: '0.5px', ...mono }}>
                      {row.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', ...mono }}>{row.term}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', ...mono }}>{row.ca}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#00a3e0', ...mono }}>{row.price}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, textAlign: 'center', ...mono }}>
            All prices in USD. Certificate prices are GoGetSSL reseller rates — subject to change. Platform features are always free.
          </div>
        </div>

        {/* Enterprise comparison */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '32px',
          background: 'rgba(255,255,255,0.01)', marginBottom: 72, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { name: 'SSLVault', price: '$0–$99', sub: '/month platform + cert costs', color: '#00a3e0',
              note: 'Full CLM. CA-agnostic. Free to start.' },
            { name: 'Venafi TLS Protect', price: '$250k+', sub: '/year', color: 'rgba(255,255,255,0.3)',
              note: 'Enterprise only. No reseller model.' },
            { name: 'Keyfactor Command', price: '$75–200k', sub: '/year', color: 'rgba(255,255,255,0.3)',
              note: 'Mid-market. No cPanel. No free tier.' },
          ].map((item, i) => (
            <div key={item.name} style={{ padding: '24px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: item.color, letterSpacing: '0.5px',
                marginBottom: 10, ...mono }}>{item.name}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: item.color, letterSpacing: '-1px',
                marginBottom: 4, lineHeight: 1 }}>{item.price}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 12, ...mono }}>{item.sub}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{item.note}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 'clamp(20px,2.5vw,32px)', fontWeight: 900, letterSpacing: '-0.8px',
            marginBottom: 32 }}>Frequently asked questions</h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* CTA */}
        <div style={{ border: '1px solid rgba(0,163,224,0.2)', borderRadius: 10,
          padding: '48px 40px', textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,163,224,0.07) 0%, transparent 60%)' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>
            Start for free today.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.7 }}>
            No credit card. No time limit. Full CLM platform from day one.
          </p>
          <button onClick={() => nav('/auth')}
            style={{ background: '#00a3e0', border: 'none', borderRadius: 6, color: 'white',
              fontSize: 14, fontWeight: 700, padding: '13px 28px', cursor: 'pointer', ...S,
              boxShadow: '0 0 30px rgba(0,163,224,0.35)' }}>
            Get Started Free →
          </button>
        </div>
      </div>
    </div>
  )
}
