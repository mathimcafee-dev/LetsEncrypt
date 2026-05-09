import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Lock, CheckCircle, Zap } from 'lucide-react'

export default function Auth({ nav }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/dashboard')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) nav('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setError(''); setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'calc(100vh - 56px)', background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      <div style={{ position:'relative', maxWidth:1100, margin:'0 auto', padding:'80px 24px', display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:64, alignItems:'center' }}>

        <div style={{ paddingRight:24 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:24, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>Welcome to SSLVault</span>
          </div>

          <h1 style={{ fontSize:48, fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-2px', marginBottom:8 }}>One account.</h1>
          <h1 style={{ fontSize:48, fontWeight:900, lineHeight:1.06, letterSpacing:'-2px', marginBottom:24, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Every certificate.</h1>

          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, marginBottom:32, maxWidth:440 }}>
            Sign in to save your certificates, set up expiry alerts, and manage your domains in one place.
          </p>

          <div style={{ display:'grid', gap:14, maxWidth:380 }}>
            {[
              { icon:Zap,    color:'#d97706', bg:'#fffbeb', border:'#fde68a', title:'Track unlimited domains', desc:'No limits on certificates or monitored hosts.' },
              { icon:Shield, color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', title:'Free forever',             desc:'No credit card. No upgrade prompts.' },
              { icon:Lock,   color:'#059669', bg:'#ecfdf5', border:'#a7f3d0', title:'Encrypted storage',         desc:'AES-256-GCM at rest, row-level security.' },
            ].map(({ icon:Icon, color, bg, border, title, desc }) => (
              <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:bg, border:'1.5px solid '+border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={16} color={color} strokeWidth={2}/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:12, color:'#64748b', lineHeight:1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:20, padding:36, boxShadow:'0 24px 60px rgba(15,23,42,0.08), 0 4px 14px rgba(15,23,42,0.04)' }}>
            <div style={{ width:54, height:54, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 0 0 6px rgba(37,99,235,0.08), 0 8px 20px rgba(37,99,235,0.3)' }}>
              <Shield size={26} color="white" strokeWidth={2}/>
            </div>
            <h2 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.6px', marginBottom:6, color:'#0f172a' }}>{isSignUp ? 'Create your account' : 'Sign in to your vault'}</h2>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:24 }}>{isSignUp ? 'Start issuing certificates in seconds.' : 'Welcome back.'}</p>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
                style={{ width:'100%', padding:'11px 14px', fontSize:14, fontFamily:'inherit', border:'1.5px solid #e2e8f0', borderRadius:10, outline:'none', color:'#0f172a', background:'#fafbfc' }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafbfc' }}
              />
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width:'100%', padding:'11px 14px', fontSize:14, fontFamily:'inherit', border:'1.5px solid #e2e8f0', borderRadius:10, outline:'none', color:'#0f172a', background:'#fafbfc' }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = 'white' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafbfc' }}
              />
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', padding:'10px 12px', borderRadius:10, fontSize:12, fontWeight:600, marginBottom:14 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', color:'#047857', padding:'10px 12px', borderRadius:10, fontSize:12, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <CheckCircle size={14}/> {message}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width:'100%', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
                background:'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%)', color:'white', border:'none',
                padding:'13px', borderRadius:11, fontSize:14, fontWeight:800, letterSpacing:'-0.2px',
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                boxShadow:'0 4px 16px rgba(37,99,235,0.35)', marginBottom:16
              }}
            >
              {loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>

            <p style={{ textAlign:'center', fontSize:12, color:'#64748b', marginBottom:0 }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
                style={{ color:'#2563eb', cursor:'pointer', fontWeight:700 }}
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </span>
            </p>
          </div>

          <p style={{ textAlign:'center', fontSize:11, color:'#94a3b8', marginTop:18, fontWeight:600, letterSpacing:'0.3px' }}>
            🔒 Your data is encrypted at rest. We never see your private keys in plaintext.
          </p>
        </div>
      </div>
    </div>
  )
}
