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

// Light-mode tokens — never change these
const F   = "'Inter',system-ui,sans-serif"
const W   = '#ffffff'
const BK  = '#0a0a0a'
const S   = '#f5f5f5'   // sidebar bg
const S2  = '#eeeeee'   // sidebar active
const T1  = '#0a0a0a'
const T2  = 'rgba(0,0,0,0.5)'
const T3  = 'rgba(0,0,0,0.32)'
const LN  = 'rgba(0,0,0,0.08)'
const LN2 = 'rgba(0,0,0,0.14)'
const GRN = '#16a34a'
const RED = '#dc2626'

function useW(bp=768){const[m,setM]=useState(window.innerWidth<=bp);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

const DEFAULT_OPEN = {Certificates:true,Deployment:true,Shield:true,Intelligence:true}

export default function CLMHome({ user, nav }) {
  const [sec, setSec] = useState('dashboard')
  const [key, setKey] = useState(0)
  const [open, setOpen] = useState(DEFAULT_OPEN)
  const [sideOpen, setSideOpen] = useState(false)
  const sm = useW()
  const sideRef = useRef(null)
  const bellRef = useRef(null)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const [bellLoad, setBellLoad] = useState(false)
  const email = user?.email || ''

  const loadNotifs = async () => {
    if (!user) return; setBellLoad(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-alert',{body:{action:'get_notifications',user_id:user.id,limit:10}})
      if (!error && data?.ok) { setNotifs(data.notifications||[]); setUnread(data.unread_count||0) }
    } catch(_) {} finally { setBellLoad(false) }
  }
  useEffect(()=>{loadNotifs();const iv=setInterval(loadNotifs,60000);return()=>clearInterval(iv)},[user])
  useEffect(()=>{const h=e=>{if(bellRef.current&&!bellRef.current.contains(e.target))setBellOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  useEffect(()=>{
    if(!sm||!sideOpen)return
    const h=e=>{if(sideRef.current&&!sideRef.current.contains(e.target))setSideOpen(false)}
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)
  },[sm,sideOpen])

  const go=id=>{if(id===sec)return;setSec(id);setKey(k=>k+1);if(sm)setSideOpen(false)}

  const CERTS=[{id:'dashboard',label:'Fleet',icon:Layout},{id:'issue',label:'New SSL',icon:Plus},{id:'readiness',label:'47-day radar',icon:ShieldCheck,alert:true},{id:'renewal-calendar',label:'Lifecycle',icon:CalendarDays}]
  const AUTO=[{id:'my-servers',label:'My Servers',icon:Server},{id:'certvault',label:'Key Vault',icon:Lock},{id:'certbind',label:'Live Verify',icon:Shield}]
  const SHLD=[{id:'shield',label:'Shield',icon:ShieldCheck},{id:'cert-changelog',label:'Audit trail',icon:History}]
  const INTEL=[{id:'ca-intelligence',label:'CA Insights',icon:TrendingUp}]
  const BOT=[{id:'kb',label:'Docs & help',icon:BookOpen},{id:'settings',label:'Settings',icon:Settings}]

  const TITLES={dashboard:'Certificate inventory',issue:'New SSL',readiness:'47-day readiness','renewal-calendar':'Renewal calendar',servers:'Servers & agents',integrations:'DNS providers',certvault:'CertVault',certbind:'CertBind','cert-changelog':'Audit log','agent-health':'Servers & agents',infrastructure:'Servers & agents','ca-intelligence':'CA intelligence',kb:'Docs & help',settings:'Settings',pricing:'Pricing','ca-connectors':'CA connectors'}

  const Item=({id,label,icon:Icon,alert})=>{
    const on=sec===id
    return <button onClick={()=>go(id)} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 12px 7px 14px',cursor:'pointer',fontSize:12,fontWeight:on?500:400,color:on?T1:T2,background:on?S2:'transparent',borderLeft:`2px solid ${on?BK:'transparent'}`,border:'none',width:'100%',textAlign:'left',fontFamily:F,transition:'all 0.12s',borderRadius:'0 3px 3px 0',marginBottom:1}}
      onMouseEnter={e=>{if(!on){e.currentTarget.style.background=S;e.currentTarget.style.color=T1}}}
      onMouseLeave={e=>{if(!on){e.currentTarget.style.background='transparent';e.currentTarget.style.color=T2}}}>
      <Icon size={13} strokeWidth={on?2.2:1.7} style={{flexShrink:0}}/>
      <span style={{flex:1}}>{label}</span>
      {alert&&!on&&<span style={{fontSize:8,fontWeight:600,padding:'1px 5px',borderRadius:2,background:'rgba(0,0,0,0.06)',color:T3}}>NEW</span>}
    </button>
  }

  const sideNav=path=>{const map={'/buy':'issue','/dashboard':'dashboard','/integrations':'integrations','/certvault':'certvault','/certbind':'certbind','/install':'kb','/':'dashboard'};const m=map[path];if(m)go(m);else nav(path)}

  const content=()=>{
    if(sec==='dashboard')       return <Dashboard nav={sideNav} onIssue={()=>go('issue')}/>
    if(sec==='readiness')       return <ReadinessDashboard user={user}/>
    if(sec==='issue')           return <BuyCertificate nav={sideNav} embedded={true} onDashboard={()=>go('dashboard')} onIssueAnother={()=>go('issue')}/>
    if(sec==='integrations')    return <Integrations nav={sideNav}/>
    if(sec==='install')         return <Install nav={sideNav}/>
    if(sec==='kb')              return <KnowledgeBase nav={sideNav}/>
    if(sec==='pricing')         return <Pricing nav={sideNav}/>
    if(sec==='my-servers')      return <MyServers user={user}/>
    if(sec==='infrastructure')  return <MyServers user={user}/>
    if(sec==='servers')         return <Infrastructure user={user}/>
    if(sec==='agent-health')    return <Infrastructure user={user}/>
    if(sec==='certvault')       return <CertVault nav={sideNav}/>
    if(sec==='certbind')        return <CertBind nav={sideNav}/>
    if(sec==='settings')        return <SettingsPage user={user}/>
    if(sec==='ca-intelligence') return <CAIntelligenceHub nav={sideNav}/>
    if(sec==='shield')          return <ShieldIntelligence user={user}/>
    if(sec==='renewal-calendar')return <RenewalCalendar user={user}/>
    if(sec==='cert-changelog')  return <CertChangelog user={user}/>
    return null
  }

  const Sidebar=()=>(
    <>
      {/* Logo */}
      <div style={{padding:'14px 14px 10px',borderBottom:`1px solid ${LN}`,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:20,height:20,background:BK,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:T1,fontFamily:F}}>SSLVault</span>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{flex:1,overflowY:'auto',padding:'8px 4px'}}>
        {[{label:'Certificates',items:CERTS},{label:'Deployment',items:AUTO},{label:'Shield',items:SHLD},{label:'Intelligence',items:INTEL}].map(({label,items})=>{
          const isOpen=open[label]!==false
          return (
            <div key={label} style={{marginBottom:4}}>
              <button onClick={()=>setOpen(p=>({...p,[label]:!p[label]}))} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 12px 4px',background:'none',border:'none',cursor:'pointer',fontFamily:F}}>
                <span style={{fontSize:9.5,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:T3}}>{label}</span>
                <span style={{color:T3,fontSize:9.5,transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.18s',display:'inline-block',lineHeight:1}}>▾</span>
              </button>
              <div style={{maxHeight:isOpen?`${items.length*34}px`:'0px',overflow:'hidden',transition:'max-height 0.22s ease'}}>
                {items.map(it=><Item key={it.id} {...it}/>)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div style={{borderTop:`1px solid ${LN}`,padding:'6px 4px 4px'}}>
        {BOT.map(it=><Item key={it.id} {...it}/>)}
      </div>

      {/* User */}
      <div style={{borderTop:`1px solid ${LN}`,padding:'10px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(0,0,0,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,color:T2,flexShrink:0}}>
            {(email[0]||'U').toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:500,color:T1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{email.split('@')[0]}</div>
            <div style={{fontSize:9.5,color:T3,marginTop:1}}>{email.split('@')[1]||'easysecurity.in'}</div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} title="Sign out"
            style={{background:'none',border:'none',cursor:'pointer',color:T3,padding:3,display:'flex',borderRadius:3,transition:'color .12s'}}
            onMouseEnter={e=>e.currentTarget.style.color=RED} onMouseLeave={e=>e.currentTarget.style.color=T3}>
            <LogOut size={12}/>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',fontFamily:F,background:W}}>

      {/* Top bar */}
      <div style={{background:W,borderBottom:`1px solid ${LN}`,height:46,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',flexShrink:0,position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {sm && <button onClick={()=>setSideOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:T2,padding:4,display:'flex',alignItems:'center',borderRadius:3}}>
            {sideOpen?<X size={16}/>:<Menu size={16}/>}
          </button>}
          <span style={{fontSize:12,fontWeight:500,color:T1}}>{TITLES[sec]||'SSLVault'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {!sm && <span style={{fontSize:11,color:T3,fontFamily:'monospace'}}>{email}</span>}
          {/* Bell */}
          <div ref={bellRef} style={{position:'relative'}}>
            <button onClick={()=>{setBellOpen(o=>!o);if(!bellOpen)loadNotifs()}}
              style={{background:'none',border:'none',cursor:'pointer',color:T2,padding:5,display:'flex',alignItems:'center',borderRadius:3,position:'relative',transition:'color .12s'}}
              onMouseEnter={e=>e.currentTarget.style.color=T1} onMouseLeave={e=>e.currentTarget.style.color=T2}>
              <Bell size={14}/>
              {unread>0 && <span style={{position:'absolute',top:2,right:2,width:6,height:6,borderRadius:'50%',background:RED,border:`1.5px solid ${W}`}}/>}
            </button>
            {bellOpen && (
              <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:W,border:`1px solid ${LN2}`,borderRadius:4,width:280,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:100}}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${LN}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,fontWeight:500,color:T1}}>Notifications</span>
                  <button onClick={()=>setBellOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:T3,fontSize:11,fontFamily:F}}>Close</button>
                </div>
                {bellLoad ? <div style={{padding:'20px',textAlign:'center',color:T3,fontSize:11}}>Loading…</div>
                : notifs.length===0 ? <div style={{padding:'28px 14px',textAlign:'center',color:T3,fontSize:11}}>No notifications yet</div>
                : notifs.map(n=>(
                  <div key={n.id} style={{padding:'9px 14px',borderBottom:`1px solid ${LN}`,display:'flex',gap:9,alignItems:'flex-start',background:n.read?W:'rgba(0,0,0,0.02)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.03)'} onMouseLeave={e=>e.currentTarget.style.background=n.read?W:'rgba(0,0,0,0.02)'}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:n.color||BK,marginTop:4,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11.5,fontWeight:n.read?400:500,color:T1,marginBottom:1,lineHeight:1.3}}>{n.title}</div>
                      <div style={{fontSize:10.5,color:T3,lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Sign out */}
          <button onClick={()=>supabase.auth.signOut()}
            style={{display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',color:T3,fontSize:11,fontFamily:F,padding:'3px 6px',borderRadius:3,transition:'color .12s'}}
            onMouseEnter={e=>e.currentTarget.style.color=RED} onMouseLeave={e=>e.currentTarget.style.color=T3}>
            <LogOut size={12}/>{!sm&&' Sign out'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{display:'flex',flex:1,position:'relative'}}>
        {sm&&sideOpen && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:39}} onClick={()=>setSideOpen(false)}/>}

        {/* Sidebar */}
        <nav ref={sideRef} style={{width:200,background:S,borderRight:`1px solid ${LN}`,display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto',
          ...(sm?{position:'fixed',left:0,top:46,bottom:0,zIndex:40,transform:sideOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.22s ease',boxShadow:'4px 0 16px rgba(0,0,0,0.1)'}:{position:'sticky',top:46,height:'calc(100vh - 46px)'})}}>
          <Sidebar/>
        </nav>

        {/* Main */}
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',background:W}}>
          <div key={key} style={{flex:1,overflowY:'auto',overflowX:'hidden',animation:'fadein 0.18s ease'}}>
            {content()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#f5f5f5}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15);border-radius:99px}
      `}</style>
    </div>
  )
}
