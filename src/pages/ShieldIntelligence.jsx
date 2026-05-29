// ShieldIntelligence.jsx
// Unified page: Overview (Analytics) · TLS Grades · CT Watch · Mass Scan
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, RefreshCw, Trophy, ShieldAlert, Scan,
  CheckCircle, XCircle, AlertTriangle, Globe, Plus,
  ChevronDown, ChevronUp, Download, Search, Trash2,
  ExternalLink, Activity, TrendingUp
} from 'lucide-react'
import '../styles/design-v2.css'

const SB = 'https://frthcwkntciaakqsppss.supabase.co'

async function api(fn, tok, body) {
  const r = await fetch(`${SB}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── shared helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

function gradeStyle(g) {
  if (!g || g==='F') return { color:'#a93226', bg:'rgba(192,57,43,0.1)', border:'rgba(192,57,43,0.2)' }
  if (g==='D')       return { color:'#c0392b', bg:'rgba(230,126,34,0.12)', border:'rgba(230,126,34,0.4)' }
  if (g==='C')       return { color:'#c0392b', bg:'rgba(230,126,34,0.12)', border:'rgba(230,126,34,0.4)' }
  if (g==='B')       return { color:'#a93226', bg:'transparent', border:'rgba(192,57,43,0.3)' }
  if (g==='A')       return { color:'#a93226', bg:'transparent', border:'rgba(192,57,43,0.3)' }
  if (g==='A+')      return { color:'#ffffff', bg:'transparent', border:'#e07060' }
  return { color:'#b0a8a0', bg:'var(--v2-bg)', border:'var(--v2-border)' }
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function GradeBadge({ grade, size = 44 }) {
  const gs = gradeStyle(grade)
  return (
    <div style={{ width:size, height:size, borderRadius:10, flexShrink:0,
      background:gs.bg, border:`1px solid ${gs.border}`,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:size>40?16:12, fontWeight:700, color:gs.color, fontFamily:'monospace' }}>
        {grade || 'F'}
      </span>
    </div>
  )
}

function Tick({ ok, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {ok ? <CheckCircle size={11} color="#c0392b"/> : <XCircle size={11} color="#a93226"/>}
      <span style={{ fontSize:11, color:ok?'#f0ede8':'#a93226' }}>{label}</span>
    </div>
  )
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0))
  const color = pct>=80?'#f0ede8':pct>=60?'#a93226':pct>=50?'#c0392b':'#a93226'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'var(--v2-border)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width .6s' }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:600, color, fontFamily:'monospace', minWidth:28, textAlign:'right' }}>
        {Math.round(pct)}
      </span>
    </div>
  )
}

function StatCard({ label, val, sub, color, bg }) {
  return (
    <div style={{ padding:'12px 14px', borderRadius:10,
      background:bg||'var(--v2-surface)', border:'0.5px solid var(--v2-border)' }}>
      <div style={{ fontSize:11, color:'#b0a8a0', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||'var(--v2-text-1)',
        fontFamily:'monospace', lineHeight:1 }}>{val}</div>
      {sub && <div style={{ fontSize:10, color:'#b0a8a0', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function Spinner() {
  return <RefreshCw size={13} style={{ animation:'spin .7s linear infinite', flexShrink:0 }}/>
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW (Analytics)
// ══════════════════════════════════════════════════════════════════════
function OverviewTab({ user }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('certificates').select('id,domain,status,expires_at,source,issued_at,tls_grade,install_method'),
      supabase.from('ssl_orders').select('id,domain,status,product_name,created_at'),
      supabase.from('keylocker_keys').select('id,status'),
    ]).then(([c, o, k]) => {
      const certs  = c.data || []
      const orders = o.data || []
      const keys   = k.data || []
      const now    = new Date()

      const active     = certs.filter(c => c.status === 'active')
      const expiring30 = active.filter(c => c.expires_at && Math.ceil((new Date(c.expires_at)-now)/86400000) <= 30)
      const expiring7  = active.filter(c => c.expires_at && Math.ceil((new Date(c.expires_at)-now)/86400000) <= 7)
      const thisMonth  = orders.filter(o => new Date(o.created_at) > new Date(now.getFullYear(), now.getMonth(), 1))

      const grades = { 'A+':0, A:0, B:0, C:0, D:0, F:0, '—':0 }
      active.forEach(c => {
        if (c.tls_grade && grades[c.tls_grade] !== undefined) grades[c.tls_grade]++
        else grades['—']++
      })

      const bySource = {}
      active.forEach(c => { const s = c.source||'unknown'; bySource[s]=(bySource[s]||0)+1 })

      const deployed = active.filter(c => c.install_method === 'agent' || c.install_method === 'cpanel').length
      const keyVault = keys.filter(k => k.status === 'active').length

      setStats({ total:certs.length, active:active.length, expiring30:expiring30.length,
        expiring7:expiring7.length, thisMonth:thisMonth.length, orders:orders.length,
        grades, bySource, deployed, keyVault })
      setLoading(false)
    })
  }, [user])

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'#b0a8a0' }}>
      <Spinner/><span style={{ marginLeft:8 }}>Loading analytics…</span>
    </div>
  )

  const { total=0, active=0, expiring30=0, expiring7=0, thisMonth=0,
          grades={}, bySource={}, deployed=0, keyVault=0 } = stats || {}

  const gradeEntries = [['A+','#f0ede8'],['A','#a93226'],['B','#a93226'],
    ['C','#c0392b'],['D','#c0392b'],['F','#a93226'],['—','rgba(240,237,232,0.45)']]
  const maxGrade = Math.max(...gradeEntries.map(([g]) => grades[g]||0), 1)

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:16 }}>
        <StatCard label="Active certs" val={active} sub={`of ${total} total`}
          color={active>0?'#f0ede8':'var(--v2-text-1)'}/>
        <StatCard label="Expiring ≤ 30d" val={expiring30} sub={expiring7>0?`${expiring7} within 7 days`:'none critical'}
          color={expiring30>0?'#c0392b':'var(--v2-text-1)'} bg={expiring30>0?'rgba(230,126,34,0.12)':undefined}/>
        <StatCard label="Deployed to servers" val={deployed} sub="agent or cPanel"
          color={deployed>0?'#f0ede8':'var(--v2-text-1)'}/>
        <StatCard label="Keys in vault" val={keyVault} sub="AES-256 encrypted"
          color="#c0392b"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:12, marginBottom:12 }}>

        {/* TLS grade distribution */}
        <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
          borderRadius:10, padding:'14px 16px' , overflowX:'auto'}}>
          <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
            letterSpacing:'0.4px', marginBottom:14 }}>TLS grade distribution</div>
          {gradeEntries.map(([g, color]) => (
            <div key={g} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
              <span style={{ width:24, fontSize:11, fontWeight:700, color, fontFamily:'monospace', textAlign:'center' }}>{g}</span>
              <div style={{ flex:1, height:22, background:'rgba(255,255,255,0.03)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                {(grades[g]||0) > 0 && (
                  <div style={{ position:'absolute', left:0, top:0, bottom:0,
                    width:`${Math.max(8, Math.round(((grades[g]||0)/maxGrade)*100))}%`,
                    background:gradeStyle(g==='—'?'Z':g).bg,
                    borderRight:`2px solid ${color}`,
                    display:'flex', alignItems:'center', paddingLeft:8,
                    transition:'width .6s cubic-bezier(.16,1,.3,1)' }}>
                    <span style={{ fontSize:10, fontWeight:700, color }}>{grades[g]}</span>
                  </div>
                )}
                {(grades[g]||0) === 0 && (
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                    fontSize:10, color:'#b0a8a0' }}>0</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Source & activity */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
            borderRadius:10, padding:'14px 16px', flex:1 , overflowX:'auto'}}>
            <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
              letterSpacing:'0.4px', marginBottom:12 }}>Certificate sources</div>
            {Object.entries(bySource).length === 0 ? (
              <div style={{ fontSize:12, color:'#b0a8a0' }}>No certificates yet</div>
            ) : Object.entries(bySource).map(([src, count]) => (
              <div key={src} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom:8, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)',
                border:'0.5px solid var(--v2-border)' }}>
                <span style={{ fontSize:12, color:'#f0ede8', fontWeight:500, textTransform:'capitalize' }}>
                  {src === 'gogetssl' ? 'RapidSSL (SSLVault)' : src}
                </span>
                <span style={{ fontSize:13, fontWeight:700, color:'#ffffff', fontFamily:'monospace' }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
            borderRadius:10, padding:'14px 16px' , overflowX:'auto'}}>
            <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
              letterSpacing:'0.4px', marginBottom:10 }}>Activity</div>
            <div style={{ display:'flex', gap:16 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:'#ffffff', fontFamily:'monospace' }}>{thisMonth}</div>
                <div style={{ fontSize:10, color:'#b0a8a0' }}>orders this month</div>
              </div>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:'#f0ede8', fontFamily:'monospace' }}>{active}</div>
                <div style={{ fontSize:10, color:'#b0a8a0' }}>certs active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expiry health bar */}
      {active > 0 && (
        <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
          borderRadius:10, padding:'14px 16px' , overflowX:'auto'}}>
          <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
            letterSpacing:'0.4px', marginBottom:12 }}>Fleet health</div>
          <div style={{ display:'flex', height:12, borderRadius:8, overflow:'hidden', gap:1 }}>
            {[
              { n:expiring7,             color:'#a93226', label:'Critical' },
              { n:expiring30-expiring7,  color:'#c0392b', label:'Expiring' },
              { n:active-expiring30,     color:'#ffffff', label:'Healthy' },
            ].map(({ n, color, label }) => n > 0 && (
              <div key={label} title={`${label}: ${n}`}
                style={{ flex:n, background:color, minWidth:4, transition:'flex .6s' }}/>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:8 }}>
            {[
              { label:'Critical (≤7d)', n:expiring7,  color:'#a93226' },
              { label:'Expiring (≤30d)', n:expiring30, color:'#c0392b' },
              { label:'Healthy',        n:active-expiring30, color:'#ffffff' },
            ].map(({ label, n, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:color }}/>
                <span style={{ fontSize:10, color:'#b0a8a0' }}>{label}: </span>
                <span style={{ fontSize:10, fontWeight:600, color }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TLS domain row (must be a component — no hooks inside .map) ──────
function DomainScoreRow({ s, scanning, onRescan }) {
  const [expanded, setExpanded] = useState(false)
  const style = gradeStyle(s.grade)
  return (
    <div style={{ border:`0.5px solid ${style.border}`, borderRadius:10,
      overflow:'hidden', marginBottom:8, background:'var(--v2-surface)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
        cursor:'pointer' }} onClick={() => setExpanded(v=>!v)}>
        <GradeBadge grade={s.grade}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#f0ede8',
              fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {s.domain}
            </span>
            {!s.cert_valid && (
              <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
                background:'rgba(192,57,43,0.1)', color:'#a93226' }}>UNREACHABLE</span>
            )}
          </div>
          <ScoreBar score={s.score}/>
        </div>
        <div style={{ display:'flex', gap:10, flexShrink:0 }}>
          <Tick ok={s.hsts} label="HSTS"/>
          <Tick ok={s.caa}  label="CAA"/>
          <Tick ok={s.cert_valid} label="TLS"/>
          {s.expiry_days != null && (
            <span style={{ fontSize:11, fontWeight:600,
              color:s.expiry_days<=0?'#a93226':s.expiry_days<=30?'#c0392b':'#f0ede8' }}>
              {s.expiry_days<=0?'Expired':`${s.expiry_days}d`}
            </span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onRescan(s.domain) }}
          disabled={scanning===s.domain}
          style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'4px 10px',
            borderRadius:6, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(255,255,255,0.04)',
            cursor:'pointer', fontFamily:'inherit', color:'#e8e0d8' }}>
          <RefreshCw size={10} style={scanning===s.domain?{animation:'spin .8s linear infinite'}:{}}/> Rescan
        </button>
        <div style={{ color:'#b0a8a0', flexShrink:0 }}>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:'12px 14px', borderTop:`0.5px solid ${style.border}`,
          background:'rgba(255,255,255,0.03)',
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10 }}>
          {[
            ['Score',       `${Math.round(s.score||0)} / 100`],
            ['Issuer',      s.issuer||'—'],
            ['Expiry',      s.expiry_days!=null?(s.expiry_days<=0?'Expired':`${s.expiry_days} days`):'—'],
            ['TLS valid',   s.cert_valid?'Yes ✓':'No ✗'],
            ['HSTS',        s.hsts?'Enabled ✓':'Missing ✗'],
            ['CAA record',  s.caa?'Present ✓':'Missing ✗'],
            ['Last scanned',timeAgo(s.scanned_at)],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize:10, color:'#b0a8a0', marginBottom:2,
                fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px' }}>{label}</div>
              <div style={{ fontSize:12, color:'#f0ede8', fontWeight:500 }}>{val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2 — TLS GRADES
// ══════════════════════════════════════════════════════════════════════
function TLSGradesTab({ tok, user }) {
  const [scores,  setScores]  = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning,setScanning]= useState(null)
  const [newDomain,setNewDomain]=useState('')
  const [adding,  setAdding]  = useState(false)
  const [addErr,  setAddErr]  = useState('')
  const inputRef = useRef(null)

  const load = useCallback(async (t) => {
    const token = t || tok
    if (!token) return
    const d = await api('ssl-health', token, { action:'list', user_id:user?.id })
    if (d.ok) setScores(d.scores || [])
    setLoading(false)
  }, [tok, user])

  useEffect(() => { if (tok) load() }, [tok, load])

  const rescan = async (domain) => {
    setScanning(domain)
    await api('ssl-health', tok, { action:'scan', domain, user_id:user?.id })
    await load()
    setScanning(null)
  }

  const addDomain = async () => {
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d) return
    setAdding(true); setAddErr('')
    const res = await api('ssl-health', tok, { action:'scan', domain:d, user_id:user?.id })
    if (res.ok) { setNewDomain(''); await load() }
    else setAddErr(res.error || 'Scan failed')
    setAdding(false)
  }

  const gs = gradeStyle
  const avgScore = scores.length ? Math.round(scores.reduce((a,s) => a+(s.score||0), 0)/scores.length) : 0
  const issues = scores.filter(s => !s.hsts || !s.caa || (s.expiry_days != null && s.expiry_days <= 30))

  return (
    <div>
      {/* Stats */}
      {scores.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:16 }}>
          <StatCard label="Domains tracked" val={scores.length}/>
          <StatCard label="Average score" val={avgScore}
            color={avgScore>=80?'#f0ede8':avgScore>=60?'#a93226':'#a93226'}/>
          <StatCard label="Grade A / A+"
            val={(scores.filter(s=>s.grade==='A'||s.grade==='A+').length)}
            color="#c0392b"/>
          <StatCard label="Need attention" val={issues.length}
            color={issues.length>0?'#a93226':'#f0ede8'}
            bg={issues.length>0?'rgba(192,57,43,0.1)':undefined}/>
        </div>
      )}

      {/* Add domain */}
      <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
        borderRadius:10, padding:'12px 14px', marginBottom:14 , overflowX:'auto'}}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Globe size={14} color="var(--v2-text-3)" style={{ flexShrink:0 }}/>
          <input ref={inputRef} value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key==='Enter' && addDomain()}
            placeholder="Enter any domain to scan — e.g. example.com"
            style={{ flex:1, fontSize:13, border:'none', outline:'none', background:'transparent',
              color:'#f0ede8' }}/>
          <button onClick={addDomain} disabled={adding || !newDomain.trim()}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 12px',
              borderRadius:7, border:'none', background:'var(--v2-green)', color:'#ffffff',
              cursor:adding||!newDomain.trim()?'not-allowed':'pointer', fontFamily:'inherit',
              fontWeight:600, opacity:adding||!newDomain.trim()?0.6:1 }}>
            {adding ? <><Spinner/> Scanning…</> : <><Plus size={11}/> Scan</>}
          </button>
        </div>
        {addErr && <div style={{ fontSize:11, color:'#a93226', marginTop:6 }}>{addErr}</div>}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#b0a8a0' }}>
          <Spinner/><span style={{ marginLeft:8 }}>Loading grades…</span>
        </div>
      ) : scores.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, background:'var(--v2-surface)',
          border:'0.5px solid var(--v2-border)', borderRadius:10 }}>
          <Trophy size={28} style={{ color:'#b0a8a0', margin:'0 auto 10px', display:'block' }}/>
          <div style={{ fontSize:13, fontWeight:500, color:'#e8e0d8', marginBottom:4 }}>No domains scanned yet</div>
          <div style={{ fontSize:12, color:'#b0a8a0' }}>Enter a domain above to get your first TLS grade.</div>
        </div>
      ) : scores.map(s => (
        <DomainScoreRow key={s.id || s.domain} s={s} scanning={scanning} onRescan={rescan}/>
      ))}
      {scores.length > 0 && (
        <div style={{ fontSize:11, color:'#b0a8a0', textAlign:'center', marginTop:8 }}>
          A+ ≥90 · A ≥80 · B ≥70 · C ≥60 · D ≥50 · F &lt;50
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3 — CT WATCH
// ══════════════════════════════════════════════════════════════════════
const CT_STATUS = {
  unknown:    { label:'Unknown',    color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.3)' },
  phishing:   { label:'Phishing',   color:'#c0392b', bg:'rgba(230,126,34,0.12)', border:'rgba(230,126,34,0.4)' },
  suspicious: { label:'Suspicious', color:'#c0392b', bg:'rgba(230,126,34,0.12)', border:'rgba(230,126,34,0.4)' },
  known:      { label:'Known',      color:'#ffffff', bg:'transparent', border:'rgba(192,57,43,0.3)' },
}

function CTWatchTab({ tok, user }) {
  const [shadows,   setShadows]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(null)
  const [dismissing,setDismissing]= useState(null)
  const [marking,   setMarking]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api('ca-intelligence', tok, { action:'get_shadow_certs' })
    if (r.ok) setShadows((r.shadows || []).filter(s => !s.expires_at || new Date(s.expires_at) > new Date()))
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) load() }, [tok, load])

  const dismiss = async (id) => {
    setDismissing(id)
    await api('ca-intelligence', tok, { action:'dismiss_shadow', shadow_id:id })
    setShadows(s => s.filter(x => x.id !== id))
    setDismissing(null)
  }

  const mark = async (id, status) => {
    setMarking(id)
    await api('ca-intelligence', tok, { action:'mark_shadow', shadow_id:id, status })
    setShadows(s => s.map(x => x.id===id ? {...x, status} : x))
    setMarking(null)
  }

  const unknowns   = shadows.filter(s => !s.dismissed && s.status !== 'known')
  const known      = shadows.filter(s => s.dismissed || s.status === 'known')

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:16 }}>
        <StatCard label="Total findings" val={shadows.length}/>
        <StatCard label="Needs review" val={unknowns.length}
          color={unknowns.length>0?'#a93226':'#f0ede8'}
          bg={unknowns.length>0?'rgba(192,57,43,0.1)':undefined}/>
        <StatCard label="Confirmed safe" val={known.length} color="#c0392b"/>
      </div>

      {/* Explanation */}
      <div style={{ background:'transparent', border:'0.5px solid rgba(192,57,43,0.3)', borderRadius:10,
        padding:'12px 16px', marginBottom:16, display:'flex', gap:10 }}>
        <ShieldAlert size={16} color="#c0392b" style={{ flexShrink:0, marginTop:1 }}/>
        <div style={{ fontSize:12, color:'#a93226', lineHeight:1.6 }}>
          CT Watch monitors Certificate Transparency logs for any certificate issued for your domains
          outside of SSLVault. Unauthorised certs may indicate phishing or shadow IT.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#b0a8a0' }}>
          <Spinner/><span style={{ marginLeft:8 }}>Loading CT findings…</span>
        </div>
      ) : shadows.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, background:'var(--v2-surface)',
          border:'0.5px solid var(--v2-border)', borderRadius:10 }}>
          <Shield size={28} style={{ color:'#b0a8a0', margin:'0 auto 10px', display:'block', opacity:.5 }}/>
          <div style={{ fontSize:13, fontWeight:500, color:'#e8e0d8', marginBottom:4 }}>No shadow certs found</div>
          <div style={{ fontSize:12, color:'#b0a8a0' }}>Your domains have no unauthorized certificates in CT logs.</div>
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 90px 110px',minWidth:640,
            padding:'10px 14px', background:'rgba(192,57,43,0.12)', border:'1px solid rgba(192,57,43,0.25)',
            borderRadius:'10px 10px 0 0', marginBottom:0 }}>
            {['Domain','Product','Expires','Status',''].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:'#f0ede8',
                textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</div>
            ))}
          </div>
          <div style={{ border:'1px solid rgba(192,57,43,0.25)', borderTop:'none',
            borderRadius:'0 0 10px 10px', overflowX:'auto' }}>
            {shadows.map((s, i) => {
              const status = s.status === 'known' || s.dismissed ? 'known'
                : s.status === 'phishing' ? 'phishing'
                : s.status === 'suspicious' ? 'suspicious' : 'unknown'
              const cfg = CT_STATUS[status] || CT_STATUS.unknown
              const isExp = expanded === s.id
              return (
                <div key={s.id} style={{ borderBottom: i<shadows.length-1?'1px solid rgba(192,57,43,0.2)':'none' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 90px 110px',minWidth:640,
                    padding:'12px 14px', alignItems:'center',
                    background: i%2===0?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.15)',
                    borderLeft:`3px solid ${status==='known'?'transparent':cfg.color}` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace',
                        color:'#ffffff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.domain}
                      </div>
                      {s.org_name && <div style={{ fontSize:11, color:'rgba(240,237,232,0.5)', marginTop:2 }}>{s.org_name}</div>}
                    </div>
                    <div style={{ fontSize:12, color:'#f0ede8' }}>{s.product||'—'}</div>
                    <div style={{ fontSize:12, color:'#f0ede8' }}>{fmtDate(s.expires_at)}</div>
                    <div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                        background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => setExpanded(isExp?null:s.id)}
                        style={{ fontSize:10, padding:'3px 8px', borderRadius:5,
                          border:'1px solid rgba(240,237,232,0.2)', background:'rgba(255,255,255,0.06)',
                          cursor:'pointer', fontFamily:'inherit', color:'#f0ede8', fontWeight:500 }}>
                        {isExp?'Hide':'Details'}
                      </button>
                      <button onClick={() => dismiss(s.id)} disabled={dismissing===s.id}
                        style={{ fontSize:10, padding:'3px 8px', borderRadius:5,
                          border:'0.5px solid #F7C1C1', background:'rgba(192,57,43,0.1)',
                          cursor:'pointer', fontFamily:'inherit', color:'#a93226' }}>
                        {dismissing===s.id?<Spinner/>:'Dismiss'}
                      </button>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ padding:'12px 14px', background:'rgba(192,57,43,0.06)',
                      borderTop:'1px solid rgba(192,57,43,0.15)', borderLeft:`3px solid ${cfg.color}` }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:12 }}>
                        {[
                          ['Ordered by', s.ordered_by||'—'],
                          ['Issued',     fmtDate(s.issued_at||s.created_at)],
                          ['Expires',    fmtDate(s.expires_at)],
                          ['CA',         s.ca||'—'],
                        ].map(([label,val]) => (
                          <div key={label}>
                            <div style={{ fontSize:10, color:'#b0a8a0', fontWeight:600,
                              textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:2 }}>{label}</div>
                            <div style={{ fontSize:12, color:'#f0ede8' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => mark(s.id,'known')} disabled={marking===s.id}
                          style={{ fontSize:11, padding:'5px 12px', borderRadius:6,
                            border:'0.5px solid rgba(192,57,43,0.3)', background:'transparent',
                            cursor:'pointer', fontFamily:'inherit', color:'#a93226', fontWeight:500 }}>
                          Mark as safe
                        </button>
                        <button onClick={() => mark(s.id,'phishing')} disabled={marking===s.id}
                          style={{ fontSize:11, padding:'5px 12px', borderRadius:6,
                            border:'0.5px solid #F7C1C1', background:'rgba(192,57,43,0.1)',
                            cursor:'pointer', fontFamily:'inherit', color:'#a93226', fontWeight:500 }}>
                          Flag as phishing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 4 — MASS SCAN
// ══════════════════════════════════════════════════════════════════════
function MassScanTab() {
  const [input,    setInput]    = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results,  setResults]  = useState(null)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState('all')

  const doScan = async () => {
    const lines = input.split('\n')
      .map(l => l.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean)
    const unique = [...new Set(lines)].slice(0, 100)
    if (!unique.length) { setError('Enter at least one domain.'); return }

    setScanning(true); setError(''); setResults(null); setProgress(0)
    const iv = setInterval(() => setProgress(p => Math.min(90, p + Math.random()*8)), 400)

    try {
      const r = await fetch(`${SB}/functions/v1/ssl-health`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action:'bulk_scan', domains:unique })
      })
      const d = await r.json()
      clearInterval(iv); setProgress(100)
      if (d.results) setResults(d.results)
      else setError(d.error || 'Scan failed')
    } catch(e) { clearInterval(iv); setError(e.message) }
    setScanning(false)
  }

  const exportCSV = () => {
    if (!results) return
    const header = 'Domain,Grade,Score,TLS,HSTS,CAA,Expiry days,Issuer,Error'
    const rows = results.map(r =>
      [r.domain, r.grade, r.score, r.cert_valid, r.hsts, r.caa,
       r.expiry_days??'', r.issuer??'', r.error??''].join(','))
    const blob = new Blob([[header,...rows].join('\n')], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url
    a.download=`ssl-scan-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered = results?.filter(r => {
    if (filter==='pass') return r.cert_valid && !r.error
    if (filter==='fail') return !r.cert_valid || !!r.error
    if (filter==='warning') {
      const d = r.expiry_days
      return r.cert_valid && (d!=null && d<=30)
    }
    return true
  })

  const passCount = results?.filter(r => r.cert_valid && !r.error).length || 0
  const failCount = results?.filter(r => !r.cert_valid || !!r.error).length || 0

  return (
    <div>
      {/* Input */}
      <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
        borderRadius:10, padding:'14px 16px', marginBottom:14 , overflowX:'auto'}}>
        <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
          letterSpacing:'0.4px', marginBottom:10 }}>Paste up to 100 domains</div>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          rows={6} placeholder={'example.com\ngoogle.com\ngithub.com'}
          style={{ width:'100%', resize:'vertical', fontSize:13, fontFamily:'monospace',
            borderRadius:8, border:'0.5px solid var(--v2-border)', padding:'10px 12px',
            background:'rgba(255,255,255,0.03)', color:'#f0ede8', outline:'none', boxSizing:'border-box' }}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
          <span style={{ fontSize:11, color:'#b0a8a0' }}>
            {input.split('\n').filter(l=>l.trim()).length} domains · one per line
          </span>
          <div style={{ display:'flex', gap:8 }}>
            {results && (
              <button onClick={exportCSV}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 12px',
                  borderRadius:7, border:'1px solid rgba(192,57,43,0.2)', background:'rgba(255,255,255,0.04)',
                  cursor:'pointer', fontFamily:'inherit', color:'#e8e0d8' }}>
                <Download size={11}/> Export CSV
              </button>
            )}
            <button onClick={doScan} disabled={scanning || !input.trim()}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 14px',
                borderRadius:7, border:'none', background:'var(--v2-green)', color:'#ffffff',
                cursor:scanning||!input.trim()?'not-allowed':'pointer',
                fontFamily:'inherit', fontWeight:600, opacity:scanning||!input.trim()?0.7:1 }}>
              {scanning ? <><Spinner/> Scanning…</> : <><Scan size={11}/> Run scan</>}
            </button>
          </div>
        </div>
        {error && <div style={{ fontSize:11, color:'#a93226', marginTop:8 }}>{error}</div>}

        {/* Progress bar */}
        {scanning && (
          <div style={{ marginTop:12, height:4, background:'var(--v2-border)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:'var(--v2-green)',
              borderRadius:2, transition:'width .4s' }}/>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:12 }}>
            <StatCard label="Scanned" val={results.length} sub="domains"/>
            <StatCard label="Passed" val={passCount} color="#c0392b" bg="rgba(39,174,96,0.1)"/>
            <StatCard label="Failed" val={failCount}
              color={failCount>0?'#a93226':'var(--v2-text-1)'}
              bg={failCount>0?'rgba(192,57,43,0.1)':undefined}/>
          </div>

          {/* Filter */}
          <div style={{ display:'flex', gap:4, marginBottom:10 }}>
            {[['all','All'],['pass','Passed'],['warning','Expiring'],['fail','Failed']].map(([key,lbl]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding:'4px 11px', borderRadius:6, fontSize:11, border:'none',
                  fontFamily:'inherit', cursor:'pointer', transition:'all .15s',
                  fontWeight:filter===key?600:400,
                  background:filter===key?'var(--v2-green)':'none',
                  color:filter===key?'#000000':'var(--v2-text-3)' }}>
                {lbl}
              </button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:11, color:'#b0a8a0' }}>
              {filtered?.length} results
            </span>
          </div>

          {/* Table */}
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'visible' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 60px 60px 60px 60px 80px 1fr',
              padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
              {['Domain','Grade','Score','TLS','HSTS','CAA','Expiry / Issue'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:600, color:'#b0a8a0',
                  textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
              ))}
            </div>
            {filtered?.map((r, i) => {
              const gs = gradeStyle(r.grade)
              return (
                <div key={r.domain} style={{ display:'grid',
                  gridTemplateColumns:'2fr 60px 60px 60px 60px 80px 1fr',
                  padding:'12px 14px', alignItems:'center',
                  borderBottom:i<filtered.length-1?'0.5px solid var(--v2-border)':'none',
                  background:i%2===0?'var(--v2-surface)':'var(--v2-bg)' }}>
                  <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:600,
                    color:'#f0ede8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.domain}
                  </div>
                  <div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:6,
                      background:gs.bg, color:gs.color, fontFamily:'monospace' }}>
                      {r.grade||'F'}
                    </span>
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color:gs.color, fontFamily:'monospace' }}>
                    {r.score!=null?Math.round(r.score):'—'}
                  </div>
                  <div>{r.cert_valid
                    ? <CheckCircle size={13} color="#c0392b"/>
                    : <XCircle size={13} color="#a93226"/>}</div>
                  <div>{r.hsts
                    ? <CheckCircle size={13} color="#c0392b"/>
                    : <XCircle size={13} color="#a93226"/>}</div>
                  <div>{r.caa
                    ? <CheckCircle size={13} color="#c0392b"/>
                    : <XCircle size={13} color="#a93226"/>}</div>
                  <div style={{ fontSize:11,
                    color: r.error?'#a93226':r.expiry_days!=null&&r.expiry_days<=0?'#a93226':
                      r.expiry_days!=null&&r.expiry_days<=30?'#c0392b':'var(--v2-text-2)' }}>
                    {r.error ? r.error.slice(0,40)
                      : r.expiry_days!=null ? (r.expiry_days<=0?'Expired':`${r.expiry_days}d left`)
                      : r.issuer||'—'}
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

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Shell
// ══════════════════════════════════════════════════════════════════════
export default function ShieldIntelligence({ user }) {
  const isMobile = useIsMobile()
  const [tok, setTok] = useState('')
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setTok(session.access_token)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setTok(s?.access_token || '')
    })
    return () => subscription.unsubscribe()
  }, [])

  const TABS = [
    { id:'overview', label:'Overview',    icon:TrendingUp },
    { id:'tls',      label:'TLS Grades',  icon:Trophy     },
    { id:'ct',       label:'CT Watch',    icon:ShieldAlert},
    { id:'mass',     label:'Mass Scan',   icon:Scan       },
  ]

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1000 }}>

        {/* Header */}
        <div style={{ paddingTop:8, marginBottom:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <h1 className="v2-h1" style={{ fontSize:20, marginBottom:3 }}>Shield Intelligence</h1>
              <p style={{ fontSize:12, color:'#b0a8a0', margin:0 }}>
                Analytics · TLS grading · CT log monitoring · bulk scanning — all in one place
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:2, borderBottom:'0.5px solid rgba(255,255,255,0.08)', marginBottom:20 }}>
            {TABS.map(({ id, label, icon:Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ display:'flex', alignItems:'center', gap:6,
                  padding:'7px 14px 8px', fontSize:12,
                  fontWeight:tab===id?600:400, fontFamily:'inherit',
                  background:'none', border:'none', cursor:'pointer',
                  borderBottom:tab===id?'2px solid var(--v2-green)':'2px solid transparent',
                  color:tab===id?'var(--v2-green)':'var(--v2-text-3)',
                  marginBottom:-1, transition:'all .15s' }}>
                <Icon size={13}/>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {tab === 'overview' && <OverviewTab user={user}/>}
        {tab === 'tls'      && <TLSGradesTab tok={tok} user={user}/>}
        {tab === 'ct'       && <CTWatchTab tok={tok} user={user}/>}
        {tab === 'mass'     && <MassScanTab/>}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @media(max-width:min(767px,100%)){
          [class*="-hero"],[class*="-band"]{padding:20px 14px 18px!important}
          [class*="-body"]{padding:14px!important;max-width:100%!important}
          [class*="-tabs"]{padding:0 10px!important}
          [class*="-tab"]{margin-right:12px!important;font-size:12px!important;padding:10px 2px 11px!important}
          [class*="-h1"]{font-size:20px!important}
          [class*="-sub"]{font-size:12px!important}
          [class*="-stats"]{gap:18px!important}
          .out-card{padding:12px!important}
        }`}</style>
    </div>
  )
}
