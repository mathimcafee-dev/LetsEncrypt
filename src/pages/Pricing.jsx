// Pricing.jsx — SSLVault · Updated with all current features
import { useState } from 'react'

const S  = { fontFamily: "'Inter var','Inter',system-ui,-apple-system,sans-serif" }
const Mo = { fontFamily: "'JetBrains Mono','Fira Mono','Menlo',monospace" }

function Tick({ color = '#10b981' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="11" fill={color + '22'}/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.04)"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)}
         style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '18px 0', cursor: 'pointer' }}>
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

// ── Feature sections per plan ────────────────────────────────────────
const FEATURES = [
  {
    section: 'Certificate issuance',
    rows: [
      { label: 'DV certificates (RapidSSL / Sectigo)',  starter: true,  pro: true,  reseller: true  },
      { label: 'OV & EV certificates',                  starter: false, pro: true,  reseller: true  },
      { label: 'Wildcard certificates',                 starter: false, pro: true,  reseller: true  },
      { label: 'Multi-domain SAN certificates',         starter: false, pro: true,  reseller: true  },
      { label: 'GoGetSSL sandbox / test mode',          starter: true,  pro: true,  reseller: true  },
    ],
  },
  {
    section: 'Automation',
    rows: [
      { label: 'Persistent agent (VPS — Nginx / Apache)', starter: true, pro: true, reseller: true },
      { label: 'cPanel auto-install',                    starter: true,  pro: true,  reseller: true  },
      { label: 'Auto DNS validation (Cloudflare, Vercel, Route53…)', starter: true, pro: true, reseller: true },
      { label: 'Auto-renew before cert expiry',          starter: true,  pro: true,  reseller: true  },
      { label: 'Auto-renew before order expiry',         starter: true,  pro: true,  reseller: true  },
      { label: 'Agent health monitoring (CPU / RAM / Disk)', starter: true, pro: true, reseller: true },
      { label: 'Multi-server fleet management',          starter: true,  pro: true,  reseller: true  },
    ],
  },
  {
    section: 'Monitoring & intelligence',
    rows: [
      { label: 'Inventory & expiry monitoring',          starter: true,  pro: true,  reseller: true  },
      { label: 'Email expiry alerts (30 / 14 / 7 days)', starter: true, pro: true,  reseller: true  },
      { label: 'Renewal Calendar (GitHub heatmap)',      starter: true,  pro: true,  reseller: true  },
      { label: 'SSL Health Score (A+ to F)',             starter: true,  pro: true,  reseller: true  },
      { label: 'CT Log discovery',                       starter: true,  pro: true,  reseller: true  },
      { label: 'CT Abuse Monitor',                       starter: false, pro: true,  reseller: true  },
      { label: '47-Day Readiness Dashboard (CA/B Forum 2026–2029)', starter: true, pro: true, reseller: true },
    ],
  },
  {
    section: 'CA Intelligence',
    rows: [
      { label: 'DigiCert CertCentral portfolio sync',   starter: false, pro: true,  reseller: true  },
      { label: 'Sectigo SCM portfolio sync',            starter: false, pro: true,  reseller: true  },
      { label: 'Shadow IT detection',                   starter: false, pro: true,  reseller: true  },
      { label: 'Policy engine (fleet compliance rules)', starter: false, pro: true, reseller: true  },
      { label: 'Portfolio CSV export',                  starter: false, pro: true,  reseller: true  },
      { label: 'CA consolidation advisor',              starter: false, pro: true,  reseller: true  },
    ],
  },
  {
    section: 'Security',
    rows: [
      { label: 'KeyLocker — AES-256-GCM key vault',     starter: true,  pro: true,  reseller: true  },
      { label: 'Key reveal with password re-auth',      starter: true,  pro: true,  reseller: true  },
      { label: 'Key rotation with 30-day archive',      starter: true,  pro: true,  reseller: true  },
      { label: 'Immutable audit log + CSV export',      starter: true,  pro: true,  reseller: true  },
    ],
  },
  {
    section: 'Reseller & multi-tenant',
    rows: [
      { label: 'Sub-reseller registration & approval',  starter: false, pro: false, reseller: true  },
      { label: 'End-customer portal',                   starter: false, pro: false, reseller: true  },
      { label: 'Customer invite (magic link)',          starter: false, pro: false, reseller: true  },
      { label: 'Order management on behalf of customers', starter: false, pro: false, reseller: true },
      { label: 'Excel order export',                    starter: false, pro: false, reseller: true  },
      { label: 'White-label dashboard',                 starter: false, pro: false, reseller: true  },
    ],
  },
  {
    section: 'Platform',
    rows: [
      { label: 'Bulk domain scanner (public)',          starter: true,  pro: true,  reseller: true  },
      { label: 'Bulk import existing certificates',     starter: true,  pro: true,  reseller: true  },
      { label: 'REST API access',                       starter: false, pro: true,  reseller: true  },
      { label: 'Priority email support',                starter: false, pro: true,  reseller: true  },
      { label: 'Dedicated account manager',             starter: false, pro: false, reseller: true  },
    ],
  },
]

