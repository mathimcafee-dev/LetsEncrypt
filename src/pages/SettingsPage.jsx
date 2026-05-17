// SettingsPage.jsx — full alert preferences + alert log
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  User, Bell, Shield, Trash2, LogOut, Check, RefreshCw,
  Mail, Plus, X, Send, AlertTriangle, Clock, ChevronDown, ChevronUp
} from 'lucide-react'

const FONT = "system-ui,-apple-system,'Segoe UI',sans-serif"

// All configurable alert types
const ALERT_TYPE_DEFS = [
  { id: 'cert_expiry',       label: 'Certificate expiring',     desc: 'Email at 30/14/7 days before cert expires',             color: '#dc2626' },
  { id: 'order_renewal',     label: 'Subscription renewal',     desc: 'Email before annual order subscription renews',         color: '#0891b2' },
  { id: 'cert_issued',       label: 'Certificate issued',       desc: 'Confirmation when a new cert is successfully issued',   color: '#059669' },
  { id: 'cert_installed',    label: 'Certificate installed',    desc: 'When your agent installs a cert on a server',           color: '#059669' },
  { id: 'renewal_succeeded', label: 'Auto-renewal succeeded',   desc: 'Confirmation after zero-touch renewal completes',       color: '#059669' },
  { id: 'renewal_failed',    label: 'Auto-renewal failed',      desc: 'Alert when auto-renewal fails (with retry info)',       color: '#dc2626' },
  { id: 'agent_offline',     label: 'Agent offline',            desc: 'When a VPS agent stops responding (1h cooldown)',       color: '#dc2626' },
  { id: 'shadow_found',      label: 'Shadow IT detected',       desc: 'Unregistered certs found in connected CAs',            color: '#d97706' },
  { id: 'pqc_risk',          label: 'PQC risk detected',        desc: 'RSA-2048 certs flagged (once per cert)',                color: '#7c3aed' },
  { id: 'no_dns_warning',    label: 'DNS not connected',        desc: 'Cert cannot auto-renew — DNS provider missing',         color: '#d97706' },
]

const DEFAULT_TYPES = ['cert_expiry','order_renewal','cert_issued','cert_installed','renewal_succeeded','renewal_failed','agent_offline','shadow_found','pqc_risk']
const DEFAULT_DAYS  = [30, 14, 7]
const ALL_THRESHOLD_OPTIONS = [30, 21, 14, 7, 3, 1]

const TYPE_ICONS = {
  cert_expiry: '⏰', order_renewal: '🔄', cert_issued: '✅', cert_installed: '🚀',
  renewal_succeeded: '✅', renewal_failed: '⚠️', agent_offline: '🔴',
  shadow_found: '🔍', pqc_risk: '⚛️', no_dns_warning: '⚠️', weekly_digest: '📊',
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: on ? '#0891b2' : '#e2e8f0', position: 'relative',
      transition: 'background .18s', flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: 'white', transition: 'left .18s',
        boxShadow: '0 1px 3px rgba(0,0,0,.15)',
      }}/>
    </button>
  )
}

function Section({ title, icon: Icon, children, collapsible = false }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: 'white', border: '0.5px solid #e8edf2', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div onClick={collapsible ? () => setOpen(v => !v) : undefined}
        style={{ padding: '11px 18px', borderBottom: open ? '0.5px solid #f1f5f9' : 'none',
          fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
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
      padding: '9px 0', borderBottom: last ? 'none' : '0.5px solid #f8fafc' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', marginBottom: 1 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</div>}
      </div>
      {children}
    </div>
  )
}

// Alert log table row
function LogRow({ log }) {
  const meta = {
    cert_expiry: { icon: '⏰', color: '#dc2626' }, order_renewal: { icon: '🔄', color: '#0891b2' },
    cert_issued: { icon: '✅', color: '#059669' }, cert_installed: { icon: '🚀', color: '#059669' },
    renewal_succeeded: { icon: '✅', color: '#059669' }, renewal_failed: { icon: '⚠️', color: '#dc2626' },
    agent_offline: { icon: '🔴', color: '#dc2626' }, shadow_found: { icon: '🔍', color: '#d97706' },
    pqc_risk: { icon: '⚛️', color: '#7c3aed' }, no_dns_warning: { icon: '⚠️', color: '#d97706' },
    weekly_digest: { icon: '📊', color: '#0f2545' },
  }
  const m = meta[log.alert_type] || { icon: '📧', color: '#64748b' }
  const ts = new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const domain = log.metadata?.domain || '—'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 80px 70px', gap: 12,
      padding: '9px 0', borderBottom: '0.5px solid #f8fafc', alignItems: 'center', fontSize: 12 }}>
      <span style={{ fontSize: 14 }}>{m.icon}</span>
      <div>
        <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 12 }}>
          {log.alert_type.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{domain}</div>
      </div>
      <div style={{ color: '#64748b', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {log.recipient}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{ts}</div>
      <div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
          background: log.status === 'sent' ? '#d1fae5' : '#fef2f2',
          color: log.status === 'sent' ? '#065f46' : '#dc2626',
        }}>{log.status}</span>
      </div>
    </div>
  )
}

