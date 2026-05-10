import { useState } from 'react'
import { Copy, Check, ArrowRight, RefreshCw, Download, Shield, Bell,
         CheckCircle, Globe, Lock, FileText, ChevronRight, AlertTriangle,
         Zap, Server, ExternalLink, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import '../styles/design-v2.css'

// ── Constants ─────────────────────────────────────────────────────────
const DNS_GUIDES = {
  cloudflare: { label:'Cloudflare', color:'#f97316', steps:[
    'dash.cloudflare.com → select your domain → DNS tab',
    'Click Add Record → set Type to TXT',
    'Name: _acme-challenge · Content: paste value below · TTL: Auto',
    'Save — usually propagates within 30 seconds',
  ]},
  godaddy: { label:'GoDaddy', color:'#00a4a6', steps:[
    'Login → My Products → DNS Management for your domain',
    'Add New Record → Type: TXT',
    'Name: _acme-challenge · Value: paste below · TTL: 600',
    'Save Changes — wait 1–2 minutes',
  ]},
  namecheap: { label:'Namecheap', color:'#de4b26', steps:[
    'Domain List → Manage → Advanced DNS tab',
    'Add New Record → TXT Record',
    'Host: _acme-challenge · Value: paste below · TTL: 300',
    'Save Changes',
  ]},
  vercel: { label:'Vercel', color:'#000000', steps:[
    'vercel.com → your domain → DNS tab',
    'Add Record → Type: TXT',
    'Name: _acme-challenge · Value: paste below',
    'Save — propagates instantly on Vercel',
  ]},
  other: { label:'Other DNS', color:'#6b7280', steps:[
    'Log in to your DNS provider dashboard',
    'Find DNS Records or Zone Editor',
    'Add new TXT record with name: _acme-challenge',
    'Paste the value below · TTL: 300 · Save',
  ]},
}

function genSession() { return crypto.randomUUID().replace(/-/g, '') }

// ── Small helpers ──────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy', size = 'sm' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button className={`v2-btn v2-btn-${size}`} onClick={copy}
      style={{ fontSize: size === 'sm' ? 11 : 12 }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function FieldRow({ label, value, mono = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
                  background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                  borderRadius:'var(--v2-r-md)', padding:'10px 14px' }}>
      <span style={{ width:46, fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
                      textTransform:'uppercase', letterSpacing:'0.4px', flexShrink:0 }}>{label}</span>
      <span style={{ flex:1, fontSize: mono ? 11 : 13, fontWeight:500,
                      fontFamily: mono ? 'var(--mono, monospace)' : 'inherit',
                      color:'var(--v2-text)', wordBreak:'break-all', lineHeight:1.5 }}>{value}</span>
      <CopyBtn text={value} />
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Domain', 'DNS', 'Issue', 'Download']
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display:'flex', alignItems:'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', display:'flex',
              alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
              flexShrink:0, transition:'all 0.2s',
              background: i < current ? 'var(--v2-green)' : i === current ? '#0a0a0a' : 'var(--v2-surface-3)',
              border: i < current ? '0.5px solid var(--v2-green)' : i === current ? '0.5px solid #0a0a0a' : '0.5px solid var(--v2-border)',
              color: i <= current ? 'white' : 'var(--v2-text-3)',
            }}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span style={{ fontSize:12, fontWeight: i === current ? 600 : 400,
                            color: i === current ? 'var(--v2-text)' : i < current ? 'var(--v2-green-text)' : 'var(--v2-text-3)',
                            whiteSpace:'nowrap' }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:'0.5px', margin:'0 12px',
                           background: i < current ? 'var(--v2-green)' : 'var(--v2-border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Download file card ─────────────────────────────────────────────────
function FileCard({ icon, title, badge, content, filename, warning }) {
  const [show, setShow] = useState(false)
  const dl = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type:'text/plain' }))
    a.download = filename; a.click()
  }
  return (
    <div className="v2-card" style={{ padding:'20px 22px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)',
                      background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'var(--v2-text-2)' }}>
          {icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{title}</div>
          <div style={{ fontSize:10, color:'var(--v2-text-3)', fontFamily:'monospace' }}>{filename}</div>
        </div>
        {badge && (
          <span className="v2-chip" style={{ fontSize:9, background:'var(--v2-green-bg)',
                                              color:'var(--v2-green-text)', border:'0.5px solid var(--v2-green-border)' }}>
            {badge}
          </span>
        )}
      </div>
      {warning && (
        <div className="v2-callout warning" style={{ marginBottom:12, fontSize:11 }}>
          <span style={{ fontWeight:600 }}>Keep this private.</span> Never commit or share your private key.
        </div>
      )}
      <div style={{ background:'#0a0a0a', borderRadius:'var(--v2-r-md)', padding:'10px 12px',
                    marginBottom:12, maxHeight:80, overflow:'hidden', position:'relative' }}>
        <pre style={{ margin:0, fontSize:9, fontFamily:'monospace', color:'#e5e5e5',
                      whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.5 }}>
          {content?.slice(0, 180)}…
        </pre>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:24,
                      background:'linear-gradient(to bottom,transparent,#0a0a0a)' }} />
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={dl}
          style={{ flex:1, justifyContent:'center', fontSize:11 }}>
          <Download size={10} /> Download {filename.split('-').pop()}
        </button>
        <CopyBtn text={content} label="Copy" />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function Generate({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const { isPro } = usePlan(user)
  const [step, setStep]           = useState(0)
  const [certType, setCertType]   = useState('single')
  const [domain, setDomain]       = useState(() => {
    const p = sessionStorage.getItem('prefill_domain')
    if (p) { sessionStorage.removeItem('prefill_domain'); return p }
    return ''
  })
  const [sessionId]               = useState(genSession)
  const [staging, setStaging]     = useState(false)
  const [agreed, setAgreed]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [challenge, setChallenge] = useState(null)
  const [certResult, setCertResult] = useState(null)
  const [dnsTab, setDnsTab]       = useState('cloudflare')

  const callAcme = async (action, extra = {}) => {
    const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action, sessionId,
        domain: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, ''),
        staging, user_id: user?.id, ...extra
      }),
    })
    const text = await res.text()
    try { return JSON.parse(text) } catch { return { error: text } }
  }

  const startOrder = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!d)      { setError('Please enter a domain name'); return }
    if (!agreed) { setError('Please accept the subscriber agreement'); return }
    setError(''); setLoading(true)
    const data = await callAcme('start').catch(e => ({ error: e.message }))
    setLoading(false)
    if (!data || data.error) { setError(data?.error || 'Failed to start — please try again.'); return }
    setChallenge(data); setStep(1)
  }

  const verifyDNS = async () => {
    setError(''); setLoading(true)
    const data = await callAcme('verify').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    if (!data.verified) { setError(data.message || 'TXT record not found yet — wait a minute and try again.'); return }
    setStep(2)
  }

  const finalize = async () => {
    setError(''); setLoading(true)
    const data = await callAcme('finalize').catch(e => ({ error: e.message }))
    setLoading(false)
    if (data.error) { setError(data.error); return }
    if (data.ok) {
        setCertResult(data)
        setStep(3)
        // Pro users: store key in KeyLocker vault
        if (isPro && data.privateKey) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/keylocker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ action: 'store', domain: data.domain, private_key_pem: data.privateKey, expires_at: data.expiresAt }),
            })
          } catch (e) { console.log('KeyLocker store non-fatal:', e) }
        }
      }
    else setError(data.message || 'Failed to issue certificate')
  }

  const dlAll = () => {
    const dl = (c, f) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([c], { type:'text/plain' }))
      a.download = f; a.click()
    }
    dl(certResult.cert,       `${certResult.domain}-cert.pem`)
    setTimeout(() => dl(certResult.privateKey,  `${certResult.domain}-key.pem`), 300)
    setTimeout(() => dl(certResult.fullchain,   `${certResult.domain}-fullchain.pem`), 600)
  }

  const reset = () => { setStep(0); setDomain(''); setCertResult(null); setChallenge(null); setError('') }

  // ── Not signed in ────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="v2-page" style={{ display:'flex', alignItems:'center',
                                         justifyContent:'center', minHeight:'70vh' }}>
        <div style={{ textAlign:'center', maxWidth:420, padding:'0 24px' }}>
          <div style={{ width:56, height:56, background:'#0a0a0a', borderRadius:'var(--v2-r-xl)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        margin:'0 auto 20px',
                        boxShadow:'0 0 0 8px rgba(16,185,129,0.08)' }}>
            <Shield size={26} color='white' />
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, color:'var(--v2-text)',
                        letterSpacing:'-0.4px', marginBottom:8 }}>Sign in to issue certificates</h2>
          <p style={{ fontSize:14, color:'var(--v2-text-2)', lineHeight:1.65, marginBottom:24 }}>
            SSLVault is free — a quick sign-in links your certificates to your account
            so you can monitor, renew, and install them from your dashboard.
          </p>
          <button className="v2-btn v2-btn-primary" style={{ padding:'11px 24px', fontSize:14 }}
            onClick={() => nav('/auth')}>
            <Shield size={14} /> Sign in free <ArrowRight size={13} />
          </button>
          <div style={{ marginTop:12 }}>
            <button className="v2-btn v2-btn-ghost" style={{ fontSize:12, color:'var(--v2-text-3)' }}
              onClick={() => nav('/')}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading auth ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="v2-page" style={{ display:'flex', alignItems:'center',
                                         justifyContent:'center', minHeight:'60vh' }}>
        <div style={{ textAlign:'center' }}>
          <RefreshCw size={20} className="spin" color='var(--v2-text-3)' />
        </div>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, background:'#0a0a0a', borderRadius:'var(--v2-r-lg)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          boxShadow:'0 0 0 4px rgba(16,185,129,0.1)' }}>
              <Shield size={18} color='white' />
            </div>
            <div>
              <h1 className="v2-h1">Issue SSL Certificate</h1>
              <p className="v2-subtitle">Let's Encrypt · 90-day validity · Free forever</p>
            </div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
                           fontSize:12, color:'var(--v2-text-3)', fontWeight:500,
                           background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                           borderRadius:'var(--v2-r-md)', padding:'6px 12px' }}>
            <input type="checkbox" checked={staging} onChange={e => setStaging(e.target.checked)}
              style={{ width:'auto', margin:0 }} />
            Test mode (staging)
          </label>
        </div>

        {/* Steps */}
        <Steps current={step} />

        {/* ── STEP 0: Domain entry ──────────────────────────────────── */}
        {step === 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:16, alignItems:'start' }}>

            {/* Left: form */}
            <div className="v2-card" style={{ padding:'28px 30px' }}>
              <div className="v2-section-label" style={{ marginBottom:14 }}>Certificate details</div>

              {/* Type toggle */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {[
                  { t:'single',   icon:<Globe size={14} />,  label:'Single domain',  sub:'example.com' },
                  { t:'wildcard', icon:<Zap size={14} />,    label:'Wildcard',        sub:'*.example.com' },
                ].map(({ t, icon, label, sub }) => (
                  <button key={t} onClick={() => {
                    setCertType(t)
                    if (t === 'wildcard' && domain && !domain.startsWith('*.')) setDomain('*.' + domain)
                    if (t === 'single'   && domain.startsWith('*.'))            setDomain(domain.slice(2))
                  }} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
                    borderRadius:'var(--v2-r-md)', cursor:'pointer', textAlign:'left',
                    fontFamily:'inherit', transition:'all 0.12s',
                    background: certType === t ? '#0a0a0a' : 'var(--v2-surface)',
                    border: certType === t ? '0.5px solid #0a0a0a' : '0.5px solid var(--v2-border)',
                    color: certType === t ? 'white' : 'var(--v2-text)',
                  }}>
                    <span style={{ opacity: certType === t ? 1 : 0.5 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:1 }}>{label}</div>
                      <div style={{ fontSize:10, opacity:0.6, fontFamily:'monospace' }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Domain input */}
              <div style={{ marginBottom:18 }}>
                <label className="v2-label">Domain name</label>
                <div style={{ position:'relative' }}>
                  <input
                    className="v2-input"
                    placeholder={certType === 'wildcard' ? '*.example.com' : 'example.com or sub.example.com'}
                    value={domain}
                    onChange={e => setDomain(e.target.value.replace(/^https?:\/\//, '').replace(/\/.*/, ''))}
                    onKeyDown={e => e.key === 'Enter' && startOrder()}
                    autoFocus
                    style={{ paddingLeft:36 }}
                  />
                  <Globe size={13} style={{ position:'absolute', left:12, top:'50%',
                                            transform:'translateY(-50%)', color:'var(--v2-text-3)',
                                            pointerEvents:'none' }} />
                </div>
                <div className="v2-label-help">Enter just the domain — no https:// needed</div>
              </div>

              {/* Agreement */}
              <label style={{ display:'flex', alignItems:'flex-start', gap:9, cursor:'pointer',
                               marginBottom:20, fontSize:13, color:'var(--v2-text-2)', lineHeight:1.55 }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop:3, width:'auto', flexShrink:0 }} />
                <span>
                  I agree to the{' '}
                  <a href="https://letsencrypt.org/documents/LE-SA-v1.3-September-21-2022.pdf"
                    target="_blank" rel="noopener noreferrer"
                    style={{ color:'var(--v2-text)', textDecoration:'underline',
                              textUnderlineOffset:2, fontWeight:500 }}>
                    Let's Encrypt Subscriber Agreement
                  </a>{' '}
                  and confirm I control this domain.
                </span>
              </label>

              {error && (
                <div className="v2-alert v2-alert-error" style={{ marginBottom:16 }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <button className="v2-btn v2-btn-primary"
                onClick={startOrder} disabled={loading || !domain.trim()}
                style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14 }}>
                {loading
                  ? <><RefreshCw size={13} className="spin" /> Preparing order…</>
                  : <><Shield size={13} /> Generate free certificate <ArrowRight size={13} /></>}
              </button>
            </div>

            {/* Right: how it works */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {/* Info card */}
              <div className="v2-card" style={{ padding:'22px 24px' }}>
                <div className="v2-section-label" style={{ marginBottom:14 }}>How it works</div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {[
                    { n:1, icon:<Globe size={13} />,    title:'Enter your domain',
                      desc:'Single domain or wildcard. No signup needed.' },
                    { n:2, icon:<FileText size={13} />, title:'DNS verification',
                      desc:'Add one TXT record to prove ownership.' },
                    { n:3, icon:<Lock size={13} />,     title:'Certificate issued',
                      desc:"Let's Encrypt signs your cert in seconds." },
                    { n:4, icon:<Download size={13} />, title:'Download & install',
                      desc:'cert.pem, key.pem, fullchain.pem ready.' },
                  ].map(({ n, icon, title, desc }, i, arr) => (
                    <div key={n} style={{ display:'flex', gap:12, padding:'12px 0',
                                           borderBottom: i < arr.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%',
                                    background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    flexShrink:0, color:'var(--v2-text-2)', fontSize:10, fontWeight:700 }}>
                        {n}
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)', marginBottom:2 }}>{title}</div>
                        <div style={{ fontSize:11, color:'var(--v2-text-3)', lineHeight:1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="v2-card" style={{ padding:'16px 20px' }}>
                {[
                  { icon:<CheckCircle size={12} />, text:'Trusted by all major browsers' },
                  { icon:<CheckCircle size={12} />, text:'90-day validity, auto-renewal available' },
                  { icon:<CheckCircle size={12} />, text:'No credit card, no limits, no ads' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display:'flex', alignItems:'center', gap:8,
                                            fontSize:12, color:'var(--v2-text-2)',
                                            padding:'5px 0' }}>
                    <span style={{ color:'var(--v2-green)', flexShrink:0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: DNS Record ────────────────────────────────────── */}
        {step === 1 && challenge && (
          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:16, alignItems:'start' }}>

            {/* Left: record + actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="v2-card" style={{ padding:'24px 26px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div className="v2-section-label">Add this DNS TXT record</div>
                  {challenge.autoAdded && (
                    <span className="v2-chip" style={{ background:'var(--v2-green-bg)',
                                                        color:'var(--v2-green-text)',
                                                        border:'0.5px solid var(--v2-green-border)' }}>
                      <Check size={9} /> Auto-added to Vercel
                    </span>
                  )}
                </div>
                <p style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:18, lineHeight:1.6 }}>
                  Add the record below to your DNS provider to prove you control{' '}
                  <span className="v2-chip-mono" style={{ fontSize:12 }}>{domain}</span>
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
                  <FieldRow label="Type"  value="TXT" />
                  <FieldRow label="Name"  value="_acme-challenge" />
                  <FieldRow label="Value" value={challenge.txtValue} mono />
                  <FieldRow label="TTL"   value="300" />
                </div>

                <div className="v2-callout warning" style={{ marginBottom:18, fontSize:12 }}>
                  <span style={{ fontWeight:600 }}>Use the short name</span> — enter{' '}
                  <span className="v2-kbd">_acme-challenge</span> not the full domain.
                  Wait 1–5 min after saving before verifying.
                </div>

                {error && (
                  <div className="v2-alert v2-alert-error" style={{ marginBottom:14 }}>
                    <AlertTriangle size={13} /> {error}
                  </div>
                )}

                <div style={{ display:'flex', gap:8 }}>
                  <button className="v2-btn v2-btn-primary" onClick={verifyDNS} disabled={loading}
                    style={{ flex:1, justifyContent:'center', padding:'10px', fontSize:13 }}>
                    {loading
                      ? <><RefreshCw size={12} className="spin" /> Checking DNS…</>
                      : <><CheckCircle size={12} /> Verify DNS &amp; continue</>}
                  </button>
                  <button className="v2-btn" onClick={() => setStep(0)} style={{ fontSize:12 }}>
                    ← Back
                  </button>
                </div>
              </div>

              {/* Save & leave */}
              <div className="v2-callout info" style={{ fontSize:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                  <Bell size={12} color='#2563eb' />
                  <span style={{ fontWeight:600, color:'var(--v2-text)', fontSize:13 }}>
                    Need more time?
                  </span>
                </div>
                Your order is saved — leave this page and verify DNS later from your dashboard.
                <div style={{ marginTop:8 }}>
                  <button className="v2-btn v2-btn-sm" onClick={() => nav('/dashboard')}
                    style={{ fontSize:11 }}>
                    Go to Dashboard → verify later
                  </button>
                </div>
              </div>
            </div>

            {/* Right: DNS guide */}
            <div className="v2-card" style={{ padding:'22px 24px' }}>
              <div className="v2-section-label" style={{ marginBottom:14 }}>DNS setup guide</div>

              {/* Provider tabs */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:18 }}>
                {Object.entries(DNS_GUIDES).map(([key, g]) => (
                  <button key={key} onClick={() => setDnsTab(key)}
                    className={`v2-filter-chip ${dnsTab === key ? 'active' : ''}`}
                    style={{ fontSize:11 }}>
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Steps */}
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {DNS_GUIDES[dnsTab].steps.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'11px 0',
                                         borderBottom: i < DNS_GUIDES[dnsTab].steps.length - 1
                                           ? '0.5px solid var(--v2-border)' : 'none' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--v2-surface-3)',
                                   border:'0.5px solid var(--v2-border)', display:'flex',
                                   alignItems:'center', justifyContent:'center',
                                   fontSize:10, fontWeight:700, color:'var(--v2-text-3)', flexShrink:0 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.6 }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* DNS checker link */}
              {challenge?.challengeDomain && (
                <a href={`https://dnschecker.org/#TXT/${challenge.challengeDomain}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:16,
                            fontSize:12, color:'var(--v2-text-2)', textDecoration:'none',
                            background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                            borderRadius:'var(--v2-r-md)', padding:'7px 12px' }}>
                  <ExternalLink size={11} /> Check DNS propagation on dnschecker.org
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Issue ────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ maxWidth:520 }}>
            <div className="v2-card" style={{ padding:'32px 36px' }}>
              {/* DNS confirmed banner */}
              <div className="v2-detail-banner" style={{ marginBottom:24 }}>
                <CheckCircle size={14} />
                DNS verified — ownership of <strong>{domain}</strong> confirmed.
              </div>

              <h2 style={{ fontSize:20, fontWeight:700, color:'var(--v2-text)',
                            letterSpacing:'-0.4px', marginBottom:8 }}>
                Ready to issue
              </h2>
              <p style={{ fontSize:14, color:'var(--v2-text-2)', lineHeight:1.7, marginBottom:28 }}>
                Click below to generate your signed 90-day SSL certificate from Let's Encrypt.
                This takes up to 30 seconds.
              </p>

              {loading && (
                <div className="v2-alert v2-alert-info" style={{ marginBottom:18,
                                                                    display:'flex', alignItems:'center', gap:10 }}>
                  <RefreshCw size={13} className="spin" />
                  Issuing certificate — talking to Let's Encrypt…
                </div>
              )}
              {error && (
                <div className="v2-alert v2-alert-error" style={{ marginBottom:18 }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button className="v2-btn v2-btn-primary" onClick={finalize} disabled={loading}
                  style={{ flex:1, justifyContent:'center', padding:'12px', fontSize:14 }}>
                  {loading
                    ? <><RefreshCw size={13} className="spin" /> Issuing…</>
                    : <><Lock size={14} /> Issue my certificate</>}
                </button>
                <button className="v2-btn" onClick={reset} style={{ fontSize:12 }}>
                  Start over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Download ─────────────────────────────────────── */}
        {step === 3 && certResult && (
          <div>
            {/* Success header */}
            <div className="v2-card" style={{ padding:'20px 24px', marginBottom:16,
                                               borderTop:'2px solid var(--v2-green)',
                                               display:'flex', alignItems:'center',
                                               justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, background:'var(--v2-green)',
                               borderRadius:'var(--v2-r-lg)', display:'flex',
                               alignItems:'center', justifyContent:'center',
                               boxShadow:'0 0 0 6px rgba(16,185,129,0.12)' }}>
                  <CheckCircle size={20} color='white' />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--v2-text)' }}>
                    Certificate issued successfully
                  </div>
                  <div className="v2-mono" style={{ fontSize:12, color:'var(--v2-green-text)' }}>
                    {certResult.domain} · valid 90 days
                  </div>
                </div>
              </div>
              <button className="v2-btn v2-btn-primary" onClick={dlAll}
                style={{ fontSize:13, padding:'10px 18px' }}>
                <Download size={13} /> Download all files
              </button>
            </div>

            {/* File cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
              <FileCard
                icon={<FileText size={15} />}
                title="Certificate"
                badge="Public"
                content={certResult.cert}
                filename={`${certResult.domain}-cert.pem`}
              />
              <FileCard
                icon={<Lock size={15} />}
                title="Private Key"
                badge="Keep secret"
                content={certResult.privateKey}
                filename={`${certResult.domain}-key.pem`}
                warning
              />
              {certResult.fullchain && (
                <FileCard
                  icon={<Shield size={15} />}
                  title="Full Chain"
                  badge="Recommended"
                  content={certResult.fullchain}
                  filename={`${certResult.domain}-fullchain.pem`}
                />
              )}
            </div>

            {/* Next step callout */}
            <div className="v2-callout tip" style={{ marginBottom:16 }}>
              <div className="v2-callout-title">What's next?</div>
              Install using the <strong>persistent agent</strong> for zero-touch deployment, or follow the manual
              install guide for Nginx, Apache, or cPanel.
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="v2-btn v2-btn-primary" style={{ fontSize:13, padding:'10px 18px' }}
                onClick={() => nav('/dashboard')}>
                <Shield size={13} /> View in dashboard
              </button>
              <button className="v2-btn" style={{ fontSize:13, padding:'10px 18px' }}
                onClick={() => nav('/install')}>
                <Server size={13} /> Install guide
              </button>
              <button className="v2-btn" style={{ fontSize:13, padding:'10px 18px' }}
                onClick={reset}>
                <RefreshCw size={13} /> Issue another
              </button>
            </div>
          </div>
        )}

      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
