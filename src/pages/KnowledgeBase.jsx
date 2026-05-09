import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Shield, Server, BookOpen, Zap, Globe, Key, ArrowRight } from 'lucide-react'

function Section({ title, icon, color='#2563eb', bg='#eff6ff', border='#bfdbfe', children, defaultOpen=false }) {
  const [show, setShow] = useState(defaultOpen)
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, overflow:'hidden', marginBottom:14, boxShadow:'0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)' }}>
      <div onClick={() => setShow(s=>!s)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', cursor:'pointer', background: show ? bg : 'white', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:bg, border:'1.5px solid '+border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            {icon}
          </div>
          <span style={{ fontWeight:800, fontSize:14, color:'#0f172a', letterSpacing:'-0.2px' }}>{title}</span>
        </div>
        <div style={{ width:28, height:28, borderRadius:'50%', background: show ? color : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
          {show ? <ChevronUp size={13} color='white'/> : <ChevronDown size={13} color='#64748b'/>}
        </div>
      </div>
      {show && <div style={{ padding:'20px 22px', borderTop:'1px solid '+border, background:'white' }}>{children}</div>}
    </div>
  )
}

function Step({ n, title, color='#2563eb', img, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:'white', color:color, border:'2px solid '+color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>{n}</div>
        <h4 style={{ fontWeight:800, fontSize:14, color:'#0f172a', margin:0, letterSpacing:'-0.2px' }}>{title}</h4>
      </div>
      <div style={{ paddingLeft:42 }}>
        {children}
        {img && (
          <div style={{ background:'#0f172a', borderRadius:12, marginTop:12, overflow:'hidden', border:'1px solid #1e293b' }}>
            <div style={{ background:'#1e293b', padding:'8px 14px', display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:'#ef4444' }}/>
              <div style={{ width:9, height:9, borderRadius:'50%', background:'#f59e0b' }}/>
              <div style={{ width:9, height:9, borderRadius:'50%', background:'#10b981' }}/>
              <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginLeft:8 }}>terminal</span>
            </div>
            <pre style={{ margin:0, padding:'14px 16px', color:'#e2e8f0', fontSize:12, fontFamily:'monospace', lineHeight:1.8, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{img}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

function Note({ type='info', children }) {
  const styles = {
    info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8', prefix:'ℹ' },
    warn:    { bg:'#fffbeb', border:'#fde68a', color:'#92400e', prefix:'⚠' },
    success: { bg:'#ecfdf5', border:'#a7f3d0', color:'#047857', prefix:'✅' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{ background:s.bg, border:'1.5px solid '+s.border, borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:12, lineHeight:1.65, color:s.color, fontWeight:500 }}>
      <strong style={{ marginRight:6 }}>{s.prefix}</strong>{children}
    </div>
  )
}

export default function KnowledgeBase({ nav }) {
  return (
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      <div style={{ position:'relative', maxWidth:1100, margin:'0 auto', padding:'56px 24px 80px' }}>

        {/* HERO */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:24, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Knowledge Base · Always up to date</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px,4vw,48px)', fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-2px', marginBottom:6 }}>Everything you need,</h1>
          <h1 style={{ fontSize:'clamp(32px,4vw,48px)', fontWeight:900, lineHeight:1.06, letterSpacing:'-2px', marginBottom:18, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>nothing you don't.</h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, maxWidth:560, margin:'0 auto' }}>
            Guides, tutorials and reference docs. From auto-install to DNS setup, everything stays in plain English.
          </p>
        </div>

        {/* QUICK LINKS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14, marginBottom:36 }}>
          {[
            { icon:Zap,    title:'Auto-Install Agent',   desc:'One command to install SSL on any server', color:'#d97706', bg:'#fffbeb', border:'#fde68a', href:'#agent' },
            { icon:Server, title:'Manual Installation',  desc:'Step-by-step for Nginx, Apache, cPanel',   color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', href:'/install', nav:true },
            { icon:Key,    title:'DNS Providers',        desc:'Automatic DNS verification setup',         color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', href:'#dns' },
            { icon:Globe,  title:'Shared Hosting Guide', desc:'cPanel PHP agent — no SSH needed',         color:'#059669', bg:'#ecfdf5', border:'#a7f3d0', href:'/shared-hosting-guide', nav:true },
          ].map(({ icon:Icon, title, desc, color, bg, border, href, nav:isNav }) => (
            <a key={title}
              href={href}
              onClick={isNav ? (e) => { e.preventDefault(); nav(href) } : undefined}
              style={{ display:'block', background:'white', border:'1px solid #e2e8f0', borderRadius:16, padding:20, textDecoration:'none', boxShadow:'0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)', transition:'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)' }}>
              <div style={{ width:42, height:42, borderRadius:11, background:bg, border:'1.5px solid '+border, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                <Icon size={18} color={color} strokeWidth={2}/>
              </div>
              <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:5, letterSpacing:'-0.2px' }}>{title}</div>
              <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{desc}</div>
            </a>
          ))}
        </div>

        {/* AGENT GUIDE HEADER */}
        <div id='agent' style={{ scrollMarginTop:80, marginTop:24 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#d97706', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:100, padding:'4px 14px' }}>Auto-Install Agent</div>
            <h2 style={{ fontSize:28, fontWeight:900, color:'#0f172a', letterSpacing:'-0.9px', marginBottom:10 }}>Install SSL on your server in one command</h2>
            <p style={{ color:'#64748b', fontSize:14, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>
              The SSLVault agent auto-detects your OS and web server, writes the certificate files, updates your config, and reloads — all in one go.
            </p>
          </div>

          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, padding:32, marginBottom:24, boxShadow:'0 12px 40px rgba(15,23,42,0.06)' }}>

            <Step n={1} title='Generate your SSL certificate first' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>
                Go to <strong style={{ color:'#0f172a' }}>Issue Certificate</strong> in the navigation and enter your domain name. Complete the DNS verification. Your certificate will appear in <strong style={{ color:'#0f172a' }}>Inventory & Monitor</strong>.
              </p>
              <Note type='info'>You need a valid, issued certificate before using the agent. Pending or expired certificates cannot be installed.</Note>
            </Step>

            <Step n={2} title='Click "Install on Server" button' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>
                Go to <strong style={{ color:'#0f172a' }}>Inventory & Monitor</strong> → expand your domain panel → find the latest certificate → click the <strong style={{ color:'#d97706' }}>Install on Server</strong> button (next to Request Renewal).
              </p>
              <div style={{ background:'#fffbeb', borderRadius:10, padding:'12px 16px', border:'1.5px solid #fde68a', display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'white', border:'1.5px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Server size={16} color='#d97706'/>
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:13, color:'#92400e', marginBottom:2 }}>Install on Server</p>
                  <p style={{ fontSize:11, color:'#78716c' }}>This button appears next to Request Renewal in the certificate panel</p>
                </div>
              </div>
            </Step>

            <Step n={3} title='Click "Generate Install Token"' color='#d97706'
              img={'╔═══════════════════════════════════════╗\n║     SSLVault Auto-Install Agent       ║\n║     Free SSL Certificate Manager      ║\n╚═══════════════════════════════════════╝\n\nWhat this does:\n✓ Connects to your server via a one-time secure token\n✓ Auto-detects your OS and web server (Nginx/Apache)\n✓ Writes certificate and private key to correct paths\n✓ Updates your web server config automatically\n✓ Reloads Nginx/Apache — zero downtime\n\n[🚀 Generate Install Token]'}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>
                A modal will appear explaining what the agent does. Click <strong style={{ color:'#0f172a' }}>Generate Install Token</strong>. A unique one-time token will be created — valid for 1 hour.
              </p>
              <Note type='warn'>The token expires in 1 hour. If you don't use it in time, generate a new one.</Note>
            </Step>

            <Step n={4} title='Copy and run the install command on your server' color='#d97706'
              img={'# SSH into your server first:\nssh user@yourserver.com\n\n# Then run this command (your token will be different):\ncurl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=abc123def456'}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>
                SSH into your server and paste the command shown in the modal. The command will download and run the installer script securely over HTTPS.
              </p>
              <Note type='info'>You need root or sudo access. The script will ask for your sudo password if needed.</Note>
            </Step>

            <Step n={5} title='Watch the installation progress' color='#d97706'
              img={'[SSLVault] Detecting operating system...\n[✓] Detected: Ubuntu 22.04 LTS\n[SSLVault] Detecting web server...\n[✓] Found: Nginx (nginx/1.18.0)\n[SSLVault] Connecting to SSLVault...\n[✓] Got certificate for: yourdomain.com\n[SSLVault] Creating certificate directory: /etc/ssl/sslvault/yourdomain.com\n[SSLVault] Writing certificate files...\n[✓] Certificate files saved to /etc/ssl/sslvault/yourdomain.com\n[SSLVault] Configuring Nginx...\n[✓] Nginx configured and reloaded\n\n╔═══════════════════════════════════════╗\n║   ✅  Installation Complete!           ║\n╚═══════════════════════════════════════╝\n\n[✓] Domain:      yourdomain.com\n[✓] Cert dir:    /etc/ssl/sslvault/yourdomain.com\n[✓] Web server:  nginx\n[✓] Config:      /etc/nginx/sites-available/yourdomain.com'}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:8 }}>
                The script will show real-time progress. Back in the SSLVault dashboard, click <strong style={{ color:'#0f172a' }}>I've Run the Command — Monitor Progress</strong> to see live status updates.
              </p>
            </Step>

            <Step n={6} title='Verify installation' color='#d97706'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:14 }}>
                Once complete, the dashboard will show a success screen with your server details. Test your SSL certificate:
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <a href='https://www.ssllabs.com/ssltest/' target='_blank' rel='noopener noreferrer'
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:10, textDecoration:'none', color:'#2563eb', fontSize:12, fontWeight:700 }}>
                  <ExternalLink size={12}/> SSL Labs Test
                </a>
                <a href='https://www.sslshopper.com/ssl-checker.html' target='_blank' rel='noopener noreferrer'
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#f5f3ff', border:'1.5px solid #ddd6fe', borderRadius:10, textDecoration:'none', color:'#7c3aed', fontSize:12, fontWeight:700 }}>
                  <ExternalLink size={12}/> SSL Shopper
                </a>
              </div>
            </Step>
          </div>
        </div>

        {/* SUPPORTED ENVIRONMENTS */}
        <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, padding:32, marginBottom:24, boxShadow:'0 12px 40px rgba(15,23,42,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#ecfdf5', border:'1.5px solid #a7f3d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✅</div>
            <h3 style={{ fontWeight:900, fontSize:18, color:'#0f172a', letterSpacing:'-0.4px' }}>Supported environments</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            <div>
              <p style={{ fontWeight:800, fontSize:13, marginBottom:12, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.6px' }}>Operating Systems</p>
              {[['✅','Ubuntu 20.04, 22.04, 24.04'],['✅','Debian 10, 11, 12'],['✅','CentOS 7, 8, 9'],['✅','RHEL 8, 9'],['✅','Amazon Linux 2, 2023'],['✅','Alpine Linux'],['⚠️','Other Linux (best effort)'],['❌','Windows (use IIS method instead)']].map(([s,t]) => (
                <div key={t} style={{ display:'flex', gap:10, fontSize:13, color:'#475569', marginBottom:7, alignItems:'center' }}>
                  <span style={{ flexShrink:0, fontSize:13 }}>{s}</span> {t}
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:13, marginBottom:12, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.6px' }}>Web Servers</p>
              {[['✅','Nginx (auto-config + reload)'],['✅','Apache2 / httpd (auto-config + reload)'],['⚠️','Caddy (cert files saved, manual config)'],['⚠️','Node.js (cert files saved, manual update)'],['⚠️','No web server (cert files saved)']].map(([s,t]) => (
                <div key={t} style={{ display:'flex', gap:10, fontSize:13, color:'#475569', marginBottom:7, alignItems:'center' }}>
                  <span style={{ flexShrink:0, fontSize:13 }}>{s}</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AGENT TROUBLESHOOTING */}
        <div style={{ marginTop:32 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#dc2626', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:100, padding:'4px 14px' }}>Troubleshooting</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px' }}>Common agent issues, fixed fast</h2>
          </div>

          <Section title='Token expired error' icon='⏰' color='#d97706' bg='#fffbeb' border='#fde68a'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>
              Tokens expire after 1 hour. If you see <code style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'2px 7px', borderRadius:5, fontSize:12 }}>Token expired</code>, go back to Inventory & Monitor → click Install on Server → Generate a new token → run the new command.
            </p>
          </Section>

          <Section title='Permission denied errors' icon='🔒' color='#dc2626' bg='#fef2f2' border='#fecaca'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>Make sure you run the command with sudo:</p>
            <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px', border:'1px solid #1e293b' }}>
              <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{'curl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=YOUR_TOKEN'}</pre>
            </div>
          </Section>

          <Section title='Nginx config test failed' icon='⚙️' color='#059669' bg='#ecfdf5' border='#a7f3d0'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>
              The agent backs up your existing config before modifying it. Check the backup and the nginx error:
            </p>
            <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px', border:'1px solid #1e293b' }}>
              <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{'# Check nginx error\nnginx -t\n\n# Restore backup if needed\nsudo cp /etc/nginx/sites-available/yourdomain.com.sslvault.bak /etc/nginx/sites-available/yourdomain.com'}</pre>
            </div>
          </Section>

          <Section title='curl: command not found' icon='💻' color='#2563eb' bg='#eff6ff' border='#bfdbfe'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>Install curl first:</p>
            <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px', border:'1px solid #1e293b' }}>
              <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{'# Ubuntu/Debian\nsudo apt install curl -y\n\n# CentOS/RHEL\nsudo yum install curl -y\n\n# Alpine\nsudo apk add curl'}</pre>
            </div>
          </Section>

          <Section title='Certificate saved but web server not updated' icon='📁' color='#7c3aed' bg='#f5f3ff' border='#ddd6fe'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, marginBottom:10 }}>
              Even if the web server config fails, your certificate files are always saved. Find them at:
            </p>
            <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px', marginBottom:10, border:'1px solid #1e293b' }}>
              <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{'/etc/ssl/sslvault/yourdomain.com/fullchain.pem\n/etc/ssl/sslvault/yourdomain.com/privkey.pem'}</pre>
            </div>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.65 }}>Use these paths in your web server config manually. See the <strong style={{ color:'#0f172a' }}>Install Guide</strong> in the nav for server-specific instructions.</p>
          </Section>
        </div>

        {/* DNS GUIDE */}
        <div id='dns' style={{ marginTop:48, scrollMarginTop:80 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#7c3aed', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:100, padding:'4px 14px' }}>DNS Setup</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px' }}>Connect your DNS once, never paste TXT records again</h2>
          </div>
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, padding:32, boxShadow:'0 12px 40px rgba(15,23,42,0.06)', marginBottom:16 }}>
            <Step n={1} title='Go to DNS Providers in the navigation' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Click <strong style={{ color:'#0f172a' }}>More → DNS Providers</strong> in the top navigation bar. This page lets you configure automatic DNS record creation so you never have to manually add TXT records.</p>
            </Step>
            <Step n={2} title='Click Add Provider and select your DNS provider' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Choose from Vercel, Cloudflare, GoDaddy, or DigitalOcean. Enter your API credentials (see provider-specific guides below). Click Validate and Save — credentials are encrypted with AES-256 before storage.</p>
            </Step>
            <Step n={3} title='Generate a certificate — DNS is added automatically' color='#7c3aed'>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>Next time you generate an SSL certificate for a domain managed by your configured provider, the TXT record is created automatically. You'll see <strong style={{ color:'#059669' }}>✅ DNS record auto-added via Cloudflare</strong> on the verification step.</p>
            </Step>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop:48 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:100, padding:'4px 14px' }}>FAQ</div>
            <h2 style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px' }}>Frequently asked questions</h2>
          </div>

          {[
            ['Is the agent secure?', 'Yes. The install token is a one-time UUID that expires in 1 hour. It only works for the specific certificate it was generated for. All communication is over HTTPS. The agent never stores credentials — it downloads the cert and then the token is consumed.', '#059669', '#ecfdf5', '#a7f3d0'],
            ['What happens to my existing web server config?', 'The agent always backs up your existing config file before modifying it (saved as filename.sslvault.bak). If anything goes wrong, you can restore the backup manually.', '#7c3aed', '#f5f3ff', '#ddd6fe'],
            ['Can I use the agent on multiple servers?', 'Yes. Generate a new token for each server. Each token is single-use and domain-specific.', '#2563eb', '#eff6ff', '#bfdbfe'],
            ['Does it support wildcard certificates?', 'Yes. If you generated a wildcard cert (*.domain.com), the agent will install it. Make sure your Nginx/Apache config uses the wildcard domain in server_name.', '#d97706', '#fffbeb', '#fde68a'],
            ['What if my server has a firewall?', 'The agent only makes outbound HTTPS connections to Supabase (port 443). No inbound connections are needed. Your firewall does not need any changes.', '#0ea5e9', '#f0f9ff', '#bae6fd'],
            ['How do I renew and reinstall?', 'Generate a new certificate from SSLVault (Request Renewal button), then click Install on Server again on the new cert. Generate a fresh token and run the command. The agent will overwrite the old cert files.', '#db2777', '#fdf2f8', '#fbcfe8'],
            ['Is this free?', "Yes, SSLVault and the auto-install agent are completely free. SSL certificates from Let's Encrypt are also free.", '#16a34a', '#f0fdf4', '#bbf7d0'],
          ].map(([q,a,c,bg,bd]) => (
            <Section key={q} title={q} icon='❓' color={c} bg={bg} border={bd}>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>{a}</p>
            </Section>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop:48 }}>
          <div style={{ background:'#0f172a', borderRadius:20, padding:'48px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-100, right:-100, width:300, height:300, background:'radial-gradient(circle, rgba(37,99,235,0.4), transparent 70%)', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:-80, left:-80, width:240, height:240, background:'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)', borderRadius:'50%' }} />
            <div style={{ position:'relative' }}>
              <h3 style={{ fontSize:28, fontWeight:900, letterSpacing:'-1px', color:'white', marginBottom:10, lineHeight:1.1 }}>Ready to install your first certificate?</h3>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, maxWidth:440, margin:'0 auto 24px', lineHeight:1.65 }}>Generate a free SSL certificate and install it on your server in under 5 minutes.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#0f172a', border:'none', padding:'13px 26px', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'-0.2px' }}>
                  <Shield size={15}/> Generate free SSL <ArrowRight size={14}/>
                </button>
                <button onClick={() => nav('/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.25)', padding:'13px 22px', borderRadius:11, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                  My certificates
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
