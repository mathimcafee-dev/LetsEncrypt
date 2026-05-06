import { useState, useEffect } from 'react'
import { Shield, Plus, RefreshCw, Trash2, Bell, BellOff, AlertTriangle, CheckCircle, Clock, Globe, Search, Download, ExternalLink, ChevronDown, ChevronUp, Eye } from 'lucide-react'
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width:440, boxShadow:'0 30px 80px rgba(0,0,0,0.4)' }}>
        <h3 style={{ fontWeight:700, fontSize:18, marginBottom:20 }}>Add Domain to Monitor</h3>
        <div style={{ marginBottom:16 }}>
          <label>Domain / Hostname</label>
          <input placeholder="example.com or api.example.com" value={domain} onChange={e=>setDomain(e.target.value)} onKeyDown={e=>e.key==='Enter'&&domain.trim()&&onAdd(domain.trim(),threshold)} autoFocus />
        </div>
        <div style={{ marginBottom:24 }}>
          <label>Alert me when expiry is within</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
            {[7,14,30,60,90].map(d => (
              <button key={d} onClick={()=>setThreshold(d)} className={`btn btn-sm ${threshold===d?'btn-primary':'btn-secondary'}`}>{d} days</button>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-primary" onClick={()=>domain.trim()&&onAdd(domain.trim(),threshold)} style={{ flex:1, justifyContent:'center' }}>Add Domain</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CertDetail({ cert, onClose }) {
  const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}))
    a.download = filename; a.click()
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="card" style={{ width:'100%', maxWidth:600, maxHeight:'80vh', overflow:'auto', boxShadow:'0 30px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ fontWeight:700, fontSize:18 }}>Certificate Details</h3>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:12, background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:16, marginBottom:16 }}>
          {[
            ['Domain', cert.domain],
            ['Status', days >= 0 ? `Active (${days} days left)` : `Expired ${Math.abs(days)} days ago`],
            ['Issued', cert.issued_at ? format(new Date(cert.issued_at), 'PPP') : 'Unknown'],
            ['Expires', cert.expires_at ? format(new Date(cert.expires_at), 'PPP') : 'Unknown'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', gap:16, marginBottom:8 }}>
              <span style={{ color:'var(--text3)', minWidth:80 }}>{k}</span>
              <span style={{ color:'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>
        {cert.cert_pem && (
          <div style={{ marginBottom:16 }}>
            <h4 style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>Certificate (cert.pem)</h4>
            <div className="output-box" style={{ maxHeight:120, overflow:'auto', marginBottom:8 }}>{cert.cert_pem.slice(0,200)}...</div>
            <button className="btn btn-primary btn-sm" onClick={()=>download(cert.cert_pem,`${cert.domain}-cert.pem`)}><Download size={14}/> Download cert.pem</button>
          </div>
        )}
        {cert.private_key_pem && (
          <div>
            <h4 style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>Private Key</h4>
            <div className="alert alert-warning" style={{ marginBottom:8, fontSize:12 }}>⚠ Never share your private key</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>download(cert.private_key_pem,`${cert.domain}-key.pem`)}><Download size={14}/> Download key.pem</button>
          </div>
        )}
      </div>
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
    // Load issued certificates
    const { data: certsData } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    // Load from ssl_orders as fallback
    const { data: ordersData } = await supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'issued').order('updated_at', { ascending: false })
    const certSessions = new Set((certsData||[]).map(c=>c.session_id))
    const ordersAsCerts = (ordersData||[]).filter(o=>!certSessions.has(o.session_id)).map(o=>({
      id:o.id, user_id:o.user_id, session_id:o.session_id,
      domain:o.domain, cert_pem:o.cert_pem, private_key_pem:o.account_key_pem,
      issued_at:o.updated_at, expires_at:o.expires_at||new Date(Date.now()+90*24*60*60*1000).toISOString(),
      status:'active'
    }))
    // Load monitored domains
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
    else { alert('Error: ' + error.message) }
  }

  const removeMonitored = async (id) => {
    if (!confirm('Remove this domain from monitoring?')) return
    await supabase.from('monitored_domains').delete().eq('id', id)
    setMonitored(m => m.filter(x => x.id !== id))
  }

  const scanDomain = async (domain) => {
    setScanning(s => ({ ...s, [domain]: true }))
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`)
      const dns = await res.json()
      const alive = dns.Status === 0 && dns.Answer?.length > 0
      await supabase.from('monitored_domains').update({ last_scanned_at: new Date().toISOString(), last_alive: alive }).eq('user_id', user.id).eq('domain', domain)
      await loadAll()
    } catch(e) {}
    setScanning(s => ({ ...s, [domain]: false }))
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
      <Shield size={48} color="var(--text3)" style={{ margin:'0 auto 20px' }} />
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Sign in to Monitor Certificates</h2>
      <p style={{ color:'var(--text3)', marginBottom:24 }}>Track expiry, get alerts, and manage all your SSL certificates in one place.</p>
      <button onClick={() => window.location.href='/auth'} className="btn btn-primary btn-lg">Sign In</button>
    </div>
  )

  return (
    <div className="container" style={{ padding:'40px 24px 80px' }}>
      {showAdd && <AddModal onAdd={addMonitored} onClose={() => setShowAdd(false)} />}
      {selectedCert && <CertDetail cert={selectedCert} onClose={() => setSelectedCert(null)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>Certificate Monitor</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Track expiry dates, manage certificates and monitor your domains</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => setShowAdd(true)} className="btn btn-secondary">
            <Plus size={16} /> Monitor Domain
          </button>
          <button onClick={() => window.location.href='/generate'} className="btn btn-primary">
            <Plus size={16} /> New Certificate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32 }}>
        {[
          { label:'Total Certs', value:stats.total, color:'var(--accent)' },
          { label:'Active', value:stats.active, color:'var(--green)' },
          { label:'Expiring Soon', value:stats.expiring, color:'var(--yellow)' },
          { label:'Expired', value:stats.expired, color:'var(--red)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:20, textAlign:'center' }}>
            <div style={{ fontSize:36, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {stats.expiring > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
          <Bell size={16} />
          <span><strong>{stats.expiring} certificate{stats.expiring>1?'s':''}</strong> expiring within 14 days. Renew them to avoid downtime.</span>
          <button onClick={() => setFilter('expiring')} className="btn btn-sm btn-secondary" style={{ marginLeft:'auto' }}>View →</button>
        </div>
      )}
      {stats.expired > 0 && (
        <div className="alert alert-error" style={{ marginBottom:24, display:'flex', alignItems:'center', gap:12 }}>
          <AlertTriangle size={16} />
          <span><strong>{stats.expired} certificate{stats.expired>1?'s':''}</strong> already expired. Renew immediately.</span>
          <button onClick={() => setFilter('expired')} className="btn btn-sm btn-secondary" style={{ marginLeft:'auto' }}>View →</button>
        </div>
      )}

      {/* Issued Certificates */}
      <div className="card" style={{ marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <h2 style={{ fontWeight:700, fontSize:18 }}>Issued Certificates</h2>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {/* Search */}
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} />
              <input placeholder="Search domain..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ paddingLeft:32, width:180, padding:'8px 8px 8px 32px', fontSize:13 }} />
            </div>
            {/* Filter */}
            <div style={{ display:'flex', gap:6 }}>
              {[['all','All'],['active','Active'],['expiring','Expiring'],['expired','Expired']].map(([v,l]) => (
                <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-secondary'}`}>{l}</button>
              ))}
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'8px 12px', fontSize:13, width:'auto' }}>
              <option value="expires">Sort: Expiry</option>
              <option value="domain">Sort: Domain</option>
              <option value="issued">Sort: Issued</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)' }}>
            <span className="spinner" style={{ borderTopColor:'var(--accent)', width:24, height:24 }} />
            <p style={{ marginTop:12 }}>Loading certificates...</p>
          </div>
        ) : filteredCerts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)' }}>
            <Shield size={36} style={{ margin:'0 auto 12px', opacity:0.4 }} />
            <p style={{ fontWeight:600, marginBottom:6 }}>{search || filter !== 'all' ? 'No certificates match your filter' : 'No certificates yet'}</p>
            <p style={{ fontSize:13 }}>{!search && filter === 'all' && 'Generate your first SSL certificate to get started'}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filteredCerts.map(cert => {
              const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
              const pct = Math.max(0, Math.min(100, (days/90)*100))
              const barColor = days < 0 ? 'var(--red)' : days < 14 ? 'var(--yellow)' : 'var(--green)'
              return (
                <div key={cert.id} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'16px 20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:`rgba(${days<0?'248,113,113':days<14?'251,191,36':'52,211,153'},0.1)`, border:`1px solid rgba(${days<0?'248,113,113':days<14?'251,191,36':'52,211,153'},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Shield size={20} color={days<0?'var(--red)':days<14?'var(--yellow)':'var(--green)'} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:15, fontFamily:'var(--mono)' }}>{cert.domain}</span>
                          <StatusBadge days={days} />
                        </div>
                        <div style={{ display:'flex', gap:20, fontSize:12, color:'var(--text3)', marginBottom:8 }}>
                          <span>Issued: {cert.issued_at ? formatDistanceToNow(new Date(cert.issued_at), {addSuffix:true}) : 'Unknown'}</span>
                          <span>Expires: {cert.expires_at ? format(new Date(cert.expires_at),'MMM d, yyyy') : 'Unknown'} · {days>0?`${days} days left`:`${Math.abs(days)} days ago`}</span>
                        </div>
                        {/* Expiry bar */}
                        <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden', maxWidth:300 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:2, transition:'width 0.3s' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button onClick={()=>setSelectedCert(cert)} className="btn btn-secondary btn-sm" title="View Details"><Eye size={14}/></button>
                      {cert.cert_pem && <button onClick={()=>download(cert.cert_pem,`${cert.domain}-cert.pem`)} className="btn btn-secondary btn-sm" title="Download"><Download size={14}/></button>}
                      <button onClick={()=>window.location.href='/generate'} className="btn btn-secondary btn-sm" title="Renew"><RefreshCw size={14}/></button>
                      <button onClick={()=>deleteCert(cert.id)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:'var(--red)', cursor:'pointer', borderRadius:'var(--radius-sm)', padding:'6px 10px', display:'flex', alignItems:'center' }}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Monitored Domains */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontWeight:700, fontSize:18, marginBottom:4 }}>Monitored Domains</h2>
            <p style={{ color:'var(--text3)', fontSize:13 }}>External domains to watch for SSL expiry</p>
          </div>
          <button onClick={()=>setShowAdd(true)} className="btn btn-secondary btn-sm"><Plus size={14}/> Add Domain</button>
        </div>

        {monitored.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>
            <Globe size={32} style={{ margin:'0 auto 12px', opacity:0.4 }} />
            <p style={{ fontWeight:600, marginBottom:6 }}>No domains monitored yet</p>
            <p style={{ fontSize:13, marginBottom:16 }}>Add any domain to track its SSL certificate expiry</p>
            <button onClick={()=>setShowAdd(true)} className="btn btn-secondary btn-sm"><Plus size={14}/> Add Domain</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {monitored.map(m => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Globe size={18} color="var(--accent)" />
                  <div>
                    <span style={{ fontWeight:600, fontSize:14, fontFamily:'var(--mono)' }}>{m.domain}</span>
                    <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
                      Alert at {m.alert_threshold_days} days · {m.last_scanned_at ? `Last scanned ${formatDistanceToNow(new Date(m.last_scanned_at), {addSuffix:true})}` : 'Never scanned'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <a href={`https://${m.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={14}/></a>
                  <button onClick={()=>scanDomain(m.domain)} className="btn btn-secondary btn-sm" disabled={scanning[m.domain]}>
                    {scanning[m.domain] ? <span className="spinner" /> : <RefreshCw size={14}/>}
                  </button>
                  <button onClick={()=>removeMonitored(m.id)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:'var(--red)', cursor:'pointer', borderRadius:'var(--radius-sm)', padding:'6px 10px', display:'flex', alignItems:'center' }}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
