import { useState, useEffect } from 'react'
import {
  Plus, Trash2, RefreshCw, Eye, EyeOff, Globe, Server, Cloud,
  ChevronRight, Check, X, Search, Settings, ExternalLink,
  Lock, AlertCircle, Wifi, WifiOff, Edit3
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const DNS_FN    = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'
const SERVER_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials'
const DAEMON_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

// ── DNS Providers config ──────────────────────────────────────────────
const PROVIDERS = {
  cloudflare: {
    name: 'Cloudflare', mono: 'CF', color: '#f97316',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-cloudflare-api-token', help: 'Dashboard → API Tokens → Zone:DNS:Edit', optional: false },
      { key: 'zoneId',   label: 'Zone ID',   type: 'text',     placeholder: 'auto-detected if blank',     help: 'Optional — found in domain Overview sidebar', optional: true },
    ],
    docs: 'https://developers.cloudflare.com/fundamentals/api/',
    note: 'Token needs Zone:DNS:Edit permission.'
  },
  vercel: {
    name: 'Vercel', mono: '▲', color: '#000000',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-vercel-api-token', help: 'Create at vercel.com/account/tokens', optional: false },
      { key: 'teamId',   label: 'Team ID',   type: 'text',     placeholder: 'team_xxxxxxxx',         help: 'Optional — leave blank for personal account', optional: true },
    ],
    docs: 'https://vercel.com/account/tokens',
    note: 'Token needs DNS record write access.'
  },
  godaddy: {
    name: 'GoDaddy', mono: 'GD', color: '#00A4A6',
    fields: [
      { key: 'apiKey',    label: 'API Key',    type: 'password', placeholder: 'your-godaddy-api-key',    help: 'developer.godaddy.com/keys', optional: false },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'your-godaddy-api-secret', help: 'Created alongside the API key', optional: false },
    ],
    docs: 'https://developer.godaddy.com/keys',
    note: 'Use Production keys, not OTE.'
  },
  digitalocean: {
    name: 'DigitalOcean', mono: 'DO', color: '#0080FF',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-digitalocean-api-token', help: 'Dashboard → API → Generate New Token', optional: false },
    ],
    docs: 'https://docs.digitalocean.com/reference/api/',
    note: 'Token needs Read + Write scope.'
  },
}

