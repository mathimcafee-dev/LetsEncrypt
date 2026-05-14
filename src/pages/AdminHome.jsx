import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Users, CheckCircle, XCircle, LogOut,
  Eye, UserX, UserCheck, ChevronRight, ChevronDown,
  BarChart2, Clock, RefreshCw, Download
} from 'lucide-react'
import { downloadAllOrdersAdmin, downloadResellerOrders } from '../lib/exportOrders'

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
      const [pendingRes, treeRes, statsRes] = await Promise.all([
        supabase.functions.invoke('account-manage', { body: { action: 'list_pending' } }),
        supabase.functions.invoke('account-manage', { body: { action: 'get_account_tree' } }),
        supabase.functions.invoke('account-manage', { body: { action: 'get_platform_stats' } }),
      ])
      if (pendingRes.data) setPending(pendingRes.data.pending || [])
      if (treeRes.data) setTree(treeRes.data.tree)
      if (statsRes.data) setStats(statsRes.data)
      if (!pendingRes.data?.pending?.length) setSection('tree')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(accountId) {
    setActing(a => ({ ...a, [accountId]: 'approving' }))
    const { data } = await supabase.functions.invoke('account-manage', {
      body: { action: 'approve_account', target_user_id: accountId }
    })
    if (data?.ok) { setPending(p => p.filter(a => a.id !== accountId)); loadAll() }
    setActing(a => ({ ...a, [accountId]: null }))
  }

  async function handleReject(accountId) {
    if (!confirm('Reject and delete this account?')) return
    setActing(a => ({ ...a, [accountId]: 'rejecting' }))
    await supabase.functions.invoke('account-manage', { body: { action: 'reject_account', target_user_id: accountId } })
    setPending(p => p.filter(a => a.id !== accountId))
    setActing(a => ({ ...a, [accountId]: null }))
    loadAll()
  }

  async function handleSuspend(accountId, currentStatus) {
    const action = currentStatus === 'active' ? 'suspend_account' : 'activate_account'
    await supabase.functions.invoke('account-manage', { body: { action, target_user_id: accountId } })
    loadAll()
  }

  async function handleImpersonate(targetUser) {
    const { data } = await supabase.functions.invoke('account-manage', {
      body: { action: 'start_impersonation', target_user_id: targetUser.id }
    })
    if (data?.ok) {
      sessionStorage.setItem('impersonation', JSON.stringify({
        session_id: data.session_id, target: data.target,
        admin: { id: user.id, email: user.email, label: 'Master Admin' },
        expires_at: data.expires_at,
      }))
      nav(targetUser.role === 'sub_reseller' ? '/reseller' : '/portal')
    }
  }

  async function handleSignOut() { await supabase.auth.signOut(); nav('/') }

  async function handleDownloadAll() {
    setDownloading(d => ({ ...d, all: true }))
    try { await downloadAllOrdersAdmin() } catch(e) { alert(e.message) }
    setDownloading(d => ({ ...d, all: false }))
  }

  async function handleDownloadReseller(resellerId, resellerName) {
    setDownloading(d => ({ ...d, [resellerId]: true }))
    try { await downloadResellerOrders(resellerId, resellerName) } catch(e) { alert(e.message) }
    setDownloading(d => ({ ...d, [resellerId]: false }))
  }

  const NavItem = ({ id, label, Icon, badge }) => (
    <button onClick={() => setSection(id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
      cursor: 'pointer', fontSize: 13, fontWeight: section === id ? 600 : 400,
      color: section === id ? '#fff' : 'rgba(255,255,255,0.55)',
      background: section === id ? 'rgba(124,58,237,0.18)' : 'transparent',
      borderLeft: section === id ? '3px solid #7c3aed' : '3px solid transparent',
      border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
      borderRadius: '0 6px 6px 0', transition: 'all 0.15s',
    }}>
      <Icon size={15} /><span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{badge}</span>}
    </button>
  )

  function RoleBadge({ role }) {
    const map = { master_admin: ['#ede9fe','#5b21b6'], sub_reseller: ['#dbeafe','#1e40af'], end_customer: ['#d1fae5','#065f46'] }
    const [bg, color] = map[role] || ['#f1f5f9','#475569']
    return <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: bg, color, whiteSpace: 'nowrap' }}>{role.replace('_',' ')}</span>
  }

  function StatusBadge({ status }) {
    const map = { active: ['#d1fae5','#065f46'], pending: ['#fef3c7','#92400e'], suspended: ['#fee2e2','#991b1b'] }
    const [bg, color] = map[status] || ['#f1f5f9','#475569']
    return <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: bg, color }}>{status}</span>
  }

  function TreeNode({ node, depth = 0 }) {
    const isMe = node.id === user.id
    const hasChildren = node.children?.length > 0
    const isExpanded = expanded[node.id] !== false
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: `10px 20px 10px ${20 + depth * 24}px`, borderBottom: '1px solid rgba(255,255,255,0.04)', background: depth === 0 ? 'rgba(124,58,237,0.04)' : 'transparent' }}>
          {hasChildren
            ? <button onClick={() => setExpanded(e => ({ ...e, [node.id]: !isExpanded }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', flexShrink: 0 }}>
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            : <span style={{ width: 13, flexShrink: 0 }} />}
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: depth === 0 ? '#4c1d95' : depth === 1 ? '#1e3a8a' : '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(node.company_name || node.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{node.company_name || node.email}{isMe && <span style={{ color: '#7c3aed', fontSize: 11, marginLeft: 6 }}>(you)</span>}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.email} · {node.cert_count || 0} certs</div>
          </div>
          <RoleBadge role={node.role} />
          <StatusBadge status={node.status} />
          {!isMe && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => handleImpersonate(node)} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={11} /> View as
              </button>
              {node.role === 'sub_reseller' && (
                <button onClick={() => handleDownloadReseller(node.id, node.company_name || node.email)} disabled={downloading[node.id]} style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download size={11} /> {downloading[node.id] ? '...' : 'Orders'}
                </button>
              )}
              <button onClick={() => handleSuspend(node.id, node.status)} style={{ background: node.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: node.status === 'active' ? '#f87171' : '#34d399', border: `1px solid ${node.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
                {node.status === 'active' ? <UserX size={11} /> : <UserCheck size={11} />}
              </button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && node.children.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: 220, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Shield size={18} color="#7c3aed" /><span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SSLVault</span></div>
          <div style={{ fontSize: 11, color: '#7c3aed', paddingLeft: 26, fontWeight: 500 }}>Admin Console</div>
        </div>
        <nav style={{ flex: 1, paddingTop: 12 }}>
          <NavItem id="approvals" label="Approvals" Icon={Clock} badge={pending.length} />
          <NavItem id="tree" label="Account Tree" Icon={Users} />
          <NavItem id="stats" label="Platform Stats" Icon={BarChart2} />
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {section === 'approvals' && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Pending Approvals</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>Sub-resellers waiting for approval</p>
            {loading ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
              : pending.length === 0 ? (
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <CheckCircle size={32} color="#10b981" style={{ marginBottom: 12 }} />
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>All clear</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No pending registrations</div>
                </div>
              ) : (
                <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  {pending.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>{(a.company_name || a.email)[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{a.company_name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{a.email} · {new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleApprove(a.id)} disabled={!!acting[a.id]} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={13} /> {acting[a.id] === 'approving' ? 'Approving...' : 'Approve'}
                      </button>
                      <button onClick={() => handleReject(a.id)} disabled={!!acting[a.id]} style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}
        {section === 'tree' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div><h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Account Tree</h2><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>All resellers and their end customers</p></div>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={12} /> Refresh</button>
            </div>
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              {loading ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
                : tree ? <TreeNode node={tree} depth={0} />
                : <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No accounts yet</div>}
            </div>
          </>
        )}
        {section === 'stats' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>Platform Stats</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Live snapshot across all accounts</p>
              </div>
              <button onClick={handleDownloadAll} disabled={downloading.all} style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Download size={14} /> {downloading.all ? 'Downloading...' : 'Download All Orders'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[
                { label: 'Active Resellers', value: stats?.active_resellers, color: '#60a5fa' },
                { label: 'End Customers', value: stats?.end_customers, color: '#10b981' },
                { label: 'Active Certs', value: stats?.active_certs, color: '#a78bfa' },
                { label: 'Total Orders', value: stats?.total_orders, color: '#f59e0b' },
                { label: 'Pending Approvals', value: stats?.pending_approvals, color: '#f87171' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '22px 24px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 38, fontWeight: 600, color: s.color }}>{loading ? '–' : (s.value ?? 0)}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
