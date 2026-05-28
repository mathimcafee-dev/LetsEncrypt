// CTAbuseMonitor.jsx — CT log abuse monitoring: detect unauthorised certs for your domains
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  ShieldAlert, RefreshCw, Check, X, AlertTriangle, Search,
  Shield, ChevronDown, ChevronUp, Plus, Trash2, ExternalLink
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Classify a shadow cert against the user's known certs
function classifyCert(shadow, knownDomains) {
  if (shadow.dismissed || shadow.status === 'known') return 'known'
  if (shadow.status === 'phishing') return 'phishing'
  if (shadow.status === 'suspicious') return 'suspicious'
  // Auto-classify: if domain not in known inventory → flag as unknown
  if (!knownDomains.has(shadow.domain)) return 'unknown'
  return 'unknown'
}

const STATUS_CONFIG = {
  unknown:    { label: 'Unknown',    color: '#f87171', bg: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.25)', leftBorder: '#f87171' },
  phishing:   { label: 'Phishing',   color: '#ffffff', bg: 'rgba(30,0,0,0.4)', border: 'rgba(192,57,43,0.1)', leftBorder: '#f0ede8' },
  suspicious: { label: 'Suspicious', color: '#ffffff', bg: 'rgba(239,68,68,0.08)', border: 'rgba(192,57,43,0.25)', leftBorder: '#f0ede8' },
  known:      { label: 'Known',      color: '#4ade80', bg: 'transparent', border: 'rgba(192,57,43,0.3)', leftBorder: '#4ade80' },
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, letterSpacing: '0.3px' }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

function DetailPanel({ shadow, status, onDismiss, onMark, onClose, dismissing }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border: `0.5px solid ${cfg.border}`,
      borderLeft: `3px solid ${cfg.leftBorder}`,
      borderRadius: 10, padding: '14px 16px', marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={14} color={cfg.color}/>
          <span style={{ fontSize:13, fontWeight: 500, color: '#ffffff' }}>Certificate detail</span>
          <StatusBadge status={status}/>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0', padding: 4 }}>
          <X size={14}/>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 0 }}>
        {[
          { label: 'Domain',        val: shadow.domain },
          { label: 'Issuing CA',    val: shadow.ca_type || '—' },
          { label: 'Organisation',  val: shadow.org_name || '—' },
          { label: 'Serial number', val: shadow.serial_number || '—' },
          { label: 'Issued',        val: fmtDate(shadow.issued_at) },
          { label: 'Expires',       val: fmtDate(shadow.expires_at) },
          { label: 'Detected',      val: timeAgo(shadow.found_at) },
          { label: 'Source',        val: shadow.ct_source || 'CT log scan' },
        ].map(({ label, val }) => (
          <div key={label} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--v2-border)',
            display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize:11, color: '#b0a8a0', minWidth: 100, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize:11, color: '#ffffff', fontWeight: 500,
              fontFamily: label === 'Serial number' ? 'monospace' : 'inherit',
              wordBreak: 'break-all' }}>{val}</span>
          </div>
        ))}
      </div>

      {shadow.reason && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: cfg.bg, borderRadius: 6,
          fontSize:11, color: cfg.color, lineHeight: 1.5 }}>
          <AlertTriangle size={11} style={{ verticalAlign: '-1px', marginRight: 5 }}/>
          {shadow.reason}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {status !== 'known' && (
          <button className="v2-btn v2-btn-sm" onClick={() => onDismiss(shadow.id)}
            disabled={dismissing === shadow.id}
            style={{ display: 'flex', alignItems: 'center', gap: 5,
              borderColor: 'rgba(192,57,43,0.3)', color: '#4ade80' }}>
            <Check size={11}/>
            {dismissing === shadow.id ? 'Marking…' : 'Mark as known'}
          </button>
        )}
        <button className="v2-btn v2-btn-sm"
          onClick={() => window.open(`https://crt.sh/?q=${encodeURIComponent(shadow.domain)}`, '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ExternalLink size={11}/> View on crt.sh
        </button>
        {status !== 'known' && (
          <button className="v2-btn v2-btn-sm" onClick={() => onMark(shadow.id, 'phishing')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, borderColor: 'rgba(192,57,43,0.25)', color: '#f87171' }}>
            <AlertTriangle size={11}/> Report mis-issuance
          </button>
        )}
      </div>
    </div>
  )
}

