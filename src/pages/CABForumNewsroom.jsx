import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const SYNC_FN = `${SUPABASE_URL}/functions/v1/cabforum-sync`
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"
const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const BLUE = '#0077b6'
const DARK = '#005a8a'

const COMPLIANCE_DEADLINES = [
  { title:'200-day max validity', date:'2026-03-15', ballot:'SC081v3', color:'#e74c3c', status:'urgent', action:'Audit your certificate fleet now. Any cert with validity > 200 days issued after this date will be rejected by browsers.' },
  { title:'100-day max validity', date:'2027-03-15', ballot:'SC081v3', color:'#f39c12', status:'plan', action:'Manual renewal every 100 days is operationally unsustainable. Start deploying ACME automation now.' },
  { title:'47-day max validity', date:'2029-03-15', ballot:'SC081v3', color:'#00a550', status:'future', action:'Full zero-touch automation required. Human-in-the-loop renewal processes will fail at this cadence.' },
  { title:'DCV reuse max 10 days', date:'2027-03-15', ballot:'SC081v3', color:'#f39c12', status:'plan', action:'Domain control validation reuse drops to 10 days — requiring near-continuous automated re-validation.' },
  { title:'SHA-1 fully prohibited', date:'2026-01-01', ballot:'SC097', color:'#888', status:'passed', action:'Already in effect. Any cert or CRL with SHA-1 signatures must be revoked. Check your intermediates.' },
  { title:'Multi-perspective DCV', date:'2025-03-15', ballot:'SC067v3', color:'#888', status:'passed', action:'Already in effect. CAs must validate from multiple network perspectives. Affects all new issuances.' },
]

const TIMELINE = [
  { year:'2005', event:'CAB Forum founded', desc:'Voluntary consortium formed by major CAs and browsers to establish industry standards for certificate issuance.', type:'milestone', color:'#00a550' },
  { year:'2007', event:'EV Guidelines v1.0 — first published standard', desc:'Extended Validation certificate guidelines published. The green address bar era begins.', type:'milestone', color:'#00a550' },
  { year:'2011', event:'DigiNotar catastrophic breach', desc:'Dutch CA DigiNotar compromised — 500+ rogue certs. DigiNotar bankrupt. Accelerated BR work.', type:'incident', color:'#e74c3c' },
  { year:'2012', event:'Baseline Requirements v1.0 — the constitution of web PKI', desc:'All publicly-trusted TLS certs must comply. Governs key size, validity, revocation, DCV, and audit.', type:'milestone', color:'#00a550' },
  { year:'2017', event:'SHA-1 rejection — browsers enforce crypto standards', desc:'Chrome and Firefox begin rejecting SHA-1 signed certificates globally.', type:'enforcement', color:'#f39c12' },
  { year:'2018', event:'Symantec distrusted by Chrome and Mozilla', desc:'After compliance failures, Google and Mozilla removed Symantec CA roots. DigiCert acquired the business.', type:'incident', color:'#e74c3c' },
  { year:'2019', event:'Working Group structure adopted — Bylaws v2.2', desc:'Forum restructures into SCWG, Code Signing WG, and NetSec WG, each with their own charters.', type:'milestone', color:'#00a550' },
  { year:'2020', event:'Apple enforces 1-year validity — unilaterally', desc:'A CAB Forum ballot failed. Apple bypassed the Forum entirely and enforced 398-day certs in Safari.', type:'enforcement', color:'#f39c12' },
  { year:'2023', event:'SC063 — OCSP optional, CRLs required', desc:'Landmark privacy decision: OCSP becomes optional while CRL availability is mandated.', type:'ballot', color:'#00a550' },
  { year:'2024', event:'Entrust distrusted — largest CA distrust event in history', desc:'Chrome and Mozilla remove Entrust after repeated failures. 26M+ active certificates affected.', type:'incident', color:'#e74c3c' },
  { year:'2024', event:'SC067v3 — Multi-Perspective Issuance Corroboration', desc:'CAs must validate from multiple geographic perspectives simultaneously. Prevents BGP hijacking.', type:'ballot', color:'#00a550' },
  { year:'2025', event:'SC081v3 — The 47-day mandate', desc:'200d → 100d → 47d between 2026–2029. Zero-touch automation becomes a legal requirement.', type:'ballot', color:'#e74c3c' },
  { year:'2025', event:'SC088v3 — Persistent DNS TXT DCV method', desc:'New validation method using a permanent DNS TXT record — enables fully automated renewal at 47 days.', type:'ballot', color:'#00a550' },
  { year:'2026', event:'SC097 — SHA-1 fully prohibited in all certificates and CRLs', desc:'Final SHA-1 sunset. Every remaining SHA-1 use in certificate chains prohibited.', type:'ballot', color:'#f39c12' },
]

