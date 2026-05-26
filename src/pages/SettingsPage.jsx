// SettingsPage.jsx — full alert preferences + alert log
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'
import {
  User, Bell, Shield, Trash2, LogOut, Check, RefreshCw,
  Mail, Plus, X, Send, AlertTriangle, Clock, ChevronDown, ChevronUp, Key, Copy
} from 'lucide-react'

const FONT = "var(--v2-font, 'Segoe UI', system-ui, sans-serif)"

// All configurable alert types
const ALERT_TYPE_DEFS = [
  { id: 'cert_expiry',       label: 'Certificate expiring',     desc: 'Email at 30/14/7 days before cert expires',             color: '#f87171' },
  { id: 'order_renewal',     label: 'Subscription renewal',     desc: 'Email before annual order subscription renews',         color: '#ffffff' },
  { id: 'cert_issued',       label: 'Certificate issued',       desc: 'Confirmation when a new cert is successfully issued',   color: '#ffffff' },
  { id: 'cert_installed',    label: 'Certificate installed',    desc: 'When your agent installs a cert on a server',           color: '#ffffff' },
  { id: 'renewal_succeeded', label: 'Auto-renewal succeeded',   desc: 'Confirmation after zero-touch renewal completes',       color: '#ffffff' },
  { id: 'renewal_failed',    label: 'Auto-renewal failed',      desc: 'Alert when auto-renewal fails (with retry info)',       color: '#f87171' },
  { id: 'agent_offline',     label: 'Agent offline',            desc: 'When a VPS agent stops responding (1h cooldown)',       color: '#f87171' },
  { id: 'shadow_found',      label: 'Shadow IT detected',       desc: 'Unregistered certs found in connected CAs',            color: '#ffffff' },
  { id: 'pqc_risk',          label: 'PQC risk detected',        desc: 'RSA-2048 certs flagged (once per cert)',                color: '#ffffff' },
  { id: 'no_dns_warning',    label: 'DNS not connected',        desc: 'Cert cannot auto-renew — DNS provider missing',         color: '#ffffff' },
]

const DEFAULT_TYPES = ['cert_expiry','order_renewal','cert_issued','cert_installed','renewal_succeeded','renewal_failed','agent_offline','shadow_found','pqc_risk']
const DEFAULT_DAYS  = [30, 14, 7]
const ALL_THRESHOLD_OPTIONS = [30, 21, 14, 7, 3, 1]

const TYPE_ICONS = {
  cert_expiry: '⏰', order_renewal: '🔄', cert_issued: '✅', cert_installed: '🚀',
  renewal_succeeded: '✅', renewal_failed: '⚠️', agent_offline: '🔴',
  shadow_found: '🔍', pqc_risk: '⚛️', no_dns_warning: '⚠️', weekly_digest: '📊',
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Toggle({ on, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: on ? '#ffffff' : '#ffffff', position: 'relative',
      transition: 'background .18s', flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: 'var(--v2-bg)', transition: 'left .18s',
        boxShadow: '0 1px 3px rgba(0,0,0,.15)',
      }}/>
    </button>
  )
}

