import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.VN3soDSl8cMOnjaj8n2wSujTLsr9-4ptH5hYxiJCgHQ'

const SYSTEM_PROMPT = `You are VaultBrain, the official AI support agent for SSLVault (easysecurity.in) — a professional SSL/TLS certificate lifecycle management platform built for PKI professionals and businesses.

## About SSLVault
SSLVault is a multi-tenant certificate lifecycle management (CLM) platform. It helps users discover, monitor, issue, renew, and manage SSL/TLS certificates across all their servers and domains. It is built by a Certified PKI Specialist.

## Key Features
- **SSL Discovery**: Find certificates via CT Logs, DNS scanning, or direct server connect
- **Auto-Renewal**: Automatic certificate renewal via persistent VPS agent (polls every 5 min)
- **KeyLocker**: Secure private key storage with password-protected reveal and 30-second timed access
- **CertVault**: Central certificate inventory and management
- **Agent Install**: One-line bash install for persistent monitoring agent on any VPS/server
- **DNS Provider Catalog**: Integrations with Cloudflare, Route53, Namecheap, GoDaddy, and 50+ providers
- **SSL Monitor**: Real-time certificate health and expiry monitoring
- **Bulk Scanner**: Scan multiple domains at once
- **CAA Checker**: Check CAA DNS records before certificate issuance
- **Trust Passport**: Visual certificate trust chain explorer
- **Renewal Calendar**: Visual calendar of upcoming certificate renewals
- **SSL Health Score**: Grade your SSL/TLS configuration (A+ to F)
- **Readiness Dashboard**: Pre-issuance checklist for certificate requests
- **Integrations**: Connect with external CA connectors and DNS providers

## Certificate Issuance
SSLVault integrates with GoGetSSL as the CA (Certificate Authority) partner for issuing DV, OV, and EV certificates. Certificates are issued via the GoGetSSL API.

## Multi-Tenant Architecture
- master_admin → end_customer hierarchy
- Invite-based onboarding via magic link → set-password flow
- Role-based access control

## Pricing
SSLVault offers flexible plans. Visit /pricing for current pricing details. There is a free tier and paid plans for advanced features.

## Technical Stack
- Frontend: React + Vite hosted on Vercel
- Backend: Supabase Edge Functions
- Agent: Bash daemon on customer VPS (polls Supabase every 5 min)
- Auto-deploy on push to main branch

## Common Support Topics
- **Agent not connecting**: Check if agent service is running — run \`systemctl status sslvault-agent\`. Reinstall via /install page.
- **DNS challenge failing**: Ensure DNS provider API key has write access. Check propagation with \`dig TXT _acme-challenge.yourdomain.com\`
- **Certificate not renewing**: Check agent is online in dashboard. Verify DNS credentials are saved.
- **Auto-renewal**: Certificates renew automatically 30 days before expiry if agent is active and DNS credentials are configured.
- **KeyLocker**: Private keys are stored encrypted. Access requires password. Keys auto-hide after 30 seconds.
- **TLS Grade A+**: Requires TLS 1.2/1.3 only, strong ciphers, HSTS, no weak protocols.
- **Cloudflare setup**: Use API Token (not Global API Key). Token needs Zone:DNS:Edit permission.

## Pages / Routes
- / — Home/Landing
- /dashboard — Main dashboard (requires login)
- /certvault — Certificate inventory
- /keylocker — Private key storage
- /servers — Server management
- /install — Agent installation guide
- /dns-providers — DNS provider catalog
- /pricing — Pricing plans
- /knowledge-base — Help articles
- /buy — Purchase/issue new certificate
- /scan — Bulk domain scanner
- /caa-check — CAA record checker
- /trust-passport — Certificate trust chain
- /renewal-calendar — Upcoming renewals
- /ssl-health-score — SSL configuration grade
- /contact — Contact support
- /about — About SSLVault

## Response Style
- Be concise, helpful, and professional
- Use markdown formatting for code blocks and lists
- For account-specific questions when user is not logged in, ask them to sign in
- Always suggest the relevant page/route when applicable
- If you don't know something specific, direct user to /contact or the knowledge base
- Never make up certificate prices or specific plan details — direct to /pricing
- You are NOT a general AI assistant — stay focused on SSLVault and SSL/PKI topics`

