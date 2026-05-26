import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Search, RefreshCw, ExternalLink, Clock, AlertTriangle, CheckCircle, XCircle, MinusCircle, Filter, ChevronRight } from 'lucide-react'

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const SYNC_FN = `${SUPABASE_URL}/functions/v1/cabforum-sync`

// ── Design tokens (Design v2) ─────────────────────────────────────────
const S = {
  font: "'Segoe UI',-apple-system,system-ui,sans-serif",
  mono: "'JetBrains Mono','SF Mono',monospace",
}

// ── Static data ───────────────────────────────────────────────────────
const COMPLIANCE_DEADLINES = [
  { title: '200-day max validity', date: '2026-03-15', ballot: 'SC081v3', color: 'var(--v2-red)', status: 'urgent', action: 'Audit your certificate fleet now. Any cert with validity > 200 days issued after this date will be rejected by browsers.' },
  { title: '100-day max validity', date: '2027-03-15', ballot: 'SC081v3', color: 'var(--v2-amber)', status: 'plan', action: 'Manual renewal every 100 days is operationally unsustainable. Start deploying ACME automation now.' },
  { title: '47-day max validity', date: '2029-03-15', ballot: 'SC081v3', color: 'var(--v2-green-text)', status: 'future', action: 'Full zero-touch automation required. Human-in-the-loop renewal processes will fail at this cadence.' },
  { title: 'DCV reuse max 10 days', date: '2027-03-15', ballot: 'SC081v3', color: 'var(--v2-amber)', status: 'plan', action: 'Domain control validation reuse drops to 10 days — requiring near-continuous automated re-validation.' },
  { title: 'SHA-1 fully prohibited', date: '2026-01-01', ballot: 'SC097', color: 'var(--v2-text-3)', status: 'passed', action: 'Already in effect. Any cert or CRL with SHA-1 signatures must be revoked. Check your intermediates.' },
  { title: 'Multi-perspective DCV', date: '2025-03-15', ballot: 'SC067v3', color: 'var(--v2-text-3)', status: 'passed', action: 'Already in effect. CAs must validate from multiple network perspectives. Affects all new issuances.' },
]

const TIMELINE = [
  { year: '2005', event: 'CAB Forum founded', desc: 'Voluntary consortium formed by major CAs (Comodo, DigiCert, Entrust, GlobalSign, GoDaddy, VeriSign) and browsers (Firefox, IE, Opera, Safari) to establish industry standards for certificate issuance and management.', tags: ['Foundation'], color: 'var(--v2-green-text)', type: 'milestone' },
  { year: '2007', event: 'EV Guidelines v1.0 — first published standard', desc: 'Extended Validation certificate guidelines published. The green address bar era begins. High-assurance identity validation codified for the first time, requiring rigorous organisational vetting before certificate issuance.', tags: ['EV SSL', 'Ballot 001+'], color: 'var(--v2-green-text)', type: 'milestone' },
  { year: '2011', event: 'DigiNotar catastrophic breach', desc: 'Dutch CA DigiNotar compromised — attackers issued fraudulent Google, Mozilla and government certificates. 500+ rogue certs discovered. DigiNotar declared bankruptcy. The incident accelerated CAB Forum baseline requirement work.', tags: ['CA Incident', 'Industry shock'], color: 'var(--v2-red-text)', type: 'incident' },
  { year: '2012', event: 'Baseline Requirements v1.0 — the constitution of web PKI', desc: 'The most important document in certificate history. All publicly-trusted TLS certificates must comply with the BRs, governing key size, validity periods, revocation, DCV methods, and audit requirements. Bylaws v1.0 also adopted.', tags: ['TLS BRs', 'Bylaws v1.0', 'Foundational'], color: 'var(--v2-green-text)', type: 'milestone' },
  { year: '2017', event: 'SHA-1 rejection — browsers enforce cryptographic standards', desc: 'Chrome and Firefox begin rejecting SHA-1 signed certificates globally. A watershed moment proving browser-CA collaboration can enforce cryptographic hygiene at internet scale. Symantec issued hundreds of test certs improperly, triggering distrust proceedings.', tags: ['SHA-1', 'Crypto deprecation'], color: 'var(--v2-amber-text)', type: 'enforcement' },
  { year: '2018', event: 'Symantec distrusted by Chrome and Mozilla', desc: 'After years of compliance failures and hundreds of misissued certificates, Google and Mozilla removed Symantec CA roots from their trust stores. DigiCert acquired Symantec\'s PKI business. Largest CA distrust event to that point.', tags: ['CA Distrust', 'Google', 'Mozilla'], color: 'var(--v2-red-text)', type: 'incident' },
  { year: '2019', event: 'Working Group structure adopted — Bylaws v2.2', desc: 'Forum restructures into formal Working Groups: Server Certificate WG, Code Signing WG, and Network Security WG each with their own charters, ballots, and leadership. Improves governance and specialisation.', tags: ['Bylaws v2.2', 'WG Structure'], color: 'var(--v2-green-text)', type: 'milestone' },
  { year: '2020', event: 'Apple enforces 1-year max validity — unilaterally', desc: 'A CAB Forum ballot to reduce max validity failed. Apple bypassed the Forum entirely and enforced 398-day certificates directly in Safari. Chrome and Firefox followed. S/MIME Working Group chartered later in 2020.', tags: ['1-year validity', 'Apple', 'Industry shock', 'S/MIME WG'], color: 'var(--v2-amber-text)', type: 'enforcement' },
  { year: '2021', event: 'S/MIME Baseline Requirements work begins', desc: 'The newly-formed S/MIME Certificate Working Group begins drafting the first-ever Baseline Requirements for S/MIME certificates. Stephen Davidson of DigiCert chairs. v1.0 published January 2023.', tags: ['S/MIME WG', 'Stephen Davidson'], color: 'var(--v2-green-text)', type: 'milestone' },
  { year: '2023', event: 'SC063 — OCSP made optional, CRLs required', desc: 'A landmark privacy decision: OCSP stapling becomes optional while CRL availability is mandated. Reduces the privacy risk of OCSP responders tracking which websites users visit while maintaining revocation infrastructure.', tags: ['OCSP', 'CRL', 'Privacy', 'SC063v4'], color: 'var(--v2-green-text)', type: 'ballot' },
  { year: '2024', event: 'Entrust distrusted by Chrome and Mozilla', desc: 'The largest CA distrust event in web PKI history. After repeated compliance failures and inability to meet commitments, Google Chrome and Mozilla Firefox removed Entrust from their root stores. Over 26 million active certificates affected. Other browsers followed.', tags: ['Entrust', 'CA Distrust', 'Chrome', 'Mozilla', 'Critical'], color: 'var(--v2-red-text)', type: 'incident' },
  { year: '2024', event: 'SC067v3 — Multi-Perspective Issuance Corroboration', desc: 'CAs must now validate domain control from multiple geographically-distributed network perspectives simultaneously. Prevents BGP hijacking attacks against the certificate issuance process — a major security architecture upgrade.', tags: ['MPIC', 'BGP security', 'SC067v3'], color: 'var(--v2-green-text)', type: 'ballot' },
  { year: '2025', event: 'SC081v3 — The 47-day mandate — most impactful ballot since BRs', desc: 'Passed April 2025. Introduces a phased validity reduction: 200 days by March 2026, 100 days by March 2027, 47 days by March 2029. Makes zero-touch automation a legal requirement, not an option. Every CA, CLM vendor and DevOps team must rearchitect their issuance pipelines.', tags: ['SC081v3', '47-day', 'Automation', 'Critical', 'Landmark'], color: 'var(--v2-red-text)', type: 'ballot' },
  { year: '2025', event: 'SC088v3 — Persistent DNS TXT DCV method', desc: 'New validation method using a permanent DNS TXT record instead of per-issuance challenges — enables fully automated certificate renewal at any validity period, including 47 days.', tags: ['SC088v3', 'ACME', 'DCV automation'], color: 'var(--v2-green-text)', type: 'ballot' },
  { year: '2026', event: 'SC097 — SHA-1 fully prohibited in all certificates and CRLs', desc: 'Final SHA-1 sunset. Every remaining use of SHA-1 in certificate chains and CRL signatures is now prohibited. Any Intermediate CA cert still using SHA-1 must be revoked.', tags: ['SC097', 'SHA-1 sunset', 'Crypto'], color: 'var(--v2-amber-text)', type: 'ballot' },
]

