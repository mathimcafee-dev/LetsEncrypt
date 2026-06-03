import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"

const PQC_CONFERENCES = [
  { location:'Ottawa, Canada', year:2023, delegates:'1,200+', desc:'PKI Consortium\'s first major PQC conference. Brought together cryptographers, CA operators, government agencies, and enterprise PKI teams for the first serious industry-wide discussion of post-quantum migration planning.' },
  { location:'Kuala Lumpur, Malaysia', year:2025, delegates:'2,500+', desc:'The world\'s largest PQC conference to date. 2,500+ delegates from 60+ countries. NIST presented FIPS 203/204/205 implementation details. IETF LAMPS WG presented PQC certificate profile drafts. CA migration timelines and hybrid certificate strategies dominated the agenda.' },
  { location:'Amsterdam, Netherlands', year:2026, delegates:'3,000+ expected', desc:'Next confirmed PKI Consortium PQC conference. Amsterdam 2026 will focus on active PQC deployment — by this point CAB Forum ballots on PQC profiles are expected to be in progress and early CA deployments will be reporting field experience.' },
]

const KEY_INITIATIVES = [
  { title:'PQC Conference series', desc:'PKI Consortium runs the world\'s largest series of post-quantum cryptography conferences specifically for the PKI industry. Unique focus on practical PKI migration — not theoretical cryptography — bringing CA operators, browser vendors, government agencies, and enterprise PKI teams together.' },
  { title:'PKI Maturity Model', desc:'A structured framework for assessing the maturity and security of PKI deployments across six dimensions: documentation, roles, key management, certificate lifecycle, audit, and disaster recovery. Used by enterprises and government agencies to evaluate and improve their PKI programmes.' },
  { title:'Certificate Transparency monitoring tools', desc:'PKI Consortium has contributed open-source tools for monitoring Certificate Transparency logs — helping organisations detect misissued certificates and track CA compliance with CT requirements. Available to the community as public goods.' },
  { title:'Community resources and white papers', desc:'Extensive library of PKI practitioner resources — algorithm migration guides, certificate profile examples, audit checklists, and technical white papers on topics from HSM selection to ACME implementation. Freely available.' },
  { title:'Vendor-neutral CA landscape analysis', desc:'Regular analysis of the CA market, root programme changes, and PKI governance developments — including the CCADB, CAB Forum ballot summaries, and root store policy changes. Accessible to non-CA-member organisations.' },
]

const MEMBERS = ['Amazon Trust Services','Apple','Buypass','CertCentral','Chunghwa Telecom','DigiCert','Entrust','GlobalSign','HARICA','IdenTrust','Let\'s Encrypt','Mozilla','NIST','Sectigo','SSL.com','SwissSign','TWCA','Visa']

const TIMELINE = [
  { year:'2013', event:'PKI Consortium founded', desc:'PKI Consortium established as a vendor-neutral, non-profit organisation to promote PKI adoption and share PKI knowledge across the industry. Founded with the mission to be the "glue" between CAs, browsers, enterprises, and government PKI users.', type:'milestone' },
  { year:'2015', event:'PKI Maturity Model v1.0', desc:'PKI Consortium publishes its PKI Maturity Model — a structured framework for evaluating PKI programme quality. Becomes widely adopted by enterprises and government agencies for PKI programme assessment and improvement planning.', type:'milestone' },
  { year:'2018', event:'PQC monitoring begins', desc:'PKI Consortium begins tracking post-quantum cryptography developments closely following NIST\'s Round 2 announcements. First PKI-focused PQC content published to help the CA and enterprise PKI community understand the coming migration.', type:'milestone' },
  { year:'2022', event:'NIST PQC finalists — PKI Consortium launches conference series', desc:'Following NIST\'s Round 3 finalist announcements, PKI Consortium announces a dedicated PQC conference series for the PKI industry. No other body is running events specifically for PKI practitioners planning quantum-safe migration.', type:'milestone' },
  { year:'2023', event:'First PQC Conference — Ottawa 1,200+ delegates', desc:'Ottawa PQC Conference exceeds all attendance expectations. CAs, governments, and enterprise PKI teams from 40+ countries attend. Establishes PKI Consortium as the leading convener for industry PQC migration discussions.', type:'milestone' },
  { year:'2025', event:'Kuala Lumpur — world\'s largest PQC conference (2,500+ delegates)', desc:'KL 2025 sets a record for the world\'s largest PQC conference. Delegates from 60+ countries. NIST, IETF, CAB Forum, and ETSI all present their PQC migration progress. The conference marks the shift from planning to active implementation phase.', type:'milestone' },
  { year:'2026', event:'Amsterdam — PQC deployment phase begins', desc:'Amsterdam 2026 expected to focus on real-world PQC deployment experiences. By this point first PQC X.509 certificates should be in production, and CAB Forum ballots on PQC profiles are expected to be underway.', type:'milestone' },
]

