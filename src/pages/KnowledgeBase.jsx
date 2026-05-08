import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Shield, Server, Terminal, BookOpen } from 'lucide-react'

function Section({ title, icon, children, open: o }) {
  const [show, setShow] = useState(o || false)
  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:12, boxShadow:'var(--shadow)' }}>
      <div onClick={() => setShow(s=>!s)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', cursor:'pointer', background:show?'var(--accent-light)':'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{title}</span>
        </div>
        {show ? <ChevronUp size={15} color="var(--text3)"/> : <ChevronDown size={15} color="var(--text3)"/>}
      </div>
      {show && <div style={{ padding:'20px 22px', borderTop:'1px solid var(--border)' }}>{children}</div>}
    </div>
  )
}

function Step({ n, title, img, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{n}</div>
        <h4 style={{ fontWeight:700, fontSize:14, color:'var(--text)', margin:0 }}>{title}</h4>
      </div>
      {children}
      {img && (
        <div style={{ background:'#0f172a', borderRadius:10, padding:'2px', marginTop:12 }}>
          <div style={{ background:'#1e293b', borderRadius:'8px 8px 0 0', padding:'8px 12px', display:'flex', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#10b981' }}/>
          </div>
          <pre style={{ margin:0, padding:'14px 16px', color:'#e2e8f0', fontSize:12, fontFamily:'monospace', lineHeight:1.8, background:'#0f172a', borderRadius:'0 0 8px 8px' }}>{img}</pre>
        </div>
      )}
    </div>
  )
}

function Note({ type, children }) {
  const colors = { info:['var(--accent-light)','var(--accent-border)','ℹ️'], warn:['var(--yellow-light)','var(--yellow-border)','⚠️'], success:['var(--green-light)','#86efac','✅'] }
  const [bg, border, prefix] = colors[type] || colors.info
  return <div style={{ background:bg, border:'1px solid '+border, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:12, lineHeight:1.7 }}>{prefix} {children}</div>
}

export default function KnowledgeBase({ nav }) {
  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div style={{ width:44, height:44, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookOpen size={22} color="white"/>
          </div>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px', color:'var(--text)' }}>Knowledge Base</h1>
            <p style={{ fontSize:13, color:'var(--text3)' }}>Guides, tutorials and reference documentation</p>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:28 }}>
          {[
            ['🚀', 'Auto-Install Agent', 'One command to install SSL on any server', 'agent'],
            ['📜', 'Manual Installation', 'Step-by-step for Nginx, Apache, cPanel', 'manual'],
            ['🔑', 'DNS Providers', 'Automatic DNS verification setup', 'dns'],
          ].map(([icon,title,desc,id]) => (
            <a key={id} href={'#'+id} style={{ display:'block', background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', textDecoration:'none', boxShadow:'var(--shadow)' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>{desc}</div>
            </a>
          ))}
        </div>

        {/* Auto-Install Agent Guide */}
        <div id="agent" style={{ scrollMarginTop:80 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <Server size={20} color="var(--accent)"/>
            <h2 style={{ fontWeight:800, fontSize:20, color:'var(--text)' }}>Auto-Install Agent</h2>
            <span className="badge badge-green" style={{ fontSize:11 }}>New</span>
          </div>
          <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20, lineHeight:1.7 }}>
            The SSLVault agent automatically installs your SSL certificate on your server with a single command. It detects your OS and web server, writes the certificate files, updates your web server config, and reloads it — all without manual steps.
          </p>

          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, marginBottom:16, boxShadow:'var(--shadow)' }}>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:16, color:'var(--text)' }}>📋 Step-by-Step: Install SSL on Your Server</h3>

            <Step n={1} title='Generate your SSL certificate first'>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                Go to <strong>Generate SSL</strong> in the navigation and enter your domain name. Complete the DNS verification. Your certificate will appear in <strong>My Certificates</strong>.
              </p>
              <Note type="info">You need a valid, issued certificate before using the agent. Pending or expired certificates cannot be installed.</Note>
            </Step>

            <Step n={2} title='Click "Install on Server" button'>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                Go to <strong>My Certificates</strong> → expand your domain panel → find the latest certificate → click the <strong style={{ color:'var(--accent)' }}>Install on Server</strong> button (next to Request Renewal).
              </p>
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 16px', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent-light)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Server size={16} color="var(--accent)"/>
                </div>
                <div>
                  <p style={{ fontWeight:600, fontSize:13, color:'var(--accent)', marginBottom:2 }}>Install on Server</p>
                  <p style={{ fontSize:11, color:'var(--text3)' }}>This button appears next to Request Renewal in the certificate panel</p>
                </div>
              </div>
            </Step>

            <Step n={3} title='Click "Generate Install Token"'
              img={`╔═══════════════════════════════════════╗
║     SSLVault Auto-Install Agent       ║
║     Free SSL Certificate Manager      ║
╚═══════════════════════════════════════╝

What this does:
✓ Connects to your server via a one-time secure token
✓ Auto-detects your OS and web server (Nginx/Apache)
✓ Writes certificate and private key to correct paths
✓ Updates your web server config automatically
✓ Reloads Nginx/Apache — zero downtime

[🚀 Generate Install Token]`}>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                A modal will appear explaining what the agent does. Click <strong>Generate Install Token</strong>. A unique one-time token will be created — valid for 1 hour.
              </p>
              <Note type="warn">The token expires in 1 hour. If you don't use it in time, generate a new one.</Note>
            </Step>

            <Step n={4} title='Copy and run the install command on your server'
              img={`# SSH into your server first:
ssh user@yourserver.com

# Then run this command (your token will be different):
curl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=abc123def456`}>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                SSH into your server and paste the command shown in the modal. The command will download and run the installer script securely over HTTPS.
              </p>
              <Note type="info">You need root or sudo access. The script will ask for your sudo password if needed.</Note>
            </Step>

            <Step n={5} title='Watch the installation progress'
              img={`[SSLVault] Detecting operating system...
[✓] Detected: Ubuntu 22.04 LTS
[SSLVault] Detecting web server...
[✓] Found: Nginx (nginx/1.18.0)
[SSLVault] Connecting to SSLVault...
[✓] Got certificate for: yourdomain.com
[SSLVault] Creating certificate directory: /etc/ssl/sslvault/yourdomain.com
[SSLVault] Writing certificate files...
[✓] Certificate files saved to /etc/ssl/sslvault/yourdomain.com
[SSLVault] Configuring Nginx...
[✓] Nginx configured and reloaded

╔═══════════════════════════════════════╗
║   ✅  Installation Complete!           ║
╚═══════════════════════════════════════╝

[✓] Domain:      yourdomain.com
[✓] Cert dir:    /etc/ssl/sslvault/yourdomain.com
[✓] Web server:  nginx
[✓] Config:      /etc/nginx/sites-available/yourdomain.com`}>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                The script will show real-time progress. Back in the SSLVault dashboard, click <strong>I've Run the Command — Monitor Progress</strong> to see live status updates.
              </p>
            </Step>

            <Step n={6} title='Verify installation'>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:12 }}>
                Once complete, the dashboard will show a success screen with your server details. Test your SSL certificate:
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <a href="https://www.ssllabs.com/ssltest/" target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, textDecoration:'none', color:'var(--accent)', fontSize:13, fontWeight:600 }}>
                  <ExternalLink size={12}/> SSL Labs Test
                </a>
                <a href="https://www.ssllabs.com/ssltest/" target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, textDecoration:'none', color:'var(--accent)', fontSize:13, fontWeight:600 }}>
                  <ExternalLink size={12}/> SSL Shopper
                </a>
              </div>
            </Step>
          </div>
        </div>

        {/* Supported Environments */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, marginBottom:16, boxShadow:'var(--shadow)' }}>
          <h3 style={{ fontWeight:700, fontSize:16, marginBottom:16, color:'var(--text)' }}>✅ Supported Environments</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <p style={{ fontWeight:600, fontSize:13, marginBottom:10, color:'var(--text)' }}>Operating Systems</p>
              {[['✅','Ubuntu 20.04, 22.04, 24.04'],['✅','Debian 10, 11, 12'],['✅','CentOS 7, 8, 9'],['✅','RHEL 8, 9'],['✅','Amazon Linux 2, 2023'],['✅','Alpine Linux'],['⚠️','Other Linux (best effort)'],['❌','Windows (use IIS method instead)']].map(([s,t]) => (
                <div key={t} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text2)', marginBottom:5 }}>
                  <span style={{ flexShrink:0 }}>{s}</span> {t}
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontWeight:600, fontSize:13, marginBottom:10, color:'var(--text)' }}>Web Servers</p>
              {[['✅','Nginx (auto-config + reload)'],['✅','Apache2 / httpd (auto-config + reload)'],['⚠️','Caddy (cert files saved, manual config)'],['⚠️','Node.js (cert files saved, manual update)'],['⚠️','No web server (cert files saved)']].map(([s,t]) => (
                <div key={t} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text2)', marginBottom:5 }}>
                  <span style={{ flexShrink:0 }}>{s}</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div id="troubleshooting">
          <h2 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            🛠️ Agent Troubleshooting
          </h2>
        </div>

        <Section title="Token expired error" icon="⏰">
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
            Tokens expire after 1 hour. If you see <code style={{ fontFamily:'monospace', background:'var(--bg)', padding:'2px 6px', borderRadius:4 }}>Token expired</code>, go back to My Certificates → click Install on Server → Generate a new token → run the new command.
          </p>
        </Section>

        <Section title="Permission denied errors" icon="🔒">
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:10 }}>Make sure you run the command with sudo:</p>
          <div style={{ background:'#0f172a', borderRadius:8, padding:'12px 14px' }}>
            <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace' }}>{'curl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=YOUR_TOKEN'}</pre>
          </div>
        </Section>

        <Section title="Nginx config test failed" icon="⚙️">
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:10 }}>
            The agent backs up your existing config before modifying it. Check the backup and the nginx error:
          </p>
          <div style={{ background:'#0f172a', borderRadius:8, padding:'12px 14px' }}>
            <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace' }}>{'# Check nginx error\nnginx -t\n\n# Restore backup if needed\nsudo cp /etc/nginx/sites-available/yourdomain.com.sslvault.bak /etc/nginx/sites-available/yourdomain.com'}</pre>
          </div>
        </Section>

        <Section title="curl: command not found" icon="💻">
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:10 }}>Install curl first:</p>
          <div style={{ background:'#0f172a', borderRadius:8, padding:'12px 14px' }}>
            <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace' }}>{'# Ubuntu/Debian\nsudo apt install curl -y\n\n# CentOS/RHEL\nsudo yum install curl -y\n\n# Alpine\nsudo apk add curl'}</pre>
          </div>
        </Section>

        <Section title="Certificate saved but web server not updated" icon="📁">
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
            Even if the web server config fails, your certificate files are always saved. Find them at:
          </p>
          <div style={{ background:'#0f172a', borderRadius:8, padding:'12px 14px', marginBottom:10 }}>
            <pre style={{ margin:0, color:'#e2e8f0', fontSize:12, fontFamily:'monospace' }}>{'/etc/ssl/sslvault/yourdomain.com/fullchain.pem\n/etc/ssl/sslvault/yourdomain.com/privkey.pem'}</pre>
          </div>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Use these paths in your web server config manually. See the <strong>Install Guide</strong> in the nav for server-specific instructions.</p>
        </Section>

        {/* DNS Guide */}
        <div id="dns" style={{ marginTop:32, scrollMarginTop:80 }}>
          <h2 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            🔑 DNS Provider Setup
          </h2>
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', marginBottom:16 }}>
            <Step n={1} title="Go to DNS Providers in the navigation">
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>Click <strong>DNS Providers</strong> in the top navigation bar. This page lets you configure automatic DNS record creation so you never have to manually add TXT records.</p>
            </Step>
            <Step n={2} title="Click Add Provider and select your DNS provider">
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>Choose from Vercel, Cloudflare, GoDaddy, or DigitalOcean. Enter your API credentials (see provider-specific guides below). Click Validate and Save — credentials are encrypted with AES-256 before storage.</p>
            </Step>
            <Step n={3} title="Generate a certificate — DNS is added automatically">
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>Next time you generate an SSL certificate for a domain managed by your configured provider, the TXT record is created automatically. You'll see <strong style={{ color:'var(--green)' }}>✅ DNS record auto-added via Cloudflare</strong> on the verification step.</p>
            </Step>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop:32 }}>
          <h2 style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:16 }}>❓ Frequently Asked Questions</h2>
        </div>

        {[
          ['Is the agent secure?', 'Yes. The install token is a one-time UUID that expires in 1 hour. It only works for the specific certificate it was generated for. All communication is over HTTPS. The agent never stores credentials — it downloads the cert and then the token is consumed.'],
          ['What happens to my existing web server config?', 'The agent always backs up your existing config file before modifying it (saved as filename.sslvault.bak). If anything goes wrong, you can restore the backup manually.'],
          ['Can I use the agent on multiple servers?', 'Yes. Generate a new token for each server. Each token is single-use and domain-specific.'],
          ['Does it support wildcard certificates?', 'Yes. If you generated a wildcard cert (*.domain.com), the agent will install it. Make sure your Nginx/Apache config uses the wildcard domain in server_name.'],
          ['What if my server has a firewall?', 'The agent only makes outbound HTTPS connections to Supabase (port 443). No inbound connections are needed. Your firewall does not need any changes.'],
          ['How do I renew and reinstall?', 'Generate a new certificate from SSLVault (Request Renewal button), then click Install on Server again on the new cert. Generate a fresh token and run the command. The agent will overwrite the old cert files.'],
          ['Is this free?', 'Yes, SSLVault and the auto-install agent are completely free. SSL certificates from Lets Encrypt are also free.'],
        ].map(([q,a]) => (
          <Section key={q} title={q} icon="❓">
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{a}</p>
          </Section>
        ))}

        {/* CTA */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:14, padding:'28px', textAlign:'center', marginTop:24 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:'white', marginBottom:8 }}>Ready to install your first certificate?</h3>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, marginBottom:20 }}>Generate a free SSL certificate and install it on your server in under 5 minutes.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              <Shield size={15}/> Generate Free SSL
            </button>
            <button onClick={() => nav('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              My Certificates
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
