export default function Home({ nav }) {
  return (
    <div>
      <section style={{padding:'100px 0 80px',textAlign:'center',position:'relative'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,background:'radial-gradient(circle,rgba(56,189,248,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div className="container">
          <div style={{marginBottom:24}}><span className="badge badge-blue">⚡ Powered by Let's Encrypt</span></div>
          <h1 style={{fontSize:'clamp(48px,8vw,80px)',fontWeight:800,lineHeight:1.05,letterSpacing:'-2px',marginBottom:24}}>Free SSL Certificates<br/><span style={{color:'var(--accent)'}}>Done Right.</span></h1>
          <p style={{fontSize:18,color:'var(--text2)',maxWidth:520,margin:'0 auto 40px',lineHeight:1.7}}>Generate, manage and monitor free 90-day SSL certificates. DNS-01 validation with wildcard support. Zero cost, forever.</p>
          <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>nav('generate')} className="btn btn-primary btn-lg">Generate Free SSL →</button>
            <button onClick={()=>nav('auth')} className="btn btn-secondary btn-lg">Sign In to Dashboard</button>
          </div>
          <div style={{display:'flex',gap:32,justifyContent:'center',marginTop:56,flexWrap:'wrap'}}>
            {['90-day validity','Wildcard support','DNS-01 validation','Free forever'].map(t=>(
              <div key={t} style={{display:'flex',alignItems:'center',gap:8,color:'var(--text3)',fontSize:13,fontWeight:600}}>✅ {t}</div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:'40px 0 80px'}}>
        <div className="container">
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontSize:32,fontWeight:800,letterSpacing:'-1px',marginBottom:12}}>How It Works</h2>
            <p style={{color:'var(--text2)'}}>4 simple steps to get your certificate</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
            {[['01','Enter Domain','Type your domain name'],['02','Add DNS Record','Add a TXT record to prove ownership'],['03','Verify & Issue','We verify DNS and issue the cert'],['04','Download','Get your certificate files']].map(([n,t,d])=>(
              <div key={n} className="card" style={{textAlign:'center'}}>
                <div style={{fontFamily:'var(--mono)',fontSize:48,fontWeight:300,color:'rgba(56,189,248,0.15)',marginBottom:16,lineHeight:1}}>{n}</div>
                <h3 style={{fontWeight:700,fontSize:16,marginBottom:8}}>{t}</h3>
                <p style={{color:'var(--text3)',fontSize:13,lineHeight:1.6}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
