import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Shield, Server, BookOpen, Zap, Globe, Key, ArrowRight, RefreshCw, Search, Activity } from 'lucide-react'

// ── Reusable components ──────────────────────────────────────────────

function Pill({ color='#2563eb', bg='#eff6ff', border='#bfdbfe', children }) {
  return (
    <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color, letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:10, background:bg, border:`1px solid ${border}`, borderRadius:100, padding:'4px 14px' }}>
      {children}
    </div>
  )
}

function SectionHeader({ pill, pillColor, pillBg, pillBorder, title, subtitle }) {
  return (
    <div style={{ textAlign:'center', marginBottom:28 }}>
      <Pill color={pillColor} bg={pillBg} border={pillBorder}>{pill}</Pill>
      <h2 style={{ fontSize:26, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px', marginBottom:10, lineHeight:1.15 }}>{title}</h2>
      {subtitle && <p style={{ color:'#64748b', fontSize:14, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>{subtitle}</p>}
    </div>
  )
}

function Accordion({ title, icon, color='#2563eb', bg='#eff6ff', border='#bfdbfe', children, defaultOpen=false }) {
  const [show, setShow] = useState(defaultOpen)
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', marginBottom:10, boxShadow:'0 1px 4px rgba(15,23,42,0.04)' }}>
      <div onClick={() => setShow(s=>!s)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', cursor:'pointer', background: show ? bg : 'white', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:bg, border:`1.5px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{icon}</div>
          <span style={{ fontWeight:700, fontSize:13, color:'#0f172a', letterSpacing:'-0.1px' }}>{title}</span>
        </div>
        <div style={{ width:26, height:26, borderRadius:'50%', background: show ? color : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {show ? <ChevronUp size={12} color='white'/> : <ChevronDown size={12} color='#64748b'/>}
        </div>
      </div>
      {show && <div style={{ padding:'18px 20px', borderTop:`1px solid ${border}`, background:'white' }}>{children}</div>}
    </div>
  )
}

function Step({ n, title, color='#2563eb', terminal, children }) {
  return (
    <div style={{ display:'flex', gap:16, marginBottom:24 }}>
      <div style={{ width:30, height:30, borderRadius:'50%', background:'white', color, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0, marginTop:1, boxShadow:`0 2px 8px ${color}20` }}>{n}</div>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:800, fontSize:13, marginBottom:8, color:'#0f172a', letterSpacing:'-0.1px' }}>{title}</p>
        {children}
        {terminal && (
          <div style={{ background:'#0f172a', borderRadius:10, marginTop:10, overflow:'hidden', border:'1px solid #1e293b' }}>
            <div style={{ background:'#1e293b', padding:'7px 14px', display:'flex', gap:5, alignItems:'center' }}>
              {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}
              <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginLeft:8 }}>terminal</span>
            </div>
            <pre style={{ margin:0, padding:'13px 16px', color:'#e2e8f0', fontSize:11, fontFamily:'monospace', lineHeight:1.8, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{terminal}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

function Note({ type='info', children }) {
  const s = { info:{bg:'#eff6ff',border:'#bfdbfe',color:'#1d4ed8',icon:'ℹ'}, warn:{bg:'#fffbeb',border:'#fde68a',color:'#92400e',icon:'⚠'}, success:{bg:'#ecfdf5',border:'#a7f3d0',color:'#047857',icon:'✅'}, tip:{bg:'#f5f3ff',border:'#ddd6fe',color:'#6d28d9',icon:'💡'} }[type] || { bg:'#eff6ff',border:'#bfdbfe',color:'#1d4ed8',icon:'ℹ' }
  return (
    <div style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:9, padding:'9px 13px', fontSize:12, marginBottom:10, lineHeight:1.65, color:s.color, fontWeight:500 }}>
      <strong style={{ marginRight:6 }}>{s.icon}</strong>{children}
    </div>
  )
}

function Card({ bg, border, icon, title, desc }) {
  return (
    <div style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
      <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
      <div><div style={{ fontWeight:700, fontSize:13, color:'#0f172a', marginBottom:3 }}>{title}</div><div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{desc}</div></div>
    </div>
  )
}

function SupportGrid({ items }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
      {items.map(([icon, text, ok]) => (
        <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color: ok ? '#475569' : '#94a3b8' }}>
          <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span> {text}
        </div>
      ))}
    </div>
  )
}

// ── Quick link cards ──────────────────────────────────────────────────
const QUICK_LINKS = [
  { icon:Zap,       title:'Getting Started',       desc:'Issue your first cert in 60 seconds',       color:'#d97706', bg:'#fffbeb', border:'#fde68a',  anchor:'#getting-started' },
  { icon:Server,    title:'Persistent Agent',       desc:'Zero-touch VPS installs and renewals',      color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe',  anchor:'#persistent-agent' },
  { icon:Shield,    title:'Shared Hosting (cPanel)',desc:'PHP agent — no SSH needed',                 color:'#059669', bg:'#ecfdf5', border:'#a7f3d0',  anchor:'#shared-hosting' },
  { icon:RefreshCw, title:'Auto-Renewal',           desc:'Set it once, renew forever automatically',  color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe',  anchor:'#auto-renewal' },
  { icon:Key,       title:'DNS Providers',          desc:'Auto-add TXT records, no copy-paste',       color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd',  anchor:'#dns-providers' },
  { icon:Search,    title:'CT Log Discovery',       desc:'Find certs issued for your domains',        color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8',  anchor:'#ct-discovery' },
  { icon:Activity,  title:'SSL Monitor',            desc:'Track expiry for any domain, no login',     color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0',  anchor:'#monitor' },
  { icon:BookOpen,  title:'Troubleshooting',        desc:'Common errors and fixes',                   color:'#dc2626', bg:'#fef2f2', border:'#fecaca',  anchor:'#troubleshooting' },
]

export default function KnowledgeBase({ nav }) {
  return (
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      <div style={{ position:'relative', maxWidth:900, margin:'0 auto', padding:'56px 20px 80px' }}>

        {/* ── HERO ── */}
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:20, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Knowledge Base · SSLVault</span>
          </div>
          <h1 style={{ fontSize:'clamp(30px,4vw,46px)', fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-2px', marginBottom:6 }}>Everything you need,</h1>
          <h1 style={{ fontSize:'clamp(30px,4vw,46px)', fontWeight:900, lineHeight:1.06, letterSpacing:'-2px', marginBottom:18, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>nothing you don't.</h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, maxWidth:560, margin:'0 auto' }}>
            Guides, tutorials and reference docs for every SSLVault feature. Plain English, no jargon.
          </p>
        </div>

        {/* ── QUICK LINKS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:48 }}>
          {QUICK_LINKS.map(({ icon:Icon, title, desc, color, bg, border, anchor }) => (
            <a key={title} href={anchor} onClick={e=>{e.preventDefault();document.querySelector(anchor)?.scrollIntoView({behavior:'smooth'})}}
              style={{ display:'block', background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:18, textDecoration:'none', boxShadow:'0 1px 4px rgba(15,23,42,0.04)', transition:'transform 0.15s,box-shadow 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(15,23,42,0.08)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(15,23,42,0.04)'}}>
              <div style={{ width:38, height:38, borderRadius:10, background:bg, border:`1.5px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <Icon size={16} color={color} strokeWidth={2}/>
              </div>
              <div style={{ fontWeight:800, fontSize:13, color:'#0f172a', marginBottom:4, letterSpacing:'-0.1px' }}>{title}</div>
              <div style={{ fontSize:11, color:'#64748b', lineHeight:1.55 }}>{desc}</div>
            </a>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 1 — GETTING STARTED
        ══════════════════════════════════════════════════ */}
        <div id='getting-started' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='Getting Started' pillColor='#d97706' pillBg='#fffbeb' pillBorder='#fde68a'
            title='Issue your first SSL certificate'
            subtitle='Free 90-day certificate, issued in under 60 seconds via Let&apos;s Encrypt. No credit card. No account required for the first cert.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Go to Issue Certificate' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>Issue Certificate</strong> in the top navigation. Enter your domain name (e.g. <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>example.com</code> or <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>shop.example.com</code>). Wildcard certs (<code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>*.example.com</code>) require DNS verification.</p>
            </Step>
            <Step n={2} title='Complete DNS verification' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>SSLVault creates an ACME challenge. You have two options:</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
                <Card bg='#eff6ff' border='#bfdbfe' icon='⚡' title='Automatic (recommended)' desc='Connect a DNS provider (Cloudflare, GoDaddy, Vercel, DigitalOcean) and the TXT record is added for you. No copy-pasting.' />
                <Card bg='#f8fafc' border='#e2e8f0' icon='✍️' title='Manual' desc='Copy the _acme-challenge TXT record shown and add it to your DNS registrar. Takes 1–5 minutes to propagate.' />
              </div>
            </Step>
            <Step n={3} title='Download your certificate' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Once verified, your certificate appears in <strong>Inventory & Monitor</strong>. Click the domain to expand it and download:</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['cert.pem','Your certificate file','#2563eb','#eff6ff'],['key.pem','Your private key','#7c3aed','#f5f3ff'],['fullchain.pem','Cert + chain bundle','#059669','#ecfdf5']].map(([f,d,c,bg])=>(
                  <div key={f} style={{ background:bg, borderRadius:9, padding:'10px 12px', border:`1px solid ${c}20` }}>
                    <code style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:c, display:'block', marginBottom:3 }}>{f}</code>
                    <span style={{ fontSize:11, color:'#64748b' }}>{d}</span>
                  </div>
                ))}
              </div>
            </Step>
            <Step n={4} title='Install on your server' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>Install on Server</strong> inside the certificate panel. Choose your hosting type — VPS/cloud server (SSH) or shared hosting (cPanel). See sections below for full install guides.</p>
            </Step>
          </div>
          <Note type='tip'>Sign in to save certificates, enable auto-renewal, and manage multiple domains from one dashboard.</Note>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — PERSISTENT AGENT (VPS)
        ══════════════════════════════════════════════════ */}
        <div id='persistent-agent' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='VPS / Cloud Server' pillColor='#2563eb' pillBg='#eff6ff' pillBorder='#bfdbfe'
            title='Persistent Agent — SSH once, never again'
            subtitle='Install the SSLVault agent daemon on any VPS or cloud server. After that, every cert install and renewal happens automatically — no SSH required.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Save your server in DNS Providers → Servers tab' color='#2563eb'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Go to <strong>More → DNS Providers</strong> → click the <strong>Servers</strong> tab → <strong>Add Server</strong>. Select <strong>VPS / Cloud Server (SSH)</strong>, enter your server IP/hostname and SSH username. Associate your domains so installs auto-select this server.</p>
            </Step>
            <Step n={2} title='Click "Install Agent" on the server card' color='#2563eb'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>On the server card, click the blue <strong>🤖 Install Agent</strong> button. A modal appears with a one-line install command pre-configured with your server token.</p>
            </Step>
            <Step n={3} title='SSH in and run the one-line command' color='#2563eb'
              terminal={`ssh user@yourserver.com

curl -fsSL https://www.easysecurity.in/agent-install.sh | \\
  sudo bash -s -- --token=YOUR_TOKEN --server-id=ID --user-id=UID`}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>The installer automatically:</p>
              <ul style={{ fontSize:13, color:'#475569', paddingLeft:20, lineHeight:2 }}>
                <li>Detects your OS (Ubuntu / Debian / CentOS / Amazon Linux)</li>
                <li>Detects your web server (Nginx or Apache)</li>
                <li>Downloads and installs the agent daemon</li>
                <li>Creates a systemd service that starts on every boot</li>
                <li>Registers with SSLVault — dashboard updates immediately</li>
              </ul>
            </Step>
            <Step n={4} title="Dashboard shows 🟢 Agent Active — you're done" color='#2563eb'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>The server card now shows a green <strong>🟢 Agent Active</strong> badge. From now on, clicking <strong>Install on Server</strong> on any certificate will dispatch the job to your agent — it installs the cert, updates Nginx/Apache config, reloads the web server, and reports back. No file uploads, no SSH.</p>
            </Step>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:20 }}>
              <p style={{ fontWeight:800, fontSize:13, color:'#0f172a', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px', fontSize:11 }}>Supported OS</p>
              <SupportGrid items={[['✅','Ubuntu 20/22/24',true],['✅','Debian 10/11/12',true],['✅','CentOS 7/8/9',true],['✅','Amazon Linux 2/2023',true],['✅','RHEL 8/9',true],['⚠️','Other Linux (best-effort)',true],['❌','Windows',false]]} />
            </div>
            <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:20 }}>
              <p style={{ fontWeight:800, fontSize:13, color:'#0f172a', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px', fontSize:11 }}>Web Servers</p>
              <SupportGrid items={[['✅','Nginx (auto-config + reload)',true],['✅','Apache2 / httpd (auto)',true],['⚠️','Caddy (cert files saved)',true],['⚠️','Node.js (cert files saved)',true],['⚠️','No web server (files only)',true]]} />
            </div>
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:10, padding:'10px 16px', fontSize:12, color:'#15803d', flex:1 }}>
              <strong>Agent commands:</strong> <code style={{ fontFamily:'monospace' }}>sslvault-agent status</code> · <code style={{ fontFamily:'monospace' }}>sslvault-agent uninstall</code> · <code style={{ fontFamily:'monospace' }}>journalctl -u sslvault-agent -f</code>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — SHARED HOSTING (cPanel)
        ══════════════════════════════════════════════════ */}
        <div id='shared-hosting' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='Shared Hosting' pillColor='#059669' pillBg='#ecfdf5' pillBorder='#a7f3d0'
            title='cPanel Auto-Install — no SSH needed'
            subtitle='For GoDaddy, Bluehost, Hostinger, SiteGround, and any cPanel-based host. Works entirely through your browser.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Save your cPanel server credentials' color='#059669'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Go to <strong>More → DNS Providers → Servers tab → Add Server → cPanel / Shared Hosting</strong>. Enter your cPanel username and API token once — it's saved encrypted for all future installs.</p>
              <Note type='tip'>Your cPanel username is your short login name (not your email). Find it in your hosting welcome email or at <em>yourdomain.com/cpanel</em> → top right corner.</Note>
              <Note type='info'>To create a cPanel API token: cPanel → <em>Manage API Tokens</em> → Create token → give it SSL permissions → copy.</Note>
            </Step>
            <Step n={2} title='Click "Install on Server" on your certificate' color='#059669'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>In <strong>Inventory & Monitor</strong> → expand your domain → find the certificate → click <strong>Install on Server</strong>. Select <strong>Shared Hosting</strong>. If you saved a server in step 1, it will appear as a card to select — credentials are pre-filled automatically.</p>
            </Step>
            <Step n={3} title='Download and upload the PHP agent file' color='#059669'
              terminal={`# No terminal needed — this is done through your browser:
# 1. Click "Download PHP Agent" — saves sslvault-agent.php
# 2. Log in to cPanel → File Manager → public_html
# 3. Upload sslvault-agent.php to public_html`}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>A PHP file is downloaded with your credentials pre-embedded. Upload it to your website's <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>public_html</code> folder using cPanel File Manager.</p>
            </Step>
            <Step n={4} title='Visit the agent URL to activate SSL' color='#059669'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Open a new browser tab and go to:</p>
              <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:13, color:'#34d399', marginBottom:8 }}>https://yourdomain.com/sslvault-agent.php</div>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>The script calls cPanel's API directly and activates SSL in seconds. You'll see a green ✅ success page when done.</p>
            </Step>
            <Step n={5} title='Delete the file immediately after' color='#059669'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>The PHP file contains your cPanel API token. Delete it from File Manager right after installation. Your certificate and SSL remain active — only the temporary installer file is removed.</p>
            </Step>
          </div>
          <Note type='warn'>Every 90-day renewal requires repeating steps 2–5 for shared hosting. For zero-touch renewals, upgrade to a VPS with the persistent agent.</Note>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 4 — AUTO-RENEWAL
        ══════════════════════════════════════════════════ */}
        <div id='auto-renewal' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='Auto-Renewal' pillColor='#7c3aed' pillBg='#f5f3ff' pillBorder='#ddd6fe'
            title='Set it once, renew forever'
            subtitle="Enable auto-renewal on any certificate and SSLVault handles the rest. Certificates renew 14 days before expiry — you'll never see an expired cert warning." />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Requirement: connect a DNS provider' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Auto-renewal uses DNS verification (DNS-01 challenge). You must have a DNS provider connected so SSLVault can auto-add the TXT record without human input.</p>
              <Note type='info'>Go to <strong>More → DNS Providers</strong> to connect Cloudflare, GoDaddy, Vercel, or DigitalOcean.</Note>
            </Step>
            <Step n={2} title='Enable auto-renewal on a certificate' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>In <strong>Inventory & Monitor → Renewal Schedule tab</strong>, find your certificate and toggle <strong>Auto-Renew</strong> to on. That's it.</p>
            </Step>
            <Step n={3} title='SSLVault renews automatically' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>The renewal engine runs daily at 03:00 UTC. When your cert is within 14 days of expiry:</p>
              <ul style={{ fontSize:13, color:'#475569', paddingLeft:20, lineHeight:2 }}>
                <li>Adds DNS TXT record automatically via your DNS provider</li>
                <li>Issues new certificate via Let's Encrypt ACME</li>
                <li>If you have a persistent agent: installs new cert on your server automatically</li>
                <li>Sends email confirmation when done</li>
                <li>Retries on failure: 0h → 6h → 24h → 3 days → 7 days (max 5 attempts)</li>
              </ul>
            </Step>
            <Step n={4} title='Get notified by email' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>SSLVault sends you an email when a cert renews successfully or when renewal fails, including how many days are left and when it will retry.</p>
            </Step>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:12, padding:16 }}>
              <p style={{ fontWeight:700, fontSize:13, color:'#6d28d9', marginBottom:8 }}>✅ Fully automated with:</p>
              <ul style={{ fontSize:12, color:'#475569', paddingLeft:16, lineHeight:2 }}>
                <li>DNS provider connected</li>
                <li>Persistent agent installed (VPS)</li>
                <li>Auto-renewal toggled on</li>
              </ul>
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:16 }}>
              <p style={{ fontWeight:700, fontSize:13, color:'#92400e', marginBottom:8 }}>⚠ Still requires manual step:</p>
              <ul style={{ fontSize:12, color:'#475569', paddingLeft:16, lineHeight:2 }}>
                <li>Shared hosting (no persistent agent)</li>
                <li>No DNS provider connected</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 5 — DNS PROVIDERS
        ══════════════════════════════════════════════════ */}
        <div id='dns-providers' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='DNS Providers' pillColor='#0ea5e9' pillBg='#f0f9ff' pillBorder='#bae6fd'
            title='Auto-add TXT records — no copy-pasting'
            subtitle='Connect your DNS provider once. Every future certificate verification adds the required TXT record automatically.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Go to More → DNS Providers' color='#0ea5e9'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>More → DNS Providers</strong> in the navigation. Click <strong>Add Provider</strong>.</p>
            </Step>
            <Step n={2} title='Select your provider and enter credentials' color='#0ea5e9'>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[['🔶','Cloudflare','Zone:DNS:Edit API Token — Dashboard → My Profile → API Tokens'],['🟢','GoDaddy','API Key + Secret from developer.godaddy.com/keys'],['▲','Vercel','API Token from vercel.com/account/tokens'],['🔵','DigitalOcean','Personal Access Token with Write scope']].map(([icon,name,help])=>(
                  <div key={name} style={{ background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontWeight:700, fontSize:12, color:'#0f172a', marginBottom:3 }}>{icon} {name}</div>
                    <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{help}</div>
                  </div>
                ))}
              </div>
              <Note type='info'>Credentials are encrypted with AES-256-GCM before storage. Only you can access them via Row-Level Security.</Note>
            </Step>
            <Step n={3} title='Enter the domain this provider manages' color='#0ea5e9'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Type the root domain (e.g. <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>example.com</code>). SSLVault uses this provider for all certificates under that domain, including subdomains and wildcards.</p>
            </Step>
            <Step n={4} title='Generate a cert — DNS is handled automatically' color='#0ea5e9'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Next time you issue a certificate for that domain, SSLVault auto-creates the <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>_acme-challenge</code> TXT record, verifies it, and removes it — all in seconds.</p>
            </Step>
          </div>
          <Note type='tip'>Don't see your DNS provider? Use the manual verification method and paste the TXT record in your registrar's DNS settings. Most registrars propagate within 1–5 minutes.</Note>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 6 — CT LOG DISCOVERY
        ══════════════════════════════════════════════════ */}
        <div id='ct-discovery' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='CT Log Discovery' pillColor='#db2777' pillBg='#fdf2f8' pillBorder='#fbcfe8'
            title='Find all certs issued for your domains'
            subtitle='Certificate Transparency logs record every TLS certificate issued. SSLVault scans them to show you all certs — including ones you didn&apos;t issue.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Go to Inventory & Monitor → Discovery tab' color='#db2777'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>In the dashboard, click <strong>Inventory & Monitor</strong> and select the <strong>Discovery</strong> tab at the top.</p>
            </Step>
            <Step n={2} title='Enter a domain and scan' color='#db2777'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Type any domain (e.g. <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>example.com</code>) and click <strong>Scan CT Logs</strong>. SSLVault queries <strong>crt.sh</strong> — the public CT log aggregator — and returns all certificates ever issued for that domain and its subdomains.</p>
              <Note type='info'>CT logs are public. Anyone can query them. This is a transparency feature built into TLS — all trusted CA-issued certs are logged.</Note>
            </Step>
            <Step n={3} title='Import discovered domains to your monitor' color='#db2777'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>Add to Monitor</strong> next to any discovered domain to start tracking its expiry, issuer, and health in your inventory.</p>
            </Step>
          </div>
          <Note type='tip'>Use CT Discovery to audit your domain — you may find forgotten subdomains, staging environments, or certs issued by an unexpected CA.</Note>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 7 — SSL MONITOR
        ══════════════════════════════════════════════════ */}
        <div id='monitor' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='SSL Monitor' pillColor='#16a34a' pillBg='#f0fdf4' pillBorder='#bbf7d0'
            title='Track any domain — no login required'
            subtitle='The public SSL scanner checks any domain&apos;s certificate in real-time. No account needed. Sign in to add domains to your personal inventory.' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Visit the Monitor page' color='#16a34a'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>Inventory & Monitor</strong> in the navigation. Without logging in, you'll see the public scanner. With an account, you see your full inventory plus the scanner.</p>
            </Step>
            <Step n={2} title='Enter any domain and scan' color='#16a34a'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Type a domain and click <strong>Scan</strong>. Results show:</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[['📅','Expiry date and days remaining'],['🏢','Certificate issuer (e.g. Let\'s Encrypt)'],['✅','Valid / expired / revoked status'],['🔐','TLS protocol version']].map(([i,t])=>(
                  <div key={t} style={{ display:'flex', gap:8, fontSize:12, color:'#475569', alignItems:'center' }}><span>{i}</span>{t}</div>
                ))}
              </div>
            </Step>
            <Step n={3} title='Add to your inventory for ongoing tracking' color='#16a34a'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong>Add to Monitor</strong> to save the domain to your inventory. SSLVault tracks it and shows it on your dashboard alongside your issued certificates.</p>
            </Step>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 8 — CERTIFICATE DETAILS
        ══════════════════════════════════════════════════ */}
        <div id='cert-details' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='Certificate Details' pillColor='#7c3aed' pillBg='#f5f3ff' pillBorder='#ddd6fe'
            title='View, copy and download your certificate data' />

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:'28px 32px', boxShadow:'0 4px 20px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:16 }}>Expand any domain in <strong>Inventory & Monitor</strong> and find the certificate row. From there you can:</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                ['⬇️','Download cert.pem','The certificate file for use in web server configs'],
                ['🔑','Download key.pem','Your private key — keep this secret'],
                ['🔗','Download fullchain.pem','Certificate + intermediate chain bundle'],
                ['📦','Download All Files','Grabs all three files at once'],
                ['#️⃣','Details panel','View SANs, fingerprint, and copy full PEM text'],
                ['📊','Validity bar','Visual indicator of remaining certificate lifetime'],
              ].map(([i,t,d])=>(
                <div key={t} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{i}</span>
                  <div><div style={{ fontWeight:700, fontSize:12, color:'#0f172a', marginBottom:2 }}>{t}</div><div style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{d}</div></div>
                </div>
              ))}
            </div>
            <Note type='tip'>The <strong>Details</strong> button (purple) opens a panel with one-click copy for the full PEM — useful when pasting into cPanel or control panel SSL fields.</Note>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 9 — TROUBLESHOOTING
        ══════════════════════════════════════════════════ */}
        <div id='troubleshooting' style={{ scrollMarginTop:80, marginBottom:56 }}>
          <SectionHeader pill='Troubleshooting' pillColor='#dc2626' pillBg='#fef2f2' pillBorder='#fecaca'
            title='Common issues, fixed fast' />

          <Accordion title='Token expired' icon='⏰' color='#d97706' bg='#fffbeb' border='#fde68a'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Agent install tokens expire after 1 hour. Go to <strong>Inventory & Monitor</strong> → expand your domain → <strong>Install on Server</strong> → generate a fresh token → re-run the command.</p>
          </Accordion>

          <Accordion title='Permission denied when running agent install' icon='🔒' color='#dc2626' bg='#fef2f2' border='#fecaca'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>Always prefix the command with <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>sudo</code>. The agent writes to <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, fontSize:12 }}>/etc/ssl/sslvault/</code> and modifies web server configs which require root.</p>
            <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#e2e8f0', lineHeight:1.8 }}>
              {'curl -fsSL https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=YOUR_TOKEN ...'}
            </div>
          </Accordion>

          <Accordion title='Nginx config test failed after agent ran' icon='⚙️' color='#059669' bg='#ecfdf5' border='#a7f3d0'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>The agent backs up your config before modifying it. If the test fails, the original is automatically restored. Check what went wrong:</p>
            <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#e2e8f0', lineHeight:1.8 }}>
              {'# Check Nginx error\nnginx -t\n\n# View backup\nls /etc/nginx/sites-available/*.sslvault-bak\n\n# Restore manually if needed\nsudo cp /etc/nginx/sites-available/yourdomain.conf.sslvault-bak \\\n  /etc/nginx/sites-available/yourdomain.conf'}
            </div>
          </Accordion>

          <Accordion title='Certificate saved but HTTPS not working' icon='📁' color='#7c3aed' bg='#f5f3ff' border='#ddd6fe'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>Certificate files are always saved even if web server config fails. Find them at:</p>
            <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#e2e8f0', lineHeight:1.8 }}>
              {'/etc/ssl/sslvault/yourdomain.com/fullchain.pem\n/etc/ssl/sslvault/yourdomain.com/privkey.pem'}
            </div>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginTop:10 }}>Point your Nginx/Apache config at these paths manually. See <strong>More → Install Guide</strong> for server-specific instructions.</p>
          </Accordion>

          <Accordion title='cPanel agent shows success but SSL not active' icon='🖥️' color='#d97706' bg='#fffbeb' border='#fde68a'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>The PHP agent calls cPanel's API to activate SSL directly. If you still see "Not Secure", check: (1) the domain in the PHP file matches your actual domain exactly, (2) your cPanel API token has SSL permissions enabled, (3) your hosting plan supports SSL (some very cheap plans don't). Try clicking "Test SSL Grade" from the success screen to diagnose.</p>
          </Accordion>

          <Accordion title='curl: command not found' icon='💻' color='#2563eb' bg='#eff6ff' border='#bfdbfe'>
            <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#e2e8f0', lineHeight:2 }}>
              {'# Ubuntu / Debian\nsudo apt install curl -y\n\n# CentOS / RHEL\nsudo yum install curl -y\n\n# Alpine\nsudo apk add curl'}
            </div>
          </Accordion>

          <Accordion title='DNS TXT record not propagating' icon='🌐' color='#0ea5e9' bg='#f0f9ff' border='#bae6fd'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>DNS propagation typically takes 1–5 minutes but can take up to 48 hours in rare cases. Check propagation at <a href='https://dnschecker.org' target='_blank' rel='noopener noreferrer' style={{ color:'#0ea5e9', fontWeight:600 }}>dnschecker.org</a>. With an auto DNS provider connected, SSLVault handles this automatically and retries verification until it succeeds.</p>
          </Accordion>

          <Accordion title='Auto-renewal failed — what happens?' icon='🔄' color='#7c3aed' bg='#f5f3ff' border='#ddd6fe'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>SSLVault retries on a backoff schedule: immediately → 6 hours → 24 hours → 3 days → 7 days. After 5 failed attempts it stops and emails you to act manually. You'll receive an email on every failure with the error details and days remaining on the current cert.</p>
          </Accordion>

          <Accordion title='Agent shows 🟡 Inactive on the server card' icon='🤖' color='#2563eb' bg='#eff6ff' border='#bfdbfe'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>The agent is inactive when it hasn't been seen in over 15 minutes. Check its status on the server:</p>
            <div style={{ background:'#0f172a', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#e2e8f0', lineHeight:2 }}>
              {'# Check service status\nsystemctl status sslvault-agent\n\n# View recent logs\njournalctl -u sslvault-agent -n 50\n\n# Restart if stopped\nsudo systemctl restart sslvault-agent'}
            </div>
          </Accordion>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 10 — FAQ
        ══════════════════════════════════════════════════ */}
        <div style={{ marginBottom:56 }}>
          <SectionHeader pill='FAQ' pillColor='#2563eb' pillBg='#eff6ff' pillBorder='#bfdbfe'
            title='Frequently asked questions' />

          {[
            ['Is SSLVault free?', "Yes, completely. SSL certificates from Let's Encrypt are free. SSLVault is free. The agent is free. No credit card, no trial period, no hidden tiers.", '#16a34a','#f0fdf4','#bbf7d0'],
            ['Are my credentials safe?', 'Yes. DNS provider and server credentials are encrypted with AES-256-GCM before storage. Private keys are never logged or transmitted unencrypted. Row-Level Security ensures only you can read your data. The PHP agent file contains your cPanel token — delete it immediately after use.', '#059669','#ecfdf5','#a7f3d0'],
            ['How long do certificates last?', "90 days — the standard Let's Encrypt duration. With auto-renewal enabled, SSLVault renews automatically 14 days before expiry so you'll never hit the limit.", '#7c3aed','#f5f3ff','#ddd6fe'],
            ['Can I use this for wildcard certificates?', 'Yes. Enter *.example.com when generating a certificate. Wildcards require DNS-01 verification, so you must have a DNS provider connected. Wildcard certs cover example.com and all one-level subdomains (shop.example.com, blog.example.com, etc.)', '#d97706','#fffbeb','#fde68a'],
            ['Can I install the same cert on multiple servers?', 'Yes. Click "Install on Server" multiple times — once per server. Each install dispatches to the agent on that server. The certificate itself covers the domain regardless of which server it\'s on.', '#0ea5e9','#f0f9ff','#bae6fd'],
            ['What web servers does auto-config support?', 'Nginx and Apache2/httpd get automatic config updates and reloads. Caddy, Node.js, and others get cert files saved at /etc/ssl/sslvault/ — you update their config manually.', '#2563eb','#eff6ff','#bfdbfe'],
            ['Does the agent need inbound firewall ports?', 'No. The agent only makes outbound HTTPS connections to Supabase (port 443). No ports need to be opened on your server.', '#059669','#ecfdf5','#a7f3d0'],
            ['What happens if my VPS is offline when renewal runs?', 'The cert is renewed and stored in SSLVault. When your agent next comes online and polls (every 5 minutes), it picks up the renewal job and installs the new cert automatically.', '#7c3aed','#f5f3ff','#ddd6fe'],
          ].map(([q,a,c,bg,bd]) => (
            <Accordion key={q} title={q} icon='❓' color={c} bg={bg} border={bd}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>{a}</p>
            </Accordion>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ background:'#0f172a', borderRadius:20, padding:'48px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-100, right:-100, width:300, height:300, background:'radial-gradient(circle, rgba(37,99,235,0.4), transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', bottom:-80, left:-80, width:240, height:240, background:'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)', borderRadius:'50%' }} />
          <div style={{ position:'relative' }}>
            <h3 style={{ fontSize:26, fontWeight:900, letterSpacing:'-1px', color:'white', marginBottom:10, lineHeight:1.1 }}>Ready to secure your domains?</h3>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, maxWidth:420, margin:'0 auto 24px', lineHeight:1.65 }}>Free SSL, auto-renewal, and one-command installs. No credit card ever.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#0f172a', border:'none', padding:'13px 26px', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'-0.2px' }}>
                <Shield size={15}/> Issue free certificate <ArrowRight size={14}/>
              </button>
              <button onClick={() => nav('/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.25)', padding:'13px 22px', borderRadius:11, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                View my certificates
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
