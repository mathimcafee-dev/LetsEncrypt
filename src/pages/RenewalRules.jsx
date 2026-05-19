import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Plus, Trash2, Save, RefreshCw, Clock, CheckCircle, AlertTriangle, ChevronDown, Settings, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const ACTION_COLORS = { auto: '#10b981', manual: '#3b82f6', notify: '#f59e0b' }
const ACTION_LABELS = { auto: 'Auto-renew', manual: 'Manual approval', notify: 'Notify only' }
const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', skipped: '#6b7280', done: '#10b981', failed: '#ef4444' }

function timeToExpiry(ts) {
  if (!ts) return '—'
  const d = Math.ceil((new Date(ts).getTime() - Date.now()) / 86400000)
  if (d < 0) return 'Expired'
  if (d === 0) return 'Today'
  return `${d}d`
}

export default function RenewalRules() {
  const [rules, setRules] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [qLoading, setQLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('rules')
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const callFn = useCallback(async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/renewal-engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    })
    return res.json()
  }, [])

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const r = await callFn({ action: 'list_rules' })
      setRules(r.rules || [])
    } finally { setLoading(false) }
  }, [callFn])

  const loadQueue = useCallback(async () => {
    setQLoading(true)
    try {
      const r = await callFn({ action: 'list_queue' })
      setQueue(r.queue || [])
    } finally { setQLoading(false) }
  }, [callFn])

  useEffect(() => { loadRules(); loadQueue() }, [])

  const saveRule = async () => {
    if (!editing) return
    const r = await callFn({ action: 'save_rule', rule: editing })
    if (r.error) { showToast(r.error, 'error'); return }
    showToast('Rule saved')
    setEditing(null)
    loadRules()
  }

  const deleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return
    await callFn({ action: 'delete_rule', rule_id: id })
    showToast('Rule deleted')
    loadRules()
  }

  const handleQueue = async (queue_id, action) => {
    await callFn({ action, queue_id })
    showToast(action === 'approve' ? 'Approved for renewal' : 'Skipped')
    loadQueue()
  }

  const runEngine = async () => {
    setRunning(true)
    try {
      const r = await callFn({ action: 'run' })
      showToast(`Engine ran — ${r.queued || 0} certs queued`)
      loadQueue()
    } finally { setRunning(false) }
  }

  const blank = { name: 'New rule', days_before: 30, action: 'notify', min_grade: '', apply_to: 'all', enabled: true }

  const pendingCount = queue.filter(q => q.status === 'pending').length

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '10px 18px', borderRadius: 10, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, fontSize: 13, color: toast.type === 'error' ? '#991b1b' : '#14532d' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RotateCcw size={22} color="#10b981" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Renewal engine</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Automate certificate renewals with smart rules</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runEngine} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #10b981', background: running ? '#d1fae5' : '#ecfdf5', cursor: running ? 'not-allowed' : 'pointer', fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            {running ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {running ? 'Running...' : 'Run now'}
          </button>
          <button onClick={() => setEditing({ ...blank })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0a0a0a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Plus size={14} /> New rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        {[['rules', 'Rules'], ['queue', `Queue${pendingCount ? ` (${pendingCount})` : ''}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: tab === k ? 600 : 400, color: tab === k ? '#111827' : '#6b7280', background: 'none', border: 'none', borderBottom: tab === k ? '2px solid #0a0a0a' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Rules tab */}
      {tab === 'rules' && (
        <>
          {editing && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{editing.id ? 'Edit rule' : 'New rule'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Rule name</label>
                  <input value={editing.name} onChange={e => setEditing(r => ({ ...r, name: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Days before expiry</label>
                  <input type="number" min={1} max={365} value={editing.days_before} onChange={e => setEditing(r => ({ ...r, days_before: parseInt(e.target.value) || 30 }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Action</label>
                  <select value={editing.action} onChange={e => setEditing(r => ({ ...r, action: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}>
                    <option value="notify">Notify only</option>
                    <option value="manual">Manual approval required</option>
                    <option value="auto">Auto-renew</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Min TLS grade (optional)</label>
                  <select value={editing.min_grade || ''} onChange={e => setEditing(r => ({ ...r, min_grade: e.target.value || null }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}>
                    <option value="">Any grade</option>
                    {['A', 'B', 'C', 'D'].map(g => <option key={g} value={g}>Grade {g} or better</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editing.enabled} onChange={e => setEditing(r => ({ ...r, enabled: e.target.checked }))} />
                  Rule enabled
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={saveRule} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0a0a0a', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  <Save size={14} /> Save rule
                </button>
                <button onClick={() => setEditing(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading rules...</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
              <Settings size={32} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14, color: '#9ca3af' }}>No renewal rules yet</p>
              <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Create a rule to automate certificate renewals</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map(rule => (
                <div key={rule.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: rule.enabled ? 1 : 0.6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: rule.enabled ? ACTION_COLORS[rule.action] : '#d1d5db', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{rule.name}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${ACTION_COLORS[rule.action]}20`, color: ACTION_COLORS[rule.action], fontWeight: 500 }}>{ACTION_LABELS[rule.action]}</span>
                      {!rule.enabled && <span style={{ fontSize: 11, color: '#9ca3af' }}>disabled</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                      Triggers {rule.days_before} days before expiry
                      {rule.min_grade && ` · Min grade ${rule.min_grade}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditing({ ...rule })} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>Edit</button>
                    <button onClick={() => deleteRule(rule.id)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Queue tab */}
      {tab === 'queue' && (
        <>
          {qLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading queue...</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
              <CheckCircle size={32} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 14, color: '#9ca3af' }}>Renewal queue is empty</p>
              <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Run the engine to evaluate your rules against current certificates</p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              {queue.map((item, i) => {
                const cert = item.certificates
                const statusColor = STATUS_COLORS[item.status] || '#6b7280'
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < queue.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{cert?.domain || 'Unknown domain'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Clock size={11} color="#9ca3af" />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Expires: {timeToExpiry(cert?.expires_at)}</span>
                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: `${statusColor}15`, color: statusColor, fontWeight: 500 }}>{item.status}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{ACTION_LABELS[item.action]}</span>
                      </div>
                    </div>
                    {item.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleQueue(item.id, 'approve')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #a7f3d0', background: '#ecfdf5', cursor: 'pointer', fontSize: 12, color: '#065f46', fontWeight: 500 }}>
                          Approve
                        </button>
                        <button onClick={() => handleQueue(item.id, 'skip')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
