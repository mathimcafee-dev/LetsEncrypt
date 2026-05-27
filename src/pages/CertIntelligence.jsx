// CertIntelligence.jsx — CA Intelligence Suite
// Week 1: Cross-CA Expiry Timeline
// Week 2: Shadow IT Scanner
// Week 3: CA Consolidation Advisor
// Route: /cert-intelligence
// Edge fn: ca-intelligence v1

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Activity, AlertTriangle, Shield, TrendingDown, RefreshCw,
  ChevronRight, Check, X, ExternalLink, Zap, Search,
  DollarSign, Copy, AlertCircle, Clock, Eye, EyeOff, Trash2, Square, CheckSquare, RotateCcw
} from 'lucide-react'
import '../styles/design-v2.css'

const FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-intelligence'

async function call(tok, body) {
  const r = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body)
  })
  return r.json()
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

const URGENCY = {
  expired:  { label: 'Expired',    color: '#f87171', bg: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.25)', dot: '#f87171' },
  critical: { label: 'Critical',   color: '#f87171', bg: 'rgba(192,57,43,0.12)', border: 'rgba(192,57,43,0.25)', dot: '#e67e22' },
  warning:  { label: 'Warning',    color: '#f0ede8', bg: 'rgba(239,68,68,0.08)', border: 'rgba(192,57,43,0.25)', dot: '#f0ede8' },
  upcoming: { label: 'Upcoming',   color: '#f0ede8', bg: 'transparent', border: 'rgba(192,57,43,0.3)', dot: '#f0ede8' },
  healthy:  { label: 'Healthy',    color: '#4ade80', bg: 'transparent', border: 'rgba(192,57,43,0.3)', dot: '#4ade80' },
  unknown:  { label: 'Unknown',    color: 'var(--v2-text-3)', bg: 'var(--v2-bg)', border: 'var(--v2-border)', dot: 'var(--v2-text-3)' },
}

const CA_COLORS = {
  digicert: '#f87171', sectigo: '#f0ede8', sslcom: '#f0ede8',
  rapidssl: '#4ade80', imported: 'var(--v2-text-3)', unknown: 'var(--v2-text-3)'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Tag({ text, color = 'var(--v2-text-3)', bg = 'var(--v2-bg)' }) {
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
    background: bg, color, border: `0.5px solid ${color}44`, whiteSpace: 'nowrap' }}>{text}</span>
}

function Card({ children, style = {} }) {
  return <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...style }}>{children}</div>
}

function SectionBanner({ icon: Icon, color, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color}/>
        </div>
        <h2 style={{ fontSize:17, fontWeight: 800, color: '#f0ede8', letterSpacing: '-0.3px', margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize:12, color: 'var(--v2-text-3)', margin: '0 0 0 42px', lineHeight: 1.5 }}>{sub}</p>
    </div>
  )
}

function UrgencyDot({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.unknown
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: u.dot, flexShrink: 0,
    boxShadow: urgency === 'healthy' ? '0 0 0 2px rgba(22,163,74,0.2)' : 'none' }}/>
}

function Spinner() {
  return <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/>
}

