import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, LayoutDashboard, PlusCircle, LogOut, LogIn, Activity, Settings, BookOpen, ChevronDown, Info, Mail, User } from 'lucide-react'
import { useState } from 'react'

export default function Nav({ nav, page }) {
  const { user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = [
    { path:'/generate', label:'Issue Certificate', icon:PlusCircle },
    { path:'/dashboard', label:'Inventory & Monitor', icon:LayoutDashboard },
  ]
  const more = [
    { path:'/dns-providers', label:'DNS Providers', icon:Settings },
    { path:'/install', label:'Install Guide', icon:BookOpen },
    { path:'/knowledge-base', label:'Knowledge Base', icon:BookOpen },
    { path:'/about', label:'About', icon:Info },
    { path:'/developer', label:'Developer', icon:User },
    { path:'/contact', label:'Contact', icon:Mail },
  ]
  const isDash = page==='/dashboard'||page==='/monitor'
  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:'white',borderBottom:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
      <div className='container' style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',userSelect:'none'}}>
          <div style={{width:32,height:32,background:'linear-gradient(135deg,#1e3a8a,#2563eb)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(37,99,235,0.3)'}}><Shield size={16} color='white' strokeWidth={2.5}/></div>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:'#0f172a',letterSpacing:'-0.4px',lineHeight:1.1}}>SSL<span style={{color:'#2563eb'}}>Vault</span></div>
            <div style={{fontSize:9,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.8px',lineHeight:1}}>CLM Platform</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:1}}>
          {primary.map(({path,label,icon:Icon})=>{
            const active = path==='/dashboard'?isDash:page===path
            return (
              <div key={path} onClick={()=>nav(path)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600,color:active?'#2563eb':'#475569',background:active?'#eff6ff':'transparent',borderBottom:active?'2px solid #2563eb':'2px solid transparent',marginBottom:'-1px'}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
                <Icon size={13}/>{label}
              </div>
            )
          })}
          <div style={{position:'relative'}}>
            <div onClick={()=>setMoreOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569',borderBottom:'2px solid transparent',marginBottom:'-1px'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              More <ChevronDown size={12}/>
            </div>
            {moreOpen&&(
              <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'white',border:'1px solid #e2e8f0',borderRadius:9,padding:5,boxShadow:'0 8px 24px rgba(0,0,0,0.1)',zIndex:300,minWidth:170}}
                onMouseLeave={()=>setMoreOpen(false)}>
                {more.map(({path,label,icon:Icon})=>(
                  <div key={path} onClick={()=>{nav(path);setMoreOpen(false)}} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <Icon size={13} color='#94a3b8'/>{label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {user?(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#f8fafc',borderRadius:6,border:'1px solid #e2e8f0'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'white'}}>{user.email?.[0]?.toUpperCase()||'U'}</div>
                <span style={{fontSize:11,fontWeight:600,color:'#475569',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</span>
              </div>
              <button onClick={()=>supabase.auth.signOut()} style={{display:'inline-flex',alignItems:'center',gap:5,background:'white',color:'#475569',border:'1px solid #e2e8f0',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}><LogOut size={11}/> Out</button>
            </div>
          ):(
            <button onClick={()=>nav('/auth')} style={{display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'white',border:'none',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer'}}><LogIn size={12}/> Sign In</button>
          )}
        </div>
      </div>
    </nav>
  )
}