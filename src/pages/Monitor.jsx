import { useState, useEffect } from 'react'
import {
  Shield, Plus, RefreshCw, Trash2, Bell, AlertTriangle, Globe, Search,
  Download, ExternalLink, Eye, ArrowRight, X, Lock, Activity, Filter,
  ChevronRight, AlertCircle, Check, Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, formatDistanceToNow, format } from 'date-fns'

// ── Status helpers ───────────────────────────────────────────────────
function statusOf(days, revoked) {
  if (revoked)         return { key: 'revoked',  label: 'Revoked',       cls: 'red',   tone: 'v2-status-grey' }
  if (days == null)    return { key: 'pending',  label: 'Not scanned',   cls: 'grey',  tone: 'v2-status-grey' }
  if (days < 0)        return { key: 'expired',  label: 'Expired',       cls: 'red',   tone: 'v2-status-amber' }
  if (days < 14)       return { key: 'critical', label: `${days}d left`, cls: 'amber', tone: 'v2-status-amber' }
  if (days < 30)       return { key: 'soon',     label: `${days}d left`, cls: 'amber', tone: 'v2-status-amber' }
  return                      { key: 'healthy',  label: `${days}d left`, cls: 'green', tone: 'v2-status-green' }
}

function StatusPill({ days, revoked }) {
  const s = statusOf(days, revoked)
  return (
    <span className={`v2-status v2-status-${s.cls === 'green' ? 'green' : s.cls === 'amber' ? 'amber' : 'grey'}`}>
      <span className={`v2-dot v2-dot-${s.cls === 'green' ? 'green' : s.cls === 'amber' ? 'amber' : 'grey'}`} />
      {s.label}
    </span>
  )
}

