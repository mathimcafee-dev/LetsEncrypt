
import '../styles/design-v2.css'

// ── ProGate ───────────────────────────────────────────────────────────
// Wraps any Pro-only section. If user is not Pro, shows upgrade prompt.
// If user is Pro, renders children transparently.
// Safe to use anywhere — never breaks surrounding layout.

export default function ProGate({ isPro, nav, feature = 'This feature', compact = false }) {
  if (isPro) return null // Pro: gate is invisible, parent renders children directly

  if (compact) {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:6,
                    background:'linear-gradient(135deg,#E8897A,#C45A4A)',
                    borderRadius:'var(--v2-r-md)', padding:'4px 10px',
                    cursor:'pointer', flexShrink:0 }}
        onClick={() => nav('/pricing')}>
        <Zap size={10} color='white' />
        <span style={{ fontSize:10, fontWeight:600, color:'white', letterSpacing:'0.2px' }}>PRO</span>
      </div>
    )
  }

  return (
    <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
                  borderRadius:'var(--v2-r-xl)', padding:'32px 36px', textAlign:'center',
                  position:'relative', overflow:'hidden' }}>
      {/* subtle purple glow */}
      <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)',
                    width:300, height:150, pointerEvents:'none',
                    background:'radial-gradient(ellipse,rgba(124,58,237,0.08),transparent 70%)' }} />
      <div style={{ position:'relative' }}>
        <div style={{ width:48, height:48, borderRadius:'var(--v2-r-xl)',
                      background:'linear-gradient(135deg,#E8897A,#C45A4A)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      margin:'0 auto 16px',
                      boxShadow:'0 0 0 6px rgba(124,58,237,0.1)' }}>
          <Lock size={22} color='white' />
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'#ffffff',
                      marginBottom:6, letterSpacing:'-0.2px' }}>
          {feature} is a Pro feature
        </div>
        <p style={{ fontSize:13, color:'#e8e0d8', lineHeight:1.65,
                    maxWidth:340, margin:'0 auto 20px' }}>
          Upgrade to CertVault Pro to access encrypted key storage, automatic rotation,
          and full audit logging — from €9.99/month.
        </p>
        <button className="v2-btn" onClick={() => nav('/pricing')}
          style={{ background:'linear-gradient(135deg,#E8897A,#C45A4A)',
                   color:'white', border:'none', padding:'10px 22px', fontSize:13,
                   fontWeight:600, display:'inline-flex', alignItems:'center', gap:7 }}>
          <Zap size={13} /> View CertVault plans <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}
