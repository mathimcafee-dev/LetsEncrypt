// ReadinessDashboard.jsx v2 — Clean redesign
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink, ChevronDown, Zap, Server, Globe, Key, RotateCcw } from 'lucide-react'
import '../styles/design-v2.css'

const MILESTONES = [
  { date: new Date('2026-03-15'), days: 200, label: 'Mar 2026', desc: '200-day max' },
  { date: new Date('2027-03-15'), days: 100, label: 'Mar 2027', desc: '100-day max' },
  { date: new Date('2029-03-15'), days: 47,  label: 'Mar 2029', desc: '47-day max'  },
]

function daysUntilDate(d) { return Math.ceil((d - Date.now()) / 86400000) }
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function certValidityDays(cert) {
  if (!cert.issued_at || !cert.expires_at) return null
  return Math.ceil((new Date(cert.expires_at) - new Date(cert.issued_at)) / 86400000)
}

function computeChecklist(cert, hasAgent, hasDnsCreds) {
  const validity = certValidityDays(cert)
  const checks = [
    { id:'auto_renew',     label:'Auto-renew on',           ok:!!cert.auto_renew_enabled,                                             fix:'Enable auto-renew in cert settings',          icon:RotateCcw, weight:30 },
    { id:'dns_provider',   label:'DNS provider connected',  ok:hasDnsCreds || !!cert.dns_provider_id,                                 fix:'Connect a DNS provider for auto-DCV',         icon:Globe,     weight:25 },
    { id:'install_method', label:'Auto-install configured', ok:cert.install_method==='agent'||cert.install_method==='cpanel',          fix:'Connect via agent or cPanel',                 icon:Server,    weight:20 },
    { id:'validity_200',   label:'Under 200-day rule',      ok:validity!==null && validity<=200,                                       fix:'Cert issued >200 days — renew after Mar 2026', icon:ShieldCheck,weight:15},
    { id:'certvault',      label:'Key in CertVault',        ok:!!cert.keylocker_key_id,                                               fix:'Rotate key to store encrypted',               icon:Key,       weight:10 },
  ]
  const score = checks.reduce((s,c) => s + (c.ok ? c.weight : 0), 0)
  return { checks, score }
}

function readinessLevel(score) {
  if (score >= 90) return { label:'Ready',      color:'#1A7A72', bg:'#E1F5EE', border:'#A8E6DE' }
  if (score >= 60) return { label:'At risk',    color:'#9A5A30', bg:'#FAEEDA', border:'#F0C490' }
  return              { label:'Will break',   color:'#A32D2D', bg:'#FCEBEB', border:'#F7C1C1' }
}

function ScoreRing({ score, size=48 }) {
  const r = (size-8)/2, c = 2*Math.PI*r, level = readinessLevel(score)
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--v2-border)" strokeWidth="4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={level.color} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={c*(1-score/100)}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:size<50?11:13, fontWeight:700, color:level.color }}>
        {score}
      </div>
    </div>
  )
}

function MilestoneBar({ cert }) {
  const validity = certValidityDays(cert)
  return (
    <div style={{ display:'flex', gap:6 }}>
      {MILESTONES.map(m => {
        const ok = validity !== null && validity <= m.days
        const past = daysUntilDate(m.date) <= 0
        return (
          <div key={m.label} style={{ display:'flex', alignItems:'center', gap:4,
            padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:500,
            background: ok ? '#E1F5EE' : '#FCEBEB',
            color: ok ? '#1A7A72' : '#A32D2D',
            border: `0.5px solid ${ok ? '#A8E6DE' : '#F7C1C1'}` }}>
            {ok
              ? <CheckCircle size={9} color="#1A7A72"/>
              : <XCircle    size={9} color="#A32D2D"/>}
            {m.label}
          </div>
        )
      })}
    </div>
  )
}

