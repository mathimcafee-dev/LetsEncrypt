import { useState } from 'react'

const F = "'Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

const BG    = '#0d2b2b'
const CARD  = '#1a4040'
const CARD2 = '#0f3535'
const TEAL  = '#2dd4bf'
const TEALH = '#14b8a6'
const CORAL = '#ff6b5b'
const INK   = '#e8f5f4'
const BODY  = 'rgba(232,245,244,0.65)'
const MUTED = 'rgba(232,245,244,0.38)'
const LINE  = 'rgba(45,212,191,0.15)'
const LINE2 = 'rgba(45,212,191,0.25)'
const GREEN = '#4ade80'
const AMBER = '#fbbf24'
const RED   = '#f87171'

function Tick({ color = TEAL }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
      <circle cx="12" cy="12" r="11" fill={color + '22'}/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
      <circle cx="12" cy="12" r="11" fill="rgba(45,212,191,0.05)"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke="rgba(232,245,244,0.2)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ borderBottom:`1px solid ${LINE}`, padding:'18px 0', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:open?TEAL:INK, transition:'color .15s' }}>{q}</div>
        <span style={{ color:TEAL, fontSize:20, lineHeight:1, flexShrink:0 }}>{open ? '−' : '+'}</span>
      </div>
      {open && <div style={{ fontSize:13, color:BODY, lineHeight:1.8, marginTop:12 }}>{a}</div>}
    </div>
  )
}

const PLANS = [
  {
    key:'starter', name:'Starter', price:'Free', per:'while in beta',
    color:TEAL, border:LINE2, highlight:false, cta:'Get started',
    badge:null, certNote:'Enterprise certificate pricing via RapidSSL',
    features:['DV certificates (RapidSSL / Sectigo)','Persistent VPS agent — Nginx / Apache','cPanel auto-install (UAPI)','Auto DNS validation (Cloudflare, Vercel, Route53…)','Auto-renew cert + order before expiry','CertVault — AES-256-GCM key vault','CertBind — active binding verification','CT Log discovery','47-Day Readiness Dashboard','Renewal Calendar','SSL Health Score A+ to F','Multi-server fleet management'],
  },
  {
    key:'pro', name:'Pro', price:'$29', per:'/mo · billed annually',
    color:CORAL, border:`rgba(255,107,91,0.35)`, highlight:true, cta:'Start Pro',
    badge:'Most Popular', certNote:'All cert types · RapidSSL partner rates',
    features:['Everything in Starter','OV, EV, Wildcard & SAN certificates','DigiCert CertCentral portfolio sync','Sectigo SCM portfolio sync','Shadow IT detection','Policy engine (fleet compliance)','CT Abuse Monitor','REST API access','Portfolio CSV export','Priority email support'],
  },
  {
    key:'reseller', name:'Reseller', price:'Custom', per:'contact us',
    color:AMBER, border:`rgba(251,191,36,0.25)`, highlight:false, cta:'Contact us',
    badge:null, certNote:'Volume pricing available',
    features:['Everything in Pro','Sub-reseller registration & approval','End-customer portal','Customer invite (magic link)','Order management for customers','Excel order export','White-label dashboard','Dedicated account manager','Volume cert pricing'],
  },
]

const CERT_PRICES = [
  { type:'RapidSSL DV',         term:'1yr', price:'$14',      ca:'DigiCert chain', badge:null },
  { type:'RapidSSL Wildcard DV',term:'1yr', price:'$72',      ca:'DigiCert chain', badge:'Popular' },
  { type:'Sectigo OV',          term:'1yr', price:'$49',      ca:'Sectigo',        badge:null },
  { type:'Sectigo EV',          term:'1yr', price:'$99',      ca:'Sectigo',        badge:null },
  { type:'Multi-domain SAN DV', term:'1yr', price:'from $28', ca:'Various',        badge:null },
  { type:'DigiCert Standard DV',term:'1yr', price:'$218',     ca:'DigiCert',       badge:'vs $14 at SSLVault' },
  { type:'DigiCert OV',         term:'1yr', price:'$348',     ca:'DigiCert',       badge:null },
  { type:'DigiCert EV',         term:'1yr', price:'$695',     ca:'DigiCert',       badge:null },
]

