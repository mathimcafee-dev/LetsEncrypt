import { useState } from 'react'
import {
  ChevronRight, ExternalLink, Shield, Server, BookOpen, Zap, Globe,
  Key, ArrowRight, RefreshCw, Search, Activity, Cloud, AlertCircle,
  Copy, Check, Clock, Lock, Settings as SettingsIcon, FileDown,
  CircleHelp, Bug, Network, Bot
} from 'lucide-react'

// ── Reusable bits ───────────────────────────────────────────────────

function CodeBlock({ code, label = 'shell' }) {
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
          <span style={{ background: '#1a56db' }} />
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

function Step({ n, title, terminal, children }) {
  return (
    <div className="v2-step">
      <div className="v2-step-num">{n}</div>
      <div className="v2-step-body">
        <div className="v2-step-title">{title}</div>
        {children}
        {terminal && <CodeBlock code={terminal} label="terminal" />}
      </div>
    </div>
  )
}

function Note({ type = 'info', children }) {
  const variant = type === 'warn' ? 'warning' : type === 'success' || type === 'tip' ? 'tip' : type === 'error' ? 'error' : 'info'
  return (
    <div className={`v2-callout ${variant}`} style={{ marginBottom: 10 }}>{children}</div>
  )
}

function Section({ title, subtitle, icon: Icon, defaultOpen = false, anchor, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={anchor} className={`v2-accordion ${open ? 'open' : ''}`} style={{ marginBottom: 8, scrollMarginTop: 80 }}>
      <button className="v2-accordion-head" onClick={() => setOpen(o => !o)}>
        <span className="v2-accordion-icon"><Icon size={15} strokeWidth={1.8} /></span>
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

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`v2-accordion ${open ? 'open' : ''}`} style={{ marginBottom: 6 }}>
      <button className="v2-accordion-head" onClick={() => setOpen(o => !o)}>
        <span className="v2-accordion-icon"><CircleHelp size={14} strokeWidth={1.8} /></span>
        <span className="v2-accordion-title" style={{ flex: 1 }}>{q}</span>
        <ChevronRight size={14} strokeWidth={1.8} className="v2-accordion-chev" />
      </button>
      {open && <div className="v2-accordion-body" style={{ paddingTop: 12 }}><p>{a}</p></div>}
    </div>
  )
}

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

// ── Quick links ──────────────────────────────────────────────────────
const QUICK_LINKS = [
  { icon: Zap,        title: 'Getting Started',       desc: 'Issue your first cert in 60 seconds',     anchor: 'getting-started' },
  { icon: Bot,        title: 'Persistent Agent',      desc: 'Zero-touch VPS installs and renewals',    anchor: 'persistent-agent' },
  { icon: Cloud,      title: 'Shared Hosting',        desc: 'cPanel — no SSH needed',                  anchor: 'shared-hosting' },
  { icon: RefreshCw,  title: 'Auto-Renewal',          desc: 'Set it once, renew forever',              anchor: 'auto-renewal' },
  { icon: Network,    title: 'DNS Providers',         desc: 'Auto-add TXT records, no copy-paste',     anchor: 'dns-providers' },
  { icon: Search,     title: 'CT Log Discovery',      desc: 'Find certs issued for your domains',      anchor: 'ct-discovery' },
  { icon: Activity,   title: 'SSL Monitor',           desc: 'Track expiry for any domain',             anchor: 'monitor' },
  { icon: Bug,        title: 'Troubleshooting',       desc: 'Common errors and fixes',                 anchor: 'troubleshooting' },
]

