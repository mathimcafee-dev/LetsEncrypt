// About.jsx — SSLVault company page
const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const C    = { ink:'#0a0e1a', teal:'#0ea5e9', tealDk:'#0284c7', green:'#10b981', border:'rgba(255,255,255,0.07)', text:'rgba(255,255,255,0.85)', textMid:'rgba(255,255,255,0.5)', textLt:'rgba(255,255,255,0.28)' }

export default function About({ nav }) {
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

        {/* Eyebrow */}
        <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>About SSLVault</div>

        <h1 style={{ fontSize:'clamp(32px,5vw,52px)', fontWeight:800, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:24, color:'rgba(255,255,255,0.95)' }}>
          Enterprise PKI for every<br/>organisation.
        </h1>

        <p style={{ fontSize:17, color:C.textMid, lineHeight:1.85, maxWidth:600, marginBottom:64 }}>
          SSLVault is a Certificate Lifecycle Management platform built for developers, SMBs, and non-profits.
          Issue, monitor, and auto-renew SSL/TLS certificates across every CA and every server — with enterprise-grade
          security controls built in from day one.
        </p>

        {/* Mission block */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:12, marginBottom:64 }}>
          {[
            { n:'01', title:'Built by PKI specialists', body:'Designed by a Certified PKI Specialist with first-hand Certificate Authority experience. The same tooling enterprise teams pay hundreds of thousands for — available to every organisation.' },
            { n:'02', title:'Open standards throughout', body:'RFC 8555 ACME v2, AES-256-GCM envelope encryption, CT log monitoring, CAA record checking. No proprietary black boxes — every layer is auditable and standards-compliant.' },
            { n:'03', title:'CA/B Forum ready', body:'As certificate validity mandates tighten (200d → 100d → 47d between 2026–2029), SSLVault\'s automation layer is the only sustainable answer. We\'re built for what\'s coming.' },
          ].map(item=>(
            <div key={item.n} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderTop:`2px solid ${C.teal}`, borderRadius:10, padding:'22px 20px' }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.teal, fontFamily:MONO, letterSpacing:'0.06em', marginBottom:10 }}>{item.n}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.9)', marginBottom:8 }}>{item.title}</div>
              <div style={{ fontSize:13, color:C.textMid, lineHeight:1.7 }}>{item.body}</div>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:48, marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textLt, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:20 }}>Technology</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {['RapidSSL CA Partner','DigiCert Trust Chain','ACME v2 · RFC 8555','AES-256-GCM','React + Vite','Supabase Edge Functions','Vercel CDN','CA/B Forum Compliant'].map(t=>(
              <span key={t} style={{ fontSize:12, fontWeight:600, color:C.teal, background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.18)', borderRadius:6, padding:'5px 12px', fontFamily:MONO }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background:'rgba(14,165,233,0.06)', border:'1px solid rgba(14,165,233,0.15)', borderRadius:12, padding:'32px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.92)', marginBottom:6 }}>Ready to automate your certificate lifecycle?</div>
            <div style={{ fontSize:13, color:C.textMid }}>Issue, monitor and auto-renew across every server with enterprise-grade PKI controls.</div>
          </div>
          <button onClick={()=>nav('/auth')}
            style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'white', padding:'10px 24px', borderRadius:100, whiteSpace:'nowrap' }}>
            Get started →
          </button>
        </div>

        {/* Footer row */}
        <div style={{ marginTop:48, paddingTop:24, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['← Back home','/'],['Pricing','/pricing'],['Knowledge Base','/knowledge-base'],['Developer','/developer']].map(([l,p])=>(
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
