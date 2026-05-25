import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','SF Mono',monospace"

const KEY_RFCS = [
  { id:'RFC 5280', title:'Internet X.509 PKI Certificate and CRL Profile', status:'Current', year:2008, desc:'The definitive specification for X.509 certificates and Certificate Revocation Lists on the internet. Every TLS, S/MIME, and code signing certificate in the world must comply with this profile. Defines the ASN.1 structures, extensions, path validation rules, and semantic interpretations that form the basis of all PKI.' },
  { id:'RFC 8555', title:'Automatic Certificate Management Environment (ACME)', status:'Current', year:2019, desc:'Standardises the ACME protocol pioneered by Let\'s Encrypt. Defines the challenge-response DCV methods (HTTP-01, DNS-01, TLS-ALPN-01), order and authorisation objects, and the JSON API that enables fully automated certificate lifecycle management. The technical foundation for zero-touch PKI.' },
  { id:'RFC 6960', title:'X.509 Internet PKI Online Certificate Status Protocol (OCSP)', status:'Current', year:2013, desc:'Defines OCSP — the real-time certificate revocation checking protocol. Allows relying parties to query a CA\'s OCSP responder to determine if a specific certificate has been revoked. Being phased out in favour of CRLs following CAB Forum SC063.' },
  { id:'RFC 5652', title:'Cryptographic Message Syntax (CMS)', status:'Current', year:2009, desc:'Defines the CMS format used for signed, encrypted, and authenticated data. The foundation of S/MIME email encryption, CAdES digital signatures, PKCS#7, and the signed data structures in code signing certificates.' },
  { id:'RFC 8446', title:'TLS 1.3', status:'Current', year:2018, desc:'The current TLS standard. Eliminates broken cipher suites, reduces the handshake from two round trips to one, and removes RSA key exchange in favour of forward-secret ECDHE. Every modern HTTPS connection uses TLS 1.3. The certificate is still X.509 (RFC 5280) — TLS defines how it\'s used in the handshake.' },
  { id:'RFC 4210', title:'X.509 PKI Certificate Management Protocol (CMP)', status:'Current', year:2005, desc:'Defines CMP — the full-featured certificate lifecycle management protocol used in enterprise PKI and IoT. While ACME dominates web PKI automation, CMP is the standard for EST/CMPv2 in device certificate management, 3GPP mobile networks, and automotive PKI (V2X).' },
  { id:'RFC 7030', title:'Enrollment over Secure Transport (EST)', status:'Current', year:2013, desc:'Defines EST — certificate enrolment over TLS using HTTP. Simpler than CMP, widely used for network device certificate management in enterprise environments. Supported by all major PKI vendors.' },
  { id:'RFC 9500', title:'Common PKIX Implementation Pitfalls', status:'Informational', year:2023, desc:'Documents common X.509 certificate implementation mistakes — useful for CA software developers, PKI architects, and anyone building certificate validation logic. Prevents repeated security vulnerabilities in PKI implementations.' },
]

const ACTIVE_WGS = [
  { name:'LAMPS (Limited Additional Mechanisms for PKIX and SMIME)', status:'Active', desc:'The most critical WG for PKI right now. LAMPS is drafting the X.509 certificate profiles for PQC algorithms — defining how ML-DSA, SLH-DSA, and ML-KEM are encoded in X.509 structures. Also working on hybrid certificates that combine classical and PQC algorithms for the transition period. When these RFCs are published, CAs can start issuing PQC certificates.' },
  { name:'TLS (Transport Layer Security)', status:'Active', desc:'Maintains the TLS standard and related specifications. Currently working on post-quantum TLS — defining how ML-KEM is used in the TLS 1.3 handshake. Chrome and Firefox already support ML-KEM in TLS 1.3 experimentally. The RFC that formally standardises this is in progress.' },
  { name:'ACME (Automatic Certificate Management Environment)', status:'Active', desc:'Maintains and extends the ACME protocol (RFC 8555). Working on new challenge types including the DNS TXT persistent challenge (being standardised following CAB Forum SC088v3). Also working on ACME for short-lived certificates — relevant as the 47-day validity deadline approaches.' },
  { name:'SPASM (S/MIME Advanced Security)', status:'Active', desc:'Defines the S/MIME v4.0 standards for email signing and encryption. Closely coordinating with CAB Forum S/MIME WG on the technical protocol side while CAB Forum handles the policy requirements for certificate issuance.' },
]

