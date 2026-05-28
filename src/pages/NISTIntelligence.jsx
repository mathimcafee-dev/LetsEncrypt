import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const FONT = "'Segoe UI',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono','JetBrains Mono',monospace"

const PQC_STANDARDS = [
  { id:'FIPS 203', name:'ML-KEM (Kyber)', type:'Key Encapsulation', status:'Final', date:'Aug 2024', desc:'Post-quantum replacement for RSA and ECDH key exchange. Protects the TLS handshake from quantum attacks. Based on the hardness of the Module Learning With Errors (MLWE) problem. Fast, efficient, relatively small keys and ciphertexts. Already deployed by Cloudflare, Google, and Apple iMessage.' },
  { id:'FIPS 204', name:'ML-DSA (Dilithium)', type:'Digital Signature', status:'Final', date:'Aug 2024', desc:'Post-quantum replacement for RSA and ECDSA digital signatures. Will replace signature algorithms in all X.509 certificates — TLS, code signing, email, and document signing. Based on MLWE. IETF LAMPS WG is profiling ML-DSA for X.509 certificates right now.' },
  { id:'FIPS 205', name:'SLH-DSA (SPHINCS+)', type:'Digital Signature (backup)', status:'Final', date:'Aug 2024', desc:'Hash-based backup signature algorithm with a completely different mathematical foundation to ML-DSA. If lattice cryptography is ever broken, SLH-DSA provides an independent fallback. Larger signatures but maximum security confidence due to well-understood hash function security.' },
  { id:'FIPS 206', name:'FN-DSA (FALCON)', type:'Digital Signature', status:'Draft', date:'2025 expected', desc:'Fourth NIST PQC algorithm — NTRU lattice-based. Smaller signatures than ML-DSA, making it attractive for constrained environments like IoT and smart cards. Being standardised as FIPS 206 with final publication expected in 2025.' },
  { id:'HQC', name:'HQC', type:'Key Encapsulation (backup)', status:'Selected 2025', date:'Selected 2025', desc:'NIST selected HQC in 2025 as a backup KEM to complement ML-KEM. Based on code-based cryptography — a completely different mathematical approach to ML-KEM\'s lattice basis. Provides redundancy if ML-KEM\'s security assumptions are weakened.' },
]

const CLASSICAL_STANDARDS = [
  { id:'FIPS 140-3', title:'Security Requirements for Cryptographic Modules', status:'Current', year:2019, desc:'The gold standard for cryptographic module validation. HSMs, software libraries, and hardware tokens used in PKI must be FIPS 140-3 validated to be used in US federal systems. Level 2+ is required for CA private key storage. Most enterprise PKI deployments globally follow this standard.' },
  { id:'SP 800-57', title:'Recommendation for Key Management', status:'Current', year:2020, desc:'NIST\'s comprehensive guidance on cryptographic key lifecycle — generation, distribution, storage, usage, archival, and destruction. The definitive reference for designing key management policies in enterprise PKI environments.' },
  { id:'SP 800-52 Rev 2', title:'Guidelines for TLS Implementations', status:'Current', year:2019, desc:'Defines minimum TLS configuration requirements for US federal systems. Mandates TLS 1.2+ (TLS 1.3 strongly preferred), approved cipher suites, and certificate requirements. Widely adopted beyond government as best-practice guidance.' },
  { id:'SP 800-63', title:'Digital Identity Guidelines', status:'Current', year:2017, desc:'The framework that defines identity assurance levels (IAL1–3) and authenticator assurance levels (AAL1–3). Governs how US federal agencies must verify identity and authenticate users. Certificate-based authentication falls under AAL3.' },
  { id:'FIPS 186-5', title:'Digital Signature Standard (DSS)', status:'Current', year:2023, desc:'Finalised RSA, DSA, and ECDSA digital signature standards. The 2023 update removed DSA (considered deprecated) and added EdDSA. This is the classical signature standard that ML-DSA (FIPS 204) is designed to eventually replace.' },
]

