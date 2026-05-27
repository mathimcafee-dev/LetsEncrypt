// DigiCertIntelligence.jsx
// Full CertCentral intelligence workspace — 6 layers
// Route: /ca-intelligence/digicert
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, AlertTriangle, Shield, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, Download, Eye, EyeOff, FileText,
  TrendingUp, Zap, Search, Info, ExternalLink, Copy, Check, Lock,
  Globe, Building, RotateCcw, Archive, BarChart2
} from 'lucide-react'
import '../styles/design-v2.css'

const DC_BASE = 'https://www.digicert.com/services/v2'

function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDays(d) {
  if (d === null) return '—'
  if (d <= 0) return 'Expired'
  if (d === 1) return '1 day'
  return `${d} days`
}

// Colour coding for expiry
function expiryColor(d) {
  if (d === null) return 'rgba(240,237,232,0.38)'
  if (d <= 0)  return '#f87171'
  if (d <= 7)  return '#c0392b'
  if (d <= 30) return '#f0ede8'
  if (d <= 60) return '#e67e22'
  return '#4ade80'
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function ExpiryBadge({ iso }) {
  const d = dLeft(iso)
  const color = expiryColor(d)
  const bg = d !== null && d <= 0 ? 'rgba(192,57,43,0.12)' : d !== null && d <= 7 ? 'rgba(230,126,34,0.1)' : d !== null && d <= 30 ? 'rgba(239,68,68,0.08)' : 'transparent'
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>
      {fmtDays(d)}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    issued:   ['#4ade80', 'transparent'],
    expired:  ['#f87171', 'rgba(192,57,43,0.12)'],
    revoked:  ['rgba(240,237,232,0.7)', '#000000'],
    pending:  ['#f0ede8', 'rgba(239,68,68,0.08)'],
    approved: ['#f0ede8', 'transparent'],
  }
  const [color, bg] = map[status?.toLowerCase()] || ['rgba(240,237,232,0.38)', '#000000']
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44`, textTransform: 'capitalize' }}>
      {status || 'Unknown'}
    </span>
  )
}

function OrgBadge({ status }) {
  const map = {
    active:   ['#4ade80', 'transparent', 'Active'],
    pending:  ['#f0ede8', 'rgba(239,68,68,0.08)', 'Pending'],
    expired:  ['#f87171', 'rgba(192,57,43,0.12)', 'Expired'],
    rejected: ['#f87171', 'rgba(192,57,43,0.12)', 'Rejected'],
  }
  const [color, bg, label] = map[status?.toLowerCase()] || ['rgba(240,237,232,0.38)', '#000000', status || 'Unknown']
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44` }}>
      {label}
    </span>
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

// ── API call helper ──────────────────────────────────────────────────
async function dcApi(apiKey, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-DC-DEVKEY': apiKey },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(`${DC_BASE}${path}`, opts)
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err?.errors?.[0]?.message || err?.message || `HTTP ${r.status}`)
  }
  return r.json()
}

