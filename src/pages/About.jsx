export default function About({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', padding:'0 24px' }}>
      <div style={{ maxWidth:760, margin:'0 auto', paddingTop:80, paddingBottom:80 }}>

        <div style={{ display:'inline-block', background:'#eff6ff', border:'1px solid #bfdbfe',
          borderRadius:100, padding:'4px 16px', marginBottom:24 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#1d4ed8' }}>Certificate Lifecycle Management</span>
        </div>

        <h1 style={{ fontSize:36, fontWeight:800, color:'#0a0e1a', marginBottom:20,
          letterSpacing:'-1px', lineHeight:1.1 }}>
          About SSLVault
        </h1>

        <p style={{ fontSize:16, color:'#475569', lineHeight:1.8, marginBottom:20 }}>
          SSLVault is a Certificate Lifecycle Management platform built for indie developers,
          SMBs, and non-profits. Issue trusted DV certificates via GoGetSSL, monitor your full
          certificate estate, and automate renewal and deployment — all from one dashboard.
        </p>

        <p style={{ fontSize:16, color:'#475569', lineHeight:1.8, marginBottom:20 }}>
          Built by a PKI specialist with first-hand CA experience, SSLVault gives everyone access
          to enterprise-grade CLM. Every certificate is a trusted RapidSSL DV certificate backed
          by the DigiCert trust chain, issued via GoGetSSL API. Browser compatibility is 99.9%.
        </p>

        <p style={{ fontSize:16, color:'#475569', lineHeight:1.8, marginBottom:40 }}>
          SSLVault is free forever for indie developers, SMBs, and non-profits.
          No credit card required. Built with React, Supabase, and Vercel.
          Made with ♥ in the Netherlands.
        </p>

        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => nav('/auth')}
            style={{ padding:'12px 24px', background:'#0a0a0a', color:'white',
              border:'none', borderRadius:8, fontSize:14, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
            Get started free →
          </button>
          <button onClick={() => nav('/')}
            style={{ padding:'12px 24px', background:'white', color:'#0a0e1a',
              border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, fontWeight:500,
              cursor:'pointer', fontFamily:'inherit' }}>
            ← Back home
          </button>
        </div>
      </div>
    </div>
  )
}
