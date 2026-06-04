// AlertHistory.jsx — alert send history
// Design: identical to KeyLocker.jsx — design-v2.css, same inline styles, same colours
import { useState, useEffect } from 'react'
import { Bell, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, formatDistanceToNow } from 'date-fns'
import '../styles/design-v2.css'

const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM d, yyyy HH:mm') : '—'
const fmtAgo  = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—'

const TYPE_META = {
  cert_expiry:   { label:'Cert expiry',    color:'#0077b6' },
  order_renewal: { label:'Sub renewal',    color:'#fb923c' },
  pqc_risk:      { label:'PQC risk',       color:'#a78bfa' },
  test:          { label:'Test',           color:'#888888' },
}

export default function AlertHistory({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [alerts,   setAlerts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const { data: rows } = await supabase
        .from('expiry_alert_sent').select('*')
        .eq('user_id', user.id).order('sent_at', { ascending: false }).limit(100)
      if (rows?.length) {
        const certIds = [...new Set(rows.map(r => r.cert_id).filter(Boolean))]
        const { data: certs } = await supabase.from('certificates').select('id,domain').in('id', certIds)
        const map = {}; for (const c of (certs || [])) map[c.id] = c.domain
        setAlerts(rows.map(r => ({ ...r, domain: map[r.cert_id] || r.cert_id?.slice(0, 16) })))
      }
      setLoading(false)
    })()
  }, [user?.id])

  if (authLoading || loading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={22} style={{ animation:'spin .8s linear infinite' }} color="var(--v2-text-3)"/>
    </div>
  )

  if (!user) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#111111', marginBottom:12 }}>Sign in to view alerts</div>
        <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>Sign in</button>
      </div>
    </div>
  )

  const TABS = [
    { key:'all',           label:'All',          count: alerts.length },
    { key:'cert_expiry',   label:'Cert expiry',  count: alerts.filter(a=>a.alert_type==='cert_expiry').length },
    { key:'order_renewal', label:'Subscription', count: alerts.filter(a=>a.alert_type==='order_renewal').length },
    { key:'pqc_risk',      label:'PQC risk',     count: alerts.filter(a=>a.alert_type==='pqc_risk').length },
  ]
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.alert_type === filter)
  const meta = selected ? (TYPE_META[selected.alert_type] || TYPE_META.test) : null

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10,
              background:'linear-gradient(135deg,#f07059,#C45A4A)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bell size={18} color="white"/>
            </div>
            <div>
              <h1 className="v2-h1">Alert history</h1>
              <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} · last 100
              </p>
            </div>
          </div>
          <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => nav('/alert-settings')}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            Settings <ChevronRight size={11}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:1, borderBottom:'1px solid rgba(0,0,0,0.06)', marginBottom:20 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setFilter(t.key); setSelected(null) }}
              style={{ padding:'8px 14px', fontSize:12, fontWeight:filter===t.key?500:400,
                cursor:'pointer', fontFamily:'inherit', background:'none', border:'none',
                borderBottom:filter===t.key?'2px solid #2a6b5c':'2px solid transparent',
                color:filter===t.key?'#111111':'var(--v2-text-3)', marginBottom:'-0.5px',
                display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:8,
                background:filter===t.key?'transparent':'var(--v2-surface-3)',
                color:filter===t.key?'#111111':'var(--v2-text-3)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Split layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>

          {/* List */}
          <div className="v2-card" style={{ overflow:'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 24px' }}>
                <Bell size={32} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                <div style={{ fontSize:14, fontWeight:500, color:'#333333', marginBottom:6 }}>No alerts yet</div>
                <div style={{ fontSize:12, color:'#888888', maxWidth:300, margin:'0 auto', lineHeight:1.6 }}>
                  Alerts appear here once the daily cron finds certs approaching their thresholds.
                </div>
              </div>
            ) : filtered.map(a => {
              const m = TYPE_META[a.alert_type] || TYPE_META.test
              const isSelected = selected?.id === a.id
              return (
                <div key={a.id} onClick={() => setSelected(a)} style={{ padding:'10px 14px', cursor:'pointer',
                  borderBottom:'1px solid rgba(0,0,0,0.04)',
                  background: isSelected ? 'rgba(0,119,182,0.07)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #2a6b5c' : '2px solid transparent',
                  transition:'all 0.12s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
                    <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'#111111',
                      flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {a.domain || '—'}
                    </span>
                    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4,
                      background:`${m.color}18`, color:m.color, border:`0.5px solid ${m.color}30`,
                      textTransform:'uppercase', letterSpacing:'0.3px', flexShrink:0 }}>
                      {m.label}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:14 }}>
                    {a.alert_days && (
                      <span style={{ fontSize:10, color:'#888888' }}>{a.alert_days}d threshold</span>
                    )}
                    <span style={{ fontSize:10, color:'#888888' }}>· {fmtAgo(a.sent_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail */}
          <div className="v2-card" style={{ minHeight:300 }}>
            {!selected ? (
              <div style={{ textAlign:'center', padding:'48px 20px' }}>
                <Bell size={28} color="var(--v2-text-3)" style={{ margin:'0 auto 12px', display:'block' }}/>
                <div style={{ fontSize:13, fontWeight:500, color:'#333333', marginBottom:6 }}>Select an alert</div>
                <div style={{ fontSize:11, color:'#888888', lineHeight:1.6 }}>
                  Click any alert to see details
                </div>
              </div>
            ) : (
              <div style={{ padding:'16px' }}>
                <div style={{ marginBottom:14 }}>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4,
                    background:`${meta.color}18`, color:meta.color, border:`0.5px solid ${meta.color}30`,
                    textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    {meta.label}
                  </span>
                </div>
                {[
                  { label:'Domain',    value: selected.domain || '—', mono: true },
                  { label:'Type',      value: meta.label },
                  { label:'Threshold', value: selected.alert_days ? `${selected.alert_days} days` : '—' },
                  { label:'Sent',      value: fmtDate(selected.sent_at) },
                  { label:'Cert ID',   value: selected.cert_id ? selected.cert_id.slice(0,20)+'…' : '—', mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} style={{ display:'flex', padding:'8px 0',
                    borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ width:80, flexShrink:0, fontSize:11, color:'#888888' }}>{label}</span>
                    <span style={{ fontSize:12, color:'#333333', fontWeight:500,
                      fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
