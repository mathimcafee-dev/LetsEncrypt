import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Globe, Server, Activity, TrendingUp,
  Layout, Download, Settings,
  BookOpen, CreditCard, Info, User, Mail, LogOut, Bell
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import ServersPage from './Servers'
import AboutInner from './AboutInner'
import ContactInner from './ContactInner'
import DeveloperInner from './DeveloperInner'
import SettingsPage from './SettingsPage'
import Integrations from './Integrations'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import CAIntelligenceHub from './CAIntelligenceHub'
import AdminAnalytics from './AdminAnalytics'
import AgentHealth from './AgentHealth'
import Pricing from './Pricing'

// Default collapsed state — Overview & Account open, rest start open too but user can close
const DEFAULT_OPEN = { Overview: true, Infrastructure: true, 'CA Management': true, Resources: true, Account: true }

export default function CLMHome({ user, nav }) {
  const [section, setSection] = useState('dashboard')
  const [animKey, setAnimKey] = useState(0)
  const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN)

  const toggleGroup = (label) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const navigate = (id) => {
    if (id === section) return
    setSection(id)
    setAnimKey(k => k + 1)
  }
  const email = user?.email || ''

  // ── Notification bell ──────────────────────────────────────────────
  const [notifs, setNotifs]         = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen]     = useState(false)
  const [bellLoading, setBellLoading] = useState(false)
  const bellRef = useRef(null)

  const loadNotifs = async () => {
    if (!user) return
    setBellLoading(true)
    const { data, error } = await supabase.functions.invoke('send-alert', {
      body: { action: 'get_notifications', user_id: user.id, limit: 10 }
    })
    if (!error && data?.ok) {
      setNotifs(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    }
    setBellLoading(false)
  }

  const markAllRead = async () => {
    await supabase.functions.invoke('send-alert', {
      body: { action: 'mark_read', user_id: user.id, all: true }
    })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  // Load on mount + every 60s
  useEffect(() => {
    loadNotifs()
    const iv = setInterval(loadNotifs, 60000)
    return () => clearInterval(iv)
  }, [user])

  // Close bell on outside click
  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const NAV_OVERVIEW = [
    { id:'dashboard', label:'Dashboard',         icon:Layout },
    { id:'issue',     label:'Issue Certificate', icon:Plus   },
  ]
  const NAV_INFRASTRUCTURE = [
    { id:'integrations', label:'Integrations',  icon:Globe    },
    { id:'agent-health', label:'Agent Health',  icon:Activity },
  ]
  const NAV_CA = [
    { id:'ca-intelligence',label:'CA Intelligence', icon:TrendingUp },
  ]
  const NAV_RESOURCES = [
    { id:'install',  label:'Install Guide', icon:Download  },
    { id:'kb',       label:'Docs & Help',   icon:BookOpen  },
    { id:'pricing',  label:'Pricing',       icon:CreditCard},
  ]
  const NAV_ACCOUNT = [
    { id:'analytics', label:'Analytics', icon:Layout   },
    { id:'settings',  label:'Settings',  icon:Settings },
    { id:'about',     label:'About',     icon:Info     },
    { id:'developer', label:'Developer', icon:User     },
    { id:'contact',   label:'Contact',   icon:Mail     },
  ]
  const SECTION_TITLES = {
    dashboard:'Dashboard', issue:'Issue Certificate', 'ca-intelligence':'CA Intelligence', analytics:'Analytics',
    integrations:'Integrations',
    install:'Installation', kb:'Docs & Help', pricing:'Pricing',
    about:'About', developer:'Developer', contact:'Contact', settings:'Settings',
  }

  const NavItem = ({ id, label, icon:Icon, pro }) => {
    const isActive = section === id
    return (
      <button onClick={() => navigate(id)} style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 16px',
          cursor:'pointer', fontSize:12, fontWeight: isActive ? 600 : 500,
          color: isActive ? 'white' : pro ? 'rgba(252,165,165,0.85)' : 'rgba(255,255,255,0.65)',
          background: isActive ? (pro ? 'rgba(220,38,38,0.25)' : 'rgba(14,127,192,0.35)') : 'transparent',
          borderLeft: isActive ? `3px solid ${pro ? '#f87171' : '#00a3e0'}` : '3px solid transparent',
          border:'none', width:'100%', textAlign:'left', fontFamily:'inherit',
          transition:'all 0.18s cubic-bezier(0.4,0,0.2,1)',
          borderRadius:'0 6px 6px 0',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='white' }}}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color= pro ? 'rgba(252,165,165,0.85)' : 'rgba(255,255,255,0.65)' }}}
      >
        <Icon size={14} strokeWidth={isActive ? 2 : 1.8} style={{ flexShrink:0 }}/>
        <span style={{ flex:1 }}>{label}</span>
        {pro && !isActive && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:10,
          background:'rgba(220,38,38,0.3)', color:'#fca5a5', letterSpacing:'0.3px' }}>PRO</span>}
      </button>
    )
  }

  const renderContent = () => {
    // Dashboard now uses the GGS-enriched LoggedInDashboard (ssl_orders join)
    if (section === 'dashboard')  return <Dashboard nav={nav}/>
    if (section === 'issue')      return <BuyCertificate nav={nav} embedded={true} onDashboard={() => navigate('dashboard')} onIssueAnother={() => navigate('issue')}/>
    if (section === 'integrations') return <Integrations nav={nav}/>
    if (section === 'install')    return <Install nav={nav}/>
    if (section === 'kb')         return <KnowledgeBase nav={nav}/>
    if (section === 'about')      return <AboutInner nav={nav}/>
    if (section === 'contact')    return <ContactInner nav={nav}/>
    if (section === 'developer')  return <DeveloperInner nav={nav}/>
    if (section === 'pricing')    return <Pricing nav={nav}/>
    if (section === 'servers')    return <ServersPage user={user}/>
    if (section === 'settings')      return <SettingsPage user={user}/>
    if (section === 'ca-intelligence') return <CAIntelligenceHub nav={nav}/>
    if (section === 'analytics')     return <AdminAnalytics user={user}/>
    if (section === 'agent-health')  return <AgentHealth user={user}/>
    if (section === 'analytics')     return <AdminAnalytics user={user}/>
    if (section === 'agent-health')  return <AgentHealth user={user}/>
    return null
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:'#0d3c6e', height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'#0e7fc0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={13} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>SSLVault</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginLeft:2 }}>CLM PLATFORM</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {/* ── Notification Bell ── */}
          <div ref={bellRef} style={{ position:'relative' }}>
            <button onClick={() => { setBellOpen(v => !v); if (!bellOpen) loadNotifs() }}
              style={{ position:'relative', background:'none', border:'none', cursor:'pointer',
                color:'rgba(255,255,255,0.6)', padding:4, display:'flex', alignItems:'center',
                borderRadius:6, transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color='white'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
              <Bell size={15}/>
              {unreadCount > 0 && (
                <span style={{ position:'absolute', top:-1, right:-1, width:14, height:14,
                  borderRadius:'50%', background:'#ef4444', border:'1.5px solid #0d3c6e',
                  fontSize:8, fontWeight:800, color:'white', display:'flex',
                  alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {/* Dropdown */}
            {bellOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:320,
                background:'white', border:'1px solid #e2e8f0', borderRadius:12,
                boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:200, overflow:'hidden' }}>
                {/* Header */}
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                        color:'#0891b2', fontFamily:'inherit', padding:0 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                {/* Items */}
                <div style={{ maxHeight:360, overflowY:'auto' }}>
                  {bellLoading && notifs.length === 0 ? (
                    <div style={{ padding:'24px', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
                      Loading…
                    </div>
                  ) : notifs.length === 0 ? (
                    <div style={{ padding:'32px 16px', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
                      🔔 No notifications yet
                    </div>
                  ) : notifs.map(n => (
                    <div key={n.id}
                      onClick={async () => {
                        await supabase.functions.invoke('send-alert', { body:{ action:'mark_read', user_id:user.id, notification_id:n.id }})
                        setNotifs(prev => prev.map(x => x.id===n.id ? {...x,read:true} : x))
                        setUnreadCount(c => Math.max(0, c-1))
                        if (n.action_url) { const section = n.action_url.replace('/',''); navigate(section||'dashboard') }
                        setBellOpen(false)
                      }}
                      style={{ padding:'10px 16px', borderBottom:'0.5px solid #f8fafc', cursor:'pointer',
                        background: n.read ? 'white' : '#f0f9ff', transition:'background .15s',
                        display:'flex', gap:10, alignItems:'flex-start' }}
                      onMouseEnter={e => e.currentTarget.style.background=n.read?'#f8fafc':'#e0f7fa'}
                      onMouseLeave={e => e.currentTarget.style.background=n.read?'white':'#f0f9ff'}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:n.color||'#0891b2',
                        marginTop:4, flexShrink:0 }}/>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:n.read?500:700, color:'#0f172a',
                          marginBottom:2, lineHeight:1.3 }}>{n.title}</div>
                        <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                          {new Date(n.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                      {!n.read && <span style={{ width:6, height:6, borderRadius:'50%',
                        background:'#0891b2', flexShrink:0, marginTop:5 }}/>}
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div style={{ padding:'10px 16px', borderTop:'1px solid #f1f5f9', textAlign:'center' }}>
                  <button onClick={() => { navigate('settings'); setBellOpen(false) }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:11,
                      color:'#0891b2', fontFamily:'inherit' }}>
                    Manage alert settings →
                  </button>
                </div>
              </div>
            )}
          </div>

          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{email}</span>
          <button onClick={() => supabase.auth.signOut()} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:11, fontFamily:'inherit', padding:0 }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, background: ['issue'].includes(section) ? '#050a14' : '#f0f4f8' }}>
        <nav style={{ width:210, background:'#0d3c6e', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:44, height:'calc(100vh - 44px)', overflowY:'auto', boxShadow:'4px 0 24px rgba(0,0,0,0.18)' }}>
          {[
            { label:'Overview',       items: NAV_OVERVIEW },
            { label:'Infrastructure', items: NAV_INFRASTRUCTURE },
            { label:'CA Management',  items: NAV_CA },
            { label:'Resources',      items: NAV_RESOURCES },
            { label:'Account',        items: NAV_ACCOUNT },
          ].map(({ label, items, pro }, i) => {
            const isOpen = openGroups[label] !== false
            const hasActive = items.some(item => item.id === section)
            return (
              <div key={label} style={{ borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}>
                <button
                  onClick={() => toggleGroup(label)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'9px 14px 7px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    {pro && <Lock size={8} color="#fca5a5"/>}
                    <span style={{
                      fontSize:10, fontWeight:700, letterSpacing:'0.6px', textTransform:'uppercase',
                      color: pro ? '#fca5a5' : (hasActive && !isOpen) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                      transition:'color 0.2s'
                    }}>{label}</span>
                    {!isOpen && hasActive && (
                      <span style={{ width:5, height:5, borderRadius:'50%', background:'#00a3e0', display:'inline-block', marginLeft:2 }}/>
                    )}
                  </div>
                  <span style={{
                    color:'rgba(255,255,255,0.3)', fontSize:10,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition:'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
                    display:'inline-block', lineHeight:1
                  }}>▾</span>
                </button>
                <div style={{
                  maxHeight: isOpen ? `${items.length * 40}px` : '0px',
                  overflow:'hidden',
                  transition:'max-height 0.28s cubic-bezier(0.4,0,0.2,1)',
                }}>
                  <div style={{ paddingBottom: isOpen ? 6 : 0 }}>
                    {items.map(item => <NavItem key={item.id} {...item} pro={item.pro}/>)}
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop:'auto', padding:'12px 16px', borderTop:'0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>Signed in as</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
        </nav>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          {!['issue','dashboard','integrations'].includes(section) && (
            <div style={{ background:'white', borderBottom:'1px solid #e8edf2', padding:'0 28px', height:48, display:'flex', alignItems:'center', flexShrink:0, position:'sticky', top:44, zIndex:30 }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#1a2332', letterSpacing:'-0.3px' }}>{SECTION_TITLES[section]}</div>
            </div>
          )}
          <div key={animKey} style={{ flex:1, overflowY:'auto', overflowX:'hidden', animation:'clm-fadein 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
            {renderContent()}
          </div>
        </div>
      </div>
      <style>{`@keyframes clm-fadein{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