const FEATURES = [
  { section:'Certificate issuance', rows:[
    { label:'DV certificates (RapidSSL / Sectigo)', s:true,  p:true,  r:true  },
    { label:'OV & EV certificates',                 s:false, p:true,  r:true  },
    { label:'Wildcard certificates',                s:false, p:true,  r:true  },
    { label:'Multi-domain SAN',                     s:false, p:true,  r:true  },
    { label:'Sandbox / test mode',                  s:true,  p:true,  r:true  },
  ]},
  { section:'Automation', rows:[
    { label:'Persistent agent (VPS)',               s:true,  p:true,  r:true  },
    { label:'cPanel auto-install (UAPI)',           s:true,  p:true,  r:true  },
    { label:'Auto DNS validation',                  s:true,  p:true,  r:true  },
    { label:'Auto-renew (cert + order)',            s:true,  p:true,  r:true  },
    { label:'Multi-server fleet management',        s:true,  p:true,  r:true  },
  ]},
  { section:'Security', rows:[
    { label:'CertVault — AES-256-GCM',             s:true,  p:true,  r:true  },
    { label:'CertBind — active binding proof',      s:true,  p:true,  r:true  },
    { label:'SSL inspection proxy detection',       s:false, p:true,  r:true  },
    { label:'Multi-node load balancer check',       s:false, p:true,  r:true  },
    { label:'Key reveal with password re-auth',     s:true,  p:true,  r:true  },
    { label:'Immutable audit log + CSV',            s:true,  p:true,  r:true  },
  ]},
  { section:'Monitoring & intelligence', rows:[
    { label:'47-Day Readiness Dashboard',           s:true,  p:true,  r:true  },
    { label:'Renewal Calendar',                     s:true,  p:true,  r:true  },
    { label:'SSL Health Score A+ to F',             s:true,  p:true,  r:true  },
    { label:'CT Log discovery',                     s:true,  p:true,  r:true  },
    { label:'CT Abuse Monitor',                     s:false, p:true,  r:true  },
    { label:'Email expiry alerts',                  s:true,  p:true,  r:true  },
  ]},
  { section:'CA Intelligence', rows:[
    { label:'DigiCert CertCentral sync',            s:false, p:true,  r:true  },
    { label:'Sectigo SCM sync',                     s:false, p:true,  r:true  },
    { label:'Shadow IT detection',                  s:false, p:true,  r:true  },
    { label:'Policy engine',                        s:false, p:true,  r:true  },
    { label:'Portfolio CSV export',                 s:false, p:true,  r:true  },
    { label:'REST API access',                      s:false, p:true,  r:true  },
  ]},
  { section:'Reseller', rows:[
    { label:'Sub-reseller management',              s:false, p:false, r:true  },
    { label:'End-customer portal',                  s:false, p:false, r:true  },
    { label:'Magic link invites',                   s:false, p:false, r:true  },
    { label:'White-label dashboard',                s:false, p:false, r:true  },
    { label:'Dedicated account manager',            s:false, p:false, r:true  },
  ]},
]

const FAQS = [
  { q:"What's included in the free Starter plan?", a:"Everything to run a complete CLM operation: cert issuance, persistent VPS agent, cPanel installer, DNS automation, auto-renewal, CertVault AES-256 key vault, CertBind active binding verification, 47-Day Readiness Dashboard, CT log discovery, renewal calendar, and SSL health scoring. Free while SSLVault is in beta." },
  { q:"What does Pro add over Starter?", a:"Pro unlocks OV/EV/Wildcard/SAN certificates, CA Intelligence (DigiCert + Sectigo portfolio sync, shadow IT detection, policy engine), CT Abuse Monitor, REST API access, and portfolio CSV exports. Designed for agencies managing certs across multiple CAs." },
  { q:"What is the 47-Day Readiness Dashboard?", a:"CA/B Forum mandates shorter validity: 200 days by March 2026, 100 days by 2027, 47 days by 2029. The dashboard scores each cert 0–100 and shows exactly what needs fixing — auto-renew, DNS provider, agent installation, key storage." },
  { q:"How does CertBind work?", a:"CertBind is an industry first. Every 5 minutes, the agent cryptographically proves the key and cert match, checks the live TLS fingerprint, detects SSL inspection proxies, and verifies all load balancer nodes serve the same cert. Other CLM tools can't do this." },
  { q:"Does SSLVault store my private keys?", a:"Only if you opt into CertVault. Keys are AES-256-GCM encrypted with envelope encryption. Every reveal requires password re-auth. The UI is copy-only with a 30-second timer. Every access is logged to an immutable audit trail." },
  { q:"What is the Reseller plan?", a:"Multi-tenant architecture: register sub-resellers, onboard end-customers via magic link, manage orders on their behalf, export Excel reports, white-label the dashboard. Contact us at mathimcafee@gmail.com for pricing." },
]

