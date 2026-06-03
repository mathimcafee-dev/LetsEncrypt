// KnowledgeBase.jsx — SSLVault docs v2 (kb-refresh)
import { useState, useEffect } from 'react'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const C = {
  bg:'#f7f5f0', bg2:'#1a0404', bg3:'#220808',
  border:'rgba(0,0,0,0.08)', border2:'rgba(31,92,78,0.25)',
  heading:'#111111', body:'rgba(240,237,232,0.65)', muted:'rgba(240,237,232,0.35)',
  teal:'#16a068', tealDk:'#16a068', tealBg:'rgba(74,222,128,0.06)', tealBd:'rgba(22,160,104,0.22)',
  green:'#16a068', greenBg:'rgba(74,222,128,0.06)', greenBd:'rgba(22,160,104,0.22)',
  purple:'#a78bfa', purpleBg:'rgba(167,139,250,0.06)',
  amber:'#9a6400', amberBg:'rgba(251,191,36,0.06)',
  red:'#1f5c4e', redBg:'rgba(31,92,78,0.09)',
  ink:'#111111',
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Code({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(code) } catch(e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{ background:'#f4f1ec', border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', margin:'14px 0', fontFamily:MONO }}>
      <div style={{ background:'rgba(0,0,0,0.02)', padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#1f5c4e','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c, opacity:.7 }}/>)}
          <span style={{ fontSize:10, color:'#6b6b6b', marginLeft:8 }}>{lang}</span>
        </div>
        <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, color:copied?C.green:'rgba(240,237,232,0.4)', fontFamily:MONO, padding:'2px 6px', borderRadius:4, transition:'color .15s' }}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Copied</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
          }
        </button>
      </div>
      <pre style={{ padding:'14px 16px', fontSize:12, lineHeight:1.9, color:'rgba(240,237,232,0.75)', overflowX:'auto', margin:0 }}>{code}</pre>
    </div>
  )
}

function Note({ type = 'tip', children }) {
  const styles = {
    tip:     { bg:C.tealBg,   bd:C.tealBd,                    color:C.tealDk,  label:'TIP',       icon:'💡' },
    warning: { bg:C.amberBg,  bd:'rgba(0,0,0,0.1)',       color:C.amber,   label:'WARNING',   icon:'⚠️' },
    info:    { bg:C.greenBg,  bd:'rgba(31,92,78,0.2)',        color:C.green,   label:'INFO',      icon:'ℹ️' },
    danger:  { bg:C.redBg,    bd:'rgba(0,0,0,0.1)',       color:C.red,     label:'IMPORTANT', icon:'🔴' },
  }[type]
  return (
    <div style={{ background:styles.bg, border:`1px solid ${styles.bd}`, borderLeft:`3px solid ${styles.color}`, borderRadius:'0 8px 8px 0', padding:'12px 16px', margin:'14px 0', display:'flex', gap:10 }}>
      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{styles.icon}</span>
      <div style={{ fontSize:13, color:styles.color, lineHeight:1.7 }}><strong>{styles.label}:</strong> {children}</div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display:'flex', gap:16, marginBottom:22 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:C.teal, color:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{n}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13.5, color:C.body, lineHeight:1.75 }}>{children}</div>
      </div>
    </div>
  )
}

