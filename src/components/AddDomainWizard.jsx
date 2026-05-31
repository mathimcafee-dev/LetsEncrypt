// AddDomainWizard.jsx
// Step-by-step wizard: Domain → DNS provider → Server (cPanel or VPS) → Done
// Design v2 tokens — crimson #c0392b theme, Montserrat, dark glass surfaces
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Copy, ArrowRight, ArrowLeft, Server, Globe, RefreshCw, Terminal } from 'lucide-react'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://frthcwkntciaakqsppss.supabase.co'

// ── helpers ──────────────────────────────────────────────────────────────────
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

// ── DNS provider config ───────────────────────────────────────────────────────
const DNS_PROVIDERS = [
  { id: 'cloudflare',   label: 'Cloudflare',     field1: 'API Token',          ph1: 'Cloudflare API Token (starts with…)' },
  { id: 'route53',      label: 'Route 53',        field1: 'Access Key ID',      ph1: 'AKIA…',                             field2: 'Secret Access Key', ph2: 'Secret…' },
  { id: 'godaddy',      label: 'GoDaddy',         field1: 'API Key',            ph1: 'GoDaddy API Key' },
  { id: 'namecheap',    label: 'Namecheap',       field1: 'API Username',       ph1: 'your-username',                     field2: 'API Key',           ph2: 'Namecheap API Key' },
  { id: 'digitalocean', label: 'DigitalOcean',    field1: 'Personal Access Token', ph1: 'dop_v1_…' },
  { id: 'other',        label: 'Other / Manual',  field1: null },
]

