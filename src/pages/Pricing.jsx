import { useState } from 'react'
import { CheckCircle, Shield, Server, RefreshCw, Globe,
         ArrowRight, ChevronDown, ChevronUp, Zap, Bell, Lock } from 'lucide-react'
import '../styles/design-v2.css'

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ borderBottom: '0.5px solid var(--v2-border)', padding: '16px 0', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--v2-text)' }}>{q}</div>
        {open ? <ChevronUp size={15} style={{ flexShrink: 0, color: 'var(--v2-text-3)' }} />
               : <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--v2-text-3)' }} />}
      </div>
      {open && <div style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.7, marginTop: 10 }}>{a}</div>}
    </div>
  )
}

export default function Pricing({ nav }) {

  const platformFeatures = [
    'DV, OV, EV & Wildcard certificates',
    'Issued via GoGetSSL reseller API',
    '~5 minute DV issuance',
    'Up to 2-year validity',
    '99.9% browser & OS compatibility',
    'Auto DNS validation (Cloudflare, Vercel)',
    'Zero-touch auto-renewal',
    'Auto-install to cPanel on renewal',
    'Auto-install to VPS via agent',
    'Encrypted private key storage',
    'Expiry monitoring & alerts',
    'Full audit trail',
  ]

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      color: '#0e7fc0',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: 'Everything you need to manage SSL certificates for your own domains.',
      features: [
        'Unlimited DV certificates',
        'Auto DNS validation',
        'Zero-touch auto-renewal',
        'Certificate monitoring & alerts',
        'Persistent VPS agent',
        'Private key storage (AES-256)',
      ],
    },
    {
      name: 'Pro',
      price: 'Coming soon',
      period: '',
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      desc: 'Advanced features for power users and teams managing large certificate portfolios.',
      features: [
        'Everything in Free',
        'OV & EV certificates',
        'Wildcard & multi-domain (SAN)',
        'Priority support',
        'Advanced reporting',
        'API access',
      ],
      badge: 'Coming soon',
    },
  ]

  const faqs = [
    { q: 'What SSL certificates does SSLVault issue?', a: 'SSLVault issues SSL certificates via the GoGetSSL reseller API. This includes DV, OV, EV, Wildcard, and multi-domain (SAN) certificates from trusted CAs including DigiCert, Sectigo, RapidSSL, GeoTrust, and Thawte.' },
    { q: 'How do I get started?', a: 'Sign in to your SSLVault account and start issuing SSL certificates immediately. Connect your DNS provider for automated DCV, and install the persistent agent on your servers for zero-touch auto-renewal.' },
    { q: 'How does auto-renewal work?', a: 'A cron job checks for certificates expiring within 30 days. For certificates with connected DNS credentials, it automatically issues a new certificate, handles DCV via DNS, downloads the cert, and installs it to connected servers. Zero manual steps.' },
    { q: 'Can I connect my DNS provider?', a: 'Yes. You can connect Cloudflare or Vercel in your dashboard. When a certificate is issued or renewed, SSLVault auto-creates the required DNS records for domain control validation — no manual steps needed.' },
    { q: 'Is there a sandbox / test mode?', a: 'Yes. SSLVault supports GoGetSSL\'s sandbox environment for testing the full certificate issuance flow without real costs. Sandbox certificates are clearly marked in the dashboard.' },
    { q: 'How are private keys handled?', a: 'Private keys are encrypted at rest with AES-256 and never leave your server infrastructure. You can optionally store them in SSLVault\'s KeyLocker for secure access across devices, with a full audit trail on every access.' },
  ]

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 900 }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', padding: '60px 0 52px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            background: '#eff6ff', border: '0.5px solid #bfdbfe',
            borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e7fc0', display: 'block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', letterSpacing: '0.3px' }}>
              POWERED BY GOGETSSL · DIGICERT · SECTIGO
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--v2-text)',
            letterSpacing: '-1px', marginBottom: 14, lineHeight: 1.1 }}>
            Full SSL lifecycle management.<br />Free to get started.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--v2-text-2)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' }}>
            Issue, monitor, renew, and deploy SSL certificates automatically — across all your domains and servers.
          </p>
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 14, padding: '11px 24px' }} onClick={() => nav('/auth')}>
            <Shield size={14} /> Get Started Free <ArrowRight size={13} />
          </button>
        </div>

        {/* PLAN CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 52 }}>
          {plans.map(({ name, price, period, color, bg, border, desc, features, badge }) => (
            <div key={name} style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 12, padding: '28px 24px', position: 'relative' }}>
              {badge && (
                <div style={{ position: 'absolute', top: -10, left: 16, background: color, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.3px' }}>{badge}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-text)', marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{price}</div>
                {period && <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 2 }}>{period}</div>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.6, marginBottom: 20 }}>{desc}</div>
              <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: 16 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <CheckCircle size={12} color={color} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--v2-text-2)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* PLATFORM FEATURES */}
        <div className="v2-card" style={{ padding: '32px 28px', marginBottom: 52 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-green-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Platform includes</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--v2-text)', letterSpacing: '-0.3px', margin: '0 0 10px' }}>Everything in one place</h3>
              <p style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.6 }}>
                The full certificate lifecycle — from issuance to auto-renewal to server deployment — all automated.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px', flex: 1, minWidth: 280 }}>
              {platformFeatures.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <CheckCircle size={12} color="var(--v2-green)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 52 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--v2-text)', letterSpacing: '-0.3px', margin: '0 0 24px' }}>Frequently asked questions</h3>
          {faqs.map(faq => <FAQ key={faq.q} {...faq} />)}
        </div>

        {/* CTA */}
        <div style={{ background: '#0d3c6e', borderRadius: 14, padding: '36px 32px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', margin: '0 0 10px' }}>Ready to start?</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px' }}>
            Sign in and start managing your SSL certificates today.
          </p>
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 13 }} onClick={() => nav('/auth')}>
            <Shield size={13} /> Get Started Free <ArrowRight size={13} />
          </button>
        </div>

      </div>
    </div>
  )
}
