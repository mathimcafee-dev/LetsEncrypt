// CAConnectors.jsx — import & monitor certificates from any CA
// Three flows: manual PEM paste | DigiCert API pull | Sectigo API pull
// No issuance. No auto-renew. No private key required. Monitor only.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, RefreshCw, Trash2, Check, X, FileText,
  Shield, AlertTriangle, ChevronRight, ExternalLink,
  Upload, Globe, Eye, EyeOff, Info, RotateCcw
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

async function callCA(tok, body) {
  const r = await fetch(`${SB_URL}/functions/v1/ca-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function ExpiryBadge({ expiresAt }) {
  const d = daysLeft(expiresAt)
  if (d === null) return null
  const [color, bg] = d > 30 ? ['#4ade80', '#111111'] : d > 7 ? ['#ffffff', 'rgba(239,68,68,0.08)'] : ['#f87171', '#fef2f2']
  return (
    <span style={{ fontSize:10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
      background: bg, color, border: `0.5px solid ${color}30` }}>
      {d > 0 ? `${d}d left` : 'Expired'}
    </span>
  )
}

function SourceBadge({ source }) {
  const map = {
    digicert:   { label: 'DigiCert',       color: '#f87171', bg: '#fef2f2' },
    sectigo:    { label: 'Sectigo',        color: '#ffffff', bg: 'rgba(239,68,68,0.08)' },
    sslcom:     { label: 'SSL.com',        color: '#ffffff', bg: '#D4F5EF' },
    imported:   { label: 'Manual',         color: 'rgba(255,255,255,0.7)', bg: '#000000' },
    rapidssl:   { label: 'RapidSSL',       color: '#4ade80', bg: '#111111' },
    letsencrypt:{ label: "Let's Encrypt",  color: '#ffffff', bg: '#111111' },
  }
  const s = map[source] || { label: source || 'Unknown', color: 'rgba(255,255,255,0.7)', bg: '#000000' }
  return (
    <span style={{ fontSize:10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

const CA_DEFS = {
  digicert: {
    name: 'DigiCert CertCentral',
    color: '#f87171', bg: '#fef2f2', border: '#fecaca',
    logo: 'DC',
    desc: 'Pull all issued certificates from your CertCentral account. Monitoring only — no private keys needed.',
    fields: [
      { key: 'api_key',    label: 'API Key',             type: 'password', placeholder: 'Your CertCentral API key',             required: true  },
      { key: 'account_id', label: 'Account ID (optional)', type: 'text',   placeholder: 'Division / sub-account ID (optional)', required: false },
    ],
    docs: 'https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html',
  },
  sectigo: {
    name: 'Sectigo SCM',
    color: '#ffffff', bg: 'rgba(239,68,68,0.08)', border: '#F2C4BC',
    logo: 'SC',
    desc: 'Pull all certificates from Sectigo Certificate Manager. Monitoring only — no private keys needed.',
    fields: [
      { key: 'customer_uri', label: 'Customer URI',  type: 'text',     placeholder: 'your-company',          required: true },
      { key: 'login',        label: 'Login',         type: 'text',     placeholder: 'admin@yourcompany.com', required: true },
      { key: 'password',     label: 'Password',      type: 'password', placeholder: '••••••••',              required: true },
    ],
    docs: 'https://sectigo.com/knowledge-base/detail/Sectigo-Certificate-Manager-API/kA01N000000bvOx',
  },
  sslcom: {
    name: 'SSL.com',
    color: '#ffffff', bg: '#D4F5EF', border: '#A8E6DE',
    logo: 'SL',
    desc: 'Pull all issued certificates from your SSL.com reseller account. Monitoring only — no private keys needed.',
    fields: [
      { key: 'account_key', label: 'Account Key', type: 'password', placeholder: 'Your SSL.com account key', required: true },
      { key: 'secret_key',  label: 'Secret Key',  type: 'password', placeholder: 'Your SSL.com secret key',  required: true },
    ],
    docs: 'https://www.ssl.com/restful_api',
  },
}

export default function CAConnectors({ nav }) {
  const isMobile = useIsMobile()
  const [tok,          setTok]          = useState('')
  const [connections,  setConnections]  = useState([])
  const [certs,        setCerts]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [syncing,      setSyncing]      = useState(null)
  const [syncResult,   setSyncResult]   = useState({})
  const [delConn,      setDelConn]      = useState(null)
  const [delCerts,     setDelCerts]     = useState(true)   // also delete certs when removing connection
  const [renewModal,   setRenewModal]   = useState(null)   // cert object for renew-choice modal
  const [delAllModal,  setDelAllModal]  = useState(false)  // confirm delete all certs
  const [deletingAll,  setDeletingAll]  = useState(false)  // deleting in progress

  // Add connection modal
  const [showAdd,      setShowAdd]      = useState(false)
  const [addCa,        setAddCa]        = useState(null)  // 'digicert' | 'sectigo'
  const [addLabel,     setAddLabel]     = useState('')
  const [addFields,    setAddFields]    = useState({})
  const [addSaving,    setAddSaving]    = useState(false)
  const [addError,     setAddError]     = useState('')
  const [showPwd,      setShowPwd]      = useState({})

  // Import modal
  const [showImport,   setShowImport]   = useState(false)
  const [pemText,      setPemText]      = useState('')
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = async (t) => {
    setLoading(true)
    const token = t || tok
    const [connRes, certRes] = await Promise.all([
      callCA(token, { action: 'list_connections' }),
      callCA(token, { action: 'list_imported' }),
    ])
    if (connRes.ok) setConnections(connRes.connections || [])
    if (certRes.ok) setCerts(certRes.certs || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setTok(session.access_token); load(session.access_token) }
      else setLoading(false)
    })
  }, [])

  const openAdd = (ca) => {
    setAddCa(ca)
    setAddLabel(CA_DEFS[ca]?.name || '')
    setAddFields({})
    setAddError('')
    setShowPwd({})
    setShowAdd(true)
  }

  const saveConnection = async () => {
    if (!addCa) return
    const def = CA_DEFS[addCa]
    for (const f of def.fields) {
      if (f.required && !addFields[f.key]?.trim())
        return setAddError(`${f.label} is required`)
    }
    setAddSaving(true); setAddError('')
    const payload = { action: 'save_connection', ca_type: addCa, label: addLabel || def.name, ...addFields }
    const r = await callCA(tok, payload)
    if (r.ok) {
      setShowAdd(false)
      await load()
      // Auto-trigger sync for new connection
      doSync(r.connection.id)
    } else {
      setAddError(r.error || 'Failed to save connection')
    }
    setAddSaving(false)
  }

  const doSync = async (connId) => {
    setSyncing(connId); setSyncResult(p => ({ ...p, [connId]: null }))
    const r = await callCA(tok, { action: 'sync', connection_id: connId })
    setSyncResult(p => ({ ...p, [connId]: r }))
    setSyncing(null)
    await load()
  }

  const deleteConn = async (connId) => {
    await callCA(tok, { action: 'delete_connection', connection_id: connId, also_delete_certs: delCerts })
    setDelConn(null)
    await load()
  }

  // CA portal URLs per source
  const CA_RENEWAL_URLS = {
    digicert: 'https://www.digicert.com/account/login.php',
    sectigo:  'https://cert-manager.com/',
    sslcom:   'https://secure.ssl.com/users/login',
    imported: null,
  }
  const CA_NAMES = {
    digicert: 'DigiCert CertCentral',
    sectigo:  'Sectigo SCM',
    sslcom:   'SSL.com',
    imported: 'Original CA',
  }

  // Open the two-option renew modal
  const openRenewModal = (cert) => setRenewModal(cert)

  // Option A: Renew via external CA portal
  const renewViaCa = (cert) => {
    const src = cert.source || cert.imported_from
    const url = CA_RENEWAL_URLS[src]
    if (url) window.open(url, '_blank', 'noopener')
    setRenewModal(null)
  }

  // Option B: Renew via SSLVault — navigate to /buy with domain pre-filled
  const renewViaSSLVault = (cert) => {
    // Store domain in sessionStorage so BuyCertificate page can pre-fill it
    if (cert.domain) sessionStorage.setItem('prefill_domain', cert.domain)
    setRenewModal(null)
    nav('/buy')
  }

  const doDeleteAll = async () => {
    setDeletingAll(true)
    const r = await callCA(tok, { action: 'delete_all_certs' })
    setDeletingAll(false)
    setDelAllModal(false)
    if (r.ok) await load()
    else alert(r.error || 'Delete failed')
  }

  const doImport = async () => {
    if (!pemText.trim()) return
    setImporting(true); setImportResult(null)
    const r = await callCA(tok, { action: 'manual_import', cert_pem: pemText.trim() })
    setImportResult(r)
    setImporting(false)
    if (r.ok) await load()
  }

  const expiring30 = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d <= 30 && d > 0 })
  const expired    = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d <= 0 })

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 1000 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 24, paddingTop: 8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22, letterSpacing: '-0.3px' }}>CA connectors</h1>
            <p style={{ fontSize:13, color: 'var(--v2-text-3)', marginTop: 4 }}>
              Import and monitor certificates from DigiCert, Sectigo, SSL.com, or paste any PEM. Track expiry — no private keys needed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="v2-btn" onClick={() => { setShowImport(true); setPemText(''); setImportResult(null) }}>
              <Upload size={13}/> Paste PEM
            </button>
            <button className="v2-btn v2-btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={13}/> Connect CA
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { val: connections.length, label: 'CAs connected',   color: '#4ade80' },
            { val: certs.length,       label: 'Certs tracked',   color: 'var(--v2-text)' },
            { val: expiring30.length,  label: 'Expiring in 30d', color: '#ffffff' },
            { val: expired.length,     label: 'Expired',         color: '#f87171' },
          ].map(({ val, label, color }) => (
            <div key={label} className="v2-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize:22, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Expiry alert */}
        {expiring30.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid #F2C4BC', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertTriangle size={15} style={{ color: '#ffffff', flexShrink: 0 }}/>
            <div style={{ fontSize:12, color: '#C45A4A' }}>
              <strong>{expiring30.length} certificate{expiring30.length !== 1 ? 's' : ''}</strong> expiring
              within 30 days: {expiring30.map(c => c.domain).join(', ')}
            </div>
          </div>
        )}

        {/* Connected CAs */}
        <div className="v2-section-label" style={{ marginBottom: 10 }}>Connected CAs</div>
        <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap: 10, marginBottom: 24 }}>

          {connections.map(conn => {
            const def = CA_DEFS[conn.ca_type] || {}
            const res = syncResult[conn.id]
            return (
              <div key={conn.id} className="v2-card" style={{ overflow: 'hidden',
                borderColor: conn.status === 'active' ? `${def.color || 'rgba(255,255,255,0.7)'}30` : '#fecaca' }}>
                <div style={{ padding: '13px 14px', borderBottom: '0.5px solid var(--v2-border)',
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: def.bg || '#000000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize:12, color: def.color || 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                    {def.logo || conn.ca_name?.slice(0,2).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conn.label || conn.ca_name}
                    </div>
                    <div style={{ fontSize:11, color: conn.status === 'active' ? '#4ade80' : '#f87171', marginTop: 2 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: 'currentColor', marginRight: 5, verticalAlign: 'middle' }}/>
                      {conn.status === 'active' ? `${conn.cert_count || 0} certs tracked` : 'Error'}
                    </div>
                  </div>
                  <button onClick={() => setDelConn(conn.id)} style={{ background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--v2-text-3)', padding: 4, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--v2-text-3)'}>
                    <Trash2 size={13}/>
                  </button>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {conn.error_message && (
                    <div style={{ fontSize:11, color: '#f87171', marginBottom: 8,
                      background: '#fef2f2', borderRadius: 5, padding: '5px 8px' }}>
                      {conn.error_message}
                    </div>
                  )}
                  {res && (
                    <div style={{ fontSize:11, marginBottom: 8, padding: '5px 8px', borderRadius: 5,
                      background: res.ok ? '#111111' : '#fef2f2',
                      color: res.ok ? '#166534' : '#f87171' }}>
                      {res.ok
                        ? `✓ Synced — ${res.imported} imported, ${res.skipped || 0} skipped`
                        : `✗ ${res.error}`}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ fontSize:11, color: 'var(--v2-text-3)', flex: 1, alignSelf: 'center' }}>
                      {conn.last_sync_at ? `Last sync ${fmtDate(conn.last_sync_at)}` : 'Never synced'}
                    </div>
                    <button className="v2-btn v2-btn-sm" onClick={() => doSync(conn.id)}
                      disabled={syncing === conn.id}>
                      {syncing === conn.id
                        ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }}/>
                        : <RefreshCw size={11}/>}
                      {syncing === conn.id ? ' Syncing…' : ' Sync now'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add DigiCert */}
          {!connections.find(c => c.ca_type === 'digicert') && (
            <div className="v2-card" style={{ borderStyle: 'dashed', display: 'flex',
              alignItems: 'center', justifyContent: 'center', minHeight: 120, cursor: 'pointer' }}
              onClick={() => openAdd('digicert')}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef2f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize:12, color: '#f87171', margin: '0 auto 8px' }}>DC</div>
                <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text-2)' }}>Connect DigiCert</div>
                <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>CertCentral API</div>
              </div>
            </div>
          )}

          {/* Add Sectigo */}
          {!connections.find(c => c.ca_type === 'sslcom') && (
            <button className="v2-card v2-card-hover"
              style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer', border:'none', textAlign:'left', fontFamily:'inherit' }}
              onClick={() => openAdd('sslcom')}>
              <div style={{ width:32, height:32, borderRadius:8, background: CA_DEFS.sslcom.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color: CA_DEFS.sslcom.color, flexShrink:0 }}>SL</div>
              <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text-2)' }}>Connect SSL.com</div>
            </button>
          )}
          {!connections.find(c => c.ca_type === 'sectigo') && (
            <div className="v2-card" style={{ borderStyle: 'dashed', display: 'flex',
              alignItems: 'center', justifyContent: 'center', minHeight: 120, cursor: 'pointer' }}
              onClick={() => openAdd('sectigo')}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize:12, color: '#ffffff', margin: '0 auto 8px' }}>SC</div>
                <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text-2)' }}>Connect Sectigo</div>
                <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>SCM API</div>
              </div>
            </div>
          )}

          {/* Manual import card */}
          <div className="v2-card" style={{ borderStyle: 'dashed', display: 'flex',
            alignItems: 'center', justifyContent: 'center', minHeight: 120, cursor: 'pointer' }}
            onClick={() => { setShowImport(true); setPemText(''); setImportResult(null) }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--v2-surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Upload size={15} style={{ color: 'var(--v2-text-3)' }}/>
              </div>
              <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text-2)' }}>Paste PEM</div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>Any CA, any cert</div>
            </div>
          </div>
        </div>

        {/* Cert table */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div className="v2-section-label" style={{ margin:0 }}>
            Tracked certificates ({certs.length})
          </div>
          {certs.length > 0 && (
            <button
              onClick={() => setDelAllModal(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11,
                fontWeight:600, padding:'5px 12px', borderRadius:7, cursor:'pointer',
                background:'#fef2f2', color:'#f87171', border:'0.5px solid #fecaca',
                fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#f87171';e.currentTarget.style.color='#000000'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#f87171'}}>
              <Trash2 size={11}/> Delete all {certs.length} certs
            </button>
          )}
        </div>
        <div className="v2-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)',
            background: 'var(--v2-surface-3)' }}>
            {['Domain / SANs', 'CA source', 'Issuer', 'Expires', 'Status', ''].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight: 500, color: 'var(--v2-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:13 }}>
              <RefreshCw size={14} style={{ animation: 'spin .8s linear infinite', marginRight: 6 }}/>
              Loading…
            </div>
          ) : certs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Shield size={28} style={{ color: 'var(--v2-text-3)', margin: '0 auto 12px', display: 'block' }}/>
              <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text-2)', marginBottom: 5 }}>
                No certificates tracked yet
              </div>
              <div style={{ fontSize:12, color: 'var(--v2-text-3)', marginBottom: 16 }}>
                Connect DigiCert or Sectigo to pull your portfolio, or paste a PEM manually.
              </div>
              <button className="v2-btn v2-btn-primary" onClick={() => { setShowImport(true); setPemText(''); setImportResult(null) }}>
                <Upload size={12}/> Paste first cert
              </button>
            </div>
          ) : certs.map((cert, i) => (
            <div key={cert.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '10px 16px', borderBottom: i < certs.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
              alignItems: 'center', transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize:12, fontWeight: 500, fontFamily: 'monospace',
                  color: 'var(--v2-text)' }}>{cert.domain}</div>
                {cert.san_list?.length > 0 && (
                  <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 2 }}>
                    +{cert.san_list.length} SAN{cert.san_list.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div><SourceBadge source={cert.source || cert.imported_from}/></div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cert.issuer || '—'}
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{fmtDate(cert.expires_at)}</div>
              <div><ExpiryBadge expiresAt={cert.expires_at}/></div>
              <div>
                <button
                  onClick={() => openRenewModal(cert)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize:10, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                    background: '#111111', color: '#ffffff',
                    border: '0.5px solid #A8E6DE', cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#ffffff'; e.currentTarget.style.color='#000000' }}
                  onMouseLeave={e => { e.currentTarget.style.background='#111111'; e.currentTarget.style.color='#ffffff' }}>
                  <RotateCcw size={10}/> Renew
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Connect CA modal ── */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
            background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--v2-bg)', borderRadius: 14, width: '100%', maxWidth: 480,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '0.5px solid var(--v2-border)' }}>
              <div style={{ padding: '18px 22px 14px', borderBottom: '0.5px solid var(--v2-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize:15, fontWeight: 500 }}>Connect a CA</div>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none',
                  border: '0.5px solid var(--v2-border)', borderRadius: 6, cursor: 'pointer',
                  color: 'var(--v2-text-3)', padding: '4px 6px' }}><X size={14}/></button>
              </div>
              <div style={{ padding: '18px 22px 22px' }}>
                {!addCa ? (
                  // CA picker
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize:12, color: 'var(--v2-text-2)', marginBottom: 4, lineHeight: 1.6 }}>
                      Choose a CA to connect. SSLVault will pull your existing certificates for monitoring.
                      <strong style={{ color: 'var(--v2-text)' }}> No private keys needed.</strong>
                    </div>
                    {Object.entries(CA_DEFS).map(([key, def]) => (
                      <div key={key} onClick={() => { setAddCa(key); setAddLabel(def.name); setAddFields({}); setAddError('') }}
                        style={{ padding: '14px 16px', borderRadius: 10, border: '0.5px solid var(--v2-border)',
                          background: 'var(--v2-bg)', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: 12, transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = def.color; e.currentTarget.style.background = def.bg }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--v2-border)'; e.currentTarget.style.background = 'var(--v2-bg)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: def.bg, border: `0.5px solid ${def.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize:12, color: def.color, flexShrink: 0 }}>
                          {def.logo}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text)' }}>{def.name}</div>
                          <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>{def.desc}</div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--v2-text-3)' }}/>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Credential form
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                      padding: '10px 12px', borderRadius: 8, background: 'var(--v2-surface-3)',
                      border: '0.5px solid var(--v2-border)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7,
                        background: CA_DEFS[addCa].bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize:11,
                        color: CA_DEFS[addCa].color, flexShrink: 0 }}>{CA_DEFS[addCa].logo}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize:13, fontWeight: 500, color: 'var(--v2-text)' }}>{CA_DEFS[addCa].name}</div>
                      </div>
                      {CA_DEFS[addCa].docs && (
                        <a href={CA_DEFS[addCa].docs} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:11, color: 'var(--v2-text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          Docs <ExternalLink size={11}/>
                        </a>
                      )}
                    </div>

                    {/* No private key notice */}
                    <div style={{ background: 'var(--v2-surface-3)', borderRadius: 8, padding: '10px 12px',
                      marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Info size={13} style={{ color: 'var(--v2-text-3)', flexShrink: 0, marginTop: 1 }}/>
                      <div style={{ fontSize:11, color: 'var(--v2-text-2)', lineHeight: 1.6 }}>
                        SSLVault reads certificate details only — expiry, domain, issuer, SANs.
                        Your private keys stay on your servers.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label className="v2-section-label" style={{ display: 'block', marginBottom: 5 }}>Label</label>
                      <input className="v2-input" value={addLabel}
                        onChange={e => setAddLabel(e.target.value)} placeholder="e.g. Production DigiCert"/>
                    </div>

                    {CA_DEFS[addCa].fields.map(f => (
                      <div key={f.key} style={{ marginBottom: 12 }}>
                        <label className="v2-section-label" style={{ display: 'block', marginBottom: 5 }}>
                          {f.label}{f.required ? ' *' : ''}
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input className="v2-input"
                            type={f.type === 'password' && !showPwd[f.key] ? 'password' : 'text'}
                            value={addFields[f.key] || ''}
                            onChange={e => setAddFields(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            style={f.type === 'password' ? { paddingRight: 36 } : {}}/>
                          {f.type === 'password' && (
                            <button type="button" onClick={() => setShowPwd(p => ({ ...p, [f.key]: !p[f.key] }))}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)' }}>
                              {showPwd[f.key] ? <EyeOff size={13}/> : <Eye size={13}/>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {addError && (
                      <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 7,
                        padding: '9px 12px', marginBottom: 12, fontSize:12, color: '#f87171',
                        display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }}/>{addError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="v2-btn" onClick={() => setAddCa(null)}>Back</button>
                      <button className="v2-btn v2-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={saveConnection} disabled={addSaving}>
                        {addSaving
                          ? <><RefreshCw size={12} style={{ animation: 'spin .8s linear infinite' }}/> Connecting…</>
                          : <><Check size={12}/> Connect & sync</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Manual PEM import modal ── */}
        {showImport && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
            background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--v2-bg)', borderRadius: 14, width: '100%', maxWidth: 480,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '0.5px solid var(--v2-border)' }}>
              <div style={{ padding: '18px 22px 14px', borderBottom: '0.5px solid var(--v2-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight: 500 }}>Import certificate</div>
                  <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>
                    Paste cert PEM — domain, expiry &amp; issuer extracted automatically
                  </div>
                </div>
                <button onClick={() => setShowImport(false)} style={{ background: 'none',
                  border: '0.5px solid var(--v2-border)', borderRadius: 6, cursor: 'pointer',
                  color: 'var(--v2-text-3)', padding: '4px 6px' }}><X size={14}/></button>
              </div>
              <div style={{ padding: '18px 22px 22px' }}>
                {!importResult ? (
                  <>
                    {/* No private key notice */}
                    <div style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)',
                      borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                      display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Info size={13} style={{ color: 'var(--v2-text-3)', flexShrink: 0, marginTop: 1 }}/>
                      <div style={{ fontSize:12, color: 'var(--v2-text-2)', lineHeight: 1.6 }}>
                        <strong>Only the certificate PEM is needed</strong> for tracking.
                        Private key not required — it stays on your server.
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label className="v2-section-label" style={{ display: 'block', marginBottom: 6 }}>
                        Certificate PEM *
                      </label>
                      <textarea className="v2-input" rows={8}
                        placeholder={'-----BEGIN CERTIFICATE-----\nMIIFaz...\n-----END CERTIFICATE-----'}
                        value={pemText} onChange={e => setPemText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize:11, resize: 'vertical' }}/>
                      <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 4 }}>
                        Paste the full chain (cert + intermediates) for best issuer detection.
                      </div>
                    </div>
                    <button className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={doImport} disabled={importing || !pemText.trim()}>
                      {importing
                        ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/> Parsing…</>
                        : <><FileText size={13}/> Import certificate</>}
                    </button>
                  </>
                ) : importResult.ok ? (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#111111',
                      border: '1.5px solid #A8E6DE', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', margin: '0 auto 14px' }}>
                      <Check size={20} style={{ color: '#4ade80' }}/>
                    </div>
                    <div style={{ fontSize:15, fontWeight: 500, marginBottom: 12 }}>Certificate imported</div>
                    <div style={{ background: 'var(--v2-surface-3)', borderRadius: 8, padding: '12px 14px',
                      marginBottom: 16, textAlign: 'left' }}>
                      {[
                        ['Domain',  importResult.parsed?.domain],
                        ['Issuer',  importResult.parsed?.issuer],
                        ['Expires', fmtDate(importResult.parsed?.validTill)],
                        ['Type',    importResult.parsed?.certType],
                        ['SANs',    importResult.parsed?.sans?.length > 0
                          ? importResult.parsed.sans.slice(0,3).join(', ') + (importResult.parsed.sans.length > 3 ? ` +${importResult.parsed.sans.length - 3} more` : '')
                          : null],
                      ].filter(([,v]) => v).map(([k,v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                          padding: '5px 0', borderBottom: '0.5px solid var(--v2-border)', fontSize:12 }}>
                          <span style={{ color: 'var(--v2-text-3)' }}>{k}</span>
                          <span style={{ color: 'var(--v2-text)', fontFamily: k === 'Domain' ? 'monospace' : 'inherit',
                            textAlign: 'right', maxWidth: 260, wordBreak: 'break-word' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="v2-btn" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => { setPemText(''); setImportResult(null) }}>
                        Import another
                      </button>
                      <button className="v2-btn v2-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setShowImport(false)}>
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <AlertTriangle size={32} style={{ color: '#f87171', margin: '0 auto 12px', display: 'block' }}/>
                    <div style={{ fontSize:13, color: '#f87171', marginBottom: 16 }}>{importResult.error}</div>
                    <button className="v2-btn" onClick={() => setImportResult(null)}>Try again</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Delete connection confirm ── */}
        {delConn && (() => {
          const conn = connections.find(c => c.id === delConn)
          const connCertCount = certs.filter(c => c.ca_connection_id === delConn).length
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
              <div style={{ background: 'var(--v2-bg)', borderRadius: 14, width: '100%', maxWidth: 400,
                padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '0.5px solid var(--v2-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={15} color="#dc2626"/>
                  </div>
                  <div style={{ fontSize:15, fontWeight: 600, color: 'var(--v2-text)' }}>
                    Remove {conn?.label || 'connection'}?
                  </div>
                </div>
                <div style={{ fontSize:13, color: 'var(--v2-text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                  This CA connection will be disconnected and will no longer sync.
                  {connCertCount > 0 && (
                    <span style={{ color: '#ffffff', fontWeight: 500 }}> {connCertCount} certificate{connCertCount !== 1 ? 's' : ''} are linked to this connection.</span>
                  )}
                </div>
                {connCertCount > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '10px 12px', borderRadius: 8, marginBottom: 16,
                    background: delCerts ? '#fef2f2' : 'var(--v2-surface-3)',
                    border: `0.5px solid ${delCerts ? '#fecaca' : 'var(--v2-border)'}`,
                    transition: 'all .15s' }}>
                    <input type="checkbox" checked={delCerts} onChange={e => setDelCerts(e.target.checked)}
                      style={{ width: 14, height: 14, accentColor: '#f87171', flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontSize:12, fontWeight: 600, color: delCerts ? '#f87171' : 'var(--v2-text)' }}>
                        Also delete {connCertCount} imported certificate{connCertCount !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 1 }}>
                        {delCerts ? 'Certificates will be removed from your inventory' : 'Certificates will remain but no longer sync'}
                      </div>
                    </div>
                  </label>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="v2-btn" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setDelConn(null); setDelCerts(true) }}>Cancel</button>
                  <button onClick={() => deleteConn(delConn)}
                    style={{ flex: 1, background: '#f87171', color: '#ffffff', border: 'none',
                      borderRadius: 8, padding: '9px', cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 600, fontSize:13, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6 }}>
                    <Trash2 size={13}/>
                    {delCerts && connCertCount > 0 ? `Remove + delete ${connCertCount} certs` : 'Remove connection'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      </div>

        {/* ── Renew choice modal ── */}
        {renewModal && (() => {
          const src = renewModal.source || renewModal.imported_from
          const caName = CA_NAMES[src] || 'your CA'
          const caUrl  = CA_RENEWAL_URLS[src]
          return (
            <div style={{ position:'fixed', inset:0, zIndex:1001, display:'flex',
              alignItems:'center', justifyContent:'center', padding:20,
              background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}
              onClick={e => e.target===e.currentTarget && setRenewModal(null)}>
              <div style={{ background:'#000000', borderRadius:16, width:'100%', maxWidth:420,
                boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid #99f6e4',
                overflow:'hidden' }}>

                {/* Header */}
                <div style={{ padding:'18px 20px 14px', borderBottom:'0.5px solid #e6fbf5',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:'#111111',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <RotateCcw size={13} color="#0d9488"/>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:'#ffffff' }}>Renew certificate</span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', marginTop:4, marginLeft:36,
                      fontFamily:'monospace' }}>{renewModal.domain}</div>
                  </div>
                  <button onClick={() => setRenewModal(null)}
                    style={{ background:'#000000', border:'0.5px solid #99f6e4', borderRadius:7,
                      cursor:'pointer', color:'rgba(255,255,255,0.38)', padding:'5px', display:'flex' }}>
                    <X size={14}/>
                  </button>
                </div>

                {/* Two options */}
                <div style={{ padding:'16px 20px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>
                    How would you like to renew this certificate?
                  </div>

                  {/* Option A — Renew via CA */}
                  <button onClick={() => renewViaCa(renewModal)}
                    style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                      borderRadius:10, border:'1.5px solid #99f6e4', background:'#000000',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#ffffff'; e.currentTarget.style.background='#111111' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#ffffff'; e.currentTarget.style.background='#000000' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'#ffffff',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ExternalLink size={15} color="rgba(0,0,0,0.55)"/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#ffffff', marginBottom:3 }}>
                        Renew via {caName}
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>
                        Log into {caUrl ? caName : 'your original CA'} and renew there.
                        Once renewed, re-import or re-sync to update SSLVault.
                      </div>
                      {caUrl && (
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.38)', marginTop:4, fontFamily:'monospace',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{caUrl}</div>
                      )}
                    </div>
                  </button>

                  {/* Option B — Renew via SSLVault */}
                  <button onClick={() => renewViaSSLVault(renewModal)}
                    style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                      borderRadius:10, border:'1.5px solid #99f6e4', background:'#000000',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#4ade80'; e.currentTarget.style.background='#111111' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#ffffff'; e.currentTarget.style.background='#000000' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'#111111',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Shield size={15} color="#16a34a"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#ffffff', marginBottom:3 }}>
                        Renew via SSLVault
                        <span style={{ marginLeft:7, fontSize:9, fontWeight:700, padding:'2px 7px',
                          borderRadius:20, background:'#111111', color:'#4ade80',
                          border:'0.5px solid #A8E6DE' }}>Recommended</span>
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>
                        Issue a fresh RapidSSL DV certificate through SSLVault — RapidSSL CA API,
                        auto-DNS validation, auto-install on your servers. Domain pre-filled.
                      </div>
                      <div style={{ fontSize:10, color:'#4ade80', marginTop:5, fontWeight:600,
                        display:'flex', alignItems:'center', gap:4 }}>
                        <Check size={10}/> DigiCert trust chain · ~5 min · auto-installs
                      </div>
                    </div>
                  </button>

                  <button onClick={() => setRenewModal(null)}
                    style={{ fontSize:12, color:'rgba(255,255,255,0.38)', background:'none', border:'none',
                      cursor:'pointer', fontFamily:'inherit', padding:'6px 0', textAlign:'center' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        })()}


        {/* ── Delete all certs confirm modal ── */}
        {delAllModal && (
          <div style={{ position:'fixed', inset:0, zIndex:1002, display:'flex',
            alignItems:'center', justifyContent:'center', padding:20,
            background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}
            onClick={e => e.target===e.currentTarget && !deletingAll && setDelAllModal(false)}>
            <div style={{ background:'#000000', borderRadius:16, width:'100%', maxWidth:400,
              boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid #99f6e4', overflow:'hidden' }}>

              {/* Header */}
              <div style={{ padding:'18px 20px 14px', borderBottom:'0.5px solid #e6fbf5',
                display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'#fef2f2', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Trash2 size={16} color="#dc2626"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#ffffff' }}>Delete all tracked certificates?</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', marginTop:2 }}>{certs.length} certificate{certs.length!==1?'s':''} will be permanently removed</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding:'16px 20px' }}>
                <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:9,
                  padding:'12px 14px', marginBottom:16, fontSize:12, color:'#f87171', lineHeight:1.6 }}>
                  This will <strong>permanently delete</strong> all {certs.length} tracked certificates
                  and remove every reference from the database. CA connections are kept — you can re-sync anytime.
                  This cannot be undone.
                </div>

                {/* Cert summary */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                  {['digicert','sectigo','sslcom','imported'].map(src => {
                    const count = certs.filter(c => c.source===src||c.imported_from===src).length
                    if (!count) return null
                    const colors = {digicert:['#fef2f2','#f87171'],sectigo:['rgba(239,68,68,0.08)','#ffffff'],sslcom:['#D4F5EF','#ffffff'],imported:['#000000','rgba(255,255,255,0.7)']}
                    const [bg,color] = colors[src]||['#000000','rgba(255,255,255,0.7)']
                    const labels = {digicert:'DigiCert',sectigo:'Sectigo',sslcom:'SSL.com',imported:'Manual'}
                    return (
                      <div key={src} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                        background:bg, color, border:`0.5px solid ${color}44` }}>
                        {labels[src]}: {count}
                      </div>
                    )
                  })}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setDelAllModal(false)} disabled={deletingAll}
                    style={{ flex:1, padding:'9px', border:'0.5px solid #99f6e4', borderRadius:8,
                      background:'#000000', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600 }}>
                    Cancel
                  </button>
                  <button onClick={doDeleteAll} disabled={deletingAll}
                    style={{ flex:2, padding:'9px', background: deletingAll?'rgba(255,255,255,0.38)':'#f87171',
                      color:'#ffffff', border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                      cursor: deletingAll?'wait':'pointer', fontFamily:'inherit',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {deletingAll
                      ? <><RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> Deleting…</>
                      : <><Trash2 size={12}/> Delete all {certs.length} certificates</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
