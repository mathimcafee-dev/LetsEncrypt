// CertVault.jsx — Fixed & complete: reveal key, working rotate, view audit per domain, export CSV
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Lock, RefreshCw, Eye, EyeOff, Copy, Check, Activity,
  RotateCcw, Clock, Trash2, Shield, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Download, Zap, ArrowRight, Bell
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM d, yyyy') : '—'
const fmtAgo  = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—'

function statusColor(s) {
  return { active:'#f0ede8', archived:'#f0ede8', revoked:'#f87171' }[s] || 'rgba(240,237,232,0.38)'
}

// ── callCertVault helper ──────────────────────────────────────────────
async function callCertVault(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/certvault`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

// ── Reveal Key Modal — 30s countdown, copy-only, audit logged ─────────
// ── RevealModal — Step 1: password gate → Step 2: key reveal ─────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function RevealModal({ keyEntry, userEmail, onClose }) {
  // step: 'auth' | 'key'
  const [step,      setStep]      = useState('auth')
  const [password,  setPassword]  = useState('')
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [attempts,  setAttempts]  = useState(0)

  // Key reveal state
  const [pem,       setPem]       = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [fetchErr,  setFetchErr]  = useState('')
  const [countdown, setCountdown] = useState(30)
  const [copied,    setCopied]    = useState(false)
  const timerRef  = useRef(null)
  const inputRef  = useRef(null)

  // Focus password input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  // ── Step 1: verify password via Supabase re-auth ──────────────────
  const verifyPassword = async (e) => {
    e?.preventDefault()
    if (!password.trim()) return
    if (attempts >= 3) return  // locked after 3 fails

    setVerifying(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email:    userEmail,
        password: password.trim(),
      })
      if (error) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= 3) {
          setAuthError('Too many failed attempts. Access locked.')
        } else {
          setAuthError(`Incorrect password. ${3 - next} attempt${3 - next !== 1 ? 's' : ''} remaining.`)
        }
        setPassword('')
        inputRef.current?.focus()
        setVerifying(false)
        return
      }
      // Password correct — fetch and decrypt key
      setStep('key')
      setLoading(true)
      const res = await callCertVault('fetch', { key_id: keyEntry.id, triggered_by: 'user_reveal' })
      if (res.error) { setFetchErr(res.error); setLoading(false); return }
      setPem(res.private_key_pem)
      setLoading(false)
      // Start 30s countdown
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); onClose(); return 0 }
          return c - 1
        })
      }, 1000)
    } catch (err) {
      setAuthError('Verification failed: ' + (err.message || 'unknown error'))
      setVerifying(false)
    }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // ── Copy key ──────────────────────────────────────────────────────
  const copy = async () => {
    if (!pem) return
    try { await navigator.clipboard.writeText(pem) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = pem; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const masked = [
    '-----BEGIN PRIVATE KEY-----',
    '••••••••••••••••••••••••••••••••••••••',
    '••••••••••••••••••••••••••••••••••••••',
    '••••••••••••••••••••••••••••••••••••••',
    '-----END PRIVATE KEY-----',
  ].join('\n')

  const pct = (countdown / 30) * 100
  const locked = attempts >= 3

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--v2-surface)', borderRadius:14, width:'100%', maxWidth:480,
        boxShadow:'0 28px 72px rgba(0,0,0,0.35)', overflow:'hidden',
        animation:'modalIn .2s cubic-bezier(.16,1,.3,1)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'0.5px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9,
            background: step==='auth' ? 'transparent' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {step === 'auth' ? <Lock size={15} color="#e07060"/> : <Eye size={15} color="#e07060"/>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#ffffff' }}>
              {step === 'auth' ? 'Confirm your identity' : `Private key — ${keyEntry.domain}`}
            </div>
            <div style={{ fontSize:11, color:'#b0a8a0', marginTop:1 }}>
              {step === 'auth'
                ? `Enter your password to access the private key for ${keyEntry.domain}`
                : `Copy only · Auto-hides in ${countdown}s · Logged to audit trail`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', color:'#b0a8a0', fontSize:20, lineHeight:1, padding:'2px 4px' }}>
            ×
          </button>
        </div>

        {/* Progress indicator */}
        <div style={{ height:2, background:'var(--v2-surface-3)', display:'flex' }}>
          {step === 'auth' ? (
            <div style={{ width:'50%', background:'#c0392b', transition:'width .3s' }}/>
          ) : (
            <div style={{ width:`${pct}%`, background:'#c0392b', transition:'width 1s linear' }}/>
          )}
        </div>

        {/* Step pills */}
        <div style={{ display:'flex', gap:6, padding:'12px 20px 0',
          alignItems:'center', justifyContent:'center' }}>
          {[
            { n:1, label:'Verify identity', done: step==='key' },
            { n:2, label:'Copy key',        done: false },
          ].map(({ n, label, done }, i) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontWeight:700,
                  background: done ? '#c0392b' : (step==='auth'&&n===1)||(step==='key'&&n===2) ? '#c0392b' : 'rgba(255,255,255,0.08)',
                  color: done||(step==='auth'&&n===1)||(step==='key'&&n===2) ? '#ffffff' : '#b0a8a0',
                }}>
                  {done ? <Check size={10}/> : n}
                </div>
                <span style={{ fontSize:11, color: (step==='auth'&&n===1)||(step==='key'&&n===2) ? 'var(--v2-text)' : 'var(--v2-text-3)', fontWeight:500 }}>
                  {label}
                </span>
              </div>
              {i === 0 && <div style={{ width:28, height:1, background:'var(--v2-border)' }}/>}
            </div>
          ))}
        </div>

        <div style={{ padding:'16px 20px 20px' }}>

          {/* ── STEP 1: Password gate ── */}
          {step === 'auth' && (
            <form onSubmit={verifyPassword}>
              <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                borderRadius:9, padding:'12px 14px', marginBottom:14, fontSize:11,
                color:'#e8e0d8', lineHeight:1.6 }}>
                <Lock size={11} style={{ verticalAlign:'-1px', marginRight:5, color:'#ffffff' }}/>
                This is a high-security action. Re-enter your SSLVault password to confirm you
                are authorised to access this private key. This attempt will be logged.
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#e8e0d8',
                  display:'block', marginBottom:6 }}>
                  Account password
                  <span style={{ fontSize:10, color:'#b0a8a0', fontWeight:400,
                    marginLeft:6 }}>({userEmail})</span>
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={locked || verifying}
                  style={{ width:'100%', padding:'10px 12px', fontSize:13,
                    borderRadius:8, border:`1px solid ${authError ? 'rgba(239,83,80,0.3)' : 'var(--v2-border)'}`,
                    background: locked ? 'var(--v2-surface-3)' : 'var(--v2-surface)',
                    color:'#ffffff', fontFamily:'inherit', outline:'none',
                    boxSizing:'border-box',
                    boxShadow: authError ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none' }}
                />
              </div>

              {authError && (
                <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid rgba(248,113,113,0.3)', borderRadius:7,
                  padding:'9px 12px', marginBottom:12, fontSize:11, color:'#f87171',
                  display:'flex', alignItems:'center', gap:7 }}>
                  <AlertTriangle size={12} style={{ flexShrink:0 }}/>
                  {authError}
                </div>
              )}

              {locked ? (
                <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid rgba(248,113,113,0.3)', borderRadius:7,
                  padding:'10px 12px', fontSize:12, color:'#f87171', textAlign:'center' }}>
                  Access locked after 3 failed attempts. Close and try again later.
                </div>
              ) : (
                <button type="submit" disabled={verifying || !password.trim()}
                  style={{ width:'100%', padding:'11px', borderRadius:8, cursor:'pointer',
                    background: verifying||!password.trim() ? 'var(--v2-surface-3)' : '#f0ede8',
                    color: verifying||!password.trim() ? 'var(--v2-text-3)' : '#000000',
                    border:'none', fontSize:13, fontWeight:600, fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all .15s' }}>
                  {verifying
                    ? <><RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }}/> Verifying…</>
                    : <><Lock size={13}/> Confirm &amp; reveal key</>}
                </button>
              )}
            </form>
          )}

          {/* ── STEP 2: Key reveal ── */}
          {step === 'key' && (
            <>
              {loading ? (
                <div style={{ textAlign:'center', padding:'28px 0', color:'#b0a8a0' }}>
                  <RefreshCw size={20} style={{ animation:'spin .8s linear infinite',
                    margin:'0 auto 10px', display:'block' }}/>
                  <div style={{ fontSize:12 }}>Decrypting from vault…</div>
                </div>
              ) : fetchErr ? (
                <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid #fecaca', borderRadius:8,
                  padding:'12px 14px', fontSize:12, color:'#f87171' }}>
                  <AlertTriangle size={12} style={{ verticalAlign:'-1px', marginRight:6 }}/>
                  {fetchErr}
                </div>
              ) : (
                <>
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'0.5px solid #F2C4BC', borderRadius:8,
                    padding:'9px 12px', marginBottom:12, fontSize:11, color:'#ff8c7a',
                    display:'flex', alignItems:'center', gap:7 }}>
                    <AlertTriangle size={11} style={{ flexShrink:0 }}/>
                    Never share this key. Do not save unencrypted. This access is logged.
                  </div>

                  <div style={{ background:'#0d0000', borderRadius:9, padding:'14px 16px',
                    marginBottom:12, fontFamily:'monospace', fontSize:11, color:'#b0a8a0',
                    lineHeight:1.8, whiteSpace:'pre', userSelect:'none' }}>
                    {masked}
                  </div>

                  <button onClick={copy} style={{
                    width:'100%', padding:'11px', borderRadius:8, cursor:'pointer',
                    background: copied ? 'transparent' : '#f0ede8', fontFamily:'inherit',
                    color: copied ? '#4ade80' : '#000000',
                    border: copied ? '1px solid rgba(192,57,43,0.3)' : 'none',
                    fontSize:13, fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all .2s',
                  }}>
                    {copied
                      ? <><Check size={14}/> Copied to clipboard!</>
                      : <><Copy size={14}/> Copy private key to clipboard</>}
                  </button>

                  <div style={{ fontSize:10, color:'#b0a8a0', textAlign:'center', marginTop:8 }}>
                    The real key is copied — masked display is intentional.
                    Auto-closes in {countdown}s.
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin    { from{transform:rotate(0)}to{transform:rotate(360deg)} }
        @keyframes modalIn { from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}

// ── AuditRow ──────────────────────────────────────────────────────────
function AuditRow({ entry }) {
  const icons = {
    created:  <Shield size={12} color="#e07060"/>,
    fetched:  <Eye size={12} color="#c0392b"/>,
    rotated:  <RotateCcw size={12} color="#e07060"/>,
    archived: <Clock size={12} color="rgba(0,0,0,0.36)"/>,
    deleted:  <Trash2 size={12} color="#c0392b"/>,
    viewed:   <Eye size={12} color="rgba(0,0,0,0.36)"/>,
  }
  const actionColors = {
    created:'#ff8c7a', fetched:'#ff8c7a', rotated:'#fbbf24',
    archived:'rgba(240,237,232,0.38)', deleted:'#f87171', viewed:'rgba(240,237,232,0.38)',
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
      borderBottom:'0.5px solid rgba(255,255,255,0.08)', fontSize:12 }}>
      <div style={{ width:28, height:28, borderRadius:6, flexShrink:0,
        background:`${actionColors[entry.action] || 'rgba(240,237,232,0.38)'}12`,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        {icons[entry.action] || <Activity size={12}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontWeight:500, color:'#ffffff' }}>{entry.domain}</span>
        <span style={{ color:'#b0a8a0', marginLeft:8 }}>
          {entry.action} · via {entry.triggered_by}
        </span>
      </div>
      <div style={{ fontSize:11, color:'#b0a8a0', flexShrink:0 }}>
        {fmtAgo(entry.created_at)}
      </div>
    </div>
  )
}

// ── KeyCard — fixed with reveal + working view audit ──────────────────
// ── Entropy dot visualiser ────────────────────────────────────────────
const ENTROPY_COLORS = [
  '#4ade80','#22c55e','#86efac',
  '#fbbf24','#f97316','#fb923c',
  '#f87171','#ef4444','#fca5a5',
  '#818cf8','#a78bfa',
  '#38bdf8','#67e8f9',
  '#c0392b','#ff8c7a',
]
function EntropyDots() {
  const N = 36
  const [dots, setDots] = useState(() =>
    Array.from({ length: N }, () => ({
      color:   ENTROPY_COLORS[Math.floor(Math.random() * ENTROPY_COLORS.length)],
      opacity: parseFloat((Math.random() * 0.65 + 0.15).toFixed(2)),
    }))
  )
  useEffect(() => {
    const id = setInterval(() => {
      setDots(prev => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * N)
        next[idx] = {
          color:   ENTROPY_COLORS[Math.floor(Math.random() * ENTROPY_COLORS.length)],
          opacity: parseFloat((Math.random() * 0.65 + 0.15).toFixed(2)),
        }
        return next
      })
    }, 90)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ display:'flex', gap:3, flex:1, flexWrap:'nowrap', overflow:'hidden', alignItems:'center' }}>
      {dots.map((d, i) => (
        <div key={i} style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: d.color, opacity: d.opacity, transition:'opacity .15s, background .15s' }} />
      ))}
    </div>
  )
}

// ── KeyCard — compact row, expands on click ───────────────────────────
function KeyCard({ keyEntry, onRotate, rotating, onReveal, onViewAudit }) {
  const [open, setOpen] = useState(false)
  const days           = keyEntry.expires_at
    ? differenceInDays(new Date(keyEntry.expires_at), new Date()) : null
  const isExpiringSoon = days !== null && days < 30
  const totalDays      = keyEntry.expires_at && keyEntry.created_at
    ? differenceInDays(new Date(keyEntry.expires_at), new Date(keyEntry.created_at)) : null
  const usedDays       = keyEntry.created_at
    ? differenceInDays(new Date(), new Date(keyEntry.created_at)) : 0
  const lifetimePct    = totalDays && totalDays > 0
    ? Math.min(100, Math.round((usedDays / totalDays) * 100)) : null
  const accentColor    = keyEntry.status === 'archived' ? '#b0a8a0'
    : isExpiringSoon ? '#f87171' : '#4ade80'

  return (
    <div style={{ border:'0.5px solid rgba(255,255,255,0.09)', borderRadius:10,
      overflow:'hidden', position:'relative', transition:'border-color .15s',
      ...(open ? { borderColor:'rgba(255,255,255,0.16)' } : {}) }}>

      {/* Left accent bar */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3,
        background: accentColor, borderRadius:'3px 0 0 3px' }} />

      {/* ── Compact header row — always visible ── */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px 12px 20px',
          cursor:'pointer', userSelect:'none',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition:'background .15s' }}>

        {/* Domain + badges */}
        <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#ffffff',
            fontFamily:'"JetBrains Mono","Menlo",monospace' }}>
            {keyEntry.domain}
          </span>
          <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.3px',
            color: accentColor, background:`${accentColor}15`,
            border:`0.5px solid ${accentColor}40`, borderRadius:4, padding:'2px 7px' }}>
            {keyEntry.status}
          </span>
          {keyEntry.status === 'active' && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:9,
              color:'#ffffff', background:'rgba(192,57,43,0.12)',
              border:'0.5px solid rgba(192,57,43,0.4)', borderRadius:4,
              padding:'2px 7px', fontWeight:700 }}>
              <Lock size={8}/> VAULT SECURED
            </span>
          )}
        </div>

        {/* Right meta — algo · days · chevron */}
        <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <span style={{ fontSize:11, color:'#b0a8a0' }}>
            {keyEntry.algorithm || 'RSA'} · {keyEntry.key_size || 2048}-bit
          </span>
          {days !== null && (
            <span style={{ fontSize:11, fontWeight:700, color: accentColor }}>
              {days}d
            </span>
          )}
          {open ? <ChevronUp size={13} color="#b0a8a0"/> : <ChevronDown size={13} color="#b0a8a0"/>}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {open && (
        <div style={{ borderTop:'0.5px solid rgba(255,255,255,0.07)', padding:'16px 16px 16px 20px' }}>

          {/* Expiry warning */}
          {isExpiringSoon && keyEntry.status === 'active' && (
            <div style={{ background:'rgba(248,113,113,0.08)', border:'0.5px solid rgba(248,113,113,0.3)',
              borderRadius:8, padding:'9px 12px', marginBottom:12, fontSize:11, color:'#f87171' }}>
              <AlertTriangle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
              <strong>Expiring in {days} days</strong> — rotate now to avoid disruption.
            </div>
          )}

          {/* Entropy visualisation */}
          <div style={{ background:'#0d0000', border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center',
            gap:12, marginBottom:12 }}>
            <Lock size={13} color="#b0a8a0" style={{ flexShrink:0 }}/>
            <EntropyDots />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.8px',
              color:'#b0a8a0', fontFamily:'"JetBrains Mono",monospace', flexShrink:0 }}>
              ENCRYPTED
            </span>
          </div>

          {/* Expiry progress bar */}
          {lifetimePct !== null && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                fontSize:9, color:'#b0a8a0', marginBottom:5, fontWeight:600,
                textTransform:'uppercase', letterSpacing:'0.5px' }}>
                <span>Issued {fmtDate(keyEntry.created_at)}</span>
                <span style={{ color: accentColor }}>
                  {days !== null ? `${days}d left · ` : ''}
                  {keyEntry.expires_at ? `Expires ${fmtDate(keyEntry.expires_at)}` : ''}
                </span>
              </div>
              <div style={{ height:3, background:'rgba(255,255,255,0.07)',
                borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:3, borderRadius:2, width:`${lifetimePct}%`,
                  background: accentColor }} />
              </div>
            </div>
          )}

          {/* Metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[
              { label:'Last accessed', value: keyEntry.last_accessed_at ? fmtAgo(keyEntry.last_accessed_at) : 'Never' },
              { label:'Rotations',     value: keyEntry.rotation_count ?? 0 },
              { label:'Key size',      value: `${keyEntry.key_size || 2048} bit` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.04)',
                borderRadius:8, padding:'9px 12px', border:'0.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#b0a8a0',
                  textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#ffffff' }}>{String(value)}</div>
              </div>
            ))}
          </div>

          {/* Actions — active */}
          {keyEntry.status === 'active' && (
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              <button onClick={() => onReveal(keyEntry)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px',
                  fontSize:11, fontWeight:700, borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                  background:'#c0392b', color:'#fff', border:'none', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#a93226'}
                onMouseLeave={e=>e.currentTarget.style.background='#c0392b'}>
                <Eye size={11}/> Reveal key
              </button>
              <button onClick={() => onRotate(keyEntry)}
                disabled={rotating === keyEntry.id}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
                  fontSize:11, fontWeight:600, borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                  background:'rgba(255,255,255,0.08)', color:'#e8e0d8',
                  border:'0.5px solid rgba(255,255,255,0.18)', transition:'all .15s',
                  opacity: rotating === keyEntry.id ? 0.5 : 1 }}>
                {rotating === keyEntry.id
                  ? <><RefreshCw size={10} style={{ animation:'spin .8s linear infinite' }}/> Rotating…</>
                  : <><RotateCcw size={10}/> Rotate key</>}
              </button>
              <button onClick={() => onViewAudit(keyEntry.domain)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
                  fontSize:11, fontWeight:600, borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                  background:'rgba(255,255,255,0.08)', color:'#e8e0d8',
                  border:'0.5px solid rgba(255,255,255,0.18)', transition:'all .15s' }}>
                <Activity size={10}/> View audit
              </button>
            </div>
          )}

          {/* Archived */}
          {keyEntry.status === 'archived' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:11, color:'#b0a8a0', flex:1 }}>
                <Clock size={11} style={{ verticalAlign:'-1px', marginRight:4 }}/>
                Archived {fmtAgo(keyEntry.archived_at)} · Auto-deleted 30 days after archiving
              </div>
              <button onClick={() => onViewAudit(keyEntry.domain)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
                  fontSize:11, fontWeight:600, borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                  background:'rgba(255,255,255,0.08)', color:'#e8e0d8',
                  border:'0.5px solid rgba(255,255,255,0.18)', transition:'all .15s', flexShrink:0 }}>
                <Activity size={10}/> View audit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══ MAIN CertVault PAGE ════════════════════════════════════════════════
export default function CertVault({ nav }) {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const { isPro, loading: planLoading } = usePlan(user)

  const [keys,          setKeys]          = useState([])
  const [audit,         setAudit]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [rotating,      setRotating]      = useState(null)
  const [rotateConfirm, setRotateConfirm] = useState(null)
  const [rotateError,   setRotateError]   = useState('')
  const [rotateSuccess, setRotateSuccess] = useState('')
  const [tab,           setTab]           = useState('vault')
  const [auditFilter,   setAuditFilter]   = useState(null) // domain filter for audit tab
  const [revealKey,     setRevealKey]     = useState(null) // keyEntry to reveal

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await callCertVault('list')
    setKeys(data.keys   || [])
    setAudit(data.audit || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user || planLoading) return
    loadData()
  }, [user?.id, planLoading, loadData])

  // ── Rotate — proper flow: calls auto-renew which re-issues cert + stores new key ──
  const handleRotate = async (keyEntry) => {
    setRotateConfirm(null)
    setRotateError('')
    setRotateSuccess('')
    setRotating(keyEntry.id)
    try {
      // Find the cert linked to this key
      const { data: cert } = await supabase
        .from('certificates')
        .select('id, domain, dns_provider_id, install_method')
        .eq('keylocker_key_id', keyEntry.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!cert) {
        // Fallback: just archive the old key directly
        const res = await callCertVault('archive', { key_id: keyEntry.id })
        if (res.error) throw new Error(res.error)
        setRotateSuccess(`Key for ${keyEntry.domain} archived. Issue a new certificate to replace it.`)
        await loadData()
        return
      }

      // Trigger auto-renew via agent-daemon edge function which handles full rotation
      const { data: { session } } = await supabase.auth.getSession()
      const renewRes = await fetch(`${SB_URL}/functions/v1/agent-daemon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action:   'dispatch_job',
          job_type: 'renew',
          cert_id:  cert.id,
          domain:   cert.domain,
          user_id:  user.id,
          force:    true,
        }),
      })
      const renewData = await renewRes.json()

      if (renewData.error) throw new Error(renewData.error)

      setRotateSuccess(
        `Rotation job dispatched for ${keyEntry.domain}. ` +
        `A new certificate will be issued and the private key replaced in the vault. ` +
        `Old key archived for 30-day rollback.`
      )
      await loadData()
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many')) {
        setRotateError(
          `Rate limit reached for ${keyEntry.domain}. ` +
          `Let's Encrypt allows 5 certs per domain per week. Please try again in a few days.`
        )
      } else {
        setRotateError(`Rotation failed: ${msg}`)
      }
    }
    setRotating(null)
  }

  // ── View audit for a specific domain ─────────────────────────────
  const handleViewAudit = (domain) => {
    setAuditFilter(domain)
    setTab('audit')
  }

  // ── Export audit log as CSV ───────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Domain','Action','Triggered by','Date']]
    const filtered = auditFilter
      ? audit.filter(e => e.domain === auditFilter)
      : audit
    filtered.forEach(e => rows.push([
      e.domain, e.action, e.triggered_by,
      e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd HH:mm') : ''
    ]))
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `certvault-audit-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Auth guards ───────────────────────────────────────────────────
  if (authLoading || planLoading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center',
      justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={20} style={{ animation:'spin .8s linear infinite' }} color="var(--v2-text-3)"/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!user) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center',
      justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ width:48, height:48, background:'#0d0000', borderRadius:12,
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Lock size={22} color="white"/>
        </div>
        <div style={{ fontSize:18, fontWeight:700, color:'#ffffff', marginBottom:8 }}>
          Sign in to access CertVault
        </div>
        <button className="v2-btn v2-btn-primary" style={{ padding:'10px 22px', fontSize:14 }}
          onClick={() => nav('/auth')}>
          Sign in <ArrowRight size={13}/>
        </button>
      </div>
    </div>
  )

  // ── Vault UI ──────────────────────────────────────────────────
  const activeKeys   = keys.filter(k => k.status === 'active')
  const archivedKeys = keys.filter(k => k.status === 'archived')
  const filteredAudit = auditFilter
    ? audit.filter(e => e.domain === auditFilter)
    : audit

  return (
    <div className="v2-page">
      {/* Reveal modal */}
      {revealKey && (
        <RevealModal keyEntry={revealKey} userEmail={user?.email} onClose={() => { setRevealKey(null); loadData() }}/>
      )}

      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10,
              background:'linear-gradient(135deg,#f07059,#a93226)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 0 4px rgba(232,137,122,0.15)' }}>
              <Lock size={18} color="white"/>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h1 className="v2-h1">CertVault Vault</h1>
                <span style={{ fontSize:9, fontWeight:700, color:'#ffffff',
                  background:'rgba(239,68,68,0.08)', border:'0.5px solid #F2C4BC',
                  borderRadius:4, padding:'2px 7px', textTransform:'uppercase',
                  letterSpacing:'0.4px' }}>PRO</span>
              </div>
              <p style={{ fontSize:12, color:'#b0a8a0', marginTop:2 }}>
                {user.email} · {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
                {archivedKeys.length > 0 && ` · ${archivedKeys.length} archived`}
              </p>
            </div>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={loadData}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>

        {/* Security strip */}
        <div style={{ background:'rgba(192,57,43,0.06)', border:'0.5px solid rgba(192,57,43,0.22)',
          borderRadius:9, padding:'10px 16px', marginBottom:20,
          display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative', flexShrink:0, width:8, height:8 }}>
            <div style={{ position:'absolute', inset:'-3px', borderRadius:'50%',
              background:'rgba(74,222,128,0.15)', animation:'dotpulse 2s ease infinite' }}/>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', position:'relative' }}/>
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontWeight:500 }}>
            AES-256-GCM encrypted · Envelope key hierarchy · Immutable audit log · Keys never stored in plaintext
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:20 }}>
          {[
            { label:'Active keys',  val:activeKeys.length,   color:'#ffffff' },
            { label:'Archived',     val:archivedKeys.length, color:'#ffffff' },
            { label:'Audit events', val:audit.length,        color:'#ffffff' },
            { label:'Encryption',   val:'AES-256',           color:'#4ade80' },
          ].map(({ label, val, color }) => (
            <div key={label} className="v2-card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color:'#b0a8a0', marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Banners */}
        {rotateError && (
          <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid #fecaca', borderRadius:8,
            padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#f87171' }}>
            <AlertTriangle size={13} style={{ flexShrink:0 }}/>
            <span style={{ flex:1 }}>{rotateError}</span>
            <button onClick={() => setRotateError('')}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'#f87171', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        )}
        {rotateSuccess && (
          <div style={{ background:'transparent', border:'0.5px solid rgba(192,57,43,0.3)', borderRadius:8,
            padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#ffffff' }}>
            <CheckCircle size={13} style={{ flexShrink:0 }}/>
            <span style={{ flex:1 }}>{rotateSuccess}</span>
            <button onClick={() => setRotateSuccess('')}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:'#ffffff', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:1, borderBottom:'0.5px solid rgba(255,255,255,0.08)',
          marginBottom:20 }}>
          {[
            { key:'vault',    label:'Vault',     count:activeKeys.length   },
            { key:'archived', label:'Archive',   count:archivedKeys.length },
            { key:'audit',    label:'Audit log', count:audit.length        },
          ].map(t => (
            <button key={t.key} onClick={() => {
              setTab(t.key)
              if (t.key !== 'audit') setAuditFilter(null)
            }}
              style={{ padding:'8px 14px', fontSize:12, fontWeight:tab===t.key?500:400,
                cursor:'pointer', fontFamily:'inherit', background:'none', border:'none',
                borderBottom:tab===t.key?'2px solid #c0392b':'2px solid transparent',
                color:tab===t.key?'#f0ede8':'var(--v2-text-3)', marginBottom:'-0.5px',
                display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:8,
                background:tab===t.key?'transparent':'var(--v2-surface-3)',
                color:tab===t.key?'#f0ede8':'var(--v2-text-3)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#b0a8a0' }}>
            <RefreshCw size={22} style={{ animation:'spin .8s linear infinite',
              margin:'0 auto 10px', display:'block' }}/>
            Loading vault…
          </div>
        ) : (
          <>
            {/* VAULT TAB */}
            {tab === 'vault' && (
              activeKeys.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <Lock size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                  <div style={{ fontSize:14, fontWeight:500, color:'#e8e0d8', marginBottom:6 }}>
                    Vault is empty
                  </div>
                  <div style={{ fontSize:12, color:'#b0a8a0', maxWidth:360,
                    margin:'0 auto 20px', lineHeight:1.6 }}>
                    Issue a certificate to automatically store its key here.
                  </div>
                  <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>
                    Issue certificate
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {activeKeys.map(k => (
                    <KeyCard key={k.id} keyEntry={k}
                      onRotate={() => setRotateConfirm(k)}
                      onReveal={setRevealKey}
                      onViewAudit={handleViewAudit}
                      rotating={rotating}/>
                  ))}
                </div>
              )
            )}

            {/* ARCHIVE TAB */}
            {tab === 'archived' && (
              archivedKeys.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <Clock size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                  <div style={{ fontSize:14, fontWeight:500, color:'#e8e0d8', marginBottom:6 }}>
                    No archived keys
                  </div>
                  <div style={{ fontSize:12, color:'#b0a8a0', lineHeight:1.6 }}>
                    After rotation, old keys appear here for 30-day rollback before deletion.
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'0.5px solid #F2C4BC', borderRadius:8,
                    padding:'10px 14px', fontSize:11, color:'#ff8c7a', marginBottom:4 }}>
                    <AlertTriangle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
                    These keys are retained for 30 days as rollback, then permanently destroyed.
                  </div>
                  {archivedKeys.map(k => (
                    <KeyCard key={k.id} keyEntry={k}
                      onRotate={() => {}}
                      onReveal={setRevealKey}
                      onViewAudit={handleViewAudit}
                      rotating={null}/>
                  ))}
                </div>
              )
            )}

            {/* AUDIT TAB */}
            {tab === 'audit' && (
              <div className="v2-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.08)',
                  display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, fontSize:12, color:'#e8e0d8', fontWeight:500 }}>
                    {auditFilter
                      ? <>Audit log for <strong>{auditFilter}</strong>
                          <button onClick={() => setAuditFilter(null)}
                            style={{ marginLeft:8, fontSize:10, background:'none', border:'none',
                              cursor:'pointer', color:'#b0a8a0' }}>
                            (clear filter)
                          </button>
                        </>
                      : `All events · Last ${audit.length}`}
                  </div>
                  <button className="v2-btn v2-btn-sm" onClick={exportCSV}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                    <Download size={10}/> Export CSV
                  </button>
                </div>
                {filteredAudit.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px', fontSize:12,
                    color:'#b0a8a0' }}>
                    No audit events{auditFilter ? ` for ${auditFilter}` : ''} yet.
                  </div>
                ) : (
                  filteredAudit.map(e => <AuditRow key={e.id} entry={e}/>)
                )}
              </div>
            )}
          </>
        )}

        {/* Rotate confirm modal */}
        {rotateConfirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(240,237,232,0.5)', zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div style={{ background:'var(--v2-surface)', borderRadius:12, width:'100%',
              maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#ffffff' }}>
                  Rotate key for {rotateConfirm.domain}?
                </div>
                <div style={{ fontSize:11, color:'#b0a8a0', marginTop:3 }}>
                  A new certificate and key will be issued and deployed automatically
                </div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ background:'transparent', border:'0.5px solid rgba(192,57,43,0.3)', borderRadius:8,
                  padding:'10px 12px', marginBottom:14, fontSize:11, color:'#e8e0d8' }}>
                  <CheckCircle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
                  <strong>Zero downtime</strong> — new cert installs before old key is archived.
                  30-day rollback window.
                </div>
                <div style={{ fontSize:13, color:'#e8e0d8', lineHeight:1.6 }}>
                  This dispatches a renew job to your agent for <strong>{rotateConfirm.domain}</strong>.
                  The old key will be archived immediately after the new key is stored in the vault.
                </div>
              </div>
              <div style={{ padding:'12px 20px', borderTop:'0.5px solid var(--v2-border)',
                display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="v2-btn v2-btn-sm" onClick={() => setRotateConfirm(null)}>
                  Cancel
                </button>
                <button onClick={() => handleRotate(rotateConfirm)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 16px',
                    background:'linear-gradient(135deg,#f07059,#C45A4A)',
                    color:'#ffffff', border:'none', borderRadius:7, fontSize:12,
                    fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  <RotateCcw size={12}/> Rotate now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
