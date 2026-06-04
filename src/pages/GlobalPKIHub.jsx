import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ExternalLink, Globe, Shield, BookOpen, Calendar, ChevronRight, ChevronDown, Atom, AlertTriangle, CheckCircle, Clock, Filter, X } from 'lucide-react'

const MONO = "'JetBrains Mono','JetBrains Mono',monospace"
const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"

// ── PQC data (Phase 3 intelligence) ─────────────────────────────────
const PQC_ALGORITHMS = [
  { id:'ML-KEM', name:'ML-KEM (Kyber)', fips:'FIPS 203', type:'Key Encapsulation', status:'Final', date:'Aug 2024', desc:'Post-quantum replacement for RSA/ECDH key exchange. Protects the TLS handshake. Fast, efficient, small keys.', replaces:'RSA/ECDH', adopters:['NIST','IETF','CAB Forum (planning)','Apple (iMessage)','Cloudflare','Google Chrome'], color:'#16a068', risk:'low' },
  { id:'ML-DSA', name:'ML-DSA (Dilithium)', fips:'FIPS 204', type:'Digital Signature', status:'Final', date:'Aug 2024', desc:'Post-quantum replacement for RSA/ECDSA signatures. Will replace signature algorithms in all X.509 certificates.', replaces:'RSA/ECDSA', adopters:['NIST','IETF (LAMPS drafting)','CAB Forum (planning)','IBM Research'], color:'#16a068', risk:'low' },
  { id:'SLH-DSA', name:'SLH-DSA (SPHINCS+)', fips:'FIPS 205', type:'Digital Signature Backup', status:'Final', date:'Aug 2024', desc:'Hash-based backup signature algorithm. Different mathematical basis to ML-DSA — fallback if lattice cryptography is broken.', replaces:'RSA/ECDSA (backup)', adopters:['NIST','IETF (LAMPS drafting)'], color:'#16a068', risk:'low' },
  { id:'FN-DSA', name:'FN-DSA (FALCON)', fips:'FIPS 206', type:'Digital Signature', status:'Draft', date:'2025 expected', desc:'Fourth NIST PQC algorithm. NTRU-lattice based. Smaller signatures than ML-DSA. Being standardised as FIPS 206.', replaces:'RSA/ECDSA', adopters:['NIST (in progress)'], color:'#111111', risk:'medium' },
  { id:'HQC', name:'HQC', fips:'In process', type:'Key Encapsulation Backup', status:'Selected 2025', date:'Selected 2025', desc:'Backup KEM selected by NIST in 2025 as an alternative to ML-KEM. Code-based cryptography — different mathematical approach.', replaces:'RSA/ECDH (backup)', adopters:['NIST (selected)'], color:'#111111', risk:'medium' },
]

const PQC_READINESS = [
  { org:'NIST', status:'complete', label:'Standards finalised', detail:'FIPS 203, 204, 205 published Aug 2024. FIPS 206 in draft.' },
  { org:'IETF', status:'active', label:'Profiling for X.509', detail:'LAMPS WG drafting PQC certificate profiles. Hybrid cert RFCs in progress.' },
  { org:'CAB Forum', status:'planning', label:'Discussion phase', detail:'No ballot yet. SCWG discussing PQC certificate profiles for TLS BRs. Likely 2026–2027.' },
  { org:'ETSI', status:'active', label:'ESI standards updating', detail:'EN 319 series being updated for PQC algorithm support. eIDAS 2.0 implementation includes PQC planning.' },
  { org:'eIDAS', status:'planning', label:'Policy framework', detail:'European Commission planning PQC migration requirements. EUDIW spec includes crypto-agility provisions.' },
  { org:'APKIC', status:'active', label:'Regional guidance', detail:'Published PQC white papers. 2024 symposium featured PQC migration tracks for Asian government PKI programs.' },
  { org:'PKI Consortium', status:'complete', label:'Community leadership', detail:'Hosted the world\'s largest PQC conferences. 2500+ delegates in KL 2025. Amsterdam 2026 confirmed.' },
]

