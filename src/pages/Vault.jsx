// Vault.jsx — KeyLocker + CertVault unified
// Design: identical to KeyLocker.jsx — design-v2.css, same inline styles, same colours
import { useState, useEffect, useCallback } from 'react'
import {
  Lock, RefreshCw, Eye, EyeOff, Copy, Check, Activity,
  RotateCcw, Clock, Shield, AlertTriangle, CheckCircle,
  Download, ArrowRight, Bell, ChevronDown, ChevronUp, Zap
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM d, yyyy') : '—'
const fmtAgo  = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—'

async function callKeyLocker(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/keylocker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

async function callCertVault(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/certvault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

// ── Audit row — exact same as KeyLocker ──────────────────────────────
function AuditRow({ entry }) {
  const actionColor = {
    key_created:'#00a550', key_rotated:'#fb923c',
    key_revealed:'#0077b6', key_archived:'#94a3b8',
  }[entry.action] || '#b0a8a0'
  return (
    <div style={{ padding:'9px 16px', borderBottom:'1px solid rgba(0,0,0,0.04)',
      display:'flex', alignItems:'center', gap:12, fontSize:12 }}>
      <Activity size={11} color="#b0a8a0" style={{ flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontWeight:500, color:'#333333', fontFamily:'monospace',
          fontSize:11 }}>{entry.domain}</span>
        <span style={{ color:actionColor, marginLeft:8 }}>{entry.action}</span>
        {entry.triggered_by && (
          <span style={{ color:'#888888', marginLeft:6, fontSize:10 }}>· {entry.triggered_by}</span>
        )}
      </div>
      <div style={{ fontSize:11, color:'#888888', flexShrink:0 }}>{fmtAgo(entry.created_at)}</div>
    </div>
  )
}

// ── Key card — same collapsed/expanded pattern as KeyLocker ──────────
function KeyCard({ keyEntry, certs, onRotate, onReveal, onViewAudit, rotating }) {
  const [open, setOpen] = useState(false)
  const days = keyEntry.expires_at ? differenceInDays(new Date(keyEntry.expires_at), new Date()) : null
  const warn = days !== null && days < 30 && keyEntry.status === 'active'
  const linkedCert = certs?.find(c => c.keylocker_key_id === keyEntry.id)

  const statusColor = { active:'#00a550', archived:'#fb923c', revoked:'#0077b6' }[keyEntry.status] || '#b0a8a0'
  const statusBg    = { active:'rgba(0,165,80,0.07)', archived:'rgba(251,146,60,0.08)', revoked:'rgba(192,57,43,0.07)' }[keyEntry.status] || 'transparent'

  return (
    <div className="v2-card" style={{ overflow:'hidden' }}>
      {/* Collapsed row */}
      <div onClick={() => setOpen(v => !v)} style={{ padding:'12px 16px', cursor:'pointer',
        display:'flex', alignItems:'center', gap:12,
        borderBottom: open ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:statusColor, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'#111111',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {keyEntry.domain}
          </div>
          <div style={{ fontSize:10, color:'#888888', marginTop:2 }}>
            {keyEntry.algorithm || 'RSA 2048'} · created {fmtAgo(keyEntry.created_at)}
            {linkedCert && <span style={{ color:'#00a550', marginLeft:6 }}>· cert linked</span>}
          </div>
        </div>
        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4,
          background:statusBg, color:statusColor, border:`0.5px solid ${statusColor}30`,
          textTransform:'uppercase', letterSpacing:'0.4px', flexShrink:0 }}>
          {keyEntry.status}
        </span>
        {warn && (
          <span style={{ fontSize:10, color:'#0077b6', fontWeight:600, flexShrink:0 }}>
            ⚠ {days}d
          </span>
        )}
        {days !== null && keyEntry.status === 'active' && !warn && (
          <span style={{ fontSize:10, color:'#00a550', flexShrink:0 }}>{days}d left</span>
        )}
        {open ? <ChevronUp size={13} color="#b0a8a0" style={{ flexShrink:0 }}/> : <ChevronDown size={13} color="#b0a8a0" style={{ flexShrink:0 }}/>}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding:'14px 16px' }}>
          {warn && (
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(154,100,0,0.2)',
              borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:11, color:'#0077b6' }}>
              <AlertTriangle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
              <strong>Expiring in {days} days</strong> — rotate now to avoid disruption.
            </div>
          )}

          {/* Metrics */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',
            gap:8, marginBottom:12 }}>
            {[
              { label:'Last accessed', value: keyEntry.last_accessed_at ? fmtAgo(keyEntry.last_accessed_at) : 'Never' },
              { label:'Rotations',     value: keyEntry.rotation_count ?? 0 },
              { label:'Key size',      value: `${keyEntry.key_size || 2048} bit` },
              { label:'Created',       value: fmtDate(keyEntry.created_at) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'var(--v2-surface-3)', borderRadius:7,
                padding:'8px 10px', border:'1px solid var(--v2-border)' }}>
                <div style={{ fontSize:9, fontWeight:600, color:'#888888',
                  textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:500, color:'#111111' }}>{String(value)}</div>
              </div>
            ))}
          </div>

          {/* Linked cert */}
          {linkedCert && (
            <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(0,165,80,0.14)',
              borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:11 }}>
              <Shield size={11} color="#4ade80" style={{ verticalAlign:'-1px', marginRight:5 }}/>
              <strong style={{ color:'#00a550' }}>Linked certificate:</strong>
              <span style={{ color:'#333333', marginLeft:6, fontFamily:'monospace' }}>{linkedCert.domain}</span>
              {linkedCert.expires_at && (
                <span style={{ color:'#888888', marginLeft:8 }}>· expires {fmtDate(linkedCert.expires_at)}</span>
              )}
            </div>
          )}

          {/* Actions */}
          {keyEntry.status === 'active' && (
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              <button onClick={() => onReveal(keyEntry)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
                  fontSize:11, fontWeight:600, borderRadius:7, cursor:'pointer', fontFamily:'inherit',
                  background:'rgba(124,58,237,0.08)', color:'#111111',
                  border:'1px solid rgba(124,58,237,0.25)', transition:'all .15s' }}>
                <Eye size={11}/> Reveal key
              </button>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => onRotate(keyEntry)}
                disabled={rotating === keyEntry.id}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
                  color:'rgba(240,237,232,0.85)', border:'1px solid #bbbbbb' }}>
                {rotating === keyEntry.id
                  ? <><RefreshCw size={10} style={{ animation:'spin .8s linear infinite' }}/> Rotating…</>
                  : <><RotateCcw size={10}/> Rotate key</>}
              </button>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => onViewAudit(keyEntry.domain)}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
                  color:'#444444', border:'1px solid #cccccc' }}>
                <Activity size={10}/> View audit
              </button>
            </div>
          )}
          {keyEntry.status === 'archived' && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:11, color:'#888888', flex:1 }}>
                <Clock size={11} style={{ verticalAlign:'-1px', marginRight:4 }}/>
                Archived {fmtAgo(keyEntry.archived_at)} · Auto-deleted 30 days after archiving
              </div>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => onViewAudit(keyEntry.domain)}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
                  color:'#444444', border:'1px solid #cccccc' }}>
                <Activity size={10}/> View audit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── RevealModal — reused from KeyLocker ──────────────────────────────
