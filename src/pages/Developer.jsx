import { Mail, MapPin, ArrowRight, Award, Briefcase, Code2, Server, Globe, BookOpen, ExternalLink } from 'lucide-react'
import portrait from '../assets/mathi-portrait.jpg'

function Github({size=14, color='currentColor'}) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill={color} aria-hidden='true'>
      <path d='M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2.07c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.97 10.97 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z'/>
    </svg>
  )
}

export default function Developer({ nav }) {
  const bg = 'linear-gradient(160deg,#eef2ff,#f0fdf4 35%,#fefce8 65%,#fdf4ff)'

  return (
    <div style={{minHeight:'100vh',background:bg,position:'relative'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(15,23,42,0.04) 1px, transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'}}/>

      {/* HERO */}
      <section style={{position:'relative',padding:'70px 0 50px'}}>
        <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',border:'1px solid #e2e8f0',padding:'6px 14px',borderRadius:999,marginBottom:28,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#475569',letterSpacing:'0.4px',textTransform:'uppercase'}}>Meet the Developer</span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'minmax(0, 1.4fr) minmax(280px, 1fr)',gap:48,alignItems:'center'}}>
            {/* TEXT SIDE */}
            <div>
              <h1 style={{fontFamily:'Georgia, serif',fontSize:'clamp(38px,5.5vw,60px)',fontWeight:800,letterSpacing:'-1.8px',lineHeight:1.05,marginBottom:18,color:'#0f172a'}}>
                Mathivanan<br/>
                <span style={{background:'linear-gradient(135deg,#2563eb,#7c3aed,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Kathirvel.</span>
              </h1>
              <div style={{fontSize:18,color:'#475569',fontWeight:600,marginBottom:18,letterSpacing:'-0.2px'}}>
                Identity & access engineer · Independent builder
              </div>
              <p style={{fontSize:15,color:'#475569',lineHeight:1.75,marginBottom:24,maxWidth:580}}>
                I build SSLVault solo — a free certificate lifecycle platform on top of Let's Encrypt.
                My day job is privileged access management; nights and weekends I write code that makes
                infrastructure easier for the people who can't afford enterprise tools.
              </p>
              <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap',marginBottom:28}}>
                <div style={{display:'flex',alignItems:'center',gap:7,color:'#64748b',fontSize:13,fontWeight:600}}>
                  <MapPin size={14}/> Netherlands
                </div>
                <div style={{display:'flex',alignItems:'center',gap:7,color:'#64748b',fontSize:13,fontWeight:600}}>
                  <Briefcase size={14}/> Open to collaborations
                </div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <a href='mailto:mathimcafee@gmail.com' style={{display:'inline-flex',alignItems:'center',gap:8,background:'#0f172a',color:'white',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none',boxShadow:'0 4px 16px rgba(15,23,42,0.25)'}}>
                  <Mail size={14}/> Email me
                </a>
                <a href='https://github.com/mathimcafee-dev' target='_blank' rel='noreferrer' style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#0f172a',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none',border:'1.5px solid #e2e8f0'}}>
                  <Github size={14}/> GitHub
                </a>
              </div>
            </div>

            {/* PHOTO SIDE */}
            <div style={{position:'relative',display:'flex',justifyContent:'center'}}>
              {/* glow blobs */}
              <div style={{position:'absolute',width:340,height:340,borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,0.18),transparent 70%)',top:'10%',left:'-10%',filter:'blur(28px)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.18),transparent 70%)',bottom:'5%',right:'-5%',filter:'blur(24px)',pointerEvents:'none'}}/>

              <div style={{position:'relative',width:'100%',maxWidth:340}}>
                {/* Photo card */}
                <div style={{position:'relative',aspectRatio:'1/1',borderRadius:24,overflow:'hidden',boxShadow:'0 20px 60px rgba(15,23,42,0.18),0 0 0 1px rgba(15,23,42,0.05)',background:'white'}}>
                  <img src={portrait} alt='Mathivanan Kathirvel' style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                  {/* gradient overlay at bottom */}
                  <div style={{position:'absolute',inset:'auto 0 0 0',height:'40%',background:'linear-gradient(to top,rgba(15,23,42,0.6),transparent)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:18,bottom:16,color:'white'}}>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:'1.2px',textTransform:'uppercase',opacity:0.85,marginBottom:3}}>Founder · Engineer</div>
                    <div style={{fontFamily:'Georgia, serif',fontSize:18,fontWeight:700,letterSpacing:'-0.3px'}}>Mathivanan</div>
                  </div>
                </div>
                {/* floating badge */}
                <div style={{position:'absolute',top:-14,right:-14,background:'white',borderRadius:14,padding:'10px 14px',boxShadow:'0 8px 24px rgba(15,23,42,0.12)',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Award size={14} color='white'/>
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:800,color:'#94a3b8',letterSpacing:'0.6px',textTransform:'uppercase'}}>Certified</div>
                    <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>PAM DigiCert</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CREDENTIALS */}
      <section style={{position:'relative',padding:'40px 0'}}>
        <div style={{maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
            {[
              {icon:Award,label:'Education',value:'MSc, Kongu Engineering College',color:'#2563eb',bg:'#dbeafe'},
              {icon:Award,label:'Certification',value:'PAM DigiCert',color:'#059669',bg:'#d1fae5'},
              {icon:Briefcase,label:'Specialty',value:'Identity & PAM',color:'#d97706',bg:'#fef3c7'},
              {icon:Code2,label:'Side projects',value:'2 active builds',color:'#7c3aed',bg:'#ede9fe'},
            ].map(({icon:Icon,label,value,color,bg})=>(
              <div key={label} style={{background:'white',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14,boxShadow:'0 2px 10px rgba(15,23,42,0.04)'}}>
                <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon size={17} color={color}/>
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:9,fontWeight:800,color:'#94a3b8',letterSpacing:'0.7px',textTransform:'uppercase',marginBottom:2}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',letterSpacing:'-0.2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY */}
      <section style={{position:'relative',padding:'60px 0'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'white',borderRadius:24,padding:'48px 50px',boxShadow:'0 4px 24px rgba(15,23,42,0.06)',border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#7c3aed',letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:16}}>Why SSLVault</div>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:32,fontWeight:800,color:'#0f172a',letterSpacing:'-0.8px',marginBottom:20,lineHeight:1.2}}>The story behind it.</h2>
            <div style={{fontSize:15,color:'#475569',lineHeight:1.85}}>
              <p style={{marginBottom:16}}>
                I'm a PKI person at heart. Identity, trust, and the cryptographic plumbing that holds the
                modern internet together — that's the work I love. By day I get to do this professionally,
                helping organisations design and operate certificate lifecycle management at scale.
                The deeper I go, the more convinced I am that PKI done well is one of the highest-leverage
                things in security.
              </p>
              <p style={{marginBottom:16}}>
                Outside of work hours, I wanted to give something back to the community that taught me
                this craft. Let's Encrypt made certificates free a decade ago — a remarkable gift to
                the open web. But the lifecycle around them — installation, monitoring, renewal across
                heterogeneous infrastructure — still trips up the people who can least afford to think
                about it: the indie developer, the small business, the non-profit running on a donated VPS.
              </p>
              <p style={{marginBottom:16}}>
                SSLVault is my way of closing that gap. A free, open CLM platform that takes the principles
                I work with every day — automated discovery, scheduled renewal, agent-based deployment,
                visibility into every certificate you own — and puts them in the hands of anyone with a
                domain, no matter their budget.
              </p>
              <p>
                It's built in public, runs on open standards, and will stay free. If it helps even a few
                more sites stay encrypted without breaking, that's the whole reward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section style={{position:'relative',padding:'40px 0'}}>
        <div style={{maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:36}}>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:32,fontWeight:800,color:'#0f172a',letterSpacing:'-0.8px',marginBottom:10}}>What I work with</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
            {[
              {icon:Server,title:'Infrastructure',items:['Linux · systemd','Nginx · Apache','Docker · Vercel','cPanel · Plesk'],color:'#2563eb',bg:'#dbeafe'},
              {icon:Code2,title:'Frontend',items:['React 18','Vite','Tailwind / inline CSS','Lucide icons'],color:'#0ea5e9',bg:'#e0f2fe'},
              {icon:Globe,title:'Backend',items:['Supabase','Postgres + RLS','Edge Functions','Resend (email)'],color:'#059669',bg:'#d1fae5'},
              {icon:BookOpen,title:'Security',items:['ACME / RFC 8555','PKI · X.509','PAM','OAuth · OIDC'],color:'#d97706',bg:'#fef3c7'},
            ].map(({icon:Icon,title,items,color,bg})=>(
              <div key={title} style={{background:'white',borderRadius:18,padding:'26px 22px',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(15,23,42,0.04)'}}>
                <div style={{width:42,height:42,borderRadius:11,background:bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
                  <Icon size={20} color={color}/>
                </div>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:10,letterSpacing:'-0.2px'}}>{title}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {items.map(item=>(
                    <div key={item} style={{fontSize:12,color:'#64748b',fontWeight:600}}>{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER PROJECTS */}
      <section style={{position:'relative',padding:'60px 0'}}>
        <div style={{maxWidth:1000,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:36}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0ea5e9',letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:10}}>Also building</div>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:32,fontWeight:800,color:'#0f172a',letterSpacing:'-0.8px'}}>Other projects</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18}}>
            <a href='https://tamil-dutch.vercel.app' target='_blank' rel='noreferrer' style={{textDecoration:'none',background:'white',borderRadius:20,padding:'28px 28px',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(15,23,42,0.04)',display:'block',transition:'transform 0.2s, box-shadow 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 28px rgba(15,23,42,0.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(15,23,42,0.04)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{display:'flex',gap:4}}>
                  <div style={{width:22,height:22,borderRadius:5,background:'linear-gradient(135deg,#0d9488,#14b8a6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>🇮🇳</div>
                  <div style={{width:22,height:22,borderRadius:5,background:'linear-gradient(135deg,#ea580c,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>🇳🇱</div>
                </div>
                <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'0.6px',textTransform:'uppercase'}}>Heritage · Active</div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#0f172a',letterSpacing:'-0.3px',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                Tamil-Dutch Heritage <ExternalLink size={14} color='#94a3b8'/>
              </div>
              <div style={{fontSize:13,color:'#64748b',lineHeight:1.6,marginBottom:12}}>
                400 years of shared history between Tamil Nadu and the Netherlands. Includes the first complete
                Dutch translation of all 1,330 Thirukkurals.
              </div>
              <div style={{fontSize:11,color:'#0d9488',fontWeight:700}}>tamil-dutch.vercel.app</div>
            </a>

            <div style={{background:'white',borderRadius:20,padding:'28px 28px',border:'1px solid #e2e8f0',boxShadow:'0 2px 12px rgba(15,23,42,0.04)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(37,99,235,0.3)'}}>
                  <Server size={14} color='white'/>
                </div>
                <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',letterSpacing:'0.6px',textTransform:'uppercase'}}>Infrastructure · Active</div>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:'#0f172a',letterSpacing:'-0.3px',marginBottom:8}}>SSLVault (this site)</div>
              <div style={{fontSize:13,color:'#64748b',lineHeight:1.6,marginBottom:12}}>
                Free certificate lifecycle management on Let's Encrypt. Issue, install, monitor, and auto-renew TLS certificates with zero-touch agents.
              </div>
              <div style={{fontSize:11,color:'#2563eb',fontWeight:700}}>easysecurity.in</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{position:'relative',padding:'60px 0 100px'}}>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'#0f172a',borderRadius:24,padding:'48px 44px',position:'relative',overflow:'hidden',textAlign:'center'}}>
            <div style={{position:'absolute',top:'-50%',left:'-20%',width:500,height:500,background:'radial-gradient(circle,rgba(37,99,235,0.25),transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:'-40%',right:'-15%',width:420,height:420,background:'radial-gradient(circle,rgba(168,85,247,0.18),transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'relative'}}>
              <h2 style={{fontFamily:'Georgia, serif',fontSize:30,fontWeight:800,color:'white',letterSpacing:'-0.7px',marginBottom:14}}>Got an idea or a problem to solve?</h2>
              <p style={{fontSize:14,color:'#94a3b8',marginBottom:24,maxWidth:480,margin:'0 auto 24px',lineHeight:1.7}}>
                I'm always up for a good infrastructure conversation. Drop me a line.
              </p>
              <a href='mailto:mathimcafee@gmail.com' style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#0f172a',padding:'13px 26px',borderRadius:10,fontSize:13,fontWeight:800,textDecoration:'none'}}>
                Get in touch <ArrowRight size={14}/>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