// ── Global PKI history (Phase 2 timeline) ────────────────────────────
const GLOBAL_TIMELINE = [
  { year:1865, org:'ITU', event:'International Telecommunication Union founded', desc:'Founded in Paris as the International Telegraph Union — the oldest UN agency. Today maintains X.509, the certificate standard all PKI is built on.', type:'milestone', color:'#111111' },
  { year:1978, org:'NIST', event:'RSA algorithm published — public key cryptography begins', desc:'Rivest, Shamir, Adleman publish the RSA algorithm. For the first time, two parties can exchange encrypted messages without a prior shared secret. The foundation of modern PKI.', type:'milestone', color:'#1f5c4e' },
  { year:1988, org:'ITU', event:'X.509 v1 published — the certificate format is born', desc:'ITU-T publishes X.509 as part of the X.500 directory standards. Defines the certificate structure every TLS, S/MIME, and code signing certificate still uses today.', type:'milestone', color:'#111111' },
  { year:1993, org:'IETF', event:'SSL invented by Netscape — HTTPS begins', desc:'Netscape creates SSL 2.0 to secure web commerce. The beginning of HTTPS and mass PKI deployment. SSL eventually standardised by IETF as TLS 1.0 in 1999.', type:'milestone', color:'#111111' },
  { year:1999, org:'webtrust', event:'WebTrust for CAs launched by AICPA/CPA Canada', desc:'First formal CA audit programme launched. Gives browser vendors an independent assurance mechanism to evaluate CA trustworthiness before root store inclusion.', type:'milestone', color:'#333333' },
  { year:2001, org:'apkic', event:'Asia PKI Consortium founded in Hong Kong', desc:'APKIC established to promote PKI adoption and interoperability across Asia/Oceania. Initial members from Hong Kong, Japan, Taiwan, South Korea. Now 11+ economies.', type:'milestone', color:'#111111' },
  { year:2005, org:'cabf', event:'CA/Browser Forum founded — web PKI governance begins', desc:'Voluntary consortium formed between major CAs and browsers to establish industry standards. First meeting in San Francisco. Initial focus on EV guidelines.', type:'milestone', color:'#111111' },
  { year:2007, org:'cabf', event:'EV Guidelines v1.0 — first CAB Forum standard', desc:'Extended Validation certificate guidelines published. The green address bar era begins. High-assurance identity validation codified for the first time globally.', type:'milestone', color:'#111111' },
  { year:2011, org:'cabf', event:'DigiNotar breach — CA trust crisis', desc:'Dutch CA DigiNotar compromised. 500+ fraudulent certificates for Google, Mozilla, and governments. DigiNotar bankrupt. Accelerated Baseline Requirements development.', type:'incident', color:'#1f5c4e' },
  { year:2012, org:'cabf', event:'Baseline Requirements v1.0 — the constitution of web PKI', desc:'All publicly-trusted TLS certificates must now comply with the BRs. Governs key size, validity, revocation, DCV, and audit. The most important PKI document ever published.', type:'milestone', color:'#111111' },
  { year:2012, org:'fido', event:'FIDO Alliance founded — passwordless authentication begins', desc:'Google, Lenovo, NXP, PayPal, and others found FIDO Alliance. Mission: reduce world\'s reliance on passwords. Leads to FIDO2/WebAuthn and passkeys.', type:'milestone', color:'#1f5c4e' },
  { year:2014, org:'eidas', event:'eIDAS Regulation — EU digital identity framework created', desc:'EU Regulation 910/2014 creates pan-European framework for electronic signatures, seals, and timestamps. Makes qualified electronic signatures legally binding across all EU member states.', type:'milestone', color:'#333333' },
  { year:2016, org:'nist', event:'NIST begins 8-year PQC standardisation project', desc:'NIST releases call for post-quantum cryptographic algorithms. 69 candidates submitted globally. 8-year evaluation process begins. The biggest cryptographic transition since RSA.', type:'milestone', color:'#1f5c4e' },
  { year:2018, org:'cabf', event:'Symantec distrusted by Chrome and Mozilla', desc:'After years of compliance failures and hundreds of misissued certificates, Google and Mozilla removed Symantec roots. DigiCert acquired Symantec PKI business.', type:'incident', color:'#1f5c4e' },
  { year:2019, org:'ietf', event:'RFC 8555 ACME published — certificate automation standardised', desc:'ACME protocol standardised by IETF. Let\'s Encrypt had pioneered it — now it is an official internet standard. Enables zero-touch certificate management.', type:'milestone', color:'#111111' },
  { year:2019, org:'cabf', event:'Working Group structure — CAB Forum restructured', desc:'Forum restructures into specialised Working Groups: Server Cert, Code Signing, NetSec — each with own charter and ballots. Improves governance quality.', type:'milestone', color:'#111111' },
  { year:2020, org:'cabf', event:'Apple enforces 1-year validity unilaterally — industry shock', desc:'A CAB Forum ballot to reduce validity failed. Apple bypassed the Forum and enforced 398-day certs in Safari. All browsers followed. S/MIME WG chartered.', type:'enforcement', color:'#111111' },
  { year:2020, org:'fido', event:'FIDO2 and WebAuthn become W3C standards', desc:'WebAuthn published as W3C Recommendation. FIDO2 enables passwordless login using hardware keys, biometrics, and platform authenticators across all major browsers.', type:'milestone', color:'#1f5c4e' },
  { year:2023, org:'cabf', event:'SC063 — OCSP optional, CRLs required. Privacy improvement.', desc:'Major privacy improvement: OCSP becomes optional while CRL availability is mandated. Reduces OCSP responders tracking which websites users visit.', type:'ballot', color:'#111111' },
  { year:2024, org:'cabf', event:'Entrust distrusted — largest CA distrust event in history', desc:'Chrome and Mozilla remove Entrust from root stores after sustained compliance failures. 26M+ active certificates affected. Largest CA distrust event ever.', type:'incident', color:'#1f5c4e' },
  { year:2024, org:'cabf', event:'SC067v3 — Multi-perspective DCV mandatory', desc:'CAs must validate domain control from multiple geographically-distributed network perspectives simultaneously. Prevents BGP hijacking attacks against certificate issuance.', type:'ballot', color:'#111111' },
  { year:2024, org:'nist', event:'FIPS 203, 204, 205 finalised — PQC era begins', desc:'NIST finalises ML-KEM, ML-DSA, and SLH-DSA — the three post-quantum standards that will replace RSA and ECC globally. The most significant crypto event since RSA publication.', type:'milestone', color:'#1f5c4e' },
  { year:2024, org:'eidas', event:'eIDAS 2.0 Regulation 2024/1183 — EU Digital Identity Wallet', desc:'eIDAS 2.0 published. Introduces EU Digital Identity Wallet (EUDIW) and mandates browsers trust government-issued QWAC certificates. Browser governance battle begins.', type:'milestone', color:'#333333' },
  { year:2025, org:'cabf', event:'SC081v3 — The 47-day mandate. Most impactful ballot since BRs.', desc:'200-day validity by March 2026, 100-day by March 2027, 47-day by March 2029. Zero-touch automation becomes a legal requirement for all certificate issuance.', type:'ballot', color:'#1f5c4e' },
  { year:2025, org:'pkic', event:'PQC Conference KL — 2500+ delegates. World\'s largest.', desc:'PKI Consortium hosts record-breaking PQC conference in Kuala Lumpur. 2500+ delegates from governments, CAs, and tech companies. PQC migration moves from planning to execution.', type:'milestone', color:'#111111' },
  { year:2026, org:'cabf', event:'SHA-1 fully prohibited in all certificates and CRLs', desc:'SC097 fully enforced. Every remaining SHA-1 use in certificate chains prohibited. Any Intermediate CA still signing with SHA-1 must be revoked immediately.', type:'enforcement', color:'#111111' },
]

