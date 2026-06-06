import { useState } from 'react'
import PageHero from '../components/PageHero'

const F    = "'Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const TEAL = '#0077b6'
const INK  = '#111111'
const BODY = '#444444'
const MUTED= '#888888'
const LINE = 'rgba(0,0,0,0.08)'
const GREEN= '#00a550'
const AMBER= '#9a6400'

function Tick({ color = TEAL }) {
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
      <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.04)"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke="#cccccc" strokeWidth="2" strokeLinecap="round"/>
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

const STARTER_FEATURES = [
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
]

const PRO_FEATURES = [
  'Unlimited managed certificates',
  'Everything in Starter',
  'CertBind — active binding verification',
  'OV, EV & Wildcard certificates',
  'Multi-domain SAN certificates',
  'CT Abuse Monitor',
  'Multi-server fleet management',
  'DigiCert CertCentral portfolio sync',
  'Sectigo SCM portfolio sync',
  'Shadow IT detection',
  'Policy engine — fleet compliance',
  'REST API access',
  'Portfolio CSV export',
  'Sub-reseller management',
  'End-customer portal',
  'White-label dashboard',
  'Dedicated account manager',
  'Volume certificate pricing',
  'Priority support',
]

const FEATURES = [
  { section:'Certificates', rows:[
    { label:'DV certificates (RapidSSL)',            s:true,  p:true  },
    { label:'OV & EV certificates',                  s:false, p:true  },
    { label:'Wildcard certificates',                 s:false, p:true  },
    { label:'Multi-domain SAN',                      s:false, p:true  },
  ]},
  { section:'Automation', rows:[
    { label:'Persistent VPS agent',                  s:true,  p:true  },
    { label:'cPanel auto-install (UAPI)',            s:true,  p:true  },
    { label:'Auto DNS validation',                   s:true,  p:true  },
    { label:'Auto-renew (cert + order)',             s:true,  p:true  },
  ]},
  { section:'Security', rows:[
    { label:'CertVault — AES-256-GCM',              s:true,  p:true  },
    { label:'CertBind — active binding proof',       s:false, p:true  },
    { label:'Key reveal with password re-auth',      s:true,  p:true  },
    { label:'Immutable audit log + CSV',             s:true,  p:true  },
    { label:'SSL inspection proxy detection',        s:false, p:true  },
    { label:'Multi-node consistency check',          s:false, p:true  },
  ]},
  { section:'Monitoring', rows:[
    { label:'47-Day Readiness Dashboard',            s:true,  p:true  },
    { label:'Renewal Calendar',                      s:true,  p:true  },
    { label:'SSL Health Score A+ to F',              s:true,  p:true  },
    { label:'CT Log discovery',                      s:true,  p:true  },
    { label:'Email expiry alerts',                   s:true,  p:true  },
    { label:'CT Abuse Monitor',                      s:false, p:true  },
  ]},
  { section:'CA Intelligence', rows:[
    { label:'DigiCert CertCentral sync',             s:false, p:true  },
    { label:'Sectigo SCM sync',                      s:false, p:true  },
    { label:'Shadow IT detection',                   s:false, p:true  },
    { label:'Policy engine',                         s:false, p:true  },
    { label:'REST API access',                       s:false, p:true  },
    { label:'Portfolio CSV export',                  s:false, p:true  },
  ]},
  { section:'Reseller', rows:[
    { label:'Sub-reseller management',               s:false, p:true  },
    { label:'End-customer portal',                   s:false, p:true  },
    { label:'White-label dashboard',                 s:false, p:true  },
    { label:'Dedicated account manager',             s:false, p:true  },
  ]},
]

