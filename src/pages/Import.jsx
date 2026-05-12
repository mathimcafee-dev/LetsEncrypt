import { useState } from 'react'
import { Upload, Check, AlertTriangle, Lock, Shield,
         CheckCircle, Info, FileText, ArrowRight, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

export default function Import({ nav }) {
  const { user } = useAuth()
  const [domain, setDomain]   = useState('')
  const [certPem, setCertPem] = useState('')
  const [keyPem, setKeyPem]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(null)

  const clean = s => s.trim()

  const handleSave = async () => {
    if (!user) { nav('/auth'); return }
    const d = clean(domain)
    const c = clean(certPem)
    const k = clean(keyPem)
    if (!d) { setError('Enter the domain this certificate is for.'); return }
    if (!c) { setError('Paste your certificate in PEM format.'); return }
    if (!c.includes('-----BEGIN CERTIFICATE-----')) { setError('Certificate must be in PEM format (starts with -----BEGIN CERTIFICATE-----)'); return }
    if (k && !k.includes('-----BEGIN')) { setError('Private key must be in PEM format.'); return }
    setError(''); setSaving(true)
    try {
      const { data, error: dbErr } = await supabase.from('certificates').insert({
        user_id: user.id, domain: d, cert_pem: c,
        private_key_pem: k || null,
        status: 'active', cert_type: 'Imported',
        is_sandbox: false, auto_renew_enabled: false,
        issued_at: new Date().toISOString(),
      }).select('id, domain').single()
      if (dbErr) throw new Error(dbErr.message)
      setSaving(false)
      setSuccess({ id: data.id, domain: data.domain })
    } catch(e) { setError(e.message); setSaving(false) }
  }

  if (success) {
    return (
      <div className="v2-page">
        <div className="v2-container" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: 'center', padding: '64px 0 32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%',
              background: 'var(--v2-green-bg)', border: '1.5px solid var(--v2-green-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={30} color="var(--v2-green)" strokeWidth={2}/>
            </div>
            <h2 className="v2-h1" style={{ marginBottom: 8 }}>Certificate Imported</h2>
            <p style={{ fontSize: 14, color: 'var(--v2-text-2)', marginBottom: 32, lineHeight: 1.6 }}>
              <strong style={{ fontFamily: 'var(--v2-font-mono)' }}>{success.domain}</strong> is now in your SSLVault inventory.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="v2-btn v2-btn-primary" onClick={() => nav('/dashboard')}>
                <Shield size={13}/> View in Dashboard
              </button>
              <button className="v2-btn" onClick={() => { setSuccess(null); setDomain(''); setCertPem(''); setKeyPem('') }}>
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
      <div className="v2-container">

        {/* Page header */}
        <div style={{ padding: '32px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--v2-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} color="white"/>
            </div>
            <div>
              <h1 className="v2-h1" style={{ marginBottom: 0 }}>Import Certificate</h1>
              <p className="v2-subtitle" style={{ marginBottom: 0 }}>Bring your own SSL — manage it with SSLVault</p>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* LEFT — form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Info callout */}
            <div className="v2-callout tip" style={{ marginBottom: 0 }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>
                Already have a cert from Let's Encrypt, ZeroSSL, or any CA? Import it to track expiry and push to your servers.{' '}
                <button onClick={() => nav('/buy')} style={{ background: 'none', border: 'none', padding: 0,
                  color: 'var(--v2-accent)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}>
                  Buy a new RapidSSL cert →
                </button>
              </span>
            </div>

            {/* Domain */}
            <div className="v2-card v2-card-pad">
              <div className="v2-section-label" style={{ marginBottom: 10 }}>Domain</div>
              <div className="v2-field">
                <label className="v2-label">Common Name <span style={{ color: 'var(--v2-red)' }}>*</span></label>
                <input className="v2-input" placeholder="example.com"
                  value={domain} onChange={e => setDomain(e.target.value.toLowerCase().trim())}
                  style={{ fontFamily: 'var(--v2-font-mono)' }}/>
                <div className="v2-label-help">Primary domain this certificate covers.</div>
              </div>
            </div>

            {/* Certificate PEM */}
            <div className="v2-card v2-card-pad">
              <div className="v2-section-label" style={{ marginBottom: 10 }}>Certificate (PEM)</div>
              <div className="v2-field">
                <label className="v2-label">Certificate chain <span style={{ color: 'var(--v2-red)' }}>*</span></label>
                <textarea className="v2-input"
                  placeholder={'-----BEGIN CERTIFICATE-----\nMIIF...\n-----END CERTIFICATE-----\n\nInclude full chain if available'}
                  value={certPem} onChange={e => setCertPem(e.target.value)}
                  rows={7}
                  style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 11, resize: 'vertical', lineHeight: 1.6 }}/>
                <div className="v2-label-help">
                  Paste the full chain — certificate + intermediates. From Let's Encrypt this is <code style={{ fontFamily: 'monospace', fontSize: 11 }}>fullchain.pem</code>.
                </div>
              </div>
            </div>

            {/* Private Key */}
            <div className="v2-card v2-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="v2-section-label">Private Key (PEM)</div>
                <span style={{ fontSize: 10, color: 'var(--v2-text-3)', fontWeight: 500 }}>Optional</span>
              </div>
              <div className="v2-field">
                <label className="v2-label">Private key</label>
                <textarea className="v2-input"
                  placeholder={'-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----'}
                  value={keyPem} onChange={e => setKeyPem(e.target.value)}
                  rows={5}
                  style={{ fontFamily: 'var(--v2-font-mono)', fontSize: 11, resize: 'vertical', lineHeight: 1.6 }}/>
                <div className="v2-label-help" style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                  <Lock size={10} style={{ flexShrink: 0, marginTop: 2, color: 'var(--v2-amber)' }}/>
                  <span>Required for agent-based auto-install. Stored encrypted with AES-256-GCM. Skip if you only need expiry monitoring.</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="v2-callout error">
                <AlertTriangle size={13} style={{ flexShrink: 0 }}/> {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, paddingBottom: 48 }}>
              <button className="v2-btn v2-btn-primary" onClick={handleSave} disabled={saving}
                style={{ flex: 1, justifyContent: 'center' }}>
                {saving
                  ? <><RefreshCw size={13} className="spin"/> Importing…</>
                  : <><Upload size={13}/> Import Certificate</>}
              </button>
              <button className="v2-btn" onClick={() => nav('/buy')}>
                Buy RapidSSL instead
              </button>
            </div>
          </div>

          {/* RIGHT — summary panel */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>

              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
                  After import
                </div>
                {[
                  { icon: <FileText size={13}/>, title: 'Tracked in inventory', desc: 'Expiry, issuer, health at a glance' },
                  { icon: <Shield size={13}/>,   title: 'Expiry reminders', desc: 'Email alerts before it expires' },
                  { icon: <ArrowRight size={13}/>, title: 'One-click install', desc: 'Push to VPS via agent or cPanel' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1f2937',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: '#3b82f6' }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>{title}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f2937' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                  What you need
                </div>
                {[
                  { label: 'Certificate PEM', req: true },
                  { label: 'Private key', req: false, note: 'for auto-install' },
                  { label: 'Domain name', req: true },
                ].map(({ label, req, note }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ color: req ? '#3b82f6' : '#60a5fa', fontWeight: 500 }}>
                      {req ? 'Required' : `Optional${note ? ` · ${note}` : ''}`}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 2, color: '#f59e0b' }}/>
                  <span style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>
                    Imported certs are not auto-renewed. Re-import when renewed or{' '}
                    <button onClick={() => nav('/buy')} style={{ background: 'none', border: 'none',
                      padding: 0, color: '#60a5fa', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}>
                      buy a managed cert
                    </button>{' '}for zero-touch renewal.
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
      <style>{`.spin{animation:v2-spin .8s linear infinite}@keyframes v2-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
