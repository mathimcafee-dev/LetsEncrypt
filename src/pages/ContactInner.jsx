import { Mail, Clock, MessageSquare, BookOpen, Globe, ArrowRight, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const TOPICS = [
  { icon: MessageSquare, label: 'Bug report', body: 'Something broken? Include your domain, what you were doing, and any error messages.' },
  { icon: BookOpen, label: 'Feature request', body: 'Have an idea? We read every suggestion — SSLVault is shaped by user feedback.' },
  { icon: Globe, label: 'Partnership', body: 'CA integration, hosting partnership, or technical collaboration. Let us know.' },
  { icon: ArrowRight, label: 'General enquiry', body: 'Anything else — billing, account access, or just saying hi.' },
]

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function ContactInner({ nav }) {
  const isMobile = useIsMobile()
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
      <div style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'min(28px,5vw) min(32px,4vw)', marginBottom:16, borderLeft:'3px solid #c0392b' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Mail size={14} color="#c0392b"/>
          <span style={{ fontSize:10, fontWeight:500, color:'#9a918a', textTransform:'uppercase', letterSpacing:'.5px' }}>Contact</span>
        </div>
        <div style={{ fontSize:20, fontWeight:500, color:'#f5f0eb', letterSpacing:'-.3px', marginBottom:8 }}>
          Every message gets read.
        </div>
        <p style={{ fontSize:13, color:'#d4cdc6', lineHeight:1.7, margin:'0 0 20px', maxWidth:560 }}>
          SSLVault is built and maintained by a single developer. Bug reports, feature requests, and partnership ideas all land directly in one inbox — with a typical reply time of 1–2 days.
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <a href={`mailto:${email}`} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#f0ede8', color:'#f5f0eb', textDecoration:'none', borderRadius:6, padding:'9px 16px', fontSize:13, fontWeight:500 }}>
            <Mail size={13}/> {email}
          </a>
          <button onClick={copy} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'transparent', color:'#d4cdc6', border:'0.5px solid #e8edf2', borderRadius:6, padding:'9px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
          </button>
        </div>
      </div>

      {/* Response time note */}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'14px 18px', marginBottom:16 }}>
        <Clock size={13} color="rgba(240,237,232,0.45)"/>
        <span style={{ fontSize:12, color:'#d4cdc6' }}>Typical response time: <strong style={{ color:'#f5f0eb' }}>1–2 business days</strong></span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'#9a918a' }}>Based in Netherlands (CET)</span>
      </div>

      {/* Topics grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:10 }}>
        {TOPICS.map(({ icon:Icon, label, body }) => (
          <div key={label} style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <Icon size={13} color="#c0392b"/>
              <span style={{ fontSize:12, fontWeight:500, color:'#f5f0eb' }}>{label}</span>
            </div>
            <p style={{ fontSize:11, color:'#d4cdc6', lineHeight:1.7, margin:0 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
