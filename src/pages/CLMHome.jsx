// CLMHome.jsx — SSLVault CLM shell (Phase 1 redesign: landing-page benchmark)
// Ink sidebar in the landing footer's design language · white topbar · AppKit tokens.
// All routing/notification/session logic identical to the previous shell.
import { useState, useEffect, useRef } from 'react'
import {
  Plus, CalendarDays, LayoutDashboard, Settings, BookOpen,
  LogOut, Bell, Menu, X, Globe, KeyRound, FilePlus2,
  ClipboardCheck, Fingerprint, TrendingUp,
} from 'lucide-react'
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
import RenewalCalendar from './RenewalCalendar'
import AdminRenewalCalendar from './AdminRenewalCalendar'
import CertTimeline from './CertTimeline'
import CTAbuseMonitor from './CTAbuseMonitor'
import ReadinessDashboard from './ReadinessDashboard'
import Infrastructure from './Infrastructure'
import MyServers from './MyServers'
import DomainManager from './DomainManager'
import CertVault from './CertVault'
import SLADashboard from './SLADashboard'
import ComplianceCentre from './ComplianceCentre'
import ComplianceWitness from './ComplianceWitness'
import CertBind from './CertBind'
import KeyIntelligence from './KeyIntelligence'
import Pricing from './Pricing'
import { F, DM, MONO, BLUE, BLUE2, INK, BG, BORDER, LINE, MUTED, MUTED2, BODY, GRN, RED, GRAD, SHADOW_LG } from '../components/AppKit'

function useIsMobile(bp=860) {
  const [m,setM] = useState(window.innerWidth<=bp)
  useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp])
  return m
}

