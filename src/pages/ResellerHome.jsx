import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, Plus, LogOut, Eye, UserX, UserCheck, Mail, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { downloadAllOrdersReseller, downloadCustomerOrders } from '../lib/exportOrders'
import '../styles/design-v2.css'

const NAV = '#0d3c6e'
const ACCENT = '#0e7fc0'
const BG = '#f0f4f8'
const FONT = "'Segoe UI',system-ui,sans-serif"

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
  const [downloading, setDownloading] = useState({})

  const companyName = account?.company_name || user?.email?.split('@')[1] || 'Reseller Portal'

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
      const { data, error: err } = await supabase.functions.invoke('account-manage', { body: { action: 'invite_end_customer', email: inviteEmail, company_name: inviteCompany } })
      if (err || data?.error) throw new Error(data?.error || 'Failed to send invite')
      setInviteSent(true); setInviteEmail(''); setInviteCompany(''); loadCustomers()
    } catch (e) { setError(e.message) } finally { setInviting(false) }
  }

  async function handleSuspend(id, status) {
    const action = status === 'active' ? 'suspend_account' : 'activate_account'
    await supabase.functions.invoke('account-manage', { body: { action, target_user_id: id } })
    loadCustomers()
  }

  async function handleViewAs(c) {
    const { data } = await supabase.functions.invoke('account-manage', { body: { action: 'start_impersonation', target_user_id: c.id } })
    if (data?.ok) {
      sessionStorage.setItem('impersonation', JSON.stringify({ session_id: data.session_id, target: data.target, admin: { id: user.id, company_name: companyName, email: user.email }, expires_at: data.expires_at }))
      nav('/portal')
    }
  }

  async function handleDownloadAll() {
    setDownloading(d => ({ ...d, all: true }))
    try { await downloadAllOrdersReseller(user.id, companyName) } catch (e) { alert(e.message) }
    setDownloading(d => ({ ...d, all: false }))
  }

  async function handleDownloadCustomer(id, name) {
    setDownloading(d => ({ ...d, [id]: true }))
    try { await downloadCustomerOrders(id, name) } catch (e) { alert(e.message) }
    setDownloading(d => ({ ...d, [id]: false }))
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  const stats = { total: customers.length, active: customers.filter(c => c.status === 'active').length, certs: customers.reduce((s, c) => s + (c.active_certs || 0), 0) }

  const NavItem = ({ id, label, Icon }) => {
    const active = section === id
    return (
      <button onClick={() => setSection(id)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 500,
        color: active ? 'white' : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(14,127,192,0.35)' : 'transparent',
        borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
        border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
        borderRadius: '0 6px 6px 0', transition: 'all 0.15s',
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <Icon size={13} />{label}
      </button>
    )
  }

  const titles = { customers: 'My Customers', invite: 'Invite Customer' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: FONT }}>
      <div style={{ background: NAV, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={13} color="white" strokeWidth={2.5} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>SSLVault</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>{companyName.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</span>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'inherit', padding: 0 }}><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      {impersonatedBy && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '7px 20px', fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={12} /> Viewing as <strong>{companyName}</strong>
          <button onClick={() => { sessionStorage.removeItem('impersonation'); nav('/admin') }} style={{ marginLeft: 'auto', fontSize: 12, color: '#b45309', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Exit impersonation</button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, background: BG }}>
        <nav style={{ width: 210, background: NAV, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: impersonatedBy ? 80 : 44, height: `calc(100vh - ${impersonatedBy ? 80 : 44}px)`, overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: '8px 0 2px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase', padding: '6px 16px 4px' }}>Reseller</div>
            <NavItem id="customers" label="My Customers" Icon={Users} />
            <NavItem id="invite" label="Invite Customer" Icon={Plus} />
          </div>
          <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: impersonatedBy ? 80 : 44, zIndex: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332', letterSpacing: '-0.3px' }}>{titles[section]}</div>
            {section === 'customers' && customers.length > 0 && (
              <button onClick={handleDownloadAll} disabled={!!downloading.all} className="v2-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <Download size={12} /> {downloading.all ? 'Downloading…' : 'Download All Orders'}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

            {section === 'customers' && (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Total Customers', value: stats.total, color: ACCENT },
                    { label: 'Active', value: stats.active, color: '#15803d' },
                    { label: 'Active Certs', value: stats.certs, color: '#0369a1' },
                  ].map(s => (
                    <div key={s.label} className="v2-card" style={{ padding: '18px 20px' }}>
                      <div style={{ fontSize: 30, fontWeight: 600, color: s.color, letterSpacing: '-0.5px' }}>{loading ? '–' : s.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Customer list */}
                <div className="v2-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)' }}>Customers</span>
                    <button onClick={() => setSection('invite')} className="v2-btn v2-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Plus size={12} /> Invite Customer</button>
                  </div>
                  {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>Loading…</div>
                    : customers.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center' }}>
                        <div style={{ color: 'var(--v2-text-3)', fontSize: 13, marginBottom: 12 }}>No customers yet</div>
                        <button onClick={() => setSection('invite')} className="v2-btn v2-btn-primary" style={{ fontSize: 12 }}>Invite your first customer</button>
                      </div>
                    ) : customers.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < customers.length - 1 ? '0.5px solid var(--v2-border)' : 'none', background: 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ACCENT, flexShrink: 0 }}>
                          {(c.company_name || c.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--v2-text)', fontSize: 13, fontWeight: 500 }}>{c.company_name || c.email}</div>
                          <div style={{ color: 'var(--v2-text-3)', fontSize: 11 }}>{c.email} · {c.active_certs || 0} certs · {c.total_orders || 0} orders</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: c.status === 'active' ? '#f0fdf4' : '#fef2f2', color: c.status === 'active' ? '#15803d' : '#b91c1c', border: `0.5px solid ${c.status === 'active' ? '#15803d33' : '#b91c1c33'}` }}>{c.status}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleViewAs(c)} className="v2-btn" style={{ fontSize: 11, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={10} /> View as</button>
                          <button onClick={() => handleDownloadCustomer(c.id, c.company_name || c.email)} disabled={!!downloading[c.id]} className="v2-btn" style={{ fontSize: 11, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 3 }}><Download size={10} /> {downloading[c.id] ? '…' : 'Orders'}</button>
                          <button onClick={() => handleSuspend(c.id, c.status)} className="v2-btn" style={{ fontSize: 11, padding: '4px 8px', color: c.status === 'active' ? 'var(--v2-red-text)' : '#15803d' }}>
                            {c.status === 'active' ? <UserX size={10} /> : <UserCheck size={10} />}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {pendingInvites.length > 0 && (
                  <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--v2-border)' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)' }}>Pending Invitations</span>
                    </div>
                    {pendingInvites.map((inv, i) => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < pendingInvites.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                        <Mail size={14} color={ACCENT} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--v2-text)', fontSize: 13 }}>{inv.company_name || inv.email}</div>
                          <div style={{ color: 'var(--v2-text-3)', fontSize: 11 }}>{inv.email} · Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#fffbeb', color: '#b45309', border: '0.5px solid #b4530933' }}>Invited</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {section === 'invite' && (
              <div style={{ maxWidth: 460 }}>
                {inviteSent ? (
                  <div className="v2-card" style={{ padding: 32, textAlign: 'center' }}>
                    <CheckCircle size={32} color="#15803d" style={{ marginBottom: 14 }} />
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--v2-text)', marginBottom: 8 }}>Invite sent!</div>
                    <div style={{ color: 'var(--v2-text-3)', fontSize: 13, marginBottom: 20 }}>Your customer will receive an email to set up their account.</div>
                    <button onClick={() => { setInviteSent(false); setSection('customers') }} className="v2-btn v2-btn-primary" style={{ fontSize: 13 }}>Back to Customers</button>
                  </div>
                ) : (
                  <div className="v2-card" style={{ padding: 24 }}>
                    {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <div style={{ marginBottom: 16 }}>
                      <label className="v2-label">Customer Email *</label>
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="customer@company.com" className="v2-input" />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label className="v2-label">Company Name</label>
                      <input type="text" value={inviteCompany} onChange={e => setInviteCompany(e.target.value)} placeholder="Acme Corp" className="v2-input" />
                    </div>
                    <button onClick={handleInvite} disabled={inviting || !inviteEmail} className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: 11 }}>
                      {inviting ? 'Sending…' : 'Send Invite Email'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
