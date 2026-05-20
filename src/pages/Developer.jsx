import '../styles/design-v2.css'

export default function Developer({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:800, padding:'60px 24px 80px' }}>
        <h1 style={{ fontSize:32, fontWeight:700, color:'var(--v2-text)', marginBottom:16, letterSpacing:'-0.5px' }}>
          Developer
        </h1>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:24 }}>
          SSLVault is built and maintained by Mathi (Spartan) — a Certified PKI Specialist and
          Partner Account Manager at DigiCert, based in the Netherlands.
        </p>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:24 }}>
          MSc from Kongu Engineering College. Working in the PKI industry with deep expertise in
          certificate lifecycle management, CA/B Forum standards, and automation.
        </p>
        <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.8, marginBottom:40 }}>
          SSLVault is a passion project — giving back to the indie and SMB community with
          enterprise-grade PKI tooling, completely free.
        </p>
        <button onClick={() => nav('/contact')}
          style={{ padding:'11px 24px', background:'#0a0a0a', color:'white',
            border:'none', borderRadius:8, fontSize:14, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit' }}>
          Get in touch →
        </button>
      </div>
    </div>
  )
}
