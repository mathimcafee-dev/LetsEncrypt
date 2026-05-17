import {
  Shield, CheckCircle, Zap, Globe, Server, ArrowRight,
  RefreshCw, Activity, Lock, Bell, Cpu, HardDrive,
  MemoryStick, ShieldCheck, FileText, Network, Key,
  ChevronRight, Search, Cloud
} from 'lucide-react'
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

// ── All platform features ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: Shield, color: '#0e7fc0', bg: '#eff6ff',
    tag: 'Core',
    title: 'Certificate Issuance',
    desc: 'Issue RapidSSL DV certs via GoGetSSL. Single domain, wildcard, and SAN. ~5 min issuance with DigiCert trust chain.',
  },
  {
    icon: Globe, color: '#15803d', bg: '#f0fdf4',
    tag: 'Automation',
    title: 'Auto DNS Validation',
    desc: 'Connect Cloudflare, Vercel, GoDaddy, or DigitalOcean once. Every cert auto-creates its DCV record — no manual steps ever.',
  },
  {
    icon: RefreshCw, color: '#7c3aed', bg: '#f5f3ff',
    tag: 'Automation',
    title: 'Zero-touch Auto-Renewal',
    desc: 'Cron fires 30 days before expiry. New cert issued, validated, installed — fully automatic with no human in the loop.',
  },
  {
    icon: Server, color: '#d97706', bg: '#fffbeb',
    tag: 'Deployment',
    title: 'VPS Agent Install',
    desc: 'Bash agent polls every 5 min for renewal jobs. Installs to Nginx, Apache, restarts web server, reports back. Set once, forget it.',
  },
  {
    icon: Cloud, color: '#d97706', bg: '#fff7ed',
    tag: 'Deployment',
    title: 'cPanel Auto-Install',
    desc: 'Full 4-step activation for cPanel servers: install cert, update vhosts, enable HSTS, rebuild mail SNI — all automatic.',
  },
  {
    icon: Activity, color: '#0369a1', bg: '#eff6ff',
    tag: 'Monitoring',
    title: 'TLS Posture Grading',
    desc: 'Grade any domain A–F. Checks HTTPS, HSTS, redirect, cert validity, trusted CA, and security headers. Run per-cert or in bulk.',
  },
  {
    icon: ShieldCheck, color: '#7c3aed', bg: '#f5f3ff',
    tag: 'Security',
    title: 'Post-Quantum Readiness',
    desc: 'Scan your portfolio for RSA-2048 (High risk / 2030 deadline), ECDSA, or NIST PQC algorithms. Migration guidance included.',
  },
  {
    icon: Search, color: '#0e7fc0', bg: '#eff6ff',
    tag: 'Discovery',
    title: 'CA Connectors',
    desc: 'Import certs from DigiCert API, Sectigo SCM, or paste any PEM. Algorithm, expiry, SANs auto-parsed. One view for every CA.',
  },
  {
    icon: Cpu, color: '#16a34a', bg: '#f0fdf4',
    tag: 'Monitoring',
    title: 'Agent Health Monitor',
    desc: 'Live CPU, RAM, disk, uptime bars for every VPS agent. Online/offline badges, job history, alert when offline 12+ min.',
  },
  {
    icon: Bell, color: '#dc2626', bg: '#fef2f2',
    tag: 'Alerts',
    title: 'Expiry Email Alerts',
    desc: 'Beautiful HTML alerts fire before certs expire. Set threshold per user. Reseller approval emails wired to the same system.',
  },
  {
    icon: Key, color: '#b45309', bg: '#fffbeb',
    tag: 'Security',
    title: 'Private Keys Stay Private',
    desc: 'Keys are AES-256-GCM encrypted at rest. Never leave your server. Immutable audit log on every access.',
  },
  {
    icon: FileText, color: '#475569', bg: '#f8fafc',
    tag: 'Multi-tenant',
    title: '3-Tier Reseller Platform',
    desc: 'Master admin → sub-reseller → end customer. Invite flows, magic link auth, Excel exports, approval emails. Built-in white-label ready.',
  },
]