const WORKING_GROUPS = [
  { id: 'server', name: 'Server Certificate WG', short: 'SCWG', color: '#0d9488', chair: 'Dimitris Zacharopoulos', chairOrg: 'HARICA', vchair: 'Wayne Thayer', vchairOrg: 'Fastly', latestBR: 'TLS BR v2.2.7', latestBallot: 'SC099', desc: 'Governs all publicly-trusted TLS/SSL certificates. Produces the Baseline Requirements — the primary rulebook for web PKI. Covers DCV methods, validity, key requirements, revocation, audit, and CT logging.', ballotPrefix: 'SC', members: 53, docs: 'https://cabforum.org/working-groups/server/' },
  { id: 'smime', name: 'S/MIME Certificate WG', short: 'SMCWG', color: '#C45A4A', chair: 'Stephen Davidson', chairOrg: 'DigiCert', vchair: 'Martijn Katerbarg', vchairOrg: 'Sectigo', latestBR: 'S/MIME BR v1.0.14', latestBallot: 'SMC016', desc: 'Produces the S/MIME Baseline Requirements governing email encryption and signing certificates. Chartered in 2020, first BRs published 2023. Covers mailbox-validated, org-validated, sponsor-validated and individual-validated S/MIME certs.', ballotPrefix: 'SMC', members: 38, docs: 'https://cabforum.org/working-groups/smime/' },
  { id: 'codesign', name: 'Code Signing WG', short: 'CSCWG', color: '#C45A4A', chair: 'Martijn Katerbarg', chairOrg: 'Sectigo', vchair: 'Thomas Zermeno', vchairOrg: 'SSL.com', latestBR: 'Code Signing BR v3.8', latestBallot: 'CSC-25', desc: 'Governs code signing certificates used to authenticate software publishers. Covers EV code signing, timestamping, private key protection requirements, and the transition to cloud-based signing services.', ballotPrefix: 'CSC', members: 31, docs: 'https://cabforum.org/working-groups/code-signing/' },
  { id: 'netsec', name: 'Network Security WG', short: 'NSWG', color: '#0d9488', chair: 'Clint Wilson', chairOrg: 'Apple', vchair: 'David Kluge', vchairOrg: 'Google Trust Services', latestBR: 'NetSec BR v2.0.5', latestBallot: 'NS-008', desc: 'Focuses on CA infrastructure security — network architecture, physical security, logical access controls, incident response, and system monitoring. Covers all systems involved in certificate issuance and management.', ballotPrefix: 'NS', members: 28, docs: 'https://cabforum.org/working-groups/netsec/' },
  { id: 'definitions', name: 'Definitions & Glossary WG', short: 'DWG', color: 'rgba(0,0,0,0.55)', chair: 'Tim Hollebeek', chairOrg: 'DigiCert', vchair: '—', vchairOrg: '', latestBR: 'Definitions v1.0', latestBallot: '—', desc: 'Maintains consistent terminology across all CAB Forum documents. Ensures that terms like "Applicant", "Subscriber", "Relying Party", and "Certificate Consumer" have unified definitions across all Working Group standards.', ballotPrefix: 'DEF', members: 22, docs: 'https://cabforum.org/working-groups/definitions/' },
]

const CA_MEMBERS = ['AC Camerfirma','Actalis','Amazon Trust Services','Asseco/Certum','Beijing CA','Buypass','Certigna','certSIGN','CFCA','Chunghwa Telecom','Cybertrust Japan','DigiCert','Digidentity','Disig','DocuSign','D-TRUST','eMudhra','Entrust','E-tugra','Fastly','GDCA','GlobalSign','GoDaddy','HARICA','IdenTrust','iTrusChina','Izenpe','Japan Registry Services','Kamu SM','KPN',"Let's Encrypt",'MOIS Korea','MSC Trustgate','NAVER Cloud','Network Solutions','OISTE','SDAIA','SECOM Trust','Sectigo','SHECA','SK ID Solutions','SSL.com','SwissSign','Telia','TrustAsia','TWCA','Visa']

