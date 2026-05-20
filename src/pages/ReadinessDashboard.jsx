// ReadinessDashboard.jsx
// 47-day CA/B Forum readiness: fleet score + per-cert automation checklist
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Zap, Server, Globe, Key, RotateCcw, Info
} from 'lucide-react'
import '../styles/design-v2.css'

// CA/B Forum SC-081v3 milestones
const MILESTONES = [
  { date: new Date('2026-03-15'), days: 200, label: 'Mar 2026', desc: '200-day max validity' },
  { date: new Date('2027-03-15'), days: 100, label: 'Mar 2027', desc: '100-day max validity' },
  { date: new Date('2029-03-15'), days: 47,  label: 'Mar 2029', desc: '47-day max validity'  },
]

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function daysUntilDate(d) {
  return Math.ceil((d - Date.now()) / 86400000)
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function certValidityDays(cert) {
  if (!cert.issued_at || !cert.expires_at) return null
  return Math.ceil((new Date(cert.expires_at) - new Date(cert.issued_at)) / 86400000)
}

// ── Compute per-cert readiness checklist ─────────────────────────────
function computeChecklist(cert, hasAgent, hasDnsCreds) {
  const validity = certValidityDays(cert)
  const checks = [
    {
      id:   'auto_renew',
      label:'Auto-renew enabled',
      desc: 'SSLVault will renew this cert automatically before it expires.',
      ok:   !!cert.auto_renew_enabled,
      fix:  'Enable auto-renew in Dashboard → cert settings.',
      weight: 30,
    },
    {
      id:   'dns_provider',
      label:'DNS provider connected',
      desc: 'Automated DCV requires a connected DNS provider (Cloudflare, Vercel, etc).',
      ok:   hasDnsCreds || !!cert.dns_provider_id,
      fix:  'Connect your DNS provider in DNS Providers → Add Provider.',
      weight: 25,
    },
    {
      id:   'install_method',
      label:'Auto-install configured',
      desc: 'After renewal, the new cert must be deployed automatically via agent or cPanel.',
      ok:   cert.install_method === 'agent' || cert.install_method === 'cpanel',
      fix:  'Install the SSLVault agent on your server, or connect via cPanel.',
      weight: 20,
    },
    {
      id:   'validity_200',
      label:'Valid under 200-day rule (Mar 2026)',
      desc: 'CA/B Forum mandates max 200-day certs from March 15, 2026.',
      ok:   validity !== null && validity <= 200,
      fix:  'This cert was issued for over 200 days. It won\'t be re-issuable after Mar 2026 until renewed.',
      weight: 15,
    },
    {
      id:   'keylocker',
      label:'Private key secured in KeyLocker',
      desc: 'Private key is encrypted and stored securely — not exposed in plain text.',
      ok:   !!cert.keylocker_key_id,
      fix:  'Rotate the key via KeyLocker to store it encrypted.',
      weight: 10,
    },
  ]
  const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0)
  return { checks, score }
}

