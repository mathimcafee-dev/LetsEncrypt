import { useState, useEffect } from 'react'
import { Shield, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, PlusCircle, Copy, Check, ChevronDown, ChevronUp, XCircle, Globe, Calendar, Key, Link, Hash, Server } from 'lucide-react'
import AgentInstall from '../components/AgentInstall'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, formatDistanceToNow, format } from 'date-fns'

function PendingDNSCard({ order, onIssued, onDelete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const copy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const checkAndIssue = async () => {
    setError(''); setLoading(true)
    try {
      const vRes = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', sessionId: order.session_id, domain: order.domain, staging: order.staging })
      })
      const vData = await vRes.json()
      if (!vData.verified) { setError(vData.message || 'DNS not propagated yet. Try again in a minute.'); setLoading(false); return }
      const fRes = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', sessionId: order.session_id, domain: order.domain, staging: order.staging, user_id: order.user_id })
      })
      const fData = await fRes.json()
      if (fData.ok) onIssued()
      else setError(fData.error || 'Failed to issue. Try again.')
    } catch(e) { setError(e.message) }
    setLoading(false)
  }
  return (
    <div style={{ background: 'var(--yellow-light)', border: '1px solid var(--yellow-border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: 'white', border: '1px solid var(--yellow-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={19} color="var(--yellow)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{order.domain}</span>
            <span className="badge badge-yellow">Pending DNS</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: order.challenge_key_auth ? 8 : 0 }}>Add TXT record to your DNS then click Check DNS & Issue</p>
          {order.challenge_key_auth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 6, padding: '6px 10px', border: '1px solid var(--yellow-border)', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, flexShrink: 0 }}>TXT:</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.challenge_key_auth}</span>
              <button onClick={() => copy(order.challenge_key_auth)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text3)', padding: 2, flexShrink: 0 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={checkAndIssue} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? <><span className="spinner" /> Checking...</> : 'Check DNS & Issue'}
          </button>
          <button onClick={onDelete} style={{ background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: 10, fontSize: 12 }}>{error}</div>}
    </div>
  )
}

function StatusBadge({ days, revoked, superseded }) {
  if (revoked) return <span className="badge badge-red"><XCircle size={10} /> Revoked</span>
  if (superseded) return <span className="badge" style={{ background:'var(--bg2)', color:'var(--text3)', fontSize:10, padding:'2px 6px', borderRadius:100 }}>Superseded</span>
  if (days < 0) return <span className="badge badge-red"><XCircle size={10} /> Expired</span>
  if (days < 7) return <span className="badge badge-red"><AlertTriangle size={10} /> Critical</span>
  if (days < 14) return <span className="badge badge-yellow"><AlertTriangle size={10} /> Expiring Soon</span>
  if (days < 30) return <span className="badge badge-yellow"><Clock size={10} /> Renew Soon</span>
  return <span className="badge badge-green"><CheckCircle size={10} /> Active</span>
}