const CERT_PRICES = [
  { type: 'Sectigo PositiveSSL DV',      term: '1yr', price: '$8',      ca: 'Sectigo',        badge: 'Cheapest' },
  { type: 'RapidSSL Standard DV',        term: '1yr', price: '$14',     ca: 'DigiCert chain', badge: null },
  { type: 'RapidSSL Wildcard DV',        term: '1yr', price: '$72',     ca: 'DigiCert chain', badge: 'Popular' },
  { type: 'Sectigo OV',                  term: '1yr', price: '$49',     ca: 'Sectigo',        badge: null },
  { type: 'Sectigo EV',                  term: '1yr', price: '$99',     ca: 'Sectigo',        badge: null },
  { type: 'Multi-domain SAN DV',         term: '1yr', price: 'from $28', ca: 'Various',       badge: null },
  { type: 'DigiCert Standard DV',        term: '1yr', price: '$218',    ca: 'DigiCert',       badge: null },
  { type: 'DigiCert OV',                 term: '1yr', price: '$348',    ca: 'DigiCert',       badge: null },
  { type: 'DigiCert EV',                 term: '1yr', price: '$695',    ca: 'DigiCert',       badge: null },
]

const FAQS = [
  { q: 'What does the Starter plan include?', a: 'The Starter plan includes: issuance workflow, persistent agent, cPanel installer, DNS connectors, CT log discovery, monitoring, auto-renewal, KeyLocker, 47-Day Readiness, Renewal Calendar, and SSL Health Score. Certificates are purchased at GoGetSSL partner rates from $8/yr.' },
  { q: 'What does Pro add over Starter?', a: 'Pro unlocks OV, EV, Wildcard and SAN certificates, plus CA Intelligence (DigiCert/Sectigo portfolio sync, shadow IT detection, policy engine), CT Abuse Monitor, REST API access, and portfolio CSV exports. Designed for agencies and teams managing certificates across multiple CAs.' },
  { q: 'What is the 47-Day Readiness Dashboard?', a: 'The CA/B Forum is mandating shorter certificate validity: 200 days by March 2026, 100 days by 2027, 47 days by 2029. The Readiness Dashboard scores each certificate 0–100 and shows a checklist of what to fix — auto-renew, DNS provider, agent installation, key storage. Available on all plans.' },
  { q: 'How does the persistent agent work?', a: 'The agent is a bash daemon running as a systemd service on your Linux VPS. It polls SSLVault every 5 minutes for pending jobs. Outbound-only HTTPS — no inbound ports. Detects Nginx/Apache, writes cert files, updates config, tests, and reloads automatically. CPU/RAM/disk stats reported back to SSLVault.' },
  { q: 'Does SSLVault store my private keys?', a: 'Only if you opt into KeyLocker. Keys are AES-256-GCM encrypted with envelope encryption (DEK + KEK). Every reveal requires password re-authentication. The reveal UI is copy-only with a 30-second timed display. Every access is logged to an immutable audit trail. Available on all plans.' },
  { q: 'What is shadow IT detection?', a: 'SSLVault scans CT logs for certificates issued for your domains by CAs you did not authorise. These appear in the CA Intelligence → Shadow IT tab. You can approve known certs or dismiss false positives. Prevents silent certificate issuance by unknown parties.' },
  { q: 'What is the Reseller plan?', a: 'Reseller enables multi-tenant architecture: you can register sub-resellers, onboard end-customers via magic link invites, manage orders on their behalf, and export Excel reports. Designed for SSL resellers and MSPs. Contact us for pricing.' },
  { q: 'Can I import certificates I already have?', a: 'Yes. Dashboard → Import. Paste existing PEM files and SSLVault parses the chain, extracts expiry and issuer, and adds them to your inventory for monitoring, expiry alerts, and renewal tracking.' },
]

