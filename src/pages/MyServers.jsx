// MyServers.jsx — Unified server + DNS setup page
// Customer-first design: VPS or Shared Hosting, zero jargon
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Server, Globe, Plus, RefreshCw, CheckCircle, XCircle,
  Wifi, WifiOff, Copy, Check, ChevronDown, ChevronUp,
  Shield, Trash2, ExternalLink, AlertCircle, Terminal,
  Zap, Lock, Clock, Upload, FileText, Info, Eye, EyeOff, ChevronRight, AlertTriangle
} from 'lucide-react'
import '../styles/design-v2.css'
import { differenceInMinutes, formatDistanceToNow } from 'date-fns'

const CA_FN = (import.meta.env.VITE_SUPABASE_URL || 'https://frthcwkntciaakqsppss.supabase.co') + '/functions/v1/ca-import'
async function callCA(tok, body) {
  const r = await fetch(CA_FN, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${tok}`}, body:JSON.stringify(body) })
  return r.json()
}
const CA_DEFS = {
  digicert:{ name:'DigiCert CertCentral', color:'#0077b6', bg:'rgba(0,119,182,0.09)', border:'rgba(0,0,0,0.1)', logo:'DC',
    desc:'Pull all issued certificates from your CertCentral account. Monitoring only — no private keys needed.',
    fields:[{key:'api_key',label:'API Key',type:'password',placeholder:'Your CertCentral API key',required:true},{key:'account_id',label:'Account ID (optional)',type:'text',placeholder:'Division / sub-account ID',required:false}],
    docs:'https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html'},
  sectigo:{ name:'Sectigo SCM', color:'#111111', bg:'rgba(239,68,68,0.08)', border:'rgba(0,0,0,0.1)', logo:'SC',
    desc:'Pull all certificates from Sectigo Certificate Manager. Monitoring only — no private keys needed.',
    fields:[{key:'customer_uri',label:'Customer URI',type:'text',placeholder:'your-company',required:true},{key:'login',label:'Login',type:'text',placeholder:'admin@yourcompany.com',required:true},{key:'password',label:'Password',type:'password',placeholder:'••••••••',required:true}],
    docs:'https://sectigo.com/knowledge-base/detail/Sectigo-Certificate-Manager-API/kA01N000000bvOx'},
  sslcom:{ name:'SSL.com', color:'#111111', bg:'rgba(0,119,182,0.08)', border:'rgba(0,119,182,0.2)', logo:'SL',
    desc:'Pull all issued certificates from your SSL.com reseller account. Monitoring only — no private keys needed.',
    fields:[{key:'account_key',label:'Account Key',type:'password',placeholder:'Your SSL.com account key',required:true},{key:'secret_key',label:'Secret Key',type:'password',placeholder:'Your SSL.com secret key',required:true}],
    docs:'https://www.ssl.com/restful_api'},
}
const SB = import.meta.env.VITE_SUPABASE_URL || 'https://frthcwkntciaakqsppss.supabase.co'

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
  cloudflare:   { name: 'Cloudflare',    color: '#0077b6', initials: 'CF' },
  vercel:       { name: 'Vercel',        color: '#0077b6', initials: '▲'  },
  route53:      { name: 'Route 53',      color: '#0077b6', initials: 'R53' },
  godaddy:      { name: 'GoDaddy',       color: '#0077b6', initials: 'GD' },
  digitalocean: { name: 'DigitalOcean',  color: '#0077b6', initials: 'DO' },
  namecheap:    { name: 'Namecheap',     color: '#0077b6', initials: 'NC' },
  porkbun:      { name: 'Porkbun',       color: '#0077b6', initials: 'PB' },
  gandi:        { name: 'Gandi',         color: '#0077b6', initials: 'GA' },
  hetzner:      { name: 'Hetzner DNS',   color: '#0077b6', initials: 'HZ' },
  linode:       { name: 'Linode',        color: '#0077b6', initials: 'LN' },
  vultr:        { name: 'Vultr',         color: '#0077b6', initials: 'VU' },
  bunny:        { name: 'Bunny DNS',     color: '#0077b6', initials: 'BN' },
  dnsimple:     { name: 'DNSimple',      color: '#0077b6', initials: 'DS' },
}

// ── Copy button ──────────────────────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

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
      fontSize:11, fontWeight: 500,
      color: ok ? '#111111' : 'var(--v2-text-3)',
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
      background: 'var(--v2-surface)', border: `1px solid ${expiringSoon > 0 ? 'rgba(0,0,0,0.1)' : 'rgba(240,237,232,0.12)'}`,
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Online indicator */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: online ? 'transparent' : '#000000',
            border: `1px solid ${online ? 'rgba(0,119,182,0.2)' : 'rgba(240,237,232,0.12)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Server size={18} color={online ? '#00a550' : '#888888'} />
          </div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: online ? '#00a550' : '#bbbbbb',
            border: '2px solid #fff',
            boxShadow: online ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none',
          }} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize:15, color: '#111111', letterSpacing: '-0.2px' }}>
            {agent.nickname || agent.hostname}
          </div>
          <div style={{ fontSize:12, color: '#888888', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span>{agent.ip_address || agent.hostname}</span>
            <span>·</span>
            <span>{agent.os?.replace(/\(.*?\)/g, '').trim() || 'Linux'}</span>
            <span>·</span>
            <span style={{ color: online ? '#00a550' : '#888888', fontWeight: 500 }}>
              {online ? `Online · ${fmtAgo(agent.last_seen_at)}` : `Offline · ${fmtAgo(agent.last_seen_at)}`}
            </span>
          </div>
        </div>

        {/* Certs badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {expiringSoon > 0 && (
            <div style={{
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(154,100,0,0.2)',
              fontSize:11, fontWeight: 600, color: '#111111',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertCircle size={10} />
              {expiringSoon} expiring
            </div>
          )}
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: 'transparent', border: '1px solid rgba(0,119,182,0.2)',
            fontSize:11, fontWeight: 600, color: '#111111',
          }}>
            {certCount} cert{certCount !== 1 ? 's' : ''}
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#888888', padding: 4,
          }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded: cert list */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(0,119,182,0.07)' }}>
          {certs.length === 0 ? (
            <div style={{ padding: '16px 20px', fontSize:13, color: '#888888', textAlign: 'center' }}>
              No certificates installed on this server yet
            </div>
          ) : (
            certs.map(cert => {
              const d = daysLeft(cert.expires_at)
              return (
                <div key={cert.id} style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid rgba(0,119,182,0.07)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Shield size={13} color={d !== null && d <= 30 ? '#111111' : '#111111'} />
                  <span style={{ flex: 1, fontSize:13, fontWeight: 500, color: 'transparent' }}>
                    {cert.domain}
                  </span>
                  <span style={{
                    fontSize:11,
                    color: d !== null && d <= 0 ? '#0077b6' : d !== null && d <= 30 ? '#111111' : 'var(--v2-text-3)',
                    fontWeight: d !== null && d <= 30 ? 600 : 400,
                  }}>
                    {d !== null ? (d <= 0 ? 'Expired' : `${d}d left`) : '—'}
                  </span>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cert.status === 'active' ? '#111111' : 'rgba(240,237,232,0.12)',
                  }} />
                </div>
              )
            })
          )}
          {/* Stats bar */}
          {(agent.cpu_pct || agent.mem_pct) && (
            <div style={{
              padding: '10px 20px',
              background: 'transparent', borderTop: '1px solid rgba(0,119,182,0.07)',
              display: 'flex', gap: 20, fontSize:11, color: '#888888',
            }}>
              {agent.cpu_pct && <span>CPU: <b style={{color:'#333333'}}>{agent.cpu_pct}%</b></span>}
              {agent.mem_pct && <span>RAM: <b style={{color:'#333333'}}>{agent.mem_pct}%</b></span>}
              {agent.disk_pct && <span>Disk: <b style={{color:'#333333'}}>{agent.disk_pct}%</b></span>}
              {agent.uptime_seconds && <span>Up: <b style={{color:'#333333'}}>{Math.floor(agent.uptime_seconds/86400)}d</b></span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── DNS Credential card ───────────────────────────────────────────────
function DnsCard({ cred, onDelete, deletingId }) {
  const isConfirming = deletingId === cred.id
  const p = DNS_PROVIDERS[cred.provider] || { name: cred.provider, color: '#0077b6', initials: cred.provider?.slice(0,2).toUpperCase() }
  return (
    <div style={{
      background: 'var(--v2-surface)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: p.color + '15', border: `1px solid ${p.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:11, fontWeight: 700, color: p.color,
      }}>
        {p.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize:13, color: 'transparent' }}>{p.name}</div>
        <div style={{ fontSize:11, color: '#888888', marginTop: 2 }}>
          {cred.domain_pattern || 'All domains'} · {cred.label}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize:11, color: '#111111', fontWeight: 500,
      }}>
        <CheckCircle size={11} />
        Connected
      </div>
      {isConfirming ? (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:'#0077b6' }}>Remove?</span>
          <button onClick={() => onDelete(cred.id)} style={{
            background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.2)',
            cursor:'pointer', color:'#0077b6', padding:'4px 10px', borderRadius:6,
            fontSize:11, fontWeight:600, fontFamily:'inherit'
          }}>Yes</button>
          <button onClick={() => onDelete('cancel')} style={{
            background:'none', border:'1px solid rgba(0,0,0,0.07)',
            cursor:'pointer', color:'#888888', padding:'4px 10px', borderRadius:6,
            fontSize:11, fontFamily:'inherit'
          }}>No</button>
        </div>
      ) : (
        <button onClick={() => onDelete(cred.id)} style={{
          background: 'none', border: '1px solid rgba(192,57,43,0.2)', cursor: 'pointer',
          color: '#0077b6', padding: '4px 8px', borderRadius: 6, transition: 'all .15s',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.07)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          <Trash2 size={11} /> Remove
        </button>
      )}
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#f0f4fa', borderRadius: 14, width: '100%', maxWidth: 500,
        border: '1px solid rgba(0,119,182,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:16, fontWeight: 700, color: '#111111', letterSpacing: '-0.3px' }}>
            Connect your server
          </div>
          <div style={{ fontSize:13, color: '#888888', marginTop: 4 }}>
            Run one command on your VPS — SSLVault handles everything else
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 1 ? (
            <>
              <label style={{ fontSize:12, fontWeight: 600, color: '#333333', display: 'block', marginBottom: 8 }}>
                Which domain will this server host?
              </label>
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. example.com, mysite.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)', fontSize:14,
                  outline: 'none', fontFamily: 'inherit', marginBottom: 20,
                  boxSizing: 'border-box', background: 'rgba(0,0,0,0.04)', color: '#111111',
                }}
                onKeyDown={e => e.key === 'Enter' && domain && generate()}
              />
              {/* What this does */}
              <div style={{
                background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 10, padding: 16, marginBottom: 20,
              }}>
                <div style={{ fontSize:12, fontWeight: 600, color: '#333333', marginBottom: 10 }}>What happens when you connect:</div>
                {[
                  { icon: Shield, text: 'A lightweight agent installs on your server (uses ~10MB RAM)' },
                  { icon: Zap, text: 'Certificates install automatically — no manual uploads' },
                  { icon: RefreshCw, text: 'Auto-renews before expiry, 24/7, forever' },
                  { icon: Lock, text: 'Private keys never leave your server' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Icon size={13} color="#0077b6" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize:12, color: '#333333', lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
                  fontSize:13, fontWeight: 600, color: '#333333',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
                <button onClick={generate} disabled={loading} style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  border: 'none', background: '#0077b6',
                  fontSize:13, fontWeight: 600, color: '#111111',
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
                background: 'transparent', border: '1px solid rgba(0,119,182,0.2)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize:12, color: '#111111', fontWeight: 500,
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <CheckCircle size={13} color="#0077b6" />
                Command ready — paste this on your server as root or with sudo
              </div>

              {/* Command box */}
              <div style={{
                background: '#f0f4fa', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
              }}>
                <div style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {['#0077b6','#ffbd2e','#28c840'].map(c => (
                      <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <CopyBtn text={cmd} label="Copy command" />
                </div>
                <pre style={{
                  padding: '14px 16px', fontSize:11, lineHeight: 1.8,
                  color: '#111111', fontFamily: 'monospace',
                  overflowX: 'auto', margin: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {cmd}
                </pre>
              </div>

              <div style={{ fontSize:12, color: '#888888', marginBottom: 20, lineHeight: 1.6 }}>
                After running the command, your server will appear in this page within 1–2 minutes.
                You can then issue a certificate and it will install automatically.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
                  fontSize:13, fontWeight: 600, color: '#333333',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>← Back</button>
                <button onClick={onClose} style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  border: 'none', background: '#0077b6',
                  fontSize:13, fontWeight: 600, color: '#111111',
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#f0f4fa', borderRadius:14, width:'100%', maxWidth:460, border:'1px solid rgba(0,119,182,0.2)', boxShadow:'0 24px 64px rgba(0,0,0,0.6)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#111111', letterSpacing:'-0.3px' }}>Connect DNS provider</div>
          <div style={{ fontSize:13, color:'#888888', marginTop:4 }}>Needed so SSLVault can auto-validate your domain ownership when issuing certs</div>
        </div>
        <div style={{ padding:24 }}>
          {/* Provider grid */}
          <div style={{ fontSize:12, fontWeight:600, color:'#333333', marginBottom:10 }}>Your DNS provider</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:8, marginBottom:20 }}>
            {POPULAR.map(id => {
              const info = DNS_PROVIDERS[id]
              return (
                <button key={id} onClick={() => setProvider(id)} style={{
                  padding:'12px 10px', borderRadius:8,
                  border:`1.5px solid ${provider === id ? info.color : 'rgba(0,0,0,0.08)'}`,
                  background: provider === id ? info.color + '15' : 'rgba(0,0,0,0.02)',
                  cursor:'pointer', textAlign:'center',
                  transition:'all .15s',
                  boxShadow: provider === id ? `0 0 0 3px ${info.color}20` : 'none',
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:provider===id?info.color:'#666666', fontFamily:'monospace', marginBottom:4 }}>{info.initials}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:provider===id?info.color:'#333333', lineHeight:1.2 }}>{info.name}</div>
                </button>
              )
            })}
          </div>

          {provider && (
            <>
              {/* Domain */}
              <label style={{ fontSize:12, fontWeight:600, color:'#333333', display:'block', marginBottom:6 }}>
                Your domain (e.g. example.com)
              </label>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
              />

              {/* API Token */}
              <label style={{ fontSize:12, fontWeight:600, color:'#333333', display:'block', marginBottom:6 }}>
                API Token / Key
              </label>
              <input value={apiToken} onChange={e => setApiToken(e.target.value)}
                type="password" placeholder={provider === 'cloudflare' ? 'Zone:DNS:Edit token' : provider === 'vercel' ? 'Vercel API token' : 'API token or key'}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
              />

              {/* Provider-specific extra fields */}
              {(provider === 'vercel') && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#333333', display:'block', marginBottom:6 }}>Team ID <span style={{fontWeight:400,color:'#888888'}}>(optional, leave blank for personal)</span></label>
                  <input value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="team_xxxxx"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
                  />
                </>
              )}
              {(provider === 'godaddy' || provider === 'porkbun') && (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#333333', display:'block', marginBottom:6 }}>API Secret</label>
                  <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} type="password" placeholder="API secret"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:14, boxSizing:'border-box' }}
                  />
                </>
              )}

              <a href={
                provider === 'cloudflare' ? 'https://developers.cloudflare.com/fundamentals/api/' :
                provider === 'vercel' ? 'https://vercel.com/account/tokens' :
                provider === 'godaddy' ? 'https://developer.godaddy.com/keys' :
                '#'
              } target="_blank" rel="noreferrer"
                style={{ fontSize:11, color:'#111111', display:'flex', alignItems:'center', gap:4, marginBottom:16, textDecoration:'none' }}>
                <ExternalLink size={10} /> How to get your {p?.name} API token
              </a>
            </>
          )}

          {error && <div style={{ fontSize:12, color:'#0077b6', marginBottom:12, padding:'8px 12px', background:'rgba(0,119,182,0.09)', borderRadius:6 }}>{error}</div>}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', background:'var(--v2-surface)', fontSize:13, fontWeight:600, color:'#333333', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={save} disabled={saving||!provider||!apiToken} style={{
              flex:2, padding:'10px', borderRadius:8, border:'none',
              background: saving||!provider||!apiToken ? 'rgba(0,0,0,0.05)' : '#0077b6',
              color: saving||!provider||!apiToken ? '#999999' : '#ffffff',
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
      background: 'var(--v2-surface)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14,
      padding:'min(40px,5vw) min(32px,4vw)', textAlign: 'center',
      maxWidth: 560, margin: '0 auto',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: 'transparent',
        border: '1px solid rgba(0,119,182,0.2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <Server size={24} color="#0077b6" />
      </div>
      <div style={{ fontSize:18, fontWeight: 700, color: '#111111', marginBottom: 8 }}>
        Set up your first server
      </div>
      <div style={{ fontSize:14, color: '#888888', lineHeight: 1.7, marginBottom: 28 }}>
        Two quick steps and your SSL certificates will install and renew automatically — forever.
      </div>

      {/* Two steps */}
      <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 12, marginBottom: 28 }}>
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
            border: `1px solid ${step.done ? 'rgba(0,119,182,0.2)' : 'rgba(240,237,232,0.12)'}`,
            background: step.done ? 'transparent' : 'var(--v2-bg)',
            textAlign: 'left',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step.done ? '#111111' : '#000000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize:11, fontWeight: 700,
              color: step.done ? 'var(--v2-surface)' : '#888888',
              marginBottom: 10,
            }}>
              {step.done ? '✓' : step.num}
            </div>
            <div style={{ fontSize:13, fontWeight: 700, color: 'transparent', marginBottom: 4 }}>{step.title}</div>
            <div style={{ fontSize:12, color: '#888888', marginBottom: 12, lineHeight: 1.5 }}>{step.desc}</div>
            <button onClick={step.done ? undefined : step.action} style={{
              fontSize:12, fontWeight: 600,
              color: step.done ? '#111111' : '#111111',
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
function HostingCard({ cred, onDelete, deletingId }) {
  const isConfirming = deletingId === cred.id
  const domainCount = (cred.domains || []).length
  return (
    <div style={{
      background: 'var(--v2-surface)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: 'rgba(30,0,0,0.4)', border: '1px solid #e9d5ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:11, fontWeight: 700, color: '#111111',
      }}>
        cP
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize:13, color: 'transparent' }}>
          {cred.label || cred.hostname}
        </div>
        <div style={{ fontSize:11, color: '#888888', marginTop: 2 }}>
          {cred.hostname}:{cred.port || 2083} · {cred.cpanel_user}
          {domainCount > 0 && ` · ${domainCount} domain${domainCount !== 1 ? 's' : ''}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize:11, color: '#111111', fontWeight: 500 }}>
        <CheckCircle size={11} />
        Connected
      </div>
      {cred.install_count > 0 && (
        <div style={{ fontSize:11, color: '#888888' }}>
          {cred.install_count} install{cred.install_count !== 1 ? 's' : ''}
        </div>
      )}
      <button onClick={() => onDelete(cred.id)} style={{
        background: 'none', border: '1px solid rgba(192,57,43,0.2)', cursor: 'pointer',
        color: '#0077b6', padding: '4px 8px', borderRadius: 6, transition: 'all .15s',
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        title="Remove this server"
      >
        <Trash2 size={11} /> Remove
      </button>
    </div>
  )
}

// ── Add Hosting Modal ─────────────────────────────────────────────────
function AddHostingModal({ onClose, onSaved, userId }) {
  const [hostname, setHostname] = useState('')
  const [port, setPort]         = useState('2083')
  const [username, setUsername] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [saved, setSaved]       = useState(false)

  async function save() {
    if (!hostname || !username || !apiToken) { setError('Hostname, username and API token are required'); return }
    setSaving(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/cpanel-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'save_credential',
          host: hostname,
          username,
          api_token: apiToken,
          port: parseInt(port) || 2083,
          nickname: username + '@' + hostname,
        }),
      })
      const d = await r.json()
      if (d.ok) { setSaved(true); setTimeout(() => { onSaved(); onClose() }, 800) }
      else setError(d.error || 'Failed to save — check your credentials')
    } catch(e) { setError('Failed to save: ' + e.message) }
    setSaving(false)
  }

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 7,
    border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.04)', color: '#111111',
  }
  const lbl = { fontSize: 11, fontWeight: 600, color: '#555555',
    textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#0d0505', border:'1px solid rgba(0,0,0,0.08)',
        borderRadius:12, width:'100%', maxWidth:440,
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111111' }}>Connect cPanel hosting</div>
            <div style={{ fontSize:12, color:'#666666', marginTop:2 }}>
              Certificates install and renew automatically
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'#888888', fontSize:20, lineHeight:1, padding:'2px 4px' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding:'22px 22px 18px' }}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>cPanel Hostname</label>
            <input value={hostname} onChange={e=>setHostname(e.target.value)}
              placeholder="server.yourhostingprovider.com" style={inp} autoFocus/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>cPanel Username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="your-username" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Port</label>
              <input value={port} onChange={e=>setPort(e.target.value)}
                placeholder="2083" style={inp}/>
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={lbl}>API Token</label>
            <div style={{ fontSize:11, color:'#999999', marginBottom:5 }}>
              cPanel → Security → Manage API Tokens → Create token
            </div>
            <input value={apiToken} onChange={e=>setApiToken(e.target.value)}
              type="password" placeholder="Paste your API token here" style={inp}/>
          </div>

          {saved && (
            <div style={{ padding:'10px 14px', background:'rgba(0,165,80,0.07)',
              border:'1px solid rgba(0,165,80,0.22)', borderRadius:7,
              fontSize:12, color:'#00a550', marginBottom:14, display:'flex', gap:8, alignItems:'center' }}>
              <CheckCircle size={13}/> Server saved successfully!
            </div>
          )}
          {error && (
            <div style={{ padding:'10px 14px', background:'rgba(192,57,43,0.07)',
              border:'1px solid rgba(0,119,182,0.2)', borderRadius:7,
              fontSize:12, color:'#0077b6', marginBottom:14 }}>{error}</div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:7,
              border:'1px solid rgba(0,0,0,0.07)', background:'transparent',
              fontSize:13, fontWeight:500, color:'#555555',
              cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
            <button onClick={save}
              disabled={saving || !hostname || !username || !apiToken}
              style={{ flex:2, padding:'10px', borderRadius:7, border:'none',
                background: (!hostname||!username||!apiToken) ? 'rgba(0,119,182,0.2)' : '#0077b6',
                color: (!hostname||!username||!apiToken) ? 'rgba(255,255,255,0.4)' : '#ffffff',
                fontSize:13, fontWeight:600, cursor: (!hostname||!username||!apiToken) ? 'default' : 'pointer',
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {saving
                ? <><RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> Saving…</>
                : saved ? '✓ Saved' : 'Save server'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function MyServers({ user }) {
  const isMobile = useIsMobile()
  const [agents, setAgents] = useState([])
  const [certs, setCerts] = useState([])
  const [dnsCredentials, setDnsCredentials] = useState([])
  const [loading, setLoading] = useState(true)

  // ── CA Connections state ──────────────────────────────────────────
  const [caTok,        setCaTok]       = useState('')
  const [caConns,      setCaConns]     = useState([])
  const [caSyncResult, setCaSyncResult]= useState({})
  const [caSyncing,    setCaSyncing]   = useState(null)
  const [caDelConn,    setCaDelConn]   = useState(null)
  const [caDelCerts,   setCaDelCerts]  = useState(true)
  const [showAddCA,    setShowAddCA]   = useState(false)
  const [addCa,        setAddCa]       = useState(null)
  const [addLabel,     setAddLabel]    = useState('')
  const [addFields,    setAddFields]   = useState({})
  const [addSaving,    setAddSaving]   = useState(false)
  const [addError,     setAddError]    = useState('')
  const [showPwd,      setShowPwd]     = useState({})
  const [showImport,   setShowImport]  = useState(false)
  const [pemText,      setPemText]     = useState('')
  const [importing,    setImporting]   = useState(false)
  const [importResult, setImportResult]= useState(null)
  const [caCertCount,  setCaCertCount] = useState(0)
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

  // All hooks BEFORE any early returns or async functions
  const [deletingDnsId, setDeletingDnsId] = useState(null)
  const [deletingCpanelId, setDeletingCpanelId] = useState(null)

  async function deleteDns(id) {
    if (id === 'cancel') { setDeletingDnsId(null); return }
    if (deletingDnsId !== id) { setDeletingDnsId(id); return }
    setDeletingDnsId(null)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${SB}/functions/v1/dns-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: 'delete', id, user_id: user.id }),
    })
    load()
  }

  async function deleteCpanel(id, source) {
    if (id === 'cancel') { setDeletingCpanelId(null); return }
    if (deletingCpanelId !== id) { setDeletingCpanelId(id); return }
    setDeletingCpanelId(null)
    if (source === 'server_credentials') {
      // Clear FK reference in certificates first, then delete
      await supabase.from('certificates').update({ install_server_id: null }).eq('install_server_id', id).eq('user_id', user.id)
      await supabase.from('server_credentials').delete().eq('id', id).eq('user_id', user.id)
    } else {
      await supabase.from('cpanel_credentials').delete().eq('id', id).eq('user_id', user.id)
    }
    load()
  }

  const onlineCount = agents.filter(agentOnline).length
  const hasSetup = agents.length > 0 || dnsCredentials.length > 0 || cpanelCreds.length > 0

  const loadCA = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const tok = session?.access_token || ''; setCaTok(tok); if (!tok) return
    const r = await callCA(tok, { action: 'list_connections' })
    if (r.connections) setCaConns(r.connections)
    if (r.total_certs !== undefined) setCaCertCount(r.total_certs)
  }
  const caOpenAdd = (ca) => { setAddCa(ca); setAddLabel(CA_DEFS[ca]?.name||''); setAddFields({}); setAddError('') }
  const caSaveConn = async () => {
    setAddSaving(true); setAddError('')
    const { data: { session } } = await supabase.auth.getSession()
    const r = await callCA(session?.access_token||caTok, { action:'save_connection', ca_type:addCa, label:addLabel, ...addFields })
    setAddSaving(false)
    if (r.ok) { setShowAddCA(false); setAddCa(null); await loadCA() } else setAddError(r.error||'Connection failed')
  }
  const caSync = async (id) => {
    setCaSyncing(id)
    const r = await callCA(caTok, { action:'sync', connection_id:id })
    setCaSyncResult(p=>({...p,[id]:r})); setCaSyncing(null); await loadCA()
  }
  const caDelete = async (id) => {
    await callCA(caTok, { action:'delete_connection', connection_id:id, delete_certs:caDelCerts })
    setCaDelConn(null); setCaDelCerts(true); await loadCA()
  }
  const caImport = async () => {
    setImporting(true)
    const r = await callCA(caTok, { action:'manual_import', cert_pem:pemText.trim() })
    setImportResult(r); setImporting(false); if (r.ok) await loadCA()
  }

  return (
    <div className="v2-page">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {showAddServer && <AddServerModal onClose={() => { setShowAddServer(false); setTimeout(load, 2000) }} userId={user?.id} />}
      {showAddDns && <AddDnsModal onClose={() => setShowAddDns(false)} onSaved={load} userId={user?.id} />}
      {showAddHosting && <AddHostingModal onClose={() => setShowAddHosting(false)} onSaved={load} userId={user?.id} />}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight: 700, color: '#111111', letterSpacing: '-0.5px', margin: 0 }}>
              Domain Manager
            </h1>
            <p style={{ fontSize:13, color: '#888888', margin: '4px 0 0' }}>
              VPS agents, cPanel hosting, DNS providers and CA connectors — all in one place
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)', background: 'var(--v2-surface)',
              fontSize:12, fontWeight: 600, color: '#333333',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={() => setShowAddDns(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)', background: 'var(--v2-surface)',
              fontSize:12, fontWeight: 600, color: '#333333',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Globe size={12} /> Add DNS
            </button>
            <button onClick={() => setShowAddHosting(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)', background: 'var(--v2-surface)',
              fontSize:12, fontWeight: 600, color: '#333333',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Globe size={12} /> Add hosting
            </button>
            <button onClick={() => setShowAddServer(true)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              border: 'none', background:'#0077b6',
              fontSize:12, fontWeight: 600, color:'#111111',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Plus size={12} /> Add server
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888888', fontSize:13 }}>
            <RefreshCw size={16} style={{ animation: 'spin .8s linear infinite', marginRight: 8 }} />
            Loading…
          </div>
        ) : !hasSetup ? (
          <EmptyState hasDns={dnsCredentials.length > 0} onAddServer={() => setShowAddServer(true)} onAddDns={() => setShowAddDns(true)} />
        ) : (
          <>
            {/* Status strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 24 }}>
              {[
                { num: agents.length, label: 'Servers connected', color: '#333333', sub: `${onlineCount} online` },
                { num: certs.filter(c => c.status === 'active').length, label: 'Certs protected', color: '#111111', sub: 'auto-renewing' },
                { num: dnsCredentials.length, label: 'DNS providers', color: '#111111', sub: 'for auto-validation' },
              ].map(({ num, label, color, sub }) => (
                <div key={label} style={{
                  background: 'var(--v2-surface)', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize:24, fontWeight: 700, color, letterSpacing: '-1px', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize:12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
                  <div style={{ fontSize:11, color: '#888888', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
              {[
                { id: 'servers', label: `Servers (${agents.length})`, icon: Server },
                { id: 'dns',     label: `DNS providers (${dnsCredentials.length})`, icon: Globe },
              { id: 'hosting', label: `Shared Hosting (${cpanelCreds.length})`, icon: Globe },
              { id: 'ca',      label: `CA Connections${caConns.length>0?' ('+caConns.length+')':''}`, icon: Shield },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', fontSize:13, fontWeight: 500,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === id ? '#ffffff' : '#555555',
                  borderBottom: `2px solid ${activeTab === id ? '#0077b6' : 'transparent'}`,
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
                    textAlign: 'center', padding:'min(40px,5vw) min(24px,4vw)',
                    background: 'var(--v2-surface)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
                  }}>
                    <Server size={28} color="rgba(0,0,0,0.07)" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize:14, fontWeight: 600, color: '#333333', marginBottom: 6 }}>No servers connected yet</div>
                    <div style={{ fontSize:13, color: '#888888', marginBottom: 16 }}>Connect your VPS to enable automatic cert installation</div>
                    <button onClick={() => setShowAddServer(true)} style={{
                      padding: '9px 18px', borderRadius: 8, border: 'none',
                      background:'#0077b6', color:'#111111', fontSize:13,
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
                  background: 'rgba(30,0,0,0.4)', border: '1px solid #e9d5ff',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  fontSize:12, color: '#0077b6', lineHeight: 1.6,
                }}>
                  <b>Shared hosting (cPanel):</b> SSLVault connects directly to your hosting account via the cPanel API. No SSH, no server access needed. Certificates install and renew automatically.
                </div>
                {cpanelCreds.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'min(40px,5vw) min(24px,4vw)', background:'var(--v2-surface)', borderRadius:12, border:'1px solid rgba(0,0,0,0.1)' }}>
                    <Globe size={28} color="rgba(0,0,0,0.07)" style={{ marginBottom:12 }} />
                    <div style={{ fontSize:14, fontWeight:600, color:'#333333', marginBottom:6 }}>No hosting accounts connected</div>
                    <div style={{ fontSize:13, color:'#888888', marginBottom:16 }}>Connect your cPanel to install SSL automatically</div>
                    <button onClick={() => setShowAddHosting(true)} style={{
                      padding:'9px 18px', borderRadius:8, border:'none',
                      background:'#0077b6', color:'#111111', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'inherit',
                      display:'inline-flex', alignItems:'center', gap:6,
                    }}>
                      <Plus size={12} /> Connect cPanel
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {cpanelCreds.map(cred => (
                      <HostingCard key={cred.id} cred={cred} deletingId={deletingCpanelId} onDelete={(id) => deleteCpanel(id, cred._source)} />
                    ))}
                    <button onClick={() => setShowAddHosting(true)} style={{
                      padding:'12px', borderRadius:10,
                      border:'1px dashed #d1d5db', background:'rgba(0,0,0,0.02)',
                      fontSize:12, fontWeight:600, color:'#888888',
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
                  background: 'transparent', border: '1px solid rgba(0,119,182,0.2)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  fontSize:12, color: '#111111', lineHeight: 1.6,
                }}>
                  <b>Why do we need DNS credentials?</b> When issuing a certificate, we need to prove you own the domain. We do this by automatically adding a TXT record to your DNS — no manual steps needed.
                </div>

                {dnsCredentials.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding:'min(40px,5vw) min(24px,4vw)',
                    background: 'var(--v2-surface)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
                  }}>
                    <Globe size={28} color="rgba(0,0,0,0.07)" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize:14, fontWeight: 600, color: '#333333', marginBottom: 6 }}>No DNS provider connected</div>
                    <div style={{ fontSize:13, color: '#888888', marginBottom: 16 }}>Required before issuing your first certificate</div>
                    <button onClick={() => setShowAddDns(true)} style={{
                      padding: '9px 18px', borderRadius: 8, border: 'none',
                      background:'#0077b6', color:'#111111', fontSize:13,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      <Plus size={12} /> Connect DNS provider
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dnsCredentials.map(cred => (
                      <DnsCard key={cred.id} cred={cred} deletingId={deletingDnsId} onDelete={deleteDns} />
                    ))}
                    <button onClick={() => setShowAddDns(true)} style={{
                      padding: '12px', borderRadius: 10,
                      border: '1px dashed #d1d5db', background:'rgba(0,0,0,0.02)',
                      fontSize:12, fontWeight: 600, color: '#888888',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <Plus size={12} /> Add another DNS provider
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CA Connections tab */}
            {activeTab === 'ca' && (
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <span style={{fontSize:13,color:'#888888'}}>{caConns.length} connection{caConns.length!==1?'s':''} · {caCertCount} certificates tracked</span>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{setShowImport(true);setPemText('');setImportResult(null)}}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:12,background:'var(--v2-surface)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#333333',fontWeight:500}}>
                      <Upload size={13}/> Import PEM</button>
                    <button onClick={()=>setShowAddCA(true)}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',fontSize:12,fontWeight:600,background:'#0077b6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#111111'}}>
                      <Plus size={13}/> Connect CA</button>
                  </div>
                </div>
                {caConns.length===0?(
                  <div style={{textAlign:'center',padding:'60px 32px',background:'var(--v2-surface)',borderRadius:12,border:'1px solid rgba(0,0,0,0.1)'}}>
                    <Shield size={32} color="rgba(0,119,182,0.2)" style={{display:'block',margin:'0 auto 14px'}}/>
                    <div style={{fontSize:14,fontWeight:600,color:'#333333',marginBottom:6}}>No CA connections</div>
                    <div style={{fontSize:13,color:'#888888',maxWidth:400,margin:'0 auto 20px'}}>Connect DigiCert CertCentral, Sectigo SCM or SSL.com to import your existing certificate portfolio.</div>
                    <button onClick={()=>setShowAddCA(true)} style={{padding:'9px 20px',fontSize:13,background:'#0077b6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#111111',fontWeight:600,display:'inline-flex',alignItems:'center',gap:6}}><Plus size={13}/> Connect CA</button>
                  </div>
                ):(
                  <div style={{background:'var(--v2-surface)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:12,overflow:'hidden'}}>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 110px 130px',minWidth:600,padding:'10px 18px',background:'rgba(0,119,182,0.07)',borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
                      {['Certificate authority','Label','Certs','Status','Actions'].map(h=>(
                        <div key={h} style={{fontSize:11,fontWeight:600,color:'#888888',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</div>
                      ))}
                    </div>
                    {caConns.map((conn,i)=>{
                      const def=CA_DEFS[conn.ca_type]||{name:conn.ca_type,color:'#333333',bg:'rgba(0,0,0,0.04)',logo:conn.ca_type?.slice(0,2).toUpperCase()||'CA'}
                      const isActive=conn.status==='active'
                      const res=caSyncResult[conn.id]
                      return(
                        <div key={conn.id}>
                          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 110px 130px',minWidth:600,padding:'14px 18px',alignItems:'center',borderBottom:i<caConns.length-1?'1px solid rgba(0,119,182,0.08)':'none'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{width:32,height:32,borderRadius:7,background:def.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:def.color,flexShrink:0,border:`1px solid ${def.border||'rgba(0,0,0,0.1)'}`}}>{def.logo}</div>
                              <div><div style={{fontSize:13,fontWeight:500,color:'#111111'}}>{def.name}</div><div style={{fontSize:11,color:'#888888'}}>Certificate authority</div></div>
                            </div>
                            <div style={{fontSize:13,color:'#333333'}}>{conn.label||'—'}</div>
                            <div style={{fontSize:13,color:'#333333'}}>{conn.cert_count??'—'}</div>
                            <div><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:isActive?'transparent':'rgba(0,119,182,0.09)',color:isActive?'#00a550':'#0077b6',border:`1px solid ${isActive?'rgba(0,165,80,0.22)':'rgba(192,57,43,0.2)'}`}}><span style={{width:5,height:5,borderRadius:'50%',background:isActive?'#00a550':'#0077b6'}}/>{isActive?'Connected':'Error'}</span></div>
                            <div style={{display:'flex',gap:5}}>
                              <button onClick={()=>caSync(conn.id)} disabled={caSyncing===conn.id}
                                style={{padding:'5px 10px',fontSize:11,background:'rgba(0,119,182,0.07)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,cursor:'pointer',fontFamily:'inherit',color:'#333333',display:'flex',alignItems:'center',gap:4}}>
                                <RefreshCw size={11} style={{animation:caSyncing===conn.id?'spin .8s linear infinite':'none'}}/>{caSyncing===conn.id?'Syncing':'Sync'}</button>
                              <button onClick={()=>setCaDelConn(conn.id)}
                                style={{width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'1px solid rgba(192,57,43,0.2)',borderRadius:5,cursor:'pointer',color:'#0077b6'}}><Trash2 size={11}/></button>
                            </div>
                          </div>
                          {res&&(<div style={{padding:'8px 18px',borderTop:'1px solid rgba(0,119,182,0.08)',background:res.ok?'rgba(74,222,128,0.05)':'rgba(0,119,182,0.07)',display:'flex',alignItems:'center',gap:7}}>
                            {res.ok?<Check size={12} style={{color:'#00a550'}}/>:<AlertCircle size={12} style={{color:'#0077b6'}}/>}
                            <span style={{fontSize:12,color:res.ok?'#333333':'#0077b6'}}>{res.ok?`Sync complete — ${res.imported||0} certificates imported`:res.error}</span>
                          </div>)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Connect CA modal ── */}
            {showAddCA&&(
              <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(10,10,20,0.7)',backdropFilter:'blur(4px)'}}>
                <div style={{background:'#1a0a0a',borderRadius:14,width:'100%',maxWidth:480,boxShadow:'0 24px 64px rgba(0,0,0,0.5)',border:'1px solid rgba(0,119,182,0.2)'}}>
                  <div style={{padding:'18px 22px 14px',borderBottom:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{fontSize:15,fontWeight:600,color:'#111111'}}>Connect a CA</div>
                    <button onClick={()=>{setShowAddCA(false);setAddCa(null)}} style={{background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,cursor:'pointer',color:'#888888',padding:'4px 8px',display:'flex',alignItems:'center'}}><X size={14}/></button>
                  </div>
                  <div style={{padding:'18px 22px 22px'}}>
                    {!addCa?(
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{fontSize:12,color:'#333333',lineHeight:1.7,marginBottom:4}}>Choose a CA. SSLVault pulls your existing certificates for monitoring. <strong style={{color:'#111111'}}>No private keys needed.</strong></div>
                        {Object.entries(CA_DEFS).map(([key,def])=>(
                          <div key={key} onClick={()=>caOpenAdd(key)}
                            style={{padding:'14px 16px',borderRadius:10,border:'1px solid rgba(0,0,0,0.08)',background:'rgba(0,0,0,0.02)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=def.color==='#ffffff'?'rgba(0,119,182,0.3)':def.color;e.currentTarget.style.background=def.bg}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.08)';e.currentTarget.style.background='rgba(0,0,0,0.02)'}}>
                            <div style={{width:38,height:38,borderRadius:9,background:def.bg,border:`1px solid ${def.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:def.color,flexShrink:0}}>{def.logo}</div>
                            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#111111'}}>{def.name}</div><div style={{fontSize:11,color:'#888888',marginTop:3,lineHeight:1.5}}>{def.desc}</div></div>
                            <ChevronRight size={14} style={{color:'#888888',flexShrink:0}}/>
                          </div>
                        ))}
                      </div>
                    ):(
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,padding:'10px 12px',borderRadius:8,background:'rgba(0,119,182,0.07)',border:'1px solid rgba(0,0,0,0.08)'}}>
                          <div style={{width:30,height:30,borderRadius:7,background:CA_DEFS[addCa].bg,border:`1px solid ${CA_DEFS[addCa].border}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:CA_DEFS[addCa].color,flexShrink:0}}>{CA_DEFS[addCa].logo}</div>
                          <div style={{flex:1,fontSize:13,fontWeight:600,color:'#111111'}}>{CA_DEFS[addCa].name}</div>
                          {CA_DEFS[addCa].docs&&(<a href={CA_DEFS[addCa].docs} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#888888',display:'flex',alignItems:'center',gap:3}}>API docs <ExternalLink size={10}/></a>)}
                        </div>
                        <div style={{background:'rgba(192,57,43,0.06)',borderRadius:8,padding:'9px 12px',marginBottom:14,display:'flex',gap:8,alignItems:'flex-start',border:'1px solid rgba(0,0,0,0.07)'}}>
                          <Info size={12} style={{color:'#888888',flexShrink:0,marginTop:1}}/><div style={{fontSize:11,color:'#333333',lineHeight:1.6}}>SSLVault reads certificate metadata only — expiry, domain, issuer. Private keys stay on your servers.</div>
                        </div>
                        <div style={{marginBottom:10}}>
                          <label style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#888888',display:'block',marginBottom:5}}>Label</label>
                          <input value={addLabel} onChange={e=>setAddLabel(e.target.value)} placeholder="e.g. Production account"
                            style={{width:'100%',padding:'9px 12px',borderRadius:7,fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',color:'#333333',fontFamily:'inherit',boxSizing:'border-box'}}/>
                        </div>
                        {CA_DEFS[addCa].fields.map(f=>(
                          <div key={f.key} style={{marginBottom:10}}>
                            <label style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#888888',display:'block',marginBottom:5}}>{f.label}{f.required?' *':''}</label>
                            <div style={{position:'relative'}}>
                              <input type={f.type==='password'&&!showPwd[f.key]?'password':'text'} value={addFields[f.key]||''}
                                onChange={e=>setAddFields(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                                style={{width:'100%',padding:'9px 12px',borderRadius:7,fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',color:'#333333',fontFamily:'inherit',boxSizing:'border-box',paddingRight:f.type==='password'?38:12}}/>
                              {f.type==='password'&&(<button type="button" onClick={()=>setShowPwd(p=>({...p,[f.key]:!p[f.key]}))} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#888888',display:'flex'}}>{showPwd[f.key]?<EyeOff size={13}/>:<Eye size={13}/>}</button>)}
                            </div>
                          </div>
                        ))}
                        {addError&&(<div style={{background:'rgba(0,119,182,0.09)',border:'1px solid rgba(192,57,43,0.2)',borderRadius:7,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#0077b6',display:'flex',gap:6,alignItems:'flex-start'}}><AlertTriangle size={12} style={{flexShrink:0,marginTop:1}}/>{addError}</div>)}
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          <button onClick={()=>setAddCa(null)} style={{padding:'9px 16px',fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#333333'}}>Back</button>
                          <button onClick={caSaveConn} disabled={addSaving} style={{flex:1,padding:'9px',fontSize:13,background:'#0077b6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#111111',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                            {addSaving?<><RefreshCw size={12} style={{animation:'spin .8s linear infinite'}}/> Connecting…</>:<><Check size={12}/> Connect &amp; sync</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PEM import modal ── */}
            {showImport&&(
              <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(10,10,20,0.7)',backdropFilter:'blur(4px)'}}>
                <div style={{background:'#1a0a0a',borderRadius:14,width:'100%',maxWidth:480,boxShadow:'0 24px 64px rgba(0,0,0,0.5)',border:'1px solid rgba(0,119,182,0.2)'}}>
                  <div style={{padding:'18px 22px 14px',borderBottom:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div><div style={{fontSize:15,fontWeight:600,color:'#111111'}}>Import certificate</div><div style={{fontSize:11,color:'#888888',marginTop:2}}>Paste cert PEM — domain &amp; expiry extracted automatically</div></div>
                    <button onClick={()=>setShowImport(false)} style={{background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,cursor:'pointer',color:'#888888',padding:'4px 8px',display:'flex'}}><X size={14}/></button>
                  </div>
                  <div style={{padding:'18px 22px 22px'}}>
                    {!importResult?(
                      <>
                        <div style={{background:'rgba(192,57,43,0.06)',border:'1px solid rgba(0,0,0,0.07)',borderRadius:8,padding:'9px 12px',marginBottom:14,display:'flex',gap:8}}><Info size={12} style={{color:'#888888',flexShrink:0,marginTop:1}}/><div style={{fontSize:12,color:'#333333',lineHeight:1.6}}><strong>Only the certificate PEM needed</strong> — private key not required.</div></div>
                        <div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#888888',display:'block',marginBottom:6}}>Certificate PEM *</label>
                          <textarea rows={7} placeholder={"-----BEGIN CERTIFICATE-----" + "\n" + "MIIFaz..." + "\n" + "-----END CERTIFICATE-----"} value={pemText} onChange={e=>setPemText(e.target.value)}
                            style={{width:'100%',padding:'9px 12px',borderRadius:7,fontSize:11,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',color:'#333333',fontFamily:'monospace',resize:'vertical',boxSizing:'border-box'}}/></div>
                        <button onClick={caImport} disabled={importing||!pemText.trim()} style={{width:'100%',padding:'9px',fontSize:13,background:'#0077b6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#111111',fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                          {importing?<><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Parsing…</>:<><FileText size={13}/> Import certificate</>}
                        </button>
                      </>
                    ):importResult.ok?(
                      <div style={{textAlign:'center',padding:'10px 0'}}>
                        <Check size={28} style={{color:'#00a550',margin:'0 auto 14px',display:'block'}}/>
                        <div style={{fontSize:15,fontWeight:600,marginBottom:16,color:'#111111'}}>Certificate imported</div>
                        <div style={{display:'flex',gap:8}}><button onClick={()=>{setPemText('');setImportResult(null)}} style={{flex:1,padding:'9px',fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#333333'}}>Import another</button><button onClick={()=>setShowImport(false)} style={{flex:1,padding:'9px',fontSize:13,background:'#0077b6',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#111111',fontWeight:600}}>Done</button></div>
                      </div>
                    ):(
                      <div style={{textAlign:'center',padding:'10px 0'}}>
                        <AlertTriangle size={28} style={{color:'#0077b6',margin:'0 auto 12px',display:'block'}}/>
                        <div style={{fontSize:13,color:'#0077b6',marginBottom:14}}>{importResult.error}</div>
                        <button onClick={()=>setImportResult(null)} style={{padding:'8px 20px',fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#333333'}}>Try again</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Delete CA connection modal ── */}
            {caDelConn&&(()=>{
              const conn=caConns.find(c=>c.id===caDelConn)
              const n=conn?.cert_count||0
              return(
                <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(10,10,20,0.7)',backdropFilter:'blur(4px)'}}>
                  <div style={{background:'#1a0a0a',borderRadius:14,width:'100%',maxWidth:400,padding:'24px',boxShadow:'0 24px 64px rgba(0,0,0,0.5)',border:'1px solid rgba(0,119,182,0.2)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:'rgba(0,119,182,0.09)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Trash2 size={15} color="#0077b6"/></div>
                      <div style={{fontSize:15,fontWeight:600,color:'#111111'}}>Remove {conn?.label||'connection'}?</div>
                    </div>
                    <div style={{fontSize:13,color:'#333333',marginBottom:14,lineHeight:1.6}}>This CA connection will be disconnected and stop syncing.{n>0&&<span style={{color:'#111111',fontWeight:600}}> {n} certificate{n!==1?'s':''} linked.</span>}</div>
                    {n>0&&(<label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 12px',borderRadius:8,marginBottom:14,background:caDelCerts?'rgba(0,119,182,0.08)':'rgba(0,0,0,0.02)',border:`1px solid ${caDelCerts?'rgba(0,119,182,0.2)':'rgba(0,0,0,0.07)'}`,transition:'all .15s'}}>
                      <input type="checkbox" checked={caDelCerts} onChange={e=>setCaDelCerts(e.target.checked)} style={{width:14,height:14,accentColor:'#0077b6',flexShrink:0}}/>
                      <div><div style={{fontSize:12,fontWeight:600,color:caDelCerts?'#0077b6':'#333333'}}>Also delete {n} imported certificate{n!==1?'s':''}</div><div style={{fontSize:11,color:'#888888',marginTop:1}}>{caDelCerts?'Will be removed from inventory':'Remain in inventory, stop syncing'}</div></div>
                    </label>)}
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{setCaDelConn(null);setCaDelCerts(true)}} style={{flex:1,padding:'9px',fontSize:13,background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'#333333'}}>Cancel</button>
                      <button onClick={()=>caDelete(caDelConn)} style={{flex:1,background:'#0077b6',color:'#111111',border:'none',borderRadius:8,padding:'9px',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                        <Trash2 size={13}/>{caDelCerts&&n>0?`Remove + delete ${n} certs`:'Remove connection'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
