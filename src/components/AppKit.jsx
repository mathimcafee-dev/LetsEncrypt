// AppKit.jsx — SSLVault CLM design system
// Single source of truth for in-app tokens and UI primitives,
// derived from the landing-page benchmark. Used by the CLM shell and all sections.
import { useEffect } from 'react'
import { X } from 'lucide-react'

// ── Tokens ──────────────────────────────────────────────────────────────
export const F      = "'Inter',system-ui,sans-serif"
export const DM     = "'DM Sans','Inter',system-ui,sans-serif"
export const MONO   = "'JetBrains Mono','Fira Mono',monospace"
export const BLUE   = '#0077b6'
export const BLUE2  = '#0091d6'
export const INK    = '#111111'
export const BG     = '#f0f4fa'
export const CARD   = '#ffffff'
export const BORDER = 'rgba(0,119,182,0.12)'
export const LINE   = '#e8eef4'          // inner separators on white
export const TEXT   = '#111111'
export const BODY   = '#3d4a58'
export const MUTED  = '#5a6776'
export const MUTED2 = '#7a8694'
export const GRN    = '#00a550'
export const GRN_T  = '#1a7d43'
export const GRN_BG = '#e3f5ea'
export const AMB    = '#9a6400'
export const AMB_BG = '#faf0d8'
export const RED    = '#b03425'
export const RED_BG = '#fae3df'
export const SHADOW = '0 2px 8px rgba(0,119,182,0.05)'
export const SHADOW_LG = '0 12px 40px rgba(0,40,65,0.18)'
export const GRAD   = `linear-gradient(135deg,${BLUE},${BLUE2})`

// ── SectionHead — kicker pill + DM Sans 900 title + optional actions ───
export function SectionHead({ kicker, title, sub, actions, style }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:14, marginBottom:18, flexWrap:'wrap', ...style }}>
      <div>
        {kicker && (
          <span style={{ display:'inline-block', fontSize:9.5, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:BLUE, fontFamily:MONO, background:'rgba(0,119,182,0.07)', border:`1px solid ${BORDER}`, borderRadius:20, padding:'4px 12px', marginBottom:8 }}>
            {kicker}
          </span>
        )}
        <h1 style={{ fontSize:24, fontWeight:900, fontFamily:DM, letterSpacing:'-0.01em', margin:0, color:TEXT }}>{title}</h1>
        {sub && <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>{actions}</div>}
    </div>
  )
}

// ── Btn — primary / secondary / danger / ghost ─────────────────────────
export function Btn({ children, variant='primary', size='md', onClick, disabled, style, title, type='button' }) {
  const base = {
    border:'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:DM, fontWeight:800,
    borderRadius:9, transition:'all .12s', opacity: disabled ? 0.55 : 1,
    display:'inline-flex', alignItems:'center', gap:7, justifyContent:'center',
    fontSize: size==='sm' ? 11.5 : 12.5,
    padding: size==='sm' ? '7px 13px' : '10px 18px',
  }
  const variants = {
    primary:   { background:BLUE, color:'#fff' },
    secondary: { background:'#fff', color:BLUE, border:`1.5px solid ${BORDER}` },
    danger:    { background:RED_BG, color:RED },
    ghost:     { background:'transparent', color:BODY, border:`1px solid ${BORDER}` },
  }
  return <button type={type} title={title} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>
}

// ── Pill — one status-pill set, app-wide ────────────────────────────────
// tone: green | amber | red | blue | gray
export function Pill({ children, tone='gray', style }) {
  const tones = {
    green: { background:GRN_BG, color:GRN_T },
    amber: { background:AMB_BG, color:AMB },
    red:   { background:RED_BG, color:RED },
    blue:  { background:'rgba(0,119,182,0.09)', color:BLUE },
    gray:  { background:'rgba(0,0,0,0.05)', color:MUTED },
  }
  return <span style={{ display:'inline-block', fontSize:9.5, fontWeight:800, borderRadius:9, padding:'2px 10px', whiteSpace:'nowrap', fontFamily:F, ...tones[tone], ...style }}>{children}</span>
}

