import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Loader, Copy, Check, Download, ArrowRight, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const ISSUE_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/gogetssl-issue'
const DNS_FN   = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'

const PROVIDERS = {
  cloudflare:   { name: 'Cloudflare',   fields: [{ k: 'apiToken',  l: 'API Token',  p: 'Zone:DNS:Edit token' }] },
  godaddy:      { name: 'GoDaddy',      fields: [{ k: 'apiKey',    l: 'API Key',    p: 'key' }, { k: 'apiSecret', l: 'API Secret', p: 'secret' }] },
  vercel:       { name: 'Vercel',       fields: [{ k: 'apiToken',  l: 'API Token',  p: 'vercel-token' }, { k: 'teamId', l: 'Team ID (optional)', p: 'team_xxx' }] },
  digitalocean: { name: 'DigitalOcean', fields: [{ k: 'apiToken',  l: 'API Token',  p: 'do-token' }] },
  manual:       { name: 'Manual DNS',   fields: [] },
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  const copy = () => { try { navigator.clipboard.writeText(text) } catch(e) {}; setOk(true); setTimeout(() => setOk(false), 2000) }
  return (
    <button onClick={copy} className="v2-btn" style={{ fontSize:12 }}>
      {ok ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
    </button>
  )
}

function Note({ type = 'info', children }) {
  const v = type === 'warn' ? 'warning' : type === 'success' ? 'tip' : type === 'error' ? 'error' : 'info'
  return <div className={`v2-callout ${v}`} style={{ marginBottom: 10 }}>{children}</div>
}

export default function QuickSetup({ nav }) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const [step, setStep]         = useState(1)
  const [domain, setDomain]     = useState('')
  const [provider, setProvider] = useState('cloudflare')
  const [creds, setCreds]       = useState({})
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [savedCred, setSavedCred] = useState(null)
  const [dcvInfo, setDcvInfo]   = useState(null)  // { type, host, value, autoAdded }
  const [certData, setCertData] = useState(null)
  const [orderId, setOrderId]   = useState(null)

  const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

  // Auto-load saved credentials
  useEffect(() => {
    if (!user || provider === 'manual') return
    fetch(DNS_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', user_id: user.id })
    }).then(r => r.json()).then(data => {
      if (!data.credentials) return
      const match = data.credentials.find(c => c.provider === provider)
      setSavedCred(match || null)
    }).catch(() => {})
  }, [provider, user])

  const handleStart = async () => {
    if (!d) { setError('Enter a domain name'); return }
    if (!d.includes('.')) { setError('Enter a valid domain (e.g. example.com)'); return }
    setError(''); setLoading(true)
    try {
      // Save/validate DNS credentials if new ones entered
      if (provider !== 'manual' && user) {
        const hasManualCreds = Object.values(creds).some(v => v)
        if (hasManualCreds) {
          const vRes = await fetch(DNS_FN, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save', user_id: user.id, provider, domain_pattern: d, credentials: creds, label: d })
          })
          const vData = await vRes.json()
          if (vData.error) { setError('DNS credential error: ' + vData.error); setLoading(false); return }
        } else if (!savedCred) {
          setError('Enter DNS provider credentials or save them in More → DNS Providers first')
          setLoading(false); return
        }
      }
      // Request certificate issuance via RapidSSL (TSS)
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      const res = await fetch(ISSUE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'start_quick', domain: d, provider: provider !== 'manual' ? provider : null, user_id: user?.id })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setDcvInfo(data.dcv)
      setOrderId(data.order_id)
      setStep(2)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const handleVerify = async () => {
    setError(''); setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      const res = await fetch(ISSUE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'verify_quick', domain: d, order_id: orderId, user_id: user?.id })
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || data.message || 'DNS not ready yet — wait 1–2 min and try again.'); setLoading(false); return }
      setCertData(data.cert)
      setStep(3)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const dl = (content, filename) => {
    if (!content) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }

  const STEPS = ['Domain & DNS', 'Verify & Issue', 'Download & Install']

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 660 }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', padding: '8px 0 28px' }}>
          <h1 className="v2-h1" style={{ fontSize:26, letterSpacing: '-0.5px' }}>Quick Setup</h1>
          <p className="v2-subtitle" style={{ fontSize:13, marginTop: 4 }}>
            Domain → DNS validation → Certificate issued — in one flow
          </p>
        </div>

        {/* PROGRESS */}
        <div className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'center', marginBottom: 24, padding: '12px 20px', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: step > i + 1 ? 'var(--v2-green)' : step === i + 1 ? 'var(--v2-text)' : 'var(--v2-surface-3)',
                  color: step >= i + 1 ? '#000000' : 'var(--v2-text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize:11, fontWeight: 700, flexShrink: 0
                }}>
                  {step > i + 1 ? <CheckCircle size={13}/> : i + 1}
                </div>
                <span style={{ fontSize:11, fontWeight: 600, color: step >= i + 1 ? 'var(--v2-text)' : 'var(--v2-text-3)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: step > i + 1 ? 'var(--v2-green)' : 'var(--v2-border)', margin: '0 10px', borderRadius: 1 }}/>
              )}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="v2-card v2-card-pad">
            <h2 style={{ fontSize:17, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>Enter your domain</h2>
            <p style={{ fontSize:13, color: '#e8e0d8', marginBottom: 20 }}>We'll issue your RapidSSL certificate and handle DNS validation.</p>

            <label className="v2-label">Domain Name</label>
            <input className="v2-input" value={domain} onChange={e => setDomain(e.target.value)}
                   placeholder="example.com" style={{ marginBottom: 20 }} autoComplete="off"/>

            <label className="v2-label">DNS Provider (for automatic validation)</label>
            <select className="v2-input" value={provider} onChange={e => { setProvider(e.target.value); setCreds({}) }} style={{ marginBottom: 8 }}>
              {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <p className="v2-label-help" style={{ marginBottom: 16 }}>
              {provider === 'manual' ? 'You will add the DNS validation record manually' : 'SSLVault will add the DNS validation record automatically'}
            </p>

            {provider !== 'manual' && savedCred && (
              <Note type="success"><CheckCircle size={13} style={{ flexShrink: 0 }}/> Using saved <strong>{PROVIDERS[provider]?.name}</strong> credentials.</Note>
            )}
            {provider !== 'manual' && !savedCred && (
              <Note type="warn">No saved credentials for {PROVIDERS[provider]?.name}. Enter below or save them in <button onClick={() => nav('/integrations')} className="v2-btn" style={{ padding: '0', border: 'none', background: 'none', color: 'var(--v2-green)', fontSize:12, cursor: 'pointer', display: 'inline', fontWeight: 600 }}>More → DNS Providers</button>.</Note>
            )}
            {provider !== 'manual' && !savedCred && PROVIDERS[provider].fields.map(f => (
              <div key={f.k} style={{ marginBottom: 14 }}>
                <label className="v2-label">{f.l}</label>
                <input className="v2-input" type="password" placeholder={f.p}
                       value={creds[f.k] || ''} onChange={e => setCreds(c => ({ ...c, [f.k]: e.target.value }))}
                       autoComplete="new-password"/>
              </div>
            ))}

            {provider !== 'manual' && (
              <Note type="info">Credentials are AES-256-GCM encrypted and saved for future auto-renewals.</Note>
            )}

            {error && <Note type="error">{error}</Note>}

            <button className="v2-btn v2-btn-primary" onClick={handleStart} disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', fontSize:14, padding: '11px' }}>
              {loading ? <><Loader size={14} className="spin"/> Processing...</> : <>Issue Certificate <ArrowRight size={14}/></>}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && dcvInfo && (
          <div className="v2-card v2-card-pad">
            {dcvInfo.autoAdded ? (
              <>
                <Note type="success"><CheckCircle size={13}/> DNS validation record added automatically via {PROVIDERS[provider]?.name}.</Note>
                <h2 style={{ fontSize:17, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>Issue your certificate</h2>
                <p style={{ fontSize:13, color: '#e8e0d8', marginBottom: 20 }}>DNS is ready. Click below to complete issuance.</p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize:17, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>Add DNS validation record</h2>
                <p style={{ fontSize:13, color: '#e8e0d8', marginBottom: 16 }}>Add this record to your DNS provider, then click Verify.</p>
                <div className="v2-code" style={{ marginBottom: 12 }}>
                  <div className="v2-code-head">
                    <div className="v2-code-dots"><span style={{ background: '#f87171' }}/><span style={{ background: '#f0ede8' }}/><span style={{ background: '#f0ede8' }}/></div>
                  </div>
                  <pre>{`TYPE    ${dcvInfo.type || 'CNAME'}
NAME    ${dcvInfo.host || '_acme-challenge'}
VALUE   ${dcvInfo.value || ''}
TTL     300`}</pre>
                </div>
                <div style={{ marginBottom: 16 }}><CopyBtn text={dcvInfo.value || ''}/></div>
                <Note type="warn">Enter only <strong>{dcvInfo.host || '_acme-challenge'}</strong> in the Name field — your DNS provider adds the domain automatically.</Note>
              </>
            )}

            {error && <Note type="error">{error}</Note>}

            <button className="v2-btn v2-btn-primary" onClick={handleVerify} disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', fontSize:14, padding: '11px' }}>
              {loading ? <><Loader size={14} className="spin"/> Verifying...</>
                       : <>{dcvInfo.autoAdded ? 'Issue Certificate' : 'Verify DNS & Issue'} <ArrowRight size={14}/></>}
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="v2-card v2-card-pad" style={{ border: '1.5px solid var(--v2-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} color="var(--v2-green)"/>
                </div>
                <div>
                  <h2 style={{ fontSize:18, fontWeight: 700, color: 'var(--v2-green)', marginBottom: 2 }}>Certificate Issued</h2>
                  <p style={{ fontSize:12, color: '#b0a8a0', margin: 0 }}>{d}</p>
                </div>
              </div>
              <p style={{ fontSize:12, color: '#e8e0d8', marginBottom: 14, lineHeight: 1.7 }}>
                Your certificate is saved in <strong>Dashboard</strong>. Download the files below or install directly from the cert row.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {certData?.fullchain && (
                  <button className="v2-btn v2-btn-primary" onClick={() => dl(certData.fullchain, d + '-fullchain.pem')} style={{ fontSize:12 }}>
                    <Download size={12}/> fullchain.pem
                  </button>
                )}
                {certData?.privateKey && (
                  <button className="v2-btn" onClick={() => dl(certData.privateKey, d + '-key.pem')} style={{ fontSize:12 }}>
                    <Download size={12}/> key.pem
                  </button>
                )}
              </div>
            </div>

            <div className="v2-card v2-card-pad">
              <h3 style={{ fontWeight: 600, fontSize:14, color: '#ffffff', marginBottom: 12 }}>Install on your server</h3>
              <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 10, marginBottom: 12 }}>
                <div className="v2-card v2-card-pad" style={{ cursor: 'pointer', background: 'var(--v2-surface-2)' }} onClick={() => nav('/dashboard')}>
                  <div style={{ fontSize:13, fontWeight: 600, color: '#ffffff', marginBottom: 3 }}>VPS / Cloud</div>
                  <div style={{ fontSize:11, color: '#b0a8a0' }}>Persistent agent — one click deploy</div>
                </div>
                <div className="v2-card v2-card-pad" style={{ cursor: 'pointer', background: 'var(--v2-surface-2)' }} onClick={() => nav('/shared-hosting')}>
                  <div style={{ fontSize:13, fontWeight: 600, color: '#ffffff', marginBottom: 3 }}>cPanel / Shared</div>
                  <div style={{ fontSize:11, color: '#b0a8a0' }}>PHP agent — no SSH needed</div>
                </div>
              </div>
              <p style={{ fontSize:11, color: '#b0a8a0', margin: 0 }}>Go to Dashboard → {d} → Install</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="v2-btn v2-btn-primary" onClick={() => nav('/dashboard')} style={{ flex: 1, justifyContent: 'center', fontSize:13 }}>
                <Shield size={13}/> My Dashboard
              </button>
              <button className="v2-btn" onClick={() => { setStep(1); setDomain(''); setCertData(null); setError(''); setCreds({}); setDcvInfo(null) }} style={{ fontSize:13 }}>
                <RotateCcw size={13}/> New Certificate
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