function Section({ title, icon: Icon, children, collapsible = false }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: 'var(--v2-bg)', border: '0.5px solid var(--v2-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={collapsible ? () => setOpen(v => !v) : undefined}
        style={{ padding: '11px 18px', borderBottom: open ? '0.5px solid #e6fbf5' : 'none',
          fontSize:10, fontWeight: 700, color: 'var(--v2-text-2)', textTransform: 'uppercase',
          letterSpacing: '.6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: collapsible ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={11}/>}
          {title}
        </div>
        {collapsible && (open ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
      </div>
      {open && <div style={{ padding: '14px 18px' }}>{children}</div>}
    </div>
  )
}

function Row({ label, desc, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid #f0fdf9' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 1 }}>{label}</div>
        {desc && <div style={{ fontSize:11, color: 'var(--v2-text-3)' }}>{desc}</div>}
      </div>
      {children}
    </div>
  )
}

// Alert log table row
function LogRow({ log }) {
  const meta = {
    cert_expiry: { icon: '⏰', color: '#f87171' }, order_renewal: { icon: '🔄', color: '#ffffff' },
    cert_issued: { icon: '✅', color: '#ffffff' }, cert_installed: { icon: '🚀', color: '#ffffff' },
    renewal_succeeded: { icon: '✅', color: '#ffffff' }, renewal_failed: { icon: '⚠️', color: '#f87171' },
    agent_offline: { icon: '🔴', color: '#f87171' }, shadow_found: { icon: '🔍', color: '#ffffff' },
    pqc_risk: { icon: '⚛️', color: '#ffffff' }, no_dns_warning: { icon: '⚠️', color: '#ffffff' },
    weekly_digest: { icon: '📊', color: '#0f2545' },
  }
  const m = meta[log.alert_type] || { icon: '📧', color: 'var(--v2-text-2)' }
  const ts = new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const domain = log.metadata?.domain || '—'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 80px 70px', gap: 12,
      padding: '9px 0', borderBottom: '0.5px solid #f0fdf9', alignItems: 'center', fontSize:12 }}>
      <span style={{ fontSize:14 }}>{m.icon}</span>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--v2-text)', fontSize:12 }}>
          {log.alert_type.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize:10, color: 'var(--v2-text-3)', fontFamily: 'monospace' }}>{domain}</div>
      </div>
      <div style={{ color: 'var(--v2-text-2)', fontSize:11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {log.recipient}
      </div>
      <div style={{ fontSize:10, color: 'var(--v2-text-3)' }}>{ts}</div>
      <div>
        <span style={{
          fontSize:10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
          background: log.status === 'sent' ? '#111111' : '#fef2f2',
          color: log.status === 'sent' ? '#ffffff' : '#f87171',
        }}>{log.status}</span>
      </div>
    </div>
  )
}

