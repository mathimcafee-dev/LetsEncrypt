// BulkIssuePage.jsx — Multi-domain SSL bulk issuance
// DigiCert blue/white design system throughout
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Upload, Plus, X, RefreshCw, CheckCircle, AlertTriangle, Download, RotateCcw, ArrowRight, Shield } from 'lucide-react'

const SB_URL  = 'https://frthcwkntciaakqsppss.supabase.co'
const MONO    = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const F       = "'Inter',system-ui,sans-serif"
const NAVY    = '#003768'
const BLUE    = '#0061a7'
const GREEN   = '#1a7e3b'
const AMBER   = '#b87d00'
const RED     = '#c0392b'

const CERT_TYPES = [
  { value:'DV',       label:'DV Standard',   desc:'Domain Validated · issued in minutes' },
  { value:'WILDCARD', label:'Wildcard DV',    desc:'*.domain.com · covers all subdomains' },
]

const STATUS_META = {
  queued:      { color:'#8a9ab5',  bg:'#f5f8fc',  border:'#dde4ef',  label:'Queued' },
  submitting:  { color:BLUE,       bg:'#e8f1fb',  border:'#b8d0f0',  label:'Submitting…' },
  validating:  { color:AMBER,      bg:'#fef9ec',  border:'#f5d78e',  label:'DNS Validating…' },
  issued:      { color:GREEN,      bg:'#e8f7ee',  border:'#b8e2c8',  label:'Issued ✓' },
  installed:   { color:GREEN,      bg:'#e8f7ee',  border:'#b8e2c8',  label:'Installed ✓' },
  failed:      { color:RED,        bg:'#fde8e8',  border:'#f5b8b8',  label:'Failed' },
}

function parseDomainsFromText(text) {
  return text
    .split(/[\n,;\s]+/)
    .map(d => d.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,''))
    .filter(d => d.length > 0 && d.includes('.'))
}

function validateDomain(d) {
  return /^[a-z0-9*][a-z0-9\-.*]*\.[a-z]{2,}$/i.test(d)
}