// ── shared style tokens ───────────────────────────────────────────────────────
const S = {
  card:    { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 14, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
  input:   { width: '100%', padding: '10px 14px', fontSize: 13, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' },
  label:   { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b0a8a0', marginBottom: 6 },
  btnPri:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: '#c0392b', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background .15s', whiteSpace: 'nowrap' },
  btnSec:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: '#e8e0d8', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' },
  title:   { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.2px' },
  sub:     { fontSize: 12, color: '#b0a8a0', marginBottom: 20, lineHeight: 1.5 },
  err:     { fontSize: 11, color: '#f87171', marginTop: 5, fontWeight: 500 },
  mono:    { fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace' },
  sep:     { height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' },
  codeBox: { background: '#0d0000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '11px 40px 11px 12px', fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace', fontSize: 11, color: '#4ade80', wordBreak: 'break-all', position: 'relative', lineHeight: 1.6, marginTop: 4 },
  cmdBox:  { background: '#0d0000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '10px 40px 10px 12px', fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace', fontSize: 11, color: '#e8e0d8', wordBreak: 'break-all', position: 'relative', lineHeight: 1.6, marginTop: 4 },
}

// ── CopyButton ─────────────────────────────────────────────────────────────────
function CopyButton({ text, style = {} }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1600) }}
      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: done ? '#4ade80' : '#b0a8a0', padding: 2, display: 'flex', alignItems: 'center', transition: 'color .15s', ...style }}>
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Domain', 'DNS', 'Server', 'Done']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, transition: 'all .2s',
                background: done || active ? '#c0392b' : 'rgba(255,255,255,0.08)',
                color: done || active ? '#fff' : '#b0a8a0',
                border: done || active ? 'none' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: active ? '0 0 0 4px rgba(192,57,43,0.2)' : 'none',
              }}>
                {done ? <Check size={11} /> : n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: active ? '#ff8c7a' : '#b0a8a0' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'rgba(192,57,43,0.4)' : 'rgba(255,255,255,0.1)', margin: '0 8px', transition: 'background .3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Domain ─────────────────────────────────────────────────────────────
function StepDomain({ data, onChange, onNext }) {
  const [err, setErr] = useState('')
  function submit() {
    if (!isValidDomain(data.domain)) { setErr('Please enter a valid domain name (e.g. yourdomain.com)'); return }
    setErr('')
    onNext()
  }
  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>Add a domain</div>
        <div style={S.sub}>Enter the domain you want to manage and protect with SSL</div>

        <label style={S.label}>Domain name</label>
        <input
          type="text"
          value={data.domain}
          onChange={e => { onChange({ domain: e.target.value }); setErr('') }}
          placeholder="yourdomain.com"
          autoComplete="off"
          style={{ ...S.input, ...(err ? { borderColor: '#f87171' } : {}) }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onFocus={e => e.target.style.borderColor = '#c0392b'}
          onBlur={e => e.target.style.borderColor = err ? '#f87171' : 'rgba(255,255,255,0.15)'}
        />
        {err && <div style={S.err}>{err}</div>}

        <label style={{ ...S.label, marginTop: 16 }}>Certificate type</label>
        <select
          value={data.certType}
          onChange={e => onChange({ certType: e.target.value })}
          style={{ ...S.input, appearance: 'none' }}
          onFocus={e => e.target.style.borderColor = '#c0392b'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
        >
          <option value="single">Single domain — domain.com</option>
          <option value="wildcard">Wildcard — *.domain.com (covers all subdomains)</option>
          <option value="multi">Multi-domain (SAN) — up to 250 SANs</option>
        </select>
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={S.btnPri} onClick={submit} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: DNS ────────────────────────────────────────────────────────────────
function StepDNS({ data, onChange, onNext, onBack }) {
  const [err, setErr] = useState('')
  const selected = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)

  function submit() {
    if (!data.dnsProvider) { setErr('Please select a DNS provider'); return }
    setErr('')
    onNext()
  }

  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>DNS provider</div>
        <div style={S.sub}>Used for automatic DNS-01 domain validation — SSLVault will create the TXT record for you</div>

        {/* Provider grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: err && !data.dnsProvider ? 4 : 0 }}>
          {DNS_PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange({ dnsProvider: p.id, dnsKey1: '', dnsKey2: '' }); setErr('') }}
              style={{
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif',
                transition: 'all .15s',
                background: data.dnsProvider === p.id ? 'rgba(192,57,43,0.18)' : 'rgba(255,255,255,0.05)',
                border: data.dnsProvider === p.id ? '1px solid #c0392b' : '1px solid rgba(255,255,255,0.1)',
                color: data.dnsProvider === p.id ? '#ff8c7a' : '#b0a8a0',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {err && <div style={S.err}>{err}</div>}

        {/* API key fields — shown when provider is selected and has fields */}
        {selected && selected.field1 && (
          <div style={{ marginTop: 16 }}>
            <div style={S.sep} />
            <label style={S.label}>{selected.field1}</label>
            <input
              type="text"
              value={data.dnsKey1}
              onChange={e => onChange({ dnsKey1: e.target.value })}
              placeholder={selected.ph1}
              autoComplete="off"
              style={S.input}
              onFocus={e => e.target.style.borderColor = '#c0392b'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
            {selected.field2 && (
              <>
                <label style={{ ...S.label, marginTop: 12 }}>{selected.field2}</label>
                <input
                  type="text"
                  value={data.dnsKey2}
                  onChange={e => onChange({ dnsKey2: e.target.value })}
                  placeholder={selected.ph2}
                  autoComplete="off"
                  style={S.input}
                  onFocus={e => e.target.style.borderColor = '#c0392b'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </>
            )}
          </div>
        )}

        {selected && !selected.field1 && (
          <div style={{ marginTop: 14, background: 'rgba(192,57,43,0.08)', border: '0.5px solid rgba(192,57,43,0.25)', borderRadius: 7, padding: '10px 12px', fontSize: 12, color: '#e8e0d8', lineHeight: 1.6 }}>
            Manual DNS — after saving, SSLVault will show you the TXT record to add manually at your registrar.
          </div>
        )}
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button style={S.btnSec} onClick={onBack} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
          <ArrowLeft size={13} /> Back
        </button>
        <button style={S.btnPri} onClick={submit} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Server ──────────────────────────────────────────────────────────────
function StepServer({ data, onChange, onNext, onBack }) {
  const [err, setErr] = useState('')

  function submit() {
    if (!data.serverType) { setErr('Please select your server type'); return }
    setErr('')
    onNext()
  }

  const infraCardStyle = (val) => ({
    border: data.serverType === val ? '1px solid #c0392b' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all .15s',
    background: data.serverType === val ? 'rgba(192,57,43,0.14)' : 'rgba(255,255,255,0.05)',
  })

  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>Server infrastructure</div>
        <div style={S.sub}>Where is <strong style={{ color: '#ff8c7a', fontWeight: 600 }}>{data.domain}</strong> hosted? This determines how SSL is auto-installed</div>

        {/* Infra type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={infraCardStyle('hosting')} onClick={() => { onChange({ serverType: 'hosting' }); setErr('') }}>
            <div style={{ fontSize: 22, color: '#ff8c7a', marginBottom: 8 }}><Server size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Shared hosting</div>
            <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 2 }}>cPanel · Plesk · DirectAdmin</div>
          </div>
          <div style={infraCardStyle('vps')} onClick={() => { onChange({ serverType: 'vps' }); setErr('') }}>
            <div style={{ fontSize: 22, color: '#ff8c7a', marginBottom: 8 }}><Terminal size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>VPS / Cloud server</div>
            <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 2 }}>Ubuntu · Debian · CentOS</div>
          </div>
        </div>
        {err && <div style={S.err}>{err}</div>}

        {/* cPanel fields */}
        {data.serverType === 'hosting' && (
          <div style={{ marginTop: 4 }}>
            <div style={S.sep} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
              <div>
                <label style={S.label}>cPanel URL</label>
                <input type="text" value={data.cpUrl} onChange={e => onChange({ cpUrl: e.target.value })} placeholder="https://cp.yourdomain.com:2083" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
              <div>
                <label style={S.label}>Port</label>
                <input type="text" value={data.cpPort} onChange={e => onChange({ cpPort: e.target.value })} placeholder="2083" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
            </div>
            <label style={{ ...S.label, marginTop: 12 }}>cPanel username</label>
            <input type="text" value={data.cpUser} onChange={e => onChange({ cpUser: e.target.value })} placeholder="your cPanel username" autoComplete="off" style={S.input}
              onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
            <label style={{ ...S.label, marginTop: 12 }}>API token</label>
            <input type="text" value={data.cpToken} onChange={e => onChange({ cpToken: e.target.value })} placeholder="Generated from cPanel → Manage API Tokens" autoComplete="off" style={S.input}
              onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
          </div>
        )}

        {/* VPS fields */}
        {data.serverType === 'vps' && (
          <div style={{ marginTop: 4 }}>
            <div style={S.sep} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
              <div>
                <label style={S.label}>Server IP</label>
                <input type="text" value={data.vpsIp} onChange={e => onChange({ vpsIp: e.target.value })} placeholder="203.0.113.1" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
              <div>
                <label style={S.label}>SSH port</label>
                <input type="text" value={data.vpsPort} onChange={e => onChange({ vpsPort: e.target.value })} placeholder="22" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
            </div>
            <label style={{ ...S.label, marginTop: 12 }}>
              Server label <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="text" value={data.vpsLabel} onChange={e => onChange({ vpsLabel: e.target.value })} placeholder="e.g. Production VPS" style={S.input}
              onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
          </div>
        )}
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button style={S.btnSec} onClick={onBack} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
          <ArrowLeft size={13} /> Back
        </button>
        <button style={S.btnPri} onClick={submit} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
          Save &amp; continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Done ───────────────────────────────────────────────────────────────
function StepDone({ data, installCmd, agentDone, onAgentDone, onBack, onClose, nav }) {
  const dnsLabel = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)?.label || data.dnsProvider
  const certTypeLabel = { single: 'Single domain', wildcard: 'Wildcard', multi: 'Multi-domain (SAN)' }[data.certType]

  if (agentDone) {
    return (
      <div style={S.card}>
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '0.5px solid rgba(192,57,43,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={22} color="#ff8c7a" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Server connected!</div>
          <div style={{ fontSize: 12, color: '#b0a8a0', marginBottom: 22, lineHeight: 1.6 }}>
            <strong style={{ color: '#ff8c7a' }}>{data.domain}</strong> is live on your VPS. Auto-renewal is active.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
              {data.vpsIp || 'VPS'} online
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <RefreshCw size={10} /> Auto-renew on
            </span>
          </div>
        </div>
        <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <button style={S.btnPri} onClick={() => { onClose(); nav('/buy') }} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
            Issue first certificate <ArrowRight size={13} />
          </button>
        </div>
      </div>
    )
  }

  // cPanel success
  if (data.serverType === 'hosting') {
    return (
      <div style={S.card}>
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', paddingBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '0.5px solid rgba(192,57,43,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={22} color="#ff8c7a" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Domain added successfully</div>
            <div style={{ fontSize: 12, color: '#b0a8a0' }}>{data.domain} is connected via cPanel auto-install</div>
          </div>
          <div style={S.sep} />
          {[
            ['Domain',      data.domain],
            ['Certificate', certTypeLabel],
            ['DNS provider', dnsLabel],
            ['Server',      'Shared hosting / cPanel'],
            ['cPanel host', data.cpUrl || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.07)', fontSize: 12 }}>
              <span style={{ color: '#b0a8a0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: 11 }}>{k}</span>
              <span style={{ color: '#e8e0d8', fontWeight: 600, ...S.mono, fontSize: 11 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 12 }}>
            <span style={{ color: '#b0a8a0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: 11 }}>Status</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <Check size={10} /> Ready
            </span>
          </div>
        </div>
        <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <button style={S.btnSec} onClick={onBack} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
            <ArrowLeft size={13} /> Back
          </button>
          <button style={S.btnPri} onClick={() => { onClose(); nav('/buy') }} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
            Issue certificate <ArrowRight size={13} />
          </button>
        </div>
      </div>
    )
  }

  // VPS — show agent install
  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>Install the SSLVault agent</div>
        <div style={{ ...S.sub, marginBottom: 16 }}>
          Run this one command on <strong style={{ color: '#ff8c7a' }}>{data.vpsLabel || data.vpsIp || data.domain}</strong> as root to connect your server
        </div>

        <label style={S.label}>Agent install token</label>
        <div style={S.codeBox}>
          {installCmd.loading ? 'Generating secure token…' : (installCmd.token || 'Failed to generate token')}
          {!installCmd.loading && installCmd.token && <CopyButton text={installCmd.token} />}
        </div>

        <label style={{ ...S.label, marginTop: 16 }}>Install command — paste into your server terminal</label>
        <div style={S.cmdBox}>
          {installCmd.loading ? 'Loading…' : (installCmd.cmd || '—')}
          {!installCmd.loading && installCmd.cmd && <CopyButton text={installCmd.cmd} />}
        </div>

        <div style={{ ...S.sep, marginTop: 20 }} />
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#b0a8a0', marginBottom: 10 }}>What happens after install</div>
        {[
          ['Agent connects back to SSLVault in seconds', 'Server status turns green in Domain Manager'],
          ['SSL certificate is issued and auto-installed', `via ACME + DNS-01 using your ${dnsLabel} API key`],
          ['Auto-renew runs 30 days before expiry', 'Zero manual effort from here'],
        ].map(([main, sub], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.07)' : 'none' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 12, color: '#e8e0d8', fontWeight: 500 }}>{main}</div>
              <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <button style={S.btnSec} onClick={onBack} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
          <ArrowLeft size={13} /> Back
        </button>
        <button style={S.btnPri} onClick={onAgentDone} onMouseEnter={e => e.currentTarget.style.background = '#a93226'} onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
          Agent installed — done <Check size={13} />
        </button>
      </div>
    </div>
  )
}

// ══ MAIN WIZARD ═══════════════════════════════════════════════════════════════
export default function AddDomainWizard({ user, onClose, nav }) {
  const [step, setStep] = useState(1)
  const [agentDone, setAgentDone] = useState(false)
  const [installCmd, setInstallCmd] = useState({ loading: false, token: '', cmd: '' })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const [data, setData] = useState({
    domain: '', certType: 'single',
    dnsProvider: '', dnsKey1: '', dnsKey2: '',
    serverType: '', cpUrl: '', cpPort: '2083', cpUser: '', cpToken: '',
    vpsIp: '', vpsPort: '22', vpsLabel: '',
  })

  const update = (patch) => setData(prev => ({ ...prev, ...patch }))

  // Fetch agent install command when we arrive at step 4 for VPS
  useEffect(() => {
    if (step !== 4 || data.serverType !== 'vps') return
    let cancelled = false
    setInstallCmd({ loading: true, token: '', cmd: '' })
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await callFn('agent-daemon', {
          action: 'create_install_command',
          user_id: user?.id,
          nickname: data.vpsLabel || data.vpsIp || data.domain || 'My Server',
        }, session?.access_token)
        if (cancelled) return
        if (res.ok && res.command) {
          // Extract token from command for display
          const match = res.command.match(/--token\s+(\S+)/)
          const token = match ? match[1] : ''
          setInstallCmd({ loading: false, token, cmd: res.command })
        } else {
          setInstallCmd({ loading: false, token: '', cmd: res.error || 'Failed to generate command' })
        }
      } catch (e) {
        if (!cancelled) setInstallCmd({ loading: false, token: '', cmd: String(e?.message || e) })
      }
    })()
    return () => { cancelled = true }
  }, [step, data.serverType])

  // Save DNS credentials and server credentials when moving to step 4
  const handleSaveAndProceed = async () => {
    setSaving(true)
    setSaveErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Save DNS credential if provider + key provided
      if (data.dnsProvider && data.dnsProvider !== 'other' && data.dnsKey1) {
        const creds = { api_key: data.dnsKey1 }
        if (data.dnsKey2) creds.api_secret = data.dnsKey2
        await callFn('dns-provider', {
          action: 'save',
          user_id: user?.id,
          provider: data.dnsProvider,
          label: data.dnsProvider + ' — ' + data.domain,
          domain_pattern: data.domain,
          credentials: creds,
        }, token)
      }

      // Save server credentials (cPanel only — VPS agent handles itself)
      if (data.serverType === 'hosting' && data.cpUrl && data.cpUser) {
        await supabase.from('server_credentials').insert({
          user_id: user?.id,
          server_type: 'cpanel',
          host: data.cpUrl,
          port: parseInt(data.cpPort) || 2083,
          username: data.cpUser,
          nickname: data.cpUser + '@' + (data.cpUrl.replace(/^https?:\/\//, '').split(':')[0]),
          domains: [data.domain],
          auto_install_enabled: true,
        })
      }

      setStep(4)
    } catch (e) {
      setSaveErr(e?.message || 'Failed to save. Please try again.')
    }
    setSaving(false)
  }

  return (
    // Overlay
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Globe size={14} color="#ff8c7a" />
              Domain Manager — Add domain
            </div>
            {data.domain && step > 1 && (
              <div style={{ fontSize: 11, color: '#b0a8a0', marginTop: 2, ...S.mono }}>{data.domain}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: '#e8e0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        </div>

        <StepBar step={step} />

        {saveErr && (
          <div style={{ marginBottom: 12, background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
            {saveErr}
          </div>
        )}

        {step === 1 && <StepDomain data={data} onChange={update} onNext={() => setStep(2)} />}
        {step === 2 && <StepDNS data={data} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && (
          <StepServer
            data={data}
            onChange={update}
            onNext={handleSaveAndProceed}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepDone
            data={data}
            installCmd={installCmd}
            agentDone={agentDone}
            onAgentDone={() => setAgentDone(true)}
            onBack={() => setStep(3)}
            onClose={onClose}
            nav={nav}
          />
        )}

        {saving && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,0,0,0.7)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(192,57,43,0.3)', borderTopColor: '#c0392b', animation: 'spin .7s linear infinite' }} />
            <div style={{ fontSize: 12, color: '#b0a8a0' }}>Saving…</div>
          </div>
        )}
      </div>
    </div>
  )
}
