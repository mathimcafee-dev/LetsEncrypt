// VaultBrainPanel.jsx — Right-side inline panel, no backdrop, no modal
// Sits as a third flex column beside the dashboard content
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FN_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/vaultbrain-agent'

const CHIPS = [
  'What needs attention?',
  'My posture score',
  'CA/B compliance',
  'Expiring soon',
]

function clean(t) {
  return (t||'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/`(.*?)`/g,'$1')
}

function MsgText({ text }) {
  return (
    <div style={{ fontSize:12.5, lineHeight:1.7, color:'#ddd8d3' }}>
      {clean(text).split('\n').map((line,i) => {
        if (!line.trim()) return <div key={i} style={{height:4}}/>
        const b = /^[-•]\s/.test(line.trimStart())
        return (
          <div key={i} style={{display:'flex',gap:6,marginBottom:1}}>
            {b && <span style={{color:'#1f5c4e',flexShrink:0}}>•</span>}
            <span>{b ? line.trimStart().replace(/^[-•]\s/,'') : line}</span>
          </div>
        )
      })}
    </div>
  )
}

function Dots() {
  return (
    <div style={{display:'flex',gap:4,alignItems:'center',padding:'3px 0'}}>
      {[0,1,2].map(i=>(
        <span key={i} style={{
          width:5,height:5,borderRadius:'50%',background:'#1f5c4e',display:'inline-block',
          animation:`vbdot 1.1s ${i*0.17}s infinite ease-in-out`
        }}/>
      ))}
    </div>
  )
}

export default function VaultBrainPanel({ open, onClose, session }) {
  const [msgs,  setMsgs]  = useState([])
  const [input, setInput] = useState('')
  const [busy,  setBusy]  = useState(false)
  const [pend,  setPend]  = useState(null)
  const [started,setStart]= useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const busyRef   = useRef(false)
  const histRef   = useRef([])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  useEffect(()=>{
    if (!open) { setStart(false); return }
    setTimeout(()=>inputRef.current?.focus(), 200)
    if (session && !started && msgs.length===0) {
      setStart(true)
      send('Give me a quick briefing on my certificate fleet.', true)
    }
  }, [open])

  function ts(){ return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) }

  const send = useCallback(async (text, auto=false) => {
    if (busyRef.current) return
    busyRef.current=true; setBusy(true); setPend(null)
    if (!auto) {
      setMsgs(m=>[...m,{role:'user',text,ts:ts()}])
      histRef.current.push({role:'user',content:text})
    }
    setMsgs(m=>[...m,{role:'ai',loading:true}])
    try {
      const {data:{session:s}} = await supabase.auth.getSession()
      if (!s?.access_token) {
        setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:'Please sign in.',ts:ts()}]); return
      }
      const res = await fetch(FN_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          token: s.access_token,
          messages: auto ? [{role:'user',content:text}] : histRef.current,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:`Error: ${data.error}`,ts:ts(),err:true}]); return
      }
      setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:data.answer,ts:ts()}])
      histRef.current.push({role:'assistant',content:data.answer})
      if (data.pending_confirmation) setPend(data.pending_confirmation)
    } catch(e) {
      setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:'Connection error.',ts:ts(),err:true}])
    } finally { busyRef.current=false; setBusy(false); setTimeout(()=>inputRef.current?.focus(),80) }
  },[])

  const confirm = useCallback(async () => {
    if (!pend||busyRef.current) return
    const p=pend; setPend(null); busyRef.current=true; setBusy(true)
    setMsgs(m=>[...m,{role:'user',text:'Yes, go ahead.',ts:ts()}])
    histRef.current.push({role:'user',content:'Yes, go ahead.'})
    setMsgs(m=>[...m,{role:'ai',loading:true}])
    try {
      const {data:{session:s}} = await supabase.auth.getSession()
      const res = await fetch(FN_URL,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({token:s.access_token,messages:histRef.current,confirmed_action:{tool:p.tool,confirmed:true}}),
      })
      const data = await res.json()
      const answer = data.ok ? data.answer : `Failed: ${data.error}`
      setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:answer,ts:ts()}])
      histRef.current.push({role:'assistant',content:answer})
    } catch(e) {
      setMsgs(m=>[...m.slice(0,-1),{role:'ai',text:e.message,ts:ts(),err:true}])
    } finally { busyRef.current=false; setBusy(false) }
  },[pend])

  const submit = useCallback(()=>{
    const q=input.trim(); if(!q||busyRef.current)return
    setInput(''); send(q)
  },[input,send])

  if (!open) return null

  return (
    <div style={{
      width:300, flexShrink:0,
      borderLeft:'1px solid rgba(0,0,0,0.08)',
      background:'rgba(0,0,0,0.45)',
      display:'flex', flexDirection:'column',
      height:'calc(100vh - 50px)',
      position:'sticky', top:50,
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:'12px 14px 10px',
        borderBottom:'1px solid rgba(0,0,0,0.04)',
        display:'flex', alignItems:'center', gap:8, flexShrink:0,
      }}>
        <span style={{fontSize:15}}>🧠</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#111111'}}>VaultBrain</div>
          <div style={{fontSize:10,color:session?'#16a068':'#b0a8a0'}}>
            {session ? '● Gemini AI · Live' : '○ Not signed in'}
          </div>
        </div>
        <div style={{display:'flex',gap:5}}>
          {msgs.length>0&&!busy&&(
            <button onClick={()=>{setMsgs([]);histRef.current=[];setStart(false);setPend(null)}} style={{
              background:'none',border:'1px solid rgba(0,0,0,0.05)',
              borderRadius:5,cursor:'pointer',color:'#888888',fontSize:10,padding:'3px 7px',fontFamily:'inherit',
            }}>Clear</button>
          )}
          <button onClick={onClose} style={{
            background:'none',border:'1px solid rgba(0,0,0,0.05)',
            borderRadius:5,cursor:'pointer',color:'#888888',
            width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages / empty state */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 12px 6px',minHeight:0}}>

        {/* Empty — chips */}
        {msgs.length===0 && !busy && (
          <div>
            <div style={{fontSize:10,color:'#bbbbbb',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              Suggested
            </div>
            {CHIPS.map(c=>(
              <button key={c} onClick={()=>session&&send(c)} disabled={!session} style={{
                display:'block',width:'100%',textAlign:'left',
                background:'rgba(0,0,0,0.02)',border:'1px solid rgba(0,0,0,0.05)',
                borderRadius:8,padding:'8px 11px',cursor:session?'pointer':'not-allowed',
                fontFamily:'inherit',fontSize:12.5,color:'#c8c4c0',marginBottom:5,
                opacity:session?1:0.4,transition:'background .1s,border-color .1s',
              }}
              onMouseEnter={e=>{if(session){e.currentTarget.style.background='rgba(31,92,78,0.07)';e.currentTarget.style.borderColor='rgba(0,0,0,0.1)'}}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.02)';e.currentTarget.style.borderColor='rgba(0,0,0,0.05)'}}>
                <span style={{color:'rgba(31,92,78,0.3)',marginRight:6}}>›</span>{c}
              </button>
            ))}
          </div>
        )}

        {/* Loading initial */}
        {msgs.length===0 && busy && (
          <div style={{textAlign:'center',paddingTop:20,color:'#888888'}}>
            <div style={{fontSize:11,marginBottom:8}}>Reading your fleet…</div>
            <div style={{display:'flex',justifyContent:'center'}}><Dots/></div>
          </div>
        )}

        {/* Messages */}
        {msgs.map((msg,i)=>(
          <div key={i}>
            {msg.role==='user'&&(
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
                <div style={{
                  maxWidth:'85%',background:'rgba(31,92,78,0.08)',
                  border:'1px solid rgba(31,92,78,0.12)',
                  borderRadius:'8px 8px 2px 8px',padding:'7px 10px',
                }}>
                  <div style={{fontSize:12.5,color:'#111111'}}>{msg.text}</div>
                  <div style={{fontSize:9,color:'#aaaaaa',marginTop:2,textAlign:'right'}}>{msg.ts}</div>
                </div>
              </div>
            )}
            {msg.role==='ai'&&(
              <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'flex-start'}}>
                <div style={{
                  width:20,height:20,borderRadius:'50%',flexShrink:0,marginTop:1,
                  background:'rgba(31,92,78,0.08)',border:'1px solid rgba(31,92,78,0.22)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,
                }}>🧠</div>
                <div style={{
                  flex:1,background:'rgba(0,0,0,0.02)',
                  border:`1px solid ${msg.err?'rgba(192,57,43,0.12)':'rgba(0,0,0,0.05)'}`,
                  borderRadius:'2px 8px 8px 8px',padding:'8px 10px',
                }}>
                  {msg.loading ? <Dots/> : (
                    <>
                      <div style={{color:msg.err?'#1f5c4e':'inherit'}}><MsgText text={msg.text}/></div>
                      {msg.ts&&<div style={{fontSize:9,color:'#bbbbbb',marginTop:3}}>{msg.ts}</div>}
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Confirm card */}
            {msg.role==='ai'&&!msg.loading&&i===msgs.length-1&&pend&&(
              <div style={{
                marginLeft:26,marginBottom:8,
                background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.18)',
                borderRadius:8,padding:'10px 12px',
              }}>
                <div style={{fontSize:11,color:'#9a6400',fontWeight:600,marginBottom:6}}>⚡ Confirm</div>
                <div style={{fontSize:12,color:'#ddd9d4',marginBottom:8,lineHeight:1.5}}>{pend.message}</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={confirm} disabled={busy} style={{
                    background:'#1f5c4e',color:'#fff',border:'none',
                    borderRadius:6,padding:'5px 12px',cursor:busy?'wait':'pointer',
                    fontSize:11,fontWeight:600,fontFamily:'inherit',
                  }}>{busy?'⏳ Working…':'✅ Go ahead'}</button>
                  <button onClick={()=>{setPend(null);setMsgs(m=>[...m,{role:'ai',text:'Cancelled.',ts:ts()}])}} disabled={busy} style={{
                    background:'none',border:'1px solid rgba(0,0,0,0.07)',
                    borderRadius:6,padding:'5px 10px',cursor:'pointer',
                    fontSize:11,color:'#888888',fontFamily:'inherit',
                  }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Quick chips */}
      {msgs.length>1&&!busy&&!pend&&(
        <div style={{padding:'4px 12px 6px',display:'flex',flexWrap:'wrap',gap:4,flexShrink:0,borderTop:'1px solid rgba(0,0,0,0.03)'}}>
          {CHIPS.slice(0,3).map(c=>(
            <button key={c} onClick={()=>send(c)} style={{
              background:'rgba(0,0,0,0.02)',border:'1px solid rgba(0,0,0,0.05)',
              borderRadius:20,padding:'3px 9px',cursor:'pointer',
              fontFamily:'inherit',fontSize:10.5,color:'#888888',
              transition:'color .1s,border-color .1s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='#111111';e.currentTarget.style.borderColor='rgba(0,0,0,0.1)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#b0a8a0';e.currentTarget.style.borderColor='rgba(0,0,0,0.05)'}}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{padding:'8px 10px 10px',borderTop:'1px solid rgba(0,0,0,0.04)',flexShrink:0}}>
        <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'}}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}}}
            placeholder={session?'Ask anything…':'Sign in to use VaultBrain…'}
            rows={1} disabled={busy||!session}
            style={{
              flex:1,background:'rgba(0,0,0,0.03)',
              border:`1px solid ${input?'rgba(0,0,0,0.1)':'rgba(0,0,0,0.06)'}`,
              borderRadius:8,padding:'7px 10px',
              color:'#111111',fontSize:12.5,fontFamily:'inherit',
              resize:'none',outline:'none',lineHeight:1.5,
              minHeight:34,maxHeight:80,opacity:!session?0.5:1,
            }}
          />
          <button onClick={submit} disabled={busy||!input.trim()||!session} style={{
            width:32,height:32,borderRadius:8,border:'none',flexShrink:0,
            background:busy||!input.trim()||!session?'rgba(0,0,0,0.04)':'#1f5c4e',
            cursor:busy||!input.trim()||!session?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            opacity:busy||!input.trim()||!session?0.4:1,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`@keyframes vbdot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}
