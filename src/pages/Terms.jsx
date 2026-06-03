import {
  AlertTriangle, Mail, ArrowRight,
  Shield
} from 'lucide-react'

export default function Terms({ nav }) {
  const bg = 'linear-gradient(160deg,#eef2ff,rgba(31,92,78,0.09) 35%,#fefce8 65%,#fdf4ff)'
  const updated = 'May 9, 2026'

  return (
    <div style={{minHeight:'100vh',background:bg,position:'relative'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(15,23,42,0.04) 1px, transparent 1px)',backgroundSize:'24px 24px',pointerEvents:'none'}}/>

      {/* HERO */}
      <section style={{position:'relative',padding:'70px 0 30px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'transparent',border:'1px solid rgba(0,0,0,0.08)',padding:'6px 14px',borderRadius:999,marginBottom:24,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#f4f1ec',boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#3d3d3d',letterSpacing:'0.4px',textTransform:'uppercase'}}>Terms of Service</span>
          </div>
          <h1 style={{fontFamily:'Georgia, serif',fontSize:'clamp(36px,5vw,56px)',fontWeight:800,letterSpacing:'-1.6px',lineHeight:1.05,marginBottom:16,color:'#1a1a1a'}}>
            The fine print,<br/>
            <span style={{background:'linear-gradient(135deg,#2a6b5c,#f07059,#2a6b5c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>kept short.</span>
          </h1>
          <p style={{fontSize:15,color:'#3d3d3d',marginTop:14}}>Last updated: <strong style={{color:'#1a1a1a'}}>{updated}</strong></p>
        </div>
      </section>

      {/* TLDR CARD */}
      <section style={{position:'relative',padding:'30px 0 50px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'linear-gradient(135deg,#fde8e4,#fef9c3)',borderRadius:18,padding:'min(28px,5vw) min(32px,4vw)',border:'1.5px solid #F2C4BC',display:'flex',gap:18,alignItems:'flex-start'}}>
            <div style={{width:42,height:42,borderRadius:11,background:'#f4f1ec',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 14px rgba(217,119,6,0.3)'}}>
              <AlertTriangle size={20} color='#000000'/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:'#1f5c4e',letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:6}}>The TL;DR</div>
              <div style={{fontSize:14,color:'#451a03',lineHeight:1.7,fontWeight:500}}>
                SSLVault is a free service operated as-is. You're responsible for the domains you secure
                and the servers you manage. We're not liable if Let's Encrypt is down or your DNS provider
                breaks. Don't abuse the service. Be kind. Build cool things.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED TERMS */}
      <section style={{position:'relative',padding:'30px 0 80px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px'}}>
          <div style={{background:'transparent',borderRadius:24,padding:'clamp(16px,16vw,48px) clamp(14px,16vw,50px)',boxShadow:'0 4px 24px rgba(15,23,42,0.06)',border:'1px solid rgba(0,0,0,0.08)'}}>

            <Section title='1. Acceptance'>
              By creating an SSLVault account or using any feature of the service, you agree to these
              Terms. If you don't agree, don't use the service. These Terms apply to the websites
              <strong> easysecurity.in</strong>, <strong>freeencryption.vercel.app</strong>, and any
              related interfaces or APIs operated by Mathivanan Kathirvel.
            </Section>

            <Section title='2. The service'>
              <p style={p}>SSLVault is a certificate lifecycle management platform that automates the issuance, installation, monitoring, and renewal of TLS/SSL certificates issued by Let's Encrypt. Specifically, the service may:</p>
              <ul style={ul}>
                <li>Submit certificate signing requests to the Let's Encrypt ACME API on your behalf</li>
                <li>Add temporary DNS challenge records to providers you've connected</li>
                <li>Install certificates onto servers where you've installed our agent</li>
                <li>Monitor certificate expiry and send renewal reminders</li>
              </ul>
            </Section>

            <Section title='3. Free service, no warranty'>
              <p style={p}>SSLVault is provided <strong>free of charge and "as is"</strong>, without warranty of any kind — express or implied — including but not limited to merchantability, fitness for purpose, or uninterrupted availability. The service is best-effort.</p>
              <p style={p}>While we work hard to keep things running, we cannot guarantee:</p>
              <ul style={ul}>
                <li>Uptime of the dashboard, edge functions, or agent backend</li>
                <li>Successful issuance or renewal (Let's Encrypt rate limits and DNS propagation can intervene)</li>
                <li>Compatibility with every server, OS, or hosting provider</li>
              </ul>
            </Section>

            <Section title='4. Your responsibilities'>
              <p style={p}>By using the service, you agree to:</p>
              <ul style={ul}>
                <li><strong>Own or control</strong> the domains you request certificates for. Do not request certificates for domains you don't have authority over.</li>
                <li><strong>Keep your account secure.</strong> You're responsible for activity under your login.</li>
                <li><strong>Use the service in good faith.</strong> No abuse, no rate-limit gaming, no automated farming of certificates beyond reasonable use.</li>
                <li><strong>Comply with applicable law</strong> in your jurisdiction.</li>
              </ul>
            </Section>

            <Section title='5. Acceptable use'>
              <p style={p}>You may not use SSLVault to:</p>
              <ul style={ul}>
                <li>Issue certificates for phishing, malware distribution, or fraudulent sites</li>
                <li>Circumvent rate limits, security controls, or access restrictions</li>
                <li>Reverse-engineer or attempt to compromise the service or other users' data</li>
                <li>Resell access or rebrand the service without prior written agreement</li>
              </ul>
              <p style={p}>We reserve the right to suspend any account that violates this section, with or without notice.</p>
            </Section>

            <Section title="6. Let's Encrypt">
              <p style={p}>SSLVault relies on Let's Encrypt as the issuing certificate authority. Your use of certificates is also subject to the <a href='https://letsencrypt.org/repository/' target='_blank' rel='noreferrer' style={a}>Let's Encrypt Subscriber Agreement</a>. Rate limits, revocation policies, and certificate validity periods are determined by Let's Encrypt, not SSLVault.</p>
            </Section>

            <Section title='7. Your data'>
              <p style={p}>How we handle data is described in the <button onClick={()=>nav('/privacy')} style={{background:'none',border:'none',color:'#1a1a1a',fontWeight:700,cursor:'pointer',padding:0,fontSize:'inherit',fontFamily:'inherit'}}>Privacy Policy</button>. By using the service, you also accept that policy.</p>
            </Section>

            <Section title='8. Service changes & termination'>
              <p style={p}>We may add, modify, or remove features, change pricing (currently free, may add paid tiers in the future), or discontinue the service entirely with reasonable notice. If the service is discontinued, you'll get at least 30 days' notice and an export option for your certificate inventory.</p>
              <p style={p}>You can cancel your account at any time from the dashboard.</p>
            </Section>

            <Section title='9. Limitation of liability'>
              <p style={p}>To the maximum extent permitted by law, SSLVault, its operator, contributors, and vendors will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of (or inability to use) the service — including but not limited to loss of revenue, business interruption, expired certificates causing site outages, or data loss.</p>
              <p style={p}>The service is free, and our maximum aggregate liability to you for any claim is limited to <strong>EUR 0.00</strong>, the amount you paid us.</p>
            </Section>

            <Section title='10. Indemnification'>
              <p style={p}>You agree to defend and hold harmless the operator of SSLVault from any claim arising out of your use of the service or your violation of these Terms — including any certificate request you made for a domain you didn't control.</p>
            </Section>

            <Section title='11. Governing law'>
              <p style={p}>These Terms are governed by the laws of the Netherlands. Disputes will be resolved in the courts of the Netherlands, except where local consumer protection law gives you the right to sue in your home jurisdiction.</p>
            </Section>

            <Section title='12. Changes to these Terms'>
              <p style={p}>If we change these Terms materially, we'll update the date at the top of this page and notify account holders by email. Continued use of the service after a change constitutes acceptance.</p>
            </Section>

            <Section title='13. Contact' last>
              <p style={p}>Questions, complaints, legal notices? Email <a href='mailto:mathimcafee@gmail.com' style={a}>mathimcafee@gmail.com</a>.</p>
            </Section>
          </div>
        </div>
      </section>

      {/* FOOTER LINKS */}
      <section style={{position:'relative',padding:'0 0 80px'}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'0 24px',display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>nav('/privacy')} style={{background:'transparent',color:'#1a1a1a',border:'1.5px solid rgba(0,0,0,0.08)',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}>
            <Shield size={14}/> Privacy Policy
          </button>
          <button onClick={()=>nav('/contact')} style={{background:'#f4f1ec',color:'#1a1a1a',border:'none',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8}}>
            <Mail size={14}/> Contact us <ArrowRight size={13}/>
          </button>
        </div>
      </section>
    </div>
  )
}

const p = {fontSize:14,color:'#3d3d3d',lineHeight:1.75,marginBottom:12}
const ul = {fontSize:14,color:'#3d3d3d',lineHeight:1.85,paddingLeft:22,marginBottom:14}
const a = {color:'#1a1a1a',fontWeight:700,textDecoration:'none'}

function Section({title, children, last}) {
  return (
    <div style={{paddingBottom:last?0:28,marginBottom:last?0:24,borderBottom:last?'none':'1px dashed rgba(0,0,0,0.08)'}}>
      <h3 style={{fontFamily:'Georgia, serif',fontSize:20,fontWeight:800,color:'#1a1a1a',letterSpacing:'-0.4px',marginBottom:14}}>{title}</h3>
      {typeof children === 'string' ? <p style={p}>{children}</p> : children}
    </div>
  )
}
