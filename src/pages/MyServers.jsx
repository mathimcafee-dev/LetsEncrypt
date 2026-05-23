// MyServers.jsx — Unified server + DNS setup page
// Customer-first design: VPS or Shared Hosting, zero jargon
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Server, Globe, Plus, RefreshCw, CheckCircle, XCircle,
  Wifi, WifiOff, Copy, Check, ChevronDown, ChevronUp,
  Shield, Trash2, ExternalLink, AlertCircle, Terminal,
  Zap, Lock, Clock
} from 'lucide-react'
import { differenceInMinutes, formatDistanceToNow } from 'date-fns'

const SB = 'https://frthcwkntciaakqsppss.supabase.co'

// ── Helpers ──────────────────────────────────────────────────────────
function agentOnline(a) {
  if (!a.last_seen_at) return false
  return differenceInMinutes(new Date(), new Date(a.last_seen_at)) <= 6
}
function fmtAgo(iso) {
  if (!iso) return 'never'
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '—' }
}
function daysLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

// ── DNS Provider logos (text) ─────────────────────────────────────────
const DNS_PROVIDERS = {
  cloudflare:   { name: 'Cloudflare',    color: '#f97316', initials: 'CF' },
  vercel:       { name: 'Vercel',        color: '#000',    initials: '▲'  },
  route53:      { name: 'Route 53',      color: '#ff9900', initials: 'R53' },
  godaddy:      { name: 'GoDaddy',       color: '#00a4a6', initials: 'GD' },
  digitalocean: { name: 'DigitalOcean',  color: '#0080ff', initials: 'DO' },
  namecheap:    { name: 'Namecheap',     color: '#de3723', initials: 'NC' },
  porkbun:      { name: 'Porkbun',       color: '#ef6c6c', initials: 'PB' },
  gandi:        { name: 'Gandi',         color: '#00b6a0', initials: 'GA' },
  hetzner:      { name: 'Hetzner DNS',   color: '#d50c2d', initials: 'HZ' },
  linode:       { name: 'Linode',        color: '#00a95c', initials: 'LN' },
  vultr:        { name: 'Vultr',         color: '#007bfc', initials: 'VU' },
  bunny:        { name: 'Bunny DNS',     color: '#ff6633', initials: 'BN' },
  dnsimple:     { name: 'DNSimple',      color: '#1f9b55', initials: 'DS' },
}

// ── Copy button ──────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [ok, setOk] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setOk(true); setTimeout(() => setOk(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'none', border: '1px solid #d1d5db',
      borderRadius: 5, padding: '4px 10px',
      fontSize: 11, fontWeight: 500,
      color: ok ? '#1A7A72' : '#6b7280',
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all .15s',
    }}>
      {ok ? <Check size={10} /> : <Copy size={10} />}
      {ok ? 'Copied!' : label}
    </button>
  )
}