const TIMELINE = [
  { year:'1986', event:'IETF founded', desc:'Internet Engineering Task Force formally established. A volunteer-driven standards body — no membership fees, no formal membership. Anyone can participate. Decisions made by rough consensus. Produces RFCs (Requests for Comments) — the technical standards the internet runs on.', type:'milestone' },
  { year:'1988', event:'X.509 v1 and RFC 1114 — PKI begins', desc:'ITU-T publishes X.509 v1. IETF begins work on applying X.509 to internet protocols. The certificate format that every TLS certificate still uses today is born.', type:'milestone' },
  { year:'1993', event:'SSL 2.0 by Netscape — IETF to standardise', desc:'Netscape creates SSL 2.0 for HTTPS. IETF takes over standardisation responsibility, releasing TLS 1.0 in 1999 as RFC 2246. PKIX Working Group formed to profile X.509 for internet use.', type:'milestone' },
  { year:'1999', event:'PKIX WG: RFC 2459 — first internet certificate profile', desc:'The PKIX Working Group publishes RFC 2459, the first comprehensive X.509 certificate profile for internet use. Defines path validation, extensions, and semantic rules. Updated to RFC 3280 in 2002 and RFC 5280 in 2008.', type:'milestone' },
  { year:'2008', event:'RFC 5280 — the definitive X.509 internet standard', desc:'RFC 5280 published — the final, comprehensive X.509 certificate and CRL profile for the internet. This RFC is the foundation every CA, browser, and TLS implementation builds on. Still the current standard in 2025.', type:'milestone' },
  { year:'2015', event:'Let\'s Encrypt and ACME — automation begins', desc:'Let\'s Encrypt launches with the ACME protocol, enabling automated certificate issuance and renewal at internet scale. IETF formalises ACME in the ACME Working Group. Free, automated certificates change the web PKI landscape permanently.', type:'milestone' },
  { year:'2018', event:'RFC 8446 — TLS 1.3 published', desc:'TLS 1.3 standardised — the most significant TLS update in history. Removes broken cipher suites, mandatory forward secrecy, and halves the handshake latency. Adoption reaches 95%+ of HTTPS traffic within five years.', type:'milestone' },
  { year:'2019', event:'RFC 8555 — ACME standardised', desc:'ACME protocol formally published as RFC 8555. Certificate automation becomes an IETF standard. Let\'s Encrypt has already issued over 1 billion certificates by this point. The standard enables any CA to implement compatible automation.', type:'milestone' },
  { year:'2022', event:'LAMPS WG begins PQC certificate profiling', desc:'IETF LAMPS Working Group begins drafting the X.509 certificate profiles for NIST PQC algorithms. This is the technical work that must complete before any CA can issue post-quantum X.509 certificates. Hybrid certificate drafts also begun.', type:'milestone' },
  { year:'2024', event:'ML-KEM in TLS 1.3 deployed experimentally', desc:'Chrome and Cloudflare deploy ML-KEM (X25519MLKEM768) in TLS 1.3 experimentally. The IETF TLS WG is drafting the formal RFC. This is the first real-world deployment of post-quantum cryptography in internet-scale PKI.', type:'milestone' },
]

const TABS = ['Overview','Key RFCs','Active Working Groups','Timeline','Current Initiatives','Official Links']

