import { Shield, Lock, Globe, CheckCircle, ArrowRight, Heart, Server,
         RefreshCw, Eye, Users, Award, Code2, Activity, BookOpen } from 'lucide-react'
import '../styles/design-v2.css'

export default function About({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 1080, padding: '40px 24px 80px' }}>

        {/* HERO */}
        <div style={{ textAlign:'center', padding:'48px 0 56px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                        borderRadius:100, padding:'4px 14px', marginBottom:20 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-green-text)' }}>Free · Open · Always</span>
          </div>
          <h1 style={{ fontSize:'clamp(36px,5vw,58px)', fontWeight:700, letterSpacing:'-1.2px',
                        lineHeight:1.1, margin:'0 0 16px', color:'var(--v2-text)' }}>
            Free SSL, made simple<br />
            <span style={{ color:'var(--v2-green)' }}>for everyone.</span>
          </h1>
          <p style={{ fontSize:17, color:'var(--v2-text-2)', maxWidth:580, margin:'0 auto 36px', lineHeight:1.7 }}>
            SSLVault is a certificate lifecycle management platform built on {"Let's"} Encrypt.
            We issue, install, monitor, and auto-renew TLS certificates — without paywalls,
            without complexity, without limits.
          </p>
          <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }}
            onClick={() => nav('/developer')}>
            Meet the developer <ArrowRight size={13} />
          </button>
        </div>

        {/* MISSION */}
        <div className="v2-card" style={{ padding:'36px 40px', marginBottom:16, borderLeft:'3px solid var(--v2-green)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div className="v2-icontile" style={{ background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)', color:'var(--v2-green)' }}>
              <Heart size={16} />
            </div>
            <span className="v2-section-label">Our Mission</span>
          </div>
          <p style={{ fontSize:19, color:'var(--v2-text)', lineHeight:1.65, fontWeight:600, maxWidth:740, margin:'0 0 20px', letterSpacing:'-0.2px' }}>
            The web should be encrypted by default — and managing that encryption should never be a barrier to entry.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:14, fontSize:14, color:'var(--v2-text-2)', lineHeight:1.8, maxWidth:780 }}>
            <p style={{ margin:0 }}>
              A decade ago, HTTPS was a privilege. Certificate authorities charged hundreds of dollars per year for what {"Let's"} Encrypt now provides free. That was a landmark shift — but it only solved half the problem. The operational side remains: obtaining a certificate still requires DNS configuration, command-line tools, or expensive hosting add-ons. Installing it means editing web server configs. Renewing it means setting up cron jobs or trusting your hosting panel to remember. For a solo developer or a small non-profit, {"that's"} a lot of friction standing between their site and a padlock icon.
            </p>
            <p style={{ margin:0 }}>
              Enterprise teams have solved this beautifully. Dedicated CLM platforms handle discovery, issuance, installation, monitoring, and renewal automatically — with full audit trails and alerting. But those platforms cost thousands per year and are built for security teams managing thousands of certificates, not for the person running a community website on a $5 VPS.
            </p>
            <p style={{ margin:0 }}>
              SSLVault is our answer to that gap. We believe every site — no matter how small, no matter the budget — deserves the same automated, reliable certificate lifecycle that enterprises pay a premium for. Free issuance via {"Let's"} Encrypt. One-command agent installation. Continuous expiry monitoring. Automatic renewal before anything breaks. Built on open standards, deployed on open infrastructure, free forever.
            </p>
            <p style={{ margin:0 }}>
              The padlock {"shouldn't"} be optional. {"We're"} here to make sure it never lapses.
            </p>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:32 }}>
          {[
            { value:'100%', label:'Free, forever',       accent:'var(--v2-green)' },
            { value:'90d',  label:'Cert validity',       accent:'var(--v2-text)' },
            { value:'<60s', label:'Issuance time',       accent:'var(--v2-text)' },
            { value:'0',    label:'Credit cards needed', accent:'var(--v2-text)' },
          ].map(s => (
            <div key={s.label} className="v2-stat" style={{ borderTop:`2px solid ${s.accent}` }}>
              <div className="v2-stat-value" style={{ fontSize:28 }}>{s.value}</div>
              <div className="v2-stat-label" style={{ marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* WHAT WE DO */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:20 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>What SSLVault does</h2>
            <p className="v2-subtitle">Four jobs — every one of them automated.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { icon:Shield,    title:'Issue',   color:'#2563eb', bg:'#dbeafe',
                desc:"ACME-protocol certificates from Let's Encrypt — wildcard or single domain — in under 60 seconds. No manual CSR, no validation headaches." },
              { icon:Server,    title:'Install', color:'#059669', bg:'#d1fae5',
                desc:'Zero-touch deployment to Nginx, Apache, cPanel, or Plesk via the persistent agent. SSH once, automate forever.' },
              { icon:Eye,       title:'Monitor', color:'#d97706', bg:'#fef3c7',
                desc:'Continuous expiry tracking, public SSL scanner, and CT-log discovery for shadow certificates across your entire portfolio.' },
              { icon:RefreshCw, title:'Renew',   color:'#7c3aed', bg:'#ede9fe',
                desc:'Automatic 30-day pre-expiry renewal with email alerts and exponential backoff on failure. Your certificates never go dark.' },
            ].map(({ icon:Icon, title, desc, color, bg }) => (
              <div key={title} className="v2-card" style={{ padding:'24px 26px', display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:'var(--v2-r-md)', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={19} color={color} />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{title}</div>
                  <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WHO IT'S FOR */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:20 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>Who it{"'"}s for</h2>
            <p className="v2-subtitle">Built for anyone who owns a domain and cares about security.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { icon:Code2,  title:'Indie developers',   color:'#2563eb', bg:'#dbeafe',
                items:['Personal projects & portfolios','Side projects on shoestring budgets','API endpoints that need HTTPS','Fast issuance, zero cost'] },
              { icon:Users,  title:'Small businesses',   color:'#059669', bg:'#d1fae5',
                items:['E-commerce & customer-facing sites','Multi-domain portfolios','cPanel / shared hosting setups','No IT team required'] },
              { icon:Globe,  title:'Non-profits & NGOs', color:'#d97706', bg:'#fef3c7',
                items:['Donor portals & donation pages','Community platforms','Limited budgets, maximum trust','Agent-based auto-renewal'] },
            ].map(({ icon:Icon, title, items, color, bg }) => (
              <div key={title} className="v2-card" style={{ padding:'22px 22px' }}>
                <div style={{ width:36, height:36, borderRadius:'var(--v2-r-md)', background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={17} color={color} />
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:10 }}>{title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {items.map(item => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'var(--v2-text-2)' }}>
                      <CheckCircle size={11} color={color} style={{ flexShrink:0 }} />{item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:20 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>How it works</h2>
            <p className="v2-subtitle">From domain to HTTPS in four steps.</p>
          </div>
          <div className="v2-card" style={{ overflow:'hidden' }}>
            {[
              { n:1, title:'Issue via ACME',          desc:"Enter your domain. SSLVault calls Let's Encrypt over the ACME protocol, completes DNS or HTTP validation, and returns a signed certificate in under 60 seconds." },
              { n:2, title:'Install with one click',  desc:'Choose your server type. The persistent agent handles Nginx, Apache, cPanel, and Plesk — writing cert files to the correct paths and reloading your web server without downtime.' },
              { n:3, title:'Monitor expiry',          desc:'Every certificate in your account is tracked. SSLVault scans public CT logs for shadow certificates you may have missed, and alerts you 30 days before anything expires.' },
              { n:4, title:'Auto-renew forever',      desc:"30 days before expiry, SSLVault automatically issues a new certificate and — if you have an agent running — installs it too. Set and forget." },
            ].map(({ n, title, desc }, i, arr) => (
              <div key={n} className="v2-step" style={{ padding:'18px 24px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--v2-border)' : 'none', margin:0, borderRadius:0 }}>
                <div className="v2-step-num">{n}</div>
                <div className="v2-step-body">
                  <div className="v2-step-title">{title}</div>
                  <p style={{ margin:0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRINCIPLES */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:20 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>What we believe</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { n:'01', title:'Free, always',          accent:'var(--v2-green)',
                body:"No upgrade tier hides core features. Certificates, monitoring, agents, and renewals are free for every user, every domain. That's the whole deal." },
              { n:'02', title:'Privacy by design',     accent:'#2563eb',
                body:"Your private keys never leave your server when using the agent. We log only the metadata required to renew. We don't sell data, serve ads, or track you." },
              { n:'03', title:'Open standards',        accent:'#d97706',
                body:"Built on RFC 8555 (ACME), Let's Encrypt, and Certificate Transparency logs. No proprietary protocols, no vendor lock-in, no surprise migration costs." },
              { n:'04', title:'Radical transparency', accent:'#7c3aed',
                body:'Source code is public. Renewal events are logged and visible to you. Every action SSLVault takes on your behalf is auditable.' },
            ].map(({ n, title, body, accent }) => (
              <div key={n} className="v2-card" style={{ padding:'24px 26px', borderTop:`2px solid ${accent}` }}>
                <div style={{ fontSize:28, fontWeight:700, color:accent, opacity:0.4, letterSpacing:'-0.5px', marginBottom:8, fontFeatureSettings:"'tnum'" }}>{n}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TECH STACK */}
        <div style={{ marginBottom:32 }}>
          <div className="v2-code" style={{ borderRadius:'var(--v2-r-xl)' }}>
            <div className="v2-code-head">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="v2-code-dots">
                  <span style={{ background:'#ef4444' }} />
                  <span style={{ background:'#f59e0b' }} />
                  <span style={{ background:'#10b981' }} />
                </div>
                <span style={{ fontSize:11, color:'#737373', fontFamily:'monospace' }}>stack.json</span>
              </div>
              <span style={{ fontSize:11, color:'#737373' }}>Open infrastructure, end to end</span>
            </div>
            <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { label:"Let's Encrypt", sub:'Certificate Authority',  color:'#34d399' },
                { label:'ACME RFC 8555', sub:'Issuance Protocol',      color:'#60a5fa' },
                { label:'React + Vite',  sub:'Frontend',               color:'#a78bfa' },
                { label:'Supabase',      sub:'Backend & Database',     color:'#34d399' },
                { label:'Vercel Edge',   sub:'Global Hosting',         color:'#60a5fa' },
                { label:'systemd + bash',sub:'VPS Agent Daemon',       color:'#f59e0b' },
              ].map(({ label, sub, color }) => (
                <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:'var(--v2-r-md)', padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'white', marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:10, color:'#737373', textTransform:'uppercase', letterSpacing:'0.4px' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECURITY */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:20 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>Security practices</h2>
            <p className="v2-subtitle">How we handle your data and credentials.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { icon:Lock,      title:'Keys never leave your server', color:'var(--v2-green)',
                desc:'The agent writes certificate files locally. Private keys are never uploaded to SSLVault servers — only the public certificate metadata is stored.' },
              { icon:Shield,    title:'Credentials encrypted at rest', color:'#2563eb',
                desc:'Server credentials (cPanel tokens, SSH keys) stored in SSLVault are encrypted with AES-256 before being written to the database.' },
              { icon:Activity,  title:'Row-level security on all data', color:'#d97706',
                desc:'Supabase RLS policies ensure users can only read and write their own certificates, domains, and server records. Cross-account access is impossible.' },
              { icon:BookOpen,  title:'Audit log for every renewal', color:'#7c3aed',
                desc:'Every renewal event, agent job, and certificate issuance is logged with timestamps. You can verify exactly what SSLVault did and when.' },
            ].map(({ icon:Icon, title, desc, color }) => (
              <div key={title} className="v2-card" style={{ padding:'20px 22px', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)', background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color }}>
                  <Icon size={15} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:4 }}>{title}</div>
                  <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACKNOWLEDGEMENTS */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:16 }}>
            <h2 className="v2-h1" style={{ fontSize:20, marginBottom:4 }}>Standing on the shoulders of giants</h2>
            <p className="v2-subtitle">SSLVault exists because of the open infrastructure, standards, and organisations that made free, trusted encryption possible for everyone.</p>
          </div>

          {/* Special thanks — Let's Encrypt */}
          <div className="v2-card" style={{ padding:'24px 28px', marginBottom:10, borderLeft:'3px solid var(--v2-green)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <div style={{ width:44, height:44, borderRadius:'var(--v2-r-lg)', background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 }}>
                🔐
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--v2-text)' }}>{"Let's"} Encrypt</span>
                  <span className="v2-chip" style={{ background:'var(--v2-green-bg)', color:'var(--v2-green-text)', border:'0.5px solid var(--v2-green-border)', fontSize:10 }}>
                    Special thanks
                  </span>
                </div>
                <p style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.75, margin:'0 0 10px' }}>
                  The single most important gift to the open web. Before {"Let's"} Encrypt, obtaining a trusted TLS certificate cost hundreds of dollars per year and required manual paperwork. Josh Aas, Peter Eckersley, and the ISRG team changed that permanently in 2015 — making HTTPS the default for the web. SSLVault is built entirely on their infrastructure. Every certificate we issue is signed by their CA. None of this exists without them.
                </p>
                <a href="https://letsencrypt.org" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12, color:'var(--v2-green-text)', textDecoration:'none', fontWeight:500 }}>
                  letsencrypt.org ↗
                </a>
              </div>
            </div>
          </div>

          {/* Others */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { emoji:'🏛️', name:'CA/Browser Forum', role:'Industry governance body', url:'https://cabforum.org',
                desc:'The CA/Browser Forum sets the baseline requirements that all certificate authorities must meet — defining what it means for a certificate to be trusted by browsers worldwide. Their work on DV, OV, and EV standards underpins the entire PKI ecosystem.' },
              { emoji:'📐', name:'IETF', role:'Internet standards body', url:'https://ietf.org',
                desc:'The Internet Engineering Task Force authored the RFCs that make certificate issuance possible. RFC 8555 (ACME), RFC 5280 (X.509 PKI), and RFC 8446 (TLS 1.3) are the foundation everything is built on — open, patent-free, and maintained by the community.' },
              { emoji:'🌐', name:'ISRG', role:'Internet Security Research Group', url:'https://abetterinternet.org',
                desc:"The non-profit behind Let's Encrypt. ISRG's mission is to reduce financial, technological, and educational barriers to secure communication. They also run Prossimo (memory-safe infrastructure) and Divvi Up (privacy-respecting metrics). A remarkable organisation." },
              { emoji:'🔭', name:'Certificate Transparency', role:'Google & open community', url:'https://certificate.transparency.dev',
                desc:"CT logs — pioneered by Google and now governed openly — mean every publicly trusted certificate is visible and auditable. This protects the web from misissued certificates. SSLVault's discovery feature is built on CT log data via crt.sh." },
              { emoji:'🛡️', name:'Mozilla', role:'Root store & open web champion', url:'https://wiki.mozilla.org/CA',
                desc:"Mozilla's Root Store Program sets the baseline for CA trust in Firefox — and because most other root stores follow its lead, Mozilla's decisions shape trust across the entire web. Their CA policy pushed the industry toward shorter validity periods and automation." },
              { emoji:'📋', name:'crt.sh & Sectigo', role:'CT log search infrastructure', url:'https://crt.sh',
                desc:"crt.sh — built and operated by Sectigo (formerly Comodo CA) — provides free, public search across all Certificate Transparency logs. It's the tool that makes certificate discovery, monitoring, and audit accessible to everyone without requiring API keys or accounts." },
            ].map(({ emoji, name, role, desc, url }) => (
              <div key={name} className="v2-card" style={{ padding:'20px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'var(--v2-r-md)', background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{name}</div>
                    <div className="v2-section-label" style={{ marginTop:1 }}>{role}</div>
                  </div>
                </div>
                <p style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7, margin:'0 0 8px' }}>{desc}</p>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:11, color:'var(--v2-text-3)', textDecoration:'none', fontWeight:500 }}>
                  {url.replace('https://','')} ↗
                </a>
              </div>
            ))}
          </div>

          <div className="v2-callout" style={{ marginTop:10, fontSize:13 }}>
            <div className="v2-callout-title">A note from Mathi</div>
            PKI is a team sport. The trust that makes HTTPS meaningful is maintained by hundreds of engineers, lawyers, and volunteers across these organisations — most of them working in the open, for free, to keep the web secure. SSLVault is a small tool built on top of their enormous collective effort. We are grateful.
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', padding:'32px 0 0' }}>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.4px', marginBottom:8, color:'var(--v2-text)' }}>
            Ready to secure your domains?
          </div>
          <div style={{ fontSize:14, color:'var(--v2-text-2)', marginBottom:24 }}>Free forever. No credit card. No limits.</div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="v2-btn v2-btn-primary" style={{ padding:'11px 24px', fontSize:14 }}
              onClick={() => nav('/knowledge-base')}>
              <BookOpen size={14} /> Browse docs <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
