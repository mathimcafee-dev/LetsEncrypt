import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Activity, Globe, Server, Zap,
  RefreshCw, AlertTriangle, CheckCircle, ChevronRight,
  BarChart2, Clock, X, Settings, FileText, Search,
  Database, Layout, Users, Tool, CreditCard, LogOut,
  Menu, Bell, ChevronDown, Download, ExternalLink
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { differenceInDays, format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart
} from 'recharts'

import cssText from './CLMHome.css?raw'
const CSS = cssText

function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}

function statusOf(days, status) {
  if (status === 'revoked' || status === 'sandbox_revoked') return { color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8', label:'Revoked' }
  if (days == null)  return { color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8', label:'Unknown' }
  if (days < 0)      return { color:'#dc2626', bg:'#fef2f2', dot:'#ef4444', label:'Expired' }
  if (days < 14)     return { color:'#d97706', bg:'#fffbeb', dot:'#f59e0b', label:`${days}d left` }
  if (days < 30)     return { color:'#d97706', bg:'#fffbeb', dot:'#f59e0b', label:`${days}d left` }
  return               { color:'#059669', bg:'#ecfdf5', dot:'#10b981', label:`${days}d left` }
}

function InstallModal({ onClose, nav }) {
  return (
    <div className="cc-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cc-modal">
        <div className="cc-modal-head">
          <div>
            <div className="cc-modal-title">Install Certificate</div>
            <div className="cc-modal-sub">Select your server environment</div>
          </div>
          <button className="cc-modal-close" onClick={onClose}><X size={14}/></button>
        </div>
        <div className="cc-modal-body">
          <div className="cc-install-grid">
            <button className="cc-install-opt" onClick={() => { onClose(); nav('/dashboard') }}>
              <span className="cc-install-opt-icon">🖥️</span>
              <div className="cc-install-opt-title">VPS / Cloud Server</div>
              <div className="cc-install-opt-desc">SSH access · Ubuntu, CentOS, Amazon Linux · Nginx or Apache auto-detected</div>
            </button>
            <button className="cc-install-opt" onClick={() => { onClose(); nav('/dashboard') }}>
              <span className="cc-install-opt-icon">🌐</span>
              <div className="cc-install-opt-title">Shared Hosting</div>
              <div className="cc-install-opt-desc">cPanel · GoDaddy · Bluehost · Hostinger · Any cPanel host</div>
            </button>
          </div>
          <div style={{ marginTop:16, padding:'12px 14px', background:'#f8fafc', borderRadius:8, fontSize:11, color:'#64748b', lineHeight:1.65, border:'1px solid #e8edf2' }}>
            💡 Select a certificate from your <strong>Dashboard</strong>, click <strong>Install</strong>, and the guided setup will walk you through the full deployment.
          </div>
        </div>
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { id:'dashboard',    label:'Dashboard',         icon: Layout },
  { id:'certificates', label:'Certificates',       icon: Shield, badge: null },
  { id:'discovery',    label:'Discovery',          icon: Search },
  { id:'automation',   label:'Automation',         icon: RefreshCw, badge: 'new', badgeAmber: false },
  { id:'dns',          label:'DNS Providers',      icon: Globe },
  { id:'servers',      label:'Servers',            icon: Server },
  { id:'install',      label:'Install Guide',      icon: Download },
  { id:'finances',     label:'Pricing',            icon: CreditCard },
  { id:'account',      label:'Account',            icon: Users },
  { id:'settings',     label:'Settings',           icon: Settings },
  { id:'tools',        label:'Tools & API',        icon: Tool },
]

const NAV_ROUTES = {
  dashboard: '/', certificates: '/dashboard', discovery: '/dashboard',
  automation: '/dashboard', dns: '/dns-providers', servers: '/dashboard',
  install: '/install', finances: '/pricing', account: '/dashboard',
  settings: '/dashboard', tools: '/dashboard',
}

export default function CLMHome({ user, nav }) {
  const [certs, setCerts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showInstall, setShowInstall] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const email = user?.email || ''
  const name  = email.split('@')[0] || 'Spartan'
  const hour  = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('certificates')
        .select('id,domain,expires_at,status,issued_at,is_sandbox,cert_type,tss_order_id')
        .eq('user_id', user.id)
        .not('status', 'eq', 'rotating')
        .order('issued_at', { ascending: false })
      setCerts(data || [])
      setLoading(false)
    })()
  }, [user])

  const active   = certs.filter(c => c.status !== 'sandbox_revoked' && c.status !== 'revoked')
  const total    = active.length
  const healthy  = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 }).length
  const expiring = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 }).length
  const expired  = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 }).length

  // Build expiry chart data
  const chartData = [
    { range:'0–7d',   count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>=0 && d<=7 }).length,   fill:'#ef4444' },
    { range:'8–14d',  count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>7 && d<=14 }).length,   fill:'#f59e0b' },
    { range:'15–30d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>14 && d<=30 }).length,  fill:'#f59e0b' },
    { range:'31–90d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>30 && d<=90 }).length,  fill:'#3b82f6' },
    { range:'90d+',   count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>90 }).length,           fill:'#10b981' },
  ]

  const recent = certs.slice(0, 8)

  const ACTIONS = [
    { icon:Shield,    color:'#00b48a', bg:'#ecfdf5', label:'Issue Certificate',   desc:'RapidSSL DV via TSS',        fn:() => nav('/buy') },
    { icon:FileText,  color:'#3b82f6', bg:'#eff6ff', label:'Import Certificate',  desc:'Bring your own cert',        fn:() => nav('/import') },
    { icon:Activity,  color:'#7c3aed', bg:'#f5f3ff', label:'Manage Certs',        desc:'View & renew inventory',     fn:() => nav('/dashboard') },
    { icon:Globe,     color:'#0ea5e9', bg:'#f0f9ff', label:'Manage DNS',           desc:'Auto-validation providers',  fn:() => nav('/dns-providers') },
    { icon:Server,    color:'#d97706', bg:'#fffbeb', label:'Manage Servers',      desc:'VPS & cPanel servers',       fn:() => nav('/dashboard') },
    { icon:Zap,       color:'#10b981', bg:'#ecfdf5', label:'Install Certificate', desc:'VPS or shared hosting',      fn:() => setShowInstall(true) },
  ]

  const handleNav = (id) => {
    setActiveNav(id)
    setSidebarOpen(false)
    if (NAV_ROUTES[id]) nav(NAV_ROUTES[id])
  }

  const Sidebar = () => (
    <nav className={`cc-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="cc-sidebar-brand">
        <div className="cc-sidebar-logo">
          <Shield size={16} color="white" strokeWidth={2.5}/>
        </div>
        <div>
          <div className="cc-sidebar-brand-text">SSLVault</div>
          <div className="cc-sidebar-brand-sub">CLM PLATFORM</div>
        </div>
      </div>

      <button className="cc-sidebar-cta" onClick={() => { setSidebarOpen(false); nav('/buy') }}>
        <Plus size={13}/> Request a Certificate
      </button>

      <div className="cc-nav-section">
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge, badgeAmber }) => (
          <button key={id} className={`cc-nav-item${activeNav === id ? ' active' : ''}`}
            onClick={() => handleNav(id)}>
            <Icon size={15} strokeWidth={1.8}/>
            {label}
            {badge && <span className={`cc-nav-badge${badgeAmber ? ' amber' : ''}`}>{badge}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Signed in as</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
      </div>
    </nav>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="cc-shell">

        <Sidebar/>

        <div className="cc-main">
          {/* TOP BAR */}
          <div className="cc-topbar">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:'#64748b', padding:4 }} className="cc-mobile-menu">
                <Menu size={20}/>
              </button>
              <div className="cc-page-title">Overview</div>
            </div>
            <div className="cc-topbar-right">
              <button className="cc-topbar-btn outline" onClick={() => nav('/dashboard')}>
                <Activity size={13}/> View All Certs
              </button>
              <button className="cc-topbar-btn" onClick={() => nav('/buy')}>
                <Plus size={13}/> Issue Certificate
              </button>
            </div>
          </div>

          {/* CANVAS */}
          <div className="cc-canvas">

            {/* ── WELCOME STRIP ── */}
            <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1a2332' }}>
                  {greeting}, <span style={{ color:'#00b48a' }}>{name}</span>
                </div>
                <div style={{ fontSize:11, color:'#8492a6', marginTop:2 }}>
                  {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </div>
              </div>
              {(expired > 0 || expiring > 0) && (
                <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 12px', cursor:'pointer' }} onClick={() => nav('/dashboard')}>
                  <AlertTriangle size={13} color="#dc2626"/>
                  <span style={{ fontSize:12, fontWeight:600, color:'#b91c1c' }}>
                    {expired > 0 ? `${expired} expired` : `${expiring} expiring soon`}
                  </span>
                  <ChevronRight size={12} color="#dc2626"/>
                </div>
              )}
            </div>

            {/* ── KPI TILES ── */}
            <div className="cc-kpi-row">
              {[
                { label:'Total',      val:total,    sub:'certificates',    color:'#1a2332', bg:'#f4f6f9', icon:Shield },
                { label:'Valid',      val:healthy,  sub:'30+ days left',   color:'#059669', bg:'#ecfdf5', icon:CheckCircle },
                { label:'Expiring',   val:expiring, sub:'within 30 days',  color:'#d97706', bg:'#fffbeb', icon:Clock },
                { label:'Expired',    val:expired,  sub:'action needed',   color:'#dc2626', bg:'#fef2f2', icon:AlertTriangle },
              ].map(({ label, val, sub, color, bg, icon: Icon }) => (
                <div key={label} className="cc-kpi" onClick={() => nav('/dashboard')}>
                  <div className="cc-kpi-icon" style={{ background: bg }}>
                    <Icon size={20} color={color} strokeWidth={1.8}/>
                  </div>
                  <div>
                    <div className="cc-kpi-label">{label}</div>
                    <div className="cc-kpi-value" style={{ color }}>
                      {loading ? '—' : val}
                    </div>
                    <div className="cc-kpi-sub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {total === 0 && !loading ? (
              /* ── EMPTY STATE ── */
              <div className="cc-widget" style={{ marginBottom:20 }}>
                <div className="cc-empty">
                  <span className="cc-empty-icon">🛡️</span>
                  <div className="cc-empty-title">No certificates yet</div>
                  <div className="cc-empty-sub">
                    Issue your first SSL certificate via RapidSSL DV,<br/>
                    or import an existing one from any certificate authority.
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="cc-btn-primary" onClick={() => nav('/buy')}>
                      <Shield size={13}/> Issue Certificate
                    </button>
                    <button className="cc-btn-secondary" onClick={() => nav('/import')}>
                      <FileText size={13}/> Import Certificate
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* ── MAIN WIDGET ROW ── */}
                <div className="cc-widget-grid">

                  {/* Expiry Chart Widget */}
                  <div className="cc-widget">
                    <div className="cc-widget-head">
                      <div>
                        <div className="cc-widget-title">Expiring Certificates</div>
                        <div className="cc-widget-sub">Certificates expiring by time range</div>
                      </div>
                      <button className="cc-widget-link" onClick={() => nav('/dashboard')}>
                        View all <ChevronRight size={11}/>
                      </button>
                    </div>
                    <div className="cc-widget-body">
                      {total === 0 ? (
                        <div style={{ textAlign:'center', padding:'24px 0', color:'#8492a6', fontSize:12 }}>
                          No certificates to display
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={chartData} barSize={28}
                            margin={{ top:4, right:4, left:-20, bottom:0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                            <XAxis dataKey="range" tick={{ fontSize:10, fill:'#8492a6' }} axisLine={false} tickLine={false}/>
                            <YAxis tick={{ fontSize:10, fill:'#8492a6' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                            <Tooltip
                              contentStyle={{ background:'white', border:'1px solid #e8edf2', borderRadius:8, fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}
                              cursor={{ fill:'rgba(0,0,0,0.03)' }}
                            />
                            <Bar dataKey="count" name="Certs" radius={[4,4,0,0]}>
                              {chartData.map((entry, i) => (
                                <rect key={i} fill={entry.fill}/>
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:8 }}>
                        {[['#ef4444','Critical (0–7d)'],['#f59e0b','Warning (8–30d)'],['#10b981','Healthy (30d+)']].map(([c,l]) => (
                          <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#8492a6' }}>
                            <span style={{ width:8, height:8, borderRadius:2, background:c, display:'block' }}/>
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pending Requests Widget */}
                  <div className="cc-widget">
                    <div className="cc-widget-head">
                      <div>
                        <div className="cc-widget-title">Certificate Requests</div>
                        <div className="cc-widget-sub">Pending DNS validation orders</div>
                      </div>
                      <button className="cc-widget-link" onClick={() => nav('/buy')}>
                        New request <ChevronRight size={11}/>
                      </button>
                    </div>
                    <div className="cc-widget-body">
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                        <button style={{ border:'1.5px solid #e8edf2', borderRadius:9, padding:'16px 14px', background:'white', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all 0.2s' }}
                          onClick={() => nav('/buy')}
                          onMouseEnter={e => e.currentTarget.style.borderColor='#00b48a'}
                          onMouseLeave={e => e.currentTarget.style.borderColor='#e8edf2'}>
                          <div style={{ fontSize:26, marginBottom:8 }}>📜</div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a2332', marginBottom:3 }}>Cert Requests</div>
                          <div style={{ fontSize:10, color:'#8492a6' }}>Issue new certificate</div>
                        </button>
                        <button style={{ border:'1.5px solid #e8edf2', borderRadius:9, padding:'16px 14px', background:'white', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all 0.2s' }}
                          onClick={() => nav('/dashboard')}
                          onMouseEnter={e => e.currentTarget.style.borderColor='#00b48a'}
                          onMouseLeave={e => e.currentTarget.style.borderColor='#e8edf2'}>
                          <div style={{ fontSize:26, marginBottom:8 }}>🔄</div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a2332', marginBottom:3 }}>Renew Requests</div>
                          <div style={{ fontSize:10, color:'#8492a6' }}>Pending renewals</div>
                        </button>
                      </div>
                      <div style={{ background:'#f8fafc', border:'1px solid #e8edf2', borderRadius:8, padding:'11px 14px', fontSize:11, color:'#64748b', lineHeight:1.65 }}>
                        <strong style={{ color:'#1a2332' }}>Auto-renewal active</strong> — SSLVault polls every 5 minutes and renews certificates automatically before expiry. No action needed.
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── QUICK ACTIONS ── */}
                <div className="cc-widget" style={{ marginBottom:20 }}>
                  <div className="cc-widget-head">
                    <div>
                      <div className="cc-widget-title">Quick Actions</div>
                      <div className="cc-widget-sub">Common certificate lifecycle tasks</div>
                    </div>
                  </div>
                  <div className="cc-widget-body">
                    <div className="cc-actions-grid">
                      {ACTIONS.map(({ icon:Icon, color, bg, label, desc, fn }) => (
                        <button key={label} className="cc-action" onClick={fn}>
                          <div className="cc-action-ico" style={{ background: bg }}>
                            <Icon size={17} color={color} strokeWidth={1.8}/>
                          </div>
                          <div className="cc-action-label">{label}</div>
                          <div className="cc-action-desc">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── RECENT CERTS TABLE ── */}
                <div className="cc-widget">
                  <div className="cc-widget-head">
                    <div>
                      <div className="cc-widget-title">Recent Certificates</div>
                      <div className="cc-widget-sub">Latest {recent.length} certificates in your inventory</div>
                    </div>
                    <button className="cc-widget-link" onClick={() => nav('/dashboard')}>
                      View all {total} <ChevronRight size={11}/>
                    </button>
                  </div>
                  {recent.length === 0 ? (
                    <div className="cc-empty">
                      <div style={{ fontSize:11, color:'#8492a6' }}>No certificates yet.</div>
                    </div>
                  ) : (
                    <div style={{ overflowX:'auto' }}>
                      <table className="cc-table">
                        <thead>
                          <tr>
                            <th>Domain</th>
                            <th>Status</th>
                            <th>Expires</th>
                            <th>Type</th>
                            <th>Issued</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map(cert => {
                            const days = daysLeft(cert.expires_at)
                            const { color, bg, dot, label } = statusOf(days, cert.status)
                            return (
                              <tr key={cert.id} onClick={() => nav('/dashboard')}>
                                <td>
                                  <span className="cc-domain">{cert.domain}</span>
                                  {cert.is_sandbox && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:3, padding:'1px 5px' }}>SANDBOX</span>}
                                </td>
                                <td>
                                  <span className="cc-status-pill" style={{ color, background:bg }}>
                                    <span className="cc-dot" style={{ background:dot }}/>
                                    {label}
                                  </span>
                                </td>
                                <td style={{ color:'#64748b' }}>
                                  {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                </td>
                                <td>
                                  {cert.tss_order_id
                                    ? <span style={{ fontSize:10, fontWeight:700, color:'#185FA5', background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:3, padding:'2px 6px' }}>RapidSSL</span>
                                    : <span style={{ fontSize:11, color:'#64748b' }}>{cert.cert_type || 'SSL'}</span>}
                                </td>
                                <td style={{ color:'#64748b' }}>
                                  {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </div>

        {showInstall && <InstallModal onClose={() => setShowInstall(false)} nav={nav}/>}
      </div>
    </>
  )
}
