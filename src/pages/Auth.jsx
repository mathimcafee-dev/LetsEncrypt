import { useEffect, useState, useRef } from 'react'
import React from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Lock, CheckCircle, Zap, Eye, EyeOff, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import '../styles/design-v2.css'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}


function SSLVaultTrustBadge({ compact = false }) {
  const canvasRef = React.useRef(null)
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = compact ? 26 : 34
    const H = compact ? 38 : 50
    const STEPS = 13
    let f = 0, raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      const t = f * 0.044
      const pts1 = [], pts2 = []
      for (let i = 0; i <= STEPS; i++) {
        const y = 3 + (i / STEPS) * (H - 6)
        const phase = (i / STEPS) * Math.PI * 2.4 + t
        pts1.push({ x: W/2 + Math.sin(phase) * (W/2 - 3), y, phase })
        pts2.push({ x: W/2 + Math.sin(phase + Math.PI) * (W/2 - 3), y, phase })
      }
      for (let i = 0; i <= STEPS; i += 2) {
        const depth = (Math.sin(pts1[i].phase) + 1) / 2
        ctx.beginPath(); ctx.moveTo(pts1[i].x, pts1[i].y); ctx.lineTo(pts2[i].x, pts2[i].y)
        ctx.strokeStyle = `rgba(192,57,43,${(0.08 + depth * 0.15).toFixed(2)})`; ctx.lineWidth = 0.7; ctx.stroke()
      }
      const drawStrand = (pts, col) => {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i <= STEPS; i++) {
          const mx = (pts[i-1].x + pts[i].x)/2, my = (pts[i-1].y + pts[i].y)/2
          ctx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, mx, my)
        }
        ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke()
      }
      drawStrand(pts1, '#1f5c4e'); drawStrand(pts2, '#e85555')
      for (let i = 0; i <= STEPS; i++) {
        const depth = (Math.sin(pts1[i].phase) + 1) / 2
        const r = 1.4 + depth * 1.8
        ctx.beginPath(); ctx.arc(pts1[i].x, pts1[i].y, r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(220,80,60,${(0.35 + depth * 0.65).toFixed(2)})`; ctx.fill()
      }
      for (let i = 0; i <= STEPS; i++) {
        const depth = (Math.sin(pts2[i].phase + Math.PI) + 1) / 2
        const r = 1.4 + depth * 1.8
        ctx.beginPath(); ctx.arc(pts2[i].x, pts2[i].y, r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(192,57,43,${(0.25 + depth * 0.5).toFixed(2)})`; ctx.fill()
      }
      f++; raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [compact])
  const W = compact ? 26 : 34, H = compact ? 38 : 50
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: compact ? 8 : 11,
      padding: compact ? '6px 12px 6px 8px' : '9px 16px 9px 10px',
      background:'#1a0808',
      border:'1px solid rgba(31,92,78,0.25)',
      borderRadius:10, position:'relative', overflow:'hidden',
      minWidth: compact ? 0 : 240,
      animation:'sv-sweep-anim 3.5s ease-in-out infinite',
    }}>
      <canvas ref={canvasRef} width={W} height={H} style={{flexShrink:0}} />
      <div style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
        <span style={{fontSize:7,fontWeight:700,color:'#e85555',letterSpacing:'.14em',textTransform:'uppercase'}}>
          {compact ? 'Secured by' : 'Cryptographically Secured'}
        </span>
        <div style={{fontSize: compact ? 13 : 15, fontWeight:800, color:'#1a1a1a', lineHeight:1, letterSpacing:'.01em'}}>
          SSLVault <span style={{color:'#1f5c4e', fontSize: compact ? 10 : 11, fontWeight:500}}>® {compact ? 'PKI' : 'easysecurity.in'}</span>
        </div>
        <span style={{fontSize: compact ? 8 : 9, color:'#6a2a2a', letterSpacing:'.03em'}}>
          {compact ? '256-bit TLS encryption' : 'Certified PKI · GoGetSSL · RapidSSL DV'}
        </span>
        <div style={{width:'100%',height:2,background:'#120505',borderRadius:1,marginTop:3,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',left:'-60%',top:0,width:'40%',height:'100%',
            background:'linear-gradient(90deg,transparent,#2a6b5c,rgba(220,60,40,.5),transparent)',
            animation:'sv-scan-anim 2.4s linear infinite'}}/>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1,flexShrink:0}}>
        <span style={{fontSize: compact ? 14 : 18, fontWeight:900, color:'#e03030', lineHeight:1}}>256</span>
        <span style={{fontSize:8,color:'#6a2a2a',letterSpacing:'.06em',textTransform:'uppercase'}}>Bit SSL</span>
        {!compact && <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#1f5c4e',
            animation:'sv-live-anim 1.2s ease-in-out infinite'}}/>
          <span style={{fontSize:8,color:'#cc4444',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase'}}>Live</span>
        </div>}
      </div>
      <style>{`
        @keyframes sv-sweep-anim{0%{box-shadow:inset -60px 0 30px -30px transparent}50%{box-shadow:inset -60px 0 30px -30px rgba(192,57,43,0.06)}100%{box-shadow:inset -60px 0 30px -30px transparent}}
        @keyframes sv-scan-anim{0%{left:-60%}100%{left:120%}}
        @keyframes sv-live-anim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.55)}}
      `}</style>
    </div>
  )
}

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
    { icon:<Shield size={15} />, color:'#1a1a1a',               title:'Free forever',              desc:'No credit card. No upgrade prompts. No catch.' },
    { icon:<Lock size={15} />,   color:'#1f5c4e',       title:'Private keys stay private', desc:'AES-256 at rest. Keys never leave your server.' },
    { icon:<CheckCircle size={15} />, color:'#1a1a1a',          title:'Auto-renewal included',     desc:'Agent-based or cron — certificates never expire.' },
  ]

  return (
    <div className="v2-page" style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center' }}>
      <div style={{ position:'fixed', top:60, left:0, right:0, height:2, background:'#1f5c4e', zIndex:10 }} />

      <div style={{ maxWidth:1060, margin:'0 auto', padding:'clamp(24px,6vw,60px) clamp(14px,3vw,24px)',
                    display:'grid', gridTemplateColumns:'minmax(0,1fr) clamp(320px,35vw,420px)', gap:60,
                    alignItems:'center', width:'100%' }}>

        {/* Left: value prop */}
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'rgba(31,92,78,0.09)', border:'0.5px solid rgba(31,92,78,0.2)',
                        borderRadius:100, padding:'4px 14px', marginBottom:24 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:11, fontWeight:500, color:'#1f5c4e' }}>Free · Open · Trusted</span>
          </div>
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700, color:'#1a1a1a',
                        lineHeight:1.08, letterSpacing:'-1.4px', marginBottom:6 }}>One account.</h1>
          <h1 style={{ fontSize:'clamp(36px,4.5vw,52px)', fontWeight:700, lineHeight:1.08,
                        letterSpacing:'-1.4px', marginBottom:20, color:'#1f5c4e' }}>Every certificate.</h1>
          <p style={{ fontSize:15, color:'#3d3d3d', lineHeight:1.75, marginBottom:36, maxWidth:420 }}>
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
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:12, color:'#6b6b6b', lineHeight:1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:36, paddingTop:24, borderTop:'0.5px solid var(--v2-border)',
                        fontSize:11, color:'#6b6b6b', lineHeight:1.6 }}>
            Powered by RapidSSL · DigiCert trust chain · RFC 8555 ACME
          </div>
        </div>

        {/* Right: form card */}
        <div>
          <div className="v2-card" style={{ padding:'min(32px,5vw) min(30px,4vw)', borderTop:'2px solid var(--v2-green)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:40, height:40, background:'#1f5c4e', borderRadius:'var(--v2-r-lg)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             boxShadow:'0 0 0 4px rgba(0,0,0,0.07)' }}>
                <Shield size={18} color='#fff' />
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a1a1a', letterSpacing:'-0.3px' }}>
                  {mode === 'set_password' ? 'Set your password' : 'Sign in to SSLVault'}
                </div>
                <div style={{ fontSize:12, color:'#6b6b6b' }}>
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
                            color:'#6b6b6b', padding:2, display:'flex' }}>
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

            <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
              <SSLVaultTrustBadge compact={true} />
            </div>

            <div style={{ textAlign:'center', fontSize:13, color:'#6b6b6b' }}>
              New to SSLVault?{' '}
              <button onClick={() => nav('/auth')}
                style={{ background:'none', border:'none', cursor:'pointer',
                          color:'#1a1a1a', fontWeight:600, fontSize:13,
                          padding:0, textDecoration:'underline', textUnderlineOffset:2 }}>
                Contact us to get access
              </button>
            </div>
          </div>

          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:7,
                        justifyContent:'center', fontSize:11, color:'#6b6b6b' }}>
            <Lock size={10} />
            Encrypted at rest · Private keys never uploaded · Row-level security
          </div>
        </div>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