const BROWSER_MEMBERS = ['Apple','Brave','Chrome/Google','Cisco','Microsoft','Mozilla','Opera','360 Browser']

// ── Helpers ───────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.round(diff / 86400000)
}

const statusColor = (s) => {
  if (!s) return 'var(--v2-text-3)'
  const l = s.toLowerCase()
  if (['passed','adopted'].includes(l)) return 'var(--v2-green-text)'
  if (['failed','withdrawn'].includes(l)) return 'var(--v2-red-text)'
  if (['voting','discussion','ipr review'].some(x => l.includes(x))) return 'var(--v2-green-text)'
  if (l === 'draft') return 'var(--v2-amber-text)'
  return 'var(--v2-text-2)'
}

const statusChipClass = (s) => {
  if (!s) return 'chip-grey'
  const l = s.toLowerCase()
  if (['passed','adopted'].includes(l)) return 'chip-green'
  if (['failed','withdrawn'].includes(l)) return 'chip-red'
  if (['voting period','discussion period','ipr review'].some(x => l.includes(x))) return 'chip-blue'
  if (l === 'draft') return 'chip-amber'
  return 'chip-grey'
}

const impactChip = (lvl) => {
  if (lvl === 'critical') return { cls: 'chip-red', label: 'Critical' }
  if (lvl === 'high') return { cls: 'chip-amber', label: 'High impact' }
  return null
}

const wgChip = (wg) => {
  const map = { 'Server Cert WG': 'chip-blue', 'S/MIME WG': 'chip-amber', 'Code Signing WG': 'chip-amber', 'NetSec WG': 'chip-green', 'Forum': 'chip-grey' }
  return map[wg] || 'chip-grey'
}

// ── Components ────────────────────────────────────────────────────────
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Chip({ cls, children }) {
  return <span className={`v2-chip ${cls}`}>{children}</span>
}

function Pill({ color, bg, border, children }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:100,
      fontSize:10, fontWeight:600, whiteSpace:'nowrap', flexShrink:0, lineHeight:1.4,
      color, background:bg, border:`0.5px solid ${border}` }}>
      {children}
    </span>
  )
}

