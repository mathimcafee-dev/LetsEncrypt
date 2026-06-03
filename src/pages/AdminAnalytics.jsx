import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, TrendingUp, Users, Activity, RefreshCw, Award, AlertTriangle, CheckCircle } from 'lucide-react'
import '../styles/design-v2.css'

const APPROVAL_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/user-approval'

async function callApproval(tok, body) {
  const r = await fetch(APPROVAL_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
    body: JSON.stringify(body),
  })
  return r.json()
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function AdminAnalytics({ user }) {
  const isMobile = useIsMobile()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [reqLoading, setReqLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const [certsRes, ordersRes] = await Promise.all([
      supabase.from('certificates').select('id,domain,status,expires_at,source,issued_at,tls_grade,install_status'),
      supabase.from('ssl_orders').select('id,domain,status,product_name,created_at,order_purpose'),
    ])
    const certs  = certsRes.data  || []
    const orders = ordersRes.data || []
    const now = new Date()

    const active     = certs.filter(c=>c.status==='active')
    const expiring30 = active.filter(c=>c.expires_at&&Math.ceil((new Date(c.expires_at)-now)/86400000)<=30)
    const expiring7  = active.filter(c=>c.expires_at&&Math.ceil((new Date(c.expires_at)-now)/86400000)<=7)
    const installed  = active.filter(c=>c.install_status==='success')
    const thisMonth  = orders.filter(o=>new Date(o.created_at)>new Date(now.getFullYear(),now.getMonth(),1))
    const grades = {A:0,B:0,C:0,D:0,F:0,unknown:0}
    active.forEach(c=>{if(c.tls_grade&&grades[c.tls_grade]!==undefined)grades[c.tls_grade]++;else grades.unknown++})

    // Source breakdown
    const bySource = {}
    active.forEach(c=>{const s=c.source||'unknown';bySource[s]=(bySource[s]||0)+1})

    setStats({ active:active.length, expiring30:expiring30.length, expiring7:expiring7.length,
      installed:installed.length, thisMonth:thisMonth.length, orders:orders.length, grades, bySource })
    setLoading(false)
  }

  const loadRequests = async () => {
    setReqLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const tok = session?.access_token || ''
    const r = await callApproval(tok, { action: 'list_pending' })
    if (r.ok) setRequests(r.requests || [])
    setReqLoading(false)
  }

  const handleApprove = async (userId) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await callApproval(session.access_token, { action: 'approve', user_id: userId })
    if (r.ok) { setActionMsg('Approved — user notified by email'); loadRequests() }
    else setActionMsg('Error: ' + r.error)
  }

  const handleReject = async (userId, email) => {
    const reason = window.prompt(`Reject ${email}?\nEnter reason (optional):`, 'Access not granted at this time.')
    if (reason === null) return // cancelled
    const { data: { session } } = await supabase.auth.getSession()
    const r = await callApproval(session.access_token, { action: 'reject', user_id: userId, reason })
    if (r.ok) { setActionMsg('Rejected — user notified by email'); loadRequests() }
    else setActionMsg('Error: ' + r.error)
  }

  useEffect(()=>{if(user){ load(); loadRequests() }},[user])

  if (loading) return <div className="v2-page"><div className="v2-container" style={{paddingTop:40,textAlign:'center',color:'#888888'}}>Loading analytics…</div></div>

  const gradeColor = {A:'#16a068',B:'#65a30d',C:'#111111',D:'#1f5c4e',F:'#1f5c4e',unknown:'rgba(240,237,232,0.38)'}

  return (
    <div className="v2-page">
      <div className="v2-container" style={{maxWidth:980}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,paddingTop:8}}>
          <div>
            <h1 className="v2-h1" style={{fontSize:24}}>Admin analytics</h1>
            <p className="v2-subtitle" style={{fontSize:13,marginTop:4}}>Live platform metrics — certificate portfolio health and operational status</p>
          </div>
          <button className="v2-btn" onClick={load}><RefreshCw size={13}/> Refresh</button>
        </div>

        {/* Signup requests */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:'#111111'}}>Signup requests</div>
              <div style={{fontSize:12,color:'#888888',marginTop:2}}>New users waiting for your approval</div>
            </div>
            <button className="v2-btn v2-btn-sm" onClick={loadRequests} disabled={reqLoading}>
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
          {actionMsg && (
            <div style={{padding:'8px 12px',borderRadius:6,background:actionMsg.startsWith('Error')?'rgba(31,92,78,0.09)':'transparent',
              border:`0.5px solid ${actionMsg.startsWith('Error')?'rgba(0,0,0,0.1)':'rgba(31,92,78,0.2)'}`,
              color:actionMsg.startsWith('Error')?'#1f5c4e':'#16a068',fontSize:12,marginBottom:10,
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {actionMsg}
              <button onClick={()=>setActionMsg('')} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,lineHeight:1}}>×</button>
            </div>
          )}
          {reqLoading ? (
            <div style={{padding:'20px',textAlign:'center',color:'#888888',fontSize:13}}>Loading…</div>
          ) : requests.filter(r=>r.status==='pending').length === 0 ? (
            <div style={{padding:'16px',background:'var(--v2-surface-2)',borderRadius:8,border:'0.5px solid var(--v2-border)',
              textAlign:'center',color:'#888888',fontSize:13}}>
              No pending signup requests
            </div>
          ) : (
            <div style={{border:'0.5px solid var(--v2-border)',borderRadius:8,overflowX:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 160px',minWidth:640,padding:'8px 16px',
                background:'var(--v2-surface-2)',borderBottom:'0.5px solid rgba(0,0,0,0.06)'}}>
                {['Email','Status','Requested','Actions'].map(h=>(
                  <div key={h} style={{fontSize:10,fontWeight:700,color:'#888888',textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</div>
                ))}
              </div>
              {requests.map((req,i)=>(
                <div key={req.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 160px',minWidth:640,
                  padding:'10px 16px',borderBottom:i<requests.length-1?'0.5px solid var(--v2-border)':'none',
                  background:i%2===0?'transparent':'var(--v2-surface-2)',alignItems:'center'}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#111111'}}>{req.email}</div>
                  <div>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,
                      background:req.status==='pending'?'rgba(239,68,68,0.08)':req.status==='approved'?'transparent':'rgba(31,92,78,0.09)',
                      color:req.status==='pending'?'#111111':req.status==='approved'?'#16a068':'#1f5c4e',
                      border:`0.5px solid ${req.status==='pending'?'rgba(0,0,0,0.1)':req.status==='approved'?'rgba(31,92,78,0.2)':'rgba(0,0,0,0.1)'}`}}>
                      {req.status}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#888888'}}>
                    {new Date(req.requested_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {req.status==='pending' && (<>
                      <button onClick={()=>handleApprove(req.user_id)}
                        style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'0.5px solid rgba(31,92,78,0.2)',
                          background:'transparent',color:'#16a068',cursor:'pointer',fontWeight:600}}>
                        ✓ Approve
                      </button>
                      <button onClick={()=>handleReject(req.user_id,req.email)}
                        style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'0.5px solid #fecaca',
                          background:'rgba(31,92,78,0.09)',color:'#1f5c4e',cursor:'pointer',fontWeight:600}}>
                        ✗ Reject
                      </button>
                    </>)}
                    {req.status!=='pending' && (
                      <span style={{fontSize:11,color:'#888888'}}>
                        {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Primary metrics */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:20}}>
          {[
            {icon:Shield,      val:stats.active,      label:'Active certs',     color:'#16a068'},
            {icon:TrendingUp,  val:stats.thisMonth,   label:'Issued this month',color:'#111111'},
            {icon:AlertTriangle,val:stats.expiring30, label:'Expiring in 30d',  color:'#111111'},
            {icon:CheckCircle, val:stats.installed,   label:'Auto-installed',   color:'#111111'},
          ].map(({icon:Icon,val,label,color})=>(
            <div key={label} className="v2-card" style={{padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:7,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={15} color={color}/></div>
              </div>
              <div style={{fontSize:26,fontWeight:500,color,fontFamily:'monospace',lineHeight:1}}>{val}</div>
              <div style={{fontSize:11,color:'#888888',marginTop:4}}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))',gap:16,marginBottom:20}}>
          {/* TLS Grade distribution */}
          <div className="v2-card" style={{padding:'16px 18px'}}>
            <div className="v2-section-label" style={{marginBottom:14}}>TLS posture grades</div>
            {Object.entries(stats.grades).filter(([,v])=>v>0).map(([g,v])=>(
              <div key={g} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:500,color:gradeColor[g]||'#444444',fontFamily:'monospace'}}>{g==='unknown'?'—':g}</span>
                  <span style={{fontSize:12,color:'#333333'}}>{v} cert{v!==1?'s':''}</span>
                </div>
                <div style={{height:6,borderRadius:3,background:'var(--v2-surface-3)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:gradeColor[g]||'#444444',width:`${Math.min(100,(v/Math.max(1,stats.active))*100)}%`,transition:'width .6s'}}/>
                </div>
              </div>
            ))}
            {stats.grades.unknown===stats.active&&<div style={{fontSize:12,color:'#888888'}}>No posture checks run yet — open a cert and click Sync Status.</div>}
          </div>

          {/* CA source breakdown */}
          <div className="v2-card" style={{padding:'16px 18px'}}>
            <div className="v2-section-label" style={{marginBottom:14}}>Certificates by CA</div>
            {Object.entries(stats.bySource).sort((a,b)=>b[1]-a[1]).map(([src,cnt])=>{
              const labels = {rapidssl:'RapidSSL',tss:'RapidSSL',letsencrypt:"Let's Encrypt",zerossl:'ZeroSSL',buypass:'Buypass',acme:'ACME',unknown:'Unknown'}
              const colors = {rapidssl:'#16a068',tss:'#16a068',letsencrypt:'#111111',zerossl:'#111111',buypass:'#111111',acme:'#444444',unknown:'rgba(240,237,232,0.38)'}
              return (
                <div key={src} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:500,color:'#111111'}}>{labels[src]||src}</span>
                    <span style={{fontSize:12,color:'#333333'}}>{cnt}</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'var(--v2-surface-3)',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:3,background:colors[src]||'#444444',width:`${(cnt/Math.max(1,stats.active))*100}%`,transition:'width .6s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expiry urgency */}
        {stats.expiring7 > 0 && (
          <div style={{background:'rgba(31,92,78,0.09)',border:'0.5px solid #fecaca',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
            <AlertTriangle size={16} style={{color:'#1f5c4e',flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'#2e7a68',marginBottom:3}}>{stats.expiring7} certificate{stats.expiring7!==1?'s':''} expiring within 7 days</div>
              <div style={{fontSize:12,color:'#1f5c4e'}}>Check the dashboard and renew immediately if auto-renew is not enabled.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
