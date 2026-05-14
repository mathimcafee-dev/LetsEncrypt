import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Users, Plus, LogOut, CheckCircle,
  Clock, AlertTriangle, Copy, Eye, UserX, UserCheck, Mail
} from 'lucide-react'

export default function ResellerHome({ user, nav, account }) {
  const [section, setSection] = useState('customers')
  const [users, setUsers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, certs: 0 })
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviteResult, setInviteResult] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)

  const companyName = account?.company_name || 'Reseller Portal'

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('account-manage', {
        body: { action: 'list_my_users' }
      })
      if (!error && data) {
        setUsers(data.users || [])
        setPendingInvites(data.pending_invites || [])
        const active = (data.users || []).filter(u => u.status === 'active').length
        const certs = (data.users || []).reduce((s, u) => s + (u.cert_count || 0), 0)
        setStats({ total: data.users?.length || 0, active, certs })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const { data, error } = await supabase.functions.invoke('account-manage', {
        body: { action: 'create_end_user', email: inviteEmail, company_name: inviteCompany }
      })
      if (error || data?.error) {
        alert(data?.error || 'Failed to create invite')
      } else {
        setInviteResult(data)
        setInviteEmail('')
        setInviteCompany('')
        loadUsers()
      }
    } finally {
      setInviting(false)
    }
  }

  async function handleSuspend(userId, currentStatus) {
    const action = currentStatus === 'active' ? 'suspend_account' : 'activate_account'
    const { data, error } = await supabase.functions.invoke('account-manage', {
      body: { action, target_user_id: userId }
    })
    if (!error && data?.ok) loadUsers()
  }

  async function handleViewAs(targetUser) {
    const { data, error } = await supabase.functions.invoke('account-manage', {
      body: { action: 'start_impersonation', target_user_id: targetUser.id }
    })
    if (!error && data?.ok) {
      // Store impersonation context and navigate to portal
      sessionStorage.setItem('impersonation', JSON.stringify({
        session_id: data.session_id,
        target: data.target,
        admin: { id: user.id, company_name: companyName, email: user.email },
        expires_at: data.expires_at,
      }))
      nav('/portal')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    nav('/')
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const NavItem = ({ id, label, Icon }) => (
    <button
      onClick={() => setSection(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', cursor: 'pointer', fontSize: 13,
        fontWeight: section === id ? 600 : 400,
        color: section === id ? '#fff' : 'rgba(255,255,255,0.6)',
        background: section === id ? 'rgba(37,99,235,0.2)' : 'transparent',
        borderLeft: section === id ? '3px solid #3b82f6' : '3px solid transparent',
        border: 'none', width: '100%', textAlign: 'left',
        fontFamily: 'inherit', borderRadius: '0 6px 6px 0',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={15} />{label}
    </button>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Shield size={18} color="#3b82f6" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SSLVault</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 26 }}>Reseller: {companyName}</div>
        </div>

        <nav style={{ flex: 1, paddingTop: 12 }}>
          <NavItem id="customers" label="Customers" Icon={Users} />
          <NavItem id="invite" label="Invite Customer" Icon={Plus} />
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>

        {section === 'customers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Customers</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Manage your end users</p>
              </div>
              <button
                onClick={() => setSection('invite')}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Invite Customer
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Customers', value: stats.total, color: '#60a5fa' },
                { label: 'Active', value: stats.active, color: '#10b981' },
                { label: 'Total Active Certs', value: stats.certs, color: '#a78bfa' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 32, fontWeight: 600, color: s.color }}>{loading ? '–' : s.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Customer list */}
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Active Customers</span>
              </div>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
              ) : users.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No customers yet. <button onClick={() => setSection('invite')} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Invite your first customer →</button>
                </div>
              ) : users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {(u.company_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{u.company_name || u.email}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{u.email} · {u.cert_count} active cert{u.cert_count !== 1 ? 's' : ''}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: u.status === 'active' ? '#d1fae5' : '#fee2e2',
                    color: u.status === 'active' ? '#065f46' : '#991b1b',
                  }}>{u.status}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleViewAs(u)}
                      title="View as this user"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Eye size={12} /> View as
                    </button>
                    <button
                      onClick={() => handleSuspend(u.id, u.status)}
                      title={u.status === 'active' ? 'Suspend' : 'Activate'}
                      style={{ background: u.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.status === 'active' ? '#f87171' : '#34d399', border: `1px solid ${u.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}
                    >
                      {u.status === 'active' ? <UserX size={12} /> : <UserCheck size={12} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Pending Invitations</span>
                </div>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Mail size={15} color="#60a5fa" />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 13 }}>{inv.email}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontWeight: 500 }}>Pending</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'invite' && (
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Invite a Customer</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>
              Send an invite link so your customer can sign up and start issuing certificates.
            </p>

            {inviteResult ? (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <CheckCircle size={18} color="#10b981" />
                  <span style={{ color: '#fff', fontWeight: 600 }}>Invite created</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Share this link with your customer:</div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <code style={{ color: '#10b981', fontSize: 11, flex: 1, wordBreak: 'break-all' }}>{inviteResult.invite_url}</code>
                  <button onClick={() => copyLink(inviteResult.invite_url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#6b7280', flexShrink: 0 }}>
                    <Copy size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  Expires: {new Date(inviteResult.expires_at).toLocaleString()}
                </div>
                <button onClick={() => { setInviteResult(null); setSection('customers') }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Back to Customers
                </button>
              </div>
            ) : (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Customer Email *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="customer@company.com"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Company Name (optional)</label>
                  <input
                    type="text"
                    value={inviteCompany}
                    onChange={e => setInviteCompany(e.target.value)}
                    placeholder="Acme Corp"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail}
                  style={{ background: inviting || !inviteEmail ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer', width: '100%' }}
                >
                  {inviting ? 'Creating...' : 'Create Invite Link'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