function Section({ id, icon, title, subtitle, badge, badgeColor, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const bc = badgeColor || C.teal
  return (
    <div id={id} style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:8 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:'100%', background:open?C.bg2:C.bg, border:'none', cursor:'pointer',
        padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
        transition:'background .15s', fontFamily:F,
      }}>
        <div style={{ width:36, height:36, borderRadius:9, background:`${bc}12`, border:`1px solid ${bc}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{icon}</div>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.heading }}>{title}</div>
          {subtitle && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{ fontSize:10, fontWeight:700, color:bc, background:`${bc}10`, border:`1px solid ${bc}22`, borderRadius:100, padding:'2px 10px', fontFamily:MONO, letterSpacing:'0.03em', marginRight:8 }}>{badge}</span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" style={{ transform:open?'rotate(90deg)':'rotate(0deg)', transition:'transform .2s', flexShrink:0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding:'20px 24px', borderTop:`1px solid ${C.border}`, background:C.bg, animation:'fadeIn .15s ease' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Table({ headers, rows }) {
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', margin:'14px 0' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:F }}>
        <thead>
          <tr style={{ background:C.bg2 }}>
            {headers.map(h => <th key={h} style={{ padding:'9px 14px', fontSize:11, fontWeight:700, color:C.muted, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:`1px solid ${C.border}` }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:i<rows.length-1?`1px solid ${C.bg3}`:'none' }}
              onMouseEnter={e => e.currentTarget.style.background=C.bg2}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {row.map((cell, j) => <td key={j} style={{ padding:'10px 14px', fontSize:13, color:j===0?C.heading:C.body, fontWeight:j===0?600:400, fontFamily:j===0?MONO:F }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FAQ({ items }) {
  return (
    <div style={{ marginTop:28 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:MONO, marginBottom:14 }}>Frequently asked questions</div>
      {items.map((item, i) => (
        <div key={i} style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, paddingBottom:14 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.heading, marginBottom:6 }}>{item.q}</div>
          <div style={{ fontSize:13, color:C.body, lineHeight:1.8 }}>{item.a}</div>
        </div>
      ))}
    </div>
  )
}

const SECTIONS = [
  { id:'getting-started', icon:'⚡', title:'Getting started',          subtitle:'Issue your first cert in minutes',               badge:'Start here', badgeColor:C.teal   },
  { id:'agent',           icon:'🤖', title:'Persistent agent',         subtitle:'Zero-touch VPS installs and renewals',            badge:'VPS',        badgeColor:C.green  },
  { id:'cpanel',          icon:'🏛', title:'cPanel / shared hosting',  subtitle:'No SSH needed — UAPI install',                   badge:'cPanel',     badgeColor:'#111111'},
  { id:'dns',             icon:'🌐', title:'DNS providers',            subtitle:'Auto DCV via Cloudflare, Vercel, Route53…',       badge:'DNS-01',     badgeColor:'#1f5c4e'},
  { id:'autorenew',       icon:'🔄', title:'Auto-renewal',             subtitle:'Set once, renew forever',                        badge:'Automation', badgeColor:C.amber  },
  { id:'certvault',       icon:'🔐', title:'CertVault',                subtitle:'AES-256-GCM private key vault',                  badge:'Security',   badgeColor:C.purple },
  { id:'readiness',       icon:'📋', title:'47-Day Readiness',         subtitle:'CA/B Forum 2026–2029 compliance',                badge:'CA/B Forum', badgeColor:C.red    },
  { id:'health',          icon:'📈', title:'SSL Health Score',         subtitle:'Grade A+ to F per domain',                       badge:'Monitoring', badgeColor:'#111111'},
  { id:'discovery',       icon:'🔍', title:'CT Log Discovery',         subtitle:'Find every cert ever issued for your domains',   badge:'CT Logs',    badgeColor:C.green  },
  { id:'abuse',           icon:'🚨', title:'CT Abuse Monitor',         subtitle:'Detect unauthorised cert issuance',              badge:'Security',   badgeColor:C.red    },
  { id:'calendar',        icon:'📅', title:'Renewal Calendar',         subtitle:'Heatmap of upcoming renewals',                   badge:'Planning',   badgeColor:C.teal   },
  { id:'troubleshoot',    icon:'🔧', title:'Troubleshooting',          subtitle:'Common errors and fixes',                        badge:'Help',       badgeColor:C.muted  },
  { id:'certbind',        icon:'🔗', title:'CertBind',                 subtitle:'Active certificate binding verification',         badge:'Unique',     badgeColor:C.teal   },
  { id:'mcp',             icon:'🤖', title:'AI Agent (MCP)',           subtitle:'Control SSLVault with Claude, Copilot & more',   badge:'New',        badgeColor:C.purple },
]

export default function KnowledgeBase({ nav }) {
  const [search, setSearch] = useState('')
  const filtered = SECTIONS.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.subtitle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight:'100vh', background:`#f7f5f0`, fontFamily:F, color:C.heading }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} *{box-sizing:border-box;margin:0;padding:0}
        @media(max-width:min(767px,100%)){
          .kb-body{padding:16px 14px!important}
          .kb-tabs{padding:0 10px!important;overflow-x:auto!important}
        }`}</style>

      {/* Nav */}
      <header style={{ background:'rgba(8,12,20,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,0,0,0.05)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,4vw,40px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:28, height:28, background:C.teal, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>SSLVault</span>
          <span style={{ fontSize:11, color:'#6b6b6b', fontFamily:MONO }}>/ Knowledge Base</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/install')} style={{ background:'none', border:`1px solid rgba(240,237,232,0.1)`, cursor:'pointer', fontFamily:F, fontSize:12, color:'#b5aea8', padding:'6px 14px', borderRadius:100 }}>Install guide</button>
          <button onClick={() => nav('/auth')} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'#1a1a1a', padding:'7px 18px', borderRadius:100 }}>Get started</button>
        </div>
      </header>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'clamp(40px,6vw,72px) clamp(20px,4vw,40px) 100px' }}>

        {/* Header */}
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Documentation</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:700, color:C.heading, letterSpacing:'-1px', lineHeight:1.1, marginBottom:16 }}>Knowledge Base</h1>
          <p style={{ fontSize:15, color:C.body, maxWidth:540, lineHeight:1.8, marginBottom:28 }}>
            Complete documentation for SSLVault — issue, monitor, auto-renew, and secure certificates across every server and CA.
          </p>

          {/* Search */}
          <div style={{ position:'relative', maxWidth:440 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs…"
              style={{ width:'100%', padding:'11px 14px 11px 38px', fontSize:14, borderRadius:10, border:`1.5px solid ${search?C.teal:C.border}`, background:C.bg, color:C.heading, fontFamily:F, outline:'none', transition:'border-color .15s' }}/>
          </div>
        </div>

        {/* Quick nav grid */}
        {!search && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:8, marginBottom:40 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => { document.getElementById(s.id)?.scrollIntoView({ behavior:'smooth' }) }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, cursor:'pointer', fontFamily:F, transition:'all .15s', textAlign:'left' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=s.badgeColor||C.teal; e.currentTarget.style.background=C.bg2 }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.bg }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.heading }}>{s.title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{s.badge}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ height:1, background:C.border, marginBottom:32 }}/>

        {/* ── GETTING STARTED ── */}
        {filtered.some(s=>s.id==='getting-started') && (
          <Section {...SECTIONS[0]} defaultOpen>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              SSLVault issues certificates through <strong style={{ color:C.heading }}>GoGetSSL</strong>, a globally trusted Certificate Authority. DV certificates are typically issued in under 5 minutes once domain control validation (DCV) is complete. OV and EV require manual CA verification and take longer.
            </p>
            <Step n={1} title="Go to Issue Certificate">
              Click <strong>Issue Certificate</strong> in the sidebar. Enter your domain (e.g. <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>example.com</code> or <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>*.example.com</code>), select cert type and validity, then click Issue.
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, marginTop:12 }}>
                {[
                  { type:'DV', time:'~5 min', use:'Blogs, APIs, personal sites' },
                  { type:'OV', time:'1–3 days', use:'Business websites' },
                  { type:'EV', time:'2–7 days', use:'E-commerce, banking' },
                  { type:'Wildcard DV', time:'~5 min', use:'*.yourdomain.com' },
                ].map(c => (
                  <div key={c.type} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.heading, marginBottom:3 }}>{c.type}</div>
                    <div style={{ fontSize:11, color:C.teal, marginBottom:2, fontFamily:MONO }}>⏱ {c.time}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{c.use}</div>
                  </div>
                ))}
              </div>
            </Step>
            <Step n={2} title="Complete domain control validation (DCV)">
              GoGetSSL verifies you own the domain before issuing. SSLVault supports all three DCV methods:
              <Table headers={['Method','How it works','Best for']} rows={[
                ['DNS CNAME','SSLVault writes the GoGetSSL-provided CNAME to your DNS zone. Auto-completed if a DNS provider is connected.','Wildcard certs, automated issuance'],
                ['DNS TXT','Add a TXT record to your DNS. Also automatable with a connected provider.','Standard DV certs'],
                ['Email','Click the approval link sent to admin@, webmaster@, or hostmaster@.','Quick one-off issuance without DNS access'],
              ]}/>
              <Note type="tip">Connect Cloudflare, Vercel, or Route53 under DNS Providers and DCV is fully automatic — SSLVault adds the CNAME, waits for propagation, completes validation, and removes the record.</Note>
            </Step>
            <Step n={3} title="Certificate appears in Inventory">
              Once issued, your cert appears in <strong>Inventory &amp; Monitor</strong>. Expand any row to see expiry, issuer (GoGetSSL), PEM files, install button, and private key reveal via CertVault.
            </Step>
            <Step n={4} title="Install on your server">
              Three paths: <strong>Persistent agent (VPS)</strong> — dispatched automatically over the agent job queue. <strong>cPanel</strong> — UAPI install, no SSH required. <strong>Manual download</strong> — copy PEM files directly.
            </Step>
            <Step n={5} title="Reissue and renewal — always free">
              SSLVault reissues and renews certificates using GoGetSSL's free reissue endpoint. Renewals and reissues never generate a new paid order — your subscription covers all renewals at no extra cost.
            </Step>
            <Note type="info">As of March 15, 2026, the CA/B Forum maximum certificate validity is 200 days. SSLVault enforces this automatically — all new issuances respect the 200-day limit. See the 47-Day Readiness article for the full compliance timeline.</Note>
            <FAQ items={[
              { q:'Which Certificate Authority does SSLVault use?', a:'SSLVault issues all certificates through GoGetSSL, a globally trusted CA whose roots are trusted by all major browsers and operating systems.' },
              { q:'Are renewals charged separately?', a:'No. SSLVault uses GoGetSSL\'s free reissue endpoint for all renewals and reissues. There is no additional charge per renewal — your SSLVault plan covers them.' },
              { q:'Can I issue a wildcard certificate?', a:'Yes. Select Wildcard DV at issuance (enter *.yourdomain.com). Wildcards cover all first-level subdomains — for example *.example.com covers api.example.com, www.example.com, and so on. They do not cover sub-subdomains.' },
              { q:'What happens after I issue — how do I get it on my server?', a:'Install options appear in Inventory. Use the Persistent Agent for VPS/Linux servers (zero-touch), cPanel for shared hosting (UAPI, no SSH), or download the PEM files manually for other environments.' },
            ]}/>
          </Section>
        )}

        {/* ── PERSISTENT AGENT ── */}
        {filtered.some(s=>s.id==='agent') && (
          <Section {...SECTIONS[1]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              The Persistent Agent is a lightweight Linux daemon (systemd service) installed on your VPS or dedicated server. It connects to SSLVault, polls for pending jobs every <strong style={{ color:C.heading }}>5 minutes</strong>, and handles certificate installation, Nginx/Apache configuration, and renewal — completely hands-free. The agent also streams server health metrics (CPU, RAM, disk) back to the SSLVault dashboard.
            </p>
            <Note type="info">The Persistent Agent is for <strong>VPS and Linux servers only</strong>. For cPanel/shared hosting, use the cPanel install method instead — do not install the agent on a cPanel host.</Note>
            <Step n={1} title="Go to Automation → Servers & agents">
              Click <strong>Install agent</strong> to generate your personalised one-line install command. The command contains an embedded short-lived install token (valid for 1 hour) that ties the agent to your account.
            </Step>
            <Step n={2} title="Run on your VPS">
              <Code code="curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash" lang="bash"/>
              The installer registers the agent with SSLVault and starts it as a systemd service. The agent appears in your Servers list within 5 minutes (first poll cycle).
            </Step>
            <Step n={3} title="Verify the agent is active">
              <Code code="sudo systemctl status sslvault-agent" lang="bash"/>
              The output should show <strong style={{ color:C.green }}>active (running)</strong>. The agent polls SSLVault every 5 minutes for pending jobs and submits health metrics on each cycle.
            </Step>
            <Step n={4} title="Dispatch a certificate">
              In Inventory, click <strong>Install</strong> on a cert row, select your server from the list, and click <strong>Dispatch</strong>. The job enters the agent_jobs queue. On the next poll (within 5 minutes), the agent picks it up, installs the cert, updates your web server config, and reloads the service automatically.
            </Step>
            <Step n={5} title="Monitor agent health">
              Each agent card in <strong>Servers &amp; agents</strong> shows live CPU, RAM, and disk usage, the agent version, last-seen timestamp, and every certificate it protects. A green indicator means the agent is polling normally.
            </Step>
            <Note type="tip">Auto-renewal works fully automatically when an agent is installed. SSLVault re-issues the cert via GoGetSSL, then dispatches the renewed cert to the agent. No manual steps required.</Note>
            <FAQ items={[
              { q:'How do I update the agent?', a:'Re-run the install command from Servers & agents. The installer detects an existing agent, stops it, replaces the binary, and restarts the service. Your certificates and configuration are preserved.' },
              { q:'What happens if the agent goes offline?', a:'Pending jobs are held in the queue. When the agent reconnects and polls, it processes any outstanding jobs in order. If a cert expires while the agent is offline, SSLVault sends expiry alert emails.' },
              { q:'Can I run multiple agents on different servers?', a:'Yes — each agent registers as a separate server entry. You can dispatch certificates to any registered server independently. There is no limit on the number of agents per account.' },
              { q:'Does the agent transmit my private key?', a:'No. The private key never leaves your server. The agent reads the key from disk only to perform CertBind\'s cryptographic binding proof (signing a nonce). The key itself is never sent to SSLVault.' },
            ]}/>
          </Section>
        )}

        {/* ── CPANEL ── */}
        {filtered.some(s=>s.id==='cpanel') && (
          <Section {...SECTIONS[2]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              The cPanel install method installs certificates on shared hosting accounts using cPanel's UAPI — no SSH, no agent, no command line. SSLVault authenticates directly with your cPanel host using an API token and installs the certificate and private key in a single API call. Auto-renewal via the dedicated cPanel cron means your certs stay current without any manual intervention.
            </p>
            <Note type="danger">Use this method for <strong>cPanel / shared hosting only</strong>. Do not attempt to install the Persistent Agent on a cPanel host — use the cPanel method exclusively for these environments.</Note>
            <Step n={1} title="Create a cPanel API token">
              In your cPanel dashboard, navigate to <strong>Security → Manage API Tokens → Create Token</strong>. Name it <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>SSLVault</code> and set it to never expire (or a rolling expiry you manage). Copy the token immediately — it is shown only once.
            </Step>
            <Step n={2} title="Enter credentials in SSLVault">
              In Inventory, click <strong>Install</strong> on the cert row and select the <strong>cPanel</strong> tab. Enter:
              <Table headers={['Field','Where to find it']} rows={[
                ['Hostname','Your cPanel server hostname, e.g. server123.hostingprovider.com'],
                ['Username','Your cPanel account username'],
                ['API Token','The token you created in step 1'],
                ['Domain','The domain this cert covers — must match a domain in your cPanel account'],
              ]}/>
            </Step>
            <Step n={3} title="SSLVault installs via UAPI">
              SSLVault calls cPanel's <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>SSL::install_ssl</code> UAPI endpoint to install the certificate, private key, and CA bundle in one operation. No SSH access is required at any point.
            </Step>
            <Step n={4} title="Auto-renewal on cPanel">
              When auto-renew is enabled, SSLVault's cPanel cron re-issues the certificate via GoGetSSL and re-installs it using UAPI on the renewal date. The process is identical to the initial install — fully automatic, no manual steps.
            </Step>
            <Note type="tip">cPanel installs are proven on a wide range of shared hosts. If your host uses a non-standard cPanel port (not 2083), contact support — custom port configuration is available.</Note>
            <FAQ items={[
              { q:'Does the cPanel install require root access?', a:'No. Standard cPanel account credentials with an API token are sufficient. No root or WHM access is needed.' },
              { q:'Which cPanel versions are supported?', a:'SSLVault targets cPanel 96+ which supports the UAPI SSL endpoints used for installation. Most modern shared hosts run cPanel 100+.' },
              { q:'Can I use cPanel for wildcard certificates?', a:'Yes, as long as your cPanel account controls the wildcard domain. DCV for wildcard certs requires DNS CNAME or TXT — connect a DNS provider for fully automatic validation.' },
              { q:'What happens if my cPanel API token expires?', a:'The renewal cron will fail and SSLVault will send an alert email. Update the API token in your SSLVault cPanel credentials before the token expires to avoid any gap in auto-renewal.' },
            ]}/>
          </Section>
        )}

        {/* ── DNS PROVIDERS ── */}
        {filtered.some(s=>s.id==='dns') && (
          <Section {...SECTIONS[3]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              Connecting a DNS provider unlocks fully automatic DCV. When SSLVault issues or renews a certificate, it writes the GoGetSSL-provided CNAME record to your DNS zone, waits for propagation, completes validation, and removes the record — all without any copy-pasting. This is the recommended setup for all production domains.
            </p>
            <Step n={1} title="Go to Automation → DNS Providers">
              Click <strong>Add provider</strong> and select your DNS host from the list.
            </Step>
            <Step n={2} title="Enter API credentials">
              <Table headers={['Provider','Credential needed']} rows={[
                ['Cloudflare','API Token with Zone:DNS:Edit permission (scoped to target zone)'],
                ['Vercel','Access Token from Vercel Settings → Tokens'],
                ['Route53','AWS Access Key ID + Secret with route53:ChangeResourceRecordSets on target hosted zone'],
                ['Namecheap','API key + whitelisted IP in Namecheap dashboard → Profile → API Access'],
                ['GoDaddy','API Key + Secret from developer.godaddy.com'],
                ['DigitalOcean','Personal Access Token with write access'],
                ['Porkbun','API Key + API Secret from Porkbun account settings'],
              ]}/>
            </Step>
            <Step n={3} title="How automatic DCV works">
              During issuance or renewal, SSLVault: (1) receives the CNAME challenge record from GoGetSSL, (2) writes it to your DNS zone via the provider API, (3) waits for DNS propagation (typically 30–120 seconds), (4) signals GoGetSSL to verify — GoGetSSL reads the CNAME and approves, (5) SSLVault removes the challenge record. The entire process runs in the background with no user interaction.
            </Step>
            <Step n={4} title="Multiple providers for multiple domains">
              You can connect multiple DNS providers. SSLVault maps each domain to the provider whose zone contains that domain. For example, you can have Cloudflare for one domain and Vercel for another — SSLVault resolves the correct provider at issuance time automatically.
            </Step>
            <Note type="tip">Cloudflare is the most reliable provider due to their fast global DNS propagation. If you experience DCV failures with other providers, consider moving DNS to Cloudflare for production domains.</Note>
            <Note type="warning">DNS provider credentials are stored encrypted. Use the minimum required permissions — a scoped Cloudflare token with Zone:DNS:Edit on a specific zone is more secure than an account-level Global API Key.</Note>
            <FAQ items={[
              { q:'Which DCV method does SSLVault use with a connected DNS provider?', a:'CNAME. GoGetSSL issues a CNAME challenge record and SSLVault writes it to your DNS zone. CNAME is preferred over TXT because it persists across renewals — GoGetSSL can verify the same CNAME record for subsequent reissues, making renewals faster.' },
              { q:'Why did my DCV fail even with a DNS provider connected?', a:'The most common cause is API credential scope — ensure the token has write access to the specific zone. Also verify the domain in SSLVault exactly matches the domain in the DNS provider zone (including apex vs www). Check the DCV status in Inventory for the specific error from GoGetSSL.' },
              { q:'Can I use a DNS provider for wildcard certs?', a:'Yes. Wildcard certs require DNS DCV (email validation is not allowed for wildcards by the CA/B Forum). A connected DNS provider makes wildcard DCV fully automatic.' },
              { q:'Does connecting a DNS provider affect my existing DNS records?', a:'No. SSLVault only adds and removes the specific CNAME challenge record during issuance. All other DNS records are untouched.' },
            ]}/>
          </Section>
        )}

        {/* ── AUTO-RENEWAL ── */}
        {filtered.some(s=>s.id==='autorenew') && (
          <Section {...SECTIONS[4]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              SSLVault's auto-renewal system is built on three dedicated crons — one for agent-based servers, one for cPanel hosts, and one for reissue orchestration. All renewals use GoGetSSL's free reissue endpoint, so there is never an additional charge for renewal.
            </p>
            <Step n={1} title="Enable auto-renew on a certificate">
              In Inventory, expand a cert row. Toggle <strong>Auto-renew</strong> to ON. SSLVault schedules renewal 30 days before expiry. Given the CA/B Forum 200-day maximum, most certs renew roughly every 170 days.
            </Step>
            <Step n={2} title="Requirements for fully automatic end-to-end renewal">
              <Table headers={['Requirement','Why it matters']} rows={[
                ['DNS provider connected','Enables automatic CNAME DCV — without it, DCV requires manual action'],
                ['Agent installed (VPS) OR cPanel credentials saved','Enables automatic install of the renewed cert on your server'],
                ['Auto-renew toggled ON','Triggers the renewal cron to pick up the cert'],
              ]}/>
              Without a DNS provider, SSLVault still re-issues the cert but DCV requires manual completion. Without an agent or cPanel credentials, SSLVault renews the cert but you must install it manually.
            </Step>
            <Step n={3} title="How the renewal crons work">
              Three background crons handle the full renewal pipeline:
              <Table headers={['Cron','What it does']} rows={[
                ['sslvault-auto-renew-cron','Scans all certs with auto-renew ON that expire within 30 days. Triggers GoGetSSL reissue via the free reissue endpoint.'],
                ['sslvault-agent-install-cron','Picks up renewed certs and dispatches install jobs to registered persistent agents.'],
                ['sslvault-install-cron','Picks up renewed certs and installs via UAPI on registered cPanel accounts.'],
              ]}/>
            </Step>
            <Step n={4} title="Renewal notifications">
              Email alerts are sent at 30, 14, and 7 days before expiry. After a successful renewal, a confirmation email is sent with the new expiry date. Failed renewals also trigger an alert immediately.
            </Step>
            <Note type="tip">The <strong>Renewal Calendar</strong> shows a heatmap of all upcoming renewals. Check it weekly to spot any certs that have auto-renew disabled or are missing a DNS provider.</Note>
            <Note type="info">Renewals are free. SSLVault calls GoGetSSL's <code style={{ fontFamily:MONO, fontSize:12 }}>POST /orders/reissue/{'{order_id}'}/ </code> endpoint which reissues under the existing order. No new paid order is created.</Note>
            <FAQ items={[
              { q:'What happens if a renewal fails?', a:'SSLVault retries the renewal up to 3 times over 48 hours. If all retries fail, an alert email is sent. The original certificate remains valid until its expiry date — there is no immediate outage.' },
              { q:'Can I renew a certificate manually before the 30-day window?', a:'Yes. In Inventory, expand the cert row and click Reissue. This triggers an immediate reissue via GoGetSSL\'s free endpoint — no cost and the order_id is preserved.' },
              { q:'Will my server have downtime during renewal?', a:'No. The agent or cPanel cron installs the new certificate and performs a graceful web server reload (nginx -s reload or equivalent). There is no connection drop during a reload.' },
            ]}/>
          </Section>
        )}

        {/* ── CERTVAULT ── */}
        {filtered.some(s=>s.id==='certvault') && (
          <Section {...SECTIONS[5]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              CertVault automatically stores the private key for every certificate issued through SSLVault. Keys are encrypted at rest using AES-256-GCM with envelope encryption — a unique Data Encryption Key (DEK) per certificate, itself encrypted with a Key Encryption Key (KEK). Keys are never stored or transmitted in plaintext at any point.
            </p>
            <Step n={1} title="Reveal a private key">
              Navigate to <strong>Security → CertVault</strong> and click <strong>Reveal key</strong> on the target certificate. Re-authenticate with your SSLVault account password. After verification, the decrypted key is displayed in a masked field for 30 seconds — copy only, no download or persistent display.
            </Step>
            <Step n={2} title="Rotate a key">
              Click <strong>Rotate key</strong> to generate a fresh certificate and private key pair via GoGetSSL. The new cert is issued, the new key is encrypted and stored, and the old key is archived for 30 days before permanent destruction. For servers with an agent, the new cert is automatically deployed on the next poll cycle.
            </Step>
            <Step n={3} title="Audit log">
              Every CertVault action — reveal, copy, rotate, archive — is logged with timestamp, user, and IP. The full audit log is exportable as CSV from <strong>Security → CertVault → Export log</strong>. Use this export for SOC 2, ISO 27001:2022 Annex A.8.24, or PCI-DSS 4.0 evidence.
            </Step>
            <Note type="warning">The 30-second reveal window and copy-only display are intentional security controls — not limitations. Every key access is logged and cannot be disabled or bypassed.</Note>
            <Note type="danger">Private key rotation generates a brand-new certificate. After rotation, the old certificate is no longer valid. Ensure agents or cPanel accounts are configured for auto-install so the new cert deploys immediately.</Note>
            <FAQ items={[
              { q:'Is my private key ever transmitted to SSLVault servers in plaintext?', a:'No. The private key is generated by GoGetSSL and returned to SSLVault already within a secure API response. It is encrypted immediately before any storage operation. The key in transit uses TLS 1.3, and the stored form is AES-256-GCM ciphertext.' },
              { q:'Can I export my private key as a file?', a:'The reveal window is copy-only by design. To export, copy the key during the 30-second window and save it locally. This is intentional — audit logs capture every access, and file download events are harder to track.' },
              { q:'What is envelope encryption?', a:'Each private key is encrypted with a unique random key (DEK). The DEK itself is then encrypted with a master key (KEK). To decrypt a private key you need both layers. This means a compromise of the encrypted key store alone is not sufficient — the KEK is stored separately.' },
              { q:'How long are rotated/archived keys kept?', a:'Archived keys are retained for 30 days after rotation, then permanently destroyed. The 30-day window exists to allow recovery if the rotation causes an unexpected issue with your server configuration.' },
            ]}/>
          </Section>
        )}

        {/* ── 47-DAY READINESS ── */}
        {filtered.some(s=>s.id==='readiness') && (
          <Section {...SECTIONS[6]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              The CA/B Forum is phasing down maximum certificate validity in three steps through 2029. The first deadline — 200 days — is already in effect. SSLVault's 47-Day Readiness dashboard scores every certificate in your fleet against all three milestones and flags exactly what needs to change before each deadline.
            </p>
            <Table headers={['Deadline','Max validity','Status']} rows={[
              ['March 15, 2026','200 days','🔴 In effect — all new issuances must be ≤200 days'],
              ['March 15, 2027','100 days','🟡 Upcoming — automation required for frequent renewals'],
              ['March 15, 2029','47 days','🟢 Planned — zero-touch automation is mandatory at this cadence'],
            ]}/>
            <Note type="danger">The 200-day limit is in effect as of March 15, 2026. Certificates with validity over 200 days issued after this date will be rejected by browsers. SSLVault enforces ≤200 days on all new issuances automatically.</Note>
            <Step n={1} title="Check your fleet readiness">
              Navigate to <strong>Security → 47-Day Readiness</strong>. Each certificate receives a readiness score (0–100) and a status label:
              <Table headers={['Label','Score','Meaning']} rows={[
                ['Ready','80–100','Passes all current and upcoming milestones with automation in place'],
                ['At Risk','50–79','Passes today but will fail a future milestone without changes'],
                ['Will Break','0–49','Already failing a current milestone or missing critical automation'],
              ]}/>
            </Step>
            <Step n={2} title="The automation checklist">
              Each cert is evaluated against five criteria. All five are required for full readiness through 2029:
              <Table headers={['Check','Required for']} rows={[
                ['Auto-renew enabled','All milestones'],
                ['DNS provider connected (auto-DCV)','100-day and 47-day milestones'],
                ['Agent installed or cPanel configured (auto-install)','100-day and 47-day milestones'],
                ['Certificate validity within current CA/B Forum limit','Current compliance'],
                ['Private key stored in CertVault','Security posture'],
              ]}/>
            </Step>
            <Step n={3} title="Resolve readiness issues">
              Click any cert row to expand the per-item checklist. Each failed item has a direct action link — enable auto-renew, add DNS provider, or install agent — so you can resolve gaps without leaving the page.
            </Step>
            <Note type="info">At 47-day validity (the 2029 milestone), certificates must renew every ~30 days in practice (renewing 17 days early). Only fully automated pipelines — auto-DCV plus auto-install — are sustainable at this cadence. Start building automation now.</Note>
            <FAQ items={[
              { q:'I have existing certificates with 1-year validity. Are they affected?', a:'Certificates already issued before March 15, 2026 with longer validity remain valid until their stated expiry. The 200-day limit applies to new issuances only. However, when those certs come up for renewal, SSLVault will issue replacements at ≤200 days.' },
              { q:'What does "Will Break" mean exactly?', a:'It means the certificate either has a validity period that already exceeds the current CA/B Forum limit, or it is missing the automation required to renew at the required cadence before a future deadline. Click the row to see which specific checks are failing.' },
              { q:'Do I need to do anything right now for the 2027 and 2029 deadlines?', a:'Not urgently — but connecting DNS providers and installing agents now puts the automation in place before the tighter cadences kick in. The Readiness dashboard will update the scores as deadlines approach.' },
            ]}/>
          </Section>
        )}

        {/* ── SSL HEALTH SCORE ── */}
        {filtered.some(s=>s.id==='health') && (
          <Section {...SECTIONS[7]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              SSL Health Score gives any domain a security grade from A+ to F. It combines live TLS inspection, certificate transparency log data, HTTP security header checks, and CAA record presence into a single score. You do not need a cert in SSLVault to scan a domain — any publicly reachable HTTPS endpoint can be checked.
            </p>
            <Step n={1} title="Run a scan">
              Navigate to <strong>Security → SSL Health Score</strong>. Enter any domain (e.g. <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>yourdomain.com</code>) and click <strong>Scan</strong>. Results appear in 10–30 seconds.
            </Step>
            <Step n={2} title="Understanding the grade">
              <Table headers={['Grade','Score','Criteria']} rows={[
                ['A+','95–100','Valid TLS, HSTS with max-age ≥ 180 days, CAA record present, cert expiry > 30 days, security headers all present'],
                ['A','85–94','Good TLS posture, minor gaps in security headers or HSTS max-age'],
                ['B','70–84','Missing HSTS preload or CAA record, or HSTS max-age < 30 days'],
                ['C','60–69','Short-lived HSTS, missing multiple security headers, or cert expiry < 30 days'],
                ['D','50–59','Expired cert within 7 days, no HSTS, or missing X-Content-Type-Options + X-Frame-Options'],
                ['F','0–49','Cert expired, TLS unreachable, self-signed cert, or no HTTPS at all'],
              ]}/>
            </Step>
            <Step n={3} title="What gets checked">
              <Table headers={['Check','Details']} rows={[
                ['TLS handshake','Verifies the cert chain, expiry, and that the served cert matches CT log records'],
                ['HSTS','Checks for Strict-Transport-Security header, max-age value, and includeSubDomains flag'],
                ['CAA record','Verifies a CAA DNS record restricts cert issuance to authorised CAs'],
                ['Security headers','X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy'],
                ['Certificate expiry','Days remaining — scores decrease as expiry approaches'],
              ]}/>
            </Step>
            <Note type="tip">The fastest way to improve a score is: (1) add a CAA record restricting issuance to GoGetSSL, (2) add an HSTS header with max-age=15768000, (3) add X-Content-Type-Options: nosniff and X-Frame-Options: SAMEORIGIN.</Note>
            <FAQ items={[
              { q:'What is a CAA record and why does it matter?', a:'A CAA (Certification Authority Authorization) DNS record specifies which Certificate Authorities are permitted to issue certificates for your domain. Without one, any CA can issue a cert for you. With one, only the listed CAs can issue — significantly reducing the risk of misissued certs. Add: 0 issue "gogetssl.com" to restrict issuance to GoGetSSL.' },
              { q:'How often can I run scans?', a:'There is no hard limit for domains in your Inventory. For external domains (not in your account), scans are rate-limited to prevent abuse. Results are cached for 10 minutes — rescanning within that window returns the cached result.' },
              { q:'My grade dropped after a scan. What changed?', a:'Common causes: cert expiry is now < 30 days (renew it), a security header was removed in a recent deployment, or HSTS max-age was reduced. The score breakdown shows exactly which checks changed.' },
            ]}/>
          </Section>
        )}

        {/* ── CT LOG DISCOVERY ── */}
        {filtered.some(s=>s.id==='discovery') && (
          <Section {...SECTIONS[8]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              Discovery finds certificates you may not know about — legacy certs, certs issued by other teams, certificates on subdomains, and any cert that has ever appeared in a Certificate Transparency log. Three scan modes cover different discovery scenarios.
            </p>
            <Step n={1} title="Navigate to Inventory → Discovery">
              Select a scan mode and enter a domain, IP address, or hostname depending on the mode.
            </Step>
            <Step n={2} title="CT Logs mode">
              Queries the crt.sh Certificate Transparency aggregator for every certificate ever logged for a domain and its subdomains. Returns issuer, issue date, expiry, Subject Alternative Names (SANs), and CT log source. Useful for auditing the historical cert footprint of a domain — including certs you did not issue through SSLVault.
            </Step>
            <Step n={3} title="Connect DNS mode">
              Resolves all DNS records for a domain (A, AAAA, CNAME, MX, NS, SRV) and attempts a live TLS handshake on each discovered hostname. Returns the certificate currently served on each endpoint — expiry, issuer, SANs. Useful for finding forgotten subdomains running expired or misconfigured certs.
            </Step>
            <Step n={4} title="Scan a Server mode">
              Enter an IP address or hostname and a port (default 443). SSLVault connects directly and reads the certificate presented. Useful for checking non-standard ports, internal IPs on a VPN, or servers that are not publicly DNS-resolvable.
            </Step>
            <Note type="info">Discovery results are read-only — they show what is deployed but do not modify any configuration. To bring a discovered cert into SSLVault management, re-issue it through SSLVault and use the agent or cPanel install to replace it.</Note>
            <FAQ items={[
              { q:'How far back do CT log results go?', a:'CT logs are permanent and public. The oldest entries go back to 2013 when CT logging began. crt.sh aggregates all major CT logs — every cert that was ever submitted will appear.' },
              { q:'What is the difference between CT Logs mode and CT Abuse Monitor?', a:'CT Logs (in Discovery) is a manual lookup tool — you run a scan on demand to see historical and current certs. CT Abuse Monitor is a continuous background watch — SSLVault monitors CT logs in real time and alerts you when a new cert is issued for your watched domains.' },
              { q:'Can Discovery scan internal/private IP addresses?', a:'Yes. Scan a Server mode can reach any IP or hostname resolvable from the SSLVault backend. For private IPs on an isolated network, use the Persistent Agent on a server in that network — the agent can perform local TLS checks via CertBind.' },
            ]}/>
          </Section>
        )}

        {/* ── CT ABUSE MONITOR ── */}
        {filtered.some(s=>s.id==='abuse') && (
          <Section {...SECTIONS[9]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              CT Abuse Monitor watches Certificate Transparency logs continuously for new certificates issued for your domains. Any cert — whether issued by you or by a third party, authorised or not — triggers an alert the moment it appears in a CT log. This closes the gap between issuance and detection, which previously could be days or weeks.
            </p>
            <Step n={1} title="Add a domain to watch">
              Navigate to <strong>Security → CT Abuse Monitor</strong> and click <strong>Add domain</strong>. Enter the apex domain (e.g. <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>yourdomain.com</code>) — SSLVault monitors all subdomains automatically.
            </Step>
            <Step n={2} title="Reviewing alerts">
              Flagged certificates appear in the alert list with: issuer, issue date, expiry, SANs, CT log source, and a direct crt.sh link. Mark each as <strong>Known</strong> (a cert you issued or authorised) or <strong>Suspicious</strong> (unexpected issuance requiring investigation).
            </Step>
            <Step n={3} title="Responding to a suspicious certificate">
              If you see a cert issued by an unexpected CA for your domain:
              <Table headers={['Action','How']} rows={[
                ['Check your CAA record','Run SSL Health Score — a missing CAA record allows any CA to issue for you. Add one immediately.'],
                ['Report to the CA','Contact the issuing CA with the CT log entry. CAs are required to revoke misissued certs.'],
                ['Check for domain hijacking','Verify DNS records for your domain have not been modified without your knowledge.'],
                ['Contact support','SSLVault support can help investigate and escalate to the CA if needed.'],
              ]}/>
            </Step>
            <Note type="warning">A cert issued by an unknown CA does not necessarily mean your server was compromised — but it does mean someone was able to prove control of your domain to a CA. Investigate immediately regardless of whether you can explain it.</Note>
            <Note type="tip">Adding a CAA record to your DNS is the single most effective preventive measure. It instructs CAs to refuse issuance requests for your domain from any CA not listed in the record. See SSL Health Score for instructions.</Note>
            <FAQ items={[
              { q:'How quickly do I get notified after a cert is issued?', a:'CT Abuse Monitor checks CT logs continuously. In practice, most alerts arrive within minutes of a cert appearing in a CT log — CT logs themselves typically log a cert within minutes of issuance.' },
              { q:'Does monitoring my domain prevent unauthorized issuance?', a:'No — monitoring detects it; a CAA record prevents it. Use both: a CAA record to block unauthorised issuance at the source, and CT Abuse Monitor to catch anything that slips through (e.g. a CA that incorrectly overrides the CAA record).' },
              { q:'Can I monitor domains that are not in my SSLVault inventory?', a:'Yes. CT Abuse Monitor is independent of your cert inventory. You can watch any domain — useful for monitoring brand domains you do not actively manage SSL certs for.' },
            ]}/>
          </Section>
        )}

        {/* ── RENEWAL CALENDAR ── */}
        {filtered.some(s=>s.id==='calendar') && (
          <Section {...SECTIONS[10]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              The Renewal Calendar gives you a visual overview of every certificate's expiry across time. Day cells are colour-coded by urgency, letting you spot renewal clusters, upcoming busy periods, and any cert that may have fallen through the cracks.
            </p>
            <Step n={1} title="Navigate to Intelligence → Renewal Calendar">
              Certs are shown as coloured cells on a calendar grid. Switch between month, week, and year views to see the density of upcoming renewals.
            </Step>
            <Step n={2} title="Colour coding">
              <Table headers={['Colour','Meaning','Recommended action']} rows={[
                ['🔴 Red','Expiring within 7 days','Renew immediately — or verify auto-renew triggered'],
                ['🟡 Amber','Expiring within 30 days','Auto-renew will fire within a few days — verify auto-renew is ON'],
                ['🟢 Green','Healthy — more than 30 days remaining','No action needed'],
              ]}/>
            </Step>
            <Step n={3} title="Click any cell for cert detail">
              Clicking a calendar cell expands the certificate details: domain, issuer, current expiry, auto-renew status, and install method (agent / cPanel / manual). You can toggle auto-renew directly from the calendar detail panel.
            </Step>
            <Note type="info">With CA/B Forum 200-day validity now in effect, renewals occur roughly every 170 days. The year view is the most useful perspective — it shows the full renewal rhythm of your fleet and lets you spot whether any domain will hit a renewal during a change-freeze window.</Note>
            <FAQ items={[
              { q:'Can I export the renewal calendar?', a:'Yes. Click Export (top right of the calendar) to download a CSV of all certs with their expiry dates, auto-renew status, and install method. Import this into Google Calendar or Outlook to layer certificate renewals alongside other operational events.' },
              { q:'Why does a certificate not appear on the calendar?', a:'Certs appear only when they are in your SSLVault inventory with a known expiry date. Certs discovered via CT Log Discovery but not yet imported into SSLVault will not appear. Import them by issuing a replacement through SSLVault.' },
              { q:'Can I set a custom reminder date for a specific certificate?', a:'Not currently — reminders fire at the standard 30, 14, and 7-day thresholds. Custom reminder windows are on the product roadmap. Until then, use the CSV export to set calendar reminders in your preferred tool.' },
            ]}/>
          </Section>
        )}

        {/* ── TROUBLESHOOTING ── */}
        {filtered.some(s=>s.id==='troubleshoot') && (
          <Section {...SECTIONS[11]}>
            {[
              {
                q:'Agent not appearing after install',
                a:'Generate a fresh install token from Servers & agents (tokens expire after 1 hour) and re-run the install command. Then check:',
                code:'sudo journalctl -u sslvault-agent -n 100',
                tip:'Common causes: firewall blocking outbound HTTPS to easysecurity.in on port 443, or the install token was already used or expired. The agent polls every 5 minutes — allow up to 5 minutes before concluding it is not registering.'
              },
              {
                q:'DCV failing — CNAME record not found by GoGetSSL',
                a:'Verify the CNAME was actually written by checking your DNS:',
                code:'dig CNAME _your-validation-label.yourdomain.com',
                tip:'DNS propagation can take 30–120 seconds on Cloudflare and up to 10 minutes on slower providers. If using a connected DNS provider, check the provider credential has Zone:DNS:Edit scope for that specific zone. If the record is present but DCV still fails, the validation label format may have changed — delete and reissue to regenerate a fresh CNAME challenge.'
              },
              {
                q:'Certificate installed on server but HTTPS not working',
                a:'The agent always writes cert files to disk even if the web server config update fails. Check the web server config:',
                code:'sudo nginx -t',
                tip:'If nginx -t reports a syntax error, the agent rolls back to the previous working config automatically. Fix the syntax error in your config, then re-dispatch from Inventory. For Apache: sudo apachectl configtest'
              },
              {
                q:'cPanel install fails — API error',
                a:'Check the exact error message in the Install log (Inventory → cert row → Install history). Common causes:',
                code:null,
                tip:'(1) API token expired or lacks SSL permissions — regenerate in cPanel → Security → Manage API Tokens. (2) Domain in SSLVault does not exactly match a domain in the cPanel account. (3) cPanel hostname is wrong — try the server\'s IP address instead of hostname. (4) Port 2083 blocked — contact your host if they use a non-standard cPanel port.'
              },
              {
                q:'Auto-renew not firing — cert is past 30 days to expiry',
                a:'Check auto-renew is toggled ON in Inventory for the specific cert. Also verify:',
                code:null,
                tip:'(1) For agent renewals: the agent must be online and polling (check Servers & agents for last-seen time). (2) For cPanel renewals: verify the cPanel API token is still valid. (3) If DCV automation is missing (no DNS provider), the renew cron will issue a new cert but DCV will stall waiting for manual completion.'
              },
              {
                q:'CertVault reveal — password not accepted',
                a:'CertVault requires your current SSLVault account password (not an API key). After 3 consecutive failed attempts, the reveal function locks for 15 minutes.',
                code:null,
                tip:'If you recently changed your SSLVault password, use the new password. If locked, wait 15 minutes. If you have forgotten your password, use the account password reset flow — CertVault re-authentication uses the same credential.'
              },
            ].map((item, i, arr) => (
              <div key={i} style={{ marginBottom:i<arr.length-1?26:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.red, marginTop:6, flexShrink:0 }}/>
                  <div style={{ fontSize:14, fontWeight:600, color:C.heading }}>{item.q}</div>
                </div>
                <div style={{ paddingLeft:16, fontSize:13.5, color:C.body, lineHeight:1.8 }}>
                  {item.a}
                  {item.code && <Code code={item.code}/>}
                  {item.tip && <Note type="tip">{item.tip}</Note>}
                </div>
              </div>
            ))}
            <FAQ items={[
              { q:'Where can I see logs for a specific agent job?', a:'In Inventory, expand the cert row and click Install history. Each dispatch shows its job ID, the agent it was sent to, timestamps for each stage (queued → picked up → installed → verified), and the full output log if the job failed.' },
              { q:'How do I completely remove and re-register an agent?', a:'On the server: sudo systemctl stop sslvault-agent && sudo rm -rf /opt/sslvault-agent. Then in SSLVault, delete the server from Servers & agents and generate a fresh install token. Re-run the install command on the server. This is a clean slate — all existing certificate associations to that server will need to be re-dispatched.' },
            ]}/>
          </Section>
        )}

        {/* ── CERTBIND ── */}
        {filtered.some(s=>s.id==='certbind') && (
          <Section {...SECTIONS[12]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>
              CertBind is SSLVault's Active Certificate Binding Verification engine. It continuously proves — cryptographically — that the private key deployed on your server is mathematically paired with the certificate in your inventory, and that the certificate served over TLS matches what was issued. Traditional certificate lifecycle management tools track what was issued; CertBind verifies what is actually running.
            </p>

            <div style={{ background:C.tealBg, border:`1px solid ${C.tealBd}`, borderRadius:9, padding:'14px 16px', marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.tealDk, marginBottom:8 }}>Why this matters</div>
              <div style={{ fontSize:13, color:C.body, lineHeight:1.75 }}>
                A certificate can be valid. The server can be running. HTTPS can work. And your organisation can still be operating with a key-cert mismatch — serving a stale cert, a cert from a rogue CA, or a cert that differs across load balancer nodes. Standard monitoring misses all of this. CertBind closes that gap with four independent cryptographic verification layers.
              </div>
            </div>

            <Step n={1} title="Four verification layers run on every check">
              <Table headers={['Layer','What it verifies','Requires']} rows={[
                ['1 — Key-Cert Binding Proof','Agent signs a SSLVault-issued nonce with the deployed private key. SSLVault verifies the signature against the cert public key. Proves key on disk is paired with the issued cert without the key leaving the server.','Persistent agent'],
                ['2 — Live TLS Fingerprint','SHA-256 fingerprint of the cert served over TLS compared against the fingerprint of the issued cert in inventory. Detects silent cert swaps, wrong cert in load balancer pool, or staging cert accidentally pushed to production.','TLS probe (no agent needed)'],
                ['3 — Chain Integrity','Full chain verified: leaf → intermediate → root. Unexpected intermediates flagged. Detects SSL inspection proxies inserting their own intermediates into the chain.','Persistent agent'],
                ['4 — Multi-Node Consistency','All IPs in a load balancer pool checked independently. Partial deployments — cert updated on 3 of 7 nodes — are flagged within 5 minutes.','Persistent agent'],
              ]}/>
            </Step>

            <Step n={2} title="Understanding binding statuses">
              <Table headers={['Status','Meaning','Action required']} rows={[
                ['bound','Full cryptographic proof. Key ↔ cert ↔ TLS all verified.','None'],
                ['key_mismatch','Private key on server does not match the issued certificate. Critical security state.','Re-install certificate immediately via SSLVault'],
                ['cert_mismatch','Certificate served over TLS differs from certificate in inventory.','Check web server config; re-dispatch from Inventory'],
                ['chain_anomaly','Unexpected intermediate CA in chain. Possible SSL inspection proxy.','Investigate proxy appliance; mark Known if authorised'],
                ['partial_deploy','Some nodes in load balancer pool have not received the updated cert.','Re-dispatch to all agents in the pool'],
                ['unreachable','TLS endpoint not responding on port 443.','Check server, firewall, or DNS resolution'],
                ['pending','Verification not yet run or currently in progress.','Click Run check for an immediate on-demand check'],
              ]}/>
            </Step>

            <Step n={3} title="Navigate to Security → CertBind">
              Click any certificate row to see the 4-layer breakdown with pass/fail per layer. Click <strong>Run check</strong> for an immediate on-demand verification. When a persistent agent is connected, checks run automatically every 5 minutes on the agent's poll cycle.
            </Step>

            <Note type="danger">A <strong>key_mismatch</strong> status means the private key on your server is from a different certificate issuance than the certificate installed. This is a critical state — HTTPS will appear to work but clients with strict pinning or HPKP may reject the connection. Re-install via SSLVault immediately to restore a matched key-cert pair.</Note>

            <Note type="warning">Layer 1 (key-cert binding proof) requires the Persistent Agent. Layer 2 (TLS fingerprint) runs via TLS probe and is available for all certificates regardless of whether an agent is installed. Install the agent to enable all four layers.</Note>

            <Step n={4} title="Compliance relevance">
              CertBind check history is exportable from <strong>Security → CertBind → Export log</strong>. This log serves as evidence for: PCI-DSS 4.0 Requirement 12.3.3 (continuous cert monitoring in the CDE), NIST SP 800-57 (key-cert binding verification), and ISO 27001:2022 Annex A.8.24 (cryptographic key management controls).
            </Step>

            <FAQ items={[
              { q:'Does CertBind require the Persistent Agent for basic operation?', a:'Layer 2 (TLS fingerprint check) works without an agent — SSLVault performs a TLS handshake from the outside and compares fingerprints. This alone catches wrong-cert and cert-swap issues. Layers 1, 3, and 4 require the Persistent Agent for full cryptographic binding proof and multi-node checks.' },
              { q:'How often do checks run automatically?', a:'When a Persistent Agent is connected, CertBind checks run on every agent poll cycle — every 5 minutes. For certs without an agent, Layer 2 TLS probe checks are scheduled every 15 minutes.' },
              { q:'Can I disable CertBind for a specific certificate?', a:'Yes. In Security → CertBind, toggle monitoring off for any individual cert. This is occasionally useful during planned maintenance windows. SSLVault will resume checks automatically when you re-enable it.' },
              { q:'What is a chain anomaly and should I be worried?', a:'A chain anomaly means the TLS certificate chain on your server contains an intermediate CA that was not in the original issued chain. The most common cause is a corporate SSL inspection proxy (e.g. Zscaler, Palo Alto) that re-signs traffic with its own intermediate. If you recognise the intermediate as your corporate proxy, mark it Known. If you do not recognise it, investigate immediately.' },
            ]}/>
          </Section>
        )}

        {filtered.some(s=>s.id==='mcp') && (
          <Section {...SECTIONS[13]}>
            <div style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:20 }}>
              SSLVault has an <strong style={{color:C.heading}}>MCP server</strong> — a connection that lets AI assistants like Claude Desktop, Cursor, and Microsoft Copilot manage your certificates using plain English. No dashboards, no forms. You just type what you want and the AI does it.
            </div>

            <Note type="info">
              <strong>No technical knowledge required.</strong> If you can install an app and paste a line of text, you can use this. The AI handles everything — it knows your certificates, your servers, and what actions to take.
            </Note>

            {/* ── WHAT IS MCP ── */}
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, margin:'24px 0 10px', paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              What is MCP and why does it matter?
            </div>
            <div style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:16 }}>
              MCP (Model Context Protocol) is an open standard — think of it like a universal plug that lets any AI assistant connect to any tool. When you connect SSLVault to Claude Desktop via MCP, the AI can see your certificates and take real actions on your behalf.
            </div>

            {/* Visual explainer */}
            <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:'20px 24px', margin:'16px 0 24px', fontFamily:MONO }}>
              <div style={{ display:'flex', alignItems:'center', gap:0, flexWrap:'wrap' }}>
                {[
                  { icon:'🧑', label:'You', sub:'type in plain English' },
                  { arrow:true },
                  { icon:'🤖', label:'Claude Desktop', sub:'AI understands intent', color:C.purple },
                  { arrow:true },
                  { icon:'🔌', label:'MCP Server', sub:'SSLVault connection point', color:C.teal },
                  { arrow:true },
                  { icon:'🛡️', label:'SSLVault', sub:'acts on your certs', color:'#1f5c4e' },
                ].map((item, i) => item.arrow ? (
                  <div key={i} style={{ fontSize:18, color:C.muted, padding:'0 8px' }}>→</div>
                ) : (
                  <div key={i} style={{ textAlign:'center', minWidth:110 }}>
                    <div style={{ fontSize:28, marginBottom:4 }}>{item.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:item.color||C.heading }}>{item.label}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:8 }}>
              <strong style={{color:C.heading}}>Example conversations you can have:</strong>
            </div>
            {[
              { you: '"Show me all my certificates"', ai: 'Lists every cert — domain, days left, install status, auto-renew' },
              { you: '"Which certs expire in the next 30 days?"', ai: 'Filters and shows only expiring certs with exact dates' },
              { you: '"What is my fleet posture score?"', ai: 'Returns your 0–100 security score with breakdown + CA/B mandate readiness' },
              { you: '"Check CA/B Forum compliance for my fleet"', ai: 'Full report: which certs meet 2026/2027/2029 mandates, which need action' },
              { you: '"Issue a new cert for api.mycompany.com"', ai: 'Places the order, validates DNS, and tells you when it\'s issued' },
              { you: '"Install the cert on my cPanel server"', ai: 'Triggers installation and confirms it\'s live' },
              { you: '"Show my VPS agents"', ai: 'Lists all connected servers with their last-seen time' },
            ].map((ex, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8, background:C.bg3, borderRadius:8, padding:'10px 14px', border:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>YOU SAY</div>
                  <div style={{ fontSize:12, color:C.purple, fontStyle:'italic' }}>{ex.you}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>AI DOES</div>
                  <div style={{ fontSize:12, color:C.body }}>{ex.ai}</div>
                </div>
              </div>
            ))}

            {/* ── WHAT YOU NEED ── */}
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, margin:'28px 0 10px', paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              What you need before starting
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10, marginBottom:20 }}>
              {[
                { icon:'💻', label:'Claude Desktop app', desc:'Free download. Works on Mac and Windows.', link:'https://claude.ai/download', linkLabel:'Download Claude Desktop' },
                { icon:'🔑', label:'Your SSLVault JWT token', desc:'A secret key that proves you are logged in to SSLVault.', link:null, linkLabel:null },
                { icon:'📝', label:'A text editor', desc:'Notepad on Windows, TextEdit on Mac — to paste one config snippet.', link:null, linkLabel:null },
              ].map((item, i) => (
                <div key={i} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{item.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:4 }}>{item.label}</div>
                  <div style={{ fontSize:12, color:C.body, lineHeight:1.6 }}>{item.desc}</div>
                  {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ display:'inline-block', marginTop:8, fontSize:11, color:C.teal }}>{item.linkLabel} →</a>}
                </div>
              ))}
            </div>

            {/* ── STEP BY STEP ── */}
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, margin:'28px 0 16px', paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              Step-by-step setup (takes about 5 minutes)
            </div>

            <Step n={1} title="Install Claude Desktop on your computer">
              <div>Go to <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer" style={{color:C.teal}}>claude.ai/download</a> and download the app for your operating system (Mac or Windows). Install it like any other app. Sign in with a free Anthropic account.</div>
              <Note type="tip">Claude Desktop is different from the Claude website. You need the <strong>app</strong> (downloaded and installed), not the browser version, for MCP to work.</Note>
            </Step>

            <Step n={2} title="Get your SSLVault login token">
              <div style={{marginBottom:10}}>Your token proves to the MCP server that it is really you. Here is how to find it:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { n:'A', text:'Open easysecurity.in in your browser and log in to SSLVault.' },
                  { n:'B', text:'Press F12 on your keyboard (or right-click → Inspect). This opens DevTools.' },
                  { n:'C', text:'Click the Network tab at the top of DevTools.' },
                  { n:'D', text:'Click anywhere on the SSLVault page (for example, click Dashboard).' },
                  { n:'E', text:'A list of requests appears. Click on any one that says "functions" in its name.' },
                  { n:'F', text:'In the panel that opens, click the Headers tab.' },
                  { n:'G', text:'Scroll down to find a line that starts with Authorization: Bearer. The long string after "Bearer " is your token. Copy everything after "Bearer " (not including the word Bearer itself).' },
                ].map(item => (
                  <div key={item.n} style={{ display:'flex', gap:10, background:C.bg3, borderRadius:8, padding:'8px 12px', border:`1px solid ${C.border}` }}>
                    <div style={{ width:20, height:20, borderRadius:4, background:C.teal, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{item.n}</div>
                    <div style={{ fontSize:12.5, color:C.body }}>{item.text}</div>
                  </div>
                ))}
              </div>
              <Note type="warning">Your token is like a password. Do not share it with anyone. It gives full access to your SSLVault account.</Note>
            </Step>

            <Step n={3} title="Find the Claude Desktop config file">
              <div style={{marginBottom:10}}>Claude Desktop reads a config file to know which tools to connect. You need to open this file and add SSLVault to it.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.heading, marginBottom:6 }}>🍎 On Mac</div>
                  <div style={{ fontSize:11.5, color:C.body, lineHeight:1.7 }}>Open Finder → press <strong>⌘ Shift G</strong> → paste this path and press Enter:</div>
                  <Code code="~/Library/Application Support/Claude/" lang="path" />
                  <div style={{ fontSize:11.5, color:C.body }}>Open the file named <strong>claude_desktop_config.json</strong></div>
                </div>
                <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.heading, marginBottom:6 }}>🪟 On Windows</div>
                  <div style={{ fontSize:11.5, color:C.body, lineHeight:1.7 }}>Press <strong>Win + R</strong> → paste this and press Enter:</div>
                  <Code code="%APPDATA%\Claude\" lang="path" />
                  <div style={{ fontSize:11.5, color:C.body }}>Open the file named <strong>claude_desktop_config.json</strong></div>
                </div>
              </div>
              <Note type="tip">If the file does not exist yet, create a new file called <strong>claude_desktop_config.json</strong> in that folder.</Note>
            </Step>

            <Step n={4} title="Paste the SSLVault MCP config">
              <div style={{marginBottom:10}}>Open the config file in any text editor. Replace its entire contents with the text below. Then replace <strong style={{color:C.amber}}>PASTE_YOUR_TOKEN_HERE</strong> with the token you copied in Step 2.</div>
              <Code lang="json" code={`{
  "mcpServers": {
    "sslvault": {
      "url": "https://frthcwkntciaakqsppss.supabase.co/functions/v1/sslvault-mcp",
      "headers": {
        "Authorization": "Bearer PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}`} />
              <Note type="danger">Make sure your token has no extra spaces at the start or end. The file must be valid JSON — every bracket and comma must be in place exactly as shown above.</Note>
            </Step>

            <Step n={5} title="Restart Claude Desktop and verify the connection">
              <div style={{marginBottom:12}}>Save the config file, then fully quit Claude Desktop and re-open it. Here is how to confirm SSLVault is connected:</div>
              {[
                { step:'A', text:'Open Claude Desktop.' },
                { step:'B', text:'Start a new conversation.' },
                { step:'C', text:'Look for a small plug or tools icon near the bottom of the chat box. Click it.' },
                { step:'D', text:'You should see "sslvault" listed with 10 tools. If you see it — you are connected!' },
                { step:'E', text:'Type: "list my certificates" and press Enter. SSLVault should respond with your certs.' },
              ].map(item => (
                <div key={item.step} style={{ display:'flex', gap:10, background:C.bg3, borderRadius:8, padding:'8px 12px', border:`1px solid ${C.border}`, marginBottom:6 }}>
                  <div style={{ width:20, height:20, borderRadius:4, background:C.teal, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{item.step}</div>
                  <div style={{ fontSize:12.5, color:C.body }}>{item.text}</div>
                </div>
              ))}
            </Step>

            {/* ── COMPLETE TOOL LIST ── */}
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, margin:'28px 0 12px', paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              What you can ask the AI to do — all 10 tools
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { tool:'list_certs',              ask:'"Show me all my certificates"',                   what:'Lists every cert with domain, expiry, status, install state' },
                { tool:'get_cert',                ask:'"Give me details for easysecurity.in"',            what:'Full detail for one cert — dates, DCV, vault, install info' },
                { tool:'get_posture',             ask:'"What is my fleet posture score?"',               what:'0–100 security score with breakdown across 5 dimensions' },
                { tool:'check_mandate_readiness', ask:'"Am I CA/B Forum compliant?"',                   what:'Full SC-081v3 compliance report for 2026 / 2027 / 2029' },
                { tool:'issue_cert',              ask:'"Issue a cert for shop.example.com"',             what:'Places GoGetSSL order, DCV, polls until issued' },
                { tool:'renew_cert',              ask:'"Renew my easysecurity.in cert"',                 what:'New 12-month GoGetSSL order (new billing)' },
                { tool:'reissue_cert',            ask:'"Reissue freecerts.site with a new key"',         what:'Fresh RSA-2048 key on same order — no new billing' },
                { tool:'check_cert_status',       ask:'"Has my cert been issued yet?"',                  what:'Force-syncs from GoGetSSL and returns current status' },
                { tool:'install_cert',            ask:'"Install the cert on my cPanel server"',          what:'Triggers cPanel auto-install via stored credential' },
                { tool:'list_agents',             ask:'"What servers are connected?"',                   what:'All VPS agents — hostname, IP, status, last seen' },
              ].map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr', gap:10, background:C.bg2, borderRadius:8, padding:'10px 14px', border:`1px solid ${C.border}`, alignItems:'start' }}>
                  <div style={{ fontFamily:MONO, fontSize:10.5, color:C.teal, paddingTop:2 }}>{item.tool}</div>
                  <div style={{ fontSize:12, color:C.purple, fontStyle:'italic' }}>{item.ask}</div>
                  <div style={{ fontSize:12, color:C.body }}>{item.what}</div>
                </div>
              ))}
            </div>

            {/* ── TROUBLESHOOTING ── */}
            <div style={{ fontSize:15, fontWeight:600, color:C.heading, margin:'28px 0 12px', paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              If something is not working
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { problem:'Claude says "I don\'t have access to SSLVault tools"', fix:'The config file was not saved correctly, or Claude Desktop was not fully restarted. Quit Claude completely (not just close the window — use File → Quit), then re-open it.' },
                { problem:'"Not authenticated" message when asking about certs', fix:'Your JWT token has expired. Tokens expire after a few hours. Go back to Step 2, copy a fresh token from DevTools, and update the config file. Restart Claude.' },
                { problem:'"sslvault" not showing in the tools list', fix:'Open the config file and check for typos. Every bracket, quote, and comma must be exactly right. The most common mistake is a missing comma between sections or extra text around the JSON.' },
                { problem:'Claude connects but returns empty results', fix:'Make sure you are logged in to SSLVault and have at least one certificate in your account. The MCP server reads live data — if your account is new and empty, the AI will say so.' },
                { problem:'I accidentally shared my token', fix:'Go to your SSLVault account → Settings → Security and invalidate your session immediately, then log out and log back in to get a fresh token. Update the config file.' },
              ].map((item, i) => (
                <div key={i} style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 16px' }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1f5c4e', marginBottom:5 }}>❌ {item.problem}</div>
                  <div style={{ fontSize:12.5, color:C.body, lineHeight:1.7 }}>✅ {item.fix}</div>
                </div>
              ))}
            </div>

            <FAQ items={[
              { q:'Is my data safe? Can the AI access anything it should not?', a:'Yes, it is safe. The MCP server only exposes 10 specific actions — it cannot access your private keys, payment information, or account password. Every action is scoped to your own account only. The AI cannot act on certs that do not belong to you.' },
              { q:'Does this work with AI tools other than Claude Desktop?', a:'Yes. The SSLVault MCP server is compatible with any MCP-enabled AI: Cursor (a code editor with AI), Microsoft Copilot Studio, and other MCP clients. The connection URL and config format are the same — only the location of the config file differs per tool.' },
              { q:'Can the AI actually issue a certificate without me confirming?', a:'Yes — if you ask it to. This is by design. The power of MCP is that the AI can take actions, not just give advice. If you want a confirmation step, phrase your request as a question first: "What would happen if I issue a cert for example.com?" — the AI will explain before doing anything.' },
              { q:'My token keeps expiring — is there a permanent way to connect?', a:'Supabase JWTs expire after a short period by default. A permanent API token feature for SSLVault MCP is on the roadmap. For now, refreshing the token every time you log in is the standard flow.' },
              { q:'What happens if I revoke my session while Claude Desktop is running?', a:'Any in-progress tool calls will fail with "Not authenticated". Just update the config file with a fresh token and restart Claude Desktop.' },
            ]}/>
          </Section>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
            <div style={{ fontSize:Math.min(32, typeof window !== 'undefined' && window.innerWidth > 768 ? 32 : 24), marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:15, fontWeight:500 }}>No results for "{search}"</div>
            <div style={{ fontSize:13, marginTop:6 }}>Try a different keyword</div>
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ marginTop:48, padding:'24px 28px', background:C.tealBg, border:`1px solid ${C.tealBd}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:4 }}>Still stuck?</div>
            <div style={{ fontSize:13, color:C.body }}>Our support team replies within 24 hours.</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => nav('/install')} style={{ background:C.bg, border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:C.heading, padding:'8px 18px', borderRadius:100 }}>Install guide</button>
            <button onClick={() => window.location.href='mailto:mathimcafee@gmail.com'} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'#1a1a1a', padding:'8px 18px', borderRadius:100 }}>Contact support</button>
          </div>
        </div>

      </div>
    </div>
  )
}
