import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, ArrowRight, CheckCircle, Lock, Zap, Server, RefreshCw, AlertTriangle } from 'lucide-react'
import '../styles/design-v2.css'

const NAV = '#0d3c6e'
const ACCENT = '#0e7fc0'

export default function Register({ nav }) {
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ company_name: '', email: '', password: '', confirm: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav('/') })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.company_name || !form.email || !form.password) return setError('All fields are required')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    setError(''); setLoading(true)
    try {
      const { error: signupErr } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { company_name: form.company_name, role: 'sub_reseller' } } })
      if (signupErr) throw signupErr
      let regData = null; let lastErr = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500))
        const { data, error: err } = await supabase.functions.invoke('account-manage', { body: { action: 'self_register', company_name: form.company_name, email: form.email } })
        if (!err && !data?.error) { regData = data; break }
        lastErr = data?.error || err?.message || 'Account setup failed'
      }
      if (!regData) throw new Error(lastErr || 'Account setup failed. Please try again.')
      setStep('pending')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const perks = [
    { Icon: Zap, label: 'Issue certificates in minutes', color: ACCENT },
    { Icon: Server, label: 'Manage all your customers from one dashboard', color: '#15803d' },
    { Icon: Lock, label: 'Private keys never leave customer servers', color: '#0369a1' },
    { Icon: CheckCircle, label: 'Auto-renewal — no expiry surprises', color: '#b45309' },
  ]

  if (step === 'pending') return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 420, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '0.5px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={14} color="white" strokeWidth={2.5} /></div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>SSLVault</span>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <CheckCircle size={26} color="#15803d" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a2332', margin: '0 0 10px' }}>Registration submitted</h2>
        <p style={{ color: '#525252', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
          Your reseller account for <strong style={{ color: '#1a2332' }}>{form.company_name}</strong> is pending approval. We'll notify <strong style={{ color: '#1a2332' }}>{form.email}</strong> once approved.
        </p>
        <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#b45309', marginBottom: 24 }}>
          Typical approval time: within 1 business day
        </div>
        <button onClick={() => nav('/auth')} className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 13 }}>Back to Login</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* Left panel */}
      <div style={{ width: '45%', background: NAV, padding: '48px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: '50%', background: `rgba(14,127,192,0.15)`, transform: 'translate(40%,-40%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 140, borderRadius: '50%', background: `rgba(14,127,192,0.1)`, transform: 'translate(-40%,40%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={16} color="white" strokeWidth={2.5} /></div>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>SSLVault</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 700, lineHeight: 1.2, margin: '0 0 14px', letterSpacing: '-0.5px' }}>Become an SSL reseller</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, margin: '0 0 36px' }}>
            Issue and manage SSL certificates for your customers. Powered by your trusted TSS reseller account.
          </p>
          {perks.map(({ Icon, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={13} color="rgba(255,255,255,0.8)" />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a2332', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Create reseller account</h2>
          <p style={{ color: '#525252', fontSize: 13, margin: '0 0 24px' }}>
            Already have an account?{' '}
            <button onClick={() => nav('/auth')} style={{ color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign in →</button>
          </p>

          <div className="v2-card" style={{ padding: 24 }}>
            {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={13} /> {error}</div>}

            <div style={{ marginBottom: 14 }}>
              <label className="v2-label">Company Name *</label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="WebHost Pro Ltd" className="v2-input" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="v2-label">Business Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@yourcompany.com" className="v2-input" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="v2-label">Password *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" className="v2-input" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="v2-label">Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat password" className="v2-input" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            <button onClick={handleSubmit} disabled={loading} className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }}>
              {loading ? <><RefreshCw size={13} className="spin" /> Creating account…</> : <>Submit registration <ArrowRight size={13} /></>}
            </button>
            <p style={{ color: 'var(--v2-text-3)', fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
              Your account will be reviewed and approved by our team.
            </p>
          </div>
        </div>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
