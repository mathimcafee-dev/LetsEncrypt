import { useState } from 'react'
import {
  ChevronRight, ExternalLink, Shield, Server, BookOpen, Zap, Globe,
  Key, ArrowRight, RefreshCw, Search, Activity, Cloud, AlertCircle,
  Copy, Check, Clock, Lock, Settings as SettingsIcon, FileDown,
  CircleHelp, Bug, Network, Bot, BarChart2, Eye, ShieldCheck, CalendarDays
} from 'lucide-react'
import '../styles/design-v2.css'

function CodeBlock({ code, label = 'shell' }) {
  const [ok, setOk] = useState(false)
  const doCopy = () => {
    try { navigator.clipboard.writeText(code) } catch (e) {}
    setOk(true); setTimeout(() => setOk(false), 1800)
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

function Note({ type = 'tip', children }) {
  const s = {
    tip:     { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'TIP' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: 'WARNING' },
    info:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'INFO' },
  }[type]
  return (
    <div style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', margin: '10px 0', fontSize: 13, color: s.color, lineHeight: 1.6 }}>
      <strong>{s.label}:</strong> {children}
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0e7fc0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  )
}

function Divider({ label, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--v2-border)' }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text-2)', whiteSpace: 'nowrap' }}>{title}</span>
    </div>
  )
}

