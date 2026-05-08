import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Shield, Copy, Check } from 'lucide-react'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:5, background:ok?'var(--green-light)':'var(--accent-light)', border:'1px solid '+(ok?'#86efac':'var(--accent-border)'), color:ok?'var(--green)':'var(--accent)', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
      {ok ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
    </button>
  )
}

function Step({ n, emoji, title, children }) {
  return (
    <div style={{ display:'flex', gap:18, marginBottom:36 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, boxShadow:'0 4px 14px rgba(37,99,235,0.3)', flexShrink:0 }}>{n}</div>
        <div style={{ width:2, flex:1, background:'var(--border)', margin:'8px 0', minHeight:20 }}/>
      </div>
      <div style={{ flex:1, paddingTop:8 }}>
        <div style={{ fontSize:22, marginBottom:6 }}>{emoji}</div>
        <h3 style={{ fontWeight:800, fontSize:17, marginBottom:10, color:'var(--text)' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function ScreenMock({ title, children }) {
  return (
    <div style={{ background:'#0f172a', borderRadius:12, overflow:'hidden', marginBottom:16, border:'1px solid #1e293b' }}>
      <div style={{ background:'#1e293b', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#ef4444' }}/>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#f59e0b' }}/>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#10b981' }}/>
        <span style={{ fontSize:12, color:'#475569', marginLeft:8 }}>{title}</span>
      </div>
      <div style={{ padding:'16px 18px' }}>{children}</div>
    </div>
  )
}

function TermLine({ color = '#e2e8f0', children }) {
  return <div style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.9, color }}>{children}</div>
}

function Note({ type, children }) {
  const s = { info:['var(--accent-light)','var(--accent-border)','ℹ️'], warn:['var(--yellow-light)','var(--yellow-border)','⚠️'], success:['var(--green-light)','#86efac','✅'], error:['var(--red-light)','var(--red-border)','❌'] }
  const [bg, border, icon] = s[type] || s.info
  return <div style={{ background:bg, border:'1px solid '+border, borderRadius:8, padding:'12px 16px', fontSize:13, marginBottom:12, lineHeight:1.7 }}>{icon} {children}</div>
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8 }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', cursor:'pointer', background:open?'var(--accent-light)':'white' }}>
        <span style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{q}</span>
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </div>
      {open && <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>{a}</div>}
    </div>
  )
}

export default function SharedHostingGuide({ nav }) {
  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'48px 0 100px' }}>
      <div className="container" style={{ maxWidth:780 }}>

        {/* Hero */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:20, padding:'40px 36px', marginBottom:40, color:'white' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.15)', borderRadius:100, padding:'5px 14px', fontSize:12, fontWeight:700, marginBottom:16 }}>
            🌐 SHARED HOSTING GUIDE
          </div>
          <h1 style={{ fontSize:32, fontWeight:900, color:'white', marginBottom:12, letterSpacing:'-0.5px', lineHeight:1.2 }}>
            Install SSL on cPanel Hosting<br/>Without SSH or Terminal
          </h1>
          <p style={{ color:'rgba(255,255,255,0.85)', fontSize:16, lineHeight:1.8, marginBottom:24 }}>
            Works with GoDaddy, Bluehost, Hostinger, Hostgator, SiteGround and any cPanel-based host. No technical knowledge required.
          </p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 }}>✅ No SSH needed</div>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 }}>✅ No terminal</div>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 }}>✅ Upload one file</div>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 16px', fontSize:13, fontWeight:600 }}>✅ Done in 5 mins</div>
          </div>
        </div>

        {/* What you need */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:28, marginBottom:32, boxShadow:'var(--shadow)' }}>
          <h2 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:'var(--text)' }}>📋 Before You Start</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              ['✅ Required', 'A domain name (e.g. mysite.com)', '#16a34a'],
              ['✅ Required', 'A cPanel hosting account', '#16a34a'],
              ['✅ Required', 'Free SSLVault account', '#16a34a'],
              ['✅ Required', 'Access to your cPanel File Manager', '#16a34a'],
              ['❌ Not needed', 'SSH or terminal access', '#dc2626'],
              ['❌ Not needed', 'Technical knowledge', '#dc2626'],
            ].map(([badge, text, color]) => (
              <div key={text} style={{ display:'flex', gap:10, padding:'10px 14px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color, fontWeight:700, flexShrink:0 }}>{badge}</span>
                <span style={{ color:'var(--text2)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step by step */}
        <h2 style={{ fontWeight:800, fontSize:22, marginBottom:28, color:'var(--text)' }}>
          Complete Step-by-Step Guide
        </h2>

        <Step n="1" emoji="🔐" title="Generate your free SSL certificate">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            First you need a certificate. Click <strong>Generate SSL</strong> in the navigation, enter your domain and complete DNS verification. Come back here once your certificate shows as <strong style={{ color:'var(--green)' }}>Active</strong> in My Certificates.
          </p>
          <Note type="info">Already have a certificate? Skip to Step 2.</Note>
          <button onClick={() => nav('/generate')} className="btn btn-primary btn-sm">
            <Shield size={13}/> Generate Free SSL →
          </button>
        </Step>

        <Step n="2" emoji="🖥️" title="Open My Certificates and click Install on Server">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            Go to <strong>My Certificates</strong>. Find your domain and click to expand the panel. You'll see the <strong style={{ color:'var(--accent)' }}>Install on Server</strong> button next to Request Renewal.
          </p>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, background:'var(--accent-light)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🌐</div>
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:3 }}>mysite.com</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }}>↻ Request Renewal</button>
                <button className="btn btn-sm" style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', color:'var(--accent)', fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'default' }}>🖥️ Install on Server</button>
              </div>
            </div>
          </div>
        </Step>

        <Step n="3" emoji="🌐" title='Select "Shared Hosting (cPanel)" option'>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            A modal will appear with two options. Click <strong>Shared Hosting</strong> (the right card with the 🌐 icon). This is for GoDaddy, Bluehost, Hostinger, and any cPanel host.
          </p>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:14, borderRadius:10, border:'2px solid var(--border)', background:'white', opacity:0.6 }}>
                <div style={{ fontSize:22, marginBottom:6 }}>🖥️</div>
                <div style={{ fontWeight:700, fontSize:12, color:'var(--text2)', marginBottom:3 }}>VPS / Cloud Server</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>SSH access required</div>
              </div>
              <div style={{ padding:14, borderRadius:10, border:'2px solid var(--accent)', background:'var(--accent-light)' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>🌐</div>
                <div style={{ fontWeight:700, fontSize:12, color:'var(--accent)', marginBottom:3 }}>Shared Hosting ← Select this</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>cPanel, GoDaddy, Bluehost</div>
              </div>
            </div>
          </div>
        </Step>

        <Step n="4" emoji="📥" title='Click "Download PHP Agent File"'>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            Click the green <strong>Download PHP Agent File</strong> button. A file called <code style={{ fontFamily:'monospace', background:'var(--bg2)', padding:'1px 6px', borderRadius:4 }}>sslvault-agent.php</code> will download to your computer. This file already has your unique token built in — it knows which certificate to install.
          </p>
          <Note type="warn">Do not share this file with anyone — it contains your unique install token.</Note>
        </Step>

        <Step n="5" emoji="📁" title="Upload the file using cPanel File Manager">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            Login to your hosting cPanel and open <strong>File Manager</strong>.
          </p>
          <ScreenMock title="cPanel File Manager">
            <TermLine color="#94a3b8">📁 /home/youraccount/public_html/</TermLine>
            <TermLine color="#e2e8f0">├── index.html</TermLine>
            <TermLine color="#e2e8f0">├── wp-content/</TermLine>
            <TermLine color="#34d399">├── sslvault-agent.php  ← Upload here</TermLine>
            <TermLine color="#e2e8f0">└── wp-config.php</TermLine>
          </ScreenMock>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {[
              ['1', 'In cPanel, click File Manager'],
              ['2', 'Navigate to public_html (or www, or your website root folder)'],
              ['3', 'Click Upload in the toolbar'],
              ['4', 'Select sslvault-agent.php from your computer'],
              ['5', 'Wait for upload to complete (it\'s a small file, takes seconds)'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', gap:12, padding:'10px 14px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)', fontSize:13, alignItems:'center' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{n}</div>
                <span style={{ color:'var(--text2)' }}>{t}</span>
              </div>
            ))}
          </div>
          <Note type="info">The website root folder is usually called <strong>public_html</strong>. It's the folder that contains your website files (index.html, wp-config.php, etc.)</Note>
        </Step>

        <Step n="6" emoji="🌐" title="Visit the agent URL in your browser">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            Open a new browser tab and go to:
          </p>
          <div style={{ background:'var(--bg)', border:'2px solid var(--accent-border)', borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <code style={{ fontFamily:'monospace', fontSize:14, color:'var(--accent)', fontWeight:600 }}>https://yourdomain.com/sslvault-agent.php</code>
            <CopyBtn text="https://yourdomain.com/sslvault-agent.php" />
          </div>
          <Note type="warn">Replace <strong>yourdomain.com</strong> with your actual domain name.</Note>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:12 }}>
            The page will run automatically and show you the progress:
          </p>
          <ScreenMock title="https://yourdomain.com/sslvault-agent.php">
            <TermLine color="#94a3b8">🔒 SSLVault Certificate Installer</TermLine>
            <div style={{ height:8 }}/>
            <TermLine color="#34d399">✅ Step 1: Connected to SSLVault — Token validated</TermLine>
            <TermLine color="#34d399">✅ Step 2: Certificate downloaded — Domain: yourdomain.com</TermLine>
            <TermLine color="#34d399">✅ Step 3: Certificate files saved — /home/account/ssl/</TermLine>
            <TermLine color="#34d399">✅ Step 4: Certificate verified — Expires: 2026-08-05</TermLine>
            <TermLine color="#34d399">✅ Step 5: HTTPS redirect configured — .htaccess updated</TermLine>
            <TermLine color="#34d399">✅ Step 6: Dashboard updated — Installation reported</TermLine>
          </ScreenMock>
        </Step>

        <Step n="7" emoji="📋" title="Install certificate in cPanel SSL Manager">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            The PHP agent saves your certificate files to the server and shows you the exact file paths. Now paste them into cPanel:
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {[
              ['1', 'In cPanel, search for SSL/TLS in the search box'],
              ['2', 'Click SSL/TLS → Manage SSL Sites'],
              ['3', 'Select your domain from the dropdown'],
              ['4', 'Click Install an SSL Certificate'],
              ['5', 'Open cPanel File Manager → navigate to the path shown by the agent → right-click fullchain.pem → View/Edit → copy all content'],
              ['6', 'Paste it into the Certificate (CRT) box'],
              ['7', 'Same for key.pem → paste into Private Key (KEY) box'],
              ['8', 'Leave CA Bundle empty'],
              ['9', 'Click Install Certificate'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', gap:12, padding:'10px 14px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)', fontSize:13, alignItems:'flex-start' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{n}</div>
                <span style={{ color:'var(--text2)', lineHeight:1.6 }}>{t}</span>
              </div>
            ))}
          </div>
          <Note type="success">After clicking Install Certificate, your site is immediately live on HTTPS with a green padlock! 🔒</Note>
        </Step>

        <Step n="8" emoji="🗑️" title="Delete the agent file (important!)">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            For security, delete <code style={{ fontFamily:'monospace', background:'var(--bg2)', padding:'1px 6px', borderRadius:4 }}>sslvault-agent.php</code> from your website after installation.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['1', 'Go to cPanel File Manager'],
              ['2', 'Navigate to public_html'],
              ['3', 'Find sslvault-agent.php'],
              ['4', 'Right-click → Delete → Confirm'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', gap:12, padding:'8px 14px', background:'var(--red-light)', borderRadius:8, border:'1px solid var(--red-border)', fontSize:13, alignItems:'center' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--red)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{n}</div>
                <span style={{ color:'var(--text2)' }}>{t}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step n="9" emoji="✅" title="Verify your SSL is working">
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:14 }}>
            Test your SSL installation with these free tools:
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
            {[
              ['SSL Labs Full Test', 'https://www.ssllabs.com/ssltest/'],
              ['Quick SSL Check', 'https://www.sslshopper.com/ssl-checker.html'],
              ['Mixed Content Check', 'https://www.whynopadlock.com/'],
            ].map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, textDecoration:'none', color:'var(--accent)', fontSize:13, fontWeight:600 }}>
                <ExternalLink size={12}/> {name}
              </a>
            ))}
          </div>
          <Note type="success">You should see a green padlock in your browser when visiting https://yourdomain.com</Note>
        </Step>

        {/* Provider specific guides */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:28, marginBottom:28, boxShadow:'var(--shadow)' }}>
          <h2 style={{ fontWeight:800, fontSize:20, marginBottom:20, color:'var(--text)' }}>🏢 Provider-Specific cPanel Locations</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              ['GoDaddy', 'Login → My Products → Web Hosting → Manage → cPanel Admin', '🟢'],
              ['Bluehost', 'Login → Hosting → cPanel → (scroll to Security section)', '🔵'],
              ['Hostinger', 'Login → Hosting → Manage → File Manager or go to yourdomain.com/cpanel', '🟣'],
              ['Hostgator', 'Login → Hosting → Manage → cPanel', '🟡'],
              ['SiteGround', 'Login → Websites → Site Tools → Security → SSL Manager', '🔴'],
              ['Namecheap', 'Login → cPanel Hosting → Go to cPanel', '🟠'],
            ].map(([name, path, icon]) => (
              <div key={name} style={{ background:'var(--bg)', borderRadius:10, padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{name}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{path}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <h2 style={{ fontWeight:800, fontSize:20, marginBottom:16, color:'var(--text)' }}>❓ Frequently Asked Questions</h2>

        <FAQ q="The agent page shows an error — what do I do?"
          a="Most common cause: token expired (tokens last 1 hour). Go back to My Certificates → Install on Server → Shared Hosting → Download a new PHP file. Also check that you uploaded the file to the correct folder (public_html) and that your domain is pointing to this hosting account." />

        <FAQ q="I don't see SSL/TLS in my cPanel — where is it?"
          a="Different cPanel themes show it differently. Use the search box at the top of cPanel and type SSL. It should appear. Alternatively look under the Security section. Some hosts hide it — contact their support if you cannot find it." />

        <FAQ q="The agent ran successfully but I still see 'Not Secure' in browser"
          a="You need to complete Step 7 — installing the certificate in cPanel SSL Manager. The PHP agent saves the files to the server but you still need to tell cPanel to use them. Follow Step 7 carefully." />

        <FAQ q="Where are my certificate files saved?"
          a="The agent shows the exact path after running. It's usually something like /home/youraccount/ssl/ or /home/youraccount/private/. You can find them in cPanel File Manager." />

        <FAQ q="Do I need to do this every time the certificate expires?"
          a="Yes, every 90 days. But it's quick — generate a new certificate in SSLVault, download a new agent file, upload and visit the URL, then paste the new files in cPanel SSL Manager. Takes about 3 minutes once you've done it once." />

        <FAQ q="Is it safe to upload a PHP file to my website?"
          a="The agent file only runs when you visit its URL, downloads your certificate, saves it, and reports back. It does not create backdoors or stay active. Always delete it immediately after use as instructed in Step 8." />

        <FAQ q="My hosting uses Plesk instead of cPanel — does this work?"
          a="Yes! The PHP agent works the same way for saving files. For installing in Plesk: Websites and Domains → your domain → SSL/TLS Certificates → Add SSL/TLS Certificate → paste fullchain.pem and key.pem → Upload Certificate → Hosting Settings → assign the certificate." />

        {/* CTA */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:16, padding:'32px 28px', textAlign:'center', marginTop:32 }}>
          <h3 style={{ fontSize:20, fontWeight:800, color:'white', marginBottom:8 }}>Ready to secure your website?</h3>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, marginBottom:20 }}>Start by generating your free SSL certificate — takes under 2 minutes.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'11px 24px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              <Shield size={15}/> Generate Free SSL
            </button>
            <button onClick={() => nav('/dashboard')} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'11px 24px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              My Certificates
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