const WORKING_GROUPS = [
  { id:'server', name:'Server Certificate WG', short:'SCWG', color:'#005a8a', chair:'Dimitris Zacharopoulos', chairOrg:'HARICA', vchair:'Wayne Thayer', vchairOrg:'Fastly', latestBR:'TLS BR v2.2.7', latestBallot:'SC099', desc:'Governs all publicly-trusted TLS/SSL certificates. Produces the Baseline Requirements — the primary rulebook for web PKI.', members:53, docs:'https://cabforum.org/working-groups/server/' },
  { id:'smime', name:'S/MIME Certificate WG', short:'SMCWG', color:'#0077b6', chair:'Stephen Davidson', chairOrg:'DigiCert', vchair:'Martijn Katerbarg', vchairOrg:'Sectigo', latestBR:'S/MIME BR v1.0.14', latestBallot:'SMC016', desc:'Produces S/MIME Baseline Requirements governing email encryption and signing certificates.', members:38, docs:'https://cabforum.org/working-groups/smime/' },
  { id:'codesign', name:'Code Signing WG', short:'CSCWG', color:'#0077b6', chair:'Martijn Katerbarg', chairOrg:'Sectigo', vchair:'Thomas Zermeno', vchairOrg:'SSL.com', latestBR:'Code Signing BR v3.8', latestBallot:'CSC-25', desc:'Governs code signing certificates used to authenticate software publishers.', members:31, docs:'https://cabforum.org/working-groups/code-signing/' },
  { id:'netsec', name:'Network Security WG', short:'NSWG', color:'#111', chair:'Clint Wilson', chairOrg:'Apple', vchair:'David Kluge', vchairOrg:'Google Trust Services', latestBR:'NetSec BR v2.0.5', latestBallot:'NS-008', desc:'Focuses on CA infrastructure security — network architecture, physical security, and incident response.', members:28, docs:'https://cabforum.org/working-groups/netsec/' },
  { id:'definitions', name:'Definitions & Glossary WG', short:'DWG', color:'#333', chair:'Tim Hollebeek', chairOrg:'DigiCert', vchair:'—', vchairOrg:'', latestBR:'Definitions v1.0', latestBallot:'—', desc:'Maintains consistent terminology across all CAB Forum documents.', members:22, docs:'https://cabforum.org/working-groups/definitions/' },
]

const CA_MEMBERS = ['AC Camerfirma','Actalis','Amazon Trust Services','Asseco/Certum','Beijing CA','Buypass','Certigna','certSIGN','CFCA','Chunghwa Telecom','Cybertrust Japan','DigiCert','Digidentity','Disig','DocuSign','D-TRUST','eMudhra','Entrust','E-tugra','Fastly','GDCA','GlobalSign','GoDaddy','HARICA','IdenTrust','iTrusChina','Izenpe','Japan Registry Services','Kamu SM','KPN',"Let's Encrypt",'MOIS Korea','MSC Trustgate','NAVER Cloud','Network Solutions','OISTE','SDAIA','SECOM Trust','Sectigo','SHECA','SK ID Solutions','SSL.com','SwissSign','Telia','TrustAsia','TWCA','Visa']
const BROWSER_MEMBERS = ['Apple','Brave','Chrome/Google','Cisco','Microsoft','Mozilla','Opera','360 Browser']

