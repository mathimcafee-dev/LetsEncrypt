import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, RefreshCw, Trash2, Check, AlertTriangle, X,
  Upload, Link2, Shield, ChevronRight, Eye, EyeOff,
  Clock, Calendar, ExternalLink, FileText, Building2
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

async function callImport(tok, body) {
  const r = await fetch(`${SB_URL}/functions/v1/ca-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
    body: JSON.stringify(body)
  })
  return r.json()
}

function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function ExpiryBadge({ expiresAt }) {
  const d = daysLeft(expiresAt)
  if (d === null) return <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>—</span>
  const color = d > 60 ? '#16a34a' : d > 30 ? '#d97706' : d > 0 ? '#dc2626' : '#7c3aed'
  const bg    = d > 60 ? '#f0fdf4' : d > 30 ? '#fffbeb' : d > 0 ? '#fef2f2' : '#fdf4ff'
  const label = d > 0 ? `${d}d left` : d === 0 ? 'Today' : 'Expired'
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: bg, color }}>
      {label}
    </span>
  )
}

function SourceBadge({ source, importedFrom }) {
  const src = importedFrom || source
  const map = {
    digicert: { label: 'DigiCert', color: '#dc2626', bg: '#fef2f2' },
    sectigo:  { label: 'Sectigo',  color: '#c2410c', bg: '#fff7ed' },
    manual:   { label: 'Imported', color: '#64748b', bg: '#f8fafc' },
    imported: { label: 'Imported', color: '#64748b', bg: '#f8fafc' },
    letsencrypt: { label: "Let's Encrypt", color: '#2563eb', bg: '#eff6ff' },
    gogetssl: { label: 'GoGetSSL', color: '#16a34a', bg: '#f0fdf4' },
  }
  const m = map[src] || { label: src || 'Unknown', color: '#64748b', bg: '#f8fafc' }
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
      background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

const CA_CONFIGS = {
  digicert: {
    name: 'DigiCert',
    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    logo: 'DC',
    desc: 'Import all certificates from your DigiCert CertCentral account via API key.',
    fields: [{ key: 'api_key', label: 'CertCentral API Key', type: 'password', placeholder: 'Your DigiCert API key' }],
    docsUrl: 'https://dev.digicert.com/en/certcentral-apis/authentication.html',
  },
  sectigo: {
    name: 'Sectigo',
    color: '#c2410c', bg: '#fff7ed', border: '#fed7aa',
    logo: 'SC',
    desc: 'Import certificates from Sectigo Certificate Manager (SCM) platform.',
    fields: [
      { key: 'customer_uri', label: 'Customer URI', type: 'text', placeholder: 'your-company' },
      { key: 'login',        label: 'Login',        type: 'text', placeholder: 'admin@company.com' },
      { key: 'password',     label: 'Password',     type: 'password', placeholder: '••••••••' },
    ],
    docsUrl: 'https://www.sectigo.com/knowledge-base/detail/Sectigo-Certificate-Manager-REST-API/kA01N000000bvJg',
    comingSoon: false,
  },
}

export default function CAConnectors({ nav }) {
  const [tok,         setTok]         = useState('')
  const [connections, setConnections] = useState([])
  const [certs,       setCerts]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null) // 'add_connection' | 'manual_import' | 'add_ca_pick'
  const [selCaType,   setSelCaType]   = useState(null)
  const [fields,      setFields]      = useState({})
  const [showPass,    setShowPass]    = useState({})
  const [saving,      setSaving]      = useState(false)
  const [saveErr,     setSaveErr]     = useState('')
  const [syncing,     setSyncing]     = useState(null)
  const [syncResult,  setSyncResult]  = useState(null)
  const [deleting,    setDeleting]    = useState(null)
  // Manual import state
  const [pemText,     setPemText]     = useState('')
  const [keyText,     setKeyText]     = useState('')
  const [importing,   setImporting]   = useState(false)
  const [importResult,setImportResult]= useState(null)

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    setTok(session.access_token)
    const [connRes, certRes] = await Promise.all([
      callImport(session.access_token, { action: 'list_connections' }),
      callImport(session.access_token, { action: 'list_imported' }),
    ])
    if (connRes.ok)  setConnections(connRes.connections || [])
    if (certRes.ok)  setCerts(certRes.certs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = (caType) => { setSelCaType(caType); setFields({}); setSaveErr(''); setModal('add_connection') }

  const saveConnection = async () => {
    setSaving(true); setSaveErr('')
    const cfg = CA_CONFIGS[selCaType]
    const payload = { action: 'save_connection', ca_type: selCaType }
    cfg.fields.forEach(f => { payload[f.key] = fields[f.key] || '' })
    const d = await callImport(tok, payload)
    if (d.ok) {
      setModal(null)
      await load()
      // Auto-sync after connecting
      if (d.connection?.id) doSync(d.connection.id)
    } else {
      setSaveErr(d.error || 'Failed to connect')
    }
    setSaving(false)
  }

  const doSync = async (connId) => {
    setSyncing(connId); setSyncResult(null)
    const d = await callImport(tok, { action: 'sync', connection_id: connId })
    setSyncResult({ connId, ...d })
    setSyncing(null)
    await load()
  }

  const deleteConn = async (connId) => {
    setDeleting(connId)
    await callImport(tok, { action: 'delete_connection', connection_id: connId })
    setDeleting(null)
    await load()
  }

  const deleteCert = async (certId) => {
    await callImport(tok, { action: 'delete_cert', cert_id: certId })
    await load()
  }

  const doManualImport = async () => {
    if (!pemText.trim()) return
    setImporting(true); setImportResult(null)
    const d = await callImport(tok, { action: 'manual_import', cert_pem: pemText.trim(), private_key_pem: keyText.trim() || undefined })
    setImportResult(d)
    if (d.ok) { await load(); setPemText(''); setKeyText('') }
    setImporting(false)
  }

  // Stats
  const expiring30 = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d <= 30 && d >= 0 })
  const expiring7  = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d <= 7  && d >= 0 })
  const bySource   = certs.reduce((acc, c) => { const s = c.imported_from || c.source || 'unknown'; acc[s] = (acc[s]||0)+1; return acc }, {})

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 980 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, paddingTop:8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:24, letterSpacing:'-0.4px' }}>CA connectors</h1>
            <p className="v2-subtitle" style={{ fontSize:13, marginTop:4 }}>
              Monitor certificates from any CA — import manually or connect via API to pull your full portfolio.
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="v2-btn" onClick={() => { setPemText(''); setKeyText(''); setImportResult(null); setModal('manual_import') }}>
              <Upload size={13}/> Import cert
            </button>
            <button className="v2-btn v2-btn-primary" onClick={() => setModal('add_ca_pick')}>
              <Link2 size={13}/> Connect CA
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
          {[
            { val: certs.length,       label: 'Certs tracked',  color: 'var(--v2-text)' },
            { val: connections.length, label: 'CAs connected',  color: '#2563eb' },
            { val: expiring30.length,  label: 'Expiring 30d',   color: '#d97706' },
            { val: expiring7.length,   label: 'Expiring 7d',    color: '#dc2626' },
          ].map(({ val, label, color }) => (
            <div key={label} className="v2-card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Urgent expiry alert */}
        {expiring7.length > 0 && (
          <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:10, padding:'12px 16px',
            marginBottom:20, display:'flex', gap:10, alignItems:'center' }}>
            <AlertTriangle size={15} style={{ color:'#dc2626', flexShrink:0 }}/>
            <div style={{ fontSize:13, color:'#991b1b' }}>
              <strong>{expiring7.length} certificate{expiring7.length !== 1 ? 's' : ''}</strong> expiring within 7 days —{' '}
              {expiring7.map(c => c.domain).join(', ')}
            </div>
          </div>
        )}

        {/* CA connections */}
        {connections.length > 0 && (
          <>
            <div className="v2-section-label" style={{ marginBottom:10 }}>Connected CAs</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
              {connections.map(conn => {
                const cfg = CA_CONFIGS[conn.ca_type] || {}
                const syncRes = syncResult?.connId === conn.id ? syncResult : null
                return (
                  <div key={conn.id} className="v2-card" style={{ overflow:'hidden', padding:0,
                    borderColor: conn.status === 'error' ? '#fecaca' : conn.status === 'active' ? 'rgba(22,163,74,0.3)' : 'var(--v2-border)' }}>
                    <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--v2-border)',
                      display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:8, flexShrink:0, fontWeight:700,
                        fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
                        background: cfg.bg || 'var(--v2-surface-3)', color: cfg.color || 'var(--v2-text-2)' }}>
                        {cfg.logo || conn.ca_name?.slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>{conn.label || conn.ca_name}</div>
                        <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>
                          {conn.last_sync_at ? `Last synced ${fmtDate(conn.last_sync_at)}` : 'Never synced'}
                          {' · '}{conn.cert_count || 0} certs
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button className="v2-btn v2-btn-sm" onClick={() => doSync(conn.id)} disabled={syncing === conn.id}>
                          {syncing === conn.id
                            ? <RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/>
                            : <><RefreshCw size={12}/> Sync</>}
                        </button>
                        <button onClick={() => deleteConn(conn.id)} disabled={deleting === conn.id}
                          style={{ background:'none', border:'0.5px solid var(--v2-border)', borderRadius:6,
                            cursor:'pointer', color:'var(--v2-text-3)', padding:'4px 6px', display:'flex', alignItems:'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--v2-text-3)'}>
                          {deleting === conn.id
                            ? <RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/>
                            : <Trash2 size={12}/>}
                        </button>
                      </div>
                    </div>
                    {conn.status === 'error' && conn.error_message && (
                      <div style={{ padding:'8px 14px', background:'#fef2f2', fontSize:11, color:'#dc2626',
                        borderBottom:'0.5px solid #fecaca', display:'flex', gap:6, alignItems:'flex-start' }}>
                        <AlertTriangle size={11} style={{ flexShrink:0, marginTop:1 }}/>{conn.error_message}
                      </div>
                    )}
                    {syncRes && (
                      <div style={{ padding:'8px 14px', background: syncRes.ok ? '#f0fdf4' : '#fef2f2',
                        fontSize:11, color: syncRes.ok ? '#15803d' : '#dc2626',
                        borderBottom:'0.5px solid var(--v2-border)' }}>
                        {syncRes.ok
                          ? `✓ Synced — ${syncRes.imported} certs imported${syncRes.skipped ? `, ${syncRes.skipped} skipped` : ''}`
                          : syncRes.error}
                        {syncRes.errors?.length > 0 && <div style={{ opacity:0.7, marginTop:2 }}>{syncRes.errors[0]}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Cert table */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div className="v2-section-label">Tracked certificates</div>
          {Object.keys(bySource).length > 0 && (
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(bySource).map(([src, cnt]) => (
                <span key={src} style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                  <SourceBadge source={src} importedFrom={src}/> {cnt}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="v2-card" style={{ overflow:'hidden', padding:0 }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 40px',
            padding:'9px 16px', borderBottom:'0.5px solid var(--v2-border)',
            background:'var(--v2-surface-3)' }}>
            {['Domain / SANs', 'Source', 'Issuer', 'Expiry', 'Status', ''].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:500, color:'var(--v2-text-3)',
                textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--v2-text-3)', fontSize:13 }}>
              <RefreshCw size={16} style={{ animation:'spin .8s linear infinite', marginBottom:8 }}/><br/>Loading…
            </div>
          ) : certs.length === 0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'var(--v2-surface-3)',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <Shield size={22} style={{ color:'var(--v2-text-3)' }}/>
              </div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--v2-text-2)', marginBottom:6 }}>No certificates tracked yet</div>
              <div style={{ fontSize:12, color:'var(--v2-text-3)', marginBottom:18 }}>
                Connect a CA to auto-import your portfolio, or paste a cert PEM manually.
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button className="v2-btn" onClick={() => { setPemText(''); setKeyText(''); setImportResult(null); setModal('manual_import') }}>
                  <Upload size={12}/> Import cert
                </button>
                <button className="v2-btn v2-btn-primary" onClick={() => setModal('add_ca_pick')}>
                  <Link2 size={12}/> Connect CA
                </button>
              </div>
            </div>
          ) : certs.map((cert, i) => {
            const d = daysLeft(cert.expires_at)
            return (
              <div key={cert.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 40px',
                padding:'11px 16px', borderBottom: i < certs.length-1 ? '0.5px solid var(--v2-border)' : 'none',
                alignItems:'center', transition:'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, fontFamily:'monospace', color:'var(--v2-text)' }}>
                    {cert.domain}
                  </div>
                  {cert.san_list?.length > 1 && (
                    <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:2 }}>
                      +{cert.san_list.length - 1} SAN{cert.san_list.length > 2 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div><SourceBadge source={cert.source} importedFrom={cert.imported_from}/></div>
                <div style={{ fontSize:11, color:'var(--v2-text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {cert.issuer || '—'}
                </div>
                <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>{fmtDate(cert.expires_at)}</div>
                <div><ExpiryBadge expiresAt={cert.expires_at}/></div>
                <div>
                  <button onClick={() => deleteCert(cert.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--v2-text-3)',
                      padding:4, display:'flex', alignItems:'center', borderRadius:4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--v2-text-3)'}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Modal: pick CA ───────────────────────────────────────────────── */}
        {modal === 'add_ca_pick' && (
          <Modal title="Connect a certificate authority" onClose={() => setModal(null)} width={500}>
            <p style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:18, lineHeight:1.6 }}>
              Connect your CA via API to automatically import and track all your certificates.
              No auto-renewal — monitoring only.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {Object.entries(CA_CONFIGS).map(([key, cfg]) => (
                <div key={key}
                  onClick={() => { setModal(null); openAdd(key) }}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                    borderRadius:10, border:'0.5px solid var(--v2-border)', cursor:'pointer',
                    transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.background = cfg.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--v2-border)'; e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width:40, height:40, borderRadius:9, background:cfg.bg,
                    border:`0.5px solid ${cfg.border}`, display:'flex', alignItems:'center',
                    justifyContent:'center', fontWeight:700, fontSize:13, color:cfg.color, flexShrink:0 }}>
                    {cfg.logo}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>{cfg.name}</div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2, lineHeight:1.5 }}>{cfg.desc}</div>
                  </div>
                  <ChevronRight size={15} style={{ color:'var(--v2-text-3)', flexShrink:0 }}/>
                </div>
              ))}
              {/* Manual import shortcut */}
              <div onClick={() => { setModal('manual_import'); setPemText(''); setKeyText(''); setImportResult(null) }}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                  borderRadius:10, border:'0.5px dashed var(--v2-border)', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.background = 'var(--v2-surface-3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--v2-border)'; e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width:40, height:40, borderRadius:9, background:'var(--v2-surface-3)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Upload size={16} style={{ color:'var(--v2-text-3)' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>Paste PEM manually</div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>Any CA — paste cert PEM to import for tracking</div>
                </div>
                <ChevronRight size={15} style={{ color:'var(--v2-text-3)', flexShrink:0 }}/>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Modal: connect CA ────────────────────────────────────────────── */}
        {modal === 'add_connection' && selCaType && (() => {
          const cfg = CA_CONFIGS[selCaType]
          return (
            <Modal title={`Connect ${cfg.name}`} onClose={() => setModal(null)} width={480}>
              <div style={{ background:cfg.bg, border:`0.5px solid ${cfg.border}`,
                borderRadius:8, padding:'12px 14px', marginBottom:18,
                display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:7, background:'white',
                  border:`0.5px solid ${cfg.border}`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontWeight:700, fontSize:12, color:cfg.color, flexShrink:0 }}>
                  {cfg.logo}
                </div>
                <div style={{ fontSize:12, color:cfg.color, lineHeight:1.5 }}>
                  {cfg.desc}
                  {cfg.docsUrl && (
                    <a href={cfg.docsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color:cfg.color, display:'inline-flex', alignItems:'center', gap:3, marginLeft:6, fontSize:11 }}>
                      API docs <ExternalLink size={10}/>
                    </a>
                  )}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)',
                  display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                  Label (optional)
                </label>
                <input className="v2-input" placeholder={`My ${cfg.name} account`}
                  value={fields.label || ''}
                  onChange={e => setFields(f => ({ ...f, label: e.target.value }))}/>
              </div>

              {cfg.fields.map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)',
                    display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    {f.label} *
                  </label>
                  <div style={{ position:'relative' }}>
                    <input className="v2-input"
                      type={f.type === 'password' && !showPass[f.key] ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={fields[f.key] || ''}
                      onChange={e => setFields(fv => ({ ...fv, [f.key]: e.target.value }))}
                      style={{ paddingRight: f.type === 'password' ? 36 : undefined }}/>
                    {f.type === 'password' && (
                      <button onClick={() => setShowPass(s => ({ ...s, [f.key]: !s[f.key] }))}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer', color:'var(--v2-text-3)', padding:0 }}>
                        {showPass[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {saveErr && (
                <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:8,
                  padding:'10px 12px', marginBottom:14, fontSize:12, color:'#dc2626',
                  display:'flex', gap:7, alignItems:'flex-start' }}>
                  <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{saveErr}
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button className="v2-btn" onClick={() => setModal('add_ca_pick')}>Back</button>
                <button className="v2-btn v2-btn-primary" style={{ flex:1, justifyContent:'center' }}
                  onClick={saveConnection} disabled={saving}>
                  {saving
                    ? <><RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/> Connecting…</>
                    : <><Link2 size={13}/> Connect & sync</>}
                </button>
              </div>

              <div style={{ marginTop:14, padding:'10px 12px', background:'var(--v2-surface-3)',
                borderRadius:8, fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6 }}>
                <Shield size={11} style={{ marginRight:5, verticalAlign:-1 }}/> 
                Your credentials are encrypted with AES-256-GCM and stored securely in SSLVault.
                They are never logged or transmitted to third parties.
              </div>
            </Modal>
          )
        })()}

        {/* ── Modal: manual import ─────────────────────────────────────────── */}
        {modal === 'manual_import' && (
          <Modal title="Import certificate" onClose={() => setModal(null)} width={540}>
            {!importResult ? (
              <>
                <p style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:18, lineHeight:1.6 }}>
                  Paste your certificate PEM below. SSLVault will parse the domain, issuer, expiry, and SANs automatically.
                </p>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)',
                    display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    Certificate PEM *
                  </label>
                  <textarea className="v2-input" rows={7}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFazCC...&#10;-----END CERTIFICATE-----"
                    value={pemText} onChange={e => setPemText(e.target.value)}
                    style={{ fontFamily:'monospace', fontSize:11, resize:'vertical' }}/>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:4 }}>
                    Paste the full certificate chain (cert + intermediates) for best results.
                  </div>
                </div>
                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)',
                    display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    Private key PEM (optional — stored in KeyLocker)
                  </label>
                  <textarea className="v2-input" rows={4}
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQ...&#10;-----END PRIVATE KEY-----"
                    value={keyText} onChange={e => setKeyText(e.target.value)}
                    style={{ fontFamily:'monospace', fontSize:11, resize:'vertical' }}/>
                </div>
                <button className="v2-btn v2-btn-primary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={doManualImport} disabled={importing || !pemText.trim()}>
                  {importing
                    ? <><RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/> Parsing…</>
                    : <><FileText size={13}/> Import certificate</>}
                </button>
              </>
            ) : importResult.ok ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'#f0fdf4',
                  border:'1.5px solid #bbf7d0', display:'flex', alignItems:'center',
                  justifyContent:'center', margin:'0 auto 16px' }}>
                  <Check size={22} style={{ color:'#16a34a' }}/>
                </div>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:10 }}>Certificate imported</div>
                <div style={{ background:'var(--v2-surface-3)', borderRadius:8, padding:'12px 16px',
                  marginBottom:18, textAlign:'left' }}>
                  {[
                    ['Domain',  importResult.parsed?.domain],
                    ['Issuer',  importResult.parsed?.issuer],
                    ['Expires', fmtDate(importResult.parsed?.validTill)],
                    ['Type',    importResult.parsed?.certType],
                    ['SANs',    importResult.parsed?.sans?.length > 0 ? importResult.parsed.sans.join(', ') : null],
                  ].filter(([,v])=>v).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between',
                      padding:'5px 0', borderBottom:'0.5px solid var(--v2-border)', fontSize:12 }}>
                      <span style={{ color:'var(--v2-text-3)' }}>{k}</span>
                      <span style={{ color:'var(--v2-text)', fontFamily:'monospace', textAlign:'right', maxWidth:260 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                  <button className="v2-btn" onClick={() => { setImportResult(null); setPemText(''); setKeyText('') }}>
                    Import another
                  </button>
                  <button className="v2-btn v2-btn-primary" onClick={() => setModal(null)}>Done</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:8,
                  padding:'12px 14px', marginBottom:16, fontSize:12, color:'#dc2626',
                  display:'flex', gap:7 }}>
                  <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{importResult.error}
                </div>
                <button className="v2-btn" onClick={() => setImportResult(null)}>Try again</button>
              </div>
            )}
          </Modal>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center',
      justifyContent:'center', padding:20, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'var(--v2-bg)', borderRadius:14, width:'100%', maxWidth:width,
        maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.18)',
        border:'0.5px solid var(--v2-border)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid var(--v2-border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, background:'var(--v2-bg)', zIndex:10, borderRadius:'14px 14px 0 0' }}>
          <div style={{ fontSize:15, fontWeight:500, color:'var(--v2-text)' }}>{title}</div>
          <button onClick={onClose}
            style={{ background:'none', border:'0.5px solid var(--v2-border)', borderRadius:6,
              cursor:'pointer', color:'var(--v2-text-3)', padding:'4px 6px', display:'flex' }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ padding:'18px 22px 22px' }}>{children}</div>
      </div>
    </div>
  )
}
