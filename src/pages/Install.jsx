import { useState } from 'react'
import {
  Terminal, Copy, Check, ChevronRight, ExternalLink, Shield,
  ArrowRight, Download, Upload, Server, Globe, Cloud, Settings,
  AlertCircle, Search, Wrench, Box, Code2, Wind, Zap
} from 'lucide-react'

// ── Code block with copy button (uses v2-code) ───────────────────────
function CopyBlock({ code, label = 'shell' }) {
  const [ok, setOk] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard.writeText(code) } catch (e) {}
    setOk(true)
    setTimeout(() => setOk(false), 1800)
  }
  return (
    <div className="v2-code" style={{ marginBottom: 10 }}>
      <div className="v2-code-head">
        <div className="v2-code-dots">
          <span style={{ background: '#ef4444' }} />
          <span style={{ background: '#f59e0b' }} />
          <span style={{ background: '#0e7fc0' }} />
          <span style={{ marginLeft: 8, fontSize: 10, color: '#737373', fontFamily: 'JetBrains Mono, monospace', background: 'transparent', borderRadius: 0, width: 'auto', height: 'auto', display: 'inline' }}>{label}</span>
        </div>
        <button className={`v2-code-copy ${ok ? 'copied' : ''}`} onClick={doCopy}>
          {ok ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  )
}

// ── OS / variant tabs that swap a CopyBlock ──────────────────────────
function OsTab({ tabs }) {
  const [i, setI] = useState(0)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {tabs.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`v2-filter-chip ${i === idx ? 'active' : ''}`}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 'var(--v2-r-sm)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CopyBlock code={tabs[i].code} label={tabs[i].label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)} />
    </div>
  )
}

// ── Numbered step ────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div className="v2-step">
      <div className="v2-step-num">{n}</div>
      <div className="v2-step-body">
        <div className="v2-step-title">{title}</div>
        {children}
      </div>
    </div>
  )
}

// ── Soft callout (replaces the colored Note boxes) ───────────────────
function Note({ type = 'info', children }) {
  return (
    <div className={`v2-callout ${type === 'warn' ? 'warning' : type === 'error' ? 'error' : type === 'success' ? 'tip' : 'info'}`}
         style={{ marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  )
}

// ── Collapsible section card (replaces StackCard) ────────────────────
function Section({ title, subtitle, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`v2-accordion ${open ? 'open' : ''}`} style={{ marginBottom: 8 }}>
      <button className="v2-accordion-head" onClick={() => setOpen(o => !o)}>
        <span className="v2-accordion-icon">
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <span style={{ flex: 1 }}>
          <div className="v2-accordion-title">{title}</div>
          {subtitle && <div className="v2-accordion-subtitle">{subtitle}</div>}
        </span>
        <ChevronRight size={14} strokeWidth={1.8} className="v2-accordion-chev" />
      </button>
      {open && <div className="v2-accordion-body" style={{ paddingTop: 12 }}>{children}</div>}
    </div>
  )
}

// ── Section divider (replaces gradient pill headings) ────────────────
function Divider({ label, title }) {
  return (
    <div style={{ margin: '32px 0 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span className="v2-section-label">{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--v2-border)' }} />
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--v2-text)', letterSpacing: '-0.2px', margin: 0 }}>
        {title}
      </h2>
    </div>
  )
}

