// SslMonitor.jsx — SSL Monitor, house style (PageHero + design-v2), simple & clean.
// Watch domains → daily auto-scan → grade + expiry + readiness → email alerts → one-tap Deep Scan.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import PageHero from '../components/PageHero'
import {
  RefreshCw, Trash2, Pause, Play, Search, Plus, X, ChevronDown, ChevronUp,
  CheckCircle, XCircle, ShieldCheck, AlertTriangle, Zap, Globe,
} from 'lucide-react'
import '../styles/design-v2.css'

function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function gradeStyle(g) {
  if (g === 'A+') return { color: '#fff', bg: '#00a550', border: '#00a550' }
  if (g === 'A')  return { color: '#00a550', bg: 'rgba(0,165,80,0.10)', border: 'rgba(0,165,80,0.3)' }
  if (g === 'B')  return { color: '#0077b6', bg: 'rgba(0,119,182,0.08)', border: 'rgba(0,119,182,0.25)' }
  if (g === 'C' || g === 'D') return { color: '#9a6400', bg: 'rgba(154,100,0,0.08)', border: 'rgba(154,100,0,0.3)' }
  if (g === 'F')  return { color: '#b03425', bg: 'rgba(176,52,37,0.08)', border: 'rgba(176,52,37,0.3)' }
  return { color: '#7a8694', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.1)' }
}

const daysColor = d =>
  d === null || d === undefined ? '#7a8694' :
  d <= 7 ? '#b03425' : d <= 30 ? '#9a6400' : '#00a550'

const sevColor = s => ({ CRITICAL: '#b03425', HIGH: '#d14829', MEDIUM: '#9a6400', LOW: '#7a8694' }[s] || '#7a8694')

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

function Check({ ok, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: ok ? '#00a550' : '#b03425' }}>
      {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}{label}
    </span>
  )
}

