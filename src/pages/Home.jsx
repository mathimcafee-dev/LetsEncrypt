// Home.jsx — SSLVault landing page · Concept C "Interactive Proof"
// Hero: live public SSL scan (scan-ssl) → bridge to Compliance Witness (verify) →
// witnessed automation timeline → shipped-this-quarter rail → frameworks → CTA → new footer.
import { useState, useEffect } from 'react'
import {
  Shield, ShieldCheck, Search, Loader2, CheckCircle, XCircle,
  FileCheck2, ArrowRight, Lock, Globe, Award, Activity, Brain,
  KeyRound, BarChart3, Library, ChevronDown
} from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const F      = "'Inter', system-ui, sans-serif"
const DM     = "'DM Sans','Inter',system-ui,sans-serif"
const MONO   = "'JetBrains Mono','Fira Mono',monospace"
const BLUE   = '#0077b6'
const BLUE2  = '#0091d6'
const INK    = '#111111'
const BG     = '#f0f4fa'
const BORDER = 'rgba(0,119,182,0.12)'
const GRN    = '#00a550'

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < 820 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 820)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ── Live SSL scan widget ────────────────────────────────────────────────
function ScanWidget({ isMobile }) {
  const [domain,  setDomain]  = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  async function scan() {
    const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').trim().toLowerCase()
    if (!clean || !clean.includes('.')) { setError('Enter a domain, e.g. example.com'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`${SB_URL}/functions/v1/scan-ssl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: clean }),
      })
      const data = await r.json()
      if (data && (data.domain || data.alive !== undefined)) setResult(data)
      else setError(data?.error || 'Scan failed — please try again.')
    } catch { setError('Scan service unavailable right now — please try again shortly.') }
    setLoading(false)
  }

  const grade = result
    ? (result.valid && (result.daysLeft ?? 0) > 30 ? 'A' : result.valid ? 'B' : 'F')
    : null
  const gradeColors = grade === 'A'
    ? { bg: '#e3f5ea', fg: '#1a7d43' }
    : grade === 'B' ? { bg: '#faf0d8', fg: '#8a6510' } : { bg: '#fae3df', fg: '#b03425' }
  const fmtD = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) } catch { return '—' } }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 10, boxShadow: '0 24px 70px rgba(0,40,65,0.45)', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <input
          value={domain}
          onChange={e => { setDomain(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') scan() }}
          placeholder="yourcompany.com"
          spellCheck={false}
          style={{ flex: 1, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: '15px 18px', fontSize: 15, fontFamily: MONO, color: '#0d1117', outline: 'none', background: BG }}
        />
        <button onClick={scan} disabled={loading}
          style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 11, padding: isMobile ? '14px' : '0 28px', fontSize: 15, fontWeight: 800, fontFamily: DM, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <Loader2 size={16} style={{ animation: 'lpspin 1s linear infinite' }}/> : <Search size={16}/>}
          {loading ? 'Scanning…' : 'Scan SSL →'}
        </button>
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12.5, color: '#b03425', padding: '0 6px' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 10, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: gradeColors.bg, color: gradeColors.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, fontFamily: DM, flexShrink: 0 }}>{grade}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: '#0d1117', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.domain}</div>
              <div style={{ fontSize: 11.5, color: result.valid ? '#1a7d43' : '#b03425', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                {result.valid ? <><CheckCircle size={12}/> Certificate valid · site responding</> : <><XCircle size={12}/> {result.alive ? 'Certificate problem detected' : 'Site unreachable or no certificate found'}</>}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 8 }}>
            {[
              ['Issuer', result.issuer || '—'],
              ['Expires in', result.daysLeft !== null && result.daysLeft !== undefined ? `${result.daysLeft} days` : '—'],
              ['Valid until', result.certExpiry ? fmtD(result.certExpiry) : '—'],
              ['SANs', (result.sans?.length || 0) > 0 ? `${result.sans.length} name${result.sans.length !== 1 ? 's' : ''}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#5a6776', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0d1117', marginTop: 2, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Verify (seal code) inline input — routes to /verify with prefill ───
function VerifyInput({ dark = false, placeholder = 'Have a report? Paste its seal code · e.g. A8D42F2B' }) {
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

// ── Main ────────────────────────────────────────────────────────────────
export default function Home({ nav }) {
  const isMobile = useIsMobile()
  const wrap = { maxWidth: 1140, margin: '0 auto', padding: `0 ${isMobile ? 20 : 36}px` }

  const timeline = [
    { e: '🛒', t: 'Order placed',      d: 'RapidSSL DV via GoGetSSL',                      l: 'ledger #1 sealed' },
    { e: '🌐', t: 'Ownership proven',  d: 'DNS-01 validation, automatic',                  l: 'ledger #2 sealed' },
    { e: '📜', t: 'Issued',            d: 'Fresh RSA-2048 keypair, ≤200-day validity',     l: 'ledger #3 sealed' },
    { e: '⚙️', t: 'Installed',         d: 'cPanel UAPI or VPS agent — zero touch',         l: 'ledger #4 sealed' },
    { e: '🔍', t: 'CertBind verified', d: 'Outside-in proof the live site serves it',      l: 'ledger #5 sealed' },
    { e: '✓',  t: 'Auto-renews forever', d: 'Days before expiry, with safety margin',      l: 'chain continues…', last: true },
  ]
  const shipped = [
    { ic: <FileCheck2 size={17}/>, t: 'Compliance Witness', isNew: true, d: 'Tamper-evident evidence ledger, per-domain dossiers, gap register, monthly auto-delivery to auditors, and public report verification.', go: () => nav('/verify') },
    { ic: <ShieldCheck size={17}/>, t: 'CertBind', d: 'Industry-first active binding verification: cryptographic key-cert match, TLS fingerprint, chain integrity, multi-node consistency.', go: () => nav('/auth') },
    { ic: <Brain size={17}/>, t: 'VaultBrain AI', d: 'An AI support agent answering from your live data — certificates, orders, agents, DNS, audit log — not canned help articles.', go: () => nav('/auth') },
    { ic: <KeyRound size={17}/>, t: 'CertVault + KeyLocker', d: 'Encrypted AES-256-GCM storage for certificates and private keys, with full custody tracking in the evidence ledger.', go: () => nav('/auth') },
    { ic: <BarChart3 size={17}/>, t: 'SLA Dashboard & Reports', d: 'Uptime and renewal-punctuality reporting for teams that answer to their own customers.', go: () => nav('/auth') },
    { ic: <Library size={17}/>, t: 'PKI Intelligence Hubs', d: 'CA Trust Store explorer, CAB Forum ballot tracker with compliance countdowns, and the Global PKI Hub with PQC tracking.', go: () => nav('/pki-hub') },
  ]

  return (
    <div style={{ fontFamily: F, color: INK, background: '#fff' }}>
      <style>{`@keyframes lpspin{to{transform:rotate(360deg)}} .pcard:hover{transform:translateY(-3px)} .ftl:hover{color:#fff!important}`}</style>

      {/* ── NAV ── */}
      <nav style={{ background: BLUE }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', gap: 26, padding: `16px ${isMobile ? 20 : 36}px` }}>
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

      {/* ── HERO: LIVE SCAN ── */}
      <header style={{ background: `linear-gradient(160deg, ${BLUE} 0%, #006aa3 60%, #005d90 100%)`, color: '#fff', padding: `${isMobile ? 44 : 64}px 0 0`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -180, top: -180, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 65%)' }}/>
        <div style={wrap}>
          <h1 style={{ fontFamily: DM, fontSize: isMobile ? 32 : 46, lineHeight: 1.1, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.01em', margin: 0 }}>
            Check any domain's SSL.<br/><span style={{ color: '#a8e0ff' }}>Right now. Free.</span>
          </h1>
          <p style={{ textAlign: 'center', fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.85)', maxWidth: 620, margin: '16px auto 30px', lineHeight: 1.65 }}>
            Type a domain and get an instant security report — validity, expiry, issuer.
            Then see what happens when every one of those checks is recorded forever.
          </p>
          <ScanWidget isMobile={isMobile}/>
          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.65)', margin: '14px 0 0' }}>
            No signup. Powered by the same engine that monitors every SSLVault-managed certificate.
          </p>
          <div style={{ display: 'flex', gap: isMobile ? 16 : 34, justifyContent: 'center', padding: '22px 0 26px', fontSize: 12.5, color: 'rgba(255,255,255,0.88)', marginTop: 34, borderTop: '1px solid rgba(255,255,255,0.14)', flexWrap: 'wrap' }}>
            <span>✓ <b style={{ color: '#fff' }}>RapidSSL · DigiCert</b> trust chain</span>
            <span>✓ <b style={{ color: '#fff' }}>Zero-touch</b> issue → install → renew</span>
            <span>✓ <b style={{ color: '#fff' }}>CA/B Forum 2026</b> ready</span>
          </div>
        </div>
      </header>

      {/* ── BRIDGE → WITNESS ── */}
      <section style={{ padding: `${isMobile ? 48 : 70}px 0`, background: '#fff' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1fr', gap: isMobile ? 40 : 54, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: BLUE, fontFamily: MONO, background: 'rgba(0,119,182,0.07)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>COMPLIANCE WITNESS</span>
            <h2 style={{ fontFamily: DM, fontSize: isMobile ? 25 : 32, lineHeight: 1.18, fontWeight: 800, color: '#0d1117', marginBottom: 14, letterSpacing: '-0.01em', marginTop: 0 }}>
              That was one check.<br/>SSLVault does it <span style={{ color: BLUE }}>continuously — and proves it.</span>
            </h2>
            <p style={{ fontSize: 14.5, color: '#3d4a58', lineHeight: 1.75, marginBottom: 14, marginTop: 0 }}>
              Every issuance, renewal, installation and verification is written to an append-only,
              hash-chained ledger the moment it happens. Altering any past record visibly breaks the
              chain — like numbered, glued pages in a notary's logbook.
            </p>
            <p style={{ fontSize: 14.5, color: '#3d4a58', lineHeight: 1.75, marginBottom: 14, marginTop: 0 }}>
              One click turns that ledger into an auditor-ready evidence report mapped to{' '}
              <b>SOC 2, ISO 27001, CA/B Forum, NIS2 and PCI DSS</b> — delivered to your auditor automatically every month.
            </p>
            <div style={{ marginTop: 20 }}><VerifyInput/></div>
            <div style={{ fontSize: 11, color: '#7a8694', marginTop: 8 }}>Public verification — anyone can confirm a report is genuine, no account needed.</div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '24px 26px', position: 'relative', boxShadow: '0 20px 60px rgba(0,40,65,0.16)', marginTop: isMobile ? 20 : 0 }}>
            <div style={{ position: 'absolute', top: -26, right: isMobile ? 8 : -26, width: 104, height: 104, borderRadius: '50%', background: '#fff', border: `3px solid ${BLUE}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,40,65,0.22)', gap: 2 }}>
              <svg width="30" height="30" viewBox="0 0 48 48"><path d="M24 4 L40 11 L40 24 C40 35 32 41 24 44 C16 41 8 35 8 24 L8 11 Z" fill={BLUE}/><path d="M17 24 L22 29 L31 18" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 9.5, fontWeight: 900, fontFamily: DM, letterSpacing: '.08em' }}>VERIFIED</span>
              <span style={{ fontSize: 8.5, fontFamily: MONO, color: BLUE, fontWeight: 700 }}>A8D42F2B</span>
            </div>
            <div style={{ color: BLUE, fontFamily: DM, fontWeight: 800, fontSize: 16, borderBottom: `2.5px solid ${BLUE}`, paddingBottom: 9, marginBottom: 12 }}>Certificate Compliance Evidence Report</div>
            {[
              ['Coverage continuity', <b key="1" style={{ fontFamily: MONO, color: '#0d1117' }}>100%</b>],
              ['Lifecycle events (hash-chained)', <b key="2" style={{ fontFamily: MONO, color: '#0d1117' }}>16</b>],
              ['Independent verifications (CertBind)', <b key="3" style={{ fontFamily: MONO, color: '#0d1117' }}>8 · all pass</b>],
              ['SOC 2 · ISO 27001 · CA/B · NIS2', <span key="4" style={{ background: '#e3f5ea', color: '#1a7d43', fontSize: 10, fontWeight: 800, borderRadius: 9, padding: '2px 10px' }}>✓ 12 requirements evidenced</span>],
              ['Open items disclosed', <b key="5" style={{ fontFamily: MONO, color: '#0d1117' }}>0</b>],
              ['Next auditor delivery', <b key="6" style={{ fontFamily: MONO, color: '#0d1117' }}>monthly · automatic</b>],
            ].map(([k, v], i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #e8eef4' : 'none', color: '#3d4a58', gap: 10 }}>
                <span>{k}</span>{v}
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 9.5, color: '#7a8694', fontFamily: MONO, wordBreak: 'break-all', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 11px' }}>
              SHA-256 a8d42f2b91c64de07f3a5b28e19c4d6f0b7a3e85d2c91f46ab08e73c5d214f9e
            </div>
          </div>
        </div>
      </section>

      {/* ── WITNESSED AUTOMATION TIMELINE ── */}
      <section style={{ background: BG, padding: `${isMobile ? 48 : 64}px 0` }}>
        <div style={wrap}>
          <h2 style={{ textAlign: 'center', fontFamily: DM, fontSize: isMobile ? 24 : 30, fontWeight: 800, color: '#0d1117', letterSpacing: '-0.01em', margin: 0 }}>Zero human steps. Every step witnessed.</h2>
          <p style={{ textAlign: 'center', fontSize: 13.5, color: '#5a6776', margin: '10px auto 44px', maxWidth: 560, lineHeight: 1.7 }}>
            The full certificate lifecycle runs hands-off — and each stage writes a sealed entry into your evidence ledger as it completes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6,1fr)', gap: isMobile ? 22 : 0, position: 'relative' }}>
            {!isMobile && <div style={{ position: 'absolute', top: 26, left: '8.3%', right: '8.3%', height: 3, background: `linear-gradient(90deg,${BLUE},${BLUE2})`, borderRadius: 2 }}/>}
            {timeline.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative', padding: '0 8px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: s.last ? BLUE : '#fff', border: `3px solid ${BLUE}`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, fontSize: 20, boxShadow: '0 4px 14px rgba(0,119,182,0.18)', color: s.last ? '#fff' : undefined }}>
                  {s.last ? <CheckCircle size={22} color="#fff"/> : s.e}
                </div>
                <h6 style={{ fontSize: 12.5, fontFamily: DM, fontWeight: 800, color: '#0d1117', marginBottom: 4, marginTop: 0 }}>{s.t}</h6>
                <p style={{ fontSize: 10.5, color: '#5a6776', lineHeight: 1.55, margin: 0 }}>{s.d}</p>
                <div style={{ fontSize: 9, color: BLUE, fontFamily: MONO, fontWeight: 700, marginTop: 5 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHIPPED THIS QUARTER ── */}
      <section style={{ padding: `${isMobile ? 48 : 64}px 0`, background: '#fff' }}>
        <div style={wrap}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontFamily: DM, fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Shipped this quarter</h2>
            <span style={{ fontSize: 12.5, color: '#5a6776' }}>Live today — not roadmap promises.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14 }}>
            {shipped.map((c, i) => (
              <div key={i} className="pcard" onClick={c.go}
                style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 13, padding: 20, transition: 'transform .15s', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(135deg,${BLUE},${BLUE2})`, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{c.ic}</div>
                <h6 style={{ fontSize: 14.5, fontFamily: DM, fontWeight: 800, marginBottom: 6, color: '#0d1117', marginTop: 0 }}>
                  {c.t}{c.isNew && <span style={{ fontSize: 8.5, fontWeight: 800, background: '#e3f5ea', color: '#1a7d43', borderRadius: 4, padding: '2px 6px', marginLeft: 6, verticalAlign: 'middle', letterSpacing: '.04em' }}>NEW</span>}
                </h6>
                <p style={{ fontSize: 11.5, color: '#5a6776', lineHeight: 1.65, margin: 0 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FRAMEWORKS BAND ── */}
      <section style={{ background: '#fff', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '24px 0' }}>
        <div style={{ ...wrap, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#7a8694', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: MONO, marginRight: 8 }}>Evidence mapped to</span>
          {['SOC 2 Type II', 'ISO 27001:2022', 'CA/B Forum SC-081v3', 'NIS2', 'PCI DSS v4'].map(f => (
            <span key={f} style={{ fontSize: 12, fontWeight: 800, fontFamily: DM, color: '#0d1117', border: `1px solid ${BORDER}`, background: BG, borderRadius: 9, padding: '8px 16px' }}>
              <span style={{ color: '#1a7d43', marginRight: 5 }}>✓</span>{f}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: `linear-gradient(135deg,${BLUE},#005d90)`, color: '#fff', padding: `${isMobile ? 44 : 56}px 0`, textAlign: 'center' }}>
        <div style={wrap}>
          <h2 style={{ fontFamily: DM, fontSize: isMobile ? 24 : 30, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.01em', marginTop: 0 }}>Stop managing certificates. Start proving it.</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 26, marginTop: 0 }}>Zero-touch lifecycle automation with auditor-grade evidence built in — from day one.</p>
          <button onClick={() => nav('/auth')} style={{ background: '#fff', color: BLUE, border: 'none', borderRadius: 11, padding: '15px 28px', fontWeight: 800, fontSize: 15, fontFamily: DM, cursor: 'pointer', margin: '6px 7px' }}>Start managing certs →</button>
          <button onClick={() => nav('/verify')} style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', borderRadius: 11, padding: '15px 28px', fontWeight: 700, fontSize: 15, fontFamily: DM, cursor: 'pointer', margin: '6px 7px' }}>Verify a report</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: INK, color: '#fff' }}>
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
    </div>
  )
}

