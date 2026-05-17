import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Plus, RefreshCw, Trash2, Check, AlertTriangle,
  Globe, Shield, Zap, ChevronRight, X, Eye, EyeOff,
  ExternalLink, Activity, Lock
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const KNOWN_CAS = {
  letsencrypt: { name:"Let's Encrypt", tag:'ACME v2', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', free:true, eab:false, desc:"Free, automated, 90-day DV certs. The most widely used CA in the world." },
  zerossl:     { name:'ZeroSSL',       tag:'ACME + EAB', color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', free:true, eab:true,  desc:"Free 90-day certs via ACME. Requires EAB credentials from ZeroSSL dashboard." },
  buypass:     { name:'Buypass',       tag:'ACME v2', color:'#0369a1', bg:'#f0f9ff', border:'#bae6fd', free:true, eab:false, desc:"Free 180-day DV certs via ACME. Norwegian CA, GDPR-friendly." },
  letsencrypt_staging: { name:"Let's Encrypt (Staging)", tag:'ACME v2 · Test', color:'#64748b', bg:'#f8fafc', border:'#cbd5e1', free:true, eab:false, desc:"Test environment. Certs not trusted by browsers — use for integration testing." },
}

function GradeBadge({ grade }) {
  if (!grade) return null
  const map = { A:'#16a34a', B:'#65a30d', C:'#d97706', D:'#ea580c', F:'#dc2626' }
  return (
    <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700,
      color:map[grade]||'#64748b', background: (map[grade]||'#64748b')+'15',
      padding:'2px 7px', borderRadius:4, border:`0.5px solid ${map[grade]||'#64748b'}40` }}>
      {grade}
    </span>
  )
}

function StatusDot({ status }) {
  const map = { active:'#16a34a', error:'#dc2626', disabled:'#94a3b8' }
  return (
    <span style={{ width:7, height:7, borderRadius:'50%', background:map[status]||'#94a3b8',
      display:'inline-block', flexShrink:0,
      boxShadow: status==='active' ? `0 0 0 3px ${map.active}25` : 'none',
      animation: status==='active' ? 'v3pulse 2s ease infinite' : 'none' }}/>
  )
}

