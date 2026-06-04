import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"

const API_ENDPOINTS = [
  { endpoint:'/csc/v2/info', desc:'Returns service provider information, supported API version, authentication types, and region.' },
  { endpoint:'/csc/v2/auth/login', desc:'Authenticates the end user and returns an access token for subsequent API calls.' },
  { endpoint:'/csc/v2/credentials/list', desc:'Returns the list of credential IDs associated with the authenticated user — each credential corresponds to a signing key/certificate pair.' },
  { endpoint:'/csc/v2/credentials/info', desc:'Returns detailed information about a specific credential — certificate chain, key algorithm, certificate status, and authorisation methods.' },
  { endpoint:'/csc/v2/signatures/signHash', desc:'The core signing endpoint. Accepts one or more document hashes, the credential ID, and a signature algorithm. Returns digital signatures. The private key never leaves the TSP\'s HSM.' },
  { endpoint:'/csc/v2/signatures/signDoc', desc:'Higher-level endpoint for signing full documents directly. The TSP handles document parsing, hash computation, and signature embedding.' },
  { endpoint:'/csc/v2/auth/revoke', desc:'Revokes the access token. Used to terminate a signing session securely.' },
]

const ADOPTERS = [
  { name:'Adobe Sign Qualified', desc:'Adobe Sign uses the CSC API to offer qualified electronic signatures via QTSP partners in Europe. Users sign in Adobe Sign — the actual private key operation happens at the QTSP\'s HSM via CSC API.' },
  { name:'DocuSign Qualified', desc:'DocuSign integrates with QTSPs using the CSC API to offer legally-binding qualified electronic signatures in EU jurisdictions without DocuSign holding private keys.' },
  { name:'Asseco/Certum', desc:'Polish QTSP Certum exposes its cloud signing service via the CSC API — allowing any CSC-compatible application to request qualified signatures from Certum-held credentials.' },
  { name:'GlobalSign Digital Signing Service', desc:'GlobalSign\'s cloud signing platform exposes a CSC-compatible API, enabling enterprise workflows to request document signatures at scale without managing private keys.' },
  { name:'HARICA Cloud Signing', desc:'The Hellenic Academic CA (HARICA) offers cloud-based qualified signatures via CSC API — widely used in Greek government and academic workflows.' },
]

const TIMELINE = [
  { year:'2015', event:'CSC founded', desc:'Cloud Signature Consortium established to address the lack of a standard API for cloud-based electronic signatures. Founding members include Adobe, Docusign, Entrust, GlobalSign, and other industry leaders.', type:'milestone' },
  { year:'2017', event:'CSC API v1.0 published', desc:'First version of the Cloud Signature Consortium API specification published. Defines a REST JSON API for remotely requesting digital signatures from a Trust Service Provider. First standard enabling application-agnostic cloud signing.', type:'milestone' },
  { year:'2018', event:'First commercial CSC API deployments', desc:'Adobe and DocuSign begin integrating with European QTSPs via the CSC API for qualified electronic signature workflows. The API proves its value in enabling compliant cloud signing without application-specific TSP integrations.', type:'milestone' },
  { year:'2020', event:'CSC API v2.0 — major feature expansion', desc:'CSC API v2.0 published with expanded credential management, multi-document signing, enhanced authorisation flows, and improved QTSP federation support. Becomes the reference implementation for eIDAS remote signing services.', type:'milestone' },
  { year:'2020', event:'ETSI EN 319 522 alignment', desc:'ETSI ESI aligns EN 319 522 (remote signing policy standard) with the CSC API technical specification. This creates a complete stack: eIDAS (legal framework) → EN 319 522 (policy) → CSC API (technical implementation).', type:'milestone' },
  { year:'2022', event:'eIDAS 2.0 planning — CSC API for EUDIW', desc:'CSC begins planning how the EUDIW (EU Digital Identity Wallet) will interact with cloud signing services via the CSC API. The wallet will allow citizens to authorise signing operations from their mobile device.', type:'milestone' },
  { year:'2023', event:'CSC API adoption becomes near-universal for cloud signing', desc:'The CSC API becomes the de facto standard for cloud-based qualified electronic signatures globally. Any new cloud signing service integrating with European QTSPs uses CSC API. Legacy proprietary APIs are being migrated.', type:'milestone' },
]

