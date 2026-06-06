import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PublicNav, PublicFooter } from '../components/PublicLayout'

const MONO = "'JetBrains Mono','JetBrains Mono',monospace"
const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const BLUE = '#0077b6'
const DARK = '#005a8a'

const PQC_ALGORITHMS = [
  { id:'ML-KEM', fips:'FIPS 203', name:'ML-KEM (Kyber)', type:'Key Encapsulation', status:'Final', date:'Aug 2024', desc:'PQC replacement for RSA/ECDH key exchange. Protects the TLS handshake. Fast, efficient, small keys.', fin:true },
  { id:'ML-DSA', fips:'FIPS 204', name:'ML-DSA (Dilithium)', type:'Digital Signature', status:'Final', date:'Aug 2024', desc:'PQC replacement for RSA/ECDSA signatures. Will replace signature algorithms in all X.509 certificates.', fin:true },
  { id:'SLH-DSA', fips:'FIPS 205', name:'SLH-DSA (SPHINCS+)', type:'Signature Backup', status:'Final', date:'Aug 2024', desc:'Hash-based backup algorithm. Different math to ML-DSA — fallback if lattice cryptography is broken.', fin:true },
  { id:'FN-DSA', fips:'FIPS 206 draft', name:'FN-DSA (FALCON)', type:'Digital Signature', status:'Draft', date:'2025', desc:'Fourth NIST PQC algorithm. NTRU-lattice based. Smaller signatures than ML-DSA.', fin:false },
  { id:'HQC', fips:'In process', name:'HQC', type:'KEM Backup', status:'Selected 2025', date:'Selected 2025', desc:'Backup KEM selected by NIST in 2025. Code-based cryptography — different mathematical approach.', fin:false },
]

const PQC_READINESS = [
  { org:'NIST', s:'complete', detail:'FIPS 203/204/205 published Aug 2024. FIPS 206 in draft.' },
  { org:'IETF', s:'active', detail:'LAMPS WG drafting PQC certificate profiles. Hybrid cert RFCs in progress.' },
  { org:'CAB Forum', s:'planning', detail:'No ballot yet. SCWG discussing PQC profiles. Likely 2026–2027.' },
  { org:'ETSI', s:'active', detail:'EN 319 series being updated for PQC. eIDAS 2.0 includes PQC provisions.' },
  { org:'PKI Consortium', s:'complete', detail:'Hosted world\'s largest PQC conferences. Amsterdam 2026 confirmed.' },
]

