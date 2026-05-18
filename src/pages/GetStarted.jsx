import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Shield, ArrowRight, Server, Globe,
  Copy, Check, ExternalLink, Zap, Bot, Cloud, Network, RefreshCw
} from 'lucide-react'
import '../styles/design-v2.css'

function CopyBtn({ text, label }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} className={`v2-btn ${ok ? '' : 'v2-btn-primary'}`} style={{ fontSize: 12 }}>
      {ok ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> {label || 'Copy'}</>}
    </button>
  )
}

function Note({ type = 'info', children }) {
  const variant = type === 'warn' ? 'warning' : type === 'success' ? 'tip' : type === 'error' ? 'error' : 'info'
  return <div className={`v2-callout ${variant}`} style={{ marginBottom: 10 }}>{children}</div>
}

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

function Accordion({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`v2-accordion ${open ? 'open' : ''}`} style={{ marginBottom: 8 }}>
      <button className="v2-accordion-head" onClick={() => setOpen(o => !o)}>
        <span style={{ flex: 1 }}>
          <div className="v2-accordion-title">{title}</div>
          {subtitle && <div className="v2-accordion-subtitle">{subtitle}</div>}
        </span>
        <ChevronDown size={14} strokeWidth={1.8} className="v2-accordion-chev" />
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
        <span className="v2-accordion-title" style={{ flex: 1 }}>{q}</span>
        {open ? <ChevronUp size={14} strokeWidth={1.8}/> : <ChevronDown size={14} strokeWidth={1.8}/>}
      </button>
      {open && <div className="v2-accordion-body" style={{ paddingTop: 10 }}><p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--v2-text-2)' }}>{a}</p></div>}
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
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--v2-text)', letterSpacing: '-0.2px', margin: 0 }}>{title}</h2>
    </div>
  )
}

