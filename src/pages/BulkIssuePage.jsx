// BulkIssuePage.jsx — Multi-domain SSL bulk issuance
// DigiCert blue/white design. 4 steps: input → classify → progress → results
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Upload, Plus, X, RefreshCw, CheckCircle, AlertTriangle,
  Download, RotateCcw, ArrowRight, Shield, Copy, Check, Zap, Globe
} from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const MONO   = "'JetBrains Mono','Fira Mono','Menlo',monospace"
const F      = "'Inter',system-ui,sans-serif"
const NAVY   = '#003768'
const BLUE   = '#0061a7'
const GREEN  = '#1a7e3b'
const AMBER  = '#b87d00'
const RED    = '#c0392b'

const CERT_TYPES = [
  { value:'DV',       label:'DV Standard',   desc:'Domain Validated · issued in minutes' },
  { value:'WILDCARD', label:'Wildcard DV',    desc:'*.domain.com · covers all subdomains' },
]

const STATUS_META = {
  queued:      { color:'#8a9ab5', bg:'#f5f8fc', border:'#dde4ef', label:'Queued' },
  submitting:  { color:BLUE,      bg:'#e8f1fb', border:'#b8d0f0', label:'Submitting…' },
  validating:  { color:AMBER,     bg:'#fef9ec', border:'#f5d78e', label:'DNS Validating…' },
  dns_pending: { color:AMBER,     bg:'#fef9ec', border:'#f5d78e', label:'Awaiting TXT record' },
  issued:      { color:GREEN,     bg:'#e8f7ee', border:'#b8e2c8', label:'Issued ✓' },
  installed:   { color:GREEN,     bg:'#e8f7ee', border:'#b8e2c8', label:'Installed ✓' },
  failed:      { color:RED,       bg:'#fde8e8', border:'#f5b8b8', label:'Failed' },
}

function parseDomainsFromText(text) {
  return [...new Set(
    text.split(/[\n,;\s]+/)
      .map(d => d.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,''))
      .filter(d => d.length > 0 && d.includes('.'))
  )]
}
function validDomain(d) { return /^[a-z0-9*][a-z0-9\-.*]*\.[a-z]{2,}$/i.test(d) }

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(()=>setDone(false),1800) }}
      style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:5,
        border:`1px solid ${done?'#b8e2c8':'#dde4ef'}`, background:done?'#e8f7ee':'#fff',
        color:done?GREEN:'#8a9ab5', fontSize:10, cursor:'pointer', fontFamily:MONO, flexShrink:0 }}>
      {done ? <Check size={9}/> : <Copy size={9}/>} {done?'Copied':'Copy'}
    </button>
  )
}

