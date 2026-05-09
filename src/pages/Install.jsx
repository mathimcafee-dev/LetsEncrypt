import { useState } from 'react'
import { Terminal, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Shield, ArrowRight } from 'lucide-react'

function CopyBlock({ code }) {
  const [ok, setOk] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard.writeText(code) } catch(e) {}
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }
  return (
    <div style={{ background:'#0f172a', borderRadius:10, marginBottom:10, overflow:'hidden', border:'1px solid #1e293b' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#1e293b' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444' }} />
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b' }} />
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }} />
          <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', marginLeft:8, letterSpacing:'0.3px' }}>terminal</span>
        </div>
        <button onClick={doCopy} style={{ background:'none', border:'none', cursor:'pointer', color:ok?'#34d399':'#94a3b8', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600 }}>
          {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
        </button>
      </div>
      <pre style={{ margin:0, padding:'14px 16px', color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.75 }}>{code}</pre>
    </div>
  )
}

function OsTab({ tabs }) {
  const [i, setI] = useState(0)
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {tabs.map((t, idx) => (
          <button key={idx} onClick={() => setI(idx)}
            style={{
              background: i===idx ? 'linear-gradient(135deg,#1d4ed8,#4f46e5)' : 'white',
              color: i===idx ? 'white' : '#475569',
              border: i===idx ? 'none' : '1.5px solid #e2e8f0',
              padding:'6px 14px',
              borderRadius:8,
              fontSize:12,
              fontWeight:700,
              cursor:'pointer',
              fontFamily:'inherit',
              boxShadow: i===idx ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
              transition:'all 0.15s'
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <CopyBlock code={tabs[i].code} />
    </div>
  )
}

function StackCard({ title, icon, color, bg, border, children, defaultOpen=false }) {
  const [show, setShow] = useState(defaultOpen)
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, overflow:'hidden', marginBottom:14, boxShadow:'0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)' }}>
      <div onClick={() => setShow(s => !s)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', cursor:'pointer', background: show ? bg : 'white', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:bg, border:'1.5px solid '+border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'#0f172a', letterSpacing:'-0.2px', marginBottom:2 }}>{title}</div>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{show ? 'Click to collapse' : 'Click to expand setup steps'}</div>
          </div>
        </div>
        <div style={{ width:30, height:30, borderRadius:'50%', background: show ? color : '#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
          {show ? <ChevronUp size={14} color='white'/> : <ChevronDown size={14} color='#64748b'/>}
        </div>
      </div>
      {show && <div style={{ padding:'22px 24px', borderTop:'1px solid '+border, background:'white' }}>{children}</div>}
    </div>
  )
}

function Step({ n, title, color='#2563eb', children }) {
  return (
    <div style={{ display:'flex', gap:14, marginBottom:20 }}>
      <div style={{ width:30, height:30, borderRadius:'50%', background:'white', color:color, border:'2px solid '+color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0, marginTop:1 }}>{n}</div>
      <div style={{ flex:1, paddingTop:3 }}>
        <p style={{ fontWeight:800, fontSize:13, marginBottom:10, color:'#0f172a', letterSpacing:'-0.1px' }}>{title}</p>
        {children}
      </div>
    </div>
  )
}

function Note({ type='info', children }) {
  const styles = {
    info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8', prefix:'ℹ' },
    warn:    { bg:'#fffbeb', border:'#fde68a', color:'#92400e', prefix:'⚠' },
    error:   { bg:'#fef2f2', border:'#fecaca', color:'#991b1b', prefix:'❌' },
    success: { bg:'#ecfdf5', border:'#a7f3d0', color:'#047857', prefix:'✅' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{ background:s.bg, border:'1.5px solid '+s.border, borderRadius:10, padding:'10px 14px', fontSize:12, marginBottom:10, lineHeight:1.65, color:s.color, fontWeight:500 }}>
      <strong style={{ marginRight:6 }}>{s.prefix}</strong>{children}
    </div>
  )
}

const STACKS = [
  { id:'nginx',  title:'Nginx',                          icon:'⚙️',  color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
  { id:'apache', title:'Apache',                          icon:'🪶',  color:'#dc2626', bg:'#fef2f2', border:'#fecaca' },
  { id:'caddy',  title:'Caddy',                           icon:'🏃',  color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd' },
  { id:'node',   title:'Node.js / Express',               icon:'🟢',  color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
  { id:'docker', title:'Docker / Docker Compose',         icon:'🐳',  color:'#0284c7', bg:'#eff6ff', border:'#bfdbfe' },
  { id:'cpanel', title:'cPanel (GoDaddy, Bluehost, ...)', icon:'🖥️',  color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
  { id:'plesk',  title:'Plesk',                           icon:'🎛️',  color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  { id:'iis',    title:'Windows IIS',                     icon:'🪟',  color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
]

export default function Install({ nav }) {
  const [domain, setDomain] = useState('')
  const d = domain.replace(/^https?:\/\//,'').replace(/\/.*/,'').trim() || 'yourdomain.com'
  const dir = '/etc/ssl/' + d

  return (
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      <div style={{ position:'relative', maxWidth:1100, margin:'0 auto', padding:'56px 24px 80px' }}>

        {/* HERO */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:24, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Universal Install Guide · 8 platforms supported</span>
          </div>
          <h1 style={{ fontSize:'clamp(32px,4vw,48px)', fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-2px', marginBottom:6 }}>Install your SSL,</h1>
          <h1 style={{ fontSize:'clamp(32px,4vw,48px)', fontWeight:900, lineHeight:1.06, letterSpacing:'-2px', marginBottom:18, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>everywhere it runs.</h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, maxWidth:560, margin:'0 auto' }}>
            Step-by-step guides for every web server, on every operating system. Copy-paste commands, no guesswork.
          </p>
        </div>

        {/* DOMAIN INPUT */}
        <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:24, marginBottom:32, boxShadow:'0 12px 40px rgba(15,23,42,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(37,99,235,0.3)' }}>
              <Terminal size={16} color='white' strokeWidth={2.2}/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:14, color:'#0f172a', letterSpacing:'-0.2px' }}>Personalise the commands</p>
              <p style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>Enter your domain — every command below auto-updates</p>
            </div>
          </div>
          <input
            placeholder='example.com'
            value={domain}
            onChange={e => setDomain(e.target.value)}
            style={{ width:'100%', maxWidth:420, padding:'11px 14px', fontSize:14, fontFamily:'inherit', border:'1.5px solid #e2e8f0', borderRadius:10, outline:'none', color:'#0f172a', background:'#fafbfc' }}
            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafbfc' }}
          />
        </div>

        {/* PRELIMINARIES */}
        <StackCard title='Step 1 — Download your certificate files' icon='📥' color='#16a34a' bg='#f0fdf4' border='#bbf7d0' defaultOpen>
          <p style={{ fontSize:13, color:'#475569', marginBottom:14, lineHeight:1.7 }}>Go to <strong style={{ color:'#0f172a' }}>Inventory & Monitor</strong> → click your domain panel → download:</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:12 }}>
            <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#15803d', marginBottom:4 }}>fullchain.pem</div>
              <div style={{ fontSize:11, color:'#64748b', lineHeight:1.55 }}>Use this as your certificate on ALL servers</div>
            </div>
            <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#b91c1c', marginBottom:4 }}>key.pem</div>
              <div style={{ fontSize:11, color:'#64748b', lineHeight:1.55 }}>Private key — never share this file</div>
            </div>
          </div>
          <Note type='warn'>Always use <strong>fullchain.pem</strong> (not cert.pem) — it includes the full chain trusted by all browsers.</Note>
        </StackCard>

        <StackCard title='Step 2 — Upload files to your server' icon='📤' color='#7c3aed' bg='#f5f3ff' border='#ddd6fe'>
          <Step n={1} title='Create certificate directory on your server' color='#7c3aed'>
            <OsTab tabs={[
              { label:'Linux', code:'sudo mkdir -p ' + dir + '\nsudo chmod 755 ' + dir },
              { label:'macOS', code:'sudo mkdir -p ' + dir },
              { label:'Windows (PowerShell)', code:'New-Item -ItemType Directory -Path "C:\\SSL\\' + d + '" -Force' },
            ]} />
          </Step>
          <Step n={2} title='Upload from your computer to server' color='#7c3aed'>
            <OsTab tabs={[
              { label:'Mac/Linux SCP', code:'scp ~/Downloads/fullchain.pem user@yourserver:' + dir + '/fullchain.pem\nscp ~/Downloads/key.pem user@yourserver:' + dir + '/privkey.pem' },
              { label:'Windows SCP', code:'scp %USERPROFILE%\\Downloads\\fullchain.pem user@server:' + dir + '/fullchain.pem\nscp %USERPROFILE%\\Downloads\\key.pem user@server:' + dir + '/privkey.pem' },
              { label:'WinSCP / FileZilla', code:'1. Connect to your server\n2. Navigate to ' + dir + '\n3. Drag and drop fullchain.pem and key.pem\n4. Rename key.pem to privkey.pem' },
              { label:'Paste via nano', code:'sudo nano ' + dir + '/fullchain.pem\n# Paste content, then Ctrl+X Y Enter\nsudo nano ' + dir + '/privkey.pem\n# Paste content, then Ctrl+X Y Enter' },
            ]} />
          </Step>
          <Step n={3} title='Set file permissions' color='#7c3aed'>
            <OsTab tabs={[
              { label:'Linux', code:'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem\nsudo chown root:root ' + dir + '/*' },
              { label:'macOS', code:'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem' },
              { label:'Windows', code:'icacls "C:\\SSL\\' + d + '\\privkey.pem" /grant "IIS_IUSRS:R"' },
            ]} />
          </Step>
        </StackCard>

        {/* CHOOSE STACK SECTION HEADER */}
        <div style={{ textAlign:'center', margin:'48px 0 20px' }}>
          <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#2563eb', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:100, padding:'4px 14px' }}>Step 3 — Pick your stack</div>
          <h2 style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px' }}>Choose your web server</h2>
        </div>

        {/* NGINX */}
        <StackCard title='Nginx' icon='⚙️' color='#059669' bg='#ecfdf5' border='#a7f3d0'>
          <Step n={1} title='Install Nginx' color='#059669'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo apt update && sudo apt install nginx -y\nsudo systemctl enable --now nginx' },
              { label:'CentOS 7', code:'sudo yum install epel-release nginx -y\nsudo systemctl enable --now nginx' },
              { label:'CentOS 8 / RHEL', code:'sudo dnf install nginx -y\nsudo systemctl enable --now nginx' },
              { label:'Amazon Linux', code:'sudo amazon-linux-extras install nginx1 -y\nsudo systemctl enable --now nginx' },
              { label:'Alpine', code:'sudo apk add nginx\nrc-update add nginx default && rc-service nginx start' },
              { label:'macOS', code:'brew install nginx && brew services start nginx' },
              { label:'Windows', code:'# Download from http://nginx.org/en/download.html\n# Extract to C:\\nginx, run as Admin:\ncd C:\\nginx && nginx.exe' },
            ]} />
          </Step>
          <Step n={2} title='Create config file' color='#059669'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo nano /etc/nginx/sites-available/' + d },
              { label:'CentOS/RHEL/Amazon/Alpine', code:'sudo nano /etc/nginx/conf.d/' + d + '.conf' },
              { label:'macOS', code:'nano /usr/local/etc/nginx/servers/' + d + '.conf' },
              { label:'Windows', code:'notepad C:\\nginx\\conf\\' + d + '.conf' },
            ]} />
            <p style={{ fontSize:12, color:'#475569', marginBottom:8, fontWeight:500 }}>Paste this config:</p>
            <CopyBlock code={'server {\n    listen 80;\n    server_name ' + d + ';\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ' + d + ';\n\n    ssl_certificate     ' + dir + '/fullchain.pem;\n    ssl_certificate_key ' + dir + '/privkey.pem;\n\n    ssl_protocols TLSv1.2 TLSv1.3;\n    ssl_prefer_server_ciphers off;\n    ssl_session_cache shared:SSL:10m;\n    add_header Strict-Transport-Security "max-age=63072000" always;\n\n    root /var/www/html;\n    index index.html;\n    location / { try_files $uri $uri/ =404; }\n}'} />
          </Step>
          <Step n={3} title='Enable and reload' color='#059669'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo ln -s /etc/nginx/sites-available/' + d + ' /etc/nginx/sites-enabled/\nsudo nginx -t && sudo systemctl reload nginx' },
              { label:'CentOS/RHEL/Amazon/Alpine', code:'sudo nginx -t && sudo systemctl reload nginx' },
              { label:'macOS', code:'nginx -t && brew services restart nginx' },
              { label:'Windows', code:'cd C:\\nginx && nginx.exe -t && nginx.exe -s reload' },
            ]} />
          </Step>
        </StackCard>

        {/* APACHE */}
        <StackCard title='Apache' icon='🪶' color='#dc2626' bg='#fef2f2' border='#fecaca'>
          <Step n={1} title='Install Apache' color='#dc2626'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo apt install apache2 -y\nsudo a2enmod ssl rewrite headers\nsudo systemctl restart apache2' },
              { label:'CentOS 7', code:'sudo yum install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label:'CentOS 8 / RHEL', code:'sudo dnf install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label:'Amazon Linux', code:'sudo yum install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label:'Alpine', code:'sudo apk add apache2 apache2-ssl\nrc-update add apache2 default && rc-service apache2 start' },
              { label:'macOS', code:'brew install httpd && brew services start httpd' },
              { label:'Windows', code:'# Download from https://www.apachelounge.com/download/\n# Extract to C:\\Apache24, run as Admin:\ncd C:\\Apache24\\bin && httpd.exe -k install && httpd.exe -k start' },
            ]} />
          </Step>
          <Step n={2} title='Create virtual host config' color='#dc2626'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo nano /etc/apache2/sites-available/' + d + '.conf' },
              { label:'CentOS/RHEL/Amazon', code:'sudo nano /etc/httpd/conf.d/' + d + '.conf' },
              { label:'macOS', code:'nano /usr/local/etc/httpd/extra/' + d + '.conf' },
              { label:'Windows', code:'notepad C:\\Apache24\\conf\\extra\\' + d + '.conf' },
            ]} />
            <CopyBlock code={'<VirtualHost *:80>\n    ServerName ' + d + '\n    Redirect permanent / https://' + d + '/\n</VirtualHost>\n\n<VirtualHost *:443>\n    ServerName ' + d + '\n    SSLEngine on\n    SSLCertificateFile     ' + dir + '/fullchain.pem\n    SSLCertificateKeyFile  ' + dir + '/privkey.pem\n    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1\n    Header always set Strict-Transport-Security "max-age=63072000"\n    DocumentRoot /var/www/html\n</VirtualHost>'} />
          </Step>
          <Step n={3} title='Enable and restart' color='#dc2626'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo a2ensite ' + d + '.conf\nsudo apache2ctl configtest && sudo systemctl reload apache2' },
              { label:'CentOS/RHEL/Amazon', code:'sudo apachectl configtest && sudo systemctl reload httpd' },
              { label:'macOS', code:'apachectl configtest && brew services restart httpd' },
              { label:'Windows', code:'cd C:\\Apache24\\bin && httpd.exe -t && httpd.exe -k restart' },
            ]} />
          </Step>
        </StackCard>

        {/* CADDY */}
        <StackCard title='Caddy' icon='🏃' color='#0ea5e9' bg='#f0f9ff' border='#bae6fd'>
          <Step n={1} title='Install Caddy' color='#0ea5e9'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list\nsudo apt update && sudo apt install caddy' },
              { label:'CentOS/RHEL', code:'sudo dnf install "dnf-command(copr)" -y\nsudo dnf copr enable @caddy/caddy -y\nsudo dnf install caddy -y\nsudo systemctl enable --now caddy' },
              { label:'Amazon Linux', code:'curl -Lo caddy "https://caddyserver.com/api/download?os=linux&arch=amd64"\nchmod +x caddy && sudo mv caddy /usr/bin/caddy' },
              { label:'Alpine', code:'sudo apk add caddy\nrc-update add caddy default && rc-service caddy start' },
              { label:'macOS', code:'brew install caddy && brew services start caddy' },
              { label:'Windows', code:'# Download from https://caddyserver.com/download\n# Extract caddy.exe to C:\\Caddy\n# Run as Admin: cd C:\\Caddy && caddy.exe run' },
            ]} />
          </Step>
          <Step n={2} title='Edit Caddyfile and reload' color='#0ea5e9'>
            <OsTab tabs={[
              { label:'Linux', code:'sudo nano /etc/caddy/Caddyfile' },
              { label:'macOS', code:'nano /usr/local/etc/caddy/Caddyfile' },
              { label:'Windows', code:'notepad C:\\Caddy\\Caddyfile' },
            ]} />
            <CopyBlock code={d + ' {\n    tls ' + dir + '/fullchain.pem ' + dir + '/privkey.pem\n    root * /var/www/html\n    file_server\n    encode gzip\n}'} />
            <OsTab tabs={[
              { label:'Linux (systemd)', code:'sudo systemctl reload caddy' },
              { label:'Alpine', code:'rc-service caddy restart' },
              { label:'macOS', code:'brew services restart caddy' },
              { label:'Windows', code:'cd C:\\Caddy && caddy.exe reload' },
            ]} />
          </Step>
        </StackCard>

        {/* NODE */}
        <StackCard title='Node.js / Express' icon='🟢' color='#16a34a' bg='#f0fdf4' border='#bbf7d0'>
          <Step n={1} title='Install Node.js' color='#16a34a'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install nodejs -y' },
              { label:'CentOS/RHEL/Amazon', code:'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -\nsudo yum install nodejs -y' },
              { label:'macOS', code:'brew install node\n# Or download from https://nodejs.org' },
              { label:'Windows', code:'# Download from https://nodejs.org\n# Or: winget install OpenJS.NodeJS' },
            ]} />
          </Step>
          <Step n={2} title='HTTPS server code' color='#16a34a'>
            <CopyBlock code={"const https = require('https')\nconst fs = require('fs')\nconst express = require('express')\n\nconst app = express()\napp.get('/', (req, res) => res.send('Hello HTTPS!'))\n\nhttps.createServer({\n  key:  fs.readFileSync('" + dir + "/privkey.pem'),\n  cert: fs.readFileSync('" + dir + "/fullchain.pem')\n}, app).listen(443)"} />
          </Step>
          <Step n={3} title='Keep alive with PM2' color='#16a34a'>
            <OsTab tabs={[
              { label:'Linux/macOS', code:'npm install -g pm2\nsudo pm2 start server.js --name myapp\nsudo pm2 startup && sudo pm2 save' },
              { label:'Windows', code:'npm install -g pm2 pm2-windows-startup\npm2-startup install\npm2 start server.js --name myapp && pm2 save' },
            ]} />
          </Step>
        </StackCard>

        {/* DOCKER */}
        <StackCard title='Docker / Docker Compose' icon='🐳' color='#0284c7' bg='#eff6ff' border='#bfdbfe'>
          <Step n={1} title='Install Docker' color='#0284c7'>
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'curl -fsSL https://get.docker.com | sudo sh\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER' },
              { label:'CentOS/RHEL', code:'sudo dnf install docker-ce docker-ce-cli -y\nsudo systemctl enable --now docker' },
              { label:'Amazon Linux', code:'sudo amazon-linux-extras install docker -y\nsudo systemctl enable --now docker' },
              { label:'macOS', code:'# Download Docker Desktop from https://docker.com/products/docker-desktop' },
              { label:'Windows', code:'# Download Docker Desktop from https://docker.com/products/docker-desktop\n# Requires WSL2 or Hyper-V' },
            ]} />
          </Step>
          <Step n={2} title='docker-compose.yml with SSL' color='#0284c7'>
            <CopyBlock code={'version: "3.8"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - "80:80"\n      - "443:443"\n    volumes:\n      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro\n      - ./certs/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro\n      - ./certs/privkey.pem:/etc/ssl/private/privkey.pem:ro\n    restart: unless-stopped'} />
            <CopyBlock code={'mkdir -p ./certs\ncp /path/to/fullchain.pem ./certs/\ncp /path/to/key.pem ./certs/privkey.pem\ndocker-compose up -d'} />
          </Step>
        </StackCard>

        {/* CPANEL */}
        <StackCard title='cPanel (GoDaddy, Bluehost, Hostgator)' icon='🖥️' color='#d97706' bg='#fffbeb' border='#fde68a'>
          <Note>cPanel is browser-based — works from any OS. No terminal needed.</Note>
          <Step n={1} title='Open SSL/TLS Manager' color='#d97706'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.8 }}>
              Login to cPanel → search <strong style={{ color:'#0f172a' }}>SSL/TLS</strong> → <strong style={{ color:'#0f172a' }}>Manage SSL Sites</strong> → select domain → <strong style={{ color:'#0f172a' }}>Install an SSL Certificate</strong>
            </p>
          </Step>
          <Step n={2} title='Paste certificate contents' color='#d97706'>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
              {[['Certificate (CRT)','Open fullchain.pem in Notepad → copy all → paste here'],
                ['Private Key (KEY)','Open key.pem → copy all → paste here'],
                ['CA Bundle','Leave blank']].map(([l,h]) => (
                <div key={l} style={{ display:'flex', gap:12, padding:'10px 14px', background:'white', border:'1px solid #fde68a', borderRadius:9, fontSize:12 }}>
                  <span style={{ fontWeight:800, color:'#92400e', minWidth:160, flexShrink:0 }}>{l}</span>
                  <span style={{ color:'#475569' }}>{h}</span>
                </div>
              ))}
            </div>
          </Step>
          <Step n={3} title='Click Install Certificate' color='#d97706'>
            <p style={{ fontSize:13, color:'#475569' }}>Done — site is immediately live on HTTPS.</p>
          </Step>
        </StackCard>

        {/* PLESK */}
        <StackCard title='Plesk' icon='🎛️' color='#7c3aed' bg='#f5f3ff' border='#ddd6fe'>
          <Step n={1} title='Open SSL/TLS Certificates' color='#7c3aed'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.8 }}>Login → Websites and Domains → your domain → <strong style={{ color:'#0f172a' }}>SSL/TLS Certificates</strong></p>
          </Step>
          <Step n={2} title='Add and assign certificate' color='#7c3aed'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.8 }}>
              Click <strong style={{ color:'#0f172a' }}>Add SSL/TLS Certificate</strong> → name it → paste fullchain.pem in Certificate → paste key.pem in Private key → <strong style={{ color:'#0f172a' }}>Upload Certificate</strong><br/>
              Then: Hosting Settings → SSL/TLS support → select your certificate → <strong style={{ color:'#0f172a' }}>OK</strong>
            </p>
          </Step>
        </StackCard>

        {/* IIS */}
        <StackCard title='Windows IIS' icon='🪟' color='#0891b2' bg='#ecfeff' border='#a5f3fc'>
          <Note>IIS is built into Windows Server and Windows 10/11 Pro. IIS needs a PFX file, not PEM.</Note>
          <Step n={1} title='Convert PEM to PFX' color='#0891b2'>
            <CopyBlock code={'# Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html\n# Run in PowerShell:\nopenssl pkcs12 -export -out C:\\SSL\\' + d + '\\cert.pfx -inkey C:\\SSL\\' + d + '\\privkey.pem -in C:\\SSL\\' + d + '\\fullchain.pem\n\n# Import to Windows cert store:\n$pwd = ConvertTo-SecureString "yourpassword" -Force -AsPlainText\nImport-PfxCertificate -FilePath "C:\\SSL\\' + d + '\\cert.pfx" -CertStoreLocation Cert:\\LocalMachine\\My -Password $pwd'} />
          </Step>
          <Step n={2} title='Bind in IIS Manager' color='#0891b2'>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.8 }}>
              IIS Manager → Sites → your site → <strong style={{ color:'#0f172a' }}>Bindings</strong> → Add → Type: <strong style={{ color:'#0f172a' }}>https</strong>, Port: <strong style={{ color:'#0f172a' }}>443</strong> → SSL Certificate: select yours → OK
            </p>
          </Step>
        </StackCard>

        {/* VERIFY */}
        <div style={{ textAlign:'center', margin:'48px 0 20px' }}>
          <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color:'#059669', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:100, padding:'4px 14px' }}>Step 4 — Confirm it works</div>
          <h2 style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.8px' }}>Verify your installation</h2>
        </div>

        <StackCard title='Verify Installation' icon='🔍' color='#0ea5e9' bg='#f0f9ff' border='#bae6fd' defaultOpen>
          <Step n={1} title='Command line check' color='#0ea5e9'>
            <OsTab tabs={[
              { label:'Linux/macOS', code:'# Check expiry\nopenssl x509 -in ' + dir + '/fullchain.pem -noout -dates\n\n# Verify key matches cert (hashes must match)\nopenssl x509 -noout -modulus -in ' + dir + '/fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in ' + dir + '/privkey.pem | md5sum\n\n# Test live connection\ncurl -vI https://' + d },
              { label:'Windows', code:'# Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html\nopenssl x509 -in C:\\SSL\\' + d + '\\fullchain.pem -noout -dates\n\n# Test:\nInvoke-WebRequest -Uri https://' + d + ' -UseBasicParsing' },
            ]} />
          </Step>
          <Step n={2} title='Online tools' color='#0ea5e9'>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[['SSL Labs','https://www.ssllabs.com/ssltest/','#2563eb','#eff6ff','#bfdbfe'],
                ['SSL Shopper','https://www.sslshopper.com/ssl-checker.html','#7c3aed','#f5f3ff','#ddd6fe'],
                ['Why No Padlock','https://www.whynopadlock.com/','#d97706','#fffbeb','#fde68a']].map(([n,u,c,bg,bd]) => (
                <a key={n} href={u} target='_blank' rel='noopener noreferrer'
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', background:bg, border:'1.5px solid '+bd, borderRadius:10, textDecoration:'none', color:c, fontSize:12, fontWeight:700 }}>
                  <ExternalLink size={12}/> {n}
                </a>
              ))}
            </div>
          </Step>
        </StackCard>

        {/* TROUBLESHOOTING */}
        <StackCard title='Troubleshooting' icon='🛠️' color='#dc2626' bg='#fef2f2' border='#fecaca'>
          {[['ERR_SSL_PROTOCOL_ERROR','Port 443 not open or web server not configured for SSL.','sudo ufw allow 443\nsudo systemctl status nginx'],
            ['NET::ERR_CERT_AUTHORITY_INVALID','Using cert.pem instead of fullchain.pem. Update path.','# Change ssl_certificate to point to fullchain.pem\nsudo systemctl reload nginx'],
            ['Private key does not match','key.pem and cert.pem from different orders. Re-download both.','openssl x509 -noout -modulus -in fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in privkey.pem | md5sum\n# Both hashes must match'],
            ['Permission denied on key','Wrong file permissions.','sudo chmod 600 ' + dir + '/privkey.pem'],
            ['Certificate expired','90-day cert expired. Renew from My Certificates.','openssl x509 -noout -dates -in fullchain.pem'],
          ].map(([err, msg, fix]) => (
            <div key={err} style={{ background:'#fafbfc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:800, color:'#b91c1c', marginBottom:6, letterSpacing:'-0.2px' }}>{err}</div>
              <p style={{ fontSize:12, color:'#475569', marginBottom:10, lineHeight:1.65 }}>{msg}</p>
              <CopyBlock code={fix} />
            </div>
          ))}
        </StackCard>

        {/* CTA */}
        <div style={{ marginTop:40 }}>
          <div style={{ background:'#0f172a', borderRadius:20, padding:'48px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-100, right:-100, width:300, height:300, background:'radial-gradient(circle, rgba(37,99,235,0.4), transparent 70%)', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:-80, left:-80, width:240, height:240, background:'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)', borderRadius:'50%' }} />
            <div style={{ position:'relative' }}>
              <h3 style={{ fontSize:28, fontWeight:900, letterSpacing:'-1px', color:'white', marginBottom:10, lineHeight:1.1 }}>Need an SSL certificate?</h3>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, maxWidth:420, margin:'0 auto 24px', lineHeight:1.65 }}>Free 90-day certificate, issued in under 60 seconds. No credit card.</p>
              <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#0f172a', border:'none', padding:'13px 26px', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'-0.2px' }}>
                <Shield size={15}/> Generate free SSL <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
