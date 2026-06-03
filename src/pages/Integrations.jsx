import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, RefreshCw, Eye, EyeOff, Globe, Server, Cloud,
  ChevronRight, Check, X, Search, Settings, ExternalLink,
  Lock, AlertCircle, Wifi, WifiOff, Edit3, Zap,
  Shield, AlertTriangle, Upload, Info, FileText, TrendingUp,
  LayoutList, Table2
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase as sbClient } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const CA_FN = SB_URL + '/functions/v1/ca-import'

async function callCA(tok, body) {
  const r = await fetch(CA_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

const CA_DEFS = {
  digicert: {
    name: 'DigiCert CertCentral', color: '#1f5c4e', bg: 'rgba(31,92,78,0.09)', border: 'rgba(0,0,0,0.1)', logo: 'DC',
    desc: 'Pull all issued certificates from your CertCentral account. Monitoring only — no private keys needed.',
    fields: [
      { key: 'api_key',    label: 'API Key',               type: 'password', placeholder: 'Your CertCentral API key',             required: true  },
      { key: 'account_id', label: 'Account ID (optional)', type: 'text',     placeholder: 'Division / sub-account ID (optional)', required: false },
    ],
    docs: 'https://dev.digicert.com/en/certcentral-apis/creating-an-api-key.html',
  },
  sectigo: {
    name: 'Sectigo SCM', color: '#111111', bg: 'rgba(239,68,68,0.08)', border: 'rgba(0,0,0,0.1)', logo: 'SC',
    desc: 'Pull all certificates from Sectigo Certificate Manager. Monitoring only — no private keys needed.',
    fields: [
      { key: 'customer_uri', label: 'Customer URI', type: 'text',     placeholder: 'your-company',          required: true },
      { key: 'login',        label: 'Login',        type: 'text',     placeholder: 'admin@yourcompany.com', required: true },
      { key: 'password',     label: 'Password',     type: 'password', placeholder: '••••••••',              required: true },
    ],
    docs: 'https://sectigo.com/knowledge-base/detail/Sectigo-Certificate-Manager-API/kA01N000000bvOx',
  },
  sslcom: {
    name: 'SSL.com', color: '#111111', bg: 'rgba(31,92,78,0.08)', border: 'rgba(31,92,78,0.2)', logo: 'SL',
    desc: 'Pull all issued certificates from your SSL.com reseller account. Monitoring only — no private keys needed.',
    fields: [
      { key: 'account_key', label: 'Account Key', type: 'password', placeholder: 'Your SSL.com account key', required: true },
      { key: 'secret_key',  label: 'Secret Key',  type: 'password', placeholder: 'Your SSL.com secret key',  required: true },
    ],
    docs: 'https://www.ssl.com/restful_api',
  },
}

const DNS_FN    = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'
const SERVER_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials'
const DAEMON_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

// ── DNS Providers config ──────────────────────────────────────────────
const PROVIDERS = {
  cloudflare: {
    name: 'Cloudflare', mono: 'CF', color: '#e67e22',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-cloudflare-api-token', help: 'Dashboard → API Tokens → Zone:DNS:Edit', optional: false },
      { key: 'zoneId',   label: 'Zone ID',   type: 'text',     placeholder: 'auto-detected if blank',     help: 'Optional — found in domain Overview sidebar', optional: true },
    ],
    docs: 'https://developers.cloudflare.com/fundamentals/api/',
    note: 'Token needs Zone:DNS:Edit permission.'
  },
  vercel: {
    name: 'Vercel', mono: '▲', color: '#111111',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-vercel-api-token', help: 'Create at vercel.com/account/tokens', optional: false },
      { key: 'teamId',   label: 'Team ID',   type: 'text',     placeholder: 'team_xxxxxxxx',         help: 'Optional — leave blank for personal account', optional: true },
    ],
    docs: 'https://vercel.com/account/tokens',
    note: 'Token needs DNS record write access.'
  },
  godaddy: {
    name: 'GoDaddy', mono: 'GD', color: '#1f5c4e',
    fields: [
      { key: 'apiKey',    label: 'API Key',    type: 'password', placeholder: 'your-godaddy-api-key',    help: 'developer.godaddy.com/keys', optional: false },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'your-godaddy-api-secret', help: 'Created alongside the API key', optional: false },
    ],
    docs: 'https://developer.godaddy.com/keys',
    note: 'Use Production keys, not OTE.'
  },
  digitalocean: {
    name: 'DigitalOcean', mono: 'DO', color: '#1f5c4e',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-digitalocean-api-token', help: 'Dashboard → API → Generate New Token', optional: false },
    ],
    docs: 'https://docs.digitalocean.com/reference/api/',
    note: 'Token needs Read + Write scope.'
  },
}

// ── Server types ──────────────────────────────────────────────────────
const SERVER_TYPES = {
  cpanel: { label: 'cPanel / Shared Hosting', short: 'cPanel', Icon: Cloud,    color: '#111111', bg: 'rgba(239,68,68,0.08)', border: 'rgba(0,0,0,0.1)',
    desc: 'GoDaddy, Bluehost, Hostinger, SiteGround',
    fields: [
      { key: 'host',      label: 'Domain / cPanel Host', type: 'text',     placeholder: 'yourdomain.com',       help: 'Your website domain — cPanel runs at :2083' },
      { key: 'username',  label: 'cPanel Username',      type: 'text',     placeholder: 'johndoe',              help: 'Short login name, not your email' },
      { key: 'api_token', label: 'cPanel API Token',     type: 'password', placeholder: 'Paste API token here', help: 'cPanel → Manage API Tokens → Create → SSL permission' },
    ]
  },
  ssh: { label: 'VPS / Cloud Server', short: 'VPS', Icon: Server, color: '#111111', bg: 'transparent', border: 'rgba(31,92,78,0.2)',
    desc: 'Ubuntu, Debian, CentOS, Amazon Linux',
    fields: [
      { key: 'host',     label: 'Server IP / Hostname', type: 'text',     placeholder: '134.209.x.x',                         help: 'Public IP or hostname' },
      { key: 'username', label: 'SSH Username',         type: 'text',     placeholder: 'root or ubuntu',                      help: 'User with sudo access' },
      { key: 'ssh_key',  label: 'Private SSH Key',      type: 'password', placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----', help: 'Paste your id_rsa private key' },
    ]
  },
  plesk: { label: 'Plesk Panel', short: 'Plesk', Icon: Settings, color: '#111111', bg: 'rgba(239,68,68,0.08)', border: 'rgba(0,0,0,0.1)',
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
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Sparkline({ status = 'green' }) {
  const points =
    status === 'green' ? '0,16 8,12 16,14 24,9 32,11 40,6 48,8 56,4 64,5'
  : status === 'amber' ? '0,8 8,9 16,7 24,10 32,12 40,16 48,18 56,18 64,18'
  : '0,12 8,12 16,12 24,12 32,12 40,12 48,12 56,12 64,12'
  const stroke = status === 'green' ? '#111111' : status === 'amber' ? '#111111' : '#cccccc'
  return (
    <svg width="64" height="22" viewBox="0 0 64 22" style={{ flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Page header ───────────────────────────────────────────────────────
function PageHeader({ counts, tab, onAdd, onAddBoth }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
      marginBottom:4, flexWrap:'wrap', gap:12 }}>
      <div>
        <h1 className="v2-h1" style={{ fontSize:22, letterSpacing:'-0.3px' }}>DNS &amp; Servers</h1>
        <p style={{ fontSize:13, color:'#888888', marginTop:4, display:'flex', gap:12 }}>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Globe size={12} style={{ color:'#888888' }}/>
            {counts.dns} provider{counts.dns === 1 ? '' : 's'}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Server size={12} style={{ color:'#888888' }}/>
            {counts.servers} server{counts.servers === 1 ? '' : 's'}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%',
              background: counts.activeAgents > 0 ? '#16a068' : '#bbbbbb',
              boxShadow: counts.activeAgents > 0 ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none' }}/>
            {counts.activeAgents} agent{counts.activeAgents === 1 ? '' : 's'} active
          </span>
        </p>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button className="v2-btn" onClick={onAdd}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', fontSize:12, fontWeight:500 }}>
          <Plus size={13} strokeWidth={2}/>
          {tab === 'dns' ? 'DNS only' : 'Server only'}
        </button>
        <button className="v2-btn v2-btn-primary" onClick={onAddBoth}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', fontSize:12, fontWeight:600 }}>
          <Zap size={13} strokeWidth={2}/> DNS + Server
        </button>
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────
function Tabs({ tab, setTab, counts }) {
  return (
    <div style={{ display:'flex', gap:2, background:'var(--v2-surface-3)',
      borderRadius:10, padding:3, margin:'20px 0 18px', border:'0.5px solid var(--v2-border)' }}>
      {[
        { key:'dns',     label:'DNS providers',  icon:Globe,       count:counts.dns },
        { key:'servers', label:'Servers',         icon:Server,      count:counts.servers },
        { key:'ca',      label:'CA connections',  icon:TrendingUp,  count:counts.ca },
      ].map(({ key, label, icon:Icon, count }) => (
        <button key={key} onClick={() => setTab(key)}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            padding:'8px 12px', border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:12, fontWeight: tab===key ? 600 : 500, borderRadius:8, transition:'all .15s',
            background: tab===key ? 'var(--v2-bg)' : 'transparent',
            color: tab===key ? 'var(--v2-text)' : 'var(--v2-text-3)',
            boxShadow: tab===key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
          <Icon size={13} strokeWidth={tab===key?2.2:1.8}/>
          {label}
          <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:10,
            background: tab===key ? 'var(--v2-green)' : 'var(--v2-border)',
            color: tab===key ? '#000000' : 'var(--v2-text-3)',
            transition:'all .15s' }}>{count}</span>
        </button>
      ))}
    </div>
  )
}

// ── DNS Provider row ──────────────────────────────────────────────────
// ── Unified domain row ────────────────────────────────────────────────
function DomainRow({ group, selected, onSelect, credStatus, agents }) {
  const { domain, dns, server } = group
  const hasBoth = dns && server
  const dnsOnly = dns && !server
  const srvOnly = !dns && server

  const dnsStatus = dns ? (credStatus[dns.id] || 'untested') : null
  const dnsCls = dnsStatus === 'healthy' ? 'green' : dnsStatus === 'expired' ? 'amber' : 'grey'

  const agent = server ? agents.find(a => a.server_id === server.id) : null
  const agentActive = agent?.last_seen_at
    ? (Date.now() - new Date(agent.last_seen_at).getTime()) / 60000 < 15
    : false

  const rowDot = hasBoth
    ? (dnsStatus === 'healthy' && agentActive ? 'green' : dnsStatus === 'expired' ? 'amber' : 'grey')
    : dnsOnly
    ? dnsCls
    : (agentActive ? 'green' : 'grey')

  const p = dns ? (PROVIDERS[dns.provider] || { name: dns.provider, mono: '?', color: '#333333' }) : null
  const t = server ? (SERVER_TYPES[server.server_type] || SERVER_TYPES.cpanel) : null
  const TIcon = t?.Icon

  const tagBg = hasBoth ? '#444444' : dnsOnly ? '#16a068' : '#444444'
  const tagLabel = hasBoth ? 'DNS + Server' : dnsOnly ? 'DNS only' : 'Server only'
  const iconBg = hasBoth ? 'linear-gradient(135deg,#1e40af,#2a6b5c)' : dnsOnly ? p?.color : t?.color || '#444444'
  const dotColor = rowDot==='green'?'#16a068':rowDot==='amber'?'#111111':'#bbbbbb'
  return (
    <div onClick={() => onSelect(domain)}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        cursor:'pointer', borderRadius:10, marginBottom:4, transition:'all .15s',
        background: selected ? 'var(--v2-surface-3)' : 'var(--v2-bg)',
        border: selected ? '1px solid var(--v2-green)' : '0.5px solid var(--v2-border)',
        boxShadow: selected ? '0 0 0 2px rgba(14,127,192,0.12)' : 'none' }}
      onMouseEnter={e=>{if(!selected){e.currentTarget.style.background='var(--v2-surface-3)';e.currentTarget.style.borderColor='var(--v2-border-2)'}}}
      onMouseLeave={e=>{if(!selected){e.currentTarget.style.background='var(--v2-bg)';e.currentTarget.style.borderColor='var(--v2-border)'}}}>
      {/* Icon */}
      <div style={{ width:38, height:38, borderRadius:9, flexShrink:0,
        background:iconBg, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:700, color:'#111111', position:'relative' }}>
        {hasBoth ? <Zap size={16} color="white"/> : dnsOnly ? p?.mono : (TIcon ? <TIcon size={16} color="white"/> : '?')}
        {/* Status dot */}
        <span style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10,
          borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-bg)',
          boxShadow: rowDot==='green' ? '0 0 0 2px rgba(22,163,74,0.25)' : 'none' }}/>
      </div>
      {/* Body */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:600, fontFamily:'monospace',
            color:'#111111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {domain}
          </span>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20,
            background:tagBg, color:'#111111', letterSpacing:'0.3px', flexShrink:0 }}>
            {tagLabel}
          </span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {dns && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#888888' }}>
              <span style={{ width:14, height:14, borderRadius:3, background:p?.color,
                color:'#111111', display:'inline-flex', alignItems:'center', justifyContent:'center',
                fontSize:7, fontWeight:700 }}>{p?.mono}</span>
              {p?.name}
            </span>
          )}
          {dns && server && <span style={{ color:'var(--v2-border-2)', fontSize:10 }}>·</span>}
          {server && TIcon && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#888888' }}>
              <TIcon size={11} style={{ color:t?.color }}/>
              {t?.short}
              {agent && <span style={{ width:6, height:6, borderRadius:'50%',
                background:agentActive?'#16a068':'#bbbbbb', marginLeft:2 }}/>}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} strokeWidth={1.6} style={{ color:'#888888', flexShrink:0 }}/>
    </div>
  )
}

