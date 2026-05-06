import { useState, useEffect } from 'react'
import { Shield, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { differenceInDays, formatDistanceToNow } from 'date-fns'

export default function Dashboard({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/auth'); return }
    loadCerts()
  }, [user, authLoading])

  const loadCerts = async () => {
    setLoading(true)
    const { data } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false })
    setCerts(data || [])
    setLoading(false)
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
    const days = differenceInDays(new Date(cert.expires_at), new Date())
    if (days < 0) return { label:'Expired', color:'red', icon:AlertTriangle, days }
    if (days < 14) return { label:'Expiring Soon', color:'yellow', icon:Clock, days }
    return { label:'Active', color:'green', icon:CheckCircle, days }
  }

  const stats = {
    total: certs.length,
    active: certs.filter(c => differenceInDays(new Date(c.expires_at), new Date()) >= 14).length,
    expiring: certs.filter(c => { const d = differenceInDays(new Date(c.expires_at), new Date()); return d >= 0 && d < 14 }).length,
    expired: certs.filter(c => differenceInDays(new Date(c.expires_at), new Date()) < 0).length,
  }

  return (
    <div className="container" style={{ padding:'40px 24px 80px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>Certificate Dashboard</h1>
          <p style={{ color:'var(--text3)', fontSize:14 }}>Manage and monitor all your SSL certificates</p>
        </div>
        <button onClick={() => nav('/generate')} className="btn btn-primary">
          <PlusCircle size={16} /> New Certificate
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:32 }}>
        {[['Total',stats.total,'var(--accent)'],['Active',stats.active,'var(--green)'],['Expiring Soon',stats.expiring,'var(--yellow)'],['Expired',stats.expired,'var(--red)']].map(([label,value,color]) => (
          <div key={label} className="card" style={{ textAlign:'center', padding:20 }}>
            <div style={{ fontSize:36, fontWeight:800, color, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
          <span className="spinner" style={{ borderTopColor:'var(--accent)', width:24, height:24 }} />
          <p style={{ marginTop:16 }}>Loading certificates...</p>
        </div>
      ) : certs.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px 24px' }}>
          <Shield size={48} color="var(--text3)" style={{ margin:'0 auto 20px' }} />
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>No certificates yet</h2>
          <p style={{ color:'var(--text3)', marginBottom:24 }}>Generate your first free SSL certificate to get started</p>
          <button onClick={() => nav('/generate')} className="btn btn-primary"><PlusCircle size={16} /> Generate Free SSL</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {certs.map(cert => {
            const status = getStatus(cert)
            const StatusIcon = status.icon
            const colorMap = { green:'52,211,153', yellow:'251,191,36', red:'248,113,113', blue:'56,189,248' }
            const rgb = colorMap[status.color] || colorMap.blue
            return (
              <div key={cert.id} className="card" style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20, alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:`rgba(${rgb},0.1)`, border:`1px solid rgba(${rgb},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Shield size={22} color={`var(--${status.color})`} />
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:16, fontFamily:'var(--mono)' }}>{cert.domain}</span>
                      <span className={`badge badge-${status.color}`}><StatusIcon size={10} /> {status.label}</span>
                      {cert.staging && <span className="badge badge-blue">Staging</span>}
                    </div>
                    <div style={{ display:'flex', gap:20, fontSize:12, color:'var(--text3)' }}>
                      <span>Issued: {formatDistanceToNow(new Date(cert.issued_at), { addSuffix:true })}</span>
                      <span>Expires: {new Date(cert.expires_at).toLocaleDateString()} ({status.days > 0 ? `${status.days} days left` : `${Math.abs(status.days)} days ago`})</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {cert.cert_pem && <>
                    <button className="btn btn-secondary btn-sm" onClick={() => download(cert.cert_pem, `${cert.domain}-cert.pem`)}><Download size={14} /> cert.pem</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => download(cert.private_key_pem, `${cert.domain}-key.pem`)}><Download size={14} /> key.pem</button>
                  </>}
                  <button onClick={() => nav('/generate')} className="btn btn-secondary btn-sm"><RefreshCw size={14} /> Renew</button>
                  <button onClick={() => deleteCert(cert.id)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:'var(--red)', cursor:'pointer', borderRadius:'var(--radius-sm)', padding:'8px 12px', display:'flex', alignItems:'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {stats.expiring > 0 && (
        <div className="alert alert-warning" style={{ marginTop:24, display:'flex', alignItems:'center', gap:12 }}>
          <AlertTriangle size={16} />
          <span><strong>{stats.expiring} certificate{stats.expiring > 1 ? 's' : ''}</strong> expiring within 14 days. Renew them to avoid downtime.</span>
        </div>
      )}
    </div>
  )
}
