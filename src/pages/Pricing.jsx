import { useState } from 'react'
import { Shield, Zap, Users, Check, ArrowRight, Lock, RefreshCw,
         Activity, FileText, Bell, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import '../styles/design-v2.css'

const STRIPE_LINKS = {
  pro_monthly:  'https://buy.stripe.com/sslvault_pro_monthly',   // replace with real Stripe payment links
  pro_annual:   'https://buy.stripe.com/sslvault_pro_annual',
  team_monthly: 'https://buy.stripe.com/sslvault_team_monthly',
  team_annual:  'https://buy.stripe.com/sslvault_team_annual',
}

const FREE_FEATURES = [
  'Unlimited SSL certificates',
  'Persistent VPS agent',
  'cPanel / shared hosting agent',
  'SSL Monitor (expiry tracking)',
  'DNS provider integration',
  'Auto-renewal reminders',
  'CT log discovery',
  'Knowledge Base & Install guides',
]

const PRO_FEATURES = [
  { text:'Everything in Free', bold: true },
  { text:'KeyLocker encrypted vault', bold: true },
  { text:'Envelope encryption (AES-256-GCM)', bold: false },
  { text:'Per-certificate key isolation', bold: false },
  { text:'One-click key rotation', bold: true },
  { text:'30-day key archive after rotation', bold: false },
  { text:'Full audit log (who, when, why)', bold: true },
  { text:'Email alerts on key access', bold: false },
  { text:'Scheduled auto-rotation', bold: false },
  { text:'Priority support', bold: false },
]

const TEAM_FEATURES = [
  { text:'Everything in Pro', bold: true },
  { text:'5 team members', bold: true },
  { text:'Role-based access (admin / operator / viewer)', bold: false },
  { text:'Shared vault across team', bold: false },
  { text:'SIEM-compatible audit export (JSON/CSV)', bold: true },
  { text:'Slack & webhook alerts', bold: false },
  { text:'99.9% uptime SLA', bold: false },
  { text:'Dedicated support channel', bold: false },
]

export default function Pricing({ nav }) {
  const { user } = useAuth()
  const { plan, isPro, isTeam, loading } = usePlan(user)
  const [annual, setAnnual] = useState(true)

  const goToStripe = (key) => {
    if (!user) { nav('/auth'); return }
    window.open(STRIPE_LINKS[key], '_blank')
  }

  const saving = (monthly, yearly) => Math.round(100 - (yearly / (monthly * 12)) * 100)

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:1060, padding:'48px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(109,40,217,0.06))',
                        border:'0.5px solid rgba(124,58,237,0.2)',
                        borderRadius:100, padding:'4px 14px', marginBottom:18 }}>
            <Zap size={11} color='#7c3aed' />
            <span style={{ fontSize:12, fontWeight:500, color:'#6d28d9' }}>
              KeyLocker — PKI-grade key protection
            </span>
          </div>
          <h1 style={{ fontSize:'clamp(32px,5vw,48px)', fontWeight:700, letterSpacing:'-1.2px',
                        lineHeight:1.1, margin:'0 0 14px', color:'var(--v2-text)' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize:16, color:'var(--v2-text-2)', maxWidth:480,
                      margin:'0 auto 28px', lineHeight:1.65 }}>
            SSLVault stays free forever. KeyLocker Pro adds enterprise-grade
            encrypted key storage — for the price of a coffee per month.
          </p>

          {/* Annual toggle */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:12,
                        background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                        borderRadius:100, padding:'4px 6px 4px 16px' }}>
            <span style={{ fontSize:12, fontWeight:500, color: annual ? 'var(--v2-text-3)' : 'var(--v2-text)' }}>
              Monthly
            </span>
            <button onClick={() => setAnnual(v => !v)}
              style={{ width:40, height:22, borderRadius:100, border:'none', cursor:'pointer',
                        background: annual ? '#7c3aed' : 'var(--v2-border)', position:'relative',
                        transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%',
                             background:'white', transition:'left 0.2s',
                             left: annual ? 21 : 3 }} />
            </button>
            <span style={{ fontSize:12, fontWeight:500, color: annual ? 'var(--v2-text)' : 'var(--v2-text-3)' }}>
              Annual
            </span>
            {annual && (
              <span style={{ fontSize:10, fontWeight:600, color:'#7c3aed',
                              background:'rgba(124,58,237,0.1)', borderRadius:100,
                              padding:'2px 8px', marginRight:6 }}>
                Save {saving(9.99, 79)}%
              </span>
            )}
          </div>
        </div>

        {/* Pricing cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:48 }}>

          {/* Free */}
          <div className="v2-card" style={{ padding:'28px 26px' }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                               background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Shield size={15} color='var(--v2-text-2)' />
                </div>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)' }}>Free</span>
              </div>
              <div style={{ fontSize:32, fontWeight:700, color:'var(--v2-text)',
                             letterSpacing:'-1px', marginBottom:4 }}>€0</div>
              <div style={{ fontSize:12, color:'var(--v2-text-3)' }}>Forever. No credit card.</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--v2-text-2)' }}>
                  <Check size={12} color='var(--v2-green)' style={{ flexShrink:0 }} />
                  {f}
                </div>
              ))}
            </div>

            {plan === 'free' && !loading ? (
              <div className="v2-btn" style={{ width:'100%', justifyContent:'center',
                                               textAlign:'center', fontSize:13,
                                               color:'var(--v2-text-3)', cursor:'default' }}>
                Current plan
              </div>
            ) : (
              <button className="v2-btn" style={{ width:'100%', justifyContent:'center', fontSize:13 }}
                onClick={() => nav(user ? '/dashboard' : '/auth')}>
                {user ? 'Go to Dashboard' : 'Get started free'}
              </button>
            )}
          </div>

          {/* Pro */}
          <div className="v2-card" style={{ padding:'28px 26px', position:'relative',
                                             borderTop:'2px solid #7c3aed',
                                             boxShadow:'0 4px 24px rgba(124,58,237,0.08)' }}>
            <div style={{ position:'absolute', top:-1, right:20,
                           background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                           color:'white', fontSize:9, fontWeight:700, letterSpacing:'0.4px',
                           padding:'3px 10px', borderRadius:'0 0 6px 6px', textTransform:'uppercase' }}>
              Most popular
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                               background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Zap size={15} color='white' />
                </div>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)' }}>
                  KeyLocker Pro
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                <span style={{ fontSize:32, fontWeight:700, color:'var(--v2-text)', letterSpacing:'-1px' }}>
                  €{annual ? '6.58' : '9.99'}
                </span>
                <span style={{ fontSize:12, color:'var(--v2-text-3)' }}>/month</span>
              </div>
              {annual && (
                <div style={{ fontSize:11, color:'var(--v2-text-3)', marginBottom:2 }}>
                  Billed as €79/year
                </div>
              )}
              <div style={{ fontSize:12, color:'#7c3aed', fontWeight:500 }}>
                Save €{annual ? (9.99*12 - 79).toFixed(0) : 0} vs monthly
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
              {PRO_FEATURES.map(({ text, bold }) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12,
                                          color: bold ? 'var(--v2-text)' : 'var(--v2-text-2)',
                                          fontWeight: bold ? 500 : 400 }}>
                  <Check size={12} color='#7c3aed' style={{ flexShrink:0 }} />
                  {text}
                </div>
              ))}
            </div>

            {isPro && !isTeam && !loading ? (
              <div style={{ width:'100%', textAlign:'center', padding:'10px',
                             fontSize:13, color:'#7c3aed', fontWeight:500,
                             background:'rgba(124,58,237,0.06)', borderRadius:'var(--v2-r-md)',
                             border:'0.5px solid rgba(124,58,237,0.2)' }}>
                ✓ Your current plan
              </div>
            ) : (
              <button onClick={() => goToStripe(annual ? 'pro_annual' : 'pro_monthly')}
                style={{ width:'100%', display:'inline-flex', alignItems:'center',
                          justifyContent:'center', gap:7, padding:'11px',
                          background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                          color:'white', border:'none', borderRadius:'var(--v2-r-md)',
                          fontSize:13, fontWeight:600, cursor:'pointer',
                          fontFamily:'inherit' }}>
                <Zap size={13} /> Upgrade to Pro <ArrowRight size={12} />
              </button>
            )}
          </div>

          {/* Team */}
          <div className="v2-card" style={{ padding:'28px 26px' }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:32, height:32, borderRadius:'var(--v2-r-md)',
                               background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Users size={15} color='var(--v2-text-2)' />
                </div>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)' }}>
                  KeyLocker Team
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                <span style={{ fontSize:32, fontWeight:700, color:'var(--v2-text)', letterSpacing:'-1px' }}>
                  €{annual ? '19.08' : '29.99'}
                </span>
                <span style={{ fontSize:12, color:'var(--v2-text-3)' }}>/month</span>
              </div>
              {annual && (
                <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>Billed as €229/year</div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
              {TEAM_FEATURES.map(({ text, bold }) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12,
                                          color: bold ? 'var(--v2-text)' : 'var(--v2-text-2)',
                                          fontWeight: bold ? 500 : 400 }}>
                  <Check size={12} color='var(--v2-text-2)' style={{ flexShrink:0 }} />
                  {text}
                </div>
              ))}
            </div>

            {isTeam && !loading ? (
              <div style={{ width:'100%', textAlign:'center', padding:'10px',
                             fontSize:13, color:'var(--v2-text-2)', fontWeight:500,
                             background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)',
                             border:'0.5px solid var(--v2-border)' }}>
                ✓ Your current plan
              </div>
            ) : (
              <button onClick={() => goToStripe(annual ? 'team_annual' : 'team_monthly')}
                className="v2-btn v2-btn-primary"
                style={{ width:'100%', justifyContent:'center', fontSize:13, padding:'11px' }}>
                <Users size={13} /> Upgrade to Team
              </button>
            )}
          </div>
        </div>

        {/* Feature comparison */}
        <div style={{ marginBottom:48 }}>
          <div className="v2-section-label" style={{ textAlign:'center', marginBottom:20 }}>
            Full feature comparison
          </div>
          <div className="v2-card" style={{ overflow:'hidden' }}>
            <table className="v2-table" style={{ fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ width:'40%' }}>Feature</th>
                  <th style={{ textAlign:'center' }}>Free</th>
                  <th style={{ textAlign:'center', color:'#7c3aed' }}>Pro</th>
                  <th style={{ textAlign:'center' }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['SSL certificates',              '✓ Unlimited', '✓ Unlimited', '✓ Unlimited'],
                  ['VPS agent',                     '✓',           '✓',           '✓'],
                  ['cPanel agent',                  '✓',           '✓',           '✓'],
                  ['SSL Monitor',                   '✓',           '✓',           '✓'],
                  ['Auto-renewal reminders',        '✓',           '✓',           '✓'],
                  ['KeyLocker encrypted vault',     '—',           '✓',           '✓'],
                  ['AES-256-GCM per-cert encryption','—',          '✓',           '✓'],
                  ['Key rotation',                  '—',           '✓',           '✓'],
                  ['30-day key archive',            '—',           '✓',           '✓'],
                  ['Audit log',                     '—',           '✓',           '✓'],
                  ['Email alerts on key access',    '—',           '✓',           '✓'],
                  ['Scheduled auto-rotation',       '—',           '✓',           '✓'],
                  ['Team members',                  '1',           '1',           '5'],
                  ['Role-based access',             '—',           '—',           '✓'],
                  ['SIEM audit export',             '—',           '—',           '✓'],
                  ['Slack / webhook alerts',        '—',           '—',           '✓'],
                  ['99.9% SLA',                     '—',           '—',           '✓'],
                  ['Support',                       'Community',   'Priority email','Dedicated'],
                ].map(([feature, free, pro, team]) => (
                  <tr key={feature}>
                    <td style={{ fontWeight:500 }}>{feature}</td>
                    <td style={{ textAlign:'center', color: free === '—' ? 'var(--v2-text-3)' : 'var(--v2-green-text)' }}>{free}</td>
                    <td style={{ textAlign:'center', color: pro === '—' ? 'var(--v2-text-3)' : '#7c3aed', fontWeight: pro !== '—' ? 500 : 400 }}>{pro}</td>
                    <td style={{ textAlign:'center', color: team === '—' ? 'var(--v2-text-3)' : 'var(--v2-text-2)' }}>{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom:48 }}>
          <div className="v2-section-label" style={{ textAlign:'center', marginBottom:20 }}>FAQ</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { q:'Will the free tier stay free?',
                a:'Yes. SSLVault free is free forever — unlimited certificates, agents, monitoring. No credit card, no trial period, no expiry.' },
              { q:'How does KeyLocker encryption work?',
                a:'Each certificate key is encrypted with a unique Data Encryption Key (DEK), which is itself wrapped by your personal Key Encryption Key (KEK) stored in a separate KMS. A database breach alone cannot expose your keys.' },
              { q:'What happens if I cancel Pro?',
                a:'Your vault keys are archived for 30 days so you can export them. After 30 days they are permanently destroyed. Your certificates continue to work — only the KeyLocker vault is affected.' },
              { q:'Does key rotation break my live site?',
                a:'No. The agent installs the new certificate before the old one is archived. Your web server reloads with zero downtime. The old key is kept for 30 days as a rollback option.' },
              { q:'Can I use KeyLocker without the agent?',
                a:'Yes. KeyLocker stores your keys securely and you can download them manually at any time. The agent automates the installation but is not required.' },
              { q:'Is there a refund policy?',
                a:'Yes — 14-day money-back guarantee, no questions asked. Contact us within 14 days of any payment for a full refund.' },
            ].map(({ q, a }) => (
              <div key={q} className="v2-card" style={{ padding:'18px 20px' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{q}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security trust bar */}
        <div className="v2-card" style={{ padding:'20px 28px', display:'flex', alignItems:'center',
                                           justifyContent:'space-around', flexWrap:'wrap', gap:16 }}>
          {[
            { icon:<Lock size={14} />,       label:'AES-256-GCM encryption' },
            { icon:<Shield size={14} />,     label:'Envelope key hierarchy' },
            { icon:<FileText size={14} />,   label:'Immutable audit log' },
            { icon:<RefreshCw size={14} />,  label:'Automatic key rotation' },
            { icon:<Activity size={14} />,   label:'99.9% uptime SLA (Team)' },
            { icon:<Bell size={14} />,       label:'Instant access alerts' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:7,
                                       fontSize:12, color:'var(--v2-text-2)', fontWeight:500 }}>
              <span style={{ color:'var(--v2-text-3)' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center', paddingTop:40 }}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.3px',
                        marginBottom:8, color:'var(--v2-text)' }}>
            Ready to secure your keys?
          </div>
          <div style={{ fontSize:13, color:'var(--v2-text-2)', marginBottom:20 }}>
            Start free. Upgrade when you need KeyLocker.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => goToStripe(annual ? 'pro_annual' : 'pro_monthly')}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px',
                        background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                        color:'white', border:'none', borderRadius:'var(--v2-r-md)',
                        fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <Zap size={14} /> Get KeyLocker Pro <ArrowRight size={13} />
            </button>
            <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }}
              onClick={() => nav(user ? '/dashboard' : '/auth')}>
              {user ? 'Stay on Free' : 'Start for free'}
            </button>
          </div>
          <div style={{ marginTop:14, fontSize:11, color:'var(--v2-text-3)' }}>
            14-day money-back guarantee · Cancel anytime · EU VAT included
          </div>
        </div>

      </div>
    </div>
  )
}
