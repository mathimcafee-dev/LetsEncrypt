// ReadinessDashboard.jsx v4 — Sharp Comodo-theme design
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, RefreshCw, ExternalLink, ChevronUp, ChevronDown, Shield } from 'lucide-react'
import '../styles/design-v2.css'

const MILESTONES = [
  { date: new Date('2026-03-15'), days: 200, label: 'Mar 2026' },
  { date: new Date('2027-03-15'), days: 100, label: 'Mar 2027' },
  { date: new Date('2029-03-15'), days: 47,  label: 'Mar 2029' },
]

const F = "'Montserrat', system-ui, sans-serif"
const MONO = "'JetBrains Mono', monospace"

function daysUntilDate(d) { return Math.ceil((d - Date.now()) / 86400000) }

function fmtExpiry(iso) {
  if (!iso) return { label:'—', days:null }
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
    auto_renew:   !!cert.auto_renew_enabled,
    dns_provider: hasDnsCreds || !!cert.dns_provider_id,
    install:      cert.install_method === 'agent' || cert.install_method === 'cpanel',
    validity_200: validity !== null && validity <= 200,
    key_secured:  !!cert.keylocker_key_id,
  }
  const milestones = MILESTONES.map(m => ({ ...m, compliant: validity !== null && validity <= m.days }))
  const score = (checks.auto_renew?30:0)+(checks.dns_provider?25:0)+(checks.install?20:0)+(checks.validity_200?15:0)+(checks.key_secured?10:0)
  const status = score >= 90 ? 'Ready' : score >= 60 ? 'At risk' : 'Will break'
  return { checks, milestones, score, status, validity }
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Tick({ ok }) {
  return ok
    ? <CheckCircle size={15} color="#4ade80" strokeWidth={2.5} style={{ flexShrink:0 }}/>
    : <XCircle    size={15} color="rgba(255,255,255,0.2)" strokeWidth={2} style={{ flexShrink:0 }}/>
}

function StatusPill({ status }) {
  const map = {
    'Ready':      { bg:'rgba(74,222,128,0.12)',  color:'#4ade80', border:'rgba(74,222,128,0.3)' },
    'At risk':    { bg:'rgba(251,191,36,0.12)',  color:'#fbbf24', border:'rgba(251,191,36,0.3)' },
    'Will break': { bg:'rgba(248,113,113,0.12)', color:'#f87171', border:'rgba(248,113,113,0.3)' },
  }
  const s = map[status] || map['Will break']
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, fontFamily:F,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap',
      letterSpacing:'0.3px' }}>
      {status}
    </span>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
  const bg    = score >= 90 ? 'rgba(74,222,128,0.1)' : score >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)'
  return (
    <span style={{ fontSize:12, fontWeight:800, color, fontFamily:MONO,
      background:bg, padding:'2px 7px', borderRadius:6 }}>{score}</span>
  )
}

function FleetScoreRing({ score }) {
  const r = 28, circ = 2*Math.PI*r
  const color = score >= 90 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
  const pct = score / 100
  return (
    <svg width={72} height={72} style={{ flexShrink:0 }}>
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5}/>
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition:'stroke-dashoffset 1s ease' }}/>
      <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={800}
        fontFamily={MONO} fill={color}>{score}</text>
    </svg>
  )
}

const COL_DEFS = [
  { key:'domain',     label:'Domain',      width:'18%', sortable:true  },
  { key:'status',     label:'Readiness',   width:'9%',  sortable:true  },
  { key:'score',      label:'Score',       width:'6%',  sortable:true  },
  { key:'expiry',     label:'Expiry',      width:'11%', sortable:true  },
  { key:'validity',   label:'Validity',    width:'7%',  sortable:true  },
  { key:'mar2026',    label:'Mar 2026',    width:'6%',  sortable:false },
  { key:'mar2027',    label:'Mar 2027',    width:'6%',  sortable:false },
  { key:'mar2029',    label:'Mar 2029',    width:'6%',  sortable:false },
  { key:'auto_renew', label:'Auto-renew',  width:'7%',  sortable:false },
  { key:'dns',        label:'DNS',         width:'7%',  sortable:false },
  { key:'install',    label:'Install',     width:'7%',  sortable:false },
  { key:'key',        label:'Key',         width:'7%',  sortable:false },
]