export default function Install({ nav }) {
  const [domain, setDomain] = useState('')
  const d = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').trim() || 'yourdomain.com'
  const dir = '/etc/ssl/' + d

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 980 }}>

        {/* HERO */}
        <div style={{ padding: '8px 0 20px' }}>
          <h1 className="v2-h1" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>
            Install your SSL certificate
          </h1>
          <p className="v2-subtitle" style={{ fontSize: 14, marginTop: 4, maxWidth: 560 }}>
            Step-by-step commands for every web server and operating system. Personalise the domain below — every command updates automatically.
          </p>
        </div>

        {/* AGENT CALLOUT — prominently before manual steps */}
        <div className="v2-callout v2-callout-green" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Zap size={15} style={{ color: 'var(--v2-green)', flexShrink: 0, marginTop: 2 }}/>
            <div>
              <div className="v2-callout-title">Automate this entirely — skip the manual steps</div>
              <p style={{ margin: '4px 0 8px', fontSize: 12, lineHeight: 1.7 }}>
                If your server is a Linux VPS, the <strong>SSLVault persistent agent</strong> handles installation automatically.
                No file uploads, no SSH after setup, no manual renewal — ever.
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.7 }}>
                <strong>How:</strong> Go to <strong>Dashboard</strong> → click your cert row → click <strong>Install</strong>.
                The modal will either dispatch to an already-connected agent, or walk you through a one-line agent install first.
                The agent can be set up before <em>or</em> after the certificate is issued.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.7 }}>
                The manual steps below are for servers without the agent, or where you prefer direct control.
              </p>
            </div>
          </div>
        </div>

        {/* DOMAIN INPUT */}
        <div className="v2-card v2-card-pad" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Terminal size={14} strokeWidth={2} style={{ color: 'var(--v2-text-2)' }} />
            <label className="v2-section-label" style={{ margin: 0 }}>YOUR DOMAIN</label>
          </div>
          <input
            className="v2-input"
            placeholder="example.com"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            style={{ maxWidth: 440 }}
          />
          <div className="v2-label-help" style={{ marginTop: 6 }}>
            Currently using <span className="v2-mono" style={{ color: 'var(--v2-text)' }}>{d}</span> · path <span className="v2-mono" style={{ color: 'var(--v2-text)' }}>{dir}</span>
          </div>
        </div>

        {/* PRELIMINARIES */}
        <Divider label="GETTING READY" title="Step 1 — Download your certificate files" />
        <Section title="Files you'll need" subtitle="Dashboard → click cert row → expand → Copy or Download" icon={Download} defaultOpen>
          <p>Two files come with every issued certificate:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)', borderRadius: 'var(--v2-r-md)', padding: '12px 14px' }}>
              <div className="v2-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>fullchain.pem</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', lineHeight: 1.55 }}>Use this as your certificate on ALL servers</div>
            </div>
            <div style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)', borderRadius: 'var(--v2-r-md)', padding: '12px 14px' }}>
              <div className="v2-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-red-text)', marginBottom: 3 }}>key.pem</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', lineHeight: 1.55 }}>Private key — never share this file</div>
            </div>
          </div>
          <Note type="warn">Always use <strong>fullchain.pem</strong> (not cert.pem) — it includes the full chain trusted by all browsers.</Note>
        </Section>

        <Divider label="UPLOAD" title="Step 2 — Move files to your server" />
        <Section title="Upload certificate files" subtitle="Create directory, copy files, set permissions" icon={Upload}>
          <Step n={1} title="Create certificate directory on your server">
            <OsTab tabs={[
              { label: 'Linux', code: 'sudo mkdir -p ' + dir + '\nsudo chmod 755 ' + dir },
              { label: 'macOS', code: 'sudo mkdir -p ' + dir },
              { label: 'Windows (PowerShell)', code: 'New-Item -ItemType Directory -Path "C:\\SSL\\' + d + '" -Force' },
            ]} />
          </Step>
          <Step n={2} title="Upload from your computer to the server">
            <OsTab tabs={[
              { label: 'Mac/Linux SCP', code: 'scp ~/Downloads/fullchain.pem user@yourserver:' + dir + '/fullchain.pem\nscp ~/Downloads/key.pem user@yourserver:' + dir + '/privkey.pem' },
              { label: 'Windows SCP', code: 'scp %USERPROFILE%\\Downloads\\fullchain.pem user@server:' + dir + '/fullchain.pem\nscp %USERPROFILE%\\Downloads\\key.pem user@server:' + dir + '/privkey.pem' },
              { label: 'WinSCP / FileZilla', code: '1. Connect to your server\n2. Navigate to ' + dir + '\n3. Drag and drop fullchain.pem and key.pem\n4. Rename key.pem to privkey.pem' },
              { label: 'Paste via nano', code: 'sudo nano ' + dir + '/fullchain.pem\n# Paste content, then Ctrl+X Y Enter\nsudo nano ' + dir + '/privkey.pem\n# Paste content, then Ctrl+X Y Enter' },
            ]} />
          </Step>
          <Step n={3} title="Set file permissions">
            <OsTab tabs={[
              { label: 'Linux', code: 'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem\nsudo chown root:root ' + dir + '/*' },
              { label: 'macOS', code: 'sudo chmod 644 ' + dir + '/fullchain.pem\nsudo chmod 600 ' + dir + '/privkey.pem' },
              { label: 'Windows', code: 'icacls "C:\\SSL\\' + d + '\\privkey.pem" /grant "IIS_IUSRS:R"' },
            ]} />
          </Step>
        </Section>

        {/* STACK PICKER */}
        <Divider label="WEB SERVER" title="Step 3 — Choose your stack" />

        {/* NGINX */}
        <Section title="Nginx" subtitle="High-performance reverse proxy / web server" icon={Wind}>
          <Step n={1} title="Install Nginx">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo apt update && sudo apt install nginx -y\nsudo systemctl enable --now nginx' },
              { label: 'CentOS 7', code: 'sudo yum install epel-release nginx -y\nsudo systemctl enable --now nginx' },
              { label: 'CentOS 8 / RHEL', code: 'sudo dnf install nginx -y\nsudo systemctl enable --now nginx' },
              { label: 'Amazon Linux', code: 'sudo amazon-linux-extras install nginx1 -y\nsudo systemctl enable --now nginx' },
              { label: 'Alpine', code: 'sudo apk add nginx\nrc-update add nginx default && rc-service nginx start' },
              { label: 'macOS', code: 'brew install nginx && brew services start nginx' },
              { label: 'Windows', code: '# Download from http://nginx.org/en/download.html\n# Extract to C:\\nginx, run as Admin:\ncd C:\\nginx && nginx.exe' },
            ]} />
          </Step>
          <Step n={2} title="Create config file">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo nano /etc/nginx/sites-available/' + d },
              { label: 'CentOS/RHEL/Amazon/Alpine', code: 'sudo nano /etc/nginx/conf.d/' + d + '.conf' },
              { label: 'macOS', code: 'nano /usr/local/etc/nginx/servers/' + d + '.conf' },
              { label: 'Windows', code: 'notepad C:\\nginx\\conf\\' + d + '.conf' },
            ]} />
            <p style={{ fontSize: 12, color: 'var(--v2-text-2)', margin: '8px 0' }}>Paste this config:</p>
            <CopyBlock label="nginx.conf" code={'server {\n    listen 80;\n    server_name ' + d + ';\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ' + d + ';\n\n    ssl_certificate     ' + dir + '/fullchain.pem;\n    ssl_certificate_key ' + dir + '/privkey.pem;\n\n    ssl_protocols TLSv1.2 TLSv1.3;\n    ssl_prefer_server_ciphers off;\n    ssl_session_cache shared:SSL:10m;\n    add_header Strict-Transport-Security "max-age=63072000" always;\n\n    root /var/www/html;\n    index index.html;\n    location / { try_files $uri $uri/ =404; }\n}'} />
          </Step>
          <Step n={3} title="Enable and reload">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo ln -s /etc/nginx/sites-available/' + d + ' /etc/nginx/sites-enabled/\nsudo nginx -t && sudo systemctl reload nginx' },
              { label: 'CentOS/RHEL/Amazon/Alpine', code: 'sudo nginx -t && sudo systemctl reload nginx' },
              { label: 'macOS', code: 'nginx -t && brew services restart nginx' },
              { label: 'Windows', code: 'cd C:\\nginx && nginx.exe -t && nginx.exe -s reload' },
            ]} />
          </Step>
        </Section>

        {/* APACHE */}
        <Section title="Apache" subtitle="Battle-tested HTTP server" icon={Server}>
          <Step n={1} title="Install Apache">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo apt install apache2 -y\nsudo a2enmod ssl rewrite headers\nsudo systemctl restart apache2' },
              { label: 'CentOS 7', code: 'sudo yum install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label: 'CentOS 8 / RHEL', code: 'sudo dnf install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label: 'Amazon Linux', code: 'sudo yum install httpd mod_ssl -y\nsudo systemctl enable --now httpd' },
              { label: 'Alpine', code: 'sudo apk add apache2 apache2-ssl\nrc-update add apache2 default && rc-service apache2 start' },
              { label: 'macOS', code: 'brew install httpd && brew services start httpd' },
              { label: 'Windows', code: '# Download from https://www.apachelounge.com/download/\n# Extract to C:\\Apache24, run as Admin:\ncd C:\\Apache24\\bin && httpd.exe -k install && httpd.exe -k start' },
            ]} />
          </Step>
          <Step n={2} title="Create virtual host config">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo nano /etc/apache2/sites-available/' + d + '.conf' },
              { label: 'CentOS/RHEL/Amazon', code: 'sudo nano /etc/httpd/conf.d/' + d + '.conf' },
              { label: 'macOS', code: 'nano /usr/local/etc/httpd/extra/' + d + '.conf' },
              { label: 'Windows', code: 'notepad C:\\Apache24\\conf\\extra\\' + d + '.conf' },
            ]} />
            <CopyBlock label="apache.conf" code={'<VirtualHost *:80>\n    ServerName ' + d + '\n    Redirect permanent / https://' + d + '/\n</VirtualHost>\n\n<VirtualHost *:443>\n    ServerName ' + d + '\n    SSLEngine on\n    SSLCertificateFile     ' + dir + '/fullchain.pem\n    SSLCertificateKeyFile  ' + dir + '/privkey.pem\n    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1\n    Header always set Strict-Transport-Security "max-age=63072000"\n    DocumentRoot /var/www/html\n</VirtualHost>'} />
          </Step>
          <Step n={3} title="Enable and restart">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo a2ensite ' + d + '.conf\nsudo apache2ctl configtest && sudo systemctl reload apache2' },
              { label: 'CentOS/RHEL/Amazon', code: 'sudo apachectl configtest && sudo systemctl reload httpd' },
              { label: 'macOS', code: 'apachectl configtest && brew services restart httpd' },
              { label: 'Windows', code: 'cd C:\\Apache24\\bin && httpd.exe -t && httpd.exe -k restart' },
            ]} />
          </Step>
        </Section>

        {/* CADDY */}
        <Section title="Caddy" subtitle="Modern web server with simple config" icon={Globe}>
          <Step n={1} title="Install Caddy">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg\ncurl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list\nsudo apt update && sudo apt install caddy' },
              { label: 'CentOS/RHEL', code: 'sudo dnf install "dnf-command(copr)" -y\nsudo dnf copr enable @caddy/caddy -y\nsudo dnf install caddy -y\nsudo systemctl enable --now caddy' },
              { label: 'Amazon Linux', code: 'curl -Lo caddy "https://caddyserver.com/api/download?os=linux&arch=amd64"\nchmod +x caddy && sudo mv caddy /usr/bin/caddy' },
              { label: 'Alpine', code: 'sudo apk add caddy\nrc-update add caddy default && rc-service caddy start' },
              { label: 'macOS', code: 'brew install caddy && brew services start caddy' },
              { label: 'Windows', code: '# Download from https://caddyserver.com/download\n# Extract caddy.exe to C:\\Caddy\n# Run as Admin: cd C:\\Caddy && caddy.exe run' },
            ]} />
          </Step>
          <Step n={2} title="Edit Caddyfile and reload">
            <OsTab tabs={[
              { label: 'Linux', code: 'sudo nano /etc/caddy/Caddyfile' },
              { label: 'macOS', code: 'nano /usr/local/etc/caddy/Caddyfile' },
              { label: 'Windows', code: 'notepad C:\\Caddy\\Caddyfile' },
            ]} />
            <CopyBlock label="Caddyfile" code={d + ' {\n    tls ' + dir + '/fullchain.pem ' + dir + '/privkey.pem\n    root * /var/www/html\n    file_server\n    encode gzip\n}'} />
            <OsTab tabs={[
              { label: 'Linux (systemd)', code: 'sudo systemctl reload caddy' },
              { label: 'Alpine', code: 'rc-service caddy restart' },
              { label: 'macOS', code: 'brew services restart caddy' },
              { label: 'Windows', code: 'cd C:\\Caddy && caddy.exe reload' },
            ]} />
          </Step>
        </Section>

        {/* NODE */}
        <Section title="Node.js / Express" subtitle="JavaScript HTTPS server" icon={Code2}>
          <Step n={1} title="Install Node.js">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install nodejs -y' },
              { label: 'CentOS/RHEL/Amazon', code: 'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -\nsudo yum install nodejs -y' },
              { label: 'macOS', code: 'brew install node\n# Or download from https://nodejs.org' },
              { label: 'Windows', code: '# Download from https://nodejs.org\n# Or: winget install OpenJS.NodeJS' },
            ]} />
          </Step>
          <Step n={2} title="HTTPS server code">
            <CopyBlock label="server.js" code={"const https = require('https')\nconst fs = require('fs')\nconst express = require('express')\n\nconst app = express()\napp.get('/', (req, res) => res.send('Hello HTTPS!'))\n\nhttps.createServer({\n  key:  fs.readFileSync('" + dir + "/privkey.pem'),\n  cert: fs.readFileSync('" + dir + "/fullchain.pem')\n}, app).listen(443)"} />
          </Step>
          <Step n={3} title="Keep alive with PM2">
            <OsTab tabs={[
              { label: 'Linux/macOS', code: 'npm install -g pm2\nsudo pm2 start server.js --name myapp\nsudo pm2 startup && sudo pm2 save' },
              { label: 'Windows', code: 'npm install -g pm2 pm2-windows-startup\npm2-startup install\npm2 start server.js --name myapp && pm2 save' },
            ]} />
          </Step>
        </Section>

        {/* DOCKER */}
        <Section title="Docker / Docker Compose" subtitle="Containerised SSL termination" icon={Box}>
          <Step n={1} title="Install Docker">
            <OsTab tabs={[
              { label: 'Ubuntu/Debian', code: 'curl -fsSL https://get.docker.com | sudo sh\nsudo systemctl enable --now docker\nsudo usermod -aG docker $USER' },
              { label: 'CentOS/RHEL', code: 'sudo dnf install docker-ce docker-ce-cli -y\nsudo systemctl enable --now docker' },
              { label: 'Amazon Linux', code: 'sudo amazon-linux-extras install docker -y\nsudo systemctl enable --now docker' },
              { label: 'macOS', code: '# Download Docker Desktop from https://docker.com/products/docker-desktop' },
              { label: 'Windows', code: '# Download Docker Desktop from https://docker.com/products/docker-desktop\n# Requires WSL2 or Hyper-V' },
            ]} />
          </Step>
          <Step n={2} title="docker-compose.yml with SSL">
            <CopyBlock label="docker-compose.yml" code={'version: "3.8"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - "80:80"\n      - "443:443"\n    volumes:\n      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro\n      - ./certs/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro\n      - ./certs/privkey.pem:/etc/ssl/private/privkey.pem:ro\n    restart: unless-stopped'} />
            <CopyBlock label="bring-up" code={'mkdir -p ./certs\ncp /path/to/fullchain.pem ./certs/\ncp /path/to/key.pem ./certs/privkey.pem\ndocker-compose up -d'} />
          </Step>
        </Section>

        {/* CPANEL */}
        <Section title="cPanel" subtitle="GoDaddy, Bluehost, Hostgator and other shared hosts" icon={Cloud}>
          <Note type="info">cPanel is browser-based — works from any OS. No terminal needed.</Note>
          <Step n={1} title="Open SSL/TLS Manager">
            <p>
              Login to cPanel → search <strong>SSL/TLS</strong> → <strong>Manage SSL Sites</strong> → select domain → <strong>Install an SSL Certificate</strong>
            </p>
          </Step>
          <Step n={2} title="Paste certificate contents">
            <table className="v2-table" style={{ marginBottom: 8 }}>
              <tbody>
                <tr><td style={{ fontWeight: 500, width: 180 }}>Certificate (CRT)</td><td>Open fullchain.pem in Notepad → copy all → paste here</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Private Key (KEY)</td><td>Open key.pem → copy all → paste here</td></tr>
                <tr><td style={{ fontWeight: 500 }}>CA Bundle</td><td>Leave blank</td></tr>
              </tbody>
            </table>
          </Step>
          <Step n={3} title="Click Install Certificate">
            <p>Done — site is immediately live on HTTPS.</p>
          </Step>
        </Section>

        {/* PLESK */}
        <Section title="Plesk" subtitle="Plesk Obsidian / Onyx control panel" icon={Settings}>
          <Step n={1} title="Open SSL/TLS Certificates">
            <p>Login → Websites and Domains → your domain → <strong>SSL/TLS Certificates</strong></p>
          </Step>
          <Step n={2} title="Add and assign certificate">
            <p>
              Click <strong>Add SSL/TLS Certificate</strong> → name it → paste fullchain.pem in Certificate → paste key.pem in Private key → <strong>Upload Certificate</strong>
            </p>
            <p>
              Then: Hosting Settings → SSL/TLS support → select your certificate → <strong>OK</strong>
            </p>
          </Step>
        </Section>

        {/* IIS */}
        <Section title="Windows IIS" subtitle="Built into Windows Server and Windows 10/11 Pro" icon={Server}>
          <Note type="info">IIS needs a PFX file, not PEM — convert first.</Note>
          <Step n={1} title="Convert PEM to PFX">
            <CopyBlock label="powershell" code={'# Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html\n# Run in PowerShell:\nopenssl pkcs12 -export -out C:\\SSL\\' + d + '\\cert.pfx -inkey C:\\SSL\\' + d + '\\privkey.pem -in C:\\SSL\\' + d + '\\fullchain.pem\n\n# Import to Windows cert store:\n$pwd = ConvertTo-SecureString "yourpassword" -Force -AsPlainText\nImport-PfxCertificate -FilePath "C:\\SSL\\' + d + '\\cert.pfx" -CertStoreLocation Cert:\\LocalMachine\\My -Password $pwd'} />
          </Step>
          <Step n={2} title="Bind in IIS Manager">
            <p>
              IIS Manager → Sites → your site → <strong>Bindings</strong> → Add → Type: <strong>https</strong>, Port: <strong>443</strong> → SSL Certificate: select yours → OK
            </p>
          </Step>
        </Section>

        {/* VERIFY */}
        <Divider label="VERIFY" title="Step 4 — Confirm it works" />
        <Section title="Verify your installation" subtitle="Command-line and online checks" icon={Search} defaultOpen>
          <Step n={1} title="Command line check">
            <OsTab tabs={[
              { label: 'Linux/macOS', code: '# Check expiry\nopenssl x509 -in ' + dir + '/fullchain.pem -noout -dates\n\n# Verify key matches cert (hashes must match)\nopenssl x509 -noout -modulus -in ' + dir + '/fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in ' + dir + '/privkey.pem | md5sum\n\n# Test live connection\ncurl -vI https://' + d },
              { label: 'Windows', code: '# Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html\nopenssl x509 -in C:\\SSL\\' + d + '\\fullchain.pem -noout -dates\n\n# Test:\nInvoke-WebRequest -Uri https://' + d + ' -UseBasicParsing' },
            ]} />
          </Step>
          <Step n={2} title="Online tools">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['SSL Labs', 'https://www.ssllabs.com/ssltest/'],
                ['SSL Shopper', 'https://www.sslshopper.com/ssl-checker.html'],
                ['Why No Padlock', 'https://www.whynopadlock.com/'],
              ].map(([n, u]) => (
                <a key={n} href={u} target="_blank" rel="noopener noreferrer"
                   className="v2-btn" style={{ textDecoration: 'none' }}>
                  <ExternalLink size={11} strokeWidth={2} /> {n}
                </a>
              ))}
            </div>
          </Step>
        </Section>

        {/* TROUBLESHOOTING */}
        <Divider label="HELP" title="Troubleshooting" />
        <Section title="Common errors and their fixes" subtitle="Five most common installation issues" icon={Wrench}>
          {[
            ['ERR_SSL_PROTOCOL_ERROR', 'Port 443 not open or web server not configured for SSL.', 'sudo ufw allow 443\nsudo systemctl status nginx'],
            ['NET::ERR_CERT_AUTHORITY_INVALID', 'Using cert.pem instead of fullchain.pem. Update path.', '# Change ssl_certificate to point to fullchain.pem\nsudo systemctl reload nginx'],
            ['Private key does not match', 'key.pem and cert.pem from different orders. Re-download both.', 'openssl x509 -noout -modulus -in fullchain.pem | md5sum\nopenssl rsa -noout -modulus -in privkey.pem | md5sum\n# Both hashes must match'],
            ['Permission denied on key', 'Wrong file permissions.', 'sudo chmod 600 ' + dir + '/privkey.pem'],
            ['Certificate expired', '90-day cert expired. Renew from My Certificates.', 'openssl x509 -noout -dates -in fullchain.pem'],
          ].map(([err, msg, fix]) => (
            <div key={err} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <AlertCircle size={13} strokeWidth={2} style={{ color: 'var(--v2-red-text)' }} />
                <span className="v2-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)' }}>{err}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--v2-text-2)', marginBottom: 8, paddingLeft: 21, lineHeight: 1.6 }}>{msg}</p>
              <CopyBlock label="fix" code={fix} />
            </div>
          ))}
        </Section>

        {/* CTA */}
        <div className="v2-card" style={{ marginTop: 32, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--v2-text)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Shield size={18} color="white" strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Need an SSL certificate?
          </h3>
          <p style={{ color: 'var(--v2-text-2)', fontSize: 13, maxWidth: 400, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Get a trusted RapidSSL DV certificate issued in minutes, or a free 90-day certificate — both fully managed in SSLVault.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13} strokeWidth={2.2} /> Buy RapidSSL <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button className="v2-btn" onClick={() => nav('/buy')}>
              Free 90-day SSL
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