const PLANS = [
  { key: 'starter',  name: 'Starter',  price: 'Starter', per: 'entry tier',                    color: '#10b981', border: 'rgba(16,185,129,0.2)',  highlight: false, cta: 'Get started', badge: null,           certNote: 'Certs from $8/yr via GoGetSSL' },
  { key: 'pro',      name: 'Pro',      price: '$29',  per: '/mo · billed annually',  color: '#6366f1', border: 'rgba(99,102,241,0.3)',  highlight: true,  cta: 'Start Pro',        badge: 'Most Popular', certNote: 'All cert types · GoGetSSL partner rates' },
  { key: 'reseller', name: 'Reseller', price: 'Custom', per: 'contact us',           color: '#f59e0b', border: 'rgba(245,158,11,0.2)',  highlight: false, cta: 'Contact us',       badge: null,           certNote: 'Volume pricing available' },
]

const PLAN_HIGHLIGHTS = {
  starter:  ['DV certificates (Sectigo / RapidSSL)', 'Persistent agent — Nginx / Apache', 'Auto DNS validation', 'Auto-renew (cert + order)', 'KeyLocker — AES-256-GCM vault', 'CT Log discovery', '47-Day Readiness Dashboard', 'Renewal Calendar', 'SSL Health Score A+ to F', 'Multi-server management'],
  pro:      ['Everything in Starter', 'OV, EV, Wildcard & SAN certificates', 'DigiCert & Sectigo portfolio sync', 'Shadow IT detection', 'Policy engine (fleet compliance)', 'CT Abuse Monitor', 'Portfolio CSV export', 'REST API access', 'Priority support'],
  reseller: ['Everything in Pro', 'Sub-reseller registration & approval', 'End-customer portal', 'Customer invite (magic link)', 'Order management for customers', 'Excel order export', 'White-label dashboard', 'Dedicated account manager', 'Volume cert pricing'],
}

