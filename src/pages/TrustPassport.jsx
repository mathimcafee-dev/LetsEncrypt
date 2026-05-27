import { useState, useRef } from 'react'
import { Search, Shield, Clock, Globe, AlertTriangle, CheckCircle, XCircle, ArrowLeft, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','SF Mono',monospace"

const VERDICT_CONFIG = {
  trusted:    { color: '#4ade80', bg: '#111111', border: 'rgba(192,57,43,0.3)', label: 'Trusted',    icon: <CheckCircle  size={18} color="#16a34a"/> },
  caution:    { color: '#ffffff', bg: 'rgba(239,68,68,0.08)', border: '#F2C4BC', label: 'Caution',    icon: <AlertTriangle size={18} color="#f07059"/> },
  new:        { color: '#ffffff', bg: '#111111', border: 'rgba(192,57,43,0.3)', label: 'New Site',   icon: <Clock         size={18} color="#c0392b"/> },
  suspicious: { color: '#f87171', bg: '#fef2f2', border: '#fecaca', label: 'Suspicious', icon: <XCircle       size={18} color="#dc2626"/> },
  blocked:    { color: '#f87171', bg: '#fef2f2', border: '#fecaca', label: 'Blocked',    icon: <XCircle       size={18} color="#dc2626"/> },
}

const EXAMPLE_DOMAINS = ['github.com', 'stripe.com', 'netflix.com', 'shopify.com', 'paypal.com']

function ScoreRing({ score, grade, verdict }) {
  const v = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.new
  const pct = Math.min(score, 100)
  const r = 44, cx = 52, cy = 52
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ position:'relative', width:104, height:104, flexShrink:0 }}>
      <svg width={104} height={104} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={v.border} strokeWidth={7}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={v.color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:24, fontWeight:700, color:v.color, fontFamily:MONO, lineHeight:1 }}>{score}</div>
        <div style={{ fontSize:12, fontWeight:600, color:v.color, fontFamily:MONO }}>{grade}</div>
      </div>
    </div>
  )
}

