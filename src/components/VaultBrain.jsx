import { useState, useRef, useEffect, useCallback } from 'react'

const SB_URL  = 'https://frthcwkntciaakqsppss.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydGhjd2tudGNpYWFrcXNwcHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjcxNTMsImV4cCI6MjA5MzY0MzE1M30.VN3soDSl8cMOnjaj8n2wSujTLsr9-4ptH5hYxiJCgHQ'

const FALLBACK = {
  'agent': ['SSH into VPS: sudo systemctl status sslvault-agent','If stopped: sudo systemctl start sslvault-agent','Check logs: sudo journalctl -u sslvault-agent -n 50','Reinstall: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash','Agent polls every 5 min — wait then refresh dashboard.'],
  'dns': ['Check CAA records: dig CAA yourdomain.com — must allow letsencrypt.org or be empty.','Check Cloudflare token has Zone:DNS:Edit permission.','Wait for DNS propagation — check: dig +short _acme-challenge.yourdomain.com TXT','Go to /dns-providers and click Test to verify credentials.'],
  'expired': ['Dashboard → click cert → Actions tab → Reissue certificate.','Check agent is online at /dns-providers (green dot = active).','If agent offline: sudo systemctl restart sslvault-agent'],
  'cpanel': ['cPanel → Security → Manage API Tokens → token needs SSL permission.','Hostname: yourdomain.com (no https://). Port 2083 added automatically.','Username: short login name, not your email address.'],
  'key': ['Dashboard → click cert → Files tab → Copy Key button.','Key is copy-only, never displayed. 30s clipboard timer.','Every copy logged in audit_log table.','If deleted: must reissue the cert to get a new key.'],
  'tls': ['Add HSTS: add_header Strict-Transport-Security "max-age=63072000" always;','Use TLS 1.2+ only: ssl_protocols TLSv1.2 TLSv1.3;','Run posture check: Dashboard → cert → Actions tab → Run check.'],
  'renew': ['Auto-reissue fires 1 day before cert expires.','Auto-renewal fires 1 day before order period ends.','Both need VPS agent online OR cPanel credentials saved.','Check upcoming dates in Dashboard → click cert → metric strip.'],
  'install': ['VPS: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash','cPanel: Dashboard → cert → Actions → Install → cPanel tab → enter hostname, username, API token.','Nginx: ssl_certificate /path/fullchain.pem; ssl_certificate_key /path/privkey.pem;'],
}

function getFallback(q) {
  const t = q.toLowerCase()
  if (t.match(/agent|offline|daemon|vps|systemctl/)) return { title:'Agent troubleshooting', steps: FALLBACK.agent }
  if (t.match(/dns|challenge|acme|txt|record|cloudflare|propagat/)) return { title:'DNS challenge fix', steps: FALLBACK.dns }
  if (t.match(/expir|expired|renew/)) return { title:'Certificate expired', steps: FALLBACK.expired }
  if (t.match(/cpanel|shared|hosting/)) return { title:'cPanel install', steps: FALLBACK.cpanel }
  if (t.match(/private.?key|key/)) return { title:'Private key', steps: FALLBACK.key }
  if (t.match(/tls|grade|hsts|posture/)) return { title:'TLS grade', steps: FALLBACK.tls }
  if (t.match(/auto.?renew|renewal|reissue/)) return { title:'Auto-renewal', steps: FALLBACK.renew }
  if (t.match(/install|setup|nginx|apache/)) return { title:'Installation', steps: FALLBACK.install }
  return null
}

const CHIPS = ['Agent offline','DNS challenge failing','Certificate expired','Private key','Auto-renewal','cPanel install','TLS grade','Install guide']

const G = '#10b981'
const BG = '#0a0a0a'
const S1 = '#111'
const S2 = '#1a1a1a'
const TX = '#f0f0f0'
const MU = '#888'
const BD = 'rgba(255,255,255,0.08)'
const GB = 'rgba(16,185,129,0.25)'