export default function BulkIssuePage({ nav }) {
  const { user, loading: authLoading } = useAuth()

  // Step 1: input
  const [domainText, setDomainText] = useState('')
  const [certType, setCertType]     = useState('DV')

  // Step 2: classify
  const [classifying, setClassifying]     = useState(false)
  const [classified, setClassified]       = useState(null) // array of {domain, dcv_method, provider}
  const [removedDomains, setRemovedDomains] = useState(new Set())
  const [contact, setContact]             = useState({ firstName:'', lastName:'', email:'', phone:'' })
  const [contactFound, setContactFound]   = useState(false)
  const [needContact, setNeedContact]     = useState(false)

  // Step 3: progress
  const [step, setStep]       = useState(1)
  const [starting, setStarting] = useState(false)
  const [jobId, setJobId]     = useState(null)
  const [job, setJob]         = useState(null)
  const [items, setItems]     = useState([])
  const [checkingItem, setCheckingItem] = useState(null)
  const pollRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) setContact(c => ({ ...c, email: c.email || user.email || '' }))
  }, [user])

  const pollStatus = useCallback(async () => {
    if (!jobId) return
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const res = await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({ action:'status', job_id:jobId }),
      })
      const d = await res.json()
      if (d.ok) {
        setJob(d.job)
        setItems(d.items || [])
        if (['completed','partial','failed'].includes(d.job.status)) {
          clearInterval(pollRef.current)
          setStep(4)
        }
      }
    } catch (e) { console.warn('[poll]', e.message) }
  }, [jobId])

  useEffect(() => {
    if (step === 3 && jobId) {
      pollStatus()
      pollRef.current = setInterval(pollStatus, 3000)
      return () => clearInterval(pollRef.current)
    }
  }, [step, jobId, pollStatus])

  const handleCsvUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const incoming = parseDomainsFromText(ev.target.result)
      const existing = parseDomainsFromText(domainText)
      setDomainText([...new Set([...existing, ...incoming])].join('\n'))
    }
    reader.readAsText(file); e.target.value = ''
  }

  const handleClassify = async () => {
    const domains = parseDomainsFromText(domainText).filter(validDomain)
    if (!domains.length) return alert('Enter at least one valid domain')
    if (domains.length > 100) return alert('Maximum 100 domains per job')
    setClassifying(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const res = await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({ action:'classify', domains }),
      })
      const d = await res.json()
      if (!d.ok) { alert(d.error || 'Classify failed'); return }
      setClassified(d.domains)
      setRemovedDomains(new Set())
      if (d.contact_found && d.contact) {
        setContact({ firstName:d.contact.firstName||'', lastName:d.contact.lastName||'',
          email:d.contact.email||user.email||'', phone:d.contact.phone||'' })
        setContactFound(true)
        setNeedContact(false)
      } else {
        setNeedContact(true)
        setContactFound(false)
      }
      setStep(2)
    } catch (e) { alert(e.message) }
    setClassifying(false)
  }

  const handleStart = async () => {
    const activeDomains = classified.filter(c => !removedDomains.has(c.domain))
    if (!activeDomains.length) return alert('No domains selected')
    const { firstName, lastName, email, phone } = contact
    if (!firstName.trim()||!lastName.trim()||!email.trim()||!phone.trim())
      return alert('Contact details required: first name, last name, email, phone')
    setStarting(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const res = await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'start',
          domains: activeDomains.map(c => c.domain),
          cert_type: certType,
          contact: { firstName:firstName.trim(), lastName:lastName.trim(),
                     email:email.trim(), phone:phone.trim() },
        }),
      })
      const d = await res.json()
      if (d.ok) { setJobId(d.job_id); setStep(3) }
      else alert(d.error || 'Failed to start job')
    } catch (e) { alert(e.message) }
    setStarting(false)
  }

  const handleCheckManual = async (item) => {
    setCheckingItem(item.id)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      await fetch(`${SB_URL}/functions/v1/bulk-issue`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({ action:'check_manual', job_id:jobId, item_id:item.id }),
      })
      await pollStatus()
    } catch (e) { console.warn(e) }
    setCheckingItem(null)
  }

  const downloadResults = () => {
    const rows = ['domain,dcv_method,status,error']
    items.forEach(i => rows.push(`${i.domain},${i.dcv_method||''},${i.status},${i.error||''}`))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}))
    a.download = `bulk-ssl-${jobId?.slice(0,8)}.csv`; a.click()
  }

  const reset = () => {
    setStep(1); setDomainText(''); setClassified(null); setJobId(null)
    setJob(null); setItems([]); setRemovedDomains(new Set())
    clearInterval(pollRef.current)
  }

  const parsedDomains = parseDomainsFromText(domainText)
  const validCount = parsedDomains.filter(validDomain).length
  const activeDomains = classified ? classified.filter(c => !removedDomains.has(c.domain)) : []
  const autoGroup   = activeDomains.filter(c => c.dcv_method === 'auto')
  const manualGroup = activeDomains.filter(c => c.dcv_method === 'manual')

  const progressPct = job
    ? Math.round(((job.completed + job.failed_count) / job.total_domains) * 100)
    : 0

  const manualPending = items.filter(i => i.dcv_method === 'manual' && i.status === 'dns_pending')

  if (authLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',background:'#f0f4f9'}}>
      <RefreshCw size={22} style={{animation:'spin .8s linear infinite'}} color={NAVY}/>
    </div>
  )
  if (!user) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',background:'#f0f4f9'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:15,fontWeight:600,color:NAVY,marginBottom:12}}>Sign in to use Bulk Issuance</div>
        <button onClick={()=>nav('/auth')} style={{background:NAVY,color:'#fff',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Sign in</button>
      </div>
    </div>
  )

  return (
    <div style={{background:'#f0f4f9',minHeight:'100vh',fontFamily:F}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .bi-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:1px solid #dde4ef;background:#fff;font-size:12px;font-weight:500;color:#5a7090;cursor:pointer;font-family:inherit;transition:all .15s}
        .bi-btn:hover{border-color:${NAVY};color:${NAVY}}
        .bi-btn.pri{background:${NAVY};border-color:${NAVY};color:#fff}
        .bi-btn.pri:hover{background:#004d96}
        .bi-btn:disabled{opacity:.5;cursor:not-allowed}
        .domain-input{width:100%;min-height:150px;padding:12px;border-radius:8px;border:1px solid #dde4ef;background:#fff;font-size:12px;font-family:${MONO};color:${NAVY};outline:none;resize:vertical;line-height:1.7;transition:border-color .15s;box-sizing:border-box}
        .domain-input:focus{border-color:${NAVY}}
        .field-input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:7px;border:1px solid #dde4ef;background:#fff;font-size:12px;color:${NAVY};font-family:inherit;outline:none;transition:border-color .15s}
        .field-input:focus{border-color:${NAVY}}
        .item-row{display:grid;align-items:center;padding:9px 16px;border-bottom:1px solid #f0f4f9;gap:8px;transition:background .1s}
        .item-row:hover{background:#f8fafc}
        .item-row:last-child{border-bottom:none}
        .dc-panel{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde4ef;box-shadow:0 1px 4px rgba(0,55,104,0.06)}
        .dc-ph{background:${NAVY};padding:9px 16px;display:flex;align-items:center;justify-content:space-between}
        .dc-ph-title{font-size:9px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.08em;font-family:${MONO}}
      `}</style>

      {/* Top nav */}
      <div style={{background:NAVY,padding:'12px 24px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>nav('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.6)',fontSize:12,fontFamily:F,padding:0,display:'flex',alignItems:'center',gap:4}}
          onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.9)'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
          ← Dashboard
        </button>
        <div style={{width:1,height:16,background:'rgba(255,255,255,0.15)'}}/>
        <div style={{width:28,height:28,borderRadius:7,background:BLUE,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Upload size={13} color="#fff"/>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>Bulk SSL Issuance</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:MONO}}>Auto-detects DNS credentials per domain</div>
        </div>
        {/* Steps */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
          {['Domains','Classify','Progress','Done'].map((label,i) => {
            const s = i+1
            const active = step===s, done = step>s
            return (
              <div key={s} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:9,fontWeight:700,fontFamily:MONO,flexShrink:0,
                    background:active?'#fff':done?'#4fc37a':'rgba(255,255,255,0.15)',
                    color:active?NAVY:done?'#fff':'rgba(255,255,255,0.5)'}}>
                    {done?'✓':s}
                  </div>
                  <span style={{fontSize:9,color:active?'#fff':done?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.35)',fontFamily:MONO}}>{label}</span>
                </div>
                {s<4 && <div style={{width:12,height:1,background:'rgba(255,255,255,0.15)'}}/>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{maxWidth:860,margin:'0 auto',padding:'20px 24px 80px'}}>

        {/* ══ STEP 1: Domain input ══════════════════════════════════════════ */}
        {step===1 && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div className="dc-panel" style={{marginBottom:12}}>
              <div className="dc-ph">
                <span className="dc-ph-title">Step 1 — Enter domains</span>
                <div style={{display:'flex',gap:6}}>
                  <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleCsvUpload} style={{display:'none'}}/>
                  <button className="bi-btn" style={{fontSize:10,padding:'4px 10px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.8)'}}
                    onClick={()=>fileInputRef.current?.click()}>
                    <Upload size={10}/> Upload CSV
                  </button>
                </div>
              </div>
              <div style={{padding:'14px 16px'}}>
                <div style={{fontSize:11,color:'#8a9ab5',marginBottom:8}}>One per line, or comma/space separated. Wildcards supported (*.domain.com).</div>
                <textarea className="domain-input"
                  placeholder={'easysecurity.in\nfreecerts.site\napi.shop.com\n*.mycompany.io'}
                  value={domainText} onChange={e=>setDomainText(e.target.value)}/>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
                  {validCount>0 && <span style={{fontSize:11,color:GREEN,fontFamily:MONO}}>✓ {validCount} valid domain{validCount!==1?'s':''}</span>}
                  <span style={{fontSize:11,color:'#c0c8d8',marginLeft:'auto',fontFamily:MONO}}>max 100</span>
                </div>
              </div>
            </div>

            {/* Cert type */}
            <div className="dc-panel" style={{marginBottom:12}}>
              <div className="dc-ph"><span className="dc-ph-title">Certificate type</span></div>
              <div style={{padding:'12px 14px',display:'flex',gap:8}}>
                {CERT_TYPES.map(ct => (
                  <label key={ct.value} onClick={()=>setCertType(ct.value)}
                    style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer',padding:'8px 12px',
                      borderRadius:8,flex:1,border:`1px solid ${certType===ct.value?NAVY:'#dde4ef'}`,
                      background:certType===ct.value?'#f0f5fb':'#fff'}}>
                    <div style={{width:15,height:15,borderRadius:'50%',flexShrink:0,marginTop:1,
                      border:`2px solid ${certType===ct.value?NAVY:'#dde4ef'}`,
                      background:certType===ct.value?NAVY:'transparent',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {certType===ct.value && <div style={{width:5,height:5,borderRadius:'50%',background:'#fff'}}/>}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:NAVY}}>{ct.label}</div>
                      <div style={{fontSize:10,color:'#8a9ab5'}}>{ct.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="bi-btn pri" onClick={handleClassify} disabled={classifying||validCount===0}
                style={{padding:'10px 24px',fontSize:13}}>
                {classifying
                  ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Detecting DNS…</>
                  : <>Detect credentials · {validCount} domains <ArrowRight size={13}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Classification review ════════════════════════════════ */}
        {step===2 && classified && (
          <div style={{animation:'fadeUp .3s ease'}}>

            {/* Auto group */}
            <div className="dc-panel" style={{marginBottom:12}}>
              <div className="dc-ph" style={{background:'#1a7e3b'}}>
                <span className="dc-ph-title" style={{color:'rgba(255,255,255,0.7)'}}>
                  <Zap size={10} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>
                  Automated — {classified.filter(c=>c.dcv_method==='auto'&&!removedDomains.has(c.domain)).length} domains
                </span>
                <span style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontFamily:MONO}}>DNS credentials matched · zero touch</span>
              </div>
              {classified.filter(c=>c.dcv_method==='auto').length === 0 ? (
                <div style={{padding:'16px',fontSize:11,color:'#8a9ab5',textAlign:'center'}}>
                  No domains matched saved DNS credentials.{' '}
                  <button onClick={()=>nav('/dns-providers')} style={{background:'none',border:'none',color:BLUE,cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:600,padding:0}}>Add credentials →</button>
                </div>
              ) : (
                classified.filter(c=>c.dcv_method==='auto').map(c => {
                  const removed = removedDomains.has(c.domain)
                  return (
                    <div key={c.domain} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',
                      borderBottom:'1px solid #f0f4f9',opacity:removed?.4:1,transition:'opacity .15s'}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:removed?'#c0c8d8':'#1a7e3b',flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:500,color:removed?'#8a9ab5':NAVY,fontFamily:MONO,flex:1,
                        textDecoration:removed?'line-through':'none'}}>{c.domain}</span>
                      <span style={{fontSize:10,color:'#8a9ab5',fontFamily:MONO}}>{c.provider}</span>
                      <button onClick={()=>setRemovedDomains(p=>{const n=new Set(p);removed?n.delete(c.domain):n.add(c.domain);return n})}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#c0c8d8',padding:'2px',display:'flex',alignItems:'center'}}
                        title={removed?'Re-add':'Remove'}>
                        {removed ? <Plus size={12} color={GREEN}/> : <X size={12}/>}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Manual group */}
            {classified.filter(c=>c.dcv_method==='manual').length > 0 && (
              <div className="dc-panel" style={{marginBottom:12}}>
                <div className="dc-ph" style={{background:AMBER}}>
                  <span className="dc-ph-title" style={{color:'rgba(255,255,255,0.8)'}}>
                    Manual — {classified.filter(c=>c.dcv_method==='manual'&&!removedDomains.has(c.domain)).length} domains
                  </span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,0.6)',fontFamily:MONO}}>No DNS credentials · you'll add TXT records</span>
                </div>
                {classified.filter(c=>c.dcv_method==='manual').map(c => {
                  const removed = removedDomains.has(c.domain)
                  return (
                    <div key={c.domain} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',
                      borderBottom:'1px solid #f0f4f9',opacity:removed?.4:1}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:removed?'#c0c8d8':AMBER,flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:500,color:removed?'#8a9ab5':NAVY,fontFamily:MONO,flex:1,
                        textDecoration:removed?'line-through':'none'}}>{c.domain}</span>
                      <span style={{fontSize:10,color:'#c0c8d8',fontFamily:MONO}}>No credentials saved</span>
                      <button onClick={()=>setRemovedDomains(p=>{const n=new Set(p);removed?n.delete(c.domain):n.add(c.domain);return n})}
                        style={{background:'none',border:'none',cursor:'pointer',color:'#c0c8d8',padding:'2px',display:'flex',alignItems:'center'}}>
                        {removed ? <Plus size={12} color={GREEN}/> : <X size={12}/>}
                      </button>
                    </div>
                  )
                })}
                <div style={{padding:'10px 16px',background:'#fef9ec',borderTop:'1px solid #f5d78e'}}>
                  <div style={{fontSize:11,color:AMBER}}>
                    After starting, SSLVault will show you the TXT record to add for each domain.
                    Add them in your DNS registrar, then click <strong>Check</strong> to verify.
                  </div>
                </div>
              </div>
            )}

            {/* Contact details */}
            <div className="dc-panel" style={{marginBottom:12}}>
              <div className="dc-ph">
                <span className="dc-ph-title">Contact details for certificate orders</span>
                {contactFound && <span style={{fontSize:9,color:'#4fc37a',fontFamily:MONO}}>✓ Auto-filled from previous orders</span>}
              </div>
              <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {key:'firstName',label:'First name',placeholder:'John'},
                  {key:'lastName', label:'Last name', placeholder:'Smith'},
                  {key:'email',    label:'Email',     placeholder:'john@company.com'},
                  {key:'phone',    label:'Phone',     placeholder:'+1-555-000-0000'},
                ].map(f => (
                  <div key={f.key}>
                    <label style={{display:'block',fontSize:10,fontWeight:600,color:'#8a9ab5',textTransform:'uppercase',
                      letterSpacing:'.06em',marginBottom:5,fontFamily:MONO}}>{f.label}</label>
                    <input className="field-input" type="text" placeholder={f.placeholder}
                      value={contact[f.key]} onChange={e=>setContact(c=>({...c,[f.key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="bi-btn" onClick={()=>setStep(1)}>← Back</button>
              <button className="bi-btn pri" onClick={handleStart}
                disabled={starting||activeDomains.length===0}
                style={{padding:'10px 24px',fontSize:13}}>
                {starting
                  ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Starting job…</>
                  : <>Start {activeDomains.length} certif{activeDomains.length!==1?'icates':'icate'} <ArrowRight size={13}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Live progress ═════════════════════════════════════════ */}
        {step===3 && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div className="dc-panel" style={{marginBottom:12}}>
              <div className="dc-ph">
                <span className="dc-ph-title">Step 3 — Processing · Job {jobId?.slice(0,8)}</span>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'#4fc37a',fontFamily:MONO}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#4fc37a',animation:'spin 2s linear infinite'}}/>Live
                </div>
              </div>
              <div style={{padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600,color:NAVY}}>
                    {job?`${job.completed+job.failed_count} / ${job.total_domains} processed`:'Queued for processing…'}
                  </span>
                  <span style={{fontSize:12,fontWeight:600,color:NAVY,fontFamily:MONO}}>{progressPct}%</span>
                </div>
                <div style={{height:6,background:'#e8edf5',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${progressPct}%`,background:job?.failed_count>0?AMBER:BLUE,borderRadius:3,transition:'width .5s ease'}}/>
                </div>
                {job && (
                  <div style={{display:'flex',gap:14,marginTop:8}}>
                    <span style={{fontSize:11,color:GREEN,fontFamily:MONO}}>✓ {job.completed} issued</span>
                    {job.failed_count>0 && <span style={{fontSize:11,color:RED,fontFamily:MONO}}>✗ {job.failed_count} failed</span>}
                    <span style={{fontSize:11,color:'#8a9ab5',fontFamily:MONO}}>
                      {job.total_domains-job.completed-job.failed_count} remaining
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto domains progress */}
            {items.filter(i=>i.dcv_method==='auto').length > 0 && (
              <div className="dc-panel" style={{marginBottom:12}}>
                <div className="dc-ph" style={{background:'#1a5c2a'}}>
                  <span className="dc-ph-title" style={{color:'rgba(255,255,255,0.65)'}}>
                    <Zap size={9} style={{display:'inline',verticalAlign:'middle',marginRight:4}}/>
                    Automated · {items.filter(i=>i.dcv_method==='auto').length} domains
                  </span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 130px',padding:'6px 16px',background:'#fafbfc',borderBottom:'1px solid #e8edf5'}}>
                  {['Domain','Status'].map(h=><div key={h} style={{fontSize:8,fontWeight:600,color:'#8a9ab5',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:MONO}}>{h}</div>)}
                </div>
                {items.filter(i=>i.dcv_method==='auto').map(item => {
                  const meta = STATUS_META[item.status]||STATUS_META.queued
                  return (
                    <div key={item.id} className="item-row" style={{gridTemplateColumns:'1fr 130px'}}>
                      <span style={{fontSize:12,fontWeight:500,color:NAVY,fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.domain}</span>
                      <span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:20,background:meta.bg,border:`1px solid ${meta.border}`,color:meta.color,fontFamily:MONO,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
                        {['submitting','validating'].includes(item.status)&&<RefreshCw size={8} style={{animation:'spin .8s linear infinite'}}/>}
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Manual domains — show TXT records */}
            {manualPending.length > 0 && (
              <div className="dc-panel" style={{marginBottom:12}}>
                <div className="dc-ph" style={{background:'#8a5c00'}}>
                  <span className="dc-ph-title" style={{color:'rgba(255,255,255,0.75)'}}>
                    Manual DNS required · {manualPending.length} domain{manualPending.length!==1?'s':''}
                  </span>
                </div>
                <div style={{padding:'10px 16px 4px',background:'#fef9ec',borderBottom:'1px solid #f5d78e'}}>
                  <div style={{fontSize:11,color:AMBER}}>
                    Add these TXT records in your DNS registrar, then click <strong>Check</strong> for each domain.
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'140px 1fr 1fr 80px',padding:'6px 16px',background:'#fafbfc',borderBottom:'1px solid #e8edf5'}}>
                  {['Domain','TXT name','TXT value',''].map(h=><div key={h} style={{fontSize:8,fontWeight:600,color:'#8a9ab5',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:MONO}}>{h}</div>)}
                </div>
                {manualPending.map(item => (
                  <div key={item.id} className="item-row" style={{gridTemplateColumns:'140px 1fr 1fr 80px'}}>
                    <span style={{fontSize:11,fontWeight:600,color:NAVY,fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.domain}</span>
                    <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                      <span style={{fontSize:10,color:'#4a5568',fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{item.dcv_txt_name||'Waiting…'}</span>
                      {item.dcv_txt_name && <CopyBtn text={item.dcv_txt_name}/>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                      <span style={{fontSize:10,color:'#4a5568',fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{item.dcv_txt_value||'Waiting…'}</span>
                      {item.dcv_txt_value && <CopyBtn text={item.dcv_txt_value}/>}
                    </div>
                    <button className="bi-btn" onClick={()=>handleCheckManual(item)}
                      disabled={checkingItem===item.id||!item.ssl_order_id}
                      style={{fontSize:10,padding:'5px 10px',gap:4}}>
                      {checkingItem===item.id
                        ? <><RefreshCw size={9} style={{animation:'spin .7s linear infinite'}}/>Checking…</>
                        : <>Check</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 4: Results ═══════════════════════════════════════════════ */}
        {step===4 && job && (
          <div style={{animation:'fadeUp .3s ease'}}>
            <div className="dc-panel" style={{marginBottom:12}}>
              <div style={{background:job.status==='completed'?GREEN:job.status==='partial'?AMBER:RED,
                padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {job.status==='completed'?<CheckCircle size={20} color="#fff"/>:<AlertTriangle size={20} color="#fff"/>}
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:'#fff'}}>
                    {job.status==='completed' && job.completed === job.total_domains && job.completed > 0
                      ? 'All certificates issued'
                      : job.status==='completed' && job.completed === 0
                      ? 'Orders placed — DNS validation in progress'
                      : job.status==='partial'
                      ? `Partial — ${job.completed} issued, ${job.failed_count} failed`
                      : 'Job failed'}
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.65)',marginTop:2,fontFamily:MONO}}>Job {jobId?.slice(0,8)}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderBottom:'1px solid #e8edf5'}}>
                {[{val:job.completed,label:'Issued',color:GREEN},{val:job.failed_count,label:'Failed',color:job.failed_count>0?RED:'#c0c8d8'},{val:job.total_domains,label:'Total',color:NAVY}].map((s,i)=>(
                  <div key={s.label} style={{padding:'14px 18px',borderLeft:i>0?'1px solid #e8edf5':'none',textAlign:'center'}}>
                    <div style={{fontSize:28,fontWeight:700,color:s.color,fontFamily:MONO,lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:9,color:'#8a9ab5',marginTop:4,textTransform:'uppercase',letterSpacing:'.07em',fontFamily:MONO}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'12px 16px',display:'flex',gap:8,flexWrap:'wrap'}}>
                <button className="bi-btn pri" onClick={()=>nav('/dashboard')} style={{gap:6}}><Shield size={12}/> View in Dashboard</button>
                <button className="bi-btn" onClick={downloadResults} style={{gap:6}}><Download size={12}/> Download CSV</button>
                <button className="bi-btn" onClick={reset} style={{marginLeft:'auto'}}>+ New bulk job</button>
              </div>
            </div>
            {/* Full results table */}
            <div className="dc-panel">
              <div className="dc-ph"><span className="dc-ph-title">All {items.length} domains</span></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 80px 120px 1fr',padding:'6px 16px',background:'#fafbfc',borderBottom:'1px solid #e8edf5'}}>
                {['Domain','Method','Status','Detail'].map(h=><div key={h} style={{fontSize:8,fontWeight:600,color:'#8a9ab5',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:MONO}}>{h}</div>)}
              </div>
              {items.map(item=>{
                const meta=STATUS_META[item.status]||STATUS_META.queued
                return(
                  <div key={item.id} className="item-row" style={{gridTemplateColumns:'1fr 80px 120px 1fr'}}>
                    <span style={{fontSize:12,fontWeight:500,color:NAVY,fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.domain}</span>
                    <span style={{fontSize:9,padding:'2px 6px',borderRadius:20,background:item.dcv_method==='auto'?'#e8f7ee':'#fef9ec',
                      color:item.dcv_method==='auto'?GREEN:AMBER,border:`1px solid ${item.dcv_method==='auto'?'#b8e2c8':'#f5d78e'}`,
                      fontFamily:MONO,display:'inline-block'}}>{item.dcv_method==='auto'?'Auto':'Manual'}</span>
                    <span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:20,background:meta.bg,border:`1px solid ${meta.border}`,color:meta.color,fontFamily:MONO,display:'inline-block'}}>{meta.label}</span>
                    <span style={{fontSize:10,color:'#8a9ab5',fontFamily:MONO,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.error||'—'}</span>
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
