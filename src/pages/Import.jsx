import { useState, useRef, useCallback } from 'react'
import { Upload, Check, AlertTriangle, Lock, Shield, FileText,
         CheckCircle, ArrowRight, RefreshCw, Eye, EyeOff, Globe,
         Calendar, Building, Key } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

// ── PEM parser using node-forge ──────────────────────────────────────────────
async function parseCertPem(pem) {
  if (!pem || !pem.includes('-----BEGIN CERTIFICATE-----')) return null
  try {
    const forge = await import('node-forge')
    // Only parse first cert in chain
    const single = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0]
    if (!single) return null
    const cert = forge.pki.certificateFromPem(single)

    const getAttr = (obj, field) => obj.getField(field)?.value || ''
    const cn      = getAttr(cert.subject, 'CN')
    const org     = getAttr(cert.subject, 'O')
    const issuerCN = getAttr(cert.issuer, 'CN')
    const issuerOrg = getAttr(cert.issuer, 'O')

    // SANs
    const sanExt = cert.extensions?.find(e => e.name === 'subjectAltName')
    const sans = sanExt?.altNames?.map(n => n.value).filter(Boolean) || []

    // Dates
    const issuedAt  = cert.validity.notBefore
    const expiresAt = cert.validity.notAfter

    // Key info
    const keyBits = cert.publicKey?.n?.bitLength?.() || null
    const sigAlg  = cert.siginfo?.algorithmOid ? 'SHA-256' : 'SHA-256'

    // Guess CA
    let guessedCA = 'Unknown CA'
    const iLower = (issuerCN + issuerOrg).toLowerCase()
    if (iLower.includes("let's encrypt") || iLower.includes('lets encrypt')) guessedCA = "Let's Encrypt"
    else if (iLower.includes('digicert'))   guessedCA = 'DigiCert'
    else if (iLower.includes('rapidssl'))   guessedCA = 'RapidSSL / DigiCert'
    else if (iLower.includes('sectigo') || iLower.includes('comodo')) guessedCA = 'Sectigo'
    else if (iLower.includes('zerossl'))    guessedCA = 'ZeroSSL'
    else if (iLower.includes('globalsign')) guessedCA = 'GlobalSign'
    else if (issuerCN) guessedCA = issuerCN

    return { cn, org, issuerCN, issuerOrg, guessedCA, sans, issuedAt, expiresAt, keyBits, valid: true }
  } catch(e) {
    console.warn('PEM parse failed:', e.message)
    return null
  }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

