import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, LayoutDashboard, PlusCircle, LogOut, LogIn } from 'lucide-react'

export default function Nav({ nav, page }) {
  const { user } = useAuth()

  return (
    <nav>
      <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div onClick={() => nav('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#38bdf8,#0ea5e9)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:18, color:'var(--text)', letterSpacing:'-0.5px' }}>
            SSL<span style={{ color:'var(--accent)' }}>Vault</span>
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {[
            { path:'/generate', label:'Generate SSL', icon:PlusCircle },
            { path:'/dashboard', label:'My Certificates', icon:LayoutDashboard },
          ].map(({ path, label, icon:Icon }) => (
            <div key={path} onClick={() => nav(path)} style={{
              display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
              borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:13, fontWeight:600,
              color: page === path ? 'var(--accent)' : 'var(--text3)',
              background: page === path ? 'rgba(56,189,248,0.08)' : 'transparent',
              border: `1px solid ${page === path ? 'rgba(56,189,248,0.2)' : 'transparent'}`,
              transition:'all 0.2s',
            }}>
              <Icon size={14} /> {label}
            </div>
          ))}

          {user ? (
            <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary btn-sm" style={{ marginLeft:8 }}>
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <button onClick={() => nav('/auth')} className="btn btn-primary btn-sm" style={{ marginLeft:8 }}>
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
