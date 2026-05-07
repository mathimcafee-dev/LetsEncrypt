import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, CheckCircle, AlertTriangle, Eye, EyeOff, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const EDGE_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'

const PROVIDERS = {
  vercel: {
    name: 'Vercel',
    icon: '▲',
    color: '#000000',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-vercel-api-token', help: 'Create at vercel.com/account/tokens — needs access to your team' },
      { key: 'teamId', label: 'Team ID (optional)', type: 'text', placeholder: 'team_xxxxxxxx (leave blank for personal)', help: 'Found in Vercel team settings URL. Leave blank for personal account.' },
    ],
    docs: 'https://vercel.com/account/tokens',
    note: 'Works for all domains with Vercel nameservers. Token needs DNS record write access.'
  },
  cloudflare: {
    name: 'Cloudflare',
    icon: '🔶',
    color: '#F6821F',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-cloudflare-api-token', help: 'Create at Cloudflare Dashboard → My Profile → API Tokens → Create Token → Zone:DNS:Edit' },
      { key: 'zoneId', label: 'Zone ID (optional)', type: 'text', placeholder: 'auto-detected if blank', help: 'Leave blank to auto-detect from domain. Found in domain Overview page sidebar.' },
    ],
    docs: 'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/',
    note: 'Token needs Zone:DNS:Edit permission. Recommended over Global API Key.'
  },
  godaddy: {
    name: 'GoDaddy',
    icon: '🟢',
    color: '#00A4A6',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'your-godaddy-api-key', help: 'Found at https://developer.godaddy.com/keys' },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'your-godaddy-api-secret', help: 'Created alongside the API key' },
    ],
    docs: 'https://developer.godaddy.com/keys',
    note: 'Use Production keys (not OTE/Test). API key is tied to your GoDaddy account.'
  },
  digitalocean: {
    name: 'DigitalOcean',
    icon: '🔵',
    color: '#0080FF',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'your-digitalocean-api-token', help: 'Create at DigitalOcean Dashboard → API → Generate New Token (needs Write access)' },
    ],
    docs: 'https://docs.digitalocean.com/reference/api/create-personal-access-token/',
    note: 'Token needs Read + Write scope. Domain must be managed in DigitalOcean DNS.'
  }
}

function ProviderBadge({ provider }) {
  const p = PROVIDERS[provider]
  if (!p) return <span className="badge badge-blue">{provider}</span>
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:100, fontSize:12, fontWeight:600, background:`${p.color}15`, color:p.color, border:`1px solid ${p.color}30` }}>
      {p.icon} {p.name}
    </span>
  )
}

