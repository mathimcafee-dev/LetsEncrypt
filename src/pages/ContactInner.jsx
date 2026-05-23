import { Mail, Clock, MessageSquare, BookOpen, Globe, ArrowRight, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const TOPICS = [
  { icon: MessageSquare, label: 'Bug report', body: 'Something broken? Include your domain, what you were doing, and any error messages.' },
  { icon: BookOpen, label: 'Feature request', body: 'Have an idea? We read every suggestion — SSLVault is shaped by user feedback.' },
  { icon: Globe, label: 'Partnership', body: 'CA integration, hosting partnership, or technical collaboration. Let us know.' },
  { icon: ArrowRight, label: 'General enquiry', body: 'Anything else — billing, account access, or just saying hi.' },
]

export default function ContactInner({ nav }) {
  const email = 'mathimcafee@gmail.com'
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ padding:'28px 28px 60px', fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif" }}>

      {/* Main contact card */}
      <div style={{ background:'white', border:'0.5px solid #e8edf2', borderRadius:8, padding:'28px 32px', marginBottom:16, borderLeft:'3px solid #1A7A72' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Mail size={14} color="#1A7A72"/>
          <span style={{ fontSize:10, fontWeight:500, color:'#a3a3a3', textTransform:'uppercase', letterSpacing:'.5px' }}>Contact</span>
        </div>
        <div style={{ fontSize:20, fontWeight:500, color:'#0a0a0a', letterSpacing:'-.3px', marginBottom:8 }}>
          Every message gets read.
        </div>
        <p style={{ fontSize:13, color:'#525252', lineHeight:1.7, margin:'0 0 20px', maxWidth:560 }}>
          SSLVault is built and maintained by a single developer. Bug reports, feature requests, and partnership ideas all land directly in one inbox — with a typical reply time of 1–2 days.
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <a href={`mailto:${email}`} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#1A7A72', color:'white', textDecoration:'none', borderRadius:6, padding:'9px 16px', fontSize:13, fontWeight:500 }}>
            <Mail size={13}/> {email}
          </a>
          <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'white', color:'#525252', border:'0.5px solid #e8edf2', borderRadius:6, padding:'9px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
          </button>
        </div>
      </div>

      {/* Response time note */}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:'0.5px solid #e8edf2', borderRadius:8, padding:'14px 18px', marginBottom:16 }}>
        <Clock size={13} color="#a3a3a3"/>
        <span style={{ fontSize:12, color:'#525252' }}>Typical response time: <strong style={{ color:'#0a0a0a' }}>1–2 business days</strong></span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'#a3a3a3' }}>Based in Netherlands (CET)</span>
      </div>

      {/* Topics grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
        {TOPICS.map(({ icon:Icon, label, body }) => (
          <div key={label} style={{ background:'white', border:'0.5px solid #e8edf2', borderRadius:8, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <Icon size={13} color="#1A7A72"/>
              <span style={{ fontSize:12, fontWeight:500, color:'#0a0a0a' }}>{label}</span>
            </div>
            <p style={{ fontSize:11, color:'#525252', lineHeight:1.7, margin:0 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