// ── API Keys Panel ────────────────────────────────────────────────────
function ApiKeysPanel({ user }) {
  const [keys,      setKeys]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [label,     setLabel]     = useState('')
  const [creating,  setCreating]  = useState(false)
  const [newKey,    setNewKey]    = useState(null)  // shown once after creation
  const [copied,    setCopied]    = useState(false)
  const [revoking,  setRevoking]  = useState(null)

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('api_keys')
      .select('id, label, key_prefix, last_used_at, calls_today, created_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    setKeys(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const createKey = async () => {
    if (!label.trim()) return
    setCreating(true)
    // Generate a secure random key
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const apiKey = `sv_live_${raw}`
    const prefix = apiKey.slice(0, 14)
    // Hash for storage (simple sha-256 via subtle crypto)
    const msgBuffer = new TextEncoder().encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id, label: label.trim(),
      key_hash: hashHex, key_prefix: prefix,
      calls_today: 0,
    })
    if (!error) {
      setNewKey(apiKey)
      setLabel('')
      load()
    }
    setCreating(false)
  }

  const revoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    setRevoking(id)
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    setRevoking(null)
    load()
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'

  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 4 }}>API Keys</div>
      <div style={{ fontSize:12, color: 'var(--v2-text-3)', marginBottom: 16, lineHeight: 1.6 }}>
        Use API keys to integrate SSLVault into your own tools and pipelines. Each key is shown once — store it securely.
      </div>

      {/* New key revealed */}
      {newKey && (
        <div style={{ background: '#111111', border: '0.5px solid #A8E6DE', borderRadius: 8,
          padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize:11, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>
            ✓ Key created — copy it now, it won't be shown again
          </div>
          <div style={{ background: '#ffffff', borderRadius: 6, padding: '8px 10px',
            fontFamily: 'monospace', fontSize:11, color: '#a3e635', wordBreak: 'break-all', marginBottom: 8 }}>
            {newKey}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(newKey); setCopied(true); setTimeout(()=>setCopied(false),2000) }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#4ade80',
              border: 'none', borderRadius: 6, padding: '6px 12px', fontSize:11,
              color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' }}>
            {copied ? <><Check size={10}/> Copied!</> : <><Copy size={10}/> Copy key</>}
          </button>
        </div>
      )}

      {/* Create new key */}
      <div style={{ background: 'var(--v2-surface-3)', border: '0.5px solid var(--v2-border)',
        borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize:11, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 8 }}>Create new key</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            placeholder="Key label (e.g. Deploy pipeline, Monitoring)"
            style={{ flex: 1, fontSize:12 }} />
          <button onClick={createKey} disabled={creating || !label.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px',
              background: creating || !label.trim() ? 'var(--v2-border)' : 'var(--v2-accent)',
              border: 'none', borderRadius: 7, fontSize:12, fontWeight: 600,
              color: creating || !label.trim() ? 'var(--v2-text-3)' : '#000000',
              cursor: creating || !label.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {creating ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }} /> : <Plus size={11} />}
            Create
          </button>
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--v2-text-3)', fontSize:12 }}>
          Loading…
        </div>
      ) : keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Key size={24} style={{ color: 'var(--v2-text-3)', margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize:12, color: 'var(--v2-text-3)' }}>No API keys yet.</div>
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--v2-border)', borderRadius: 8, overflow: 'hidden' }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderBottom: i < keys.length-1 ? '0.5px solid var(--v2-border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--v2-surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Key size={13} color="var(--v2-text-3)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize:12, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 2 }}>{k.label}</div>
                <div style={{ display: 'flex', gap: 10, fontSize:10, color: 'var(--v2-text-3)' }}>
                  <span style={{ fontFamily: 'monospace' }}>{k.key_prefix}…</span>
                  <span>Created {fmtDate(k.created_at)}</span>
                  {k.last_used_at && <span>Last used {fmtDate(k.last_used_at)}</span>}
                  {k.calls_today > 0 && <span>{k.calls_today} calls today</span>}
                </div>
              </div>
              <button onClick={() => revoke(k.id)} disabled={revoking === k.id}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none',
                  border: '0.5px solid #fecaca', borderRadius: 6, padding: '5px 10px',
                  fontSize:11, color: '#f87171', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                <Trash2 size={10} />
                {revoking === k.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--v2-surface-3)',
        borderRadius: 7, fontSize:11, color: 'var(--v2-text-3)', lineHeight: 1.6 }}>
        Use your key in requests: <span style={{ fontFamily: 'monospace', color: 'var(--v2-text-2)' }}>
          Authorization: Bearer sv_live_…
        </span>
      </div>
    </div>
  )
}