export default function Pricing({ nav }) {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div style={{ background: '#04090f', minHeight: '100vh', color: 'white', ...S }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box}
        ::selection{background:#10b98122;color:#10b981}
        @media(max-width:767px){
          .pricing-grid{grid-template-columns:1fr !important;}
          .pricing-compare-grid{grid-template-columns:1fr !important;}
          .pricing-hero h1{font-size:32px !important;}
          .cert-table{font-size:11px !important;}
          .cert-table-grid{grid-template-columns:1.5fr 0.5fr 0.8fr 0.8fr !important;}
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,24px) 100px' }}>

        {/* ── HERO ── */}
        <div className="pricing-hero" style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: '#10b981',
            letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 12px',
            border: '1px solid rgba(16,185,129,0.22)', borderRadius: 4, marginBottom: 20, ...Mo }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-2px',
            lineHeight: 1.05, marginBottom: 16 }}>
            Professional CLM.<br/>
            <span style={{ color: '#10b981' }}>Transparent cert pricing.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 520, margin: '0 auto 12px', lineHeight: 1.75 }}>
            The complete CLM platform — agents, auto-renewal, DNS automation, CT monitoring, CA intelligence, KeyLocker, 47-day readiness. Certificates at GoGetSSL partner rates.
          </p>
        </div>

        {/* ── PLAN CARDS ── */}
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 56 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              borderRadius: 12, border: `1px solid ${plan.border}`,
              background: plan.highlight
                ? `linear-gradient(160deg, ${plan.color}0d 0%, rgba(4,9,15,0) 70%)`
                : 'rgba(255,255,255,0.01)',
              padding: '28px 22px', position: 'relative', display: 'flex', flexDirection: 'column',
            }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, borderRadius: 20, padding: '3px 14px',
                  fontSize: 10, fontWeight: 800, color: 'white', whiteSpace: 'nowrap', letterSpacing: '0.5px', ...Mo }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 700, color: plan.color, letterSpacing: '1.5px',
                textTransform: 'uppercase', marginBottom: 14, ...Mo }}>{plan.name}</div>

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: plan.price === 'Custom' ? 28 : 40, fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6, ...Mo }}>{plan.per}</span>
              </div>

              <div style={{ fontSize: 10, color: plan.color, marginBottom: 20, ...Mo, opacity: 0.7 }}>
                + {plan.certNote}
              </div>

              <button onClick={() => plan.key === 'reseller' ? window.location.href = 'mailto:mathimcafee@gmail.com' : nav('/auth')}
                style={{ width: '100%', padding: '11px', borderRadius: 7, border: `1px solid ${plan.color}`,
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? 'white' : plan.color,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', ...S, marginBottom: 22, transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = plan.color; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? plan.color : 'transparent'; e.currentTarget.style.color = plan.highlight ? 'white' : plan.color }}>
                {plan.cta}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {PLAN_HIGHLIGHTS[plan.key].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Tick color={plan.color}/>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── FULL COMPARISON TOGGLE ── */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <button onClick={() => setShowComparison(v => !v)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
              borderRadius: 7, padding: '10px 22px', fontSize: 13, cursor: 'pointer', ...S, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}>
            {showComparison ? '▲ Hide full comparison' : '▼ See full feature comparison'}
          </button>
        </div>

        {/* ── FULL COMPARISON TABLE ── */}
        {showComparison && (
          <div style={{ marginBottom: 64, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: 'rgba(255,255,255,0.04)', padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', ...Mo }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.key} style={{ fontSize: 11, fontWeight: 700, color: p.color,
                  textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center', ...Mo }}>
                  {p.name}
                </div>
              ))}
            </div>

            {FEATURES.map(section => (
              <div key={section.section}>
                {/* Section header */}
                <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.02)',
                  borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase',
                    letterSpacing: '1px', ...Mo }}>{section.section}</span>
                </div>
                {section.rows.map((row, i) => (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '11px 20px', alignItems: 'center',
                    borderBottom: i < section.rows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{row.label}</span>
                    {['starter', 'pro', 'reseller'].map(k => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'center' }}>
                        {row[k] ? <Tick color={k === 'starter' ? '#10b981' : k === 'pro' ? '#6366f1' : '#f59e0b'}/> : <Cross/>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── CERT PRICING TABLE ── */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 12, ...Mo }}>Certificate pricing</div>
            <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 10 }}>
              GoGetSSL partner rates
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              DigiCert DV retail $218/yr vs. SSLVault $14/yr — same trust chain.
            </p>
          </div>
          <div className="cert-table" style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            <div className="cert-table-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px' }}>
              {['Certificate type', 'Term', 'CA', 'Price/yr'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)',
                  textTransform: 'uppercase', letterSpacing: '0.8px', ...Mo }}>{h}</div>
              ))}
            </div>
            {CERT_PRICES.map((row, i) => (
              <div key={row.type} className="cert-table-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
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
            All prices in USD · GoGetSSL partner rates · Subject to change
          </div>
        </div>

        {/* ── COMPETITOR COMPARISON ── */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '32px',
          background: 'rgba(255,255,255,0.01)', marginBottom: 64 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 8, ...Mo }}>CLM market comparison</div>
            <h2 style={{ fontSize: 'clamp(18px,2.5vw,28px)', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Enterprise CLM without the enterprise price tag.
            </h2>
          </div>
          <div className="pricing-compare-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
            {[
              { name: 'SSLVault', price: 'Starter', sub: 'entry tier + cert costs', color: '#10b981',
                points: ['Complete CLM platform', '47-day readiness built-in', 'CA-agnostic intelligence', 'KeyLocker included', 'cPanel + agent + DNS'] },
              { name: 'Venafi TLS Protect', price: '$250k+', sub: 'per year', color: 'rgba(255,255,255,0.3)',
                points: ['Enterprise only', 'No free tier', 'No cPanel support', 'No cert issuance', 'PKI team required'] },
              { name: 'Keyfactor Command', price: '$75–200k', sub: 'per year', color: 'rgba(255,255,255,0.3)',
                points: ['Mid-market focus', 'No free tier', 'Complex setup', 'No cert issuance', 'Professional services needed'] },
            ].map((item, i) => (
              <div key={item.name} style={{ padding: '24px 20px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: i === 0 ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: '0.5px', marginBottom: 8, ...Mo }}>{item.name}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: item.color, letterSpacing: '-1px', marginBottom: 2, lineHeight: 1 }}>{item.price}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 16, ...Mo }}>{item.sub}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {item.points.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {i === 0 ? <Tick color="#10b981"/> : <Cross/>}
                      <span style={{ fontSize: 11, color: i === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 28 }}>
            Frequently asked questions
          </h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* ── CTA ── */}
        <div style={{ border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: 'clamp(32px,5vw,48px) clamp(20px,4vw,40px)',
          textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 60%)' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>
            Start today.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.7 }}>
            Full CLM platform from day one — 47-day readiness, KeyLocker, agent automation, CA intelligence.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/auth')}
              style={{ background: '#10b981', border: 'none', borderRadius: 7, color: 'white',
                fontSize: 14, fontWeight: 700, padding: '13px 28px', cursor: 'pointer', ...S,
                boxShadow: '0 0 30px rgba(16,185,129,0.25)' }}>
              Get Started →
            </button>
            <button onClick={() => window.location.href = 'mailto:mathimcafee@gmail.com'}
              style={{ background: 'transparent', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 7,
                color: '#f59e0b', fontSize: 14, fontWeight: 600, padding: '13px 28px', cursor: 'pointer', ...S }}>
              Contact for Reseller →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
