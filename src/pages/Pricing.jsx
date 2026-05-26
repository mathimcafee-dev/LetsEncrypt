import { useState } from 'react'

const F    = "'Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const BG   = '#0d2b2b'
const CARD = '#1a4040'
const CARD2= '#0f3535'
const TEAL = '#2dd4bf'
const TEALH= '#14b8a6'
const CORAL= '#ff6b5b'
const INK  = '#e8f5f4'
const BODY = 'rgba(232,245,244,0.65)'
const MUTED= 'rgba(232,245,244,0.35)'
const LINE = 'rgba(45,212,191,0.15)'
const LINE2= 'rgba(45,212,191,0.28)'
const GREEN= '#4ade80'
const AMBER= '#fbbf24'

function Tick({ color=TEAL }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:1}}>
      <circle cx="12" cy="12" r="11" fill={color+'20'}/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function Cross() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:1}}>
      <circle cx="12" cy="12" r="11" fill="rgba(45,212,191,0.04)"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke="rgba(232,245,244,0.18)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o=>!o)} style={{borderBottom:`1px solid ${LINE}`,padding:'18px 0',cursor:'pointer'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <div style={{fontSize:14,fontWeight:600,color:open?TEAL:INK,transition:'color .15s'}}>{q}</div>
        <span style={{color:TEAL,fontSize:22,lineHeight:1,flexShrink:0}}>{open?'−':'+'}</span>
      </div>
      {open && <div style={{fontSize:13,color:BODY,lineHeight:1.85,marginTop:12}}>{a}</div>}
    </div>
  )
}

const PLANS = [
  {
    key:'starter', name:'Starter', price:'$5', per:'/month',
    color:TEAL, glow:'rgba(45,212,191,0.15)', highlight:false,
    cta:'Get started', badge:null,
    sub:'Perfect for individuals & small teams',
    certNote:'+ SSL certificates billed by usage',
    features:[
      'Up to 10 managed certificates',
      'Persistent VPS agent — Nginx / Apache',
      'cPanel auto-install (UAPI)',
      'Auto DNS validation (Cloudflare, Vercel…)',
      'Auto-renew before cert + order expiry',
      'CertVault — AES-256-GCM key vault',
      'CT Log discovery',
      '47-Day Readiness Dashboard',
      'Renewal Calendar',
      'SSL Health Score A+ to F',
      'Email expiry alerts',
    ],
  },
  {
    key:'premium', name:'Premium', price:'$10', per:'/month',
    color:CORAL, glow:'rgba(255,107,91,0.2)', highlight:true,
    cta:'Start Premium', badge:'Most Popular',
    sub:'For growing teams & agencies',
    certNote:'+ SSL certificates billed by usage',
    features:[
      'Up to 50 managed certificates',
      'Everything in Starter',
      'CertBind — active binding verification',
      'OV & Wildcard certificates',
      'CT Abuse Monitor',
      'Multi-server fleet management',
      'Priority email support',
      'DigiCert CertCentral portfolio sync',
      'Shadow IT detection',
    ],
  },
  {
    key:'pro', name:'Pro', price:'$20', per:'/month',
    color:AMBER, glow:'rgba(251,191,36,0.15)', highlight:false,
    cta:'Start Pro', badge:null,
    sub:'For enterprises & resellers',
    certNote:'+ SSL certificates billed by usage',
    features:[
      'Unlimited managed certificates',
      'Everything in Premium',
      'EV & SAN certificates',
      'Sectigo SCM portfolio sync',
      'Policy engine — fleet compliance',
      'REST API access',
      'Portfolio CSV export',
      'Sub-reseller management',
      'End-customer portal',
      'White-label dashboard',
      'Dedicated account manager',
      'Volume certificate pricing',
    ],
  },
]

