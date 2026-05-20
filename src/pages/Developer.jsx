export default function Developer({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', padding:'0 24px' }}>
      <div style={{ maxWidth:760, margin:'0 auto', paddingTop:80, paddingBottom:80 }}>

        <div style={{ display:'inline-block', background:'#eff6ff', border:'1px solid #bfdbfe',
          borderRadius:100, padding:'4px 16px', marginBottom:24 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#1d4ed8' }}>PKI Specialist · Netherlands</span>
        </div>

        <h1 style={{ fontSize:36, fontWeight:800, color:'#0a0e1a', marginBottom:20,
          letterSpacing:'-1px', lineHeight:1.1 }}>
          Developer
        </h1>

        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32,
          padding:'24px', background:'white', border:'1px solid #e2e8f0', borderRadius:12 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'#0d3c6e',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, fontWeight:800, color:'white', flexShrink:0 }}>M</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0a0e1a', marginBottom:4 }}>
              Mathi (Spartan)
            </div>
            <div style={{ fontSize:14, color:'#475569' }}>
              Certified PKI Specialist · Partner Account Manager at DigiCert · Netherlands
            </div>
          </div>
        </div>

        <p style={{ fontSize:16, color:'#475569', lineHeight:1.8, marginBottom:20 }}>
          SSLVault is built and maintained by Mathi — a Certified PKI Specialist and Partner
          Account Manager at DigiCert, based in the Netherlands. MSc from Kongu Engineering College.
        </p>

        <p style={{ fontSize:16, color:'#475569', lineHeight:1.8, marginBottom:20 }}>
          Working in the PKI industry with deep expertise in certificate lifecycle management,
          CA/B Forum standards, and automation. SSLVault is a passion project — giving back to
          the indie and SMB community with enterprise-grade PKI tooling, completely free.
        </p>

        <div style={{ display:'flex', gap:12, marginTop:40 }}>
          <button onClick={() => nav('/contact')}
            style={{ padding:'12px 24px', background:'#0a0a0a', color:'white',
              border:'none', borderRadius:8, fontSize:14, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
            Get in touch →
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
