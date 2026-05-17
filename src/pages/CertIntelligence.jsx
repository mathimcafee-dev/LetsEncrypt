// CertIntelligence.jsx — CA Intelligence Suite
// Week 1: Cross-CA Expiry Timeline
// Week 2: Shadow IT Scanner
// Week 3: CA Consolidation Advisor
// Route: /cert-intelligence
// Edge fn: ca-intelligence v1

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, AlertTriangle, Shield, TrendingDown, RefreshCw,
  ChevronRight, Check, X, ExternalLink, Zap, Search,
  DollarSign, Copy, AlertCircle, Clock, Eye, EyeOff
} from 'lucide-react'

const FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence'

async function call(tok, body) {
  const r = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body)
  })
  return r.json()
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

const URGENCY = {
  expired:  { label: 'Expired',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  critical: { label: 'Critical',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#f97316' },
  warning:  { label: 'Warning',    color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  upcoming: { label: 'Upcoming',   color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  healthy:  { label: 'Healthy',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  unknown:  { label: 'Unknown',    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

const CA_COLORS = {
  digicert: '#dc2626', sectigo: '#7c3aed', sslcom: '#0369a1',
  gogetssl: '#16a34a', imported: '#64748b', unknown: '#94a3b8'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function Tag({ text, color = '#64748b', bg = '#f8fafc' }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
    background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>{text}</span>
}

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '0.5px solid #e2e8f0', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...style }}>{children}</div>
}

function SectionBanner({ icon: Icon, color, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color}/>
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 0 42px', lineHeight: 1.5 }}>{sub}</p>
    </div>
  )
}

function UrgencyDot({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.unknown
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: u.dot, flexShrink: 0,
    boxShadow: urgency === 'healthy' ? '0 0 0 2px rgba(22,163,74,0.2)' : 'none' }}/>
}

function Spinner() {
  return <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/>
}

// ══ TAB 1 — EXPIRY TIMELINE ══════════════════════════════════════════
function ExpiryTimeline({ tok }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [connId, setConnId]   = useState(null)
  const [conns, setConns]     = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await call(tok, { action: 'expiry_timeline' })
    if (r.ok) setData(r)
    setLoading(false)
  }, [tok])

  useEffect(() => {
    if (!tok) return
    load()
    // Load connections for sync picker
    supabase.from('ca_connections').select('id,ca_name,ca_type,label').then(({ data }) => setConns(data || []))
  }, [tok, load])

  const doSync = async () => {
    setSyncing(true)
    await call(tok, { action: 'daily_sync', connection_id: connId || undefined })
    setSyncing(false)
    await load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><Spinner/> Loading timeline…</div>
  if (!data) return null

  const certs = (data.certs || []).filter(c => {
    if (filter !== 'all' && c.urgency !== filter) return false
    if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { counts, total, no_renewal_path_count, last_sync } = data

  return (
    <div>
      <SectionBanner icon={Activity} color="#0e7fc0"
        title="Cross-CA Expiry Timeline"
        sub="Every certificate across all connected CAs, unified by urgency. Certs with no renewal path are flagged for manual action."/>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 20 }}>
        {Object.entries(URGENCY).map(([key, u]) => (
          <Card key={key} style={{ padding: '12px 14px', cursor: 'pointer',
            borderTop: `3px solid ${counts[key] > 0 ? u.dot : '#f1f5f9'}`,
            background: filter === key ? u.bg : 'white',
            transition: 'all .15s' }}
            onClick={() => setFilter(filter === key ? 'all' : key)}>
            <div style={{ fontSize: 22, fontWeight: 800, color: counts[key] > 0 ? u.color : '#94a3b8',
              letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>{counts[key] || 0}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{u.label}</div>
          </Card>
        ))}
      </div>

      {/* Alert banners */}
      {(counts.expired > 0 || counts.critical > 0) && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            {counts.expired > 0 && `${counts.expired} expired`}
            {counts.expired > 0 && counts.critical > 0 && ' · '}
            {counts.critical > 0 && `${counts.critical} expiring within 7 days`}
            {' — immediate action required'}
          </span>
        </div>
      )}

      {no_renewal_path_count > 0 && (
        <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }}/>
          <span style={{ fontSize: 12, color: '#92400e' }}>
            <strong>{no_renewal_path_count} certificate{no_renewal_path_count !== 1 ? 's' : ''}</strong> have no renewal path —
            no agent, no DNS connector, and not a GoGetSSL cert. These require manual renewal.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search domains…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px',
              borderRadius: 8, border: '0.5px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit',
              outline: 'none', color: '#111' }}
            onFocus={e => e.target.style.borderColor = '#0e7fc0'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}/>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
        </div>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
              padding: '6px 10px', borderRadius: 7, border: '0.5px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontFamily: 'inherit', color: '#64748b' }}>
            <X size={11}/> Clear filter
          </button>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          {conns.length > 0 && (
            <select value={connId || ''} onChange={e => setConnId(e.target.value || null)}
              style={{ fontSize: 11, padding: '6px 8px', borderRadius: 7, border: '0.5px solid #e2e8f0',
                fontFamily: 'inherit', color: '#374151', cursor: 'pointer', outline: 'none' }}>
              <option value="">All connections</option>
              {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
            </select>
          )}
          <button onClick={doSync} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '6px 12px', borderRadius: 7, border: 'none', background: syncing ? '#94a3b8' : '#0e7fc0',
              color: 'white', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {syncing ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync now</>}
          </button>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '6px 12px', borderRadius: 7, border: '0.5px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>
      </div>
      {last_sync && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Last synced: {fmt(last_sync)}</div>}

      {/* Cert table */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          padding: '9px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#fafbfc' }}>
          {['Domain', 'CA source', 'Expires', 'Days left', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        {certs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            {search || filter !== 'all' ? 'No certificates match this filter.' : 'No certificates tracked. Connect a CA or sync.'}
          </div>
        ) : certs.map((cert, i) => {
          const u = URGENCY[cert.urgency] || URGENCY.unknown
          const caColor = CA_COLORS[cert.ca_type] || '#94a3b8'
          return (
            <div key={cert.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '10px 16px', alignItems: 'center',
              borderBottom: i < certs.length - 1 ? '0.5px solid #f8fafc' : 'none',
              background: cert.no_renewal_path ? '#fffbeb44' : 'transparent',
              transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = cert.no_renewal_path ? '#fffbeb44' : 'transparent'}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <UrgencyDot urgency={cert.urgency}/>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.domain}</span>
                </div>
                {cert.no_renewal_path && (
                  <Tag text="⚠ No renewal path" color="#d97706" bg="#fffbeb"/>
                )}
              </div>
              <div>
                <Tag text={cert.ca_name || cert.ca_type || '—'} color={caColor} bg={caColor + '12'}/>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(cert.expires_at)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: u.color }}>
                {cert.days_left === null ? '—' : cert.days_left < 0 ? 'Expired' : `${cert.days_left}d`}
              </div>
              <div><Tag text={u.label} color={u.color} bg={u.bg}/></div>
            </div>
          )
        })}
        {certs.length > 0 && (
          <div style={{ padding: '8px 16px', fontSize: 11, color: '#94a3b8', borderTop: '0.5px solid #f1f5f9' }}>
            Showing {certs.length} of {total} certificates
          </div>
        )}
      </Card>
    </div>
  )
}

