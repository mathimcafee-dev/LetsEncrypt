// SectigoIntelligence.jsx
// Sectigo SCM Intelligence workspace
// Route: /ca-intelligence/sectigo
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, AlertTriangle, Shield, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, Eye, EyeOff, Search, Info,
  ExternalLink, Globe, Building, RotateCcw, BarChart2, Zap, Lock
} from 'lucide-react'
import '../styles/design-v2.css'

const SCM_BASE = 'https://cert-manager.com/api/ssl/v1'

function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function ExpiryBadge({ iso }) {
  const d = dLeft(iso)
  const color = d === null ? 'rgba(240,237,232,0.38)' : d <= 0 ? '#f87171' : d <= 7 ? '#c0392b' : d <= 30 ? '#f0ede8' : d <= 60 ? '#e67e22' : '#4ade80'
  const bg    = d === null ? '#000000' : d <= 0 ? 'rgba(192,57,43,0.12)' : d <= 7 ? 'rgba(230,126,34,0.1)' : d <= 30 ? 'rgba(239,68,68,0.08)' : 'transparent'
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>
      {d === null ? '—' : d <= 0 ? 'Expired' : `${d}d`}
    </span>
  )
}

function StatusBadge({ status }) {
  const n = String(status || '').toLowerCase()
  const [color, bg, label] =
    n.includes('issued') || n === '2'  ? ['#4ade80', 'transparent', 'Issued']  :
    n.includes('revoked') || n === '3' ? ['rgba(240,237,232,0.7)', '#000000', 'Revoked'] :
    n.includes('expired') || n === '4' ? ['#f87171', 'rgba(192,57,43,0.12)', 'Expired'] :
    n.includes('pending') || n === '1' ? ['#f0ede8', 'rgba(239,68,68,0.08)', 'Pending'] :
    ['rgba(240,237,232,0.38)', '#000000', status || 'Unknown']
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44` }}>{label}</span>
  )
}

function Spinner() {
  return <RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin .7s linear infinite' }}/>
}

function SectionHeader({ icon: Icon, color, title, sub, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} strokeWidth={2} color={color}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize:16, fontWeight: 700, color: 'var(--v2-text)',
            letterSpacing: '-0.2px', margin: 0 }}>{title}</h2>
          {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: color + '18', color, border: `0.5px solid ${color}44`,
            textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge}</span>}
        </div>
        {sub && <p style={{ fontSize:12, color: 'var(--v2-text-3)', margin: '3px 0 0', lineHeight: 1.5 }}>{sub}</p>}
      </div>
    </div>
  )
}

// Sectigo SCM API call (proxied through SSLVault edge fn to avoid CORS)
async function scmApi(creds, path, method = 'GET', body = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const tok = session?.access_token
  const r = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ action: 'sectigo_proxy', path, method, body, creds })
  })
  const data = await r.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

// ── Credential entry panel ──────────────────────────────────────────
function CredPanel({ onConnect }) {
  const [uri,   setUri]   = useState('')
  const [login, setLogin] = useState('')
  const [pass,  setPass]  = useState('')
  const [show,  setShow]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const connect = async () => {
    if (!uri.trim() || !login.trim() || !pass.trim()) {
      setError('All fields required'); return
    }
    setBusy(true); setError('')
    const creds = { customer_uri: uri.trim(), login: login.trim(), password: pass.trim() }
    try {
      await scmApi(creds, '/ssl?size=1&position=0')
      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'save_connection', ca_type: 'sectigo', label: 'Sectigo SCM', ...creds })
        })
      }
      onConnect(creds)
    } catch (e) {
      setError(e.message.includes('401') || e.message.includes('403')
        ? 'Invalid credentials — check your Customer URI, login and password.'
        : e.message)
    }
    setBusy(false)
  }

  return (
    <div className="v2-card v2-card-pad" style={{ maxWidth: 480, margin: '48px auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.08)',
          border: '1px solid #F2C4BC', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 800, fontSize:14, color: '#f5f0eb' }}>SC</div>
        <div>
          <div style={{ fontWeight: 600, fontSize:15, color: 'var(--v2-text)' }}>Connect Sectigo SCM</div>
          <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 1 }}>SCM REST API credentials</div>
        </div>
      </div>
      <div className="v2-callout info" style={{ marginBottom: 16 }}>
        <Info size={12} style={{ flexShrink: 0 }}/>
        <span style={{ fontSize:12 }}>
          Your <strong>Customer URI</strong> is the short identifier for your Sectigo account
          (e.g. <span className="v2-kbd">yourcompany</span>). Find it in your SCM welcome email.
        </span>
      </div>
      <label className="v2-label">Customer URI</label>
      <input className="v2-input" value={uri} onChange={e => setUri(e.target.value)}
        placeholder="yourcompany" style={{ marginBottom: 12 }}/>
      <label className="v2-label">Login (email)</label>
      <input className="v2-input" value={login} onChange={e => setLogin(e.target.value)}
        placeholder="admin@yourcompany.com" style={{ marginBottom: 12 }}/>
      <label className="v2-label">Password</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input className="v2-input" type={show ? 'text' : 'password'} value={pass}
          onChange={e => setPass(e.target.value)} placeholder="••••••••"
          style={{ paddingRight: 38 }} onKeyDown={e => e.key === 'Enter' && connect()}/>
        <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--v2-text-3)', padding: 0 }}>
          {show ? <EyeOff size={13}/> : <Eye size={13}/>}
        </button>
      </div>
      {error && <div className="v2-callout error" style={{ marginBottom: 12, fontSize:12 }}>{error}</div>}
      <button className="v2-btn v2-btn-primary" onClick={connect} disabled={busy}
        style={{ width: '100%', justifyContent: 'center', fontSize:13, padding: '11px' }}>
        {busy ? <><Spinner/> Connecting…</> : <><CheckCircle size={13}/> Connect & load portfolio</>}
      </button>
      <a href="https://sectigo.com/knowledge-base/detail/Sectigo-Certificate-Manager-API/kA01N000000bvOx"
        target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize:11,
          color: 'var(--v2-text-3)', textDecoration: 'none', justifyContent: 'center' }}>
        SCM API docs <ExternalLink size={10}/>
      </a>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 1 — Certificate Inventory
// ═══════════════════════════════════════════════════════════════════
function InventoryLayer({ creds }) {
  const [certs,   setCerts]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await scmApi(creds, '/ssl?size=200&position=0')
      setCerts(Array.isArray(data) ? data : data?.sslList || data?.list || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [creds])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Loading inventory…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!certs)  return null

  const BANDS = [
    { key: 'expired',  label: 'Expired',   filter: c => dLeft(c.expires || c.notAfter) <= 0 },
    { key: 'critical', label: '≤7 days',   filter: c => { const d = dLeft(c.expires || c.notAfter); return d > 0 && d <= 7 } },
    { key: 'warning',  label: '8–30 days', filter: c => { const d = dLeft(c.expires || c.notAfter); return d > 7 && d <= 30 } },
    { key: 'upcoming', label: '31–90 days',filter: c => { const d = dLeft(c.expires || c.notAfter); return d > 30 && d <= 90 } },
    { key: 'healthy',  label: '>90 days',  filter: c => dLeft(c.expires || c.notAfter) > 90 },
  ]
  const COLORS = { expired: '#f87171', critical: '#c0392b', warning: '#f0ede8', upcoming: '#f0ede8', healthy: '#4ade80' }
  const BANDS_BG = { expired: 'rgba(192,57,43,0.12)', critical: 'rgba(230,126,34,0.1)', warning: 'rgba(239,68,68,0.08)', upcoming: 'transparent', healthy: 'transparent' }

  const filtered = certs.filter(c => {
    const cn = c.commonName || c.cn || c.subject || ''
    if (search && !cn.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all') {
      const band = BANDS.find(b => b.key === filter)
      return band ? band.filter(c) : true
    }
    return true
  })

  return (
    <div>
      <SectionHeader icon={Activity} color="#e07060" title="Certificate Inventory"
        sub="All SSL/TLS certificates from your Sectigo SCM account, bucketed by expiry urgency."
        badge="Live"/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 20 }}>
        {BANDS.map(b => {
          const count = certs.filter(b.filter).length
          return (
            <div key={b.key} className="v2-card" style={{ padding: '12px 14px', cursor: 'pointer',
              borderTop: `3px solid ${count > 0 ? COLORS[b.key] : 'var(--v2-border)'}`,
              background: filter === b.key ? BANDS_BG[b.key] : 'var(--v2-bg)', transition: 'all .15s' }}
              onClick={() => setFilter(filter === b.key ? 'all' : b.key)}>
              <div style={{ fontSize:22, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1,
                marginBottom: 4, fontFamily: 'var(--v2-mono)',
                color: count > 0 ? COLORS[b.key] : 'var(--v2-text-3)' }}>{count}</div>
              <div style={{ fontSize:10, color: 'var(--v2-text-3)', textTransform: 'uppercase',
                letterSpacing: '0.4px' }}>{b.label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--v2-text-3)' }}/>
        <input className="v2-input" placeholder="Search domain…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, fontSize:12 }}/>
      </div>

      <div className="v2-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr',
          padding: '8px 14px', borderBottom: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-3)' }}>
          {['Domain', 'Type', 'Status', 'Expires', 'Days left'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 600, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:13 }}>
            No certificates match this filter
          </div>
        ) : filtered.slice(0, 200).map((c, i) => {
          const cn  = c.commonName || c.cn || c.subject || '—'
          const exp = c.expires || c.notAfter
          const typ = c.certType || c.type || c.product || '—'
          return (
            <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr',
              padding: '9px 14px', borderBottom: i < filtered.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
              alignItems: 'center', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div className="v2-mono" style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{cn}</div>
                {c.id && <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 1 }}>ID: {c.id}</div>}
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{typ}</div>
              <div><StatusBadge status={c.status || c.state}/></div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{fmt(exp)}</div>
              <div><ExpiryBadge iso={exp}/></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2 — Organisation Profiles
// ═══════════════════════════════════════════════════════════════════
function OrgsLayer({ creds }) {
  const [orgs,    setOrgs]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await scmApi(creds, '/organization')
      setOrgs(Array.isArray(data) ? data : data?.organizations || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [creds])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Loading organisations…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!orgs)   return null

  return (
    <div>
      <SectionHeader icon={Building} color="#e07060" title="Organisation Profiles"
        sub="All organisations registered in Sectigo SCM. OV/EV validation status and certificate counts."
        badge="Reference"/>

      <div className="v2-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '8px 14px', borderBottom: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-3)' }}>
          {['Organisation', 'City / Country', 'Status', 'Cert types'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 600, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {orgs.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:12 }}>No organisations found</div>
        ) : orgs.map((org, i) => (
          <div key={org.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '9px 14px', borderBottom: i < orgs.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
            alignItems: 'center' }}>
            <div>
              <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{org.name || org.commonName || '—'}</div>
              {org.id && <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 1 }}>ID: {org.id}</div>}
            </div>
            <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{[org.city, org.country].filter(Boolean).join(', ') || '—'}</div>
            <div>
              <StatusBadge status={org.status || org.validationStatus || 'active'}/>
            </div>
            <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{org.certTypes || org.certType || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 3 — Certificate Type Breakdown (Analytics)
// ═══════════════════════════════════════════════════════════════════
function AnalyticsLayer({ creds }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const certs = await scmApi(creds, '/ssl?size=500&position=0')
      const list = Array.isArray(certs) ? certs : certs?.sslList || []
      // Aggregate by cert type
      const byType = {}
      const byStatus = {}
      for (const c of list) {
        const t = c.certType || c.type || c.product || 'Unknown'
        const s = c.status || c.state || 'Unknown'
        byType[t] = (byType[t] || 0) + 1
        byStatus[s] = (byStatus[s] || 0) + 1
      }
      setData({ byType, byStatus, total: list.length })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [creds])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Analysing…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!data)   return null

  return (
    <div>
      <SectionHeader icon={BarChart2} color="#e07060" title="Certificate Type Breakdown"
        sub="Distribution of certificate types and statuses across your Sectigo portfolio."
        badge="Analytics"/>

      <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 16 }}>
        <div className="v2-card v2-card-pad">
          <div className="v2-section-label" style={{ marginBottom: 12 }}>By certificate type</div>
          {Object.entries(data.byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, fontSize:12, color: 'var(--v2-text-2)' }}>{type}</div>
              <div style={{ width: 120, height: 6, background: 'var(--v2-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((count / data.total) * 100)}%`, height: '100%',
                  background: '#f0ede8', borderRadius: 3 }}/>
              </div>
              <div className="v2-mono" style={{ fontSize:12, fontWeight: 700, color: 'var(--v2-text)', minWidth: 28, textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
        <div className="v2-card v2-card-pad">
          <div className="v2-section-label" style={{ marginBottom: 12 }}>By status</div>
          {Object.entries(data.byStatus).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, fontSize:12, color: 'var(--v2-text-2)', textTransform: 'capitalize' }}>{status}</div>
              <div style={{ width: 120, height: 6, background: 'var(--v2-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((count / data.total) * 100)}%`, height: '100%',
                  background: '#4ade80', borderRadius: 3 }}/>
              </div>
              <div className="v2-mono" style={{ fontSize:12, fontWeight: 700, color: 'var(--v2-text)', minWidth: 28, textAlign: 'right' }}>{count}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--v2-border)',
            fontSize:12, color: 'var(--v2-text-3)' }}>
            Total: <strong style={{ color: 'var(--v2-text)' }}>{data.total}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'inventory',  label: 'Certificate Inventory', icon: Activity },
  { id: 'orgs',       label: 'Organisation Profiles', icon: Building },
  { id: 'analytics',  label: 'Type Breakdown',        icon: BarChart2 },
]

