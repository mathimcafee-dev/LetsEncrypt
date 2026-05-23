// Developer.jsx — SSLVault developer / builder page
import portrait from '../assets/mathi-portrait.jpg'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const C    = { ink:'#0F5750', teal:'#3DBFB0', tealDk:'#1A7A72', green:'#3DBFB0', purple:'#E8897A', border:'rgba(255,255,255,0.07)', text:'rgba(255,255,255,0.85)', textMid:'rgba(255,255,255,0.5)', textLt:'rgba(255,255,255,0.28)' }

export default function Developer({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:C.ink, fontFamily:F, color:C.text }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <header style={{ borderBottom:`1px solid ${C.border}`, padding:'0 clamp(20px,5vw,48px)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={()=>nav('/')}>
          <div style={{ width:28, height:28, background:C.teal, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.92)' }}>SSLVault</span>
        </div>
        <button onClick={()=>nav('/auth')}
          style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'white', padding:'7px 20px', borderRadius:100 }}>
          Get started
        </button>
      </header>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'72px clamp(20px,5vw,48px) 100px' }}>

        <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>The builder</div>

        {/* Profile */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:24, marginBottom:48, flexWrap:'wrap' }}>
          <img src={portrait} alt="Mathi" style={{ width:80, height:80, borderRadius:12, objectFit:'cover', border:`2px solid rgba(14,165,233,0.3)`, flexShrink:0 }}/>
          <div>
            <h1 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, letterSpacing:'-1px', lineHeight:1.15, marginBottom:8, color:'rgba(255,255,255,0.95)' }}>
              Mathi (Spartan)
            </h1>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {['Certified PKI Specialist','PKI Industry Professional','Netherlands 🇳🇱'].map(t=>(
                <span key={t} style={{ fontSize:11, fontWeight:600, color:C.teal, background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.18)', borderRadius:6, padding:'3px 10px', fontFamily:MONO }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize:15, color:C.textMid, lineHeight:1.8, maxWidth:520 }}>
              MSc from Kongu Engineering College. Working in the PKI industry with deep expertise in certificate lifecycle management, CA/B Forum standards, and automation.
            </p>
          </div>
        </div>

        {/* Why section */}
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>Why SSLVault exists</div>
          <p style={{ fontSize:16, color:C.textMid, lineHeight:1.85, marginBottom:16, maxWidth:640 }}>
            Working as a PKI specialist, I saw the same problem everywhere — certificate management was either expensive enterprise tooling (Venafi at $250k+/yr), or completely manual. Nothing in between.
          </p>
          <p style={{ fontSize:16, color:C.textMid, lineHeight:1.85, maxWidth:640 }}>
            SSLVault is the platform I wished existed: enterprise-grade CLM without the enterprise price tag. Built on open standards (RFC 8555, AES-256-GCM), CA/B Forum compliant, and designed for the CA/B mandate changes coming in 2026–2029.
          </p>
        </div>

        {/* Expertise cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:10, marginBottom:48 }}>
          {[
            { spec:'PKI / X.509', color:C.teal,   desc:'Certificate lifecycle, CA/B Forum standards, DCV methods, trust chain architecture' },
            { spec:'RapidSSL / PKI', color:C.green,  desc:'Deep knowledge of certificate products, CA issuance pipelines, and PKI operations' },
            { spec:'ACME · RFC 8555', color:C.purple, desc:'Protocol implementation, DNS-01 challenge automation, certificate transparency' },
            { spec:'Security automation', color:C.teal,   desc:'AES-256-GCM, key vault design, audit logging, zero-trust certificate deployment' },
          ].map(e=>(
            <div key={e.spec} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderLeft:`3px solid ${e.color}`, borderRadius:8, padding:'16px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:e.color, fontFamily:MONO, marginBottom:6 }}>{e.spec}</div>
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.65 }}>{e.desc}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:10, padding:'24px 24px', marginBottom:48, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.9)', marginBottom:4 }}>Get in touch</div>
            <div style={{ fontSize:13, color:C.textMid }}>Feedback, enterprise enquiries, or PKI questions — always open.</div>
          </div>
          <a href="mailto:mathimcafee@gmail.com"
            style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'white', padding:'9px 22px', borderRadius:100, textDecoration:'none', whiteSpace:'nowrap' }}>
            Email Mathi →
          </a>
        </div>

        {/* Footer row */}
        <div style={{ marginTop:16, paddingTop:24, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['← Back home','/'],['About SSLVault','/about'],['Pricing','/pricing'],['Knowledge Base','/knowledge-base']].map(([l,p])=>(
            <button key={l} onClick={()=>nav(p)}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, color:C.textMid, padding:0, transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.8)'}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMid}>
              {l}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
