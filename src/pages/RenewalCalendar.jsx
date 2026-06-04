// RenewalCalendar.jsx — Option A: GitHub heatmap style, month/week/year views
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, Shield, RotateCcw } from 'lucide-react'
import '../styles/design-v2.css'

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_S   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const ACCENT = '#111111'
const RED    = '#1f5c4e'
const AMBER  = '#9a6400'
const GREEN  = '#16a068'

const STATUS = {
  expired: { color: RED,   bg: 'rgba(31,92,78,0.09)', border: 'rgba(239,83,80,0.3)', bar: RED,   text: '#1f5c4e' },
  warning: { color: AMBER, bg: 'rgba(239,68,68,0.08)', border: '#fcd34d', bar: AMBER, text: '#9a6400' },
  healthy: { color: GREEN, bg: 'transparent', border: '#86efac', bar: GREEN, text: '#16a068' },
  today:   { color: ACCENT,bg: 'transparent', border: 'rgba(31,92,78,0.2)', bar: ACCENT,text: '#2e7a68' },
}

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function certStatus(expiresAt) {
  const d = daysUntil(expiresAt)
  if (d === null) return null
  if (d < 0)   return 'expired'
  if (d <= 30) return 'warning'
  return 'healthy'
}

// ── Day cell used in month view ───────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function DayCell({ day, certs, isToday, isSelected, onClick }) {
  const worst = certs.reduce((w, c) => {
    const s = certStatus(c.expires_at)
    if (s === 'expired') return 'expired'
    if (s === 'warning' && w !== 'expired') return 'warning'
    if (s === 'healthy' && !w) return 'healthy'
    return w
  }, null)

  const st       = isToday ? STATUS.today : worst ? STATUS[worst] : null
  const hasCerts = certs.length > 0
  const accentColor = worst ? STATUS[worst].bar : isToday ? ACCENT : null

  return (
    <div
      onClick={() => hasCerts && onClick()}
      style={{
        minHeight: 90,
        borderRadius: 8,
        padding: '7px 7px 6px',
        background: hasCerts
          ? (st ? st.bg : 'rgba(0,0,0,0.03)')
          : isToday ? 'rgba(192,57,43,0.06)' : 'rgba(0,0,0,0.02)',
        border: isSelected
          ? `2px solid ${accentColor || ACCENT}`
          : hasCerts
            ? `0.5px solid ${st ? st.border : 'var(--v2-border)'}`
            : `1px solid var(--v2-border)`,
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        cursor:    hasCerts ? 'pointer' : 'default',
        transition:'box-shadow .15s ease',
        opacity: 1,
      }}
      onMouseEnter={e => { if (hasCerts) e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.10)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none' }}
    >
      {/* Day number */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', marginBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isToday ? '#1f5c4e' : 'transparent',
        fontSize:12, fontWeight: hasCerts || isToday ? 700 : 400,
        color: isToday ? '#ffffff' : hasCerts ? (st ? st.text : '#ffffff') : '#6b5a5a',
      }}>
        {day}
      </div>

      {/* Cert pills — bigger, bolder */}
      {certs.slice(0, 3).map((c, i) => {
        const s   = certStatus(c.expires_at)
        const css = s ? STATUS[s] : STATUS.healthy
        return (
          <div key={i} style={{
            fontSize:10, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
            marginBottom: 2, lineHeight: 1.4,
            background: css.bg, color: css.text, border: `0.5px solid ${css.border}`,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {c.domain.replace(/^www\./, '').replace(/^(.{12}).*/, '$1…')}
          </div>
        )
      })}
      {certs.length > 3 && (
        <div style={{ fontSize:10, color: st ? st.text : 'var(--v2-text-3)',
          fontWeight: 600, marginTop: 1 }}>
          +{certs.length - 3} more
        </div>
      )}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────
function DetailPanel({ label, certs, onClose }) {
  return (
    <div style={{
      marginTop: 10, borderRadius: 10, overflow: 'hidden',
      border: '1px solid var(--v2-border)',
      animation: 'slideDown .18s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'9px 14px', background:'var(--v2-surface-3)',
        borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize:12, fontWeight:500, color:'#111111' }}>
          {certs.length} cert{certs.length!==1?'s':''} — {label}
        </span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
          color:'#888888', fontSize:16, lineHeight:1, padding:'0 4px' }}>×</button>
      </div>
      {/* Col headers */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 90px 70px',minWidth:400,
        padding:'6px 14px', background:'var(--v2-surface-3)',
        borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
        {['Domain','Issuer','Expires','Days'].map(h => (
          <div key={h} style={{ fontSize:9, fontWeight:600, color:'#888888',
            textTransform:'uppercase', letterSpacing:'0.3px' }}>{h}</div>
        ))}
      </div>
      {certs.map((c, i) => {
        const st  = certStatus(c.expires_at)
        const css = st ? STATUS[st] : STATUS.healthy
        const d   = daysUntil(c.expires_at)
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 110px 90px 70px',minWidth:400,
            padding:'9px 14px', alignItems:'center',
            borderBottom: i<certs.length-1 ? '1px solid var(--v2-border)' : 'none',
            background: 'rgba(0,0,0,0.03)',
          }}>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'#111111',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {c.domain}
              </div>
              <div style={{ fontSize:10, color:'#888888', marginTop:1 }}>
                {c.cert_type || 'DV'}
                {c.auto_renew_enabled && (
                  <span style={{ marginLeft:5, fontSize:9, fontWeight:600,
                    color:ACCENT, background:'transparent', padding:'1px 5px', borderRadius:3 }}>AUTO</span>
                )}
              </div>
            </div>
            <div style={{ fontSize:11, color:'#333333' }}>
              {c.issuer || c.external_issuer || 'RapidSSL'}
            </div>
            <div style={{ fontSize:11, color:'#333333' }}>{fmtDate(c.expires_at)}</div>
            <div>
              <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4,
                background:css.bg, color:css.text }}>
                {d===null?'—':d<0?`${Math.abs(d)}d ago`:d===0?'Today':`${d}d`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══ MONTH VIEW ════════════════════════════════════════════════════════
function MonthView({ certs, viewYear, viewMonth, today }) {
  const [selectedDay, setSelectedDay] = useState(null)

  const certsByDay = useMemo(() => {
    const map = {}
    certs.forEach(c => {
      if (!c.expires_at) return
      const d = new Date(c.expires_at)
      if (d.getFullYear()!==viewYear || d.getMonth()!==viewMonth) return
      const k = d.getDate(); if (!map[k]) map[k] = []; map[k].push(c)
    })
    return map
  }, [certs, viewYear, viewMonth])

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay()
  const daysCount = new Date(viewYear, viewMonth+1, 0).getDate()
  const isToday   = d => d===today.getDate() && viewMonth===today.getMonth() && viewYear===today.getFullYear()

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:4, marginBottom:4 }}>
        {DAYS_S.map(d => (
          <div key={d} style={{ fontSize:10, fontWeight:700, color:'#777777',
            textAlign:'center', padding:'6px 0', textTransform:'uppercase', letterSpacing:'1px' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:4 }}>
        {Array.from({length:firstDow}).map((_,i) => (
          <div key={`e${i}`} style={{ minHeight:78, borderRadius:8,
            background:'rgba(0,0,0,0.02)', opacity:1 }}/>
        ))}
        {Array.from({length:daysCount}).map((_,i) => {
          const day = i+1
          return (
            <DayCell
              key={day} day={day}
              certs={certsByDay[day]||[]}
              isToday={isToday(day)}
              isSelected={selectedDay===day}
              onClick={() => setSelectedDay(selectedDay===day?null:day)}
            />
          )
        })}
      </div>

      {selectedDay && certsByDay[selectedDay] && (
        <DetailPanel
          label={`${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`}
          certs={certsByDay[selectedDay]}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

// ══ WEEK VIEW ═════════════════════════════════════════════════════════
function WeekView({ certs, viewYear, viewMonth, viewWeek, today }) {
  const [selectedDate, setSelectedDate] = useState(null)

  const weekDates = useMemo(() => {
    const first      = new Date(viewYear, viewMonth, 1)
    const startOffset= (first.getDay() + 6) % 7
    const weekStart  = new Date(viewYear, viewMonth, 1 + viewWeek*7 - startOffset)
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d
    })
  }, [viewYear, viewMonth, viewWeek])

  const certsByDate = useMemo(() => {
    const map = {}
    certs.forEach(c => {
      if (!c.expires_at) return
      const key = new Date(c.expires_at).toDateString()
      if (!map[key]) map[key] = []; map[key].push(c)
    })
    return map
  }, [certs])

  return (
    <div>
      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'50px repeat(auto-fill,minmax(100px,1fr))', gap:3, marginBottom:3 }}>
        <div/>
        {weekDates.map((d,i) => {
          const isToday = d.toDateString()===today.toDateString()
          const dc = certsByDate[d.toDateString()]||[]
          const worst = dc.reduce((w,c)=>{const s=certStatus(c.expires_at);if(s==='expired')return 'expired';if(s==='warning'&&w!=='expired')return 'warning';return w}, dc.length>0?'healthy':null)
          const st = isToday ? STATUS.today : worst ? STATUS[worst] : null
          return (
            <div key={i} style={{ textAlign:'center', padding:'8px 4px',
              background: st ? st.bg : 'var(--v2-surface-3)',
              border:`0.5px solid ${st ? st.border : 'var(--v2-border)'}`,
              borderRadius:8 }}>
              <div style={{ fontSize:9, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.3px', marginBottom:2 }}>{DAYS_S[d.getDay()]}</div>
              <div style={{ fontSize:18, fontWeight:600,
                color: isToday ? '#ffffff' : st ? st.text : '#ffffff' }}>{d.getDate()}</div>
              {dc.length>0 && (
                <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:4 }}>
                  {dc.slice(0,3).map((_,ci) => (
                    <div key={ci} style={{ width:5, height:5, borderRadius:'50%',
                      background: worst ? STATUS[worst].bar : GREEN }}/>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time rows */}
      <div style={{ border:'1px solid var(--v2-border)', borderRadius:8, overflow:'hidden' }}>
        {Array.from({length:10}, (_,i) => i+8).map(hour => (
          <div key={hour} style={{ display:'grid', gridTemplateColumns:'50px repeat(auto-fill,minmax(100px,1fr))',
            borderBottom:'1px solid rgba(0,0,0,0.06)', minHeight:48 }}>
            <div style={{ fontSize:9, color:'#888888', padding:'5px 8px',
              borderRight:'1px solid var(--v2-border)', background:'var(--v2-surface-3)',
              display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
              {hour}:00
            </div>
            {weekDates.map((d,di) => {
              const isToday = d.toDateString()===today.toDateString()
              const dc = certsByDate[d.toDateString()]||[]
              const showCerts = hour===9 && dc.length>0
              const key = d.toDateString()
              return (
                <div key={di} onClick={() => showCerts&&setSelectedDate(selectedDate===key?null:key)}
                  style={{ background: isToday?'rgba(30,0,0,0.4)':'transparent',
                    borderRight:'1px solid var(--v2-border)',
                    padding:3, cursor:showCerts?'pointer':'default' }}>
                  {showCerts && dc.slice(0,2).map((c,ci) => {
                    const s = certStatus(c.expires_at)
                    const css = s ? STATUS[s] : STATUS.healthy
                    return (
                      <div key={ci} style={{ fontSize:8, fontWeight:600,
                        padding:'1px 3px', borderRadius:3, marginBottom:2,
                        background:css.bg, color:css.text,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {c.domain.replace('www.','')}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {selectedDate && certsByDate[selectedDate] && (
        <DetailPanel
          label={new Date(selectedDate).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          certs={certsByDate[selectedDate]}
          onClose={()=>setSelectedDate(null)}
        />
      )}
    </div>
  )
}

// ══ YEAR VIEW ═════════════════════════════════════════════════════════
function YearView({ certs, viewYear, today, onDrillDown }) {
  const certsByMonth = useMemo(() => {
    return Array.from({length:12}, (_,mi) => {
      const mc = certs.filter(c => {
        if (!c.expires_at) return false
        const d = new Date(c.expires_at)
        return d.getFullYear()===viewYear && d.getMonth()===mi
      })
      const expired = mc.filter(c=>certStatus(c.expires_at)==='expired').length
      const warning = mc.filter(c=>certStatus(c.expires_at)==='warning').length
      return { certs:mc, expired, warning }
    })
  }, [certs, viewYear])

  const maxCount = Math.max(...certsByMonth.map(m=>m.certs.length), 1)

  return (
    <div>
      {/* Bar chart */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(60px,1fr))', gap:6, marginBottom:20 }}>
        {certsByMonth.map((m,mi) => {
          const isCurrent = mi===today.getMonth() && viewYear===today.getFullYear()
          const total = m.certs.length
          const barColor = m.expired>0 ? RED : m.warning>0 ? AMBER : total>0 ? GREEN : 'var(--v2-border)'
          const pct = total>0 ? Math.max(14, (total/maxCount)*100) : 0

          return (
            <div key={mi}
              onClick={() => total>0 && onDrillDown(mi)}
              style={{ cursor:total>0?'pointer':'default', textAlign:'center' }}
              onMouseEnter={e=>{ if(total>0) e.currentTarget.style.transform='translateY(-3px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{ height:80, borderRadius:7, background:'var(--v2-surface-3)',
                border:`0.5px solid ${isCurrent?ACCENT:'var(--v2-border)'}`,
                display:'flex', flexDirection:'column', justifyContent:'flex-end',
                overflow:'hidden', position:'relative', transition:'all .15s' }}>
                {total>0 && (
                  <div style={{ height:`${pct}%`, background:barColor, opacity:0.85,
                    borderRadius:'0 0 6px 6px', transition:'height .4s cubic-bezier(.16,1,.3,1)' }}/>
                )}
                {total>0 && (
                  <div style={{ position:'absolute', top:'50%', left:'50%',
                    transform:'translate(-50%,-50%)',
                    fontSize:15, fontWeight:600, color:'#111111' }}>{total}</div>
                )}
              </div>
              <div style={{ fontSize:9, marginTop:5, fontWeight: isCurrent?600:400,
                color: isCurrent?ACCENT:'#b0a8a0' }}>{MONTHS_S[mi]}</div>
              {total>0 && (
                <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:2 }}>
                  {m.expired>0&&<div style={{ width:4,height:4,borderRadius:'50%',background:RED }}/>}
                  {m.warning>0&&<div style={{ width:4,height:4,borderRadius:'50%',background:AMBER }}/>}
                  {m.certs.filter(c=>certStatus(c.expires_at)==='healthy').length>0&&<div style={{ width:4,height:4,borderRadius:'50%',background:GREEN }}/>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mini month grid — 12 months */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
        {certsByMonth.map((m,mi) => {
          const isCurrent = mi===today.getMonth() && viewYear===today.getFullYear()
          const firstDow  = new Date(viewYear,mi,1).getDay()
          const daysCount = new Date(viewYear,mi+1,0).getDate()

          return (
            <div key={mi}
              onClick={() => onDrillDown(mi)}
              style={{ background:'var(--v2-surface)', border:`0.5px solid ${isCurrent?ACCENT:'var(--v2-border)'}`,
                borderRadius:9, padding:10, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:11, fontWeight:600, color:isCurrent?ACCENT:'var(--v2-text)' }}>
                  {MONTHS_S[mi]}
                </span>
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20,
                  background: m.certs.length===0 ? 'var(--v2-bg)' : m.expired>0?'rgba(31,92,78,0.09)':m.warning>0?'rgba(239,68,68,0.08)':'transparent',
                  color: m.certs.length===0 ? 'var(--v2-text-3)' : m.expired>0?RED:m.warning>0?AMBER:GREEN,
                  border: `0.5px solid ${m.certs.length===0?'var(--v2-border)':m.expired>0?'rgba(239,83,80,0.3)':m.warning>0?'rgba(0,0,0,0.1)':'rgba(31,92,78,0.2)'}` }}>
                  {m.certs.length}
                </span>
              </div>
              {/* Micro pixel grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:1 }}>
                {Array.from({length:firstDow}).map((_,i)=>(
                  <div key={`e${i}`} style={{ height:6 }}/>
                ))}
                {Array.from({length:daysCount}).map((_,i) => {
                  const day=i+1
                  const d=new Date(viewYear,mi,day)
                  const dc=m.certs.filter(c=>new Date(c.expires_at).getDate()===day)
                  const isToday=d.toDateString()===today.toDateString()
                  const st=dc.length>0?certStatus(dc[0].expires_at):null
                  return (
                    <div key={day} style={{
                      height:6, borderRadius:1,
                      background: isToday?ACCENT:st?STATUS[st].bar:'var(--v2-surface-3)',
                      opacity: isToday||dc.length>0 ? 1 : 0.5,
                      transition:'all .1s',
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

// ══ MAIN ══════════════════════════════════════════════════════════════
export default function RenewalCalendar({ user }) {
  const isMobile = useIsMobile()
  const today = useMemo(()=>new Date(),[])
  const [certs,     setCerts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('month')
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewWeek,  setViewWeek]  = useState(0)
  const [animKey,   setAnimKey]   = useState(0) // triggers re-mount animation

  useEffect(() => {
    if (!user) return
    supabase.from('certificates')
      .select('id,domain,expires_at,issued_at,cert_type,issuer,external_issuer,status,auto_renew_enabled')
      .eq('user_id', user.id).neq('status','revoked')
      .order('expires_at', { ascending:true })
      .then(({ data }) => { setCerts(data||[]); setLoading(false) })
  }, [user])

  const navigate = (dir) => {
    setAnimKey(k=>k+1)
    if (view==='year') {
      setViewYear(y=>y+dir)
    } else if (view==='month') {
      let nm=viewMonth+dir, ny=viewYear
      if(nm>11){nm=0;ny++} ; if(nm<0){nm=11;ny--}
      setViewMonth(nm); setViewYear(ny)
    } else {
      const weeksInMonth = Math.ceil((new Date(viewYear,viewMonth,1).getDay()+new Date(viewYear,viewMonth+1,0).getDate())/7)
      let nw=viewWeek+dir, nm=viewMonth, ny=viewYear
      if(nw>=weeksInMonth){nw=0;nm++;if(nm>11){nm=0;ny++}}
      if(nw<0){nm--;if(nm<0){nm=11;ny--};nw=Math.ceil((new Date(ny,nm,1).getDay()+new Date(ny,nm+1,0).getDate())/7)-1}
      setViewWeek(nw); setViewMonth(nm); setViewYear(ny)
    }
  }

  const goToday = () => {
    setAnimKey(k=>k+1)
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setViewWeek(0)
  }

  const drillDown = (month) => { setViewMonth(month); setView('month'); setAnimKey(k=>k+1) }

  const allExpired = certs.filter(c=>certStatus(c.expires_at)==='expired').length
  const allWarning = certs.filter(c=>certStatus(c.expires_at)==='warning').length
  const allHealthy = certs.filter(c=>certStatus(c.expires_at)==='healthy').length

  const upcoming = certs.filter(c=>{ const d=daysUntil(c.expires_at); return d!==null&&d>=0&&d<=90 }).slice(0,5)

  const navLabel = view==='year' ? `${viewYear}`
    : view==='month' ? `${MONTHS[viewMonth]} ${viewYear}`
    : `Week ${viewWeek+1} · ${MONTHS_S[viewMonth]} ${viewYear}`

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1060 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:16, paddingTop:8, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 className="v2-h1" style={{ fontSize:22 }}>Renewal calendar</h1>
            <p style={{ fontSize:13, color:'#888888', marginTop:4 }}>
              {certs.length} certificate{certs.length!==1?'s':''} tracked · click any day to inspect
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* View switcher */}
            <div style={{ display:'flex', background:'rgba(0,0,0,0.03)',
              border:'1px solid rgba(0,0,0,0.08)', borderRadius:8, padding:3, gap:2 }}>
              {[['month','Month'],['week','Week'],['year','Year']].map(([v,l])=>(
                <button key={v} onClick={()=>{setView(v);setAnimKey(k=>k+1)}}
                  style={{ padding:'6px 16px', fontSize:12, fontWeight: view===v ? 700 : 500,
                    background: view===v ? '#1f5c4e' : 'transparent',
                    border: 'none',
                    borderRadius:6, cursor:'pointer', fontFamily:'inherit',
                    color: view===v ? '#ffffff' : '#888888',
                    transition:'all .15s',
                    boxShadow: view===v ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Nav */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={()=>navigate(-1)}
                style={{ display:'flex', alignItems:'center', padding:'6px 8px' }}>
                <ChevronLeft size={14}/>
              </button>
              <div style={{ fontSize:13, fontWeight:500, color:'#111111',
                minWidth:view==='year'?50:150, textAlign:'center' }}>
                {navLabel}
              </div>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={()=>navigate(1)}
                style={{ display:'flex', alignItems:'center', padding:'6px 8px' }}>
                <ChevronRight size={14}/>
              </button>
              <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={goToday}>Today</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, marginBottom:16, border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden' }}>
          {[
            { label:'Total',         val:certs.length, color:'#111111' },
            { label:'Expired',       val:allExpired,   color: allExpired > 0 ? RED : '#999999' },
            { label:'Expiring ≤30d', val:allWarning,   color: allWarning > 0 ? AMBER : '#999999' },
            { label:'Healthy',       val:allHealthy,   color: allHealthy > 0 ? GREEN : '#999999' },
          ].map(({label,val,color},i)=>(
            <div key={label} style={{ padding:'14px 18px', background:'rgba(0,0,0,0.02)', borderRight: i<3 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
              <div style={{ fontSize:24, fontWeight:700, color, letterSpacing:'-1px', lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color:'#888888', marginTop:5, fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:14, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { label:'Expired',        color:RED,   bg:'rgba(31,92,78,0.09)', border:'rgba(239,83,80,0.3)' },
            { label:'Expiring ≤30d',  color:AMBER, bg:'rgba(239,68,68,0.08)', border:'#fcd34d' },
            { label:'Healthy (>30d)', color:GREEN, bg:'transparent', border:'#86efac' },
            { label:'Today',          color:ACCENT,bg:'transparent', border:'rgba(31,92,78,0.2)' },
          ].map(({label,color,bg,border})=>(
            <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:10,height:10,borderRadius:2,background:bg,border:`0.5px solid ${border}` }}/>
              <span style={{ fontSize:11, color:'#888888' }}>{label}</span>
            </div>
          ))}
          <div style={{ marginLeft:'auto', fontSize:11, color:'#888888' }}>
            Hover to enlarge · click to inspect
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#888888' }}>
              <RefreshCw size={22} style={{ animation:'spin .8s linear infinite',
                margin:'0 auto 10px', display:'block' }}/>
              Loading certificates…
            </div>
          ) : certs.length===0 ? (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <Calendar size={32} style={{ color:'#888888', margin:'0 auto 12px', display:'block' }}/>
              <div style={{ fontSize:14, fontWeight:500, color:'#333333', marginBottom:6 }}>
                No certificates yet
              </div>
              <div style={{ fontSize:12, color:'#888888' }}>
                Issue your first certificate to see it on the calendar.
              </div>
            </div>
          ) : (
            <div key={animKey} style={{ animation:'fadeSlide .2s ease' }}>
              {view==='month' && <MonthView certs={certs} viewYear={viewYear} viewMonth={viewMonth} today={today}/>}
              {view==='week'  && <WeekView  certs={certs} viewYear={viewYear} viewMonth={viewMonth} viewWeek={viewWeek} today={today}/>}
              {view==='year'  && <YearView  certs={certs} viewYear={viewYear} today={today} onDrillDown={drillDown}/>}
            </div>
          )}
        </div>

        {/* Upcoming strip */}
        {!loading && upcoming.length>0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#888888',
              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
              Upcoming — next 90 days
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {upcoming.map((c,i) => {
                const d   = daysUntil(c.expires_at)
                const st  = certStatus(c.expires_at)
                const css = st ? STATUS[st] : STATUS.healthy
                const pct = Math.max(4, Math.min(100,(1-d/90)*100))
                return (
                  <div key={i} className="v2-card" style={{ padding:'10px 14px',
                    borderLeft:`3px solid ${css.color}`, borderRadius:'0 8px 8px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:500, color:'#111111', flex:1,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {c.domain}
                      </span>
                      <span style={{ fontSize:11, color:'#888888' }}>
                        {c.issuer||'RapidSSL'}
                      </span>
                      <span style={{ fontSize:11, fontWeight:600, color:css.color, flexShrink:0 }}>
                        {d===0?'Today':d===1?'Tomorrow':`${d} days`}
                      </span>
                      {c.auto_renew_enabled && (
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:3,
                          background:'transparent', color:ACCENT }}>AUTO</span>
                      )}
                    </div>
                    <div style={{ height:3, background:'var(--v2-surface-3)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:css.bar,
                        borderRadius:2, transition:'width .6s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin       { from{transform:rotate(0)}to{transform:rotate(360deg)} }
        @keyframes fadeSlide  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown  { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
