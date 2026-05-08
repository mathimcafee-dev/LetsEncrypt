import { useState, useEffect } from 'react'
import { Shield, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, PlusCircle, Copy, Check, ChevronDown, ChevronUp, XCircle, Globe, Calendar, Key, Link, Hash, Server, Search, Filter, BarChart2, TrendingUp } from 'lucide-react'
import AgentInstall from '../components/AgentInstall'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, format } from 'date-fns'

function PendingDNSCard({ order, onIssued, onDelete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const checkAndIssue = async () => {
    setError(''); setLoading(true)
    try {
      const vRes = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', sessionId: order.session_id, domain: order.domain })
      })
      const vData = await vRes.json()
      if (!vData.verified) { setError(vData.message || 'DNS not propagated yet.'); setLoading(false); return }
      const fRes = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', sessionId: order.session_id, domain: order.domain, user_id: order.user_id })
      })
      const fData = await fRes.json()
      if (fData.ok) onIssued()
      else setError(fData.error || 'Failed to issue.')
    } catch(e) { setError(e.message) }
    setLoading(false)
  }
  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'14px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:'white', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Clock size={17} color='#d97706' />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontWeight:700, fontSize:13, fontFamily:'monospace', color:'#0f172a' }}>{order.domain}</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#d97706', background:'#fef3c7', borderRadius:4, padding:'2px 7px', border:'1px solid #fde68a' }}>PENDING DNS</span>
          </div>
          <p style={{ fontSize:11, color:'#92400e', marginBottom:order.challenge_key_auth?6:0 }}>Add TXT record _acme-challenge.{order.domain} to your DNS provider</p>
          {order.challenge_key_auth && (
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'white', borderRadius:5, padding:'5px 9px', border:'1px solid #fde68a', marginTop:4 }}>
              <span style={{ fontSize:10, color:'#92400e', fontWeight:700, flexShrink:0 }}>TXT:</span>
              <span style={{ fontFamily:'monospace', fontSize:10, color:'#0f172a', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{order.challenge_key_auth}</span>
              <button onClick={() => copy(order.challenge_key_auth)} style={{ background:'none', border:'none', cursor:'pointer', color:copied?'#16a34a':'#92400e', padding:1, flexShrink:0 }}>{copied?<Check size={12}/>:<Copy size={12}/>}</button>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:7, flexShrink:0 }}>
          <button onClick={checkAndIssue} disabled={loading} className='btn btn-primary btn-sm'>{loading?<><span className='spinner'/>Checking...</>:'⚡ Check DNS & Issue'}</button>
          <button onClick={onDelete} style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', borderRadius:6, padding:'5px 10px', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}><Trash2 size={11}/> Delete</button>
        </div>
      </div>
      {error && <div style={{ marginTop:8, fontSize:11, color:'#b45309', background:'rgba(217,119,6,0.08)', borderRadius:5, padding:'6px 10px' }}>{error}</div>}
    </div>
  )
}

function StatusBadge({ days, status }) {
  if (status==='revoked') return <span style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fef2f2', borderRadius:4, padding:'2px 8px', border:'1px solid #fecaca' }}>REVOKED</span>
  if (days<0) return <span style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fef2f2', borderRadius:4, padding:'2px 8px', border:'1px solid #fecaca' }}>EXPIRED</span>
  if (days<7) return <span style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fef2f2', borderRadius:4, padding:'2px 8px', border:'1px solid #fecaca' }}>CRITICAL</span>
  if (days<14) return <span style={{ fontSize:10, fontWeight:700, color:'#d97706', background:'#fffbeb', borderRadius:4, padding:'2px 8px', border:'1px solid #fde68a' }}>EXPIRING</span>
  if (days<30) return <span style={{ fontSize:10, fontWeight:700, color:'#d97706', background:'#fffbeb', borderRadius:4, padding:'2px 8px', border:'1px solid #fde68a' }}>RENEW SOON</span>
  return <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#f0fdf4', borderRadius:4, padding:'2px 8px', border:'1px solid #bbf7d0' }}>ACTIVE</span>
}

