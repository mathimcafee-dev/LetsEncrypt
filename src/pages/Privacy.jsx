import {
  Lock, Database, Mail,
  ArrowRight, Eye, FileText
} from 'lucide-react'

export default function Privacy({ nav }) {
  const bg = 'linear-gradient(160deg,#eef2ff,rgba(0,119,182,0.09) 35%,#fefce8 65%,#fdf4ff)'
  const updated = 'May 9, 2026'

  return (
    <div style={{minHeight:'100vh',background:bg,position:'relative'}}>
      

      {/* HERO */}
      <section style={{position:'relative',padding:'70px 0 30px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid rgba(0,0,0,0.08)',padding:'6px 14px',borderRadius:999,marginBottom:24,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#f0f4fa',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#333333',letterSpacing:'0.4px',textTransform:'uppercase'}}>Privacy Policy</span>
          </div>
          <h1 style={{fontFamily:'Georgia, serif',fontSize:'clamp(36px,5vw,56px)',fontWeight:800,letterSpacing:'-1.6px',lineHeight:1.05,marginBottom:16,color:'#111111'}}>
            Your data,<br/>
            <span style={{background:'linear-gradient(135deg,#2a6b5c,#f07059,#2a6b5c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>your control.</span>
          </h1>
          <p style={{fontSize:15,color:'#333333',marginTop:14}}>Last updated: <strong style={{color:'#111111'}}>{updated}</strong></p>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section style={{position:'relative',padding:'30px 0 50px'}}>
        <div style={{maxWidth:1080,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
            {[
              {icon:Lock,title:'Private keys stay yours',desc:'When you use the persistent agent, private keys are generated and stored on your server. We never see them.',color:'#111111',bg:'transparent'},
              {icon:Database,title:'Minimum metadata',desc:'We store only what\'s required to issue and renew certificates: domain, expiry, owner email.',color:'#111111',bg:'rgba(0,119,182,0.09)'},
              {icon:Eye,title:'No tracking',desc:'No third-party analytics, no advertising pixels, no behavioural profiling.',color:'#111111',bg:'#ede9fe'},
              {icon:Mail,title:'Email only for service',desc:'Renewal alerts, account notices. No marketing. No newsletters you didn\'t subscribe to.',color:'#111111',bg:'rgba(239,68,68,0.08)'},
            ].map(({icon:Icon,title,desc,color,bg})=>(
              <div key={title} style={{background:'transparent',borderRadius:16,padding:'22px 22px',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 10px rgba(15,23,42,0.04)'}}>
                <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                  <Icon size={18} color={color}/>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:'#111111',marginBottom:6,letterSpacing:'-0.2px'}}>{title}</div>
                <div style={{fontSize:12,color:'#333333',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILED POLICY */}
      <section style={{position:'relative',padding:'30px 0 80px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'transparent',borderRadius:24,padding:'clamp(16px,16vw,48px) clamp(14px,16vw,50px)',boxShadow:'0 4px 24px rgba(15,23,42,0.06)',border:'1px solid rgba(0,0,0,0.08)'}}>

            <Section title='1. Who we are'>
              SSLVault (also operated under the names FreeEncryption and EasySecurity) is a personal,
              independent project run by Mathivanan Kathirvel from the Netherlands. There is no parent
              company, no investors, and no third-party data buyers.
            </Section>

            <Section title='2. What we collect'>
              <p style={p}><strong>Account information:</strong> email address, hashed password (handled by Supabase Auth), and account creation timestamp.</p>
              <p style={p}><strong>Certificate metadata:</strong> domain names you request certificates for, expiry dates, the certificate authority (Let's Encrypt), and renewal status.</p>
              <p style={p}><strong>Private keys — Free plan:</strong> when you issue a certificate, the private key is stored temporarily to enable agent-based installation. It is protected by row-level security, transmitted only over HTTPS, and never logged. You can permanently delete it from our servers at any time from your Dashboard once installation is complete.</p>
              <p style={p}><strong>Private keys:</strong> when stored server-side, private keys are encrypted using AES-256-GCM before storage. Keys are only retained when required for agent-based auto-install, and users may delete the server-side copy at any time from the dashboard. SSLVault recommends deleting the server-side key copy after successful installation.</p>
              <p style={p}><strong>DNS provider credentials:</strong> if you connect a DNS provider for auto-renewal, API tokens are stored encrypted and used only to add/remove DNS challenge records.</p>
              <p style={p}><strong>Server credentials (optional):</strong> cPanel, SSH, or Plesk credentials you choose to save in the Server Vault are encrypted at rest.</p>
              <p style={p}><strong>Operational logs:</strong> renewal events, agent heartbeats, and error traces — used to debug and to send you renewal notifications.</p>
            </Section>

            <Section title='3. What we do not collect'>
              <p style={p}>We do not collect: behavioural analytics, advertising identifiers, browsing history, third-party cookies, biometric data, payment information (the service is free), or your private keys when you use the persistent agent.</p>
            </Section>

            <Section title='4. How we use your data'>
              <p style={p}>Your data is used exclusively to:</p>
              <ul style={ul}>
                <li>Issue and renew TLS certificates from Let's Encrypt on your behalf</li>
                <li>Send transactional email about renewal success, failure, or required action</li>
                <li>Display your certificate inventory and monitoring data inside the dashboard</li>
                <li>Debug and operate the service</li>
              </ul>
              <p style={p}>We do not sell, rent, or share your data with marketers or data brokers. Period.</p>
            </Section>

            <Section title='5. Where your data lives'>
              <p style={p}>Application data is stored in Supabase (Postgres) hosted in the AP-Northeast-2 region. The web frontend is served by Vercel (global edge network). Transactional email is delivered via Resend. Each of these vendors is bound by their own privacy and security commitments.</p>
            </Section>

            <Section title="6. Let's Encrypt">
              <p style={p}>Certificate issuance happens through Let's Encrypt's ACME API. The domain you request, plus the public certificate, is logged in <strong>public Certificate Transparency logs</strong> as required by the WebPKI ecosystem. This is industry-standard and applies to every CA, not just Let's Encrypt.</p>
            </Section>

            <Section title='7. Your rights'>
              <p style={p}>You can:</p>
              <ul style={ul}>
                <li>Export all your data — email <a href='mailto:mathimcafee@gmail.com' style={a}>mathimcafee@gmail.com</a></li>
                <li>Delete your account and all associated certificates from the dashboard</li>
                <li>Disconnect any DNS provider or saved credential at any time</li>
                <li>Object to any specific processing — just ask</li>
              </ul>
              <p style={p}>If you're in the EU/EEA, GDPR Articles 15–22 apply. If you're elsewhere, we'll honour the same rights regardless.</p>
            </Section>

            <Section title='8. Security'>
              <p style={p}>Database access uses Postgres row-level security so users can only see their own rows. Sensitive credentials are encrypted at rest. The codebase is open source and auditable. Despite all best efforts, no system is immune to compromise — if we ever detect a breach affecting your data, we'll notify you within 72 hours.</p>
            </Section>

            <Section title='9. Cookies'>
              <p style={p}>We use a session cookie set by Supabase Auth so you stay logged in. That's it. No tracking cookies, no advertising cookies.</p>
            </Section>

            <Section title='10. Changes to this policy'>
              <p style={p}>If we change this policy materially, we'll update the date at the top and email account holders. Old versions are kept in version control on GitHub for transparency.</p>
            </Section>

            <Section title='11. Contact' last>
              <p style={p}>Questions about privacy? Email <a href='mailto:mathimcafee@gmail.com' style={a}>mathimcafee@gmail.com</a> and you'll hear back within a couple of days.</p>
            </Section>
          </div>
        </div>
      </section>

      {/* FOOTER LINKS */}
      <section style={{position:'relative',padding:'0 0 80px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px',display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>nav('/terms')} style={{background:'transparent',color:'#111111',border:'1.5px solid rgba(0,0,0,0.08)',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}>
            <FileText size={14}/> Terms of Service
          </button>
          <button onClick={()=>nav('/contact')} style={{background:'#f0f4fa',color:'#111111',border:'none',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}>
            <Mail size={14}/> Contact us <ArrowRight size={13}/>
          </button>
        </div>
      </section>
    </div>
  )
}

const p = {fontSize:14,color:'#333333',lineHeight:1.75,marginBottom:12}
const ul = {fontSize:14,color:'#333333',lineHeight:1.85,paddingLeft:22,marginBottom:14}
const a = {color:'#111111',fontWeight:700,textDecoration:'none'}

function Section({title, children, last}) {
  return (
    <div style={{paddingBottom:last?0:28,marginBottom:last?0:24,borderBottom:last?'none':'1px dashed rgba(0,0,0,0.08)'}}>
      <h3 style={{fontFamily:'Georgia, serif',fontSize:20,fontWeight:800,color:'#111111',letterSpacing:'-0.4px',marginBottom:14}}>{title}</h3>
      {typeof children === 'string' ? <p style={p}>{children}</p> : children}
    </div>
  )
}
