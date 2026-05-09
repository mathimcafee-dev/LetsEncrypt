import { Mail, ArrowRight, Globe, Clock } from 'lucide-react'

export default function Contact({ nav }) {
  const bg = 'linear-gradient(160deg,#eef2ff,#f0fdf4 35%,#fefce8 65%,#fdf4ff)'
  const email = 'mathimcafee@gmail.com'

  return (
    <div style={{minHeight:'100vh',background:bg,position:'relative'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(15,23,42,0.04) 1px, transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'}}/>

      {/* HERO */}
      <section style={{position:'relative',padding:'80px 0 40px'}}>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',border:'1px solid #e2e8f0',padding:'6px 14px',borderRadius:999,marginBottom:24,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#475569',letterSpacing:'0.4px',textTransform:'uppercase'}}>Get in touch</span>
          </div>
          <h1 style={{fontFamily:'Georgia, serif',fontSize:'clamp(40px,6vw,64px)',fontWeight:800,letterSpacing:'-2px',lineHeight:1.05,marginBottom:18,color:'#0f172a'}}>
            Have a question?<br/>
            <span style={{background:'linear-gradient(135deg,#2563eb,#7c3aed,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Drop us a line.</span>
          </h1>
          <p style={{fontSize:17,color:'#475569',lineHeight:1.7,maxWidth:580,margin:'0 auto'}}>
            Bug reports, feature requests, partnership ideas, or just saying hi — every email gets read.
          </p>
        </div>
      </section>

      {/* EMAIL CARD */}
      <section style={{position:'relative',padding:'40px 0 60px'}}>
        <div style={{maxWidth:680,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'white',borderRadius:24,padding:'48px 44px',boxShadow:'0 8px 32px rgba(15,23,42,0.08)',border:'1px solid #e2e8f0',position:'relative',overflow:'hidden',textAlign:'center'}}>
            <div style={{position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:400,height:200,background:'radial-gradient(ellipse,rgba(37,99,235,0.1),transparent 70%)',pointerEvents:'none'}}/>

            <div style={{position:'relative',width:72,height:72,margin:'0 auto 24px',borderRadius:20,background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 8px rgba(37,99,235,0.08),0 12px 32px rgba(37,99,235,0.3)'}}>
              <Mail size={32} color='white' strokeWidth={1.8}/>
            </div>

            <div style={{position:'relative',fontSize:11,fontWeight:800,color:'#7c3aed',letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:10}}>Email</div>
            <a href={`mailto:${email}`} style={{display:'inline-block',position:'relative',fontFamily:'Georgia, serif',fontSize:'clamp(22px,3.4vw,32px)',fontWeight:700,color:'#0f172a',letterSpacing:'-0.5px',textDecoration:'none',marginBottom:24,wordBreak:'break-all'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#2563eb'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#0f172a'}}>
              {email}
            </a>

            <div style={{position:'relative',marginTop:8}}>
              <a href={`mailto:${email}`} style={{display:'inline-flex',alignItems:'center',gap:8,background:'#0f172a',color:'white',padding:'14px 28px',borderRadius:12,fontSize:14,fontWeight:800,textDecoration:'none',boxShadow:'0 4px 20px rgba(15,23,42,0.25)',transition:'transform 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                Compose email <ArrowRight size={14}/>
              </a>
            </div>

            <div style={{position:'relative',marginTop:32,paddingTop:24,borderTop:'1px dashed #e2e8f0',display:'flex',justifyContent:'center',gap:32,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,color:'#64748b',fontSize:12}}>
                <Clock size={13}/>
                <span style={{fontWeight:600}}>Reply within 1–2 days</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,color:'#64748b',fontSize:12}}>
                <Globe size={13}/>
                <span style={{fontWeight:600}}>English · Tamil · Dutch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT TO INCLUDE */}
      <section style={{position:'relative',padding:'40px 0 80px'}}>
        <div style={{maxWidth:980,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:36}}>
            <h2 style={{fontFamily:'Georgia, serif',fontSize:32,fontWeight:800,color:'#0f172a',letterSpacing:'-0.8px',marginBottom:10}}>What to include</h2>
            <p style={{fontSize:14,color:'#64748b'}}>To help us help you faster.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
            {[
              {label:'Bug reports',body:'Domain affected, browser/OS, exact error message, and steps to reproduce.',color:'#dc2626',bg:'#fee2e2'},
              {label:'Feature requests',body:'What you\'re trying to accomplish, how SSLVault falls short today, and the ideal outcome.',color:'#0ea5e9',bg:'#e0f2fe'},
              {label:'Account help',body:'The email tied to your account and a description of what you\'re stuck on. Never share passwords or API tokens.',color:'#059669',bg:'#d1fae5'},
              {label:'Partnerships',body:'Who you are, what you\'re building, and how SSLVault might fit into the picture.',color:'#7c3aed',bg:'#ede9fe'},
            ].map(({label,body,color,bg})=>(
              <div key={label} style={{background:'white',borderRadius:16,padding:'22px 22px',border:'1px solid #e2e8f0',boxShadow:'0 2px 10px rgba(15,23,42,0.04)'}}>
                <div style={{display:'inline-block',background:bg,color,padding:'4px 11px',borderRadius:8,fontSize:10,fontWeight:800,letterSpacing:'0.5px',textTransform:'uppercase',marginBottom:12}}>{label}</div>
                <div style={{fontSize:13,color:'#475569',lineHeight:1.65}}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER LINKS */}
      <section style={{position:'relative',padding:'0 0 100px'}}>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'#0f172a',borderRadius:20,padding:'36px 36px',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flexWrap:'wrap'}}>
            <div style={{position:'absolute',top:'-50%',right:'-10%',width:300,height:300,background:'radial-gradient(circle,rgba(124,58,237,0.2),transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'relative'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#a78bfa',letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:8}}>Self-serve first</div>
              <div style={{fontSize:18,fontWeight:800,color:'white',letterSpacing:'-0.3px',marginBottom:4}}>Most answers live in the Knowledge Base.</div>
              <div style={{fontSize:13,color:'#94a3b8'}}>Setup, troubleshooting, FAQs — all there.</div>
            </div>
            <button onClick={()=>nav('/knowledge-base')} style={{position:'relative',display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#0f172a',border:'none',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 14px rgba(255,255,255,0.15)'}}>
              Browse docs <ArrowRight size={13}/>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
