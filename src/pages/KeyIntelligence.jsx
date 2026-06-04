// KeyIntelligence.jsx — CertVault + CertBind merged into one page
// 4 tabs: Vault | Bind check | Archive | Audit log
// Zero breaking changes — all logic from both pages preserved exactly
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Lock, RefreshCw, Eye, EyeOff, Copy, Check, Activity,
  RotateCcw, Clock, Trash2, Shield, AlertTriangle,
  CheckCircle, CheckCircle2, ChevronDown, ChevronUp,
  Download, ArrowRight, Bell, Server, Globe, Play, XCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

// ── Tab accent colours ────────────────────────────────────────────────
const TAB_COLORS = {
  vault:   { color: '#0077b6', bg: 'rgba(0,119,182,0.09)',    border: 'rgba(0,119,182,0.25)'   },
  bind:    { color: '#00a550', bg: 'rgba(0,165,80,0.12)',  border: 'rgba(0,165,80,0.25)'  },
  archive: { color: '#9a6400', bg: 'rgba(154,100,0,0.12)',  border: 'rgba(251,191,36,0.35)'  },
  audit:   { color: '#0077b6', bg: 'rgba(0,119,182,0.07)',    border: 'rgba(0,119,182,0.2)'    },
}

// ── Helpers ───────────────────────────────────────────────────────────
async function callCertVault(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/certvault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}
async function callCertBind(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB_URL}/functions/v1/certbind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM d, yyyy') : '—'
const fmtAgo  = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—'
function fmtChecked(iso) {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
function fmtExpiry(iso) {
  if (!iso) return null
  const days = Math.ceil((new Date(iso) - Date.now()) / 86400000)
  const date = new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return { date, days, urgent: days < 30 }
}
function statusColor(s) {
  return { active: '#111111', archived: '#111111', revoked: '#0077b6' }[s] || '#aaaaaa'
}
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth <= bp : false)
  useEffect(() => { const h = () => setM(window.innerWidth <= bp); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [bp])
  return m
}

// ── CertBind status map ───────────────────────────────────────────────
const STATUS_MAP = {
  bound:          { label: 'Live',        color: '#00a550', bg: 'rgba(0,165,80,0.09)',   border: 'rgba(0,165,80,0.22)',  icon: CheckCircle2, dot: '#00a550',              priority: 0 },
  key_mismatch:   { label: 'Key mismatch',color: '#0077b6', bg: 'rgba(192,57,43,0.07)',  border: 'rgba(192,57,43,0.2)', icon: XCircle,      dot: '#0077b6',              priority: 3 },
  cert_mismatch:  { label: 'Wrong cert',  color: '#0077b6', bg: 'rgba(192,57,43,0.07)',  border: 'rgba(192,57,43,0.2)', icon: XCircle,      dot: '#0077b6',              priority: 3 },
  chain_anomaly:  { label: 'Chain issue', color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle,dot: '#9a6400',              priority: 2 },
  partial_deploy: { label: 'Partial',     color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle,dot: '#9a6400',              priority: 2 },
  unreachable:    { label: 'Unreachable', color: '#9a6400', bg: 'rgba(184,120,0,0.07)',   border: 'rgba(184,120,0,0.2)', icon: AlertTriangle,dot: '#9a6400',              priority: 2 },
  pending:        { label: 'Checking',    color: '#888888', bg: 'rgba(0,0,0,0.04)', border: '#cccccc',icon: Clock,        dot: '#b0a8a0',              priority: 1 },
  null:           { label: 'Not checked', color: '#888888', bg: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.07)', icon: Clock,        dot: '#aaaaaa',priority: 1 },
}
function getStatus(s) { return STATUS_MAP[s] || STATUS_MAP['null'] }

function PulseDot({ color, animate }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
      {animate && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'pulse-ring 1.5s ease-in-out infinite' }} />}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  )
}

