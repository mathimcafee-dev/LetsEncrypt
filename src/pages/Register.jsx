import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, ArrowRight, CheckCircle } from 'lucide-react'

export default function Register({ nav }) {
  const [step, setStep] = useState('form') // form | pending
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ company_name: '', email: '', password: '', confirm: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav('/')
    })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.company_name || !form.email || !form.password)
      return setError('All fields are required')
    if (form.password !== form.confirm)
      return setError('Passwords do not match')
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters')

    setError(''); setLoading(true)
    try {
      // 1. Create Supabase auth user
      const { data: signupData, error: signupErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signupErr) throw signupErr

      // 2. Create accounts row with status=pending
      const { error: accountErr } = await supabase.functions.invoke('account-manage', {
        body: { action: 'self_register', company_name: form.company_name }
      })
      if (accountErr) throw new Error('Account setup failed. Please try again.')

      setStep('pending')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14,
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  if (step === 'pending') return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={28} color="#10b981" />
        </div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Registration submitted</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Your reseller account for <strong style={{ color: '#fff' }}>{form.company_name}</strong> is pending approval.
          We'll email <strong style={{ color: '#fff' }}>{form.email}</strong> once your account is approved.
        </p>
        <button onClick={() => nav('/auth')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Back to Login
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Left panel */}
      <div style={{ width: '45%', background: 'linear-gradient(160deg, #064e3b, #0f172a)', padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <Shield size={28} color="#10b981" />
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>SSLVault</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 700, lineHeight: 1.3, margin: '0 0 16px' }}>
          Become an SSL reseller
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, margin: '0 0 40px' }}>
          Issue and manage SSL certificates for your customers under your own brand. Powered by SSLVault.
        </p>
        {[
          'Issue certificates in minutes',
          'Manage all your customers from one dashboard',
          'Auto-renewal — no expiry surprises',
          'Full visibility into all orders',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <CheckCircle size={16} color="#10b981" />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Create reseller account</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 28px' }}>
            Already have an account? <button onClick={() => nav('/auth')} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>Sign in →</button>
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Company Name *</label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="WebHost Pro Ltd" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Business Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@yourcompany.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Confirm Password *</label>
            <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#334155' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? 'Creating account...' : <><span>Submit registration</span><ArrowRight size={15} /></>}
          </button>

          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
            Your account will be reviewed and approved by our team.
          </p>
        </div>
      </div>
    </div>
  )
}