const FAQS = [
  { q:'What is the difference between Starter and Pro?',
    a:'Starter ($5/mo) covers individuals and small teams: up to 10 certificates, agent automation, cPanel, DNS, auto-renewal, CertVault, monitoring. Pro ($20/mo) is for teams and enterprises: unlimited certs, CertBind, OV/EV/Wildcard, CA intelligence, REST API, reseller tools, white-label, and more.' },
  { q:'Are certificate costs included in the plan price?',
    a:'No. Plan fees cover the CLM platform. SSL certificates are billed separately based on your usage — the type and number you issue. We source from RapidSSL at wholesale partner rates, passing savings directly to you. Pay only for what you actually issue.' },
  { q:'What is the SLA Guarantee add-on?',
    a:'The SLA Guarantee is a Pro add-on ($100 for the first year) that gives you a written guarantee all your certificates renew before the CA/B Forum 47-day deadline — or you get a full refund. Includes monthly PDF compliance reports for SOC2 / ISO 27001 auditors.' },
  { q:'What is the 47-Day Readiness Dashboard?',
    a:'CA/B Forum is mandating shorter certificate validity: 200 days by March 2026, 100 days by 2027, 47 days by 2029. The dashboard scores every certificate 0–100 and shows exactly what needs to be fixed — auto-renew enabled, DNS provider connected, agent installed, key stored securely.' },
  { q:'What is CertBind — and why does it matter?',
    a:'CertBind is an industry first (Pro only). Every 5 minutes, the agent cryptographically proves the key and cert match on your live server, checks the real TLS fingerprint, detects SSL inspection proxies, and verifies all load balancer nodes serve the same cert.' },
  { q:'Can I upgrade from Starter to Pro?',
    a:'Yes, at any time. Your certificates, keys, agents, and all data carry over. You are charged the Pro rate from the next billing cycle.' },
]

