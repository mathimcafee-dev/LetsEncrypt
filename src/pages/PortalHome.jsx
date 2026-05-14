import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Plus, FileText, LogOut, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react'
import BuyCertificate from './BuyCertificate'
import CertInventory from './CertInventory'
import '../styles/design-v2.css'

const NAV = '#0d3c6e'
const ACCENT = '#0e7fc0'
const BG = '#f0f4f8'
const FONT = "'Segoe UI',system-ui,sans-serif"

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
      const { data } = await supabase.from('certificates').select('id, domain, status, expires_at, cert_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      setCerts(data || [])
    } finally { setLoading(false) }
  }

  async function handleDownloadBilling() {
    setDownloading(true)
    try {
      const { downloadCustomerOrders } = await import('../lib/exportOrders')
      await downloadCustomerOrders(user.id, companyName)
    } catch (e) { alert(e.message) } finally { setDownloading(false) }
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  const stats = {
    active: certs.filter(c => c.status === 'active').length,
    expiring: certs.filter(c => c.status === 'active' && new Date(c.expires_at) < new Date(Date.now() + 30 * 86400000)).length,
    pending: certs.filter(c => ['pending', 'dv_pending'].includes(c.status)).length,
  }

  function CertStatusIcon({ status, expiresAt }) {
    if (status === 'active' && new Date(expiresAt) < new Date(Date.now() + 30 * 86400000)) return <AlertTriangle size={13} color="#b45309" />
    if (status === 'active') return <CheckCircle size={13} color="#15803d" />
    return <Clock size={13} color={ACCENT} />
  }

  function daysLeft(expiresAt) {
    if (!expiresAt) return null
    const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000)
    if (days < 0) return <span style={{ color: '#b91c1c', fontSize: 11 }}>Expired</span>
    if (days < 30) return <span style={{ color: '#b45309', fontSize: 11 }}>{days}d left</span>
    return <span style={{ color: 'var(--v2-text-3)', fontSize: 11 }}>{new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
  }

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

  const titles = { dashboard: 'Dashboard', issue: 'Issue Certificate', certs: 'My Certificates' }

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
          <button onClick={() => { sessionStorage.removeItem('impersonation'); nav(impersonatedBy.role === 'sub_reseller' ? '/reseller' : '/admin') }} style={{ marginLeft: 'auto', fontSize: 12, color: '#b45309', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Exit impersonation</button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, background: BG }}>
        <nav style={{ width: 210, background: NAV, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: impersonatedBy ? 80 : 44, height: `calc(100vh - ${impersonatedBy ? 80 : 44}px)`, overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: '8px 0 2px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase', padding: '6px 16px 4px' }}>Portal</div>
            <NavItem id="dashboard" label="Dashboard" Icon={Shield} />
            <NavItem id="issue" label="Issue Certificate" Icon={Plus} />
            <NavItem id="certs" label="My Certificates" Icon={FileText} />
          </div>
          <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {section !== 'issue' && (
            <div style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: impersonatedBy ? 80 : 44, zIndex: 30 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332', letterSpacing: '-0.3px' }}>{titles[section]}</div>
              {section === 'dashboard' && (
                <button onClick={handleDownloadBilling} disabled={downloading} className="v2-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <Download size={12} /> {downloading ? 'Downloading…' : 'Export Orders'}
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {section === 'dashboard' && (
              <div style={{ padding: 28 }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Active Certificates', value: stats.active, color: '#15803d' },
                    { label: 'Expiring in 30 days', value: stats.expiring, color: '#b45309' },
                    { label: 'Pending Orders', value: stats.pending, color: ACCENT },
                  ].map(s => (
                    <div key={s.label} className="v2-card" style={{ padding: '18px 20px' }}>
                      <div style={{ fontSize: 30, fontWeight: 600, color: s.color, letterSpacing: '-0.5px' }}>{loading ? '–' : s.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ background: `linear-gradient(135deg, ${NAV}, ${ACCENT})`, borderRadius: 10, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Need a new certificate?</div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Issue an SSL/TLS certificate in minutes</div>
                  </div>
                  <button onClick={() => setSection('issue')} style={{ background: 'white', color: NAV, border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> Issue Certificate
                  </button>
                </div>

                {/* Recent certs */}
                <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)' }}>Recent Certificates</span>
                    <button onClick={() => setSection('certs')} style={{ fontSize: 12, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>Loading…</div>
                    : certs.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>
                        No certificates yet.{' '}
                        <button onClick={() => setSection('issue')} style={{ color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Issue your first one →</button>
                      </div>
                    ) : certs.map((cert, i) => (
                      <div key={cert.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: i < certs.length - 1 ? '0.5px solid var(--v2-border)' : 'none', background: 'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <CertStatusIcon status={cert.status} expiresAt={cert.expires_at} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--v2-text)', fontSize: 13, fontWeight: 500 }}>{cert.domain}</div>
                          <div style={{ color: 'var(--v2-text-3)', fontSize: 11 }}>{cert.cert_type || 'RapidSSL DV'}</div>
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
      </div>
    </div>
  )
}
