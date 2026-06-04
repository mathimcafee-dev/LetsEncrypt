
import { ArrowRight, BookOpen, Clock, Globe, Mail, MessageSquare, Shield, Users, Zap } from 'lucide-react'
import '../styles/design-v2.css'

export default function Contact({ nav }) {
  const email = 'mathimcafee@gmail.com'

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:900, padding:'40px 24px 80px' }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div style={{ textAlign:'center', padding:'48px 0 48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'var(--v2-green-bg)', border:'1px solid var(--v2-green-border)',
                        borderRadius:100, padding:'4px 14px', marginBottom:20 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-green-text)' }}>
              Every email gets read
            </span>
          </div>
          <h1 style={{ fontSize:'clamp(32px,5vw,52px)', fontWeight:700, letterSpacing:'-1.2px',
                        lineHeight:1.1, margin:'0 0 14px', color:'#111111' }}>
            Have a question?<br />
            <span style={{ color:'var(--v2-green)' }}>Drop us a line.</span>
          </h1>
          <p style={{ fontSize:16, color:'#333333', maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>
            Bug reports, feature requests, partnership ideas, or just saying hi —
            we typically reply within 1–2 days.
          </p>
        </div>

        {/* ── EMAIL CARD ───────────────────────────────────────────── */}
        <div className="v2-card" style={{ padding:'40px', marginBottom:16, textAlign:'center',
                                          borderTop:'2px solid var(--v2-green)' }}>
          <div style={{ width:56, height:56, borderRadius:'var(--v2-r-xl)', margin:'0 auto 20px',
                        background:'var(--v2-green-bg)', border:'1px solid var(--v2-green-border)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Mail size={24} color='var(--v2-green)' />
          </div>
          <div className="v2-section-label" style={{ marginBottom:8 }}>Email</div>
          <a href={`mailto:${email}`}
            style={{ display:'inline-block', fontSize:'clamp(18px,3vw,26px)', fontWeight:600,
                      color:'#111111', textDecoration:'none', letterSpacing:'-0.4px',
                      marginBottom:24, fontFamily:'var(--mono, monospace)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--v2-green)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--v2-text)'}>
            {email}
          </a>
          <div>
            <a href={`mailto:${email}`}
              style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'#f0f4fa', color:'#111111', padding:'11px 22px',
                        borderRadius:'var(--v2-r-md)', fontSize:14, fontWeight:500,
                        textDecoration:'none' }}>
              Compose email <ArrowRight size={13} />
            </a>
          </div>
          <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid var(--v2-border)',
                        display:'flex', justifyContent:'center', gap:28, flexWrap:'wrap' }}>
            {[
              { icon:<Clock size={12} />,  label:'Reply within 1–2 days' },
              { icon:<Globe size={12} />,  label:'English · Tamil · Dutch' },
              { icon:<Shield size={12} />, label:'No tracking, no ads' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6,
                                        fontSize:12, color:'#555555', fontWeight:500 }}>
                {icon} {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT TO INCLUDE ──────────────────────────────────────── */}
        <div style={{ marginBottom:16 }}>
          <div style={{ marginBottom:16 }}>
            <h2 className="v2-h1" style={{ fontSize:18, marginBottom:4 }}>What to include</h2>
            <p className="v2-subtitle">To help us help you faster.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:10 }}>
            {[
              { icon:Wrench,       label:'Bug reports',       color:'var(--v2-red)',
                body:'Domain affected, browser and OS, the exact error message, and steps to reproduce. A screenshot helps a lot.' },
              { icon:Zap,          label:'Feature requests',  color:'#111111',
                body:"What you're trying to accomplish, how SSLVault falls short today, and what the ideal outcome looks like for you." },
              { icon:Shield,       label:'Account help',      color:'var(--v2-green)',
                body:"The email address tied to your account and a description of what you're stuck on. Never share passwords or API tokens." },
              { icon:Users,        label:'Partnerships',      color:'#111111',
                body:"Who you are, what you're building, and how SSLVault might fit into the picture. Always happy to talk." },
            ].map(({ icon:Icon, label, body, color }) => (
              <div key={label} className="v2-card" style={{ padding:'20px 22px', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                              background:'var(--v2-surface-3)', border:'1px solid var(--v2-border)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              flexShrink:0, color }}>
                  <Icon size={14} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:12, color:'#333333', lineHeight:1.65 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SELF-SERVE ───────────────────────────────────────────── */}
        <div className="v2-callout tip" style={{ marginBottom:16 }}>
          <div className="v2-callout-title">Check the Knowledge Base first</div>
          Most common questions — setup, DNS validation, troubleshooting, FAQs — are already
          answered there. Faster than waiting for a reply.
          <div style={{ marginTop:10 }}>
            <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => nav('/knowledge-base')}
              style={{ fontSize:12 }}>
              <BookOpen size={11} /> Browse Knowledge Base <ArrowRight size={10} />
            </button>
          </div>
        </div>

        {/* ── OTHER CHANNELS ────────────────────────────────────────── */}
        <div className="v2-card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)',
                        fontSize:12, fontWeight:600, color:'#111111' }}>
            Other ways to reach us
          </div>
          {[
            { icon:<MessageSquare size={14} />, label:'GitHub Issues',
              sub:'Bug reports and feature requests tracked publicly',
              href:'https://github.com/mathimcafee-dev/LetsEncrypt/issues',
              cta:'Open an issue' },
            { icon:<Globe size={14} />,         label:'Knowledge Base',
              sub:'Self-serve answers for setup, DNS, and troubleshooting',
              action: () => nav('/knowledge-base'),
              cta:'Browse docs' },
          ].map(({ icon, label, sub, href, action, cta }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:14,
                                       padding:'14px 20px', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
              <div className="v2-icontile">{icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#111111' }}>{label}</div>
                <div style={{ fontSize:11, color:'#555555' }}>{sub}</div>
              </div>
              {href
                ? <a href={href} target='_blank' rel='noreferrer'
                    style={{ display:'inline-flex', alignItems:'center', gap:5,
                              fontSize:12, color:'#333333', textDecoration:'none',
                              whiteSpace:'nowrap' }}
                    style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                    {cta} <ArrowRight size={10} />
                  </a>
                : <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={action}
                    style={{ fontSize:12, whiteSpace:'nowrap' }}>
                    {cta} <ArrowRight size={10} />
                  </button>
              }
            </div>
          ))}
          <div style={{ padding:'14px 20px' }}>
            {/* filler row */}
          </div>
        </div>

      </div>
    </div>
  )
}
