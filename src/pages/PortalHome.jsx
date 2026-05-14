import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Plus, FileText, LogOut, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react'
import BuyCertificate from './BuyCertificate'
import CertInventory from './CertInventory'

export default function PortalHome({ user, nav, account, impersonatedBy }) {
  const [section, setSection] = useState('dashboard')
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const companyName = account?.company_name || user?.email?.split('@')[1] || 'My Account'

  useEffect(() => { loadDashboard() }, [user])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('certificates')
        .select('id, domain, status, expires_at, cert_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setCerts(data || [])
    } finally { setLoading(false) }
  }

  async function handleDownloadBilling() {
    setDownloading(true)
    try {
      // Get all orders for this account
      const { data: orders } = await supabase
        .from('tss_orders')
        .select('domain, product_code, status, created_at, years, major_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!orders?.length) { alert('No orders to export'); return }

      // Build CSV
      const headers = ['Date', 'Domain', 'Product', 'Status', 'Years', 'Ordered By']
      const rows = orders.map(o => [
        new Date(o.created_at).toLocaleDateString(),
        o.domain,
        o.product_code || 'RapidSSL DV',
        o.major_status || o.status,
        o.years || 1,
        user.email,
      ])

      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sslvault-orders-${companyName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setDownloading(false) }
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  const stats = {
    active: certs.filter(c => c.status === 'active').length,
    expiring: certs.filter(c => c.status === 'active' && new Date(c.expires_at) < new Date(Date.now() + 30 * 86400000)).length,
    pending: certs.filter(c => ['pending','dv_pending'].includes(c.status)).length,
  }

  function statusIcon(status, expiresAt) {
    if (status === 'active' && new Date(expiresAt) < new Date(Date.now() + 30 * 86400000)) return <AlertTriangle size={14} color="#f59e0b" />
    if (status === 'active') return <CheckCircle size={14} color="#10b981" />
    return <Clock size={14} color="#60a5fa" />
  }

  function daysLeft(expiresAt) {
    if (!expiresAt) return null
    const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000)
    if (days < 0) return <span style={{ color: '#ef4444', fontSize: 11 }}>Expired</span>
    if (days < 30) return <span style={{ color: '#f59e0b', fontSize: 11 }}>{days}d left</span>
    return <span style={{ color: '#6b7280', fontSize: 11 }}>{new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
  }

  const NavItem = ({ id, label, Icon }) => (
    <button onClick={() => setSection(id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
      cursor: 'pointer', fontSize: 13, fontWeight: section === id ? 600 : 400,
      color: section === id ? '#fff' : 'rgba(255,255,255,0.55)',
      background: section === id ? 'rgba(16,185,129,0.18)' : 'transparent',
      borderLeft: section === id ? '3px solid #10b981' : '3px solid transparent',
      border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
      borderRadius: '0 6px 6px 0', transition: 'all 0.15s',
    }}>
      <Icon size={15} />{label}
    </button>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: 220, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Shield size={18} color="#10b981" /><span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SSLVault</span></div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</div>
        </div>
        <nav style={{ flex: 1, paddingTop: 12 }}>
          <NavItem id="dashboard" label="Dashboard" Icon={Shield} />
          <NavItem id="issue" label="Issue Certificate" Icon={Plus} />
          <NavItem id="certs" label="My Certificates" Icon={FileText} />
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {impersonatedBy && (
          <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '8px 24px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} /> Viewing as <strong>{companyName}</strong>
            <button onClick={() => { sessionStorage.removeItem('impersonation'); nav(impersonatedBy.role === 'sub_reseller' ? '/reseller' : '/admin') }} style={{ marginLeft: 'auto', fontSize: 12, color: '#92400e', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Exit</button>
          </div>
        )}

        {section === 'dashboard' && (
          <div style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Welcome, {companyName}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={handleDownloadBilling} disabled={downloading} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> {downloading ? 'Downloading...' : 'Export Orders (CSV)'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Active Certificates', value: stats.active, color: '#10b981' },
                { label: 'Expiring in 30 days', value: stats.expiring, color: '#f59e0b' },
                { label: 'Pending Orders', value: stats.pending, color: '#60a5fa' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 32, fontWeight: 600, color: s.color }}>{loading ? '–' : s.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Need a new certificate?</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Issue an SSL/TLS certificate in minutes</div>
              </div>
              <button onClick={() => setSection('issue')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Issue Certificate
              </button>
            </div>

            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Recent Certificates</span>
                <button onClick={() => setSection('certs')} style={{ fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
                : certs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                    No certificates yet. <button onClick={() => setSection('issue')} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Issue your first one →</button>
                  </div>
                ) : certs.map(cert => (
                  <div key={cert.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {statusIcon(cert.status, cert.expires_at)}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{cert.domain}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{cert.cert_type || 'RapidSSL DV'}</div>
                    </div>
                    {daysLeft(cert.expires_at)}
                  </div>
                ))}
            </div>
          </div>
        )}

        {section === 'issue' && <BuyCertificate nav={nav} embeddedUser={user} />}
        {section === 'certs' && <CertInventory nav={nav} embeddedUser={user} />}
      </div>
    </div>
  )
}
