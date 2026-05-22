import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Download, RefreshCw, ShieldCheck, Copy, FileDown, ChevronRight, Globe, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const SYNC_FN = `${SUPABASE_URL}/functions/v1/ccadb-sync`
const PAGE_SIZE = 50

const STORE_META = {
  Chrome:    { icon: '🌐', color: '#1d4ed8' },
  Mozilla:   { icon: '🦊', color: '#ea580c' },
  Apple:     { icon: '🍎', color: '#374151' },
  Microsoft: { icon: '🪟', color: '#0369a1' },
}

const ALL_STORES = ['Chrome', 'Mozilla', 'Apple', 'Microsoft']

// ── Helpers ───────────────────────────────────────────────────────────
const scoreColor = (n) =>
  n == null ? 'var(--v2-text-3)'
  : n >= 80  ? 'var(--v2-green-text)'
  : n >= 50  ? 'var(--v2-amber-text)'
  :            'var(--v2-red-text)'

const scoreClass = (n) =>
  n == null ? '' : n >= 80 ? '' : n >= 50 ? ' amber' : ' red'

const statusRowClass = (s) =>
  s === 'Active' ? 'status-green' : s === 'Revoked' || s === 'Distrusted' ? 'status-red' : 'status-amber'

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

const avatarColor = (name = '') => {
  const colors = ['#2563eb','#0369a1','#0e7fc0','#16a34a','#dc2626','#7c3aed','#ea580c','#0891b2','#b45309','#374151']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

const initials = (name = '') => {
  const w = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/)
  if (w.length >= 2) return (w[0][0] + w[w.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function computeScore(cert) {
  if (!cert) return null
  let s = 100
  const algo = (cert.key_algorithm || '').toLowerCase()
  const sig = (cert.signature_hash_algorithm || '').toLowerCase()
  const status = cert.status || ''
  const validTo = cert.valid_to ? new Date(cert.valid_to) : null
  const now = new Date()

  if (sig.includes('sha1') || sig.includes('md5')) s -= 40
  if (algo.includes('rsa')) {
    const bits = parseInt((cert.public_key_size || '0').replace(/[^0-9]/g, ''))
    if (bits > 0 && bits < 2048) s -= 30
  }
  if (status === 'Revoked' || status === 'Distrusted') s -= 60
  if (validTo) {
    const days = (validTo - now) / 86400000
    if (days < 0) s -= 30
    else if (days < 90) s -= 15
    else if (days < 365) s -= 5
  }
  const stores = cert.mozilla_trusted || cert.microsoft_trusted || cert.apple_trusted || cert.chrome_trusted
  if (!stores) s -= 10
  return Math.max(0, Math.min(100, s))
}

// ── Sub-components ────────────────────────────────────────────────────
function CertAvatar({ name, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: avatarColor(name), display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.2px'
    }}>
      {initials(name)}
    </div>
  )
}

function StatusChip({ status }) {
  const map = {
    Active:     { cls: 'chip-blue',   label: 'Active' },
    Revoked:    { cls: 'chip-red',    label: 'Revoked' },
    Distrusted: { cls: 'chip-red',    label: 'Distrusted' },
    Expired:    { cls: 'chip-amber',  label: 'Expired' },
    Expiring:   { cls: 'chip-amber',  label: 'Expiring' },
  }
  const m = map[status] || { cls: 'chip-grey', label: status || '—' }
  return <span className={`v2-chip ${m.cls}`}>{m.label}</span>
}

function TypeChip({ type }) {
  return (
    <span className={`v2-chip ${type === 'Root CA' ? 'chip-blue' : 'chip-grey'}`}>
      {type === 'Root CA' ? 'Root CA' : 'Intermediate'}
    </span>
  )
}

function ScoreBanner({ score, cert }) {
  const cls = scoreClass(score)
  const bars = [
    { label: 'Crypto strength', val: computeCryptoScore(cert) },
    { label: 'Chain validity',  val: score != null && score >= 80 ? 100 : 60 },
    { label: 'BR compliance',   val: computeBRScore(cert) },
    { label: 'Revocation',      val: cert?.status === 'Active' ? 95 : 20 },
  ]
  return (
    <div className={`score-banner${cls}`}>
      <div style={{ flexShrink: 0 }}>
        <div className="score-num">
          {score ?? '—'}
          {score != null && <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.5 }}>/100</span>}
        </div>
        <div className="score-label">PKI Trust Score</div>
      </div>
      <div className="score-bars" style={{ flex: 1 }}>
        {bars.map(({ label, val }) => (
          <div key={label} className="sbar">
            <div className="sbar-lbl">{label}</div>
            <div className="sbar-track">
              <div className={`sbar-fill${val < 50 ? ' red' : val < 75 ? ' amber' : ''}`} style={{ width: val + '%' }} />
            </div>
            <div className="sbar-n">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function computeCryptoScore(cert) {
  if (!cert) return 0
  const sig = (cert.signature_hash_algorithm || '').toLowerCase()
  if (sig.includes('sha1') || sig.includes('md5')) return 20
  const bits = parseInt((cert.public_key_size || '0').replace(/[^0-9]/g, ''))
  if (bits > 0 && bits < 2048) return 40
  return 95
}
function computeBRScore(cert) {
  if (!cert) return 0
  if (cert.status === 'Distrusted') return 10
  if (cert.status === 'Revoked') return 20
  return 96
}

function FieldGrid({ rows }) {
  return (
    <div className="field-grid">
      {rows.map(({ k, v, cls }) => (
        <div key={k} className="field-cell">
          <div className="fk">{k}</div>
          <div className={`fv${cls ? ' ' + cls : ''}`}>{v || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function TrustStoreGrid({ cert }) {
  const trusted = {
    Chrome:    cert?.chrome_trusted,
    Mozilla:   cert?.mozilla_trusted,
    Apple:     cert?.apple_trusted,
    Microsoft: cert?.microsoft_trusted,
  }
  const distrusted = cert?.status === 'Distrusted'
  return (
    <div className="store-grid">
      {ALL_STORES.map(s => {
        const t = trusted[s]
        const cls = t && !distrusted ? 'trusted' : distrusted && t ? 'distrusted' : ''
        return (
          <div key={s} className={`store-card ${cls}`}>
            <span style={{ fontSize: 18 }}>{STORE_META[s].icon}</span>
            <div>
              <div className="store-name">{s}</div>
              <div className={`store-status ${t && !distrusted ? 'ok' : distrusted && t ? 'bad' : 'no'}`}>
                {t && !distrusted ? 'Trusted' : distrusted && t ? 'Distrusted' : 'Not included'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChainView({ cert }) {
  const isInter = cert?.cert_type !== 'Root CA'
  const isExpiring = cert?.status === 'Expiring'
  return (
    <div className="chain-wrap">
      {isInter && (
        <div className="chain-item">
          <div className="chain-line">
            <div className="chain-circle filled" />
            <div className="chain-connector-v" />
          </div>
          <div className="chain-card">
            <div className="cc-top">
              <span className="v2-chip chip-blue">Root CA</span>
              <span className="cc-name" style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
                Issuing root — {cert?.ca_owner}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="chain-item">
        <div className="chain-line">
          <div className={`chain-circle ${cert?.cert_type === 'Root CA' ? 'filled' : isExpiring ? 'amber' : ''}`} />
          {cert?.cert_type === 'Root CA' && <div className="chain-connector-v" />}
        </div>
        <div className="chain-card focused">
          <div className="cc-top">
            <TypeChip type={cert?.cert_type} />
            <StatusChip status={cert?.status} />
            {cert?.ev_capable && <span className="v2-chip chip-purple">EV capable</span>}
          </div>
          <div className="cc-meta">
            <span>{cert?.ca_owner}</span>
            <span style={{ color: 'var(--v2-text-3)' }}>·</span>
            <span>{cert?.key_algorithm}</span>
            <span style={{ color: 'var(--v2-text-3)' }}>·</span>
            <span>{fmtDate(cert?.valid_from)} → {fmtDate(cert?.valid_to)}</span>
          </div>
        </div>
      </div>
      {cert?.cert_type === 'Root CA' && (
        <div className="chain-item">
          <div className="chain-line">
            <div className="chain-circle grey" />
          </div>
          <div className="chain-card" style={{ opacity: 0.6 }}>
            <div className="cc-top"><span className="v2-chip chip-grey">Sub-CAs</span></div>
            <div className="cc-meta">Issued intermediates chain to this root</div>
          </div>
        </div>
      )}
    </div>
  )
}

function IntelStrip({ cert }) {
  if (!cert) return null
  const sig = cert.signature_hash_algorithm || '—'
  const algo = cert.key_algorithm || '—'
  const validTo = cert.valid_to ? new Date(cert.valid_to) : null
  const daysLeft = validTo ? Math.round((validTo - new Date()) / 86400000) : null
  const items = [
    { label: 'Key algorithm', val: algo, good: !algo.toLowerCase().includes('dsa') },
    { label: 'Signature hash', val: sig, good: !sig.toLowerCase().includes('sha1') && !sig.toLowerCase().includes('md5'), warn: sig === '—' },
    { label: 'Valid to', val: daysLeft != null ? `${daysLeft}d left` : fmtDate(cert.valid_to), good: daysLeft == null || daysLeft > 365, warn: daysLeft != null && daysLeft <= 365 && daysLeft > 0, bad: daysLeft != null && daysLeft <= 0 },
    { label: 'Key size', val: cert.public_key_size || '—', good: parseInt((cert.public_key_size||'0')) >= 2048 },
    { label: 'Status', val: cert.status || '—', good: cert.status === 'Active', bad: cert.status === 'Revoked' || cert.status === 'Distrusted' },
    { label: 'CAB Forum', val: cert.status === 'Distrusted' ? 'Violations' : cert.status === 'Active' ? 'Compliant' : 'Check', good: cert.status === 'Active', bad: cert.status === 'Distrusted' },
    { label: 'EV capable', val: cert.ev_capable ? 'Yes' : 'No', good: cert.ev_capable },
    { label: '47-day ready', val: cert.cert_type !== 'Root CA' ? 'Check CA' : 'N/A' },
  ]
  return (
    <div className="intel-strip">
      <div className="intel-title">Intelligence signals</div>
      <div className="intel-row">
        {items.map(({ label, val, good, warn, bad }) => (
          <div key={label} className={`intel-card${good ? ' good' : warn ? ' warn' : bad ? ' bad' : ''}`}>
            <div className="ic-lbl">{label}</div>
            <div className="ic-val">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function CATrustExplorer({ nav }) {
  const [certs, setCerts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncedAt, setSyncedAt] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const searchRef = useRef(null)

  // ── Load data ──────────────────────────────────────────────────────
  const loadCerts = useCallback(async () => {
    setLoading(true)
    try {
      // Get total count
      const { count } = await supabase
        .from('ca_certificates')
        .select('*', { count: 'exact', head: true })
      setTotalCount(count || 0)

      // Get last sync
      const { data: syncRow } = await supabase
        .from('ca_sync_log')
        .select('synced_at,records_upserted')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (syncRow?.synced_at) setSyncedAt(syncRow.synced_at)

      // Load page
      const { data, error } = await supabase
        .from('ca_certificates')
        .select('*')
        .order('ca_owner', { ascending: true })
        .limit(PAGE_SIZE)
      if (error) throw error
      setCerts(data || [])
      setFiltered(data || [])
      if (data?.length) setSelected(data[0])
    } catch (e) {
      console.error('CATrustExplorer load:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCerts() }, [loadCerts])

  // ── Search + filter ────────────────────────────────────────────────
  const applyFilter = useCallback(async (tab, q) => {
    setLoading(true)
    try {
      let qb = supabase.from('ca_certificates').select('*').limit(PAGE_SIZE)
      if (q) qb = qb.or(`common_name.ilike.%${q}%,ca_owner.ilike.%${q}%,sha256_fingerprint.ilike.%${q}%`)
      if (tab === 'root') qb = qb.eq('cert_type', 'Root CA')
      else if (tab === 'inter') qb = qb.neq('cert_type', 'Root CA')
      else if (tab === 'distrust') qb = qb.eq('status', 'Distrusted')
      else if (tab === 'expiring') qb = qb.in('status', ['Expiring'])
      else if (tab === 'ev') qb = qb.eq('ev_capable', true)
      qb = qb.order('ca_owner', { ascending: true })
      const { data } = await qb
      setFiltered(data || [])
      if (data?.length) setSelected(data[0])
    } catch (e) {
      console.error('filter:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = useCallback((v) => {
    setQuery(v)
    applyFilter(activeTab, v)
  }, [activeTab, applyFilter])

  const handleTab = useCallback((tab) => {
    setActiveTab(tab)
    applyFilter(tab, query)
  }, [query, applyFilter])

  // ── Sync ───────────────────────────────────────────────────────────
  const triggerSync = async () => {
    setSyncing(true)
    setSyncMsg('Fetching CCADB data…')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(SYNC_FN, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      setSyncMsg(json.message || 'Sync complete')
      await loadCerts()
    } catch (e) {
      setSyncMsg('Sync failed — ' + e.message)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  // ── Copy helpers ───────────────────────────────────────────────────
  const copyText = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // ── Stat counts ────────────────────────────────────────────────────
  const counts = {
    all:      certs.length,
    root:     certs.filter(c => c.cert_type === 'Root CA').length,
    inter:    certs.filter(c => c.cert_type !== 'Root CA').length,
    distrust: certs.filter(c => c.status === 'Distrusted').length,
    expiring: certs.filter(c => c.status === 'Expiring').length,
    ev:       certs.filter(c => c.ev_capable).length,
  }

  const score = selected ? computeScore(selected) : null

  // ── Sync age ───────────────────────────────────────────────────────
  const syncAge = syncedAt ? (() => {
    const h = Math.round((Date.now() - new Date(syncedAt)) / 3600000)
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h/24)}d ago`
  })() : 'never'

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="v2-page ca-explorer">
      {/* Inline styles — all tokens from design-v2.css */}
      <style>{`
        .ca-explorer { font-family:'Segoe UI',-apple-system,system-ui,sans-serif }
        .sync-bar { background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:7px 24px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--v2-text-2);gap:12px;flex-wrap:wrap }
        .live-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;animation:blink 2.4s infinite }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .stats-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:18px }
        .stat-tile { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-lg);padding:12px 14px;cursor:pointer;transition:border-color .12s,background .12s;user-select:none }
        .stat-tile:hover { background:var(--v2-surface-3);border-color:var(--v2-border-strong) }
        .stat-tile.active { background:var(--v2-green-bg);border-color:var(--v2-green-border) }
        .stat-val { font-size:20px;font-weight:600;letter-spacing:-0.4px;color:var(--v2-text);font-feature-settings:'tnum' }
        .stat-tile.active .stat-val { color:var(--v2-green-text) }
        .stat-lbl { font-size:10px;letter-spacing:0.4px;color:var(--v2-text-3);text-transform:uppercase;font-weight:500;margin-top:4px;display:flex;align-items:center;gap:5px }
        .sdot { display:inline-block;width:5px;height:5px;border-radius:50%;flex-shrink:0 }
        .split { display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start }
        .list-panel { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);overflow:hidden }
        .search-bar { padding:10px 12px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2);display:flex;align-items:center;gap:8px }
        .search-bar input { flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;color:var(--v2-text) }
        .search-bar input::placeholder { color:var(--v2-text-3) }
        .fbar { padding:8px 10px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2);display:flex;gap:4px;flex-wrap:wrap }
        .fchip { font-size:11px;font-weight:500;padding:2px 8px;border-radius:var(--v2-r-sm);border:0.5px solid transparent;color:var(--v2-text-2);background:transparent;font-family:inherit;cursor:pointer;transition:background .1s }
        .fchip:hover { background:var(--v2-hover) }
        .fchip.on { background:var(--v2-surface);border-color:var(--v2-border-strong);color:var(--v2-text);box-shadow:var(--v2-shadow-sm) }
        .cert-list { max-height:520px;overflow-y:auto }
        .cert-list::-webkit-scrollbar { width:4px }
        .cert-list::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.08);border-radius:2px }
        .list-row { position:relative;display:flex;align-items:center;gap:10px;padding:11px 14px 11px 16px;border-bottom:0.5px solid var(--v2-border);cursor:pointer;transition:background .1s }
        .list-row:last-child { border-bottom:none }
        .list-row:hover { background:var(--v2-surface-3) }
        .list-row.selected { background:var(--v2-surface-3) }
        .list-row::before { content:'';position:absolute;left:0;top:0;bottom:0;width:2px;border-radius:0 2px 2px 0 }
        .status-green::before { background:var(--v2-green) }
        .status-amber::before { background:var(--v2-amber) }
        .status-red::before   { background:var(--v2-red) }
        .row-body { flex:1;min-width:0 }
        .row-title { font-size:12px;font-weight:500;color:var(--v2-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px }
        .row-meta { font-size:11px;color:var(--v2-text-2);display:flex;gap:8px;align-items:center }
        .row-score { font-size:11px;font-weight:600;font-feature-settings:'tnum';min-width:22px;text-align:right;flex-shrink:0 }
        .chip-blue { color:var(--v2-green-text);background:var(--v2-green-bg);border-color:var(--v2-green-border) }
        .chip-amber { color:var(--v2-amber-text);background:var(--v2-amber-bg);border-color:var(--v2-amber-border) }
        .chip-red { color:var(--v2-red-text);background:var(--v2-red-bg);border-color:var(--v2-red-border) }
        .chip-grey { color:var(--v2-text-2);background:var(--v2-hover);border-color:var(--v2-border) }
        .chip-purple { color:#6d28d9;background:#f5f3ff;border-color:#ddd6fe }
        .detail-panel { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);overflow:hidden }
        .dp-header { padding:14px 16px;border-bottom:0.5px solid var(--v2-border);display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--v2-surface-2);flex-wrap:wrap }
        .dp-title { font-size:14px;font-weight:600;color:var(--v2-text);letter-spacing:-0.2px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 }
        .dp-actions { display:flex;gap:6px;flex-shrink:0 }
        .dp-body { padding:16px;max-height:480px;overflow-y:auto }
        .dp-body::-webkit-scrollbar { width:4px }
        .dp-body::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.08);border-radius:2px }
        .score-banner { background:var(--v2-green-bg);border:0.5px solid var(--v2-green-border);border-radius:var(--v2-r-lg);padding:12px 14px;display:flex;align-items:center;gap:14px;margin-bottom:16px }
        .score-banner.amber { background:var(--v2-amber-bg);border-color:var(--v2-amber-border) }
        .score-banner.red { background:var(--v2-red-bg);border-color:var(--v2-red-border) }
        .score-num { font-size:28px;font-weight:700;color:var(--v2-green-text);letter-spacing:-0.5px;font-feature-settings:'tnum';line-height:1 }
        .score-banner.amber .score-num { color:var(--v2-amber-text) }
        .score-banner.red .score-num   { color:var(--v2-red-text) }
        .score-label { font-size:11px;color:var(--v2-green-text-2);margin-top:2px }
        .score-banner.amber .score-label { color:var(--v2-amber-text) }
        .score-banner.red .score-label   { color:var(--v2-red-text) }
        .score-bars { flex:1 }
        .sbar { display:flex;align-items:center;gap:8px;margin-bottom:5px }
        .sbar-lbl { font-size:10px;color:var(--v2-text-3);min-width:72px;letter-spacing:0.2px }
        .sbar-track { flex:1;height:3px;background:var(--v2-hover);border-radius:100px;overflow:hidden }
        .sbar-fill { height:100%;border-radius:100px;background:var(--v2-green);transition:width .3s }
        .sbar-fill.amber { background:var(--v2-amber) }
        .sbar-fill.red   { background:var(--v2-red) }
        .sbar-n { font-size:10px;color:var(--v2-text-3);min-width:22px;text-align:right;font-feature-settings:'tnum' }
        .ds-title { font-size:11px;letter-spacing:0.4px;color:var(--v2-text-3);text-transform:uppercase;font-weight:500;margin:14px 0 8px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border) }
        .field-grid { display:grid;grid-template-columns:1fr 1fr;gap:0 }
        .field-cell { padding:7px 0;border-bottom:0.5px solid var(--v2-border) }
        .field-cell:nth-last-child(-n+2) { border-bottom:none }
        .fk { font-size:11px;color:var(--v2-text-3);margin-bottom:2px }
        .fv { font-size:12px;color:var(--v2-text);font-weight:500 }
        .fv.mono { font-family:'JetBrains Mono','SF Mono',monospace;font-size:10px;color:var(--v2-text-2);word-break:break-all;font-weight:400 }
        .fv.ok   { color:var(--v2-green-text) }
        .fv.warn { color:var(--v2-amber-text) }
        .fv.bad  { color:var(--v2-red-text) }
        .fp-box  { font-family:'JetBrains Mono','SF Mono',monospace;font-size:10px;color:var(--v2-text-2);line-height:1.7;background:var(--v2-surface-3);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-md);padding:8px 10px;word-break:break-all;cursor:pointer;transition:border-color .12s }
        .fp-box:hover { border-color:var(--v2-border-strong) }
        .store-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px }
        .store-card { background:var(--v2-surface-3);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-lg);padding:10px 12px;display:flex;align-items:center;gap:10px }
        .store-card.trusted    { border-color:var(--v2-green-border);background:var(--v2-green-bg) }
        .store-card.distrusted { border-color:var(--v2-red-border);background:var(--v2-red-bg) }
        .store-name { font-size:12px;font-weight:500;color:var(--v2-text) }
        .store-status { font-size:11px;margin-top:1px }
        .store-status.ok  { color:var(--v2-green-text) }
        .store-status.no  { color:var(--v2-text-3) }
        .store-status.bad { color:var(--v2-red-text) }
        .chain-wrap { margin-top:4px }
        .chain-item { display:flex;gap:10px;margin-bottom:4px }
        .chain-line { display:flex;flex-direction:column;align-items:center;width:18px;flex-shrink:0 }
        .chain-circle { width:10px;height:10px;border-radius:50%;border:1.5px solid var(--v2-green);background:var(--v2-surface);margin-top:4px;flex-shrink:0 }
        .chain-circle.filled { background:var(--v2-green) }
        .chain-circle.grey   { border-color:var(--v2-grey-dot) }
        .chain-circle.amber  { border-color:var(--v2-amber) }
        .chain-connector-v { width:1px;background:var(--v2-border);flex:1;min-height:16px;margin:2px 0 }
        .chain-card { flex:1;background:var(--v2-surface-3);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-lg);padding:10px 12px;margin-bottom:8px }
        .chain-card.focused { border-color:var(--v2-green-border);background:var(--v2-green-bg) }
        .chain-card.amber   { border-color:var(--v2-amber-border);background:var(--v2-amber-bg) }
        .cc-top { display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap }
        .cc-meta { font-size:11px;color:var(--v2-text-2);display:flex;gap:10px;flex-wrap:wrap }
        .intel-strip { border-top:0.5px solid var(--v2-border);padding:12px 16px;background:var(--v2-surface-2) }
        .intel-title { font-size:11px;letter-spacing:0.4px;color:var(--v2-text-3);text-transform:uppercase;font-weight:500;margin-bottom:8px }
        .intel-row { display:flex;gap:8px;overflow-x:auto;padding-bottom:4px }
        .intel-row::-webkit-scrollbar { height:3px }
        .intel-row::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.08) }
        .intel-card { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-lg);padding:9px 12px;flex-shrink:0;min-width:110px }
        .intel-card.warn { border-color:var(--v2-amber-border);background:var(--v2-amber-bg) }
        .intel-card.good { border-color:var(--v2-green-border);background:var(--v2-green-bg) }
        .intel-card.bad  { border-color:var(--v2-red-border);background:var(--v2-red-bg) }
        .ic-lbl { font-size:10px;letter-spacing:0.3px;color:var(--v2-text-3);text-transform:uppercase;font-weight:500;margin-bottom:3px }
        .ic-val { font-size:12px;font-weight:600;color:var(--v2-text) }
        .intel-card.warn .ic-val { color:var(--v2-amber-text) }
        .intel-card.good .ic-val { color:var(--v2-green-text) }
        .intel-card.bad  .ic-val { color:var(--v2-red-text) }
        .pem-block { background:#0a0a0a;border-radius:var(--v2-r-lg);overflow:hidden;border:0.5px solid #1a1a1a;margin-top:4px }
        .pem-head { display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:0.5px solid rgba(255,255,255,0.06);background:#111 }
        .pem-dots { display:flex;gap:4px }
        .pem-body { padding:10px 12px;font-family:'JetBrains Mono','SF Mono',monospace;font-size:10px;color:#a3a3a3;line-height:1.6;word-break:break-all;max-height:80px;overflow:hidden;position:relative }
        .pem-fade { position:absolute;bottom:0;left:0;right:0;height:28px;background:linear-gradient(transparent,#0a0a0a) }
        .callout-warn { background:var(--v2-amber-bg);border:0.5px solid var(--v2-amber-border);border-left:2px solid var(--v2-amber);border-radius:var(--v2-r-md);padding:10px 12px;font-size:12px;color:var(--v2-amber-text);margin-bottom:14px }
        .callout-bad  { background:var(--v2-red-bg);border:0.5px solid var(--v2-red-border);border-left:2px solid var(--v2-red);border-radius:var(--v2-r-md);padding:10px 12px;font-size:12px;color:var(--v2-red-text);margin-bottom:14px }
        .empty-state { text-align:center;padding:48px 24px;color:var(--v2-text-3) }
        .loading-rows { padding:16px;display:flex;flex-direction:column;gap:10px }
        .skeleton { background:linear-gradient(90deg,var(--v2-hover) 25%,var(--v2-surface-2) 50%,var(--v2-hover) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:var(--v2-r-md);height:14px }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:900px){.split{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      {/* Sync banner */}
      <div className="sync-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="live-dot" />
          <span>CCADB data · synced {syncAge}</span>
          <span style={{ color: 'var(--v2-text-3)' }}>·</span>
          <span>{totalCount ? totalCount.toLocaleString() : '—'} certificates indexed</span>
          <span style={{ color: 'var(--v2-text-3)' }}>·</span>
          <span>Sources: Mozilla · Apple · Chrome · Microsoft root stores</span>
          {syncMsg && <span style={{ color: 'var(--v2-amber-text)', fontWeight: 500 }}>{syncMsg}</span>}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="v2-btn v2-btn-sm" style={{ gap: 5 }}>
            <Download size={13} /> Export CSV
          </button>
          <button className="v2-btn v2-btn-sm" onClick={triggerSync} disabled={syncing} style={{ gap: 5 }}>
            <RefreshCw size={13} className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      <div className="v2-container">

        {/* Hero */}
        <div style={{ marginBottom: 18 }}>
          <h1 className="v2-h1">CA Trust Store Explorer</h1>
          <p className="v2-subtitle">Every publicly-trusted Root and Intermediate CA, sourced live from CCADB · CAB Forum compliant</p>
        </div>

        {/* Stat tiles */}
        <div className="stats-grid">
          {[
            { key: 'all',      val: totalCount || counts.all, label: 'All certificates', color: 'var(--v2-green)' },
            { key: 'root',     val: counts.root,     label: 'Root CAs',         color: 'var(--v2-green)' },
            { key: 'inter',    val: counts.inter,    label: 'Intermediates',     color: 'var(--v2-grey-dot)' },
            { key: 'distrust', val: counts.distrust, label: 'Distrusted',        color: 'var(--v2-red)',    valColor: 'var(--v2-red-text)' },
            { key: 'expiring', val: counts.expiring, label: 'Expiring ≤ 1yr',   color: 'var(--v2-amber)', valColor: 'var(--v2-amber-text)' },
            { key: 'ev',       val: counts.ev,       label: 'EV capable',        color: '#7c3aed',         valColor: '#6d28d9' },
          ].map(({ key, val, label, color, valColor }) => (
            <div key={key} className={`stat-tile${activeTab === key ? ' active' : ''}`} onClick={() => handleTab(key)}>
              <div className="stat-val" style={valColor && activeTab !== key ? { color: valColor } : {}}>{val}</div>
              <div className="stat-lbl">
                <span className="sdot" style={{ background: color }} />
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="v2-tablist">
          {[
            { key: 'all',      label: 'All',           count: totalCount || counts.all },
            { key: 'root',     label: 'Root CAs',      count: counts.root },
            { key: 'inter',    label: 'Intermediates', count: counts.inter },
            { key: 'distrust', label: 'Distrusted',    count: counts.distrust },
            { key: 'expiring', label: 'Expiring',      count: counts.expiring },
          ].map(({ key, label, count }) => (
            <button key={key} className={`v2-tablist-btn${activeTab === key ? ' active' : ''}`} onClick={() => handleTab(key)}>
              {label} <span className="v2-tab-count">{count}</span>
            </button>
          ))}
        </div>

        {/* Split layout */}
        <div className="split">

          {/* Left: list */}
          <div className="list-panel">
            <div className="search-bar">
              <Search size={15} color="var(--v2-text-3)" style={{ flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search CA name, owner, fingerprint…"
                value={query}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <div className="fbar">
              {['Root CA', 'Intermediate', 'Active', 'Revoked', 'EV', 'RSA', 'ECDSA'].map(f => (
                <button key={f} className="fchip on" onClick={e => e.currentTarget.classList.toggle('on')}>{f}</button>
              ))}
            </div>
            <div className="cert-list">
              {loading ? (
                <div className="loading-rows">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ width: i % 2 === 0 ? '80%' : '60%' }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <Globe size={28} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>No certificates found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search or run a sync</div>
                </div>
              ) : (
                filtered.map((c, i) => {
                  const sc = computeScore(c)
                  return (
                    <div
                      key={c.id}
                      className={`list-row ${statusRowClass(c.status)}${selected?.id === c.id ? ' selected' : ''}`}
                      onClick={() => setSelected(c)}
                    >
                      <CertAvatar name={c.ca_owner || c.common_name || '?'} />
                      <div className="row-body">
                        <div className="row-title">{c.common_name || c.ca_owner}</div>
                        <div className="row-meta">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                            {c.ca_owner}
                          </span>
                          <span style={{ color: 'var(--v2-text-3)' }}>·</span>
                          <span className={`v2-chip ${c.cert_type === 'Root CA' ? 'chip-blue' : 'chip-grey'}`} style={{ fontSize: 9 }}>
                            {c.cert_type === 'Root CA' ? 'Root' : 'Int.'}
                          </span>
                        </div>
                      </div>
                      <div className="row-score" style={{ color: scoreColor(sc) }}>{sc ?? '—'}</div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: detail */}
          <div className="detail-panel">
            {selected ? (
              <>
                <div className="dp-header">
                  <div className="dp-title">{selected.common_name || selected.ca_owner}</div>
                  <div className="dp-actions">
                    <button className="v2-btn v2-btn-sm" onClick={() => copyText(selected.sha256_fingerprint || '')} style={{ gap: 5 }}>
                      <Copy size={12} /> {copied ? 'Copied!' : 'SHA-256'}
                    </button>
                    <button className="v2-btn v2-btn-sm" style={{ gap: 5 }}>
                      <FileDown size={12} /> PEM
                    </button>
                    <button className="v2-btn v2-btn-sm" style={{ background: '#0a0a0a', color: '#fff', borderColor: '#0a0a0a', gap: 5 }}>
                      <ShieldCheck size={12} /> Verify chain
                    </button>
                  </div>
                </div>

                <div className="dp-body">
                  {/* Callouts */}
                  {selected.status === 'Distrusted' && (
                    <div className="callout-bad">
                      <strong>Distrusted by root programs</strong> — certificates issued from this root may be rejected by modern browsers. Do not deploy.
                    </div>
                  )}
                  {selected.status === 'Expiring' && (
                    <div className="callout-warn">
                      <strong>Expiring soon</strong> — this certificate's validity period ends within 12 months. Plan migration now.
                    </div>
                  )}

                  {/* Score */}
                  <ScoreBanner score={score} cert={selected} />

                  {/* Identity */}
                  <div className="ds-title">Certificate identity</div>
                  <FieldGrid rows={[
                    { k: 'Common name', v: selected.common_name },
                    { k: 'CA owner',    v: selected.ca_owner },
                    { k: 'Type',        v: selected.cert_type,                    cls: selected.cert_type === 'Root CA' ? 'ok' : '' },
                    { k: 'Country',     v: selected.country },
                    { k: 'Key algo',    v: selected.key_algorithm,                cls: selected.key_algorithm?.toLowerCase().includes('sha1') ? 'warn' : 'ok' },
                    { k: 'Sig. hash',   v: selected.signature_hash_algorithm,     cls: selected.signature_hash_algorithm?.toLowerCase().includes('sha1') ? 'warn' : 'ok' },
                    { k: 'Valid from',  v: fmtDate(selected.valid_from) },
                    { k: 'Valid to',    v: fmtDate(selected.valid_to),            cls: selected.status === 'Expiring' ? 'warn' : selected.status === 'Expired' ? 'bad' : '' },
                  ]} />

                  {/* Fingerprint */}
                  {selected.sha256_fingerprint && (
                    <>
                      <div className="ds-title">SHA-256 fingerprint</div>
                      <div className="fp-box" onClick={() => copyText(selected.sha256_fingerprint)} title="Click to copy">
                        {selected.sha256_fingerprint}
                      </div>
                    </>
                  )}

                  {/* Root store trust */}
                  <div className="ds-title">Root store trust</div>
                  <TrustStoreGrid cert={selected} />

                  {/* Chain */}
                  <div className="ds-title">Trust chain</div>
                  <ChainView cert={selected} />

                  {/* PEM */}
                  {selected.pem_info && (
                    <>
                      <div className="ds-title">Certificate PEM</div>
                      <div className="pem-block">
                        <div className="pem-head">
                          <div className="pem-dots">
                            <span style={{ background: '#ff5f56', width: 8, height: 8, borderRadius: '50%', display: 'block' }} />
                            <span style={{ background: '#ffbd2e', width: 8, height: 8, borderRadius: '50%', display: 'block' }} />
                            <span style={{ background: '#27c93f', width: 8, height: 8, borderRadius: '50%', display: 'block' }} />
                          </div>
                          <button
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a3a3a3', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
                            onClick={() => copyText(selected.pem_info)}
                          >
                            <Copy size={11} /> Copy PEM
                          </button>
                        </div>
                        <div className="pem-body">
                          -----BEGIN CERTIFICATE-----<br />{selected.pem_info}<br />-----END CERTIFICATE-----
                          <div className="pem-fade" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <IntelStrip cert={selected} />
              </>
            ) : (
              <div className="empty-state">
                <ShieldCheck size={32} style={{ marginBottom: 12, color: 'var(--v2-text-3)' }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text-2)' }}>Select a certificate</div>
                <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 4 }}>Click any row in the list to inspect it</div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
