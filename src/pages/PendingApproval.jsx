import { supabase } from '../lib/supabase'
import { Shield, Clock, LogOut } from 'lucide-react'

export default function PendingApproval({ nav }) {
  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 420, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          <Shield size={20} color="#10b981" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>SSLVault</span>
        </div>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Clock size={28} color="#f59e0b" />
        </div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Account pending approval</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          Your reseller account has been submitted and is currently under review. You'll receive an email once your account is approved.
        </p>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#fcd34d', marginBottom: 28 }}>
          Typical approval time: 1 business day
        </div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', margin: '0 auto' }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  )
}
