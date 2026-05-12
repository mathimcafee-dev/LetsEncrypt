import { useState, useEffect } from 'react'
import { User, Mail, Bell, Shield, Trash2, LogOut, Check, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SettingsPage({ user }) {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [alertDays,   setAlertDays]   = useState([30, 14, 7])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  const email     = user?.email || ''
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  // Load settings on mount
  useEffect(() => {
    if (!user) return
    supabase.from('user_settings').select('email_alerts, alert_days')
      .eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setEmailAlerts(data.email_alerts)
          setAlertDays(data.alert_days || [30, 14, 7])
        }
        setLoading(false)
      })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('user_settings').upsert({
      user_id:      user.id,
      email_alerts: emailAlerts,
      alert_days:   alertDays,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const toggleDay = (d) => {
    setAlertDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a,b) => b - a)
    )
  }

  const handleSignOut = async () => { await supabase.auth.signOut() }

  const Section = ({ title, children }) => (
    <div style={{ background: 'white', border: '0.5px solid #e8edf2', borderRadius: 8,
      overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '11px 18px', borderBottom: '0.5px solid #f1f5f9',
        fontSize: 10, fontWeight: 600, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '.5px' }}>{title}</div>
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  )

  const Row = ({ label, desc, children, last }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid #f8fafc' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', marginBottom: 1 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</div>}
      </div>
      {children}
    </div>
  )

  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: on ? '#0e7fc0' : '#e2e8f0', position: 'relative',
        transition: 'background .18s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: 'white', transition: 'left .18s',
        boxShadow: '0 1px 3px rgba(0,0,0,.15)' }}/>
    </button>
  )

  if (loading) return (
    <div style={{ padding: '48px 28px', display: 'flex', alignItems: 'center', gap: 8,
      color: '#94a3b8', fontSize: 13 }}>
      <RefreshCw size={14} className="spin"/> Loading preferences…
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '24px 28px 60px', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
      maxWidth: 640 }}>

      {/* Account */}
      <Section title="Account">
        <Row label="Email address" desc="Your sign-in email">
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: "'SF Mono',monospace" }}>{email}</span>
        </Row>
        <Row label="Member since">
          <span style={{ fontSize: 12, color: '#64748b' }}>{createdAt}</span>
        </Row>
        <Row label="Plan" desc="Free for personal and indie use" last>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1',
            background: '#eff6ff', border: '0.5px solid #bfdbfe',
            borderRadius: 4, padding: '3px 8px' }}>Free</span>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Email notifications">
        <Row label="Expiry alerts" desc="Email before certificates expire">
          <Toggle on={emailAlerts} onClick={() => setEmailAlerts(v => !v)}/>
        </Row>

        {/* Alert thresholds */}
        <div style={{ paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            Alert me when a certificate is within:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[30, 14, 7].map(d => (
              <button key={d} onClick={() => toggleDay(d)}
                disabled={!emailAlerts}
                style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: emailAlerts ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  opacity: emailAlerts ? 1 : 0.4, transition: 'all 0.15s',
                  background: alertDays.includes(d) ? '#eff6ff' : '#f8fafc',
                  color: alertDays.includes(d) ? '#0369a1' : '#94a3b8',
                  border: alertDays.includes(d) ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        <Row label="Renewal confirmations" desc="Email when a certificate is auto-renewed" last>
          <Toggle on={true} onClick={() => {}}/>
        </Row>
      </Section>

      {/* Security */}
      <Section title="Security">
        <Row label="Authentication" desc="Managed via Supabase Auth">
          <span style={{ fontSize: 11, color: '#64748b' }}>Magic link</span>
        </Row>
        <Row label="Private key storage" desc="AES-256-GCM encrypted at rest" last>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 500, color: '#0369a1' }}>
            <Shield size={11}/> Encrypted
          </span>
        </Row>
      </Section>

      {/* Actions */}
      <Section title="Account actions">
        <Row label="Sign out" desc="Sign out on this device">
          <button onClick={handleSignOut}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'white', color: '#64748b', border: '0.5px solid #e2e8f0',
              borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={11}/> Sign out
          </button>
        </Row>
        <Row label="Delete account" desc="Permanently delete your account and all data" last>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'white', color: '#dc2626', border: '0.5px solid #fecaca',
            borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit' }}>
            <Trash2 size={11}/> Delete account
          </button>
        </Row>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
            background: saving ? '#e2e8f0' : saved ? '#16a34a' : '#0e7fc0',
            color: saving ? '#94a3b8' : 'white', border: 'none', borderRadius: 6,
            padding: '9px 20px', fontSize: 12, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 0.2s' }}>
          {saving
            ? <><RefreshCw size={12} className="spin"/> Saving…</>
            : saved
            ? <><Check size={12}/> Saved</>
            : 'Save preferences'}
        </button>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
