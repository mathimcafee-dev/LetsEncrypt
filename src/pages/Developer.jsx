// Developer.jsx — SSLVault builder page
import portrait from '../assets/mathi-portrait.jpg'

const F    = "'Inter',system-ui,sans-serif"
const MONO = "'SF Mono','Menlo','Consolas',monospace"
const BG   = '#f4f1ec'
const BG2  = '#f4f1ec'
const BG3  = '#ffffff'
const T1   = '#111111'
const T2   = '#444444'
const T3   = '#888888'
const LN   = 'rgba(0,0,0,0.08)'
const LN2  = 'rgba(31,92,78,0.25)'
const RED  = '#1f5c4e'
const GRN  = '#16a068'
const AMB  = '#9a6400'
const PRP  = '#a78bfa'

export default function Developer({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:`#f7f5f0`, fontFamily:F, color:T1 }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <header style={{ background:'#ffffff', borderBottom:`1px solid ${LN}`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(20px,5vw,48px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:22, height:22, background:RED, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'#111111' }}>SSLVault</span>
          <span style={{ fontSize:11, color:'#888888', fontFamily:MONO }}> / Developer</span>
        </div>
        <button onClick={() => nav('/auth')} style={{ background:RED, border:'none', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:'#fff', padding:'7px 16px', borderRadius:5 }}>
          Get started
        </button>
      </header>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'64px clamp(20px,5vw,48px) 100px' }}>

        {/* Eyebrow */}
        <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>The builder</div>

        {/* Profile */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:28, marginBottom:56, flexWrap:'wrap' }}>
          <img src={portrait} alt="Mathi" style={{ width:90, height:90, borderRadius:10, objectFit:'cover', border:`2px solid ${LN2}`, flexShrink:0 }}/>
          <div>
            <h1 style={{ fontSize:'clamp(26px,4vw,42px)', fontWeight:700, letterSpacing:'-1.2px', lineHeight:1.1, marginBottom:12, color:T1 }}>
              Mathi (Spartan)
            </h1>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {[['Certified PKI Specialist', GRN],['PKI Industry Professional', AMB],['Netherlands 🇳🇱', PRP]].map(([t, c]) => (
                <span key={t} style={{ fontSize:11, fontWeight:500, color:c, background:`${c}18`, border:`1px solid ${c}40`, borderRadius:4, padding:'3px 10px', fontFamily:MONO }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize:14, color:T2, lineHeight:1.85, maxWidth:520 }}>
              MSc from Kongu Engineering College. Deep expertise in certificate lifecycle management, CA/B Forum standards, DCV methods, and PKI automation. Based in the Netherlands.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:LN, marginBottom:48 }}/>

        {/* Why it exists */}
        <div style={{ marginBottom:52 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Why SSLVault exists</div>
          <p style={{ fontSize:15, color:T2, lineHeight:1.85, marginBottom:16, maxWidth:660 }}>
            Working as a PKI specialist, I saw the same problem everywhere — certificate management was either expensive enterprise tooling (Venafi at $250k+/yr), or completely manual. Nothing in between.
          </p>
          <p style={{ fontSize:15, color:T2, lineHeight:1.85, maxWidth:660 }}>
            SSLVault is the platform I wished existed: enterprise-grade CLM without the enterprise price tag. Built on open standards — RFC 8555, AES-256-GCM — CA/B Forum compliant, and designed for the 47-day mandate world coming in 2029.
          </p>
        </div>

        {/* Expertise */}
        <div style={{ marginBottom:52 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Areas of expertise</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:1, background:LN, border:`1px solid ${LN}`, borderRadius:6, overflow:'hidden' }}>
            {[
              { spec:'PKI / X.509',          color:GRN, desc:'Certificate lifecycle, CA/B Forum standards, DCV methods, trust chain architecture' },
              { spec:'RapidSSL / GoGetSSL',   color:AMB, desc:'CA issuance pipelines, order management, reissue flows, and PKI operations' },
              { spec:'ACME · RFC 8555',        color:PRP, desc:'DNS-01 challenge automation, certificate transparency, ACME v2 implementation' },
              { spec:'Security automation',    color:RED,  desc:'AES-256-GCM key vault design, audit logging, zero-touch certificate deployment' },
            ].map(e => (
              <div key={e.spec} style={{ background:BG3, padding:'18px 20px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:e.color, fontFamily:MONO, marginBottom:7 }}>{e.spec}</div>
                <div style={{ fontSize:12.5, color:T2, lineHeight:1.65 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What I built */}
        <div style={{ marginBottom:52 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>What SSLVault does</div>
          <div style={{ display:'flex', flexDirection:'column', gap:0, border:`1px solid ${LN}`, borderRadius:6, overflow:'hidden' }}>
            {[
              { n:'01', title:'Issue',   desc:'RapidSSL DV via GoGetSSL. DNS-01 auto-validated via Cloudflare, Vercel, Route53, and 5+ providers. Issued in under 5 minutes.' },
              { n:'02', title:'Install', desc:'VPS persistent agent deploys to Nginx/Apache automatically. cPanel auto-install via UAPI. Both paths cron-triggered every 2 minutes.' },
              { n:'03', title:'Monitor', desc:'TLS health score A+ to F. Expiry tracking, CT log monitoring, HSTS and CAA checks, CA/B Forum 47-day compliance scoring.' },
              { n:'04', title:'Renew',   desc:'Auto-renews 30 days before expiry. DCV re-validated, cert re-issued, deployed to server — zero manual steps, forever.' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display:'flex', gap:16, padding:'16px 20px', background:'#f4f1ec', borderBottom:i < arr.length - 1 ? `1px solid ${LN}` : 'none' }}>
                <span style={{ fontSize:10, color:'#888888', fontFamily:MONO, width:24, flexShrink:0, marginTop:2 }}>/ {s.n}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T1, marginBottom:4 }}>{s.title}</div>
                  <div style={{ fontSize:12.5, color:T2, lineHeight:1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background:BG3, border:`1px solid ${LN2}`, borderRadius:8, padding:'24px', marginBottom:48, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:T1, marginBottom:4 }}>Get in touch</div>
            <div style={{ fontSize:12.5, color:T2 }}>Feedback, enterprise enquiries, or PKI questions — always open.</div>
          </div>
          <a href="mailto:mathimcafee@gmail.com" style={{ background:RED, border:'none', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:'#fff', padding:'9px 22px', borderRadius:5, textDecoration:'none', whiteSpace:'nowrap' }}>
            Email Mathi →
          </a>
        </div>

        {/* Footer row */}
        <div style={{ paddingTop:24, borderTop:`1px solid ${LN}`, display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['← Home','/'],['About SSLVault','/about'],['Pricing','/pricing'],['Knowledge Base','/knowledge-base']].map(([l, p]) => (
            <button key={l} onClick={() => nav(p)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:12, color:T3, padding:0, transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = T1}
              onMouseLeave={e => e.currentTarget.style.color = T3}>{l}</button>
          ))}
        </div>

      </div>
    </div>
  )
}
