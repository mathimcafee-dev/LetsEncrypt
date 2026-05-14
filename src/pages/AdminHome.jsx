import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Users, Plus, LogOut, Eye,
  UserX, UserCheck, ChevronRight, ChevronDown,
  BarChart2, Copy, CheckCircle, Mail
} from 'lucide-react'

export default function AdminHome({ user, nav, account }) {
  const [section, setSection] = useState('tree')
  const [tree, setTree] = useState(null)
  const [flat, setFlat] = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviteResult, setInviteResult] = useState(null)
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [treeRes, statsRes] = await Promise.all([
        supabase.functions.invoke('account-manage', { body: { action: 'get_account_tree' } }),
        supabase.functions.invoke('account-manage', { body: { action: 'get_platform_stats' } }),
      ])
      if (treeRes.data) { setTree(treeRes.data.tree); setFlat(treeRes.data.flat || []) }
      if (statsRes.data) setPlatformStats(statsRes.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleViewAs(targetUser) {
    const { data, error } = await supabase.functions.invoke('account-manage', {
      body: { action: 'start_impersonation', target_user_id: targetUser.id }
    })
    if (!error && data?.ok) {
      sessionStorage.setItem('impersonation', JSON.stringify({
        session_id: data.session_id,
        target: data.target,
        admin: { id: user.id, company_name: 'SSLVault Admin', email: user.email },
        expires_at: data.expires_at,
      }))
      const dest = targetUser.role === 'sub_admin' ? '/reseller' : '/portal'
      nav(dest)
    }
  }

  async function handleSuspend(userId, currentStatus) {
    const action = currentStatus === 'active' ? 'suspend_account' : 'activate_account'
    const { data } = await supabase.functions.invoke('account-manage', {
      body: { action, target_user_id: userId }
    })
    if (data?.ok) loadAll()
  }

  async function handleInviteSubAdmin() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const { data, error } = await supabase.functions.invoke('account-manage', {
        body: { action: 'create_sub_admin', email: inviteEmail, company_name: inviteCompany }
      })
      if (error || data?.error) {
        alert(data?.error || 'Failed')
      } else {
        setInviteResult(data)
        setInviteEmail('')
        setInviteCompany('')
        loadAll()
      }
    } finally {
      setInviting(false)
    }
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    nav('/')
  }

  const NavItem = ({ id, label, Icon }) => (
    <button
      onClick={() => setSection(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', cursor: 'pointer', fontSize: 13,
        fontWeight: section === id ? 600 : 400,
        color: section === id ? '#fff' : 'rgba(255,255,255,0.6)',
        background: section === id ? 'rgba(124,58,237,0.2)' : 'transparent',
        borderLeft: section === id ? '3px solid #7c3aed' : '3px solid transparent',
        border: 'none', width: '100%', textAlign: 'left',
        fontFamily: 'inherit', borderRadius: '0 6px 6px 0',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={15} />{label}
    </button>
  )

  function RoleBadge({ role }) {
    const styles = {
      master_admin: { bg: '#ede9fe', color: '#5b21b6' },
      sub_admin: { bg: '#dbeafe', color: '#1e40af' },
      end_user: { bg: '#d1fae5', color: '#065f46' },
    }
    const s = styles[role] || styles.end_user
    return (
      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color }}>
        {role.replace('_', ' ')}
      </span>
    )
  }

  function AccountRow({ node, depth = 0 }) {
    const hasChildren = node.children?.length > 0
    const isExpanded = expanded[node.id] !== false // default expanded
    const isMe = node.id === user.id

    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: `10px 20px 10px ${20 + depth * 24}px`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: depth === 0 ? 'rgba(124,58,237,0.05)' : 'transparent',
        }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span style={{ width: 13, display: 'inline-block' }} />
          )}

          <div style={{ width: 30, height: 30, borderRadius: '50%', background: depth === 0 ? '#4c1d95' : depth === 1 ? '#1e3a8a' : '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {(node.company_name || node.email || '?')[0].toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
              {node.company_name || node.email}
              {isMe && <span style={{ color: '#7c3aed', fontSize: 11, marginLeft: 6 }}>(you)</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{node.email} · {node.cert_count || 0} cert{node.cert_count !== 1 ? 's' : ''}</div>
          </div>

          <RoleBadge role={node.role} />

          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
            background: node.status === 'active' ? '#d1fae5' : '#fee2e2',
            color: node.status === 'active' ? '#065f46' : '#991b1b',
          }}>{node.status}</span>

          {!isMe && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleViewAs(node)}
                style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Eye size={11} /> View as
              </button>
              <button
                onClick={() => handleSuspend(node.id, node.status)}
                style={{ background: node.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: node.status === 'active' ? '#f87171' : '#34d399', border: `1px solid ${node.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
              >
                {node.status === 'active' ? <UserX size={11} /> : <UserCheck size={11} />}
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && node.children.map((child) => (
          <AccountRow key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#1e293b', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Shield size={18} color="#7c3aed" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SSLVault</span>
          </div>
          <div style={{ fontSize: 11, color: '#7c3aed', paddingLeft: 26, fontWeight: 500 }}>Admin Console</div>
        </div>

        <nav style={{ flex: 1, paddingTop: 12 }}>
          <NavItem id="tree" label="Account Tree" Icon={Users} />
          <NavItem id="stats" label="Platform Stats" Icon={BarChart2} />
          <NavItem id="invite" label="Add Sub-Admin" Icon={Plus} />
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>

        {/* Account tree */}
        {section === 'tree' && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Account Tree</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>
              Full hierarchy of all accounts on SSLVault
            </p>
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading...</div>
              ) : tree ? (
                <AccountRow node={tree} depth={0} />
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No data</div>
              )}
            </div>
          </>
        )}

        {/* Platform stats */}
        {section === 'stats' && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Platform Stats</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>Live snapshot across all accounts</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { label: 'Sub-Admins (Resellers)', value: platformStats?.sub_admins, color: '#60a5fa' },
                { label: 'End Users', value: platformStats?.end_users, color: '#10b981' },
                { label: 'Active Certificates', value: platformStats?.active_certs, color: '#a78bfa' },
                { label: 'Total Orders', value: platformStats?.total_orders, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, padding: '24px 24px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 40, fontWeight: 600, color: s.color }}>{loading ? '–' : (s.value ?? 0)}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Invite sub-admin */}
        {section === 'invite' && (
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Add Sub-Admin (Reseller)</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 24px' }}>
              Sub-admins can create and manage their own end users.
            </p>

            {inviteResult ? (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid rgba(124,58,237,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <CheckCircle size={18} color="#10b981" />
                  <span style={{ color: '#fff', fontWeight: 600 }}>Sub-admin invite created</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Share this link:</div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <code style={{ color: '#7c3aed', fontSize: 11, flex: 1, wordBreak: 'break-all' }}>{inviteResult.invite_url}</code>
                  <button onClick={() => copyLink(inviteResult.invite_url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#6b7280' }}>
                    <Copy size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                  Expires: {new Date(inviteResult.expires_at).toLocaleString()}
                </div>
                <button onClick={() => { setInviteResult(null); setSection('tree') }} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Back to Tree
                </button>
              </div>
            ) : (
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="reseller@company.com"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Company Name</label>
                  <input
                    type="text"
                    value={inviteCompany}
                    onChange={e => setInviteCompany(e.target.value)}
                    placeholder="WebHost Pro"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleInviteSubAdmin}
                  disabled={inviting || !inviteEmail}
                  style={{ background: inviting || !inviteEmail ? '#334155' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer', width: '100%' }}
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