const GLOBAL_TIMELINE = [
  { year:1865, org:'ITU', event:'ITU founded — oldest UN telecom agency', desc:'Founded in Paris as the International Telegraph Union. Today maintains X.509, the certificate standard all PKI is built on.', type:'milestone' },
  { year:1978, org:'NIST', event:'RSA published — public key cryptography begins', desc:'Rivest, Shamir, Adleman publish RSA. Two parties can exchange encrypted messages without a prior shared secret. The foundation of modern PKI.', type:'milestone' },
  { year:1988, org:'ITU', event:'X.509 v1 published — the certificate format is born', desc:'ITU-T publishes X.509. Defines the certificate structure every TLS, S/MIME, and code signing cert still uses today.', type:'milestone' },
  { year:1999, org:'WebTrust', event:'WebTrust for CAs launched', desc:'First formal CA audit programme. Gives browser vendors an independent assurance mechanism to evaluate CA trustworthiness.', type:'milestone' },
  { year:2001, org:'APKIC', event:'Asia PKI Consortium founded in Hong Kong', desc:'APKIC established to promote PKI adoption and interoperability across Asia/Oceania. Now covers 11+ economies.', type:'milestone' },
  { year:2005, org:'CAB Forum', event:'CA/Browser Forum founded', desc:'Voluntary consortium formed to establish industry standards. First meeting in San Francisco. Initial focus: EV guidelines.', type:'milestone' },
  { year:2011, org:'CAB Forum', event:'DigiNotar breach — CA trust crisis', desc:'Dutch CA DigiNotar compromised. 500+ fraudulent certs for Google, Mozilla and governments. DigiNotar bankrupt. Accelerated BR development.', type:'incident' },
  { year:2012, org:'CAB Forum', event:'Baseline Requirements v1.0 — the constitution of web PKI', desc:'All publicly-trusted TLS certs must comply with the BRs. Governs key size, validity, revocation, DCV, and audit.', type:'milestone' },
  { year:2012, org:'FIDO', event:'FIDO Alliance founded — passwordless authentication begins', desc:'Google, Lenovo, PayPal and others found FIDO. Mission: reduce the world\'s reliance on passwords. Leads to FIDO2/WebAuthn and passkeys.', type:'milestone' },
  { year:2014, org:'eIDAS', event:'eIDAS Regulation — EU digital identity framework', desc:'EU Regulation 910/2014 creates pan-European framework for electronic signatures. Makes qualified e-signatures legally binding across all member states.', type:'milestone' },
  { year:2016, org:'NIST', event:'NIST begins 8-year PQC standardisation project', desc:'NIST releases call for post-quantum algorithms. 69 candidates submitted. 8-year evaluation begins — the biggest crypto transition since RSA.', type:'milestone' },
  { year:2018, org:'CAB Forum', event:'Symantec distrusted by Chrome and Mozilla', desc:'After years of compliance failures, Google and Mozilla removed Symantec roots. DigiCert acquired Symantec PKI business.', type:'incident' },
  { year:2019, org:'IETF', event:'RFC 8555 ACME published — automation standardised', desc:'ACME protocol standardised by IETF. Enables zero-touch certificate management. The standard SSLVault is built on.', type:'milestone' },
  { year:2020, org:'CAB Forum', event:'Apple enforces 398-day validity unilaterally', desc:'A CAB Forum ballot to reduce validity failed. Apple bypassed the Forum and enforced 398-day certs in Safari. All browsers followed.', type:'enforcement' },
  { year:2024, org:'CAB Forum', event:'Entrust distrusted — largest CA distrust event in history', desc:'Chrome and Mozilla remove Entrust after sustained compliance failures. 26M+ active certificates affected.', type:'incident' },
  { year:2024, org:'NIST', event:'FIPS 203/204/205 finalised — PQC era begins', desc:'ML-KEM, ML-DSA, and SLH-DSA finalised. Most significant crypto event since RSA publication in 1978.', type:'milestone' },
  { year:2024, org:'eIDAS', event:'eIDAS 2.0 — EU Digital Identity Wallet', desc:'eIDAS 2.0 published. Introduces EUDIW and mandates browsers trust government-issued QWAC certificates.', type:'milestone' },
  { year:2025, org:'CAB Forum', event:'SC081v3 — the 47-day mandate', desc:'200-day by March 2026, 100-day by March 2027, 47-day by March 2029. Zero-touch automation becomes a legal requirement.', type:'ballot' },
  { year:2025, org:'PKI Consortium', event:'PQC Conference KL — 2500+ delegates', desc:'PKI Consortium hosts record-breaking PQC conference in Kuala Lumpur. Amsterdam 2026 confirmed.', type:'milestone' },
]