export default function SettingsPage({ user }) {
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
    <div style={{ padding: '48px 28px', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>
      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Loading…
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '0 0 60px', fontFamily: FONT, maxWidth: 680 }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}`}</style>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 18px 0', marginBottom: 4 }}>
        {[['preferences', 'Preferences', Bell], ['log', 'Alert Log', Clock]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: '6px 6px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: FONT, transition: 'all .15s',
              background: activeTab === id ? 'white' : 'transparent',
              color: activeTab === id ? '#0f172a' : '#94a3b8',
              borderBottom: activeTab === id ? '2px solid #0891b2' : '2px solid transparent',
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
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{email}</span>
            </Row>
            <Row label="Member since">
              <span style={{ fontSize: 12, color: '#64748b' }}>{createdAt}</span>
            </Row>
            <Row label="Plan" desc="Free for personal and indie use" last>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', background: '#eff6ff',
                border: '0.5px solid #bfdbfe', borderRadius: 4, padding: '3px 8px' }}>Free</span>
            </Row>
          </Section>

          {/* Alert types */}
          <Section title="Alert types" icon={Bell}>
            <Row label="Email alerts enabled" desc="Master switch for all email alerts">
              <Toggle on={emailAlerts} onClick={() => setEmailAlerts(v => !v)}/>
            </Row>
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                Choose which events trigger an email:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALERT_TYPE_DEFS.map(({ id, label, desc, color }) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '8px 12px', borderRadius: 8,
                    background: alertTypes.includes(id) ? '#f8fafc' : 'transparent',
                    border: `1px solid ${alertTypes.includes(id) ? '#e2e8f0' : 'transparent'}`,
                    opacity: emailAlerts ? 1 : 0.45, transition: 'all .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{label}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{desc}</div>
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
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
              Alert when a certificate is within this many days of expiry:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_THRESHOLD_OPTIONS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  disabled={!emailAlerts}
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    cursor: emailAlerts ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    opacity: emailAlerts ? 1 : 0.45, transition: 'all 0.15s',
                    background: alertDays.includes(d) ? '#e0f7fa' : '#f8fafc',
                    color: alertDays.includes(d) ? '#0e7490' : '#94a3b8',
                    border: alertDays.includes(d) ? '1px solid #a5f3fc' : '1px solid #e2e8f0' }}>
                  {d} {d === 1 ? 'day' : 'days'}
                </button>
              ))}
            </div>
          </Section>

          {/* Additional recipients */}
          <Section title="Additional recipients" icon={Mail}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
              Send all alerts to these email addresses in addition to your account email.
            </div>
            {extraEmails.map(e => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{e}</span>
                <button onClick={() => removeExtraEmail(e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                  <X size={12}/>
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError('') }}
                onKeyDown={e => e.key === 'Enter' && addExtraEmail()}
                placeholder="name@example.com"
                style={{ flex: 1, padding: '7px 10px', border: `1px solid ${emailError ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: 7, fontSize: 12, fontFamily: 'monospace', outline: 'none',
                  background: emailError ? '#fef2f2' : 'white' }}/>
              <button onClick={addExtraEmail}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                  background: '#0891b2', color: 'white', border: 'none', borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={11}/> Add
              </button>
            </div>
            {emailError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 5 }}>{emailError}</div>}
          </Section>

          {/* Slack */}
          <Section title="Slack webhook" collapsible>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
              Get all alerts in Slack. Paste an Incoming Webhook URL from your Slack workspace.
            </div>
            <input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
                borderRadius: 7, fontSize: 11, fontFamily: 'monospace', outline: 'none',
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
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
              Send a test email to verify your alert settings are working.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={testType} onChange={e => setTestType(e.target.value)}
                style={{ flex: 1, minWidth: 180, padding: '7px 10px', border: '1px solid #e2e8f0',
                  borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                {ALERT_TYPE_DEFS.map(({ id, label }) => (
                  <option key={id} value={id}>{TYPE_ICONS[id]} {label}</option>
                ))}
              </select>
              <button onClick={sendTestEmail} disabled={testSending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                  background: testSending ? '#e2e8f0' : '#0f2545', color: testSending ? '#94a3b8' : 'white',
                  border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  cursor: testSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {testSending ? <><RefreshCw size={11} className="spin"/> Sending…</> : <><Send size={11}/> Send test</>}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 7, fontSize: 12,
                background: testResult.ok ? '#d1fae5' : '#fef2f2',
                color: testResult.ok ? '#065f46' : '#dc2626',
                border: `1px solid ${testResult.ok ? '#6ee7b7' : '#fecaca'}` }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
              </div>
            )}
          </Section>

          {/* Security */}
          <Section title="Security" icon={Shield}>
            <Row label="Authentication" desc="Managed via Supabase Auth">
              <span style={{ fontSize: 11, color: '#64748b' }}>Magic link</span>
            </Row>
            <Row label="Private key storage" desc="AES-256-GCM encrypted at rest" last>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: '#0369a1' }}>
                <Shield size={11}/> Encrypted
              </span>
            </Row>
          </Section>

          {/* Account actions */}
          <Section title="Account actions" icon={User}>
            <Row label="Sign out" desc="Sign out on this device">
              <button onClick={handleSignOut}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white',
                  color: '#64748b', border: '0.5px solid #e2e8f0', borderRadius: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <LogOut size={11}/> Sign out
              </button>
            </Row>
            <Row label="Delete account" desc="Permanently delete your account and all data" last>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white',
                color: '#dc2626', border: '0.5px solid #fecaca', borderRadius: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={11}/> Delete account
              </button>
            </Row>
          </Section>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: saving ? '#e2e8f0' : saved ? '#16a34a' : '#0891b2',
                color: saving ? '#94a3b8' : 'white', border: 'none', borderRadius: 7,
                padding: '10px 22px', fontSize: 12, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
              {saving ? <><RefreshCw size={12} className="spin"/> Saving…</>
                : saved ? <><Check size={12}/> Saved</>
                : 'Save preferences'}
            </button>
          </div>
        </>}

        {/* ── ALERT LOG TAB ───────────────────────────────────────────── */}
        {activeTab === 'log' && (
          <div style={{ background: 'white', border: '0.5px solid #e8edf2', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                Alert log {logsTotal > 0 && `(${logsTotal} total)`}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={logsTypeFilter} onChange={e => { setLogsTypeFilter(e.target.value); setLogsPage(0) }}
                  style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6,
                    fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                  <option value="">All types</option>
                  {ALERT_TYPE_DEFS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button onClick={() => loadLogs(logsPage, logsTypeFilter)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#64748b' }}>
                  <RefreshCw size={10}/> Refresh
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 80px 70px', gap: 12,
              padding: '8px 18px', fontSize: 10, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '0.5px solid #f1f5f9' }}>
              <div/>
              <div>Type / Domain</div>
              <div>Recipient</div>
              <div>Sent at</div>
              <div>Status</div>
            </div>

            <div style={{ padding: '0 18px' }}>
              {logsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }}/>
                  Loading alert log…
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  No alerts sent yet.{' '}
                  <button onClick={() => setActiveTab('preferences')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2',
                      fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline' }}>
                    Configure alerts →
                  </button>
                </div>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log}/>)
              )}
            </div>

            {/* Pagination */}
            {logsTotal > 20 && (
              <div style={{ padding: '10px 18px', borderTop: '0.5px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Showing {logsPage * 20 + 1}–{Math.min((logsPage + 1) * 20, logsTotal)} of {logsTotal}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setLogsPage(p => Math.max(0, p - 1))} disabled={logsPage === 0}
                    style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5,
                      fontSize: 11, cursor: logsPage === 0 ? 'not-allowed' : 'pointer',
                      background: logsPage === 0 ? '#f8fafc' : 'white',
                      color: logsPage === 0 ? '#94a3b8' : '#475569', fontFamily: 'inherit' }}>
                    ← Prev
                  </button>
                  <button onClick={() => setLogsPage(p => p + 1)}
                    disabled={(logsPage + 1) * 20 >= logsTotal}
                    style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5,
                      fontSize: 11, cursor: (logsPage + 1) * 20 >= logsTotal ? 'not-allowed' : 'pointer',
                      background: (logsPage + 1) * 20 >= logsTotal ? '#f8fafc' : 'white',
                      color: (logsPage + 1) * 20 >= logsTotal ? '#94a3b8' : '#475569', fontFamily: 'inherit' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
