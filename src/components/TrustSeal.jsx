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
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="12" fontWeight="800" fill="#0077b6" letterSpacing="2.2">
        <textPath href={`#${arcT}`} startOffset="50%" textAnchor="middle">{topText}</textPath>
      </text>
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="10.5" fontWeight="700" fill="#5a86a8" letterSpacing="2">
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