// ── Readiness level from score ────────────────────────────────────────
function readinessLevel(score) {
  if (score >= 90) return { label:'Ready',    color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', icon:ShieldCheck  }
  if (score >= 60) return { label:'At risk',  color:'#d97706', bg:'#fffbeb', border:'#fde68a', icon:AlertTriangle }
  return              { label:'Will break', color:'#dc2626', bg:'#fef2f2', border:'#fecaca', icon:ShieldAlert  }
}

// ── Milestone compliance for a cert ──────────────────────────────────
function certMilestoneStatus(cert) {
  const validity = certValidityDays(cert)
  return MILESTONES.map(m => ({
    ...m,
    compliant: validity !== null && validity <= m.days,
    daysLeft:  daysUntilDate(m.date),
  }))
}

// ── Single cert row ───────────────────────────────────────────────────
function CertRow({ cert, hasAgent, hasDnsCreds }) {
  const [open, setOpen] = useState(false)   // always closed by default
  const { checks, score } = useMemo(
    () => computeChecklist(cert, hasAgent, hasDnsCreds),
    [cert, hasAgent, hasDnsCreds]
  )
  const level      = readinessLevel(score)
  const milestones = certMilestoneStatus(cert)
  const passCount  = checks.filter(c => c.ok).length
  const failCount  = checks.filter(c => !c.ok).length

  const ICONS = {
    auto_renew:    RotateCcw,
    dns_provider:  Globe,
    install_method:Server,
    validity_200:  ShieldCheck,
    keylocker:     Key,
  }

  return (
    <div style={{
      border:`0.5px solid ${open ? level.color+'55' : 'var(--v2-border)'}`,
      borderRadius:12,
      marginBottom:8,
      overflow:'hidden',
      transition:'border-color .2s, box-shadow .2s',
      boxShadow: open ? `0 4px 20px ${level.color}14` : 'none',
    }}>

      {/* ── Collapsed header — always visible ── */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
          background: open ? level.bg : 'var(--v2-surface)',
          cursor:'pointer', transition:'background .2s',
          userSelect:'none',
        }}
        onMouseEnter={e => { if(!open) e.currentTarget.style.background='var(--v2-surface-3)' }}
        onMouseLeave={e => { if(!open) e.currentTarget.style.background='var(--v2-surface)' }}
      >
        {/* Score ring */}
        <div style={{ position:'relative', width:46, height:46, flexShrink:0 }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            <circle cx="23" cy="23" r="19" fill="none" stroke="var(--v2-border)" strokeWidth="4.5"/>
            <circle cx="23" cy="23" r="19" fill="none"
              stroke={level.color} strokeWidth="4.5"
              strokeDasharray={`${2*Math.PI*19}`}
              strokeDashoffset={`${2*Math.PI*19*(1-score/100)}`}
              strokeLinecap="round"
              transform="rotate(-90 23 23)"
              style={{ transition:'stroke-dashoffset .7s cubic-bezier(.16,1,.3,1)' }}
            />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:12, fontWeight:700, color:level.color }}>
            {score}
          </div>
        </div>

        {/* Domain + status row */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {cert.domain}
            </span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:10, flexShrink:0,
              background:level.bg, color:level.color, border:`0.5px solid ${level.border}` }}>
              {level.label}
            </span>
          </div>
          {/* Milestone dots + pass count */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {milestones.map(m => (
              <div key={m.label} style={{ display:'flex', alignItems:'center', gap:3 }}>
                {m.compliant
                  ? <CheckCircle size={10} color="#16a34a"/>
                  : <XCircle    size={10} color="#dc2626"/>}
                <span style={{ fontSize:10, fontWeight:500,
                  color: m.compliant ? '#16a34a' : '#dc2626' }}>{m.label}</span>
              </div>
            ))}
            <span style={{ fontSize:10, color:'var(--v2-text-3)' }}>·</span>
            <span style={{ fontSize:10, color:'var(--v2-text-3)' }}>
              {passCount}/{checks.length} checks
            </span>
            {failCount > 0 && (
              <span style={{ fontSize:10, fontWeight:600, color:'#dc2626' }}>
                · {failCount} action{failCount>1?'s':''} needed
              </span>
            )}
          </div>
        </div>

        {/* Right: expiry + chevron */}
        <div style={{ textAlign:'right', flexShrink:0, marginRight:4 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)' }}>
            {fmtDate(cert.expires_at)}
          </div>
          <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
            {cert.cert_type||'DV'} · {certValidityDays(cert)??'?'}d validity
          </div>
        </div>

        {/* Animated chevron */}
        <div style={{ color:'var(--v2-text-3)', flexShrink:0,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition:'transform .25s cubic-bezier(.16,1,.3,1)' }}>
          <ChevronDown size={15}/>
        </div>
      </div>

      {/* ── Expandable body — CSS max-height animation ── */}
      <div style={{
        maxHeight: open ? '900px' : '0px',
        overflow: 'hidden',
        transition: open
          ? 'max-height .45s cubic-bezier(.16,1,.3,1)'
          : 'max-height .28s cubic-bezier(.4,0,1,1)',
      }}>
        <div style={{
          padding:'16px 18px 18px',
          borderTop:`0.5px solid ${level.border}`,
          background:'var(--v2-surface)',
        }}>

          {/* Milestone timeline — horizontal */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
              CA/B Forum milestones
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {milestones.map(m => (
                <div key={m.label} style={{
                  padding:'10px 12px', borderRadius:9,
                  background: m.compliant ? '#f0fdf4' : '#fef2f2',
                  border:`1px solid ${m.compliant ? '#bbf7d0' : '#fecaca'}`,
                  transition:'all .2s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    {m.compliant
                      ? <CheckCircle size={13} color="#16a34a"/>
                      : <XCircle    size={13} color="#dc2626"/>}
                    <span style={{ fontSize:12, fontWeight:600,
                      color: m.compliant ? '#16a34a' : '#dc2626' }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize:11, color: m.compliant ? '#15803d' : '#b91c1c',
                    marginBottom:3 }}>{m.desc}</div>
                  <div style={{ fontSize:10, color:'var(--v2-text-3)' }}>
                    {m.daysLeft > 0 ? `${m.daysLeft}d away` : 'In effect now'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automation checklist — compact table style */}
          <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
            textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
            Automation checklist
          </div>
          <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:9, overflow:'hidden' }}>
            {checks.map((c, i) => {
              const CheckIcon = ICONS[c.id] || Zap
              return (
                <div key={c.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                  borderBottom: i < checks.length-1 ? '0.5px solid var(--v2-border)' : 'none',
                  background: c.ok ? '#fafffe' : '#fffafa',
                  transition:'background .15s',
                }}>
                  {/* Icon */}
                  <div style={{ width:30, height:30, borderRadius:7, flexShrink:0,
                    background: c.ok ? '#dcfce7' : '#fee2e2',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckIcon size={13} color={c.ok ? '#16a34a' : '#dc2626'}/>
                  </div>

                  {/* Label + description */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500,
                      color: c.ok ? '#15803d' : '#b91c1c', marginBottom:1 }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)', lineHeight:1.4 }}>
                      {c.ok ? c.desc : c.fix}
                    </div>
                  </div>

                  {/* Pass/Fail badge + weight */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:8,
                      background: c.ok ? '#16a34a' : '#fef2f2',
                      color: c.ok ? 'white' : '#dc2626',
                      border: c.ok ? 'none' : '0.5px solid #fecaca' }}>
                      {c.ok ? '✓ PASS' : '✗ FAIL'}
                    </span>
                    <span style={{ fontSize:10, color:'var(--v2-text-3)', width:24, textAlign:'right' }}>
                      {c.weight}pt
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Fleet score ring ──────────────────────────────────────────────────
function FleetRing({ score, size = 120 }) {
  const r    = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const level = readinessLevel(score)
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--v2-border)" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={level.color} strokeWidth="10"
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${circ*(1-score/100)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:28, fontWeight:700, color:level.color, lineHeight:1 }}>{score}</div>
        <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>fleet score</div>
      </div>
    </div>
  )
}

// ══ MAIN PAGE ═════════════════════════════════════════════════════════
export default function ReadinessDashboard({ user }) {
  const [certs,      setCerts]      = useState([])
  const [hasAgent,   setHasAgent]   = useState(false)
  const [hasDnsCreds,setHasDnsCreds]= useState(false)
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('certificates').select(
        'id,domain,expires_at,issued_at,cert_type,auto_renew_enabled,dns_provider_id,' +
        'install_method,install_status,dcv_method,keylocker_key_id,auto_reissue_enabled,issuer'
      ).eq('user_id', user.id).neq('status','revoked').order('expires_at',{ascending:true}),
      supabase.from('persistent_agents').select('id').eq('user_id', user.id).limit(1),
      supabase.from('dns_credentials').select('id').eq('user_id', user.id).limit(1),
    ]).then(([{ data:certsData }, { data:agentData }, { data:dnsData }]) => {
      setCerts(certsData||[])
      setHasAgent((agentData||[]).length > 0)
      setHasDnsCreds((dnsData||[]).length > 0)
      setLoading(false)
    })
  }, [user])

  // Compute all scores
  const certScores = useMemo(() =>
    certs.map(c => ({
      cert: c,
      ...computeChecklist(c, hasAgent, hasDnsCreds),
    })),
    [certs, hasAgent, hasDnsCreds]
  )

  const fleetScore = certScores.length
    ? Math.round(certScores.reduce((s,c)=>s+c.score,0)/certScores.length)
    : 0

  const ready     = certScores.filter(c => c.score >= 90)
  const atRisk    = certScores.filter(c => c.score >= 60 && c.score < 90)
  const willBreak = certScores.filter(c => c.score < 60)

  const filtered = certScores.filter(c => {
    if (filter === 'ready')      return c.score >= 90
    if (filter === 'at-risk')    return c.score >= 60 && c.score < 90
    if (filter === 'will-break') return c.score < 60
    return true
  })

  // Days to first milestone
  const daysToMar2026 = daysUntilDate(MILESTONES[0].date)

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:900 }}>

        {/* Header */}
        <div style={{ paddingTop:8, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
            gap:12, flexWrap:'wrap' }}>
            <div>
              <h1 className="v2-h1" style={{ fontSize:22 }}>47-day readiness</h1>
              <p style={{ fontSize:13, color:'var(--v2-text-3)', marginTop:4 }}>
                CA/B Forum SC-081v3 — is your fleet ready for shorter cert lifetimes?
              </p>
            </div>
            <a href="https://www.digicert.com/blog/tls-certificate-lifetimes-will-officially-reduce-to-47-days"
              target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
                color:'var(--v2-green)', textDecoration:'none', marginTop:8 }}>
              <ExternalLink size={11}/> CA/B Forum SC-081v3
            </a>
          </div>
        </div>

        {/* Countdown banner */}
        <div style={{
          background: daysToMar2026 <= 60 ? '#fef2f2' : '#fffbeb',
          border:`0.5px solid ${daysToMar2026<=60?'#fecaca':'#fde68a'}`,
          borderRadius:10, padding:'12px 16px', marginBottom:20,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <AlertTriangle size={16} color={daysToMar2026<=60?'#dc2626':'#d97706'} style={{flexShrink:0}}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500,
              color:daysToMar2026<=60?'#b91c1c':'#92400e' }}>
              {daysToMar2026 > 0
                ? `${daysToMar2026} days until March 15, 2026 — max cert validity drops to 200 days`
                : '200-day maximum is now in effect (March 15, 2026)'}
            </div>
            <div style={{ fontSize:11, color:daysToMar2026<=60?'#dc2626':'#d97706', marginTop:2 }}>
              Then 100 days from March 2027 · 47 days from March 2029 · Manual renewal will be impossible
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:700,
              color:daysToMar2026<=60?'#dc2626':'#d97706', fontFamily:'monospace' }}>
              {Math.max(0,daysToMar2026)}d
            </div>
            <div style={{ fontSize:9, color:'var(--v2-text-3)', fontWeight:500 }}>REMAINING</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--v2-text-3)' }}>
            <RefreshCw size={22} style={{ animation:'spin .8s linear infinite',
              margin:'0 auto 10px', display:'block' }}/>
            Analysing your certificate fleet…
          </div>
        ) : certs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <ShieldCheck size={32} style={{ color:'var(--v2-text-3)', margin:'0 auto 12px', display:'block' }}/>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--v2-text-2)', marginBottom:6 }}>
              No certificates to analyse
            </div>
            <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>
              Issue your first certificate to see your readiness score.
            </div>
          </div>
        ) : (
          <>
            {/* Fleet summary */}
            <div className="v2-card" style={{ padding:'20px', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
                <FleetRing score={fleetScore}/>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:readinessLevel(fleetScore).color,
                    marginBottom:4 }}>
                    Fleet is {readinessLevel(fleetScore).label.toLowerCase()}
                    {fleetScore>=90?' for the 47-day era':fleetScore>=60?' — action needed':' — urgent attention required'}
                  </div>
                  <div style={{ fontSize:12, color:'var(--v2-text-3)', marginBottom:16, lineHeight:1.6 }}>
                    Score is the average automation readiness across all {certs.length} certificate{certs.length!==1?'s':''}.
                    Each cert is assessed on 5 criteria weighted by criticality.
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      { label:'Ready',      count:ready.length,     color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', f:'ready'      },
                      { label:'At risk',    count:atRisk.length,    color:'#d97706', bg:'#fffbeb', border:'#fde68a', f:'at-risk'    },
                      { label:'Will break', count:willBreak.length, color:'#dc2626', bg:'#fef2f2', border:'#fecaca', f:'will-break' },
                    ].map(({ label, count, color, bg, border, f }) => (
                      <div key={label}
                        onClick={() => setFilter(filter===f?'all':f)}
                        style={{ padding:'10px 12px', borderRadius:8, cursor:'pointer',
                          background: filter===f ? bg : 'var(--v2-surface-3)',
                          border:`0.5px solid ${filter===f?border:'var(--v2-border)'}`,
                          transition:'all .15s' }}>
                        <div style={{ fontSize:20, fontWeight:600, color, fontFamily:'monospace' }}>{count}</div>
                        <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Infrastructure status */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:180 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
                    textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>
                    Infrastructure
                  </div>
                  {[
                    { label:'Agent installed',      ok:hasAgent,    fix:'Install agent on your VPS'     },
                    { label:'DNS provider connected',ok:hasDnsCreds, fix:'Add a DNS provider credential' },
                  ].map(({ label, ok, fix }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                      borderRadius:7, background: ok?'#f0fdf4':'#fef2f2',
                      border:`0.5px solid ${ok?'#bbf7d0':'#fecaca'}` }}>
                      {ok ? <CheckCircle size={13} color="#16a34a"/>
                           : <XCircle   size={13} color="#dc2626"/>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:500,
                          color:ok?'#15803d':'#b91c1c', lineHeight:1.3 }}>{label}</div>
                        {!ok && <div style={{ fontSize:10, color:'#dc2626', marginTop:1 }}>{fix}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:12, alignItems:'center' }}>
              <div style={{ display:'flex', gap:1, border:'0.5px solid var(--v2-border)',
                borderRadius:8, overflow:'hidden' }}>
                {[
                  { key:'all',        label:`All (${certScores.length})` },
                  { key:'will-break', label:`Will break (${willBreak.length})` },
                  { key:'at-risk',    label:`At risk (${atRisk.length})` },
                  { key:'ready',      label:`Ready (${ready.length})` },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setFilter(key)}
                    style={{ padding:'7px 12px', fontSize:11, fontWeight:filter===key?500:400,
                      background: filter===key?'var(--v2-surface-3)':'none',
                      border:'none', cursor:'pointer', fontFamily:'inherit',
                      color: filter===key?'var(--v2-text)':'var(--v2-text-3)' }}>
                    {label}
                  </button>
                ))}
              </div>
              <span style={{ marginLeft:'auto', fontSize:11, color:'var(--v2-text-3)' }}>
                Click any cert to expand checklist
              </span>
            </div>

            {/* Cert list */}
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px', fontSize:13, color:'var(--v2-text-3)' }}>
                No certificates match this filter.
              </div>
            ) : (
              filtered.map(({ cert, checks, score }) => (
                <CertRow
                  key={cert.id}
                  cert={cert}
                  hasAgent={hasAgent}
                  hasDnsCreds={hasDnsCreds}

                />
              ))
            )}

            {/* CA/B Forum info footer */}
            <div style={{ marginTop:20, padding:'14px 16px',
              background:'var(--v2-surface-3)', borderRadius:10,
              border:'0.5px solid var(--v2-border)', fontSize:11,
              color:'var(--v2-text-3)', lineHeight:1.7 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <Info size={13} style={{ flexShrink:0, marginTop:1 }} color="var(--v2-text-3)"/>
                <div>
                  <strong style={{ color:'var(--v2-text-2)' }}>CA/B Forum Ballot SC-081v3</strong> — passed
                  unanimously April 11, 2025. Maximum TLS cert validity: 200 days from Mar 15, 2026 ·
                  100 days from Mar 15, 2027 · 47 days from Mar 15, 2029. DCV reuse drops to 10 days.
                  Manual renewal will be operationally impossible by 2027.{' '}
                  <a href="https://cabforum.org/working-groups/server/baseline-requirements/requirements/"
                    target="_blank" rel="noreferrer"
                    style={{ color:'var(--v2-green)', textDecoration:'none' }}>
                    Read the full requirements →
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
      <style>{`
        @keyframes spin      { from{transform:rotate(0)}to{transform:rotate(360deg)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
