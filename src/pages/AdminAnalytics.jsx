import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, TrendingUp, Users, Activity, RefreshCw, Award, AlertTriangle, CheckCircle } from 'lucide-react'
import '../styles/design-v2.css'

export default function AdminAnalytics({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(()=>{if(user)load()},[user])

  if (loading) return <div className="v2-page"><div className="v2-container" style={{paddingTop:40,textAlign:'center',color:'var(--v2-text-3)'}}>Loading analytics…</div></div>

  const gradeColor = {A:'#16a34a',B:'#65a30d',C:'#d97706',D:'#ea580c',F:'#dc2626',unknown:'#94a3b8'}

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

        {/* Primary metrics */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
          {[
            {icon:Shield,      val:stats.active,      label:'Active certs',     color:'#16a34a'},
            {icon:TrendingUp,  val:stats.thisMonth,   label:'Issued this month',color:'#2563eb'},
            {icon:AlertTriangle,val:stats.expiring30, label:'Expiring in 30d',  color:'#d97706'},
            {icon:CheckCircle, val:stats.installed,   label:'Auto-installed',   color:'#7c3aed'},
          ].map(({icon:Icon,val,label,color})=>(
            <div key={label} className="v2-card" style={{padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:7,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={15} color={color}/></div>
              </div>
              <div style={{fontSize:26,fontWeight:500,color,fontFamily:'monospace',lineHeight:1}}>{val}</div>
              <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:4}}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
          {/* TLS Grade distribution */}
          <div className="v2-card" style={{padding:'16px 18px'}}>
            <div className="v2-section-label" style={{marginBottom:14}}>TLS posture grades</div>
            {Object.entries(stats.grades).filter(([,v])=>v>0).map(([g,v])=>(
              <div key={g} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:500,color:gradeColor[g]||'#64748b',fontFamily:'monospace'}}>{g==='unknown'?'—':g}</span>
                  <span style={{fontSize:12,color:'var(--v2-text-2)'}}>{v} cert{v!==1?'s':''}</span>
                </div>
                <div style={{height:6,borderRadius:3,background:'var(--v2-surface-3)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:gradeColor[g]||'#64748b',width:`${Math.min(100,(v/Math.max(1,stats.active))*100)}%`,transition:'width .6s'}}/>
                </div>
              </div>
            ))}
            {stats.grades.unknown===stats.active&&<div style={{fontSize:12,color:'var(--v2-text-3)'}}>No posture checks run yet — open a cert and click Sync Status.</div>}
          </div>

          {/* CA source breakdown */}
          <div className="v2-card" style={{padding:'16px 18px'}}>
            <div className="v2-section-label" style={{marginBottom:14}}>Certificates by CA</div>
            {Object.entries(stats.bySource).sort((a,b)=>b[1]-a[1]).map(([src,cnt])=>{
              const labels = {gogetssl:'GoGetSSL',tss:'GoGetSSL',letsencrypt:"Let's Encrypt",zerossl:'ZeroSSL',buypass:'Buypass',acme:'ACME',unknown:'Unknown'}
              const colors = {gogetssl:'#16a34a',tss:'#16a34a',letsencrypt:'#2563eb',zerossl:'#7c3aed',buypass:'#0369a1',acme:'#64748b',unknown:'#94a3b8'}
              return (
                <div key={src} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:500,color:'var(--v2-text)'}}>{labels[src]||src}</span>
                    <span style={{fontSize:12,color:'var(--v2-text-2)'}}>{cnt}</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'var(--v2-surface-3)',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:3,background:colors[src]||'#64748b',width:`${(cnt/Math.max(1,stats.active))*100}%`,transition:'width .6s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expiry urgency */}
        {stats.expiring7 > 0 && (
          <div style={{background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',gap:12,alignItems:'flex-start'}}>
            <AlertTriangle size={16} style={{color:'#dc2626',flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'#991b1b',marginBottom:3}}>{stats.expiring7} certificate{stats.expiring7!==1?'s':''} expiring within 7 days</div>
              <div style={{fontSize:12,color:'#b91c1c'}}>Check the dashboard and renew immediately if auto-renew is not enabled.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