// ══ TAB 2 — SHADOW IT SCANNER ════════════════════════════════════════
function ShadowScanner({ tok }) {
  const [conns, setConns]       = useState([])
  const [selectedConn, setSelectedConn] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult]     = useState(null)
  const [existing, setExisting] = useState([])
  const [loadingExist, setLoadingExist] = useState(false)
  const [dismissing, setDismissing] = useState(null)

  useEffect(() => {
    if (!tok) return
    supabase.from('ca_connections').select('id,ca_name,ca_type,label,status')
      .then(({ data }) => {
        const dc = (data || []).filter(c => c.ca_type === 'digicert' && c.status === 'active')
        setConns(dc)
        if (dc.length === 1) setSelectedConn(dc[0].id)
      })
    loadExisting()
  }, [tok])

  const loadExisting = async () => {
    setLoadingExist(true)
    const r = await call(tok, { action: 'get_shadow_certs' })
    if (r.ok) setExisting(r.shadows || [])
    setLoadingExist(false)
  }

  const doScan = async () => {
    if (!selectedConn) return
    setScanning(true); setResult(null)
    const r = await call(tok, { action: 'shadow_scan', connection_id: selectedConn })
    setResult(r)
    setScanning(false)
    if (r.ok) await loadExisting()
  }

  const dismiss = async (id) => {
    setDismissing(id)
    await call(tok, { action: 'dismiss_shadow', shadow_id: id })
    await loadExisting()
    setDismissing(null)
  }

  const shadows = existing

  return (
    <div>
      <SectionBanner icon={Search} color="#7c3aed"
        title="Shadow IT Scanner"
        sub="Compares your DigiCert portfolio against SSLVault inventory. Finds certs issued outside your CLM — compliance risk, expiry blindspot."/>

      {/* Connection picker + scan */}
      <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12,
          textTransform: 'uppercase', letterSpacing: '0.4px' }}>Run shadow scan</div>

        {conns.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            No active DigiCert connections found.{' '}
            <span style={{ color: '#0e7fc0', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => window.location.pathname = '/ca-connectors'}>
              Connect DigiCert →
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {conns.length > 1 && (
              <select value={selectedConn || ''} onChange={e => setSelectedConn(e.target.value)}
                style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '0.5px solid #e2e8f0',
                  fontFamily: 'inherit', color: '#374151', outline: 'none' }}>
                <option value="">Select connection…</option>
                {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
              </select>
            )}
            {conns.length === 1 && (
              <div style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }}/>
                {conns[0].label || conns[0].ca_name}
              </div>
            )}
            <button onClick={doScan} disabled={scanning || !selectedConn}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: scanning || !selectedConn ? '#94a3b8' : '#7c3aed',
                color: 'white', cursor: scanning || !selectedConn ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {scanning ? <><Spinner/> Scanning DigiCert…</> : <><Search size={12}/> Run Shadow Scan</>}
            </button>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Compares your entire DigiCert order history vs SSLVault DB
            </div>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? '#f0fdf4' : '#fef2f2',
            border: `0.5px solid ${result.ok ? '#bbf7d0' : '#fecaca'}` }}>
            {result.ok ? (
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#166534' }}>
                <span><strong>{result.total_in_ca}</strong> total in DigiCert</span>
                <span><strong>{result.total_in_sslvault}</strong> in SSLVault</span>
                <span style={{ fontWeight: 700, color: result.shadow_count > 0 ? '#dc2626' : '#16a34a' }}>
                  <strong>{result.shadow_count}</strong> shadow certs found
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#b91c1c' }}>{result.error}</span>
            )}
          </div>
        )}
      </Card>

      {/* Shadow cert list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          Shadow certificates {loadingExist ? '' : `(${shadows.length})`}
        </div>
        <button onClick={loadExisting}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
            padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e2e8f0',
            background: 'white', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
          <RefreshCw size={10} style={{ animation: loadingExist ? 'spin .8s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
          padding: '9px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#fafbfc' }}>
          {['Domain', 'Product', 'Ordered by', 'Expires', 'Urgency', ''].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        {shadows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Shield size={28} style={{ color: '#e2e8f0', display: 'block', margin: '0 auto 12px' }}/>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              {result?.ok ? 'No shadow certs found — portfolio is fully accounted for.' : 'Run a scan to find shadow certificates.'}
            </div>
            {result?.ok && (
              <Tag text="✓ Portfolio complete" color="#16a34a" bg="#f0fdf4"/>
            )}
          </div>
        ) : shadows.map((s, i) => {
          const u = URGENCY[s.urgency] || URGENCY.unknown
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              padding: '10px 16px', alignItems: 'center',
              borderBottom: i < shadows.length - 1 ? '0.5px solid #f8fafc' : 'none',
              transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                  color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2 }}>{s.domain}</div>
                {s.org_name && <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.org_name}</div>}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{s.product || '—'}</div>
              <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.ordered_by || '—'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(s.expires_at)}</div>
              <div><Tag text={u.label} color={u.color} bg={u.bg}/></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { sessionStorage.setItem('prefill_domain', s.domain); window.location.pathname = '/buy' }}
                  title="Import via SSLVault"
                  style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                    background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0',
                    cursor: 'pointer', fontFamily: 'inherit' }}>Import</button>
                <button onClick={() => dismiss(s.id)} disabled={dismissing === s.id}
                  title="Dismiss this finding"
                  style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                    background: '#f8fafc', color: '#94a3b8', border: '0.5px solid #e2e8f0',
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  {dismissing === s.id ? <Spinner/> : 'Dismiss'}
                </button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ══ TAB 3 — CONSOLIDATION ADVISOR ════════════════════════════════════
function ConsolidationAdvisor({ tok, nav }) {
  const [opps, setOpps]       = useState([])
  const [totalSaving, setTS]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [dismissing, setDim]  = useState(null)
  const [result, setResult]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await call(tok, { action: 'get_opportunities' })
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) load() }, [tok, load])

  const runAnalysis = async () => {
    setRunning(true); setResult(null)
    const r = await call(tok, { action: 'consolidation_report' })
    setResult(r)
    setRunning(false)
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
  }

  const dismiss = async (idx) => {
    setDim(idx)
    // Remove from UI immediately (no persistent ID for computed opps)
    setOpps(prev => prev.filter((_, i) => i !== idx))
    setDim(null)
  }

  const migrate = (opp) => {
    sessionStorage.setItem('prefill_domain', opp.domain)
    nav('/buy')
  }

  const consolidation = opps.filter(o => o.type === 'ca_consolidation')
  const duplicates    = opps.filter(o => o.type === 'duplicate_domain')

  return (
    <div>
      <SectionBanner icon={DollarSign} color="#16a34a"
        title="CA Consolidation Advisor"
        sub="Identifies cost-saving opportunities across your connected CAs. DV certs on expensive CAs, duplicate domains, and migration paths."/>

      {/* Run analysis */}
      <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Portfolio cost analysis</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Analyses all tracked certs for consolidation opportunities against GoGetSSL pricing</div>
          </div>
          <button onClick={runAnalysis} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: running ? '#94a3b8' : '#16a34a', color: 'white',
              cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {running ? <><Spinner/> Analysing…</> : <><TrendingDown size={13}/> Run Analysis</>}
          </button>
        </div>
        {result && !result.ok && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c', background: '#fef2f2',
            border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{result.error}</div>
        )}
      </Card>

      {/* Summary */}
      {opps.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #16a34a' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px', marginBottom: 4 }}>
              ${totalSaving.toFixed(0)}<span style={{ fontSize: 13, fontWeight: 500 }}>/yr</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Estimated savings</div>
          </Card>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #0e7fc0' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0e7fc0', letterSpacing: '-0.5px', marginBottom: 4 }}>{consolidation.length}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CA consolidation opportunities</div>
          </Card>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #d97706' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', letterSpacing: '-0.5px', marginBottom: 4 }}>{duplicates.length}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Duplicate domain findings</div>
          </Card>
        </div>
      )}

      {/* CA Consolidation Opportunities */}
      {consolidation.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            CA Consolidation — move DV certs to GoGetSSL
          </div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              padding: '9px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#fafbfc' }}>
              {['Domain', 'Current CA', 'Current product', 'Expires', 'Saving/yr', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
              ))}
            </div>
            {consolidation.map((opp, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                padding: '11px 16px', alignItems: 'center',
                borderBottom: i < consolidation.length - 1 ? '0.5px solid #f8fafc' : 'none',
                transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                    {opp.domain}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{opp.reason}</div>
                </div>
                <Tag text={opp.current_ca} color={CA_COLORS[opp.current_ca]||'#64748b'} bg={(CA_COLORS[opp.current_ca]||'#64748b')+'14'}/>
                <div style={{ fontSize: 11, color: '#64748b' }}>{opp.current_product || '—'}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(opp.expires_at)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>
                  ${(opp.estimated_saving_usd || 0).toFixed(0)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => migrate(opp)}
                    style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5,
                      background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Zap size={8}/> Migrate
                  </button>
                  <button onClick={() => dismiss(i)}
                    style={{ fontSize: 9, fontWeight: 700, padding: '4px 7px', borderRadius: 5,
                      background: '#f8fafc', color: '#94a3b8', border: '0.5px solid #e2e8f0',
                      cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Duplicate domain findings */}
      {duplicates.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            Duplicate domains across CAs
          </div>
          <Card>
            {duplicates.map((opp, i) => (
              <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < duplicates.length - 1 ? '0.5px solid #f8fafc' : 'none' }}>
                <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>{opp.domain}</span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{opp.reason}</span>
                </div>
                <button onClick={() => dismiss(consolidation.length + i)}
                  style={{ fontSize: 9, fontWeight: 700, padding: '4px 7px', borderRadius: 5,
                    background: '#f8fafc', color: '#94a3b8', border: '0.5px solid #e2e8f0',
                    cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
              </div>
            ))}
          </Card>
        </>
      )}

      {opps.length === 0 && !loading && (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <DollarSign size={32} style={{ color: '#e2e8f0', display: 'block', margin: '0 auto 12px' }}/>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
            {result?.ok ? 'No consolidation opportunities found.' : 'Run analysis to find cost-saving opportunities.'}
          </div>
          {result?.ok && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Your portfolio is already optimally consolidated.</div>
          )}
        </Card>
      )}
    </div>
  )
}

