// Install.jsx — SSLVault install guide
// Owlish white · Inter · no CSS class dependencies
import { useState } from 'react'

const F    = "'Inter var','Inter',system-ui,-apple-system,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const C = {
  bg:'#FFFFFF', bg2:'#f0fdf9', bg3:'#f0fdf9',
  border:'#e5e7eb', border2:'#d1d5db',
  heading:'#0a0a0a', body:'#4b5563', muted:'#9ca3af',
  teal:'#0d9488', tealDk:'#0d9488', tealBg:'#ccfbf1', tealBd:'#A8E6DE',
  green:'#0d9488', greenBg:'#ccfbf1', greenBd:'#A8E6DE',
  purple:'#f07059', purpleBg:'#faf5ff',
  amber:'#f07059', amberBg:'#fde8e4',
  red:'#dc2626', redBg:'#fef2f2',
  ink:'#0d9488',
}

function Code({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(code) } catch(e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{ background:'#0d9488', border:'1px solid rgba(0,0,0,0.07)', borderRadius:10, overflow:'hidden', margin:'12px 0', fontFamily:MONO }}>
      <div style={{ background:'rgba(0,0,0,0.02)', padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c, opacity:.7 }}/>)}
          <span style={{ fontSize:10, color:'rgba(0,0,0,0.32)', marginLeft:8 }}>{lang}</span>
        </div>
        <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, color:copied?C.green:'rgba(0,0,0,0.38)', fontFamily:MONO, padding:'2px 6px', borderRadius:4, transition:'color .15s' }}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Copied</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
          }
        </button>
      </div>
      <pre style={{ padding:'14px 16px', fontSize:12, lineHeight:1.9, color:'rgba(0,0,0,0.7)', overflowX:'auto', margin:0 }}>{code}</pre>
    </div>
  )
}

function Note({ type = 'tip', children }) {
  const s = {
    tip:     { bg:C.tealBg,  bd:C.tealBd,   color:C.tealDk, label:'TIP',      icon:'💡' },
    warning: { bg:C.amberBg, bd:'#F2C4BC',   color:C.amber,  label:'WARNING',  icon:'⚠️' },
    info:    { bg:C.greenBg, bd:C.greenBd,   color:C.green,  label:'INFO',     icon:'ℹ️' },
  }[type]
  return (
    <div style={{ background:s.bg, border:`1px solid ${s.bd}`, borderLeft:`3px solid ${s.color}`, borderRadius:'0 8px 8px 0', padding:'12px 16px', margin:'12px 0', display:'flex', gap:10 }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{s.icon}</span>
      <div style={{ fontSize:13, color:s.color, lineHeight:1.7 }}><strong>{s.label}:</strong> {children}</div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display:'flex', gap:16, marginBottom:24 }}>
      <div style={{ width:30, height:30, borderRadius:8, background:C.teal, color:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, marginTop:1 }}>{n}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13.5, color:C.body, lineHeight:1.8 }}>{children}</div>
      </div>
    </div>
  )
}

function GuideCard({ icon, title, badge, badgeColor, time, difficulty, children, active, onClick }) {
  const bc = badgeColor || C.teal
  return (
    <button onClick={onClick} style={{
      width:'100%', background:active?C.tealBg:C.bg, border:`1.5px solid ${active?C.teal:C.border}`,
      borderRadius:12, padding:'18px', cursor:'pointer', fontFamily:F, textAlign:'left',
      transition:'all .15s', boxShadow:active?`0 0 0 3px ${C.teal}18`:'none',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:24 }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:700, color:bc, background:`${bc}12`, border:`1px solid ${bc}25`, borderRadius:100, padding:'2px 10px', fontFamily:MONO }}>{badge}</span>
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:C.heading, marginBottom:4 }}>{title}</div>
      <div style={{ display:'flex', gap:12, marginTop:8 }}>
        <span style={{ fontSize:11, color:C.muted }}>⏱ {time}</span>
        <span style={{ fontSize:11, color:C.muted }}>· {difficulty}</span>
      </div>
    </button>
  )
}

