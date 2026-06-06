import { useState } from 'react'
import PageHero from '../components/PageHero'

const FONT = "'Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const BLUE = '#0077b6'

export default function Contact({ nav }) {
  const [copied, setCopied] = useState(false)
  const email = 'mathimcafee@gmail.com'

  const copy = () => {
    navigator.clipboard?.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ fontFamily: FONT, background: '#f8f9fa', minHeight: '100vh' }}>
      <PageHero
        eyebrow="SSLVault · Support"
        title="Get in touch."
        subtitle="Bug reports, feature requests, partnership ideas, or just saying hi — every message gets read and replied to within 1–2 days."
        stats={[{n:'1–2d',l:'Reply time'},{n:'3',l:'Languages'},{n:'PKI',l:'Specialist'},{n:'PKI',l:'Specialist'}]}
        tags={['English · Tamil · Dutch','No ads · No tracking','Certified PKI Specialist','GDPR compliant']}
      />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(20px,4vw,40px) 80px' }}>

        {/* ── MAIN EMAIL CARD ── */}
        <div style={{ background: '#0f1923', borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
          {/* dark terminal titlebar */}
          <div style={{ background: '#1a2533', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }}/>)}
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, flex: 1, textAlign: 'center' }}>SSLVault · Contact</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#3dbfb0', fontFamily: MONO }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3dbfb0' }}/>
              Online
            </div>
          </div>
          {/* body */}
          <div style={{ padding: '36px 40px', display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* avatar */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: 'rgba(61,191,176,0.15)', border: '2px solid rgba(61,191,176,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                🛡️
              </div>
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: MONO }}>Certified PKI</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Specialist</div>
              </div>
            </div>
            {/* contact info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Direct email</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#3dbfb0', fontFamily: MONO, letterSpacing: '-0.3px', marginBottom: 16 }}>{email}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`mailto:${email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: BLUE, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: FONT }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Compose email
                </a>
                <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: copied ? '#3dbfb0' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: FONT, transition: 'all .15s' }}>
                  {copied ? '✓ Copied' : 'Copy address'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
                {[['⏱','Reply within 1–2 days'],['🌐','English · Tamil · Dutch'],['🔒','No tracking, no ads']].map(([icon, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                    <span>{icon}</span>{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── WHAT TO INCLUDE ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>What to include</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap: 10 }}>
            {[
              { icon: '🐛', label: 'Bug reports', color: '#e74c3c', bg: 'rgba(231,76,60,.06)', border: 'rgba(231,76,60,.15)', body: 'Domain affected, browser + OS, exact error message, and steps to reproduce. Screenshot helps a lot.' },
              { icon: '⚡', label: 'Feature requests', color: BLUE, bg: 'rgba(0,119,182,.06)', border: 'rgba(0,119,182,.15)', body: "What you're trying to accomplish, how SSLVault falls short today, and what the ideal outcome looks like." },
              { icon: '🛡️', label: 'Account help', color: '#00a550', bg: 'rgba(0,165,80,.06)', border: 'rgba(0,165,80,.15)', body: "Email on your account and description of what you're stuck on. Never share passwords or API tokens." },
              { icon: '🤝', label: 'Partnerships', color: '#f39c12', bg: 'rgba(243,156,18,.06)', border: 'rgba(243,156,18,.15)', body: 'Who you are, what you\'re building, and how SSLVault might fit. Always happy to talk.' },
            ].map(({ icon, label, color, bg, border, body }) => (
              <div key={label} style={{ background: '#fff', border: `1px solid rgba(0,0,0,.08)`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.65 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KNOWLEDGE BASE CALLOUT ── */}
        <div style={{ background: 'rgba(0,119,182,.06)', border: '1px solid rgba(0,119,182,.18)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 3 }}>Check the Knowledge Base first</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>Most common questions — setup, DNS validation, troubleshooting, FAQs — are already answered there. Faster than waiting for a reply.</div>
          </div>
          <button onClick={() => nav('/knowledge-base')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: BLUE, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            Browse docs →
          </button>
        </div>

        {/* ── OTHER CHANNELS ── */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f0f0', background: '#fafbfc' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em' }}>Other channels</div>
          </div>
          {[
            { icon: '📋', label: 'GitHub Issues', sub: 'Bug reports and feature requests tracked publicly', href: 'https://github.com/mathimcafee-dev/LetsEncrypt/issues', cta: 'Open issue' },
            { icon: '📚', label: 'Knowledge Base', sub: 'Self-serve answers for setup, DNS, and troubleshooting', action: () => nav('/knowledge-base'), cta: 'Browse docs' },
            { icon: '🔍', label: 'CAA Checker', sub: 'Free tool — verify DNS before certificate issuance', action: () => nav('/caa-check'), cta: 'Check CAA' },
          ].map(({ icon, label, sub, href, action, cta }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>
              </div>
              {href
                ? <a href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(0,0,0,.1)', background: '#fff', color: '#444', fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{cta} ↗</a>
                : <button onClick={action} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(0,0,0,.1)', background: '#fff', color: '#444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}>{cta} →</button>
              }
            </div>
          ))}
          <div style={{ padding: '12px 18px', background: '#fafbfc' }}>
            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>Certified PKI Specialist · GDPR compliant</div>
          </div>
        </div>

      </div>
    </div>
  )
}
