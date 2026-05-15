import { Shield, CheckCircle, Zap, Globe, Server, ArrowRight,
         RefreshCw, Activity, Lock, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'

function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

function useLiveStats() {
  const [count, setCount] = useState(null)
  useEffect(() => {
    supabase.from('certificates').select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => { if (count !== null) setCount(count) }).catch(() => {})
  }, [])
  return count
}

const PILLARS = [
  { icon: Shield,    color: '#0e7fc0', title: 'Issue',    sub: 'RapidSSL DV via TheSSLStore · DigiCert trust chain · ~5 min issuance' },
  { icon: Activity,  color: '#2563eb', title: 'Monitor',  sub: 'Track expiry across every domain, every customer, every server' },
  { icon: RefreshCw, color: '#7c3aed', title: 'Renew',    sub: 'Zero-touch auto-renewal — cron, agent, and SSH push' },
  { icon: Server,    color: '#d97706', title: 'Install',  sub: 'Deploy to Nginx, Apache, cPanel, Plesk via agent or SSH' },
]

const FEATURES = [
  {
    icon: Globe, color: '#0e7fc0', bg: '#eff6ff',
    title: 'Multi-domain support',
    desc: 'Issue certificates for single domains, wildcards, and SANs. One platform handles DV, OV, and EV certificates across all your customers.',
  },
  {
    icon: Globe, color: '#15803d', bg: '#f0fdf4',
    title: 'Auto DNS validation',
    desc: 'Connect Cloudflare, Vercel, or GoDaddy once. Every certificate issuance auto-creates the DCV record — no manual steps.',
  },
  {
    icon: RefreshCw, color: '#7c3aed', bg: '#faf5ff',
    title: 'Zero-touch auto-renewal',
    desc: 'Cron-based renewal fires 30 days before expiry. New cert issued, validated, installed — fully automatic.',
  },
  {
    icon: Server, color: '#d97706', bg: '#fffbeb',
    title: 'Auto-install on servers',
    desc: 'Persistent VPS agent polls for new certs and deploys them. cPanel one-click install. SSH push. Set it once, forget it.',
  },
  {
    icon: Bell, color: '#0369a1', bg: '#eff6ff',
    title: 'Expiry alerts',
    desc: 'Get notified before certificates expire. Set custom thresholds per domain. Never miss a renewal again.',
  },
  {
    icon: Shield, color: '#b45309', bg: '#fffbeb',
    title: 'Private keys stay private',
    desc: 'Keys are encrypted at rest with AES-256. Never leave your server infrastructure. Full audit trail on every access.',
  },
]

const PLATFORMS = ['Nginx', 'Apache', 'cPanel', 'Plesk', 'Node.js', 'Docker', 'Cloudflare', 'Vercel', 'Caddy', 'Ubuntu']

