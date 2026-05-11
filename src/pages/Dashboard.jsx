import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, Plus, RefreshCw, Download, ExternalLink, X, Lock,
  AlertTriangle, CheckCircle, Globe, ChevronRight,
  Copy, Check, TrendingUp, Activity, Zap,
  ArrowRight, Server, FileText, Eye, EyeOff, Trash2, ShieldOff, ShieldCheck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import '../styles/design-v2.css'
import AgentInstall from '../components/AgentInstall'

// ── Helpers ──────────────────────────────────────────────────────────
function daysLeft(iso) {
  if (!iso) return null
  return differenceInDays(new Date(iso), new Date())
}
function statusOf(days, revoked, status) {
  if (status === 'sandbox_revoked') return { cls: 'grey',  label: 'Sandbox revoked', dot: 'grey'  }
  if (revoked)       return { cls: 'red',   label: 'Revoked',       dot: 'red'   }
  if (days == null)  return { cls: 'grey',  label: 'Not scanned',   dot: 'grey'  }
  if (days < 0)      return { cls: 'red',   label: 'Expired',       dot: 'red'   }
  if (days < 14)     return { cls: 'amber', label: `${days}d left`, dot: 'amber' }
  if (days < 30)     return { cls: 'amber', label: `${days}d left`, dot: 'amber' }
  return               { cls: 'green', label: `${days}d left`, dot: 'green' }
}
function fmtDate(iso) {
  if (!iso) return '—'
  return format(new Date(iso), 'MMM d, yyyy')
}
function fmtDateLong(iso) {
  if (!iso) return '—'
  return format(new Date(iso), 'PPP')
}
function dl(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── CopyBtn ──────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button className="v2-btn v2-btn-sm" onClick={copy}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

// ── StatusPill ───────────────────────────────────────────────────────
function StatusPill({ days, revoked, status }) {
  const s = statusOf(days, revoked, status)
  const tone = s.cls === 'green' ? 'green' : s.cls === 'amber' ? 'amber' : 'grey'
  return (
    <span className={`v2-status v2-status-${tone}`}>
      <span className={`v2-dot v2-dot-${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── ProgressBar ──────────────────────────────────────────────────────
function ProgressBar({ days, max = 90 }) {
  const pct = days == null ? 0 : Math.max(0, Math.min(100, (days / max) * 100))
  const cls = days == null ? '' : days < 0 ? 'red' : days < 14 ? 'red' : days < 30 ? 'amber' : ''
  return (
    <div className="v2-bar">
      <div className={`v2-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── CertDetail panel ─────────────────────────────────────────────────
function CertDetail({ cert, onClose, onRenew, onDelete, onKeyDeleted, onInstall, isPro, nav, justRotated }) {
  const days = daysLeft(cert.expires_at)
  const s = statusOf(days, cert.status === 'revoked', cert.status)
  const [showKey, setShowKey] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [keyDelConfirm, setKeyDelConfirm] = useState(false)
  const [keyDeleted, setKeyDeleted] = useState(!cert.private_key_pem)
  const [keyDeleting, setKeyDeleting] = useState(false)
  const [keyChecks, setKeyChecks] = useState({ downloaded: false, installed: false, understand: false })
  const [bannerVisible, setBannerVisible] = useState(true)
  const [newPillVisible, setNewPillVisible] = useState(true)
  const [renewState, setRenewState] = useState(null)
  // renewState: null | { phase: 'checking'|'issuing'|'verifying'|'finalizing'|'done'|'error', msg: string }

  const allChecked = keyChecks.downloaded && keyChecks.installed && keyChecks.understand
  const hasAgentInstall = !!cert.agent_url

  // Auto-dismiss the NEW pill after 30s, banner after 8s
  useEffect(() => {
    if (!justRotated) return
    setBannerVisible(true); setNewPillVisible(true)
    const t1 = setTimeout(() => setBannerVisible(false), 8000)
    const t2 = setTimeout(() => setNewPillVisible(false), 30000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [justRotated])

  // ── Smart renew: auto-issue if DNS creds exist, else send to Generate ──
  const handleSmartRenew = () => {
    // Renewal = place a new TSS order for the domain
    sessionStorage.setItem('prefill_domain', cert.domain)
    onClose()
    nav('/buy')
  }

  const doDeleteKey = async () => {
    setKeyDeleting(true)
    const { error } = await supabase
      .from('certificates')
      .update({ private_key_pem: null })
      .eq('id', cert.id)
    setKeyDeleting(false)
    if (!error) {
      setKeyDeleted(true)
      setKeyDelConfirm(false)
      if (onKeyDeleted) onKeyDeleted(cert.id)
    }
  }
  return (
    <div className="v2-detail" style={{
      position: 'sticky', top: 20,
      borderLeft: justRotated && newPillVisible ? '3px solid var(--v2-green)' : undefined,
      transition: 'border-left 0.5s ease'
    }}>
      {/* Rotation success banner */}
      {justRotated && bannerVisible && (
        <div style={{
          background: 'var(--v2-green-bg)', border: '0.5px solid var(--v2-green-border)',
          borderRadius: 'var(--v2-r-md)', padding: '10px 12px', marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle size={14} color="var(--v2-green)" style={{ flexShrink:0, marginTop:1 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--v2-green-text)', marginBottom:2 }}>
              Certificate rotated successfully — new key active
            </div>
            <div style={{ fontSize:11, color:'var(--v2-green-text)', opacity:0.85 }}>
              Old certificate archived for 30 days. Install the new certificate on your server.
            </div>
          </div>
          <button onClick={() => setBannerVisible(false)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--v2-green-text)',
                      padding:'0 2px', lineHeight:1, flexShrink:0, fontSize:14 }}>✕</button>
        </div>
      )}
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <span className="v2-mono" style={{ fontSize:14, fontWeight:600, wordBreak:'break-all', color:'var(--v2-text)' }}>
              {cert.domain}
            </span>
            <StatusPill days={days} revoked={cert.status === 'revoked'} status={cert.status} />
            {cert.is_sandbox && (
              <span style={{ fontSize:9, fontWeight:700, color:'#7c3aed', background:'#f5f3ff',
                border:'0.5px solid #ddd6fe', borderRadius:3, padding:'1px 6px', letterSpacing:'0.3px' }}>
                SANDBOX
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
            Issued {fmtDateLong(cert.issued_at || cert.created_at)}
          </div>
        </div>
        <button className="v2-modal-close" onClick={onClose} style={{ flexShrink:0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Status banner */}
      {cert.status === 'sandbox_revoked' && (
        <div className="v2-detail-banner" style={{ marginBottom:14, background:'#f5f3ff', border:'0.5px solid #ddd6fe', color:'#6d28d9' }}>
          <RefreshCw size={13} />
          This sandbox certificate was auto-revoked by TheSSLStore and has been replaced by a new certificate above.
        </div>
      )}
      {cert.status !== 'sandbox_revoked' && cert.is_sandbox && (
        <div className="v2-detail-banner" style={{ marginBottom:14, background:'#f5f3ff', border:'0.5px solid #ddd6fe', color:'#6d28d9' }}>
          <RefreshCw size={13} />
          Sandbox mode — TSS will revoke this cert within 48 hours. SSLVault auto-renews it automatically.
        </div>
      )}
      {cert.status !== 'sandbox_revoked' && days != null && days < 30 && (
        <div className={`v2-detail-banner ${s.cls === 'amber' ? 'amber' : ''}`} style={{ marginBottom:14 }}>
          <AlertTriangle size={13} />
          {days < 0 ? 'This certificate has expired. Renew immediately.' : `Expires in ${days} days. Renew before it impacts your site.`}
        </div>
      )}
      {cert.status !== 'sandbox_revoked' && days != null && days >= 30 && (
        <div className="v2-detail-banner" style={{ marginBottom:14 }}>
          <CheckCircle size={13} />
          Certificate is healthy — {days} days remaining.
        </div>
      )}

      {/* Expiry bar */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--v2-text-3)', marginBottom:6 }}>
          <span>Validity period</span>
          <span>{fmtDate(cert.expires_at)}</span>
        </div>
        <ProgressBar days={days} />
      </div>

      {/* Meta */}
      <div className="v2-section-label" style={{ marginBottom:10 }}>Certificate details</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        {[
          { label:'Domain',  value: cert.domain },
          { label:'Issued',  value: fmtDate(cert.issued_at || cert.created_at), isNew: justRotated && newPillVisible },
          { label:'Expires', value: fmtDate(cert.expires_at), isNew: justRotated && newPillVisible },
          { label:'Type',    value: cert.cert_type || 'SSL Certificate' },
          { label:'Status',  value: cert.status || 'issued' },
        ].map(({ label, value, isNew }) => (
          <div key={label} className="v2-metric-row" style={{ justifyContent:'space-between' }}>
            <span className="v2-metric-label">{label}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {isNew && (
                <span style={{
                  fontSize:8, fontWeight:700, color:'var(--v2-green)', background:'var(--v2-green-bg)',
                  border:'0.5px solid var(--v2-green-border)', borderRadius:3, padding:'1px 5px',
                  textTransform:'uppercase', letterSpacing:'0.4px',
                  animation:'pulse 2s ease-in-out infinite'
                }}>NEW</span>
              )}
              <span className="v2-metric-value v2-mono" style={{ fontSize:11 }}>{value}</span>
            </div>
          </div>
        ))}

        {/* Fingerprint row */}

        {/* Serial row */}
      </div>

      {/* Rotation verification block */}
      {justRotated && (
        <div style={{
          background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-green-border)',
          borderRadius:'var(--v2-r-md)', padding:'12px 14px', marginBottom:16
        }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--v2-green-text)', marginBottom:10,
                         display:'flex', alignItems:'center', gap:6 }}>
            <CheckCircle size={12} color="var(--v2-green)" /> Rotation verified
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:9, fontWeight:600, color:'var(--v2-text-3)', textTransform:'uppercase',
                             letterSpacing:'0.4px', marginBottom:4 }}>Previous cert</div>
              <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                Expired {fmtDate(justRotated.oldExpires)}
              </div>
            </div>
            <ArrowRight size={12} color="var(--v2-green)" style={{ flexShrink:0 }} />
            <div>
              <div style={{ fontSize:9, fontWeight:600, color:'var(--v2-green-text)', textTransform:'uppercase',
                             letterSpacing:'0.4px', marginBottom:4 }}>Current cert</div>
              <div style={{ fontSize:11, color:'var(--v2-text-2)' }}>
                Expires {fmtDate(cert.expires_at)}
              </div>
            </div>
          </div>
          <div style={{ fontSize:10, color:'var(--v2-text-3)', marginTop:8, borderTop:'0.5px solid var(--v2-border)', paddingTop:8 }}>
            Rotated {formatDistanceToNow(new Date(justRotated.at), { addSuffix: true })} · Old cert archived for 30 days
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.55 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
      `}</style>

      {/* Key security banner */}
      {cert.private_key_pem && !keyDeleted && !keyDelConfirm && (
        <div style={{ background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:'var(--v2-r-md)',
                      padding:'10px 12px', marginBottom:14, display:'flex', gap:10, alignItems:'flex-start' }}>
          <ShieldOff size={13} color="#b45309" style={{ flexShrink:0, marginTop:1 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#92400e', marginBottom:2 }}>
              Private key stored server-side
            </div>
            <div style={{ fontSize:11, color:'#b45309', lineHeight:1.5 }}>
              After agent installation is complete, delete the server-side copy to reduce exposure.
              {!isPro && (
                <span> Or <button onClick={() => nav('/pricing')} style={{ background:'none', border:'none',
                  cursor:'pointer', color:'#7c3aed', fontWeight:600, fontSize:11, padding:0,
                  textDecoration:'underline', textUnderlineOffset:2 }}>upgrade to KeyLocker Pro</button> for encrypted vault storage.</span>
              )}
            </div>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={() => setKeyDelConfirm(true)}
            style={{ fontSize:10, whiteSpace:'nowrap', flexShrink:0, borderColor:'#fcd34d', color:'#92400e' }}>
            <Trash2 size={9} /> Delete key
          </button>
        </div>
      )}

      {/* Key deleted confirmation badge */}
      {keyDeleted && (
        <div style={{ background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                      borderRadius:'var(--v2-r-md)', padding:'10px 12px', marginBottom:14,
                      display:'flex', gap:8, alignItems:'center' }}>
          <ShieldCheck size={13} color="var(--v2-green)" />
          <div style={{ fontSize:12, color:'var(--v2-green-text)', fontWeight:500 }}>
            Private key deleted from SSLVault servers — only your local copy remains.
          </div>
        </div>
      )}

      {/* Delete key confirmation modal */}
      {keyDelConfirm && (
        <div style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-amber-border)',
                      borderRadius:'var(--v2-r-lg)', padding:'16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <AlertTriangle size={14} color="var(--v2-amber)" />
            <span style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>
              Delete private key from servers
            </span>
          </div>

          {/* Interlock warning if no install recorded */}
          {!hasAgentInstall && (
            <div className="v2-callout error" style={{ marginBottom:12, fontSize:11 }}>
              <div className="v2-callout-title" style={{ fontSize:11 }}>No agent install recorded</div>
              If you plan to use the SSLVault agent or cPanel agent to install this certificate,
              do NOT delete the key yet — the agent requires the server-side copy.
              Only proceed if you have already installed manually.
            </div>
          )}

          <div style={{ fontSize:11, color:'var(--v2-text-2)', marginBottom:12, lineHeight:1.6 }}>
            This permanently removes the private key from SSLVault servers.
            This action cannot be undone. Confirm all three before proceeding:
          </div>

          {[
            { key:'downloaded', label:'I have downloaded key.pem to a safe local location' },
            { key:'installed',  label:'My server has the certificate installed and working' },
            { key:'understand', label:'I understand this is irreversible and the key will be gone from SSLVault' },
          ].map(({ key, label }) => (
            <label key={key} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8,
                                       cursor:'pointer', fontSize:12, color:'var(--v2-text-2)', lineHeight:1.5 }}>
              <input type="checkbox" checked={keyChecks[key]}
                onChange={e => setKeyChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                style={{ marginTop:2, width:'auto', flexShrink:0 }} />
              {label}
            </label>
          ))}

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="v2-btn v2-btn-sm" onClick={() => { setKeyDelConfirm(false); setKeyChecks({ downloaded:false, installed:false, understand:false }) }}
              style={{ fontSize:11 }}>
              Cancel
            </button>
            <button onClick={doDeleteKey} disabled={!allChecked || keyDeleting}
              style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11,
                        background: allChecked ? 'var(--v2-red)' : 'var(--v2-surface-3)',
                        color: allChecked ? 'white' : 'var(--v2-text-3)',
                        border:'none', borderRadius:'var(--v2-r-md)', padding:'5px 10px',
                        cursor: allChecked ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontWeight:500 }}>
              <Trash2 size={10} />
              {keyDeleting ? 'Deleting…' : 'Permanently delete key'}
            </button>
          </div>
        </div>
      )}

      {/* Files */}
      {(cert.cert_pem || cert.private_key_pem) && (
        <>
          <div className="v2-section-label" style={{ marginBottom:10 }}>Certificate files</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {cert.cert_pem && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                            background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                            borderRadius:'var(--v2-r-md)', padding:'8px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={12} color="var(--v2-text-3)" />
                  <span style={{ fontSize:12, fontWeight:500 }}>cert.pem</span>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <CopyBtn text={cert.cert_pem} label="Copy" />
                  <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.cert_pem, `${cert.domain}-cert.pem`)}>
                    <Download size={10} /> Save
                  </button>
                </div>
              </div>
            )}
            {cert.private_key_pem && (
              <div style={{ background:'var(--v2-surface-3)', border:'0.5px solid var(--v2-border)',
                            borderRadius:'var(--v2-r-md)', padding:'8px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                              marginBottom: showKey ? 10 : 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Lock size={12} color="var(--v2-text-3)" />
                    <span style={{ fontSize:12, fontWeight:500 }}>private key</span>
                    <span className="v2-chip" style={{ fontSize:9 }}>SENSITIVE</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="v2-btn v2-btn-sm" onClick={() => setShowKey(v => !v)}>
                      {showKey ? <EyeOff size={10} /> : <Eye size={10} />}
                      {showKey ? 'Hide' : 'Reveal'}
                    </button>
                    <button className="v2-btn v2-btn-sm" onClick={() => dl(cert.private_key_pem, `${cert.domain}-key.pem`)}>
                      <Download size={10} /> Save
                    </button>
                  </div>
                </div>
                {showKey && (
                  <div style={{ marginTop:8, background:'#0a0a0a', borderRadius:'var(--v2-r-sm)',
                                padding:'8px 10px', fontSize:10, fontFamily:'var(--mono, monospace)',
                                color:'#e5e5e5', whiteSpace:'pre-wrap', wordBreak:'break-all',
                                maxHeight:120, overflowY:'auto', lineHeight:1.5 }}>
                    {cert.private_key_pem}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Smart renew progress */}
      {renewState && (
        <div style={{
          background: renewState.phase === 'done' ? 'var(--v2-green-bg)'
            : renewState.phase === 'error' ? '#fef2f2'
            : 'var(--v2-surface-3)',
          border: `0.5px solid ${renewState.phase === 'done' ? 'var(--v2-green-border)'
            : renewState.phase === 'error' ? '#fecaca' : 'var(--v2-border)'}`,
          borderRadius: 'var(--v2-r-md)', padding: '12px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'flex-start', gap: 10
        }}>
          {renewState.phase === 'done'
            ? <CheckCircle size={14} color="var(--v2-green)" style={{ flexShrink:0, marginTop:1 }} />
            : renewState.phase === 'error'
            ? <AlertTriangle size={14} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} />
            : <RefreshCw size={14} color="var(--v2-text-3)" style={{ flexShrink:0, marginTop:1, animation:'spin 1s linear infinite' }} />}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:2,
              color: renewState.phase === 'done' ? 'var(--v2-green-text)'
                : renewState.phase === 'error' ? '#dc2626' : 'var(--v2-text)' }}>
              {renewState.phase === 'done' ? 'Renewed' : renewState.phase === 'error' ? 'Renewal failed' : 'Renewing…'}
            </div>
            <div style={{ fontSize:11, color: renewState.phase === 'error' ? '#dc2626' : 'var(--v2-text-2)', lineHeight:1.5 }}>
              {renewState.msg}
            </div>
          </div>
          {renewState.phase === 'error' && (
            <button onClick={() => setRenewState(null)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:14, flexShrink:0 }}>✕</button>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className="v2-btn v2-btn-primary" style={{ flex:1 }}
          onClick={handleSmartRenew}
          disabled={!!renewState && renewState.phase !== 'error'}>
          <RefreshCw size={12} /> Renew certificate
        </button>
        <button className="v2-btn v2-btn-sm" onClick={() => onInstall(cert)}
          style={{ fontSize:12 }}>
          <Server size={11} /> Install
        </button>
        {!delConfirm
          ? <button className="v2-btn v2-btn-danger v2-btn-sm" onClick={() => setDelConfirm(true)}><X size={11} /> Delete</button>
          : <button className="v2-btn v2-btn-danger" onClick={() => onDelete(cert.id)}>Confirm delete</button>
        }
      </div>
    </div>
  )
}

// ── CertRow ──────────────────────────────────────────────────────────
function CertRow({ cert, selected, onClick }) {
  const days = daysLeft(cert.expires_at)
  const isSandboxRevoked = cert.status === 'sandbox_revoked'
  const s = statusOf(days, cert.status === 'revoked', cert.status)
  const initials = cert.domain.replace(/^www\./, '').slice(0, 2).toUpperCase()
  const colors = { green:'#10b981', amber:'#f59e0b', red:'#dc2626', grey:'#d4d4d4' }
  return (
    <div className={`v2-list-row status-${s.dot} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={isSandboxRevoked ? { opacity: 0.45, pointerEvents: 'none', cursor: 'default' } : {}}>
      <div className="v2-row-icon" style={{ background: colors[s.dot] }}>{initials}</div>
      <div className="v2-row-body">
        <div className="v2-row-title-line">
          <span className="v2-row-title v2-mono">{cert.domain}</span>
          <StatusPill days={days} revoked={cert.status === 'revoked'} status={cert.status} />
          {cert.is_sandbox && !isSandboxRevoked && (
            <span title="Sandbox certificate — auto-renews every ~40 hours" style={{ display:'inline-flex', alignItems:'center',
              gap:3, fontSize:9, fontWeight:600, color:'#7c3aed', background:'#f5f3ff',
              border:'0.5px solid #ddd6fe', borderRadius:3, padding:'1px 5px', letterSpacing:'0.2px' }}>
              SANDBOX
            </span>
          )}
          {cert.private_key_pem && !isSandboxRevoked && (
            <span title="Private key stored server-side" style={{ display:'inline-flex', alignItems:'center',
              gap:3, fontSize:9, fontWeight:600, color:'#92400e', background:'#fffbeb',
              border:'0.5px solid #fde68a', borderRadius:3, padding:'1px 5px', letterSpacing:'0.2px' }}>
              <ShieldOff size={8} /> KEY STORED
            </span>
          )}
        </div>
        <div className="v2-row-meta">
          {isSandboxRevoked
            ? <span>Sandbox cert — replaced by renewed certificate above</span>
            : <>
                <span>Expires {fmtDate(cert.expires_at)}</span>
                <span className="v2-row-meta-sep">·</span>
                {cert.cert_type === 'RapidSSL DV'
                  ? <span style={{ fontSize:9, fontWeight:700, color:'#185FA5', background:'#E6F1FB',
                                    border:'0.5px solid #B5D4F4', borderRadius:3, padding:'1px 5px' }}>RapidSSL</span>
                  : <span>{cert.cert_type || 'SSL Certificate'}</span>}
                {cert.issued_at && <><span className="v2-row-meta-sep">·</span><span>Issued {fmtDate(cert.issued_at)}</span></>}
              </>
          }
        </div>
        {!isSandboxRevoked && days != null && days <= 90 && <div style={{ marginTop:6 }}><ProgressBar days={days} /></div>}
      </div>
      {!isSandboxRevoked && <ChevronRight size={14} color="var(--v2-text-3)" style={{ flexShrink:0 }} />}
    </div>
  )
}

// ── RenewModal ───────────────────────────────────────────────────────
function RenewModal({ domain, onClose, nav }) {
  return (
    <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="v2-modal">
        <div className="v2-modal-head">
          <div>
            <div className="v2-modal-title">Renew certificate</div>
            <div className="v2-modal-subtitle v2-mono">{domain}</div>
          </div>
          <button className="v2-modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="v2-modal-body">
          <div className="v2-callout tip" style={{ marginBottom:16 }}>
            <div className="v2-callout-title">Domain pre-filled for you</div>
            Clicking Renew will open Issue Certificate with <strong>{domain}</strong> already entered.
            Complete the DNS challenge to get a fresh 90-day certificate.
          </div>
          <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6 }}>
            This places a new RapidSSL order via TheSSLStore — same process as the first time.
            Your old certificate stays active until you install the new one.
          </div>
        </div>
        <div className="v2-modal-foot">
          <button className="v2-btn" onClick={onClose}>Cancel</button>
          <button className="v2-btn v2-btn-primary" onClick={() => {
            sessionStorage.setItem('prefill_domain', domain)
            onClose()
            nav('/buy')
          }}>
            <Shield size={13} /> Renew certificate
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// LOGGED-IN DASHBOARD
// ══════════════════════════════════════════════════════════════════════
function LoggedInDashboard({ user, nav }) {
  const { isPro } = usePlan(user)
  const [certs, setCerts]         = useState([])
  const [monitored, setMon]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [agentCert, setAgentCert] = useState(null)
  const [showRotated, setShowRotated] = useState(false)
  const [justRotated, setJustRotated] = useState(null) // { domain, oldFingerprint, oldExpires, oldIssued, at }
  const selectedRef = useRef(null)
  selectedRef.current = selected

  const loadCerts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: certsData }, { data: ordersData }, { data: monData }] = await Promise.all([
      supabase.from('certificates').select('*').eq('user_id', user.id).order('issued_at', { ascending: false }),
      supabase.from('ssl_orders').select('*').eq('user_id', user.id).eq('status', 'issued').order('updated_at', { ascending: false }),
      supabase.from('monitored_domains').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    const all = [...(certsData || [])]
    for (const o of (ordersData || [])) {
      if (!all.find(c => c.domain === o.domain)) all.push({ ...o, from_order: true })
    }
    all.sort((a, b) => {
      const da = daysLeft(a.expires_at), db = daysLeft(b.expires_at)
      if (da == null) return 1; if (db == null) return -1; return da - db
    })
    setCerts(all); setMon(monData || []); setLoading(false)

    // Auto-switch: if current selected cert is now 'rotating', jump to the new one
    const curSelected = selectedRef.current
    if (curSelected) {
      const oldCert = all.find(c => c.id === curSelected)
      if (oldCert && oldCert.status === 'rotating') {
        const newCert = all
          .filter(c => c.domain === oldCert.domain && c.status !== 'rotating')
          .sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at))[0]
        if (newCert) {
          setSelected(newCert.id)
          setJustRotated({
            domain: oldCert.domain,
            oldExpires: oldCert.expires_at,
            oldIssued: oldCert.issued_at,
            at: Date.now(),
          })
        }
      }
    }
  }, [user])

  // Initial load
  useEffect(() => { loadCerts() }, [loadCerts])

  // Auto-open install modal when arriving from BuyCertificate "Install on server" button
  useEffect(() => {
    const domain = sessionStorage.getItem('install_domain')
    if (!domain || !certs.length) return
    sessionStorage.removeItem('install_domain')
    const cert = certs.find(c => c.domain === domain && c.private_key_pem)
    if (cert) {
      setSelected(cert.id)
      setAgentCert(cert)
    }
  }, [certs])

  // Refresh on tab focus (catches rotations done on KeyLocker page)
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') loadCerts() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [loadCerts])

  const handleDelete = async (id) => {
    await supabase.from('certificates').delete().eq('id', id)
    setCerts(prev => prev.filter(c => c.id !== id))
    setSelected(null)
    setJustRotated(null)
  }

  const handleKeyDeleted = (id) => {
    setCerts(prev => prev.map(c => c.id === id ? { ...c, private_key_pem: null } : c))
  }

  const activeCerts = certs.filter(c => c.status !== 'rotating' && c.status !== 'sandbox_revoked')
  const total    = activeCerts.length
  const healthy  = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 30 }).length
  const expiring = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d >= 0 && d < 30 }).length
  const expired  = activeCerts.filter(c => { const d = daysLeft(c.expires_at); return d != null && d < 0 }).length

  // Sandbox certs that are currently active
  const sandboxActiveDomains = [...new Set(
    certs.filter(c => c.is_sandbox && c.status === 'active').map(c => c.domain)
  )]

  // Certs with status 'rotating' are hidden from the list
  // They are kept in DB for 30-day rollback but not shown to user
  const rotatingDomains = certs
    .filter(c => c.status === 'rotating')
    .map(c => c.domain)

  // sandbox_revoked certs — shown greyed out, grouped below active certs
  const sandboxRevokedDomains = [...new Set(
    certs.filter(c => c.status === 'sandbox_revoked').map(c => c.domain)
  )]

  const visible = certs.filter(c => {
    if (c.status === 'rotating') return false  // hide rotating (old) certs
    // sandbox_revoked: only show in 'all' filter, not in health filters
    if (c.status === 'sandbox_revoked') {
      if (filter !== 'all') return false
      if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }
    const d = daysLeft(c.expires_at)
    const s = statusOf(d, c.status === 'revoked', c.status)
    if (filter === 'healthy'  && s.cls !== 'green')  return false
    if (filter === 'expiring' && s.cls !== 'amber')  return false
    if (filter === 'expired'  && s.cls !== 'red')    return false
    if (search && !c.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Unique domains that have been rotated (new cert issued, old hidden)
  // Only show banner for domains where new cert exists alongside rotating old one
  const newlyRotated = [...new Set(
    certs
      .filter(c => c.status !== 'rotating') // new certs
      .filter(c => rotatingDomains.includes(c.domain)) // that have a rotating counterpart
      .map(c => c.domain)
  )]

  const selectedCert = selected ? certs.find(c => c.id === selected) : null

  return (
    <div className="v2-page">
      <div className="v2-container">

        {/* Page hero */}
        <div className="v2-page-hero">
          <h1 className="v2-h1">Dashboard</h1>
          <p className="v2-subtitle">
            {user.email} · {total} certificate{total !== 1 ? 's' : ''} · {monitored.length} monitored
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
          {[
            { label:'Total certs',   value: total,    accent:'var(--v2-border-strong)', delta: null },
            { label:'Healthy',       value: healthy,  accent:'var(--v2-green)',          delta: healthy > 0 ? 'All good' : null },
            { label:'Expiring soon', value: expiring, accent: expiring > 0 ? 'var(--v2-amber)' : 'var(--v2-border-strong)', delta: expiring > 0 ? 'Renew now' : 'None' },
            { label:'Expired',       value: expired,  accent: expired > 0 ? 'var(--v2-red)' : 'var(--v2-border-strong)', delta: expired > 0 ? 'Action needed' : 'None' },
          ].map(s => (
            <div key={s.label} className="v2-stat" style={{ borderTop:`2px solid ${s.accent}` }}>
              <div className="v2-stat-label">{s.label}</div>
              <div className="v2-stat-value">{s.value}</div>
              {s.delta && <div className="v2-stat-delta">{s.delta}</div>}
            </div>
          ))}
        </div>

        {/* Sandbox mode banner */}
        {sandboxActiveDomains.length > 0 && (
          <div style={{ background:'#f5f3ff', border:'0.5px solid #ddd6fe',
                        borderRadius:'var(--v2-r-lg)', padding:'12px 16px',
                        marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
            <RefreshCw size={15} color="#7c3aed" style={{ flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#6d28d9' }}>Sandbox mode active — </span>
              <span style={{ fontSize:12, color:'#7c3aed' }}>
                TSS sandbox certs are auto-revoked within 48 hours. SSLVault renews them automatically every ~40 hours. Greyed entries below are previous sandbox revocations.
              </span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {expired > 0 && (
          <div className="v2-callout error" style={{ marginBottom:16 }}>
            <div className="v2-callout-title">{expired} expired certificate{expired !== 1 ? 's' : ''} — your site may show SSL warnings</div>
            Select the certificate below and click Renew to fix it immediately.
          </div>
        )}
        {expiring > 0 && expired === 0 && (
          <div className="v2-callout warning" style={{ marginBottom:16 }}>
            <div className="v2-callout-title">{expiring} certificate{expiring !== 1 ? 's' : ''} expiring within 30 days</div>
            Renew early to avoid any downtime or browser warnings.
          </div>
        )}

        {/* Rotation banner — new cert issued, needs installing on server */}
        {newlyRotated.length > 0 && (
          <div style={{ background:'#fffbeb', border:'0.5px solid #fde68a',
                        borderRadius:'var(--v2-r-lg)', padding:'14px 18px',
                        marginBottom:16, display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)', flexShrink:0,
                           background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={16} color='#b45309' />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#92400e', marginBottom:4 }}>
                New certificate{newlyRotated.length > 1 ? 's' : ''} issued — install on your server
              </div>
              <div style={{ fontSize:12, color:'#b45309', lineHeight:1.6 }}>
                {newlyRotated.map(d => (
                  <span key={d} className="v2-chip-mono" style={{ marginRight:6, fontSize:11 }}>{d}</span>
                ))}
                {' '}— your server is still running the old certificate. Install the new one as soon as possible.
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button className="v2-btn v2-btn-sm v2-btn-primary" onClick={() => {
                const cert = certs.find(c => newlyRotated.includes(c.domain) && c.status !== 'rotating' && c.private_key_pem)
                if (cert) { setSelected(cert.id); setAgentCert(cert) }
              }} style={{ fontSize:11 }}>
                Install now
              </button>
              <button className="v2-btn v2-btn-sm" onClick={() => nav('/install')}
                style={{ fontSize:11 }}>
                Guide
              </button>
            </div>
          </div>
        )}

        {/* Split layout */}
        <div className="v2-split" style={{ display:'grid', gridTemplateColumns: selectedCert ? '1fr 380px' : '1fr', gap:16, alignItems:'start' }}>

          {/* Certificate list */}
          <div className="v2-card">
            {/* Toolbar */}
            <div className="v2-filter-bar" style={{ flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', gap:4 }}>
                {[
                  { key:'all',      label:'All',      count: total },
                  { key:'healthy',  label:'Healthy',  count: healthy },
                  { key:'expiring', label:'Expiring', count: expiring },
                  { key:'expired',  label:'Expired',  count: expired },
                ].map(f => (
                  <button key={f.key} className={`v2-filter-chip ${filter === f.key ? 'active' : ''}`}
                    onClick={() => setFilter(f.key)}>
                    {f.label}<span className="v2-filter-chip-count">{f.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <input className="v2-input"
                    style={{ width:190, padding:'5px 10px 5px 28px', fontSize:12 }}
                    placeholder="Search domains…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <Globe size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)',
                                            color:'var(--v2-text-3)', pointerEvents:'none' }} />
                </div>
                <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => nav('/generate')}>
                  <Plus size={12} /> Issue certificate
                </button>
              </div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="v2-empty">
                <div className="v2-empty-icon"><RefreshCw size={20} className="spin" /></div>
                <div className="v2-empty-title">Loading certificates…</div>
              </div>
            ) : visible.length === 0 ? (
              <div className="v2-empty">
                <div className="v2-empty-icon"><Shield size={22} /></div>
                <div className="v2-empty-title">{total === 0 ? 'No certificates yet' : 'No results'}</div>
                <div className="v2-empty-desc">
                  {total === 0 ? 'Issue your first free SSL certificate to get started.' : 'Try a different filter or search term.'}
                </div>
                {total === 0 && (
                  <button className="v2-btn v2-btn-primary" onClick={() => nav('/generate')}>
                    <Plus size={13} /> Issue your first certificate
                  </button>
                )}
              </div>
            ) : (
              <>
              <div className="v2-list-scroll">
                {visible.map(cert => (
                  <CertRow key={cert.id} cert={cert}
                    selected={selected === cert.id}
                    onClick={() => setSelected(selected === cert.id ? null : cert.id)} />
                ))}
              </div>

              {/* Rotated certs toggle */}
              {rotatingDomains.length > 0 && (
                <div>
                  <button onClick={() => setShowRotated(v => !v)}
                    style={{ width:'100%', padding:'10px 16px', background:'none', border:'none',
                              borderTop:'0.5px solid var(--v2-border)', cursor:'pointer',
                              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                              fontSize:12, color:'var(--v2-text-3)', fontFamily:'inherit',
                              fontWeight:500 }}>
                    <RefreshCw size={11} />
                    {showRotated
                      ? `Hide rotated certificates`
                      : `Show ${rotatingDomains.length} rotated certificate${rotatingDomains.length > 1 ? 's' : ''}`}
                    <span style={{ fontSize:10, transform: showRotated ? 'rotate(180deg)' : 'none',
                                    display:'inline-block', transition:'transform 0.2s' }}>▾</span>
                  </button>

                  {showRotated && (
                    <div style={{ borderTop:'0.5px solid var(--v2-border)',
                                   background:'var(--v2-surface-3)' }}>
                      <div style={{ padding:'8px 16px 4px', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, fontWeight:600, color:'var(--v2-text-3)',
                                        textTransform:'uppercase', letterSpacing:'0.4px' }}>
                          Rotated — replaced by new certificates above
                        </span>
                      </div>
                      {certs.filter(c => c.status === 'rotating').map(cert => {
                        const days = daysLeft(cert.expires_at)
                        return (
                          <div key={cert.id}
                            style={{ display:'flex', alignItems:'center', gap:12,
                                      padding:'10px 16px', opacity:0.55,
                                      borderBottom:'0.5px solid var(--v2-border)' }}>
                            <div style={{ width:30, height:30, borderRadius:6,
                                           background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
                                           display:'flex', alignItems:'center', justifyContent:'center',
                                           flexShrink:0, fontSize:10, fontWeight:700,
                                           color:'var(--v2-text-3)' }}>
                              {cert.domain.replace(/^www\./, '').slice(0,2).toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span className="v2-mono" style={{ fontSize:12, color:'var(--v2-text-2)',
                                                                     fontWeight:500 }}>
                                  {cert.domain}
                                </span>
                                <span style={{ fontSize:9, fontWeight:600, color:'var(--v2-text-3)',
                                                background:'var(--v2-surface)',
                                                border:'0.5px solid var(--v2-border)',
                                                borderRadius:3, padding:'1px 6px',
                                                textTransform:'uppercase', letterSpacing:'0.3px' }}>
                                  Rotated
                                </span>
                              </div>
                              <div style={{ fontSize:11, color:'var(--v2-text-3)', marginTop:2 }}>
                                Rotated {cert.rotated_at
                                  ? formatDistanceToNow(new Date(cert.rotated_at), { addSuffix: true })
                                  : 'recently'} · Expires {fmtDate(cert.expires_at)}
                                {' · '}Archived for 30 days then permanently deleted
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              </>
            )}
          </div>

          {/* Detail panel */}
          {selectedCert && (
            <CertDetail cert={selectedCert} onClose={() => { setSelected(null); setJustRotated(null) }}
              onDelete={handleDelete} onKeyDeleted={handleKeyDeleted}
              onInstall={setAgentCert} isPro={isPro} nav={nav}
              justRotated={justRotated?.domain === selectedCert.domain ? justRotated : null} />
          )}
        </div>

        {/* Monitored domains summary */}
        {monitored.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <div className="v2-h1" style={{ fontSize:15 }}>Monitored domains</div>
                <div className="v2-subtitle">{monitored.length} domain{monitored.length !== 1 ? 's' : ''} tracked via SSL Monitor</div>
              </div>
              <button className="v2-btn" onClick={() => nav('/dns-providers')}>
                <Activity size={12} /> DNS Providers <ArrowRight size={11} />
              </button>
            </div>
            <div className="v2-card">
              <div className="v2-list-scroll" style={{ maxHeight:280 }}>
                {monitored.map(m => {
                  const days = m.cert_expiry ? differenceInDays(new Date(m.cert_expiry), new Date()) : null
                  const s = statusOf(days, false, null)
                  return (
                    <div key={m.id} className={`v2-list-row status-${s.dot}`} style={{ cursor:'default' }}>
                      <Globe size={14} color="var(--v2-text-3)" style={{ flexShrink:0 }} />
                      <div className="v2-row-body">
                        <div className="v2-row-title-line">
                          <span className="v2-row-title v2-mono">{m.domain}</span>
                          <StatusPill days={days} revoked={false} />
                        </div>
                        <div className="v2-row-meta">
                          {m.cert_expiry ? `Expires ${fmtDate(m.cert_expiry)}` : 'Not scanned yet'}
                          {m.last_scanned_at && (
                            <><span className="v2-row-meta-sep">·</span>
                            Scanned {formatDistanceToNow(new Date(m.last_scanned_at), { addSuffix: true })}</>
                          )}
                        </div>
                      </div>
                      <button className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => nav('/dns-providers')}>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ marginTop:24 }}>
          <div className="v2-section-label" style={{ marginBottom:12 }}>Quick actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { icon:<Shield size={16} />,   label:'Buy SSL Certificate', desc:'Get a trusted RapidSSL DV cert via TheSSLStore', action:() => nav('/buy') },
              { icon:<Download size={16} />, label:'Install Guide',     desc:'Step-by-step: Nginx, Apache, Caddy, cPanel', action:() => nav('/install') },
              { icon:<Activity size={16} />, label:'DNS & Providers',   desc:'Manage Cloudflare, Vercel and DNS credentials', action:() => nav('/dns-providers') },
              { icon:<Server size={16} />,   label:'DNS & Servers',     desc:'Manage providers and agent-enabled hosts',action:() => nav('/dns-providers') },
            ].map(({ icon, label, desc, action }) => (
              <button key={label} onClick={action}
                style={{ background:'var(--v2-surface)', border:'0.5px solid var(--v2-border)',
                          borderRadius:'var(--v2-r-xl)', padding:16, textAlign:'left',
                          cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', gap:8,
                          transition:'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--v2-surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--v2-surface)'}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'var(--v2-text-2)' }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:'var(--v2-text)' }}>{label}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--v2-text-3)', lineHeight:1.5 }}>{desc}</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--v2-text-2)', marginTop:4 }}>
                  Open <ArrowRight size={10} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {agentCert && <AgentInstall cert={agentCert} userId={user.id} onClose={() => setAgentCert(null)} />}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MARKETING (LOGGED-OUT)
// ══════════════════════════════════════════════════════════════════════
function MarketingDashboard({ nav }) {
  const features = [
    { icon:<Shield size={18} />,   color:'#10b981', title:'Free SSL Certificates', desc:'Issue trusted RapidSSL DV certificates via TheSSLStore. Fast issuance, globally trusted.' },
    { icon:<Activity size={18} />, color:'#2563eb', title:'Expiry Monitoring',     desc:'Track SSL health across all your domains. Get alerted before certificates expire.' },
    { icon:<Server size={18} />,   color:'#7c3aed', title:'Agent Auto-Renewal',   desc:'Install the SSLVault agent on your VPS for fully automated renewal — no manual steps.' },
    { icon:<Globe size={18} />,    color:'#f59e0b', title:'DNS Provider Integration', desc:'Connect Cloudflare, Vercel, GoDaddy or DigitalOcean for seamless DNS validation.' },
    { icon:<Zap size={18} />,      color:'#ec4899', title:'One-click Issuance',   desc:'Issue, download, and install certificates in minutes — even on shared hosting via cPanel.' },
    { icon:<TrendingUp size={18} />,color:'#0ea5e9',title:'Certificate Inventory', desc:'All your certificates in one place — expiry timeline, download links, and renewal history.' },
  ]
  const mockCerts = [
    { domain:'yourbrand.com',     days:72, status:'green' },
    { domain:'api.yourbrand.com', days:18, status:'amber' },
    { domain:'shop.yourbrand.com',days:6,  status:'amber' },
    { domain:'blog.yourbrand.com',days:-3, status:'red'   },
  ]
  const colors = { green:'#10b981', amber:'#f59e0b', red:'#dc2626' }
  const labels = (c) => c.status === 'red' ? 'Expired' : `${c.days}d left`

  return (
    <div className="v2-page">
      <div className="v2-container">

        {/* Hero */}
        <div style={{ textAlign:'center', padding:'56px 0 48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                        background:'var(--v2-green-bg)', border:'0.5px solid var(--v2-green-border)',
                        borderRadius:100, padding:'4px 14px', marginBottom:20 }}>
            <span className="v2-pulse" />
            <span style={{ fontSize:12, fontWeight:500, color:'var(--v2-green-text)' }}>Free · Open · Trusted</span>
          </div>
          <h1 style={{ fontSize:38, fontWeight:700, color:'var(--v2-text)', letterSpacing:'-0.8px',
                        lineHeight:1.15, margin:'0 0 14px', maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            Your SSL certificates,<br />
            <span style={{ color:'var(--v2-green)' }}>always under control</span>
          </h1>
          <p style={{ fontSize:16, color:'var(--v2-text-2)', maxWidth:480, margin:'0 auto 32px', lineHeight:1.65 }}>
            Issue free SSL certificates, monitor expiry, automate renewal — all from one clean dashboard built for developers, sysadmins, and PKI professionals.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="v2-btn v2-btn-primary" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => nav('/auth')}>
              <Shield size={14} /> Get started free
            </button>
            <button className="v2-btn" style={{ padding:'11px 22px', fontSize:14 }} onClick={() => nav('/buy')}>
              <Activity size={14} /> Buy SSL certificate
            </button>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div style={{ marginBottom:56 }}>
          <div className="v2-section-label" style={{ textAlign:'center', marginBottom:16 }}>Dashboard preview</div>
          <div className="v2-card" style={{ overflow:'hidden' }}>
            {/* Mock stats bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'0.5px solid var(--v2-border)' }}>
              {[
                { label:'Total certs',   value:'4', accent:'var(--v2-border-strong)' },
                { label:'Healthy',       value:'1', accent:'var(--v2-green)' },
                { label:'Expiring soon', value:'2', accent:'var(--v2-amber)' },
                { label:'Expired',       value:'1', accent:'var(--v2-red)' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding:'16px 20px', borderRight: i < 3 ? '0.5px solid var(--v2-border)' : 'none', borderTop:`2px solid ${s.accent}` }}>
                  <div className="v2-stat-label">{s.label}</div>
                  <div className="v2-stat-value">{s.value}</div>
                </div>
              ))}
            </div>
            {/* Mock rows */}
            {mockCerts.map((c, i) => (
              <div key={c.domain} style={{ position:'relative', display:'flex', alignItems:'center', gap:12,
                                           padding:'13px 16px 13px 18px',
                                           borderBottom: i < mockCerts.length - 1 ? '0.5px solid var(--v2-border)' : 'none' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:colors[c.status] }} />
                <div style={{ width:30, height:30, borderRadius:6, background:colors[c.status],
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                  {c.domain.replace(/^www\./, '').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, fontFamily:'monospace', marginBottom:2 }}>{c.domain}</div>
                  <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
                    {c.status === 'red' ? 'Expired — renew immediately' : `Expires in ${c.days} days · RapidSSL`}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:500, color: c.status === 'green' ? 'var(--v2-green-text)' : c.status === 'amber' ? 'var(--v2-amber-text)' : 'var(--v2-red-text)',
                                display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:colors[c.status], display:'inline-block' }} />
                  {labels(c)}
                </span>
              </div>
            ))}

          </div>
        </div>

        {/* Feature grid */}
        <div style={{ marginBottom:56 }}>
          <div className="v2-section-label" style={{ textAlign:'center', marginBottom:20 }}>Everything you need</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {features.map(f => (
              <div key={f.title} className="v2-card" style={{ padding:'20px 20px 18px' }}>
                <div style={{ width:36, height:36, borderRadius:'var(--v2-r-md)',
                              background:`${f.color}18`, border:`0.5px solid ${f.color}30`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              color:f.color, marginBottom:12 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{f.title}</div>
                <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* About Mathi */}
        <div style={{ marginBottom:56 }}>
          <div className="v2-callout info" style={{ textAlign:'center', padding:'28px 32px', maxWidth:560, margin:'0 auto' }}>
            <div className="v2-callout-title" style={{ fontSize:14, marginBottom:8 }}>Built by a PKI specialist</div>
            SSLVault is a passion project by Mathi — Certified PKI Specialist &amp; Partner Account Manager at DigiCert, built to give indie developers, sysadmins, and non-profits the same SSL management tools that enterprise teams enjoy.
            <div style={{ marginTop:14 }}>
              <button className="v2-btn" style={{ fontSize:12 }} onClick={() => nav('/developer')}>
                Meet the developer <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>



      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ══════════════════════════════════════════════════════════════════════
export default function Dashboard({ nav }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div style={{ textAlign:'center' }}>
          <div className="v2-empty-icon" style={{ margin:'0 auto 12px' }}><RefreshCw size={20} className="spin" /></div>
          <div style={{ fontSize:13, color:'var(--v2-text-3)' }}>Loading…</div>
        </div>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }
  if (!user) return <MarketingDashboard nav={nav} />
  return <LoggedInDashboard user={user} nav={nav} />
}