const GUIDES = [
  { id:'vps',    icon:'🤖', title:'VPS / Linux server',    badge:'Agent',   badgeColor:C.green,   time:'5 min',   difficulty:'Easy'   },
  { id:'cpanel', icon:'🏛', title:'cPanel shared hosting', badge:'cPanel',  badgeColor:'#0d9488', time:'3 min',   difficulty:'Easy'   },
  { id:'nginx',  icon:'⚡', title:'Nginx manual install',  badge:'Manual',  badgeColor:C.amber,   time:'10 min',  difficulty:'Medium' },
  { id:'apache', icon:'🔥', title:'Apache manual install', badge:'Manual',  badgeColor:C.amber,   time:'10 min',  difficulty:'Medium' },
]

export default function Install({ nav }) {
  const [active, setActive] = useState('vps')
  const guide = GUIDES.find(g => g.id === active)

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:F, color:C.heading }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Nav */}
      <header style={{ background:'rgba(8,12,20,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(0,0,0,0.05)', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,4vw,40px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }} onClick={() => nav('/')}>
          <div style={{ width:28, height:28, background:C.teal, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.92)' }}>SSLVault</span>
          <span style={{ fontSize:11, color:'rgba(0,0,0,0.35)', fontFamily:MONO }}>/ Install Guide</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/knowledge-base')} style={{ background:'none', border:`1px solid rgba(0,0,0,0.1)`, cursor:'pointer', fontFamily:F, fontSize:12, color:'rgba(0,0,0,0.45)', padding:'6px 14px', borderRadius:100 }}>Knowledge base</button>
          <button onClick={() => nav('/auth')} style={{ background:C.teal, border:'none', cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:500, color:'#1a1a1a', padding:'7px 18px', borderRadius:100 }}>Get started</button>
        </div>
      </header>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'clamp(40px,6vw,72px) clamp(20px,4vw,40px) 100px' }}>

        {/* Header */}
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:MONO, marginBottom:14 }}>Installation</div>
          <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:700, color:C.heading, letterSpacing:'-1px', lineHeight:1.1, marginBottom:16 }}>Install Guide</h1>
          <p style={{ fontSize:15, color:C.body, maxWidth:540, lineHeight:1.8 }}>
            Step-by-step instructions for every hosting environment. The persistent agent is recommended — SSH once, then everything is automated.
          </p>
        </div>

        {/* Guide selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:10, marginBottom:40 }}>
          {GUIDES.map(g => (
            <GuideCard key={g.id} {...g} active={active===g.id} onClick={() => setActive(g.id)}/>
          ))}
        </div>

        {/* Active guide content */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          {/* Guide header */}
          <div style={{ background:C.bg2, padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:C.tealBg, border:`1px solid ${C.tealBd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{guide.icon}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:C.heading }}>{guide.title}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2, fontFamily:MONO }}>{guide.time} · {guide.difficulty}</div>
            </div>
          </div>

          <div style={{ padding:'28px 28px' }}>

            {/* ── VPS GUIDE ── */}
            {active === 'vps' && <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:28 }}>
                {[
                  { icon:'🐧', title:'Ubuntu / Debian', desc:'18.04, 20.04, 22.04, 24.04' },
                  { icon:'🎩', title:'RHEL / CentOS', desc:'7, 8, 9 / Rocky / AlmaLinux' },
                  { icon:'🌊', title:'Nginx', desc:'Auto-detected and configured' },
                  { icon:'🔥', title:'Apache', desc:'Auto-detected and configured' },
                ].map(s => (
                  <div key={s.title} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:9, padding:'12px 14px' }}>
                    <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.heading }}>{s.title}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <Step n={1} title="Sign in and go to Automation → Servers & agents">
                Click <strong>Install agent</strong>. SSLVault generates a personalised one-line command with your account token embedded.
              </Step>

              <Step n={2} title="Run the install command on your server">
                <Code code="curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash" lang="bash"/>
                The script installs the agent binary, creates a systemd service, and registers with your SSLVault account. Takes about 30 seconds.
              </Step>

              <Step n={3} title="Verify the agent is running">
                <Code code={`sudo systemctl status sslvault-agent
# Expected output:
# ● sslvault-agent.service - SSLVault Certificate Agent
#    Loaded: loaded
#    Active: active (running)`} lang="bash"/>
              </Step>

              <Step n={4} title="Agent appears in your dashboard">
                Within 1–2 minutes the server appears in <strong>Servers &amp; agents</strong> showing OS, web server, CPU/RAM/disk stats, and any certificates it protects.
              </Step>

              <Step n={5} title="Dispatch your first certificate">
                In <strong>Inventory</strong>, click Install on a cert row → select your server → click Dispatch. The agent installs the cert, updates your web server config, tests syntax, and reloads automatically.
              </Step>

              <Note type="info">The agent makes outbound-only HTTPS connections — no inbound ports required. It polls every 5 minutes for pending jobs.</Note>

              <div style={{ marginTop:28, padding:'20px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:14 }}>What the agent does automatically</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
                  {[
                    '✓ Detects Nginx or Apache',
                    '✓ Writes cert files to correct paths',
                    '✓ Updates web server config',
                    '✓ Runs config syntax test',
                    '✓ Reloads service (not restart)',
                    '✓ Rolls back on failure',
                    '✓ Encrypts key in CertVault',
                    '✓ Reports health metrics',
                  ].map(item => (
                    <div key={item} style={{ fontSize:12.5, color:C.body, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:C.green, fontWeight:700 }}>{item.split(' ')[0]}</span>
                      <span>{item.slice(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>}

            {/* ── CPANEL GUIDE ── */}
            {active === 'cpanel' && <>
              <Note type="info">No SSH or agent required. SSLVault installs directly via cPanel's UAPI using your API token.</Note>

              <Step n={1} title="Generate a cPanel API token">
                Log into cPanel → <strong>Security</strong> section → <strong>Manage API Tokens</strong> → <strong>Create Token</strong>.
                <div style={{ marginTop:8, padding:'12px 14px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12.5, color:C.body }}>
                  Give it a descriptive name like <code style={{ fontFamily:MONO, background:C.bg3, padding:'1px 5px', borderRadius:3 }}>SSLVault-AutoRenew</code>. The token only needs access to SSL functions — you don't need to grant full account access.
                </div>
              </Step>

              <Step n={2} title="Add credentials in SSLVault">
                In <strong>Inventory</strong>, expand any certificate → click <strong>Install</strong> → select the <strong>cPanel</strong> tab. Enter:
                <div style={{ margin:'10px 0', display:'flex', flexDirection:'column', gap:6 }}>
                  {[['cPanel hostname','e.g. server123.hostingprovider.com'],['cPanel username','Your hosting account username'],['API token','The token generated in step 1']].map(([l,v]) => (
                    <div key={l} style={{ display:'flex', gap:10, padding:'8px 12px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:7 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:C.heading, minWidth:140 }}>{l}</span>
                      <span style={{ fontSize:12, color:C.muted, fontFamily:MONO }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <Step n={3} title="SSLVault installs the certificate">
                Click <strong>Install via cPanel</strong>. SSLVault calls cPanel's UAPI, installs the certificate and private key, and confirms installation. Takes under 10 seconds.
              </Step>

              <Step n={4} title="Auto-renewal is configured automatically">
                Future renewals are fully automatic — SSLVault re-issues the cert and re-installs via UAPI without any manual steps.
              </Step>

              <Note type="tip">If your hosting provider uses WHM/cPanel with a custom port (e.g. 2083), include it in the hostname: <code style={{ fontFamily:MONO, fontSize:12 }}>server.host.com:2083</code></Note>
            </>}

            {/* ── NGINX MANUAL ── */}
            {active === 'nginx' && <>
              <Note type="warning">Manual install does not auto-renew. Consider the agent for zero-touch automation.</Note>

              <Step n={1} title="Issue and download the certificate">
                Issue your cert in SSLVault. In Inventory, expand the cert row and download:
                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                  {[['certificate.crt','The certificate + intermediate chain (full chain)'],['private.key','Your private key — keep this secure']].map(([f,d]) => (
                    <div key={f} style={{ display:'flex', gap:10, padding:'8px 12px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:7 }}>
                      <code style={{ fontSize:12, fontWeight:600, color:C.teal, fontFamily:MONO, minWidth:140 }}>{f}</code>
                      <span style={{ fontSize:12, color:C.muted }}>{d}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <Step n={2} title="Upload files to your server">
                <Code code={`sudo mkdir -p /etc/nginx/ssl/yourdomain.com
sudo cp certificate.crt /etc/nginx/ssl/yourdomain.com/fullchain.pem
sudo cp private.key /etc/nginx/ssl/yourdomain.com/privkey.pem
sudo chmod 600 /etc/nginx/ssl/yourdomain.com/privkey.pem`} lang="bash"/>
              </Step>

              <Step n={3} title="Configure Nginx">
                <Code code={`server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (recommended)
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Your site config here
    root /var/www/yourdomain.com;
    index index.html;
}`} lang="nginx"/>
              </Step>

              <Step n={4} title="Test and reload">
                <Code code={`sudo nginx -t          # Test config syntax
sudo systemctl reload nginx  # Apply changes`} lang="bash"/>
              </Step>

              <Step n={5} title="Redirect HTTP to HTTPS">
                <Code code={`server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}`} lang="nginx"/>
              </Step>

              <Note type="tip">After manual install, import the cert into SSLVault Inventory to track expiry and get renewal reminders. Use the agent for zero-touch future renewals.</Note>
            </>}

            {/* ── APACHE MANUAL ── */}
            {active === 'apache' && <>
              <Note type="warning">Manual install does not auto-renew. Consider the agent for zero-touch automation.</Note>

              <Step n={1} title="Issue and download the certificate">
                Issue your cert in SSLVault. In Inventory, expand the cert row and download <code style={{ fontFamily:MONO, fontSize:12, background:C.bg3, padding:'1px 5px', borderRadius:3 }}>certificate.crt</code> and <code style={{ fontFamily:MONO, fontSize:12, background:C.bg3, padding:'1px 5px', borderRadius:3 }}>private.key</code>.
              </Step>

              <Step n={2} title="Upload files to your server">
                <Code code={`sudo mkdir -p /etc/apache2/ssl/yourdomain.com
sudo cp certificate.crt /etc/apache2/ssl/yourdomain.com/fullchain.pem
sudo cp private.key /etc/apache2/ssl/yourdomain.com/privkey.pem
sudo chmod 600 /etc/apache2/ssl/yourdomain.com/privkey.pem`} lang="bash"/>
              </Step>

              <Step n={3} title="Enable SSL module and configure VirtualHost">
                <Code code={`sudo a2enmod ssl headers

# Create or edit your SSL VirtualHost
sudo nano /etc/apache2/sites-available/yourdomain-ssl.conf`} lang="bash"/>
                <Code code={`<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    SSLEngine on
    SSLCertificateFile    /etc/apache2/ssl/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/apache2/ssl/yourdomain.com/privkey.pem

    SSLProtocol           all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite        ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder   off

    Header always set Strict-Transport-Security "max-age=63072000"

    DocumentRoot /var/www/yourdomain.com
</VirtualHost>

<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>`} lang="apache"/>
              </Step>

              <Step n={4} title="Enable site and reload">
                <Code code={`sudo a2ensite yourdomain-ssl.conf
sudo apache2ctl configtest  # Test config syntax
sudo systemctl reload apache2`} lang="bash"/>
              </Step>

              <Note type="tip">After manual install, import the cert into SSLVault Inventory to track expiry and get renewal reminders.</Note>
            </>}

          </div>
        </div>

        {/* Next steps */}
        <div style={{ marginTop:32 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:14 }}>Next steps</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
            {[
              { icon:'🌐', title:'Connect DNS provider', desc:'Enable auto-DCV for zero-touch renewal', action:() => nav('/auth') },
              { icon:'📋', title:'Check 47-day readiness', desc:'Score your fleet against CA/B Forum mandates', action:() => nav('/auth') },
              { icon:'📖', title:'Knowledge Base', desc:'Full documentation for all features', action:() => nav('/knowledge-base') },
            ].map(item => (
              <button key={item.title} onClick={item.action} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px', cursor:'pointer', fontFamily:F, textAlign:'left', transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.background=C.tealBg }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.bg }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.heading, marginBottom:4 }}>{item.title}</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