export default function GetStarted({ nav }) {
  const [path, setPath] = useState(null)

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 820 }}>

        {/* HERO */}
        <div style={{ padding: '8px 0 28px' }}>
          <h1 className="v2-h1" style={{ fontSize: 28, letterSpacing: '-0.5px' }}>SSL Certificates — Plain English Guide</h1>
          <p className="v2-subtitle" style={{ fontSize: 14, marginTop: 6, maxWidth: 560 }}>
            New to SSL? Start here. What it is, why you need it, and how SSLVault gets you from zero to HTTPS in minutes.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13} strokeWidth={2.2}/> Issue Certificate <ArrowRight size={13}/>
            </button>
            <button className="v2-btn" onClick={() => nav('/dashboard')}>
              My Dashboard
            </button>
          </div>
        </div>

        {/* WHAT IS SSL */}
        <Divider label="BASICS" title="What is SSL?" />
        <div className="v2-card v2-card-pad" style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 14, color: 'var(--v2-text-2)', lineHeight: 1.8, marginBottom: 16 }}>
            SSL (Secure Sockets Layer) encrypts the connection between your website and your visitors.
            When it's active, your browser shows <strong>https://</strong> and a padlock. Without it — a red "Not Secure" warning.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--v2-r-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Without SSL (HTTP)</div>
              <p style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.65, margin: 0 }}>
                Red "Not Secure" warning. Visitor data exposed. Lower Google ranking. Payments blocked.
              </p>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--v2-r-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>With SSL (HTTPS)</div>
              <p style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.65, margin: 0 }}>
                Green padlock. All traffic encrypted. Trust signals for visitors and Google. Required for payments.
              </p>
            </div>
          </div>
          <Note type="info">
            The <strong>"s"</strong> in <strong>https://</strong> means SSL is active. SSLVault gives you that "s" — backed by globally trusted certificate authorities via GoGetSSL.
          </Note>
        </div>

        {/* DO I NEED IT */}
        <Divider label="ELIGIBILITY" title="Do you need SSL?" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {[
            ['Yes', 'You have a website', 'Any public website benefits from SSL — trust signals and SEO ranking.'],
            ['Yes', 'You run an online shop', 'SSL is mandatory for accepting payments online.'],
            ['Yes', 'You collect user data', 'Login pages, contact forms, email signups — all require SSL.'],
            ['Yes', 'You have a blog or portfolio', 'Google ranks HTTPS sites higher. More traffic, no extra cost.'],
            ['Maybe', 'Local or dev environment only', 'If no public traffic, SSL is optional — but still good practice.'],
          ].map(([badge, title, desc]) => (
            <div key={title} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span className={`v2-badge ${badge === 'Yes' ? 'v2-badge-green' : 'v2-badge-amber'}`} style={{ flexShrink: 0, marginTop: 2 }}>{badge}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CERTIFICATE TYPES */}
        <Divider label="CERT TYPES" title="Which certificate type do you need?" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginBottom: 8 }}>
          {[
            { type: 'DV (Domain Validated)', time: '~5 minutes', use: 'Blogs, APIs, personal sites, SaaS', color: 'var(--v2-green)' },
            { type: 'OV (Org Validated)', time: '1–3 business days', use: 'Business websites, portals', color: 'var(--v2-text-2)' },
            { type: 'EV (Extended Validation)', time: '2–7 business days', use: 'E-commerce, banks, high trust', color: 'var(--v2-text-2)' },
            { type: 'Wildcard DV', time: '~5 minutes', use: '*.yourdomain.com — all subdomains', color: 'var(--v2-green)' },
          ].map(({ type, time, use, color }) => (
            <div key={type} className="v2-card v2-card-pad">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 4 }}>{type}</div>
              <div style={{ fontSize: 11, color, marginBottom: 3, fontWeight: 500 }}>{time}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-3)', lineHeight: 1.55 }}>{use}</div>
            </div>
          ))}
        </div>
        <Note type="info">
          All certificates are issued via <strong>GoGetSSL</strong> — a trusted CA partner covering DigiCert, Sectigo, RapidSSL, GeoTrust, and Thawte chains. DV certificates are the most common — issued automatically in minutes via DNS validation.
        </Note>

        {/* CHOOSE YOUR PATH */}
        <Divider label="YOUR SITUATION" title="Choose your setup path" />
        <p style={{ fontSize: 13, color: 'var(--v2-text-2)', marginBottom: 14, lineHeight: 1.7 }}>Pick the one that matches your hosting setup:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {[
            { id: 'vps', icon: Server, title: 'VPS or cloud server (DigitalOcean, AWS, Hetzner, Linode)', desc: 'SSH access available. Install the persistent agent once — all future installs and renewals are fully automatic.', badge: 'Recommended' },
            { id: 'cpanel', icon: Cloud, title: 'Shared hosting with cPanel (GoDaddy, Bluehost, Hostinger, SiteGround)', desc: 'No SSH needed. Upload a PHP file and paste certificate files into cPanel SSL Manager.', badge: 'No SSH' },
            { id: 'platform', icon: Globe, title: 'Vercel, Netlify, or similar deployment platforms', desc: 'These platforms usually provision SSL automatically on custom domains. If you need a cert for a backend or external server, use SSLVault.', badge: 'Usually auto' },
            { id: 'domain', icon: Network, title: 'I just own a domain — no hosting yet', desc: "Generate your certificate now and have it ready. You'll install it once you set up hosting.", badge: 'Beginner' },
          ].map(p => (
            <div key={p.id}>
              <div className="v2-card v2-card-pad" style={{ cursor: 'pointer', border: path === p.id ? '1.5px solid var(--v2-border-strong)' : undefined }}
                   onClick={() => setPath(path === p.id ? null : p.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p.icon size={15} strokeWidth={1.8} style={{ color: 'var(--v2-text-2)', flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)' }}>{p.title}</span>
                      <span className="v2-badge v2-badge-green">{p.badge}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--v2-text-2)', margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
                  </div>
                  {path === p.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </div>
              </div>
              {path === p.id && (
                <div className="v2-card v2-card-pad" style={{ borderTop: 'none', borderRadius: '0 0 var(--v2-r-lg) var(--v2-r-lg)', background: 'var(--v2-surface-2)' }}>
                  {p.id === 'vps' && (
                    <>
                      <div className="v2-callout v2-callout-green" style={{ marginBottom: 12 }}>
                        <Zap size={13} style={{ color: 'var(--v2-green)', flexShrink: 0 }}/>
                        <div><span className="v2-callout-title">Fully automated with the persistent agent</span><br/>
                        <span style={{ fontSize: 12 }}>Install the agent once via SSH. All future certificate installs and auto-renewals happen automatically — zero touch.</span></div>
                      </div>
                      <Step n={1} title="Issue your certificate"><p>Click <strong>Issue Certificate</strong> in the nav. Enter your domain, select cert type, choose DNS validation provider (Cloudflare, GoDaddy, Vercel, DigitalOcean supported). Click Issue.</p></Step>
                      <Step n={2} title="Go to Dashboard → expand cert → Install"><p>Click the <strong>Install</strong> button on your certificate row. If no agent is connected, the modal shows a one-line install command.</p></Step>
                      <Step n={3} title="Run the agent install on your server (one time only)">
                        <div className="v2-code" style={{ marginBottom: 8 }}>
                          <div className="v2-code-head"><div className="v2-code-dots"><span style={{ background: '#ef4444' }}/><span style={{ background: '#f59e0b' }}/><span style={{ background: '#0e7fc0' }}/></div></div>
                          <pre>curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash</pre>
                        </div>
                        <p>The agent registers with SSLVault. Your server appears as Online in <strong>Dashboard → Servers</strong>.</p>
                      </Step>
                      <Step n={4} title="Dispatch the install"><p>Back in the Install modal, click <strong>Deploy</strong>. The agent writes certificate files, updates your Nginx/Apache config, tests it, and reloads — all automatically. Reports back within seconds.</p></Step>
                      <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')} style={{ marginTop: 8 }}>
                        <Shield size={13}/> Issue Certificate <ArrowRight size={13}/>
                      </button>
                    </>
                  )}
                  {p.id === 'cpanel' && (
                    <>
                      <Step n={1} title="Issue your certificate"><p>Click <strong>Issue Certificate</strong> in the nav. Enter your domain and complete DNS validation (manual or auto with a connected provider).</p></Step>
                      <Step n={2} title="Dashboard → expand cert → Install → cPanel"><p>In Dashboard, expand your cert row, click <strong>Install</strong>, choose <strong>cPanel / Shared Hosting</strong>. Enter your cPanel username and API token.</p></Step>
                      <Step n={3} title="Download and upload the PHP agent"><p>Click <strong>Download PHP Agent</strong>. Upload the file to your <code className="v2-kbd">public_html</code> directory via cPanel File Manager.</p></Step>
                      <Step n={4} title="Visit the agent URL to activate">
                        <div className="v2-code" style={{ marginBottom: 8 }}>
                          <div className="v2-code-head"><div className="v2-code-dots"><span style={{ background: '#ef4444' }}/><span style={{ background: '#f59e0b' }}/><span style={{ background: '#0e7fc0' }}/></div></div>
                          <pre>https://yourdomain.com/sslvault-agent.php</pre>
                        </div>
                        <p>The script installs your certificate via cPanel's UAPI. <strong>Delete the file immediately after.</strong></p>
                      </Step>
                      <button className="v2-btn v2-btn-primary" onClick={() => nav('/shared-hosting-guide')} style={{ marginTop: 8 }}>
                        Full cPanel Guide <ArrowRight size={13}/>
                      </button>
                    </>
                  )}
                  {p.id === 'platform' && (
                    <>
                      <div className="v2-callout tip" style={{ marginBottom: 12 }}>
                        <span className="v2-callout-title">Good news — Vercel and Netlify handle SSL automatically</span><br/>
                        <span style={{ fontSize: 12 }}>Just add your custom domain in their project settings and SSL is provisioned automatically.</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.7 }}>
                        If you have a <strong>backend server, API, or external domain</strong> that these platforms don't manage, issue a certificate via SSLVault and install it on that server using the persistent agent or manual steps.
                      </p>
                      <button className="v2-btn" onClick={() => nav('/buy')} style={{ marginTop: 4, fontSize: 12 }}>
                        Issue Certificate Anyway <ArrowRight size={13}/>
                      </button>
                    </>
                  )}
                  {p.id === 'domain' && (
                    <>
                      <Step n={1} title="Get hosting first">
                        <p>Choose a hosting provider. Beginner-friendly options: <a href="https://netlify.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--v2-green)' }}>Netlify</a> (free), <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--v2-green)' }}>Vercel</a> (free), Hostinger (~$2/mo). Most include free SSL automatically.</p>
                      </Step>
                      <Step n={2} title="Generate your certificate now"><p>You can issue your certificate now and have it ready. Come back to install it once hosting is set up.</p></Step>
                      <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')} style={{ marginTop: 4 }}>
                        <Shield size={13}/> Issue Certificate <ArrowRight size={13}/>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FULL WALKTHROUGH */}
        <Divider label="WALKTHROUGH" title="Complete beginner walkthrough — zero to HTTPS" />

        <Step n={1} title="Create your SSLVault account">
          <p>Click <strong>Sign In</strong> in the navigation. Enter your email and set a password. You'll receive a confirmation email — click the link to activate. Done.</p>
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 12, marginTop: 4 }} onClick={() => nav('/auth')}>
            Create Account <ArrowRight size={13}/>
          </button>
        </Step>

        <Step n={2} title="Issue your certificate">
          <p>Click <strong>Issue Certificate</strong> in the nav. Enter your domain (e.g. <span className="v2-kbd">example.com</span> or <span className="v2-kbd">*.example.com</span> for wildcard). Select certificate type and DNS validation method. Click <strong>Issue</strong>.</p>
          <Note type="tip">Connect a DNS provider under <strong>More → DNS Providers</strong> first — validation becomes fully automatic, no copy-pasting records.</Note>
        </Step>

        <Step n={3} title="Complete domain validation (DCV)">
          <p>SSLVault (via GoGetSSL) verifies you own the domain before issuing. Three methods:</p>
          <table className="v2-table" style={{ marginBottom: 10 }}>
            <tbody>
              <tr><td style={{ fontWeight: 600, width: 120 }}>DNS CNAME</td><td>Add a CNAME record — recommended. Auto-added if a DNS provider is connected.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>DNS TXT</td><td>Add a TXT record — similar, preferred by some registrars.</td></tr>
              <tr><td style={{ fontWeight: 600 }}>Email</td><td>Click a link sent to admin@, webmaster@, or hostmaster@ for your domain.</td></tr>
            </tbody>
          </table>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>TYPE</span><span style={{ color: '#3b82f6' }}>CNAME</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>NAME</span><span style={{ color: '#38bdf8' }}>_acme-challenge</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>VALUE</span><span style={{ color: '#fbbf24', wordBreak: 'break-all' }}>abc123def456.comodoca.com</span>
            </div>
          </div>
          <Note type="warn">In the Name field, enter <strong>only</strong> <code className="v2-kbd">_acme-challenge</code> — your DNS provider appends the domain automatically. Entering the full hostname will fail.</Note>
        </Step>

        <Step n={4} title="Certificate appears in Dashboard">
          <p>Once issued, your certificate row appears in <strong>Dashboard</strong> — click to expand and see expiry date, issuer details, full PEM files, and the Install button.</p>
        </Step>

        <Step n={5} title="Install on your server">
          <p>Click <strong>Install</strong>. Three paths:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
            {[
              { icon: Bot, label: 'Persistent Agent', desc: 'VPS — dispatches to your connected server automatically', color: 'var(--v2-green)' },
              { icon: Cloud, label: 'cPanel / Shared', desc: 'PHP agent install via cPanel UAPI — no SSH', color: 'var(--v2-text-2)' },
              { icon: Server, label: 'Manual', desc: 'Download PEM files and follow the server install guide', color: 'var(--v2-text-2)' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 10 }}>
                <Icon size={14} strokeWidth={1.8} style={{ color, flexShrink: 0, marginTop: 2 }}/>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--v2-text)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-2)', lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step n={6} title="Enable auto-renewal">
          <p>In <strong>Dashboard → Renewal Schedule</strong>, toggle <strong>Auto-Renew</strong> on for your certificate. SSLVault renews 30 days before expiry — automatically issues, validates (via DNS provider), and deploys (via agent). Your certificates never expire.</p>
          <Note type="tip">Auto-renewal works fully hands-free when you have both a DNS provider connected and a persistent agent installed.</Note>
        </Step>

        {/* GLOSSARY */}
        <Divider label="GLOSSARY" title="Common terms explained" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {[
            ['SSL / TLS', 'Both mean website encryption. TLS is the current standard; SSL is the legacy name. Used interchangeably.'],
            ['HTTPS', 'The secure version of HTTP. The "s" confirms SSL/TLS is active.'],
            ['DV / OV / EV', 'Validation levels. DV = domain ownership only (5 min). OV = organisation verified (1–3 days). EV = full legal verification (2–7 days).'],
            ['Certificate', 'A digital file proving your website\'s identity, issued by a trusted Certificate Authority (CA).'],
            ['Private Key', 'The secret counterpart to your certificate. Never share it. Permissions should always be 600.'],
            ['fullchain.pem', 'Your certificate including the full chain of trust. Use this on all server configs — not cert.pem alone.'],
            ['GoGetSSL', 'The CA reseller SSLVault uses to issue DV, OV, EV and Wildcard certificates from DigiCert, Sectigo, RapidSSL chains.'],
            ['DCV', 'Domain Control Validation — how the CA verifies you own a domain before issuing. Done via DNS CNAME, TXT record, or email.'],
            ['Wildcard', '*.example.com — covers all single-level subdomains with one certificate. Requires DNS-01 validation.'],
            ['Persistent Agent', 'SSLVault\'s bash daemon for Linux VPS servers. Polls every 5 minutes, auto-installs and auto-renews certificates.'],
            ['Auto-Renewal', 'SSLVault automatically reorders and redeploys certificates before expiry — no action needed from you.'],
          ].map(([term, def]) => (
            <div key={term} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 16 }}>
              <span className="v2-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v2-green)', minWidth: 160, flexShrink: 0 }}>{term}</span>
              <span style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.6 }}>{def}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <Divider label="FAQ" title="Frequently asked questions" />
        <FAQ q="Is SSLVault really free to use?"
             a="The SSLVault platform is free — agents, monitoring, DNS connectors, auto-renewal, CA connectors, CA intelligence. You pay only for certificates at GoGetSSL partner rates (from $8/yr for DV). No platform subscription required." />
        <FAQ q="How long does a certificate last?"
             a="Validity varies by type and CA. RapidSSL DV certificates have ~6-month cert validity with 1-year order subscriptions. SSLVault tracks both expiry dates separately and handles auto-reissue and auto-renewal automatically." />
        <FAQ q="Will my website go down during SSL installation?"
             a="No. Installing SSL doesn't affect uptime. The persistent agent tests config before reloading your web server — if the test fails, the original config is automatically restored." />
        <FAQ q="Can I use one wildcard for multiple subdomains?"
             a="Yes. *.example.com covers all single-level subdomains — www, blog, api, shop, etc. — with one certificate. Wildcards require DNS-01 validation (connect a DNS provider for automatic handling)." />
        <FAQ q="What happens when the certificate expires?"
             a="With auto-renewal enabled and a DNS provider connected, SSLVault renews automatically 30 days before expiry. If auto-renewal is off, you'll receive email alerts. Renew from Dashboard with one click." />
        <FAQ q="I'm on GoDaddy shared hosting — do I need the agent?"
             a="No. The persistent agent is for Linux VPS/cloud servers with SSH access. For cPanel shared hosting (GoDaddy, Bluehost, Hostinger), use the cPanel install path — no SSH or agent needed." />
        <FAQ q="Does SSLVault store my private keys?"
             a="Only if you opt in to KeyLocker. Keys are AES-256-GCM encrypted at rest with a full audit log. Every reveal is copy-only with a 30-second timed display. You can also generate keys server-side — SSLVault never sees them." />

        {/* CTA */}
        <div className="v2-card" style={{ marginTop: 32, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--v2-text)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Shield size={18} color="white" strokeWidth={2}/>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Ready to secure your domains?
          </h3>
          <p style={{ color: 'var(--v2-text-2)', fontSize: 13, maxWidth: 400, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Issue DV, OV, EV or Wildcard certificates via GoGetSSL. Auto-renew. Deploy with one command.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13} strokeWidth={2.2}/> Issue Certificate <ArrowRight size={13}/>
            </button>
            <button className="v2-btn" onClick={() => nav('/knowledge-base')}>
              Knowledge Base
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