export default function Pricing({ nav }) {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div style={{ background:BG, minHeight:'100vh', color:INK, fontFamily:F }}>
      <style>{`*{box-sizing:border-box}::selection{background:rgba(45,212,191,0.2);color:${TEAL}}`}</style>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'clamp(48px,8vw,80px) clamp(16px,4vw,28px) 100px' }}>

        {/* HERO */}
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700,
            color:TEAL, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px',
            border:`1px solid ${LINE2}`, borderRadius:20, marginBottom:20, fontFamily:MONO }}>
            ◆ SSLVault Pricing
          </div>
          <h1 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.05, marginBottom:16 }}>
            Professional CLM.<br/>
            <span style={{ color:TEAL }}>Transparent cert pricing.</span>
          </h1>
          <p style={{ fontSize:15, color:BODY, maxWidth:540, margin:'0 auto 12px', lineHeight:1.75 }}>
            Complete CLM platform — persistent agent, auto-renewal, DNS automation, CertBind active binding verification,
            CA intelligence, AES-256 key vault, 47-day readiness. Certificates at RapidSSL partner rates.
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:16 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:GREEN, display:'inline-block', animation:'blink 2s ease infinite' }}/>
            <span style={{ fontSize:12, color:BODY, fontFamily:MONO }}>Free while in beta · No credit card required</span>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16, marginBottom:48 }}>
          {PLANS.map(plan => (
            <div key={plan.key} style={{
              borderRadius:12, border:`1px solid ${plan.border}`,
              background: plan.highlight ? `linear-gradient(160deg,rgba(255,107,91,0.08),rgba(13,43,43,0.5))` : CARD,
              padding:'28px 22px', position:'relative', display:'flex', flexDirection:'column',
              boxShadow: plan.highlight ? `0 0 40px rgba(255,107,91,0.12)` : 'none',
            }}>
              {plan.badge && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
                  background:`linear-gradient(135deg,${CORAL},#ff9e8c)`, borderRadius:20, padding:'4px 14px',
                  fontSize:10, fontWeight:800, color:'#fff', whiteSpace:'nowrap', letterSpacing:'0.5px', fontFamily:MONO }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize:10, fontWeight:700, color:plan.color, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14, fontFamily:MONO }}>{plan.name}</div>
              <div style={{ marginBottom:6 }}>
                <span style={{ fontSize:plan.price==='Custom'?28:42, fontWeight:900, letterSpacing:'-2px', lineHeight:1, color:plan.color }}>{plan.price}</span>
                <span style={{ fontSize:11, color:MUTED, marginLeft:6, fontFamily:MONO }}>{plan.per}</span>
              </div>
              <div style={{ fontSize:10, color:plan.color, marginBottom:22, fontFamily:MONO, opacity:0.8 }}>+ {plan.certNote}</div>
              <button onClick={() => plan.key==='reseller' ? window.location.href='mailto:mathimcafee@gmail.com' : nav('/auth')}
                style={{ width:'100%', padding:'12px', borderRadius:8, border:`1px solid ${plan.color}`,
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? '#fff' : plan.color,
                  fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F, marginBottom:22, transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=plan.color;e.currentTarget.style.color='#fff'}}
                onMouseLeave={e=>{e.currentTarget.style.background=plan.highlight?plan.color:'transparent';e.currentTarget.style.color=plan.highlight?'#fff':plan.color}}>
                {plan.cta} →
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:9, flex:1 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <Tick color={plan.color}/>
                    <span style={{ fontSize:12, color:BODY, lineHeight:1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COMPARISON TOGGLE */}
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <button onClick={() => setShowComparison(v => !v)}
            style={{ background:'transparent', border:`1px solid ${LINE2}`, color:TEAL,
              borderRadius:8, padding:'10px 22px', fontSize:13, cursor:'pointer', fontFamily:F, transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(45,212,191,0.08)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
            {showComparison ? '▲ Hide full comparison' : '▼ See full feature comparison'}
          </button>
        </div>

        {/* COMPARISON TABLE */}
        {showComparison && (
          <div style={{ marginBottom:64, border:`1px solid ${LINE}`, borderRadius:12, overflow:'hidden', marginTop:-20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
              background:CARD2, padding:'14px 20px', borderBottom:`1px solid ${LINE}` }}>
              <div style={{ fontSize:11, color:MUTED, fontFamily:MONO }}>Feature</div>
              {[['Starter',TEAL],['Pro',CORAL],['Reseller',AMBER]].map(([n,c]) => (
                <div key={n} style={{ fontSize:11, fontWeight:700, color:c, textTransform:'uppercase', letterSpacing:'0.8px', textAlign:'center', fontFamily:MONO }}>{n}</div>
              ))}
            </div>
            {FEATURES.map(section => (
              <div key={section.section}>
                <div style={{ padding:'9px 20px', background:'rgba(45,212,191,0.04)', borderTop:`1px solid ${LINE}` }}>
                  <span style={{ fontSize:10, fontWeight:700, color:TEAL, textTransform:'uppercase', letterSpacing:'1px', fontFamily:MONO }}>{section.section}</span>
                </div>
                {section.rows.map((row, i) => (
                  <div key={row.label} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
                    padding:'11px 20px', alignItems:'center',
                    borderBottom: i<section.rows.length-1 ? `1px solid ${LINE}` : 'none', transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(45,212,191,0.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:12, color:BODY, lineHeight:1.4 }}>{row.label}</span>
                    {[row.s,row.p,row.r].map((v,j) => (
                      <div key={j} style={{ display:'flex', justifyContent:'center' }}>
                        {v ? <Tick color={j===0?TEAL:j===1?CORAL:AMBER}/> : <Cross/>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* CERT PRICING TABLE */}
        <div style={{ marginBottom:64 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:9, fontWeight:700, color:TEAL, letterSpacing:'2px', textTransform:'uppercase', marginBottom:12, fontFamily:MONO }}>Certificate pricing</div>
            <h2 style={{ fontSize:'clamp(22px,3vw,34px)', fontWeight:900, letterSpacing:'-1px', marginBottom:10 }}>RapidSSL partner rates</h2>
            <p style={{ fontSize:13, color:BODY, maxWidth:420, margin:'0 auto', lineHeight:1.7 }}>
              DigiCert DV retail $218/yr vs. SSLVault $14/yr — same trust chain, 15× cheaper.
            </p>
          </div>
          <div style={{ border:`1px solid ${LINE}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
              background:CARD2, borderBottom:`1px solid ${LINE}`, padding:'12px 20px' }}>
              {['Certificate type','Term','CA','Price/yr'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:MONO }}>{h}</div>
              ))}
            </div>
            {CERT_PRICES.map((row, i) => (
              <div key={row.type} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
                padding:'13px 20px', alignItems:'center',
                borderBottom: i<CERT_PRICES.length-1 ? `1px solid ${LINE}` : 'none', transition:'background .12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(45,212,191,0.05)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, color:INK }}>{row.type}</span>
                  {row.badge && (
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10,
                      background:`rgba(45,212,191,0.12)`, color:TEAL, letterSpacing:'0.3px', fontFamily:MONO }}>
                      {row.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, color:MUTED, fontFamily:MONO }}>{row.term}</div>
                <div style={{ fontSize:12, color:MUTED, fontFamily:MONO }}>{row.ca}</div>
                <div style={{ fontSize:16, fontWeight:800, color:TEAL, fontFamily:MONO }}>{row.price}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:MUTED, marginTop:10, textAlign:'center', fontFamily:MONO }}>All prices in USD · RapidSSL partner rates · Subject to change</div>
        </div>

        {/* COMPETITOR COMPARISON */}
        <div style={{ border:`1px solid ${LINE}`, borderRadius:12, overflow:'hidden', marginBottom:64 }}>
          <div style={{ textAlign:'center', padding:'28px 24px 20px', borderBottom:`1px solid ${LINE}` }}>
            <div style={{ fontSize:9, fontWeight:700, color:TEAL, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8, fontFamily:MONO }}>CLM market comparison</div>
            <h2 style={{ fontSize:'clamp(18px,2.5vw,28px)', fontWeight:800, letterSpacing:'-0.5px' }}>Enterprise CLM without the enterprise price tag.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))' }}>
            {[
              { name:'SSLVault', price:'Free', sub:'beta · then from $29/mo', color:TEAL,
                points:['Complete CLM platform','CertBind — industry first','47-day readiness built-in','CertVault AES-256 included','cPanel + agent + DNS'], highlight:true },
              { name:'Venafi TLS Protect', price:'$250k+', sub:'per year', color:MUTED,
                points:['Enterprise only','No free tier','No cPanel support','No cert issuance','PKI team required'], highlight:false },
              { name:'Keyfactor Command', price:'$75–200k', sub:'per year', color:MUTED,
                points:['Mid-market focus','Complex setup','No cert issuance','No free tier','Professional services'], highlight:false },
            ].map((item, i) => (
              <div key={item.name} style={{ padding:'24px 22px',
                borderLeft: i>0 ? `1px solid ${LINE}` : 'none',
                background: item.highlight ? 'rgba(45,212,191,0.05)' : 'transparent' }}>
                <div style={{ fontSize:10, fontWeight:700, color:item.color, letterSpacing:'0.5px', marginBottom:8, fontFamily:MONO }}>{item.name}</div>
                <div style={{ fontSize:28, fontWeight:900, color:item.color, letterSpacing:'-1px', marginBottom:2, lineHeight:1 }}>{item.price}</div>
                <div style={{ fontSize:10, color:MUTED, marginBottom:16, fontFamily:MONO }}>{item.sub}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {item.points.map(p => (
                    <div key={p} style={{ display:'flex', alignItems:'center', gap:7 }}>
                      {item.highlight ? <Tick color={TEAL}/> : <Cross/>}
                      <span style={{ fontSize:11, color:item.highlight?BODY:MUTED, lineHeight:1.4 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:64 }}>
          <h2 style={{ fontSize:'clamp(20px,2.5vw,30px)', fontWeight:900, letterSpacing:'-0.8px', marginBottom:28 }}>Frequently asked questions</h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* CTA */}
        <div style={{ border:`1px solid ${LINE2}`, borderRadius:12, padding:'clamp(32px,5vw,48px) clamp(20px,4vw,40px)',
          textAlign:'center', background:`linear-gradient(135deg,rgba(45,212,191,0.07),rgba(255,107,91,0.05))` }}>
          <h2 style={{ fontSize:'clamp(22px,3vw,38px)', fontWeight:900, letterSpacing:'-1px', marginBottom:12 }}>Start today. Free while in beta.</h2>
          <p style={{ fontSize:14, color:BODY, maxWidth:380, margin:'0 auto 28px', lineHeight:1.7 }}>
            Full CLM from day one — 47-day readiness, CertVault, agent automation, CA intelligence, CertBind.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => nav('/auth')}
              style={{ background:`linear-gradient(135deg,${TEAL},${TEALH})`, border:'none', borderRadius:8,
                color:'#fff', fontSize:14, fontWeight:700, padding:'13px 28px', cursor:'pointer', fontFamily:F }}>
              Get Started Free →
            </button>
            <button onClick={() => window.location.href='mailto:mathimcafee@gmail.com'}
              style={{ background:'transparent', border:`1px solid rgba(255,107,91,0.4)`, borderRadius:8,
                color:CORAL, fontSize:14, fontWeight:600, padding:'13px 28px', cursor:'pointer', fontFamily:F }}>
              Contact for Reseller →
            </button>
          </div>
        </div>

      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  )
}
