// RenewalCalendar.jsx — Interactive calendar: monthly / weekly / yearly views with animations
import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, Shield, Zap } from 'lucide-react'
import '../styles/design-v2.css'

const ACCENT    = '#0e7fc0'
const RED       = '#dc2626'
const AMBER     = '#d97706'
const GREEN     = '#16a34a'
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_S  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_L    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DAYS_S    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function certStatus(expiresAt) {
  const d = daysUntil(expiresAt)
  if (d === null) return 'unknown'
  if (d < 0)   return 'expired'
  if (d <= 30) return 'warning'
  return 'healthy'
}
const S = {
  expired: { color: RED,   bg: '#fef2f2', border: '#fecaca', dot: RED   },
  warning: { color: AMBER, bg: '#fffbeb', border: '#fde68a', dot: AMBER },
  healthy: { color: GREEN, bg: '#f0fdf4', border: '#bbf7d0', dot: GREEN },
  unknown: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

// ── Cert pill ──────────────────────────────────────────────────────────
function CertPill({ cert, tiny = false }) {
  const st = certStatus(cert.expires_at)
  const cfg = S[st]
  return (
    <div style={{
      fontSize: tiny ? 8 : 9, fontWeight: 600,
      padding: tiny ? '1px 3px' : '1px 5px',
      borderRadius: 3, marginBottom: 2, maxWidth: '100%',
      background: cfg.bg, color: cfg.color,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      lineHeight: 1.4,
    }}>
      {cert.domain.replace('www.', '')}
    </div>
  )
}

// ── Detail panel for a selected day/week slot ─────────────────────────
function DayDetail({ label, certs, onClose }) {
  return (
    <div style={{
      marginTop: 10,
      background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
      borderRadius: 10, overflow: 'hidden',
      animation: 'slideDown .2s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', background:'var(--v2-surface-3)',
        borderBottom:'0.5px solid var(--v2-border)' }}>
        <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)' }}>
          {certs.length} cert{certs.length!==1?'s':''} — {label}
        </span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
          color:'var(--v2-text-3)', fontSize:16, lineHeight:1, padding:'0 4px' }}>×</button>
      </div>
      {certs.map((c, i) => {
        const st  = certStatus(c.expires_at)
        const cfg = S[st]
        const d   = daysUntil(c.expires_at)
        return (
          <div key={c.id || i} style={{
            display:'grid', gridTemplateColumns:'1fr 110px 80px 72px',
            padding:'9px 14px', alignItems:'center',
            borderBottom: i < certs.length-1 ? '0.5px solid var(--v2-border)' : 'none',
          }}>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)' }}>{c.domain}</div>
              <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:1 }}>
                {c.issuer || 'RapidSSL'} · {c.cert_type || 'DV'}
                {c.auto_renew_enabled && <span style={{ marginLeft:5, color:ACCENT, fontWeight:600 }}>AUTO</span>}
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>{fmtFull(c.expires_at)}</div>
            <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>{fmtFull(c.issued_at)}</div>
            <div>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4,
                background:cfg.bg, color:cfg.color }}>
                {d===null?'—':d<0?`${Math.abs(d)}d ago`:d===0?'Today':`${d}d`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══ MONTHLY VIEW ══════════════════════════════════════════════════════
function MonthView({ certs, viewYear, viewMonth, today }) {
  const [selected, setSelected] = useState(null)

  const certsByDay = useMemo(() => {
    const map = {}
    certs.forEach(c => {
      if (!c.expires_at) return
      const d = new Date(c.expires_at)
      if (d.getFullYear()!==viewYear || d.getMonth()!==viewMonth) return
      const k = d.getDate()
      if (!map[k]) map[k] = []
      map[k].push(c)
    })
    return map
  }, [certs, viewYear, viewMonth])

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay()
  const daysCount = new Date(viewYear, viewMonth+1, 0).getDate()

  const isToday = (d) => d===today.getDate() && viewMonth===today.getMonth() && viewYear===today.getFullYear()

  const selectedInfo = selected ? {
    label: `${MONTHS[viewMonth]} ${selected}, ${viewYear}`,
    certs: certsByDay[selected] || [],
  } : null

  return (
    <div>
      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:3 }}>
        {DAYS_S.map(d => (
          <div key={d} style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
            textAlign:'center', padding:'4px 0', letterSpacing:'0.4px', textTransform:'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {Array.from({length:firstDow}).map((_,i) => (
          <div key={`e${i}`} style={{ minHeight:80, borderRadius:7,
            background:'var(--v2-surface-3)', opacity:0.5 }}/>
        ))}
        {Array.from({length:daysCount}).map((_,i) => {
          const day = i+1
          const dc  = certsByDay[day] || []
          const tod = isToday(day)
          const sel = selected===day
          const worst = dc.reduce((w,c) => {
            const s=certStatus(c.expires_at)
            if(s==='expired') return 'expired'
            if(s==='warning'&&w!=='expired') return 'warning'
            if(s==='healthy'&&w===null) return 'healthy'
            return w
          }, dc.length>0?'healthy':null)
          const cfg = worst ? S[worst] : null

          return (
            <div key={day}
              onClick={() => dc.length>0 && setSelected(sel?null:day)}
              style={{
                minHeight:80, borderRadius:7, padding:'6px',
                background: sel ? (cfg?.bg||'var(--v2-surface)') : 'var(--v2-surface)',
                border: sel
                  ? `2px solid ${cfg?.color||ACCENT}`
                  : `0.5px solid ${dc.length>0?(cfg?.border||'var(--v2-border)'):'var(--v2-border)'}`,
                cursor: dc.length>0?'pointer':'default',
                transition:'all .15s ease',
                transform: sel ? 'scale(1.02)' : 'scale(1)',
              }}>
              {/* Day number */}
              <div style={{
                width:22, height:22, borderRadius:'50%', marginBottom:4,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: tod ? ACCENT : 'transparent',
                fontSize:11, fontWeight:tod||dc.length>0?600:400,
                color: tod ? '#fff' : dc.length>0 ? (cfg?.color||'var(--v2-text)') : 'var(--v2-text-3)',
              }}>
                {day}
              </div>
              {/* Pills */}
              {dc.slice(0,2).map((c,ci) => <CertPill key={ci} cert={c}/>)}
              {dc.length>2 && (
                <div style={{ fontSize:8, color:'var(--v2-text-3)', fontWeight:500 }}>
                  +{dc.length-2} more
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedInfo && (
        <DayDetail label={selectedInfo.label} certs={selectedInfo.certs} onClose={()=>setSelected(null)}/>
      )}
    </div>
  )
}

// ══ WEEKLY VIEW ═══════════════════════════════════════════════════════
function WeekView({ certs, viewYear, viewMonth, viewWeek, today }) {
  const [selected, setSelected] = useState(null)

  // Get the Monday of the Nth week of the month
  const weekDates = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startOffset = (first.getDay()+6)%7 // Monday=0
    const weekStart = new Date(viewYear, viewMonth, 1 + viewWeek*7 - startOffset)
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate()+i)
      return d
    })
  }, [viewYear, viewMonth, viewWeek])

  const certsByDate = useMemo(() => {
    const map = {}
    certs.forEach(c => {
      if (!c.expires_at) return
      const key = new Date(c.expires_at).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [certs])

  const hours = Array.from({length:12}, (_,i) => i+8) // 8am–8pm

  return (
    <div>
      {/* Day columns header */}
      <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', gap:2, marginBottom:2 }}>
        <div/>
        {weekDates.map((d,i) => {
          const isToday = d.toDateString()===today.toDateString()
          const dc = certsByDate[d.toDateString()]||[]
          const worst = dc.reduce((w,c)=>{
            const s=certStatus(c.expires_at)
            if(s==='expired') return 'expired'
            if(s==='warning'&&w!=='expired') return 'warning'
            return w
          }, dc.length>0?'healthy':null)
          return (
            <div key={i} style={{ textAlign:'center', padding:'8px 4px',
              background: isToday ? '#eff6ff' : 'var(--v2-surface-3)',
              borderRadius:7, border:`0.5px solid ${isToday?'#bfdbfe':'var(--v2-border)'}` }}>
              <div style={{ fontSize:10, color:'var(--v2-text-3)', textTransform:'uppercase',
                letterSpacing:'0.3px', marginBottom:2 }}>{DAYS_S[d.getDay()]}</div>
              <div style={{ fontSize:16, fontWeight:600,
                color: isToday ? ACCENT : 'var(--v2-text)' }}>{d.getDate()}</div>
              {dc.length>0 && (
                <div style={{ width:6, height:6, borderRadius:'50%', margin:'3px auto 0',
                  background: worst ? S[worst].dot : GREEN }}/>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:8, overflow:'hidden' }}>
        {hours.map(hour => (
          <div key={hour} style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)',
            borderBottom:'0.5px solid var(--v2-border)', minHeight:52 }}>
            <div style={{ fontSize:10, color:'var(--v2-text-3)', padding:'6px 8px',
              borderRight:'0.5px solid var(--v2-border)', background:'var(--v2-surface-3)',
              display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
              {hour}:00
            </div>
            {weekDates.map((d,di) => {
              const isToday = d.toDateString()===today.toDateString()
              const dc = certsByDate[d.toDateString()]||[]
              // Show certs in first slot of the day only
              const showCerts = hour===9 && dc.length>0
              return (
                <div key={di}
                  onClick={() => showCerts && setSelected(selected===d.toDateString()?null:d.toDateString())}
                  style={{
                    borderRight:'0.5px solid var(--v2-border)',
                    background: isToday ? '#f0f7ff' : 'transparent',
                    padding:'4px',
                    cursor: showCerts ? 'pointer' : 'default',
                  }}>
                  {showCerts && dc.map((c,ci) => <CertPill key={ci} cert={c} tiny/>)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {selected && (
        <DayDetail
          label={new Date(selected).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          certs={certsByDate[selected]||[]}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  )
}

// ══ YEARLY VIEW ═══════════════════════════════════════════════════════
function YearView({ certs, viewYear, today, onDrillDown }) {
  const certsByMonth = useMemo(() => {
    const map = Array.from({length:12}, () => ({ expired:0, warning:0, healthy:0, certs:[] }))
    certs.forEach(c => {
      if (!c.expires_at) return
      const d = new Date(c.expires_at)
      if (d.getFullYear() !== viewYear) return
      const m = d.getMonth()
      const st = certStatus(c.expires_at)
      map[m][st] = (map[m][st]||0)+1
      map[m].certs.push(c)
    })
    return map
  }, [certs, viewYear])

  const maxCount = Math.max(...certsByMonth.map(m => m.certs.length), 1)

  return (
    <div>
      {/* Heat-map row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:6, marginBottom:20 }}>
        {certsByMonth.map((m, mi) => {
          const total = m.certs.length
          const isCurrentMonth = mi===today.getMonth() && viewYear===today.getFullYear()
          const intensity = total/maxCount
          const hasExpired = m.expired>0
          const hasWarning = m.warning>0
          const barColor = hasExpired ? RED : hasWarning ? AMBER : total>0 ? GREEN : 'var(--v2-border)'

          return (
            <div key={mi}
              onClick={() => total>0 && onDrillDown(mi)}
              style={{ cursor: total>0?'pointer':'default', transition:'transform .15s' }}
              onMouseEnter={e=>{ if(total>0) e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)' }}>
              {/* Bar */}
              <div style={{ height:80, borderRadius:6, background:'var(--v2-surface-3)',
                border:`0.5px solid ${isCurrentMonth?ACCENT:'var(--v2-border)'}`,
                display:'flex', flexDirection:'column', justifyContent:'flex-end',
                overflow:'hidden', position:'relative' }}>
                {total>0 && (
                  <div style={{
                    height: `${Math.max(12, intensity*100)}%`,
                    background: barColor, borderRadius:'0 0 6px 6px',
                    transition: 'height .5s cubic-bezier(.16,1,.3,1)',
                    opacity: 0.85,
                  }}/>
                )}
                {total>0 && (
                  <div style={{ position:'absolute', top:'50%', left:'50%',
                    transform:'translate(-50%,-50%)',
                    fontSize:14, fontWeight:600, color: total>0?'var(--v2-text)':'var(--v2-text-3)' }}>
                    {total}
                  </div>
                )}
              </div>
              {/* Month label */}
              <div style={{ fontSize:10, textAlign:'center', marginTop:5,
                color: isCurrentMonth ? ACCENT : 'var(--v2-text-3)',
                fontWeight: isCurrentMonth ? 600 : 400 }}>
                {MONTHS_S[mi]}
              </div>
              {/* Status dots */}
              {total>0 && (
                <div style={{ display:'flex', justifyContent:'center', gap:3, marginTop:3 }}>
                  {m.expired>0 && <div style={{ width:4, height:4, borderRadius:'50%', background:RED }}/>}
                  {m.warning>0 && <div style={{ width:4, height:4, borderRadius:'50%', background:AMBER }}/>}
                  {m.healthy>0 && <div style={{ width:4, height:4, borderRadius:'50%', background:GREEN }}/>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mini calendar grid — 12 months */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {certsByMonth.map((m, mi) => {
          const firstDow  = new Date(viewYear, mi, 1).getDay()
          const daysCount = new Date(viewYear, mi+1, 0).getDate()
          const isCurrentMonth = mi===today.getMonth() && viewYear===today.getFullYear()

          return (
            <div key={mi}
              onClick={() => onDrillDown(mi)}
              style={{ background:'var(--v2-surface)', border:`0.5px solid ${isCurrentMonth?ACCENT:'var(--v2-border)'}`,
                borderRadius:9, padding:'10px', cursor:'pointer', transition:'all .15s',
                boxShadow: isCurrentMonth ? `0 0 0 1px ${ACCENT}22` : 'none' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{ fontSize:11, fontWeight:600, color: isCurrentMonth?ACCENT:'var(--v2-text)',
                marginBottom:6 }}>
                {MONTHS_S[mi]}
                {m.certs.length>0 && (
                  <span style={{ marginLeft:5, fontSize:10, fontWeight:500,
                    color: m.expired>0?RED:m.warning>0?AMBER:GREEN }}>
                    {m.certs.length}
                  </span>
                )}
              </div>
              {/* Micro grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
                {Array.from({length:firstDow}).map((_,i)=>(
                  <div key={`e${i}`} style={{ height:7 }}/>
                ))}
                {Array.from({length:daysCount}).map((_,i) => {
                  const day=i+1
                  const d=new Date(viewYear,mi,day)
                  const dc=m.certs.filter(c=>new Date(c.expires_at).getDate()===day)
                  const isToday=d.toDateString()===today.toDateString()
                  const st = dc.length>0 ? certStatus(dc[0].expires_at) : null
                  return (
                    <div key={day} style={{
                      height:7, borderRadius:1,
                      background: isToday ? ACCENT : st ? S[st].dot : 'var(--v2-surface-3)',
                      opacity: isToday || dc.length>0 ? 1 : 0.4,
                    }}/>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══ MAIN COMPONENT ════════════════════════════════════════════════════
export default function RenewalCalendar({ user }) {
  const today = useMemo(() => new Date(), [])
  const [certs,     setCerts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('month')   // month | week | year
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewWeek,  setViewWeek]  = useState(0)
  const [animDir,   setAnimDir]   = useState(1) // 1=forward, -1=back

  useEffect(() => {
    if (!user) return
    supabase.from('certificates')
      .select('id,domain,expires_at,issued_at,cert_type,issuer,external_issuer,status,auto_renew_enabled')
      .eq('user_id', user.id).neq('status','revoked')
      .order('expires_at', { ascending:true })
      .then(({ data }) => { setCerts(data||[]); setLoading(false) })
  }, [user])

  const navigate = (dir) => {
    setAnimDir(dir)
    if (view === 'year') {
      setViewYear(y => y + dir)
    } else if (view === 'month') {
      setViewMonth(m => {
        let nm = m + dir
        if (nm > 11) { setViewYear(y=>y+1); return 0 }
        if (nm < 0)  { setViewYear(y=>y-1); return 11 }
        return nm
      })
    } else {
      // week: advance by week
      const weeksInMonth = Math.ceil((new Date(viewYear,viewMonth,1).getDay() + new Date(viewYear,viewMonth+1,0).getDate()) / 7)
      setViewWeek(w => {
        let nw = w + dir
        if (nw >= weeksInMonth) {
          setViewMonth(m => { let nm=m+1; if(nm>11){setViewYear(y=>y+1);return 0;}return nm })
          return 0
        }
        if (nw < 0) {
          setViewMonth(m => { let nm=m-1; if(nm<0){setViewYear(y=>y-1);return 11;}return nm })
          return Math.ceil((new Date(viewYear,viewMonth-1<0?11:viewMonth-1,1).getDay() + new Date(viewYear,viewMonth<1?12:viewMonth,0).getDate())/7)-1
        }
        return nw
      })
    }
  }

  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setViewWeek(0)
  }

  const drillDown = (month) => {
    setViewMonth(month)
    setView('month')
  }

  // Stats
  const allExpired = certs.filter(c=>certStatus(c.expires_at)==='expired').length
  const allWarning = certs.filter(c=>certStatus(c.expires_at)==='warning').length
  const allHealthy = certs.filter(c=>certStatus(c.expires_at)==='healthy').length

  // Label for nav
  const navLabel = view==='year'
    ? `${viewYear}`
    : view==='month'
    ? `${MONTHS[viewMonth]} ${viewYear}`
    : `Week of ${MONTHS_S[viewMonth]} ${viewYear}`

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1080 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:16, paddingTop:8, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>Renewal calendar</h1>
            <p style={{ fontSize:13, color:'var(--v2-text-3)', marginTop:4 }}>
              {certs.length} certificate{certs.length!==1?'s':''} tracked · click any day to inspect
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* View switcher */}
            <div style={{ display:'flex', background:'var(--v2-surface-3)',
              border:'0.5px solid var(--v2-border)', borderRadius:8, overflow:'hidden', padding:2, gap:1 }}>
              {[['month','Month'],['week','Week'],['year','Year']].map(([v,l]) => (
                <button key={v} onClick={()=>setView(v)}
                  style={{ padding:'5px 14px', fontSize:11, fontWeight:view===v?600:400,
                    background: view===v ? 'var(--v2-surface)' : 'transparent',
                    border: view===v ? '0.5px solid var(--v2-border)' : 'none',
                    borderRadius:6, cursor:'pointer', color: view===v?'var(--v2-text)':'var(--v2-text-3)',
                    transition:'all .15s', fontFamily:'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Nav */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button className="v2-btn v2-btn-sm" onClick={()=>navigate(-1)}
                style={{ display:'flex', alignItems:'center', padding:'6px 8px' }}>
                <ChevronLeft size={14}/>
              </button>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)',
                minWidth:view==='year'?60:140, textAlign:'center' }}>
                {navLabel}
              </div>
              <button className="v2-btn v2-btn-sm" onClick={()=>navigate(1)}
                style={{ display:'flex', alignItems:'center', padding:'6px 8px' }}>
                <ChevronRight size={14}/>
              </button>
              <button className="v2-btn v2-btn-sm" onClick={goToday}>Today</button>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Total certs',    val:certs.length,  color:'var(--v2-text)' },
            { label:'Expired',        val:allExpired,    color:RED   },
            { label:'Expiring ≤30d',  val:allWarning,    color:AMBER },
            { label:'Healthy',        val:allHealthy,    color:GREEN },
          ].map(({label,val,color})=>(
            <div key={label} className="v2-card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:500, color, fontFamily:'monospace' }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Legend ── */}
        <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { label:'Expired',        color:RED,   bg:'#fef2f2' },
            { label:'Expiring ≤30d',  color:AMBER, bg:'#fffbeb' },
            { label:'Healthy (>30d)', color:GREEN, bg:'#f0fdf4' },
            { label:'Today',          color:ACCENT,bg:'#eff6ff' },
          ].map(({label,color,bg})=>(
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:2,
                background:bg, border:`0.5px solid ${color}55` }}/>
              <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Calendar body ── */}
        <div className="v2-card" style={{ padding:16, overflow:'hidden' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--v2-text-3)' }}>
              <RefreshCw size={22} style={{ animation:'spin .8s linear infinite',
                margin:'0 auto 10px', display:'block' }}/>
              Loading certificates…
            </div>
          ) : certs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <Calendar size={32} style={{ color:'var(--v2-text-3)', margin:'0 auto 12px', display:'block' }}/>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--v2-text-2)', marginBottom:6 }}>
                No certificates yet
              </div>
              <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>
                Issue your first certificate to see it on the calendar.
              </div>
            </div>
          ) : (
            <div style={{ animation: `${animDir>0?'slideInRight':'slideInLeft'} .22s ease` }}>
              {view==='month' && (
                <MonthView certs={certs} viewYear={viewYear} viewMonth={viewMonth} today={today}/>
              )}
              {view==='week' && (
                <WeekView certs={certs} viewYear={viewYear} viewMonth={viewMonth} viewWeek={viewWeek} today={today}/>
              )}
              {view==='year' && (
                <YearView certs={certs} viewYear={viewYear} today={today} onDrillDown={drillDown}/>
              )}
            </div>
          )}
        </div>

        {/* ── Upcoming renewals strip ── */}
        {!loading && certs.length > 0 && (() => {
          const upcoming = certs
            .filter(c => { const d=daysUntil(c.expires_at); return d!==null&&d>=0&&d<=90 })
            .slice(0,5)
          if (!upcoming.length) return null
          return (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text-3)',
                textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                Upcoming renewals — next 90 days
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {upcoming.map((c,i) => {
                  const d   = daysUntil(c.expires_at)
                  const st  = certStatus(c.expires_at)
                  const cfg = S[st]
                  const pct = Math.max(0, Math.min(100, (1 - d/90)*100))
                  return (
                    <div key={i} className="v2-card" style={{ padding:'10px 14px',
                      borderLeft:`3px solid ${cfg.color}`, borderRadius:'0 8px 8px 0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)', flex:1,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {c.domain}
                        </span>
                        <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                          {c.issuer||'RapidSSL'}
                        </span>
                        <span style={{ fontSize:11, fontWeight:600, color:cfg.color, flexShrink:0 }}>
                          {d===0?'Today':d===1?'Tomorrow':`${d} days`}
                        </span>
                        {c.auto_renew_enabled && (
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3,
                            background:'#eff6ff', color:ACCENT }}>AUTO</span>
                        )}
                      </div>
                      <div style={{ height:3, background:'var(--v2-surface-3)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:cfg.color,
                          borderRadius:2, transition:'width .6s' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0)}to{transform:rotate(360deg)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)} }
        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)} }
        @keyframes slideDown    { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