// ── Tabs — segmented control ────────────────────────────────────────────
export function Tabs({ tabs, active, onChange, style }) {
  return (
    <div style={{ display:'flex', gap:4, background:BG, border:`1px solid ${BORDER}`, borderRadius:10, padding:4, width:'fit-content', maxWidth:'100%', overflowX:'auto', ...style }}>
      {tabs.map(t => {
        const id = typeof t === 'string' ? t : t.id
        const label = typeof t === 'string' ? t : t.label
        const on = active === id
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
            color: on ? BLUE : MUTED, background: on ? '#fff' : 'transparent',
            boxShadow: on ? '0 1px 4px rgba(0,119,182,0.15)' : 'none',
            fontFamily:DM, whiteSpace:'nowrap', transition:'all .12s',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

// ── KPI — stat tile ─────────────────────────────────────────────────────
export function KPI({ label, value, detail, color, style }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:'13px 16px', ...style }}>
      <div style={{ fontSize:9, fontWeight:700, color:MUTED2, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:MONO }}>{label}</div>
      <div style={{ fontSize:21, fontWeight:900, fontFamily:DM, marginTop:4, color: color || TEXT }}>{value}</div>
      {detail && <div style={{ fontSize:10, marginTop:3, color:MUTED }}>{detail}</div>}
    </div>
  )
}

// ── Card + CardHead ─────────────────────────────────────────────────────
export function Card({ children, style }) {
  return <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, boxShadow:SHADOW, ...style }}>{children}</div>
}
export function CardHead({ title, right, live, style }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 18px', borderBottom:`1px solid ${LINE}`, ...style }}>
      <span style={{ fontSize:13, fontWeight:800, fontFamily:DM, color:TEXT }}>{title}</span>
      <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
        {right}
        {live && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:9.5, color:GRN_T, fontFamily:MONO, fontWeight:700 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:GRN, display:'inline-block' }}/>LIVE
          </span>
        )}
      </span>
    </div>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────
export function EmptyState({ icon='🌐', title, sub, action, style }) {
  return (
    <div style={{ textAlign:'center', padding:'34px 18px', ...style }}>
      <div style={{ width:44, height:44, borderRadius:12, background:'rgba(0,119,182,0.07)', border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:18 }}>{icon}</div>
      <div style={{ fontSize:13, fontFamily:DM, fontWeight:800, marginBottom:4, color:TEXT }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:MUTED, lineHeight:1.55, marginBottom: action ? 12 : 0, maxWidth:320, margin: action ? '0 auto 12px' : '0 auto' }}>{sub}</div>}
      {action}
    </div>
  )
}

// ── MonoBlock — code/hash display ───────────────────────────────────────
export function MonoBlock({ children, style }) {
  return (
    <div style={{ fontFamily:MONO, background:BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:'10px 12px', fontSize:10.5, color:BODY, wordBreak:'break-all', lineHeight:1.6, ...style }}>
      {children}
    </div>
  )
}

// ── Modal — standard overlay dialog ─────────────────────────────────────
export function Modal({ open, onClose, title, children, width=520, footer }) {
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(13,17,23,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:SHADOW_LG, fontFamily:F }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', borderBottom:`1px solid ${LINE}` }}>
          <span style={{ fontSize:14.5, fontWeight:800, fontFamily:DM, color:TEXT }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:4, display:'flex', borderRadius:6 }}><X size={16}/></button>
        </div>
        <div style={{ padding:20, overflowY:'auto', flex:1 }}>{children}</div>
        {footer && <div style={{ padding:'13px 20px', borderTop:`1px solid ${LINE}`, display:'flex', justifyContent:'flex-end', gap:8 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── Table styles (objects, since tables vary too much for one component) ─
export const tableStyles = {
  table: { width:'100%', borderCollapse:'collapse', background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, overflow:'hidden' },
  th:    { textAlign:'left', fontSize:9, fontWeight:700, color:MUTED2, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:MONO, padding:'10px 14px', background:BG, borderBottom:`1px solid ${BORDER}` },
  td:    { padding:'12px 14px', fontSize:12, borderBottom:`1px solid ${LINE}`, verticalAlign:'middle', color:BODY },
}

// ── Input ───────────────────────────────────────────────────────────────
export const inputStyle = {
  width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:9, padding:'10px 13px',
  fontSize:12.5, fontFamily:F, color:TEXT, outline:'none', background:'#fff', boxSizing:'border-box',
}
