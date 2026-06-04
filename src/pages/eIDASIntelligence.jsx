import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"

const TRUST_SERVICES = [
  { name:'Qualified Electronic Signature (QES)', desc:'The highest level of electronic signature under eIDAS — legally equivalent to a handwritten signature across all 27 EU member states. Created using a qualified certificate issued by a QTSP and a Qualified Signature Creation Device (QSCD). Used for high-value contracts, legal documents, and regulated submissions.' },
  { name:'Advanced Electronic Signature (AdES)', desc:'Uniquely linked to the signatory, capable of identifying them, created using data under their sole control, and detectable if the signed data changes. Does not require a qualified certificate — used for business-level digital signatures where full QES is not mandated.' },
  { name:'Qualified Electronic Seal (QESeal)', desc:'The organisation-level equivalent of a QES. Used by legal entities (companies, government bodies) to seal documents. Proves the origin of data from a specific organisation with legal certainty. Used for invoices, official documents, and machine-to-machine workflows.' },
  { name:'Qualified Electronic Time Stamp (QETS)', desc:'A timestamp from a qualified TSP that is legally equivalent to a notarised date across the EU. Used for long-term document preservation — proving that data existed in a specific form before a specific moment in time. Critical for legal archives and contract management.' },
  { name:'Qualified Website Authentication Certificate (QWAC)', desc:'The EU equivalent of an EV TLS certificate — issued by a QTSP after full legal entity identity verification. Under eIDAS 2.0, browsers are legally required to trust QWACs. Guarantees the legal identity behind a website, not just domain ownership. Major governance controversy with browser vendors in 2024.' },
  { name:'EU Digital Identity Wallet (EUDIW)', desc:'New in eIDAS 2.0 (Regulation 2024/1183). Every EU member state must provide a free digital identity wallet to citizens. Enables citizens to prove their identity, share credentials, and authenticate to services across the EU without country-specific systems. The biggest digital identity initiative in history.' },
]

const TIMELINE = [
  { year:'1999', event:'EU Electronic Signatures Directive (1999/93/EC)', desc:'First EU legal framework for electronic signatures. Defines "qualified" and "advanced" signatures. Creates the concept of Certification Service Providers. Inconsistent implementation across member states creates fragmentation — the problem eIDAS was designed to fix.', type:'milestone' },
  { year:'2014', event:'eIDAS Regulation 910/2014 — EU digital trust framework', desc:'Regulation on electronic identification and trust services for electronic transactions. Replaces the 1999 Directive. Directly applicable in all 27 member states without transposition. Creates a unified framework for qualified trust services, recognised across the entire EU.', type:'milestone' },
  { year:'2016', event:'eIDAS enters full force — QTSPs operational', desc:'eIDAS fully effective. Qualified Trust Service Providers (QTSPs) must comply with ETSI EN 319 standards and be audited annually. EU Trusted Lists go live — member states publish registries of their qualified TSPs in machine-readable XML format.', type:'milestone' },
  { year:'2019', event:'eIDAS review — gaps identified', desc:'European Commission review finds that eIDAS successfully created cross-border trust for electronic signatures but failed to address digital identity sufficiently. Citizens cannot use their national eID across member state borders reliably. Review recommends a major revision.', type:'milestone' },
  { year:'2021', event:'eIDAS 2.0 proposal — EU Digital Identity Wallet announced', desc:'European Commission proposes eIDAS 2.0 with the EU Digital Identity Wallet — every EU citizen gets a free government-issued digital wallet to prove identity across the EU. QWAC browser mandate proposed, triggering controversy with browser vendors.', type:'milestone' },
  { year:'2022', event:'QWAC browser mandate controversy', desc:'Browser vendors (Mozilla, Google, Apple) oppose the eIDAS 2.0 QWAC browser mandate, arguing it would undermine their root programme security model and potentially enable government surveillance. Open letters from security researchers follow. Largest PKI governance controversy since 2011 DigiNotar.', type:'incident' },
  { year:'2024', event:'eIDAS 2.0 — Regulation 2024/1183 published', desc:'eIDAS 2.0 published in the Official Journal. Mandates EU Digital Identity Wallet deployment by all member states. QWAC browser mandate retained. Browsers must trust government-issued QWAC certificates. Implementation timeline: member states have 24 months from publication.', type:'milestone' },
  { year:'2026', event:'EUDIW deployment deadline', desc:'EU member states must make the EU Digital Identity Wallet available to all citizens. Over 440 million Europeans will have access to a standards-based digital identity wallet — the world\'s largest digital identity deployment.', type:'milestone' },
]