function CertRow({ cert, hasAgent, hasDnsCreds }) {
  const [open, setOpen] = useState(false)
  const { checks, score } = useMemo(() => computeChecklist(cert, hasAgent, hasDnsCreds), [cert, hasAgent, hasDnsCreds])
  const level    = readinessLevel(score)
  const failList = checks.filter(c => !c.ok)
  const passCount = checks.filter(c => c.ok).length

  return (
    <div style={{ border:`0.5px solid ${open?level.border:'var(--v2-border)'}`,
      borderRadius:10, overflow:'hidden', marginBottom:6,
      background:'var(--v2-surface)', transition:'border-color .2s' }}>

      {/* Header row */}
      <div onClick={() => setOpen(v=>!v)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
          cursor:'pointer', userSelect:'none' }}
        onMouseEnter={e => e.currentTarget.style.background='var(--v2-bg)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>

        <ScoreRing score={score} size={44}/>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text-1)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {cert.domain}
            </span>
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, flexShrink:0,
              background:level.bg, color:level.color, border:`0.5px solid ${level.border}` }}>
              {level.label}
            </span>
          </div>
          <MilestoneBar cert={cert}/>
        </div>

        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:11, color:'var(--v2-text-2)', fontWeight:500 }}>{fmtDate(cert.expires_at)}</div>
          <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:2 }}>
            {passCount}/{checks.length} checks · {certValidityDays(cert)??'?'}d validity
          </div>
        </div>

        <div style={{ color:'var(--v2-text-3)', transform:open?'rotate(180deg)':'none',
          transition:'transform .25s', flexShrink:0 }}>
          <ChevronDown size={14}/>
        </div>
      </div>

      {/* Expandable checklist */}
      {open && (
        <div style={{ borderTop:`0.5px solid var(--v2-border)`, padding:'12px 16px',
          background:'var(--v2-bg)' }}>

          {/* Quick summary */}
          {failList.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12,
              padding:'8px 12px', borderRadius:8, background:'#E1F5EE',
              border:'0.5px solid #A8E6DE' }}>
              <CheckCircle size={13} color="#1A7A72"/>
              <span style={{ fontSize:12, color:'#1A7A72', fontWeight:500 }}>
                All checks passed — this cert is ready for the 47-day era
              </span>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12,
              padding:'8px 12px', borderRadius:8, background:'#FCEBEB',
              border:'0.5px solid #F7C1C1' }}>
              <AlertTriangle size={13} color="#A32D2D"/>
              <span style={{ fontSize:12, color:'#A32D2D', fontWeight:500 }}>
                {failList.length} action{failList.length>1?'s':''} needed before 47-day certs become mandatory
              </span>
            </div>
          )}

          {/* Checklist items */}
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {checks.map(c => {
              const Icon = c.icon
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'8px 10px', borderRadius:7,
                  background: c.ok ? 'var(--v2-surface)' : '#FFFAFA',
                  border:`0.5px solid ${c.ok ? 'var(--v2-border)' : '#F7C1C1'}` }}>
                  <div style={{ width:26, height:26, borderRadius:6, flexShrink:0,
                    background: c.ok ? '#E1F5EE' : '#FCEBEB',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={12} color={c.ok?'#1A7A72':'#A32D2D'}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontSize:12, fontWeight:500,
                      color: c.ok ? 'var(--v2-text-1)' : '#A32D2D' }}>{c.label}</span>
                    {!c.ok && (
                      <div style={{ fontSize:11, color:'#C04040', marginTop:1 }}>{c.fix}</div>
                    )}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:6,
                    background: c.ok ? '#1A7A72' : '#FCEBEB',
                    color: c.ok ? 'white' : '#A32D2D',
                    border: c.ok ? 'none' : '0.5px solid #F7C1C1', flexShrink:0 }}>
                    {c.ok ? '✓' : '✗'} {c.weight}pt
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReadinessDashboard({ user }) {
  const [certs,       setCerts]       = useState([])
  const [hasAgent,    setHasAgent]    = useState(false)
  const [hasDnsCreds, setHasDnsCreds] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('certificates')
        .select('id,domain,expires_at,issued_at,cert_type,auto_renew_enabled,dns_provider_id,install_method,keylocker_key_id,issuer')
        .eq('user_id', user.id).neq('status','cancelled').neq('status','revoked')
        .order('expires_at', { ascending:true }),
      supabase.from('persistent_agents').select('id').eq('user_id', user.id).limit(1),
      supabase.from('dns_credentials').select('id').eq('user_id', user.id).limit(1),
    ]).then(([{ data:cd }, { data:ad }, { data:dd }]) => {
      // Deduplicate by domain — latest cert per domain
      const seen = new Set(), unique = []
      for (const c of (cd||[])) { if (!seen.has(c.domain)) { seen.add(c.domain); unique.push(c) } }
      setCerts(unique)
      setHasAgent((ad||[]).length > 0)
      setHasDnsCreds((dd||[]).length > 0)
      setLoading(false)
    })
  }, [user])

  const certScores = useMemo(() =>
    certs.map(c => ({ cert:c, ...computeChecklist(c, hasAgent, hasDnsCreds) })),
    [certs, hasAgent, hasDnsCreds]
  )

  const fleetScore = certScores.length
    ? Math.round(certScores.reduce((s,c)=>s+c.score,0)/certScores.length) : 0
  const ready     = certScores.filter(c => c.score >= 90)
  const atRisk    = certScores.filter(c => c.score >= 60 && c.score < 90)
  const willBreak = certScores.filter(c => c.score < 60)
  const filtered  = certScores.filter(c => {
    if (filter==='ready')      return c.score >= 90
    if (filter==='at-risk')    return c.score >= 60 && c.score < 90
    if (filter==='will-break') return c.score < 60
    return true
  })

  const fleetLevel   = readinessLevel(fleetScore)
  const daysToMar26  = daysUntilDate(MILESTONES[0].date)
  const inEffect     = daysToMar26 <= 0

  // Fleet ring (larger)
  const ringSize = 100
  const r = (ringSize-12)/2, circ = 2*Math.PI*r

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:860 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:20, paddingTop:8 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:20, marginBottom:3 }}>47-day readiness</h1>
            <p style={{ fontSize:12, color:'var(--v2-text-3)', margin:0 }}>
              CA/B Forum SC-081v3 — how ready is your fleet for shorter cert lifetimes?
            </p>
          </div>
          <a href="https://cabforum.org/working-groups/server/baseline-requirements/requirements/"
            target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11,
              color:'var(--v2-green)', textDecoration:'none', flexShrink:0 }}>
            <ExternalLink size={11}/> CA/B Forum
          </a>
        </div>

        {/* ── Timeline strip — 3 milestones ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
          {MILESTONES.map((m, i) => {
            const dLeft = daysUntilDate(m.date)
            const past  = dLeft <= 0
            return (
              <div key={m.label} style={{ padding:'12px 14px', borderRadius:10,
                background: past ? (i===0?'#FAEEDA':'var(--v2-bg)') : 'var(--v2-surface)',
                border:`0.5px solid ${past?(i===0?'#F0C490':'var(--v2-border)'):'var(--v2-border)'}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600,
                    color: past ? (i===0?'#9A5A30':'var(--v2-text-2)') : 'var(--v2-text-1)' }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20,
                    background: past ? (i===0?'#FAEEDA':'var(--v2-bg)') : '#E1F5EE',
                    color: past ? (i===0?'#9A5A30':'var(--v2-text-3)') : '#1A7A72',
                    border: `0.5px solid ${past?(i===0?'#F0C490':'var(--v2-border)'):'#A8E6DE'}`,
                    fontWeight:500 }}>
                    {past ? 'In effect' : `${dLeft}d away`}
                  </span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--v2-text-1)',
                  fontFamily:'monospace' }}>{m.days} days</div>
                <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:1 }}>max cert validity</div>
              </div>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'var(--v2-text-3)' }}>
            <RefreshCw size={20} style={{ animation:'spin .8s linear infinite',
              margin:'0 auto 10px', display:'block' }}/>
            Analysing fleet…
          </div>
        ) : certs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px', color:'var(--v2-text-3)',
            background:'var(--v2-surface)', borderRadius:12, border:'0.5px solid var(--v2-border)' }}>
            <ShieldCheck size={28} style={{ margin:'0 auto 10px', display:'block', opacity:.4 }}/>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text-2)', marginBottom:4 }}>
              No certificates yet
            </div>
            <div style={{ fontSize:12 }}>Issue your first certificate to see readiness scores.</div>
          </div>
        ) : (
          <>
            {/* ── Fleet score card ── */}
            <div className="v2-card" style={{ padding:'18px 20px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>

                {/* Large score ring */}
                <div style={{ position:'relative', width:ringSize, height:ringSize, flexShrink:0 }}>
                  <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                    <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none"
                      stroke="var(--v2-border)" strokeWidth="8"/>
                    <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none"
                      stroke={fleetLevel.color} strokeWidth="8"
                      strokeDasharray={circ} strokeDashoffset={circ*(1-fleetScore/100)}
                      strokeLinecap="round" transform={`rotate(-90 ${ringSize/2} ${ringSize/2})`}
                      style={{ transition:'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }}/>
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center' }}>
                    <div style={{ fontSize:24, fontWeight:700, color:fleetLevel.color, lineHeight:1 }}>
                      {fleetScore}
                    </div>
                    <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:3 }}>fleet score</div>
                  </div>
                </div>

                {/* Summary stats */}
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:fleetLevel.color, marginBottom:3 }}>
                    {fleetScore >= 90 ? 'Fleet is ready for the 47-day era'
                     : fleetScore >= 60 ? 'Fleet needs attention'
                     : 'Fleet will break — action needed'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:14 }}>
                    {certs.length} domain{certs.length!==1?'s':''} scored across 5 automation criteria
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[
                      { label:'Ready',      count:ready.length,     color:'#1A7A72', bg:'#E1F5EE', border:'#A8E6DE', f:'ready'      },
                      { label:'At risk',    count:atRisk.length,    color:'#9A5A30', bg:'#FAEEDA', border:'#F0C490', f:'at-risk'    },
                      { label:'Will break', count:willBreak.length, color:'#A32D2D', bg:'#FCEBEB', border:'#F7C1C1', f:'will-break' },
                    ].map(({ label, count, color, bg, border, f }) => (
                      <div key={label} onClick={() => setFilter(filter===f?'all':f)}
                        style={{ padding:'8px 12px', borderRadius:8, cursor:'pointer', flex:1,
                          background: filter===f ? bg : 'var(--v2-bg)',
                          border:`0.5px solid ${filter===f?border:'var(--v2-border)'}`,
                          transition:'all .15s' }}>
                        <div style={{ fontSize:18, fontWeight:700, color, fontFamily:'monospace' }}>{count}</div>
                        <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure pills */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
                    textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>
                    Infrastructure
                  </div>
                  {[
                    { label:'Agent installed',       ok:hasAgent    },
                    { label:'DNS provider connected', ok:hasDnsCreds },
                  ].map(({ label, ok }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:7,
                      padding:'6px 10px', borderRadius:7, fontSize:11, fontWeight:500,
                      background: ok?'#E1F5EE':'var(--v2-bg)',
                      border:`0.5px solid ${ok?'#A8E6DE':'var(--v2-border)'}`,
                      color: ok?'#1A7A72':'var(--v2-text-3)' }}>
                      {ok ? <CheckCircle size={12} color="#1A7A72"/> : <XCircle size={12} color="#A32D2D"/>}
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Filter tabs ── */}
            <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:10 }}>
              {[
                { key:'all',        label:`All (${certScores.length})`         },
                { key:'will-break', label:`Will break (${willBreak.length})`   },
                { key:'at-risk',    label:`At risk (${atRisk.length})`          },
                { key:'ready',      label:`Ready (${ready.length})`             },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ padding:'5px 11px', borderRadius:6, fontSize:11, fontWeight:filter===key?600:400,
                    background: filter===key?'var(--v2-green)':'none', fontFamily:'inherit', border:'none',
                    color: filter===key?'white':'var(--v2-text-3)', cursor:'pointer', transition:'all .15s' }}>
                  {label}
                </button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:11, color:'var(--v2-text-3)' }}>
                Click a domain to expand
              </span>
            </div>

            {/* ── Cert rows ── */}
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px', fontSize:12, color:'var(--v2-text-3)' }}>
                No certificates match this filter.
              </div>
            ) : (
              filtered.map(({ cert }) => (
                <CertRow key={cert.id} cert={cert} hasAgent={hasAgent} hasDnsCreds={hasDnsCreds}/>
              ))
            )}

            {/* Footer note */}
            <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, fontSize:11,
              color:'var(--v2-text-3)', background:'var(--v2-bg)',
              border:'0.5px solid var(--v2-border)', lineHeight:1.6 }}>
              CA/B Forum SC-081v3 passed April 2025. Max TLS validity: 200d from Mar 2026 · 100d from Mar 2027 · 47d from Mar 2029.
              DCV reuse drops to 10 days. Manual renewal will be operationally impossible by 2027.
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