export default function VaultBrain() {
  const [open, setOpen]     = useState(false)
  const [msgs, setMsgs]     = useState([{ role:'ai', text:null, welcome:true }])
  const [input, setInput]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [chips, setChips]   = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const busyRef   = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs])

  const send = useCallback(async (q) => {
    q = (q || '').trim()
    if (!q || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setChips(false)
    setInput('')
    setMsgs(m => [...m, { role:'user', text:q }, { role:'ai', text:null, loading:true }])

    let answer = null

    try {
      const r = await fetch(`${SB_URL}/functions/v1/vaultbrain-query`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${SB_ANON}` },
        body: JSON.stringify({ question: q, workspace:'sslvault' }),
      })
      const d = await r.json()
      if (d.ok && d.answer) {
        answer = { type:'rag', text: d.answer, sources: d.sources || [] }
      }
    } catch (_) {}

    if (!answer) {
      const fb = getFallback(q)
      if (fb) answer = { type:'steps', title: fb.title, steps: fb.steps }
      else answer = { type:'text', text:"I don't have that info yet. Visit easysecurity.in/knowledge-base or email support." }
    }

    setMsgs(m => [...m.slice(0,-1), { role:'ai', answer }])
    busyRef.current = false
    setBusy(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  function renderMsg(msg, i) {
    if (msg.welcome) return (
      <div key={i} style={{ display:'flex', gap:8 }}>
        <Avatar ai/>
        <Bubble ai>
          <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:6 }}>VaultBrain — SSLVault Expert</div>
          <div style={{ fontSize:12.5, color:TX, lineHeight:1.7 }}>Ask me anything about SSL, certs, DNS, agents, and more.</div>
        </Bubble>
      </div>
    )
    if (msg.loading) return (
      <div key={i} style={{ display:'flex', gap:8 }}>
        <Avatar ai/>
        <Bubble ai>
          <div style={{ display:'flex', gap:4, alignItems:'center', padding:'2px 0' }}>
            {[0,1,2].map(j => <span key={j} style={{ width:6, height:6, borderRadius:'50%', background:G, display:'inline-block', animation:`vbp 1.2s ${j*0.2}s infinite` }}/>)}
          </div>
        </Bubble>
      </div>
    )
    if (msg.role === 'user') return (
      <div key={i} style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Bubble user><span style={{ fontSize:13, color:TX }}>{msg.text}</span></Bubble>
        <Avatar/>
      </div>
    )
    const a = msg.answer
    if (!a) return null
    return (
      <div key={i} style={{ display:'flex', gap:8 }}>
        <Avatar ai/>
        <Bubble ai>
          {a.type === 'rag' && <>
            <div style={{ fontSize:13, color:TX, lineHeight:1.75, whiteSpace:'pre-line' }}>{a.text}</div>
            {a.sources?.length > 0 && <div style={{ marginTop:8, borderTop:`0.5px solid ${BD}`, paddingTop:6 }}>
              {a.sources.map((s,j) => <div key={j} style={{ fontSize:10, color:MU }}><span style={{ color:G }}>›</span> {s}</div>)}
            </div>}
          </>}
          {a.type === 'steps' && <>
            <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:8 }}>{a.title}</div>
            {a.steps.map((s,j) => (
              <div key={j} style={{ display:'flex', gap:8, marginBottom:6 }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:`1px solid rgba(16,185,129,0.3)`, color:G, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{j+1}</span>
                <span style={{ fontSize:12.5, color:TX, lineHeight:1.6 }}>{s}</span>
              </div>
            ))}
          </>}
          {a.type === 'text' && <div style={{ fontSize:12.5, color:TX, lineHeight:1.7 }}>{a.text}</div>}
        </Bubble>
      </div>
    )
  }

  return (
    <>
      <button
        onPointerDown={e => { e.preventDefault(); setOpen(o => !o) }}
        style={{ position:'fixed', bottom:24, right:24, zIndex:99999, width:52, height:52, borderRadius:'50%', background: open?S2:G, border:`2px solid ${open?'rgba(255,255,255,0.15)':G}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 24px ${open?'rgba(0,0,0,0.4)':'rgba(16,185,129,0.5)'}`, outline:'none', padding:0, WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
        }
      </button>

      {open && (
        <div style={{ position:'fixed', bottom:86, right:16, zIndex:99998, width:'min(380px, calc(100vw - 32px))', height:'min(560px, calc(100vh - 120px))', background:BG, border:`1px solid ${GB}`, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.7)', touchAction:'none' }}>

          {/* Header */}
          <div style={{ background:S1, borderBottom:`1px solid ${BD}`, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:`1.5px solid ${G}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:TX }}>VaultBrain</div>
              <div style={{ fontSize:10, color:G }}>PKI expert · RAG powered · always learning</div>
            </div>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:`0.5px solid rgba(16,185,129,0.2)`, color:G }}>SSLVAULT</span>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:12, touchAction:'pan-y' }}>
            {msgs.map(renderMsg)}
            <div ref={bottomRef}/>
          </div>

          {/* Chips */}
          {chips && !busy && (
            <div style={{ padding:'4px 10px 8px', display:'flex', flexWrap:'wrap', gap:5, flexShrink:0 }}>
              {CHIPS.map(c => (
                <button key={c}
                  onPointerDown={e => { e.preventDefault(); send(c) }}
                  style={{ fontSize:11, padding:'6px 12px', borderRadius:20, cursor:'pointer', background:S2, border:`0.5px solid ${BD}`, color:MU, fontFamily:'inherit', outline:'none', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', background:S1, borderTop:`1px solid ${BD}`, display:'flex', gap:8, alignItems:'flex-end', flexShrink:0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px' }}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(input) }}}
              placeholder="Ask anything about SSLVault…"
              rows={1}
              disabled={busy}
              style={{ flex:1, background:S2, border:`0.5px solid ${BD}`, borderRadius:8, padding:'9px 12px', color:TX, fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.5, minHeight:40, maxHeight:80, opacity: busy?0.6:1 }}
            />
            <button
              onPointerDown={e => { e.preventDefault(); send(input) }}
              disabled={busy || !input.trim()}
              style={{ width:40, height:40, borderRadius:8, background: busy||!input.trim()?S2:G, border:'none', cursor: busy||!input.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: busy||!input.trim()?0.4:1, outline:'none', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vbp { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </>
  )
}

function Avatar({ ai }) {
  return (
    <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, marginTop:2, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', background: ai?'rgba(16,185,129,0.12)':'#1e293b', border: ai?'1px solid rgba(16,185,129,0.25)':'1px solid rgba(99,179,237,0.3)', color: ai?G:'#63b3ed' }}>
      {ai ? 'V' : 'U'}
    </div>
  )
}

function Bubble({ ai, user, children }) {
  return (
    <div style={{ padding:'10px 13px', borderRadius:12, maxWidth:'85%', background: user?'rgba(16,185,129,0.1)':S2, border:`0.5px solid ${user?'rgba(16,185,129,0.2)':BD}`, borderBottomLeftRadius: ai?3:12, borderBottomRightRadius: user?3:12 }}>
      {children}
    </div>
  )
}
