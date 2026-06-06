// PublicLayout.jsx — shared layout for all public-facing pages
// Single source of truth for the landing-page nav, footer, and verify input.
// Used by: Home, GlobalPKIHub, About, Contact, KnowledgeBase, Install
import { useState, useEffect } from 'react'
import { Shield } from 'lucide-react'

export const F      = "'Inter', system-ui, sans-serif"
export const DM     = "'DM Sans','Inter',system-ui,sans-serif"
export const MONO   = "'JetBrains Mono','Fira Mono',monospace"
export const BLUE   = '#0077b6'
export const BLUE2  = '#0091d6'
export const INK    = '#111111'
export const BG     = '#f0f4fa'
export const BORDER = 'rgba(0,119,182,0.12)'
export const GRN    = '#00a550'

export function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < 820 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 820)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ── Verify (seal code) inline input — routes to /verify with prefill ───
export function VerifyInput({ dark = false, placeholder = 'Have a report? Paste its seal code · e.g. A8D42F2B' }) {
  const [code, setCode] = useState('')
  const go = () => {
    const c = code.trim()
    window.location.assign('/verify' + (c ? `?code=${encodeURIComponent(c)}` : ''))
  }
  return (
    <div style={{ display: 'flex', background: dark ? 'rgba(255,255,255,0.06)' : BG, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.14)' : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') go() }}
        placeholder={placeholder}
        spellCheck={false}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: dark ? '#fff' : '#0d1117', fontFamily: MONO, fontSize: 12, padding: '13px 16px', minWidth: 0 }}
      />
      <button onClick={go}
        style={{ background: BLUE, color: '#fff', border: 'none', fontWeight: 800, fontSize: 12.5, padding: '0 20px', cursor: 'pointer', fontFamily: DM, flexShrink: 0 }}>
        Verify →
      </button>
    </div>
  )
}

// ── Shared public nav (landing-page benchmark) ─────────────────────────
export function PublicNav({ nav }) {
  const isMobile = useIsMobile()
  return (
    <nav style={{ background: BLUE }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 26, padding: `16px ${isMobile ? 20 : 36}px` }}>
        <button onClick={() => nav('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: DM, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.18)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={14} color="#fff"/>
          </span>
          SSLVault
        </button>
        {!isMobile && <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>PKI-first CLM · Tamper-evident compliance evidence</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => nav('/auth')} style={{ color: '#fff', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: DM, cursor: 'pointer' }}>Sign in</button>
          {!isMobile && <button onClick={() => nav('/auth')} style={{ background: '#fff', color: BLUE, border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 800, fontFamily: DM, cursor: 'pointer' }}>Start free →</button>}
        </span>
      </div>
    </nav>
  )
}

// ── Shared public footer (landing-page benchmark, 3 layers) ────────────
export function PublicFooter({ nav }) {
  const isMobile = useIsMobile()
  const wrap = { maxWidth: 1140, margin: '0 auto' }
  return (
    <footer style={{ background: INK, color: '#fff', fontFamily: F }}>
      <style>{`.ftl:hover{color:#fff!important}`}</style>
      {/* Trust strip */}
      <div style={{ background: 'linear-gradient(90deg, rgba(0,119,182,0.16), rgba(0,119,182,0.04))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: `28px ${isMobile ? 20 : 36}px`, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 430 }}>
            <h4 style={{ fontSize: 16, fontFamily: DM, fontWeight: 800, marginBottom: 4, marginTop: 0 }}>Received an SSLVault compliance report?</h4>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
              Every report is sealed with a tamper-evident integrity code. Paste it here to confirm the document is genuine and unaltered — no account needed.
            </p>
          </div>
          <div style={{ width: isMobile ? '100%' : 340 }}>
            <VerifyInput dark placeholder="Enter seal code · e.g. A8D42F2B"/>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div style={{ ...wrap, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.4fr 1fr 1fr 1fr 1fr', gap: isMobile ? 26 : 36, padding: `38px ${isMobile ? 20 : 36}px 30px` }}>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, fontWeight: 800, fontFamily: DM, fontSize: 15 }}>
            <span style={{ width: 24, height: 24, background: BLUE, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={12} color="#fff"/></span>
            SSLVault
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 250, marginBottom: 16, marginTop: 0 }}>
            PKI-first certificate lifecycle management with tamper-evident compliance evidence. Built by a real PKI engineer.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['RFC 8555', 'DNS-01', 'AES-256-GCM', 'SHA-256 ledger'].map(c => (
              <span key={c} style={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 5, padding: '3px 8px' }}>{c}</span>
            ))}
          </div>
        </div>
        {[
          { h: 'Product', links: [['Compliance Witness', () => nav('/verify'), true], ['CertBind Verification', () => nav('/auth')], ['Zero-Touch Renewal', () => nav('/auth')], ['Pricing', () => nav('/pricing')], ['Get Started', () => nav('/get-started')]] },
          { h: 'Trust & Security', links: [['Verify a Report', () => nav('/verify'), true], ['CertVault & KeyLocker', () => nav('/auth')], ['CT Monitoring', () => nav('/auth')], ['47-Day Readiness', () => nav('/auth')]] },
          { h: 'Intelligence', links: [['CA Trust Store', () => nav('/ca-trust-explorer')], ['CAB Forum Hub', () => nav('/cab-forum')], ['Global PKI Hub', () => nav('/pki-hub')], ['CAA Checker', () => nav('/caa-check')]] },
          { h: 'Company', links: [['About', () => nav('/about')], ['Contact', () => nav('/contact')], ['Knowledge Base', () => nav('/knowledge-base')], ['Install Guide', () => nav('/install')]] },
        ].map(col => (
          <div key={col.h}>
            <h5 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: MONO, marginBottom: 14, marginTop: 0 }}>{col.h}</h5>
            {col.links.map(([l, go, isNew]) => (
              <button key={l} className="ftl" onClick={go}
                style={{ display: 'block', fontSize: 12.5, color: 'rgba(255,255,255,0.62)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 9, padding: 0, fontFamily: F, textAlign: 'left', transition: 'color .12s' }}>
                {l}{isNew && <span style={{ fontSize: 8.5, fontWeight: 800, background: 'rgba(0,165,80,0.18)', color: '#39d98a', borderRadius: 4, padding: '1px 5px', marginLeft: 6, verticalAlign: 'middle' }}>NEW</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: `18px ${isMobile ? 20 : 36}px`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>© 2026 SSLVault · Made with ♥ towards PKI</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GRN, display: 'inline-block' }}/>
            Secured by SSLVault · 256-bit TLS · Tamper-evident audit ledger
          </span>
        </div>
      </div>
    </footer>
  )
}