const TABS = ['Overview','How the API Works','Key Adopters','Timeline','Current Initiatives','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function CSCIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .csc-hero{background:transparent;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#ffffff}
        .csc-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .csc-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#ffffff;line-height:1.15;margin-bottom:10px}
        .csc-h1 em{color:#e67e22;font-style:normal}
        .csc-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .csc-stats{display:flex;gap:28px;flex-wrap:wrap}
        .csc-sn{font-size:22px;font-weight:600;color:#ffffff;line-height:1}
        .csc-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .csc-tabs{background:var(--v2-surface-2);border-bottom:1px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .csc-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .csc-tab:hover{color:var(--v2-text)}
        .csc-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .csc-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .csc-section{margin-bottom:28px}
        .csc-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--v2-border)}
        .csc-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .ep-row{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--v2-border);align-items:flex-start}
        .ep-row:last-child{border-bottom:none}
        .adopter-card{background:var(--v2-surface);border:1px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .tl-row{display:flex;gap:12px;margin-bottom:14px}
        .tl-yr{font-family:${MONO};font-size:10px;font-weight:700;color:var(--v2-text-3);min-width:38px;text-align:right;padding-top:3px;flex-shrink:0}
        .tl-dot{width:10px;height:10px;border-radius:50%;background:#e67e22;flex-shrink:0;margin-top:3px}
        .tl-spine{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0}
        .tl-line{width:1px;background:var(--v2-border);flex:1;min-height:14px;margin-top:3px}
        .link-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--v2-border)}
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

      <div className="csc-hero">
        <div className="csc-eyebrow">SSLVault PKI Intelligence · CSC Deep Dive</div>
        <div className="csc-h1">Cloud Signature Consortium — <em>the API that powers cloud signing</em></div>
        <div className="csc-sub">CSC defined how to do legally-binding digital signatures from the cloud without a physical USB token. Their CSC API specification is what DocuSign, Adobe Sign, and every qualified cloud signing service worldwide implements. Founded in 2015, the CSC API became the de facto global standard for remote signing within five years.</div>
        <div className="csc-stats">
          <div><div className="csc-sn">2015</div><div className="csc-sl">Founded</div></div>
          <div><div className="csc-sn">v2.0</div><div className="csc-sl">Current API spec</div></div>
          <div><div className="csc-sn">REST/JSON</div><div className="csc-sl">API architecture</div></div>
          <div><div className="csc-sn">eIDAS</div><div className="csc-sl">Legal framework</div></div>
          <div><div className="csc-sn">Global</div><div className="csc-sl">Industry consortium</div></div>
        </div>
      </div>

      <div className="csc-tabs">
        {TABS.map(t => <button key={t} className={`csc-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="csc-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              Before CSC, every cloud signing service used its own proprietary API. To integrate DocuSign's qualified signature with Adobe's document platform, you needed custom code for each TSP. CSC created one standard API so any signing application can work with any TSP worldwide — the same principle as ACME, but for digital signatures rather than certificate issuance.
            </div>
            <div className="csc-section">
              <div className="csc-sh">What CSC is</div>
              <p className="csc-p">The Cloud Signature Consortium is an industry group founded in 2015 to address the fragmentation in cloud-based digital signature services. Before CSC, each Trust Service Provider (TSP) that offered remote signing (where the private key is held by the TSP, not the user) used a different proprietary API. This meant every application wanting to integrate with multiple TSPs needed to implement multiple custom integrations.</p>
              <p className="csc-p">CSC published an open, vendor-neutral REST JSON API specification that standardises how signing applications request digital signatures from a TSP without needing to know the TSP's internal implementation. The CSC API defines authentication, credential discovery, hash signing, and document signing in a way that works across all compliant TSPs.</p>
            </div>
            <div className="csc-section">
              <div className="csc-sh">Why the CSC API matters</div>
              <p className="csc-p">The CSC API is to cloud signing what ACME is to certificate issuance — it removes the need for proprietary integrations. A document management system that implements the CSC API can work with any CSC-compliant TSP globally. Adobe Sign, DocuSign, PandaDoc, and others use the CSC API to offer qualified electronic signatures without each building and maintaining their own private key infrastructure.</p>
              <p className="csc-p">For PKI practitioners, the CSC API is increasingly important as certificate-based signing moves to the cloud. Code signing, document signing, and email signing are all migrating from USB tokens and local key stores to cloud-based credentials managed by TSPs. The CSC API is the technical layer that makes this migration interoperable and compliant with eIDAS qualified trust service requirements.</p>
            </div>
            <div className="csc-section">
              <div className="csc-sh">The complete stack: eIDAS → ETSI → CSC</div>
              <p className="csc-p">Cloud-based qualified signing is governed at three levels: eIDAS Regulation provides the legal framework (qualified signatures are legally binding). ETSI EN 319 522 provides the policy framework (what a remote signing TSP must do). The CSC API provides the technical implementation (how applications request signatures from a TSP). All three layers must be present for a legally-binding cloud-based qualified electronic signature.</p>
            </div>
          </>
        )}

        {tab === 'How the API Works' && (
          <>
            <p className="csc-p">The CSC API is a REST JSON API that follows a simple flow: authenticate → discover credentials → authorise a signing operation → submit document hashes → receive signatures.</p>
            <div className="v2-callout tip" style={{ marginBottom:16 }}>
              <div className="v2-callout-title">Security model: private keys never leave the TSP</div>
              The CSC API is designed so the TSP's HSM performs the actual cryptographic signing operation. The application sends document hashes to the TSP — never the documents themselves. The TSP signs the hashes in its HSM and returns the signature values. The private key never leaves the TSP's infrastructure, maintaining QSCD (Qualified Signature Creation Device) requirements under eIDAS.
            </div>
            <div className="v2-card v2-card-pad">
              {API_ENDPOINTS.map(ep => (
                <div key={ep.endpoint} className="ep-row">
                  <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'#333333', minWidth:200, flexShrink:0 }}>{ep.endpoint}</span>
                  <span style={{ fontSize:12, color:'#333333', lineHeight:1.6 }}>{ep.desc}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'Key Adopters' && (
          <>
            <p className="csc-p">The CSC API is implemented by virtually every major cloud signing platform and European QTSP.</p>
            {ADOPTERS.map(a => (
              <div key={a.name} className="adopter-card">
                <div style={{ fontSize:13, fontWeight:600, color:'#111111', marginBottom:5 }}>{a.name}</div>
                <div style={{ fontSize:12, color:'#333333', lineHeight:1.7 }}>{a.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="csc-p">From CSC's 2015 founding through to near-universal adoption for cloud-based qualified signing.</p>
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

        {tab === 'Current Initiatives' && (
          <>
            <p className="csc-p">CSC's active work for 2024–2026.</p>
            {[
              { title:'CSC API v3.0 development', status:'Active', desc:'CSC is developing v3.0 of the API specification with enhanced support for EU Digital Identity Wallet (EUDIW) integration — enabling citizens to authorise signing operations directly from their EUDIW mobile app via the CSC API.' },
              { title:'PQC algorithm support', status:'Planning', desc:'Planning updates to the CSC API to support post-quantum signature algorithms (ML-DSA/FIPS 204) once IETF LAMPS WG publishes the X.509 certificate profiles. TSPs using FIPS 140-3 validated HSMs must support PQC signature operations via the CSC API to remain compliant.' },
              { title:'ETSI EN 319 522 alignment maintenance', status:'Active', desc:'Ongoing coordination with ETSI ESI to ensure the CSC API technical specification stays aligned with EN 319 522 policy requirements as eIDAS 2.0 implementation regulations are finalised.' },
              { title:'Mobile signing integration', status:'Active', desc:'Working with EUDIW reference implementation teams to define how citizens authorise CSC API signing operations directly from their EUDIW on a mobile device — replacing dedicated signing apps and USB tokens with a universal wallet-based flow.' },
            ].map(init => (
              <div key={init.title} className="adopter-card">
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
              { label:'Cloud Signature Consortium homepage', url:'https://cloudsignatureconsortium.org', desc:'Main CSC website — API specification downloads, membership information, and working group updates.' },
              { label:'CSC API v2.0 specification', url:'https://cloudsignatureconsortium.org/resources/download-api-specifications/', desc:'Full CSC API specification — endpoint definitions, authentication flows, and implementation guidance.' },
              { label:'CSC API reference implementation', url:'https://github.com/CloudSignatureConsortium', desc:'Reference implementations and sample code for CSC API integration.' },
              { label:'ETSI EN 319 522 (remote signing policy)', url:'https://www.etsi.org/deliver/etsi_en/319500_319599/31952201/', desc:'The ETSI policy standard that the CSC API implements at the technical level.' },
            ].map(l => (
              <div key={l.label} className="link-row">
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, color:'#111111', fontSize:13 }}>{l.label}</div>
                  <div style={{ fontSize:11, color:'#888888', marginTop:2 }}>{l.desc}</div>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s', gap:4, textDecoration:'none', flexShrink:0 }}>
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