const TABS = ['Overview','PQC Conferences','Key Initiatives','Members','Timeline','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function PKIConsortiumIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .pkic-hero{background:transparent;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#ffffff}
        .pkic-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .pkic-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#ffffff;line-height:1.15;margin-bottom:10px}
        .pkic-h1 em{color:#2a6b5c;font-style:normal}
        .pkic-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .pkic-stats{display:flex;gap:28px;flex-wrap:wrap}
        .pkic-sn{font-size:22px;font-weight:600;color:#ffffff;line-height:1}
        .pkic-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .pkic-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .pkic-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .pkic-tab:hover{color:var(--v2-text)}
        .pkic-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .pkic-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .pkic-section{margin-bottom:28px}
        .pkic-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border)}
        .pkic-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .conf-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:16px;margin-bottom:12px;display:flex;gap:16px;align-items:flex-start}
        .conf-yr{font-family:${MONO};font-size:20px;font-weight:700;color:var(--v2-text);min-width:50px;text-align:center;line-height:1}
        .init-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .tl-row{display:flex;gap:12px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:38px;text-align:right;padding-top:3px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;background:#2a6b5c;flex-shrink:0;margin-top:3px}
        .tl-spine{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0}
        .tl-line{width:1px;background:var(--v2-border);flex:1;min-height:14px;margin-top:3px}
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

      <div className="pkic-hero">
        <div className="pkic-eyebrow">SSLVault PKI Intelligence · PKI Consortium Deep Dive</div>
        <div className="pkic-h1">PKI Consortium — <em>the world's PQC migration hub</em></div>
        <div className="pkic-sub">Founded in 2013, PKI Consortium runs the world's largest post-quantum cryptography conferences — 2,500+ delegates in Kuala Lumpur 2025, Amsterdam 2026 confirmed. A vendor-neutral forum bringing CAs, browsers, governments, and enterprise PKI teams together to plan the most significant cryptographic transition in PKI history.</div>
        <div className="pkic-stats">
          <div><div className="pkic-sn">2013</div><div className="pkic-sl">Founded</div></div>
          <div><div className="pkic-sn">2,500+</div><div className="pkic-sl">KL 2025 delegates</div></div>
          <div><div className="pkic-sn">Amsterdam</div><div className="pkic-sl">2026 next conference</div></div>
          <div><div className="pkic-sn">60+</div><div className="pkic-sl">Countries represented</div></div>
          <div><div className="pkic-sn">Global</div><div className="pkic-sl">Vendor-neutral</div></div>
        </div>
      </div>

      <div className="pkic-tabs">
        {TABS.map(t => <button key={t} className={`pkic-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="pkic-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              PKI Consortium is the community hub where PKI practitioners — CAs, enterprises, government agencies, browser vendors — come together to share knowledge, build consensus on best practices, and plan the migration to post-quantum cryptography. It doesn't write binding standards, but it shapes the thinking of every organisation that does.
            </div>
            <div className="pkic-section">
              <div className="pkic-sh">What PKI Consortium is</div>
              <p className="pkic-p">Founded in 2013 as a non-profit, vendor-neutral organisation, PKI Consortium's mission is to promote PKI adoption, share PKI knowledge, and facilitate cooperation across the PKI ecosystem. Unlike CAB Forum (which creates binding CA/browser policy) or ETSI ESI (which creates legally-binding EU standards), PKI Consortium is a community organisation — its value is in convening the right people and facilitating knowledge sharing.</p>
              <p className="pkic-p">PKI Consortium publishes the PKI Maturity Model, a framework for assessing PKI programme quality that has been adopted widely by enterprises and government agencies. It produces white papers, runs workshops, and manages the community resources that help PKI practitioners understand and implement best practices.</p>
            </div>
            <div className="pkic-section">
              <div className="pkic-sh">Why PKI Consortium became the PQC hub</div>
              <p className="pkic-p">When NIST's PQC standardisation process began producing results, the PKI industry needed a venue to discuss what quantum-safe migration actually means for certificate infrastructure — not just for cryptographers, but for CA operators, enterprise PKI teams, government identity programmes, and compliance officers. CAB Forum couldn't do this (it's constrained to CA/browser policy). NIST couldn't do this (it's a government agency producing algorithms, not migration strategies).</p>
              <p className="pkic-p">PKI Consortium stepped into this gap. The Ottawa 2023 and Kuala Lumpur 2025 conferences brought together the entire PKI ecosystem under one roof to share migration experiences and build shared understanding. With Amsterdam 2026 confirmed, PKI Consortium is positioned as the premier venue for PKI community work through the entire PQC transition.</p>
            </div>
          </>
        )}

        {tab === 'PQC Conferences' && (
          <>
            <p className="pkic-p">PKI Consortium's PQC conference series is the world's largest gathering of PKI practitioners focused on quantum-safe migration.</p>
            {PQC_CONFERENCES.map(c => (
              <div key={c.location} className="conf-card">
                <div style={{ textAlign:'center', minWidth:60 }}>
                  <div className="conf-yr">{c.year}</div>
                  <div style={{ fontSize:10, color:'#888888', marginTop:4 }}>{c.delegates}</div>
                  <div style={{ fontSize:9, color:'#888888' }}>delegates</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#111111', marginBottom:6 }}>{c.location}</div>
                  <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'Key Initiatives' && (
          <>
            <p className="pkic-p">PKI Consortium's major programmes and community contributions.</p>
            {KEY_INITIATIVES.map(init => (
              <div key={init.title} className="init-card">
                <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Members' && (
          <>
            <p className="pkic-p">PKI Consortium members span CAs, browser vendors, government agencies, and enterprise PKI teams — giving it a uniquely broad cross-sector perspective.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {MEMBERS.map(m => (
                <div key={m} style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:'var(--v2-r-xl)', padding:'8px 14px', fontSize:12, fontWeight:500, color:'#111111' }}>{m}</div>
              ))}
            </div>
            <p className="pkic-p" style={{ fontSize:12 }}>Note: membership is broader than listed above — PKI Consortium is open to any organisation working in or with PKI.</p>
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="pkic-p">From PKI Consortium's 2013 founding through to Amsterdam 2026.</p>
            {TIMELINE.map((e, i) => (
              <div key={e.year+i} className="tl-row">
                <div className="tl-yr">{e.year}</div>
                <div className="tl-spine">
                  <div className="tl-dot"/>
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

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'PKI Consortium homepage', url:'https://pkic.org', desc:'Main PKI Consortium website — community resources, publications, and event information.' },
              { label:'PKI Maturity Model', url:'https://pkic.org/pkimm/', desc:'The PKI Maturity Model framework — assess and improve your PKI programme across six dimensions.' },
              { label:'PQC Conference information', url:'https://pkic.org/events/', desc:'Information on upcoming and past PQC conferences including Amsterdam 2026 registration.' },
              { label:'Community white papers', url:'https://pkic.org/resources/', desc:'Library of practitioner-focused PKI white papers, guides, and technical resources.' },
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