export default function IETFIntelligence({ nav }) {
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .ii-hero{background:#0a0a0a;padding:32px 24px 28px;color:#fff}
        .ii-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .ii-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#fff;line-height:1.15;margin-bottom:10px}
        .ii-h1 em{color:#34d399;font-style:normal}
        .ii-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .ii-stats{display:flex;gap:28px;flex-wrap:wrap}
        .ii-sn{font-size:22px;font-weight:600;color:#fff;line-height:1}
        .ii-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .ii-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .ii-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .ii-tab:hover{color:var(--v2-text)}
        .ii-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .ii-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .ii-section{margin-bottom:28px}
        .ii-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border)}
        .ii-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .rfc-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
        .wg-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
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

      <div className="ii-hero">
        <div className="ii-eyebrow">SSLVault PKI Intelligence · IETF Deep Dive</div>
        <div className="ii-h1">IETF — <em>the technical standards the internet runs on</em></div>
        <div className="ii-sub">The Internet Engineering Task Force writes the RFCs that define X.509 certificates, TLS, ACME automation, OCSP, and CMP. Without IETF, there would be no interoperable PKI. RFC 5280 defines every certificate in existence. RFC 8555 defines how they're automatically issued. RFC 8446 defines TLS 1.3. The LAMPS WG is now defining post-quantum PKI.</div>
        <div className="ii-stats">
          <div><div className="ii-sn">1986</div><div className="ii-sl">Founded</div></div>
          <div><div className="ii-sn">RFC 5280</div><div className="ii-sl">X.509 internet standard</div></div>
          <div><div className="ii-sn">RFC 8555</div><div className="ii-sl">ACME automation</div></div>
          <div><div className="ii-sn">LAMPS WG</div><div className="ii-sl">PQC cert profiles</div></div>
          <div><div className="ii-sn">TLS 1.3</div><div className="ii-sl">RFC 8446 (2018)</div></div>
        </div>
      </div>

      <div className="ii-tabs">
        {TABS.map(t => <button key={t} className={`ii-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="ii-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              IETF writes the technical specs — called RFCs — that define how X.509 certificates work on the internet, how TLS handshakes protect your HTTPS connections, and how ACME automates certificate management. CAB Forum writes the policy (what CAs must do). IETF writes the protocol (how it technically works). Both are essential.
            </div>
            <div className="ii-section">
              <div className="ii-sh">What IETF is</div>
              <p className="ii-p">The Internet Engineering Task Force is a volunteer-driven, open standards organisation that produces the technical specifications the internet runs on — called Requests for Comments (RFCs). Anyone can participate: no membership fees, no formal membership. Decisions are made by "rough consensus and running code." If your implementation works and the community agrees the spec is sound, it becomes a standard.</p>
              <p className="ii-p">IETF is organised into Area and Working Groups. For PKI, the most important are: the PKIX WG (now concluded, but produced RFC 5280), the LAMPS WG (Limited Additional Mechanisms for PKIX and SMIME — currently the most active PKI WG), the TLS WG, and the ACME WG. Each WG produces drafts — "Internet-Drafts" — that go through extensive review before becoming RFCs.</p>
            </div>
            <div className="ii-section">
              <div className="ii-sh">Why IETF matters to SSL practitioners</div>
              <p className="ii-p">Every certificate you issue, install, or validate is governed by RFC 5280. Every ACME automation workflow runs on RFC 8555. Every TLS session uses RFC 8446. If you've ever wondered why a certificate has a specific extension format, or why ACME's challenge response looks the way it does, the answer is in an RFC.</p>
              <p className="ii-p">Right now, IETF's LAMPS WG is doing the most critical PKI work on the planet — drafting the X.509 certificate profiles for post-quantum algorithms. When those RFCs are published, CAs can start issuing ML-DSA-signed certificates. Until they are, no CA can issue interoperable PQC certificates regardless of NIST publishing FIPS 203/204/205.</p>
            </div>
            <div className="ii-section">
              <div className="ii-sh">How IETF relates to other PKI bodies</div>
              <p className="ii-p">NIST defines which algorithms are approved. IETF defines how those algorithms are encoded in protocols and certificate formats. CAB Forum defines the policy rules CAs must follow when using those formats. ETSI ESI defines the EU legal framework for qualified versions. These bodies work in parallel, not hierarchy — an RFC can reference a NIST algorithm, and CAB Forum can reference both.</p>
            </div>
          </>
        )}

        {tab === 'Key RFCs' && (
          <>
            <p className="ii-p">The foundational RFCs that every PKI system is built on — and that every SSL/TLS practitioner should know.</p>
            {KEY_RFCS.map(r => (
              <div key={r.id} className="rfc-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'var(--v2-text-2)' }}>{r.id}</span>
                  <span className="v2-chip chip-green" style={{ fontSize:9 }}>{r.status}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{r.year}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)', marginBottom:5 }}>{r.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{r.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Active Working Groups' && (
          <>
            <p className="ii-p">The IETF Working Groups actively producing PKI-relevant standards right now.</p>
            {ACTIVE_WGS.map(wg => (
              <div key={wg.name} className="wg-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{wg.status}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{wg.name}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{wg.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="ii-p">From IETF's 1986 founding through to PQC certificate profiling — the key PKI milestones.</p>
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
            <div className="v2-callout tip" style={{ marginBottom:16 }}>
              <div className="v2-callout-title">Most important IETF work for PKI right now</div>
              The LAMPS WG's post-quantum certificate profile drafts are the single most important piece of standards work for PKI practitioners to track. Until these RFCs are published, CAs cannot issue interoperable PQC X.509 certificates — even though NIST has already published the underlying algorithms.
            </div>
            {[
              { title:'LAMPS: PQC X.509 certificate profiles', status:'Active', desc:'Drafting RFC profiles for ML-DSA, SLH-DSA, and ML-KEM in X.509 certificates and CRLs. Defining the algorithm OIDs, SubjectPublicKeyInfo encoding, and signature value encoding. Essential prerequisite for any CA to issue PQC certificates.' },
              { title:'LAMPS: Hybrid certificates', status:'Active', desc:'Drafting specifications for certificates that contain both a classical (RSA/ECDSA) and a PQC (ML-DSA) signature simultaneously. Allows relying parties that don\'t yet support PQC to fall back to classical — critical for the transition period.' },
              { title:'TLS WG: ML-KEM in TLS 1.3', status:'Active', desc:'Formalising the X25519MLKEM768 hybrid key exchange mechanism for TLS 1.3 as an RFC. Chrome, Cloudflare, and others are already deploying this experimentally. The formal RFC will make it an official internet standard.' },
              { title:'ACME WG: Persistent DNS TXT challenges', status:'Active', desc:'Standardising the DNS TXT persistent challenge method (which CAB Forum already approved in SC088v3) as an ACME extension RFC. Will enable zero-touch renewal that doesn\'t require per-issuance domain re-validation — essential for 47-day automation.' },
            ].map(init => (
              <div key={init.title} className="wg-card">
                <span className="v2-chip chip-blue" style={{ fontSize:9 }}>{init.status}</span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginTop:6, marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'IETF Datatracker', url:'https://datatracker.ietf.org', desc:'Track all Internet-Drafts and RFCs — including live LAMPS PQC certificate profile drafts.' },
              { label:'RFC 5280 — X.509 Certificate Profile', url:'https://www.rfc-editor.org/rfc/rfc5280', desc:'The foundational internet X.509 certificate standard every PKI implementation uses.' },
              { label:'RFC 8555 — ACME', url:'https://www.rfc-editor.org/rfc/rfc8555', desc:'The ACME protocol standard enabling fully automated certificate lifecycle management.' },
              { label:'RFC 8446 — TLS 1.3', url:'https://www.rfc-editor.org/rfc/rfc8446', desc:'The current TLS standard — defines how X.509 certificates are used in HTTPS connections.' },
              { label:'LAMPS WG page', url:'https://datatracker.ietf.org/wg/lamps/about/', desc:'The LAMPS Working Group — currently drafting PQC X.509 certificate profiles.' },
              { label:'IETF RFC Editor', url:'https://www.rfc-editor.org', desc:'Browse and search the full RFC catalogue.' },
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
