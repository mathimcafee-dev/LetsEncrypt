// CAIntelligenceHub.jsx — Unified PKI Intelligence
// Tabs: Overview · RapidSSL · DigiCert · Sectigo

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Shield, Building, Lock, RefreshCw, ChevronRight,
  BarChart2, RotateCcw, Ban, Search, Download, Archive,
  Eye, EyeOff, AlertTriangle, DollarSign, Check, CheckCircle, XCircle,
  Globe, Plus, Activity
} from 'lucide-react'
import '../styles/design-v2.css'

const FN_CA     = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence'
const FN_IMPORT = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import'
const F = "'Inter',system-ui,sans-serif"

async function callCA(tok, body) {
  const r = await fetch(FN_CA, { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok}, body:JSON.stringify(body) })
  return r.json()
}
async function callImport(tok, body) {
  const r = await fetch(FN_IMPORT, { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok}, body:JSON.stringify(body) })
  return r.json()
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
function expiryColor(d) {
  if (d === null) return '#aaaaaa'
  if (d <= 0)  return '#c0392b'
  if (d <= 7)  return '#c0392b'
  if (d <= 30) return '#9a6400'
  return '#00a550'
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Spinner() {
  return <RefreshCw size={13} strokeWidth={2} style={{ animation:'spin .7s linear infinite', flexShrink:0 }}/>
}

function ExpiryPill({ days }) {
  if (days === null) return <span style={{ fontSize:10, color:'#888888' }}>—</span>
  const color = days < 0 ? '#c0392b' : days <= 7 ? '#c0392b' : days <= 30 ? '#9a6400' : days <= 90 ? '#555555' : '#00a550'
  const bg    = days < 0 ? 'rgba(192,57,43,0.1)' : days <= 30 ? 'rgba(154,100,0,0.08)' : 'transparent'
  return (
    <span style={{ fontSize:10, fontWeight:600, color, background:bg, border:`0.5px solid ${color}44`, borderRadius:20, padding:'1px 7px' }}>
      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
    </span>
  )
}

function StatCard({ label, val, sub, color, bg, onClick }) {
  return (
    <div onClick={onClick} style={{ padding:'14px 16px', borderRadius:10, background:bg||'#ffffff',
      border:'1px solid rgba(0,119,182,0.12)', boxShadow:'0 1px 4px rgba(0,119,182,0.06)',
      cursor:onClick?'pointer':'default' }}>
      <div style={{ fontSize:10, color:'#888888', marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||'#111111', lineHeight:1 }}>{val}</div>
      {sub && <div style={{ fontSize:11, color:'#888888', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function FilterBar({ filters, active, onSelect, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'10px 16px',
      borderBottom:'1px solid rgba(0,119,182,0.08)', flexWrap:'wrap', background:'#fafafa' }}>
      {filters.map(([id, lbl]) => (
        <button key={id} onClick={() => onSelect(id)}
          style={{ padding:'5px 14px', borderRadius:20, fontSize:12, border:'1px solid transparent', fontFamily:'inherit',
            fontWeight:active===id?600:400, cursor:'pointer', transition:'all .15s',
            background:active===id?'#0077b6':'transparent',
            color:active===id?'#ffffff':'#666666',
            borderColor:active===id?'#0077b6':'rgba(0,119,182,0.2)' }}>
          {lbl}
        </button>
      ))}
      {count !== undefined && (
        <span style={{ marginLeft:'auto', fontSize:11, color:'#aaaaaa' }}>{count} certs</span>
      )}
    </div>
  )
}

function CertTable({ cols, headers, children, loading, empty }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
      <div style={{ display:'grid', gridTemplateColumns:cols, padding:'9px 14px',
        background:'rgba(0,119,182,0.04)', borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize:10, fontWeight:600, color:'#888888', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
        ))}
      </div>
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#888888', fontSize:13 }}><Spinner/></div>
      ) : !children || (Array.isArray(children) && children.length === 0) ? (
        <div style={{ padding:40, textAlign:'center', color:'#888888', fontSize:13 }}>{empty}</div>
      ) : children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ══════════════════════════════════════════════════════════════════════
function OverviewTab({ user, tok, onSwitchCA }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('certificates').select('id,domain,status,expires_at,source,issued_at,install_method'),
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
      const byCA = {}
      active.forEach(c => { const s = c.source||'unknown'; byCA[s]=(byCA[s]||0)+1 })
      const deployed = active.filter(c => c.install_method === 'agent' || c.install_method === 'cpanel').length
      const keyVault = keys.filter(k => k.status === 'active').length
      setStats({
        total: certs.length, active: active.length,
        expiring30: expiring30.length, expiring7: expiring7.length,
        thisMonth: thisMonth.length, orders: orders.length,
        byCA, deployed, keyVault,
        healthy: active.length - expiring30.length
      })
      setLoading(false)
    })
  }, [user])

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'#888888' }}>
      <Spinner/><span style={{ marginLeft:8 }}>Loading overview…</span>
    </div>
  )

  const { total=0, active=0, expiring30=0, expiring7=0, thisMonth=0,
          byCA={}, deployed=0, keyVault=0, healthy=0 } = stats || {}

  const KPI = [
    { label:'Total certs',  val:total,     sub:`${active} active`,            color:'#111111', border:'rgba(0,119,182,0.12)' },
    { label:'Expired',      val:0,          sub:'—',                           color:'#888888', border:'rgba(0,119,182,0.12)' },
    { label:'≤ 7 days',     val:expiring7,  sub:expiring7>0?'Critical':'None', color:expiring7>0?'#c0392b':'#888888', border:expiring7>0?'rgba(192,57,43,0.25)':'rgba(0,119,182,0.12)', bg:expiring7>0?'rgba(192,57,43,0.04)':undefined },
    { label:'≤ 30 days',    val:expiring30, sub:expiring30>0?'Expiring soon':'All good', color:expiring30>0?'#9a6400':'#888888', border:expiring30>0?'rgba(154,100,0,0.25)':'rgba(0,119,182,0.12)', bg:expiring30>0?'rgba(154,100,0,0.04)':undefined },
    { label:'Healthy >90d', val:healthy,    sub:'No action needed',            color:healthy>0?'#00a550':'#888888', border:healthy>0?'rgba(0,165,80,0.25)':'rgba(0,119,182,0.12)', bg:healthy>0?'rgba(0,165,80,0.04)':undefined },
  ]

  return (
    <div style={{ fontFamily:F }}>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        {KPI.map(s => (
          <div key={s.label} style={{ padding:'16px 18px', borderRadius:10,
            background:s.bg||'#ffffff', border:`1px solid ${s.border}`,
            boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
            <div style={{ fontSize:10, color:'#888888', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:s.color, fontFamily:"'JetBrains Mono',monospace", lineHeight:1, marginBottom:6 }}>{s.val}</div>
            {s.sub && <div style={{ fontSize:10, color:'#999999', fontWeight:500 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        {/* Portfolio by CA */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.6px' }}>Portfolio by CA</div>
          </div>
          <div style={{ padding:'12px 16px' }}>
            {[
              { ca:'gogetssl', label:'RapidSSL',  sub:'SSLVault native · always active', dot:'#00a550',  abbr:'GGS' },
              { ca:'digicert', label:'DigiCert',   sub:'Not connected',                   dot:'#cccccc',  abbr:'DC'  },
              { ca:'sectigo',  label:'Sectigo',    sub:'Not connected',                   dot:'#cccccc',  abbr:'SC'  },
            ].map(({ ca, label, sub, dot, abbr }, idx, arr) => {
              const count = byCA[ca] || 0
              const tabId = ca === 'gogetssl' ? 'rapidssl' : ca
              return (
                <div key={ca} onClick={() => onSwitchCA(tabId)}
                  style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'10px 8px', borderRadius:8, cursor:'pointer',
                    borderBottom:idx < arr.length-1?'1px solid rgba(0,119,182,0.06)':'none',
                    transition:'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,119,182,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width:32, height:32, borderRadius:7, background:'rgba(0,119,182,0.08)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:9, fontWeight:800, color:'#0077b6', flexShrink:0 }}>
                    {abbr}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'#111111' }}>{label}</span>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:dot, flexShrink:0, display:'inline-block' }}/>
                        <span style={{ fontSize:11, color:'#999999' }}>{sub}</span>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:'#0077b6' }}>{count}</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:'rgba(0,119,182,0.08)', overflow:'hidden' }}>
                      <div style={{ height:'100%',
                        width:`${count>0?Math.max(8,Math.round((count/Math.max(Object.values(byCA).reduce((a,b)=>Math.max(a,b),1),1))*100)):0}%`,
                        background:'#0077b6', borderRadius:99, transition:'width .6s' }}/>
                    </div>
                  </div>
                  <ChevronRight size={13} color="#cccccc"/>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expiry risk */}
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.6px' }}>Expiry risk — all CAs</div>
          </div>
          <div style={{ padding:'12px 16px' }}>
            {[
              { label:'Expired',    val:0,          color:'#c0392b' },
              { label:'≤ 7 days',   val:expiring7,  color:'#c0392b' },
              { label:'≤ 30 days',  val:expiring30, color:'#9a6400' },
              { label:'≤ 90 days',  val:0,          color:'#888888' },
              { label:'Healthy',    val:healthy,    color:'#00a550' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#555555', width:80, flexShrink:0 }}>{label}</div>
                <div style={{ flex:1, height:22, background:'rgba(0,119,182,0.06)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                  {val > 0 && (
                    <div style={{ position:'absolute', left:0, top:0, bottom:0,
                      width:`${Math.max(8, Math.min(100, Math.round((val/Math.max(total,1))*100)))}%`,
                      background:`${color}22`, borderRight:`2px solid ${color}`,
                      display:'flex', alignItems:'center', paddingLeft:8, transition:'width .6s' }}>
                      <span style={{ fontSize:11, fontWeight:700, color }}>{val}</span>
                    </div>
                  )}
                  {val === 0 && (
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                      fontSize:11, color:'#aaaaaa', fontWeight:500 }}>0</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deployment + Activity row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, padding:'16px', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Deployment</div>
          <div style={{ display:'flex', gap:24 }}>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:'#111111', fontFamily:"'JetBrains Mono',monospace" }}>{deployed}</div>
              <div style={{ fontSize:10, color:'#888888', marginTop:3 }}>deployed to servers</div>
            </div>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:'#0077b6', fontFamily:"'JetBrains Mono',monospace" }}>{keyVault}</div>
              <div style={{ fontSize:10, color:'#888888', marginTop:3 }}>keys in vault</div>
            </div>
          </div>
        </div>
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, padding:'16px', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>Activity</div>
          <div style={{ display:'flex', gap:24 }}>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:'#111111', fontFamily:"'JetBrains Mono',monospace" }}>{thisMonth}</div>
              <div style={{ fontSize:10, color:'#888888', marginTop:3 }}>orders this month</div>
            </div>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:'#111111', fontFamily:"'JetBrains Mono',monospace" }}>{active}</div>
              <div style={{ fontSize:10, color:'#888888', marginTop:3 }}>certs active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2 — RAPIDSSL