const FEATURES = [
  { section:'Certificates', rows:[
    { label:'DV certificates (RapidSSL / Sectigo)', s:true,  p:true,  r:true  },
    { label:'OV & EV certificates',                 s:false, p:true,  r:true  },
    { label:'Wildcard certificates',                s:false, p:true,  r:true  },
    { label:'Multi-domain SAN',                     s:false, p:true,  r:true  },
  ]},
  { section:'Automation', rows:[
    { label:'Persistent VPS agent',                 s:true,  p:true,  r:true  },
    { label:'cPanel auto-install (UAPI)',           s:true,  p:true,  r:true  },
    { label:'Auto DNS validation',                  s:true,  p:true,  r:true  },
    { label:'Auto-renew (cert + order)',            s:true,  p:true,  r:true  },
  ]},
  { section:'Security', rows:[
    { label:'CertVault — AES-256-GCM',             s:true,  p:true,  r:true  },
    { label:'CertBind — active binding proof',      s:true,  p:true,  r:true  },
    { label:'Key reveal with password re-auth',     s:true,  p:true,  r:true  },
    { label:'Immutable audit log + CSV',            s:true,  p:true,  r:true  },
    { label:'SSL inspection proxy detection',       s:false, p:true,  r:true  },
    { label:'Multi-node consistency check',         s:false, p:true,  r:true  },
  ]},
  { section:'Monitoring', rows:[
    { label:'47-Day Readiness Dashboard',           s:true,  p:true,  r:true  },
    { label:'Renewal Calendar',                     s:true,  p:true,  r:true  },
    { label:'SSL Health Score A+ to F',             s:true,  p:true,  r:true  },
    { label:'CT Log discovery',                     s:true,  p:true,  r:true  },
    { label:'Email expiry alerts',                  s:true,  p:true,  r:true  },
    { label:'CT Abuse Monitor',                     s:false, p:true,  r:true  },
  ]},
  { section:'CA Intelligence', rows:[
    { label:'DigiCert CertCentral sync',            s:false, p:true,  r:true  },
    { label:'Sectigo SCM sync',                     s:false, p:true,  r:true  },
    { label:'Shadow IT detection',                  s:false, p:true,  r:true  },
    { label:'Policy engine',                        s:false, p:true,  r:true  },
    { label:'REST API access',                      s:false, p:true,  r:true  },
    { label:'Portfolio CSV export',                 s:false, p:true,  r:true  },
  ]},
  { section:'Reseller', rows:[
    { label:'Sub-reseller management',              s:false, p:false, r:true  },
    { label:'End-customer portal',                  s:false, p:false, r:true  },
    { label:'White-label dashboard',                s:false, p:false, r:true  },
    { label:'Dedicated account manager',            s:false, p:false, r:true  },
  ]},
]

const FAQS = [
  { q:'What does each plan include?',
    a:'Starter ($5/mo) — up to 10 certs, agent, cPanel, DNS automation, auto-renewal, CertVault, CT discovery, 47-Day Readiness, monitoring. Premium ($10/mo) — up to 50 certs, adds CertBind, OV/Wildcard, CA sync, CT Abuse Monitor. Pro ($20/mo) — unlimited certs, adds EV/SAN, Sectigo sync, REST API, reseller tools, white-label. All plans: certificates charged separately at RapidSSL partner rates.' },
  { q:'Are certificate costs included in the plan price?',
    a:'No. Plan fees cover the CLM platform features. SSL certificates are billed separately based on your monthly usage — the type and number of certs you issue. We source from RapidSSL and Sectigo at wholesale partner rates, passing savings directly to you. Pay only for what you actually issue.' },
  { q:'What is the 47-Day Readiness Dashboard?',
    a:'CA/B Forum is mandating shorter certificate validity: 200 days by March 2026, 100 days by 2027, 47 days by 2029. The dashboard scores every certificate 0–100 and shows exactly what needs to be fixed — auto-renew enabled, DNS provider connected, agent installed, key stored securely.' },
  { q:'What is CertBind — and why does it matter?',
    a:'CertBind is an industry first. Every 5 minutes, the agent cryptographically proves the key and cert match on your live server, checks the real TLS fingerprint, detects SSL inspection proxies, and verifies all load balancer nodes serve the same cert. No other CLM tool does this.' },
  { q:'Are certificate costs separate from the plan?',
    a:'Yes. Plan fees cover the platform. Certificates are purchased at RapidSSL partner rates — starting from €8/yr for DV, €14/yr for RapidSSL Standard DV (same DigiCert trust chain as $218/yr retail). You only pay for the certificates you actually issue.' },
  { q:'What is the Reseller plan?',
    a:'Reseller adds multi-tenant architecture — sub-reseller registration, end-customer portal, order management on behalf of customers, Excel exports, white-label dashboard, and dedicated account manager. Contact us at mathimcafee@gmail.com for pricing.' },
]

