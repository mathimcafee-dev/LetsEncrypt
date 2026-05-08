import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Shield, CheckCircle, ArrowRight, Play, Monitor, Server, Globe, Lock, AlertTriangle, Copy, Check } from 'lucide-react'

function CopyBtn({ text, label }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:6, background:ok?'var(--green-light)':'var(--accent-light)', border:'1px solid '+(ok?'#86efac':'var(--accent-border)'), color:ok?'var(--green)':'var(--accent)', borderRadius:7, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
      {ok ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> {label || 'Copy'}</>}
    </button>
  )
}

function Card({ icon, title, desc, color }) {
  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', display:'flex', gap:16, alignItems:'flex-start' }}>
      <div style={{ width:48, height:48, borderRadius:12, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:24 }}>{icon}</div>
      <div>
        <h3 style={{ fontWeight:700, fontSize:15, marginBottom:6, color:'var(--text)' }}>{title}</h3>
        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{desc}</p>
      </div>
    </div>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8, boxShadow:'var(--shadow)' }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', cursor:'pointer', background:open?'var(--accent-light)':'white' }}>
        <span style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{q}</span>
        {open ? <ChevronUp size={15} color="var(--text3)"/> : <ChevronDown size={15} color="var(--text3)"/>}
      </div>
      {open && <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>{a}</div>}
    </div>
  )
}