// ── Deep dive routes for org cards ──────────────────────────────────
const ORG_DEEP_DIVE = {
  'cabf': '/cab-forum',
  'etsi': '/pki-hub/etsi',
  'nist': '/pki-hub/nist',
  'ietf': '/pki-hub/ietf',
  'apkic': '/pki-hub/apkic',
  'eidas': '/pki-hub/eidas',
  'pkic': '/pki-hub/pkic',
  'csc': '/pki-hub/csc',
}

// ── Category filter chips ────────────────────────────────────────────
const ORG_CATEGORIES = ['All','Governance','Standards Body','Government Agency','Regional Consortium','Regulation','Industry Consortium','Industry Alliance','Audit Framework','Infrastructure','Intergovernmental Body']

// ── Helpers ──────────────────────────────────────────────────────────
const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) } catch { return d || '—' } }
const daysUntil = d => d ? Math.round((new Date(d)-Date.now())/86400000) : null

const REGION_FLAGS = { 'Global':'🌍', 'Europe':'🇪🇺', 'Americas':'🇺🇸', 'Asia-Pacific':'🌏', 'No fixed HQ (distributed)':'🌐', 'Distributed':'🌐' }
const rFlag = r => REGION_FLAGS[r] || '🌐'

const statusDot = s => {
  if (!s) return '#666666'
  const l = s.toLowerCase()
  if (['final','current','in force','active','complete'].some(x=>l.includes(x))) return '#16a068'
  if (['draft','selected','planning'].some(x=>l.includes(x))) return '#111111'
  return '#666666'
}

const pqcStatusColor = s => {
  if (s==='complete') return { bg:'var(--v2-green-bg)', text:'var(--v2-green-text)', border:'var(--v2-green-border)', label:'Complete' }
  if (s==='active') return { bg:'var(--v2-amber-bg)', text:'var(--v2-amber-text)', border:'var(--v2-amber-border)', label:'Active' }
  return { bg:'var(--v2-surface-2)', text:'var(--v2-text-3)', border:'var(--v2-border)', label:'Planning' }
}

const tlColor = type => {
  if (type==='incident') return 'var(--v2-red-text)'
  if (type==='ballot') return 'var(--v2-green-text)'
  if (type==='enforcement') return 'var(--v2-amber-text)'
  return 'var(--v2-green-text)'
}

