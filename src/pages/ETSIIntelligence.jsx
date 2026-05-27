import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','SF Mono',monospace"

const STANDARDS = [
  { id:'EN 319 401', title:'General Policy Requirements for TSPs', status:'Current', year:2021, desc:'The overarching framework governing all Trust Service Providers in Europe. Defines baseline security, operational, and audit requirements that every qualified TSP must meet before the more specific standards apply.' },
  { id:'EN 319 411-1', title:'Policy requirements for CAs issuing public key certificates', status:'Current', year:2018, desc:'Governs publicly-trusted CAs issuing end-entity certificates — the European counterpart to CA/Browser Forum Baseline Requirements. Defines DVCP, OVCP, and EVCP certificate policies for TLS certificates.' },
  { id:'EN 319 411-2', title:'Policy requirements for CAs issuing qualified certificates', status:'Current', year:2018, desc:'Defines QCP-n, QCP-l, QCP-n-qscd and QCP-l-qscd certificate policies for qualified certificates. These are legally binding across all EU member states under eIDAS regulation.' },
  { id:'EN 319 412 series', title:'Certificate profiles (parts 1–5)', status:'Current', year:2020, desc:'Five-part series defining precise ASN.1 profiles for natural person, legal person, web authentication, and qualified website authentication certificates (QWAC). The technical blueprint every EU-qualified CA follows.' },
  { id:'EN 319 421', title:'Policy requirements for TSPs issuing time-stamps', status:'Current', year:2016, desc:'Defines requirements for qualified electronic time-stamping services. A qualified timestamp is legally equivalent to a notarised date across all EU member states.' },
  { id:'EN 319 431', title:'Policy requirements for TSPs providing signature validation services', status:'Current', year:2019, desc:'Governs services that validate electronic signatures on behalf of relying parties — critical infrastructure for government e-procurement and legal document workflows.' },
  { id:'EN 319 521', title:'Policy requirements for TSPs providing preservation services', status:'Current', year:2019, desc:'Covers long-term preservation of signed documents — ensuring signatures remain verifiable decades after their cryptographic algorithms become obsolete. Critical for legal archives and healthcare records.' },
  { id:'TS 119 612', title:'Trusted List format and semantics', status:'Current', year:2020, desc:'Defines the XML format for EU Trusted Lists — the machine-readable registries that browsers and applications use to determine which TSPs are qualified. Each EU member state publishes one.' },
  { id:'EN 319 522', title:'Policy requirements for TSPs providing signature creation services', status:'Current', year:2020, desc:'Remote signing — governs TSPs that hold private keys on behalf of signatories and sign on their instruction. This is the standard behind services like DocuSign Qualified and Adobe Sign Qualified.' },
]

