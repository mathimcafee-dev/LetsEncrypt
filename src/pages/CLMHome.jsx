import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Globe, Server, Activity, TrendingUp, Trophy, History, Scan, CalendarDays, ShieldAlert, ShieldCheck,
  Layout, Download, Settings, Lock,
  BookOpen, CreditCard, Info, User, Mail, LogOut, Bell, Menu, X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import ServersPage from './Servers'
import SettingsPage from './SettingsPage'
import Integrations from './Integrations'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import CAIntelligenceHub from './CAIntelligenceHub'
import AdminAnalytics from './AdminAnalytics'
import AgentHealth from './AgentHealth'
import SSLHealthScore from './SSLHealthScore'
import CertChangelog from './CertChangelog'
import BulkScanner from './BulkScanner'
import RenewalCalendar from './RenewalCalendar'
import CTAbuseMonitor from './CTAbuseMonitor'
import ShieldIntelligence from './ShieldIntelligence'
import ReadinessDashboard from './ReadinessDashboard'
import Infrastructure from './Infrastructure'
import MyServers from './MyServers'
import CertVault from './CertVault'
import CertBind from './CertBind'
import Pricing from './Pricing'

// ── Design tokens ─────────────────────────────────────────────────────
const F    = "'Space Grotesk','DM Sans',system-ui,sans-serif"
const MONO = "'Space Mono','JetBrains Mono','Menlo',monospace"
const C = {
  page:    '#F5F0E8', surface:'#FFFDF8', alt:'#EDE8DC',
  dark:    '#1C2B1F', dark2:'#243528',   dark3:'#1a2218',
  line:    '#D8D0C0', line2:'#C4BAA8',
  lineDk:  'rgba(245,240,232,0.07)',
  ink:     '#1C2B1F', body:'#4A5E4E', faint:'#8A9E8E',
  dkText:  'rgba(245,240,232,0.88)', dkBody:'rgba(245,240,232,0.45)', dkFaint:'rgba(245,240,232,0.28)',
  green:   '#2D6A4F', greenLt:'#52B788', greenBg:'#D8F3DC', greenBd:'#95D5B2',
  sienna:  '#C1440E', siennaBg:'#FDECD8', siennaBd:'#F4A96A',
  amber:   '#B5652A', amberBg:'#FDF0DC',
  red:     '#C0392B', redBg:'#FCE8E6',
}

const DEFAULT_OPEN = { Certificates: true, Deployment: true, Shield: true, Intelligence: true }

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= bp)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [bp])
  return m
}

