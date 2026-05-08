import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, LayoutDashboard, PlusCircle, LogOut, LogIn, Bell, Settings, BookOpen, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Nav({ nav, page }) {
  const { user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  const primary = [
    { path:'/generate', label:'Issue Certificate', icon:PlusCircle },
    { path:'/dashboard', label:'Inventory', icon:LayoutDashboard },
    { path:'/monitor', label:'Monitor', icon:Bell },
  ]
  const more = [
    { path:'/dns-providers', label:'DNS Providers', icon:Settings },
    { path:'/install', label:'Install Guide', icon:BookOpen },
  ]

  return (
    <nav style={{ position:'sticky', top:0, zIndex:200, background:'white', borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className='container' style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:58 }}>

        {/* Brand */}
        <div onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
          <div style={{ width:34, height:34, background:'linear-gradient(135deg,#1e3a8a,#2563eb)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
            <Shield size={18} color='white' strokeWidth={2.5}/>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'#0f172a', letterSpacing:'-0.4px', lineHeight:1.1 }}>SSL<span style={{ color:'#2563eb' }}>Vault</span></div>
            <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', lineHeight:1 }}>CLM Platform</div>
          </div>
        </div>

        {/* Primary nav */}
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          {primary.map(({ path, label, icon:Icon }) => (
            <div key={path} onClick={() => nav(path)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer',
              fontSize:13, fontWeight:600,
              color: page===path?'#2563eb':'#475569',
              background: page===path?'#eff6ff':'transparent',
              borderBottom: page===path?'2px solid #2563eb':'2px solid transparent',
              marginBottom:'-2px',
            }}
            onMouseEnter={e => { if(page!==path) e.currentTarget.style.background='#f8fafc' }}
            onMouseLeave={e => { if(page!==path) e.currentTarget.style.background='transparent' }}>
              <Icon size={14}/> {label}
            </div>
          ))}
          {/* More dropdown */}
          <div style={{ position:'relative' }}>
            <div onClick={() => setMoreOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569', borderBottom:'2px solid transparent', marginBottom:'-2px' }}
              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              More <ChevronDown size={13}/>
            </div>
            {moreOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'white', border:'1px solid #e2e8f0', borderRadius:10, padding:6, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:300, minWidth:180 }}
                onMouseLeave={() => setMoreOpen(false)}>
                {more.map(({ path, label, icon:Icon }) => (
                  <div key={path} onClick={() => { nav(path); setMoreOpen(false) }} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <Icon size={14} color='#94a3b8'/> {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auth */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px', background:'#f8fafc', borderRadius:7, border:'1px solid #e2e8f0' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white' }}>{user.email?.[0]?.toUpperCase()||'U'}</div>
                <span style={{ fontSize:12, fontWeight:600, color:'#475569', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</span>
              </div>
              <button onClick={() => supabase.auth.signOut()} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', color:'#475569', border:'1px solid #e2e8f0', padding:'6px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <LogOut size={12}/> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => nav('/auth')} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', border:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(37,99,235,0.25)' }}>
              <LogIn size={13}/> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}