// ══════════════════════════════════════════════════════════════════════
function RapidSSLTab({ tok, nav }) {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ssl_orders')
        .select('id,domain,product_name,status,valid_from,valid_till,created_at,order_purpose')
        .order('valid_till', { ascending:true })
      if (!error && data) {
        const domainMap = {}
        for (const o of data) {
          const prev = domainMap[o.domain]
          if (!prev || new Date(o.valid_till||0) > new Date(prev.valid_till||0)) domainMap[o.domain] = o
        }
        setOrders(Object.values(domainMap).map(o => ({
          id: o.id, domain: o.domain, product_name: o.product_name,
          expiry_date: o.valid_till, status: o.status,
        })))
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [tok])

  useEffect(() => { load() }, [load])

  const expiring = orders.filter(c => { const d = dLeft(c.expiry_date); return d!==null && d>0 && d<=30 }).length
  const expired  = orders.filter(c => { const d = dLeft(c.expiry_date); return d!==null && d<=0 }).length

  const filtered = orders.filter(c => {
    if (filter==='all') return true
    const d = dLeft(c.expiry_date)
    if (filter==='expiring') return d!==null && d>0 && d<=30
    if (filter==='expired')  return d!==null && d<=0
    if (filter==='healthy')  return d!==null && d>30
    return true
  })

  const COLS = '2fr 1fr 1fr 90px'

  return (
    <div>
      {/* Banner */}
      <div style={{ background:'transparent', border:'1px solid rgba(0,119,182,0.2)', borderRadius:10,
        padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#0077b6' }}>RapidSSL — SSLVault native CA</div>
          <div style={{ fontSize:11, color:'#555555', marginTop:2 }}>Live API · {orders.length} domains managed</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 12px',
              borderRadius:7, border:'1px solid rgba(0,119,182,0.2)', background:'#ffffff',
              cursor:'pointer', fontFamily:'inherit', color:'#333333' }}>
            <RefreshCw size={11} style={{ animation:loading?'spin .8s linear infinite':'none' }}/> Sync
          </button>
          <button onClick={() => nav('/buy')}
            style={{ fontSize:11, padding:'5px 14px', borderRadius:7, border:'none',
              background:'#0077b6', color:'#ffffff', cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>
            Issue certificate
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        <StatCard label="Total domains" val={loading?'…':orders.length} sub="managed by SSLVault"/>
        <StatCard label="Active"        val={loading?'…':orders.filter(o=>o.status==='active').length} color="#00a550"/>
        <StatCard label="Expiring ≤ 30d" val={loading?'…':expiring} sub="needs action"
          color={expiring>0?'#9a6400':'#888888'} bg={expiring>0?'rgba(154,100,0,0.05)':undefined}/>
        <StatCard label="Expired" val={loading?'…':expired} sub={expired>0?'act now':'all clear'}
          color={expired>0?'#c0392b':'#888888'} bg={expired>0?'rgba(192,57,43,0.05)':undefined}/>
      </div>

      <div style={{ marginBottom:8 }}>
        <FilterBar
          filters={[['all','All'],['expiring','Expiring ≤ 30d'],['expired','Expired'],['healthy','Healthy']]}
          active={filter} onSelect={setFilter} count={filtered.length}/>
      </div>

      <CertTable cols={COLS} headers={['Domain','Product','Expires','Days left']}
        loading={loading}
        empty={orders.length===0?'No RapidSSL certificates yet.':'No certificates match this filter.'}>
        {filtered.map((c, i) => {
          const d = dLeft(c.expiry_date)
          const color = expiryColor(d)
          return (
            <div key={i} style={{ display:'grid', gridTemplateColumns:COLS, padding:'10px 14px',
              borderBottom:'1px solid rgba(0,119,182,0.06)', alignItems:'center',
              background:i%2===0?'transparent':'rgba(0,119,182,0.02)',
              transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(0,119,182,0.02)'}>
              <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:500, color:'#111111',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {c.domain||'—'}
              </div>
              <div style={{ fontSize:11, color:'#888888' }}>{c.product_name||'RapidSSL'}</div>
              <div style={{ fontSize:11, color:'#888888' }}>{fmt(c.expiry_date)}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  background:d===null?'#f5f5f5':d<=0?'rgba(192,57,43,0.1)':d<=30?'rgba(154,100,0,0.1)':'rgba(0,165,80,0.1)',
                  color:d===null?'#aaaaaa':d<=0?'#c0392b':d<=30?'#9a6400':'#00a550',
                  border:`1px solid ${d===null?'#e8e8e8':d<=0?'rgba(192,57,43,0.25)':d<=30?'rgba(154,100,0,0.25)':'rgba(0,165,80,0.25)'}` }}>
                  {d===null?'—':d<=0?'Expired':`${d}d`}
                </span>
              </div>
            </div>
          )
        })}
      </CertTable>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3 — DIGICERT
// ══════════════════════════════════════════════════════════════════════
function DigiCertTab({ tok, nav }) {
  const [apiKey,       setApiKey]       = useState('')
  const [draftKey,     setDraftKey]     = useState('')
  const [showKey,      setShowKey]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [portfolio,    setPf]           = useState([])
  const [loadingPf,    setLoadingPf]    = useState(false)
  const [connId,       setConnId]       = useState('')
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action:'list_connections' }).then(r => {
      const dc = (r.connections||[]).find(c => c.ca_type==='digicert' && c.status==='active')
      if (dc?.id) { setConnId(dc.id); setApiKey('__connected__') }
    })
  }, [tok])

  useEffect(() => { if (connId && tok) loadPf() }, [connId, tok])

  const connect = async () => {
    if (!draftKey.trim()) { setError('API key required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action:'save_connection', ca_type:'digicert', label:'DigiCert CertCentral', api_key:draftKey.trim() })
      if (r.error) { setError(r.error); setSaving(false); return }
      if (r.connection?.id) setConnId(r.connection.id)
      setApiKey(draftKey.trim()); setDraftKey('')
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const disconnect = async () => {
    await callImport(tok, { action:'delete_connection', ca_type:'digicert' })
    setApiKey(''); setConnId(''); setPf([])
  }

  const loadPf = useCallback(async () => {
    if (!connId||!tok) return
    setLoadingPf(true)
    try {
      const r = await callImport(tok, { action:'fetch_ca_certs', ca_type:'digicert', connection_id:connId })
      if (!r.error) setPf(r.certs||[])
    } catch(e) { console.error(e) }
    setLoadingPf(false)
  }, [connId, tok])

  const doSync = async () => {
    if (!connId||!tok) return
    setLoadingPf(true)
    try {
      await callImport(tok, { action:'sync', connection_id:connId })
      await loadPf()
    } catch(e) { console.error(e) }
    setLoadingPf(false)
  }

  const now = Date.now()
  const filtered = portfolio.filter(c => {
    const domain = (c.domain||'').toLowerCase()
    const q = search.toLowerCase()
    if (q && !domain.includes(q)) return false
    if (filterStatus==='active' && c.status!=='active') return false
    if (filterStatus==='expired' && c.status!=='expired') return false
    if (filterStatus==='expiring') {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at)-now)/86400000) : null
      if (d===null || d<0 || d>90) return false
    }
    return true
  })

  const expiring30 = portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at)-now)/86400000) : null; return d!==null && d>=0 && d<=30 }).length

  if (!apiKey) return (
    <div>
      <div style={{ background:'rgba(0,119,182,0.06)', border:'1px solid rgba(0,119,182,0.2)', borderRadius:10, padding:'14px 18px', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0077b6', marginBottom:3 }}>DigiCert CertCentral — not connected</div>
        <div style={{ fontSize:12, color:'#555555' }}>Connect your API key to access portfolio analytics and cert details.</div>
      </div>
      <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, padding:'20px' }}>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#888888', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>CertCentral API key</label>
        <div style={{ position:'relative', marginBottom:8 }}>
          <input type={showKey?'text':'password'} value={draftKey} onChange={e=>setDraftKey(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&connect()} placeholder="Paste your DigiCert API key…"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 36px 10px 12px', borderRadius:8,
              border:'1px solid rgba(0,119,182,0.2)', background:'#f8fafc', color:'#111111', fontSize:13, fontFamily:'monospace', outline:'none' }}/>
          <button onClick={()=>setShowKey(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#888888' }}>
            {showKey?<EyeOff size={13}/>:<Eye size={13}/>}
          </button>
        </div>
        {error && <div style={{ background:'rgba(192,57,43,0.08)', borderRadius:7, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#c0392b' }}>{error}</div>}
        <button onClick={connect} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:8, background:'#0077b6', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
          {saving?<><Spinner/> Connecting…</>:'Connect DigiCert'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background:'transparent', border:'1px solid rgba(0,119,182,0.2)', borderRadius:10,
        padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#00a550', display:'inline-block' }}/>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#0077b6' }}>DigiCert CertCentral connected</div>
            <div style={{ fontSize:11, color:'#555555' }}>API key active · {portfolio.length} certs loaded</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={doSync} disabled={loadingPf}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:6,
              border:'1px solid rgba(0,119,182,0.2)', background:'#ffffff', color:'#333333', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loadingPf?<><Spinner/> Syncing…</>:<><RefreshCw size={11}/> Sync</>}
          </button>
          <button onClick={disconnect}
            style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(192,57,43,0.3)', background:'transparent', color:'#c0392b', fontSize:11, cursor:'pointer' }}>
            Disconnect
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        <StatCard label="Total certs" val={portfolio.length} sub="in portfolio"/>
        <StatCard label="Active" val={portfolio.filter(c=>c.status==='active').length} color="#00a550"/>
        <StatCard label="Expiring ≤ 30d" val={expiring30}
          color={expiring30>0?'#9a6400':'#888888'} bg={expiring30>0?'rgba(154,100,0,0.05)':undefined}/>
        <StatCard label="PQC risk" val={portfolio.filter(c=>c.key_algorithm==='RSA').length} sub="RSA keys flagged"/>
      </div>

      <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid rgba(0,119,182,0.08)', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#888888' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search domain…"
              style={{ width:'100%', paddingLeft:28, paddingRight:10, height:30, fontSize:12, borderRadius:6,
                border:'1px solid rgba(0,119,182,0.15)', background:'#f8fafc', color:'#111111', outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {[['all','All'],['active','Active'],['expiring','Expiring ≤90d'],['expired','Expired']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                style={{ fontSize:11, padding:'3px 10px', borderRadius:20, cursor:'pointer',
                  fontWeight:filterStatus===v?600:400,
                  border:`1px solid ${filterStatus===v?'#0077b6':'rgba(0,119,182,0.2)'}`,
                  background:filterStatus===v?'#0077b6':'transparent',
                  color:filterStatus===v?'#ffffff':'#555555' }}>
                {l}
              </button>
            ))}
          </div>
          <span style={{ fontSize:11, color:'#888888' }}>{filtered.length} of {portfolio.length}</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 110px 90px', padding:'8px 14px',
          background:'rgba(0,119,182,0.04)', borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
          {['Domain','Product','Expires','Status'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:600, color:'#888888', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
          ))}
        </div>

        <div style={{ maxHeight:480, overflowY:'auto' }}>
          {loadingPf && portfolio.length===0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#888888', fontSize:13 }}><Spinner/> Loading portfolio…</div>
          ) : filtered.length===0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#888888', fontSize:13 }}>
              {portfolio.length===0?'Click "Sync" to load your portfolio.':'No certificates match your search.'}
            </div>
          ) : filtered.map((c, i) => {
            const d = c.expires_at ? Math.ceil((new Date(c.expires_at)-now)/86400000) : null
            return (
              <div key={c.id||i} style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 110px 90px',
                padding:'9px 14px', alignItems:'center',
                background:i%2===0?'transparent':'rgba(0,119,182,0.02)',
                borderBottom:'1px solid rgba(0,119,182,0.06)', cursor:'default',
                transition:'background .1s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.04)'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(0,119,182,0.02)'}>
                <div style={{ fontSize:12, fontWeight:600, fontFamily:'monospace', color:'#111111',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.domain||'—'}</div>
                <div style={{ fontSize:11, color:'#555555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.cert_type_detail||'SSL'}</div>
                <div><ExpiryPill days={d}/></div>
                <div>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                    background:c.status==='active'?'rgba(0,165,80,0.1)':'rgba(192,57,43,0.1)',
                    color:c.status==='active'?'#00a550':'#c0392b',
                    border:`0.5px solid ${c.status==='active'?'rgba(0,165,80,0.3)':'rgba(192,57,43,0.3)'}` }}>
                    {c.status==='active'?'Active':c.status||'—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 4 — SECTIGO
// ══════════════════════════════════════════════════════════════════════
function SectigoTab({ tok }) {
  const [creds,    setCreds]    = useState(null)
  const [draft,    setDraft]    = useState({ uri:'', login:'', pass:'' })
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [inventory,setInventory]= useState([])
  const [syncing,  setSyncing]  = useState(false)

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action:'list_connections' }).then(r => {
      const sc = (r.connections||[]).find(c => c.ca_type==='sectigo' && c.status==='active')
      if (sc?.customer_uri && sc?.login) setCreds({ customer_uri:sc.customer_uri, login:sc.login, password:sc.password })
    })
  }, [tok])

  const connect = async () => {
    if (!draft.uri||!draft.login||!draft.pass) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action:'save_connection', ca_type:'sectigo', label:'Sectigo SCM',
        customer_uri:draft.uri, login:draft.login, password:draft.pass })
      if (r.error) { setError(r.error); setSaving(false); return }
      setCreds({ customer_uri:draft.uri, login:draft.login, password:draft.pass })
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const disconnect = () => {
    callImport(tok, { action:'delete_connection', ca_type:'sectigo' })
    setCreds(null); setInventory([])
  }

  const syncInventory = async () => {
    setSyncing(true)
    try {
      const r = await callCA(tok, { action:'sectigo_proxy', path:'/certificates', method:'GET', creds })
      setInventory(r.result||r.certs||r.certificates||[])
    } catch(e) { console.error(e) }
    setSyncing(false)
  }

  if (!creds) return (
    <div>
      <div style={{ background:'rgba(0,119,182,0.06)', border:'1px solid rgba(0,119,182,0.2)', borderRadius:10, padding:'14px 18px', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0077b6', marginBottom:3 }}>Sectigo SCM — not connected</div>
        <div style={{ fontSize:12, color:'#555555' }}>Connect your SCM credentials to access inventory and portfolio analytics.</div>
      </div>
      <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, padding:'20px' }}>
        {[
          { label:'Customer URI', key:'uri',   placeholder:'https://cert-manager.com', type:'text' },
          { label:'Login',        key:'login', placeholder:'your@email.com',           type:'text' },
          { label:'Password',     key:'pass',  placeholder:'••••••••',                 type:showPass?'text':'password' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#888888', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</label>
            <div style={{ position:'relative' }}>
              <input type={type} placeholder={placeholder} value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:8,
                  border:'1px solid rgba(0,119,182,0.2)', background:'#f8fafc', color:'#111111', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
              {key==='pass' && (
                <button onClick={()=>setShowPass(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#888888' }}>
                  {showPass?<EyeOff size={13}/>:<Eye size={13}/>}
                </button>
              )}
            </div>
          </div>
        ))}
        {error && <div style={{ background:'rgba(192,57,43,0.08)', borderRadius:7, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#c0392b' }}>{error}</div>}
        <button onClick={connect} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:8, background:'#0077b6', border:'none', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 }}>
          {saving?<><Spinner/> Connecting…</>:'Connect Sectigo'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background:'transparent', border:'1px solid rgba(0,119,182,0.2)', borderRadius:10,
        padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#0077b6' }}>Sectigo SCM connected</div>
          <div style={{ fontSize:11, color:'#555555', marginTop:2 }}>{creds.customer_uri}</div>
        </div>
        <button onClick={disconnect}
          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(192,57,43,0.3)', background:'transparent', color:'#c0392b', fontSize:11, cursor:'pointer' }}>
          Disconnect
        </button>
      </div>

      <div style={{ background:'#ffffff', border:'1px solid rgba(0,119,182,0.12)', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,119,182,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px', borderBottom:'1px solid rgba(0,119,182,0.08)', background:'rgba(0,119,182,0.02)' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.4px' }}>Certificate inventory</span>
          <button onClick={syncInventory} disabled={syncing}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:6,
              border:'1px solid rgba(0,119,182,0.2)', background:'#ffffff', color:'#333333', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {syncing?<><Spinner/> Syncing…</>:<><RefreshCw size={11}/> Sync from Sectigo</>}
          </button>
        </div>
        {inventory.length===0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#888888', fontSize:13 }}>
            Click "Sync from Sectigo" to load your certificate inventory.
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px', padding:'8px 16px',
              background:'rgba(0,119,182,0.04)', borderBottom:'1px solid rgba(0,119,182,0.08)' }}>
              {['Domain','Type','Expires','Status'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:'#888888', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
              ))}
            </div>
            {inventory.map((c, i) => {
              const expiry = c.expires||c.notAfter
              const d = dLeft(expiry)
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px',
                  padding:'10px 16px', borderBottom:'1px solid rgba(0,119,182,0.06)',
                  background:i%2===0?'transparent':'rgba(0,119,182,0.02)' }}>
                  <div style={{ fontSize:12, fontWeight:600, fontFamily:'monospace', color:'#111111',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.commonName||c.cn||'—'}</div>
                  <div style={{ fontSize:11, color:'#555555' }}>{c.type||c.certType||'SSL'}</div>
                  <div style={{ fontSize:11, color:'#555555' }}>{fmt(expiry)}</div>
                  <div><ExpiryPill days={d}/></div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════
export default function CAIntelligenceHub({ nav }) {
  const [tok,  setTok]  = useState('')
  const [user, setUser] = useState(null)
  const [tab,  setTab]  = useState('overview')
  const [live, setLive] = useState({ total:0, exp30:0, healthy:0, rapidCount:0, dcConn:false, scConn:false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) return
      setTok(session.access_token)
      setUser(session.user)
      Promise.all([
        supabase.from('ssl_orders').select('id,valid_till,status').eq('status','active'),
        supabase.from('ca_connections').select('ca_type,status').eq('status','active'),
      ]).then(([orders, conns]) => {
        const now  = Date.now()
        const ords = orders.data||[]
        const cs   = conns.data||[]
        const exp30    = ords.filter(o => { const d = o.valid_till?Math.ceil((new Date(o.valid_till)-now)/86400000):null; return d!==null&&d>0&&d<=30 }).length
        const healthy  = ords.filter(o => { const d = o.valid_till?Math.ceil((new Date(o.valid_till)-now)/86400000):null; return d!==null&&d>90 }).length
        setLive({ total:ords.length, exp30, healthy, rapidCount:ords.length, dcConn:cs.some(c=>c.ca_type==='digicert'), scConn:cs.some(c=>c.ca_type==='sectigo') })
      }).catch(()=>{})
    })
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e,s)=>{
      setTok(s?.access_token||'')
      setUser(s?.user||null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const caCount = 1 + (live.dcConn?1:0) + (live.scConn?1:0)

  const TABS = [
    { id:'overview', label:'Overview',  icon:BarChart2, dot:null },
    { id:'rapidssl', label:'RapidSSL',  icon:Shield,    dot:'#00a550', count:live.rapidCount },
    { id:'digicert', label:'DigiCert',  icon:Building,  dot:live.dcConn?'#00a550':'#aaaaaa' },
    { id:'sectigo',  label:'Sectigo',   icon:Lock,      dot:live.scConn?'#00a550':'#aaaaaa' },
  ]

  const STAT_CARDS = [
    { value:live.total,   label:'Total Certs',    color:'#ffffff' },
    { value:live.healthy, label:'Healthy',         color:'#ffffff' },
    { value:live.exp30,   label:'Expiring Soon',   color:live.exp30>0?'#fde68a':'#ffffff' },
    { value:caCount,      label:'CA Integrations', color:'#ffffff' },
  ]

  return (
    <div style={{ fontFamily:F, background:'#f0f4fa', minHeight:'100vh' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes capulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(2.8);opacity:0}}
        .pki-tab{display:inline-flex;align-items:center;gap:7px;padding:11px 20px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;background:none;border:none;border-bottom:2px solid transparent;transition:all .15s;color:#555555;white-space:nowrap;margin-bottom:-1px}
        .pki-tab:hover{color:#111111}
        .pki-tab.on{font-weight:700;border-bottom-color:#0077b6;color:#0077b6}
        .pki-count{font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:rgba(0,119,182,0.08);color:#0077b6;transition:all .15s}
        .pki-tab.on .pki-count{background:#0077b6;color:#fff}
        .pki-tab-bar{background:#fff;border-bottom:1px solid rgba(0,119,182,0.12);padding:0 32px;display:flex;gap:0;overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,119,182,0.08)}
      `}</style>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #0077b6 0%, #005d91 100%)', padding:'28px 32px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
            SSLVault · CA Intelligence
          </div>
          <h1 style={{ fontSize:26, fontWeight:700, color:'#ffffff', margin:'0 0 4px', letterSpacing:'-0.3px' }}>
            PKI Intelligence
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'0 0 20px' }}>
            Unified visibility across {caCount} of 3 CAs · {live.total} certificate{live.total!==1?'s':''} tracked
          </p>

          {/* Stat cards */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {STAT_CARDS.map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)',
                borderRadius:10, padding:'12px 20px', minWidth:110, backdropFilter:'blur(8px)' }}>
                <div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1.1,
                  fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:4, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tag row */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:14 }}>
            {['GoGetSSL · RapidSSL · DigiCert','CCADB indexed','47-day ready','Auto-renew','CA/B Forum 2026'].map(tag => (
              <span key={tag} style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:20,
                background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.9)',
                border:'1px solid rgba(255,255,255,0.25)' }}>
                {tag}
              </span>
            ))}
          </div>

          {live.exp30 > 0 && (
            <div style={{ marginTop:14, background:'rgba(245,158,11,0.2)', border:'1px solid rgba(245,158,11,0.4)',
              borderRadius:8, padding:'9px 14px', display:'flex', alignItems:'center', gap:8,
              fontSize:12, color:'#fde68a', fontWeight:500 }}>
              <AlertTriangle size={13}/>
              {live.exp30} certificate{live.exp30>1?'s':''} expiring within 30 days — action required
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="pki-tab-bar">
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex' }}>
          {TABS.map(t => {
            const on = tab===t.id
            return (
              <button key={t.id} className={'pki-tab'+(on?' on':'')} onClick={()=>setTab(t.id)}>
                <t.icon size={13}/>
                {t.label}
                {t.dot && (
                  <span style={{ position:'relative', width:7, height:7, flexShrink:0 }}>
                    {t.dot==='#00a550' && <span style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'rgba(0,165,80,0.25)', animation:'capulse 2.5s ease infinite' }}/>}
                    <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:t.dot }}/>
                  </span>
                )}
                {t.count!=null && <span className="pki-count">{t.count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 32px 60px' }}>
        {!tok ? (
          <div style={{ textAlign:'center', padding:60, color:'#888888', fontSize:13 }}>
            <Spinner/><span style={{ marginLeft:8 }}>Loading session…</span>
          </div>
        ) : (
          <>
            {tab==='overview' && <OverviewTab user={user} tok={tok} onSwitchCA={setTab}/>}
            {tab==='rapidssl' && <RapidSSLTab tok={tok} nav={nav}/>}
            {tab==='digicert' && <DigiCertTab tok={tok} nav={nav}/>}
            {tab==='sectigo'  && <SectigoTab  tok={tok}/>}
          </>
        )}
      </div>
    </div>
  )
}
