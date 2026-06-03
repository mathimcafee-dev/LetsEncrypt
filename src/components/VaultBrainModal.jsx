// VaultBrainModal.jsx — Spotlight-style AI command modal
// Triggered by clicking the thin bar in Dashboard header
// Zero impact on dashboard layout when closed
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FN_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/vaultbrain-agent'

const CHIPS = [
  'What needs attention?',
  'Fleet posture score',
  'CA/B compliance check',
  'Show expiring certs',
  'List my agents',
]

function clean(text) {
  return (text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
}

function MsgText({ text }) {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
      {clean(text).split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 5 }} />
        const bullet = /^[-•]\s/.test(line.trimStart())
        return (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 1 }}>
            {bullet && <span style={{ color: '#c0392b', flexShrink: 0, lineHeight: 1.7 }}>•</span>}
            <span>{bullet ? line.trimStart().replace(/^[-•]\s/, '') : line}</span>
          </div>
        )
      })}
    </div>
  )
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#c0392b',
          display: 'inline-block',
          animation: `vbdot 1.1s ${i*0.17}s infinite ease-in-out`,
        }}/>
      ))}
    </div>
  )
}

export default function VaultBrainModal({ open, onClose, session }) {
  const [msgs, setMsgs]     = useState([])
  const [input, setInput]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [pending, setPend]  = useState(null)
  const [started, setStart] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const busyRef   = useRef(false)
  const histRef   = useRef([])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 120)
    if (session && !started && msgs.length === 0) {
      setStart(true)
      send('Give me a quick briefing on my certificate fleet.', true)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  function ts() { return new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) }

  const send = useCallback(async (text, auto = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setPend(null)
    if (!auto) {
      setMsgs(m => [...m, { role:'user', text, ts: ts() }])
      histRef.current.push({ role:'user', content: text })
    }
    setMsgs(m => [...m, { role:'ai', loading: true }])
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s?.access_token) {
        setMsgs(m => [...m.slice(0,-1), { role:'ai', text:'Please sign in to use VaultBrain.', ts: ts() }])
        return
      }
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s.access_token,
          messages: auto ? [{ role:'user', content: text }] : histRef.current,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMsgs(m => [...m.slice(0,-1), { role:'ai', text:`Error: ${data.error}`, ts: ts(), err: true }])
        return
      }
      setMsgs(m => [...m.slice(0,-1), { role:'ai', text: data.answer, ts: ts() }])
      histRef.current.push({ role:'assistant', content: data.answer })
      if (data.pending_confirmation) setPend(data.pending_confirmation)
    } catch(e) {
      setMsgs(m => [...m.slice(0,-1), { role:'ai', text:`Connection error. Try again.`, ts: ts(), err: true }])
    } finally {
      busyRef.current = false
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [])

  const confirm = useCallback(async () => {
    if (!pending || busyRef.current) return
    const p = pending; setPend(null)
    busyRef.current = true; setBusy(true)
    setMsgs(m => [...m, { role:'user', text:'Yes, go ahead.', ts: ts() }])
    histRef.current.push({ role:'user', content:'Yes, go ahead.' })
    setMsgs(m => [...m, { role:'ai', loading: true }])
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: s.access_token, messages: histRef.current, confirmed_action: { tool: p.tool, confirmed: true } }),
      })
      const data = await res.json()
      const answer = data.ok ? data.answer : `Failed: ${data.error}`
      setMsgs(m => [...m.slice(0,-1), { role:'ai', text: answer, ts: ts() }])
      histRef.current.push({ role:'assistant', content: answer })
    } catch(e) {
      setMsgs(m => [...m.slice(0,-1), { role:'ai', text: e.message, ts: ts(), err: true }])
    } finally { busyRef.current = false; setBusy(false) }
  }, [pending])

  const submit = useCallback(() => {
    const q = input.trim()
    if (!q || busyRef.current) return
    setInput(''); send(q)
  }, [input, send])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '8vh', left: '50%', transform: 'translateX(-50%)',
        width: 'min(640px, 96vw)', maxHeight: '80vh',
        zIndex: 2001,
        background: 'linear-gradient(160deg,#1c0404 0%,#120000 100%)',
        border: '1px solid rgba(192,57,43,0.35)',
        borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(192,57,43,0.1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'vbmodalin .18s cubic-bezier(.16,1,.3,1)',
      }}>

        {/* Top bar — input always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 16px',
          borderBottom: msgs.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🧠</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder={session ? 'Ask VaultBrain anything about your certificates…' : 'Sign in to use VaultBrain…'}
            disabled={busy || !session}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#f0ede8', fontSize: 15, fontFamily: 'inherit',
              opacity: !session ? 0.5 : 1,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {busy && <Dots />}
            {msgs.length > 0 && !busy && (
              <button onClick={() => { setMsgs([]); histRef.current = []; setStart(false); setPend(null) }} style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5, cursor: 'pointer', color: '#b0a8a0',
                fontSize: 11, padding: '3px 8px', fontFamily: 'inherit',
              }}>Clear</button>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, cursor: 'pointer', color: '#b0a8a0',
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Empty state — chips */}
        {msgs.length === 0 && !busy && (
          <div style={{ padding: '14px 16px 18px' }}>
            <div style={{ fontSize: 11, color: 'rgba(240,237,232,0.3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggested
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CHIPS.map(c => (
                <button key={c} onClick={() => session && send(c)} disabled={!session} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 9, padding: '9px 13px', cursor: session ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', fontSize: 13.5, color: '#d8d4d0', textAlign: 'left',
                  opacity: session ? 1 : 0.4,
                  transition: 'background .1s, border-color .1s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (session) { e.currentTarget.style.background = 'rgba(192,57,43,0.08)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
                  <span style={{ color: 'rgba(192,57,43,0.5)', fontSize: 11 }}>›</span>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(240,237,232,0.2)', textAlign: 'center' }}>
              Press Esc to close
            </div>
          </div>
        )}

        {/* Loading first response */}
        {msgs.length === 0 && busy && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#b0a8a0' }}>
            <div style={{ fontSize: 11, marginBottom: 8 }}>Reading your certificate fleet…</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Dots /></div>
          </div>
        )}

        {/* Messages */}
        {msgs.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0 }}>
            {msgs.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <div style={{
                      maxWidth: '78%', background: 'rgba(192,57,43,0.12)',
                      border: '1px solid rgba(192,57,43,0.2)',
                      borderRadius: '10px 10px 2px 10px', padding: '8px 13px',
                    }}>
                      <div style={{ fontSize: 13.5, color: '#f0ede8' }}>{msg.text}</div>
                      <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.3)', marginTop: 3, textAlign: 'right' }}>{msg.ts}</div>
                    </div>
                  </div>
                )}
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                    }}>🧠</div>
                    <div style={{
                      flex: 1, background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${msg.err ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '2px 10px 10px 10px', padding: '9px 13px',
                    }}>
                      {msg.loading ? <Dots /> : (
                        <>
                          <div style={{ color: msg.err ? '#f87171' : '#e4e0dc' }}>
                            <MsgText text={msg.text} />
                          </div>
                          {msg.ts && <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.25)', marginTop: 4 }}>{msg.ts}</div>}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* Confirm card */}
                {msg.role === 'ai' && !msg.loading && i === msgs.length-1 && pending && (
                  <div style={{
                    marginLeft: 32, marginBottom: 10,
                    background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 10, padding: '11px 14px',
                  }}>
                    <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, marginBottom: 8 }}>⚡ Confirm action</div>
                    <div style={{ fontSize: 13, color: '#ddd9d4', marginBottom: 10, lineHeight: 1.6 }}>{pending.message}</div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={confirm} disabled={busy} style={{
                        background: '#c0392b', color: '#fff', border: 'none',
                        borderRadius: 7, padding: '7px 15px', cursor: busy ? 'wait' : 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}>{busy ? '⏳ Working…' : '✅ Yes, go ahead'}</button>
                      <button onClick={() => { setPend(null); setMsgs(m => [...m, { role:'ai', text:'Cancelled.', ts: ts() }]) }} disabled={busy} style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
                        fontSize: 12, color: '#b0a8a0', fontFamily: 'inherit',
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        )}

        {/* Quick chips after conversation */}
        {msgs.length > 1 && !busy && !pending && (
          <div style={{ padding: '6px 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {CHIPS.slice(0,3).map(c => (
              <button key={c} onClick={() => send(c)} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '4px 11px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11.5, color: '#b0a8a0',
                transition: 'color .1s, border-color .1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#f0ede8'; e.currentTarget.style.borderColor='rgba(192,57,43,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color='#b0a8a0'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes vbdot { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes vbmodalin { from{opacity:0;transform:translateX(-50%) translateY(-12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </>
  )
}
