import { useState } from 'react'
import { CheckCircle, Shield, Server, RefreshCw, Globe,
         ArrowRight, ChevronDown, ChevronUp, Users } from 'lucide-react'
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
    'RapidSSL DV — DigiCert trust chain',
    'Issued via TheSSLStore reseller API',
    '~5 minute issuance',
    'Up to 2-year validity',
    '99.9% browser & OS compatibility',
    'Auto DNS validation (Cloudflare, Vercel)',
    'Zero-touch auto-renewal',
    'Auto-install to cPanel on renewal',
    'Auto-install to VPS via agent',
    'Multi-tier reseller accounts',
    'Customer management & invite flow',
    'Impersonation & billing reports',
    'Encrypted private key storage',
    'Expiry monitoring & alerts',
    'Full audit trail',
  ]

  const tiers = [
    {
      name: 'Master Admin',
      who: 'You (SSLVault)',
      color: '#0e7fc0',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: 'Full platform access. Approve resellers, see all orders, manage everything.',
      features: ['Unlimited sub-resellers', 'Platform-wide order visibility', 'Impersonate any account', 'Download all billing reports', 'Account suspension / activation'],
    },
    {
      name: 'Sub-Reseller',
      who: 'Your customer',
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      desc: 'Manage their own end customers. Issue certificates under your partner account.',
      features: ['Manage multiple domains', 'Per-domain billing export', 'Priority support', 'Advanced monitoring', 'Team access controls'],
      badge: 'Requires approval',
    },
    {
      name: 'End Customer',
      who: 'Sub-reseller\'s customer',
      color: '#7c3aed',
      bg: '#faf5ff',
      border: '#ddd6fe',
      desc: 'Issue and manage their own SSL certificates with full automation.',
      features: ['Issue RapidSSL certificates', 'Save DNS credentials (auto DCV)', 'Connect servers (auto-install)', 'Certificate inventory & monitoring', 'Export order history'],
      badge: 'Invited by reseller',
    },
  ]

  const faqs = [
    { q: 'What SSL certificates does SSLVault issue?', a: 'SSLVault issues RapidSSL Domain Validated (DV) certificates via TheSSLStore reseller API. These are backed by the DigiCert trust chain with 99.9% browser and OS compatibility. Validity periods up to 2 years.' },
    { q: 'How do I get started?', a: 'Sign in to your SSLVault account and start issuing SSL certificates immediately. Connect your DNS provider for automated DCV, and install the persistent agent on your servers for zero-touch auto-renewal.' },
    { q: 'How does auto-renewal work?', a: 'A cron job runs every few hours checking for certificates expiring within 30 days. For certificates with connected DNS credentials, it automatically issues a new certificate, handles DCV via DNS, downloads the cert, and installs it to connected servers. Zero manual steps.' },
    { q: 'Can end customers save their own DNS credentials?', a: 'Yes. End customers can connect their Cloudflare or Vercel accounts in their portal. When a certificate is issued or renewed, SSLVault auto-creates the required DNS TXT/CNAME records for domain validation.' },
    { q: 'How is billing handled?', a: 'The platform itself manages certificate issuance via the master reseller\'s TSS account. Resellers and admins can download Excel billing reports showing all orders by customer. Payment collection between you and your customers is handled outside SSLVault.' },
    { q: 'Is there a sandbox / test mode?', a: 'Yes. SSLVault supports TheSSLStore\'s sandbox environment for testing the full certificate issuance flow without incurring real costs. Sandbox certificates are valid for 2 days and are clearly marked in the dashboard.' },
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
              RAPIDSSL · DIGICERT TRUST CHAIN
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--v2-text)',
            letterSpacing: '-1px', marginBottom: 14, lineHeight: 1.1 }}>
            SSL certificates for every tier<br />of your reseller business.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--v2-text-2)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 32px' }}>
            RapidSSL DV certificates issued via TheSSLStore. Full lifecycle automation for master admins, sub-resellers, and end customers.
          </p>
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 14, padding: '11px 24px' }} onClick={() => nav('/auth')}>
            <Shield size={14} /> Get Started <ArrowRight size={13} />
          </button>
        </div>

        {/* TIER CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 52 }}>
          {tiers.map(({ name, who, color, bg, border, desc, features, badge }) => (
            <div key={name} style={{ background: 'white', border: `1px solid ${border}`, borderRadius: 12, padding: '24px 20px', position: 'relative' }}>
              {badge && (
                <div style={{ position: 'absolute', top: -10, left: 16, background: color, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.3px' }}>{badge}</div>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Users size={18} color={color} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-text)', marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 11, color: color, fontWeight: 600, marginBottom: 10 }}>{who}</div>
              <div style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.6, marginBottom: 16, minHeight: 52 }}>{desc}</div>
              <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: 14 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <CheckCircle size={12} color={color} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>{f}</span>
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
                Every feature needed to run a full SSL reseller business — from issuance to renewal to auto-install — is built in.
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="v2-btn v2-btn-primary" style={{ fontSize: 13 }} onClick={() => nav('/auth')}>
              <Shield size={13} /> Sign In
            </button>
            <button className="v2-btn" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }} onClick={() => nav('/auth')}>
              Already have an account
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
