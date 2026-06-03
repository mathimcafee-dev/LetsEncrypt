// VaultBrainPage.jsx — SSLVault AI Advisor v2
// Full-page AI chat with real tool-use, proactive briefing, confirmation flow
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FN_URL = `${SB_URL}/functions/v1/vaultbrain-agent`

// ── Design constants ──────────────────────────────────────────────────────────
const C = {
  bg:       'transparent',
  surface:  'rgba(0,0,0,0.04)',
  surface2: 'rgba(255,255,255,0.03)',
  border:   'rgba(0,0,0,0.1)',
  border2:  'rgba(0,0,0,0.06)',
  text:     '#f0ede8',
  muted:    '#b0a8a0',
  accent:   '#1f5c4e',
  accentBg: 'rgba(31,92,78,0.09)',
  green:    '#4ade80',
  greenBg:  'rgba(22,160,104,0.07)',
  amber:    '#fbbf24',
  amberBg:  'rgba(251,191,36,0.08)',
  purple:   '#a78bfa',
  purpleBg: 'rgba(167,139,250,0.08)',
}
const F = "'Inter var','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"

// ── Suggested prompts — shown on fresh conversation start ─────────────────────
const SUGGESTED = [
  { label: '📋 Show all my certificates', prompt: 'Show me all my certificates' },
  { label: '🛡️ Fleet posture score', prompt: 'What is my fleet posture score?' },
  { label: '📅 CA/B Forum compliance', prompt: 'Am I compliant with CA/B Forum mandates?' },
  { label: '⚠️ What needs attention?', prompt: 'What needs my attention right now?' },
  { label: '🖥️ Show my servers & agents', prompt: 'Show my connected servers and agents' },
  { label: '🔄 Check expiring certs', prompt: 'Which certificates expire in the next 30 days?' },
]

// ── Simple markdown renderer (bold, bullet, newlines only) ────────────────────
function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/\*\*(.*?)\*\*/g)
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: C.text, fontWeight: 600 }}>{p}</strong> : p
        )
        // Bullet lines
        const isBullet = /^[-•*]\s/.test(line.trimStart())
        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
              <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>•</span>
              <span>{rendered.map((p, j) => j % 2 === 0 ? line.trimStart().replace(/^[-•*]\s/, '') : p)}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
        return <div key={i} style={{ marginBottom: 2 }}>{rendered}</div>
      })}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: C.accent, display: 'inline-block',
          animation: `vb2dot 1.2s ${i * 0.18}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  )
}

// ── Confirmation card ─────────────────────────────────────────────────────────
function ConfirmCard({ pending, onConfirm, onCancel, busy }) {
  return (
    <div style={{
      background: C.accentBg, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px', margin: '10px 0',
    }}>
      <div style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.6 }}>
        <strong style={{ color: C.amber }}>⚡ Action required</strong><br />
        {pending.message}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: busy ? 'wait' : 'pointer',
            background: C.accent, color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: F, opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {busy ? '⏳ Working…' : '✅ Yes, go ahead'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.border2}`,
            cursor: 'pointer', background: 'transparent', color: C.muted, fontSize: 13,
            fontFamily: F,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Single message bubble ─────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16, alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: C.accentBg, border: `1.5px solid ${C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginTop: 2,
        }}>
          🧠
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        background: isUser ? C.accentBg : C.surface,
        border: `1px solid ${isUser ? C.border : C.border2}`,
        borderRadius: 14,
        borderBottomRightRadius: isUser ? 3 : 14,
        borderBottomLeftRadius: isUser ? 14 : 3,
        padding: '11px 15px',
      }}>
        {msg.loading ? (
          <TypingDots />
        ) : (
          <div style={{ fontSize: 13.5, color: C.text, fontFamily: F }}>
            <Markdown text={msg.text} />
          </div>
        )}
        {msg.timestamp && (
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
            {msg.timestamp}
          </div>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(0,0,0,0.05)', border: `1px solid ${C.border2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: C.muted, marginTop: 2,
        }}>
          U
        </div>
      )}
    </div>
  )
}