export default function KnowledgeBase({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 920 }}>

        {/* HERO */}
        <div style={{ padding: '8px 0 24px' }}>
          <h1 className="v2-h1" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>Knowledge Base</h1>
          <p className="v2-subtitle" style={{ fontSize: 14, marginTop: 4, maxWidth: 560 }}>
            Guides, tutorials and reference docs for every SSLVault feature. Plain English, no jargon.
          </p>
        </div>

        {/* QUICK LINKS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 24 }}>
          {QUICK_LINKS.map(({ icon: Icon, title, desc, anchor }) => (
            <a key={anchor}
               href={`#${anchor}`}
               onClick={e => { e.preventDefault(); document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) }}
               className="v2-card v2-card-pad"
               style={{ textDecoration: 'none', color: 'inherit', display: 'block', cursor: 'pointer' }}
               onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--v2-border-strong)' }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--v2-border)' }}>
              <div className="v2-icontile" style={{ marginBottom: 10 }}>
                <Icon size={15} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 3, letterSpacing: '-0.1px' }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', lineHeight: 1.55 }}>{desc}</div>
            </a>
          ))}
        </div>

        {/* SECTION 1 */}
        <Divider label="01 · BASICS" title="Issue your first SSL certificate" />
        <Section anchor="getting-started"
                 title="Getting started"
                 subtitle="RapidSSL DV cert via TheSSLStore · DigiCert, issued in ~5 minutes"
                 icon={Zap}
                 defaultOpen>
          <Step n={1} title="Go to Issue Certificate">
            <p>Click <strong>Issue Certificate</strong> in the sidebar under <strong>Main</strong>. Enter your domain name (e.g. <span className="v2-kbd">example.com</span> or <span className="v2-kbd">shop.example.com</span>), fill in contact details, choose validity period, and click <strong>Issue Certificate</strong>.</p>
          </Step>
          <Step n={2} title="Complete DNS validation">
            <p>SSLVault creates a CNAME challenge via TheSSLStore. You have two options:</p>
            <ul>
              <li><strong>Automatic (recommended)</strong> — if your domain uses Cloudflare, Vercel, or another supported DNS provider, SSLVault adds the record for you.</li>
              <li><strong>Manual</strong> — copy the CNAME record shown and add it to your DNS registrar. Propagation takes 1–10 minutes.</li>
            </ul>
          </Step>
          <Step n={3} title="Certificate appears in Dashboard">
            <p>Once issued, your certificate appears in the <strong>Dashboard</strong> inventory. Click any row to expand it — you'll see full certificate details, file copy/download buttons, and the private key reveal.</p>
          </Step>
          <Step n={4} title="Install on your server">
            <p>In the expanded cert row, click <strong>Install</strong>. A modal opens with three paths:</p>
            <ul>
              <li><strong>Persistent agent (VPS)</strong> — if you've already installed the SSLVault agent on your server, the cert is dispatched automatically. No SSH needed.</li>
              <li><strong>Install agent first</strong> — if no agent is running yet, the modal shows a one-line install command. Run it on your server, then dispatch the cert.</li>
              <li><strong>cPanel / shared hosting</strong> — enter your cPanel username and API token. SSLVault installs via UAPI directly. No agent or SSH required.</li>
            </ul>
          </Step>
          <Note type="tip">The agent can be installed before or after the certificate is issued — the Install modal handles both flows.</Note>
        </Section>

        {/* SECTION 2 */}
        <Divider label="02 · VPS" title="Persistent agent — SSH once, never again" />
        <Section anchor="persistent-agent"
                 title="Install the agent on your VPS"
                 subtitle="One curl command, zero-touch installs forever"
                 icon={Bot}>
          <Step n={1} title="Go to Manage → Servers">
            <p>In the sidebar under <strong>Manage</strong>, click <strong>Servers</strong>. This shows all connected agents. If none are connected, click <strong>Add server</strong> — a modal appears with the install command.</p>
          </Step>
          <Step n={2} title="Run the one-line install command on your server"
                terminal={`curl -fsSL https://easysecurity.in/agent-install.sh | bash`}>
            <p>SSH into your server and run the command shown. The installer automatically:</p>
            <ul>
              <li>Detects your OS (Ubuntu / Debian / CentOS / Amazon Linux)</li>
              <li>Detects your web server (Nginx or Apache)</li>
              <li>Installs the agent daemon and creates a systemd service</li>
              <li>Registers with SSLVault — your server appears in the Servers list within 1–2 minutes</li>
            </ul>
          </Step>
          <Step n={3} title="Server appears online in Servers page">
            <p>Once registered, the server card shows a green <strong>Online</strong> dot with last-seen time and agent version. Click the card to expand and see recent job activity.</p>
          </Step>
          <Step n={4} title="Install a certificate via the agent">
            <p>Go to <strong>Dashboard</strong> → click any cert row to expand it → click <strong>Install</strong>. The modal detects your connected agent and dispatches the install job. The agent installs the cert, updates Nginx/Apache config, reloads the web server, and reports back — no SSH, no file uploads.</p>
          </Step>
          <Note type="tip">
            <span className="v2-callout-title">Agent before or after — both work</span>
            You can install the agent before or after issuing a certificate. If you already issued a cert, just click <strong>Install</strong> on the cert row and the modal will guide you through installing the agent and dispatching in one flow.
          </Note>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, margin: '14px 0 10px' }}>
            <div className="v2-card v2-card-pad">
              <div className="v2-section-label" style={{ marginBottom: 8 }}>Supported OS</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.85 }}>
                <li>Ubuntu 20 / 22 / 24</li>
                <li>Debian 10 / 11 / 12</li>
                <li>CentOS 7 / 8 / 9</li>
                <li>Amazon Linux 2 / 2023</li>
                <li>RHEL 8 / 9</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Other Linux (best-effort)</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Windows — not supported</li>
              </ul>
            </div>
            <div className="v2-card v2-card-pad">
              <div className="v2-section-label" style={{ marginBottom: 8 }}>Web servers</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.85 }}>
                <li>Nginx — auto-config and reload</li>
                <li>Apache2 / httpd — auto-config and reload</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Caddy — cert files saved</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Node.js — cert files saved</li>
                <li style={{ color: 'var(--v2-text-3)' }}>No web server — files only</li>
              </ul>
            </div>
          </div>

          <Note type="info">
            <span className="v2-callout-title">Agent commands</span>
            <span className="v2-mono">sslvault-agent status</span> · <span className="v2-mono">sslvault-agent uninstall</span> · <span className="v2-mono">journalctl -u sslvault-agent -f</span>
          </Note>
        </Section>

        {/* SECTION 3 */}
        <Divider label="03 · SHARED HOSTING" title="cPanel auto-install — no SSH needed" />
        <Section anchor="shared-hosting"
                 title="cPanel installer (PHP agent)"
                 subtitle="GoDaddy, Bluehost, Hostinger, SiteGround"
                 icon={Cloud}>
          <Step n={1} title="Go to Dashboard → click your cert row → Install">
            <p>In the <strong>Dashboard</strong>, click your cert row to expand it, then click <strong>Install</strong>. In the modal, choose <strong>cPanel / Shared Hosting</strong>.</p>
          </Step>
          <Step n={2} title="Enter cPanel credentials">
            <p>Enter your cPanel username and API token. These are saved encrypted for future installs.</p>
            <Note type="tip">Your cPanel username is your short login name (not your email). Find it in your hosting welcome email or at <em>yourdomain.com/cpanel</em> → top right corner.</Note>
            <Note type="info">To create a cPanel API token: cPanel → <em>Manage API Tokens</em> → Create token → give it SSL permissions → copy.</Note>
          </Step>
          <Step n={3} title="Download and upload the PHP agent file"
                terminal={`# No terminal needed — done through your browser:\n# 1. Click "Download PHP Agent" — saves sslvault-agent.php\n# 2. Log in to cPanel → File Manager → public_html\n# 3. Upload sslvault-agent.php to public_html`}>
            <p>A PHP file is downloaded with your credentials pre-embedded. Upload it to your website's <span className="v2-kbd">public_html</span> folder using cPanel File Manager.</p>
          </Step>
          <Step n={4} title="Visit the agent URL to activate SSL">
            <p>Open a new browser tab and go to:</p>
            <CodeBlock code="https://yourdomain.com/sslvault-agent.php" label="url" />
            <p>The script calls cPanel's API directly and activates SSL in seconds. You'll see a success page when done.</p>
          </Step>
          <Step n={5} title="Delete the file immediately after">
            <p>The PHP file contains your cPanel API token. Delete it from File Manager right after installation. Your certificate and SSL remain active — only the temporary installer file is removed.</p>
          </Step>
          <Note type="warn">Every renewal requires repeating steps 1–5 for shared hosting. For zero-touch renewals, upgrade to a VPS with the persistent agent.</Note>
        </Section>

        {/* SECTION 4 */}
        <Divider label="04 · AUTOMATION" title="Set it once, renew forever" />
        <Section anchor="auto-renewal"
                 title="Auto-renewal"
                 subtitle="Renews 14 days before expiry — never see a warning again"
                 icon={RefreshCw}>
          <Step n={1} title="Requirement: connect a DNS provider">
            <p>Auto-renewal uses DNS verification (DNS-01 challenge). You must have a DNS provider connected so SSLVault can auto-add the TXT record without human input.</p>
            <Note type="info">Go to <strong>More → DNS Providers</strong> to connect Cloudflare, GoDaddy, Vercel, or DigitalOcean.</Note>
          </Step>
          <Step n={2} title="Enable auto-renewal on a certificate">
            <p>In <strong>Inventory &amp; Monitor → Renewal Schedule tab</strong>, find your certificate and toggle <strong>Auto-Renew</strong> to on. That's it.</p>
          </Step>
          <Step n={3} title="SSLVault renews automatically">
            <p>The renewal engine runs daily at 03:00 UTC. When your cert is within 14 days of expiry:</p>
            <ul>
              <li>Adds DNS TXT record automatically via your DNS provider</li>
              <li>Issues new certificate via Let's Encrypt ACME</li>
              <li>If you have a persistent agent: installs new cert on your server automatically</li>
              <li>Sends email confirmation when done</li>
              <li>Retries on failure: 0h → 6h → 24h → 3 days → 7 days (max 5 attempts)</li>
            </ul>
          </Step>
          <Step n={4} title="Get notified by email">
            <p>SSLVault sends an email when a cert renews successfully or when renewal fails, including how many days are left and when it will retry.</p>
          </Step>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            <Note type="success">
              <span className="v2-callout-title">Fully automated when you have:</span>
              DNS provider connected · Persistent agent installed (VPS) · Auto-renewal toggled on
            </Note>
            <Note type="warn">
              <span className="v2-callout-title">Still needs manual steps if:</span>
              Shared hosting (no persistent agent) · No DNS provider connected
            </Note>
          </div>
        </Section>

        {/* SECTION 5 */}
        <Divider label="05 · INTEGRATIONS" title="Connect your DNS provider" />
        <Section anchor="dns-providers"
                 title="DNS providers"
                 subtitle="Auto-add _acme-challenge records for cert verification"
                 icon={Network}>
          <Step n={1} title="Go to More → DNS Providers">
            <p>Click <strong>More → DNS Providers</strong> in the navigation. Click <strong>Add Provider</strong>.</p>
          </Step>
          <Step n={2} title="Select your provider and enter credentials">
            <table className="v2-table">
              <tbody>
                <tr><td style={{ fontWeight: 500, width: 130 }}>Cloudflare</td><td>Zone:DNS:Edit API Token — Dashboard → My Profile → API Tokens</td></tr>
                <tr><td style={{ fontWeight: 500 }}>GoDaddy</td><td>API Key + Secret from developer.godaddy.com/keys</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Vercel</td><td>API Token from vercel.com/account/tokens</td></tr>
                <tr><td style={{ fontWeight: 500 }}>DigitalOcean</td><td>Personal Access Token with Write scope</td></tr>
              </tbody>
            </table>
            <Note type="info">Credentials are encrypted with AES-256-GCM before storage. Only you can access them via Row-Level Security.</Note>
          </Step>
          <Step n={3} title="Enter the domain this provider manages">
            <p>Type the root domain (e.g. <span className="v2-kbd">example.com</span>). SSLVault uses this provider for all certificates under that domain, including subdomains and wildcards.</p>
          </Step>
          <Step n={4} title="Generate a cert — DNS is handled automatically">
            <p>Next time you issue a certificate for that domain, SSLVault auto-creates the <span className="v2-kbd">_acme-challenge</span> TXT record, verifies it, and removes it — all in seconds.</p>
          </Step>
          <Note type="tip">Don't see your DNS provider? Use the manual verification method and paste the TXT record in your registrar's DNS settings. Most registrars propagate within 1–5 minutes.</Note>
        </Section>

        {/* SECTION 6 */}
        <Divider label="06 · DISCOVERY" title="Find every cert issued for your domains" />
        <Section anchor="ct-discovery"
                 title="CT Log Discovery"
                 subtitle="Audit certificates via Certificate Transparency logs"
                 icon={Search}>
          <Step n={1} title="Go to Inventory & Monitor → Discovery tab">
            <p>In the dashboard, click <strong>Inventory &amp; Monitor</strong> and select the <strong>Discovery</strong> tab at the top.</p>
          </Step>
          <Step n={2} title="Enter a domain and scan">
            <p>Type any domain (e.g. <span className="v2-kbd">example.com</span>) and click <strong>Scan CT Logs</strong>. SSLVault queries <strong>crt.sh</strong> — the public CT log aggregator — and returns all certificates ever issued for that domain and its subdomains.</p>
            <Note type="info">CT logs are public. Anyone can query them. This is a transparency feature built into TLS — all trusted CA-issued certs are logged.</Note>
          </Step>
          <Step n={3} title="Import discovered domains to your monitor">
            <p>Click <strong>Add to Monitor</strong> next to any discovered domain to start tracking its expiry, issuer, and health in your inventory.</p>
          </Step>
          <Note type="tip">Use CT Discovery to audit your domain — you may find forgotten subdomains, staging environments, or certs issued by an unexpected CA.</Note>
        </Section>

        {/* SECTION 7 */}
        <Divider label="07 · MONITORING" title="Track any domain — no login required" />
        <Section anchor="monitor"
                 title="SSL Monitor"
                 subtitle="Public scanner + personal inventory tracking"
                 icon={Activity}>
          <Step n={1} title="Visit the Monitor page">
            <p>Click <strong>Inventory &amp; Monitor</strong> in the navigation. Without logging in, you'll see the public scanner. With an account, you see your full inventory plus the scanner.</p>
          </Step>
          <Step n={2} title="Enter any domain and scan">
            <p>Type a domain and click <strong>Scan</strong>. Results show:</p>
            <ul>
              <li>Expiry date and days remaining</li>
              <li>Certificate issuer (e.g. Let's Encrypt)</li>
              <li>Valid / expired / revoked status</li>
              <li>TLS protocol version</li>
            </ul>
          </Step>
          <Step n={3} title="Add to your inventory for ongoing tracking">
            <p>Click <strong>Add to Monitor</strong> to save the domain to your inventory. SSLVault tracks it and shows it on your dashboard alongside your issued certificates.</p>
          </Step>
        </Section>

        {/* SECTION 8 */}
        <Divider label="08 · CERT FILES" title="View, copy and download your certificate data" />
        <Section anchor="cert-details"
                 title="Certificate details"
                 subtitle="Download files, copy PEM, view fingerprint"
                 icon={FileDown}>
          <p>Expand any domain in <strong>Inventory &amp; Monitor</strong> and find the certificate row. From there you can:</p>
          <ul>
            <li><strong>Download cert.pem</strong> — the certificate file for use in web server configs</li>
            <li><strong>Download key.pem</strong> — your private key, keep this secret</li>
            <li><strong>Download fullchain.pem</strong> — certificate + intermediate chain bundle</li>
            <li><strong>Download all files</strong> — grabs all three at once</li>
            <li><strong>Details panel</strong> — view SANs, fingerprint, copy full PEM text</li>
            <li><strong>Validity bar</strong> — visual indicator of remaining certificate lifetime</li>
          </ul>
          <Note type="tip">The <strong>Details</strong> button opens a panel with one-click copy for the full PEM — useful when pasting into cPanel or control panel SSL fields.</Note>
        </Section>

        {/* SECTION 9 — TROUBLESHOOTING */}
        <Divider label="09 · TROUBLESHOOTING" title="Common issues, fixed fast" />
        <div id="troubleshooting" style={{ scrollMarginTop: 80 }}>

          <Section title="Token expired" subtitle="Agent install tokens are 1-hour TTL" icon={Clock}>
            <p>Agent install tokens expire after 1 hour. Go to <strong>Inventory &amp; Monitor</strong> → expand your domain → <strong>Install on Server</strong> → generate a fresh token → re-run the command.</p>
          </Section>

          <Section title="Permission denied when running agent install" subtitle="Always run with sudo" icon={Lock}>
            <p>Always prefix the command with <span className="v2-kbd">sudo</span>. The agent writes to <span className="v2-kbd">/etc/ssl/sslvault/</span> and modifies web server configs which require root.</p>
            <CodeBlock code={'curl -fsSL https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=YOUR_TOKEN ...'} label="install" />
          </Section>

          <Section title="Nginx config test failed after agent ran" subtitle="Original config is auto-restored" icon={SettingsIcon}>
            <p>The agent backs up your config before modifying it. If the test fails, the original is automatically restored. Check what went wrong:</p>
            <CodeBlock label="nginx-debug" code={'# Check Nginx error\nnginx -t\n\n# View backup\nls /etc/nginx/sites-available/*.sslvault-bak\n\n# Restore manually if needed\nsudo cp /etc/nginx/sites-available/yourdomain.conf.sslvault-bak \\\n  /etc/nginx/sites-available/yourdomain.conf'} />
          </Section>

          <Section title="Certificate saved but HTTPS not working" subtitle="Cert files always written, even if config fails" icon={FileDown}>
            <p>Certificate files are always saved even if web server config fails. Find them at:</p>
            <CodeBlock label="paths" code={'/etc/ssl/sslvault/yourdomain.com/fullchain.pem\n/etc/ssl/sslvault/yourdomain.com/privkey.pem'} />
            <p>Point your Nginx/Apache config at these paths manually. See <strong>More → Install Guide</strong> for server-specific instructions.</p>
          </Section>

          <Section title="cPanel agent shows success but SSL not active" subtitle="Verify domain match and token permissions" icon={Cloud}>
            <p>The PHP agent calls cPanel's API to activate SSL directly. If you still see "Not Secure", check: (1) the domain in the PHP file matches your actual domain exactly, (2) your cPanel API token has SSL permissions enabled, (3) your hosting plan supports SSL (some very cheap plans don't). Try clicking "Test SSL Grade" from the success screen to diagnose.</p>
          </Section>

          <Section title="curl: command not found" subtitle="Install curl on your server" icon={Bug}>
            <CodeBlock label="install-curl" code={'# Ubuntu / Debian\nsudo apt install curl -y\n\n# CentOS / RHEL\nsudo yum install curl -y\n\n# Alpine\nsudo apk add curl'} />
          </Section>

          <Section title="DNS TXT record not propagating" subtitle="1–5 minutes typically, occasionally up to 48h" icon={Globe}>
            <p>DNS propagation typically takes 1–5 minutes but can take up to 48 hours in rare cases. Check propagation at <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer">dnschecker.org</a>. With an auto DNS provider connected, SSLVault handles this automatically and retries verification until it succeeds.</p>
          </Section>

          <Section title="Auto-renewal failed — what happens?" subtitle="Backoff retries + email notifications" icon={RefreshCw}>
            <p>SSLVault retries on a backoff schedule: immediately → 6 hours → 24 hours → 3 days → 7 days. After 5 failed attempts it stops and emails you to act manually. You'll receive an email on every failure with the error details and days remaining on the current cert.</p>
          </Section>

          <Section title="Agent shows offline on the server card" subtitle="Last seen >15 minutes ago" icon={Bot}>
            <p>The agent is offline when it hasn't been seen in over 15 minutes. Check its status on the server:</p>
            <CodeBlock label="agent-debug" code={'# Check service status\nsystemctl status sslvault-agent\n\n# View recent logs\njournalctl -u sslvault-agent -n 50\n\n# Restart if stopped\nsudo systemctl restart sslvault-agent'} />
          </Section>
        </div>

        {/* SECTION 10 — FAQ */}
        <Divider label="10 · FAQ" title="Frequently asked questions" />
        <FAQ q="Is SSLVault free?"
             a="Yes, completely. SSL certificates from Let's Encrypt are free. SSLVault is free. The agent is free. No credit card, no trial period, no hidden tiers." />
        <FAQ q="Are my credentials safe?"
             a="Yes. DNS provider and server credentials are encrypted with AES-256-GCM before storage. Private keys are never logged or transmitted unencrypted. Row-Level Security ensures only you can read your data. The PHP agent file contains your cPanel token — delete it immediately after use." />
        <FAQ q="How long do certificates last?"
             a="90 days — the standard Let's Encrypt duration. With auto-renewal enabled, SSLVault renews automatically 14 days before expiry so you'll never hit the limit." />
        <FAQ q="Can I use this for wildcard certificates?"
             a="Yes. Enter *.example.com when generating a certificate. Wildcards require DNS-01 verification, so you must have a DNS provider connected. Wildcard certs cover example.com and all one-level subdomains (shop.example.com, blog.example.com, etc.)" />
        <FAQ q="Can I install the same cert on multiple servers?"
             a='Yes. Click "Install on Server" multiple times — once per server. Each install dispatches to the agent on that server. The certificate itself covers the domain regardless of which server it is on.' />
        <FAQ q="What web servers does auto-config support?"
             a="Nginx and Apache2/httpd get automatic config updates and reloads. Caddy, Node.js, and others get cert files saved at /etc/ssl/sslvault/ — you update their config manually." />
        <FAQ q="Does the agent need inbound firewall ports?"
             a="No. The agent only makes outbound HTTPS connections to Supabase (port 443). No ports need to be opened on your server." />
        <FAQ q="What happens if my VPS is offline when renewal runs?"
             a="The cert is renewed and stored in SSLVault. When your agent next comes online and polls (every 5 minutes), it picks up the renewal job and installs the new cert automatically." />

        {/* CTA */}
        <div className="v2-card" style={{ marginTop: 32, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--v2-text)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Shield size={18} color="white" strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Ready to secure your domains?
          </h3>
          <p style={{ color: 'var(--v2-text-2)', fontSize: 13, maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Free SSL, auto-renewal, and one-command installs. No credit card ever.
          </p>
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13} strokeWidth={2.2} /> Issue free certificate <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button className="v2-btn" onClick={() => nav('/dashboard')}>
              View my certificates
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
