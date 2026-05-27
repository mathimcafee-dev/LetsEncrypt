import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Plus, Search, ChevronRight, ChevronDown, Copy, Eye, EyeOff,
  RefreshCw, RotateCcw, Download, X, AlertTriangle, Check, Trash2, FileText, Key, Lock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { differenceInDays, format } from 'date-fns'
import AgentInstall from '../components/AgentInstall'
import CpanelInstall from '../components/CpanelInstall'
import '../styles/design-v2.css'


function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}
function fmtDate(iso) {
  if (!iso) return '—'
  try { return format(new Date(iso), 'M/d/yyyy') } catch { return '—' }
}
function fmtDateFull(iso) {
  if (!iso) return '—'
  try { return format(new Date(iso), 'MM/dd/yyyy h:mm aa') } catch { return '—' }
}

function statusInfo(days, status) {
  if (status === 'revoked')         return { label:'Cancelled',  color:'#f87171', bg:'rgba(192,57,43,0.12)', border:'rgba(192,57,43,0.25)' }
  if (status === 'sandbox_revoked') return { label:'Revoked',    color:'#b0a8a0', bg:'var(--v2-border)', border:'var(--v2-border)' }
  if (days != null && days < 0)     return { label:'Expired',    color:'#f87171', bg:'rgba(192,57,43,0.12)', border:'rgba(192,57,43,0.25)' }
  if (days != null && days <= 7)    return { label:'Exp. Soon',  color:'#ff8c7a', bg:'rgba(230,126,34,0.08)', border:'rgba(192,57,43,0.25)' }
  if (days != null && days <= 30)   return { label:'Expiring',   color:'#ffffff', bg:'rgba(230,126,34,0.1)', border:'rgba(230,126,34,0.2)' }
  if (status === 'active')          return { label:'Active',     color:'#ffffff', bg:'transparent', border:'rgba(192,57,43,0.3)' }
  return                                   { label:'Pending',    color:'#ff8c7a', bg:'rgba(230,126,34,0.08)', border:'rgba(192,57,43,0.25)' }
}

const PRODUCT_NAMES = {
  rapidssl: 'RapidSSL Standard DV SSL',
  positivessl: 'RapidSSL DV',
  rapidssl_wildcard: 'RapidSSL Wildcard DV SSL',
}
function productName(code, certType) {
  return PRODUCT_NAMES[code] || certType || 'SSL Certificate'
}

const btnStyle = {
  fontSize:11, fontWeight:500, color:'#e8e0d8', padding:'5px 9px',
  border:'0.5px solid var(--v2-border)', borderRadius:5, background:'var(--v2-surface)',
  cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:'inherit'
}

