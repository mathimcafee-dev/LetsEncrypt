import { useState, useEffect } from 'react'
import {
  Shield, Plus, Globe, Server, Zap,
  AlertTriangle, CheckCircle, Clock, FileText,
  Layout, Download, Settings, ChevronRight,
  BookOpen, CreditCard, Info, User, Mail, LogOut
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { differenceInDays } from 'date-fns'
import Dashboard from './Dashboard'
import Import from './Import'
import DnsProviders from './DnsProviders'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import About from './About'
import Contact from './Contact'
import Developer from './Developer'
import Pricing from './Pricing'

function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
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

  const NAV_MAIN = [
    { id:'dashboard', label:'Dashboard', icon:Layout },
    { id:'issue', label:'Issue Certificate', icon:Plus },
    { id:'import', label:'Import Certificate', icon:FileText },
    { id:'dns', label:'DNS Providers', icon:Globe },
    { id:'servers', label:'Servers', icon:Server },
    { id:'install', label:'Install Guide', icon:Download },
    { id:'kb', label:'Knowledge Base', icon:BookOpen },
  ]

  const NAV_MORE = [
    { id:'pricing', label:'Pricing', icon:CreditCard },
    { id:'about', label:'About', icon:Info },
    { id:'developer', label:'Developer', icon:User },
    { id:'contact', label:'Contact', icon:Mail },
    { id:'settings', label:'Settings', icon:Settings },
  ]

  const SECTION_TITLES = {
    dashboard:'Dashboard', issue:'Issue Certificate',
    import:'Import Certificate', dns:'DNS Providers', servers:'Servers',
    install:'Install Guide', kb:'Knowledge Base', pricing:'Pricing',
    about:'About', developer:'Developer', contact:'Contact', settings:'Settings',
  }

  const NavItem = ({ id, label, icon:Icon }) => (
    <button style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:500, color: section===id ? 'white' : 'rgba(255,255,255,0.55)', background: section===id ? 'rgba(0,180,138,0.15)' : 'none', borderLeft: section===id ? '3px solid #00b48a' : '3px solid transparent', border:'none', width:'100%', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s' }} onClick={() => setSection(id)}>
      <Icon size={14} strokeWidth={1.8}/>{label}
    </button>
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const renderContent = () => {
    if (section === 'issue') return <BuyCertificate nav={nav}/>
    if (section === 'import') return <Import nav={nav}/>
    if (section === 'dns') return <DnsProviders nav={nav}/>
    if (section === 'install') return <Install nav={nav}/>
    if (section === 'kb') return <KnowledgeBase nav={nav}/>
    if (section === 'about') return <About nav={nav}/>
    if (section === 'contact') return <Contact nav={nav}/>
    if (section === 'developer') return <Developer nav={nav}/>
    if (section === 'pricing') return <Pricing nav={nav}/>
    if (section === 'servers') return (
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#8492a6' }}>
        <Server size={40} strokeWidth={1.5} style={{ marginBottom:12, opacity:0.3 }}/>
        <div style={{ fontSize:14, fontWeight:700, color:'#1a2332', marginBottom:6 }}>Servers</div>
        <div style={{ fontSize:12, marginBottom:20 }}>Manage VPS and cPanel servers with the persistent agent</div>
        <button style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#00b48a', color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('install')}>
          <Download size={13}/> Install Guide
        </button>
      </div>
    )
    if (section === 'settings') return (
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#8492a6' }}>
        <Settings size={40} strokeWidth={1.5} style={{ marginBottom:12, opacity:0.3 }}/>
        <div style={{ fontSize:14, fontWeight:700, color:'#1a2332', marginBottom:6 }}>Settings</div>
        <div style={{ fontSize:12 }}>Account settings coming soon</div>
      </div>
    )

    return (
      <>
        <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a2332' }}>{greeting}, <span style={{ color:'#00b48a' }}>{name}</span></div>
            <div style={{ fontSize:11, color:'#8492a6', marginTop:2 }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          {expired > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 12px', cursor:'pointer' }} onClick={() => document.getElementById('inventory-section')?.scrollIntoView({ behavior:'smooth', block:'start' })}>
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
            <div key={label} style={{ background:'white', borderRadius:10, padding:'18px 20px', border:'1px solid #e8edf2', display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }} onClick={() => document.getElementById('inventory-section')?.scrollIntoView({ behavior:'smooth', block:'start' })}>
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { icon:Shield, color:'#00b48a', bg:'#ecfdf5', label:'Issue Certificate', desc:'RapidSSL DV', fn:() => setSection('issue') },
            { icon:FileText, color:'#3b82f6', bg:'#eff6ff', label:'Import Certificate', desc:'Bring your own', fn:() => setSection('import') },
            { icon:BookOpen, color:'#7c3aed', bg:'#f5f3ff', label:'Knowledge Base', desc:'Guides and FAQs', fn:() => setSection('kb') },
            { icon:Globe, color:'#0ea5e9', bg:'#f0f9ff', label:'DNS Providers', desc:'Auto-validation', fn:() => setSection('dns') },
            { icon:Server, color:'#d97706', bg:'#fffbeb', label:'Servers', desc:'VPS and cPanel', fn:() => setSection('servers') },
            { icon:Zap, color:'#10b981', bg:'#ecfdf5', label:'Install Cert', desc:'VPS or shared', fn:() => setSection('install') },
          ].map(({ icon:Icon, color, bg, label, desc, fn }) => (
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
        <div id="inventory-section">
          <Dashboard nav={nav}/>
        </div>
      </>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'calc(100vh - 0px)', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* SLIM TOP BAR */}
      <div style={{ background:'#1c2d3e', height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'linear-gradient(135deg,#00b48a,#007a5e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={13} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>SSLVault</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginLeft:2 }}>CLM PLATFORM</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{email}</span>
          <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.45)', fontSize:11, fontFamily:'inherit', padding:0 }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:'flex', flex:1, background:'#f4f6f9' }}>
        {/* SIDEBAR */}
        <nav style={{ width:210, background:'#1c2d3e', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:44, height:'calc(100vh - 44px)', overflowY:'auto' }}>
          <button style={{ margin:'12px 10px 8px', background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'9px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }} onClick={() => setSection('issue')}>
            <Plus size={12}/> Request a Certificate
          </button>

          <div style={{ padding:'8px 0 4px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.8px', textTransform:'uppercase', padding:'4px 16px 6px' }}>Main</div>
            {NAV_MAIN.map(item => <NavItem key={item.id} {...item}/>)}
          </div>

          <div style={{ padding:'8px 0 4px', borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.8px', textTransform:'uppercase', padding:'4px 16px 6px' }}>More</div>
            {NAV_MORE.map(item => <NavItem key={item.id} {...item}/>)}
          </div>

          <div style={{ marginTop:'auto', padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginBottom:2 }}>Signed in as</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          <div style={{ background:'white', borderBottom:'1px solid #e8edf2', padding:'0 28px', height:48, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:44, zIndex:30 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#1a2332', letterSpacing:'-0.3px' }}>{SECTION_TITLES[section]}</div>
            <div style={{ display:'flex', gap:10 }}>
              <button style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('issue')}>
                <Plus size={13}/> Issue Certificate
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {section === 'dashboard'
              ? <div style={{ padding:'24px 28px 60px' }}>{renderContent()}</div>
              : renderContent()
            }
          </div>
        </div>
      </div>
    </div>
  )
}