// ── DNS Provider row (kept for backward compat, not used in main list) ─
function DnsRow({ cred, selected, onSelect, status }) {
  const p = PROVIDERS[cred.provider] || { name: cred.provider, mono: '?', color: '#333333' }
  const cls = status === 'healthy' ? 'green' : status === 'expired' ? 'amber' : 'grey'
  const dotColor = cls==='green'?'#16a068':cls==='amber'?'#111111':'#bbbbbb'
  const statusLabel = status === 'healthy' ? 'Healthy' : status === 'expired' ? 'Auth expired' : 'Untested'
  return (
    <div onClick={() => onSelect(cred.id)}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        cursor:'pointer', borderRadius:10, marginBottom:4, transition:'all .15s',
        background: selected ? 'var(--v2-surface-3)' : 'var(--v2-bg)',
        border: selected ? '1px solid var(--v2-green)' : '0.5px solid var(--v2-border)' }}
      onMouseEnter={e=>{if(!selected)e.currentTarget.style.background='var(--v2-surface-3)'}}
      onMouseLeave={e=>{if(!selected)e.currentTarget.style.background='var(--v2-bg)'}}>
      <div style={{ width:38, height:38, borderRadius:9, flexShrink:0,
        background:p.color, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:p.mono==='▲'?14:11, fontWeight:700, color:'#111111', position:'relative' }}>
        {p.mono}
        <span style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10,
          borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-bg)' }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#111111' }}>{p.name}</span>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, letterSpacing:'0.3px',
            background: cls==='green'?'#16a068':cls==='amber'?'#111111':'rgba(240,237,232,0.38)', color:'#111111', flexShrink:0 }}>
            {statusLabel}
          </span>
          {cred.tested_at && <span style={{ fontSize:10, color:'#888888' }}>{timeAgo(cred.tested_at)}</span>}
        </div>
        <div style={{ fontSize:11, color:'#888888', fontFamily:'monospace' }}>
          {cred.domain_pattern}
        </div>
      </div>
      <Sparkline status={cls} />
      <ChevronRight size={14} strokeWidth={1.6} style={{ color:'#888888', flexShrink:0 }}/>
    </div>
  )
}