const TIMELINE = [
  { year:'1901', event:'NBS founded', desc:'National Bureau of Standards founded as part of the US Department of Commerce. Predecessor to NIST. Initial mandate: standardise US weights, measures, and industrial processes.', type:'milestone' },
  { year:'1977', event:'DES standard published (FIPS 46)', desc:'Data Encryption Standard published. First widely-adopted symmetric encryption standard. Prompted by a lack of commercial encryption standards for protecting sensitive government data. Replaced by AES in 2001.', type:'milestone' },
  { year:'1988', event:'NBS renamed to NIST', desc:'National Bureau of Standards renamed National Institute of Standards and Technology and given an expanded mission including information technology standards. The cryptography programme becomes a core activity.', type:'milestone' },
  { year:'1994', event:'DSA and SHA-1 published', desc:'Digital Signature Algorithm (DSA) and Secure Hash Algorithm (SHA-1) published as FIPS standards. SHA-1 will become the dominant certificate hashing algorithm for 20+ years before being deprecated.', type:'milestone' },
  { year:'2001', event:'AES published (FIPS 197)', desc:'Advanced Encryption Standard published after a 5-year international competition. Replaced DES. Rijndael algorithm selected. AES-128/256 remains the gold standard for symmetric encryption and is used in every TLS session today.', type:'milestone' },
  { year:'2001', event:'FIPS 140-2 published — cryptographic module security', desc:'FIPS 140-2 validation programme becomes the global benchmark for cryptographic module security. HSMs used by every CA on the planet are FIPS 140-2 or 140-3 validated.', type:'milestone' },
  { year:'2005', event:'SHA-1 weaknesses found — NIST begins SHA-2 push', desc:'Xiaoyun Wang discovers theoretical SHA-1 collision attacks. NIST immediately recommends migration to SHA-2. The industry takes years to respond — a cautionary tale in cryptographic agility.', type:'milestone' },
  { year:'2016', event:'PQC standardisation project launches', desc:'NIST issues a call for post-quantum cryptographic algorithm submissions. 69 candidates submitted by global cryptographers. An 8-year evaluation process begins — the largest cryptographic standardisation effort in history.', type:'milestone' },
  { year:'2019', event:'Round 2 — field narrows to 26 candidates', desc:'After extensive analysis, NIST advances 26 algorithms to Round 2. Public cryptanalysis intensifies globally. Several candidates withdrawn after weaknesses found — validating the open evaluation process.', type:'milestone' },
  { year:'2022', event:'Round 3 finalists announced — Kyber, Dilithium, SPHINCS+ selected', desc:'NIST announces the first PQC algorithms to be standardised: CRYSTALS-Kyber for KEM, CRYSTALS-Dilithium and FALCON for signatures, SPHINCS+ as backup signature. SIKE, a promising finalist, is broken by a classical computer in hours — vindicating the multi-year public review.', type:'milestone' },
  { year:'2024', event:'FIPS 203, 204, 205 finalised — PQC era officially begins', desc:'NIST publishes final versions of ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205). The most significant cryptographic event since RSA\'s publication in 1978. Every CA, browser, OS, and enterprise must now plan migration timelines.', type:'milestone' },
  { year:'2025', event:'HQC selected as backup KEM', desc:'NIST selects HQC as a second KEM algorithm to complement ML-KEM. Code-based cryptography provides a completely different mathematical foundation — insurance against any future weakness in lattice-based ML-KEM.', type:'milestone' },
]