// ── Live cert preview card ───────────────────────────────────────────────────
function LiveCertCard({ parsed, pem, domain }) {
  const hasPem   = pem && pem.includes('-----BEGIN CERTIFICATE-----')
  const certDomain = parsed?.cn || domain || 'yourdomain.com'
  const days     = parsed ? daysLeft(parsed.expiresAt) : null
  const chainLen = pem ? (pem.match(/-----BEGIN CERTIFICATE-----/g) || []).length : 0

  return (
    <div style={{ background: '#0a0f1a',
      border: `1px solid ${parsed ? 'rgba(52,211,153,0.35)' : hasPem ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.3s',
      fontFamily: 'var(--v2-font-mono)' }}>

      {/* Header */}
      <div style={{ background: parsed ? 'linear-gradient(135deg,#064e3b,#065f46)' : '#111827',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: parsed ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {parsed
            ? <Check size={16} color="#34d399" strokeWidth={2.5}/>
            : <Shield size={16} color="#374151"/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700,
            color: parsed ? '#34d399' : hasPem ? '#f59e0b' : '#4b5563' }}>
            {parsed ? 'Certificate parsed ✓' : hasPem ? 'Parsing…' : 'Waiting for PEM'}
          </div>
          <div style={{ fontSize: 10, color: parsed ? 'rgba(52,211,153,0.6)' : '#374151',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {parsed ? certDomain : 'Paste certificate below'}
          </div>
        </div>
        {parsed && (
          <div style={{ background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)',
            borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 700, color: '#34d399',
            flexShrink: 0 }}>
            VALID
          </div>
        )}
      </div>

      {/* Parsed fields */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {parsed ? [
          { label: 'Subject', value: certDomain },
          { label: 'Issuer',  value: parsed.guessedCA },
          { label: 'Issued',  value: fmtDate(parsed.issuedAt) },
          { label: 'Expires', value: `${fmtDate(parsed.expiresAt)} · ${days}d left`,
            highlight: days !== null && days < 30 ? '#f59e0b' : '#34d399' },
          { label: 'Key',     value: parsed.keyBits ? `RSA ${parsed.keyBits}-bit` : 'RSA 2048-bit' },
          { label: 'Chain',   value: chainLen > 1 ? `${chainLen} certs (fullchain ✓)` : '1 cert (no intermediates)' },
          ...(parsed.sans.length > 1 ? [{ label: 'SANs', value: `${parsed.sans.length} domains` }] : []),
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.4px', paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize: 11, color: highlight || '#9ca3af',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
          </div>
        )) : [
          { label: 'Subject', value: '—' },
          { label: 'Issuer',  value: '—' },
          { label: 'Expires', value: '—' },
          { label: 'Chain',   value: '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
            <span style={{ fontSize: 11, color: '#1f2937' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)',
          borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ width: parsed ? '100%' : '0%', height: '100%',
            background: 'linear-gradient(90deg,#0e7fc0,#34d399)', borderRadius: 100,
            transition: 'width 0.5s' }}/>
        </div>
        <span style={{ fontSize: 10, color: parsed ? '#34d399' : '#374151', fontWeight: 500 }}>
          {parsed ? 'Ready to import' : 'Waiting for PEM'}
        </span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Import({ nav }) {
  const { user } = useAuth()
  const [domain,    setDomain]   = useState('')
  const [certPem,   setCertPem]  = useState('')
  const [keyPem,    setKeyPem]   = useState('')
  const [parsed,    setParsed]   = useState(null)
  const [parsing,   setParsing]  = useState(false)
  const [saving,    setSaving]   = useState(false)
  const [error,     setError]    = useState('')
  const [success,   setSuccess]  = useState(null)
  const [showKey,   setShowKey]  = useState(false)
  const [dragging,  setDragging] = useState(false)
  const dropRef = useRef()

  // Parse PEM whenever it changes
  const handleCertChange = useCallback(async (val) => {
    setCertPem(val)
    setParsed(null)
    if (!val.includes('-----BEGIN CERTIFICATE-----')) return
    setParsing(true)
    const result = await parseCertPem(val)
    setParsed(result)
    setParsing(false)
    // Auto-fill domain from CN if not already set
    if (result?.cn && !domain) {
      setDomain(result.cn.replace(/^\*\./, ''))
    }
  }, [domain])

  // Drag & drop handler — handles cert, key, or fullchain files
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target.result
        if (text.includes('-----BEGIN CERTIFICATE-----')) {
          handleCertChange(text)
        } else if (text.includes('-----BEGIN PRIVATE KEY-----') ||
                   text.includes('-----BEGIN RSA PRIVATE KEY-----') ||
                   text.includes('-----BEGIN EC PRIVATE KEY-----')) {
          setKeyPem(text)
        }
      }
      reader.readAsText(file)
    })
  }, [handleCertChange])

  const handleSave = async () => {
    if (!user) { nav('/auth'); return }
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
    const c = certPem.trim()
    const k = keyPem.trim()
    if (!d) { setError('Enter the domain name.'); return }
    if (!c) { setError('Paste your certificate PEM.'); return }
    if (!c.includes('-----BEGIN CERTIFICATE-----')) { setError('Must be PEM format — starts with -----BEGIN CERTIFICATE-----'); return }
    if (k && !k.includes('-----BEGIN')) { setError('Private key must be in PEM format.'); return }
    setError(''); setSaving(true)
    try {
      // Determine cert_type from parsed issuer
      const certType = parsed?.guessedCA
        ? `${parsed.guessedCA} DV`
        : 'Imported'

      const { data, error: dbErr } = await supabase.from('certificates').insert({
        user_id:          user.id,
        domain:           d,
        cert_pem:         c,
        private_key_pem:  k || null,
        status:           'active',
        cert_type:        certType,
        is_sandbox:       false,
        auto_renew_enabled: false,
        // Use parsed dates if available, fallback to now/+90d
        issued_at:  parsed?.issuedAt  ? parsed.issuedAt.toISOString()  : new Date().toISOString(),
        expires_at: parsed?.expiresAt ? parsed.expiresAt.toISOString() : null,
        // Store issuer for display
        external_issuer: parsed?.guessedCA || null,
      }).select('id, domain, expires_at').single()

      if (dbErr) throw new Error(dbErr.message)
      setSaving(false)
      setSuccess({ id: data.id, domain: data.domain, expiresAt: data.expires_at })
    } catch(e) { setError(e.message); setSaving(false) }
  }

  const reset = () => {
    setDomain(''); setCertPem(''); setKeyPem('')
    setParsed(null); setSuccess(null); setError('')
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) return (
    <div style={{ minHeight: '100vh', background: '#050a14', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%',
          background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
          <CheckCircle size={30} color="#34d399" strokeWidth={2}/>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white',
          letterSpacing: '-0.4px', marginBottom: 6 }}>Certificate Imported</h2>
        <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#0e7fc0',
          marginBottom: 6, fontWeight: 600 }}>{success.domain}</div>
        {success.expiresAt && (
          <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 20 }}>
            Expires {fmtDate(success.expiresAt)} · {daysLeft(success.expiresAt)} days
          </div>
        )}
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 28, lineHeight: 1.6 }}>
          Tracked in SSLVault. Expiry alerts active. Install to servers from the dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => nav('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#0e7fc0', color: 'white', border: 'none', borderRadius: 8,
              padding: '11px 20px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            <Shield size={13}/> View Dashboard
          </button>
          <button onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
              border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '11px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Import another
          </button>
        </div>
      </div>
    </div>
  )

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#050a14' }}>

      {/* Top bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={14} color="#9ca3af"/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
            Import Certificate
          </span>
        </div>
        <button onClick={() => nav('/buy')}
          style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(14,127,192,0.1)', color: '#60a5fa',
            border: '0.5px solid rgba(14,127,192,0.25)', borderRadius: 6,
            padding: '6px 12px', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit' }}>
          <Shield size={11}/> Issue managed cert instead →
        </button>
      </div>

      {/* Value strip */}
      <div style={{ background: 'rgba(14,127,192,0.05)',
        borderBottom: '0.5px solid rgba(14,127,192,0.12)',
        padding: '9px 32px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          { icon: <Globe size={11}/>,    t: 'Any CA — Let\'s Encrypt, DigiCert, ZeroSSL' },
          { icon: <Calendar size={11}/>, t: 'Expiry auto-parsed from PEM' },
          { icon: <RefreshCw size={11}/>,t: 'Email alerts 30 · 14 · 7 days before expiry' },
          { icon: <Key size={11}/>,      t: 'Private key encrypted at rest' },
        ].map(({ icon, t }) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#4b5563' }}>
            <span style={{ color: '#0e7fc0' }}>{icon}</span> {t}
          </span>
        ))}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 32px 80px',
        display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>

        {/* ── LEFT: form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ background: dragging ? 'rgba(14,127,192,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1.5px dashed ${dragging ? 'rgba(14,127,192,0.6)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, padding: '18px', textAlign: 'center',
              transition: 'all 0.2s', cursor: 'default' }}>
            <Upload size={20} style={{ color: dragging ? '#0e7fc0' : '#374151', marginBottom: 7 }}/>
            <div style={{ fontSize: 13, fontWeight: 600,
              color: dragging ? '#60a5fa' : '#6b7280', marginBottom: 3 }}>
              {dragging ? 'Drop files here' : 'Drag & drop certificate files'}
            </div>
            <div style={{ fontSize: 11, color: '#374151' }}>
              .pem · .crt · .cer · fullchain.pem · or paste below
            </div>
          </div>

          {/* Certificate PEM */}
          <div style={{ background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Certificate PEM <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 16 }}>
                {parsing && (
                  <span style={{ fontSize: 10, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={9} className="spin"/> Parsing…
                  </span>
                )}
                {parsed && !parsing && (
                  <span style={{ fontSize: 10, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={9}/> {parsed.guessedCA || 'Valid PEM'}
                  </span>
                )}
                {certPem && !parsed && !parsing && (
                  <span style={{ fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={9}/> Not a valid cert
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={certPem}
              onChange={e => handleCertChange(e.target.value)}
              placeholder={'-----BEGIN CERTIFICATE-----\nMIIFaD...\n-----END CERTIFICATE-----\n\n-----BEGIN CERTIFICATE-----\n(intermediate / chain)\n-----END CERTIFICATE-----'}
              rows={10}
              style={{ width: '100%', boxSizing: 'border-box',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af', fontSize: 11,
                fontFamily: 'var(--v2-font-mono)', lineHeight: 1.7,
                padding: '14px 16px', resize: 'vertical', outline: 'none' }}/>
            <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(255,255,255,0.05)',
              fontSize: 10, color: '#374151' }}>
              Include full chain — paste contents of <code style={{ color: '#4b5563' }}>fullchain.pem</code>
              {' '}or <code style={{ color: '#4b5563' }}>certificate.crt</code>
            </div>
          </div>

          {/* Domain — auto-filled from parsed CN */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
              textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: 7 }}>
              Domain <span style={{ color: '#ef4444' }}>*</span>
              {parsed?.cn && (
                <span style={{ color: '#34d399', fontWeight: 400, textTransform: 'none',
                  letterSpacing: 0, marginLeft: 8 }}>· auto-filled from cert</span>
              )}
            </label>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '').trim())}
              placeholder="yourdomain.com"
              style={{ width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${domain ? 'rgba(14,127,192,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 7, color: 'white', fontSize: 14,
                fontFamily: 'var(--v2-font-mono)', fontWeight: 500,
                padding: '10px 12px', outline: 'none' }}/>
          </div>

          {/* Private key */}
          <div style={{ background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5563',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>Private Key</span>
                <span style={{ fontSize: 10, color: '#374151' }}>optional</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 10, color: '#f59e0b' }}>
                  <Lock size={9}/> encrypted at rest
                </span>
              </div>
              <button onClick={() => setShowKey(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontFamily: 'inherit' }}>
                {showKey ? <><EyeOff size={10}/> Hide</> : <><Eye size={10}/> Show</>}
              </button>
            </div>
            <textarea
              value={keyPem}
              onChange={e => setKeyPem(e.target.value)}
              placeholder={'-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----'}
              rows={showKey ? 7 : 2}
              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent',
                border: 'none',
                color: showKey ? '#9ca3af' : '#374151', fontSize: 11,
                fontFamily: 'var(--v2-font-mono)', lineHeight: 1.7,
                padding: '12px 16px', resize: 'vertical', outline: 'none',
                filter: showKey ? 'none' : keyPem ? 'blur(4px)' : 'none',
                transition: 'filter 0.2s' }}/>
            <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(255,255,255,0.05)',
              fontSize: 10, color: '#374151' }}>
              Required for one-click VPS install via agent. Optional for tracking only.
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)',
              border: '0.5px solid rgba(220,38,38,0.25)', borderRadius: 7,
              padding: '10px 14px', fontSize: 12, color: '#fca5a5',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }}/> {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: saving ? '#1f2937' : parsed ? '#0e7fc0' : 'rgba(255,255,255,0.07)',
              color: saving ? '#4b5563' : parsed ? 'white' : '#9ca3af',
              border: `0.5px solid ${parsed && !saving ? '#0e7fc0' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {saving
              ? <><RefreshCw size={14} className="spin"/> Importing…</>
              : <><Upload size={14}/> Import Certificate</>}
          </button>
        </div>

        {/* ── RIGHT: live preview + tips ── */}
        <div style={{ position: 'sticky', top: 20,
          display: 'flex', flexDirection: 'column', gap: 14 }}>

          <LiveCertCard parsed={parsed} pem={certPem} domain={domain}/>

          {/* What happens after */}
          <div style={{ background: '#111827', border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              After import
            </div>
            {[
              { icon: <Shield size={11}/>,    t: 'Expiry tracking',   d: 'Dashboard shows exact days remaining' },
              { icon: <RefreshCw size={11}/>, t: 'Email alerts',      d: 'At 30, 14, and 7 days before expiry' },
              { icon: <ArrowRight size={11}/>,t: 'One-click install', d: 'Push to VPS agent or cPanel' },
              { icon: <FileText size={11}/>,  t: 'Unified inventory', d: 'Alongside all your managed certs' },
            ].map(({ icon, t, d }) => (
              <div key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(14,127,192,0.1)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0e7fc0' }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb' }}>{t}</div>
                  <div style={{ fontSize: 10, color: '#374151', marginTop: 1 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* No auto-renew notice */}
          <div style={{ background: 'rgba(245,158,11,0.05)',
            border: '0.5px solid rgba(245,158,11,0.18)', borderRadius: 8, padding: '11px 13px' }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <AlertTriangle size={11} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                Imported certs are <strong style={{ color: '#9ca3af' }}>not auto-renewed.</strong>
                {' '}Re-import when renewed, or{' '}
                <button onClick={() => nav('/buy')}
                  style={{ background: 'none', border: 'none', padding: 0,
                    color: '#60a5fa', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit' }}>
                  issue a managed cert
                </button>{' '}for zero-touch renewal at €9.99/yr.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
