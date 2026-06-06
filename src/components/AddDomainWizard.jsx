// AddDomainWizard.jsx — redesigned to match Domain Manager aesthetic
// Logic unchanged: Domain → DNS → Server → Done
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Copy, ArrowRight, ArrowLeft, Server, Globe, RefreshCw, Terminal, Wifi, Shield } from 'lucide-react'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://frthcwkntciaakqsppss.supabase.co'

async function callFn(name, body, token) {
  const r = await fetch(`${SB_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

function isValidDomain(v) {
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v.trim())
}

const DNS_PROVIDERS = [
  { id: 'cloudflare',   label: 'Cloudflare',      field1: 'API Token',             ph1: 'Cloudflare API Token' },
  { id: 'route53',      label: 'Route 53',         field1: 'Access Key ID',         ph1: 'AKIA…',              field2: 'Secret Access Key', ph2: 'Secret…' },
  { id: 'godaddy',      label: 'GoDaddy',          field1: 'API Key',               ph1: 'GoDaddy API Key' },
  { id: 'namecheap',    label: 'Namecheap',        field1: 'API Username',          ph1: 'your-username',      field2: 'API Key', ph2: 'Namecheap API Key' },
  { id: 'digitalocean', label: 'DigitalOcean',     field1: 'Personal Access Token', ph1: 'dop_v1_…' },
  { id: 'other',        label: 'Other / Manual',   field1: null },
]

// ── Design tokens ─────────────────────────────────────────────────────
const F    = "'DM Sans','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"

const S = {
  input: {
    width: '100%', padding: '11px 14px', fontSize: 13, fontFamily: F,
    borderRadius: 9, background: '#f8fafd', border: '1.5px solid rgba(0,119,182,0.15)',
    color: '#0d1117', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: '#7a8694', marginBottom: 6,
  },
  btnPri: {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px',
    fontSize: 13, fontWeight: 700, fontFamily: F, borderRadius: 9,
    background: '#0077b6', color: '#fff', border: 'none', cursor: 'pointer',
    transition: 'all .15s', boxShadow: '0 4px 12px rgba(0,119,182,0.3)',
  },
  btnSec: {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px',
    fontSize: 13, fontWeight: 600, fontFamily: F, borderRadius: 9,
    background: '#ffffff', color: '#3d4a58', border: '1.5px solid rgba(0,119,182,0.2)',
    cursor: 'pointer', transition: 'all .15s',
  },
  btnDis: {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px',
    fontSize: 13, fontWeight: 700, fontFamily: F, borderRadius: 9,
    background: 'rgba(0,119,182,0.15)', color: 'rgba(0,119,182,0.4)',
    border: 'none', cursor: 'not-allowed',
  },
  card: {
    background: '#ffffff', border: '1px solid rgba(0,119,182,0.12)',
    borderRadius: 16, boxShadow: '0 8px 32px rgba(0,119,182,0.12)',
    overflow: 'hidden',
  },
  err:    { fontSize: 12, color: '#b03425', marginTop: 6, fontWeight: 500 },
  mono:   { fontFamily: MONO },
  sep:    { height: 1, background: 'rgba(0,119,182,0.08)', margin: '18px 0' },
  codeBox: {
    background: '#f0f7ff', border: '1px solid rgba(0,119,182,0.15)', borderRadius: 9,
    padding: '12px 44px 12px 14px', fontFamily: MONO, fontSize: 11, color: '#005a8b',
    wordBreak: 'break-all', position: 'relative', lineHeight: 1.7, marginTop: 6,
  },
  cmdBox: {
    background: '#f8fafd', border: '1px solid rgba(0,119,182,0.12)', borderRadius: 9,
    padding: '12px 44px 12px 14px', fontFamily: MONO, fontSize: 11, color: '#0d1117',
    wordBreak: 'break-all', position: 'relative', lineHeight: 1.7, marginTop: 6,
  },
}

// ── Copy button ───────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1600) }}
      style={{ position: 'absolute', top: 9, right: 9, background: done ? 'rgba(0,165,80,0.1)' : 'rgba(0,119,182,0.08)', border: `1px solid ${done ? 'rgba(0,165,80,0.25)' : 'rgba(0,119,182,0.2)'}`, borderRadius: 6, cursor: 'pointer', color: done ? '#00a550' : '#0077b6', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s', fontSize: 10, fontWeight: 600, fontFamily: F }}>
      {done ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  )
}

// ── Step indicator ────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Domain', 'DNS', 'Server', 'Done']
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px', paddingBottom: 20, gap: 0 }}>
      {steps.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, fontFamily: F, transition: 'all .25s',
                background: done ? '#00a550' : active ? '#0077b6' : 'rgba(0,119,182,0.08)',
                color: done || active ? '#fff' : '#7a8694',
                boxShadow: active ? '0 0 0 4px rgba(0,119,182,0.15)' : done ? '0 0 0 3px rgba(0,165,80,0.15)' : 'none',
              }}>
                {done ? <Check size={12}/> : n}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: '0.04em', color: active ? '#0077b6' : done ? '#00a550' : '#7a8694', textTransform: 'uppercase', transition: 'color .2s' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'rgba(0,165,80,0.3)' : 'rgba(0,119,182,0.1)', margin: '0 10px', borderRadius: 1, transition: 'background .3s' }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shared section title ──────────────────────────────────────────────
function StepHead({ icon: Icon, title, sub, domain }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,119,182,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color="#0077b6" strokeWidth={1.8}/>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0d1117', letterSpacing: '-0.2px' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: '#7a8694', marginTop: 1, lineHeight: 1.5 }}>{sub}</div>}
        </div>
      </div>
      {domain && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,119,182,0.06)', border: '1px solid rgba(0,119,182,0.15)', borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0077b6', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11, fontFamily: MONO, color: '#0077b6', fontWeight: 600 }}>{domain}</span>
        </div>
      )}
    </div>
  )
}

// ── Step 1: Domain ────────────────────────────────────────────────────
function StepDomain({ data, onChange, onNext }) {
  const [err, setErr] = useState('')
  function submit() {
    if (!isValidDomain(data.domain)) { setErr('Please enter a valid domain (e.g. yourdomain.com)'); return }
    setErr(''); onNext()
  }
  return (
    <div>
      <StepHead icon={Globe} title="Add a domain" sub="Enter the domain you want to manage and protect with SSL"/>
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>Domain name</label>
        <input type="text" value={data.domain} onChange={e => { onChange({ domain: e.target.value }); setErr('') }}
          placeholder="yourdomain.com" autoComplete="off"
          style={{ ...S.input, ...(err ? { borderColor: '#b03425', background: 'rgba(192,57,43,0.04)' } : {}) }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
          onBlur={e => { e.target.style.borderColor = err ? '#b03425' : 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
        {err && <div style={S.err}>{err}</div>}
      </div>
      <div>
        <label style={S.label}>Certificate type</label>
        <select value={data.certType} onChange={e => onChange({ certType: e.target.value })}
          style={{ ...S.input, appearance: 'none', cursor: 'pointer' }}
          onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}>
          <option value="single">Single domain — domain.com</option>
          <option value="wildcard">Wildcard — *.domain.com (all subdomains)</option>
          <option value="multi">Multi-domain (SAN) — up to 250 SANs</option>
        </select>
      </div>
    </div>
  )
}

// ── Step 2: DNS ───────────────────────────────────────────────────────
function StepDNS({ data, onChange, onNext, onBack }) {
  const [err, setErr] = useState('')
  const selected = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)

  function submit() {
    if (!data.dnsProvider) { setErr('Please select a DNS provider'); return }
    setErr(''); onNext()
  }

  return (
    <div>
      <StepHead icon={Wifi} title="DNS provider" sub="Used for automatic DNS-01 validation — SSLVault creates the TXT record for you" domain={data.domain}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 4 }}>
        {DNS_PROVIDERS.map(p => (
          <button key={p.id} onClick={() => { onChange({ dnsProvider: p.id, dnsKey1: '', dnsKey2: '' }); setErr('') }}
            style={{
              padding: '11px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              fontSize: 12, fontWeight: 600, fontFamily: F, transition: 'all .15s',
              background: data.dnsProvider === p.id ? 'rgba(0,119,182,0.08)' : '#f8fafd',
              border: data.dnsProvider === p.id ? '1.5px solid #0077b6' : '1.5px solid rgba(0,119,182,0.12)',
              color: data.dnsProvider === p.id ? '#0077b6' : '#3d4a58',
              boxShadow: data.dnsProvider === p.id ? '0 0 0 3px rgba(0,119,182,0.1)' : 'none',
            }}>
            {p.label}
          </button>
        ))}
      </div>
      {err && <div style={S.err}>{err}</div>}

      {selected && selected.field1 && (
        <div style={{ marginTop: 18 }}>
          <div style={S.sep}/>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{selected.field1}</label>
            <input type="text" value={data.dnsKey1} onChange={e => onChange({ dnsKey1: e.target.value })}
              placeholder={selected.ph1} autoComplete="off" style={S.input}
              onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
          </div>
          {selected.field2 && (
            <div>
              <label style={S.label}>{selected.field2}</label>
              <input type="text" value={data.dnsKey2} onChange={e => onChange({ dnsKey2: e.target.value })}
                placeholder={selected.ph2} autoComplete="off" style={S.input}
                onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
            </div>
          )}
        </div>
      )}
      {selected && !selected.field1 && (
        <div style={{ marginTop: 14, background: 'rgba(0,119,182,0.04)', border: '1px solid rgba(0,119,182,0.15)', borderRadius: 9, padding: '12px 14px', fontSize: 12, color: '#3d4a58', lineHeight: 1.7 }}>
          <strong style={{ color: '#0077b6' }}>Manual DNS</strong> — SSLVault will show you a TXT record to add at your registrar after setup.
        </div>
      )}
    </div>
  )
}

// ── Step 3: Server ────────────────────────────────────────────────────
function StepServer({ data, onChange, onNext, onBack, user, installCmd }) {
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const infraSelected = (val) => data.serverType === val

  async function submit() {
    if (!data.serverType) { setErr('Please select your server type'); return }
    setSaveErr(''); setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (data.dnsProvider && data.dnsProvider !== 'other' && data.dnsKey1) {
        const creds = { api_key: data.dnsKey1 }
        if (data.dnsKey2) creds.api_secret = data.dnsKey2
        await callFn('dns-provider', { action: 'save', user_id: user?.id, provider: data.dnsProvider, label: data.dnsProvider + ' — ' + data.domain, domain_pattern: data.domain, credentials: creds }, token)
      }
      if (data.serverType === 'hosting') {
        if (data.cpUrl && data.cpUser) {
          await supabase.from('server_credentials').insert({ user_id: user?.id, server_type: 'cpanel', host: data.cpUrl, port: parseInt(data.cpPort) || 2083, username: data.cpUser, nickname: data.cpUser + '@' + (data.cpUrl.replace(/^https?:\/\//, '').split(':')[0]), domains: [data.domain], auto_install_enabled: true })
        }
        onNext(); return
      }
      onNext()
    } catch (e) { setSaveErr(e?.message || 'Failed to save. Please try again.') }
    setSaving(false)
  }

  const isVps = data.serverType === 'vps'
  const tokenReady = isVps && !installCmd.loading && installCmd.token

  return (
    <div>
      <StepHead icon={Server} title="Server infrastructure" sub={<>Where is <strong style={{ color: '#0077b6' }}>{data.domain}</strong> hosted?</>}/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
        {[
          { val: 'hosting', icon: Server, title: 'Shared hosting', sub: 'cPanel · Plesk · DirectAdmin' },
          { val: 'vps',     icon: Terminal, title: 'VPS / Cloud',  sub: 'Ubuntu · Debian · CentOS' },
        ].map(({ val, icon: Icon, title, sub }) => (
          <div key={val} onClick={() => { onChange({ serverType: val }); setErr('') }}
            style={{ padding: '18px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .18s',
              background: infraSelected(val) ? 'rgba(0,119,182,0.06)' : '#f8fafd',
              border: infraSelected(val) ? '1.5px solid #0077b6' : '1.5px solid rgba(0,119,182,0.12)',
              boxShadow: infraSelected(val) ? '0 0 0 3px rgba(0,119,182,0.1)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: infraSelected(val) ? 'rgba(0,119,182,0.12)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={18} color={infraSelected(val) ? '#0077b6' : '#7a8694'} strokeWidth={1.8}/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: infraSelected(val) ? '#0077b6' : '#0d1117', marginBottom: 3 }}>{title}</div>
            <div style={{ fontSize: 11, color: '#7a8694' }}>{sub}</div>
          </div>
        ))}
      </div>
      {err && <div style={S.err}>{err}</div>}
      {saveErr && <div style={{ ...S.err, marginTop: 8 }}>{saveErr}</div>}

      {/* cPanel fields */}
      {data.serverType === 'hosting' && (
        <div>
          <div style={S.sep}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={S.label}>cPanel URL</label>
              <input type="text" value={data.cpUrl} onChange={e => onChange({ cpUrl: e.target.value })}
                placeholder="https://cp.yourdomain.com:2083" style={S.input}
                onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
            </div>
            <div>
              <label style={S.label}>Port</label>
              <input type="text" value={data.cpPort} onChange={e => onChange({ cpPort: e.target.value })}
                placeholder="2083" style={S.input}
                onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>cPanel username</label>
            <input type="text" value={data.cpUser} onChange={e => onChange({ cpUser: e.target.value })}
              placeholder="your cPanel username" autoComplete="off" style={S.input}
              onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
          </div>
          <div>
            <label style={S.label}>API token</label>
            <input type="text" value={data.cpToken} onChange={e => onChange({ cpToken: e.target.value })}
              placeholder="Generated from cPanel → Manage API Tokens" autoComplete="off" style={S.input}
              onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,119,182,0.15)'; e.target.style.boxShadow = 'none' }}/>
          </div>
        </div>
      )}

      {/* VPS install */}
      {data.serverType === 'vps' && (
        <div>
          <div style={S.sep}/>
          {installCmd.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#7a8694', fontSize: 12, fontFamily: F }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,119,182,0.2)', borderTopColor: '#0077b6', animation: 'spin .7s linear infinite', flexShrink: 0 }}/>
              Generating your secure agent install token…
            </div>
          ) : installCmd.error ? (
            <div style={{ ...S.err, padding: '12px 0' }}>{installCmd.error}</div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Agent install token</label>
                <div style={S.codeBox}>{installCmd.token}<CopyButton text={installCmd.token}/></div>
              </div>
              <div>
                <label style={S.label}>Install command — paste into your server as root</label>
                <div style={S.cmdBox}>{installCmd.cmd}<CopyButton text={installCmd.cmd}/></div>
              </div>
              <div style={{ marginTop: 12, background: 'rgba(0,165,80,0.05)', border: '1px solid rgba(0,165,80,0.18)', borderRadius: 9, padding: '10px 14px', fontSize: 11, color: '#3d4a58', lineHeight: 1.7 }}>
                <span style={{ color: '#00a550', fontWeight: 700 }}>✓</span> The agent connects back automatically. No server credentials needed — it registers itself once installed.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 4: Done ──────────────────────────────────────────────────────
function StepDone({ data, onClose, nav }) {
  const dnsLabel = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)?.label || data.dnsProvider
  const certLabel = { single: 'Single domain', wildcard: 'Wildcard', multi: 'Multi-domain (SAN)' }[data.certType]

  const isVps = data.serverType === 'vps'
  return (
    <div>
      {/* Success icon */}
      <div style={{ textAlign: 'center', paddingBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,165,80,0.08)', border: '2px solid rgba(0,165,80,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 6px rgba(0,165,80,0.06)' }}>
          <Check size={26} color="#00a550" strokeWidth={2.5}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0d1117', marginBottom: 6, letterSpacing: '-0.3px' }}>
          {isVps ? 'Server connected!' : 'Domain added successfully'}
        </div>
        <div style={{ fontSize: 13, color: '#7a8694', lineHeight: 1.65, maxWidth: 340, margin: '0 auto' }}>
          {isVps
            ? <><strong style={{ color: '#0077b6' }}>{data.domain}</strong> is linked to your VPS. SSL will be issued and installed automatically.</>
            : <><strong style={{ color: '#0077b6' }}>{data.domain}</strong> is connected via cPanel auto-install.</>}
        </div>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: isVps ? 'Agent registered' : 'cPanel connected', color: '#00a550', bg: 'rgba(0,165,80,0.08)', border: 'rgba(0,165,80,0.22)' },
          { label: 'Auto-renew on', color: '#00a550', bg: 'rgba(0,165,80,0.08)', border: 'rgba(0,165,80,0.22)' },
          { label: dnsLabel + ' DNS', color: '#0077b6', bg: 'rgba(0,119,182,0.07)', border: 'rgba(0,119,182,0.2)' },
        ].map(chip => (
          <span key={chip.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, fontFamily: F }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: chip.color, display: 'inline-block' }}></span>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Summary rows */}
      <div style={{ background: '#f8fafd', border: '1px solid rgba(0,119,182,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        {[
          ['Domain',       data.domain],
          ['Certificate',  certLabel],
          ['DNS provider', dnsLabel],
          ['Server',       isVps ? 'VPS / Cloud server' : 'Shared hosting / cPanel'],
          ...(data.cpUrl ? [['cPanel host', data.cpUrl]] : []),
        ].map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,119,182,0.07)' : 'none' }}>
            <span style={{ fontSize: 11, color: '#7a8694', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</span>
            <span style={{ fontSize: 12, color: '#0d1117', fontWeight: 600, fontFamily: MONO, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══ MAIN WIZARD ════════════════════════════════════════════════════════
export default function AddDomainWizard({ user, onClose, nav }) {
  const [step, setStep] = useState(1)
  const [installCmd, setInstallCmd] = useState({ loading: false, token: '', cmd: '', error: '' })
  const fetchedRef = useRef(false)

  const [data, setData] = useState({
    domain: '', certType: 'single',
    dnsProvider: '', dnsKey1: '', dnsKey2: '',
    serverType: '', cpUrl: '', cpPort: '2083', cpUser: '', cpToken: '',
  })

  const update = (patch) => setData(prev => ({ ...prev, ...patch }))

  useEffect(() => {
    if (data.serverType !== 'vps') return
    if (fetchedRef.current) return
    fetchedRef.current = true
    let cancelled = false
    setInstallCmd({ loading: true, token: '', cmd: '', error: '' })
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await callFn('agent-daemon', { action: 'create_install_command', user_id: user?.id, nickname: data.domain || 'My Server' }, session?.access_token)
        if (cancelled) return
        if (res.ok && res.command) {
          const match = res.command.match(/--token\s+(\S+)/)
          setInstallCmd({ loading: false, token: match ? match[1] : '', cmd: res.command, error: '' })
        } else {
          setInstallCmd({ loading: false, token: '', cmd: '', error: res.error || 'Failed to generate token' })
        }
      } catch (e) {
        if (!cancelled) setInstallCmd({ loading: false, token: '', cmd: '', error: String(e?.message || e) })
      }
    })()
    return () => { cancelled = true }
  }, [data.serverType])

  const handleChange = (patch) => {
    if (patch.serverType && patch.serverType !== 'vps') fetchedRef.current = false
    update(patch)
  }

  const tokenReady = data.serverType === 'vps' && !installCmd.loading && !!installCmd.token
  const [saving, setSaving] = useState(false)

  async function handleSubmitStep3() {
    if (!data.serverType) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (data.dnsProvider && data.dnsProvider !== 'other' && data.dnsKey1) {
        const creds = { api_key: data.dnsKey1 }
        if (data.dnsKey2) creds.api_secret = data.dnsKey2
        await callFn('dns-provider', { action: 'save', user_id: user?.id, provider: data.dnsProvider, label: data.dnsProvider + ' — ' + data.domain, domain_pattern: data.domain, credentials: creds }, token)
      }
      if (data.serverType === 'hosting' && data.cpUrl && data.cpUser) {
        await supabase.from('server_credentials').insert({ user_id: user?.id, server_type: 'cpanel', host: data.cpUrl, port: parseInt(data.cpPort) || 2083, username: data.cpUser, nickname: data.cpUser + '@' + (data.cpUrl.replace(/^https?:\/\//, '').split(':')[0]), domains: [data.domain], auto_install_enabled: true })
      }
    } catch (e) { console.error(e) }
    setSaving(false)
    setStep(4)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,17,23,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', position: 'relative', fontFamily: F }}>

        {/* Modal card */}
        <div style={S.card}>

          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,119,182,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={14} color="#0077b6" strokeWidth={2}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0d1117', letterSpacing: '-0.1px' }}>Domain Manager — Add domain</div>
                {data.domain && step > 1 && (
                  <div style={{ fontSize: 11, color: '#0077b6', fontFamily: MONO, marginTop: 1 }}>{data.domain}</div>
                )}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,119,182,0.15)', background: '#f8fafd', cursor: 'pointer', color: '#7a8694', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.06)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.25)'; e.currentTarget.style.color = '#b03425' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafd'; e.currentTarget.style.borderColor = 'rgba(0,119,182,0.15)'; e.currentTarget.style.color = '#7a8694' }}>
              <X size={13}/>
            </button>
          </div>

          {/* Step bar */}
          <div style={{ padding: '20px 28px 0' }}>
            <StepBar step={step}/>
          </div>

          {/* Step content */}
          <div style={{ padding: '4px 28px 0' }}>
            {step === 1 && <StepDomain data={data} onChange={update} onNext={() => setStep(2)}/>}
            {step === 2 && <StepDNS data={data} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)}/>}
            {step === 3 && <StepServer data={data} onChange={handleChange} onNext={() => setStep(4)} onBack={() => setStep(2)} user={user} installCmd={installCmd}/>}
            {step === 4 && <StepDone data={data} onClose={onClose} nav={nav}/>}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: step === 1 || step === 4 ? 'flex-end' : 'space-between', alignItems: 'center', padding: '20px 28px 24px', borderTop: '1px solid rgba(0,119,182,0.08)', marginTop: 20 }}>

            {step === 1 && (
              <button style={S.btnPri}
                onClick={() => {
                  if (!isValidDomain(data.domain)) return
                  setStep(2)
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0077b6'; e.currentTarget.style.transform = 'translateY(0)' }}>
                Continue <ArrowRight size={14}/>
              </button>
            )}

            {step === 2 && (
              <>
                <button style={S.btnSec} onClick={() => setStep(1)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,119,182,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                  <ArrowLeft size={13}/> Back
                </button>
                <button style={S.btnPri}
                  onClick={() => { if (data.dnsProvider) setStep(3) }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0077b6'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  Continue <ArrowRight size={14}/>
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button style={S.btnSec} onClick={() => setStep(2)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,119,182,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                  <ArrowLeft size={13}/> Back
                </button>
                <button
                  style={(!data.serverType || saving || (data.serverType === 'vps' && !tokenReady)) ? S.btnDis : S.btnPri}
                  disabled={!data.serverType || saving || (data.serverType === 'vps' && !tokenReady)}
                  onClick={handleSubmitStep3}
                  onMouseEnter={e => { if (data.serverType && !saving) { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { if (data.serverType && !saving) { e.currentTarget.style.background = '#0077b6'; e.currentTarget.style.transform = 'translateY(0)' } }}>
                  {saving
                    ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }}/> Saving…</>
                    : data.serverType === 'vps'
                      ? <><Check size={13}/> Agent installed — done</>
                      : <>Save &amp; continue <ArrowRight size={13}/></>}
                </button>
              </>
            )}

            {step === 4 && (
              <button style={S.btnPri}
                onClick={() => { onClose(); nav('/buy') }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0068a0'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0077b6'; e.currentTarget.style.transform = 'translateY(0)' }}>
                Issue certificate <ArrowRight size={14}/>
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
