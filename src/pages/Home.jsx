import { Shield, Lock, Bell, Download, RefreshCw, ArrowRight, CheckCircle, Zap, Globe, Clock, Star } from 'lucide-react'

export default function Home({ nav }) {
  const features = [
    { icon: Zap, title: 'Instant Generation', desc: 'Free 90-day SSL certificates from Lets Encrypt via DNS-01 validation in minutes.' },
    { icon: Shield, title: 'Wildcard Support', desc: 'Secure all subdomains with *.example.com certificates — one cert covers everything.' },
    { icon: Bell, title: 'Expiry Monitoring', desc: 'Track all your certificates, get alerts before they expire, never miss a renewal.' },
    { icon: Download, title: 'All Formats', desc: 'Download as PEM, private key, and full chain — ready for Nginx, Apache, or any server.' },
    { icon: Lock, title: 'Secure Storage', desc: 'Your certificates are encrypted and stored securely. Private keys stay in your session.' },
    { icon: RefreshCw, title: 'Easy Renewal', desc: 'Renew expiring certificates with one click through the certificate management portal.' },
  ]

  const steps = [
    { num: '01', title: 'Enter Your Domain', desc: 'Type your domain name and agree to Lets Encrypt terms of service.' },
    { num: '02', title: 'DNS Verification', desc: 'A TXT record is automatically added to prove you own the domain.' },
    { num: '03', title: 'Certificate Issued', desc: 'Lets Encrypt validates and issues your signed SSL certificate.' },
    { num: '04', title: 'Download & Manage', desc: 'Download all certificate files and monitor from your dashboard.' },
  ]

  const stats = [
    { value: '90', label: 'Day Validity', suffix: '' },
    { value: '100', label: 'Free Forever', suffix: '%' },
    { value: '<60', label: 'Seconds to Issue', suffix: '' },
    { value: '∞', label: 'Certificates', suffix: '' },
  ]

  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '80px 0 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* Left */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <span className="badge badge-blue" style={{ padding: '6px 14px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Powered by Lets Encrypt · 100% Free
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20, color: 'var(--text)' }}>
                Free SSL Certs.<br />
                <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Done in Seconds.
                </span>
              </h1>
              <p style={{ fontSize: 18, color: 'var(--text2)', maxWidth: 480, lineHeight: 1.7, marginBottom: 36 }}>
                Generate, manage and monitor free 90-day SSL certificates. DNS-01 validation with wildcard support. Auto-renew reminders. Zero cost, forever.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
                <button onClick={() => nav('/generate')} className="btn btn-primary btn-lg" style={{ gap: 10 }}>
                  <Shield size={18} /> Generate Free SSL <ArrowRight size={16} />
                </button>
                <button onClick={() => nav('/dashboard')} className="btn btn-secondary btn-lg">
                  View Dashboard
                </button>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {['90-day validity', 'Wildcard support', 'Auto DNS', 'Free forever'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text3)', fontSize: 13, fontWeight: 600 }}>
                    <CheckCircle size={14} color="var(--green)" /> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Certificate card */}
            <div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: '0 0 60px rgba(56,189,248,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={18} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>SSL Certificate</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Lets Encrypt Authority X3</div>
                    </div>
                  </div>
                  <span className="badge badge-green">● Active</span>
                </div>

                {/* Certificate details */}
                {[['Common Name', 'easysecurity.in'], ['Issuer', "Let's Encrypt"], ['Valid Until', 'Aug 06, 2026'], ['Key Type', 'RSA 2048-bit'], ['SANs', '*.easysecurity.in']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontFamily: k === 'Common Name' || k === 'SANs' ? 'var(--mono)' : 'inherit', fontSize: k === 'Common Name' || k === 'SANs' ? 12 : 13 }}>{v}</span>
                  </div>
                ))}

                {/* Expiry bar */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                    <span>Certificate Health</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>87 days remaining</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '87%', background: 'linear-gradient(90deg, #34d399, #0ea5e9)', borderRadius: 3 }} />
                  </div>
                </div>

                <button onClick={() => nav('/generate')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  Generate Your Certificate →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 0', borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)', background: 'rgba(56,189,248,0.02)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center' }}>
            {stats.map(({ value, suffix, label }) => (
              <div key={label}>
                <div style={{ fontSize: 'clamp(32px,4vw,48px)', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-1px', lineHeight: 1 }}>
                  {value}<span style={{ fontSize: '60%' }}>{suffix}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge badge-blue" style={{ marginBottom: 16 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>Certificate in 4 Simple Steps</h2>
            <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>No technical knowledge required. From zero to SSL in under 60 seconds.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', top: 28, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg, var(--border), var(--accent), var(--border))', zIndex: 0 }} />
            {steps.map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent2), #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 800, color: 'white', fontSize: 16, boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}>
                  {i + 1}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="badge badge-blue" style={{ marginBottom: 16 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>Everything You Need</h2>
            <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>Complete SSL lifecycle management from generation to monitoring.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card" style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</h3>
                  <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 0 80px' }}>
        <div className="container">
          <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(129,140,248,0.1))', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 24, padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(56,189,248,0.1), transparent 70%)', pointerEvents: 'none' }} />
            <div className="badge badge-blue" style={{ marginBottom: 20 }}>Get Started Free</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
              Secure Your Domain Today
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
              Join thousands of developers who trust SSLVault for their SSL certificate management. Free forever, no credit card required.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => nav('/generate')} className="btn btn-primary btn-lg">
                <Shield size={18} /> Generate Free SSL
              </button>
              <button onClick={() => nav('/auth')} className="btn btn-secondary btn-lg">
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
