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

function DashboardPreview({ nav }) {
  const sample = [
    { domain: 'api.acme.io',     issuer: "Let's Encrypt R3", days: 78, status: 'healthy' },
    { domain: '*.shop.example',  issuer: "Let's Encrypt R3", days: 22, status: 'caution' },
    { domain: 'portal.acme.com', issuer: "Let's Encrypt R3", days: 6,  status: 'warning' },
    { domain: 'mail.acme.com',   issuer: "Let's Encrypt R3", days: 64, status: 'healthy' },
  ]
  const colors = {
    healthy: { c:'#059669', bg:'#ecfdf5', label:'Active'   },
    caution: { c:'#d97706', bg:'#fffbeb', label:'Renew Soon' },
    warning: { c:'#dc2626', bg:'#fef2f2', label:'Expiring' },
  }

  return (
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      <div style={{ position:'relative', maxWidth:1140, margin:'0 auto', padding:'72px 24px 64px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:20, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Inventory Dashboard · Preview</span>
          </div>
          <h1 style={{ fontSize:42, fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-1.8px', marginBottom:8 }}>Every certificate.</h1>
          <h1 style={{ fontSize:42, fontWeight:900, lineHeight:1.06, letterSpacing:'-1.8px', marginBottom:14, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>One inventory.</h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, maxWidth:520, margin:'0 auto' }}>
            Sign in to see your real certificates here. Below is a preview of what your inventory looks like.
          </p>
        </div>

        <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, boxShadow:'0 24px 60px rgba(15,23,42,0.08)', overflow:'hidden', position:'relative' }}>
          {/* Soft overlay gradient */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent 50%,rgba(255,255,255,0.85) 100%)', pointerEvents:'none', zIndex:2 }} />

          <div style={{ padding:'24px 28px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', letterSpacing:'-0.5px' }}>Certificate Inventory</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>4 certificates · 1 expiring soon · last sync just now</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ background:'white', border:'1.5px solid #e2e8f0', color:'#64748b', padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'not-allowed', display:'inline-flex', alignItems:'center', gap:5 }}><RefreshCw size={12}/> Bulk scan</button>
              <button style={{ background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', border:'none', color:'white', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'not-allowed', display:'inline-flex', alignItems:'center', gap:5, opacity:0.9 }}><PlusCircle size={12}/> New Certificate</button>
            </div>
          </div>

          <div style={{ padding:'18px 28px', borderBottom:'1px solid #f1f5f9', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { v:4, l:'Total',    c:'#2563eb' },
              { v:3, l:'Active',   c:'#059669' },
              { v:1, l:'Expiring', c:'#d97706' },
              { v:0, l:'Expired',  c:'#dc2626' },
            ].map(s => (
              <div key={s.l} style={{ background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:26, fontWeight:900, color:s.c, letterSpacing:'-0.7px', lineHeight:1 }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:'8px 28px 24px' }}>
            {sample.map((cert, i) => {
              const c = colors[cert.status]
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom: i < sample.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#eff6ff,#dbeafe)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Globe size={16} color="#2563eb"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert.domain}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{cert.issuer} · {cert.days} days remaining</div>
                  </div>
                  <div style={{ width:120, height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: Math.max(5, (cert.days/90)*100) + '%', background:c.c, borderRadius:3 }} />
                  </div>
                  <span style={{ background:c.bg, color:c.c, fontSize:10, fontWeight:800, padding:'5px 10px', borderRadius:7, letterSpacing:'0.4px', minWidth:88, textAlign:'center' }}>● {c.label.toUpperCase()}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop:32, textAlign:'center' }}>
          <button
            onClick={() => nav('/auth')}
            style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', border:'none', padding:'14px 28px', borderRadius:12, fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(37,99,235,0.35)', letterSpacing:'-0.2px' }}
          >
            Sign in to see yours <Shield size={14}/>
          </button>
          <button
            onClick={() => nav('/generate')}
            style={{ marginLeft:10, display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#374151', border:'1.5px solid #e2e8f0', padding:'14px 22px', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}
          >
            Try issuing a certificate
          </button>
        </div>
      </div>
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

  useEffect(() => { if(authLoading) return; if(user) loadCerts() }, [user,authLoading])
  if (!authLoading && !user) return <DashboardPreview nav={nav} />

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
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      {agentCert && <AgentInstall cert={agentCert} userId={user.id} onClose={() => setAgentCert(null)} />}

      {/* Hero */}
      <div style={{ position:'relative', maxWidth:1200, margin:'0 auto', padding:'48px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20, marginBottom:32 }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:18, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Live · {stats.total} certificate{stats.total!==1?'s':''} in your vault</span>
            </div>
            <h1 style={{ fontSize:'clamp(30px,3.5vw,42px)', fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-1.6px', marginBottom:6 }}>Certificate</h1>
            <h1 style={{ fontSize:'clamp(30px,3.5vw,42px)', fontWeight:900, lineHeight:1.06, letterSpacing:'-1.6px', marginBottom:10, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>inventory.</h1>
            <p style={{ color:'#475569', fontSize:14, lineHeight:1.7, maxWidth:480 }}>Manage, monitor and deploy your SSL/TLS certificates. Track expiry, renew with one click.</p>
          </div>
          <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', border:'none', padding:'13px 22px', borderRadius:11, fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 18px rgba(37,99,235,0.35)', letterSpacing:'-0.2px', flexShrink:0 }}>
            <PlusCircle size={15}/> Issue Certificate
          </button>
        </div>
      </div>

      <div style={{ position:'relative', maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* Stats cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            ['Total Certificates', stats.total, '#2563eb', '#eff6ff', '#bfdbfe', 'all', BarChart2],
            ['Active', stats.active, '#16a34a', '#ecfdf5', '#a7f3d0', 'active', CheckCircle],
            ['Expiring \u003C 14d', stats.expiring, '#d97706', '#fffbeb', '#fde68a', 'expiring', AlertTriangle],
            ['Expired', stats.expired, '#dc2626', '#fef2f2', '#fecaca', 'expired', XCircle],
          ].map(([label,value,color,bg,border,f,Icon]) => (
            <div key={label} onClick={() => setFilter(f)} style={{
              background:'white',
              border: filter===f ? '2px solid '+color : '1px solid #e2e8f0',
              borderRadius:16,
              padding:'18px 20px',
              boxShadow: filter===f ? '0 4px 14px '+color+'30' : '0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)',
              cursor:'pointer',
              transition:'all 0.15s',
              position:'relative'
            }}
              onMouseEnter={e => { if (filter !== f) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.08)' } }}
              onMouseLeave={e => { if (filter !== f) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)' } }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:bg, border:'1.5px solid '+border, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={19} color={color} strokeWidth={2}/>
                </div>
                {filter===f && <div style={{ width:8, height:8, borderRadius:'50%', background:color, marginTop:6, boxShadow:'0 0 0 3px '+color+'30' }} />}
              </div>
              <div style={{ fontSize:36, fontWeight:900, color:color, lineHeight:1, marginBottom:6, letterSpacing:'-1.5px' }}>{value}</div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px' }}>{label}</div>
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
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, boxShadow:'0 1px 4px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.04)', overflow:'hidden' }}>

            {/* Table toolbar */}
            <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ flex:1 }}>
                <h2 style={{ fontWeight:900, fontSize:15, color:'#0f172a', letterSpacing:'-0.3px' }}>Certificate Inventory <span style={{ color:'#94a3b8', fontWeight:500, fontSize:13 }}>({filteredDomains.length} domain{filteredDomains.length!==1?'s':''})</span></h2>
              </div>
              {/* Search */}
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search domains...' style={{ paddingLeft:32, width:220, fontSize:12, padding:'8px 12px 8px 32px', border:'1.5px solid #e2e8f0', borderRadius:9, background:'white', fontFamily:'inherit', outline:'none' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}/>
              </div>
              {/* Filters */}
              <div style={{ display:'flex', gap:6 }}>
                {[['all','All'],['active','Active'],['expiring','Expiring'],['expired','Expired']].map(([v,l]) => (
                  <button key={v} onClick={() => setFilter(v)} style={{ fontSize:11, fontWeight:700, padding:'7px 14px', borderRadius:8, border: filter===v ? 'none' : '1.5px solid #e2e8f0', background: filter===v ? 'linear-gradient(135deg,#1d4ed8,#4f46e5)' : 'white', color: filter===v ? 'white' : '#64748b', cursor:'pointer', fontFamily:'inherit', boxShadow: filter===v ? '0 2px 8px rgba(37,99,235,0.3)' : 'none', letterSpacing:'-0.1px', transition:'all 0.15s' }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display:'grid', gridTemplateColumns:'48px 32px 1fr 120px 130px 90px 100px 80px', gap:0, padding:'10px 24px', background:'#fafbfc', borderBottom:'1px solid #f1f5f9' }}>
              {['','#','Domain','Issuer','Expires','Days','Status',''].map((h,i) => (
                <div key={i} style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.7px' }}>{h}</div>
              ))}
            </div>

            {/* Domain rows */}
            {loading ? (
              <div style={{ textAlign:'center', padding:'56px 0', color:'#94a3b8' }}>
                <span className='spinner spinner-dark' style={{ width:22, height:22, display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontSize:13, fontWeight:600 }}>Loading certificates...</p>
              </div>
            ) : filteredDomains.length===0 ? (
              <div style={{ textAlign:'center', padding:'56px 24px' }}>
                <div style={{ width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#eff6ff,#e0f2fe)', border:'1.5px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                  <Shield size={26} color='#2563eb'/>
                </div>
                <p style={{ fontWeight:700, color:'#0f172a', fontSize:14, marginBottom:filter==='all'&&!search?14:0 }}>{search?`No domains matching \u201c${search}\u201d`:`No ${filter!=='all'?filter+' ':''}certificates`}</p>
                {filter==='all'&&!search && <button onClick={() => nav('/generate')} style={{ marginTop:6, fontSize:12, color:'white', background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', border:'none', borderRadius:9, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontFamily:'inherit', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>Issue First Certificate</button>}
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
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, padding:'72px 24px', textAlign:'center', boxShadow:'0 12px 40px rgba(15,23,42,0.06)' }}>
            <div style={{ width:72, height:72, background:'linear-gradient(135deg,#eff6ff,#e0f2fe)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', border:'1.5px solid #bfdbfe', boxShadow:'0 0 0 6px rgba(37,99,235,0.08)' }}>
              <Shield size={32} color='#2563eb'/>
            </div>
            <h3 style={{ fontSize:22, fontWeight:900, marginBottom:10, color:'#0f172a', letterSpacing:'-0.5px' }}>No certificates yet</h3>
            <p style={{ color:'#64748b', marginBottom:28, fontSize:14, maxWidth:380, margin:'0 auto 28px', lineHeight:1.65 }}>Issue your first SSL certificate to start building your inventory. Free forever, no credit card.</p>
            <button onClick={() => nav('/generate')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', border:'none', padding:'13px 26px', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 18px rgba(37,99,235,0.35)', fontFamily:'inherit', letterSpacing:'-0.2px' }}>
              <PlusCircle size={15}/> Issue Free Certificate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}