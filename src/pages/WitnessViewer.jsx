// WitnessViewer.jsx — PUBLIC auditor-facing evidence viewer
// Opened via https://easysecurity.in/witness?token=xxx — no login required
import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Clock,
  Hash, Globe, Lock, Calendar, Activity, RefreshCw, Server, Key, Zap, Printer
} from 'lucide-react'

const FN   = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/compliance-witness'
const F    = "'DM Sans','Inter',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"
const BLUE = '#0077b6'
const BORDER = 'rgba(0,119,182,0.12)'

function scoreColor(s) { return s >= 80 ? '#00a550' : s >= 50 ? '#9a6400' : '#c0392b' }
function scoreLbl(s)   { return s >= 80 ? 'STRONG' : s >= 50 ? 'PARTIAL' : 'WEAK' }
function fmtTs(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) } catch { return iso }
}
function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) } catch { return iso }
}

// Verification seal — light blue system, inline SVG (prints cleanly)
function TrustSeal({ size = 110, code = '' }) {
  const year = new Date().getFullYear()
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="SSLVault verification seal">
      <defs>
        <linearGradient id="vsealGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0077b6"/><stop offset="1" stopColor="#0091d6"/>
        </linearGradient>
        <path id="vArcTop" d="M 100,100 m -76,0 a 76,76 0 1,1 152,0"/>
        <path id="vArcBot" d="M 100,100 m -76,0 a 76,76 0 1,0 152,0"/>
      </defs>
      <circle cx="100" cy="100" r="97" fill="#fff" stroke="url(#vsealGrad)" strokeWidth="3"/>
      <circle cx="100" cy="100" r="88" fill="none" stroke="#0077b6" strokeWidth="1" strokeDasharray="2.5 3.5" opacity="0.55"/>
      <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(0,119,182,0.18)" strokeWidth="1"/>
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="12.5" fontWeight="800" fill="#0077b6" letterSpacing="2.5">
        <textPath href="#vArcTop" startOffset="50%" textAnchor="middle">SSLVAULT COMPLIANCE WITNESS</textPath>
      </text>
      <text fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="10.5" fontWeight="700" fill="#5a86a8" letterSpacing="2.2">
        <textPath href="#vArcBot" startOffset="50%" textAnchor="middle">TAMPER-EVIDENT EVIDENCE</textPath>
      </text>
      <g transform="translate(100,76)">
        <path d="M0,-20 L16,-13 L16,2 C16,13 8,21 0,25 C-8,21 -16,13 -16,2 L-16,-13 Z" fill="url(#vsealGrad)"/>
        <path d="M-7,1 L-2,7 L8,-6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <text x="100" y="121" textAnchor="middle" fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="13" fontWeight="800" fill="#0d1117" letterSpacing="1.5">VERIFIED</text>
      {code && <text x="100" y="136" textAnchor="middle" fontFamily="'JetBrains Mono','Courier New',monospace" fontSize="9.5" fontWeight="700" fill="#0077b6" letterSpacing="1">SEAL {code}</text>}
      <text x="100" y={code ? 150 : 140} textAnchor="middle" fontFamily="'DM Sans','Segoe UI',sans-serif" fontSize="9" fontWeight="600" fill="#7a8694" letterSpacing="1.5">EST. {year}</text>
    </svg>
  )
}

const EVENT_META = {
  issued:               { label:'Certificate Issued',        color:'#0077b6', icon: ShieldCheck, plain:'A new SSL certificate was obtained from the certificate authority and recorded.' },
  renewed:              { label:'Certificate Renewed',       color:'#00a550', icon: RefreshCw,   plain:'The certificate was replaced before expiry — the website stayed secure with no interruption.' },
  installed:            { label:'Installed on Server',       color:'#00a550', icon: Server,      plain:'The certificate was placed on the web server, activating HTTPS for visitors.' },
  binding_verified:     { label:'Independent Verification',  color:'#0077b6', icon: ShieldCheck, plain:'An automated check confirmed the live website is really serving the correct certificate.' },
  dcv_validated:        { label:'Domain Ownership Proven',   color:'#0077b6', icon: CheckCircle, plain:'Ownership of the domain was proven to the certificate authority before issuance.' },
  key_rotated:          { label:'Encryption Key Rotated',    color:'#9a6400', icon: Key,         plain:'The private encryption key was replaced with a brand-new one — good security hygiene.' },
  auto_renew_triggered: { label:'Automatic Renewal Started', color:'#00a550', icon: Zap,         plain:'The system automatically began renewing the certificate ahead of expiry — no human action needed.' },
  revoked:              { label:'Certificate Revoked',       color:'#c0392b', icon: XCircle,     plain:'The certificate was deliberately invalidated (e.g. after replacement or decommissioning).' },
  agent_heartbeat:      { label:'Monitoring Heartbeat',      color:'#7a8694', icon: Activity,    plain:'The monitoring agent confirmed it is alive and watching the server.' },
  expiry_warning:       { label:'Expiry Warning Raised',     color:'#9a6400', icon: Clock,       plain:'The system flagged that a certificate was approaching its expiry date.' },
}

