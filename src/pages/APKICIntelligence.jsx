import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"

const MEMBERS = ['Hong Kong','Japan','South Korea','Taiwan','Singapore','Malaysia','Indonesia','Thailand','Philippines','Australia','New Zealand']

const KEY_OUTPUTS = [
  { title:'PKI Interoperability Framework for Asia', year:2022, desc:'APKIC\'s flagship framework defining how PKI systems across Asia-Pacific economies can interoperate — covering cross-border certificate recognition, bridge CA architectures, and mutual trust frameworks between national PKI hierarchies.' },
  { title:'Annual International PKI Symposium', year:'Annual', desc:'APKIC\'s flagship conference bringing together government PKI operators, CAs, standards experts, and enterprise PKI teams from across Asia and Oceania. Features technical sessions on government ID, e-government PKI, and cross-border digital identity.' },
  { title:'PQC Migration White Papers', year:2024, desc:'Series of white papers guiding Asian government and enterprise PKI operators through post-quantum cryptography migration planning. Covers algorithm selection, hybrid certificate strategies, and phased migration approaches tailored to Asian government PKI environments.' },
  { title:'Asia PKI Governance Guidelines', year:2023, desc:'Framework document providing guidance to Asian national PKI programmes on certificate policy structure, audit requirements, cross-certification models, and root programme governance aligned with global best practices.' },
  { title:'Cross-border Digital Signature Recognition Study', year:2023, desc:'Analysis of legal and technical frameworks for recognising digital signatures across Asian jurisdictions — covering bilateral recognition agreements, technical interoperability requirements, and alignment with eIDAS as a reference model.' },
]

const TIMELINE = [
  { year:'2001', event:'APKIC founded in Hong Kong', desc:'Asia PKI Consortium established in Hong Kong by PKI leaders from Hong Kong, Japan, Taiwan, and South Korea. Mission: promote PKI adoption and interoperability across Asia and Oceania. Initial membership from 4 economies.', type:'milestone' },
  { year:'2003', event:'First international PKI symposium', desc:'APKIC hosts its inaugural international PKI symposium. Brings together government PKI operators and CA representatives from across Asia to share experiences in building national PKI infrastructure.', type:'milestone' },
  { year:'2007', event:'Expansion to Southeast Asia', desc:'APKIC membership expands to include Singapore, Malaysia, and other Southeast Asian economies. Regional scope broadens to cover ASEAN as e-government initiatives accelerate across the region.', type:'milestone' },
  { year:'2012', event:'Cross-border PKI interoperability framework', desc:'APKIC publishes its first framework for cross-border PKI interoperability in Asia — addressing the challenge of recognising certificates from different national PKI hierarchies across Asian jurisdictions for government and commercial applications.', type:'milestone' },
  { year:'2018', event:'Australian and New Zealand members join', desc:'APKIC scope expands fully to Asia-Pacific with the inclusion of Australian and New Zealand PKI organisations. The consortium now covers 11+ economies from Northeast Asia through Southeast Asia to Oceania.', type:'milestone' },
  { year:'2023', event:'PQC migration guidance for Asian government PKI', desc:'APKIC publishes PQC migration white papers specifically addressing the needs of Asian government PKI operators — many of whom run national root CAs for e-government identity and must plan quantum-safe transitions for systems serving hundreds of millions of citizens.', type:'milestone' },
  { year:'2024', event:'PQC symposium track — major conference priority', desc:'APKIC\'s 2024 annual symposium features dedicated PQC migration tracks. Government PKI teams from across Asia present their migration planning status. NIST FIPS publications and IETF LAMPS drafts discussed in depth.', type:'milestone' },
]