// ── DNS Provider detail ───────────────────────────────────────────────
function DnsDetail({ cred, status, onTest, onDelete, testing, testResult }) {
  if (!cred) return null
  const p = PROVIDERS[cred.provider] || { name: cred.provider, mono: '?', color: '#333333' }
  const cls = status === 'healthy' ? 'green' : status === 'expired' ? 'amber' : 'grey'
  return (
    <div style={{ background:'rgba(0,0,0,0.02)', border:'0.5px solid var(--v2-border)',
      borderRadius:14, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#111111', flexShrink:0 }}>
          {p.mono}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>{p.name}</div>
          <div style={{ fontSize:11, color: '#333333' }}>
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
              <span style={{ color: '#333333' }}>DNS challenge verified</span>
              <span className="v2-timeline-time">{timeAgo(cred.tested_at) || 'recently'}</span>
            </div>
          )}
          <div className="v2-timeline-item">
            <span className="v2-dot v2-dot-grey" />
            <span style={{ color: '#333333' }}>Provider connected</span>
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
  const dotColor = cls==='green'?'#16a068':cls==='amber'?'#111111':'#bbbbbb'
  return (
    <div onClick={() => onSelect(server.id)}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        cursor:'pointer', borderRadius:10, marginBottom:4, transition:'all .15s',
        background: selected ? 'var(--v2-surface-3)' : 'var(--v2-bg)',
        border: selected ? '1px solid var(--v2-green)' : '0.5px solid var(--v2-border)' }}
      onMouseEnter={e=>{if(!selected){e.currentTarget.style.background='var(--v2-surface-3)';}}}
      onMouseLeave={e=>{if(!selected){e.currentTarget.style.background='var(--v2-bg)';}}}>
      <div style={{ width:38, height:38, borderRadius:9, flexShrink:0,
        background:t.bg, border:`1px solid ${t.border}`,
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <Icon size={18} strokeWidth={1.8} color={t.color}/>
        <span style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10,
          borderRadius:'50%', background:dotColor, border:'2px solid var(--v2-bg)' }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#111111',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {server.nickname}
          </span>
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20,
            background:t.color, color:'#111111', letterSpacing:'0.3px', flexShrink:0 }}>
            {t.short}
          </span>
          {agent ? (
            <span style={{ fontSize:10, fontWeight:500, color:agentActive?'#16a068':'#111111',
              display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              {agentActive
                ? <span style={{ width:6,height:6,borderRadius:'50%',background:'#16a068',
                    boxShadow:'0 0 0 3px rgba(22,163,74,0.25)',animation:'v2-pulse 1.5s infinite' }}/>
                : <span style={{ width:6,height:6,borderRadius:'50%',background:'#f4f1ec' }}/>}
              {agentActive ? 'Agent active' : `Offline · ${lastSeenMin}m`}
            </span>
          ) : (
            <span style={{ fontSize:10, color:'#888888', flexShrink:0 }}>No agent</span>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11, color:'#888888' }}>
          <span style={{ fontFamily:'monospace' }}>{server.username}@{server.host}</span>
          {server.domains?.length > 0 && <>
            <span>·</span>
            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
              <Lock size={10} strokeWidth={2}/>{server.domains.length}d
            </span>
          </>}
          <span>·</span>
          <span>{agent?.last_seen_at ? `seen ${timeAgo(agent.last_seen_at)}` : `added ${timeAgo(server.created_at)}`}</span>
        </div>
      </div>
      {isVPS && !agent ? (
        <button onClick={e=>{e.stopPropagation();onInstallAgent(server)}}
          style={{ fontSize:11, color:'#111111', background:'transparent',
            border:'0.5px solid rgba(31,92,78,0.2)', borderRadius:6, cursor:'pointer',
            padding:'5px 10px', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4,
            fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap' }}>
          Install agent <ChevronRight size={11} strokeWidth={2}/>
        </button>
      ) : (
        <ChevronRight size={14} strokeWidth={1.6} style={{ color:'#888888', flexShrink:0 }}/>
      )}
    </div>
  )
}

// ── Server detail ─────────────────────────────────────────────────────
function ServerDetail({ server, agent, onDelete, onEdit, onInstallAgent, userId }) {
  if (!server) return null
  const t = SERVER_TYPES[server.server_type] || SERVER_TYPES.cpanel
  const Icon = t.Icon
  const lastSeenMin = agent?.last_seen_at
    ? Math.floor((Date.now() - new Date(agent.last_seen_at).getTime()) / 60000)
    : null
  const agentActive = lastSeenMin !== null && lastSeenMin < 15
  const isVPS = server.server_type === 'ssh'

  const [jobs, setJobs] = useState([])
  const [certs, setCerts] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [installCertId, setInstallCertId] = useState('')
  const [installDomain, setInstallDomain] = useState(server.domains?.[0] || '')
  const [dispatching, setDispatching] = useState(false)
  const [dispatchResult, setDispatchResult] = useState(null)

  const AGENT_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

  const loadJobs = async () => {
    if (!agent?.id || !userId) return
    setLoadingJobs(true)
    try {
      const r = await fetch(AGENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_jobs', user_id: userId, agent_id: agent.id })
      })
      const d = await r.json()
      if (d.ok) setJobs(d.jobs || [])
    } catch(e) {}
    setLoadingJobs(false)
  }

  useEffect(() => {
    loadJobs()
    // Load active certs with private keys for install picker
    if (userId) {
      fetch('https://frthcwkntciaakqsppss.supabase.co/rest/v1/certificates?select=id,domain,cert_type,status,private_key_pem&status=eq.active&user_id=eq.' + userId, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.lbBMb5JibjimVTeZ9q0n_zQ_T7VT1p6Xaq2v3s9vpyg',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.lbBMb5JibjimVTeZ9q0n_zQ_T7VT1p6Xaq2v3s9vpyg'
        }
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setCerts(data.filter(c => c.private_key_pem))
      }).catch(() => {})
    }
  }, [agent?.id, userId])

  // Poll every 10s while any job is active
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'claimed')
    if (!hasActive) return
    const iv = setInterval(loadJobs, 10000)
    return () => clearInterval(iv)
  }, [jobs])

  const dispatchInstall = async () => {
    if (!installCertId || !installDomain) return
    setDispatching(true); setDispatchResult(null)
    try {
      const r = await fetch(AGENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch', user_id: userId, agent_id: agent.id,
          cert_id: installCertId, domain: installDomain, job_type: 'install'
        })
      })
      const d = await r.json()
      if (d.ok) {
        setDispatchResult({ ok: true, msg: 'Job queued — agent will install within 5 minutes' })
        setShowInstall(false)
        setTimeout(loadJobs, 2000)
      } else {
        setDispatchResult({ ok: false, msg: d.error || 'Dispatch failed' })
      }
    } catch(e) { setDispatchResult({ ok: false, msg: String(e) }) }
    setDispatching(false)
  }

  const jobDot = (s) => {
    if (s === 'done')    return { color: 'var(--v2-green)',   label: 'Done' }
    if (s === 'failed')  return { color: '#1f5c4e',           label: 'Failed' }
    if (s === 'claimed') return { color: '#111111',           label: 'Running' }
    if (s === 'queued')  return { color: '#111111',           label: 'Queued' }
    return { color: 'var(--v2-grey-dot)', label: s }
  }

  const fmtJobTime = (iso) => {
    if (!iso) return '—'
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m/60)}h ago`
  }
  return (
    <div style={{ background:'rgba(0,0,0,0.02)', border:'0.5px solid var(--v2-border)',
      borderRadius:14, padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: t.bg, border: `0.5px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={18} strokeWidth={1.8} color={t.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>{server.nickname}</div>
          <div style={{ fontSize:11, color: '#333333', fontFamily: 'JetBrains Mono, monospace' }}>
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
              <span style={{ marginLeft: 'auto', fontSize:10, fontFamily: 'JetBrains Mono, monospace',
                             color: 'var(--v2-green-text)' }}>v{agent.version}</span>
            )}
          </div>
          <div style={{ fontSize:11, color: 'var(--v2-green-text)', marginTop: 4 }}>
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
                    style={{ background: 'transparent', border: 'none', color: '#111111',
                             fontWeight: 500, fontSize:11, cursor: 'pointer', padding: 0 }}>
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


      {/* Job history — real install/renew results from agent */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="v2-section-label">Recent activity</div>
          {agent && agentActive && (
            <button
              className="v2-btn v2-btn-sm v2-btn-primary"
              style={{ fontSize:10, padding: '3px 10px' }}
              onClick={() => { setShowInstall(true); setDispatchResult(null) }}>
              + Install cert
            </button>
          )}
        </div>

        {/* Install cert modal */}
        {showInstall && (
          <div style={{ background: 'var(--v2-surface-2)', border: '1px solid var(--v2-border)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize:12, fontWeight: 600, color: 'var(--v2-text-1)', marginBottom: 10 }}>
              Install certificate to this server
            </div>
            <div style={{ marginBottom: 8 }}>
              <label className="v2-section-label" style={{ marginBottom: 4, display: 'block' }}>Certificate</label>
              <select className="v2-input" style={{ fontSize:12 }}
                value={installCertId} onChange={e => {
                  setInstallCertId(e.target.value)
                  const cert = certs?.find(c => c.id === e.target.value)
                  if (cert) setInstallDomain(cert.domain)
                }}>
                <option value="">— select cert —</option>
                {(certs || []).filter(c => c.status === 'active' && c.private_key_pem).map(c => (
                  <option key={c.id} value={c.id}>{c.domain} · {c.cert_type || 'SSL'}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="v2-section-label" style={{ marginBottom: 4, display: 'block' }}>Domain on server</label>
              <input className="v2-input" style={{ fontSize:12, fontFamily: 'var(--v2-font-mono)' }}
                value={installDomain} onChange={e => setInstallDomain(e.target.value)}
                placeholder="yourdomain.com"/>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={dispatchInstall} disabled={dispatching || !installCertId || !installDomain}>
                {dispatching ? <><RefreshCw size={11} className="spin"/> Dispatching…</> : 'Dispatch install'}
              </button>
              <button className="v2-btn v2-btn-sm" onClick={() => { setShowInstall(false); setDispatchResult(null) }}>Cancel</button>
            </div>
            {dispatchResult && (
              <div style={{ marginTop: 8, fontSize:11, color: dispatchResult.ok ? 'var(--v2-green-text)' : '#1f5c4e' }}>
                {dispatchResult.msg}
              </div>
            )}
          </div>
        )}

        {/* Job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {agent?.last_seen_at && (
            <div className="v2-timeline-item">
              <span className="v2-dot v2-dot-green" />
              <span style={{ color: '#333333' }}>Agent heartbeat</span>
              <span className="v2-timeline-time">{timeAgo(agent.last_seen_at)}</span>
            </div>
          )}
          {loadingJobs && jobs.length === 0 && (
            <div className="v2-timeline-item">
              <span className="v2-dot v2-dot-grey" />
              <span style={{ color: '#888888', fontSize:11 }}>Loading job history…</span>
            </div>
          )}
          {jobs.map(j => {
            const d = jobDot(j.status)
            const isActive = j.status === 'queued' || j.status === 'claimed'
            return (
              <div key={j.id} className="v2-timeline-item" title={j.error_message || ''}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0,
                  boxShadow: isActive ? `0 0 0 3px ${d.color}33` : 'none',
                  animation: isActive ? 'v2-pulse 1.5s ease-in-out infinite' : 'none' }}/>
                <span style={{ color: '#333333', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: d.color, fontWeight: 600 }}>{d.label}</strong>
                  {' · '}{j.job_type} · <span style={{ fontFamily: 'var(--v2-font-mono)', fontSize:10 }}>{j.domain}</span>
                  {j.error_message && <span style={{ color: '#1f5c4e', marginLeft: 4 }}>— {j.error_message.slice(0,60)}</span>}
                </span>
                <span className="v2-timeline-time">{fmtJobTime(j.completed_at || j.claimed_at || j.created_at)}</span>
              </div>
            )
          })}
          {!loadingJobs && jobs.length === 0 && (
            <div className="v2-timeline-item">
              <span className="v2-dot v2-dot-grey" />
              <span style={{ color: '#888888', fontSize:11 }}>No jobs yet — cert installs and renewals will appear here</span>
            </div>
          )}
          <div className="v2-timeline-item">
            <span className="v2-dot v2-dot-grey" />
            <span style={{ color: '#333333' }}>Server added</span>
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
// ── Unified DNS + Server Setup Modal ─────────────────────────────────
// Replaces AddProviderModal and AddServerModal.
// defaultMode: 'dns' | 'server' | 'both'
// editDns: existing dns credential object (for edit mode)
// editServer: existing server credential object (for edit mode)
function UnifiedSetupModal({ onSave, onClose, userId, defaultMode = 'both', editDns = null, editServer = null }) {
  const isEditDns    = !!editDns
  const isEditServer = !!editServer
  const isEdit       = isEditDns || isEditServer

  // If editing, lock mode to what's being edited
  const [mode, setMode] = useState(
    isEditDns && !isEditServer ? 'dns' :
    isEditServer && !isEditDns ? 'server' :
    defaultMode
  )

  // Shared
  const [domain, setDomain] = useState(
    editDns?.domain_pattern || editServer?.domains?.[0] || ''
  )

  // DNS section
  const [provider, setProvider] = useState(editDns?.provider || 'cloudflare')
  const [dnsLabel, setDnsLabel] = useState(editDns?.label || '')
  const [dnsFields, setDnsFields] = useState({})
  const [showDnsField, setShowDnsField] = useState({})

  // Server section
  const [serverType, setServerType] = useState(editServer?.server_type || 'cpanel')
  const [nickname, setNickname] = useState(editServer?.nickname || '')
  const [serverFields, setServerFields] = useState(() => {
    if (!editServer) return {}
    return { host: editServer.host || '', username: editServer.username || '', port: editServer.port ? String(editServer.port) : '' }
  })
  const [extraDomains, setExtraDomains] = useState(
    (editServer?.domains || []).filter(d => d !== (editDns?.domain_pattern || editServer?.domains?.[0] || '')).join(', ')
  )
  const [installMode, setInstallMode] = useState(editServer?.install_mode || 'agent')
  const secretRefs = useRef({})
  const [showServerField, setShowServerField] = useState({})

  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const saveDns  = mode === 'dns'    || mode === 'both'
  const saveServer = mode === 'server' || mode === 'both'
  const p = PROVIDERS[provider]
  const t = SERVER_TYPES[serverType]
  const isVPS = serverType === 'ssh'

  const submit = async () => {
    setError('')
    // Validate shared
    if (!domain.trim()) { setError('Enter a domain name'); return }
    // Validate DNS section
    if (saveDns) {
      const required = p.fields.filter(f => !f.optional && !dnsFields[f.key])
      if (required.length) { setError(`DNS: missing ${required.map(f => f.label).join(', ')}`); return }
    }
    // Validate server section
    if (saveServer) {
      if (!nickname.trim()) { setError('Server: enter a nickname'); return }
      if (!serverFields.host?.trim()) { setError(`Server: enter the ${t.fields[0].label}`); return }
      if (!serverFields.username?.trim()) { setError('Server: enter the username'); return }
      // cPanel API token required on new save
      const secretKeys = ['api_token', 'password', 'ssh_key', 'secret_key', 'token']
      const hasSecret = secretKeys.some(k => secretRefs.current[k]?.value?.trim())
      if (!isEditServer && !hasSecret) { setError('Server: enter the API token or password'); return }
    }

    setLoading(true)
    const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()

    const results = await Promise.allSettled([
      // DNS save
      saveDns ? fetch(DNS_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEditDns ? 'update' : 'save',
          user_id: userId,
          ...(isEditDns && { id: editDns.id }),
          provider,
          domain_pattern: cleanDomain,
          label: dnsLabel || `${PROVIDERS[provider].name} · ${cleanDomain}`,
          credentials: dnsFields,
        })
      }).then(r => r.json()) : Promise.resolve(null),

      // Server save
      saveServer ? fetch(SERVER_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEditServer ? 'update' : 'save',
          user_id: userId,
          ...(isEditServer && { id: editServer.id }),
          server_type: serverType,
          nickname: nickname.trim() || cleanDomain,
          host: serverFields.host?.trim() || cleanDomain,
          username: serverFields.username?.trim() || '',
          port: serverFields.port ? parseInt(serverFields.port) : (serverType === 'cpanel' ? 2083 : serverType === 'plesk' ? 8443 : 22),
          domains: [cleanDomain, ...extraDomains.split(',').map(d => d.trim()).filter(Boolean)],
          install_mode: isVPS ? installMode : 'agent',
          credentials: (() => {
            const creds = {}
            const keys = ['api_token', 'password', 'ssh_key', 'secret_key', 'token']
            keys.forEach(k => { const v = secretRefs.current[k]?.value?.trim(); if (v) creds[k] = v })
            return Object.keys(creds).length ? creds : undefined
          })(),
        })
      }).then(r => r.json()) : Promise.resolve(null),
    ])

    const [dnsResult, srvResult] = results
    const dnsErr = dnsResult.status === 'fulfilled' && dnsResult.value?.error ? dnsResult.value.error : null
    const srvErr = srvResult.status === 'fulfilled' && srvResult.value?.error ? srvResult.value.error : null
    const errors = [dnsErr && `DNS: ${dnsErr}`, srvErr && `Server: ${srvErr}`].filter(Boolean)

    setLoading(false)
    if (errors.length) { setError(errors.join(' · ')); return }

    setSuccess(isEdit ? 'Updated successfully' : 'Saved successfully')
    setTimeout(() => { onSave(); onClose() }, 900)
  }

  const modeOptions = [
    { key: 'dns',    label: 'DNS only',        icon: <Globe size={13}/>,  desc: 'Auto DNS challenge for cert issuance' },
    { key: 'server', label: 'Server only',     icon: <Server size={13}/>, desc: 'Auto-install certs to your server' },
    { key: 'both',   label: 'DNS + Server',    icon: <Zap size={13}/>,    desc: 'Full automation — issue & install' },
  ]

  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal" style={{ maxWidth: 560 }}>
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">{isEdit ? 'Edit configuration' : 'Add server & DNS'}</div>
            <div className="v2-modal-subtitle">Credentials encrypted with AES-256-GCM</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="v2-modal-body">

          {/* Mode selector — hidden in edit mode */}
          {!isEdit && (
            <div style={{ marginBottom: 20 }}>
              <label className="v2-label" style={{ marginBottom: 8, display: 'block' }}>What do you want to save?</label>
              <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap: 8 }}>
                {modeOptions.map(m => (
                  <button key={m.key} type="button" onClick={() => { setMode(m.key); setError('') }}
                    style={{
                      padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: mode === m.key ? '2px solid var(--v2-accent)' : '1px solid var(--v2-border)',
                      background: mode === m.key ? 'var(--v2-accent-bg)' : 'var(--v2-surface)',
                      fontFamily: 'inherit', transition: 'all 0.12s',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4,
                      color: mode === m.key ? 'var(--v2-accent)' : 'var(--v2-text-3)' }}>
                      {m.icon}
                    </div>
                    <div style={{ fontSize:11, fontWeight: 700, color: mode === m.key ? 'var(--v2-accent)' : 'var(--v2-text)',
                      marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize:10, color: '#888888', lineHeight: 1.4 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shared domain field */}
          <div style={{ marginBottom: 16 }}>
            <label className="v2-label">Domain <span style={{ color: '#1f5c4e' }}>*</span></label>
            <input className="v2-input mono" placeholder="yourdomain.com"
              value={domain} onChange={e => setDomain(e.target.value)} />
            <div className="v2-label-help">
              {saveDns && saveServer ? 'Used for both DNS challenge and server cert matching'
               : saveDns ? 'Root domain managed by this DNS provider'
               : 'Domain hosted on this server'}
            </div>
          </div>

          {/* ── DNS SECTION ── */}
          {saveDns && (
            <div style={{ background: 'var(--v2-surface-2)', border: '1px solid var(--v2-border)',
              borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize:12, fontWeight: 700, color: '#111111', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={13} style={{ color: 'var(--v2-accent)' }}/> DNS Provider
              </div>

              {/* Provider picker */}
              <div style={{ marginBottom: 12 }}>
                <label className="v2-label">Provider</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(PROVIDERS).map(([key, prov]) => (
                    <button key={key} type="button"
                      onClick={() => { setProvider(key); setDnsFields({}); setError('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                        borderRadius: 6, fontSize:11, fontWeight: 500, cursor: 'pointer',
                        border: provider === key ? `1.5px solid ${prov.color}` : '0.5px solid var(--v2-border)',
                        background: provider === key ? `${prov.color}15` : 'var(--v2-surface)',
                        color: provider === key ? prov.color : 'var(--v2-text-2)',
                        fontFamily: 'inherit',
                      }}>
                      <span style={{ width: 16, height: 16, borderRadius: 3, background: prov.color,
                        color: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700 }}>{prov.mono}</span>
                      {prov.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* DNS credential fields */}
              {p.fields.map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label className="v2-label">
                    {f.label}
                    {f.optional && <span style={{ color: '#888888', fontWeight: 400 }}> · optional</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input className="v2-input mono"
                      type={f.type === 'password' && !showDnsField[f.key] ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={dnsFields[f.key] || ''}
                      onChange={e => setDnsFields(s => ({ ...s, [f.key]: e.target.value }))}
                      style={f.type === 'password' ? { paddingRight: 36 } : {}}
                    />
                    {f.type === 'password' && (
                      <button type="button"
                        onClick={() => setShowDnsField(s => ({ ...s, [f.key]: !s[f.key] }))}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#888888', display: 'flex' }}>
                        {showDnsField[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    )}
                  </div>
                  <div className="v2-label-help">{f.help}</div>
                </div>
              ))}

              <div style={{ fontSize:10, color: '#888888', marginTop: 4 }}>
                <a href={p.docs} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--v2-accent)', textDecoration: 'none' }}>
                  {p.name} docs
                </a> · {p.note}
              </div>
            </div>
          )}

          {/* ── SERVER SECTION ── */}
          {saveServer && (
            <div style={{ background: 'var(--v2-surface-2)', border: '1px solid var(--v2-border)',
              borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize:12, fontWeight: 700, color: '#111111', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <Server size={13} style={{ color: 'var(--v2-accent)' }}/> Server
              </div>

              {/* Honeypot */}
              <input type="text" name="username" style={{ display: 'none' }} tabIndex={-1} readOnly/>
              <input type="password" name="password" style={{ display: 'none' }} tabIndex={-1} readOnly/>

              {/* Server type picker */}
              {!isEditServer && (
                <div style={{ marginBottom: 12 }}>
                  <label className="v2-label">Type</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(SERVER_TYPES).map(([key, st]) => {
                      const Icon = st.Icon
                      return (
                        <button key={key} type="button"
                          onClick={() => { setServerType(key); setError('') }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                            borderRadius: 6, fontSize:11, fontWeight: 500, cursor: 'pointer',
                            border: serverType === key ? `1.5px solid ${st.color}` : '0.5px solid var(--v2-border)',
                            background: serverType === key ? st.bg : 'var(--v2-surface)',
                            color: serverType === key ? st.color : 'var(--v2-text-2)',
                            fontFamily: 'inherit',
                          }}>
                          <Icon size={12} strokeWidth={2}/>
                          {st.short}
                        </button>
                      )
                    })}
                  </div>
                  <div className="v2-label-help">{t.desc}</div>
                </div>
              )}

              {/* Nickname */}
              <div style={{ marginBottom: 10 }}>
                <label className="v2-label">Nickname</label>
                <input className="v2-input" placeholder="production-web-01"
                  value={nickname} onChange={e => setNickname(e.target.value)}/>
              </div>

              {/* Server credential fields */}
              {t.fields.map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label className="v2-label">{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    {f.key === 'ssh_key' ? (
                      <textarea className="v2-input mono" rows={4}
                        placeholder={isEditServer && editServer?.credentials_enc
                          ? '(saved — paste new key to replace)' : f.placeholder}
                        value={serverFields[f.key] || ''}
                        onChange={e => setServerFields(s => ({ ...s, [f.key]: e.target.value }))}
                        style={{ resize: 'vertical', fontSize:11, lineHeight: 1.4 }}/>
                    ) : ['host', 'username', 'port'].includes(f.key) ? (
                      <input className="v2-input mono" placeholder={f.placeholder}
                        value={serverFields[f.key] || ''}
                        onChange={e => setServerFields(s => ({ ...s, [f.key]: e.target.value }))}/>
                    ) : (
                      <>
                        <input className="v2-input mono"
                          ref={el => secretRefs.current[f.key] = el}
                          autoComplete="new-password"
                          data-lpignore="true" data-form-type="other"
                          name={`sv-${f.key}-${Math.random()}`}
                          type={showServerField[f.key] ? 'text' : 'password'}
                          placeholder={isEditServer && editServer?.credentials_enc
                            ? '(saved — type new value to replace)' : f.placeholder}
                          defaultValue=""
                          style={{ paddingRight: 36 }}/>
                        <button type="button"
                          onClick={() => setShowServerField(s => ({ ...s, [f.key]: !s[f.key] }))}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#888888', display: 'flex' }}>
                          {showServerField[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="v2-label-help">{f.help}</div>
                </div>
              ))}

              {/* Additional domains (only shown in server-only or both mode) */}
              {mode !== 'dns' && (
                <div style={{ marginBottom: 10 }}>
                  <label className="v2-label">Additional domains
                    <span style={{ color: '#888888', fontWeight: 400 }}> · optional</span>
                  </label>
                  <input className="v2-input" placeholder="www.example.com, api.example.com"
                    value={extraDomains} onChange={e => setExtraDomains(e.target.value)}/>
                  <div className="v2-label-help">Comma-separated. The domain above is always included.</div>
                </div>
              )}

              {/* Install method — VPS only */}
              {isVPS && (
                <div style={{ marginTop: 12 }}>
                  <label className="v2-label" style={{ marginBottom: 8, display: 'block' }}>
                    Certificate install method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 8 }}>
                    {[
                      { id: 'agent',    title: 'Agent', desc: 'One-time setup on server. No SSH stored. Recommended.', color: 'var(--v2-accent)' },
                      { id: 'ssh_push', title: 'SSH Push', desc: 'SSLVault SSHes in directly. Fully automatic.', color: '#16a068' },
                    ].map(opt => (
                      <div key={opt.id} onClick={() => setInstallMode(opt.id)}
                        style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          border: installMode === opt.id ? `1.5px solid ${opt.color}` : '1px solid var(--v2-border)',
                          background: installMode === opt.id ? (opt.id === 'ssh_push' ? 'transparent' : 'var(--v2-accent-bg)') : 'var(--v2-surface)' }}>
                        <div style={{ fontWeight: 700, fontSize:11, marginBottom: 3,
                          color: installMode === opt.id ? opt.color : 'var(--v2-text)' }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize:10, color: '#888888', lineHeight: 1.4 }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error   && <div className="v2-alert v2-alert-error"   style={{ marginBottom: 12 }}><AlertCircle size={13}/> <span>{error}</span></div>}
          {success && <div className="v2-alert v2-alert-success" style={{ marginBottom: 12 }}><Check size={13} strokeWidth={2.4}/> <span>{success}</span></div>}
        </div>

        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-primary" onClick={submit} disabled={loading || !!success}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : `Save ${mode === 'both' ? 'DNS & server' : mode === 'dns' ? 'DNS provider' : 'server'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

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
        // Must use create_install_command — it generates a pre-authorized token
        // server-side and embeds it in the install command. create_token requires
        // a JWT which the modal doesn't have at this point.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (!cancelled) setTokenError('Session expired — please refresh'); return }
        const res = await fetch(DAEMON_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: JSON.stringify({
            action: 'create_install_command',
            user_id: userId,
            server_id: server.id,
            nickname: server.nickname || server.host || 'My Server'
          })
        })
        const data = await res.json()
        if (cancelled) return
        if (data.ok && data.agent_token) setAgentToken(data.agent_token)
        else setTokenError(data.error || 'Could not generate install token')
      } catch (e) { if (!cancelled) setTokenError(String(e.message)) }
      if (!cancelled) setTokenLoading(false)
    })()
    return () => { cancelled = true }
  }, [server.id, userId])

  useEffect(() => {
    if (!agentToken) return
    const i = setInterval(async () => {
      try {
        const { data: { session: _s } } = await sbClient.auth.getSession()
        const res = await fetch(DAEMON_FN, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (_s?.access_token || '') },
          body: JSON.stringify({ action: 'list_agents', user_id: userId })
        })
        const data = await res.json()
        const found = (data.agents || []).find(a => a.server_id === server.id)
        if (found) {
          setRegistered(true)
          setTimeout(() => { onRegistered(); onClose() }, 1800)
        }
      } catch (e) {}
    }, 5000)
    return () => clearInterval(i)
  }, [agentToken, onClose, onRegistered])

  const installCmd = agentToken
    ? `curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash -s -- --token=${agentToken} --user-id=${userId} --server-id=${server.id} --nickname="${server.nickname || server.host}"`
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
                <Check size={22} strokeWidth={2.2} color="#1f5c4e" />
              </div>
              <div style={{ fontSize:14, fontWeight: 500, color: '#111111', marginBottom: 4 }}>Agent registered</div>
              <div style={{ fontSize:12, color: '#333333' }}>{server.nickname} is now fully automated</div>
            </div>
          ) : tokenError ? (
            <div className="v2-alert v2-alert-error">
              <AlertCircle size={13} /> <span>{tokenError} — please close and try again.</span>
            </div>
          ) : tokenLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#333333', fontSize:13 }}>
              Generating secure token…
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div className="v2-section-label" style={{ marginBottom: 6 }}>What this does</div>
                <ul style={{ paddingLeft: 18, margin: 0, fontSize:12, color: '#333333', lineHeight: 1.7 }}>
                  <li>Installs a lightweight background service (~2MB RAM)</li>
                  <li>Registers the server with SSLVault automatically</li>
                  <li>Handles future cert installs &amp; renewals — no SSH needed</li>
                  <li>Runs on every boot · restarts on crash</li>
                </ul>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="v2-label">SSH into your server and run</label>
                <div style={{ background:'#f4f1ec', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '7px 12px', borderBottom: '0.5px solid rgba(31,92,78,0.07)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#1f5c4e' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background:'#f4f1ec' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background:'#f4f1ec' }} />
                    </div>
                    <button onClick={copy} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: copied ? '#111111' : '#666666', fontSize:11, fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      {copied ? <><Check size={11} /> Copied</> : 'Copy'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '12px 14px', color: '#888888', fontSize:11,
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all', lineHeight: 1.6
                  }}>{installCmd}</pre>
                </div>
              </div>

              <div className="v2-alert v2-alert-info" style={{ marginBottom: 14, fontSize:11 }}>
                <span><strong style={{ color: '#111111' }}>Requirements:</strong> Ubuntu 20/22/24, Debian 10/11/12, CentOS 7/8/9, Amazon Linux 2/2023 · Nginx or Apache · sudo</span>
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
          <h1 className="v2-h1" style={{ fontSize:Math.min(32,window.innerWidth>768?32:24), marginBottom: 10, letterSpacing: '-0.6px' }}>
            One vault for DNS &amp; servers
          </h1>
          <p style={{ fontSize:14, color: '#333333', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Connect your DNS provider and servers once. Auto-DNS, auto-install, auto-renewal.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, marginBottom: 28 }}>
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <div key={key} className="v2-card v2-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width:32, height:32, borderRadius:7, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#111111', fontSize:10, fontWeight:700, flexShrink:0 }}>{p.mono}</div>
              <div>
                <div style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>{p.name}</div>
                <div style={{ fontSize:11, color: '#333333' }}>DNS provider</div>
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
                  <div style={{ fontSize:13, fontWeight: 500, color: '#111111' }}>{t.short}</div>
                  <div style={{ fontSize:11, color: '#333333' }}>Server type</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="v2-card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background:'#1f5c4e',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14
          }}>
            <Lock size={20} strokeWidth={2} color="white" />
          </div>
          <div style={{ fontSize:18, fontWeight: 500, color: '#111111', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Sign in to manage credentials
          </div>
          <p style={{ color: '#333333', fontSize:13, maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.6 }}>
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
export default function Integrations({ nav }) {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab]                 = useState('dns') // kept for PageHeader compat
  const [viewMode, setViewMode]        = useState('table') // table | list
  const [credentials, setCredentials] = useState([])
  const [servers, setServers]         = useState([])
  const [agents, setAgents]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAddDns, setShowAddDns]   = useState(false)
  const [showAddSrv, setShowAddSrv]   = useState(false)
  const [showAddBoth, setShowAddBoth] = useState(false)
  const [editServer, setEditServer]   = useState(null)
  const [agentServer, setAgentServer] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [testing, setTesting]               = useState(null)
  const [testResult, setTestResult]         = useState({})
  const [credStatus, setCredStatus]         = useState({})

  // ── CA Connections state ────────────────────────────────────────────
  const [caTok,         setCaTok]         = useState('')
  const [connections,   setConnections]   = useState([])
  const [caLoading,     setCaLoading]     = useState(false)
  const [syncing,       setSyncing]       = useState(null)
  const [syncResult,    setSyncResult]    = useState({})
  const [delConn,       setDelConn]       = useState(null)
  const [delCerts,      setDelCerts]      = useState(true)
  const [showAdd,       setShowAdd]       = useState(false)
  const [addCa,         setAddCa]         = useState(null)
  const [addLabel,      setAddLabel]      = useState('')
  const [addFields,     setAddFields]     = useState({})
  const [addSaving,     setAddSaving]     = useState(false)
  const [addError,      setAddError]      = useState('')
  const [showPwd,       setShowPwd]       = useState({})
  const [showImport,    setShowImport]    = useState(false)
  const [pemText,       setPemText]       = useState('')
  const [importing,     setImporting]     = useState(false)
  const [importResult,  setImportResult]  = useState(null)
  const [certCount,     setCertCount]     = useState(0)

  useEffect(() => {
    if (!authLoading && user) loadAll()
    if (!authLoading && !user) setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadCredentials(), loadServers(), loadAgents(), loadCA()])
    setLoading(false)
  }

  const loadCA = async () => {
    const { data: { session } } = await sbClient.auth.getSession()
    const tok = session?.access_token || ''
    setCaTok(tok)
    if (!tok) return
    setCaLoading(true)
    const r = await callCA(tok, { action: 'list_connections' })
    if (r.connections) setConnections(r.connections)
    if (r.total_certs !== undefined) setCertCount(r.total_certs)
    else if (r.certs) setCertCount(r.certs.length)
    setCaLoading(false)
  }

  const openAdd = (ca) => { setAddCa(ca); setAddLabel(CA_DEFS[ca]?.name || ''); setAddFields({}); setAddError('') }

  const saveConnection = async () => {
    setAddSaving(true); setAddError('')
    // Always refresh token before saving to avoid stale caTok
    const { data: { session } } = await sbClient.auth.getSession()
    const freshTok = session?.access_token || caTok
    const def = CA_DEFS[addCa]
    const payload = { action: 'save_connection', ca_type: addCa, label: addLabel, ...addFields }
    const r = await callCA(freshTok, payload)
    setAddSaving(false)
    if (r.ok) { setShowAdd(false); setAddCa(null); await loadCA() }
    else setAddError(r.error || 'Connection failed')
  }

  const doSync = async (connId) => {
    setSyncing(connId)
    const r = await callCA(caTok, { action: 'sync', connection_id: connId })
    setSyncResult(p => ({ ...p, [connId]: r }))
    setSyncing(null)
    await loadCA()
  }

  const deleteConn = async (connId) => {
    await callCA(caTok, { action: 'delete_connection', connection_id: connId, delete_certs: delCerts })
    setDelConn(null); setDelCerts(true)
    await loadCA()
  }

  const doImport = async () => {
    setImporting(true)
    const r = await callCA(caTok, { action: 'manual_import', cert_pem: pemText.trim() })
    setImportResult(r); setImporting(false)
    if (r.ok) await loadCA()
  }

  const loadCredentials = async () => {
    const res = await fetch(DNS_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', user_id: user.id })
    })
    const data = await res.json()
    const list = data.credentials || []
    setCredentials(list)
    setTestResult({})  // clear stale test results on fresh load
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
  }

  const loadAgents = async () => {
    try {
      const { data: { session } } = await sbClient.auth.getSession()
      const tok = session?.access_token || ''
      const res = await fetch(DAEMON_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
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
  }

  const deleteServer = async (id) => {
    if (!confirm('Delete this server?')) return
    await fetch(SERVER_FN, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', user_id: user.id, id })
    })
    setServers(s => s.filter(x => x.id !== id))
  }

  const testCred = async (cred) => {
    setTesting(cred.id)
    setTestResult(t => ({ ...t, [cred.id]: null }))
    try {
      const res = await fetch(DNS_FN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: user.id, id: cred.id, domain: cred.domain_pattern?.replace('*.', '') || '' })
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
    ca: connections.length,
    activeAgents: agents.filter(a => {
      if (!a.last_seen_at) return false
      const m = (Date.now() - new Date(a.last_seen_at).getTime()) / 60000
      return m < 15
    }).length
  }

  // Build unified domain list — group DNS + Server by domain
  const domainMap = {}
  credentials.forEach(c => {
    const d = c.domain_pattern
    if (!domainMap[d]) domainMap[d] = { domain: d, dns: null, server: null }
    domainMap[d].dns = c
  })
  servers.forEach(s => {
    (s.domains || []).forEach(d => {
      if (!domainMap[d]) domainMap[d] = { domain: d, dns: null, server: null }
      // Only link one server per domain (prefer exact match)
      if (!domainMap[d].server) domainMap[d].server = s
    })
  })
  const domainGroups = Object.values(domainMap).sort((a, b) => a.domain.localeCompare(b.domain))

  const selGroup = domainGroups.find(g => g.domain === selectedDomain)
  const selDnsCred = selGroup?.dns || null
  const selSrv     = selGroup?.server || null
  const selSrvAgent = selSrv ? (agents.find(a => a.server_id === selSrv.id) || null) : null

  // Section label component
  const SectionLabel = ({ label, icon: Icon, color, count }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px 6px',
      borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ width:20, height:20, borderRadius:5, background:color,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={11} color="white" strokeWidth={2.2}/>
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:'#333333',
        textTransform:'uppercase', letterSpacing:'0.5px', flex:1 }}>{label}</span>
      <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:10,
        background:'var(--v2-border)', color:'#888888' }}>{count}</span>
    </div>
  )

  const ListPanel = ({ children }) => (
    <div style={{ background:'rgba(0,0,0,0.02)', border:'0.5px solid var(--v2-border)',
      borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  )

  return (
    <div style={{ background:'var(--v2-surface-3)', minHeight:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:isMobile?'14px 12px':'32px 28px 80px' }}>

        {/* Modals */}
        {showAddDns  && <UnifiedSetupModal userId={user?.id} defaultMode="dns"    onSave={() => { loadCredentials(); loadServers() }} onClose={() => setShowAddDns(false)} />}
        {showAddSrv  && <UnifiedSetupModal userId={user?.id} defaultMode="server" onSave={() => { loadCredentials(); loadServers() }} onClose={() => setShowAddSrv(false)} />}
        {showAddBoth && <UnifiedSetupModal userId={user?.id} defaultMode="both"   onSave={() => { loadCredentials(); loadServers() }} onClose={() => setShowAddBoth(false)} />}
        {editServer  && <UnifiedSetupModal userId={user?.id} defaultMode="server" onSave={loadServers} onClose={() => setEditServer(null)} editServer={editServer} />}
        {agentServer && <InstallAgentModal server={agentServer} userId={user?.id} onClose={() => setAgentServer(null)} onRegistered={loadAgents} />}

        {/* Page header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:20, fontWeight:600, color:'#111111', margin:0, letterSpacing:'-0.2px' }}>Integrations</h1>
          <p style={{ fontSize:13, color:'#888888', marginTop:4, marginBottom:0 }}>
            Manage DNS providers, servers, and external CA connections for automated certificate lifecycle management
          </p>
        </div>

        {/* Tab bar — enterprise style */}
        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.07)', marginBottom:24, gap:0 }}>
          {[
            { id:'dns',     label:'DNS Providers', count:credentials.length },
            { id:'servers', label:'Servers',        count:servers.length },
            { id:'ca',      label:'CA Connections', count:connections.length },
          ].map(({ id, label, count }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                padding:'10px 20px', fontSize:13, fontWeight: tab===id ? 600 : 400,
                fontFamily:'inherit', border:'none', cursor:'pointer',
                background:'transparent', color: tab===id ? 'var(--v2-accent,#2a6b5c)' : 'var(--v2-text-3)',
                borderBottom: tab===id ? '2px solid var(--v2-accent,#2a6b5c)' : '2px solid transparent',
                marginBottom:-1, transition:'all .12s', display:'flex', alignItems:'center', gap:8
              }}>
              {label}
              {count > 0 && (
                <span style={{
                  fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:10,
                  background: tab===id ? 'rgba(14,127,192,0.12)' : 'var(--v2-surface-2)',
                  color: tab===id ? 'var(--v2-accent,#2a6b5c)' : 'var(--v2-text-3)',
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ DNS PROVIDERS ══════════════════════════════════════════════════════ */}
        {tab === 'dns' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'#333333' }}>
                {credentials.length} provider{credentials.length !== 1 ? 's' : ''} configured
              </div>
              <button className="v2-btn v2-btn-primary" onClick={() => setShowAddDns(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:13, fontWeight:500 }}>
                <Plus size={14}/> Add DNS Provider
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#888888', fontSize:13 }}>
                <RefreshCw size={20} className="spin" style={{ display:'block', margin:'0 auto 10px' }}/>
                Loading providers…
              </div>
            ) : credentials.length === 0 ? (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8,
                padding:'clamp(16px,20vw,60px) 32px', textAlign:'center' , overflowX:'auto'}}>
                <Globe size={36} style={{ color:'#888888', marginBottom:14, display:'block', margin:'0 auto 14px' }}/>
                <div style={{ fontSize:15, fontWeight:500, color:'#111111', marginBottom:6 }}>No DNS providers connected</div>
                <div style={{ fontSize:13, color:'#888888', maxWidth:420, margin:'0 auto 20px' }}>
                  Connect Cloudflare, Vercel, GoDaddy, or DigitalOcean to automatically add DNS TXT records during certificate validation.
                </div>
                <button className="v2-btn v2-btn-primary" onClick={() => setShowAddDns(true)}
                  style={{ padding:'9px 20px', fontSize:13 }}>
                  <Plus size={14}/> Connect DNS Provider
                </button>
              </div>
            ) : (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 120px 100px',minWidth:640,
                  padding:'10px 20px', background:'var(--v2-surface-2)',
                  borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                  {['Provider', 'Domain', 'API credentials', 'Status', 'Actions'].map(h => (
                    <div key={h} style={{ fontSize:11, fontWeight:600, color:'#888888',
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {credentials.map((cred, i) => {
                  const p = PROVIDERS[cred.provider] || { name: cred.provider, mono:'?', color:'#333333' }
                  const st = credStatus[cred.id] || 'untested'
                  const statusStyles = {
                    healthy:  { color:'#111111', bg:'transparent', border:'rgba(31,92,78,0.2)', label:'Active' },
                    expired:  { color:'#2e7a68', bg:'rgba(31,92,78,0.09)', border:'rgba(0,0,0,0.1)', label:'Error' },
                    untested: { color:'#333333', bg:'var(--v2-surface-2)', border:'var(--v2-border)', label:'Untested' }
                  }
                  const ss = statusStyles[st] || statusStyles.untested
                  return (
                    <div key={cred.id}
style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 120px 100px',minWidth:640,
                        padding:'14px 20px', alignItems:'center',
                        borderBottom: i < credentials.length-1 ? '0.5px solid var(--v2-border)' : 'none',
                        background:'var(--v2-surface)', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--v2-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}>

                      {/* Provider */}
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:34, height:34, borderRadius:7, background:p.color,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700, color:'#111111', flexShrink:0, letterSpacing:'0.3px' }}>
                          {p.mono}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{p.name}</div>
                          <div style={{ fontSize:11, color:'#888888', marginTop:1 }}>DNS validation</div>
                        </div>
                      </div>

                      {/* Domain */}
                      <div style={{ fontSize:13, fontFamily:'monospace', color:'#333333',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {cred.domain_pattern || '*.all-domains'}
                      </div>

                      {/* Credentials */}
                      <div style={{ fontSize:12, color:'#888888' }}>
                        {cred.tested_at
                          ? `Tested ${new Date(cred.tested_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`
                          : 'Not yet tested'}
                      </div>

                      {/* Status badge */}
                      <div>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                          fontSize:12, fontWeight:500, padding:'4px 10px', borderRadius:4,
                          background:ss.bg, color:ss.color, border:`0.5px solid ${ss.border}` }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:ss.color, flexShrink:0 }}/>
                          {ss.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button className="v2-btn v2-btn-sm" onClick={() => testCred(cred)}
                          disabled={testing===cred.id}
                          title="Test connection"
                          style={{ padding:'5px 10px', fontSize:12 }}>
                          {testing===cred.id
                            ? <RefreshCw size={12} className="spin"/>
                            : <><Zap size={12}/> Test</>}
                        </button>
                        <button onClick={() => deleteCred(cred.id)} title="Delete"
                          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
                            background:'none', border:'0.5px solid #fecaca', borderRadius:5, cursor:'pointer',
                            color:'#1f5c4e', transition:'all .12s', flexShrink:0 }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(31,92,78,0.09)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='none' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
                {/* Test result banner */}
                {Object.entries(testResult).filter(([,v]) => v).map(([id, r]) => (
                  <div key={id} style={{ padding:'10px 20px', borderTop:'0.5px solid var(--v2-border)',
                    background: r.ok ? 'transparent' : 'rgba(31,92,78,0.09)', display:'flex', alignItems:'center', gap:8 }}>
                    {r.ok
                      ? <Check size={13} style={{ color:'#111111', flexShrink:0 }}/>
                      : <AlertCircle size={13} style={{ color:'#1f5c4e', flexShrink:0 }}/>}
                    <span style={{ fontSize:12, color: r.ok ? '#111111' : '#1f5c4e' }}>
                      {r.ok ? `Connection successful — API key valid` : r.message || 'Connection failed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SERVERS ════════════════════════════════════════════════════════════ */}
        {tab === 'servers' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'#333333' }}>
                {servers.length} server{servers.length !== 1 ? 's' : ''} configured
              </div>
              <button className="v2-btn v2-btn-primary" onClick={() => setShowAddSrv(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:13, fontWeight:500 }}>
                <Plus size={14}/> Add Server
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#888888', fontSize:13 }}>
                <RefreshCw size={20} className="spin" style={{ display:'block', margin:'0 auto 10px' }}/>
                Loading servers…
              </div>
            ) : servers.length === 0 ? (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8,
                padding:'clamp(16px,20vw,60px) 32px', textAlign:'center' , overflowX:'auto'}}>
                <Server size={36} style={{ color:'#888888', display:'block', margin:'0 auto 14px' }}/>
                <div style={{ fontSize:15, fontWeight:500, color:'#111111', marginBottom:6 }}>No servers connected</div>
                <div style={{ fontSize:13, color:'#888888', maxWidth:420, margin:'0 auto 20px' }}>
                  Add a cPanel, SSH, or Plesk server for automatic certificate installation after issuance.
                </div>
                <button className="v2-btn v2-btn-primary" onClick={() => setShowAddSrv(true)}
                  style={{ padding:'9px 20px', fontSize:13 }}>
                  <Plus size={14}/> Add Server
                </button>
              </div>
            ) : (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr 120px 120px',minWidth:650,
                  padding:'10px 20px', background:'var(--v2-surface-2)',
                  borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                  {['Server', 'Type', 'Domains', 'Agent', 'Actions'].map(h => (
                    <div key={h} style={{ fontSize:11, fontWeight:600, color:'#888888',
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {servers.map((srv, i) => {
                  const t = SERVER_TYPES[srv.server_type] || SERVER_TYPES.cpanel
                  const TIcon = t?.Icon
                  const agent = agents.find(a => a.server_id === srv.id)
                  const minsAgo = agent?.last_seen_at
                    ? (Date.now() - new Date(agent.last_seen_at).getTime()) / 60000 : null
                  const agentOnline = minsAgo !== null && minsAgo < 15
                  const agentStatus = !agent ? 'none' : agentOnline ? 'online' : 'offline'
                  const agentUI = {
                    online:  { color:'#111111', bg:'transparent', border:'rgba(31,92,78,0.2)', label:'Online' },
                    offline: { color:'#1f5c4e', bg:'rgba(239,68,68,0.08)', border:'rgba(0,0,0,0.1)', label:'Offline' },
                    none:    { color:'#333333', bg:'var(--v2-surface-2)', border:'var(--v2-border)', label:'No agent' },
                  }
                  const ag = agentUI[agentStatus]
                  return (
                    <div key={srv.id}
style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr 120px 120px',minWidth:650,
                        padding:'14px 20px', alignItems:'center',
                        borderBottom: i < servers.length-1 ? '0.5px solid var(--v2-border)' : 'none',
                        background:'var(--v2-surface)', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--v2-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}>

                      {/* Server name */}
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:34, height:34, borderRadius:7, background:t.color+'18',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {TIcon && <TIcon size={16} color={t.color}/>}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{srv.nickname || srv.host}</div>
                          <div style={{ fontSize:11, fontFamily:'monospace', color:'#888888', marginTop:1 }}>{srv.host}</div>
                        </div>
                      </div>

                      {/* Type */}
                      <div style={{ fontSize:12, color:'#333333' }}>{t.name}</div>

                      {/* Domains */}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {(srv.domains || []).slice(0,2).map(d => (
                          <span key={d} style={{ fontSize:11, fontFamily:'monospace', padding:'2px 7px',
                            borderRadius:4, background:'var(--v2-surface-3)', color:'#333333',
                            border:'0.5px solid var(--v2-border)' }}>{d}</span>
                        ))}
                        {(srv.domains||[]).length > 2 && (
                          <span style={{ fontSize:11, color:'#888888' }}>+{srv.domains.length-2}</span>
                        )}
                        {!srv.domains?.length && <span style={{ fontSize:12, color:'#888888' }}>—</span>}
                      </div>

                      {/* Agent status */}
                      <div>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                          fontSize:12, fontWeight:500, padding:'4px 10px', borderRadius:4,
                          background:ag.bg, color:ag.color, border:`0.5px solid ${ag.border}` }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:ag.color }}/>
                          {ag.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:6 }}>
                        {agentStatus === 'none' && (
                          <button className="v2-btn v2-btn-sm v2-btn-primary" onClick={() => setAgentServer(srv)}
                            style={{ padding:'5px 10px', fontSize:12 }}>
                            <Zap size={12}/> Agent
                          </button>
                        )}
                        {agentStatus !== 'none' && (
                          <button className="v2-btn v2-btn-sm" onClick={() => setEditServer(srv)}
                            style={{ padding:'5px 10px', fontSize:12 }}>
                            <Edit3 size={12}/>
                          </button>
                        )}
                        <button onClick={() => deleteServer(srv.id)} title="Delete"
                          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
                            background:'none', border:'0.5px solid #fecaca', borderRadius:5, cursor:'pointer',
                            color:'#1f5c4e', flexShrink:0 }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(31,92,78,0.09)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='none' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CA CONNECTIONS ═════════════════════════════════════════════════════ */}
        {tab === 'ca' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'#333333' }}>
                {connections.length} connection{connections.length !== 1 ? 's' : ''} · {certCount} certificates tracked
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="v2-btn" onClick={() => { setShowImport(true); setPemText(''); setImportResult(null) }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', fontSize:13 }}>
                  <Upload size={14}/> Import PEM
                </button>
                <button className="v2-btn v2-btn-primary" onClick={() => setShowAdd(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:13, fontWeight:500 }}>
                  <Plus size={14}/> Connect CA
                </button>
              </div>
            </div>

            {connections.length === 0 ? (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8,
                padding:'clamp(16px,20vw,60px) 32px', textAlign:'center' , overflowX:'auto'}}>
                <Shield size={36} style={{ color:'#888888', display:'block', margin:'0 auto 14px' }}/>
                <div style={{ fontSize:15, fontWeight:500, color:'#111111', marginBottom:6 }}>No CA connections</div>
                <div style={{ fontSize:13, color:'#888888', maxWidth:420, margin:'0 auto 20px' }}>
                  Connect DigiCert CertCentral or Sectigo SCM to import your external certificate portfolio into SSLVault.
                </div>
                <button className="v2-btn v2-btn-primary" onClick={() => setShowAdd(true)}
                  style={{ padding:'9px 20px', fontSize:13 }}>
                  <Plus size={14}/> Connect CA
                </button>
              </div>
            ) : (
              <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 120px 140px',minWidth:650,
                  padding:'10px 20px', background:'var(--v2-surface-2)',
                  borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                  {['Certificate authority', 'Label', 'Certs', 'Status', 'Actions'].map(h => (
                    <div key={h} style={{ fontSize:11, fontWeight:600, color:'#888888',
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {connections.map((conn, i) => {
                  const def = CA_DEFS[conn.ca_type] || { name:conn.ca_type, color:'#333333', bg:'var(--v2-surface-2)', logo:conn.ca_type?.slice(0,2).toUpperCase() }
                  const res = syncResult[conn.id]
                  const isActive = conn.status === 'active'
                  return (
                    <div key={conn.id}
style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 120px 140px',minWidth:650,
                        padding:'14px 20px', alignItems:'center',
                        borderBottom: i < connections.length-1 ? '0.5px solid var(--v2-border)' : 'none',
                        background:'var(--v2-surface)', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--v2-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background='var(--v2-surface)'}>

                      {/* CA name */}
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:34, height:34, borderRadius:7, background:def.color,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700, color:'#111111', flexShrink:0 }}>{def.logo}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{def.name}</div>
                          <div style={{ fontSize:11, color:'#888888', marginTop:1 }}>Certificate authority</div>
                        </div>
                      </div>

                      {/* Label */}
                      <div style={{ fontSize:13, color:'#333333' }}>{conn.label || '—'}</div>

                      {/* Cert count */}
                      <div style={{ fontSize:13, color:'#333333' }}>
                        {conn.cert_count !== undefined ? conn.cert_count : '—'}
                      </div>

                      {/* Status */}
                      <div>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                          fontSize:12, fontWeight:500, padding:'4px 10px', borderRadius:4,
                          background: isActive ? 'transparent' : 'rgba(31,92,78,0.09)',
                          color: isActive ? '#111111' : '#2e7a68',
                          border: `0.5px solid ${isActive ? 'rgba(31,92,78,0.2)' : 'rgba(0,0,0,0.1)'}` }}>
                          <span style={{ width:6, height:6, borderRadius:'50%',
                            background: isActive ? '#111111' : '#1f5c4e' }}/>
                          {isActive ? 'Connected' : 'Error'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button className="v2-btn v2-btn-sm" onClick={() => doSync(conn.id)}
                          disabled={syncing===conn.id}
                          style={{ padding:'5px 10px', fontSize:12 }}>
                          {syncing===conn.id
                            ? <><RefreshCw size={12} className="spin"/> Syncing</>
                            : <><RefreshCw size={12}/> Sync</>}
                        </button>
                        <button onClick={() => setDelConn(conn.id)} title="Remove"
                          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
                            background:'none', border:'0.5px solid #fecaca', borderRadius:5, cursor:'pointer',
                            color:'#1f5c4e', flexShrink:0 }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(31,92,78,0.09)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='none' }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
                {Object.entries(syncResult).filter(([,r]) => r).map(([id, r]) => (
                  <div key={id} style={{ padding:'10px 20px', borderTop:'0.5px solid var(--v2-border)',
                    background: r.ok ? 'transparent' : 'rgba(31,92,78,0.09)', display:'flex', alignItems:'center', gap:8 }}>
                    {r.ok
                      ? <Check size={13} style={{ color:'#111111' }}/>
                      : <AlertCircle size={13} style={{ color:'#1f5c4e' }}/>}
                    <span style={{ fontSize:12, color: r.ok ? '#111111' : '#1f5c4e' }}>
                      {r.ok ? `Sync complete — ${r.imported || 0} certificates imported` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showAdd && (
              <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex',
                alignItems:'center', justifyContent:'center', padding:20,
                background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}>
                <div style={{ background:'rgba(0,0,0,0.02)', borderRadius:14, width:'100%', maxWidth:480,
                  boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid var(--v2-border)' }}>
                  <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontSize:15, fontWeight:500 }}>Connect a CA</div>
                    <button onClick={() => { setShowAdd(false); setAddCa(null) }} style={{ background:'none',
                      border:'0.5px solid var(--v2-border)', borderRadius:6, cursor:'pointer',
                      color:'#888888', padding:'4px 6px' }}><X size={14}/></button>
                  </div>
                  <div style={{ padding:'18px 22px 22px' }}>
                    {!addCa ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <div style={{ fontSize:12, color:'#333333', marginBottom:4, lineHeight:1.6 }}>
                          Choose a CA. SSLVault pulls your existing certificates for monitoring.
                          <strong style={{ color:'#111111' }}> No private keys needed.</strong>
                        </div>
                        {Object.entries(CA_DEFS).map(([key, def]) => (
                          <div key={key} onClick={() => openAdd(key)}
                            style={{ padding:'14px 16px', borderRadius:10, border:'0.5px solid var(--v2-border)',
                              background:'rgba(0,0,0,0.02)', cursor:'pointer', display:'flex',
                              alignItems:'center', gap:12, transition:'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor=def.color; e.currentTarget.style.background=def.bg }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--v2-border)'; e.currentTarget.style.background='var(--v2-bg)' }}>
                            <div style={{ width:36, height:36, borderRadius:8, background:def.bg, border:`0.5px solid ${def.border}`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontWeight:700, fontSize:12, color:def.color, flexShrink:0 }}>{def.logo}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{def.name}</div>
                              <div style={{ fontSize:11, color:'#888888', marginTop:2 }}>{def.desc}</div>
                            </div>
                            <ChevronRight size={14} style={{ color:'#888888' }}/>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16,
                          padding:'10px 12px', borderRadius:8, background:'var(--v2-surface-3)',
                          border:'0.5px solid var(--v2-border)' }}>
                          <div style={{ width:30, height:30, borderRadius:7, background:CA_DEFS[addCa].bg,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight:700, fontSize:11, color:CA_DEFS[addCa].color, flexShrink:0 }}>
                            {CA_DEFS[addCa].logo}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{CA_DEFS[addCa].name}</div>
                          </div>
                          {CA_DEFS[addCa].docs && (
                            <a href={CA_DEFS[addCa].docs} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:11, color:'#888888', display:'flex', alignItems:'center', gap:3 }}>
                              Docs <ExternalLink size={11}/>
                            </a>
                          )}
                        </div>
                        <div style={{ background:'var(--v2-surface-3)', borderRadius:8, padding:'10px 12px',
                          marginBottom:16, display:'flex', gap:8, alignItems:'flex-start' }}>
                          <Info size={13} style={{ color:'#888888', flexShrink:0, marginTop:1 }}/>
                          <div style={{ fontSize:11, color:'#333333', lineHeight:1.6 }}>
                            SSLVault reads certificate details only — expiry, domain, issuer, SANs. Private keys stay on your servers.
                          </div>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <label className="v2-section-label" style={{ display:'block', marginBottom:5 }}>Label</label>
                          <input className="v2-input" value={addLabel}
                            onChange={e => setAddLabel(e.target.value)} placeholder="e.g. Production DigiCert"/>
                        </div>
                        {CA_DEFS[addCa].fields.map(f => (
                          <div key={f.key} style={{ marginBottom:12 }}>
                            <label className="v2-section-label" style={{ display:'block', marginBottom:5 }}>
                              {f.label}{f.required ? ' *' : ''}
                            </label>
                            <div style={{ position:'relative' }}>
                              <input className="v2-input"
                                type={f.type==='password' && !showPwd[f.key] ? 'password' : 'text'}
                                value={addFields[f.key] || ''}
                                onChange={e => setAddFields(p => ({ ...p, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                style={f.type==='password' ? { paddingRight:36 } : {}}/>
                              {f.type==='password' && (
                                <button type="button" onClick={() => setShowPwd(p => ({ ...p, [f.key]: !p[f.key] }))}
                                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                                    background:'none', border:'none', cursor:'pointer', color:'#888888' }}>
                                  {showPwd[f.key] ? <EyeOff size={13}/> : <Eye size={13}/>}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {addError && (
                          <div style={{ background:'rgba(31,92,78,0.09)', border:'0.5px solid #fecaca', borderRadius:7,
                            padding:'9px 12px', marginBottom:12, fontSize:12, color:'#1f5c4e',
                            display:'flex', gap:7, alignItems:'flex-start' }}>
                            <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{addError}
                          </div>
                        )}
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="v2-btn" onClick={() => setAddCa(null)}>Back</button>
                          <button className="v2-btn v2-btn-primary" style={{ flex:1, justifyContent:'center' }}
                            onClick={saveConnection} disabled={addSaving}>
                            {addSaving
                              ? <><RefreshCw size={12} style={{ animation:'v2-spin .8s linear infinite' }}/> Connecting…</>
                              : <><Check size={12}/> Connect &amp; sync</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PEM import modal ── */}
            {showImport && (
              <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex',
                alignItems:'center', justifyContent:'center', padding:20,
                background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}>
                <div style={{ background:'rgba(0,0,0,0.02)', borderRadius:14, width:'100%', maxWidth:480,
                  boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid var(--v2-border)' }}>
                  <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:500 }}>Import certificate</div>
                      <div style={{ fontSize:11, color:'#888888', marginTop:2 }}>
                        Paste cert PEM — domain, expiry &amp; issuer extracted automatically
                      </div>
                    </div>
                    <button onClick={() => setShowImport(false)} style={{ background:'none',
                      border:'0.5px solid var(--v2-border)', borderRadius:6, cursor:'pointer',
                      color:'#888888', padding:'4px 6px' }}><X size={14}/></button>
                  </div>
                  <div style={{ padding:'18px 22px 22px' }}>
                    {!importResult ? (
                      <>
                        <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                          borderRadius:8, padding:'10px 12px', marginBottom:14,
                          display:'flex', gap:8, alignItems:'flex-start' }}>
                          <Info size={13} style={{ color:'#888888', flexShrink:0, marginTop:1 }}/>
                          <div style={{ fontSize:12, color:'#333333', lineHeight:1.6 }}>
                            <strong>Only the certificate PEM is needed</strong> for tracking. Private key not required.
                          </div>
                        </div>
                        <div style={{ marginBottom:16 }}>
                          <label className="v2-section-label" style={{ display:'block', marginBottom:6 }}>Certificate PEM *</label>
                          <textarea className="v2-input" rows={8}
                            placeholder={'-----BEGIN CERTIFICATE-----\nMIIFaz...\n-----END CERTIFICATE-----'}
                            value={pemText} onChange={e => setPemText(e.target.value)}
                            style={{ fontFamily:'monospace', fontSize:11, resize:'vertical' }}/>
                        </div>
                        <button className="v2-btn v2-btn-primary" style={{ width:'100%', justifyContent:'center' }}
                          onClick={doImport} disabled={importing || !pemText.trim()}>
                          {importing
                            ? <><RefreshCw size={13} style={{ animation:'v2-spin .8s linear infinite' }}/> Parsing…</>
                            : <><FileText size={13}/> Import certificate</>}
                        </button>
                      </>
                    ) : importResult.ok ? (
                      <div style={{ textAlign:'center', padding:'10px 0' }}>
                        <div style={{ width:48, height:48, borderRadius:'50%', background:'transparent',
                          border:'1.5px solid rgba(31,92,78,0.2)', display:'flex', alignItems:'center',
                          justifyContent:'center', margin:'0 auto 14px' }}>
                          <Check size={20} style={{ color:'#16a068' }}/>
                        </div>
                        <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Certificate imported</div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="v2-btn" style={{ flex:1, justifyContent:'center' }}
                            onClick={() => { setPemText(''); setImportResult(null) }}>Import another</button>
                          <button className="v2-btn v2-btn-primary" style={{ flex:1, justifyContent:'center' }}
                            onClick={() => setShowImport(false)}>Done</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', padding:'10px 0' }}>
                        <AlertTriangle size={32} style={{ color:'#1f5c4e', margin:'0 auto 12px', display:'block' }}/>
                        <div style={{ fontSize:13, color:'#1f5c4e', marginBottom:16 }}>{importResult.error}</div>
                        <button className="v2-btn" onClick={() => setImportResult(null)}>Try again</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Delete connection modal ── */}
            {delConn && (() => {
              const conn = connections.find(c => c.id === delConn)
              const connCertCount = conn?.cert_count || 0
              return (
                <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex',
                  alignItems:'center', justifyContent:'center', padding:20,
                  background:'rgba(15,23,42,0.5)', backdropFilter:'blur(4px)' }}>
                  <div style={{ background:'rgba(0,0,0,0.02)', borderRadius:14, width:'100%', maxWidth:400,
                    padding:'24px', boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'0.5px solid var(--v2-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:'rgba(31,92,78,0.09)',
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Trash2 size={15} color="#1f5c4e"/>
                      </div>
                      <div style={{ fontSize:15, fontWeight:600 }}>Remove {conn?.label || 'connection'}?</div>
                    </div>
                    <div style={{ fontSize:13, color:'#333333', marginBottom:16, lineHeight:1.6 }}>
                      This CA connection will be disconnected and will no longer sync.
                      {connCertCount > 0 && <span style={{ color:'#111111', fontWeight:500 }}> {connCertCount} certificate{connCertCount!==1?'s':''} are linked.</span>}
                    </div>
                    {connCertCount > 0 && (
                      <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                        padding:'10px 12px', borderRadius:8, marginBottom:16,
                        background: delCerts ? 'rgba(31,92,78,0.09)' : 'var(--v2-surface-3)',
                        border: `0.5px solid ${delCerts ? 'rgba(0,0,0,0.1)' : 'var(--v2-border)'}`,
                        transition:'all .15s' }}>
                        <input type="checkbox" checked={delCerts} onChange={e => setDelCerts(e.target.checked)}
                          style={{ width:14, height:14, accentColor:'#1f5c4e', flexShrink:0 }}/>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color: delCerts ? '#1f5c4e' : 'var(--v2-text)' }}>
                            Also delete {connCertCount} imported certificate{connCertCount!==1?'s':''}
                          </div>
                          <div style={{ fontSize:11, color:'#888888', marginTop:1 }}>
                            {delCerts ? 'Certificates will be removed from inventory' : 'Certificates remain but stop syncing'}
                          </div>
                        </div>
                      </label>
                    )}
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="v2-btn" style={{ flex:1, justifyContent:'center' }}
                        onClick={() => { setDelConn(null); setDelCerts(true) }}>Cancel</button>
                      <button onClick={() => deleteConn(delConn)}
                        style={{ flex:1, background:'#1f5c4e', color:'#111111', border:'none',
                          borderRadius:8, padding:'9px', cursor:'pointer', fontFamily:'inherit',
                          fontWeight:600, fontSize:13, display:'flex', alignItems:'center',
                          justifyContent:'center', gap:6 }}>
                        <Trash2 size={13}/>
                        {delCerts && connCertCount > 0 ? `Remove + delete ${connCertCount} certs` : 'Remove connection'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

      </div>

      <style>{`
        .spin { animation: v2-spin 0.8s linear infinite; }
        @keyframes v2-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      
        @media(max-width:min(767px,100%)){
          [class*="-hero"]{padding:20px 14px!important}
          [class*="-tabs"]{padding:0 10px!important;overflow-x:auto!important}
        }`}</style>
    </div>
  )
}