export default function CTAbuseMonitor({ user }) {
  const isMobile = useIsMobile()
  const [shadows,      setShadows]      = useState([])
  const [watchDomains, setWatchDomains] = useState([])
  const [knownCerts,   setKnownCerts]   = useState(new Set())
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState(null)
  const [dismissing,   setDismissing]   = useState(null)
  const [newDomain,    setNewDomain]    = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [showWatched,  setShowWatched]  = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: shadowData }, { data: certData }, { data: watchData }] = await Promise.all([
      supabase.from('shadow_certs').select('*').eq('user_id', user.id).order('found_at', { ascending: false }),
      supabase.from('certificates').select('domain').eq('user_id', user.id).neq('status', 'revoked'),
      supabase.from('ct_watch_domains').select('*').eq('user_id', user.id).eq('active', true).order('created_at'),
    ])
    setShadows(shadowData || [])
    setKnownCerts(new Set((certData || []).map(c => c.domain)))
    setWatchDomains(watchData || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const dismiss = async (id) => {
    setDismissing(id)
    await supabase.from('shadow_certs').update({ dismissed: true, status: 'known' }).eq('id', id)
    setShadows(s => s.map(x => x.id === id ? { ...x, dismissed: true, status: 'known' } : x))
    setDismissing(null)
    setSelected(null)
  }

  const markStatus = async (id, newStatus) => {
    await supabase.from('shadow_certs').update({ status: newStatus }).eq('id', id)
    setShadows(s => s.map(x => x.id === id ? { ...x, status: newStatus } : x))
    setSelected(null)
  }

  const addWatchDomain = async () => {
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d) return
    setAddingDomain(true)
    await supabase.from('ct_watch_domains').upsert({ user_id: user.id, domain: d, active: true },
      { onConflict: 'user_id,domain' })
    setNewDomain('')
    await load()
    setAddingDomain(false)
  }

  const removeWatchDomain = async (id) => {
    await supabase.from('ct_watch_domains').update({ active: false }).eq('id', id)
    setWatchDomains(w => w.filter(x => x.id !== id))
  }

  // Classify each shadow
  const classified = shadows.map(s => ({
    ...s,
    _status: classifyCert(s, knownCerts),
  }))

  const counts = classified.reduce((a, s) => {
    a[s._status] = (a[s._status] || 0) + 1; return a
  }, {})
  const flagged = (counts.unknown || 0) + (counts.phishing || 0)

  const filtered = classified.filter(s => {
    const matchFilter = filter === 'all' || s._status === filter ||
      (filter === 'flagged' && (s._status === 'unknown' || s._status === 'phishing'))
    const matchSearch = !search ||
      s.domain?.toLowerCase().includes(search.toLowerCase()) ||
      s.ca_type?.toLowerCase().includes(search.toLowerCase()) ||
      s.org_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const selectedShadow = selected ? classified.find(s => s.id === selected) : null

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 960 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 16, paddingTop: 8, gap: 12 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>CT abuse monitor</h1>
            <p style={{ fontSize:13, color: '#b0a8a0', marginTop: 4 }}>
              Certificates issued for your domains by any CA — detected via CT logs. Spot phishing and mis-issuance instantly.
            </p>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <RefreshCw size={11} style={loading ? { animation: 'spin .8s linear infinite' } : {}}/>
            Refresh
          </button>
        </div>

        {/* Alert banner */}
        {flagged > 0 && (
          <div style={{ background: 'rgba(192,57,43,0.12)', border: '0.5px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldAlert size={16} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }}/>
            <div>
              <div style={{ fontSize:13, fontWeight: 500, color: '#f87171' }}>
                {flagged} unauthorised certificate{flagged !== 1 ? 's' : ''} detected
              </div>
              <div style={{ fontSize:11, color: '#f87171', marginTop: 2 }}>
                Certs issued for your domains by unrecognised CAs. Review immediately — possible phishing or shadow IT.
              </div>
            </div>
          </div>
        )}

        {flagged === 0 && !loading && shadows.length > 0 && (
          <div style={{ background: 'transparent', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 10,
            padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Shield size={15} color="#16a34a" style={{ flexShrink: 0 }}/>
            <div style={{ fontSize:13, color: '#ffffff', fontWeight: 500 }}>
              All detected certs are known and accounted for
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total detected', val: classified.length,            color: '#ffffff' },
            { label: 'Flagged',        val: flagged,                       color: '#f87171'         },
            { label: 'Suspicious',     val: counts.suspicious || 0,        color: '#ffffff'         },
            { label: 'Known / safe',   val: counts.known || 0,             color: '#4ade80'         },
          ].map(({ label, val, color }) => (
            <div key={label} className="v2-card" style={{ padding: '12px 14px', cursor: 'pointer' }}
              onClick={() => setFilter(label === 'Total detected' ? 'all'
                : label === 'Flagged' ? 'flagged'
                : label === 'Suspicious' ? 'suspicious' : 'known')}>
              <div style={{ fontSize:24, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color: '#b0a8a0', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter + search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 1, border: '0.5px solid var(--v2-border)', borderRadius: 8, overflow: 'hidden' }}>
            {[
              { key: 'all',        label: 'All' },
              { key: 'flagged',    label: 'Flagged' },
              { key: 'suspicious', label: 'Suspicious' },
              { key: 'known',      label: 'Known' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => { setFilter(key); setSelected(null) }}
                style={{ padding: '7px 12px', fontSize:11, fontWeight: filter === key ? 500 : 400,
                  background: filter === key ? 'var(--v2-surface-3)' : 'none',
                  border: 'none', cursor: 'pointer', color: filter === key ? 'var(--v2-text)' : 'var(--v2-text-3)' }}>
                {label}
                {key !== 'all' && (
                  <span style={{ marginLeft: 4, fontSize:10, color: '#b0a8a0' }}>
                    ({key === 'flagged' ? flagged : key === 'suspicious' ? (counts.suspicious||0) : (counts.known||0)})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', minWidth: 160 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#b0a8a0', pointerEvents: 'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search domain, CA, org…"
              style={{ width: '100%', paddingLeft: 30, fontSize:12, boxSizing: 'border-box' }}/>
          </div>
          <span style={{ fontSize:11, color: '#b0a8a0', flexShrink: 0 }}>
            {filtered.length} of {classified.length}
          </span>
        </div>

        {/* Main table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#b0a8a0' }}>
            <RefreshCw size={22} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 10px', display: 'block' }}/>
            Loading CT data…
          </div>
        ) : filtered.length === 0 ? (
          <div className="v2-card" style={{ padding: '40px', textAlign: 'center' }}>
            <Shield size={28} style={{ color: '#b0a8a0', margin: '0 auto 10px', display: 'block' }}/>
            <div style={{ fontSize:13, fontWeight: 500, color: '#e8e0d8', marginBottom: 4 }}>
              {shadows.length === 0 ? 'No CT data yet' : 'No results match your filter'}
            </div>
            <div style={{ fontSize:12, color: '#b0a8a0' }}>
              {shadows.length === 0
                ? 'Connect DigiCert or run a shadow scan to populate CT findings.'
                : 'Try clearing your search or filter.'}
            </div>
          </div>
        ) : (
          <>
            <div className="v2-card" style={{ padding: 0, overflow: 'hidden', marginBottom: selected ? 0 : 0 }}>
              {/* Table head */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 120px 100px 90px 90px 80px',
                padding: '8px 16px', background: 'var(--v2-surface-3)',
                borderBottom: '0.5px solid var(--v2-border)' }}>
                {['Domain', 'Issuing CA', 'Org', 'Issued', 'Expires', 'Status'].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight: 600, color: '#b0a8a0',
                    textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</div>
                ))}
              </div>

              {filtered.map((s, i) => {
                const cfg = STATUS_CONFIG[s._status] || STATUS_CONFIG.unknown
                const isSelected = selected === s.id
                const isLast = i === filtered.length - 1
                return (
                  <div key={s.id}
                    onClick={() => setSelected(isSelected ? null : s.id)}
                    style={{ display: 'grid', gridTemplateColumns: '1.8fr 120px 100px 90px 90px 80px',
                      padding: '10px 16px', cursor: 'pointer', alignItems: 'center',
                      background: isSelected ? cfg.bg : 'var(--v2-bg)',
                      borderBottom: isLast ? 'none' : '0.5px solid var(--v2-border)',
                      borderLeft: `3px solid ${isSelected || s._status !== 'known' ? cfg.leftBorder : 'transparent'}`,
                      transition: 'background .12s' }}>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize:12, fontWeight: 500, color: '#ffffff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.domain}
                      </div>
                      {s.serial_number && (
                        <div style={{ fontSize:10, color: '#b0a8a0', fontFamily: 'monospace', marginTop: 1 }}>
                          {s.serial_number.slice(0, 20)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:11, color: '#e8e0d8' }}>{s.ca_type || '—'}</div>
                    <div style={{ fontSize:11, color: '#e8e0d8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.org_name || '—'}
                    </div>
                    <div style={{ fontSize:11, color: '#e8e0d8' }}>{fmtDate(s.issued_at)}</div>
                    <div style={{ fontSize:11, color: '#e8e0d8' }}>{fmtDate(s.expires_at)}</div>
                    <div><StatusBadge status={s._status}/></div>
                  </div>
                )
              })}
            </div>

            {/* Detail panel */}
            {selectedShadow && (
              <div style={{ marginTop: 6 }}>
                <DetailPanel
                  shadow={selectedShadow}
                  status={selectedShadow._status}
                  onDismiss={dismiss}
                  onMark={markStatus}
                  onClose={() => setSelected(null)}
                  dismissing={dismissing}
                />
              </div>
            )}
          </>
        )}

        {/* Watched domains panel */}
        <div className="v2-card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <button onClick={() => setShowWatched(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: showWatched ? '0.5px solid var(--v2-border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="var(--v2-accent)"/>
              <span style={{ fontSize:13, fontWeight: 500, color: '#ffffff' }}>
                Watched domains
              </span>
              <span style={{ fontSize:11, color: '#b0a8a0' }}>
                {watchDomains.length} domain{watchDomains.length !== 1 ? 's' : ''} monitored
              </span>
            </div>
            {showWatched ? <ChevronUp size={14} color="var(--v2-text-3)"/> : <ChevronDown size={14} color="var(--v2-text-3)"/>}
          </button>

          {showWatched && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize:12, color: '#b0a8a0', marginBottom: 10, lineHeight: 1.5 }}>
                SSLVault monitors CT logs for these domains and alerts you when new certs are detected from unknown CAs.
              </div>

              {/* Add domain */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addWatchDomain()}
                  placeholder="Add domain to watch (e.g. yourdomain.com)"
                  style={{ flex: 1, fontSize:12 }}/>
                <button className="v2-btn v2-btn-sm" onClick={addWatchDomain}
                  disabled={addingDomain || !newDomain.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {addingDomain
                    ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }}/>
                    : <Plus size={11}/>}
                  Watch
                </button>
              </div>

              {/* Domain list */}
              {watchDomains.length === 0 ? (
                <div style={{ fontSize:12, color: '#b0a8a0', textAlign: 'center', padding: '12px 0' }}>
                  No domains being watched. Add one above.
                </div>
              ) : (
                watchDomains.map(w => {
                  const domainShadows = classified.filter(s => s.domain === w.domain)
                  const hasFlagged = domainShadows.some(s => s._status === 'unknown' || s._status === 'phishing')
                  const hasSuspicious = domainShadows.some(s => s._status === 'suspicious')
                  const dotColor = hasFlagged ? '#f87171' : hasSuspicious ? '#f0ede8' : '#4ade80'
                  const hasCaa = false // Would be fetched from ssl_health_scores

                  return (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor,
                        flexShrink: 0, animation: !hasFlagged && !hasSuspicious ? 'ctpulse 2.5s ease infinite' : 'none' }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize:12, fontWeight: 500, color: '#ffffff' }}>{w.domain}</div>
                        <div style={{ fontSize:10, color: '#b0a8a0', marginTop: 1 }}>
                          {domainShadows.length} cert{domainShadows.length !== 1 ? 's' : ''} detected ·
                          Added {timeAgo(w.created_at)}
                        </div>
                      </div>
                      <div style={{ fontSize:10, color: hasFlagged ? '#f87171' : hasSuspicious ? '#f0ede8' : '#4ade80',
                        fontWeight: 500 }}>
                        {hasFlagged ? '⚠ Action needed' : hasSuspicious ? '○ Review' : '✓ All clear'}
                      </div>
                      <button onClick={() => removeWatchDomain(w.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: '#b0a8a0', padding: 4, display: 'flex' }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

      </div>
      <style>{`
        @keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }
        @keyframes ctpulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </div>
  )
}
