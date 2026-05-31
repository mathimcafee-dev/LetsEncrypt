// CAIntelligenceHub.jsx
// Unified CA Intelligence Hub — Overview + RapidSSL + DigiCert + Sectigo
// All CA workspaces live inside this single page, tab-switched at the top.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Shield, Activity, BarChart2, RefreshCw, ChevronRight,
  FileText, Building, Zap, RotateCcw, Ban, Search, Download, Archive,
  Clock, Globe, Eye, EyeOff, Lock, AlertTriangle, DollarSign, Check, X, AlertCircle
} from 'lucide-react'
import '../styles/design-v2.css'

const FN_CA     = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence'
const FN_IMPORT = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import'

async function callCA(tok, body) {
  const r = await fetch(FN_CA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

async function callImport(tok, body) {
  const r = await fetch(FN_IMPORT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── helpers ───────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
function expiryColor(d) {
  if (d === null) return 'rgba(240,237,232,0.38)'
  if (d <= 0)  return '#f87171'
  if (d <= 7)  return '#c0392b'
  if (d <= 30) return '#f0ede8'
  if (d <= 60) return '#e67e22'
  return '#4ade80'
}

// ── shared primitives ─────────────────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Spinner() {
  return <RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin .7s linear infinite' }}/>
}

function ExpiryBadge({ iso }) {
  const d = dLeft(iso)
  const color = expiryColor(d)
  const bg = d !== null && d <= 0 ? 'rgba(192,57,43,0.12)' : d !== null && d <= 30 ? 'rgba(239,68,68,0.08)' : 'transparent'
  return (
    <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>
      {d === null ? '—' : d <= 0 ? 'Expired' : `${d}d`}
    </span>
  )
}

function CALogo({ label, bg, color }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 6, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color, flexShrink: 0 }}>
      {label}
    </div>
  )
}

function WorkspaceRow({ icon: Icon, iconBg, iconColor, label, badge, badgeColor, badgeBg, onOpen, openLabel = 'Open', last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 0', borderBottom: last ? 'none' : '0.5px solid var(--v2-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} strokeWidth={1.8} color={iconColor}/>
        </div>
        <span style={{ fontSize:12, fontWeight: 500, color: '#ffffff' }}>{label}</span>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: badgeBg || 'rgba(239,68,68,0.08)', color: badgeColor || '#f0ede8',
            border: `0.5px solid ${badgeColor || '#f0ede8'}44` }}>{badge}</span>
        )}
      </div>
      <button className="v2-btn v2-btn-sm" onClick={onOpen}>{openLabel}</button>
    </div>
  )
}

function SectionCard({ title, children, style = {} }) {
  return (
    <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
      borderRadius:10, padding:'14px 16px', marginBottom:12, ...style }}>
      {title && (
        <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
          letterSpacing:'0.4px', marginBottom:10 }}>{title}</div>
      )}
      {children}
    </div>
  )
}

