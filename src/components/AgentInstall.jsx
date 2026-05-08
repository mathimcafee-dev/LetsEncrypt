import { useState, useEffect, useRef } from 'react'
import { X, Terminal, Copy, Check, CheckCircle, Clock, AlertTriangle, Loader, Server, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const AGENT_API = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color:ok?'#34d399':'#64748b', display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 6px', borderRadius:4 }}>
      {ok ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  )
}

function StatusStep({ done, active, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--bg2)', transition:'all 0.3s' }}>
        {done ? <Check size={13} color="white"/> : active ? <Loader size={13} color="white" style={{ animation:'spin 1s linear infinite' }}/> : <span style={{ fontSize:11, color:'var(--text3)' }}>○</span>}
      </div>
      <span style={{ fontSize:13, fontWeight: done||active ? 600 : 400, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>{label}</span>
    </div>
  )
}

export default function AgentInstall({ cert, userId, onClose }) {
  const [step, setStep] = useState('intro')
  const [hostType, setHostType] = useState('server') // intro | token | waiting | success | failed
  const [token, setToken] = useState('')
  const [installId, setInstallId] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(3600)
  const pollRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }, [])

  const generateToken = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(AGENT_API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_token', user_id:userId, cert_id:cert.id, session_id:cert.session_id, domain:cert.domain })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setToken(data.token)
      setInstallId(data.install_id)
      setStep('token')
      setLoading(false)
      // Start countdown
      timerRef.current = setInterval(() => setTimeLeft(t => { if(t<=1){clearInterval(timerRef.current);return 0}; return t-1 }), 1000)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const generatePhpToken = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(AGENT_API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'create_token', user_id:userId, cert_id:cert.id, session_id:cert.session_id, domain:cert.domain })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      // Download PHP file with token embedded
      const phpUrl = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-script-php?token=' + data.token
      const a = document.createElement('a')
      a.href = phpUrl
      a.download = 'sslvault-agent.php'
      a.click()
      setToken(data.token)
      setInstallId(data.install_id)
      setStep('php_instructions')
      setLoading(false)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  const startWaiting = () => {
    setStep('waiting')
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(AGENT_API, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'status', install_id:installId, user_id:userId })
        })
        const data = await res.json()
        if (data.status === 'installed') { clearInterval(pollRef.current); setStatus(data); setStep('success') }
        if (data.status === 'failed') { clearInterval(pollRef.current); setStatus(data); setStep('failed') }
        if (data.status === 'installing') setStatus(data)
      } catch(e) {}
    }, 3000)
  }

  const installCmd = `curl -s https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=${token}`
  const mins = Math.floor(timeLeft/60).toString().padStart(2,'0')
  const secs = (timeLeft%60).toString().padStart(2,'0')

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Server size={18} color="white"/>
            </div>
            <div>
              <h3 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>Auto-Install Certificate</h3>
              <p style={{ fontSize:12, color:'var(--text3)' }}>{cert.domain}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ padding:'24px' }}>

          {/* HOSTING TYPE SELECTOR */}
        {step === 'intro' && (
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            {[
              ['server', '🖥️', 'VPS / Cloud Server', 'SSH access, Ubuntu/CentOS/Amazon Linux'],
              ['shared', '🌐', 'Shared Hosting', 'cPanel, GoDaddy, Bluehost, Hostinger'],
            ].map(([type, icon, title, desc]) => (
              <div key={type} onClick={() => setHostType(type)}
                style={{ flex:1, padding:'14px 16px', borderRadius:10, border:`2px solid ${hostType===type?'var(--accent)':'var(--border)'}`, background:hostType===type?'var(--accent-light)':'white', cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color:hostType===type?'var(--accent)':'var(--text)', marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* INTRO STEP */}
          {step === 'intro' && (
            <>
              <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:10, padding:16, marginBottom:20 }}>
                <p style={{ fontWeight:700, fontSize:14, marginBottom:8, color:'var(--text)' }}>What this does:</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {['Connects to your server via a one-time secure token','Auto-detects your OS and web server (Nginx/Apache)','Writes certificate and private key to correct paths','Updates your web server config automatically','Reloads Nginx/Apache — zero downtime'].map((t,i) => (
                    <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text2)' }}>
                      <span style={{ color:'var(--green)', fontWeight:700, flexShrink:0 }}>✓</span> {t}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:'var(--yellow-light)', border:'1px solid var(--yellow-border)', borderRadius:10, padding:14, marginBottom:20, fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
                ⚠ <strong>Before running:</strong> Make sure you have SSH access to your server with sudo/root privileges. The script will backup any existing web server config before modifying it.
              </div>

              <div style={{ marginBottom:20 }}>
                <p style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'var(--text)' }}>Supported:</p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['Ubuntu 20/22/24','Debian 10/11/12','CentOS 7/8/9','Amazon Linux 2/2023','Alpine Linux','+ Nginx or Apache'].map(s => (
                    <span key={s} className="badge badge-blue" style={{ fontSize:11 }}>{s}</span>
                  ))}
                </div>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}

              {hostType === 'server' ? (
                <button onClick={generateToken} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
                  {loading ? <><span className="spinner"/> Generating secure token...</> : '🚀 Generate Install Token'}
                </button>
              ) : (
                <button onClick={generatePhpToken} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px', background:'#059669' }}>
                  {loading ? <><span className="spinner"/> Preparing...</> : '📥 Download PHP Agent File'}
                </button>
              )}
            </>
          )}

          {/* PHP INSTRUCTIONS STEP */}
          {step === 'php_instructions' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📥</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>PHP Agent Downloaded!</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Follow these 3 steps to install your certificate</p>
              </div>

              {[
                ['1', '📁', 'Upload the file', 'Upload sslvault-agent.php to your website root folder using cPanel File Manager or FTP. The root folder is usually called public_html or www.'],
                ['2', '🌐', 'Visit the URL', 'Open your browser and go to: https://' + cert.domain + '/sslvault-agent.php — The script will run automatically and install your certificate.'],
                ['3', '🗑️', 'Delete the file', 'After installation, delete sslvault-agent.php from your server for security. The certificate stays installed.'],
              ].map(([n, icon, title, desc]) => (
                <div key={n} style={{ display:'flex', gap:14, padding:'14px 0', borderBottom:'1px solid var(--border2)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{n}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{icon} {title}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}

              <div className="alert alert-info" style={{ marginTop:16, marginBottom:16, fontSize:12 }}>
                💡 After visiting the URL, click below to check installation status in real-time.
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={startWaiting} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  ⏳ I visited the URL — Check Status
                </button>
                <a href={'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-script-php?token=' + token}
                  download="sslvault-agent.php" className="btn btn-secondary btn-sm">
                  Re-download
                </a>
              </div>
            </>
          )}

          {/* TOKEN STEP */}
          {step === 'token' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Your install token is ready</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Token expires in <strong style={{ color:timeLeft<300?'var(--red)':'var(--text)', fontFamily:'monospace' }}>{mins}:{secs}</strong></p>
              </div>

              <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:8 }}>
                Step 1 — SSH into your server, then run this command:
              </p>
              <div style={{ background:'#0f172a', borderRadius:10, marginBottom:20, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:11, color:'#475569' }}>bash</span>
                  <CopyBtn text={installCmd}/>
                </div>
                <pre style={{ margin:0, padding:'14px', color:'#e2e8f0', fontSize:11, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7 }}>{installCmd}</pre>
              </div>

              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Step 2 — What you'll see in your terminal:</p>
                <pre style={{ fontSize:11, color:'#059669', fontFamily:'monospace', lineHeight:1.8, margin:0 }}>
{`[SSLVault] Detecting operating system...
[✓] Detected: Ubuntu 22.04 LTS
[SSLVault] Detecting web server...
[✓] Found: Nginx
[SSLVault] Connecting to SSLVault...
[✓] Got certificate for: ${cert.domain}
[SSLVault] Writing certificate files...
[✓] Certificate files saved
[SSLVault] Configuring Nginx...
[✓] Nginx configured and reloaded
✅  Installation Complete!`}
                </pre>
              </div>

              <div className="alert alert-info" style={{ marginBottom:20, fontSize:12 }}>
                💡 After running the command, click below to monitor the installation in real-time.
              </div>

              <button onClick={startWaiting} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                ⏳ I've Run the Command — Monitor Progress
              </button>
            </>
          )}

          {/* WAITING STEP */}
          {step === 'waiting' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-light)', border:'2px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <Loader size={28} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }}/>
                </div>
                <p style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Waiting for agent...</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Polling every 3 seconds for installation status</p>
              </div>

              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20 }}>
                <StatusStep done={true} active={false} label="Token generated and ready" />
                <StatusStep done={status?.status==='installing'||status?.status==='installed'} active={!status} label="Waiting for agent to connect" />
                <StatusStep done={false} active={status?.status==='installing'} label="Agent installing certificate" />
                <StatusStep done={false} active={false} label="Web server reloaded" />
              </div>

              {status && (
                <div style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', borderRadius:8, padding:12, fontSize:12, color:'var(--text2)' }}>
                  🔌 Agent connected from <strong>{status.server_hostname || 'unknown'}</strong> running <strong>{status.server_os || 'unknown'}</strong>
                </div>
              )}
            </>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--green-light)', border:'2px solid var(--green-border,#86efac)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <CheckCircle size={32} color="var(--green)"/>
                </div>
                <p style={{ fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:4 }}>✅ Installed Successfully!</p>
                <p style={{ fontSize:14, color:'var(--text3)' }}>Certificate is live on your server</p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  ['Domain', cert.domain],
                  ['Server', status?.server_hostname || '—'],
                  ['OS', status?.server_os || '—'],
                  ['Web Server', status?.web_server || '—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:l==='Domain'?'monospace':'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <a href={'https://www.ssllabs.com/ssltest/analyze.html?d='+cert.domain} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary" style={{ flex:1, justifyContent:'center', textDecoration:'none' }}>
                  🔍 Test SSL Grade
                </a>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                  Done
                </button>
              </div>
            </>
          )}

          {/* FAILED STEP */}
          {step === 'failed' && (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--red-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <AlertTriangle size={32} color="var(--red)"/>
                </div>
                <p style={{ fontWeight:700, fontSize:18, color:'var(--text)', marginBottom:4 }}>Installation Failed</p>
                <p style={{ fontSize:13, color:'var(--text3)' }}>Certificate files were saved but web server config failed</p>
              </div>
              {status?.error_message && (
                <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>
                  {status.error_message}
                </div>
              )}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:14, marginBottom:16, fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
                <p style={{ fontWeight:600, marginBottom:6 }}>Certificate files are saved at:</p>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/fullchain.pem</code><br/>
                <code style={{ fontFamily:'monospace', color:'var(--accent)' }}>/etc/ssl/sslvault/{cert.domain}/privkey.pem</code>
                <p style={{ marginTop:8 }}>Configure your web server manually using these paths. See <strong>Install Guide</strong> in the nav for help.</p>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setStep('intro'); setToken(''); setStatus(null) }} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Try Again</button>
                <button onClick={onClose} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>Close</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
