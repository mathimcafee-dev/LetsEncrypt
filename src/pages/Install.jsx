import { useState } from 'react'
import { Terminal, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Shield } from 'lucide-react'

function CopyBlock({ code }) {
  const [ok, setOk] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard.writeText(code) } catch(e) {}
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }
  return (
    <div style={{ background:'#0f172a', borderRadius:8, marginBottom:10, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>terminal</span>
        <button onClick={doCopy} style={{ background:'none', border:'none', cursor:'pointer', color:ok?'#34d399':'#475569', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
          {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
        </button>
      </div>
      <pre style={{ margin:0, padding:'12px 14px', color:'#e2e8f0', fontSize:12, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7 }}>{code}</pre>
    </div>
  )
}

function OsTab({ tabs }) {
  const [i, setI] = useState(0)
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
        {tabs.map((t, idx) => (
          <button key={idx} onClick={() => setI(idx)}
            className={i === idx ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
            {t.label}
          </button>
        ))}
      </div>
      <CopyBlock code={tabs[i].code} />
    </div>
  )
}

function Card({ title, icon, children, open: o }) {
  const [show, setShow] = useState(o || false)
  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:12, boxShadow:'var(--shadow)' }}>
      <div onClick={() => setShow(s => !s)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', cursor:'pointer', background:show?'var(--accent-light)':'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{title}</span>
        </div>
        {show ? <ChevronUp size={15} color="var(--text3)"/> : <ChevronDown size={15} color="var(--text3)"/>}
      </div>
      {show && <div style={{ padding:'18px 22px', borderTop:'1px solid var(--border)' }}>{children}</div>}
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display:'flex', gap:12, marginBottom:18 }}>
      <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{n}</div>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:700, fontSize:13, marginBottom:8, color:'var(--text)' }}>{title}</p>
        {children}
      </div>
    </div>
  )
}

function Note({ type, children }) {
  const bg = type === 'warn' ? 'var(--yellow-light)' : type === 'error' ? 'var(--red-light)' : 'var(--accent-light)'
  const border = type === 'warn' ? 'var(--yellow-border)' : type === 'error' ? 'var(--red-border)' : 'var(--accent-border)'
  const prefix = type === 'warn' ? '⚠' : type === 'error' ? '❌' : 'ℹ'
  return (
    <div style={{ background:bg, border:'1px solid '+border, borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:10, lineHeight:1.6 }}>
      {prefix} {children}
    </div>
  )
}

