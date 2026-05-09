import { Shield, Lock, Zap, Globe, CheckCircle, ArrowRight, Heart, Server, RefreshCw, Eye } from 'lucide-react'

export default function About({ nav }) {
  const bg = 'linear-gradient(160deg,#eef2ff,#f0fdf4 35%,#fefce8 65%,#fdf4ff)'

  return (
    <div style={{minHeight:'100vh',background:bg,position:'relative'}}>
      {/* Dot overlay */}
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(15,23,42,0.04) 1px, transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'}}/>

      {/* HERO */}
      <section style={{position:'relative',padding:'80px 0 60px'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',border:'1px solid #e2e8f0',padding:'6px 14px',borderRadius:999,marginBottom:24,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#475569',letterSpacing:'0.4px',textTransform:'uppercase'}}>About SSLVault</span>
          </div>
          <h1 style={{fontFamily:'Georgia, "Times New Roman", serif',fontSize:'clamp(40px,6vw,68px)',fontWeight:800,letterSpacing:'-2px',lineHeight:1.05,marginBottom:20,color:'#0f172a'}}>
            Free SSL,<br/>
            <span style={{background:'linear-gradient(135deg,#2563eb,#7c3aed,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>made simple for everyone.</span>
          </h1>
          <p style={{fontSize:18,color:'#475569',lineHeight:1.7,maxWidth:680,margin:'0 auto'}}>
            SSLVault is a certificate lifecycle management platform built on Let's Encrypt.
            We issue, install, monitor, and auto-renew TLS certificates so the web stays
            encrypted — without paywalls, without complexity.
          </p>
        </div>
      </section>

      {/* MISSION */}
      <section style={{position:'relative',padding:'40px 0'}}>
        <div style={{maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'white',borderRadius:20,padding:'48px 52px',boxShadow:'0 4px 24px rgba(15,23,42,0.06)',border:'1px solid #e2e8f0',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.08),transparent 70%)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,position:'relative'}}>
              <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(124,58,237,0.3)'}}>
                <Heart size={22} color='white' strokeWidth={2}/>
              </div>
              <div style={{fontSize:11,fontWeight:800,color:'#7c3aed',letterSpacing:'1.4px',textTransform:'uppercase'}}>Our Mission</div>
            </div>
            <p style={{fontSize:20,color:'#0f172a',lineHeight:1.6,fontWeight:500,maxWidth:720,position:'relative'}}>
              The web should be encrypted by default. Certificate authorities once charged hundreds
              per year for what is now provided free by Let's Encrypt — yet the operational burden
              of installing, configuring, and renewing those certificates still pushes site owners
              away from HTTPS. SSLVault closes that gap.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section style={{position:'relative',padding:'60px 0'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:42,fontWeight:800,color:'#0f172a',letterSpacing:'-1px',marginBottom:14}}>What SSLVault does</h2>
            <p style={{fontSize:16,color:'#64748b',maxWidth:560,margin:'0 auto'}}>Four jobs, every one of them automated.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:18}}>
            {[
              {icon:Shield,title:'Issue',desc:'ACME-protocol certificates from Let\'s Encrypt — wildcard or single domain — in under 60 seconds.',color:'#2563eb',bg:'#dbeafe'},
              {icon:Server,title:'Install',desc:'Zero-touch deployment to Nginx, Apache, cPanel, Plesk, or any server via the persistent agent.',color:'#059669',bg:'#d1fae5'},
              {icon:Eye,title:'Monitor',desc:'Continuous expiry tracking, public scanner, and CT-log discovery for shadow certificates.',color:'#d97706',bg:'#fef3c7'},
              {icon:RefreshCw,title:'Renew',desc:'Automatic 30-day-pre-expiry renewal with email alerts and exponential backoff on failure.',color:'#7c3aed',bg:'#ede9fe'},
            ].map(({icon:Icon,title,desc,color,bg})=>(
              <div key={title} style={{background:'white',borderRadius:20,padding:'28px 24px',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(15,23,42,0.04)',transition:'transform 0.2s, box-shadow 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(15,23,42,0.08)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(15,23,42,0.04)'}}>
                <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                  <Icon size={20} color={color} strokeWidth={2}/>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:8,letterSpacing:'-0.3px'}}>{title}</div>
                <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section style={{position:'relative',padding:'60px 0'}}>
        <div style={{maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:42,fontWeight:800,color:'#0f172a',letterSpacing:'-1px',marginBottom:14}}>What we believe</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18}}>
            {[
              {n:'01',title:'Free, always',body:'No upgrade tier hides core features. Certificates, monitoring, agents, and renewals are free for every user, every domain.',accent:'#0ea5e9'},
              {n:'02',title:'Privacy by design',body:'Your private keys never leave your server when using the agent. We log only the metadata required to renew.',accent:'#10b981'},
              {n:'03',title:'Open standards',body:'Built on RFC 8555 (ACME), Let\'s Encrypt, and CT logs. No proprietary protocols, no vendor lock-in.',accent:'#f59e0b'},
              {n:'04',title:'Transparency',body:'Source code is open. Renewal events are logged. You can audit every action SSLVault takes on your behalf.',accent:'#a855f7'},
            ].map(({n,title,body,accent})=>(
              <div key={n} style={{background:'white',borderRadius:18,padding:'28px 26px',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(15,23,42,0.04)',position:'relative'}}>
                <div style={{fontSize:34,fontFamily:'Georgia, serif',fontWeight:700,color:accent,opacity:0.5,letterSpacing:'-1px',marginBottom:8}}>{n}</div>
                <div style={{fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:8,letterSpacing:'-0.3px'}}>{title}</div>
                <div style={{fontSize:13,color:'#64748b',lineHeight:1.65}}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section style={{position:'relative',padding:'60px 0 80px'}}>
        <div style={{maxWidth:980,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'#0f172a',borderRadius:24,padding:'56px 48px',position:'relative',overflow:'hidden',boxShadow:'0 20px 60px rgba(15,23,42,0.25)'}}>
            <div style={{position:'absolute',top:'-50%',left:'-20%',width:500,height:500,background:'radial-gradient(circle,rgba(37,99,235,0.25),transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:'-40%',right:'-15%',width:420,height:420,background:'radial-gradient(circle,rgba(168,85,247,0.18),transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#60a5fa',letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:14}}>Powered by</div>
                <h3 style={{fontFamily:'Georgia, serif',fontSize:32,fontWeight:800,color:'white',letterSpacing:'-0.8px',marginBottom:16,lineHeight:1.15}}>Open infrastructure, end to end.</h3>
                <p style={{fontSize:14,color:'#94a3b8',lineHeight:1.7}}>SSLVault is built on a stack of open standards and trusted services. No black boxes, no proprietary CAs.</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {label:"Let's Encrypt",sub:'Certificate Authority'},
                  {label:'ACME RFC 8555',sub:'Issuance Protocol'},
                  {label:'React + Vite',sub:'Frontend'},
                  {label:'Supabase',sub:'Backend & DB'},
                  {label:'Vercel',sub:'Edge Hosting'},
                  {label:'systemd + bash',sub:'VPS Agent'},
                ].map(({label,sub})=>(
                  <div key={label} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'14px 16px'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'white',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:10,color:'#64748b',letterSpacing:'0.3px',textTransform:'uppercase',fontWeight:600}}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{position:'relative',padding:'0 0 100px'}}>
        <div style={{maxWidth:880,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <h2 style={{fontFamily:'Georgia, serif',fontSize:36,fontWeight:800,color:'#0f172a',letterSpacing:'-1px',marginBottom:16}}>Ready to secure a domain?</h2>
          <p style={{fontSize:15,color:'#64748b',marginBottom:30}}>Issue a free certificate in under a minute.</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>nav('/generate')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'#0f172a',color:'white',border:'none',padding:'14px 28px',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(15,23,42,0.25)'}}>
              Issue Certificate <ArrowRight size={14}/>
            </button>
            <button onClick={()=>nav('/developer')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#0f172a',border:'1.5px solid #e2e8f0',padding:'14px 24px',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Meet the developer
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