export default function BulkIssuePage({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const [step, setStep]               = useState(1) // 1=input, 2=progress, 3=done
  const [domainText, setDomainText]   = useState('')
  const [certType, setCertType]       = useState('DV')
  const [dnsProviders, setDnsProviders] = useState([])
  const [dnsProviderId, setDnsProviderId] = useState('')
  const [label, setLabel]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [jobId, setJobId]             = useState(null)
  const [job, setJob]                 = useState(null)
  const [items, setItems]             = useState([])
  const [pollError, setPollError]     = useState('')
  const [retrying, setRetrying]       = useState(false)
  const pollRef                       = useRef(null)
  const fileInputRef                  = useRef(null)

  // Load DNS providers
  useEffect(() => {
    if (!user) return
    supabase.from('dns_credentials')
      .select('id, provider, label')
      .eq('user_id', user.id)
      .then(({ data }) => setDnsProviders(data || []))
  }, [user?.id])

  // Auto-select first DNS provider
  useEffect(() => {
    if (dnsProviders.length && !dnsProviderId) setDnsProviderId(dnsProviders[0].id)
  }, [dnsProviders])

  // Poll job status when on step 2
  const pollStatus = useCallback(async () => {
    if (!jobId) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'status', job_id: jobId }),
      })
      const d = await res.json()
      if (d.ok) {
        setJob(d.job)
        setItems(d.items || [])
        if (['completed','partial','failed'].includes(d.job.status)) {
          clearInterval(pollRef.current)
          setStep(3)
        }
      } else {
        setPollError(d.error || 'Status check failed')
      }
    } catch (e) {
      setPollError(e.message)
    }
  }, [jobId])

  useEffect(() => {
    if (step === 2 && jobId) {
      pollStatus()
      pollRef.current = setInterval(pollStatus, 3000)
      return () => clearInterval(pollRef.current)
    }
  }, [step, jobId, pollStatus])

  const handleCsvUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const domains = parseDomainsFromText(text)
      setDomainText(prev => {
        const existing = parseDomainsFromText(prev)
        const merged = [...new Set([...existing, ...domains])]
        return merged.join('\n')
      })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleStart = async () => {
    const domains = parseDomainsFromText(domainText)
    const invalid = domains.filter(d => !validateDomain(d))
    if (!domains.length) return alert('Enter at least one domain')
    if (invalid.length) return alert(`Invalid domains: ${invalid.slice(0,5).join(', ')}`)
    if (domains.length > 100) return alert('Maximum 100 domains per job')

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'start',
          domains,
          cert_type: certType,
          dns_provider_id: dnsProviderId || null,
          label: label.trim() || null,
        }),
      })
      const d = await res.json()
      if (d.ok) {
        setJobId(d.job_id)
        setStep(2)
      } else {
        alert(`Failed to start: ${d.error}`)
      }
    } catch (e) {
      alert(e.message)
    }
    setSubmitting(false)
  }

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'retry', job_id: jobId }),
      })
      setStep(2)
      pollRef.current = setInterval(pollStatus, 3000)
    } catch (e) { alert(e.message) }
    setRetrying(false)
  }

  const downloadResults = () => {
    const rows = ['domain,status,cert_id,error']
    items.forEach(i => rows.push(`${i.domain},${i.status},${i.cert_id||''},${i.error||''}`))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bulk-ssl-${jobId?.slice(0,8)}.csv`
    a.click()
  }

  const parsedDomains = parseDomainsFromText(domainText)
  const invalidDomains = parsedDomains.filter(d => !validateDomain(d))
  const validCount = parsedDomains.length - invalidDomains.length

  const progressPct = job ? Math.round(((job.completed + job.failed_count) / job.total_domains) * 100) : 0

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', background:'#f0f4f9' }}>
      <RefreshCw size={22} style={{ animation:'spin .8s linear infinite' }} color="#003768"/>
    </div>
  )
  if (!user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', background:'#f0f4f9' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:600, color:NAVY, marginBottom:12 }}>Sign in to use Bulk Issuance</div>
        <button onClick={() => nav('/auth')} style={{ background:NAVY, color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F }}>Sign in</button>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#f0f4f9', minHeight:'100vh', fontFamily:F }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .bi-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:1px solid #dde4ef;background:#fff;font-size:12px;font-weight:500;color:#5a7090;cursor:pointer;font-family:inherit;transition:all .15s}
        .bi-btn:hover{border-color:${NAVY};color:${NAVY}}
        .bi-btn.pri{background:${NAVY};border-color:${NAVY};color:#fff}
        .bi-btn.pri:hover{background:#004d96}
        .bi-btn:disabled{opacity:.5;cursor:not-allowed}
        .domain-input{width:100%;min-height:160px;padding:12px;border-radius:8px;border:1px solid #dde4ef;background:#fff;font-size:12px;font-family:${MONO};color:${NAVY};outline:none;resize:vertical;line-height:1.7;transition:border-color .15s}
        .domain-input:focus{border-color:${NAVY}}
        .progress-bar-track{height:6px;background:#e8edf5;border-radius:3px;overflow:hidden}
        .item-row{display:grid;grid-template-columns:1fr 130px 1fr;align-items:center;padding:9px 16px;border-bottom:1px solid #f0f4f9;gap:8px;transition:background .1s}
        .item-row:hover{background:#f8fafc}
        .item-row:last-child{border-bottom:none}
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{ background:NAVY, padding:'12px 24px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => nav('/dashboard')} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', gap:5, fontSize:12, fontFamily:F, padding:0 }}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.9)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
          ← Dashboard
        </button>
        <div style={{ width:1, height:16, background:'rgba(255,255,255,0.15)' }}/>
        <div style={{ width:28, height:28, borderRadius:7, background:BLUE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Upload size={13} color="#fff"/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Bulk SSL Issuance</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', fontFamily:MONO }}>Issue up to 100 certificates in one job</div>
        </div>
        {/* Step indicator */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:MONO,
                background: step === s ? '#fff' : step > s ? '#4fc37a' : 'rgba(255,255,255,0.15)',
                color: step === s ? NAVY : step > s ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div style={{ width:16, height:1, background:'rgba(255,255,255,0.2)' }}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 24px 80px' }}>

        {/* ═══════════════════════════════════════════════════════ STEP 1 */}
        {step === 1 && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)', marginBottom:12 }}>
              <div style={{ background:NAVY, padding:'10px 18px', display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' }}>
                <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:MONO }}>Step 1 — Enter domains</span>
                <div style={{ display:'flex', gap:6 }}>
                  <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleCsvUpload} style={{ display:'none' }}/>
                  <button className="bi-btn" style={{ fontSize:10, padding:'4px 10px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.8)' }}
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload size={10}/> Upload CSV
                  </button>
                </div>
              </div>
              <div style={{ padding:'16px 18px' }}>
                <div style={{ fontSize:11, color:'#8a9ab5', marginBottom:8 }}>
                  One domain per line — or paste comma/space separated. Wildcards supported (*.domain.com).
                </div>
                <textarea
                  className="domain-input"
                  placeholder={'easysecurity.in\nfreecerts.site\napi.shop.com\n*.mycompany.io'}
                  value={domainText}
                  onChange={e => setDomainText(e.target.value)}
                />
                {/* Domain count + validation feedback */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  {parsedDomains.length > 0 && (
                    <span style={{ fontSize:11, color:GREEN, fontFamily:MONO }}>
                      ✓ {validCount} valid domain{validCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {invalidDomains.length > 0 && (
                    <span style={{ fontSize:11, color:RED, fontFamily:MONO }}>
                      ✗ {invalidDomains.length} invalid: {invalidDomains.slice(0,3).join(', ')}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:'#c0c8d8', marginLeft:'auto', fontFamily:MONO }}>
                    max 100 domains per job
                  </span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              {/* Cert type */}
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)' }}>
                <div style={{ background:NAVY, padding:'9px 16px' }}>
                  <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:MONO }}>Certificate type</span>
                </div>
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                  {CERT_TYPES.map(ct => (
                    <label key={ct.value} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', padding:'8px 10px', borderRadius:8,
                      background: certType === ct.value ? '#f0f5fb' : 'transparent',
                      border: `1px solid ${certType === ct.value ? '#b8d0f0' : 'transparent'}` }}>
                      <div onClick={() => setCertType(ct.value)} style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, marginTop:1,
                        border: `2px solid ${certType === ct.value ? NAVY : '#dde4ef'}`,
                        background: certType === ct.value ? NAVY : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                        {certType === ct.value && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:NAVY }}>{ct.label}</div>
                        <div style={{ fontSize:10, color:'#8a9ab5' }}>{ct.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* DNS provider + label */}
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)' }}>
                <div style={{ background:NAVY, padding:'9px 16px' }}>
                  <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:MONO }}>DNS & Job settings</span>
                </div>
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#8a9ab5', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5, fontFamily:MONO }}>DNS provider</label>
                    {dnsProviders.length === 0 ? (
                      <div style={{ fontSize:11, color:AMBER, background:'#fef9ec', border:'1px solid #f5d78e', borderRadius:7, padding:'8px 10px' }}>
                        No DNS providers configured.{' '}
                        <button onClick={() => nav('/dns-providers')} style={{ background:'none', border:'none', color:BLUE, cursor:'pointer', fontSize:11, fontFamily:F, padding:0, fontWeight:600 }}>
                          Connect one →
                        </button>
                      </div>
                    ) : (
                      <select value={dnsProviderId} onChange={e => setDnsProviderId(e.target.value)}
                        style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #dde4ef', background:'#fff', fontSize:12, color:NAVY, fontFamily:F, outline:'none' }}>
                        <option value="">No DNS (manual DCV)</option>
                        {dnsProviders.map(p => (
                          <option key={p.id} value={p.id}>{p.label || p.provider}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#8a9ab5', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5, fontFamily:MONO }}>Job label (optional)</label>
                    <input type="text" placeholder="e.g. Client ABC — July batch"
                      value={label} onChange={e => setLabel(e.target.value)}
                      style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7, border:'1px solid #dde4ef', background:'#fff', fontSize:12, color:NAVY, fontFamily:F, outline:'none', transition:'border-color .15s' }}
                      onFocus={e=>e.target.style.borderColor=NAVY}
                      onBlur={e=>e.target.style.borderColor='#dde4ef'}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="bi-btn pri" onClick={handleStart} disabled={submitting || validCount === 0}
                style={{ padding:'10px 24px', fontSize:13, gap:8 }}>
                {submitting ? <><RefreshCw size={13} style={{ animation:'spin .8s linear infinite' }}/> Starting…</> : <>Start bulk issuance · {validCount} domains <ArrowRight size={13}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ STEP 2 */}
        {step === 2 && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)', marginBottom:12 }}>
              {/* Header */}
              <div style={{ background:NAVY, padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:MONO }}>
                  Step 2 — Processing · Job {jobId?.slice(0,8)}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#4fc37a', fontFamily:MONO }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#4fc37a', animation:'spin 2s linear infinite' }}/>
                  Live
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:NAVY }}>
                    {job ? `${job.completed + job.failed_count} / ${job.total_domains} domains processed` : 'Starting…'}
                  </span>
                  <span style={{ fontSize:12, fontWeight:600, color:NAVY, fontFamily:MONO }}>{progressPct}%</span>
                </div>
                <div className="progress-bar-track">
                  <div style={{ height:'100%', width:`${progressPct}%`, background: job?.failed_count > 0 ? AMBER : BLUE, borderRadius:3, transition:'width .5s ease' }}/>
                </div>
                {job && (
                  <div style={{ display:'flex', gap:16, marginTop:10 }}>
                    <span style={{ fontSize:11, color:GREEN, fontFamily:MONO }}>✓ {job.completed} issued</span>
                    {job.failed_count > 0 && <span style={{ fontSize:11, color:RED, fontFamily:MONO }}>✗ {job.failed_count} failed</span>}
                    <span style={{ fontSize:11, color:'#8a9ab5', fontFamily:MONO }}>
                      {job.total_domains - job.completed - job.failed_count} remaining
                    </span>
                  </div>
                )}
                {pollError && <div style={{ fontSize:11, color:RED, marginTop:8 }}>Poll error: {pollError}</div>}
              </div>

              {/* Item list */}
              <div style={{ borderTop:'1px solid #e8edf5' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 1fr', padding:'7px 16px', background:'#fafbfc', borderBottom:'1px solid #e8edf5' }}>
                  {['Domain','Status','Detail'].map(h => (
                    <div key={h} style={{ fontSize:8, fontWeight:600, color:'#8a9ab5', textTransform:'uppercase', letterSpacing:'.07em', fontFamily:MONO }}>{h}</div>
                  ))}
                </div>
                <div style={{ maxHeight:400, overflowY:'auto' }}>
                  {items.map(item => {
                    const meta = STATUS_META[item.status] || STATUS_META.queued
                    return (
                      <div key={item.id} className="item-row">
                        <span style={{ fontSize:12, fontWeight:500, color:NAVY, fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.domain}</span>
                        <span style={{ fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:20, background:meta.bg, border:`1px solid ${meta.border}`, color:meta.color, fontFamily:MONO, whiteSpace:'nowrap', display:'inline-block' }}>
                          {item.status === 'submitting' || item.status === 'validating' ? (
                            <><RefreshCw size={9} style={{ display:'inline', verticalAlign:'middle', animation:'spin .8s linear infinite', marginRight:3 }}/>{meta.label}</>
                          ) : meta.label}
                        </span>
                        <span style={{ fontSize:10, color:'#8a9ab5', fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.error || (item.cert_id ? `cert: ${item.cert_id.slice(0,12)}…` : item.ggs_order_id ? `GGS: ${item.ggs_order_id}` : '—')}
                        </span>
                      </div>
                    )
                  })}
                  {items.length === 0 && (
                    <div style={{ padding:'24px', textAlign:'center', fontSize:12, color:'#8a9ab5' }}>
                      <RefreshCw size={18} style={{ animation:'spin .8s linear infinite', marginBottom:8, display:'block', margin:'0 auto 8px' }} color="#c0c8d8"/>
                      Initialising…
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ STEP 3 */}
        {step === 3 && job && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            {/* Summary card */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)', marginBottom:12 }}>
              <div style={{ background: job.status === 'completed' ? '#1a7e3b' : job.status === 'partial' ? AMBER : RED, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {job.status === 'completed' ? <CheckCircle size={20} color="#fff"/> : <AlertTriangle size={20} color="#fff"/>}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#fff' }}>
                    {job.status === 'completed' ? 'All certificates issued successfully' :
                     job.status === 'partial' ? `Partial — ${job.completed} issued, ${job.failed_count} failed` :
                     'Job failed'}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2, fontFamily:MONO }}>
                    Job {jobId?.slice(0,8)} · {job.total_domains} domains
                  </div>
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:'1px solid #e8edf5' }}>
                {[
                  { val:job.completed,    label:'Issued',  color:GREEN },
                  { val:job.failed_count, label:'Failed',  color:job.failed_count>0?RED:'#c0c8d8' },
                  { val:job.total_domains,label:'Total',   color:NAVY },
                ].map((s,i) => (
                  <div key={s.label} style={{ padding:'14px 18px', borderLeft:i>0?'1px solid #e8edf5':'none', textAlign:'center' }}>
                    <div style={{ fontSize:28, fontWeight:700, color:s.color, fontFamily:MONO, lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:9, color:'#8a9ab5', marginTop:4, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:MONO }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div style={{ padding:'14px 18px', display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="bi-btn pri" onClick={() => nav('/dashboard')} style={{ gap:6 }}>
                  <Shield size={12}/> View in Dashboard
                </button>
                <button className="bi-btn" onClick={downloadResults} style={{ gap:6 }}>
                  <Download size={12}/> Download CSV
                </button>
                {job.failed_count > 0 && (
                  <button className="bi-btn" onClick={handleRetry} disabled={retrying} style={{ gap:6, color:RED, borderColor:'#f5b8b8' }}>
                    <RotateCcw size={12}/> {retrying ? 'Retrying…' : `Retry ${job.failed_count} failed`}
                  </button>
                )}
                <button className="bi-btn" onClick={() => { setStep(1); setDomainText(''); setJobId(null); setJob(null); setItems([]) }} style={{ marginLeft:'auto' }}>
                  + New bulk job
                </button>
              </div>
            </div>

            {/* Results table */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #dde4ef', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,55,104,0.06)' }}>
              <div style={{ background:NAVY, padding:'9px 16px' }}>
                <span style={{ fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:MONO }}>Results · all {items.length} domains</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr', padding:'7px 16px', background:'#fafbfc', borderBottom:'1px solid #e8edf5' }}>
                {['Domain','Status','Detail'].map(h => (
                  <div key={h} style={{ fontSize:8, fontWeight:600, color:'#8a9ab5', textTransform:'uppercase', letterSpacing:'.07em', fontFamily:MONO }}>{h}</div>
                ))}
              </div>
              {items.map(item => {
                const meta = STATUS_META[item.status] || STATUS_META.queued
                return (
                  <div key={item.id} className="item-row">
                    <span style={{ fontSize:12, fontWeight:500, color:NAVY, fontFamily:MONO }}>{item.domain}</span>
                    <span style={{ fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:20, background:meta.bg, border:`1px solid ${meta.border}`, color:meta.color, fontFamily:MONO, display:'inline-block' }}>{meta.label}</span>
                    <span style={{ fontSize:10, color:'#8a9ab5', fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.error || (item.cert_id ? `ID: ${item.cert_id.slice(0,16)}…` : '—')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
