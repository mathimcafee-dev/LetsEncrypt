import { useState } from 'react'
import { User, Mail, Bell, Shield, Trash2, LogOut, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SettingsPage({ user }) {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [saved, setSaved] = useState(false)

  const email = user?.email || ''
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : '—'

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const Section = ({ title, children }) => (
    <div style={{ background:'white', border:'0.5px solid #e8edf2', borderRadius:8, overflow:'hidden', marginBottom:12 }}>
      <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #f1f5f9', fontSize:10, fontWeight:500, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'.5px' }}>{title}</div>
      <div style={{ padding:'16px 18px' }}>{children}</div>
    </div>
  )

  const Row = ({ label, desc, children }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'8px 0', borderBottom:'0.5px solid #f1f5f9' }}>
      <div>
        <div style={{ fontSize:12, fontWeight:500, color:'#0a0a0a', marginBottom:2 }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:'#a3a3a3' }}>{desc}</div>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ padding:'24px 28px 60px', fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", maxWidth:680 }}>

      {/* Account */}
      <Section title="Account">
        <Row label="Email address" desc="Your sign-in email">
          <span style={{ fontSize:12, color:'#525252', fontFamily:"'SF Mono',monospace" }}>{email}</span>
        </Row>
        <Row label="Member since" desc="">
          <span style={{ fontSize:12, color:'#525252' }}>{createdAt}</span>
        </Row>
        <Row label="Plan" desc="No payment required for sandbox and community use">
          <span style={{ fontSize:11, fontWeight:500, color:'#047857', background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:4, padding:'3px 8px' }}>Free</span>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Expiry alerts" desc="Get notified when certificates are within 30 days of expiry">
          <button
            onClick={() => setEmailAlerts(v => !v)}
            style={{ width:36, height:20, borderRadius:10, border:'none', cursor:'pointer', background: emailAlerts ? '#10b981' : '#e8edf2', position:'relative', transition:'background .15s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:2, left: emailAlerts ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,.15)' }}/>
          </button>
        </Row>
        <Row label="Renewal confirmations" desc="Email when a certificate is successfully renewed">
          <span style={{ fontSize:11, color:'#a3a3a3' }}>Coming soon</span>
        </Row>
      </Section>

      {/* Security */}
      <Section title="Security">
        <Row label="Authentication" desc="Managed via Supabase Auth">
          <span style={{ fontSize:11, color:'#525252' }}>Magic link / email</span>
        </Row>
        <Row label="Private key storage" desc="Keys are stored encrypted at rest in your Supabase vault">
          <span style={{ fontSize:11, fontWeight:500, color:'#047857', display:'flex', alignItems:'center', gap:4 }}><Shield size={11}/> Encrypted</span>
        </Row>
      </Section>

      {/* Actions */}
      <Section title="Account actions">
        <Row label="Sign out" desc="Sign out of SSLVault on this device">
          <button onClick={handleSignOut} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', color:'#525252', border:'0.5px solid #e8edf2', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <LogOut size={11}/> Sign out
          </button>
        </Row>
        <Row label="Delete account" desc="Permanently delete your account and all certificate data">
          <button style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', color:'#b91c1c', border:'0.5px solid #fecaca', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <Trash2 size={11}/> Delete account
          </button>
        </Row>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={handleSave} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#10b981', color:'white', border:'none', borderRadius:6, padding:'9px 18px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          {saved ? <><Check size={13}/> Saved</> : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}
