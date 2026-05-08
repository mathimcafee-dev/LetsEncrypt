import { useState, useEffect } from 'react'
import { Copy, Check, ArrowRight, RefreshCw, Download, Shield, Bell, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['Enter Domain', 'Add DNS Record', 'Issue Certificate', 'Download']
const DNS_GUIDES = {
  cloudflare: { label:'Cloudflare', steps:['dash.cloudflare.com → your domain → DNS','Add Record → Type: TXT','Name: _acme-challenge, Content: (paste value), TTL: Auto','Save and wait 1-2 minutes'] },
  godaddy: { label:'GoDaddy', steps:['Login → DNS Management','Add New Record → Type: TXT','Name: _acme-challenge, Value: (paste value), TTL: 600','Save'] },
  namecheap: { label:'Namecheap', steps:['Domain List → Manage → Advanced DNS','Add New Record → TXT Record','Host: _acme-challenge, Value: (paste value), TTL: 300','Save Changes'] },
  vercel: { label:'Vercel', steps:['vercel.com → your domain → DNS','Add Record → Type: TXT','Name: _acme-challenge, Value: (paste value)','Save — propagates instantly'] },
  other: { label:'Other', steps:['Login to your DNS provider','Add a new TXT record','Name/Host: _acme-challenge','Value: paste below, TTL: 300, Save'] },
}
function genSession() { return crypto.randomUUID().replace(/-/g,'') }

export default function Generate() {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState(0)
  const [certType, setCertType] = useState('single')
  const [domain, setDomain] = useState(() => {
    const prefill = sessionStorage.getItem('prefill_domain')
    if (prefill) { sessionStorage.removeItem('prefill_domain'); return prefill }
    return ''
  })
  const [sessionId] = useState(genSession)
  const [staging, setStaging] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [certResult, setCertResult] = useState(null)
  const [copied, setCopied] = useState('')
  const [dnsTab, setDnsTab] = useState('cloudflare')
  const [saved, setSaved] = useState(false)

  const copy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const callAcme = async (action, extra = {}) => {
    const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        sessionId,
        domain: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, ''),
        staging,
        user_id: user?.id,
        ...extra
      }),
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch { return { error: text } }
  }

  const startOrder = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!d) { setError('Please enter a domain name'); return }
    if (!agreed) { setError('Please agree to the terms'); return }
    setError(''); setLoading(true)
    const data = await callAcme('start').catch(e => ({ error: e.message }))
    setLoading(false)
    if (!data || data.error) { setError(data?.error || 'Failed to start. Please try again.'); return }
    setChallenge(data)
    setStep(1)
  }

  const verifyDNS = async () => {
    setError(''); setLoading(true)
    const data = await callAcme('verify').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    if (!data.verified) { setError(data.message || 'TXT record not found yet. Wait a minute and try again.'); return }
    setStep(2)
  }

  const finalize = async () => {
    setError(''); setLoading(true)
    const data = await callAcme('finalize').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    if (data.ok) { setCertResult(data); setStep(3) }
    else setError(data.message || 'Failed to issue certificate')
  }

  // Save to ssl_orders as pending_dns so user can leave and come back
  const saveAndLeave = async () => {
    // Already saved when we started — just navigate away
    window.location.href = '/dashboard'
  }

  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 60px)', padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>Generate Free SSL</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Powered by Let's Encrypt · 90-day validity</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text3)', cursor: 'pointer', fontWeight: 500 }}>
            <input type="checkbox" checked={staging} onChange={e => setStaging(e.target.checked)} style={{ width: 'auto' }} />
            Staging (test mode)
          </label>
        </div>

        {/* Stepper */}
        <div className="stepper" style={{ marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-circle">{i < step ? '✓' : i + 1}</div>
              <div className="step-label">{s}</div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Step 0: Enter Domain */}
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: 'var(--text)' }}>Domain Details</h2>
              <div style={{ marginBottom: 16 }}>
                {/* Single vs Wildcard toggle */}
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  {[['single','🌐 Single Domain','example.com'],['wildcard','✳️ Wildcard','*.example.com — covers all subdomains']].map(([t,label,desc]) => (
                    <div key={t} onClick={() => {
                      setCertType(t)
                      if (t === 'wildcard' && domain && !domain.startsWith('*.')) setDomain('*.' + domain)
                      if (t === 'single' && domain.startsWith('*.')) setDomain(domain.slice(2))
                    }} style={{ flex:1, padding:'12px 14px', borderRadius:10, border:`2px solid ${certType===t?'var(--accent)':'var(--border)'}`, background:certType===t?'var(--accent-light)':'white', cursor:'pointer' }}>
                      <div style={{ fontWeight:700, fontSize:13, color:certType===t?'var(--accent)':'var(--text)', marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{desc}</div>
                    </div>
                  ))}
                </div>

                <label>Domain Name</label>
                <input placeholder={certType==='wildcard'?'*.example.com':'example.com'} value={domain}
                  onChange={e => setDomain(e.target.value.replace(/^https?:\/\//, '').replace(/\/.*/, ''))}
                  onKeyDown={e => e.key === 'Enter' && startOrder()} autoFocus />
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Wildcards (*.example.com) supported</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20, textTransform: 'none', fontSize: 13, fontWeight: 400, color: 'var(--text2)', letterSpacing: 0 }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, width: 'auto', flexShrink: 0 }} />
                <span>I agree to the <a href="https://letsencrypt.org/documents/LE-SA-v1.3-September-21-2022.pdf" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Let's Encrypt Subscriber Agreement</a> and confirm I control this domain.</span>
              </label>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              <button className="btn btn-primary btn-lg" onClick={startOrder} disabled={loading || authLoading || !domain.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <><span className="spinner" /> Preparing...</> : <>Generate Free SSL <ArrowRight size={18} /></>}
              </button>
              {!authLoading && !user && <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>You need to <a href="/auth" style={{ color: 'var(--accent)' }}>sign in</a> to generate certificates</p>}
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: 'var(--text)' }}>How It Works</h2>
              {[['🌐', 'Enter Domain', 'Type your domain name and agree to terms.'], ['⚡', 'DNS Verification', 'Add a TXT record to prove ownership. Auto-added for Vercel domains.'], ['🔐', 'Certificate Issued', "Let's Encrypt signs and issues your certificate."], ['📦', 'Download Files', 'Get cert.pem, key.pem and fullchain.pem ready for your server.']].map(([icon, title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: 'var(--text)' }}>{title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: DNS Record */}
        {step === 1 && challenge && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>Add DNS TXT Record</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
                Add the record below to your DNS provider. {challenge.autoAdded ? <strong style={{ color: 'var(--green)' }}>✅ Auto-added to Vercel DNS!</strong> : 'Then click Verify.'}
              </p>

              {/* DNS Record Box */}
              <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                {[['Type', 'TXT'], ['Name', '_acme-challenge'], ['Value', challenge.txtValue], ['TTL', '300']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', marginBottom: 8 }}>
                    <span style={{ width: 50, fontSize: 11, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>{l}</span>
                    <span style={{ flex: 1, fontFamily: l === 'Value' ? 'var(--mono)' : 'inherit', fontSize: l === 'Value' ? 11 : 13, fontWeight: 600, wordBreak: 'break-all', color: 'var(--text)' }}>{v}</span>
                    <button onClick={() => copy(v, l)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === l ? 'var(--green)' : 'var(--text3)', padding: 4, flexShrink: 0 }}>
                      {copied === l ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>

              <div className="alert alert-warning" style={{ marginBottom: 20, fontSize: 12 }}>
                ⚠ Use <strong>_acme-challenge</strong> as the short name, not the full domain. Wait 1–5 mins after adding.
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button className="btn btn-primary" onClick={verifyDNS} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? <><span className="spinner" /> Checking DNS...</> : '✅ Verify DNS & Continue'}
                </button>
                <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
              </div>

              {/* Save and leave option */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Bell size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Need more time to add DNS?</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.6 }}>
                  Your order is saved. You can leave this page and come back to verify DNS anytime from <strong>My Certificates</strong>.
                </p>
                <button className="btn btn-secondary btn-sm" onClick={saveAndLeave}>
                  Go to Dashboard — Verify Later
                </button>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, color: 'var(--text)' }}>DNS Setup Guide</h2>
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(DNS_GUIDES).map(([key, g]) => (
                  <button key={key} onClick={() => setDnsTab(key)} className={`btn btn-sm ${dnsTab === key ? 'btn-primary' : 'btn-secondary'}`}>{g.label}</button>
                ))}
              </div>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {DNS_GUIDES[dnsTab].steps.map((s, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{s}</li>
                ))}
              </ol>
              <div className="alert alert-info" style={{ marginTop: 20, fontSize: 12 }}>
                💡 Check propagation at{' '}
                <a href={`https://dnschecker.org/#TXT/${challenge.challengeDomain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>dnschecker.org</a>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Issue Certificate */}
        {step === 2 && (
          <div style={{ maxWidth: 540 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: 'var(--shadow)' }}>
              <div className="alert alert-success" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={16} color="var(--green)" /> DNS verified! Domain ownership confirmed.
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: 'var(--text)' }}>Ready to Issue Certificate</h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Click below to generate your signed 90-day SSL certificate from Let's Encrypt.
              </p>
              {loading && <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}><span className="spinner spinner-dark" /> Issuing certificate... up to 30 seconds</div>}
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary btn-lg" onClick={finalize} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? <><span className="spinner" /> Issuing...</> : '🔐 Issue My Certificate'}
                </button>
                <button className="btn btn-secondary" onClick={() => setStep(0)}>Start Over</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Download */}
        {step === 3 && certResult && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 24, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="var(--green)" /> SSL Certificate issued for <strong>{certResult.domain}</strong> — valid for 90 days
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>📜 Certificate (cert.pem)</h3>
                <div className="output-box" style={{ maxHeight: 140, overflow: 'auto', marginBottom: 12 }}>{certResult.cert}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => download(certResult.cert, `${certResult.domain}-cert.pem`)}><Download size={13} /> Download</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(certResult.cert, 'cert')}>{copied === 'cert' ? <Check size={13} /> : <Copy size={13} />} Copy</button>
                </div>
              </div>
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>🔑 Private Key (key.pem)</h3>
                <div className="alert alert-warning" style={{ marginBottom: 10, fontSize: 12 }}>⚠ Save this now. Never share it.</div>
                <div className="output-box" style={{ maxHeight: 100, overflow: 'auto', marginBottom: 12 }}>{certResult.privateKey?.slice(0, 100)}...</div>
                <button className="btn btn-primary btn-sm" onClick={() => download(certResult.privateKey, `${certResult.domain}-key.pem`)}><Download size={13} /> Download</button>
              </div>
            </div>
            {certResult.fullchain && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>🔗 Full Chain — recommended for Nginx/Apache</h3>
                <div className="output-box" style={{ maxHeight: 80, overflow: 'auto', marginBottom: 12 }}>{certResult.fullchain?.slice(0, 100)}...</div>
                <button className="btn btn-primary btn-sm" onClick={() => download(certResult.fullchain, `${certResult.domain}-fullchain.pem`)}><Download size={13} /> Download fullchain.pem</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => {
                download(certResult.cert, `${certResult.domain}-cert.pem`)
                setTimeout(() => download(certResult.privateKey, `${certResult.domain}-key.pem`), 300)
                setTimeout(() => download(certResult.fullchain, `${certResult.domain}-fullchain.pem`), 600)
              }}><Download size={16} /> Download All Files</button>
              <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = '/dashboard'}><Shield size={16} /> View in Dashboard</button>
              <button className="btn btn-secondary" onClick={() => { setStep(0); setDomain(''); setCertResult(null); setChallenge(null); setError('') }}><RefreshCw size={16} /> Issue Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
