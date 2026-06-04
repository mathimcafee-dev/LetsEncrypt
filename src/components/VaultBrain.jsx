import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const RAG_URL = 'https://ai.easysecurity.in/rag'

const CHIPS_OUT = ['How does auto-renewal work?','Install agent on VPS','DNS challenge failing','What is TLS grade A+?','Connect Cloudflare DNS','What is KeyLocker?']
const CHIPS_IN  = ['List my certificates','Show expiring soon','Are my agents online?','How to issue a certificate','My DNS providers','KeyLocker help']

const G='#1f5c4e',BG='transparent',S1='transparent',S2='transparent',TX='rgba(0,0,0,0.05)',MU='#7a7a7a',BD='rgba(0,0,0,0.06)',GB='rgba(16,185,129,0.25)'

function Av({ai}){return <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,marginTop:2,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',background:ai?'rgba(16,185,129,0.12)':'transparent',border:ai?'1px solid rgba(16,185,129,0.25)':'1px solid rgba(99,179,237,0.3)',color:ai?G:'#63b3ed'}}>{ai?'V':'U'}</div>}
function Bub({ai,user,children}){return <div style={{padding:'10px 14px',borderRadius:14,maxWidth:'86%',background:user?'rgba(16,185,129,0.1)':S2,border:`0.5px solid ${user?'rgba(16,185,129,0.2)':BD}`,borderBottomLeftRadius:ai?3:14,borderBottomRightRadius:user?3:14}}>{children}</div>}

// Intent detection
function detectIntent(q) {
  const lower = q.toLowerCase()
  if (/my cert|list cert|show cert|all cert|certif/.test(lower)) return 'list_certs'
  if (/expir|renew soon|expiring/.test(lower)) return 'expiring'
  if (/agent|server|connect|online|offline/.test(lower)) return 'agents'
  if (/keylock|private key|my key/.test(lower)) return 'keylocker'
  if (/dns provider|cloudflare|route53|namecheap/.test(lower)) return 'dns'
  return 'rag'
}

// Format date
function fmtDate(d) {
  if (!d) return 'unknown'
  const date = new Date(d)
  const days = Math.ceil((date - new Date()) / 86400000)
  const str = date.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})
  if (days < 0) return `${str} ⛔ expired`
  if (days < 14) return `${str} 🔴 ${days}d left`
  if (days < 30) return `${str} 🟡 ${days}d left`
  return `${str} ✅ ${days}d left`
}