const fmtDate = iso => { if(!iso) return '—'; try { return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) } catch { return iso } }
const daysUntil = d => d ? Math.round((new Date(d).getTime()-Date.now())/86400000) : null

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function CABForumNewsroom({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('ballots')
  const [ballots, setBallots] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncedAt, setSyncedAt] = useState(null)
  const [wgFilter, setWgFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedBallot, setSelectedBallot] = useState(null)
  const [selectedWG, setSelectedWG] = useState(null)
  const [tlFilter, setTlFilter] = useState('All')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data:b },{ data:p },{ data:s }] = await Promise.all([
        supabase.from('cabf_ballots').select('*').order('voting_closed',{ascending:false,nullsFirst:false}),
        supabase.from('cabf_posts').select('*').order('published_at',{ascending:false}).limit(30),
        supabase.from('cabf_sync_log').select('synced_at').order('synced_at',{ascending:false}).limit(1).maybeSingle(),
      ])
      setBallots(b||[]); setPosts(p||[])
      if(s?.synced_at) setSyncedAt(s.synced_at)
    } catch(e){ console.error(e) }
    setLoading(false)
  },[])

  useEffect(()=>{ loadData() },[loadData])

  const triggerSync = async () => {
    setSyncing(true); setSyncMsg('Fetching from CAB Forum…')
    try {
      const res = await fetch(SYNC_FN,{method:'POST'})
      const j = await res.json()
      setSyncMsg(j.success ? `Synced — ${j.ballots_upserted} ballots, ${j.posts_upserted} posts` : 'Sync failed')
      await loadData()
    } catch(e){ setSyncMsg('Sync failed: '+e.message) }
    setSyncing(false)
    setTimeout(()=>setSyncMsg(''),4000)
  }

  const syncAge = syncedAt ? (()=>{
    const h = Math.round((Date.now()-new Date(syncedAt))/3600000)
    return h<1?'just now':h<24?`${h}h ago`:`${Math.round(h/24)}d ago`
  })() : 'never'

  const filteredBallots = ballots.filter(b => {
    if(wgFilter!=='all' && b.working_group!==wgFilter) return false
    if(statusFilter==='passed' && !['Passed','Adopted'].includes(b.status)) return false
    if(statusFilter==='active' && !['Voting Period','Discussion Period','IPR Review','Draft'].some(s=>b.status?.includes(s)||b.status==='Draft')) return false
    if(statusFilter==='failed' && !['Failed','Withdrawn'].includes(b.status)) return false
    if(query){
      const q=query.toLowerCase()
      return(b.title||'').toLowerCase().includes(q)||(b.ballot_id||'').toLowerCase().includes(q)||(b.plain_english||'').toLowerCase().includes(q)
    }
    return true
  })

  const criticalBallots = ballots.filter(b=>b.impact_level==='critical'&&b.status==='Passed')
  const urgentDeadline = COMPLIANCE_DEADLINES.find(d=>d.status==='urgent')
  const urgentDays = urgentDeadline ? daysUntil(urgentDeadline.date) : null
  const filteredTL = TIMELINE.filter(e=>tlFilter==='All'||e.type===tlFilter)

  const statusPill = s => {
    if(!s) return {bg:'rgba(0,0,0,.06)',c:'#888',border:'rgba(0,0,0,.1)'}
    const l=s.toLowerCase()
    if(['passed','adopted'].includes(l)) return {bg:'rgba(0,165,80,.1)',c:'#00a550',border:'rgba(0,165,80,.2)'}
    if(['failed','withdrawn'].includes(l)) return {bg:'rgba(231,76,60,.08)',c:'#e74c3c',border:'rgba(231,76,60,.2)'}
    if(['voting period','discussion period','ipr review'].some(x=>l.includes(x))||l==='draft') return {bg:'rgba(0,119,182,.08)',c:BLUE,border:'rgba(0,119,182,.2)'}
    return {bg:'rgba(0,0,0,.06)',c:'#888',border:'rgba(0,0,0,.1)'}
  }

  const wgPill = wg => {
    const m = {'Server Cert WG':{bg:'rgba(0,90,138,.08)',c:'#005a8a',border:'rgba(0,90,138,.2)'},'S/MIME WG':{bg:'rgba(0,119,182,.08)',c:BLUE,border:'rgba(0,119,182,.2)'},'Code Signing WG':{bg:'rgba(243,156,18,.08)',c:'#e67e22',border:'rgba(243,156,18,.2)'},'NetSec WG':{bg:'rgba(0,165,80,.08)',c:'#00a550',border:'rgba(0,165,80,.2)'},'Forum':{bg:'rgba(0,0,0,.06)',c:'#666',border:'rgba(0,0,0,.1)'}}
    return m[wg]||{bg:'rgba(0,0,0,.06)',c:'#666',border:'rgba(0,0,0,.1)'}
  }

  const tlColor = t => t==='incident'?'#e74c3c':t==='ballot'?'#00a550':t==='enforcement'?'#f39c12':'#0077b6'
  const P = isMobile?'14px':'24px'

  return (
    <div style={{fontFamily:FONT,background:'#f8f9fa',minHeight:'100vh'}}>
      <style>{`
        .cabf-hero{background:${BLUE};padding:36px ${P} 0;color:#fff}
        .cabf-hero-grid{display:grid;grid-template-columns:${isMobile?'1fr':'1fr 1fr'};gap:24px;align-items:start}
        .cabf-eyebrow{font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:8px}
        .cabf-h1{font-size:${isMobile?'22px':'28px'};font-weight:600;line-height:1.2;margin-bottom:10px;color:#fff}
        .cabf-h1 span{color:#3dbfb0}
        .cabf-sub{font-size:13px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:20px}
        .cabf-stats{display:flex;gap:${isMobile?'16px':'28px'};flex-wrap:wrap;margin-bottom:0}
        .cabf-sn{font-size:${isMobile?'18px':'22px'};font-weight:600;color:#fff;line-height:1}
        .cabf-sl{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
        .cabf-strip{background:rgba(0,0,0,.15);margin:24px -${P} 0;padding:10px ${P};display:flex;align-items:center;gap:16px;border-top:0.5px solid rgba(255,255,255,.1);flex-wrap:wrap}
        .cabf-tag{font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.06em;font-family:${MONO};white-space:nowrap}
        .cabf-alert{background:rgba(231,76,60,.12);border-bottom:2px solid rgba(231,76,60,.25);padding:11px ${P};display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .cabf-sync-bar{background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:8px ${P};display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#666;gap:12px;flex-wrap:wrap;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .cabf-tabs{background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:0 ${P};display:flex;gap:0;overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06)}
        .cabf-tabs::-webkit-scrollbar{display:none}
        .cabf-tab{background:none;border:none;border-bottom:2px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:#666;padding:12px 4px 11px;margin-right:20px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:color .12s;flex-shrink:0}
        .cabf-tab:hover{color:#111}
        .cabf-tab.on{color:${BLUE};border-bottom-color:${BLUE}}
        .cabf-cnt{font-size:11px;background:#f0f4fa;border-radius:20px;padding:1px 7px;color:#666}
        .cabf-tab.on .cabf-cnt{background:${BLUE};color:#fff}
        .cabf-main{display:grid;grid-template-columns:${isMobile?'1fr':'1fr 280px'};gap:0;align-items:start;max-width:1200px;margin:0 auto}
        .cabf-content{padding:${P};border-right:${isMobile?'none':'1px solid rgba(0,0,0,.07)'};min-height:500px}
        .cabf-sidebar{padding:16px;position:sticky;top:52px}
        .cabf-filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
        .cabf-chip{font-size:11px;padding:5px 11px;border-radius:20px;border:1px solid rgba(0,0,0,.1);background:#fff;color:#555;cursor:pointer;font-family:${FONT};transition:all .12s}
        .cabf-chip:hover{border-color:${BLUE};color:${BLUE}}
        .cabf-chip.on{background:${BLUE};color:#fff;border-color:${BLUE}}
        .cabf-search{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:8px 12px;margin-bottom:14px}
        .cabf-search input{background:transparent;border:none;outline:none;color:#111;font-family:${FONT};font-size:13px;width:100%}
        .ballot-row{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:10px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:all .12s;box-shadow:0 1px 2px rgba(0,0,0,.03)}
        .ballot-row:hover{border-color:rgba(0,119,182,.3);box-shadow:0 2px 8px rgba(0,119,182,.08)}
        .ballot-row.sel{border-color:${BLUE};box-shadow:0 0 0 3px rgba(0,119,182,.08)}
        .ballot-detail{background:rgba(0,119,182,.04);border:1px solid rgba(0,119,182,.2);border-radius:12px;padding:18px;margin-bottom:16px}
        .tl-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0}
        .tl-item:last-child{border-bottom:none}
        .tl-year{font-size:12px;font-weight:600;color:#888;min-width:38px;font-family:${MONO}}
        .tl-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
        .tl-event{font-size:12px;font-weight:600;color:#111;margin-bottom:3px;line-height:1.4}
        .tl-desc{font-size:11.5px;color:#555;line-height:1.65}
        .wg-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:18px;margin-bottom:12px;cursor:pointer;transition:all .12s;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .wg-card:hover{border-color:rgba(0,119,182,.3);box-shadow:0 3px 12px rgba(0,119,182,.08)}
        .wg-card.sel{border-color:${BLUE};box-shadow:0 0 0 3px rgba(0,119,182,.1)}
        .wg-badge{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
        .wg-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0}
        .wm-k{font-size:10px;color:#888;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
        .wm-v{font-size:12px;font-weight:600;color:#111}
        .sc-widget{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:10px;overflow:hidden;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .sc-head{padding:10px 14px;border-bottom:1px solid #f0f0f0;background:#fafbfc}
        .sc-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888}
        .sc-body{padding:10px 14px}
        .deadline-card{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:10px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,.03)}
        .full-content{padding:${P};max-width:1200px;margin:0 auto}
        .pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap;flex-shrink:0}
        @media(max-width:768px){.cabf-main{grid-template-columns:1fr}.cabf-sidebar{display:none}}
      `}</style>

      {/* ── SYNC BAR ── */}
      <div className="cabf-sync-bar">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}}/>
          <span>CAB Forum data · synced {syncAge} · {ballots.length} ballots indexed</span>
          {syncMsg&&<span style={{color:'#e67e22',fontWeight:600}}>{syncMsg}</span>}
        </div>
        <div style={{display:'flex',gap:7}}>
          <button onClick={triggerSync} disabled={syncing} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:6,border:'1px solid rgba(0,0,0,.12)',background:'#fff',color:'#444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {syncing?'Syncing…':'Sync now'}
          </button>
          <a href="https://cabforum.org" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:6,border:'1px solid rgba(0,0,0,.12)',background:'#fff',color:'#444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,textDecoration:'none'}}>
            CAB Forum ↗
          </a>
        </div>
      </div>

      {/* ── ALERT ── */}
      {urgentDays!==null&&urgentDays>0&&(
        <div className="cabf-alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{fontSize:12,fontWeight:600,color:'#c0392b',flex:1}}>200-day certificate validity limit — enforcement date approaching</span>
          <span style={{fontSize:16,fontWeight:700,color:'#c0392b',fontFamily:MONO}}>{urgentDays}d</span>
          <span style={{fontSize:11,color:'#888',fontFamily:MONO}}>March 15, 2026 · SC081v3</span>
          <button onClick={()=>setTab('deadlines')} style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1px solid rgba(231,76,60,.3)',background:'rgba(231,76,60,.08)',color:'#c0392b',cursor:'pointer',fontFamily:FONT,fontWeight:600}}>See all →</button>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="cabf-hero">
        <div className="cabf-hero-grid">
          <div>
            <div className="cabf-eyebrow">SSLVault PKI Intelligence · CA/Browser Forum</div>
            <h1 className="cabf-h1">Every ballot, every standard,<br/><span>decoded.</span></h1>
            <p className="cabf-sub">The most comprehensive CAB Forum intelligence platform. Every ballot explained in plain English, every compliance deadline tracked, 20 years of PKI history in one timeline.</p>
            <div className="cabf-stats">
              {[[ballots.length||'21+','Ballots tracked'],['5','Working groups'],['67','F2F meetings'],[CA_MEMBERS.length+'+','CA members'],['2005','Founded'],['v2.2.7','Latest TLS BR']].map(([n,l])=>(
                <div key={l}><div className="cabf-sn">{n}</div><div className="cabf-sl">{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{display:isMobile?'none':'block'}}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[{label:'SC081v3',title:'47-day mandate — in effect',sub:'200d Mar 2026 · 100d Mar 2027 · 47d Mar 2029',dot:'#e74c3c'},{label:'SC088v3',title:'Persistent DNS TXT DCV',sub:'Enables fully automated renewal',dot:'#00a550'},{label:'SC097',title:'SHA-1 fully prohibited',sub:'All certs and CRLs — effective 2026',dot:'#888'}].map(b=>(
                <div key={b.label} style={{background:'rgba(255,255,255,.1)',border:'0.5px solid rgba(255,255,255,.18)',borderRadius:8,padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:6,background:DARK,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0,fontFamily:MONO}}>{b.label.slice(0,2)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:'#fff',fontWeight:600}}>{b.title}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>{b.sub}</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:'50%',background:b.dot,flexShrink:0}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="cabf-strip">
          {['TLS BR v2.2.7','SC081v3 · 47-day','S/MIME BR v1.0.14','MPIC enforced','SHA-1 prohibited','DNS-01 automation','PQC planning'].map(t=>(
            <span key={t} className="cabf-tag">{t}</span>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="cabf-tabs">
        {[
          {id:'ballots',label:'Ballots & News',cnt:ballots.length||'—'},
          {id:'deadlines',label:'Compliance Deadlines',cnt:COMPLIANCE_DEADLINES.length},
          {id:'timeline',label:'PKI Timeline',cnt:TIMELINE.length},
          {id:'workinggroups',label:'Working Groups',cnt:5},
          {id:'members',label:'Members',cnt:CA_MEMBERS.length+BROWSER_MEMBERS.length},
        ].map(t=>(
          <button key={t.id} className={`cabf-tab${tab===t.id?' on':''}`} onClick={()=>{setTab(t.id);setSelectedBallot(null)}}>
            {t.label} <span className="cabf-cnt">{t.cnt}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: BALLOTS ── */}
      {tab==='ballots'&&(
        <div className="cabf-main">
          <div className="cabf-content">
            <div className="cabf-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search ballots, IDs, descriptions…" value={query} onChange={e=>setQuery(e.target.value)}/>
            </div>
            <div className="cabf-filter-row">
              <span style={{fontSize:11,color:'#888',marginRight:2}}>WG:</span>
              {['all','Server Cert WG','S/MIME WG','Code Signing WG','NetSec WG'].map(f=>(
                <button key={f} className={`cabf-chip${wgFilter===f?' on':''}`} onClick={()=>setWgFilter(f)}>{f==='all'?'All':f}</button>
              ))}
            </div>
            <div className="cabf-filter-row" style={{marginTop:-6}}>
              <span style={{fontSize:11,color:'#888',marginRight:2}}>Status:</span>
              {[['all','All'],['passed','Passed'],['active','Active'],['failed','Failed']].map(([k,l])=>(
                <button key={k} className={`cabf-chip${statusFilter===k?' on':''}`} onClick={()=>setStatusFilter(k)}>{l}</button>
              ))}
            </div>

            {/* Selected ballot detail */}
            {selectedBallot&&(
              <div className="ballot-detail">
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,gap:10}}>
                  <div>
                    <div style={{fontSize:11,fontFamily:MONO,color:'#888',marginBottom:4}}>{selectedBallot.ballot_id}</div>
                    <div style={{fontSize:15,fontWeight:700,color:'#111',lineHeight:1.3}}>{selectedBallot.title}</div>
                  </div>
                  <button onClick={()=>setSelectedBallot(null)} style={{background:'none',border:'1px solid rgba(0,0,0,.1)',borderRadius:6,padding:'5px 10px',fontSize:12,color:'#666',cursor:'pointer',fontFamily:FONT,flexShrink:0}}>✕ Close</button>
                </div>
                {selectedBallot.plain_english&&(
                  <div style={{background:'rgba(0,119,182,.06)',border:'1px solid rgba(0,119,182,.15)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#333',lineHeight:1.7}}>
                    <div style={{fontSize:10,fontWeight:700,color:BLUE,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>Plain English</div>
                    {selectedBallot.plain_english}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
                  {[['Working Group',selectedBallot.working_group],['Status',selectedBallot.status],['Vote closed',fmtDate(selectedBallot.voting_closed)],['BR version',selectedBallot.br_version||'—'],['Impact',selectedBallot.impact_level||'normal'],['Proposed by',selectedBallot.proposed_by||'—']].map(([k,v])=>(
                    <div key={k} style={{background:'#fff',border:'1px solid rgba(0,0,0,.06)',borderRadius:7,padding:'8px 10px'}}>
                      <div style={{fontSize:10,color:'#888',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:3}}>{k}</div>
                      <div style={{fontSize:12,fontWeight:600,color:'#111'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {selectedBallot.url&&<a href={selectedBallot.url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:12,fontSize:12,fontWeight:600,color:BLUE,textDecoration:'none'}}>Read full ballot on CAB Forum ↗</a>}
              </div>
            )}

            {/* Ballot list */}
            {loading?(
              <div style={{padding:24,color:'#aaa',fontSize:13}}>Loading ballots…</div>
            ):filteredBallots.length===0?(
              <div style={{textAlign:'center',padding:40,color:'#888',fontSize:13}}>No ballots match your filter.</div>
            ):filteredBallots.map(b=>{
              const sp=statusPill(b.status); const wp=wgPill(b.working_group)
              return(
                <div key={b.ballot_id} className={`ballot-row${selectedBallot?.ballot_id===b.ballot_id?' sel':''}`} onClick={()=>setSelectedBallot(selectedBallot?.ballot_id===b.ballot_id?null:b)}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,fontWeight:700,color:'#888',fontFamily:MONO,paddingTop:2,flexShrink:0}}>{b.ballot_id}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#111',flex:1,lineHeight:1.3}}>{b.title}</span>
                    {b.impact_level==='critical'&&<span className="pill" style={{background:'rgba(231,76,60,.08)',color:'#e74c3c',border:'1px solid rgba(231,76,60,.2)'}}>Critical</span>}
                  </div>
                  {b.plain_english&&<div style={{fontSize:12,color:'#555',lineHeight:1.65,marginBottom:8}}>{b.plain_english}</div>}
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span className="pill" style={{background:wp.bg,color:wp.c,border:`1px solid ${wp.border}`}}>{b.working_group}</span>
                    {b.voting_closed&&<span style={{fontSize:11,color:'#888'}}>{fmtDate(b.voting_closed)}</span>}
                    {b.br_version&&<span style={{fontSize:10,fontFamily:MONO,color:'#00a550',background:'rgba(0,165,80,.08)',padding:'1px 6px',borderRadius:4,border:'1px solid rgba(0,165,80,.2)'}}>{b.br_version}</span>}
                    <span className="pill" style={{background:sp.bg,color:sp.c,border:`1px solid ${sp.border}`}}>{b.status||'—'}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="cabf-sidebar">
            <div className="sc-widget">
              <div className="sc-head"><span className="sc-title">Critical ballots</span></div>
              <div className="sc-body">
                {criticalBallots.slice(0,5).map(b=>(
                  <div key={b.ballot_id} onClick={()=>setSelectedBallot(b)} style={{padding:'8px 0',borderBottom:'1px solid #f0f0f0',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                      <span style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:'#888'}}>{b.ballot_id}</span>
                      <span className="pill" style={{background:'rgba(231,76,60,.08)',color:'#e74c3c',border:'1px solid rgba(231,76,60,.2)'}}>Critical</span>
                    </div>
                    <div style={{fontSize:11,fontWeight:600,color:'#111',lineHeight:1.4}}>{b.title}</div>
                  </div>
                ))}
                {criticalBallots.length===0&&<div style={{fontSize:12,color:'#888',padding:'4px 0'}}>Loading…</div>}
              </div>
            </div>
            <div className="sc-widget">
              <div className="sc-head"><span className="sc-title">Current BR versions</span></div>
              <div className="sc-body">
                {[{name:'TLS Baseline Requirements',v:'v2.2.7',ballot:'SC099'},{name:'S/MIME BR',v:'v1.0.14',ballot:'SMC016'},{name:'Code Signing BR',v:'v3.8',ballot:'CSC-25'},{name:'Network Security BR',v:'v2.0.5',ballot:'NS-008'}].map(r=>(
                  <div key={r.name} style={{padding:'8px 0',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:'#111'}}>{r.name}</div>
                      <div style={{fontSize:10,color:'#888',fontFamily:MONO}}>{r.ballot}</div>
                    </div>
                    <span className="pill" style={{background:'rgba(0,165,80,.1)',color:'#00a550',border:'1px solid rgba(0,165,80,.2)'}}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sc-widget">
              <div className="sc-head"><span className="sc-title">Forum leadership</span></div>
              <div className="sc-body">
                {[{role:'Forum Chair',name:'Dean Coclin',org:'DigiCert'},{role:'Forum Vice Chair',name:'Tim Callan',org:'Sectigo'},{role:'SCWG Chair',name:'Dimitris Zacharopoulos',org:'HARICA'},{role:'S/MIME WG Chair',name:'Stephen Davidson',org:'DigiCert'},{role:'NetSec WG Chair',name:'Clint Wilson',org:'Apple'}].map(r=>(
                  <div key={r.role} style={{padding:'7px 0',borderBottom:'1px solid #f0f0f0'}}>
                    <div style={{fontSize:10,color:'#888',marginBottom:2}}>{r.role}</div>
                    <div style={{fontSize:12,fontWeight:600,color:'#111'}}>{r.name} <span style={{fontWeight:400,color:'#555'}}>· {r.org}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: DEADLINES ── */}
      {tab==='deadlines'&&(
        <div className="full-content">
          <div style={{marginBottom:20}}>
            <div style={{fontSize:20,fontWeight:700,color:'#111',marginBottom:6}}>Compliance deadline calendar</div>
            <div style={{fontSize:13,color:'#555'}}>Every upcoming CAB Forum enforcement date — with live countdowns and required actions.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:12}}>
            {COMPLIANCE_DEADLINES.map(d=>{
              const days=daysUntil(d.date); const isPast=days!==null&&days<0
              return(
                <div key={d.title} className="deadline-card" style={{borderLeft:`3px solid ${d.color}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:4}}>{d.title}</div>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <span style={{fontSize:11,color:'#888',fontFamily:MONO}}>{d.date}</span>
                        <span className="pill" style={{background:'rgba(0,0,0,.05)',color:'#666',border:'1px solid rgba(0,0,0,.08)'}}>{d.ballot}</span>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                      {isPast?(
                        <div style={{fontSize:12,fontWeight:700,color:'#888'}}>In effect</div>
                      ):(
                        <>
                          <div style={{fontSize:26,fontWeight:700,color:d.color,fontFamily:MONO,lineHeight:1}}>{days}</div>
                          <div style={{fontSize:10,color:'#888',textTransform:'uppercase',letterSpacing:'.04em'}}>days left</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{background:`${d.color}0d`,border:`1px solid ${d.color}22`,borderRadius:8,padding:'10px 12px',fontSize:12,color:'#444',lineHeight:1.7}}>{d.action}</div>
                </div>
              )
            })}
          </div>
          <div style={{background:'rgba(0,119,182,.06)',border:'1px solid rgba(0,119,182,.15)',borderRadius:10,padding:'14px 16px',marginTop:20,fontSize:12,color:'#444',lineHeight:1.7}}>
            <div style={{fontSize:11,fontWeight:700,color:BLUE,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>SSLVault customers</div>
            SSLVault's persistent VPS agent and DNS auto-renew already handle automated renewal at any validity period. Enable auto-renew on your certificates now to be compliant before March 2026 — and ready for 47 days by 2029.
          </div>
        </div>
      )}

      {/* ── TAB: TIMELINE ── */}
      {tab==='timeline'&&(
        <div className="full-content">
          <div style={{marginBottom:16}}>
            <div style={{fontSize:20,fontWeight:700,color:'#111',marginBottom:6}}>PKI history timeline</div>
            <div style={{fontSize:13,color:'#555',marginBottom:14}}>20 years of CA/Browser Forum — every landmark ballot, distrust event, and milestone.</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[['All','All'],['milestone','Milestones'],['incident','Incidents'],['ballot','Ballots'],['enforcement','Enforcement']].map(([v,l])=>(
                <button key={v} className={`cabf-chip${tlFilter===v?' on':''}`} onClick={()=>setTlFilter(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,padding:'8px 16px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
            {filteredTL.map(e=>(
              <div key={e.year+e.event} className="tl-item">
                <div className="tl-year">{e.year}</div>
                <div className="tl-dot" style={{background:tlColor(e.type)}}/>
                <div style={{flex:1}}>
                  <div className="tl-event">{e.event}</div>
                  <div className="tl-desc">{e.desc}</div>
                  {e.tags&&<div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:5}}>{e.tags.map(t=><span key={t} style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'rgba(0,0,0,.05)',color:'#666',border:'1px solid rgba(0,0,0,.08)'}}>{t}</span>)}</div>}
                </div>
                <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:e.type==='incident'?'rgba(231,76,60,.08)':e.type==='ballot'?'rgba(0,165,80,.08)':e.type==='enforcement'?'rgba(243,156,18,.08)':'rgba(0,119,182,.08)',color:tlColor(e.type),alignSelf:'flex-start',flexShrink:0,marginLeft:8}}>{e.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: WORKING GROUPS ── */}
      {tab==='workinggroups'&&(
        <div className="full-content">
          <div style={{marginBottom:20}}>
            <div style={{fontSize:20,fontWeight:700,color:'#111',marginBottom:6}}>Working groups</div>
            <div style={{fontSize:13,color:'#555'}}>Five specialised groups govern different aspects of publicly-trusted certificates. Each produces its own Baseline Requirements.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(480px,1fr))',gap:12}}>
            {WORKING_GROUPS.map(wg=>(
              <div key={wg.id} className={`wg-card${selectedWG?.id===wg.id?' sel':''}`} onClick={()=>setSelectedWG(selectedWG?.id===wg.id?null:wg)}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div className="wg-badge" style={{background:wg.color}}>{wg.short}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:4}}>{wg.name}</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.65}}>{wg.desc}</div>
                  </div>
                </div>
                <div className="wg-meta">
                  {[['Chair',`${wg.chair} · ${wg.chairOrg}`],['Vice Chair',`${wg.vchair}${wg.vchairOrg?' · '+wg.vchairOrg:''}`],['Latest standard',wg.latestBR],['Latest ballot',wg.latestBallot],['Members',wg.members+'+'],['Ballot prefix',wg.ballotPrefix+'-xxx']].map(([k,v])=>(
                    <div key={k}><div className="wm-k">{k}</div><div className="wm-v" style={{fontFamily:k==='Latest standard'||k==='Latest ballot'||k==='Ballot prefix'?MONO:'inherit',fontSize:k==='Latest standard'||k==='Latest ballot'||k==='Ballot prefix'?11:12,color:k==='Latest standard'?'#00a550':'#111'}}>{v}</div></div>
                  ))}
                </div>
                {selectedWG?.id===wg.id&&(
                  <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f0f0f0'}}>
                    <a href={wg.docs} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:BLUE,textDecoration:'none',background:'rgba(0,119,182,.08)',border:'1px solid rgba(0,119,182,.2)',borderRadius:8,padding:'7px 14px'}}>View on CAB Forum ↗</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: MEMBERS ── */}
      {tab==='members'&&(
        <div className="full-content">
          <div style={{marginBottom:20}}>
            <div style={{fontSize:20,fontWeight:700,color:'#111',marginBottom:6}}>CAB Forum members</div>
            <div style={{fontSize:13,color:'#555'}}>Certificate Authorities, Certificate Consumers, Associates and Interested Parties shaping global PKI standards.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:12}}>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',background:'#fafbfc',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#111'}}>Certification Authorities</div>
                <span className="pill" style={{background:'rgba(0,119,182,.08)',color:BLUE,border:`1px solid rgba(0,119,182,.2)`}}>{CA_MEMBERS.length} CAs</span>
              </div>
              <div style={{padding:14,display:'flex',flexWrap:'wrap',gap:5}}>
                {CA_MEMBERS.map(m=><span key={m} style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'#f5f5f5',border:'1px solid rgba(0,0,0,.08)',color:'#444',cursor:'default'}}>{m}</span>)}
              </div>
            </div>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',background:'#fafbfc',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#111'}}>Certificate Consumers</div>
                <span className="pill" style={{background:'rgba(0,165,80,.1)',color:'#00a550',border:'1px solid rgba(0,165,80,.2)'}}>{BROWSER_MEMBERS.length} browsers</span>
              </div>
              <div style={{padding:14}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
                  {BROWSER_MEMBERS.map(m=><span key={m} style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'rgba(0,165,80,.08)',border:'1px solid rgba(0,165,80,.15)',color:'#00a550',cursor:'default'}}>{m}</span>)}
                </div>
                <div style={{background:'rgba(0,119,182,.06)',border:'1px solid rgba(0,119,182,.15)',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#444',lineHeight:1.7}}>Certificate consumers (browsers) have equal voting rights to CAs on all ballots. A ballot requires majority approval from both groups to pass.</div>
              </div>
            </div>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',background:'#fafbfc'}}><div style={{fontSize:13,fontWeight:700,color:'#111'}}>Associates & Interested Parties</div></div>
              <div style={{padding:14}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
                  {['ACAB Council','CPA Canada/WebTrust','ETSI','Keyfactor','US FPKIMA','KPMG','Deloitte','Cloudflare','EFF','ICANN','Netflix','Akamai'].map(m=><span key={m} style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'#f5f5f5',border:'1px solid rgba(0,0,0,.08)',color:'#444',cursor:'default'}}>{m}</span>)}
                </div>
                <div style={{fontSize:11,color:'#666',lineHeight:1.7}}>Associates and Interested Parties participate in discussions and may propose ballots, but do not have voting rights.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