export default function CLMHome({ user, nav }) {
  const [section, setSection] = useState('dashboard')
  const [animKey, setAnimKey] = useState(0)
  const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const toggleGroup = (label) => setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const navigate = (id) => {
    if (id === section) return
    setSection(id)
    setAnimKey(k => k + 1)
    if (isMobile) setSidebarOpen(false)
  }
  const email = user?.email || ''

  const [notifs, setNotifs]           = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen]       = useState(false)
  const [bellLoading, setBellLoading] = useState(false)
  const bellRef = useRef(null)

  const loadNotifs = async () => {
    if (!user) return
    setBellLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-alert', {
        body: { action: 'get_notifications', user_id: user.id, limit: 10 }
      })
      if (!error && data?.ok) {
        setNotifs(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (_) {}
    setBellLoading(false)
  }

  useEffect(() => {
    loadNotifs()
    const iv = setInterval(loadNotifs, 60000)
    return () => clearInterval(iv)
  }, [user])

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sidebarRef = useRef(null)
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setSidebarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isMobile, sidebarOpen])

  const NAV_CERTS = [
    { id:'dashboard',         label:'Fleet',          icon:Layout      },
    { id:'issue',             label:'New SSL',        icon:Plus        },
    { id:'readiness',         label:'47-day radar',   icon:ShieldCheck, alert:true },
    { id:'renewal-calendar',  label:'Lifecycle',      icon:CalendarDays},
  ]
  const NAV_AUTOMATION = [
    { id:'my-servers',    label:'My Servers',     icon:Server   },
    { id:'certvault',     label:'Key Vault',      icon:Lock     },
    { id:'certbind',      label:'Live Verify',    icon:Shield   },
  ]
  const NAV_SECURITY = [
    { id:'shield',          label:'Shield',       icon:ShieldCheck },
    { id:'cert-changelog',  label:'Audit trail',  icon:History    },
  ]
  const NAV_INTELLIGENCE = [
    { id:'ca-intelligence', label:'CA Insights',  icon:TrendingUp },
  ]
  const NAV_BOTTOM = [
    { id:'kb',        label:'Docs & help',  icon:BookOpen  },
    { id:'settings',  label:'Settings',     icon:Settings  },
  ]

  const SECTION_TITLES = {
    dashboard:'Certificate inventory', issue:'New SSL',
    readiness:'47-day readiness', 'renewal-calendar':'Renewal calendar',
    servers:'Servers & agents', integrations:'DNS providers',
    certvault:'CertVault', certbind:'CertBind — Active Binding',
    shield:'Shield Intelligence', 'cert-changelog':'Audit log',
    'agent-health':'Servers & agents', infrastructure:'Servers & agents',
    'ca-intelligence':'CA intelligence',
    kb:'Docs & help', settings:'Settings',
    about:'About', developer:'Developer', contact:'Contact', pricing:'Pricing',
    'ca-connectors':'CA connectors',
  }

  const NavItem = ({ id, label, icon:Icon, pro, alert }) => {
    const isActive = section === id
    return (
      <button onClick={() => navigate(id)} style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 14px 8px 16px',
          cursor:'pointer', fontSize:13, fontWeight: isActive ? 600 : 500,
          color: isActive ? C.dark : C.body,
          background: isActive ? C.surface : 'transparent',
          borderLeft: isActive ? `3px solid ${C.sienna}` : '3px solid transparent',
          border:'none', width:'100%', textAlign:'left', fontFamily:F,
          transition:'all 0.15s ease',
          borderRadius:'0 6px 6px 0',
          marginBottom:1,
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background=C.alt; e.currentTarget.style.color=C.ink }}}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.body }}}
      >
        <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink:0, color: isActive ? C.sienna : 'inherit' }}/>
        <span style={{ flex:1 }}>{label}</span>
        {alert && !isActive && <span style={{ fontSize:8, fontWeight:700, padding:'2px 5px', borderRadius:3,
          background:C.greenBg, color:C.green, letterSpacing:'0.3px' }}>NEW</span>}
        {pro && !isActive && <span style={{ fontSize:8, fontWeight:700, padding:'2px 5px', borderRadius:3,
          background:C.siennaBg, color:C.sienna, letterSpacing:'0.3px' }}>PRO</span>}
      </button>
    )
  }

  const sideNav = (path) => {
    const map = { '/buy':'issue', '/dashboard':'dashboard', '/integrations':'integrations',
      '/certvault':'certvault', '/certbind':'certbind', '/install':'kb', '/':'dashboard' }
    const mapped = map[path]
    if (mapped) { navigate(mapped) } else { nav(path) }
  }

  const renderContent = () => {
    if (section === 'dashboard')       return <Dashboard nav={sideNav} onIssue={() => navigate('issue')}/>
    if (section === 'readiness')       return <ReadinessDashboard user={user}/>
    if (section === 'issue')           return <BuyCertificate nav={sideNav} embedded={true} onDashboard={() => navigate('dashboard')} onIssueAnother={() => navigate('issue')}/>
    if (section === 'integrations')    return <Integrations nav={sideNav}/>
    if (section === 'install')         return <Install nav={sideNav}/>
    if (section === 'kb')              return <KnowledgeBase nav={sideNav}/>
    if (section === 'pricing')         return <Pricing nav={sideNav}/>
    if (section === 'my-servers')      return <MyServers user={user}/>
    if (section === 'infrastructure')  return <MyServers user={user}/>
    if (section === 'servers')         return <Infrastructure user={user}/>
    if (section === 'agent-health')    return <Infrastructure user={user}/>
    if (section === 'certvault')       return <CertVault nav={sideNav}/>
    if (section === 'certbind')        return <CertBind nav={sideNav}/>
    if (section === 'settings')        return <SettingsPage user={user}/>
    if (section === 'ca-intelligence') return <CAIntelligenceHub nav={sideNav}/>
    if (section === 'shield')          return <ShieldIntelligence user={user}/>
    if (section === 'renewal-calendar') return <RenewalCalendar user={user}/>
    if (section === 'cert-changelog')  return <CertChangelog user={user}/>
    return null
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding:'16px 16px 12px', borderBottom:`1px solid ${C.line}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:C.green, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:C.ink, letterSpacing:'-0.3px', fontFamily:F }}>SSLVault</span>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 6px' }}>
        {[
          { label:'Certificates',  items: NAV_CERTS       },
          { label:'Deployment',    items: NAV_AUTOMATION   },
          { label:'Shield',        items: NAV_SECURITY     },
          { label:'Intelligence',  items: NAV_INTELLIGENCE },
        ].map(({ label, items }, i) => {
          const isOpen = openGroups[label] !== false
          const hasActive = items.some(item => item.id === section)
          return (
            <div key={label} style={{ marginBottom:4 }}>
              <button onClick={() => toggleGroup(label)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'6px 12px 5px', background:'none', border:'none', cursor:'pointer', fontFamily:F }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                  color: hasActive && !isOpen ? C.sienna : C.faint }}>
                  {label}
                </span>
                <span style={{ color:C.faint, fontSize:10,
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition:'transform 0.2s', display:'inline-block', lineHeight:1 }}>▾</span>
              </button>
              <div style={{ maxHeight: isOpen ? `${items.length * 42}px` : '0px', overflow:'hidden',
                transition:'max-height 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
                {items.map(item => <NavItem key={item.id} {...item}/>)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div style={{ borderTop:`1px solid ${C.line}`, padding:'6px 6px 4px' }}>
        {NAV_BOTTOM.map(item => <NavItem key={item.id} {...item}/>)}
      </div>

      {/* User */}
      <div style={{ borderTop:`1px solid ${C.line}`, padding:'10px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:C.green,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
            {(email[0]||'U').toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {email.split('@')[0]}
            </div>
            <div style={{ fontSize:10, color:C.faint, marginTop:1 }}>
              {email.split('@')[1] || 'easysecurity.in'}
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, padding:3, display:'flex', borderRadius:4, transition:'color .15s' }}
            title="Sign out"
            onMouseEnter={e=>e.currentTarget.style.color=C.red}
            onMouseLeave={e=>e.currentTarget.style.color=C.faint}>
            <LogOut size={13}/>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:F, background:C.page }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"/>

      {/* ── Top bar ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.line}`, height:48,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background:'none', border:'none', cursor:'pointer', color:C.ink,
                padding:4, display:'flex', alignItems:'center', borderRadius:6 }}>
              {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          )}
          {/* Current section title */}
          <span style={{ fontSize:14, fontWeight:700, color:C.ink, letterSpacing:'-0.2px' }}>
            {SECTION_TITLES[section] || 'SSLVault'}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {!isMobile && (
            <span style={{ fontSize:11, color:C.faint, fontFamily:MONO }}>{email}</span>
          )}

          {/* Bell */}
          <div ref={bellRef} style={{ position:'relative' }}>
            <button onClick={() => { setBellOpen(o => !o); if (!bellOpen) loadNotifs() }}
              style={{ background:'none', border:'none', cursor:'pointer', color:C.body,
                padding:6, display:'flex', alignItems:'center', borderRadius:6, position:'relative',
                transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color=C.ink}
              onMouseLeave={e=>e.currentTarget.style.color=C.body}>
              <Bell size={16}/>
              {unreadCount > 0 && (
                <span style={{ position:'absolute', top:2, right:2, width:8, height:8,
                  borderRadius:'50%', background:C.sienna, border:`1.5px solid ${C.surface}` }}/>
              )}
            </button>

            {bellOpen && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)',
                background:C.surface, border:`1px solid ${C.line}`, borderRadius:10,
                width:300, boxShadow:'0 8px 32px rgba(28,43,31,0.12)', zIndex:100 }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.line}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Notifications</span>
                  <button onClick={() => setBellOpen(false)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.faint, fontSize:11, fontFamily:F }}>
                    Mark all read
                  </button>
                </div>
                {bellLoading ? (
                  <div style={{ padding:'24px', textAlign:'center', color:C.faint, fontSize:12 }}>Loading…</div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding:'32px 16px', textAlign:'center', color:C.faint, fontSize:12 }}>No notifications yet</div>
                ) : notifs.map(n => (
                  <div key={n.id}
                    style={{ padding:'10px 16px', borderBottom:`1px solid ${C.line}`, cursor:'pointer',
                      background: n.read ? C.surface : C.greenBg, transition:'background .15s',
                      display:'flex', gap:10, alignItems:'flex-start' }}
                    onMouseEnter={e => e.currentTarget.style.background=C.alt}
                    onMouseLeave={e => e.currentTarget.style.background=n.read?C.surface:C.greenBg}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:n.color||C.green, marginTop:4, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:n.read?500:700, color:C.ink, marginBottom:2, lineHeight:1.3 }}>{n.title}</div>
                      <div style={{ fontSize:11, color:C.body, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>
                    </div>
                    {!n.read && <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, flexShrink:0, marginTop:5 }}/>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => supabase.auth.signOut()}
            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none',
              cursor:'pointer', color:C.faint, fontSize:12, fontFamily:F, padding:'4px 8px',
              borderRadius:6, transition:'all .15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color=C.red }}
            onMouseLeave={e=>{ e.currentTarget.style.color=C.faint }}>
            <LogOut size={13}/>
            {!isMobile && 'Sign out'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:'flex', flex:1, position:'relative' }}>

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div style={{ position:'fixed', inset:0, background:'rgba(28,43,31,0.4)', zIndex:39 }}
            onClick={() => setSidebarOpen(false)}/>
        )}

        {/* ── Sidebar ── */}
        <nav ref={sidebarRef} style={{
          width:220,
          background:C.surface,
          borderRight:`1px solid ${C.line}`,
          display:'flex', flexDirection:'column', flexShrink:0,
          overflowY:'auto',
          ...(isMobile ? {
            position:'fixed', left:0, top:48, bottom:0, zIndex:40,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
            boxShadow:'4px 0 24px rgba(28,43,31,0.15)',
          } : {
            position:'sticky', top:48, height:'calc(100vh - 48px)',
          })
        }}>
          <SidebarContent />
        </nav>

        {/* ── Main content ── */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', background:C.page }}>
          <div key={animKey} style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            animation:'clm-fadein 0.2s cubic-bezier(0.4,0,0.2,1)' }}>
            {renderContent()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clm-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        body { font-family:'Space Grotesk','DM Sans',system-ui,sans-serif; }
        ::-webkit-scrollbar { width:5px; height:5px }
        ::-webkit-scrollbar-track { background:#EDE8DC }
        ::-webkit-scrollbar-thumb { background:#C4BAA8; border-radius:99px }
      `}</style>
    </div>
  )
}
