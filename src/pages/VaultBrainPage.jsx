// VaultBrainPage.jsx — SSLVault AI Advisor v2 — redesigned dark terminal aesthetic
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FN_URL = `${SB_URL}/functions/v1/vaultbrain-agent`
const FONT   = "'Inter',system-ui,sans-serif"
const MONO   = "'JetBrains Mono','Fira Mono',monospace"
const BLUE   = '#0077b6'
const DARK   = '#005a8a'
const TEAL   = '#3dbfb0'
const GRN    = '#00a550'

const SUGGESTED = [
  { label:'Show all my certificates',    prompt:'Show me all my certificates' },
  { label:'Fleet posture score',         prompt:'What is my fleet posture score?' },
  { label:'CA/B Forum compliance',       prompt:'Am I compliant with CA/B Forum mandates?' },
  { label:'What needs attention?',       prompt:'What needs my attention right now?' },
  { label:'Show my servers & agents',    prompt:'Show my connected servers and agents' },
  { label:'Check expiring certs',        prompt:'Which certificates expire in the next 30 days?' },
]

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight:1.75 }}>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g)
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color:'rgba(255,255,255,0.95)', fontWeight:600 }}>{p}</strong> : p
        )
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{ display:'flex', gap:8, marginBottom:3 }}>
            <span style={{ color:TEAL, flexShrink:0, marginTop:2 }}>›</span>
            <span>{rendered.slice(1)}</span>
          </div>
        }
        if (line.startsWith('# ')) return <div key={i} style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.95)', margin:'14px 0 6px' }}>{rendered.slice(1)}</div>
        if (line.startsWith('## ')) return <div key={i} style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.9)', margin:'12px 0 4px' }}>{rendered.slice(1)}</div>
        if (!line) return <div key={i} style={{ height:6 }}/>
        return <div key={i} style={{ marginBottom:2 }}>{rendered}</div>
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0' }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:TEAL, animation:`vbdot 1.2s ${i*0.18}s infinite` }}/>
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        background: isUser ? 'rgba(0,119,182,0.2)' : 'rgba(61,191,176,0.15)',
        border: `1px solid ${isUser ? 'rgba(0,119,182,0.3)' : 'rgba(61,191,176,0.25)'}`,
      }}>
        {isUser
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12a10 10 0 0 1 10-10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        }
      </div>
      {/* Bubble */}
      <div style={{ maxWidth:'80%', minWidth:0 }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontFamily:MONO, marginBottom:4, textAlign: isUser ? 'right' : 'left' }}>
          {isUser ? 'You' : 'VaultBrain'} {msg.timestamp && `· ${msg.timestamp}`}
        </div>
        <div style={{
          background: isUser ? 'rgba(0,119,182,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUser ? 'rgba(0,119,182,0.25)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding:'11px 14px',
          fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:1.7,
        }}>
          {msg.loading ? <TypingDots/> : <Markdown text={msg.text}/>}
        </div>
      </div>
    </div>
  )
}

