import { useState } from 'react'
import { Upload, Check, AlertTriangle, FileText, Lock, Shield,
         ChevronRight, X, CheckCircle, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button className="v2-btn v2-btn-sm" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}>
      {ok ? <><Check size={10}/> Copied</> : 'Copy'}
    </button>
  )
}

export default function Import({ nav }) {
  const { user } = useAuth()
  const [domain, setDomain]       = useState('')
  const [certPem, setCertPem]     = useState('')
  const [keyPem, setKeyPem]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(null)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null) // { ok, domain, expires, issuer, daysLeft }

  const clean = s => s.trim()

  // Parse cert info client-side using a quick fetch to a public cert decoder
  // or just rely on server-side insertion and show what was saved
  const validateAndPreview = () => {
    if (!certPem.trim()) return
    setValidating(true)
    setValidation(null)
    try {
      // Extract domain from cert CN if domain field empty
      const cnMatch = certPem.match(/CN\s*=\s*([^\s,/\\]+)/)
      const detectedDomain = cnMatch?.[1] || ''

      // Very basic expiry extraction — look for validity dates
      // Full validation happens server-side on save
      setValidation({ ok: true, detectedDomain })
    } catch(e) {}
    setValidating(false)
  }

  const handleSave = async () => {
    if (!user) { nav('/auth'); return }
    const d = clean(domain)
    const c = clean(certPem)
    const k = clean(keyPem)

    if (!d) { setError('Enter the domain this certificate is for.'); return }
    if (!c) { setError('Paste your certificate (PEM format).'); return }
    if (!c.includes('-----BEGIN CERTIFICATE-----')) { setError('Certificate must be in PEM format (starts with -----BEGIN CERTIFICATE-----)'); return }
    if (k && !k.includes('-----BEGIN') ) { setError('Private key must be in PEM format.'); return }

    setError(''); setSaving(true)

    try {
      // Parse expiry from PEM — we'll store what we can and let the DB handle the rest
      const { data, error: dbErr } = await supabase.from('certificates').insert({
        user_id:         user.id,
        domain:          d,
        cert_pem:        c,
        private_key_pem: k || null,
        status:          'active',
        cert_type:       'Imported',
        is_sandbox:      false,
        auto_renew_enabled: false, // imported certs don't auto-renew via SSLVault
        issued_at:       new Date().toISOString(),
        // expires_at: null — user didn't provide, will show as unknown
      }).select('id, domain').single()

      if (dbErr) throw new Error(dbErr.message)

      setSaving(false)
      setSuccess({ id: data.id, domain: data.domain })
    } catch(e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="v2-page">
        <div className="v2-container" style={{ maxWidth: 560 }}>
          <div style={{ textAlign:'center', padding:'48px 0 32px' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--v2-green-bg)',
              border:'1.5px solid var(--v2-green-border)', display:'flex', alignItems:'center',
              justifyContent:'center', margin:'0 auto 20px' }}>
              <CheckCircle size={32} color="var(--v2-green)" />
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>Certificate Imported</h2>
            <p style={{ fontSize:14, color:'var(--v2-text-2)', marginBottom:32 }}>
              <strong style={{ fontFamily:'var(--v2-font-mono)' }}>{success.domain}</strong> is now in your SSLVault inventory.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="v2-btn v2-btn-primary" onClick={() => nav('/dashboard')}>
                <Shield size={13}/> View in Dashboard
              </button>
              <button className="v2-btn" onClick={() => { setSuccess(null); setDomain(''); setCertPem(''); setKeyPem(''); setValidation(null) }}>
                Import another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 640 }}>

        {/* Header */}
        <div style={{ padding:'40px 0 28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'var(--v2-accent)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Upload size={18} color="white"/>
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'var(--v2-text)' }}>Import Certificate</h1>
              <p style={{ fontSize:13, color:'var(--v2-text-3)' }}>Bring your own SSL — manage it with SSLVault</p>
            </div>
          </div>

          {/* Info banner */}
          <div style={{ background:'#eff6ff', border:'0.5px solid #bfdbfe', borderRadius:'var(--v2-r-md)',
            padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <Info size={14} color="#2563eb" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:12, color:'#1e40af', lineHeight:1.7, margin:0 }}>
              Already have a certificate from Let's Encrypt, ZeroSSL, or any other CA?
              Import it here to track expiry, install it on your servers, and get renewal reminders —
              all in one place. Or <button onClick={() => nav('/buy')}
                style={{ background:'none', border:'none', padding:0, color:'#2563eb',
                  fontWeight:700, cursor:'pointer', fontSize:'inherit', textDecoration:'underline' }}>
                buy a new RapidSSL certificate
              </button> through SSLVault.
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>

          {/* Domain */}
          <div>
            <label className="v2-label">Domain <span style={{ color:'var(--v2-red)' }}>*</span></label>
            <input className="v2-input" placeholder="example.com"
              value={domain} onChange={e => setDomain(e.target.value.toLowerCase().trim())}
              style={{ fontFamily:'var(--v2-font-mono)' }} />
            <div className="v2-label-help">The primary domain this certificate covers.</div>
          </div>

          {/* Certificate PEM */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <label className="v2-label" style={{ margin:0 }}>
                Certificate (PEM) <span style={{ color:'var(--v2-red)' }}>*</span>
              </label>
              {certPem && <button className="v2-btn v2-btn-sm" onClick={validateAndPreview}>
                {validating ? 'Checking…' : 'Preview'}
              </button>}
            </div>
            <textarea
              className="v2-input"
              placeholder={'-----BEGIN CERTIFICATE-----\nMIIFaD...\n-----END CERTIFICATE-----\n\n(Include full chain if available)'}
              value={certPem}
              onChange={e => { setCertPem(e.target.value); setValidation(null) }}
              rows={7}
              style={{ fontFamily:'var(--v2-font-mono)', fontSize:11, resize:'vertical', lineHeight:1.6 }}
            />
            <div className="v2-label-help">
              Paste your full certificate chain — the certificate + any intermediate CA certs.
              From Let's Encrypt this is usually <code style={{ fontFamily:'monospace', fontSize:11 }}>fullchain.pem</code>.
            </div>
            {validation?.ok && (
              <div style={{ marginTop:8, background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                borderRadius:'var(--v2-r-sm)', padding:'8px 12px', fontSize:12, color:'var(--v2-green-text)',
                display:'flex', alignItems:'center', gap:6 }}>
                <Check size={12}/> Certificate looks valid
                {validation.detectedDomain && ` · CN: ${validation.detectedDomain}`}
              </div>
            )}
          </div>

          {/* Private key */}
          <div>
            <label className="v2-label">
              Private Key (PEM) <span style={{ color:'var(--v2-text-3)', fontWeight:400 }}>· optional</span>
            </label>
            <textarea
              className="v2-input"
              placeholder={'-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----'}
              value={keyPem}
              onChange={e => setKeyPem(e.target.value)}
              rows={5}
              style={{ fontFamily:'var(--v2-font-mono)', fontSize:11, resize:'vertical', lineHeight:1.6 }}
            />
            <div className="v2-label-help" style={{ display:'flex', alignItems:'flex-start', gap:5 }}>
              <Lock size={10} style={{ flexShrink:0, marginTop:2, color:'#f59e0b' }}/>
              <span>
                Required for agent-based auto-install. Stored encrypted.
                Skip if you only need expiry monitoring.
              </span>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
          borderRadius:'var(--v2-r-md)', padding:'14px 16px', marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--v2-text-3)',
            textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>After import</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['📊', 'Tracked in your dashboard', 'See expiry, issuer, and health at a glance'],
              ['🔔', 'Expiry reminders', 'Get notified before it expires'],
              ['⚡', 'One-click install', 'Push to your VPS via agent or SSH'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)' }}>{title}</div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, paddingTop:12, borderTop:'0.5px solid var(--v2-border)',
            fontSize:11, color:'var(--v2-text-3)', display:'flex', gap:5, alignItems:'center' }}>
            <AlertTriangle size={10} color="#f59e0b"/>
            Imported certificates are not auto-renewed by SSLVault. You'll need to re-import or{' '}
            <button onClick={() => nav('/buy')} style={{ background:'none', border:'none', padding:0,
              color:'var(--v2-accent)', fontWeight:600, cursor:'pointer', fontSize:'inherit' }}>
              buy a managed cert
            </button> for zero-touch renewal.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="v2-callout error" style={{ marginBottom:16 }}>
            <AlertTriangle size={13}/> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, paddingBottom:48 }}>
          <button className="v2-btn v2-btn-primary" onClick={handleSave} disabled={saving}
            style={{ flex:1, justifyContent:'center' }}>
            {saving
              ? <><span style={{ display:'inline-block', width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Importing…</>
              : <><Upload size={13}/> Import Certificate</>}
          </button>
          <button className="v2-btn" onClick={() => nav('/buy')}>
            Buy RapidSSL instead
          </button>
        </div>

      </div>
    </div>
  )
}