export default function SectigoIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [creds,  setCreds]  = useState(null)
  const [tab,    setTab]    = useState('inventory')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const r = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'list_connections' })
      }).then(r => r.json())
      const sc = (r.connections || []).find(c => c.ca_type === 'sectigo')
      if (sc?.customer_uri && sc?.login && sc?.password) {
        setCreds({ customer_uri: sc.customer_uri, login: sc.login, password: sc.password })
      }
    })
  }, [])

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 1020 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingTop: 8 }}>
          <button onClick={() => nav('/ca-intelligence')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)',
              padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize:12, fontFamily: 'inherit' }}>
            <ChevronLeft size={13}/> CA Intelligence
          </button>
          <span style={{ color: 'var(--v2-border)', fontSize:12 }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(239,68,68,0.08)',
              border: '1px solid #F2C4BC', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: 9, color: '#f5f0eb' }}>SC</div>
            <span style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>Sectigo Intelligence</span>
          </div>
          {creds && (
            <span style={{ marginLeft: 'auto', fontSize:10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, background: 'transparent', color: '#4ade80', border: '0.5px solid rgba(192,57,43,0.3)',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
              Connected
            </span>
          )}
        </div>

        {!creds ? (
          <CredPanel onConnect={c => setCreds(c)}/>
        ) : (
          <>
            {/* Tab nav */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 24,
              borderBottom: '0.5px solid var(--v2-border)', paddingBottom: 0 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', fontSize:12, fontWeight: 500, fontFamily: 'inherit',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                    color: tab === t.id ? 'var(--v2-text)' : 'var(--v2-text-3)',
                    borderBottom: tab === t.id ? '2px solid #f07059' : '2px solid transparent',
                    marginBottom: -1 }}>
                  <t.icon size={12} strokeWidth={2}/>
                  {t.label}
                </button>
              ))}
              <button onClick={() => setCreds(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize:11, color: 'var(--v2-text-3)', padding: '9px 8px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={11}/> Disconnect
              </button>
            </div>

            <div style={{ minHeight: 400 }}>
              {tab === 'inventory'  && <InventoryLayer creds={creds}/>}
              {tab === 'orgs'       && <OrgsLayer      creds={creds}/>}
              {tab === 'analytics'  && <AnalyticsLayer creds={creds}/>}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @media(max-width:min(767px,100%)){
          [class*="-hero"],[class*="-band"]{padding:20px 14px 18px!important}
          [class*="-body"]{padding:14px!important;max-width:100%!important}
          [class*="-tabs"]{padding:0 10px!important}
          [class*="-tab"]{margin-right:12px!important;font-size:12px!important;padding:10px 2px 11px!important}
          [class*="-h1"]{font-size:20px!important}
          [class*="-sub"]{font-size:12px!important}
          [class*="-stats"]{gap:18px!important}
          .out-card{padding:12px!important}
        }`}</style>
    </div>
  )
}
