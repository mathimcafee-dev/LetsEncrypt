
import portrait from '../assets/mathi-portrait.jpg'
import '../styles/design-v2.css'

function Github({ size=14, color='currentColor' }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill={color} aria-hidden='true'>
      <path d='M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2.07c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.97 10.97 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z'/>
    </svg>
  )
}

export default function Developer({ nav }) {
  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1080, padding:'40px 24px 80px' }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:40, alignItems:'start', marginBottom:32 }}>
          {/* Text */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                          background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                          borderRadius:100, padding:'4px 14px', marginBottom:20 }}>
              <span className="v2-pulse" />
              <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-green-text)' }}>
                Meet the developer
              </span>
            </div>
            <h1 style={{ fontSize:'clamp(34px,4.5vw,52px)', fontWeight:700, letterSpacing:'-1.2px',
                          lineHeight:1.1, margin:'0 0 10px', color:'var(--v2-text)' }}>
              Mathivanan<br />
              <span style={{ color:'var(--v2-green)' }}>Kathirvel.</span>
            </h1>
            <div style={{ fontSize:15, color:'var(--v2-text-2)', fontWeight:500, marginBottom:16 }}>
              Certified PKI Specialist · Builder &amp; Open-source Contributor
            </div>
            <p style={{ fontSize:14, color:'var(--v2-text-2)', lineHeight:1.75, marginBottom:20, maxWidth:580 }}>
              I'm passionate about PKI, digital trust, and the cryptographic infrastructure
              that keeps the modern web secure. SSLVault is my personal project — a free CLM
              platform built on Let's Encrypt for everyone who needs enterprise-grade certificate
              management without the enterprise price tag.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--v2-text-3)', fontWeight:500 }}>
                <MapPin size={12} /> Netherlands
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--v2-text-3)', fontWeight:500 }}>
                <Briefcase size={12} /> Building SSLVault on the side
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--v2-text-3)', fontWeight:500 }}>
                <Globe size={12} /> English · Tamil · Dutch
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <a href='mailto:mathimcafee@gmail.com'
                style={{ display:'inline-flex', alignItems:'center', gap:7,
                          background:'#0a0a0a', color:'white', padding:'10px 18px',
                          borderRadius:'var(--v2-r-md)', fontSize:13, fontWeight:500,
                          textDecoration:'none' }}>
                <Mail size={13} /> Email me
              </a>
              <a href='https://github.com/mathimcafee-dev' target='_blank' rel='noreferrer'
                style={{ display:'inline-flex', alignItems:'center', gap:7,
                          background:'var(--v2-surface)', color:'var(--v2-text)',
                          border:'0.5px solid var(--v2-border-strong)',
                          padding:'10px 18px', borderRadius:'var(--v2-r-md)',
                          fontSize:13, fontWeight:500, textDecoration:'none' }}>
                <Github size={13} /> GitHub
              </a>
            </div>
          </div>

          {/* Photo */}
          <div style={{ position:'relative' }}>
            <div style={{ borderRadius:'var(--v2-r-xl)', overflow:'hidden',
                          border:'0.5px solid var(--v2-border)',
                          boxShadow:'0 8px 32px rgba(15,23,42,0.1)', aspectRatio:'1/1' }}>
              <img src={portrait} alt='Mathivanan Kathirvel'
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              <div style={{ position:'absolute', inset:'auto 0 0 0', height:'45%',
                            background:'linear-gradient(to top,rgba(10,10,10,0.7),transparent)',
                            pointerEvents:'none' }} />
              <div style={{ position:'absolute', left:16, bottom:14, color:'white' }}>
                <div style={{ fontSize:10, fontWeight:500, opacity:0.7, marginBottom:2 }}>
                  PKI Specialist · Builder
                </div>
                <div style={{ fontSize:16, fontWeight:600 }}>Mathivanan</div>
              </div>
            </div>
            {/* badge */}
            <div style={{ position:'absolute', top:-12, right:-12,
                          background:'var(--v2-surface)', borderRadius:'var(--v2-r-lg)',
                          padding:'8px 12px', boxShadow:'0 4px 16px rgba(15,23,42,0.12)',
                          border:'0.5px solid var(--v2-border)',
                          display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:'var(--v2-r-md)',
                            background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Award size={13} color='var(--v2-green)' />
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:500, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'0.4px' }}>Certified</div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text)' }}>PKI Specialist</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CREDENTIALS ──────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:32 }}>
          {[
            { icon:Award,    label:'Education',     value:'MSc Computer Science',    color:'#2563eb', bg:'#dbeafe' },
            { icon:Shield,   label:'Certification', value:'Certified PKI Specialist', color:'#059669', bg:'#d1fae5' },
            { icon:MapPin,   label:'Based in',      value:'Netherlands',             color:'#d97706', bg:'#fef3c7' },
            { icon:Code2,    label:'Specialty',     value:'PKI · CLM · Digital Trust',color:'#7c3aed', bg:'#ede9fe' },
          ].map(({ icon:Icon, label, value, color, bg }) => (
            <div key={label} className="v2-card" style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'var(--v2-r-md)', background:bg,
                            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={16} color={color} />
              </div>
              <div style={{ minWidth:0 }}>
                <div className="v2-section-label" style={{ marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-text)',
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── STORY ────────────────────────────────────────────────── */}
        <div className="v2-card" style={{ padding:'32px 36px', marginBottom:32,
                                          borderLeft:'3px solid var(--v2-green)' }}>
          <div className="v2-section-label" style={{ marginBottom:6 }}>Why SSLVault</div>
          <h2 style={{ fontSize:18, fontWeight:600, color:'var(--v2-text)', marginBottom:18,
                        letterSpacing:'-0.3px' }}>The story behind it.</h2>
          <div style={{ fontSize:14, color:'var(--v2-text-2)', lineHeight:1.85,
                        display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ margin:0 }}>
              I'm a PKI person at heart. Identity, trust, and the cryptographic plumbing that holds
              the modern internet together — that's the work I love. The deeper I go into certificate
              lifecycle management, the more convinced I am that PKI done well is one of the
              highest-leverage things in security.
            </p>
            <p style={{ margin:0 }}>
              What I see every day is that great certificate management — automated, monitored,
              never expired — transforms how teams operate. The enterprise world has solved this
              beautifully. But there's a long tail of indie developers, small businesses, and
              non-profits who run websites on a shoestring and need the same reliability without
              the procurement cycle. Let's Encrypt made certificates free — a remarkable gift to
              the open web — and the lifecycle around them is the missing piece for that audience.
            </p>
            <p style={{ margin:0 }}>
              SSLVault is my small contribution to closing that gap. A free, open CLM platform
              that takes the principles I work with professionally — automated discovery, scheduled
              renewal, agent-based deployment, full visibility into every certificate — and makes
              them accessible to anyone with a domain, no matter their budget. Built in public,
              runs on open standards, stays free.
            </p>
          </div>
        </div>

        {/* ── SKILLS ───────────────────────────────────────────────── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:16 }}>
            <h2 className="v2-h1" style={{ fontSize:18, marginBottom:4 }}>What I work with</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { icon:Server,   title:'Infrastructure', color:'#2563eb', bg:'#dbeafe',
                items:['Linux · systemd','Nginx · Apache','Docker · Vercel','cPanel · Plesk'] },
              { icon:Code2,    title:'Frontend',       color:'#0ea5e9', bg:'#e0f2fe',
                items:['React 18 + Vite','Inline CSS systems','Lucide icons','Responsive design'] },
              { icon:Globe,    title:'Backend',        color:'#059669', bg:'#d1fae5',
                items:['Supabase + RLS','Edge Functions','PostgreSQL','Resend email'] },
              { icon:BookOpen, title:'PKI & CLM',      color:'#d97706', bg:'#fef3c7',
                items:['ACME / RFC 8555','X.509 · CT logs','Certificate lifecycle','Digital trust'] },
            ].map(({ icon:Icon, title, items, color, bg }) => (
              <div key={title} className="v2-card" style={{ padding:'20px 18px' }}>
                <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)', background:bg,
                              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:10 }}>{title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {items.map(item => (
                    <div key={item} style={{ fontSize:11, color:'var(--v2-text-2)', fontWeight:500 }}>{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── OTHER PROJECTS ────────────────────────────────────────── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:16 }}>
            <div className="v2-section-label" style={{ marginBottom:4 }}>Also building</div>
            <h2 className="v2-h1" style={{ fontSize:18 }}>Other projects</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            <a href='https://tamil-dutch.vercel.app' target='_blank' rel='noreferrer'
              style={{ textDecoration:'none' }}>
              <div className="v2-card" style={{ padding:'22px 24px', cursor:'pointer', transition:'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--v2-surface)'}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div style={{ display:'flex', gap:3 }}>
                    <span style={{ fontSize:16 }}>🇮🇳</span>
                    <span style={{ fontSize:16 }}>🇳🇱</span>
                  </div>
                  <span className="v2-section-label">Heritage · Active</span>
                  <ExternalLink size={11} color='var(--v2-text-3)' style={{ marginLeft:'auto' }} />
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>
                  Tamil-Dutch Heritage
                </div>
                <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6, marginBottom:10 }}>
                  400 years of shared history between Tamil Nadu and the Netherlands — including
                  the first complete Dutch translation of all 1,330 Thirukkurals in history.
                </div>
                <div className="v2-chip" style={{ color:'var(--v2-green-text)', background:'var(--v2-green-bg)',
                                                   border:'0.5px solid var(--v2-green-border)' }}>
                  tamil-dutch.vercel.app
                </div>
              </div>
            </a>
            <div className="v2-card" style={{ padding:'22px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div className="v2-icontile" style={{ background:'#dbeafe', border:'0.5px solid #bfdbfe',
                                                       color:'#2563eb' }}>
                  <Shield size={14} />
                </div>
                <span className="v2-section-label">Infrastructure · Active</span>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>
                SSLVault (this site)
              </div>
              <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6, marginBottom:10 }}>
                Free certificate lifecycle management on Let's Encrypt. Issue, install, monitor,
                and auto-renew TLS certificates with zero-touch agents.
              </div>
              <div className="v2-chip">easysecurity.in</div>
            </div>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className="v2-code" style={{ borderRadius:'var(--v2-r-xl)', overflow:'hidden' }}>
          <div style={{ padding:'32px 36px', display:'flex', alignItems:'center',
                        justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:'white', marginBottom:6 }}>
                Got an idea or a problem to solve?
              </div>
              <div style={{ fontSize:13, color:'#737373', lineHeight:1.6 }}>
                Always up for a good infrastructure conversation. Drop me a line.
              </div>
            </div>
            <a href='mailto:mathimcafee@gmail.com'
              style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'white', color:'#0a0a0a', padding:'10px 20px',
                        borderRadius:'var(--v2-r-md)', fontSize:13, fontWeight:600,
                        textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
              <Mail size={13} /> Get in touch <ArrowRight size={12} />
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
