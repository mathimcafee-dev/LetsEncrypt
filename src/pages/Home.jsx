import { Shield, Lock, Bell, Download, RefreshCw, ArrowRight, CheckCircle, Zap, Globe, Clock, TrendingUp, AlertTriangle, Award, BarChart2, FileText, Settings, Search, Filter } from 'lucide-react'

export default function Home({ nav }) {
  const capabilities = [
    { icon:Zap, title:'Automated Issuance', desc:'DNS-01 validation with auto-record injection. Certificate issued in under 60 seconds with zero manual steps.', color:'#2563eb', tag:'CORE' },
    { icon:Shield, title:'Wildcard Coverage', desc:'Single certificate secures all subdomains. *.domain.com — one issuance covers www, api, mail, app and more.', color:'#7c3aed', tag:'COVERAGE' },
    { icon:Bell, title:'Expiry Intelligence', desc:'Continuous monitoring with threshold-based alerts at 30, 14 and 7 days. Never face an unexpected certificate outage.', color:'#d97706', tag:'MONITORING' },
    { icon:Download, title:'Universal Compatibility', desc:'Export as PEM, DER, PKCS#12. Full chain, leaf cert and private key. Compatible with Nginx, Apache, Caddy, IIS, Node.js.', color:'#16a34a', tag:'DEPLOYMENT' },
    { icon:Lock, title:'Secure Vault', desc:'Private keys encrypted at rest. AES-256-GCM storage with row-level security. Only you can access your certificates.', color:'#dc2626', tag:'SECURITY' },
    { icon:RefreshCw, title:'One-Click Renewal', desc:'Renew expiring certificates with a single click. Same domain, fresh 90-day validity, no re-verification required.', color:'#0891b2', tag:'LIFECYCLE' },
  ]

  const lifecycle = [
    { phase:'Request', icon:'01', desc:'Submit domain, select coverage type, configure DNS provider credentials.', color:'#2563eb' },
    { phase:'Validate', icon:'02', desc:'ACME DNS-01 challenge. TXT record injected automatically or manually added.', color:'#7c3aed' },
    { phase:'Issue', icon:'03', desc:'Let\u2019s Encrypt CA signs the certificate. 90-day validity, RSA 2048-bit key.', color:'#16a34a' },
    { phase:'Deploy', icon:'04', desc:'Download all formats or auto-install via agent on VPS or cPanel hosting.', color:'#d97706' },
    { phase:'Monitor', icon:'05', desc:'Continuous expiry tracking. Alerts at 30/14/7 days. Full audit history.', color:'#0891b2' },
  ]

  const stats = [
    { value:'90', unit:'days', label:'Certificate Validity' },
    { value:'100%', unit:'', label:'Free Forever' },
    { value:'<60s', unit:'', label:'Issuance Time' },
    { value:'RSA', unit:'2048', label:'Key Strength' },
  ]

  const trust = [
    { name:"Let's Encrypt", role:'Certificate Authority', logo:'\ud83d\udd10' },
    { name:'ACME Protocol', role:'RFC 8555 Compliant', logo:'\ud83d\udcdc' },
    { name:'DNS-01 Challenge', role:'Domain Validation', logo:'\ud83c\udf10' },
    { name:'AES-256-GCM', role:'Data Encryption', logo:'\ud83d\udd12' },
  ]

  return (
    <div style={{ background:'#f8fafc', fontFamily:'Plus Jakarta Sans, sans-serif' }}>

      {/* Top announcement bar */}
      <div style={{ background:'linear-gradient(90deg,#1e3a8a,#2563eb)', padding:'10px 0', textAlign:'center' }}>
        <div className="container">
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.9)', fontWeight:500, letterSpacing:'0.3px' }}>
            \ud83d\udd12 Enterprise-grade Certificate Lifecycle Management \u00b7 Powered by Let\u2019s Encrypt \u00b7 100% Free
          </span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'80px 0 72px' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:72, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:28, fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'1px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#2563eb', display:'inline-block', animation:'pulse 2s infinite' }} />
                Certificate Lifecycle Management Platform
              </div>
              <h1 style={{ fontSize:'clamp(38px,4.5vw,62px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', marginBottom:24, color:'#0f172a' }}>
                Automate Your SSL<br /><span style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Certificate Lifecycle</span>
              </h1>
              <p style={{ fontSize:17, color:'#475569', maxWidth:520, lineHeight:1.75, marginBottom:40 }}>
                SSLVault gives security teams complete visibility and control over the entire certificate lifecycle\u2014from issuance to expiry monitoring, deployment automation and compliance tracking.
              </p>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:44 }}>
                <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:9, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', border:'none', padding:'14px 28px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(37,99,235,0.35)' }}>
                  <Shield size={17} /> Issue Certificate
                </button>
                <button onClick={() => nav('/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:9, background:'white', color:'#0f172a', border:'1px solid #e2e8f0', padding:'14px 28px', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                  <BarChart2 size={17} /> View Inventory
                </button>
              </div>
              <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
                {['RFC 8555 ACME Protocol','DNS-01 Domain Validation','Wildcard Certificate Support','AES-256 Private Key Storage'].map(t => (
                  <div key={t} style={{ display:'flex', alignItems:'center', gap:7, color:'#64748b', fontSize:13, fontWeight:500 }}>
                    <CheckCircle size={14} color='#16a34a' strokeWidth={2.5} /> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Live CLM Dashboard preview */}
            <div style={{ background:'#0f172a', borderRadius:16, overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', border:'1px solid #1e293b' }}>
              {/* Window chrome */}
              <div style={{ background:'#1e293b', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #334155' }}>
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:11, height:11, borderRadius:'50%', background:'#ef4444' }} />
                  <div style={{ width:11, height:11, borderRadius:'50%', background:'#f59e0b' }} />
                  <div style={{ width:11, height:11, borderRadius:'50%', background:'#10b981' }} />
                </div>
                <div style={{ flex:1, background:'#334155', borderRadius:5, padding:'4px 10px', fontSize:10, color:'#64748b', fontFamily:'monospace' }}>SSLVault \u2014 Certificate Inventory</div>
              </div>
              {/* Dashboard content */}
              <div style={{ padding:'16px' }}>
                {/* Stats row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                  {[['12','Total',''],[' 9','Active','#10b981'],['2','Expiring','#f59e0b'],['1','Expired','#ef4444']].map(([v,l,c]) => (
                    <div key={l} style={{ background:'#1e293b', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:20, fontWeight:800, color:c||'#f8fafc', lineHeight:1 }}>{v}</div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:3, fontWeight:600 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {/* Alert */}
                <div style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:7, padding:'8px 12px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={12} color='#f59e0b' />
                  <span style={{ fontSize:11, color:'#fbbf24', fontWeight:600 }}>2 certificates expiring within 14 days</span>
                </div>
                {/* Cert rows */}
                {[
                  ['easysecurity.in','Active',86,'#10b981'],
                  ['freecerts.site','Active',62,'#10b981'],
                  ['api.example.com','Expiring',11,'#f59e0b'],
                  ['*.myapp.io','Active',45,'#10b981'],
                ].map(([d,s,days,c]) => (
                  <div key={d} style={{ background:'#1e293b', borderRadius:7, padding:'10px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'#cbd5e1', fontFamily:'monospace', flex:1 }}>{d}</span>
                    <span style={{ fontSize:10, color:c, fontWeight:700, background:`${c}20`, borderRadius:4, padding:'2px 7px' }}>{s}</span>
                    <span style={{ fontSize:10, color:'#475569', fontWeight:500 }}>{days}d</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'24px 0' }}>
        <div className="container">
          <div style={{ display:'flex', alignItems:'center', gap:0, justifyContent:'space-around', flexWrap:'wrap' }}>
            {trust.map((t,i) => (
              <div key={t.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderRight:i<trust.length-1?'1px solid #e2e8f0':'none', flexShrink:0 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'white', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{t.logo}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background:'linear-gradient(135deg,#1e3a8a,#2563eb,#7c3aed)', padding:'48px 0' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
            {stats.map((s,i) => (
              <div key={s.label} style={{ textAlign:'center', padding:'0 32px', borderRight:i<3?'1px solid rgba(255,255,255,0.15)':'' }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4 }}>
                  <span style={{ fontSize:40, fontWeight:800, color:'white', lineHeight:1 }}>{s.value}</span>
                  {s.unit && <span style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.6)' }}>{s.unit}</span>}
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:500, marginTop:6, textTransform:'uppercase', letterSpacing:'0.8px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificate Lifecycle */}
      <section style={{ padding:'88px 0', background:'white' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-block', background:'#eff6ff', color:'#1d4ed8', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:16, border:'1px solid #bfdbfe', textTransform:'uppercase', letterSpacing:'1px' }}>CERTIFICATE LIFECYCLE</div>
            <h2 style={{ fontSize:'clamp(28px,3.5vw,44px)', fontWeight:800, letterSpacing:'-1.5px', marginBottom:14, color:'#0f172a' }}>End-to-End Lifecycle Automation</h2>
            <p style={{ color:'#475569', fontSize:16, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>From domain validation to deployment and renewal\u2014every phase of the certificate lifecycle managed in one platform.</p>
          </div>
          <div style={{ display:'flex', gap:0, position:'relative', overflowX:'auto' }}>
            <div style={{ position:'absolute', top:36, left:80, right:80, height:2, background:'linear-gradient(90deg,#2563eb,#7c3aed,#0891b2)', zIndex:0, opacity:0.3 }} />
            {lifecycle.map((l,i) => (
              <div key={l.phase} style={{ flex:1, textAlign:'center', padding:'0 12px', position:'relative', zIndex:1, minWidth:140 }}>
                <div style={{ width:72, height:72, borderRadius:16, background:`${l.color}12`, border:`2px solid ${l.color}30`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22, fontWeight:800, color:l.color }}>{l.icon}</div>
                <div style={{ fontSize:11, fontWeight:800, color:l.color, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{l.phase}</div>
                <p style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section style={{ padding:'0 0 88px', background:'#f8fafc' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'#eff6ff', color:'#1d4ed8', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:16, border:'1px solid #bfdbfe', textTransform:'uppercase', letterSpacing:'1px' }}>PLATFORM CAPABILITIES</div>
            <h2 style={{ fontSize:'clamp(28px,3.5vw,44px)', fontWeight:800, letterSpacing:'-1.5px', marginBottom:14, color:'#0f172a' }}>Built for Security Teams</h2>
            <p style={{ color:'#475569', fontSize:16, maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>Every feature designed around the operational needs of PKI and certificate management teams.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {capabilities.map(({ icon:Icon, title, desc, color, tag }) => (
              <div key={title} style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:28, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', gap:14, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, right:0, background:`${color}10`, borderRadius:'0 14px 0 14px', padding:'4px 10px' }}>
                  <span style={{ fontSize:9, fontWeight:800, color:color, letterSpacing:'1px' }}>{tag}</span>
                </div>
                <div style={{ width:48, height:48, borderRadius:12, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={22} color={color} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontWeight:700, fontSize:16, marginBottom:8, color:'#0f172a' }}>{title}</h3>
                  <p style={{ color:'#475569', fontSize:13, lineHeight:1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & Risk */}
      <section style={{ padding:'88px 0', background:'white' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
            <div>
              <div style={{ display:'inline-block', background:'#eff6ff', color:'#1d4ed8', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:20, border:'1px solid #bfdbfe', textTransform:'uppercase', letterSpacing:'1px' }}>RISK & COMPLIANCE</div>
              <h2 style={{ fontSize:'clamp(26px,3vw,38px)', fontWeight:800, letterSpacing:'-1px', marginBottom:16, color:'#0f172a' }}>Certificate Risk Visibility in Real Time</h2>
              <p style={{ color:'#475569', fontSize:15, lineHeight:1.75, marginBottom:32 }}>Prevent certificate-related outages before they happen. SSLVault continuously monitors your inventory and surfaces risk signals so your team can act proactively.</p>
              {[
                ['\ud83d\udd14', 'Expiry Alerts', '30/14/7-day threshold notifications for every managed certificate.'],
                ['\ud83d\udcca', 'Lifecycle Dashboard', 'Complete inventory with status, days-remaining and issuer details.'],
                ['\ud83d\udd12', 'Private Key Security', 'Keys encrypted with AES-256-GCM. Never exposed in transit.'],
                ['\ud83d\udd04', 'Renewal Automation', 'One-click renewal flow. No re-validation for the same domain.'],
              ].map(([icon,title,desc]) => (
                <div key={title} style={{ display:'flex', gap:14, marginBottom:20 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#eff6ff', border:'1px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:3 }}>{title}</div>
                    <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:'#0f172a', borderRadius:16, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px' }}>Risk Overview</span>
                <span style={{ fontSize:10, color:'#10b981', background:'rgba(16,185,129,0.1)', borderRadius:4, padding:'3px 8px', fontWeight:600 }}>LIVE</span>
              </div>
              {[
                { label:'Certificates Monitored', value:'12', color:'#60a5fa' },
                { label:'Active (Healthy)', value:'9', color:'#34d399' },
                { label:'Expiring \u003C 14 days', value:'2', color:'#fbbf24' },
                { label:'Expired', value:'1', color:'#f87171' },
                { label:'Avg. Days to Expiry', value:'54d', color:'#a78bfa' },
                { label:'Wildcard Certificates', value:'3', color:'#38bdf8' },
              ].map(({label,value,color}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #1e293b' }}>
                  <span style={{ fontSize:12, color:'#94a3b8', fontWeight:500 }}>{label}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:color, fontFamily:'monospace' }}>{value}</span>
                </div>
              ))}
              <button onClick={() => nav('/dashboard')} style={{ width:'100%', marginTop:20, background:'#2563eb', color:'white', border:'none', padding:'11px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Open Certificate Inventory \u2192</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'0 0 88px', background:'#f8fafc' }}>
        <div className="container">
          <div style={{ background:'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#7c3aed 100%)', borderRadius:20, padding:'68px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, background:'rgba(255,255,255,0.04)', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:-60, left:-60, width:250, height:250, background:'rgba(255,255,255,0.04)', borderRadius:'50%' }} />
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'inline-block', background:'rgba(255,255,255,0.15)', color:'white', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:100, marginBottom:20, border:'1px solid rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'1px' }}>START IN 60 SECONDS</div>
              <h2 style={{ fontSize:'clamp(28px,3.5vw,44px)', fontWeight:800, letterSpacing:'-1.5px', marginBottom:16, color:'white' }}>Start Managing Certificates Today</h2>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:16, maxWidth:480, margin:'0 auto 40px', lineHeight:1.7 }}>Free forever. No credit card. Trusted CA. Get your first SSL certificate issued and monitored in under 60 seconds.</p>
              <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#1d4ed8', border:'none', padding:'14px 30px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
                  <Shield size={17} /> Issue Your First Certificate
                </button>
                <button onClick={() => nav('/auth')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.25)', padding:'14px 30px', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                  Create Free Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'#0f172a', padding:'40px 0' }}>
        <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={16} color='white' />
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white' }}>SSL<span style={{ color:'#60a5fa' }}>Vault</span></div>
              <div style={{ fontSize:11, color:'#475569', marginTop:1 }}>Certificate Lifecycle Management</div>
            </div>
          </div>
          <p style={{ fontSize:12, color:'#475569' }}>Free SSL certificates powered by Let\u2019s Encrypt \u00b7 AES-256 encryption \u00b7 RFC 8555 ACME</p>
          <div style={{ display:'flex', gap:24 }}>
            {[['Inventory','/dashboard'],['Issue Cert','/generate'],['Monitor','/monitor'],['Install','/install']].map(([l,p]) => (
              <span key={l} onClick={() => nav(p)} style={{ fontSize:13, color:'#475569', cursor:'pointer', fontWeight:500, transition:'color 0.15s' }}
                onMouseEnter={e => e.target.style.color='#94a3b8'}
                onMouseLeave={e => e.target.style.color='#475569'}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}