// About.jsx — SSLVault company page
import portrait from '../assets/mathi-portrait.jpg'

const F    = "'Inter',system-ui,sans-serif"
const MONO = "'SF Mono','Menlo','Consolas',monospace"
const BG   = '#f7f5f0'
const BG2  = '#1a0404'
const BG3  = '#220808'
const BG4  = '#2d0f0f'
const T1   = '#f0ede8'
const T2   = 'rgba(240,237,232,0.65)'
const T3   = 'rgba(240,237,232,0.35)'
const LN   = 'rgba(0,0,0,0.08)'
const LN2  = 'rgba(31,92,78,0.25)'
const RED  = '#1f5c4e'
const GRN  = '#4ade80'
const AMB  = '#fbbf24'
const PRP  = '#a78bfa'
const P    = 'clamp(20px,5vw,48px)'

function Stat({ val, label, sub, color }) {
  return (
    <div style={{ padding:'20px', background:BG3, border:`1px solid ${LN}`, borderTop:`3px solid ${color}`, borderRadius:6 }}>
      <div style={{ fontSize:26, fontWeight:700, color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:4 }}>{val}</div>
      <div style={{ fontSize:12, fontWeight:600, color:T1, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:11.5, color:T3 }}>{sub}</div>
    </div>
  )
}

