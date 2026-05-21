// VaultBrain.jsx — SSLVault AI Support Agent v3
// RAG-powered: queries your Supabase vault_knowledge vector store
// Falls back to hardcoded KB if no API key or no chunks found
// Zero breaking changes — same UI, same floating button

import { useState, useRef, useEffect } from 'react'

const SB_URL  = 'https://frthcwkntciaakqsppss.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.VN3soDSl8cMOnjaj8n2wSujTLsr9-4ptH5hYxiJCgHQ'

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK KNOWLEDGE BASE (used when RAG has no chunks yet)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_KB = {
  errors: {
    'dns-01 challenge failing': [
      'Check CAA records — run: dig CAA yourdomain.com. Must allow letsencrypt.org or be empty.',
      'Check DNS API token permissions — Cloudflare needs Zone:DNS:Edit, not read-only.',
      'Wait for TTL propagation — check: dig +short _acme-challenge.yourdomain.com TXT',
      'Verify the TXT record was actually created — use Google Dig tool.',
      'Check DNS provider credentials in SSLVault — go to /dns-providers and click Test.',
    ],
    'certificate expired': [
      'Check agent status at /dns-providers — green dot means active (last seen < 15 min).',
      'Manually trigger reissue — Dashboard → click cert → Actions tab → Reissue certificate.',
      'If agent offline: SSH into VPS → sudo systemctl status sslvault-agent',
      'Restart agent: sudo systemctl restart sslvault-agent',
    ],
    'agent offline': [
      'SSH into VPS: sudo systemctl status sslvault-agent',
      'If stopped: sudo systemctl start sslvault-agent',
      'Check logs: sudo journalctl -u sslvault-agent -n 50',
      'Reinstall: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
      'Agent polls every 5 min — wait after restart then refresh.',
    ],
    'cpanel install failing': [
      'Verify API token has SSL permission (cPanel → Security → Manage API Tokens).',
      'Hostname format: yourdomain.com (no https://). Port 2083 auto-added.',
      'Use cPanel username (short login name, not email).',
    ],
    'private key': [
      'Dashboard → click cert row → Files tab → Copy Key button.',
      'Key is copy-only (never displayed). 30s clipboard timer.',
      'Every copy is logged in audit_log table.',
      'If key deleted: cannot recover — reissue the cert to get a new key.',
    ],
    'tls grade': [
      'Add HSTS: add_header Strict-Transport-Security "max-age=63072000" always;',
      'Force TLS 1.2+: ssl_protocols TLSv1.2 TLSv1.3;',
      'Run posture check: Dashboard → cert → Actions tab → Run check.',
    ],
  },
  quickAnswers: {
    'install agent': 'curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
    'routes': '/dashboard, /certvault, /buy, /install, /dns-providers, /knowledge-base, /scan, /certbind, /ca-connectors, /agent-health, /admin, /auth, /pricing, /about',
    'auto renew': 'auto-renew-cron fires 1 day before cert expires (reissue) and 1 day before order expires (renewal). Agent installs new cert automatically.',
    'stack': 'React + Vite frontend, Supabase Edge Functions, Vercel hosting. Supabase: frthcwkntciaakqsppss. GitHub: mathimcafee-dev/LetsEncrypt.',
    'edge functions': 'auto-renew-cron, gogetssl-issue, keylocker, send-renewal-email, rapidssl-issue, tls-posture, dns-provider, server-credentials, agent-daemon, vaultbrain-ingest, vaultbrain-query',
  }
}