export default function SslMonitor({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [busy, setBusy] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [history, setHistory] = useState({})
  const [deep, setDeep] = useState({})
  const [deepBusy, setDeepBusy] = useState({})
  const [error, setError] = useState('')
  const [discOpen, setDiscOpen] = useState(false)
  const [discDomain, setDiscDomain] = useState('')
  const [discLoading, setDiscLoading] = useState(false)
  const [discResults, setDiscResults] = useState(null)
  const [discAdding, setDiscAdding] = useState({})
  const isMobile = useIsMobile()

  const invoke = useCallback(async (body) => {
    const { data, error: e } = await supabase.functions.invoke('ssl-monitor', { body })
    if (e) throw new Error(e.message || 'request failed')
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  const load = useCallback(async () => {
    const { data } = await supabase.from('monitored_domains')
      .select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addDomain = async (domain, fromDiscover = false) => {
    const d = (domain || '').trim().toLowerCase()
    if (!d) return
    setError('')
    if (fromDiscover) setDiscAdding(p => ({ ...p, [d]: true })); else setAdding(true)
    try {
      await invoke({ action: 'add', domain: d, auto_added: fromDiscover })
      if (!fromDiscover) setNewDomain('')
      if (fromDiscover) setDiscResults(p => p && ({ ...p, subdomains: p.subdomains.map(s => s.name === d ? { ...s, monitored: true } : s) }))
      await load()
    } catch (e) { setError(e.message) }
    if (fromDiscover) setDiscAdding(p => ({ ...p, [d]: false })); else setAdding(false)
  }

  const scanOne = async (row) => {
    setBusy(p => ({ ...p, [row.id]: 'scan' })); setError('')
    try { await invoke({ action: 'scan_one', domain_id: row.id }); await load(); if (expanded === row.id) loadHistory(row.id, true) }
    catch (e) { setError(e.message) }
    setBusy(p => ({ ...p, [row.id]: null }))
  }

  const toggle = async (row) => {
    setBusy(p => ({ ...p, [row.id]: 'toggle' }))
    try { await invoke({ action: 'toggle', domain_id: row.id, active: !row.active }); await load() }
    catch (e) { setError(e.message) }
    setBusy(p => ({ ...p, [row.id]: null }))
  }

  const remove = async (row) => {
    if (!window.confirm(`Stop monitoring ${row.domain}?`)) return
    setBusy(p => ({ ...p, [row.id]: 'del' }))
    try { await invoke({ action: 'remove', domain_id: row.id }); await load() }
    catch (e) { setError(e.message) }
    setBusy(p => ({ ...p, [row.id]: null }))
  }

  const loadHistory = async (id, force = false) => {
    if (history[id] && !force) return
    const { data } = await supabase.from('monitor_scan_history')
      .select('*').eq('domain_id', id).order('scanned_at', { ascending: false }).limit(12)
    setHistory(p => ({ ...p, [id]: data || [] }))
  }

  const loadDeep = useCallback(async (id) => {
    try { const r = await invoke({ action: 'deep_status', domain_id: id }); setDeep(p => ({ ...p, [id]: r.scan })); return r.scan }
    catch { return null }
  }, [invoke])

  const expand = (id) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) { loadHistory(next); loadDeep(next) }
  }

  const pollDeep = (id) => {
    let n = 0
    const iv = setInterval(async () => {
      n++
      const scan = await loadDeep(id)
      if (!scan || ['done', 'error'].includes(scan.status) || n > 80) clearInterval(iv)
    }, 6000)
  }

  const runDeep = async (id) => {
    setDeepBusy(p => ({ ...p, [id]: true })); setError('')
    try { const r = await invoke({ action: 'deep_scan', domain_id: id }); setDeep(p => ({ ...p, [id]: r.scan })); pollDeep(id) }
    catch (e) { setError(e.message) }
    setDeepBusy(p => ({ ...p, [id]: false }))
  }

  const discover = async () => {
    const d = (discDomain || '').trim().toLowerCase()
    if (!d) return
    setDiscLoading(true); setDiscResults(null); setError('')
    try { setDiscResults(await invoke({ action: 'discover', domain: d })) }
    catch (e) { setError(e.message) }
    setDiscLoading(false)
  }

  const total    = rows.length
  const healthy  = rows.filter(r => r.tls_grade === 'A+' || r.tls_grade === 'A').length
  const expiring = rows.filter(r => typeof r.last_days_left === 'number' && r.last_days_left > 0 && r.last_days_left <= 30).length
  const issues   = rows.filter(r => r.last_alive === false || (typeof r.last_days_left === 'number' && r.last_days_left <= 0) || r.tls_grade === 'F').length

  const btnGhost = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#3d4a58', cursor: 'pointer' }

  const DeepReport = ({ row }) => {
    const scan = deep[row.id]
    const running = scan && (scan.status === 'pending' || scan.status === 'running')
    const s = scan?.summary || {}
    return (
      <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(0,119,182,0.03)', border: '1px solid rgba(0,119,182,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Zap size={14} color="#0077b6" />
          <span className="v2-label">Deep scan</span>
          {scan?.status === 'done' && scan.grade && <span style={{ fontWeight: 800, fontSize: 13, color: gradeStyle(scan.grade).color }}>Grade {scan.grade}</span>}
          <button className="v2-btn v2-btn-primary v2-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => runDeep(row.id)} disabled={running || deepBusy[row.id]}>
            {running ? 'Scanning…' : scan?.status === 'done' ? 'Re-run' : 'Run deep scan'}
          </button>
        </div>

        {!scan && <p style={{ fontSize: 12, color: '#5a6776', margin: '10px 0 0', lineHeight: 1.5 }}>
          A full TLS exam — every protocol and cipher tested live, plus Heartbleed, POODLE, ROBOT and more, with severity ratings. Runs free, takes 2–5 min.
        </p>}
        {running && <p style={{ fontSize: 12, color: '#0077b6', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={13} style={{ animation: 'svmSpin 1s linear infinite' }} /> Running — the report appears here automatically.
        </p>}
        {scan?.status === 'error' && <p style={{ fontSize: 12, color: '#b03425', margin: '10px 0 0' }}>Scan failed. Please try again.</p>}

        {scan?.status === 'done' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(k => (
                <span key={k} style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: (s.counts?.[k] || 0) ? sevColor(k) : '#9aa5b1', background: (s.counts?.[k] || 0) ? `${sevColor(k)}14` : 'transparent', border: `1px solid ${(s.counts?.[k] || 0) ? sevColor(k) + '55' : 'rgba(0,0,0,0.08)'}` }}>{s.counts?.[k] || 0} {k}</span>
              ))}
            </div>
            {!!(s.protocols?.length) && (
              <div style={{ marginBottom: 12 }}>
                <div className="v2-label" style={{ marginBottom: 6 }}>Protocols</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.protocols.map(p => (
                    <span key={p.name} style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, color: p.ok ? '#00a550' : '#b03425', background: p.ok ? 'rgba(0,165,80,0.08)' : 'rgba(176,52,37,0.08)', border: `1px solid ${p.ok ? 'rgba(0,165,80,0.25)' : 'rgba(176,52,37,0.3)'}` }}>{p.name} · {p.offered ? 'on' : 'off'}</span>
                  ))}
                </div>
              </div>
            )}
            {!!(s.vulns?.length) && (
              <div style={{ marginBottom: 12 }}>
                <div className="v2-label" style={{ marginBottom: 6 }}>Vulnerabilities</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 5 }}>
                  {s.vulns.map(v => (
                    <span key={v.name} title={v.note} style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', gap: 6, color: v.vulnerable ? '#b03425' : '#00a550', background: v.vulnerable ? 'rgba(176,52,37,0.08)' : 'rgba(0,165,80,0.06)', border: `1px solid ${v.vulnerable ? 'rgba(176,52,37,0.3)' : 'rgba(0,165,80,0.2)'}` }}><span>{v.name}</span><span>{v.vulnerable ? '✗' : '✓'}</span></span>
                  ))}
                </div>
              </div>
            )}
            {!!(s.findings?.length) && (
              <div>
                <div className="v2-label" style={{ marginBottom: 6 }}>Findings ({s.total_findings})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {s.findings.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, padding: '5px 9px', background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800, color: sevColor(f.severity), minWidth: 56 }}>{f.severity}</span>
                      <span style={{ color: '#3d4a58' }}>{f.finding}{f.cve ? ` (${f.cve})` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const Row = ({ row }) => {
    const gs = gradeStyle(row.tls_grade)
    const open = expanded === row.id
    return (
      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 10, background: '#fff', opacity: row.active ? 1 : 0.6, boxShadow: open ? '0 6px 20px rgba(0,40,65,0.08)' : 'none' }}>
        <div onClick={() => expand(row.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 14px' : '14px 16px', cursor: 'pointer', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: gs.bg, border: `1px solid ${gs.border}` }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: gs.color, fontFamily: "'DM Sans',sans-serif" }}>{row.tls_grade || '—'}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.domain}</span>
              {!row.active && <span style={{ fontSize: 9, fontWeight: 700, color: '#7a8694', fontFamily: 'monospace', letterSpacing: '.08em' }}>PAUSED</span>}
              {row.cert_changed_at && <AlertTriangle size={12} color="#9a6400" />}
              {row.last_alive === false && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(176,52,37,0.1)', color: '#b03425' }}>UNREACHABLE</span>}
            </div>
            <div style={{ fontSize: 11, color: '#7a8694', marginTop: 3, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.issuer || 'issuer unknown'} · scanned {timeAgo(row.last_scanned_at)}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 7, flexWrap: 'wrap' }}>
              <Check ok={!!row.hsts} label="HSTS" />
              <Check ok={!!row.caa} label="CAA" />
              <Check ok={!row.mixed_content} label="No mixed" />
              {row.readiness_score === 100 && <span style={{ fontSize: 11, color: '#00a550', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={12} />Auto</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: daysColor(row.last_days_left), lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>
              {row.last_days_left === null || row.last_days_left === undefined ? '—' : row.last_days_left <= 0 ? 'EXP' : row.last_days_left}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9aa5b1', fontFamily: 'monospace', letterSpacing: '.1em', marginTop: 3 }}>{(row.last_days_left ?? 1) <= 0 ? 'EXPIRED' : 'DAYS LEFT'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button title="Scan now" onClick={() => scanOne(row)} disabled={!!busy[row.id]} style={btnGhost}><RefreshCw size={14} style={busy[row.id] === 'scan' ? { animation: 'svmSpin 1s linear infinite' } : {}} /></button>
            <button title={row.active ? 'Pause' : 'Resume'} onClick={() => toggle(row)} disabled={!!busy[row.id]} style={btnGhost}>{row.active ? <Pause size={14} /> : <Play size={14} />}</button>
            <button title="Remove" onClick={() => remove(row)} disabled={!!busy[row.id]} style={{ ...btnGhost, color: '#b03425' }}><Trash2 size={14} /></button>
            <button style={btnGhost} onClick={() => expand(row.id)}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          </div>
        </div>

        {open && (
          <div style={{ padding: isMobile ? '0 14px 14px' : '0 16px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11.5, color: '#5a6776', padding: '12px 0' }}>
              {row.cert_expiry && <span>Expires · <strong style={{ color: '#3d4a58' }}>{new Date(row.cert_expiry).toDateString()}</strong></span>}
              <span>Readiness · <strong style={{ color: '#3d4a58' }}>{row.readiness_score ?? '—'}/100</strong></span>
              {row.cert_changed_at && <span style={{ color: '#9a6400', fontWeight: 700 }}>Cert changed {timeAgo(row.cert_changed_at)}</span>}
            </div>
            {history[row.id]?.length > 0 && (
              <>
                <div className="v2-label" style={{ marginBottom: 6 }}>Scan history</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexWrap: 'wrap' }}>
                  {[...history[row.id]].reverse().map(h => {
                    const c = gradeStyle(h.grade)
                    return (
                      <div key={h.id} title={`${new Date(h.scanned_at).toLocaleString()} · ${h.grade || '—'} · ${h.days_left ?? '—'}d`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 12, height: Math.max(10, (h.score || 5) * 0.32), borderRadius: 3, background: c.color === '#fff' ? '#00a550' : c.color, opacity: h.alive ? 1 : 0.35 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#9aa5b1' }}>{timeAgo(h.scanned_at).replace(' ago', '')}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <DeepReport row={row} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="v2-page">
      <style>{`@keyframes svmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      <PageHero
        eyebrow="SSL Monitor"
        title="Certificate"
        titleAccent="monitoring"
        subtitle="Add any domain and SSLVault scans it every day — emailing you before a certificate expires, the site goes down, or a certificate changes unexpectedly. Run a free deep TLS scan any time."
        stats={[
          { n: total, l: 'Monitored' },
          { n: healthy, l: 'Healthy' },
          { n: expiring, l: 'Expiring ≤30d' },
          { n: issues, l: 'Issues' },
        ]}
        tags={['Daily auto-scan', 'Email alerts', '47-day readiness', 'Deep TLS scan', 'Subdomain discovery']}
      />

      <div className="v2-container" style={{ paddingTop: 24, paddingBottom: 60 }}>
        <div style={{ display: 'flex', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Globe size={15} color="#7a8694" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !adding && addDomain(newDomain)}
              placeholder="Add a domain to monitor — example.com"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 36px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.15)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <button className="v2-btn v2-btn-primary" onClick={() => addDomain(newDomain)} disabled={adding || !newDomain.trim()}>
            {adding ? 'Scanning…' : <><Plus size={15} style={{ verticalAlign: -3, marginRight: 4 }} />Monitor</>}
          </button>
          <button className="v2-btn" onClick={() => { setDiscOpen(true); setDiscResults(null); setDiscDomain('') }}>
            <Search size={14} style={{ verticalAlign: -2, marginRight: 5 }} />Discover subdomains
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '9px 13px', borderRadius: 9, background: 'rgba(176,52,37,0.08)', border: '1px solid rgba(176,52,37,0.25)', color: '#b03425', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} />{error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b03425', cursor: 'pointer' }}><X size={13} /></button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#7a8694', fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', border: '1px dashed rgba(0,119,182,0.3)', borderRadius: 12, background: 'rgba(0,119,182,0.02)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>No domains monitored yet</div>
            <div style={{ fontSize: 12.5, color: '#5a6776', marginTop: 6 }}>Add your first domain above — it gets scanned instantly and watched daily.</div>
          </div>
        ) : (
          rows.map(row => <Row key={row.id} row={row} />)
        )}

        <div style={{ marginTop: 18, padding: '12px 16px', borderRadius: 12, background: 'rgba(0,119,182,0.05)', border: '1px solid rgba(0,119,182,0.15)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Zap size={16} color="#0077b6" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#3d4a58', lineHeight: 1.5 }}>
            <strong>The 47-day era is coming.</strong> Max certificate lifetimes drop to 100 days in 2027 and 47 days in 2029. The Readiness score shows how prepared each domain is — domains automated through SSLVault score 100.
          </span>
        </div>
      </div>

      {discOpen && (
        <div onClick={() => setDiscOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,17,23,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: 560, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="v2-h2">Discover subdomains</h2>
              <button onClick={() => setDiscOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#7a8694' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: '#5a6776', marginTop: 0, lineHeight: 1.55 }}>
              SSLVault searches public Certificate Transparency logs and finds every subdomain that has ever had a certificate — including ones you forgot about.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={discDomain} onChange={e => setDiscDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && !discLoading && discover()} placeholder="example.com" style={{ flex: 1, padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              <button className="v2-btn v2-btn-primary" onClick={discover} disabled={discLoading || !discDomain.trim()}>{discLoading ? 'Searching…' : 'Search'}</button>
            </div>
            {discLoading && <div style={{ fontSize: 12.5, color: '#7a8694' }}>Querying CT logs — this can take ~10 seconds…</div>}
            {discResults && (discResults.subdomains.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#7a8694' }}>No certificates found in CT logs for this domain.</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}>
                {discResults.subdomains.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 12.5, fontFamily: 'monospace' }}>
                    <ShieldCheck size={13} color="#0077b6" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#3d4a58' }}>{s.name}</span>
                    {s.monitored ? <span style={{ fontSize: 10, fontWeight: 700, color: '#00a550' }}>MONITORED ✓</span>
                      : <button className="v2-btn v2-btn-sm" onClick={() => addDomain(s.name, true)} disabled={!!discAdding[s.name]}>{discAdding[s.name] ? 'Adding…' : '+ Monitor'}</button>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
