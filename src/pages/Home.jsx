import { Shield, Lock, Bell, Download, RefreshCw, ArrowRight, CheckCircle, Zap, Globe, Clock, ChevronRight } from 'lucide-react'

export default function Home({ nav }) {
  const features = [
    { icon:Zap, title:'Instant Generation', desc:'Free 90-day SSL from Lets Encrypt via DNS-01 validation. Auto-adds the TXT record.', color:'#2563eb' },
    { icon:Shield, title:'Wildcard Support', desc:'One certificate covers all subdomains — *.example.com protects everything at once.', color:'#7c3aed' },
    { icon:Bell, title:'Expiry Monitoring', desc:'Track all certificates. Get alerts before expiry. Never miss a renewal again.', color:'#d97706' },
    { icon:Download, title:'All Formats', desc:'Download as PEM, private key, and full chain — compatible with every server.', color:'#16a34a' },
    { icon:Lock, title:'Secure Storage', desc:'Certificates encrypted in your account. Private keys stay private.', color:'#dc2626' },
    { icon:RefreshCw, title:'Easy Renewal', desc:'Renew expiring certs in one click. Same domain, new 90-day certificate.', color:'#0891b2' },
  ]

  const steps = [
    { num:1, title:'Enter Domain', desc:'Type your domain and agree to Lets Encrypt terms.', icon:'🌐' },
    { num:2, title:'DNS Auto-Added', desc:'TXT record is added automatically to your Vercel DNS.', icon:'⚡' },
    { num:3, title:'Certificate Issued', desc:'Lets Encrypt validates and signs your certificate.', icon:'🔐' },
    { num:4, title:'Download & Monitor', desc:'Get all files and track expiry from your dashboard.', icon:'📊' },
  ]

  return (
    <div style={{ background:'var(--bg)' }}>
      {/* Hero */}
      <section style={{ padding:'80px 0 70px', background:'white', borderBottom:'1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:100, padding:'5px 14px', marginBottom:24, fontSize:12, fontWeight:700, color:'var(--accent)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block', animation:'pulse 2s infinite' }} />
                Powered by Lets Encrypt · 100% Free
              </div>
              <h1 style={{ fontSize:'clamp(36px,4vw,58px)', fontWeight:800, lineHeight:1.08, letterSpacing:'-1.5px', marginBottom:20, color:'var(--text)' }}>
                Free SSL Certificates<br />
                <span style={{ color:'var(--accent)' }}>for Every Domain.</span>
              </h1>
              <p style={{ fontSize:17, color:'var(--text2)', maxWidth:460, lineHeight:1.7, marginBottom:36 }}>
                Generate, manage and monitor free 90-day SSL certificates. DNS validation with wildcard support. Expiry alerts. Zero cost, forever.
              </p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:36 }}>
                <button onClick={() => nav('/generate')} className="btn btn-primary btn-lg">
                  Generate Free SSL <ArrowRight size={16} />
                </button>
                <button onClick={() => nav('/dashboard')} className="btn btn-secondary btn-lg">
                  View Dashboard
                </button>
              </div>
              <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                {['90-day validity','Wildcard *.domain.com','Auto DNS record','Free forever'].map(t => (
                  <div key={t} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text3)', fontSize:13, fontWeight:500 }}>
                    <CheckCircle size={13} color="var(--green)" strokeWidth={2.5} /> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate preview card */}
            <div>
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:24, boxShadow:'var(--shadow-lg)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Shield size={20} color="var(--accent)" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>SSL Certificate</div>
                    <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>Lets Encrypt Authority X3</div>
                  </div>
                  <span className="badge badge-green" style={{ marginLeft:'auto' }}>● Active</span>
                </div>

                {[['Domain','easysecurity.in'],['Issuer',"Let's Encrypt"],['Valid From','May 07, 2026'],['Valid Until','Aug 05, 2026'],['Key','RSA 2048-bit']].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border2)', fontSize:13 }}>
                    <span style={{ color:'var(--text3)', fontWeight:500 }}>{k}</span>
                    <span style={{ color:'var(--text)', fontWeight:600, fontFamily:k==='Domain'?'var(--mono)':'inherit', fontSize:k==='Domain'?12:13 }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop:16, marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:8 }}>
                    <span style={{ fontWeight:500 }}>Certificate validity</span>
                    <span style={{ color:'var(--green)', fontWeight:700 }}>90 days remaining</span>
                  </div>
                  <div style={{ height:6, background:'var(--bg2)', borderRadius:3 }}>
                    <div style={{ height:'100%', width:'100%', background:'linear-gradient(90deg, var(--green), #22c55e)', borderRadius:3 }} />
                  </div>
                </div>

                <button onClick={() => nav('/generate')} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                  Generate Your Free Certificate →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background:'var(--accent)', padding:'24px 0' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, textAlign:'center' }}>
            {[['90','Day Validity'],['100%','Free Forever'],['< 60s','To Issue'],['∞','Certificates']].map(([v,l],i) => (
              <div key={l} style={{ padding:'0 20px', borderRight:i<3?'1px solid rgba(255,255,255,0.2)':'' }}>
                <div style={{ fontSize:28, fontWeight:800, color:'white', lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:500, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'80px 0', background:'white' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'var(--accent-light)', color:'var(--accent)', fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:16, border:'1px solid var(--accent-border)' }}>HOW IT WORKS</div>
            <h2 style={{ fontSize:'clamp(26px,3.5vw,40px)', fontWeight:800, letterSpacing:'-1px', marginBottom:12, color:'var(--text)' }}>SSL Certificate in 4 Steps</h2>
            <p style={{ color:'var(--text2)', fontSize:16, maxWidth:420, margin:'0 auto' }}>No technical expertise required. From zero to secured in under 60 seconds.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, position:'relative' }}>
            <div style={{ position:'absolute', top:32, left:'12.5%', right:'12.5%', height:1, background:'linear-gradient(90deg, var(--border), var(--accent-border), var(--border))', zIndex:0 }} />
            {steps.map((s,i) => (
              <div key={i} style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, textAlign:'center', position:'relative', zIndex:1, boxShadow:'var(--shadow)' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 4px 14px rgba(37,99,235,0.3)', fontSize:22 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Step {s.num}</div>
                <h3 style={{ fontWeight:700, fontSize:15, marginBottom:8, color:'var(--text)' }}>{s.title}</h3>
                <p style={{ color:'var(--text2)', fontSize:13, lineHeight:1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'0 0 80px', background:'var(--bg)' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'var(--accent-light)', color:'var(--accent)', fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:16, border:'1px solid var(--accent-border)' }}>FEATURES</div>
            <h2 style={{ fontSize:'clamp(26px,3.5vw,40px)', fontWeight:800, letterSpacing:'-1px', marginBottom:12, color:'var(--text)' }}>Everything You Need</h2>
            <p style={{ color:'var(--text2)', fontSize:16, maxWidth:420, margin:'0 auto' }}>Complete SSL lifecycle management from generation to monitoring.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {features.map(({ icon:Icon, title, desc, color }) => (
              <div key={title} style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', display:'flex', gap:16 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={20} color={color} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontWeight:700, fontSize:15, marginBottom:6, color:'var(--text)' }}>{title}</h3>
                  <p style={{ color:'var(--text2)', fontSize:13, lineHeight:1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'0 0 80px', background:'var(--bg)' }}>
        <div className="container">
          <div style={{ background:'linear-gradient(135deg, #1e40af, #2563eb)', borderRadius:20, padding:'60px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:-40, left:-40, width:200, height:200, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />
            <h2 style={{ fontSize:'clamp(26px,3.5vw,40px)', fontWeight:800, letterSpacing:'-1px', marginBottom:16, color:'white' }}>
              Secure Your Domain Today
            </h2>
            <p style={{ color:'rgba(255,255,255,0.8)', fontSize:16, maxWidth:440, margin:'0 auto 36px', lineHeight:1.7 }}>
              Free forever. No credit card. Trusted by Lets Encrypt. Get your SSL certificate in under 60 seconds.
            </p>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'13px 28px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 14px rgba(0,0,0,0.2)' }}>
                <Shield size={17} /> Generate Free SSL
              </button>
              <button onClick={() => nav('/auth')} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'13px 28px', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'white', borderTop:'1px solid var(--border)', padding:'32px 0' }}>
        <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:'var(--accent)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={14} color="white" />
            </div>
            <span style={{ fontWeight:800, fontSize:15, color:'var(--text)' }}>SSL<span style={{ color:'var(--accent)' }}>Vault</span></span>
          </div>
          <p style={{ fontSize:13, color:'var(--text3)' }}>Free SSL certificates powered by Lets Encrypt. Built with ❤️</p>
          <div style={{ display:'flex', gap:20 }}>
            {[['Generate','/generate'],['Dashboard','/dashboard'],['Monitor','/monitor']].map(([l,p]) => (
              <span key={l} onClick={() => window.location.href=p} style={{ fontSize:13, color:'var(--text3)', cursor:'pointer', fontWeight:500 }}
                onMouseEnter={e=>e.target.style.color='var(--accent)'}
                onMouseLeave={e=>e.target.style.color='var(--text3)'}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
