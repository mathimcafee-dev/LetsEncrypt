// DigiCertLab — isolated sandbox for DigiCert CertCentral automation experiments
// Route: /digicert-lab
// Zero dependency on existing RapidSSL / agent / cron flows.
// Uses a dedicated edge function: digicert-lab (separate from ca-import).

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, RefreshCw, AlertTriangle, Check, X, ChevronRight,
  ExternalLink, RotateCcw, Trash2, Eye, EyeOff, Zap,
  Activity, ShieldCheck, FileText, Lock, TrendingUp, Clock,
  AlertCircle, Download, Search
} from 'lucide-react'
import '../styles/design-v2.css'

const LAB_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/digicert-lab'

async function callLab(tok, body) {
  // Always get a fresh token in case the passed tok is stale or empty
  let authTok = tok
  if (!authTok) {
    const { data: { session } } = await supabase.auth.getSession()
    authTok = session?.access_token || ''
  }
  if (!authTok) return { error: 'Not logged in — please sign in to SSLVault first' }
  const r = await fetch(LAB_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authTok },
    body: JSON.stringify(body)
  })
  return r.json()
}

function fmt(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function StatusDot({ d }) {
  const color = d === null ? '#d4d4d4' : d < 0 ? '#ef4444' : d < 30 ? '#E8897A' : '#16a34a'
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:color, marginRight:6, flexShrink:0 }}/>
}

