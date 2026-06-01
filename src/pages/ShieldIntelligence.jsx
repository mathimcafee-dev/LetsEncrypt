// ShieldIntelligence.jsx
// Unified page: Overview (Analytics) - TLS Grades - CT Watch - Mass Scan
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

// -- shared helpers ----------------------------------------------------
function timeAgo(iso) {
  if (!iso) return '--'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
function fmtDate(iso) {
  if (!iso) return '--'
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

// ======================================================================
// TAB 1 -- OVERVIEW (Analytics)
// ======================================================================
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

      const grades = { 'A+':0, A:0, B:0, C:0, D:0, F:0, '--':0 }
      active.forEach(c => {
        if (c.tls_grade && grades[c.tls_grade] !== undefined) grades[c.tls_grade]++
        else grades['--']++
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
      <Spinner/><span style={{ marginLeft:8 }}>Loading analytics...</span>
    </div>
  )

  const { total=0, active=0, expiring30=0, expiring7=0, thisMonth=0,
          grades={}, bySource={}, deployed=0, keyVault=0 } = stats || {}

  const gradeEntries = [['A+','#f0ede8'],['A','#a93226'],['B','#a93226'],
    ['C','#c0392b'],['D','#c0392b'],['F','#a93226'],['--','rgba(240,237,232,0.45)']]
  const maxGrade = Math.max(...gradeEntries.map(([g]) => grades[g]||0), 1)

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:16 }}>
        <StatCard label="Active certs" val={active} sub={`of ${total} total`}
          color={active>0?'#f0ede8':'var(--v2-text-1)'}/>
        <StatCard label="Expiring <= 30d" val={expiring30} sub={expiring7>0?`${expiring7} within 7 days`:'none critical'}
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
                    background:gradeStyle(g==='--'?'Z':g).bg,
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
              { label:'Critical (<=7d)', n:expiring7,  color:'#a93226' },
              { label:'Expiring (<=30d)', n:expiring30, color:'#c0392b' },
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

// -- TLS domain row (must be a component -- no hooks inside .map) ------
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
            ['Issuer',      s.issuer||'--'],
            ['Expiry',      s.expiry_days!=null?(s.expiry_days<=0?'Expired':`${s.expiry_days} days`):'--'],
            ['TLS valid',   s.cert_valid?'Yes ok':'No x'],
            ['HSTS',        s.hsts?'Enabled ok':'Missing x'],
            ['CAA record',  s.caa?'Present ok':'Missing x'],
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

// ======================================================================
// TAB 2 -- TLS GRADES
// ======================================================================
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
            placeholder="Enter any domain to scan -- e.g. example.com"
            style={{ flex:1, fontSize:13, border:'none', outline:'none', background:'transparent',
              color:'#f0ede8' }}/>
          <button onClick={addDomain} disabled={adding || !newDomain.trim()}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 12px',
              borderRadius:7, border:'none', background:'var(--v2-green)', color:'#ffffff',
              cursor:adding||!newDomain.trim()?'not-allowed':'pointer', fontFamily:'inherit',
              fontWeight:600, opacity:adding||!newDomain.trim()?0.6:1 }}>
            {adding ? <><Spinner/> Scanning...</> : <><Plus size={11}/> Scan</>}
          </button>
        </div>
        {addErr && <div style={{ fontSize:11, color:'#a93226', marginTop:6 }}>{addErr}</div>}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#b0a8a0' }}>
          <Spinner/><span style={{ marginLeft:8 }}>Loading grades...</span>
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
          A+ >=90 - A >=80 - B >=70 - C >=60 - D >=50 - F &lt;50
        </div>
      )}
    </div>
  )
}

// ======================================================================
// TAB 3 -- CT WATCH
// ======================================================================
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
          <Spinner/><span style={{ marginLeft:8 }}>Loading CT findings...</span>
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
                    <div style={{ fontSize:12, color:'#f0ede8' }}>{s.product||'--'}</div>
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
                          ['Ordered by', s.ordered_by||'--'],
                          ['Issued',     fmtDate(s.issued_at||s.created_at)],
                          ['Expires',    fmtDate(s.expires_at)],
                          ['CA',         s.ca||'--'],
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