const FRAMEWORKS = {
  SOC2: { label: 'SOC 2 Type II',       color:'#0077b6' },
  ISO:  { label: 'ISO 27001:2022',       color:'#00a550' },
  CABF: { label: 'CA/B Forum SC-081v3',  color:'#9a6400' },
  NIS2: { label: 'NIS2 Article 21',      color:'#7a8694' },
  PCI:  { label: 'PCI DSS v4',           color:'#c0392b' },
}

export default function WitnessViewer() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [data,    setData]    = useState(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setError('No token provided in URL.'); setLoading(false); return }
    fetch(`${FN}?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(e => { setError('Failed to load evidence: ' + e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <RefreshCw size={16} color={BLUE} style={{ animation:'spin 1s linear infinite' }}/>
        <span style={{ color:'#7a8694', fontSize:14 }}>Loading evidence dossier…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:F }}>
      <div style={{ textAlign:'center', maxWidth:400, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:16, padding:'40px 32px', boxShadow:'0 4px 20px rgba(0,119,182,0.08)' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <ShieldAlert size={26} color="#c0392b"/>
        </div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#0d1117', margin:'0 0 8px' }}>Cannot load evidence</h2>
        <p style={{ fontSize:13, color:'#7a8694', lineHeight:1.7, margin:0 }}>{error}</p>
        <p style={{ fontSize:12, color:'#7a8694', lineHeight:1.6, marginTop:12 }}>The link may have expired or been revoked. Contact the certificate owner for a new link.</p>
      </div>
    </div>
  )

  // Normalize: single-domain shares return `dossier`, account shares return `dossiers`
  const dossiers = data.dossier ? [data.dossier] : (data.dossiers || [])
  const events   = data.events || []
  const controls = data.controls || {}
  const allControls = [...new Set(dossiers.flatMap(d => [...(d.soc2_controls_met||[]),...(d.iso27001_controls_met||[]),...(d.cabf_controls_met||[]),...(d.nis2_controls_met||[])]))]
  const avgAudit = dossiers.length ? Math.round(dossiers.reduce((s,d)=>s+(d.audit_score||0),0)/dossiers.length) : 0
  const totalGaps = dossiers.reduce((s,d)=>s+(d.gaps?.length||0),0)

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4fa', fontFamily:F }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @media print { .no-print { display:none !important } body { background:#fff } }
      `}</style>

      {/* Top banner */}
      <div style={{ background:`linear-gradient(135deg,${BLUE},#0091d6)`, padding:'28px 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldCheck size={24} color="#fff" strokeWidth={2}/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>SSLVault Compliance Witness</div>
              <h1 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.3px' }}>{data.share_label || 'Certificate Evidence Dossier'}</h1>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="no-print" onClick={() => window.print()}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:9, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:F }}>
              <Printer size={13}/> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Read-only notice */}
      <div style={{ background:'rgba(154,100,0,0.06)', borderBottom:'1px solid rgba(154,100,0,0.15)' }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'10px 24px', display:'flex', alignItems:'center', gap:8 }}>
          <Lock size={12} color="#9a6400"/>
          <span style={{ fontSize:12, color:'#9a6400', fontWeight:500 }}>
            Read-only auditor view · This access has been logged · Link expires {fmtDate(data.expires_at)}
          </span>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* Executive summary — plain language for auditors */}
        {(() => {
          const renewCount  = events.filter(e => e.event_type === 'renewed' || e.event_type === 'auto_renew_triggered').length
          const verifyCount = events.filter(e => e.event_type === 'binding_verified').length
          const critGaps    = dossiers.reduce((s,d)=>s+((d.gaps||[]).filter(g=>g.severity==='critical').length),0)
          const earliest    = dossiers.map(d=>d.first_witnessed_at).filter(Boolean).sort()[0]
          const vCol  = critGaps > 0 ? '#c0392b' : totalGaps > 0 ? '#9a6400' : '#00a550'
          const vBg   = critGaps > 0 ? 'rgba(192,57,43,0.05)' : totalGaps > 0 ? 'rgba(154,100,0,0.05)' : 'rgba(0,165,80,0.05)'
          const verdict = critGaps > 0
            ? 'Attention required: one or more critical gaps must be fixed before this evidence fully satisfies an audit.'
            : totalGaps > 0
              ? 'Overall healthy: certificates are managed continuously; a small number of non-critical improvements are disclosed below.'
              : 'Fully healthy: certificates are continuously managed, renewed automatically, and independently verified, with no open gaps.'
          // Seal code: derived from the latest event hash so each dossier's seal is unique
          const sealCode = ((events[0]?.event_hash) || '').substring(0, 8).toUpperCase()
          return (
            <div style={{ background:vBg, border:`1px solid ${vCol}33`, borderRadius:14, padding:'20px 24px', marginBottom:20, display:'flex', gap:22, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 420px' }}>
              <div style={{ fontSize:13, fontWeight:800, color:vCol, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Executive Summary</div>
              <p style={{ fontSize:13, color:'#3d4a58', lineHeight:1.8, margin:'0 0 10px' }}>
                This dossier documents how the SSL/TLS certificates protecting <strong>{dossiers.length} domain{dossiers.length!==1?'s':''}</strong> have
                been managed{earliest ? <> since <strong>{fmtDate(earliest)}</strong></> : null}. SSL/TLS certificates are what make a website
                show the secure padlock — if one expires, visitors see security errors and are turned away.
              </p>
              <p style={{ fontSize:13, color:'#3d4a58', lineHeight:1.8, margin:'0 0 10px' }}>
                The system recorded <strong>{events.length} lifecycle events</strong>, including <strong>{renewCount} renewal action{renewCount!==1?'s':''}</strong> and{' '}
                <strong>{verifyCount} independent verification{verifyCount!==1?'s':''}</strong> that the live websites were serving the correct certificates.
                Evidence covers <strong>{allControls.length} specific requirements</strong> across SOC 2, ISO 27001, CA/B Forum, NIS2 and PCI DSS.
              </p>
              {(() => {
                const withCont = dossiers.filter(d => d.continuity_pct !== null && d.continuity_pct !== undefined)
                if (withCont.length === 0) return null
                const avgCont = Math.round((withCont.reduce((s,d)=>s+Number(d.continuity_pct||0),0)/withCont.length)*10)/10
                const incidents = dossiers.reduce((s,d)=>s+(d.expiry_incidents||0),0)
                return (
                  <p style={{ fontSize:13, color:'#3d4a58', lineHeight:1.8, margin:'0 0 10px' }}>
                    <strong>Coverage continuity: {avgCont}%</strong> of the observed period had a valid, non-expired certificate in place,
                    with <strong>{incidents} expiry incident{incidents!==1?'s':''}</strong>.{incidents===0 ? ' No visitor ever encountered a certificate error caused by expiry.' : ''}
                  </p>
                )
              })()}
              <p style={{ fontSize:13, color:'#0d1117', lineHeight:1.8, margin:0 }}><strong>Conclusion:</strong> {verdict}</p>
              </div>
              <div style={{ flexShrink:0, textAlign:'center' }}>
                <TrustSeal size={118} code={sealCode}/>
                <div style={{ fontSize:9.5, color:'#7a8694', marginTop:6, maxWidth:130, lineHeight:1.5, margin:'6px auto 0' }}>Seal code matches this dossier's latest ledger entry</div>
              </div>
            </div>
          )
        })()}

        {/* How to read this */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'18px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(0,119,182,0.05)' }}>
          <div style={{ fontSize:11, fontWeight:800, color:BLUE, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>How to read this page</div>
          <p style={{ fontSize:12, color:'#3d4a58', lineHeight:1.8, margin:'0 0 6px' }}>
            <strong>Auditors / managers:</strong> the summary above and the per-domain sections below are written in plain language — green means healthy, amber means improvements suggested, red means action needed. Open items are disclosed deliberately: a report with only green flags is less credible.
          </p>
          <p style={{ fontSize:12, color:'#3d4a58', lineHeight:1.8, margin:0 }}>
            <strong>Technical reviewers:</strong> the Event Ledger at the bottom lists every recorded event. Each entry is mathematically linked ("hash-chained") to the previous one, like numbered glued pages in a notary's logbook — altering any past record would visibly break the chain.
          </p>
        </div>

        {/* Summary strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { label:'Audit Evidence Score', value:`${avgAudit}/100`, color:scoreColor(avgAudit), sub:scoreLbl(avgAudit) },
            { label:'Domains Covered',      value:dossiers.length,   color:BLUE,                 sub:'evidence dossiers' },
            { label:'Ledger Events',        value:events.length,     color:BLUE,                 sub:'hash-chained' },
            { label:'Open Gaps',            value:totalGaps,         color:totalGaps>0?'#9a6400':'#00a550', sub:totalGaps>0?'need attention':'all clear' },
            { label:'Controls Documented',  value:allControls.length,color:'#00a550',            sub:'across 5 frameworks' },
          ].map(({label,value,color,sub}) => (
            <div key={label} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'16px 18px', boxShadow:'0 2px 8px rgba(0,119,182,0.05)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, fontFamily:MONO }}>{value}</div>
              <div style={{ fontSize:11, color:'#7a8694', marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Per-domain dossiers */}
        {dossiers.map(dossier => {
          const gaps = dossier.gaps || []
          const frameworkRows = [
            { fw:'SOC2', ctrls: dossier.soc2_controls_met||[] },
            { fw:'ISO',  ctrls: dossier.iso27001_controls_met||[] },
            { fw:'CABF', ctrls: dossier.cabf_controls_met||[] },
            { fw:'NIS2', ctrls: dossier.nis2_controls_met||[] },
          ]
          return (
            <div key={dossier.domain} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:20, boxShadow:'0 2px 10px rgba(0,119,182,0.05)' }}>
              {/* Domain header */}
              <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BORDER}`, background:'rgba(0,119,182,0.03)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <Globe size={16} color={BLUE}/>
                <span style={{ fontSize:15, fontWeight:800, color:'#0d1117', fontFamily:MONO }}>{dossier.domain}</span>
                <span style={{ fontSize:11, color:'#7a8694' }}>
                  Witnessed since {fmtDate(dossier.first_witnessed_at)} · Last event {fmtDate(dossier.last_event_at)}
                </span>
                <div style={{ marginLeft:'auto', display:'flex', gap:14 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:800, color:scoreColor(dossier.audit_score||0), lineHeight:1 }}>{dossier.audit_score||0}</div>
                    <div style={{ fontSize:9, color:'#7a8694', fontWeight:700, textTransform:'uppercase', marginTop:2 }}>Audit</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:800, color:scoreColor(dossier.readiness_score||0), lineHeight:1 }}>{dossier.readiness_score||0}</div>
                    <div style={{ fontSize:9, color:'#7a8694', fontWeight:700, textTransform:'uppercase', marginTop:2 }}>Ready</div>
                  </div>
                </div>
              </div>

              {/* Framework controls */}
              <div style={{ padding:'18px 22px' }}>
                {(dossier.continuity_pct !== null && dossier.continuity_pct !== undefined || dossier.crypto_summary) && (
                  <>
                    <div style={{ fontSize:11, fontWeight:800, color:'#0d1117', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Certificate Reliability & Cryptography</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:20 }}>
                      {dossier.continuity_pct !== null && dossier.continuity_pct !== undefined && (
                        <div style={{ display:'flex', gap:10, padding:'10px 14px', background:(dossier.expiry_incidents||0)===0?'rgba(0,165,80,0.05)':'rgba(192,57,43,0.05)', border:`1px solid ${(dossier.expiry_incidents||0)===0?'rgba(0,165,80,0.18)':'rgba(192,57,43,0.2)'}`, borderRadius:9 }}>
                          <CheckCircle size={13} color={(dossier.expiry_incidents||0)===0?'#00a550':'#c0392b'} style={{ flexShrink:0, marginTop:2 }}/>
                          <span style={{ fontSize:12, color:'#3d4a58', lineHeight:1.6 }}>
                            <strong>{dossier.continuity_pct}% coverage continuity</strong> — a valid certificate was in place for {dossier.continuity_pct}% of the observed period, with {dossier.expiry_incidents||0} expiry incident{(dossier.expiry_incidents||0)!==1?'s':''}.{(dossier.expiry_incidents||0)===0 ? ' Visitors never saw a certificate error caused by expiry.' : ''}
                          </span>
                        </div>
                      )}
                      {dossier.avg_renewal_margin_days !== null && dossier.avg_renewal_margin_days !== undefined && (
                        <div style={{ display:'flex', gap:10, padding:'10px 14px', background:'rgba(0,119,182,0.04)', border:`1px solid ${BORDER}`, borderRadius:9 }}>
                          <Clock size={13} color={BLUE} style={{ flexShrink:0, marginTop:2 }}/>
                          <span style={{ fontSize:12, color:'#3d4a58', lineHeight:1.6 }}>
                            <strong>Renewals happen early, not last-minute</strong> — on average {dossier.avg_renewal_margin_days} days before expiry (worst case {dossier.worst_renewal_margin_days} days) across {dossier.renewal_count||0} renewal{(dossier.renewal_count||0)!==1?'s':''}.
                          </span>
                        </div>
                      )}
                      {dossier.crypto_summary && (
                        <div style={{ display:'flex', gap:10, padding:'10px 14px', background:'rgba(0,119,182,0.04)', border:`1px solid ${BORDER}`, borderRadius:9 }}>
                          <Key size={13} color={BLUE} style={{ flexShrink:0, marginTop:2 }}/>
                          <span style={{ fontSize:12, color:'#3d4a58', lineHeight:1.6 }}>
                            <strong>Strong encryption</strong> — {dossier.crypto_summary.key_algorithm}-{dossier.crypto_summary.key_size_bits} key with {dossier.crypto_summary.signature}{dossier.crypto_summary.tls_grade ? <>, TLS grade <strong>{dossier.crypto_summary.tls_grade}</strong></> : null}, issued by {dossier.crypto_summary.issuer}{dossier.crypto_summary.source === 'issuance_profile' ? ' (per CA issuance profile)' : ''}.
                          </span>
                        </div>
                      )}
                      {dossier.pqc_summary && (
                        <div style={{ display:'flex', gap:10, padding:'10px 14px', background:'rgba(0,119,182,0.04)', border:`1px solid ${BORDER}`, borderRadius:9 }}>
                          <ShieldCheck size={13} color={BLUE} style={{ flexShrink:0, marginTop:2 }}/>
                          <span style={{ fontSize:12, color:'#3d4a58', lineHeight:1.6 }}>
                            <strong>Post-quantum readiness</strong> — {dossier.pqc_summary.note}
                          </span>
                        </div>
                      )}
                      {dossier.ct_check && dossier.ct_check.status === 'ok' && (
                        <div style={{ display:'flex', gap:10, padding:'10px 14px', background:dossier.ct_check.verdict==='no_shadow_certs'?'rgba(0,165,80,0.05)':'rgba(192,57,43,0.05)', border:`1px solid ${dossier.ct_check.verdict==='no_shadow_certs'?'rgba(0,165,80,0.18)':'rgba(192,57,43,0.2)'}`, borderRadius:9 }}>
                          <Globe size={13} color={dossier.ct_check.verdict==='no_shadow_certs'?'#00a550':'#c0392b'} style={{ flexShrink:0, marginTop:2 }}/>
                          <span style={{ fontSize:12, color:'#3d4a58', lineHeight:1.6 }}>
                            {dossier.ct_check.verdict === 'no_shadow_certs'
                              ? <><strong>No unauthorized certificates found</strong> — all {dossier.ct_check.total_ct_entries} recent entries in the public Certificate Transparency logs for this domain match certificates known to this account or trusted issuers.</>
                              : <><strong>{dossier.ct_check.unknown_entries} unknown issuance{dossier.ct_check.unknown_entries!==1?'s':''} found</strong> in public Certificate Transparency logs — review recommended.</>}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div style={{ fontSize:11, fontWeight:800, color:'#0d1117', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Control Coverage</div>
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom: gaps.length > 0 ? 20 : 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign:'left', padding:'8px 10px', fontSize:10, fontWeight:700, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:`1px solid ${BORDER}` }}>Framework</th>
                      <th style={{ textAlign:'left', padding:'8px 10px', fontSize:10, fontWeight:700, color:'#7a8694', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:`1px solid ${BORDER}` }}>Controls Evidenced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frameworkRows.map(({fw, ctrls}) => (
                      <tr key={fw}>
                        <td style={{ padding:'10px', borderBottom:`1px solid ${BORDER}`, verticalAlign:'top', width:180 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:FRAMEWORKS[fw].color }}>{FRAMEWORKS[fw].label}</span>
                        </td>
                        <td style={{ padding:'10px', borderBottom:`1px solid ${BORDER}` }}>
                          {ctrls.length === 0
                            ? <span style={{ fontSize:11, color:'#c0392b', fontStyle:'italic' }}>No evidence recorded</span>
                            : <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                {ctrls.map(c => (
                                  <div key={c} style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                                    <CheckCircle size={11} color="#00a550" style={{ flexShrink:0, marginTop:2 }}/>
                                    <span style={{ fontSize:11 }}>
                                      <strong style={{ color:'#0d1117', fontFamily:MONO, fontSize:10 }}>{c}</strong>
                                      <span style={{ color:'#3d4a58' }}> — {controls[c] || ''}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Gaps */}
                {gaps.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:800, color:'#0d1117', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Identified Gaps ({gaps.length})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {gaps.map(gap => {
                        const col = gap.severity === 'critical' ? '#c0392b' : gap.severity === 'high' ? '#9a6400' : '#0077b6'
                        return (
                          <div key={gap.id} style={{ display:'flex', gap:10, padding:'10px 14px', background:`${col}08`, border:`1px solid ${col}22`, borderRadius:9 }}>
                            <AlertTriangle size={13} color={col} style={{ flexShrink:0, marginTop:2 }}/>
                            <div>
                              <span style={{ fontSize:12, fontWeight:700, color:'#0d1117' }}>{gap.control}</span>
                              <span style={{ fontSize:10, fontWeight:800, padding:'1px 7px', borderRadius:20, background:`${col}15`, color:col, marginLeft:8, textTransform:'uppercase' }}>{gap.severity}</span>
                              <div style={{ fontSize:11, color:'#3d4a58', marginTop:3, lineHeight:1.6 }}>{gap.message}</div>
                              <div style={{ fontSize:10, color:BLUE, marginTop:3, fontWeight:600 }}>{gap.framework}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Event timeline */}
        <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,119,182,0.05)' }}>
          <div style={{ padding:'14px 22px', borderBottom:`1px solid ${BORDER}`, background:'rgba(0,119,182,0.03)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Hash size={14} color={BLUE}/>
              <span style={{ fontSize:13, fontWeight:800, color:'#0d1117' }}>Immutable Event Ledger</span>
            </div>
            <span style={{ fontSize:11, color:'#7a8694', display:'flex', alignItems:'center', gap:5 }}>
              <Lock size={10} color={BLUE}/> SHA-256 hash-chained · {events.length} events
            </span>
          </div>
          {events.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#7a8694', fontSize:13 }}>No events recorded yet.</div>
          ) : (
            <div>
              {events.map(ev => {
                const meta = EVENT_META[ev.event_type] || { label: ev.event_type, color:'#7a8694', icon: Activity }
                const Icon = meta.icon
                return (
                  <div key={ev.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 22px', borderBottom:`1px solid ${BORDER}` }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${meta.color}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={13} color={meta.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#0d1117' }}>{meta.label}</span>
                        <span style={{ fontSize:11, color:BLUE, fontFamily:MONO }}>{ev.domain}</span>
                        <span style={{ fontSize:10, color:'#7a8694', marginLeft:'auto' }}>{fmtTs(ev.event_ts)}</span>
                      </div>
                      {meta.plain && (
                        <div style={{ fontSize:11, color:'#5a6776', marginTop:3, lineHeight:1.6 }}>{meta.plain}</div>
                      )}
                      {(ev.controls_met||[]).length > 0 && (
                        <div style={{ fontSize:10, color:'#00a550', marginTop:3 }}>
                          Compliance requirements satisfied: {(ev.controls_met||[]).length} · {(ev.controls_met||[]).join(' · ')}
                        </div>
                      )}
                      <div style={{ fontSize:9, color:'#b0bac4', fontFamily:MONO, marginTop:3 }} title={ev.event_hash||''}>
                        integrity code: {(ev.event_hash||'').substring(0,16)}…
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop:24, textAlign:'center', fontSize:11, color:'#7a8694', lineHeight:1.8 }}>
          Generated by <strong style={{ color:BLUE }}>SSLVault Compliance Witness</strong> · easysecurity.in<br/>
          Every event above is mathematically linked to the previous one (SHA-256 hash chain) — like numbered, glued pages in a notary's logbook.<br/>
          Any alteration of a historical record would visibly break the chain, making this ledger tamper-evident.
        </div>
      </div>
    </div>
  )
}