export default function Pricing({ nav }) {
  const [showComp, setShowComp] = useState(false)
  const [slaActive, setSlaActive] = useState(false)
  const P = 'clamp(20px,5vw,40px)'

  return (
    <div style={{background:'#ffffff',minHeight:'100vh',color:INK,fontFamily:F}}>
      <style>{`*{box-sizing:border-box}@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{maxWidth:980,margin:'0 auto',padding:`clamp(48px,8vw,80px) ${P} 100px`}}>

        {/* HERO */}
        <PageHero
          eyebrow="SSLVault Pricing"
          title="Two plans."
          titleAccent="Everything you need."
          subtitle="Start small, scale to enterprise. Full certificate lifecycle management — agents, auto-renewal, DNS automation, CertBind, CA intelligence, AES-256 key vault, 47-day readiness."
          stats={[{n:'2',l:'Plans'},{n:'47d',l:'Ready'},{n:'∞',l:'Renewals'},{n:'AES-256',l:'Key vault'}]}
          tags={['RapidSSL partner','AES-256-GCM','47-day ready','DNS automation','CA/B Forum 2026','GDPR compliant','Netherlands PKI']}
        />

        {/* PLAN CARDS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:16}}>

          {/* STARTER */}
          <div style={{borderRadius:14,border:`1px solid ${LINE}`,background:'#ffffff',
            padding:'32px 28px',display:'flex',flexDirection:'column',
            boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:10,fontWeight:700,color:TEAL,letterSpacing:'1.5px',
              textTransform:'uppercase',marginBottom:6,fontFamily:MONO}}>Starter</div>
            <div style={{fontSize:12,color:MUTED,marginBottom:20}}>Perfect for individuals & small teams</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:6}}>
              <span style={{fontSize:52,fontWeight:900,letterSpacing:'-3px',lineHeight:1,color:TEAL}}>$5</span>
              <span style={{fontSize:12,color:MUTED,fontFamily:MONO}}>/month</span>
            </div>
            <div style={{fontSize:11,color:TEAL,marginBottom:28,fontFamily:MONO,opacity:0.8}}>
              + SSL certificates billed by usage
            </div>
            <button onClick={() => nav('/auth')}
              style={{width:'100%',padding:'13px',borderRadius:8,border:`1px solid ${TEAL}`,
                background:'transparent',color:TEAL,fontSize:14,fontWeight:700,
                cursor:'pointer',fontFamily:F,marginBottom:28,transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=TEAL;e.currentTarget.style.color='#ffffff'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=TEAL}}>
              Get started →
            </button>
            <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
              {STARTER_FEATURES.map(f => (
                <div key={f} style={{display:'flex',alignItems:'flex-start',gap:9}}>
                  <Tick color={TEAL}/>
                  <span style={{fontSize:12.5,color:BODY,lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PRO */}
          <div style={{borderRadius:14,position:'relative',
            border:'1px solid rgba(0,119,182,0.25)',
            background:'linear-gradient(160deg,rgba(0,119,182,0.04) 0%,#ffffff 60%)',
            padding:'32px 28px',display:'flex',flexDirection:'column',
            boxShadow:'0 4px 32px rgba(0,119,182,0.12)'}}>

            {/* Most Popular badge */}
            <div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',
              background:`linear-gradient(135deg,${TEAL},#0091d6)`,borderRadius:20,padding:'4px 16px',
              fontSize:10,fontWeight:800,color:'#ffffff',whiteSpace:'nowrap',letterSpacing:'0.5px',fontFamily:MONO}}>
              ★ Most Popular
            </div>

            <div style={{fontSize:10,fontWeight:700,color:TEAL,letterSpacing:'1.5px',
              textTransform:'uppercase',marginBottom:6,fontFamily:MONO}}>Pro</div>
            <div style={{fontSize:12,color:MUTED,marginBottom:20}}>For teams, agencies & enterprises</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:6}}>
              <span style={{fontSize:52,fontWeight:900,letterSpacing:'-3px',lineHeight:1,color:TEAL}}>$20</span>
              <span style={{fontSize:12,color:MUTED,fontFamily:MONO}}>/month</span>
            </div>
            <div style={{fontSize:11,color:TEAL,marginBottom:20,fontFamily:MONO,opacity:0.8}}>
              + SSL certificates billed by usage
            </div>

            {/* SLA toggle */}
            <div style={{marginBottom:24,padding:'12px 14px',borderRadius:10,cursor:'pointer',
              background:slaActive?'rgba(0,165,80,0.08)':'rgba(0,119,182,0.06)',
              border:`1px solid ${slaActive?'rgba(0,165,80,0.3)':'rgba(0,119,182,0.2)'}`,
              transition:'all .2s'}}
              onClick={() => setSlaActive(v=>!v)}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:slaActive?GREEN:TEAL,marginBottom:2}}>
                    {slaActive ? '✓ SLA Guarantee add-on included' : '+ SLA Guarantee add-on'}
                  </div>
                  <div style={{fontSize:10,color:MUTED}}>
                    47-day compliance guarantee · PDF audit reports · $100 first year
                  </div>
                </div>
                <div style={{width:36,height:20,borderRadius:10,flexShrink:0,transition:'all .2s',
                  background:slaActive?GREEN:'rgba(0,119,182,0.2)',position:'relative'}}>
                  <div style={{position:'absolute',top:2,left:slaActive?18:2,width:16,height:16,
                    borderRadius:'50%',background:'#ffffff',transition:'left .2s',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>
              {slaActive && (
                <div style={{marginTop:8,fontSize:11,color:BODY,lineHeight:1.6,animation:'fadein .2s ease'}}>
                  Written guarantee: all certs renew before CA/B Forum deadline or full refund.
                  Monthly PDF compliance report for SOC2 / ISO 27001 auditors.
                </div>
              )}
            </div>

            {/* Total price when SLA active */}
            {slaActive && (
              <div style={{marginBottom:16,padding:'8px 14px',borderRadius:8,
                background:'rgba(0,165,80,0.06)',border:'1px solid rgba(0,165,80,0.2)',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                animation:'fadein .2s ease'}}>
                <span style={{fontSize:12,color:BODY}}>First year total</span>
                <span style={{fontSize:14,fontWeight:700,color:GREEN}}>$20/mo + $100 SLA</span>
              </div>
            )}

            <button onClick={() => nav('/auth')}
              style={{width:'100%',padding:'13px',borderRadius:8,border:'none',
                background:TEAL,color:'#ffffff',fontSize:14,fontWeight:700,
                cursor:'pointer',fontFamily:F,marginBottom:28,transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#0091d6'}
              onMouseLeave={e=>e.currentTarget.style.background=TEAL}>
              Start Pro →
            </button>

            <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{display:'flex',alignItems:'flex-start',gap:9}}>
                  <Tick color={TEAL}/>
                  <span style={{fontSize:12.5,color:BODY,lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cert billing note */}
        <div style={{marginBottom:56,padding:'14px 20px',borderRadius:10,textAlign:'center',
          background:'rgba(0,119,182,0.04)',border:'1px solid rgba(0,119,182,0.12)',
          fontSize:12,color:BODY}}>
          SSL certificates billed separately at RapidSSL wholesale partner rates.
          DV from €8/yr · OV/EV/Wildcard on request. Pay only for what you issue.
        </div>

        {/* COMPARISON TOGGLE */}
        <div style={{textAlign:'center',marginBottom:48}}>
          <button onClick={() => setShowComp(v=>!v)}
            style={{background:'transparent',border:`1px solid ${LINE}`,color:TEAL,
              borderRadius:8,padding:'10px 24px',fontSize:13,cursor:'pointer',fontFamily:F,transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.07)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {showComp ? '▲ Hide full comparison' : '▼ Full feature comparison'}
          </button>
        </div>

        {/* COMPARISON TABLE */}
        {showComp && (
          <div style={{marginBottom:64,border:`1px solid ${LINE}`,borderRadius:12,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',
              background:INK,padding:'16px 24px',borderBottom:`1px solid rgba(255,255,255,0.1)`}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontFamily:MONO}}>Feature</div>
              {[['Starter','#5bbfa8'],['Pro','#60b0f0']].map(([n,c]) => (
                <div key={n} style={{fontSize:11,fontWeight:700,color:c,textTransform:'uppercase',
                  letterSpacing:'0.8px',textAlign:'center',fontFamily:MONO}}>{n}</div>
              ))}
            </div>
            {FEATURES.map(sec => (
              <div key={sec.section}>
                <div style={{padding:'9px 24px',background:'rgba(0,119,182,0.05)',borderTop:`1px solid ${LINE}`}}>
                  <span style={{fontSize:10,fontWeight:700,color:TEAL,textTransform:'uppercase',
                    letterSpacing:'1px',fontFamily:MONO}}>{sec.section}</span>
                </div>
                {sec.rows.map((row, i) => (
                  <div key={row.label}
                    style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',
                      padding:'11px 24px',alignItems:'center',
                      borderBottom:i<sec.rows.length-1?`1px solid ${LINE}`:'none',transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{fontSize:12,color:BODY,lineHeight:1.4}}>{row.label}</span>
                    {[['s',TEAL],['p','#0091d6']].map(([k,c]) => (
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

        {/* SLA ADD-ON CALLOUT */}
        <div style={{maxWidth:'100%',margin:'0 auto 64px',background:'rgba(0,165,80,0.05)',
          border:'1px solid rgba(0,165,80,0.2)',borderRadius:14,padding:'28px 32px'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:24,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontSize:10,fontWeight:700,color:GREEN,letterSpacing:'.12em',
                textTransform:'uppercase',marginBottom:8,fontFamily:MONO}}>
                Premium add-on · SLA Guarantee
              </div>
              <div style={{fontSize:18,fontWeight:700,color:INK,marginBottom:10,letterSpacing:'-0.3px'}}>
                47-Day CA/B Forum Compliance — Guaranteed
              </div>
              <div style={{fontSize:13,color:BODY,lineHeight:1.8,maxWidth:460}}>
                Available on Pro. A written SLA guarantees all your certificates renew before
                the CA/B Forum 47-day mandate — or you get a full refund. Includes monthly
                PDF compliance reports for SOC2 / ISO 27001 auditors.
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7,minWidth:200}}>
              {[
                'Compliance score dashboard (0–100)',
                'Monthly PDF audit report',
                'Escalation alerts at 30d + 10d',
                'SOC2 / ISO 27001 evidence pack',
                '47-Day mandate guarantee or refund',
              ].map(f => (
                <div key={f} style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:12,color:GREEN,fontWeight:700}}>✓</span>
                  <span style={{fontSize:12,color:BODY}}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center',
              justifyContent:'center',minWidth:140,textAlign:'center'}}>
              <div style={{fontSize:11,color:MUTED,letterSpacing:'.06em',textTransform:'uppercase'}}>First year</div>
              <div style={{fontSize:38,fontWeight:900,color:GREEN,lineHeight:1,letterSpacing:'-1px'}}>
                $100
              </div>
              <div style={{fontSize:11,color:MUTED}}>Pro plan required</div>
              <button onClick={() => nav('/auth')}
                style={{marginTop:8,padding:'8px 18px',borderRadius:8,border:`1px solid ${GREEN}`,
                  background:'transparent',color:GREEN,fontSize:12,fontWeight:700,
                  cursor:'pointer',fontFamily:F,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=GREEN;e.currentTarget.style.color='#ffffff'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=GREEN}}>
                Add to Pro →
              </button>
            </div>
          </div>
        </div>

        {/* COMPETITOR COMPARISON */}
        <div style={{border:`1px solid ${LINE}`,borderRadius:14,overflow:'hidden',marginBottom:72}}>
          <div style={{textAlign:'center',padding:'28px 24px 20px',borderBottom:`1px solid ${LINE}`,background:'#f0f4fa'}}>
            <div style={{fontSize:9,fontWeight:700,color:TEAL,letterSpacing:'2px',
              textTransform:'uppercase',marginBottom:10,fontFamily:MONO}}>CLM market comparison</div>
            <h2 style={{fontSize:'clamp(18px,2.5vw,28px)',fontWeight:800,letterSpacing:'-0.5px',color:INK,margin:0}}>
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
                background:item.hi?'rgba(0,119,182,0.04)':'transparent'}}>
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

        {/* FAQ */}
        <div style={{marginBottom:72}}>
          <h2 style={{fontSize:'clamp(20px,2.5vw,32px)',fontWeight:900,letterSpacing:'-0.8px',
            marginBottom:32,textAlign:'center'}}>Frequently asked questions</h2>
          {FAQS.map(faq => <FAQ key={faq.q} {...faq}/>)}
        </div>

        {/* CTA */}
        <div style={{border:`1px solid ${LINE}`,borderRadius:14,
          padding:'clamp(40px,6vw,60px) clamp(24px,5vw,48px)',
          textAlign:'center',
          background:`linear-gradient(135deg,rgba(0,119,182,0.06) 0%,rgba(0,119,182,0.02) 100%)`}}>
          <h2 style={{fontSize:'clamp(24px,3.5vw,40px)',fontWeight:900,letterSpacing:'-1px',marginBottom:14,color:INK}}>
            Start managing your certificates today.
          </h2>
          <p style={{fontSize:14,color:BODY,maxWidth:440,margin:'0 auto 32px',lineHeight:1.8}}>
            Full CLM from day one — 47-day readiness, CertVault, agent automation, CA intelligence, CertBind active binding.
          </p>
          <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={() => nav('/auth')}
              style={{background:TEAL,border:'none',borderRadius:8,
                color:'#ffffff',fontSize:15,fontWeight:700,padding:'14px 36px',cursor:'pointer',fontFamily:F,
                boxShadow:`0 4px 24px rgba(0,119,182,0.25)`,transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#0091d6'}
              onMouseLeave={e=>e.currentTarget.style.background=TEAL}>
              Get started →
            </button>
            <button onClick={() => window.location.href='mailto:mathimcafee@gmail.com'}
              style={{background:'transparent',border:`1px solid ${LINE}`,borderRadius:8,
                color:TEAL,fontSize:15,fontWeight:600,padding:'14px 36px',cursor:'pointer',fontFamily:F,
                transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,119,182,0.07)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              Contact for Enterprise →
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
