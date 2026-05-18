// CAIntelligenceHub.jsx
// Unified CA Intelligence Hub — Overview + GoGetSSL + DigiCert + Sectigo
// All CA workspaces live inside this single page, tab-switched at the top.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Shield, Activity, BarChart2, RefreshCw, ChevronRight,
  FileText, Building, Zap, RotateCcw, Ban, Search, Download, Archive,
  Clock, Globe, Eye, EyeOff, Lock, AlertTriangle, DollarSign, Check, X, AlertCircle
} from 'lucide-react'
import '../styles/design-v2.css'

const FN_CA     = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence'
const FN_IMPORT = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import'

async function callCA(tok, body) {
  const r = await fetch(FN_CA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

async function callImport(tok, body) {
  const r = await fetch(FN_IMPORT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── helpers ───────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
function expiryColor(d) {
  if (d === null) return '#94a3b8'
  if (d <= 0)  return '#dc2626'
  if (d <= 7)  return '#ea580c'
  if (d <= 30) return '#d97706'
  if (d <= 60) return '#ca8a04'
  return '#16a34a'
}

// ── shared primitives ─────────────────────────────────────────────────
function Spinner() {
  return <RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin .7s linear infinite' }}/>
}

function ExpiryBadge({ iso }) {
  const d = dLeft(iso)
  const color = expiryColor(d)
  const bg = d !== null && d <= 0 ? '#fef2f2' : d !== null && d <= 30 ? '#fffbeb' : '#f0fdf4'
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>
      {d === null ? '—' : d <= 0 ? 'Expired' : `${d}d`}
    </span>
  )
}

function CALogo({ label, bg, color }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 6, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color, flexShrink: 0 }}>
      {label}
    </div>
  )
}

function WorkspaceRow({ icon: Icon, iconBg, iconColor, label, badge, badgeColor, badgeBg, onOpen, openLabel = 'Open', last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 0', borderBottom: last ? 'none' : '0.5px solid var(--v2-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} strokeWidth={1.8} color={iconColor}/>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--v2-text)' }}>{label}</span>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: badgeBg || '#fffbeb', color: badgeColor || '#d97706',
            border: `0.5px solid ${badgeColor || '#d97706'}44` }}>{badge}</span>
        )}
      </div>
      <button className="v2-btn v2-btn-sm" onClick={onOpen}>{openLabel}</button>
    </div>
  )
}