const STATUS_STYLE = {
  passed:   { color:'#0d9488', bg:'#ccfbf1', border:'#A8E6DE' },
  adopted:  { color:'#0d9488', bg:'#ccfbf1', border:'#A8E6DE' },
  withdrawn:{ color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
  failed:   { color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
  draft:    { color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
}
const WG_STYLE = {
  'Server Cert WG': { color:'#0d9488', bg:'#ccfbf1', border:'#A8E6DE' },
  'S/MIME WG':      { color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
  'Code Signing WG':{ color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
  'NetSec WG':      { color:'#0d9488', bg:'#ccfbf1', border:'#A8E6DE' },
  'Forum':          { color:'#7A9E9B', bg:'#f0fdf9', border:'#EDE8DE' },
}
const IMPACT_STYLE = {
  critical: { color:'#b91c1c', bg:'#fef2f2', border:'#fecaca' },
  high:     { color:'#C45A4A', bg:'#fde8e4', border:'#F2C4BC' },
}

function BallotRow({ b, onClick }) {
  const imp = b.impact_level ? IMPACT_STYLE[b.impact_level.toLowerCase()] : null
  const impLabel = b.impact_level === 'critical' ? 'Critical' : b.impact_level === 'high' ? 'High impact' : null
  const st = STATUS_STYLE[(b.status||'').toLowerCase()] || { color:'#7A9E9B', bg:'#f0fdf9', border:'#EDE8DE' }
  const wg = WG_STYLE[b.working_group] || { color:'#7A9E9B', bg:'#f0fdf9', border:'#EDE8DE' }

  return (
    <div onClick={() => onClick(b)} style={{
      cursor:'pointer', padding:'12px 16px',
      borderBottom:'0.5px solid var(--v2-border)',
      transition:'background .1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background='var(--v2-hover)'}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}>

      {/* ID + Title + Impact chip */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:5 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700,
          color:'var(--v2-text-3)', flexShrink:0, paddingTop:2 }}>{b.ballot_id}</span>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', lineHeight:1.3, flex:1, minWidth:0 }}>
          {b.title}
        </span>
        {imp && impLabel && <Pill {...imp}>{impLabel}</Pill>}
      </div>

      {/* Description */}
      {b.plain_english && (
        <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.6, marginBottom:8, paddingLeft:0 }}>
          {b.plain_english}
        </div>
      )}

      {/* Meta row: WG · author · date · br_version · status */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <Pill {...wg}>{b.working_group}</Pill>
        {b.proposed_by && (
          <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>
            {b.proposed_by}{b.proposed_org ? ` · ${b.proposed_org}` : ''}
          </span>
        )}
        {b.voting_closed && (
          <span style={{ fontSize:11, color:'var(--v2-text-3)' }}>{fmtDate(b.voting_closed)}</span>
        )}
        {b.br_version && (
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            color:'var(--v2-green-text)', background:'var(--v2-green-bg)',
            padding:'1px 6px', borderRadius:4, border:'0.5px solid var(--v2-green-border)' }}>
            {b.br_version}
          </span>
        )}
        <Pill {...st}>{b.status || '—'}</Pill>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function CABForumNewsroom({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('news')
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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: b }, { data: p }, { data: s }] = await Promise.all([
        supabase.from('cabf_ballots').select('*').order('voting_closed', { ascending: false, nullsFirst: false }),
        supabase.from('cabf_posts').select('*').order('published_at', { ascending: false }).limit(30),
        supabase.from('cabf_sync_log').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setBallots(b || [])
      setPosts(p || [])
      if (s?.synced_at) setSyncedAt(s.synced_at)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const triggerSync = async () => {
    setSyncing(true); setSyncMsg('Fetching from CAB Forum…')
    try {
      const res = await fetch(SYNC_FN, { method: 'POST' })
      const j = await res.json()
      setSyncMsg(j.success ? `Synced — ${j.ballots_upserted} ballots, ${j.posts_upserted} posts` : 'Sync failed')
      await loadData()
    } catch (e) { setSyncMsg('Sync failed: ' + e.message) }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const syncAge = syncedAt ? (() => {
    const h = Math.round((Date.now() - new Date(syncedAt)) / 3600000)
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
  })() : 'never'

  const filteredBallots = ballots.filter(b => {
    if (wgFilter !== 'all' && b.working_group !== wgFilter) return false
    if (statusFilter === 'passed' && !['Passed','Adopted'].includes(b.status)) return false
    if (statusFilter === 'active' && !['Voting Period','Discussion Period','IPR Review','Draft'].some(s => b.status?.includes(s) || b.status === 'Draft')) return false
    if (statusFilter === 'failed' && !['Failed','Withdrawn'].includes(b.status)) return false
    if (query) {
      const q = query.toLowerCase()
      return (b.title || '').toLowerCase().includes(q) || (b.ballot_id || '').toLowerCase().includes(q) || (b.plain_english || '').toLowerCase().includes(q)
    }
    return true
  })

  const criticalBallots = ballots.filter(b => b.impact_level === 'critical' && b.status === 'Passed')
  const urgentDeadline = COMPLIANCE_DEADLINES.find(d => d.status === 'urgent')
  const urgentDays = urgentDeadline ? daysUntil(urgentDeadline.date) : null

  return (
    <div className="v2-page">
      <style>{`
        .cabf-page { font-family: ${S.font} }
        .sync-bar { background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:7px 24px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--v2-text-2);gap:12px;flex-wrap:wrap }
        .live-dot { display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;animation:blink 2.4s infinite }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .hero-band { background:var(--v2-border-focus,#0a0a0a);padding:32px 24px 28px;color:#fff }
        .hero-eyebrow { font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.4);text-transform:uppercase;font-weight:500;margin-bottom:8px }
        .hero-h1 { font-size:26px;font-weight:600;letter-spacing:-.4px;color:#fff;line-height:1.2;margin-bottom:10px }
        .hero-h1 em { color:#0d9488;font-style:normal }
        .hero-sub { font-size:13px;color:rgba(255,255,255,.55);max-width:min(640px,100%);line-height:1.7;margin-bottom:20px }
        .hero-stats { display:flex;gap:28px;flex-wrap:wrap }
        .hstat-n { font-size:22px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums;line-height:1 }
        .hstat-l { font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:.05em;text-transform:uppercase }
        .compliance-alert { background:var(--v2-amber-bg);border-bottom:0.5px solid var(--v2-amber-border);padding:9px 24px;display:flex;align-items:center;gap:12px;font-size:12px;flex-wrap:wrap }
        .ca-text { color:var(--v2-amber-text);flex:1;font-weight:500 }
        .ca-days { font-family:${S.mono};font-size:14px;font-weight:600;color:var(--v2-amber-text) }
        .page-tabs { border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;background:var(--v2-surface-2) }
        .page-tab { background:none;border:none;border-bottom:1.5px solid transparent;font-family:${S.font};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:22px;cursor:pointer;margin-bottom:-0.5px;transition:color .12s;display:flex;align-items:center;gap:7px }
        .page-tab:hover { color:var(--v2-text) }
        .page-tab.on { color:var(--v2-text);border-bottom-color:var(--v2-text) }
        .page-tab .cnt { font-size:10px;font-weight:500;background:var(--v2-hover);border-radius:100px;padding:1px 7px;color:var(--v2-text-3) }
        .page-tab.on .cnt { background:var(--v2-text);color:#fff }
        .content-grid { display:grid;grid-template-columns:1fr 300px;gap:0;align-items:start }
        .main-pane { border-right:0.5px solid var(--v2-border);min-height:600px }
        .side-pane { padding:16px }
        .pane-head { display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2);flex-wrap:wrap;gap:8px }
        .pane-label { font-size:11px;letter-spacing:.06em;color:var(--v2-text-3);text-transform:uppercase;font-weight:500 }
        .filter-bar { padding:9px 14px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2);display:flex;gap:5px;flex-wrap:wrap;align-items:center }
        .fchip { font-size:11px;font-weight:500;padding:3px 10px;border-radius:var(--v2-r-sm);border:0.5px solid transparent;color:var(--v2-text-2);background:transparent;font-family:${S.font};cursor:pointer;transition:background .1s }
        .fchip:hover { background:var(--v2-hover) }
        .fchip.on { background:var(--v2-surface);border-color:var(--v2-border-strong);color:var(--v2-text);box-shadow:var(--v2-shadow-sm) }
        .side-card { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);overflow:hidden;margin-bottom:14px }
        .sc-head { padding:10px 12px;border-bottom:0.5px solid var(--v2-border);background:var(--v2-surface-2) }
        .sc-title { font-size:11px;letter-spacing:.06em;color:var(--v2-text-3);text-transform:uppercase;font-weight:500 }
        .sc-body { padding:10px 12px }
        .deadline-row { display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:0.5px solid var(--v2-border) }
        .deadline-row:last-child { border-bottom:none }
        .dl-n { font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;font-family:${S.mono};line-height:1 }
        .dl-unit { font-size:9px;color:var(--v2-text-3);text-transform:uppercase;letter-spacing:.04em }
        .dl-title { font-size:11px;font-weight:500;color:var(--v2-text);margin-bottom:2px }
        .dl-sub { font-size:10px;color:var(--v2-text-2) }
        .tl-wrap { padding:16px }
        .tl-row { display:flex;gap:12px;margin-bottom:12px }
        .tl-yr { font-family:${S.mono};font-size:10px;font-weight:600;color:var(--v2-text-3);min-width:34px;text-align:right;padding-top:2px }
        .tl-dot-col { display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0 }
        .tl-dot { width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:2px }
        .tl-line { width:1px;background:var(--v2-border);flex:1;min-height:12px;margin-top:3px }
        .tl-body { flex:1;padding-bottom:10px }
        .tl-event { font-size:12px;font-weight:500;color:var(--v2-text);margin-bottom:4px;line-height:1.4 }
        .tl-desc { font-size:11px;color:var(--v2-text-2);line-height:1.6 }
        .tl-tags { display:flex;gap:4px;flex-wrap:wrap;margin-top:6px }
        .wg-card { background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:16px;margin-bottom:12px;cursor:pointer;transition:border-color .12s }
        .wg-card:hover { border-color:var(--v2-border-strong) }
        .wg-card.selected { border-color:var(--v2-green-border);background:var(--v2-green-bg) }
        .wg-top { display:flex;align-items:flex-start;gap:12px;margin-bottom:10px }
        .wg-badge { width:36px;height:36px;border-radius:var(--v2-r-lg);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;letter-spacing:.02em }
        .wg-meta { display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:10px;padding-top:10px;border-top:0.5px solid var(--v2-border) }
        .wm-k { font-size:10px;color:var(--v2-text-3);margin-bottom:2px }
        .wm-v { font-size:12px;font-weight:500;color:var(--v2-text) }
        .member-grid { display:flex;flex-wrap:wrap;gap:5px }
        .mem-pill { font-size:10px;padding:2px 9px;border-radius:20px;background:var(--v2-surface-3,var(--v2-hover));border:0.5px solid var(--v2-border);color:var(--v2-text-2);cursor:pointer;transition:all .1s }
        .mem-pill:hover { background:var(--v2-green-bg);color:var(--v2-green-text);border-color:var(--v2-green-border) }
        .ballot-detail-panel { background:var(--v2-surface);border:0.5px solid var(--v2-green-border);border-radius:var(--v2-r-xl);padding:16px;margin:0 16px 16px }
        .bdp-title { font-size:15px;font-weight:600;color:var(--v2-text);margin-bottom:8px;line-height:1.3 }
        .bdp-field { padding:7px 0;border-bottom:0.5px solid var(--v2-border);display:flex;gap:12px }
        .bdp-field:last-child { border-bottom:none }
        .bdp-k { font-size:11px;color:var(--v2-text-3);min-width:90px;flex-shrink:0 }
        .bdp-v { font-size:12px;color:var(--v2-text);font-weight:500 }
        @media(max-width:900px){.content-grid{grid-template-columns:1fr}.side-pane{border-top:0.5px solid var(--v2-border)}}
        @media(max-width:min(767px,100%)){
          .hero-band{padding:20px 14px 18px}
          .hero-h1{font-size:20px}
          .hero-sub{font-size:12px}
          .hero-stats{gap:16px}
          .hstat-n{font-size:18px}
          .page-tabs{padding:0 10px;overflow-x:auto;-webkit-overflow-scrolling:touch}
          .pane-head{padding:10px 12px}
          .filter-bar{padding:8px 10px}
          .sync-bar{padding:6px 14px;font-size:11px}
          .compliance-alert{padding:8px 14px;font-size:11px}
          .side-pane{padding:12px}
          .tl-wrap{padding:12px}
          .ballot-detail-panel{margin:0 10px 10px}
        }
        /* ── Ballot row layout ─────────────────────────────── */
        .v2-list-row { display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--v2-border);transition:background .1s }
        .v2-list-row:hover { background:var(--v2-hover) }
        .v2-list-row:last-child { border-bottom:none }
        .v2-row-body { flex:1;min-width:0 }
        .v2-row-title-line { display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:4px }
        .v2-row-title { font-size:14px;font-weight:600;color:var(--v2-text);line-height:1.3 }
        .v2-row-meta { display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11px;color:var(--v2-text-2) }
        .v2-empty { text-align:center;padding:40px 16px;color:var(--v2-text-3) }
        .v2-empty-title { font-size:14px;font-weight:600;margin-bottom:6px }
        .v2-empty-desc { font-size:12px }
        /* ── Chips ─────────────────────────────────────────── */
        .v2-chip { display:inline-flex;align-items:center;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;white-space:nowrap;flex-shrink:0 }
        .chip-green { background:var(--v2-green-bg);color:var(--v2-green-text);border:0.5px solid var(--v2-green-border) }
        .chip-amber { background:var(--v2-amber-bg);color:var(--v2-amber-text);border:0.5px solid var(--v2-amber-border) }
        .chip-red { background:var(--v2-red-bg);color:var(--v2-red-text);border:0.5px solid var(--v2-red-border) }
        .chip-blue { background:#ccfbf1;color:#0d9488;border:0.5px solid #A8E6DE }
        .chip-grey { background:var(--v2-surface-3,var(--v2-hover));color:var(--v2-text-3);border:0.5px solid var(--v2-border) }
        /* ── Callouts ──────────────────────────────────────── */
        .v2-callout { padding:12px 14px;border-radius:var(--v2-r-lg);border:0.5px solid var(--v2-border);margin-bottom:10px }
        .v2-callout.tip { background:var(--v2-green-bg);border-color:var(--v2-green-border) }
        .v2-callout-title { font-size:11px;font-weight:700;color:var(--v2-green-text);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px }
        /* ── Mobile ballot rows ────────────────────────────── */
        @media(max-width:600px){
          .v2-list-row { flex-direction:column;gap:6px;padding:12px 12px }
          .v2-list-row > div:last-child { align-self:flex-start }
          .v2-row-title { font-size:13px }
          .content-grid { grid-template-columns:1fr!important }
          .side-pane { display:none }
          .page-tabs { overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none }
          .page-tabs::-webkit-scrollbar { display:none }
          .sync-bar { padding:6px 12px;font-size:11px }
          .hero-band { padding:18px 12px 16px }
          .hero-h1 { font-size:19px }
          .hero-stats { gap:14px }
          .filter-bar { padding:8px 10px }
          .pane-head { padding:10px 12px;flex-wrap:wrap;gap:6px }
        }`}</style>

      {/* Sync banner */}
      <div className="sync-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="live-dot" />
          <span>CAB Forum data · synced {syncAge} · {ballots.length} ballots · {posts.length} posts indexed</span>
          {syncMsg && <span style={{ color: 'var(--v2-amber-text)', fontWeight: 500 }}>{syncMsg}</span>}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="v2-btn v2-btn-sm" onClick={triggerSync} disabled={syncing} style={{ gap: 5 }}>
            <RefreshCw size={13} /> {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <a href="https://cabforum.org" target="_blank" rel="noreferrer" className="v2-btn v2-btn-sm" style={{ gap: 5, textDecoration: 'none' }}>
            <ExternalLink size={12} /> CAB Forum ↗
          </a>
        </div>
      </div>

      {/* Compliance alert */}
      {urgentDays !== null && urgentDays > 0 && (
        <div className="compliance-alert">
          <AlertTriangle size={15} style={{ color: 'var(--v2-amber-text)', flexShrink: 0 }} />
          <span className="ca-text">200-day certificate validity limit — enforcement date approaching</span>
          <span className="ca-days">{urgentDays} days left</span>
          <span style={{ fontFamily: S.mono, fontSize:11, color: 'var(--v2-amber-text)' }}>March 15, 2026 · SC081v3</span>
          <button className="v2-btn v2-btn-sm" onClick={() => setTab('deadlines')} style={{ fontSize:10, padding: '3px 9px' }}>See all deadlines →</button>
        </div>
      )}

      {/* Hero */}
      <div className="hero-band">
        <div className="hero-eyebrow">SSLVault PKI Intelligence · Powered by CAB Forum</div>
        <div className="hero-h1">Every ballot, every standard, every decision — <em>decoded.</em></div>
        <div className="hero-sub">The most comprehensive CA/Browser Forum intelligence platform ever built. Every ballot explained in plain English, every compliance deadline tracked with countdowns, 20 years of PKI history in one timeline, every working group and member documented. No other platform goes this deep.</div>
        <div className="hero-stats">
          <div><div className="hstat-n">{ballots.length || 21}+</div><div className="hstat-l">Ballots tracked</div></div>
          <div><div className="hstat-n">5</div><div className="hstat-l">Working groups</div></div>
          <div><div className="hstat-n">67</div><div className="hstat-l">F2F meetings</div></div>
          <div><div className="hstat-n">{CA_MEMBERS.length}+</div><div className="hstat-l">CA members</div></div>
          <div><div className="hstat-n">2005</div><div className="hstat-l">Founded</div></div>
          <div><div className="hstat-n">v2.2.7</div><div className="hstat-l">Latest TLS BR</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="page-tabs">
        {[
          { id: 'news', label: 'Ballots & News', cnt: ballots.length },
          { id: 'deadlines', label: 'Compliance Deadlines', cnt: COMPLIANCE_DEADLINES.length },
          { id: 'timeline', label: 'PKI Timeline', cnt: TIMELINE.length },
          { id: 'workinggroups', label: 'Working Groups', cnt: 5 },
          { id: 'members', label: 'Members', cnt: CA_MEMBERS.length + BROWSER_MEMBERS.length },
        ].map(({ id, label, cnt }) => (
          <button key={id} className={`page-tab${tab === id ? ' on' : ''}`} onClick={() => { setTab(id); setSelectedBallot(null) }}>
            {label} <span className="cnt">{cnt}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: BALLOTS & NEWS ── */}
      {tab === 'news' && (
        <div className="content-grid">
          <div className="main-pane">
            <div className="pane-head">
              <span className="pane-label">All ballots — plain English explained</span>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border-strong)', borderRadius: 'var(--v2-r-md)', padding: '5px 10px', flex: 1 }}>
                  <Search size={13} color="var(--v2-text-3)" />
                  <input type="text" placeholder="Search ballots…" value={query} onChange={e => setQuery(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize:12, color: 'var(--v2-text)', fontFamily: S.font, width: 160 }} />
                </div>
              </div>
            </div>
            <div className="filter-bar">
              <span style={{ fontSize:11, color: 'var(--v2-text-3)', marginRight: 4 }}>WG:</span>
              {['all','Server Cert WG','S/MIME WG','Code Signing WG','NetSec WG','Forum'].map(f => (
                <button key={f} className={`fchip${wgFilter === f ? ' on' : ''}`} onClick={() => setWgFilter(f)}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
              <span style={{ fontSize:11, color: 'var(--v2-text-3)', marginLeft: 8, marginRight: 4 }}>Status:</span>
              {[['all','All'],['passed','Passed'],['active','Active'],['failed','Failed/Withdrawn']].map(([k,l]) => (
                <button key={k} className={`fchip${statusFilter === k ? ' on' : ''}`} onClick={() => setStatusFilter(k)}>{l}</button>
              ))}
            </div>

            {/* Ballot detail panel */}
            {selectedBallot && (
              <div className="ballot-detail-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div className="bdp-title">{selectedBallot.ballot_id} — {selectedBallot.title}</div>
                  <button className="v2-btn v2-btn-sm" onClick={() => setSelectedBallot(null)} style={{ fontSize:11, flexShrink: 0 }}>✕ Close</button>
                </div>
                {selectedBallot.plain_english && (
                  <div className="v2-callout tip" style={{ marginBottom: 12 }}>
                    <div className="v2-callout-title">Plain English summary</div>
                    {selectedBallot.plain_english}
                  </div>
                )}
                <div>
                  {[
                    { k: 'Working Group', v: selectedBallot.working_group },
                    { k: 'Status', v: selectedBallot.status },
                    { k: 'Result', v: selectedBallot.result },
                    { k: 'Proposed by', v: selectedBallot.proposed_by ? `${selectedBallot.proposed_by} · ${selectedBallot.proposed_org}` : '—' },
                    { k: 'Vote closed', v: fmtDate(selectedBallot.voting_closed) },
                    { k: 'BR version', v: selectedBallot.br_version || '—' },
                    { k: 'Impact', v: selectedBallot.impact_level || 'normal' },
                  ].map(({ k, v }) => (
                    <div key={k} className="bdp-field">
                      <div className="bdp-k">{k}</div>
                      <div className="bdp-v">{v}</div>
                    </div>
                  ))}
                </div>
                {selectedBallot.url && (
                  <a href={selectedBallot.url} target="_blank" rel="noreferrer" className="v2-btn" style={{ marginTop: 10, gap: 5, textDecoration: 'none', display: 'inline-flex' }}>
                    <ExternalLink size={12} /> Read full ballot on CAB Forum ↗
                  </a>
                )}
              </div>
            )}

            {/* Ballot list */}
            <div className="v2-card" style={{ borderRadius: 0, border: 'none' }}>
              {loading ? (
                <div style={{ padding: 24 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="v2-list-row" style={{ opacity: 0.4 }}>
                      <div style={{ height: 12, background: 'var(--v2-hover)', borderRadius: 4, width: '80%' }} />
                    </div>
                  ))}
                </div>
              ) : filteredBallots.length === 0 ? (
                <div className="v2-empty">
                  <div className="v2-empty-title">No ballots match</div>
                  <div className="v2-empty-desc">Try adjusting your filters or search query.</div>
                </div>
              ) : (
                filteredBallots.map(b => (
                  <BallotRow key={b.ballot_id} b={b} onClick={setSelectedBallot} />
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="side-pane">
            {/* Critical ballots */}
            <div className="side-card">
              <div className="sc-head"><span className="sc-title">Critical ballots</span></div>
              <div className="sc-body">
                {criticalBallots.slice(0, 5).map(b => (
                  <div key={b.ballot_id} onClick={() => setSelectedBallot(b)} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--v2-border)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: S.mono, fontSize:10, fontWeight: 600, color: 'var(--v2-text-2)' }}>{b.ballot_id}</span>
                      <Chip cls="chip-red">Critical</Chip>
                    </div>
                    <div style={{ fontSize:11, fontWeight: 500, color: 'var(--v2-text)', lineHeight: 1.4 }}>{b.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BR versions */}
            <div className="side-card">
              <div className="sc-head"><span className="sc-title">Current BR versions</span></div>
              <div className="sc-body">
                {[
                  { name: 'TLS Baseline Requirements', version: 'v2.2.7', date: 'May 2026', ballot: 'SC099' },
                  { name: 'S/MIME Baseline Requirements', version: 'v1.0.14', date: 'May 2026', ballot: 'SMC016' },
                  { name: 'Code Signing BR', version: 'v3.8', date: 'Aug 2024', ballot: 'CSC-25' },
                  { name: 'Network Security BR', version: 'v2.0.5', date: 'Jul 2025', ballot: 'NS-008' },
                ].map(({ name, version, date, ballot }) => (
                  <div key={name} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight: 500, color: 'var(--v2-text)' }}>{name}</div>
                      <div style={{ fontSize:10, color: 'var(--v2-text-3)' }}>{date} · {ballot}</div>
                    </div>
                    <Chip cls="chip-green">{version}</Chip>
                  </div>
                ))}
              </div>
            </div>

            {/* Forum leadership */}
            <div className="side-card">
              <div className="sc-head"><span className="sc-title">Forum leadership 2024–2026</span></div>
              <div className="sc-body">
                {[
                  { role: 'Forum Chair', name: 'Dean Coclin', org: 'DigiCert' },
                  { role: 'Forum Vice Chair', name: 'Tim Callan', org: 'Sectigo' },
                  { role: 'Server Cert WG Chair', name: 'Dimitris Zacharopoulos', org: 'HARICA' },
                  { role: 'S/MIME WG Chair', name: 'Stephen Davidson', org: 'DigiCert' },
                  { role: 'NetSec WG Chair', name: 'Clint Wilson', org: 'Apple' },
                  { role: 'Code Signing WG Chair', name: 'Martijn Katerbarg', org: 'Sectigo' },
                ].map(({ role, name, org }) => (
                  <div key={role} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                    <div style={{ fontSize:10, color: 'var(--v2-text-3)', marginBottom: 2 }}>{role}</div>
                    <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)' }}>{name} <span style={{ fontWeight: 400, color: 'var(--v2-text-2)' }}>· {org}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: COMPLIANCE DEADLINES ── */}
      {tab === 'deadlines' && (
        <div className="v2-container">
          <div style={{ marginBottom: 20 }}>
            <h1 className="v2-h1" style={{ marginBottom: 4 }}>Compliance deadline calendar</h1>
            <p className="v2-subtitle">Every upcoming CAB Forum enforcement date — with live countdowns and required actions.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            {COMPLIANCE_DEADLINES.map((d) => {
              const days = daysUntil(d.date)
              const isPast = days !== null && days < 0
              return (
                <div key={d.title} className="v2-card v2-card-pad" style={{ borderLeft: `3px solid ${d.color}`, borderRadius: '0 var(--v2-r-xl) var(--v2-r-xl) 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize:14, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>{d.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: S.mono, fontSize:11, color: 'var(--v2-text-3)' }}>{d.date}</span>
                        <Chip cls="chip-grey">{d.ballot}</Chip>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      {isPast ? (
                        <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text-3)' }}>In effect</div>
                      ) : (
                        <>
                          <div style={{ fontSize:24, fontWeight: 700, color: d.color, fontFamily: S.mono, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{days}</div>
                          <div style={{ fontSize:10, color: 'var(--v2-text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>days left</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="v2-callout tip" style={{ fontSize:12 }}>{d.action}</div>
                </div>
              )
            })}
          </div>
          <div className="v2-callout warning" style={{ marginTop: 24 }}>
            <div className="v2-callout-title">What this means for SSLVault customers</div>
            SSLVault's persistent VPS agent and DNS auto-renew already handle automated renewal at any validity period. Enable auto-renew on your certificates now to be compliant with the 200-day limit before March 2026 — and ready for 47 days by 2029.
          </div>
        </div>
      )}

      {/* ── TAB: PKI TIMELINE ── */}
      {tab === 'timeline' && (
        <div className="v2-container">
          <div style={{ marginBottom: 20 }}>
            <h1 className="v2-h1" style={{ marginBottom: 4 }}>PKI history timeline</h1>
            <p className="v2-subtitle">20 years of CA/Browser Forum — every landmark ballot, distrust event, and industry milestone.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 14 }}>
            <div>
              <div className="tl-wrap" style={{ padding: 0 }}>
                {TIMELINE.filter((_, i) => i % 2 === 0).map((e, i, arr) => (
                  <div key={e.year + e.event} className="tl-row">
                    <div className="tl-yr">{e.year}</div>
                    <div className="tl-dot-col">
                      <div className="tl-dot" style={{ background: e.color, border: `1.5px solid ${e.color}` }} />
                      {i < arr.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <div className="tl-event">{e.event}</div>
                      <div className="tl-desc">{e.desc}</div>
                      <div className="tl-tags">
                        {e.tags.map(t => <span key={t} className="v2-chip chip-grey" style={{ fontSize: 9 }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="tl-wrap" style={{ padding: 0 }}>
                {TIMELINE.filter((_, i) => i % 2 === 1).map((e, i, arr) => (
                  <div key={e.year + e.event} className="tl-row">
                    <div className="tl-yr">{e.year}</div>
                    <div className="tl-dot-col">
                      <div className="tl-dot" style={{ background: e.color, border: `1.5px solid ${e.color}` }} />
                      {i < arr.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-body">
                      <div className="tl-event">{e.event}</div>
                      <div className="tl-desc">{e.desc}</div>
                      <div className="tl-tags">
                        {e.tags.map(t => <span key={t} className="v2-chip chip-grey" style={{ fontSize: 9 }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: WORKING GROUPS ── */}
      {tab === 'workinggroups' && (
        <div className="v2-container">
          <div style={{ marginBottom: 20 }}>
            <h1 className="v2-h1" style={{ marginBottom: 4 }}>Working groups</h1>
            <p className="v2-subtitle">Five specialised groups govern different aspects of publicly-trusted certificates. Each produces its own Baseline Requirements.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 14 }}>
            {WORKING_GROUPS.map(wg => (
              <div key={wg.id} className={`wg-card${selectedWG?.id === wg.id ? ' selected' : ''}`} onClick={() => setSelectedWG(selectedWG?.id === wg.id ? null : wg)}>
                <div className="wg-top">
                  <div className="wg-badge" style={{ background: wg.color }}>{wg.short}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize:14, fontWeight: 600, color: 'var(--v2-text)', marginBottom: 3 }}>{wg.name}</div>
                    <div style={{ fontSize:12, color: 'var(--v2-text-2)', lineHeight: 1.5 }}>{wg.desc}</div>
                  </div>
                </div>
                <div className="wg-meta">
                  <div><div className="wm-k">Chair</div><div className="wm-v">{wg.chair} <span style={{ fontWeight: 400, color: 'var(--v2-text-2)' }}>· {wg.chairOrg}</span></div></div>
                  <div><div className="wm-k">Vice Chair</div><div className="wm-v">{wg.vchair} <span style={{ fontWeight: 400, color: 'var(--v2-text-2)' }}>{wg.vchairOrg ? '· ' + wg.vchairOrg : ''}</span></div></div>
                  <div><div className="wm-k">Latest standard</div><div className="wm-v" style={{ fontFamily: S.mono, fontSize:11, color: 'var(--v2-green-text)' }}>{wg.latestBR}</div></div>
                  <div><div className="wm-k">Latest ballot</div><div className="wm-v" style={{ fontFamily: S.mono, fontSize:11 }}>{wg.latestBallot}</div></div>
                  <div><div className="wm-k">Members</div><div className="wm-v">{wg.members}+</div></div>
                  <div><div className="wm-k">Ballot prefix</div><div className="wm-v" style={{ fontFamily: S.mono, fontSize:11 }}>{wg.ballotPrefix}-xxx</div></div>
                </div>
                {selectedWG?.id === wg.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--v2-border)' }}>
                    <a href={wg.docs} target="_blank" rel="noreferrer" className="v2-btn" style={{ gap: 5, textDecoration: 'none', display: 'inline-flex' }}>
                      <ExternalLink size={12} /> View on CAB Forum website ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: MEMBERS ── */}
      {tab === 'members' && (
        <div className="v2-container">
          <div style={{ marginBottom: 20 }}>
            <h1 className="v2-h1" style={{ marginBottom: 4 }}>CAB Forum members</h1>
            <p className="v2-subtitle">Certificate Authorities, Certificate Consumers, Associates and Interested Parties shaping global PKI standards.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div className="v2-card">
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>Certification Authorities</div>
                <Chip cls="chip-blue">{CA_MEMBERS.length} CAs</Chip>
              </div>
              <div style={{ padding: 14 }}>
                <div className="member-grid">
                  {CA_MEMBERS.map(m => <span key={m} className="mem-pill">{m}</span>)}
                </div>
              </div>
            </div>
            <div className="v2-card">
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--v2-border)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>Certificate Consumers (Browsers & OS)</div>
                <Chip cls="chip-green">{BROWSER_MEMBERS.length} consumers</Chip>
              </div>
              <div style={{ padding: 14 }}>
                <div className="member-grid">
                  {BROWSER_MEMBERS.map(m => <span key={m} className="mem-pill" style={{ background: 'var(--v2-green-bg)', borderColor: 'var(--v2-green-border)', color: 'var(--v2-green-text)' }}>{m}</span>)}
                </div>
                <div className="v2-callout tip" style={{ marginTop: 12, fontSize:11 }}>
                  Certificate consumers (browsers and OS root store operators) have equal voting rights to CAs on all ballots. A ballot requires majority approval from both groups to pass.
                </div>
              </div>
            </div>
            <div className="v2-card">
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--v2-border)' }}>
                <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>Associates & Interested Parties</div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="member-grid">
                  {['ACAB Council','CPA Canada/WebTrust','ETSI','Keyfactor','US FPKIMA','KPMG','Deloitte','Cloudflare','EFF','ICANN','Netflix','Akamai'].map(m => (
                    <span key={m} className="mem-pill">{m}</span>
                  ))}
                </div>
                <div className="v2-callout info" style={{ marginTop: 12, fontSize:11 }}>
                  Associates and Interested Parties participate in discussions and may propose ballots, but do not have voting rights on ballots that affect standards.
                </div>
              </div>
            </div>
            <div className="v2-card">
              <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--v2-border)' }}>
                <div style={{ fontSize:13, fontWeight: 600, color: 'var(--v2-text)' }}>How membership works</div>
              </div>
              <div style={{ padding: 14 }}>
                {[
                  { title: 'Certificate Issuers (CAs)', desc: 'Must operate a publicly-trusted root certificate and pass a WebTrust or ETSI audit. Subject to a 6-month probationary period.' },
                  { title: 'Certificate Consumers', desc: 'Browsers, OS vendors, and application software that distribute root stores. Apple, Google, Microsoft, Mozilla are key members.' },
                  { title: 'Associates', desc: 'Organisations with close relationships to PKI — auditors (KPMG, Deloitte), standards bodies (ETSI, WebTrust), and government PKI programs.' },
                  { title: 'Interested Parties', desc: 'Individual experts and organisations who contribute to discussions without voting rights. EFF, Cloudflare, ICANN, Netflix are examples.' },
                ].map(({ title, desc }) => (
                  <div key={title} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--v2-border)' }}>
                    <div style={{ fontSize:12, fontWeight: 500, color: 'var(--v2-text)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize:11, color: 'var(--v2-text-2)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