// ── Server types ──────────────────────────────────────────────────────
const SERVER_TYPES = {
  cpanel: { label: 'cPanel / Shared Hosting', short: 'cPanel', Icon: Cloud,    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    desc: 'GoDaddy, Bluehost, Hostinger, SiteGround',
    fields: [
      { key: 'host',      label: 'Domain / cPanel Host', type: 'text',     placeholder: 'yourdomain.com',       help: 'Your website domain — cPanel runs at :2083' },
      { key: 'username',  label: 'cPanel Username',      type: 'text',     placeholder: 'johndoe',              help: 'Short login name, not your email' },
      { key: 'api_token', label: 'cPanel API Token',     type: 'password', placeholder: 'Paste API token here', help: 'cPanel → Manage API Tokens → Create → SSL permission' },
    ]
  },
  ssh: { label: 'VPS / Cloud Server', short: 'VPS', Icon: Server, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    desc: 'Ubuntu, Debian, CentOS, Amazon Linux',
    fields: [
      { key: 'host',     label: 'Server IP / Hostname', type: 'text',     placeholder: '134.209.x.x',                         help: 'Public IP or hostname' },
      { key: 'username', label: 'SSH Username',         type: 'text',     placeholder: 'root or ubuntu',                      help: 'User with sudo access' },
      { key: 'ssh_key',  label: 'Private SSH Key',      type: 'password', placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----', help: 'Paste your id_rsa private key' },
    ]
  },
  plesk: { label: 'Plesk Panel', short: 'Plesk', Icon: Settings, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    desc: 'Plesk Obsidian, Onyx',
    fields: [
      { key: 'host',      label: 'Plesk Host', type: 'text',     placeholder: 'server.example.com', help: 'Your Plesk panel hostname or IP' },
      { key: 'username',  label: 'Username',   type: 'text',     placeholder: 'admin',              help: 'Plesk admin username' },
      { key: 'api_token', label: 'Secret Key', type: 'password', placeholder: 'Plesk secret key',   help: 'Extensions → Secret Key Manager' },
    ]
  },
}

// ── Helpers ───────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Sparkline ─────────────────────────────────────────────────────────
function Sparkline({ status = 'green' }) {
  const points =
    status === 'green' ? '0,16 8,12 16,14 24,9 32,11 40,6 48,8 56,4 64,5'
  : status === 'amber' ? '0,8 8,9 16,7 24,10 32,12 40,16 48,18 56,18 64,18'
  : '0,12 8,12 16,12 24,12 32,12 40,12 48,12 56,12 64,12'
  const stroke = status === 'green' ? '#10b981' : status === 'amber' ? '#f59e0b' : '#d4d4d4'
  return (
    <svg width="64" height="22" viewBox="0 0 64 22" style={{ flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Page header ───────────────────────────────────────────────────────
function PageHeader({ counts, tab, onAdd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 className="v2-h1">DNS &amp; Servers</h1>
        <p className="v2-subtitle">
          {counts.dns} provider{counts.dns === 1 ? '' : 's'} ·{' '}
          {counts.servers} server{counts.servers === 1 ? '' : 's'} ·{' '}
          {counts.activeAgents} agent{counts.activeAgents === 1 ? '' : 's'} active
        </p>
      </div>
      <button className="v2-btn v2-btn-primary" onClick={onAdd}>
        <Plus size={14} strokeWidth={2.2} />
        {tab === 'dns' ? 'Add provider' : 'Add server'}
      </button>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────
function Tabs({ tab, setTab, counts }) {
  return (
    <div className="v2-segmented" style={{ margin: '20px 0 18px' }}>
      <button className={`v2-segmented-btn ${tab === 'dns' ? 'active' : ''}`} onClick={() => setTab('dns')}>
        <Globe size={13} strokeWidth={2} /> DNS providers
        <span className="v2-tab-count">{counts.dns}</span>
      </button>
      <button className={`v2-segmented-btn ${tab === 'servers' ? 'active' : ''}`} onClick={() => setTab('servers')}>
        <Server size={13} strokeWidth={2} /> Servers
        <span className="v2-tab-count">{counts.servers}</span>
      </button>
    </div>
  )
}

// ── DNS Provider row ──────────────────────────────────────────────────
function DnsRow({ cred, selected, onSelect, status }) {
  const p = PROVIDERS[cred.provider] || { name: cred.provider, mono: '?', color: '#475569' }
  const cls = status === 'healthy' ? 'green' : status === 'expired' ? 'amber' : 'grey'
  return (
    <div className={`v2-list-row status-${cls} ${selected ? 'selected' : ''}`}
         onClick={() => onSelect(cred.id)}>
      <div className="v2-row-icon" style={{ background: p.color, fontSize: p.mono === '▲' ? 12 : 11 }}>
        {p.mono}
      </div>
      <div className="v2-row-body">
        <div className="v2-row-title-line">
          <span className="v2-row-title">{p.name}</span>
          <span className={`v2-status v2-status-${cls}`}>
            <span className={`v2-dot v2-dot-${cls}`} />
            {status === 'healthy' ? 'Healthy' : status === 'expired' ? 'Auth expired' : 'Untested'}
          </span>
          {cred.tested_at && (
            <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>
              · tested {timeAgo(cred.tested_at)}
            </span>
          )}
        </div>
        <div className="v2-row-meta">
          <span className="v2-mono" style={{ fontSize: 11 }}>{cred.domain_pattern}</span>
          {cred.label && cred.label !== cred.domain_pattern && (
            <>
              <span className="v2-row-meta-sep">·</span>
              <span style={{ fontSize: 11 }}>{cred.label}</span>
            </>
          )}
        </div>
      </div>
      <Sparkline status={cls} />
      <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--v2-text-3)', flexShrink: 0 }} />
    </div>
  )
}

// ── DNS Provider detail ───────────────────────────────────────────────
function DnsDetail({ cred, status, onTest, onDelete, testing, testResult }) {
  if (!cred) return null
  const p = PROVIDERS[cred.provider] || { name: cred.provider, mono: '?', color: '#475569' }
  const cls = status === 'healthy' ? 'green' : status === 'expired' ? 'amber' : 'grey'
  return (
    <div className="v2-detail mobile-collapse open">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="v2-row-icon" style={{ width: 36, height: 36, background: p.color, borderRadius: 8 }}>
          {p.mono}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)' }}>{p.name}</div>
          <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
            DNS provider · added {fmtDate(cred.created_at)}
          </div>
        </div>
        <button className="v2-btn v2-btn-sm" onClick={() => onTest(cred)} disabled={testing}>
          <RefreshCw size={11} strokeWidth={2} className={testing ? 'spin' : ''} />
          {testing ? 'Testing…' : 'Test'}
        </button>
      </div>

      <div className={`v2-detail-banner ${cls === 'amber' ? 'amber' : ''}`} style={{ marginBottom: 14 }}>
        {cls === 'green' ? <Check size={14} strokeWidth={2.4} /> : <AlertCircle size={14} strokeWidth={2.2} />}
        <span>
          {status === 'healthy' ? 'Healthy — credentials verified'
           : status === 'expired' ? 'Authentication failed — re-enter credentials'
           : 'Untested — click Test to verify'}
        </span>
      </div>

      {testResult && (
        <div className={`v2-alert ${testResult.ok ? 'v2-alert-success' : 'v2-alert-error'}`} style={{ marginBottom: 14 }}>
          {testResult.ok ? <Check size={13} /> : <X size={13} />}
          <span>{testResult.message}</span>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div className="v2-section-label" style={{ marginBottom: 8 }}>Domain coverage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span className="v2-chip-mono">{cred.domain_pattern}</span>
          <span className="v2-chip-mono">*.{cred.domain_pattern}</span>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="v2-section-label" style={{ marginBottom: 8 }}>Recent activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {status === 'healthy' && (
            <div className="v2-timeline-item">
              <span className="v2-dot v2-dot-green" />
              <span style={{ color: 'var(--v2-text-2)' }}>DNS challenge verified</span>
              <span className="v2-timeline-time">{timeAgo(cred.tested_at) || 'recently'}</span>
            </div>
          )}
          <div className="v2-timeline-item">
            <span className="v2-dot v2-dot-grey" />
            <span style={{ color: 'var(--v2-text-2)' }}>Provider connected</span>
            <span className="v2-timeline-time">{fmtDate(cred.created_at)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '0.5px solid var(--v2-border)' }}>
        <a href={p.docs} target="_blank" rel="noopener noreferrer"
           className="v2-btn" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
          <ExternalLink size={11} strokeWidth={2} /> Provider docs
        </a>
        <button className="v2-btn v2-btn-danger" onClick={() => onDelete(cred.id)}>
          <Trash2 size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ── Server row ────────────────────────────────────────────────────────
function ServerRow({ server, selected, onSelect, agent, onInstallAgent }) {
  const t = SERVER_TYPES[server.server_type] || SERVER_TYPES.cpanel
  const Icon = t.Icon
  const isVPS = server.server_type === 'ssh'
  const lastSeenMin = agent?.last_seen_at
    ? Math.floor((Date.now() - new Date(agent.last_seen_at).getTime()) / 60000)
    : null
  const agentActive = lastSeenMin !== null && lastSeenMin < 15
  const cls = agent ? (agentActive ? 'green' : 'amber') : 'grey'
  return (
    <div className={`v2-list-row status-${cls} ${selected ? 'selected' : ''}`}
         onClick={() => onSelect(server.id)}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: t.bg, border: `0.5px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={16} strokeWidth={1.8} color={t.color} />
      </div>
      <div className="v2-row-body">
        <div className="v2-row-title-line">
          <span className="v2-row-title">{server.nickname}</span>
          <span className="v2-chip">{t.short}</span>
          {agent ? (
            <span className={`v2-status v2-status-${cls}`}>
              {agentActive ? <span className="v2-pulse" /> : <span className={`v2-dot v2-dot-${cls}`} />}
              {agentActive ? 'Agent active' : `Agent offline · ${lastSeenMin}m`}
            </span>
          ) : (
            <span className="v2-status v2-status-grey">
              <span className="v2-dot v2-dot-grey" />
              No agent
            </span>
          )}
        </div>
        <div className="v2-row-meta">
          <span className="v2-mono" style={{ fontSize: 11 }}>{server.username}@{server.host}</span>
          {server.domains?.length > 0 && (
            <>
              <span className="v2-row-meta-sep">·</span>
              <span style={{ fontSize: 11 }}>
                <Lock size={10} strokeWidth={2} style={{ verticalAlign: -1, marginRight: 3 }} />
                {server.domains.length} domain{server.domains.length === 1 ? '' : 's'}
              </span>
            </>
          )}
          <span className="v2-row-meta-sep">·</span>
          <span style={{ fontSize: 11 }}>
            {agent?.last_seen_at ? `seen ${timeAgo(agent.last_seen_at)}` : `added ${timeAgo(server.created_at)}`}
          </span>
        </div>
      </div>
      {isVPS && !agent ? (
        <button onClick={(e) => { e.stopPropagation(); onInstallAgent(server) }}
          style={{
            fontSize: 11, color: '#2563eb', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '4px 6px',
            fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
          Install agent <ChevronRight size={12} strokeWidth={2} />
        </button>
      ) : (
        <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--v2-text-3)', flexShrink: 0 }} />
      )}
    </div>
  )
}

// ── Server detail ─────────────────────────────────────────────────────
function ServerDetail({ server, agent, onDelete, onEdit, onInstallAgent }) {
  if (!server) return null
  const t = SERVER_TYPES[server.server_type] || SERVER_TYPES.cpanel
  const Icon = t.Icon
  const lastSeenMin = agent?.last_seen_at
    ? Math.floor((Date.now() - new Date(agent.last_seen_at).getTime()) / 60000)
    : null
  const agentActive = lastSeenMin !== null && lastSeenMin < 15
  const isVPS = server.server_type === 'ssh'
  return (
    <div className="v2-detail mobile-collapse open">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: t.bg, border: `0.5px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={18} strokeWidth={1.8} color={t.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)' }}>{server.nickname}</div>
          <div style={{ fontSize: 11, color: 'var(--v2-text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
            {server.username}@{server.host}
          </div>
        </div>
        <span className="v2-chip">{t.short}</span>
      </div>

      {agent ? (
        <div className="v2-detail-banner" style={{ marginBottom: 14, flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {agentActive ? <span className="v2-pulse" /> : <Wifi size={13} strokeWidth={2} />}
            <span style={{ fontWeight: 500, color: 'var(--v2-green-text-2)' }}>
              {agentActive ? 'Agent online' : `Offline · ${lastSeenMin}m ago`}
            </span>
            {agent.version && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                             color: 'var(--v2-green-text)' }}>v{agent.version}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--v2-green-text)', marginTop: 4 }}>
            Polling every 5 minutes · Last heartbeat {timeAgo(agent.last_seen_at)}
          </div>
        </div>
      ) : (
        <div className="v2-alert v2-alert-info" style={{ marginBottom: 14 }}>
          <WifiOff size={13} strokeWidth={2} />
          <span style={{ flex: 1 }}>
            No agent installed.{isVPS && <> Install one for hands-off renewals.</>}
          </span>
          {isVPS && (
            <button onClick={() => onInstallAgent(server)}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb',
                             fontWeight: 500, fontSize: 11, cursor: 'pointer', padding: 0 }}>
              Install →
            </button>
          )}
        </div>
      )}

      {server.domains?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="v2-section-label" style={{ marginBottom: 8 }}>Hosted domains</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {server.domains.map(d => <span key={d} className="v2-chip-mono">{d}</span>)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div className="v2-section-label" style={{ marginBottom: 8 }}>Recent activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {agent?.last_seen_at && (
            <div className="v2-timeline-item">
              <span className="v2-dot v2-dot-green" />
              <span style={{ color: 'var(--v2-text-2)' }}>Agent heartbeat</span>
              <span className="v2-timeline-time">{timeAgo(agent.last_seen_at)}</span>
            </div>
          )}
          <div className="v2-timeline-item">
            <span className="v2-dot v2-dot-grey" />
            <span style={{ color: 'var(--v2-text-2)' }}>Server added</span>
            <span className="v2-timeline-time">{fmtDate(server.created_at)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '0.5px solid var(--v2-border)' }}>
        <button className="v2-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(server)}>
          <Edit3 size={11} strokeWidth={2} /> Edit
        </button>
        <button className="v2-btn v2-btn-danger" onClick={() => onDelete(server.id)}>
          <Trash2 size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, desc, ctaLabel, onCta }) {
  return (
    <div className="v2-empty">
      <div className="v2-empty-icon">
        <Icon size={26} strokeWidth={1.6} />
      </div>
      <div className="v2-empty-title">{title}</div>
      <div className="v2-empty-desc">{desc}</div>
      <button className="v2-btn v2-btn-primary" onClick={onCta}>
        <Plus size={13} strokeWidth={2.2} /> {ctaLabel}
      </button>
    </div>
  )
}

// ── Add DNS Provider modal ────────────────────────────────────────────
function AddProviderModal({ onSave, onClose, userId }) {
  const [provider, setProvider] = useState('cloudflare')
  const [domainPattern, setDomainPattern] = useState('')
  const [label, setLabel] = useState('')
  const [fields, setFields] = useState({})
  const [showField, setShowField] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const p = PROVIDERS[provider]

  const submit = async () => {
    if (!domainPattern.trim()) { setError('Enter the domain this provider manages'); return }
    const required = p.fields.filter(f => !f.optional && !fields[f.key])
    if (required.length) { setError(`Missing: ${required.map(f => f.label).join(', ')}`); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch(DNS_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save', user_id: userId, provider,
          domain_pattern: domainPattern.trim().replace(/^https?:\/\//, '').replace(/\/.*/, ''),
          label: label || domainPattern, credentials: fields
        })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess(data.message || 'Saved')
      setTimeout(() => { onSave(); onClose() }, 900)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal">
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">Add DNS provider</div>
            <div className="v2-modal-subtitle">Encrypted at rest · used for auto-DNS challenge</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="v2-modal-body">
          <div style={{ marginBottom: 16 }}>
            <label className="v2-label">Provider</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(PROVIDERS).map(([key, prov]) => (
                <button key={key} type="button"
                  onClick={() => { setProvider(key); setFields({}); setError('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px',
                    borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: provider === key ? `1.2px solid ${prov.color}` : '0.5px solid var(--v2-border)',
                    background: provider === key ? `${prov.color}10` : 'var(--v2-surface)',
                    color: provider === key ? prov.color : 'var(--v2-text-2)',
                  }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4, background: prov.color,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700
                  }}>{prov.mono}</span>
                  {prov.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="v2-label">Domain managed by this provider</label>
            <input className="v2-input" placeholder="example.com"
              value={domainPattern} onChange={e => setDomainPattern(e.target.value)} />
            <div className="v2-label-help">Root domain only. Covers example.com and *.example.com</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="v2-label">Label <span style={{ color: 'var(--v2-text-3)', fontWeight: 400 }}>· optional</span></label>
            <input className="v2-input" placeholder={`My ${p.name} account`}
              value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          {p.fields.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label className="v2-label">
                {f.label}
                {f.optional && <span style={{ color: 'var(--v2-text-3)', fontWeight: 400 }}> · optional</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="v2-input mono"
                  type={f.type === 'password' && !showField[f.key] ? 'password' : 'text'}
                  placeholder={f.placeholder}
                  value={fields[f.key] || ''}
                  onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                  style={f.type === 'password' ? { paddingRight: 36 } : {}}
                />
                {f.type === 'password' && (
                  <button type="button"
                    onClick={() => setShowField(s => ({ ...s, [f.key]: !s[f.key] }))}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--v2-text-3)', display: 'flex'
                    }}>
                    {showField[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              <div className="v2-label-help">{f.help}</div>
            </div>
          ))}

          <div className="v2-alert v2-alert-info" style={{ marginBottom: 12 }}>
            <span style={{ flex: 1 }}>
              <a href={p.docs} target="_blank" rel="noopener noreferrer"
                 style={{ color: 'var(--v2-text)', textDecoration: 'underline', fontWeight: 500 }}>
                {p.name} docs
              </a> — {p.note}
            </span>
          </div>

          {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={13} strokeWidth={2} /> <span>{error}</span>
          </div>}
          {success && <div className="v2-alert v2-alert-success" style={{ marginBottom: 12 }}>
            <Check size={13} strokeWidth={2.4} /> <span>{success}</span>
          </div>}
        </div>
        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-primary" onClick={submit} disabled={loading || !!success}>
            {loading ? 'Saving…' : 'Save provider'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Server modal ─────────────────────────────────────────────
function AddServerModal({ onSave, onClose, userId, editServer }) {
  const isEdit = !!editServer
  const [type, setType] = useState(editServer?.server_type || 'ssh')
  const [nickname, setNickname] = useState(editServer?.nickname || '')
  // Pre-fill host + username from editServer (plain text in DB)
  // Sensitive fields (token/password) stay blank — user types new one or leaves blank to keep existing
  const [fields, setFields] = useState(() => {
    if (!editServer) return {}
    return {
      host: editServer.host || '',
      username: editServer.username || '',
      port: editServer.port ? String(editServer.port) : '',
    }
  })
  const [showField, setShowField] = useState({})
  const [domains, setDomains] = useState((editServer?.domains || []).join(', '))
  const [installMode, setInstallMode] = useState(editServer?.install_mode || 'agent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const t = SERVER_TYPES[type]
  const isVpsType = type === 'ssh'

  const submit = async () => {
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    if (!fields.host?.trim()) { setError(`Enter the ${t.fields[0].label}`); return }
    if (!fields.username?.trim()) { setError('Enter the username'); return }
    // SSH Push requires password or private key — only on new servers (edit can keep existing)
    if (!isEdit && isVpsType && installMode === 'ssh_push' && !fields.password?.trim() && !fields.ssh_key?.trim()) {
      setError('SSH Push mode requires a password or private key.'); return
    }
    setError(''); setLoading(true)
    try {
      // Separate sensitive credentials from basic fields
      const credentialFields = {}
      const sensitiveKeys = ['password', 'ssh_key', 'api_token', 'token', 'secret_key']
      sensitiveKeys.forEach(k => { if (fields[k]?.trim()) credentialFields[k] = fields[k].trim() })

      // cPanel default port is 2083, not 22
      const defaultPort = type === 'cpanel' ? 2083 : type === 'plesk' ? 8443 : 22
      const port = fields.port ? parseInt(fields.port) : defaultPort

      const body = {
        action: isEdit ? 'update' : 'save', user_id: userId,
        ...(isEdit && { id: editServer.id }),
        server_type: type, nickname: nickname.trim(),
        host: fields.host.trim(), username: fields.username.trim(),
        domains: domains.split(',').map(d => d.trim()).filter(Boolean),
        install_mode: isVpsType ? installMode : 'agent',
        port,
        // Only send credentials if there are actual secret values
        ...(Object.keys(credentialFields).length > 0 && { credentials: credentialFields })
      }
      const res = await fetch(SERVER_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess(isEdit ? 'Updated' : 'Saved')
      setTimeout(() => { onSave(); onClose() }, 900)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal">
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">{isEdit ? 'Edit server' : 'Add server'}</div>
            <div className="v2-modal-subtitle">Credentials encrypted with AES-256-GCM</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="v2-modal-body">
          {/* Honeypot inputs — trap browser autofill away from real fields */}
          <input type="text" name="username" style={{ display: 'none' }} tabIndex={-1} readOnly />
          <input type="password" name="password" style={{ display: 'none' }} tabIndex={-1} readOnly />
          {!isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label className="v2-label">Server type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(SERVER_TYPES).map(([key, st]) => {
                  const Icon = st.Icon
                  return (
                    <button key={key} type="button"
                      onClick={() => { setType(key); setFields({}); setError('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px',
                        borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        border: type === key ? `1.2px solid ${st.color}` : '0.5px solid var(--v2-border)',
                        background: type === key ? st.bg : 'var(--v2-surface)',
                        color: type === key ? st.color : 'var(--v2-text-2)',
                      }}>
                      <Icon size={13} strokeWidth={2} />
                      {st.short}
                    </button>
                  )
                })}
              </div>
              <div className="v2-label-help">{t.desc}</div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="v2-label">Nickname</label>
            <input className="v2-input" placeholder="production-web-01"
              value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>

          {t.fields.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label className="v2-label">{f.label}</label>
              <div style={{ position: 'relative' }}>
                {f.key === 'ssh_key' ? (
                  <textarea
                    className="v2-input mono"
                    rows={5}
                    placeholder={isEdit && editServer?.credentials_enc ? '(saved — paste new key to replace)' : f.placeholder}
                    value={fields[f.key] || ''}
                    onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.5 }}
                  />
                ) : (
                  <>
                    <input
                      className="v2-input mono"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      name={`server-${f.key}-${Date.now()}`}
                      type={f.type === 'password' && !showField[f.key] ? 'password' : 'text'}
                      placeholder={isEdit && f.type === 'password' && editServer?.credentials_enc
                        ? '(saved — type new value to replace)'
                        : f.placeholder}
                      value={fields[f.key] || ''}
                      onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                      style={f.type === 'password' ? { paddingRight: 36 } : {}}
                    />
                    {f.type === 'password' && (
                      <button type="button"
                        onClick={() => setShowField(s => ({ ...s, [f.key]: !s[f.key] }))}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--v2-text-3)', display: 'flex'
                        }}>
                        {showField[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="v2-label-help">{f.help}</div>
            </div>
          ))}

          <div style={{ marginBottom: 12 }}>
            <label className="v2-label">Hosted domains <span style={{ color: 'var(--v2-text-3)', fontWeight: 400 }}>· optional</span></label>
            <input className="v2-input" placeholder="example.com, www.example.com"
              value={domains} onChange={e => setDomains(e.target.value)} />
            <div className="v2-label-help">Comma-separated. Used to match certs for one-click install.</div>
          </div>

          {/* Install mode — only shown for VPS/SSH servers */}
          {isVpsType && (
            <div style={{ marginBottom: 16 }}>
              <label className="v2-label">Certificate install method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'agent', icon: '🛡️', title: 'Agent (recommended)', desc: 'One-time setup on your server. No SSH credentials stored here. Most secure.' },
                  { id: 'ssh_push', icon: '⚡', title: 'SSH Push', desc: 'SSLVault SSHes in directly. Fully automatic — no manual steps ever.' },
                ].map(opt => (
                  <div key={opt.id} onClick={() => setInstallMode(opt.id)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      border: installMode === opt.id ? `1.5px solid ${opt.id === 'ssh_push' ? '#16a34a' : 'var(--v2-accent)'}` : '1px solid var(--v2-border)',
                      background: installMode === opt.id ? (opt.id === 'ssh_push' ? '#f0fdf4' : 'var(--v2-accent-bg)') : 'var(--v2-surface)',
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: installMode === opt.id ? (opt.id === 'ssh_push' ? '#16a34a' : 'var(--v2-accent)') : 'var(--v2-text)' }}>
                      {opt.icon} {opt.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--v2-text-3)', lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
              {installMode === 'ssh_push' && (
                <div style={{ marginTop: 10, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  ⚠ SSH Push requires a <strong>password or private key</strong> in the credentials above. Credentials are encrypted with AES-256-GCM and never stored in plaintext.
                </div>
              )}
            </div>
          )}

          {error && <div className="v2-alert v2-alert-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={13} strokeWidth={2} /> <span>{error}</span>
          </div>}
          {success && <div className="v2-alert v2-alert-success" style={{ marginBottom: 12 }}>
            <Check size={13} strokeWidth={2.4} /> <span>{success}</span>
          </div>}
        </div>
        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-primary" onClick={submit} disabled={loading || !!success}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save server'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Install Agent modal ───────────────────────────────────────────────
function InstallAgentModal({ server, userId, onClose, onRegistered }) {
  const [agentToken, setAgentToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [copied, setCopied] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(DAEMON_FN, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_token', user_id: userId, server_id: server.id })
        })
        const data = await res.json()
        if (cancelled) return
        if (data.token) setAgentToken(data.token)
        else setTokenError(data.error || 'Could not create token')
      } catch (e) { if (!cancelled) setTokenError(e.message) }
      if (!cancelled) setTokenLoading(false)
    })()
    return () => { cancelled = true }
  }, [server.id, userId])

  useEffect(() => {
    if (!agentToken) return
    const i = setInterval(async () => {
      try {
        const res = await fetch(DAEMON_FN, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_registered', token: agentToken })
        })
        const data = await res.json()
        if (data.registered) {
          setRegistered(true)
          setTimeout(() => { onRegistered(); onClose() }, 1800)
        }
      } catch (e) {}
    }, 5000)
    return () => clearInterval(i)
  }, [agentToken, onClose, onRegistered])

  const installCmd = agentToken
    ? `curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash -s -- ${agentToken}`
    : ''

  const copy = async () => {
    await navigator.clipboard.writeText(installCmd)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal" style={{ maxWidth: 540 }}>
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">Install agent · {server.nickname}</div>
            <div className="v2-modal-subtitle">One command — zero-touch installs forever</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="v2-modal-body">
          {registered ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'var(--v2-green-bg)',
                border: '0.5px solid var(--v2-green-border)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 12
              }}>
                <Check size={22} strokeWidth={2.2} color="#065f46" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 4 }}>Agent registered</div>
              <div style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>{server.nickname} is now fully automated</div>
            </div>
          ) : tokenError ? (
            <div className="v2-alert v2-alert-error">
              <AlertCircle size={13} /> <span>{tokenError} — please close and try again.</span>
            </div>
          ) : tokenLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--v2-text-2)', fontSize: 13 }}>
              Generating secure token…
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div className="v2-section-label" style={{ marginBottom: 6 }}>What this does</div>
                <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.7 }}>
                  <li>Installs a lightweight background service (~2MB RAM)</li>
                  <li>Registers the server with SSLVault automatically</li>
                  <li>Handles future cert installs &amp; renewals — no SSH needed</li>
                  <li>Runs on every boot · restarts on crash</li>
                </ul>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="v2-label">SSH into your server and run</label>
                <div style={{ background: '#0a0a0a', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '7px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <button onClick={copy} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: copied ? '#34d399' : '#a3a3a3', fontSize: 11, fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      {copied ? <><Check size={11} /> Copied</> : 'Copy'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '12px 14px', color: '#e5e5e5', fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all', lineHeight: 1.6
                  }}>{installCmd}</pre>
                </div>
              </div>

              <div className="v2-alert v2-alert-info" style={{ marginBottom: 14, fontSize: 11 }}>
                <span><strong style={{ color: 'var(--v2-text)' }}>Requirements:</strong> Ubuntu 20/22/24, Debian 10/11/12, CentOS 7/8/9, Amazon Linux 2/2023 · Nginx or Apache · sudo</span>
              </div>

              <div className="v2-alert v2-alert-success">
                <span className="v2-pulse" />
                <span>Waiting for the agent to register — this updates automatically.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Logged-out marketing view ─────────────────────────────────────────
function LoggedOutView({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 920 }}>
        <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <h1 className="v2-h1" style={{ fontSize: 32, marginBottom: 10, letterSpacing: '-0.6px' }}>
            One vault for DNS &amp; servers
          </h1>
          <p style={{ fontSize: 14, color: 'var(--v2-text-2)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Connect your DNS provider and servers once. Auto-DNS, auto-install, auto-renewal.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, marginBottom: 28 }}>
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <div key={key} className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="v2-row-icon" style={{ background: p.color }}>{p.mono}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>DNS provider</div>
              </div>
            </div>
          ))}
          {Object.entries(SERVER_TYPES).map(([key, t]) => {
            const Icon = t.Icon
            return (
              <div key={key} className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: t.bg,
                              border: `0.5px solid ${t.border}`, display: 'flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.8} color={t.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)' }}>{t.short}</div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>Server type</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="v2-card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: 'var(--v2-text)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14
          }}>
            <Lock size={20} strokeWidth={2} color="white" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Sign in to manage credentials
          </div>
          <p style={{ color: 'var(--v2-text-2)', fontSize: 13, maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.6 }}>
            Credentials are encrypted at rest. Used only for automation — never displayed back to your browser.
          </p>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>Sign in</button>
            <button className="v2-btn" onClick={() => nav('/install')}>See install guide</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function DnsProviders({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab]                 = useState('dns')
  const [credentials, setCredentials] = useState([])
  const [servers, setServers]         = useState([])
  const [agents, setAgents]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAddDns, setShowAddDns]   = useState(false)
  const [showAddSrv, setShowAddSrv]   = useState(false)
  const [editServer, setEditServer]   = useState(null)
  const [agentServer, setAgentServer] = useState(null)
  const [serverTypeFilter, setServerTypeFilter] = useState('all')
  const [selectedDns, setSelectedDns]       = useState(null)
  const [selectedServer, setSelectedServer] = useState(null)
  const [testing, setTesting]               = useState(null)
  const [testResult, setTestResult]         = useState({})
  const [credStatus, setCredStatus]         = useState({})

  useEffect(() => {
    if (!authLoading && user) loadAll()
    if (!authLoading && !user) setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadCredentials(), loadServers(), loadAgents()])
    setLoading(false)
  }

  const loadCredentials = async () => {
    const res = await fetch(DNS_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', user_id: user.id })
    })
    const data = await res.json()
    const list = data.credentials || []
    setCredentials(list)
    setSelectedDns(prev => prev && list.some(c => c.id === prev) ? prev : (list[0]?.id || null))
    const status = {}
    for (const c of list) {
      if (c.tested_at) {
        const ageH = (Date.now() - new Date(c.tested_at).getTime()) / 3600000
        status[c.id] = ageH < 168 ? 'healthy' : 'untested'
      } else status[c.id] = 'untested'
    }
    setCredStatus(status)
  }

  const loadServers = async () => {
    const res = await fetch(SERVER_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', user_id: user.id })
    })
    const data = await res.json()
    const list = data.servers || []
    setServers(list)
    setSelectedServer(prev => prev && list.some(s => s.id === prev) ? prev : (list[0]?.id || null))
  }

  const loadAgents = async () => {
    try {
      const res = await fetch(DAEMON_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_agents', user_id: user.id })
      })
      const data = await res.json()
      setAgents(data.agents || [])
    } catch (e) {}
  }

  const deleteCred = async (id) => {
    if (!confirm('Delete this DNS provider?')) return
    await fetch(DNS_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', user_id: user.id, id })
    })
    setCredentials(c => c.filter(x => x.id !== id))
    if (selectedDns === id) setSelectedDns(null)
  }

  const deleteServer = async (id) => {
    if (!confirm('Delete this server?')) return
    await fetch(SERVER_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', user_id: user.id, id })
    })
    setServers(s => s.filter(x => x.id !== id))
    if (selectedServer === id) setSelectedServer(null)
  }

  const testCred = async (cred) => {
    setTesting(cred.id)
    setTestResult(t => ({ ...t, [cred.id]: null }))
    try {
      const res = await fetch(DNS_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: user.id, domain: cred.domain_pattern.replace('*.', '') })
      })
      const data = await res.json()
      setTestResult(t => ({ ...t, [cred.id]: data }))
      setCredStatus(s => ({ ...s, [cred.id]: data.ok ? 'healthy' : 'expired' }))
    } catch (e) {
      setTestResult(t => ({ ...t, [cred.id]: { ok: false, message: e.message } }))
      setCredStatus(s => ({ ...s, [cred.id]: 'expired' }))
    }
    setTesting(null)
  }

  if (!authLoading && !user) return <LoggedOutView nav={nav} />

  const counts = {
    dns: credentials.length,
    servers: servers.length,
    activeAgents: agents.filter(a => {
      if (!a.last_seen_at) return false
      const m = (Date.now() - new Date(a.last_seen_at).getTime()) / 60000
      return m < 15
    }).length
  }

  const filteredServers = serverTypeFilter === 'all'
    ? servers
    : servers.filter(s => s.server_type === serverTypeFilter)

  const selDnsCred = credentials.find(c => c.id === selectedDns)
  const selSrv     = servers.find(s => s.id === selectedServer)
  const selSrvAgent = agents.find(a => a.server_id === selectedServer) || null

  const onAdd = () => tab === 'dns' ? setShowAddDns(true) : setShowAddSrv(true)

  return (
    <div className="v2-page">
      <div className="v2-container">
        {showAddDns  && <AddProviderModal userId={user?.id} onSave={loadCredentials} onClose={() => setShowAddDns(false)} />}
        {showAddSrv  && <AddServerModal   userId={user?.id} onSave={loadServers}     onClose={() => setShowAddSrv(false)} />}
        {editServer  && <AddServerModal   userId={user?.id} onSave={loadServers}     onClose={() => setEditServer(null)} editServer={editServer} />}
        {agentServer && <InstallAgentModal server={agentServer} userId={user?.id} onClose={() => setAgentServer(null)} onRegistered={loadAgents} />}

        <PageHeader counts={counts} tab={tab} onAdd={onAdd} />
        <Tabs tab={tab} setTab={setTab} counts={counts} />

        {tab === 'dns' && (
          <div className="v2-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <div className="v2-card">
              {credentials.length > 0 && (
                <div className="v2-filter-bar">
                  <Search size={13} strokeWidth={2} style={{ color: 'var(--v2-text-3)' }} />
                  <span style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
                    {credentials.length} provider{credentials.length === 1 ? '' : 's'} configured
                  </span>
                </div>
              )}
              {loading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: 'var(--v2-text-2)' }}>
                  Loading…
                </div>
              ) : credentials.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title="No DNS providers yet"
                  desc="Add a provider so SSLVault can create _acme-challenge records automatically during cert generation."
                  ctaLabel="Add your first provider"
                  onCta={() => setShowAddDns(true)}
                />
              ) : (
                credentials.map(cred => (
                  <DnsRow key={cred.id} cred={cred}
                    selected={selectedDns === cred.id}
                    onSelect={setSelectedDns}
                    status={credStatus[cred.id] || 'untested'} />
                ))
              )}
            </div>
            <div>
              {selDnsCred ? (
                <DnsDetail
                  cred={selDnsCred}
                  status={credStatus[selDnsCred.id] || 'untested'}
                  testing={testing === selDnsCred.id}
                  testResult={testResult[selDnsCred.id]}
                  onTest={testCred}
                  onDelete={deleteCred}
                />
              ) : credentials.length > 0 ? (
                <div className="v2-detail" style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>Select a provider to see details</div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {tab === 'servers' && (
          <div className="v2-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <div className="v2-card">
              {servers.length > 0 && (
                <div className="v2-filter-bar">
                  <span className="v2-section-label" style={{ marginRight: 4 }}>FILTER</span>
                  {[
                    { id: 'all',    label: 'All',    n: servers.length },
                    { id: 'ssh',    label: 'VPS',    n: servers.filter(s => s.server_type === 'ssh').length },
                    { id: 'cpanel', label: 'cPanel', n: servers.filter(s => s.server_type === 'cpanel').length },
                    { id: 'plesk',  label: 'Plesk',  n: servers.filter(s => s.server_type === 'plesk').length },
                  ].filter(f => f.id === 'all' || f.n > 0).map(f => (
                    <button key={f.id} className={`v2-filter-chip ${serverTypeFilter === f.id ? 'active' : ''}`}
                            onClick={() => setServerTypeFilter(f.id)}>
                      {f.label}<span className="v2-filter-chip-count">{f.n}</span>
                    </button>
                  ))}
                </div>
              )}
              {loading ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 12, color: 'var(--v2-text-2)' }}>
                  Loading…
                </div>
              ) : servers.length === 0 ? (
                <EmptyState
                  icon={Server}
                  title="No servers saved yet"
                  desc="Save cPanel, VPS, or Plesk credentials so you can install certs in one click — no re-entering passwords."
                  ctaLabel="Add your first server"
                  onCta={() => setShowAddSrv(true)}
                />
              ) : (
                filteredServers.map(s => (
                  <ServerRow key={s.id} server={s}
                    selected={selectedServer === s.id}
                    onSelect={setSelectedServer}
                    agent={agents.find(a => a.server_id === s.id) || null}
                    onInstallAgent={setAgentServer} />
                ))
              )}
            </div>
            <div>
              {selSrv ? (
                <ServerDetail
                  server={selSrv}
                  agent={selSrvAgent}
                  onDelete={deleteServer}
                  onEdit={setEditServer}
                  onInstallAgent={setAgentServer}
                />
              ) : servers.length > 0 ? (
                <div className="v2-detail" style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--v2-text-2)' }}>Select a server to see details</div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: v2-spin 0.8s linear infinite; }
        @keyframes v2-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