function CertRow({ cert, domain, isLatest, index, total, onDelete, onRenew, onInstall }) {
  const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
  const pct = Math.max(0,Math.min(100,(days/90)*100))
  const barColor = days<0?'#ef4444':days<14?'#f59e0b':'#22c55e'
  const dl = (content, filename) => { if(!content) return; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type:'text/plain'})); a.download=filename; a.click() }

  return (
    <div style={{ padding:'18px 24px', borderBottom:index<total-1?'1px solid #f1f5f9':'none', background:isLatest?'white':'#fafafa' }}>
      {/* Version label */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ width:7,height:7,borderRadius:'50%',background:isLatest?'#2563eb':'#94a3b8',flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:800, color:isLatest?'#2563eb':'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px' }}>
          {isLatest?'Latest Certificate':`Previous \u2014 Version ${total-index}`}
        </span>
        <StatusBadge days={days} status={cert.status} />
        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4 }}>Issued: {cert.issued_at?format(new Date(cert.issued_at),'MMM d, yyyy \u00b7 HH:mm'):'\u2014'}</span>
      </div>

      {/* Details grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
        {[
          ['Index',`#${index+1}`],
          ['Issued',cert.issued_at?format(new Date(cert.issued_at),'MMM d, yyyy'):'\u2014'],
          ['Expires',cert.expires_at?format(new Date(cert.expires_at),'MMM d, yyyy'):'\u2014'],
          ['Days Left',days>0?`${days} days`:days===0?'Today':`Expired`],
          ['Status',cert.status==='revoked'?'Revoked':days<0?'Expired':days<14?'Expiring':'Active'],
          ['Issuer',"Let's Encrypt"],
          ['Type',cert.staging?'Staging':'Production'],
          ['Key','RSA 2048-bit'],
        ].map(([label,value]) => (
          <div key={label} style={{ background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:7, padding:'8px 10px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {isLatest && cert.status!=='revoked' && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:4 }}>
            <span style={{ fontWeight:600 }}>Certificate Validity</span>
            <span style={{ color:barColor, fontWeight:700 }}>{pct.toFixed(0)}% remaining</span>
          </div>
          <div style={{ height:4, background:'#f1f5f9', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:2, transition:'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Expiry warnings */}
      {isLatest && cert.status!=='revoked' && days>=0 && days<14 && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'8px 12px', marginBottom:12, fontSize:11, color:'#92400e', display:'flex', alignItems:'center', gap:7 }}>
          <AlertTriangle size={12} color='#d97706'/> Expires in <strong>{days} days</strong>. Renew now to avoid service disruption.
        </div>
      )}
      {isLatest && cert.status!=='revoked' && days<0 && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'8px 12px', marginBottom:12, fontSize:11, color:'#991b1b', display:'flex', alignItems:'center', gap:7 }}>
          <XCircle size={12} color='#dc2626'/> Certificate expired. Renew immediately to restore HTTPS.
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
        {cert.cert_pem && (
          <>
            <button onClick={() => dl(cert.cert_pem,`${domain}-cert.pem`)} className='btn btn-secondary btn-sm'><Download size={11}/> cert.pem</button>
            <button onClick={() => dl(cert.private_key_pem,`${domain}-key.pem`)} className='btn btn-secondary btn-sm' disabled={!cert.private_key_pem}><Key size={11}/> key.pem</button>
            <button onClick={() => dl(cert.cert_pem,`${domain}-fullchain.pem`)} className='btn btn-secondary btn-sm'><Link size={11}/> fullchain.pem</button>
            <button onClick={() => { dl(cert.cert_pem,`${domain}-cert.pem`); setTimeout(()=>dl(cert.private_key_pem,`${domain}-key.pem`),200); setTimeout(()=>dl(cert.cert_pem,`${domain}-fullchain.pem`),400) }} className='btn btn-primary btn-sm'><Download size={11}/> All Files</button>
          </>
        )}
        {isLatest && cert.status!=='revoked' && (
          <>
            <div style={{ flex:1 }} />
            <button onClick={() => onRenew(domain)} className='btn btn-secondary btn-sm'><RefreshCw size={11}/> Renew</button>
            <button onClick={() => onInstall(cert)} className='btn btn-secondary btn-sm' style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb' }}><Server size={11}/> Install</button>
            {cert.agent_url && (
              <a href={cert.agent_url} target='_blank' rel='noopener noreferrer' style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:6, padding:'5px 9px', fontSize:11, fontWeight:600, textDecoration:'none' }}>\u25b6 Run Agent</a>
            )}
          </>
        )}
        <button onClick={() => onDelete(cert.id)} style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', borderRadius:6, padding:'5px 9px', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, marginLeft:isLatest&&cert.status!=='revoked'?0:'auto' }}>
          <Trash2 size={11}/> Remove
        </button>
      </div>
    </div>
  )
}

