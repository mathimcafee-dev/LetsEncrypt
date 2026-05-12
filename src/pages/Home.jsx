import { Shield, CheckCircle, Zap, Globe, Server, ArrowRight,
         RefreshCw, Activity, Lock, Bell, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'

function useLiveStats() {
  const [count, setCount] = useState(null)
  useEffect(() => {
    supabase.from('certificates').select('id', { count:'exact', head:true })
      .then(({ count }) => { if (count !== null) setCount(count) }).catch(() => {})
  }, [])
  return count
}

const PILLARS = [
  { icon: Shield,    color:'#0e7fc0', title:'Issue',   sub:'RapidSSL DV via TheSSLStore · DigiCert chain · ~5 min issuance' },
  { icon: Activity,  color:'#2563eb', title:'Monitor', sub:'Track expiry across every domain, every CA, every host' },
  { icon: RefreshCw, color:'#7c3aed', title:'Renew',   sub:'Zero-touch auto-renewal — cron, agent, and SSH push' },
  { icon: Server,    color:'#d97706', title:'Install',  sub:'Deploy to Nginx, Apache, cPanel via agent or SSH Push' },
]

const PLATFORMS = ['Nginx','Apache','cPanel','Plesk','Node.js','Docker','Cloudflare','Vercel','Caddy','Ubuntu']

export default function Home({ nav }) {
  const count = useLiveStats()

  return (
    <div style={{ background:'#fafaf9', fontFamily:"'Segoe UI',-apple-system,system-ui,sans-serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ background:'#0a0a0a', padding:'80px 24px 72px', position:'relative', overflow:'hidden' }}>
        {/* Grid texture */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }}/>
        {/* Green glow */}
        <div style={{ position:'absolute', top:-120, left:'50%', transform:'translateX(-50%)', width:700, height:400, background:'radial-gradient(ellipse,rgba(16,185,129,0.1) 0%,transparent 65%)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:100, padding:'5px 14px', marginBottom:28 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#0e7fc0', display:'block', boxShadow:'0 0 0 2px rgba(16,185,129,0.3)' }}/>
            <span style={{ fontSize:11, fontWeight:600, color:'#3b82f6', letterSpacing:'0.2px' }}>Certificate Lifecycle Management Platform</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:64, alignItems:'center' }}>
            {/* Left: text */}
            <div>
              <h1 style={{ fontSize:'clamp(36px,4.5vw,54px)', fontWeight:800, color:'white', lineHeight:1.1, letterSpacing:'-1.5px', margin:'0 0 6px' }}>
                All your SSL certs.
              </h1>
              <h1 style={{ fontSize:'clamp(36px,4.5vw,54px)', fontWeight:800, color:'#0e7fc0', lineHeight:1.1, letterSpacing:'-1.5px', margin:'0 0 24px' }}>
                One platform.
              </h1>
              <p style={{ fontSize:16, color:'#9ca3af', lineHeight:1.75, maxWidth:460, marginBottom:36 }}>
                Issue trusted RapidSSL certificates, monitor expiry across every domain, and automate renewal and deployment to your servers — all from a single dashboard.
              </p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32 }}>
                <button onClick={() => nav('/buy')}
                  style={{ background:'#0e7fc0', color:'white', border:'none', borderRadius:8, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(16,185,129,0.35)' }}>
                  <Shield size={15}/> Issue Certificate
                </button>
                <button onClick={() => nav('/dashboard')}
                  style={{ background:'rgba(255,255,255,0.06)', color:'white', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'12px 20px', fontSize:14, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit' }}>
                  View Dashboard <ArrowRight size={13}/>
                </button>
              </div>
              <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                {['DigiCert trust chain','Auto DNS validation','Zero-touch renewal'].map(t => (
                  <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6b7280' }}>
                    <CheckCircle size={12} color='#0e7fc0'/> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: cert card UI mockup */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* Active cert */}
              <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'16px 18px', borderLeft:'3px solid #0e7fc0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'white', fontFamily:'monospace', marginBottom:3 }}>easysecurity.in</div>
                    <div style={{ fontSize:10, color:'#6b7280' }}>RapidSSL DV · DigiCert</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:100, padding:'3px 9px' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#0e7fc0', display:'block' }}/>
                    <span style={{ fontSize:10, color:'#3b82f6', fontWeight:600 }}>Valid · 89d</span>
                  </div>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ width:'75%', height:'100%', background:'linear-gradient(90deg,#0e7fc0,#3b82f6)', borderRadius:100 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:7, fontSize:10, color:'#6b7280' }}>
                  <span>Issued May 11, 2026</span><span>Expires Aug 8, 2026</span>
                </div>
              </div>
              {/* Expiring cert */}
              <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'16px 18px', borderLeft:'3px solid #f59e0b' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'white', fontFamily:'monospace', marginBottom:3 }}>freecerts.site</div>
                    <div style={{ fontSize:10, color:'#6b7280' }}>RapidSSL DV · DigiCert</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:100, padding:'3px 9px' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', display:'block' }}/>
                    <span style={{ fontSize:10, color:'#fbbf24', fontWeight:600 }}>Expiring · 11d</span>
                  </div>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ width:'12%', height:'100%', background:'#f59e0b', borderRadius:100 }}/>
                </div>
              </div>
              {/* Auto-renew notice */}
              <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:10, padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <RefreshCw size={13} color='#0e7fc0'/>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#3b82f6' }}>Auto-renewal active</div>
                  <div style={{ fontSize:10, color:'#6b7280' }}>Renews 14 days before expiry · zero action needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────────── */}
      <section style={{ background:'white', borderBottom:'0.5px solid #f0f0f0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
            {[
              { v: count != null ? count.toLocaleString() : '100+', l:'Certificates managed', c:'#0e7fc0' },
              { v:'~5min', l:'Issuance time', c:'#2563eb' },
              { v:'99.9%', l:'Browser trust', c:'#7c3aed' },
              { v:'A+', l:'SSL Labs grade', c:'#0a0a0a' },
            ].map(({ v, l, c }, i) => (
              <div key={l} style={{ padding:'24px 0', textAlign:'center', borderRight: i < 3 ? '0.5px solid #f0f0f0' : 'none', borderTop:`2.5px solid ${c}` }}>
                <div style={{ fontSize:28, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.8px' }}>{v}</div>
                <div style={{ fontSize:12, color:'#737373', marginTop:4, fontWeight:500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUR PILLARS ─────────────────────────────────────────── */}
      <section id="features" style={{ padding:'80px 24px', background:'#fafaf9', scrollMarginTop:72 }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#0e7fc0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Full CLM Platform</div>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#0a0a0a', letterSpacing:'-0.7px', marginBottom:12 }}>Everything for SSL lifecycle management</h2>
            <p style={{ fontSize:15, color:'#737373', maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>From first issuance to zero-touch renewal — one platform for every stage of the certificate lifecycle.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {PILLARS.map(({ icon:Icon, color, title, sub }) => (
              <div key={title} style={{ background:'white', border:'0.5px solid #e5e5e5', borderRadius:12, padding:'24px 20px', borderTop:`3px solid ${color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ width:38, height:38, borderRadius:9, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                  <Icon size={17} color={color}/>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:'#0a0a0a', marginBottom:6, letterSpacing:'-0.2px' }}>{title}</div>
                <div style={{ fontSize:12, color:'#737373', lineHeight:1.65 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — DARK TERMINAL ─────────────────────────── */}
      <section style={{ padding:'0 24px 80px', background:'#fafaf9' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ background:'#0d1117', borderRadius:14, overflow:'hidden', border:'1px solid #21262d' }}>
            {/* Terminal header */}
            <div style={{ padding:'10px 16px', background:'#161b22', borderBottom:'1px solid #21262d', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', gap:5 }}>
                {['#ff5f56','#ffbd2e','#0e7fc0'].map(c => <span key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, display:'block' }}/>)}
              </div>
              <span style={{ fontSize:11, color:'#484f58', fontFamily:'monospace', marginLeft:4 }}>certificate-workflow.sh</span>
            </div>
            <div style={{ padding:'36px 40px' }}>
              <div style={{ fontSize:11, color:'#0e7fc0', fontFamily:'monospace', letterSpacing:'0.5px', marginBottom:32 }}>
                # SSLVault — Complete certificate lifecycle in 4 steps
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, position:'relative' }}>
                <div style={{ position:'absolute', top:18, left:'calc(12.5% + 14px)', right:'calc(12.5% + 14px)', height:'1px', background:'rgba(255,255,255,0.06)' }}/>
                {[
                  { n:'01', color:'#0e7fc0', label:'Issue', desc:'Place order via TheSSLStore · DNS DV auto-validated · Cert issued in ~5 min' },
                  { n:'02', color:'#2563eb', label:'Validate', desc:'SSLVault auto-adds DNS TXT to Vercel or Cloudflare · no manual action' },
                  { n:'03', color:'#7c3aed', label:'Install', desc:'Push to Nginx/Apache via agent daemon or SSH Push · zero-downtime reload' },
                  { n:'04', color:'#f59e0b', label:'Renew', desc:'Auto-renew runs 14 days before expiry · repeats forever' },
                ].map(({ n, color, label, desc }) => (
                  <div key={n} style={{ textAlign:'center', position:'relative', zIndex:1 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.04)', border:`1.5px solid ${color}`, color, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:11, fontWeight:700, fontFamily:'monospace' }}>{n}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:6 }}>{label}</div>
                    <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.65 }}>{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:36, paddingTop:28, borderTop:'1px solid #21262d', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                <span style={{ fontSize:12, color:'#484f58', fontFamily:'monospace' }}>$ sslvault issue --domain yourdomain.com</span>
                <button onClick={() => nav('/buy')}
                  style={{ background:'#0e7fc0', color:'white', border:'none', borderRadius:7, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit' }}>
                  Issue Your Certificate <ArrowRight size={13}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ────────────────────────────────────────────── */}
      <section style={{ padding:'0 24px 80px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 }}>Works with every platform</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            {PLATFORMS.map(p => (
              <span key={p} style={{ fontSize:12, color:'#525252', background:'white', border:'0.5px solid #e5e5e5', borderRadius:6, padding:'5px 12px' }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding:'0 24px 96px' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ background:'#0a0a0a', borderRadius:16, padding:'56px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)', width:500, height:300, background:'radial-gradient(ellipse,rgba(16,185,129,0.12) 0%,transparent 65%)', pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ width:52, height:52, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <Shield size={24} color='#0e7fc0'/>
              </div>
              <h2 style={{ fontSize:26, fontWeight:800, color:'white', letterSpacing:'-0.6px', marginBottom:12 }}>Take control of your certificates</h2>
              <p style={{ color:'#6b7280', fontSize:14, maxWidth:400, margin:'0 auto 32px', lineHeight:1.7 }}>
                One dashboard for every domain, every CA, every server. Trusted by PKI professionals.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => nav('/buy')} style={{ background:'#0e7fc0', color:'white', border:'none', borderRadius:8, padding:'12px 24px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(16,185,129,0.3)' }}>
                  <Shield size={14}/> Issue Certificate
                </button>
                <button onClick={() => nav('/dashboard')} style={{ background:'rgba(255,255,255,0.07)', color:'white', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'inherit' }}>
                  View Dashboard <ChevronRight size={13}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ borderTop:'0.5px solid #e5e5e5', background:'white', padding:'40px 24px 28px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr 1fr 1fr', gap:32, marginBottom:32 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:28, height:28, background:'#0a0a0a', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={13} color='white'/></div>
                <span style={{ fontSize:14, fontWeight:700, color:'#0a0a0a' }}>SSL<span style={{ color:'#0e7fc0' }}>Vault</span></span>
              </div>
              <p style={{ fontSize:11, color:'#a3a3a3', lineHeight:1.7 }}>Certificate Lifecycle Management Platform.<br/>Powered by TheSSLStore · DigiCert.</p>
            </div>
            {[
              { t:'Product',   links:[['Features','#features'],['Pricing','/pricing']] },
              { t:'Resources', links:[['Install Guide','/install'],['Knowledge Base','/knowledge-base'],['Get Started','/auth'],['Sign In','/auth']] },
              { t:'Company',   links:[['About','/about'],['Developer','/developer'],['Contact','/contact']] },
              { t:'Legal',     links:[['Privacy Policy','/privacy'],['Terms of Service','/terms']] },
            ].map(({ t, links }) => (
              <div key={t}>
                <div style={{ fontSize:10, fontWeight:700, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:12 }}>{t}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {links.map(([l, p]) => (
                    <button key={l} onClick={() => {
                      if (p.startsWith('#')) {
                        document.querySelector(p)?.scrollIntoView({ behavior:'smooth', block:'start' })
                      } else {
                        nav && nav(p)
                      }
                    }} style={{ background:'none', border:'none', color:'#525252', fontSize:12, cursor:'pointer', textAlign:'left', padding:0, fontFamily:'inherit' }}>{l}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'0.5px solid #f0f0f0', paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:11, color:'#a3a3a3' }}>© {new Date().getFullYear()} SSLVault · Built by Mathivanan Kathirvel</span>
            <span style={{ fontSize:11, color:'#a3a3a3' }}>Netherlands · Governing law: NL</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
