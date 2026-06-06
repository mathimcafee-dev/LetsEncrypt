// SslMonitor.jsx — "Certificate Radar" · fresh console design
// Dark command deck (animated radar sweep + terminal-style input) over light signal cards
// with conic score rings and large expiry countdowns. Logic: ssl-monitor edge fn.
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, Trash2, Pause, Play, Search, X, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { F, DM, MONO, BLUE, BLUE2, LINE, BODY, MUTED, MUTED2, GRN, AMB, RED, GRAD, Modal, inputStyle } from '../components/AppKit'

const INK2 = '#0d1117'

function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const gradeColor = g =>
  g === 'A+' || g === 'A' ? GRN :
  g === 'B' ? BLUE :
  g === 'C' || g === 'D' ? '#c77800' : RED

const daysColor = d =>
  d === null || d === undefined ? MUTED2 :
  d <= 0 ? RED : d <= 7 ? RED : d <= 30 ? '#c77800' : GRN

const sevColor = s => ({ CRITICAL: '#b03425', HIGH: '#d14829', MEDIUM: '#c77800', LOW: '#7a8694' }[s] || MUTED2)

function useIsMobile(bp = 820) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

/* ── circular score ring with grade in the middle ── */
function ScoreRing({ score, grade, size = 58 }) {
  const c = gradeColor(grade)
  const pct = Math.max(0, Math.min(100, score ?? 0))
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${c} ${pct * 3.6}deg, ${LINE} 0deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: size - 11, height: size - 11, borderRadius: '50%', background: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: DM, fontWeight: 900, fontSize: size * 0.3, color: c, lineHeight: 1, letterSpacing: '-0.03em' }}>{grade || '—'}</span>
      </div>
    </div>
  )
}

/* ── tiny mono status chip ── */
function Chip({ ok, label }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.07em',
      padding: '2.5px 7px', borderRadius: 5,
      color: ok ? GRN : RED,
      background: ok ? 'rgba(0,165,80,0.08)' : 'rgba(176,52,37,0.08)',
      border: `1px solid ${ok ? 'rgba(0,165,80,0.25)' : 'rgba(176,52,37,0.25)'}`,
    }}>{label}</span>
  )
}

