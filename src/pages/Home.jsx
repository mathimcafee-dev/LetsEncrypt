import { Shield, Lock, CheckCircle, Zap, Globe, Server, ChevronRight,
         ArrowRight, Activity, RefreshCw, Eye, BookOpen, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'

// ── Live cert count ───────────────────────────────────────────────────
function useLiveStats() {
  const [certCount, setCertCount] = useState(null)
  useEffect(() => {
    supabase.from('certificates').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setCertCount(count) })
      .catch(() => {})
  }, [])
  return { certCount }
}

// ── Hero illustration (kept from v1, adapted colours) ─────────────────
function CertHeroIllustration() {
  return (
    <div style={{ position:'relative', width:'100%', height:400,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* Ambient blobs */}
      <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%',
                    background:'radial-gradient(circle,rgba(16,185,129,0.12),transparent 70%)',
                    top:'50%', left:'50%', transform:'translate(-50%,-50%)', filter:'blur(40px)' }} />
      <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%',
                    background:'radial-gradient(circle,rgba(37,99,235,0.1),transparent 70%)',
                    top:'15%', right:'8%', filter:'blur(28px)' }} />

      {/* Central shield */}
      <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:80, height:80, background:'#0a0a0a', borderRadius:20,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 0 0 10px rgba(16,185,129,0.08), 0 0 0 22px rgba(16,185,129,0.04), 0 16px 48px rgba(10,10,10,0.25)' }}>
          <Shield size={38} color='white' strokeWidth={1.5} />
        </div>
        <div style={{ marginTop:-12, background:'var(--v2-green)', borderRadius:100,
                      padding:'3px 12px', display:'flex', alignItems:'center', gap:5,
                      boxShadow:'0 4px 14px rgba(16,185,129,0.35)', zIndex:12 }}>
          <CheckCircle size={10} color='white' />
          <span style={{ fontSize:9, fontWeight:700, color:'white', letterSpacing:'0.6px' }}>VERIFIED &amp; TRUSTED</span>
        </div>
      </div>

      {/* Orbit rings */}
      <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%',
                    border:'1px dashed rgba(16,185,129,0.25)',
                    top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
      <div style={{ position:'absolute', width:340, height:340, borderRadius:'50%',
                    border:'0.5px solid rgba(10,10,10,0.07)',
                    top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />

      {/* Orbiting nodes */}
      {[
        { angle:0,   r:110, icon:'N', label:'Nginx',  color:'#059669', bg:'#d1fae5', ring:'#6ee7b7' },
        { angle:72,  r:110, icon:'A', label:'Apache', color:'#7c3aed', bg:'#ede9fe', ring:'#c4b5fd' },
        { angle:144, r:110, icon:'D', label:'Docker', color:'#0ea5e9', bg:'#e0f2fe', ring:'#7dd3fc' },
        { angle:216, r:110, icon:'C', label:'cPanel', color:'#d97706', bg:'#fef3c7', ring:'#fcd34d' },
        { angle:288, r:110, icon:'K', label:'Caddy',  color:'#db2777', bg:'#fce7f3', ring:'#f9a8d4' },
      ].map(({ angle, r, icon, label, color, bg, ring }) => {
        const rad = (angle - 90) * Math.PI / 180
        const x = Math.cos(rad) * r
        const y = Math.sin(rad) * r
        return (
          <div key={label} style={{ position:'absolute', top:'50%', left:'50%',
                                     transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                     zIndex:8, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:bg,
                          border:`1.5px solid ${ring}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          boxShadow:'0 2px 10px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize:13, fontWeight:800, color }}>{icon}</span>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color:'var(--v2-text-3)',
                           background:'var(--v2-surface)', padding:'1px 6px',
                           borderRadius:4, border:'0.5px solid var(--v2-border)',
                           whiteSpace:'nowrap' }}>{label}</span>
          </div>
        )
      })}

      {/* Floating cert card */}
      <div style={{ position:'absolute', top:20, right:0, background:'var(--v2-surface)',
                    borderRadius:'var(--v2-r-lg)', padding:'12px 14px',
                    boxShadow:'0 4px 24px rgba(10,10,10,0.1)',
                    border:'0.5px solid var(--v2-border)', zIndex:15, minWidth:168 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:26, height:26, background:'var(--v2-green)',
                        borderRadius:'var(--v2-r-sm)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Lock size={12} color='white' />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text)', lineHeight:1 }}>easysecurity.in</div>
            <div style={{ fontSize:9, color:'var(--v2-text-3)', marginTop:1 }}>TLS 1.3 · RSA 2048</div>
          </div>
        </div>
        <div className="v2-bar">
          <div className="v2-bar-fill" style={{ width:'78%' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
          <span style={{ fontSize:9, color:'var(--v2-text-3)' }}>70 days left</span>
          <span className="v2-status v2-status-green" style={{ fontSize:9 }}>
            <span className="v2-dot v2-dot-green" /> Valid
          </span>
        </div>
      </div>

      {/* ACME badge */}
      <div style={{ position:'absolute', bottom:20, left:0, background:'var(--v2-surface)',
                    borderRadius:'var(--v2-r-md)', padding:'10px 12px',
                    boxShadow:'0 4px 18px rgba(10,10,10,0.08)',
                    border:'0.5px solid var(--v2-border)', zIndex:15,
                    display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:28, height:28, background:'#0a0a0a',
                      borderRadius:'var(--v2-r-sm)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Zap size={13} color='white' />
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-text)' }}>ACME RFC 8555</div>
          <div style={{ fontSize:9, color:'var(--v2-text-3)' }}>Issued in &lt;60 seconds</div>
        </div>
      </div>

      {/* Free badge */}
      <div style={{ position:'absolute', top:38, left:8, background:'var(--v2-green)',
                    borderRadius:'var(--v2-r-md)', padding:'6px 12px', zIndex:15 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'white', lineHeight:1 }}>100% Free</div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.8)', marginTop:1 }}>No credit card</div>
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:Activity, title:'Monitor Any Domain',    color:'#db2777',
    desc:"Track SSL health across all your domains — regardless of who issued the cert. DigiCert, Cloudflare, cPanel, Let's Encrypt — one place for everything." },
  { icon:Globe,    title:'Any CA, Any Host',       color:'#7c3aed',
    desc:'Works with certificates from any certificate authority on any hosting platform. Add a domain, start monitoring in seconds.' },
  { icon:Bell,     title:'Expiry Alerts',          color:'#d97706',
    desc:'Get notified before certificates expire — at 60, 30, 14 or 7 days. Never let a domain go dark because of a missed renewal.' },
  { icon:Zap,      title:'Free Certificate Issuance', color:'#2563eb',
    desc:"Issue trusted DV certificates via Let's Encrypt where you need them — shared hosting, VPS, or any server. Free, no credit card." },
  { icon:Server,   title:'One-click Install',      color:'#059669',
    desc:'Deploy to Nginx, Apache, cPanel, or Plesk via the persistent agent or step-by-step install guides.' },
  { icon:Lock,     title:'KeyLocker Pro',          color:'#7c3aed',
    desc:'Encrypted key vault with rotation history and audit log. Enterprise-grade key protection at indie pricing.' },
]

const STEPS = [
  { n:'01', title:'Add any domain',         color:'var(--v2-green)',
    desc:'Enter any domain you own or manage — regardless of where it is hosted or who issued the cert.' },
  { n:'02', title:'Instant SSL scan',       color:'#2563eb',
    desc:'SSLVault checks the certificate, reads issuer, expiry date, and health grade in seconds.' },
  { n:'03', title:'Get expiry alerts',      color:'#7c3aed',
    desc:'Set your alert threshold — 60, 30, 14 or 7 days. We notify you before anything expires.' },
  { n:'04', title:'Issue or renew',         color:'#d97706',
    desc:"Need a new cert? Issue free via Let's Encrypt in under 60 seconds, install with one click." },
]

const TRUST = ['Nginx','Apache','cPanel','Plesk','Node.js','Docker','Cloudflare','Caddy']

// ─────────────────────────────────────────────────────────────────────
export default function Home({ nav }) {
  const { certCount } = useLiveStats()

  const STATS = certCount !== null
    ? [
        { v: certCount.toLocaleString(), l:'Certs issued',        sub:'Live & counting',     accent:'var(--v2-green)' },
        { v:'100%',  l:'Free forever',         sub:'No credit card ever',  accent:'var(--v2-text)' },
        { v:'90d',   l:'Certificate validity', sub:'Auto-renewal reminders',accent:'var(--v2-text)' },
        { v:'A+',    l:'SSL Labs grade',        sub:'TLS 1.3 optimized',    accent:'var(--v2-text)' },
      ]
    : [
        { v:'100%',  l:'Free forever',         sub:'No credit card ever',  accent:'var(--v2-green)' },
        { v:'90d',   l:'Certificate validity', sub:'Auto-renewal reminders',accent:'var(--v2-text)' },
        { v:'<60s',  l:'Issuance time',         sub:'ACME RFC 8555',        accent:'var(--v2-text)' },
        { v:'A+',    l:'SSL Labs grade',        sub:'TLS 1.3 optimized',    accent:'var(--v2-text)' },
      ]

  return (
    <div className="v2-page" style={{ minHeight:'100vh' }}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{ position:'relative', padding:'88px 0 72px',
                        background:'var(--v2-bg)',
                        borderBottom:'0.5px solid var(--v2-border)' }}>
        {/* thin green top bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
                      background:'var(--v2-green)' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center' }}>
            {/* Text */}
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:7,
                            background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                            borderRadius:100, padding:'4px 14px', marginBottom:24 }}>
                <span className="v2-pulse" />
                <span style={{ fontSize:11, fontWeight:500, color:'var(--v2-green-text)' }}>
                  Certificate Lifecycle Management · Free forever
                </span>
              </div>
              <h1 style={{ fontSize:'clamp(40px,5vw,58px)', fontWeight:700,
                            color:'var(--v2-text)', lineHeight:1.08,
                            letterSpacing:'-1.6px', marginBottom:6 }}>
                All your SSL certificates.
              </h1>
              <h1 style={{ fontSize:'clamp(40px,5vw,58px)', fontWeight:700,
                            lineHeight:1.08, letterSpacing:'-1.6px', marginBottom:22,
                            color:'var(--v2-green)' }}>
                One dashboard.
              </h1>
              <p style={{ fontSize:16, color:'var(--v2-text-2)', lineHeight:1.75,
                          marginBottom:32, maxWidth:440 }}>
                Monitor expiry across every domain you own — regardless of who issued the cert.
                Get alerted before anything expires. Issue free certificates where you need them.
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:28 }}>
                <button onClick={() => nav('/monitor')}
                  className="v2-btn v2-btn-primary"
                  style={{ padding:'12px 22px', fontSize:14 }}>
                  Monitor my domains <ArrowRight size={13} />
                </button>
                <button onClick={() => nav('/generate')}
                  className="v2-btn"
                  style={{ padding:'12px 18px', fontSize:14 }}>
                  Issue free certificate <ChevronRight size={13} />
                </button>
              </div>
              <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
                {['Works with DigiCert, Cloudflare, cPanel & more','Monitor any domain — any CA','Free forever · No credit card'].map(l => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:5,
                                         fontSize:12, color:'var(--v2-text-3)', fontWeight:500 }}>
                    <CheckCircle size={12} color='var(--v2-green)' /> {l}
                  </div>
                ))}
              </div>
            </div>
            {/* Illustration */}
            <div><CertHeroIllustration /></div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ────────────────────────────────────────────── */}
      <section style={{ background:'var(--v2-surface)',
                        borderBottom:'0.5px solid var(--v2-border)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
            {STATS.map(({ v, l, sub, accent }, i) => (
              <div key={l} style={{ padding:'24px 0', textAlign:'center',
                                     borderRight: i < 3 ? '0.5px solid var(--v2-border)' : 'none',
                                     borderTop:`2px solid ${accent}` }}>
                <div style={{ fontSize:32, fontWeight:700, letterSpacing:'-1px',
                               lineHeight:1, color:'var(--v2-text)',
                               fontFeatureSettings:"'tnum'" }}>{v}</div>
                <div style={{ fontSize:12, color:'var(--v2-text)', fontWeight:500, marginTop:5 }}>{l}</div>
                <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section style={{ padding:'80px 0', background:'var(--v2-bg)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ marginBottom:48 }}>
            <div className="v2-section-label" style={{ marginBottom:8 }}>Full CLM Platform</div>
            <h2 style={{ fontSize:28, fontWeight:700, color:'var(--v2-text)',
                          letterSpacing:'-0.6px', marginBottom:10 }}>
              Everything for certificate lifecycle management
            </h2>
            <p style={{ color:'var(--v2-text-2)', fontSize:15, maxWidth:520, lineHeight:1.65 }}>
              From first issuance to renewal, SSLVault covers the complete PKI lifecycle — free.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {FEATURES.map(({ icon:Icon, title, desc, color }) => (
              <div key={title} className="v2-card"
                style={{ padding:'22px 24px', borderLeft:`2px solid ${color}` }}>
                <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)',
                              background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              marginBottom:12, color }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section style={{ padding:'0 0 80px', background:'var(--v2-bg)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div className="v2-code" style={{ borderRadius:'var(--v2-r-xl)', overflow:'hidden' }}>
            <div className="v2-code-head">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="v2-code-dots">
                  <span style={{ background:'#ef4444' }} />
                  <span style={{ background:'#f59e0b' }} />
                  <span style={{ background:'#10b981' }} />
                </div>
                <span style={{ fontSize:11, color:'#737373', fontFamily:'monospace' }}>
                  cert-issuance.sh
                </span>
              </div>
              <span style={{ fontSize:11, color:'#737373' }}>4 steps · no account required</span>
            </div>

            <div style={{ padding:'32px 40px' }}>
              {/* Section label */}
              <div style={{ fontSize:11, color:'var(--v2-green)', fontWeight:600,
                             letterSpacing:'1px', textTransform:'uppercase', marginBottom:28 }}>
                # Monitor & manage all your SSL certificates
              </div>

              {/* Steps */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, position:'relative' }}>
                {/* connector line */}
                <div style={{ position:'absolute', top:18, left:'calc(12.5% + 12px)',
                               right:'calc(12.5% + 12px)', height:'0.5px',
                               background:'rgba(255,255,255,0.1)', zIndex:0 }} />
                {STEPS.map(({ n, title, desc, color }) => (
                  <div key={n} style={{ textAlign:'center', position:'relative', zIndex:1 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%',
                                   background:'rgba(255,255,255,0.06)',
                                   border:`1px solid ${color}`,
                                   color, display:'flex', alignItems:'center',
                                   justifyContent:'center', margin:'0 auto 16px',
                                   fontSize:12, fontWeight:700,
                                   fontFamily:'var(--mono, monospace)' }}>
                      {n}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'white',
                                   marginBottom:8, letterSpacing:'-0.2px' }}>{title}</div>
                    <div style={{ fontSize:11, color:'#737373', lineHeight:1.65 }}>{desc}</div>
                  </div>
                ))}
              </div>

              {/* CTA inside code block */}
              <div style={{ marginTop:36, paddingTop:28,
                             borderTop:'0.5px solid rgba(255,255,255,0.06)',
                             display:'flex', alignItems:'center',
                             justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, color:'#737373', fontFamily:'monospace' }}>
                  $ sslvault issue --domain yourdomain.com --free
                </span>
                <button onClick={() => nav('/generate')}
                  style={{ display:'inline-flex', alignItems:'center', gap:7,
                            background:'white', color:'#0a0a0a', border:'none',
                            padding:'10px 20px', borderRadius:'var(--v2-r-md)',
                            fontSize:13, fontWeight:600, cursor:'pointer',
                            whiteSpace:'nowrap', flexShrink:0 }}>
                  Get Your Free Certificate <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ─────────────────────────────────────────────── */}
      <section style={{ padding:'0 0 80px', background:'var(--v2-bg)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
          <div className="v2-section-label" style={{ marginBottom:20 }}>
            Works with every platform
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            {TRUST.map(t => (
              <div key={t} className="v2-chip" style={{ padding:'5px 14px', fontSize:12 }}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding:'0 0 96px', background:'var(--v2-bg)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div className="v2-card"
            style={{ padding:'64px 56px', textAlign:'center',
                      borderTop:'2px solid var(--v2-green)', position:'relative', overflow:'hidden' }}>
            {/* subtle green glow */}
            <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)',
                           width:400, height:200, pointerEvents:'none',
                           background:'radial-gradient(ellipse,rgba(16,185,129,0.07),transparent 70%)' }} />
            <div style={{ position:'relative' }}>
              <div style={{ width:52, height:52, background:'#0a0a0a', borderRadius:'var(--v2-r-xl)',
                             display:'flex', alignItems:'center', justifyContent:'center',
                             margin:'0 auto 20px',
                             boxShadow:'0 0 0 6px rgba(16,185,129,0.1), 0 8px 28px rgba(10,10,10,0.2)' }}>
                <Shield size={24} color='white' />
              </div>
              <h2 style={{ fontSize:28, fontWeight:700, color:'var(--v2-text)',
                            letterSpacing:'-0.6px', marginBottom:12 }}>
                Take control of all your SSL certificates
              </h2>
              <p style={{ color:'var(--v2-text-2)', fontSize:15, maxWidth:440,
                          margin:'0 auto 32px', lineHeight:1.65 }}>
                One dashboard for every domain, every CA, every host.
                Free forever. No credit card. No limits.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => nav('/monitor')}
                  className="v2-btn v2-btn-primary"
                  style={{ padding:'12px 24px', fontSize:14 }}>
                  <Activity size={14} /> Start monitoring free
                </button>
                <button onClick={() => nav('/generate')}
                  className="v2-btn"
                  style={{ padding:'12px 18px', fontSize:14 }}>
                  <Shield size={13} /> Issue certificate <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'0.5px solid var(--v2-border)',
                        background:'var(--v2-surface)', padding:'36px 0 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                         gap:32, marginBottom:28 }}>
            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:26, height:26, background:'#0a0a0a', borderRadius:'var(--v2-r-sm)',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Shield size={13} color='white' />
                </div>
                <span style={{ color:'var(--v2-text)', fontSize:14, fontWeight:600 }}>
                  SSL<span style={{ color:'var(--v2-green)' }}>Vault</span> CLM
                </span>
              </div>
              <p style={{ color:'var(--v2-text-3)', fontSize:11, lineHeight:1.6 }}>
                Powered by Let's Encrypt<br />ACME RFC 8555 · Free forever
              </p>
            </div>
            {/* Product */}
            <div>
              <div className="v2-section-label" style={{ marginBottom:10 }}>Product</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[['Issue Certificate','/generate'],['Inventory & Monitor','/dashboard'],
                  ['DNS Providers','/dns-providers'],['Install Guide','/install']].map(([l,p]) => (
                  <button key={l} onClick={() => nav(p)}
                    style={{ background:'none', border:'none', color:'var(--v2-text-2)',
                              fontSize:12, cursor:'pointer', fontWeight:500, textAlign:'left', padding:0 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Company */}
            <div>
              <div className="v2-section-label" style={{ marginBottom:10 }}>Company</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[['About','/about'],['Developer','/developer'],
                  ['Contact','/contact'],['Knowledge Base','/knowledge-base']].map(([l,p]) => (
                  <button key={l} onClick={() => nav(p)}
                    style={{ background:'none', border:'none', color:'var(--v2-text-2)',
                              fontSize:12, cursor:'pointer', fontWeight:500, textAlign:'left', padding:0 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Legal */}
            <div>
              <div className="v2-section-label" style={{ marginBottom:10 }}>Legal</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {[['Privacy Policy','/privacy'],['Terms of Service','/terms']].map(([l,p]) => (
                  <button key={l} onClick={() => nav(p)}
                    style={{ background:'none', border:'none', color:'var(--v2-text-2)',
                              fontSize:12, cursor:'pointer', fontWeight:500, textAlign:'left', padding:0 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop:'0.5px solid var(--v2-border)', paddingTop:18,
                         display:'flex', justifyContent:'space-between',
                         alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <p style={{ color:'var(--v2-text-3)', fontSize:11 }}>
              © {new Date().getFullYear()} SSLVault · Built by Mathivanan Kathirvel
            </p>

          </div>
        </div>
      </footer>

    </div>
  )
}
