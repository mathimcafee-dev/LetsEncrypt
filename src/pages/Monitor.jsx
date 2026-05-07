import { useState, useEffect } from 'react'
import { Shield, Plus, RefreshCw, Trash2, Bell, AlertTriangle, CheckCircle, Clock, Globe, Search, Download, ExternalLink, Eye, ArrowRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, formatDistanceToNow, format } from 'date-fns'

function StatusBadge({ days }) {
  if (days < 0) return <span className="badge badge-red"><AlertTriangle size={10} /> Expired</span>
  if (days < 7) return <span className="badge badge-red"><AlertTriangle size={10} /> Critical</span>
  if (days < 14) return <span className="badge badge-yellow"><Clock size={10} /> Expiring Soon</span>
  if (days < 30) return <span className="badge badge-yellow"><Bell size={10} /> Renew Soon</span>
  return <span className="badge badge-green"><CheckCircle size={10} /> Active</span>
}

function AddModal({ onAdd, onClose }) {
  const [domain, setDomain] = useState('')
  const [threshold, setThreshold] = useState(30)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:28, width:440, boxShadow:'var(--shadow-lg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ fontWeight:700, fontSize:17, color:'var(--text)' }}>Monitor a Domain</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16}/></button>
        </div>
        <div style={{ marginBottom:16 }}>
          <label>Domain Name</label>
          <input placeholder="example.com or api.example.com" value={domain}
            onChange={e=>setDomain(e.target.value.replace(/^https?:\/\//,'').replace(/\/.*/,''))}
            onKeyDown={e=>e.key==='Enter'&&domain.trim()&&onAdd(domain.trim(),threshold)} autoFocus />
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:5 }}>We'll track this domain's SSL certificate expiry</p>
        </div>
        <div style={{ marginBottom:24 }}>
          <label>Alert threshold</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[7,14,30,60].map(d => (
              <button key={d} onClick={()=>setThreshold(d)} className={`btn btn-sm ${threshold===d?'btn-primary':'btn-secondary'}`}>{d} days</button>
            ))}
          </div>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>Alert when certificate expires within {threshold} days</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={()=>domain.trim()&&onAdd(domain.trim(),threshold)} style={{ flex:1, justifyContent:'center' }}>
            <Plus size={15}/> Add Domain
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CertDetailModal({ cert, onClose, onRenew }) {
  const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
  const pct = Math.max(0, Math.min(100, (days/90)*100))
  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}))
    a.download = filename; a.click()
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'85vh', overflow:'auto', boxShadow:'var(--shadow-lg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'var(--accent-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={20} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, fontFamily:'var(--mono)', color:'var(--text)' }}>{cert.domain}</div>
              <StatusBadge days={days} />
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16}/></button>
        </div>

        {/* Details grid */}
        <div style={{ background:'var(--bg)', borderRadius:10, padding:16, marginBottom:20 }}>
          {[
            ['Domain', cert.domain, true],
            ['Status', days >= 0 ? `Active — ${days} days remaining` : `Expired ${Math.abs(days)} days ago`, false],
            ['Issued', cert.issued_at ? format(new Date(cert.issued_at), 'PPP pp') : 'Unknown', false],
            ['Expires', cert.expires_at ? format(new Date(cert.expires_at), 'PPP') : 'Unknown', false],
          ].map(([k,v,mono]) => (
            <div key={k} style={{ display:'flex', gap:16, padding:'8px 0', borderBottom:'1px solid var(--border2)', fontSize:13 }}>
              <span style={{ color:'var(--text3)', fontWeight:600, minWidth:80, flexShrink:0 }}>{k}</span>
              <span style={{ color:'var(--text)', fontFamily:mono?'var(--mono)':'inherit', fontWeight:mono?600:400 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Expiry bar */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:8 }}>
            <span>Certificate health</span>
            <span style={{ fontWeight:700, color: days < 14 ? 'var(--red)' : days < 30 ? 'var(--yellow)' : 'var(--green)' }}>
              {days > 0 ? `${days} days left` : `Expired ${Math.abs(days)} days ago`}
            </span>
          </div>
          <div style={{ height:8, background:'var(--bg2)', borderRadius:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, background: days < 14 ? 'var(--red)' : days < 30 ? 'var(--yellow)' : 'var(--green)', borderRadius:4, transition:'width 0.3s' }} />
          </div>
        </div>

        {/* Download buttons */}
        {(cert.cert_pem || cert.private_key_pem) && (
          <div style={{ marginBottom:20 }}>
            <label>Download Files</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {cert.cert_pem && <button className="btn btn-secondary btn-sm" onClick={()=>download(cert.cert_pem,`${cert.domain}-cert.pem`)}><Download size={13}/> cert.pem</button>}
              {cert.private_key_pem && <button className="btn btn-secondary btn-sm" onClick={()=>download(cert.private_key_pem,`${cert.domain}-key.pem`)}><Download size={13}/> key.pem</button>}
              {cert.cert_pem && <button className="btn btn-secondary btn-sm" onClick={()=>download(cert.cert_pem,`${cert.domain}-fullchain.pem`)}><Download size={13}/> fullchain.pem</button>}
            </div>
          </div>
        )}

        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={()=>onRenew(cert.domain)}>
          <RefreshCw size={15}/> Request New Certificate for {cert.domain}
        </button>
      </div>
    </div>
  )
}

function MonitoredDomainRow({ m, onScan, onDelete, onRequestCert, scanning }) {
  const [details, setDetails] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)

  const scan = async () => {
    setLoading(true)
    const result = await onScan(m.domain)
    if (result) setDetails(result)
    setLoading(false)
  }

  const daysLeft = m.last_days_left
  const hasScanned = m.last_scanned_at

  return (
    <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow)' }}>
      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px' }}>
        <div style={{ width:40, height:40, borderRadius:10, background: !hasScanned ? 'var(--bg2)' : daysLeft < 0 ? 'var(--red-light)' : daysLeft < 14 ? 'var(--yellow-light)' : 'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Globe size={18} color={ !hasScanned ? 'var(--text3)' : daysLeft < 0 ? 'var(--red)' : daysLeft < 14 ? 'var(--yellow)' : 'var(--green)'} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--mono)', color:'var(--text)' }}>{m.domain}</span>
            {hasScanned && daysLeft !== null && <StatusBadge days={daysLeft} />}
            {!hasScanned && <span className="badge" style={{ background:'var(--bg2)', color:'var(--text3)', border:'1px solid var(--border)' }}>Not scanned yet</span>}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>
            Alert at {m.alert_threshold_days} days · {hasScanned ? `Last scanned ${formatDistanceToNow(new Date(m.last_scanned_at), {addSuffix:true})}` : 'Click Scan to check certificate'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={scan} className="btn btn-secondary btn-sm" disabled={loading || scanning}>
            {loading || scanning ? <span className="spinner spinner-dark" /> : <RefreshCw size={13}/>}
            {loading || scanning ? 'Scanning...' : 'Scan'}
          </button>
          {hasScanned && <button onClick={()=>setExpanded(!expanded)} className="btn btn-secondary btn-sm"><Eye size={13}/> Details</button>}
          <a href={`https://${m.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={13}/></a>
          <button onClick={()=>onDelete(m.id)} style={{ background:'var(--red-light)', border:'1px solid var(--red-border)', color:'var(--red)', cursor:'pointer', borderRadius:'var(--radius-sm)', padding:'6px 10px', display:'flex', alignItems:'center' }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasScanned && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'16px 20px', background:'var(--bg)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
            {[
              ['Domain', m.domain, true],
              ['Days Left', daysLeft !== null ? `${daysLeft} days` : 'Unknown', false],
              ['Last Scanned', m.last_scanned_at ? format(new Date(m.last_scanned_at), 'MMM d, yyyy HH:mm') : 'Never', false],
              ['Cert Start', m.cert_start ? format(new Date(m.cert_start), 'MMM d, yyyy') : 'Not scanned', false],
              ['Cert Expiry', m.cert_expiry ? format(new Date(m.cert_expiry), 'MMM d, yyyy') : 'Not scanned', false],
              ['Issuer', m.issuer || 'Not scanned', false],
              ['Alert At', `${m.alert_threshold_days} days before expiry`, false],
            ].map(([k,v,mono]) => (
              <div key={k} style={{ background:'white', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:mono?'var(--mono)':'inherit' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Expiry progress */}
          {daysLeft !== null && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                <span style={{ color:'var(--text3)' }}>Certificate health</span>
                <span style={{ fontWeight:700, color: daysLeft < 14 ? 'var(--red)' : daysLeft < 30 ? 'var(--yellow)' : 'var(--green)' }}>
                  {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                </span>
              </div>
              <div style={{ height:6, background:'var(--bg2)', borderRadius:3 }}>
                <div style={{ height:'100%', width:`${Math.max(0,Math.min(100,(daysLeft/90)*100))}%`, background: daysLeft < 14 ? 'var(--red)' : daysLeft < 30 ? 'var(--yellow)' : 'var(--green)', borderRadius:3 }} />
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={()=>onRequestCert(m.domain)}>
            <Shield size={13}/> Request New Certificate for this Domain <ArrowRight size={13}/>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Monitor() {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [monitored, setMonitored] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedCert, setSelectedCert] = useState(null)
  const [scanning, setScanning] = useState({})
  const [sortBy, setSortBy] = useState('expires')

  useEffect(() => {
    if (!authLoading && user) loadAll()
    if (!authLoading && !user) setLoading(false)
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    const { data: certsData } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    const { data: ordersData } = await supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'issued').order('updated_at', { ascending: false })
    const certSessions = new Set((certsData||[]).map(c=>c.session_id))
    const ordersAsCerts = (ordersData||[]).filter(o=>!certSessions.has(o.session_id)).map(o=>({
      id:o.id, user_id:o.user_id, session_id:o.session_id,
      domain:o.domain, cert_pem:o.cert_pem, private_key_pem:o.priv_key,
      issued_at:o.updated_at, expires_at:o.expires_at||new Date(Date.now()+90*24*60*60*1000).toISOString(),
      status:'active'
    }))
    const { data: monData } = await supabase.from('monitored_domains').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCerts([...(certsData||[]), ...ordersAsCerts])
    setMonitored(monData||[])
    setLoading(false)
  }

  const addMonitored = async (domain, threshold) => {
    const { error } = await supabase.from('monitored_domains').upsert({
      user_id: user.id, domain, alert_threshold_days: threshold,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,domain' })
    if (!error) { setShowAdd(false); await loadAll() }
  }

  const removeMonitored = async (id) => {
    if (!confirm('Remove this domain from monitoring?')) return
    await supabase.from('monitored_domains').delete().eq('id', id)
    setMonitored(m => m.filter(x => x.id !== id))
  }

  const scanDomain = async (domain) => {
    setScanning(s => ({ ...s, [domain]: true }))
    try {
      // Call our Supabase edge function which handles CORS and multiple APIs
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, user_id: user.id, session_id: user.id + '_' + domain })
      })
      const data = await res.json()
      console.log('scan result:', data)

      if (!data.error) {
        // Update local state immediately
        setMonitored(m => m.map(item =>
          item.domain === domain ? {
            ...item,
            last_scanned_at: data.scannedAt,
            last_alive: data.alive,
            last_days_left: data.daysLeft,
            cert_start: data.certStart,
            cert_expiry: data.certExpiry,
            issuer: data.issuer,
          } : item
        ))
        return data
      }
    } catch(e) {
      console.error('Scan error:', e)
    }
    setScanning(s => ({ ...s, [domain]: false }))
    return null
  }

  const [bulkScanning, setBulkScanning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')

  const bulkScan = async () => {
    if (!monitored.length) return
    setBulkScanning(true)
    setBulkProgress(`Scanning ${monitored.length} domains...`)
    try {
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, user_id: user.id })
      })
      const data = await res.json()
      if (data.ok) {
        setBulkProgress(`✅ Scanned ${data.scanned} domains successfully`)
        await loadAll()
        setTimeout(() => setBulkProgress(''), 3000)
      }
    } catch(e) {
      setBulkProgress('❌ Scan failed')
      setTimeout(() => setBulkProgress(''), 3000)
    }
    setBulkScanning(false)
  }

  const requestCertForDomain = (domain) => {
    // Store domain in sessionStorage and navigate to generate
    sessionStorage.setItem('prefill_domain', domain)
    window.location.href = '/generate'
  }

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate?')) return
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}))
    a.download = filename; a.click()
  }

  const getStatus = (cert) => {
    const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
    if (days < 0) return 'expired'
    if (days < 14) return 'expiring'
    return 'active'
  }

  const filteredCerts = certs
    .filter(c => {
      if (search && !c.domain?.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'active') return getStatus(c) === 'active'
      if (filter === 'expiring') return getStatus(c) === 'expiring'
      if (filter === 'expired') return getStatus(c) === 'expired'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'expires') return new Date(a.expires_at||0) - new Date(b.expires_at||0)
      if (sortBy === 'domain') return (a.domain||'').localeCompare(b.domain||'')
      return new Date(b.issued_at||0) - new Date(a.issued_at||0)
    })

  const stats = {
    total: certs.length,
    active: certs.filter(c => getStatus(c) === 'active').length,
    expiring: certs.filter(c => getStatus(c) === 'expiring').length,
    expired: certs.filter(c => getStatus(c) === 'expired').length,
  }

  if (!authLoading && !user) return (
    <div className="container" style={{ padding:'80px 24px', textAlign:'center' }}>
      <div style={{ width:64, height:64, background:'var(--accent-light)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <Shield size={28} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:8, color:'var(--text)' }}>Sign in to Monitor Certificates</h2>
      <p style={{ color:'var(--text2)', marginBottom:24 }}>Track expiry dates, get alerts, and manage all your SSL certificates.</p>
      <button onClick={() => window.location.href='/auth'} className="btn btn-primary btn-lg">Sign In to Continue</button>
    </div>
  )

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container">
        {showAdd && <AddModal onAdd={addMonitored} onClose={() => setShowAdd(false)} />}
        {selectedCert && <CertDetailModal cert={selectedCert} onClose={() => setSelectedCert(null)} onRenew={requestCertForDomain} />}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4, color:'var(--text)' }}>Certificate Monitor</h1>
            <p style={{ color:'var(--text2)', fontSize:14 }}>Track expiry, manage certificates and monitor external domains</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowAdd(true)} className="btn btn-secondary"><Plus size={15}/> Monitor Domain</button>
            <button onClick={() => window.location.href='/generate'} className="btn btn-primary"><Plus size={15}/> New Certificate</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
          {[['Total',stats.total,'var(--accent)','var(--accent-light)'],
            ['Active',stats.active,'var(--green)','var(--green-light)'],
            ['Expiring',stats.expiring,'var(--yellow)','var(--yellow-light)'],
            ['Expired',stats.expired,'var(--red)','var(--red-light)'],
          ].map(([label,value,color,bg]) => (
            <div key={label} style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px', boxShadow:'var(--shadow)' }}>
              <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {stats.expiring > 0 && (
          <div className="alert alert-warning" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <Bell size={15}/>
            <span><strong>{stats.expiring} certificate{stats.expiring>1?'s':''}</strong> expiring within 14 days.</span>
            <button onClick={()=>setFilter('expiring')} className="btn btn-sm" style={{ marginLeft:'auto', background:'var(--yellow-light)', border:'1px solid var(--yellow-border)', color:'var(--yellow)', cursor:'pointer', padding:'4px 10px', borderRadius:6, fontWeight:600, fontSize:12 }}>View</button>
          </div>
        )}
        {stats.expired > 0 && (
          <div className="alert alert-error" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <AlertTriangle size={15}/>
            <span><strong>{stats.expired} certificate{stats.expired>1?'s':''}</strong> already expired. Renew immediately.</span>
            <button onClick={()=>setFilter('expired')} className="btn btn-sm" style={{ marginLeft:'auto', background:'var(--red-light)', border:'1px solid var(--red-border)', color:'var(--red)', cursor:'pointer', padding:'4px 10px', borderRadius:6, fontWeight:600, fontSize:12 }}>View</button>
          </div>
        )}

        {/* Issued Certificates */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <h2 style={{ fontWeight:700, fontSize:17, color:'var(--text)' }}>Issued Certificates</h2>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
                <input placeholder="Search domain..." value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ paddingLeft:30, width:180, padding:'7px 10px 7px 30px', fontSize:13 }} />
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[['all','All'],['active','Active'],['expiring','Expiring'],['expired','Expired']].map(([v,l]) => (
                  <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-secondary'}`}>{l}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'7px 12px', fontSize:13, width:'auto' }}>
                <option value="expires">By Expiry</option>
                <option value="domain">By Domain</option>
                <option value="issued">By Issued</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text3)' }}>
              <span className="spinner spinner-dark" style={{ width:24, height:24, marginBottom:12, display:'block', margin:'0 auto 12px' }} />
              <p>Loading certificates...</p>
            </div>
          ) : filteredCerts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text3)' }}>
              <Shield size={36} style={{ margin:'0 auto 12px', opacity:0.3 }} color="var(--text3)" />
              <p style={{ fontWeight:600, color:'var(--text2)', marginBottom:6 }}>{search||filter!=='all'?'No certificates match your filter':'No certificates yet'}</p>
              {!search && filter==='all' && <button onClick={()=>window.location.href='/generate'} className="btn btn-primary btn-sm" style={{ marginTop:12 }}>Generate Your First Certificate</button>}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filteredCerts.map(cert => {
                const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
                const pct = Math.max(0, Math.min(100, (days/90)*100))
                const color = days < 0 ? 'var(--red)' : days < 14 ? 'var(--yellow)' : 'var(--green)'
                const bgColor = days < 0 ? 'var(--red-light)' : days < 14 ? 'var(--yellow-light)' : 'var(--green-light)'
                return (
                  <div key={cert.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:bgColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Shield size={18} color={color} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--mono)', color:'var(--text)' }}>{cert.domain}</span>
                        <StatusBadge days={days} />
                      </div>
                      <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--text3)', marginBottom:8 }}>
                        <span>Issued: {cert.issued_at ? formatDistanceToNow(new Date(cert.issued_at),{addSuffix:true}) : '—'}</span>
                        <span>Expires: {cert.expires_at ? format(new Date(cert.expires_at),'MMM d, yyyy') : '—'} · {days > 0 ? `${days} days left` : `${Math.abs(days)} days ago`}</span>
                      </div>
                      <div style={{ height:4, background:'var(--border)', borderRadius:2, maxWidth:280 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2 }} />
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button onClick={()=>setSelectedCert(cert)} className="btn btn-secondary btn-sm"><Eye size={13}/> View</button>
                      {cert.cert_pem && <button onClick={()=>download(cert.cert_pem,`${cert.domain}-cert.pem`)} className="btn btn-secondary btn-sm"><Download size={13}/></button>}
                      <button onClick={()=>requestCertForDomain(cert.domain)} className="btn btn-secondary btn-sm"><RefreshCw size={13}/> Renew</button>
                      <button onClick={()=>deleteCert(cert.id)} style={{ background:'var(--red-light)', border:'1px solid var(--red-border)', color:'var(--red)', cursor:'pointer', borderRadius:6, padding:'6px 10px', display:'flex', alignItems:'center' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Monitored Domains */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h2 style={{ fontWeight:700, fontSize:17, color:'var(--text)', marginBottom:4 }}>Monitored Domains</h2>
              <p style={{ color:'var(--text3)', fontSize:13 }}>Track SSL certificates on any external domain</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {bulkProgress && <span style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>{bulkProgress}</span>}
            {monitored.length > 0 && (
              <button onClick={bulkScan} disabled={bulkScanning} className="btn btn-secondary btn-sm">
                {bulkScanning ? <><span className="spinner spinner-dark" /> Scanning all...</> : <><RefreshCw size={13}/> Scan All</>}
              </button>
            )}
            <button onClick={()=>setShowAdd(true)} className="btn btn-secondary btn-sm"><Plus size={13}/> Add Domain</button>
          </div>
          </div>

          {monitored.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)' }}>
              <Globe size={32} style={{ margin:'0 auto 12px', opacity:0.3 }} color="var(--text3)" />
              <p style={{ fontWeight:600, color:'var(--text2)', marginBottom:6 }}>No domains monitored yet</p>
              <p style={{ fontSize:13, marginBottom:16 }}>Add any domain to track its SSL certificate expiry date</p>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {bulkProgress && <span style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>{bulkProgress}</span>}
            {monitored.length > 0 && (
              <button onClick={bulkScan} disabled={bulkScanning} className="btn btn-secondary btn-sm">
                {bulkScanning ? <><span className="spinner spinner-dark" /> Scanning all...</> : <><RefreshCw size={13}/> Scan All</>}
              </button>
            )}
            <button onClick={()=>setShowAdd(true)} className="btn btn-secondary btn-sm"><Plus size={13}/> Add Domain</button>
          </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {monitored.map(m => (
                <MonitoredDomainRow
                  key={m.id}
                  m={m}
                  onScan={scanDomain}
                  onDelete={removeMonitored}
                  onRequestCert={requestCertForDomain}
                  scanning={scanning[m.domain]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
