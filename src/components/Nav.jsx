import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, LayoutDashboard, PlusCircle, LogOut, LogIn, Bell, Settings, BookOpen } from 'lucide-react'

export default function Nav({ nav, page }) {
  const { user } = useAuth()
  const links = [
    { path:'/generate', label:'Generate SSL', icon:PlusCircle },
    { path:'/dashboard', label:'My Certificates', icon:LayoutDashboard },
    { path:'/monitor', label:'Monitor', icon:Bell },
    { path:'/dns-providers', label:'DNS Providers', icon:Settings },
    { path:'/install', label:'Install Guide', icon:BookOpen },
  ]
  return (
    <nav>
      <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <div onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
            <Shield size={17} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight:800, fontSize:17, color:'var(--text)', letterSpacing:'-0.3px' }}>SSL<span style={{ color:'var(--accent)' }}>Vault</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          {links.map(({ path, label, icon:Icon }) => (
            <div key={path} onClick={() => nav(path)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, cursor:'pointer',
              fontSize:13, fontWeight:600,
              color: page===path ? 'var(--accent)' : 'var(--text2)',
              background: page===path ? 'var(--accent-light)' : 'transparent',
            }}
            onMouseEnter={e => { if(page!==path) e.currentTarget.style.background='var(--bg2)' }}
            onMouseLeave={e => { if(page!==path) e.currentTarget.style.background='transparent' }}>
              <Icon size={14} /> {label}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-light)', border:'2px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent)' }}>
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary btn-sm">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => nav('/auth')} className="btn btn-primary btn-sm">
              <LogIn size={13} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
