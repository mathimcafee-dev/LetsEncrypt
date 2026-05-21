import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL  = 'https://frthcwkntciaakqsppss.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.VN3soDSl8cMOnjaj8n2wSujTLsr9-4ptH5hYxiJCgHQ'

const CHIPS_OUT = ['How does auto-renewal work?','Install agent on VPS','DNS challenge failing','What is TLS grade A?','Connect Cloudflare DNS','What is KeyLocker?']
const CHIPS_IN  = ['List my certificates','Show expiring soon','Are my agents online?','Show active orders','My DNS providers','Show API keys','Recent audit log','My account plan']

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
      const token=session?.access_token||null
      const res=await fetch(`${SB_URL}/functions/v1/vaultbrain-agent`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${SB_ANON}`},
        body:JSON.stringify({question:q,messages:history,token}),
      })
      const d=await res.json()
      answer=d.ok?d.answer:(d.error||'Something went wrong.')
    }catch(e){answer='Connection error. Please try again.'}
    setHistory(h=>[...h,{role:'user',content:q},{role:'assistant',content:answer}].slice(-12))
    setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:answer}])
    busyRef.current=false
    setBusy(false)
    setTimeout(()=>inputRef.current?.focus(),100)
  },[session,history])

  const chips=session?CHIPS_IN:CHIPS_OUT
  const isNew=msgs.length<=1&&!busy

  return(<>
    <button onPointerDown={e=>{e.preventDefault();setOpen(o=>!o)}} aria-label="VaultBrain" style={{position:'fixed',bottom:24,right:24,zIndex:99999,width:52,height:52,borderRadius:'50%',background:open?S2:G,border:`2px solid ${open?'rgba(255,255,255,0.15)':G}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 24px ${open?'rgba(0,0,0,0.5)':'rgba(16,185,129,0.5)'}`,outline:'none',padding:0,WebkitTapHighlightColor:'transparent',touchAction:'manipulation',position:'fixed'}}>
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
          <div style={{fontSize:10,color:G}}>{session?'🔐 Logged in · Live data access':'PKI expert · Sign in for live data'}</div>
        </div>
        <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'rgba(16,185,129,0.1)',border:'0.5px solid rgba(16,185,129,0.2)',color:G}}>SSLVAULT</span>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column',gap:12,touchAction:'pan-y'}}>
        {msgs.map((msg,i)=>{
          if(msg.welcome)return(<div key={i} style={{display:'flex',gap:8}}><Av ai/><Bub ai><div style={{fontSize:12,fontWeight:600,color:G,marginBottom:6}}>{msg.loggedIn?'VaultBrain — Live Agent':'VaultBrain — SSLVault Expert'}</div><div style={{fontSize:12.5,color:TX,lineHeight:1.7}}>{msg.loggedIn?"I have access to your live account. Ask me anything — certificates, orders, agents, API keys, audit logs, and more.":"Ask me anything about SSL, PKI, and SSLVault. Sign in to get live answers about your account."}</div></Bub></div>)
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
          placeholder={session?"Ask about your certs, orders, agents…":"Ask anything about SSLVault…"}
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