const TIMELINE = [
  { year:'1988', event:'ETSI founded', desc:'European Telecommunications Standards Institute established in Sophia Antipolis, France, by the European Commission. Initial mandate: telecommunications interoperability across Europe. PKI and e-signature work begins in the late 1990s.', type:'milestone' },
  { year:'1999', event:'EU Electronic Signatures Directive (1999/93/EC)', desc:'First EU legal framework for electronic signatures. ETSI ESI Technical Committee formed to produce technical standards supporting it. The beginning of European PKI standardisation with legal backing.', type:'milestone' },
  { year:'2001', event:'First ETSI TS 101 861 — Qualified Certificates', desc:'ETSI publishes first technical specification for qualified certificates under the 1999 EU Directive. Defines the certificate profile that makes a digital signature legally equivalent to a handwritten signature under European law.', type:'milestone' },
  { year:'2013', event:'EN 319 series development begins', desc:'ETSI ESI begins full redevelopment of its standard suite — the EN 319 series — to support the upcoming eIDAS regulation. A major multi-year effort to unify European PKI and trust service requirements across 27 member states.', type:'milestone' },
  { year:'2014', event:'eIDAS Regulation published — ETSI becomes primary standards body', desc:'EU Regulation 910/2014 references ETSI standards directly. ETSI ESI becomes the de facto technical standards body for all qualified trust services across 27 EU member states. EN 319 standards are referenced throughout the regulation.', type:'milestone' },
  { year:'2016', event:'EN 319 series published — eIDAS technical backbone complete', desc:'Core EN 319 401, 411, 412, and 421 series published. Every QTSP in Europe must now comply with these standards. ETSI EN 319 403 conformity assessments become mandatory for qualified trust service status.', type:'milestone' },
  { year:'2019', event:'ETSI ESI adds remote signing standards', desc:'EN 319 522 published — governing remote signing services where the private key is held by the TSP. Enables cloud-based qualified signatures at scale. Adobe, DocuSign, and banks use this framework to offer legally-binding digital signatures.', type:'milestone' },
  { year:'2022', event:'eIDAS 2.0 legislative process begins — ETSI updates standards', desc:'European Commission proposes eIDAS 2.0 with EU Digital Identity Wallet mandate. ETSI ESI begins updating EN 319 series to support new wallet architecture, QWAC browser trust requirements, and early PQC planning provisions.', type:'milestone' },
  { year:'2024', event:'eIDAS 2.0 published — ETSI standards binding for EUDIW', desc:'Regulation 2024/1183 published. ETSI ESI standards now govern not just certificates and signatures but the entire EU Digital Identity Wallet trust framework. QWAC browser mandate triggers governance controversy with browser vendors.', type:'milestone' },
  { year:'2025', event:'ETSI ESI begins PQC standard updates', desc:'ETSI ESI Technical Committee begins updating EN 319 series for post-quantum cryptography following NIST FIPS 203/204/205 publication. EN 319 412 certificate profiles must be extended with ML-DSA algorithm OIDs before European CAs can issue PQC-signed certificates.', type:'milestone' },
]

const CURRENT_INITIATIVES = [
  { title:'EN 319 series PQC update', status:'Active', desc:'Updating all EN 319 certificate and signature standards to support ML-KEM, ML-DSA, and SLH-DSA algorithms. The EN 319 412 certificate profiles must be extended with new algorithm OIDs before European CAs can issue PQC certificates at a qualified level.' },
  { title:'EU Digital Identity Wallet technical standards', status:'Active', desc:'ETSI ESI is producing the technical standards that implement eIDAS 2.0 and the European Digital Identity Wallet (EUDIW) architecture — including protocols for wallet-to-relying-party interaction, credential presentation, and selective disclosure.' },
  { title:'QWAC browser trust alignment', status:'Active', desc:'Following eIDAS 2.0 mandating that browsers trust government-issued QWAC certificates, ETSI and browser vendors are working through how ETSI-audited QTSPs will be included in browser root programmes — a historically unprecedented governance shift.' },
  { title:'Cloud signature standardisation (CSC API alignment)', status:'Active', desc:'ETSI is aligning EN 319 522 remote signing standards with the Cloud Signature Consortium API to ensure interoperability between European qualified signing services and global cloud signature implementations used in DocuSign, Adobe Sign, and others.' },
]

