import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Shield, ArrowRight, Copy, Check,
  ExternalLink, Cloud, AlertCircle, CheckCircle, Trash2, Globe
} from 'lucide-react'
import '../styles/design-v2.css'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} className={`v2-btn ${ok ? '' : ''}`} style={{ fontSize:12 }}>
      {ok ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
    </button>
  )
}

function Note({ type = 'info', children }) {
  const v = type === 'warn' ? 'warning' : type === 'success' ? 'tip' : type === 'error' ? 'error' : 'info'
  return <div className={`v2-callout ${v}`} style={{ marginBottom: 10 }}>{children}</div>
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

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`v2-accordion ${open ? 'open' : ''}`} style={{ marginBottom: 6 }}>
      <button className="v2-accordion-head" onClick={() => setOpen(o => !o)}>
        <span className="v2-accordion-title" style={{ flex: 1 }}>{q}</span>
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>
      {open && <div className="v2-accordion-body" style={{ paddingTop: 10 }}><p style={{ margin: 0, fontSize:13, lineHeight: 1.7, color: '#e8e0d8' }}>{a}</p></div>}
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
      <h2 style={{ fontSize:16, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.2px', margin: 0 }}>{title}</h2>
    </div>
  )
}

function TerminalMock({ lines }) {
  return (
    <div className="v2-code" style={{ marginBottom: 12 }}>
      <div className="v2-code-head">
        <div className="v2-code-dots">
          <span style={{ background: '#f87171' }}/><span style={{ background:'#0d0000' }}/><span style={{ background:'#0d0000' }}/>
          <span style={{ marginLeft: 8, fontSize:10, color: '#b0a8a0', fontFamily: 'JetBrains Mono, monospace', background: 'transparent', borderRadius: 0, width: 'auto', height: 'auto', display: 'inline' }}>browser output</span>
        </div>
      </div>
      <pre>{lines.join('\n')}</pre>
    </div>
  )
}

