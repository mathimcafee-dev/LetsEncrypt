import { useState, useRef } from 'react'
import { Upload, Check, AlertTriangle, Lock, Shield, FileText,
         CheckCircle, ArrowRight, RefreshCw, Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

// Parse cert metadata from PEM client-side (basic extraction)
function parseCertPreview(pem) {
  if (!pem || !pem.includes('-----BEGIN CERTIFICATE-----')) return null
  try {
    const cnMatch = pem.match(/subject.*?CN\s*=\s*([^\s,/\\]+)/i) ||
                    pem.match(/CN\s*=\s*([^\s,/\\]+)/i)
    const cn = cnMatch?.[1] || null
    return { cn, valid: true }
  } catch(e) { return null }
}

function LiveCertCard({ pem, domain }) {
  const parsed = parseCertPreview(pem)
  const hasPem = pem && pem.includes('-----BEGIN CERTIFICATE-----')
  const certDomain = domain || parsed?.cn || 'yourdomain.com'

  return (
    <div style={{ background: '#0a0f1a', border: `1px solid ${hasPem ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.3s', fontFamily: 'var(--v2-font-mono)' }}>
      {/* Header */}
      <div style={{ background: hasPem ? 'linear-gradient(135deg,#065f46,#0d4429)' : '#111827',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.3s' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: hasPem ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasPem
            ? <Check size={16} color="#34d399" strokeWidth={2.5}/>
            : <Shield size={16} color="#374151"/>}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: hasPem ? '#34d399' : '#4b5563' }}>
            {hasPem ? 'Certificate detected' : 'No certificate pasted'}
          </div>
          <div style={{ fontSize: 10, color: hasPem ? 'rgba(52,211,153,0.6)' : '#1f2937' }}>
            {hasPem ? certDomain : 'Paste your PEM below to preview'}
          </div>
        </div>
        {hasPem && (
          <div style={{ marginLeft: 'auto', background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)',
            borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#34d399' }}>
            VALID PEM
          </div>
        )}
      </div>

      {/* Fields */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Domain',   value: hasPem ? certDomain : '—' },
          { label: 'Type',     value: hasPem ? 'SSL Certificate' : '—' },
          { label: 'Source',   value: hasPem ? 'Imported' : '—' },
          { label: 'Tracking', value: hasPem ? 'Expiry monitoring ✓' : 'Paste cert to enable', dim: !hasPem },
          { label: 'Install',  value: hasPem ? 'cPanel / VPS agent ✓' : '—', dim: !hasPem },
        ].map(({ label, value, dim }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '65px 1fr', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.4px', paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize: 11, color: dim ? '#1f2937' : '#9ca3af' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ width: hasPem ? '100%' : '0%', height: '100%',
            background: 'linear-gradient(90deg,#0e7fc0,#34d399)', borderRadius: 100, transition: 'width 0.5s' }}/>
        </div>
        <span style={{ fontSize: 10, color: hasPem ? '#34d399' : '#374151', fontWeight: 500 }}>
          {hasPem ? 'Ready to import' : 'Waiting for PEM'}
        </span>
      </div>
    </div>
  )
}

export default function Import({ nav }) {
  const { user } = useAuth()
  const [domain, setDomain]   = useState('')
  const [certPem, setCertPem] = useState('')
  const [keyPem, setKeyPem]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dropRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      if (text.includes('-----BEGIN CERTIFICATE-----')) setCertPem(text)
      else if (text.includes('-----BEGIN PRIVATE KEY-----') || text.includes('-----BEGIN RSA PRIVATE KEY-----')) setKeyPem(text)
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (!user) { nav('/auth'); return }
    const d = domain.trim()
    const c = certPem.trim()
    const k = keyPem.trim()
    if (!d) { setError('Enter the domain.'); return }
    if (!c) { setError('Paste your certificate PEM.'); return }
    if (!c.includes('-----BEGIN CERTIFICATE-----')) { setError('Must be in PEM format (-----BEGIN CERTIFICATE-----)'); return }
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

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#050a14', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={32} color="#34d399" strokeWidth={2}/>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.5px', marginBottom: 8 }}>
          Certificate Imported
        </h2>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#0e7fc0', marginBottom: 12, fontWeight: 600 }}>
          {success.domain}
        </div>
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 32, lineHeight: 1.6 }}>
          Your certificate is now tracked in SSLVault. You'll get expiry alerts and can install it to your servers in one click.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => nav('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg,#0e7fc0,#1a56db)', color: 'white',
              border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Shield size={14}/> View in Dashboard
          </button>
          <button onClick={() => { setSuccess(null); setDomain(''); setCertPem(''); setKeyPem('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
              border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '12px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Import another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050a14' }}>

      {/* Top bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={14} color="#9ca3af"/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Import Certificate</span>
        </div>
        <button onClick={() => nav('/buy')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(14,127,192,0.1)',
            color: '#60a5fa', border: '0.5px solid rgba(14,127,192,0.25)', borderRadius: 6,
            padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Shield size={11}/> Issue managed cert instead →
        </button>
      </div>

      {/* Value strip */}
      <div style={{ background: 'rgba(14,127,192,0.06)', borderBottom: '0.5px solid rgba(14,127,192,0.15)',
        padding: '10px 32px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {[
          { icon: <Shield size={12}/>,    t: 'Track expiry across all certs' },
          { icon: <RefreshCw size={12}/>, t: 'Email alerts before expiry' },
          { icon: <ArrowRight size={12}/>,t: 'One-click install to cPanel or VPS' },
          { icon: <FileText size={12}/>,  t: 'Unified inventory — any CA, any cert' },
        ].map(({ icon, t }) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#4b5563' }}>
            <span style={{ color: '#0e7fc0' }}>{icon}</span> {t}
          </span>
        ))}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px',
        display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>

        {/* LEFT — form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Drop zone + domain */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1.5px dashed ${dragging ? 'rgba(14,127,192,0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}>
            <div style={{ padding: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              textAlign: 'center', background: dragging ? 'rgba(14,127,192,0.05)' : 'transparent' }}>
              <Upload size={22} style={{ color: dragging ? '#0e7fc0' : '#374151', marginBottom: 8 }}/>
              <div style={{ fontSize: 13, fontWeight: 600, color: dragging ? '#60a5fa' : '#6b7280', marginBottom: 3 }}>
                {dragging ? 'Drop .pem or .crt file' : 'Drag & drop a .pem or .crt file — or paste below'}
              </div>
              <div style={{ fontSize: 11, color: '#374151' }}>
                Supports fullchain.pem, certificate.crt, or any PEM format
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Domain */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                  textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 6 }}>
                  Domain <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input value={domain} onChange={e => setDomain(e.target.value.toLowerCase().trim())}
                  placeholder="yourdomain.com"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'white',
                    fontSize: 14, fontFamily: 'var(--v2-font-mono)', fontWeight: 500,
                    padding: '10px 12px', outline: 'none' }}/>
              </div>

              {/* Certificate PEM */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                    textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Certificate (PEM) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {certPem && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {certPem.includes('-----BEGIN CERTIFICATE-----')
                        ? <><Check size={11} style={{ color: '#34d399' }}/><span style={{ fontSize: 10, color: '#34d399', fontWeight: 500 }}>Valid PEM</span></>
                        : <><AlertTriangle size={11} style={{ color: '#f59e0b' }}/><span style={{ fontSize: 10, color: '#f59e0b' }}>Not PEM</span></>}
                    </div>
                  )}
                </div>
                <textarea value={certPem} onChange={e => setCertPem(e.target.value)}
                  placeholder={'-----BEGIN CERTIFICATE-----\nMIIFaD...\n-----END CERTIFICATE-----\n\nInclude full chain if available'}
                  rows={8}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${certPem && certPem.includes('-----BEGIN CERTIFICATE-----') ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 7, color: '#9ca3af', fontSize: 11,
                    fontFamily: 'var(--v2-font-mono)', lineHeight: 1.6,
                    padding: '10px 12px', resize: 'vertical', outline: 'none',
                    transition: 'border-color 0.2s' }}/>
                <div style={{ fontSize: 10, color: '#374151', marginTop: 4 }}>
                  From Let's Encrypt: use <code style={{ color: '#4b5563' }}>fullchain.pem</code> · Include intermediates
                </div>
              </div>

              {/* Private key */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                    textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Private Key
                    <span style={{ color: '#1f2937', fontWeight: 400, textTransform: 'none',
                      letterSpacing: 0, marginLeft: 6 }}>· optional</span>
                  </label>
                  <button onClick={() => setShowKey(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: '#374151', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                    {showKey ? <><EyeOff size={11}/> Hide</> : <><Eye size={11}/> Show</>}
                  </button>
                </div>
                <textarea value={keyPem} onChange={e => setKeyPem(e.target.value)}
                  placeholder={'-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----'}
                  rows={showKey ? 6 : 3}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.02)',
                    border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 7,
                    color: showKey ? '#9ca3af' : '#374151', fontSize: 11,
                    fontFamily: 'var(--v2-font-mono)', lineHeight: 1.6,
                    padding: '10px 12px', resize: 'vertical', outline: 'none',
                    filter: showKey ? 'none' : 'blur(3px)' }}/>
                <div style={{ fontSize: 10, color: '#374151', marginTop: 4,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={9} style={{ color: '#f59e0b' }}/>
                  Required for agent-based auto-install. Encrypted with AES-256-GCM. Never displayed again.
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '0.5px solid rgba(220,38,38,0.25)',
              borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#fca5a5',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }}/> {error}
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: saving ? '#1f2937' : 'rgba(255,255,255,0.06)',
              color: saving ? '#4b5563' : 'white',
              border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '13px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {saving
              ? <><RefreshCw size={14} className="spin"/> Importing…</>
              : <><Upload size={14}/> Import Certificate</>}
          </button>
        </div>

        {/* RIGHT — live preview + info */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LiveCertCard pem={certPem} domain={domain}/>

          {/* What you get */}
          <div style={{ background: '#111827', border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              After import
            </div>
            {[
              { icon: <Shield size={12}/>,    t: 'Expiry tracking', d: 'Dashboard shows days remaining' },
              { icon: <RefreshCw size={12}/>, t: 'Email alerts', d: '30, 14, 7 days before expiry' },
              { icon: <ArrowRight size={12}/>,t: 'One-click install', d: 'Push to VPS via agent or cPanel' },
              { icon: <FileText size={12}/>,  t: 'Full inventory', d: 'Alongside all your other certs' },
            ].map(({ icon, t, d }) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(14,127,192,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0e7fc0' }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>{t}</div>
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '0.5px solid rgba(245,158,11,0.2)',
            borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <AlertTriangle size={12} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                Imported certs are <strong style={{ color: '#9ca3af' }}>not auto-renewed</strong> by SSLVault.
                Re-import when renewed, or{' '}
                <button onClick={() => nav('/buy')} style={{ background: 'none', border: 'none', padding: 0,
                  color: '#60a5fa', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}>
                  issue a managed cert
                </button>{' '}for zero-touch renewal.
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