export default function CAConnectors({ nav }) {
  const { user } = useAuth()
  const [connectors, setConnectors] = useState([])
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addStep, setAddStep] = useState('pick') // pick | configure | registering | done
  const [selectedCa, setSelectedCa] = useState(null)
  const [eabKid, setEabKid] = useState('')
  const [eabHmac, setEabHmac] = useState('')
  const [showHmac, setShowHmac] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [addError, setAddError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [issueConn, setIssueConn] = useState(null)
  const [issueDomain, setIssueDomain] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueResult, setIssueResult] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const tok = session.access_token
    const r = await fetch(`${SB_URL}/functions/v1/acme-client`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${tok}`},
      body: JSON.stringify({ action:'list_cas' })
    })
    const d = await r.json()
    if (d.ok) setConnectors(d.connectors || [])
    // Load certs with CA info
    const { data: certsData } = await supabase.from('certificates')
      .select('id,domain,status,expires_at,issuer,source,tls_grade,ca_connector_id')
      .eq('user_id', session.user.id).eq('status','active')
      .order('expires_at',{ascending:true})
    setCerts(certsData || [])
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  const registerConnector = async () => {
    const caInfo = KNOWN_CAS[selectedCa]
    if (!caInfo) return
    if (caInfo.eab && (!eabKid || !eabHmac)) { setAddError('EAB Key ID and HMAC Secret are required for '+caInfo.name); return }
    setRegistering(true); setAddError('')
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`${SB_URL}/functions/v1/acme-client`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
      body: JSON.stringify({ action:'save_connector', ca_key:selectedCa, eab_kid:eabKid||undefined, eab_hmac:eabHmac||undefined })
    })
    const d = await r.json()
    if (d.ok) {
      setAddStep('done')
      await load()
    } else {
      setAddError(d.error || 'Registration failed')
    }
    setRegistering(false)
  }

  const deleteConnector = async (id) => {
    setDeleting(id)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${SB_URL}/functions/v1/acme-client`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
      body: JSON.stringify({ action:'delete_connector', connector_id:id })
    })
    await load()
    setDeleting(null)
  }

  const issueCert = async () => {
    if (!issueDomain || !issueConn) return
    setIssuing(true); setIssueResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`${SB_URL}/functions/v1/acme-client`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
      body: JSON.stringify({ action:'issue', connector_id:issueConn.id, domain:issueDomain.trim() })
    })
    const d = await r.json()
    setIssueResult(d)
    setIssuing(false)
    if (d.ok) { await load() }
  }

  const daysLeft = (iso) => {
    if (!iso) return null
    return Math.ceil((new Date(iso)-new Date())/86400000)
  }

  // Cert source display
  const sourceLabel = (cert) => {
    if (cert.source==='gogetssl'||cert.source==='tss') return { label:'GoGetSSL', color:'#16a34a', bg:'#f0fdf4' }
    if (cert.source==='letsencrypt') return { label:"Let's Encrypt", color:'#2563eb', bg:'#eff6ff' }
    if (cert.source==='zerossl') return { label:'ZeroSSL', color:'#7c3aed', bg:'#f5f3ff' }
    if (cert.source==='buypass') return { label:'Buypass', color:'#0369a1', bg:'#f0f9ff' }
    if (cert.source==='acme') return { label:'ACME', color:'#64748b', bg:'#f8fafc' }
    return { label: cert.issuer || cert.source || 'Unknown', color:'#64748b', bg:'#f8fafc' }
  }

  const connectorCerts = (connId) => certs.filter(c=>c.ca_connector_id===connId)
  // GoGetSSL certs (no connector id)
  const ggsCerts = certs.filter(c=>!c.ca_connector_id&&(c.source==='gogetssl'||c.source==='tss'))

  if (!user) return <div className="v2-page"><div className="v2-container" style={{paddingTop:60,textAlign:'center'}}><Shield size={32} style={{color:'var(--v2-text-3)',margin:'0 auto 16px'}}/><p style={{color:'var(--v2-text-2)'}}>Sign in to manage CA connectors</p><button className="v2-btn v2-btn-primary" onClick={()=>nav('/auth')}>Sign in</button></div></div>

  return (
    <div className="v2-page">
      <div className="v2-container" style={{maxWidth:980}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,paddingTop:8}}>
          <div>
            <h1 className="v2-h1" style={{fontSize:24,letterSpacing:'-0.4px'}}>CA connectors</h1>
            <p className="v2-subtitle" style={{fontSize:13,marginTop:4}}>
              Issue and manage certificates from any CA — Let's Encrypt, ZeroSSL, Buypass, GoGetSSL — in one place.
            </p>
          </div>
          <button className="v2-btn v2-btn-primary" onClick={()=>{setShowAdd(true);setAddStep('pick');setSelectedCa(null);setAddError('')}}>
            <Plus size={13}/> Add connector
          </button>
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:24}}>
          {[
            {val: connectors.length + (ggsCerts.length>0?1:0), label:'CAs connected', color:'#16a34a'},
            {val: certs.length, label:'Total certs', color:'var(--v2-text)'},
            {val: certs.filter(c=>daysLeft(c.expires_at)<=30&&daysLeft(c.expires_at)>0).length, label:'Expiring 30d', color:'#d97706'},
            {val: certs.filter(c=>c.tls_grade==='A').length, label:'Grade A certs', color:'#2563eb'},
          ].map(({val,label,color})=>(
            <div key={label} className="v2-card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:22,fontWeight:500,color,fontFamily:'monospace'}}>{val}</div>
              <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>

        {/* GoGetSSL built-in connector */}
        <div className="v2-section-label" style={{marginBottom:10}}>Connected CAs</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>

          {/* GoGetSSL — always shown */}
          <div className="v2-card" style={{overflow:'hidden',borderColor:'rgba(22,163,74,0.3)'}}>
            <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--v2-border)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:8,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#16a34a',flexShrink:0}}>GG</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--v2-text)'}}>GoGetSSL</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                  <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:4,background:'#f0fdf4',color:'#16a34a'}}>REST API</span>
                  <StatusDot status="active"/>
                  <span style={{fontSize:11,color:'#16a34a'}}>Connected</span>
                </div>
              </div>
            </div>
            <div style={{padding:'12px 16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
                {[
                  {val:ggsCerts.length,label:'Active certs'},
                  {val:ggsCerts.filter(c=>daysLeft(c.expires_at)<=30).length,label:'Expiring'},
                  {val:'RapidSSL',label:'Products'},
                ].map(({val,label})=>(
                  <div key={label} style={{textAlign:'center',padding:'8px 0',borderRadius:6,background:'var(--v2-surface-3)'}}>
                    <div style={{fontSize:14,fontWeight:500,color:'var(--v2-text)',fontFamily:'monospace'}}>{val}</div>
                    <div style={{fontSize:10,color:'var(--v2-text-3)',marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="v2-btn" style={{flex:1,justifyContent:'center'}} onClick={()=>nav('/dashboard')}>View certs</button>
                <button className="v2-btn v2-btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>nav('/buy')}><Plus size={12}/> Issue new</button>
              </div>
            </div>
          </div>

          {/* ACME connectors */}
          {connectors.map(conn=>(
            <div key={conn.id} className="v2-card" style={{overflow:'hidden',borderColor:'rgba(37,99,235,0.2)'}}>
              <div style={{padding:'14px 16px',borderBottom:'0.5px solid var(--v2-border)',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:38,height:38,borderRadius:8,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:'#2563eb',flexShrink:0}}>
                  {conn.ca_name.slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--v2-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{conn.ca_name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                    <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:4,background:'#eff6ff',color:'#2563eb'}}>ACME v2</span>
                    <StatusDot status={conn.status}/>
                    <span style={{fontSize:11,color:conn.status==='active'?'#16a34a':'#dc2626',textTransform:'capitalize'}}>{conn.status}</span>
                  </div>
                </div>
                <button onClick={()=>deleteConnector(conn.id)} disabled={deleting===conn.id}
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--v2-text-3)',padding:4,flexShrink:0}}
                  onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--v2-text-3)'}>
                  {deleting===conn.id ? <RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> : <Trash2 size={13}/>}
                </button>
              </div>
              <div style={{padding:'12px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
                  {[
                    {val:connectorCerts(conn.id).length,label:'Certs'},
                    {val:connectorCerts(conn.id).filter(c=>daysLeft(c.expires_at)<=30).length,label:'Expiring'},
                    {val:'90d DV',label:'Type'},
                  ].map(({val,label})=>(
                    <div key={label} style={{textAlign:'center',padding:'8px 0',borderRadius:6,background:'var(--v2-surface-3)'}}>
                      <div style={{fontSize:14,fontWeight:500,color:'var(--v2-text)',fontFamily:'monospace'}}>{val}</div>
                      <div style={{fontSize:10,color:'var(--v2-text-3)',marginTop:2}}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="v2-btn" style={{flex:1,justifyContent:'center'}}>View certs</button>
                  <button className="v2-btn v2-btn-primary" style={{flex:1,justifyContent:'center'}}
                    onClick={()=>{setIssueConn(conn);setIssueDomain('');setIssueResult(null)}}>
                    <Plus size={12}/> Issue new
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add card */}
          <div className="v2-card" style={{borderStyle:'dashed',display:'flex',alignItems:'center',justifyContent:'center',minHeight:160,cursor:'pointer'}}
            onClick={()=>{setShowAdd(true);setAddStep('pick');setSelectedCa(null);setAddError('')}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:40,height:40,borderRadius:10,background:'var(--v2-surface-3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                <Plus size={18} style={{color:'var(--v2-text-3)'}}/>
              </div>
              <div style={{fontSize:13,fontWeight:500,color:'var(--v2-text-2)'}}>Add CA connector</div>
              <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:3}}>Let's Encrypt, ZeroSSL, Buypass…</div>
            </div>
          </div>
        </div>

        {/* All certs table */}
        <div className="v2-section-label" style={{marginBottom:10}}>All managed certificates</div>
        <div className="v2-card" style={{overflow:'hidden',padding:0}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 80px',padding:'10px 16px',borderBottom:'0.5px solid var(--v2-border)',background:'var(--v2-surface-3)'}}>
            {['Domain','CA source','Expires','Status','Grade'].map(h=>(
              <div key={h} style={{fontSize:11,fontWeight:500,color:'var(--v2-text-3)',textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</div>
            ))}
          </div>
          {loading ? (
            <div style={{padding:24,textAlign:'center',color:'var(--v2-text-3)',fontSize:13}}>Loading…</div>
          ) : certs.length===0 ? (
            <div style={{padding:24,textAlign:'center',color:'var(--v2-text-3)',fontSize:13}}>No certificates yet. Issue your first one.</div>
          ) : certs.map(cert=>{
            const d = daysLeft(cert.expires_at)
            const src = sourceLabel(cert)
            const statusColor = d>30?'#16a34a':d>0?'#d97706':'#dc2626'
            return (
              <div key={cert.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 80px',padding:'11px 16px',borderBottom:'0.5px solid var(--v2-border)',alignItems:'center',cursor:'pointer',transition:'background .12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--v2-surface-3)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div>
                  <div style={{fontSize:12,fontWeight:500,fontFamily:'monospace',color:'var(--v2-text)'}}>{cert.domain}</div>
                  <div style={{fontSize:10,color:'var(--v2-text-3)',marginTop:2}}>{cert.issuer||'—'}</div>
                </div>
                <div>
                  <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:4,background:src.bg,color:src.color}}>{src.label}</span>
                </div>
                <div style={{fontSize:12,color:'var(--v2-text-2)'}}>{cert.expires_at?new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}):'—'}</div>
                <div>
                  <span style={{fontSize:10,fontWeight:500,padding:'2px 7px',borderRadius:4,background:statusColor+'15',color:statusColor}}>
                    {d>0?`${d}d left`:d===0?'Today':'Expired'}
                  </span>
                </div>
                <div><GradeBadge grade={cert.tls_grade}/></div>
              </div>
            )
          })}
        </div>

        {/* Add connector modal */}
        {showAdd && (
          <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)'}}>
            <div style={{background:'var(--v2-bg)',borderRadius:14,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'0.5px solid var(--v2-border)'}}>
              <div style={{padding:'18px 22px 14px',borderBottom:'0.5px solid var(--v2-border)',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'var(--v2-bg)',zIndex:10,borderRadius:'14px 14px 0 0'}}>
                <div>
                  <div style={{fontSize:15,fontWeight:500,color:'var(--v2-text)'}}>Add CA connector</div>
                  <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:2}}>
                    {addStep==='pick'?'Choose a certificate authority':'Configure your connection'}
                  </div>
                </div>
                <button onClick={()=>{setShowAdd(false);setAddStep('pick')}} style={{background:'none',border:'0.5px solid var(--v2-border)',borderRadius:6,cursor:'pointer',color:'var(--v2-text-3)',padding:'4px 6px'}}>
                  <X size={14}/>
                </button>
              </div>

              <div style={{padding:'18px 22px 22px'}}>
                {addStep==='pick' && (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {Object.entries(KNOWN_CAS).map(([key,ca])=>(
                      <div key={key} onClick={()=>setSelectedCa(key)}
                        style={{padding:'14px 16px',borderRadius:10,border:`1.5px solid ${selectedCa===key?ca.color:'var(--v2-border)'}`,
                          background:selectedCa===key?ca.bg:'var(--v2-bg)',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:36,height:36,borderRadius:8,background:ca.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:ca.color,flexShrink:0,border:`0.5px solid ${ca.border}`}}>
                          {ca.name.slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <span style={{fontSize:13,fontWeight:500,color:'var(--v2-text)'}}>{ca.name}</span>
                            <span style={{fontSize:9,fontWeight:600,padding:'2px 6px',borderRadius:4,background:ca.bg,color:ca.color,border:`0.5px solid ${ca.border}`}}>{ca.tag}</span>
                            {ca.free&&<span style={{fontSize:9,fontWeight:600,padding:'2px 6px',borderRadius:4,background:'#f0fdf4',color:'#16a34a',border:'0.5px solid #bbf7d0'}}>FREE</span>}
                          </div>
                          <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:3,lineHeight:1.5}}>{ca.desc}</div>
                        </div>
                        {selectedCa===key&&<Check size={15} style={{color:ca.color,flexShrink:0}}/>}
                      </div>
                    ))}
                    <button className="v2-btn v2-btn-primary" disabled={!selectedCa} style={{marginTop:8}}
                      onClick={()=>setAddStep('configure')}>
                      Continue <ChevronRight size={13}/>
                    </button>
                  </div>
                )}

                {addStep==='configure' && selectedCa && (()=>{
                  const ca = KNOWN_CAS[selectedCa]
                  return (
                    <div>
                      <div style={{background:'var(--v2-surface-3)',border:'0.5px solid var(--v2-border)',borderRadius:8,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:7,background:ca.bg,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11,color:ca.color,flexShrink:0}}>
                          {ca.name.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:'var(--v2-text)'}}>{ca.name}</div>
                          <div style={{fontSize:11,color:'var(--v2-text-3)'}}>{ca.tag}{ca.free?' · Free':''}</div>
                        </div>
                      </div>
                      {ca.eab ? (
                        <div>
                          <div style={{fontSize:12,color:'var(--v2-text-2)',marginBottom:12,lineHeight:1.6}}>
                            {ca.name} requires External Account Binding (EAB) credentials. Get them from your{' '}
                            <a href="https://app.zerossl.com/developer" target="_blank" rel="noopener noreferrer" style={{color:'#7c3aed'}}>
                              ZeroSSL developer dashboard <ExternalLink size={10}/>
                            </a>.
                          </div>
                          <div style={{marginBottom:12}}>
                            <label style={{fontSize:11,fontWeight:500,color:'var(--v2-text-2)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>EAB Key ID *</label>
                            <input className="v2-input" value={eabKid} onChange={e=>setEabKid(e.target.value)} placeholder="kid_xxxxxxxxxxxxxxxx"/>
                          </div>
                          <div style={{marginBottom:16}}>
                            <label style={{fontSize:11,fontWeight:500,color:'var(--v2-text-2)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>EAB HMAC Secret *</label>
                            <div style={{position:'relative'}}>
                              <input className="v2-input" type={showHmac?'text':'password'} value={eabHmac} onChange={e=>setEabHmac(e.target.value)} placeholder="Base64URL-encoded secret" style={{paddingRight:36}}/>
                              <button onClick={()=>setShowHmac(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--v2-text-3)'}}>
                                {showHmac?<EyeOff size={14}/>:<Eye size={14}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{background:'#f0fdf4',border:'0.5px solid #bbf7d0',borderRadius:8,padding:'12px 14px',marginBottom:16,display:'flex',gap:8,alignItems:'flex-start'}}>
                          <Zap size={14} style={{color:'#16a34a',flexShrink:0,marginTop:1}}/>
                          <div style={{fontSize:12,color:'#15803d',lineHeight:1.6}}>
                            <strong>{ca.name}</strong> doesn't require any credentials. SSLVault will automatically register an ACME account using your email address.
                          </div>
                        </div>
                      )}
                      {addError && (
                        <div style={{background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:8,padding:'10px 12px',marginBottom:12,display:'flex',gap:8,fontSize:12,color:'#dc2626'}}>
                          <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/>{addError}
                        </div>
                      )}
                      <div style={{display:'flex',gap:8}}>
                        <button className="v2-btn" onClick={()=>setAddStep('pick')}>Back</button>
                        <button className="v2-btn v2-btn-primary" style={{flex:1}} onClick={registerConnector} disabled={registering}>
                          {registering?<><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Registering…</>:<><Shield size={13}/> Register account</>}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {addStep==='done' && (
                  <div style={{textAlign:'center',padding:'20px 0'}}>
                    <div style={{width:56,height:56,borderRadius:'50%',background:'#f0fdf4',border:'1.5px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                      <Check size={24} style={{color:'#16a34a'}}/>
                    </div>
                    <div style={{fontSize:16,fontWeight:500,color:'var(--v2-text)',marginBottom:8}}>Connector registered</div>
                    <div style={{fontSize:13,color:'var(--v2-text-2)',marginBottom:20}}>
                      Your ACME account is ready. Issue your first certificate from the connectors page.
                    </div>
                    <button className="v2-btn v2-btn-primary" onClick={()=>setShowAdd(false)}>Done</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Issue cert modal */}
        {issueConn && (
          <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)'}}>
            <div style={{background:'var(--v2-bg)',borderRadius:14,width:'100%',maxWidth:440,boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'0.5px solid var(--v2-border)',padding:'22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <div style={{fontSize:15,fontWeight:500,color:'var(--v2-text)'}}>Issue via {issueConn.ca_name}</div>
                <button onClick={()=>setIssueConn(null)} style={{background:'none',border:'0.5px solid var(--v2-border)',borderRadius:6,cursor:'pointer',color:'var(--v2-text-3)',padding:'4px 6px'}}><X size={14}/></button>
              </div>
              {!issueResult ? (
                <>
                  <div style={{marginBottom:14}}>
                    <label className="v2-section-label" style={{display:'block',marginBottom:6}}>Domain name</label>
                    <input className="v2-input" value={issueDomain} onChange={e=>setIssueDomain(e.target.value)} placeholder="example.com"/>
                    <div style={{fontSize:11,color:'var(--v2-text-3)',marginTop:5}}>DNS-01 validation — must have a DNS provider connected under DNS Providers.</div>
                  </div>
                  <button className="v2-btn v2-btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={issueCert} disabled={issuing||!issueDomain}>
                    {issuing?<><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Issuing…</>:<><Lock size={13}/> Issue certificate</>}
                  </button>
                </>
              ) : (
                <div>
                  {issueResult.ok ? (
                    <div style={{background:'#f0fdf4',border:'0.5px solid #bbf7d0',borderRadius:8,padding:'14px',marginBottom:16}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Check size={16} style={{color:'#16a34a'}}/><span style={{fontSize:13,fontWeight:500,color:'#15803d'}}>Order placed</span></div>
                      <div style={{fontSize:12,color:'#166534',lineHeight:1.6}}>{issueResult.message}</div>
                      {issueResult.txt_name&&<div style={{marginTop:10,background:'#0a0a0a',borderRadius:6,padding:'8px 10px',fontSize:10,fontFamily:'monospace',color:'#a3e635'}}>
                        {issueResult.txt_name}<br/>= {issueResult.txt_value}
                      </div>}
                    </div>
                  ) : (
                    <div style={{background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:8,padding:'14px',marginBottom:16,fontSize:12,color:'#dc2626'}}>
                      {issueResult.error}
                    </div>
                  )}
                  <button className="v2-btn" onClick={()=>setIssueConn(null)} style={{width:'100%',justifyContent:'center'}}>Close</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