function SectionCard({ title, children, style = {} }) {
  return (
    <div className="v2-card" style={{ marginBottom: 12, ...style }}>
      <div className="v2-card-pad">
        {title && <div className="v2-section-label" style={{ marginBottom: 10 }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}

// ── CA accent palette ─────────────────────────────────────────────────
const CA_META = {
  gogetssl: { label: 'GGS', bg: '#ecfdf5', color: '#065f46', accent: '#10b981' },
  digicert: { label: 'DC',  bg: '#fef2f2', color: '#991b1b', accent: '#dc2626' },
  sectigo:  { label: 'SC',  bg: '#f5f3ff', color: '#6b21a8', accent: '#7c3aed' },
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ══════════════════════════════════════════════════════════════════════
function OverviewTab({ tok, onSwitchCA }) {
  const [stats,   setStats]   = useState(null)
  const [conns,   setConns]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    try {
      const [tlRes, connRes] = await Promise.all([
        callCA(tok, { action: 'expiry_timeline' }),
        callImport(tok, { action: 'list_connections' }),
      ])
      const certs   = tlRes.certs || []
      const expired = certs.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d <= 0 }).length
      const exp7    = certs.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 7 }).length
      const exp30   = certs.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 30 }).length
      const exp90   = certs.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 90 }).length
      const healthy = certs.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 90 }).length
      const byCa    = {}
      certs.forEach(c => { const k = c.ca_source || 'unknown'; byCa[k] = (byCa[k] || 0) + 1 })
      setStats({ total: certs.length, expired, exp7, exp30, exp90, healthy, byCa })
      setConns(connRes.connections || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [tok])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--v2-text-3)', fontSize: 13 }}>
      <Spinner/><span style={{ marginLeft: 8 }}>Loading cross-CA overview…</span>
    </div>
  )

  const { total = 0, expired = 0, exp7 = 0, exp30 = 0, exp90 = 0, healthy = 0, byCa = {} } = stats || {}
  const dcConn  = conns.find(c => c.ca_type === 'digicert' && c.status === 'active')
  const scConn  = conns.find(c => c.ca_type === 'sectigo'  && c.status === 'active')
  const ggsCount = byCa['gogetssl'] || byCa['rapidssl'] || 0
  const dcCount  = byCa['digicert'] || 0
  const scCount  = byCa['sectigo']  || 0
  const maxCount = Math.max(ggsCount, dcCount, scCount, 1)

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Certs tracked',  val: total,   sub: 'all CAs',      c: 'var(--v2-text)' },
          { label: 'Expiring ≤ 30d', val: exp30,   sub: 'needs action', c: exp30   > 0 ? '#d97706' : 'var(--v2-text)' },
          { label: 'Expired',        val: expired,  sub: 'act now',      c: expired > 0 ? '#dc2626' : 'var(--v2-text)' },
          { label: 'CAs active',     val: 1 + (dcConn ? 1 : 0) + (scConn ? 1 : 0), sub: 'GGS + connected', c: 'var(--v2-text)' },
        ].map(({ label, val, sub, c }) => (
          <div key={label} className="v2-stat">
            <div className="v2-stat-label">{label}</div>
            <div className="v2-stat-value" style={{ color: c }}>{val}</div>
            <div className="v2-stat-delta">{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Portfolio by CA */}
        <SectionCard title="Portfolio by CA" style={{ marginBottom: 0 }}>
          {[
            { ca: 'gogetssl', count: ggsCount, label: 'GoGetSSL (native)' },
            { ca: 'digicert', count: dcCount,  label: 'DigiCert' },
            { ca: 'sectigo',  count: scCount,  label: 'Sectigo' },
          ].map(({ ca, count, label }) => (
            <div key={ca} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CALogo label={CA_META[ca].label} bg={CA_META[ca].bg} color={CA_META[ca].color}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--v2-text)' }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{count}</span>
                </div>
                <div className="v2-bar">
                  <div className="v2-bar-fill" style={{
                    width: `${Math.round((count / maxCount) * 100)}%`,
                    background: CA_META[ca].accent,
                  }}/>
                </div>
              </div>
            </div>
          ))}
          <button className="v2-btn v2-btn-sm" style={{ marginTop: 4 }} onClick={() => onSwitchCA('gogetssl')}>
            View GoGetSSL <ChevronRight size={11}/>
          </button>
        </SectionCard>

        {/* Expiry risk */}
        <SectionCard title="Expiry risk — all CAs" style={{ marginBottom: 0 }}>
          {[
            { label: 'Expired',   n: expired,  color: '#dc2626' },
            { label: '≤ 7 days',  n: exp7,     color: '#ea580c' },
            { label: '≤ 30 days', n: exp30,    color: '#d97706' },
            { label: '≤ 90 days', n: exp90,    color: '#ca8a04' },
            { label: 'Healthy',   n: healthy,  color: '#16a34a' },
          ].map(({ label, n, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ fontSize: 11, color: 'var(--v2-text-3)', width: 70, flexShrink: 0 }}>{label}</span>
              <div className="v2-bar" style={{ flex: 1 }}>
                <div style={{ height: '100%', width: `${Math.max(total ? Math.round((n/total)*100) : 0, 2)}%`,
                  background: color, borderRadius: 100 }}/>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color, width: 24, textAlign: 'right' }}>{n}</span>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* CA status */}
      <SectionCard title="CA connection status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { ca: 'gogetssl', label: 'GoGetSSL', sub: 'Native CA · always active',  conn: true, onClick: () => onSwitchCA('gogetssl') },
            { ca: 'digicert', label: 'DigiCert',  sub: dcConn ? 'API key active' : 'Not connected — click to connect', conn: !!dcConn, onClick: () => onSwitchCA('digicert') },
            { ca: 'sectigo',  label: 'Sectigo',   sub: scConn ? 'API credentials active' : 'Not connected — click to connect', conn: !!scConn, onClick: () => onSwitchCA('sectigo') },
          ].map(({ ca, label, sub, conn, onClick }) => (
            <div key={ca} onClick={onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--v2-surface-3)', borderRadius: 8,
                border: '0.5px solid var(--v2-border)', cursor: 'pointer' }}>
              <CALogo label={CA_META[ca].label} bg={CA_META[ca].bg} color={CA_META[ca].color}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v2-text)' }}>{label}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: conn ? '#10b981' : 'var(--v2-text-3)' }}>{sub}</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%',
                background: conn ? '#10b981' : '#d4d4d4', flexShrink: 0 }}/>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2 — GOGETSSL
