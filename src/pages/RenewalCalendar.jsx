// RenewalCalendar.jsx — Month/year calendar of all cert expiry dates
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, Shield } from 'lucide-react'
import '../styles/design-v2.css'

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

function fmtShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function certStatus(expiresAt) {
  const d = daysUntil(expiresAt)
  if (d === null) return 'unknown'
  if (d < 0)   return 'expired'
  if (d <= 30) return 'warning'
  return 'healthy'
}

const STATUS_STYLE = {
  expired: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', pill: '#fef2f2', pillText: '#b91c1c' },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', pill: '#fffbeb', pillText: '#92400e' },
  healthy: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', pill: '#f0fdf4', pillText: '#166534' },
  unknown: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', pill: '#f8fafc', pillText: '#475569' },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function RenewalCalendar({ user }) {
  const today = useMemo(() => new Date(), [])
  const [certs,    setCerts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth,setViewMonth]= useState(today.getMonth())
  const [selected, setSelected] = useState(null) // { day, certs }

  useEffect(() => {
    if (!user) return
    supabase.from('certificates')
      .select('id, domain, expires_at, issued_at, cert_type, issuer, external_issuer, status, auto_renew_enabled')
      .eq('user_id', user.id)
      .neq('status', 'revoked')
      .order('expires_at', { ascending: true })
      .then(({ data }) => { setCerts(data || []); setLoading(false) })
  }, [user])

  const shiftMonth = (dir) => {
    setSelected(null)
    setViewMonth(m => {
      let nm = m + dir
      if (nm > 11) { setViewYear(y => y + 1); return 0 }
      if (nm < 0)  { setViewYear(y => y - 1); return 11 }
      return nm
    })
  }

  const goToday = () => {
    setSelected(null)
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  // Group certs by expiry date string
  const certsByDay = useMemo(() => {
    const map = {}
    certs.forEach(c => {
      if (!c.expires_at) return
      const d = new Date(c.expires_at)
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) return
      const key = d.getDate()
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [certs, viewYear, viewMonth])

  // Stats for this month
  const monthCerts = Object.values(certsByDay).flat()
  const statExpired = monthCerts.filter(c => certStatus(c.expires_at) === 'expired').length
  const statWarning = monthCerts.filter(c => certStatus(c.expires_at) === 'warning').length
  const statHealthy = monthCerts.filter(c => certStatus(c.expires_at) === 'healthy').length

  // Calendar grid
  const firstDow  = new Date(viewYear, viewMonth, 1).getDay()
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate()
  const isToday   = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 960 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 20, paddingTop: 8, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize: 22 }}>Renewal calendar</h1>
            <p style={{ fontSize: 13, color: 'var(--v2-text-3)', marginTop: 4 }}>
              Every cert expiry mapped by date — click any day to inspect
            </p>
          </div>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="v2-btn v2-btn-sm" onClick={() => shiftMonth(-1)}
              style={{ display: 'flex', alignItems: 'center', padding: '6px 8px' }}>
              <ChevronLeft size={14}/>
            </button>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text)',
              minWidth: 130, textAlign: 'center' }}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button className="v2-btn v2-btn-sm" onClick={() => shiftMonth(1)}
              style={{ display: 'flex', alignItems: 'center', padding: '6px 8px' }}>
              <ChevronRight size={14}/>
            </button>
            <button className="v2-btn v2-btn-sm" onClick={goToday}>Today</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'This month',  val: monthCerts.length,  color: 'var(--v2-text)' },
            { label: 'Expired',     val: statExpired,        color: '#dc2626'         },
            { label: 'Expiring ≤30d', val: statWarning,      color: '#d97706'         },
            { label: 'Healthy',     val: statHealthy,        color: '#16a34a'         },
          ].map(({ label, val, color }) => (
            <div key={label} className="v2-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 24, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--v2-text-3)' }}>
            <RefreshCw size={22} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 10px', display: 'block' }}/>
            Loading certificates…
          </div>
        ) : (
          <div className="v2-card" style={{ padding: '14px', overflow: 'hidden' }}>
            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--v2-text-3)',
                  textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {/* Empty prefix cells */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 72, background: 'var(--v2-surface-3)',
                  borderRadius: 6, opacity: 0.4 }}/>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysCount }).map((_, i) => {
                const day     = i + 1
                const dayCerts= certsByDay[day] || []
                const hasCerts= dayCerts.length > 0
                const isTod   = isToday(day)
                const isSelected = selected?.day === day
                const worstStatus = dayCerts.reduce((worst, c) => {
                  const s = certStatus(c.expires_at)
                  if (s === 'expired') return 'expired'
                  if (s === 'warning' && worst !== 'expired') return 'warning'
                  if (s === 'healthy' && worst === null) return 'healthy'
                  return worst
                }, hasCerts ? 'healthy' : null)

                const st = worstStatus ? STATUS_STYLE[worstStatus] : null

                return (
                  <div key={day}
                    onClick={() => hasCerts ? setSelected(isSelected ? null : { day, certs: dayCerts }) : null}
                    style={{
                      minHeight: 72,
                      borderRadius: 6,
                      padding: '5px',
                      border: isSelected
                        ? `2px solid ${st?.color || 'var(--v2-accent)'}`
                        : `0.5px solid ${hasCerts ? (st?.border || 'var(--v2-border)') : 'var(--v2-border)'}`,
                      background: isSelected
                        ? (st?.bg || 'var(--v2-surface-3)')
                        : hasCerts ? (st?.bg || 'var(--v2-bg)') : 'var(--v2-bg)',
                      cursor: hasCerts ? 'pointer' : 'default',
                      transition: 'all .12s',
                    }}>

                    {/* Day number */}
                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 3,
                      color: isTod ? 'var(--v2-accent)' : hasCerts ? (st?.color || 'var(--v2-text)') : 'var(--v2-text-3)',
                      ...(isTod ? {
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--v2-accent)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                      } : {}) }}>
                      {day}
                    </div>

                    {/* Cert pills */}
                    {dayCerts.slice(0, 2).map((c, ci) => {
                      const cs = certStatus(c.expires_at)
                      const css = STATUS_STYLE[cs]
                      return (
                        <div key={ci} style={{
                          fontSize: 9, fontWeight: 500, padding: '1px 4px', borderRadius: 3,
                          background: css.pill, color: css.pillText,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginBottom: 2, maxWidth: '100%',
                        }}>
                          {c.domain.replace('www.', '')}
                        </div>
                      )
                    })}
                    {dayCerts.length > 2 && (
                      <div style={{ fontSize: 9, color: 'var(--v2-text-3)', padding: '1px 4px' }}>
                        +{dayCerts.length - 2} more
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Expired',        color: '#dc2626', bg: '#fef2f2' },
                { label: 'Expiring ≤30d',  color: '#d97706', bg: '#fffbeb' },
                { label: 'Healthy (>30d)', color: '#16a34a', bg: '#f0fdf4' },
              ].map(({ label, color, bg }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: bg,
                    border: `0.5px solid ${color}55` }}/>
                  <span style={{ fontSize: 11, color: 'var(--v2-text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day detail panel */}
        {selected && (
          <div className="v2-card" style={{ marginTop: 12, padding: '14px 16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)' }}>
                {selected.certs.length} certificate{selected.certs.length !== 1 ? 's' : ''} expiring{' '}
                {MONTHS[viewMonth]} {selected.day}, {viewYear}
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--v2-text-3)', padding: 4 }}>
                ✕
              </button>
            </div>

            {/* Table head */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 120px 100px 80px 80px',
              padding: '6px 10px', background: 'var(--v2-surface-3)', borderRadius: 6,
              marginBottom: 2 }}>
              {['Domain', 'Issuer', 'Type', 'Expires', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--v2-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</div>
              ))}
            </div>

            {selected.certs.map((c, i) => {
              const cs  = certStatus(c.expires_at)
              const css = STATUS_STYLE[cs]
              const days = daysUntil(c.expires_at)
              return (
                <div key={c.id} style={{ display: 'grid',
                  gridTemplateColumns: '1.8fr 120px 100px 80px 80px',
                  padding: '9px 10px', alignItems: 'center',
                  borderBottom: i < selected.certs.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v2-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.domain}
                    {c.auto_renew_enabled && (
                      <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 6, padding: '1px 5px',
                        borderRadius: 3, background: '#eff6ff', color: '#1d4ed8' }}>AUTO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
                    {c.issuer || c.external_issuer || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
                    {c.cert_type || 'DV'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-2)' }}>
                    {fmtShort(c.expires_at)}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: css.pill, color: css.pillText }}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && certs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Calendar size={32} style={{ color: 'var(--v2-text-3)', margin: '0 auto 12px', display: 'block' }}/>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v2-text-2)', marginBottom: 6 }}>
              No certificates yet
            </div>
            <div style={{ fontSize: 12, color: 'var(--v2-text-3)' }}>
              Issue your first certificate to see it on the calendar.
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
