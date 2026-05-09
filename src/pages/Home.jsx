import { Shield, Lock, CheckCircle, Zap, Globe, Server, ChevronRight, ArrowRight, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function CertHeroIllustration() {
  return (
    <div style={{position:'relative',width:'100%',height:420,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {/* Ambient blobs */}
      <div style={{position:'absolute',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 70%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',filter:'blur(40px)'}} />
      <div style={{position:'absolute',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,0.2) 0%,transparent 70%)',top:'20%',right:'10%',filter:'blur(30px)'}} />
      <div style={{position:'absolute',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%)',bottom:'10%',left:'8%',filter:'blur(28px)'}} />

      {/* Central shield */}
      <div style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div style={{width:88,height:88,background:'linear-gradient(135deg,#1d4ed8 0%,#0ea5e9 100%)',borderRadius:24,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 12px rgba(59,130,246,0.12),0 0 0 24px rgba(59,130,246,0.06),0 20px 60px rgba(37,99,235,0.4)',marginBottom:0}}>
          <Shield size={44} color='white' strokeWidth={1.5}/>
        </div>
        {/* Verified badge */}
        <div style={{marginTop:-14,background:'linear-gradient(135deg,#059669,#10b981)',borderRadius:24,padding:'4px 14px',display:'flex',alignItems:'center',gap:5,boxShadow:'0 4px 16px rgba(16,185,129,0.4)',zIndex:12}}>
          <CheckCircle size={11} color='white'/>
          <span style={{fontSize:10,fontWeight:800,color:'white',letterSpacing:'0.8px'}}>VERIFIED & TRUSTED</span>
        </div>
      </div>

      {/* Orbit ring 1 - dashed */}
      <div style={{position:'absolute',width:240,height:240,borderRadius:'50%',border:'1.5px dashed rgba(59,130,246,0.3)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}} />
      {/* Orbit ring 2 */}
      <div style={{position:'absolute',width:360,height:360,borderRadius:'50%',border:'1px solid rgba(59,130,246,0.12)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}} />

      {/* Orbiting nodes */}
      {[
        {angle:0,   r:120,icon:'N',label:'Nginx',    color:'#059669',bg:'#d1fae5',ring:'#6ee7b7'},
        {angle:72,  r:120,icon:'A',label:'Apache',   color:'#7c3aed',bg:'#ede9fe',ring:'#c4b5fd'},
        {angle:144, r:120,icon:'D',label:'Docker',   color:'#0ea5e9',bg:'#e0f2fe',ring:'#7dd3fc'},
        {angle:216, r:120,icon:'C',label:'cPanel',   color:'#d97706',bg:'#fef3c7',ring:'#fcd34d'},
        {angle:288, r:120,icon:'K',label:'Caddy',    color:'#db2777',bg:'#fce7f3',ring:'#f9a8d4'},
      ].map(({angle, r, icon, label, color, bg, ring}) => {
        const rad = (angle - 90) * Math.PI / 180
        const x = Math.cos(rad) * r
        const y = Math.sin(rad) * r
        return (
          <div key={label} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(calc(-50% + '+x+'px), calc(-50% + '+y+'px))',zIndex:8,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{width:38,height:38,borderRadius:11,background:bg,border:'2px solid '+ring,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,0,0,0.1)'}}>
              <span style={{fontSize:14,fontWeight:900,color:color}}>{icon}</span>
            </div>
            <span style={{fontSize:9,fontWeight:700,color:'#64748b',letterSpacing:'0.3px',background:'white',padding:'1px 6px',borderRadius:6,border:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{label}</span>
          </div>
        )
      })}

      {/* Floating cert card - top right */}
      <div style={{position:'absolute',top:24,right:0,background:'white',borderRadius:14,padding:'12px 16px',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',border:'1px solid #e2e8f0',zIndex:15,minWidth:170}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:28,height:28,background:'linear-gradient(135deg,#059669,#10b981)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><Lock size={13} color='white'/></div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',lineHeight:1}}>easysecurity.in</div>
            <div style={{fontSize:9,color:'#64748b',marginTop:2}}>TLS 1.3 · RSA 2048</div>
          </div>
        </div>
        <div style={{height:3,background:'#f1f5f9',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:'78%',background:'linear-gradient(90deg,#059669,#10b981)',borderRadius:2}} />
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
          <span style={{fontSize:9,color:'#94a3b8'}}>70 days left</span>
          <span style={{fontSize:9,fontWeight:700,color:'#059669'}}>✓ Valid</span>
        </div>
      </div>

      {/* Floating ACME badge - bottom left */}
      <div style={{position:'absolute',bottom:20,left:0,background:'white',borderRadius:12,padding:'10px 14px',boxShadow:'0 8px 24px rgba(0,0,0,0.09)',border:'1px solid #e2e8f0',zIndex:15,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:32,height:32,background:'linear-gradient(135deg,#7c3aed,#a78bfa)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Zap size={15} color='white'/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>ACME RFC 8555</div>
          <div style={{fontSize:9,color:'#64748b'}}>Issued in &lt;60 seconds</div>
        </div>
      </div>

      {/* Floating free badge - top left */}
      <div style={{position:'absolute',top:40,left:8,background:'linear-gradient(135deg,#f59e0b,#fbbf24)',borderRadius:10,padding:'7px 12px',boxShadow:'0 6px 20px rgba(245,158,11,0.35)',zIndex:15}}>
        <div style={{fontSize:13,fontWeight:900,color:'white',lineHeight:1}}>100% Free</div>
        <div style={{fontSize:9,color:'rgba(255,255,255,0.85)',marginTop:1}}>No credit card</div>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: Zap, title: 'Instant Issuance', desc: 'Trusted DV certificate in under 60 seconds via ACME — no forms, no waiting, no credit card.', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { icon: Shield, title: 'Enterprise CLM', desc: 'Full lifecycle: inventory, health grades, expiry alerts, multi-domain tracking and renewal reminders.', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { icon: Globe, title: 'Any Domain', desc: 'Works with any publicly accessible domain. Supports HTTP-01 and DNS-01 ACME challenge methods.', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { icon: Server, title: 'One-click Install', desc: 'Deploy to Nginx, Apache, cPanel, Node.js and Docker via our smart install guides.', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { icon: Activity, title: 'External Monitor', desc: 'Track SSL health of any domain. Scan any host, get expiry dates and issuer details.', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  { icon: Lock, title: 'PKI Best Practices', desc: 'OCSP stapling, HSTS, CT logging, TLS 1.3 guidance and cipher hardening in every guide.', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
]

const STEPS = [
  { n: '01', title: 'Enter your domain', desc: 'Type your domain name — single domain or wildcard (*.example.com).', color: '#2563eb' },
  { n: '02', title: 'Complete DNS challenge', desc: 'Add a TXT record to _acme-challenge.yourdomain — proves ownership per RFC 8555.', color: '#7c3aed' },
  { n: '03', title: 'Download certificates', desc: 'Get cert.pem, key.pem, and fullchain.pem in standard PKI formats.', color: '#059669' },
  { n: '04', title: 'Install and monitor', desc: 'Deploy with our guides, then track expiry in your dashboard.', color: '#d97706' },
]

function useLiveStats() {
  const [certCount, setCertCount] = useState(null)
  useEffect(() => {
    supabase.from('certificates').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setCertCount(count) })
      .catch(() => {})
  }, [])
  return { certCount }
}

const STATS_BASE = [
  { v: '100%', l: 'Free forever', sub: 'No credit card ever', color: '#2563eb' },
  { v: '90d', l: 'Certificate validity', sub: 'Auto-renewal reminders', color: '#7c3aed' },
  { v: '<60s', l: 'Issuance time', sub: 'ACME RFC 8555', color: '#059669' },
  { v: 'A+', l: 'SSL Labs grade', sub: 'TLS 1.3 optimized', color: '#d97706' },
]

const TRUST = ['Nginx', 'Apache', 'cPanel', 'Plesk', 'Node.js', 'Docker', 'Cloudflare', 'Caddy']

export default function Home({ nav }) {
  const { certCount } = useLiveStats()
  const STATS = certCount !== null
    ? [{ v: certCount.toString(), l: 'Certs issued', sub: 'Live & counting', color: '#059669' }, ...STATS_BASE.filter(s => s.l !== 'Issuance time')]
    : STATS_BASE
  return (
    <div style={{background:'#f8fafc',minHeight:'100vh',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* HERO */}
      <section style={{position:'relative',overflow:'hidden',paddingTop:96,paddingBottom:80,background:'linear-gradient(160deg,#eef2ff 0%,#f0fdf4 35%,#fefce8 65%,#fdf4ff 100%)'}}>
        {/* Subtle dot grid */}
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(148,163,184,0.35) 1px,transparent 1px)',backgroundSize:'28px 28px',opacity:0.6}} />
        {/* Top accent bar */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 35%,#059669 65%,#f59e0b 100%)'}} />

        <div style={{position:'relative',maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'white',border:'1.5px solid #bfdbfe',borderRadius:100,padding:'5px 14px',marginBottom:28,boxShadow:'0 2px 8px rgba(37,99,235,0.1)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 0 2px rgba(34,197,94,0.25)'}} />
                <span style={{fontSize:11,fontWeight:700,color:'#1d4ed8',letterSpacing:'0.5px'}}>Enterprise CLM · Let’s Encrypt · 100% Free</span>
              </div>
              <h1 style={{fontSize:54,fontWeight:900,color:'#0f172a',lineHeight:1.06,letterSpacing:'-2.5px',marginBottom:8}}>SSL Certificates</h1>
              <h1 style={{fontSize:54,fontWeight:900,lineHeight:1.06,letterSpacing:'-2.5px',marginBottom:24,background:'linear-gradient(90deg,#2563eb 0%,#7c3aed 50%,#0ea5e9 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>issued in seconds.</h1>
              <p style={{fontSize:16,color:'#475569',lineHeight:1.75,marginBottom:36,maxWidth:440}}>Full-stack certificate lifecycle management — issue, install, monitor and renew trusted DV certificates with zero cost and zero friction.</p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:36}}>
                <button onClick={()=>nav('/generate')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%)',color:'white',border:'none',padding:'13px 24px',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 20px rgba(37,99,235,0.35)',letterSpacing:'-0.2px'}}>
                  Issue Free Certificate <ArrowRight size={14}/>
                </button>
                <button onClick={()=>nav('/dashboard')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#374151',border:'1.5px solid #e2e8f0',padding:'13px 20px',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  Dashboard <ChevronRight size={14}/>
                </button>
              </div>
              <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                {['No registration required','Trusted by all browsers','Let’s Encrypt backed'].map(l=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#64748b',fontWeight:600}}>
                    <CheckCircle size={13} color='#059669'/> {l}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <CertHeroIllustration/>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section style={{background:'white',borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',boxShadow:'0 1px 0 #f1f5f9'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
            {STATS.map(({v,l,sub,color},i)=>(
              <div key={l} style={{padding:'26px 0',textAlign:'center',borderRight:i<3?'1px solid #f1f5f9':'none'}}>
                <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1.5px',lineHeight:1,color:color}}>{v}</div>
                <div style={{fontSize:12,color:'#374151',fontWeight:700,marginTop:5}}>{l}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'96px 0',background:'#f8fafc'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:60}}>
            <div style={{display:'inline-block',fontSize:11,fontWeight:700,color:'#2563eb',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:14,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:100,padding:'5px 16px'}}>Full CLM Platform</div>
            <h2 style={{fontSize:38,fontWeight:900,color:'#0f172a',letterSpacing:'-1px',marginBottom:14,lineHeight:1.1}}>Everything for certificate lifecycle management</h2>
            <p style={{color:'#64748b',fontSize:16,maxWidth:480,margin:'0 auto',lineHeight:1.65}}>From first issuance to renewal, SSLVault covers the complete PKI lifecycle for free.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {FEATURES.map(({icon:Icon,title,desc,color,bg,border})=>(
              <div key={title} style={{background:bg,border:'1.5px solid '+border,borderRadius:18,padding:'28px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:color,opacity:0.06}} />
                <div style={{width:44,height:44,borderRadius:12,background:'white',border:'1.5px solid '+border,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <Icon size={20} color={color} strokeWidth={1.8}/>
                </div>
                <h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:8,letterSpacing:'-0.3px'}}>{title}</h3>
                <p style={{fontSize:13,color:'#475569',lineHeight:1.7}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:'0 0 96px'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'linear-gradient(135deg,#1e1b4b 0%,#1d4ed8 50%,#0369a1 100%)',borderRadius:28,padding:'64px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-60,right:-60,width:280,height:280,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}} />
            <div style={{position:'absolute',bottom:-80,left:-40,width:240,height:240,borderRadius:'50%',background:'rgba(255,255,255,0.03)'}} />
            <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)',backgroundSize:'32px 32px'}} />
            <div style={{textAlign:'center',marginBottom:56,position:'relative'}}>
              <div style={{display:'inline-block',fontSize:11,fontWeight:700,color:'#a5f3fc',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:14,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:100,padding:'5px 16px'}}>4 Simple Steps</div>
              <h2 style={{fontSize:34,fontWeight:900,color:'white',letterSpacing:'-0.8px',marginBottom:12}}>Issue a certificate in minutes</h2>
              <p style={{color:'rgba(255,255,255,0.55)',fontSize:15,maxWidth:400,margin:'0 auto'}}>No accounts required. Works for any publicly accessible domain.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:24,position:'relative'}}>
              <div style={{position:'absolute',top:22,left:'calc(12.5% + 16px)',right:'calc(12.5% + 16px)',height:1,background:'rgba(255,255,255,0.15)',zIndex:0}}/>
              {STEPS.map(({n,title,desc,color})=>(
                <div key={n} style={{textAlign:'center',position:'relative',zIndex:1}}>
                  <div style={{width:46,height:46,borderRadius:'50%',background:'white',color:color,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:13,fontWeight:900,boxShadow:'0 0 0 4px rgba(255,255,255,0.15),0 8px 24px rgba(0,0,0,0.25)'}}>{n}</div>
                  <h4 style={{fontSize:13,fontWeight:700,color:'white',marginBottom:8,letterSpacing:'-0.2px'}}>{title}</h4>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.65}}>{desc}</p>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:52,position:'relative'}}>
              <button onClick={()=>nav('/generate')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#1d4ed8',border:'none',padding:'14px 28px',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 24px rgba(0,0,0,0.2)',letterSpacing:'-0.3px'}}>
                Get Your Free Certificate <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section style={{padding:'0 0 80px'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <p style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'1.8px',textTransform:'uppercase',marginBottom:24}}>Works with every platform</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
            {TRUST.map(t=>(
              <div key={t} style={{background:'white',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 20px',fontSize:13,fontWeight:700,color:'#374151',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'0 0 100px'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'linear-gradient(135deg,#ecfdf5 0%,#eff6ff 50%,#fdf4ff 100%)',border:'1.5px solid #e2e8f0',borderRadius:24,padding:'80px 60px',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-40,left:'50%',transform:'translateX(-50%)',width:400,height:200,background:'radial-gradient(ellipse,rgba(37,99,235,0.08),transparent)',borderRadius:'50%'}} />
            <div style={{width:60,height:60,background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 0 0 8px rgba(37,99,235,0.1),0 8px 32px rgba(37,99,235,0.3)',position:'relative'}}>
              <Shield size={28} color='white'/>
            </div>
            <h2 style={{fontSize:40,fontWeight:900,color:'#0f172a',letterSpacing:'-1.2px',marginBottom:14,position:'relative'}}>Start securing your domains today</h2>
            <p style={{color:'#64748b',fontSize:16,maxWidth:460,margin:'0 auto 36px',lineHeight:1.65,position:'relative'}}>Free TLS certificates for everyone. No credit card. No hidden fees. 100% Let’s Encrypt backed.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',position:'relative'}}>
              <button onClick={()=>nav('/generate')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#1d4ed8,#4f46e5)',color:'white',border:'none',padding:'14px 28px',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(37,99,235,0.35)',letterSpacing:'-0.3px'}}>
                Issue Free Certificate <ArrowRight size={14}/>
              </button>
              <button onClick={()=>nav('/install')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#374151',border:'1.5px solid #e2e8f0',padding:'14px 22px',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                Install Guide <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid #f1f5f9',background:'white',padding:'36px 0 24px'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:32,marginBottom:28}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <div style={{width:28,height:28,background:'linear-gradient(135deg,#1d4ed8,#4f46e5)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(37,99,235,0.3)'}}><Shield size={13} color='white'/></div>
                <span style={{color:'#1e293b',fontSize:14,fontWeight:800}}>SSL<span style={{color:'#2563eb'}}>Vault</span> CLM</span>
              </div>
              <p style={{color:'#94a3b8',fontSize:11,letterSpacing:'0.3px',lineHeight:1.6}}>Powered by Let's Encrypt · ACME RFC 8555 · Free forever</p>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Product</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[['Issue Certificate','/generate'],['Inventory & Monitor','/dashboard'],['DNS Providers','/dns-providers'],['Install Guide','/install']].map(([l,p])=>(
                  <button key={l} onClick={()=>nav(p)} style={{background:'none',border:'none',color:'#64748b',fontSize:12,cursor:'pointer',fontWeight:600,textAlign:'left',padding:0}}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Company</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[['About','/about'],['Developer','/developer'],['Contact','/contact'],['Knowledge Base','/knowledge-base']].map(([l,p])=>(
                  <button key={l} onClick={()=>nav(p)} style={{background:'none',border:'none',color:'#64748b',fontSize:12,cursor:'pointer',fontWeight:600,textAlign:'left',padding:0}}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#0f172a',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Legal</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[['Privacy Policy','/privacy'],['Terms of Service','/terms']].map(([l,p])=>(
                  <button key={l} onClick={()=>nav(p)} style={{background:'none',border:'none',color:'#64748b',fontSize:12,cursor:'pointer',fontWeight:600,textAlign:'left',padding:0}}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{borderTop:'1px solid #f1f5f9',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <p style={{color:'#94a3b8',fontSize:11,letterSpacing:'0.3px'}}>© {new Date().getFullYear()} SSLVault · Built by Mathivanan Kathirvel</p>
            <p style={{color:'#cbd5e1',fontSize:11,letterSpacing:'0.3px'}}>Made with ♥ in the Netherlands</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