// ======================================================================
// TAB 4 -- MASS SCAN
// ======================================================================
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
            {input.split('\n').filter(l=>l.trim()).length} domains - one per line
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
              {scanning ? <><Spinner/> Scanning...</> : <><Scan size={11}/> Run scan</>}
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
                    {r.score!=null?Math.round(r.score):'--'}
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
                      : r.issuer||'--'}
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


// Classify a shadow cert against the user's known certs
function classifyCert(shadow, knownDomains) {
  if (shadow.dismissed || shadow.status === 'known') return 'known'
  if (shadow.status === 'phishing') return 'phishing'
  if (shadow.status === 'suspicious') return 'suspicious'
  // Auto-classify: if domain not in known inventory -> flag as unknown
  if (!knownDomains.has(shadow.domain)) return 'unknown'
  return 'unknown'
}

const STATUS_CONFIG = {
  unknown:    { label: 'Unknown',    color: '#f87171', bg: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.25)', leftBorder: '#f87171' },
  phishing:   { label: 'Phishing',   color: '#ffffff', bg: 'rgba(30,0,0,0.4)', border: 'rgba(192,57,43,0.1)', leftBorder: '#f0ede8' },
  suspicious: { label: 'Suspicious', color: '#ffffff', bg: 'rgba(239,68,68,0.08)', border: 'rgba(192,57,43,0.25)', leftBorder: '#f0ede8' },
  known:      { label: 'Known',      color: '#4ade80', bg: 'transparent', border: 'rgba(192,57,43,0.3)', leftBorder: '#4ade80' },
}

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
          { label: 'Issuing CA',    val: shadow.ca_type || '--' },
          { label: 'Organisation',  val: shadow.org_name || '--' },
          { label: 'Serial number', val: shadow.serial_number || '--' },
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
            {dismissing === shadow.id ? 'Marking...' : 'Mark as known'}
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


