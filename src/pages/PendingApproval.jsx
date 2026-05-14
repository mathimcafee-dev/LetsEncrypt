import { supabase } from '../lib/supabase'
import { Shield, Clock, LogOut } from 'lucide-react'
import '../styles/design-v2.css'

const ACCENT = '#0e7fc0'

export default function PendingApproval({ nav }) {
  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '48px 40px', width: '100%', maxWidth: 420, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '0.5px solid rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={14} color="white" strokeWidth={2.5} /></div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>SSLVault</span>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Clock size={26} color="#b45309" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a2332', margin: '0 0 10px' }}>Account pending approval</h2>
        <p style={{ color: '#525252', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>
          Your reseller account has been submitted and is under review. You'll receive an email once your account is approved.
        </p>
        <div className="v2-callout warning" style={{ marginBottom: 28, textAlign: 'left' }}>
          <div className="v2-callout-title">What happens next?</div>
          Our team reviews reseller applications within 1 business day. You'll get an email confirmation when approved.
        </div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--v2-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto' }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  )
}