const CLM_STEPS = [
  { num: '1', label: 'Issue',    color: '#0e7fc0', bg: '#eff6ff', border: '#bfdbfe', desc: 'Order in minutes. DV, wildcard, SAN. Auto DNS challenge via Cloudflare, Vercel, GoDaddy.' },
  { num: '2', label: 'Monitor',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Track expiry across every domain, customer, and server. TLS grading and PQC risk scoring.' },
  { num: '3', label: 'Renew',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Auto-renewal fires 30d before expiry. New cert issued, validated, installed — zero touch.' },
  { num: '4', label: 'Deploy',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'VPS agent or cPanel push. Nginx/Apache restart. Job queued, installed, reported back to dashboard.' },
]

const PLATFORMS = ['Nginx', 'Apache', 'cPanel', 'Plesk', 'Node.js', 'Docker', 'Cloudflare', 'Vercel', 'GoDaddy', 'DigitalOcean', 'Ubuntu', 'Debian']

const TAG_COLORS = {
  'Core':        { bg: '#dbeafe', color: '#1d4ed8' },
  'Automation':  { bg: '#dcfce7', color: '#15803d' },
  'Deployment':  { bg: '#fef3c7', color: '#b45309' },
  'Monitoring':  { bg: '#e0f2fe', color: '#0369a1' },
  'Security':    { bg: '#ede9fe', color: '#7c3aed' },
  'Discovery':   { bg: '#f0fdf4', color: '#16a34a' },
  'Alerts':      { bg: '#fee2e2', color: '#dc2626' },
  'Multi-tenant':{ bg: '#f1f5f9', color: '#475569' },
}

// ── Animated counter ──────────────────────────────────────────────────
function Counter({ target }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = Math.ceil(target / 40)
    const iv = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(start)
      if (start >= target) clearInterval(iv)
    }, 30)
    return () => clearInterval(iv)
  }, [target])
  return val
}

// ── Minimal feature card ──────────────────────────────────────────────
function FeatureCard({ icon: Icon, color, bg, tag, title, desc }) {
  const [hov, setHov] = useState(false)
  const tc = TAG_COLORS[tag] || TAG_COLORS.Core
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', border: `0.5px solid ${hov ? color+'44' : 'rgba(15,23,42,0.08)'}`,
        borderRadius: 14, padding: '22px 20px', transition: 'all .2s',
        boxShadow: hov ? `0 8px 24px ${color}18` : 'none', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: tc.bg, color: tc.color, letterSpacing: '0.3px', flexShrink: 0 }}>
          {tag}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', marginBottom: 7, letterSpacing: '-0.2px' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: '#525252', lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