export default function Install({ nav }) {
  const [domain, setDomain] = useState('')
  const d = domain.replace(/^https?:\/\//,'').replace(/\/.*/,'').trim() || 'yourdomain.com'
  const dir = '/etc/ssl/' + d

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container">

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <div style={{ width:44, height:44, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Terminal size={22} color="white"/>
          </div>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px', color:'var(--text)' }}>SSL Installation Guide</h1>
            <p style={{ fontSize:13, color:'var(--text3)' }}>Every server, every OS — step by step</p>
          </div>
        </div>

        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:22, marginBottom:20, boxShadow:'var(--shadow)' }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:10, color:'var(--text)' }}>Enter your domain to personalise commands</p>
          <input placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} style={{ maxWidth:340 }} />
        </div>

        <Card title="Step 1 — Download your certificate files" icon="📥" open>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14, lineHeight:1.7 }}>Go to <strong>My Certificates</strong> → click your domain panel → download:</p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
            <div style={{ background:'var(--green-light)', borderRadius:8, padding:'8px 14px' }}>
              <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--green)' }}>fullchain.pem</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Use this as your certificate on ALL servers</div>
            </div>
            <div style={{ background:'var(--red-light)', borderRadius:8, padding:'8px 14px' }}>
              <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--red)' }}>key.pem</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Private key — never share this file</div>
            </div>
          </div>
          <Note type="warn">Always use <strong>fullchain.pem</strong> (not cert.pem) — it includes the full chain trusted by all browsers.</Note>
        </Card>

        <Card title="Step 2 — Upload files to your server" icon="📤">
          <Step n={1} title="Create certificate directory on your server">
            <OsTab tabs={[
              { label:'Linux', code:'sudo mkdir -p ' + dir + '\nsudo chmod 755 ' + dir },
              { label:'macOS', code:'sudo mkdir -p ' + dir },
              { label:'Windows (PowerShell)', code:'New-Item -ItemType Directory -Path "C:\\SSL\\' + d + '" -Force' },
            ]} />
          </Step>
          <Step n={2} title="Upload from your computer to server">
            <OsTab tabs={[
              { label:'Mac/Linux SCP', code:'scp ~/Downloads/fullchain.pem user@yourserver:' + dir + '/fullchain.pem\nscp ~/Downloads/key.pem user@yourserver:' + dir + '/privkey.pem' },
              { label:'Windows SCP', code:'scp %USERPROFILE%\\Downloads\\fullchain.pem user@server:' + dir + '/fullchain.pem\nscp %USERPROFILE%\\Downloads\\key.pem user@server:' + dir + '/privkey.pem' },
              { label:'WinSCP / FileZilla', code:'1. Connect to your server\n2. Navigate to ' + dir + '\n3. Drag and drop fullchain.pem and key.pem\n4. Rename key.pem to privkey.pem' },
              { label:'Paste via nano', code:'sudo nano ' + dir + '/fullchain.pem\n# Paste content, then Ctrl+X Y Enter\nsudo nano ' + dir + '/privkey.pem\n# Paste content, then Ctrl+X Y Enter' },
            ]} />
          </Step>
          <Step n={3} title="Set file permissions">
            <OsTab tabs={[
              { label:'Linux', code:'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem\nsudo chown root:root ' + dir + '/*' },
              { label:'macOS', code:'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem' },
              { label:'Windows', code:'icacls "C:\\SSL\\' + d + '\\privkey.pem" /grant "IIS_IUSRS:R"' },
            ]} />
          </Step>
        </Card>

        <Card title="Nginx" icon="⚙️">
          <Step n={1} title="Install Nginx">
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
          <Step n={2} title="Create config file">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo nano /etc/nginx/sites-available/' + d },
              { label:'CentOS/RHEL/Amazon/Alpine', code:'sudo nano /etc/nginx/conf.d/' + d + '.conf' },
              { label:'macOS', code:'nano /usr/local/etc/nginx/servers/' + d + '.conf' },
              { label:'Windows', code:'notepad C:\\nginx\\conf\\' + d + '.conf' },
            ]} />
            <p style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>Paste this config:</p>
            <CopyBlock code={
              'server {\n    listen 80;\n    server_name ' + d + ';\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ' + d + ';\n\n    ssl_certificate     ' + dir + '/fullchain.pem;\n    ssl_certificate_key ' + dir + '/privkey.pem;\n\n    ssl_protocols TLSv1.2 TLSv1.3;\n    ssl_prefer_server_ciphers off;\n    ssl_session_cache shared:SSL:10m;\n    add_header Strict-Transport-Security "max-age=63072000" always;\n\n    root /var/www/html;\n    index index.html;\n    location / { try_files $uri $uri/ =404; }\n}'
            } />
          </Step>
          <Step n={3} title="Enable and reload">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo ln -s /etc/nginx/sites-available/' + d + ' /etc/nginx/sites-enabled/\nsudo nginx -t && sudo systemctl reload nginx' },
              { label:'CentOS/RHEL/Amazon/Alpine', code:'sudo nginx -t && sudo systemctl reload nginx' },
              { label:'macOS', code:'nginx -t && brew services restart nginx' },
              { label:'Windows', code:'cd C:\\nginx && nginx.exe -t && nginx.exe -s reload' },
            ]} />
          </Step>
        </Card>

        <Card title="Apache" icon="🪶">
          <Step n={1} title="Install Apache">
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
          <Step n={2} title="Create virtual host config">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo nano /etc/apache2/sites-available/' + d + '.conf' },
              { label:'CentOS/RHEL/Amazon', code:'sudo nano /etc/httpd/conf.d/' + d + '.conf' },
              { label:'macOS', code:'nano /usr/local/etc/httpd/extra/' + d + '.conf' },
              { label:'Windows', code:'notepad C:\\Apache24\\conf\\extra\\' + d + '.conf' },
            ]} />
            <CopyBlock code={
              '<VirtualHost *:80>\n    ServerName ' + d + '\n    Redirect permanent / https://' + d + '/\n</VirtualHost>\n\n<VirtualHost *:443>\n    ServerName ' + d + '\n    SSLEngine on\n    SSLCertificateFile     ' + dir + '/fullchain.pem\n    SSLCertificateKeyFile  ' + dir + '/privkey.pem\n    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1\n    Header always set Strict-Transport-Security "max-age=63072000"\n    DocumentRoot /var/www/html\n</VirtualHost>'
            } />
          </Step>
          <Step n={3} title="Enable and restart">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo a2ensite ' + d + '.conf\nsudo apache2ctl configtest && sudo systemctl reload apache2' },
              { label:'CentOS/RHEL/Amazon', code:'sudo apachectl configtest && sudo systemctl reload httpd' },
              { label:'macOS', code:'apachectl configtest && brew services restart httpd' },
              { label:'Windows', code:'cd C:\\Apache24\\bin && httpd.exe -t && httpd.exe -k restart' },
            ]} />
          </Step>
        </Card>

        <Card title="Caddy" icon="🏃">
          <Step n={1} title="Install Caddy">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list\nsudo apt update && sudo apt install caddy' },
              { label:'CentOS/RHEL', code:'sudo dnf install "dnf-command(copr)" -y\nsudo dnf copr enable @caddy/caddy -y\nsudo dnf install caddy -y\nsudo systemctl enable --now caddy' },
              { label:'Amazon Linux', code:'curl -Lo caddy "https://caddyserver.com/api/download?os=linux&arch=amd64"\nchmod +x caddy && sudo mv caddy /usr/bin/caddy' },
              { label:'Alpine', code:'sudo apk add caddy\nrc-update add caddy default && rc-service caddy start' },
              { label:'macOS', code:'brew install caddy && brew services start caddy' },
              { label:'Windows', code:'# Download from https://caddyserver.com/download\n# Extract caddy.exe to C:\\Caddy\n# Run as Admin: cd C:\\Caddy && caddy.exe run' },
            ]} />
          </Step>
          <Step n={2} title="Edit Caddyfile and reload">
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
        </Card>

        <Card title="Windows IIS" icon="🪟">
          <Note>IIS is built into Windows Server and Windows 10/11 Pro. IIS needs a PFX file, not PEM.</Note>
          <Step n={1} title="Convert PEM to PFX">
            <CopyBlock code={'# Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html\n# Run in PowerShell:\nopenssl pkcs12 -export -out C:\\SSL\\' + d + '\\cert.pfx -inkey C:\\SSL\\' + d + '\\privkey.pem -in C:\\SSL\\' + d + '\\fullchain.pem\n\n# Import to Windows cert store:\n$pwd = ConvertTo-SecureString "yourpassword" -Force -AsPlainText\nImport-PfxCertificate -FilePath "C:\\SSL\\' + d + '\\cert.pfx" -CertStoreLocation Cert:\\LocalMachine\\My -Password $pwd'} />
          </Step>
          <Step n={2} title="Bind in IIS Manager">
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
              IIS Manager → Sites → your site → <strong>Bindings</strong> → Add → Type: <strong>https</strong>, Port: <strong>443</strong> → SSL Certificate: select yours → OK
            </p>
          </Step>
        </Card>

        <Card title="Node.js / Express" icon="🟢">
          <Step n={1} title="Install Node.js">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install nodejs -y' },
              { label:'CentOS/RHEL/Amazon', code:'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -\nsudo yum install nodejs -y' },
              { label:'macOS', code:'brew install node\n# Or download from https://nodejs.org' },
              { label:'Windows', code:'# Download from https://nodejs.org\n# Or: winget install OpenJS.NodeJS' },
            ]} />
          </Step>
          <Step n={2} title="HTTPS server code">
            <CopyBlock code={"const https = require('https')\nconst fs = require('fs')\nconst express = require('express')\n\nconst app = express()\napp.get('/', (req, res) => res.send('Hello HTTPS!'))\n\nhttps.createServer({\n  key:  fs.readFileSync('" + dir + "/privkey.pem'),\n  cert: fs.readFileSync('" + dir + "/fullchain.pem')\n}, app).listen(443)"} />
          </Step>
          <Step n={3} title="Keep alive with PM2">
            <OsTab tabs={[
              { label:'Linux/macOS', code:'npm install -g pm2\nsudo pm2 start server.js --name myapp\nsudo pm2 startup && sudo pm2 save' },
              { label:'Windows', code:'npm install -g pm2 pm2-windows-startup\npm2-startup install\npm2 start server.js --name myapp && pm2 save' },
            ]} />
          </Step>
        </Card>

        <Card title="Docker / Docker Compose" icon="🐳">
          <Step n={1} title="Install Docker">
            <OsTab tabs={[
              { label:'Ubuntu/Debian', code:'curl -fsSL https://get.docker.com | sudo sh\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER' },
              { label:'CentOS/RHEL', code:'sudo dnf install docker-ce docker-ce-cli -y\nsudo systemctl enable --now docker' },
              { label:'Amazon Linux', code:'sudo amazon-linux-extras install docker -y\nsudo systemctl enable --now docker' },
              { label:'macOS', code:'# Download Docker Desktop from https://docker.com/products/docker-desktop' },
              { label:'Windows', code:'# Download Docker Desktop from https://docker.com/products/docker-desktop\n# Requires WSL2 or Hyper-V' },
            ]} />
          </Step>
          <Step n={2} title="docker-compose.yml with SSL">
            <CopyBlock code={'version: "3.8"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - "80:80"\n      - "443:443"\n    volumes:\n      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro\n      - ./certs/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro\n      - ./certs/privkey.pem:/etc/ssl/private/privkey.pem:ro\n    restart: unless-stopped'} />
            <CopyBlock code={'mkdir -p ./certs\ncp /path/to/fullchain.pem ./certs/\ncp /path/to/key.pem ./certs/privkey.pem\ndocker-compose up -d'} />
          </Step>
        </Card>

        <Card title="cPanel (GoDaddy, Bluehost, Hostgator)" icon="🖥️">
          <Note>cPanel is browser-based — works from any OS. No terminal needed.</Note>
          <Step n={1} title="Open SSL/TLS Manager">
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
              Login to cPanel → search <strong>SSL/TLS</strong> → <strong>Manage SSL Sites</strong> → select domain → <strong>Install an SSL Certificate</strong>
            </p>
          </Step>
          <Step n={2} title="Paste certificate contents">
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
              {[['Certificate (CRT)','Open fullchain.pem in Notepad → copy all → paste here'],
                ['Private Key (KEY)','Open key.pem → copy all → paste here'],
                ['CA Bundle','Leave blank']].map(([l,h]) => (
                <div key={l} style={{ display:'flex', gap:10, padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }}>
                  <span style={{ fontWeight:700, color:'var(--accent)', minWidth:160, flexShrink:0 }}>{l}</span>
                  <span style={{ color:'var(--text2)' }}>{h}</span>
                </div>
              ))}
            </div>
          </Step>
          <Step n={3} title="Click Install Certificate">
            <p style={{ fontSize:13, color:'var(--text2)' }}>Done — site is immediately live on HTTPS.</p>
          </Step>
        </Card>

        <Card title="Plesk" icon="🎛️">
          <Step n={1} title="Open SSL/TLS Certificates">
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>Login → Websites and Domains → your domain → <strong>SSL/TLS Certificates</strong></p>
          </Step>
          <Step n={2} title="Add and assign certificate">
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
              Click <strong>Add SSL/TLS Certificate</strong> → name it → paste fullchain.pem in Certificate → paste key.pem in Private key → <strong>Upload Certificate</strong><br/>
              Then: Hosting Settings → SSL/TLS support → select your certificate → <strong>OK</strong>
            </p>
          </Step>
        </Card>

        <Card title="Verify Installation" icon="🔍">
          <Step n={1} title="Command line check">
            <OsTab tabs={[
              { label:'Linux/macOS', code:'# Check expiry\nopenssl x509 -in ' + dir + '/fullchain.pem -noout -dates\n\n# Verify key matches cert (hashes must match)\nopenssl x509 -noout -modulus -in ' + dir + '/fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in ' + dir + '/privkey.pem | md5sum\n\n# Test live connection\ncurl -vI https://' + d },
              { label:'Windows', code:'# Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html\nopenssl x509 -in C:\\SSL\\' + d + '\\fullchain.pem -noout -dates\n\n# Test:\nInvoke-WebRequest -Uri https://' + d + ' -UseBasicParsing' },
            ]} />
          </Step>
          <Step n={2} title="Online tools">
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[['SSL Labs','https://www.ssllabs.com/ssltest/'],
                ['SSL Shopper','https://www.sslshopper.com/ssl-checker.html'],
                ['Why No Padlock','https://www.whynopadlock.com/']].map(([n,u]) => (
                <a key={n} href={u} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:7, textDecoration:'none', color:'var(--accent)', fontSize:12, fontWeight:600 }}>
                  <ExternalLink size={11}/> {n}
                </a>
              ))}
            </div>
          </Step>
        </Card>

        <Card title="Troubleshooting" icon="🛠️">
          {[['ERR_SSL_PROTOCOL_ERROR','Port 443 not open or web server not configured for SSL.',
              'sudo ufw allow 443\nsudo systemctl status nginx'],
            ['NET::ERR_CERT_AUTHORITY_INVALID','Using cert.pem instead of fullchain.pem. Update path.',
              '# Change ssl_certificate to point to fullchain.pem\nsudo systemctl reload nginx'],
            ['Private key does not match','key.pem and cert.pem from different orders. Re-download both.',
              'openssl x509 -noout -modulus -in fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in privkey.pem | md5sum\n# Both hashes must match'],
            ['Permission denied on key','Wrong file permissions.',
              'sudo chmod 600 ' + dir + '/privkey.pem'],
            ['Certificate expired','90-day cert expired. Renew from My Certificates.',
              'openssl x509 -noout -dates -in fullchain.pem'],
          ].map(([err, msg, fix]) => (
            <div key={err} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:5 }}>{err}</div>
              <p style={{ fontSize:12, color:'var(--text2)', marginBottom:8, lineHeight:1.6 }}>{msg}</p>
              <CopyBlock code={fix} />
            </div>
          ))}
        </Card>

        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:12, padding:'24px 28px', textAlign:'center', marginTop:8 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:'white', marginBottom:6 }}>Need an SSL Certificate?</h3>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginBottom:16 }}>Free 90-day certificate in under 60 seconds.</p>
          <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
            <Shield size={15}/> Generate Free SSL
          </button>
        </div>

      </div>
    </div>
  )
}