function ConfirmCard({ pending, onConfirm, onCancel, busy }) {
  return (
    <div style={{ margin:'8px 0 16px 42px', background:'rgba(243,156,18,0.08)', border:'1px solid rgba(243,156,18,0.25)', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#f39c12', fontFamily:MONO, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
        Confirmation required
      </div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:12, lineHeight:1.65 }}>
        {pending.description || `Action: ${pending.tool}`}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onConfirm} disabled={busy} style={{ padding:'7px 16px', borderRadius:7, background:BLUE, border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
          Confirm
        </button>
        <button onClick={onCancel} style={{ padding:'7px 14px', borderRadius:7, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)', fontSize:12, cursor:'pointer', fontFamily:FONT }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function VaultBrainPage({ nav }) {
  const isMobile = useIsMobile()
  const [msgs, setMsgs]                       = useState([])
  const [input, setInput]                     = useState('')
  const [busy, setBusy]                       = useState(false)
  const [session, setSession]                 = useState(null)
  const [pendingConfirmation, setPending]     = useState(null)
  const [briefingDone, setBriefingDone]       = useState(false)
  const [pulse, setPulse]                     = useState(true)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const busyRef    = useRef(false)
  const historyRef = useRef([])

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])
  useEffect(()=>{ if(!busy) setTimeout(()=>inputRef.current?.focus(),80) },[busy])
  useEffect(()=>{ const iv=setInterval(()=>setPulse(p=>!p),1200); return()=>clearInterval(iv) },[])
  useEffect(()=>{
    if(session && !briefingDone && msgs.length===0){
      setBriefingDone(true)
      sendToAI('Give me a briefing on my certificate fleet and anything I should know.',true)
    }
  },[session])

  const now = ()=>new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
  const addMsg = msg=>setMsgs(m=>[...m,msg])
  const replaceLastMsg = msg=>setMsgs(m=>[...m.slice(0,-1),msg])

  const sendToAI = useCallback(async(text,isAuto=false)=>{
    if(busyRef.current) return
    busyRef.current=true; setBusy(true); setPending(null)
    if(!isAuto){ addMsg({role:'user',text,timestamp:now()}); historyRef.current.push({role:'user',content:text}) }
    addMsg({role:'ai',loading:true})
    try {
      const {data:{session:s}} = await supabase.auth.getSession()
      if(!s?.access_token){ replaceLastMsg({role:'ai',text:'Sign in to use VaultBrain.',timestamp:now()}); return }
      const res = await fetch(FN_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:s.access_token, messages:historyRef.current, ...(isAuto&&{messages:[{role:'user',content:text}]})}),
      })
      const data = await res.json()
      if(!data.ok){ replaceLastMsg({role:'ai',text:`Error: ${data.error}`,timestamp:now()}); return }
      replaceLastMsg({role:'ai',text:data.answer,timestamp:now()})
      historyRef.current.push({role:'assistant',content:data.answer})
      if(data.pending_confirmation) setPending(data.pending_confirmation)
    } catch(e){ replaceLastMsg({role:'ai',text:`Connection error: ${e.message}`,timestamp:now()}) }
    finally{ busyRef.current=false; setBusy(false) }
  },[])

  const handleConfirm = useCallback(async()=>{
    if(!pendingConfirmation||busyRef.current) return
    busyRef.current=true; setBusy(true)
    addMsg({role:'user',text:'Yes, go ahead.',timestamp:now()})
    historyRef.current.push({role:'user',content:'Yes, go ahead.'})
    addMsg({role:'ai',loading:true}); setPending(null)
    try {
      const {data:{session:s}} = await supabase.auth.getSession()
      const res = await fetch(FN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:s.access_token,messages:historyRef.current,confirmed_action:{tool:pendingConfirmation.tool,confirmed:true}})})
      const data = await res.json()
      const answer = data.ok ? data.answer : `Action failed: ${data.error}`
      replaceLastMsg({role:'ai',text:answer,timestamp:now()})
      historyRef.current.push({role:'assistant',content:answer})
    } catch(e){ replaceLastMsg({role:'ai',text:`Error: ${e.message}`,timestamp:now()}) }
    finally{ busyRef.current=false; setBusy(false) }
  },[pendingConfirmation])

  const handleCancel = useCallback(()=>{
    setPending(null)
    addMsg({role:'ai',text:'Action cancelled. Let me know if you need anything else.',timestamp:now()})
  },[])

  const handleSend = useCallback(()=>{
    const q=input.trim(); if(!q||busyRef.current) return
    setInput(''); sendToAI(q)
  },[input,sendToAI])

  const isBlank = msgs.length===0 && !busy

  return (
    <div style={{fontFamily:FONT, minHeight:'100vh', background:'#0a1628', color:'rgba(255,255,255,0.8)'}}>
      <style>{`
        @keyframes vbdot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes vbpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes vbspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .vb-suggest:hover{background:rgba(255,255,255,0.08)!important;border-color:rgba(61,191,176,0.3)!important}
        .vb-send:hover{background:#0091d6!important}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:'#0f1923',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 24px',height:54,display:'flex',alignItems:'center',gap:14,position:'sticky',top:0,zIndex:50}}>
        <button onClick={()=>nav('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',gap:5,fontSize:12,fontFamily:FONT,padding:0,transition:'color .12s'}}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Dashboard
        </button>
        <div style={{width:1,height:18,background:'rgba(255,255,255,0.08)'}}/>
        {/* Brain icon */}
        <div style={{width:34,height:34,borderRadius:9,background:'rgba(61,191,176,0.12)',border:'1px solid rgba(61,191,176,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#fff',letterSpacing:'-0.2px'}}>VaultBrain</div>
          <div style={{fontSize:10,color:session?TEAL:'rgba(255,255,255,0.3)',marginTop:1,display:'flex',alignItems:'center',gap:4,fontFamily:MONO}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:session?TEAL:'rgba(255,255,255,0.2)',opacity:session?(pulse?1:.25):1,transition:'opacity 0.4s'}}/>
            {session?'Connected · live data':'Not signed in'}
          </div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          {busy&&(
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:TEAL,fontFamily:MONO}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:TEAL,animation:'vbpulse 1s infinite'}}/>
              Thinking…
            </div>
          )}
          <span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'rgba(61,191,176,0.1)',color:TEAL,border:'1px solid rgba(61,191,176,0.2)',textTransform:'uppercase',letterSpacing:'.06em',fontFamily:MONO}}>AI Advisor</span>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{maxWidth:780,margin:'0 auto',padding:`0 ${isMobile?'14px':'20px'} 120px`}}>

        {/* Welcome screen */}
        {isBlank&&(
          <div style={{padding:'56px 20px 32px',textAlign:'center'}}>
            {/* Terminal-style icon */}
            <div style={{width:64,height:64,borderRadius:16,background:'rgba(61,191,176,0.1)',border:'2px solid rgba(61,191,176,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/>
              </svg>
            </div>
            <div style={{fontSize:10,letterSpacing:'.14em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',fontFamily:MONO,marginBottom:10}}>SSLVault · AI Advisor</div>
            <h1 style={{fontSize:isMobile?22:28,fontWeight:600,color:'#fff',margin:'0 0 10px',letterSpacing:'-0.5px'}}>Your PKI Advisor</h1>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',maxWidth:440,margin:'0 auto 28px',lineHeight:1.7}}>
              VaultBrain has live access to your certificates. Ask anything — it reads your fleet, checks compliance, and takes actions on your behalf.
            </p>

            {/* Sign in alert */}
            {!session&&(
              <div style={{background:'rgba(243,156,18,0.08)',border:'1px solid rgba(243,156,18,0.2)',borderRadius:10,padding:'12px 18px',display:'inline-flex',alignItems:'center',gap:12,marginBottom:28,fontSize:12,color:'#f39c12',fontFamily:MONO}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Sign in to connect VaultBrain to your certificate data
                <button onClick={()=>nav('/auth')} style={{marginLeft:4,background:BLUE,color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>Sign in</button>
              </div>
            )}

            {/* Suggested prompt grid */}
            <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?'140px':'190px'},1fr))`,gap:8,maxWidth:620,margin:'0 auto'}}>
              {SUGGESTED.map(s=>(
                <button key={s.prompt} className="vb-suggest" onClick={()=>sendToAI(s.prompt)} disabled={!session}
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 13px',cursor:session?'pointer':'not-allowed',fontFamily:FONT,fontSize:12,color:session?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.25)',textAlign:'left',opacity:session?1:.5,transition:'all .15s',lineHeight:1.4}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading briefing */}
        {session&&msgs.length===0&&busy&&(
          <div style={{textAlign:'center',padding:'80px 20px'}}>
            <div style={{width:48,height:48,borderRadius:12,background:'rgba(61,191,176,0.1)',border:'1px solid rgba(61,191,176,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" style={{animation:'vbspin 1.2s linear infinite'}}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontFamily:MONO}}>Reading your certificate fleet…</div>
            <div style={{display:'flex',gap:5,justifyContent:'center',marginTop:12}}>
              {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:'50%',background:TEAL,display:'inline-block',animation:`vbdot 1.2s ${i*0.18}s infinite`}}/>)}
            </div>
          </div>
        )}

        {/* Messages */}
        {msgs.length>0&&(
          <div style={{paddingTop:24}}>
            {msgs.map((msg,i)=>(
              <div key={i}>
                <Message msg={msg}/>
                {!msg.loading&&msg.role==='ai'&&i===msgs.length-1&&pendingConfirmation&&(
                  <ConfirmCard pending={pendingConfirmation} onConfirm={handleConfirm} onCancel={handleCancel} busy={busy}/>
                )}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        )}

        {/* Quick actions after conversation */}
        {msgs.length>1&&!busy&&!pendingConfirmation&&(
          <div style={{marginTop:8,marginBottom:8,paddingLeft:42}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginBottom:6,fontFamily:MONO}}>Quick actions:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {SUGGESTED.slice(0,4).map(s=>(
                <button key={s.prompt} className="vb-suggest" onClick={()=>sendToAI(s.prompt)}
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'5px 12px',cursor:'pointer',fontFamily:FONT,fontSize:11,color:'rgba(255,255,255,0.4)',transition:'all .15s'}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:20,background:'#0f1923',borderTop:'1px solid rgba(255,255,255,0.07)',padding:'12px 16px 18px'}}>
        <div style={{maxWidth:780,margin:'0 auto',display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1,position:'relative'}}>
            <textarea ref={inputRef} value={input}
              onChange={e=>{ setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
              placeholder={pendingConfirmation?'Confirm above or type to cancel…':session?'Ask about your certs, compliance, or request an action…':'Sign in to use VaultBrain…'}
              rows={1} disabled={busy||!session}
              style={{width:'100%',boxSizing:'border-box',background:'rgba(255,255,255,0.05)',border:`1px solid ${input?'rgba(61,191,176,0.35)':'rgba(255,255,255,0.1)'}`,borderRadius:10,padding:'11px 14px',color:'rgba(255,255,255,0.85)',fontSize:13,fontFamily:FONT,resize:'none',outline:'none',lineHeight:1.5,minHeight:44,maxHeight:120,opacity:!session?.5:1,transition:'border-color .15s'}}
            />
          </div>
          <button className="vb-send" onClick={handleSend} disabled={busy||!input.trim()||!session}
            style={{width:44,height:44,borderRadius:10,border:'none',background:busy||!input.trim()||!session?'rgba(255,255,255,0.06)':BLUE,cursor:busy||!input.trim()||!session?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:busy||!input.trim()||!session?.35:1,transition:'all .15s'}}>
            {busy
              ? <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'vbspin 0.8s linear infinite'}}/>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            }
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:7,fontSize:10,color:'rgba(255,255,255,0.2)',fontFamily:MONO}}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
