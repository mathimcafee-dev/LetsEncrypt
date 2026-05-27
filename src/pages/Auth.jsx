import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Lock, CheckCircle, Zap, Eye, EyeOff, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import '../styles/design-v2.css'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function Auth({ nav }) {
  const isMobile = useIsMobile()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [mode, setMode]         = useState('login')

  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
  const isInviteHash = hashParams.get('type') === 'invite' || hashParams.get('type') === 'signup'

  useEffect(() => {
    if (isInviteHash) { setMode('set_password'); return }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && isInviteHash) { setMode('set_password'); return }
      if (event === 'PASSWORD_RECOVERY') { setMode('set_password'); return }
      if (event === 'SIGNED_IN' && mode !== 'set_password') nav('/')
      if (event === 'USER_UPDATED') nav('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (mode === 'set_password') {
      if (!password) { setError('Please enter a password'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
      setError(''); setLoading(true)
      try {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      } catch (err) { setError(err.message) }
      setLoading(false)
      return
    }

    if (!email || !password) { setError('Please enter your email and password'); return }
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const perks = [
    { icon:<Zap size={15} />,    color:'var(--v2-amber)',       title:'Unlimited certificates',   desc:'No cap on domains or issuances — ever.' },
    { icon:<Shield size={15} />, color:'#ffffff',               title:'Free forever',              desc:'No credit card. No upgrade prompts. No catch.' },
    { icon:<Lock size={15} />,   color:'var(--v2-green)',       title:'Private keys stay private', desc:'AES-256 at rest. Keys never leave your server.' },
    { icon:<CheckCircle size={15} />, color:'#ffffff',          title:'Auto-renewal included',     desc:'Agent-based or cron — certificates never expire.' },
  ]

  return (
    <div className="v2-page" style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center' }}>
      <div style={{ position:'fixed', top:60, left:0, right:0, height:2, background:'var(--v2-green)', zIndex:10 }} />

      <div style={{ maxWidth:1060, margin:'0 auto', padding:'clamp(24px,6vw,60px) clamp(14px,3vw,24px)',
                    display:'grid', gridTemplateColumns:'minmax(0,1fr) clamp(320px,35vw,420px)', gap:60,
                    alignItems:'center', width:'100%' }}>

        {/* Left: value prop */}
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                        borderRadius:100, padding:'4px 14px', marginBottom:24 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-green-text)' }}>Free · Open · Trusted</span>
          </div>
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700, color:'var(--v2-text)',
                        lineHeight:1.08, letterSpacing:'-1.4px', marginBottom:6 }}>One account.</h1>
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700, lineHeight:1.08,
                        letterSpacing:'-1.4px', marginBottom:20, color:'var(--v2-green)' }}>Every certificate.</h1>
          <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.75, marginBottom:36, maxWidth:420 }}>
            Sign in to manage your certificates, set expiry alerts, and deploy with one click.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {perks.map(({ icon, color, title, desc }) => (
              <div key={title} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                               background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
                               display:'flex', alignItems:'center', justifyContent:'center',
                               flexShrink:0, color }}>{icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:12, color:'var(--v2-text-3)', lineHeight:1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:36, paddingTop:24, borderTop:'0.5px solid var(--v2-border)',
                        fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6 }}>
            Powered by RapidSSL · DigiCert trust chain · RFC 8555 ACME
          </div>
        </div>

        {/* Right: form card */}
        <div>
          <div className="v2-card" style={{ padding:'min(32px,5vw) min(30px,4vw)', borderTop:'2px solid var(--v2-green)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:40, height:40, background:'#c0392b', borderRadius:'var(--v2-r-lg)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             boxShadow:'0 0 0 4px rgba(192,57,43,0.15)' }}>
                <Shield size={18} color='#000000' />
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--v2-text)', letterSpacing:'-0.3px' }}>
                  {mode === 'set_password' ? 'Set your password' : 'Sign in to SSLVault'}
                </div>
                <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>
                  {mode === 'set_password' ? 'Choose a password to activate your account' : 'Welcome back'}
                </div>
              </div>
            </div>

            {mode !== 'set_password' && <div style={{ marginBottom:14 }}>
              <label className="v2-label">Email address</label>
              <input className="v2-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
            </div>}

            <div style={{ marginBottom:20 }}>
              <label className="v2-label">Password</label>
              <div style={{ position:'relative' }}>
                <input className="v2-input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ paddingRight:40 }} />
                <button onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer',
                            color:'var(--v2-text-3)', padding:2, display:'flex' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {mode === 'set_password' && <div className="v2-label-help">Minimum 8 characters.</div>}
            </div>

            {mode === 'set_password' && (
              <div style={{ marginBottom:20 }}>
                <label className="v2-label">Confirm password</label>
                <input className="v2-input" type={showPw ? 'text' : 'password'} placeholder="Repeat password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
            )}

            {error && <div className="v2-alert v2-alert-error" style={{ marginBottom:14 }}><AlertTriangle size={13} /> {error}</div>}
            {message && <div className="v2-alert v2-alert-success" style={{ marginBottom:14 }}><CheckCircle size={13} /> {message}</div>}

            <button className="v2-btn v2-btn-primary" onClick={handleSubmit} disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, marginBottom:16 }}>
              {loading
                ? <><RefreshCw size={13} className="spin" /> {mode === 'set_password' ? 'Setting password…' : 'Signing in…'}</>
                : <>{mode === 'set_password' ? 'Set password & continue' : 'Sign in'} <ArrowRight size={13} /></>}
            </button>

            <div style={{ textAlign:'center', fontSize:13, color:'var(--v2-text-3)' }}>
              New to SSLVault?{' '}
              <button onClick={() => nav('/auth')}
                style={{ background:'none', border:'none', cursor:'pointer',
                          color:'var(--v2-text)', fontWeight:600, fontSize:13,
                          padding:0, textDecoration:'underline', textUnderlineOffset:2 }}>
                Contact us to get access
              </button>
            </div>
          </div>

          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:7,
                        justifyContent:'center', fontSize:11, color:'var(--v2-text-3)' }}>
            <Lock size={10} />
            Encrypted at rest · Private keys never uploaded · Row-level security
          </div>
        </div>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