export default function ReadinessDashboard({ user }) {
  const [certs,setCerts]           = useState([])
  const [hasAgent,setHasAgent]     = useState(false)
  const [hasDnsCreds,setHasDnsCreds] = useState(false)
  const [loading,setLoading]       = useState(true)
  const [filter,setFilter]         = useState('all')
  const [sortKey,setSortKey]       = useState('score')
  const [sortAsc,setSortAsc]       = useState(true)

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
      const seen = new Set(), unique = []
      for (const c of (cd||[])) { if (!seen.has(c.domain)) { seen.add(c.domain); unique.push(c) } }
      setCerts(unique); setHasAgent((ad||[]).length > 0); setHasDnsCreds((dd||[]).length > 0); setLoading(false)
    })
  }, [user])

  const rows = useMemo(() => certs.map(c => ({ cert:c, ...computeRow(c, hasAgent, hasDnsCreds) })), [certs, hasAgent, hasDnsCreds])
  const ready=rows.filter(r=>r.score>=90).length, atRisk=rows.filter(r=>r.score>=60&&r.score<90).length
  const willBreak=rows.filter(r=>r.score<60).length
  const fleetScore = rows.length ? Math.round(rows.reduce((s,r)=>s+r.score,0)/rows.length) : 0

  const filtered = rows.filter(r => {
    if (filter==='ready')      return r.score >= 90
    if (filter==='at-risk')    return r.score >= 60 && r.score < 90
    if (filter==='will-break') return r.score < 60
    return true
  })

  const sorted = [...filtered].sort((a,b) => {
    let av, bv
    if (sortKey==='domain')   { av=a.cert.domain; bv=b.cert.domain }
    else if (sortKey==='status')  { av=a.score; bv=b.score }
    else if (sortKey==='score')   { av=a.score; bv=b.score }
    else if (sortKey==='expiry')  { av=new Date(a.cert.expires_at||0); bv=new Date(b.cert.expires_at||0) }
    else if (sortKey==='validity'){ av=a.validity||0; bv=b.validity||0 }
    else { av=0; bv=0 }
    if (av<bv) return sortAsc?-1:1; if (av>bv) return sortAsc?1:-1; return 0
  })

  function toggleSort(key) { if(sortKey===key) setSortAsc(v=>!v); else{setSortKey(key);setSortAsc(true)} }

  const TH = ({ col }) => (
    <th onClick={() => col.sortable && toggleSort(col.key)}
      style={{ padding:'10px 12px', fontSize:10, fontWeight:700, color:'#b0a8a0', fontFamily:F,
        textTransform:'uppercase', letterSpacing:'0.8px', textAlign:'left',
        background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.1)',
        cursor:col.sortable?'pointer':'default', userSelect:'none', whiteSpace:'nowrap',
        width:col.width }}>
      <span style={{ display:'flex', alignItems:'center', gap:3 }}>
        {col.label}
        {col.sortable && sortKey===col.key && (sortAsc ? <ChevronUp size={10} color="#ff8c7a"/> : <ChevronDown size={10} color="#ff8c7a"/>)}
      </span>
    </th>
  )

  return (
    <div className="v2-page" style={{ fontFamily:F }}>
      <div className="v2-container" style={{ maxWidth:1200, paddingTop:8, paddingBottom:40 }}>

        {/* ── Page Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(192,57,43,0.2)',
                border:'1px solid rgba(192,57,43,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Shield size={18} color="#ff8c7a"/>
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:'#ff8c7a', letterSpacing:'1.5px',
                  textTransform:'uppercase', marginBottom:2 }}>CA/B Forum SC-081v3</div>
                <h1 style={{ fontSize:22, fontWeight:800, color:'#ffffff', margin:0, letterSpacing:'-0.5px' }}>
                  47-Day Readiness
                </h1>
              </div>
            </div>
            <p style={{ fontSize:13, color:'#b0a8a0', margin:0, maxWidth:480, lineHeight:1.6 }}>
              How ready is your fleet for shorter certificate lifetimes?
            </p>
          </div>
          <a href="https://cabforum.org/working-groups/server/baseline-requirements/requirements/"
            target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600,
              color:'#ff8c7a', textDecoration:'none', padding:'7px 12px', borderRadius:8,
              background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.25)',
              transition:'all .15s', whiteSpace:'nowrap' }}>
            <ExternalLink size={12}/> View SC-081v3
          </a>
        </div>

        {/* ── Fleet Score + Summary Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, marginBottom:20 }}>

          {/* Fleet score ring */}
          <div style={{ padding:'20px 24px', borderRadius:12, display:'flex', alignItems:'center', gap:20,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            backdropFilter:'blur(8px)', minWidth:200 }}>
            <FleetScoreRing score={fleetScore}/>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase',
                letterSpacing:'0.8px', marginBottom:4 }}>Fleet Score</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#e8e0d8' }}>
                {fleetScore >= 90 ? '🟢 Ready for 2029' : fleetScore >= 60 ? '🟡 Action needed' : '🔴 Will break'}
              </div>
              <div style={{ fontSize:11, color:'#b0a8a0', marginTop:2 }}>
                {rows.length} domain{rows.length!==1?'s':''} tracked
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Will Break', value:willBreak, color:'#f87171', bg:'rgba(248,113,113,0.08)', border:'rgba(248,113,113,0.2)', desc:'< 60 pts' },
              { label:'At Risk',    value:atRisk,    color:'#fbbf24', bg:'rgba(251,191,36,0.08)',  border:'rgba(251,191,36,0.2)',  desc:'60–89 pts' },
              { label:'Ready',      value:ready,     color:'#4ade80', bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.2)',  desc:'≥ 90 pts' },
            ].map(s => (
              <div key={s.label} style={{ padding:'16px 18px', borderRadius:12,
                background:s.bg, border:`1px solid ${s.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:s.color, textTransform:'uppercase',
                  letterSpacing:'0.8px', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:32, fontWeight:800, color:s.color, fontFamily:MONO, lineHeight:1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4 }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Milestone Timeline ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {MILESTONES.map((m,i) => {
            const d = daysUntilDate(m.date)
            const past = d <= 0
            const colors = ['#f87171','#fbbf24','#4ade80']
            const bgs = ['rgba(248,113,113,0.08)','rgba(251,191,36,0.08)','rgba(74,222,128,0.08)']
            const borders = ['rgba(248,113,113,0.2)','rgba(251,191,36,0.2)','rgba(74,222,128,0.2)']
            return (
              <div key={m.label} style={{ padding:'12px 16px', borderRadius:10,
                background: past ? bgs[0] : 'rgba(255,255,255,0.04)',
                border:`1px solid ${past ? borders[0] : 'rgba(255,255,255,0.08)'}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#ffffff', marginBottom:2 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize:11, color:'#b0a8a0' }}>
                    Max <strong style={{ color:'#e8e0d8' }}>{m.days}-day</strong> validity
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
                  background: past ? bgs[0] : 'rgba(255,255,255,0.06)',
                  color: past ? '#f87171' : colors[i],
                  border:`1px solid ${past ? borders[0] : borders[i]}`,
                  whiteSpace:'nowrap', flexShrink:0 }}>
                  {past ? 'In effect' : `${d}d`}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{ display:'flex', gap:6, marginBottom:14, background:'rgba(255,255,255,0.04)',
          padding:'5px', borderRadius:10, width:'fit-content',
          border:'1px solid rgba(255,255,255,0.08)' }}>
          {[
            { key:'all',        label:`All (${rows.length})` },
            { key:'will-break', label:`Will break (${willBreak})` },
            { key:'at-risk',    label:`At risk (${atRisk})` },
            { key:'ready',      label:`Ready (${ready})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding:'6px 14px', borderRadius:7, fontSize:12, border:'none', fontFamily:F,
                fontWeight: filter===f.key ? 700 : 500, cursor:'pointer',
                background: filter===f.key ? '#c0392b' : 'transparent',
                color: filter===f.key ? '#ffffff' : '#b0a8a0',
                transition:'all .15s' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'64px', color:'#b0a8a0' }}>
            <RefreshCw size={20} style={{ animation:'spin .8s linear infinite', margin:'0 auto 12px', display:'block', color:'#ff8c7a' }}/>
            <div style={{ fontSize:13, fontWeight:500 }}>Analysing fleet…</div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', fontSize:13, color:'#b0a8a0',
            background:'rgba(255,255,255,0.04)', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)' }}>
            No certificates match this filter.
          </div>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12, overflow:'hidden', backdropFilter:'blur(8px)' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
                <thead>
                  <tr>{COL_DEFS.map(col => <TH key={col.key} col={col}/>)}</tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => {
                    const { cert, checks, milestones, score, status, validity } = row
                    const expiry = fmtExpiry(cert.expires_at)
                    const expiryColor = expiry.days !== null && expiry.days < 30 ? '#f87171' : expiry.days !== null && expiry.days < 90 ? '#fbbf24' : '#e8e0d8'
                    return (
                      <tr key={cert.id}
                        style={{ borderTop:'1px solid rgba(255,255,255,0.06)', transition:'background .1s',
                          background: idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(192,57,43,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'transparent':'rgba(255,255,255,0.02)'}>

                        {/* Domain */}
                        <td style={{ padding:'11px 12px', maxWidth:180 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <span style={{ fontFamily:MONO, fontSize:12, fontWeight:600,
                              color:'#ffffff', overflow:'hidden', textOverflow:'ellipsis',
                              whiteSpace:'nowrap', maxWidth:130 }}>
                              {cert.domain}
                            </span>
                            <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
                              whiteSpace:'nowrap', flexShrink:0,
                              background: cert.source==='gogetssl' ? 'rgba(192,57,43,0.15)' : 'rgba(251,191,36,0.1)',
                              color: cert.source==='gogetssl' ? '#ff8c7a' : '#fbbf24',
                              border:`0.5px solid ${cert.source==='gogetssl'?'rgba(192,57,43,0.3)':'rgba(251,191,36,0.3)'}` }}>
                              {cert.source==='gogetssl' ? 'SSLVault' : (cert.issuer || cert.source || 'CA')}
                            </span>
                          </div>
                        </td>

                        {/* Readiness */}
                        <td style={{ padding:'11px 12px' }}><StatusPill status={status}/></td>

                        {/* Score */}
                        <td style={{ padding:'11px 12px', textAlign:'center' }}><ScoreBadge score={score}/></td>

                        {/* Expiry */}
                        <td style={{ padding:'11px 12px', whiteSpace:'nowrap' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:expiryColor }}>{expiry.label}</div>
                          <div style={{ fontSize:10, color:'#b0a8a0', marginTop:2 }}>
                            {expiry.days !== null ? (expiry.days > 0 ? `${expiry.days}d left` : 'Expired') : '—'}
                          </div>
                        </td>

                        {/* Validity */}
                        <td style={{ padding:'11px 12px', textAlign:'center',
                          fontSize:12, fontWeight:600, color:'#e8e0d8', fontFamily:MONO }}>
                          {validity != null ? `${validity}d` : '—'}
                        </td>

                        {/* Milestones */}
                        {milestones.map(m => (
                          <td key={m.label} style={{ padding:'11px 12px', textAlign:'center' }}>
                            <Tick ok={m.compliant}/>
                          </td>
                        ))}

                        {/* Checks */}
                        <td style={{ padding:'11px 12px', textAlign:'center' }}><Tick ok={checks.auto_renew}/></td>
                        <td style={{ padding:'11px 12px', textAlign:'center' }}><Tick ok={checks.dns_provider}/></td>
                        <td style={{ padding:'11px 12px', textAlign:'center' }}><Tick ok={checks.install}/></td>
                        <td style={{ padding:'11px 12px', textAlign:'center' }}><Tick ok={checks.key_secured}/></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize:11, color:'#b0a8a0', fontWeight:500 }}>
                {sorted.length} domain{sorted.length!==1?'s':''} · Click headers to sort
              </span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
                auto-renew 30 · DNS 25 · install 20 · validity 15 · key 10
              </span>
            </div>
          </div>
        )}

        {/* ── Footer Note ── */}
        <div style={{ marginTop:16, fontSize:11, color:'#b0a8a0', lineHeight:1.7,
          padding:'12px 16px', borderRadius:10,
          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <strong style={{ color:'#ff8c7a' }}>CA/B Forum SC-081v3</strong> (passed Apr 2025) ·
          200-day max from <strong style={{ color:'#e8e0d8' }}>Mar 15 2026</strong> ·
          100-day from <strong style={{ color:'#e8e0d8' }}>Mar 15 2027</strong> ·
          47-day from <strong style={{ color:'#e8e0d8' }}>Mar 15 2029</strong> ·
          DCV reuse drops to 10 days · Manual renewal will be operationally impossible
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
