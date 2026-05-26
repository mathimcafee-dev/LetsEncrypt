// About.jsx — SSLVault company page
// Owlish white · rich · informational · no CSS class dependencies
import portrait from '../assets/mathi-portrait.jpg'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const C = {
  bg:'#000000', bg2:'#000000', bg3:'#000000',
  border:'rgba(255,255,255,0.12)', border2:'rgba(255,255,255,0.2)',
  heading:'#ffffff', body:'#4b5563', muted:'rgba(255,255,255,0.35)',
  teal:'#ffffff', tealDk:'#ffffff', tealBg:'#111111', tealBd:'#A8E6DE',
  green:'#ffffff', greenBg:'#111111', greenBd:'#A8E6DE',
  purple:'#ffffff', purpleBg:'#faf5ff', purpleBd:'#F2C4BC',
  amber:'#ffffff', amberBg:'rgba(239,68,68,0.08)', amberBd:'#F2C4BC',
  red:'#f87171', redBg:'#fef2f2', redBd:'#fecaca',
  ink:'#ffffff',
}

function Stat({ val, label, sub, color = C.teal }) {
  return (
    <div style={{ padding:'20px 24px', background:C.bg, border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, borderRadius:10, boxShadow:'0 1px 3px rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize:28, fontWeight:700, color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:4 }}>{val}</div>
      <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:12, color:C.muted }}>{sub}</div>
    </div>
  )
}

function Badge({ children, color = C.teal, bg, bd }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', fontSize:11, fontWeight:600, color, background:bg||`${color}10`, border:`1px solid ${bd||color+'25'}`, borderRadius:6, padding:'3px 10px', fontFamily:MONO, letterSpacing:'0.02em' }}>
      {children}
    </span>
  )
}

