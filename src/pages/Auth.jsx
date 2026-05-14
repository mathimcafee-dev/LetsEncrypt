import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Lock, CheckCircle, Zap, Eye, EyeOff, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import '../styles/design-v2.css'

export default function Auth({ nav }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')

  // Detect if this is a Supabase invite link (?type=invite in hash or query)
  const isInviteLink = window.location.hash.includes('type=invite') ||
                       new URLSearchParams(window.location.search).get('type') === 'invite'

  useEffect(() => {
    if (isInviteLink) setIsSignUp(true)
  }, [isInviteLink])

  async function routeAfterLogin() {
    try {
      const { data } = await supabase.functions.invoke('account-manage', {
        body: { action: 'get_my_account' }
      })
      const role = data?.account?.role
      if (role === 'master_admin') nav('/')
      else if (role === 'sub_admin') nav('/reseller')
      else nav('/portal')
    } catch {
      nav('/')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterLogin()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) routeAfterLogin()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setError(''); setLoading(true)
    try {
      if (isSignUp) {
        // For invite links: updateUser sets the password on the already-created auth user
        if (isInviteLink) {
          const { error } = await supabase.auth.updateUser({ password })
          if (error) throw error
          // get_my_account will auto-create the accounts row with correct role
        } else {
          const { error } = await supabase.auth.signUp({ email, password })
          if (error) throw error
          setMessage('Check your email to confirm your account.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const toggle = () => { setIsSignUp(v => !v); setError(''); setMessage('') }

  const perks = [
    { icon:<Zap size={15} />,    color:'var(--v2-amber)',       title:'Unlimited certificates',   desc:'No cap on domains or issuances — ever.' },
    { icon:<Shield size={15} />, color:'#2563eb',               title:'Free forever',              desc:'No credit card. No upgrade prompts. No catch.' },
    { icon:<Lock size={15} />,   color:'var(--v2-green)',       title:'Private keys stay private', desc:'AES-256 at rest. Keys never leave your server.' },
    { icon:<CheckCircle size={15} />, color:'#7c3aed',          title:'Auto-renewal included',     desc:'Agent-based or cron — certificates never expire.' },
  ]

  return (
    <div className="v2-page" style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center' }}>

      {/* thin green top bar */}
      <div style={{ position:'fixed', top:60, left:0, right:0, height:2,
                    background:'var(--v2-green)', zIndex:10 }} />

      <div style={{ maxWidth:1060, margin:'0 auto', padding:'60px 24px',
                    display:'grid', gridTemplateColumns:'1fr 420px', gap:60,
                    alignItems:'center', width:'100%' }}>

        {/* ── Left: value prop ──────────────────────────────────── */}
        <div>
          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                        borderRadius:100, padding:'4px 14px', marginBottom:24 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-green-text)' }}>
              Free · Open · Trusted
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700,
                        color:'var(--v2-text)', lineHeight:1.08,
                        letterSpacing:'-1.4px', marginBottom:6 }}>
            One account.
          </h1>
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700,
                        lineHeight:1.08, letterSpacing:'-1.4px', marginBottom:20,
                        color:'var(--v2-green)' }}>
            Every certificate.
          </h1>
          <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.75,
                      marginBottom:36, maxWidth:420 }}>
            {isSignUp
              ? 'Create a free account and issue your first certificate in under 2 minutes.'
              : 'Sign in to manage your certificates, set expiry alerts, and deploy with one click.'}
          </p>

          {/* Perks */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {perks.map(({ icon, color, title, desc }) => (
              <div key={title} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                               background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
                               display:'flex', alignItems:'center', justifyContent:'center',
                               flexShrink:0, color }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:12, color:'var(--v2-text-3)', lineHeight:1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div style={{ marginTop:36, paddingTop:24, borderTop:'0.5px solid var(--v2-border)',
                        fontSize:11, color:'var(--v2-text-3)', lineHeight:1.6 }}>
            Powered by Let's Encrypt · ACME RFC 8555 · 90-day certificates · No credit card
          </div>
        </div>

        {/* ── Right: form card ─────────────────────────────────── */}
        <div>
          <div className="v2-card" style={{ padding:'32px 30px',
                                             borderTop:'2px solid var(--v2-green)' }}>

            {/* Form header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:40, height:40, background:'#0a0a0a',
                             borderRadius:'var(--v2-r-lg)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             boxShadow:'0 0 0 5px rgba(16,185,129,0.1)' }}>
                <Shield size={18} color='white' />
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--v2-text)',
                               letterSpacing:'-0.3px' }}>
                  {isSignUp ? (isInviteLink ? 'Accept your invitation' : 'Create your account') : 'Sign in to SSLVault'}
                </div>
                <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>
                  {isSignUp ? (isInviteLink ? 'You have been invited to SSLVault' : 'Start issuing certificates for free') : 'Welcome back'}
                </div>
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <label className="v2-label">Email address</label>
              <input
                className="v2-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:20 }}>
              <label className="v2-label">Password</label>
              <div style={{ position:'relative' }}>
                <input
                  className="v2-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ paddingRight:40 }}
                />
                <button onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                            background:'none', border:'none', cursor:'pointer',
                            color:'var(--v2-text-3)', padding:2, display:'flex' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {isSignUp && (
                <div className="v2-label-help">Minimum 8 characters recommended.</div>
              )}
            </div>

            {/* Error / success */}
            {error && (
              <div className="v2-alert v2-alert-error" style={{ marginBottom:14 }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            {message && (
              <div className="v2-alert v2-alert-success" style={{ marginBottom:14 }}>
                <CheckCircle size={13} /> {message}
              </div>
            )}

            {/* Submit */}
            <button className="v2-btn v2-btn-primary"
              onClick={handleSubmit} disabled={loading}
              style={{ width:'100%', justifyContent:'center',
                        padding:'12px', fontSize:14, marginBottom:16 }}>
              {loading
                ? <><RefreshCw size={13} className="spin" /> {isSignUp ? 'Creating account…' : 'Signing in…'}</>
                : <>{isSignUp ? 'Create free account' : 'Sign in'} <ArrowRight size={13} /></>}
            </button>

            {/* Toggle */}
            <div style={{ textAlign:'center', fontSize:13, color:'var(--v2-text-3)' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={toggle}
                style={{ background:'none', border:'none', cursor:'pointer',
                          color:'var(--v2-text)', fontWeight:600, fontSize:13,
                          padding:0, textDecoration:'underline', textUnderlineOffset:2 }}>
                {isSignUp ? 'Sign in' : 'Create one free'}
              </button>
            </div>
          </div>

          {/* Security note */}
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