// ── Entropy dot visualiser ────────────────────────────────────────────
const ENTROPY_COLORS = ['#00a550','#00a550','#86efac','#9a6400','#f97316','#fb923c','#0077b6','#ef4444','#fca5a5','#818cf8','#a78bfa','#38bdf8','#67e8f9','#0077b6','#0077b6']
function EntropyDots() {
  const N = 36
  const [dots, setDots] = useState(() =>
    Array.from({ length: N }, () => ({ color: ENTROPY_COLORS[Math.floor(Math.random() * ENTROPY_COLORS.length)], opacity: parseFloat((Math.random() * 0.65 + 0.15).toFixed(2)) }))
  )
  useEffect(() => {
    const id = setInterval(() => {
      setDots(prev => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * N)
        next[idx] = { color: ENTROPY_COLORS[Math.floor(Math.random() * ENTROPY_COLORS.length)], opacity: parseFloat((Math.random() * 0.65 + 0.15).toFixed(2)) }
        return next
      })
    }, 90)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'nowrap', overflow: 'hidden', alignItems: 'center' }}>
      {dots.map((d, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: d.color, opacity: d.opacity, transition: 'opacity .15s, background .15s' }} />
      ))}
    </div>
  )
}

// ── RevealModal ───────────────────────────────────────────────────────
function RevealModal({ keyEntry, userEmail, onClose }) {
  const [step, setStep] = useState('auth')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [pem, setPem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchErr, setFetchErr] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  const verifyPassword = async (e) => {
    e?.preventDefault()
    if (!password.trim()) return
    if (attempts >= 3) return
    setVerifying(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: userEmail, password: password.trim() })
      if (error) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= 3) { setAuthError('Too many failed attempts. Access locked.') }
        else { setAuthError(`Incorrect password. ${3 - next} attempt${3 - next !== 1 ? 's' : ''} remaining.`) }
      } else { setStep('key'); fetchKey() }
    } catch { setAuthError('Verification failed. Try again.') }
    setVerifying(false)
  }

  const fetchKey = async () => {
    setLoading(true)
    setFetchErr('')
    try {
      const res = await callCertVault('fetch', { key_id: keyEntry.id, triggered_by: 'user_reveal' })
      if (res.error) throw new Error(res.error)
      if (res.pem) {
        setPem(res.pem)
        timerRef.current = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); setPem(null); onClose(); return 0 } return c - 1 }), 1000)
      } else throw new Error('No key data returned')
    } catch (e) { setFetchErr(e.message || 'Failed to retrieve key') }
    setLoading(false)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const locked = attempts >= 3
  const M = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
  const W = { background: '#f0f4fa', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, width: '100%', maxWidth: 480, overflow: 'hidden' }

  if (step === 'auth') return (
    <div style={M}>
      <div style={W}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Reveal private key</div>
            <div style={{ fontSize: 11, color: '#888888', marginTop: 2, fontFamily: 'monospace' }}>{keyEntry.domain}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', fontSize: 20 }}>×</button>
        </div>
        <form onSubmit={verifyPassword} style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: '#333333', marginBottom: 14, lineHeight: 1.6 }}>
            This is a high-security action. Re-enter your SSLVault password to confirm.
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Password</label>
            <input ref={inputRef} type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={locked}
              placeholder="Your SSLVault password"
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 7, background: '#f0f4fa', border: `1px solid ${authError ? '#c0392b' : 'rgba(0,0,0,0.12)'}`, color: '#111111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            {authError && <div style={{ fontSize: 11, color: '#0077b6', marginTop: 5 }}>{authError}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7, background: 'rgba(0,0,0,0.06)', color: '#333333', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={verifying || locked} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 7, background: locked ? 'rgba(0,0,0,0.04)' : '#0077b6', color: '#fff', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {verifying ? <><RefreshCw size={11} style={{ animation: 'spin .7s linear infinite' }} /> Verifying…</> : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div style={M}>
      <div style={W}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Private key — {keyEntry.domain}</div>
            {pem && <div style={{ fontSize: 11, color: '#0077b6', marginTop: 2 }}>Auto-closes in {countdown}s</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '24px 0', color: '#888888', fontSize: 12 }}><RefreshCw size={16} style={{ animation: 'spin .7s linear infinite', display: 'block', margin: '0 auto 10px' }} />Decrypting from vault…</div>}
          {fetchErr && <div style={{ fontSize: 12, color: '#0077b6', padding: '12px 0' }}>{fetchErr}</div>}
          {pem && (
            <>
              <div style={{ position: 'relative', background: '#000', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: '#00a550', maxHeight: 200, overflow: 'auto', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{pem}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => { navigator.clipboard.writeText(pem); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, fontWeight: 600, borderRadius: 7, background: '#0077b6', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy key</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AuditRow ──────────────────────────────────────────────────────────
const auditColors = { reveal: '#818cf8', rotate: '#9a6400', archive: '#0077b6', create: '#00a550' }
function AuditRow({ entry }) {
  const color = auditColors[entry.action] || '#b0a8a0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Activity size={12} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500, color: '#111111' }}>{entry.domain}</span>
        <span style={{ color: '#888888', marginLeft: 8 }}>{entry.action} · via {entry.triggered_by}</span>
      </div>
      <div style={{ fontSize: 11, color: '#888888', flexShrink: 0 }}>{fmtAgo(entry.created_at)}</div>
    </div>
  )
}

// ── KeyCard ───────────────────────────────────────────────────────────
function KeyCard({ keyEntry, onRotate, rotating, onReveal, onViewAudit }) {
  const [open, setOpen] = useState(false)
  const days = keyEntry.expires_at ? differenceInDays(new Date(keyEntry.expires_at), new Date()) : null
  const isExpiringSoon = days !== null && days < 30
  const totalDays = keyEntry.expires_at && keyEntry.created_at ? differenceInDays(new Date(keyEntry.expires_at), new Date(keyEntry.created_at)) : null
  const usedDays = keyEntry.created_at ? differenceInDays(new Date(), new Date(keyEntry.created_at)) : 0
  const lifetimePct = totalDays && totalDays > 0 ? Math.min(100, Math.round((usedDays / totalDays) * 100)) : null
  const accentColor = keyEntry.status === 'archived' ? '#b0a8a0' : isExpiringSoon ? '#0077b6' : '#00a550'

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden', position: 'relative', transition: 'border-color .15s', ...(open ? { borderColor: 'rgba(0,119,182,0.25)' } : {}) }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accentColor, borderRadius: '3px 0 0 3px' }} />
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 12px 20px', cursor: 'pointer', userSelect: 'none', background: open ? 'rgba(0,0,0,0.02)' : 'transparent', transition: 'background .15s' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', fontFamily: '"JetBrains Mono","Menlo",monospace' }}>{keyEntry.domain}</span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: accentColor, background: `${accentColor}15`, border: `0.5px solid ${accentColor}40`, borderRadius: 4, padding: '2px 7px' }}>{keyEntry.status}</span>
          {keyEntry.status === 'active' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#0077b6', background: 'rgba(0,119,182,0.08)', border: '1px solid rgba(0,119,182,0.25)', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              <Lock size={8} /> VAULT SECURED
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#888888' }}>{keyEntry.algorithm || 'RSA'} · {keyEntry.key_size || 2048}-bit</span>
          {days !== null && <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>{days}d</span>}
          {open ? <ChevronUp size={13} color="#b0a8a0" /> : <ChevronDown size={13} color="#b0a8a0" />}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '16px 16px 16px 20px' }}>
          {isExpiringSoon && keyEntry.status === 'active' && (
            <div style={{ background: 'rgba(0,119,182,0.06)', border: '1px solid rgba(0,119,182,0.15)', borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: '#0077b6' }}>
              <AlertTriangle size={11} style={{ verticalAlign: '-1px', marginRight: 5 }} /><strong>Expiring in {days} days</strong> — rotate now.
            </div>
          )}
          <div style={{ background: '#f0f4fa', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Lock size={13} color="#b0a8a0" style={{ flexShrink: 0 }} />
            <EntropyDots />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: '#888888', fontFamily: '"JetBrains Mono",monospace', flexShrink: 0 }}>ENCRYPTED</span>
          </div>
          {lifetimePct !== null && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888888', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Issued {fmtDate(keyEntry.created_at)}</span>
                <span style={{ color: accentColor }}>{days !== null ? `${days}d left · ` : ''}{keyEntry.expires_at ? `Expires ${fmtDate(keyEntry.expires_at)}` : ''}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: 3, borderRadius: 2, width: `${lifetimePct}%`, background: accentColor }} />
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Last accessed', value: keyEntry.last_accessed_at ? fmtAgo(keyEntry.last_accessed_at) : 'Never' },
              { label: 'Rotations', value: keyEntry.rotation_count ?? 0 },
              { label: 'Key size', value: `${keyEntry.key_size || 2048} bit` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '9px 12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>{String(value)}</div>
              </div>
            ))}
          </div>
          {keyEntry.status === 'active' && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button onClick={() => onReveal(keyEntry)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', background: '#0077b6', color: '#fff', border: 'none', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = '#0091d6'} onMouseLeave={e => e.currentTarget.style.background = '#0077b6'}>
                <Eye size={11} /> Reveal key
              </button>
              <button onClick={() => onRotate(keyEntry)} disabled={rotating === keyEntry.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(0,0,0,0.06)', color: '#333333', border: '1px solid rgba(0,0,0,0.1)', transition: 'all .15s', opacity: rotating === keyEntry.id ? 0.5 : 1 }}>
                {rotating === keyEntry.id ? <><RefreshCw size={10} style={{ animation: 'spin .8s linear infinite' }} /> Rotating…</> : <><RotateCcw size={10} /> Rotate key</>}
              </button>
              <button onClick={() => onViewAudit(keyEntry.domain)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(0,0,0,0.06)', color: '#333333', border: '1px solid rgba(0,0,0,0.1)', transition: 'all .15s' }}>
                <Activity size={10} /> View audit
              </button>
            </div>
          )}
          {keyEntry.status === 'archived' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#888888', flex: 1 }}><Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Archived {fmtAgo(keyEntry.archived_at)} · Auto-deleted 30 days after archiving</div>
              <button onClick={() => onViewAudit(keyEntry.domain)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', background: 'rgba(0,0,0,0.06)', color: '#333333', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
                <Activity size={10} /> View audit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── BindRow ───────────────────────────────────────────────────────────
function BindRow({ cert, onCheck, checking }) {
  const s = getStatus(cert.certbind_status)
  const Icon = s.icon
  const isChecking = checking === cert.id
  const expiry = fmtExpiry(cert.expires_at)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 120px 100px 110px 90px', alignItems: 'center', gap: 0, padding: '0 18px', height: 54, borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background .12s', background: cert.certbind_status && cert.certbind_status !== 'bound' ? 'rgba(248,113,113,0.03)' : 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = cert.certbind_status && cert.certbind_status !== 'bound' ? 'rgba(248,113,113,0.03)' : 'transparent'}>
      <div style={{ display: 'flex', alignItems: 'center' }}><PulseDot color={s.dot} animate={cert.certbind_status === 'bound'} /></div>
      <div style={{ paddingRight: 14, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.domain}</div>
        <div style={{ fontSize: 11, color: '#888888', marginTop: 1 }}>
          {cert.issuer || 'RapidSSL'}
          {expiry && <span style={{ marginLeft: 8, color: expiry.urgent ? '#9a6400' : '#b0a8a0' }}>· expires {expiry.date}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#888888', display: 'flex', alignItems: 'center', gap: 5 }}>
        {cert.install_method === 'agent'  && <><Server size={10} /> VPS agent</>}
        {cert.install_method === 'cpanel' && <><Globe  size={10} /> cPanel</>}
        {!cert.install_method             && <span style={{ color: 'rgba(0,0,0,0.09)' }}>—</span>}
      </div>
      <div style={{ fontSize: 11, color: '#888888' }}>{fmtChecked(cert.certbind_checked_at)}</div>
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>
          {isChecking ? <RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={9} />}
          {isChecking ? 'Checking…' : s.label}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => !isChecking && onCheck(cert)} disabled={isChecking}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: isChecking ? 'rgba(0,0,0,0.03)' : 'rgba(0,165,80,0.09)', color: isChecking ? '#aaaaaa' : '#00a550', border: `1px solid ${isChecking ? 'rgba(0,0,0,0.05)' : 'rgba(0,165,80,0.25)'}`, fontSize: 10, fontWeight: 600, cursor: isChecking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          <RefreshCw size={9} /> Run check
        </button>
      </div>
    </div>
  )
}

// ══ MAIN PAGE ══════════════════════════════════════════════════════════
export default function KeyIntelligence({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const { isPro, loading: planLoading } = usePlan(user)

  // Vault state
  const [keys,          setKeys]          = useState([])
  const [audit,         setAudit]         = useState([])
  const [vaultLoading,  setVaultLoading]  = useState(true)
  const [rotating,      setRotating]      = useState(null)
  const [rotateConfirm, setRotateConfirm] = useState(null)
  const [rotateError,   setRotateError]   = useState('')
  const [rotateSuccess, setRotateSuccess] = useState('')
  const [auditFilter,   setAuditFilter]   = useState(null)
  const [revealKey,     setRevealKey]     = useState(null)

  // Bind state
  const [bindCerts,     setBindCerts]     = useState([])
  const [agents,        setAgents]        = useState([])
  const [bindLoading,   setBindLoading]   = useState(true)
  const [checking,      setChecking]      = useState(null)
  const [running,       setRunning]       = useState(false)
  const [lastRefresh,   setLastRefresh]   = useState(null)

  // Shared
  const [tab, setTab] = useState('vault')

  // ── Load vault data ──────────────────────────────────────────────
  const loadVault = useCallback(async () => {
    setVaultLoading(true)
    const data = await callCertVault('list')
    setKeys(data.keys   || [])
    setAudit(data.audit || [])
    setVaultLoading(false)
  }, [])

  // ── Load bind data ───────────────────────────────────────────────
  const loadBind = useCallback(async (uid) => {
    if (!uid) return
    setBindLoading(true)
    const [{ data: certsData }, { data: agentsData }] = await Promise.all([
      supabase.from('certificates').select('id,domain,status,install_method,certbind_status,certbind_checked_at,issued_at,expires_at,issuer').eq('user_id', uid).eq('status', 'active').order('issued_at', { ascending: false }),
      supabase.from('persistent_agents').select('id,nickname,hostname,status,last_seen_at').eq('user_id', uid),
    ])
    const domainMap = {}
    for (const c of (certsData || [])) {
      if (!domainMap[c.domain] || new Date(c.issued_at) > new Date(domainMap[c.domain].issued_at)) domainMap[c.domain] = c
    }
    setBindCerts(Object.values(domainMap))
    setAgents(agentsData || [])
    setLastRefresh(new Date())
    setBindLoading(false)
  }, [])

  useEffect(() => {
    if (!user || planLoading) return
    loadVault()
    loadBind(user.id)
  }, [user?.id, planLoading, loadVault, loadBind])

  const handleRefresh = () => { loadVault(); loadBind(user?.id) }

  // ── Rotate ───────────────────────────────────────────────────────
  const handleRotate = async (keyEntry) => {
    setRotateConfirm(null)
    setRotateError(''); setRotateSuccess('')
    setRotating(keyEntry.id)
    try {
      const { data: cert } = await supabase.from('certificates').select('id,domain,dns_provider_id,install_method').eq('keylocker_key_id', keyEntry.id).eq('user_id', user.id).maybeSingle()
      if (!cert) {
        const res = await callCertVault('archive', { key_id: keyEntry.id })
        if (res.error) throw new Error(res.error)
        setRotateSuccess(`Key for ${keyEntry.domain} archived. Issue a new certificate to replace it.`)
        await loadVault(); return
      }
      const { data: { session } } = await supabase.auth.getSession()
      const renewRes = await fetch(`${SB_URL}/functions/v1/agent-daemon`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action: 'dispatch_job', job_type: 'renew', cert_id: cert.id, domain: cert.domain, user_id: user.id, force: true }) })
      const renewData = await renewRes.json()
      if (renewData.error) throw new Error(renewData.error)
      setRotateSuccess(`Rotation dispatched for ${keyEntry.domain}. New cert will be issued and key replaced. Old key archived for 30-day rollback.`)
      await loadVault()
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many')) setRotateError(`Rate limit reached for ${keyEntry.domain}. Try again in a few days.`)
      else setRotateError(`Rotation failed: ${msg}`)
    }
    setRotating(null)
  }

  // ── Bind check ───────────────────────────────────────────────────
  const runCheck = async (cert) => {
    setChecking(cert.id)
    try {
      const d = await callCertBind('request_bind_check', { user_id: user?.id, cert_id: cert.id })
      if (d.ok && d.binding_status) setBindCerts(prev => prev.map(c => c.id === cert.id ? { ...c, certbind_status: d.binding_status, certbind_checked_at: new Date().toISOString() } : c))
      else await loadBind(user?.id)
    } catch { await loadBind(user?.id) }
    setChecking(null)
  }

  const runAllChecks = async () => {
    setRunning(true)
    for (const cert of bindCerts) {
      setChecking(cert.id)
      try {
        const d = await callCertBind('request_bind_check', { user_id: user?.id, cert_id: cert.id })
        if (d.ok && d.binding_status) setBindCerts(prev => prev.map(c => c.id === cert.id ? { ...c, certbind_status: d.binding_status, certbind_checked_at: new Date().toISOString() } : c))
      } catch {}
      setChecking(null)
    }
    setRunning(false); setLastRefresh(new Date())
  }

  const handleViewAudit = (domain) => { setAuditFilter(domain); setTab('audit') }
  const exportCSV = () => {
    const rows = [['Domain', 'Action', 'Triggered by', 'Date']]
    const filtered = auditFilter ? audit.filter(e => e.domain === auditFilter) : audit
    filtered.forEach(e => rows.push([e.domain, e.action, e.triggered_by, e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd HH:mm') : '']))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `keyintel-audit-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  // ── Derived ──────────────────────────────────────────────────────
  const activeKeys    = keys.filter(k => k.status === 'active')
  const archivedKeys  = keys.filter(k => k.status === 'archived')
  const filteredAudit = auditFilter ? audit.filter(e => e.domain === auditFilter) : audit
  const bindLive      = bindCerts.filter(c => c.certbind_status === 'bound').length
  const bindAlerts    = bindCerts.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy','unreachable'].includes(c.certbind_status)).length
  const sortedBind    = [...bindCerts].sort((a, b) => getStatus(b.certbind_status).priority - getStatus(a.certbind_status).priority)
  const onlineAgents  = agents.filter(a => a.last_seen_at && (Date.now() - new Date(a.last_seen_at).getTime()) < 12 * 60 * 1000).length

  // ── Auth guards ──────────────────────────────────────────────────
  if (authLoading || planLoading) return (
    <div className="v2-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <RefreshCw size={20} style={{ animation: 'spin .8s linear infinite' }} color="var(--v2-text-3)" />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!user) return (
    <div className="v2-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ width: 48, height: 48, background: '#f0f4fa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Lock size={22} color="white" /></div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111111', marginBottom: 8 }}>Sign in to access Key Intelligence</div>
        <button className="v2-btn v2-btn-primary" style={{ padding: '10px 22px', fontSize: 14 }} onClick={() => nav('/auth')}>Sign in <ArrowRight size={13} /></button>
      </div>
    </div>
  )

  const tc = TAB_COLORS[tab]

  return (
    <div className="v2-page">
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes dotpulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes pulse-ring{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(2.4);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {revealKey && <RevealModal keyEntry={revealKey} userEmail={user?.email} onClose={() => { setRevealKey(null); loadVault() }} />}

      <div className="v2-container" style={{ maxWidth: 960, padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: '#0077b6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -3, borderRadius: 14, border: '1px solid rgba(0,119,182,0.25)' }} />
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className="v2-h1">Key Intelligence</h1>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(0,119,182,0.2)', border: '1px solid rgba(0,119,182,0.3)', borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRO</span>
              </div>
              <p style={{ fontSize: 12, color: '#888888', marginTop: 2 }}>
                {user.email} · {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''} · {bindLive} verified live
              </p>
            </div>
          </div>
          <button onClick={handleRefresh} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:11, fontWeight:600, borderRadius:7, border:'1px solid rgba(0,0,0,0.15)', background:'#ffffff', color:'#444444', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {/* Security strip */}
        <div style={{ background: 'rgba(0,119,182,0.06)', border: '1px solid rgba(0,119,182,0.15)', borderRadius: 9, padding: '10px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0, width: 8, height: 8 }}>
            <div style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', background: 'rgba(0,165,80,0.12)', animation: 'dotpulse 2s ease infinite' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00a550', position: 'relative' }} />
          </div>
          <div style={{ fontSize: 11, color: '#0077b6', fontWeight: 500 }}>
            AES-256-GCM encrypted · Envelope key hierarchy · Immutable audit log · Keys never stored in plaintext
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Active keys',   val: activeKeys.length,   color: '#0077b6' },
            { label: 'Verified live', val: bindLive,            color: '#00a550' },
            { label: 'Archived keys', val: archivedKeys.length, color: '#9a6400' },
            { label: 'Bind alerts',   val: bindAlerts,          color: bindAlerts > 0 ? '#0077b6' : '#b0a8a0' },
            { label: 'Encryption',    val: 'AES-256',           color: '#0077b6' },
          ].map(({ label, val, color }) => (
            <div key={label} className="v2-card" style={{ padding: '11px 13px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{val}</div>
              <div style={{ fontSize: 10, color: '#888888', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Banners */}
        {rotateError && (
          <div style={{ background: 'rgba(0,119,182,0.09)', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0077b6' }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}>{rotateError}</span>
            <button onClick={() => setRotateError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0077b6', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}
        {rotateSuccess && (
          <div style={{ background: 'transparent', border: '1px solid rgba(0,165,80,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#00a550' }}>
            <CheckCircle size={13} style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}>{rotateSuccess}</span>
            <button onClick={() => setRotateSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00a550', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Tab bar — bright distinct colours per tab */}
        <div style={{ display: 'flex', gap: 1, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 20 }}>
          {[
            { key: 'vault',   label: 'Vault',      count: activeKeys.length,   icon: Lock,         color: TAB_COLORS.vault.color   },
            { key: 'bind',    label: 'Bind check',  count: bindCerts.length,    icon: CheckCircle2, color: TAB_COLORS.bind.color    },
            { key: 'archive', label: 'Archive',     count: archivedKeys.length, icon: Clock,        color: TAB_COLORS.archive.color },
            { key: 'audit',   label: 'Audit log',   count: audit.length,        icon: Activity,     color: TAB_COLORS.audit.color   },
          ].map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'audit') setAuditFilter(null) }}
                style={{ padding: '9px 16px', fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', background: active ? `${t.color}10` : 'none', border: 'none', borderBottom: active ? `2.5px solid ${t.color}` : '2.5px solid transparent', color: active ? t.color : '#b0a8a0', marginBottom: '-0.5px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: active ? '8px 8px 0 0' : 0, transition: 'all .15s' }}>
                <t.icon size={12} />
                {t.label}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: active ? `${t.color}20` : 'rgba(0,0,0,0.05)', color: active ? t.color : '#b0a8a0' }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ── VAULT TAB ── */}
        {tab === 'vault' && (
          vaultLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#888888' }}>
              <RefreshCw size={22} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 10px', display: 'block' }} />Loading vault…
            </div>
          ) : activeKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Lock size={32} color="var(--v2-text-3)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: '#333333', marginBottom: 6 }}>Vault is empty</div>
              <div style={{ fontSize: 12, color: '#888888', maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>Issue a certificate to automatically store its private key here.</div>
              <button className="v2-btn v2-btn-primary" onClick={() => nav('/buy')}>Issue certificate</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeKeys.map(k => (
                <KeyCard key={k.id} keyEntry={k} onRotate={() => setRotateConfirm(k)} onReveal={setRevealKey} onViewAudit={handleViewAudit} rotating={rotating} />
              ))}
            </div>
          )
        )}

        {/* ── BIND CHECK TAB ── */}
        {tab === 'bind' && (
          <div>
            {bindAlerts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(192,57,43,0.12)', marginBottom: 14 }}>
                <AlertTriangle size={13} color="#f87171" />
                <span style={{ fontSize: 12, color: '#0077b6', fontWeight: 600 }}>{bindAlerts} certificate{bindAlerts !== 1 ? 's' : ''} need attention</span>
              </div>
            )}
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 120px 100px 110px 90px', padding: '0 18px', height: 36, alignItems: 'center', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                {['', 'Domain', 'Install path', 'Checked', 'Status', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</div>
                ))}
              </div>
              {bindLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8, color: '#888888', fontSize: 13 }}>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
                </div>
              ) : bindCerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <Shield size={28} color="rgba(0,0,0,0.07)" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333333', marginBottom: 4 }}>No active certificates</div>
                  <div style={{ fontSize: 11, color: '#888888' }}>Issue your first certificate to start monitoring</div>
                </div>
              ) : (
                sortedBind.map(cert => <BindRow key={cert.id} cert={cert} onCheck={runCheck} checking={checking} />)
              )}
              {!bindLoading && bindCerts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 11, color: '#888888' }}>
                    {lastRefresh ? `Last checked ${lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Not yet checked'}
                    {agents.length > 0 && <span style={{ marginLeft: 12 }}><PulseDot color={onlineAgents > 0 ? '#00a550' : '#b0a8a0'} animate={onlineAgents > 0} /><span style={{ marginLeft: 5 }}>{onlineAgents}/{agents.length} agent{agents.length !== 1 ? 's' : ''} online</span></span>}
                  </div>
                  <button onClick={runAllChecks} disabled={running || !!checking}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: running ? 'rgba(0,165,80,0.07)' : '#00a550', color: running ? '#00a550' : '#0d2010', border: 'none', fontSize: 12, fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {running ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : <><Play size={11} /> Run all checks</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ARCHIVE TAB ── */}
        {tab === 'archive' && (
          vaultLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#888888' }}>
              <RefreshCw size={22} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 10px', display: 'block' }} />Loading…
            </div>
          ) : archivedKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Clock size={32} color="var(--v2-text-3)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: '#333333', marginBottom: 6 }}>No archived keys</div>
              <div style={{ fontSize: 12, color: '#888888', lineHeight: 1.6 }}>After rotation, old keys appear here for 30-day rollback before deletion.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(192,57,43,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 11, color: '#0077b6', marginBottom: 4 }}>
                <AlertTriangle size={11} style={{ verticalAlign: '-1px', marginRight: 5 }} />These keys are retained for 30 days as rollback, then permanently destroyed.
              </div>
              {archivedKeys.map(k => (
                <KeyCard key={k.id} keyEntry={k} onRotate={() => {}} onReveal={setRevealKey} onViewAudit={handleViewAudit} rotating={null} />
              ))}
            </div>
          )
        )}

        {/* ── AUDIT TAB ── */}
        {tab === 'audit' && (
          <div className="v2-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 12, color: '#333333', fontWeight: 500 }}>
                {auditFilter ? <>Audit log for <strong>{auditFilter}</strong><button onClick={() => setAuditFilter(null)} style={{ marginLeft: 8, fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#888888' }}>(clear)</button></> : `All events · ${audit.length} total`}
              </div>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <Download size={10} /> Export CSV
              </button>
            </div>
            {filteredAudit.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', fontSize: 12, color: '#888888' }}>No audit events{auditFilter ? ` for ${auditFilter}` : ''} yet.</div>
            ) : (
              filteredAudit.map(e => <AuditRow key={e.id} entry={e} />)
            )}
          </div>
        )}

        {/* Rotate confirm modal */}
        {rotateConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--v2-surface)', borderRadius: 12, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>Rotate key for {rotateConfirm.domain}?</div>
                <div style={{ fontSize: 11, color: '#888888', marginTop: 3 }}>A new certificate and key will be issued and deployed automatically</div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(0,165,80,0.14)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#00a550' }}>
                  <CheckCircle size={11} style={{ verticalAlign: '-1px', marginRight: 5 }} /><strong>Zero downtime</strong> — new cert installs before old key is archived. 30-day rollback window.
                </div>
                <div style={{ fontSize: 13, color: '#333333', lineHeight: 1.6 }}>This dispatches a renew job for <strong>{rotateConfirm.domain}</strong>. The old key is archived immediately after the new key is stored.</div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => setRotateConfirm(null)}>Cancel</button>
                <button onClick={() => handleRotate(rotateConfirm)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: '#0077b6', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <RotateCcw size={12} /> Rotate now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