export default function SharedHostingGuide({ nav }) {
  const isMobile = useIsMobile()
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 800 }}>

        {/* HERO */}
        <div style={{ padding: '8px 0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span className="v2-badge v2-badge-green">No SSH needed</span>
            <span className="v2-badge">cPanel</span>
          </div>
          <h1 className="v2-h1" style={{ fontSize:26, letterSpacing: '-0.5px' }}>
            Install SSL on Shared Hosting — cPanel Guide
          </h1>
          <p className="v2-subtitle" style={{ fontSize:13, marginTop: 6, maxWidth: 560 }}>
            Works with GoDaddy, Bluehost, Hostinger, SiteGround, Hostgator, and any cPanel host.
            No terminal, no SSH, no technical knowledge required.
          </p>
        </div>

        {/* WHAT YOU NEED */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 24 }}>
          {[
            ['Required', 'Domain name (e.g. mysite.com)', true],
            ['Required', 'cPanel hosting account', true],
            ['Required', 'SSLVault account (free)', true],
            ['Required', 'cPanel username + API token', true],
            ['Not needed', 'SSH or terminal access', false],
            ['Not needed', 'Technical knowledge', false],
          ].map(([badge, text, good]) => (
            <div key={text} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {good
                ? <CheckCircle size={13} style={{ color: 'var(--v2-green)', flexShrink: 0, marginTop: 2 }}/>
                : <AlertCircle size={13} style={{ color: '#b0a8a0', flexShrink: 0, marginTop: 2 }}/>}
              <div>
                <div style={{ fontSize:10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: good ? 'var(--v2-green)' : 'var(--v2-text-3)', marginBottom: 2 }}>{badge}</div>
                <div style={{ fontSize:12, color: '#e8e0d8', lineHeight: 1.55 }}>{text}</div>
              </div>
            </div>
          ))}
        </div>

        <Divider label="STEP BY STEP" title="Complete installation guide" />

        <Step n={1} title="Issue your SSL certificate in SSLVault">
          <p>Click <strong>Issue Certificate</strong> in the navigation. Enter your domain name (e.g. <span className="v2-kbd">mysite.com</span>) and complete DNS validation. Your certificate appears in <strong>Dashboard</strong> once issued.</p>
          <Note type="info">Already have a certificate issued? Jump to Step 2.</Note>
          <button className="v2-btn v2-btn-primary" style={{ fontSize:12 }} onClick={() => nav('/buy')}>
            <Shield size={12}/> Issue Certificate <ArrowRight size={12}/>
          </button>
        </Step>

        <Step n={2} title="Dashboard → expand cert row → Install → cPanel">
          <p>In <strong>Dashboard</strong>, click your domain row to expand it. Click the <strong>Install</strong> button. In the modal, choose <strong>cPanel / Shared Hosting</strong>.</p>
          <div className="v2-card v2-card-pad" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Globe size={18} strokeWidth={1.5} style={{ color: '#e8e0d8' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize:13, color: '#ffffff', marginBottom: 6 }}>mysite.com</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="v2-btn" style={{ fontSize:11, padding: '3px 10px' }}>Renewal Schedule</button>
                  <button className="v2-btn v2-btn-primary" style={{ fontSize:11, padding: '3px 10px', cursor: 'default' }}>Install</button>
                </div>
              </div>
            </div>
          </div>
          <Note type="tip">In the Install modal, choose the <strong>cPanel / Shared Hosting</strong> card — not the VPS card.</Note>
        </Step>

        <Step n={3} title="Enter your cPanel credentials">
          <p>Enter your <strong>cPanel username</strong> and <strong>API token</strong>. Credentials are saved encrypted for future installs.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <div className="v2-card v2-card-pad">
              <div style={{ fontWeight: 600, fontSize:12, color: '#ffffff', marginBottom: 3 }}>Finding your cPanel username</div>
              <p style={{ fontSize:12, color: '#e8e0d8', margin: 0, lineHeight: 1.6 }}>Your short login name (not email). Find it in your hosting welcome email or at the top-right corner of cPanel when logged in.</p>
            </div>
            <div className="v2-card v2-card-pad">
              <div style={{ fontWeight: 600, fontSize:12, color: '#ffffff', marginBottom: 3 }}>Creating a cPanel API token</div>
              <p style={{ fontSize:12, color: '#e8e0d8', margin: 0, lineHeight: 1.6 }}>cPanel → search <strong>API Tokens</strong> → Manage API Tokens → Create token → enable SSL permissions → copy the token.</p>
            </div>
          </div>
          <Note type="warn">Create a cPanel API token — do not use your cPanel password. Tokens can be revoked independently.</Note>
        </Step>

        <Step n={4} title="Download the PHP agent file">
          <p>Click <strong>Download PHP Agent</strong>. A file named <code className="v2-kbd">sslvault-agent.php</code> downloads to your computer. This file has your unique install token pre-embedded — it knows which certificate to install for which domain.</p>
          <Note type="warn">Do not share this file. It contains your unique install token. Delete it immediately after use (Step 7).</Note>
        </Step>

        <Step n={5} title="Upload the PHP file via cPanel File Manager">
          <p>Login to your hosting cPanel and open <strong>File Manager</strong>.</p>
          <div className="v2-code" style={{ marginBottom: 10 }}>
            <div className="v2-code-head">
              <div className="v2-code-dots">
                <span style={{ background: '#f87171' }}/><span style={{ background:'#0d0000' }}/><span style={{ background:'#0d0000' }}/>
                <span style={{ marginLeft: 8, fontSize:10, color: '#b0a8a0', fontFamily: 'JetBrains Mono, monospace', background: 'transparent', borderRadius: 0, width: 'auto', height: 'auto', display: 'inline' }}>File Manager — public_html</span>
              </div>
            </div>
            <pre>{`/home/youraccount/public_html/
├── index.html
├── wp-content/
├── sslvault-agent.php  ← upload here
└── wp-config.php`}</pre>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {[
              'In cPanel, open File Manager',
              'Navigate to public_html (or www, or your website root folder)',
              'Click Upload in the toolbar',
              'Select sslvault-agent.php from your computer',
              'Wait for the upload to complete',
            ].map((t, i) => (
              <div key={i} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 14px' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background:'#2a6b5c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize:12, color: '#e8e0d8' }}>{t}</span>
              </div>
            ))}
          </div>
          <Note type="info">The website root is usually called <strong>public_html</strong>. It contains your website files (index.html, wp-config.php, etc.).</Note>
        </Step>

        <Step n={6} title="Visit the agent URL to activate">
          <p>Open a new browser tab and go to:</p>
          <div className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <code className="v2-mono" style={{ fontSize:13, color: 'var(--v2-green)', fontWeight: 600 }}>https://yourdomain.com/sslvault-agent.php</code>
            <CopyBtn text="https://yourdomain.com/sslvault-agent.php"/>
          </div>
          <Note type="warn">Replace <strong>yourdomain.com</strong> with your actual domain.</Note>
          <p style={{ fontSize:13, color: '#e8e0d8', lineHeight: 1.7, marginBottom: 10 }}>The page runs automatically and shows progress:</p>
          <TerminalMock lines={[
            'SSLVault Certificate Installer',
            '',
            '✓  Step 1: Connected to SSLVault — token validated',
            '✓  Step 2: Certificate downloaded — domain: yourdomain.com',
            '✓  Step 3: Certificate files saved — /home/account/ssl/',
            '✓  Step 4: Certificate verified — expires: 2027-05-17',
            '✓  Step 5: HTTPS redirect configured — .htaccess updated',
            '✓  Step 6: Dashboard updated — installation reported',
          ]}/>
        </Step>

        <Step n={7} title="Install certificate in cPanel SSL Manager">
          <p>The PHP agent saves your certificate files on the server. Now paste them into cPanel's SSL Manager:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {[
              'In cPanel, search for SSL/TLS in the search box',
              'Click SSL/TLS → Manage SSL Sites',
              'Select your domain from the dropdown',
              'Click Install an SSL Certificate',
              'Open File Manager → navigate to the path shown by the agent → right-click fullchain.pem → View/Edit → copy all content',
              'Paste into the Certificate (CRT) box',
              'Same for key.pem → paste into Private Key (KEY) box',
              'Leave CA Bundle empty',
              'Click Install Certificate',
            ].map((t, i) => (
              <div key={i} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 14px' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background:'#2a6b5c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize:11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <span style={{ fontSize:12, color: '#e8e0d8', lineHeight: 1.6 }}>{t}</span>
              </div>
            ))}
          </div>
          <Note type="success">After clicking Install Certificate, your site is live on HTTPS immediately. Green padlock confirmed.</Note>
        </Step>

        <Step n={8} title="Delete the PHP agent file — important">
          <div className="v2-callout warning" style={{ marginBottom: 12 }}>
            <AlertCircle size={13} style={{ color: '#ffffff' }}/> Delete <code className="v2-kbd">sslvault-agent.php</code> immediately after installation. It contains your install token.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Go to cPanel File Manager', 'Navigate to public_html', 'Find sslvault-agent.php', 'Right-click → Delete → Confirm'].map((t, i) => (
              <div key={i} className="v2-card v2-card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 14px', background: 'rgba(42,107,92,0.09)', border: '0.5px solid #fecaca' }}>
                <Trash2 size={12} style={{ color: '#f87171', flexShrink: 0 }}/>
                <span style={{ fontSize:12, color: '#e8e0d8' }}>{t}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step n={9} title="Verify your SSL is working">
          <p>Test with these free tools:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              ['SSL Labs', 'https://www.ssllabs.com/ssltest/'],
              ['SSL Checker', 'https://www.sslshopper.com/ssl-checker.html'],
              ['Why No Padlock', 'https://www.whynopadlock.com/'],
            ].map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="v2-btn" style={{ textDecoration: 'none', fontSize:12 }}>
                <ExternalLink size={11}/> {name}
              </a>
            ))}
          </div>
          <Note type="success">You should see a green padlock when visiting <strong>https://yourdomain.com</strong>.</Note>
        </Step>

        {/* PROVIDER LOCATIONS */}
        <Divider label="PROVIDERS" title="Where to find cPanel at popular hosts" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 24 }}>
          {[
            ['GoDaddy', 'My Products → Web Hosting → Manage → cPanel Admin'],
            ['Bluehost', 'Hosting → cPanel → scroll to Security section'],
            ['Hostinger', 'Hosting → Manage → File Manager, or yourdomain.com/cpanel'],
            ['Hostgator', 'Hosting → Manage → cPanel'],
            ['SiteGround', 'Websites → Site Tools → Security → SSL Manager'],
            ['Namecheap', 'cPanel Hosting → Go to cPanel'],
          ].map(([name, path]) => (
            <div key={name} className="v2-card v2-card-pad">
              <div style={{ fontWeight: 600, fontSize:12, color: '#ffffff', marginBottom: 4 }}>{name}</div>
              <p style={{ fontSize:11, color: '#e8e0d8', lineHeight: 1.6, margin: 0 }}>{path}</p>
            </div>
          ))}
        </div>

        {/* RENEWAL NOTE */}
        <div className="v2-callout warning" style={{ marginBottom: 24 }}>
          <AlertCircle size={13} style={{ color: '#ffffff', flexShrink: 0 }}/>
          <div>
            <span className="v2-callout-title">Renewal requires repeating this process</span><br/>
            <span style={{ fontSize:12 }}>Every time your certificate renews, you'll need to repeat steps 1–9. For zero-touch auto-renewal, move to a VPS with the persistent agent — it handles installs and renewals automatically.</span>
          </div>
        </div>

        {/* FAQ */}
        <Divider label="FAQ" title="Frequently asked questions" />
        <FAQ q="The agent page shows an error — what do I do?"
             a="Most common: install token expired (tokens last 1 hour). Go back to Dashboard → expand cert → Install → cPanel → download a fresh PHP file. Also check that you uploaded to the correct folder (public_html) and that your domain points to this hosting account." />
        <FAQ q="I can't find SSL/TLS in my cPanel"
             a="Use the search box at the top of cPanel and type SSL. If it doesn't appear, your hosting plan may not support custom SSL — contact your host's support." />
        <FAQ q="The agent ran successfully but I still see 'Not Secure'"
             a="You need to complete Step 7 — installing the certificate in cPanel SSL Manager. The PHP agent saves the files to the server, but cPanel must be told to use them." />
        <FAQ q="Where are my certificate files saved on the server?"
             a="The agent shows the exact path after running — usually /home/youraccount/ssl/ or similar. You can find the files in cPanel File Manager." />
        <FAQ q="Is it safe to upload a PHP file to my website?"
             a="The agent file only runs when you visit its URL, installs your certificate, and reports back. It creates no backdoors and doesn't stay active. Always delete it immediately after use." />
        <FAQ q="My host uses Plesk instead of cPanel — does this work?"
             a="Yes. The PHP agent saves files the same way. For Plesk installation: Websites and Domains → your domain → SSL/TLS Certificates → Add SSL/TLS Certificate → paste fullchain.pem and key.pem → Upload → Hosting Settings → assign the certificate." />

        {/* CTA */}
        <div className="v2-card" style={{ marginTop: 32, padding: 28, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background:'#2a6b5c',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Shield size={18} color="white" strokeWidth={2}/>
          </div>
          <h3 style={{ fontSize:17, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>
            Ready to secure your website?
          </h3>
          <p style={{ color: '#e8e0d8', fontSize:13, maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Issue your certificate first — takes under 2 minutes.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
              <Shield size={13}/> Issue Certificate <ArrowRight size={13}/>
            </button>
            <button className="v2-btn" onClick={() => nav('/dashboard')}>
              My Dashboard
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