// ── Server card ───────────────────────────────────────────────────────
function ServerCard({ agent, certs }) {
  const [expanded, setExpanded] = useState(false)
  const online = agentOnline(agent)
  const certCount = certs.length
  const expiringSoon = certs.filter(c => { const d = daysLeft(c.expires_at); return d !== null && d <= 30 && d >= 0 }).length

  return (
    <div style={{
      background: '#fff', border: `1px solid ${expiringSoon > 0 ? '#F2C4BC' : '#e5e7eb'}`,
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Online indicator */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: online ? '#E8F8F6' : '#FDFAF5',
            border: `1px solid ${online ? '#A8E6DE' : '#e5e7eb'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Server size={18} color={online ? '#16a34a' : '#9ca3af'} />
          </div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: online ? '#22c55e' : '#d1d5db',
            border: '2px solid #fff',
            boxShadow: online ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none',
          }} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0a0a0a', letterSpacing: '-0.2px' }}>
            {agent.nickname || agent.hostname}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span>{agent.ip_address || agent.hostname}</span>
            <span>·</span>
            <span>{agent.os?.replace(/\(.*?\)/g, '').trim() || 'Linux'}</span>
            <span>·</span>
            <span style={{ color: online ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
              {online ? `Online · ${fmtAgo(agent.last_seen_at)}` : `Offline · ${fmtAgo(agent.last_seen_at)}`}
            </span>
          </div>
        </div>

        {/* Certs badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {expiringSoon > 0 && (
            <div style={{
              padding: '4px 10px', borderRadius: 20,
              background: '#FDF0EE', border: '1px solid #F2C4BC',
              fontSize: 11, fontWeight: 600, color: '#E8897A',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertCircle size={10} />
              {expiringSoon} expiring
            </div>
          )}
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: '#E8F8F6', border: '1px solid #A8E6DE',
            fontSize: 11, fontWeight: 600, color: '#1A7A72',
          }}>
            {certCount} cert{certCount !== 1 ? 's' : ''}
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', padding: 4,
          }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded: cert list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F5EFE0' }}>
          {certs.length === 0 ? (
            <div style={{ padding: '16px 20px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              No certificates installed on this server yet
            </div>
          ) : (
            certs.map(cert => {
              const d = daysLeft(cert.expires_at)
              return (
                <div key={cert.id} style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #FDFAF5',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Shield size={13} color={d !== null && d <= 30 ? '#E8897A' : '#3DBFB0'} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#111' }}>
                    {cert.domain}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: d !== null && d <= 0 ? '#dc2626' : d !== null && d <= 30 ? '#E8897A' : '#6b7280',
                    fontWeight: d !== null && d <= 30 ? 600 : 400,
                  }}>
                    {d !== null ? (d <= 0 ? 'Expired' : `${d}d left`) : '—'}
                  </span>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cert.status === 'active' ? '#3DBFB0' : '#e5e7eb',
                  }} />
                </div>
              )
            })
          )}
          {/* Stats bar */}
          {(agent.cpu_pct || agent.mem_pct) && (
            <div style={{
              padding: '10px 20px',
              background: '#FDFAF5', borderTop: '1px solid #F5EFE0',
              display: 'flex', gap: 20, fontSize: 11, color: '#6b7280',
            }}>
              {agent.cpu_pct && <span>CPU: <b style={{color:'#374151'}}>{agent.cpu_pct}%</b></span>}
              {agent.mem_pct && <span>RAM: <b style={{color:'#374151'}}>{agent.mem_pct}%</b></span>}
              {agent.disk_pct && <span>Disk: <b style={{color:'#374151'}}>{agent.disk_pct}%</b></span>}
              {agent.uptime_seconds && <span>Up: <b style={{color:'#374151'}}>{Math.floor(agent.uptime_seconds/86400)}d</b></span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── DNS Credential card ───────────────────────────────────────────────
function DnsCard({ cred, onDelete }) {
  const p = DNS_PROVIDERS[cred.provider] || { name: cred.provider, color: '#6b7280', initials: cred.provider?.slice(0,2).toUpperCase() }
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: p.color + '15', border: `1px solid ${p.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: p.color,
      }}>
        {p.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          {cred.domain_pattern || 'All domains'} · {cred.label}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: '#1A7A72', fontWeight: 500,
      }}>
        <CheckCircle size={11} />
        Connected
      </div>
      <button onClick={() => onDelete(cred.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#d1d5db', padding: 4, transition: 'color .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Add Server Modal ──────────────────────────────────────────────────
function AddServerModal({ onClose, userId }) {
  const [cmd, setCmd] = useState('')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=name, 2=run command

  async function generate() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/agent-daemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'create_install_command', nickname: domain || 'My Server' }),
      })
      const d = await r.json()
      if (d.ok && d.command) { setCmd(d.command); setStep(2) }
    } catch {}
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.3px' }}>
            Connect your server
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Run one command on your VPS — SSLVault handles everything else
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 1 ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Which domain will this server host?
              </label>
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. example.com, mysite.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 14,
                  outline: 'none', fontFamily: 'inherit', marginBottom: 20,
                  boxSizing: 'border-box',
                }}
                onKeyDown={e => e.key === 'Enter' && domain && generate()}
              />
              {/* What this does */}
              <div style={{
                background: '#f8fafc', border: '1px solid #e8edf2',
                borderRadius: 10, padding: 16, marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>What happens when you connect:</div>
                {[
                  { icon: Shield, text: 'A lightweight agent installs on your server (uses ~10MB RAM)' },
                  { icon: Zap, text: 'Certificates install automatically — no manual uploads' },
                  { icon: RefreshCw, text: 'Auto-renews before expiry, 24/7, forever' },
                  { icon: Lock, text: 'Private keys never leave your server' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Icon size={13} color="#3DBFB0" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
                <button onClick={generate} disabled={loading} style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  border: 'none', background: '#0a0a0a',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {loading ? <><RefreshCw size={12} style={{ animation: 'spin .8s linear infinite' }} /> Generating…</> : <>Generate install command</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                background: '#E8F8F6', border: '1px solid #A8E6DE',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#0F5750', fontWeight: 500,
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <CheckCircle size={13} color="#3DBFB0" />
                Command ready — paste this on your server as root or with sudo
              </div>

              {/* Command box */}
              <div style={{
                background: '#0F5750', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
              }}>
                <div style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {['#ff5f57','#ffbd2e','#28c840'].map(c => (
                      <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <CopyBtn text={cmd} label="Copy command" />
                </div>
                <pre style={{
                  padding: '14px 16px', fontSize: 11, lineHeight: 1.8,
                  color: '#3DBFB0', fontFamily: 'monospace',
                  overflowX: 'auto', margin: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {cmd}
                </pre>
              </div>

              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
                After running the command, your server will appear in this page within 1–2 minutes.
                You can then issue a certificate and it will install automatically.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>← Back</button>
                <button onClick={onClose} style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  border: 'none', background: '#0a0a0a',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Done — I ran the command</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add DNS Modal ─────────────────────────────────────────────────────
function AddDnsModal({ onClose, onSaved, userId }) {
  const [provider, setProvider] = useState('')
  const [domain, setDomain] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [teamId, setTeamId] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const POPULAR = ['cloudflare', 'vercel', 'godaddy', 'route53', 'digitalocean', 'namecheap', 'porkbun', 'hetzner']

  async function save() {
    if (!provider || !apiToken) { setError('Please select a provider and enter your API token'); return }
    setSaving(true); setError('')
    try {
      const creds = { apiToken }
      if (teamId) creds.teamId = teamId
      if (apiSecret) creds.apiSecret = apiSecret
      const r = await fetch(`${SB}/functions/v1/dns-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', user_id: userId, provider, label: domain || provider, domain_pattern: domain || null, credentials: creds }),
      })
      const d = await r.json()
      if (d.ok) { onSaved(); onClose() }
      else setError(d.message || 'Failed to save')
    } catch(e) { setError(e?.message || 'Error') }
    setSaving(false)
  }

  const p = DNS_PROVIDERS[provider]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f0f0f0' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#0a0a0a', letterSpacing:'-0.3px' }}>Connect DNS provider</div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>Needed so SSLVault can auto-validate your domain ownership when issuing certs</div>
        </div>
        <div style={{ padding:24 }}>
          {/* Provider grid */}
          <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>Your DNS provider</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
            {POPULAR.map(id => {
              const info = DNS_PROVIDERS[id]
              return (
                <button key={id} onClick={() => setProvider(id)} style={{
                  padding:'10px 6px', borderRadius:8,
                  border:`2px solid ${provider === id ? info.color : '#e5e7eb'}`,
                  background: provider === id ? info.color + '10' : '#fff',
                  cursor:'pointer', textAlign:'center',
                  transition:'all .15s',
                }}>
                  <div style={{ fontSize:13, fontWeight:700, color:provider===id?info.color:'#374151' }}>{info.initials}</div>
                  <div style={{ fontSize:9, color:'#6b7280', marginTop:3 }}>{info.name}</div>
                </button>
              )
            })}
          </div>

          {provider && (
            <>
              {/* Domain */}
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                Your domain (e.g. example.com)
              </label>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
              />

              {/* API Token */}
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
                API Token / Key
              </label>
              <input value={apiToken} onChange={e => setApiToken(e.target.value)}
                type="password" placeholder={provider === 'cloudflare' ? 'Zone:DNS:Edit token' : provider === 'vercel' ? 'Vercel API token' : 'API token or key'}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
              />

              {/* Provider-specific extra fields */}
              {(provider === 'vercel') && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Team ID <span style={{fontWeight:400,color:'#9ca3af'}}>(optional, leave blank for personal)</span></label>
                  <input value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="team_xxxxx"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
                  />
                </>
              )}
              {(provider === 'godaddy' || provider === 'porkbun') && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>API Secret</label>
                  <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} type="password" placeholder="API secret"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
                  />
                </>
              )}

              <a href={
                provider === 'cloudflare' ? 'https://developers.cloudflare.com/fundamentals/api/' :
                provider === 'vercel' ? 'https://vercel.com/account/tokens' :
                provider === 'godaddy' ? 'https://developer.godaddy.com/keys' :
                '#'
              } target="_blank" rel="noreferrer"
                style={{ fontSize:11, color:'#1A7A72', display:'flex', alignItems:'center', gap:4, marginBottom:16, textDecoration:'none' }}>
                <ExternalLink size={10} /> How to get your {p?.name} API token
              </a>
            </>
          )}

          {error && <div style={{ fontSize:12, color:'#dc2626', marginBottom:12, padding:'8px 12px', background:'#fef2f2', borderRadius:6 }}>{error}</div>}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={save} disabled={saving||!provider||!apiToken} style={{
              flex:2, padding:'10px', borderRadius:8, border:'none',
              background: saving||!provider||!apiToken ? '#F5EFE0' : '#0a0a0a',
              color: saving||!provider||!apiToken ? '#9ca3af' : '#fff',
              fontSize:13, fontWeight:600, cursor: saving||!provider||!apiToken ? 'not-allowed' : 'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              {saving ? <><RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> Saving…</> : 'Save credentials'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────
function EmptyState({ hasDns, onAddServer, onAddDns }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
      padding: '40px 32px', textAlign: 'center',
      maxWidth: 560, margin: '0 auto',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: '#E8F8F6',
        border: '1px solid #A8E6DE', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <Server size={24} color="#1A7A72" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>
        Set up your first server
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>
        Two quick steps and your SSL certificates will install and renew automatically — forever.
      </div>

      {/* Two steps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {[
          {
            num: '1', title: 'Connect DNS',
            desc: 'So we can auto-validate your domain',
            done: hasDns, action: onAddDns,
            btnLabel: hasDns ? '✓ Connected' : 'Connect DNS →',
          },
          {
            num: '2', title: 'Add your server',
            desc: 'Run one command — done in 30 seconds',
            done: false, action: onAddServer,
            btnLabel: 'Add server →',
          },
        ].map(step => (
          <div key={step.num} style={{
            padding: '16px', borderRadius: 10,
            border: `1px solid ${step.done ? '#A8E6DE' : '#e5e7eb'}`,
            background: step.done ? '#E8F8F6' : '#fafafa',
            textAlign: 'left',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step.done ? '#3DBFB0' : '#F5EFE0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: step.done ? '#fff' : '#9ca3af',
              marginBottom: 10,
            }}>
              {step.done ? '✓' : step.num}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>{step.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>{step.desc}</div>
            <button onClick={step.done ? undefined : step.action} style={{
              fontSize: 12, fontWeight: 600,
              color: step.done ? '#1A7A72' : '#1A7A72',
              background: 'none', border: 'none', cursor: step.done ? 'default' : 'pointer',
              padding: 0, fontFamily: 'inherit',
            }}>
              {step.btnLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Hosting credential card ───────────────────────────────────────────
function HostingCard({ cred, onDelete }) {
  const domainCount = (cred.domains || []).length
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: '#faf5ff', border: '1px solid #e9d5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#E8897A',
      }}>
        cP
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>
          {cred.label || cred.hostname}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
          {cred.hostname}:{cred.port || 2083} · {cred.cpanel_user}
          {domainCount > 0 && ` · ${domainCount} domain${domainCount !== 1 ? 's' : ''}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1A7A72', fontWeight: 500 }}>
        <CheckCircle size={11} />
        Connected
      </div>
      {cred.install_count > 0 && (
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {cred.install_count} install{cred.install_count !== 1 ? 's' : ''}
        </div>
      )}
      <button onClick={() => onDelete(cred.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#d1d5db', padding: 4, transition: 'color .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Add Hosting Modal ─────────────────────────────────────────────────
function AddHostingModal({ onClose, onSaved, userId }) {
  const [label, setLabel]       = useState('')
  const [hostname, setHostname] = useState('')
  const [port, setPort]         = useState('2083')
  const [username, setUsername] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [testing, setTesting]   = useState(false)
  const [testOk, setTestOk]     = useState(false)

  async function testConnection() {
    if (!hostname || !username || !apiToken) { setError('Fill in all fields first'); return }
    setTesting(true); setError(''); setTestOk(false)
    try {
      const r = await fetch(`${SB}/functions/v1/cpanel-install`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', user_id: userId, hostname, port: parseInt(port)||2083, cpanel_user: username, api_token: apiToken }),
      })
      const d = await r.json()
      if (d.ok) setTestOk(true)
      else setError(d.error || d.message || 'Connection failed — check hostname, username and API token')
    } catch(e) { setError('Connection failed') }
    setTesting(false)
  }

  async function save() {
    if (!hostname || !username || !apiToken) { setError('All fields are required'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch(`${SB}/functions/v1/cpanel-install`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_credential', user_id: userId, label: label || hostname, hostname, port: parseInt(port)||2083, cpanel_user: username, api_token: apiToken }),
      })
      const d = await r.json()
      if (d.ok) { onSaved(); onClose() }
      else setError(d.error || d.message || 'Failed to save')
    } catch(e) { setError('Failed to save') }
    setSaving(false)
  }

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 14,
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f0f0f0' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#0a0a0a' }}>Connect shared hosting</div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>Supports cPanel, WHM and compatible control panels</div>
        </div>
        <div style={{ padding:24 }}>

          {/* How it works */}
          <div style={{ background:'#f8fafc', border:'1px solid #e8edf2', borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginBottom:8 }}>How shared hosting SSL works:</div>
            {[
              'SSLVault connects to your cPanel via its API — no SSH needed',
              'Certificates install directly into your hosting account',
              'Auto-renews just like VPS — no manual uploads ever',
            ].map(t => (
              <div key={t} style={{ display:'flex', gap:8, marginBottom:5, alignItems:'flex-start' }}>
                <CheckCircle size={11} color="#3DBFB0" style={{ marginTop:1, flexShrink:0 }} />
                <span style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Label <span style={{fontWeight:400,color:'#9ca3af'}}>(nickname)</span></label>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Bluehost, GoDaddy cPanel" style={inp} />

          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>cPanel hostname</label>
          <input value={hostname} onChange={e=>setHostname(e.target.value)} placeholder="server.yourhostingprovider.com" style={inp} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>cPanel username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="your-cpanel-username" style={{...inp, marginBottom:0}} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Port</label>
              <input value={port} onChange={e=>setPort(e.target.value)} placeholder="2083" style={{...inp, marginBottom:0}} />
            </div>
          </div>
          <div style={{ marginBottom:14 }} />

          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>API Token</label>
          <div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>
            cPanel → Security → Manage API Tokens → Create token
          </div>
          <input value={apiToken} onChange={e=>setApiToken(e.target.value)} type="password" placeholder="Paste your cPanel API token" style={inp} />

          {testOk && (
            <div style={{ padding:'8px 12px', background:'#E8F8F6', border:'1px solid #A8E6DE', borderRadius:6, fontSize:12, color:'#0F5750', marginBottom:12, display:'flex', gap:6, alignItems:'center' }}>
              <CheckCircle size={12} color="#3DBFB0" /> Connection successful!
            </div>
          )}
          {error && <div style={{ padding:'8px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, fontSize:12, color:'#dc2626', marginBottom:12 }}>{error}</div>}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={testConnection} disabled={testing} style={{
              flex:1, padding:'10px', borderRadius:8,
              border:'1px solid #e5e7eb', background:'#fafafa',
              fontSize:13, fontWeight:600, color:'#374151',
              cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              {testing ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Testing…</> : 'Test connection'}
            </button>
            <button onClick={save} disabled={saving||!hostname||!username||!apiToken} style={{
              flex:2, padding:'10px', borderRadius:8, border:'none',
              background: saving||!hostname||!username||!apiToken ? '#F5EFE0' : '#0a0a0a',
              color: saving||!hostname||!username||!apiToken ? '#9ca3af' : '#fff',
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              {saving ? <><RefreshCw size={11} style={{animation:'spin .8s linear infinite'}}/> Saving…</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function MyServers({ user }) {
  const [agents, setAgents] = useState([])
  const [certs, setCerts] = useState([])
  const [dnsCredentials, setDnsCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddServer, setShowAddServer] = useState(false)
  const [showAddDns, setShowAddDns] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('servers') // servers | dns | hosting
  const [cpanelCreds, setCpanelCreds] = useState([])
  const [showAddHosting, setShowAddHosting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: agentData }, { data: certData }, { data: dnsData }, { data: cpanelData }, { data: serverCredsData }] = await Promise.all([
      supabase.from('persistent_agents').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false, nullsFirst: false }),
      supabase.from('certificates').select('id,domain,expires_at,status,install_method').eq('user_id', user.id).neq('status', 'revoked'),
      supabase.from('dns_credentials').select('id,provider,label,domain_pattern,created_at').eq('user_id', user.id),
      supabase.from('cpanel_credentials').select('id,label,hostname,port,cpanel_user,domains,install_count,last_used_at').eq('user_id', user.id),
      supabase.from('server_credentials').select('id,nickname,host,port,username,server_type,domains,created_at').eq('user_id', user.id).eq('server_type','cpanel'),
    ])
    setAgents(agentData || [])
    setCerts(certData || [])
    setDnsCredentials(dnsData || [])
    // Merge cpanel_credentials + server_credentials (cpanel type) into one list
    const fromVault = (cpanelData || []).map(c => ({ ...c, _source: 'cpanel_credentials', cpanel_user: c.cpanel_user }))
    const fromServer = (serverCredsData || []).map(s => ({
      id: s.id, label: s.nickname, hostname: s.host, port: s.port,
      cpanel_user: s.username, domains: s.domains || [], install_count: null,
      last_used_at: null, _source: 'server_credentials'
    }))
    setCpanelCreds([...fromVault, ...fromServer])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function deleteDns(id) {
    if (!confirm('Remove this DNS provider?')) return
    await fetch(`${SB}/functions/v1/dns-provider`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, user_id: user.id }),
    })
    load()
  }

  async function deleteCpanel(id, source) {
    if (!confirm('Remove this hosting account?')) return
    if (source === 'server_credentials') {
      await supabase.from('server_credentials').delete().eq('id', id).eq('user_id', user.id)
    } else {
      await supabase.from('cpanel_credentials').delete().eq('id', id).eq('user_id', user.id)
    }
    load()
  }

  const onlineCount = agents.filter(agentOnline).length
  const hasSetup = agents.length > 0 || dnsCredentials.length > 0 || cpanelCreds.length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'DM Sans','Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {showAddServer && <AddServerModal onClose={() => { setShowAddServer(false); setTimeout(load, 2000) }} userId={user?.id} />}
      {showAddDns && <AddDnsModal onClose={() => setShowAddDns(false)} onSaved={load} userId={user?.id} />}
      {showAddHosting && <AddHostingModal onClose={() => setShowAddHosting(false)} onSaved={load} userId={user?.id} />}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.5px', margin: 0 }}>
              My Servers
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Manage your servers and DNS connections for automatic SSL
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 12, fontWeight: 600, color: '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={() => setShowAddDns(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 12, fontWeight: 600, color: '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Globe size={12} /> Add DNS
            </button>
            <button onClick={() => setShowAddHosting(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 12, fontWeight: 600, color: '#374151',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Globe size={12} /> Add hosting
            </button>
            <button onClick={() => setShowAddServer(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: 'none', background: '#0a0a0a',
              fontSize: 12, fontWeight: 600, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={12} /> Add server
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin .8s linear infinite', marginRight: 8 }} />
            Loading…
          </div>
        ) : !hasSetup ? (
          <EmptyState hasDns={dnsCredentials.length > 0} onAddServer={() => setShowAddServer(true)} onAddDns={() => setShowAddDns(true)} />
        ) : (
          <>
            {/* Status strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { num: agents.length, label: 'Servers connected', color: '#374151', sub: `${onlineCount} online` },
                { num: certs.filter(c => c.status === 'active').length, label: 'Certs protected', color: '#1A7A72', sub: 'auto-renewing' },
                { num: dnsCredentials.length, label: 'DNS providers', color: '#1A7A72', sub: 'for auto-validation' },
              ].map(({ num, label, color, sub }) => (
                <div key={label} style={{
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-1px', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
              {[
                { id: 'servers', label: `Servers (${agents.length})`, icon: Server },
                { id: 'dns',     label: `DNS providers (${dnsCredentials.length})`, icon: Globe },
              { id: 'hosting', label: `Shared Hosting (${cpanelCreds.length})`, icon: Globe },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', fontSize: 13, fontWeight: 500,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === id ? '#0a0a0a' : '#6b7280',
                  borderBottom: `2px solid ${activeTab === id ? '#0a0a0a' : 'transparent'}`,
                  marginBottom: -1, fontFamily: 'inherit', transition: 'all .15s',
                }}>
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Servers tab */}
            {activeTab === 'servers' && (
              <div>
                {agents.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px 24px',
                    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                  }}>
                    <Server size={28} color="#e5e7eb" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No servers connected yet</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Connect your VPS to enable automatic cert installation</div>
                    <button onClick={() => setShowAddServer(true)} style={{
                      padding: '9px 18px', borderRadius: 8, border: 'none',
                      background: '#0a0a0a', color: '#fff', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      <Plus size={12} /> Add your server
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {agents.map(agent => (
                      <ServerCard
                        key={agent.id}
                        agent={agent}
                        certs={certs.filter(c => c.install_method === 'agent')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hosting tab */}
            {activeTab === 'hosting' && (
              <div>
                <div style={{
                  background: '#faf5ff', border: '1px solid #e9d5ff',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  fontSize: 12, color: '#6d28d9', lineHeight: 1.6,
                }}>
                  <b>Shared hosting (cPanel):</b> SSLVault connects directly to your hosting account via the cPanel API. No SSH, no server access needed. Certificates install and renew automatically.
                </div>
                {cpanelCreds.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 24px', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb' }}>
                    <Globe size={28} color="#e5e7eb" style={{ marginBottom:12 }} />
                    <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>No hosting accounts connected</div>
                    <div style={{ fontSize:13, color:'#9ca3af', marginBottom:16 }}>Connect your cPanel to install SSL automatically</div>
                    <button onClick={() => setShowAddHosting(true)} style={{
                      padding:'9px 18px', borderRadius:8, border:'none',
                      background:'#0a0a0a', color:'#fff', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit',
                      display:'inline-flex', alignItems:'center', gap:6,
                    }}>
                      <Plus size={12} /> Connect cPanel
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {cpanelCreds.map(cred => (
                      <HostingCard key={cred.id} cred={cred} onDelete={(id) => deleteCpanel(id, cred._source)} />
                    ))}
                    <button onClick={() => setShowAddHosting(true)} style={{
                      padding:'12px', borderRadius:10,
                      border:'1px dashed #d1d5db', background:'#fafafa',
                      fontSize:12, fontWeight:600, color:'#6b7280',
                      cursor:'pointer', fontFamily:'inherit',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    }}>
                      <Plus size={12} /> Add another hosting account
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DNS tab */}
            {activeTab === 'dns' && (
              <div>
                {/* Why DNS explanation */}
                <div style={{
                  background: '#E8F8F6', border: '1px solid #A8E6DE',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  fontSize: 12, color: '#1A7A72', lineHeight: 1.6,
                }}>
                  <b>Why do we need DNS credentials?</b> When issuing a certificate, we need to prove you own the domain. We do this by automatically adding a TXT record to your DNS — no manual steps needed.
                </div>

                {dnsCredentials.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px 24px',
                    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                  }}>
                    <Globe size={28} color="#e5e7eb" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No DNS provider connected</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Required before issuing your first certificate</div>
                    <button onClick={() => setShowAddDns(true)} style={{
                      padding: '9px 18px', borderRadius: 8, border: 'none',
                      background: '#0a0a0a', color: '#fff', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      <Plus size={12} /> Connect DNS provider
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dnsCredentials.map(cred => (
                      <DnsCard key={cred.id} cred={cred} onDelete={deleteDns} />
                    ))}
                    <button onClick={() => setShowAddDns(true)} style={{
                      padding: '12px', borderRadius: 10,
                      border: '1px dashed #d1d5db', background: '#fafafa',
                      fontSize: 12, fontWeight: 600, color: '#6b7280',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Plus size={12} /> Add another DNS provider
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
