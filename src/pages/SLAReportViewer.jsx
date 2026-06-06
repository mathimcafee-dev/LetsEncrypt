// SLAReportViewer.jsx — renders SLA compliance report from token
import { useEffect, useState, useRef } from 'react'

const SB_FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/sla-report-gen'

export default function SLAReportViewer() {
  const [state,  setState]  = useState('loading')
  const [srcDoc, setSrcDoc] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const iframeRef = useRef(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setState('error'); setErrMsg('No report token in URL.'); return }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)

    fetch(`${SB_FN}?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async res => {
        clearTimeout(timer)
        if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`))
        return res.text()
      })
      .then(html => {
        // Replace window.print() inside iframe with a postMessage to parent
        const patched = html.replace(
          /onclick="window\.print\(\)"/g,
          'onclick="window.parent.postMessage(\'print\',\'*\')"'
        )
        setSrcDoc(patched)
        setState('ready')
      })
      .catch(e => {
        clearTimeout(timer)
        setErrMsg(e.name === 'AbortError' ? 'Request timed out. Please try again.' : e.message || 'Failed to load report.')
        setState('error')
      })

    return () => { clearTimeout(timer); controller.abort() }
  }, [])

  // Listen for print message from iframe
  useEffect(() => {
    const handler = (e) => { if (e.data === 'print') window.print() }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const S = { page: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    minHeight:'100vh', background:'#f0f4fa', gap:16, fontFamily:"'Inter',system-ui,sans-serif", padding:32 } }

  if (state === 'loading') return (
    <div style={S.page}>
      <div style={{ width:52, height:52, background:'#0077b6', borderRadius:13,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:'#111111' }}>Loading compliance report…</div>
      <div style={{ fontSize:12, color:'#888888' }}>This may take a few seconds</div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0077b6" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation:'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (state === 'error') return (
    <div style={S.page}>
      <div style={{ width:52, height:52, background:'rgba(192,57,43,0.1)', borderRadius:13,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>⚠️</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#111111' }}>Could not load report</div>
      <div style={{ fontSize:13, color:'#555555', maxWidth:420, textAlign:'center', lineHeight:1.7 }}>
        {errMsg || 'This report link may have expired. Please generate a new report from your Compliance Centre.'}
      </div>
      <a href="https://easysecurity.in/compliance-centre"
        style={{ marginTop:8, padding:'11px 28px', background:'#0077b6', color:'#fff',
          textDecoration:'none', borderRadius:8, fontSize:13, fontWeight:700 }}>
        Go to Compliance Centre →
      </a>
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          #report-iframe { position:fixed; top:0; left:0; width:100%; height:100%; border:none; }
        }
      `}</style>
      <iframe
        id="report-iframe"
        ref={iframeRef}
        srcDoc={srcDoc}
        style={{ width:'100vw', height:'100vh', border:'none', display:'block' }}
        title="SSLVault Compliance Report"
        sandbox="allow-scripts allow-same-origin"
      />
    </>
  )
}
