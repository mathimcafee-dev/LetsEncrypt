// VaultBrainPanel.jsx — Slide-in AI advisor panel for Dashboard
// Appears as a right-side drawer, no page navigation required
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FN_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/vaultbrain-agent'

const SUGGESTED = [
  { label: 'What needs attention?',    prompt: 'What needs my attention right now?' },
  { label: 'Fleet posture score',       prompt: 'What is my fleet posture score?' },
  { label: 'CA/B compliance check',    prompt: 'Am I compliant with CA/B Forum mandates?' },
  { label: 'Show expiring certs',       prompt: 'Which certificates expire in the next 30 days?' },
]

// Strip markdown bold/italic asterisks for clean display
function stripMd(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.*?)\*/g,   '$1')    // *italic* → italic
    .replace(/`(.*?)`/g,     '$1')    // `code` → code
    .trim()
}

// Render a message line — handle bullets
function MsgText({ text }) {
  const lines = stripMd(text).split('\n')
  return (
    <div style={{ lineHeight: 1.65, fontSize: 13 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        const isBullet = /^[-•]\s/.test(line.trimStart())
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
            {isBullet && <span style={{ color: '#c0392b', flexShrink: 0 }}>•</span>}
            <span>{isBullet ? line.trimStart().replace(/^[-•]\s/, '') : line}</span>
          </div>
        )
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#c0392b', display: 'inline-block',
          animation: `vbdot 1.1s ${i * 0.17}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  )
}

export default function VaultBrainPanel({ open, onClose, session }) {
  const [msgs, setMsgs]       = useState([])
  const [input, setInput]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [pending, setPending] = useState(null)
  const [started, setStarted] = useState(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const busyRef    = useRef(false)
  const historyRef = useRef([])

  // Scroll to bottom on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  // Brief only when user first opens panel — reset on close so next open briefs again
  useEffect(() => {
    if (open && session && !started && msgs.length === 0) {
      setStarted(true)
      sendToAI('Give me a quick briefing on my certificate fleet.', true)
    }
    if (!open) { setStarted(false) }
  }, [open])

  function ts() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const sendToAI = useCallback(async (text, isAutomatic = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setPending(null)

    if (!isAutomatic) {
      setMsgs(m => [...m, { role: 'user', text, ts: ts() }])
      historyRef.current.push({ role: 'user', content: text })
    }
    setMsgs(m => [...m, { role: 'ai', loading: true }])

    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s?.access_token) {
        setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: 'Sign in to use VaultBrain.', ts: ts() }])
        return
      }
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s.access_token,
          messages: isAutomatic ? [{ role: 'user', content: text }] : historyRef.current,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: `Error: ${data.error}`, ts: ts(), isError: true }])
        return
      }
      setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: data.answer, ts: ts() }])
      historyRef.current.push({ role: 'assistant', content: data.answer })
      if (data.pending_confirmation) setPending(data.pending_confirmation)
    } catch (e) {
      setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: `Connection error. Try again.`, ts: ts(), isError: true }])
    } finally {
      busyRef.current = false
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!pending || busyRef.current) return
    const p = pending
    setPending(null)
    busyRef.current = true
    setBusy(true)
    setMsgs(m => [...m, { role: 'user', text: 'Yes, go ahead.', ts: ts() }])
    historyRef.current.push({ role: 'user', content: 'Yes, go ahead.' })
    setMsgs(m => [...m, { role: 'ai', loading: true }])
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s.access_token,
          messages: historyRef.current,
          confirmed_action: { tool: p.tool, confirmed: true },
        }),
      })
      const data = await res.json()
      const answer = data.ok ? data.answer : `Action failed: ${data.error}`
      setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: answer, ts: ts() }])
      historyRef.current.push({ role: 'assistant', content: answer })
    } catch (e) {
      setMsgs(m => [...m.slice(0, -1), { role: 'ai', text: `Error: ${e.message}`, ts: ts(), isError: true }])
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [pending])

  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q || busyRef.current) return
    setInput('')
    sendToAI(q)
  }, [input, sendToAI])

  const handleClear = () => {
    setMsgs([])
    historyRef.current = []
    setPending(null)
    setStarted(false)
  }

  return (
    <>
      {/* Backdrop — click to close */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            transition: 'opacity .2s',
          }}
        />
      )}

      {/* Slide-in panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        zIndex: 1001,
        background: 'linear-gradient(180deg, #1a0505 0%, #120000 100%)',
        borderLeft: '1px solid rgba(192,57,43,0.3)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.32,0,.67,0)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid rgba(192,57,43,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(192,57,43,0.15)', border: '1.5px solid rgba(192,57,43,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🧠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ede8', letterSpacing: '-0.2px' }}>VaultBrain</div>
            <div style={{ fontSize: 11, color: session ? '#4ade80' : '#b0a8a0', marginTop: 1 }}>
              {session ? '● Live · Gemini AI' : '○ Not signed in'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {msgs.length > 0 && (
              <button onClick={handleClear} style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, cursor: 'pointer', color: '#b0a8a0',
                fontSize: 11, padding: '4px 8px', fontFamily: 'inherit',
              }}>Clear</button>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, cursor: 'pointer', color: '#b0a8a0',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>

          {/* Empty state with suggested prompts */}
          {msgs.length === 0 && !busy && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#b0a8a0', marginBottom: 12, textAlign: 'center' }}>
                Ask anything about your certificates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUGGESTED.map(s => (
                  <button
                    key={s.prompt}
                    onClick={() => session && sendToAI(s.prompt)}
                    disabled={!session}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '10px 13px', cursor: session ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit', fontSize: 13, color: '#e0ddd8', textAlign: 'left',
                      opacity: session ? 1 : 0.4, transition: 'border-color .12s, background .12s',
                    }}
                    onMouseEnter={e => { if (session) { e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'; e.currentTarget.style.background = 'rgba(192,57,43,0.08)' } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state before first message */}
          {msgs.length === 0 && busy && (
            <div style={{ textAlign: 'center', paddingTop: 32, color: '#b0a8a0' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🧠</div>
              <div style={{ fontSize: 12 }}>Reading your fleet…</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                <TypingDots />
              </div>
            </div>
          )}

          {/* Message list */}
          {msgs.map((msg, i) => (
            <div key={i}>
              {/* User message */}
              {msg.role === 'user' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{
                    maxWidth: '82%',
                    background: 'rgba(192,57,43,0.14)',
                    border: '1px solid rgba(192,57,43,0.25)',
                    borderRadius: '12px 12px 3px 12px',
                    padding: '9px 13px',
                  }}>
                    <div style={{ fontSize: 13, color: '#f0ede8' }}>{msg.text}</div>
                    <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.35)', marginTop: 4, textAlign: 'right' }}>{msg.ts}</div>
                  </div>
                </div>
              )}

              {/* AI message */}
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }}>🧠</div>
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${msg.isError ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '3px 12px 12px 12px',
                    padding: '10px 13px',
                  }}>
                    {msg.loading ? <TypingDots /> : (
                      <>
                        <div style={{ color: msg.isError ? '#f87171' : '#e8e4e0' }}>
                          <MsgText text={msg.text || ''} />
                        </div>
                        {msg.ts && <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.3)', marginTop: 5 }}>{msg.ts}</div>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation card */}
              {msg.role === 'ai' && !msg.loading && i === msgs.length - 1 && pending && (
                <div style={{
                  background: 'rgba(251,191,36,0.06)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 12, marginLeft: 34,
                }}>
                  <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 10, fontWeight: 600 }}>⚡ Confirmation required</div>
                  <div style={{ fontSize: 12.5, color: '#e8e4e0', marginBottom: 12, lineHeight: 1.6 }}>{pending.message}</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={handleConfirm} disabled={busy} style={{
                      background: '#c0392b', color: '#fff', border: 'none',
                      borderRadius: 7, padding: '7px 14px', cursor: busy ? 'wait' : 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    }}>
                      {busy ? '⏳ Working…' : '✅ Yes, go ahead'}
                    </button>
                    <button onClick={() => { setPending(null); setMsgs(m => [...m, { role: 'ai', text: 'Action cancelled.', ts: ts() }]) }} disabled={busy} style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
                      fontSize: 12, color: '#b0a8a0', fontFamily: 'inherit',
                    }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Quick action chips (show after briefing) */}
        {msgs.length > 1 && !busy && !pending && (
          <div style={{ padding: '4px 14px 6px', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
            {SUGGESTED.slice(0, 3).map(s => (
              <button key={s.prompt} onClick={() => sendToAI(s.prompt)} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, color: '#b0a8a0',
                transition: 'color .12s, border-color .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f0ede8'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#b0a8a0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '10px 12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0, background: 'rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={session ? 'Ask about your certs or take an action…' : 'Sign in to use VaultBrain…'}
              rows={1}
              disabled={busy || !session}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${input ? 'rgba(192,57,43,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, padding: '9px 12px',
                color: '#f0ede8', fontSize: 13, fontFamily: 'inherit',
                resize: 'none', outline: 'none', lineHeight: 1.5,
                minHeight: 40, maxHeight: 100,
                opacity: !session ? 0.5 : 1,
                transition: 'border-color .15s',
              }}
            />
            <button
              onClick={handleSend}
              disabled={busy || !input.trim() || !session}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
                background: busy || !input.trim() || !session ? 'rgba(255,255,255,0.06)' : '#c0392b',
                cursor: busy || !input.trim() || !session ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: busy || !input.trim() || !session ? 0.4 : 1,
                transition: 'background .15s, opacity .15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 5, fontSize: 10, color: 'rgba(240,237,232,0.2)' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vbdot {
          0%,100% { opacity:.3; transform:scale(.8); }
          50% { opacity:1; transform:scale(1.2); }
        }
      `}</style>
    </>
  )
}
