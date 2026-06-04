// CAAChecker.jsx — Standalone CAA Record Checker page
import { useState } from 'react'
import { Shield, Search, CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, ArrowLeft, Copy, Check } from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function StatusIcon({ status }) {
  if (status === 'pass')    return <CheckCircle  size={15} color="#16a34a" style={{ flexShrink:0 }} />
  if (status === 'fail')    return <XCircle      size={15} color="#0077b6" style={{ flexShrink:0 }} />
  if (status === 'warn')    return <AlertTriangle size={15} color="#0077b6" style={{ flexShrink:0 }} />
  return                           <Info         size={15} color="#0077b6" style={{ flexShrink:0 }} />
}

function StatusBadge({ status }) {
  const map = {
    pass: { bg:'transparent', color:'#00a550', label:'Pass' },
    fail: { bg:'rgba(0,119,182,0.09)', color:'#0077b6', label:'Fail' },
    warn: { bg:'rgba(239,68,68,0.08)', color:'#111111', label:'Warning' },
    info: { bg:'transparent', color:'#111111', label:'Info' },
  }
  const s = map[status] || map.info
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4,
      background:s.bg, color:s.color }}>
      {s.label}
    </span>
  )
}

function CopySnippet({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1800) }}
      style={{ display:'flex', alignItems:'center', gap:5, background:'transparent',
        border:'1px solid rgba(0,0,0,0.08)', borderRadius:4, padding:'4px 9px',
        fontSize:12, color:'#333333', cursor:'pointer', fontFamily:'monospace' }}>
      {copied ? <Check size={11} color="#16a34a"/> : <Copy size={11}/>}
      {text}
    </button>
  )
}

export default function CAAChecker({ nav }) {
  const isMobile = useIsMobile()
  const [domain,   setDomain]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const check = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/,'')
    if (!d) { setError('Enter a domain name'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`${SB_URL}/functions/v1/caa-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.error || 'Check failed')
      setResult(data)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:760 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <button onClick={() => nav('/dashboard')}
            style={{ display:'flex', alignItems:'center', gap:4, background:'none',
              border:'none', color:'#888888', fontSize:13, cursor:'pointer', padding:0 }}>
            <ArrowLeft size={14}/> Back
          </button>
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="#0077b6"/>
            </div>
            <h1 className="v2-h1">CAA Record Checker</h1>
          </div>
          <p style={{ fontSize:13, color:'#888888', margin:0 }}>
            Verify that your domain's DNS allows GoGetSSL to issue certificates — before you attempt issuance.
          </p>
        </div>

        {/* Input */}
        <div style={{ background:'transparent', border:'1px solid var(--v2-border)', borderRadius:10, padding:'16px 18px', marginBottom:16 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="easysecurity.in"
              style={{ flex:1, padding:'9px 12px', border:'1px solid var(--v2-border-strong)',
                borderRadius:6, fontSize:14, fontFamily:'inherit', color:'#111111',
                background:'rgba(0,0,0,0.02)', outline:'none' }}
            />
            <button
              onClick={check}
              disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:6, background:'#f0f4fa',
                color:'#111111', border:'none', borderRadius:6, padding:'9px 18px',
                fontSize:13, fontWeight:600, cursor:loading?'not-allowed':'pointer',
                opacity:loading?0.6:1, fontFamily:'inherit', whiteSpace:'nowrap' }}>
              {loading ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Search size={14}/>}
              {loading ? 'Checking…' : 'Check CAA'}
            </button>
          </div>
          {error && <p style={{ fontSize:12, color:'var(--v2-red-text)', margin:'8px 0 0' }}>{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <div style={{ animation:'fadeSlideUp 0.3s ease both' }}>

            {/* Summary banner */}
            <div style={{
              background: result.safeToIssue ? 'transparent' : 'rgba(0,119,182,0.09)',
              border: `0.5px solid ${result.safeToIssue ? 'rgba(0,119,182,0.2)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius:10, padding:'14px 16px', marginBottom:16,
              display:'flex', alignItems:'flex-start', gap:10,
            }}>
              {result.safeToIssue
                ? <CheckCircle size={18} color="#16a34a" style={{ flexShrink:0, marginTop:1 }}/>
                : <XCircle     size={18} color="#0077b6" style={{ flexShrink:0, marginTop:1 }}/>}
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:600,
                  color: result.safeToIssue ? '#111111' : '#0077b6' }}>{result.summary}</p>
                {result.checkedDomain !== result.domain && (
                  <p style={{ margin:'3px 0 0', fontSize:12, color:'#333333' }}>
                    CAA inherited from parent: <code style={{ fontSize:11 }}>{result.checkedDomain}</code>
                  </p>
                )}
              </div>
            </div>

            {/* Checks list */}
            <div style={{ background:'transparent', border:'1px solid var(--v2-border)', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(0,0,0,0.06)',
                background:'rgba(0,0,0,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#333333', textTransform:'uppercase', letterSpacing:'0.4px' }}>Check results</span>
                <span style={{ fontSize:11, color:'#888888' }}>{result.domain}</span>
              </div>
              {result.checks.map((c, i) => (
                <div key={c.key} style={{ padding:'13px 16px',
                  borderBottom: i < result.checks.length-1 ? '1px solid var(--v2-border)' : 'none',
                  display:'flex', alignItems:'flex-start', gap:10 }}>
                  <StatusIcon status={c.status}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:c.detail?3:0 }}>
                      <span style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{c.label}</span>
                      <StatusBadge status={c.status}/>
                    </div>
                    {c.detail && <p style={{ margin:0, fontSize:12, color:'#888888' }}>{c.detail}</p>}
                    {c.raw && (
                      <div style={{ marginTop:6 }}>
                        <p style={{ margin:'0 0 4px', fontSize:11, color:'#888888' }}>Suggested DNS record:</p>
                        <CopySnippet text={c.raw}/>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Raw records */}
            {result.rawRecords?.length > 0 && (
              <div style={{ background:'transparent', border:'1px solid var(--v2-border)', borderRadius:8, padding:'12px 14px' }}>
                <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:600, color:'#888888', textTransform:'uppercase', letterSpacing:'0.4px' }}>Raw CAA records</p>
                {result.rawRecords.map((r, i) => (
                  <code key={i} style={{ display:'block', fontSize:12, color:'#333333', padding:'2px 0' }}>{r}</code>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!result && !loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#888888' }}>
            <Shield size={32} style={{ marginBottom:10, opacity:0.3 }}/>
            <p style={{ fontSize:13, margin:0 }}>Enter a domain above to check its CAA DNS records</p>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