function RevealModal({ keyEntry, userEmail, onClose }) {
  const [step, setStep]           = useState('auth')
  const [password, setPassword]   = useState('')
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [attempts, setAttempts]   = useState(0)
  const [pem, setPem]             = useState(null)
  const [loading, setLoading]     = useState(false)
  const [fetchErr, setFetchErr]   = useState('')
  const [countdown, setCountdown] = useState(30)
  const [copied, setCopied]       = useState(false)
  const timerRef = useState(null)
  const locked = attempts >= 3
  const masked = pem ? (pem.substring(0, 60) + '\n' + '·'.repeat(40) + '\n' + '·'.repeat(40) + '\n' + pem.substring(pem.length - 40)) : ''

  const verifyPassword = async (e) => {
    e?.preventDefault()
    if (!password.trim() || locked) return
    setVerifying(true); setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: userEmail, password: password.trim() })
      if (error) {
        const next = attempts + 1; setAttempts(next); setPassword('')
        setAuthError(next >= 3 ? 'Too many failed attempts. Access locked.' : `Incorrect password. ${3 - next} attempt${3 - next !== 1 ? 's' : ''} remaining.`)
        setVerifying(false); return
      }
      setStep('key'); setLoading(true)
      const res = await callCertVault('fetch', { key_id: keyEntry.id, triggered_by: 'user_reveal' })
      if (res.error) { setFetchErr(res.error); setLoading(false); return }
      setPem(res.private_key_pem); setLoading(false)
      const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); onClose(); return 0 } return c - 1 }), 1000)
      timerRef[1](t)
    } catch { setAuthError('Verification failed.'); setVerifying(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(pem)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--v2-surface)', borderRadius:12, width:'100%', maxWidth:420,
        boxShadow:'0 24px 60px rgba(0,0,0,0.5)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'#111111' }}>
              {step === 'auth' ? 'Confirm identity' : 'Private key — handle with care'}
            </div>
            <div style={{ fontSize:11, color:'#888888', marginTop:2, fontFamily:'monospace' }}>
              {keyEntry.domain}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'#888888', fontSize:18, lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px 20px' }}>
          {step === 'auth' && (
            <form onSubmit={verifyPassword}>
              <div style={{ background:'var(--v2-surface-3)', border:'1px solid var(--v2-border)',
                borderRadius:9, padding:'12px 14px', marginBottom:14, fontSize:11,
                color:'#333333', lineHeight:1.6 }}>
                <Lock size={11} style={{ verticalAlign:'-1px', marginRight:5, color:'#111111' }}/>
                Re-enter your SSLVault password to access this private key. This attempt will be logged.
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#333333', display:'block', marginBottom:6 }}>
                  Account password <span style={{ fontSize:10, color:'#888888', fontWeight:400 }}>({userEmail})</span>
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" disabled={locked || verifying}
                  style={{ width:'100%', padding:'10px 12px', fontSize:13, borderRadius:8,
                    border:`1px solid ${authError ? 'rgba(239,83,80,0.3)' : 'var(--v2-border)'}`,
                    background: locked ? 'var(--v2-surface-3)' : 'var(--v2-surface)',
                    color:'#111111', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} autoFocus/>
              </div>
              {authError && (
                <div style={{ background:'rgba(0,119,182,0.09)', border:'1px solid #fecaca', borderRadius:7,
                  padding:'9px 12px', marginBottom:12, fontSize:11, color:'#0077b6',
                  display:'flex', alignItems:'center', gap:7 }}>
                  <AlertTriangle size={12} style={{ flexShrink:0 }}/> {authError}
                </div>
              )}
              {!locked && (
                <button type="submit" disabled={verifying || !password.trim()}
                  style={{ width:'100%', padding:'11px', borderRadius:8, cursor:'pointer',
                    background: verifying||!password.trim() ? 'var(--v2-surface-3)' : '#111111',
                    color: verifying||!password.trim() ? 'var(--v2-text-3)' : '#000000',
                    border:'none', fontSize:13, fontWeight:600, fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {verifying ? <><RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }}/> Verifying…</> : <><Lock size={13}/> Confirm &amp; reveal key</>}
                </button>
              )}
            </form>
          )}
          {step === 'key' && (
            loading ? (
              <div style={{ textAlign:'center', padding:'28px 0', color:'#888888' }}>
                <RefreshCw size={20} style={{ animation:'spin .8s linear infinite', margin:'0 auto 10px', display:'block' }}/>
                <div style={{ fontSize:12 }}>Decrypting from vault…</div>
              </div>
            ) : fetchErr ? (
              <div style={{ background:'rgba(0,119,182,0.09)', border:'1px solid #fecaca', borderRadius:8,
                padding:'12px 14px', fontSize:12, color:'#0077b6' }}>
                <AlertTriangle size={12} style={{ verticalAlign:'-1px', marginRight:6 }}/>{fetchErr}
              </div>
            ) : (
              <>
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(154,100,0,0.2)', borderRadius:8,
                  padding:'9px 12px', marginBottom:12, fontSize:11, color:'#0077b6',
                  display:'flex', alignItems:'center', gap:7 }}>
                  <AlertTriangle size={11} style={{ flexShrink:0 }}/>
                  Never share this key. Do not save unencrypted. This access is logged.
                </div>
                <div style={{ background:'#f0f4fa', borderRadius:9, padding:'14px 16px',
                  marginBottom:12, fontFamily:'monospace', fontSize:11, color:'#888888',
                  lineHeight:1.8, whiteSpace:'pre', userSelect:'none' }}>
                  {masked}
                </div>
                <button onClick={copy} style={{ width:'100%', padding:'11px', borderRadius:8, cursor:'pointer',
                  background: copied ? 'transparent' : '#111111', fontFamily:'inherit',
                  color: copied ? '#00a550' : '#000000',
                  border: copied ? '1px solid rgba(0,119,182,0.2)' : 'none',
                  fontSize:13, fontWeight:600, display:'flex', alignItems:'center',
                  justifyContent:'center', gap:8, transition:'all .2s' }}>
                  {copied ? <><Check size={14}/> Copied to clipboard!</> : <><Copy size={14}/> Copy private key to clipboard</>}
                </button>
                <div style={{ fontSize:10, color:'#888888', textAlign:'center', marginTop:8 }}>
                  Masked display is intentional. Auto-closes in {countdown}s.
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ══ MAIN VAULT PAGE ════════════════════════════════════════════════════
export default function Vault({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const { isPro, loading: planLoading } = usePlan(user)

  const [keys,          setKeys]          = useState([])
  const [certs,         setCerts]         = useState([])
  const [audit,         setAudit]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [rotating,      setRotating]      = useState(null)
  const [rotateConfirm, setRotateConfirm] = useState(null)
  const [rotateError,   setRotateError]   = useState('')
  const [rotateSuccess, setRotateSuccess] = useState('')
  const [tab,           setTab]           = useState('vault')
  const [auditFilter,   setAuditFilter]   = useState(null)
  const [revealKey,     setRevealKey]     = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [keysData, certsData] = await Promise.all([
      callKeyLocker('list'),
      supabase.from('certificates')
        .select('id,domain,status,issued_at,expires_at,keylocker_key_id')
        .eq('user_id', user.id).not('keylocker_key_id', 'is', null),
    ])
    setKeys(keysData.keys   || [])
    setAudit(keysData.audit || [])
    setCerts(certsData.data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user || planLoading) return
    loadData()
  }, [user?.id, isPro, planLoading, loadData])

  const handleRotate = async (keyEntry) => {
    setRotateConfirm(null); setRotateError(''); setRotateSuccess('')
    setRotating(keyEntry.id)
    try {
      const res = await callKeyLocker('rotate', { key_id: keyEntry.id })
      if (res.error) throw new Error(res.error)
      setRotateSuccess(`Key rotated for ${keyEntry.domain}. Old key archived for 30 days.`)
      await loadData()
    } catch (err) { setRotateError('Rotation failed: ' + err.message) }
    setRotating(null)
  }

  const handleViewAudit = (domain) => {
    setAuditFilter(domain); setTab('audit')
  }

  const exportCSV = () => {
    const rows = [['domain','action','triggered_by','created_at'],
      ...(auditFilter ? audit.filter(e=>e.domain===auditFilter) : audit)
        .map(e => [e.domain,e.action,e.triggered_by,e.created_at])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    a.download = 'vault-audit.csv'; a.click()
  }

  if (authLoading || planLoading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={22} style={{ animation:'spin .8s linear infinite' }} color="var(--v2-text-3)"/>
    </div>
  )

  if (!user) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ width:48, height:48, background:'#f0f4fa', borderRadius:12,
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Lock size={22} color="white"/>
        </div>
        <div style={{ fontSize:18, fontWeight:700, color:'#111111', marginBottom:8 }}>Sign in to access Vault</div>
        <button className="v2-btn v2-btn-primary" style={{ padding:'10px 22px', fontSize:14 }} onClick={() => nav('/auth')}>
          Sign in <ArrowRight size={13}/>
        </button>
      </div>
    </div>
  )

  if (!isPro) return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:960, padding:'60px 24px 80px', textAlign:'center' }}>
        <Lock size={36} color="var(--v2-text-3)" style={{ margin:'0 auto 14px', display:'block' }}/>
        <div style={{ fontSize:18, fontWeight:700, color:'#111111', marginBottom:8 }}>Vault requires Pro</div>
        <div style={{ fontSize:13, color:'#888888', maxWidth:400, margin:'0 auto 24px', lineHeight:1.65 }}>
          Encrypted key storage, rotation, and full audit log — available on Pro plan.
        </div>
        <button className="v2-btn v2-btn-primary" onClick={() => nav('/pricing')}>
          <Zap size={13}/> View plans <ArrowRight size={13}/>
        </button>
      </div>
    </div>
  )

  const activeKeys   = keys.filter(k => k.status === 'active')
  const archivedKeys = keys.filter(k => k.status === 'archived')
  const filteredAudit = auditFilter ? audit.filter(e => e.domain === auditFilter) : audit

  return (
    <div className="v2-page">
      {revealKey && (
        <RevealModal keyEntry={revealKey} userEmail={user?.email}
          onClose={() => { setRevealKey(null); loadData() }}/>
      )}

      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10,
              background:'linear-gradient(135deg,#f07059,#C45A4A)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Lock size={18} color="white"/>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h1 className="v2-h1">Vault</h1>
                <span style={{ fontSize:9, fontWeight:700, color:'#111111',
                  background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)',
                  borderRadius:4, padding:'2px 7px', textTransform:'uppercase', letterSpacing:'0.4px' }}>PRO</span>
              </div>
              <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>
                {user.email} · {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
                {archivedKeys.length > 0 && ` · ${archivedKeys.length} archived`}
              </p>
            </div>
          </div>
          <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={loadData}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>

        {/* Security strip */}
        <div style={{ background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.18)',
          borderRadius:9, padding:'12px 16px', marginBottom:20,
          display:'flex', alignItems:'center', gap:10 }}>
          <Lock size={13} color="#0077b6" style={{ flexShrink:0 }}/>
          <div style={{ fontSize:11, color:'#0077b6', fontWeight:500 }}>
            AES-256-GCM encrypted · Envelope key hierarchy · Immutable audit log · Keys never stored in plaintext
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:20 }}>
          {[
            { label:'Active keys',   val: activeKeys.length,   color:'#111111' },
            { label:'Archived',      val: archivedKeys.length, color:'#111111' },
            { label:'Certs linked',  val: certs.length,        color:'#00a550' },
            { label:'Encryption',    val: 'AES-256',           color:'#00a550' },
          ].map(({ label, val, color }) => (
            <div key={label} className="v2-card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color:'#888888', marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Banners */}
        {rotateError && (
          <div style={{ background:'rgba(0,119,182,0.09)', border:'1px solid #fecaca', borderRadius:8,
            padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#0077b6' }}>
            <AlertTriangle size={13} style={{ flexShrink:0 }}/>
            <span style={{ flex:1 }}>{rotateError}</span>
            <button onClick={() => setRotateError('')} style={{ background:'none', border:'none',
              cursor:'pointer', color:'#0077b6', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        )}
        {rotateSuccess && (
          <div style={{ background:'transparent', border:'1px solid rgba(0,119,182,0.2)', borderRadius:8,
            padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#111111' }}>
            <CheckCircle size={13} style={{ flexShrink:0 }}/>
            <span style={{ flex:1 }}>{rotateSuccess}</span>
            <button onClick={() => setRotateSuccess('')} style={{ background:'none', border:'none',
              cursor:'pointer', color:'#111111', fontSize:16, lineHeight:1 }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:1, borderBottom:'1px solid rgba(0,0,0,0.06)', marginBottom:20 }}>
          {[
            { key:'vault',    label:'Vault',     count: activeKeys.length   },
            { key:'archived', label:'Archive',   count: archivedKeys.length },
            { key:'audit',    label:'Audit log', count: audit.length        },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if(t.key!=='audit') setAuditFilter(null) }}
              style={{ padding:'8px 14px', fontSize:12, fontWeight:tab===t.key?500:400,
                cursor:'pointer', fontFamily:'inherit', background:'none', border:'none',
                borderBottom:tab===t.key?'2px solid #2a6b5c':'2px solid transparent',
                color:tab===t.key?'#111111':'var(--v2-text-3)', marginBottom:'-0.5px',
                display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:8,
                background:tab===t.key?'transparent':'var(--v2-surface-3)',
                color:tab===t.key?'#111111':'var(--v2-text-3)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#888888' }}>
            <RefreshCw size={22} style={{ animation:'spin .8s linear infinite', margin:'0 auto 10px', display:'block' }}/>
            Loading vault…
          </div>
        ) : (
          <>
            {tab === 'vault' && (
              activeKeys.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <Lock size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                  <div style={{ fontSize:14, fontWeight:500, color:'#333333', marginBottom:6 }}>Vault is empty</div>
                  <div style={{ fontSize:12, color:'#888888', maxWidth:360, margin:'0 auto 20px', lineHeight:1.6 }}>
                    Issue a certificate to automatically store its key here.
                  </div>
                  <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>Issue certificate</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {activeKeys.map(k => (
                    <KeyCard key={k.id} keyEntry={k} certs={certs}
                      onRotate={() => setRotateConfirm(k)}
                      onReveal={setRevealKey}
                      onViewAudit={handleViewAudit}
                      rotating={rotating}/>
                  ))}
                </div>
              )
            )}

            {tab === 'archived' && (
              archivedKeys.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <Clock size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                  <div style={{ fontSize:14, fontWeight:500, color:'#333333', marginBottom:6 }}>No archived keys</div>
                  <div style={{ fontSize:12, color:'#888888', lineHeight:1.6 }}>
                    After rotation, old keys appear here for 30-day rollback before deletion.
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(154,100,0,0.2)', borderRadius:8,
                    padding:'10px 14px', fontSize:11, color:'#0077b6', marginBottom:4 }}>
                    <AlertTriangle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
                    These keys are retained for 30 days as rollback, then permanently destroyed.
                  </div>
                  {archivedKeys.map(k => (
                    <KeyCard key={k.id} keyEntry={k} certs={certs}
                      onRotate={() => {}} onReveal={setRevealKey}
                      onViewAudit={handleViewAudit} rotating={null}/>
                  ))}
                </div>
              )
            )}

            {tab === 'audit' && (
              <div className="v2-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(0,0,0,0.06)',
                  display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, fontSize:12, color:'#333333', fontWeight:500 }}>
                    {auditFilter
                      ? <><strong>{auditFilter}</strong>
                          <button onClick={() => setAuditFilter(null)} style={{ marginLeft:8, fontSize:10,
                            background:'none', border:'none', cursor:'pointer', color:'#888888' }}>
                            (clear filter)
                          </button>
                        </>
                      : `All events · Last ${audit.length}`}
                  </div>
                  <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={exportCSV}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                    <Download size={10}/> Export CSV
                  </button>
                </div>
                {filteredAudit.length === 0
                  ? <div style={{ textAlign:'center', padding:'32px', fontSize:12, color:'#888888' }}>No audit events yet.</div>
                  : filteredAudit.map(e => <AuditRow key={e.id} entry={e}/>)
                }
              </div>
            )}
          </>
        )}

        {/* Rotate confirm modal — exact same as KeyLocker */}
        {rotateConfirm && (
          <div style={{ position:'fixed', inset:0, background:'#666666', zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div style={{ background:'var(--v2-surface)', borderRadius:12, width:'100%',
              maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#111111' }}>
                  Rotate key for {rotateConfirm.domain}?
                </div>
                <div style={{ fontSize:11, color:'#888888', marginTop:3 }}>
                  A new certificate and key will be issued and deployed automatically
                </div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ background:'transparent', border:'1px solid rgba(0,119,182,0.2)', borderRadius:8,
                  padding:'10px 12px', marginBottom:14, fontSize:11, color:'#333333' }}>
                  <CheckCircle size={11} style={{ verticalAlign:'-1px', marginRight:5 }}/>
                  <strong>Zero downtime</strong> — new cert installs before old key is archived. 30-day rollback window.
                </div>
              </div>
              <div style={{ padding:'12px 20px', borderTop:'1px solid var(--v2-border)',
                display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => setRotateConfirm(null)}>Cancel</button>
                <button onClick={() => handleRotate(rotateConfirm)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 16px',
                    background:'linear-gradient(135deg,#f07059,#C45A4A)',
                    color:'#111111', border:'none', borderRadius:7, fontSize:12,
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
