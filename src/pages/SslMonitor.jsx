// SslMonitor.jsx — SSL Monitor: watch any domain's certificate health, daily
// Add domains → daily automatic scans → grade + expiry + readiness → email alerts.
// Backend: ssl-monitor edge function + monitored_domains / monitor_scan_history tables.
import { useState, useEffect, useCallback } from 'react'
import {
  Radar, Plus, RefreshCw, Trash2, Pause, Play, Search, X,
  ShieldCheck, ShieldAlert, Clock, Globe, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  F, DM, MONO, BLUE, BLUE2, BG, BORDER, LINE, BODY, MUTED, MUTED2,
  GRN, GRN_BG, AMB, AMB_BG, RED, RED_BG, GRAD, SHADOW,
  SectionHead, Btn, Pill, KPI, Card, CardHead, EmptyState, Modal, inputStyle,
} from '../components/AppKit'

function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function gradeTone(g) {
  if (g === 'A+' || g === 'A') return { color: GRN, bg: GRN_BG }
  if (g === 'B') return { color: BLUE, bg: 'rgba(0,119,182,0.08)' }
  if (g === 'C' || g === 'D') return { color: AMB, bg: AMB_BG }
  return { color: RED, bg: RED_BG }
}

function GradeBadge({ grade, size = 34 }) {
  const t = gradeTone(grade)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 9,
      background: t.bg, color: t.color, border: `1px solid ${BORDER}`,
      fontFamily: DM, fontWeight: 900, fontSize: size * 0.42, letterSpacing: '-0.02em',
    }}>{grade || '—'}</span>
  )
}

function DaysPill({ days }) {
  if (days === null || days === undefined) return <Pill tone="gray">no cert</Pill>
  if (days <= 0)  return <Pill tone="red">expired</Pill>
  if (days <= 7)  return <Pill tone="red">{days}d left</Pill>
  if (days <= 30) return <Pill tone="amber">{days}d left</Pill>
  return <Pill tone="green">{days}d left</Pill>
}

function CheckDot({ ok, label, invert = false }) {
  const good = invert ? !ok : !!ok
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: good ? BODY : RED, fontFamily: F }}>
      {good
        ? <CheckCircle2 size={13} color={GRN} strokeWidth={2.2} />
        : <XCircle size={13} color={RED} strokeWidth={2.2} />}
      {label}
    </span>
  )
}

