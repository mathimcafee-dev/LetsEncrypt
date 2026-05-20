import '../styles/design-v2.css'

export default function About({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:800, padding:'60px 24px 80px' }}>
        <h1 style={{ fontSize:32, fontWeight:700, color:'var(--v2-text)', marginBottom:16, letterSpacing:'-0.5px' }}>
          About SSLVault
        </h1>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:24 }}>
          SSLVault is a Certificate Lifecycle Management platform built for indie developers,
          SMBs, and non-profits. Issue trusted DV certificates via GoGetSSL, monitor your full
          certificate estate, and automate renewal and deployment — all from one dashboard.
        </p>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:24 }}>
          Built by a PKI specialist with first-hand CA experience, SSLVault gives everyone access
          to enterprise-grade CLM. Every certificate is a trusted RapidSSL DV certificate backed
          by the DigiCert trust chain, issued via GoGetSSL API.
        </p>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:40 }}>
          SSLVault is free forever for indie developers, SMBs, and non-profits. No credit card required.
          Built with React, Supabase, and Vercel. Made with ♥ in the Netherlands.
        </p>
        <button onClick={() => nav('/auth')}
          style={{ padding:'11px 24px', background:'#0a0a0a', color:'white',
            border:'none', borderRadius:8, fontSize:14, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit' }}>
          Get started free →
        </button>
      </div>
    </div>
  )
}
