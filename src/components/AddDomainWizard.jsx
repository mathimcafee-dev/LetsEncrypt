// AddDomainWizard.jsx
// Step-by-step wizard: Domain → DNS provider → Server type → Done
// VPS: token generated on infra select, all saves happen on "Agent installed — done"
// cPanel: credentials saved on "Save & continue", step 4 = success summary
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, Check, Copy, ArrowRight, ArrowLeft, Server, Globe, RefreshCw, Terminal } from 'lucide-react'

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
  { id: 'cloudflare',   label: 'Cloudflare',        field1: 'API Token',             ph1: 'Cloudflare API Token' },
  { id: 'route53',      label: 'Route 53',           field1: 'Access Key ID',         ph1: 'AKIA…',              field2: 'Secret Access Key', ph2: 'Secret…' },
  { id: 'godaddy',      label: 'GoDaddy',            field1: 'API Key',               ph1: 'GoDaddy API Key' },
  { id: 'namecheap',    label: 'Namecheap',          field1: 'API Username',          ph1: 'your-username',      field2: 'API Key',           ph2: 'Namecheap API Key' },
  { id: 'digitalocean', label: 'DigitalOcean',       field1: 'Personal Access Token', ph1: 'dop_v1_…' },
  { id: 'other',        label: 'Other / Manual',     field1: null },
]

// ── Shared style tokens ───────────────────────────────────────────────────────
const S = {
  card:    { background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
  input:   { width: '100%', padding: '10px 14px', fontSize: 13, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.09)', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' },
  label:   { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888888', marginBottom: 6 },
  btnPri:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: '#1f5c4e', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background .15s', whiteSpace: 'nowrap' },
  btnSec:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: 'rgba(0,0,0,0.06)', color: '#333333', border: '1px solid rgba(0,0,0,0.09)', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' },
  btnDis:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', borderRadius: 7, background: 'rgba(31,92,78,0.2)', color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'not-allowed', whiteSpace: 'nowrap' },
  title:   { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.2px' },
  sub:     { fontSize: 12, color: '#888888', marginBottom: 20, lineHeight: 1.5 },
  err:     { fontSize: 11, color: '#1f5c4e', marginTop: 5, fontWeight: 500 },
  mono:    { fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace' },
  sep:     { height: '0.5px', background: 'rgba(0,0,0,0.06)', margin: '16px 0' },
  codeBox: { background: '#f4f1ec', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7, padding: '11px 40px 11px 12px', fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace', fontSize: 11, color: '#16a068', wordBreak: 'break-all', position: 'relative', lineHeight: 1.6, marginTop: 4 },
  cmdBox:  { background: '#f4f1ec', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7, padding: '10px 40px 10px 12px', fontFamily: '"JetBrains Mono","Menlo","Consolas",monospace', fontSize: 11, color: '#333333', wordBreak: 'break-all', position: 'relative', lineHeight: 1.6, marginTop: 4 },
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1600) }}
      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: done ? '#16a068' : '#b0a8a0', padding: 2, display: 'flex', alignItems: 'center', transition: 'color .15s' }}>
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

// ── Step bar ──────────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Domain', 'DNS', 'Server', 'Done']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, transition: 'all .2s',
                background: done || active ? '#1f5c4e' : 'rgba(0,0,0,0.06)',
                color: done || active ? '#fff' : '#b0a8a0',
                border: done || active ? 'none' : '1px solid rgba(0,0,0,0.09)',
                boxShadow: active ? '0 0 0 4px rgba(0,0,0,0.08)' : 'none',
              }}>
                {done ? <Check size={11} /> : n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: active ? '#1f5c4e' : '#b0a8a0' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.07)', margin: '0 8px', transition: 'background .3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Domain ────────────────────────────────────────────────────────────