const TABS = ['Overview','Key Outputs','Member Economies','Timeline','Current Initiatives','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function APKICIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .ap-hero{background:transparent;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#f5f0eb}
        .ap-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .ap-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#f5f0eb;line-height:1.15;margin-bottom:10px}
        .ap-h1 em{color:#ff8c7a;font-style:normal}
        .ap-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .ap-stats{display:flex;gap:28px;flex-wrap:wrap}
        .ap-sn{font-size:22px;font-weight:600;color:#f5f0eb;line-height:1}
        .ap-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .ap-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .ap-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .ap-tab:hover{color:var(--v2-text)}
        .ap-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .ap-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .ap-section{margin-bottom:28px}
        .ap-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border)}
        .ap-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .out-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .tl-row{display:flex;gap:12px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:38px;text-align:right;padding-top:3px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;background:var(--v2-green-text);flex-shrink:0;margin-top:3px}
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

      <div className="ap-hero">
        <div className="ap-eyebrow">SSLVault PKI Intelligence · APKIC Deep Dive</div>
        <div className="ap-h1">APKIC — <em>Asia-Pacific's PKI consortium</em></div>
        <div className="ap-sub">The Asia Public Key Infrastructure Consortium defines the PKI trust frameworks for governments and enterprises across 11+ Asia-Pacific economies. If you're issuing certificates for governments or enterprises across South or East Asia, APKIC defines the interoperability frameworks and trust models your PKI must align with.</div>
        <div className="ap-stats">
          <div><div className="ap-sn">2001</div><div className="ap-sl">Founded</div></div>
          <div><div className="ap-sn">11+</div><div className="ap-sl">Member economies</div></div>
          <div><div className="ap-sn">Eva Chan</div><div className="ap-sl">Chair</div></div>
          <div><div className="ap-sn">Asia/Oceania</div><div className="ap-sl">Region</div></div>
          <div><div className="ap-sn">Annual</div><div className="ap-sl">International symposium</div></div>
        </div>
      </div>

      <div className="ap-tabs">
        {TABS.map(t => <button key={t} className={`ap-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="ap-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              APKIC is the body that coordinates PKI standards and interoperability across Asia and Oceania. Asia has some of the world's most sophisticated national PKI deployments — Japan, South Korea, Taiwan, and Singapore run large-scale government identity PKI programmes. APKIC is the forum where their operators exchange knowledge, align standards, and plan cross-border interoperability.
            </div>
            <div className="ap-section">
              <div className="ap-sh">What APKIC is</div>
              <p className="ap-p">Founded in Hong Kong in 2001, APKIC is a non-profit consortium that promotes PKI adoption, interoperability, and best practice across Asia and Oceania. Unlike CAB Forum (which governs browser-trusted TLS certificates globally) or ETSI ESI (which governs EU legal trust services), APKIC focuses specifically on the Asian government PKI landscape — national identity PKI, e-government certificate policies, and cross-border recognition frameworks.</p>
              <p className="ap-p">Many Asian governments operate their own national PKI hierarchies — dedicated root CAs whose certificates are used for government e-services, digital identity, healthcare, and enterprise. South Korea's GPKI, Japan's J-LIS, and Taiwan's MOICA are examples. APKIC provides the forum for these national programme operators to share experiences and align their technical approaches.</p>
            </div>
            <div className="ap-section">
              <div className="ap-sh">Why it matters for PKI practitioners</div>
              <p className="ap-p">If your CA or PKI deployment serves enterprise or government customers in Asia, understanding APKIC's frameworks is essential for navigating cross-border certificate acceptance, government procurement requirements, and the specific audit and policy expectations of Asian national PKI programmes.</p>
              <p className="ap-p">Asia-Pacific also represents a significant portion of global internet users and e-commerce activity. PKI interoperability frameworks that enable cross-border digital signatures and identity assertions are increasingly important for regional trade and government services. APKIC is the primary body driving this work.</p>
            </div>
            <div className="ap-section">
              <div className="ap-sh">Governance and structure</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'6px 16px' }}>
                {[['Founded','2001'],['HQ','Hong Kong (rotating host)'],['Chair','Eva Chan'],['Category','Regional Consortium'],['Region','Asia / Oceania'],['Members','11+ economies'],['Funding','Membership contributions'],['Secretariat','Rotating among member economies']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'0.5px solid var(--v2-border)', fontSize:12 }}>
                    <span style={{ color:'var(--v2-text-3)', minWidth:100, flexShrink:0 }}>{k}</span>
                    <span style={{ color:'var(--v2-text)', fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Key Outputs' && (
          <>
            <p className="ap-p">APKIC's most significant outputs for the PKI community — frameworks, guidance documents, and annual conferences.</p>
            {KEY_OUTPUTS.map(o => (
              <div key={o.title} className="out-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{o.year}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)', marginBottom:5 }}>{o.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{o.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Member Economies' && (
          <>
            <p className="ap-p">APKIC draws membership from 11+ Asia-Pacific economies spanning Northeast Asia, Southeast Asia, and Oceania.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {MEMBERS.map(m => (
                <div key={m} style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)', borderRadius:'var(--v2-r-xl)', padding:'10px 16px', fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>{m}</div>
              ))}
            </div>
            <div className="v2-callout tip">
              <div className="v2-callout-title">Scale of Asian government PKI</div>
              Asia-Pacific governments operate some of the world's largest PKI deployments. South Korea's GPKI infrastructure serves 50+ million citizens. Japan's My Number digital identity system issues certificates to the entire adult population. Taiwan's MOICA operates a national PKI hierarchy used for business registration, tax filing, and healthcare. These programmes collectively represent hundreds of millions of issued certificates.
            </div>
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="ap-p">APKIC's evolution from a Hong Kong founding in 2001 to a pan-Asia-Pacific consortium leading PQC migration guidance.</p>
            {TIMELINE.map((e, i) => (
              <div key={e.year+i} className="tl-row">
                <div className="tl-yr">{e.year}</div>
                <div className="tl-spine">
                  <div className="tl-dot"/>
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
            <p className="ap-p">APKIC's active initiatives for 2024–2026.</p>
            {[
              { title:'PQC migration guidance for Asian government PKI', status:'Active', desc:'Developing region-specific guidance for transitioning national PKI programmes — many of which issue certificates to entire citizen populations — from classical to post-quantum algorithms. Addresses the unique challenges of large-scale government certificate replacement programmes.' },
              { title:'Cross-border digital signature interoperability', status:'Active', desc:'Working to create mutual recognition frameworks for digital signatures across Asian jurisdictions, drawing on eIDAS as a reference model and adapting it to the Asian legal and technical context. Critical for regional digital trade and e-government cooperation.' },
              { title:'Annual symposium 2025 — PQC focus', status:'Upcoming', desc:'The 2025 APKIC international symposium will feature major PQC migration tracks. Government PKI operators from all 11+ member economies will present their quantum-safe migration roadmaps and technical approaches.' },
              { title:'Alignment with CAB Forum 47-day mandate', status:'Active', desc:'Assessing how APKIC member national PKI programmes need to adapt their certificate lifecycle policies in response to the CAB Forum SC081v3 47-day validity reduction. Many government PKI programmes issue certificates with multi-year validity that will need restructuring.' },
            ].map(init => (
              <div key={init.title} className="out-card">
                <span className={`v2-chip ${init.status==='Active'?'chip-blue':'chip-amber'}`} style={{ fontSize:9 }}>{init.status}</span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginTop:6, marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'APKIC official website', url:'https://www.apkic.org', desc:'Main APKIC homepage — membership information, publications, and annual symposium details.' },
              { label:'PKI Interoperability Framework', url:'https://www.apkic.org/frameworks', desc:'APKIC\'s interoperability framework documentation for cross-border PKI recognition in Asia-Pacific.' },
              { label:'Annual symposium proceedings', url:'https://www.apkic.org/symposium', desc:'Presentations and proceedings from APKIC\'s annual international PKI symposium.' },
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
