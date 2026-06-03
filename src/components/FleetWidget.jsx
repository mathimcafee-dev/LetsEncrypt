// FleetWidget.jsx — Multi-domain at-a-glance dashboard widget
import { RefreshCw, ExternalLink, RotateCcw, Shield, Server, AlertTriangle, XCircle } from 'lucide-react'
import { differenceInDays } from 'date-fns'

function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}

export default function FleetWidget({ certs, agents, loading, onRenew, nav }) {
  if (loading) return (
    <div style={{ background:'white', border:'0.5px solid rgba(15,23,42,0.08)',
      borderRadius:10, padding:'20px', marginBottom:20, display:'flex',
      alignItems:'center', gap:8, color:'#b5aea8', fontSize:13 }}>
      <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/>
      Loading fleet overview…
    </div>
  )

  if (!certs?.length) return null

  const activeCerts = certs.filter(c => c.status !== 'revoked' && c.status !== 'sandbox_revoked')
  const healthy  = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 })
  const expiring = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 })
  const expired  = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 })
  const activeAgents = agents?.length || 0

  const attention = [...expired, ...expiring].slice(0, 4)
  const allClear  = expired.length === 0 && expiring.length === 0

  return (
    <div style={{ background:'white', border:'0.5px solid rgba(15,23,42,0.08)',
      borderRadius:10, marginBottom:20, overflow:'hidden',
      animation:'fadeSlideUp 0.3s ease both', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'0.5px solid rgba(15,23,42,0.06)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Shield size={14} color="#1f5c4e"/>
          <span style={{ fontSize:13, fontWeight:600, color:'transparent' }}>Fleet overview</span>
          {allClear && (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20,
              background:'rgba(31,92,78,0.08)', color:'#5edb8a', border:'0.5px solid rgba(31,92,78,0.2)' }}>
              All clear ✓
            </span>
          )}
        </div>
        <span style={{ fontSize:11, color:'#b5aea8' }}>Live</span>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:0 }}>
        {[
          { val: healthy.length,  label:'Healthy',       color:'#5edb8a', bg:'rgba(31,92,78,0.08)', icon: <Shield size={13} color="#16a34a"/> },
          { val: expiring.length, label:'Expiring soon', color: expiring.length>0?'#1f5c4e':'rgba(240,237,232,0.5)', bg: expiring.length>0?'rgba(31,92,78,0.08)':'rgba(30,0,0,0.4)', icon: <AlertTriangle size={13} color={expiring.length>0?'#1f5c4e':'rgba(240,237,232,0.5)'}/> },
          { val: expired.length,  label:'Expired',       color: expired.length>0?'#1f5c4e':'rgba(240,237,232,0.5)',  bg: expired.length>0?'rgba(31,92,78,0.09)':'rgba(30,0,0,0.4)',  icon: <XCircle size={13} color={expired.length>0?'#1f5c4e':'rgba(240,237,232,0.5)'}/> },
          { val: activeAgents,    label:'Agents active', color:'#1f5c4e', bg:'rgba(31,92,78,0.08)', icon: <Server size={13} color="#1f5c4e"/> },
        ].map((s, i) => (
          <div key={s.label} style={{ padding:'14px 16px', background:s.bg,
            borderRight: i < 3 ? '0.5px solid rgba(15,23,42,0.06)' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              {s.icon}
              <span style={{ fontSize:10, fontWeight:600, color:'#b5aea8', textTransform:'uppercase', letterSpacing:'0.4px' }}>{s.label}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:800, color: s.val>0 ? s.color : 'transparent',
              letterSpacing:'-0.5px', lineHeight:1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Attention list */}
      {attention.length > 0 && (
        <div style={{ borderTop:'0.5px solid rgba(15,23,42,0.06)' }}>
          <div style={{ padding:'8px 16px', background:'rgba(30,0,0,0.4)' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#b5aea8', textTransform:'uppercase', letterSpacing:'0.4px' }}>Needs attention</span>
          </div>
          {attention.map(c => {
            const d  = daysLeft(c.expires_at)
            const isExpired = d != null && d < 0
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'9px 16px', borderTop:'0.5px solid rgba(15,23,42,0.05)' }}>
                {isExpired
                  ? <XCircle      size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>
                  : <AlertTriangle size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>}
                <span style={{ fontSize:13, flex:1, color:'#333333',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.domain}</span>
                <span style={{ fontSize:11, fontWeight:600, flexShrink:0,
                  color: isExpired ? '#1f5c4e' : '#1f5c4e',
                  background: isExpired ? 'rgba(31,92,78,0.09)' : 'rgba(31,92,78,0.08)',
                  padding:'2px 8px', borderRadius:4 }}>
                  {isExpired ? `Expired ${Math.abs(d)}d ago` : `Expires in ${d}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      {(expired.length > 0 || expiring.length > 0) && (
        <div style={{ borderTop:'0.5px solid rgba(15,23,42,0.06)',
          padding:'10px 16px', display:'flex', gap:8 }}>
          {expiring.length > 0 && (
            <button onClick={() => onRenew && onRenew(expiring)}
              style={{ display:'flex', alignItems:'center', gap:5, flex:1,
                background:'transparent', color:'white', border:'none', borderRadius:6,
                padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                justifyContent:'center' }}>
              <RotateCcw size={12}/> Renew all expiring ({expiring.length})
            </button>
          )}
          <button onClick={() => nav && nav('/dashboard')}
            style={{ display:'flex', alignItems:'center', gap:5,
              background:'white', color:'#333333', border:'0.5px solid rgba(15,23,42,0.12)',
              borderRadius:6, padding:'8px 14px', fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', justifyContent:'center',
              ...(expiring.length > 0 ? {} : { flex:1 }) }}>
            <ExternalLink size={12}/> View all
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
