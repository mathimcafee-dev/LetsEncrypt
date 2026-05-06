import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield } from 'lucide-react'

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
          <div style={{ marginBottom:16 }}>
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
          </div>
          <div style={{ marginBottom:20 }}>
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          {message && <div className="alert alert-success" style={{ marginBottom:16 }}>{message}</div>}

          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ width:'100%', justifyContent:'center', marginBottom:16 }}>
            {loading ? <><span className="spinner" /> {isSignUp ? 'Creating account...' : 'Signing in...'}</> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          <p style={{ textAlign:'center', fontSize:13, color:'var(--text3)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }} style={{ color:'var(--accent)', cursor:'pointer', fontWeight:600 }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
