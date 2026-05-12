import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Activity, Globe, Server, Zap,
  RefreshCw, AlertTriangle, CheckCircle, ChevronRight,
  BarChart2, Clock, X, Settings, FileText, Search,
  Database, Layout, Users, Wrench, CreditCard, LogOut,
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
  return { color:'#059669', bg:'#ecfdf5', dot:'#10b981', label:`${days}d left` }
}

export default function CLMHome({ user, nav }) {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showInstall, setShowInstall] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const email = user?.email || ''
  const name = email.split('@')[0] || 'Spartan'
  const hour = new Date().getHours()
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
  const active = certs.filter(c => c.status !== 'sandbox_revoked' && c.status !== 'revoked')
  const total = active.length
  const healthy = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 }).length
  const expiring = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 }).length
  const expired = active.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 }).length
  const chartData = [
    { range:'0-7d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>=0 && d<=7 }).length, fill:'#ef4444' },
    { range:'8-14d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>7 && d<=14 }).length, fill:'#f59e0b' },
    { range:'15-30d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>14 && d<=30 }).length, fill:'#f59e0b' },
    { range:'31-90d', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>30 && d<=90 }).length, fill:'#3b82f6' },
    { range:'90d+', count: active.filter(c => { const d = daysLeft(c.expires_at); return d!=null && d>90 }).length, fill:'#10b981' },
  ]
  const recent = certs.slice(0, 8)
  const ACTIONS = [
    { icon:Shield, color:'#00b48a', bg:'#ecfdf5', label:'Issue Certificate', desc:'RapidSSL DV', fn:() => nav('/buy') },
    { icon:FileText, color:'#3b82f6', bg:'#eff6ff', label:'Import Certificate', desc:'Bring your own', fn:() => nav('/import') },
    { icon:Activity, color:'#7c3aed', bg:'#f5f3ff', label:'Manage Certs', desc:'View inventory', fn:() => nav('/dashboard') },
    { icon:Globe, color:'#0ea5e9', bg:'#f0f9ff', label:'Manage DNS', desc:'Auto-validation', fn:() => nav('/dns-providers') },
    { icon:Server, color:'#d97706', bg:'#fffbeb', label:'Manage Servers', desc:'VPS & cPanel', fn:() => nav('/dashboard') },
    { icon:Zap, color:'#10b981', bg:'#ecfdf5', label:'Install Cert', desc:'VPS or shared', fn:() => setShowInstall(true) },
  ]
  const NAV_ITEM = [{ id:'dashboard', label:'Dashboard', icon:Layout },{ id:'certs', label:'Certificates', icon:Shield },{ id:'dns', label:'DNS Providers', icon:Globe },{ id:'servers', label:'Servers', icon:Server },{ id:'install', label:'Install Guide', icon:Download },{ id:'settings', label:'Settings', icon:Settings }]
  const NAV_ROUTE = { dashboard:'/', certs:'/dashboard', dns:'/dns-providers', servers:'/dashboard', install:'/install', settings:'/dashboard' }
  return (
    <>
      <style>{CSS}</style>
      <div className="cc-shell">
        <nav className={`cc-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="cc-sidebar-brand">
            <div className="cc-sidebar-logo"><Shield size={16} color="white" strokeWidth={2.5}/></div>
            <div><div className="cc-sidebar-brand-text">SSLVault</div><div className="cc-sidebar-brand-sub">CLM PLATFORM</div></div>
          </div>
          <button className="cc-sidebar-cta" onClick={() => nav('/buy')}><Plus size={13}/> Request a Certificate</button>
          <div className="cc-nav-section">
            {NAV_ITEM.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`cc-nav-item${activeNav===id ? ' active' : ''}`} onClick={() => { setActiveNav(id); setSidebarOpen(false); if(NAV_ROUTE[id])nav(NAV_ROUTE[id]) }}>
                <Icon size={15} strokeWidth={1.8}/>{label}
              </button>
            ))}
          </div>
          <div style={{ marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Signed in as</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
        </nav>
        <div className="cc-main">
          <div className="cc-topbar">
            <div className="cc-page-title">Overview</div>
            <div className="cc-topbar-right">
              <button className="cc-topbar-btn outline" onClick={() => nav('/dashboard')}><Activity size={13}/> View All Certs</button>
              <button className="cc-topbar-btn" onClick={() => nav('/buy')}><Plus size={13}/> Issue Certificate</button>
            </div>
          </div>
          <div className="cc-canvas">
            <div style={{ marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div><div style={{ fontSize:14, fontWeight:700, color:'#1a2332' }}>{greeting}, <span style={{ color:'#00b48a' }}>{name}</span></div></div>
              {expired > 0 && <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'7px 5px', cursor:'pointer' }} onClick={() => nav('/dashboard')}><AlertTriangle size={13} color="#dc2626"/><span style={{ fontSize:12, fontWeight:600, color:'#b91c1c' }}>{expired} expired</span><ChevronRight size={12} color="#dc2626"/></div>}
            </div>
            <div className="cc-kpi-row">
              {[{ label:'Total', val:total, sub:'certs', color:'#1a2332', bg:'#f4f6f9', icon:Shield },{ label:'Valid', val:healthy, sub:'30d+', color:'#059669', bg:'#ecfdf5', icon:CheckCircle },{ label:'Expiring', val:expiring, sub:'<30d', color:'#d97706', bg:'#fffbeb', icon:Clock },{ label:'Expired', val:expired, sub:'action needed', color:'#dc2626', bg:'#fef2f2', icon:AlertTriangle }].map(({ label, val, sub, color, bg, icon: Icon }) => (
                <div key={label} className="cc-kpi" onClick={() => nav('/dashboard')}>
                  <div className="cc-kpi-icon" style={{ background: bg }}><Icon size={20} color={color} strokeWidth={1.8}/></div>
                  <div><div className="cc-kpi-label">{label}</div><div className="cc-kpi-value" style={{ color }}>{loading ? '—' : val}</div><div className="cc-kpi-sub">{sub}</div></div>
                </div>
              ))}
            </div>
            <div className="cc-widget" style={{ marginBottom:20 }}>
              <div className="cc-widget-head"><div><div className="cc-widget-title">Quick Actions</div></div></div>
              <div className="cc-widget-body">
                <div className="cc-actions-grid">
                  {ACTIONS.map(({ icon:Icon, color, bg, label, desc, fn }) => (
                    <button key={label} className="cc-action" onClick={fn}>
                      <div className="cc-action-ico" style={{ background: bg }}><Icon size={17} color={color} strokeWidth={1.8}/></div>
                      <div className="cc-action-label">{label}</div>
                      <div className="cc-action-desc">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="cc-widget">
              <div className="cc-widget-head"><div><div className="cc-widget-title">Recent Certificates</div></div><button className="cc-widget-link" onClick={() => nav('/dashboard')}>View all <ChevronRight size={11}/></button></div>
              <div style={{ overflowX:'auto' }}><table className="cc-table">
                <thead><tr><th>Domain</th><th>Status</th><th>Expires</th><th>Type</th></tr></thead>
                <tbody>{recent.map(cert => {
                  const days = daysLeft(cert.expires_at)
                  const { color, bg, dot, label } = statusOf(days, cert.status)
                  return (
                    <tr key={cert.id} onClick={() => nav('/dashboard')}>
                      <td><span className="cc-domain">{cert.domain}</span></td>
                      <td><span className="cc-status-pill" style={{ color, background:bg }}><span className="cc-dot" style={{ background:dot }}/>{label}</span></td>
                      <td>{cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                      <td>{cert.tss_order_id ? 'RapidSSL' : cert.cert_type || 'SSL'}</td>
                    </tr>
                  )
                })}</tbody>
              </table></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
