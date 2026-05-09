import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, CheckCircle, Eye, EyeOff, ExternalLink, RefreshCw, X, Server } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const DNS_FN    = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/dns-provider'
const SERVER_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/server-credentials'
const DAEMON_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon'

// ── DNS Providers config ─────────────────────────────────────────────
const PROVIDERS = {
  vercel:       { name:'Vercel',       icon:'▲',  color:'#000000', fields:[{key:'apiToken',label:'API Token',type:'password',placeholder:'your-vercel-api-token',help:'Create at vercel.com/account/tokens'},{key:'teamId',label:'Team ID (optional)',type:'text',placeholder:'team_xxxxxxxx',help:'Leave blank for personal account'}], docs:'https://vercel.com/account/tokens', note:'Token needs DNS record write access.' },
  cloudflare:   { name:'Cloudflare',   icon:'🔶', color:'#F6821F', fields:[{key:'apiToken',label:'API Token',type:'password',placeholder:'your-cloudflare-api-token',help:'Dashboard → API Tokens → Zone:DNS:Edit'},{key:'zoneId',label:'Zone ID (optional)',type:'text',placeholder:'auto-detected if blank',help:'Found in domain Overview page sidebar'}], docs:'https://developers.cloudflare.com/fundamentals/api/', note:'Token needs Zone:DNS:Edit permission.' },
  godaddy:      { name:'GoDaddy',      icon:'🟢', color:'#00A4A6', fields:[{key:'apiKey',label:'API Key',type:'password',placeholder:'your-godaddy-api-key',help:'developer.godaddy.com/keys'},{key:'apiSecret',label:'API Secret',type:'password',placeholder:'your-godaddy-api-secret',help:'Created alongside the API key'}], docs:'https://developer.godaddy.com/keys', note:'Use Production keys, not OTE.' },
  digitalocean: { name:'DigitalOcean', icon:'🔵', color:'#0080FF', fields:[{key:'apiToken',label:'API Token',type:'password',placeholder:'your-digitalocean-api-token',help:'Dashboard → API → Generate New Token (Write access)'}], docs:'https://docs.digitalocean.com/reference/api/', note:'Token needs Read + Write scope.' },
}

// ── Server types config ──────────────────────────────────────────────
const SERVER_TYPES = {
  cpanel: { label:'cPanel / Shared Hosting', short:'cPanel', icon:'🖥️', color:'#d97706', bg:'#fffbeb', border:'#fde68a', desc:'GoDaddy, Bluehost, Hostinger, SiteGround',
    fields:[{key:'host',label:'Domain / cPanel Host',type:'text',placeholder:'yourdomain.com',help:'Your website domain — cPanel runs at :2083'},{key:'username',label:'cPanel Username',type:'text',placeholder:'johndoe',help:'Short login name, not your email'},{key:'api_token',label:'cPanel API Token',type:'password',placeholder:'Paste API token here',help:'cPanel → Manage API Tokens → Create → SSL permission'}]},
  ssh:    { label:'VPS / Cloud Server', short:'SSH', icon:'🔒', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', desc:'Ubuntu, Debian, CentOS, Amazon Linux',
    fields:[{key:'host',label:'Server IP / Hostname',type:'text',placeholder:'134.209.x.x',help:'Public IP or hostname of your server'},{key:'username',label:'SSH Username',type:'text',placeholder:'root or ubuntu',help:'User with sudo access'},{key:'ssh_key',label:'Private SSH Key',type:'password',placeholder:'-----BEGIN OPENSSH PRIVATE KEY-----',help:'Paste your id_rsa private key. Never stored unencrypted.'}]},
  plesk:  { label:'Plesk Panel', short:'Plesk', icon:'🎛️', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', desc:'Plesk Obsidian, Onyx',
    fields:[{key:'host',label:'Plesk Host',type:'text',placeholder:'server.example.com',help:'Your Plesk panel hostname or IP'},{key:'username',label:'Username',type:'text',placeholder:'admin',help:'Plesk admin username'},{key:'api_token',label:'Secret Key',type:'password',placeholder:'Plesk secret key',help:'Extensions → Secret Key Manager'}]},
}