function LayerBar({ label, score, max, color, expanded, onToggle, children }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div style={{ border:'0.5px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:8 }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', background:'var(--v2-surface)', userSelect:'none' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{label}</span>
            <span style={{ fontSize:12, fontFamily:MONO, color, fontWeight:700 }}>{score} / {max}</span>
          </div>
          <div style={{ height:6, background:'var(--v2-hover)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:6, width:`${pct}%`, background:color, borderRadius:3, transition:'width .6s ease' }}/>
          </div>
        </div>
        <div style={{ color:'var(--v2-text-3)', flexShrink:0 }}>{expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
      </div>
      {expanded && (
        <div style={{ padding:'12px 16px', borderTop:'0.5px solid var(--v2-border)', background:'var(--v2-surface-2)', fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function FactRow({ icon, text, ok }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'4px 0' }}>
      <span style={{ marginTop:1, flexShrink:0 }}>{ok === true ? <CheckCircle size={13} color="#16a34a"/> : ok === false ? <XCircle size={13} color="#dc2626"/> : <span style={{ fontSize:13, color:'var(--v2-text-3)' }}>·</span>}</span>
      <span style={{ fontSize:12, color:'var(--v2-text-2)' }}>{text}</span>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1800) }}
      style={{ display:'flex', alignItems:'center', gap:5, background:'var(--v2-hover)', border:'0.5px solid var(--v2-border)', borderRadius:6, padding:'5px 10px', fontSize:11, color:'var(--v2-text-2)', cursor:'pointer', fontFamily:'inherit' }}>
      {copied ? <Check size={11} color="#16a34a"/> : <Copy size={11}/>}
      {copied ? 'Copied' : 'Copy snippet'}
    </button>
  )
}

export default function TrustPassport({ nav }) {
  const [domain, setDomain]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const [expanded, setExpanded] = useState({})
  const inputRef = useRef(null)

  const check = async (d) => {
    const target = (d || domain).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    if (!target) { setError('Enter a domain name'); return }
    setLoading(true); setError(''); setResult(null); setExpanded({})
    try {
      const r = await fetch(`${SB_URL}/functions/v1/trust-passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: target }),
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.error || 'Check failed')
      setResult(data)
      if (d) setDomain(d)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const v = result ? (VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.new) : null

  const embedCode = result
    ? `<script src="https://easysecurity.in/trust-passport.js" data-domain="${result.domain}"></script>`
    : ''

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-ring { 0%,100%{opacity:1} 50%{opacity:.4} }
        .tp-hero { background: #0a0a0a; padding: clamp(40px,6vw,64px) clamp(20px,4vw,48px) clamp(32px,5vw,48px); }
        .tp-input-wrap { max-width: 720px; margin: 0 auto; padding: 0 clamp(16px,4vw,48px) clamp(24px,4vw,40px); }
        .tp-result { max-width: 720px; margin: 0 auto; padding: 0 clamp(16px,4vw,48px) 48px; }
        .tp-example { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
        .tp-chip { background:rgba(255,255,255,.06); border:0.5px solid rgba(255,255,255,.12); border-radius:100px;
          padding:4px 12px; font-size:11px; color:rgba(255,255,255,.5); cursor:pointer; font-family:${MONO};
          transition:all .15s; }
        .tp-chip:hover { background:rgba(255,255,255,.1); color:rgba(255,255,255,.8); }
        .verdict-card { border-radius:12px; padding:20px 22px; margin-bottom:16px; display:flex; gap:16px; align-items:flex-start; }
        .api-box { background:#0a0a0a; border-radius:8px; padding:12px 16px; font-family:${MONO}; font-size:11px; color:rgba(255,255,255,.7); line-height:1.9; overflow-x:auto; }
        .embed-box { background:var(--v2-surface-2); border:0.5px solid var(--v2-border); border-radius:8px; padding:12px 16px; font-family:${MONO}; font-size:11px; color:var(--v2-text-2); }
      `}</style>

      {/* Hero */}
      <div className="tp-hero">
        <div style={{ maxWidth:720, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:100, padding:'5px 14px', marginBottom:20 }}>
            <Shield size={12} color="#c0392b"/>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:MONO }}>SSLVault Trust Passport · Public Tool</span>
          </div>
          <h1 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:700, letterSpacing:'-1px', lineHeight:1.1, color:'rgba(255,255,255,.95)', marginBottom:14 }}>
            Does this site<br/>
            <span style={{ color:'#ffffff' }}>deserve your trust?</span>
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.4)', lineHeight:1.8, maxWidth:520, margin:'0 auto 0' }}>
            SSL certificates are free for everyone — including phishing sites. Trust Passport looks deeper: CT log history, domain age, DNS infrastructure, and abuse signals. Time cannot be faked.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="tp-input-wrap" style={{ paddingTop:28 }}>
        <div style={{ background:'transparent', border:'0.5px solid var(--v2-border-strong)', borderRadius:12, padding:'14px 16px', marginBottom:4 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <Globe size={16} color="var(--v2-text-3)" style={{ flexShrink:0 }}/>
            <input
              ref={inputRef}
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="Enter any domain — e.g. paypal.com"
              style={{ flex:1, border:'none', outline:'none', fontSize:15, fontFamily:FONT, color:'var(--v2-text)', background:'transparent' }}
            />
            <button onClick={() => check()}
              disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:7, background:'#ffffff', color:'#ffffff', border:'none',
                borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:loading?'not-allowed':'pointer',
                opacity:loading?0.6:1, fontFamily:'inherit', flexShrink:0 }}>
              {loading
                ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/>
                : <Search size={14}/>}
              {loading ? 'Analysing…' : 'Check trust'}
            </button>
          </div>
        </div>
        {error && <p style={{ fontSize:12, color:'var(--v2-red-text)', margin:'6px 0 0 4px' }}>{error}</p>}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>Try:</span>
          {EXAMPLE_DOMAINS.map(d => (
            <button key={d} onClick={() => check(d)}
              style={{ fontSize:11, fontFamily:MONO, background:'var(--v2-hover)', border:'0.5px solid var(--v2-border)', borderRadius:100, padding:'3px 10px', color:'var(--v2-text-2)', cursor:'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="tp-result">
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:12, padding:'32px 24px', textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
              <div style={{ width:48, height:48, border:'3px solid var(--v2-hover)', borderTop:'3px solid #0a0a0a', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>Analysing {domain.replace(/^www\./,'')}…</div>
            <div style={{ fontSize:12, color:'var(--v2-text-3)', lineHeight:1.7 }}>
              Querying Certificate Transparency logs · Checking domain history · Analysing DNS infrastructure · Scanning abuse feeds
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="tp-result">

          {/* Verdict card */}
          <div className="verdict-card" style={{ background: v.bg, border: `1.5px solid ${v.border}` }}>
            <ScoreRing score={result.score} grade={result.grade} verdict={result.verdict}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                {v.icon}
                <span style={{ fontSize:20, fontWeight:700, color:v.color }}>{result.domain}</span>
                <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:v.color, color:'#ffffff' }}>{v.label}</span>
              </div>
              <p style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.7, margin:'0 0 10px' }}>{result.summary}</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontFamily:MONO, color:'var(--v2-text-3)', display:'flex', alignItems:'center', gap:4 }}>
                  <Clock size={11}/> AI profile: {result.behaviour?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--v2-text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Trust score breakdown</div>

            <LayerBar label="Certificate Transparency lineage" score={result.layers.ct_lineage.score} max={40}
              color={result.layers.ct_lineage.score >= 28 ? '#4ade80' : result.layers.ct_lineage.score >= 14 ? '#ffffff' : '#f87171'}
              expanded={expanded.ct} onToggle={() => toggle('ct')}>
              {result.layers.ct_lineage.data?.count > 0 ? (<>
                <FactRow ok={true}  text={`${result.layers.ct_lineage.data.count} certificates found in public CT logs`}/>
                <FactRow ok={true}  text={`First certificate: ${result.layers.ct_lineage.data.firstSeen || 'unknown'} — ${result.layers.ct_lineage.data.yearsSince} year${result.layers.ct_lineage.data.yearsSince!==1?'s':''} of history`}/>
                <FactRow ok={null}  text={`Issuers used: ${result.layers.ct_lineage.data.issuers?.join(', ') || 'Unknown'}`}/>
                {result.layers.ct_lineage.data.recentExpiry && <FactRow ok={null} text={`Current cert expires: ${result.layers.ct_lineage.data.recentExpiry?.split('T')[0]}`}/>}
                <p style={{ marginTop:8, fontSize:11, color:'var(--v2-text-3)' }}>Certificate Transparency logs are mandatory, public, and append-only — they cannot be edited or faked retroactively. A long CT history proves years of real operation.</p>
              </>) : <FactRow ok={false} text="No certificates found in CT logs — site has no verifiable certificate history"/>}
            </LayerBar>

            <LayerBar label="Domain age & registration" score={result.layers.domain_age.score} max={25}
              color={result.layers.domain_age.score >= 18 ? '#4ade80' : result.layers.domain_age.score >= 10 ? '#ffffff' : '#f87171'}
              expanded={expanded.age} onToggle={() => toggle('age')}>
              {result.layers.domain_age.data ? (<>
                <FactRow ok={true}  text={`Domain registered: ${result.layers.domain_age.data.registeredDate}`}/>
                <FactRow ok={result.layers.domain_age.data.ageYears >= 1} text={`Age: ${result.layers.domain_age.data.ageYears} year${result.layers.domain_age.data.ageYears!==1?'s':''} (${result.layers.domain_age.data.ageDays} days)`}/>
              </>) : (<>
                <FactRow ok={null} text="RDAP registration data not available for this TLD"/>
                {result.layers.ct_lineage.data?.daysSince > 0 && <FactRow ok={null} text={`Estimated from CT history: ~${result.layers.ct_lineage.data.yearsSince} years`}/>}
              </>)}
              <p style={{ marginTop:8, fontSize:11, color:'var(--v2-text-3)' }}>Phishing sites are typically registered hours before an attack. A domain registered years ago is far less likely to be a phishing operation.</p>
            </LayerBar>

            <LayerBar label="DNS infrastructure signals" score={result.layers.dns_infrastructure.score} max={20}
              color={result.layers.dns_infrastructure.score >= 14 ? '#4ade80' : result.layers.dns_infrastructure.score >= 8 ? '#ffffff' : '#f87171'}
              expanded={expanded.dns} onToggle={() => toggle('dns')}>
              {result.layers.dns_infrastructure.data && (<>
                <FactRow ok={result.layers.dns_infrastructure.data.hasHTTPS}  text={`HTTPS: ${result.layers.dns_infrastructure.data.hasHTTPS ? 'Site responds over HTTPS' : 'No HTTPS response detected'}`}/>
                <FactRow ok={result.layers.dns_infrastructure.data.hasMX}     text={`MX records: ${result.layers.dns_infrastructure.data.hasMX ? 'Email infrastructure configured' : 'No email records — unusual for established businesses'}`}/>
                <FactRow ok={result.layers.dns_infrastructure.data.hasSPF}    text={`SPF record: ${result.layers.dns_infrastructure.data.hasSPF ? 'Email sender policy configured' : 'No SPF — email not properly authenticated'}`}/>
                <FactRow ok={result.layers.dns_infrastructure.data.hasDMARC}  text={`DMARC policy: ${result.layers.dns_infrastructure.data.hasDMARC ? 'Domain email policy in place' : 'No DMARC policy configured'}`}/>
                <FactRow ok={result.layers.dns_infrastructure.data.hasCAA}    text={`CAA records: ${result.layers.dns_infrastructure.data.hasCAA ? 'Certificate issuance restricted to approved CAs' : 'No CAA restriction — any CA can issue'}`}/>
              </>)}
              <p style={{ marginTop:8, fontSize:11, color:'var(--v2-text-3)' }}>Legitimate businesses invest in proper email infrastructure — SPF, DMARC, and MX records. Phishing sites rarely bother with these signals.</p>
            </LayerBar>

            <LayerBar label="Abuse & threat signals" score={result.layers.abuse_signals.score} max={15}
              color={result.layers.abuse_signals.score === 15 ? '#4ade80' : '#f87171'}
              expanded={expanded.abuse} onToggle={() => toggle('abuse')}>
              <FactRow ok={!result.layers.abuse_signals.data?.flagged} text={result.layers.abuse_signals.data?.flagged ? `FLAGGED: ${result.layers.abuse_signals.data.flagReason}` : 'No matches in public abuse and spam blocklists'}/>
              <p style={{ marginTop:8, fontSize:11, color:'var(--v2-text-3)' }}>Checked against Spamhaus Domain Block List and public DNS-based threat intelligence feeds. A clean result means no reported abuse history.</p>
            </LayerBar>
          </div>

          {/* Embed section */}
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:12, padding:'18px 20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Zap size={14} color="#c0392b"/>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>Add Trust Passport to {result.domain}</span>
            </div>
            <p style={{ fontSize:12, color:'var(--v2-text-3)', marginBottom:10, lineHeight:1.6 }}>
              If you own this site, embed your Trust Passport score — it updates automatically as your domain builds more history. Free forever.
            </p>
            <div className="embed-box" style={{ marginBottom:10 }}>{embedCode}</div>
            <CopyButton text={embedCode}/>
          </div>

          {/* Public API */}
          <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:12, padding:'18px 20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Shield size={14} color="#c0392b"/>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>Public API — free, no auth required</span>
            </div>
            <div className="api-box">
              <div><span style={{color:'#7ee787'}}>POST</span> <span style={{color:'#79c0ff'}}>https://frthcwkntciaakqsppss.supabase.co/functions/v1/trust-passport</span></div>
              <div style={{color:'#8b949e'}}>{"{ \"domain\": \"" + result.domain + "\" }"}</div>
              <div style={{color:'#8b949e', marginTop:4}}>→ score: {result.score}  grade: "{result.grade}"  verdict: "{result.verdict}"</div>
            </div>
            <p style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:8, lineHeight:1.6 }}>
              Build it into your security tools, AI agents, or browser extensions. The Trust Passport API is open — no API key needed for domain lookups.
            </p>
          </div>

          {/* Timestamp */}
          <div style={{ textAlign:'center', fontSize:11, color:'var(--v2-text-3)', fontFamily:MONO }}>
            Computed {new Date(result.computed_at).toLocaleTimeString()} · Data: crt.sh CT logs · Cloudflare DNS · RDAP · Spamhaus · SSLVault PKI intelligence
          </div>

        </div>
      )}

      {/* How it works — shown when no result */}
      {!result && !loading && (
        <div style={{ maxWidth:720, margin:'32px auto 48px', padding:'0 clamp(16px,4vw,48px)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
            {[
              { icon:<Clock size={16} color="#c0392b"/>, title:'Time is the currency', body:'Phishing sites are spun up in hours. A domain with 5 years of clean CT log history cannot be faked — no matter how much money an attacker has.' },
              { icon:<Shield size={16} color="#16a34a"/>, title:'Works for every site', body:'No EV certificate needed. No OV. No paid plan. A free Let\'s Encrypt cert on a 7-year-old blog scores just as high as an EV cert on a new domain.' },
              { icon:<Globe size={16} color="#c0392b"/>, title:'Fully open data', body:'All sources are public: Certificate Transparency logs (RFC 9162), RDAP, DNS, and public blocklists. Nobody controls the score except time and clean operation.' },
              { icon:<Zap size={16} color="#f07059"/>, title:'Built for AI agents', body:'In 2026, AI agents browse and transact on your behalf. The public API lets any agent check domain trust in milliseconds before proceeding.' },
            ].map(c => (
              <div key={c.title} style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:12, padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>{c.icon}<span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>{c.title}</span></div>
                <p style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7, margin:0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