export default function Home({ nav }) {
  const count = useLiveStats()
  const isMobile = useIsMobile()
  const animCount = Counter({ target: count })
  const [activeFeatureTag, setActiveFeatureTag] = useState('All')
  const allTags = ['All', ...Object.keys(TAG_COLORS)]
  const visibleFeatures = activeFeatureTag === 'All'
    ? FEATURES
    : FEATURES.filter(f => f.tag === activeFeatureTag)

  return (
    <div style={{ background: '#fafaf9', fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ background: '#0a0a0a', padding: isMobile ? '52px 18px 56px' : '80px 24px 80px',
        position: 'relative', overflow: 'hidden' }}>
        {/* Grid bg */}
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
          backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        {/* Glow */}
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 500, background: 'radial-gradient(ellipse,rgba(14,127,192,0.14) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(14,127,192,0.1)', border: '1px solid rgba(14,127,192,0.25)',
            borderRadius: 100, padding: '5px 14px', marginBottom: isMobile ? 20 : 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0e7fc0',
              boxShadow: '0 0 0 3px rgba(14,127,192,0.25)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', letterSpacing: '0.3px' }}>
              CA-Agnostic Certificate Lifecycle Management Platform
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 420px', gap: isMobile ? 36 : 60, alignItems: 'flex-start' }}>
            {/* Left: headline */}
            <div>
              <h1 style={{ fontSize: isMobile ? 'clamp(32px,7vw,44px)' : 'clamp(38px,4.5vw,56px)',
                fontWeight: 800, color: 'white', lineHeight: 1.08, letterSpacing: '-1.8px', margin: '0 0 8px' }}>
                SSL certificates.
              </h1>
              <h1 style={{ fontSize: isMobile ? 'clamp(32px,7vw,44px)' : 'clamp(38px,4.5vw,56px)',
                fontWeight: 800, color: '#0e7fc0', lineHeight: 1.08, letterSpacing: '-1.8px', margin: '0 0 10px' }}>
                Fully automated.
              </h1>
              <h1 style={{ fontSize: isMobile ? 'clamp(24px,5vw,34px)' : 'clamp(24px,3vw,38px)',
                fontWeight: 700, color: '#6b7280', lineHeight: 1.15, letterSpacing: '-0.8px', margin: '0 0 26px' }}>
                At a fraction of the cost.
              </h1>
              <p style={{ fontSize: isMobile ? 15 : 16, color: '#9ca3af', lineHeight: 1.8, maxWidth: 480, marginBottom: isMobile ? 28 : 36 }}>
                Issue, monitor, renew, and deploy SSL certificates across every server, every CA, every customer — fully automated. Built by a Certified PKI Specialist to beat $250k/yr Venafi and $75k/yr Keyfactor.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
                <button onClick={() => nav('/auth')}
                  style={{ background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8,
                    padding: '13px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(14,127,192,0.4)' }}>
                  <Shield size={15}/> Get Started Free
                </button>
                <button onClick={() => nav('/pricing')}
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                    padding: '13px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                  See Pricing <ArrowRight size={13}/>
                </button>
              </div>

              {/* Stats strip */}
              <div style={{ display: 'flex', gap: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
                {[
                  { val: count !== null ? `${animCount}+` : '—', label: 'Active certificates' },
                  { val: '~5 min', label: 'Issuance time' },
                  { val: '$5k/yr', label: 'vs $250k Venafi' },
                ].map(({ val, label }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>{val}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: CLM feature card */}
            <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '24px 22px', backdropFilter: 'blur(8px)' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0e7fc0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={13} color="white" strokeWidth={2.5}/>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Full CLM Stack
                </span>
              </div>

              {[
                { icon: Zap,        color: '#0e7fc0', label: 'Auto-issuance',        sub: 'GoGetSSL · DigiCert chain · 5 min' },
                { icon: Globe,      color: '#15803d', label: 'Auto DNS validation',  sub: 'Cloudflare · Vercel · GoDaddy · DO' },
                { icon: RefreshCw,  color: '#7c3aed', label: 'Zero-touch renewal',   sub: 'Cron + VPS agent + cPanel push' },
                { icon: Server,     color: '#d97706', label: 'Agent deployment',     sub: 'Nginx · Apache · cPanel · Plesk' },
                { icon: ShieldCheck,color: '#16a34a', label: 'TLS posture grading',  sub: 'A–F scoring + PQC readiness scan' },
                { icon: Search,     color: '#0369a1', label: 'CA connectors',        sub: 'DigiCert · Sectigo · PEM import' },
                { icon: Activity,   color: '#dc2626', label: 'Agent health monitor', sub: 'CPU · RAM · disk · uptime · jobs' },
                { icon: FileText,   color: '#475569', label: '3-tier reseller',      sub: 'Master → reseller → customer' },
              ].map(({ icon: Icon, color, label, sub }) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center',
                  padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`,
                    border: `1px solid ${color}28`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={color} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 1 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{sub}</div>
                  </div>
                  <CheckCircle size={12} color="#16a34a" strokeWidth={2.5} style={{ flexShrink: 0 }}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VS COMPARISON ────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: isMobile ? '48px 18px' : '64px 24px',
        borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Why SSLVault</div>
            <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 10 }}>
              Enterprise CLM. Without the enterprise price tag.
            </h2>
            <p style={{ fontSize: 14, color: '#525252', maxWidth: 520, margin: '0 auto' }}>
              Venafi costs $250k+/yr and Keyfactor $75–200k/yr. SSLVault gives you the same core CLM for a fraction of the cost — built by a Certified PKI Specialist with channel partner expertise.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
            {[
              { name: 'CyberArk / Venafi', price: '$250k+/yr', color: '#dc2626', width: '100%', tag: 'Enterprise only' },
              { name: 'Keyfactor Command', price: '$75–200k/yr', color: '#f59e0b', width: '65%', tag: 'Mid-market' },
              { name: 'SSLVault', price: '$5–15k/yr', color: '#16a34a', width: '8%', tag: 'For everyone', highlight: true },
            ].map(({ name, price, color, width, tag, highlight }) => (
              <div key={name} style={{ borderRadius: 14, padding: '20px 18px',
                background: highlight ? 'linear-gradient(135deg,#f0fdf4,#ecfdf5)' : '#f8fafc',
                border: highlight ? '1.5px solid #16a34a' : '0.5px solid rgba(15,23,42,0.08)',
                boxShadow: highlight ? '0 4px 20px rgba(22,163,74,0.12)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{name}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: highlight ? '#16a34a' : '#e5e7eb', color: highlight ? 'white' : '#6b7280' }}>
                    {tag}
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 10, letterSpacing: '-0.5px' }}>{price}</div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width, background: color, borderRadius: 3, transition: 'width 1s' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '48px 18px' : '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>How it works</div>
          <h2 style={{ fontSize: isMobile ? 24 : 34, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 12 }}>
            Issue. Monitor. Renew. Deploy.
          </h2>
          <p style={{ fontSize: 14, color: '#525252', maxWidth: 500, margin: '0 auto 44px', lineHeight: 1.7 }}>
            Four steps. Fully automated. From cert order to server installation — no manual work required.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12 }}>
            {CLM_STEPS.map(({ num, label, color, bg, border, desc }) => (
              <div key={num} style={{ background: bg, border: `1px solid ${border}`,
                borderRadius: 14, padding: '22px 18px', textAlign: 'left', position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 14 }}>{num}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#525252', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────── */}
      <section id="features" style={{ background: '#f8fafc', padding: isMobile ? '48px 18px' : '72px 24px',
        borderTop: '0.5px solid rgba(15,23,42,0.06)', borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0e7fc0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Platform features</div>
            <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 12 }}>
              Everything. Built in.
            </h2>
            <p style={{ fontSize: 14, color: '#525252', maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Twelve features that make SSLVault a complete CLM platform — not just a cert issuance tool.
            </p>

            {/* Filter tags */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {allTags.map(tag => {
                const tc = TAG_COLORS[tag] || { bg: '#0e7fc0', color: 'white' }
                const active = activeFeatureTag === tag
                return (
                  <button key={tag} onClick={() => setActiveFeatureTag(tag)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      border: active ? 'none' : '0.5px solid rgba(15,23,42,0.12)', fontFamily: 'inherit',
                      background: active ? (tag === 'All' ? '#0e7fc0' : tc.bg) : 'white',
                      color: active ? (tag === 'All' ? 'white' : tc.color) : '#6b7280',
                      transition: 'all .15s' }}>
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14 }}>
            {visibleFeatures.map(f => <FeatureCard key={f.title} {...f}/>)}
          </div>
        </div>
      </section>

      {/* ── PQC HIGHLIGHT ─────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: isMobile ? '48px 18px' : '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 56, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 100,
                padding: '4px 12px', marginBottom: 18 }}>
                <ShieldCheck size={12} color="#7c3aed"/>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>NEW — Post-Quantum Readiness</span>
              </div>
              <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.8px', marginBottom: 14 }}>
                Is your portfolio ready for 2030?
              </h2>
              <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.8, marginBottom: 20 }}>
                NIST finalized ML-DSA, ML-KEM, and SLH-DSA in August 2024. RSA-2048 certs are at <strong>high risk</strong> — NIST deadline is 2030. Keyfactor acquired two PQC companies for this. SSLVault has it built in, at $5k/yr.
              </p>
              {[
                { risk: 'High', color: '#dc2626', bg: '#fef2f2', algo: 'RSA-2048', deadline: 'Migrate by 2030' },
                { risk: 'Medium', color: '#d97706', bg: '#fffbeb', algo: 'ECDSA P-256', deadline: 'Plan migration' },
                { risk: 'Low', color: '#2563eb', bg: '#eff6ff', algo: 'ECDSA P-384', deadline: 'Monitor deadline' },
                { risk: 'Ready', color: '#16a34a', bg: '#f0fdf4', algo: 'ML-DSA / SLH-DSA', deadline: 'No action needed' },
              ].map(({ risk, color, bg, algo, deadline }) => (
                <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                    background: bg, color, width: 54, textAlign: 'center', flexShrink: 0 }}>{risk}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a', fontFamily: 'monospace', minWidth: 120 }}>{algo}</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{deadline}</span>
                </div>
              ))}
            </div>
            {/* PQC visual card */}
            <div style={{ background: '#0a0a0a', borderRadius: 18, padding: '28px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 18 }}>
                Portfolio PQC scan
              </div>
              {[
                { domain: 'freecerts.site',       algo: 'RSA-2048', risk: 'PQC✗', riskColor: '#dc2626', riskBg: 'rgba(220,38,38,0.12)' },
                { domain: 'api.freecerts.site',   algo: 'ECDSA P-256', risk: 'PQC!', riskColor: '#d97706', riskBg: 'rgba(217,119,6,0.12)' },
                { domain: 'secure.mysite.com',    algo: 'ECDSA P-384', risk: 'PQC~', riskColor: '#2563eb', riskBg: 'rgba(37,99,235,0.12)' },
                { domain: 'vault.enterprise.io',  algo: 'ML-DSA-65', risk: 'PQC✓', riskColor: '#16a34a', riskBg: 'rgba(22,163,74,0.12)' },
              ].map(({ domain, algo, risk, riskColor, riskBg }) => (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
                  <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace', flexShrink: 0 }}>{algo}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: riskBg, color: riskColor, flexShrink: 0 }}>{risk}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(14,127,192,0.12)', border: '1px solid rgba(14,127,192,0.2)',
                borderRadius: 8, padding: '10px 14px' }}>
                <Zap size={13} color="#38bdf8"/>
                <span style={{ fontSize: 12, color: '#38bdf8' }}>Scan all certs in one click · NIST SP 800-131A Rev 3</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENT HEALTH ─────────────────────────────────────────────── */}
      <section style={{ background: '#0a0a0a', padding: isMobile ? '48px 18px' : '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 56, alignItems: 'center' }}>
            {/* Agent monitor card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 18 }}>
                Live agent health
              </div>
              {[
                { host: 'vps-nl-01.freecerts.site', type: 'VPS', online: true,  cpu: 42, ram: 58, disk: 31, certs: 8 },
                { host: 'sg-prod.easysecurity.in',  type: 'VPS', online: true,  cpu: 71, ram: 80, disk: 55, certs: 14 },
                { host: 'cpanel.myhosting.com',     type: 'cPanel', online: false, cpu: 0, ram: 0, disk: 0, certs: 3 },
              ].map(({ host, type, online, cpu, ram, disk, certs }) => (
                <div key={host} style={{ padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: online ? '#16a34a' : '#dc2626',
                      boxShadow: online ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none' }}/>
                    <span style={{ fontSize: 11, color: '#e5e7eb', fontFamily: 'monospace', flex: 1 }}>{host}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: type === 'cPanel' ? 'rgba(217,119,6,0.15)' : 'rgba(37,99,235,0.15)',
                      color: type === 'cPanel' ? '#fbbf24' : '#60a5fa' }}>{type}</span>
                    <span style={{ fontSize: 9, color: '#6b7280' }}>{certs}c</span>
                  </div>
                  {online && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {[['CPU', cpu, '#0e7fc0'], ['RAM', ram, '#7c3aed'], ['Disk', disk, '#d97706']].map(([lbl, val, c]) => (
                        <div key={lbl}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6b7280', marginBottom: 3 }}>
                            <span>{lbl}</span><span style={{ color: c }}>{val}%</span>
                          </div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: 2 }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!online && (
                    <div style={{ fontSize: 10, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }}/>
                      Agent offline · last seen 22m ago
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)',
                borderRadius: 100, padding: '4px 12px', marginBottom: 18 }}>
                <Activity size={12} color="#4ade80"/>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>Real-time Agent Monitoring</span>
              </div>
              <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: 'white', letterSpacing: '-0.8px', marginBottom: 14 }}>
                Know your agents are healthy.
              </h2>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.8, marginBottom: 24 }}>
                Every VPS running the SSLVault agent reports CPU, RAM, disk, and uptime on every 5-minute poll. Offline alerts fire after 12 minutes. Job history shows every cert install and renewal.
              </p>
              {[
                { icon: Cpu,        label: 'Live CPU / RAM / disk bars per agent' },
                { icon: Activity,   label: 'Online / offline badge with pulse animation' },
                { icon: RefreshCw,  label: 'Per-agent job history — installs and renewals' },
                { icon: Bell,       label: 'Offline alert after 2 missed polls (12 min)' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(22,163,74,0.12)',
                    border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} color="#4ade80" strokeWidth={1.8}/>
                  </div>
                  <span style={{ fontSize: 13, color: '#d1d5db' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ────────────────────────────────────────────────── */}
      <section style={{ background: 'white', padding: isMobile ? '40px 18px' : '52px 24px',
        borderTop: '0.5px solid rgba(15,23,42,0.06)', borderBottom: '0.5px solid rgba(15,23,42,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#a3a3a3', fontWeight: 500, marginBottom: 18 }}>Auto-install & auto-DNS support for</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {PLATFORMS.map(p => (
              <span key={p} style={{ background: '#f8fafc', border: '0.5px solid rgba(15,23,42,0.08)',
                borderRadius: 8, padding: '7px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#0d3c6e 0%,#0a0a0a 100%)', padding: isMobile ? '56px 18px' : '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400,
          background: 'radial-gradient(ellipse,rgba(14,127,192,0.15) 0%,transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#0e7fc0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Shield size={26} color="white" strokeWidth={2}/>
          </div>
          <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: 14 }}>
            Beat Venafi at a fraction of the price.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Full CLM platform — issuance, monitoring, auto-renewal, VPS agent, cPanel push, TLS grading, PQC readiness, 3-tier reseller. Start free.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/auth')}
              style={{ background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8,
                padding: '14px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                boxShadow: '0 4px 24px rgba(14,127,192,0.45)' }}>
              <Shield size={16}/> Get Started Free
            </button>
            <button onClick={() => nav('/pricing')}
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
              See Pricing <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a0a0a', padding: isMobile ? '36px 18px' : '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 28 : 40, marginBottom: 40 }}>
            <div style={{ gridColumn: isMobile ? 'span 2' : 'span 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0e7fc0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={14} color="white" strokeWidth={2.5}/>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>SSLVault</span>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7, margin: '0 0 12px' }}>
                CA-agnostic CLM platform for SSL resellers, MSPs, and businesses. Built by a Certified PKI Specialist.
              </p>
              <div style={{ fontSize: 11, color: '#374151', background: '#111', borderRadius: 6, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}/>
                Made with ♥ in the Netherlands
              </div>
            </div>
            {[
              { label: 'Platform', links: [{ l: 'Get Started', p: '/auth' }, { l: 'Pricing', p: '/pricing' }, { l: 'Install Guide', p: '/install' }, { l: 'Knowledge Base', p: '/knowledge-base' }] },
              { label: 'Resources', links: [{ l: 'DNS & Servers', p: '/dns-providers' }, { l: 'Developer', p: '/developer' }, { l: 'GetStarted', p: '/get-started' }, { l: 'Contact', p: '/contact' }] },
              { label: 'Company', links: [{ l: 'About', p: '/about' }, { l: 'Privacy Policy', p: '/privacy' }, { l: 'Terms of Service', p: '/terms' }] },
            ].map(({ label, links }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>{label}</div>
                {links.map(({ l, p }) => (
                  <div key={l} onClick={() => nav(p)}
                    style={{ fontSize: 13, color: '#9ca3af', marginBottom: 9, cursor: 'pointer', transition: 'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#4b5563' }}>© 2026 SSLVault · PKI-first certificate lifecycle management</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Privacy', 'Terms', 'Contact'].map(l => (
                <span key={l} onClick={() => nav('/'+l.toLowerCase())}
                  style={{ fontSize: 12, color: '#4b5563', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