// ── Main component ───────────────────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function GlobalPKIHub({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('orgs')
  const [orgs, setOrgs] = useState([])
  const [standards, setStandards] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [stdFilter, setStdFilter] = useState('All')
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [selectedStd, setSelectedStd] = useState(null)
  const [tlFilter, setTlFilter] = useState('All')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: o }, { data: s }, { data: e }] = await Promise.all([
        supabase.from('pki_orgs').select('*').order('display_order'),
        supabase.from('pki_standards').select('*').order('published_date', { ascending: false }),
        supabase.from('pki_events').select('*').order('start_date'),
      ])
      setOrgs(o || [])
      setStandards(s || [])
      setEvents(e || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => {
      if (catFilter !== 'All' && o.category !== catFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (o.short_name||'').toLowerCase().includes(q) || (o.full_name||'').toLowerCase().includes(q) || (o.plain_english||'').toLowerCase().includes(q) || (o.scope||'').toLowerCase().includes(q)
      }
      return true
    })
  }, [orgs, catFilter, query])

  const filteredStandards = useMemo(() => {
    return standards.filter(s => {
      if (stdFilter !== 'All' && s.category !== stdFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (s.title||'').toLowerCase().includes(q) || (s.identifier||'').toLowerCase().includes(q) || (s.plain_english||'').toLowerCase().includes(q) || (s.tags||[]).some(t => t.toLowerCase().includes(q))
      }
      return true
    })
  }, [standards, stdFilter, query])

  const filteredTimeline = useMemo(() => {
    return GLOBAL_TIMELINE.filter(e => {
      if (tlFilter !== 'All' && e.type !== tlFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return e.event.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.org.toLowerCase().includes(q)
      }
      return true
    })
  }, [tlFilter, query])

  const stdCategories = useMemo(() => ['All', ...new Set(standards.map(s => s.category).filter(Boolean))], [standards])

  const nextEvent = events.find(e => daysUntil(e.start_date) > 0)

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .hub-sync{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:7px 24px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--v2-text-2);gap:12px;flex-wrap:wrap}
        .hub-alert{background:var(--v2-amber-bg,#fde8e4);border-bottom:0.5px solid var(--v2-amber-border,#F2C4BC);padding:9px 24px;display:flex;align-items:center;gap:12px;font-size:12px;flex-wrap:wrap}
        .hub-hero{background:#1f5c4e;padding:36px 24px 30px;color:#ffffff}
        .hub-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .hub-h1{font-size:28px;font-weight:600;letter-spacing:-.5px;color:#ffffff;line-height:1.15;margin-bottom:10px}
        .hub-h1 em{color:#2a6b5c;font-style:normal}
        .hub-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:22px}
        .hub-stats{display:flex;gap:30px;flex-wrap:wrap}
        .hub-sn{font-size:24px;font-weight:600;color:#ffffff;font-variant-numeric:tabular-nums;line-height:1}
        .hub-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .hub-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0}
        .hub-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:22px;cursor:pointer;margin-bottom:-0.5px;display:flex;align-items:center;gap:7px;transition:color .12s;white-space:nowrap}
        .hub-tab:hover{color:var(--v2-text)}
        .hub-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .hub-tab .cnt{font-size:10px;font-weight:500;background:var(--v2-hover);border-radius:100px;padding:1px 7px;color:var(--v2-text-3)}
        .hub-tab.on .cnt{background:var(--v2-text);color:#ffffff}
        .fbar{padding:9px 14px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2);display:flex;gap:5px;flex-wrap:wrap;align-items:center}
        .fchip{font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;border:0.5px solid transparent;color:var(--v2-text-2);background:transparent;font-family:${FONT};cursor:pointer}
        .fchip:hover{background:var(--v2-hover)}
        .fchip.on{background:var(--v2-surface);border-color:var(--v2-border-strong);color:var(--v2-text)}
        .org-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;padding:16px}
        .org-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:16px;cursor:pointer;transition:border-color .12s;display:flex;flex-direction:column;gap:10px}
        .org-card:hover{border-color:var(--v2-border-strong)}
        .org-card.active{border-color:var(--v2-green-border);background:var(--v2-green-bg)}
        .org-header{display:flex;align-items:flex-start;gap:12px}
        .org-badge{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#ffffff;flex-shrink:0;letter-spacing:.02em;line-height:1.2;text-align:center}
        .org-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;padding-top:10px;border-top:0.5px solid var(--v2-border);font-size:11px}
        .om-k{color:var(--v2-text-3)}
        .om-v{color:var(--v2-text);font-weight:500;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .detail-panel{border-top:0.5px solid var(--v2-border);padding:16px 20px;background:var(--v2-surface-2)}
        .std-row{display:flex;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--v2-border);cursor:pointer;transition:background .1s;align-items:flex-start}
        .std-row:hover{background:var(--v2-surface-2)}
        .std-row.active{background:var(--v2-green-bg);border-left:2px solid var(--v2-green-border)}
        .std-id-col{min-width:100px;flex-shrink:0}
        .std-id{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-2);line-height:1.4}
        .std-ver{font-size:10px;color:var(--v2-text-3);margin-top:2px;font-family:${MONO}}
        .tl-outer{padding:16px 20px}
        .tl-row{display:flex;gap:10px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:36px;text-align:right;padding-top:2px;flex-shrink:0}
        .tl-spine{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:2px}
        .tl-line{width:1px;background:var(--v2-border);flex:1;min-height:14px;margin-top:3px}
        .tl-body{flex:1;padding-bottom:8px}
        .tl-event{font-size:12px;font-weight:500;color:var(--v2-text);margin-bottom:4px;line-height:1.4}
        .tl-desc{font-size:11px;color:var(--v2-text-2);line-height:1.6}
        .pqc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:16px}
        .pqc-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px}
        .pqc-status{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;margin-bottom:8px}
        .readiness-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--v2-border)}
        .readiness-row:last-child{border-bottom:none}
        .readiness-org{font-size:12px;font-weight:600;min-width:100px;color:var(--v2-text)}
        .readiness-bar{flex:1;height:6px;border-radius:3px;background:var(--v2-hover);overflow:hidden}
        .readiness-fill{height:100%;border-radius:3px;transition:width .6s}
        .events-list{padding:16px}
        .event-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start}
        .event-date-box{background:var(--v2-surface-2);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-lg);padding:8px 10px;text-align:center;min-width:52px;flex-shrink:0}
        .ev-day{font-size:18px;font-weight:700;color:var(--v2-text);font-family:${MONO};line-height:1}
        .ev-mon{font-size:10px;color:var(--v2-text-3);text-transform:uppercase;letter-spacing:.06em}
        .ev-yr{font-size:10px;color:var(--v2-text-3);font-family:${MONO}}
        .side-info{background:var(--v2-surface-2);border-left:0.5px solid var(--v2-border);padding:16px;min-width:260px;max-width:300px;flex-shrink:0}
        .si-head{font-size:11px;letter-spacing:.06em;color:var(--v2-text-3);text-transform:uppercase;font-weight:500;margin-bottom:10px}
        @media(max-width:min(800px,100%)){.org-grid{grid-template-columns:1fr}.pqc-grid{grid-template-columns:1fr}}
      `}</style>

      {/* Sync bar */}
      <div className="hub-sync">
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#16a068', marginRight:2 }} />
          <span>Global PKI Intelligence Hub · {orgs.length || 12} organisations · {standards.length || 22} standards · {events.length || 6} events indexed</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="https://cabforum.org" target="_blank" rel="noreferrer" className="v2-btn v2-btn-sm" style={{ gap:5, textDecoration:'none' }}>
            <ExternalLink size={12} /> CAB Forum ↗
          </a>
        </div>
      </div>

      {/* Upcoming event alert */}
      {nextEvent && (
        <div className="hub-alert">
          <Calendar size={15} style={{ color:'var(--v2-amber-text)', flexShrink:0 }} />
          <span style={{ color:'var(--v2-amber-text)', fontWeight:500, flex:1 }}>Upcoming: {nextEvent.title}</span>
          <span style={{ fontFamily:MONO, fontSize:11, color:'var(--v2-amber-text)' }}>{fmtDate(nextEvent.start_date)}</span>
          {nextEvent.country && <span className="v2-chip chip-amber" style={{ fontSize:9 }}>{nextEvent.country}</span>}
        </div>
      )}

      {/* Hero */}
      <div className="hub-hero">
        <div className="hub-eyebrow">SSLVault Global PKI Intelligence · All Phases · All Bodies</div>
        <div className="hub-h1">Every PKI body, every standard, every decision — <em>one place.</em></div>
        <div className="hub-sub">The world's first unified intelligence platform consolidating every PKI standards body, consortium, and regulatory framework. CAB Forum, ETSI ESI, NIST PQC, IETF PKIX, Asia PKI Consortium, eIDAS 2.0, PKI Consortium, Cloud Signature Consortium, FIDO Alliance, WebTrust, CCADB, and ITU-T — all decoded in plain English. No other platform has done this.</div>
        <div className="hub-stats">
          <div><div className="hub-sn">{orgs.length || 12}</div><div className="hub-sl">Bodies covered</div></div>
          <div><div className="hub-sn">{standards.length || 22}</div><div className="hub-sl">Standards tracked</div></div>
          <div><div className="hub-sn">6</div><div className="hub-sl">Continents</div></div>
          <div><div className="hub-sn">1865</div><div className="hub-sl">Oldest body (ITU)</div></div>
          <div><div className="hub-sn">3</div><div className="hub-sl">PQC finals (NIST 2024)</div></div>
          <div><div className="hub-sn">2029</div><div className="hub-sl">47-day cert deadline</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hub-tabs">
        {[
          { id:'orgs', label:'PKI Bodies', cnt: orgs.length || 12, icon: <Globe size={13}/> },
          { id:'standards', label:'Standards Library', cnt: standards.length || 22, icon: <BookOpen size={13}/> },
          { id:'timeline', label:'Global Timeline', cnt: GLOBAL_TIMELINE.length, icon: <Clock size={13}/> },
          { id:'pqc', label:'PQC Migration', cnt: PQC_ALGORITHMS.length, icon: <Atom size={13}/> },
          { id:'events', label:'Events', cnt: events.length || 6, icon: <Calendar size={13}/> },
        ].map(({ id, label, cnt, icon }) => (
          <button key={id} className={`hub-tab${tab===id?' on':''}`} onClick={() => { setTab(id); setSelectedOrg(null); setSelectedStd(null); setQuery('') }}>
            {icon}{label} <span className="cnt">{cnt}</span>
          </button>
        ))}
      </div>

      {/* ── SEARCH bar (shared) ── */}
      {(tab === 'orgs' || tab === 'standards' || tab === 'timeline') && (
        <div className="fbar" style={{ justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', flex:1 }}>
            {tab==='orgs' && ORG_CATEGORIES.map(c => (
              <button key={c} className={`fchip${catFilter===c?' on':''}`} onClick={()=>setCatFilter(c)}>{c}</button>
            ))}
            {tab==='standards' && stdCategories.map(c => (
              <button key={c} className={`fchip${stdFilter===c?' on':''}`} onClick={()=>setStdFilter(c)}>{c}</button>
            ))}
            {tab==='timeline' && ['All','milestone','ballot','incident','enforcement'].map(t => (
              <button key={t} className={`fchip${tlFilter===t?' on':''}`} onClick={()=>setTlFilter(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--v2-surface)', border:'0.5px solid var(--v2-border-strong)', borderRadius:'var(--v2-r-md)', padding:'5px 10px', marginLeft:8 }}>
            <Search size={13} color="var(--v2-text-3)" />
            <input type="text" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)}
              style={{ border:'none', outline:'none', background:'transparent', fontSize:12, color:'#111111', fontFamily:FONT, width:160 }} />
            {query && <button onClick={()=>setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#888888', padding:0 }}><X size={12}/></button>}
          </div>
        </div>
      )}

      {/* ── TAB: PKI BODIES ── */}
      {tab === 'orgs' && (
        <>
          {selectedOrg && (
            <div className="detail-panel">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div className="org-badge" style={{ background: selectedOrg.logo_color||'#111111', width:44, height:44, fontSize:11 }}>{selectedOrg.acronym||selectedOrg.short_name?.slice(0,4)}</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:600, color:'#111111', marginBottom:3 }}>{selectedOrg.full_name}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {selectedOrg.tags?.slice(0,5).map(t => <span key={t} className="v2-chip chip-blue" style={{ fontSize:9 }}>{t}</span>)}
                    </div>
                  </div>
                </div>
                <button className="v2-btn v2-btn-sm" onClick={()=>setSelectedOrg(null)}>✕</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                <div>
                  <div className="v2-callout tip" style={{ fontSize:12, marginBottom:12 }}>{selectedOrg.plain_english}</div>
                  <div style={{ fontSize:11, color:'#333333', lineHeight:1.7 }}><strong style={{ color:'#111111' }}>Mission:</strong> {selectedOrg.mission}</div>
                </div>
                <div>
                  {[
                    { k:'Category', v:selectedOrg.category },
                    { k:'Founded', v:selectedOrg.founded },
                    { k:'Region', v:`${rFlag(selectedOrg.region)} ${selectedOrg.region}` },
                    { k:'HQ', v:selectedOrg.hq },
                    { k:'Chair', v:selectedOrg.chair ? `${selectedOrg.chair} · ${selectedOrg.chair_org}` : '—' },
                    { k:'Governance', v:selectedOrg.governance },
                    { k:'Membership', v:selectedOrg.membership_type },
                  ].map(({ k, v }) => v && (
                    <div key={k} style={{ display:'flex', gap:10, padding:'5px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:11 }}>
                      <span style={{ color:'#888888', minWidth:80, flexShrink:0 }}>{k}</span>
                      <span style={{ color:'#111111', fontWeight:500, fontSize:11 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedOrg.key_outputs?.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:'#888888', letterSpacing:'.04em', textTransform:'uppercase', fontWeight:500, marginBottom:7 }}>Key outputs</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {selectedOrg.key_outputs.map(o => <span key={o} className="v2-chip chip-grey" style={{ fontSize:10 }}>{o}</span>)}
                  </div>
                </div>
              )}
              {selectedOrg.website && (
                <a href={selectedOrg.website} target="_blank" rel="noreferrer" className="v2-btn" style={{ marginTop:12, gap:5, textDecoration:'none', display:'inline-flex' }}>
                  <ExternalLink size={12} /> Visit {selectedOrg.short_name} website ↗
                </a>
              )}
            </div>
          )}
          {loading ? (
            <div className="org-grid">
              {[...Array(8)].map((_,i) => <div key={i} className="org-card" style={{ height:180, opacity:.3, background:'var(--v2-hover)' }} />)}
            </div>
          ) : (
            <div className="org-grid">
              {filteredOrgs.map(org => (
                <div key={org.id} className={`org-card${selectedOrg?.id===org.id?' active':''}`} onClick={() => setSelectedOrg(selectedOrg?.id===org.id ? null : org)}>
                  <div className="org-header">
                    <div className="org-badge" style={{ background: org.logo_color||'#111111' }}>{org.acronym||org.short_name?.slice(0,4)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:2 }}>{org.short_name}</div>
                      <div style={{ fontSize:10, color:'#888888', lineHeight:1.4 }}>{org.full_name?.slice(0,60)}{org.full_name?.length>60?'…':''}</div>
                      <div style={{ marginTop:4, display:'flex', gap:3 }}>
                        <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{org.category}</span>
                        <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{rFlag(org.region)} {org.region}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#333333', lineHeight:1.5, flex:1 }}>{org.plain_english}</div>
                  <div className="org-meta">
                    {org.founded && <><div className="om-k">Founded</div><div className="om-v">{org.founded}</div></>}
                    {org.chair && <><div className="om-k">Chair</div><div className="om-v">{org.chair}</div></>}
                    {org.key_outputs?.[0] && <><div className="om-k">Latest</div><div className="om-v">{org.key_outputs[0]}</div></>}
                    {org.category && <><div className="om-k">Type</div><div className="om-v">{org.category}</div></>}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'#888888', display:'flex', alignItems:'center', gap:3 }}>
                      {selectedOrg?.id===org.id ? 'Close' : 'Details'} <ChevronRight size={12}/>
                    </span>
                    {ORG_DEEP_DIVE[org.id] && (
                      <button onClick={(e)=>{ e.stopPropagation(); nav(ORG_DEEP_DIVE[org.id]) }}
                        className="v2-btn v2-btn-sm" style={{ gap:4, fontSize:10 }}>
                        Deep Dive <ChevronRight size={11}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: STANDARDS LIBRARY ── */}
      {tab === 'standards' && (
        <div style={{ display:'flex' }}>
          <div style={{ flex:1, minWidth:0 }}>
            {loading ? (
              <div style={{ padding:24 }}>Loading standards…</div>
            ) : filteredStandards.length === 0 ? (
              <div className="v2-empty"><div className="v2-empty-title">No standards match</div></div>
            ) : (
              filteredStandards.map(s => {
                const org = orgs.find(o => o.id === s.org_id)
                return (
                  <div key={s.identifier} className={`std-row${selectedStd?.identifier===s.identifier?' active':''}`} onClick={() => setSelectedStd(selectedStd?.identifier===s.identifier ? null : s)}>
                    <div className="std-id-col">
                      <div className="std-id">{s.identifier}</div>
                      <div className="std-ver">{s.version}</div>
                      {org && <div style={{ marginTop:4 }}><div className="org-badge" style={{ background:org.logo_color||'#111111', width:20, height:20, fontSize:7, borderRadius:4, display:'inline-flex' }}>{org.acronym?.slice(0,4)||org.short_name?.slice(0,4)}</div></div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:500, color:'#111111' }}>{s.title}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:statusDot(s.status), display:'inline-block', flexShrink:0 }}/>
                          <span className={`v2-chip ${s.status==='Final'||s.status==='Current'||s.status==='In Force'||s.status==='Active' ? 'chip-green' : s.status==='Draft'?'chip-amber':'chip-grey'}`} style={{ fontSize:9 }}>{s.status}</span>
                          {s.category && <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{s.category}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:12, color:'#333333', lineHeight:1.5 }}>{s.plain_english}</div>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:5 }}>
                        {s.tags?.slice(0,5).map(t => <span key={t} className="v2-chip chip-grey" style={{ fontSize:9 }}>{t}</span>)}
                      </div>
                    </div>
                    <div style={{ minWidth:80, textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:10, color:'#888888' }}>{s.published_date ? new Date(s.published_date).getFullYear() : '—'}</div>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="v2-btn v2-btn-sm" style={{ gap:4, textDecoration:'none', marginTop:4, display:'inline-flex' }}>
                          <ExternalLink size={10}/> Read
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {selectedStd && (
            <div className="side-info">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div className="si-head">Standard detail</div>
                <button onClick={()=>setSelectedStd(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888888' }}><X size={14}/></button>
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:'#111111', marginBottom:8, lineHeight:1.4 }}>{selectedStd.title}</div>
              <div className="v2-callout tip" style={{ fontSize:11, marginBottom:12 }}>{selectedStd.plain_english}</div>
              {[
                { k:'Identifier', v:selectedStd.identifier },
                { k:'Version', v:selectedStd.version },
                { k:'Category', v:selectedStd.category },
                { k:'Status', v:selectedStd.status },
                { k:'Published', v:fmtDate(selectedStd.published_date) },
              ].filter(x=>x.v).map(({ k, v }) => (
                <div key={k} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:11 }}>
                  <span style={{ color:'#888888', minWidth:70, flexShrink:0 }}>{k}</span>
                  <span style={{ color:'#111111', fontWeight:500 }}>{v}</span>
                </div>
              ))}
              {selectedStd.tags?.length > 0 && (
                <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {selectedStd.tags.map(t => <span key={t} className="v2-chip chip-grey" style={{ fontSize:9 }}>{t}</span>)}
                </div>
              )}
              {selectedStd.url && (
                <a href={selectedStd.url} target="_blank" rel="noreferrer" className="v2-btn" style={{ marginTop:12, gap:5, textDecoration:'none', display:'inline-flex', width:'100%', justifyContent:'center' }}>
                  <ExternalLink size={12}/> Read full standard ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: GLOBAL TIMELINE ── */}
      {tab === 'timeline' && (
        <div className="v2-container">
          <div style={{ marginBottom:16 }}>
            <h1 className="v2-h1" style={{ marginBottom:4 }}>Global PKI history timeline</h1>
            <p className="v2-subtitle">From ITU-T founding in 1865 through X.509, SSL, CAB Forum, PQC — every defining moment in public key infrastructure history.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14, alignItems:'start' }}>
            {[0,1].map(col => (
              <div key={col}>
                {filteredTimeline.filter((_,i) => i%2===col).map((e, i, arr) => (
                  <div key={e.year+e.event} className="tl-row">
                    <div className="tl-yr">{e.year}</div>
                    <div className="tl-spine">
                      <div className="tl-dot" style={{ background:tlColor(e.type), border:`1.5px solid ${tlColor(e.type)}` }}/>
                      {i < arr.length-1 && <div className="tl-line"/>}
                    </div>
                    <div className="tl-body">
                      <div className="tl-event">{e.event}</div>
                      <div className="tl-desc">{e.desc}</div>
                      <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                        <span className={`v2-chip ${e.type==='incident'?'chip-red':e.type==='ballot'?'chip-green':e.type==='enforcement'?'chip-amber':'chip-grey'}`} style={{ fontSize:9 }}>{e.type}</span>
                        {e.org && <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{e.org.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: PQC MIGRATION ── */}
      {tab === 'pqc' && (
        <div className="v2-container">
          <div style={{ marginBottom:16 }}>
            <h1 className="v2-h1" style={{ marginBottom:4 }}>Post-Quantum Cryptography migration tracker</h1>
            <p className="v2-subtitle">The biggest cryptographic transition since RSA was published in 1978. NIST finalised ML-KEM, ML-DSA, and SLH-DSA in August 2024. Every PKI body is now planning migration.</p>
          </div>

          <div className="v2-callout warning" style={{ marginBottom:16 }}>
            <div className="v2-callout-title">Why this matters for every certificate</div>
            Today's RSA and ECDSA certificates will be breakable by a sufficiently powerful quantum computer. While no such computer exists yet, "harvest now, decrypt later" attacks mean adversaries are collecting encrypted data today to decrypt in the future. PKI must migrate to post-quantum algorithms before the quantum threat materialises — and that migration takes years. The clock is already running.
          </div>

          <div style={{ fontSize:12, fontWeight:600, color:'#111111', marginBottom:10, marginTop:4 }}>Finalised NIST standards — the new building blocks of PKI</div>
          <div className="pqc-grid" style={{ padding:0, marginBottom:20 }}>
            {PQC_ALGORITHMS.map(alg => (
              <div key={alg.id} className="pqc-card">
                <div className="pqc-status" style={{ background: alg.status==='Final'?'var(--v2-green-bg)':alg.status==='Selected 2025'?'var(--v2-amber-bg)':'var(--v2-surface-2)', color: alg.status==='Final'?'var(--v2-green-text)':alg.status==='Selected 2025'?'var(--v2-amber-text)':'var(--v2-text-3)', border: `0.5px solid ${alg.status==='Final'?'var(--v2-green-border)':alg.status==='Selected 2025'?'var(--v2-amber-border)':'var(--v2-border)'}` }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block' }}/>
                  {alg.status} · {alg.date}
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:3 }}>{alg.name}</div>
                <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
                  <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{alg.fips}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{alg.type}</span>
                </div>
                <div style={{ fontSize:12, color:'#333333', lineHeight:1.5, marginBottom:8 }}>{alg.desc}</div>
                <div style={{ fontSize:10, color:'#888888', marginBottom:4 }}>Replaces: <span style={{ color:'#111111', fontWeight:500 }}>{alg.replaces}</span></div>
                <div style={{ fontSize:10, color:'#888888', marginBottom:4 }}>Adopters:</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {alg.adopters.map(a => <span key={a} className="v2-chip chip-grey" style={{ fontSize:9 }}>{a}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:12, fontWeight:600, color:'#111111', marginBottom:12 }}>PKI body readiness status</div>
          <div className="v2-card v2-card-pad" style={{ marginBottom:16 }}>
            {PQC_READINESS.map(r => {
              const s = pqcStatusColor(r.status)
              const pct = r.status==='complete' ? 100 : r.status==='active' ? 60 : 25
              return (
                <div key={r.org} className="readiness-row">
                  <div className="readiness-org">{r.org}</div>
                  <div className="readiness-bar">
                    <div className="readiness-fill" style={{ width:`${pct}%`, background: r.status==='complete'?'var(--v2-green-text)':r.status==='active'?'var(--v2-amber-text)':'var(--v2-text-3)' }}/>
                  </div>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:s.bg, color:s.text, border:`0.5px solid ${s.border}`, minWidth:70, textAlign:'center', flexShrink:0 }}>{s.label}</span>
                  <div style={{ fontSize:11, color:'#333333', flex:1, paddingLeft:10 }}>{r.detail}</div>
                </div>
              )
            })}
          </div>

          <div className="v2-callout tip">
            <div className="v2-callout-title">SSLVault and PQC</div>
            SSLVault is built on ACME automation — the same protocol that will handle PQC certificate issuance when CAB Forum ballots adopt PQC profiles. When ML-DSA certificates are available from GoGetSSL, SSLVault's agent will automatically request and install them without any changes needed. The architecture is already quantum-ready.
          </div>
        </div>
      )}

      {/* ── TAB: EVENTS ── */}
      {tab === 'events' && (
        <div className="v2-container">
          <div style={{ marginBottom:16 }}>
            <h1 className="v2-h1" style={{ marginBottom:4 }}>Global PKI events calendar</h1>
            <p className="v2-subtitle">CAB Forum face-to-face meetings, APKIC symposia, PKI Consortium PQC conferences, ETSI workshops — all in one feed.</p>
          </div>
          {loading ? (
            <div>Loading events…</div>
          ) : events.length === 0 ? (
            <div className="v2-empty"><div className="v2-empty-title">No events yet</div></div>
          ) : (
            <div className="events-list" style={{ padding:0 }}>
              {events.map(e => {
                const org = orgs.find(o => o.id === e.org_id)
                const d = e.start_date ? new Date(e.start_date) : null
                const days = daysUntil(e.start_date)
                const isPast = days !== null && days < 0
                return (
                  <div key={e.id} className="event-card">
                    {d && (
                      <div className="event-date-box" style={{ opacity: isPast ? 0.5 : 1 }}>
                        <div className="ev-day">{d.getDate()}</div>
                        <div className="ev-mon">{d.toLocaleString('en-GB',{month:'short'})}</div>
                        <div className="ev-yr">{d.getFullYear()}</div>
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'#111111' }}>{e.title}</div>
                        {isPast ? <span className="v2-chip chip-grey" style={{ fontSize:9 }}>Past</span>
                          : days !== null && days < 90 ? <span className="v2-chip chip-amber" style={{ fontSize:9 }}>{days}d away</span>
                          : days !== null ? <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{days}d away</span> : null}
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                        {org && <span className="org-badge" style={{ background:org.logo_color||'#111111', width:20, height:20, fontSize:7, borderRadius:4, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#111111', fontWeight:800 }}>{org.acronym?.slice(0,4)}</span>}
                        {e.event_type && <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{e.event_type}</span>}
                        {e.location && <span style={{ fontSize:11, color:'#333333' }}>📍 {e.location}{e.country ? `, ${e.country}` : ''}</span>}
                      </div>
                      {e.description && <div style={{ fontSize:12, color:'#333333', lineHeight:1.5 }}>{e.description}</div>}
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noreferrer" className="v2-btn v2-btn-sm" style={{ marginTop:8, gap:4, textDecoration:'none', display:'inline-flex' }}>
                          <ExternalLink size={11}/> More info ↗
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