// ── Key entry panel ──────────────────────────────────────────────────
function ApiKeyPanel({ onConnect }) {
  const [key,   setKey]   = useState('')
  const [show,  setShow]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const connect = async () => {
    if (!key.trim()) return
    setBusy(true); setError('')
    try {
      // Validate key with a lightweight call
      await dcApi(key.trim(), '/account')
      // Persist encrypted in Supabase via ca-import edge fn
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'save_connection', ca_type: 'digicert', label: 'DigiCert CertCentral', api_key: key.trim() })
        })
      }
      onConnect(key.trim())
    } catch (e) {
      setError(e.message.includes('401') || e.message.includes('403')
        ? 'Invalid API key — check your CertCentral API key and try again.'
        : e.message)
    }
    setBusy(false)
  }

  return (
    <div className="v2-card v2-card-pad" style={{ maxWidth: 480, margin: '48px auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(192,57,43,0.12)',
          border: '1px solid #fecaca', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 800, fontSize:14, color: '#f87171' }}>DC</div>
        <div>
          <div style={{ fontWeight: 600, fontSize:15, color: 'var(--v2-text)' }}>Connect DigiCert CertCentral</div>
          <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 1 }}>Read-only API key — no write access required</div>
        </div>
      </div>
      <div className="v2-callout info" style={{ marginBottom: 16 }}>
        <Info size={12} style={{ flexShrink: 0 }}/>
        <span style={{ fontSize:12 }}>
          In CertCentral: <strong>Automation → API Keys → Add API Key</strong>. Set restriction to <strong>View Only</strong>
          so SSLVault gets read-only access to your portfolio.
        </span>
      </div>
      <label className="v2-label">CertCentral API Key</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input className="v2-input" type={show ? 'text' : 'password'} value={key}
          onChange={e => setKey(e.target.value)} placeholder="Your CertCentral API key"
          style={{ paddingRight: 38 }} onKeyDown={e => e.key === 'Enter' && connect()}/>
        <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--v2-text-3)', padding: 0 }}>
          {show ? <EyeOff size={13}/> : <Eye size={13}/>}
        </button>
      </div>
      {error && <div className="v2-callout error" style={{ marginBottom: 12, fontSize:12 }}>{error}</div>}
      <button className="v2-btn v2-btn-primary" onClick={connect} disabled={busy || !key.trim()}
        style={{ width: '100%', justifyContent: 'center', fontSize:13, padding: '11px' }}>
        {busy ? <><Spinner/> Connecting…</> : <><CheckCircle size={13}/> Connect & load portfolio</>}
      </button>
      <a href="https://dev.digicert.com/en/certcentral-apis/authentication.html"
        target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize:11,
          color: 'var(--v2-text-3)', textDecoration: 'none', justifyContent: 'center' }}>
        API key guide <ExternalLink size={10}/>
      </a>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 1 — Portfolio Overview + Expiry Risk Map