function ReadinessBar({ score }) {
  if (score === null || score === undefined) return <span style={{ fontSize: 11, color: MUTED2, fontFamily: MONO }}>n/a</span>
  const color = score >= 85 ? GRN : score >= 65 ? BLUE : score >= 45 ? AMB : RED
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 90 }}>
      <div style={{ flex: 1, height: 5, background: LINE, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: MONO, minWidth: 26, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

function useIsMobile(bp = 820) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

export default function SslMonitor({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [busy, setBusy] = useState({})          // domain_id → 'scan' | 'toggle' | 'del'
  const [expanded, setExpanded] = useState(null)
  const [history, setHistory] = useState({})    // domain_id → scans[]
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
    setBusy(p => ({ ...p, [row.id]: 'scan' }))
    setError('')
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
      .select('*').eq('domain_id', id).order('scanned_at', { ascending: false }).limit(10)
    setHistory(p => ({ ...p, [id]: data || [] }))
  }

  const expand = (id) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) loadHistory(next)
  }

  const discover = async () => {
    const d = (discDomain || '').trim().toLowerCase()
    if (!d) return
    setDiscLoading(true); setDiscResults(null); setError('')
    try { setDiscResults(await invoke({ action: 'discover', domain: d })) }
    catch (e) { setError(e.message) }
    setDiscLoading(false)
  }

  // ── KPIs ──
  const total    = rows.length
  const healthy  = rows.filter(r => r.tls_grade === 'A+' || r.tls_grade === 'A').length
  const expiring = rows.filter(r => typeof r.last_days_left === 'number' && r.last_days_left > 0 && r.last_days_left <= 30).length
  const issues   = rows.filter(r => r.last_alive === false || (typeof r.last_days_left === 'number' && r.last_days_left <= 0) || r.tls_grade === 'F').length

  const DetailRow = ({ row }) => (
    <div style={{ padding: '14px 16px', background: BG, borderTop: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}>
        <CheckDot ok={row.last_alive} label="Reachable (HTTPS)" />
        <CheckDot ok={row.hsts} label="HSTS header" />
        <CheckDot ok={row.caa} label="CAA record" />
        <CheckDot ok={row.mixed_content} invert label="No mixed content" />
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5, color: MUTED, fontFamily: F, marginBottom: 12 }}>
        <span>Issuer: <strong style={{ color: BODY }}>{row.issuer || 'unknown'}</strong></span>
        {row.cert_expiry && <span>Expires: <strong style={{ color: BODY }}>{new Date(row.cert_expiry).toDateString()}</strong></span>}
        {row.cert_changed_at && <span style={{ color: AMB }}><AlertTriangle size={11} style={{ verticalAlign: -1.5 }} /> Cert changed {timeAgo(row.cert_changed_at)}</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED2, fontFamily: MONO, marginBottom: 7 }}>Scan history</div>
      {!history[row.id] ? (
        <div style={{ fontSize: 12, color: MUTED2, fontFamily: F }}>Loading…</div>
      ) : history[row.id].length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED2, fontFamily: F }}>No scans recorded yet — the first daily scan will appear here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {history[row.id].map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, fontFamily: MONO, color: BODY, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 7, padding: '6px 10px', flexWrap: 'wrap' }}>
              <span style={{ color: MUTED2, minWidth: 70 }}>{timeAgo(h.scanned_at)}</span>
              <span style={{ fontWeight: 800, color: gradeTone(h.grade).color }}>{h.grade || '—'}</span>
              <span>{h.days_left === null ? 'no cert' : `${h.days_left}d left`}</span>
              <span style={{ color: h.alive ? GRN : RED }}>{h.alive ? 'up' : 'down'}</span>
              {h.mixed_content && <span style={{ color: AMB }}>mixed content</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const Actions = ({ row }) => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <button title="Scan now" onClick={() => scanOne(row)} disabled={!!busy[row.id]} style={iconBtn}>
        <RefreshCw size={14} className={busy[row.id] === 'scan' ? 'spin' : ''} style={busy[row.id] === 'scan' ? { animation: 'sslmSpin 1s linear infinite' } : {}} />
      </button>
      <button title={row.active ? 'Pause monitoring' : 'Resume monitoring'} onClick={() => toggle(row)} disabled={!!busy[row.id]} style={iconBtn}>
        {row.active ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button title="Remove" onClick={() => remove(row)} disabled={!!busy[row.id]} style={{ ...iconBtn, color: RED }}>
        <Trash2 size={14} />
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: F }}>
      <style>{`@keyframes sslmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      <SectionHead
        kicker="SSL Monitor"
        title="Certificate monitoring"
        sub="Every domain below is scanned automatically every day. You get an email before anything expires or breaks."
        actions={
          <Btn variant="secondary" size="sm" onClick={() => { setDiscOpen(true); setDiscResults(null); setDiscDomain('') }}>
            <Search size={13} style={{ marginRight: 5, verticalAlign: -2 }} />Discover subdomains
          </Btn>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <KPI label="Monitored" value={total} color={BLUE} />
        <KPI label="Healthy (A / A+)" value={healthy} color={GRN} />
        <KPI label="Expiring ≤ 30d" value={expiring} color={AMB} />
        <KPI label="Issues" value={issues} color={issues ? RED : GRN} />
      </div>

      {/* Add domain */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 9, padding: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Globe size={14} color={MUTED2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !adding && addDomain(newDomain)}
              placeholder="example.com — add a domain to monitor"
              style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
            />
          </div>
          <Btn onClick={() => addDomain(newDomain)} disabled={adding || !newDomain.trim()}>
            {adding ? 'Scanning…' : <><Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Monitor</>}
          </Btn>
        </div>
        {error && (
          <div style={{ margin: '0 14px 12px', padding: '8px 12px', background: RED_BG, color: RED, borderRadius: 8, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
            <ShieldAlert size={14} />{error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: RED }}><X size={13} /></button>
          </div>
        )}
      </Card>

      {/* Domain list */}
      {loading ? (
        <Card><div style={{ padding: 30, textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading monitored domains…</div></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="📡"
            title="No domains monitored yet"
            sub="Add your first domain above. SSLVault will scan it instantly, grade its SSL health, and start watching it daily."
          />
        </Card>
      ) : isMobile ? (
        /* Mobile cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(row => (
            <Card key={row.id} style={{ opacity: row.active ? 1 : 0.55 }}>
              <div style={{ padding: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <GradeBadge grade={row.tls_grade} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111', fontFamily: DM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.domain}</div>
                    <div style={{ fontSize: 10.5, color: MUTED2, fontFamily: MONO, marginTop: 2 }}>scanned {timeAgo(row.last_scanned_at)}{!row.active && ' · paused'}</div>
                  </div>
                  <DaysPill days={row.last_days_left} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, gap: 10 }}>
                  <ReadinessBar score={row.readiness_score} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => expand(row.id)} style={iconBtn}>{expanded === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                    <Actions row={row} />
                  </div>
                </div>
              </div>
              {expanded === row.id && <DetailRow row={row} />}
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <Card>
          <CardHead title={`${total} domain${total === 1 ? '' : 's'} under watch`} live right={
            <span style={{ fontSize: 10.5, color: MUTED2, fontFamily: MONO }}>auto-scan daily · 04:30 UTC</span>
          } />
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1.6fr 110px 1.2fr 130px 110px 120px', gap: 10, padding: '8px 16px', borderBottom: `1px solid ${LINE}`, fontSize: 9.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: MUTED2, fontFamily: MONO }}>
              <span>Grade</span><span>Domain</span><span>Expiry</span><span>Issuer</span><span>Readiness</span><span>Scanned</span><span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            {rows.map(row => (
              <div key={row.id} style={{ opacity: row.active ? 1 : 0.55 }}>
                <div
                  onClick={() => expand(row.id)}
                  style={{ display: 'grid', gridTemplateColumns: '44px 1.6fr 110px 1.2fr 130px 110px 120px', gap: 10, padding: '11px 16px', alignItems: 'center', borderBottom: `1px solid ${LINE}`, cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,119,182,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <GradeBadge grade={row.tls_grade} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.domain}
                      {!row.active && <span style={{ fontSize: 9, fontWeight: 800, color: MUTED2, fontFamily: MONO, marginLeft: 7, letterSpacing: '.08em' }}>PAUSED</span>}
                      {row.cert_changed_at && <AlertTriangle size={12} color={AMB} style={{ marginLeft: 6, verticalAlign: -1.5 }} title="Certificate recently changed" />}
                    </div>
                    {row.last_alive === false && <div style={{ fontSize: 10.5, color: RED, fontWeight: 700, marginTop: 1 }}>unreachable</div>}
                  </div>
                  <DaysPill days={row.last_days_left} />
                  <span style={{ fontSize: 11.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.issuer || '—'}</span>
                  <ReadinessBar score={row.readiness_score} />
                  <span style={{ fontSize: 11, color: MUTED2, fontFamily: MONO }}>{timeAgo(row.last_scanned_at)}</span>
                  <div onClick={e => e.stopPropagation()}><Actions row={row} /></div>
                </div>
                {expanded === row.id && <DetailRow row={row} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 47-day banner */}
      <div style={{ marginTop: 16, padding: '13px 16px', borderRadius: 12, background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, boxShadow: SHADOW }}>
        <Sparkles size={18} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
          <strong>The 47-day era is coming.</strong> Maximum certificate lifetimes drop to 100 days in March 2027 and 47 days in 2029.
          The Readiness score above shows how prepared each domain is — domains automated through SSLVault score 100.
        </div>
      </div>

      {/* Discover modal */}
      <Modal open={discOpen} onClose={() => setDiscOpen(false)} title="Discover subdomains" width={560}>
        <p style={{ fontSize: 12.5, color: MUTED, marginTop: 0 }}>
          SSLVault searches public Certificate Transparency logs to find every subdomain that has ever been issued a certificate — including ones you may have forgotten about.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={discDomain}
            onChange={e => setDiscDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !discLoading && discover()}
            placeholder="example.com"
            style={{ ...inputStyle, flex: 1 }}
          />
          <Btn onClick={discover} disabled={discLoading || !discDomain.trim()}>{discLoading ? 'Searching…' : 'Search'}</Btn>
        </div>
        {discLoading && <div style={{ fontSize: 12.5, color: MUTED2, padding: '8px 0' }}>Querying CT logs — this can take ~10 seconds…</div>}
        {discResults && (
          discResults.subdomains.length === 0 ? (
            <div style={{ fontSize: 12.5, color: MUTED2 }}>No certificates found in CT logs for this domain.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${LINE}`, borderRadius: 10 }}>
              {discResults.subdomains.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderBottom: `1px solid ${LINE}`, fontSize: 12.5, fontFamily: MONO }}>
                  <ShieldCheck size={13} color={BLUE} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: BODY }}>{s.name}</span>
                  {s.monitored
                    ? <Pill tone="green">monitored</Pill>
                    : <Btn size="sm" variant="secondary" onClick={() => addDomain(s.name, true)} disabled={!!discAdding[s.name]}>{discAdding[s.name] ? 'Adding…' : '+ Monitor'}</Btn>}
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
  width: 28, height: 28, borderRadius: 7, border: `1px solid ${BORDER}`,
  background: '#fff', color: BODY, cursor: 'pointer',
}
