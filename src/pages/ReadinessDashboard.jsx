// ReadinessDashboard.jsx v3 — Clean table layout
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, RefreshCw, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'
import '../styles/design-v2.css'

const MILESTONES = [
  { date: new Date('2026-03-15'), days: 200, label: 'Mar 2026' },
  { date: new Date('2027-03-15'), days: 100, label: 'Mar 2027' },
  { date: new Date('2029-03-15'), days: 47,  label: 'Mar 2029' },
]

function daysUntilDate(d) { return Math.ceil((d - Date.now()) / 86400000) }

function fmtExpiry(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const days = Math.ceil((d - Date.now()) / 86400000)
  const label = d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  return { label, days }
}

function certValidityDays(cert) {
  if (!cert.issued_at || !cert.expires_at) return null
  return Math.ceil((new Date(cert.expires_at) - new Date(cert.issued_at)) / 86400000)
}

function computeRow(cert, hasAgent, hasDnsCreds) {
  const validity = certValidityDays(cert)
  const checks = {
    auto_renew:    !!cert.auto_renew_enabled,
    dns_provider:  hasDnsCreds || !!cert.dns_provider_id,
    install:       cert.install_method === 'agent' || cert.install_method === 'cpanel',
    validity_200:  validity !== null && validity <= 200,
    key_secured:   !!cert.keylocker_key_id,
  }
  const milestones = MILESTONES.map(m => ({
    ...m,
    compliant: validity !== null && validity <= m.days,
  }))
  const score = (
    (checks.auto_renew   ? 30 : 0) +
    (checks.dns_provider ? 25 : 0) +
    (checks.install      ? 20 : 0) +
    (checks.validity_200 ? 15 : 0) +
    (checks.key_secured  ? 10 : 0)
  )
  const status = score >= 90 ? 'Ready' : score >= 60 ? 'At risk' : 'Will break'
  return { checks, milestones, score, status, validity }
}

function Tick({ ok }) {
  return ok
    ? <CheckCircle size={14} color="#1A7A72" style={{ flexShrink:0 }}/>
    : <XCircle    size={14} color="#C04040" style={{ flexShrink:0 }}/>
}

function StatusPill({ status }) {
  const map = {
    'Ready':      { bg:'#E1F5EE', color:'#0F6E56', border:'#A8E6DE' },
    'At risk':    { bg:'#FAEEDA', color:'#854F0B', border:'#F0C490' },
    'Will break': { bg:'#FCEBEB', color:'#A32D2D', border:'#F7C1C1' },
  }
  const s = map[status] || map['Will break']
  return (
    <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:20,
      background:s.bg, color:s.color, border:`0.5px solid ${s.border}`, whiteSpace:'nowrap' }}>
      {status}
    </span>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? '#0F6E56' : score >= 60 ? '#854F0B' : '#A32D2D'
  return (
    <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{score}</span>
  )
}

const COL_DEFS = [
  { key:'domain',       label:'Domain',          width:'18%', sortable:true  },
  { key:'status',       label:'Readiness',       width:'9%',  sortable:true  },
  { key:'score',        label:'Score',           width:'6%',  sortable:true  },
  { key:'expiry',       label:'Expiry',          width:'10%', sortable:true  },
  { key:'validity',     label:'Validity',        width:'7%',  sortable:true  },
  { key:'mar2026',      label:'Mar 2026',        width:'7%',  sortable:false },
  { key:'mar2027',      label:'Mar 2027',        width:'7%',  sortable:false },
  { key:'mar2029',      label:'Mar 2029',        width:'7%',  sortable:false },
  { key:'auto_renew',   label:'Auto-renew',      width:'8%',  sortable:false },
  { key:'dns',          label:'DNS provider',    width:'8%',  sortable:false },
  { key:'install',      label:'Auto-install',    width:'8%',  sortable:false },
  { key:'key',          label:'Key secured',     width:'8%',  sortable:false },
]