// ═══════════════════════════════════════════════════════════════════
function PortfolioLayer({ apiKey }) {
  const [orders, setOrders]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await dcApi(apiKey, '/order/certificate?limit=1000&status=issued,pending,expired,revoked')
      setOrders(data.orders || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [apiKey])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Loading portfolio…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!orders) return null

  // Bucket by expiry
  const buckets = {
    expired:  orders.filter(o => o.status === 'expired' || dLeft(o.certificate?.valid_till) <= 0),
    critical: orders.filter(o => { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 0 && d <= 7 }),
    warning:  orders.filter(o => { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 7 && d <= 30 }),
    upcoming: orders.filter(o => { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 30 && d <= 90 }),
    healthy:  orders.filter(o => { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 90 }),
  }

  const filtered = orders.filter(o => {
    const cn = o.certificate?.common_name || o.common_name || ''
    if (search && !cn.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'all') return true
    if (filter === 'expired')  return o.status === 'expired' || dLeft(o.certificate?.valid_till) <= 0
    if (filter === 'critical') { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 0 && d <= 7 }
    if (filter === 'warning')  { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 7 && d <= 30 }
    if (filter === 'upcoming') { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 30 && d <= 90 }
    if (filter === 'healthy')  { const d = dLeft(o.certificate?.valid_till); return d !== null && d > 90 }
    return true
  })

  const BANDS = [
    { key: 'expired',  label: 'Expired',      color: '#f87171', bg: 'rgba(192,57,43,0.12)' },
    { key: 'critical', label: '≤7 days',       color: '#c0392b', bg: 'rgba(230,126,34,0.1)' },
    { key: 'warning',  label: '8–30 days',     color: '#f5f0eb', bg: 'rgba(239,68,68,0.08)' },
    { key: 'upcoming', label: '31–90 days',    color: '#f5f0eb', bg: 'transparent' },
    { key: 'healthy',  label: '>90 days',      color: '#4ade80', bg: 'transparent' },
  ]

  return (
    <div>
      <SectionHeader icon={Activity} color="#c0392b" title="Portfolio & Expiry Risk Map"
        sub="All issued orders from CertCentral, bucketed by urgency. Click a band to filter."
        badge="Live"/>

      {/* Risk band cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 20 }}>
        {BANDS.map(b => (
          <div key={b.key} className="v2-card" style={{ padding: '12px 14px', cursor: 'pointer',
            borderTop: `3px solid ${buckets[b.key].length > 0 ? b.color : 'var(--v2-border)'}`,
            background: filter === b.key ? b.bg : 'var(--v2-bg)',
            transition: 'all .15s' }}
            onClick={() => setFilter(filter === b.key ? 'all' : b.key)}>
            <div style={{ fontSize:22, fontWeight: 700, color: buckets[b.key].length > 0 ? b.color : 'var(--v2-text-3)',
              letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4, fontFamily: 'var(--v2-mono)' }}>
              {buckets[b.key].length}
            </div>
            <div style={{ fontSize:10, color: 'var(--v2-text-3)', textTransform: 'uppercase',
              letterSpacing: '0.4px' }}>{b.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--v2-text-3)' }}/>
        <input className="v2-input" placeholder="Search domain…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32, fontSize:12 }}/>
      </div>

      {/* Orders table */}
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
            No orders match this filter
          </div>
        ) : filtered.slice(0, 200).map((o, i) => {
          const cn   = o.certificate?.common_name || o.common_name || '—'
          const exp  = o.certificate?.valid_till
          const d    = dLeft(exp)
          return (
            <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr',
              padding: '9px 14px', borderBottom: i < filtered.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
              alignItems: 'center', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div className="v2-mono" style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{cn}</div>
                <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 1 }}>Order #{o.id}</div>
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{o.product?.name_id || o.product?.type || '—'}</div>
              <div><StatusBadge status={o.status}/></div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{fmt(exp)}</div>
              <div><ExpiryBadge iso={exp}/></div>
            </div>
          )
        })}
        {filtered.length > 200 && (
          <div style={{ padding: '10px 14px', fontSize:11, color: 'var(--v2-text-3)',
            borderTop: '0.5px solid var(--v2-border)', textAlign: 'center' }}>
            Showing first 200 of {filtered.length} results — use search to narrow down
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2 — Org & Domain Validation Status
// ═══════════════════════════════════════════════════════════════════
function ValidationLayer({ apiKey }) {
  const [orgs,    setOrgs]    = useState(null)
  const [domains, setDomains] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [orgData, domData] = await Promise.all([
        dcApi(apiKey, '/organization?include_validation=true'),
        dcApi(apiKey, '/domain?include_validation=true'),
      ])
      setOrgs(orgData.organizations || [])
      setDomains(domData.domains || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [apiKey])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Loading validation data…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!orgs)   return null

  const orgsAtRisk    = orgs.filter(o => {
    const val = o.validations?.find(v => v.type === 'ov' || v.type === 'ev')
    return val && (val.status !== 'active' || (val.verified_until && dLeft(val.verified_until) < 60))
  })
  const domsExpiring  = domains.filter(d => d.dcv_expiration?.dcv && dLeft(d.dcv_expiration.dcv) < 60)

  return (
    <div>
      <SectionHeader icon={Building} color="#e07060" title="Org & Domain Validation Status"
        sub="OV/EV org validation and DCV domain validation expiry — both lapse every ~13 months and block reissue."
        badge="Proactive"/>

      {/* Alert banners */}
      {orgsAtRisk.length > 0 && (
        <div className="v2-callout warning" style={{ marginBottom: 14 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0 }}/>
          <span><strong>{orgsAtRisk.length} organisation{orgsAtRisk.length !== 1 ? 's' : ''}</strong> have OV/EV validation expiring within 60 days or already expired. Renew before your next OV/EV reissue.</span>
        </div>
      )}
      {domsExpiring.length > 0 && (
        <div className="v2-callout warning" style={{ marginBottom: 14 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0 }}/>
          <span><strong>{domsExpiring.length} domain validation{domsExpiring.length !== 1 ? 's' : ''}</strong> expiring within 60 days. Expired domain validation blocks certificate reissue on those domains.</span>
        </div>
      )}

      {/* Orgs */}
      <div className="v2-section-label" style={{ marginBottom: 8 }}>
        Organisations ({orgs.length})
      </div>
      <div className="v2-card" style={{ overflow: 'hidden', padding: 0, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '8px 14px', borderBottom: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-3)' }}>
          {['Organisation', 'ID', 'OV status', 'EV status'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 600, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {orgs.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:12 }}>No organisations found</div>
        ) : orgs.map((org, i) => {
          const ov = org.validations?.find(v => v.type === 'ov')
          const ev = org.validations?.find(v => v.type === 'ev')
          return (
            <div key={org.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '9px 14px', borderBottom: i < orgs.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
              alignItems: 'center' }}>
              <div>
                <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{org.name}</div>
                <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 1 }}>{org.country} · {org.city}</div>
              </div>
              <div className="v2-mono" style={{ fontSize:11, color: 'var(--v2-text-3)' }}>#{org.id}</div>
              <div>{ov ? <OrgBadge status={ov.status}/> : <span style={{ fontSize:10, color: 'var(--v2-text-3)' }}>—</span>}</div>
              <div>{ev ? <OrgBadge status={ev.status}/> : <span style={{ fontSize:10, color: 'var(--v2-text-3)' }}>—</span>}</div>
            </div>
          )
        })}
      </div>

      {/* Domains */}
      <div className="v2-section-label" style={{ marginBottom: 8 }}>
        Pre-validated domains ({domains.length})
      </div>
      <div className="v2-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          padding: '8px 14px', borderBottom: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-3)' }}>
          {['Domain', 'DCV method', 'Validation expires', 'Days left'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 600, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {domains.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:12 }}>No pre-validated domains found</div>
        ) : domains.map((dom, i) => {
          const dcvExp = dom.dcv_expiration?.dcv
          const d = dLeft(dcvExp)
          return (
            <div key={dom.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '9px 14px', borderBottom: i < domains.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
              alignItems: 'center' }}>
              <div className="v2-mono" style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{dom.name}</div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)', textTransform: 'uppercase', fontSize:10 }}>
                {dom.dcv_method || '—'}
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{fmt(dcvExp)}</div>
              <div><ExpiryBadge iso={dcvExp}/></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 3 — PQC & Crypto Agility Scanner
// ═══════════════════════════════════════════════════════════════════
function PQCLayer({ apiKey }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const scan = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await dcApi(apiKey, '/order/certificate?limit=1000&status=issued')
      const orders = data.orders || []

      // Pull cert chain for each order and parse key/hash info
      // We analyse the product type as a proxy for key algorithm
      // (Full chain parsing would require downloading each cert — expensive;
      //  we infer from product_name_id and request details)
      const summary = {
        rsa2048:  [],
        rsa4096:  [],
        ecdsaP256: [],
        ecdsaP384: [],
        sha1:      [],
        sha256:    [],
        sha384:    [],
        unknown:   [],
      }

      for (const o of orders) {
        const csr = o.csr || ''
        const sig = o.certificate?.signature_hash?.toLowerCase() || ''
        const key = o.certificate?.key_size

        // Hash classification
        if (sig.includes('sha1'))       summary.sha1.push(o)
        else if (sig.includes('sha384')) summary.sha384.push(o)
        else if (sig.includes('sha256')) summary.sha256.push(o)

        // Key classification
        if (key === 256 || sig.includes('ecdsa'))  {
          if (key === 384) summary.ecdsaP384.push(o)
          else summary.ecdsaP256.push(o)
        } else if (key === 2048)                   summary.rsa2048.push(o)
        else if (key === 4096)                     summary.rsa4096.push(o)
        else                                       summary.unknown.push(o)
      }

      // 47-day readiness: flag orders with no auto-renewal metadata
      const noAutoRenew = orders.filter(o => !o.disable_renewal && o.status === 'issued' &&
        dLeft(o.certificate?.valid_till) > 0 && dLeft(o.certificate?.valid_till) < 200)

      setResults({ summary, noAutoRenew, total: orders.length })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [apiKey])

  useEffect(() => { scan() }, [scan])

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/><span style={{ marginLeft: 8 }}>Scanning portfolio…</span></div>
  if (error)   return <div className="v2-callout error" style={{ margin: 16 }}><AlertCircle size={13}/>{error}</div>
  if (!results) return null

  const { summary, noAutoRenew, total } = results

  const riskScore = () => {
    let score = 100
    score -= (summary.rsa2048.length / total) * 30
    score -= (summary.sha1.length    / total) * 40
    score -= (noAutoRenew.length     / total) * 20
    return Math.max(0, Math.round(score))
  }

  const score = riskScore()
  const scoreColor = score >= 80 ? '#4ade80' : score >= 60 ? '#f0ede8' : '#f87171'

  return (
    <div>
      <SectionHeader icon={Zap} color="#e07060" title="PQC & Crypto Agility Scanner"
        sub="Key algorithm distribution, hash strength, and 47-day renewal readiness across your full DigiCert portfolio."
        badge="Crypto Intelligence"/>

      {/* Score card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 24 }}>
        <div className="v2-card v2-card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize:11, color: 'var(--v2-text-3)', textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: 10 }}>Crypto Agility Score</div>
          <div style={{ fontSize:Math.min(52,window.innerWidth>768?52:44), fontWeight: 900, color: scoreColor,
            letterSpacing: '-2px', lineHeight: 1, fontFamily: 'var(--v2-mono)' }}>{score}</div>
          <div style={{ fontSize:11, color: scoreColor, marginTop: 4, fontWeight: 600 }}>
            {score >= 80 ? 'Good posture' : score >= 60 ? 'Needs improvement' : 'High risk'}
          </div>
          <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginTop: 8, lineHeight: 1.5 }}>
            Based on key algorithm, hash strength, and 47-day readiness
          </div>
        </div>
        <div className="v2-card v2-card-pad">
          <div className="v2-section-label" style={{ marginBottom: 10 }}>Score breakdown</div>
          {[
            { label: 'RSA-2048 certs (weak by 2030)', count: summary.rsa2048.length, risk: 'high' },
            { label: 'SHA-1 signature hash (deprecated)', count: summary.sha1.length, risk: 'critical' },
            { label: 'Certs not 47-day ready', count: noAutoRenew.length, risk: 'medium' },
            { label: 'RSA-4096 certs (acceptable)', count: summary.rsa4096.length, risk: 'low' },
            { label: 'ECDSA P-256 certs (good)', count: summary.ecdsaP256.length, risk: 'good' },
            { label: 'ECDSA P-384 certs (best)', count: summary.ecdsaP384.length, risk: 'good' },
          ].map(({ label, count, risk }) => {
            const color = risk === 'critical' ? '#f87171' : risk === 'high' ? '#c0392b'
                        : risk === 'medium' ? '#f0ede8' : risk === 'low' ? '#f0ede8' : '#4ade80'
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 8, opacity: count === 0 ? 0.4 : 1 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize:12, color: 'var(--v2-text-2)' }}>{label}</span>
                <span className="v2-mono" style={{ fontSize:12, fontWeight: 700, color }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 47-day readiness */}
      <div className="v2-card v2-card-pad" style={{ background: noAutoRenew.length > 0 ? 'rgba(239,68,68,0.08)' : 'transparent',
        border: `0.5px solid ${noAutoRenew.length > 0 ? 'rgba(192,57,43,0.25)' : 'rgba(192,57,43,0.3)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Clock size={14} strokeWidth={2} style={{ color: noAutoRenew.length > 0 ? '#f0ede8' : '#4ade80' }}/>
          <span style={{ fontWeight: 600, fontSize:13, color: 'var(--v2-text)' }}>
            47-Day Certificate Readiness
          </span>
        </div>
        <p style={{ fontSize:12, color: 'var(--v2-text-2)', margin: '0 0 6px', lineHeight: 1.65 }}>
          CA/Browser Forum mandates certificates drop to 200-day validity from March 2026, and 47-day validity by 2029.
          Certificates expiring within 200 days with no automatic renewal in SSLVault will require manual action
          on an increasingly frequent cycle.
        </p>
        <div style={{ fontWeight: 600, fontSize:13, color: noAutoRenew.length > 0 ? '#f0ede8' : '#4ade80' }}>
          {noAutoRenew.length === 0
            ? '✓ All active certs are covered — 47-day ready'
            : `${noAutoRenew.length} certs within 200-day window without confirmed auto-renewal`}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 4 — Reissue History
// ═══════════════════════════════════════════════════════════════════
function ReissueLayer({ apiKey }) {
  const [orderId, setOrderId] = useState('')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetch_ = async () => {
    if (!orderId.trim()) return
    setLoading(true); setError(''); setHistory(null)
    try {
      const data = await dcApi(apiKey, `/order/certificate/${orderId.trim()}/reissue`)
      setHistory(data.reissues || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div>
      <SectionHeader icon={RotateCcw} color="#c0392b" title="Reissue History"
        sub="Full reissue audit trail per order — see every reissue reason, CSR change, and certificate ID."
        badge="Audit"/>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="v2-input" placeholder="CertCentral order ID" value={orderId}
          onChange={e => setOrderId(e.target.value)} style={{ maxWidth: 260, fontSize:12 }}
          onKeyDown={e => e.key === 'Enter' && fetch_()}/>
        <button className="v2-btn v2-btn-primary" onClick={fetch_} disabled={loading || !orderId.trim()}>
          {loading ? <Spinner/> : <Search size={13}/>} Fetch history
        </button>
      </div>
      {error && <div className="v2-callout error" style={{ marginBottom: 12, fontSize:12 }}>{error}</div>}
      {history !== null && (
        history.length === 0 ? (
          <div className="v2-callout info" style={{ fontSize:12 }}>No reissues found for order #{orderId}</div>
        ) : (
          <div className="v2-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(180px,100%),1fr))',
              padding: '8px 14px', borderBottom: '0.5px solid var(--v2-border)',
              background: 'var(--v2-surface-3)' }}>
              {['Certificate ID', 'Common name', 'Reissued', 'Expires'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight: 600, color: 'var(--v2-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>
            {history.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(180px,100%),1fr))',
                padding: '9px 14px', borderBottom: i < history.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
                alignItems: 'center' }}>
                <div className="v2-mono" style={{ fontSize:11, color: 'var(--v2-text-2)' }}>#{r.id}</div>
                <div className="v2-mono" style={{ fontSize:12, color: 'var(--v2-text)' }}>{r.common_name || '—'}</div>
                <div style={{ fontSize:11, color: 'var(--v2-text-2)' }}>{fmt(r.date_created)}</div>
                <div><ExpiryBadge iso={r.valid_till}/></div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 5 — Revoke & Replace workflow
// ═══════════════════════════════════════════════════════════════════
function RevokeLayer({ apiKey }) {
  const [certId,  setCertId]  = useState('')
  const [reason,  setReason]  = useState('key_compromise')
  const [preview, setPreview] = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const REASONS = [
    { value: 'key_compromise',         label: 'Key compromise — private key exposed' },
    { value: 'ca_compromise',          label: 'CA compromise' },
    { value: 'affiliation_changed',    label: 'Affiliation changed — org or domain changed' },
    { value: 'superseded',             label: 'Superseded — replaced by a new certificate' },
    { value: 'cessation_of_operation', label: 'Cessation of operation — service decommissioned' },
    { value: 'privilege_withdrawn',    label: 'Privilege withdrawn' },
  ]

  const execute = async () => {
    setBusy(true); setError(''); setResult(null)
    try {
      await dcApi(apiKey, `/certificate/${certId.trim()}/revoke`, 'PUT',
        { comments: `Revoked via SSLVault CA Intelligence — reason: ${reason}`, skip_approval: false })
      setResult({ ok: true, certId: certId.trim(), reason })
    } catch (e) { setError(e.message) }
    setBusy(false)
    setPreview(false)
  }

  return (
    <div>
      <SectionHeader icon={Shield} color="#c0392b" title="Revoke & Replace Workflow"
        sub="Guided revocation with reason codes. An admin approval request is submitted to DigiCert — not executed instantly."
        badge="Controlled"/>

      <div className="v2-callout warning" style={{ marginBottom: 20 }}>
        <AlertTriangle size={13} style={{ flexShrink: 0 }}/>
        <span style={{ fontSize:12 }}>
          This submits a <strong>revocation request</strong> to DigiCert. An administrator must approve it in CertCentral
          before the certificate is actually revoked. Revocation is permanent — reissue the order after if needed.
        </span>
      </div>

      {result?.ok ? (
        <div className="v2-callout tip" style={{ marginBottom: 16 }}>
          <CheckCircle size={13} style={{ flexShrink: 0 }}/>
          <div style={{ fontSize:12 }}>
            Revocation request submitted for certificate <strong>#{result.certId}</strong>.
            An administrator must approve it in CertCentral. Reason: <strong>{result.reason}</strong>.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="v2-label">Certificate ID</label>
              <input className="v2-input" placeholder="DigiCert certificate ID" value={certId}
                onChange={e => setCertId(e.target.value)} style={{ fontSize:12 }}/>
            </div>
            <div>
              <label className="v2-label">Revocation reason</label>
              <select className="v2-input" value={reason} onChange={e => setReason(e.target.value)}
                style={{ fontSize:12 }}>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* API call preview */}
          {preview && (
            <div className="v2-card v2-card-pad" style={{ marginBottom: 14, background: 'var(--v2-surface-2)' }}>
              <div className="v2-section-label" style={{ marginBottom: 8 }}>API call preview</div>
              <div className="v2-code" style={{ margin: 0 }}>
                <div className="v2-code-head">
                  <div className="v2-code-dots">
                    <span style={{ background: '#f87171' }}/><span style={{ background: '#f0ede8' }}/><span style={{ background: '#f0ede8' }}/>
                  </div>
                </div>
                <pre>{`PUT https://www.digicert.com/services/v2/certificate/${certId || '{cert_id}'}/revoke
X-DC-DEVKEY: ••••••••••••••••

{
  "comments": "Revoked via SSLVault CA Intelligence",
  "skip_approval": false
}
// ↑ skip_approval:false means admin approval required in CertCentral`}</pre>
              </div>
            </div>
          )}

          {error && <div className="v2-callout error" style={{ marginBottom: 12, fontSize:12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="v2-btn" onClick={() => setPreview(p => !p)} style={{ fontSize:12 }}>
              {preview ? 'Hide' : 'Show'} API preview
            </button>
            <button className="v2-btn" onClick={() => { setCertId(''); setPreview(false); setError('') }}
              style={{ fontSize:12 }}>Clear</button>
            <button className="v2-btn" style={{ background: 'rgba(192,57,43,0.12)', color: '#f87171',
              border: '0.5px solid #fecaca', fontSize:12 }}
              onClick={execute} disabled={busy || !certId.trim()}>
              {busy ? <Spinner/> : <Shield size={12}/>} Submit revocation request
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 6 — CT Log History
// ═══════════════════════════════════════════════════════════════════
function CTLogLayer({ apiKey }) {
  const [orderId,  setOrderId]  = useState('')
  const [ctStatus, setCtStatus] = useState(null)
  const [ctLogs,   setCtLogs]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Load account-level CT status on mount
  useEffect(() => {
    dcApi(apiKey, '/ct-log-monitoring').then(d => setCtStatus(d)).catch(() => {})
  }, [apiKey])

  const fetchLogs = async () => {
    if (!orderId.trim()) return
    setLoading(true); setError(''); setCtLogs(null)
    try {
      const data = await dcApi(apiKey, `/order/certificate/${orderId.trim()}/ct-log`)
      setCtLogs(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div>
      <SectionHeader icon={Globe} color="#c0392b" title="CT Log History"
        sub="Certificate Transparency log submission records per order — see which logs each cert was submitted to and SCT timestamps."
        badge="Transparency"/>

      {/* Account CT status */}
      {ctStatus && (
        <div className="v2-card v2-card-pad" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: ctStatus.ct_log_monitoring ? '#4ade80' : 'rgba(240,237,232,0.38)' }}/>
          <div>
            <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>
              Account CT log monitoring: <span style={{ color: ctStatus.ct_log_monitoring ? '#4ade80' : 'rgba(240,237,232,0.38)' }}>
                {ctStatus.ct_log_monitoring ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginTop: 2 }}>
              When enabled, DigiCert alerts you when unexpected certificates are logged for your domains
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="v2-input" placeholder="CertCentral order ID" value={orderId}
          onChange={e => setOrderId(e.target.value)} style={{ maxWidth: 260, fontSize:12 }}
          onKeyDown={e => e.key === 'Enter' && fetchLogs()}/>
        <button className="v2-btn v2-btn-primary" onClick={fetchLogs} disabled={loading || !orderId.trim()}>
          {loading ? <Spinner/> : <Search size={13}/>} Fetch CT logs
        </button>
      </div>

      {error && <div className="v2-callout error" style={{ marginBottom: 12, fontSize:12 }}>{error}</div>}
      {ctLogs && (
        <div className="v2-card v2-card-pad">
          <pre className="v2-mono" style={{ fontSize:11, color: 'var(--v2-text-2)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
            {JSON.stringify(ctLogs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'portfolio',   label: 'Portfolio & Expiry Map', icon: Activity },
  { id: 'validation',  label: 'Org & Domain Validation', icon: Building },
  { id: 'pqc',         label: 'PQC / Crypto Agility',   icon: Zap },
  { id: 'reissue',     label: 'Reissue History',         icon: RotateCcw },
  { id: 'revoke',      label: 'Revoke & Replace',        icon: Shield },
  { id: 'ctlog',       label: 'CT Log History',          icon: Globe },
]

export default function DigiCertIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [apiKey, setApiKey] = useState('')
  const [tab,    setTab]    = useState('portfolio')
  const [loaded, setLoaded] = useState(false)

  // Try to load saved key from CA connections
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const r = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'list_connections' })
      }).then(r => r.json())

      const dc = (r.connections || []).find(c => c.ca_type === 'digicert')
      if (dc?.api_key) { setApiKey(dc.api_key); setLoaded(true) }
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
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(192,57,43,0.12)',
              border: '1px solid #fecaca', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: 9, color: '#f87171' }}>DC</div>
            <span style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>DigiCert Intelligence</span>
          </div>
          {apiKey && (
            <span style={{ marginLeft: 'auto', fontSize:10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, background: 'transparent', color: '#4ade80', border: '0.5px solid rgba(192,57,43,0.3)',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
              Connected
            </span>
          )}
        </div>

        {!apiKey ? (
          <ApiKeyPanel onConnect={k => { setApiKey(k); setLoaded(true) }}/>
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
                    borderBottom: tab === t.id ? '2px solid var(--v2-green)' : '2px solid transparent',
                    marginBottom: -1 }}>
                  <t.icon size={12} strokeWidth={2}/>
                  {t.label}
                </button>
              ))}
              <button onClick={() => { setApiKey(''); setLoaded(false) }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize:11, color: 'var(--v2-text-3)', padding: '9px 8px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={11}/> Disconnect
              </button>
            </div>

            {/* Tab content */}
            <div style={{ minHeight: 400 }}>
              {tab === 'portfolio'  && <PortfolioLayer  apiKey={apiKey}/>}
              {tab === 'validation' && <ValidationLayer apiKey={apiKey}/>}
              {tab === 'pqc'        && <PQCLayer        apiKey={apiKey}/>}
              {tab === 'reissue'    && <ReissueLayer    apiKey={apiKey}/>}
              {tab === 'revoke'     && <RevokeLayer     apiKey={apiKey}/>}
              {tab === 'ctlog'      && <CTLogLayer      apiKey={apiKey}/>}
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