// ══════════════════════════════════════════════════════════════════════
function GoGetSSLTab({ tok, nav }) {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    try {
      // ssl_orders is the native GoGetSSL orders table
      const { data, error } = await supabase
        .from('ssl_orders')
        .select('id,domain,product_name,product_code,status,ggs_status,valid_from,valid_till,created_at,order_type,ca_code')
        .order('valid_till', { ascending: true })
      if (!error && data) {
        // Normalise to common shape
        const normalised = data.map(o => ({
          id:           o.id,
          common_name:  o.domain,
          domain:       o.domain,
          product_name: o.product_name,
          expiry_date:  o.valid_till,
          status:       o.status,
          ca_source:    'gogetssl',
          auto_renew:   false,
        }))
        setOrders(normalised)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [tok])

  useEffect(() => { load() }, [load])

  const expiring  = orders.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 30 }).length
  const expired   = orders.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d <= 0 }).length
  const autoRenew = orders.filter(c => c.auto_renew).length

  if (ws === 'orders') {
    const filtered = orders.filter(c => {
      if (filter === 'all') return true
      const d = dLeft(c.expiry_date)
      if (filter === 'expiring') return d !== null && d > 0 && d <= 30
      if (filter === 'expired')  return d !== null && d <= 0
      if (filter === 'healthy')  return d !== null && d > 30
      return true
    })
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button className="v2-btn v2-btn-sm" onClick={() => setWs(null)}>← Back</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-text)' }}>GoGetSSL — All orders</span>
          <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{orders.length} certs</span>
        </div>
        <div className="v2-card">
          <div className="v2-filter-bar">
            {[['all','All'],['expiring','Expiring ≤30d'],['expired','Expired'],['healthy','Healthy']].map(([id, lbl]) => (
              <button key={id} className={`v2-filter-chip ${filter===id?'active':''}`}
                onClick={() => setFilter(id)}>{lbl}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--v2-text-3)' }}>{filtered.length} shown</span>
          </div>
          <div className="v2-list-scroll">
            {filtered.length === 0
              ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--v2-text-3)', fontSize: 13 }}>No certs match this filter.</div>
              : filtered.map((c, i) => {
                  const d = dLeft(c.expiry_date)
                  const s = d === null ? 'grey' : d <= 0 ? 'red' : d <= 30 ? 'amber' : 'green'
                  return (
                    <div key={i} className={`v2-list-row status-${s}`}>
                      <div className="v2-row-body">
                        <div className="v2-row-title-line">
                          <span className="v2-row-title">{c.common_name || c.domain || '—'}</span>
                          <ExpiryBadge iso={c.expiry_date}/>
                        </div>
                        <div className="v2-row-meta">
                          <span>{c.product_name || 'SSL Certificate'}</span>
                          <span className="v2-row-meta-sep">·</span>
                          <span>Expires {fmt(c.expiry_date)}</span>
                          {c.auto_renew && <><span className="v2-row-meta-sep">·</span><span style={{ color: '#10b981' }}>Auto-renew</span></>}
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>
    )
  }

  // Inline cert table — show directly, no launcher
  const filtered = orders.filter(c => {
    if (filter === 'all') return true
    const d = dLeft(c.expiry_date)
    if (filter === 'expiring') return d !== null && d > 0 && d <= 30
    if (filter === 'expired')  return d !== null && d <= 0
    if (filter === 'healthy')  return d !== null && d > 30
    return true
  })

  return (
    <div>
      {/* Connection banner */}
      <div style={{ background: '#ecfdf5', border: '0.5px solid #6ee7b7', borderRadius: 8,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>GoGetSSL — SSLVault native CA</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>Live API · {orders.length} active orders</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="v2-btn v2-btn-sm" onClick={load} disabled={loading}>
            {loading ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync</>}
          </button>
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={() => nav('/buy')}>Issue certificate</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total certs',    val: loading ? '…' : orders.length, sub: 'DV · OV · EV · Wildcard', c: 'var(--v2-text)' },
          { label: 'Auto-renewing', val: loading ? '…' : autoRenew,      sub: 'agent active',             c: '#10b981' },
          { label: 'Expiring ≤30d', val: loading ? '…' : expiring,       sub: 'needs action',             c: expiring > 0 ? '#d97706' : '#16a34a' },
          { label: 'Expired',       val: loading ? '…' : expired,        sub: expired > 0 ? 'act now' : 'all clear', c: expired > 0 ? '#dc2626' : '#16a34a' },
        ].map(({ label, val, sub, c }) => (
          <div key={label} className="v2-stat">
            <div className="v2-stat-label">{label}</div>
            <div className="v2-stat-value" style={{ color: c }}>{val}</div>
            <div className="v2-stat-delta">{sub}</div>
          </div>
        ))}
      </div>

      {/* Certificate table */}
      <div className="v2-card">
        <div className="v2-filter-bar">
          {[['all','All'],['expiring','Expiring ≤30d'],['expired','Expired'],['healthy','Healthy']].map(([id, lbl]) => (
            <button key={id} className={`v2-filter-chip ${filter===id?'active':''}`}
              onClick={() => setFilter(id)}>{lbl}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--v2-text-3)' }}>{filtered.length} certs</span>
        </div>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px',
          padding: '8px 16px', background: 'var(--v2-surface-2)', borderBottom: '0.5px solid var(--v2-border)' }}>
          {['Domain', 'Product', 'Expires', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        <div className="v2-list-scroll">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
              <Spinner/><span style={{ marginLeft: 8 }}>Loading certificates…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
              {orders.length === 0 ? 'No GoGetSSL certificates found. Issue your first certificate.' : 'No certificates match this filter.'}
            </div>
          ) : filtered.map((c, i) => {
            const d = dLeft(c.expiry_date)
            const color = expiryColor(d)
            const s = d === null ? 'grey' : d <= 0 ? 'red' : d <= 30 ? 'amber' : 'green'
            return (
              <div key={i} className={`v2-list-row status-${s}`}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', padding: '10px 16px', cursor: 'default' }}>
                <div className="v2-row-body" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--v2-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.common_name || c.domain || '—'}
                  </div>
                  {c.auto_renew && <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>Auto-renew enabled</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{c.product_name || 'SSL Certificate'}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{fmt(c.expiry_date)}</div>
                <div style={{ alignSelf: 'center' }}><ExpiryBadge iso={c.expiry_date}/></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3 — DIGICERT
// ══════════════════════════════════════════════════════════════════════
function DigiCertTab({ tok }) {
  const [apiKey,   setApiKey]   = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [showKey,  setShowKey]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [portfolio, setPf]      = useState([])
  const [loadingPf, setLoadingPf] = useState(false)

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action: 'list_connections' }).then(r => {
      const dc = (r.connections || []).find(c => c.ca_type === 'digicert' && c.status === 'active')
      if (dc?.api_key) setApiKey(dc.api_key)
    })
  }, [tok])

  const connect = async () => {
    if (!draftKey.trim()) { setError('API key required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action: 'save_connection', ca_type: 'digicert', label: 'DigiCert CertCentral', api_key: draftKey.trim() })
      if (r.error) { setError(r.error); setSaving(false); return }
      setApiKey(draftKey.trim())
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const disconnect = async () => {
    await callImport(tok, { action: 'delete_connection', ca_type: 'digicert' })
    setApiKey(''); setWs(null); setPf([])
  }

  const loadPf = useCallback(async () => {
    if (!apiKey || !tok) return
    setLoadingPf(true)
    try {
      const r = await callImport(tok, { action: 'fetch_ca_certs', ca_type: 'digicert', api_key: apiKey })
      setPf(r.certs || [])
    } catch (e) { console.error(e) }
    setLoadingPf(false)
  }, [apiKey, tok])

  if (!apiKey) return (
    <div>
      <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 2 }}>DigiCert CertCentral — not connected</div>
        <div style={{ fontSize: 11, color: '#dc2626' }}>Connect your API key to access portfolio, PQC scoring, reissue, and CT log monitoring.</div>
      </div>
      <SectionCard>
        <label className="v2-label">CertCentral API key</label>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input className="v2-input mono" type={showKey ? 'text' : 'password'}
            value={draftKey} onChange={e => setDraftKey(e.target.value)}
            placeholder="Paste your DigiCert API key…"/>
          <button onClick={() => setShowKey(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)' }}>
            {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
          </button>
        </div>
        <div className="v2-label-help" style={{ marginBottom: 12 }}>
          Get your key at <a href="https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html"
            target="_blank" rel="noreferrer" style={{ color: 'var(--v2-text)', textDecoration: 'underline' }}>
            dev.digicert.com</a>. Read-only scope is sufficient.
        </div>
        {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="v2-btn v2-btn-primary" onClick={connect} disabled={saving}>
          {saving ? <><Spinner/> Connecting…</> : 'Connect DigiCert'}
        </button>
      </SectionCard>
    </div>
  )

  const expiring = portfolio.filter(c => { const d = dLeft(c.valid_till); return d !== null && d > 0 && d <= 30 }).length
  const pqcRisk  = portfolio.filter(c => (c.key_size || 0) <= 2048).length



  return (
    <div>
      <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 8,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>DigiCert CertCentral connected</div>
          <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>API key active · read-only scope</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="v2-btn v2-btn-sm" onClick={loadPf} disabled={loadingPf}>
            {loadingPf ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync</>}
          </button>
          <button className="v2-btn v2-btn-sm v2-btn-danger" onClick={disconnect}>Disconnect</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Portfolio certs', val: portfolio.length || '—', sub: 'DV · OV · EV', c: 'var(--v2-text)' },
          { label: 'Expiring ≤ 30d',  val: expiring, sub: 'needs reissue', c: expiring > 0 ? '#d97706' : '#16a34a' },
          { label: 'PQC risk certs',  val: pqcRisk || '—', sub: 'RSA-2048 flagged', c: pqcRisk > 0 ? '#dc2626' : 'var(--v2-text)' },
        ].map(({ label, val, sub, c }) => (
          <div key={label} className="v2-stat">
            <div className="v2-stat-label">{label}</div>
            <div className="v2-stat-value" style={{ color: c }}>{val}</div>
            <div className="v2-stat-delta">{sub}</div>
          </div>
        ))}
      </div>

      {/* Inline portfolio table */}
      <div className="v2-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Certificate inventory
          </span>
          <button className="v2-btn v2-btn-sm" onClick={() => { setWs('portfolio'); loadPf() }} disabled={loadingPf}>
            {loadingPf ? <><Spinner/> Loading…</> : <><RefreshCw size={11}/> Fetch from CertCentral</>}
          </button>
        </div>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px',
          padding: '8px 16px', background: 'var(--v2-surface-2)', borderBottom: '0.5px solid var(--v2-border)' }}>
          {['Domain', 'Product', 'Expires', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        <div className="v2-list-scroll">
          {portfolio.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
              Click "Fetch from CertCentral" to load your DigiCert portfolio.
            </div>
          ) : portfolio.map((c, i) => {
            const d = dLeft(c.valid_till)
            const s = d === null ? 'grey' : d <= 0 ? 'red' : d <= 30 ? 'amber' : 'green'
            return (
              <div key={i} className={`v2-list-row status-${s}`}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', padding: '10px 16px', cursor: 'default' }}>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--v2-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  {c.common_name || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{c.product?.name_id || 'SSL'}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{fmt(c.valid_till)}</div>
                <div style={{ alignSelf: 'center' }}><ExpiryBadge iso={c.valid_till}/></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 4 — SECTIGO
// ══════════════════════════════════════════════════════════════════════
function SectigoTab({ tok }) {
  const [creds,    setCreds]    = useState(null)
  const [draft,    setDraft]    = useState({ uri: '', login: '', pass: '' })
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action: 'list_connections' }).then(r => {
      const sc = (r.connections || []).find(c => c.ca_type === 'sectigo' && c.status === 'active')
      if (sc?.customer_uri && sc?.login && sc?.password)
        setCreds({ customer_uri: sc.customer_uri, login: sc.login, password: sc.password })
    })
  }, [tok])

  const connect = async () => {
    if (!draft.uri || !draft.login || !draft.pass) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action: 'save_connection', ca_type: 'sectigo', label: 'Sectigo SCM',
        customer_uri: draft.uri, login: draft.login, password: draft.pass })
      if (r.error) { setError(r.error); setSaving(false); return }
      setCreds({ customer_uri: draft.uri, login: draft.login, password: draft.pass })
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const disconnect = () => {
    callImport(tok, { action: 'delete_connection', ca_type: 'sectigo' })
    setCreds(null)
  }

  if (!creds) return (
    <div>
      <div style={{ background: '#faf5ff', border: '0.5px solid #e9d5ff', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6b21a8', marginBottom: 2 }}>Sectigo SCM — not connected</div>
        <div style={{ fontSize: 11, color: '#7c3aed' }}>Connect your SCM credentials to access inventory, org status, and portfolio analytics.</div>
      </div>
      <SectionCard>
        {[
          { label: 'Customer URI', key: 'uri',   placeholder: 'https://cert-manager.com', type: 'text' },
          { label: 'Login',        key: 'login', placeholder: 'your@email.com',           type: 'text' },
          { label: 'Password',     key: 'pass',  placeholder: '••••••••',                 type: showPass ? 'text' : 'password' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label className="v2-label">{label}</label>
            <div style={{ position: 'relative' }}>
              <input className="v2-input" type={type} placeholder={placeholder}
                value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}/>
              {key === 'pass' && (
                <button onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)' }}>
                  {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              )}
            </div>
          </div>
        ))}
        {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="v2-btn v2-btn-primary" onClick={connect} disabled={saving}>
          {saving ? <><Spinner/> Connecting…</> : 'Connect Sectigo'}
        </button>
      </SectionCard>
    </div>
  )

  return (
    <div>
      <div style={{ background: '#faf5ff', border: '0.5px solid #e9d5ff', borderRadius: 8,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b21a8' }}>Sectigo SCM connected</div>
          <div style={{ fontSize: 11, color: '#9333ea', marginTop: 2 }}>{creds.customer_uri}</div>
        </div>
        <button className="v2-btn v2-btn-sm v2-btn-danger" onClick={disconnect}>Disconnect</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Cert inventory',  val: '—', sub: 'fetch to see',   c: 'var(--v2-text)' },
          { label: 'Expiring ≤ 30d',  val: '—', sub: 'needs attention', c: 'var(--v2-text)' },
          { label: 'Organisations',   val: '—', sub: 'fetch to see',   c: 'var(--v2-text)' },
        ].map(({ label, val, sub, c }) => (
          <div key={label} className="v2-stat">
            <div className="v2-stat-label">{label}</div>
            <div className="v2-stat-value" style={{ color: c }}>{val}</div>
            <div className="v2-stat-delta">{sub}</div>
          </div>
        ))}
      </div>

      {/* Inventory placeholder — Sectigo API pull */}
      <div className="v2-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Certificate inventory
          </span>
        </div>
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 6 }}>
            Sectigo SCM connected
          </div>
          <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>
            Certificate inventory pull from Sectigo SCM API is available. Sync to load your portfolio into SSLVault for unified expiry tracking.
          </div>
          <button className="v2-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={12}/> Sync Sectigo inventory
          </button>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════
// TAB 5 — SHADOW IT SCANNER
// ══════════════════════════════════════════════════════════════════════
const URGENCY_MAP = {
  expired:  { label: 'Expired',  color: '#dc2626', bg: '#fef2f2' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
  warning:  { label: 'Warning',  color: '#d97706', bg: '#fffbeb' },
  upcoming: { label: 'Upcoming', color: '#0369a1', bg: '#eff6ff' },
  healthy:  { label: 'Healthy',  color: '#16a34a', bg: '#f0fdf4' },
  unknown:  { label: 'Unknown',  color: '#64748b', bg: '#f8fafc' },
}

function ShadowITTab({ tok, nav }) {
  const [conns,        setConns]        = useState([])
  const [selectedConn, setSelectedConn] = useState(null)
  const [scanning,     setScanning]     = useState(false)
  const [result,       setResult]       = useState(null)
  const [shadows,      setShadows]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [dismissing,   setDismissing]   = useState(null)

  const loadShadows = useCallback(async () => {
    setLoading(true)
    const r = await callCA(tok, { action: 'get_shadow_certs' })
    if (r.ok) setShadows(r.shadows || [])
    setLoading(false)
  }, [tok])

  useEffect(() => {
    if (!tok) return
    supabase.from('ca_connections').select('id,ca_name,ca_type,label,status')
      .then(({ data }) => {
        const dc = (data || []).filter(c => c.ca_type === 'digicert' && c.status === 'active')
        setConns(dc)
        if (dc.length === 1) setSelectedConn(dc[0].id)
      })
    loadShadows()
  }, [tok, loadShadows])

  const doScan = async () => {
    if (!selectedConn) return
    setScanning(true); setResult(null)
    const r = await callCA(tok, { action: 'shadow_scan', connection_id: selectedConn })
    setResult(r)
    setScanning(false)
    if (r.ok) await loadShadows()
  }

  const dismiss = async (id) => {
    setDismissing(id)
    await callCA(tok, { action: 'dismiss_shadow', shadow_id: id })
    setShadows(s => s.filter(x => x.id !== id))
    setDismissing(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7c3aed14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Search size={17} strokeWidth={2} color="#7c3aed"/>
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-text)', margin: 0, letterSpacing: '-0.2px' }}>
            Shadow IT Scanner
          </h2>
          <p style={{ fontSize: 12, color: 'var(--v2-text-3)', margin: '3px 0 0', lineHeight: 1.5 }}>
            Compares your DigiCert portfolio against SSLVault inventory. Finds certs issued outside your CLM — compliance risk, expiry blindspot.
          </p>
        </div>
      </div>

      {/* Scan panel */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div className="v2-section-label" style={{ marginBottom: 12 }}>Run shadow scan</div>
        {conns.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--v2-text-3)' }}>
            No active DigiCert connections found.{' '}
            <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--v2-green)', fontSize: 13, padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>
              Connect DigiCert in Integrations →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {conns.length > 1 && (
              <select value={selectedConn || ''} onChange={e => setSelectedConn(e.target.value)}
                className="v2-select" style={{ fontSize: 12 }}>
                <option value="">Select connection…</option>
                {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
              </select>
            )}
            {conns.length === 1 && (
              <div style={{ fontSize: 12, color: 'var(--v2-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }}/>
                {conns[0].label || conns[0].ca_name}
              </div>
            )}
            <button className="v2-btn" onClick={doScan} disabled={scanning || !selectedConn}
              style={{ background: scanning || !selectedConn ? undefined : '#7c3aed',
                color: scanning || !selectedConn ? undefined : 'white',
                borderColor: scanning || !selectedConn ? undefined : '#7c3aed',
                display: 'flex', alignItems: 'center', gap: 6 }}>
              {scanning ? <><Spinner/> Scanning DigiCert…</> : <><Search size={12}/> Run Shadow Scan</>}
            </button>
            <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
              Compares your entire DigiCert order history vs SSLVault DB
            </span>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? '#f0fdf4' : '#fef2f2',
            border: `0.5px solid ${result.ok ? '#bbf7d0' : '#fecaca'}` }}>
            {result.ok ? (
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#166534', flexWrap: 'wrap' }}>
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
      </SectionCard>

      {/* Shadow cert table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)' }}>
          Shadow certificates
          {!loading && <span style={{ fontSize: 11, color: 'var(--v2-text-3)', marginLeft: 6,
            background: shadows.length > 0 ? '#fef2f2' : 'var(--v2-hover)',
            color: shadows.length > 0 ? '#dc2626' : 'var(--v2-text-3)',
            padding: '1px 7px', borderRadius: 20, border: shadows.length > 0 ? '0.5px solid #fecaca' : '0.5px solid var(--v2-border)' }}>
            {shadows.length}
          </span>}
        </div>
        <button className="v2-btn v2-btn-sm" onClick={loadShadows} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={11} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      <div className="v2-card">
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
          padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)',
          background: 'var(--v2-surface-2)' }}>
          {['Domain', 'Product', 'Ordered by', 'Expires', 'Urgency', ''].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
            <Spinner/><span style={{ marginLeft: 8 }}>Loading shadow findings…</span>
          </div>
        ) : shadows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--v2-surface-3)',
              border: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={20} color="var(--v2-text-3)"/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 4 }}>
              {result?.ok ? 'No shadow certs found — portfolio is fully accounted for.' : 'Run a scan to find shadow certificates.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
              {result?.ok ? 'Your DigiCert portfolio matches SSLVault exactly.' : 'Connect DigiCert and run a shadow scan above.'}
            </div>
          </div>
        ) : shadows.map((s, i) => {
          const u = URGENCY_MAP[s.urgency] || URGENCY_MAP.unknown
          return (
            <div key={s.id} className={`v2-list-row status-${s.urgency === 'expired' || s.urgency === 'critical' ? 'red' : s.urgency === 'warning' ? 'amber' : 'green'}`}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '10px 16px',
                borderBottom: i < shadows.length - 1 ? '0.5px solid var(--v2-border)' : 'none', cursor: 'default' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                  color: 'var(--v2-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.domain}
                </div>
                {s.org_name && <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 2 }}>{s.org_name}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{s.product || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ordered_by || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', alignSelf: 'center' }}>{fmt(s.expires_at)}</div>
              <div style={{ alignSelf: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: u.bg, color: u.color, border: `0.5px solid ${u.color}44` }}>{u.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignSelf: 'center' }}>
                <button className="v2-btn v2-btn-sm"
                  onClick={() => { sessionStorage.setItem('prefill_domain', s.domain); nav('/buy') }}
                  style={{ fontSize: 10, padding: '3px 8px' }}>
                  Import
                </button>
                <button className="v2-btn v2-btn-sm v2-btn-danger"
                  onClick={() => dismiss(s.id)} disabled={dismissing === s.id}
                  style={{ fontSize: 10, padding: '3px 8px' }}>
                  {dismissing === s.id ? <Spinner/> : 'Dismiss'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 6 — CONSOLIDATION ADVISOR
// ══════════════════════════════════════════════════════════════════════
const CA_COLORS_HUB = {
  digicert: '#dc2626', sectigo: '#7c3aed', sslcom: '#0369a1',
  gogetssl: '#16a34a', imported: '#64748b', unknown: '#94a3b8'
}

function ConsolidationTab({ tok, nav }) {
  const [opps,       setOpps]     = useState([])
  const [totalSaving, setTS]      = useState(0)
  const [loading,    setLoading]  = useState(true)
  const [running,    setRunning]  = useState(false)
  const [result,     setResult]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await callCA(tok, { action: 'get_opportunities' })
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) load() }, [tok, load])

  const runAnalysis = async () => {
    setRunning(true); setResult(null)
    const r = await callCA(tok, { action: 'consolidation_report' })
    setResult(r); setRunning(false)
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
  }

  const dismiss = (idx) => setOpps(prev => prev.filter((_, i) => i !== idx))

  const consolidation = opps.filter(o => o.type === 'ca_consolidation')
  const duplicates    = opps.filter(o => o.type === 'duplicate')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#16a34a14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DollarSign size={17} strokeWidth={2} color="#16a34a"/>
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-text)', margin: 0, letterSpacing: '-0.2px' }}>
            Consolidation Advisor
          </h2>
          <p style={{ fontSize: 12, color: 'var(--v2-text-3)', margin: '3px 0 0', lineHeight: 1.5 }}>
            Finds DV certificates at premium CAs that can be moved to GoGetSSL to cut costs. Surfaces duplicate domains across CAs.
          </p>
        </div>
      </div>

      {/* Run analysis */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="v2-section-label" style={{ marginBottom: 4 }}>Cost analysis</div>
            <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
              Analyses your cross-CA portfolio for consolidation opportunities and duplicate certs.
            </div>
          </div>
          <button className="v2-btn" onClick={runAnalysis} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: running ? undefined : '#16a34a', color: running ? undefined : 'white',
              borderColor: running ? undefined : '#16a34a' }}>
            {running ? <><Spinner/> Analysing…</> : <><DollarSign size={12}/> Run Analysis</>}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? '#f0fdf4' : '#fef2f2',
            border: `0.5px solid ${result.ok ? '#bbf7d0' : '#fecaca'}` }}>
            {result.ok ? (
              <div style={{ fontSize: 12, color: '#166534' }}>
                Found <strong>{result.opportunities?.length || 0}</strong> opportunities ·{' '}
                <strong>${(result.total_saving_usd || 0).toFixed(0)}</strong>/yr potential savings
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#b91c1c' }}>{result.error || 'Analysis failed'}</span>
            )}
          </div>
        )}
      </SectionCard>

      {/* Savings summary */}
      {totalSaving > 0 && (
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 10,
          padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} color="#16a34a"/>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#166534', letterSpacing: '-0.3px' }}>
              ${totalSaving.toFixed(0)}<span style={{ fontSize: 13, fontWeight: 500, marginLeft: 4 }}>/yr</span>
            </div>
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
              potential annual savings by consolidating to GoGetSSL
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
          <Spinner/><span style={{ marginLeft: 8 }}>Loading opportunities…</span>
        </div>
      ) : opps.length === 0 ? (
        <div className="v2-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--v2-surface-3)',
            border: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px' }}>
            <Check size={20} color="var(--v2-text-3)"/>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 4 }}>
            {result?.ok ? 'Portfolio already optimally consolidated.' : 'Run analysis to find cost-saving opportunities.'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
            {result?.ok ? 'No cheaper alternatives found for your current certificates.' : 'Click "Run Analysis" above to scan your cross-CA portfolio.'}
          </div>
        </div>
      ) : (
        <>
          {/* CA Consolidation table */}
          {consolidation.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 10 }}>
                CA Consolidation — move DV certs to GoGetSSL
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--v2-text-3)', marginLeft: 8 }}>
                  {consolidation.length} opportunity{consolidation.length !== 1 ? 'ies' : 'y'}
                </span>
              </div>
              <div className="v2-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px',
                  padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)',
                  background: 'var(--v2-surface-2)' }}>
                  {['Domain', 'Current CA', 'Product', 'Expires', 'Saving/yr', ''].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)',
                      textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                  ))}
                </div>
                {consolidation.map((opp, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px',
                    padding: '11px 16px', alignItems: 'center',
                    borderBottom: i < consolidation.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
                    transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                        color: 'var(--v2-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opp.domain}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--v2-text-3)', marginTop: 2 }}>{opp.reason}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: (CA_COLORS_HUB[opp.current_ca] || '#64748b') + '18',
                        color: CA_COLORS_HUB[opp.current_ca] || '#64748b',
                        border: `0.5px solid ${CA_COLORS_HUB[opp.current_ca] || '#64748b'}44` }}>
                        {opp.current_ca}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>{opp.current_product || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>{fmt(opp.expires_at)}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                      ${(opp.estimated_saving_usd || 0).toFixed(0)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="v2-btn v2-btn-sm"
                        onClick={() => { sessionStorage.setItem('prefill_domain', opp.domain); nav('/buy') }}
                        style={{ fontSize: 10, padding: '3px 8px', background: '#f0fdf4',
                          color: '#16a34a', borderColor: '#bbf7d0',
                          display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={9}/> Migrate
                      </button>
                      <button className="v2-btn v2-btn-sm" onClick={() => dismiss(opps.indexOf(opp))}
                        style={{ fontSize: 10, padding: '3px 7px' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 10 }}>
                Duplicate domains across CAs
              </div>
              <div className="v2-card">
                {duplicates.map((opp, i) => (
                  <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < duplicates.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                    <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                        color: 'var(--v2-text)' }}>{opp.domain}</span>
                      <span style={{ fontSize: 11, color: 'var(--v2-text-3)', marginLeft: 8 }}>{opp.reason}</span>
                    </div>
                    <button className="v2-btn v2-btn-sm" onClick={() => dismiss(opps.indexOf(opp))}>Dismiss</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Hub shell
// ══════════════════════════════════════════════════════════════════════
export default function CAIntelligenceHub({ nav }) {
  const [tok, setTok] = useState('')
  const [tab, setTab] = useState('overview')

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
    { id: 'overview',       label: 'Overview',       dot: null      },
    { id: 'gogetssl',       label: 'GoGetSSL',       dot: '#10b981' },
    { id: 'digicert',       label: 'DigiCert',       dot: '#dc2626' },
    { id: 'sectigo',        label: 'Sectigo',        dot: '#7c3aed' },
    { id: 'shadow',         label: 'Shadow IT',      dot: '#7c3aed', divider: true },
    { id: 'consolidation',  label: 'Cost savings',   dot: '#16a34a' },
  ]

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh',
      fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* Header — dark navy matching CLMHome sidebar */}
      <div style={{ background: '#0d3c6e' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0e7fc0',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="white" strokeWidth={2}/>
            </div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.2px' }}>
                CA Intelligence hub
              </h1>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, marginTop: 1 }}>
                Unified certificate visibility across GoGetSSL, DigiCert &amp; Sectigo
              </p>
            </div>
          </div>

          {/* Tab bar — white underline on navy */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {TABS.map(({ id, label, dot, divider }) => (
              <div key={id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                {divider && (
                  <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)',
                    marginBottom: 1, marginRight: 2 }}/>
                )}
                <button onClick={() => setTab(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px 10px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: tab === id ? '2px solid white' : '2px solid transparent',
                    color: tab === id ? 'white' : 'rgba(255,255,255,0.5)',
                    transition: 'color 0.12s, border-color 0.12s',
                    marginBottom: -1 }}>
                  {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }}/>}
                  {label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }}>
        {!tok
          ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--v2-text-3)', fontSize: 13 }}>
              <Spinner/><span style={{ marginLeft: 8 }}>Loading session…</span>
            </div>
          : <>
              {tab === 'overview' && <OverviewTab tok={tok} nav={nav} onSwitchCA={setTab}/>}
              {tab === 'gogetssl' && <GoGetSSLTab tok={tok} nav={nav}/>}
              {tab === 'digicert' && <DigiCertTab tok={tok}/>}
              {tab === 'sectigo'  && <SectigoTab  tok={tok}/>}
            </>
        }
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