function Section({ title, subtitle, icon: Icon, defaultOpen = false, anchor, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={anchor} className="v2-card" style={{ marginBottom: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer',
          background: open ? 'var(--v2-surface-3)' : 'var(--v2-surface)', transition: 'background .15s' }}>
        {Icon && <Icon size={16} color="var(--v2-green)" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <ChevronRight size={15} color="var(--v2-text-3)"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }} />
      </div>
      {open && (
        <div style={{ padding: '18px 20px', borderTop: '0.5px solid var(--v2-border)', animation: 'fadeIn .15s ease' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const SECTIONS = [
  { icon: Zap,          title: 'Getting Started',         desc: 'Issue your first cert in minutes',         anchor: 'getting-started' },
  { icon: Bot,          title: 'Persistent Agent',        desc: 'Zero-touch VPS installs and renewals',     anchor: 'persistent-agent' },
  { icon: Cloud,        title: 'Shared Hosting / cPanel', desc: 'No SSH needed',                            anchor: 'shared-hosting' },
  { icon: RefreshCw,    title: 'Auto-Renewal',            desc: 'Set it once, renew forever',               anchor: 'auto-renewal' },
  { icon: Network,      title: 'DNS Providers',           desc: 'Cloudflare, Vercel, Route53 auto-DCV',     anchor: 'dns-providers' },
  { icon: Lock,         title: 'KeyLocker',               desc: 'AES-256 encrypted private key vault',      anchor: 'keylocker' },
  { icon: CalendarDays, title: '47-Day Readiness',        desc: 'CA/B Forum 2026–2029 compliance',          anchor: 'readiness' },
  { icon: ShieldCheck,  title: 'CA Intelligence',         desc: 'DigiCert, Sectigo & shadow IT visibility', anchor: 'ca-intelligence' },
  { icon: Activity,     title: 'SSL Health Score',        desc: 'Grade A–F per domain',                     anchor: 'ssl-health' },
  { icon: Search,       title: 'CT Log Discovery',        desc: 'Find all certs for your domains',          anchor: 'ct-discovery' },
  { icon: Eye,          title: 'CT Abuse Monitor',        desc: 'Detect suspicious certs in CT logs',       anchor: 'ct-abuse' },
  { icon: CalendarDays, title: 'Renewal Calendar',        desc: 'Heatmap view of upcoming renewals',        anchor: 'renewal-calendar' },
  { icon: Bug,          title: 'Troubleshooting',         desc: 'Common errors and fixes',                  anchor: 'troubleshooting' },
]

export default function KnowledgeBase({ nav }) {
  const [search, setSearch] = useState('')

  const filtered = SECTIONS.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 860, padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="v2-h1" style={{ fontSize: 24, marginBottom: 6 }}>Knowledge Base</h1>
          <p style={{ fontSize: 13, color: 'var(--v2-text-3)', marginBottom: 16 }}>
            SSLVault documentation — issue, monitor, auto-renew, and manage certificates.
          </p>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search docs…"
              style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: 13, borderRadius: 8,
                border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface)',
                color: 'var(--v2-text)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Quick nav */}
        {!search && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8, marginBottom: 28 }}>
            {SECTIONS.map(s => (
              <a key={s.anchor} href={`#${s.anchor}`}
                onClick={e => { e.preventDefault(); document.getElementById(s.anchor)?.scrollIntoView({ behavior: 'smooth' }) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                  background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)', borderRadius: 8,
                  textDecoration: 'none', transition: 'border-color .15s, background .15s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--v2-green)'; e.currentTarget.style.background = 'var(--v2-green-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--v2-border)'; e.currentTarget.style.background = 'var(--v2-surface)' }}>
                <s.icon size={13} color="var(--v2-green)" />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--v2-text-2)' }}>{s.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* ── SECTION 1 — GETTING STARTED ── */}
        <Divider label="01 · Start" title="Issue your first certificate" />
        <Section anchor="getting-started" title="Getting started" subtitle="DV, OV, EV & Wildcard via RapidSSL — issued in minutes" icon={Zap} defaultOpen>
          <Step n={1} title="Go to Issue Certificate">
            <p>Click <strong>Issue Certificate</strong> in the sidebar. Enter your domain, select cert type and validity, then click Issue.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, margin: '10px 0' }}>
              {[
                { type: 'DV (Domain Validated)', time: '~5 min', use: 'Blogs, APIs, personal sites' },
                { type: 'OV (Org Validated)', time: '1–3 days', use: 'Business websites' },
                { type: 'EV (Extended Validation)', time: '2–7 days', use: 'E-commerce, banks' },
                { type: 'Wildcard DV', time: '~5 min', use: '*.domain.com — all subdomains' },
              ].map(({ type, time, use }) => (
                <div key={type} style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>{type}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-green-text)', marginBottom: 2 }}>⏱ {time}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{use}</div>
                </div>
              ))}
            </div>
          </Step>
          <Step n={2} title="Complete domain control validation (DCV)">
            <p>SSLVault verifies you own the domain. Three methods:</p>
            <table className="v2-table"><tbody>
              <tr><td style={{ fontWeight: 600, width: 100 }}>DNS CNAME</td><td>Recommended. Add a CNAME record. <strong>Automatic if DNS provider connected.</strong></td></tr>
              <tr><td style={{ fontWeight: 600 }}>DNS TXT</td><td>Add a TXT record. Also automatable via DNS provider.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Email</td><td>Click approval link sent to admin@, webmaster@, or hostmaster@.</td></tr>
            </tbody></table>
            <Note type="tip">Connect Cloudflare, Vercel, or Route53 under <strong>DNS Providers</strong> and DCV is fully automatic — no copy-pasting records.</Note>
          </Step>
          <Step n={3} title="Certificate appears in Inventory">
            Once issued, your certificate appears in <strong>Inventory &amp; Monitor</strong>. Click any row to expand — expiry, issuer, PEM files, install button, and private key reveal.
          </Step>
          <Step n={4} title="Install on your server">
            Three paths: <strong>Persistent agent (VPS)</strong> — cert dispatched automatically. <strong>cPanel</strong> — enter API token, no SSH. <strong>Manual download</strong> — copy PEM files directly.
          </Step>
        </Section>

        {/* ── SECTION 2 — AGENT ── */}
        <Divider label="02 · VPS" title="Persistent agent — SSH once, never again" />
        <Section anchor="persistent-agent" title="Install the persistent agent" subtitle="One curl command — zero-touch installs and renewals forever" icon={Bot}>
          <Step n={1} title="Go to Servers & agents">
            Navigate to <strong>Automation → Servers &amp; agents</strong>. Click <strong>Install agent</strong> to get your personalised install command.
          </Step>
          <Step n={2} title="Run on your server">
            <CodeBlock code={`curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash`} />
            The agent installs as a systemd service, registers with SSLVault, and appears in the Servers list within 1–2 minutes.
          </Step>
          <Step n={3} title="Verify it's running">
            <CodeBlock code={`sudo systemctl status sslvault-agent`} />
            Status should show <strong>active (running)</strong>. The agent polls every 5 minutes for new jobs.
          </Step>
          <Step n={4} title="Dispatch a certificate">
            In <strong>Inventory</strong>, click Install on a cert row, select your server, and click Dispatch. The agent installs the cert and reloads Nginx/Apache automatically.
          </Step>
          <Note type="info">The agent reports CPU, RAM, and disk usage back to SSLVault. View live health stats in <strong>Servers &amp; agents</strong> — each server card shows health bars and the certificates it protects.</Note>
          <Step n={5} title="Auto-renewal via agent">
            When a cert is within 30 days of expiry and auto-renew is enabled, SSLVault issues a new cert and dispatches a renew job to the agent automatically. Zero manual steps.
          </Step>
        </Section>

        {/* ── SECTION 3 — CPANEL ── */}
        <Divider label="03 · cPanel" title="Shared hosting — no SSH, no agent" />
        <Section anchor="shared-hosting" title="cPanel / shared hosting install" subtitle="Install via cPanel UAPI — no SSH or agent required" icon={Cloud}>
          <Step n={1} title="Get your cPanel API token">
            In cPanel → Security → Manage API Tokens → Create token. Give it a name like <code>SSLVault</code>.
          </Step>
          <Step n={2} title="Enter credentials in SSLVault">
            In Inventory, click Install on the cert row → select <strong>cPanel</strong> tab → enter your hostname, username, and API token.
          </Step>
          <Step n={3} title="SSLVault installs the certificate">
            SSLVault calls cPanel's UAPI to install the certificate and private key directly. No SSH access required.
          </Step>
          <Note type="tip">cPanel installations also auto-renew. SSLVault re-issues the cert and re-installs via UAPI on the renewal date.</Note>
        </Section>

        {/* ── SECTION 4 — AUTO-RENEWAL ── */}
        <Divider label="04 · Renewal" title="Auto-renewal — set and forget" />
        <Section anchor="auto-renewal" title="Auto-renewal" subtitle="Enable once, renew forever with zero manual steps" icon={RefreshCw}>
          <Step n={1} title="Enable auto-renew on a certificate">
            In Inventory, expand a cert row. Toggle <strong>Auto-renew</strong> to ON. SSLVault will automatically renew 30 days before expiry.
          </Step>
          <Step n={2} title="Requirements">
            For fully automatic renewal: DNS provider connected (for auto-DCV) + agent installed (for auto-install) or cPanel credentials saved. Without these, SSLVault renews the cert but you install manually.
          </Step>
          <Step n={3} title="Renewal notifications">
            SSLVault sends email alerts at 30, 14, and 7 days before expiry. After renewal, you receive a confirmation email with the new expiry date.
          </Step>
          <Note type="info">The <strong>Renewal Calendar</strong> in the Intelligence section shows a GitHub-style heatmap of all upcoming renewals. Red = expiring soon, green = healthy.</Note>
        </Section>

        {/* ── SECTION 5 — DNS PROVIDERS ── */}
        <Divider label="05 · DNS" title="DNS providers — automatic DCV" />
        <Section anchor="dns-providers" title="Connect a DNS provider" subtitle="Cloudflare, Vercel, Route53, Namecheap, GoDaddy and more" icon={Network}>
          <Step n={1} title="Go to DNS Providers">
            Navigate to <strong>Automation → DNS Providers</strong>. Click <strong>Add provider</strong> and select your DNS host.
          </Step>
          <Step n={2} title="Enter API credentials">
            <table className="v2-table"><tbody>
              <tr><td style={{ fontWeight: 600, width: 120 }}>Cloudflare</td><td>API Token with Zone:DNS:Edit permission for your domain.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Vercel</td><td>Vercel API token from Settings → Tokens.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Route53</td><td>AWS Access Key ID + Secret with Route53 write permission.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Namecheap</td><td>API key from Namecheap dashboard + whitelist your IP.</td></tr>
            </tbody></table>
          </Step>
          <Step n={3} title="How it works">
            When issuing or renewing, SSLVault uses your DNS provider API to automatically add the CNAME/TXT validation record, waits for propagation, completes DCV, then cleans up the record. Fully automatic.
          </Step>
          <Note type="tip">You can connect multiple DNS providers for different domains. SSLVault matches each domain to the right provider automatically.</Note>
        </Section>

        {/* ── SECTION 6 — KEYLOCKER ── */}
        <Divider label="06 · Security" title="KeyLocker — encrypted private key vault" />
        <Section anchor="keylocker" title="KeyLocker" subtitle="AES-256-GCM envelope encryption — keys never stored in plaintext" icon={Lock}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            KeyLocker automatically stores the private key for every certificate issued through SSLVault. Keys are encrypted with AES-256-GCM before storage using envelope encryption (DEK wrapped with KEK). Keys are never stored or transmitted in plaintext.
          </p>
          <Step n={1} title="Reveal a private key">
            In <strong>Security → KeyLocker</strong>, click <strong>Reveal key</strong>. You'll be asked to re-enter your SSLVault password (re-authentication). After verification, the key is decrypted and shown masked for 30 seconds. Copy-only — you cannot download directly.
          </Step>
          <Step n={2} title="Rotate a key">
            Click <strong>Rotate key</strong> to generate a new certificate and private key. The old key is archived for 30 days (rollback window) then permanently destroyed. Zero downtime — new cert installs before old key is archived.
          </Step>
          <Step n={3} title="Audit log">
            Every key access (reveal, copy, rotate, archive) is logged with timestamp and user. Export as CSV from the Audit Log tab for SOC 2 or ISO 27001 compliance.
          </Step>
          <Note type="warning">The 30-second reveal window and copy-only design are intentional security controls. Every access is logged and cannot be disabled.</Note>
        </Section>

        {/* ── SECTION 7 — 47-DAY READINESS ── */}
        <Divider label="07 · Compliance" title="47-day readiness — CA/B Forum 2026–2029" />
        <Section anchor="readiness" title="47-Day Readiness Dashboard" subtitle="Prepare for CA/B Forum maximum validity changes" icon={CalendarDays}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            The CA/B Forum is reducing maximum certificate validity in three phases. SSLVault's Readiness Dashboard scores each certificate against these milestones and shows exactly what needs to change.
          </p>
          <table className="v2-table"><tbody>
            <tr><td style={{ fontWeight: 600, width: 120 }}>Mar 15, 2026</td><td>Maximum 200-day validity. Certificates issued with longer validity will break.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Mar 15, 2027</td><td>Maximum 100-day validity.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Mar 15, 2029</td><td>Maximum 47-day validity. Full automation required.</td></tr>
          </tbody></table>
          <Step n={1} title="Check your fleet readiness">
            Navigate to <strong>Security → 47-Day Readiness</strong>. Each cert gets a score 0–100 and a label (Ready / At Risk / Will Break). Click any row to expand the full checklist.
          </Step>
          <Step n={2} title="Automation checklist">
            Each cert is checked for: auto-renew enabled, DNS provider connected, agent/cPanel install configured, validity within 200-day rule, and private key stored in KeyLocker.
          </Step>
          <Note type="warning">Certificates with validity over 200 days issued after March 15, 2026 will be rejected by browsers. Review your fleet now.</Note>
        </Section>

        {/* ── SECTION 8 — CA INTELLIGENCE ── */}
        <Divider label="08 · Intelligence" title="CA Intelligence — cross-CA visibility" />
        <Section anchor="ca-intelligence" title="CA Intelligence Hub" subtitle="Unified inventory across RapidSSL, DigiCert, Sectigo + shadow IT detection" icon={ShieldCheck}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            If your organisation uses multiple CAs, CA Intelligence gives you a single pane of glass across all of them. Connect DigiCert CertCentral or Sectigo SCM to sync your certificate inventory into SSLVault.
          </p>
          <Step n={1} title="Connect DigiCert">
            Go to <strong>Intelligence → CA Intelligence → CA Connectors</strong>. Select DigiCert, paste your CertCentral API key, click Test Connection then Connect. SSLVault syncs your full order history.
          </Step>
          <Step n={2} title="Connect Sectigo">
            Select Sectigo, enter your Customer URI, login, and password. Click Test Connection then Connect.
          </Step>
          <Step n={3} title="Shadow IT detection">
            SSLVault scans CT logs for certificates issued for your domains by unknown CAs. These appear in <strong>Shadow IT</strong> tab. Approve known certs or dismiss false positives.
          </Step>
          <Step n={4} title="Policy engine">
            Set fleet-wide rules: max validity 200 days, auto-renew required, KeyLocker required. SSLVault scans your entire fleet and flags violations.
          </Step>
        </Section>

        {/* ── SECTION 9 — SSL HEALTH SCORE ── */}
        <Divider label="09 · Health" title="SSL Health Score — grade A to F" />
        <Section anchor="ssl-health" title="SSL Health Score" subtitle="TLS reachability, HSTS, CAA records, expiry — graded A+ to F" icon={Activity}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            Navigate to <strong>Security → Health Scores</strong>. Enter any domain and click Scan. SSLVault checks TLS reachability, HSTS header presence and max-age, CAA DNS record, expiry, and security headers.
          </p>
          <table className="v2-table"><tbody>
            <tr><td style={{ fontWeight: 600, width: 80 }}>A+ / A</td><td>90–100 pts. TLS valid, HSTS with long max-age, CAA record present, expiry &gt;30 days.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>B</td><td>70–89 pts. Good but missing HSTS or CAA.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>C / D</td><td>50–69 pts. Expiring soon or missing security headers.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>F</td><td>Under 50 pts. Certificate expired, TLS unreachable, or no cert found.</td></tr>
          </tbody></table>
          <Note type="tip">Scores are pulled from crt.sh (CT logs) for real issuer and expiry data, then supplemented with live HTTP header checks.</Note>
        </Section>

        {/* ── SECTION 10 — CT DISCOVERY ── */}
        <Divider label="10 · Discovery" title="CT log discovery" />
        <Section anchor="ct-discovery" title="CT Log Discovery" subtitle="Find every certificate ever issued for your domains" icon={Search}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            Navigate to <strong>Inventory → Discovery</strong>. Three scan modes:
          </p>
          <table className="v2-table"><tbody>
            <tr><td style={{ fontWeight: 600, width: 140 }}>CT Logs</td><td>Queries crt.sh for all certificates ever issued for a domain. Shows issuer, expiry, SANs.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Connect DNS</td><td>Scans all DNS records for a domain and checks TLS on each hostname found.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Scan a Server</td><td>Enter an IP/hostname and port — connects directly to check the served certificate.</td></tr>
          </tbody></table>
        </Section>

        {/* ── SECTION 11 — CT ABUSE MONITOR ── */}
        <Divider label="11 · Security" title="CT Abuse Monitor" />
        <Section anchor="ct-abuse" title="CT Abuse Monitor" subtitle="Detect suspicious or fraudulent certificates in CT logs" icon={Eye}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            Navigate to <strong>Security → CT Abuse Monitor</strong>. SSLVault watches CT logs for new certificates issued for your watched domains. Any certificate not issued by you triggers a Flagged alert.
          </p>
          <Step n={1} title="Add a domain to watch">
            Click <strong>Add domain</strong> in the Watched domains panel. SSLVault starts monitoring CT logs for any new certificate issuance for that domain.
          </Step>
          <Step n={2} title="Reviewing alerts">
            Flagged certs appear at the top with details — issuer, issue date, SANs, and CT source. You can mark them as Known (legitimate) or Suspicious (possible abuse).
          </Step>
          <Note type="warning">If you see a certificate issued by an unknown CA for your domain, it may indicate domain hijacking or a misconfigured CAA record. Review immediately.</Note>
        </Section>

        {/* ── SECTION 12 — RENEWAL CALENDAR ── */}
        <Divider label="12 · Calendar" title="Renewal Calendar" />
        <Section anchor="renewal-calendar" title="Renewal Calendar" subtitle="GitHub heatmap of all your upcoming renewals" icon={CalendarDays}>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.7 }}>
            Navigate to <strong>Intelligence → Renewal Calendar</strong>. Certificates are shown as coloured day cells across month, week, or year views.
          </p>
          <table className="v2-table"><tbody>
            <tr><td style={{ fontWeight: 600, width: 80 }}>Red</td><td>Expiring within 7 days — urgent action required.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Amber</td><td>Expiring within 30 days — renewal recommended.</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Green</td><td>Healthy — more than 30 days remaining.</td></tr>
          </tbody></table>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginTop: 12, lineHeight: 1.7 }}>
            The <strong>Upcoming renewals strip</strong> below the calendar shows the next 90 days as progress bars, giving you a quick overview of what's coming up.
          </p>
        </Section>

        {/* ── SECTION 13 — TROUBLESHOOTING ── */}
        <Divider label="13 · Help" title="Troubleshooting" />
        <Section anchor="troubleshooting" title="Troubleshooting" subtitle="Common errors and how to fix them" icon={Bug}>
          <Section title="Agent not appearing after install" subtitle="Firewall or token issue" icon={Server}>
            <p>Check the agent log: <code>sudo journalctl -u sslvault-agent -n 50</code></p>
            <p>Common causes: firewall blocking outbound HTTPS to <code>easysecurity.in</code>, or install token expired (tokens are 1-hour TTL — generate a fresh one from Servers &amp; agents).</p>
          </Section>
          <Section title="DCV failing — CNAME not found" subtitle="DNS propagation delay" icon={Network}>
            <p>DNS changes can take up to 48 hours to propagate globally. Wait 10–15 minutes after adding the record, then retry. Use <code>dig CNAME _your-validation-record.yourdomain.com</code> to verify the record is live.</p>
            <Note type="tip">Connecting a DNS provider (Cloudflare, Vercel) eliminates this issue — SSLVault adds and verifies the record automatically.</Note>
          </Section>
          <Section title="Certificate issued but HTTPS not working" subtitle="Cert installed, server not reloaded" icon={Globe}>
            <p>The cert files are always written to disk even if the web server config update fails. Check if Nginx/Apache was reloaded: <code>sudo systemctl status nginx</code>. If the config test failed, the agent restores the original config — check <code>sudo nginx -t</code> for syntax errors.</p>
          </Section>
          <Section title="Rotate failing — Let's Encrypt rate limit" subtitle="5 certificates per domain per week" icon={RefreshCw}>
            <p>Let's Encrypt limits to 5 certificates per registered domain per week. If you've issued/renewed multiple times, wait until the rate limit window resets (check <code>crt.sh</code> for recent issuances).</p>
          </Section>
          <Section title="KeyLocker reveal — password not accepted" subtitle="Re-authentication required" icon={Lock}>
            <p>KeyLocker requires your current SSLVault account password. If you've recently reset your password, use the new one. After 3 failed attempts, the reveal is locked — wait 15 minutes before retrying.</p>
          </Section>
        </Section>

        {/* Footer CTA */}
        <div style={{ marginTop: 32, padding: '20px 24px', background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 4 }}>Still stuck?</div>
            <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>Contact support — we reply within 24 hours.</div>
          </div>
          <button onClick={() => nav('/contact')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
              background: 'var(--v2-green)', color: 'white', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Contact support <ArrowRight size={13} />
          </button>
        </div>

      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )
}