const CURRENT_INITIATIVES = [
  { title:'FIPS 206 (FN-DSA / FALCON) finalisation', status:'Active', desc:'The fourth NIST PQC algorithm — FN-DSA, based on FALCON NTRU lattice signatures — is being finalised as FIPS 206. Expected publication 2025. Smaller signature sizes than ML-DSA make it attractive for IoT, smart cards, and constrained PKI deployments.' },
  { title:'PQC migration guidance (SP 800-208 update)', status:'Active', desc:'NIST is updating migration guidance for transitioning from classical to post-quantum cryptography. Covers hybrid certificates (simultaneously using classical and PQC algorithms), migration timelines, and prioritisation of high-risk use cases like long-validity certificates.' },
  { title:'Cryptographic agility standards', status:'Active', desc:'NIST is developing guidance on cryptographic agility — building systems that can swap algorithms without redesigning the whole infrastructure. Critical for PKI systems that must transition from RSA/ECDSA to ML-DSA without downtime.' },
  { title:'FIPS 140-3 PQC module validation', status:'Planning', desc:'The CMVP programme is working to add ML-KEM, ML-DSA, and SLH-DSA to the FIPS 140-3 approved algorithm list. Until this is complete, HSMs cannot use PQC algorithms in FIPS-validated mode — a blocker for US federal PQC deployment.' },
]

