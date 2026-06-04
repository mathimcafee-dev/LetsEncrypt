import { useState, useEffect } from 'react'
import {
  Heart, Shield, RefreshCw,
  Globe, Code2, ArrowRight,
  Lock
} from 'lucide-react'

const PILLARS = [
  { icon: Lock, title: 'Free issuance', body: 'DV certificates via RapidSSL. RapidSSL certs issued in minutes, no credit card required.' },
  { icon: RefreshCw, title: 'Auto-renewal', body: 'Persistent agents poll every 5 minutes. Certificates renew automatically before expiry — no cron jobs, no surprise outages.' },
  { icon: Shield, title: 'Lifecycle management', body: 'Full CLM: discover, issue, install, monitor, revoke. One dashboard for your entire certificate inventory.' },
  { icon: Globe, title: 'Any hosting', body: 'VPS with Nginx or Apache, cPanel shared hosting, or any server reachable by the agent. DNS validation via Cloudflare, Vercel, and more.' },
]

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function AboutInner({ nav }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ padding:'28px 28px 60px', fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif" }}>

      {/* Mission block */}
      <div style={{ background:'transparent', border:'1px solid #e8edf2', borderRadius:8, padding:'min(28px,5vw) min(32px,4vw)', marginBottom:16, borderLeft:'3px solid #2a6b5c' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <Heart size={14} color="#1f5c4e"/>
          <span style={{ fontSize:10, fontWeight:500, color:'#888888', textTransform:'uppercase', letterSpacing:'.5px' }}>Mission</span>
        </div>
        <p style={{ fontSize:20, fontWeight:500, color:'#111111', lineHeight:1.5, letterSpacing:'-.3px', margin:'0 0 14px', maxWidth:680 }}>
          The web should be encrypted by default — and managing that encryption should never be a barrier.
        </p>
        <p style={{ fontSize:13, color:'#333333', lineHeight:1.8, margin:'0 0 10px', maxWidth:720 }}>
          SSLVault is a certificate lifecycle management platform built on RapidSSL's API and designed for indie developers, SMBs, and non-profits who need enterprise-grade SSL management without enterprise pricing.
        </p>
        <p style={{ fontSize:13, color:'#333333', lineHeight:1.8, margin:0, maxWidth:720 }}>
          Enterprise CLM platforms solve this beautifully — but cost thousands per year and are built for security teams managing thousands of certificates. SSLVault brings that same capability to anyone running a site on a $5 VPS or shared hosting.
        </p>
      </div>

      {/* Pillars grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap:12, marginBottom:16 }}>
        {PILLARS.map(({ icon:Icon, title, body }) => (
          <div key={title} style={{ background:'transparent', border:'1px solid #e8edf2', borderRadius:8, padding:'20px 22px' }}>
            <div style={{ width:32, height:32, background:'transparent', border:'1px solid rgba(31,92,78,0.2)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <Icon size={15} color="#1f5c4e"/>
            </div>
            <div style={{ fontSize:13, fontWeight:500, color:'#111111', marginBottom:6 }}>{title}</div>
            <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* Stack */}
      <div style={{ background:'transparent', border:'1px solid #e8edf2', borderRadius:8, padding:'20px 24px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:500, color:'#888888', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 }}>Stack & infrastructure</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
          {[
            ['Frontend', 'React 18 + Vite'],
            ['Database', 'Supabase (PostgreSQL)'],
            ['Hosting', 'Vercel'],
            ['CA Partner', 'RapidSSL · DigiCert trust chain'],
            ['Agent', 'Bash daemon, systemd'],
            ['DNS', 'Cloudflare · Vercel · cPanel'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding:'10px 12px', background:'transparent', borderRadius:6, border:'1px solid rgba(31,92,78,0.07)' }}>
              <div style={{ fontSize:9, fontWeight:500, color:'#888888', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:12, color:'#111111', fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => nav('/developer')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f4f1ec', color:'#111111', border:'none', borderRadius:6, padding:'9px 16px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          <Code2 size={13}/> Meet the developer
        </button>
        <button onClick={() => nav('/contact')} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'transparent', color:'#111111', border:'1px solid #e8edf2', borderRadius:6, padding:'9px 16px', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          Contact us <ArrowRight size={12}/>
        </button>
      </div>
    </div>
  )
}