const ORGS = [
  { id:'cabf', name:'CA/B Forum', full:'CA/Browser Forum', cat:'Governance', color:'#005a8a', region:'Global', desc:'Sets the Baseline Requirements every publicly-trusted cert must follow. SC081v3 (47-day mandate) is their most impactful ballot since the BRs were published.', members:'60+', founded:'2005', deepdive:'/cab-forum' },
  { id:'etsi', name:'ETSI ESI', full:'European Telecomms Standards Institute', cat:'Standards Body', color:'#0d47a1', region:'Europe', desc:'Drafts EN 319 series — the standards behind eIDAS qualified signatures, TSAs, and EU PKI policy. Updates underway for PQC algorithm support.', members:'900+', founded:'1988' },
  { id:'nist', name:'NIST', full:'National Institute of Standards & Technology', cat:'Standards Body', color:'#1b5e20', region:'Americas', desc:'Finalised FIPS 203/204/205 in Aug 2024 — the three post-quantum algorithms replacing RSA and ECC globally.', members:'Gov agency', founded:'1901', deepdive:'/pki-hub/nist' },
  { id:'ietf', name:'IETF', full:'Internet Engineering Task Force', cat:'Standards Body', color:'#4a148c', region:'Global', desc:'Publishes the RFCs the internet runs on. RFC 8555 (ACME), RFC 5280 (X.509 profiles), TLS 1.3. LAMPS WG drafting PQC certificate profiles.', members:'Open', founded:'1986' },
  { id:'apkic', name:'APKIC', full:'Asia Public Key Infrastructure Consortium', cat:'Regional', color:'#b71c1c', region:'Asia-Pacific', desc:'Pan-Asian PKI body covering 11+ economies. Promotes interoperability for governments and enterprises across South/East Asia. Annual symposium.', members:'11+ economies', founded:'2001', deepdive:'/pki-hub/apkic' },
  { id:'eidas', name:'eIDAS', full:'EU Regulation on Electronic ID and Trust Services', cat:'Regulation', color:'#003399', region:'Europe', desc:'EU law making digital signatures legally binding across all 27 member states. eIDAS 2.0 (2024) introduces the EU Digital Identity Wallet.', members:'EU regulation', founded:'2014', deepdive:'/pki-hub/eidas' },
  { id:'pkic', name:'PKI Consortium', full:'Public Key Infrastructure Consortium', cat:'Governance', color:'#0077b6', region:'Global', desc:'Runs the world\'s biggest PQC conferences — 2500+ delegates in KL 2025. Amsterdam 2026 confirmed. Central gathering for cryptographers planning PQC migration.', members:'Various', founded:'2019', deepdive:'/pki-hub/pkic' },
  { id:'csc', name:'CSC', full:'Cloud Signature Consortium', cat:'Standards Body', color:'#1a237e', region:'Global', desc:'Defined how legally-binding digital signatures work from the cloud without a USB token. Their CSC API is what DocuSign, Adobe Sign, and every cloud signing service implements.', members:'Industry', founded:'2016', deepdive:'/pki-hub/csc' },
  { id:'fido', name:'FIDO Alliance', full:'Fast IDentity Online Alliance', cat:'Governance', color:'#00838f', region:'Global', desc:'Behind passkeys and WebAuthn. FIDO2 hardware keys carry X.509 certificate chains — relevant as enterprises move from client certs to passkeys.', members:'250+', founded:'2012' },
  { id:'webtrust', name:'WebTrust', full:'WebTrust for Certification Authorities', cat:'Audit', color:'#37474f', region:'Global', desc:'The auditing programme every CA must pass to stay in browser root stores. A WebTrust BR seal means an independent auditor verified CA compliance with CAB Forum requirements.', members:'Audit body', founded:'1999' },
  { id:'ccadb', name:'CCADB', full:'Common CA Database', cat:'Standards Body', color:'#00695c', region:'Global', desc:'The shared database Apple, Chrome, Microsoft, and Mozilla use to track which CA certs they trust. 8600+ certificates indexed. SSLVault CA Trust Explorer runs on CCADB data.', members:'Browser coalition', founded:'2016' },
  { id:'itu', name:'ITU-T', full:'International Telecommunication Union', cat:'Standards Body', color:'#6a1b9a', region:'Global', desc:'Invented X.509 in 1988. Every HTTPS cert, S/MIME email, code signing cert and smart card is built on ITU-T X.509 — the grandfather of all modern PKI.', members:'UN body', founded:'1865' },
]

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function GlobalPKIHub({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('orgs')
  const [standards, setStandards] = useState([])
  const [events, setEvents] = useState([])
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [tlFilter, setTlFilter] = useState('All')
  const [selectedOrg, setSelectedOrg] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('pki_standards').select('*').order('published_date', { ascending: false }),
      supabase.from('pki_events').select('*').order('start_date'),
    ]).then(([{ data: s }, { data: e }]) => {
      setStandards(s || [])
      setEvents(e || [])
    })
  }, [])

  const filteredOrgs = useMemo(() => {
    return ORGS.filter(o => {
      if (catFilter !== 'All' && o.cat !== catFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return o.name.toLowerCase().includes(q) || o.full.toLowerCase().includes(q) || o.desc.toLowerCase().includes(q)
      }
      return true
    })
  }, [catFilter, query])

  const filteredTimeline = useMemo(() => {
    return GLOBAL_TIMELINE.filter(e => {
      if (tlFilter !== 'All' && e.type !== tlFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return e.event.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)
      }
      return true
    })
  }, [tlFilter, query])

  const tlColor = t => t==='incident'?'#e74c3c':t==='ballot'?'#00a550':t==='enforcement'?'#f39c12':'rgba(255,255,255,0.5)'
  const scColor = s => s==='complete'?{bg:'rgba(0,165,80,0.12)',c:'#00a550',border:'rgba(0,165,80,0.25)'}:s==='active'?{bg:'rgba(243,156,18,0.12)',c:'#f39c12',border:'rgba(243,156,18,0.25)'}:{bg:'rgba(255,255,255,0.08)',c:'rgba(255,255,255,0.5)',border:'rgba(255,255,255,0.12)'}

  const P = isMobile ? '16px' : '24px'

  return (
    <div style={{ fontFamily: FONT, background: '#f8f9fa', minHeight: '100vh' }}>
      <style>{`
        .hub-hero{background:linear-gradient(160deg,${BLUE} 0%,#006aa3 60%,#005d90 100%);padding:48px ${P} 0;color:#fff}
        .hub-hero-grid{display:grid;grid-template-columns:${isMobile?'1fr':'1fr 1fr'};gap:24px;align-items:start}
        .hub-eyebrow{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;margin-bottom:14px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);border-radius:20px;padding:5px 14px}
        .hub-h1{font-size:${isMobile?'27px':'38px'};font-weight:900;line-height:1.12;margin-bottom:12px;color:#fff;font-family:'DM Sans','Inter',system-ui,sans-serif;letter-spacing:-0.01em}
        .hub-h1 span{color:#a8e0ff}
        .hub-sub{font-size:14.5px;color:rgba(255,255,255,.85);line-height:1.7;margin-bottom:22px}
        .hub-stats{display:flex;gap:${isMobile?'16px':'28px'};flex-wrap:wrap;margin-bottom:28px}
        .hub-sn{font-size:${isMobile?'18px':'22px'};font-weight:600;color:#fff;line-height:1}
        .hub-sl{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
        .hub-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:0.5px solid rgba(255,255,255,.2);border-radius:8px;padding:9px 14px;color:rgba(255,255,255,.55);font-size:13px;margin-bottom:0}
        .hub-search input{background:transparent;border:none;outline:none;color:#fff;font-family:${FONT};font-size:13px;width:100%;::placeholder{color:rgba(255,255,255,.45)}}
        .hub-right-card{background:rgba(255,255,255,.1);border:0.5px solid rgba(255,255,255,.18);border-radius:8px;padding:12px 14px;margin-bottom:8px}
        .hub-live{display:inline-flex;align-items:center;gap:6px;background:rgba(0,165,80,.2);border:0.5px solid rgba(0,165,80,.35);border-radius:20px;padding:4px 10px;font-size:11px;color:#2ecc71;margin-bottom:14px}
        .hub-bottom-strip{background:rgba(0,0,0,.15);margin:24px -${P} 0;padding:10px ${P};display:flex;align-items:center;gap:16px;border-top:0.5px solid rgba(255,255,255,.1);flex-wrap:wrap}
        .hub-strip-tag{font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.06em;font-family:${MONO};white-space:nowrap}
        .hub-tabs{background:#fff;border-bottom:1px solid rgba(0,0,0,.08);padding:0 ${P};display:flex;gap:0;overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06)}
        .hub-tabs::-webkit-scrollbar{display:none}
        .hub-tab{background:none;border:none;border-bottom:2px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:#666;padding:12px 4px 11px;margin-right:20px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:color .12s;flex-shrink:0}
        .hub-tab:hover{color:#111}
        .hub-tab.on{color:${BLUE};border-bottom-color:${BLUE}}
        .hub-cnt{font-size:11px;background:#f0f4fa;border-radius:20px;padding:1px 7px;color:#666}
        .hub-tab.on .hub-cnt{background:${BLUE};color:#fff}
        .hub-main{padding:${P};max-width:1200px;margin:0 auto}
        .hub-filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
        .hub-chip{font-size:11px;padding:5px 12px;border-radius:20px;border:1px solid rgba(0,0,0,.1);background:#fff;color:#555;cursor:pointer;font-family:${FONT};transition:all .12s}
        .hub-chip:hover{border-color:${BLUE};color:${BLUE}}
        .hub-chip.on{background:${BLUE};color:#fff;border-color:${BLUE}}
        .org-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:16px}
        .org-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:16px;cursor:pointer;transition:all .12s;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .org-card:hover{border-color:rgba(0,119,182,.3);box-shadow:0 3px 12px rgba(0,119,182,.1);transform:translateY(-1px)}
        .org-card.sel{border-color:${BLUE};box-shadow:0 0 0 3px rgba(0,119,182,.1)}
        .org-badge{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
        .org-name{font-size:14px;font-weight:600;color:#111}
        .org-full{font-size:11px;color:#666;line-height:1.4;margin-top:1px}
        .org-desc{font-size:12px;color:#444;line-height:1.65;border-top:1px solid #f0f0f0;padding-top:10px}
        .detail-panel{background:rgba(0,119,182,.04);border:1px solid rgba(0,119,182,.2);border-radius:12px;padding:20px;margin-bottom:16px}
        .spec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px}
        .spec-item{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:8px;padding:10px 12px}
        .spec-k{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
        .spec-v{font-size:13px;font-weight:600;color:#111}
        .tl-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0}
        .tl-item:last-child{border-bottom:none}
        .tl-year{font-size:12px;font-weight:600;color:#888;min-width:38px;font-family:${MONO}}
        .tl-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
        .tl-event{font-size:12px;font-weight:600;color:#111;margin-bottom:3px;line-height:1.4}
        .tl-desc{font-size:11.5px;color:#555;line-height:1.65}
        .pqc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:16px}
        .pqc-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .pqc-fips{font-size:10px;font-family:${MONO};color:#888;margin-bottom:4px}
        .pqc-name{font-size:13px;font-weight:600;color:#111;margin-bottom:3px}
        .pqc-type{font-size:11px;color:#666;margin-bottom:10px}
        .section-label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
        .readiness-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0}
        .readiness-row:last-child{border-bottom:none}
        .deep-btn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${BLUE};background:rgba(0,119,182,.08);border:1px solid rgba(0,119,182,.2);border-radius:8px;padding:7px 14px;cursor:pointer;font-family:${FONT};transition:all .12s}
        .deep-btn:hover{background:rgba(0,119,182,.15)}
        .close-btn{background:none;border:1px solid rgba(0,0,0,.1);border-radius:6px;padding:5px 10px;font-size:12px;color:#666;cursor:pointer;font-family:${FONT}}
        .pqc-status-pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;display:inline-block}
        @media(max-width:768px){.hub-hero-grid{grid-template-columns:1fr}.hub-right-hide{display:none}}
      `}</style>

      <PublicNav nav={nav}/>

      {/* ── HERO ── */}
      <div className="hub-hero">
        <div className="hub-hero-grid">
          <div>
            <div className="hub-eyebrow">SSLVault · Global PKI Intelligence Hub</div>
            <h1 className="hub-h1">Every PKI body.<br/><span>One place.</span></h1>
            <p className="hub-sub">12 governing bodies · 22 standards · Real-time event feed · PQC migration tracker</p>
            <div className="hub-stats">
              {[['12','PKI bodies'],['22','Standards'],['47d','2029 mandate'],['3','NIST PQC finals']].map(([n,l])=>(
                <div key={l}><div className="hub-sn">{n}</div><div className="hub-sl">{l}</div></div>
              ))}
            </div>
            <div className="hub-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search orgs, standards, RFCs…" value={query} onChange={e=>setQuery(e.target.value)}/>
            </div>
          </div>
          <div className="hub-right-hide">
            <div className="hub-live">
              <div style={{width:6,height:6,borderRadius:'50%',background:'#2ecc71'}}/>
              Live intel feed
            </div>
            <div className="hub-right-card">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:30,height:30,borderRadius:6,background:DARK,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>CAB</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#fff',fontWeight:500}}>SC081v3 in effect</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>200-day max · March 2026</div>
                </div>
                <span style={{fontSize:10,color:'#e74c3c',fontWeight:600}}>● LIVE</span>
              </div>
            </div>
            <div className="hub-right-card">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:30,height:30,borderRadius:6,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>NIST</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#fff',fontWeight:500}}>FIPS 203/204/205 final</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>PQC era — Aug 2024</div>
                </div>
                <span style={{fontSize:10,color:'#2ecc71',fontWeight:600}}>● Done</span>
              </div>
            </div>
            <div style={{background:'rgba(255,200,0,.1)',border:'0.5px solid rgba(255,200,0,.25)',borderRadius:8,padding:'10px 14px',fontSize:11,color:'rgba(255,220,80,.9)',display:'flex',alignItems:'center',gap:8,marginTop:8}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              Amsterdam PQC Conference 2026 — next major event
            </div>
          </div>
        </div>
        <div className="hub-bottom-strip">
          {['RFC 8555','AES-256-GCM','CA/B Forum 2026','DNS-01','PQC Ready','CCADB Indexed','eIDAS 2.0','NIST FIPS 203/204/205'].map(t=>(
            <span key={t} className="hub-strip-tag">{t}</span>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="hub-tabs">
        {[
          {id:'orgs',label:'Organisations',cnt:ORGS.length},
          {id:'pqc',label:'PQC tracker',cnt:PQC_ALGORITHMS.length},
          {id:'timeline',label:'History',cnt:GLOBAL_TIMELINE.length},
          {id:'standards',label:'Standards',cnt:standards.length||22},
        ].map(t=>(
          <button key={t.id} className={`hub-tab${tab===t.id?' on':''}`} onClick={()=>{setTab(t.id);setSelectedOrg(null)}}>
            {t.label} <span className="hub-cnt">{t.cnt}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: ORGANISATIONS ── */}
      {tab==='orgs'&&(
        <div className="hub-main">
          <div className="hub-filter-row">
            {['All','Governance','Standards Body','Regional','Regulation','Audit'].map(c=>(
              <button key={c} className={`hub-chip${catFilter===c?' on':''}`} onClick={()=>setCatFilter(c)}>{c}</button>
            ))}
          </div>
          {selectedOrg&&(
            <div className="detail-panel">
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:14}}>
                <div className="org-badge" style={{background:selectedOrg.color,width:46,height:46,fontSize:11}}>{selectedOrg.id.slice(0,4).toUpperCase()}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:700,color:'#111',marginBottom:3}}>{selectedOrg.full}</div>
                  <div style={{fontSize:12,color:'#666'}}>{selectedOrg.cat} · {selectedOrg.region} · Founded {selectedOrg.founded}</div>
                </div>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  {selectedOrg.deepdive&&<button className="deep-btn" onClick={()=>nav(selectedOrg.deepdive)}>Deep dive →</button>}
                  <button className="close-btn" onClick={()=>setSelectedOrg(null)}>✕</button>
                </div>
              </div>
              <div className="spec-grid">
                {[['Category',selectedOrg.cat],['Region',selectedOrg.region],['Members',selectedOrg.members],['Founded',selectedOrg.founded]].map(([k,v])=>(
                  <div key={k} className="spec-item"><div className="spec-k">{k}</div><div className="spec-v">{v}</div></div>
                ))}
              </div>
              <p style={{fontSize:13,color:'#444',lineHeight:1.7}}>{selectedOrg.desc}</p>
            </div>
          )}
          <div className="org-grid">
            {filteredOrgs.map(o=>(
              <div key={o.id} className={`org-card${selectedOrg?.id===o.id?' sel':''}`} onClick={()=>setSelectedOrg(selectedOrg?.id===o.id?null:o)}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div className="org-badge" style={{background:o.color}}>{o.id.slice(0,4).toUpperCase()}</div>
                  <div style={{flex:1}}><div className="org-name">{o.name}</div><div className="org-full">{o.full}</div></div>
                </div>
                <div className="org-desc">{o.desc}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:4}}>
                  <span style={{fontSize:10,color:'#888'}}>{o.region}</span>
                  <span style={{fontSize:10,fontWeight:600,background:'rgba(0,165,80,.1)',color:'#00a550',padding:'2px 8px',borderRadius:20}}>● Active</span>
                </div>
              </div>
            ))}
          </div>
          {filteredOrgs.length===0&&<div style={{textAlign:'center',padding:40,color:'#888',fontSize:13}}>No organisations match your search.</div>}
        </div>
      )}

      {/* ── TAB: PQC TRACKER ── */}
      {tab==='pqc'&&(
        <div className="hub-main">
          <div className="section-label">NIST post-quantum algorithm status</div>
          <div className="pqc-grid">
            {PQC_ALGORITHMS.map(p=>(
              <div key={p.id} className="pqc-card">
                <div className="pqc-fips">{p.fips}</div>
                <div className="pqc-name">{p.name}</div>
                <div className="pqc-type">{p.type}</div>
                <p style={{fontSize:12,color:'#555',lineHeight:1.65,marginBottom:12}}>{p.desc}</p>
                <span className="pqc-status-pill" style={{background:p.fin?'rgba(0,165,80,.1)':'rgba(243,156,18,.1)',color:p.fin?'#00a550':'#e67e22'}}>{p.status}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:24}}>
            <div className="section-label">Organisation readiness</div>
            <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,padding:'4px 16px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              {PQC_READINESS.map(r=>{
                const sc=scColor(r.s)
                return(
                  <div key={r.org} className="readiness-row">
                    <span style={{fontSize:11,fontWeight:600,background:sc.bg,color:sc.c,border:`1px solid ${sc.border}`,padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{r.org}</span>
                    <span style={{fontSize:12,color:'#555',lineHeight:1.65}}>{r.detail}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: HISTORY TIMELINE ── */}
      {tab==='timeline'&&(
        <div className="hub-main">
          <div className="hub-filter-row">
            {[['All','All'],['milestone','Milestones'],['incident','Incidents'],['ballot','Ballots'],['enforcement','Enforcement']].map(([v,l])=>(
              <button key={v} className={`hub-chip${tlFilter===v?' on':''}`} onClick={()=>setTlFilter(v)}>{l}</button>
            ))}
          </div>
          <div style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:12,padding:'8px 16px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
            {filteredTimeline.map((e,i)=>(
              <div key={e.year+e.event} className="tl-item">
                <div className="tl-year">{e.year}</div>
                <div className="tl-dot" style={{background:tlColor(e.type)}}/>
                <div style={{flex:1}}>
                  <div className="tl-event">{e.event}</div>
                  <div className="tl-desc">{e.desc}</div>
                </div>
                <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:e.type==='incident'?'rgba(231,76,60,.08)':e.type==='ballot'?'rgba(0,165,80,.08)':e.type==='enforcement'?'rgba(243,156,18,.08)':'rgba(0,119,182,.08)',color:tlColor(e.type),whiteSpace:'nowrap',alignSelf:'flex-start',flexShrink:0,marginLeft:8}}>{e.type}</span>
              </div>
            ))}
            {filteredTimeline.length===0&&<div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>No events match your filter.</div>}
          </div>
        </div>
      )}

      {/* ── TAB: STANDARDS ── */}
      {tab==='standards'&&(
        <div className="hub-main">
          {standards.length===0?(
            <div style={{textAlign:'center',padding:60,color:'#888',fontSize:13}}>
              <div style={{fontSize:15,fontWeight:600,color:'#111',marginBottom:6}}>Standards database</div>
              Standards are loaded from Supabase in the live page.
            </div>
          ):(
            <div style={{display:'grid',gap:10}}>
              {standards.map(s=>(
                <div key={s.id} style={{background:'#fff',border:'1px solid rgba(0,0,0,.08)',borderRadius:10,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:3}}>{s.title}</div>
                      <div style={{fontSize:11,color:'#888',fontFamily:MONO}}>{s.identifier}</div>
                    </div>
                    {s.status&&<span style={{fontSize:10,fontWeight:600,background:'rgba(0,165,80,.1)',color:'#00a550',padding:'2px 8px',borderRadius:20,flexShrink:0}}>{s.status}</span>}
                  </div>
                  {s.plain_english&&<div style={{fontSize:12,color:'#555',lineHeight:1.65,marginTop:8}}>{s.plain_english}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <PublicFooter nav={nav}/>
    </div>
  )
}
