import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, Plus, LogOut, Eye, UserX, UserCheck, Mail, CheckCircle, Copy, AlertTriangle } from 'lucide-react'

export default function ResellerHome({ user, nav, account, impersonatedBy }) {
  const [section, setSection] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [error, setError] = useState('')

  const companyName = account?.company_name || user?.email?.split('@')[1] || 'My Portal'

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true)
    try {
      const { data } = await supabase.functions.invoke('account-manage', { body: { action: 'list_my_customers' } })
      if (data) { setCustomers(data.customers || []); setPendingInvites(data.pending_invites || []) }
    } finally { setLoading(false) }
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true); setError('')
    try {
      const { data, error: err } = await supabase.functions.invoke('account-manage', {
        body: { action: 'invite_end_customer', email: inviteEmail, company_name: inviteCompany }
      })
      if (err || data?.error) throw new Error(data?.error || 'Failed to send invite')
      setInviteSent(true); setInviteEmail(''); setInviteCompany(''); loadCustomers()
    } catch (e) { setError(e.message) } finally { setInviting(false) }
  }

  async function handleSuspend(userId, status) {
    const action = status === 'active' ? 'suspend_account' : 'activate_account'
    await supabase.functions.invoke('account-manage', { body: { action, target_user_id: userId } })
    loadCustomers()
  }

  async function handleViewAs(customer) {
    const { data } = await supabase.functions.invoke('account-manage', {
      body: { action: 'start_impersonation', target_user_id: customer.id }
    })
    if (data?.ok) {
      sessionStorage.setItem('impersonation', JSON.stringify({
        session_id: data.session_id, target: data.target,
        admin: { id: user.id, company_name: companyName, email: user.email },
        expires_at: data.expires_at,
      }))
      nav('/portal')
    }
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    certs: customers.reduce((s, c) => s + (c.active_certs || 0), 0),
  }

  const NavItem = ({ id, label, Icon }) => (
    <button onClick={() => setSection(id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
      cursor: 'pointer', fontSize: 13, fontWeight: section === id ? 600 : 400,
      color: section === id ? '#fff' : 'rgba(255,255,255,0.55)',
      background: section === id ? 'rgba(37,99,235,0.18)' : 'transparent',
      borderLeft: section === id ? '3px solid #3b82f6' : '3px solid transparent',
      border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
      borderRadius: '0 6px 6px 0', transition: 'all 0.15s',
    }}>
      <Icon size={15} />{label}
    </button>
  )

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13,
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: 220, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Shield size={18} color="#3b82f6" /><span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SSLVault</span></div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</div>
        </div>
        <nav style={{ flex: 1, paddingTop: 12 }}>
          <NavItem id="customers" label="My Customers" Icon={Users} />
          <NavItem id="invite" label="Invite Customer" Icon={Plus} />
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {impersonatedBy && (
          <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '8px 24px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} /> Viewing as <strong>{account?.company_name || user?.email}</strong>
            <button onClick={() => { sessionStorage.removeItem('impersonation'); nav('/admin') }} style={{ marginLeft: 'auto', fontSize: 12, color: '#92400e', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Exit</button>
          </div>
        )}

        <div style={{ padding: 28 }}>
          {section === 'customers' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>My Customers</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>End customers under your account</p>
                </div>
                <button onClick={() => setSection('invite')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Invite Customer
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Total Customers', value: stats.total, color: '#60a5fa' },
                  { label: 'Active', value: stats.active, color: '#10b981' },
                  { label: 'Active Certs', value: stats.certs, color: '#a78bfa' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 32, fontWeight: 600, color: s.color }}>{loading ? '–' : s.value}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Active Customers</span>
                </div>
                {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
                  : customers.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 12 }}>No customers yet</div>
                      <button onClick={() => setSection('invite')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Invite your first customer</button>
                    </div>
                  ) : customers.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                        {(c.company_name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.company_name || c.email}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{c.email} · {c.active_certs || 0} certs · {c.total_orders || 0} orders</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: c.status === 'active' ? '#d1fae5' : '#fee2e2', color: c.status === 'active' ? '#065f46' : '#991b1b' }}>{c.status}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleViewAs(c)} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={12} /> View as
                        </button>
                        <button onClick={() => handleSuspend(c.id, c.status)} style={{ background: c.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: c.status === 'active' ? '#f87171' : '#34d399', border: `1px solid ${c.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>
                          {c.status === 'active' ? <UserX size={12} /> : <UserCheck size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {pendingInvites.length > 0 && (
                <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 16 }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Pending Invitations</span>
                  </div>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Mail size={15} color="#60a5fa" />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: 13 }}>{inv.company_name || inv.email}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{inv.email} · Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Invited</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === 'invite' && (
            <div style={{ maxWidth: 460 }}>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Invite a Customer</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>
                Your customer will receive an email to set up their account and start issuing certificates.
              </p>

              {inviteSent ? (
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 28, border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                  <CheckCircle size={36} color="#10b981" style={{ marginBottom: 14 }} />
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Invite sent!</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>Your customer will receive an email with a link to set up their account.</div>
                  <button onClick={() => { setInviteSent(false); setSection('customers') }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Back to Customers</button>
                </div>
              ) : (
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>{error}</div>}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Customer Email *</label>
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="customer@company.com" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Company Name</label>
                    <input type="text" value={inviteCompany} onChange={e => setInviteCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
                  </div>
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail} style={{ width: '100%', background: inviting || !inviteEmail ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer' }}>
                    {inviting ? 'Sending invite...' : 'Send Invite Email'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
