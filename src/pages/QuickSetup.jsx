import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Loader, Copy, Check, Download, ArrowRight, RotateCcw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const ACME = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl'
const DNS_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'

const PROVIDERS = {
  cloudflare:    { name:'Cloudflare',    fields:[{k:'apiToken',l:'API Token',p:'cf-api-token'}] },
  godaddy:       { name:'GoDaddy',       fields:[{k:'apiKey',l:'API Key',p:'key'},{k:'apiSecret',l:'API Secret',p:'secret'}] },
  vercel:        { name:'Vercel',        fields:[{k:'apiToken',l:'API Token',p:'vercel-token'},{k:'teamId',l:'Team ID (optional)',p:'team_xxx'}] },
  digitalocean:  { name:'DigitalOcean',  fields:[{k:'apiToken',l:'API Token',p:'do-token'}] },
  manual:        { name:'Manual DNS',    fields:[] },
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:5, background:ok?'var(--green-light)':'var(--accent-light)', border:'1px solid '+(ok?'#86efac':'var(--accent-border)'), color:ok?'var(--green)':'var(--accent)', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
      {ok ? <><Check size={12}/>Copied</> : <><Copy size={12}/>Copy</>}
    </button>
  )
}

export default function QuickSetup({ nav }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [domain, setDomain] = useState('')
  const [provider, setProvider] = useState('cloudflare')
  const [creds, setCreds] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionId] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36))
  const [savedCred, setSavedCred] = useState(null)
  const [txtValue, setTxtValue] = useState('')
  const [autoAdded, setAutoAdded] = useState(false)
  const [certData, setCertData] = useState(null)

  const d = domain.trim().replace(/^https?:\/\//,'').replace(/\/.*/,'').toLowerCase()

  // Auto-load saved credentials for selected provider
  useEffect(() => {
    if (!user || provider === 'manual') return
    fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'list', user_id:user.id })
    }).then(r=>r.json()).then(data => {
      if (!data.credentials) return
      const match = data.credentials.find(c => c.provider === provider)
      if (match) setSavedCred(match)
      else setSavedCred(null)
    }).catch(()=>{})
  }, [provider, user])

  const startCert = async () => {
    if (!d) { setError('Enter a domain name'); return }
    if (d.includes('@')) { setError('Please enter a domain name (e.g. example.com), not an email address'); return }
    if (!d.includes('.')) { setError('Please enter a valid domain name (e.g. example.com)'); return }
    setError(''); setLoading(true)
    try {
      if (provider !== 'manual' && user) {
        // Only save new credentials if user entered them manually
        const hasManualCreds = Object.values(creds).some(v => v)
        if (hasManualCreds) {
          const vRes = await fetch(DNS_FN, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'save', user_id:user.id, provider, domain_pattern:d, credentials:creds, label:d })
          })
          const vData = await vRes.json()
          if (vData.error) { setError('DNS credentials error: '+vData.error); setLoading(false); return }
        } else if (!savedCred) {
          setError('Please enter DNS provider credentials or save them in DNS Providers first')
          setLoading(false); return
        }
      }
      const res = await fetch(ACME, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'start', domain:d, sessionId, user_id:user?.id })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setTxtValue(data.txtValue)
      setAutoAdded(!!data.autoAdded)
      setStep(2)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const verifyCert = async () => {
    setError(''); setLoading(true)
    try {
      const vRes = await fetch(ACME, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'verify', sessionId, domain:d })
      })
      const vData = await vRes.json()
      if (!vData.verified) { setError(vData.message || 'DNS not ready. Wait 1-2 min and try again.'); setLoading(false); return }
      const fRes = await fetch(ACME, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'finalize', sessionId, domain:d, user_id:user?.id })
      })
      const fData = await fRes.json()
      if (!fData.ok) { setError(fData.error || 'Failed to issue certificate'); setLoading(false); return }
      setCertData(fData)
      setStep(3)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const dl = (content, filename) => {
    if (!content) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}))
    a.download = filename; a.click()
  }

  const steps = ['Domain & DNS','Verify & Issue','Install']

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container" style={{ maxWidth:680 }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h1 style={{ fontSize:30, fontWeight:900, letterSpacing:'-0.5px', color:'var(--text)', marginBottom:8 }}>
            Quick Setup ⚡
          </h1>
          <p style={{ fontSize:14, color:'var(--text2)' }}>Enter domain, configure DNS, get certificate and install — in one flow</p>
        </div>

        {/* Progress bar */}
        <div style={{ display:'flex', alignItems:'center', background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'14px 20px', marginBottom:28, boxShadow:'var(--shadow)', gap:0 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex:1, display:'flex', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:step>i+1?'var(--green)':step===i+1?'var(--accent)':'var(--bg2)', color:step>=i+1?'white':'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                  {step>i+1 ? <CheckCircle size={14}/> : i+1}
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:step>=i+1?'var(--text)':'var(--text3)' }}>{s}</span>
              </div>
              {i < steps.length-1 && <div style={{ flex:1, height:2, background:step>i+1?'var(--green)':'var(--border)', margin:'0 10px', borderRadius:1 }}/>}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:28, boxShadow:'var(--shadow)' }}>
            <h2 style={{ fontWeight:800, fontSize:18, marginBottom:4, color:'var(--text)' }}>Enter your domain</h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>We'll verify ownership and issue your free SSL certificate</p>

            <label>Domain Name</label>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" style={{ fontSize:15, marginBottom:20 }}/>

            <label>DNS Provider</label>
            <select value={provider} onChange={e=>{setProvider(e.target.value);setCreds({})}} style={{ marginBottom:8 }}>
              {Object.entries(PROVIDERS).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>
              {provider==='manual' ? 'You will add the DNS TXT record manually' : 'We will automatically add the DNS verification record for you'}
            </p>

            {provider !== 'manual' && savedCred && (
              <div className="alert alert-success" style={{ marginBottom:16, fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14} color="var(--green)"/>
                <span>Using saved <strong>{PROVIDERS[provider]?.name}</strong> credentials from DNS Providers. Fields pre-filled.</span>
              </div>
            )}
            {provider !== 'manual' && !savedCred && (
              <div className="alert alert-warning" style={{ marginBottom:12, fontSize:12 }}>
                No saved credentials for {PROVIDERS[provider]?.name}. Enter below or save them in <button onClick={()=>nav('/dns-providers')} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontWeight:600,padding:0,fontSize:12}}>DNS Providers</button> first.
              </div>
            )}
            {provider !== 'manual' && PROVIDERS[provider].fields.map(f => (
              <div key={f.k} style={{ marginBottom:14 }}>
                <label>{f.l}</label>
                <input type="password" placeholder={f.p} value={creds[f.k]||''} onChange={e=>setCreds(c=>({...c,[f.k]:e.target.value}))}/>
              </div>
            ))}

            {provider !== 'manual' && (
              <div className="alert alert-info" style={{ fontSize:12, marginBottom:16 }}>
                🔒 Credentials encrypted with AES-256 and saved for future auto-renewals
              </div>
            )}

            {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}

            <button onClick={startCert} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
              {loading ? <><span className="spinner"/> Processing...</> : <>Generate Certificate <ArrowRight size={15}/></>}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:28, boxShadow:'var(--shadow)' }}>
            {autoAdded ? (
              <>
                <div className="alert alert-success" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
                  <CheckCircle size={16} color="var(--green)"/>
                  <span><strong>DNS record added automatically</strong> via {PROVIDERS[provider]?.name}!</span>
                </div>
                <h2 style={{ fontWeight:800, fontSize:18, marginBottom:4, color:'var(--text)' }}>Issue your certificate</h2>
                <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>DNS is ready. Click below to issue your certificate now.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontWeight:800, fontSize:18, marginBottom:4, color:'var(--text)' }}>Add DNS TXT record</h2>
                <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Add this record to your DNS provider, then click Verify</p>
                <div style={{ background:'#0f172a', borderRadius:10, padding:16, marginBottom:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'8px 16px', fontFamily:'monospace', fontSize:13 }}>
                    <span style={{ color:'#64748b', fontWeight:600 }}>TYPE</span><span style={{ color:'#34d399' }}>TXT</span>
                    <span style={{ color:'#64748b', fontWeight:600 }}>NAME</span><span style={{ color:'#38bdf8' }}>_acme-challenge</span>
                    <span style={{ color:'#64748b', fontWeight:600 }}>VALUE</span><span style={{ color:'#fbbf24', wordBreak:'break-all' }}>{txtValue}</span>
                    <span style={{ color:'#64748b', fontWeight:600 }}>TTL</span><span style={{ color:'#e2e8f0' }}>300</span>
                  </div>
                </div>
                <div style={{ marginBottom:16 }}><CopyBtn text={txtValue}/></div>
                <div className="alert alert-warning" style={{ fontSize:12, marginBottom:16 }}>
                  ⚠ Enter only <strong>_acme-challenge</strong> in the Name field
                </div>
              </>
            )}

            {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}

            <button onClick={verifyCert} disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px' }}>
              {loading ? <><span className="spinner"/> Verifying & Issuing...</> : <>{autoAdded ? 'Issue Certificate' : 'Verify DNS & Issue'} <ArrowRight size={15}/></>}
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && certData && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'white', border:'2px solid var(--green)', borderRadius:14, padding:28, boxShadow:'var(--shadow)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle size={28} color="var(--green)"/>
                </div>
                <div>
                  <h2 style={{ fontWeight:800, fontSize:20, color:'var(--green)' }}>Certificate Issued!</h2>
                  <p style={{ fontSize:13, color:'var(--text3)' }}>Valid 90 days · {d}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => dl(certData.fullchain, d+'-fullchain.pem')} className="btn btn-primary btn-sm">
                  <Download size={13}/> fullchain.pem
                </button>
                <button onClick={() => dl(certData.privateKey, d+'-key.pem')} className="btn btn-secondary btn-sm">
                  <Download size={13}/> key.pem
                </button>
                <button onClick={() => { dl(certData.fullchain, d+'-fullchain.pem'); setTimeout(()=>dl(certData.privateKey, d+'-key.pem'),300) }} className="btn btn-secondary btn-sm">
                  <Download size={13}/> All Files
                </button>
              </div>
            </div>

            <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)' }}>
              <h3 style={{ fontWeight:700, fontSize:16, marginBottom:12, color:'var(--text)' }}>Install on your server</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div onClick={() => nav('/dashboard')} style={{ border:'2px solid var(--accent-border)', borderRadius:10, padding:16, cursor:'pointer', background:'var(--accent-light)' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>🖥️</div>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--accent)', marginBottom:3 }}>VPS / Cloud Server</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>One command auto-install</div>
                </div>
                <div onClick={() => nav('/dashboard')} style={{ border:'2px solid #86efac', borderRadius:10, padding:16, cursor:'pointer', background:'var(--green-light)' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>🌐</div>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--green)', marginBottom:3 }}>Shared Hosting</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>PHP agent cPanel auto-install</div>
                </div>
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:12 }}>Go to My Certificates → {d} → Install on Server</p>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => nav('/dashboard')} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                <Shield size={15}/> My Certificates
              </button>
              <button onClick={() => { setStep(1); setDomain(''); setCertData(null); setError(''); setCreds({}) }} className="btn btn-secondary">
                <RotateCcw size={14}/> New Certificate
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
