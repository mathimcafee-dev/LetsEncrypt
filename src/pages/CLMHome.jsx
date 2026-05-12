import { useState, useEffect } from 'react'
import {
  Shield, Plus, Activity, Globe, Server, Zap,
  AlertTriangle, CheckCircle, Clock, FileText,
  Layout, Download, Settings, ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { differenceInDays } from 'date-fns'
import Dashboard from './Dashboard'
import DnsProviders from './DnsProviders'
import Install from './Install'
import BuyCertificate from './BuyCertificate'

function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}

function statusOf(days, status) {
  if (status === 'revoked' || status === 'sandbox_revoked') return { color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8', label:'Revoked' }
  if (days == null) return { color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8', label:'Unknown' }
  if (days < 0) return { color:'#dc2626', bg:'#fef2f2', dot:'#ef4444', label:'Expired' }
  if (days < 30) return { color:'#d97706', bg:'#fffbeb', dot:'#f59e0b', label:`${days}d left` }
  return { color:'#059669', bg:'#ecfdf5', dot:'#10b981', label:`${days}d left` }
}

export default function CLMHome({ user, nav }) {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('dashboard')
  const email = user?.email || ''
  const name = email.split('@')[0] || 'Spartan'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('certificates')
        .select('id,domain,expires_at,status,issued_at,is_sandbox,cert_type,tss_order_id')
        .eq('user_id', user.id)
        .not('status', 'eq', 'rotating')
        .order('issued_at', { ascending: false })
      setCerts(data || [])
      setLoading(false)
    })()
  }, [user])

  const active = certs.filter(c => c.status !== 'sandbox_revoked' && c.status !== 'revoked')
  const total = active.length
  const healthy = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 }).length
  const expiring = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 }).length
  const expired = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 }).length
  const recent = certs.slice(0, 8)

  const NAV = [
    { id:'dashboard', label:'Dashboard', icon:Layout },
    { id:'certs', label:'Certificates', icon:Shield },
    { id:'issue', label:'Issue Certificate', icon:Plus },
    { id:'dns', label:'DNS Providers', icon:Globe },
    { id:'servers', label:'Servers', icon:Server },
    { id:'install', label:'Install Guide', icon:Download },
    { id:'settings', label:'Settings', icon:Settings },
  ]

  const ACTIONS = [
    { icon:Shield, color:'#00b48a', bg:'#ecfdf5', label:'Issue Certificate', desc:'RapidSSL DV', fn:() => setSection('issue') },
    { icon:FileText, color:'#3b82f6', bg:'#eff6ff', label:'Import Certificate', desc:'Bring your own', fn:() => nav('/import') },
    { icon:Activity, color:'#7c3aed', bg:'#f5f3ff', label:'Manage Certs', desc:'View inventory', fn:() => setSection('certs') },
    { icon:Globe, color:'#0ea5e9', bg:'#f0f9ff', label:'DNS Providers', desc:'Auto-validation', fn:() => setSection('dns') },
    { icon:Server, color:'#d97706', bg:'#fffbeb', label:'Servers', desc:'VPS and cPanel', fn:() => setSection('servers') },
    { icon:Zap, color:'#10b981', bg:'#ecfdf5', label:'Install Cert', desc:'VPS or shared', fn:() => setSection('install') },
  ]

  const SECTION_TITLES = {
    dashboard: 'Overview', certs: 'Certificates', issue: 'Issue Certificate',
    dns: 'DNS Providers', servers: 'Servers', install: 'Install Guide', settings: 'Settings',
  }

  const renderContent = () => {
    if (section === 'issue') return <BuyCertificate nav={nav}/>
    if (section === 'dns') return <DnsProviders nav={nav}/>
    if (section === 'install') return <Install nav={nav}/>
    if (section === 'certs') return <Dashboard nav={nav}/>
    if (section === 'servers') return (
      <div style={{ padding:'40px 20px', textAlign:'center', color:'#8492a6' }}>
        <Server size={40} strokeWidth={1.5} style={{ marginBottom:12, opacity:0.3 }}/>
        <div style={{ fontSize:14, fontWeight:700, color:'#1a2332', marginBottom:6 }}>Servers</div>
        <div style={{ fontSize:12, marginBottom:20 }}>Manage your VPS and cPanel servers</div>
        <button style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#00b48a', color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('install')}>
          <Download size={13}/> Install Guide
        </button>
      </div>
    )
    if (section === 'settings') return (
      <div style={{ padding:'40px 20px', textAlign:'center', color:'#8492a6' }}>
        <Settings size={40} strokeWidth={1.5} style={{ marginBottom:12, opacity:0.3 }}/>
        <div style={{ fontSize:14, fontWeight:700, color:'#1a2332', marginBottom:6 }}>Settings</div>
        <div style={{ fontSize:12 }}>Account settings coming soon</div>
      </div>
    )

    // Dashboard overview
    return (
      <>
        <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a2332' }}>{greeting}, <span style={{ color:'#00b48a' }}>{name}</span></div>
            <div style={{ fontSize:11, color:'#8492a6', marginTop:2 }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          {expired > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 12px', cursor:'pointer' }} onClick={() => setSection('certs')}>
              <AlertTriangle size={13} color="#dc2626"/>
              <span style={{ fontSize:12, fontWeight:600, color:'#b91c1c' }}>{expired} expired</span>
              <ChevronRight size={12} color="#dc2626"/>
            </div>
          )}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Total', val:total, sub:'certificates', color:'#1a2332', bg:'#f4f6f9', icon:Shield },
            { label:'Valid', val:healthy, sub:'30d+', color:'#059669', bg:'#ecfdf5', icon:CheckCircle },
            { label:'Expiring', val:expiring, sub:'under 30d', color:'#d97706', bg:'#fffbeb', icon:Clock },
            { label:'Expired', val:expired, sub:'action needed', color:'#dc2626', bg:'#fef2f2', icon:AlertTriangle },
          ].map(({ label, val, sub, color, bg, icon:Icon }) => (
            <div key={label} style={{ background:'white', borderRadius:10, padding:'18px 20px', border:'1px solid #e8edf2', display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} onClick={() => setSection('certs')}>
              <div style={{ width:44, height:44, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={20} color={color} strokeWidth={1.8}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#8492a6', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-.8px', lineHeight:1, color }}>{loading ? '-' : val}</div>
                <div style={{ fontSize:10, color:'#8492a6', marginTop:3 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:'white', borderRadius:10, border:'1px solid #e8edf2', overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1a2332' }}>Quick Actions</div>
            <div style={{ fontSize:11, color:'#8492a6', marginTop:2 }}>Common certificate tasks</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, padding:'16px 20px' }}>
            {ACTIONS.map(({ icon:Icon, color, bg, label, desc, fn }) => (
              <button key={label} style={{ border:'1.5px solid #e8edf2', borderRadius:9, padding:'16px 14px', cursor:'pointer', background:'white', textAlign:'left', fontFamily:'inherit', display:'flex', flexDirection:'column', gap:8 }} onClick={fn}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#00b48a'; e.currentTarget.style.background='#f0fdf9' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e8edf2'; e.currentTarget.style.background='white' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={17} color={color} strokeWidth={1.8}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:'#1a2332' }}>{label}</div>
                <div style={{ fontSize:10, color:'#8492a6', lineHeight:1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:'white', borderRadius:10, border:'1px solid #e8edf2', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a2332' }}>Recent Certificates</div>
              <div style={{ fontSize:11, color:'#8492a6', marginTop:2 }}>Latest {recent.length} in inventory</div>
            </div>
            <button style={{ fontSize:11, fontWeight:600, color:'#00b48a', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }} onClick={() => setSection('certs')}>
              View all <ChevronRight size={11}/>
            </button>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🛡️</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#1a2332', marginBottom:6 }}>No certificates yet</div>
              <div style={{ fontSize:12, color:'#8492a6', marginBottom:16 }}>Issue your first SSL certificate to get started</div>
              <button style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#00b48a', color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('issue')}>
                <Shield size={13}/> Issue Certificate
              </button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Domain','Status','Expires','Type'].map(h => (
                  <th key={h} style={{ fontSize:10, fontWeight:700, color:'#8492a6', textTransform:'uppercase', letterSpacing:'.5px', padding:'8px 12px', textAlign:'left', background:'#f8fafc', borderBottom:'1px solid #e8edf2' }}>{h}</th>
                ))}</tr></thead>
                <tbody>{recent.map(cert => {
                  const days = daysLeft(cert.expires_at)
                  const { color, bg, dot, label } = statusOf(days, cert.status)
                  return (
                    <tr key={cert.id} onClick={() => setSection('certs')} style={{ cursor:'pointer' }}>
                      <td style={{ padding:'11px 12px', fontSize:12, color:'#1a2332', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontFamily:"'SF Mono',monospace", fontWeight:600 }}>{cert.domain}</span>
                        {cert.is_sandbox && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:3, padding:'1px 5px' }}>SANDBOX</span>}
                      </td>
                      <td style={{ padding:'11px 12px', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, borderRadius:100, padding:'3px 9px', fontSize:10, fontWeight:700, color, background:bg }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:dot, display:'block' }}/>
                          {label}
                        </span>
                      </td>
                      <td style={{ padding:'11px 12px', fontSize:12, color:'#64748b', borderBottom:'1px solid #f1f5f9' }}>
                        {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '-'}
                      </td>
                      <td style={{ padding:'11px 12px', fontSize:12, borderBottom:'1px solid #f1f5f9' }}>
                        {cert.tss_order_id
                          ? <span style={{ fontSize:10, fontWeight:700, color:'#185FA5', background:'#E6F1FB', border:'.5px solid #B5D4F4', borderRadius:3, padding:'2px 6px' }}>RapidSSL</span>
                          : <span style={{ color:'#64748b' }}>{cert.cert_type || 'SSL'}</span>}
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 56px)', background:'#f4f6f9', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <nav style={{ width:220, background:'#1c2d3e', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:56, height:'calc(100vh - 56px)', overflowY:'auto' }}>
        <div style={{ padding:'20px 18px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#00b48a,#007a5e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={16} color="white" strokeWidth={2.5}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'white', lineHeight:1.2 }}>SSLVault</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:400 }}>CLM PLATFORM</div>
          </div>
        </div>
        <button style={{ margin:'14px 14px 8px', background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'10px 14px', fontSize:12, fontWeight:700, cursor:'pointer', width:'calc(100% - 28px)', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }} onClick={() => setSection('issue')}>
          <Plus size={13}/> Request a Certificate
        </button>
        <div style={{ padding:'10px 0 4px' }}>
          {NAV.map(({ id, label, icon:Icon }) => (
            <button key={id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 18px', cursor:'pointer', fontSize:12, fontWeight:500, color: section===id ? 'white' : 'rgba(255,255,255,0.6)', background: section===id ? 'rgba(0,180,138,0.15)' : 'none', borderLeft: section===id ? '3px solid #00b48a' : '3px solid transparent', border:'none', width:'100%', textAlign:'left', fontFamily:'inherit' }} onClick={() => setSection(id)}>
              <Icon size={15} strokeWidth={1.8}/>{label}
            </button>
          ))}
        </div>
        <div style={{ marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Signed in as</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
        </div>
      </nav>
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        <div style={{ background:'white', borderBottom:'1px solid #e8edf2', padding:'0 28px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:56, zIndex:30 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#1a2332', letterSpacing:'-0.3px' }}>{SECTION_TITLES[section]}</div>
          <div style={{ display:'flex', gap:12 }}>
            <button style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', color:'#1a2332', border:'1px solid #d1d9e0', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('certs')}>
              <Activity size={13}/> View All Certs
            </button>
            <button style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('issue')}>
              <Plus size={13}/> Issue Certificate
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {section === 'dashboard' && (
            <div style={{ padding:'24px 28px 60px' }}>
              {renderContent()}
            </div>
          )}
          {section !== 'dashboard' && renderContent()}
        </div>
      </div>
    </div>
  )
}