const TABS = ['Overview','Trust Services','eIDAS vs eIDAS 2.0','Timeline','Current Initiatives','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function eIDASIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .eid-hero{background:transparent;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#ffffff}
        .eid-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .eid-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#ffffff;line-height:1.15;margin-bottom:10px}
        .eid-h1 em{color:#2a6b5c;font-style:normal}
        .eid-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .eid-stats{display:flex;gap:28px;flex-wrap:wrap}
        .eid-sn{font-size:22px;font-weight:600;color:#ffffff;line-height:1}
        .eid-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .eid-tabs{background:var(--v2-surface-2);border-bottom:1px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .eid-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .eid-tab:hover{color:var(--v2-text)}
        .eid-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .eid-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .eid-section{margin-bottom:28px}
        .eid-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--v2-border)}
        .eid-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .ts-card{background:var(--v2-surface);border:1px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .tl-row{display:flex;gap:12px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:38px;text-align:right;padding-top:3px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px}
        .tl-spine{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0}
        .tl-line{width:1px;background:var(--v2-border);flex:1;min-height:14px;margin-top:3px}
        .cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .cmp-card{background:var(--v2-surface);border:1px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px}
        .link-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--v2-border)}
        .link-row:last-child{border-bottom:none}
        @media(max-width:min(700px,100%)){.cmp-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="eid-hero">
        <div className="eid-eyebrow">SSLVault PKI Intelligence · eIDAS Deep Dive</div>
        <div className="eid-h1">eIDAS — <em>EU digital trust by law</em></div>
        <div className="eid-sub">EU Regulations 910/2014 (eIDAS) and 2024/1183 (eIDAS 2.0) make digital signatures, seals, and timestamps legally binding across all 27 EU member states. eIDAS 2.0 goes further — mandating browsers trust government-issued QWAC certificates and requiring every EU member state to provide citizens with a free EU Digital Identity Wallet by 2026.</div>
        <div className="eid-stats">
          <div><div className="eid-sn">2014</div><div className="eid-sl">eIDAS founded</div></div>
          <div><div className="eid-sn">27</div><div className="eid-sl">EU states bound</div></div>
          <div><div className="eid-sn">2024</div><div className="eid-sl">eIDAS 2.0</div></div>
          <div><div className="eid-sn">EUDIW</div><div className="eid-sl">Digital identity wallet</div></div>
          <div><div className="eid-sn">440M+</div><div className="eid-sl">Citizens affected</div></div>
        </div>
      </div>

      <div className="eid-tabs">
        {TABS.map(t => <button key={t} className={`eid-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="eid-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              eIDAS is an EU law — not a voluntary standard. It makes specific types of electronic signatures, timestamps, and certificates legally equivalent to their paper counterparts across all 27 EU member states. eIDAS 2.0 extends this by mandating a digital identity wallet for every EU citizen and requiring browsers to accept government-issued website identity certificates.
            </div>
            <div className="eid-section">
              <div className="eid-sh">What eIDAS is</div>
              <p className="eid-p">The Electronic Identification, Authentication and Trust Services (eIDAS) regulation (EU) No 910/2014 is an EU regulation — directly applicable law in all 27 member states without transposition. It creates a unified legal framework for electronic signatures, electronic seals, timestamps, electronic registered delivery services, and website authentication certificates (QWACs).</p>
              <p className="eid-p">Unlike CAB Forum (a voluntary consortium) or ETSI ESI (a standards body), eIDAS is law. A qualified electronic signature under eIDAS cannot be denied legal effect solely because it is in electronic form. Courts must treat it the same as a handwritten signature. This legal certainty is what makes the EU's digital trust framework unique globally.</p>
            </div>
            <div className="eid-section">
              <div className="eid-sh">eIDAS and PKI practitioners</div>
              <p className="eid-p">For SSL/PKI professionals, the most immediately impactful aspect of eIDAS 2.0 is the QWAC browser mandate. Under eIDAS 2.0, browser vendors are legally required to trust QWAC certificates issued by ETSI-audited QTSPs. This is unprecedented — historically, browser vendors controlled their own root programs entirely. Understanding how QWAC certificates are issued, what they contain, and how they differ from standard TLS certificates is now essential knowledge for EU-market PKI work.</p>
            </div>
          </>
        )}

        {tab === 'Trust Services' && (
          <>
            <p className="eid-p">eIDAS defines six categories of qualified trust service — each with specific legal standing across the EU.</p>
            {TRUST_SERVICES.map(ts => (
              <div key={ts.name} className="ts-card">
                <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:6 }}>{ts.name}</div>
                <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{ts.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'eIDAS vs eIDAS 2.0' && (
          <>
            <p className="eid-p">eIDAS 2.0 (Regulation 2024/1183) is not a minor update — it fundamentally expands the scope of EU digital trust law.</p>
            <div className="cmp-grid">
              <div className="cmp-card">
                <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:'#888888', marginBottom:8 }}>eIDAS (910/2014)</div>
                {['Qualified electronic signatures legally binding EU-wide','Qualified Trust Service Providers (QTSPs) regulated','EU Trusted Lists — machine-readable QTSP registries','QWAC certificates for website authentication (voluntary)','No digital identity wallet mandate','CAs could choose whether to pursue QTSP status'].map(p=>(
                  <div key={p} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(0,0,0,0.06)', fontSize:12, color:'#333333' }}>
                    <span style={{ color:'#888888', flexShrink:0 }}>·</span>{p}
                  </div>
                ))}
              </div>
              <div className="cmp-card" style={{ borderColor:'var(--v2-green-border)', background:'var(--v2-green-bg)' }}>
                <div style={{ fontFamily:MONO, fontSize:10, fontWeight:700, color:'var(--v2-green-text)', marginBottom:8 }}>eIDAS 2.0 (2024/1183)</div>
                {['All eIDAS 1.0 provisions retained and strengthened','EU Digital Identity Wallet — free, mandatory, every member state','Browsers legally required to trust QWAC certificates','Electronic attestation of attributes (verifiable credentials)','Remote qualified signing for mobile-first workflows','PQC migration planning provisions included'].map(p=>(
                  <div key={p} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'0.5px solid var(--v2-green-border)', fontSize:12, color:'#111111' }}>
                    <span style={{ color:'var(--v2-green-text)', flexShrink:0 }}>+</span>{p}
                  </div>
                ))}
              </div>
            </div>
            <div className="v2-callout warning" style={{ marginTop:16 }}>
              <div className="v2-callout-title">The QWAC browser mandate — why it's controversial</div>
              Browser vendors (Mozilla, Google, Apple) have historically been the sole arbiters of which CAs appear in their root stores. The eIDAS 2.0 QWAC mandate legally requires them to trust certificates from government-nominated QTSPs — even CAs they might otherwise reject due to compliance concerns. Security researchers argue this creates a backdoor for government surveillance and undermines the security model that protects 5 billion internet users.
            </div>
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="eid-p">From the 1999 Directive through to the 2026 EUDIW deployment deadline.</p>
            {TIMELINE.map((e, i) => (
              <div key={e.year+i} className="tl-row">
                <div className="tl-yr">{e.year}</div>
                <div className="tl-spine">
                  <div className="tl-dot" style={{ background: e.type==='incident'?'var(--v2-red-text)':'#1f5c4e' }}/>
                  {i < TIMELINE.length-1 && <div className="tl-line"/>}
                </div>
                <div style={{ flex:1, paddingBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#111111', marginBottom:4, lineHeight:1.4 }}>{e.event}</div>
                  <div style={{ fontSize:12, color:'#333333', lineHeight:1.65 }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'Current Initiatives' && (
          <>
            <p className="eid-p">eIDAS 2.0 implementation is underway — the most significant EU digital transformation initiative in a decade.</p>
            {[
              { title:'EU Digital Identity Wallet (EUDIW) deployment', status:'Active', desc:'All 27 EU member states must deploy the EUDIW by mid-2026. Large-scale technical implementation programmes are underway in Germany, France, Italy, Spain, and the Netherlands. The architecture reference framework (ARF) and technical specifications are being finalised by ETSI and the EU Commission.' },
              { title:'QWAC browser trust negotiations', status:'Active', desc:'Ongoing technical and policy discussions between EU authorities, ETSI, and browser vendors (Mozilla, Google, Apple, Microsoft) on how QWAC trust is implemented in browsers. Implementation deadline approaching — browsers must comply with eIDAS 2.0 QWAC requirements by mid-2026.' },
              { title:'Electronic attestation of attributes (EAA)', status:'Active', desc:'eIDAS 2.0 introduces verifiable credentials — "electronic attestation of attributes" — that allow citizens to prove specific claims (age, qualifications, professional licenses) from their EUDIW without revealing all identity information. ETSI is standardising the technical formats.' },
              { title:'PQC provisions for qualified certificates', status:'Planning', desc:'eIDAS 2.0 implementation regulations are being drafted to include crypto-agility provisions that anticipate post-quantum algorithm migration. ETSI ESI and the EU Commission are coordinating on how QTSP audit requirements evolve to cover PQC algorithm use.' },
            ].map(init => (
              <div key={init.title} className="ts-card">
                <span className={`v2-chip ${init.status==='Active'?'chip-blue':'chip-amber'}`} style={{ fontSize:9 }}>{init.status}</span>
                <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginTop:6, marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'eIDAS Regulation (910/2014) full text', url:'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=uriserv:OJ.L_.2014.257.01.0073.01.ENG', desc:'The original eIDAS regulation in the EU Official Journal.' },
              { label:'eIDAS 2.0 Regulation (2024/1183)', url:'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202401183', desc:'The updated eIDAS regulation including EU Digital Identity Wallet mandate.' },
              { label:'EU Trusted List browser', url:'https://esignature.ec.europa.eu/efda/tl-browser/', desc:'Browse all EU Trusted Lists — every qualified TSP in all 27 member states.' },
              { label:'eIDAS 2.0 technical specification work', url:'https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation', desc:'European Commission\'s eIDAS implementation page — ARF documents and EUDIW specs.' },
              { label:'ETSI ESI standards for eIDAS', url:'https://www.etsi.org/technologies/electronic-signatures', desc:'The ETSI standards that implement eIDAS technical requirements.' },
            ].map(l => (
              <div key={l.label} className="link-row">
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, color:'#111111', fontSize:13 }}>{l.label}</div>
                  <div style={{ fontSize:11, color:'#888888', marginTop:2 }}>{l.desc}</div>
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