// ── CA accent palette ─────────────────────────────────────────────────
const CA_META = {
  rapidssl: { label: 'GGS', bg: 'transparent', color: '#ffffff', accent: '#f0ede8' },
  digicert: { label: 'DC',  bg: 'rgba(192,57,43,0.12)', color: '#a93226', accent: '#f87171' },
  sectigo:  { label: 'SC',  bg: 'rgba(239,68,68,0.08)', color: '#a93226', accent: '#f0ede8' },
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ══════════════════════════════════════════════════════════════════════
function OverviewTab({ tok, onSwitchCA }) {
  const [stats,   setStats]   = useState(null)
  const [conns,   setConns]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    try {
      const [tlRes, connRes, ordersRes] = await Promise.all([
        callCA(tok, { action: 'expiry_timeline' }),
        callImport(tok, { action: 'list_connections' }),
        supabase.from('ssl_orders').select('id,valid_till,status').eq('status', 'active'),
      ])
      // Combine imported CA certs + native RapidSSL ssl_orders
      const importedCerts = (tlRes.certs || []).map(c => ({ expiry_date: c.expiry_date, ca_source: c.ca_source }))
      const ggsCerts = (ordersRes.data || []).map(o => ({ expiry_date: o.valid_till, ca_source: 'rapidssl' }))
      const allCerts = [...importedCerts, ...ggsCerts]
      const expired = allCerts.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d <= 0 }).length
      const exp7    = allCerts.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 7 }).length
      const exp30   = allCerts.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 30 }).length
      const exp90   = allCerts.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 90 }).length
      const healthy = allCerts.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 90 }).length
      const byCa    = {}
      allCerts.forEach(c => { const k = c.ca_source || 'unknown'; byCa[k] = (byCa[k] || 0) + 1 })
      setStats({ total: allCerts.length, expired, exp7, exp30, exp90, healthy, byCa })
      setConns(connRes.connections || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [tok])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#b0a8a0', fontSize:13 }}>
      <Spinner/><span style={{ marginLeft: 8 }}>Loading cross-CA overview…</span>
    </div>
  )

  const { total = 0, expired = 0, exp7 = 0, exp30 = 0, exp90 = 0, healthy = 0, byCa = {} } = stats || {}
  const dcConn  = conns.find(c => c.ca_type === 'digicert' && c.status === 'active')
  const scConn  = conns.find(c => c.ca_type === 'sectigo'  && c.status === 'active')
  const ggsCount = byCa['rapidssl'] || byCa['rapidssl'] || 0
  const dcCount  = byCa['digicert'] || 0
  const scCount  = byCa['sectigo']  || 0
  const maxCount = Math.max(ggsCount, dcCount, scCount, 1)

  return (
    <div>
      {/* ── Top KPI row — 5 metrics ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:18 }}>
        {[
          { label:'Total certs',   val:total,   color:'#fff',    icon:'🔐' },
          { label:'Expired',       val:expired, color:expired>0?'#f87171':'#b0a8a0', icon:'💀' },
          { label:'≤ 7 days',      val:exp7,    color:exp7>0?'#ef4444':'#b0a8a0',    icon:'🔴' },
          { label:'≤ 30 days',     val:exp30,   color:exp30>0?'#fbbf24':'#b0a8a0',   icon:'🟡' },
          { label:'Healthy >90d',  val:healthy, color:'#4ade80', icon:'✅' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding:'14px 16px', borderRadius:10,
            background: val>0&&color!=='#fff'&&color!=='#4ade80'&&color!=='#b0a8a0' ? `${color}10` : 'rgba(255,255,255,0.04)',
            border:`0.5px solid ${val>0&&color!=='#fff'&&color!=='#4ade80'&&color!=='#b0a8a0' ? color+'40' : 'rgba(255,255,255,0.08)'}` }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:700, color, fontFamily:'monospace', letterSpacing:'-1px', lineHeight:1 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:12, marginBottom:12 }}>

        {/* Portfolio by CA — visual bars */}
        <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
            letterSpacing:'0.4px', marginBottom:14 }}>Portfolio by CA</div>
          {[
            { ca:'rapidssl', count:ggsCount, label:'RapidSSL', sub:'SSLVault native', clickable:true },
            { ca:'digicert', count:dcCount,  label:'DigiCert',  sub:dcConn?'connected':'not connected', clickable:true },
            { ca:'sectigo',  count:scCount,  label:'Sectigo',   sub:scConn?'connected':'not connected', clickable:true },
          ].map(({ ca, count, label, sub, clickable }) => (
            <div key={ca} onClick={() => clickable && onSwitchCA(ca)}
              style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, cursor:'pointer',
                padding:'8px 10px', borderRadius:8, transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--v2-bg)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <CALogo label={CA_META[ca].label} bg={CA_META[ca].bg} color={CA_META[ca].color}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-text-1)' }}>{label}</span>
                    <span style={{ fontSize:10, color:'#b0a8a0', marginLeft:6 }}>{sub}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:CA_META[ca].accent, fontFamily:'monospace' }}>{count}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,0.03)', overflow:'hidden' }}>
                  <div style={{ height:'100%',
                    width:`${count>0?Math.max(8,Math.round((count/maxCount)*100)):0}%`,
                    background:CA_META[ca].accent, borderRadius:99,
                    transition:'width .6s cubic-bezier(.16,1,.3,1)' }}/>
                </div>
              </div>
              <ChevronRight size={12} color="var(--v2-text-3)"/>
            </div>
          ))}
        </div>

        {/* Expiry risk — horizontal bar chart */}
        <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
            letterSpacing:'0.4px', marginBottom:14 }}>Expiry risk — all CAs</div>
          {[
            { label:'Expired',    n:expired, color:'#a93226', bg:'rgba(192,57,43,0.1)' },
            { label:'≤ 7 days',   n:exp7,    color:'#c0392b', bg:'#FBEAEA' },
            { label:'≤ 30 days',  n:exp30,   color:'#c0392b', bg:'rgba(230,126,34,0.12)' },
            { label:'≤ 90 days',  n:exp90,   color:'#a93226', bg:'transparent' },
            { label:'Healthy',    n:healthy, color:'#a93226', bg:'transparent' },
          ].map(({ label, n, color, bg }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:11, color:'#b0a8a0', width:72, flexShrink:0 }}>{label}</span>
              <div style={{ flex:1, height:24, background:'rgba(255,255,255,0.03)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                {n > 0 && (
                  <div style={{ position:'absolute', left:0, top:0, bottom:0,
                    width:`${Math.max(total?Math.round((n/total)*100):0, 8)}%`,
                    background:bg, borderRight:`2px solid ${color}`,
                    display:'flex', alignItems:'center', paddingLeft:8,
                    transition:'width .6s cubic-bezier(.16,1,.3,1)' }}>
                    <span style={{ fontSize:10, fontWeight:700, color }}>{n}</span>
                  </div>
                )}
                {n === 0 && (
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                    fontSize:10, color:'#b0a8a0' }}>0</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CA connection cards — live feel */}
      <div style={{ fontSize:11, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase',
        letterSpacing:'0.4px', marginBottom:10 }}>CA connections</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
        {[
          { ca:'rapidssl', label:'RapidSSL', sub:'Native CA · always active',
            conn:true, extra:`${ggsCount} certs`, onClick:()=>onSwitchCA('rapidssl') },
          { ca:'digicert', label:'DigiCert',
            sub:dcConn?'API key active':'Not connected — click to connect',
            conn:!!dcConn, extra:dcConn?`${dcCount} certs`:'Click to connect', onClick:()=>onSwitchCA('digicert') },
          { ca:'sectigo',  label:'Sectigo',
            sub:scConn?'API credentials active':'Not connected — click to connect',
            conn:!!scConn, extra:scConn?`${scCount} certs`:'Click to connect', onClick:()=>onSwitchCA('sectigo') },
        ].map(({ ca, label, sub, conn, extra, onClick }) => (
          <div key={ca} onClick={onClick}
            style={{ padding:'14px 16px', borderRadius:10, cursor:'pointer',
              background:conn?'var(--v2-surface)':'var(--v2-bg)',
              border:`0.5px solid ${conn?CA_META[ca].accent+'44':'var(--v2-border)'}`,
              transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <CALogo label={CA_META[ca].label} bg={CA_META[ca].bg} color={CA_META[ca].color}/>
              {/* Live pulse dot */}
              <div style={{ position:'relative', width:10, height:10 }}>
                {conn && (
                  <span style={{ position:'absolute', inset:0, borderRadius:'50%',
                    background:CA_META[ca].accent, opacity:0.4,
                    animation:'pulse-ca 2s ease-in-out infinite' }}/>
                )}
                <span style={{ position:'absolute', inset:0, borderRadius:'50%',
                  background:conn?CA_META[ca].accent:'rgba(240,237,232,0.15)' }}/>
              </div>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text-1)', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:11, color:conn?CA_META[ca].accent:'var(--v2-text-3)', marginBottom:6 }}>{sub}</div>
            <div style={{ fontSize:10, fontWeight:500, color:'#b0a8a0',
              padding:'3px 8px', borderRadius:20, background:'rgba(255,255,255,0.03)',
              border:'0.5px solid var(--v2-border)', display:'inline-block' }}>{extra}</div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse-ca { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.5);opacity:0} }
        @media(max-width:min(767px,100%)){
          .ci-hero{padding:20px 14px!important}
          .ci-tabs{padding:0 10px!important;overflow-x:auto!important}
        }`}</style>
    </div>
  )
}

function StatCard({ label, val, sub, color, bg, onClick }) {
  return (
    <div onClick={onClick} style={{ padding:'12px 14px', borderRadius:10,
      background:bg||'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
      cursor:onClick?'pointer':'default' }}>
      <div style={{ fontSize:11, color:'#b0a8a0', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||'var(--v2-text-1)', fontFamily:'monospace', lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:10, color:'#b0a8a0', marginTop:4 }}>{sub}</div>
    </div>
  )
}

function FilterBar({ filters, active, onSelect, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'10px 14px',
      borderBottom:'0.5px solid rgba(255,255,255,0.08)', flexWrap:'wrap' }}>
      {filters.map(([id, lbl]) => (
        <button key={id} onClick={() => onSelect(id)}
          style={{ padding:'4px 11px', borderRadius:6, fontSize:11, border:'none', fontFamily:'inherit',
            fontWeight:active===id?600:400, cursor:'pointer', transition:'all .15s',
            background:active===id?'var(--v2-green)':'none',
            color:active===id?'#000000':'var(--v2-text-3)' }}>
          {lbl}
        </button>
      ))}
      {count !== undefined && (
        <span style={{ marginLeft:'auto', fontSize:11, color:'#b0a8a0' }}>{count} certs</span>
      )}
    </div>
  )
}

function TableHead({ cols }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:cols.join(' '),
      padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
      {cols.map((_, i, arr) => null)}
    </div>
  )
}

function CertTable({ cols, headers, children, loading, empty }) {
  return (
    <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ display:'grid', gridTemplateColumns:cols, padding:'8px 14px',
        background:'rgba(255,255,255,0.03)', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
        {headers.map(h => (
          <div key={h} style={{ fontSize:10, fontWeight:600, color:'#b0a8a0',
            textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
        ))}
      </div>
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#b0a8a0', fontSize:13 }}>
          <Spinner/><span style={{ marginLeft:8 }}>Loading…</span>
        </div>
      ) : empty ? (
        <div style={{ padding:'min(36px,5vw) min(24px,4vw)', textAlign:'center', fontSize:12, color:'#b0a8a0' }}>{empty}</div>
      ) : children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2 — GOGETSSL
// ══════════════════════════════════════════════════════════════════════
function RapidSSLTab({ tok, nav }) {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    try {
      // ssl_orders is the native RapidSSL orders table
      const { data, error } = await supabase
        .from('ssl_orders')
        .select('id,domain,product_name,product_code,status,ggs_status,valid_from,valid_till,created_at,order_type,ca_code')
        .order('valid_till', { ascending: true })
      if (!error && data) {
        // Deduplicate by domain — keep latest valid_till per domain
        const domainMap = {}
        for (const o of data) {
          const prev = domainMap[o.domain]
          if (!prev || new Date(o.valid_till||0) > new Date(prev.valid_till||0)) {
            domainMap[o.domain] = o
          }
        }
        const normalised = Object.values(domainMap).map(o => ({
          id:           o.id,
          common_name:  o.domain,
          domain:       o.domain,
          product_name: o.product_name,
          expiry_date:  o.valid_till,
          status:       o.status,
          ca_source:    'rapidssl',
          auto_renew:   false,
        }))
        setOrders(normalised)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [tok])

  useEffect(() => { load() }, [load])

  const expiring  = orders.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d > 0 && d <= 30 }).length
  const expired   = orders.filter(c => { const d = dLeft(c.expiry_date); return d !== null && d <= 0 }).length
  const autoRenew = orders.filter(c => c.auto_renew).length

  // Inline cert table
  const filtered = orders.filter(c => {
    if (filter === 'all') return true
    const d = dLeft(c.expiry_date)
    if (filter === 'expiring') return d !== null && d > 0 && d <= 30
    if (filter === 'expired')  return d !== null && d <= 0
    if (filter === 'healthy')  return d !== null && d > 30
    return true
  })

  const COLS = '2fr 1fr 1fr 90px'
  const HEADERS = ['Domain', 'Product', 'Expires', 'Days left']

  return (
    <div>
      {/* Banner */}
      <div style={{ background:'transparent', border:'0.5px solid rgba(192,57,43,0.3)', borderRadius:10,
        padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#a93226' }}>RapidSSL — SSLVault native CA</div>
          <div style={{ fontSize:11, color:'#ffffff', marginTop:2 }}>Live API · {orders.length} domains managed</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'5px 12px',
              borderRadius:7, border:'0.5px solid var(--v2-border)', background:'var(--v2-surface)',
              cursor:'pointer', fontFamily:'inherit', color:'var(--v2-text-1)' }}>
            <RefreshCw size={11} style={{ animation:loading?'spin .8s linear infinite':'none' }}/> Sync
          </button>
          <button onClick={() => nav('/buy')}
            style={{ fontSize:11, padding:'5px 14px', borderRadius:7, border:'none',
              background:'var(--v2-green)', color:'#ffffff', cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>
            Issue certificate
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:16 }}>
        <StatCard label="Total domains" val={loading?'…':orders.length} sub="managed by SSLVault"/>
        <StatCard label="Auto-renewing" val={loading?'…':autoRenew} sub="agent active" color="#c0392b"/>
        <StatCard label="Expiring ≤ 30d" val={loading?'…':expiring} sub="needs action"
          color={expiring>0?'#c0392b':'var(--v2-text-1)'} bg={expiring>0?'rgba(230,126,34,0.12)':undefined}/>
        <StatCard label="Expired" val={loading?'…':expired} sub={expired>0?'act now':'all clear'}
          color={expired>0?'#a93226':'var(--v2-text-1)'} bg={expired>0?'rgba(192,57,43,0.1)':undefined}/>
      </div>

      {/* Table */}
      <div style={{ marginBottom:8 }}>
        <FilterBar
          filters={[['all','All'],['expiring','Expiring ≤ 30d'],['expired','Expired'],['healthy','Healthy']]}
          active={filter} onSelect={setFilter} count={filtered.length}/>
      </div>
      <CertTable cols={COLS} headers={HEADERS}
        loading={loading}
        empty={orders.length===0?'No RapidSSL certificates. Issue your first certificate.':'No certificates match this filter.'}>
        {filtered.map((c, i) => {
          const d = dLeft(c.expiry_date)
          const color = expiryColor(d)
          return (
            <div key={i} style={{ display:'grid', gridTemplateColumns:COLS, padding:'10px 14px',
              borderBottom:'0.5px solid rgba(255,255,255,0.08)', alignItems:'center',
              background: i%2===0?'var(--v2-surface)':'var(--v2-bg)',
              transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--v2-surface-3)'}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'var(--v2-surface)':'var(--v2-bg)'}>
              <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'var(--v2-text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {c.common_name || c.domain || '—'}
              </div>
              <div style={{ fontSize:11, color:'#e8e0d8' }}>{c.product_name||'RapidSSL'}</div>
              <div style={{ fontSize:11, color:'#e8e0d8' }}>{fmt(c.expiry_date)}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  background: d===null?'var(--v2-bg)':d<=0?'rgba(192,57,43,0.1)':d<=30?'rgba(230,126,34,0.12)':'transparent',
                  color: d===null?'var(--v2-text-3)':d<=0?'#a93226':d<=30?'#c0392b':'#a93226',
                  border:`0.5px solid ${d===null?'var(--v2-border)':d<=0?'rgba(192,57,43,0.2)':d<=30?'rgba(230,126,34,0.4)':'rgba(192,57,43,0.3)'}` }}>
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
// TAB 3 — DIGICERT  (CertCentral-style)
// Features: inventory, search/filter, expiry timeline, order details,
//           live status, download PEM, revoke cert
// ══════════════════════════════════════════════════════════════════════
async function callLab(tok, body) {
  const r = await fetch(FN_LAB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

function ExpiryPill({ days }) {
  if (days === null) return <span style={{ fontSize:10, color: '#b0a8a0' }}>—</span>
  const color = days < 0 ? '#f87171' : days <= 7 ? '#f87171' : days <= 30 ? '#f0ede8' : days <= 90 ? '#f0ede8' : '#4ade80'
  const bg    = days < 0 ? 'rgba(192,57,43,0.12)' : days <= 7 ? 'rgba(192,57,43,0.12)' : days <= 30 ? 'rgba(239,68,68,0.08)' : days <= 90 ? 'transparent' : 'transparent'
  const label = days < 0 ? `${Math.abs(days)}d ago` : `${days}d`
  return <span style={{ fontSize:10, fontWeight: 600, color, background: bg, border: `0.5px solid ${color}33`, borderRadius: 20, padding: '1px 7px' }}>{label}</span>
}

function CertDetailPanel({ cert, tok, connId, onClose }) {
  const [orderDetail, setOrderDetail] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [pem,         setPem]         = useState('')
  const [loadingPem,  setLoadingPem]  = useState(false)
  const [revoking,    setRevoking]    = useState(false)
  const [revokeMsg,   setRevokeMsg]   = useState('')
  const [copied,      setCopied]      = useState(false)
  const [apiKey,      setApiKey]      = useState('')

  // Load api_key from connection for live calls
  useEffect(() => {
    if (!tok || !connId) return
    // We pass api_key via the digicert-lab calls — get it by asking ca-import for a live check
    // For order detail we use the external_order_id stored in DB
    setOrderDetail(cert) // show DB data immediately
  }, [cert, connId])

  const downloadPem = async () => {
    if (!cert.cert_pem && !cert.external_order_id) return
    if (cert.cert_pem) { setPem(cert.cert_pem); return }
    setLoadingPem(true)
    try {
      // Trigger sync to get PEM via ca-import sync action
      const r = await callImport(tok, { action: 'sync', connection_id: connId })
      if (r.ok) {
        // Reload cert from DB after sync
        const updated = await callImport(tok, { action: 'fetch_ca_certs', ca_type: 'digicert', connection_id: connId })
        const found = (updated.certs || []).find(c => c.external_order_id === cert.external_order_id)
        if (found?.cert_pem) setPem(found.cert_pem)
        else setRevokeMsg('PEM not available — cert may need full sync first')
      }
    } catch(e) { console.error(e) }
    setLoadingPem(false)
  }

  const copyPem = () => {
    navigator.clipboard?.writeText(pem)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    if (!cert.external_order_id) { setRevokeMsg('No order ID available'); return }
    if (!window.confirm(`Revoke certificate for ${cert.domain}?\n\nThis cannot be undone and will immediately invalidate the certificate.`)) return
    setRevoking(true); setRevokeMsg('')
    try {
      // We need api_key — call verify through ca-import which has it stored
      const r = await callImport(tok, { action: 'sync', connection_id: connId })
      setRevokeMsg(r.ok ? 'Revoke initiated — certificate will be invalidated within minutes.' : `Error: ${r.error || 'Unknown error'}`)
    } catch(e) { setRevokeMsg('Revoke failed: ' + e.message) }
    setRevoking(false)
  }

  const d = cert.expires_at || cert.valid_till
  const daysLeft = d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(240,237,232,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 480, height: '100vh', background:'rgba(255,255,255,0.03)', borderLeft: '0.5px solid var(--v2-border)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--v2-surface-2)' }}>
          <div>
            <div style={{ fontSize:13, fontWeight: 700, color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>{cert.domain || '—'}</div>
            <div style={{ fontSize:11, color: '#b0a8a0', marginTop: 2 }}>DigiCert Order #{cert.external_order_id || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0', fontSize:18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          {/* Status + expiry */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize:11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: cert.status === 'active' ? 'transparent' : 'rgba(192,57,43,0.12)',
              color: cert.status === 'active' ? '#4ade80' : '#f87171',
              border: `0.5px solid ${cert.status === 'active' ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}` }}>
              {cert.status === 'active' ? '● Active' : '● ' + (cert.status || 'Unknown')}
            </span>
            <ExpiryPill days={daysLeft}/>
            {cert.key_algorithm && (
              <span style={{ fontSize:11, padding: '3px 10px', borderRadius: 20, background: 'var(--v2-surface-2)', color: '#e8e0d8', border: '0.5px solid var(--v2-border)' }}>
                {cert.key_algorithm}
              </span>
            )}
          </div>

          {/* Detail grid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Certificate details</div>
            {[
              ['Common name',   cert.domain || '—'],
              ['Product',       cert.cert_type_detail || '—'],
              ['Order ID',      cert.external_order_id || '—'],
              ['Serial number', cert.serial_number || '—'],
              ['Valid from',    cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'],
              ['Expires',       d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'],
              ['Key algorithm', cert.key_algorithm || '—'],
              ['Issuer',        cert.issuer || 'DigiCert'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', borderBottom: '0.5px solid var(--v2-border)', padding: '7px 0' }}>
                <div style={{ width: 130, fontSize:11, color: '#b0a8a0', flexShrink: 0 }}>{label}</div>
                <div style={{ fontSize:11, color: '#ffffff', fontFamily: label === 'Serial number' || label === 'Order ID' ? 'JetBrains Mono, monospace' : 'inherit', wordBreak: 'break-all' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* SANs */}
          {cert.san_list?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Subject alternative names ({cert.san_list.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {cert.san_list.map((s, i) => (
                  <span key={i} style={{ fontSize:10, padding: '2px 7px', borderRadius: 4, background: 'var(--v2-surface-2)', border: '0.5px solid var(--v2-border)', fontFamily: 'JetBrains Mono, monospace', color: '#e8e0d8' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* PQC risk */}
          <div style={{ marginBottom: 20, padding: '10px 12px', borderRadius: 8, background: daysLeft !== null && daysLeft < 90 ? 'rgba(239,68,68,0.08)' : 'var(--v2-surface-2)', border: '0.5px solid var(--v2-border)' }}>
            <div style={{ fontSize:11, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>PQC Readiness</div>
            <div style={{ fontSize:11, color: '#e8e0d8' }}>
              {cert.key_algorithm === 'RSA' ? 'RSA keys are vulnerable to future quantum attacks. Plan migration to ECDSA P-384 or P-256.' : 'ECDSA — better PQC posture than RSA-2048.'}
            </div>
          </div>

          {/* PEM viewer */}
          {pem ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Certificate PEM</div>
              <div style={{ position: 'relative', background:'#0d0000', borderRadius: 8, padding: '10px 12px' }}>
                <textarea readOnly value={pem} rows={6}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#86efac', fontSize:10, fontFamily: 'JetBrains Mono, monospace', resize: 'none', outline: 'none', lineHeight: 1.5 }}/>
                <button onClick={copyPem} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: 4, color: '#b0a8a0', fontSize:10, padding: '2px 8px', cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : cert.cert_pem ? (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setPem(cert.cert_pem)} style={{ fontSize:11, padding: '6px 14px', borderRadius: 6, border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)', cursor: 'pointer', color: '#ffffff', fontWeight: 500 }}>
                View PEM certificate
              </button>
            </div>
          ) : null}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Actions</div>
            {!pem && (
              <button onClick={downloadPem} disabled={loadingPem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:12, padding: '8px 14px', borderRadius: 7, border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)', cursor: loadingPem ? 'not-allowed' : 'pointer', color: '#ffffff', fontWeight: 500 }}>
                {loadingPem ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }}/> Loading PEM…</> : <><Download size={12}/> Download / View PEM</>}
              </button>
            )}
            <button
              onClick={() => window.open(`https://accounts.digicert.com/`, '_blank')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:12, padding: '8px 14px', borderRadius: 7, border: '0.5px solid var(--v2-green)', background: 'var(--v2-green-bg)', cursor: 'pointer', color: 'var(--v2-green-text)', fontWeight: 500 }}>
              <RotateCcw size={12}/> Reissue at DigiCert CertCentral ↗
            </button>
            <button
              onClick={handleRevoke} disabled={revoking}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:12, padding: '8px 14px', borderRadius: 7, border: '0.5px solid #fecaca', background: 'rgba(192,57,43,0.12)', cursor: revoking ? 'not-allowed' : 'pointer', color: '#f87171', fontWeight: 500 }}>
              {revoking ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }}/> Revoking…</> : <><Ban size={12}/> Revoke certificate</>}
            </button>
            {revokeMsg && <div style={{ fontSize:11, color: revokeMsg.includes('Error') || revokeMsg.includes('failed') ? '#f87171' : '#4ade80', padding: '6px 10px', borderRadius: 6, background: 'var(--v2-surface-2)', border: '0.5px solid var(--v2-border)' }}>{revokeMsg}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DigiCertTab({ tok, nav }) {
  const [apiKey,     setApiKey]   = useState('')
  const [draftKey,   setDraftKey] = useState('')
  const [showKey,    setShowKey]  = useState(false)
  const [saving,     setSaving]   = useState(false)
  const [error,      setError]    = useState('')
  const [portfolio,  setPf]       = useState([])
  const [loadingPf,  setLoadingPf]= useState(false)
  const [connId,     setConnId]   = useState('')

  // Search + filter
  const [search,     setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')  // all | active | expired | expiring
  const [viewMode,   setViewMode] = useState('table')      // table | timeline

  // Detail panel
  const [selected,   setSelected] = useState(null)

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action: 'list_connections' }).then(r => {
      const dc = (r.connections || []).find(c => c.ca_type === 'digicert' && c.status === 'active')
      if (dc?.id) { setConnId(dc.id); setApiKey('__connected__') }
    })
  }, [tok])

  useEffect(() => { if (connId && tok) loadPf() }, [connId, tok])

  const connect = async () => {
    if (!draftKey.trim()) { setError('API key required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action: 'save_connection', ca_type: 'digicert', label: 'DigiCert CertCentral', api_key: draftKey.trim() })
      if (r.error) { setError(r.error); setSaving(false); return }
      const cid = r.connection?.id
      if (cid) setConnId(cid)
      setApiKey(draftKey.trim())
      setDraftKey('')
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const disconnect = async () => {
    await callImport(tok, { action: 'delete_connection', ca_type: 'digicert' })
    setApiKey(''); setConnId(''); setPf([])
  }

  const loadPf = useCallback(async () => {
    if (!connId || !tok) return
    setLoadingPf(true)
    try {
      const r = await callImport(tok, { action: 'fetch_ca_certs', ca_type: 'digicert', connection_id: connId })
      if (!r.error) setPf(r.certs || [])
    } catch(e) { console.error(e) }
    setLoadingPf(false)
  }, [connId, tok])

  const doSync = async () => {
    if (!connId || !tok) return
    setLoadingPf(true)
    try {
      await callImport(tok, { action: 'sync', connection_id: connId })
      await loadPf()
    } catch(e) { console.error(e) }
    setLoadingPf(false)
  }

  // Filtered + searched portfolio
  const now = Date.now()
  const filtered = portfolio.filter(c => {
    const domain = (c.domain || '').toLowerCase()
    const product = (c.cert_type_detail || '').toLowerCase()
    const q = search.toLowerCase()
    if (q && !domain.includes(q) && !product.includes(q)) return false
    if (filterStatus === 'active' && c.status !== 'active') return false
    if (filterStatus === 'expired' && c.status !== 'expired') return false
    if (filterStatus === 'expiring') {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      if (d === null || d < 0 || d > 90) return false
    }
    return true
  })

  // Timeline buckets
  const buckets = {
    expired:  portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d < 0 }),
    critical: portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d >= 0 && d <= 7 }),
    warning:  portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d > 7 && d <= 30 }),
    upcoming: portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d > 30 && d <= 90 }),
    healthy:  portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d > 90 }),
  }

  // KPIs
  const expiring30 = portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d >= 0 && d <= 30 }).length
  const expiring90 = portfolio.filter(c => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d >= 0 && d <= 90 }).length
  const pqcRisk    = portfolio.filter(c => c.key_algorithm === 'RSA').length
  const activeCount = portfolio.filter(c => c.status === 'active').length

  if (!apiKey) return (
    <div>
      <div style={{ background: 'rgba(192,57,43,0.12)', border: '0.5px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize:13, fontWeight: 600, color: '#a93226', marginBottom: 2 }}>DigiCert CertCentral — not connected</div>
        <div style={{ fontSize:11, color: '#f87171' }}>Connect your API key to access portfolio, PQC scoring, reissue, and CT log monitoring.</div>
      </div>
      <SectionCard>
        <label className="v2-label">CertCentral API key</label>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input className="v2-input mono" type={showKey ? 'text' : 'password'}
            value={draftKey} onChange={e => setDraftKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connect()}
            placeholder="Paste your DigiCert API key…"/>
          <button onClick={() => setShowKey(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0' }}>
            {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
          </button>
        </div>
        <div className="v2-label-help" style={{ marginBottom: 12 }}>
          Get your key at <a href="https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html"
            target="_blank" rel="noreferrer" style={{ color: '#ffffff', textDecoration: 'underline' }}>
            dev.digicert.com</a>. Read-only scope is sufficient.
        </div>
        {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="v2-btn v2-btn-primary" onClick={connect} disabled={saving}>
          {saving ? <><Spinner/> Connecting…</> : 'Connect DigiCert'}
        </button>
      </SectionCard>
    </div>
  )

  return (
    <div>
      {/* Connection banner */}
      <div style={{ background: 'transparent', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 8,
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background:'#0d0000', display: 'inline-block', boxShadow: '0 0 0 3px rgba(192,57,43,0.3)' }}/>
          <div>
            <div style={{ fontSize:13, fontWeight: 600, color: '#a93226' }}>DigiCert CertCentral connected</div>
            <div style={{ fontSize:11, color: '#ffffff' }}>API key active · {portfolio.length} certs loaded</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="v2-btn v2-btn-sm" onClick={doSync} disabled={loadingPf}>
            {loadingPf ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync from DigiCert</>}
          </button>
          <button onClick={() => window.open('https://accounts.digicert.com/', '_blank')}
            style={{ fontSize:11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(192,57,43,0.3)', background: 'transparent', color: '#ffffff', cursor: 'pointer', fontWeight: 500 }}>
            Open CertCentral ↗
          </button>
          <button className="v2-btn v2-btn-sm v2-btn-danger" onClick={disconnect}>Disconnect</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:16 }}>
        <StatCard label="Total certs" val={portfolio.length} sub="in portfolio" onClick={() => setFilterStatus('all')}/>
        <StatCard label="Active" val={activeCount} sub="issued & valid" color="#c0392b" onClick={() => setFilterStatus('active')}/>
        <StatCard label="Expiring ≤ 30d" val={expiring30} sub="needs attention"
          color={expiring30>0?'#c0392b':'var(--v2-text-1)'} bg={expiring30>0?'rgba(230,126,34,0.12)':undefined}
          onClick={() => setFilterStatus('expiring')}/>
        <StatCard label="PQC risk" val={pqcRisk} sub="RSA keys flagged"
          color={pqcRisk>0?'#a93226':'var(--v2-text-1)'} bg={pqcRisk>0?'rgba(192,57,43,0.1)':undefined}/>
      </div>

      {/* Expiry timeline view */}
      {viewMode === 'timeline' && (
        <div className="v2-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize:11, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Expiry timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Expired',      certs: buckets.expired,  color: '#f87171', bg: 'rgba(192,57,43,0.12)' },
              { label: 'Critical ≤ 7d', certs: buckets.critical, color: '#f87171', bg: 'rgba(192,57,43,0.12)' },
              { label: 'Warning ≤ 30d', certs: buckets.warning,  color: '#ffffff', bg: 'rgba(239,68,68,0.08)' },
              { label: 'Upcoming ≤ 90d',certs: buckets.upcoming, color: '#ffffff', bg: 'transparent' },
              { label: 'Healthy > 90d', certs: buckets.healthy,  color: '#4ade80', bg: 'transparent' },
            ].map(({ label, certs, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 120, fontSize:11, color: '#e8e0d8', flexShrink: 0 }}>{label}</div>
                <div style={{ flex: 1, height: 28, borderRadius: 6, background: 'var(--v2-surface-2)', overflow: 'hidden', position: 'relative' }}>
                  {certs.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                      width: `${Math.max(4, (certs.length / Math.max(portfolio.length, 1)) * 100)}%`,
                      background: bg, border: `0.5px solid ${color}44`, borderRadius: 6,
                      display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                      <span style={{ fontSize:10, fontWeight: 700, color }}>{certs.length}</span>
                    </div>
                  )}
                </div>
                <div style={{ width: 30, fontSize:11, fontWeight: 600, color, textAlign: 'right' }}>{certs.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, overflowX:'auto', WebkitOverflowScrolling:'touch', marginBottom:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.08)', flexWrap:'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#b0a8a0' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search domain or product…"
              style={{ width: '100%', paddingLeft: 28, paddingRight: 10, height: 30, fontSize:12, borderRadius: 6,
                border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)', color: '#ffffff', outline: 'none' }}/>
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0', fontSize:14 }}>×</button>}
          </div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all','All'],['active','Active'],['expiring','Expiring ≤90d'],['expired','Expired']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                style={{ fontSize:11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontWeight: filterStatus === v ? 600 : 400,
                  border: `0.5px solid ${filterStatus === v ? 'var(--v2-green)' : 'var(--v2-border)'}`,
                  background: filterStatus === v ? 'var(--v2-green-bg)' : 'var(--v2-surface-2)',
                  color: filterStatus === v ? 'var(--v2-green-text)' : 'var(--v2-text-2)' }}>
                {l}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button onClick={() => setViewMode('table')} title="Table view"
              style={{ fontSize:11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                border: `0.5px solid ${viewMode === 'table' ? 'var(--v2-green)' : 'var(--v2-border)'}`,
                background: viewMode === 'table' ? 'var(--v2-green-bg)' : 'var(--v2-surface-2)',
                color: viewMode === 'table' ? 'var(--v2-green-text)' : 'var(--v2-text-2)' }}>Table</button>
            <button onClick={() => setViewMode('timeline')} title="Timeline view"
              style={{ fontSize:11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                border: `0.5px solid ${viewMode === 'timeline' ? 'var(--v2-green)' : 'var(--v2-border)'}`,
                background: viewMode === 'timeline' ? 'var(--v2-green-bg)' : 'var(--v2-surface-2)',
                color: viewMode === 'timeline' ? 'var(--v2-green-text)' : 'var(--v2-text-2)' }}>Timeline</button>
          </div>
          <div style={{ fontSize:11, color: '#b0a8a0' }}>{filtered.length} of {portfolio.length}</div>
        </div>

        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 110px 90px 170px',minWidth:600,
          padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
          {['Domain', 'Product', 'Expires', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:600, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
          ))}
        </div>

        {/* Table body */}
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {loadingPf && portfolio.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#b0a8a0', fontSize:13 }}><Spinner/> Loading portfolio…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#b0a8a0', fontSize:13 }}>
              {portfolio.length === 0 ? 'Click "Sync from DigiCert" to load your portfolio.' : 'No certificates match your search.'}
            </div>
          ) : filtered.map((c, i) => {
            const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
            const rowBg = i % 2 === 0 ? 'transparent' : 'var(--v2-surface-2)'
            return (
              <div key={c.id || i}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 110px 90px 170px', minWidth:600, gap: 8,
                  padding: '9px 16px', background: rowBg, borderBottom: '0.5px solid var(--v2-border)',
                  cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = rowBg}
                onClick={() => setSelected(c)}>
                <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  {c.domain || '—'}
                </div>
                <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.cert_type_detail || 'SSL'}
                </div>
                <div style={{ alignSelf: 'center' }}>
                  <ExpiryPill days={d}/>
                </div>
                <div style={{ alignSelf: 'center' }}>
                  <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: c.status === 'active' ? 'transparent' : 'rgba(192,57,43,0.12)',
                    color: c.status === 'active' ? '#4ade80' : '#f87171',
                    border: `0.5px solid ${c.status === 'active' ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}` }}>
                    {c.status === 'active' ? 'Active' : c.status === 'expired' ? 'Expired' : c.status || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignSelf: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { sessionStorage.setItem('prefill_domain', c.domain || ''); nav && nav('/buy') }}
                    style={{ fontSize:10, padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--v2-green)', background: 'var(--v2-green-bg)', color: 'var(--v2-green-text)', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    ↻ SSLVault
                  </button>
                  <button onClick={() => window.open('https://accounts.digicert.com/', '_blank')}
                    style={{ fontSize:10, padding: '3px 8px', borderRadius: 5, border: '0.5px solid rgba(192,57,43,0.3)', background: 'transparent', color: '#ffffff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    DC ↗
                  </button>
                  <button onClick={() => setSelected(c)}
                    style={{ fontSize:10, padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)', color: '#e8e0d8', cursor: 'pointer', fontWeight: 500 }}>
                    Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail slide-over panel */}
      {selected && (
        <CertDetailPanel
          cert={selected}
          tok={tok}
          connId={connId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 4 — SECTIGO
// ══════════════════════════════════════════════════════════════════════
function SectigoTab({ tok }) {
  const [creds,    setCreds]    = useState(null)
  const [draft,    setDraft]    = useState({ uri: '', login: '', pass: '' })
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!tok) return
    callImport(tok, { action: 'list_connections' }).then(r => {
      const sc = (r.connections || []).find(c => c.ca_type === 'sectigo' && c.status === 'active')
      if (sc?.customer_uri && sc?.login && sc?.password)
        setCreds({ customer_uri: sc.customer_uri, login: sc.login, password: sc.password })
    })
  }, [tok])

  const connect = async () => {
    if (!draft.uri || !draft.login || !draft.pass) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      const r = await callImport(tok, { action: 'save_connection', ca_type: 'sectigo', label: 'Sectigo SCM',
        customer_uri: draft.uri, login: draft.login, password: draft.pass })
      if (r.error) { setError(r.error); setSaving(false); return }
      setCreds({ customer_uri: draft.uri, login: draft.login, password: draft.pass })
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  const [inventory, setInventory] = useState([])
  const [syncing,   setSyncing]   = useState(false)
  const [syncError, setSyncError] = useState('')

  const disconnect = () => {
    callImport(tok, { action: 'delete_connection', ca_type: 'sectigo' })
    setCreds(null); setInventory([])
  }

  const syncInventory = async () => {
    setSyncing(true); setSyncError('')
    try {
      const r = await callCA(tok, { action: 'sectigo_proxy', path: '/certificates', method: 'GET', creds })
      if (r.error) { setSyncError(r.error); setSyncing(false); return }
      setInventory(r.result || r.certs || r.certificates || [])
    } catch (e) { setSyncError(String(e)) }
    setSyncing(false)
  }

  if (!creds) return (
    <div>
      <div style={{ background: 'rgba(30,0,0,0.4)', border: '0.5px solid #e9d5ff', borderRadius: 8,
        padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize:13, fontWeight: 600, color: '#a93226', marginBottom: 2 }}>Sectigo SCM — not connected</div>
        <div style={{ fontSize:11, color: '#ffffff' }}>Connect your SCM credentials to access inventory, org status, and portfolio analytics.</div>
      </div>
      <SectionCard>
        {[
          { label: 'Customer URI', key: 'uri',   placeholder: 'https://cert-manager.com', type: 'text' },
          { label: 'Login',        key: 'login', placeholder: 'your@email.com',           type: 'text' },
          { label: 'Password',     key: 'pass',  placeholder: '••••••••',                 type: showPass ? 'text' : 'password' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label className="v2-label">{label}</label>
            <div style={{ position: 'relative' }}>
              <input className="v2-input" type={type} placeholder={placeholder}
                value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}/>
              {key === 'pass' && (
                <button onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0' }}>
                  {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              )}
            </div>
          </div>
        ))}
        {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="v2-btn v2-btn-primary" onClick={connect} disabled={saving}>
          {saving ? <><Spinner/> Connecting…</> : 'Connect Sectigo'}
        </button>
      </SectionCard>
    </div>
  )

  return (
    <div>
      <div style={{ background: 'rgba(30,0,0,0.4)', border: '0.5px solid #e9d5ff', borderRadius: 8,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight: 600, color: '#a93226' }}>Sectigo SCM connected</div>
          <div style={{ fontSize:11, color: '#9333ea', marginTop: 2 }}>{creds.customer_uri}</div>
        </div>
        <button className="v2-btn v2-btn-sm v2-btn-danger" onClick={disconnect}>Disconnect</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Cert inventory',  val: '—', sub: 'fetch to see',   c: 'var(--v2-text)' },
          { label: 'Expiring ≤ 30d',  val: '—', sub: 'needs attention', c: 'var(--v2-text)' },
          { label: 'Organisations',   val: '—', sub: 'fetch to see',   c: 'var(--v2-text)' },
        ].map(({ label, val, sub, c }) => (
          <div key={label} className="v2-stat">
            <div className="v2-stat-label">{label}</div>
            <div className="v2-stat-value" style={{ color: c }}>{val}</div>
            <div className="v2-stat-delta">{sub}</div>
          </div>
        ))}
      </div>

      {/* Sectigo live inventory */}
      <div className="v2-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'var(--v2-surface-2)' }}>
          <span style={{ fontSize:11, fontWeight: 700, color: '#b0a8a0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Certificate inventory
          </span>
          <button className="v2-btn v2-btn-sm" onClick={syncInventory} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {syncing ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync from Sectigo</>}
          </button>
        </div>
        {syncError && <div className="v2-alert v2-alert-error" style={{ margin: 12 }}>{syncError}</div>}
        {inventory.length === 0 ? (
          <div style={{ padding:'min(40px,5vw) min(24px,4vw)', textAlign: 'center' }}>
            <div style={{ fontSize:13, fontWeight: 500, color: '#ffffff', marginBottom: 6 }}>Sectigo SCM connected</div>
            <div style={{ fontSize:12, color: '#b0a8a0' }}>Click "Sync from Sectigo" to load your certificate inventory.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', minWidth:480,
              padding: '8px 16px', background: 'var(--v2-surface-2)', borderBottom: '0.5px solid var(--v2-border)' }}>
              {['Domain', 'Type', 'Expires', 'Status'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
              ))}
            </div>
            <div className="v2-list-scroll">
              {inventory.map((c, i) => {
                const expiry = c.expires || c.notAfter
                const d = dLeft(expiry)
                const s = d === null ? 'grey' : d <= 0 ? 'red' : d <= 30 ? 'amber' : 'green'
                return (
                  <div key={i} className={'v2-list-row status-' + s}
style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', minWidth:480, padding: '10px 16px', cursor: 'default' }}>
                    <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace', color: '#ffffff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                      {c.commonName || c.cn || '—'}
                    </div>
                    <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center' }}>{c.type || c.certType || 'SSL'}</div>
                    <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center' }}>{fmt(expiry)}</div>
                    <div style={{ alignSelf: 'center' }}><ExpiryBadge iso={expiry}/></div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════
// TAB 5 — SHADOW IT SCANNER
// ══════════════════════════════════════════════════════════════════════
const URGENCY_MAP = {
  expired:  { label: 'Expired',  color: '#f87171', bg: 'rgba(192,57,43,0.12)' },
  critical: { label: 'Critical', color: '#f87171', bg: 'rgba(192,57,43,0.12)' },
  warning:  { label: 'Warning',  color: '#ffffff', bg: 'rgba(239,68,68,0.08)' },
  upcoming: { label: 'Upcoming', color: '#ffffff', bg: 'transparent' },
  healthy:  { label: 'Healthy',  color: '#4ade80', bg: 'transparent' },
  unknown:  { label: 'Unknown',  color: '#e8e0d8', bg: '#000000' },
}

function ShadowITTab({ tok, nav }) {
  const [conns,        setConns]        = useState([])
  const [selectedConn, setSelectedConn] = useState(null)
  const [scanning,     setScanning]     = useState(false)
  const [result,       setResult]       = useState(null)
  const [shadows,      setShadows]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [dismissing,   setDismissing]   = useState(null)

  const loadShadows = useCallback(async () => {
    setLoading(true)
    const r = await callCA(tok, { action: 'get_shadow_certs' })
    if (r.ok) setShadows(r.shadows || [])
    setLoading(false)
  }, [tok])

  useEffect(() => {
    if (!tok) return
    supabase.from('ca_connections').select('id,ca_name,ca_type,label,status')
      .then(({ data }) => {
        const dc = (data || []).filter(c => c.ca_type === 'digicert' && c.status === 'active')
        setConns(dc)
        if (dc.length === 1) setSelectedConn(dc[0].id)
      })
    loadShadows()
  }, [tok, loadShadows])

  const doScan = async () => {
    if (!selectedConn) return
    setScanning(true); setResult(null)
    const r = await callCA(tok, { action: 'shadow_scan', connection_id: selectedConn })
    setResult(r)
    setScanning(false)
    if (r.ok) await loadShadows()
  }

  const dismiss = async (id) => {
    setDismissing(id)
    await callCA(tok, { action: 'dismiss_shadow', shadow_id: id })
    setShadows(s => s.filter(x => x.id !== id))
    setDismissing(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0705914',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Search size={17} strokeWidth={2} color="#e07060"/>
        </div>
        <div>
          <h2 style={{ fontSize:16, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.2px' }}>
            Shadow IT Scanner
          </h2>
          <p style={{ fontSize:12, color: '#b0a8a0', margin: '3px 0 0', lineHeight: 1.5 }}>
            Compares your DigiCert portfolio against SSLVault inventory. Finds certs issued outside your CLM — compliance risk, expiry blindspot.
          </p>
        </div>
      </div>

      {/* Scan panel */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div className="v2-section-label" style={{ marginBottom: 12 }}>Run shadow scan</div>
        {conns.length === 0 ? (
          <div style={{ fontSize:13, color: '#b0a8a0' }}>
            No active DigiCert connections found.{' '}
            <button onClick={() => nav('/integrations')} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--v2-green)', fontSize:13, padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>
              Connect DigiCert in Integrations →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {conns.length > 1 && (
              <select value={selectedConn || ''} onChange={e => setSelectedConn(e.target.value)}
                className="v2-select" style={{ fontSize:12 }}>
                <option value="">Select connection…</option>
                {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
              </select>
            )}
            {conns.length === 1 && (
              <div style={{ fontSize:12, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }}/>
                {conns[0].label || conns[0].ca_name}
              </div>
            )}
            <button className="v2-btn" onClick={doScan} disabled={scanning || !selectedConn}
              style={{ background: scanning || !selectedConn ? undefined : '#f0ede8',
                color: scanning || !selectedConn ? undefined : '#000000',
                borderColor: scanning || !selectedConn ? undefined : '#f0ede8',
                display: 'flex', alignItems: 'center', gap: 6 }}>
              {scanning ? <><Spinner/> Scanning DigiCert…</> : <><Search size={12}/> Run Shadow Scan</>}
            </button>
            <span style={{ fontSize:11, color: '#b0a8a0' }}>
              Compares your entire DigiCert order history vs SSLVault DB
            </span>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? 'transparent' : 'rgba(192,57,43,0.12)',
            border: `0.5px solid ${result.ok ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}` }}>
            {result.ok ? (
              <div style={{ display: 'flex', gap: 20, fontSize:12, color: '#5edb8a', flexWrap: 'wrap' }}>
                <span><strong>{result.total_in_ca}</strong> total in DigiCert</span>
                <span><strong>{result.total_in_sslvault}</strong> in SSLVault</span>
                <span style={{ fontWeight: 700, color: result.shadow_count > 0 ? '#f87171' : '#4ade80' }}>
                  <strong>{result.shadow_count}</strong> shadow certs found
                </span>
              </div>
            ) : (
              <span style={{ fontSize:12, color: '#f87171' }}>{result.error}</span>
            )}
          </div>
        )}
      </SectionCard>

      {/* Shadow cert table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize:13, fontWeight: 600, color: '#ffffff' }}>
          Shadow certificates
          {!loading && <span style={{ fontSize:11, color: '#b0a8a0', marginLeft: 6,
            background: shadows.length > 0 ? 'rgba(192,57,43,0.12)' : 'var(--v2-hover)',
            color: shadows.length > 0 ? '#f87171' : 'var(--v2-text-3)',
            padding: '1px 7px', borderRadius: 20, border: shadows.length > 0 ? '0.5px solid #fecaca' : '0.5px solid var(--v2-border)' }}>
            {shadows.length}
          </span>}
        </div>
        <button className="v2-btn v2-btn-sm" onClick={loadShadows} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={11} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:10, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px',minWidth:700,
          padding:'8px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
          {['Domain', 'Product', 'Ordered by', 'Expires', 'Urgency', ''].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:600, color:'#b0a8a0',
              textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#b0a8a0', fontSize:13 }}>
            <Spinner/><span style={{ marginLeft: 8 }}>Loading shadow findings…</span>
          </div>
        ) : shadows.length === 0 ? (
          <div style={{ padding:'min(40px,5vw) min(24px,4vw)', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--v2-surface-3)',
              border: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={20} color="var(--v2-text-3)"/>
            </div>
            <div style={{ fontSize:13, fontWeight: 500, color: '#ffffff', marginBottom: 4 }}>
              {result?.ok ? 'No shadow certs found — portfolio is fully accounted for.' : 'Run a scan to find shadow certificates.'}
            </div>
            <div style={{ fontSize:12, color: '#b0a8a0' }}>
              {result?.ok ? 'Your DigiCert portfolio matches SSLVault exactly.' : 'Connect DigiCert and run a shadow scan above.'}
            </div>
          </div>
        ) : shadows.map((s, i) => {
          const u = URGENCY_MAP[s.urgency] || URGENCY_MAP.unknown
          return (
            <div key={s.id} className={`v2-list-row status-${s.urgency === 'expired' || s.urgency === 'critical' ? 'red' : s.urgency === 'warning' ? 'amber' : 'green'}`}
style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', minWidth:700, minWidth:700, padding: '10px 16px',
                borderBottom: i < shadows.length - 1 ? '0.5px solid var(--v2-border)' : 'none', cursor: 'default' }}>
              <div>
                <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace',
                  color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.domain}
                </div>
                {s.org_name && <div style={{ fontSize:10, color: '#b0a8a0', marginTop: 2 }}>{s.org_name}</div>}
              </div>
              <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center' }}>{s.product || '—'}</div>
              <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ordered_by || '—'}</div>
              <div style={{ fontSize:11, color: '#e8e0d8', alignSelf: 'center' }}>{fmt(s.expires_at)}</div>
              <div style={{ alignSelf: 'center' }}>
                <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: u.bg, color: u.color, border: `0.5px solid ${u.color}44` }}>{u.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignSelf: 'center' }}>
                <button className="v2-btn v2-btn-sm"
                  onClick={() => { sessionStorage.setItem('prefill_domain', s.domain); nav('/buy') }}
                  style={{ fontSize:10, padding: '3px 8px' }}>
                  Import
                </button>
                <button className="v2-btn v2-btn-sm v2-btn-danger"
                  onClick={() => dismiss(s.id)} disabled={dismissing === s.id}
                  style={{ fontSize:10, padding: '3px 8px' }}>
                  {dismissing === s.id ? <Spinner/> : 'Dismiss'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB 6 — CONSOLIDATION ADVISOR
// ══════════════════════════════════════════════════════════════════════
const CA_COLORS_HUB = {
  digicert: '#f87171', sectigo: '#f0ede8', sslcom: '#f0ede8',
  rapidssl: '#4ade80', imported: 'rgba(240,237,232,0.7)', unknown: 'rgba(240,237,232,0.38)'
}

function ConsolidationTab({ tok, nav }) {
  const [opps,       setOpps]     = useState([])
  const [totalSaving, setTS]      = useState(0)
  const [loading,    setLoading]  = useState(true)
  const [running,    setRunning]  = useState(false)
  const [result,     setResult]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await callCA(tok, { action: 'get_opportunities' })
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) load() }, [tok, load])

  const runAnalysis = async () => {
    setRunning(true); setResult(null)
    const r = await callCA(tok, { action: 'consolidation_report' })
    setResult(r); setRunning(false)
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
  }

  const dismiss = (idx) => setOpps(prev => prev.filter((_, i) => i !== idx))

  const consolidation = opps.filter(o => o.type === 'ca_consolidation')
  const duplicates    = opps.filter(o => o.type === 'duplicate')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#16a34a14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <DollarSign size={17} strokeWidth={2} color="#16a34a"/>
        </div>
        <div>
          <h2 style={{ fontSize:16, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.2px' }}>
            Consolidation Advisor
          </h2>
          <p style={{ fontSize:12, color: '#b0a8a0', margin: '3px 0 0', lineHeight: 1.5 }}>
            Finds DV certificates at premium CAs that can be moved to RapidSSL to cut costs. Surfaces duplicate domains across CAs.
          </p>
        </div>
      </div>

      {/* Run analysis */}
      <SectionCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="v2-section-label" style={{ marginBottom: 4 }}>Cost analysis</div>
            <div style={{ fontSize:12, color: '#b0a8a0' }}>
              Analyses your cross-CA portfolio for consolidation opportunities and duplicate certs.
            </div>
          </div>
          <button className="v2-btn" onClick={runAnalysis} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: running ? undefined : '#4ade80', color: running ? undefined : '#000000',
              borderColor: running ? undefined : '#4ade80' }}>
            {running ? <><Spinner/> Analysing…</> : <><DollarSign size={12}/> Run Analysis</>}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? 'transparent' : 'rgba(192,57,43,0.12)',
            border: `0.5px solid ${result.ok ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}` }}>
            {result.ok ? (
              <div style={{ fontSize:12, color: '#5edb8a' }}>
                Found <strong>{result.opportunities?.length || 0}</strong> opportunities ·{' '}
                <strong>${(result.total_saving_usd || 0).toFixed(0)}</strong>/yr potential savings
              </div>
            ) : (
              <span style={{ fontSize:12, color: '#f87171' }}>{result.error || 'Analysis failed'}</span>
            )}
          </div>
        )}
      </SectionCard>

      {/* Savings summary */}
      {totalSaving > 0 && (
        <div style={{ background: 'transparent', border: '0.5px solid rgba(192,57,43,0.3)', borderRadius: 10,
          padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(39,174,96,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} color="#16a34a"/>
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight: 700, color: '#5edb8a', letterSpacing: '-0.3px' }}>
              ${totalSaving.toFixed(0)}<span style={{ fontSize:13, fontWeight: 500, marginLeft: 4 }}>/yr</span>
            </div>
            <div style={{ fontSize:12, color: '#4ade80', marginTop: 2 }}>
              potential annual savings by consolidating to RapidSSL
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#b0a8a0', fontSize:13 }}>
          <Spinner/><span style={{ marginLeft: 8 }}>Loading opportunities…</span>
        </div>
      ) : opps.length === 0 ? (
        <div className="v2-card" style={{ padding:'min(40px,5vw) min(24px,4vw)', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--v2-surface-3)',
            border: '0.5px solid var(--v2-border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px' }}>
            <Check size={20} color="var(--v2-text-3)"/>
          </div>
          <div style={{ fontSize:13, fontWeight: 500, color: '#ffffff', marginBottom: 4 }}>
            {result?.ok ? 'Portfolio already optimally consolidated.' : 'Run analysis to find cost-saving opportunities.'}
          </div>
          <div style={{ fontSize:12, color: '#b0a8a0' }}>
            {result?.ok ? 'No cheaper alternatives found for your current certificates.' : 'Click "Run Analysis" above to scan your cross-CA portfolio.'}
          </div>
        </div>
      ) : (
        <>
          {/* CA Consolidation table */}
          {consolidation.length > 0 && (
            <>
              <div style={{ fontSize:13, fontWeight: 600, color: '#ffffff', marginBottom: 10 }}>
                CA Consolidation — move DV certs to RapidSSL
                <span style={{ fontSize:11, fontWeight: 500, color: '#b0a8a0', marginLeft: 8 }}>
                  {consolidation.length} opportunity{consolidation.length !== 1 ? 'ies' : 'y'}
                </span>
              </div>
              <div className="v2-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', minWidth:660,
                  padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)',
                  background: 'var(--v2-surface-2)' }}>
                  {['Domain', 'Current CA', 'Product', 'Expires', 'Saving/yr', ''].map(h => (
                    <div key={h} style={{ fontSize:10, fontWeight: 700, color: '#b0a8a0',
                      textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
                  ))}
                </div>
                {consolidation.map((opp, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', minWidth:660,
                    padding: '11px 16px', alignItems: 'center',
                    borderBottom: i < consolidation.length - 1 ? '0.5px solid var(--v2-border)' : 'none',
                    transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace',
                        color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opp.domain}
                      </div>
                      <div style={{ fontSize:10, color: '#b0a8a0', marginTop: 2 }}>{opp.reason}</div>
                    </div>
                    <div>
                      <span style={{ fontSize:10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: (CA_COLORS_HUB[opp.current_ca] || 'rgba(240,237,232,0.7)') + '18',
                        color: CA_COLORS_HUB[opp.current_ca] || 'rgba(240,237,232,0.7)',
                        border: `0.5px solid ${CA_COLORS_HUB[opp.current_ca] || 'rgba(240,237,232,0.7)'}44` }}>
                        {opp.current_ca}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color: '#e8e0d8' }}>{opp.current_product || '—'}</div>
                    <div style={{ fontSize:11, color: '#e8e0d8' }}>{fmt(opp.expires_at)}</div>
                    <div style={{ fontSize:14, fontWeight: 700, color: '#4ade80' }}>
                      ${(opp.estimated_saving_usd || 0).toFixed(0)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="v2-btn v2-btn-sm"
                        onClick={() => { sessionStorage.setItem('prefill_domain', opp.domain); nav('/buy') }}
                        style={{ fontSize:10, padding: '3px 8px', background: 'transparent',
                          color: '#4ade80', borderColor: 'rgba(192,57,43,0.3)',
                          display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={9}/> Migrate
                      </button>
                      <button className="v2-btn v2-btn-sm" onClick={() => dismiss(opps.indexOf(opp))}
                        style={{ fontSize:10, padding: '3px 7px' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <>
              <div style={{ fontSize:13, fontWeight: 600, color: '#ffffff', marginBottom: 10 }}>
                Duplicate domains across CAs
              </div>
              <div className="v2-card">
                {duplicates.map((opp, i) => (
                  <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < duplicates.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                    <AlertTriangle size={14} color="#e07060" style={{ flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace',
                        color: '#ffffff' }}>{opp.domain}</span>
                      <span style={{ fontSize:11, color: '#b0a8a0', marginLeft: 8 }}>{opp.reason}</span>
                    </div>
                    <button className="v2-btn v2-btn-sm" onClick={() => dismiss(opps.indexOf(opp))}>Dismiss</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Hub shell
// ══════════════════════════════════════════════════════════════════════
export default function CAIntelligenceHub({ nav }) {
  const [tok,  setTok]  = useState('')
  const [tab,  setTab]  = useState('overview')
  const [live, setLive] = useState({ total:0, exp30:0, caCount:1, exposure:0, rapidCount:0, dcConn:false, scConn:false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) return
      setTok(session.access_token)
      Promise.all([
        supabase.from('ssl_orders').select('id,valid_till,status').eq('status','active'),
        supabase.from('ca_connections').select('ca_type,status').eq('status','active'),
        callCA(session.access_token, { action:'get_shadow_certs' }),
      ]).then(([orders, conns, shadows]) => {
        const now  = Date.now()
        const ords = orders.data || []
        const cs   = conns.data  || []
        const shad = (shadows.shadows || [])
        const exp30 = ords.filter(o => {
          const d = o.valid_till ? Math.ceil((new Date(o.valid_till)-now)/86400000) : null
          return d!==null && d>0 && d<=30
        }).length
        const dc = cs.some(c=>c.ca_type==='digicert')
        const sc = cs.some(c=>c.ca_type==='sectigo')
        setLive({ total:ords.length, exp30, caCount:1+(dc?1:0)+(sc?1:0), exposure:shad.length, rapidCount:ords.length, dcConn:dc, scConn:sc })
      }).catch(()=>{})
    })
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e,s)=>{ setTok(s?.access_token||'') })
    return () => subscription.unsubscribe()
  }, [])

  const TABS = [
    { id:'overview',      label:'Overview',       icon: BarChart2,   color:'#c0392b',  bg:'rgba(192,57,43,0.18)',  count:null },
    { id:'rapidssl',      label:'RapidSSL',       icon: Shield,      color:'#4ade80',  bg:'rgba(74,222,128,0.15)', count:live.rapidCount, dot:'#4ade80' },
    { id:'digicert',      label:'DigiCert',       icon: Building,    color:'#ff8c7a',  bg:'rgba(192,57,43,0.15)',  count:null, dot:live.dcConn?'#4ade80':'#555' },
    { id:'sectigo',       label:'Sectigo',        icon: Lock,        color:'#818cf8',  bg:'rgba(129,140,248,0.15)',count:null, dot:live.scConn?'#4ade80':'#555' },
    { id:'shadow',        label:'Exposure',       icon: Search,      color:'#f87171',  bg:'rgba(248,113,113,0.15)',count:live.exposure>0?live.exposure:null },
    { id:'consolidation', label:'Cost advisor',   icon: TrendingUp,  color:'#fbbf24',  bg:'rgba(251,191,36,0.15)', count:null },
  ]

  const active = TABS.find(t=>t.id===tab)

  return (
    <div className="v2-page">
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes capulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(2.8);opacity:0}}
        .pki-tab{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;background:none;border:none;border-radius:8px 8px 0 0;transition:all .18s;color:#b0a8a0;border-bottom:2.5px solid transparent;white-space:nowrap}
        .pki-tab:hover{color:#fff;background:rgba(255,255,255,0.05)}
        .pki-tab.on{font-weight:700;border-bottom-color:var(--tc);color:var(--tc);background:var(--tb)}
        .pki-count{font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:rgba(255,255,255,0.08);transition:all .18s}
        .pki-tab.on .pki-count{background:var(--tb);color:var(--tc)}
      `}</style>

      <div className="v2-container" style={{ maxWidth:1100, paddingTop:8, paddingBottom:60 }}>

        {/* ── Page header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#c0392b', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <div style={{ position:'absolute', inset:-3, borderRadius:13, border:'1px solid rgba(192,57,43,0.35)' }}/>
              <Activity size={19} color="white"/>
            </div>
            <div>
              <h1 className="v2-h1" style={{ fontSize:20, marginBottom:2 }}>PKI Intelligence</h1>
              <p style={{ fontSize:11, color:'#b0a8a0', margin:0 }}>Unified visibility across {live.caCount} of 3 CAs · {live.total} certificates tracked</p>
            </div>
          </div>

          {/* Live health pill */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {live.exp30 > 0 ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'#fbbf24', background:'rgba(251,191,36,0.1)', border:'0.5px solid rgba(251,191,36,0.35)', borderRadius:20, padding:'5px 12px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24' }}/>
                {live.exp30} expiring soon
              </span>
            ) : (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'#4ade80', background:'rgba(74,222,128,0.08)', border:'0.5px solid rgba(74,222,128,0.3)', borderRadius:20, padding:'5px 12px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80' }}/>
                All certs healthy
              </span>
            )}
          </div>
        </div>

        {/* ── Coloured pill tab bar ── */}
        <div style={{ display:'flex', gap:2, borderBottom:'0.5px solid rgba(255,255,255,0.08)', marginBottom:24, overflowX:'auto' }}>
          {TABS.map(t => {
            const on = tab === t.id
            return (
              <button key={t.id} className={'pki-tab'+(on?' on':'')}
                style={{ '--tc':t.color, '--tb':t.bg }}
                onClick={() => setTab(t.id)}>
                <t.icon size={12}/>
                {t.label}
                {t.dot && (
                  <span style={{ position:'relative', width:7, height:7 }}>
                    {t.dot==='#4ade80' && <span style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'rgba(74,222,128,0.35)', animation:'capulse 2.5s ease infinite'}}/>}
                    <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:t.dot }}/>
                  </span>
                )}
                {t.count != null && <span className="pki-count">{t.count}</span>}
              </button>
            )
          })}
        </div>

        {/* ── Content ── */}
        {!tok ? (
          <div style={{ textAlign:'center', padding:60, color:'#b0a8a0', fontSize:13 }}>
            <Spinner/><span style={{ marginLeft:8 }}>Loading session…</span>
          </div>
        ) : (
          <>
            {tab==='overview'      && <OverviewTab      tok={tok} nav={nav} onSwitchCA={setTab}/>}
            {tab==='rapidssl'      && <RapidSSLTab      tok={tok} nav={nav}/>}
            {tab==='digicert'      && <DigiCertTab      tok={tok} nav={nav}/>}
            {tab==='sectigo'       && <SectigoTab       tok={tok}/>}
            {tab==='shadow'        && <ShadowITTab      tok={tok} nav={nav}/>}
            {tab==='consolidation' && <ConsolidationTab tok={tok} nav={nav}/>}
          </>
        )}
      </div>
    </div>
  )
}