import { useState, useEffect } from 'react'
import { Shield, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, PlusCircle, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, formatDistanceToNow, format } from 'date-fns'

function StatusBadge({ days }) {
  if (days < 0) return <span className="badge badge-red"><AlertTriangle size={10} /> Expired</span>
  if (days < 14) return <span className="badge badge-yellow"><Clock size={10} /> Expiring Soon</span>
  return <span className="badge badge-green"><CheckCircle size={10} /> Active</span>
}

export default function Dashboard({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/auth'); return }
    loadCerts()
  }, [user, authLoading])

  const loadCerts = async () => {
    setLoading(true)
    // Load from certificates table
    const { data: certsData } = await supabase
      .from('certificates').select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })

    // Load from ssl_orders as fallback (issued but not in certificates table)
    const { data: ordersData } = await supabase
      .from('ssl_orders').select('*')
      .eq('user_id', user.id)
      .eq('status', 'issued')
      .order('updated_at', { ascending: false })

    // Merge avoiding duplicates
    const certSessions = new Set((certsData || []).map(c => c.session_id))
    const ordersAsCerts = (ordersData || [])
      .filter(o => !certSessions.has(o.session_id))
      .map(o => ({
        id: o.id,
        user_id: o.user_id,
        session_id: o.session_id,
        domain: o.domain,
        cert_pem: o.cert_pem,
        private_key_pem: o.priv_key || o.account_key_pem,
        issued_at: o.updated_at,
        expires_at: o.expires_at || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        staging: o.staging || false
      }))

    const all = [...(certsData || []), ...ordersAsCerts]
    setCerts(all)
    setLoading(false)

    // Auto-save any ssl_orders certs that aren't in certificates table
    for (const o of ordersAsCerts) {
      if (o.cert_pem) {
        await supabase.from('certificates').upsert({
          user_id: o.user_id,
          session_id: o.session_id,
          domain: o.domain,
          cert_pem: o.cert_pem,
          private_key_pem: o.private_key_pem,
          issued_at: o.issued_at,
          expires_at: o.expires_at,
          status: 'active',
          staging: o.staging
        }, { onConflict: 'session_id' })
      }
    }
  }

  const deleteCert = async (id) => {
    if (!confirm('Delete this certificate?')) return
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const download = (content, filename) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename; a.click()
  }

  const getStatus = (cert) => {
    const days = cert.expires_at ? differenceInDays(new Date(cert.expires_at), new Date()) : 0
    if (days < 0) return { label: 'expired', days }
    if (days < 14) return { label: 'expiring', days }
    return { label: 'active', days }
  }

  const stats = {
    total: certs.length,
    active: certs.filter(c => getStatus(c).label === 'active').length,
    expiring: certs.filter(c => getStatus(c).label === 'expiring').length,
    expired: certs.filter(c => getStatus(c).label === 'expired').length,
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 60px)', padding: '40px 0 80px' }}>
      <div className="container">
        {/* Detail Modal */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', maxHeight: '85vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17 }}>Certificate Details</h3>
                <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">✕</button>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                {[['Domain', selected.domain], ['Issued', selected.issued_at ? format(new Date(selected.issued_at), 'PPP') : '—'], ['Expires', selected.expires_at ? format(new Date(selected.expires_at), 'PPP') : '—'], ['Days Left', getStatus(selected).days + ' days'], ['Type', selected.staging ? 'Staging (Test)' : 'Production']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 600, minWidth: 80 }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontFamily: k === 'Domain' ? 'var(--mono)' : 'inherit' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.cert_pem && <button className="btn btn-primary btn-sm" onClick={() => download(selected.cert_pem, `${selected.domain}-cert.pem`)}><Download size={13} /> cert.pem</button>}
                {selected.private_key_pem && <button className="btn btn-secondary btn-sm" onClick={() => download(selected.private_key_pem, `${selected.domain}-key.pem`)}><Download size={13} /> key.pem</button>}
                {selected.cert_pem && selected.private_key_pem && (
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    download(selected.cert_pem, `${selected.domain}-cert.pem`)
                    setTimeout(() => download(selected.private_key_pem, `${selected.domain}-key.pem`), 300)
                  }}><Download size={13} /> Download All</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4, color: 'var(--text)' }}>My Certificates</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>All your issued SSL certificates in one place</p>
          </div>
          <button onClick={() => nav('/generate')} className="btn btn-primary">
            <PlusCircle size={15} /> New Certificate
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[['Total', stats.total, 'var(--accent)'], ['Active', stats.active, 'var(--green)'], ['Expiring', stats.expiring, 'var(--yellow)'], ['Expired', stats.expired, 'var(--red)']].map(([label, value, color]) => (
            <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {stats.expiring > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={15} />
            <span><strong>{stats.expiring} certificate{stats.expiring > 1 ? 's' : ''}</strong> expiring within 14 days — renew them soon.</span>
          </div>
        )}
        {stats.expired > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} />
            <span><strong>{stats.expired} certificate{stats.expired > 1 ? 's' : ''}</strong> already expired — renew immediately.</span>
          </div>
        )}

        {/* Certificates */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 20, color: 'var(--text)' }}>
            All Certificates {certs.length > 0 && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>({certs.length})</span>}
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
              <span className="spinner spinner-dark" style={{ width: 24, height: 24, display: 'block', margin: '0 auto 12px' }} />
              <p>Loading certificates...</p>
            </div>
          ) : certs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ width: 56, height: 56, background: 'var(--bg2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Shield size={26} color="var(--text3)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>No certificates yet</h3>
              <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>Generate your first free SSL certificate to get started</p>
              <button onClick={() => nav('/generate')} className="btn btn-primary"><PlusCircle size={15} /> Generate Free SSL</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {certs.map(cert => {
                const { label, days } = getStatus(cert)
                const color = label === 'expired' ? 'var(--red)' : label === 'expiring' ? 'var(--yellow)' : 'var(--green)'
                const bgColor = label === 'expired' ? 'var(--red-light)' : label === 'expiring' ? 'var(--yellow-light)' : 'var(--green-light)'
                const pct = Math.max(0, Math.min(100, (days / 90) * 100))
                return (
                  <div key={cert.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Shield size={19} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{cert.domain}</span>
                        <StatusBadge days={days} />
                        {cert.staging && <span className="badge badge-purple">Staging</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                        <span>Issued: {cert.issued_at ? formatDistanceToNow(new Date(cert.issued_at), { addSuffix: true }) : '—'}</span>
                        <span>Expires: {cert.expires_at ? format(new Date(cert.expires_at), 'MMM d, yyyy') : '—'} · {days > 0 ? `${days} days left` : `${Math.abs(days)} days ago`}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, maxWidth: 280 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setSelected(cert)} className="btn btn-secondary btn-sm"><Eye size={13} /> View</button>
                      {cert.cert_pem && <button onClick={() => download(cert.cert_pem, `${cert.domain}-cert.pem`)} className="btn btn-secondary btn-sm"><Download size={13} /></button>}
                      <button onClick={() => nav('/generate')} className="btn btn-secondary btn-sm"><RefreshCw size={13} /> Renew</button>
                      <button onClick={() => deleteCert(cert.id)} style={{ background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)', cursor: 'pointer', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
