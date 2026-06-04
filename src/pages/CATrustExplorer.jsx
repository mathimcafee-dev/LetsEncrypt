import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const SYNC_FN = `${SUPABASE_URL}/functions/v1/ccadb-sync`
const PAGE_SIZE = 10000
const MONO = "'JetBrains Mono',monospace"
const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const BLUE = '#0077b6'
const DARK = '#005a8a'

const ALL_STORES = ['Chrome','Mozilla','Apple','Microsoft']

const avatarColor = (name='') => {
  const colors = [DARK,'#1b5e20','#4a148c','#b71c1c','#00695c','#1a237e','#37474f','#0d47a1']
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffffffff
  return colors[Math.abs(h)%colors.length]
}
const initials = (name='') => {
  const w=name.replace(/[^a-zA-Z\s]/g,'').trim().split(/\s+/)
  if(w.length>=2) return (w[0][0]+w[w.length-1][0]).toUpperCase()
  return name.slice(0,2).toUpperCase()
}
const fmtDate = iso => { if(!iso) return '—'; try { return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) } catch { return iso } }

function computeScore(cert) {
  if(!cert) return null
  let s=100
  const sig=(cert.signature_hash_algorithm||'').toLowerCase()
  const status=cert.status||''
  const validTo=cert.valid_to?new Date(cert.valid_to):null
  const now=new Date()
  if(sig.includes('sha1')||sig.includes('md5')) s-=40
  const bits=parseInt((cert.public_key_size||'0').replace(/[^0-9]/g,''))
  if(bits>0&&bits<2048) s-=30
  if(status==='Revoked'||status==='Distrusted') s-=60
  if(validTo){ const days=(validTo-now)/86400000; if(days<0) s-=30; else if(days<90) s-=15; else if(days<365) s-=5 }
  if(!(cert.mozilla_trusted||cert.microsoft_trusted||cert.apple_trusted||cert.chrome_trusted)) s-=10
  return Math.max(0,Math.min(100,s))
}
function computeCryptoScore(cert) {
  if(!cert) return 0
  const sig=(cert.signature_hash_algorithm||'').toLowerCase()
  if(sig.includes('sha1')||sig.includes('md5')) return 20
  const bits=parseInt((cert.public_key_size||'0').replace(/[^0-9]/g,''))
  if(bits>0&&bits<2048) return 40
  return 95
}
function computeBRScore(cert) {
  if(!cert) return 0
  if(cert.status==='Distrusted') return 10
  if(cert.status==='Revoked') return 20
  return 96
}
const scoreColor = n => n==null?'#888':n>=80?'#00a550':n>=50?'#f39c12':'#e74c3c'

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function CATrustExplorer({ nav }) {
  const isMobile = useIsMobile()
  const [certs, setCerts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncedAt, setSyncedAt] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [pemDownloading, setPemDownloading] = useState(false)
  const [popularCAs, setPopularCAs] = useState([])
  const searchRef = useRef(null)

  const loadCerts = useCallback(async () => {
    setLoading(true)
    try {
      const { count } = await supabase.from('ca_certificates').select('*',{count:'exact',head:true})
      setTotalCount(count||0)
      const { data: syncRow } = await supabase.from('ca_sync_log').select('synced_at').order('synced_at',{ascending:false}).limit(1).maybeSingle()
      if(syncRow?.synced_at) setSyncedAt(syncRow.synced_at)
      const { data } = await supabase.from('ca_certificates')
        .select('id,ca_owner,common_name,cert_type,status,key_algorithm,public_key_size,signature_hash_algorithm,valid_from,valid_to,sha256_fingerprint,country,mozilla_trusted,microsoft_trusted,apple_trusted,chrome_trusted,ev_capable,pem_info,ccadb_record_id')
        .order('ca_owner',{ascending:true}).limit(PAGE_SIZE)
      setCerts(data||[]); setFiltered(data||[])
      if(data?.length) setSelected(data[0])
      const ownerMap=new Map()
      for(const cert of (data||[])){
        if(cert.cert_type!=='Root CA'||cert.status!=='Active') continue
        const owner=cert.ca_owner||''
        const stores=[cert.chrome_trusted,cert.mozilla_trusted,cert.apple_trusted,cert.microsoft_trusted].filter(Boolean).length
        if(!ownerMap.has(owner)||stores>ownerMap.get(owner).stores) ownerMap.set(owner,{...cert,stores})
      }
      setPopularCAs(Array.from(ownerMap.values()).sort((a,b)=>b.stores-a.stores||a.ca_owner.localeCompare(b.ca_owner)).slice(0,18))
    } catch(e){ console.error(e) } finally { setLoading(false) }
  },[])

  useEffect(()=>{ loadCerts() },[loadCerts])

  const applyFilter = useCallback(async (tab,q) => {
    setLoading(true)
    try {
      let qb=supabase.from('ca_certificates').select('id,ca_owner,common_name,cert_type,status,key_algorithm,public_key_size,signature_hash_algorithm,valid_from,valid_to,sha256_fingerprint,country,mozilla_trusted,microsoft_trusted,apple_trusted,chrome_trusted,ev_capable,pem_info,ccadb_record_id').limit(PAGE_SIZE)
      if(q) qb=qb.or(`common_name.ilike.%${q}%,ca_owner.ilike.%${q}%,sha256_fingerprint.ilike.%${q}%`)
      if(tab==='root') qb=qb.eq('cert_type','Root CA')
      else if(tab==='inter') qb=qb.neq('cert_type','Root CA')
      else if(tab==='tls') qb=qb.eq('cert_type','Root CA').or('chrome_trusted.eq.true,mozilla_trusted.eq.true,apple_trusted.eq.true,microsoft_trusted.eq.true')
      else if(tab==='all4') qb=qb.eq('chrome_trusted',true).eq('mozilla_trusted',true).eq('apple_trusted',true).eq('microsoft_trusted',true)
      else if(tab==='ev') qb=qb.eq('ev_capable',true).eq('cert_type','Root CA')
      else if(tab==='expiring') qb=qb.eq('status','Expiring')
      else if(tab==='distrust') qb=qb.eq('status','Distrusted')
      qb=qb.order('ca_owner',{ascending:true})
      const { data } = await qb
      setFiltered(data||[])
      if(data?.length) setSelected(data[0])
    } catch(e){ console.error(e) } finally { setLoading(false) }
  },[])

  const handleSearch = useCallback((v)=>{ setQuery(v); applyFilter(activeTab,v) },[activeTab,applyFilter])
  const handleTab = useCallback((tab)=>{ setActiveTab(tab); applyFilter(tab,query) },[query,applyFilter])

  const triggerSync = async () => {
    setSyncing(true); setSyncMsg('Fetching CCADB data…')
    try {
      const { data:{session} } = await supabase.auth.getSession()
      const res = await fetch(SYNC_FN,{method:'POST',headers:{'Authorization':`Bearer ${session?.access_token}`,'Content-Type':'application/json'}})
      const json = await res.json()
      setSyncMsg(json.message||'Sync complete'); await loadCerts()
    } catch(e){ setSyncMsg('Sync failed — '+e.message) }
    setSyncing(false); setTimeout(()=>setSyncMsg(''),4000)
  }

  const copyText = (text) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1800) }

  const counts = {
    all: certs.length,
    root: certs.filter(c=>c.cert_type==='Root CA').length,
    inter: certs.filter(c=>c.cert_type!=='Root CA').length,
    tls: certs.filter(c=>c.cert_type==='Root CA'&&(c.chrome_trusted||c.mozilla_trusted||c.apple_trusted||c.microsoft_trusted)).length,
    all4: certs.filter(c=>c.chrome_trusted&&c.mozilla_trusted&&c.apple_trusted&&c.microsoft_trusted).length,
    ev: certs.filter(c=>c.ev_capable&&c.cert_type==='Root CA').length,
    expiring: certs.filter(c=>c.status==='Expiring').length,
    distrust: certs.filter(c=>c.status==='Distrusted').length,
  }

  const score = selected ? computeScore(selected) : null

  const syncAge = syncedAt ? (()=>{
    const h=Math.round((Date.now()-new Date(syncedAt))/3600000)
    return h<1?'just now':h<24?`${h}h ago`:`${Math.round(h/24)}d ago`
  })() : 'never'

  const P = isMobile ? '16px' : '24px'

  const exportCSV = () => {
    if(!filtered.length) return
    const headers=['Common Name','Owner','Country','Status','Algorithm','Key Size','Valid From','Valid To']
    const rows=filtered.map(c=>[c.common_name||'',c.ca_owner||'',c.country||'',c.status||'',c.key_algorithm||'',c.public_key_size||'',c.valid_from||'',c.valid_to||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))
    const csv=[headers.join(','),...rows].join('\n')
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='ca-trust-store.csv'; a.click()
  }

  return (
    <div style={{fontFamily:FONT,background:'#f8f9fa',minHeight:'100vh'}}>
      <style>{`
        .cat-hero{background:${BLUE};padding:36px ${P} 0;color:#fff}
        .cat-hero-grid{display:grid;grid-template-columns:${isMobile?'1fr':'1fr 1fr'};gap:24px;align-items:start}
        .cat-eyebrow{font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:8px}
        .cat-h1{font-size:${isMobile?'22px':'28px'};font-weight:600;line-height:1.2;margin-bottom:10px;color:#fff}
        .cat-h1 span{color:#3dbfb0}
        .cat-sub{font-size:13px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:20px}
        .cat-stats{display:flex;gap:${isMobile?'14px':'28px'};flex-wrap:wrap;margin-bottom:0}
        .cat-sn{font-size:${isMobile?'18px':'22px'};font-weight:600;color:#fff;line-height:1}
        .cat-sl{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
        .cat-strip{background:rgba(0,0,0,.15);margin:24px -${P} 0;padding:10px ${P};display:flex;align-items:center;gap:16px;border-top:0.5px solid rgba(255,255,255,.1);flex-wrap:wrap}
        .cat-tag{font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.06em;font-family:${MONO};white-space:nowrap}
        .cat-sync-bar{background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:8px ${P};display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#666;gap:12px;flex-wrap:wrap;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .cat-tabs{background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:0 ${P};display:flex;gap:0;overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06)}
        .cat-tabs::-webkit-scrollbar{display:none}
        .cat-tab{background:none;border:none;border-bottom:2px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:#666;padding:12px 4px 11px;margin-right:20px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:color .12s;flex-shrink:0}
        .cat-tab:hover{color:#111}
        .cat-tab.on{color:${BLUE};border-bottom-color:${BLUE}}
        .cat-cnt{font-size:11px;background:#f0f4fa;border-radius:20px;padding:1px 7px;color:#666}
        .cat-tab.on .cat-cnt{background:${BLUE};color:#fff}
        .cat-main{padding:${P};max-width:1400px;margin:0 auto}
        .popular-strip{margin-bottom:18px}
        .popular-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
        .popular-grid{display:flex;gap:7px;flex-wrap:wrap}
        .popular-btn{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer;font-family:${FONT};transition:all .12s;box-shadow:0 1px 2px rgba(0,0,0,.04)}
        .popular-btn:hover{border-color:rgba(0,119,182,.3);box-shadow:0 2px 8px rgba(0,119,182,.08)}
        .popular-btn.sel{border-color:${BLUE};background:rgba(0,119,182,.05);box-shadow:0 0 0 2px rgba(0,119,182,.12)}
        .split-grid{display:grid;grid-template-columns:${isMobile?'1fr':'320px 1fr'};gap:14px;align-items:start}
        .list-panel{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .list-search{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f0f0;background:#fafbfc}
        .list-search input{flex:1;border:none;outline:none;background:transparent;font-family:${FONT};font-size:13px;color:#111}
        .list-search input::placeholder{color:#aaa}
        .cert-list{max-height:560px;overflow-y:auto}
        .cert-list::-webkit-scrollbar{width:4px}
        .cert-list::-webkit-scrollbar-thumb{background:rgba(0,0,0,.06);border-radius:2px}
        .cert-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #f5f5f5;cursor:pointer;transition:background .1s;position:relative}
        .cert-row:last-child{border-bottom:none}
        .cert-row:hover{background:#f8fafc}
        .cert-row.sel{background:rgba(0,119,182,.04)}
        .cert-row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0}
        .cert-row.s-active::before{background:#00a550}
        .cert-row.s-revoked::before,.cert-row.s-distrusted::before{background:#e74c3c}
        .cert-row.s-expiring::before{background:#f39c12}
        .row-name{font-size:12px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
        .row-meta{font-size:11px;color:#888;display:flex;gap:6px;align-items:center}
        .avatar{border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
        .detail-panel{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .dp-topbar{background:${BLUE};padding:14px 18px;display:flex;align-items:flex-start;gap:14px}
        .dp-name{font-size:15px;font-weight:600;color:#fff;line-height:1.3;flex:1}
        .dp-owner{font-size:11px;color:rgba(255,255,255,.6);margin-top:3px}
        .dp-actions{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap}
        .dp-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:7px;font-family:${FONT};font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;white-space:nowrap}
        .dp-btn-ghost{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff}
        .dp-btn-ghost:hover{background:rgba(255,255,255,.25)}
        .dp-btn-solid{background:#fff;border:1px solid rgba(255,255,255,.3);color:${BLUE}}
        .dp-btn-solid:hover{background:rgba(255,255,255,.9)}
        .dp-body{padding:18px;max-height:520px;overflow-y:auto}
        .dp-body::-webkit-scrollbar{width:4px}
        .dp-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.06);border-radius:2px}
        .score-row{display:flex;align-items:center;gap:16px;background:#f8fafc;border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:14px 16px;margin-bottom:18px}
        .score-circle{width:56px;height:56px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;font-family:${MONO}}
        .score-n{font-size:20px;font-weight:700;line-height:1}
        .score-sub{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-top:1px}
        .sbars{flex:1}
        .sbar{display:flex;align-items:center;gap:8px;margin-bottom:5px}
        .sbar:last-child{margin-bottom:0}
        .sbar-l{font-size:10px;color:#888;min-width:90px}
        .sbar-track{flex:1;height:4px;background:#f0f0f0;border-radius:100px;overflow:hidden}
        .sbar-fill{height:100%;border-radius:100px;transition:width .4s}
        .sbar-n{font-size:10px;color:#888;min-width:24px;text-align:right;font-family:${MONO}}
        .section-hd{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 10px;padding-bottom:8px;border-bottom:1px solid #f0f0f0}
        .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
        .field-cell{padding:8px 0;border-bottom:1px solid #f8f8f8}
        .field-cell:nth-last-child(-n+2){border-bottom:none}
        .fk{font-size:10px;color:#888;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
        .fv{font-size:12px;color:#111;font-weight:500}
        .fv.mono{font-family:${MONO};font-size:10px;color:#555;word-break:break-all;font-weight:400}
        .fv.ok{color:#00a550}
        .fv.warn{color:#f39c12}
        .fv.bad{color:#e74c3c}
        .fp-box{font-family:${MONO};font-size:10px;color:#555;line-height:1.7;background:#f8f9fa;border:1px solid rgba(0,0,0,.06);border-radius:8px;padding:10px 12px;word-break:break-all;cursor:pointer;transition:border-color .12s}
        .fp-box:hover{border-color:rgba(0,119,182,.3)}
        .store-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .store-card{border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;background:#fafbfc}
        .store-card.trusted{border-color:rgba(0,165,80,.25);background:rgba(0,165,80,.06)}
        .store-card.distrusted{border-color:rgba(231,76,60,.25);background:rgba(231,76,60,.06)}
        .store-nm{font-size:12px;font-weight:600;color:#111}
        .store-st{font-size:11px;margin-top:2px}
        .store-st.ok{color:#00a550}
        .store-st.no{color:#aaa}
        .store-st.bad{color:#e74c3c}
        .chain-item{display:flex;gap:10px;margin-bottom:4px}
        .chain-line{display:flex;flex-direction:column;align-items:center;width:18px;flex-shrink:0}
        .chain-dot{width:10px;height:10px;border-radius:50%;border:2px solid #00a550;background:#fff;margin-top:4px;flex-shrink:0}
        .chain-dot.filled{background:#00a550}
        .chain-dot.grey{border-color:#ccc}
        .chain-vline{width:1px;background:#e0e0e0;flex:1;min-height:16px;margin:2px 0}
        .chain-card{flex:1;background:#fafbfc;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:10px 12px;margin-bottom:8px}
        .chain-card.focus{border-color:rgba(0,119,182,.25);background:rgba(0,119,182,.04)}
        .intel-strip{border-top:1px solid #f0f0f0;padding:14px 18px;background:#fafbfc}
        .intel-title{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
        .intel-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
        .intel-row::-webkit-scrollbar{height:3px}
        .intel-card{background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:9px 12px;flex-shrink:0;min-width:110px}
        .intel-card.good{border-color:rgba(0,165,80,.25);background:rgba(0,165,80,.06)}
        .intel-card.warn{border-color:rgba(243,156,18,.25);background:rgba(243,156,18,.06)}
        .intel-card.bad{border-color:rgba(231,76,60,.25);background:rgba(231,76,60,.06)}
        .ic-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
        .ic-val{font-size:12px;font-weight:600;color:#111}
        .intel-card.good .ic-val{color:#00a550}
        .intel-card.warn .ic-val{color:#f39c12}
        .intel-card.bad .ic-val{color:#e74c3c}
        .empty-panel{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center}
        .callout-bad{background:rgba(231,76,60,.06);border:1px solid rgba(231,76,60,.2);border-left:3px solid #e74c3c;border-radius:0 8px 8px 0;padding:10px 14px;font-size:12px;color:#c0392b;margin-bottom:14px}
        .callout-warn{background:rgba(243,156,18,.06);border:1px solid rgba(243,156,18,.2);border-left:3px solid #f39c12;border-radius:0 8px 8px 0;padding:10px 14px;font-size:12px;color:#e67e22;margin-bottom:14px}
        .pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}
        .loading-row{height:12px;background:linear-gradient(90deg,#f0f0f0 25%,#f8f8f8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px;margin:10px 14px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:768px){.split-grid{grid-template-columns:1fr}.cat-hero-grid{grid-template-columns:1fr}.hero-right-hide{display:none}}
      `}</style>

      {/* ── SYNC BAR ── */}
      <div className="cat-sync-bar">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}}/>
          <span>CCADB data · synced {syncAge} · {totalCount?totalCount.toLocaleString():'—'} certificates indexed</span>
          <span style={{color:'#ccc'}}>·</span>
          <span style={{color:'#888'}}>Mozilla · Apple · Chrome · Microsoft</span>
          {syncMsg&&<span style={{color:'#e67e22',fontWeight:600}}>{syncMsg}</span>}
        </div>
        <div style={{display:'flex',gap:7}}>
          <button onClick={exportCSV} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:6,border:'1px solid rgba(0,0,0,.12)',background:'#fff',color:'#444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button onClick={triggerSync} disabled={syncing} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:6,border:'1px solid rgba(0,0,0,.12)',background:'#fff',color:'#444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {syncing?'Syncing…':'Sync now'}
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="cat-hero">
        <div className="cat-hero-grid">
          <div>
            <div className="cat-eyebrow">SSLVault · CA Trust Store Explorer</div>
            <h1 className="cat-h1">Every trusted CA.<br/><span>One explorer.</span></h1>
            <p className="cat-sub">Every publicly-trusted Root and Intermediate CA, sourced live from CCADB. PKI Trust Score, chain verification, and PEM download for each certificate.</p>
            <div className="cat-stats">
              {[[totalCount||counts.all,'Total certs'],[counts.root,'Root CAs'],[counts.all4,'All 4 stores'],[counts.ev,'EV capable'],[counts.distrust,'Distrusted']].map(([n,l])=>(
                <div key={l}><div className="cat-sn">{typeof n==='number'?n.toLocaleString():n}</div><div className="cat-sl">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="hero-right-hide" style={{paddingTop:8}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{label:'CCADB',title:'Common CA Database',sub:'Apple · Chrome · Mozilla · Microsoft',color:'#00a550'},{label:'CAB Forum',title:'CA/Browser Forum compliance',sub:'Baseline Requirements enforced',color:'#0077b6'},{label:'PQC',title:'Post-quantum ready',sub:'FIPS 203/204/205 tracking',color:'#f39c12'},{label:'OCSP',title:'Revocation infrastructure',sub:'CRL availability mandated',color:'#888'}].map(b=>(
                <div key={b.label} style={{background:'rgba(255,255,255,.1)',border:'0.5px solid rgba(255,255,255,.18)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontSize:9,fontWeight:700,color:b.color,fontFamily:MONO,letterSpacing:'.06em',marginBottom:4}}>{b.label}</div>
                  <div style={{fontSize:12,color:'#fff',fontWeight:600,marginBottom:2}}>{b.title}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.45)'}}>{b.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="cat-strip">
          {['CCADB Live','6,200+ CAs indexed','SHA-256 fingerprints','PKI Trust Score','PEM download','Chain verify','EV tracking','Distrust monitoring'].map(t=>(
            <span key={t} className="cat-tag">{t}</span>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="cat-tabs">
        {[['all','All',totalCount||counts.all],['root','Root CAs',counts.root],['inter','Intermediates',counts.inter],['tls','TLS / HTTPS',counts.tls],['all4','All 4 Stores',counts.all4],['ev','EV Capable',counts.ev],['expiring','Expiring',counts.expiring],['distrust','Distrusted',counts.distrust]].map(([id,label,cnt])=>(
          <button key={id} className={`cat-tab${activeTab===id?' on':''}`} onClick={()=>handleTab(id)}>
            {label} <span className="cat-cnt">{cnt}</span>
          </button>
        ))}
      </div>

      {/* ── MAIN ── */}
      <div className="cat-main">

        {/* Popular CAs */}
        {popularCAs.length>0&&(
          <div className="popular-strip">
            <div className="popular-title">Popular CAs</div>
            <div className="popular-grid">
              {popularCAs.map(c=>(
                <button key={c.id} className={`popular-btn${selected?.id===c.id?' sel':''}`} onClick={()=>setSelected(c)}>
                  <div className="avatar" style={{width:24,height:24,background:avatarColor(c.ca_owner||''),fontSize:9}}>{initials(c.ca_owner||c.common_name||'?')}</div>
                  <span style={{fontSize:12,fontWeight:600,color:selected?.id===c.id?BLUE:'#111'}}>{c.ca_owner?.replace('Inc.','').replace('nv-sa','').trim()||c.common_name}</span>
                  <span style={{display:'flex',gap:3}}>
                    {c.chrome_trusted&&<span style={{width:5,height:5,borderRadius:'50%',background:'#4285f4',display:'block'}} title="Chrome"/>}
                    {c.mozilla_trusted&&<span style={{width:5,height:5,borderRadius:'50%',background:'#ff6611',display:'block'}} title="Mozilla"/>}
                    {c.apple_trusted&&<span style={{width:5,height:5,borderRadius:'50%',background:'#555',display:'block'}} title="Apple"/>}
                    {c.microsoft_trusted&&<span style={{width:5,height:5,borderRadius:'50%',background:'#00a4ef',display:'block'}} title="Microsoft"/>}
                  </span>
                  {c.ev_capable&&<span style={{fontSize:9,fontWeight:700,color:BLUE,background:'rgba(0,119,182,.1)',padding:'1px 5px',borderRadius:4}}>EV</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Split: list + detail */}
        <div className="split-grid">

          {/* LIST */}
          <div className="list-panel">
            <div className="list-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={searchRef} placeholder="Search CA name, owner, fingerprint…" value={query} onChange={e=>handleSearch(e.target.value)}/>
            </div>
            <div style={{padding:'6px 10px',borderBottom:'1px solid #f0f0f0',background:'#fafbfc',fontSize:11,color:'#888'}}>
              {filtered.length.toLocaleString()} certificates
            </div>
            <div className="cert-list">
              {loading?(
                [...Array(10)].map((_,i)=><div key={i} className="loading-row" style={{width:i%2===0?'75%':'55%'}}/>)
              ):filtered.length===0?(
                <div className="empty-panel">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" style={{marginBottom:12}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div style={{fontSize:13,fontWeight:600,color:'#555'}}>No certificates found</div>
                  <div style={{fontSize:12,color:'#aaa',marginTop:4}}>Try a different search or filter</div>
                </div>
              ):filtered.map(c=>{
                const sc=computeScore(c)
                const sClass=c.status==='Active'?'s-active':c.status==='Revoked'?'s-revoked':c.status==='Distrusted'?'s-distrusted':c.status==='Expiring'?'s-expiring':''
                return(
                  <div key={c.id} className={`cert-row ${sClass}${selected?.id===c.id?' sel':''}`} onClick={()=>setSelected(c)}>
                    <div className="avatar" style={{width:30,height:30,background:avatarColor(c.ca_owner||c.common_name||''),fontSize:10}}>{initials(c.ca_owner||c.common_name||'?')}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="row-name">{c.common_name||c.ca_owner}</div>
                      <div className="row-meta">
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:110}}>{c.ca_owner}</span>
                        <span style={{color:'#ccc'}}>·</span>
                        <span className="pill" style={{background:c.cert_type==='Root CA'?'rgba(0,119,182,.08)':'rgba(0,0,0,.05)',color:c.cert_type==='Root CA'?BLUE:'#888',border:`1px solid ${c.cert_type==='Root CA'?'rgba(0,119,182,.2)':'rgba(0,0,0,.08)'}`}}>{c.cert_type==='Root CA'?'Root':'Int.'}</span>
                      </div>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:scoreColor(sc),fontFamily:MONO,flexShrink:0}}>{sc??'—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DETAIL */}
          <div className="detail-panel">
            {selected?(
              <>
                {/* Top bar */}
                <div className="dp-topbar">
                  <div style={{flex:1,minWidth:0}}>
                    <div className="dp-name">{selected.common_name||selected.ca_owner}</div>
                    <div className="dp-owner">{selected.ca_owner}{selected.country?` · ${selected.country}`:''}</div>
                    <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                      <span className="pill" style={{background:selected.cert_type==='Root CA'?'rgba(255,255,255,.2)':'rgba(255,255,255,.12)',color:'#fff',border:'1px solid rgba(255,255,255,.3)'}}>{selected.cert_type||'Unknown'}</span>
                      <span className="pill" style={{background:selected.status==='Active'?'rgba(0,165,80,.25)':selected.status==='Distrusted'?'rgba(231,76,60,.25)':'rgba(243,156,18,.2)',color:'#fff',border:'1px solid rgba(255,255,255,.2)'}}>{selected.status||'—'}</span>
                      {selected.ev_capable&&<span className="pill" style={{background:'rgba(255,255,255,.2)',color:'#fff',border:'1px solid rgba(255,255,255,.3)'}}>EV capable</span>}
                    </div>
                  </div>
                  <div className="dp-actions">
                    <button className="dp-btn dp-btn-ghost" onClick={()=>copyText(selected.sha256_fingerprint||'')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {copied?'Copied!':'SHA-256'}
                    </button>
                    <button className="dp-btn dp-btn-ghost" disabled={pemDownloading} onClick={async()=>{
                      if(!selected?.sha256_fingerprint) return
                      setPemDownloading(true)
                      try {
                        const fname=(selected.common_name||selected.ca_owner||'cert').replace(/[^a-z0-9]/gi,'_')
                        const res=await fetch(`https://frthcwkntciaakqsppss.supabase.co/functions/v1/ccadb-pem?fp=${selected.sha256_fingerprint}&name=${encodeURIComponent(fname)}`)
                        if(!res.ok){alert('PEM not available for this certificate');return}
                        const blob=await res.blob(); const url=URL.createObjectURL(blob)
                        const a=document.createElement('a'); a.href=url; a.download=fname+'.pem'
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                      } catch(e){alert('Download failed: '+e.message)} finally{setPemDownloading(false)}
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {pemDownloading?'Fetching…':'Download PEM'}
                    </button>
                    <button className="dp-btn dp-btn-solid" onClick={()=>{
                      const fp=selected?.sha256_fingerprint
                      window.open(fp?`https://crt.sh/?q=${encodeURIComponent(fp)}`:`https://crt.sh/?q=${encodeURIComponent(selected?.common_name||'')}`, '_blank')
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Verify chain
                    </button>
                  </div>
                </div>

                <div className="dp-body">
                  {/* Callouts */}
                  {selected.status==='Distrusted'&&<div className="callout-bad"><strong>Distrusted by root programs</strong> — certificates from this root may be rejected by modern browsers. Do not deploy.</div>}
                  {selected.status==='Expiring'&&<div className="callout-warn"><strong>Expiring soon</strong> — this certificate's validity period ends within 12 months. Plan migration now.</div>}

                  {/* Score */}
                  <div className="score-row">
                    <div className="score-circle" style={{background:score>=80?'rgba(0,165,80,.1)':score>=50?'rgba(243,156,18,.1)':'rgba(231,76,60,.1)',border:`2px solid ${scoreColor(score)}`}}>
                      <div className="score-n" style={{color:scoreColor(score)}}>{score??'—'}</div>
                      <div className="score-sub">score</div>
                    </div>
                    <div className="sbars">
                      {[['Crypto strength',computeCryptoScore(selected)],['Chain validity',score>=80?100:60],['BR compliance',computeBRScore(selected)],['Revocation',selected.status==='Active'?95:20]].map(([l,v])=>(
                        <div key={l} className="sbar">
                          <div className="sbar-l">{l}</div>
                          <div className="sbar-track"><div className="sbar-fill" style={{width:v+'%',background:v<50?'#e74c3c':v<75?'#f39c12':'#00a550'}}/></div>
                          <div className="sbar-n">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certificate identity */}
                  <div className="section-hd">Certificate identity</div>
                  <div className="field-grid">
                    {[['Common name',selected.common_name,null],['CA owner',selected.ca_owner,null],['Type',selected.cert_type,selected.cert_type==='Root CA'?'ok':''],['Country',selected.country,null],['Key algorithm',selected.key_algorithm,selected.key_algorithm?.toLowerCase().includes('sha1')?'warn':'ok'],['Sig. hash',selected.signature_hash_algorithm,selected.signature_hash_algorithm?.toLowerCase().includes('sha1')?'warn':'ok'],['Valid from',fmtDate(selected.valid_from),null],['Valid to',fmtDate(selected.valid_to),selected.status==='Expiring'?'warn':selected.status==='Expired'?'bad':'']].map(([k,v,cls])=>(
                      <div key={k} className="field-cell"><div className="fk">{k}</div><div className={`fv${cls?' '+cls:''}`}>{v||'—'}</div></div>
                    ))}
                  </div>

                  {/* Fingerprint */}
                  {selected.sha256_fingerprint&&(
                    <>
                      <div className="section-hd">SHA-256 fingerprint</div>
                      <div className="fp-box" onClick={()=>copyText(selected.sha256_fingerprint)} title="Click to copy">{selected.sha256_fingerprint}</div>
                    </>
                  )}

                  {/* Trust stores */}
                  <div className="section-hd">Root store trust</div>
                  <div className="store-grid">
                    {ALL_STORES.map(s=>{
                      const t=selected[`${s.toLowerCase()}_trusted`]
                      const icons={'Chrome':'🌐','Mozilla':'🦊','Apple':'🍎','Microsoft':'🪟'}
                      return(
                        <div key={s} className={`store-card${t&&selected.status!=='Distrusted'?' trusted':selected.status==='Distrusted'&&t?' distrusted':''}`}>
                          <span style={{fontSize:18}}>{icons[s]}</span>
                          <div><div className="store-nm">{s}</div><div className={`store-st ${t&&selected.status!=='Distrusted'?'ok':selected.status==='Distrusted'&&t?'bad':'no'}`}>{t&&selected.status!=='Distrusted'?'Trusted':selected.status==='Distrusted'&&t?'Distrusted':'Not included'}</div></div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Chain */}
                  <div className="section-hd">Trust chain</div>
                  <div>
                    {selected.cert_type!=='Root CA'&&(
                      <div className="chain-item">
                        <div className="chain-line"><div className="chain-dot filled"/><div className="chain-vline"/></div>
                        <div className="chain-card"><div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}><span className="pill" style={{background:'rgba(0,119,182,.08)',color:BLUE,border:`1px solid rgba(0,119,182,.2)`}}>Root CA</span></div><div style={{fontSize:11,color:'#666'}}>Issuing root — {selected.ca_owner}</div></div>
                      </div>
                    )}
                    <div className="chain-item">
                      <div className="chain-line"><div className={`chain-dot${selected.cert_type==='Root CA'?' filled':''}`}/>{selected.cert_type==='Root CA'&&<div className="chain-vline"/>}</div>
                      <div className="chain-card focus">
                        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:6}}>
                          <span className="pill" style={{background:selected.cert_type==='Root CA'?'rgba(0,119,182,.08)':'rgba(0,0,0,.05)',color:selected.cert_type==='Root CA'?BLUE:'#888',border:`1px solid ${selected.cert_type==='Root CA'?'rgba(0,119,182,.2)':'rgba(0,0,0,.08)'}`}}>{selected.cert_type}</span>
                          <span className="pill" style={{background:selected.status==='Active'?'rgba(0,165,80,.08)':'rgba(231,76,60,.08)',color:selected.status==='Active'?'#00a550':'#e74c3c',border:`1px solid ${selected.status==='Active'?'rgba(0,165,80,.2)':'rgba(231,76,60,.2)'}`}}>{selected.status}</span>
                          {selected.ev_capable&&<span className="pill" style={{background:'rgba(243,156,18,.08)',color:'#e67e22',border:'1px solid rgba(243,156,18,.2)'}}>EV</span>}
                        </div>
                        <div style={{fontSize:11,color:'#666'}}>{selected.ca_owner} · {selected.key_algorithm} · {fmtDate(selected.valid_from)} → {fmtDate(selected.valid_to)}</div>
                      </div>
                    </div>
                    {selected.cert_type==='Root CA'&&(
                      <div className="chain-item">
                        <div className="chain-line"><div className="chain-dot grey"/></div>
                        <div className="chain-card" style={{opacity:.5}}><div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}><span className="pill" style={{background:'rgba(0,0,0,.05)',color:'#888',border:'1px solid rgba(0,0,0,.08)'}}>Sub-CAs</span></div><div style={{fontSize:11,color:'#888'}}>Issued intermediates chain to this root</div></div>
                      </div>
                    )}
                  </div>

                  {/* PEM */}
                  {selected.pem_info&&(
                    <>
                      <div className="section-hd">Certificate PEM</div>
                      <div style={{background:'#111',borderRadius:8,overflow:'hidden'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                          <div style={{display:'flex',gap:5}}>{['#e74c3c','#f39c12','#2ecc71'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
                          <button onClick={()=>copyText(selected.pem_info)} style={{background:'none',border:'none',color:'rgba(255,255,255,.5)',fontSize:11,cursor:'pointer',fontFamily:FONT}}>Copy PEM</button>
                        </div>
                        <div style={{padding:'12px',fontFamily:MONO,fontSize:10,color:'#a8b8c8',lineHeight:1.7,wordBreak:'break-all',maxHeight:80,overflow:'hidden',position:'relative'}}>
                          -----BEGIN CERTIFICATE-----<br/>{selected.pem_info}<br/>-----END CERTIFICATE-----
                          <div style={{position:'absolute',bottom:0,left:0,right:0,height:28,background:'linear-gradient(transparent,#111)'}}/>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Intelligence strip */}
                <div className="intel-strip">
                  <div className="intel-title">Intelligence signals</div>
                  <div className="intel-row">
                    {[
                      {l:'Key algorithm',v:selected.key_algorithm||'—',good:!(selected.key_algorithm||'').toLowerCase().includes('dsa')},
                      {l:'Signature hash',v:selected.signature_hash_algorithm||'—',good:!(selected.signature_hash_algorithm||'').toLowerCase().includes('sha1')},
                      {l:'Valid to',v:(()=>{const validTo=selected.valid_to?new Date(selected.valid_to):null;const d=validTo?Math.round((validTo-new Date())/86400000):null;return d!=null?`${d}d left`:fmtDate(selected.valid_to)})(),good:(()=>{const validTo=selected.valid_to?new Date(selected.valid_to):null;const d=validTo?Math.round((validTo-new Date())/86400000):null;return d==null||d>365})(),warn:(()=>{const validTo=selected.valid_to?new Date(selected.valid_to):null;const d=validTo?Math.round((validTo-new Date())/86400000):null;return d!=null&&d<=365&&d>0})()},
                      {l:'Key size',v:selected.public_key_size||'—',good:parseInt((selected.public_key_size||'0'))>=2048},
                      {l:'Status',v:selected.status||'—',good:selected.status==='Active',bad:selected.status==='Revoked'||selected.status==='Distrusted'},
                      {l:'CAB Forum',v:selected.status==='Distrusted'?'Violations':selected.status==='Active'?'Compliant':'Check',good:selected.status==='Active',bad:selected.status==='Distrusted'},
                      {l:'EV capable',v:selected.ev_capable?'Yes':'No',good:!!selected.ev_capable},
                      {l:'47-day ready',v:selected.cert_type!=='Root CA'?'Check CA':'N/A'},
                    ].map(({l,v,good,warn,bad})=>(
                      <div key={l} className={`intel-card${good?' good':warn?' warn':bad?' bad':''}`}>
                        <div className="ic-lbl">{l}</div>
                        <div className="ic-val">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ):(
              <div className="empty-panel">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" style={{marginBottom:14}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <div style={{fontSize:14,fontWeight:600,color:'#555',marginBottom:6}}>Select a certificate</div>
                <div style={{fontSize:12,color:'#aaa'}}>Click any row in the list to inspect its PKI details</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
