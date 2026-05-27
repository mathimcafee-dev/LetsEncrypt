import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Server, TrendingUp, History, CalendarDays,
  ShieldCheck, LayoutDashboard, Settings, Lock, BookOpen,
  LogOut, Bell, Menu, X, ChevronDown, ChevronRight
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

// ── Design tokens ──────────────────────────────────────────────────────
const F = "'Montserrat',system-ui,sans-serif"
const NAVY  = '#0d2b2b'   // page bg
const CARD  = '#1a4040'   // card / topbar bg
const CARD2 = '#0f3535'   // elevated card
const CARD3 = '#133d3d'   // input / hover
const LINE  = 'rgba(192,57,43,0.15)'
const LINE2 = 'rgba(192,57,43,0.25)'
const INK   = 'rgba(192,57,43,0.1)'
const BODY  = 'rgba(232,245,244,0.7)'
const MUTED = 'rgba(232,245,244,0.4)'
const BLUE  = '#e07060'
const BLUEH = '#e07060'
const GREEN = '#4ade80'
const RED   = '#f87171'
const AMBER = '#fbbf24'

function useIsMobile(bp=860) {
  const [m,setM] = useState(window.innerWidth<=bp)
  useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp])
  return m
}

export default function CLMHome({ user, nav }) {
  const [sec, setSec] = useState('dashboard')
  const [key, setKey] = useState(0)
  const [open, setOpen] = useState({Certificates:true,Deployment:true,Shield:true,Intelligence:true})
  const [sideOpen, setSideOpen] = useState(false)
  const isMobile = useIsMobile()
  const sideRef = useRef(null)
  const bellRef = useRef(null)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
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
    { group:'Certificates', items:[
      {id:'dashboard',    label:'Fleet overview',  icon:LayoutDashboard},
      {id:'issue',        label:'Issue certificate',icon:Plus},
      {id:'readiness',    label:'47-day readiness', icon:ShieldCheck, badge:'NEW'},
      {id:'renewal-calendar',label:'Renewal calendar',icon:CalendarDays},
    ]},
    { group:'Deployment', items:[
      {id:'my-servers',   label:'Servers',          icon:Server},
      {id:'certvault',    label:'Key Vault',         icon:Lock},
      {id:'certbind',     label:'CertBind',          icon:Shield},
    ]},
    { group:'Shield', items:[
      {id:'shield',       label:'Shield intelligence',icon:ShieldCheck},
      {id:'cert-changelog',label:'Audit log',         icon:History},
    ]},
    { group:'Intelligence', items:[
      {id:'ca-intelligence',label:'CA Intelligence',  icon:TrendingUp},
    ]},
  ]

  const BOTTOM = [
    {id:'kb',       label:'Docs & help',  icon:BookOpen},
    {id:'settings', label:'Settings',     icon:Settings},
  ]

  const TITLES = {
    dashboard:'Fleet overview', issue:'Issue certificate', readiness:'47-day readiness',
    'renewal-calendar':'Renewal calendar', certvault:'Key Vault', certbind:'CertBind',
    'my-servers':'Servers', integrations:'DNS providers', shield:'Shield Intelligence',
    'cert-changelog':'Audit log', 'ca-intelligence':'CA Intelligence',
    kb:'Docs & help', settings:'Settings', pricing:'Pricing',
  }

  const content = () => {
    if(sec==='dashboard')        return <Dashboard nav={sideNav} onIssue={()=>go('issue')}/>
    if(sec==='readiness')        return <ReadinessDashboard user={user}/>
    if(sec==='issue')            return <BuyCertificate nav={sideNav} embedded onDashboard={()=>go('dashboard')} onIssueAnother={()=>go('issue')}/>
    if(sec==='integrations')     return <Integrations nav={sideNav}/>
    if(sec==='install')          return <Install nav={sideNav}/>
    if(sec==='kb')               return <KnowledgeBase nav={sideNav}/>
    if(sec==='pricing')          return <Pricing nav={sideNav}/>
    if(sec==='my-servers')       return <MyServers user={user}/>
    if(sec==='infrastructure')   return <MyServers user={user}/>
    if(sec==='servers')          return <Infrastructure user={user}/>
    if(sec==='agent-health')     return <Infrastructure user={user}/>
    if(sec==='certvault')        return <CertVault nav={sideNav}/>
    if(sec==='certbind')         return <CertBind nav={sideNav}/>
    if(sec==='settings')         return <SettingsPage user={user}/>
    if(sec==='ca-intelligence')  return <CAIntelligenceHub nav={sideNav}/>
    if(sec==='shield')           return <ShieldIntelligence user={user}/>
    if(sec==='renewal-calendar') return <RenewalCalendar user={user}/>
    if(sec==='cert-changelog')   return <CertChangelog user={user}/>
    return null
  }

  const NavItem = ({id, label, icon:Icon, badge}) => {
    const on = sec===id
    return (
      <button onClick={()=>go(id)} style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'8px 12px 8px 16px',
        width:'100%', textAlign:'left', fontFamily:F,
        fontSize:13, fontWeight:on?500:400,
        color: on ? INK : BODY,
        background: on ? CARD2 : 'transparent',
        borderLeft: `2px solid ${on ? BLUE : 'transparent'}`,
        border:'none', cursor:'pointer',
        borderRadius:'0 6px 6px 0',
        marginBottom:1, transition:'all 0.1s',
      }}
        onMouseEnter={e=>{if(!on){e.currentTarget.style.background=CARD;e.currentTarget.style.color=INK}}}
        onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.color=BODY}}}>
        <Icon size={14} strokeWidth={on?2.2:1.8} color={on?BLUE:undefined} style={{flexShrink:0}}/>
        <span style={{flex:1}}>{label}</span>
        {badge&&!on&&<span style={{fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:3,
          background:BLUEH+'22',color:BLUE,letterSpacing:'0.02em'}}>{badge}</span>}
      </button>
    )
  }

  const Sidebar = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Logo */}
      <div style={{padding:'16px 16px 14px',borderBottom:`1px solid ${LINE}`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:BLUE,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:INK,letterSpacing:'-0.2px',lineHeight:1.2}}>SSLVault</div>
            <div style={{fontSize:10,color:MUTED,marginTop:1}}>Certificate Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 8px 8px'}}>
        {NAV.map(({group,items})=>(
          <div key={group} style={{marginBottom:6}}>
            <button onClick={()=>setOpen(p=>({...p,[group]:!p[group]}))}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'4px 8px 4px 10px',background:'none',border:'none',cursor:'pointer',fontFamily:F}}>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:MUTED}}>{group}</span>
              {open[group]
                ? <ChevronDown size={10} color={MUTED}/>
                : <ChevronRight size={10} color={MUTED}/>}
            </button>
            {open[group]&&items.map(it=><NavItem key={it.id} {...it}/>)}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{borderTop:`1px solid ${LINE}`,padding:'8px 8px 4px'}}>
        {BOTTOM.map(it=><NavItem key={it.id} {...it}/>)}
      </div>

      {/* User */}
      <div style={{borderTop:`1px solid ${LINE}`,padding:'12px 14px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,${BLUE},${BLUEH})`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:11,fontWeight:700,color:'#fff',flexShrink:0,letterSpacing:'-0.3px'}}>
            {initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,color:INK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {email.split('@')[0]}
            </div>
            <div style={{fontSize:10,color:MUTED,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {email.split('@')[1]||''}
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()}
            style={{background:'none',border:'none',cursor:'pointer',color:MUTED,padding:4,borderRadius:4,display:'flex',transition:'color .12s'}}
            title="Sign out"
            onMouseEnter={e=>e.currentTarget.style.color=RED}
            onMouseLeave={e=>e.currentTarget.style.color=MUTED}>
            <LogOut size={13}/>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',fontFamily:F,background:NAVY,color:INK}}>

      {/* ── Topbar ── */}
      <div style={{
        background:CARD, borderBottom:`1px solid ${LINE}`,
        height:50, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 20px',
        flexShrink:0, position:'sticky', top:0, zIndex:50,
        boxShadow:'0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {isMobile&&(
            <button onClick={()=>setSideOpen(o=>!o)}
              style={{background:'none',border:'none',cursor:'pointer',color:BODY,padding:4,display:'flex',borderRadius:4}}>
              {sideOpen?<X size={16}/>:<Menu size={16}/>}
            </button>
          )}
          <div>
            <span style={{fontSize:13,fontWeight:600,color:INK}}>{TITLES[sec]||'SSLVault'}</span>
            {sec==='dashboard'&&<span style={{fontSize:12,color:MUTED,marginLeft:8}}>
              {email}
            </span>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Bell */}
          <div ref={bellRef} style={{position:'relative'}}>
            <button onClick={()=>{setBellOpen(o=>!o);if(!bellOpen)loadNotifs()}}
              style={{background:'none',border:'none',cursor:'pointer',color:BODY,width:32,height:32,
                display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,position:'relative',
                transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=CARD2;e.currentTarget.style.color=INK}}
              onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=BODY}}>
              <Bell size={15}/>
              {unread>0&&<span style={{position:'absolute',top:5,right:5,width:6,height:6,
                borderRadius:'50%',background:RED,border:`1.5px solid ${CARD}`}}/>}
            </button>
            {bellOpen&&(
              <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:CARD2,
                border:`1px solid ${LINE2}`,borderRadius:8,width:300,
                boxShadow:'0 8px 24px rgba(0,0,0,0.4)',zIndex:100,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${LINE}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,fontWeight:600,color:INK}}>Notifications</span>
                  <button onClick={()=>setBellOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:11,fontFamily:F}}>Close</button>
                </div>
                {notifs.length===0
                  ? <div style={{padding:'28px 16px',textAlign:'center',color:MUTED,fontSize:12}}>No notifications yet</div>
                  : notifs.map(n=>(
                    <div key={n.id} style={{padding:'10px 16px',borderBottom:`1px solid ${LINE}`,
                      background:n.read?'transparent':'rgba(56,139,253,0.04)',display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:n.read?MUTED:BLUE,marginTop:4,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:n.read?400:500,color:INK,marginBottom:1,lineHeight:1.3}}>{n.title}</div>
                        <div style={{fontSize:11,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          {/* Sign out */}
          <button onClick={()=>supabase.auth.signOut()}
            style={{display:'flex',alignItems:'center',gap:6,background:'none',border:`1px solid ${LINE}`,
              cursor:'pointer',color:BODY,fontSize:12,fontFamily:F,padding:'5px 10px',borderRadius:6,
              transition:'all .12s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=LINE2;e.currentTarget.style.color=INK}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=LINE;e.currentTarget.style.color=BODY}}>
            <LogOut size={12}/>{!isMobile&&' Sign out'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{display:'flex',flex:1,position:'relative'}}>
        {isMobile&&sideOpen&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:39}} onClick={()=>setSideOpen(false)}/>
        )}

        {/* Sidebar */}
        <nav ref={sideRef} style={{
          width:240, background:CARD, borderRight:`1px solid ${LINE}`,
          flexShrink:0, overflowY:'auto',
          ...(isMobile
            ? {position:'fixed',left:0,top:50,bottom:0,zIndex:40,
               transform:sideOpen?'translateX(0)':'translateX(-100%)',
               transition:'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
               boxShadow:'4px 0 20px rgba(0,0,0,0.4)'}
            : {position:'sticky',top:50,height:'calc(100vh - 50px)'}),
        }}>
          <Sidebar/>
        </nav>

        {/* Main */}
        <div style={{flex:1,minWidth:0,background:NAVY,overflowY:'auto'}}>
          <div key={key} style={{minHeight:'100%',animation:'fadein 0.18s ease'}}>
            {content()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        body{font-family:'Montserrat',system-ui,sans-serif;background:#0d1117}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#161b22}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}
      `}</style>
    </div>
  )
}