const TABS = ['Overview','Standards','Timeline','Current Initiatives','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function ETSIIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .ei-hero{background:#0a0a0a;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#fff}
        .ei-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .ei-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#fff;line-height:1.15;margin-bottom:10px}
        .ei-h1 em{color:#c0392b;font-style:normal}
        .ei-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .ei-stats{display:flex;gap:28px;flex-wrap:wrap}
        .ei-sn{font-size:22px;font-weight:600;color:#fff;line-height:1}
        .ei-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .ei-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .ei-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .ei-tab:hover{color:var(--v2-text)}
        .ei-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .ei-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .ei-section{margin-bottom:28px}
        .ei-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border)}
        .ei-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .std-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .tl-row{display:flex;gap:12px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:38px;text-align:right;padding-top:3px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px}
        .tl-spine{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0}
        .tl-line{width:1px;background:var(--v2-border);flex:1;min-height:14px;margin-top:3px}
        .init-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .link-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--v2-border)}
        .link-row:last-child{border-bottom:none}
      
        @media(max-width:min(767px,100%)){
          [class*="-hero"],[class*="-band"]{padding:20px 14px 18px!important}
          [class*="-body"]{padding:14px!important;max-width:100%!important}
          [class*="-tabs"]{padding:0 10px!important}
          [class*="-tab"]{margin-right:12px!important;font-size:12px!important;padding:10px 2px 11px!important}
          [class*="-h1"]{font-size:20px!important}
          [class*="-sub"]{font-size:12px!important}
          [class*="-stats"]{gap:18px!important}
          .out-card{padding:12px!important}
        }`}</style>

      <div className="ei-hero">
        <div className="ei-eyebrow">SSLVault PKI Intelligence · ETSI ESI Deep Dive</div>
        <div className="ei-h1">ETSI ESI — <em>Europe's PKI standards backbone</em></div>
        <div className="ei-sub">The European Telecommunications Standards Institute's Electronic Signatures and Infrastructures Technical Committee produces the EN 319 series — the technical standards that make electronic signatures legally binding across all 27 EU member states under eIDAS regulation.</div>
        <div className="ei-stats">
          <div><div className="ei-sn">1988</div><div className="ei-sl">Founded</div></div>
          <div><div className="ei-sn">27</div><div className="ei-sl">EU states bound</div></div>
          <div><div className="ei-sn">EN 319</div><div className="ei-sl">Primary standard series</div></div>
          <div><div className="ei-sn">eIDAS 2.0</div><div className="ei-sl">Latest mandate</div></div>
          <div><div className="ei-sn">900+</div><div className="ei-sl">Member organisations</div></div>
        </div>
      </div>

      <div className="ei-tabs">
        {TABS.map(t => <button key={t} className={`ei-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="ei-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              ETSI ESI decides how electronic signatures, seals, and certificates must work in Europe. If your CA sells certificates into the EU market, or if you rely on a digital signature for a legal contract, healthcare record, or government transaction, you're operating under ETSI ESI standards whether you know it or not.
            </div>
            <div className="ei-section">
              <div className="ei-sh">What ETSI ESI is</div>
              <p className="ei-p">The Electronic Signatures and Infrastructures (ESI) Technical Committee within ETSI is the primary body responsible for producing technical standards that give legal effect to electronic signatures, timestamps, and certificates under EU law. While CAB Forum governs TLS certificates used by browsers globally, ETSI ESI governs the broader trust service ecosystem — qualified certificates, e-signatures for contracts, electronic seals for organisations, and remote signing services.</p>
              <p className="ei-p">ETSI ESI standards are not voluntary guidelines — they are directly referenced by EU regulations and carry legal weight across all 27 member states. A Qualified Trust Service Provider (QTSP) that fails an ETSI EN 319 403 conformity assessment loses its qualified status and its certificates are no longer legally equivalent to handwritten signatures.</p>
            </div>
            <div className="ei-section">
              <div className="ei-sh">How it differs from CA/Browser Forum</div>
              <p className="ei-p">The CAB Forum governs TLS certificates — specifically whether your website gets a padlock in Chrome, Firefox, and Safari. ETSI ESI governs qualified trust services — digital signatures, timestamps, and certificates that carry legal weight in courts, government processes, and regulated industries across the EU.</p>
              <p className="ei-p">In practice, many European CAs must comply with both: ETSI EN 319 411 for their EU-market qualified certificates, and CAB Forum Baseline Requirements for their publicly-trusted TLS certificates. The audit frameworks differ — ETSI-based CAs are audited against EN 319 403, while CAB Forum members use WebTrust for CAs.</p>
            </div>
            <div className="ei-section">
              <div className="ei-sh">Why it matters for SSL/PKI practitioners</div>
              <p className="ei-p">The eIDAS 2.0 regulation requires browsers — including Chrome, Firefox, and Safari — to trust government-issued QWAC (Qualified Website Authentication Certificate) certificates by law. This is a profound shift: browser vendors have historically controlled their own root programs. ETSI ESI standards define what a QWAC must contain and how the issuing CA must be audited. Understanding ETSI is essential for any PKI professional operating in or with the EU market.</p>
            </div>
            <div className="ei-section">
              <div className="ei-sh">Headquarters and governance</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'6px 16px' }}>
                {[['Founded','1988'],['HQ','Sophia Antipolis, France'],['Members','900+ organisations'],['Funding','EU Commission + membership fees'],['Technical body','ESI Technical Committee (TC ESI)'],['Region','Europe (standards adopted globally)'],['Chair','Various TC ESI chairs'],['Secretariat','ETSI Secretariat, Sophia Antipolis']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'0.5px solid var(--v2-border)', fontSize:12 }}>
                    <span style={{ color:'var(--v2-text-3)', minWidth:100, flexShrink:0 }}>{k}</span>
                    <span style={{ color:'var(--v2-text)', fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Standards' && (
          <>
            <p className="ei-p">The EN 319 series is the technical backbone of European PKI and electronic trust services. These are European Norms (EN) — the highest category of ETSI standard — binding on all EU member states and referenced directly by eIDAS legislation.</p>
            {STANDARDS.map(s => (
              <div key={s.id} className="std-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'var(--v2-text-2)' }}>{s.id}</span>
                  <span className="v2-chip chip-green" style={{ fontSize:9 }}>{s.status}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{s.year}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)', marginBottom:5 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="ei-p">From ETSI's 1988 founding through to eIDAS 2.0 — the key milestones in European electronic signature and PKI standardisation.</p>
            {TIMELINE.map((e, i) => (
              <div key={e.year+i} className="tl-row">
                <div className="tl-yr">{e.year}</div>
                <div className="tl-spine">
                  <div className="tl-dot" style={{ background:'var(--v2-green-text)' }}/>
                  {i < TIMELINE.length-1 && <div className="tl-line"/>}
                </div>
                <div style={{ flex:1, paddingBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)', marginBottom:4, lineHeight:1.4 }}>{e.event}</div>
                  <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.65 }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'Current Initiatives' && (
          <>
            <p className="ei-p">ETSI ESI is actively working on several major initiatives that will reshape European PKI over the next three years.</p>
            {CURRENT_INITIATIVES.map(init => (
              <div key={init.title} className="init-card">
                <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{init.status}</span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginTop:6, marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
            <div className="v2-callout warning" style={{ marginTop:16 }}>
              <div className="v2-callout-title">QWAC and browser sovereignty</div>
              The eIDAS 2.0 mandate that browsers trust government-issued QWAC certificates is one of the most contested PKI governance questions of 2024–2025. Browser vendors argue it undermines their security model; EU member states argue it is necessary for digital sovereignty. ETSI ESI is at the centre of resolving this conflict through technical standard-setting.
            </div>
          </>
        )}

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'ETSI ESI Technical Committee homepage', url:'https://www.etsi.org/technologies/electronic-signatures', desc:'Main ESI TC page — standards, working documents, and committee membership.' },
              { label:'EN 319 standards portal', url:'https://www.etsi.org/deliver/', desc:'Full catalogue of published ETSI standards including the complete EN 319 series.' },
              { label:'EU Trusted List browser', url:'https://esignature.ec.europa.eu/efda/tl-browser/', desc:'Browse all EU Trusted Lists — registries of every qualified trust service provider per member state.' },
              { label:'ETSI Quantum Safe Cryptography', url:'https://www.etsi.org/technologies/quantum-safe-cryptography', desc:'ETSI work on quantum-safe standards including post-quantum updates to e-signature standards.' },
              { label:'EN 319 411-1 (TLS certificate policy)', url:'https://www.etsi.org/deliver/etsi_en/319400_319499/31941101/', desc:'The European standard governing CAs that issue publicly-trusted TLS certificates.' },
            ].map(l => (
              <div key={l.label} className="link-row">
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, color:'var(--v2-text)', fontSize:13 }}>{l.label}</div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>{l.desc}</div>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="v2-btn v2-btn-sm" style={{ gap:4, textDecoration:'none', flexShrink:0 }}>
                  <ExternalLink size={11}/> Visit ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
