import { CheckCircle, Zap, Shield, Server, RefreshCw, ArrowRight } from 'lucide-react'
import '../styles/design-v2.css'

function FAQ({ q, a }) {
  return (
    <div style={{ borderBottom:'0.5px solid var(--v2-border)', padding:'18px 0' }}>
      <div style={{ fontWeight:700, fontSize:14, color:'var(--v2-text)', marginBottom:8 }}>{q}</div>
      <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.7 }}>{a}</div>
    </div>
  )
}

export default function Pricing({ nav }) {
  const freePros = [
    'Unlimited certificate imports',
    'Expiry monitoring & alerts',
    'Dashboard inventory',
    'Agent-based auto-install',
    'SSH Push install',
    'DNS provider automation',
  ]
  const paidPros = [
    'Everything in Free',
    'RapidSSL DV certificates (1-year)',
    'Zero-touch auto-renewal',
    'Unlimited domains',
    'Priority support',
    'SLA guarantee',
  ]

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:820 }}>

        {/* Header */}
        <div style={{ textAlign:'center', padding:'56px 0 48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--v2-green-bg)',
            border:'0.5px solid var(--v2-green-border)', borderRadius:20, padding:'5px 14px',
            marginBottom:16 }}>
            <Zap size={12} color="var(--v2-green)"/>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--v2-green-text)' }}>Simple pricing</span>
          </div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'var(--v2-text)',
            letterSpacing:'-0.8px', marginBottom:14 }}>
            CLM built for everyone
          </h1>
          <p style={{ fontSize:16, color:'var(--v2-text-2)', maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
            Manage, monitor and automate your SSL certificates — free forever.
            Add paid certs when you need them.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:48 }}>

          {/* Free */}
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
            borderRadius:'var(--v2-r-xl)', padding:'28px 28px 32px', display:'flex', flexDirection:'column' }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--v2-text-3)',
                textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Free</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:6 }}>
                <span style={{ fontSize:40, fontWeight:800, color:'var(--v2-text)', letterSpacing:'-1px' }}>€0</span>
                <span style={{ fontSize:13, color:'var(--v2-text-3)', paddingBottom:7 }}>/month</span>
              </div>
              <p style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6 }}>
                Full CLM platform — import, monitor, install, and automate your existing certificates.
              </p>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
              {freePros.map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <CheckCircle size={14} color="var(--v2-green)" style={{ flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:'var(--v2-text-2)' }}>{item}</span>
                </div>
              ))}
            </div>
            <button className="v2-btn" onClick={() => nav('/auth')}
              style={{ width:'100%', justifyContent:'center' }}>
              Get started free
            </button>
          </div>

          {/* Paid certs */}
          <div style={{ background:'#0a0a0a', border:'0.5px solid #1a1a1a',
            borderRadius:'var(--v2-r-xl)', padding:'28px 28px 32px', display:'flex', flexDirection:'column',
            position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200,
              background:'radial-gradient(circle,rgba(16,185,129,0.15),transparent 70%)',
              pointerEvents:'none' }}/>
            <div style={{ position:'relative', marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#6b7280',
                textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Managed Certs</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:6 }}>
                <span style={{ fontSize:40, fontWeight:800, color:'white', letterSpacing:'-1px' }}>€9.99</span>
                <span style={{ fontSize:13, color:'#6b7280', paddingBottom:7 }}>/cert/year</span>
              </div>
              <p style={{ fontSize:13, color:'#9ca3af', lineHeight:1.6 }}>
                RapidSSL DV certificates with zero-touch issuance, renewal, and server delivery.
              </p>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
              {paidPros.map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <CheckCircle size={14} color="#10b981" style={{ flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:'#d1d5db' }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => nav('/buy')}
              style={{ width:'100%', background:'#10b981', color:'white', border:'none',
                borderRadius:'var(--v2-r-md)', padding:'11px', fontSize:13, fontWeight:700,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                fontFamily:'inherit' }}>
              <Shield size={14}/> Issue a certificate <ArrowRight size={13}/>
            </button>
          </div>
        </div>

        {/* Feature comparison */}
        <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
          borderRadius:'var(--v2-r-xl)', marginBottom:48, overflow:'hidden' }}>
          <div style={{ padding:'20px 24px', borderBottom:'0.5px solid var(--v2-border)' }}>
            <h3 style={{ fontWeight:700, fontSize:15, color:'var(--v2-text)' }}>Full feature comparison</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--v2-surface)' }}>
                <th style={{ padding:'12px 24px', textAlign:'left', fontWeight:700, color:'var(--v2-text-3)',
                  fontSize:11, textTransform:'uppercase', letterSpacing:'0.4px', width:'55%' }}>Feature</th>
                <th style={{ padding:'12px 16px', textAlign:'center', fontWeight:700, color:'var(--v2-text-3)',
                  fontSize:11, textTransform:'uppercase', letterSpacing:'0.4px' }}>Free</th>
                <th style={{ padding:'12px 16px', textAlign:'center', fontWeight:700, color:'#10b981',
                  fontSize:11, textTransform:'uppercase', letterSpacing:'0.4px' }}>Managed Certs</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Certificate import (any CA)',     '✓', '✓'],
                ['Expiry monitoring & alerts',       '✓', '✓'],
                ['Dashboard inventory',              '✓', '✓'],
                ['Agent-based auto-install',         '✓', '✓'],
                ['SSH Push install',                 '✓', '✓'],
                ['DNS provider automation',          '✓', '✓'],
                ['RapidSSL DV issuance',             '—', '✓'],
                ['1-year certificate validity',      '—', '✓'],
                ['Zero-touch auto-renewal',          '—', '✓'],
                ['Priority support',                 '—', '✓'],
              ].map(([feat, free, paid], i) => (
                <tr key={feat} style={{ borderTop:'0.5px solid var(--v2-border)',
                  background: i%2===0 ? 'transparent' : 'var(--v2-surface-3)' }}>
                  <td style={{ padding:'11px 24px', color:'var(--v2-text-2)' }}>{feat}</td>
                  <td style={{ padding:'11px 16px', textAlign:'center',
                    color: free==='✓'?'var(--v2-green)':'var(--v2-text-3)', fontWeight: free==='✓'?700:400 }}>{free}</td>
                  <td style={{ padding:'11px 16px', textAlign:'center',
                    color: paid==='✓'?'#10b981':'var(--v2-text-3)', fontWeight: paid==='✓'?700:400 }}>{paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:64 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--v2-text)',
            letterSpacing:'-0.4px', marginBottom:8 }}>Common questions</h2>
          <FAQ q="Is the free plan really free?" a="Yes, forever. The free plan gives you the full CLM platform — import, monitor, install, and automate. There's no time limit and no credit card required." />
          <FAQ q="What's included in a managed certificate?" a="A RapidSSL DV certificate with 1-year validity, automatic DNS validation, zero-touch renewal 14 days before expiry, and automatic delivery to your servers via agent or SSH push." />
          <FAQ q="Can I bring my own Let's Encrypt certificate?" a="Absolutely. Use Import Certificate to add any existing cert. SSLVault will track expiry and can install it on your servers. The only difference is that imported certs aren't auto-renewed by SSLVault — you manage renewal yourself or buy a managed cert." />
          <FAQ q="What is RapidSSL?" a="RapidSSL is a certificate authority owned by DigiCert, one of the largest CAs in the world. RapidSSL DV certificates are trusted by all major browsers and operating systems." />
          <FAQ q="How does auto-renewal work?" a="SSLVault's cron checks your certs 14 days before expiry. When due, it automatically places a new TSS order, validates DNS, downloads the certificate, and pushes it to your servers. No action needed from you." />
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', paddingBottom:64 }}>
          <div style={{ background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
            borderRadius:'var(--v2-r-xl)', padding:'36px 32px', display:'inline-block', maxWidth:480 }}>
            <Shield size={28} color="var(--v2-green)" style={{ marginBottom:12 }}/>
            <h3 style={{ fontSize:20, fontWeight:800, color:'var(--v2-text)',
              letterSpacing:'-0.3px', marginBottom:8 }}>Start managing your certs today</h3>
            <p style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:20, lineHeight:1.6 }}>
              Free forever. Add managed certificates when you need zero-touch renewal.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>
                Get started free
              </button>
              <button className="v2-btn" onClick={() => nav('/buy')}>
                <Shield size={13}/> Issue a certificate
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