function Step({ n, emoji, title, children, highlight }) {
  return (
    <div style={{ display:'flex', gap:20, marginBottom:40 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:highlight?'linear-gradient(135deg,#2563eb,#1d4ed8)':'var(--bg2)', color:highlight?'white':'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, boxShadow:highlight?'0 4px 14px rgba(37,99,235,0.3)':'none' }}>{n}</div>
        <div style={{ width:2, flex:1, background:'var(--border)', margin:'8px 0', minHeight:24 }}/>
      </div>
      <div style={{ flex:1, paddingTop:8 }}>
        <div style={{ fontSize:22, marginBottom:4 }}>{emoji}</div>
        <h3 style={{ fontWeight:800, fontSize:18, marginBottom:10, color:'var(--text)' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Terminal({ lines }) {
  return (
    <div style={{ background:'#0f172a', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'#1e293b' }}>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#ef4444' }}/>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#f59e0b' }}/>
        <div style={{ width:12, height:12, borderRadius:'50%', background:'#10b981' }}/>
        <span style={{ fontSize:11, color:'#475569', marginLeft:8, fontFamily:'monospace' }}>Terminal</span>
      </div>
      <div style={{ padding:'16px 18px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.9, color: line.startsWith('#') ? '#64748b' : line.startsWith('[✓]') ? '#34d399' : line.startsWith('[!]') ? '#fbbf24' : line.startsWith('[✗]') ? '#f87171' : line.startsWith('$') ? '#38bdf8' : '#e2e8f0' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GetStarted({ nav }) {
  const [path, setPath] = useState(null)

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'48px 0 100px' }}>
      <div className="container" style={{ maxWidth:800 }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:100, padding:'6px 16px', fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:20 }}>
            <Play size={11}/> BEGINNER FRIENDLY GUIDE
          </div>
          <h1 style={{ fontSize:40, fontWeight:900, letterSpacing:'-1px', color:'var(--text)', marginBottom:16, lineHeight:1.15 }}>
            SSL Certificates Made Simple 🔒
          </h1>
          <p style={{ fontSize:17, color:'var(--text2)', lineHeight:1.8, maxWidth:580, margin:'0 auto 32px' }}>
            Never heard of SSL? No problem. This guide explains everything in plain English — what it is, why you need it, and how to get it free in under 5 minutes.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => document.getElementById('what-is-ssl').scrollIntoView({behavior:'smooth'})}
              className="btn btn-primary btn-lg">
              Start Learning <ArrowRight size={16}/>
            </button>
            <button onClick={() => nav('/generate')} className="btn btn-secondary btn-lg">
              Skip — Generate SSL Now
            </button>
          </div>
        </div>

        {/* What is SSL */}
        <div id="what-is-ssl" style={{ scrollMarginTop:80, marginBottom:52 }}>
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:32, boxShadow:'var(--shadow)' }}>
            <h2 style={{ fontSize:26, fontWeight:800, marginBottom:8, color:'var(--text)' }}>🤔 What is SSL?</h2>
            <p style={{ fontSize:15, color:'var(--text2)', lineHeight:1.9, marginBottom:20 }}>
              SSL stands for <strong>Secure Sockets Layer</strong>. Think of it like a <strong>sealed envelope</strong> for your website traffic.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              <div style={{ background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>😨</div>
                <h4 style={{ fontWeight:700, color:'var(--red)', marginBottom:8 }}>Without SSL (HTTP)</h4>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                  Your website shows a red "Not Secure" warning. Passwords and data sent by visitors can be read by hackers. Google ranks you lower in search results.
                </p>
              </div>
              <div style={{ background:'var(--green-light)', border:'1px solid #86efac', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>😌</div>
                <h4 style={{ fontWeight:700, color:'var(--green)', marginBottom:8 }}>With SSL (HTTPS)</h4>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                  Green padlock in browser. All data is encrypted. Visitors trust your site. Google ranks you higher. Required for accepting payments.
                </p>
              </div>
            </div>
            <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:16, display:'flex', gap:14, alignItems:'flex-start' }}>
              <Globe size={22} color="var(--accent)" style={{ flexShrink:0, marginTop:2 }}/>
              <div>
                <p style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>Easy way to remember</p>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                  See the difference between <strong>http://</strong> and <strong>https://</strong> in your browser? The <strong>"s"</strong> stands for Secure. SSLVault gives you that "s" — completely free.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Do I need it */}
        <div style={{ marginBottom:52 }}>
          <h2 style={{ fontSize:26, fontWeight:800, marginBottom:20, color:'var(--text)' }}>🙋 Do I need SSL?</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
            {[
              ['✅ YES', 'You have a website', 'Any website benefits from SSL. It builds trust with visitors and is required by modern browsers.', '#10b981'],
              ['✅ YES', 'You run an online shop', 'SSL is mandatory for accepting payments. No SSL = no credit cards accepted.', '#10b981'],
              ['✅ YES', 'You have a blog or portfolio', 'Google gives higher rankings to HTTPS sites. More traffic, free.', '#10b981'],
              ['✅ YES', 'You collect any user data', 'Email signups, contact forms, login pages — all require SSL to be safe.', '#10b981'],
              ['⚠️ MAYBE', 'It\'s just a local test site', 'If nobody else visits it, you might not need it yet. But it\'s still good practice.', '#f59e0b'],
            ].map(([badge, title, desc, color]) => (
              <div key={title} style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', display:'flex', gap:16, alignItems:'flex-start', boxShadow:'var(--shadow)' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{badge.split(' ')[0]}</span>
                <div>
                  <span style={{ fontWeight:700, fontSize:14, color, marginRight:8 }}>{badge.split(' ').slice(1).join(' ')}</span>
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{title}</span>
                  <p style={{ fontSize:13, color:'var(--text2)', marginTop:4, lineHeight:1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Choose your path */}
        <div style={{ marginBottom:52 }}>
          <h2 style={{ fontSize:26, fontWeight:800, marginBottom:8, color:'var(--text)' }}>🛤️ Choose Your Path</h2>
          <p style={{ color:'var(--text2)', fontSize:15, marginBottom:24, lineHeight:1.7 }}>
            Everyone's situation is different. Pick the one that matches yours:
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
            {[
              { id:'managed', emoji:'🖥️', title:'I use cPanel, GoDaddy Hosting, Bluehost, or similar', desc:'You have a hosting control panel. No command line needed. Install takes 2 minutes by pasting text.', badge:'Easiest', color:'#10b981' },
              { id:'vps', emoji:'🖧', title:'I have a VPS or Cloud Server (DigitalOcean, AWS, Linode)', desc:'You have full server access via SSH. The auto-install agent handles everything in one command.', badge:'Automatic', color:'#2563eb' },
              { id:'vercel', emoji:'▲', title:'My site is on Vercel, Netlify or similar', desc:'These platforms often handle SSL automatically. But if your custom domain needs a cert, we cover it.', badge:'Usually Auto', color:'#7c3aed' },
              { id:'noserver', emoji:'🌐', title:'I just own a domain name, no hosting yet', desc:'Get your SSL certificate ready first, then choose a hosting provider. We explain what to look for.', badge:'Beginner', color:'#f59e0b' },
            ].map(p => (
              <div key={p.id} onClick={() => setPath(path===p.id?null:p.id)}
                style={{ background:'white', border:`2px solid ${path===p.id?p.color:'var(--border)'}`, borderRadius:14, padding:'18px 22px', cursor:'pointer', boxShadow:'var(--shadow)', transition:'all 0.2s', background:path===p.id?p.color+'08':'white' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>{p.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{p.title}</span>
                      <span style={{ fontSize:11, fontWeight:700, background:p.color+'20', color:p.color, padding:'2px 8px', borderRadius:100 }}>{p.badge}</span>
                    </div>
                    <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{p.desc}</p>
                  </div>
                  {path===p.id ? <ChevronUp size={18} color={p.color}/> : <ChevronDown size={18} color="var(--text3)"/>}
                </div>

                {/* Expanded instructions */}
                {path === p.id && (
                  <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid var(--border)' }}>
                    {p.id === 'managed' && (
                      <>
                        <h4 style={{ fontWeight:700, fontSize:15, marginBottom:16, color:'var(--text)' }}>📋 Step-by-step for cPanel hosting:</h4>
                        {[
                          ['1️⃣', 'Generate your certificate', 'Click "Generate SSL" in the navigation above. Enter your domain name and follow the steps. Download the 3 files when done.'],
                          ['2️⃣', 'Login to your hosting control panel', 'Go to your hosting provider (GoDaddy, Bluehost, Hostgator, etc.) and login to cPanel.'],
                          ['3️⃣', 'Find SSL/TLS', 'In cPanel, search for "SSL" or look under Security. Click SSL/TLS → Manage SSL Sites.'],
                          ['4️⃣', 'Paste your certificate', 'You\'ll see 3 boxes. Open the downloaded files in Notepad and paste: fullchain.pem → Certificate box, key.pem → Private Key box. Leave CA Bundle blank.'],
                          ['5️⃣', 'Click Install', 'Hit "Install Certificate". Done! Your site now has HTTPS.'],
                        ].map(([n,t,d]) => (
                          <div key={t} style={{ display:'flex', gap:14, marginBottom:16 }}>
                            <span style={{ fontSize:20, flexShrink:0 }}>{n}</span>
                            <div>
                              <p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{t}</p>
                              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{d}</p>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => nav('/generate')} className="btn btn-primary" style={{ marginTop:8 }}>
                          <Shield size={15}/> Generate My Certificate Now
                        </button>
                      </>
                    )}
                    {p.id === 'vps' && (
                      <>
                        <h4 style={{ fontWeight:700, fontSize:15, marginBottom:16, color:'var(--text)' }}>🚀 Automatic install on your VPS:</h4>
                        {[
                          ['1️⃣', 'Generate your SSL certificate first', 'Click Generate SSL, complete DNS verification. Your cert appears in My Certificates.'],
                          ['2️⃣', 'Click "Install on Server"', 'In My Certificates, expand your domain panel and click the blue "Install on Server" button.'],
                          ['3️⃣', 'Generate a secure token', 'Click "Generate Install Token". Copy the command shown.'],
                          ['4️⃣', 'SSH into your server and run the command', 'Open a terminal (Mac: Terminal app, Windows: PuTTY or PowerShell), connect to your server, paste the command.'],
                          ['5️⃣', 'Watch it install automatically', 'The agent detects your OS and web server, installs the cert, and reports back to the dashboard.'],
                        ].map(([n,t,d]) => (
                          <div key={t} style={{ display:'flex', gap:14, marginBottom:16 }}>
                            <span style={{ fontSize:20, flexShrink:0 }}>{n}</span>
                            <div>
                              <p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{t}</p>
                              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{d}</p>
                            </div>
                          </div>
                        ))}
                        <Terminal lines={[
                          '# What you\'ll see in your terminal:',
                          '[SSLVault] Detecting operating system...',
                          '[✓] Detected: Ubuntu 22.04 LTS',
                          '[SSLVault] Detecting web server...',
                          '[✓] Found: Nginx',
                          '[SSLVault] Connecting to SSLVault...',
                          '[✓] Got certificate for: yourdomain.com',
                          '[SSLVault] Writing certificate files...',
                          '[✓] Nginx configured and reloaded',
                          '✅  Installation Complete!',
                        ]}/>
                        <button onClick={() => nav('/dashboard')} className="btn btn-primary" style={{ marginTop:4 }}>
                          <Server size={15}/> Go to My Certificates
                        </button>
                      </>
                    )}
                    {p.id === 'vercel' && (
                      <>
                        <h4 style={{ fontWeight:700, fontSize:15, marginBottom:16, color:'var(--text)' }}>▲ Vercel / Netlify SSL:</h4>
                        <div style={{ background:'var(--green-light)', border:'1px solid #86efac', borderRadius:10, padding:16, marginBottom:16 }}>
                          <p style={{ fontSize:14, fontWeight:600, color:'var(--green)', marginBottom:6 }}>✅ Good news!</p>
                          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:0 }}>Vercel and Netlify automatically provision free SSL for your domains. You usually don't need to do anything. Just add your custom domain in their settings and SSL is added automatically.</p>
                        </div>
                        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:12 }}>
                          However, if you need a certificate for something Vercel/Netlify doesn't manage (like a backend API server), use SSLVault to generate one and install it manually.
                        </p>
                        <button onClick={() => nav('/generate')} className="btn btn-secondary">Generate Certificate Anyway</button>
                      </>
                    )}
                    {p.id === 'noserver' && (
                      <>
                        <h4 style={{ fontWeight:700, fontSize:15, marginBottom:16, color:'var(--text)' }}>🌱 Starting from scratch:</h4>
                        {[
                          ['💡', 'Get a domain name first', 'If you don\'t have one, buy from GoDaddy, Namecheap, or Google Domains. Costs about $10-15/year.'],
                          ['🏠', 'Choose hosting', 'For beginners: Netlify (free), Vercel (free), or Hostinger ($2/month) are great starting points. They include free SSL automatically.'],
                          ['🔐', 'Generate your SSL', 'Once you have hosting, come back here and generate your certificate. The whole process takes under 5 minutes.'],
                          ['📧', 'Need help?', 'Check our Knowledge Base or email support. We\'re happy to guide you through the whole process.'],
                        ].map(([icon,t,d]) => (
                          <div key={t} style={{ display:'flex', gap:14, marginBottom:16 }}>
                            <span style={{ fontSize:24, flexShrink:0 }}>{icon}</span>
                            <div>
                              <p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{t}</p>
                              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{d}</p>
                            </div>
                          </div>
                        ))}
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
                          <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={13}/> Netlify (Free)</a>
                          <a href="https://www.vercel.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={13}/> Vercel (Free)</a>
                          <a href="https://www.hostinger.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={13}/> Hostinger ($2/mo)</a>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Full beginner walkthrough */}
        <div style={{ marginBottom:52 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Play size={18} color="white"/>
            </div>
            <div>
              <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text)' }}>Complete Beginner Walkthrough</h2>
              <p style={{ fontSize:13, color:'var(--text3)' }}>From zero to HTTPS in 5 minutes</p>
            </div>
          </div>

          <Step n="1" emoji="🌐" title="Create a free account" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:16 }}>
              Click <strong>Sign In</strong> in the top right corner. Enter your email and a password. Check your email for a confirmation link and click it. That's it — you're in!
            </p>
            <button onClick={() => nav('/auth')} className="btn btn-primary btn-sm">Create Free Account →</button>
          </Step>

          <Step n="2" emoji="🔑" title="Enter your domain name" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:16 }}>
              Click <strong>Generate SSL</strong> in the navigation. Type your domain name (just the domain, like <code style={{ background:'var(--bg2)', padding:'2px 8px', borderRadius:5, fontFamily:'monospace', fontSize:13 }}>example.com</code> — no http:// needed). Tick the agreement box and click <strong>Generate Free SSL</strong>.
            </p>
            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:14, display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--green)', flexShrink:0 }}/>
              <p style={{ fontSize:13, color:'var(--text2)', margin:0, lineHeight:1.6 }}>
                <strong>Wildcard certificate tip:</strong> Enter <code style={{ fontFamily:'monospace', background:'var(--bg2)', padding:'1px 5px', borderRadius:4 }}>*.example.com</code> to protect ALL subdomains (www.example.com, blog.example.com, shop.example.com) with one certificate.
              </p>
            </div>
          </Step>

          <Step n="3" emoji="📝" title="Add a DNS TXT record" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:12 }}>
              This step proves you own the domain. You'll see a record like this — you need to add it to wherever your domain's DNS is managed (usually your domain registrar like GoDaddy, Namecheap, or Cloudflare).
            </p>
            <div style={{ background:'#0f172a', borderRadius:10, padding:16, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'6px 16px', fontFamily:'monospace', fontSize:13 }}>
                <span style={{ color:'#64748b', fontWeight:600 }}>TYPE</span><span style={{ color:'#34d399' }}>TXT</span>
                <span style={{ color:'#64748b', fontWeight:600 }}>NAME</span><span style={{ color:'#38bdf8' }}>_acme-challenge</span>
                <span style={{ color:'#64748b', fontWeight:600 }}>VALUE</span><span style={{ color:'#fbbf24', wordBreak:'break-all' }}>abc123def456ghi789jkl012mno345pqr678</span>
                <span style={{ color:'#64748b', fontWeight:600 }}>TTL</span><span style={{ color:'#e2e8f0' }}>300</span>
              </div>
            </div>
            <div style={{ background:'var(--yellow-light)', border:'1px solid var(--yellow-border)', borderRadius:10, padding:14, marginBottom:12 }}>
              <p style={{ fontWeight:700, fontSize:13, marginBottom:6, color:'var(--text)' }}>⚠️ Important — easy mistake to avoid:</p>
              <p style={{ fontSize:13, color:'var(--text2)', margin:0, lineHeight:1.7 }}>
                In the Name field, type <strong>only</strong> <code style={{ fontFamily:'monospace', background:'white', padding:'1px 5px', borderRadius:4 }}>_acme-challenge</code> — your DNS provider will automatically add your domain name to it. If you type the full name including your domain, it will double up and fail.
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={12}/> Open Cloudflare</a>
              <a href="https://dcc.godaddy.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={12}/> Open GoDaddy DNS</a>
              <a href="https://ap.www.namecheap.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={12}/> Open Namecheap</a>
            </div>
          </Step>

          <Step n="4" emoji="✅" title="Verify DNS and issue certificate" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:12 }}>
              After adding the DNS record, wait 1-2 minutes for it to propagate. Then click <strong>Verify DNS & Continue</strong>. If it's found, you'll move to the next step. If not, wait another minute and try again.
            </p>
            <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:14 }}>
              <p style={{ fontSize:13, color:'var(--text)', fontWeight:600, marginBottom:4 }}>💡 Pro tip — Save and come back later</p>
              <p style={{ fontSize:13, color:'var(--text2)', margin:0, lineHeight:1.7 }}>Not ready to verify right now? Click <strong>"Go to Dashboard — Verify Later"</strong>. Your request is saved. Come back whenever the DNS is ready and click <strong>"Check DNS & Issue"</strong> from the dashboard.</p>
            </div>
          </Step>

          <Step n="5" emoji="📦" title="Download your certificate files" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:16 }}>
              Once issued, you'll see three files. Click <strong>Download All Files</strong> to save them all at once.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
              {[
                ['fullchain.pem', '✅ Use this one on your server', '#10b981'],
                ['key.pem', '🔑 Private key — keep secret!', '#ef4444'],
                ['cert.pem', '(Not usually needed)', '#94a3b8'],
              ].map(([name, note, color]) => (
                <div key={name} style={{ background:'white', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', minWidth:160 }}>
                  <p style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color, marginBottom:4 }}>{name}</p>
                  <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>{note}</p>
                </div>
              ))}
            </div>
          </Step>

          <Step n="6" emoji="🚀" title="Install on your server" highlight>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8, marginBottom:16 }}>
              Choose your method based on your hosting type:
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:16, cursor:'pointer' }} onClick={() => setPath('vps')}>
                <div style={{ fontSize:24, marginBottom:8 }}>⚡</div>
                <p style={{ fontWeight:700, fontSize:13, color:'var(--accent)', marginBottom:4 }}>Auto-Install Agent</p>
                <p style={{ fontSize:12, color:'var(--text2)', margin:0 }}>VPS/Cloud server — one command installs everything automatically</p>
              </div>
              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:16, cursor:'pointer' }} onClick={() => setPath('managed')}>
                <div style={{ fontSize:24, marginBottom:8 }}>🖥️</div>
                <p style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>Paste in cPanel</p>
                <p style={{ fontSize:12, color:'var(--text2)', margin:0 }}>Shared hosting — paste files in your control panel</p>
              </div>
            </div>
            <button onClick={() => nav('/install')} className="btn btn-secondary btn-sm">View Full Install Guide →</button>
          </Step>
        </div>

        {/* Glossary */}
        <div style={{ marginBottom:52 }}>
          <h2 style={{ fontSize:26, fontWeight:800, marginBottom:8, color:'var(--text)' }}>📖 Glossary</h2>
          <p style={{ color:'var(--text2)', fontSize:14, marginBottom:20 }}>Common terms explained in plain English:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
            {[
              ['SSL / TLS', 'Secure Sockets Layer / Transport Layer Security. Both mean the same thing in practice — encryption for your website. TLS is the newer version.'],
              ['HTTPS', 'The secure version of HTTP. The "S" means SSL is active. Your browser shows a padlock icon when HTTPS is working.'],
              ['Certificate', 'A digital file that proves your website is who it says it is. Like a passport for your website.'],
              ['Private Key', 'A secret file that pairs with your certificate. Keep it safe — never share it with anyone. Like the PIN to your passport.'],
              ['fullchain.pem', 'The certificate file you upload to your server. It includes your cert plus the chain of trust back to the certificate authority.'],
              ['Let\'s Encrypt', 'The free certificate authority (CA) that issues our SSL certificates. Trusted by all browsers. Backed by Mozilla, Cisco, Google.'],
              ['DNS', 'Domain Name System. Like a phone book for the internet — converts domain names to IP addresses.'],
              ['TXT Record', 'A special DNS record used to prove you own a domain. SSLVault uses this to verify your domain before issuing a certificate.'],
              ['Wildcard Certificate', 'A certificate for *.domain.com that covers ALL subdomains — www, blog, shop, api, etc. with just one certificate.'],
              ['Port 443', 'The network port used for HTTPS. Port 80 is HTTP. SSL/TLS works on 443.'],
              ['Certificate Expiry', 'SSL certificates expire after 90 days (Let\'s Encrypt). SSLVault reminds you and makes renewal a one-click process.'],
            ].map(([term, def]) => (
              <div key={term} style={{ background:'white', border:'1px solid var(--border)', borderRadius:10, padding:'12px 18px', display:'flex', gap:16, boxShadow:'var(--shadow)' }}>
                <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--accent)', minWidth:160, flexShrink:0 }}>{term}</span>
                <span style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{def}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:52 }}>
          <h2 style={{ fontSize:26, fontWeight:800, marginBottom:20, color:'var(--text)' }}>❓ Frequently Asked Questions</h2>
          <FAQ q="Is SSLVault really free?" a="Yes, completely free. SSL certificates from Let's Encrypt are free, and SSLVault makes them easy to get. There are no hidden fees, no credit card required." />
          <FAQ q="How long does an SSL certificate last?" a="90 days. This is Let's Encrypt's standard validity period. SSLVault shows you exactly when your certificate expires and lets you renew in one click. Set a reminder 2 weeks before expiry." />
          <FAQ q="Will my website go down when I install SSL?" a="No. Installing SSL doesn't affect your website's availability. You're just adding a security layer. The process takes seconds and your site stays live throughout." />
          <FAQ q="I got an error when verifying DNS — what do I do?" a="DNS takes time to propagate (spread across the internet). After adding the TXT record, wait 2-5 minutes before clicking Verify. Use dnschecker.org to see if it's propagated yet. If it still fails, double-check that you typed only _acme-challenge in the Name field (not the full domain)." />
          <FAQ q="What is the difference between cert.pem, key.pem and fullchain.pem?" a="fullchain.pem is your certificate — use this on your server. key.pem is your private key — keep it secret and never share. cert.pem is just the certificate without the chain — most servers want fullchain.pem instead. When in doubt, use fullchain.pem." />
          <FAQ q="Can I use one certificate for multiple domains?" a="Each certificate covers one domain or use wildcard (*.domain.com) for all subdomains of one domain. For completely different domains (example.com AND mysite.com) you need two separate certificates — both free." />
          <FAQ q="My certificate expired — what happens?" a="Visitors will see a scary security warning and your site traffic will drop drastically. Don't panic — just go to My Certificates, click Request Renewal, and follow the same steps as before. Takes about 3 minutes." />
          <FAQ q="I'm on GoDaddy — do I need the auto-install agent?" a="No. If you're on GoDaddy shared hosting with cPanel, just use the paste method (Path 1 above). The agent is for VPS/cloud servers where you have SSH access. GoDaddy shared hosting uses cPanel, which is much simpler." />
        </div>

        {/* Final CTA */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:20, padding:'40px 36px', textAlign:'center', boxShadow:'0 20px 60px rgba(37,99,235,0.3)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'white', marginBottom:12, letterSpacing:'-0.5px' }}>Ready to secure your website?</h2>
          <p style={{ color:'rgba(255,255,255,0.85)', fontSize:16, marginBottom:28, lineHeight:1.7, maxWidth:500, margin:'0 auto 28px' }}>
            It's completely free. Takes under 5 minutes. Your visitors deserve a secure experience.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'14px 28px', borderRadius:10, fontSize:16, fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, boxShadow:'0 4px 14px rgba(0,0,0,0.15)' }}>
              <Shield size={18}/> Generate Free SSL
            </button>
            <button onClick={() => nav('/knowledge-base')} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', padding:'14px 28px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}>
              Read Full Guide
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