// ══ TAB 1 — EXPIRY TIMELINE ══════════════════════════════════════════
function ExpiryTimeline({ tok }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [connId, setConnId]     = useState(null)
  const [conns, setConns]       = useState([])
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [renewModal, setRenewModal]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await call(tok, { action: 'expiry_timeline' })
    if (r.ok) setData(r)
    setLoading(false)
  }, [tok])

  useEffect(() => {
    if (!tok) return
    load()
    // Load connections for sync picker
    supabase.from('ca_connections').select('id,ca_name,ca_type,label').then(({ data }) => setConns(data || []))
  }, [tok, load])

  const doSync = async () => {
    setSyncing(true)
    await call(tok, { action: 'daily_sync', connection_id: connId || undefined })
    setSyncing(false)
    await load()
  }

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === certs.length) setSelected(new Set())
    else setSelected(new Set(certs.map(c => c.id)))
  }

  const doDelete = async () => {
    setDeleting(true)
    const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
    await fetch(`${SB_URL}/functions/v1/ca-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
      body: JSON.stringify({ action: 'delete_certs_by_ids', cert_ids: [...selected] })
    })
    setSelected(new Set())
    setDelConfirm(false)
    setDeleting(false)
    await load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--v2-text-3)' }}><Spinner/> Loading timeline…</div>
  if (!data) return null

  const certs = (data.certs || []).filter(c => {
    if (filter !== 'all' && c.urgency !== filter) return false
    if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { counts, total, no_renewal_path_count, last_sync } = data

  return (
    <div>
      <SectionBanner icon={Activity} color="#c0392b"
        title="Cross-CA Expiry Timeline"
        sub="Every certificate across all connected CAs, unified by urgency. Certs with no renewal path are flagged for manual action."/>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginBottom: 20 }}>
        {Object.entries(URGENCY).map(([key, u]) => (
          <Card key={key} style={{ padding: '12px 14px', cursor: 'pointer',
            borderTop: `3px solid ${counts[key] > 0 ? u.dot : 'var(--v2-border)'}`,
            background: filter === key ? u.bg : 'var(--v2-surface)',
            transition: 'all .15s' }}
            onClick={() => setFilter(filter === key ? 'all' : key)}>
            <div style={{ fontSize:22, fontWeight: 800, color: counts[key] > 0 ? u.color : 'var(--v2-text-3)',
              letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4 }}>{counts[key] || 0}</div>
            <div style={{ fontSize:10, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{u.label}</div>
          </Card>
        ))}
      </div>

      {/* Alert banners */}
      {(counts.expired > 0 || counts.critical > 0) && (
        <div style={{ background: 'rgba(192,57,43,0.12)', border: '0.5px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={15} color="#c0392b" style={{ flexShrink: 0 }}/>
          <span style={{ fontSize:13, color: '#f87171', fontWeight: 600 }}>
            {counts.expired > 0 && `${counts.expired} expired`}
            {counts.expired > 0 && counts.critical > 0 && ' · '}
            {counts.critical > 0 && `${counts.critical} expiring within 7 days`}
            {' — immediate action required'}
          </span>
        </div>
      )}

      {no_renewal_path_count > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid #F2C4BC', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={14} color="#e07060" style={{ flexShrink: 0 }}/>
          <span style={{ fontSize:12, color: '#e07060' }}>
            <strong>{no_renewal_path_count} certificate{no_renewal_path_count !== 1 ? 's' : ''}</strong> have no renewal path —
            no agent, no DNS connector, and not a RapidSSL cert. These require manual renewal.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search domains…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px',
              borderRadius: 8, border: '0.5px solid var(--v2-border)', fontSize:12, fontFamily: 'inherit',
              outline: 'none', color: 'transparent' }}
            onFocus={e => e.target.style.borderColor = '#f0ede8'}
            onBlur={e => e.target.style.borderColor = 'var(--v2-border)'}/>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-3)' }}/>
        </div>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize:11, fontWeight: 600,
              padding: '6px 10px', borderRadius: 7, border: '0.5px solid var(--v2-border)',
              background: 'var(--v2-surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--v2-text-3)' }}>
            <X size={11}/> Clear filter
          </button>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          {conns.length > 0 && (
            <select value={connId || ''} onChange={e => setConnId(e.target.value || null)}
              style={{ fontSize:11, padding: '6px 8px', borderRadius: 7, border: '0.5px solid var(--v2-border)',
                fontFamily: 'inherit', color: 'var(--v2-text-2)', cursor: 'pointer', outline: 'none' }}>
              <option value="">All connections</option>
              {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
            </select>
          )}
          <button onClick={doSync} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:11, fontWeight: 600,
              padding: '6px 12px', borderRadius: 7, border: 'none', background: syncing ? 'var(--v2-text-3)' : '#f0ede8',
              color: 'var(--v2-surface)', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {syncing ? <><Spinner/> Syncing…</> : <><RefreshCw size={11}/> Sync now</>}
          </button>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:11, fontWeight: 600,
              padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--v2-border)',
              background: 'var(--v2-surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--v2-text-2)' }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>
      </div>
      {last_sync && <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 10 }}>Last synced: {fmt(last_sync)}</div>}

      {/* Batch delete toolbar — appears when items selected */}
      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:8,
          background:'rgba(230,126,34,0.1)', border:'0.5px solid #fed7aa', borderRadius:10 }}>
          <CheckSquare size={14} style={{ color:'#c0392b', flexShrink:0 }}/>
          <span style={{ fontSize:12, fontWeight:600, color:'#a93226', flex:1 }}>
            {selected.size} certificate{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={() => setSelected(new Set())}
            style={{ fontSize:11, fontWeight:600, padding:'5px 10px', borderRadius:7,
              border:'0.5px solid #fdba74', background:'var(--v2-surface)', color:'#a93226',
              cursor:'pointer', fontFamily:'inherit' }}>
            Clear
          </button>
          <button onClick={() => setDelConfirm(true)}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
              padding:'5px 12px', borderRadius:7, border:'none',
              background:'#f87171', color:'var(--v2-surface)', cursor:'pointer', fontFamily:'inherit' }}>
            <Trash2 size={11}/> Delete {selected.size}
          </button>
        </div>
      )}

      {/* Cert table */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1fr 1fr 1fr 1fr 80px',
          padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'transparent',
          alignItems: 'center' }}>
          <div style={{ display:'flex', alignItems:'center', cursor:'pointer' }} onClick={toggleAll}>
            {selected.size > 0 && selected.size === certs.length
              ? <CheckSquare size={13} style={{ color:'#f0ede8' }}/>
              : <Square size={13} style={{ color:'rgba(240,237,232,0.12)' }}/>}
          </div>
          {['Domain', 'CA source', 'Expires', 'Days left', 'Status', ''].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        {certs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--v2-text-3)', fontSize:13 }}>
            {search || filter !== 'all' ? 'No certificates match this filter.' : 'No certificates tracked. Connect a CA or sync.'}
          </div>
        ) : certs.map((cert, i) => {
          const u = URGENCY[cert.urgency] || URGENCY.unknown
          const caColor = CA_COLORS[cert.ca_type] || 'var(--v2-text-3)'
          const isSelected = selected.has(cert.id)
          return (
            <div key={cert.id} style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1fr 1fr 1fr 1fr 80px',
              padding: '10px 16px', alignItems: 'center',
              borderBottom: i < certs.length - 1 ? '0.5px solid rgba(192,57,43,0.08)' : 'none',
              background: isSelected ? 'transparent' : cert.no_renewal_path ? '#fde8e444' : 'transparent',
              transition: 'background .12s', cursor: 'pointer' }}
              onClick={() => toggleSelect(cert.id)}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--v2-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'transparent' : cert.no_renewal_path ? '#fde8e444' : 'transparent' }}>
              <div style={{ display:'flex', alignItems:'center' }} onClick={e => { e.stopPropagation(); toggleSelect(cert.id) }}>
                {isSelected
                  ? <CheckSquare size={13} style={{ color:'#f0ede8' }}/>
                  : <Square size={13} style={{ color:'rgba(240,237,232,0.12)' }}/>}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <UrgencyDot urgency={cert.urgency}/>
                  <span style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace', color: '#f0ede8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.domain}</span>
                </div>
                {cert.no_renewal_path && (
                  <Tag text="⚠ No renewal path" color="#e07060" bg="rgba(192,57,43,0.1)"/>
                )}
              </div>
              <div>
                <Tag text={cert.ca_name || cert.ca_type || '—'} color={caColor} bg={caColor + '12'}/>
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{fmt(cert.expires_at)}</div>
              <div style={{ fontSize:12, fontWeight: 700, color: u.color }}>
                {cert.days_left === null ? '—' : cert.days_left < 0 ? 'Expired' : `${cert.days_left}d`}
              </div>
              <div><Tag text={u.label} color={u.color} bg={u.bg}/></div>
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setRenewModal(cert)}
                  style={{ display:'inline-flex', alignItems:'center', gap:4,
                    fontSize:10, fontWeight:600, padding:'4px 9px', borderRadius:6,
                    background:'transparent', color:'#f0ede8',
                    border:'0.5px solid rgba(192,57,43,0.3)', cursor:'pointer',
                    fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='#f0ede8'; e.currentTarget.style.color='var(--v2-surface)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#f0ede8' }}>
                  <RotateCcw size={10}/> Renew
                </button>
              </div>
            </div>
          )
        })}
        {certs.length > 0 && (
          <div style={{ padding: '8px 16px', fontSize:11, color: 'var(--v2-text-3)', borderTop: '0.5px solid var(--v2-border)' }}>
            Showing {certs.length} of {total} certificates
            {selected.size > 0 && <span style={{ color:'#f0ede8', marginLeft:8 }}>· {selected.size} selected</span>}
          </div>
        )}
      </Card>

      {/* Renew modal */}
      {renewModal && (() => {
        const src = renewModal.ca_type || renewModal.source || 'unknown'
        const CA_URLS = {
          digicert: 'https://www.digicert.com/account/login.php',
          sectigo:  'https://cert-manager.com/',
          sslcom:   'https://secure.ssl.com/users/login',
          rapidssl: null,
        }
        const CA_NAMES = {
          digicert: 'DigiCert CertCentral',
          sectigo:  'Sectigo SCM',
          sslcom:   'SSL.com',
          rapidssl: 'RapidSSL',
        }
        const caUrl  = CA_URLS[src]
        const caName = CA_NAMES[src] || 'your CA'
        return (
          <div style={{ position:'fixed', inset:0, zIndex:1001, display:'flex',
            alignItems:'center', justifyContent:'center', padding:20,
            background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }}
            onClick={e => e.target===e.currentTarget && setRenewModal(null)}>
            <div style={{ background:'var(--v2-surface)', borderRadius:16, width:'100%', maxWidth:420,
              boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid var(--v2-border)', overflow:'hidden' }}>
              <div style={{ padding:'18px 20px 14px', borderBottom:'0.5px solid var(--v2-border)',
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <RotateCcw size={13} color="#c0392b"/>
                    </div>
                    <span style={{ fontSize:14, fontWeight:700, color:'#f0ede8' }}>Renew certificate</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:4, marginLeft:36,
                    fontFamily:'monospace' }}>{renewModal.domain}</div>
                </div>
                <button onClick={() => setRenewModal(null)}
                  style={{ background:'var(--v2-bg)', border:'0.5px solid var(--v2-border)', borderRadius:7,
                    cursor:'pointer', color:'var(--v2-text-3)', padding:'5px', display:'flex' }}>
                  <X size={14}/>
                </button>
              </div>
              <div style={{ padding:'16px 20px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:12, color:'var(--v2-text-3)', marginBottom:4 }}>
                  How would you like to renew this certificate?
                </div>
                {caUrl && (
                  <button onClick={() => { window.open(caUrl, '_blank', 'noopener'); setRenewModal(null) }}
                    style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                      borderRadius:10, border:'1.5px solid rgba(192,57,43,0.2)', background:'var(--v2-surface)',
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#f0ede8'; e.currentTarget.style.background='transparent' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--v2-border)'; e.currentTarget.style.background='var(--v2-surface)' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'var(--v2-border)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ExternalLink size={15} color="rgba(0,0,0,0.55)"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#f0ede8', marginBottom:3 }}>Renew via {caName}</div>
                      <div style={{ fontSize:11, color:'var(--v2-text-3)', lineHeight:1.5 }}>
                        Log into {caName} and renew there. Re-sync SSLVault after to update this view.
                      </div>
                      <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:4, fontFamily:'monospace' }}>{caUrl}</div>
                    </div>
                  </button>
                )}
                <button onClick={() => {
                    if (renewModal.domain) sessionStorage.setItem('prefill_domain', renewModal.domain)
                    setRenewModal(null)
                    nav('/buy')
                  }}
                  style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px',
                    borderRadius:10, border:'1.5px solid rgba(192,57,43,0.2)', background:'var(--v2-surface)',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#4ade80'; e.currentTarget.style.background='transparent' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--v2-border)'; e.currentTarget.style.background='var(--v2-surface)' }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Shield size={15} color="#16a34a"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#f0ede8', marginBottom:3 }}>
                      Renew via SSLVault
                      <span style={{ marginLeft:7, fontSize:9, fontWeight:700, padding:'2px 7px',
                        borderRadius:20, background:'transparent', color:'#4ade80',
                        border:'0.5px solid rgba(192,57,43,0.3)' }}>Recommended</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--v2-text-3)', lineHeight:1.5 }}>
                      Issue a fresh certificate via RapidSSL with auto-DNS validation and auto-install. Domain pre-filled.
                    </div>
                    <div style={{ fontSize:10, color:'#4ade80', marginTop:5, fontWeight:600,
                      display:'flex', alignItems:'center', gap:4 }}>
                      <Check size={10}/> DigiCert trust chain · ~5 min · auto-installs
                    </div>
                  </div>
                </button>
                <button onClick={() => setRenewModal(null)}
                  style={{ fontSize:12, color:'var(--v2-text-3)', background:'none', border:'none',
                    cursor:'pointer', fontFamily:'inherit', padding:'6px 0', textAlign:'center' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Delete confirm modal ── */}
      {delConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex',
          alignItems:'center', justifyContent:'center', padding:20,
          background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}
          onClick={e => e.target===e.currentTarget && !deleting && setDelConfirm(false)}>
          <div style={{ background:'var(--v2-surface)', borderRadius:14, width:'100%', maxWidth:400,
            padding:'24px', boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid var(--v2-border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'rgba(192,57,43,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Trash2 size={16} color="#c0392b"/>
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:'#f0ede8' }}>
                  Delete {selected.size} certificate{selected.size !== 1 ? 's' : ''}?
                </div>
                <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>
                  This removes them from SSLVault tracking only
                </div>
              </div>
            </div>
            <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid #fecaca', borderRadius:8,
              padding:'10px 12px', marginBottom:16, fontSize:12, color:'#f87171', lineHeight:1.6 }}>
              These certificates will be <strong>permanently removed</strong> from SSLVault.
              The actual certificates on your servers and at your CA are not affected.
              You can re-sync from your CA connection to restore them.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setDelConfirm(false)} disabled={deleting}
                style={{ flex:1, padding:'9px', border:'0.5px solid var(--v2-border)', borderRadius:8,
                  background:'var(--v2-surface)', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600 }}>
                Cancel
              </button>
              <button onClick={doDelete} disabled={deleting}
                style={{ flex:2, padding:'9px', background: deleting ? 'var(--v2-text-3)' : '#f87171',
                  color:'var(--v2-surface)', border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                  cursor: deleting ? 'wait' : 'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {deleting
                  ? <><RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/> Deleting…</>
                  : <><Trash2 size={12}/> Delete {selected.size} certificate{selected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ TAB 2 — SHADOW IT SCANNER ════════════════════════════════════════
function ShadowScanner({ tok, nav }) {
  const [conns, setConns]       = useState([])
  const [selectedConn, setSelectedConn] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult]     = useState(null)
  const [existing, setExisting] = useState([])
  const [loadingExist, setLoadingExist] = useState(false)
  const [dismissing, setDismissing] = useState(null)

  useEffect(() => {
    if (!tok) return
    supabase.from('ca_connections').select('id,ca_name,ca_type,label,status')
      .then(({ data }) => {
        const dc = (data || []).filter(c => c.ca_type === 'digicert' && c.status === 'active')
        setConns(dc)
        if (dc.length === 1) setSelectedConn(dc[0].id)
      })
    loadExisting()
  }, [tok])

  const loadExisting = async () => {
    setLoadingExist(true)
    const r = await call(tok, { action: 'get_shadow_certs' })
    if (r.ok) setExisting(r.shadows || [])
    setLoadingExist(false)
  }

  const doScan = async () => {
    if (!selectedConn) return
    setScanning(true); setResult(null)
    const r = await call(tok, { action: 'shadow_scan', connection_id: selectedConn })
    setResult(r)
    setScanning(false)
    if (r.ok) await loadExisting()
  }

  const dismiss = async (id) => {
    setDismissing(id)
    await call(tok, { action: 'dismiss_shadow', shadow_id: id })
    await loadExisting()
    setDismissing(null)
  }

  const shadows = existing

  return (
    <div>
      <SectionBanner icon={Search} color="#e07060"
        title="Shadow IT Scanner"
        sub="Compares your DigiCert portfolio against SSLVault inventory. Finds certs issued outside your CLM — compliance risk, expiry blindspot."/>

      {/* Connection picker + scan */}
      <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ fontSize:12, fontWeight: 700, color: 'var(--v2-text-2)', marginBottom: 12,
          textTransform: 'uppercase', letterSpacing: '0.4px' }}>Run shadow scan</div>

        {conns.length === 0 ? (
          <div style={{ fontSize:13, color: 'var(--v2-text-3)' }}>
            No active DigiCert connections found.{' '}
            <span style={{ color: '#f0ede8', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => nav('/integrations')}>
              Connect DigiCert →
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {conns.length > 1 && (
              <select value={selectedConn || ''} onChange={e => setSelectedConn(e.target.value)}
                style={{ fontSize:12, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--v2-border)',
                  fontFamily: 'inherit', color: 'var(--v2-text-2)', outline: 'none' }}>
                <option value="">Select connection…</option>
                {conns.map(c => <option key={c.id} value={c.id}>{c.label || c.ca_name}</option>)}
              </select>
            )}
            {conns.length === 1 && (
              <div style={{ fontSize:12, color: 'var(--v2-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }}/>
                {conns[0].label || conns[0].ca_name}
              </div>
            )}
            <button onClick={doScan} disabled={scanning || !selectedConn}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:12, fontWeight: 700,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: scanning || !selectedConn ? 'var(--v2-text-3)' : '#f0ede8',
                color: 'var(--v2-surface)', cursor: scanning || !selectedConn ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {scanning ? <><Spinner/> Scanning DigiCert…</> : <><Search size={12}/> Run Shadow Scan</>}
            </button>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>
              Compares your entire DigiCert order history vs SSLVault DB
            </div>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8,
            background: result.ok ? 'transparent' : 'rgba(192,57,43,0.12)',
            border: `0.5px solid ${result.ok ? 'rgba(192,57,43,0.3)' : 'rgba(192,57,43,0.25)'}` }}>
            {result.ok ? (
              <div style={{ display: 'flex', gap: 20, fontSize:12, color: '#166534' }}>
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
      </Card>

      {/* Shadow cert list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize:13, fontWeight: 700, color: '#f0ede8' }}>
          Shadow certificates {loadingExist ? '' : `(${shadows.length})`}
        </div>
        <button onClick={loadExisting}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize:11, fontWeight: 600,
            padding: '5px 10px', borderRadius: 7, border: '0.5px solid var(--v2-border)',
            background: 'var(--v2-surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--v2-text-2)' }}>
          <RefreshCw size={10} style={{ animation: loadingExist ? 'spin .8s linear infinite' : 'none' }}/> Refresh
        </button>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
          padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'transparent' }}>
          {['Domain', 'Product', 'Ordered by', 'Expires', 'Urgency', ''].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        {shadows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Shield size={28} style={{ color: 'var(--v2-border)', display: 'block', margin: '0 auto 12px' }}/>
            <div style={{ fontSize:13, color: 'var(--v2-text-3)', marginBottom: 4 }}>
              {result?.ok ? 'No shadow certs found — portfolio is fully accounted for.' : 'Run a scan to find shadow certificates.'}
            </div>
            {result?.ok && (
              <Tag text="✓ Portfolio complete" color="#16a34a" bg="rgba(192,57,43,0.12)"/>
            )}
          </div>
        ) : shadows.map((s, i) => {
          const u = URGENCY[s.urgency] || URGENCY.unknown
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              padding: '10px 16px', alignItems: 'center',
              borderBottom: i < shadows.length - 1 ? '0.5px solid rgba(192,57,43,0.08)' : 'none',
              transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace',
                  color: '#f0ede8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2 }}>{s.domain}</div>
                {s.org_name && <div style={{ fontSize:10, color: 'var(--v2-text-3)' }}>{s.org_name}</div>}
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{s.product || '—'}</div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.ordered_by || '—'}
              </div>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{fmt(s.expires_at)}</div>
              <div><Tag text={u.label} color={u.color} bg={u.bg}/></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { sessionStorage.setItem('prefill_domain', s.domain); nav('/buy') }}
                  title="Import via SSLVault"
                  style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                    background: 'transparent', color: '#4ade80', border: '0.5px solid rgba(192,57,43,0.3)',
                    cursor: 'pointer', fontFamily: 'inherit' }}>Import</button>
                <button onClick={() => dismiss(s.id)} disabled={dismissing === s.id}
                  title="Dismiss this finding"
                  style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 5,
                    background: 'var(--v2-bg)', color: 'var(--v2-text-3)', border: '0.5px solid var(--v2-border)',
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  {dismissing === s.id ? <Spinner/> : 'Dismiss'}
                </button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ══ TAB 3 — CONSOLIDATION ADVISOR ════════════════════════════════════
function ConsolidationAdvisor({ tok, nav }) {
  const [opps, setOpps]       = useState([])
  const [totalSaving, setTS]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [dismissing, setDim]  = useState(null)
  const [result, setResult]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await call(tok, { action: 'get_opportunities' })
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
    setLoading(false)
  }, [tok])

  useEffect(() => { if (tok) load() }, [tok, load])

  const runAnalysis = async () => {
    setRunning(true); setResult(null)
    const r = await call(tok, { action: 'consolidation_report' })
    setResult(r)
    setRunning(false)
    if (r.ok) { setOpps(r.opportunities || []); setTS(r.total_saving_usd || 0) }
  }

  const dismiss = async (idx) => {
    setDim(idx)
    // Remove from UI immediately (no persistent ID for computed opps)
    setOpps(prev => prev.filter((_, i) => i !== idx))
    setDim(null)
  }

  const migrate = (opp) => {
    sessionStorage.setItem('prefill_domain', opp.domain)
    nav('/buy')
  }

  const consolidation = opps.filter(o => o.type === 'ca_consolidation')
  const duplicates    = opps.filter(o => o.type === 'duplicate_domain')

  return (
    <div>
      <SectionBanner icon={DollarSign} color="#16a34a"
        title="CA Consolidation Advisor"
        sub="Identifies cost-saving opportunities across your connected CAs. DV certs on expensive CAs, duplicate domains, and migration paths."/>

      {/* Run analysis */}
      <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize:13, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>Portfolio cost analysis</div>
            <div style={{ fontSize:12, color: 'var(--v2-text-3)' }}>Analyses all tracked certs for consolidation opportunities against RapidSSL pricing</div>
          </div>
          <button onClick={runAnalysis} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize:12, fontWeight: 700,
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: running ? 'var(--v2-text-3)' : '#4ade80', color: 'var(--v2-surface)',
              cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {running ? <><Spinner/> Analysing…</> : <><TrendingDown size={13}/> Run Analysis</>}
          </button>
        </div>
        {result && !result.ok && (
          <div style={{ marginTop: 12, fontSize:12, color: '#f87171', background: 'rgba(192,57,43,0.12)',
            border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>{result.error}</div>
        )}
      </Card>

      {/* Summary */}
      {opps.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 20 }}>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #16a34a' }}>
            <div style={{ fontSize:26, fontWeight: 800, color: '#4ade80', letterSpacing: '-0.5px', marginBottom: 4 }}>
              ${totalSaving.toFixed(0)}<span style={{ fontSize:13, fontWeight: 500 }}>/yr</span>
            </div>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Estimated savings</div>
          </Card>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #c0392b' }}>
            <div style={{ fontSize:26, fontWeight: 800, color: '#f0ede8', letterSpacing: '-0.5px', marginBottom: 4 }}>{consolidation.length}</div>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CA consolidation opportunities</div>
          </Card>
          <Card style={{ padding: '14px 16px', borderLeft: '3px solid #f07059' }}>
            <div style={{ fontSize:26, fontWeight: 800, color: '#f0ede8', letterSpacing: '-0.5px', marginBottom: 4 }}>{duplicates.length}</div>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Duplicate domain findings</div>
          </Card>
        </div>
      )}

      {/* CA Consolidation Opportunities */}
      {consolidation.length > 0 && (
        <>
          <div style={{ fontSize:13, fontWeight: 700, color: '#f0ede8', marginBottom: 10 }}>
            CA Consolidation — move DV certs to RapidSSL
          </div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              padding: '9px 16px', borderBottom: '0.5px solid var(--v2-border)', background: 'transparent' }}>
              {['Domain', 'Current CA', 'Current product', 'Expires', 'Saving/yr', ''].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight: 700, color: 'var(--v2-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
              ))}
            </div>
            {consolidation.map((opp, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                padding: '11px 16px', alignItems: 'center',
                borderBottom: i < consolidation.length - 1 ? '0.5px solid rgba(192,57,43,0.08)' : 'none',
                transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace', color: '#f0ede8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                    {opp.domain}
                  </div>
                  <div style={{ fontSize:10, color: 'var(--v2-text-3)' }}>{opp.reason}</div>
                </div>
                <Tag text={opp.current_ca} color={CA_COLORS[opp.current_ca]||'var(--v2-text-3)'} bg={(CA_COLORS[opp.current_ca]||'var(--v2-text-3)')+'14'}/>
                <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{opp.current_product || '—'}</div>
                <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{fmt(opp.expires_at)}</div>
                <div style={{ fontSize:13, fontWeight: 800, color: '#4ade80' }}>
                  ${(opp.estimated_saving_usd || 0).toFixed(0)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => migrate(opp)}
                    style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5,
                      background: 'transparent', color: '#4ade80', border: '0.5px solid rgba(192,57,43,0.3)',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Zap size={8}/> Migrate
                  </button>
                  <button onClick={() => dismiss(i)}
                    style={{ fontSize: 9, fontWeight: 700, padding: '4px 7px', borderRadius: 5,
                      background: 'var(--v2-bg)', color: 'var(--v2-text-3)', border: '0.5px solid var(--v2-border)',
                      cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Duplicate domain findings */}
      {duplicates.length > 0 && (
        <>
          <div style={{ fontSize:13, fontWeight: 700, color: '#f0ede8', marginBottom: 10 }}>
            Duplicate domains across CAs
          </div>
          <Card>
            {duplicates.map((opp, i) => (
              <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < duplicates.length - 1 ? '0.5px solid rgba(192,57,43,0.08)' : 'none' }}>
                <AlertTriangle size={14} color="#e07060" style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize:12, fontWeight: 600, fontFamily: 'monospace', color: '#f0ede8' }}>{opp.domain}</span>
                  <span style={{ fontSize:11, color: 'var(--v2-text-3)', marginLeft: 8 }}>{opp.reason}</span>
                </div>
                <button onClick={() => dismiss(consolidation.length + i)}
                  style={{ fontSize: 9, fontWeight: 700, padding: '4px 7px', borderRadius: 5,
                    background: 'var(--v2-bg)', color: 'var(--v2-text-3)', border: '0.5px solid var(--v2-border)',
                    cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
              </div>
            ))}
          </Card>
        </>
      )}

      {opps.length === 0 && !loading && (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <DollarSign size={32} style={{ color: 'var(--v2-border)', display: 'block', margin: '0 auto 12px' }}/>
          <div style={{ fontSize:14, fontWeight: 600, color: 'var(--v2-text-3)', marginBottom: 6 }}>
            {result?.ok ? 'No consolidation opportunities found.' : 'Run analysis to find cost-saving opportunities.'}
          </div>
          {result?.ok && (
            <div style={{ fontSize:12, color: 'var(--v2-text-3)' }}>Your portfolio is already optimally consolidated.</div>
          )}
        </Card>
      )}
    </div>
  )
}

// ══ ROOT COMPONENT ════════════════════════════════════════════════════
export default function CertIntelligence({ nav }) {
  const [tok, setTok] = useState('')
  const [tab, setTab] = useState('timeline')

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
    { id: 'timeline',      label: 'Expiry Timeline',        icon: Activity,    color: '#f0ede8' },
    { id: 'shadow',        label: 'Shadow IT Scanner',      icon: Search,      color: '#f0ede8' },
    { id: 'consolidation', label: 'Consolidation Advisor',  icon: DollarSign,  color: '#4ade80' },
  ]

  return (
    <div style={{ background: 'linear-gradient(160deg,#f0f4f8,rgba(192,57,43,0.08))', minHeight: '100vh',
      fontFamily: "'Segoe UI',-apple-system,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0ede8',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="var(--v2-surface)" strokeWidth={2}/>
            </div>
            <h1 style={{ fontSize:22, fontWeight: 800, color: '#f0ede8', letterSpacing: '-0.5px', margin: 0 }}>
              CA Intelligence Suite
            </h1>
            <span style={{ fontSize:10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: 'transparent', color: '#4ade80', border: '0.5px solid rgba(192,57,43,0.3)' }}>
              Live
            </span>
          </div>
          <p style={{ fontSize:13, color: 'var(--v2-text-3)', margin: 0, maxWidth: 600 }}>
            Cross-CA expiry intelligence, shadow IT discovery, and cost consolidation — unified across all your connected certificate authorities.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--v2-surface)',
          border: '0.5px solid var(--v2-border)', borderRadius: 12, padding: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize:12, fontWeight: 600, transition: 'all .15s',
                background: tab === id ? color : 'transparent',
                color: tab === id ? 'var(--v2-surface)' : 'var(--v2-text-3)',
                boxShadow: tab === id ? `0 2px 8px ${color}33` : 'none' }}>
              <Icon size={13}/>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {!tok ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--v2-text-3)', fontSize:13 }}>
            Loading session…
          </div>
        ) : (
          <>
            {tab === 'timeline'      && <ExpiryTimeline tok={tok}/>}
            {tab === 'shadow'        && <ShadowScanner tok={tok} nav={nav}/>}
            {tab === 'consolidation' && <ConsolidationAdvisor tok={tok} nav={nav}/>}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