// ── Main page component ───────────────────────────────────────────────────────
export default function VaultBrainPage({ nav }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [briefingDone, setBriefingDone] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const busyRef = useRef(false)
  // Full conversation history for Claude context
  const historyRef = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Auto-focus input after reply
  useEffect(() => {
    if (!busy) setTimeout(() => inputRef.current?.focus(), 80)
  }, [busy])

  // Kick off proactive fleet briefing when session is ready
  useEffect(() => {
    if (session && !briefingDone && msgs.length === 0) {
      setBriefingDone(true)
      sendToAI('Give me a briefing on my certificate fleet and anything I should know.', true)
    }
  }, [session])

  function now() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  function addMsg(msg) {
    setMsgs(m => [...m, msg])
  }

  function replaceLastMsg(msg) {
    setMsgs(m => [...m.slice(0, -1), msg])
  }

  // Core function — sends to edge function and handles tool-use loop + confirmations
  const sendToAI = useCallback(async (text, isAutomatic = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setPendingConfirmation(null)

    if (!isAutomatic) {
      const userMsg = { role: 'user', text, timestamp: now() }
      addMsg(userMsg)
      historyRef.current.push({ role: 'user', content: text })
    }

    addMsg({ role: 'ai', loading: true })

    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s?.access_token) {
        replaceLastMsg({ role: 'ai', text: 'You need to be signed in to use VaultBrain. [Sign in →](/auth)', timestamp: now() })
        return
      }

      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s.access_token,
          messages: historyRef.current,
          ...(isAutomatic && { messages: [{ role: 'user', content: text }] }),
        }),
      })
      const data = await res.json()

      if (!data.ok) {
        replaceLastMsg({ role: 'ai', text: `Something went wrong: ${data.error}`, timestamp: now() })
        return
      }

      // If AI wants confirmation before a mutating action, show the confirm card
      if (data.pending_confirmation) {
        replaceLastMsg({ role: 'ai', text: data.answer, timestamp: now() })
        setPendingConfirmation(data.pending_confirmation)
        historyRef.current.push({ role: 'assistant', content: data.answer })
      } else {
        replaceLastMsg({ role: 'ai', text: data.answer, timestamp: now() })
        historyRef.current.push({ role: 'assistant', content: data.answer })
      }

    } catch (e) {
      replaceLastMsg({ role: 'ai', text: `Connection error. Please try again.\n\n${e.message}`, timestamp: now() })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  // User confirmed a mutating action
  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation || busyRef.current) return
    busyRef.current = true
    setBusy(true)

    addMsg({ role: 'user', text: 'Yes, go ahead.', timestamp: now() })
    historyRef.current.push({ role: 'user', content: 'Yes, go ahead.' })
    addMsg({ role: 'ai', loading: true })
    setPendingConfirmation(null)

    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: s.access_token,
          messages: historyRef.current,
          confirmed_action: { tool: pendingConfirmation.tool, confirmed: true },
        }),
      })
      const data = await res.json()
      const answer = data.ok ? data.answer : `Action failed: ${data.error}`
      replaceLastMsg({ role: 'ai', text: answer, timestamp: now() })
      historyRef.current.push({ role: 'assistant', content: answer })
    } catch (e) {
      replaceLastMsg({ role: 'ai', text: `Error: ${e.message}`, timestamp: now() })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [pendingConfirmation])

  const handleCancel = useCallback(() => {
    setPendingConfirmation(null)
    addMsg({ role: 'ai', text: 'Action cancelled. Let me know if you need anything else.', timestamp: now() })
  }, [])

  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q || busyRef.current) return
    setInput('')
    sendToAI(q)
  }, [input, sendToAI])

  const isBlank = msgs.length === 0 && !busy

  return (
    <div style={{ fontFamily: F, minHeight: '100vh', color: C.text }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => nav('/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: F, padding: 0,
        }}>
          ← Dashboard
        </button>
        <div style={{ width: 1, height: 18, background: C.border2 }} />
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: C.accentBg, border: `1.5px solid ${C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          🧠
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>VaultBrain</div>
          <div style={{ fontSize: 11, color: C.green, marginTop: 1 }}>
            {session ? '● Connected to your account · Live data' : '○ Not signed in'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: C.purpleBg, color: C.purple, border: `0.5px solid ${C.purple}44`,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>AI Advisor</span>
          {busy && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'vb2pulse 1s infinite' }} />
              <span style={{ fontSize: 11, color: C.accent }}>Thinking…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 120px' }}>

        {/* Welcome screen — shown before first message */}
        {isBlank && (
          <div style={{ textAlign: 'center', padding: '60px 20px 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧠</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Your PKI Advisor
            </h1>
            <p style={{ fontSize: 15, color: C.muted, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
              VaultBrain has live access to your certificates. Ask anything — it can read your fleet,
              check compliance, and take actions on your behalf.
            </p>
            {!session && (
              <div style={{
                background: C.amberBg, border: `1px solid ${C.amber}44`,
                borderRadius: 10, padding: '12px 18px', display: 'inline-block',
                fontSize: 13, color: C.amber, marginBottom: 28,
              }}>
                ⚠️ Sign in to connect VaultBrain to your certificate data
                <button onClick={() => nav('/auth')} style={{
                  marginLeft: 10, background: C.amber, color: '#000', border: 'none',
                  borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: F,
                }}>Sign in</button>
              </div>
            )}
            {/* Suggested prompts grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
              gap: 10, maxWidth: 640, margin: '0 auto',
            }}>
              {SUGGESTED.map(s => (
                <button
                  key={s.prompt}
                  onClick={() => sendToAI(s.prompt)}
                  disabled={!session}
                  style={{
                    background: C.surface, border: `1px solid ${C.border2}`,
                    borderRadius: 12, padding: '12px 14px', cursor: session ? 'pointer' : 'not-allowed',
                    fontFamily: F, fontSize: 13, color: C.text, textAlign: 'left',
                    opacity: session ? 1 : 0.4, transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { if (session) e.currentTarget.style.borderColor = C.accent }}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border2}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading briefing indicator */}
        {session && msgs.length === 0 && busy && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
            <div style={{ fontSize: 14, color: C.muted }}>Reading your certificate fleet…</div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 14 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: C.accent,
                  display: 'inline-block', animation: `vb2dot 1.2s ${i*0.18}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {msgs.length > 0 && (
          <div style={{ paddingTop: 24 }}>
            {msgs.map((msg, i) => (
              <div key={i}>
                <Message msg={msg} />
                {/* Show confirmation card after last AI message if pending */}
                {!msg.loading && msg.role === 'ai' && i === msgs.length - 1 && pendingConfirmation && (
                  <ConfirmCard
                    pending={pendingConfirmation}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    busy={busy}
                  />
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Suggested prompts below conversation (after briefing) */}
        {msgs.length > 1 && !busy && !pendingConfirmation && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, paddingLeft: 42 }}>
              Quick actions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 42 }}>
              {SUGGESTED.slice(0, 4).map(s => (
                <button
                  key={s.prompt}
                  onClick={() => sendToAI(s.prompt)}
                  style={{
                    background: C.surface2, border: `1px solid ${C.border2}`,
                    borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
                    fontFamily: F, fontSize: 12, color: C.muted,
                    transition: 'color .15s, border-color .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.border }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border2 }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky input bar ────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(18,0,0,0.92)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${C.border}`,
        padding: '12px 16px 20px',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                pendingConfirmation
                  ? 'Confirm above or type to cancel…'
                  : session
                  ? 'Ask about your certs, compliance, or tell me to take an action…'
                  : 'Sign in to use VaultBrain…'
              }
              rows={1}
              disabled={busy || !session}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.surface, border: `1px solid ${input ? C.accent : C.border2}`,
                borderRadius: 12, padding: '11px 14px',
                color: C.text, fontSize: 14, fontFamily: F,
                resize: 'none', outline: 'none', lineHeight: 1.5,
                minHeight: 44, maxHeight: 120,
                opacity: !session ? 0.5 : 1,
                transition: 'border-color .15s',
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={busy || !input.trim() || !session}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: busy || !input.trim() || !session ? C.surface : C.accent,
              cursor: busy || !input.trim() || !session ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: busy || !input.trim() || !session ? 0.4 : 1,
              transition: 'background .15s, opacity .15s',
            }}
          >
            {busy
              ? <span style={{ fontSize: 16 }}>⏳</span>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
            }
          </button>
        </div>
        {/* Keyboard hint */}
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: C.muted }}>
          Press <kbd style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 4px', fontFamily: MONO }}>Enter</kbd> to send &nbsp;·&nbsp; <kbd style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 3, padding: '0 4px', fontFamily: MONO }}>Shift+Enter</kbd> for new line
        </div>
      </div>

      <style>{`
        @keyframes vb2dot {
          0%,100% { opacity:0.3; transform:scale(0.8); }
          50% { opacity:1; transform:scale(1.2); }
        }
        @keyframes vb2pulse {
          0%,100% { opacity:1; }
          50% { opacity:0.4; }
        }
      `}</style>
    </div>
  )
}
