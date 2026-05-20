// KnowledgeBase.jsx — SSLVault docs
// Owlish white · Inter · no CSS class dependencies
import { useState, useRef, useEffect } from 'react'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const C = {
  bg:'#ffffff', bg2:'#f9fafb', bg3:'#f3f4f6',
  border:'#e5e7eb', border2:'#d1d5db',
  heading:'#0a0a0a', body:'#4b5563', muted:'#9ca3af',
  teal:'#0ea5e9', tealDk:'#0284c7', tealBg:'#f0f9ff', tealBd:'#bae6fd',
  green:'#10b981', greenBg:'#f0fdf4',
  purple:'#7c3aed', purpleBg:'#faf5ff',
  amber:'#d97706', amberBg:'#fffbeb',
  red:'#dc2626', redBg:'#fef2f2',
  ink:'#080c14',
}

// ── Code block ─────────────────────────────────────────────────────────
function Code({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(code) } catch(e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, overflow:'hidden', margin:'14px 0', fontFamily:MONO }}>
      <div style={{ background:'rgba(255,255,255,0.03)', padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c, opacity:.7 }}/>)}
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginLeft:8 }}>{lang}</span>
        </div>
        <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, color:copied?C.green:'rgba(255,255,255,0.4)', fontFamily:MONO, padding:'2px 6px', borderRadius:4, transition:'color .15s' }}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Copied</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
          }
        </button>
      </div>
      <pre style={{ padding:'14px 16px', fontSize:12, lineHeight:1.9, color:'rgba(255,255,255,0.75)', overflowX:'auto', margin:0 }}>{code}</pre>
    </div>
  )
}

// ── Callout ────────────────────────────────────────────────────────────
function Note({ type = 'tip', children }) {
  const styles = {
    tip:     { bg:C.tealBg,   bd:C.tealBd,        color:C.tealDk,  label:'TIP',     icon:'💡' },
    warning: { bg:C.amberBg,  bd:'#fde68a',        color:C.amber,   label:'WARNING', icon:'⚠️' },
    info:    { bg:C.greenBg,  bd:'#bbf7d0',        color:C.green,   label:'INFO',    icon:'ℹ️' },
    danger:  { bg:C.redBg,    bd:'#fecaca',        color:C.red,     label:'IMPORTANT',icon:'🔴' },
  }[type]
  return (
    <div style={{ background:styles.bg, border:`1px solid ${styles.bd}`, borderLeft:`3px solid ${styles.color}`, borderRadius:'0 8px 8px 0', padding:'12px 16px', margin:'14px 0', display:'flex', gap:10 }}>
      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{styles.icon}</span>
      <div style={{ fontSize:13, color:styles.color, lineHeight:1.7 }}><strong>{styles.label}:</strong> {children}</div>
    </div>
  )
}

// ── Step ───────────────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div style={{ display:'flex', gap:16, marginBottom:22 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:C.teal, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{n}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13.5, color:C.body, lineHeight:1.75 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Section accordion ──────────────────────────────────────────────────
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

// ── Table ──────────────────────────────────────────────────────────────
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

const SECTIONS = [
  { id:'getting-started', icon:'⚡', title:'Getting started',          subtitle:'Issue your first cert in minutes',               badge:'Start here', badgeColor:C.teal   },
  { id:'agent',           icon:'🤖', title:'Persistent agent',         subtitle:'Zero-touch VPS installs and renewals',            badge:'VPS',        badgeColor:C.green  },
  { id:'cpanel',          icon:'🏛', title:'cPanel / shared hosting',  subtitle:'No SSH needed — UAPI install',                   badge:'cPanel',     badgeColor:'#6366f1'},
  { id:'dns',             icon:'🌐', title:'DNS providers',            subtitle:'Auto DCV via Cloudflare, Vercel, Route53…',       badge:'DNS-01',     badgeColor:'#06b6d4'},
  { id:'autorenew',       icon:'🔄', title:'Auto-renewal',             subtitle:'Set once, renew forever',                        badge:'Automation', badgeColor:C.amber  },
  { id:'keylocker',       icon:'🔐', title:'KeyLocker',                subtitle:'AES-256-GCM private key vault',                  badge:'Security',   badgeColor:C.purple },
  { id:'readiness',       icon:'📋', title:'47-Day Readiness',         subtitle:'CA/B Forum 2026–2029 compliance',                badge:'CA/B Forum', badgeColor:C.red    },
  { id:'health',          icon:'📈', title:'SSL Health Score',         subtitle:'Grade A+ to F per domain',                       badge:'Monitoring', badgeColor:'#0891b2'},
  { id:'discovery',       icon:'🔍', title:'CT Log Discovery',         subtitle:'Find every cert ever issued for your domains',   badge:'CT Logs',    badgeColor:C.green  },
  { id:'abuse',           icon:'🚨', title:'CT Abuse Monitor',         subtitle:'Detect unauthorised cert issuance',              badge:'Security',   badgeColor:C.red    },
  { id:'calendar',        icon:'📅', title:'Renewal Calendar',         subtitle:'Heatmap of upcoming renewals',                   badge:'Planning',   badgeColor:C.teal   },
  { id:'troubleshoot',    icon:'🔧', title:'Troubleshooting',          subtitle:'Common errors and fixes',                        badge:'Help',       badgeColor:C.muted  },
]

