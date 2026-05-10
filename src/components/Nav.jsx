import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, LayoutDashboard, PlusCircle, LogOut, LogIn, Activity, Settings, BookOpen, ChevronDown, Info, Mail, User, Lock, Zap, Star } from 'lucide-react'
import { usePlan } from '../hooks/usePlan'
import { useState } from 'react'

export default function Nav({ nav, page }) {
  const { user } = useAuth()
  const { isPro } = usePlan(user)
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = [
    { path:'/generate', label:'Issue Certificate', icon:PlusCircle },
    { path:'/buy', label:'Buy RapidSSL', icon:Star },
    { path:'/dashboard', label:'Inventory & Monitor', icon:LayoutDashboard },
  ]
  const more = [
    { path:'/dns-providers', label:'DNS Providers', icon:Settings },
    { path:'/install', label:'Install Guide', icon:BookOpen },
    { path:'/knowledge-base', label:'Knowledge Base', icon:BookOpen },
    { path:'/keylocker', label:'KeyLocker', icon:Lock, pro:true },
    { path:'/pricing', label:'Pricing', icon:Zap },
    { path:'/about', label:'About', icon:Info },
    { path:'/developer', label:'Developer', icon:User },
    { path:'/contact', label:'Contact', icon:Mail },
  ]
  const isDash = page==='/dashboard'||page==='/monitor'
  return (
    <nav style={{position:'sticky',top:0,zIndex:200,background:'#ffffff',borderBottom:'0.5px solid rgba(15,23,42,0.08)',boxShadow:'0 1px 3px rgba(15,23,42,0.04)'}}>
      <div className='container' style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
        <div onClick={()=>nav('/')} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
          {/* Option-2 monogram mark */}
          <div style={{position:'relative',width:36,height:36,flexShrink:0}}>
            <div style={{width:36,height:36,background:'#0a0a0a',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif",fontSize:22,fontWeight:800,color:'#10b981',lineHeight:1,letterSpacing:'-1px',marginTop:1}}>S</span>
            </div>
            {/* green lock badge */}
            <div style={{position:'absolute',bottom:-3,right:-3,width:16,height:16,background:'#10b981',borderRadius:4,border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="8" height="9" viewBox="0 0 8 9" fill="none">
                <rect x="1" y="4" width="6" height="5" rx="1" fill="white"/>
                <path d="M2 4V3a2 2 0 0 1 4 0v1" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#0a0a0a',letterSpacing:'-0.4px',lineHeight:1.15}}>SSL<span style={{color:'#10b981'}}>Vault</span></div>
            <div style={{fontSize:9,color:'#a3a3a3',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.8px',lineHeight:1}}>CLM Platform</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:1}}>
          {primary.map(({path,label,icon:Icon})=>{
            const active = path==='/dashboard'?isDash:page===path
            return (
              <div key={path} onClick={()=>nav(path)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:600,color:active?'#047857':'#525252',background:active?'#f0fdf4':'transparent',borderBottom:active?'2px solid #10b981':'2px solid transparent',marginBottom:'-1px'}}
                onMouseEnter={e=>{if(!active)e.currentTarget.style.background='#f8fafc'}}
                onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>
                <Icon size={13} color={path==='/buy' && !active ? '#f59e0b' : undefined}/>{label}
                {path==='/buy' && <span style={{fontSize:8,fontWeight:700,color:'#185FA5',background:'#E6F1FB',borderRadius:3,padding:'1px 4px',marginLeft:2}}>TSS</span>}
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
                {more.map(({path,label,icon:Icon,pro})=>(
                  <div key={path} onClick={()=>{nav(path);setMoreOpen(false)}} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <Icon size={13} color='#94a3b8'/>{label}
                    {pro && !isPro && (
                      <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:'#7c3aed',
                        background:'rgba(124,58,237,0.08)',border:'0.5px solid rgba(124,58,237,0.2)',
                        borderRadius:3,padding:'1px 5px',letterSpacing:'0.2px'}}>PRO</span>
                    )}
                    {pro && isPro && (
                      <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,color:'#059669',
                        background:'var(--v2-green-bg)',border:'0.5px solid var(--v2-green-border)',
                        borderRadius:3,padding:'1px 5px'}}>✓</span>
                    )}
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
                <div style={{width:22,height:22,borderRadius:'50%',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#10b981'}}>{user.email?.[0]?.toUpperCase()||'U'}</div>
                <span style={{fontSize:11,fontWeight:600,color:'#475569',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</span>
              </div>
              <button onClick={()=>supabase.auth.signOut()} style={{display:'inline-flex',alignItems:'center',gap:5,background:'white',color:'#475569',border:'1px solid #e2e8f0',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}><LogOut size={11}/> Out</button>
            </div>
          ):(
            <button onClick={()=>nav('/auth')} style={{display:'inline-flex',alignItems:'center',gap:6,background:'#0a0a0a',color:'white',border:'none',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer'}}><LogIn size={12}/> Sign In</button>
          )}
        </div>
      </div>
    </nav>
  )
}