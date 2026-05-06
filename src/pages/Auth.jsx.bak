import { useEffect } from 'react'
import { Auth as SupaAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { Shield } from 'lucide-react'

export default function Auth({ nav }) {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) nav('/dashboard')
    })
  }, [])

  return (
    <div style={{ minHeight:'calc(100vh - 64px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg,#38bdf8,#0ea5e9)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>Welcome to SSLVault</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Sign in to manage your certificates</p>
        </div>
        <div className="card">
          <SupaAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: { default: { colors: { brand:'#0ea5e9', brandAccent:'#38bdf8', inputBackground:'#0d1628', inputBorder:'rgba(99,179,237,0.12)', inputText:'#e8f4fd', inputPlaceholder:'#4a6a85' }, radii: { borderRadiusButton:'10px', inputBorderRadius:'10px' } } },
              style: { button:{ fontFamily:'Syne,sans-serif', fontWeight:600 }, anchor:{ color:'var(--accent)' } }
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  )
}
