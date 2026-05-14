import { Shield, Lock, Globe, CheckCircle, ArrowRight, Server,
         RefreshCw, Users, Building2, Activity, Code2 } from 'lucide-react'
import '../styles/design-v2.css'

export default function About({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 1000, padding: '40px 24px 80px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', padding: '48px 0 56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--v2-green-bg)', border: '0.5px solid var(--v2-green-border)',
                        borderRadius: 100, padding: '4px 14px', marginBottom: 20 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--v2-green-text)' }}>SSL Reseller Platform</span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, letterSpacing: '-1px',
                        lineHeight: 1.1, margin: '0 0 16px', color: 'var(--v2-text)' }}>
            SSL lifecycle management<br />
            <span style={{ color: 'var(--v2-green)' }}>for resellers and their customers.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--v2-text-2)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
            SSLVault is a Certificate Lifecycle Management platform built for SSL resellers.
            Issue trusted RapidSSL DV certificates via TheSSLStore, manage multi-tier customer accounts,
            and automate renewal and deployment — all from one dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-primary" style={{ padding: '11px 22px', fontSize: 14 }} onClick={() => nav('/register')}>
              <Building2 size={14} /> Become a Reseller
            </button>
            <button className="v2-btn" style={{ padding: '11px 22px', fontSize: 14 }} onClick={() => nav('/auth')}>
              Sign In <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* THE STORY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-green-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Why SSLVault</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--v2-text)', letterSpacing: '-0.5px', margin: '0 0 16px' }}>
              Built by a PKI specialist for the reseller market
            </h2>
            <p style={{ fontSize: 14, color: 'var(--v2-text-2)', lineHeight: 1.75, marginBottom: 16 }}>
              SSLVault was built out of first-hand experience working with SSL resellers and certificate authorities.
              The complexity of managing certificates across multiple customers, handling DCV, and ensuring zero-downtime
              renewals is a real operational burden — SSLVault automates all of it.
            </p>
            <p style={{ fontSize: 14, color: 'var(--v2-text-2)', lineHeight: 1.75 }}>
              Every certificate issued through SSLVault is a trusted <strong>RapidSSL DV certificate</strong> backed by the
              DigiCert trust chain, issued via TheSSLStore's reseller API. Browser compatibility is 99.9%.
              Validity up to 2 years.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { Icon: Shield,    color: '#0e7fc0', bg: '#eff6ff', label: 'RapidSSL DV',        sub: 'DigiCert trust chain' },
              { Icon: Users,     color: '#15803d', bg: '#f0fdf4', label: 'Multi-tier',          sub: 'Reseller → Customer' },
              { Icon: RefreshCw, color: '#7c3aed', bg: '#faf5ff', label: 'Auto-renewal',        sub: 'Zero manual work' },
              { Icon: Server,    color: '#d97706', bg: '#fffbeb', label: 'Auto-install',        sub: 'Agent + cPanel + SSH' },
              { Icon: Globe,     color: '#0369a1', bg: '#eff6ff', label: 'Auto DNS DCV',        sub: 'Cloudflare · Vercel' },
              { Icon: Lock,      color: '#b45309', bg: '#fffbeb', label: 'Encrypted keys',      sub: 'AES-256 at rest' },
            ].map(({ Icon, color, bg, label, sub }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '16px 16px', border: `0.5px solid ${color}22` }}>
                <Icon size={18} color={color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* THE RESELLER MODEL */}
        <div style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)', borderRadius: 14, padding: '36px 32px', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-green-text)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>The reseller model</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--v2-text)', letterSpacing: '-0.4px', margin: '0 0 20px' }}>Three tiers. Full isolation.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              { num: '1', title: 'Master Admin (You)', color: '#0e7fc0', items: ['Approve sub-resellers', 'See all orders platform-wide', 'Impersonate any account', 'Download billing reports'] },
              { num: '2', title: 'Sub-Resellers', color: '#15803d', items: ['Manage their end customers', 'Invite customers by email', 'See orders under their account', 'Download per-customer reports'] },
              { num: '3', title: 'End Customers', color: '#7c3aed', items: ['Issue SSL certificates', 'Save DNS credentials', 'Connect servers for auto-install', 'Manage their own certs'] },
            ].map(({ num, title, color, items }) => (
              <div key={num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>{num}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-text)' }}>{title}</div>
                </div>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <CheckCircle size={12} color={color} />
                    <span style={{ fontSize: 13, color: 'var(--v2-text-2)' }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* TECH STACK */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, textAlign: 'center' }}>Technology</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'TheSSLStore', sub: 'Reseller API · RapidSSL DV', color: '#0e7fc0' },
              { label: 'Supabase', sub: 'Auth · DB · Edge functions', color: '#15803d' },
              { label: 'React + Vite', sub: 'Frontend · Vercel deploy', color: '#7c3aed' },
              { label: 'DigiCert chain', sub: '99.9% browser trust', color: '#d97706' },
            ].map(({ label, sub, color }) => (
              <div key={label} className="v2-card" style={{ padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#0d3c6e', borderRadius: 14, padding: '36px 32px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', margin: '0 0 10px' }}>Ready to get started?</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Register as a reseller and start issuing certificates for your customers today.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="v2-btn v2-btn-primary" style={{ fontSize: 13 }} onClick={() => nav('/register')}>
              <Building2 size={13} /> Register as Reseller
            </button>
            <button className="v2-btn" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }} onClick={() => nav('/contact')}>
              Contact us
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