export default function KnowledgeBase({ nav }) {
  const [search, setSearch] = useState('')
  const filtered = SECTIONS.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.subtitle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F, color:C.heading }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <header style={{ background:'rgba(8,12,20,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,4vw,40px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:28, height:28, background:C.teal, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.92)' }}>SSLVault</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:MONO }}>/ Knowledge Base</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/install')} style={{ background:'none', border:`1px solid rgba(255,255,255,0.12)`, cursor:'pointer', fontFamily:F, fontSize:12, color:'rgba(255,255,255,0.5)', padding:'6px 14px', borderRadius:100 }}>Install guide</button>
          <button onClick={() => nav('/auth')} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'white', padding:'7px 18px', borderRadius:100 }}>Get started</button>
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

        {/* ── SECTIONS ── */}

        {filtered.some(s=>s.id==='getting-started') && (
          <Section {...SECTIONS[0]} defaultOpen>
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
              SSLVault verifies you own the domain before issuing. Three methods:
              <Table headers={['Method','How it works']} rows={[
                ['DNS CNAME','Add a CNAME record. Automatic if DNS provider connected.'],
                ['DNS TXT','Add a TXT record. Also automatable.'],
                ['Email','Click approval link sent to admin@, webmaster@, or hostmaster@.'],
              ]}/>
              <Note type="tip">Connect Cloudflare or Vercel under DNS Providers and DCV is fully automatic — zero copy-paste.</Note>
            </Step>
            <Step n={3} title="Certificate appears in Inventory">
              Once issued, your cert appears in <strong>Inventory &amp; Monitor</strong>. Expand any row to see expiry, issuer, PEM files, install button, and private key reveal.
            </Step>
            <Step n={4} title="Install on your server">
              Three paths: <strong>Persistent agent (VPS)</strong> — dispatched automatically. <strong>cPanel</strong> — API token, no SSH. <strong>Manual download</strong> — copy PEM files.
            </Step>
          </Section>
        )}

        {filtered.some(s=>s.id==='agent') && (
          <Section {...SECTIONS[1]}>
            <Step n={1} title="Go to Automation → Servers & agents">
              Click <strong>Install agent</strong> to get your personalised one-line install command with an embedded token.
            </Step>
            <Step n={2} title="Run on your VPS">
              <Code code="curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash" lang="bash"/>
              The agent installs as a systemd service, registers with SSLVault, and appears in the Servers list within 1–2 minutes.
            </Step>
            <Step n={3} title="Verify the agent is running">
              <Code code="sudo systemctl status sslvault-agent" lang="bash"/>
              Status should show <strong style={{ color:C.green }}>active (running)</strong>. The agent polls every 5 minutes for pending jobs.
            </Step>
            <Step n={4} title="Dispatch a certificate">
              In Inventory, click Install on a cert row, select your server, and click Dispatch. The agent installs the cert, updates Nginx/Apache config, and reloads automatically.
            </Step>
            <Note type="info">The agent reports CPU, RAM, and disk usage back to SSLVault. View live health in <strong>Servers &amp; agents</strong> — each card shows health bars and certificates it protects.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='cpanel') && (
          <Section {...SECTIONS[2]}>
            <Step n={1} title="Get your cPanel API token">
              In cPanel → Security → Manage API Tokens → Create Token. Name it <code style={{ background:C.bg3, padding:'1px 6px', borderRadius:4, fontFamily:MONO, fontSize:12 }}>SSLVault</code>.
            </Step>
            <Step n={2} title="Enter credentials in SSLVault">
              In Inventory, click Install on the cert row → select <strong>cPanel</strong> tab → enter hostname, username, and API token.
            </Step>
            <Step n={3} title="SSLVault installs via UAPI">
              SSLVault calls cPanel's UAPI to install certificate and private key directly. No SSH access required.
            </Step>
            <Note type="tip">cPanel installs also auto-renew. SSLVault re-issues the cert and re-installs via UAPI on the renewal date.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='dns') && (
          <Section {...SECTIONS[3]}>
            <Step n={1} title="Go to Automation → DNS Providers">
              Click <strong>Add provider</strong> and select your DNS host.
            </Step>
            <Step n={2} title="Enter API credentials">
              <Table headers={['Provider','Credential needed']} rows={[
                ['Cloudflare','API Token with Zone:DNS:Edit permission'],
                ['Vercel','Access Token from Settings → Tokens'],
                ['Route53','AWS Access Key ID + Secret with Route53 write access'],
                ['Namecheap','API key + IP whitelist in Namecheap dashboard'],
                ['GoDaddy','API Key + Secret from developer.godaddy.com'],
                ['DigitalOcean','Personal Access Token'],
              ]}/>
            </Step>
            <Step n={3} title="How it works">
              During issuance or renewal, SSLVault automatically adds the ACME challenge record, waits for DNS propagation, completes DCV, then removes the record. Fully automatic — no copy-pasting.
            </Step>
            <Note type="tip">You can connect multiple DNS providers for different domains. SSLVault matches each domain to the correct provider automatically.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='autorenew') && (
          <Section {...SECTIONS[4]}>
            <Step n={1} title="Enable auto-renew on a certificate">
              In Inventory, expand a cert row. Toggle <strong>Auto-renew</strong> to ON. SSLVault renews automatically 30 days before expiry.
            </Step>
            <Step n={2} title="Requirements for fully automatic renewal">
              DNS provider connected (for auto-DCV) + agent installed or cPanel credentials saved (for auto-install). Without these, SSLVault renews the cert but you install manually.
            </Step>
            <Step n={3} title="Renewal notifications">
              Email alerts sent at 30, 14, and 7 days before expiry. After renewal, you receive a confirmation with the new expiry date.
            </Step>
            <Note type="info">The <strong>Renewal Calendar</strong> shows a heatmap of all upcoming renewals. Red = expiring soon, green = healthy.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='keylocker') && (
          <Section {...SECTIONS[5]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>
              KeyLocker automatically stores the private key for every certificate issued. Keys are encrypted with AES-256-GCM using envelope encryption (DEK wrapped with KEK). Keys are never stored or transmitted in plaintext.
            </p>
            <Step n={1} title="Reveal a private key">
              Go to <strong>Security → KeyLocker</strong>, click <strong>Reveal key</strong>. Re-enter your SSLVault password (re-authentication required). After verification, the key is shown masked for 30 seconds — copy-only, no download.
            </Step>
            <Step n={2} title="Rotate a key">
              Click <strong>Rotate key</strong> to generate a new certificate and private key. Old key archived for 30 days then permanently destroyed. Zero downtime.
            </Step>
            <Step n={3} title="Audit log">
              Every access (reveal, copy, rotate, archive) is logged with timestamp and user. Export as CSV for SOC 2 or ISO 27001 compliance.
            </Step>
            <Note type="warning">The 30-second reveal window and copy-only design are intentional security controls. Every access is logged and cannot be disabled.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='readiness') && (
          <Section {...SECTIONS[6]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>
              The CA/B Forum is reducing maximum certificate validity. SSLVault scores every cert against these milestones and shows what needs to change.
            </p>
            <Table headers={['Date','Max validity','Status']} rows={[
              ['March 15, 2026','200 days','🔴 In effect — audit your fleet now'],
              ['March 15, 2027','100 days','🟡 Upcoming — automation required'],
              ['March 15, 2029','47 days','🟢 Planned — zero-touch automation needed'],
            ]}/>
            <Step n={1} title="Check your fleet readiness">
              Navigate to <strong>Security → 47-Day Readiness</strong>. Each cert gets a score 0–100 and a label: Ready / At Risk / Will Break. Click any row to expand the checklist.
            </Step>
            <Step n={2} title="The automation checklist">
              Each cert is checked for: auto-renew enabled, DNS provider connected, agent/cPanel configured, validity within 200-day rule, private key in KeyLocker.
            </Step>
            <Note type="danger">Certificates with validity over 200 days issued after March 15, 2026 will be rejected by browsers. Review your fleet now.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='health') && (
          <Section {...SECTIONS[7]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>
              Navigate to <strong>Security → Health Scores</strong>. Enter any domain and click Scan. SSLVault checks TLS reachability, HSTS, CAA record, expiry, and security headers.
            </p>
            <Table headers={['Grade','Score','Meaning']} rows={[
              ['A+','95–100','TLS valid, HSTS with long max-age, CAA present, expiry > 30d'],
              ['A','85–94','Good posture, minor header gaps'],
              ['B','70–84','Missing HSTS or CAA'],
              ['C / D','50–69','Expiring soon or missing security headers'],
              ['F','< 50','Cert expired, TLS unreachable, or no cert found'],
            ]}/>
            <Note type="tip">Scores use crt.sh CT log data for real issuer and expiry, supplemented with live HTTP header checks.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='discovery') && (
          <Section {...SECTIONS[8]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>Navigate to <strong>Inventory → Discovery</strong>. Three scan modes:</p>
            <Table headers={['Mode','What it does']} rows={[
              ['CT Logs','Queries crt.sh for all certs ever issued for a domain. Shows issuer, expiry, SANs.'],
              ['Connect DNS','Scans all DNS records and checks TLS on each hostname found.'],
              ['Scan a Server','Enter IP/hostname and port — connects directly to check the served cert.'],
            ]}/>
          </Section>
        )}

        {filtered.some(s=>s.id==='abuse') && (
          <Section {...SECTIONS[9]}>
            <Step n={1} title="Add a domain to watch">
              Click <strong>Add domain</strong> in the Watched domains panel. SSLVault monitors CT logs for any new certificate issuance for that domain.
            </Step>
            <Step n={2} title="Reviewing alerts">
              Flagged certs appear with issuer, issue date, SANs, and CT source. Mark as Known (legitimate) or Suspicious (possible abuse).
            </Step>
            <Note type="warning">If you see a cert issued by an unknown CA for your domain, it may indicate domain hijacking or a misconfigured CAA record.</Note>
          </Section>
        )}

        {filtered.some(s=>s.id==='calendar') && (
          <Section {...SECTIONS[10]}>
            <p style={{ fontSize:13.5, color:C.body, lineHeight:1.8, marginBottom:18 }}>Navigate to <strong>Intelligence → Renewal Calendar</strong>. Certs shown as coloured day cells across month, week, or year views.</p>
            <Table headers={['Colour','Meaning']} rows={[
              ['🔴 Red','Expiring within 7 days — urgent'],
              ['🟡 Amber','Expiring within 30 days — renewal recommended'],
              ['🟢 Green','Healthy — more than 30 days remaining'],
            ]}/>
          </Section>
        )}

        {filtered.some(s=>s.id==='troubleshoot') && (
          <Section {...SECTIONS[11]}>
            {[
              { q:'Agent not appearing after install', a:'Check logs: ', code:'sudo journalctl -u sslvault-agent -n 50', tip:'Common causes: firewall blocking outbound HTTPS to easysecurity.in, or install token expired (1-hour TTL). Generate a fresh token from Servers & agents.' },
              { q:'DCV failing — CNAME not found', a:'DNS changes can take up to 48 hours. Wait 10–15 min then retry. Verify with: ', code:'dig CNAME _your-validation-record.yourdomain.com', tip:'Connecting a DNS provider (Cloudflare, Vercel) eliminates this — SSLVault adds and verifies records automatically.' },
              { q:'Certificate installed but HTTPS not working', a:'Cert files are always written to disk even if web server config update fails. Check: ', code:'sudo nginx -t', tip:'If the config test failed, the agent restores the original config. Fix syntax errors then re-dispatch.' },
              { q:'KeyLocker reveal — password not accepted', a:'KeyLocker requires your current SSLVault account password. After 3 failed attempts, reveal locks for 15 minutes.', code:null, tip:null },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom:i<3?24:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.red, marginTop:6, flexShrink:0 }}/>
                  <div style={{ fontSize:14, fontWeight:600, color:C.heading }}>{item.q}</div>
                </div>
                <div style={{ paddingLeft:16, fontSize:13.5, color:C.body, lineHeight:1.8 }}>
                  {item.a}{item.code && <Code code={item.code}/>}
                  {item.tip && <Note type="tip">{item.tip}</Note>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
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
            <button onClick={() => window.location.href='mailto:mathimcafee@gmail.com'} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'white', padding:'8px 18px', borderRadius:100 }}>Contact support</button>
          </div>
        </div>

      </div>
    </div>
  )
}
