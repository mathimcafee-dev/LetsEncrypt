import { useState } from 'react'
import { CheckCircle, Zap, Shield, Server, RefreshCw, ArrowRight,
         Lock, Globe, AlertTriangle, Clock, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import '../styles/design-v2.css'

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ borderBottom: '0.5px solid var(--v2-border)', padding: '16px 0', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--v2-text)' }}>{q}</div>
        {open ? <ChevronUp size={15} style={{ flexShrink: 0, color: 'var(--v2-text-3)' }}/>
               : <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--v2-text-3)' }}/>}
      </div>
      {open && (
        <div style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.7, marginTop: 10 }}>{a}</div>
      )}
    </div>
  )
}

export default function Pricing({ nav }) {

  const freePros = [
    "Import any certificate (Let's Encrypt, ZeroSSL, any CA)",
    'Expiry monitoring & email alerts',
    'Dashboard inventory — all certs in one view',
    'Agent-based auto-install on VPS',
    'cPanel one-click install',
    'DNS provider automation',
  ]

  const paidPros = [
    { text: 'RapidSSL DV — DigiCert trust chain', hot: true },
    { text: 'Issued in ~5 minutes', hot: true },
    { text: 'Zero-touch auto-renewal — hands off forever', hot: true },
    { text: 'Auto DNS validation via Cloudflare/Vercel/GoDaddy', hot: false },
    { text: 'Auto-install to cPanel on renewal', hot: false },
    { text: 'Auto-install to VPS via agent on renewal', hot: false },
    { text: '99.9% browser & OS compatibility', hot: false },
  ]

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 860 }}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '60px 0 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            background: '#eff6ff', border: '0.5px solid #bfdbfe',
            borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e7fc0', display: 'block' }}/>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', letterSpacing: '0.3px' }}>
              TRUSTED BY 100+ SITES
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 800, color: 'var(--v2-text)',
            letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.1 }}>
            SSL that renews itself.<br/>
            <span style={{ color: '#0e7fc0' }}>For €9.99 a year.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--v2-text-2)', maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7 }}>
            One expired certificate costs you customers, SEO ranking, and trust.
            SSLVault issues, installs, and renews — with zero input from you.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/buy')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8,
                padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit' }}>
              <Shield size={15}/> Issue certificate — €9.99 <ArrowRight size={14}/>
            </button>
            <button onClick={() => nav('/auth')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'white', color: 'var(--v2-text-2)', border: '1px solid var(--v2-border)',
                borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit' }}>
              Start free first
            </button>
          </div>
        </div>

        {/* ── TRUST STRIP ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48 }}>
          {[
            { icon: <Shield size={18}/>,   title: 'DigiCert chain',       sub: 'Trusted by all browsers' },
            { icon: <Clock size={18}/>,    title: '~5 min issuance',      sub: 'Fastest DV on the market' },
            { icon: <RefreshCw size={18}/>,title: 'Auto-renewal',         sub: '14 days before expiry' },
            { icon: <Server size={18}/>,   title: 'Auto-install',         sub: 'cPanel, VPS, agent' },
          ].map(({ icon, title, sub }) => (
            <div key={title} style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
              borderRadius: 8, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ color: '#0e7fc0', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v2-text)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── PLANS ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 20, marginBottom: 56,
          alignItems: 'start' }}>

          {/* Free */}
          <div style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
            borderRadius: 12, padding: '28px 26px 28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Free · forever</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--v2-text)', letterSpacing: '-1px' }}>€0</span>
                <span style={{ fontSize: 12, color: 'var(--v2-text-3)', paddingBottom: 7 }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.6, margin: 0 }}>
                Full CLM platform. Bring your own certs and manage everything from one dashboard.
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
              {freePros.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <Check size={13} style={{ color: '#0e7fc0', flexShrink: 0, marginTop: 2 }}/>
                  <span style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <button className="v2-btn" onClick={() => nav('/auth')}
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
              Get started free
            </button>
          </div>

          {/* Managed — dominant card */}
          <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '6px',
            boxShadow: '0 0 0 1px rgba(14,127,192,0.4), 0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative' }}>
            {/* Popular badge */}
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
              background: '#0e7fc0', color: 'white', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: 20,
              padding: '4px 14px', whiteSpace: 'nowrap' }}>
              Most popular
            </div>
            <div style={{ background: '#111827', borderRadius: 8, padding: '28px 26px 28px',
              display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Managed certificates</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>€9.99</span>
                  <span style={{ fontSize: 12, color: '#6b7280', paddingBottom: 7 }}>/cert/year</span>
                </div>
                <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 10 }}>
                  vs. €50–200/year from registrars with manual renewal
                </div>
                <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                  Issue, validate, install and auto-renew. You never touch a certificate again.
                </p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                {paidPros.map(({ text, hot }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <Check size={13} style={{ color: '#0e7fc0', flexShrink: 0, marginTop: 2 }}/>
                    <span style={{ fontSize: 12, color: hot ? '#e5e7eb' : '#9ca3af',
                      lineHeight: 1.5, fontWeight: hot ? 500 : 400 }}>{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => nav('/buy')}
                style={{ width: '100%', background: '#0e7fc0', color: 'white', border: 'none',
                  borderRadius: 7, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit', letterSpacing: '-0.2px' }}>
                <Shield size={15}/> Issue a certificate — €9.99 <ArrowRight size={13}/>
              </button>
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#4b5563' }}>
                No subscription. Pay per cert per year.
              </div>
            </div>
          </div>
        </div>

        {/* ── WHAT HAPPENS AFTER YOU BUY ──────────────── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--v2-text)',
              letterSpacing: '-0.4px', marginBottom: 8 }}>
              How it works — once, then never again
            </h2>
            <p style={{ fontSize: 13, color: 'var(--v2-text-2)' }}>
              After you issue a certificate, SSLVault handles everything automatically.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { n: '01', title: 'You enter the domain', desc: "Takes 30 seconds. Name, email, domain. That's it." },
              { n: '02', title: 'SSLVault validates DNS', desc: 'Auto-adds the TXT record to Cloudflare, Vercel, or GoDaddy.' },
              { n: '03', title: 'Cert issued & installed', desc: 'Downloads from DigiCert chain, pushes to your server via agent or cPanel.' },
              { n: '04', title: 'Renews itself forever', desc: '14 days before expiry, the whole cycle repeats. You get an email when done.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
                borderRadius: 8, padding: '18px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0e7fc0',
                  letterSpacing: '0.5px', fontFamily: 'var(--v2-font-mono)', marginBottom: 10 }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--v2-text)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--v2-text-3)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEAR STRIP ──────────────────────────────── */}
        <div style={{ background: '#111827', borderRadius: 12, padding: '28px 32px',
          marginBottom: 56, display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color="#f59e0b"/>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b',
                textTransform: 'uppercase', letterSpacing: '0.5px' }}>What happens if you don't renew</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', marginBottom: 6, lineHeight: 1.4 }}>
              Visitors see "Your connection is not private".<br/>
              Chrome blocks the page. Google drops your ranking.
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              An expired SSL certificate is an instant trust killer. A managed cert at €9.99/year
              eliminates this risk completely — SSLVault renews before you even notice.
            </p>
          </div>
          <button onClick={() => nav('/buy')}
            style={{ background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8,
              padding: '13px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: 'inherit', flexShrink: 0 }}>
            Never expire again <ArrowRight size={13}/>
          </button>
        </div>

        {/* ── FEATURE TABLE ───────────────────────────── */}
        <div style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
          borderRadius: 12, marginBottom: 56, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '0.5px solid var(--v2-border)',
            display: 'grid', gridTemplateColumns: '1fr 120px 160px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>Feature</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Free</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0e7fc0',
              textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Managed</div>
          </div>
          {[
            ['Certificate import (any CA)',         true,  true],
            ['Expiry monitoring & alerts',           true,  true],
            ['Dashboard inventory',                  true,  true],
            ['Agent-based auto-install',             true,  true],
            ['cPanel one-click install',             true,  true],
            ['DNS provider automation',              true,  true],
            ['RapidSSL DV issuance',                 false, true],
            ['1-year certificate validity',          false, true],
            ['Zero-touch auto-renewal',              false, true],
            ['Auto DNS validation',                  false, true],
            ['Auto server delivery on renewal',      false, true],
          ].map(([feat, free, paid], i) => (
            <div key={feat} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px',
              padding: '11px 24px', borderTop: '0.5px solid var(--v2-border)',
              background: i % 2 === 0 ? 'transparent' : 'var(--v2-surface-3)' }}>
              <span style={{ fontSize: 13, color: 'var(--v2-text-2)' }}>{feat}</span>
              <span style={{ textAlign: 'center' }}>
                {free
                  ? <Check size={14} style={{ color: '#0e7fc0' }}/>
                  : <X size={13} style={{ color: 'var(--v2-text-3)', opacity: 0.4 }}/>}
              </span>
              <span style={{ textAlign: 'center' }}>
                {paid
                  ? <Check size={14} style={{ color: '#0e7fc0' }}/>
                  : <X size={13} style={{ color: 'var(--v2-text-3)', opacity: 0.4 }}/>}
              </span>
            </div>
          ))}
        </div>

        {/* ── FAQ ─────────────────────────────────────── */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--v2-text)',
            letterSpacing: '-0.4px', marginBottom: 4 }}>Common questions</h2>
          <p style={{ fontSize: 13, color: 'var(--v2-text-3)', marginBottom: 16 }}>Click to expand.</p>
          <FAQ q="Is the free plan really free forever?"
            a="Yes — no credit card, no time limit. The free plan is the full CLM platform. Import any cert, monitor expiry, install to any server. You only pay when you want SSLVault to issue and auto-renew the certificate for you." />
          <FAQ q="What exactly does €9.99/year include?"
            a="A RapidSSL DV certificate (DigiCert trust chain) with 1-year validity, automatic DNS validation, zero-touch renewal 14 days before expiry, and automatic delivery to your servers via agent or cPanel. You never touch the certificate again." />
          <FAQ q="How is this cheaper than my registrar?"
            a="Registrars typically charge €50–200/year for SSL, plus charge for renewals separately, plus you have to renew manually. SSLVault charges €9.99/year and handles everything — issuance, renewal, and delivery — automatically." />
          <FAQ q="Can I use Let's Encrypt certificates instead?"
            a="Absolutely. Use Import Certificate to add any existing cert. SSLVault will track expiry and install it on your servers. The difference: Let's Encrypt certs aren't auto-renewed by SSLVault — you manage that yourself, or buy a managed cert for hands-off renewal." />
          <FAQ q="What is RapidSSL / DigiCert?"
            a="RapidSSL is a certificate authority owned by DigiCert, one of the two largest CAs in the world (the other is Sectigo). RapidSSL DV certificates are trusted by 99.9% of browsers and operating systems worldwide." />
          <FAQ q="Is this a subscription?"
            a="No. You pay per certificate per year. No recurring subscription, no auto-charge. When your cert is approaching renewal, SSLVault renews it and you'll be invoiced for the next year only." />
        </div>

        {/* ── FINAL CTA ───────────────────────────────── */}
        <div style={{ background: '#0a0a0a', borderRadius: 16, padding: '48px 40px',
          marginBottom: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Get started in 30 seconds
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white',
            letterSpacing: '-0.6px', marginBottom: 12, lineHeight: 1.2 }}>
            Stop worrying about SSL.<br/>
            <span style={{ color: '#0e7fc0' }}>€9.99/year buys you peace of mind.</span>
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
            Your certificate will renew itself, install itself, and never expire.
            You'll get an email when it's done.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/buy')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8,
                padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit' }}>
              <Shield size={15}/> Issue certificate — €9.99 <ArrowRight size={14}/>
            </button>
            <button onClick={() => nav('/auth')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent',
                color: '#6b7280', border: '1px solid #1f2937', borderRadius: 8,
                padding: '14px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Start free instead
            </button>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['No subscription', 'DigiCert chain', 'Cancel anytime', 'Auto-renewal included'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: '#4b5563' }}>
                <Check size={11} style={{ color: '#0e7fc0' }}/> {t}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
