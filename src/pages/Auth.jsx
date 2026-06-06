import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FONT = "'Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const BLUE = '#0077b6'
const DARK = '#005a8a'
const TEAL = '#3dbfb0'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function Auth({ nav }) {
  const isMobile = useIsMobile()
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [mode, setMode]               = useState('login')
  const [termLine, setTermLine]       = useState(0)
  const [pulse, setPulse]             = useState(true)

  const hashParams = new URLSearchParams(window.location.hash.replace('#',''))
  const isInviteHash = hashParams.get('type')==='invite'||hashParams.get('type')==='signup'

  useEffect(()=>{
    if(isInviteHash){setMode('set_password');return}
    supabase.auth.getSession().then(({data})=>{ if(data.session) nav('/') })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'&&isInviteHash){setMode('set_password');return}
      if(event==='PASSWORD_RECOVERY'){setMode('set_password');return}
      if(event==='SIGNED_IN'&&mode!=='set_password') nav('/')
      if(event==='USER_UPDATED') nav('/')
    })
    return ()=>subscription.unsubscribe()
  },[])

  // Terminal animation
  useEffect(()=>{
    const iv = setInterval(()=>setTermLine(l=>(l+1)%5), 2200)
    return ()=>clearInterval(iv)
  },[])

  // Pulse dot
  useEffect(()=>{
    const iv = setInterval(()=>setPulse(p=>!p), 1200)
    return ()=>clearInterval(iv)
  },[])

  const handleSubmit = async () => {
    if(mode==='set_password'){
      if(!password){setError('Please enter a password');return}
      if(password.length<8){setError('Password must be at least 8 characters');return}
      if(password!==confirmPw){setError('Passwords do not match');return}
      setError('');setLoading(true)
      try{ const{error}=await supabase.auth.updateUser({password}); if(error) throw error }
      catch(err){setError(err.message)}
      setLoading(false);return
    }
    if(!email||!password){setError('Please enter your email and password');return}
    setError('');setLoading(true)
    try{ const{error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error }
    catch(err){setError(err.message)}
    setLoading(false)
  }

  const TERM_LINES = [
    {text:'Polling certs expiring in 30 days…', c:'rgba(255,255,255,0.3)', prompt:'›'},
    {text:'easysecurity.in — renewing via DNS-01 ✓', c:TEAL, prompt:'›'},
    {text:'Cert issued · installing via cPanel UAPI ✓', c:TEAL, prompt:'›'},
    {text:'CertVault updated · AES-256-GCM ✓', c:TEAL, prompt:'›'},
    {text:'Next poll in 60s', c:'rgba(255,255,255,0.25)', prompt:'›'},
  ]

  const FEATURES = [
    {icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label:'Unlimited certificates', sub:'No cap on domains or issuances — ever.'},
    {icon:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label:'AES-256 key vault', sub:'Keys encrypted at rest. Never leave your server.'},
    {icon:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label:'Zero-touch auto-renewal', sub:'VPS agent + DNS-01. Certificates never expire.'},
    {icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', label:'47-day readiness', sub:'CA/B Forum SC-081v3 compliant. Ready for 2029.'},
  ]

  return (
    <div style={{fontFamily:FONT, minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center', background:'#f8f9fa'}}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes termfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .auth-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;font-size:13px;color:#111;font-family:${FONT};outline:none;transition:border-color .15s,box-shadow .15s}
        .auth-input:focus{border-color:${BLUE};box-shadow:0 0 0 3px rgba(0,119,182,0.1)}
        .auth-input::placeholder{color:#aaa}
        .sign-btn{width:100%;padding:12px;border-radius:8px;background:${BLUE};border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:${FONT};transition:background .15s;display:flex;align-items:center;justify-content:center;gap:8px}
        .sign-btn:hover{background:#0091d6}
        .sign-btn:disabled{opacity:0.6;cursor:not-allowed}
        .feat-icon{width:30px;height:30px;border-radius:7px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
      `}</style>

      <div style={{
        maxWidth: 1000, margin: '0 auto',
        padding: 'clamp(16px,4vw,40px)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 0, width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        minHeight: isMobile ? 'auto' : 620,
      }}>

        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div style={{background:BLUE, padding:'44px 40px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
            <div>
              {/* Eyebrow */}
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:20}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:TEAL,opacity:pulse?1:.25,transition:'opacity 0.4s'}}/>
                <span style={{fontSize:10,letterSpacing:'.14em',color:'rgba(255,255,255,.4)',textTransform:'uppercase',fontFamily:MONO}}>SSLVault · easysecurity.in</span>
              </div>

              {/* Title */}
              <div style={{fontSize:32,fontWeight:700,color:'#fff',lineHeight:1.2,marginBottom:10,letterSpacing:'-0.5px'}}>
                One account.<br/><span style={{color:TEAL}}>Every certificate.</span>
              </div>
              <p style={{fontSize:13,color:'rgba(255,255,255,.55)',lineHeight:1.7,marginBottom:28,maxWidth:340}}>
                The only CLM platform with built-in 47-day readiness, AES-256 key vault, and zero-touch DNS automation.
              </p>

              {/* Features */}
              <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:28}}>
                {FEATURES.map(f=>(
                  <div key={f.label} style={{display:'flex',alignItems:'flex-start',gap:12}}>
                    <div className="feat-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={f.icon}/>
                      </svg>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:2}}>{f.label}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.45)',lineHeight:1.5}}>{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Terminal preview */}
              <div style={{background:'#0f1923',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#1a2533',padding:'7px 12px',display:'flex',alignItems:'center',gap:6,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{display:'flex',gap:4}}>
                    {['#ff5f57','#ffbd2e','#28c840'].map(c=><div key={c} style={{width:7,height:7,borderRadius:'50%',background:c}}/>)}
                  </div>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.3)',fontFamily:MONO,flex:1,textAlign:'center'}}>agent · auto-renew pipeline</span>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#2ecc71',opacity:pulse?1:.3,transition:'opacity 0.4s'}}/>
                </div>
                <div style={{padding:'10px 12px',minHeight:90}}>
                  {TERM_LINES.map((l,i)=>(
                    <div key={i} style={{
                      display:'flex',gap:7,fontSize:10,fontFamily:MONO,lineHeight:1.7,
                      opacity: i <= termLine ? 1 : 0.15,
                      color: i === termLine ? l.c : i < termLine ? 'rgba(255,255,255,0.2)' : 'transparent',
                      transition: 'all 0.4s',
                    }}>
                      <span style={{color:'rgba(255,255,255,.25)',flexShrink:0}}>{l.prompt}</span>
                      <span>{l.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom strip */}
            <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.1)',display:'flex',gap:16,flexWrap:'wrap'}}>
              {['RFC 8555','AES-256-GCM','CA/B Forum 2026','GoGetSSL','GoGetSSL'].map(t=>(
                <span key={t} style={{fontSize:9,color:'rgba(255,255,255,.3)',letterSpacing:'.07em',fontFamily:MONO,whiteSpace:'nowrap'}}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL / FORM ── */}
        <div style={{background:'#fff',padding: isMobile ? '36px 24px' : '44px 40px',display:'flex',flexDirection:'column',justifyContent:'center'}}>

          {/* Header */}
          <div style={{marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:10,background:BLUE,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#111',letterSpacing:'-0.3px'}}>
                  {mode==='set_password'?'Set your password':'Sign in to SSLVault'}
                </div>
                <div style={{fontSize:12,color:'#888',marginTop:1}}>
                  {mode==='set_password'?'Choose a password to activate your account':'Welcome back — your certificates are waiting.'}
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          {mode!=='set_password'&&(
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Email address</label>
              <input className="auth-input" type="email" placeholder="you@example.com"
                value={email} onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()} autoFocus/>
            </div>
          )}

          <div style={{marginBottom: mode==='set_password'?14:20}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Password</label>
            <div style={{position:'relative'}}>
              <input className="auth-input" type={showPw?'text':'password'} placeholder="••••••••"
                value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
                style={{paddingRight:38}}/>
              <button onClick={()=>setShowPw(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#aaa',padding:2,display:'flex',alignItems:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {showPw
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
            {mode==='set_password'&&<div style={{fontSize:11,color:'#aaa',marginTop:5}}>Minimum 8 characters.</div>}
          </div>

          {mode==='set_password'&&(
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Confirm password</label>
              <input className="auth-input" type={showPw?'text':'password'} placeholder="Repeat password"
                value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
            </div>
          )}

          {/* Error */}
          {error&&(
            <div style={{background:'rgba(231,76,60,.06)',border:'1px solid rgba(231,76,60,.2)',borderRadius:8,padding:'9px 12px',marginBottom:14,fontSize:12,color:'#c0392b',display:'flex',alignItems:'center',gap:7}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button className="sign-btn" onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'spin 1s linear infinite'}}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> {mode==='set_password'?'Setting password…':'Signing in…'}</>
              : <>{mode==='set_password'?'Set password & continue':'Sign in'} <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
            }
          </button>

          {/* Trust signals */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginTop:14,flexWrap:'wrap'}}>
            {[
              ['M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z','Encrypted at rest'],
              ['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z','Row-level security'],
              ['M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21','No key upload'],
            ].map(([path,label])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#aaa'}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={path}/></svg>
                {label}
              </div>
            ))}
          </div>

          {/* Divider + Contact */}
          <div style={{height:'1px',background:'rgba(0,0,0,.06)',margin:'18px 0'}}/>
          <div style={{textAlign:'center',fontSize:12,color:'#888'}}>
            New to SSLVault?{' '}
            <button onClick={()=>nav('/contact')} style={{background:'none',border:'none',cursor:'pointer',color:BLUE,fontWeight:600,fontSize:12,padding:0,fontFamily:FONT}}>
              Contact us to get access
            </button>
          </div>

          {/* Powered by */}
          <div style={{marginTop:20,textAlign:'center',fontSize:10,color:'#ccc',fontFamily:MONO}}>
            Powered by RapidSSL · DigiCert trust chain · RFC 8555 ACME
          </div>
        </div>
      </div>
    </div>
  )
}
