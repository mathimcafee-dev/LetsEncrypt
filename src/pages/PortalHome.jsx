import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Plus, FileText, Globe, Server,
  Download, BookOpen, Settings, LogOut,
  Layout, AlertTriangle, CheckCircle, Clock, FileInput
} from 'lucide-react'
import BuyCertificate from './BuyCertificate'
import CertInventory from './CertInventory'
import DnsProviders from './DnsProviders'
import ServersPage from './Servers'
import SettingsPage from './SettingsPage'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import Import from './Import'
import '../styles/design-v2.css'

const NAV = '#0d3c6e'
const ACCENT = '#0e7fc0'
const BG = '#f0f4f8'
const FONT = "'Segoe UI',system-ui,sans-serif"

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard',            Icon: Layout    },
      { id: 'issue',     label: 'Issue Certificate',    Icon: Plus      },
      { id: 'certs',     label: 'My Certificates',      Icon: FileText  },
      { id: 'import',    label: 'Import Certificate',   Icon: FileInput },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'dns',     label: 'DNS Providers', Icon: Globe  },
      { id: 'servers', label: 'Servers',       Icon: Server },
    ],
  },
  {
    label: 'Resources',
    items: [
      { id: 'install',  label: 'Installation', Icon: Download  },
      { id: 'kb',       label: 'Docs & Help',  Icon: BookOpen  },
      { id: 'settings', label: 'Settings',     Icon: Settings  },
    ],
  },
]

const SECTION_TITLES = {
  dashboard: 'Dashboard', issue: 'Issue Certificate',
  certs: 'My Certificates', import: 'Import Certificate',
  dns: 'DNS Providers', servers: 'Servers',
  install: 'Installation', kb: 'Docs & Help', settings: 'Settings',
}

const DARK_SECTIONS = ['issue']
const NO_HEADER_SECTIONS = ['issue', 'dashboard', 'dns']

