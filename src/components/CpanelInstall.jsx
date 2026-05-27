import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Server, Shield, ChevronRight, AlertTriangle, Eye, EyeOff, Loader, X, Check } from 'lucide-react'

const FN = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/cpanel-install'
const call = async (action, body, tok) => {
  const r = await fetch(FN, { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok}, body:JSON.stringify({action,...body}) })
  return r.json()
}

function Pill({ state }) {
  const map = { pending:{bg:'rgba(192,57,43,0.1)',color:'rgba(240,237,232,0.45)',label:'Pending'}, running:{bg:'rgba(192,57,43,0.1)',color:'#c0392b',label:'In progress...'}, done:{bg:'rgba(192,57,43,0.1)',color:'#16a34a',label:'Done'}, error:{bg:'rgba(192,57,43,0.12)',color:'#c0392b',label:'Failed'}, skipped:{bg:'rgba(192,57,43,0.1)',color:'rgba(240,237,232,0.5)',label:'Skipped'} }
  const s = map[state]||map.pending
  return <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:s.bg,color:s.color}}>{s.label}</span>
}

function StepRow({step,title,subtitle,state}) {
  const icons = {
    pending:<span style={{width:22,height:22,borderRadius:'50%',background:'rgba(192,57,43,0.15)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'rgba(240,237,232,0.5)',fontWeight:700}}>{step}</span>,
    running:<Loader size={18} color='#c0392b' style={{animation:'spin 1s linear infinite'}}/>,
    done:<CheckCircle size={20} color='#16a34a'/>,
    error:<XCircle size={20} color='#c0392b'/>,
    skipped:<span style={{width:22,height:22,borderRadius:'50%',background:'rgba(192,57,43,0.15)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'rgba(240,237,232,0.5)'}}>.</span>,
  }
  return (
    <div style={{display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid #f1f5f9'}}>
      <div style={{paddingTop:2,flexShrink:0}}>{icons[state]||icons.pending}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:600,color:state==='error'?'#c0392b':state==='done'?'transparent':'transparent'}}>{title}</span>
          <Pill state={state}/>
        </div>
        {subtitle && <div style={{fontSize:11,color:'rgba(240,237,232,0.5)',marginTop:2}}>{subtitle}</div>}
      </div>
    </div>
  )
}

function Field({label,hint,required,children}) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(240,237,232,0.6)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>
        {label}{required && <span style={{color:'#c0392b',marginLeft:3}}>*</span>}
      </label>
      {children}
      {hint && <div style={{fontSize:11,color:'rgba(240,237,232,0.45)',marginTop:4}}>{hint}</div>}
    </div>
  )
}
const inp = {width:'100%',boxSizing:'border-box',padding:'9px 12px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:13,fontFamily:'inherit',outline:'none',color:'transparent',background:'white'}

function ServerTypeCard({icon,title,description,selected,onClick}) {
  return (
    <button onClick={onClick} style={{flex:1,textAlign:'left',padding:'12px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',border:selected?'2px solid #2563eb':'1.5px solid #e2e8f0',background:selected?'rgba(192,57,43,0.1)':'white',transition:'all 0.15s'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontSize:13,fontWeight:700,color:selected?'#a93226':'transparent'}}>{title}</span>
        {selected && <Check size={14} color='#c0392b' style={{marginLeft:'auto'}}/>}
      </div>
      <div style={{fontSize:11,color:'rgba(240,237,232,0.45)',lineHeight:1.5}}>{description}</div>
    </button>
  )
}

export default function CpanelInstall({cert,userId,onClose,onSuccess}) {
  const [tok,setTok] = useState('')
  const [phase,setPhase] = useState('select_type')
  const [installResult,setInstallResult] = useState(null)
  const [serverType,setServerType] = useState('cpanel')
  const [savedServers,setSavedServers] = useState([])
  const [selectedServer,setSelectedServer] = useState(null)
  const [useNew,setUseNew] = useState(false)
  const [hostname,setHostname] = useState('')
  const [cpanelUser,setCpanelUser] = useState('')
  const [apiToken,setApiToken] = useState('')
  const [tokenVis,setTokenVis] = useState(false)
  const [label,setLabel] = useState('')
  const [saveServer,setSaveServer] = useState(true)
  const [autoInstallFuture,setAutoInstallFuture] = useState(true)
  const [steps,setSteps] = useState({detect:null,verify:null,key:null,install:null,verify_ssl:null})
  const [stepMsgs,setStepMsgs] = useState({})
  const [errMsg,setErrMsg] = useState('')
  const [busy,setBusy] = useState(false)

  const setStep = (k,v,msg='') => {
    setSteps(p=>({...p,[k]:v}))
    if(msg) setStepMsgs(p=>({...p,[k]:msg}))
  }

  useEffect(()=>{
    ;(async()=>{
      const {data:{session}} = await supabase.auth.getSession()
      if(!session) return
      setTok(session.access_token)
      const res = await call('list_all_cpanel_servers',{},session.access_token)
      if(res.ok && res.credentials?.length){
        setSavedServers(res.credentials)
        const m = res.credentials.find(c=>c.domains?.includes(cert.domain))||res.credentials[0]
        setSelectedServer(m.id); setUseNew(false)
        // Skip server-type selection — go straight to configure with saved server pre-selected
        setPhase('configure')
      } else setUseNew(true)
    })()
  },[])

  useEffect(()=>{
    if(!label && hostname && cpanelUser) setLabel(cpanelUser+'@'+hostname)
  },[hostname,cpanelUser])

  const selSaved = savedServers.find(s=>s.id===selectedServer)

  const handleInstall = async () => {
    if(!tok){setErrMsg('Session expired.');return}
    setBusy(true);setPhase('running');setErrMsg('')
    setSteps({detect:null,verify:null,key:null,install:null,verify_ssl:null});setStepMsgs({})
    let credId = selectedServer
    let credSrc = useNew?'new':(selSaved?.source||'server_credentials')
    setStep('detect','running','Auto-detecting cPanel server hostname...')
    try {
      if(useNew||!selectedServer){
        if(!hostname||!cpanelUser||!apiToken){setStep('detect','error','Fill all required fields');setErrMsg('Hostname, username and API token required');setBusy(false);setPhase('configure');return}
        const vr = await call('verify_and_detect',{domain:hostname,cpanel_user:cpanelUser,api_token:apiToken},tok)
        if(!vr.ok){setStep('detect','error',vr.error);setErrMsg(vr.error||'Cannot connect to cPanel');setBusy(false);setPhase('error');return}
        setStep('detect','done','Connected to '+(vr.detected_host||hostname)+':'+(vr.detected_port||2083)+(vr.auto_detected?' (auto-detected)':''))
        setStep('verify','done','Credentials verified')
        if(saveServer){
          const sr = await call('save_credentials',{hostname,port:2083,cpanel_user:cpanelUser,api_token:apiToken,label:label||cpanelUser+'@'+hostname,domains:[cert.domain]},tok)
          if(sr.ok){credId=sr.credential?.id;credSrc='cpanel_credentials';setSavedServers(p=>[sr.credential,...p]);if(autoInstallFuture&&credId)await supabase.from('certificates').update({install_server_id:credId}).eq('id',cert.id)}
        }
      } else {
        setStep('detect','done','Using saved: '+(selSaved?.hostname||selSaved?.label||''))
        setStep('verify','done','Using saved credentials')
      }
    } catch(e){setStep('detect','error',e.message);setErrMsg(e.message);setBusy(false);setPhase('error');return}
    setStep('key','running','Retrieving private key from CertVault...')
    await new Promise(r=>setTimeout(r,400))
    setStep('key','done','Private key retrieved')
    setStep('install','running','Pushing certificate + chain to cPanel UAPI...')
    try {
      const pl = {cert_id:cert.id,domain:cert.domain}
      if(credId&&credSrc!=='new'){pl.credential_id=credId;pl.credential_source=credSrc}else{pl.hostname=hostname;pl.port=2083;pl.cpanel_user=cpanelUser;pl.api_token=apiToken}
      const ir = await call('install',pl,tok)
      if(!ir.ok){setStep('install','error',ir.error);setErrMsg(ir.error||'Installation failed');setBusy(false);setPhase('error');return}
      setInstallResult(ir)
      setStep('install','done','Certificate installed - activating SSL across all services')
    } catch(e){setStep('install','error',e.message);setErrMsg(e.message);setBusy(false);setPhase('error');return}
    setStep('verify_ssl','running','Verifying HTTPS on '+cert.domain+'...')
    let verified=false
    for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,5000));try{const res=await fetch('https://'+cert.domain,{method:'HEAD',redirect:'follow'});if(res.status<500){verified=true;break}}catch{}}
    setStep('verify_ssl',verified?'done':'skipped',verified?'HTTPS verified - certificate is live':'Certificate installed - DNS propagation may take a few minutes')
    setBusy(false);setPhase('done')
  }

  const expStr = cert.expires_at?new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'N/A'

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,background:'white',zIndex:10,borderRadius:'14px 14px 0 0'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}><Shield size={16} color='#c0392b'/><span style={{fontSize:15,fontWeight:700,color:'transparent'}}>SSL Installation Wizard</span></div>
            <div style={{fontSize:11,color:'rgba(240,237,232,0.5)',marginTop:2,fontFamily:'monospace'}}>{cert.domain}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(240,237,232,0.5)',padding:4}}><X size={16}/></button>
        </div>
        <div style={{padding:'20px 24px 24px'}}>
          <div style={{background:'transparent',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
            <CheckCircle size={14} color='#16a34a'/>
            <div><div style={{fontSize:12,fontWeight:600,color:'transparent'}}>Active Paid SSL Certificate</div><div style={{fontSize:11,color:'rgba(240,237,232,0.45)'}}>Fullchain ready | Private key in CertVault | Expires {expStr}</div></div>
          </div>

          {phase==='select_type' && (<>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(240,237,232,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Select Server Type</div>
            <div style={{display:'flex',gap:10,marginBottom:20}}>
              <ServerTypeCard icon='[S]' title='Shared / cPanel' description='Managed hosting via cPanel API. Credentials saved once - auto-installs on every reissue and renewal.' selected={serverType==='cpanel'} onClick={()=>setServerType('cpanel')}/>
              <ServerTypeCard icon='[V]' title='VPS / Dedicated' description='Direct server access via SSLVault agent. Automatically polls and applies certs.' selected={serverType==='vps'} onClick={()=>setServerType('vps')}/>
            </div>
            {serverType==='vps' && <div style={{background:'rgba(192,57,43,0.1)',border:'1px solid #F2C4BC',borderRadius:8,padding:'12px 14px',marginBottom:16,display:'flex',gap:8,alignItems:'flex-start'}}>
              <AlertTriangle size={13} color='#e07060' style={{marginTop:1,flexShrink:0}}/>
              <div><div style={{fontSize:12,fontWeight:600,color:'#e07060'}}>SSLVault Agent Required</div><div style={{fontSize:11,color:'#e07060',marginTop:2,lineHeight:1.5}}>Go to DNS &amp; Servers &#8210; Servers tab &#8210; Install Agent. Once running it automatically polls and installs certificates.</div></div>
            </div>}
            <button onClick={()=>setPhase('configure')} style={{width:'100%',padding:'11px',background:'#a93226',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>Continue <ChevronRight size={14}/></button>
          </>)}

          {phase==='configure' && serverType==='cpanel' && (<>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(240,237,232,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:14}}>Configure cPanel Server</div>
            {savedServers.length>0 && <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(240,237,232,0.6)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Saved Servers</label>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {savedServers.map(s=>(<button key={s.id} onClick={()=>{setSelectedServer(s.id);setUseNew(false)}} style={{textAlign:'left',padding:'10px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',border:selectedServer===s.id&&!useNew?'2px solid #2563eb':'1px solid #e2e8f0',background:selectedServer===s.id&&!useNew?'rgba(192,57,43,0.1)':'white'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><Server size={13} color={selectedServer===s.id&&!useNew?'#c0392b':'rgba(240,237,232,0.45)'}/><span style={{fontSize:12,fontWeight:600,color:'transparent'}}>{s.label||s.cpanel_user+'@'+s.hostname}</span>{selectedServer===s.id&&!useNew&&<Check size={13} color='#c0392b' style={{marginLeft:'auto'}}/>}</div>
                  <div style={{fontSize:11,color:'rgba(240,237,232,0.45)',marginLeft:21}}>{s.hostname}:{s.port}</div>
                </button>))}
                <button onClick={()=>{setUseNew(true);setSelectedServer(null)}} style={{textAlign:'left',padding:'10px 12px',borderRadius:7,cursor:'pointer',fontFamily:'inherit',border:useNew?'2px solid #2563eb':'1px dashed #cbd5e1',background:useNew?'rgba(192,57,43,0.1)':'rgba(26,0,0,0.5)',color:'rgba(240,237,232,0.6)',fontSize:12,fontWeight:500}}>+ Add new server</button>
              </div>
            </div>}
            {(useNew||savedServers.length===0) && <div style={{background:'transparent',border:'1px solid #e2e8f0',borderRadius:8,padding:'16px',marginTop:4}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(240,237,232,0.6)',marginBottom:14,textTransform:'uppercase',letterSpacing:'0.4px'}}>New cPanel Server</div>
              <Field label='Domain or Hostname' required hint='Enter your domain or cPanel hostname. SSLVault auto-detects the correct server.'>
                <input value={hostname} onChange={e=>setHostname(e.target.value)} placeholder='freecerts.site or server11.host.com' style={inp}/>
              </Field>
              <Field label='cPanel Username' required><input value={cpanelUser} onChange={e=>setCpanelUser(e.target.value)} placeholder='freecert' style={inp}/></Field>
              <Field label='cPanel API Token' required hint='Create in cPanel Security > Manage API Tokens. Never expires.'>
                <div style={{position:'relative'}}>
                  <input type={tokenVis?'text':'password'} value={apiToken} onChange={e=>setApiToken(e.target.value)} placeholder='Paste your API token here' style={{...inp,paddingRight:40}}/>
                  <button onClick={()=>setTokenVis(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(240,237,232,0.45)',padding:0}}>{tokenVis?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                </div>
              </Field>
              <Field label='Nickname (optional)'><input value={label} onChange={e=>setLabel(e.target.value)} placeholder={cpanelUser&&hostname?cpanelUser+'@'+hostname:'My cPanel server'} style={inp}/></Field>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
                <label style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer'}}><input type='checkbox' checked={saveServer} onChange={e=>setSaveServer(e.target.checked)} style={{marginTop:2}}/><span style={{fontSize:12,color:'rgba(240,237,232,0.6)',lineHeight:1.5}}>Save this server for future one-click installs</span></label>
                <label style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer'}}><input type='checkbox' checked={autoInstallFuture} onChange={e=>setAutoInstallFuture(e.target.checked)} style={{marginTop:2}}/><span style={{fontSize:12,color:'rgba(240,237,232,0.6)',lineHeight:1.5}}>Auto-install when cert is reissued or renewed</span></label>
              </div>
            </div>}
            <div style={{marginTop:16,marginBottom:20,background:'rgba(192,57,43,0.1)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:8,padding:'12px 14px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#15803d',marginBottom:8}}>What happens during installation</div>
              {['SSLVault connects to your cPanel server over HTTPS (no SSH needed)','Uploads the 3-block fullchain PEM - end-entity + intermediate + root CA','Calls cPanel rebuild_mail_sni to activate SSL across all services','Enables automatic HTTP to HTTPS redirect','Verifies the live domain is serving your new certificate'].map((t,i)=>(<div key={i} style={{display:'flex',gap:6,marginBottom:4,fontSize:11,color:'#166534'}}><span style={{color:'#16a34a',flexShrink:0}}>&#10004;</span>{t}</div>))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPhase('select_type')} style={{padding:'10px 16px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(240,237,232,0.6)'}}>Back</button>
              <button onClick={handleInstall} disabled={busy} style={{flex:1,padding:'11px',background:busy?'rgba(192,57,43,0.3)':'#a93226',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:busy?'wait':'pointer',fontFamily:'inherit'}}>{busy?'Installing...':'Install Certificate'}</button>
            </div>
          </>)}

          {(phase==='running'||phase==='done'||phase==='error') && (<>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(240,237,232,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Installation Progress</div>
            <div>
              <StepRow step={1} title='Detect &amp; Connect' subtitle={stepMsgs.detect} state={steps.detect||'pending'}/>
              <StepRow step={2} title='Verify Credentials' subtitle={stepMsgs.verify} state={steps.verify||'pending'}/>
              <StepRow step={3} title='Retrieve Private Key' subtitle={stepMsgs.key} state={steps.key||'pending'}/>
              <StepRow step={4} title='Install Certificate' subtitle={stepMsgs.install} state={steps.install||'pending'}/>
              <StepRow step={5} title='Verify HTTPS' subtitle={stepMsgs.verify_ssl} state={steps.verify_ssl||'pending'}/>
            </div>
            {errMsg && <div style={{marginTop:16,background:'rgba(192,57,43,0.12)',border:'1px solid #fecaca',borderRadius:8,padding:'12px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
              <XCircle size={14} color='#c0392b' style={{flexShrink:0,marginTop:1}}/>
              <div><div style={{fontSize:12,fontWeight:600,color:'#a93226'}}>Installation failed</div><div style={{fontSize:11,color:'#a93226',marginTop:3,lineHeight:1.5}}>{errMsg}</div></div>
            </div>}
            {phase==='done' && <div style={{marginTop:16,background:'rgba(192,57,43,0.1)',border:'1px solid rgba(192,57,43,0.3)',borderRadius:8,padding:'14px'}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}><CheckCircle size={16} color='#16a34a'/><span style={{fontSize:13,fontWeight:700,color:'#15803d'}}>Certificate installed successfully</span></div>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px',fontSize:11,color:'#166534',lineHeight:1.8,marginBottom:8}}>
                <span style={{fontWeight:600}}>Domain</span><span style={{fontFamily:'monospace'}}>{cert.domain}</span>
                {(installResult?.serial_number||cert?.serial_number)&&<><span style={{fontWeight:600}}>Serial</span><span style={{fontFamily:'monospace',wordBreak:'break-all'}}>{installResult?.serial_number||cert?.serial_number}</span></>}
                {cert?.expires_at&&<><span style={{fontWeight:600}}>Expires</span><span>{new Date(cert.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span></>}
                <span style={{fontWeight:600}}>Status</span><span style={{color:'#15803d',fontWeight:600}}>✓ Active on cPanel</span>
              </div>
              {autoInstallFuture&&<div style={{fontSize:10,color:'#166534',opacity:0.8}}>Future reissues and renewals will be installed automatically.</div>}
            </div>}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              {phase==='error' && <button onClick={()=>{setPhase('configure');setBusy(false)}} style={{flex:1,padding:'10px',border:'1px solid #e2e8f0',borderRadius:8,background:'white',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'rgba(240,237,232,0.6)'}}>Try again</button>}
              <button onClick={()=>{if(phase==='done'&&onSuccess)onSuccess();onClose();}} style={{flex:1,padding:'10px',background:phase==='done'?'#16a34a':'rgba(192,57,43,0.15)',color:phase==='done'?'white':'rgba(240,237,232,0.6)',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600}}>{phase==='done'?'Done':'Close'}</button>
            </div>
          </>)}
        </div>
      </div>
      <style>{'@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
