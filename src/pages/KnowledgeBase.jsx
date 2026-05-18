import { useState } from 'react'
import {
  ChevronRight, ExternalLink, Shield, Server, BookOpen, Zap, Globe,
  Key, ArrowRight, RefreshCw, Search, Activity, Cloud, AlertCircle,
  Copy, Check, Clock, Lock, Settings as SettingsIcon, FileDown,
  CircleHelp, Bug, Network, Bot
} from 'lucide-react'
import '../styles/design-v2.css'

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

const QUICK_LINKS = [
  { icon: Zap,        title: 'Getting Started',       desc: 'Issue your first cert in minutes',        anchor: 'getting-started' },
  { icon: Bot,        title: 'Persistent Agent',      desc: 'Zero-touch VPS installs and renewals',    anchor: 'persistent-agent' },
  { icon: Cloud,      title: 'Shared Hosting',        desc: 'cPanel — no SSH needed',                  anchor: 'shared-hosting' },
  { icon: RefreshCw,  title: 'Auto-Renewal',          desc: 'Set it once, renew forever',              anchor: 'auto-renewal' },
  { icon: Network,    title: 'DNS Providers',         desc: 'Auto-add TXT/CNAME records',              anchor: 'dns-providers' },
  { icon: Search,     title: 'CT Log Discovery',      desc: 'Find all certs for your domains',         anchor: 'ct-discovery' },
  { icon: Activity,   title: 'SSL Monitor',           desc: 'Track expiry for any domain',             anchor: 'monitor' },
  { icon: Bug,        title: 'Troubleshooting',       desc: 'Common errors and fixes',                 anchor: 'troubleshooting' },
  { icon: Key,        title: 'KeyLocker',             desc: 'Encrypted private key vault',             anchor: 'keylocker' },
  { icon: FileDown,   title: 'Import Certificates',   desc: 'Add existing certs to inventory',         anchor: 'import' },
]