function DomainPanel({ index, domain, certs, onDelete, onRenew, onRevoke, onInstall }) {
  const [expanded, setExpanded] = useState(false)
  const [revoking, setRevoking] = useState(null)

  const sorted = [...certs].sort((a, b) => new Date(b.issued_at || 0) - new Date(a.issued_at || 0))
  const latest = sorted[0]
  const days = latest && latest.expires_at ? differenceInDays(new Date(latest.expires_at), new Date()) : 0
  const pct = Math.max(0, Math.min(100, (days / 90) * 100))
  const barColor = days < 0 ? 'var(--red)' : days < 14 ? 'var(--yellow)' : 'var(--green)'
  const isRevoked = latest && latest.status === 'revoked'

  const dl = (content, filename) => {
    if (!content) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }

  const revoke = async (cert) => {
    if (!confirm('Revoke this certificate for ' + cert.domain + '?\n\nThis will:\n• Immediately invalidate the certificate with Let\'s Encrypt\n• Mark it as revoked in your dashboard\n• Show as revoked in Monitor\n\nThis cannot be undone.')) return
    setRevoking(cert.id)
    try {
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', certPem: cert.cert_pem, domain: cert.domain, sessionId: cert.session_id })
      })
      const data = await res.json()
      console.log('revoke result:', data)
    } catch(e) { console.log('revoke error:', e.message) }
    // Update DB status - confirmed write
    const { error: rErr } = await supabase.from('certificates').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', cert.id)
    if (rErr) console.error('revoke DB error:', rErr.message)
    if (cert.session_id) {
      await supabase.from('ssl_orders').update({ status: 'revoked' }).eq('session_id', cert.session_id)
    }
    onRevoke(cert.id)
    setRevoking(null)
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>

      {/* Header */}
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', cursor: 'pointer', background: expanded ? 'var(--accent-light)' : 'white' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: expanded ? 'var(--accent)' : 'var(--bg2)', color: expanded ? 'white' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {index}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
            <Globe size={14} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{domain}</span>
            <StatusBadge days={days} revoked={isRevoked} superseded={latest && latest.status === 'superseded'} />
            {sorted.length > 1 && <span className="badge badge-blue">{sorted.length} versions</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>Expires: <strong style={{ color: 'var(--text2)' }}>{latest && latest.expires_at ? format(new Date(latest.expires_at), 'MMM d, yyyy') : '—'}</strong></span>
            <span style={{ color: barColor, fontWeight: 600 }}>{days > 0 ? `${days} days left` : days === 0 ? 'Expires today' : `Expired ${Math.abs(days)} days ago`}</span>
          </div>
        </div>
        <div style={{ width: 100, flexShrink: 0 }}>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {!expanded && <span style={{ fontSize:11, color:'var(--text3)', fontStyle:'italic', display:'flex', alignItems:'center', gap:4 }}>
            <Download size={11}/> {sorted.filter(c=>c.cert_pem).length} file{sorted.filter(c=>c.cert_pem).length!==1?'s':''} · click to manage
          </span>}
          <div style={{ width:28, height:28, borderRadius:'50%', background:expanded?'var(--accent)':'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>
            {expanded ? <ChevronUp size={14} color="white"/> : <ChevronDown size={14} color="var(--text3)"/>}
          </div>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {sorted.map((cert, ci) => {
            const certDays = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
            const certPct = Math.max(0, Math.min(100, (certDays / 90) * 100))
            const certBar = certDays < 0 ? 'var(--red)' : certDays < 14 ? 'var(--yellow)' : 'var(--green)'
            const isLatest = ci === 0
            const certRevoked = cert.status === 'revoked'

            return (
              <div key={cert.id} style={{ padding: '20px 24px', borderBottom: ci < sorted.length - 1 ? '1px solid var(--border2)' : 'none', background: isLatest ? 'white' : '#fafafa' }}>

                {/* Version label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLatest ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: isLatest ? 'var(--accent)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isLatest ? 'Latest Certificate' : `Previous — Version ${sorted.length - ci}`}
                  </span>
                  {certRevoked && <span className="badge badge-red" style={{ fontSize: 10 }}><XCircle size={9} /> Revoked</span>}
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                    Issued: {cert.issued_at ? format(new Date(cert.issued_at), 'MMM d, yyyy · HH:mm') : '—'}
                    {certRevoked && cert.revoked_at ? <span style={{ color: 'var(--red)', marginLeft: 8 }}>Revoked: {format(new Date(cert.revoked_at), 'MMM d, yyyy · HH:mm')}</span> : null}
                  </span>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    ['#', 'Index', `#${ci + 1}`],
                    ['📅', 'Request Date', cert.issued_at ? format(new Date(cert.issued_at), 'MMM d, yyyy') : '—'],
                    ['📅', 'Start Date', cert.issued_at ? format(new Date(cert.issued_at), 'MMM d, yyyy') : '—'],
                    ['📅', 'Expiry Date', cert.expires_at ? format(new Date(cert.expires_at), 'MMM d, yyyy') : '—'],
                    ['⏱', 'Days Remaining', certDays > 0 ? `${certDays} days` : certDays === 0 ? 'Today' : 'Expired'],
                    ['🔒', 'Status', certRevoked ? 'Revoked' : certDays < 0 ? 'Expired' : certDays < 14 ? 'Expiring' : 'Active'],
                    ['🏢', 'Issuer', "Let's Encrypt"],
                    ['🔖', 'Type', cert.staging ? 'Staging' : 'Production'],
                  ].map(([icon, label, value]) => (
                    <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {isLatest && !certRevoked && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                      <span>Validity</span>
                      <span style={{ color: certBar, fontWeight: 600 }}>{certPct.toFixed(0)}% remaining</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${certPct}%`, background: certBar, borderRadius: 3 }} />
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {isLatest && !certRevoked && certDays >= 0 && certDays < 14 && (
                  <div className="alert alert-warning" style={{ marginBottom: 14, fontSize: 12 }}>
                    ⚠ Expires in <strong>{certDays} days</strong>. Renew now to avoid downtime.
                  </div>
                )}
                {isLatest && !certRevoked && certDays < 0 && (
                  <div className="alert alert-error" style={{ marginBottom: 14, fontSize: 12 }}>
                    ❌ Certificate expired. Renew immediately to restore HTTPS.
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {cert.cert_pem && (
                    <>
                      <button onClick={() => dl(cert.cert_pem, `${domain}-cert.pem`)} className="btn btn-secondary btn-sm">
                        <Download size={12} /> cert.pem
                      </button>
                      <button onClick={() => dl(cert.private_key_pem, `${domain}-key.pem`)} className="btn btn-secondary btn-sm" disabled={!cert.private_key_pem}>
                        <Key size={12} /> key.pem
                      </button>
                      <button onClick={() => dl(cert.cert_pem, `${domain}-fullchain.pem`)} className="btn btn-secondary btn-sm">
                        <Link size={12} /> fullchain.pem
                      </button>
                      <button onClick={() => { dl(cert.cert_pem, `${domain}-cert.pem`); setTimeout(() => dl(cert.private_key_pem, `${domain}-key.pem`), 300); setTimeout(() => dl(cert.cert_pem, `${domain}-fullchain.pem`), 600) }} className="btn btn-primary btn-sm">
                        <Download size={12} /> All Files
                      </button>
                    </>
                  )}
                  {isLatest && !certRevoked && (
                    <>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => onRenew(domain)} className="btn btn-secondary btn-sm">
                        <RefreshCw size={12} /> Request Renewal
                      </button>
                      <button onClick={() => onInstall(cert)} className="btn btn-secondary btn-sm" style={{ background:'var(--accent-light)', border:'1px solid var(--accent-border)', color:'var(--accent)' }}>
                        <Server size={12} /> Install on Server
                      </button>
                      <button onClick={() => revoke(cert)} disabled={revoking === cert.id} style={{ background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', borderRadius: 6, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}>
                        {revoking === cert.id ? <><span className="spinner spinner-dark" style={{ width: 12, height: 12, border: '2px solid var(--red-border)', borderTopColor: 'var(--red)' }} /> Revoking...</> : <><XCircle size={12} /> Revoke</>}
                      </button>
                    </>
                  )}
                  {!isLatest && (
                    <button onClick={() => onDelete(cert.id)} style={{ background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', borderRadius: 6, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [agentCert, setAgentCert] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/auth'); return }
    loadCerts()
  }, [user, authLoading])

  const loadCerts = async () => {
    setLoading(true)
    const { data: certsData } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    const { data: pendingData } = await supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'pending_dns').order('updated_at', { ascending: false })
    const { data: ordersData } = await supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'issued').order('updated_at', { ascending: false })
    setPendingOrders(pendingData || [])
    const certSessions = new Set((certsData || []).map(c => c.session_id))
    const ordersAsCerts = (ordersData || []).filter(o => !certSessions.has(o.session_id)).map(o => ({
      id: o.id, user_id: o.user_id, session_id: o.session_id, domain: o.domain,
      cert_pem: o.cert_pem, private_key_pem: o.priv_key || o.account_key_pem,
      issued_at: o.updated_at, expires_at: o.expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active', staging: o.staging || false
    }))
    // Mark superseded certs - they show as history under domain panel
    const allCerts = [...(certsData || []), ...ordersAsCerts]
    const all = allCerts
    setCerts(all)
    for (const o of ordersAsCerts) {
      if (o.cert_pem) await supabase.from('certificates').upsert({ user_id: o.user_id, session_id: o.session_id, domain: o.domain, cert_pem: o.cert_pem, private_key_pem: o.private_key_pem, issued_at: o.issued_at, expires_at: o.expires_at, status: 'active' }, { onConflict: 'session_id' })
    }
    setLoading(false)
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this pending request?')) return
    await supabase.from('ssl_orders').delete().eq('id', id)
    setPendingOrders(p => p.filter(x => x.id !== id))
  }

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate record?')) return
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const handleRevoke = (id) => setCerts(c => c.map(x => x.id === id ? { ...x, status: 'revoked' } : x))
  const handleRenew = (domain) => { sessionStorage.setItem('prefill_domain', domain); nav('/generate') }

  // Group by domain
  const grouped = certs.reduce((acc, cert) => {
    const d = cert.domain || 'Unknown'
    if (!acc[d]) acc[d] = []
    acc[d].push(cert)
    return acc
  }, {})
  const domains = Object.keys(grouped)

  const getLatest = (domain) => {
    const sorted = [...grouped[domain]].sort((a, b) => new Date(b.issued_at || 0) - new Date(a.issued_at || 0))
    // Prefer active cert over superseded/revoked
    return sorted.find(c => c.status === 'active') || sorted[0]
  }

  const filteredDomains = domains.filter(d => {
    const l = getLatest(d)
    const days = l && l.expires_at ? differenceInDays(new Date(l.expires_at), new Date()) : 0
    if (filter === 'active') return days >= 14 && l?.status !== 'revoked' && l?.status !== 'superseded'
    if (filter === 'expiring') return days >= 0 && days < 14 && l?.status !== 'revoked'
    if (filter === 'expired') return days < 0 && l?.status !== 'revoked'
    if (filter === 'revoked') return l?.status === 'revoked'
    return l?.status !== 'revoked' // 'all' hides revoked by default
  })

  // Revoked domains shown separately
  const revokedDomains = domains.filter(d => getLatest(d)?.status === 'revoked')
  const activeDomains = domains.filter(d => getLatest(d)?.status !== 'revoked')

  const stats = {
    total: activeDomains.length,
    active: activeDomains.filter(d => { const l = getLatest(d); const days = l && l.expires_at ? differenceInDays(new Date(l.expires_at), new Date()) : 0; return days >= 14 }).length,
    expiring: activeDomains.filter(d => { const l = getLatest(d); const days = l && l.expires_at ? differenceInDays(new Date(l.expires_at), new Date()) : 0; return days >= 0 && days < 14 }).length,
    expired: activeDomains.filter(d => { const l = getLatest(d); const days = l && l.expires_at ? differenceInDays(new Date(l.expires_at), new Date()) : 0; return days < 0 }).length,
    revoked: revokedDomains.length,
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 60px)', padding: '40px 0 80px' }}>
      <div className="container">

        {agentCert && <AgentInstall cert={agentCert} userId={user.id} onClose={() => setAgentCert(null)} />}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4, color: 'var(--text)' }}>My Certificates</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Domain-wise certificate management with full history</p>
          </div>
          <button onClick={() => nav('/generate')} className="btn btn-primary"><PlusCircle size={15} /> New Certificate</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[['Total Domains', stats.total, 'var(--accent)', 'all'], ['Active', stats.active, 'var(--green)', 'active'], ['Expiring Soon', stats.expiring, 'var(--yellow)', 'expiring'], ['Expired', stats.expired, 'var(--red)', 'expired']].map(([label, value, color, f]) => (
            <div key={label} onClick={() => setFilter(f)} style={{ background: 'white', border: `1px solid ${filter === f ? color : 'var(--border)'}`, borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {stats.expiring > 0 && <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}><AlertTriangle size={15} /><span><strong>{stats.expiring} domain{stats.expiring > 1 ? 's' : ''}</strong> expiring within 14 days.</span><button onClick={() => setFilter('expiring')} className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--yellow-light)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>View</button></div>}
        {stats.expired > 0 && <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}><XCircle size={15} /><span><strong>{stats.expired} domain{stats.expired > 1 ? 's' : ''}</strong> expired.</span><button onClick={() => setFilter('expired')} className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>View</button></div>}

        {pendingOrders.length > 0 && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow)', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--yellow)" /> Pending DNS Verification ({pendingOrders.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingOrders.map(order => <PendingDNSCard key={order.id} order={order} onIssued={loadCerts} onDelete={() => deleteOrder(order.id)} />)}
            </div>
          </div>
        )}

        {domains.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>Certificates <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 400 }}>({filteredDomains.length} domain{filteredDomains.length !== 1 ? 's' : ''})</span></h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all', 'All'], ['active', 'Active'], ['expiring', 'Expiring'], ['expired', 'Expired'], ['revoked', 'Revoked']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <span className="spinner spinner-dark" style={{ width: 24, height: 24, display: 'block', margin: '0 auto 12px' }} />
            <p>Loading certificates...</p>
          </div>
        ) : filteredDomains.length === 0 && pendingOrders.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 56, height: 56, background: 'var(--bg2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield size={26} color="var(--text3)" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{filter !== 'all' ? `No ${filter} certificates` : 'No certificates yet'}</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>{filter === 'all' ? 'Generate your first free SSL certificate to get started' : `No certificates match the "${filter}" filter`}</p>
            {filter === 'all' ? <button onClick={() => nav('/generate')} className="btn btn-primary"><PlusCircle size={15} /> Generate Free SSL</button> : <button onClick={() => setFilter('all')} className="btn btn-secondary">Show All</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredDomains.map((domain, i) => (
              <DomainPanel key={domain} index={i + 1} domain={domain} certs={grouped[domain]} onDelete={deleteCert} onRenew={handleRenew} onRevoke={handleRevoke} onInstall={(cert) => setAgentCert(cert)} />
            ))}
          </div>
        )}

        {/* Revoked certificates section */}
        {revokedDomains.length > 0 && filter !== 'revoked' && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontWeight:700, fontSize:17, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                <XCircle size={18} color="var(--red)" /> Revoked Certificates
                <span style={{ fontSize:13, color:'var(--text3)', fontWeight:400 }}>({revokedDomains.length})</span>
              </h2>
              <button onClick={() => setFilter('revoked')} className="btn btn-secondary btn-sm">View All</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {revokedDomains.map((domain, i) => (
                <DomainPanel key={domain} index={i+1} domain={domain} certs={grouped[domain]} onDelete={deleteCert} onRenew={handleRenew} onRevoke={handleRevoke} onInstall={(cert) => setAgentCert(cert)} />
              ))}
            </div>
          </div>
        )}

        {filter === 'revoked' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {revokedDomains.length === 0 ? (
              <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
                <XCircle size={32} color="var(--text3)" style={{ margin:'0 auto 12px', display:'block' }} />
                <p style={{ fontWeight:600, color:'var(--text2)' }}>No revoked certificates</p>
              </div>
            ) : revokedDomains.map((domain, i) => (
              <DomainPanel key={domain} index={i+1} domain={domain} certs={grouped[domain]} onDelete={deleteCert} onRenew={handleRenew} onRevoke={handleRevoke} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
