// CAIntelligenceHub.jsx — v2 rewrite
// Dynamic CA management: health cards, unified inventory, policy engine, shadow IT controls
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, Shield, RefreshCw, ChevronRight, AlertTriangle,
  Check, X, Eye, EyeOff, Search, Download, RotateCcw,
  Globe, Lock, Zap, CheckCircle, XCircle, Clock, Activity,
  Filter, Plus, Trash2, Settings, AlertCircle, ArrowRight,
  FileText, Ban, Building, BarChart2
} from 'lucide-react'
import '../styles/design-v2.css'

const SB = 'https://frthcwkntciaakqsppss.supabase.co'

// ── API helpers ───────────────────────────────────────────────────────
async function api(fn, tok, body) {
  const r = await fetch(`${SB}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

const callCA     = (tok, body) => api('ca-intelligence', tok, body)
const callImport = (tok, body) => api('ca-import',       tok, body)

// ── Helpers ───────────────────────────────────────────────────────────
const fmt    = iso => iso ? new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'
const fmtAgo = iso => {
  if (!iso) return '—'
  const s = Math.floor((Date.now()-new Date(iso))/1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400)return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
const dLeft  = iso => iso ? Math.ceil((new Date(iso)-Date.now())/86400000) : null

function expiryColor(d) {
  if (d===null) return '#94a3b8'
  if (d<=0)   return '#dc2626'
  if (d<=7)   return '#ea580c'
  if (d<=30)  return '#d97706'
  if (d<=60)  return '#ca8a04'
  return '#16a34a'
}

function ExpiryBadge({ iso }) {
  const d = dLeft(iso)
  const c = expiryColor(d)
  const bg = d===null?'#f8fafc':d<=0?'#fef2f2':d<=30?'#fffbeb':'#f0fdf4'
  const label = d===null?'—':d<=0?'Expired':`${d}d`
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
      background:bg, color:c, border:`0.5px solid ${c}33` }}>{label}</span>
  )
}

function Spinner() {
  return <RefreshCw size={12} style={{ animation:'spin .8s linear infinite', verticalAlign:'-2px' }}/>
}

// ── CA health card ────────────────────────────────────────────────────
function CAHealthCard({ ca, certCount, onClick, syncing, onSync, onDisconnect }) {
  const CA_META = {
    gogetssl: { name:'GoGetSSL',      color:'#10b981', bg:'#ecfdf5', border:'#a7f3d0', logo:'GGS'  },
    digicert: { name:'DigiCert',      color:'#dc2626', bg:'#fef2f2', border:'#fecaca', logo:'DC'   },
    sectigo:  { name:'Sectigo',       color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff', logo:'SC'   },
    acme:     { name:"Let's Encrypt", color:'#0ea5e9', bg:'#eff6ff', border:'#bfdbfe', logo:'LE'   },
  }
  const m = CA_META[ca.ca_type] || CA_META.acme
  const isConnected = ca.status === 'active'

  return (
    <div onClick={onClick} style={{
      border:`1px solid ${isConnected ? m.border : 'var(--v2-border)'}`,
      borderRadius:12, overflow:'hidden', cursor:'pointer',
      transition:'all .15s', background:'var(--v2-surface)',
      boxShadow: isConnected ? `0 2px 12px ${m.color}18` : 'none',
    }}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
      onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>

      {/* Top accent bar */}
      <div style={{ height:3, background: isConnected ? m.color : 'var(--v2-border)' }}/>

      <div style={{ padding:'14px 16px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:isConnected?m.bg:'var(--v2-surface-3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:isConnected?m.color:'var(--v2-text-3)',
              border:`0.5px solid ${isConnected?m.border:'var(--v2-border)'}`,
              fontFamily:'monospace', flexShrink:0 }}>
              {m.logo}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{m.name}</div>
              <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
                {ca.label || ca.ca_type}
              </div>
            </div>
          </div>
          {/* Status pill */}
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:8, flexShrink:0,
            background:isConnected?m.bg:'var(--v2-surface-3)',
            color:isConnected?m.color:'var(--v2-text-3)',
            border:`0.5px solid ${isConnected?m.border:'var(--v2-border)'}` }}>
            {isConnected ? '● ACTIVE' : '○ INACTIVE'}
          </span>
        </div>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
          <div style={{ background:'var(--v2-surface-3)', borderRadius:7, padding:'7px 10px' }}>
            <div style={{ fontSize:9, color:'var(--v2-text-3)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.3px' }}>Certs</div>
            <div style={{ fontSize:16, fontWeight:600, color:isConnected?m.color:'var(--v2-text-3)', fontFamily:'monospace' }}>
              {certCount ?? '—'}
            </div>
          </div>
          <div style={{ background:'var(--v2-surface-3)', borderRadius:7, padding:'7px 10px' }}>
            <div style={{ fontSize:9, color:'var(--v2-text-3)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.3px' }}>Last sync</div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--v2-text-2)' }}>
              {fmtAgo(ca.last_sync_at || ca.last_used_at || ca.updated_at)}
            </div>
          </div>
        </div>

        {/* Error message */}
        {ca.error_message && (
          <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:6,
            padding:'6px 9px', fontSize:10, color:'#b91c1c', marginBottom:10 }}>
            <AlertTriangle size={10} style={{ verticalAlign:'-1px', marginRight:4 }}/>
            {ca.error_message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
          {isConnected && (
            <button className="v2-btn v2-btn-sm" onClick={onSync} disabled={syncing}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11 }}>
              {syncing ? <><Spinner/> Syncing…</> : <><RefreshCw size={10}/> Sync now</>}
            </button>
          )}
          <button onClick={onClick}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              padding:'5px 10px', fontSize:11, fontWeight:500, borderRadius:6, cursor:'pointer',
              background:isConnected?m.bg:'var(--v2-surface-3)',
              color:isConnected?m.color:'var(--v2-text-2)',
              border:`0.5px solid ${isConnected?m.border:'var(--v2-border)'}`,
              fontFamily:'inherit' }}>
            {isConnected ? <><Settings size={10}/> Manage</> : <><Plus size={10}/> Connect</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Unified Inventory Table ───────────────────────────────────────────
function UnifiedInventory({ certs, shadowCerts, loading, onRefresh, onShadowAction }) {
  const [search,  setSearch]  = useState('')
  const [caFilter, setCaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy]   = useState('expiry')
  const [selected, setSelected] = useState(new Set())

  const allCerts = useMemo(() => {
    const native = certs.map(c => ({
      id: c.id, domain: c.domain, ca: c.issuer || 'GoGetSSL',
      ca_type: 'native', expires_at: c.expires_at,
      status: c.status, product: c.cert_type || 'DV SSL',
      auto_renew: c.auto_renew_enabled, source: 'vault',
    }))
    const shadow = shadowCerts.filter(s => s.status !== 'dismissed').map(s => ({
      id: s.id, domain: s.domain, ca: s.current_ca || s.ca_type,
      ca_type: s.ca_type, expires_at: s.expires_at,
      status: s.status || 'unknown', product: s.current_product || '—',
      auto_renew: false, source: 'shadow',
    }))
    return [...native, ...shadow]
  }, [certs, shadowCerts])

  const filtered = useMemo(() => {
    return allCerts
      .filter(c => {
        if (search && !c.domain?.toLowerCase().includes(search.toLowerCase())) return false
        if (caFilter !== 'all' && c.ca_type !== caFilter) return false
        if (statusFilter === 'expiring') {
          const d = dLeft(c.expires_at)
          return d !== null && d >= 0 && d <= 30
        }
        if (statusFilter === 'expired') {
          const d = dLeft(c.expires_at)
          return d !== null && d <= 0
        }
        if (statusFilter === 'shadow') return c.source === 'shadow'
        if (statusFilter !== 'all' && c.status !== statusFilter) return false
        return true
      })
      .sort((a,b) => {
        if (sortBy === 'expiry') {
          const da = dLeft(a.expires_at) ?? 9999
          const db = dLeft(b.expires_at) ?? 9999
          return da - db
        }
        if (sortBy === 'domain') return (a.domain||'').localeCompare(b.domain||'')
        return 0
      })
  }, [allCerts, search, caFilter, statusFilter, sortBy])

  const expiringSoon = allCerts.filter(c => { const d=dLeft(c.expires_at); return d!==null&&d>=0&&d<=30 }).length
  const shadowCount  = allCerts.filter(c => c.source==='shadow').length

  const exportCSV = () => {
    const rows = [['Domain','CA','Product','Expires','Days left','Auto-renew','Source']]
    filtered.forEach(c => rows.push([
      c.domain, c.ca, c.product, fmt(c.expires_at),
      dLeft(c.expires_at)??'', c.auto_renew?'Yes':'No', c.source
    ]))
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `ca-inventory-${Date.now()}.csv`; a.click()
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'Total certs',   val:allCerts.length,      color:'var(--v2-text)' },
          { label:'Expiring ≤30d', val:expiringSoon,         color:expiringSoon>0?'#d97706':'#16a34a' },
          { label:'Shadow IT',     val:shadowCount,          color:shadowCount>0?'#7c3aed':'var(--v2-text-3)' },
          { label:'Auto-renewing', val:allCerts.filter(c=>c.auto_renew).length, color:'#16a34a' },
        ].map(({ label, val, color }) => (
          <div key={label} className="v2-card" style={{ padding:'11px 14px' }}>
            <div style={{ fontSize:20, fontWeight:600, color, fontFamily:'monospace' }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls — single inline flex row */}
      <div style={{ display:'flex', flexDirection:'row', gap:8, marginBottom:14,
        alignItems:'center', flexWrap:'nowrap', overflowX:'auto' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 180px', minWidth:140 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%',
            transform:'translateY(-50%)', color:'var(--v2-text-3)', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search domains…"
            style={{ width:'100%', padding:'7px 10px 7px 28px',
              fontSize:12, borderRadius:7, border:'0.5px solid var(--v2-border)',
              background:'var(--v2-surface)', color:'var(--v2-text)', fontFamily:'inherit',
              boxSizing:'border-box' }}/>
        </div>

        <select value={caFilter} onChange={e=>setCaFilter(e.target.value)}
          style={{ fontSize:12, padding:'7px 10px', borderRadius:7, flexShrink:0,
            border:'0.5px solid var(--v2-border)', background:'var(--v2-surface)',
            color:'var(--v2-text)', fontFamily:'inherit', cursor:'pointer' }}>
          {[{v:'all',l:'All CAs'},{v:'native',l:'GoGetSSL'},{v:'digicert',l:'DigiCert'},
            {v:'sectigo',l:'Sectigo'},{v:'acme',l:"Let's Encrypt"}]
            .map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ fontSize:12, padding:'7px 10px', borderRadius:7, flexShrink:0,
            border:'0.5px solid var(--v2-border)', background:'var(--v2-surface)',
            color:'var(--v2-text)', fontFamily:'inherit', cursor:'pointer' }}>
          {[{v:'all',l:'All status'},{v:'active',l:'Active'},
            {v:'expiring',l:'Expiring ≤30d'},{v:'expired',l:'Expired'},{v:'shadow',l:'Shadow IT'}]
            .map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ fontSize:12, padding:'7px 10px', borderRadius:7, flexShrink:0,
            border:'0.5px solid var(--v2-border)', background:'var(--v2-surface)',
            color:'var(--v2-text)', fontFamily:'inherit', cursor:'pointer' }}>
          {[{v:'expiry',l:'Sort: Expiry'},{v:'domain',l:'Sort: Domain'}]
            .map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <button className="v2-btn v2-btn-sm" onClick={exportCSV}
          style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <Download size={11}/> Export CSV
        </button>
        <button className="v2-btn v2-btn-sm" onClick={onRefresh}
          style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <RefreshCw size={11}/> Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden' }}>
        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 90px 80px 80px',
          padding:'8px 14px', background:'var(--v2-surface-3)',
          borderBottom:'0.5px solid var(--v2-border)' }}>
          {['Domain','CA','Product','Expires','Auto-renew','Source'].map(h => (
            <div key={h} style={{ fontSize:9, fontWeight:700, color:'var(--v2-text-3)',
              textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--v2-text-3)', fontSize:12 }}>
            <Spinner/> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--v2-text-3)', fontSize:12 }}>
            No certificates match your filters.
          </div>
        ) : (
          filtered.map(c => {
            const d   = dLeft(c.expires_at)
            const col = expiryColor(d)
            const isShadow = c.source === 'shadow'
            return (
              <div key={c.id} style={{
                display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 90px 80px 80px',
                padding:'10px 14px', borderBottom:'0.5px solid var(--v2-border)',
                background: isShadow ? 'rgba(124,58,237,0.03)' : 'var(--v2-surface)',
                alignItems:'center',
                transition:'background .1s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background=isShadow?'rgba(124,58,237,0.06)':'var(--v2-surface-3)'}
                onMouseLeave={e=>e.currentTarget.style.background=isShadow?'rgba(124,58,237,0.03)':'var(--v2-surface)'}>

                {/* Domain */}
                <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
                  {isShadow && (
                    <span title="Shadow IT — not managed in SSLVault"
                      style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4,
                        background:'rgba(124,58,237,0.1)', color:'#7c3aed', flexShrink:0 }}>
                      SHADOW
                    </span>
                  )}
                  <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    fontFamily:'monospace' }}>
                    {c.domain}
                  </span>
                </div>

                {/* CA */}
                <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>{c.ca || '—'}</div>

                {/* Product */}
                <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>{c.product}</div>

                {/* Expiry */}
                <div><ExpiryBadge iso={c.expires_at}/></div>

                {/* Auto-renew */}
                <div>
                  {c.auto_renew
                    ? <span style={{ fontSize:10, fontWeight:600, color:'#16a34a' }}>✓ ON</span>
                    : <span style={{ fontSize:10, color:'var(--v2-text-3)' }}>— OFF</span>}
                </div>

                {/* Source + action */}
                <div style={{ display:'flex', gap:4 }}>
                  {isShadow ? (
                    <>
                      <button onClick={()=>onShadowAction('approve',c.id)}
                        title="Mark as known/approved"
                        style={{ fontSize:9, padding:'2px 6px', borderRadius:4, cursor:'pointer',
                          background:'#f0fdf4', color:'#16a34a', border:'0.5px solid #bbf7d0',
                          fontFamily:'inherit' }}>
                        ✓
                      </button>
                      <button onClick={()=>onShadowAction('dismiss',c.id)}
                        title="Dismiss"
                        style={{ fontSize:9, padding:'2px 6px', borderRadius:4, cursor:'pointer',
                          background:'#fef2f2', color:'#dc2626', border:'0.5px solid #fecaca',
                          fontFamily:'inherit' }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>Vault</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:8, textAlign:'right' }}>
        {filtered.length} of {allCerts.length} certificates
      </div>
    </div>
  )
}

// ── Policy Engine ─────────────────────────────────────────────────────
function PolicyEngine({ certs }) {
  const [policies, setPolicies] = useState([
    { id:1, name:'Max cert validity',       rule:'validity_days', operator:'lte', value:200,  active:true,  severity:'critical' },
    { id:2, name:'Auto-renew required',     rule:'auto_renew',    operator:'eq',  value:true, active:true,  severity:'warning'  },
    { id:3, name:'Approved CAs only',       rule:'ca_type',       operator:'in',  value:'gogetssl,acme', active:false, severity:'info' },
    { id:4, name:'KeyLocker required',      rule:'keylocker',     operator:'eq',  value:true, active:false, severity:'warning'  },
  ])

  const violations = useMemo(() => {
    const v = []
    policies.filter(p=>p.active).forEach(p => {
      certs.forEach(c => {
        if (p.rule==='validity_days') {
          const days = c.expires_at&&c.created_at
            ? Math.ceil((new Date(c.expires_at)-new Date(c.created_at))/86400000) : null
          if (days && days > (p.value||200)) v.push({ domain:c.domain, policy:p.name, detail:`${days}d validity` })
        }
        if (p.rule==='auto_renew' && !c.auto_renew_enabled) {
          v.push({ domain:c.domain, policy:p.name, detail:'Auto-renew disabled' })
        }
      })
    })
    return v
  }, [certs, policies])

  const toggle = id => setPolicies(ps => ps.map(p => p.id===id ? {...p, active:!p.active} : p))

  const sevColor = { critical:'#dc2626', warning:'#d97706', info:'#2563eb' }
  const sevBg    = { critical:'#fef2f2', warning:'#fffbeb', info:'#eff6ff' }

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Policy rules */}
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)', marginBottom:12 }}>
            Active policies
            <span style={{ fontSize:10, fontWeight:400, color:'var(--v2-text-3)', marginLeft:8 }}>
              Rules applied across your entire certificate fleet
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {policies.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px', borderRadius:9,
                border:`0.5px solid ${p.active ? sevColor[p.severity]+'44' : 'var(--v2-border)'}`,
                background: p.active ? sevBg[p.severity] : 'var(--v2-surface-3)',
                transition:'all .15s' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500,
                    color: p.active ? sevColor[p.severity] : 'var(--v2-text-3)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
                    {p.rule} {p.operator} {String(p.value)}
                  </div>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
                  background: p.active ? sevColor[p.severity] : 'var(--v2-surface)',
                  color: p.active ? 'white' : 'var(--v2-text-3)',
                  border: p.active ? 'none' : '0.5px solid var(--v2-border)' }}>
                  {p.severity.toUpperCase()}
                </span>
                {/* Toggle */}
                <div onClick={()=>toggle(p.id)}
                  style={{ width:36, height:20, borderRadius:10, cursor:'pointer',
                    background: p.active ? sevColor[p.severity] : 'var(--v2-border)',
                    position:'relative', flexShrink:0, transition:'background .2s' }}>
                  <div style={{ position:'absolute', top:2, left: p.active?18:2, width:16, height:16,
                    borderRadius:'50%', background:'white', transition:'left .2s',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violations */}
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)', marginBottom:12 }}>
            Policy violations
            <span style={{ fontSize:10, fontWeight:400, marginLeft:8,
              color: violations.length>0 ? '#dc2626' : '#16a34a' }}>
              {violations.length === 0 ? '✓ All certs compliant' : `${violations.length} violation${violations.length>1?'s':''}`}
            </span>
          </div>
          {violations.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 16px',
              background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:9 }}>
              <CheckCircle size={28} color="#16a34a" style={{ margin:'0 auto 10px', display:'block' }}/>
              <div style={{ fontSize:12, fontWeight:500, color:'#15803d' }}>All certificates comply</div>
              <div style={{ fontSize:11, color:'#16a34a', marginTop:4 }}>
                with your active policy rules
              </div>
            </div>
          ) : (
            <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:9, overflow:'hidden' }}>
              {violations.map((v,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'9px 12px', borderBottom:'0.5px solid var(--v2-border)',
                  background:'var(--v2-surface)' }}>
                  <XCircle size={13} color="#dc2626" style={{ flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:500, color:'var(--v2-text)',
                      fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>{v.domain}</div>
                    <div style={{ fontSize:10, color:'#dc2626' }}>{v.policy} · {v.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CA Connect/Manage panel ───────────────────────────────────────────
function CAConnectPanel({ caType, connection, tok, onSaved, onDisconnected }) {
  const [draftKey,  setDraftKey]  = useState('')
  const [showKey,   setShowKey]   = useState(false)
  const [draftCreds,setDraftCreds]= useState({ uri:'', login:'', pass:'' })
  const [saving,    setSaving]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [testResult,setTestResult]= useState(null)
  const [error,     setError]     = useState('')

  const isConnected = connection?.status === 'active'

  const testConnection = async () => {
    setTesting(true); setTestResult(null); setError('')
    try {
      const r = await callImport(tok, { action:'test_connection',
        ca_type: caType,
        api_key: caType==='digicert' ? draftKey.trim() : undefined,
        customer_uri: caType==='sectigo' ? draftCreds.uri : undefined,
        login: caType==='sectigo' ? draftCreds.login : undefined,
        password: caType==='sectigo' ? draftCreds.pass : undefined,
      })
      setTestResult(r.ok ? 'success' : 'failed')
      if (!r.ok) setError(r.error || 'Connection test failed')
    } catch(e) { setTestResult('failed'); setError(e.message) }
    setTesting(false)
  }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const extra = caType==='digicert'
        ? { api_key: draftKey.trim() }
        : { customer_uri: draftCreds.uri, login: draftCreds.login, password: draftCreds.pass }
      const r = await callImport(tok, {
        action:'save_connection', ca_type: caType,
        label: caType==='digicert' ? 'DigiCert CertCentral' : 'Sectigo SCM', ...extra
      })
      if (r.error) { setError(r.error); setSaving(false); return }
      onSaved()
    } catch(e) { setError(e.message) }
    setSaving(false)
  }

  const disconnect = async () => {
    if (!confirm(`Disconnect ${caType}? Synced certificates will remain in SSLVault.`)) return
    await callImport(tok, { action:'delete_connection', ca_type: caType })
    onDisconnected()
  }

  return (
    <div style={{ maxWidth:560 }}>
      {isConnected ? (
        <div>
          {/* Connected state */}
          <div style={{ background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:9,
            padding:'12px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <CheckCircle size={16} color="#16a34a" style={{ flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#15803d' }}>
                {caType === 'digicert' ? 'DigiCert CertCentral' : 'Sectigo SCM'} connected
              </div>
              <div style={{ fontSize:11, color:'#16a34a', marginTop:1 }}>
                Last synced {fmtAgo(connection?.last_sync_at || connection?.updated_at)}
                {connection?.cert_count ? ` · ${connection.cert_count} certs` : ''}
              </div>
            </div>
          </div>

          {/* API key display (masked) */}
          {caType === 'digicert' && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--v2-text-2)',
                display:'block', marginBottom:6 }}>API key</label>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                background:'var(--v2-surface-3)', borderRadius:7, border:'0.5px solid var(--v2-border)' }}>
                <code style={{ fontSize:11, color:'var(--v2-text-2)', fontFamily:'monospace', flex:1 }}>
                  {showKey ? (connection?.api_key_enc || '••••••••••••••••') : '••••••••••••••••••••••••'}
                </code>
                <button onClick={()=>setShowKey(v=>!v)}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:'var(--v2-text-3)' }}>
                  {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button className="v2-btn v2-btn-sm"
              style={{ display:'flex', alignItems:'center', gap:5 }}
              onClick={async () => {
                setSaving(true)
                await callImport(tok, { action:'sync',
                  connection_id: connection?.id })
                setSaving(false); onSaved()
              }} disabled={saving}>
              {saving ? <><Spinner/> Syncing…</> : <><RefreshCw size={10}/> Sync now</>}
            </button>
            <button onClick={disconnect}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                fontSize:11, fontWeight:500, borderRadius:6, cursor:'pointer',
                background:'#fef2f2', color:'#dc2626',
                border:'0.5px solid #fecaca', fontFamily:'inherit' }}>
              <Trash2 size={10}/> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
            borderRadius:9, padding:'12px 14px', marginBottom:16, fontSize:11,
            color:'var(--v2-text-2)', lineHeight:1.6 }}>
            Connect your {caType==='digicert'?'DigiCert CertCentral':'Sectigo SCM'} account to
            sync your certificate inventory, enable cross-CA visibility, and get unified expiry alerts.
          </div>

          {caType === 'digicert' ? (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--v2-text-2)',
                display:'block', marginBottom:6 }}>
                DigiCert API key
                <a href="https://www.digicert.com/manage/api/keys" target="_blank" rel="noreferrer"
                  style={{ fontSize:10, color:'#0e7fc0', marginLeft:8, fontWeight:400 }}>
                  Get key ↗
                </a>
              </label>
              <div style={{ position:'relative' }}>
                <input type={showKey?'text':'password'} value={draftKey}
                  onChange={e=>setDraftKey(e.target.value)}
                  placeholder="Paste your DigiCert API key…"
                  style={{ width:'100%', padding:'9px 36px 9px 12px', fontSize:12,
                    borderRadius:7, border:'0.5px solid var(--v2-border)',
                    background:'var(--v2-surface)', color:'var(--v2-text)',
                    fontFamily:'monospace', boxSizing:'border-box' }}/>
                <button onClick={()=>setShowKey(v=>!v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--v2-text-3)' }}>
                  {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                </button>
              </div>
            </div>
          ) : (
            <>
              {[
                { label:'Customer URI', key:'uri',   type:'text',     ph:'https://cert-manager.com' },
                { label:'Login',        key:'login', type:'text',     ph:'your@email.com' },
                { label:'Password',     key:'pass',  type:'password', ph:'••••••••' },
              ].map(({ label, key, type, ph }) => (
                <div key={key} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:'var(--v2-text-2)',
                    display:'block', marginBottom:5 }}>{label}</label>
                  <input type={type} value={draftCreds[key]}
                    onChange={e=>setDraftCreds(d=>({...d,[key]:e.target.value}))}
                    placeholder={ph}
                    style={{ width:'100%', padding:'9px 12px', fontSize:12,
                      borderRadius:7, border:'0.5px solid var(--v2-border)',
                      background:'var(--v2-surface)', color:'var(--v2-text)',
                      fontFamily:'inherit', boxSizing:'border-box' }}/>
                </div>
              ))}
            </>
          )}

          {/* Test result */}
          {testResult && (
            <div style={{ background:testResult==='success'?'#f0fdf4':'#fef2f2',
              border:`0.5px solid ${testResult==='success'?'#bbf7d0':'#fecaca'}`,
              borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:11,
              color:testResult==='success'?'#15803d':'#b91c1c',
              display:'flex', alignItems:'center', gap:7 }}>
              {testResult==='success'
                ? <><CheckCircle size={12}/> Connection test successful</>
                : <><AlertTriangle size={12}/> {error || 'Test failed'}</>}
            </div>
          )}

          {error && !testResult && (
            <div style={{ background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:7,
              padding:'8px 12px', marginBottom:10, fontSize:11, color:'#b91c1c' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button className="v2-btn v2-btn-sm" onClick={testConnection}
              disabled={testing || (!draftKey.trim() && !draftCreds.uri)}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              {testing ? <><Spinner/> Testing…</> : <><Activity size={10}/> Test connection</>}
            </button>
            <button onClick={save} disabled={saving||(!draftKey.trim()&&!draftCreds.uri)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                background:'#0e7fc0', color:'white', border:'none', borderRadius:7,
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                opacity: saving||(!draftKey.trim()&&!draftCreds.uri) ? 0.5 : 1 }}>
              {saving ? <><Spinner/> Saving…</> : 'Connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ MAIN ══════════════════════════════════════════════════════════════
export default function CAIntelligenceHub({ nav }) {
  const [tok,         setTok]         = useState('')
  const [tab,         setTab]         = useState('overview')
  const [connectors,  setConnectors]  = useState([])  // ca_connectors (ACME)
  const [connections, setConnections] = useState([])  // ca_connections (DigiCert/Sectigo)
  const [certs,       setCerts]       = useState([])
  const [shadowCerts, setShadowCerts] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [syncing,     setSyncing]     = useState({})
  const [selectedCA,  setSelectedCA]  = useState(null) // for manage panel

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setTok(session.access_token)
    })
  }, [])

  const loadAll = useCallback(async () => {
    if (!tok) return
    setLoading(true)
    const [certsRes, shadowRes, connRes] = await Promise.all([
      supabase.from('certificates').select('*').order('expires_at', { ascending:true }),
      supabase.from('shadow_certs').select('*').neq('status','dismissed').order('expires_at',{ascending:true}),
      callImport(tok, { action:'list_connections' }),
    ])
    setCerts(certsRes.data || [])
    setShadowCerts(shadowRes.data || [])
    setConnections(connRes.connections || [])
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) loadAll() }, [tok, loadAll])

  const syncCA = async (connId, caType) => {
    setSyncing(s => ({...s, [connId]: true}))
    await callImport(tok, { action:'sync', connection_id: connId })
    await loadAll()
    setSyncing(s => ({...s, [connId]: false}))
  }

  const handleShadowAction = async (action, id) => {
    if (action === 'dismiss') {
      await callCA(tok, { action:'dismiss_shadow', shadow_id: id })
    } else if (action === 'approve') {
      await supabase.from('shadow_certs').update({ status:'known' }).eq('id', id)
    }
    await loadAll()
  }

  // Build CA list — connectors + connections merged
  const allCAs = useMemo(() => {
    const list = []
    // ACME connectors (Let's Encrypt etc)
    connectors.forEach(c => list.push({
      ...c, _type:'connector', ca_type: c.ca_type || 'acme'
    }))
    // Enterprise connections (DigiCert, Sectigo)
    connections.forEach(c => list.push({
      ...c, _type:'connection'
    }))
    // Add placeholders for unconnected CAs
    const hasDigicert = connections.some(c=>c.ca_type==='digicert')
    const hasSectigo  = connections.some(c=>c.ca_type==='sectigo')
    if (!hasDigicert) list.push({ id:'digicert-placeholder', ca_type:'digicert', ca_name:'DigiCert', label:'DigiCert CertCentral', status:'inactive', _type:'placeholder' })
    if (!hasSectigo)  list.push({ id:'sectigo-placeholder',  ca_type:'sectigo',  ca_name:'Sectigo',  label:'Sectigo SCM',         status:'inactive', _type:'placeholder' })
    return list
  }, [connectors, connections])

  const certsByCA = useMemo(() => {
    const m = {}
    certs.forEach(c => {
      const key = c.ca_type || 'native'
      m[key] = (m[key]||0) + 1
    })
    return m
  }, [certs])

  const TABS = [
    { id:'overview',   label:'Overview'         },
    { id:'inventory',  label:'All certificates' },
    { id:'connectors', label:'CA connectors'    },
    { id:'policy',     label:'Policy engine'    },
    { id:'shadow',     label:`Shadow IT ${shadowCerts.length > 0 ? `(${shadowCerts.length})` : ''}` },
  ]

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1100 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:20, paddingTop:8, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>CA Intelligence</h1>
            <p style={{ fontSize:13, color:'var(--v2-text-3)', marginTop:4 }}>
              Unified certificate visibility and control across all connected CAs
            </p>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={loadAll}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={11} style={loading?{animation:'spin .8s linear infinite'}:{}}/> Refresh all
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:1, borderBottom:'0.5px solid var(--v2-border)', marginBottom:24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 16px', fontSize:12, fontWeight:tab===t.id?600:400,
                cursor:'pointer', fontFamily:'inherit', background:'none', border:'none',
                borderBottom:tab===t.id?'2px solid #0e7fc0':'2px solid transparent',
                color:tab===t.id?'#0e7fc0':'var(--v2-text-3)',
                marginBottom:'-0.5px', transition:'color .15s',
                whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div>
            {/* Fleet health summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
              {[
                { label:'Total certificates',  val: certs.length + shadowCerts.length, color:'var(--v2-text)' },
                { label:'Active CAs',          val: allCAs.filter(c=>c.status==='active').length, color:'#16a34a' },
                { label:'Expiring ≤30 days',   val: certs.filter(c=>{const d=dLeft(c.expires_at);return d!==null&&d>=0&&d<=30}).length, color:'#d97706' },
                { label:'Shadow IT detected',  val: shadowCerts.length, color: shadowCerts.length>0?'#7c3aed':'var(--v2-text-3)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="v2-card" style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:26, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* CA health cards */}
            <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)',
              marginBottom:12 }}>Connected certificate authorities</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',
              gap:12, marginBottom:24 }}>
              {allCAs.map(ca => (
                <CAHealthCard key={ca.id}
                  ca={ca}
                  certCount={certsByCA[ca.ca_type] ?? (ca.cert_count || 0)}
                  syncing={syncing[ca.id]}
                  onClick={()=>{ setSelectedCA(ca); setTab('connectors') }}
                  onSync={()=>syncCA(ca.id, ca.ca_type)}
                  onDisconnect={loadAll}/>
              ))}
            </div>

            {/* Expiry timeline — certs expiring soon */}
            {certs.filter(c=>{ const d=dLeft(c.expires_at); return d!==null&&d>=0&&d<=60 }).length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)', marginBottom:12 }}>
                  Expiring in the next 60 days
                </div>
                <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden' }}>
                  {certs
                    .filter(c=>{ const d=dLeft(c.expires_at); return d!==null&&d>=0&&d<=60 })
                    .slice(0,8)
                    .map(c => {
                      const d = dLeft(c.expires_at)
                      return (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12,
                          padding:'10px 14px', borderBottom:'0.5px solid var(--v2-border)',
                          background:'var(--v2-surface)' }}>
                          <div style={{ flex:1, fontSize:12, fontWeight:500, color:'var(--v2-text)',
                            fontFamily:'monospace' }}>{c.domain}</div>
                          <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                            {c.issuer || c.cert_type || 'SSL'}
                          </div>
                          <ExpiryBadge iso={c.expires_at}/>
                          {c.auto_renew_enabled
                            ? <span style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>↻ Auto</span>
                            : <span style={{ fontSize:10, color:'#dc2626', fontWeight:600 }}>⚠ Manual</span>}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === 'inventory' && (
          <UnifiedInventory
            certs={certs}
            shadowCerts={shadowCerts}
            loading={loading}
            onRefresh={loadAll}
            onShadowAction={handleShadowAction}/>
        )}

        {/* CONNECTORS TAB */}
        {tab === 'connectors' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20, minHeight:400 }}>
              {/* CA list sidebar */}
              <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10,
                overflow:'hidden', height:'fit-content' }}>
                <div style={{ padding:'10px 14px', background:'var(--v2-surface-3)',
                  borderBottom:'0.5px solid var(--v2-border)',
                  fontSize:10, fontWeight:700, color:'var(--v2-text-3)',
                  textTransform:'uppercase', letterSpacing:'0.4px' }}>
                  Certificate authorities
                </div>
                {allCAs.map(ca => {
                  const isActive = ca.status === 'active'
                  const isSelected = selectedCA?.id === ca.id
                  return (
                    <div key={ca.id} onClick={()=>setSelectedCA(ca)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                        borderBottom:'0.5px solid var(--v2-border)', cursor:'pointer',
                        background: isSelected ? '#eff6ff' : 'var(--v2-surface)',
                        borderLeft: isSelected ? '3px solid #0e7fc0' : '3px solid transparent',
                        transition:'all .1s' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                        background: isActive?'#16a34a':'#d1d5db' }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)' }}>
                          {ca.ca_name || ca.ca_type}
                        </div>
                        <div style={{ fontSize:10, color:'var(--v2-text-3)' }}>
                          {isActive ? `Active · ${ca.cert_count||0} certs` : 'Not connected'}
                        </div>
                      </div>
                      <ChevronRight size={12} color="var(--v2-text-3)"/>
                    </div>
                  )
                })}
              </div>

              {/* Detail panel */}
              <div>
                {!selectedCA ? (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'var(--v2-text-3)' }}>
                    <Globe size={32} style={{ margin:'0 auto 12px', display:'block' }}/>
                    <div style={{ fontSize:13 }}>Select a CA to manage</div>
                  </div>
                ) : selectedCA.ca_type === 'acme' ? (
                  <div className="v2-card" style={{ padding:'20px' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:8 }}>
                      Let's Encrypt (ACME v2)
                    </div>
                    <div style={{ background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:8,
                      padding:'12px 14px', marginBottom:14, fontSize:11, color:'#15803d' }}>
                      <CheckCircle size={12} style={{ verticalAlign:'-1px', marginRight:5 }}/>
                      Always active — no API key required. ACME v2 account registered and ready.
                    </div>
                    {[
                      ['Account status', 'Active'],
                      ['Protocol', 'ACME v2'],
                      ['Server', selectedCA.server_url || 'https://acme-v02.api.letsencrypt.org/directory'],
                      ['Certificates issued', selectedCA.cert_count || 0],
                      ['Connected', selectedCA.created_at ? fmt(selectedCA.created_at) : '—'],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:'flex', justifyContent:'space-between',
                        padding:'6px 0', fontSize:12, borderBottom:'0.5px solid var(--v2-border)' }}>
                        <span style={{ color:'var(--v2-text-3)' }}>{k}</span>
                        <span style={{ color:'var(--v2-text)', fontWeight:500 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="v2-card" style={{ padding:'20px' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:16 }}>
                      {selectedCA.ca_name || selectedCA.ca_type}
                    </div>
                    <CAConnectPanel
                      caType={selectedCA.ca_type}
                      connection={selectedCA._type==='placeholder' ? null : selectedCA}
                      tok={tok}
                      onSaved={()=>{ loadAll(); setSelectedCA(null) }}
                      onDisconnected={()=>{ loadAll(); setSelectedCA(null) }}/>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* POLICY TAB */}
        {tab === 'policy' && <PolicyEngine certs={certs}/>}

        {/* SHADOW IT TAB */}
        {tab === 'shadow' && (
          <div>
            <div style={{ background:'rgba(124,58,237,0.05)', border:'0.5px solid rgba(124,58,237,0.2)',
              borderRadius:9, padding:'12px 16px', marginBottom:20,
              display:'flex', alignItems:'center', gap:12 }}>
              <AlertTriangle size={14} color="#7c3aed" style={{ flexShrink:0 }}/>
              <div style={{ fontSize:12, color:'#6d28d9' }}>
                <strong>{shadowCerts.length} certificates</strong> found via CT logs that aren't managed in SSLVault.
                Approve known ones or dismiss false positives.
              </div>
            </div>

            {shadowCerts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0' }}>
                <Shield size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text-2)' }}>No shadow certificates</div>
                <div style={{ fontSize:12, color:'var(--v2-text-3)', marginTop:6 }}>
                  All detected certificates are accounted for.
                </div>
              </div>
            ) : (
              <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'minmax(160px,2fr) 100px 100px 90px 160px',
                  padding:'8px 14px', background:'var(--v2-surface-3)',
                  borderBottom:'0.5px solid var(--v2-border)' }}>
                  {['Domain','CA','Product','Expires','Actions'].map(h => (
                    <div key={h} style={{ fontSize:9, fontWeight:700, color:'var(--v2-text-3)',
                      textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
                  ))}
                </div>
                {shadowCerts.map(c => (
                  <div key={c.id} style={{ display:'grid', gridTemplateColumns:'minmax(160px,2fr) 100px 100px 90px 160px',
                    padding:'10px 14px', borderBottom:'0.5px solid var(--v2-border)',
                    background:'var(--v2-surface)', alignItems:'center' }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)',
                      fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.domain}
                    </div>
                    <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>{c.current_ca || c.ca_type || '—'}</div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>{c.current_product || '—'}</div>
                    <div><ExpiryBadge iso={c.expires_at}/></div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>handleShadowAction('approve', c.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
                          fontSize:10, fontWeight:600, borderRadius:5, cursor:'pointer',
                          background:'#f0fdf4', color:'#15803d',
                          border:'0.5px solid #bbf7d0', fontFamily:'inherit' }}>
                        <Check size={9}/> Approve
                      </button>
                      <button onClick={()=>handleShadowAction('dismiss', c.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
                          fontSize:10, fontWeight:600, borderRadius:5, cursor:'pointer',
                          background:'#fef2f2', color:'#b91c1c',
                          border:'0.5px solid #fecaca', fontFamily:'inherit' }}>
                        <X size={9}/> Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