export default function KnowledgeBase({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 920 }}>

        {/* HERO */}
        <div style={{ padding: '8px 0 24px' }}>
          <h1 className="v2-h1" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>Knowledge Base</h1>
          <p className="v2-subtitle" style={{ fontSize: 14, marginTop: 4, maxWidth: 560 }}>
            Guides and reference docs for every SSLVault feature — agents, installation, DNS validation, auto-renewal, and more.
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

        {/* SECTION 1 — GETTING STARTED */}
        <Divider label="01 · BASICS" title="Issue your first SSL certificate" />
        <Section anchor="getting-started"
                 title="Getting started"
                 subtitle="DV, OV, EV & Wildcard via GoGetSSL — issued in minutes"
                 icon={Zap}
                 defaultOpen>
          <Step n={1} title="Go to Issue Certificate">
            <p>Click <strong>Issue Certificate</strong> in the sidebar. Enter your domain name (e.g. <span className="v2-kbd">example.com</span> or <span className="v2-kbd">*.example.com</span> for wildcard), select the certificate type and validity period, then click <strong>Issue Certificate</strong>.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, margin: '10px 0' }}>
              {[
                { type: 'DV (Domain Validated)', time: '~5 minutes', use: 'Blogs, personal sites, APIs' },
                { type: 'OV (Org Validated)', time: '1–3 days', use: 'Business websites' },
                { type: 'EV (Extended Validation)', time: '2–7 days', use: 'E-commerce, banks' },
                { type: 'Wildcard DV', time: '~5 minutes', use: '*.yourdomain.com — all subdomains' },
              ].map(({ type, time, use }) => (
                <div key={type} style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)', borderRadius: 'var(--v2-r-md)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>{type}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-green-text)', marginBottom: 2 }}>⏱ {time}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{use}</div>
                </div>
              ))}
            </div>
          </Step>
          <Step n={2} title="Complete domain control validation (DCV)">
            <p>GoGetSSL verifies you own the domain before issuing. Three methods available:</p>
            <table className="v2-table">
              <tbody>
                <tr><td style={{ fontWeight: 600, width: 100 }}>DNS CNAME</td><td>Add a CNAME record to your DNS — recommended. SSLVault does this automatically if a DNS provider is connected.</td></tr>
                <tr><td style={{ fontWeight: 600 }}>DNS TXT</td><td>Add a TXT record — similar to CNAME but some registrars prefer it.</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Email</td><td>Approval email sent to admin@, webmaster@, or hostmaster@ — you click a link.</td></tr>
              </tbody>
            </table>
            <Note type="tip">Connect a DNS provider under <strong>More → DNS Providers</strong> and DCV is handled fully automatically — no copy-pasting records.</Note>
          </Step>
          <Step n={3} title="Certificate appears in Dashboard">
            <p>Once issued, your certificate appears in the <strong>Dashboard</strong>. Click any row to expand — you'll see expiry date, issuer, full PEM files, and the Install button.</p>
          </Step>
          <Step n={4} title="Install on your server">
            <p>Click <strong>Install</strong> on the cert row. Three paths:</p>
            <ul>
              <li><strong>Persistent agent (VPS)</strong> — cert dispatched automatically to your connected server. No SSH needed.</li>
              <li><strong>Install agent first</strong> — no agent yet? The modal shows a one-line install command. Run it, then dispatch.</li>
              <li><strong>cPanel / shared hosting</strong> — enter cPanel username + API token. SSLVault installs via UAPI. No agent or SSH required.</li>
            </ul>
          </Step>
          <Note type="tip">The agent can be installed before or after issuing a certificate — the Install modal handles both flows.</Note>
        </Section>

        {/* SECTION 2 — AGENT */}
        <Divider label="02 · VPS" title="Persistent agent — SSH once, never again" />
        <Section anchor="persistent-agent"
                 title="Install the agent on your VPS"
                 subtitle="One curl command — zero-touch installs and renewals forever"
                 icon={Bot}>
          <Step n={1} title="Go to Manage → Servers">
            <p>In the sidebar under <strong>Manage</strong>, click <strong>Servers</strong>. Click <strong>Add Server</strong> — a modal appears with a one-time install token and command.</p>
          </Step>
          <Step n={2} title="Run the install command on your server"
                terminal={`curl -fsSL https://easysecurity.in/agent-install.sh | bash`}>
            <p>SSH into your server once and run the command. The installer automatically:</p>
            <ul>
              <li>Detects your OS (Ubuntu / Debian / CentOS / Amazon Linux / RHEL)</li>
              <li>Detects your web server (Nginx or Apache)</li>
              <li>Installs the agent daemon as a systemd service</li>
              <li>Registers with SSLVault — server appears online within 1–2 minutes</li>
            </ul>
          </Step>
          <Step n={3} title="Server shows Online in Servers page">
            <p>Once registered, the server card shows a green <strong>Online</strong> dot, last-seen time, agent version, and recent job log.</p>
          </Step>
          <Step n={4} title="Dispatch a certificate install">
            <p><strong>Dashboard</strong> → expand cert row → <strong>Install</strong> → modal detects your agent → click <strong>Deploy</strong>. The agent:</p>
            <ul>
              <li>Writes <span className="v2-kbd">fullchain.pem</span> and <span className="v2-kbd">privkey.pem</span> to <span className="v2-kbd">/etc/ssl/sslvault/yourdomain/</span></li>
              <li>Updates Nginx or Apache config with correct SSL paths</li>
              <li>Tests config (<span className="v2-kbd">nginx -t</span> or <span className="v2-kbd">apache2ctl configtest</span>)</li>
              <li>Reloads the web server</li>
              <li>Reports result back to SSLVault within seconds</li>
            </ul>
          </Step>
          <Step n={5} title="Auto-renewal installs automatically">
            <p>When a certificate auto-renews, the agent picks up the new cert on its next poll (every 5 minutes) and installs it — no action needed from you.</p>
          </Step>
          <Note type="tip">
            <span className="v2-callout-title">Agent before or after — both work</span>
            You can install the agent before or after issuing a cert. The Install modal handles both flows.
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
              <div className="v2-section-label" style={{ marginBottom: 8 }}>Web server support</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.85 }}>
                <li>Nginx — auto-config + reload ✓</li>
                <li>Apache2 / httpd — auto-config + reload ✓</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Caddy — cert files written only</li>
                <li style={{ color: 'var(--v2-text-3)' }}>Node.js — cert files written only</li>
                <li style={{ color: 'var(--v2-text-3)' }}>No web server — files only</li>
              </ul>
            </div>
            <div className="v2-card v2-card-pad">
              <div className="v2-section-label" style={{ marginBottom: 8 }}>Useful commands</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.85 }}>
                <li><span className="v2-mono">systemctl status sslvault-agent</span></li>
                <li><span className="v2-mono">journalctl -u sslvault-agent -f</span></li>
                <li><span className="v2-mono">systemctl restart sslvault-agent</span></li>
                <li><span className="v2-mono">sslvault-agent status</span></li>
                <li><span className="v2-mono">sslvault-agent uninstall</span></li>
              </ul>
            </div>
          </div>

          <Note type="info">
            <span className="v2-callout-title">How the agent works</span>
            The agent is a pure bash daemon running as a systemd service. It polls SSLVault every 5 minutes for pending jobs (installs, renewals). It makes <strong>outbound-only</strong> HTTPS connections — no inbound ports needed.
          </Note>
        </Section>

        {/* SECTION 3 — SHARED HOSTING */}
        <Divider label="03 · SHARED HOSTING" title="cPanel auto-install — no SSH needed" />
        <Section anchor="shared-hosting"
                 title="cPanel installer (PHP agent)"
                 subtitle="GoDaddy, Bluehost, Hostinger, SiteGround"
                 icon={Cloud}>
          <Step n={1} title="Dashboard → expand cert row → Install → cPanel">
            <p>In <strong>Dashboard</strong>, expand your cert row, click <strong>Install</strong>, and choose <strong>cPanel / Shared Hosting</strong>.</p>
          </Step>
          <Step n={2} title="Enter cPanel credentials">
            <p>Enter your cPanel username and API token. Credentials are saved encrypted for future installs.</p>
            <Note type="tip">Your cPanel username is your short login name (not email). Find it in your hosting welcome email or at <em>yourdomain.com/cpanel</em> → top-right corner.</Note>
            <Note type="info">Create a cPanel API token: cPanel → <em>Manage API Tokens</em> → Create token → enable SSL permissions → copy.</Note>
          </Step>
          <Step n={3} title="Download and upload the PHP agent"
                terminal={`# No terminal needed — done through your browser:
# 1. Click "Download PHP Agent" — saves sslvault-agent.php
# 2. cPanel → File Manager → public_html
# 3. Upload sslvault-agent.php`}>
            <p>A PHP file is generated with your credentials pre-embedded. Upload it to <span className="v2-kbd">public_html</span> via cPanel File Manager.</p>
          </Step>
          <Step n={4} title="Visit the agent URL to activate">
            <p>Open a new tab and go to:</p>
            <CodeBlock code="https://yourdomain.com/sslvault-agent.php" label="url" />
            <p>The script calls cPanel's UAPI directly and activates SSL in seconds.</p>
          </Step>
          <Step n={5} title="Delete the PHP file immediately">
            <p>The PHP file contains your API token. Delete it from File Manager right after use. Your SSL certificate stays active.</p>
          </Step>
          <Note type="warn">Every renewal requires repeating steps 1–5 for shared hosting. For zero-touch renewals, move to a VPS with the persistent agent.</Note>
        </Section>

        {/* SECTION 4 — AUTO-RENEWAL */}
        <Divider label="04 · AUTOMATION" title="Set it once, renew forever" />
        <Section anchor="auto-renewal"
                 title="Auto-renewal"
                 subtitle="Renews 30 days before expiry — certificates never expire"
                 icon={RefreshCw}>
          <Step n={1} title="Requirement: connect a DNS provider">
            <p>Auto-renewal uses DNS-01 validation. You need a DNS provider connected so SSLVault can auto-create the CNAME/TXT challenge record.</p>
            <Note type="info">Go to <strong>More → DNS Providers</strong> to connect Cloudflare, GoDaddy, Vercel, or DigitalOcean.</Note>
          </Step>
          <Step n={2} title="Enable auto-renewal on a certificate">
            <p>In <strong>Dashboard → Renewal Schedule</strong> tab, find your certificate and toggle <strong>Auto-Renew</strong> on.</p>
          </Step>
          <Step n={3} title="SSLVault renews automatically">
            <p>The renewal engine runs daily. When your cert is within 30 days of expiry:</p>
            <ul>
              <li>Orders a new certificate via GoGetSSL API</li>
              <li>Auto-creates DCV record via your DNS provider</li>
              <li>Downloads and stores the new certificate</li>
              <li>If persistent agent connected: installs cert on your server automatically</li>
              <li>Sends email confirmation when done</li>
              <li>Retry schedule on failure: 0h → 6h → 24h → 3 days → 7 days</li>
            </ul>
          </Step>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            <Note type="success">
              <span className="v2-callout-title">Fully automated when you have:</span>
              DNS provider connected · Persistent agent installed · Auto-renewal toggled on
            </Note>
            <Note type="warn">
              <span className="v2-callout-title">Still needs manual steps if:</span>
              Shared hosting (no persistent agent) · No DNS provider connected
            </Note>
          </div>
        </Section>

        {/* SECTION 5 — DNS */}
        <Divider label="05 · INTEGRATIONS" title="Connect your DNS provider" />
        <Section anchor="dns-providers"
                 title="DNS providers"
                 subtitle="Auto-add CNAME/TXT records for domain validation"
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
          <Step n={3} title="Enter the root domain this provider manages">
            <p>Enter e.g. <span className="v2-kbd">example.com</span>. SSLVault uses this provider for all certificates under that domain — subdomains and wildcards included.</p>
          </Step>
          <Step n={4} title="DCV is now fully automatic">
            <p>When you issue or renew a certificate, SSLVault auto-creates the <span className="v2-kbd">_acme-challenge</span> CNAME/TXT record, waits for propagation, verifies, then removes it — no manual steps.</p>
          </Step>
          <Note type="tip">Don't see your provider? Use the manual DCV method and paste the record into your registrar's DNS panel. Most propagate within 1–5 minutes.</Note>
        </Section>

        {/* SECTION 6 — CT DISCOVERY */}
        <Divider label="06 · DISCOVERY" title="Find every cert issued for your domains" />
        <Section anchor="ct-discovery"
                 title="CT Log Discovery"
                 subtitle="Audit certificates via Certificate Transparency logs"
                 icon={Search}>
          <Step n={1} title="Go to Dashboard → Discovery tab">
            <p>In the dashboard, select the <strong>Discovery</strong> tab at the top.</p>
          </Step>
          <Step n={2} title="Enter a domain and scan">
            <p>Type any domain (e.g. <span className="v2-kbd">example.com</span>) and click <strong>Scan CT Logs</strong>. SSLVault queries <strong>crt.sh</strong> — the public CT log aggregator — and returns all certificates ever issued for that domain and its subdomains.</p>
            <Note type="info">CT logs are public. All CA-issued certs are logged by design — this is a TLS transparency requirement.</Note>
          </Step>
          <Step n={3} title="Add discovered domains to your monitor">
            <p>Click <strong>Add to Monitor</strong> next to any discovered domain to start tracking its expiry, issuer, and health.</p>
          </Step>
          <Note type="tip">Use CT Discovery to audit your estate — you may find forgotten subdomains, staging certs, or certificates issued by an unexpected CA.</Note>
        </Section>

        {/* SECTION 7 — MONITOR */}
        <Divider label="07 · MONITORING" title="Track any domain — no login required" />
        <Section anchor="monitor"
                 title="SSL Monitor"
                 subtitle="Public scanner + personal inventory tracking"
                 icon={Activity}>
          <Step n={1} title="Open Dashboard → Monitor tab">
            <p>The Monitor tab shows your full certificate inventory with expiry countdown, status, and issuer for every domain.</p>
          </Step>
          <Step n={2} title="Scan any domain">
            <p>Type any domain and click <strong>Scan</strong>. Results show: expiry date, days remaining, issuer, valid/expired/revoked status, and TLS protocol version.</p>
          </Step>
          <Step n={3} title="Add to inventory for ongoing tracking">
            <p>Click <strong>Add to Monitor</strong> to save the domain. SSLVault tracks it alongside your issued certificates and alerts you before it expires.</p>
          </Step>
        </Section>

        {/* SECTION 8 — CERT FILES */}
        <Divider label="08 · CERT FILES" title="Download and use your certificate files" />
        <Section anchor="cert-details"
                 title="Certificate files"
                 subtitle="fullchain.pem · privkey.pem — where to get them and how to use them"
                 icon={FileDown}>
          <p>Expand any domain row in <strong>Dashboard</strong>. From the cert panel:</p>
          <table className="v2-table" style={{ marginBottom: 12 }}>
            <tbody>
              <tr><td style={{ fontWeight: 600, width: 180 }}>fullchain.pem</td><td>Certificate + intermediate chain. Use this for all web server configs (Nginx, Apache, Caddy etc.)</td></tr>
              <tr><td style={{ fontWeight: 600 }}>privkey.pem</td><td>Your private key. Keep this secret. Never share it. Set permissions to 600.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>cert.pem</td><td>End-entity cert only (no chain). Rarely needed — prefer fullchain.pem.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Download all</td><td>Downloads all three files as a zip.</td></tr>
            </tbody>
          </table>
          <Note type="warn">Always use <strong>fullchain.pem</strong> — using cert.pem alone causes "certificate not trusted" errors on some browsers and clients.</Note>
          <Note type="tip">The <strong>Details</strong> button opens a panel with one-click copy of the full PEM — useful when pasting into cPanel's SSL fields.</Note>
        </Section>


        {/* SECTION 8b — KEYLOCKER */}
        <Divider label="08b · KEYLOCKER" title="KeyLocker — encrypted private key vault" />
        <Section anchor="keylocker"
                 title="KeyLocker"
                 subtitle="AES-256-GCM encrypted key storage with audit log and timed reveal"
                 icon={Key}>
          <p>KeyLocker stores your private keys encrypted at rest. Access is opt-in — keys are only stored if you click <strong>Save to KeyLocker</strong> after issuance.</p>
          <table className="v2-table" style={{ marginBottom: 12 }}>
            <tbody>
              <tr><td style={{ fontWeight: 600, width: 180 }}>Encryption</td><td>AES-256-GCM per-key with unique IVs. Keys are never logged or transmitted in plaintext.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Reveal</td><td>Copy-only. Private key is displayed for 30 seconds maximum — prevents screen-share leaks. No download button.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Audit log</td><td>Every reveal is logged: timestamp, user, IP address. Visible in the KeyLocker audit panel.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Access control</td><td>Row-Level Security — only your account can access your keys. Admin users can manage keys across their account.</td></tr>
            </tbody>
          </table>
          <Note type="warn">If you prefer keys to never leave your server, use the persistent agent to generate keys on-server — SSLVault never sees them.</Note>
        </Section>

        {/* SECTION 8c — IMPORT */}
        <Divider label="08c · IMPORT" title="Import existing certificates" />
        <Section anchor="import"
                 title="Import certificates"
                 subtitle="Add existing certs to your inventory — any CA, any issuer"
                 icon={FileDown}>
          <Step n={1} title="Go to Dashboard → Import tab">
            <p>In Dashboard, select the <strong>Import</strong> tab. Click <strong>Import Certificate</strong>.</p>
          </Step>
          <Step n={2} title="Paste PEM files">
            <p>Paste your <span className="v2-kbd">fullchain.pem</span> and <span className="v2-kbd">privkey.pem</span> content. SSLVault parses the chain and extracts:</p>
            <ul>
              <li>Domain / Subject Alternative Names</li>
              <li>Expiry date and days remaining</li>
              <li>Issuer and CA chain details</li>
              <li>TLS protocol and cipher compatibility</li>
            </ul>
          </Step>
          <Step n={3} title="Certificate added to inventory">
            <p>The imported cert appears in your Dashboard inventory alongside GoGetSSL-issued certs. Expiry monitoring and email alerts work immediately. Auto-renewal is not available for imported certs (they weren't ordered through SSLVault).</p>
          </Step>
          <Note type="tip">Use Import to track existing certificates from any CA — DigiCert, Sectigo, Let's Encrypt, or any other — in a single inventory with unified expiry alerts.</Note>
        </Section>

        {/* SECTION 9 — TROUBLESHOOTING */}
        <Divider label="09 · TROUBLESHOOTING" title="Common issues, fixed fast" />
        <div id="troubleshooting" style={{ scrollMarginTop: 80 }}>

          <Section title="Agent install token expired" subtitle="Tokens are 1-hour TTL" icon={Clock}>
            <p>Agent install tokens expire after 1 hour. Go to <strong>Servers</strong> → <strong>Add Server</strong> → generate a fresh token → re-run the install command.</p>
          </Section>

          <Section title="Permission denied during agent install" subtitle="Always run with sudo" icon={Lock}>
            <p>The agent writes to <span className="v2-kbd">/etc/ssl/sslvault/</span> and modifies web server configs — root is required. Always prefix with <span className="v2-kbd">sudo</span>:</p>
            <CodeBlock code={'curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash'} label="install" />
          </Section>

          <Section title="Nginx config test failed after agent ran" subtitle="Original config is auto-restored" icon={SettingsIcon}>
            <p>The agent backs up your config before modifying it. If the test fails, the original is restored automatically. Diagnose with:</p>
            <CodeBlock label="nginx-debug" code={'# Check Nginx error\nnginx -t\n\n# View backup\nls /etc/nginx/sites-available/*.sslvault-bak\n\n# Restore manually if needed\nsudo cp /etc/nginx/sites-available/yourdomain.conf.sslvault-bak \\\n  /etc/nginx/sites-available/yourdomain.conf'} />
          </Section>

          <Section title="Certificate saved but HTTPS not working" subtitle="Cert files always written even if config fails" icon={FileDown}>
            <p>Certificate files are always written even if web server config fails. Find them at:</p>
            <CodeBlock label="paths" code={'/etc/ssl/sslvault/yourdomain.com/fullchain.pem\n/etc/ssl/sslvault/yourdomain.com/privkey.pem'} />
            <p>Point your Nginx/Apache config at these paths manually. See <strong>More → Install Guide</strong> for server-specific config.</p>
          </Section>

          <Section title="DCV validation pending — cert not issuing" subtitle="Check DNS propagation" icon={Globe}>
            <p>If you're doing manual DCV, the record may not have propagated yet. Check at <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer">dnschecker.org</a>. If you have a DNS provider connected, SSLVault retries automatically.</p>
            <Note type="info">GoGetSSL DCV typically validates within 1–5 minutes once the DNS record is visible globally.</Note>
          </Section>

          <Section title="cPanel agent shows success but SSL not active" subtitle="Verify domain match and token permissions" icon={Cloud}>
            <p>Check: (1) domain in the PHP file matches your actual domain exactly, (2) cPanel API token has SSL/TLS permissions, (3) your hosting plan supports custom SSL certificates. Try clicking <strong>Test SSL</strong> from the success screen.</p>
          </Section>

          <Section title="curl: command not found" subtitle="Install curl first" icon={Bug}>
            <CodeBlock label="install-curl" code={'# Ubuntu / Debian\nsudo apt install curl -y\n\n# CentOS / RHEL\nsudo yum install curl -y\n\n# Alpine\nsudo apk add curl'} />
          </Section>

          <Section title="Auto-renewal failed — what happens?" subtitle="Backoff retries + email notifications" icon={RefreshCw}>
            <p>SSLVault retries on a backoff schedule: immediately → 6h → 24h → 3 days → 7 days. After 5 failed attempts it stops and emails you. You'll receive an email on every failure with the error and days remaining on the current cert.</p>
          </Section>

          <Section title="Agent shows offline on server card" subtitle="Last seen >15 minutes ago" icon={Bot}>
            <CodeBlock label="agent-debug" code={'# Check service status\nsystemctl status sslvault-agent\n\n# View recent logs\njournalctl -u sslvault-agent -n 50\n\n# Restart if stopped\nsudo systemctl restart sslvault-agent'} />
          </Section>
        </div>

        {/* SECTION 10 — FAQ */}
        <Divider label="10 · FAQ" title="Frequently asked questions" />
        <FAQ q="What certificate types does SSLVault support?"
             a="SSLVault issues certificates via the GoGetSSL API, supporting DV (Domain Validated), OV (Organisation Validated), EV (Extended Validation), Wildcard, and multi-domain SAN certificates from DigiCert, Sectigo, RapidSSL, GeoTrust, and Thawte." />
        <FAQ q="How long does issuance take?"
             a="DV certificates issue in ~5 minutes once domain validation is complete. OV takes 1–3 business days (organisation verification required). EV takes 2–7 business days. Wildcards are DV so also ~5 minutes with DNS validation." />
        <FAQ q="Are my credentials safe?"
             a="Yes. DNS provider and server credentials are encrypted with AES-256-GCM before storage. Private keys are never logged or transmitted unencrypted. Row-Level Security ensures only you can read your data." />
        <FAQ q="Can I use SSLVault for wildcard certificates?"
             a="Yes. Enter *.example.com when issuing. Wildcards require DNS-01 validation, so you must have a DNS provider connected. A wildcard cert covers all single-level subdomains — shop.example.com, blog.example.com, etc." />
        <FAQ q="Can I install the same cert on multiple servers?"
             a='Yes. Click "Install" on the cert row and dispatch to as many connected agents as you like. Each install is a separate agent job.' />
        <FAQ q="Does the agent need inbound firewall ports?"
             a="No. The agent only makes outbound HTTPS connections to SSLVault (port 443). No inbound ports need to be opened." />
        <FAQ q="What happens if my VPS is offline when renewal runs?"
             a="The certificate is renewed and stored in SSLVault. When your agent next comes online and polls (every 5 minutes), it picks up the pending install job and deploys automatically." />
        <FAQ q="What web servers get automatic config updates?"
             a="Nginx and Apache2/httpd get full automatic config updates and reloads. Caddy, Node.js, and other servers get cert files written to /etc/ssl/sslvault/ — you update their config once manually." />
        <FAQ q="Can I import certificates I didn't issue through SSLVault?"
             a="Yes. Dashboard → Import tab. Paste any PEM certificate and SSLVault parses the chain, extracts expiry, issuer, and SAN details, and adds it to your inventory for monitoring and alerting. Auto-renewal is not available for imported certs." />
        <FAQ q="Is there sandbox/test mode?"
             a="Yes. GoGetSSL sandbox mode allows testing the full issuance flow without real cost. Sandbox certificates are clearly marked in the dashboard." />

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
            Issue SSL certificates via GoGetSSL, auto-renew, and deploy with one command.
          </p>
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13} strokeWidth={2.2} /> Issue Certificate <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button className="v2-btn" onClick={() => nav('/dashboard')}>
              View my Dashboard
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