// -- TISectionHeader ---------------------------------------------------
function TISectionHeader({ color, title, subtitle, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '0.5px solid ' + color + '33' }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: color + '18', border: '0.5px solid ' + color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Shield size={13} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e0d8' }}>{title}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: badge.color + '18', color: badge.color }}>{badge.text}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 1 }}>{subtitle}</div>
      </div>
    </div>
  )
}

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


  // -- CT Abuse Monitor state and functions -------------------------
  const [shadows,        setShadows]        = useState([])
  const [watchDomains,   setWatchDomains]   = useState([])
  const [knownCerts,     setKnownCerts]     = useState(new Set())
  const [ctLoading,      setCtLoading]      = useState(true)
  const [ctFilter,       setCtFilter]       = useState('all')
  const [ctSearch,       setCtSearch]       = useState('')
  const [ctSelected,     setCtSelected]     = useState(null)
  const [ctDismissing,   setCtDismissing]   = useState(null)
  const [newWatchDomain, setNewWatchDomain] = useState('')
  const [addingWatch,    setAddingWatch]    = useState(false)
  const [showWatched,    setShowWatched]    = useState(true)

  const loadCT = useCallback(async () => {
    if (!user) return
    setCtLoading(true)
    const [{ data: shadowData }, { data: certData }, { data: watchData }] = await Promise.all([
      supabase.from('shadow_certs').select('*').eq('user_id', user.id).order('found_at', { ascending: false }),
      supabase.from('certificates').select('domain').eq('user_id', user.id).neq('status', 'revoked'),
      supabase.from('ct_watch_domains').select('*').eq('user_id', user.id).eq('active', true).order('created_at'),
    ])
    setShadows(shadowData || [])
    setKnownCerts(new Set((certData || []).map(c => c.domain)))
    setWatchDomains(watchData || [])
    const existingWatched = new Set((watchData || []).map(w => w.domain))
    const toAdd = (certData || []).map(c => c.domain).filter(d => d && !existingWatched.has(d))
    if (toAdd.length > 0) {
      try {
        await Promise.all(toAdd.map(d => supabase.from('ct_watch_domains').upsert({ user_id: user.id, domain: d, active: true }, { onConflict: 'user_id,domain' })))
        const { data: refreshed } = await supabase.from('ct_watch_domains').select('*').eq('user_id', user.id).eq('active', true).order('created_at')
        setWatchDomains(refreshed || [])
      } catch (e) { console.warn('[CT auto-watch]', e.message) }
    }
    setCtLoading(false)
  }, [user])

  useEffect(() => { if (user) loadCT() }, [loadCT])

  const ctDismiss = async (id) => {
    setCtDismissing(id)
    await supabase.from('shadow_certs').update({ dismissed: true, status: 'known' }).eq('id', id)
    setShadows(s => s.map(x => x.id === id ? { ...x, dismissed: true, status: 'known' } : x))
    setCtDismissing(null)
    setCtSelected(null)
  }

  const ctMarkStatus = async (id, newStatus) => {
    await supabase.from('shadow_certs').update({ status: newStatus }).eq('id', id)
    setShadows(s => s.map(x => x.id === id ? { ...x, status: newStatus } : x))
    setCtSelected(null)
  }

  const addWatchDomain = async () => {
    const d = newWatchDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d) return
    setAddingWatch(true)
    await supabase.from('ct_watch_domains').upsert({ user_id: user.id, domain: d, active: true }, { onConflict: 'user_id,domain' })
    setNewWatchDomain('')
    await loadCT()
    setAddingWatch(false)
  }

  const removeWatchDomain = async (id) => {
    await supabase.from('ct_watch_domains').update({ active: false }).eq('id', id)
    setWatchDomains(w => w.filter(x => x.id !== id))
  }

  const TABS = [
    { id:'overview', label:'Overview',    icon:TrendingUp },
    { id:'tls',      label:'TLS Grades',  icon:Trophy     },
    { id:'ct',       label:'CT Watch',    icon:ShieldAlert},
    { id:'mass',     label:'Mass Scan',   icon:Scan       },
  ]

  // Derived CT values
  const classified = shadows.map(s => ({ ...s, _status: classifyCert(s, knownCerts) }))
  const ctCounts = classified.reduce((a, s) => { a[s._status] = (a[s._status] || 0) + 1; return a }, {})
  const ctFlagged = (ctCounts.unknown || 0) + (ctCounts.phishing || 0)
  const ctFiltered = classified.filter(s => {
    const mf = ctFilter === 'all' || s._status === ctFilter || (ctFilter === 'flagged' && (s._status === 'unknown' || s._status === 'phishing'))
    const ms = !ctSearch || s.domain?.toLowerCase().includes(ctSearch.toLowerCase()) || s.ca_type?.toLowerCase().includes(ctSearch.toLowerCase()) || s.org_name?.toLowerCase().includes(ctSearch.toLowerCase())
    return mf && ms
  })
  const ctSelectedShadow = ctSelected ? classified.find(s => s.id === ctSelected) : null

  return (
    <div className="v2-page">
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes ctpulse{0%,100%{opacity:1}50%{opacity:.35}}
      `}</style>

      <div className="v2-container" style={{ maxWidth: 1000, paddingTop: 8, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize: 20, marginBottom: 3 }}>Threat Intelligence</h1>
            <p style={{ fontSize: 12, color: '#b0a8a0', margin: 0 }}>
              Analytics - TLS grading - CT log monitoring - bulk scanning
            </p>
          </div>
        </div>

        {/* SECTION 1: OVERVIEW */}
        <TISectionHeader color="var(--v2-green)" title="Overview" subtitle="Certificate analytics and fleet health" />
        <OverviewTab user={user} />

        <div style={{ marginBottom: 36 }} />

        {/* SECTION 2: TLS GRADES */}
        <TISectionHeader color="#c0392b" title="TLS Grades" subtitle="Scan domains for TLS configuration grade and security posture" />
        <TLSGradesTab tok={tok} user={user} />

        <div style={{ marginBottom: 36 }} />

        {/* SECTION 3: CT ABUSE MONITOR */}
        <TISectionHeader
          color="#818cf8"
          title="CT Abuse Monitor"
          subtitle="Certificates issued for your domains via CT logs"
          badge={ctFlagged > 0 ? { text: ctFlagged + ' flagged', color: '#f87171' } : null}
        />

        {/* CT alert banner */}
        {ctFlagged > 0 && (
          <div style={{ background: 'rgba(192,57,43,0.12)', border: '0.5px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldAlert size={16} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f87171' }}>{ctFlagged} unauthorised certificate{ctFlagged !== 1 ? 's' : ''} detected</div>
              <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>Certs issued for your domains by unrecognised CAs. Review immediately.</div>
            </div>
          </div>
        )}
        {ctFlagged === 0 && !ctLoading && shadows.length > 0 && (
          <div style={{ background: 'transparent', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Shield size={15} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 500 }}>All detected certs are known and accounted for</div>
          </div>
        )}

        {/* CT Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total detected', val: classified.length, color: '#ffffff', f: 'all' },
            { label: 'Flagged',        val: ctFlagged,         color: '#f87171',  f: 'flagged' },
            { label: 'Suspicious',     val: ctCounts.suspicious || 0, color: '#ffffff', f: 'suspicious' },
            { label: 'Known / safe',   val: ctCounts.known || 0, color: '#4ade80', f: 'known' },
          ].map(({ label, val, color, f }) => (
            <div key={label} className="v2-card" style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => setCtFilter(f)}>
              <div style={{ fontSize: 22, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CT Filter + search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 1, border: '0.5px solid var(--v2-border)', borderRadius: 8, overflow: 'hidden' }}>
            {[{ key: 'all', label: 'All' }, { key: 'flagged', label: 'Flagged' }, { key: 'suspicious', label: 'Suspicious' }, { key: 'known', label: 'Known' }].map(({ key, label }) => (
              <button key={key} onClick={() => { setCtFilter(key); setCtSelected(null) }}
                style={{ padding: '7px 12px', fontSize: 11, fontWeight: ctFilter === key ? 500 : 400, background: ctFilter === key ? 'var(--v2-surface-3)' : 'none', border: 'none', cursor: 'pointer', color: ctFilter === key ? 'var(--v2-text)' : 'var(--v2-text-3)' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', minWidth: 160 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#b0a8a0', pointerEvents: 'none' }} />
            <input value={ctSearch} onChange={e => setCtSearch(e.target.value)} placeholder="Search domain, CA, org..."
              style={{ width: '100%', paddingLeft: 30, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <span style={{ fontSize: 11, color: '#b0a8a0', flexShrink: 0 }}>{ctFiltered.length} of {classified.length}</span>
        </div>

        {/* CT Table */}
        {ctLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#b0a8a0', marginBottom: 16 }}>
            <RefreshCw size={20} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 10px', display: 'block' }} />Loading CT data...
          </div>
        ) : ctFiltered.length === 0 ? (
          <div className="v2-card" style={{ padding: '40px', textAlign: 'center', marginBottom: 16 }}>
            <Shield size={28} style={{ color: '#b0a8a0', margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e0d8', marginBottom: 4 }}>
              {shadows.length === 0 ? 'No CT data yet' : 'No results match your filter'}
            </div>
            <div style={{ fontSize: 12, color: '#b0a8a0' }}>
              {shadows.length === 0 ? 'Connect DigiCert or run a scan to populate CT findings.' : 'Try clearing your search or filter.'}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 120px 100px 90px 90px 80px', padding: '8px 16px', background: 'var(--v2-surface-3)', borderBottom: '0.5px solid var(--v2-border)' }}>
                {['Domain', 'Issuing CA', 'Org', 'Issued', 'Expires', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</div>
                ))}
              </div>
              {ctFiltered.map((s, i) => {
                const cfg = STATUS_CONFIG[s._status] || STATUS_CONFIG.unknown
                const isSel = ctSelected === s.id
                return (
                  <div key={s.id} onClick={() => setCtSelected(isSel ? null : s.id)}
                    style={{ display: 'grid', gridTemplateColumns: '1.8fr 120px 100px 90px 90px 80px', padding: '10px 16px', cursor: 'pointer', alignItems: 'center', background: isSel ? cfg.bg : 'var(--v2-bg)', borderBottom: i === ctFiltered.length - 1 ? 'none' : '0.5px solid var(--v2-border)', borderLeft: '3px solid ' + (isSel || s._status !== 'known' ? cfg.leftBorder : 'transparent'), transition: 'background .12s' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.domain}</div>
                      {s.serial_number && <div style={{ fontSize: 10, color: '#b0a8a0', fontFamily: 'monospace', marginTop: 1 }}>{s.serial_number.slice(0, 20)}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: '#e8e0d8' }}>{s.ca_type || '-'}</div>
                    <div style={{ fontSize: 11, color: '#e8e0d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.org_name || '-'}</div>
                    <div style={{ fontSize: 11, color: '#e8e0d8' }}>{fmtDate(s.issued_at)}</div>
                    <div style={{ fontSize: 11, color: '#e8e0d8' }}>{fmtDate(s.expires_at)}</div>
                    <div><StatusBadge status={s._status} /></div>
                  </div>
                )
              })}
            </div>
            {ctSelectedShadow && (
              <div style={{ marginTop: 6 }}>
                <DetailPanel shadow={ctSelectedShadow} status={ctSelectedShadow._status} onDismiss={ctDismiss} onMark={ctMarkStatus} onClose={() => setCtSelected(null)} dismissing={ctDismissing} />
              </div>
            )}
          </div>
        )}

        {/* Watched domains */}
        <div className="v2-card" style={{ marginBottom: 36, padding: 0, overflow: 'hidden' }}>
          <button onClick={() => setShowWatched(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: showWatched ? '0.5px solid var(--v2-border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="var(--v2-accent)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#ffffff' }}>Watched domains</span>
              <span style={{ fontSize: 11, color: '#b0a8a0' }}>{watchDomains.length} monitored</span>
            </div>
            {showWatched ? <ChevronUp size={14} color="var(--v2-text-3)" /> : <ChevronDown size={14} color="var(--v2-text-3)" />}
          </button>
          {showWatched && (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={newWatchDomain} onChange={e => setNewWatchDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWatchDomain()} placeholder="Add domain to watch" style={{ flex: 1, fontSize: 12 }} />
                <button className="v2-btn v2-btn-sm" onClick={addWatchDomain} disabled={addingWatch || !newWatchDomain.trim()} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {addingWatch ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }} /> : <Plus size={11} />} Watch
                </button>
              </div>
              {watchDomains.length === 0 ? (
                <div style={{ fontSize: 12, color: '#b0a8a0', textAlign: 'center', padding: '12px 0' }}>No domains being watched. Add one above.</div>
              ) : watchDomains.map(w => {
                const ds = classified.filter(s => s.domain === w.domain)
                const hf = ds.some(s => s._status === 'unknown' || s._status === 'phishing')
                const hs = ds.some(s => s._status === 'suspicious')
                return (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: hf ? '#f87171' : hs ? '#f0ede8' : '#4ade80', flexShrink: 0, animation: !hf && !hs ? 'ctpulse 2.5s ease infinite' : 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#ffffff' }}>{w.domain}</div>
                      <div style={{ fontSize: 10, color: '#b0a8a0', marginTop: 1 }}>{ds.length} cert{ds.length !== 1 ? 's' : ''} detected</div>
                    </div>
                    <div style={{ fontSize: 10, color: hf ? '#f87171' : hs ? '#f0ede8' : '#4ade80', fontWeight: 500 }}>{hf ? 'Action needed' : hs ? 'Review' : 'All clear'}</div>
                    <button onClick={() => removeWatchDomain(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0', padding: 4, display: 'flex' }}><Trash2 size={12} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: MASS SCAN */}
        <TISectionHeader color="#fbbf24" title="Mass Scan" subtitle="Scan multiple domains at once for TLS health" />
        <MassScanTab />

      </div>
    </div>
  )
}