export default function PortalHome({ user, nav, account, impersonatedBy }) {
  const [section, setSection] = useState('dashboard')
  const [animKey, setAnimKey] = useState(0)
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const companyName = account?.company_name || user?.email?.split('@')[1] || 'My Account'

  const navigate = (id) => {
    if (id === section) return
    setSection(id)
    setAnimKey(k => k + 1)
    window.scrollTo(0, 0)
  }

  useEffect(() => { loadDashboard() }, [user])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('certificates')
        .select('id, domain, status, expires_at, cert_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8)
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
    active:   certs.filter(c => c.status === 'active').length,
    expiring: certs.filter(c => c.status === 'active' && new Date(c.expires_at) < new Date(Date.now() + 30 * 86400000)).length,
    pending:  certs.filter(c => ['pending', 'dv_pending'].includes(c.status)).length,
  }

  function CertStatusIcon({ status, expiresAt }) {
    if (status === 'active' && new Date(expiresAt) < new Date(Date.now() + 30 * 86400000))
      return <AlertTriangle size={13} color="#b45309" />
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
      <button onClick={() => navigate(id)} style={{
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

  function renderContent() {
    if (section === 'dashboard') return (
      <div style={{ padding: 28 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Active Certificates', value: stats.active,   color: '#15803d' },
            { label: 'Expiring in 30 days', value: stats.expiring, color: '#b45309' },
            { label: 'Pending Orders',      value: stats.pending,  color: ACCENT    },
          ].map(s => (
            <div key={s.label} className="v2-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 30, fontWeight: 600, color: s.color, letterSpacing: '-0.5px' }}>{loading ? '–' : s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA banner */}
        <div style={{ background: `linear-gradient(135deg, ${NAV}, ${ACCENT})`, borderRadius: 10, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Need a new certificate?</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Issue an SSL/TLS certificate — auto DCV via your saved DNS credentials</div>
          </div>
          <button onClick={() => navigate('issue')} style={{ background: 'white', color: NAV, border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Plus size={13} /> Issue Certificate
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { id: 'dns',     Icon: Globe,      label: 'DNS Credentials',  desc: 'Auto DCV — connect Cloudflare or Vercel',  color: '#0369a1', bg: '#eff6ff' },
            { id: 'servers', Icon: Server,     label: 'Servers',          desc: 'Auto-install certs on your servers',        color: '#15803d', bg: '#f0fdf4' },
            { id: 'import',  Icon: FileInput,  label: 'Import Cert',      desc: "Import existing certs from any CA",         color: '#7c3aed', bg: '#faf5ff' },
          ].map(({ id, Icon, label, desc, color, bg }) => (
            <button key={id} onClick={() => navigate(id)} style={{ background: 'white', border: '0.5px solid var(--v2-border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={15} color={color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-3)', lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Recent certs */}
        <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--v2-text)' }}>Recent Certificates</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDownloadBilling} disabled={downloading} className="v2-btn" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={11} /> {downloading ? 'Downloading…' : 'Export Orders'}
              </button>
              <button onClick={() => navigate('certs')} style={{ fontSize: 12, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
            </div>
          </div>
          {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>Loading…</div>
            : certs.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ color: 'var(--v2-text-3)', fontSize: 13, marginBottom: 10 }}>No certificates yet</div>
                <button onClick={() => navigate('issue')} className="v2-btn v2-btn-primary" style={{ fontSize: 12 }}>Issue your first certificate</button>
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
    )

    if (section === 'issue')    return <BuyCertificate nav={nav} embeddedUser={user} onDashboard={() => navigate('dashboard')} />
    if (section === 'certs')    return <CertInventory nav={nav} embeddedUser={user} onIssue={() => navigate('issue')} />
    if (section === 'import')   return <Import nav={nav} />
    if (section === 'dns')      return <DnsProviders nav={nav} />
    if (section === 'servers')  return <ServersPage user={user} />
    if (section === 'install')  return <Install nav={nav} />
    if (section === 'kb')       return <KnowledgeBase nav={nav} />
    if (section === 'settings') return <SettingsPage user={user} />
    return null
  }

  const stickyTop = impersonatedBy ? 80 : 44

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: FONT }}>

      {/* Top bar */}
      <div style={{ background: NAV, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={13} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>SSLVault</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>{companyName.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</span>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'inherit', padding: 0 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Impersonation banner */}
      {impersonatedBy && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '7px 20px', fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 44, zIndex: 49 }}>
          <AlertTriangle size={12} /> Viewing as <strong>{companyName}</strong>
          <button onClick={() => { sessionStorage.removeItem('impersonation'); nav(impersonatedBy.role === 'sub_reseller' ? '/reseller' : '/admin') }}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#b45309', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Exit impersonation
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, background: DARK_SECTIONS.includes(section) ? '#050a14' : BG }}>
        {/* Sidebar */}
        <nav style={{
          width: 210, background: NAV, display: 'flex', flexDirection: 'column',
          flexShrink: 0, position: 'sticky', top: stickyTop,
          height: `calc(100vh - ${stickyTop}px)`, overflowY: 'auto',
          boxShadow: '4px 0 24px rgba(0,0,0,0.18), 1px 0 0 rgba(255,255,255,0.06)',
        }}>
          {NAV_SECTIONS.map(({ label, items }, i) => (
            <div key={label} style={{ padding: '8px 0 2px', borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.1)' : 'none', marginTop: i > 0 ? 4 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase', padding: '6px 16px 4px' }}>{label}</div>
              {items.map(item => <NavItem key={item.id} {...item} />)}
            </div>
          ))}
          <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </nav>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {!NO_HEADER_SECTIONS.includes(section) && (
            <div style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', flexShrink: 0, position: 'sticky', top: stickyTop, zIndex: 30 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332', letterSpacing: '-0.3px' }}>{SECTION_TITLES[section]}</div>
            </div>
          )}
          <div key={animKey} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', animation: 'portal-fadein 0.2s cubic-bezier(0.4,0,0.2,1)' }}>
            {renderContent()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes portal-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