export default function Pricing({ nav }) {
  const [showComp, setShowComp] = useState(false)
  const P = 'clamp(20px,5vw,40px)'

  return (
    <div style={{background:BG,minHeight:'100vh',color:INK,fontFamily:F}}>
      <style>{`*{box-sizing:border-box}::selection{background:rgba(45,212,191,0.2);color:${TEAL}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div style={{maxWidth:1080,margin:'0 auto',padding:`clamp(48px,8vw,80px) ${P} 100px`}}>

        {/* ── HERO ── */}
        <div style={{textAlign:'center',marginBottom:72}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:10,fontWeight:700,
            color:TEAL,letterSpacing:'2px',textTransform:'uppercase',padding:'5px 16px',
            border:`1px solid ${LINE2}`,borderRadius:20,marginBottom:24,fontFamily:MONO}}>
            ◆ SSLVault Pricing
          </div>
          <h1 style={{fontSize:'clamp(32px,5vw,56px)',fontWeight:900,letterSpacing:'-2px',lineHeight:1.06,marginBottom:18}}>
            Professional CLM.<br/>
            <span style={{color:TEAL}}>Transparent pricing.</span>
          </h1>
          <p style={{fontSize:16,color:BODY,maxWidth:540,margin:'0 auto 20px',lineHeight:1.8}}>
            The complete certificate lifecycle management platform — agents, auto-renewal,
            DNS automation, CertBind, CA intelligence, AES-256 key vault,
            47-day readiness. Certificates at RapidSSL partner rates.
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:GREEN,display:'inline-block',animation:'blink 2s ease infinite'}}/>
            <span style={{fontSize:12,color:BODY,fontFamily:MONO}}>Netherlands-based PKI engineer · Certified PKI Specialist · GDPR compliant</span>
          </div>
        </div>

        {/* ── PLAN CARDS ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:56,
          '@media(max-width:700px)':{gridTemplateColumns:'1fr'}}}>
          {PLANS.map(plan => (
            <div key={plan.key} style={{
              borderRadius:14, border:`1px solid ${plan.highlight ? 'rgba(255,107,91,0.4)' : LINE}`,
              background: plan.highlight
                ? `linear-gradient(160deg,rgba(255,107,91,0.1),${CARD} 60%)`
                : CARD,
              padding:'28px 24px', position:'relative', display:'flex', flexDirection:'column',
              boxShadow: plan.highlight ? `0 0 50px ${plan.glow}` : 'none',
            }}>
              {plan.badge && (
                <div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',
                  background:`linear-gradient(135deg,${CORAL},#ff9e8c)`,borderRadius:20,padding:'4px 16px',
                  fontSize:10,fontWeight:800,color:'#fff',whiteSpace:'nowrap',letterSpacing:'0.5px',fontFamily:MONO}}>
                  ★ {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div style={{fontSize:10,fontWeight:700,color:plan.color,letterSpacing:'1.5px',
                textTransform:'uppercase',marginBottom:6,fontFamily:MONO}}>{plan.name}</div>
              <div style={{fontSize:12,color:MUTED,marginBottom:18}}>{plan.sub}</div>

              {/* Price */}
              <div style={{marginBottom:6,display:'flex',alignItems:'baseline',gap:4}}>
                <span style={{fontSize:plan.price==='Custom'?32:48,fontWeight:900,letterSpacing:'-2px',
                  lineHeight:1,color:plan.color}}>{plan.price}</span>
                <span style={{fontSize:12,color:MUTED,fontFamily:MONO}}>{plan.per}</span>
              </div>
              <div style={{fontSize:11,color:plan.color,marginBottom:24,fontFamily:MONO,opacity:0.75}}>
                + {plan.certNote}
              </div>

              {/* CTA */}
              <button onClick={() => plan.key==='reseller'
                  ? window.location.href='mailto:mathimcafee@gmail.com'
                  : nav('/auth')}
                style={{width:'100%',padding:'13px',borderRadius:8,
                  border:`1px solid ${plan.color}`,
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? '#fff' : plan.color,
                  fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:F,
                  marginBottom:26,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=plan.color;e.currentTarget.style.color='#fff'}}
                onMouseLeave={e=>{e.currentTarget.style.background=plan.highlight?plan.color:'transparent';e.currentTarget.style.color=plan.highlight?'#fff':plan.color}}>
                {plan.cta} →
              </button>

              {/* Features */}
              <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
                {plan.features.map(f => (
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:9}}>
                    <Tick color={plan.color}/>
                    <span style={{fontSize:12.5,color:BODY,lineHeight:1.5}}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── COMPARISON TOGGLE ── */}
        <div style={{textAlign:'center',marginBottom:48}}>
          <button onClick={() => setShowComp(v=>!v)}
            style={{background:'transparent',border:`1px solid ${LINE2}`,color:TEAL,
              borderRadius:8,padding:'10px 24px',fontSize:13,cursor:'pointer',fontFamily:F,transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(45,212,191,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {showComp ? '▲ Hide full comparison' : '▼ Full feature comparison'}
          </button>
        </div>

        {/* ── COMPARISON TABLE ── */}
        {showComp && (
          <div style={{marginBottom:64,border:`1px solid ${LINE}`,borderRadius:12,overflow:'hidden'}}>
            {/* Header */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',
              background:CARD2,padding:'16px 24px',borderBottom:`1px solid ${LINE}`}}>
              <div style={{fontSize:11,color:MUTED,fontFamily:MONO}}>Feature</div>
              {[['Starter',TEAL],['Premium',CORAL],['Pro',AMBER]].map(([n,c]) => (
                <div key={n} style={{fontSize:11,fontWeight:700,color:c,textTransform:'uppercase',
                  letterSpacing:'0.8px',textAlign:'center',fontFamily:MONO}}>{n}</div>
              ))}
            </div>
            {FEATURES.map(sec => (
              <div key={sec.section}>
                <div style={{padding:'9px 24px',background:'rgba(45,212,191,0.04)',borderTop:`1px solid ${LINE}`}}>
                  <span style={{fontSize:10,fontWeight:700,color:TEAL,textTransform:'uppercase',
                    letterSpacing:'1px',fontFamily:MONO}}>{sec.section}</span>
                </div>
                {sec.rows.map((row, i) => (
                  <div key={row.label}
                    style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',
                      padding:'11px 24px',alignItems:'center',
                      borderBottom:i<sec.rows.length-1?`1px solid ${LINE}`:'none',transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(45,212,191,0.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{fontSize:12,color:BODY,lineHeight:1.4}}>{row.label}</span>
                    {[['s',TEAL],['p',CORAL],['r',AMBER]].map(([k,c]) => (
                      <div key={k} style={{display:'flex',justifyContent:'center'}}>
                        {row[k] ? <Tick color={c}/> : <Cross/>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}


        {/* ── SSL USAGE NOTE ── */}
        <div style={{border:`1px solid ${LINE}`,borderRadius:12,padding:'28px 32px',marginBottom:72,
          background:'rgba(45,212,191,0.04)',textAlign:'center'}}>
          <div style={{fontSize:10,fontWeight:700,color:TEAL,letterSpacing:'2px',
            textTransform:'uppercase',marginBottom:12,fontFamily:MONO}}>Certificate billing</div>
          <h3 style={{fontSize:20,fontWeight:700,color:INK,marginBottom:12,letterSpacing:'-0.3px'}}>
            SSL certificates billed by usage
          </h3>
          <p style={{fontSize:14,color:BODY,maxWidth:520,margin:'0 auto',lineHeight:1.85}}>
            Certificate costs are billed separately based on your monthly usage —
            the type and number of certificates you issue. We source from RapidSSL and Sectigo
            at wholesale partner rates, passing the savings directly to you.
            No upfront commitment. Pay only for what you issue.
          </p>
          <div style={{display:'flex',gap:28,justifyContent:'center',marginTop:24,flexWrap:'wrap'}}>
            {[
              ['DV Certificates','Domain validation — most common'],
              ['OV & EV Certificates','Organisation & extended validation'],
              ['Wildcard & SAN','Multi-domain & subdomain coverage'],
            ].map(([title,desc]) => (
              <div key={title} style={{display:'flex',alignItems:'center',gap:9}}>
                <span style={{color:TEAL,fontSize:14}}>◆</span>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:12,fontWeight:600,color:INK}}>{title}</div>
                  <div style={{fontSize:11,color:MUTED}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* ── COMPETITOR COMPARISON ── */}
        <div style={{border:`1px solid ${LINE}`,borderRadius:14,overflow:'hidden',marginBottom:72}}>
          <div style={{textAlign:'center',padding:'32px 24px 24px',borderBottom:`1px solid ${LINE}`,background:CARD2}}>
            <div style={{fontSize:9,fontWeight:700,color:TEAL,letterSpacing:'2px',
              textTransform:'uppercase',marginBottom:10,fontFamily:MONO}}>CLM market comparison</div>
            <h2 style={{fontSize:'clamp(18px,2.5vw,30px)',fontWeight:800,letterSpacing:'-0.5px'}}>
              Enterprise CLM without the enterprise price tag.
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)'}}>
            {[
              { name:'SSLVault', price:'$20', sub:'/month Pro · + certificate charges', color:TEAL,
                points:['Complete CLM platform','CertBind — industry first','47-day readiness built-in','CertVault AES-256 included','cPanel + agent + DNS'], hi:true },
              { name:'Venafi TLS Protect', price:'€250k+', sub:'per year enterprise', color:MUTED,
                points:['Enterprise contracts only','No cert issuance included','No cPanel support','PKI team required','No free tier'], hi:false },
              { name:'Keyfactor Command', price:'€75–200k', sub:'per year', color:MUTED,
                points:['Mid-market focus only','Complex setup required','No cert issuance','Professional services needed','No free tier'], hi:false },
            ].map((item, i) => (
              <div key={item.name} style={{padding:'28px 24px',
                borderLeft:i>0?`1px solid ${LINE}`:'none',
                background:item.hi?'rgba(45,212,191,0.04)':'transparent'}}>
                <div style={{fontSize:10,fontWeight:700,color:item.color,letterSpacing:'0.5px',marginBottom:8,fontFamily:MONO}}>{item.name}</div>
                <div style={{fontSize:30,fontWeight:900,color:item.color,letterSpacing:'-1px',marginBottom:3,lineHeight:1}}>{item.price}</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:18,fontFamily:MONO}}>{item.sub}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {item.points.map(p => (
                    <div key={p} style={{display:'flex',alignItems:'center',gap:8}}>
                      {item.hi ? <Tick color={TEAL}/> : <Cross/>}
                      <span style={{fontSize:12,color:item.hi?BODY:MUTED,lineHeight:1.4}}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{marginBottom:72}}>
          <h2 style={{fontSize:'clamp(20px,2.5vw,32px)',fontWeight:900,letterSpacing:'-0.8px',
            marginBottom:32,textAlign:'center'}}>Frequently asked questions</h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* ── CTA ── */}
        <div style={{border:`1px solid ${LINE2}`,borderRadius:14,
          padding:'clamp(40px,6vw,60px) clamp(24px,5vw,48px)',
          textAlign:'center',
          background:`linear-gradient(135deg,rgba(45,212,191,0.07) 0%,rgba(255,107,91,0.05) 100%)`}}>
          <h2 style={{fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,letterSpacing:'-1px',marginBottom:14}}>
            Start managing your certificates today.
          </h2>
          <p style={{fontSize:14,color:BODY,maxWidth:440,margin:'0 auto 32px',lineHeight:1.8}}>
            Full CLM from day one — 47-day readiness, CertVault, agent automation, CA intelligence, CertBind active binding.
          </p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={() => nav('/auth')}
              style={{background:`linear-gradient(135deg,${TEAL},${TEALH})`,border:'none',borderRadius:8,
                color:'#fff',fontSize:15,fontWeight:700,padding:'14px 32px',cursor:'pointer',fontFamily:F,
                boxShadow:`0 4px 24px rgba(45,212,191,0.25)`}}>
              Get started →
            </button>
            <button onClick={() => window.location.href='mailto:mathimcafee@gmail.com'}
              style={{background:'transparent',border:`1px solid rgba(255,107,91,0.5)`,borderRadius:8,
                color:CORAL,fontSize:15,fontWeight:600,padding:'14px 32px',cursor:'pointer',fontFamily:F,
                transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,107,91,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              Contact for Reseller →
            </button>
          </div>
          <div style={{marginTop:20,fontSize:12,color:MUTED,fontFamily:MONO}}>
            SSL certificates billed by usage · No upfront commitment · Certified PKI Specialist
          </div>
        </div>

      </div>
    </div>
  )
}
