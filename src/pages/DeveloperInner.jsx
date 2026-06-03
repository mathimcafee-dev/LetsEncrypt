import {
  Award, MapPin,
  Mail, Shield
} from 'lucide-react'
import portrait from '../assets/mathi-portrait.jpg'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Github({ size=14, color='currentColor' }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={size} height={size} viewBox='0 0 24 24' fill={color} aria-hidden='true'>
      <path d='M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2.07c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.97 10.97 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z'/>
    </svg>
  )
}

const SKILLS = ['PKI / SSL/TLS', 'Channel Partnerships', 'React / Vite', 'Node.js', 'Supabase', 'PostgreSQL', 'Bash scripting', 'Linux / cPanel', 'Cloudflare', 'Vercel']

const CERTS = [
  'Certified PKI Specialist',
  'MSc — Kongu Engineering College',
]

export default function DeveloperInner({ nav }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ padding:'28px 28px 60px', fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif" }}>

      {/* Profile card */}
      <div style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'min(28px,5vw) min(32px,4vw)', marginBottom:14, borderLeft:'3px solid #2a6b5c' }}>
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, alignItems:'start' }}>
          <img src={portrait} alt="Mathivanan Kathirvel"
            style={{ width:80, height:80, borderRadius:8, objectFit:'cover', border:'0.5px solid #e8edf2', flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:18, fontWeight:500, color:'#ffffff', letterSpacing:'-.3px', marginBottom:4 }}>Mathivanan Kathirvel</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'#e8e0d8' }}>
                <MapPin size={11} color="rgba(240,237,232,0.45)"/> Netherlands
              </span>
            </div>
            <p style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.7, margin:'0 0 14px', maxWidth:580 }}>
              PKI specialist with a deep interest in digital trust and certificate lifecycle management. SSLVault is a personal project — a way to give back to the indie and non-profit community who need enterprise-grade CLM without the enterprise price tag.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <a href="mailto:mathimcafee@gmail.com" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#0d0000', color:'#ffffff', textDecoration:'none', borderRadius:6, padding:'7px 13px', fontSize:12, fontWeight:500 }}>
                <Mail size={12}/> Contact
              </a>
              <a href="https://github.com/mathimcafee-dev" target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'transparent', color:'#ffffff', textDecoration:'none', border:'0.5px solid #e8edf2', borderRadius:6, padding:'7px 13px', fontSize:12, fontWeight:500 }}>
                <Github size={12}/> GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {/* Credentials */}
        <div style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'20px 22px' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 }}>Credentials</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {CERTS.map(c => (
              <div key={c} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:12, color:'#e8e0d8' }}>
                <Award size={13} color="#2a6b5c" style={{ flexShrink:0, marginTop:1 }}/>
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'20px 22px' }}>
          <div style={{ fontSize:10, fontWeight:500, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 }}>Skills</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {SKILLS.map(s => (
              <span key={s} style={{ fontSize:11, fontWeight:500, color:'#e8e0d8', background:'transparent', border:'0.5px solid #e8edf2', borderRadius:4, padding:'4px 9px' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* SSLVault story */}
        <div style={{ background:'transparent', border:'0.5px solid #e8edf2', borderRadius:8, padding:'20px 22px', gridColumn:'span 2' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Shield size={13} color="#2a6b5c"/>
            <span style={{ fontSize:10, fontWeight:500, color:'#b0a8a0', textTransform:'uppercase', letterSpacing:'.5px' }}>Why SSLVault</span>
          </div>
          <p style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.8, margin:'0 0 10px' }}>
            Working in the PKI industry gives a clear view of both sides: the enterprise tools that handle certificate lifecycle management elegantly — and the gap that exists for everyone else. A non-profit running on shared hosting. A developer with 10 side projects. A freelancer who just wants the padlock to stay green.
          </p>
          <p style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.8, margin:0 }}>
            SSLVault is built to close that gap — bringing real CLM capabilities (issuance, monitoring, auto-renewal, agent-based installation) to people who can't justify an enterprise platform but deserve the same reliability.
          </p>
        </div>
      </div>
    </div>
  )
}