function fallbackAnswer(question) {
  const q = question.toLowerCase()
  for (const [key, steps] of Object.entries(FALLBACK_KB.errors)) {
    if (key.split(' ').filter(w => w.length > 2).some(w => q.includes(w))) {
      return { type: 'steps', title: key, steps, fallback: true }
    }
  }
  for (const [key, answer] of Object.entries(FALLBACK_KB.quickAnswers)) {
    if (key.split(' ').some(w => q.includes(w))) {
      return { type: 'info', title: key, body: answer, fallback: true }
    }
  }
  return {
    type: 'help',
    title: 'How can I help?',
    body: 'Ask me anything about SSLVault:',
    topics: ['DNS-01 challenge failing', 'Agent offline', 'Certificate expired', 'Private key location', 'Install agent', 'TLS grade', 'App routes', 'Edge functions'],
    fallback: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAG QUERY — calls vaultbrain-query edge function
// ─────────────────────────────────────────────────────────────────────────────
async function ragQuery(question) {
  const res = await fetch(`${SB_URL}/functions/v1/vaultbrain-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SB_ANON}`,
    },
    body: JSON.stringify({ question, workspace: 'sslvault' }),
  })
  if (!res.ok) throw new Error(`Edge fn error: ${res.status}`)
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ANSWER
// ─────────────────────────────────────────────────────────────────────────────
function Answer({ answer }) {
  const GREEN = '#10b981'
  const TEXT  = '#f0f0f0'
  const MUTED = '#888'
  const BDR   = 'rgba(255,255,255,0.08)'

  // RAG answer with optional citations
  if (answer.type === 'rag') return (
    <div>
      <div style={{ fontSize:13, color:TEXT, lineHeight:1.75, whiteSpace:'pre-line' }}>
        {answer.text}
      </div>
      {answer.sources?.length > 0 && (
        <div style={{ marginTop:10, borderTop:'0.5px solid '+BDR, paddingTop:8 }}>
          {answer.sources.map((s, i) => (
            <div key={i} style={{ fontSize:10, color:MUTED, marginBottom:2 }}>
              <span style={{ color:GREEN }}>›</span> {s.replace('https://easysecurity.in','easysecurity.in')}
            </div>
          ))}
        </div>
      )}
      {answer.fallback && (
        <div style={{ fontSize:10, color:MUTED, marginTop:6, fontStyle:'italic' }}>
          Using local knowledge — add docs to teach me more
        </div>
      )}
    </div>
  )

  if (answer.type === 'steps') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:GREEN, marginBottom:8, textTransform:'capitalize' }}>{answer.title}</div>
      {answer.steps.map((s, i) => (
        <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'flex-start' }}>
          <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:GREEN, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</div>
          <span style={{ fontSize:12.5, color:TEXT, lineHeight:1.6 }}>{s}</span>
        </div>
      ))}
    </div>
  )

  if (answer.type === 'help') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:GREEN, marginBottom:6 }}>{answer.title}</div>
      <div style={{ fontSize:12, color:MUTED, marginBottom:10 }}>{answer.body}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {answer.topics?.map(t => (
          <span key={t} style={{ fontSize:10, padding:'3px 9px', borderRadius:12, background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)', color:GREEN, cursor:'pointer' }}>{t}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:GREEN, marginBottom:6, textTransform:'capitalize' }}>{answer.title}</div>
      <div style={{ fontSize:12.5, color:TEXT, lineHeight:1.75, whiteSpace:'pre-line' }}>{answer.body}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK CHIPS
// ─────────────────────────────────────────────────────────────────────────────
const CHIPS = [
  'DNS challenge failing',
  'Agent is offline',
  'Certificate expired',
  'Where is my private key?',
  'How does auto-renew work?',
  'cPanel install failing',
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VaultBrain() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{
    role: 'ai',
    answer: {
      type: 'help',
      title: 'VaultBrain — SSLVault Expert',
      body: 'Ask me anything about SSL, certs, DNS, agents, and more:',
      topics: ['DNS challenge failing', 'Agent offline', 'Auto-renewal', 'Private key', 'Install guide', 'TLS grade'],
    }
  }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [chipsShown, setChipsShown] = useState(true)
  const chatRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, open])

  const ask = async (question) => {
    if (!question.trim() || loading) return
    setChipsShown(false)
    setInput('')
    setLoading(true)

    // Add user message immediately
    setMessages(m => [...m, { role: 'user', text: question }])

    try {
      // Try RAG first
      const result = await ragQuery(question)

      if (result.ok && result.answer) {
        setMessages(m => [...m, {
          role: 'ai',
          answer: {
            type: 'rag',
            text: result.answer,
            sources: result.sources || [],
            chunks: result.chunks_used || 0,
          }
        }])
      } else {
        // RAG returned error — use fallback
        setMessages(m => [...m, { role: 'ai', answer: fallbackAnswer(question) }])
      }
    } catch {
      // Network error or edge fn not deployed yet — use fallback silently
      setMessages(m => [...m, { role: 'ai', answer: fallbackAnswer(question) }])
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const BG    = '#0a0a0a'
  const SURF  = '#111111'
  const SURF2 = '#1a1a1a'
  const GREEN = '#10b981'
  const GBDR  = 'rgba(16,185,129,0.25)'
  const BDR   = 'rgba(255,255,255,0.08)'
  const TEXT  = '#f0f0f0'
  const MUTED = '#888'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        onTouchEnd={e => { e.preventDefault(); setOpen(o => !o) }}
        title="VaultBrain — SSLVault Expert"
        style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          width:50, height:50, borderRadius:'50%',
          background: open ? '#1a1a1a' : GREEN,
          border: '1.5px solid ' + (open ? 'rgba(255,255,255,0.1)' : GREEN),
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(16,185,129,0.4)',
          transition:'all 0.2s ease', WebkitTapHighlightColor:'transparent',
        }}>
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:'fixed', bottom:84, right:24, zIndex:9998,
          width:380, height:560, background:BG,
          border:'1px solid '+GBDR, borderRadius:16,
          display:'flex', flexDirection:'column', overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
          animation:'vbSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Header */}
          <div style={{ background:SURF, borderBottom:'1px solid '+BDR, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'1.5px solid '+GREEN, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>VaultBrain</div>
              <div style={{ fontSize:10, color:GREEN }}>PKI expert · RAG powered · always learning</div>
            </div>
            <div style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)', color:GREEN, letterSpacing:'0.04em' }}>SSLVAULT</div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="vb-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignSelf: msg.role==='user'?'flex-end':'flex-start', maxWidth:'92%' }}>
                {msg.role === 'ai' && (
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:10, color:GREEN, fontWeight:700 }}>V</div>
                )}
                <div style={{
                  padding:'10px 13px', borderRadius:12,
                  background: msg.role==='user' ? 'rgba(16,185,129,0.1)' : SURF2,
                  border: '0.5px solid ' + (msg.role==='user' ? 'rgba(16,185,129,0.2)' : BDR),
                  borderBottomLeftRadius: msg.role==='ai' ? 3 : 12,
                  borderBottomRightRadius: msg.role==='user' ? 3 : 12,
                }}>
                  {msg.role === 'user'
                    ? <div style={{ fontSize:13, color:TEXT }}>{msg.text}</div>
                    : <Answer answer={msg.answer}/>
                  }
                </div>
                {msg.role === 'user' && (
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:'#1e293b', border:'1px solid rgba(99,179,237,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:10, color:'#63b3ed', fontWeight:700 }}>U</div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display:'flex', gap:8, alignSelf:'flex-start', maxWidth:'92%' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:GREEN, fontWeight:700 }}>V</div>
                <div style={{ padding:'10px 13px', borderRadius:12, borderBottomLeftRadius:3, background:SURF2, border:'0.5px solid '+BDR, display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:GREEN, opacity:0.4, animation:`vbDot 1.2s ${i*0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick chips */}
          {chipsShown && (
            <div style={{ padding:'0 10px 8px', display:'flex', flexWrap:'wrap', gap:5 }}>
              {CHIPS.map(c => (
                <button key={c}
                  onClick={() => ask(c)}
                  onTouchEnd={e => { e.preventDefault(); ask(c) }}
                  style={{ fontSize:10.5, padding:'8px 12px', borderRadius:20, cursor:'pointer', background:SURF2, border:'0.5px solid '+BDR, color:MUTED, fontFamily:'inherit', WebkitTapHighlightColor:'transparent' }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', background:SURF, borderTop:'1px solid '+BDR, display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px' }}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); ask(input) }}}
              placeholder="Ask anything about SSLVault…"
              rows={1}
              disabled={loading}
              style={{ flex:1, background:SURF2, border:'0.5px solid '+BDR, borderRadius:8, padding:'9px 12px', color:TEXT, fontSize:12.5, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.5, minHeight:38, maxHeight:80, opacity: loading ? 0.6 : 1 }}
              onFocus={e=>e.target.style.borderColor=GBDR}
              onBlur={e=>e.target.style.borderColor=BDR}
            />
            <button
              onClick={() => ask(input)}
              onTouchEnd={e => { e.preventDefault(); ask(input) }}
              disabled={loading || !input.trim()}
              style={{ width:36, height:36, borderRadius:8, background: loading||!input.trim() ? '#1a1a1a' : GREEN, border:'none', cursor: loading||!input.trim() ? 'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s', opacity: loading||!input.trim() ? 0.5 : 1, WebkitTapHighlightColor:'transparent' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vbSlideUp {
          from { opacity:0; transform:translateY(12px) scale(0.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes vbDot {
          0%,100% { opacity:0.4; transform:scale(1) }
          50% { opacity:1; transform:scale(1.3) }
        }
        .vb-scroll::-webkit-scrollbar { width: 3px; }
        .vb-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </>
  )
}