function AddProviderModal({ onSave, onClose, userId }) {
  const [provider, setProvider] = useState('cloudflare')
  const [domainPattern, setDomainPattern] = useState('')
  const [label, setLabel] = useState('')
  const [fields, setFields] = useState({})
  const [showFields, setShowFields] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const p = PROVIDERS[provider]

  const handleSave = async () => {
    if (!domainPattern.trim()) { setError('Please enter the domain this provider manages'); return }
    const missingFields = p.fields.filter(f => !fields[f.key])
    if (missingFields.length > 0) { setError(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`); return }

    setError(''); setLoading(true)
    try {
      const res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_id: userId,
          provider,
          domain_pattern: domainPattern.trim().replace(/^https?:\/\//, '').replace(/\/.*/, ''),
          label: label || domainPattern,
          credentials: fields
        })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess(data.message || 'Saved successfully!')
      setTimeout(() => { onSave(); onClose() }, 1500)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:520, boxShadow:'var(--shadow-lg)', maxHeight:'85vh', overflow:'auto' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h3 style={{ fontWeight:700, fontSize:18, color:'var(--text)' }}>Add DNS Provider</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16}/></button>
        </div>

        {/* Provider selector */}
        <div style={{ marginBottom:20 }}>
          <label>DNS Provider</label>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {Object.entries(PROVIDERS).map(([key, prov]) => (
              <button key={key} onClick={() => { setProvider(key); setFields({}); setError('') }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`2px solid ${provider===key ? prov.color : 'var(--border)'}`, background: provider===key ? `${prov.color}10` : 'white', cursor:'pointer', fontSize:14, fontWeight:600, color: provider===key ? prov.color : 'var(--text2)', transition:'all 0.15s' }}>
                <span style={{ fontSize:18 }}>{prov.icon}</span> {prov.name}
              </button>
            ))}
          </div>
        </div>

        {/* Domain pattern */}
        <div style={{ marginBottom:16 }}>
          <label>Domain this provider manages</label>
          <input placeholder="example.com" value={domainPattern} onChange={e => setDomainPattern(e.target.value)} />
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:5 }}>Enter the root domain (e.g. example.com). This provider will be used for example.com and all its subdomains.</p>
        </div>

        {/* Label */}
        <div style={{ marginBottom:20 }}>
          <label>Label (optional)</label>
          <input placeholder={`My ${p.name} account`} value={label} onChange={e => setLabel(e.target.value)} />
        </div>

        {/* Provider-specific fields */}
        {p.fields.map(field => (
          <div key={field.key} style={{ marginBottom:16 }}>
            <label>{field.label}</label>
            <div style={{ position:'relative' }}>
              <input
                type={field.type === 'password' && !showFields[field.key] ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={fields[field.key] || ''}
                onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                style={{ paddingRight: field.type === 'password' ? 40 : 14 }}
              />
              {field.type === 'password' && (
                <button onClick={() => setShowFields(s => ({ ...s, [field.key]: !s[field.key] }))}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}>
                  {showFields[field.key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              )}
            </div>
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{field.help}</p>
          </div>
        ))}

        {/* Provider note */}
        <div className="alert alert-info" style={{ marginBottom:16, fontSize:12 }}>
          💡 {p.note}{' '}
          <a href={p.docs} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', fontWeight:600 }}>
            View docs <ExternalLink size={10}/>
          </a>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:16, fontSize:12 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom:16, fontSize:12 }}>✅ {success}</div>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
            {loading ? <><span className="spinner"/> Validating & Saving...</> : '✅ Validate & Save'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function DnsProviders({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState({})

  useEffect(() => {
    if (!authLoading && user) loadCredentials()
    if (!authLoading && !user) setLoading(false)
  }, [user, authLoading])

  const loadCredentials = async () => {
    setLoading(true)
    const res = await fetch(EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', user_id: user.id })
    })
    const data = await res.json()
    setCredentials(data.credentials || [])
    setLoading(false)
  }

  const deleteCredential = async (id) => {
    if (!confirm('Delete this DNS provider configuration?')) return
    setDeleting(id)
    await fetch(EDGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', user_id: user.id, id })
    })
    setCredentials(c => c.filter(x => x.id !== id))
    setDeleting(null)
  }

  const testProvider = async (cred) => {
    setTesting(cred.id)
    setTestResult(t => ({ ...t, [cred.id]: null }))
    try {
      const res = await fetch(EDGE_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: user.id, domain: cred.domain_pattern.replace('*.', '') })
      })
      const data = await res.json()
      setTestResult(t => ({ ...t, [cred.id]: data }))
    } catch(e) {
      setTestResult(t => ({ ...t, [cred.id]: { ok: false, message: e.message } }))
    }
    setTesting(null)
  }

  if (!authLoading && !user) return (
    <div className="container" style={{ padding:'80px 24px', textAlign:'center' }}>
      <Shield size={48} color="var(--text3)" style={{ margin:'0 auto 20px' }} />
      <h2 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Sign in Required</h2>
      <button onClick={() => nav('/auth')} className="btn btn-primary btn-lg">Sign In</button>
    </div>
  )

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container">
        {showAdd && <AddProviderModal userId={user?.id} onSave={loadCredentials} onClose={() => setShowAdd(false)} />}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4, color:'var(--text)' }}>DNS Providers</h1>
            <p style={{ color:'var(--text2)', fontSize:14 }}>Configure automatic DNS for SSL certificate generation</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={15}/> Add Provider</button>
        </div>

        {/* How it works */}
        <div style={{ background:'white', border:'1px solid var(--accent-border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', marginBottom:28 }}>
          <h2 style={{ fontWeight:700, fontSize:16, marginBottom:16, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
            ⚡ How Automatic DNS Works
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              ['1', 'Configure Provider', 'Add your DNS provider API credentials here. They are encrypted with AES-256 before storage.'],
              ['2', 'Generate Certificate', 'When you generate an SSL certificate, we automatically detect your provider and create the _acme-challenge TXT record.'],
              ['3', 'Instant Verification', 'No manual DNS steps needed. The record is added automatically and verification happens seamlessly.'],
            ].map(([n, title, desc]) => (
              <div key={n} style={{ display:'flex', gap:12 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{n}</div>
                <div>
                  <p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{title}</p>
                  <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="alert alert-warning" style={{ marginBottom:28, fontSize:13 }}>
          🔒 <strong>Security:</strong> API credentials are encrypted with AES-256-GCM before storage. Private keys are never returned to the browser. Only you can access your credentials via Row-Level Security.
        </div>

        {/* Supported providers */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)', marginBottom:28 }}>
          <h2 style={{ fontWeight:700, fontSize:16, marginBottom:16, color:'var(--text)' }}>Supported Providers</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <div key={key} style={{ border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>API Token</div>
                </div>
                <span className="badge badge-green" style={{ marginLeft:'auto', fontSize:10 }}>✅ Supported</span>
              </div>
            ))}
            {[['Route53','🟠','Coming soon'],['Namecheap','🔴','Coming soon'],['Azure DNS','🔷','Coming soon'],['Custom API','🔧','Coming soon']].map(([name,icon,status]) => (
              <div key={name} style={{ border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, opacity:0.5 }}>
                <span style={{ fontSize:24 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configured credentials */}
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:24, boxShadow:'var(--shadow)' }}>
          <h2 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:'var(--text)' }}>
            Configured Providers {credentials.length > 0 && <span style={{ fontSize:13, color:'var(--text3)', fontWeight:400 }}>({credentials.length})</span>}
          </h2>

          {loading ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>
              <span className="spinner spinner-dark" style={{ width:20, height:20, display:'block', margin:'0 auto 10px' }} />
              Loading...
            </div>
          ) : credentials.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔧</div>
              <p style={{ fontWeight:600, color:'var(--text2)', marginBottom:8 }}>No DNS providers configured yet</p>
              <p style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Add a provider to enable automatic DNS record creation during certificate generation</p>
              <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={14}/> Add Your First Provider</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {credentials.map(cred => (
                <div key={cred.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <span style={{ fontSize:28 }}>{PROVIDERS[cred.provider]?.icon || '🔧'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                        <ProviderBadge provider={cred.provider} />
                        <span style={{ fontWeight:700, fontSize:14, fontFamily:'var(--mono)', color:'var(--text)' }}>{cred.domain_pattern}</span>
                        {cred.label && cred.label !== cred.domain_pattern && <span style={{ fontSize:12, color:'var(--text3)' }}>"{cred.label}"</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>
                        Added {new Date(cred.created_at).toLocaleDateString()} · Credentials encrypted ✅
                      </div>
                      {testResult[cred.id] && (
                        <div className={`alert ${testResult[cred.id].ok ? 'alert-success' : 'alert-error'}`} style={{ marginTop:8, fontSize:12, padding:'6px 10px' }}>
                          {testResult[cred.id].ok ? '✅' : '❌'} {testResult[cred.id].message}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button onClick={() => testProvider(cred)} disabled={testing === cred.id} className="btn btn-secondary btn-sm">
                        {testing === cred.id ? <><span className="spinner spinner-dark"/> Testing...</> : <><RefreshCw size={13}/> Test</>}
                      </button>
                      <button onClick={() => deleteCredential(cred.id)} disabled={deleting === cred.id}
                        style={{ background:'var(--red-light)', border:'1px solid var(--red-border)', color:'var(--red)', cursor:'pointer', borderRadius:6, padding:'6px 10px', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
                        {deleting === cred.id ? <span className="spinner spinner-dark"/> : <Trash2 size={13}/>} Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA to generate */}
        {credentials.length > 0 && (
          <div style={{ marginTop:24, background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:14, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <p style={{ fontWeight:700, color:'white', fontSize:16, marginBottom:4 }}>Ready to generate certificates automatically!</p>
              <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>DNS records will be created automatically for domains managed by your configured providers.</p>
            </div>
            <button onClick={() => nav('/generate')} style={{ background:'white', color:'var(--accent)', border:'none', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <Shield size={15}/> Generate Certificate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