function ProgressBar({ days, max = 90 }) {
  const pct = days == null ? 0 : Math.max(0, Math.min(100, (days / max) * 100))
  const cls = days == null ? '' : days < 0 ? 'red' : days < 14 ? 'red' : days < 30 ? 'amber' : ''
  return (
    <div className="v2-bar">
      <div className={`v2-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Add monitor modal ────────────────────────────────────────────────
function AddModal({ onAdd, onClose }) {
  const [domain, setDomain] = useState('')
  const [threshold, setThreshold] = useState(30)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const handleAdd = async () => {
    if (!domain.trim()) return
    setSaving(true); setError('')
    const err = await onAdd(domain.trim(), threshold)
    if (err) setError(err)
    setSaving(false)
  }
  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal" style={{ maxWidth: 440 }}>
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">Monitor a domain</div>
            <div className="v2-modal-subtitle">Track SSL expiry on any public domain</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="v2-modal-body">
          <div style={{ marginBottom: 14 }}>
            <label className="v2-label">Domain name</label>
            <input
              className="v2-input"
              placeholder="example.com or api.example.com"
              value={domain}
              onChange={e => setDomain(e.target.value.replace(/^https?:\/\//, '').replace(/\/.*/, ''))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div className="v2-label-help">We'll track this domain's SSL certificate expiry</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="v2-label">Alert threshold</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[7, 14, 30, 60].map(d => (
                <button key={d}
                        className={`v2-filter-chip ${threshold === d ? 'active' : ''}`}
                        onClick={() => setThreshold(d)}>
                  {d} days
                </button>
              ))}
            </div>
            <div className="v2-label-help">Alert when certificate expires within {threshold} days</div>
          </div>
          {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 8 }}>
            <AlertCircle size={13} /> <span>{error}</span>
          </div>}
        </div>
        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-primary" onClick={handleAdd} disabled={saving || !domain.trim()}>
            {saving ? 'Adding…' : <><Plus size={13} strokeWidth={2.2} /> Add domain</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cert detail modal ────────────────────────────────────────────────
function CertDetailModal({ cert, onClose, onRenew }) {
  const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }
  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal" style={{ maxWidth: 540 }}>
        <div className="v2-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#eff6ff', border: '0.5px solid #bfdbfe',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} strokeWidth={1.8} color="#2563eb" />
            </div>
            <div>
              <div className="v2-modal-title v2-mono">{cert.domain}</div>
              <div className="v2-modal-subtitle">
                <StatusPill days={days} revoked={cert.status === 'revoked'} />
              </div>
            </div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="v2-modal-body">
          <table className="v2-table" style={{ marginBottom: 14 }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--v2-text-3)', width: 110 }}>Domain</td>
                <td className="v2-mono" style={{ fontWeight: 500 }}>{cert.domain}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Status</td>
                <td>{days >= 0 ? `Active — ${days} days remaining` : `Expired ${Math.abs(days)} days ago`}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Issued</td>
                <td>{cert.issued_at ? format(new Date(cert.issued_at), 'PPP pp') : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Expires</td>
                <td>{cert.expires_at ? format(new Date(cert.expires_at), 'PPP') : '—'}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--v2-text-3)', marginBottom: 6 }}>
              <span>Certificate health</span>
              <span style={{ fontWeight: 500, color: days < 14 ? 'var(--v2-red-text)' : days < 30 ? 'var(--v2-amber-text)' : 'var(--v2-green-text)' }}>
                {days > 0 ? `${days} days left` : `Expired ${Math.abs(days)} days ago`}
              </span>
            </div>
            <ProgressBar days={days} />
          </div>

          {(cert.cert_pem || cert.private_key_pem) && (
            <div style={{ marginBottom: 14 }}>
              <div className="v2-section-label" style={{ marginBottom: 8 }}>Download files</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cert.cert_pem && <button className="v2-btn" onClick={() => download(cert.cert_pem, `${cert.domain}-cert.pem`)}><Download size={11} /> cert.pem</button>}
                {cert.private_key_pem && <button className="v2-btn" onClick={() => download(cert.private_key_pem, `${cert.domain}-key.pem`)}><Download size={11} /> key.pem</button>}
                {cert.cert_pem && <button className="v2-btn" onClick={() => download(cert.cert_pem, `${cert.domain}-fullchain.pem`)}><Download size={11} /> fullchain.pem</button>}
              </div>
            </div>
          )}
        </div>
        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Close</button>
          <button className="v2-btn v2-btn-primary" onClick={() => onRenew(cert.domain)}>
            <RefreshCw size={11} /> Request new certificate
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Monitored domain row ─────────────────────────────────────────────
function MonitoredRow({ m, onScan, onDelete, onRequestCert, scanning }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const daysLeft = m.last_days_left
  const hasScanned = m.last_scanned_at
  const cls = !hasScanned ? 'grey' : daysLeft < 0 ? 'amber' : daysLeft < 14 ? 'amber' : 'green'

  const scan = async () => {
    setLoading(true)
    await onScan(m.domain)
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)', overflow: 'hidden' }}>
      <div className={`v2-list-row status-${cls}`} style={{ borderBottom: 'none' }}
           onClick={() => hasScanned && setExpanded(e => !e)}>
        <div style={{
          width: 32, height: 32, borderRadius: 6, background: 'var(--v2-surface-3)',
          border: '0.5px solid var(--v2-border)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Globe size={15} strokeWidth={1.8} color="var(--v2-text-2)" />
        </div>
        <div className="v2-row-body">
          <div className="v2-row-title-line">
            <span className="v2-row-title v2-mono">{m.domain}</span>
            {hasScanned ? (
              <StatusPill days={daysLeft} />
            ) : (
              <span className="v2-status v2-status-grey">
                <span className="v2-dot v2-dot-grey" /> Not scanned yet
              </span>
            )}
          </div>
          <div className="v2-row-meta">
            <span style={{ fontSize: 11 }}>Alert at {m.alert_threshold_days} days</span>
            <span className="v2-row-meta-sep">·</span>
            <span style={{ fontSize: 11 }}>
              {hasScanned
              ? `Last scanned ${formatDistanceToNow(new Date(m.last_scanned_at), { addSuffix: true })}${m.scan_source === 'ct-log' ? ' · CT log' : m.scan_source === 'live-tls' ? ' · Live TLS' : ''}`
              : 'Click Scan to check'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="v2-btn v2-btn-sm" onClick={scan} disabled={loading || scanning}>
            <RefreshCw size={11} strokeWidth={2} className={loading || scanning ? 'spin' : ''} />
            {loading || scanning ? 'Scanning' : 'Scan'}
          </button>
          <a href={`https://${m.domain}`} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn-sm" style={{ textDecoration: 'none' }}>
            <ExternalLink size={11} strokeWidth={2} />
          </a>
          <button className="v2-btn v2-btn-danger v2-btn-sm" onClick={() => onDelete(m.id)}>
            <Trash2 size={11} strokeWidth={2} />
          </button>
        </div>
      </div>

      {expanded && hasScanned && (
        <div style={{ borderTop: '0.5px solid var(--v2-border)', padding: 16, background: 'var(--v2-surface-2)' }}>
          <table className="v2-table" style={{ marginBottom: 12, background: 'transparent' }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--v2-text-3)', width: 130 }}>Days remaining</td>
                <td style={{ fontWeight: 500 }}>{daysLeft != null ? `${daysLeft} days` : 'Unknown'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Cert start</td>
                <td>{m.cert_start ? format(new Date(m.cert_start), 'MMM d, yyyy') : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Cert expiry</td>
                <td>{m.cert_expiry ? format(new Date(m.cert_expiry), 'MMM d, yyyy') : '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Issuer</td>
                <td>{m.issuer || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--v2-text-3)' }}>Last scanned</td>
                <td>{m.last_scanned_at ? format(new Date(m.last_scanned_at), 'MMM d, yyyy HH:mm') : '—'}</td>
              </tr>
            </tbody>
          </table>

          {daysLeft != null && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--v2-text-3)', marginBottom: 4 }}>
                <span>Certificate health</span>
                <span style={{ fontWeight: 500, color: daysLeft < 14 ? 'var(--v2-red-text)' : daysLeft < 30 ? 'var(--v2-amber-text)' : 'var(--v2-green-text)' }}>
                  {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                </span>
              </div>
              <ProgressBar days={daysLeft} />
            </div>
          )}

          {m.scan_source === 'ct-log' && (
            <div className="v2-callout warning" style={{ marginBottom: 12, fontSize: 11 }}>
              <div className="v2-callout-title" style={{ fontSize: 11 }}>CT log data — not a live scan</div>
              Live TLS connection to this server failed. The dates shown are from Certificate Transparency logs
              and reflect a recently issued certificate, but may not match what is currently installed on the server.
              Try scanning again — if it keeps failing, check the domain is publicly reachable on port 443.
            </div>
          )}
          <button className="v2-btn v2-btn-primary" style={{ fontSize: 12 }} onClick={() => onRequestCert(m.domain)}>
            <Shield size={12} strokeWidth={2.2} /> Request new certificate <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Public scanner (logged-out) ──────────────────────────────────────
function PublicScan({ nav }) {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const runScan = async () => {
    const cleaned = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!cleaned) { setError('Please enter a domain'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleaned, public: true })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult({ ...data, domain: cleaned })
    } catch (e) {
      setError('Could not reach the scanner. Try again in a moment.')
    }
    setLoading(false)
  }

  const days = result?.daysLeft ?? null
  const status = days == null ? null : days < 0 ? 'expired' : days < 14 ? 'critical' : days < 30 ? 'soon' : 'healthy'
  const statusLabel = status === 'healthy' ? 'Healthy' : status === 'soon' ? 'Renew soon' : status === 'critical' ? 'Expiring' : status === 'expired' ? 'Expired' : ''
  const statusCls = status === 'healthy' ? 'green' : status === 'expired' ? 'red' : 'amber'

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 720, paddingTop: 56 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="v2-h1" style={{ fontSize: 30, letterSpacing: '-0.6px', marginBottom: 8 }}>
            Check any domain's SSL certificate
          </h1>
          <p className="v2-subtitle" style={{ fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
            Get expiry dates, issuer details and TLS health for any public domain in seconds.
            Sign in to save domains and get email alerts before they expire.
          </p>
        </div>

        <div className="v2-card" style={{ padding: 6, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
            <Search size={15} strokeWidth={2} style={{ color: 'var(--v2-text-3)' }} />
            <input
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runScan()}
              autoFocus
              style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 0', fontSize: 14, fontFamily: 'inherit', color: 'var(--v2-text)', background: 'transparent' }}
            />
          </div>
          <button onClick={runScan} disabled={loading} className="v2-btn v2-btn-primary" style={{ padding: '10px 16px' }}>
            {loading ? 'Scanning…' : <>Scan SSL <ArrowRight size={12} /></>}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--v2-text-3)', textAlign: 'center', marginBottom: 28 }}>
          Try{' '}
          <span onClick={() => setDomain('github.com')} style={{ color: 'var(--v2-text)', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 2 }}>github.com</span>
          {' · '}
          <span onClick={() => setDomain('vercel.com')} style={{ color: 'var(--v2-text)', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 2 }}>vercel.com</span>
          {' · or any domain'}
        </p>

        {error && (
          <div className="v2-alert v2-alert-error" style={{ marginBottom: 18 }}>
            <AlertCircle size={13} /> <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="v2-card" style={{ padding: 18, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '0.5px solid var(--v2-border)', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={16} strokeWidth={1.8} color="#2563eb" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="v2-mono" style={{ fontWeight: 500, fontSize: 13, color: 'var(--v2-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.domain}
                </div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 2 }}>{result.issuer || 'Issuer unknown'}</div>
              </div>
              <span className={`v2-status v2-status-${statusCls === 'green' ? 'green' : 'amber'}`}>
                <span className={`v2-dot v2-dot-${statusCls === 'green' ? 'green' : 'amber'}`} />
                {statusLabel}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
              <div className="v2-stat" style={{ padding: '10px 12px' }}>
                <div className="v2-stat-label">Days left</div>
                <div className="v2-stat-value" style={{ fontSize: 18 }}>{days != null ? days : '—'}</div>
              </div>
              <div className="v2-stat" style={{ padding: '10px 12px' }}>
                <div className="v2-stat-label">Reachable</div>
                <div className="v2-stat-value" style={{ fontSize: 18, color: result.alive ? 'var(--v2-green-text)' : 'var(--v2-red-text)' }}>
                  {result.alive ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            <table className="v2-table" style={{ marginBottom: 14 }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--v2-text-3)', width: 90 }}>Issued</td>
                  <td style={{ fontWeight: 500 }}>{result.certStart ? format(new Date(result.certStart), 'MMM d, yyyy') : '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--v2-text-3)' }}>Expires</td>
                  <td style={{ fontWeight: 500 }}>{result.certExpiry ? format(new Date(result.certExpiry), 'MMM d, yyyy') : '—'}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--v2-text-3)' }}>Issuer</td>
                  <td style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.issuer || '—'}</td>
                </tr>
              </tbody>
            </table>

            <button onClick={() => nav('/auth')} className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
              <Bell size={13} strokeWidth={2.2} /> Sign in to monitor this domain
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { Icon: Bell,      title: 'Expiry alerts',    desc: 'Email warnings at 30, 14 and 7 days.' },
            { Icon: Globe,     title: 'Bulk monitoring',  desc: 'Track all your domains in one inventory.' },
            { Icon: RefreshCw, title: 'One-click renewal',desc: 'Renew expiring certs without re-validation.' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="v2-card v2-card-pad">
              <div className="v2-icontile" style={{ marginBottom: 10 }}>
                <Icon size={14} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-2)', lineHeight: 1.55 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page (logged-in) ────────────────────────────────────────────
export default function Monitor({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [monitored, setMonitored] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedCert, setSelectedCert] = useState(null)
  const [scanning, setScanning] = useState({})
  const [sortBy, setSortBy] = useState('expires')
  const [bulkScanning, setBulkScanning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')

  useEffect(() => {
    if (!authLoading && user) loadAll()
    if (!authLoading && !user) setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    const { data: certsData } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    const { data: ordersData } = await supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'issued').order('updated_at', { ascending: false })
    const certSessions = new Set((certsData || []).map(c => c.session_id))
    const ordersAsCerts = (ordersData || []).filter(o => !certSessions.has(o.session_id)).map(o => ({
      id: o.id, user_id: o.user_id, session_id: o.session_id,
      domain: o.domain, cert_pem: o.cert_pem, private_key_pem: o.priv_key,
      issued_at: o.updated_at, expires_at: o.expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    }))
    const { data: monData } = await supabase.from('monitored_domains').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCerts([...(certsData || []), ...ordersAsCerts])
    setMonitored(monData || [])
    setLoading(false)
  }

  const addMonitored = async (domain, threshold) => {
    if (!user?.id) return
    const { error } = await supabase.from('monitored_domains').upsert({
      user_id: user.id, domain, alert_threshold_days: threshold,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,domain' })
    if (error) return error.message || 'Failed to add domain'
    setShowAdd(false)
    await loadAll()
    return null
  }

  const removeMonitored = async (id) => {
    if (!confirm('Remove this domain from monitoring?')) return
    await supabase.from('monitored_domains').delete().eq('id', id)
    setMonitored(m => m.filter(x => x.id !== id))
  }

  const scanDomain = async (domain) => {
    setScanning(s => ({ ...s, [domain]: true }))
    try {
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, user_id: user.id, session_id: user.id + '_' + domain })
      })
      const data = await res.json()
      if (!data.error) {
        setMonitored(m => m.map(item =>
          item.domain === domain ? {
            ...item,
            last_scanned_at: data.scannedAt,
            last_alive: data.alive,
            last_days_left: data.daysLeft,
            cert_start: data.certStart,
            cert_expiry: data.certExpiry,
            issuer: data.issuer,
            scan_source: data.source,
          } : item
        ))
      }
    } catch (e) {
      console.error('Scan error:', e)
    }
    setScanning(s => ({ ...s, [domain]: false }))
  }

  const bulkScan = async () => {
    if (!monitored.length) return
    setBulkScanning(true)
    setBulkProgress(`Scanning ${monitored.length} domain${monitored.length === 1 ? '' : 's'}…`)
    try {
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, user_id: user.id })
      })
      const data = await res.json()
      if (data.ok) {
        setBulkProgress(`Scanned ${data.scanned} domains`)
        await loadAll()
        setTimeout(() => setBulkProgress(''), 3000)
      }
    } catch (e) {
      setBulkProgress('Scan failed')
      setTimeout(() => setBulkProgress(''), 3000)
    }
    setBulkScanning(false)
  }

  const requestCertForDomain = (domain) => {
    sessionStorage.setItem('prefill_domain', domain)
    window.location.href = '/generate'
  }

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate?')) return
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }

  const getStatus = (cert) => {
    const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
    if (days < 0) return 'expired'
    if (days < 14) return 'expiring'
    return 'active'
  }

  const filteredCerts = certs
    .filter(c => {
      if (search && !c.domain?.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'active') return getStatus(c) === 'active'
      if (filter === 'expiring') return getStatus(c) === 'expiring'
      if (filter === 'expired') return getStatus(c) === 'expired'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'expires') return new Date(a.expires_at || 0) - new Date(b.expires_at || 0)
      if (sortBy === 'domain') return (a.domain || '').localeCompare(b.domain || '')
      return new Date(b.issued_at || 0) - new Date(a.issued_at || 0)
    })

  const stats = {
    total: certs.length,
    active: certs.filter(c => getStatus(c) === 'active').length,
    expiring: certs.filter(c => getStatus(c) === 'expiring').length,
    expired: certs.filter(c => getStatus(c) === 'expired').length,
  }

  if (!authLoading && !user) return <PublicScan nav={nav} />

  return (
    <div className="v2-page">
      <div className="v2-container">
        {showAdd && <AddModal onAdd={addMonitored} onClose={() => setShowAdd(false)} />}
        {selectedCert && <CertDetailModal cert={selectedCert} onClose={() => setSelectedCert(null)} onRenew={requestCertForDomain} />}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="v2-h1">Certificate monitor</h1>
            <p className="v2-subtitle">
              {stats.total} certificate{stats.total === 1 ? '' : 's'} ·{' '}
              {monitored.length} monitored domain{monitored.length === 1 ? '' : 's'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="v2-btn" onClick={() => setShowAdd(true)}>
              <Plus size={13} strokeWidth={2.2} /> Monitor domain
            </button>
            <button className="v2-btn v2-btn-primary" onClick={() => window.location.href = '/generate'}>
              <Plus size={13} strokeWidth={2.2} /> New certificate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '20px 0' }}>
          <div className="v2-stat">
            <div className="v2-stat-label">Total</div>
            <div className="v2-stat-value">{stats.total}</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-label">Active</div>
            <div className="v2-stat-value" style={{ color: stats.active > 0 ? 'var(--v2-green-text)' : 'var(--v2-text)' }}>{stats.active}</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-label">Expiring</div>
            <div className="v2-stat-value" style={{ color: stats.expiring > 0 ? 'var(--v2-amber-text)' : 'var(--v2-text)' }}>{stats.expiring}</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-label">Expired</div>
            <div className="v2-stat-value" style={{ color: stats.expired > 0 ? 'var(--v2-red-text)' : 'var(--v2-text)' }}>{stats.expired}</div>
          </div>
        </div>

        {/* Alerts */}
        {stats.expiring > 0 && (
          <div className="v2-callout warning" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={14} strokeWidth={2} />
            <span style={{ flex: 1 }}>
              <strong>{stats.expiring} certificate{stats.expiring > 1 ? 's' : ''}</strong> expiring within 14 days.
            </span>
            <button className="v2-btn v2-btn-sm" onClick={() => setFilter('expiring')}>View</button>
          </div>
        )}
        {stats.expired > 0 && (
          <div className="v2-callout error" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} strokeWidth={2} />
            <span style={{ flex: 1 }}>
              <strong>{stats.expired} certificate{stats.expired > 1 ? 's' : ''}</strong> already expired. Renew immediately.
            </span>
            <button className="v2-btn v2-btn-sm" onClick={() => setFilter('expired')}>View</button>
          </div>
        )}

        {/* Issued certificates */}
        <div className="v2-card" style={{ marginTop: 18, marginBottom: 18 }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text)', margin: 0 }}>Issued certificates</h2>
              {filteredCerts.length > 0 && <span className="v2-chip">{filteredCerts.length}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} strokeWidth={2} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-3)' }} />
                <input
                  className="v2-input"
                  placeholder="Search domain"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 26, width: 180, fontSize: 12, padding: '6px 10px 6px 26px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 0, background: '#f4f4f3', borderRadius: 6, padding: 2 }}>
                {[['all', 'All'], ['active', 'Active'], ['expiring', 'Expiring'], ['expired', 'Expired']].map(([v, l]) => (
                  <button key={v}
                          className={`v2-filter-chip ${filter === v ? 'active' : ''}`}
                          onClick={() => setFilter(v)}>
                    {l}
                  </button>
                ))}
              </div>
              <select className="v2-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 26px 6px 10px', fontSize: 12 }}>
                <option value="expires">By expiry</option>
                <option value="domain">By domain</option>
                <option value="issued">By issued</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: 'var(--v2-text-2)' }}>
              Loading…
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="v2-empty">
              <div className="v2-empty-icon"><Shield size={26} strokeWidth={1.6} /></div>
              <div className="v2-empty-title">{search || filter !== 'all' ? 'No certificates match your filter' : 'No certificates yet'}</div>
              {!search && filter === 'all' && (
                <>
                  <div className="v2-empty-desc">Issue your first 90-day SSL certificate in under a minute. Free from Let's Encrypt.</div>
                  <button className="v2-btn v2-btn-primary" onClick={() => window.location.href = '/generate'}>
                    <Plus size={13} strokeWidth={2.2} /> Generate your first certificate
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {filteredCerts.map(cert => {
                const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
                const isRevoked = cert.status === 'revoked'
                const cls = isRevoked ? 'grey' : days < 0 ? 'amber' : days < 14 ? 'amber' : 'green'
                return (
                  <div key={cert.id} className={`v2-list-row status-${cls}`} onClick={() => setSelectedCert(cert)}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Shield size={15} strokeWidth={1.8} color="var(--v2-text-2)" />
                    </div>
                    <div className="v2-row-body">
                      <div className="v2-row-title-line">
                        <span className="v2-row-title v2-mono">{cert.domain}</span>
                        <StatusPill days={days} revoked={isRevoked} />
                      </div>
                      <div className="v2-row-meta">
                        <span style={{ fontSize: 11 }}>
                          Issued {cert.issued_at ? formatDistanceToNow(new Date(cert.issued_at), { addSuffix: true }) : '—'}
                        </span>
                        <span className="v2-row-meta-sep">·</span>
                        <span style={{ fontSize: 11 }}>
                          Expires {cert.expires_at ? format(new Date(cert.expires_at), 'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, maxWidth: 260 }}>
                        <ProgressBar days={days} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="v2-btn v2-btn-sm" onClick={() => setSelectedCert(cert)}>
                        <Eye size={11} strokeWidth={2} /> View
                      </button>
                      {cert.cert_pem && (
                        <button className="v2-btn v2-btn-sm" onClick={() => download(cert.cert_pem, `${cert.domain}-cert.pem`)}>
                          <Download size={11} strokeWidth={2} />
                        </button>
                      )}
                      <button className="v2-btn v2-btn-sm" onClick={() => requestCertForDomain(cert.domain)}>
                        <RefreshCw size={11} strokeWidth={2} /> Renew
                      </button>
                      <button className="v2-btn v2-btn-danger v2-btn-sm" onClick={() => deleteCert(cert.id)}>
                        <Trash2 size={11} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Monitored domains */}
        <div className="v2-card">
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text)', margin: 0 }}>Monitored domains</h2>
                {monitored.length > 0 && <span className="v2-chip">{monitored.length}</span>}
              </div>
              <p style={{ fontSize: 11, color: 'var(--v2-text-3)', margin: '2px 0 0' }}>Track SSL certificates on any external domain</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {bulkProgress && <span style={{ fontSize: 11, color: 'var(--v2-text-2)', fontWeight: 500 }}>{bulkProgress}</span>}
              {monitored.length > 0 && (
                <button className="v2-btn v2-btn-sm" onClick={bulkScan} disabled={bulkScanning}>
                  <RefreshCw size={11} strokeWidth={2} className={bulkScanning ? 'spin' : ''} />
                  {bulkScanning ? 'Scanning all…' : 'Scan all'}
                </button>
              )}
              <button className="v2-btn v2-btn-sm" onClick={() => setShowAdd(true)}>
                <Plus size={11} strokeWidth={2.2} /> Add domain
              </button>
            </div>
          </div>

          {monitored.length === 0 ? (
            <div className="v2-empty">
              <div className="v2-empty-icon"><Globe size={26} strokeWidth={1.6} /></div>
              <div className="v2-empty-title">No domains monitored yet</div>
              <div className="v2-empty-desc">Add any domain to track its SSL certificate expiry. Get email alerts at 7, 14 or 30 days before expiry.</div>
              <button className="v2-btn v2-btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={13} strokeWidth={2.2} /> Add your first domain
              </button>
            </div>
          ) : (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monitored.map(m => (
                <MonitoredRow
                  key={m.id}
                  m={m}
                  onScan={scanDomain}
                  onDelete={removeMonitored}
                  onRequestCert={requestCertForDomain}
                  scanning={scanning[m.domain]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .spin { animation: v2-spin 0.8s linear infinite; }
        @keyframes v2-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