export default function About({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:`#f7f5f0`, fontFamily:F, color:T1 }}>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <header style={{ background:'rgba(13,0,0,0.92)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${LN}`, height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:`0 ${P}`, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:22, height:22, background:RED, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:T1 }}>SSLVault</span>
          <span style={{ fontSize:11, color:T3, fontFamily:MONO }}> / About</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/pricing')} style={{ background:'none', border:`1px solid ${LN2}`, cursor:'pointer', fontFamily:F, fontSize:12, color:T2, padding:'6px 14px', borderRadius:5 }}>Pricing</button>
          <button onClick={() => nav('/auth')} style={{ background:RED, border:'none', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:'#fff', padding:'7px 16px', borderRadius:5 }}>Get started</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding:`clamp(64px,8vw,96px) ${P} clamp(48px,6vw,72px)`, borderBottom:`1px solid ${LN}` }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>About SSLVault</div>
          <h1 style={{ fontSize:'clamp(30px,5vw,54px)', fontWeight:700, letterSpacing:'-1.5px', lineHeight:1.08, color:T1, marginBottom:20, maxWidth:640 }}>
            Enterprise certificate lifecycle management. Built by a PKI engineer, for everyone.
          </h1>
          <p style={{ fontSize:15, color:T2, lineHeight:1.85, maxWidth:580, marginBottom:32 }}>
            SSLVault automates the full SSL/TLS certificate lifecycle — from issuance through DNS validation, deployment, monitoring, and renewal. Built on open standards. No proprietary black boxes.
          </p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['RFC 8555 · ACME v2', GRN],['AES-256-GCM', PRP],['DigiCert trust chain', AMB],['CA/B Forum 2026 compliant', RED]].map(([t, c]) => (
              <span key={t} style={{ fontSize:11, fontWeight:500, color:c, background:`${c}18`, border:`1px solid ${c}40`, borderRadius:4, padding:'3px 10px', fontFamily:MONO }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background:BG2, borderBottom:`1px solid ${LN}`, padding:`32px ${P}` }}>
        <div style={{ maxWidth:860, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
          <Stat val="8+"    label="DNS providers"          sub="Cloudflare, Vercel, Route53…"    color={GRN} />
          <Stat val="A+"    label="Max TLS health grade"   sub="HSTS · CAA · TLS 1.3 verified"   color={AMB} />
          <Stat val="47d"   label="CA/B Forum 2029 target" sub="Full automation required"         color={RED} />
          <Stat val="< 5m"  label="DV issuance time"       sub="RapidSSL · DigiCert chain"        color={PRP} />
          <Stat val="30d"   label="Auto-renew window"      sub="Before cert expiry, zero-touch"   color={GRN} />
        </div>
      </section>

      <div style={{ maxWidth:860, margin:'0 auto', padding:`clamp(48px,7vw,80px) ${P} 100px` }}>

        {/* What we do */}
        <div style={{ marginBottom:64 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>What we do</div>
          <h2 style={{ fontSize:'clamp(22px,3.5vw,34px)', fontWeight:700, color:T1, letterSpacing:'-0.8px', lineHeight:1.15, marginBottom:18 }}>
            The complete certificate lifecycle — automated end to end.
          </h2>
          <p style={{ fontSize:15, color:T2, lineHeight:1.85, marginBottom:16, maxWidth:660 }}>
            Managing SSL/TLS certificates manually is error-prone and doesn't scale. Certificates expire silently, DCV records are forgotten, private keys are emailed around in plaintext, and renewal is always somebody's last-minute problem.
          </p>
          <p style={{ fontSize:15, color:T2, lineHeight:1.85, maxWidth:660 }}>
            SSLVault solves all of it. Issue via RapidSSL in minutes. DNS challenges automated via provider APIs. Certificates deployed via VPS persistent agent or cPanel UAPI — both cron-triggered every 2 minutes. Private keys encrypted with AES-256-GCM in CertVault. Everything renews automatically, 30 days before expiry, forever.
          </p>
        </div>

        {/* Capabilities */}
        <div style={{ marginBottom:64 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Platform capabilities</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:1, background:LN, border:`1px solid ${LN}`, borderRadius:6, overflow:'hidden' }}>
            {[
              { icon:'⚡', color:GRN,  title:'Certificate issuance',
                items:['DV, OV, EV, Wildcard, SAN','RapidSSL · DigiCert trust chain','ACME v2 · RFC 8555','Issued in under 5 minutes (DV)'] },
              { icon:'🤖', color:AMB,  title:'VPS persistent agent',
                items:['systemd daemon — polls every 60s','Nginx and Apache auto-configuration','Config test before reload','Cron dispatches jobs every 2 minutes'] },
              { icon:'🌐', color:PRP,  title:'DNS automation',
                items:['8+ providers: Cloudflare, Vercel, Route53…','Auto-add ACME challenge records','Poll for propagation, validate, clean up','Zero copy-paste, zero manual steps'] },
              { icon:'🔐', color:RED,  title:'CertVault',
                items:['AES-256-GCM envelope encryption','DEK wrapped with KEK — never plaintext','Password re-auth before key reveal','Immutable audit log → CSV export'] },
              { icon:'📋', color:GRN,  title:'47-day readiness',
                items:['Scores every cert 0–100 against mandates','200d (2026) → 100d (2027) → 47d (2029)','Per-cert automation checklist','Fleet-wide compliance view'] },
              { icon:'🏛', color:AMB,  title:'cPanel auto-install',
                items:['UAPI-based installation','No SSH or agent required','API token auth','Cron auto-installs within 2 minutes'] },
            ].map(f => (
              <div key={f.title} style={{ background:BG3, padding:'20px' }}>
                <div style={{ fontSize:20, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, color:T1, marginBottom:10 }}>{f.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {f.items.map(i => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2.5" style={{ flexShrink:0, marginTop:2 }}><path d="M20 6L9 17l-5-5"/></svg>
                      <span style={{ fontSize:12, color:T2, lineHeight:1.5 }}>{i}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CA/B Forum */}
        <div style={{ background:BG3, border:`1px solid ${LN2}`, borderRadius:8, padding:'28px', marginBottom:64 }}>
          <div style={{ fontSize:10, fontWeight:500, color:RED, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:12 }}>Why automation is non-negotiable</div>
          <h2 style={{ fontSize:'clamp(18px,3vw,28px)', fontWeight:700, color:T1, letterSpacing:'-0.5px', lineHeight:1.2, marginBottom:14 }}>
            The CA/B Forum is mandating shorter certificates. Manual management ends in 2026.
          </h2>
          <p style={{ fontSize:14, color:T2, lineHeight:1.8, marginBottom:24, maxWidth:620 }}>
            The CA/Browser Forum is forcing certificate validity down in three phases. By 2029, certificates will only be valid for 47 days. Renewing every 47 days manually is operationally impossible. Automation isn't optional — it's the only path forward.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:8, marginBottom:18 }}>
            {[
              { date:'March 15, 2026', days:'200 days', status:'IN EFFECT', color:RED,  desc:'Already enforced. Certs with longer validity are browser-rejected today.' },
              { date:'March 15, 2027', days:'100 days', status:'UPCOMING',  color:AMB,  desc:'Manual renewal every 100 days at scale is operationally unsustainable.' },
              { date:'March 15, 2029', days:'47 days',  status:'PLANNED',   color:GRN,  desc:'Full zero-touch automation required. SSLVault handles this end-to-end today.' },
            ].map(m => (
              <div key={m.date} style={{ background:BG4, border:`1px solid ${LN}`, borderTop:`3px solid ${m.color}`, borderRadius:6, padding:'14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:m.color, fontFamily:MONO, letterSpacing:'1px', marginBottom:6 }}>{m.status}</div>
                <div style={{ fontSize:10, color:T3, fontFamily:MONO, marginBottom:4 }}>{m.date}</div>
                <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:8 }}>{m.days}</div>
                <div style={{ fontSize:12, color:T2, lineHeight:1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13, color:T2, lineHeight:1.75 }}>
            SSLVault's persistent agent, DNS integrations, cPanel auto-install, and automated renewal pipeline were built specifically for this world. Connect once — SSLVault handles every renewal automatically, forever.
          </p>
        </div>

        {/* The builder */}
        <div style={{ marginBottom:64 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>The builder</div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:28, alignItems:'flex-start' }}>
            <img src={portrait} alt="Mathi" style={{ width:90, height:90, borderRadius:10, objectFit:'cover', border:`2px solid ${LN2}`, flexShrink:0 }}/>
            <div>
              <h2 style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:700, color:T1, letterSpacing:'-0.5px', marginBottom:10 }}>Mathi — Certified PKI Specialist</h2>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                {[['PKI Industry Professional', GRN],['Certified PKI Specialist', AMB],['Netherlands 🇳🇱', PRP]].map(([t, c]) => (
                  <span key={t} style={{ fontSize:11, fontWeight:500, color:c, background:`${c}18`, border:`1px solid ${c}40`, borderRadius:4, padding:'3px 10px', fontFamily:MONO }}>{t}</span>
                ))}
              </div>
              <p style={{ fontSize:14, color:T2, lineHeight:1.85, marginBottom:12 }}>
                SSLVault is built by Mathi — a Certified PKI Specialist with hands-on experience in the CA industry. MSc from Kongu Engineering College. Deep expertise in certificate lifecycle management, CA/B Forum standards, DCV methods, and PKI automation.
              </p>
              <p style={{ fontSize:14, color:T2, lineHeight:1.85 }}>
                The motivation is simple: enterprise CLM tools are priced out of reach for the vast majority of organisations that need them. SSLVault delivers the same automation — fully auditable, built on open standards — without the procurement cycle.
              </p>
            </div>
          </div>
        </div>

        {/* Design principles */}
        <div style={{ marginBottom:64 }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Design principles</div>
          <h2 style={{ fontSize:'clamp(18px,3vw,28px)', fontWeight:700, color:T1, letterSpacing:'-0.5px', marginBottom:20 }}>How SSLVault is built.</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:1, border:`1px solid ${LN}`, borderRadius:6, overflow:'hidden' }}>
            {[
              { n:'01', color:GRN, title:'Open standards, no lock-in',
                body:"Every layer uses auditable open standards. RFC 8555 for issuance. AES-256-GCM for key storage. CT logs for transparency. No proprietary protocols, no vendor lock-in." },
              { n:'02', color:AMB, title:'Automation-first, human-readable audit',
                body:"Zero-touch means nothing should require manual steps once configured. But every automated action — cert issued, key revealed, agent job run — is logged to an immutable audit trail." },
              { n:'03', color:PRP, title:'Key security as a first-class concern',
                body:"Private keys are encrypted with AES-256-GCM envelope encryption (DEK + KEK) before touching the database. Reveal requires password re-authentication. Every access is logged." },
              { n:'04', color:RED,  title:'Forward-compatible by design',
                body:"The CA/B Forum 2026–2029 mandate timeline is the biggest change to PKI operations in a decade. SSLVault's agent polls every 60s, DNS providers are API-connected, and renewal is fully automated. When 47-day certs become mandatory, nothing changes for SSLVault users." },
            ].map((p, i, arr) => (
              <div key={p.n} style={{ display:'flex', gap:16, padding:'18px 20px', background:BG2, borderBottom:i < arr.length - 1 ? `1px solid ${LN}` : 'none', borderLeft:`3px solid ${p.color}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:p.color, fontFamily:MONO, width:24, flexShrink:0, marginTop:1 }}>{p.n}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T1, marginBottom:5 }}>{p.title}</div>
                  <div style={{ fontSize:12.5, color:T2, lineHeight:1.75 }}>{p.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div style={{ marginBottom:64, paddingTop:32, borderTop:`1px solid ${LN}` }}>
          <div style={{ fontSize:10, fontWeight:500, color:T3, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:16 }}>Technology stack</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:1, background:LN, border:`1px solid ${LN}`, borderRadius:6, overflow:'hidden' }}>
            {[
              { layer:'CA / Issuance',    stack:'RapidSSL (GoGetSSL) · DigiCert trust chain',   color:GRN },
              { layer:'Protocol',         stack:'ACME v2 · RFC 8555 · DNS-01 challenge',         color:AMB },
              { layer:'Key storage',      stack:'AES-256-GCM · Envelope encryption (DEK+KEK)',   color:PRP },
              { layer:'Agent runtime',    stack:'Bash daemon · systemd · Nginx / Apache',        color:RED },
              { layer:'Frontend',         stack:'React 18 · Vite · Montserrat · SF Mono',        color:GRN },
              { layer:'Backend',          stack:'Supabase · PostgreSQL · Edge Functions (Deno)', color:AMB },
              { layer:'Hosting',          stack:'Vercel CDN · Global edge network',              color:PRP },
              { layer:'Compliance',       stack:'CA/B Forum · CT Logs · RFC 8555 · GDPR',        color:RED },
            ].map(t => (
              <div key={t.layer} style={{ background:BG3, padding:'14px 16px' }}>
                <div style={{ fontSize:9.5, fontWeight:600, color:t.color, textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:MONO, marginBottom:5 }}>{t.layer}</div>
                <div style={{ fontSize:12, color:T2, lineHeight:1.5 }}>{t.stack}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background:BG3, border:`1px solid ${LN2}`, borderRadius:8, padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:T1, marginBottom:6 }}>Ready to automate your certificate lifecycle?</div>
            <div style={{ fontSize:13, color:T2, maxWidth:440, lineHeight:1.7 }}>Enterprise-grade PKI controls — CertVault, 47-day readiness, CA intelligence — built in from day one.</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => nav('/auth')} style={{ background:RED, border:'none', cursor:'pointer', fontFamily:F, fontSize:12, fontWeight:600, color:'#fff', padding:'10px 22px', borderRadius:5 }}>Get started →</button>
            <button onClick={() => nav('/pricing')} style={{ background:'none', border:`1px solid ${LN2}`, cursor:'pointer', fontFamily:F, fontSize:12, color:T2, padding:'10px 22px', borderRadius:5 }}>View pricing</button>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ marginTop:36, paddingTop:24, borderTop:`1px solid ${LN}`, display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['← Home','/'],['Pricing','/pricing'],['Knowledge Base','/knowledge-base'],['Install Guide','/install']].map(([l, p]) => (
            <button key={l} onClick={() => nav(p)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:12, color:T3, padding:0 }}
              onMouseEnter={e => e.currentTarget.style.color = T1}
              onMouseLeave={e => e.currentTarget.style.color = T3}>{l}</button>
          ))}
        </div>

      </div>
    </div>
  )
}
