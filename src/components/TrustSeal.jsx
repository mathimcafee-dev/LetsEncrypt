// TrustSeal — SSLVault verification seal (light blue system, inline SVG, print-safe)
// Used on: landing page, login, Witness reports & auditor viewer
export default function TrustSeal({
  size = 110,
  topText = 'SSLVAULT CERTIFICATE SECURITY',
  bottomText = 'TAMPER-EVIDENT · AUTOMATED',
  centerText = 'TRUSTED',
  code = '',
  idSuffix = 's',
}) {
  const year = 2026
  const grad = `tsGrad-${idSuffix}`, arcT = `tsArcT-${idSuffix}`, arcB = `tsArcB-${idSuffix}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="SSLVault trust seal">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0077b6"/><stop offset="1" stopColor="#0091d6"/>
        </linearGradient>
        <path id={arcT} d="M 100,100 m -76,0 a 76,76 0 1,1 152,0"/>
        <path id={arcB} d="M 100,100 m -76,0 a 76,76 0 1,0 152,0"/>
      </defs>
      <circle cx="100" cy="100" r="97" fill="#fff" stroke={`url(#${grad})`} strokeWidth="3"/>
      <circle cx="100" cy="100" r="88" fill="none" stroke="#0077b6" strokeWidth="1" strokeDasharray="2.5 3.5" opacity="0.55"/>
      <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(0,119,182,0.18)" strokeWidth="1"/>
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="10.5" fontWeight="800" fill="#0077b6" letterSpacing="1.2">
        <textPath href={`#${arcT}`} startOffset="50%" textAnchor="middle">{topText}</textPath>
      </text>
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="9.5" fontWeight="700" fill="#5a86a8" letterSpacing="1.4">
        <textPath href={`#${arcB}`} startOffset="50%" textAnchor="middle">{bottomText}</textPath>
      </text>
      <g transform="translate(100,76)">
        <path d="M0,-20 L16,-13 L16,2 C16,13 8,21 0,25 C-8,21 -16,13 -16,2 L-16,-13 Z" fill={`url(#${grad})`}/>
        <path d="M-7,1 L-2,7 L8,-6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <text x="100" y="121" textAnchor="middle" fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="13" fontWeight="800" fill="#0d1117" letterSpacing="1.5">{centerText}</text>
      {code
        ? <text x="100" y="136" textAnchor="middle" fontFamily="'JetBrains Mono','Courier New',monospace" fontSize="9.5" fontWeight="700" fill="#0077b6" letterSpacing="1">SEAL {code}</text>
        : <text x="100" y="136" textAnchor="middle" fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="9" fontWeight="600" fill="#7a8694" letterSpacing="1.8">EASYSECURITY.IN</text>}
      <text x="100" y={150} textAnchor="middle" fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="9" fontWeight="600" fill="#7a8694" letterSpacing="1.5">EST. {year}</text>
    </svg>
  )
}


// SiteTrustBadge — horizontal "this site is secured" seal for footers (light + dark variants)
export function SiteTrustBadge({ dark = false }) {
  const border = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,119,182,0.2)'
  const bg     = dark ? 'rgba(255,255,255,0.05)' : '#fff'
  const title  = dark ? '#fff' : '#0d1117'
  const sub    = dark ? 'rgba(255,255,255,0.5)' : '#5a6776'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 18px 10px 12px', boxShadow: dark ? 'none' : '0 2px 10px rgba(0,119,182,0.08)' }}>
      {/* Shield + lock */}
      <svg width="38" height="38" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id="stbGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0077b6"/><stop offset="1" stopColor="#0091d6"/>
          </linearGradient>
        </defs>
        <path d="M24 3 L42 10 L42 24 C42 36 33 43 24 46 C15 43 6 36 6 24 L6 10 Z" fill="url(#stbGrad)"/>
        <rect x="17" y="21" width="14" height="11" rx="2.5" fill="#fff"/>
        <path d="M19.5 21 v-3.2 a4.5 4.5 0 0 1 9 0 V21" fill="none" stroke="#fff" strokeWidth="2.6"/>
        <circle cx="24" cy="26" r="1.8" fill="#0077b6"/>
        <rect x="23.1" y="26.5" width="1.8" height="3.2" rx="0.9" fill="#0077b6"/>
      </svg>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: title, letterSpacing: '0.02em', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>Secured by SSLVault</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00a550', flexShrink: 0 }}/>
        </div>
        <div style={{ fontSize: 10, color: sub, marginTop: 2, fontFamily: "'DM Sans','Segoe UI',sans-serif", letterSpacing: '0.02em' }}>
          256-bit TLS encryption · Tamper-evident audit ledger
        </div>
      </div>
    </div>
  )
}
