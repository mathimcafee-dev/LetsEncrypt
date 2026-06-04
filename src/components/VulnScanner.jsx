// VulnScanner.jsx — SSL Vulnerability Scanner panel, used inside cert detail
import { useState } from 'react'
import { Bug, RefreshCw, CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function GradeBadge({ grade }) {
  const map = {
    'A+': { bg:'rgba(31,92,78,0.08)', color:'#1f5c4e' },
    'A':  { bg:'rgba(31,92,78,0.08)', color:'#5edb8a' },
    'B':  { bg:'rgba(31,92,78,0.08)', color:'#1f5c4e' },
    'C':  { bg:'rgba(230,126,34,0.08)', color:'#e67e22' },
    'D':  { bg:'rgba(31,92,78,0.08)', color:'#1f5c4e' },
    'F':  { bg:'rgba(31,92,78,0.09)', color:'#1f5c4e' },
  }
  const s = map[grade] || { bg:'rgba(26,0,0,0.5)', color:'#888888' }
  return (
    <div style={{ width:48, height:48, borderRadius:10, background:s.bg,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:20, fontWeight:800, color:s.color, flexShrink:0 }}>
      {grade || '?'}
    </div>
  )
}

function ProtoRow({ proto }) {
  const icon = proto.status === 'good'
    ? <CheckCircle  size={13} color="#16a34a" style={{ flexShrink:0 }}/>
    : proto.status === 'bad'
    ? <XCircle      size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>
    : <AlertTriangle size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0',
      borderBottom:'0.5px solid rgba(15,23,42,0.06)' }}>
      {icon}
      <span style={{ fontSize:13, flex:1, color:'transparent' }}>{proto.name}</span>
      <span style={{ fontSize:11, color: proto.status==='good'?'#16a34a':proto.status==='bad'?'#1f5c4e':'#1f5c4e' }}>
        {proto.note}
      </span>
    </div>
  )
}

function VulnRow({ v }) {
  const icon = v.status === 'safe'
    ? <CheckCircle  size={13} color="#16a34a" style={{ flexShrink:0 }}/>
    : v.status === 'vulnerable'
    ? <XCircle      size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>
    : <Info         size={13} color="#1f5c4e" style={{ flexShrink:0 }}/>
  const label = v.status === 'safe' ? { text:'Not vulnerable', color:'#5edb8a' }
    : v.status === 'vulnerable' ? { text:'Vulnerable', color:'#1f5c4e' }
    : { text:'Manual check', color:'#1f5c4e' }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0',
      borderBottom:'0.5px solid rgba(15,23,42,0.06)' }}>
      {icon}
      <span style={{ fontSize:13, flex:1, color:'transparent' }}>{v.name}</span>
      <span style={{ fontSize:11, fontWeight:600, color:label.color }}>{label.text}</span>
    </div>
  )
}

function CipherBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
      <span style={{ fontSize:12, color:'#888888', width:60 }}>{label}</span>
      <div style={{ flex:1, height:5, borderRadius:3, background:'transparent', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3,
          transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)' }}/>
      </div>
      <span style={{ fontSize:12, color:'#b5aea8', width:32, textAlign:'right' }}>{pct}%</span>
    </div>
  )
}

export default function VulnScanner({ domain, session }) {
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [expanded, setExpanded] = useState(false)

  const scan = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`${SB_URL}/functions/v1/ssl-vuln-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ domain }),
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.error || 'Scan failed')
      setResult(data)
      setExpanded(true)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const totalCiphers = result ? result.ciphers.strong + result.ciphers.medium + result.ciphers.weak : 0

  return (
    <div style={{ marginTop:12 }}>
      {/* Trigger row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', background:'rgba(31,92,78,0.05)', border:'0.5px solid rgba(15,23,42,0.08)',
        borderRadius: result ? '8px 8px 0 0' : 8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Bug size={14} color="#777777"/>
          <span style={{ fontSize:13, fontWeight:500, color:'#333333' }}>SSL Vulnerability Scan</span>
          {result && <GradeBadge grade={result.grade}/>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {result && (
            <button onClick={() => setExpanded(e=>!e)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#b5aea8', display:'flex', alignItems:'center' }}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
          <button onClick={scan} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:5, background:'transparent',
              color:'white', border:'none', borderRadius:5, padding:'6px 12px',
              fontSize:12, fontWeight:600, cursor:loading?'not-allowed':'pointer',
              opacity:loading?0.6:1, fontFamily:'inherit' }}>
            {loading
              ? <><RefreshCw size={12} style={{ animation:'spin 1s linear infinite' }}/> Scanning…</>
              : result ? <><RefreshCw size={12}/> Re-scan</> : 'Run scan'
            }
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding:'8px 14px', background:'rgba(31,92,78,0.09)', border:'0.5px solid #fecaca',
          borderTop:'none', borderRadius:'0 0 8px 8px', fontSize:12, color:'#1f5c4e' }}>
          {error}
        </div>
      )}

      {/* Results panel */}
      {result && expanded && (
        <div style={{ border:'0.5px solid rgba(15,23,42,0.08)', borderTop:'none',
          borderRadius:'0 0 8px 8px', background:'white', padding:'14px 16px',
          animation:'fadeSlideUp 0.25s ease both' }}>

          {/* Grade + score */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16,
            paddingBottom:12, borderBottom:'0.5px solid rgba(15,23,42,0.06)' }}>
            <GradeBadge grade={result.grade}/>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'transparent' }}>
                Score: {result.score}/100
              </p>
              <p style={{ margin:'2px 0 0', fontSize:11, color:'#b5aea8' }}>
                {result.hsts ? '✓ HSTS' : '✗ HSTS missing'} · {result.caa ? '✓ CAA' : '✗ CAA missing'}
              </p>
            </div>
          </div>

          {/* Protocols */}
          <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#b5aea8',
            textTransform:'uppercase', letterSpacing:'0.5px' }}>Protocol support</p>
          <div style={{ marginBottom:14 }}>
            {result.protocols.map(p => <ProtoRow key={p.name} proto={p}/>)}
          </div>

          {/* Vulnerabilities */}
          <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#b5aea8',
            textTransform:'uppercase', letterSpacing:'0.5px' }}>Known vulnerabilities</p>
          <div style={{ marginBottom:14 }}>
            {result.vulns.map(v => <VulnRow key={v.name} v={v}/>)}
          </div>

          {/* Cipher strength */}
          <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:'#b5aea8',
            textTransform:'uppercase', letterSpacing:'0.5px' }}>Cipher strength</p>
          <CipherBar label="Strong" count={result.ciphers.strong} total={totalCiphers} color="#1f5c4e"/>
          <CipherBar label="Medium" count={result.ciphers.medium} total={totalCiphers} color="#1f5c4e"/>
          <CipherBar label="Weak"   count={result.ciphers.weak}   total={totalCiphers} color="#1f5c4e"/>

          {result.note && (
            <p style={{ margin:'10px 0 0', fontSize:11, color:'#b5aea8',
              paddingTop:10, borderTop:'0.5px solid rgba(15,23,42,0.06)' }}>
              ℹ {result.note}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