// ── Detail panel ──────────────────────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function CertDetail({ cert, order, onClose, onDelete, onKeyDeleted, onInstall, onIssue, onRefresh }) {
  const [showKey, setShowKey]       = useState(false)
  const [copiedField, setCopied]    = useState(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revoking, setRevoking]     = useState(false)
  const [revokeError, setRevokeErr] = useState('')
  const [keyDelOpen, setKeyDelOpen] = useState(false)
  const [keyDeleting, setKeyDeling] = useState(false)
  const [keyChecks, setKeyChecks]   = useState({ downloaded:false, installed:false, understand:false })
  const [keyDeleted, setKeyDeleted] = useState(!cert.private_key_pem)
  const [delConfirm, setDelConfirm] = useState(false)
  const [certOpen, setCertOpen]     = useState(false)

  const days = daysLeft(cert.expires_at)
  const isRevoked = cert.status === 'revoked' || cert.status === 'sandbox_revoked'
  const allChecked = keyChecks.downloaded && keyChecks.installed && keyChecks.understand
  const si = statusInfo(days, cert.status)
  const validityDays = cert.issued_at && cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date(cert.issued_at)) : null

  const copy = (text, field) => {
    navigator.clipboard.writeText(text || '')
    setCopied(field); setTimeout(() => setCopied(null), 1500)
  }
  const dl = (text, filename) => {
    const blob = new Blob([text], { type:'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }
  const downloadZip = async () => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    document.head.appendChild(script)
    await new Promise(r => script.onload = r)
    const zip = new window.JSZip()
    const folder = zip.folder(cert.domain)
    const decKey = p => { if (!p) return ''; try { if (p.includes('%')) return decodeURIComponent(p) } catch(e){} return p }
    if (cert.cert_pem) folder.file(`${cert.domain}-certificate.crt`, cert.cert_pem)
    if (cert.private_key_pem) folder.file(`${cert.domain}-private-key.key`, decKey(cert.private_key_pem))
    const blocks = (cert.cert_pem||'').match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)||[]
    if (blocks.length > 1) { folder.file(`${cert.domain}-ca-bundle.crt`, blocks.slice(1).join('\n')); folder.file(`${cert.domain}-fullchain.pem`, cert.cert_pem) }
    folder.file('README.txt', `SSL Certificate for ${cert.domain}\nGenerated by SSLVault\nIssued: ${fmtDate(cert.issued_at)}\nExpires: ${fmtDate(cert.expires_at)}\n`)
    const blob = await zip.generateAsync({ type:'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${cert.domain}-ssl-certificate.zip`; a.click()
    URL.revokeObjectURL(url)
  }
  const doRevoke = async () => {
    setRevoking(true); setRevokeErr('')
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const res = await fetch(TSS_FN, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token}` }, body:JSON.stringify({ action:'revoke', cert_id:cert.id, revoke_reason:'Unspecified' }) })
      const data = await res.json()
      if (!data.ok) { setRevokeErr(data.error || 'Revocation failed'); setRevoking(false); return }
      setRevokeOpen(false); setRevoking(false); onDelete(cert.id)
    } catch(e) { setRevokeErr(String(e)); setRevoking(false) }
  }
  const doDeleteKey = async () => {
    setKeyDeling(true)
    const { error } = await supabase.from('certificates').update({ private_key_pem:null }).eq('id', cert.id)
    setKeyDeling(false)
    if (!error) { setKeyDeleted(true); setKeyDelOpen(false); onKeyDeleted?.(cert.id) }
  }

  const InfoRow = ({ label, value, mono, color, copiable }) => (
    <tr style={{ borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
      <td style={{ padding:'9px 16px 9px 0', fontSize:12, color:'#b0a8a0', whiteSpace:'nowrap', width:160, verticalAlign:'middle' }}>{label}</td>
      <td style={{ padding:'9px 0', verticalAlign:'middle' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:mono?11:12, color:color||'var(--v2-text)', fontFamily:mono?"'JetBrains Mono','Menlo',monospace":'inherit', wordBreak:'break-all' }}>{value || '—'}</span>
          {copiable && value && (
            <button onClick={() => copy(value, label)} style={{ flexShrink:0, background:'none', border:'none', cursor:'pointer', color:'#b0a8a0', padding:0 }}>
              {copiedField===label ? <Check size={12} color="#c0392b"/> : <Copy size={12}/>}
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  const ActionBtn = ({ icon:Icon, label, onClick, color='var(--v2-text)', disabled }) => (
    <button onClick={onClick} disabled={disabled} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 14px', fontSize:12, fontWeight:500, background:'var(--v2-surface)', color, border:'0.5px solid var(--v2-border)', borderRadius:6, cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', opacity:disabled?0.5:1 }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background='#000000')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background='var(--v2-surface)')}
    >
      {Icon && <Icon size={13}/>} {label}
    </button>
  )

  return (
    <div style={{ borderTop:'2px solid #c0392b', background:'var(--v2-bg)' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', background:'var(--v2-surface)', borderBottom:'0.5px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:'#ffffff' }}>{productName(order?.product_code, cert.cert_type)}</div>
          <div style={{ fontSize:12, color:'#b0a8a0', marginTop:2, fontFamily:"'JetBrains Mono','Menlo',monospace" }}>{cert.domain}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#b0a8a0', padding:4 }}><X size={16}/></button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) clamp(220px,23vw,280px)' }}>
        {/* Main */}
        <div style={{ padding:'20px 24px', borderRight:'0.5px solid var(--v2-border)' }}>

          {/* Two-col info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:24, marginBottom:20 }}>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <tbody>
                <InfoRow label="Product Name"    value={productName(order?.product_code, cert.cert_type)}/>
                <InfoRow label="Domain Name"     value={cert.domain} mono/>
                <InfoRow label="Certificate Start"  value={fmtDate(cert.issued_at)}/>
                <InfoRow label="Certificate Expiry" value={fmtDate(cert.expires_at)} color={days!=null&&days<30?'#e07060':undefined}/>
                <InfoRow label="Certificate Validity" value={validityDays ? `${validityDays} Days` : '—'}/>
                <InfoRow label="Order Status" value={
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:si.color, fontWeight:600 }}>{si.label}</span>
                    <button onClick={onRefresh} style={{ background:'none', border:'none', cursor:'pointer', color:'#ffffff', padding:0, display:'flex' }}><RefreshCw size={11}/></button>
                  </span>
                }/>
              </tbody>
            </table>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <tbody>
                <InfoRow label="Order Date"     value={fmtDateFull(order?.created_at || cert.created_at)}/>
                <InfoRow label="Order Expiration" value={order?.years ? fmtDate(new Date(new Date(order.created_at).getTime() + order.years*365*86400000).toISOString()) : '—'}/>
                <InfoRow label="Validity"       value={order?.years ? `${order.years} Year${order.years>1?'s':''}` : '1 Year'}/>
                <InfoRow label="Vendor Status"  value={(order?.minor_status||cert.status||'').toUpperCase()} color="#c0392b"/>
                <InfoRow label="Install Method" value={cert.install_method ? cert.install_method.toUpperCase() : '—'}/>
                <InfoRow label="Install Status" value={cert.install_status === 'success' ? (cert.install_verified ? '✓ Verified Live' : 'Installed') : (cert.install_status||'Not installed')} color={cert.install_status==='success'?'#f0ede8':'rgba(240,237,232,0.4)'}/>
                <InfoRow label="Environment"    value={cert.is_sandbox?'Sandbox':'Production'} color={cert.is_sandbox?'#e07060':'#f0ede8'}/>
              </tbody>
            </table>
          </div>

          {/* Certificate Details expandable */}
          <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
            <button onClick={() => setCertOpen(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--v2-text)', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--v2-surface)' }}>Certificate Details</span>
              <span style={{ color:'var(--v2-surface)' }}>{certOpen ? <ChevronDown size={14}/> : <Plus size={14}/>}</span>
            </button>
            {certOpen && (
              <div style={{ padding:16, background:'var(--v2-surface)', display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Certificate (CRT)', key:'cert_pem',         icon:FileText, filename:`${cert.domain}-cert.pem` },
                  { label:'Private Key',       key:'private_key_pem',  icon:Key,      filename:`${cert.domain}-key.pem`, sensitive:true },
                ].map(({ label, key, icon:Icon, filename, sensitive }) => (
                  <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', border:'0.5px solid var(--v2-border)', borderRadius:6, fontSize:12 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:8, color:'#ffffff' }}>
                      <Icon size={13} color="rgba(240,237,232,0.4)"/> {label}
                      {sensitive && keyDeleted && <span style={{ fontSize:9, fontWeight:500, color:'#e8e0d8', background:'var(--v2-border)', padding:'1px 6px', borderRadius:3 }}>DELETED</span>}
                    </span>
                    {sensitive && keyDeleted ? (
                      <span style={{ fontSize:11, color:'#b0a8a0' }}>Removed from vault</span>
                    ) : cert[key] ? (
                      <div style={{ display:'flex', gap:6 }}>
                        {sensitive && <button onClick={() => setShowKey(v=>!v)} style={btnStyle}>{showKey?<><EyeOff size={11}/> Hide</>:<><Eye size={11}/> Show</>}</button>}
                        <button onClick={() => copy(cert[key], key)} style={btnStyle}>{copiedField===key?<><Check size={11}/> Copied</>:<><Copy size={11}/> Copy</>}</button>
                        <button onClick={() => dl(cert[key], filename)} style={btnStyle}><Download size={11}/></button>
                      </div>
                    ) : <span style={{ fontSize:11, color:'#b0a8a0' }}>Not available</span>}
                  </div>
                ))}
                {showKey && cert.private_key_pem && !keyDeleted && (
                  <pre style={{ background:'var(--v2-bg)', border:'0.5px solid var(--v2-border)', borderRadius:6, padding:10, fontSize:10, color:'#e8e0d8', overflow:'auto', maxHeight:120, margin:0, fontFamily:"'JetBrains Mono','Menlo',monospace" }}>{cert.private_key_pem}</pre>
                )}
                {!keyDeleted && cert.private_key_pem && !keyDelOpen && (
                  <button onClick={() => setKeyDelOpen(true)} style={{ alignSelf:'flex-start', fontSize:10, color:'#b0a8a0', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', textDecoration:'underline' }}>Delete private key after install</button>
                )}
                {keyDelOpen && (
                  <div style={{ background:'rgba(230,126,34,0.08)', border:'0.5px solid #F2C4BC', borderRadius:6, padding:12 }}>
                    <div style={{ fontSize:11, fontWeight:500, color:'#c0392b', marginBottom:8 }}>Confirm key deletion — cannot be undone</div>
                    {['I downloaded the private key','I installed it on my server','I understand this is irreversible'].map((lbl,i) => {
                      const k = ['downloaded','installed','understand'][i]
                      return (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#e8e0d8', padding:'4px 0', cursor:'pointer' }}>
                          <input type="checkbox" checked={keyChecks[k]} onChange={e => setKeyChecks({...keyChecks,[k]:e.target.checked})} style={{ accentColor:'#f0ede8' }}/> {lbl}
                        </label>
                      )
                    })}
                    <div style={{ display:'flex', gap:6, marginTop:10 }}>
                      <button onClick={() => { setKeyDelOpen(false); setKeyChecks({downloaded:false,installed:false,understand:false}) }} style={btnStyle}>Cancel</button>
                      <button onClick={doDeleteKey} disabled={!allChecked||keyDeleting} style={{ ...btnStyle, background:allChecked&&!keyDeleting?'#f87171':'rgba(239,83,80,0.3)', color:'var(--v2-surface)', border:'none' }}>{keyDeleting?'Deleting…':'Delete key permanently'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Revoke confirm */}
          {revokeOpen && (
            <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid #fecaca', borderRadius:6, padding:12 }}>
              <div style={{ fontSize:11, fontWeight:500, color:'#a93226', marginBottom:8 }}>Revoke this certificate? This is permanent and notifies the CA.</div>
              {revokeError && <div style={{ fontSize:11, color:'#f87171', marginBottom:8 }}>{revokeError}</div>}
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => { setRevokeOpen(false); setRevokeErr('') }} style={btnStyle}>Cancel</button>
                <button onClick={doRevoke} disabled={revoking} style={{ ...btnStyle, background:'#f87171', color:'var(--v2-surface)', border:'none', opacity:revoking?0.7:1 }}>{revoking?'Revoking…':'Confirm Revoke'}</button>
              </div>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div style={{ padding:16 }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <ActionBtn icon={Download}  label="Download Certificate" onClick={downloadZip}/>
            <ActionBtn icon={RotateCcw} label="Renew Certificate"    onClick={() => { sessionStorage.setItem('prefill_domain',cert.domain); onIssue?.() }} disabled={isRevoked}/>
            <ActionBtn icon={Lock}      label="Install to Server"    onClick={() => onInstall?.(cert)} disabled={isRevoked||!cert.cert_pem}/>
            <ActionBtn icon={Trash2}    label="Delete Certificate"   onClick={() => setDelConfirm(true)} color="#a93226"/>
            {delConfirm ? (
              <div style={{ background:'rgba(192,57,43,0.12)', border:'0.5px solid #fecaca', borderRadius:6, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#a93226', marginBottom:6 }}>
                  Permanently delete all records for <span style={{ fontFamily:'monospace' }}>{cert.domain}</span>?
                </div>
                <div style={{ fontSize:10, color:'#f87171', marginBottom:10, lineHeight:1.5 }}>
                  Removes certificate, TSS orders, install history and renewal logs. Cannot be undone.
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setDelConfirm(false)} style={btnStyle}>Cancel</button>
                  <button onClick={() => onDelete(cert.id)}
                    style={{ ...btnStyle, background:'#f87171', color:'var(--v2-surface)', border:'none', flex:1, justifyContent:'center' }}>
                    Yes, purge everything
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {cert.is_sandbox && (
            <div style={{ marginTop:16, padding:10, background:'rgba(239,68,68,0.08)', border:'0.5px solid #F2C4BC', borderRadius:6, fontSize:10, color:'#ff8c7a', lineHeight:1.6 }}>
              <strong>Sandbox certificate</strong><br/>Not trusted by browsers. Issue a production cert for live use.
            </div>
          )}

          {!isRevoked && days != null && (
            <div style={{ marginTop:16, padding:14, background:si.bg, border:`0.5px solid ${si.border}`, borderRadius:8, textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:700, color:si.color, lineHeight:1 }}>{Math.max(0,days)}</div>
              <div style={{ fontSize:11, color:si.color, marginTop:4 }}>days remaining</div>
              {days > 0 && <div style={{ fontSize:10, color:'#b0a8a0', marginTop:4 }}>Expires {fmtDate(cert.expires_at)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Status filter options
const STATUS_FILTERS = [
  { id:'ALL',       label:'ALL' },
  { id:'Active',    label:'Active' },
  { id:'Pending',   label:'Pending' },
  { id:'Expired',   label:'Expired' },
  { id:'Cancelled', label:'Cancelled' },
  { id:'Exp7',      label:'Exp. in 7 days' },
  { id:'Exp30',     label:'Exp. in 30 days' },
  { id:'Exp60',     label:'Exp. in 60 days' },
  { id:'Exp90',     label:'Exp. in 90 days' },
]

// ── Main ──────────────────────────────────────────────────────────────
export default function CertInventory({ user, nav, onIssue }) {
  const isMobile = useIsMobile()
  const [certs, setCerts]           = useState([])
  const [orders, setOrders]         = useState({})
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState(null)
  const [statusFilter, setFilter]   = useState('ALL')
  const [domainSearch, setSearch]   = useState('')
  const [showDrop, setShowDrop]     = useState(false)
  const [agentCert, setAgentCert]   = useState(null)
  const [cpanelCert, setCpanelCert] = useState(null)

  const loadCerts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data:certData }, { data:orderData }] = await Promise.all([
      supabase.from('certificates').select('*').eq('user_id',user.id).not('status','eq','rotating').order('created_at',{ascending:false}),
      Promise.resolve({ data: [] })
    ])
    setCerts(certData||[])
    const oMap = {}
    setOrders(oMap)
    setLoading(false)
  }, [user])

  useEffect(() => { loadCerts() }, [loadCerts])
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState==='visible') loadCerts() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadCerts])
  useEffect(() => {
    const domain = sessionStorage.getItem('install_domain')
    if (!domain||!certs.length) return
    sessionStorage.removeItem('install_domain')
    const cert = certs.find(c => c.domain===domain && c.private_key_pem)
    if (cert) setAgentCert(cert)
  }, [certs])

  const downloadCSV = () => {
    const rows = [
      ['Domain','Order ID','Product','Status','Cert Start','Cert Expiry','Days Remaining','Order Date','Order End','Environment','Install Method','Install Status'],
      ...certs.map(cert => {
        const order = orders[cert.tss_order_id]
        const days = daysLeft(cert.expires_at)
        const si = statusInfo(days, cert.status)
        const orderEnd = order?.years ? new Date(new Date(order.created_at).getTime() + order.years*365*86400000).toISOString() : ''
        return [
          cert.domain,
          '',
          productName(order?.product_code, cert.cert_type),
          si.label,
          fmtDate(cert.issued_at),
          fmtDate(cert.expires_at),
          days != null ? days : '',
          fmtDate(order?.created_at || cert.created_at),
          fmtDate(orderEnd),
          cert.is_sandbox ? 'Sandbox' : 'Production',
          cert.install_method || '',
          cert.install_status || '',
        ]
      })
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `sslvault-certificates-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id) => {
    // Full purge — cascade delete all related records
    await Promise.all([
      supabase.from('agent_jobs').delete().eq('cert_id', id),
      supabase.from('cpanel_installs').delete().eq('cert_id', id),
      supabase.from('renewal_events').delete().eq('cert_id', id),
    ])
    // Delete TSS orders linked to this cert
    const cert = certs.find(c => c.id === id)
    if (cert?.domain) {
      await supabase.from('ssl_orders').delete()
        .eq('user_id', user.id).eq('domain', cert.domain)
    }
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(prev => prev.filter(c => c.id !== id))
    setExpanded(null)
  }
  const handleKeyDeleted = (id) => {
    setCerts(prev => prev.map(c => c.id===id ? {...c,private_key_pem:null} : c))
  }

  const filtered = certs.filter(cert => {
    const d = daysLeft(cert.expires_at)
    const isRevoked = cert.status==='revoked'||cert.status==='sandbox_revoked'
    const isExpired = !isRevoked && d!=null && d<0
    const isActive  = !isRevoked && !isExpired && cert.status==='active'
    const isPending = !isRevoked && !isExpired && cert.status!=='active'
    if (domainSearch && !cert.domain.toLowerCase().includes(domainSearch.toLowerCase())) return false
    if (statusFilter==='ALL')       return true
    if (statusFilter==='Active')    return isActive
    if (statusFilter==='Pending')   return isPending
    if (statusFilter==='Expired')   return isExpired
    if (statusFilter==='Cancelled') return isRevoked
    if (statusFilter==='Exp7')      return !isRevoked && d!=null && d>=0 && d<=7
    if (statusFilter==='Exp30')     return !isRevoked && d!=null && d>=0 && d<=30
    if (statusFilter==='Exp60')     return !isRevoked && d!=null && d>=0 && d<=60
    if (statusFilter==='Exp90')     return !isRevoked && d!=null && d>=0 && d<=90
    return true
  })

  const active   = certs.filter(c => c.status==='active' && (daysLeft(c.expires_at)??0)>=0).length
  const expiring = certs.filter(c => { const d=daysLeft(c.expires_at); return c.status==='active'&&d!=null&&d>=0&&d<=30 }).length
  const expired  = certs.filter(c => { const d=daysLeft(c.expires_at); return d!=null&&d<0 }).length
  const total    = certs.filter(c => c.status!=='revoked'&&c.status!=='sandbox_revoked').length

  return (
    <div style={{ padding:'24px 28px 60px', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:600, color:'#ffffff', margin:0, letterSpacing:'-0.3px' }}>Orders</h2>
          <div style={{ fontSize:11, color:'#b0a8a0', marginTop:4 }}>{total} certificate{total!==1?'s':''} in inventory</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={downloadCSV} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--v2-surface)', color:'#e8e0d8', border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'8px 14px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <Download size={13}/> Download CSV
          </button>
          <button onClick={() => onIssue?.()} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f0ede8', color:'var(--v2-surface)', border:'none', borderRadius:6, padding:'9px 16px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={13}/> Issue Certificate
          </button>
        </div>
      </div>

      {/* Alert strips — DigiCert style */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:16, marginBottom:20 }}>
        {/* Certificate alerts */}
        <div style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', marginBottom:14 }}>Certificate alerts</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:0 }}>
            {[
              { label:'Expired in last 7 days',  val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>=-7&&d<0 }).length, color:'#f87171', filter:'Exp7' },
              { label:'Expires in 0–30 days',    val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>=0&&d<=30&&c.status==='active' }).length, color:'#ffffff', filter:'Exp30' },
              { label:'Expires in 31–60 days',   val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>30&&d<=60&&c.status==='active' }).length, color:'#ffffff', filter:'Exp60' },
              { label:'Expires in 61–90 days',   val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>60&&d<=90&&c.status==='active' }).length, color:'#ffffff', filter:'Exp90' },
            ].map(({ label, val, color, filter:f }, i) => (
              <div key={label} style={{ padding:'0 16px 0 0', borderRight: i<3 ? '0.5px solid var(--v2-border)' : 'none', marginRight: i<3 ? 16 : 0 }}>
                <div style={{ fontSize:9, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.3px', marginBottom:6, lineHeight:1.4 }}>{label}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:26, fontWeight:700, color, lineHeight:1 }}>{loading?'—':val}</span>
                  {val > 0 && (
                    <button onClick={() => { setFilter(f); setSearch('') }} style={{ fontSize:10, color:'#ffffff', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', textDecoration:'underline' }}>view</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order alerts */}
        <div style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', marginBottom:14 }}>Order alerts</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:0 }}>
            {[
              { label:'Expired in last 7 days',  val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>=-7&&d<0 }).length, color:'#f87171', filter:'Exp7' },
              { label:'Expires in 0–30 days',    val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>=0&&d<=30&&c.status==='active' }).length, color:'#ffffff', filter:'Exp30' },
              { label:'Expires in 31–60 days',   val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>30&&d<=60&&c.status==='active' }).length, color:'#ffffff', filter:'Exp60' },
              { label:'Expires in 61–90 days',   val: certs.filter(c=>{ const d=daysLeft(c.expires_at); return d!=null&&d>60&&d<=90&&c.status==='active' }).length, color:'#ffffff', filter:'Exp90' },
            ].map(({ label, val, color, filter:f }, i) => (
              <div key={label} style={{ padding:'0 16px 0 0', borderRight: i<3 ? '0.5px solid var(--v2-border)' : 'none', marginRight: i<3 ? 16 : 0 }}>
                <div style={{ fontSize:9, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.3px', marginBottom:6, lineHeight:1.4 }}>{label}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:26, fontWeight:700, color, lineHeight:1 }}>{loading?'—':val}</span>
                  {val > 0 && (
                    <button onClick={() => { setFilter(f); setSearch('') }} style={{ fontSize:10, color:'#ffffff', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', textDecoration:'underline' }}>view</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#e8e0d8' }}>Filter by</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#e8e0d8' }}>Status:</span>
          <div style={{ position:'relative', zIndex:50 }}>
            <button onClick={() => setShowDrop(v=>!v)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', fontSize:12, background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:6, cursor:'pointer', fontFamily:'inherit', color:'#ffffff', minWidth:160 }}>
              {STATUS_FILTERS.find(f=>f.id===statusFilter)?.label||'ALL'}
              <ChevronDown size={12} style={{ marginLeft:'auto' }}/>
            </button>
            {showDrop && (
              <div style={{ position:'absolute', top:'100%', left:0, background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:6, boxShadow:'0 4px 16px rgba(255,255,255,0.08)', marginTop:4, minWidth:180, overflow:'hidden' }}>
                {STATUS_FILTERS.map(f => (
                  <button key={f.id} onClick={() => { setFilter(f.id); setShowDrop(false) }} style={{ display:'block', width:'100%', padding:'9px 14px', fontSize:12, background:statusFilter===f.id?'#f0ede8':'var(--v2-surface)', color:statusFilter===f.id?'var(--v2-surface)':'var(--v2-text)', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
                    onMouseEnter={e => statusFilter!==f.id&&(e.currentTarget.style.background='var(--v2-bg)')}
                    onMouseLeave={e => statusFilter!==f.id&&(e.currentTarget.style.background='var(--v2-surface)')}
                  >{f.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#e8e0d8' }}>Domain Name:</span>
          <div style={{ position:'relative' }}>
            <Search size={12} color="var(--v2-text-3)" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={domainSearch} onChange={e => setSearch(e.target.value)} placeholder="Example: domain.com" style={{ width:200, height:33, border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'0 10px 0 28px', fontSize:12, fontFamily:'inherit', background:'var(--v2-surface)', color:'#e8e0d8', outline:'none' }}/>
          </div>
        </div>
        {(statusFilter!=='ALL'||domainSearch) && (
          <button onClick={() => { setFilter('ALL'); setSearch('') }} style={{ fontSize:11, color:'#ffffff', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Clear filters</button>
        )}
      </div>
      {showDrop && <div onClick={() => setShowDrop(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>}

      {/* Table */}
      <div style={{ background:'var(--v2-surface)', border:'1px solid var(--v2-border)', borderRadius:'var(--v2-r-lg)', overflow:'hidden' }}>
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 80px 1.4fr 80px 1.6fr 100px 80px 36px', padding:'10px 18px', background:'var(--v2-bg)', borderBottom:'0.5px solid rgba(255,255,255,0.08)', fontSize:11, fontWeight:600, color:'#b0a8a0', letterSpacing:'.3px', textTransform:'uppercase', minWidth:0 }}>
          <div>Domain</div>
          <div>Order ID</div>
          <div>Product</div>
          <div>Status</div>
          <div>Certificate Validity</div>
          <div>Order Date</div>
          <div>Order End</div>
          <div></div>
        </div>

        {loading ? (
          <div style={{ padding:'clamp(16px,16vw,48px) 20px', textAlign:'center', color:'#b0a8a0', fontSize:12 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'clamp(16px,18vw,56px) 20px', textAlign:'center' }}>
            <Shield size={32} color="rgba(240,237,232,0.15)" strokeWidth={1.5} style={{ marginBottom:10 }}/>
            <div style={{ fontSize:13, fontWeight:500, color:'#ffffff', marginBottom:4 }}>{certs.length===0?'No certificates yet':'No matches'}</div>
            <div style={{ fontSize:11, color:'#b0a8a0', marginBottom:16 }}>{certs.length===0?'Issue your first SSL certificate to get started':'Try a different filter or search term'}</div>
            {certs.length===0 && <button onClick={() => onIssue?.()} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f0ede8', color:'var(--v2-surface)', border:'none', borderRadius:6, padding:'8px 16px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}><Plus size={12}/> Issue certificate</button>}
          </div>
        ) : filtered.map(cert => {
          const days = daysLeft(cert.expires_at)
          const isExpanded = expanded === cert.id
          const si = statusInfo(days, cert.status)
          const order = orders[cert.tss_order_id]
          return (
            <div key={cert.id}>
              <div
                onClick={() => setExpanded(isExpanded ? null : cert.id)}
                style={{ display:'grid', gridTemplateColumns:'1.4fr 80px 1.4fr 80px 1.6fr 100px 80px 36px', padding:'13px 18px', alignItems:'center', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.08)', background:isExpanded?'transparent':'var(--v2-surface)', transition:'background 0.1s', minWidth:0 }}
                onMouseEnter={e => { if(!isExpanded) e.currentTarget.style.background='#000000' }}
                onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background='var(--v2-surface)' }}
              >
                {/* Domain */}
                <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
                  <span style={{ fontFamily:"'JetBrains Mono','Menlo',monospace", fontSize:12, color:'#ffffff', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cert.domain}</span>
                  <span style={{ fontSize:10, color:'#b0a8a0' }}>{cert.is_sandbox?'Sandbox':'Production'}</span>
                </div>
                {/* Order ID */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:11, color:'#ffffff', fontFamily:"'JetBrains Mono','Menlo',monospace", cursor:'pointer' }} onClick={e => { e.stopPropagation(); setExpanded(isExpanded?null:cert.id) }}>{cert.ggs_order_id||cert.external_order_id||'—'}</span>
                </div>
                {/* Product */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:12, color:'#ffffff', fontWeight:500 }}>{productName(order?.product_code, cert.cert_type)}</span>

                </div>
                {/* Status */}
                <div>
                  <span style={{ display:'inline-flex', alignItems:'center', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:4, background:si.bg, color:si.color, border:`0.5px solid ${si.border}` }}>{si.label}</span>
                </div>
                {/* Certificate validity — date range */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {cert.issued_at && cert.expires_at
                    ? <span style={{ fontSize:11, color:'#e8e0d8' }}>{fmtDate(cert.issued_at)} → <span style={{ color:si.color, fontWeight:500 }}>{fmtDate(cert.expires_at)}</span></span>
                    : <span style={{ fontSize:11, color:'#b0a8a0' }}>—</span>
                  }
                  {days != null && !['revoked','sandbox_revoked'].includes(cert.status) && (
                    <span style={{ fontSize:10, color: days < 0 ? '#f87171' : days <= 30 ? '#f0ede8' : 'var(--v2-text-3)' }}>
                      {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`}
                    </span>
                  )}
                </div>
                {/* Order date */}
                <div style={{ fontSize:11, color:'#e8e0d8' }}>{fmtDate(order?.created_at || cert.created_at)}</div>
                {/* Order end date */}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {order?.years
                    ? <>
                        <span style={{ fontSize:11, color:'#e8e0d8' }}>{fmtDate(new Date(new Date(order.created_at).getTime() + order.years*365*86400000).toISOString())}</span>
                        <span style={{ fontSize:10, color:'#b0a8a0' }}>{order.years}-year plan</span>
                      </>
                    : <span style={{ fontSize:11, color:'#b0a8a0' }}>—</span>
                  }
                </div>
                {/* Chevron */}
                <div style={{ color:isExpanded?'#f0ede8':'var(--v2-text-3)', display:'flex', justifyContent:'center' }}>
                  {isExpanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                </div>
              </div>
              {isExpanded && (
                <CertDetail cert={cert} order={order} onClose={() => setExpanded(null)} onDelete={handleDelete} onKeyDeleted={handleKeyDeleted} onInstall={setAgentCert} onIssue={onIssue} onRefresh={loadCerts}/>
              )}
            </div>
          )
        })}
        </div>
      </div>

      {agentCert && <AgentInstall cert={agentCert} userId={user?.id} onClose={() => setAgentCert(null)} onOpenCpanel={() => { setAgentCert(null); setCpanelCert(agentCert) }}/>}
      {cpanelCert && <CpanelInstall cert={cpanelCert} userId={user?.id} onClose={() => setCpanelCert(null)} onSuccess={() => { setCpanelCert(null); loadCerts() }}/>}
    </div>
  )
}
