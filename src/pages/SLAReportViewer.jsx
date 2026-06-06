// SLAReportViewer.jsx — renders SLA compliance report from token
// Fetches HTML from sla-report-gen edge function, writes into iframe
// Email links point here: /sla-report?token=xxx

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const SB_REPORT_URL = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/sla-report-gen'

export default function SLAReportViewer() {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errMsg, setErrMsg]  = useState('')
  const iframeRef = useRef(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setStatus('error'); setErrMsg('No report token in URL.'); return }

    fetch(`${SB_REPORT_URL}?token=${token}`)
      .then(async res => {
        if (!res.ok) { throw new Error(await res.text()) }
        return res.text()
      })
      .then(htmlContent => {
        const iframe = iframeRef.current
        if (!iframe) return
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (!doc) return
        doc.open()
        doc.write(htmlContent)
        doc.close()
        setStatus('ready')
      })
      .catch(e => {
        setStatus('error')
        setErrMsg(e.message || 'Failed to load report')
      })
  }, [])

  if (status === 'loading') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#f0f4fa', gap:16, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:48, height:48, background:'#0077b6', borderRadius:12,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:'#111111' }}>Loading compliance report…</div>
      <RefreshCw size={18} color="#0077b6" style={{ animation:'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (status === 'error') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#f0f4fa', gap:12, fontFamily:"'Inter',system-ui,sans-serif", padding:32 }}>
      <div style={{ width:48, height:48, background:'rgba(192,57,43,0.1)', borderRadius:12,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>⚠️</div>
      <div style={{ fontSize:16, fontWeight:700, color:'#111111' }}>Report not found</div>
      <div style={{ fontSize:13, color:'#555555', maxWidth:400, textAlign:'center', lineHeight:1.6 }}>
        {errMsg || 'This report link may have expired or is invalid. Please generate a new report from your Compliance Centre.'}
      </div>
      <a href="https://easysecurity.in/compliance-centre"
        style={{ marginTop:8, padding:'10px 24px', background:'#0077b6', color:'#fff',
          textDecoration:'none', borderRadius:8, fontSize:13, fontWeight:700 }}>
        Go to Compliance Centre →
      </a>
    </div>
  )

  // Ready — iframe fills viewport
  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:'#f0f4fa' }}>
      <iframe
        ref={iframeRef}
        style={{ width:'100%', height:'100%', border:'none', display:'block' }}
        title="SSLVault Compliance Report"
      />
    </div>
  )
}