export default function ReadinessDashboard({ user }) {
  const [certs,       setCerts]       = useState([])
  const [hasAgent,    setHasAgent]    = useState(false)
  const [hasDnsCreds, setHasDnsCreds] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')
  const [sortKey,     setSortKey]     = useState('score')
  const [sortAsc,     setSortAsc]     = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('certificates')
        .select('id,domain,expires_at,issued_at,cert_type,auto_renew_enabled,dns_provider_id,install_method,keylocker_key_id,source,issuer')
        .eq('user_id', user.id).neq('status','cancelled').neq('status','revoked')
        .order('expires_at', { ascending:true }),
      supabase.from('persistent_agents').select('id').eq('user_id', user.id).limit(1),
      supabase.from('dns_credentials').select('id').eq('user_id', user.id).limit(1),
    ]).then(([{ data:cd }, { data:ad }, { data:dd }]) => {
      // Deduplicate by domain — latest per domain
      const seen = new Set(), unique = []
      for (const c of (cd||[])) {
        if (!seen.has(c.domain)) { seen.add(c.domain); unique.push(c) }
      }
      setCerts(unique)
      setHasAgent((ad||[]).length > 0)
      setHasDnsCreds((dd||[]).length > 0)
      setLoading(false)
    })
  }, [user])

  const rows = useMemo(() =>
    certs.map(c => ({ cert:c, ...computeRow(c, hasAgent, hasDnsCreds) })),
    [certs, hasAgent, hasDnsCreds]
  )

  const ready     = rows.filter(r => r.score >= 90).length
  const atRisk    = rows.filter(r => r.score >= 60 && r.score < 90).length
  const willBreak = rows.filter(r => r.score < 60).length
  const fleetScore = rows.length ? Math.round(rows.reduce((s,r)=>s+r.score,0)/rows.length) : 0

  const filtered = rows.filter(r => {
    if (filter==='ready')      return r.score >= 90
    if (filter==='at-risk')    return r.score >= 60 && r.score < 90
    if (filter==='will-break') return r.score < 60
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let av, bv
    if (sortKey==='domain')   { av=a.cert.domain; bv=b.cert.domain }
    else if (sortKey==='status')  { av=a.score; bv=b.score }
    else if (sortKey==='score')   { av=a.score; bv=b.score }
    else if (sortKey==='expiry')  { av=new Date(a.cert.expires_at||0); bv=new Date(b.cert.expires_at||0) }
    else if (sortKey==='validity'){ av=a.validity||0; bv=b.validity||0 }
    else { av=0; bv=0 }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

  function toggleSort(key) {
    if (sortKey===key) setSortAsc(v=>!v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const daysToMar26 = daysUntilDate(MILESTONES[0].date)

  const TH = ({ col }) => (
    <th onClick={() => col.sortable && toggleSort(col.key)}
      style={{ padding:'9px 12px', fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
        textTransform:'uppercase', letterSpacing:'0.4px', textAlign:'left',
        background:'var(--v2-bg)', borderBottom:'0.5px solid var(--v2-border)',
        cursor:col.sortable?'pointer':'default', userSelect:'none', whiteSpace:'nowrap',
        width:col.width }}>
      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
        {col.label}
        {col.sortable && sortKey===col.key && (
          sortAsc ? <ChevronUp size={10}/> : <ChevronDown size={10}/>
        )}
      </span>
    </th>
  )

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1100 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:16, paddingTop:8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:20, marginBottom:3 }}>47-day readiness</h1>
            <p style={{ fontSize:12, color:'var(--v2-text-3)', margin:0 }}>
              CA/B Forum SC-081v3 — how ready is your fleet for shorter cert lifetimes?
            </p>
          </div>
          <a href="https://cabforum.org/working-groups/server/baseline-requirements/requirements/"
            target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11,
              color:'var(--v2-green)', textDecoration:'none' }}>
            <ExternalLink size={11}/> CA/B Forum SC-081v3
          </a>
        </div>

        {/* Summary strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Fleet score',  value:fleetScore, unit:'/ 100', color: fleetScore>=90?'#0F6E56':fleetScore>=60?'#854F0B':'#A32D2D' },
            { label:'Domains',      value:rows.length, unit:'total',    color:'var(--v2-text-1)' },
            { label:'Ready',        value:ready,        unit:'domains',  color:'#0F6E56' },
            { label:'At risk',      value:atRisk,       unit:'domains',  color:'#854F0B' },
            { label:'Will break',   value:willBreak,    unit:'domains',  color:'#A32D2D' },
          ].map(s => (
            <div key={s.label} style={{ padding:'10px 14px', borderRadius:8,
              background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)' }}>
              <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:'monospace', lineHeight:1 }}>
                {s.value}
                <span style={{ fontSize:11, fontWeight:400, color:'var(--v2-text-3)',
                  marginLeft:4 }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Milestone context */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:16 }}>
          {MILESTONES.map((m,i) => {
            const d = daysUntilDate(m.date)
            const past = d <= 0
            return (
              <div key={m.label} style={{ padding:'9px 14px', borderRadius:8, display:'flex',
                alignItems:'center', justifyContent:'space-between',
                background: past && i===0 ? '#FAEEDA' : 'var(--v2-surface)',
                border:`0.5px solid ${past && i===0 ? '#F0C490' : 'var(--v2-border)'}` }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:600,
                    color: past && i===0 ? '#854F0B' : 'var(--v2-text-1)' }}>{m.label}</span>
                  <span style={{ fontSize:11, color:'var(--v2-text-3)', marginLeft:8 }}>
                    max {m.days}-day validity
                  </span>
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  background: past ? (i===0?'#FAEEDA':'var(--v2-bg)') : '#E1F5EE',
                  color: past ? (i===0?'#854F0B':'var(--v2-text-3)') : '#0F6E56',
                  border:`0.5px solid ${past?(i===0?'#F0C490':'var(--v2-border)'):'#A8E6DE'}` }}>
                  {past ? 'In effect' : `${d}d`}
                </span>
              </div>
            )
          })}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:10 }}>
          {[
            { key:'all',        label:`All (${rows.length})` },
            { key:'will-break', label:`Will break (${willBreak})` },
            { key:'at-risk',    label:`At risk (${atRisk})` },
            { key:'ready',      label:`Ready (${ready})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding:'5px 12px', borderRadius:6, fontSize:11, border:'none',
                fontWeight: filter===f.key ? 600 : 400, fontFamily:'inherit', cursor:'pointer',
                background: filter===f.key ? 'var(--v2-green)' : 'none',
                color: filter===f.key ? 'white' : 'var(--v2-text-3)',
                transition:'all .15s' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'var(--v2-text-3)' }}>
            <RefreshCw size={18} style={{ animation:'spin .8s linear infinite',
              margin:'0 auto 10px', display:'block' }}/>
            Analysing fleet…
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px', fontSize:12,
            color:'var(--v2-text-3)', background:'var(--v2-surface)',
            borderRadius:10, border:'0.5px solid var(--v2-border)' }}>
            No certificates match this filter.
          </div>
        ) : (
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
            borderRadius:10, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>
                    {COL_DEFS.map(col => <TH key={col.key} col={col}/>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => {
                    const { cert, checks, milestones, score, status, validity } = row
                    const expiry = fmtExpiry(cert.expires_at)
                    const expiryDays = expiry.days
                    const expiryColor = expiryDays < 30 ? '#A32D2D' : expiryDays < 90 ? '#854F0B' : 'var(--v2-text-2)'
                    return (
                      <tr key={cert.id}
                        style={{ borderTop:`0.5px solid var(--v2-border)`,
                          background: idx%2===0 ? 'var(--v2-surface)' : 'var(--v2-bg)',
                          transition:'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--v2-surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'var(--v2-surface)':'var(--v2-bg)'}>

                        {/* Domain */}
                        <td style={{ padding:'10px 12px', maxWidth:180 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:500,
                              color:'var(--v2-text-1)', overflow:'hidden', textOverflow:'ellipsis',
                              whiteSpace:'nowrap', maxWidth:130 }}>
                              {cert.domain}
                            </span>
                            {cert.source === 'gogetssl' ? (
                              <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px',
                                borderRadius:4, whiteSpace:'nowrap', flexShrink:0,
                                background:'#E1F5EE', color:'#0F6E56',
                                border:'0.5px solid #A8E6DE' }}>
                                SSLVault
                              </span>
                            ) : cert.source ? (
                              <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px',
                                borderRadius:4, whiteSpace:'nowrap', flexShrink:0,
                                background:'#FAEEDA', color:'#854F0B',
                                border:'0.5px solid #F0C490' }}>
                                {cert.issuer || cert.source}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Readiness */}
                        <td style={{ padding:'10px 12px' }}>
                          <StatusPill status={status}/>
                        </td>

                        {/* Score */}
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <ScoreBadge score={score}/>
                        </td>

                        {/* Expiry */}
                        <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                          <div style={{ fontSize:11, fontWeight:500, color:expiryColor }}>
                            {expiry.label}
                          </div>
                          <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
                            {expiryDays > 0 ? `${expiryDays}d left` : 'Expired'}
                          </div>
                        </td>

                        {/* Validity */}
                        <td style={{ padding:'10px 12px', textAlign:'center',
                          fontSize:11, color:'var(--v2-text-2)', fontFamily:'monospace' }}>
                          {validity ?? '—'}d
                        </td>

                        {/* Milestones */}
                        {milestones.map(m => (
                          <td key={m.label} style={{ padding:'10px 12px', textAlign:'center' }}>
                            <Tick ok={m.compliant}/>
                          </td>
                        ))}

                        {/* Automation checks */}
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <Tick ok={checks.auto_renew}/>
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <Tick ok={checks.dns_provider}/>
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <Tick ok={checks.install}/>
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <Tick ok={checks.key_secured}/>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{ padding:'8px 14px', borderTop:'0.5px solid var(--v2-border)',
              background:'var(--v2-bg)', display:'flex', alignItems:'center',
              justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                {sorted.length} domain{sorted.length!==1?'s':''} · Click column headers to sort
              </span>
              <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                Score = auto-renew 30pt · DNS 25pt · install 20pt · validity 15pt · key 10pt
              </span>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div style={{ marginTop:12, fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6,
          padding:'8px 12px', borderRadius:8, background:'var(--v2-bg)',
          border:'0.5px solid var(--v2-border)' }}>
          CA/B Forum SC-081v3 (passed Apr 2025) · 200-day max from Mar 15 2026 · 100-day from Mar 15 2027 · 47-day from Mar 15 2029 · DCV reuse drops to 10 days · Manual renewal will be operationally impossible
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