// ══ ROOT COMPONENT ════════════════════════════════════════════════════
export default function CertIntelligence({ nav }) {
  const [tok, setTok] = useState('')
  const [tab, setTab] = useState('timeline')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setTok(session.access_token)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setTok(s?.access_token || '')
    })
    return () => subscription.unsubscribe()
  }, [])

  const TABS = [
    { id: 'timeline',      label: 'Expiry Timeline',        icon: Activity,    color: '#0e7fc0' },
    { id: 'shadow',        label: 'Shadow IT Scanner',      icon: Search,      color: '#7c3aed' },
    { id: 'consolidation', label: 'Consolidation Advisor',  icon: DollarSign,  color: '#16a34a' },
  ]

  return (
    <div style={{ background: 'linear-gradient(160deg,#f0f4f8,#f8fafc)', minHeight: '100vh',
      fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="white" strokeWidth={2}/>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
              CA Intelligence Suite
            </h1>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0' }}>
              Live
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 600 }}>
            Cross-CA expiry intelligence, shadow IT discovery, and cost consolidation — unified across all your connected certificate authorities.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white',
          border: '0.5px solid #e2e8f0', borderRadius: 12, padding: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                background: tab === id ? color : 'transparent',
                color: tab === id ? 'white' : '#64748b',
                boxShadow: tab === id ? `0 2px 8px ${color}33` : 'none' }}>
              <Icon size={13}/>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!tok ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 13 }}>
            Loading session…
          </div>
        ) : (
          <>
            {tab === 'timeline'      && <ExpiryTimeline tok={tok}/>}
            {tab === 'shadow'        && <ShadowScanner tok={tok}/>}
            {tab === 'consolidation' && <ConsolidationAdvisor tok={tok} nav={nav}/>}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