export default function SettingsPage({ user }) {
  const isMobile = useIsMobile()
  // Settings state
  const [emailAlerts, setEmailAlerts]       = useState(true)
  const [alertDays, setAlertDays]           = useState(DEFAULT_DAYS)
  const [alertTypes, setAlertTypes]         = useState(DEFAULT_TYPES)
  const [extraEmails, setExtraEmails]       = useState([])
  const [slackWebhook, setSlackWebhook]     = useState('')
  const [digestEnabled, setDigestEnabled]   = useState(false)

  // UI state
  const [activeTab, setActiveTab]   = useState('preferences')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [newEmail, setNewEmail]     = useState('')
  const [emailError, setEmailError] = useState('')

  // Test send state
  const [testType, setTestType]     = useState('cert_expiry')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Alert log state
  const [logs, setLogs]             = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsTotal, setLogsTotal]   = useState(0)
  const [logsPage, setLogsPage]     = useState(0)
  const [logsTypeFilter, setLogsTypeFilter] = useState('')

  const email     = user?.email || ''
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  // Load settings
  useEffect(() => {
    if (!user) return
    supabase.from('user_settings')
      .select('email_alerts,alert_days,alert_types,extra_emails,slack_webhook,digest_enabled')
      .eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setEmailAlerts(data.email_alerts ?? true)
          setAlertDays(data.alert_days || DEFAULT_DAYS)
          setAlertTypes(data.alert_types || DEFAULT_TYPES)
          setExtraEmails(data.extra_emails || [])
          setSlackWebhook(data.slack_webhook || '')
          setDigestEnabled(data.digest_enabled || false)
        }
        setLoading(false)
      })
  }, [user])

  // Load alert log
  const loadLogs = useCallback(async (page = 0, typeFilter = '') => {
    if (!user) return
    setLogsLoading(true)
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) { setLogsLoading(false); return }

    const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
    const SRK = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
    // Use Supabase directly with RLS (user is authenticated)
    let q = supabase.from('alert_log')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * 20, page * 20 + 19)
    if (typeFilter) q = q.eq('alert_type', typeFilter)
    const { data, count } = await q
    setLogs(data || [])
    setLogsTotal(count || 0)
    setLogsLoading(false)
  }, [user])

  useEffect(() => {
    if (activeTab === 'log') loadLogs(logsPage, logsTypeFilter)
  }, [activeTab, logsPage, logsTypeFilter, loadLogs])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('user_settings').upsert({
      user_id:       user.id,
      email_alerts:  emailAlerts,
      alert_days:    alertDays,
      alert_types:   alertTypes,
      extra_emails:  extraEmails,
      slack_webhook: slackWebhook || null,
      digest_enabled: digestEnabled,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const toggleDay = (d) => {
    setAlertDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => b - a))
  }
  const toggleType = (id) => {
    setAlertTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const addExtraEmail = () => {
    const e = newEmail.trim().toLowerCase()
    if (!e.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setEmailError('Invalid email address'); return }
    if (extraEmails.includes(e)) { setEmailError('Already added'); return }
    if (e === email) { setEmailError('Same as your account email'); return }
    setExtraEmails(prev => [...prev, e])
    setNewEmail(''); setEmailError('')
  }
  const removeExtraEmail = (e) => setExtraEmails(prev => prev.filter(x => x !== e))

  const sendTestEmail = async () => {
    if (!user) return
    setTestSending(true); setTestResult(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const EDGE_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/send-alert'
      // Use anon key — but send-alert requires service role. Use edge function proxy via supabase.functions
      const { data, error } = await supabase.functions.invoke('send-alert', {
        body: {
          action: 'test',
          type: testType,
          to: email,
          user_id: user.id,
          domain: 'test.example.com',
          data: {
            days_left: 7,
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            threshold: 7,
            product: 'RapidSSL DV',
            server_name: 'test-server',
            new_expiry: new Date(Date.now() + 180 * 86400000).toISOString(),
            agent_name: 'test-agent',
            last_seen_at: new Date(Date.now() - 20 * 60000).toISOString(),
            mins_since_seen: 20,
            shadow_count: 3,
            shadow_domains: ['example.com', 'staging.example.com', 'api.example.com'],
            ca_name: 'DigiCert',
            key_size: 2048,
            total_certs: 12, expiring_30: 2, active_certs: 10, active_agents: 1,
            cert_rows: [{ domain: 'example.com', days: 7 }, { domain: 'staging.example.com', days: 14 }],
          },
        }
      })
      if (error) throw new Error(error.message)
      setTestResult({ ok: true, msg: `Test email sent to ${email}` })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message || 'Send failed' })
    }
    setTestSending(false)
  }

  const handleSignOut = async () => { await supabase.auth.signOut() }

  if (loading) return (
    <div style={{ padding: 'clamp(16px,16vw,48px) 28px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--v2-text-3)', fontSize:13, fontFamily: 'inherit' }}>
      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Loading…
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '0 0 60px', fontFamily: 'inherit', maxWidth: 680 }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 18px 0', marginBottom: 4 }}>
        {[['preferences', 'Preferences', Bell], ['log', 'Alert Log', Clock], ['api', 'API Keys', Key]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', fontSize:12, fontWeight: 600,
              fontFamily: 'inherit', transition: 'all .15s',
              background: activeTab === id ? '#000000' : 'transparent',
              color: activeTab === id ? '#ffffff' : 'rgba(255,255,255,0.38)',
              borderBottom: activeTab === id ? '2px solid #0d9488' : '2px solid transparent',
            }}>
            <Icon size={12}/>{label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 18px' }}>
        {/* ── PREFERENCES TAB ─────────────────────────────────────────── */}
        {activeTab === 'preferences' && <>

          {/* Account */}
          <Section title="Account" icon={User}>
            <Row label="Email address" desc="Your sign-in email">
              <span style={{ fontSize:12, color: 'var(--v2-text-2)', fontFamily: 'monospace' }}>{email}</span>
            </Row>
            <Row label="Member since">
              <span style={{ fontSize:12, color: 'var(--v2-text-2)' }}>{createdAt}</span>
            </Row>
            <Row label="Plan" desc="Free for personal and indie use" last>
              <span style={{ fontSize:11, fontWeight: 600, color: '#ffffff', background: '#111111',
                border: '0.5px solid #A8E6DE', borderRadius: 4, padding: '3px 8px' }}>Free</span>
            </Row>
          </Section>

          {/* Alert types */}
          <Section title="Alert types" icon={Bell}>
            <Row label="Email alerts enabled" desc="Master switch for all email alerts">
              <Toggle on={emailAlerts} onClick={() => setEmailAlerts(v => !v)}/>
            </Row>
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 10 }}>
                Choose which events trigger an email:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALERT_TYPE_DEFS.map(({ id, label, desc, color }) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '8px 12px', borderRadius: 8,
                    background: alertTypes.includes(id) ? '#000000' : 'transparent',
                    border: `1px solid ${alertTypes.includes(id) ? '#ffffff' : 'transparent'}`,
                    opacity: emailAlerts ? 1 : 0.45, transition: 'all .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{label}</div>
                        <div style={{ fontSize:10, color: 'var(--v2-text-3)' }}>{desc}</div>
                      </div>
                    </div>
                    <Toggle on={alertTypes.includes(id)} onClick={() => toggleType(id)} disabled={!emailAlerts}/>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Expiry thresholds */}
          <Section title="Expiry alert thresholds" icon={Clock}>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 10 }}>
              Alert when a certificate is within this many days of expiry:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_THRESHOLD_OPTIONS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  disabled={!emailAlerts}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize:12, fontWeight: 500,
                    cursor: emailAlerts ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    opacity: emailAlerts ? 1 : 0.45, transition: 'all 0.15s',
                    background: alertDays.includes(d) ? '#e0f7fa' : '#000000',
                    color: alertDays.includes(d) ? '#0e7490' : 'rgba(255,255,255,0.38)',
                    border: alertDays.includes(d) ? '1px solid #a5f3fc' : '1px solid #99f6e4' }}>
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </Section>

          {/* Additional recipients */}
          <Section title="Additional recipients" icon={Mail}>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 12 }}>
              Send all alerts to these email addresses in addition to your account email.
            </div>
            {extraEmails.map(e => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', background: 'var(--v2-surface-3)', border: '1px solid #99f6e4',
                borderRadius: 7, marginBottom: 6 }}>
                <span style={{ fontSize:12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{e}</span>
                <button onClick={() => removeExtraEmail(e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)', padding: 2 }}>
                  <X size={12}/>
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError('') }}
                onKeyDown={e => e.key === 'Enter' && addExtraEmail()}
                placeholder="name@example.com"
                style={{ flex: 1, padding: '7px 10px', border: `1px solid ${emailError ? '#fecaca' : '#ffffff'}`,
                  borderRadius: 7, fontSize:12, fontFamily: 'monospace', outline: 'none',
                  background: emailError ? '#fef2f2' : '#000000' }}/>
              <button onClick={addExtraEmail}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                  background: '#ffffff', color: '#ffffff', border: 'none', borderRadius: 7,
                  fontSize:12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={11}/> Add
              </button>
            </div>
            {emailError && <div style={{ fontSize:11, color: '#f87171', marginTop: 5 }}>{emailError}</div>}
          </Section>

          {/* Slack */}
          <Section title="Slack webhook" collapsible>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 10 }}>
              Get all alerts in Slack. Paste an Incoming Webhook URL from your Slack workspace.
            </div>
            <input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #99f6e4',
                borderRadius: 7, fontSize:11, fontFamily: 'monospace', outline: 'none',
                boxSizing: 'border-box' }}/>
          </Section>

          {/* Weekly digest */}
          <Section title="Weekly digest" collapsible>
            <Row label="Portfolio digest email" desc="Monday 8am — summary of all certs, agents, and expiry status" last>
              <Toggle on={digestEnabled} onClick={() => setDigestEnabled(v => !v)}/>
            </Row>
          </Section>

          {/* Test send */}
          <Section title="Test alert" icon={Send}>
            <div style={{ fontSize:11, color: 'var(--v2-text-3)', marginBottom: 12 }}>
              Send a test email to verify your alert settings are working.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={testType} onChange={e => setTestType(e.target.value)}
                style={{ flex: 1, minWidth: 180, padding: '7px 10px', border: '1px solid #99f6e4',
                  borderRadius: 7, fontSize:12, fontFamily: 'inherit', outline: 'none', background: 'var(--v2-bg)' }}>
                {ALERT_TYPE_DEFS.map(({ id, label }) => (
                  <option key={id} value={id}>{TYPE_ICONS[id]} {label}</option>
                ))}
              </select>
              <button onClick={sendTestEmail} disabled={testSending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                  background: testSending ? '#ffffff' : '#0f2545', color: testSending ? 'rgba(255,255,255,0.38)' : '#000000',
                  border: 'none', borderRadius: 7, fontSize:12, fontWeight: 600,
                  cursor: testSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {testSending ? <><RefreshCw size={11} className="spin"/> Sending…</> : <><Send size={11}/> Send test</>}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 7, fontSize:12,
                background: testResult.ok ? '#111111' : '#fef2f2',
                color: testResult.ok ? '#ffffff' : '#f87171',
                border: `1px solid ${testResult.ok ? '#6ee7b7' : '#fecaca'}` }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
              </div>
            )}
          </Section>

          {/* Security */}
          <Section title="Security" icon={Shield}>
            <Row label="Authentication" desc="Managed via Supabase Auth">
              <span style={{ fontSize:11, color: 'var(--v2-text-2)' }}>Magic link</span>
            </Row>
            <Row label="Private key storage" desc="AES-256-GCM encrypted at rest" last>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize:11, fontWeight: 500, color: '#ffffff' }}>
                <Shield size={11}/> Encrypted
              </span>
            </Row>
          </Section>

          {/* Account actions */}
          <Section title="Account actions" icon={User}>
            <Row label="Sign out" desc="Sign out on this device">
              <button onClick={handleSignOut}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--v2-bg)',
                  color: 'var(--v2-text-2)', border: '0.5px solid var(--v2-border)', borderRadius: 6,
                  padding: '6px 12px', fontSize:11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <LogOut size={11}/> Sign out
              </button>
            </Row>
            <Row label="Delete account" desc="Permanently delete your account and all data" last>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--v2-bg)',
                color: '#f87171', border: '0.5px solid #fecaca', borderRadius: 6,
                padding: '6px 12px', fontSize:11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={11}/> Delete account
              </button>
            </Row>
          </Section>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: saving ? '#ffffff' : saved ? '#4ade80' : '#ffffff',
                color: saving ? 'rgba(255,255,255,0.38)' : '#000000', border: 'none', borderRadius: 7,
                padding: '10px 22px', fontSize:12, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
              {saving ? <><RefreshCw size={12} className="spin"/> Saving…</>
                : saved ? <><Check size={12}/> Saved</>
                : 'Save preferences'}
            </button>
          </div>
        </>}

        {/* ── ALERT LOG TAB ───────────────────────────────────────────── */}
        {activeTab === 'log' && (
          <div style={{ background: 'var(--v2-bg)', border: '0.5px solid var(--v2-border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--v2-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize:10, fontWeight: 700, color: 'var(--v2-text-2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                Alert log {logsTotal > 0 && `(${logsTotal} total)`}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={logsTypeFilter} onChange={e => { setLogsTypeFilter(e.target.value); setLogsPage(0) }}
                  style={{ padding: '5px 8px', border: '1px solid #99f6e4', borderRadius: 6,
                    fontSize:11, fontFamily: 'inherit', outline: 'none', background: 'var(--v2-bg)' }}>
                  <option value="">All types</option>
                  {ALERT_TYPE_DEFS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button onClick={() => loadLogs(logsPage, logsTypeFilter)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                    background: 'var(--v2-surface-3)', border: '1px solid #99f6e4', borderRadius: 6,
                    fontSize:11, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--v2-text-2)' }}>
                  <RefreshCw size={10}/> Refresh
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 80px 70px', gap: 12,
              padding: '8px 18px', fontSize:10, fontWeight: 700, color: 'var(--v2-text-3)',
              textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '0.5px solid var(--v2-border)' }}>
              <div/>
              <div>Type / Domain</div>
              <div>Recipient</div>
              <div>Sent at</div>
              <div>Status</div>
            </div>

            <div style={{ padding: '0 18px' }}>
              {logsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--v2-text-3)', fontSize:12 }}>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }}/>
                  Loading alert log…
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--v2-text-3)', fontSize:12 }}>
                  No alerts sent yet.{' '}
                  <button onClick={() => setActiveTab('preferences')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff',
                      fontSize:12, fontFamily: 'inherit', textDecoration: 'underline' }}>
                    Configure alerts →
                  </button>
                </div>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log}/>)
              )}
            </div>

            {/* Pagination */}
            {logsTotal > 20 && (
              <div style={{ padding: '10px 18px', borderTop: '0.5px solid #e6fbf5',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize:11, color: 'var(--v2-text-3)' }}>
                  Showing {logsPage * 20 + 1}–{Math.min((logsPage + 1) * 20, logsTotal)} of {logsTotal}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setLogsPage(p => Math.max(0, p - 1))} disabled={logsPage === 0}
                    style={{ padding: '4px 10px', border: '1px solid #99f6e4', borderRadius: 5,
                      fontSize:11, cursor: logsPage === 0 ? 'not-allowed' : 'pointer',
                      background: logsPage === 0 ? '#000000' : '#000000',
                      color: logsPage === 0 ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.6)', fontFamily: 'inherit' }}>
                    ← Prev
                  </button>
                  <button onClick={() => setLogsPage(p => p + 1)}
                    disabled={(logsPage + 1) * 20 >= logsTotal}
                    style={{ padding: '4px 10px', border: '1px solid #99f6e4', borderRadius: 5,
                      fontSize:11, cursor: (logsPage + 1) * 20 >= logsTotal ? 'not-allowed' : 'pointer',
                      background: (logsPage + 1) * 20 >= logsTotal ? '#000000' : '#000000',
                      color: (logsPage + 1) * 20 >= logsTotal ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.6)', fontFamily: 'inherit' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── API KEYS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'api' && (
          <ApiKeysPanel user={user} />
        )}
      </div>
    </div>
  )
}