export default function CLMHome({ user, nav, initialSection }) {
  const [sec, setSec] = useState(initialSection || 'dashboard')
  const [key, setKey] = useState(0)
  const [sideOpen, setSideOpen] = useState(false)
  const isMobile = useIsMobile()
  const sideRef = useRef(null)
  const bellRef = useRef(null)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const [session, setSession] = useState(null)
  const email = user?.email || ''
  const initials = email.slice(0,2).toUpperCase()

  const loadNotifs = async () => {
    if (!user) return
    try {
      const {data,error} = await supabase.functions.invoke('send-alert',{body:{action:'get_notifications',user_id:user.id,limit:10}})
      if (!error&&data?.ok){setNotifs(data.notifications||[]);setUnread(data.unread_count||0)}
    } catch(_){}
  }
  useEffect(()=>{loadNotifs();const iv=setInterval(loadNotifs,60000);return()=>clearInterval(iv)},[user])
  useEffect(()=>{const h=e=>{if(bellRef.current&&!bellRef.current.contains(e.target))setBellOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{
    if(!isMobile||!sideOpen)return
    const h=e=>{if(sideRef.current&&!sideRef.current.contains(e.target))setSideOpen(false)}
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)
  },[isMobile,sideOpen])

  const go=id=>{if(id===sec)return;setSec(id);setKey(k=>k+1);if(isMobile)setSideOpen(false)}
  const sideNav=path=>{
    const map={'/buy':'issue','/dashboard':'dashboard','/integrations':'integrations','/certvault':'certvault','/certbind':'certbind','/install':'kb','/':'dashboard'}
    const m=map[path];if(m)go(m);else nav(path)
  }

  const NAV = [
    { group:'Manage', items:[
      {id:'dashboard',         label:'Dashboard',        icon:LayoutDashboard},
      {id:'issue',             label:'New Certificate',  icon:FilePlus2},
      {id:'cert-timeline',     label:'Cert Timeline',    icon:CalendarDays},
    ]},
    { group:'Automate', items:[
      {id:'domain-manager',    label:'Domain Manager',   icon:Globe},
    ]},
    { group:'Secure', items:[
      {id:'key-intelligence',  label:'Key Vault',        icon:KeyRound},
    ]},
    { group:'Prove', items:[
      {id:'compliance-witness',  label:'Compliance Witness', icon:Fingerprint, badge:'NEW'},
      {id:'compliance-centre',   label:'Compliance',         icon:ClipboardCheck},
    ]},
    { group:'Intelligence', items:[
      {id:'ca-intelligence',   label:'PKI Intelligence', icon:TrendingUp},
    ]},
  ]

  const BOTTOM = [
    {id:'kb',       label:'Docs & help',  icon:BookOpen},
    {id:'settings', label:'Settings',     icon:Settings},
  ]

  const TITLES = {
    'renewal-calendar':'Renewal calendar', certvault:'CertVault', certbind:'CertBind',
    'domain-manager':'Domain Manager', 'my-servers':'Domain Manager',
    'infrastructure':'Domain Manager', 'servers':'Domain Manager', 'agent-health':'Domain Manager',
    shield:'PKI Intelligence',
    'cert-changelog':'Activity log', 'ca-intelligence':'PKI Intelligence', 'sla-dashboard':'SLA Coverage', 'compliance-centre':'Compliance', 'compliance-witness':'Compliance Witness',
    'admin-calendar':'Admin Calendar',
    'cert-timeline':'Cert Timeline',
    kb:'Docs & help', settings:'Settings', pricing:'Pricing',
    issue:'New Certificate', dashboard:'Dashboard', 'key-intelligence':'Key Vault',
  }

  const content = () => {
    if(sec==='dashboard')        return <Dashboard nav={sideNav} onIssue={()=>go('issue')}/>
    if(sec==='readiness')        return <ReadinessDashboard user={user} onNav={go}/>
    if(sec==='issue')            return <BuyCertificate nav={sideNav} embedded onDashboard={()=>go('dashboard')} onIssueAnother={()=>go('issue')}/>
    if(sec==='integrations')     return <Integrations nav={sideNav}/>
    if(sec==='install')          return <Install nav={sideNav}/>
    if(sec==='kb')               return <KnowledgeBase nav={sideNav}/>
    if(sec==='pricing')          return <Pricing nav={sideNav}/>
    if(sec==='domain-manager')   return <DomainManager user={user} nav={sideNav}/>
    if(sec==='my-servers')       return <MyServers user={user}/>
    if(sec==='infrastructure')   return <MyServers user={user}/>
    if(sec==='servers')          return <MyServers user={user}/>
    if(sec==='agent-health')     return <MyServers user={user}/>
    if(sec==='certvault')        return <KeyIntelligence nav={sideNav}/>
    if(sec==='certbind')         return <KeyIntelligence nav={sideNav}/>
    if(sec==='key-intelligence') return <KeyIntelligence nav={sideNav}/>
    if(sec==='settings')         return <SettingsPage user={user}/>
    if(sec==='ca-intelligence')  return <CAIntelligenceHub nav={sideNav}/>
    if(sec==='shield')           return <CAIntelligenceHub nav={nav}/>
    if(sec==='cert-timeline')    return <CertTimeline user={user}/>
    if(sec==='renewal-calendar') return <RenewalCalendar user={user}/>
    if(sec==='cert-changelog')   return <CertChangelog user={user}/>
    if(sec==='sla-dashboard')    return <SLADashboard nav={sideNav}/>
    if(sec==='compliance-centre') return <ComplianceCentre nav={sideNav} user={user}/>
    if(sec==='compliance-witness')  return <ComplianceWitness user={user}/>
    if(sec==='admin-calendar')   return <AdminRenewalCalendar user={user}/>
    return null
  }

  // ── Sidebar item — footer-language link, blue-gradient pill when active ──
  const NavItem = ({id, label, icon:Icon, badge}) => {
    const on = sec===id
    return (
      <button onClick={()=>go(id)} style={{
        display:'flex', alignItems:'center', gap:10,
        margin:'0 8px 2px', padding:'8px 10px',
        width:'calc(100% - 16px)', textAlign:'left', fontFamily:F,
        fontSize:12.5, fontWeight:on?700:500,
        color: on ? '#fff' : 'rgba(255,255,255,0.62)',
        background: on ? GRAD : 'transparent',
        boxShadow: on ? '0 4px 14px rgba(0,119,182,0.35)' : 'none',
        border:'none', cursor:'pointer',
        borderRadius:8, transition:'all 0.12s',
      }}
        onMouseEnter={e=>{if(!on){e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='#fff'}}}
        onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.62)'}}}>
        <Icon size={15} strokeWidth={on?2.2:1.8} style={{flexShrink:0, opacity:0.92}}/>
        <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{label}</span>
        {badge&&!on&&<span style={{fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:4,
          background:'rgba(0,165,80,0.18)',color:'#39d98a',letterSpacing:'0.05em',flexShrink:0}}>{badge}</span>}
      </button>
    )
  }

  const Sidebar = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Logo */}
      <div style={{padding:'16px 16px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:GRAD,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style={{fontSize:13.5,fontWeight:800,color:'#fff',letterSpacing:'-0.2px',lineHeight:1.15,fontFamily:DM}}>SSLVault</div>
            <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',marginTop:1,fontFamily:MONO,letterSpacing:'0.04em'}}>CLM PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{flex:1,overflowY:'auto',padding:'4px 0 8px'}}>
        {NAV.map(({group,items})=>(
          <div key={group}>
            <div style={{padding:'14px 16px 6px'}}>
              <span style={{fontSize:9.5,fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color:'rgba(255,255,255,0.38)',fontFamily:MONO}}>{group}</span>
            </div>
            {items.map(it=><NavItem key={it.id} {...it}/>)}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',padding:'8px 0 4px'}}>
        {BOTTOM.map(it=><NavItem key={it.id} {...it}/>)}
      </div>

      {/* User */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',padding:'12px 14px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:GRAD,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:11,fontWeight:800,color:'#fff',flexShrink:0,letterSpacing:'-0.3px',fontFamily:DM}}>
            {initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11.5,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {email.split('@')[0]}
            </div>
            <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {email.split('@')[1]||''}
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()}
            style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:4,borderRadius:4,display:'flex',transition:'color .12s'}}
            title="Sign out"
            onMouseEnter={e=>e.currentTarget.style.color='#fff'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
            <LogOut size={13}/>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',fontFamily:F,background:BG,color:'#111111'}}>

      {/* ── Topbar ── */}
      <div style={{
        background:'#ffffff', borderBottom:`1px solid ${BORDER}`,
        height:52, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 20px',
        flexShrink:0, position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {isMobile&&(
            <button onClick={()=>setSideOpen(o=>!o)}
              style={{background:'none',border:'none',cursor:'pointer',color:BODY,padding:4,display:'flex',borderRadius:4}}>
              {sideOpen?<X size={16}/>:<Menu size={16}/>}
            </button>
          )}
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            {!isMobile&&<span style={{fontSize:10.5,color:MUTED2,fontFamily:MONO}}>CLM /</span>}
            <span style={{fontSize:14,fontWeight:800,color:'#111111',fontFamily:DM}}>{TITLES[sec]||'SSLVault'}</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* New certificate */}
          {sec!=='issue'&&(
            <button onClick={()=>go('issue')} style={{
              display:'inline-flex',alignItems:'center',gap:6,background:BLUE,color:'#fff',
              border:'none',borderRadius:8,padding:isMobile?'7px 10px':'7px 13px',fontSize:11.5,fontWeight:800,
              fontFamily:DM,cursor:'pointer',transition:'background .12s'}}
              onMouseEnter={e=>e.currentTarget.style.background=BLUE2}
              onMouseLeave={e=>e.currentTarget.style.background=BLUE}>
              <Plus size={13}/>{!isMobile&&'New certificate'}
            </button>
          )}
          {/* Bell */}
          <div ref={bellRef} style={{position:'relative'}}>
            <button onClick={()=>{setBellOpen(o=>!o);if(!bellOpen)loadNotifs()}}
              style={{background:'#fff',border:`1px solid ${BORDER}`,cursor:'pointer',color:BODY,width:32,height:32,
                display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,position:'relative',
                transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,119,182,0.06)';e.currentTarget.style.color=BLUE}}
              onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color=BODY}}>
              <Bell size={14}/>
              {unread>0&&<span style={{position:'absolute',top:6,right:6,width:6,height:6,
                borderRadius:'50%',background:RED,border:'1.5px solid #fff'}}/>}
            </button>
            {bellOpen&&(
              <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:'#fff',
                border:`1px solid ${BORDER}`,borderRadius:12,width:300,
                boxShadow:SHADOW_LG,zIndex:100,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${LINE}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12.5,fontWeight:800,color:'#111111',fontFamily:DM}}>Notifications</span>
                  <button onClick={()=>setBellOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:11,fontFamily:F}}>Close</button>
                </div>
                {notifs.length===0
                  ? <div style={{padding:'28px 16px',textAlign:'center',color:MUTED,fontSize:12}}>No notifications yet</div>
                  : notifs.map(n=>(
                    <div key={n.id} style={{padding:'10px 16px',borderBottom:`1px solid ${LINE}`,
                      background:n.read?'transparent':'rgba(0,119,182,0.04)',display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:n.read?MUTED2:BLUE,marginTop:4,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:n.read?400:600,color:'#111111',marginBottom:1,lineHeight:1.3}}>{n.title}</div>
                        <div style={{fontSize:11,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,position:'relative'}}>
        {isMobile&&sideOpen&&(
          <div style={{position:'fixed',inset:0,background:'rgba(13,17,23,0.55)',zIndex:39}} onClick={()=>setSideOpen(false)}/>
        )}

        {/* Sidebar */}
        <nav ref={sideRef} style={{
          width:232, background:INK, borderRight:'1px solid rgba(0,0,0,0.18)',
          flexShrink:0, overflowY:'auto',
          ...(isMobile
            ? {position:'fixed',left:0,top:52,bottom:0,zIndex:40,
               transform:sideOpen?'translateX(0)':'translateX(-100%)',
               transition:'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
               boxShadow:'4px 0 20px rgba(0,0,0,0.25)'}
            : {position:'sticky',top:52,height:'calc(100vh - 52px)'}),
        }}>
          <Sidebar/>
        </nav>

        {/* Main */}
        <div style={{flex:1,minWidth:0,background:BG,overflowY:'auto',minHeight:'calc(100vh - 52px)'}}>
          <div key={key} style={{minHeight:'100%',animation:'fadein 0.18s ease'}}>
            {content()}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        body{font-family:'Inter',system-ui,sans-serif;background:#f0f4fa}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,119,182,0.22);border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,119,182,0.38)}
      `}</style>
    </div>
  )
}