export default function About({ nav }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F, color:C.heading }}>
      <style>{`*, *::before, *::after{box-sizing:border-box;margin:0;padding:0} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Nav */}
      <header style={{ background:'rgba(8,12,20,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,4vw,40px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:28, height:28, background:C.teal, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.92)' }}>SSLVault</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:MONO }}>/ About</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/pricing')} style={{ background:'none', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontFamily:F, fontSize:12, color:'rgba(255,255,255,0.5)', padding:'6px 14px', borderRadius:100 }}>Pricing</button>
          <button onClick={() => nav('/auth')} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'#ffffff', padding:'7px 18px', borderRadius:100 }}>Get started</button>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ background:C.ink, padding:'80px clamp(20px,5vw,48px) 80px', borderBottom:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:800, height:400, background:`radial-gradient(ellipse 60% 55% at 50% 0%, rgba(14,165,233,0.1) 0%, transparent 100%)`, pointerEvents:'none' }}/>
        <div style={{ maxWidth:860, margin:'0 auto', position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:18 }}>About SSLVault</div>
          <h1 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:700, letterSpacing:'-1.5px', lineHeight:1.08, color:'rgba(255,255,255,0.95)', marginBottom:22, maxWidth:640 }}>
            Enterprise certificate lifecycle management. Built by a PKI engineer, for everyone.
          </h1>
          <p style={{ fontSize:17, color:'rgba(255,255,255,0.45)', lineHeight:1.85, maxWidth:580, marginBottom:36 }}>
            SSLVault automates the full SSL/TLS certificate lifecycle — from issuance through DNS validation, deployment, monitoring, and renewal. Built on open standards. No proprietary black boxes.
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {['RFC 8555 · ACME v2','AES-256-GCM','DigiCert trust chain','CA/B Forum 2026 compliant'].map(t => (
              <Badge key={t} color={C.teal} bg="rgba(14,165,233,0.1)" bd="rgba(14,165,233,0.2)">{t}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ background:C.bg2, borderBottom:`1px solid ${C.border}`, padding:'40px clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth:860, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
          <Stat val="8+"    label="DNS providers"          sub="Cloudflare, Vercel, Route53…"    color={C.teal}   />
          <Stat val="A+"    label="Max TLS health grade"   sub="HSTS · CAA · TLS 1.3 verified"   color={C.green}  />
          <Stat val="47d"   label="CA/B Forum 2029 target" sub="Full automation required"         color={C.red}    />
          <Stat val="5 min" label="DV issuance time"       sub="RapidSSL · DigiCert chain"        color={C.purple} />
          <Stat val="30d"   label="Auto-renew window"      sub="Before cert expiry, zero-touch"   color={C.amber}  />
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'clamp(48px,7vw,80px) clamp(20px,5vw,48px) 100px' }}>

        {/* ── WHAT IS SSLVAULT ── */}
        <div style={{ marginBottom:72 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>What we do</div>
          <h2 style={{ fontSize:'clamp(24px,3.5vw,36px)', fontWeight:700, color:C.heading, letterSpacing:'-0.8px', lineHeight:1.15, marginBottom:20 }}>
            The complete certificate lifecycle — automated end to end.
          </h2>
          <p style={{ fontSize:16, color:C.body, lineHeight:1.85, marginBottom:20, maxWidth:660 }}>
            Managing SSL/TLS certificates manually is error-prone and doesn't scale. Certificates expire silently, DCV records are forgotten, private keys are emailed around in plaintext, and renewal is always somebody's last-minute problem.
          </p>
          <p style={{ fontSize:16, color:C.body, lineHeight:1.85, maxWidth:660 }}>
            SSLVault solves all of it. Issue certificates via RapidSSL in minutes. DNS challenges are automated through provider APIs. Certificates are deployed to servers via a persistent agent with zero SSH access after setup. Private keys are encrypted with AES-256-GCM and stored in CertVault. Everything renews automatically — 30 days before expiry — forever.
          </p>
        </div>

        {/* ── CAPABILITY GRID ── */}
        <div style={{ marginBottom:72 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Platform capabilities</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:10 }}>
            {[
              {
                icon:'⚡', color:C.teal, title:'Certificate issuance',
                items:['DV, OV, EV, Wildcard, and SAN certificates','RapidSSL · DigiCert trust chain','ACME v2 · RFC 8555 protocol','Issued in under 5 minutes (DV)'],
              },
              {
                icon:'🤖', color:C.green, title:'Persistent agent',
                items:['systemd daemon — polls every 5 minutes','Nginx and Apache auto-configuration','Config syntax test before reload','Outbound-only HTTPS — no firewall changes'],
              },
              {
                icon:'🌐', color:'#06b6d4', title:'DNS automation',
                items:['8+ providers: Cloudflare, Vercel, Route53…','Auto-add ACME challenge records','Poll for propagation, validate, clean up','Zero copy-paste, zero manual steps'],
              },
              {
                icon:'🔐', color:C.purple, title:'CertVault',
                items:['AES-256-GCM envelope encryption','DEK wrapped with KEK — never plaintext','Password re-auth before key reveal','Immutable audit log → CSV export'],
              },
              {
                icon:'📋', color:C.red, title:'47-day readiness',
                items:['Scores every cert 0–100 against mandates','200d (2026) → 100d (2027) → 47d (2029)','Per-cert automation checklist','Fleet-wide compliance view'],
              },
              {
                icon:'📈', color:C.amber, title:'Health & monitoring',
                items:['TLS health score A+ to F per domain','HSTS, CAA, TLS 1.3, expiry checks','CT log discovery via crt.sh','CT abuse monitor — unknown CAs'],
              },
            ].map(f => (
              <div key={f.title} style={{ background:C.bg, border:`1px solid ${C.border}`, borderTop:`3px solid ${f.color}`, borderRadius:10, padding:'20px', boxShadow:'0 1px 3px rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:20, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.heading, marginBottom:10 }}>{f.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {f.items.map(i => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2.5" style={{ flexShrink:0, marginTop:2 }}><path d="M20 6L9 17l-5-5"/></svg>
                      <span style={{ fontSize:12.5, color:C.body, lineHeight:1.5 }}>{i}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CA/B FORUM CONTEXT ── */}
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, padding:'32px', marginBottom:72 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.red, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Why automation is non-negotiable</div>
          <h2 style={{ fontSize:'clamp(20px,3vw,30px)', fontWeight:700, color:C.heading, letterSpacing:'-0.6px', lineHeight:1.2, marginBottom:16 }}>
            The CA/B Forum is mandating shorter certificates.<br/>Manual management ends in 2026.
          </h2>
          <p style={{ fontSize:15, color:C.body, lineHeight:1.8, marginBottom:28, maxWidth:620 }}>
            The CA/Browser Forum — the standards body that governs how SSL certificates work — is forcing certificate validity down in three phases. By 2029, certificates will only be valid for 47 days. Renewing every 47 days manually is operationally impossible. Automation isn't optional — it's the only path forward.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, marginBottom:20 }}>
            {[
              { date:'March 15, 2026', days:'200 days', status:'IMMINENT', color:C.red, bg:C.redBg, bd:C.redBd,   desc:'Certs valid longer than 200 days will be browser-rejected. This is already in effect.' },
              { date:'March 15, 2027', days:'100 days', status:'UPCOMING', color:C.amber, bg:C.amberBg, bd:C.amberBd, desc:'Manual renewal every 100 days at scale is operationally unsustainable.' },
              { date:'March 15, 2029', days:'47 days',  status:'PLANNED',  color:C.teal, bg:C.tealBg, bd:C.tealBd,  desc:'Full zero-touch automation required. SSLVault handles this end-to-end today.' },
            ].map(m => (
              <div key={m.date} style={{ background:m.bg, border:`1px solid ${m.bd}`, borderRadius:10, padding:'16px' }}>
                <div style={{ fontSize:9, fontWeight:800, color:m.color, fontFamily:MONO, letterSpacing:'1px', marginBottom:8 }}>{m.status}</div>
                <div style={{ fontSize:10, color:C.muted, fontFamily:MONO, marginBottom:4 }}>{m.date}</div>
                <div style={{ fontSize:24, fontWeight:800, color:m.color, fontFamily:MONO, letterSpacing:'-1px', marginBottom:8 }}>{m.days}</div>
                <div style={{ fontSize:12, color:C.body, lineHeight:1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13.5, color:C.body, lineHeight:1.75 }}>
            SSLVault's persistent agent, DNS provider integrations, and automated renewal pipeline were built specifically for this world. Connect once — SSLVault handles every renewal automatically, forever.
          </p>
        </div>

        {/* ── THE BUILDER ── */}
        <div style={{ marginBottom:72 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>The builder</div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:32, alignItems:'flex-start' }}>
            <img src={portrait} alt="Mathi" style={{ width:100, height:100, borderRadius:14, objectFit:'cover', border:`2px solid ${C.tealBd}`, flexShrink:0 }}/>
            <div>
              <h2 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:700, color:C.heading, letterSpacing:'-0.5px', marginBottom:8 }}>Mathi — Certified PKI Specialist</h2>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                <Badge color={C.teal} bg={C.tealBg} bd={C.tealBd}>PKI Industry Professional</Badge>
                <Badge color={C.purple} bg={C.purpleBg} bd={C.purpleBd}>Certified PKI Specialist</Badge>
                <Badge color={C.green} bg={C.greenBg} bd={C.greenBd}>Netherlands 🇳🇱</Badge>
              </div>
              <p style={{ fontSize:15, color:C.body, lineHeight:1.85, marginBottom:14 }}>
                SSLVault is built by Mathi — a Certified PKI Specialist with hands-on experience in the CA industry. MSc from Kongu Engineering College. Deep expertise in certificate lifecycle management, CA/B Forum standards, DCV methods, and PKI automation.
              </p>
              <p style={{ fontSize:15, color:C.body, lineHeight:1.85 }}>
                The motivation is simple: the enterprise CLM tools (Venafi at $250k+/yr, Keyfactor at $75–200k/yr) are priced out of reach for the vast majority of organisations that need them. SSLVault delivers the same automation — issuer-agnostic, fully auditable, built on open standards — without the procurement cycle.
              </p>
            </div>
          </div>
        </div>

        {/* ── PKI PRINCIPLES ── */}
        <div style={{ marginBottom:72 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Design principles</div>
          <h2 style={{ fontSize:'clamp(20px,3vw,30px)', fontWeight:700, color:C.heading, letterSpacing:'-0.6px', marginBottom:24 }}>How SSLVault is built.</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              {
                n:'01', color:C.teal,
                title:'Open standards, no lock-in',
                body:'Every layer uses auditable open standards. RFC 8555 for issuance. AES-256-GCM for key storage. CT logs for transparency. No proprietary protocols, no vendor lock-in. You can verify every decision SSLVault makes.'
              },
              {
                n:'02', color:C.green,
                title:'Automation-first, human-readable audit',
                body:'Zero-touch means nothing should require manual steps once configured. But every automated action — cert issued, key revealed, agent job run, renewal completed — is logged to an immutable audit trail with timestamp and user. Automated doesn\'t mean unaccountable.'
              },
              {
                n:'03', color:C.purple,
                title:'Key security as a first-class concern',
                body:'Private keys are the most sensitive component of PKI. CertVault encrypts every key with AES-256-GCM envelope encryption (DEK + KEK) before it touches the database. Reveal requires password re-authentication. Every access is logged. The 30-second copy-only window prevents screen-share leaks. These aren\'t optional settings — they\'re the defaults.'
              },
              {
                n:'04', color:C.amber,
                title:'Forward-compatible by design',
                body:'The CA/B Forum 2026–2029 mandate timeline is the biggest change to PKI operations in a decade. SSLVault\'s architecture was built with short validity cycles in mind from day one. The agent polls every 5 minutes. DNS providers are API-connected. Renewal is event-driven, not cron-based. When 47-day certs become mandatory, nothing changes for SSLVault users.'
              },
            ].map(p => (
              <div key={p.n} style={{ display:'flex', gap:16, padding:'20px', background:C.bg2, border:`1px solid ${C.border}`, borderLeft:`3px solid ${p.color}`, borderRadius:'0 10px 10px 0' }}>
                <div style={{ fontSize:10, fontWeight:800, color:p.color, fontFamily:MONO, width:24, flexShrink:0, marginTop:1 }}>{p.n}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:6 }}>{p.title}</div>
                  <div style={{ fontSize:13.5, color:C.body, lineHeight:1.75 }}>{p.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TECH STACK ── */}
        <div style={{ marginBottom:72, paddingTop:32, borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:20 }}>Technology stack</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
            {[
              { layer:'CA / Issuance',    stack:'RapidSSL (GoGetSSL) · DigiCert trust chain',   color:C.teal   },
              { layer:'Protocol',         stack:'ACME v2 · RFC 8555 · DNS-01 challenge',         color:C.green  },
              { layer:'Key storage',      stack:'AES-256-GCM · Envelope encryption (DEK+KEK)',   color:C.purple },
              { layer:'Agent runtime',    stack:'Bash daemon · systemd · Nginx / Apache',        color:C.amber  },
              { layer:'Frontend',         stack:'React 18 · Vite · Inter · JetBrains Mono',      color:C.teal   },
              { layer:'Backend',          stack:'Supabase · PostgreSQL · Edge Functions (Deno)', color:C.green  },
              { layer:'Hosting',          stack:'Vercel CDN · Global edge network',              color:C.purple },
              { layer:'Compliance',       stack:'CA/B Forum · CT Logs · RFC 8555 · GDPR',        color:C.red    },
            ].map(t => (
              <div key={t.layer} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:t.color, textTransform:'uppercase', letterSpacing:'0.5px', fontFamily:MONO, marginBottom:6 }}>{t.layer}</div>
                <div style={{ fontSize:12.5, color:C.body, lineHeight:1.5 }}>{t.stack}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background:C.tealBg, border:`1px solid ${C.tealBd}`, borderRadius:14, padding:'min(36px,5vw) min(32px,4vw)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:C.heading, marginBottom:8 }}>Ready to automate your certificate lifecycle?</div>
            <div style={{ fontSize:14, color:C.body, maxWidth:440, lineHeight:1.7 }}>Enterprise-grade PKI controls — CertVault, 47-day readiness, CA intelligence — built in from day one.</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button onClick={() => nav('/auth')} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'#ffffff', padding:'10px 24px', borderRadius:100 }}>Get started →</button>
            <button onClick={() => nav('/pricing')} style={{ background:C.bg, border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:F, fontSize:13, color:C.heading, padding:'10px 24px', borderRadius:100 }}>View pricing</button>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ marginTop:40, paddingTop:24, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, flexWrap:'wrap' }}>
          {[['← Home','/'],['Developer','/developer'],['Pricing','/pricing'],['Knowledge Base','/knowledge-base'],['Install Guide','/install']].map(([l,p]) => (
            <button key={l} onClick={() => nav(p)}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:F, fontSize:13, color:C.muted, padding:0, transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color=C.heading}
              onMouseLeave={e => e.currentTarget.style.color=C.muted}>
              {l}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
