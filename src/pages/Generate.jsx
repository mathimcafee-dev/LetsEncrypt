import { useState, useEffect } from 'react'
import { Copy, Check, ArrowRight, RefreshCw, Download, Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['Enter Domain', 'Add DNS Record', 'Verify & Issue', 'Download']
const DNS_GUIDES = {
  godaddy: { label:'GoDaddy', steps:['Login → DNS Management','Add New Record → Type: TXT','Name: _acme-challenge, Value: (paste below), TTL: 600','Save'] },
  cloudflare: { label:'Cloudflare', steps:['dash.cloudflare.com → your domain → DNS','Add Record → Type: TXT','Name: _acme-challenge, Content: (paste below), TTL: Auto','Save'] },
  namecheap: { label:'Namecheap', steps:['Domain List → Manage → Advanced DNS','Add New Record → TXT Record','Host: _acme-challenge, Value: (paste below), TTL: 300','Save Changes'] },
  other: { label:'Other', steps:['Login to your DNS provider','Add a new TXT record','Name/Host: _acme-challenge','Value: paste below, TTL: 300-600, Save'] },
}
function genSession() { return crypto.randomUUID().replace(/-/g,'') }

export default function Generate() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [domain, setDomain] = useState('')
  const [sessionId] = useState(genSession)
  const [staging, setStaging] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [certResult, setCertResult] = useState(null)
  const [copied, setCopied] = useState('')
  const [dnsTab, setDnsTab] = useState('cloudflare')
  const [polling, setPolling] = useState(false)

  const copy = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 2000) }

  const call = async (action) => {
    const res = await fetch('/api/acme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, domain: domain.trim().replace(/^https?:\/\//,'').replace(/\/.*/,''), staging, user_id: user?.id }),
    })
    return res.json()
  }

  const startOrder = async () => {
    const d = domain.trim().replace(/^https?:\/\//,'').replace(/\/.*/,'')
    if (!d) { setError('Please enter a domain name'); return }
    if (!agreed) { setError('Please agree to the terms'); return }
    // don't block on user — api handles it
    setError(''); setLoading(true)
    const data = await call('start').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    setChallenge(data)
    setStep(1)
  }

  const verifyDNS = async () => {
    setError(''); setLoading(true)
    const data = await call('verify').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    if (!data.verified) { setError(data.message || 'TXT record not found yet.'); return }
    setStep(2)
  }

  const finalize = async () => {
    setError(''); setLoading(true); setPolling(true)
    const data = await call('finalize').catch(e => ({ error: e.message }))
    setLoading(false); setPolling(false)
    if (data.error) { setError(data.error); return }
    if (data.ok) { setCertResult(data); setStep(3) }
    else setError(data.message || 'Failed to issue certificate')
  }

  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type:'text/plain' }))
    a.download = filename; a.click()
  }

  return (
    <div className="container" style={{ padding:'40px 24px 80px' }}>
      <div style={{ marginBottom:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:44, height:44, background:'linear-gradient(135deg,#38bdf8,#0ea5e9)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px' }}>Generate Free SSL</h1>
            <p style={{ color:'var(--text3)', fontSize:14 }}>Powered by Lets Encrypt · 90-day validity</p>
          </div>
          <label style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)', cursor:'pointer', textTransform:'none', fontWeight:500 }}>
            <input type="checkbox" checked={staging} onChange={e => setStaging(e.target.checked)} style={{ width:'auto' }} />
            Staging (test mode)
          </label>
        </div>
        <div className="stepper" style={{ marginTop:32 }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-circle">{i < step ? '✓' : i + 1}</div>
              <div className="step-label">{s}</div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div className="card">
            <h2 style={{ fontWeight:700, fontSize:18, marginBottom:20 }}>Domain Details</h2>
            <div style={{ marginBottom:16 }}>
              <label>Domain Name</label>
              <input placeholder="example.com or *.example.com" value={domain}
                onChange={e => setDomain(e.target.value.replace(/^https?:\/\//,'').replace(/\/.*/,''))}
                onKeyDown={e => e.key === 'Enter' && startOrder()} autoFocus />
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Wildcards (*.example.com) supported</p>
            </div>
            <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', marginBottom:20, textTransform:'none', fontSize:13, fontWeight:400, color:'var(--text2)', letterSpacing:0 }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop:2, width:'auto', flexShrink:0 }} />
              <span>I agree to the <a href="https://letsencrypt.org/documents/LE-SA-v1.3-September-21-2022.pdf" target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)' }}>Lets Encrypt Subscriber Agreement</a> and confirm I control this domain.</span>
            </label>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <button className="btn btn-primary btn-lg" onClick={startOrder} disabled={loading || !domain.trim()} style={{ width:'100%', justifyContent:'center' }}>
              {loading ? <><span className="spinner" /> Preparing...</> : <>Generate Free SSL <ArrowRight size={18} /></>}
            </button>
            {!user && <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginTop:12 }}>You need to <a href="/auth" style={{ color:'var(--accent)' }}>sign in</a> to generate certificates</p>}
          </div>
          <div className="card">
            <h2 style={{ fontWeight:700, fontSize:18, marginBottom:20 }}>About Free SSL</h2>
            {[['🏛',"Lets Encrypt","The worlds largest free CA. Trusted by all browsers."],['📅','90-day Validity','Free forever. Renew anytime.'],['🔒','DNS-01 Validation','Proves ownership via TXT record. Supports wildcards.'],['✅','Wildcard Support','*.example.com covers all subdomains.'],['📦','All Formats','Download cert, private key, and full chain (PEM).']].map(([icon,title,desc]) => (
              <div key={title} style={{ display:'flex', gap:14, marginBottom:16 }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{title}</p>
                  <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && challenge && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div className="card">
            <h2 style={{ fontWeight:700, fontSize:18, marginBottom:20 }}>Add This DNS TXT Record</h2>
            <div style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:'var(--radius-sm)', padding:16, marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12 }}>Add to your DNS:</p>
              {[['Type','TXT'],['Name / Host','_acme-challenge'],['Value',challenge.txtValue],['TTL','300']].map(([l,v]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface2)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)', marginBottom:8 }}>
                  <span style={{ width:60, fontSize:11, fontWeight:700, color:'var(--text3)', flexShrink:0 }}>{l}</span>
                  <span style={{ flex:1, fontFamily:l==='Value'?'var(--mono)':'inherit', fontSize:l==='Value'?11:13, fontWeight:600, wordBreak:'break-all' }}>{v}</span>
                  <button onClick={() => copy(v, l)} style={{ background:'none', border:'none', cursor:'pointer', color:copied===l?'var(--green)':'var(--text3)', padding:4 }}>
                    {copied===l ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
            <div className="alert alert-warning" style={{ marginBottom:16 }}>⚠ Use <strong>_acme-challenge</strong> as the short Name, not the full domain.</div>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-primary" onClick={verifyDNS} disabled={loading} style={{ flex:1, justifyContent:'center' }}>
                {loading ? <><span className="spinner" /> Checking DNS...</> : '✅ Verify DNS & Continue'}
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
            </div>
          </div>
          <div className="card">
            <h2 style={{ fontWeight:700, fontSize:18, marginBottom:16 }}>DNS Setup Guide</h2>
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {Object.entries(DNS_GUIDES).map(([key,g]) => (
                <button key={key} onClick={() => setDnsTab(key)} className={`btn btn-sm ${dnsTab===key?'btn-primary':'btn-secondary'}`}>{g.label}</button>
              ))}
            </div>
            <ol style={{ paddingLeft:20, display:'flex', flexDirection:'column', gap:12 }}>
              {DNS_GUIDES[dnsTab].steps.map((s,i) => (
                <li key={i} style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{s}</li>
              ))}
            </ol>
            <div className="alert alert-info" style={{ marginTop:20 }}>
              💡 After saving, wait 1–5 minutes then click Verify. Check at{' '}
              <a href={`https://dnschecker.org/#TXT/${challenge.challengeDomain}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', fontWeight:600 }}>dnschecker.org</a>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth:560 }}>
          <div className="alert alert-success" style={{ marginBottom:24 }}>✅ DNS verified! Domain ownership confirmed.</div>
          <h2 style={{ fontWeight:700, fontSize:20, marginBottom:12 }}>Ready to Issue Certificate</h2>
          <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>Click below to generate your signed certificate from Lets Encrypt.</p>
          {polling && <div className="alert alert-info" style={{ marginBottom:16 }}><span className="spinner" style={{ marginRight:8 }} />Issuing certificate... up to 30 seconds</div>}
          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          <div style={{ display:'flex', gap:12 }}>
            <button className="btn btn-primary btn-lg" onClick={finalize} disabled={loading} style={{ flex:1, justifyContent:'center' }}>
              {loading ? <><span className="spinner" /> Issuing...</> : '🔐 Issue My Certificate'}
            </button>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>Start Over</button>
          </div>
        </div>
      )}

      {step === 3 && certResult && (
        <div>
          <div className="alert alert-success" style={{ marginBottom:24, fontSize:15, fontWeight:600 }}>
            🎉 SSL Certificate issued for <strong>{certResult.domain}</strong>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <div className="card">
              <h3 style={{ fontWeight:700, marginBottom:12 }}>📜 Certificate (cert.pem)</h3>
              <div className="output-box" style={{ maxHeight:160, overflow:'auto', marginBottom:12 }}>{certResult.cert}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(certResult.cert, `${certResult.domain}-cert.pem`)}><Download size={14} /> Download</button>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(certResult.cert,'cert')}>{copied==='cert'?<Check size={14}/>:<Copy size={14}/>} Copy</button>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontWeight:700, marginBottom:8 }}>🔑 Private Key (key.pem)</h3>
              <div className="alert alert-warning" style={{ marginBottom:10, fontSize:12 }}>⚠ Save this now. Never share it.</div>
              <div className="output-box" style={{ maxHeight:120, overflow:'auto', marginBottom:12 }}>{certResult.privateKey}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(certResult.privateKey, `${certResult.domain}-key.pem`)}><Download size={14} /> Download</button>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(certResult.privateKey,'key')}>{copied==='key'?<Check size={14}/>:<Copy size={14}/>} Copy</button>
              </div>
            </div>
          </div>
          {certResult.fullchain && (
            <div className="card" style={{ marginBottom:20 }}>
              <h3 style={{ fontWeight:700, marginBottom:12 }}>🔗 Full Chain (fullchain.pem) — recommended for most servers</h3>
              <div className="output-box" style={{ maxHeight:120, overflow:'auto', marginBottom:12 }}>{certResult.fullchain}</div>
              <button className="btn btn-primary btn-sm" onClick={() => download(certResult.fullchain, `${certResult.domain}-fullchain.pem`)}><Download size={14} /> Download fullchain</button>
            </div>
          )}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={() => { download(certResult.cert,`${certResult.domain}-cert.pem`); setTimeout(()=>download(certResult.privateKey,`${certResult.domain}-key.pem`),300); setTimeout(()=>download(certResult.fullchain,`${certResult.domain}-fullchain.pem`),600) }}>
              <Download size={16} /> Download All Files
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href='/dashboard'}><Shield size={16} /> Go to Dashboard</button>
            <button className="btn btn-secondary" onClick={() => { setStep(0); setDomain(''); setCertResult(null); setChallenge(null); setError('') }}><RefreshCw size={16} /> Issue Another</button>
          </div>
        </div>
      )}
    </div>
  )
}