export default function Home({ nav }) {
  const count = useLiveStats()
  const isMobile = useIsMobile()

  return (
    <div style={{ background: '#fafaf9', fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{ background: '#0a0a0a', padding: isMobile ? '52px 18px 48px' : '80px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse,rgba(14,127,192,0.12) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(14,127,192,0.12)', border: '1px solid rgba(14,127,192,0.3)', borderRadius: 100, padding: '5px 14px', marginBottom: isMobile ? 20 : 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e7fc0', display: 'block', boxShadow: '0 0 0 2px rgba(14,127,192,0.3)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', letterSpacing: '0.2px' }}>Certificate Lifecycle Management Platform</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', gap: isMobile ? 32 : 64, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 'clamp(32px,7vw,42px)' : 'clamp(36px,4.5vw,54px)', fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-1.5px', margin: '0 0 6px' }}>
                SSL certificates.
              </h1>
              <h1 style={{ fontSize: isMobile ? 'clamp(32px,7vw,42px)' : 'clamp(36px,4.5vw,54px)', fontWeight: 800, color: '#0e7fc0', lineHeight: 1.1, letterSpacing: '-1.5px', margin: '0 0 24px' }}>
                Managed for your customers.
              </h1>
              <p style={{ fontSize: isMobile ? 15 : 16, color: '#9ca3af', lineHeight: 1.75, maxWidth: 480, marginBottom: isMobile ? 28 : 36 }}>
                Issue trusted SSL certificates, monitor expiry across all your domains, and automate renewal and deployment — all from one platform.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
                <button onClick={() => nav('/auth')}
                  style={{ background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(14,127,192,0.35)' }}>
                  <Shield size={15} /> Get Started Free
                </button>
                <button onClick={() => nav('/auth')}
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                  Sign In <ArrowRight size={13} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  count !== null ? `${count}+ active certificates` : 'Active certificates',
                  'RapidSSL · DigiCert chain',
                  '~5 min issuance',
                ].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} color="#0e7fc0" />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CLM Pillars card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20 }}>Full CLM Platform</div>
              {PILLARS.map(({ icon: Icon, color, title, sub }) => (
                <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: isMobile ? '48px 18px' : '64px 24px', borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 14 }}>Issue. Monitor. Renew. Repeat.</h2>
          <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 48px' }}>
            From issuance to auto-renewal, SSLVault handles the full certificate lifecycle so you never have to think about expiry again.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 16 : 0, position: 'relative' }}>
            {[
              { num: '1', role: 'Issue', color: '#0e7fc0', bg: '#eff6ff', border: '#bfdbfe', desc: 'Order SSL certificates in minutes. Supports DV, wildcard, and multi-domain. Auto-creates DCV records via your DNS provider.' },
              { num: '2', role: 'Monitor', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Track every certificate across all domains and servers. Get expiry alerts before they become incidents.' },
              { num: '3', role: 'Renew & Deploy', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', desc: 'Auto-renewal fires 30 days before expiry. New cert issued, validated, installed — fully automatic via agent or cron.' },
            ].map(({ num, role, color, bg, border, desc }, i) => (
              <div key={num} style={{ background: bg, border: `1px solid ${border}`, borderRadius: isMobile ? 12 : i === 0 ? '12px 0 0 12px' : i === 2 ? '0 12px 12px 0' : 0, padding: '28px 24px', position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 14 }}>{num}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>{role}</div>
                <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: isMobile ? '48px 18px' : '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Platform features</div>
            <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 14 }}>Everything for SSL lifecycle management</h2>
            <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>Built for anyone who needs to manage SSL certificates at scale, with zero manual intervention.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} style={{ background: 'white', border: '0.5px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: '24px 22px', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={17} color={color} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', marginBottom: 8, letterSpacing: '-0.2px' }}>{title}</div>
                <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ───────────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: isMobile ? '40px 18px' : '52px 24px', borderTop: '0.5px solid rgba(15,23,42,0.06)', borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#a3a3a3', fontWeight: 500, marginBottom: 20 }}>Auto-install support for</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {PLATFORMS.map(p => (
              <span key={p} style={{ background: '#f8fafc', border: '0.5px solid rgba(15,23,42,0.08)', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0d3c6e', padding: isMobile ? '52px 18px' : '72px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, color: 'white', letterSpacing: '-0.8px', marginBottom: 14 }}>
            Ready to manage SSL at scale?
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 36 }}>
            Sign in and start issuing, monitoring, and auto-renewing SSL certificates — all from one platform.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/auth')}
              style={{ background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(14,127,192,0.4)' }}>
              <Shield size={16} /> Sign In Free
            </button>
            <button onClick={() => nav('/auth')}
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '13px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a0a0a', padding: isMobile ? '32px 18px' : '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 28 : 40, marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: '#0e7fc0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={13} color="white" strokeWidth={2.5} /></div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>SSLVault</span>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>Certificate Lifecycle Management platform for SSL resellers and businesses.</p>
            </div>
            {[
              { label: 'Platform', links: [{ l: 'Sign In', p: '/auth' }, { l: 'Pricing', p: '/pricing' }, { l: 'About', p: '/about' }] },
              { label: 'Resources', links: [{ l: 'Install Guide', p: '/install' }, { l: 'Knowledge Base', p: '/knowledge-base' }, { l: 'Developer', p: '/developer' }] },
              { label: 'Company', links: [{ l: 'About', p: '/about' }, { l: 'Contact', p: '/contact' }, { l: 'Privacy', p: '/privacy' }, { l: 'Terms', p: '/terms' }] },
            ].map(({ label, links }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{label}</div>
                {links.map(({ l, p }) => (
                  <div key={l} onClick={() => nav(p)} style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                  >{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>© 2026 SSLVault · Made with ♥ in NL</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Built with PKI expertise</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