function Badge({ text, color = 'var(--v2-text-3)', bg = 'var(--v2-border)' }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
      background: bg, color, border: '0.5px solid ' + color + '44', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Sidebar nav items ────────────────────────────────────────────────
const SECTIONS = [
  { id: 'connect',   label: 'API Connection',      icon: Lock },
  { id: 'portfolio', label: 'Portfolio Overview',  icon: Activity },
  { id: 'pqc',       label: 'PQC Risk Scanner',    icon: ShieldCheck },
  { id: 'expiry',    label: 'Expiry Risk Map',      icon: Clock },
  { id: 'reissue',   label: 'Zero-touch Reissue',  icon: RotateCcw },
  { id: 'revoke',    label: 'Revoke & Replace',     icon: Trash2 },
  { id: 'reports',   label: 'Portfolio Report',     icon: FileText },
]

export default function DigiCertLab({ nav }) {
  const [tok, setTok] = useState('')
  const [user, setUser] = useState(null)
  const [section, setSection] = useState('connect')

  // API key state
  const [apiKey, setApiKey] = useState('')
  const [apiKeyVis, setApiKeyVis] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connError, setConnError] = useState('')
  const [connInfo, setConnInfo] = useState(null) // { name, division, account_id }

  // Portfolio state
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Action states
  const [actionResult, setActionResult] = useState(null)
  const [working, setWorking] = useState(false)
  const [selectedCert, setSelectedCert] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setTok(session.access_token); setUser(session.user) }
    })
    // Restore saved API key from sessionStorage (lab session only, never persisted)
    const saved = sessionStorage.getItem('dc_lab_key')
    const savedAcct = sessionStorage.getItem('dc_lab_acct')
    if (saved) { setApiKey(saved); if (savedAcct) setAccountId(savedAcct) }
  }, [])

  const connect = async () => {
    if (!apiKey.trim()) return setConnError('Enter your CertCentral API key')
    setConnecting(true); setConnError('')
    // Always fetch fresh session — tok state may be stale
    const { data: { session: freshSession } } = await supabase.auth.getSession()
    const freshTok = freshSession?.access_token || tok
    if (!freshTok) { setConnError('Not logged in — sign in to SSLVault first'); setConnecting(false); return }
    setTok(freshTok)
    const r = await callLab(freshTok, { action: 'verify_connection', api_key: apiKey.trim(), account_id: accountId.trim() || null })
    if (r.ok) {
      setConnected(true)
      setConnInfo(r)
      sessionStorage.setItem('dc_lab_key', apiKey.trim())
      if (accountId.trim()) sessionStorage.setItem('dc_lab_acct', accountId.trim())
      setSection('portfolio')
      loadPortfolio()
    } else {
      setConnError(r.error || 'Connection failed')
    }
    setConnecting(false)
  }

  const disconnect = () => {
    setConnected(false); setConnInfo(null); setCerts([])
    setApiKey(''); setAccountId(''); setConnError('')
    sessionStorage.removeItem('dc_lab_key'); sessionStorage.removeItem('dc_lab_acct')
    setSection('connect')
  }

  const loadPortfolio = useCallback(async () => {
    const key = apiKey.trim() || sessionStorage.getItem('dc_lab_key') || ''
    if (!key) return
    setLoading(true); setLoadError('')
    const { data: { session: s } } = await supabase.auth.getSession()
    const freshTok = s?.access_token || tok
    if (freshTok) setTok(freshTok)
    const r = await callLab(freshTok, {
      action: 'list_certificates',
      api_key: key,
      account_id: accountId.trim() || sessionStorage.getItem('dc_lab_acct') || null
    })
    if (r.ok) setCerts(r.certs || [])
    else setLoadError(r.error || 'Failed to load portfolio')
    setLoading(false)
  }, [tok, apiKey, accountId])

  useEffect(() => {
    if (connected && section === 'portfolio') loadPortfolio()
  }, [connected, section])

  const doReissue = async (cert) => {
    if (!confirm(`Request reissue for ${cert.common_name}?\n\nThis will call DigiCert API to start a reissue on order ${cert.order_id}. This is a READ OPERATION in sandbox — no cert will be affected unless you enable live mode.`)) return
    setWorking(true); setActionResult(null)
    const r = await callLab(tok, {
      action: 'request_reissue',
      api_key: apiKey.trim() || sessionStorage.getItem('dc_lab_key'),
      order_id: cert.order_id,
      domain: cert.common_name,
      sandbox: true
    })
    setActionResult({ type: 'reissue', cert: cert.common_name, ...r })
    setWorking(false)
  }

  const doRevokeInfo = async (cert) => {
    setSelectedCert(cert)
    setSection('revoke')
  }

  const doRevoke = async () => {
    if (!selectedCert) return
    if (!confirm(`⚠️ CONFIRM: Revoke cert for ${selectedCert.common_name}?\n\nThis is a LIVE operation if your API key has revoke permissions. Only proceed if you intend to revoke this certificate.`)) return
    setWorking(true); setActionResult(null)
    const r = await callLab(tok, {
      action: 'revoke_certificate',
      api_key: apiKey.trim() || sessionStorage.getItem('dc_lab_key'),
      certificate_id: selectedCert.certificate_id,
      reason: 'Superseded'
    })
    setActionResult({ type: 'revoke', cert: selectedCert.common_name, ...r })
    setWorking(false)
  }

  const downloadReport = async () => {
    setWorking(true)
    const r = await callLab(tok, {
      action: 'portfolio_report',
      api_key: apiKey.trim() || sessionStorage.getItem('dc_lab_key'),
      account_id: accountId.trim() || null
    })
    if (r.ok && r.csv) {
      const blob = new Blob([r.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `digicert-portfolio-${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } else {
      alert(r.error || 'Could not generate report')
    }
    setWorking(false)
  }

  // Derived stats
  const total    = certs.length
  const active   = certs.filter(c => c.status === 'issued').length
  const expiring = certs.filter(c => { const d = daysLeft(c.valid_till); return d !== null && d >= 0 && d <= 30 }).length
  const expired  = certs.filter(c => { const d = daysLeft(c.valid_till); return d !== null && d < 0 }).length
  const highPqc  = certs.filter(c => c.key_size === 2048 && (c.signature_hash || '').includes('sha256')).length

  // PQC bucket helper
  const pqcRisk = (c) => {
    if (!c.key_size) return 'unknown'
    if (c.key_size <= 2048) return 'high'
    if (c.key_size === 3072) return 'medium'
    if (c.key_size >= 4096) return 'low'
    return 'low'
  }

  const activeKey = apiKey.trim() || sessionStorage.getItem('dc_lab_key') || ''
  const isConnected = connected || !!activeKey

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 220, background: 'var(--v2-text)', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: 'var(--v2-surface)' }}>DC</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--v2-surface)' }}>DigiCert Lab</div>
              <div style={{ fontSize: 9, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Automation Sandbox</div>
            </div>
          </div>
          {isConnected && connInfo && (
            <div style={{ marginTop: 10, background: 'rgba(22,163,74,0.12)', border: '0.5px solid rgba(22,163,74,0.25)',
              borderRadius: 7, padding: '6px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a',
                  boxShadow: '0 0 0 2px rgba(22,163,74,0.2)' }}/>
                <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>Connected</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--v2-text-3)', marginTop: 2 }}>{connInfo.account_name || 'CertCentral'}</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id
            const disabled = id !== 'connect' && !isConnected
            return (
              <div key={id}
                onClick={() => !disabled && setSection(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                  borderRadius: 7, marginBottom: 2, cursor: disabled ? 'not-allowed' : 'pointer',
                  background: active ? 'rgba(220,38,38,0.15)' : 'transparent',
                  opacity: disabled ? 0.35 : 1, transition: 'all .15s' }}
                onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <Icon size={14} color={active ? '#f87171' : 'var(--v2-text-3)'}/>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 500,
                  color: active ? '#fca5a5' : '#9ca3af' }}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '12px 10px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          {isConnected && (
            <button onClick={disconnect}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: 'rgba(220,38,38,0.1)', color: '#f87171', fontSize: 11,
                fontWeight: 600, fontFamily: 'inherit' }}>
              <X size={12}/> Disconnect
            </button>
          )}
          <button onClick={() => nav('/integrations')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--v2-text-3)', fontSize: 11,
              fontFamily: 'inherit', marginTop: 4 }}>
            <ChevronRight size={12}/> Back to CA Connectors
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 960 }}>

        {/* ──────────────── CONNECT ──────────────── */}
        {section === 'connect' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>
                DigiCert CertCentral Lab
              </h1>
              <p style={{ fontSize: 13, color: 'var(--v2-text-3)', lineHeight: 1.6 }}>
                A sandboxed workspace to experiment with DigiCert API automation. Your existing RapidSSL certs and agents are completely unaffected.
              </p>
            </div>

            <div style={{ background: '#FDF0EE', border: '0.5px solid #F2C4BC', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <AlertTriangle size={14} color="#E8897A" style={{ flexShrink: 0, marginTop: 1 }}/>
              <div style={{ fontSize: 12, color: '#C45A4A', lineHeight: 1.6 }}>
                <strong>Sandbox mode.</strong> All read operations are live. Write operations (reissue, revoke) require explicit confirmation and will show exactly what API call is being made before executing.
              </div>
            </div>

            <Card style={{ padding: '20px 22px' }}>
              <SectionHead title="CertCentral API Credentials" sub="Stored in session memory only — never written to disk or database"/>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--v2-text-2)',
                  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
                  API Key <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={apiKeyVis ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connect()}
                    placeholder="Your CertCentral API key"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 36px 9px 12px',
                      borderRadius: 8, border: '1px solid var(--v2-border)', fontSize: 13,
                      fontFamily: 'inherit', outline: 'none', color: 'var(--v2-text)' }}/>
                  <button onClick={() => setApiKeyVis(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                    {apiKeyVis ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 4 }}>
                  Generate at: Settings → API Keys in CertCentral.{' '}
                  <a href="https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html"
                    target="_blank" rel="noopener"
                    style={{ color: '#1A7A72', textDecoration: 'none' }}>
                    Docs <ExternalLink size={9}/>
                  </a>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--v2-text-2)',
                  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
                  Account / Division ID <span style={{ color: 'var(--v2-text-3)', fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                </label>
                <input
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  placeholder="Leave blank for default account"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                    borderRadius: 8, border: '1px solid var(--v2-border)', fontSize: 13,
                    fontFamily: 'inherit', outline: 'none', color: 'var(--v2-text)' }}/>
              </div>

              {connError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2',
                  border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <AlertCircle size={13} color="#dc2626" style={{ flexShrink: 0 }}/>
                  <span style={{ fontSize: 12, color: '#b91c1c' }}>{connError}</span>
                </div>
              )}

              <button onClick={connect} disabled={connecting}
                style={{ width: '100%', padding: '11px', background: connecting ? 'var(--v2-text-3)' : '#dc2626',
                  color: 'var(--v2-surface)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: connecting ? 'wait' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {!tok
                  ? 'Sign in to SSLVault first'
                  : connecting
                  ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/> Connecting…</>
                  : <><Shield size={13}/> Connect to CertCentral</>}
              </button>
            </Card>

            {/* What you can do */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase',
                letterSpacing: '0.6px', marginBottom: 12 }}>What this lab lets you do</div>
              {[
                { icon: Activity,    color: '#1A7A72', label: 'Portfolio Overview',  desc: 'Pull all issued certs across your account. Count, status, expiry distribution.' },
                { icon: ShieldCheck, color: '#E8897A', label: 'PQC Risk Scanner',    desc: 'Flag every RSA-2048 cert with migration urgency. NIST 2030 deadline tracking.' },
                { icon: Clock,       color: '#E8897A', label: 'Expiry Risk Map',     desc: 'Visual timeline of certs expiring in 0–7d / 8–30d / 31–90d / 90d+.' },
                { icon: RotateCcw,   color: '#16a34a', label: 'Zero-touch Reissue',  desc: 'Trigger DigiCert reissue on OV/EV orders. Preview API call before executing.' },
                { icon: Trash2,      color: '#dc2626', label: 'Revoke & Replace',    desc: 'Revoke a compromised cert via API. Optionally issue RapidSSL replacement.' },
                { icon: FileText,    color: '#475569', label: 'Portfolio Report',    desc: 'Export full CSV: domain, product, expiry, key size, PQC risk, org.' },
              ].map(({ icon: Icon, color, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: '0.5px solid var(--v2-border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '12',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={color}/>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────── PORTFOLIO OVERVIEW ──────────────── */}
        {section === 'portfolio' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>Portfolio Overview</h1>
                <p style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>Live pull from DigiCert CertCentral — read only</p>
              </div>
              <button onClick={loadPortfolio} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)',
                  fontSize: 12, fontWeight: 600, color: 'var(--v2-text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <RefreshCw size={12} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/> Refresh
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total certs',    value: total,    color: '#1A7A72', bg: '#E8F8F6' },
                { label: 'Active',         value: active,   color: '#16a34a', bg: '#E8F8F6' },
                { label: 'Expiring ≤30d',  value: expiring, color: '#E8897A', bg: '#FDF0EE' },
                { label: 'RSA-2048 (PQC)', value: highPqc,  color: '#E8897A', bg: '#f5f3ff' },
              ].map(s => (
                <Card key={s.label} style={{ padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.4px', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.value > 0 ? s.color : '#0f172a',
                    letterSpacing: '-0.5px', lineHeight: 1 }}>{loading ? '…' : s.value}</div>
                </Card>
              ))}
            </div>

            {loadError && (
              <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8,
                padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8 }}>
                <AlertCircle size={14} color="#dc2626"/>
                <span style={{ fontSize: 12, color: '#b91c1c' }}>{loadError}</span>
              </div>
            )}

            {/* Cert table */}
            <Card>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--v2-border)',
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                background: '#fafbfc' }}>
                {['Domain', 'Product', 'Expires', 'Days left', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--v2-text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                ))}
              </div>
              {loading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
                  <RefreshCw size={16} style={{ animation: 'spin .8s linear infinite', marginBottom: 8, display: 'block', margin: '0 auto 8px' }}/>
                  Loading portfolio…
                </div>
              ) : certs.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
                  No certificates found. Check your API key permissions.
                </div>
              ) : certs.slice(0, 50).map((cert, i) => {
                const d = daysLeft(cert.valid_till)
                const risk = pqcRisk(cert)
                return (
                  <div key={cert.order_id || i}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      padding: '10px 16px', borderBottom: i < certs.length - 1 ? '0.5px solid #f8fafc' : 'none',
                      alignItems: 'center', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace',
                        color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cert.common_name}
                      </div>
                      {risk === 'high' && (
                        <div style={{ marginTop: 2 }}>
                          <Badge text="PQC ✗ RSA-2048" color="#E8897A" bg="#f5f3ff"/>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
                      {cert.product_name_id || cert.type || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{fmt(cert.valid_till)}</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusDot d={d}/>
                      <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
                        {d === null ? '—' : d < 0 ? 'Expired' : `${d}d`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setSelectedCert(cert); setSection('reissue') }}
                        title="Reissue"
                        style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                          background: '#E8F8F6', color: '#16a34a', border: '0.5px solid #A8E6DE',
                          cursor: 'pointer', fontFamily: 'inherit' }}>
                        Reissue
                      </button>
                      <button onClick={() => doRevokeInfo(cert)}
                        title="Revoke"
                        style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                          background: '#fef2f2', color: '#dc2626', border: '0.5px solid #fecaca',
                          cursor: 'pointer', fontFamily: 'inherit' }}>
                        Revoke
                      </button>
                    </div>
                  </div>
                )
              })}
              {certs.length > 50 && (
                <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--v2-text-3)', textAlign: 'center' }}>
                  Showing 50 of {certs.length} certificates
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ──────────────── PQC RISK SCANNER ──────────────── */}
        {section === 'pqc' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>PQC Risk Scanner</h1>
            <p style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 24 }}>Every certificate in your DigiCert portfolio scored against NIST PQC timeline. RSA-2048 must be migrated by 2030.</p>

            {certs.length === 0 ? (
              <Card style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--v2-text-3)' }}>Load portfolio first → Portfolio Overview</div>
              </Card>
            ) : (
              <>
                {/* Risk breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { risk:'high',   label:'High risk (RSA-2048)',    color:'#dc2626', bg:'#fef2f2', note:'Migrate by 2030' },
                    { risk:'medium', label:'Medium risk (RSA-3072)',  color:'#E8897A', bg:'#FDF0EE', note:'Plan migration' },
                    { risk:'low',    label:'Low risk (RSA-4096/EC)',  color:'#16a34a', bg:'#E8F8F6', note:'Monitor deadline' },
                  ].map(({ risk, label, color, bg, note }) => {
                    const count = certs.filter(c => pqcRisk(c) === risk).length
                    return (
                      <Card key={risk} style={{ padding: '16px', borderLeft: `4px solid ${color}` }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 6 }}>{count}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--v2-text-3)' }}>{note}</div>
                      </Card>
                    )
                  })}
                </div>

                {/* High-risk cert list */}
                {certs.filter(c => pqcRisk(c) === 'high').length > 0 && (
                  <Card>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--v2-border)',
                      display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={14} color="#dc2626"/>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {certs.filter(c => pqcRisk(c) === 'high').length} High-risk certificates — must migrate by 2030
                      </span>
                    </div>
                    {certs.filter(c => pqcRisk(c) === 'high').map((cert, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        padding: '10px 16px', borderBottom: '0.5px solid #f8fafc', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#0f172a' }}>{cert.common_name}</div>
                        <Badge text={`RSA-${cert.key_size || 2048}`} color="#E8897A" bg="#f5f3ff"/>
                        <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{fmt(cert.valid_till)}</div>
                        <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                          Migrate before 2030
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ──────────────── EXPIRY RISK MAP ──────────────── */}
        {section === 'expiry' && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>Expiry Risk Map</h1>
            <p style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 24 }}>Certificates bucketed by urgency. Load portfolio first if empty.</p>

            {certs.length === 0 ? (
              <Card style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--v2-text-3)' }}>Load portfolio first → Portfolio Overview</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: '🔴 Expired',        color: '#dc2626', bg: '#fef2f2', border: '#fecaca', filter: c => daysLeft(c.valid_till) !== null && daysLeft(c.valid_till) < 0 },
                  { label: '🟠 Expires in 0–7d',  color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', filter: c => { const d = daysLeft(c.valid_till); return d !== null && d >= 0 && d <= 7 } },
                  { label: '🟡 Expires in 8–30d', color: '#E8897A', bg: '#FDF0EE', border: '#F2C4BC', filter: c => { const d = daysLeft(c.valid_till); return d !== null && d > 7 && d <= 30 } },
                  { label: '🟢 Expires in 31–90d',color: '#16a34a', bg: '#E8F8F6', border: '#A8E6DE', filter: c => { const d = daysLeft(c.valid_till); return d !== null && d > 30 && d <= 90 } },
                  { label: '✅ Healthy (>90d)',   color: '#1A7A72', bg: '#E8F8F6', border: '#A8E6DE', filter: c => { const d = daysLeft(c.valid_till); return d !== null && d > 90 } },
                ].map(({ label, color, bg, border, filter }) => {
                  const bucket = certs.filter(filter)
                  if (!bucket.length) return null
                  return (
                    <Card key={label} style={{ border: `0.5px solid ${border}`, background: bg }}>
                      <div style={{ padding: '10px 16px', borderBottom: `0.5px solid ${border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                        <Badge text={`${bucket.length} cert${bucket.length !== 1 ? 's' : ''}`} color={color} bg="var(--v2-surface)"/>
                      </div>
                      <div style={{ padding: '8px 16px' }}>
                        {bucket.slice(0, 10).map((cert, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '5px 0', borderBottom: i < Math.min(bucket.length, 10) - 1 ? `0.5px solid ${border}` : 'none' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f172a' }}>{cert.common_name}</span>
                            <span style={{ fontSize: 11, color, fontWeight: 600 }}>{fmt(cert.valid_till)}</span>
                          </div>
                        ))}
                        {bucket.length > 10 && (
                          <div style={{ fontSize: 11, color: 'var(--v2-text-3)', paddingTop: 6 }}>
                            +{bucket.length - 10} more
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── ZERO-TOUCH REISSUE ──────────────── */}
        {section === 'reissue' && (
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>Zero-touch Reissue</h1>
            <p style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 20 }}>
              Trigger a DigiCert reissue via API. For OV/EV certs, org validation is already done — the API queues the reissue immediately.
            </p>

            <div style={{ background: '#FDF0EE', border: '0.5px solid #F2C4BC', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#C45A4A', lineHeight: 1.6 }}>
              <strong>Sandbox note:</strong> The preview below shows the exact API call that would be made. Toggle "Live mode" to execute it against your real DigiCert account.
            </div>

            {selectedCert ? (
              <Card style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#E8F8F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={16} color="#16a34a"/>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selectedCert.common_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>Order #{selectedCert.order_id} · expires {fmt(selectedCert.valid_till)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-2)', textTransform: 'uppercase',
                    letterSpacing: '0.4px', marginBottom: 6 }}>API call preview</div>
                  <div style={{ background: 'var(--v2-text)', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#e5e7eb', lineHeight: 1.6 }}>
                    <span style={{ color: '#60a5fa' }}>POST</span>{' '}
                    <span style={{ color: '#34d399' }}>https://www.digicert.com/services/v2</span>
                    <span style={{ color: '#fbbf24' }}>/order/certificate/{selectedCert.order_id}/reissue</span>
                    <br/>
                    <span style={{ color: 'var(--v2-text-3)' }}>X-DC-DEVKEY: </span>
                    <span style={{ color: '#E8897A' }}>{'*'.repeat(16)}…</span>
                    <br/><br/>
                    <span style={{ color: 'var(--v2-text-3)' }}>{`{ "certificate": { "common_name": "${selectedCert.common_name}", "dns_names": ["${selectedCert.common_name}"] } }`}</span>
                  </div>
                </div>

                {actionResult?.type === 'reissue' && (
                  <div style={{ marginBottom: 16, background: actionResult.ok ? '#E8F8F6' : '#fef2f2',
                    border: `0.5px solid ${actionResult.ok ? '#A8E6DE' : '#fecaca'}`,
                    borderRadius: 8, padding: '12px 14px', fontSize: 12,
                    color: actionResult.ok ? '#166534' : '#b91c1c' }}>
                    {actionResult.ok
                      ? `✓ Reissue queued — request ID: ${actionResult.request_id || 'pending'}`
                      : `✗ Error: ${actionResult.error}`}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setSelectedCert(null); setActionResult(null) }}
                    style={{ flex: 1, padding: '9px', border: '0.5px solid var(--v2-border)', borderRadius: 8,
                      background: 'var(--v2-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                    Cancel
                  </button>
                  <button onClick={() => doReissue(selectedCert)} disabled={working}
                    style={{ flex: 2, padding: '9px', background: working ? 'var(--v2-text-3)' : '#16a34a',
                      color: 'var(--v2-surface)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: working ? 'wait' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {working ? <><RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }}/> Working…</> : <><RotateCcw size={11}/> Execute Reissue</>}
                  </button>
                </div>
              </Card>
            ) : (
              <Card style={{ padding: '24px', textAlign: 'center' }}>
                <RotateCcw size={24} color="var(--v2-border)" style={{ marginBottom: 12 }}/>
                <div style={{ fontSize: 13, color: 'var(--v2-text-3)' }}>Select a cert from Portfolio Overview to reissue</div>
                <button onClick={() => setSection('portfolio')}
                  style={{ marginTop: 12, fontSize: 12, color: '#1A7A72', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Go to Portfolio →
                </button>
              </Card>
            )}
          </div>
        )}

        {/* ──────────────── REVOKE & REPLACE ──────────────── */}
        {section === 'revoke' && (
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>Revoke & Replace</h1>
            <p style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 20 }}>
              Revoke a compromised or expired DigiCert cert. Optionally issue a replacement RapidSSL DV cert through SSLVault.
            </p>

            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
              <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }}/>
              <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
                <strong>Live operation.</strong> Revocation is immediate and irreversible. The certificate will be revoked from DigiCert's trust store within minutes.
              </div>
            </div>

            {selectedCert ? (
              <Card style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fef2f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} color="#dc2626"/>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selectedCert.common_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
                      Certificate ID: {selectedCert.certificate_id || selectedCert.order_id} · expires {fmt(selectedCert.valid_till)}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-2)', textTransform: 'uppercase',
                    letterSpacing: '0.4px', marginBottom: 6 }}>API call that will be executed</div>
                  <div style={{ background: 'var(--v2-text)', borderRadius: 8, padding: '12px 14px',
                    fontFamily: 'monospace', fontSize: 11, color: '#e5e7eb', lineHeight: 1.6 }}>
                    <span style={{ color: '#60a5fa' }}>PUT</span>{' '}
                    <span style={{ color: '#34d399' }}>https://www.digicert.com/services/v2</span>
                    <span style={{ color: '#f87171' }}>/certificate/{selectedCert.certificate_id || '{cert_id}'}/revoke</span>
                    <br/>
                    <span style={{ color: 'var(--v2-text-3)' }}>{`{ "skip_approval": true, "reason": "Superseded" }`}</span>
                  </div>
                </div>

                {actionResult?.type === 'revoke' && (
                  <div style={{ marginBottom: 16, background: actionResult.ok ? '#E8F8F6' : '#fef2f2',
                    border: `0.5px solid ${actionResult.ok ? '#A8E6DE' : '#fecaca'}`,
                    borderRadius: 8, padding: '12px 14px', fontSize: 12,
                    color: actionResult.ok ? '#166534' : '#b91c1c' }}>
                    {actionResult.ok
                      ? `✓ Certificate revoked. Now issue a replacement via SSLVault.`
                      : `✗ Error: ${actionResult.error}`}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginBottom: actionResult?.ok ? 12 : 0 }}>
                  <button onClick={() => { setSelectedCert(null); setActionResult(null) }}
                    style={{ flex: 1, padding: '9px', border: '0.5px solid var(--v2-border)', borderRadius: 8,
                      background: 'var(--v2-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
                    Cancel
                  </button>
                  <button onClick={doRevoke} disabled={working || actionResult?.ok}
                    style={{ flex: 2, padding: '9px', background: working ? 'var(--v2-text-3)' : '#dc2626',
                      color: 'var(--v2-surface)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: working || actionResult?.ok ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {working ? <><RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }}/> Revoking…</> : <><Trash2 size={11}/> Revoke Certificate</>}
                  </button>
                </div>

                {actionResult?.ok && (
                  <button onClick={() => {
                    sessionStorage.setItem('prefill_domain', selectedCert.common_name)
                    nav('/buy')
                  }}
                    style={{ width: '100%', padding: '10px', background: '#16a34a', color: 'var(--v2-surface)',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Shield size={12}/> Issue replacement via SSLVault →
                  </button>
                )}
              </Card>
            ) : (
              <Card style={{ padding: '24px', textAlign: 'center' }}>
                <Trash2 size={24} color="var(--v2-border)" style={{ marginBottom: 12 }}/>
                <div style={{ fontSize: 13, color: 'var(--v2-text-3)' }}>Select a cert from Portfolio Overview to revoke</div>
                <button onClick={() => setSection('portfolio')}
                  style={{ marginTop: 12, fontSize: 12, color: '#1A7A72', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Go to Portfolio →
                </button>
              </Card>
            )}
          </div>
        )}

        {/* ──────────────── PORTFOLIO REPORT ──────────────── */}
        {section === 'reports' && (
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', marginBottom: 4 }}>Portfolio Report</h1>
            <p style={{ fontSize: 12, color: 'var(--v2-text-3)', marginBottom: 24 }}>
              Export your full DigiCert portfolio as CSV — domain, product, expiry, key size, PQC risk, organisation.
            </p>

            <Card style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--v2-text-2)', textTransform: 'uppercase',
                  letterSpacing: '0.4px', marginBottom: 8 }}>CSV columns included</div>
                {[
                  'Domain (common name)', 'Order ID', 'Product name', 'Status',
                  'Valid from', 'Valid till', 'Days left', 'Key algorithm',
                  'Key size', 'PQC risk level', 'Organisation', 'Serial number'
                ].map(col => (
                  <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 0', fontSize: 12, color: 'var(--v2-text-2)' }}>
                    <Check size={11} color="#16a34a" style={{ flexShrink: 0 }}/>{col}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16, background: 'var(--v2-bg)', border: '0.5px solid var(--v2-border)',
                borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  {certs.length > 0 ? `${certs.length} certificates ready to export` : 'Load portfolio first to generate report'}
                </div>
                {certs.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
                    {certs.filter(c => pqcRisk(c) === 'high').length} high PQC risk ·{' '}
                    {certs.filter(c => { const d = daysLeft(c.valid_till); return d !== null && d <= 30 && d >= 0 }).length} expiring within 30 days
                  </div>
                )}
              </div>

              <button onClick={downloadReport} disabled={working || certs.length === 0}
                style={{ width: '100%', padding: '11px', background: working || certs.length === 0 ? 'var(--v2-text-3)' : '#0f172a',
                  color: 'var(--v2-surface)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: working || certs.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {working
                  ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/> Generating…</>
                  : <><Download size={13}/> Download CSV Report</>}
              </button>
            </Card>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
// Sun May 17 10:21:26 UTC 2026