function StepDomain({ data, onChange, onNext }) {
  const [err, setErr] = useState('')
  function submit() {
    if (!isValidDomain(data.domain)) { setErr('Please enter a valid domain (e.g. yourdomain.com)'); return }
    setErr(''); onNext()
  }
  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>Add a domain</div>
        <div style={S.sub}>Enter the domain you want to manage and protect with SSL</div>
        <label style={S.label}>Domain name</label>
        <input type="text" value={data.domain} onChange={e => { onChange({ domain: e.target.value }); setErr('') }}
          placeholder="yourdomain.com" autoComplete="off"
          style={{ ...S.input, ...(err ? { borderColor: '#1f5c4e' } : {}) }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onFocus={e => e.target.style.borderColor = '#1f5c4e'}
          onBlur={e => e.target.style.borderColor = err ? '#1f5c4e' : 'rgba(0,0,0,0.09)'} />
        {err && <div style={S.err}>{err}</div>}
        <label style={{ ...S.label, marginTop: 16 }}>Certificate type</label>
        <select value={data.certType} onChange={e => onChange({ certType: e.target.value })}
          style={{ ...S.input, appearance: 'none' }}
          onFocus={e => e.target.style.borderColor = '#1f5c4e'}
          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'}>
          <option value="single">Single domain — domain.com</option>
          <option value="wildcard">Wildcard — *.domain.com (all subdomains)</option>
          <option value="multi">Multi-domain (SAN) — up to 250 SANs</option>
        </select>
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={S.btnPri} onClick={submit}
          onMouseEnter={e => e.currentTarget.style.background = '#2e7a68'}
          onMouseLeave={e => e.currentTarget.style.background = '#1f5c4e'}>
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2: DNS ───────────────────────────────────────────────────────────────
function StepDNS({ data, onChange, onNext, onBack }) {
  const [err, setErr] = useState('')
  const selected = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)

  function submit() {
    if (!data.dnsProvider) { setErr('Please select a DNS provider'); return }
    setErr(''); onNext()
  }

  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>DNS provider</div>
        <div style={S.sub}>Used for automatic DNS-01 validation — SSLVault creates the TXT record for you</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {DNS_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { onChange({ dnsProvider: p.id, dnsKey1: '', dnsKey2: '' }); setErr('') }}
              style={{
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat,system-ui,sans-serif', transition: 'all .15s',
                background: data.dnsProvider === p.id ? 'rgba(31,92,78,0.12)' : 'rgba(0,0,0,0.04)',
                border: data.dnsProvider === p.id ? '1px solid #2a6b5c' : '1px solid rgba(0,0,0,0.07)',
                color: data.dnsProvider === p.id ? '#1f5c4e' : '#b0a8a0',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {err && <div style={S.err}>{err}</div>}

        {selected && selected.field1 && (
          <div style={{ marginTop: 16 }}>
            <div style={S.sep} />
            <label style={S.label}>{selected.field1}</label>
            <input type="text" value={data.dnsKey1} onChange={e => onChange({ dnsKey1: e.target.value })}
              placeholder={selected.ph1} autoComplete="off" style={S.input}
              onFocus={e => e.target.style.borderColor = '#1f5c4e'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
            {selected.field2 && (
              <>
                <label style={{ ...S.label, marginTop: 12 }}>{selected.field2}</label>
                <input type="text" value={data.dnsKey2} onChange={e => onChange({ dnsKey2: e.target.value })}
                  placeholder={selected.ph2} autoComplete="off" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#1f5c4e'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
              </>
            )}
          </div>
        )}
        {selected && !selected.field1 && (
          <div style={{ marginTop: 14, background: 'rgba(31,92,78,0.07)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7, padding: '10px 12px', fontSize: 12, color: '#333333', lineHeight: 1.6 }}>
            Manual DNS — SSLVault will show you a TXT record to add at your registrar after setup.
          </div>
        )}
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button style={S.btnSec} onClick={onBack}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}>
          <ArrowLeft size={13} /> Back
        </button>
        <button style={S.btnPri} onClick={submit}
          onMouseEnter={e => e.currentTarget.style.background = '#2e7a68'}
          onMouseLeave={e => e.currentTarget.style.background = '#1f5c4e'}>
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Server ────────────────────────────────────────────────────────────
// VPS: shows token + install command immediately on selection (no extra fields)
// cPanel: shows credential fields, saves on "Save & continue"
function StepServer({ data, onChange, onNext, onBack, user, installCmd }) {
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const infraCard = (val) => ({
    border: data.serverType === val ? '1px solid #2a6b5c' : '1px solid rgba(0,0,0,0.07)',
    borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all .15s',
    background: data.serverType === val ? 'rgba(192,57,43,0.14)' : 'rgba(0,0,0,0.04)',
  })

  async function submit() {
    if (!data.serverType) { setErr('Please select your server type'); return }
    setSaveErr(''); setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Save DNS credential
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

      // cPanel: save server credentials now, then go to step 4 (success)
      if (data.serverType === 'hosting') {
        if (data.cpUrl && data.cpUser) {
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
        onNext()
        return
      }

      // VPS: DNS saved above, agent saves itself on install — just proceed to done
      onNext()
    } catch (e) {
      setSaveErr(e?.message || 'Failed to save. Please try again.')
    }
    setSaving(false)
  }

  const isVps = data.serverType === 'vps'
  const tokenReady = isVps && !installCmd.loading && installCmd.token

  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={S.title}>Server infrastructure</div>
        <div style={S.sub}>
          Where is <strong style={{ color: '#1f5c4e', fontWeight: 600 }}>{data.domain}</strong> hosted?
        </div>

        {/* Infra selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={infraCard('hosting')} onClick={() => { onChange({ serverType: 'hosting' }); setErr('') }}>
            <div style={{ fontSize: 22, color: '#1f5c4e', marginBottom: 8 }}><Server size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Shared hosting</div>
            <div style={{ fontSize: 11, color: '#888888', marginTop: 2 }}>cPanel · Plesk · DirectAdmin</div>
          </div>
          <div style={infraCard('vps')} onClick={() => { onChange({ serverType: 'vps' }); setErr('') }}>
            <div style={{ fontSize: 22, color: '#1f5c4e', marginBottom: 8 }}><Terminal size={22} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>VPS / Cloud server</div>
            <div style={{ fontSize: 11, color: '#888888', marginTop: 2 }}>Ubuntu · Debian · CentOS</div>
          </div>
        </div>
        {err && <div style={S.err}>{err}</div>}
        {saveErr && <div style={{ ...S.err, marginTop: 8 }}>{saveErr}</div>}

        {/* ── cPanel fields ── */}
        {data.serverType === 'hosting' && (
          <div>
            <div style={S.sep} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
              <div>
                <label style={S.label}>cPanel URL</label>
                <input type="text" value={data.cpUrl} onChange={e => onChange({ cpUrl: e.target.value })}
                  placeholder="https://cp.yourdomain.com:2083" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#1f5c4e'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
              </div>
              <div>
                <label style={S.label}>Port</label>
                <input type="text" value={data.cpPort} onChange={e => onChange({ cpPort: e.target.value })}
                  placeholder="2083" style={S.input}
                  onFocus={e => e.target.style.borderColor = '#1f5c4e'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
              </div>
            </div>
            <label style={{ ...S.label, marginTop: 12 }}>cPanel username</label>
            <input type="text" value={data.cpUser} onChange={e => onChange({ cpUser: e.target.value })}
              placeholder="your cPanel username" autoComplete="off" style={S.input}
              onFocus={e => e.target.style.borderColor = '#1f5c4e'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
            <label style={{ ...S.label, marginTop: 12 }}>API token</label>
            <input type="text" value={data.cpToken} onChange={e => onChange({ cpToken: e.target.value })}
              placeholder="Generated from cPanel → Manage API Tokens" autoComplete="off" style={S.input}
              onFocus={e => e.target.style.borderColor = '#1f5c4e'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'} />
          </div>
        )}

        {/* ── VPS: show token immediately, no extra fields ── */}
        {data.serverType === 'vps' && (
          <div>
            <div style={S.sep} />
            {installCmd.loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', color: '#888888', fontSize: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(31,92,78,0.2)', borderTopColor: '#1f5c4e', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
                Generating your agent install token…
              </div>
            ) : installCmd.error ? (
              <div style={{ ...S.err, padding: '10px 0' }}>{installCmd.error}</div>
            ) : (
              <>
                <label style={S.label}>Your agent install token</label>
                <div style={S.codeBox}>
                  {installCmd.token}
                  <CopyButton text={installCmd.token} />
                </div>
                <label style={{ ...S.label, marginTop: 14 }}>Install command — paste into your server as root</label>
                <div style={S.cmdBox}>
                  {installCmd.cmd}
                  <CopyButton text={installCmd.cmd} />
                </div>
                <div style={{ marginTop: 12, background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.2)', borderRadius: 7, padding: '9px 12px', fontSize: 11, color: '#888888', lineHeight: 1.6 }}>
                  The agent connects back automatically. No server credentials needed — it registers itself once installed.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <button style={S.btnSec} onClick={onBack}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}>
          <ArrowLeft size={13} /> Back
        </button>

        {/* cPanel: "Save & continue" */}
        {data.serverType === 'hosting' && (
          <button
            style={saving ? S.btnDis : S.btnPri}
            disabled={saving}
            onClick={submit}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#2e7a68' }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1f5c4e' }}>
            {saving
              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} /> Saving…</>
              : <>Save &amp; continue <ArrowRight size={13} /></>}
          </button>
        )}

        {/* VPS: "Agent installed — done" — grayed until token is ready, saves on click */}
        {data.serverType === 'vps' && (
          <button
            style={(!tokenReady || saving) ? S.btnDis : S.btnPri}
            disabled={!tokenReady || saving}
            onClick={submit}
            onMouseEnter={e => { if (tokenReady && !saving) e.currentTarget.style.background = '#2e7a68' }}
            onMouseLeave={e => { if (tokenReady && !saving) e.currentTarget.style.background = '#1f5c4e' }}>
            {saving
              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} /> Saving…</>
              : <><Check size={13} /> Agent installed — done</>}
          </button>
        )}

        {/* Nothing selected yet */}
        {!data.serverType && (
          <button style={S.btnDis} disabled>
            Save &amp; continue <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────
function StepDone({ data, onClose, nav }) {
  const dnsLabel = DNS_PROVIDERS.find(p => p.id === data.dnsProvider)?.label || data.dnsProvider
  const certLabel = { single: 'Single domain', wildcard: 'Wildcard', multi: 'Multi-domain (SAN)' }[data.certType]

  if (data.serverType === 'vps') {
    return (
      <div style={S.card}>
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(22,160,104,0.09)', border: '0.5px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={22} color="#4ade80" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Server connected!</div>
          <div style={{ fontSize: 12, color: '#888888', marginBottom: 20, lineHeight: 1.6 }}>
            <strong style={{ color: '#1f5c4e' }}>{data.domain}</strong> is linked to your VPS.<br />
            SSL will be issued and installed automatically. Auto-renewal is active.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(22,160,104,0.09)', color: '#16a068', border: '1px solid rgba(22,160,104,0.22)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a068' }} /> Agent registered
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(22,160,104,0.09)', color: '#16a068', border: '1px solid rgba(22,160,104,0.22)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
              <RefreshCw size={10} /> Auto-renew on
            </span>
          </div>
        </div>
        <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button style={S.btnPri} onClick={() => { onClose(); nav('/buy') }}
            onMouseEnter={e => e.currentTarget.style.background = '#2e7a68'}
            onMouseLeave={e => e.currentTarget.style.background = '#1f5c4e'}>
            Issue first certificate <ArrowRight size={13} />
          </button>
        </div>
      </div>
    )
  }

  // cPanel success
  return (
    <div style={S.card}>
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', paddingBottom: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(22,160,104,0.09)', border: '0.5px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={22} color="#4ade80" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Domain added successfully</div>
          <div style={{ fontSize: 12, color: '#888888' }}>{data.domain} is connected via cPanel auto-install</div>
        </div>
        <div style={S.sep} />
        {[
          ['Domain',       data.domain],
          ['Certificate',  certLabel],
          ['DNS provider', dnsLabel],
          ['Server',       'Shared hosting / cPanel'],
          ['cPanel host',  data.cpUrl || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 12 }}>
            <span style={{ color: '#888888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: 11 }}>{k}</span>
            <span style={{ color: '#333333', fontWeight: 600, ...S.mono, fontSize: 11 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 12 }}>
          <span style={{ color: '#888888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: 11 }}>Status</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(22,160,104,0.09)', color: '#16a068', border: '1px solid rgba(22,160,104,0.22)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
            <Check size={10} /> Ready
          </span>
        </div>
      </div>
      <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <button style={S.btnPri} onClick={() => { onClose(); nav('/buy') }}
          onMouseEnter={e => e.currentTarget.style.background = '#2e7a68'}
          onMouseLeave={e => e.currentTarget.style.background = '#1f5c4e'}>
          Issue certificate <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ══ MAIN WIZARD ════════════════════════════════════════════════════════════════
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

  // When serverType switches to 'vps', fetch the token immediately
  useEffect(() => {
    if (data.serverType !== 'vps') return
    if (fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    setInstallCmd({ loading: true, token: '', cmd: '', error: '' })
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const nickname = data.domain || 'My Server'
        const res = await callFn('agent-daemon', {
          action: 'create_install_command',
          user_id: user?.id,
          nickname,
        }, session?.access_token)
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

  // Reset fetch ref if user switches away from VPS and back
  const handleChange = (patch) => {
    if (patch.serverType && patch.serverType !== 'vps') fetchedRef.current = false
    update(patch)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Globe size={14} color="#1f5c4e" />
              Domain Manager — Add domain
            </div>
            {data.domain && step > 1 && (
              <div style={{ fontSize: 11, color: '#888888', marginTop: 2, fontFamily: '"JetBrains Mono",monospace' }}>{data.domain}</div>
            )}
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', color: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>

        <StepBar step={step} />

        {step === 1 && <StepDomain data={data} onChange={update} onNext={() => setStep(2)} />}
        {step === 2 && <StepDNS data={data} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && (
          <StepServer
            data={data}
            onChange={handleChange}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
            user={user}
            installCmd={installCmd}
          />
        )}
        {step === 4 && <StepDone data={data} onClose={onClose} nav={nav} />}
      </div>
    </div>
  )
}