const CHIPS_OUT = ['How does auto-renewal work?','Install agent on VPS','DNS challenge failing','What is TLS grade A+?','Connect Cloudflare DNS','What is KeyLocker?']
const CHIPS_IN  = ['List my certificates','Show expiring soon','Are my agents online?','How to buy a certificate','My DNS providers','KeyLocker help','Renewal calendar','SSL Health Score']

const G='#10b981',BG='#0a0a0a',S1='#111',S2='#1a1a1a',TX='#f0f0f0',MU='#7a7a7a',BD='rgba(255,255,255,0.08)',GB='rgba(16,185,129,0.25)'

function Av({ai}){return <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,marginTop:2,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',background:ai?'rgba(16,185,129,0.12)':'#1e293b',border:ai?'1px solid rgba(16,185,129,0.25)':'1px solid rgba(99,179,237,0.3)',color:ai?G:'#63b3ed'}}>{ai?'V':'U'}</div>}
function Bub({ai,user,children}){return <div style={{padding:'10px 14px',borderRadius:14,maxWidth:'86%',background:user?'rgba(16,185,129,0.1)':S2,border:`0.5px solid ${user?'rgba(16,185,129,0.2)':BD}`,borderBottomLeftRadius:ai?3:14,borderBottomRightRadius:user?3:14}}>{children}</div>}

export default function VaultBrain() {
  const [open,setOpen]=useState(false)
  const [msgs,setMsgs]=useState([{role:'ai',welcome:true,loggedIn:false}])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const [session,setSession]=useState(null)
  const [history,setHistory]=useState([])
  const bottomRef=useRef(null)
  const inputRef=useRef(null)
  const busyRef=useRef(false)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    setMsgs([{role:'ai',welcome:true,loggedIn:!!session}])
    setHistory([])
  },[!!session])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const send=useCallback(async(q)=>{
    q=(q||'').trim()
    if(!q||busyRef.current)return
    busyRef.current=true
    setBusy(true)
    setInput('')
    setMsgs(m=>[...m,{role:'user',text:q},{role:'ai',loading:true}])
    let answer=''
    try{
      const res=await fetch(`${SB_URL}/functions/v1/vaultbrain-agent`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${SB_ANON}`},
        body:JSON.stringify({question:q,messages:history}),
      })
      const d=await res.json()
      answer=d.ok?d.answer:(d.error||'Sorry, I could not get a response. Please try again.')
    }catch(e){
      answer='Connection error. The AI agent is temporarily unavailable. Please visit /contact for support.'
    }
    setHistory(h=>[...h,{role:'user',content:q},{role:'assistant',content:answer}].slice(-12))
    setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:answer}])
    busyRef.current=false
    setBusy(false)
    setTimeout(()=>inputRef.current?.focus(),100)
  },[session,history])

  const chips=session?CHIPS_IN:CHIPS_OUT
  const isNew=msgs.length<=1&&!busy

  return(<>
    <button onPointerDown={e=>{e.preventDefault();setOpen(o=>!o)}} aria-label="VaultBrain" style={{position:'fixed',bottom:24,right:24,zIndex:99999,width:52,height:52,borderRadius:'50%',background:open?S2:G,border:`2px solid ${open?'rgba(255,255,255,0.15)':G}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 24px ${open?'rgba(0,0,0,0.5)':'rgba(16,185,129,0.5)'}`,outline:'none',padding:0,WebkitTapHighlightColor:'transparent',touchAction:'manipulation'}}>
      {open?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>}
      <span style={{position:'absolute',top:2,right:2,width:10,height:10,borderRadius:'50%',background:G,border:'2px solid '+BG,animation:'vbpulse 2s infinite'}}/>
    </button>

    {open&&<div style={{position:'fixed',bottom:86,right:16,zIndex:99998,width:'min(390px,calc(100vw - 24px))',height:'min(580px,calc(100vh - 110px))',background:BG,border:`1px solid ${GB}`,borderRadius:18,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',touchAction:'none'}}>

      <div style={{background:S1,borderBottom:`1px solid ${BD}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(16,185,129,0.15)',border:`1.5px solid ${G}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
          <span style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:G,border:'2px solid '+S1}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:TX}}>VaultBrain</div>
          <div style={{fontSize:10,color:G}}>{session?'🔐 Logged in · AI Support Agent':'PKI expert · AI-powered support'}</div>
        </div>
        <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'rgba(16,185,129,0.1)',border:'0.5px solid rgba(16,185,129,0.2)',color:G}}>SSLVAULT</span>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:12,touchAction:'pan-y'}}>
        {msgs.map((msg,i)=>{
          if(msg.welcome)return(<div key={i} style={{display:'flex',gap:8}}><Av ai/><Bub ai><div style={{fontSize:12,fontWeight:600,color:G,marginBottom:6}}>VaultBrain — SSLVault AI Agent</div><div style={{fontSize:12.5,color:TX,lineHeight:1.7}}>{msg.loggedIn?"Hi! I'm your SSLVault AI assistant. Ask me anything about your certificates, agents, DNS setup, or any SSLVault feature.":"Hi! I'm VaultBrain, SSLVault's AI support agent. Ask me anything about SSL certificates, auto-renewal, agent setup, or any SSLVault feature."}</div></Bub></div>)
          if(msg.loading)return(<div key={i} style={{display:'flex',gap:8}}><Av ai/><Bub ai><div style={{display:'flex',gap:5,alignItems:'center',padding:'3px 0'}}>{[0,1,2].map(j=><span key={j} style={{width:7,height:7,borderRadius:'50%',background:G,display:'inline-block',animation:`vbp 1.2s ${j*0.2}s infinite`}}/>)}</div></Bub></div>)
          if(msg.role==='user')return(<div key={i} style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Bub user><span style={{fontSize:13,color:TX}}>{msg.text}</span></Bub><Av/></div>)
          return(<div key={i} style={{display:'flex',gap:8}}><Av ai/><Bub ai><div style={{fontSize:13,color:TX,lineHeight:1.75,whiteSpace:'pre-line'}}>{msg.text}</div></Bub></div>)
        })}
        <div ref={bottomRef}/>
      </div>

      {isNew&&<div style={{padding:'4px 10px 8px',display:'flex',flexWrap:'wrap',gap:5,flexShrink:0,borderTop:`0.5px solid ${BD}`}}>
        {chips.map(c=><button key={c} onPointerDown={e=>{e.preventDefault();send(c)}} style={{fontSize:11,padding:'6px 11px',borderRadius:20,cursor:'pointer',background:S2,border:`0.5px solid ${BD}`,color:MU,fontFamily:'inherit',outline:'none',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}>{c}</button>)}
      </div>}

      <div style={{padding:'10px 12px',background:S1,borderTop:`1px solid ${BD}`,display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
        <textarea ref={inputRef} value={input}
          onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'}}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)}}}
          placeholder={session?"Ask about your certs, agents, renewals…":"Ask anything about SSLVault…"}
          rows={1} disabled={busy}
          style={{flex:1,background:S2,border:`0.5px solid ${BD}`,borderRadius:8,padding:'9px 12px',color:TX,fontSize:13,fontFamily:'inherit',resize:'none',outline:'none',lineHeight:1.5,minHeight:40,maxHeight:80,opacity:busy?0.6:1}}
          onFocus={e=>e.target.style.borderColor=GB} onBlur={e=>e.target.style.borderColor=BD}/>
        <button onPointerDown={e=>{e.preventDefault();if(!busy&&input.trim())send(input)}} disabled={busy||!input.trim()}
          style={{width:40,height:40,borderRadius:8,background:busy||!input.trim()?S2:G,border:'none',cursor:busy||!input.trim()?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:busy||!input.trim()?0.4:1,outline:'none',WebkitTapHighlightColor:'transparent',touchAction:'manipulation'}}>
          {busy?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MU} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
        </button>
      </div>
    </div>}

    <style>{`@keyframes vbp{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}@keyframes vbpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}`}</style>
  </>)
}
