// CLMHome.jsx — Owlish.bot design · all nav/content preserved
import { useState, useEffect, useRef } from 'react'
import { Shield, Plus, Server, TrendingUp, History, CalendarDays, ShieldCheck, Layout, Settings, Lock, BookOpen, LogOut, Bell, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import SettingsPage from './SettingsPage'
import Integrations from './Integrations'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import CAIntelligenceHub from './CAIntelligenceHub'
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

const F    = "'Inter',system-ui,sans-serif"
const BG   = '#0a0a0a'
const BG2  = '#0d0d0d'
const BG3  = '#111111'
const BG4  = '#161616'
const LINE = 'rgba(255,255,255,0.07)'
const LINE2= 'rgba(255,255,255,0.12)'
const T1   = '#ffffff'
const T2   = 'rgba(255,255,255,0.55)'
const T3   = 'rgba(255,255,255,0.28)'

const DEFAULT_OPEN = { Certificates:true, Deployment:true, Shield:true, Intelligence:true }

function useIsMobile(bp=768) {
  const [m,setM] = useState(typeof window!=='undefined'?window.innerWidth<=bp:false)
  useEffect(()=>{ const h=()=>setM(window.innerWidth<=bp); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h) },[bp])
  return m
}

export default function CLMHome({ user, nav }) {
  const [section, setSection] = useState('dashboard')
  const [animKey, setAnimKey] = useState(0)
  const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const sidebarRef = useRef(null)
  const bellRef = useRef(null)

  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const [bellLoading, setBellLoading] = useState(false)

  const loadNotifs = async () => {
    if (!user) return; setBellLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-alert', { body:{ action:'get_notifications', user_id:user.id, limit:10 } })
      if (!error && data?.ok) { setNotifs(data.notifications||[]); setUnreadCount(data.unread_count||0) }
    } catch(_) {}
    setBellLoading(false)
  }
  useEffect(()=>{ loadNotifs(); const iv=setInterval(loadNotifs,60000); return()=>clearInterval(iv) },[user])
  useEffect(()=>{ const h=(e)=>{ if(bellRef.current&&!bellRef.current.contains(e.target))setBellOpen(false) }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) },[])
  useEffect(()=>{
    if(!isMobile||!sidebarOpen)return
    const h=(e)=>{ if(sidebarRef.current&&!sidebarRef.current.contains(e.target))setSidebarOpen(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[isMobile,sidebarOpen])

  const navigate = (id) => { if(id===section)return; setSection(id); setAnimKey(k=>k+1); if(isMobile)setSidebarOpen(false) }
  const email = user?.email || ''

  const NAV_CERTS = [
    {id:'dashboard',label:'Fleet',icon:Layout},
    {id:'issue',label:'New SSL',icon:Plus},
    {id:'readiness',label:'47-day radar',icon:ShieldCheck,alert:true},
    {id:'renewal-calendar',label:'Lifecycle',icon:CalendarDays},
  ]
  const NAV_AUTOMATION = [
    {id:'my-servers',label:'My Servers',icon:Server},
    {id:'certvault',label:'Key Vault',icon:Lock},
    {id:'certbind',label:'Live Verify',icon:Shield},
  ]
  const NAV_SECURITY = [
    {id:'shield',label:'Shield',icon:ShieldCheck},
    {id:'cert-changelog',label:'Audit trail',icon:History},
  ]
  const NAV_INTELLIGENCE = [
    {id:'ca-intelligence',label:'CA Insights',icon:TrendingUp},
  ]
  const NAV_BOTTOM = [
    {id:'kb',label:'Docs & help',icon:BookOpen},
    {id:'settings',label:'Settings',icon:Settings},
  ]
  const SECTION_TITLES = {
    dashboard:'Certificate inventory',issue:'New SSL',readiness:'47-day readiness',
    'renewal-calendar':'Renewal calendar',servers:'Servers & agents',
    integrations:'DNS providers',certvault:'CertVault',certbind:'CertBind — Active Binding',
    shield:'Shield Intelligence','cert-changelog':'Audit log','agent-health':'Servers & agents',
    infrastructure:'Servers & agents','ca-intelligence':'CA intelligence',
    kb:'Docs & help',settings:'Settings',about:'About',developer:'Developer',contact:'Contact',pricing:'Pricing','ca-connectors':'CA connectors',
  }

  const NavItem = ({ id, label, icon:Icon, alert }) => {
    const isActive = section===id
    return (
      <button onClick={()=>navigate(id)} style={{
        display:'flex',alignItems:'center',gap:9,padding:'7px 12px',cursor:'pointer',
        fontSize:12,fontWeight:isActive?500:400,
        color:isActive?T1:T2,
        background:isActive?'rgba(255,255,255,0.07)':'transparent',
        borderLeft:`2px solid ${isActive?'rgba(255,255,255,0.5)':'transparent'}`,
        border:'none',width:'100%',textAlign:'left',fontFamily:F,
        transition:'all 0.12s',borderRadius:'0 3px 3px 0',marginBottom:1,
      }}
        onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color=T1}}}
        onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background='transparent';e.currentTarget.style.color=T2}}}>
        <Icon size={13} strokeWidth={isActive?2:1.7} style={{flexShrink:0}}/>
        <span style={{flex:1}}>{label}</span>
        {alert&&!isActive&&<span style={{fontSize:8,fontWeight:600,padding:'1px 5px',borderRadius:2,background:'rgba(255,255,255,0.08)',color:T3,fontFamily:'monospace'}}>NEW</span>}
      </button>
    )
  }

  const sideNav = (path) => {
    const map={'/buy':'issue','/dashboard':'dashboard','/integrations':'integrations','/certvault':'certvault','/certbind':'certbind','/install':'kb','/':'dashboard'}
    const mapped=map[path]; if(mapped){navigate(mapped)}else{nav(path)}
  }

  const renderContent = () => {
    if(section==='dashboard')       return <Dashboard nav={sideNav} onIssue={()=>navigate('issue')}/>
    if(section==='readiness')       return <ReadinessDashboard user={user}/>
    if(section==='issue')           return <BuyCertificate nav={sideNav} embedded={true} onDashboard={()=>navigate('dashboard')} onIssueAnother={()=>navigate('issue')}/>
    if(section==='integrations')    return <Integrations nav={sideNav}/>
    if(section==='install')         return <Install nav={sideNav}/>
    if(section==='kb')              return <KnowledgeBase nav={sideNav}/>
    if(section==='pricing')         return <Pricing nav={sideNav}/>
    if(section==='my-servers')      return <MyServers user={user}/>
    if(section==='infrastructure')  return <MyServers user={user}/>
    if(section==='servers')         return <Infrastructure user={user}/>
    if(section==='agent-health')    return <Infrastructure user={user}/>
    if(section==='certvault')       return <CertVault nav={sideNav}/>
    if(section==='certbind')        return <CertBind nav={sideNav}/>
    if(section==='settings')        return <SettingsPage user={user}/>
    if(section==='ca-intelligence') return <CAIntelligenceHub nav={sideNav}/>
    if(section==='shield')          return <ShieldIntelligence user={user}/>
    if(section==='renewal-calendar') return <RenewalCalendar user={user}/>
    if(section==='cert-changelog')  return <CertChangelog user={user}/>
    return null
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{padding:'14px 14px 10px',borderBottom:`1px solid ${LINE}`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:20,height:20,background:T1,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:T1,fontFamily:F}}>SSLVault</span>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{flex:1,overflowY:'auto',padding:'8px 4px'}}>
        {[{label:'Certificates',items:NAV_CERTS},{label:'Deployment',items:NAV_AUTOMATION},{label:'Shield',items:NAV_SECURITY},{label:'Intelligence',items:NAV_INTELLIGENCE}].map(({label,items})=>{
          const isOpen = openGroups[label]!==false
          return (
            <div key={label} style={{marginBottom:4}}>
              <button onClick={()=>setOpenGroups(p=>({...p,[label]:!p[label]}))}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 12px 4px',background:'none',border:'none',cursor:'pointer',fontFamily:F}}>
                <span style={{fontSize:9.5,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T3}}>{label}</span>
                <span style={{color:T3,fontSize:9.5,transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.18s',display:'inline-block',lineHeight:1}}>▾</span>
              </button>
              <div style={{maxHeight:isOpen?`${items.length*34}px`:'0px',overflow:'hidden',transition:'max-height 0.22s ease'}}>
                {items.map(item=><NavItem key={item.id} {...item}/>)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div style={{borderTop:`1px solid ${LINE}`,padding:'6px 4px 4px'}}>
        {NAV_BOTTOM.map(item=><NavItem key={item.id} {...item}/>)}
      </div>

      {/* User */}
      <div style={{borderTop:`1px solid ${LINE}`,padding:'10px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:`1px solid ${LINE2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:T2,flexShrink:0}}>
            {(email[0]||'U').toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:500,color:T1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email.split('@')[0]}</div>
            <div style={{fontSize:9.5,color:T3,marginTop:1}}>{email.split('@')[1]||'easysecurity.in'}</div>
          </div>
          <button onClick={()=>supabase.auth.signOut()}
            style={{background:'none',border:'none',cursor:'pointer',color:T3,padding:3,display:'flex',borderRadius:3,transition:'color .15s'}}
            title="Sign out"
            onMouseEnter={e=>e.currentTarget.style.color='rgba(248,113,113,0.8)'}
            onMouseLeave={e=>e.currentTarget.style.color=T3}>
            <LogOut size={12}/>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',fontFamily:F,background:BG}}>

      {/* ── Top bar ── */}
      <div style={{background:BG,borderBottom:`1px solid ${LINE}`,height:46,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',flexShrink:0,position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {isMobile&&<button onClick={()=>setSidebarOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:T2,padding:4,display:'flex',alignItems:'center',borderRadius:3}}>
            {sidebarOpen?<X size={16}/>:<Menu size={16}/>}
          </button>}
          <span style={{fontSize:12,fontWeight:500,color:T1}}>{SECTION_TITLES[section]||'SSLVault'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {!isMobile&&<span style={{fontSize:11,color:T3,fontFamily:'monospace'}}>{email}</span>}
          <div ref={bellRef} style={{position:'relative'}}>
            <button onClick={()=>{setBellOpen(o=>!o);if(!bellOpen)loadNotifs()}}
              style={{background:'none',border:'none',cursor:'pointer',color:T2,padding:5,display:'flex',alignItems:'center',borderRadius:3,position:'relative',transition:'color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>
              <Bell size={14}/>
              {unreadCount>0&&<span style={{position:'absolute',top:2,right:2,width:6,height:6,borderRadius:'50%',background:'rgba(248,113,113,0.9)',border:`1.5px solid ${BG}`}}/>}
            </button>
            {bellOpen&&(
              <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:BG3,border:`1px solid ${LINE2}`,borderRadius:4,width:280,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:100}}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${LINE}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,fontWeight:500,color:T1}}>Notifications</span>
                  <button onClick={()=>setBellOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:T3,fontSize:11,fontFamily:F}}>Mark all read</button>
                </div>
                {bellLoading?<div style={{padding:'20px',textAlign:'center',color:T3,fontSize:11}}>Loading…</div>
                :notifs.length===0?<div style={{padding:'28px 14px',textAlign:'center',color:T3,fontSize:11}}>No notifications yet</div>
                :notifs.map(n=>(
                  <div key={n.id} style={{padding:'9px 14px',borderBottom:`1px solid ${LINE}`,cursor:'pointer',background:n.read?'transparent':'rgba(255,255,255,0.02)',display:'flex',gap:9,alignItems:'flex-start'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'} onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(255,255,255,0.02)'}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:n.color||'rgba(255,255,255,0.3)',marginTop:4,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11.5,fontWeight:n.read?400:500,color:T1,marginBottom:1,lineHeight:1.3}}>{n.title}</div>
                      <div style={{fontSize:10.5,color:T3,lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={()=>supabase.auth.signOut()}
            style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',color:T3,fontSize:11,fontFamily:F,padding:'3px 6px',borderRadius:3,transition:'color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='rgba(248,113,113,0.8)'} onMouseLeave={e=>e.currentTarget.style.color=T3}>
            <LogOut size={12}/>{!isMobile&&' Sign out'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,position:'relative'}}>
        {isMobile&&sidebarOpen&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:39}} onClick={()=>setSidebarOpen(false)}/>}

        {/* Sidebar */}
        <nav ref={sidebarRef} style={{
          width:200,background:BG2,borderRight:`1px solid ${LINE}`,
          display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto',
          ...(isMobile?{position:'fixed',left:0,top:46,bottom:0,zIndex:40,transform:sidebarOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.22s ease',boxShadow:'4px 0 24px rgba(0,0,0,0.5)'}:{position:'sticky',top:46,height:'calc(100vh - 46px)'}),
        }}>
          <SidebarContent/>
        </nav>

        {/* Main */}
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',background:BG}}>
          <div key={animKey} style={{flex:1,overflowY:'auto',overflowX:'hidden',animation:'clm-fadein 0.18s ease'}}>
            {renderContent()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clm-fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        body{font-family:'Inter',system-ui,sans-serif;background:#0a0a0a}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0d0d0d}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
      `}</style>
    </div>
  )
}