export default function SpartansBrain() {
  const [open,setOpen]=useState(false)
  const [msgs,setMsgs]=useState([{role:'ai',welcome:true,loggedIn:false}])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const [session,setSession]=useState(null)
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
  },[!!session])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  // Supabase queries
  async function fetchCerts() {
    const {data,error} = await supabase
      .from('certificates')
      .select('domain,expiry_date,status,issuer')
      .order('expiry_date',{ascending:true})
      .limit(10)
    if (error || !data?.length) return "You don't have any certificates yet. Issue your first one at /buy."
    const lines = data.map(c=>`• **${c.domain}** — expires ${fmtDate(c.expiry_date)} (${c.status||'active'})`)
    return `You have **${data.length}** certificate${data.length>1?'s':''}:\n\n${lines.join('\n')}\n\nView all at /certvault`
  }

  async function fetchExpiring() {
    const soon = new Date(); soon.setDate(soon.getDate()+30)
    const {data,error} = await supabase
      .from('certificates')
      .select('domain,expiry_date,status')
      .lt('expiry_date', soon.toISOString())
      .order('expiry_date',{ascending:true})
      .limit(10)
    if (error || !data?.length) return "✅ No certificates expiring in the next 30 days. You're all good!"
    const lines = data.map(c=>`• **${c.domain}** — ${fmtDate(c.expiry_date)}`)
    return `⚠️ **${data.length}** certificate${data.length>1?'s expire':'expires'} within 30 days:\n\n${lines.join('\n')}\n\nRenew at /certvault`
  }

  async function fetchAgents() {
    const {data,error} = await supabase
      .from('persistent_agents')
      .select('hostname,status,last_seen,ip_address')
      .order('last_seen',{ascending:false})
      .limit(10)
    if (error || !data?.length) return "No agents installed yet. Install one at /install."
    const lines = data.map(a=>{
      const mins = a.last_seen ? Math.floor((new Date()-new Date(a.last_seen))/60000) : null
      const status = mins===null ? '❓ unknown' : mins < 10 ? '🟢 online' : mins < 60 ? `🟡 ${mins}m ago` : `🔴 offline (${Math.floor(mins/60)}h ago)`
      return `• **${a.hostname||a.ip_address}** — ${status}`
    })
    return `You have **${data.length}** agent${data.length>1?'s':''}:\n\n${lines.join('\n')}\n\nView all at /agent-health`
  }

  async function fetchDNS() {
    const {data,error} = await supabase
      .from('dns_providers')
      .select('provider_name,domain,created_at')
      .limit(10)
    if (error || !data?.length) return "No DNS providers configured yet. Add one at /dns-providers for auto-renewal."
    const lines = data.map(d=>`• **${d.provider_name}** — ${d.domain}`)
    return `You have **${data.length}** DNS provider${data.length>1?'s':''}:\n\n${lines.join('\n')}\n\nManage at /dns-providers`
  }

  async function fetchKeylocker() {
    const {data,error} = await supabase
      .from('key_locker')
      .select('domain,created_at')
      .limit(10)
    if (error || !data?.length) return "No private keys stored in KeyLocker yet. Keys are stored automatically when you issue certificates."
    const lines = data.map(k=>`• **${k.domain}**`)
    return `You have **${data.length}** private key${data.length>1?'s':''}  stored in KeyLocker:\n\n${lines.join('\n')}\n\nAccess at /keylocker (password required)`
  }

  async function askRAG(q) {
    const res = await fetch(RAG_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question:q}),
    })
    const d = await res.json()
    return d.ok ? d.answer : 'Sorry, I could not get a response. Please try again.'
  }

  const send=useCallback(async(q)=>{
    q=(q||'').trim()
    if(!q||busyRef.current)return
    busyRef.current=true
    setBusy(true)
    setInput('')
    setMsgs(m=>[...m,{role:'user',text:q},{role:'ai',loading:true}])

    let answer=''
    try{
      const intent = session ? detectIntent(q) : 'rag'
      if (intent==='list_certs') answer = await fetchCerts()
      else if (intent==='expiring') answer = await fetchExpiring()
      else if (intent==='agents') answer = await fetchAgents()
      else if (intent==='dns') answer = await fetchDNS()
      else if (intent==='keylocker') answer = await fetchKeylocker()
      else answer = await askRAG(q)
    }catch(e){
      answer='Connection error. The AI agent is temporarily unavailable. Please visit /contact for support.'
    }

    setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:answer}])
    busyRef.current=false
    setBusy(false)
    setTimeout(()=>inputRef.current?.focus(),100)
  },[session])

  const chips=session?CHIPS_IN:CHIPS_OUT
  const isNew=msgs.length<=1&&!busy

  return(<>
    <button onPointerDown={e=>{e.preventDefault();setOpen(o=>!o)}} aria-label="Spartan's Brain" style={{position:'fixed',bottom:24,right:24,zIndex:99999,width:52,height:52,borderRadius:'50%',background:open?S2:G,border:`2px solid ${open?'#cccccc':G}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 24px ${open?'rgba(0,0,0,0.5)':'rgba(16,185,129,0.5)'}`,outline:'none',padding:0,WebkitTapHighlightColor:'transparent',touchAction:'manipulation'}}>
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
          <div style={{fontSize:13,fontWeight:600,color:TX}}>Spartan's Brain</div>
          <div style={{fontSize:10,color:G}}>{session?'🔐 Connected to your account · AI Support':'PKI expert · AI-powered support'}</div>
        </div>
        <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',color:G}}>SSLVAULT</span>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:12,touchAction:'pan-y'}}>
        {msgs.map((msg,i)=>{
          if(msg.welcome)return(<div key={i} style={{display:'flex',gap:8}}><Av ai/><Bub ai><div style={{fontSize:12,fontWeight:600,color:G,marginBottom:6}}>Spartan's Brain — SSLVault AI Agent</div><div style={{fontSize:12.5,color:TX,lineHeight:1.7}}>{msg.loggedIn?"Hi! I'm Spartan's Brain, connected to your account. Ask me about your certificates, agents, DNS providers, or any PKI question.":"Hi! I'm Spartan's Brain, SSLVault's AI support agent. Ask me anything about SSL certificates, auto-renewal, agent setup, or any SSLVault feature."}</div></Bub></div>)
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
          placeholder={session?"Ask about your certs, agents, or any PKI question…":"Ask anything about SSLVault or PKI…"}
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
