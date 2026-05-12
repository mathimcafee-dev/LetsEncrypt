import { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, Loader, Shield, Server,
  Eye, EyeOff, Plus, Trash2, ChevronDown, AlertTriangle, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'

const FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/cpanel-install'

async function call(action, body, token) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  })
  return res.json()
}

// ── Step indicator ────────────────────────────────────────────────────
function Step({ done, active, error, label }) {
  const bg = done ? '#10b981' : error ? '#dc2626' : active ? '#0e7fc0' : '#e8edf2'
  const Icon = done ? CheckCircle : error ? XCircle : active ? Loader : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Icon && <Icon size={14} color="white" style={{ animation: active && !done ? 'spin 1s linear infinite' : 'none' }}/>}
        {!Icon && <span style={{ fontSize: 11, color: '#a3a3a3' }}>○</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: done || active ? 500 : 400,
        color: done ? '#0a0a0a' : error ? '#b91c1c' : active ? '#0e7fc0' : '#a3a3a3' }}>
        {label}
      </span>
    </div>
  )
}

// ── Saved credential selector ─────────────────────────────────────────
function CredentialSelector({ creds, selected, onSelect, onDelete }) {
  const [open, setOpen] = useState(false)
  const sel = creds.find(c => c.id === selected)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 12px', border: '0.5px solid #e8edf2', borderRadius: 6,
        background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: '#0a0a0a'
      }}>
        <span>{sel ? `${sel.cpanel_user}@${sel.hostname}` : 'Select saved server…'}</span>
        <ChevronDown size={13} color="#a3a3a3"/>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '0.5px solid #e8edf2', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}
          onMouseLeave={() => setOpen(false)}>
          {creds.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', cursor: 'pointer', fontSize: 12, color: '#0a0a0a',
              background: c.id === selected ? '#f0f9ff' : 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
              onMouseLeave={e => e.currentTarget.style.background = c.id === selected ? '#f0f9ff' : 'white'}>
              <span onClick={() => { onSelect(c.id); setOpen(false) }} style={{ flex: 1 }}>
                <strong>{c.label || `${c.cpanel_user}@${c.hostname}`}</strong>
                <span style={{ color: '#a3a3a3', marginLeft: 6 }}>:{c.port}</span>
              </span>
              <button onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px 4px' }}>
                <Trash2 size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function CpanelInstall({ cert, userId, onClose, onSuccess, inline = false }) {
  const [token, setToken] = useState('')
  const [savedCreds, setSavedCreds] = useState([])
  const [selectedCred, setSelectedCred] = useState(null)
  const [useNew, setUseNew] = useState(false)

  // New credentials form
  const [hostname, setHostname] = useState('')
  const [port, setPort] = useState(2083)
  const [cpanelUser, setCpanelUser] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saveForFuture, setSaveForFuture] = useState(true)
  const [label, setLabel] = useState('')

  // Flow state
  const [phase, setPhase] = useState('form') // form | verifying | installing | verifying_ssl | done | error
  const [steps, setSteps] = useState({
    creds: null,   // null | active | done | error
    install: null,
    verify: null,
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [sslVerified, setSslVerified] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      const res = await call('list_credentials', {}, session.access_token)
      if (res.ok) {
        setSavedCreds(res.credentials || [])
        if (res.credentials?.length === 0) setUseNew(true)
      }
    })()
  }, [])

  const handleDeleteCred = async (credId) => {
    const { data: { session } } = await supabase.auth.getSession()
    await call('delete_credential', { credential_id: credId }, session.access_token)
    setSavedCreds(prev => prev.filter(c => c.id !== credId))
    if (selectedCred === credId) setSelectedCred(null)
  }

  const [verifyPending, setVerifyPending] = useState(false)

  const handleInstall = async () => {
    setBusy(true)
    setPhase('running')
    setSteps({ creds: 'active', install: null, verify: null })
    setErrorMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const tok = session?.access_token
    if (!tok) { setErrorMsg('Not authenticated'); setBusy(false); setPhase('error'); return }

    let finalCredId = selectedCred
    let verifyOk = false

    // Step 1 — verify or save credentials
    if (useNew || !selectedCred) {
      if (!hostname || !cpanelUser || !apiToken) {
        setErrorMsg('Please fill in hostname, username and API token')
        setSteps({ creds: 'error', install: null, verify: null })
        setPhase('error'); setBusy(false); return
      }

      const verifyRes = await call('verify_credentials', {
        hostname, port, cpanel_user: cpanelUser, api_token: apiToken
      }, tok)

      if (!verifyRes.ok) {
        setSteps({ creds: 'error', install: null, verify: null })
        setErrorMsg(verifyRes.error || 'Credential verification failed')
        setPhase('error'); setBusy(false); return
      }

      setSteps({ creds: 'done', install: 'active', verify: null })

      // Save if requested
      if (saveForFuture) {
        const saveRes = await call('save_credentials', {
          hostname, port, cpanel_user: cpanelUser, api_token: apiToken,
          label: label || `${cpanelUser}@${hostname}`, domains: [cert.domain]
        }, tok)
        if (saveRes.ok) {
          finalCredId = saveRes.credential?.id
          setSavedCreds(prev => [saveRes.credential, ...prev])
        }
      }
    } else {
      setSteps({ creds: 'done', install: 'active', verify: null })
    }

    // Step 2 — install via cPanel API
    const installPayload = {
      cert_id: cert.id,
      domain: cert.domain,
      ...(finalCredId ? { credential_id: finalCredId } : {
        hostname, port,
        cpanel_user: cpanelUser,
        api_token: apiToken,
      })
    }

    const installRes = await call('install', installPayload, tok)

    if (!installRes.ok) {
      setSteps(s => ({ ...s, install: 'error', verify: null }))
      setErrorMsg(installRes.error || 'Installation failed')
      setPhase('error'); setBusy(false); return
    }

    setSteps({ creds: 'done', install: 'done', verify: 'active' })

    // Step 3 — SSL verification result (already done in edge fn, just read it)
    setSslVerified(installRes.ssl_verified)
    setVerifyPending(installRes.verify_pending ?? false)
    setSteps({ creds: 'done', install: 'done', verify: 'done' })
    setPhase('done')
    setBusy(false)
    if (onSuccess) onSuccess()
  }

  const Label = ({ children, required }) => (
    <div style={{ fontSize: 10, fontWeight: 500, color: '#737373', textTransform: 'uppercase',
      letterSpacing: '.5px', marginBottom: 5 }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
    </div>
  )

  const Input = ({ value, onChange, placeholder, type = 'text' }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      type={type} style={{ width: '100%', border: '0.5px solid #e8edf2', borderRadius: 6,
        padding: '9px 12px', fontSize: 12, fontFamily: 'inherit', color: '#0a0a0a',
        background: 'white', outline: 'none', boxSizing: 'border-box' }}/>
  )

  return (
    <div style={inline ? {} : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={inline
        ? { background: 'white', borderRadius: 8, overflow: 'hidden' }
        : { background: 'white', borderRadius: 10, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
      }>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #e8edf2',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4',
              border: '0.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={15} color="#10b981"/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>Install via cPanel</div>
              <div style={{ fontSize: 11, color: '#a3a3a3', marginTop: 1, fontFamily: "'SF Mono',monospace" }}>
                {cert.domain}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: '0.5px solid #e8edf2',
            borderRadius: 6, background: 'white', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#525252', fontSize: 16 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

          {/* DONE state */}
          {phase === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4',
                border: '2px solid #10b981', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} color="#10b981"/>
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#0a0a0a', marginBottom: 6 }}>
                Certificate installed successfully
              </div>
              <div style={{ fontSize: 12, color: '#525252', marginBottom: 20 }}>
                SSL is now active on <strong style={{ fontFamily: "'SF Mono',monospace" }}>{cert.domain}</strong>
              </div>

              {/* SSL verification result */}
              <div style={{ background: sslVerified ? '#f0fdf4' : verifyPending ? '#f0f9ff' : '#fffbeb',
                border: `0.5px solid ${sslVerified ? '#bbf7d0' : verifyPending ? '#bae6fd' : '#fde68a'}`,
                borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {sslVerified
                    ? <CheckCircle size={14} color="#10b981"/>
                    : verifyPending
                    ? <Loader size={14} color="#0369a1" style={{ animation: 'spin 1s linear infinite' }}/>
                    : <AlertTriangle size={14} color="#d97706"/>}
                  <span style={{ fontSize: 12, fontWeight: 500,
                    color: sslVerified ? '#047857' : verifyPending ? '#0369a1' : '#92400e' }}>
                    {sslVerified
                      ? 'Live SSL verification passed — cert is being served'
                      : verifyPending
                      ? 'SSL installed — live verification running in background (~60s)'
                      : 'SSL installed, but live verification could not confirm'}
                  </span>
                </div>
                {verifyPending && (
                  <p style={{ fontSize: 11, color: '#0c4a6e', margin: 0, lineHeight: 1.6 }}>
                    cPanel is reloading your web server. Verification runs automatically
                    after ~30 seconds. Check your site at{' '}
                    <a href={`https://${cert.domain}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#0e7fc0' }}>https://{cert.domain}</a> in a minute.
                  </p>
                )}
                {!sslVerified && !verifyPending && (
                  <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                    DNS propagation can take up to 10 minutes. Your cert is installed — check{' '}
                    <a href={`https://${cert.domain}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#0e7fc0' }}>https://{cert.domain}</a> to confirm.
                  </p>
                )}
              </div>

              <button onClick={onClose} style={{ background: '#10b981', color: 'white', border: 'none',
                borderRadius: 6, padding: '9px 24px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          )}

          {/* RUNNING state */}
          {phase === 'running' && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: 12, color: '#525252', marginBottom: 16 }}>Installing certificate…</div>
              <Step done={steps.creds === 'done'} active={steps.creds === 'active'}
                error={steps.creds === 'error'} label="Verifying cPanel credentials"/>
              <Step done={steps.install === 'done'} active={steps.install === 'active'}
                error={steps.install === 'error'} label="Installing certificate via cPanel API"/>
              <Step done={steps.verify === 'done'} active={steps.verify === 'active'}
                error={steps.verify === 'error'} label="Verifying SSL is live on domain"/>
            </div>
          )}

          {/* ERROR state */}
          {phase === 'error' && (
            <div>
              <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8,
                padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <XCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }}/>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#991b1b', marginBottom: 4 }}>
                      Installation failed
                    </div>
                    <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>{errorMsg}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setPhase('form'); setSteps({ creds: null, install: null, verify: null }) }}
                  style={{ flex: 1, padding: '9px', border: '0.5px solid #e8edf2', borderRadius: 6,
                    background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Try again
                </button>
                <button onClick={onClose} style={{ flex: 1, padding: '9px', border: 'none',
                  borderRadius: 6, background: '#0a0a0a', color: 'white', fontSize: 12,
                  cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
          )}

          {/* FORM state */}
          {phase === 'form' && (
            <div>
              {/* Info callout */}
              <div style={{ background: '#f0f9ff', border: '0.5px solid #bae6fd', borderRadius: 8,
                padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 10 }}>
                <Globe size={14} color="#0369a1" style={{ flexShrink: 0, marginTop: 1 }}/>
                <div style={{ fontSize: 11, color: '#0c4a6e', lineHeight: 1.7 }}>
                  SSLVault calls cPanel's API directly from its own servers — your token is stored
                  encrypted in the vault and <strong>never exposed in a public file</strong>.
                  No PHP file, no manual upload.
                </div>
              </div>

              {/* Saved credentials */}
              {savedCreds.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Label>Saved cPanel servers</Label>
                  <CredentialSelector
                    creds={savedCreds}
                    selected={selectedCred}
                    onSelect={id => { setSelectedCred(id); setUseNew(false) }}
                    onDelete={handleDeleteCred}
                  />
                  <button onClick={() => { setUseNew(!useNew); setSelectedCred(null) }}
                    style={{ marginTop: 8, fontSize: 11, color: '#0e7fc0', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
                      alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                    <Plus size={11}/> {useNew ? 'Use saved server' : 'Use a different server'}
                  </button>
                </div>
              )}

              {/* New credentials form */}
              {(useNew || savedCreds.length === 0) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#0a0a0a',
                    marginBottom: 12, paddingBottom: 8, borderBottom: '0.5px solid #f1f5f9' }}>
                    cPanel connection details
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <Label required>Hostname</Label>
                    <Input value={hostname} onChange={setHostname} placeholder="cpanel.myhost.com or mysite.com"/>
                    <div style={{ fontSize: 10, color: '#a3a3a3', marginTop: 4 }}>
                      Your cPanel URL without https://. Check your hosting welcome email.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 10 }}>
                    <div>
                      <Label required>cPanel username</Label>
                      <Input value={cpanelUser} onChange={setCpanelUser} placeholder="myuser"/>
                    </div>
                    <div>
                      <Label>Port</Label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[2083, 443].map(p => (
                          <button key={p} onClick={() => setPort(p)} style={{
                            flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 500,
                            border: `0.5px solid ${port === p ? '#0e7fc0' : '#e8edf2'}`,
                            background: port === p ? '#f0f9ff' : 'white',
                            color: port === p ? '#0e7fc0' : '#525252',
                            borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit'
                          }}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <Label required>API token</Label>
                    <div style={{ position: 'relative' }}>
                      <input value={apiToken} onChange={e => setApiToken(e.target.value)}
                        type={showToken ? 'text' : 'password'}
                        placeholder="Paste your cPanel API token"
                        style={{ width: '100%', border: '0.5px solid #e8edf2', borderRadius: 6,
                          padding: '9px 36px 9px 12px', fontSize: 12, fontFamily: "'SF Mono',monospace",
                          color: '#0a0a0a', background: 'white', outline: 'none', boxSizing: 'border-box' }}/>
                      <button onClick={() => setShowToken(v => !v)} style={{ position: 'absolute',
                        right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#a3a3a3', padding: 2 }}>
                        {showToken ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: '#a3a3a3', marginTop: 4 }}>
                      cPanel → Manage API Tokens → Create token → copy. Give it SSL permissions.
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: '#525252', cursor: 'pointer' }}>
                      <input type="checkbox" checked={saveForFuture}
                        onChange={e => setSaveForFuture(e.target.checked)}
                        style={{ accentColor: '#10b981' }}/>
                      Save credentials for future installs and auto-renewal
                    </label>
                  </div>

                  {saveForFuture && (
                    <div style={{ marginBottom: 14 }}>
                      <Label>Server label (optional)</Label>
                      <Input value={label} onChange={setLabel}
                        placeholder={`e.g. GoDaddy – ${cert.domain || 'mysite.com'}`}/>
                    </div>
                  )}
                </div>
              )}

              {/* Install button */}
              <button onClick={handleInstall} disabled={busy}
                style={{ width: '100%', background: '#10b981', color: 'white', border: 'none',
                  borderRadius: 7, padding: '11px', fontSize: 13, fontWeight: 500,
                  cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: busy ? 0.7 : 1 }}>
                <Shield size={14}/>
                Install SSL Certificate via cPanel API
              </button>

              <div style={{ marginTop: 10, fontSize: 10, color: '#a3a3a3', textAlign: 'center', lineHeight: 1.6 }}>
                SSLVault calls cPanel's API directly from its backend. Your token is encrypted
                in Supabase Vault and never touches your browser after this step.
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
