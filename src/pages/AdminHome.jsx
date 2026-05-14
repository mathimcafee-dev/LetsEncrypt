import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Users, CheckCircle, XCircle, LogOut,
  Eye, UserX, UserCheck, ChevronRight, ChevronDown,
  BarChart2, Clock, RefreshCw, Download
} from 'lucide-react'
import { downloadAllOrdersAdmin, downloadResellerOrders } from '../lib/exportOrders'
import '../styles/design-v2.css'

const NAV = '#0d3c6e'
const ACCENT = '#0e7fc0'
const BG = '#f0f4f8'
const FONT = "'Segoe UI',system-ui,sans-serif"

export default function AdminHome({ user, nav }) {
  const [section, setSection] = useState('approvals')
  const [pending, setPending] = useState([])
  const [tree, setTree] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [acting, setActing] = useState({})
  const [downloading, setDownloading] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [pr, tr, sr] = await Promise.all([
        supabase.functions.invoke('account-manage', { body: { action: 'list_pending' } }),
        supabase.functions.invoke('account-manage', { body: { action: 'get_account_tree' } }),
        supabase.functions.invoke('account-manage', { body: { action: 'get_platform_stats' } }),
      ])
      if (pr.data) setPending(pr.data.pending || [])
      if (tr.data) setTree(tr.data.tree)
      if (sr.data) setStats(sr.data)
      if (!pr.data?.pending?.length) setSection('tree')
    } finally { setLoading(false) }
  }

  async function handleApprove(id) {
    setActing(a => ({ ...a, [id]: 'approving' }))
    const { data } = await supabase.functions.invoke('account-manage', { body: { action: 'approve_account', target_user_id: id } })
    if (data?.ok) { setPending(p => p.filter(a => a.id !== id)); loadAll() }
    setActing(a => ({ ...a, [id]: null }))
  }

  async function handleReject(id) {
    if (!confirm('Reject and delete this account?')) return
    setActing(a => ({ ...a, [id]: 'rejecting' }))
    await supabase.functions.invoke('account-manage', { body: { action: 'reject_account', target_user_id: id } })
    setPending(p => p.filter(a => a.id !== id))
    setActing(a => ({ ...a, [id]: null }))
    loadAll()
  }

  async function handleSuspend(id, status) {
    const action = status === 'active' ? 'suspend_account' : 'activate_account'
    await supabase.functions.invoke('account-manage', { body: { action, target_user_id: id } })
    loadAll()
  }

  async function handleImpersonate(target) {
    const { data } = await supabase.functions.invoke('account-manage', { body: { action: 'start_impersonation', target_user_id: target.id } })
    if (data?.ok) {
      sessionStorage.setItem('impersonation', JSON.stringify({ session_id: data.session_id, target: data.target, admin: { id: user.id, email: user.email, label: 'Master Admin' }, expires_at: data.expires_at }))
      nav(target.role === 'sub_reseller' ? '/reseller' : '/portal')
    }
  }

  async function handleDownloadAll() {
    setDownloading(d => ({ ...d, all: true }))
    try { await downloadAllOrdersAdmin() } catch (e) { alert(e.message) }
    setDownloading(d => ({ ...d, all: false }))
  }

  async function handleDownloadReseller(id, name) {
    setDownloading(d => ({ ...d, [id]: true }))
    try { await downloadResellerOrders(id, name) } catch (e) { alert(e.message) }
    setDownloading(d => ({ ...d, [id]: false }))
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  const NavItem = ({ id, label, Icon, badge }) => {
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
        <Icon size={13} /><span style={{ flex: 1 }}>{label}</span>
        {badge > 0 && <span style={{ background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>{badge}</span>}
      </button>
    )
  }

  function Badge({ label, type = 'neutral' }) {
    const styles = { blue: ['#eff6ff', '#0369a1'], green: ['#f0fdf4', '#15803d'], amber: ['#fffbeb', '#b45309'], red: ['#fef2f2', '#b91c1c'], neutral: ['#f8fafc', '#475569'] }
    const map = { master_admin: 'blue', sub_reseller: 'green', end_customer: 'neutral', active: 'green', pending: 'amber', suspended: 'red' }
    const [bg, color] = styles[map[label] || type]
    return <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: bg, color, border: `0.5px solid ${color}33` }}>{label.replace('_', ' ')}</span>
  }

  function TreeNode({ node, depth = 0 }) {
    const isMe = node.id === user.id
    const hasChildren = node.children?.length > 0
    const isExpanded = expanded[node.id] !== false
    const bgColor = depth === 0 ? '#f8fafc' : 'white'
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `10px 20px 10px ${20 + depth * 20}px`, borderBottom: '0.5px solid var(--v2-border)', background: bgColor, cursor: 'default' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0f4f8'}
          onMouseLeave={e => e.currentTarget.style.background = bgColor}
        >
          {hasChildren
            ? <button onClick={() => setExpanded(e => ({ ...e, [node.id]: !isExpanded }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)', padding: 0, display: 'flex', flexShrink: 0 }}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            : <span style={{ width: 12, flexShrink: 0 }} />}
          <div style={{ width: 28, height: 28, borderRadius: 6, background: depth === 0 ? ACCENT : depth === 1 ? NAV : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: depth < 2 ? '#fff' : '#475569', flexShrink: 0 }}>
            {(node.company_name || node.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--v2-text)', fontSize: 13, fontWeight: 500 }}>
              {node.company_name || node.email}{isMe && <span style={{ color: ACCENT, fontSize: 11, marginLeft: 6, fontWeight: 400 }}>(you)</span>}
            </div>
            <div style={{ color: 'var(--v2-text-3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.email} · {node.cert_count || 0} certs</div>
          </div>
          <Badge label={node.role} />
          <Badge label={node.status} />
          {!isMe && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => handleImpersonate(node)} className="v2-btn" style={{ fontSize: 11, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Eye size={10} /> View as
              </button>
              {node.role === 'sub_reseller' && (
                <button onClick={() => handleDownloadReseller(node.id, node.company_name || node.email)} disabled={!!downloading[node.id]} className="v2-btn" style={{ fontSize: 11, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Download size={10} /> {downloading[node.id] ? '…' : 'Orders'}
                </button>
              )}
              <button onClick={() => handleSuspend(node.id, node.status)} className="v2-btn" style={{ fontSize: 11, padding: '4px 8px', color: node.status === 'active' ? 'var(--v2-red-text)' : '#15803d' }}>
                {node.status === 'active' ? <UserX size={10} /> : <UserCheck size={10} />}
              </button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && node.children.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  const titles = { approvals: 'Approvals', tree: 'Account Tree', stats: 'Platform Stats' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: FONT }}>
      <div style={{ background: NAV, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={13} color="white" strokeWidth={2.5} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>SSLVault</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>ADMIN CONSOLE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</span>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'inherit', padding: 0 }}><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, background: BG }}>
        <nav style={{ width: 210, background: NAV, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 44, height: 'calc(100vh - 44px)', overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: '8px 0 2px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase', padding: '6px 16px 4px' }}>Admin</div>
            <NavItem id="approvals" label="Approvals" Icon={Clock} badge={pending.length} />
            <NavItem id="tree" label="Account Tree" Icon={Users} />
            <NavItem id="stats" label="Platform Stats" Icon={BarChart2} />
          </div>
          <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </nav>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'white', borderBottom: '1px solid #e8edf2', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', position: 'sticky', top: 44, zIndex: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2332', letterSpacing: '-0.3px' }}>{titles[section]}</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {section === 'approvals' && (
              <div style={{ padding: 28 }}>
                <div style={{ marginBottom: 20 }}><div className="v2-h1">Pending Approvals</div><div className="v2-subtitle">Sub-resellers awaiting your approval</div></div>
                {loading ? <div style={{ color: 'var(--v2-text-3)', fontSize: 13 }}>Loading…</div>
                  : pending.length === 0 ? (
                    <div className="v2-card" style={{ padding: 32, textAlign: 'center' }}>
                      <CheckCircle size={28} color="#15803d" style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 600, color: 'var(--v2-text)', marginBottom: 4 }}>All clear</div>
                      <div style={{ color: 'var(--v2-text-3)', fontSize: 13 }}>No pending registrations</div>
                    </div>
                  ) : (
                    <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {pending.map((a, i) => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < pending.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ACCENT, flexShrink: 0 }}>
                            {(a.company_name || a.email)[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--v2-text)' }}>{a.company_name}</div>
                            <div style={{ color: 'var(--v2-text-3)', fontSize: 12 }}>{a.email} · {new Date(a.created_at).toLocaleDateString()}</div>
                          </div>
                          <button onClick={() => handleApprove(a.id)} disabled={!!acting[a.id]} className="v2-btn v2-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <CheckCircle size={12} /> {acting[a.id] === 'approving' ? 'Approving…' : 'Approve'}
                          </button>
                          <button onClick={() => handleReject(a.id)} disabled={!!acting[a.id]} className="v2-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--v2-red-text)', background: 'var(--v2-red-bg)', borderColor: 'var(--v2-red-border)' }}>
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {section === 'tree' && (
              <div style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div><div className="v2-h1">Account Tree</div><div className="v2-subtitle">All resellers and their customers</div></div>
                  <button onClick={loadAll} className="v2-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><RefreshCw size={12} /> Refresh</button>
                </div>
                <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>Loading…</div>
                    : tree ? <TreeNode node={tree} depth={0} />
                    : <div style={{ padding: 24, textAlign: 'center', color: 'var(--v2-text-3)', fontSize: 13 }}>No accounts yet</div>}
                </div>
              </div>
            )}

            {section === 'stats' && (
              <div style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div><div className="v2-h1">Platform Stats</div><div className="v2-subtitle">Live snapshot across all accounts</div></div>
                  <button onClick={handleDownloadAll} disabled={!!downloading.all} className="v2-btn v2-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <Download size={13} /> {downloading.all ? 'Downloading…' : 'Download All Orders'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {[
                    { label: 'Active Resellers', value: stats?.active_resellers, color: ACCENT },
                    { label: 'End Customers', value: stats?.end_customers, color: '#15803d' },
                    { label: 'Active Certificates', value: stats?.active_certs, color: '#0369a1' },
                    { label: 'Total Orders', value: stats?.total_orders, color: '#b45309' },
                    { label: 'Pending Approvals', value: stats?.pending_approvals, color: '#b91c1c' },
                  ].map(s => (
                    <div key={s.label} className="v2-card" style={{ padding: '20px 22px' }}>
                      <div style={{ fontSize: 34, fontWeight: 600, color: s.color, letterSpacing: '-1px' }}>{loading ? '–' : (s.value ?? 0)}</div>
                      <div style={{ fontSize: 12, color: 'var(--v2-text-3)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