function DomainPanel({ index, domain, certs, onDelete, onRenew, onInstall }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...certs].sort((a,b) => new Date(b.issued_at||0)-new Date(a.issued_at||0))
  const latest = sorted[0]
  const days = latest?.expires_at ? differenceInDays(new Date(latest.expires_at), new Date()) : 0
  const pct = Math.max(0,Math.min(100,(days/90)*100))
  const barColor = days<0?'#ef4444':days<14?'#f59e0b':'#22c55e'

  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Row header */}
      <div onClick={() => setExpanded(e => !e)} style={{ display:'flex', alignItems:'center', gap:0, cursor:'pointer', background:expanded?'#f8fafc':'white', borderBottom:expanded?'1px solid #f1f5f9':'none' }}>
        {/* Status indicator */}
        <div style={{ width:4, alignSelf:'stretch', background:barColor, flexShrink:0 }} />
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:14, padding:'14px 20px' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:expanded?'#2563eb':'#f1f5f9', color:expanded?'white':'#64748b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{index}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            <Globe size={13} color='#2563eb' />
            <span style={{ fontWeight:700, fontSize:14, fontFamily:'monospace', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{domain}</span>
            <StatusBadge days={days} status={latest?.status} />
            {sorted.length>1 && <span style={{ fontSize:10, fontWeight:700, color:'#2563eb', background:'#eff6ff', borderRadius:4, padding:'2px 7px', border:'1px solid #bfdbfe' }}>{sorted.length} versions</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Expires</div>
              <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{latest?.expires_at?format(new Date(latest.expires_at),'MMM d, yyyy'):'\u2014'}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Days Left</div>
              <div style={{ fontSize:13, fontWeight:800, color:barColor }}>{days>0?days:days===0?'Today':'Expired'}</div>
            </div>
            <div style={{ width:80 }}>
              <div style={{ height:3, background:'#f1f5f9', borderRadius:2 }}>
                <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:2 }} />
              </div>
            </div>
            <div style={{ width:24, height:24, borderRadius:'50%', background:expanded?'#2563eb':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {expanded?<ChevronUp size={13} color='white'/>:<ChevronDown size={13} color='#64748b'/>}
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div>
          {sorted.map((cert,ci) => (
            <CertRow key={cert.id} cert={cert} domain={domain} isLatest={ci===0} index={ci} total={sorted.length} onDelete={onDelete} onRenew={onRenew} onInstall={onInstall} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [agentCert, setAgentCert] = useState(null)

  useEffect(() => { if(authLoading) return; if(!user){nav('/auth');return}; loadCerts() }, [user,authLoading])

  const loadCerts = async () => {
    setLoading(true)
    const { data: certsData } = await supabase.from('certificates').select('*').eq('user_id',user.id).order('issued_at',{ascending:false})
    const { data: pendingData } = await supabase.from('ssl_orders').select('*').eq('user_id',user.id).eq('status','pending_dns').order('updated_at',{ascending:false})
    const { data: ordersData } = await supabase.from('ssl_orders').select('*').eq('user_id',user.id).eq('status','issued').order('updated_at',{ascending:false})
    setPendingOrders(pendingData||[])
    const certSessions = new Set((certsData||[]).map(c=>c.session_id))
    const ordersAsCerts = (ordersData||[]).filter(o=>!certSessions.has(o.session_id)).map(o=>({
      id:o.id, user_id:o.user_id, session_id:o.session_id, domain:o.domain,
      cert_pem:o.cert_pem, private_key_pem:o.priv_key||o.account_key_pem,
      issued_at:o.updated_at, expires_at:o.expires_at||new Date(Date.now()+90*24*60*60*1000).toISOString(),
      status:'active', staging:o.staging||false
    }))
    const all = [...(certsData||[]),...ordersAsCerts]
    setCerts(all)
    for(const o of ordersAsCerts) {
      if(o.cert_pem) await supabase.from('certificates').upsert({user_id:o.user_id,session_id:o.session_id,domain:o.domain,cert_pem:o.cert_pem,private_key_pem:o.private_key_pem,issued_at:o.issued_at,expires_at:o.expires_at,status:'active'},{onConflict:'session_id'})
    }
    setLoading(false)
  }

  const deleteOrder = async (id) => {
    if(!confirm('Delete this pending request?')) return
    await supabase.from('ssl_orders').delete().eq('id',id)
    setPendingOrders(p=>p.filter(x=>x.id!==id))
  }

  const deleteCert = async (id) => {
    if(!confirm('Remove this certificate record? This cannot be undone.')) return
    await supabase.from('certificates').delete().eq('id',id)
    await supabase.from('ssl_orders').delete().eq('id',id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const handleRenew = (domain) => { sessionStorage.setItem('prefill_domain',domain); nav('/generate') }

  const grouped = certs.reduce((acc,cert) => { const d=cert.domain||'Unknown'; if(!acc[d]) acc[d]=[]; acc[d].push(cert); return acc }, {})
  const domains = Object.keys(grouped)

  const getLatest = (d) => {
    const sorted=[...grouped[d]].sort((a,b)=>new Date(b.issued_at||0)-new Date(a.issued_at||0))
    return sorted.find(c=>c.status==='active')||sorted[0]
  }

  const filteredDomains = domains.filter(d => {
    if(search && !d.toLowerCase().includes(search.toLowerCase())) return false
    const l=getLatest(d)
    const days=l?.expires_at?differenceInDays(new Date(l.expires_at),new Date()):0
    if(filter==='active') return days>=14 && l?.status!=='revoked'
    if(filter==='expiring') return days>=0&&days<14&&l?.status!=='revoked'
    if(filter==='expired') return days<0&&l?.status!=='revoked'
    return true
  })

  const stats = {
    total: domains.length,
    active: domains.filter(d=>{const l=getLatest(d);const days=l?.expires_at?differenceInDays(new Date(l.expires_at),new Date()):0;return days>=14&&l?.status!=='revoked'}).length,
    expiring: domains.filter(d=>{const l=getLatest(d);const days=l?.expires_at?differenceInDays(new Date(l.expires_at),new Date()):0;return days>=0&&days<14&&l?.status!=='revoked'}).length,
    expired: domains.filter(d=>{const l=getLatest(d);const days=l?.expires_at?differenceInDays(new Date(l.expires_at),new Date()):0;return days<0&&l?.status!=='revoked'}).length,
  }

  return (
    <div style={{ background:'#f8fafc', minHeight:'calc(100vh - 60px)' }}>
      {agentCert && <AgentInstall cert={agentCert} userId={user.id} onClose={() => setAgentCert(null)} />}

      {/* Page header */}
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'24px 0' }}>
        <div className='container'>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Shield size={18} color='white'/>
                </div>
                <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px', color:'#0f172a' }}>Certificate Inventory</h1>
              </div>
              <p style={{ color:'#64748b', fontSize:13, marginLeft:46 }}>Manage, monitor and deploy your SSL/TLS certificates</p>
            </div>
            <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', border:'none', padding:'10px 20px', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 10px rgba(37,99,235,0.3)' }}>
              <PlusCircle size={15}/> Issue Certificate
            </button>
          </div>
        </div>
      </div>

      <div className='container' style={{ padding:'28px 24px 80px' }}>

        {/* Stats cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            ['Total Certificates', stats.total, '#2563eb', 'all', BarChart2],
            ['Active', stats.active, '#16a34a', 'active', CheckCircle],
            ['Expiring \u003C 14d', stats.expiring, '#d97706', 'expiring', AlertTriangle],
            ['Expired', stats.expired, '#dc2626', 'expired', XCircle],
          ].map(([label,value,color,f,Icon]) => (
            <div key={label} onClick={() => setFilter(f)} style={{ background:'white', border:`1px solid ${filter===f?color:'#e2e8f0'}`, borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', cursor:'pointer', transition:'all 0.15s', borderTopWidth:filter===f?3:1 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={color} strokeWidth={2}/>
                </div>
                {filter===f && <div style={{ width:7, height:7, borderRadius:'50%', background:color, marginTop:4 }} />}
              </div>
              <div style={{ fontSize:30, fontWeight:800, color:color, lineHeight:1, marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {stats.expiring>0 && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <AlertTriangle size={15} color='#d97706'/>
            <span style={{ fontSize:13, color:'#92400e', fontWeight:600 }}>{stats.expiring} certificate{stats.expiring>1?'s':''} expiring within 14 days</span>
            <button onClick={() => setFilter('expiring')} style={{ marginLeft:'auto', fontSize:11, color:'#d97706', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:5, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>View</button>
          </div>
        )}
        {stats.expired>0 && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <XCircle size={15} color='#dc2626'/>
            <span style={{ fontSize:13, color:'#991b1b', fontWeight:600 }}>{stats.expired} certificate{stats.expired>1?'s':''} expired</span>
            <button onClick={() => setFilter('expired')} style={{ marginLeft:'auto', fontSize:11, color:'#dc2626', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:5, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>View</button>
          </div>
        )}

        {/* Pending DNS */}
        {pendingOrders.length>0 && (
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontWeight:700, fontSize:14, marginBottom:14, color:'#0f172a', display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={15} color='#d97706'/> Pending DNS Verification ({pendingOrders.length})
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pendingOrders.map(order => <PendingDNSCard key={order.id} order={order} onIssued={loadCerts} onDelete={() => deleteOrder(order.id)} />)}
            </div>
          </div>
        )}

        {/* Inventory table */}
        {domains.length>0 && (
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.05)', overflow:'hidden' }}>

            {/* Table toolbar */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h2 style={{ fontWeight:700, fontSize:14, color:'#0f172a', flex:1 }}>Certificate Inventory <span style={{ color:'#94a3b8', fontWeight:400, fontSize:13 }}>({filteredDomains.length} domain{filteredDomains.length!==1?'s':''})</span></h2>
              {/* Search */}
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search domains...' style={{ paddingLeft:30, width:200, fontSize:12, padding:'6px 10px 6px 28px', border:'1px solid #e2e8f0', borderRadius:7, background:'#f8fafc' }}/>
              </div>
              {/* Filters */}
              <div style={{ display:'flex', gap:5 }}>
                {[['all','All'],['active','Active'],['expiring','Expiring'],['expired','Expired']].map(([v,l]) => (
                  <button key={v} onClick={() => setFilter(v)} style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:6, border:`1px solid ${filter===v?'#2563eb':'#e2e8f0'}`, background:filter===v?'#eff6ff':'white', color:filter===v?'#2563eb':'#64748b', cursor:'pointer' }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display:'grid', gridTemplateColumns:'48px 28px 1fr 120px 130px 90px 100px 80px', gap:0, padding:'9px 20px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
              {['','#','Domain','Issuer','Expires','Days','Status',''].map((h,i) => (
                <div key={i} style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</div>
              ))}
            </div>

            {/* Domain rows */}
            {loading ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
                <span className='spinner spinner-dark' style={{ width:20, height:20, display:'block', margin:'0 auto 10px' }}/>
                <p style={{ fontSize:13 }}>Loading certificates...</p>
              </div>
            ) : filteredDomains.length===0 ? (
              <div style={{ textAlign:'center', padding:'48px 24px' }}>
                <Shield size={32} color='#e2e8f0' style={{ display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontWeight:600, color:'#64748b', fontSize:14 }}>{search?`No domains matching \u201c${search}\u201d`:`No ${filter!=='all'?filter+' ':''} certificates`}</p>
                {filter==='all'&&!search && <button onClick={() => nav('/generate')} style={{ marginTop:16, fontSize:12, color:'#2563eb', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:7, padding:'7px 16px', cursor:'pointer', fontWeight:600 }}>Issue First Certificate</button>}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {filteredDomains.map((domain,i) => (
                  <DomainPanel key={domain} index={i+1} domain={domain} certs={grouped[domain]} onDelete={deleteCert} onRenew={handleRenew} onInstall={cert => setAgentCert(cert)} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && domains.length===0 && pendingOrders.length===0 && (
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:'72px 24px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width:64, height:64, background:'linear-gradient(135deg,#eff6ff,#e0f2fe)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', border:'1px solid #bfdbfe' }}>
              <Shield size={30} color='#2563eb'/>
            </div>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:8, color:'#0f172a' }}>No Certificates Yet</h3>
            <p style={{ color:'#64748b', marginBottom:28, fontSize:14, maxWidth:360, margin:'0 auto 28px', lineHeight:1.6 }}>Issue your first SSL certificate to start building your certificate inventory.</p>
            <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', border:'none', padding:'12px 24px', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 12px rgba(37,99,235,0.3)' }}>
              <PlusCircle size={15}/> Issue Free Certificate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}