/* ── radar sweep animation (pure CSS) ── */
function RadarSweep({ size = 110 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {[0.36, 0.62, 0.88].map((r, i) => (
        <div key={i} style={{
          position: 'absolute', inset: `${(1 - r) * 50}%`,
          borderRadius: '50%', border: '1px solid rgba(0,145,214,0.28)',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'conic-gradient(from 0deg, rgba(0,145,214,0.55), rgba(0,145,214,0.0) 70deg, transparent 360deg)',
        animation: 'svmSweep 3.4s linear infinite',
      }} />
      <div style={{ position: 'absolute', inset: '47%', borderRadius: '50%', background: BLUE2, boxShadow: '0 0 12px rgba(0,145,214,0.9)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(0,145,214,0.35)', animation: 'svmPing 2.6s ease-out infinite' }} />
    </div>
  )
}

/* ── deck stat ── */
function DeckStat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, alignSelf: 'center', flexShrink: 0 }} />
      <span style={{ fontFamily: DM, fontWeight: 900, fontSize: 21, color: '#fff', lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{label}</span>
    </div>
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
  const [error, setError] = useState('')
  const [discOpen, setDiscOpen] = useState(false)
  const [discDomain, setDiscDomain] = useState('')
  const [discLoading, setDiscLoading] = useState(false)
  const [discResults, setDiscResults] = useState(null)
  const [discAdding, setDiscAdding] = useState({})
  const [deep, setDeep] = useState({})        // domain_id -> latest deep scan row
  const [deepBusy, setDeepBusy] = useState({})
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
    if (fromDiscover) setDiscAdding(p => ({ ...p, [d]: true }))
    else setAdding(true)
    try {
      await invoke({ action: 'add', domain: d, auto_added: fromDiscover })
      if (!fromDiscover) setNewDomain('')
      if (fromDiscover) setDiscResults(p => p && ({ ...p, subdomains: p.subdomains.map(s => s.name === d ? { ...s, monitored: true } : s) }))
      await load()
    } catch (e) { setError(e.message) }
    if (fromDiscover) setDiscAdding(p => ({ ...p, [d]: false }))
    else setAdding(false)
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

  const expand = (id) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) { loadHistory(next); loadDeep(next) }
  }

  const loadDeep = useCallback(async (id) => {
    try { const r = await invoke({ action: 'deep_status', domain_id: id }); setDeep(p => ({ ...p, [id]: r.scan })); return r.scan }
    catch { return null }
  }, [invoke])

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
    try {
      const r = await invoke({ action: 'deep_scan', domain_id: id })
      setDeep(p => ({ ...p, [id]: r.scan }))
      pollDeep(id)
    } catch (e) { setError(e.message) }
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

  /* ── expanded detail panel ── */
  const Detail = ({ row }) => (
    <div style={{ borderTop: `1px dashed ${LINE}`, padding: '14px 18px 16px', background: 'linear-gradient(180deg, rgba(0,119,182,0.025), transparent)' }}>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 11.5, color: MUTED, fontFamily: F, marginBottom: 14 }}>
        <span>Issuer · <strong style={{ color: BODY }}>{row.issuer || 'unknown'}</strong></span>
        {row.cert_expiry && <span>Expires · <strong style={{ color: BODY }}>{new Date(row.cert_expiry).toDateString()}</strong></span>}
        <span>Readiness · <strong style={{ color: BODY }}>{row.readiness_score ?? '—'}/100</strong></span>
        {row.cert_changed_at && (
          <span style={{ color: '#c77800', fontWeight: 700 }}>
            <AlertTriangle size={11} style={{ verticalAlign: -1.5, marginRight: 3 }} />
            cert changed {timeAgo(row.cert_changed_at)}
          </span>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: MUTED2, marginBottom: 8 }}>SCAN TIMELINE</div>
      {!history[row.id] ? (
        <span style={{ fontSize: 12, color: MUTED2 }}>Loading…</span>
      ) : history[row.id].length === 0 ? (
        <span style={{ fontSize: 12, color: MUTED2 }}>First scan recorded — the daily timeline builds from here.</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
          {[...history[row.id]].reverse().map(h => (
            <div key={h.id} title={`${new Date(h.scanned_at).toLocaleString()} · ${h.grade || '—'} · ${h.days_left ?? '—'}d`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 13, height: Math.max(10, (h.score || 5) * 0.34), borderRadius: 3,
                background: gradeColor(h.grade), opacity: h.alive ? 1 : 0.35,
              }} />
              <span style={{ fontFamily: MONO, fontSize: 8, color: MUTED2 }}>{timeAgo(h.scanned_at).replace(' ago', '')}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Deep Scan ── */}
      <DeepPanel row={row} />
    </div>
  )

  const DeepPanel = ({ row }) => {
    const scan = deep[row.id]
    const running = scan && (scan.status === 'pending' || scan.status === 'running')
    const s = scan?.summary || {}
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: MUTED2 }}>DEEP SCAN</span>
          {scan?.status === 'done' && scan.grade && (
            <span style={{ fontFamily: DM, fontWeight: 900, fontSize: 13, color: gradeColor(scan.grade) }}>Grade {scan.grade}</span>
          )}
          <button onClick={() => runDeep(row.id)} disabled={running || deepBusy[row.id]} style={{
            marginLeft: 'auto', fontFamily: DM, fontWeight: 800, fontSize: 11.5,
            background: running ? 'rgba(0,119,182,0.1)' : GRAD, color: running ? BLUE : '#fff',
            border: 'none', borderRadius: 9, padding: '8px 16px', cursor: running ? 'default' : 'pointer',
          }}>
            {running ? 'Scanning…' : scan?.status === 'done' ? 'Re-run deep scan' : 'Run deep scan'}
          </button>
        </div>

        {!scan && (
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            A full TLS exam: every protocol and cipher tested live, plus Heartbleed, POODLE, ROBOT and other vulnerability checks — with fixes. Runs on a free cloud runner (~2–5 min).
          </p>
        )}
        {running && (
          <div style={{ fontSize: 11.5, color: BLUE, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={13} style={{ animation: 'svmSpin 1s linear infinite' }} />
            Queued on a free runner — this takes a few minutes. The report appears here automatically.
          </div>
        )}
        {scan?.status === 'error' && (
          <div style={{ fontSize: 11.5, color: RED }}>Scan failed: {scan.error || 'unknown error'}. Try again.</div>
        )}

        {scan?.status === 'done' && (
          <div>
            {/* severity counts */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(k => (
                <span key={k} style={{
                  fontFamily: MONO, fontSize: 9.5, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
                  color: (s.counts?.[k] || 0) ? sevColor(k) : MUTED2,
                  background: (s.counts?.[k] || 0) ? `${sevColor(k)}14` : 'transparent',
                  border: `1px solid ${(s.counts?.[k] || 0) ? sevColor(k) + '55' : LINE}`,
                }}>{s.counts?.[k] || 0} {k}</span>
              ))}
            </div>

            {/* protocols */}
            {!!(s.protocols?.length) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', color: MUTED2, marginBottom: 6 }}>PROTOCOLS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.protocols.map(p => (
                    <span key={p.name} style={{
                      fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      color: p.ok ? GRN : RED, background: p.ok ? 'rgba(0,165,80,0.08)' : 'rgba(176,52,37,0.08)',
                      border: `1px solid ${p.ok ? 'rgba(0,165,80,0.25)' : 'rgba(176,52,37,0.3)'}`,
                    }}>{p.name} · {p.offered ? 'on' : 'off'}</span>
                  ))}
                </div>
              </div>
            )}

            {/* vulnerabilities */}
            {!!(s.vulns?.length) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', color: MUTED2, marginBottom: 6 }}>VULNERABILITIES</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 5 }}>
                  {s.vulns.map(v => (
                    <span key={v.name} title={v.note} style={{
                      fontFamily: MONO, fontSize: 9.5, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                      color: v.vulnerable ? RED : GRN, background: v.vulnerable ? 'rgba(176,52,37,0.08)' : 'rgba(0,165,80,0.06)',
                      border: `1px solid ${v.vulnerable ? 'rgba(176,52,37,0.3)' : 'rgba(0,165,80,0.2)'}`,
                      display: 'flex', justifyContent: 'space-between', gap: 6,
                    }}><span>{v.name}</span><span>{v.vulnerable ? '✗' : '✓'}</span></span>
                  ))}
                </div>
              </div>
            )}

            {/* findings */}
            {!!(s.findings?.length) && (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', color: MUTED2, marginBottom: 6 }}>FINDINGS ({s.total_findings})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
                  {s.findings.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, fontFamily: F, padding: '5px 9px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 7 }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 800, color: sevColor(f.severity), minWidth: 56 }}>{f.severity}</span>
                      <span style={{ color: BODY, flex: 1 }}>{f.finding}{f.cve ? ` (${f.cve})` : ''}</span>
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

  /* ── one signal card ── */
  const SignalCard = ({ row }) => {
    const dc = daysColor(row.last_days_left)
    const open = expanded === row.id
    return (
      <div style={{
        background: '#fff', borderRadius: 16,
        border: row.active ? '1px solid rgba(0,119,182,0.12)' : `1.5px dashed ${LINE}`,
        boxShadow: open ? '0 10px 32px rgba(0,40,65,0.10)' : '0 2px 10px rgba(0,40,65,0.05)',
        opacity: row.active ? 1 : 0.6, transition: 'box-shadow .18s, transform .18s',
        overflow: 'hidden',
      }}
        onMouseEnter={e => { if (!isMobile) e.currentTarget.style.transform = 'translateY(-1.5px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <div onClick={() => expand(row.id)} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 18, padding: isMobile ? '14px 14px' : '16px 20px', cursor: 'pointer', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <ScoreRing score={row.last_alive === false ? 0 : (history[row.id]?.[0]?.score ?? (row.tls_grade ? 80 : 0))} grade={row.tls_grade} size={isMobile ? 50 : 58} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: DM, fontWeight: 800, fontSize: isMobile ? 15 : 17, color: '#111', letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{row.domain}</span>
              {!row.active && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 800, letterSpacing: '.1em', color: MUTED2 }}>PAUSED</span>}
              {row.cert_changed_at && <AlertTriangle size={13} color="#c77800" title="Certificate recently changed" />}
              {row.last_alive === false && <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, color: RED, letterSpacing: '.08em' }}>● UNREACHABLE</span>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED2, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.issuer || 'issuer unknown'} · scanned {timeAgo(row.last_scanned_at)}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
              <Chip ok={!!row.hsts} label="HSTS" />
              <Chip ok={!!row.caa} label="CAA" />
              <Chip ok={!row.mixed_content} label={row.mixed_content ? 'MIXED' : 'CLEAN'} />
              {(history[row.id]?.[0]?.raw?.automated || row.readiness_score === 100) && <Chip ok label="AUTO" />}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
            <div style={{ fontFamily: DM, fontWeight: 900, fontSize: isMobile ? 24 : 30, color: dc, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {row.last_days_left === null || row.last_days_left === undefined ? '—' : row.last_days_left <= 0 ? 'EXP' : row.last_days_left}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.12em', color: MUTED2, marginTop: 3 }}>
              {row.last_days_left !== null && row.last_days_left !== undefined && row.last_days_left <= 0 ? 'EXPIRED' : 'DAYS LEFT'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button title="Scan now" onClick={() => scanOne(row)} disabled={!!busy[row.id]} style={iconBtn}>
              <RefreshCw size={14} style={busy[row.id] === 'scan' ? { animation: 'svmSpin 1s linear infinite' } : {}} />
            </button>
            <button title={row.active ? 'Pause' : 'Resume'} onClick={() => toggle(row)} disabled={!!busy[row.id]} style={iconBtn}>
              {row.active ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button title="Remove" onClick={() => remove(row)} disabled={!!busy[row.id]} style={{ ...iconBtn, color: RED }}>
              <Trash2 size={14} />
            </button>
            <button style={iconBtn} onClick={() => expand(row.id)}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          </div>
        </div>
        {open && <Detail row={row} />}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F }}>
      <style>{`
        @keyframes svmSweep { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes svmPing  { 0% { transform: scale(0.4); opacity: .8 } 100% { transform: scale(1.15); opacity: 0 } }
        @keyframes svmSpin  { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes svmBlink { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
        .svm-input::placeholder { color: rgba(255,255,255,0.32); }
      `}</style>

      {/* ════ COMMAND DECK ════ */}
      <div style={{
        position: 'relative', borderRadius: 20, padding: isMobile ? '20px 18px' : '26px 30px',
        background: `${INK2} repeating-linear-gradient(0deg, transparent 0 23px, rgba(0,145,214,0.05) 23px 24px), ${INK2} repeating-linear-gradient(90deg, transparent 0 23px, rgba(0,145,214,0.05) 23px 24px)`,
        backgroundColor: INK2, overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 16px 48px rgba(0,30,55,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 230 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 800, letterSpacing: '.22em', color: BLUE2, marginBottom: 9 }}>
              <span style={{ animation: 'svmBlink 1.8s infinite' }}>●</span>&nbsp; SSL MONITOR — LIVE WATCH
            </div>
            <h1 style={{ fontFamily: DM, fontWeight: 900, fontSize: isMobile ? 26 : 34, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Certificate Radar
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, margin: '9px 0 0', maxWidth: 480, lineHeight: 1.5 }}>
              Every domain on this radar is scanned daily. You get an email before anything expires, breaks, or changes without your knowledge.
            </p>
          </div>
          {!isMobile && <RadarSweep />}
        </div>

        {/* terminal input */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,145,214,0.35)',
            borderRadius: 12, padding: '0 14px',
          }}>
            <span style={{ fontFamily: MONO, color: BLUE2, fontWeight: 800, fontSize: 15 }}>▸</span>
            <input
              className="svm-input"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !adding && addDomain(newDomain)}
              placeholder="type a domain to watch — example.com"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: MONO, fontSize: 14, color: '#fff', padding: '13px 0', minWidth: 0,
              }}
            />
          </div>
          <button onClick={() => addDomain(newDomain)} disabled={adding || !newDomain.trim()} style={{
            fontFamily: DM, fontWeight: 800, fontSize: 13.5, letterSpacing: '.02em',
            background: GRAD, color: '#fff', border: 'none', borderRadius: 12,
            padding: '13px 26px', cursor: adding ? 'wait' : 'pointer',
            boxShadow: '0 6px 20px rgba(0,119,182,0.45)', opacity: (!newDomain.trim() && !adding) ? 0.55 : 1,
          }}>
            {adding ? 'SCANNING…' : <><Plus size={14} style={{ verticalAlign: -2, marginRight: 5 }} />WATCH</>}
          </button>
          <button onClick={() => { setDiscOpen(true); setDiscResults(null); setDiscDomain('') }} style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: '.06em',
            background: 'transparent', color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12,
            padding: '13px 18px', cursor: 'pointer',
          }}>
            <Search size={12} style={{ verticalAlign: -2, marginRight: 6 }} />DISCOVER SUBDOMAINS
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '9px 14px', borderRadius: 10, background: 'rgba(176,52,37,0.18)', border: '1px solid rgba(255,90,70,0.4)', color: '#ff9a8c', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} />{error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff9a8c', cursor: 'pointer' }}><X size={13} /></button>
          </div>
        )}

        {/* deck stats */}
        <div style={{ display: 'flex', gap: isMobile ? 18 : 34, marginTop: 22, flexWrap: 'wrap' }}>
          <DeckStat label="monitored" value={total}   color={BLUE2} />
          <DeckStat label="healthy"   value={healthy} color={GRN} />
          <DeckStat label="expiring"  value={expiring} color="#e8a33d" />
          <DeckStat label="issues"    value={issues}  color={issues ? '#ff5a46' : GRN} />
          <span style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: '.1em' }}>
            AUTO-SCAN DAILY · 04:30 UTC
          </span>
        </div>
      </div>

      {/* ════ SIGNAL CARDS ════ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED, fontSize: 13 }}>Tuning the radar…</div>
      ) : rows.length === 0 ? (
        <div style={{
          border: `2px dashed rgba(0,119,182,0.25)`, borderRadius: 20, padding: '52px 24px',
          textAlign: 'center', background: 'rgba(0,119,182,0.02)',
        }}>
          <div style={{ display: 'inline-block', marginBottom: 14 }}><RadarSweep size={84} /></div>
          <div style={{ fontFamily: DM, fontWeight: 900, fontSize: 19, color: '#111' }}>Radar is empty</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 7, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
            Type a domain in the console above. It gets scanned instantly, graded A+ to F, and watched every day from then on.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(row => <SignalCard key={row.id} row={row} />)}
        </div>
      )}

      {/* ════ 47-DAY TICKER ════ */}
      <div style={{
        marginTop: 20, borderRadius: 14, padding: '12px 18px',
        background: INK2, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        border: '1px solid rgba(0,145,214,0.3)',
      }}>
        <Zap size={15} color={BLUE2} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.7)', letterSpacing: '.04em' }}>
          MAX CERT LIFETIME COUNTDOWN
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {[['2026', '200d', true], ['2027', '100d', false], ['2029', '47d', false]].map(([y, d, done]) => (
            <span key={y} style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 7,
              color: done ? '#0d1117' : BLUE2, background: done ? BLUE2 : 'rgba(0,145,214,0.12)',
              border: `1px solid rgba(0,145,214,0.45)`, letterSpacing: '.05em',
            }}>{y} · {d}{done ? ' ✓' : ''}</span>
          ))}
        </div>
      </div>

      {/* ════ DISCOVER MODAL ════ */}
      <Modal open={discOpen} onClose={() => setDiscOpen(false)} title="Discover subdomains" width={560}>
        <p style={{ fontSize: 12.5, color: MUTED, marginTop: 0, lineHeight: 1.55 }}>
          SSLVault searches public Certificate Transparency logs and finds every subdomain that has ever been issued a certificate — including the ones you forgot about.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={discDomain}
            onChange={e => setDiscDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !discLoading && discover()}
            placeholder="example.com"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={discover} disabled={discLoading || !discDomain.trim()} style={{
            fontFamily: DM, fontWeight: 800, fontSize: 13, background: GRAD, color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
          }}>{discLoading ? 'Searching…' : 'Search'}</button>
        </div>
        {discLoading && <div style={{ fontSize: 12.5, color: MUTED2, padding: '8px 0' }}>Querying CT logs — this can take ~10 seconds…</div>}
        {discResults && (
          discResults.subdomains.length === 0 ? (
            <div style={{ fontSize: 12.5, color: MUTED2 }}>No certificates found in CT logs for this domain.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${LINE}`, borderRadius: 12 }}>
              {discResults.subdomains.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderBottom: `1px solid ${LINE}`, fontSize: 12.5, fontFamily: MONO }}>
                  <ShieldCheck size={13} color={BLUE} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: BODY }}>{s.name}</span>
                  {s.monitored
                    ? <span style={{ fontSize: 9.5, fontWeight: 800, color: GRN, fontFamily: MONO, letterSpacing: '.06em' }}>ON RADAR ✓</span>
                    : <button onClick={() => addDomain(s.name, true)} disabled={!!discAdding[s.name]} style={{
                        fontFamily: MONO, fontSize: 10, fontWeight: 800, color: BLUE,
                        background: 'rgba(0,119,182,0.07)', border: `1px solid rgba(0,119,182,0.3)`,
                        borderRadius: 7, padding: '4px 11px', cursor: 'pointer', letterSpacing: '.04em',
                      }}>{discAdding[s.name] ? 'ADDING…' : '+ WATCH'}</button>}
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  )
}

const iconBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(0,119,182,0.15)',
  background: '#fff', color: '#3d4a58', cursor: 'pointer',
}