// ── Shared style helpers ─────────────────────────────────────────────
const sectionCard = (accent) => ({ background:'white', border:`1px solid ${accent?'#bfdbfe':'#e2e8f0'}`, borderRadius:18, padding:'28px 32px', boxShadow:'0 1px 4px rgba(15,23,42,0.04),0 4px 14px rgba(15,23,42,0.04)', marginBottom:20 })
const gradBtn = (sm) => ({ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', border:'none', padding:sm?'8px 16px':'10px 20px', borderRadius:sm?9:10, fontSize:sm?12:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(37,99,235,0.3)', letterSpacing:'-0.1px' })

function TypeChip({ type }) {
  const t = SERVER_TYPES[type]
  if (!t) return null
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, color:t.color, background:t.bg, border:`1px solid ${t.border}` }}>{t.icon} {t.short}</span>
}

// ── Add DNS Provider Modal ───────────────────────────────────────────
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
    const missing = p.fields.filter(f => !fields[f.key])
    if (missing.length) { setError(`Please fill in: ${missing.map(f=>f.label).join(', ')}`); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch(DNS_FN, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'save', user_id:userId, provider, domain_pattern:domainPattern.trim().replace(/^https?:\/\//,'').replace(/\/.*/,''), label:label||domainPattern, credentials:fields }) })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess(data.message || 'Saved!')
      setTimeout(() => { onSave(); onClose() }, 1200)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(2px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:520, boxShadow:'0 32px 80px rgba(15,23,42,0.3)', maxHeight:'88vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 28px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 4px rgba(37,99,235,0.1)' }}>
              <span style={{ fontSize:18 }}>🌐</span>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:'#0f172a' }}>Add DNS Provider</div>
              <div style={{ fontSize:12, color:'#64748b' }}>Encrypted before storage · Auto-DNS for cert generation</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#94a3b8' }}>✕</button>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:10 }}>DNS Provider</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Object.entries(PROVIDERS).map(([key, prov]) => (
                <button key={key} onClick={() => { setProvider(key); setFields({}); setError('') }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10, border:`2px solid ${provider===key?prov.color:'#e2e8f0'}`, background:provider===key?`${prov.color}10`:'white', cursor:'pointer', fontSize:13, fontWeight:600, color:provider===key?prov.color:'#475569', transition:'all 0.15s' }}>
                  <span style={{ fontSize:18 }}>{prov.icon}</span>{prov.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Domain this provider manages</label>
            <input placeholder="example.com" value={domainPattern} onChange={e => setDomainPattern(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, boxSizing:'border-box' }} />
            <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Root domain only. Covers example.com and all its subdomains.</p>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Label <span style={{ color:'#94a3b8', fontWeight:400 }}>— optional</span></label>
            <input placeholder={`My ${p.name} account`} value={label} onChange={e => setLabel(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, boxSizing:'border-box' }} />
          </div>
          {p.fields.map(field => (
            <div key={field.key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>{field.label}</label>
              <div style={{ position:'relative' }}>
                <input type={field.type==='password'&&!showFields[field.key]?'password':'text'} placeholder={field.placeholder} value={fields[field.key]||''} onChange={e => setFields(f => ({...f,[field.key]:e.target.value}))}
                  style={{ width:'100%', padding:`10px ${field.type==='password'?'38px':'12px'} 10px 12px`, border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, fontFamily:'monospace', boxSizing:'border-box' }} />
                {field.type==='password' && (
                  <button onClick={() => setShowFields(s => ({...s,[field.key]:!s[field.key]}))} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                    {showFields[field.key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                )}
              </div>
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>ℹ {field.help}</p>
            </div>
          ))}
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#1d4ed8', lineHeight:1.6 }}>
            📖 <a href={p.docs} target="_blank" rel="noopener noreferrer" style={{ color:'#1d4ed8', fontWeight:600 }}>View {p.name} docs</a> — {p.note}
          </div>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#dc2626' }}>{error}</div>}
          {success ? (
            <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:10, padding:14, textAlign:'center', fontSize:14, fontWeight:700, color:'#16a34a' }}>✅ {success}</div>
          ) : (
            <button onClick={handleSave} disabled={loading} style={{ ...gradBtn(false), width:'100%', justifyContent:'center', padding:'13px' }}>
              {loading ? 'Saving...' : 'Save DNS Provider'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Server Modal ─────────────────────────────────────────────────
function AddServerModal({ onSave, onClose, userId, editServer }) {
  const isEdit = !!editServer
  const [type, setType] = useState(editServer?.server_type || 'cpanel')
  const [nickname, setNickname] = useState(editServer?.nickname || '')
  const [fields, setFields] = useState({})
  const [showPwd, setShowPwd] = useState({})
  const [domains, setDomains] = useState((editServer?.domains||[]).join(', '))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const t = SERVER_TYPES[type]

  const handleSave = async () => {
    if (!nickname.trim()) { setError('Please enter a nickname'); return }
    if (!fields.host?.trim()) { setError(`Please enter the ${t.fields[0].label}`); return }
    if (!fields.username?.trim()) { setError('Please enter the username'); return }
    if (!isEdit && !fields[t.fields[2]?.key]?.trim()) { setError(`Please enter the ${t.fields[2]?.label}`); return }
    setError(''); setLoading(true)
    try {
      const credKey = t.fields[2]?.key || 'api_token'
      const credentials_enc = btoa(JSON.stringify({ [credKey]: fields[credKey]||'' }))
      const domainsArr = domains.split(',').map(d=>d.trim()).filter(Boolean)
      const payload = { action: isEdit?'update':'save', user_id:userId, nickname:nickname.trim(), server_type:type, host:fields.host.trim(), username:fields.username.trim(), credentials_enc, domains:domainsArr }
      if (isEdit) payload.id = editServer.id
      const res = await fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess(isEdit ? 'Server updated!' : 'Server saved!')
      setTimeout(() => { onSave(); onClose() }, 1000)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(2px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:540, boxShadow:'0 32px 80px rgba(15,23,42,0.3)', maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 28px 18px', borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 4px rgba(37,99,235,0.1)' }}>
              <span style={{ fontSize:18 }}>🖥️</span>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:'#0f172a' }}>{isEdit?'Edit Server':'Add Server'}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>Encrypted · Auto-fills on install</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#94a3b8' }}>✕</button>
        </div>
        <div style={{ padding:'24px 28px' }}>
          {/* Server type */}
          {!isEdit && (
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:10 }}>Server Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {Object.entries(SERVER_TYPES).map(([key, val]) => (
                  <button key={key} onClick={() => { setType(key); setFields({}) }}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 10px', borderRadius:12, border:`2px solid ${type===key?val.color:'#e2e8f0'}`, background:type===key?val.bg:'white', cursor:'pointer', transition:'all 0.15s', position:'relative' }}>
                    <span style={{ fontSize:24 }}>{val.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:type===key?val.color:'#475569' }}>{val.short}</span>
                    {type===key && <div style={{ position:'absolute', top:6, right:6, width:16, height:16, borderRadius:'50%', background:val.color, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ color:'white', fontSize:9, fontWeight:900 }}>✓</span></div>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:8, background:'#f8fafc', borderRadius:8, padding:'8px 12px', border:'1px solid #f1f5f9' }}>💡 {t.desc}</div>
            </div>
          )}
          {/* Nickname */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Nickname</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder={`e.g. My ${t.short} Hosting`}
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, boxSizing:'border-box' }} />
          </div>
          {/* Dynamic fields */}
          {t.fields.map(f => (
            <div key={f.key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>{f.label}{isEdit&&f.type==='password'&&<span style={{ color:'#94a3b8', fontWeight:400 }}> — leave blank to keep existing</span>}</label>
              <div style={{ position:'relative' }}>
                <input type={f.type==='password'&&!showPwd[f.key]?'password':'text'} value={fields[f.key]||''} onChange={e => setFields(p => ({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                  style={{ width:'100%', padding:`10px ${f.type==='password'?'38px':'12px'} 10px 12px`, border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, fontFamily:f.type==='password'?'monospace':'inherit', boxSizing:'border-box' }} />
                {f.type==='password' && (
                  <button onClick={() => setShowPwd(s => ({...s,[f.key]:!s[f.key]}))} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                    {showPwd[f.key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                )}
              </div>
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>ℹ {f.help}</p>
            </div>
          ))}
          {/* Domains */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Associated Domains <span style={{ color:'#94a3b8', fontWeight:400 }}>— optional</span></label>
            <input value={domains} onChange={e => setDomains(e.target.value)} placeholder="example.com, shop.example.com"
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, fontFamily:'monospace', boxSizing:'border-box' }} />
            <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>When installing a cert for these domains, this server will auto-select.</p>
          </div>
          {/* Security */}
          <div style={{ background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', gap:10 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>🔒</span>
            <p style={{ fontSize:12, color:'#15803d', lineHeight:1.6, margin:0 }}><strong>AES-256-GCM encrypted</strong> before storage. Credentials never leave the browser unencrypted. Only you can access them via Row-Level Security.</p>
          </div>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#dc2626' }}>{error}</div>}
          {success ? (
            <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:10, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:4 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:14, color:'#16a34a' }}>{success}</div>
            </div>
          ) : (
            <button onClick={handleSave} disabled={loading}
              style={{ width:'100%', padding:13, background:`linear-gradient(135deg,${t.color},${t.color}cc)`, color:'white', border:'none', borderRadius:11, fontSize:14, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 14px ${t.color}40`, letterSpacing:'-0.2px' }}>
              {loading ? 'Saving...' : (isEdit ? 'Update Server' : 'Save Server')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Server Card ──────────────────────────────────────────────────────
// ── Install Agent Modal ──────────────────────────────────────────────
function InstallAgentModal({ server, userId, onClose, onRegistered }) {
  const [checking, setChecking] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate a stable token for this server
  const agentToken = btoa(`${userId}:${server.id}:sslvault-agent`).replace(/[^a-zA-Z0-9]/g,'').slice(0,48)
  const installCmd = `curl -fsSL https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=${agentToken} --server-id=${server.id} --user-id=${userId} --nickname="${server.nickname}"`

  const copy = () => {
    navigator.clipboard.writeText(installCmd)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Poll for registration
  useEffect(() => {
    const interval = setInterval(async () => {
      setChecking(true)
      try {
        const res = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'list_agents', user_id: userId }) })
        const data = await res.json()
        const found = (data.agents||[]).find(a => a.server_id === server.id)
        if (found) {
          setRegistered(true)
          clearInterval(interval)
          setTimeout(() => { onRegistered(); onClose() }, 2000)
        }
      } catch(e) {}
      setChecking(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(2px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:560, boxShadow:'0 32px 80px rgba(15,23,42,0.3)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, background:'rgba(255,255,255,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🤖</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'white' }}>Install Agent on {server.nickname}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>One command — zero-touch installs forever</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'white', fontSize:18 }}>✕</button>
        </div>

        <div style={{ padding:'24px' }}>
          {registered ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:800, fontSize:18, color:'#16a34a', marginBottom:6 }}>Agent Registered!</div>
              <div style={{ fontSize:14, color:'#64748b' }}>{server.nickname} is now fully automated.</div>
            </div>
          ) : (
            <>
              {/* What this does */}
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:14, marginBottom:18 }}>
                <p style={{ fontWeight:700, fontSize:13, color:'#0f172a', marginBottom:8 }}>What this does:</p>
                {['Installs a lightweight background service (~2MB RAM)','Registers your server with SSLVault automatically','Handles all future cert installs — no SSH needed','Auto-renewals install directly — fully hands-off','Runs on every boot, restarts if it crashes'].map((t,i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'#475569', marginBottom:4 }}>
                    <span style={{ color:'#16a34a', fontWeight:700, flexShrink:0 }}>✓</span> {t}
                  </div>
                ))}
              </div>

              {/* Command */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 }}>
                  SSH into your server and run this command:
                </label>
                <div style={{ background:'#0f172a', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      {['#ef4444','#f59e0b','#10b981'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
                    </div>
                    <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color:copied?'#34d399':'#64748b', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                      {copied ? '✓ Copied!' : '⎘ Copy'}
                    </button>
                  </div>
                  <pre style={{ margin:0, padding:'14px 16px', color:'#e2e8f0', fontSize:11, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7 }}>{installCmd}</pre>
                </div>
              </div>

              {/* Requirements */}
              <div style={{ background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:8, padding:'10px 14px', marginBottom:18, fontSize:12, color:'#64748b' }}>
                <strong style={{ color:'#475569' }}>Requirements:</strong> Ubuntu 20/22/24, Debian 10/11/12, CentOS 7/8/9, Amazon Linux 2/2023 · Nginx or Apache · sudo access
              </div>

              {/* Waiting indicator */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:10, fontSize:13, color:'#15803d' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite', flexShrink:0 }} />
                <span>{checking ? 'Checking registration...' : 'Waiting for agent to register — this page updates automatically when it connects'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AgentBadge({ agent }) {
  if (!agent) return (
    <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:4, padding:'2px 7px' }}>⚫ No Agent</span>
  )
  const lastSeen = agent.last_seen_at ? Math.floor((Date.now() - new Date(agent.last_seen_at)) / 60000) : null
  const isActive = lastSeen !== null && lastSeen < 15
  return (
    <span style={{ fontSize:10, fontWeight:700, color:isActive?'#16a34a':'#d97706', background:isActive?'#f0fdf4':'#fffbeb', border:`1px solid ${isActive?'#a7f3d0':'#fde68a'}`, borderRadius:4, padding:'2px 7px' }}>
      {isActive ? '🟢' : '🟡'} Agent {isActive ? `Active · ${lastSeen}m ago` : lastSeen !== null ? `Inactive · ${lastSeen}m ago` : 'Registered'}
    </span>
  )
}

function ServerCard({ server, onDelete, onEdit, agent, onInstallAgent }) {
  const t = SERVER_TYPES[server.server_type] || SERVER_TYPES.cpanel
  const isVPS = server.server_type === 'ssh'
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(15,23,42,0.04)', display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:t.bg, border:`1.5px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
        {t.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
          <span style={{ fontWeight:800, fontSize:14, color:'#0f172a', letterSpacing:'-0.2px' }}>{server.nickname}</span>
          <TypeChip type={server.server_type} />
          <span style={{ fontSize:10, fontWeight:700, color:'#16a34a', background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:4, padding:'2px 7px' }}>🔒 Encrypted</span>
          <AgentBadge agent={agent} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#64748b', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'monospace', background:'#f8fafc', border:'1px solid #f1f5f9', borderRadius:5, padding:'2px 7px' }}>{server.username}@{server.host}</span>
          <span>Added {new Date(server.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
        </div>
        {server.domains?.length > 0 && (
          <div style={{ display:'flex', gap:5, marginTop:7, flexWrap:'wrap' }}>
            {server.domains.map(d => <span key={d} style={{ fontFamily:'monospace', fontSize:11, background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:5, padding:'2px 8px' }}>{d}</span>)}
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:7, flexShrink:0, flexWrap:'wrap' }}>
        {isVPS && !agent && (
          <button onClick={() => onInstallAgent(server)}
            style={{ background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', border:'none', color:'white', cursor:'pointer', borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5, boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
            🤖 Install Agent
          </button>
        )}
        <button onClick={() => onEdit(server)} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', color:'#475569', cursor:'pointer', borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:600 }}>✏️ Edit</button>
        <button onClick={() => onDelete(server.id)} style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', borderRadius:8, padding:'7px 10px', fontSize:12, fontWeight:600 }}><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function DnsProviders({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab]               = useState('dns')
  const [credentials, setCredentials] = useState([])
  const [servers, setServers]       = useState([])
  const [agents, setAgents]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAddDns, setShowAddDns] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [editServer, setEditServer] = useState(null)
  const [agentServer, setAgentServer] = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [testing, setTesting]       = useState(null)
  const [testResult, setTestResult] = useState({})

  useEffect(() => {
    if (!authLoading && user) loadAll()
    if (!authLoading && !user) setLoading(false)
  }, [user, authLoading])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadCredentials(), loadServers(), loadAgents()])
    setLoading(false)
  }

  const loadAgents = async () => {
    try {
      const res = await fetch(DAEMON_FN, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'list_agents', user_id: user.id }) })
      const data = await res.json()
      setAgents(data.agents || [])
    } catch(e) {}
  }

  const loadCredentials = async () => {
    const res = await fetch(DNS_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'list', user_id:user.id }) })
    const data = await res.json()
    setCredentials(data.credentials || [])
  }

  const loadServers = async () => {
    const res = await fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'list', user_id:user.id }) })
    const data = await res.json()
    setServers(data.servers || [])
  }

  const deleteCredential = async (id) => {
    if (!confirm('Delete this DNS provider?')) return
    setDeleting(id)
    await fetch(DNS_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', user_id:user.id, id }) })
    setCredentials(c => c.filter(x => x.id !== id))
    setDeleting(null)
  }

  const deleteServer = async (id) => {
    if (!confirm('Delete this server?')) return
    setDeleting(id)
    await fetch(SERVER_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', user_id:user.id, id }) })
    setServers(s => s.filter(x => x.id !== id))
    setDeleting(null)
  }

  const testProvider = async (cred) => {
    setTesting(cred.id); setTestResult(t => ({ ...t, [cred.id]: null }))
    try {
      const res = await fetch(DNS_FN, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'test', user_id:user.id, domain:cred.domain_pattern.replace('*.','') }) })
      const data = await res.json()
      setTestResult(t => ({ ...t, [cred.id]: data }))
    } catch(e) { setTestResult(t => ({ ...t, [cred.id]: { ok:false, message:e.message } })) }
    setTesting(null)
  }

  // ── Logged-out view ──
  if (!authLoading && !user) return (
    <div style={{ background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)', minHeight:'calc(100vh - 56px)', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />
      <div style={{ position:'relative', maxWidth:1140, margin:'0 auto', padding:'72px 24px 64px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #bfdbfe', borderRadius:100, padding:'5px 14px', marginBottom:20, boxShadow:'0 2px 8px rgba(37,99,235,0.1)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 0 2px rgba(34,197,94,0.25)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', letterSpacing:'0.5px' }}>DNS + Servers · {Object.keys(PROVIDERS).length} DNS providers · 3 server types</span>
          </div>
          <h1 style={{ fontSize:42, fontWeight:900, color:'#0f172a', lineHeight:1.06, letterSpacing:'-1.8px', marginBottom:8 }}>One place for all your</h1>
          <h1 style={{ fontSize:42, fontWeight:900, lineHeight:1.06, letterSpacing:'-1.8px', marginBottom:14, background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>access credentials.</h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.7, maxWidth:540, margin:'0 auto' }}>Store DNS provider keys and server credentials once. Auto-DNS, auto-install, auto-renewal.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:40 }}>
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <div key={key} style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:14, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:46, height:46, borderRadius:11, background:'linear-gradient(135deg,#f8fafc,#eff6ff)', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{p.icon}</div>
              <div><div style={{ fontSize:14, fontWeight:800, color:'#0f172a', marginBottom:3 }}>{p.name}</div><div style={{ fontSize:11, color:'#64748b' }}>DNS · {p.fields.length} fields</div></div>
            </div>
          ))}
          {Object.entries(SERVER_TYPES).map(([key, t]) => (
            <div key={key} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:14, padding:20, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:46, height:46, borderRadius:11, background:'white', border:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{t.icon}</div>
              <div><div style={{ fontSize:14, fontWeight:800, color:t.color, marginBottom:3 }}>{t.short}</div><div style={{ fontSize:11, color:'#94a3b8' }}>Server</div></div>
            </div>
          ))}
        </div>
        <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:18, padding:36, textAlign:'center', boxShadow:'0 12px 40px rgba(15,23,42,0.06)' }}>
          <div style={{ width:54, height:54, background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', boxShadow:'0 0 0 6px rgba(37,99,235,0.08),0 8px 20px rgba(37,99,235,0.3)' }}><Shield size={26} color="white" strokeWidth={2}/></div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#0f172a', letterSpacing:'-0.6px', marginBottom:8 }}>Sign in to manage credentials</h2>
          <p style={{ color:'#64748b', fontSize:14, maxWidth:440, margin:'0 auto 24px', lineHeight:1.65 }}>Credentials are encrypted at rest and only used for automation.</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => nav('/auth')} style={{ ...gradBtn(false), padding:'13px 24px', fontSize:14 }}>Sign in to continue</button>
            <button onClick={() => nav('/install')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'white', color:'#374151', border:'1.5px solid #e2e8f0', padding:'13px 22px', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer' }}>See install guide</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Logged-in view ──
  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 60px)', padding:'40px 0 80px' }}>
      <div className="container">
        {showAddDns    && <AddProviderModal userId={user?.id} onSave={loadCredentials} onClose={() => setShowAddDns(false)} />}
        {showAddServer && <AddServerModal  userId={user?.id} onSave={loadServers}     onClose={() => setShowAddServer(false)} />}
        {editServer    && <AddServerModal  userId={user?.id} onSave={loadServers}     onClose={() => setEditServer(null)} editServer={editServer} />}
        {agentServer   && <InstallAgentModal server={agentServer} userId={user?.id} onClose={() => setAgentServer(null)} onRegistered={loadAgents} />}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.5px', marginBottom:4, color:'var(--text)' }}>DNS Providers & Servers</h1>
            <p style={{ color:'var(--text2)', fontSize:14 }}>Manage credentials for automatic DNS and one-click certificate installation</p>
          </div>
          <button onClick={() => tab==='dns' ? setShowAddDns(true) : setShowAddServer(true)} style={gradBtn(false)}>
            <Plus size={14}/> {tab==='dns' ? 'Add Provider' : 'Add Server'}
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:4, marginBottom:24, background:'white', padding:4, borderRadius:14, border:'1px solid #e2e8f0', width:'fit-content', boxShadow:'0 1px 4px rgba(15,23,42,0.06)' }}>
          {[
            { id:'dns',     label:'DNS Providers', count:credentials.length, icon:'🌐' },
            { id:'servers', label:'Servers',        count:servers.length,     icon:'🖥️', isNew:true },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:11, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, transition:'all 0.15s',
                background: tab===t.id ? 'linear-gradient(135deg,#1d4ed8,#4f46e5)' : 'transparent',
                color: tab===t.id ? 'white' : 'var(--text2)',
                boxShadow: tab===t.id ? '0 4px 12px rgba(37,99,235,0.35)' : 'none' }}>
              <span>{t.icon}</span><span>{t.label}</span>
              <span style={{ background:tab===t.id?'rgba(255,255,255,0.22)':'#f1f5f9', color:tab===t.id?'white':'var(--text3)', borderRadius:100, padding:'1px 8px', fontSize:11, fontWeight:800 }}>{t.count}</span>
              {t.isNew && <span style={{ background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:800 }}>NEW</span>}
            </button>
          ))}
        </div>

        {/* ── DNS TAB ── */}
        {tab === 'dns' && (
          <>
            <div style={sectionCard(true)}>
              <h2 style={{ fontWeight:800, fontSize:16, marginBottom:16, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>⚡ How Automatic DNS Works</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                {[['1','Configure Provider','Add your DNS provider API credentials. Encrypted with AES-256 before storage.'],['2','Generate Certificate','We auto-detect your provider and create the _acme-challenge TXT record.'],['3','Instant Verification','No manual DNS steps. Record is added automatically and verification happens seamlessly.']].map(([n,title,desc]) => (
                  <div key={n} style={{ display:'flex', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>{n}</div>
                    <div><p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{title}</p><p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13, color:'#92400e' }}>
              🔒 <strong>Security:</strong> API credentials are encrypted with AES-256-GCM. Private keys are never returned to the browser. Only you can access via Row-Level Security.
            </div>
            <div style={sectionCard(false)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <h2 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>Configured Providers {credentials.length>0 && <span style={{ fontSize:13, color:'var(--text3)', fontWeight:400 }}>({credentials.length})</span>}</h2>
                <button onClick={() => setShowAddDns(true)} style={gradBtn(true)}><Plus size={13}/> Add Provider</button>
              </div>
              {loading ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>Loading...</div>
              : credentials.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🌐</div>
                  <p style={{ fontWeight:600, color:'var(--text2)', marginBottom:8 }}>No DNS providers configured yet</p>
                  <p style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Add a provider to enable automatic DNS challenge during cert generation</p>
                  <button onClick={() => setShowAddDns(true)} style={gradBtn(false)}><Plus size={14}/> Add Your First Provider</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {credentials.map(cred => (
                    <div key={cred.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                      <span style={{ fontSize:28 }}>{PROVIDERS[cred.provider]?.icon||'🔧'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, color:PROVIDERS[cred.provider]?.color||'#475569', background:`${PROVIDERS[cred.provider]?.color||'#475569'}12`, border:`1px solid ${PROVIDERS[cred.provider]?.color||'#475569'}28` }}>{cred.provider}</span>
                          <span style={{ fontWeight:700, fontSize:14, fontFamily:'monospace', color:'var(--text)' }}>{cred.domain_pattern}</span>
                          {cred.label && cred.label!==cred.domain_pattern && <span style={{ fontSize:12, color:'var(--text3)' }}>"{cred.label}"</span>}
                        </div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>Added {new Date(cred.created_at).toLocaleDateString()} · 🔒 Encrypted</div>
                        {testResult[cred.id] && <div style={{ marginTop:8, fontSize:12, padding:'6px 10px', borderRadius:6, background:testResult[cred.id].ok?'#f0fdf4':'#fef2f2', color:testResult[cred.id].ok?'#16a34a':'#dc2626', border:`1px solid ${testResult[cred.id].ok?'#a7f3d0':'#fecaca'}` }}>{testResult[cred.id].ok?'✅':'❌'} {testResult[cred.id].message}</div>}
                      </div>
                      <div style={{ display:'flex', gap:7, flexShrink:0 }}>
                        <button onClick={() => testProvider(cred)} disabled={testing===cred.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}><RefreshCw size={12}/> Test</button>
                        <button onClick={() => deleteCredential(cred.id)} disabled={deleting===cred.id} style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', borderRadius:8, padding:'6px 10px', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600 }}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {credentials.length > 0 && (
              <div style={{ marginTop:8, background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:14, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                <div>
                  <p style={{ fontWeight:700, color:'white', fontSize:16, marginBottom:4 }}>Ready to generate certificates automatically!</p>
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>DNS records created automatically for your configured domains.</p>
                </div>
                <button onClick={() => nav('/generate')} style={{ background:'white', color:'#1d4ed8', border:'none', padding:'10px 22px', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}><Shield size={15}/> Generate Certificate</button>
              </div>
            )}
          </>
        )}

        {/* ── SERVERS TAB ── */}
        {tab === 'servers' && (
          <>
            <div style={sectionCard(true)}>
              <h2 style={{ fontWeight:800, fontSize:16, marginBottom:16, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>⚡ How Server Auto-Install Works</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                {[['1','Save server once','Add cPanel, SSH, or Plesk credentials. AES-256-GCM encrypted before storage.'],['2','Issue your cert','Generate your SSL certificate as normal from the dashboard.'],['3','One-click install','Hit Install → pick your saved server → done. No re-entering credentials ever again.']].map(([n,title,desc]) => (
                  <div key={n} style={{ display:'flex', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#1d4ed8,#4f46e5)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>{n}</div>
                    <div><p style={{ fontWeight:700, fontSize:13, marginBottom:4, color:'var(--text)' }}>{title}</p><p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={sectionCard(false)}>
              <h2 style={{ fontWeight:800, fontSize:16, marginBottom:14, color:'var(--text)' }}>Supported Server Types</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {Object.entries(SERVER_TYPES).map(([key, val]) => (
                  <div key={key} style={{ border:`1.5px solid ${val.border}`, borderRadius:12, padding:'14px 16px', background:val.bg, display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'white', border:`1px solid ${val.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{val.icon}</div>
                    <div><div style={{ fontWeight:800, fontSize:13, color:val.color }}>{val.short}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{val.desc.split(',')[0]}</div></div>
                  </div>
                ))}
                {[['Route53','🟠'],['Nginx Agent','🔧']].map(([name,icon]) => (
                  <div key={name} style={{ border:'1px solid #f1f5f9', borderRadius:12, padding:'14px 16px', background:'#fafafa', display:'flex', alignItems:'center', gap:12, opacity:0.5 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'white', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{icon}</div>
                    <div><div style={{ fontWeight:700, fontSize:13, color:'#475569' }}>{name}</div><div style={{ fontSize:11, color:'#94a3b8' }}>Coming soon</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:13, color:'#92400e' }}>
              🔒 <strong>Security:</strong> All credentials encrypted with AES-256-GCM. SSH keys never leave the browser unencrypted. Only accessible via Row-Level Security.
            </div>
            <div style={sectionCard(false)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <h2 style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>Saved Servers {servers.length>0 && <span style={{ fontSize:13, color:'var(--text3)', fontWeight:400 }}>({servers.length})</span>}</h2>
                <button onClick={() => setShowAddServer(true)} style={gradBtn(true)}><Plus size={13}/> Add Server</button>
              </div>
              {loading ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text3)' }}>Loading...</div>
              : servers.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🖥️</div>
                  <p style={{ fontWeight:600, color:'var(--text2)', marginBottom:8 }}>No servers saved yet</p>
                  <p style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Add a server to enable one-click certificate installation</p>
                  <button onClick={() => setShowAddServer(true)} style={gradBtn(false)}><Plus size={14}/> Add Your First Server</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {servers.map(s => <ServerCard key={s.id} server={s} onDelete={deleteServer} onEdit={setEditServer} agent={agents.find(a => a.server_id === s.id) || null} onInstallAgent={setAgentServer} />)}
                </div>
              )}
            </div>
            {servers.length > 0 && (
              <div style={{ marginTop:8, background:'linear-gradient(135deg,#1e40af,#2563eb)', borderRadius:14, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                <div>
                  <p style={{ fontWeight:700, color:'white', fontSize:16, marginBottom:4 }}>Ready for one-click installation!</p>
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>Your servers are saved. Hit Install on any certificate to deploy instantly.</p>
                </div>
                <button onClick={() => nav('/dashboard')} style={{ background:'white', color:'#1d4ed8', border:'none', padding:'10px 22px', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}><Server size={15}/> Go to Dashboard</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