const TABS = ['Overview','PQC Standards','Classical Standards','Timeline','Current Initiatives','Official Links']

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function NISTIntelligence({ nav }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('Overview')

  return (
    <div className="v2-page" style={{ fontFamily: FONT }}>
      <style>{`
        .ni-hero{background:transparent;padding:clamp(16px,4vw,32px) clamp(12px,3vw,24px) 28px;color:#ffffff}
        .ni-eyebrow{font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.35);text-transform:uppercase;font-weight:500;margin-bottom:8px}
        .ni-h1{font-size:26px;font-weight:600;letter-spacing:-.4px;color:#ffffff;line-height:1.15;margin-bottom:10px}
        .ni-h1 em{color:#ff8c7a;font-style:normal}
        .ni-sub{font-size:13px;color:rgba(255,255,255,.5);max-width:100%;line-height:1.7;margin-bottom:20px}
        .ni-stats{display:flex;gap:28px;flex-wrap:wrap}
        .ni-sn{font-size:22px;font-weight:600;color:#ffffff;line-height:1}
        .ni-sl{font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;letter-spacing:.05em;text-transform:uppercase}
        .ni-tabs{background:var(--v2-surface-2);border-bottom:0.5px solid var(--v2-border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
        .ni-tab{background:none;border:none;border-bottom:1.5px solid transparent;font-family:${FONT};font-size:13px;font-weight:500;color:var(--v2-text-2);padding:11px 4px 12px;margin-right:20px;cursor:pointer;margin-bottom:-0.5px;white-space:nowrap}
        .ni-tab:hover{color:var(--v2-text)}
        .ni-tab.on{color:var(--v2-text);border-bottom-color:var(--v2-text)}
        .ni-body{padding:20px clamp(12px,24px,24px);max-width:min(900px,100%)}
        .ni-section{margin-bottom:28px}
        .ni-sh{font-size:13px;font-weight:600;color:var(--v2-text);margin-bottom:10px;padding-bottom:6px;border-bottom:0.5px solid var(--v2-border)}
        .ni-p{font-size:13px;color:var(--v2-text-2);line-height:1.8;margin-bottom:10px}
        .pqc-card{background:var(--v2-surface);border:0.5px solid var(--v2-border);border-radius:var(--v2-r-xl);padding:14px 16px;margin-bottom:10px}
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

      <div className="ni-hero">
        <div className="ni-eyebrow">SSLVault PKI Intelligence · NIST Deep Dive</div>
        <div className="ni-h1">NIST — <em>the algorithms behind every certificate</em></div>
        <div className="ni-sub">The National Institute of Standards and Technology decides which cryptographic algorithms are safe enough to use in US federal systems — and therefore in every certificate trusted by every browser on the planet. NIST finalised ML-KEM, ML-DSA, and SLH-DSA in August 2024, beginning the largest cryptographic transition since RSA.</div>
        <div className="ni-stats">
          <div><div className="ni-sn">1901</div><div className="ni-sl">Founded</div></div>
          <div><div className="ni-sn">3</div><div className="ni-sl">PQC finals (Aug 2024)</div></div>
          <div><div className="ni-sn">FIPS 203–205</div><div className="ni-sl">PQC standards</div></div>
          <div><div className="ni-sn">8 years</div><div className="ni-sl">PQC evaluation</div></div>
          <div><div className="ni-sn">FIPS 140-3</div><div className="ni-sl">HSM validation standard</div></div>
        </div>
      </div>

      <div className="ni-tabs">
        {TABS.map(t => <button key={t} className={`ni-tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{t}</button>)}
      </div>

      <div className="ni-body">
        {tab === 'Overview' && (
          <>
            <div className="v2-callout tip" style={{ marginBottom:20 }}>
              <div className="v2-callout-title">Plain English</div>
              NIST decides which cryptographic algorithms are approved for use in US federal systems. Because US federal procurement is enormous, and because browser vendors and enterprise software developers follow NIST guidance globally, NIST algorithm approvals effectively set the cryptographic baseline for the entire internet — including every TLS certificate, code signing certificate, and HSM used by every CA on the planet.
            </div>
            <div className="ni-section">
              <div className="ni-sh">What NIST is</div>
              <p className="ni-p">The National Institute of Standards and Technology is a US federal agency within the Department of Commerce. Its cryptography division — the Computer Security Division (CSD) of the Information Technology Laboratory (ITL) — produces the Federal Information Processing Standards (FIPS) and Special Publications (SP 800 series) that govern cryptographic algorithms, key management, and security practices for US federal information systems.</p>
              <p className="ni-p">NIST does not mandate private industry follow its standards — but US federal procurement requirements effectively mean that any vendor wanting government contracts must comply. And because the same HSMs, software libraries, and PKI systems are used across both government and commercial sectors, NIST standards become de facto global standards.</p>
            </div>
            <div className="ni-section">
              <div className="ni-sh">NIST's role in PKI specifically</div>
              <p className="ni-p">Every cryptographic algorithm used in PKI has NIST involvement. RSA key sizes, ECDSA curve approvals, SHA-2 hash function design, AES symmetric encryption, FIPS 140-3 hardware security module validation — all of these flow through NIST. When CAB Forum sets a minimum RSA key size or deprecates SHA-1, they're following NIST guidance.</p>
              <p className="ni-p">The FIPS 140-3 validation programme is particularly important: every CA's hardware security module (HSM) — the device that holds the CA private key — must be FIPS 140-3 validated to be trusted in any serious PKI deployment. NIST runs the CMVP (Cryptographic Module Validation Programme) that certifies these devices.</p>
            </div>
            <div className="ni-section">
              <div className="ni-sh">Why the PQC work matters to every PKI professional</div>
              <p className="ni-p">The quantum computing threat to RSA and ECC is not theoretical speculation — it's a mathematically proven vulnerability. A sufficiently powerful quantum computer running Shor's algorithm can break RSA-2048 in hours. While such a computer doesn't exist today, "harvest now, decrypt later" attacks mean adversaries are already collecting encrypted traffic to decrypt when quantum computers arrive.</p>
              <p className="ni-p">NIST's August 2024 publication of FIPS 203, 204, and 205 started the clock on the global PKI migration. Every CA, every browser, every enterprise certificate management system, and every HSM vendor must now plan their migration from RSA/ECDSA to ML-KEM/ML-DSA. This is the biggest PKI transition in history — and NIST is the organisation that triggered it.</p>
            </div>
          </>
        )}

        {tab === 'PQC Standards' && (
          <>
            <div className="v2-callout warning" style={{ marginBottom:16 }}>
              <div className="v2-callout-title">Why "harvest now, decrypt later" makes PQC urgent now</div>
              Adversaries are collecting today's encrypted traffic — TLS sessions, signed emails, healthcare records — with the intent to decrypt them when quantum computers become powerful enough. Long-validity certificates signed with RSA or ECDSA today may still be "in use" cryptographically when that happens. Migration to PQC must begin well before quantum computers exist.
            </div>
            {PQC_STANDARDS.map(s => (
              <div key={s.id} className="pqc-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'#e8e0d8' }}>{s.id}</span>
                  <span className={`v2-chip ${s.status==='Final'?'chip-green':s.status==='Draft'?'chip-amber':'chip-blue'}`} style={{ fontSize:9 }}>{s.status}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{s.type}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{s.date}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'#ffffff', marginBottom:5 }}>{s.name}</div>
                <div style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Classical Standards' && (
          <>
            <p className="ni-p">Before PQC, NIST's classical cryptography standards have been the foundation of every TLS certificate and PKI deployment worldwide for decades.</p>
            {CLASSICAL_STANDARDS.map(s => (
              <div key={s.id} className="pqc-card">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontFamily:MONO, fontSize:11, fontWeight:700, color:'#e8e0d8' }}>{s.id}</span>
                  <span className="v2-chip chip-green" style={{ fontSize:9 }}>{s.status}</span>
                  <span className="v2-chip chip-grey" style={{ fontSize:9 }}>{s.year}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, color:'#ffffff', marginBottom:5 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Timeline' && (
          <>
            <p className="ni-p">From DES in 1977 through to the PQC standards of 2024 — NIST's defining moments in cryptographic history.</p>
            {TIMELINE.map((e, i) => (
              <div key={e.year+i} className="tl-row">
                <div className="tl-yr">{e.year}</div>
                <div className="tl-spine">
                  <div className="tl-dot" style={{ background:'#0d0000' }}/>
                  {i < TIMELINE.length-1 && <div className="tl-line"/>}
                </div>
                <div style={{ flex:1, paddingBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#ffffff', marginBottom:4, lineHeight:1.4 }}>{e.event}</div>
                  <div style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.65 }}>{e.desc}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'Current Initiatives' && (
          <>
            <p className="ni-p">NIST's active work that will shape the next generation of PKI infrastructure.</p>
            {CURRENT_INITIATIVES.map(init => (
              <div key={init.title} className="init-card">
                <span className={`v2-chip ${init.status==='Active'?'chip-blue':'chip-amber'}`} style={{ fontSize:9 }}>{init.status}</span>
                <div style={{ fontSize:13, fontWeight:600, color:'#ffffff', marginTop:6, marginBottom:6 }}>{init.title}</div>
                <div style={{ fontSize:12, color:'#e8e0d8', lineHeight:1.7 }}>{init.desc}</div>
              </div>
            ))}
          </>
        )}

        {tab === 'Official Links' && (
          <div className="v2-card v2-card-pad">
            {[
              { label:'NIST PQC project homepage', url:'https://csrc.nist.gov/projects/post-quantum-cryptography', desc:'The official PQC standardisation project — algorithm submissions, round announcements, and final standards.' },
              { label:'FIPS 203 (ML-KEM)', url:'https://csrc.nist.gov/publications/detail/fips/203/final', desc:'Final standard for ML-KEM (Kyber) — post-quantum key encapsulation mechanism.' },
              { label:'FIPS 204 (ML-DSA)', url:'https://csrc.nist.gov/publications/detail/fips/204/final', desc:'Final standard for ML-DSA (Dilithium) — post-quantum digital signature algorithm.' },
              { label:'FIPS 205 (SLH-DSA)', url:'https://csrc.nist.gov/publications/detail/fips/205/final', desc:'Final standard for SLH-DSA (SPHINCS+) — hash-based backup signature algorithm.' },
              { label:'FIPS 140-3 and CMVP', url:'https://csrc.nist.gov/projects/cryptographic-module-validation-program', desc:'Cryptographic Module Validation Programme — search validated HSMs and software modules.' },
              { label:'SP 800-52 Rev 2 (TLS guidelines)', url:'https://csrc.nist.gov/publications/detail/sp/800/52/rev-2/final', desc:'NIST guidelines for TLS implementation in federal systems — widely adopted as industry best practice.' },
            ].map(l => (
              <div key={l.label} className="link-row">
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, color:'#ffffff', fontSize:13 }}>{l.label}</div>
                  <div style={{ fontSize:11, color:'#b0a8a0', marginTop:2 }}>{l.desc}</div>
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
